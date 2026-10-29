import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { prepareSchema } from "../../apps/api/src/database-schema";
import { installFixture } from "./release-fixture.mjs";

test("release fixture covers v17 and v18 without changing earlier modules", () => {
  const db = new Database(":memory:");
  try {
    prepareSchema(db, { origin: "production", key_hash: null });
    db.run(`INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado)
      VALUES('S001','Cuenta fixture','Efectivo','Movimientos','Activa',1,'fixture','fixture')`);

    installFixture(db, "seed");
    installFixture(db, "update");

    for (const table of [
      "movimiento_compartido",
      "instrumentos",
      "operaciones_inversion",
      "instrumento_audit",
      "operacion_inversion_audit",
    ]) {
      expect(db.query(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 2 });
    }
    expect(db.query("PRAGMA integrity_check").get()).toEqual({
      integrity_check: "ok",
    });
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(() =>
      db.run(`INSERT INTO instrumentos(id,nombre,isin,isin_evidencia,divisa_referencia,estado,revision,creado_en,actualizado_en)
        VALUES('BAD','Instrumento inválido',NULL,NULL,'EUR','Activa',1,'fixture','fixture')`),
    ).toThrow();
  } finally {
    db.close();
  }
});
