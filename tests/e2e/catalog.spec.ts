import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test('SQLite → Effect HTTP → React y revisión responsive', async ({ page, request }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await request.get('/api/saldos');
  expect(response.status()).toBe(200);
  const { saldos } = await response.json();
  expect(saldos).toHaveLength(3);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tu catálogo de Saldos' })).toBeVisible();
  for (const saldo of saldos) await expect(page.getByRole('heading', { name: saldo.nombre, exact: true })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  mkdirSync('artifacts/bootstrap', { recursive: true });
  await page.screenshot({ path: `artifacts/bootstrap/catalog-${info.project.name}.png`, fullPage: true });
});
test('carga, vacío, error y reintento', async ({ page }) => {
  let resolveResponse!: () => void;
  const ready = new Promise<void>((resolve) => { resolveResponse = resolve; });
  await page.route('**/api/saldos', async (route) => {
    await ready;
    await route.fulfill({ json: { saldos: [] } });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Cargando catálogo…');
  resolveResponse();
  await expect(page.getByRole('status')).toHaveText('Todavía no hay Saldos de demostración.');
  await page.unroute('**/api/saldos');
  await page.route('**/api/saldos', (route) => route.fulfill({ status: 500, json: { error: 'Error ficticio' } }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar');
  await page.unroute('**/api/saldos');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(3);
});
