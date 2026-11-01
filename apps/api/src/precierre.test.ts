import { test, expect } from "bun:test";
import { HttpApp } from "@effect/platform";
import { randomBytes, randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { getPrecierre, getPrecierreEstado } from "./precierre";
import { quantityText } from "./investment-engine";

process.env.NODE_ENV = "test";
const now = Date.parse("2026-01-20T12:00:00Z");
const backup = { verified: true };

function fixture(options: { plan?: boolean; reference?: boolean; investment?: boolean } = {}) {
  const db = openDatabase(":memory:");
  db.exec(`
    INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
    VALUES('CAT001','Comida fixture','Gasto','Gasto','Gasto',0,'Activa',1,'f','f');
    INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
    VALUES('SUB001','Sub fixture','CAT001','Activa',1,'f','f');
    INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto)
    VALUES('PAR001','Partida fixture','SUB001','Activa',1,'f','f',NULL,NULL);
    INSERT INTO ciclos(id,inicio,saldo_comida,creado)
    VALUES('1','2026-01-01',100000,'f'),('2','2026-02-01',200000,'f');
    INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado)
    VALUES('REF0001','Referencia fixture','Viaje','Activa',1,'f','f');
    INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,anulado,revision,creado,actualizado,capital,intereses)
    VALUES('101','2026-01-10','Gasto',1000,'S001','S000',NULL,'PAR001',NULL,'Gasto fixture','',0,1,'f','f',NULL,NULL);
  `);
  if (options.reference) {
    db.run("UPDATE referencias SET estado='Inactiva' WHERE id='REF0001'");
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,anulado,revision,creado,actualizado,capital,intereses) VALUES('102','2026-01-11','Transferencia',100,'S001','S002',NULL,NULL,'REF0001','Transferencia fixture','',0,1,'f','f',NULL,NULL)",
    );
  }
  if (options.plan) {
    db.run(
      "INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado) VALUES('PRE0001','Presupuesto fixture','No aplica',NULL,'Activo',1,'f','f')",
    );
    db.run("INSERT INTO cycle_plans(ciclo,revision) VALUES('1',1)");
    db.run(
      "INSERT INTO cycle_plan_lines(ciclo,presupuesto,base,esencial,del_mes) VALUES('1','PRE0001',1000,0,1000)",
    );
  }
  if (options.investment) {
    db.run(
      "INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en) VALUES('I0001','Instrumento fixture','Activa',1,'f','f')",
    );
    db.run(
      "INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado) VALUES('1','Compra','2025-12-15','I0001','S003','S004',100000000,1000,'EUR',NULL,1000,NULL,'Compra fixture',NULL,'Vigente',1,'f','f')",
    );
  }
  return db;
}

function close(db: Database) {
  db.close();
}

test("AC-01: ventana finita, S0 visible y sin escritura", () => {
  const db = fixture({ plan: true });
  try {
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.ciclo).toMatchObject({ inicio: "2026-01-01", fin: "2026-01-31" });
    expect(result.ciclo.saldoInicialComida).toBe("1000.00");
    expect(["Listo", "Listo con avisos"]).toContain(result.estado);
    expect(result.bloqueos).toEqual([]);
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({ n: 1 });
  } finally {
    close(db);
  }
});

test("AC-02: sin siguiente Inicio bloquea sin inventar Fin", () => {
  const db = fixture();
  try {
    const result = getPrecierre(db, "2", now, { backup });
    expect(result.ciclo.fin).toBeNull();
    expect(result.estado).toBe("Bloqueado");
    expect(result.bloqueos.map((b) => b.code)).toContain("SIN_SIGUIENTE_INICIO");
  } finally {
    close(db);
  }
});

test("AC-03: S0 ausente bloquea y no se crea", () => {
  const db = fixture();
  try {
    const result = getPrecierre(db, "1", now, { backup, s0: null });
    expect(result.estado).toBe("Bloqueado");
    expect(result.bloqueos.map((b) => b.code)).toContain("S0_AUSENTE");
    expect(db.query("SELECT saldo_comida FROM ciclos WHERE id='1'").get()).toEqual({
      saldo_comida: 100000,
    });
  } finally {
    close(db);
  }
});

