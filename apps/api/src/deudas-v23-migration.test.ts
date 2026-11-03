import { expect, test } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { openDatabase } from "./database";
import { contract, manifest, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";

const t = "2026-01-01T00:00:00.000Z";
const root = () => mkdtempSync(join(process.cwd(), ".tmp-e44-"));

/** Genuine v22 contract plus fictional rows covering every preserved area. */
function v22(path: string, rows = true) {
  materializeContract(path, "C22-E35-FIN-NETA", (db) => {
    if (!rows) return;
    db.run(
      `INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado)
       VALUES('S000','Exterior técnico','Exterior','Exterior','Activa',1,?,?),
             ('S001','Banco ficticio','Efectivo','Movimientos','Activa',1,?,?)`,
      [t, t, t, t],
    );
    db.run(
      `INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado)
       VALUES('D001','Deuda v22 ficticia','2026-10-01',100000,'Activa',1,?,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO categorias(id,nombre,anual,mensual,referencia,estado,revision,creado,actualizado)
       VALUES('CAT001','Gasto ficticio','Gasto','Gasto',0,'Activa',1,?,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
       VALUES('SUB001','Sub ficticia','CAT001','Activa',1,?,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda)
       VALUES('PAR001','Cuota ficticia','SUB001','Activa',1,?,?,'D001')`,
      [t, t],
    );
    db.run(
      `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado,capital,intereses)
       VALUES('1','2026-10-01','Gasto',10000,'S001','S000','PAR001','Cuota ficticia','',0,1,?,?,8000,2000)`,
      [t, t],
    );
    db.run(
      `INSERT INTO movement_audit(id,revision,accion,motivo,instante,actor,anterior,posterior)
       VALUES('1',1,'alta',NULL,?,'usuario-unico',NULL,'{}')`,
      [t],
    );
    db.run(
      `INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado)
       VALUES('1','2026-06-20',0,?,1,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo)
       VALUES('D001','alta',1,'{}',?,0,'usuario-unico',NULL)`,
      [t],
    );
    db.run(
      "INSERT INTO owner(id,password,secret,enabled,last_step) VALUES(1,'hash','sealed',1,0)",
    );
    db.run("INSERT INTO sessions(hash,csrf,created,seen) VALUES('sesion','csrf',1,1)");
    db.run("INSERT INTO auth_limits(id,failures,window,blocked) VALUES(1,0,0,0)");
    db.run("INSERT INTO debt_attempts VALUES('intento','hash','{}',1)");
    db.run("INSERT INTO counters(name,next) VALUES('deudas',2)");
  });
}

function snapshot(db: Database) {
  const table = (name: string, order = "rowid") =>
    db.query(`SELECT * FROM ${name} ORDER BY ${order}`).all();
  return {
    deudas: db
      .query(
        "SELECT id,nombre,inicio,apertura,estado,revision,creado,actualizado FROM deudas ORDER BY id",
      )
      .all(),
    partidas: table("partidas", "id"),
    movimientos: table("movimientos", "id"),
    movement_audit: table("movement_audit", "id,revision"),
    ciclos: table("ciclos", "id"),
    audit: table("audit", "id"),
    owner: table("owner", "id"),
    sessions: table("sessions", "hash"),
    auth_limits: table("auth_limits", "id"),
    debt_attempts: table("debt_attempts", "key"),
    origen: table("database_origin", "id"),
  };
}

function deudaColumns(db: Database) {
  return (db.query("PRAGMA table_info(deudas)").all() as { name: string }[]).map(
    (column) => column.name,
  );
}

test("E4.4 AC-23: v22→v23 is additive, preserves IDs/audit/MFA and exposes the exact C23 contract", () => {
  const dir = root();
  try {
    const path = join(dir, "v22.sqlite");
    v22(path);
    const source = new Database(path);
    const before = snapshot(source);
    source.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 23,
      });
      expect(snapshot(db)).toEqual(before);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(verifyContract(db, 23)).toBe("C23-E44-DEUDA-COMPLETA");
      expect(manifest(db)).toEqual(contract("C23-E44-DEUDA-COMPLETA").objects);
      expect(
        db
          .query(
            `SELECT tipo_deuda,tin,tae,cuota_contractual,condiciones,capital_inicial,
                    capital_amortizado_historico,amortizacion_extra_historica,
                    capital_historico_cuotas,intereses_historicos,total_pagado_historico,
                    precontrol_cuotas,precontrol_capital,precontrol_amortizacion_extra,
                    precontrol_ejercicio
             FROM deudas WHERE id='D001'`,
          )
          .get(),
      ).toEqual({
        tipo_deuda: null,
        tin: null,
        tae: null,
        cuota_contractual: null,
        condiciones: null,
        capital_inicial: null,
        capital_amortizado_historico: null,
        amortizacion_extra_historica: null,
        capital_historico_cuotas: null,
        intereses_historicos: null,
        total_pagado_historico: null,
        precontrol_cuotas: null,
        precontrol_capital: null,
        precontrol_amortizacion_extra: null,
        precontrol_ejercicio: null,
      });
      expect(deudaColumns(db)).toHaveLength(23);
      for (const [type, name] of [
        ["table", "conciliaciones_deuda"],
        ["table", "conciliaciones_deuda_audit"],
        ["table", "conciliacion_attempts"],
        ["index", "conciliacion_vigente_unica"],
        ["index", "conciliacion_historial"],
        ["trigger", "conciliacion_id_immutable"],
        ["trigger", "conciliacion_deuda_immutable"],
        ["trigger", "conciliacion_no_delete"],
        ["trigger", "conciliacion_audit_no_update"],
        ["trigger", "conciliacion_audit_no_delete"],
      ] as const)
        expect(
          db
            .query(
              "SELECT COUNT(*) n FROM sqlite_master WHERE type=? AND name=?",
            )
            .get(type, name),
        ).toEqual({ n: 1 });
      expect(
        db
          .query("SELECT next FROM counters WHERE name='conciliaciones_deuda'")
          .get(),
      ).toEqual({ next: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.4 AC-23: inconsistent foreign keys reject without a partial v23 base and reopen with FK active", () => {
  const dir = root();
  try {
    const path = join(dir, "v22-fk.sqlite");
    v22(path);
    const broken = new Database(path);
    try {
      broken.exec("PRAGMA foreign_keys=OFF");
      broken.run(
        `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda)
         VALUES('PAR999','Partida inconsistente','SUB001','Activa',1,?,?,'D999')`,
        [t, t],
      );
      expect(broken.query("PRAGMA foreign_key_check").all()).toHaveLength(1);
    } finally {
      broken.close();
    }

    expect(() => openDatabase(path)).toThrow(
      "Contrato de esquema v22 desconocido o incompleto; no se modificará esta base.",
    );

    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 22,
      });
      expect(deudaColumns(check)).toHaveLength(8);
      expect(
        check
          .query(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('conciliaciones_deuda','conciliacion_attempts')",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(check.query("PRAGMA foreign_key_check").all()).toHaveLength(1);
      check.run("UPDATE partidas SET deuda=NULL WHERE id='PAR999'");
    } finally {
      check.close();
    }

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 23,
      });
      expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(deudaColumns(db)).toHaveLength(23);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.4 AC-23: a failed v23 DDL rolls back to an intact v22 base", () => {
  const dir = root();
  try {
    const path = join(dir, "v22-rollback.sqlite");
    v22(path);
    const raw = new Database(path);
    const before = snapshot(raw);
    // The counter row is valid v22 data but collides with the v23 seed; the
    // migration must roll back every ALTER/table instead of leaving a partial base.
    raw.run(
      "INSERT INTO counters(name,next) VALUES('conciliaciones_deuda',1)",
    );
    raw.close();

    expect(() => openDatabase(path)).toThrow();

    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 22,
      });
      expect(deudaColumns(check)).toHaveLength(8);
      expect(
        check
          .query(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('conciliaciones_deuda','conciliaciones_deuda_audit','conciliacion_attempts')",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(snapshot(check)).toEqual(before);
      expect(
        check
          .query("SELECT next FROM counters WHERE name='conciliaciones_deuda'")
          .get(),
      ).toEqual({ next: 1 });
    } finally {
      check.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.4 AC-23: unknown versions stay intact and two starts are idempotent", () => {
  const dir = root();
  try {
    const unknownPath = join(dir, "unknown.sqlite");
    v22(unknownPath);
    const unknown = new Database(unknownPath);
    const unknownBefore = snapshot(unknown);
    unknown.exec("UPDATE schema_version SET version=999");
    const unknownSchema = unknown
      .query("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name")
      .all();
    unknown.close();

    expect(() => openDatabase(unknownPath)).toThrow(
      "Esquema no compatible; no se modificará esta base.",
    );
    const intact = new Database(unknownPath);
    try {
      expect(intact.query("SELECT version FROM schema_version").get()).toEqual({
        version: 999,
      });
      expect(snapshot(intact)).toEqual(unknownBefore);
      expect(
        intact
          .query("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name")
          .all(),
      ).toEqual(unknownSchema);
      expect(deudaColumns(intact)).toHaveLength(8);
    } finally {
      intact.close();
    }

    const path = join(dir, "twice.sqlite");
    v22(path);
    const first = openDatabase(path);
    const firstManifest = manifest(first);
    const firstData = snapshot(first);
    first.close();

    const second = openDatabase(path);
    try {
      expect(second.query("SELECT version FROM schema_version").get()).toEqual({
        version: 23,
      });
      expect(manifest(second)).toEqual(firstManifest);
      expect(snapshot(second)).toEqual(firstData);
      expect(second.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      second.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.4 AC-32/AC-18: approved limits, null≠zero and one current reconciliation per Deuda/date", () => {
  const db = openDatabase(":memory:");
  try {
    type Extra = {
      tin?: number | null;
      tae?: number | null;
      cuota?: number | null;
      condiciones?: string | null;
      capitalInicial?: number | null;
      capitalAmortizado?: number | null;
      amortizacionExtra?: number | null;
      capitalCuotas?: number | null;
      intereses?: number | null;
      totalPagado?: number | null;
      precontrolCuotas?: number | null;
      precontrolCapital?: number | null;
      precontrolExtra?: number | null;
      precontrolEjercicio?: number | null;
    };
    const insert = (
      id: string,
      tipo: string | null = null,
      extra: Extra = {},
    ) =>
      db.run(
        `INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado,
          tipo_deuda,tin,tae,cuota_contractual,condiciones,capital_inicial,
          capital_amortizado_historico,amortizacion_extra_historica,capital_historico_cuotas,
          intereses_historicos,total_pagado_historico,precontrol_cuotas,precontrol_capital,
          precontrol_amortizacion_extra,precontrol_ejercicio)
         VALUES(?,?,'2026-10-01',100000,'Activa',1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          "Deuda ficticia " + id,
          t,
          t,
          tipo,
          extra.tin ?? null,
          extra.tae ?? null,
          extra.cuota ?? null,
          extra.condiciones ?? null,
          extra.capitalInicial ?? null,
          extra.capitalAmortizado ?? null,
          extra.amortizacionExtra ?? null,
          extra.capitalCuotas ?? null,
          extra.intereses ?? null,
          extra.totalPagado ?? null,
          extra.precontrolCuotas ?? null,
          extra.precontrolCapital ?? null,
          extra.precontrolExtra ?? null,
          extra.precontrolEjercicio ?? null,
        ],
      );

    insert("D001", "No hipotecaria", {
      tin: 2500000,
      tae: 2800000,
      cuota: 10000,
      condiciones: "Condiciones ficticias informativas",
      capitalInicial: 120000,
      capitalAmortizado: 20000,
      amortizacionExtra: 0,
      capitalCuotas: 120000,
      intereses: 30000,
      totalPagado: 150000,
      precontrolCuotas: 3,
      precontrolCapital: 5000,
      precontrolExtra: 0,
      precontrolEjercicio: 2026,
    });
    expect(
      db
        .query(
          "SELECT tipo_deuda,tin,tae,cuota_contractual,precontrol_cuotas,precontrol_ejercicio FROM deudas WHERE id='D001'",
        )
        .get(),
    ).toEqual({
      tipo_deuda: "No hipotecaria",
      tin: 2500000,
      tae: 2800000,
      cuota_contractual: 10000,
      precontrol_cuotas: 3,
      precontrol_ejercicio: 2026,
    });

    // Sign is preserved and the technical bound is not a business maximum.
    insert("D002", "Hipotecaria", { tin: -9007199254740991, tae: 9007199254740991 });
    insert("D003");
    expect(
      db.query("SELECT COUNT(*) n FROM deudas WHERE tipo_deuda IS NULL").get(),
    ).toEqual({ n: 1 });
    expect(
      db
        .query(
          "SELECT tin,tae,cuota_contractual,capital_inicial,precontrol_cuotas FROM deudas WHERE id='D003'",
        )
        .get(),
    ).toEqual({
      tin: null,
      tae: null,
      cuota_contractual: null,
      capital_inicial: null,
      precontrol_cuotas: null,
    });

    const reject = (sql: string, values: SQLQueryBindings[] = []) =>
      expect(() => db.run(sql, values)).toThrow();
    reject("UPDATE deudas SET tipo_deuda='Sin informar' WHERE id='D003'");
    reject("UPDATE deudas SET tin=9007199254740992 WHERE id='D003'");
    reject("UPDATE deudas SET tae=-9007199254740992 WHERE id='D003'");
    reject("UPDATE deudas SET cuota_contractual=-1 WHERE id='D003'");
    reject("UPDATE deudas SET condiciones=? WHERE id='D003'", ["x".repeat(1001)]);
    db.run("UPDATE deudas SET precontrol_cuotas=0 WHERE id='D003'");
    expect(
      db.query("SELECT precontrol_cuotas FROM deudas WHERE id='D003'").get(),
    ).toEqual({ precontrol_cuotas: 0 });
    db.run("UPDATE deudas SET precontrol_cuotas=NULL WHERE id='D003'");
    reject("UPDATE deudas SET precontrol_cuotas=-1 WHERE id='D003'");
    reject("UPDATE deudas SET precontrol_ejercicio=0 WHERE id='D003'");
    reject("UPDATE deudas SET precontrol_ejercicio=10000 WHERE id='D003'");
    expect(
      db.query("SELECT tin,cuota_contractual,precontrol_cuotas FROM deudas WHERE id='D003'").get(),
    ).toEqual({ tin: null, cuota_contractual: null, precontrol_cuotas: null });

    const reconciliation =
      `INSERT INTO conciliaciones_deuda(id,deuda,fecha_corte,capital_declarado,fuente,nota,estado,revision,actor,creado,actualizado)
       VALUES(?,?,'2026-10-20',?,?,?,'Vigente',1,'usuario-unico',?,?)`;
    db.run(reconciliation, [
      "C001",
      "D001",
      75000,
      "Banco ficticio",
      "Extracto ficticio",
      t,
      t,
    ]);
    expect(() =>
      db.run(reconciliation, [
        "C002",
        "D001",
        72000,
        null,
        null,
        t,
        t,
      ]),
    ).toThrow();
    reject(
      "UPDATE conciliaciones_deuda SET fuente=? WHERE id='C001'",
      ["x".repeat(201)],
    );
    reject(
      "UPDATE conciliaciones_deuda SET nota=? WHERE id='C001'",
      ["x".repeat(1001)],
    );
    reject(
      "UPDATE conciliaciones_deuda SET capital_declarado=NULL WHERE id='C001'",
    );
    reject(
      "INSERT INTO conciliaciones_deuda(id,deuda,fecha_corte,capital_declarado,estado,revision,actor,creado,actualizado) VALUES('C009','D999','2026-10-20',1,'Vigente',1,'usuario-unico',?,?)",
      [t, t],
    );

    db.run(
      "UPDATE conciliaciones_deuda SET estado='Anulada',revision=2,actualizado=? WHERE id='C001'",
      [t],
    );
    db.run(reconciliation, [
      "C002",
      "D001",
      72000,
      null,
      null,
      t,
      t,
    ]);
    expect(
      db
        .query(
          "SELECT id,estado FROM conciliaciones_deuda ORDER BY id",
        )
        .all(),
    ).toEqual([
      { id: "C001", estado: "Anulada" },
      { id: "C002", estado: "Vigente" },
    ]);
    reject("DELETE FROM conciliaciones_deuda WHERE id='C002'");
    reject("UPDATE conciliaciones_deuda SET id='C003' WHERE id='C002'");
    reject("UPDATE conciliaciones_deuda SET deuda='D002' WHERE id='C002'");

    db.run(
      `INSERT INTO conciliaciones_deuda_audit(conciliacion,accion,revision,anterior,posterior,motivo,instante,actor)
       VALUES('C002','alta',1,NULL,'{}',NULL,?,'usuario-unico')`,
      [t],
    );
    reject("UPDATE conciliaciones_deuda_audit SET actor='otro' WHERE conciliacion='C002'");
    reject("DELETE FROM conciliaciones_deuda_audit WHERE conciliacion='C002'");
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
  }
});
