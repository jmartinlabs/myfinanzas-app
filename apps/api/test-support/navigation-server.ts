// Isolated UI · DEV-03 navigation E2E source with real MFA.
// Test-only; never imported by the app and never pointed at real data.
// `E2E_PORT`/`E2E_STATE_DIR` (contexto de #508) permiten una instancia propia
// por spec; `E2E_DIR` se conserva como alias de las specs que ya lo usaban.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { loadKey, provision } from "../src/auth";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

const dir =
  process.env.E2E_STATE_DIR ?? process.env.E2E_DIR ?? ".local/e2e-navigation";
const port = Number(process.env.E2E_PORT ?? 3023);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key, origin: process.env.E2E_APP_ORIGIN ?? "http://127.0.0.1:5173" })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port })),
    ),
  ),
);
