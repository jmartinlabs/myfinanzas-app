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

function v21ConFkInconsistente(path: string) {
  v21(path);
  const db = new Database(path);
  try {
    db.exec("PRAGMA foreign_keys=OFF");
    db.run(
      `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,anulado,revision,creado,actualizado)
       VALUES('9','2026-06-26','Transferencia',5,'S002','S001','Rol con obligación inexistente','',0,1,?,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO movimiento_rol_financiacion(movimiento,rol,obligacion_ciclo,evidencia,revision_movimiento,revision,creado,actualizado)
       VALUES('9','Financiación','999','Evidencia ficticia',1,1,?,?)`,
      [t, t],
    );
    expect(db.query("PRAGMA foreign_key_check").all()).toHaveLength(1);
  } finally {
    db.close();
  }
}

test("I3/migración v21→v22: preserva roles y auditoría, FK íntegras y admite cobro acreditado", () => {
  const dir = mkdtempSync(join(tmpdir(), "e35-v22-"));
  try {
    const path = join(dir, "v21.sqlite");
    v21(path);
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 29 });
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

test("R2/I3/migración v21→v22: FK inconsistente no deja base parcial y mantiene foreign_keys activas", () => {
  const dir = mkdtempSync(join(tmpdir(), "e35-v22-fk-"));
  try {
    const path = join(dir, "v21-fk.sqlite");
    v21ConFkInconsistente(path);

    // La verificación del contrato v21 comprueba foreign_key_check antes de mutar.
    // Una FK inconsistente se rechaza aquí, sin rebuild v22 ni base parcial.
    expect(() => openDatabase(path)).toThrow(
      "Contrato de esquema v21 desconocido o incompleto; no se modificará esta base.",
    );

    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({ version: 21 });
      expect(check.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({ n: 2 });
      expect(check.query("SELECT COUNT(*) n FROM movimiento_rol_financiacion").get()).toEqual({ n: 2 });
      expect(
        check.query("SELECT COUNT(*) n FROM movimiento_rol_financiacion_audit").get(),
      ).toEqual({ n: 1 });
      expect(
        check.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='movimiento_rol_financiacion_v22'").get(),
      ).toEqual({ n: 0 });
      expect(
        check.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='movimiento_rol_financiacion_reposicion_insert'").get(),
      ).toEqual({ n: 0 });
      expect(check.query("PRAGMA foreign_key_check").all()).toHaveLength(1);
      // Repara solo el dato inconsistente: la obligación existe en el estado v21.
      check.run(
        "UPDATE movimiento_rol_financiacion SET obligacion_ciclo='1' WHERE movimiento='9'",
      );
    } finally {
      check.close();
    }

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 29 });
      expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(db.query("SELECT COUNT(*) n FROM movimiento_rol_financiacion").get()).toEqual({ n: 2 });
      expect(
        db.query("SELECT COUNT(*) n FROM movimiento_rol_financiacion_audit").get(),
      ).toEqual({ n: 1 });
      expect(
        db.query("SELECT obligacion_ciclo FROM movimiento_rol_financiacion WHERE movimiento='1'").get(),
      ).toEqual({ obligacion_ciclo: "1" });
      expect(
        db.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='movimiento_rol_financiacion_reposicion_insert'").get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
