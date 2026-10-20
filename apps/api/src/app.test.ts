import { test, expect } from 'bun:test';
import { HttpApp } from '@effect/platform';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import { fixtures, listSaldos, openDatabase } from './database';

test('SQLite conserva cambios al reabrir y la semilla no duplica registros', () => {
  const dir = mkdtempSync(join(tmpdir(), 'myfinanzas-'));
  try {
    const path = join(dir, 'test.sqlite');
    let db = openDatabase(path);
    expect(listSaldos(db)).toEqual(fixtures);
    db.run('UPDATE demo_saldos SET nombre = ? WHERE id = ?', ['Nombre ficticio actualizado', 'demo-001']);
    db.close(); db = openDatabase(path);
    try {
      expect(listSaldos(db)).toHaveLength(3);
      expect(listSaldos(db)[0].nombre).toBe('Nombre ficticio actualizado');
    } finally { db.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('Effect HTTP devuelve el catálogo real de SQLite y refleja sus cambios', async () => {
  const db = openDatabase(':memory:');
  try {
    db.run('INSERT INTO demo_saldos VALUES (?, ?)', ['demo-004', 'Prueba de integración ficticia']);
    const response = await HttpApp.toWebHandler(createApp(db))(new Request('http://localhost/api/saldos'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ saldos: [...fixtures, { id: 'demo-004', nombre: 'Prueba de integración ficticia' }] });
  } finally { db.close(); }
});
test('catálogo vacío válido y ruta inexistente 404', async () => {
  const db = openDatabase(':memory:');
  try {
    db.run('DELETE FROM demo_saldos');
    const handler = HttpApp.toWebHandler(createApp(db));
    expect(await (await handler(new Request('http://localhost/api/saldos'))).json()).toEqual({ saldos: [] });
    expect((await handler(new Request('http://localhost/api/missing'))).status).toBe(404);
  } finally { db.close(); }
});
test('fallo de SQLite devuelve 500 sin detalles internos', async () => {
  const db = openDatabase(':memory:'); db.close();
  const response = await HttpApp.toWebHandler(createApp(db))(new Request('http://localhost/api/saldos'));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: 'No se pudo leer el catálogo.' });
});
