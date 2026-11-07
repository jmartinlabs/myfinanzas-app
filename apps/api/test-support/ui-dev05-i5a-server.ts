// Isolated UI · DEV-05 I5a source with real MFA. Test-only; never imported by
// the app and never pointed at real data.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createCompartido, createParticipante } from "../src/compartidos";
import { createCycle, cycleContext } from "../src/ciclos";
import { createBudget } from "../src/presupuestos";
import { createSaldo } from "../src/saldos";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

const dir = ".local/e2e-ui-dev05-i5a";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
const now = Date.now();

const compartido = createCompartido(
  db,
  { nombre: "Piso I5a ficticio" },
  crypto.randomUUID(),
  now,
).referencia.id;
for (const [nombre, rol, partes] of [
  ["Yo", "Titular", 1],
  ["Tercero I5a", "Tercero", 1],
] as const)
  createParticipante(
    db,
    compartido,
    { nombre, rol, partes },
    crypto.randomUUID(),
    now,
  );

createSaldo(
  db,
  {
    nombre: "Banco I5a ficticio",
    tipo: "Efectivo",
    control: "Movimientos",
    saldoApertura: "1000",
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  },
  crypto.randomUUID(),
  now,
);

createCycle(
  db,
  {
    inicio: "2026-10-01",
    saldoInicialComida: "0",
    contextRevision: cycleContext(db).revision,
  },
  crypto.randomUUID(),
  now,
);

createBudget(
  db,
  { nombre: "Presupuesto I5a ficticio", fuente: "No aplica", destino: null },
  crypto.randomUUID(),
  now,
);

writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3025 })),
    ),
  ),
);
