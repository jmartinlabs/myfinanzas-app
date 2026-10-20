import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const fixtures = [
  { id: 'demo-001', nombre: 'Cuenta cotidiana ficticia' },
  { id: 'demo-002', nombre: 'Reserva ficticia' },
  { id: 'demo-003', nombre: 'Cuenta de proyectos ficticia' },
];
export function openDatabase(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.exec('CREATE TABLE IF NOT EXISTS demo_saldos (id TEXT PRIMARY KEY, nombre TEXT NOT NULL)');
  db.transaction(() => {
    const insert = db.prepare('INSERT OR IGNORE INTO demo_saldos (id, nombre) VALUES (?, ?)');
    for (const row of fixtures) insert.run(row.id, row.nombre);
  })();
  return db;
}
export function listSaldos(db: Database) {
  return db.query('SELECT id, nombre FROM demo_saldos ORDER BY id').all() as { id: string; nombre: string }[];
}
