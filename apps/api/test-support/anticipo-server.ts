// Isolated fictional source and real MFA server. There is no fixture API.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createAnticipo } from "../src/anticipos";
import { createCycle, cycleContext } from "../src/ciclos";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = ".local/e2e-anticipos";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.now();
const ref = createAnticipo(
  db,
  { nombre: "Histórico ficticio pendiente" },
  crypto.randomUUID(),
  now,
).referencia.id;
for (const [id, from, to, amount] of [
  ["101", "S001", "S002", 100000],
  ["102", "S002", "S001", 50000],
] as const)
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,revision,creado,actualizado) VALUES(?,'2026-01-01','Transferencia',?,?,?,?,'histórico ficticio','',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    [id, amount, from, to, ref],
  );
for (const inicio of ["2026-06-20", "2026-07-20"])
  createCycle(
    db,
    {
      inicio,
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    crypto.randomUUID(),
    now,
  );
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3008 })),
    ),
  ),
);