test("AC-04: vínculos históricos inactivos no bloquean; clasificación incompatible sí", () => {
  const db = fixture({ reference: true, plan: true });
  try {
    db.run("UPDATE partidas SET estado='Inactiva' WHERE id='PAR001'");
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.bloqueos.map((b) => b.code)).not.toContain(
      "INCONSISTENCIA_NUCLEO",
    );
  } finally {
    close(db);
  }
  const incompatible = fixture({ plan: true });
  try {
    incompatible.exec(`
      INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
      VALUES('CAT002','Ingreso fixture','Ingreso','Ingreso','Ingreso',0,'Activa',1,'f','f');
      INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
      VALUES('SUB002','Sub ingreso','CAT002','Activa',1,'f','f');
      INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto)
      VALUES('PAR002','Partida incompatible','SUB002','Activa',1,'f','f',NULL,NULL);
      INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,anulado,revision,creado,actualizado,capital,intereses)
      VALUES('103','2026-01-12','Gasto',100,'S001','S000',NULL,'PAR002',NULL,'Gasto incompatible','',0,1,'f','f',NULL,NULL);
    `);
    const result = getPrecierre(incompatible, "1", now, { backup });
    expect(result.bloqueos.map((b) => b.code)).toContain("INCONSISTENCIA_NUCLEO");
  } finally {
    close(incompatible);
  }
});

test("AC-05: E4.1 muestra efectivo/posiciones a Fin y excluye el futuro", () => {
  const db = fixture({ investment: true, plan: true });
  try {
    db.run(
      "INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado) VALUES('2','Compra','2026-02-05','I0001','S003','S004',50000000,1000,'EUR',NULL,500,NULL,'Compra futura',NULL,'Vigente',1,'f','f')",
    );
    const result = getPrecierre(db, "1", now, { backup });
    const source = result.fuentes.find((f) => f.key === "inversion")!;
    expect(source.estado).toBe("Integrado");
    expect(source.cobertura).toContain("1 instrumentos");
    expect(result.inversion.posiciones[0].cantidad).toBe("1");
    expect(result.inversion.posiciones).toHaveLength(1);
    expect(result.inversion.valoracion).toBe("No disponible");
  } finally {
    close(db);
  }
});

test("AC-05: múltiples cuentas de efectivo, incluida inactiva histórica", () => {
  const db = fixture({ investment: true, plan: true });
  try {
    db.run(
      "INSERT INTO saldos(id,nombre,tipo,control,estado,finalidad,liquidez,bolsa,exterior,apertura,fecha_apertura,objetivo,manual,revision,creado,actualizado) VALUES('S006','Efectivo inversión 2','Efectivo','Inversiones','Inactiva',NULL,0,0,0,2000,NULL,NULL,NULL,1,'f','f')",
    );
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.inversion.efectivo).toBe("10.00");
    expect(result.fuentes.find((f) => f.key === "inversion")!.estado).toBe(
      "Integrado",
    );
  } finally {
    close(db);
  }
});

test("AC-05: misma posición se separa por Saldo+Instrumento", () => {
  const db = fixture({ investment: true, plan: true });
  try {
    db.run(
      "INSERT INTO saldos(id,nombre,tipo,control,estado,finalidad,liquidez,bolsa,exterior,apertura,fecha_apertura,objetivo,manual,revision,creado,actualizado) VALUES('S006','Cartera 2','Inversión','Inversiones','Activa',NULL,0,0,0,0,NULL,NULL,NULL,1,'f','f')",
    );
    db.run(
      "INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado) VALUES('3','Compra','2025-12-20','I0001','S003','S006',200000000,1000,'EUR',NULL,2000,NULL,'Compra cartera 2',NULL,'Vigente',1,'f','f')",
    );
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.inversion.instrumentos).toBe(1);
    expect(result.inversion.posiciones).toHaveLength(2);
    expect(result.inversion.posiciones.map((p) => p.cantidad).sort()).toEqual([
      "1",
      "2",
    ]);
    expect(
      result.inversion.posiciones.map((p) => p.saldoInversion.id).sort(),
    ).toEqual(["S004", "S006"]);
  } finally {
    close(db);
  }
});

test("AC-05: dos compras de la misma posición suman en BigInt exacto", () => {
  const db = fixture({ investment: true, plan: true });
  try {
    db.run(
      "INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado) VALUES('4','Compra','2026-01-15','I0001','S003','S004',150000000,1000,'EUR',NULL,1500,NULL,'Compra fracción',NULL,'Vigente',1,'f','f')",
    );
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.inversion.posiciones).toHaveLength(1);
    expect(result.inversion.posiciones[0].cantidad).toBe("2.5");
  } finally {
    close(db);
  }
});

