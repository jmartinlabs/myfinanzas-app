// Isolated test process, genuine Effect HTTP/Auth/SQLite; no fixture route or MFA bypass.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
if (process.env.NODE_ENV !== "test") throw new Error("Test process only");
const dir = ".local/e2e-annual";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key");
db.exec(`INSERT INTO categorias VALUES('CAT900','Seguros ficticios',NULL,'Gasto','Gasto',0,'Activa',1,'fixture','fixture');
INSERT INTO subcategorias VALUES('SUB900','Hogar ficticio','CAT900','Activa',1,'fixture','fixture');
INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado) VALUES('PAR900','Seguro ficticio','SUB900','Activa',1,'fixture','fixture'),('PAR901','Reserva ficticia','SUB900','Activa',1,'fixture','fixture'),('PAR902','Otros ficticios','SUB900','Activa',1,'fixture','fixture'),('PAR903','Sin línea ficticia','SUB900','Activa',1,'fixture','fixture');
INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2025-01-01',0,'fixture'),('2','2026-01-01',0,'fixture');
INSERT INTO annual_plan_lines VALUES(2026,'PAR900',120000,'Mayo - Octubre','Sí',1),(2026,'PAR901',NULL,'Julio - Agosto','Sí',1),(2026,'PAR902',0,NULL,'Pendiente',1);
INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado) VALUES('1','2026-06-15','Gasto',30000,'S001','S000','PAR900','Fixture','',0,1,'fixture','fixture'),('2','2026-06-20','Gasto',2000,'S001','S000','PAR903','Fixture','',0,1,'fixture','fixture');`);
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3006 })),
    ),
  ),
);
