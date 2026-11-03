// Test-only server: real MFA and cycles without movements for E3.6 alerts.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createCycle, cycleContext } from "../src/ciclos";
import { createSaldo } from "../src/saldos";
import { activateRegimen, prepareRegimen } from "../src/comida";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = process.env.E2E_STATE ?? ".local/e2e-pendientes";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z");
const account = createSaldo(
  db,
  {
    nombre: "ING Comida E3.6 ficticio",
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
    evidencia: "Extracto ficticio E3.6",
    cobertura: "Verificable",
    motivo: "Preparación ficticia E3.6",
  },
  crypto.randomUUID(),
  now,
);
activateRegimen(
  db,
  {
    revision: ready.regimen.regimen!.revision,
    motivo: "Activación ficticia E3.6",
    confirmar: true,
  },
  crypto.randomUUID(),
  now,
);
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(
        BunHttpServer.layer({ hostname: "127.0.0.1", port: 3010 }),
      ),
    ),
  ),
);
