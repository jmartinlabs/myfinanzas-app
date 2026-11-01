// Test-only server: real MFA and read-only precierre with fictitious fixtures.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = process.env.E2E_STATE ?? ".local/e2e-precierre";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key");
db.exec(`
  INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
  VALUES('CAT001','Comida E2E','Gasto','Gasto','Gasto',0,'Activa',1,'f','f');
  INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
  VALUES('SUB001','Sub E2E','CAT001','Activa',1,'f','f');
  INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto)
  VALUES('PAR001','Partida E2E','SUB001','Activa',1,'f','f',NULL,NULL);
  INSERT INTO ciclos(id,inicio,saldo_comida,creado)
  VALUES('1','2026-01-01',100000,'f'),('2','2026-02-01',200000,'f');
  INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,anulado,revision,creado,actualizado,capital,intereses)
  VALUES('101','2026-01-10','Gasto',1000,'S001','S000',NULL,'PAR001',NULL,'Gasto precierre E2E','',0,1,'f','f',NULL,NULL);
  INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
  VALUES('PRE0001','Plan precierre E2E','No aplica',NULL,'Activo',1,'f','f');
  INSERT INTO cycle_plans(ciclo,revision) VALUES('1',1);
  INSERT INTO cycle_plan_lines(ciclo,presupuesto,base,esencial,del_mes)
  VALUES('1','PRE0001',1000,0,1000);
`);
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        precierre: { backup: { verified: true } },
      }),
    ).pipe(
      Layer.provide(
        BunHttpServer.layer({
          hostname: "127.0.0.1",
          port: Number(process.env.E2E_PORT ?? 3030),
        }),
      ),
    ),
  ),
);
