// Isolated Referencias source with real MFA. Test-only; never imported by the
// app and never pointed at real data.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { loadKey, provision } from "../src/auth";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

const port = Number(process.env.REFERENCIAS_PORT ?? 3054);
const dir = resolve(process.env.REFERENCIAS_STATE ?? ".local/e2e-referencias-g5d");
if (!dir.startsWith(resolve(".local") + sep))
  throw new Error("State must live under .local/");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
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