test("AC-05: suma agregada por encima de 2^63-1 sin overflow", () => {
  const db = fixture({ plan: true });
  try {
    db.run(
      "INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en) VALUES('I0001','Instrumento overflow','Activa',1,'f','f')",
    );
    const insert = db.prepare(
      "INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado) VALUES(?, 'Compra','2026-01-05','I0001','S003','S004',?,1,'EUR',NULL,1,NULL,'Compra overflow',NULL,'Vigente',1,'f','f')",
    );
    const max = 9007199254740991n;
    db.transaction(() => {
      for (let i = 0; i < 1025; i++) insert.run(String(1000 + i), max);
    })();
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.inversion.posiciones).toHaveLength(1);
    expect(result.inversion.posiciones[0].cantidad).toBe(
      quantityText(max * 1025n),
    );
  } finally {
    close(db);
  }
});

test("AC-05: E4.1 no disponible bloquea el precierre", () => {
  const db = fixture({ plan: true });
  try {
    db.run("UPDATE saldos SET tipo='Exterior', control='Exterior' WHERE id='S003'");
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.estado).toBe("Bloqueado");
    expect(result.bloqueos.map((b) => b.code)).toContain("E4_1_NO_DISPONIBLE");
  } finally {
    close(db);
  }
});

test("AC-06: sin compras nuevas pero con posición previa no es vacío", () => {
  const withPosition = fixture({ investment: true, plan: true });
  try {
    const result = getPrecierre(withPosition, "1", now, { backup });
    expect(result.fuentes.find((f) => f.key === "inversion")!.estado).not.toBe("Vacío");
  } finally {
    close(withPosition);
  }
  const without = fixture({ plan: true });
  try {
    const result = getPrecierre(without, "1", now, { backup });
    expect(result.fuentes.find((f) => f.key === "inversion")!.estado).toBe("Vacío");
  } finally {
    close(without);
  }
});

test("AC-07: fuentes no disponibles son aviso, no cero ni bloqueo", () => {
  const db = fixture({ plan: true });
  try {
    const result = getPrecierre(db, "1", now, { backup });
    for (const key of ["e43", "e42", "e44"]) {
      const source = result.fuentes.find((f) => f.key === key)!;
      expect(source.estado).toBe("No disponible");
      expect(source.cobertura).toBe("No disponible");
    }
    const auxiliary = result.fuentes.find((f) => f.key === "anticipos")!;
    expect(auxiliary.estado).toBe("Parcial");
    expect(auxiliary.motivo).toContain("no acreditada");
    expect(result.avisos.map((a) => a.code)).toContain(
      "COBERTURA_AUXILIAR_PARCIAL",
    );
    expect(result.estado).toBe("Listo con avisos");
    expect(result.cobertura).toBe("Parcial");
  } finally {
    close(db);
  }
});

test("AC-08: backup sin evidencia bloquea", () => {
  const db = fixture({ plan: true });
  try {
    const result = getPrecierre(db, "1", now);
    expect(result.estado).toBe("Bloqueado");
    expect(result.bloqueos.map((b) => b.code)).toContain("BACKUP_NO_VERIFICABLE");
    expect(result.e4_9Bloqueado).toBe(true);
  } finally {
    close(db);
  }
});

test("AC-09: POST/PATCH/DELETE no escriben y devuelven 405", async () => {
  const db = fixture({ plan: true });
  const key = randomBytes(32);
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, now: () => now, precierre: { backup } }),
  );
  try {
    const token = provision(db, now);
    const enroll = await handler(
      new Request("http://127.0.0.1:5173/api/auth/enroll", {
        method: "POST",
        headers: { origin: "http://127.0.0.1:5173", "content-type": "application/json" },
        body: JSON.stringify({ token, password: "Clave ficticia " + randomUUID() }),
      }),
    );
    const secret = (await enroll.json()).secret as string;
    const challenge = enroll.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .find((value) => value.startsWith("mf_local_challenge="))!;
    const mfa = await handler(
      new Request("http://127.0.0.1:5173/api/auth/mfa", {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:5173",
          "content-type": "application/json",
          cookie: challenge,
        },
        body: JSON.stringify({ code: totp(secret).generate({ timestamp: now }) }),
      }),
    );
    const mfaData = (await mfa.json()) as { csrf?: string };
    const csrf = mfaData.csrf ?? "";
    const cookie = mfa.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .find((value) => value.startsWith("mf_local_session="))!;
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const response = await handler(
        new Request("http://127.0.0.1:5173/api/cierres/precierre/1", {
          method,
          headers: {
            origin: "http://127.0.0.1:5173",
            cookie,
            "x-csrf-token": csrf,
          },
        }),
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
    }
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({ n: 1 });
  } finally {
    close(db);
  }
});

