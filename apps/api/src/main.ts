import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Effect, Layer } from "effect";
import { resolve } from "node:path";
import { openDatabase } from "./database";
import { createApp } from "./app";
import { loadKey } from "./auth";
import { apiBindHost } from "./server-config";
import { assertDemoDatabase, demoScope } from "./demo-mode";
// `demoScope` lanza si la configuración DEMO es incoherente (entorno, rutas,
// orígenes o bind) antes de abrir SQLite, crear archivos o publicar red.
const demo = demoScope();
const hostname = demo?.bindHost ?? apiBindHost();
const databasePath =
  demo?.database ??
  process.env.DATABASE_PATH ??
  resolve(import.meta.dir, "../../../.local/demo.sqlite");
const keyPath =
  demo?.key ??
  process.env.AUTH_KEY_PATH ??
  resolve(import.meta.dir, "../../../.local/auth.key");
const program = Effect.acquireRelease(
  Effect.sync(() => {
    const db = openDatabase(databasePath);
    if (demo) assertDemoDatabase(db, demo);
    return db;
  }),
  (db) => Effect.sync(() => db.close()),
).pipe(
  Effect.flatMap((db) =>
    Layer.launch(
      HttpServer.serve(
        createApp(db, {
          key: loadKey(db, keyPath),
          origin:
            demo?.origins[0] ??
            process.env.APP_ORIGIN ??
            "http://127.0.0.1:5173",
          ...(demo ? { demo } : {}),
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
