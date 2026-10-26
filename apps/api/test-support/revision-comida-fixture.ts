/** Fictitious sources for E3.4 tests; never imported by application runtime. */
import type { Database } from "bun:sqlite";

export function revisionComidaFixture(db: Database) {
  db.exec(`INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
      VALUES('CAT001','Comida fixture','Gasto','Gasto','Gasto',0,'Activa',1,'f','f');
    INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
      VALUES('SUB001','Sub comida fixture','CAT001','Activa',1,'f','f');
    INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda)
      VALUES('PAR001','Partida comida fixture','SUB001','Activa',1,'f','f',NULL);
    INSERT INTO saldos(id,nombre,tipo,control,estado,finalidad,liquidez,bolsa,exterior,apertura,fecha_apertura,objetivo,manual,revision,creado,actualizado)
      VALUES('S006','Exterior fixture','Exterior','Exterior','Activa','Ficticio',0,0,1,NULL,NULL,NULL,NULL,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
    INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-09-25',0,'fixture'),('2','2026-10-25',0,'fixture');
    INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,anulado,revision,creado,actualizado,capital,intereses) VALUES
      ('201','2026-10-01','Gasto',100000,'S002','S000',NULL,'PAR001',NULL,'Compra terminal ficticia','',0,1,'f','f',NULL,NULL),
      ('202','2026-10-02','Gasto',200000,'S001','S000',NULL,'PAR001',NULL,'Compra individual ficticia','',0,1,'f','f',NULL,NULL),
      ('203','2026-10-03','Ingreso',500000,'S000','S001','Nómina',NULL,NULL,'Nómina ficticia','',0,1,'f','f',NULL,NULL),
      ('204','2026-10-04','Transferencia',150000,'S001','S002',NULL,NULL,NULL,'Transferencia interna ficticia','',0,1,'f','f',NULL,NULL),
      ('205','2026-10-05','Gasto',300000,'S002','S000',NULL,'PAR001',NULL,'Compra anulada ficticia','',1,1,'f','f',NULL,NULL),
      ('206','2026-10-06','Transferencia',100000,'S001','S006',NULL,NULL,NULL,'Transferencia exterior ficticia','',0,1,'f','f',NULL,NULL),
      ('207','2026-10-07','Gasto',400000,'S001','S000',NULL,'PAR001',NULL,'Compra revisable ficticia','',0,1,'f','f',NULL,NULL),
      ('208','2026-10-08','Gasto',5000,'S006','S000',NULL,'PAR001',NULL,'Compra exterior ficticia','',0,1,'f','f',NULL,NULL);`);
}
