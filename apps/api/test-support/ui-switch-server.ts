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

const PORT = 3045;
const dir = ".local/e2e-ui-switch";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: PORT })),
    ),
  ),
);
