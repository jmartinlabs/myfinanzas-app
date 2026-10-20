import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import { HttpServer } from '@effect/platform';
import { Effect, Layer } from 'effect';
import { resolve } from 'node:path';
import { openDatabase } from './database';
import { createApp } from './app';

const databasePath = process.env.DATABASE_PATH ?? resolve(import.meta.dir, '../../../.local/demo.sqlite');
const program = Effect.acquireRelease(
  Effect.sync(() => openDatabase(databasePath)),
  (db) => Effect.sync(() => db.close()),
).pipe(Effect.flatMap((db) => Layer.launch(
  HttpServer.serve(createApp(db)).pipe(
    Layer.provide(BunHttpServer.layer({ hostname: '127.0.0.1', port: 3001 })),
  ),
)), Effect.scoped);
BunRuntime.runMain(program);
