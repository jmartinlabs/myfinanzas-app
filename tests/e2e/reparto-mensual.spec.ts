import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * SPEC36 · incremento 2 — reparto mensual asistido.
 *
 * Escenario real con servidor API aislado, MFA real y SQLite; depende del
 * mecanismo de Transferencia pendiente de #391 y de la API de reparto.
 */
test(
  "reparto mensual: propuesta, borrador, generación y pendientes separados de Movimientos",
  async ({ page, request }) => {
    const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/reparto-server.ts"],
      { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await expect
        .poll(
          async () => {
            try {
              return (
                await request.get("http://127.0.0.1:3048/api/health")
              ).status();
            } catch {
              return 0;
            }
          },
          { timeout: 15000 },
        )
        .toBe(200);
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        url.port = "3048";
        await route.fulfill({
          response: await route.fetch({ url: url.toString() }),
        });
      });
      await page.goto("/planes-ciclo");
      await page
        .getByLabel("Código de activación")
        .fill(readFileSync(".local/e2e-reparto/bootstrap.txt", "utf8"));
      await page
        .getByLabel("Contraseña", { exact: true })
        .fill("Contraseña ficticia reparto " + randomUUID());
      await page
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await expect(page.locator(".secret")).toBeVisible();
      const secret = (await page.locator(".secret").textContent())!;
      await page
        .getByLabel("Código de la aplicación autenticadora")
        .fill(totp(secret).generate());
      await page
        .getByRole("button", { name: "Verificar código", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "He guardado los códigos · Continuar",
          exact: true,
        })
        .click();
      const get = (path: string) =>
        page.evaluate(async (path) => (await fetch("/api" + path)).json(), path);
      const post = (path: string, body: Record<string, unknown>) =>
        page.evaluate(
          async ({ path, body }) => {
            const session = await (await fetch("/api/auth/session")).json();
            const r = await fetch("/api" + path, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-csrf-token": session.csrf,
                "idempotency-key": crypto.randomUUID(),
              },
              body: JSON.stringify(body),
            });
            return { status: r.status, data: await r.json() };
          },
          { path, body },
        );
      const context = await get("/ciclos/contexto");
      const cycle = await post("/ciclos", {
        inicio: "2026-11-01",
        saldoInicialComida: "0",
        contextRevision: context.revision,
      });
      expect(cycle.status).toBe(201);
      // Un segundo Ciclo cierra temporalmente el primero y hace verificable su periodo.
      const context2 = await get("/ciclos/contexto");
      const second = await post("/ciclos", {
        inicio: "2026-12-01",
        saldoInicialComida: "0",
        contextRevision: context2.revision,
      });
      expect(second.status).toBe(201);
      const origin = (
        await post("/saldos", {
          nombre: "Cuenta ficticia origen",
          tipo: "Efectivo",
          control: "Movimientos",
          saldoApertura: "1000",
          permiteSalidaExterior: false,
        })
      ).data.saldo;
      const destination = (
        await post("/saldos", {
          nombre: "Fondo ficticio destino",
          tipo: "Efectivo",
          control: "Movimientos",
          saldoApertura: "0",
          permiteSalidaExterior: false,
        })
      ).data.saldo;
      const aportacion = (
        await post("/presupuestos", {
          nombre: "Provisión ficticia",
          fuente: "Aportación a saldo",
          destino: destination.id,
        })
      ).data.item;
      await post("/presupuestos", {
        nombre: "Gasto ficticio",
        fuente: "Gasto real",
        destino: destination.id,
      });
      await post("/presupuestos", {
        nombre: "Reserva ficticia",
        fuente: "No aplica",
        destino: null,
      });
      const plan = await get("/planes-ciclo/" + cycle.data.ciclo.id);
      const preview = await post(
        `/planes-ciclo/${cycle.data.ciclo.id}/impacto`,
        {
          revision: plan.revision,
          contextRevision: plan.contextRevision,
          cambios: [{ presupuesto: aportacion.id, delMes: "100" }],
        },
      );
      expect(preview.status).toBe(200);
      expect(
        (
          await post(`/planes-ciclo/${cycle.data.ciclo.id}/confirmar`, {
            propuesta: {
              revision: plan.revision,
              contextRevision: plan.contextRevision,
              cambios: [{ presupuesto: aportacion.id, delMes: "100" }],
            },
            fingerprint: preview.data.fingerprint,
            motivo: "",
          })
        ).status,
      ).toBe(200);

      // La lista de Ciclos se cargó antes de crear el Ciclo sintético.
      await page.goto("/planes-ciclo");
      await page
        .getByLabel("Ciclo del plan", { exact: true })
        .selectOption(cycle.data.ciclo.id);
      await page
        .getByRole("button", {
          name: "Preparar reparto del ciclo",
          exact: true,
        })
        .click();
      const propuesta = page.getByRole("region", {
        name: "Tabla de propuesta de reparto",
      });
      await expect(page.getByText("Propuesta E2.3", { exact: false })).toBeVisible();
      await expect(propuesta.getByText("Mantener en origen", { exact: true })).toBeVisible();
      await expect(propuesta.getByText("Sin propuesta", { exact: true })).toBeVisible();
      await page
        .getByLabel("Origen común", { exact: true })
        .selectOption(origin.id);
      await page
        .getByRole("button", {
          name: "Preparar reparto del ciclo",
          exact: true,
        })
        .click();
      await expect(page.getByText("Generar 1 pendiente", { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: "Generar 1 pendiente", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Seguimiento del reparto" }),
      ).toBeVisible();
      await expect(page.getByText("Cancelar pendiente", { exact: true })).toBeVisible();
      expect(await page.getByText("Ejecutar", { exact: true }).count()).toBe(0);

      await page.goto("/movimientos");
      await expect(
        page.getByRole("region", { name: "Pendientes de confirmar" }),
      ).toBeVisible();
      await page
        .getByRole("checkbox", {
          name: "Pendientes de confirmar",
          exact: true,
        })
        .check();
      await expect(
        page.getByText("No suman en totales, balances ni ejecución", {
          exact: true,
        }),
      ).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      child.kill("SIGTERM");
      await page.unroute("**/api/**");
    }
  },
);
