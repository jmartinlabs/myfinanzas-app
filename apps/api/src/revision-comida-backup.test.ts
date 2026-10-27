import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { backup, restore } from "./backup";
import { revisionComidaFixture } from "../test-support/revision-comida-fixture";
import {
  createRevisionComida,
  getRevisionComida,
  vincularRevisionComida,
} from "./revision-comida";

const now = Date.parse("2026-10-26T12:00:00Z");
test("AC21: restore cifrado v16 conserva operaciones, devoluciones, reposiciones, vínculos, evidencias y auditoría", () => {
  process.env.NODE_ENV = "test";
  const dir = mkdtempSync(join(tmpdir(), "dev16-ac21-"));
  try {
    const path = join(dir, "demo.sqlite"),
      key = randomBytes(32),
      db = new Database(path);
    prepareSchema(db, { origin: "demo", key_hash: null });
    revisionComidaFixture(db);
    const detail = createRevisionComida(
        db,
        {
          fecha: "2026-10-10",
          concepto: "Supermercado restaurable ficticio",
          importe: "42.10",
          direccion: "Salida",
          esDevolucion: false,
          clasificacion: "Comida",
          evidenciaBancaria: "evidencia bancaria ficticia",
        },
        randomUUID(),
        now,
        "Detalle",
      ).operacion,
      devolution = createRevisionComida(
        db,
        {
          fecha: "2026-10-11",
          concepto: "Devolución restaurable ficticia",
          importe: "12.00",
          direccion: "Entrada",
          esDevolucion: true,
          clasificacion: "Comida",
          evidenciaBancaria: "evidencia devolución ficticia",
          evidenciaRelacionCompra: "compra original ficticia",
        },
        randomUUID(),
        now,
        "Detalle",
      ).operacion,
      reposicion = createRevisionComida(
        db,
        {
          fecha: "2026-10-12",
          concepto: "Reposición restaurable ficticia",
          importe: "20.00",
          direccion: "Entrada",
          esDevolucion: false,
          evidenciaBancaria: "evidencia reposición ficticia",
        },
        randomUUID(),
        now,
        "Reposicion",
      ).operacion;
    vincularRevisionComida(
      db,
      detail.id,
      {
        revision: 1,
        motivo: "vínculo agregado restaurable",
        movimiento: "201",
        tipoVinculo: "Agregado terminal",
        evidenciaVinculo: "evidencia del vínculo ficticia",
      },
      randomUUID(),
      now,
      "Detalle",
    );
    vincularRevisionComida(
      db,
      reposicion.id,
      {
        revision: 1,
        motivo: "vínculo de reposición restaurable",
        movimiento: "204",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia transferencia ficticia",
      },
      randomUUID(),
      now,
      "Reposicion",
    );
    const before = getRevisionComida(db, detail.id);
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
    expect(readFileSync(restored.key)).toHaveLength(32);
    const copy = new Database(restored.database);
    try {
      expect(
        copy.query("SELECT version FROM schema_version").get(),
      ).toEqual({ version: 18 });
      const after = getRevisionComida(copy, detail.id);
      expect(after.operacion).toMatchObject({
        id: detail.id,
        fecha: detail.fecha,
        importe: detail.importe,
        esDevolucion: false,
        evidenciaBancaria: detail.evidenciaBancaria,
        evidenciaVinculo: "evidencia del vínculo ficticia",
        tipoVinculo: "Agregado terminal",
        estadoVinculo: "Verificado",
      });
      expect(after.auditoria).toHaveLength(2);
      expect(getRevisionComida(copy, devolution.id).operacion).toMatchObject({
        esDevolucion: true,
        direccion: "Entrada",
        evidenciaRelacionCompra: "compra original ficticia",
      });
      expect(getRevisionComida(copy, reposicion.id, "Reposicion").operacion).toMatchObject({
        tipo: "Reposicion",
        evidenciaBancaria: "evidencia reposición ficticia",
        estadoVinculo: "Verificado",
        estadoTrazabilidad: "Sin asignación",
      });
      expect(
        copy.query("SELECT * FROM revision_comida_attempts").all(),
      ).toHaveLength(0);
      expect(
        copy.query("SELECT COUNT(*) n FROM revision_comida").get(),
      ).toEqual({ n: 3 });
      expect(before.operacion.id).toBe(after.operacion.id);
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
