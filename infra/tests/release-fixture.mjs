// Synthetic cross-version acceptance fixture. Mounted read-only; never shipped.
// One representative row per post-v6 module, plus a second write after the update,
// so release-contract.mjs can prove that both the previous and current binaries
// preserve the whole v16 data contract, not only Saldos/Movimientos.

export const tables = [
  'saldos', 'movimientos', 'movement_audit', 'referencias', 'categorias',
  'subcategorias', 'partidas', 'audit', 'counters', 'deudas', 'presupuestos',
  'budget_contract', 'ciclos', 'cycle_plans', 'cycle_plan_lines', 'payroll',
  'payroll_allocations', 'annual_plan_lines', 'annual_plan_audit',
  'fichas_anticipos', 'movimiento_anticipo', 'anticipo_audit',
  'fichas_compartidos', 'participantes_compartido', 'compartido_audit',
  'fichas_vehiculo', 'revision_comida', 'revision_comida_audit',
];

export const snapshot = (db) => JSON.stringify(
  tables.map((table) => [table, db.query(`SELECT * FROM ${table} ORDER BY rowid`).all()]),
);

const pay = (id, mes) => JSON.stringify({
  id, revision: 1, originalRevision: 1, mes, tipo: 'Ordinaria', guardia: 'No',
  devengo: '1000.00', base: '1000.00', irpf: '0.00', variable: '0.00',
  historico: '1000.00', documentado: null, evidencia: 'fixture',
  evidenciaDocumentado: '', verificado: false, documentadoVerificado: false,
  nota: 'fixture', resolucion: null,
});

const masters = (db) => {
  db.run(`INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
    VALUES('CAT900','Categoría fixture','Gasto','Gasto','Gasto',0,'Activa',1,'fixture','fixture')`);
  db.run(`INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
    VALUES('SUB900','Sub fixture','CAT900','Activa',1,'fixture','fixture')`);
  db.run(`INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto)
    VALUES('PAR900','Partida fixture','SUB900','Activa',1,'fixture','fixture',NULL,NULL)`);
  for (const [id, nombre, tipo] of [
    ['REF9001', 'Anticipo fixture', 'Anticipo'],
    ['REF9002', 'Compartido fixture', 'Gasto compartido'],
    ['REF9003', 'Vehículo fixture', 'Vehículo'],
  ]) db.run(`INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado)
    VALUES(?,?,?,'Activa',1,'fixture','fixture')`, [id, nombre, tipo]);
};

const moduleRows = (db, suffix, cycle, inicio, extra) => {
  db.run(`INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado)
    VALUES(?,?,'2026-01-01',NULL,'Activa',1,'fixture','fixture')`, ['D900' + suffix, 'Deuda fixture ' + suffix]);
  db.run(`INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
    VALUES(?,?,'No aplica',NULL,'Activo',1,'fixture','fixture')`, ['PRE900' + suffix, 'Presupuesto fixture ' + suffix]);
  db.run(`INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado)
    VALUES(?,?,0,'fixture',1,'fixture')`, [cycle, inicio]);
  db.run('INSERT INTO cycle_plans(ciclo,revision) VALUES(?,1)', [cycle]);
  db.run('INSERT INTO cycle_plan_lines(ciclo,presupuesto,base,esencial,del_mes) VALUES(?,?,100,NULL,100)',
    [cycle, 'PRE900' + suffix]);
  db.run(`INSERT INTO annual_plan_lines(ejercicio,partida,presupuesto,periodo,esencial,revision)
    VALUES(?, 'PAR900', 1000, NULL, 'Sí', 1)`, [extra]);
  db.run('INSERT INTO payroll(id,revision,data) VALUES(?,1,?)', ['PAY900' + suffix, pay('PAY900' + suffix, '2026-0' + suffix)]);
  db.run(`INSERT INTO fichas_anticipos(referencia,apertura,evidencia,creado,actualizado)
    VALUES(?,NULL,NULL,'fixture','fixture')`, ['REF900' + (suffix === '1' ? 1 : 4)]);
  db.run(`INSERT INTO fichas_compartidos(referencia,revision,creado,actualizado)
    VALUES(?,1,'fixture','fixture')`, ['REF900' + (suffix === '1' ? 2 : 5)]);
  db.run('INSERT INTO participantes_compartido VALUES(?,?,?,?,?,?,?,\'fixture\',\'fixture\')',
    ['CP900' + suffix, 'REF900' + (suffix === '1' ? 2 : 5), 'Titular fixture ' + suffix, 'Titular', 100, 'Activa', 1]);
  db.run(`INSERT INTO fichas_vehiculo(referencia,matricula,proxima_itv,fecha_cita,revision,creado,actualizado)
    VALUES(?,?,NULL,NULL,1,'fixture','fixture')`, ['REF900' + (suffix === '1' ? 3 : 6), 'FIX ' + suffix]);
  db.run(`INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,clasificacion,
    fuera_presupuesto_historico,evidencia_bancaria,evidencia_relacion_compra,cuenta_origen,tipo_vinculo,
    estado_vinculo,evidencia_vinculo,movimiento,revision_movimiento,estado_registro,estado_trazabilidad,
    revision,creado,actualizado)
    VALUES(?, 'Detalle', ?, ?, 1234, 'Salida', 0, 'Comida', NULL, 'evidencia fixture', NULL, NULL, NULL,
    'Sin vínculo', NULL, NULL, NULL, 'Vigente', 'Sin asignación', 1, 'fixture', 'fixture')`,
    ['RC900' + suffix, '2026-01-1' + suffix, 'Compra fixture ' + suffix]);
};

export function installFixture(db, mode) {
  if (mode === 'seed') {
    masters(db);
    moduleRows(db, '1', '9001', '2026-01-20', 2026);
  } else if (mode === 'update') {
    for (const [id, nombre, tipo] of [
      ['REF9004', 'Anticipo fixture 2', 'Anticipo'],
      ['REF9005', 'Compartido fixture 2', 'Gasto compartido'],
      ['REF9006', 'Vehículo fixture 2', 'Vehículo'],
    ]) db.run(`INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado)
      VALUES(?,?,?,'Activa',1,'fixture','fixture')`, [id, nombre, tipo]);
    moduleRows(db, '2', '9002', '2026-02-20', 2027);
  }
}
