import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { backup, restore } from "./backup";
import { createCompartido, createParticipante, getCompartido } from "./compartidos";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { previewMovement, writeMovement } from "./movimientos";

const now = Date.parse("2026-10-27T12:00:00Z");
test("D5 AC-01: encrypted v18 restore preserves accreditation, evidence and revokes attempts", () => {
  process.env.NODE_ENV = "test";
  const dir = mkdtempSync(join(tmpdir(), "dev14-d5-backup-"));
  try {
    const path = join(dir, "demo.sqlite"),
      key = randomBytes(32),
      db = new Database(path);
    prepareSchema(db, { origin: "demo", key_hash: null });
    for (let i = 1; i <= 14; i++)
      createClassification(
        db,
        "categorias",
        {
          nombre: "Categoría ficticia " + i,
          anual: "Gasto",
          mensual: "Gasto",
          referencia: [11, 12, 13].includes(i),
        },
        randomUUID(),
        now,
      );
    const sub = createClassification(
        db,
        "subcategorias",
        { nombre: "Sub D5 backup", padre: "CAT013" },
        randomUUID(),
        now,
      ),
      partida = createClassification(
        db,
        "partidas",
        { nombre: "Partida D5 backup", padre: sub.id },
        randomUUID(),
        now,
      ).id,
      payer = createSaldo(
        db,
        {
          nombre: "Banco D5 backup",
          tipo: "Efectivo",
          control: "Movimientos",
          saldoApertura: "1000",
          fechaApertura: "2026-01-01",
          permiteSalidaExterior: true,
        },
        randomUUID(),
        now,
      ).id,
      destination = createSaldo(
        db,
        {
          nombre: "Destino D5 backup",
          tipo: "Efectivo",
          control: "Movimientos",
          saldoApertura: "0",
          fechaApertura: "2026-01-01",
        },
        randomUUID(),
        now,
      ).id,
      ref = createCompartido(db, { nombre: "Caso D5 backup" }, randomUUID(), now)
        .referencia.id;
    for (const [nombre, rol, partes] of [
      ["Yo", "Titular", 1],
      ["Bea", "Tercero", 1],
      ["Álex", "Tercero", 1],
    ] as const)
      createParticipante(db, ref, { nombre, rol, partes }, randomUUID(), now);
    const gastoBody = {
      tipo: "Gasto",
      fecha: "2026-10-05",
      importe: "450.00",
      saldo: payer,
      partida,
      referencia: ref,
      concepto: "Gasto D5 backup",
    };
    const gp = previewMovement(db, gastoBody, null, false, now);
    writeMovement(
      db,
      { ...gastoBody, fingerprint: gp.fingerprint, aceptarCoincidencia: true },
      randomUUID(),
      null,
      false,
      now,
    );
    const alex = getCompartido(db, ref).participantes.find(
      (p) => p.nombre === "Álex",
    )!;
    const body = {
      tipo: "Transferencia",
      fecha: "2026-10-10",
      importe: "300.00",
      origen: "S000",
      destino: destination,
      referencia: ref,
      concepto: "Aportación D5 backup",
      compartido: {
        participante: alex.id,
        evidencia: "Extracto D5 backup ficticio",
        procedencia: "Documento bancario",
      },
    };
    const p = previewMovement(db, body, null, false, now);
    const movement = writeMovement(
      db,
      { ...body, fingerprint: p.fingerprint, aceptarCoincidencia: true },
      randomUUID(),
      null,
      false,
      now,
    ).movimiento;
    const before = getCompartido(db, ref);
    const identity = join(dir, "identity.txt"),
      keygen = Bun.spawnSync(
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
    const copy = new Database(restored.database);
    try {
      expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
        version: 20,
      });
      const after = getCompartido(copy, ref);
      expect(after.aportaciones).toHaveLength(1);
      expect(after.aportaciones[0]).toMatchObject({
        movimiento: movement.id,
        importe: "300.00",
        evidencia: "Extracto D5 backup ficticio",
        procedencia: "Documento bancario",
        computa: true,
      });
      expect(after.resumen.recuperado.valor).toBe(before.resumen.recuperado.valor);
      expect(
        copy.query("SELECT COUNT(*) n FROM compartido_attempts").get(),
      ).toEqual({ n: 0 });
      expect(
        copy
          .query("SELECT COUNT(*) n FROM movimiento_compartido")
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