test("AC-10: GET repetido conserva revisión y no escribe", () => {
  const db = fixture({ plan: true });
  try {
    const before = db.query("SELECT COUNT(*) n FROM movimientos").get();
    const first = getPrecierre(db, "1", now, { backup });
    const second = getPrecierre(db, "1", now, { backup });
    expect(second.revision).toBe(first.revision);
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(before);
  } finally {
    close(db);
  }
});

test("AC-11: cambio de fuente cambia la revisión", () => {
  const db = fixture({ plan: true });
  try {
    const first = getPrecierre(db, "1", now, { backup });
    db.run("UPDATE movimientos SET fecha='2026-01-12' WHERE id='101'");
    const second = getPrecierre(db, "1", now, { backup });
    expect(second.revision).not.toBe(first.revision);
  } finally {
    close(db);
  }
});

test("AC-11: cambio de importe del plan cambia la huella", () => {
  const db = fixture({ plan: true });
  try {
    const first = getPrecierre(db, "1", now, { backup });
    db.run("UPDATE cycle_plan_lines SET del_mes=2000 WHERE ciclo='1'");
    const second = getPrecierre(db, "1", now, { backup });
    expect(second.revision).not.toBe(first.revision);
  } finally {
    close(db);
  }
});

test("AC-12: SinPlan es válido y no bloquea", () => {
  const db = fixture();
  try {
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.plan.estado).toBe("SinPlan");
    expect(result.bloqueos.map((b) => b.code)).not.toContain("PLAN_NO_VERIFICABLE");
    expect(result.estado).not.toBe("Bloqueado");
  } finally {
    close(db);
  }
});

test("AC-13: plan no verificable bloquea con inconsistencia real", () => {
  const db = fixture({ plan: true });
  try {
    db.run(
      "INSERT INTO cycle_plan_audit(ciclo,presupuesto,revision,actor,instante,motivo,delta) VALUES('1','PRE0001',2,'f','f','revisión divergente','{}')",
    );
    const result = getPrecierre(db, "1", now, { backup });
    expect(result.plan.estado).toBe("PlanNoVerificable");
    expect(result.bloqueos.map((b) => b.code)).toContain("PLAN_NO_VERIFICABLE");
  } finally {
    close(db);
  }
});

test("AC-14: E3.5 no disponible deja precierre parcial y E4.9 bloqueado", () => {
  const db = fixture({ plan: true });
  try {
    const result = getPrecierre(db, "1", now, { backup });
    const comida = result.fuentes.find((f) => f.key === "e35")!;
    expect(comida.estado).toBe("No disponible");
    expect(result.cobertura).toBe("Parcial");
    expect(result.e4_9Bloqueado).toBe(true);
  } finally {
    close(db);
  }
});

test("AC-15: estado comparte versión y estado con precierre", () => {
  const db = fixture({ plan: true });
  try {
    const full = getPrecierre(db, "1", now, { backup });
    const state = getPrecierreEstado(db, "1", now, { backup });
    expect(state.revision).toBe(full.revision);
    expect(state.estado).toBe(full.estado);
    expect(state.e4_9Bloqueado).toBe(full.e4_9Bloqueado);
  } finally {
    close(db);
  }
});

test("AC-16: cierre posterior coherente avisa; incoherente bloquea", () => {
  const db = fixture({ plan: true });
  try {
    const warning = getPrecierre(db, "1", now, {
      backup,
      closures: [{ id: "3", fin: "2026-02-28", coherent: true }],
    });
    expect(warning.avisos.map((a) => a.code)).toContain("CIERRE_FUERA_DE_ORDEN");
    expect(warning.bloqueos.map((b) => b.code)).not.toContain(
      "INCOHERENCIA_CON_CIERRE_POSTERIOR",
    );
    const blocked = getPrecierre(db, "1", now, {
      backup,
      closures: [{ id: "3", fin: "2026-02-28", coherent: false }],
    });
    expect(blocked.bloqueos.map((b) => b.code)).toContain(
      "INCOHERENCIA_CON_CIERRE_POSTERIOR",
    );
  } finally {
    close(db);
  }
});
