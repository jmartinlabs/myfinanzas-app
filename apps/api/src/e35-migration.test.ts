import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database";
import { materializeContract } from "../test-support/inversiones-schema";

const t = "2026-01-01T00:00:00.000Z";

function v21(path: string) {
  materializeContract(path, "C21-VENTAS-E42");
  const db = new Database(path);
  db.run(
    `INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado)
     VALUES('S001','ING ficticia','Efectivo','Movimientos','Activa',1,?,?),
           ('S002','Origen ficticio','Efectivo','Movimientos','Activa',1,?,?),
           ('S003','Sin régimen','Efectivo','Movimientos','Activa',1,?,?)`,
    [t, t, t, t, t, t],
  );
  db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado) VALUES('1','2026-06-20',100,?,1,?)",
    [t, t],
  );
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,anulado,revision,creado,actualizado)
     VALUES('1','2026-06-25','Transferencia',500,'S002','S001','Reposición ficticia','',0,1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO regimen_comida(saldo,ciclo_corte,apertura,evidencia,cobertura,estado,revision,creado,actualizado)
     VALUES('S001','1',100,'Extracto ficticio','Verificable','Activo',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO movimiento_rol_financiacion(movimiento,rol,obligacion_ciclo,evidencia,revision_movimiento,revision,creado,actualizado)
     VALUES('1','Reposición','1','Evidencia ficticia',1,1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO movimiento_rol_financiacion_audit(movimiento,accion,revision,anterior,posterior,instante,actor)
     VALUES('1','alta',1,NULL,'{}',?,'usuario-unico')`,
    [t],
  );
  db.close();
}

test("I3/migración v21→v22: preserva roles y auditoría, FK íntegras y admite cobro acreditado", () => {
  const dir = mkdtempSync(join(tmpdir(), "e35-v22-"));
  try {
    const path = join(dir, "v21.sqlite");
    v21(path);
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 22 });
      expect(db.query("SELECT COUNT(*) n FROM movimiento_rol_financiacion").get()).toEqual({ n: 1 });
      expect(
        db.query("SELECT COUNT(*) n FROM movimiento_rol_financiacion_audit").get(),
      ).toEqual({ n: 1 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='movimiento_rol_financiacion_reposicion_insert'").get(),
      ).toEqual({ n: 1 });

      db.run(
        `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,anulado,revision,creado,actualizado)
         VALUES('2','2026-06-26','Transferencia',50,'S002','S001','Reposición sin obligación','',0,1,?,?)`,
        [t, t],
      );
      db.run(
        `INSERT INTO movimiento_rol_financiacion(movimiento,rol,obligacion_ciclo,evidencia,revision_movimiento,revision,creado,actualizado)
         VALUES('2','Reposición',NULL,'Cobro ficticio acreditado',1,1,?,?)`,
        [t, t],
      );
      expect(
        db.query("SELECT rol,obligacion_ciclo FROM movimiento_rol_financiacion WHERE movimiento='2'").get(),
      ).toEqual({ rol: "Reposición", obligacion_ciclo: null });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("I3/migración v21→v22: rechaza reposición sin obligación si el destino no es el régimen", () => {
  const dir = mkdtempSync(join(tmpdir(), "e35-v22-reject-"));
  try {
    const path = join(dir, "v21.sqlite");
    v21(path);
    const db = openDatabase(path);
    try {
      db.run(
        `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,anulado,revision,creado,actualizado)
         VALUES('3','2026-06-26','Transferencia',50,'S002','S003','Destino sin régimen','',0,1,?,?)`,
        [t, t],
      );
      expect(() =>
        db.run(
          `INSERT INTO movimiento_rol_financiacion(movimiento,rol,obligacion_ciclo,evidencia,revision_movimiento,revision,creado,actualizado)
           VALUES('3','Reposición',NULL,'Texto sin cobro verificable',1,1,?,?)`,
          [t, t],
        ),
      ).toThrow();
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
