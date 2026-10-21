import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Effect, Layer } from "effect";
import { resolve } from "node:path";
import { openDatabase } from "./database";
import { createApp } from "./app";
import { loadKey } from "./auth";
import { apiBindHost } from "./server-config";
const hostname = apiBindHost();
const databasePath =
  process.env.DATABASE_PATH ??
  resolve(import.meta.dir, "../../../.local/demo.sqlite");
const keyPath =
  process.env.AUTH_KEY_PATH ??
  resolve(import.meta.dir, "../../../.local/auth.key");
const program = Effect.acquireRelease(
  Effect.sync(() => openDatabase(databasePath)),
  (db) => Effect.sync(() => db.close()),
).pipe(
  Effect.flatMap((db) =>
    Layer.launch(
      HttpServer.serve(
        createApp(db, {
          key: loadKey(db, keyPath),
          origin: process.env.APP_ORIGIN ?? "http://127.0.0.1:5173",
        }),
      ).pipe(
        Layer.provide(
          BunHttpServer.layer({ hostname, port: 3001 }),
        ),
      ),
    ),
  ),
  Effect.scoped,
);
BunRuntime.runMain(program);
