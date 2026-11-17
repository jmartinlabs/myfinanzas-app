// Isolated test process, genuine Effect HTTP/Auth/SQLite; no fixture route or MFA bypass.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");
const dir = ".local/e2e-spec37-i5";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      // El origen permitido sigue siendo 127.0.0.1:5173 por defecto; APP_ORIGIN
      // permite verificar en local con el puerto del front ocupado por otra sesión.
      createApp(db, { key, origin: process.env.APP_ORIGIN }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3029 })),
    ),
  ),
);