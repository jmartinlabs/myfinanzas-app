// Test-only G5e-2 source: fictional cycles with conciliation alerts plus an
// unattributed historical advance, so the Pendientes catalogue shows several
// types and states. Never imported by the app and never pointed at real data.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createCycle, cycleContext } from "../src/ciclos";
import { createSaldo } from "../src/saldos";
import { activateRegimen, prepareRegimen } from "../src/comida";
import { createAnticipo } from "../src/anticipos";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

const port = Number(process.env.PENDIENTES_G5E_PORT ?? 3060);
const dir = resolve(process.env.PENDIENTES_G5E_STATE ?? ".local/e2e-pendientes-g5e");
if (!dir.startsWith(resolve(".local") + sep))
  throw new Error("State must live under .local/");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
const now = Date.parse("2026-10-26T12:00:00Z");
const account = createSaldo(
  db,
  {
    nombre: "ING Comida G5e ficticio",
    tipo: "Efectivo",
    control: "Movimientos",
    saldoApertura: "0",
    fechaApertura: "2026-01-01",
  },
  crypto.randomUUID(),
  now,
).id;
const cycles: { id: string }[] = [];
for (const [inicio, s0] of [
  ["2026-10-01", "100"],
  ["2026-11-01", "200"],
  ["2026-12-01", "200"],
] as const)
  cycles.push(
    createCycle(
      db,
      {
        inicio,
        saldoInicialComida: s0,
        contextRevision: cycleContext(db).revision,
      },
      crypto.randomUUID(),
      now,
    ).ciclo,
  );
const ready = prepareRegimen(
  db,
  {
    saldo: account,
    cicloCorte: cycles[0].id,
    apertura: "100",
    evidencia: "Extracto ficticio G5e",
    cobertura: "Verificable",
    motivo: "Preparación ficticia G5e",
  },
  crypto.randomUUID(),
  now,
);
activateRegimen(
  db,
  {
    revision: ready.regimen.regimen!.revision,
    motivo: "Activación ficticia G5e",
    confirmar: true,
  },
  crypto.randomUUID(),
  now,
);
const ref = createAnticipo(
  db,
  { nombre: "Histórico ficticio G5e pendiente" },
  crypto.randomUUID(),
  now,
).referencia.id;
db.run(
  "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,revision,creado,actualizado) VALUES('301','2026-01-01','Transferencia',50000,'S001','S002',?,'histórico ficticio G5e','',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
  [ref],
);
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        origin: process.env.APP_ORIGIN ?? "http://127.0.0.1:5173",
      }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port })),
    ),
  ),
);
