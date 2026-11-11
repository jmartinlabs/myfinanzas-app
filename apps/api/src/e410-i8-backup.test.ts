import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./database";
import { backup, restore } from "./backup";
import { getReaperturaEstado, reabrirCierre } from "./e410";
import { Problem } from "./problem";

/**
 * E4.10 I8 — regresión de backup/restore v28 con una ventana activa.
 *
 * El paquete de copia incluye `reaperturas` y `reapertura_activa`; restaurar
 * no es una ruta de reapertura y no debe duplicar la ventana ni crear una
 * versión/foto nueva. `reapertura_attempts` se revoca en la restauración,
 * como el resto de claves de intento. Fixtures sintéticos; no acredita DT6.
 */

process.env.NODE_ENV = "test";

const now = Date.parse("2026-05-10T12:00:00Z");
const stamp = "2026-01-01T00:00:00.000Z";
const fp = "a".repeat(64);

function seedCycle(db: Database, id: string, inicio: string) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
    id,
    inicio,
    10000,
    stamp,
  ]);
}

function seedClosure(
  db: Database,
  ciclo: string,
  version: number,
  inicio: string,
  fin: string,
) {
  const creado = `2026-0${Math.min(version, 9)}-01T00:00:00.000Z`;
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,NULL,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, fp],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',NULL,?,'0.0.0-fixture',26,?,?,10000,
        'Cerrado','Sin hechos','SinPlan','{}','{}','{}','{}','{}','{}','{}','{}')`,
      [ciclo, version, creado, fp, inicio, fin],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',NULL,?,'usuario-unico')`,
      [ciclo, version, creado],
    );
  })();
}

function problemOf(fn: () => unknown): Problem {
  try {
    fn();
  } catch (error) {
    if (error instanceof Problem) return error;
    throw error;
  }
  throw new Error("Se esperaba un Problem y no se lanzó.");
}

function counts(db: Database) {
  return {
    cierres: db.query("SELECT COUNT(*) n FROM cierres").get(),
    fotos: db.query("SELECT COUNT(*) n FROM fotos_cierre").get(),
    reaperturas: db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    activa: db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    attempts: db.query("SELECT COUNT(*) n FROM reapertura_attempts").get(),
    vinculos: db.query("SELECT COUNT(*) n FROM cierre_vinculos").get(),
  };
}

test.skipIf(process.platform !== "linux")(
  "E4.10 I8: backup/restore v28 (fixture v26) conserva la ventana y no la reabre ni duplica",
  () => {
  // `publishNewDirectory` usa `renameat2` vía `dlopen("libc.so.6")`, exclusivo
  // de Linux; en macOS la publicación falla con `libc.so.6`. La prueba queda
  // para CI Linux. `tmpdir()` respeta TMPDIR (`/tmp/private` en la imagen
  // rootless) y no escribe en el workspace read-only.
  const dir = mkdtempSync(join(tmpdir(), "e410-i8-backup-"));
  try {
    const path = join(dir, "source.sqlite");
    const db = openDatabase(path);
    seedCycle(db, "1", "2026-01-01");
    seedCycle(db, "2", "2026-02-01");
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    const opened = reabrirCierre(
      db,
      "1",
      { versionEsperada: 1, motivo: "Motivo de reapertura I8 backup" },
      "reapertura-" + randomUUID(),
      { actor: "Alex" },
      now,
    );
    expect(opened.estado).toBe("Reabierto");
    const before = counts(db);
    expect(before).toEqual({
      cierres: { n: 1 },
      fotos: { n: 1 },
      reaperturas: { n: 1 },
      activa: { n: 1 },
      attempts: { n: 1 },
      vinculos: { n: 0 },
    });

    const key = randomBytes(32);
    const identity = join(dir, "identity.txt");
    const keygen = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(keygen.exitCode).toBe(0);
    const recipient = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
      { stdout: "pipe", stderr: "pipe" },
    )
      .stdout.toString()
      .trim();
    backup(db, key, join(dir, "cut"), recipient, now);
    db.close();

    const restored = restore(join(dir, "cut"), join(dir, "restored"), identity, {
      now,
    });
    const copy = openDatabase(restored.database);
    try {
      expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
        version: 28,
      });
      expect(counts(copy)).toEqual({
        cierres: { n: 1 },
        fotos: { n: 1 },
        reaperturas: { n: 1 },
        activa: { n: 1 },
        // Restore revokes attempt keys for every schema version.
        attempts: { n: 0 },
        vinculos: { n: 0 },
      });
      expect(
        copy
          .query(
            `SELECT ciclo,version_origen,tipo,actor,motivo,resultado
             FROM reaperturas`,
          )
          .get(),
      ).toEqual({
        ciclo: "1",
        version_origen: 1,
        tipo: "reapertura",
        actor: "Alex",
        motivo: "Motivo de reapertura I8 backup",
        resultado: "Abierta",
      });
      expect(
        copy
          .query(
            `SELECT a.ciclo,a.reapertura_id,r.version_origen
             FROM reapertura_activa a
             JOIN reaperturas r ON r.id=a.reapertura_id`,
          )
          .get(),
      ).toEqual({ ciclo: "1", reapertura_id: 1, version_origen: 1 });
      expect(getReaperturaEstado(copy, "1")).toMatchObject({
        ciclo: "1",
        estado: "Reabierto",
        version: 1,
      });

      // Restore no es una ruta de reapertura: la ventana restaurada no se
      // duplica ni se interpreta como una nueva reapertura.
      const beforeRetry = counts(copy);
      const error = problemOf(() =>
        reabrirCierre(
          copy,
          "1",
          { versionEsperada: 1, motivo: "Restore no reabre" },
          "reapertura-" + randomUUID(),
          {},
          now + 1000,
        ),
      );
      expect(error.status).toBe(409);
      expect(error.code).toBe("YA_REABIERTO");
      expect(counts(copy)).toEqual(beforeRetry);
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
