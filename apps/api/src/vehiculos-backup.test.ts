import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database";
import { createInstrumento } from "./instrumentos";
import { createPurchase } from "./compras";
import { getSaldo, updateSaldo } from "./saldos";
import { createReference } from "./referencias";
import { createClassification } from "./clasificacion";
import { loadKey } from "./auth";
import { backup, restore } from "./backup";

const now = Date.parse("2026-10-26T12:00:00Z");

test("E3.3/E3.2/E3.4 v18 backup manifest and restore preserve vehicle fichas and revoke sessions", () => {
  const dir = mkdtempSync(join(tmpdir(), "e33-backup-"));
  try {
    const sourcePath = join(dir, "source.sqlite"),
      db = openDatabase(sourcePath),
      category = createClassification(
        db,
        "categorias",
        {
          nombre: "Vehículo backup",
          anual: "Gasto",
          mensual: "Gasto",
          referencia: false,
        },
        randomUUID(),
        now,
      ),
      sub = createClassification(
        db,
        "subcategorias",
        { nombre: "Sub backup", padre: category.id },
        randomUUID(),
        now,
      ),
      partida = createClassification(
        db,
        "partidas",
        { nombre: "Partida backup", padre: sub.id },
        randomUUID(),
        now,
      ),
      vehicle = createReference(
        db,
        {
          nombre: "Vehículo backup",
          tipo: "Vehículo",
          vehiculo: { matricula: "BK 001", proximaITV: "2026-01-10" },
        },
        randomUUID(),
        now,
      );
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES('900','2026-02-01','Gasto',1200,'S001','S000',?,?,'backup','',0,1,'x','x')",
      [partida.id, vehicle.id],
    );
    db.run(
      "INSERT INTO sessions VALUES('old-session','csrf',1,1)",
    );
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      saldoApertura: "100.00",
      fechaApertura: "2026-01-01",
    });
    const instrumento = createInstrumento(
      db,
      { nombre: "Fondo backup v16", isin: "ES0000000077", isinEvidencia: "Evidencia ficticia v16" },
      randomUUID(),
      now,
    ).instrumento;
    const compra = createPurchase(
      db,
      {
        fecha: "2026-02-02",
        instrumento: instrumento.id,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "1",
        precio: "10.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "10.00",
        comisionEur: null,
        concepto: "Compra backup v16",
        nota: null,
      },
      randomUUID(),
      now,
    );
    const key = loadKey(db, join(dir, "auth.key")),
      identity = join(dir, "identity.txt");
    expect(
      Bun.spawnSync(["age-keygen", "-o", identity], { stderr: "pipe" })
        .exitCode,
    ).toBe(0);
    const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
        stderr: "pipe",
      })
        .stdout.toString()
        .trim(),
      backupDir = join(dir, "backup"),
      restoredDir = join(dir, "restored");
    backup(db, key, backupDir, recipient);
    const decrypted = Bun.spawnSync(
      [
        process.env.AGE_BIN ?? "age",
        "--decrypt",
        "--identity",
        identity,
        join(backupDir, "database.age"),
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(decrypted.exitCode).toBe(0);
    const bundle = JSON.parse(decrypted.stdout.toString());
    expect(bundle.manifest).toMatchObject({
      app: "e4.2-v21",
      schema: 21,
      origin: "demo",
    });
    const snapshotPath = join(dir, "snapshot.sqlite");
    writeFileSync(snapshotPath, Buffer.from(bundle.database, "base64"));
    const snapshot = new Database(snapshotPath, { readonly: true, strict: true });
    try {
      expect(snapshot.query("SELECT version FROM schema_version").get()).toEqual({
        version: 21,
      });
      expect(
        snapshot
          .query("SELECT matricula FROM fichas_vehiculo WHERE referencia=?")
          .get(vehicle.id),
      ).toEqual({ matricula: "BK 001" });
      expect(
        snapshot.query("SELECT COUNT(*) n FROM movimientos WHERE referencia=?").get(vehicle.id),
      ).toEqual({ n: 1 });
      expect(
        snapshot.query("SELECT nombre FROM instrumentos WHERE id=?").get(instrumento.id),
      ).toEqual({ nombre: "Fondo backup v16" });
      expect(
        snapshot.query("SELECT COUNT(*) n FROM operaciones_inversion WHERE id=?").get(compra.compra.id),
      ).toEqual({ n: 1 });
      expect(
        snapshot.query("SELECT COUNT(*) n FROM operacion_inversion_audit").get(),
      ).toEqual({ n: 1 });
      expect(
        snapshot.query("SELECT COUNT(*) n FROM instrumento_attempts").get(),
      ).toEqual({ n: 1 });
      expect(
        snapshot.query("SELECT COUNT(*) n FROM operacion_attempts").get(),
      ).toEqual({ n: 1 });
    } finally {
      snapshot.close();
    }
    db.close();
    const restored = restore(backupDir, restoredDir, identity);
    const copy = new Database(restored.database, { readonly: true, strict: true });
    try {
      expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
        version: 21,
      });
      expect(
        copy.query("SELECT matricula FROM fichas_vehiculo WHERE referencia=?").get(vehicle.id),
      ).toEqual({ matricula: "BK 001" });
      expect(
        copy.query("SELECT nombre FROM instrumentos WHERE id=?").get(instrumento.id),
      ).toEqual({ nombre: "Fondo backup v16" });
      expect(
        copy.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
      ).toEqual({ n: 1 });
      expect(copy.query("SELECT COUNT(*) n FROM sessions").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM instrumento_attempts").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM operacion_attempts").get()).toEqual({ n: 0 });
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
