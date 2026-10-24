import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { cyclePlanJourney } from "./planes-ciclo";
test("E2.3 plan del ciclo: MFA real, importes nullable, ejecución, copia y conflictos responsive", async ({
  page,
  request,
}) => {
  const child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/planes-server.ts"],
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
              await request.get("http://127.0.0.1:3005/api/health")
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
      url.port = "3005";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/planes-ciclo");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-planes/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Contraseña ficticia plan " + randomUUID());
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
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
    for (const inicio of ["2020-10-01", "2020-11-01"]) {
      const c = await get("/ciclos/contexto");
      expect(
        (
          await post("/ciclos", {
            inicio,
            saldoInicialComida: "0",
            contextRevision: c.revision,
          })
        ).status,
      ).toBe(201);
    }
    const bank = (
      await post("/saldos", {
        nombre: "Banco plan ficticio",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "500",
        permiteSalidaExterior: true,
      })
    ).data.saldo;
    const budget = (
      await post("/presupuestos", {
        nombre: "Plan gasto ficticio",
        fuente: "Gasto real",
        destino: bank.id,
      })
    ).data.item;
    await post("/presupuestos", {
      nombre: "Plan no comparable ficticio",
      fuente: "No aplica",
      destino: null,
    });
    const cat = (
      await post("/clasificacion/categorias", {
        nombre: "Plan categoría ficticia",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: false,
      })
    ).data.item;
    const sub = (
      await post("/clasificacion/subcategorias", {
        nombre: "Plan sub ficticia",
        padre: cat.id,
      })
    ).data.item;
    const part = (
      await post("/clasificacion/partidas", {
        nombre: "Plan partida ficticia",
        padre: sub.id,
        presupuesto: budget.id,
      })
    ).data.item;
    const fact = {
      tipo: "Gasto",
      fecha: "2020-10-10",
      saldo: bank.id,
      partida: part.id,
      importe: "25",
      concepto: "Ejecución ficticia plan",
    };
    const preview = await post("/movimientos/impacto", fact);
    expect(preview.status).toBe(200);
    expect(
      (
        await post("/movimientos", {
          ...fact,
          fingerprint: preview.data.fingerprint,
        })
      ).status,
    ).toBe(201);
    await cyclePlanJourney(page, budget.id);
    expect(errors).toEqual([]);
  } finally {
    child.kill("SIGTERM");
    await page.unroute("**/api/**");
  }
});
