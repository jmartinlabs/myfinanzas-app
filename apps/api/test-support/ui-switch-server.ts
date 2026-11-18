// Isolated UI switch-contrast source with real MFA. Test-only; never imported
// by the app and never pointed at real data.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

// Puerto y estado llegan del contexto de la ejecución (#508); los valores
// históricos se conservan para arrancarlo a mano.
const PORT = Number(process.env.E2E_PORT ?? 3045);
const dir = process.env.E2E_STATE_DIR ?? ".local/e2e-ui-switch";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, { key, origin: process.env.APP_ORIGIN }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: PORT })),
    ),
  ),
);
