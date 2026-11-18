// Isolated test process, genuine Effect HTTP/Auth/SQLite; no fixture route or MFA bypass.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");
// Puerto y estado del contexto de la run (#508); defaults para uso manual.
const PORT = Number(process.env.E2E_PORT ?? 3030);
const dir = process.env.E2E_STATE_DIR ?? ".local/e2e-spec37-i6";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        // `APP_ORIGIN` o, en una ejecución, el origen que publica su contexto.
        origin:
          process.env.APP_ORIGIN ??
          process.env.E2E_APP_ORIGIN ??
          "http://127.0.0.1:5173",
      }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: PORT })),
    ),
  ),
);