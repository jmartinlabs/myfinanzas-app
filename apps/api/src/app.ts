import { HttpRouter, HttpServerResponse } from '@effect/platform';
import { Effect } from 'effect';
import type { Database } from 'bun:sqlite';
import { listSaldos } from './database';

export const createApp = (db: Database) => HttpRouter.empty.pipe(
  HttpRouter.get('/api/saldos', Effect.try(() => listSaldos(db)).pipe(
    Effect.flatMap((saldos) => HttpServerResponse.json({ saldos })),
    Effect.catchAll(() => HttpServerResponse.json({ error: 'No se pudo leer el catálogo.' }, { status: 500 })),
  )),
);
