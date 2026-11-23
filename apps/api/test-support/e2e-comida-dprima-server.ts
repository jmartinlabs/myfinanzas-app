// Test-only server: real MFA, application routes and fictitious E2E state.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { comidaDprimaFixture } from "./e2e-comida-dprima-fixture";
import { gateAbiertoParaPruebas } from "./devolucion-gate-abierto";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
// Puerto y estado del contexto de la ejecución (#514). `E2E_STATE_DIR` es el
// nombre que publica el arnés; `E2E_STATE` es el histórico de este fixture y el
// directorio por defecto permite arrancarlo a mano.
const dir =
  process.env.E2E_STATE_DIR ??
  process.env.E2E_STATE ??
  ".local/e2e-comida-dprima";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-31T12:00:00Z");
comidaDprimaFixture(db);
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        devolucionGate: gateAbiertoParaPruebas,
        // Origen de la ejecución (#514): el alta y la sesión deben nacer en el
        // mismo origen que sirve el navegador, no en un literal.
        origin: process.env.APP_ORIGIN ?? process.env.E2E_APP_ORIGIN,
      }),
    ).pipe(
      Layer.provide(
        BunHttpServer.layer({
          hostname: "127.0.0.1",
          port: Number(process.env.E2E_PORT ?? 3010),
        }),
      ),
    ),
  ),
);
