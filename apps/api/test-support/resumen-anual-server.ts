// Isolated E4.7 source with real MFA. Test-only; never imported by the app and
// never pointed at real data. Seeds fictitious C007/C008 values from SPEC24/25
// with the public engines, exactly for E2E composition.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { loadKey, provision } from "../src/auth";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
import { seedResumenAnualFixture } from "./resumen-anual-fixture";
import { RESUMEN_ANUAL_NOW } from "./resumen-anual-clock";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

const empty = process.env.E47_SCENARIO === "empty";
// Puerto y estado del contexto de la ejecución (#514), con prioridad sobre los
// nombres históricos `E47_*`; sin contexto se conservan los valores de siempre
// para poder arrancarlo a mano.
const dir =
  process.env.E2E_STATE_DIR ??
  process.env.E47_DIR ??
  (empty ? ".local/e2e-e47-empty" : ".local/e2e-e47");
const port = Number(
  process.env.E2E_PORT ?? process.env.E47_PORT ?? (empty ? 3019 : 3018),
);

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
if (!empty) seedResumenAnualFixture(db);
const key = loadKey(db, dir + "/auth.key");
// Fixed clock after the 2027 cut: E4.4 rejects future cuts and MFA must use
// the same instant as the data.
writeFileSync(dir + "/bootstrap.txt", provision(db, RESUMEN_ANUAL_NOW), {
  mode: 0o600,
});
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        now: () => RESUMEN_ANUAL_NOW,
        // Origen de la ejecución (#514): sin él, el alta y la sesión del run se
        // rechazarían con 403 ORIGIN.
        origin: process.env.APP_ORIGIN ?? process.env.E2E_APP_ORIGIN,
      }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port })),
    ),
  ),
);
