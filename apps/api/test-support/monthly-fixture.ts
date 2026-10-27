/** Fictitious sources for integration tests, never imported by application runtime. */
import type { Database } from "bun:sqlite";
import { confirmPayroll, getPayroll } from "../src/nomina";
export function monthlyFixture(db: Database) {
  db.exec(`INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-06-20',0,'fixture'),('2','2026-07-20',0,'fixture'),('3','2026-08-20',0,'fixture');
 INSERT INTO categorias VALUES('CAT001','Gastos fixture','Gasto','Gasto','Gasto',0,'Activa',1,'f','f');
 INSERT INTO subcategorias VALUES('SUB001','Sub fixture','CAT001','Activa',1,'f','f');
 INSERT INTO deudas VALUES('D001','Deuda fixture','2026-01-01',1000000,'Inactiva',1,'f','f');
 INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda) VALUES('PAR001','Gasto sin plan','SUB001','Activa',1,'f','f',NULL),('PAR002','Cuota fixture','SUB001','Inactiva',1,'f','f','D001');
 INSERT INTO presupuestos VALUES('PRE001','Plan fixture','No aplica',NULL,'Inactivo',1,'f','f');
 INSERT INTO cycle_plans VALUES('1',1);
 INSERT INTO cycle_plan_lines VALUES('1','PRE001',160000,NULL,190000);
 UPDATE saldos SET liquidez=1,apertura=200000 WHERE id='S001';
 UPDATE saldos SET liquidez=1,apertura=320000 WHERE id='S003';
 INSERT INTO instrumentos VALUES('I1001','Fondo índice fixture',NULL,NULL,'EUR','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
 INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado)
 VALUES('5001','Compra','2026-07-01','I1001','S003','S004',1000000000,100000000,'EUR',NULL,138960,NULL,NULL,NULL,'Vigente',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
 UPDATE counters SET next=1002 WHERE name='instrumento';
 UPDATE counters SET next=5002 WHERE name='operaciones_inversion';`);
  const insert = db.query(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,capital,intereses) VALUES(?,?,?,?,?,?,?,?,'Fixture','',?,1,'f','f',?,?)",
  );
  const add = (
    id: string,
    fecha: string,
    tipo: string,
    importe: number,
    subtipo: string | null,
    partida: string | null,
    origen: string,
    destino: string,
    anulado = 0,
    capital: string | null = null,
    intereses: string | null = null,
  ) =>
    insert.run(
      id,
      fecha,
      tipo,
      importe,
      origen,
      destino,
      subtipo,
      partida,
      anulado,
      capital,
      intereses,
    );
  add("101", "2026-06-20", "Ingreso", 200000, "Nómina", null, "S000", "S001");
  add("102", "2026-07-19", "Ingreso", 20000, "Bonus", null, "S000", "S001");
  add("103", "2026-07-05", "Ingreso", 3000, "Promoción", null, "S000", "S001");
  add("104", "2026-07-05", "Ingreso", 2000, "Intereses", null, "S000", "S001");
  add(
    "105",
    "2026-07-05",
    "Gasto",
    30000,
    null,
    "PAR002",
    "S001",
    "S000",
    0,
    "25000",
    "5000",
  );
  add("106", "2026-07-05", "Gasto", 150000, null, "PAR001", "S002", "S000");
  add("107", "2026-07-05", "Transferencia", 150000, null, null, "S001", "S002");
  add(
    "108",
    "2026-07-05",
    "Amortización deuda",
    10000,
    null,
    "PAR002",
    "S001",
    "S000",
    0,
    "10000",
    "0",
  );
  add(
    "109",
    "2026-07-05",
    "Ingreso",
    900000,
    "Nómina",
    null,
    "S000",
    "S001",
    1,
  );
  add("110", "2026-06-19", "Ingreso", 900000, "Nómina", null, "S000", "S001");
  add("111", "2026-07-20", "Ingreso", 50000, "Nómina", null, "S000", "S001");
  for (const [mes, neto, evidence] of [
    ["2026-06", "1000", "a"],
    ["2026-06", "500", "b"],
    ["2026-05", "2000", "c"],
  ] as const) {
    confirmPayroll(
      db,
      {
        accion: "guardar",
        contexto: getPayroll(db).contexto,
        motivo: "Fixture mensual",
        paga: {
          mes,
          tipo: "Ordinaria",
          guardia: "No",
          devengo: "2200",
          base: "2200",
          irpf: "10",
          variable: "0",
          historico: neto,
          documentado: null,
          evidencia: "paga-" + evidence,
          evidenciaDocumentado: "",
          verificado: true,
          documentadoVerificado: false,
          nota: "Ficticio",
        },
      },
      crypto.randomUUID(),
      Date.parse("2026-10-25T12:00:00Z"),
    );
  }
}
