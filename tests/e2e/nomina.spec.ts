import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
test("E2.5 payroll: real MFA, documents, allocation, forecast and responsive review", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/payroll-server.ts"],
      { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
    ),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get("http://127.0.0.1:3007/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect(
      (await request.get("http://127.0.0.1:3007/api/nomina")).status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3007";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/nomina");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-payroll/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Contraseña ficticia anual " + randomUUID());
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
    await page.getByRole("link", { name: "Nómina", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Nómina", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Añadir paga documentada" }).click();
    await page.getByLabel("Mes salarial", { exact: true }).fill("2026-06");
    await page.getByLabel("Guardia", { exact: true }).selectOption("No");
    for (const [label, value] of [
      ["Devengo €", "1200"],
      ["Base IRPF €", "1200"],
      ["IRPF %", "10"],
      ["Variable histórica €", "0"],
      ["Neto histórico €", "1000"],
      ["Neto documentado €", "1000"],
      ["Evidencia salarial", "fixture-salario"],
      ["Evidencia de Neto documentado", "fixture-doc"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel("Originales salariales verificados").check();
    await page
      .getByLabel("Neto documentado verificado", { exact: true })
      .check();
    await page
      .getByLabel("Motivo de la revisión")
      .fill("Alta documental ficticia");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar revisión de Nómina" })
      .click();
    await expect(page.locator(".payroll-card")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Cobros/asociaciones", exact: true })
      .click();
    await page.getByLabel("Movimiento", { exact: true }).selectOption("101");
    await page.getByRole("button", { name: "Añadir asignación" }).click();
    const paga = await page
      .getByLabel("Paga del reparto 1")
      .locator("option")
      .nth(1)
      .getAttribute("value");
    await page.getByLabel("Paga del reparto 1").selectOption(paga!);
    await page.getByLabel("Importe asignado € 1").fill("-1");
    await page.getByLabel("Evidencia del reparto 1").fill("Desglose fixture");
    await page
      .getByLabel("Motivo de la revisión")
      .fill("Revisión importe inválido");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("positiva");
    await expect(page.getByLabel("Importe asignado € 1")).toHaveValue("-1");
    await page.getByLabel("Importe asignado € 1").fill("1000");
    await page.getByLabel("Evidencia del reparto 1").fill("Desglose fixture");
    await page.getByLabel("Motivo de la revisión").fill("Asociación explícita");
    let releaseReview!: () => void, heldReview!: () => void;
    const held = new Promise<void>((r) => {
        heldReview = r;
      }),
      release = new Promise<void>((r) => {
        releaseReview = r;
      });
    await page.route("**/api/nomina/impacto", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3007";
      const response = await route.fetch({ url: url.toString() });
      heldReview();
      await release;
      await route.fulfill({ response });
    });
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await held;
    await page.getByLabel("Importe asignado € 1").fill("900");
    releaseReview();
    await expect(
      page.getByRole("button", { name: "Revisar impacto", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Confirmar revisión de Nómina" }),
    ).toHaveCount(0);
    await page.unroute("**/api/nomina/impacto");
    await page.getByLabel("Importe asignado € 1").fill("1000");

    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(page.getByLabel("Confirmación de Nómina")).toContainText(
      "500,00",
    );
    await page.evaluate(async () => {
      const session = await (await fetch("/api/auth/session")).json();
      const data = await (await fetch("/api/nomina")).json(),
        p = data.pagas[0];
      const fields = [
        "mes",
        "tipo",
        "guardia",
        "devengo",
        "base",
        "irpf",
        "variable",
        "historico",
        "documentado",
        "evidencia",
        "evidenciaDocumentado",
        "verificado",
        "documentadoVerificado",
        "nota",
      ];
      const paga = Object.fromEntries(fields.map((k) => [k, p[k]]));
      paga.nota = "Revisión concurrente ficticia";
      const response = await fetch("/api/nomina/confirmar", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrf,
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          accion: "guardar",
          id: p.id,
          paga,
          contexto: data.contexto,
          motivo: "Contexto concurrente",
        }),
      });
      if (!response.ok) throw Error("Concurrent fixture update failed");
    });
    await page
      .getByRole("button", { name: "Confirmar revisión de Nómina" })
      .click();
    await expect(page.getByRole("alert")).toContainText("contexto cambió");
    await expect(page.getByLabel("Importe asignado € 1")).toHaveValue("1000");
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar revisión de Nómina" })
      .click();
    await page.getByRole("button", { name: "Histórico", exact: true }).click();
    await expect(page.locator(".payroll-table")).toContainText("2026-07-05");
    await expect(
      page.getByRole("button", { name: "Histórico", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", { name: "Cobros bancarios y reparto global" }),
    ).toHaveCount(0);

    const ratios = await page
      .locator(".payroll-table th, .payroll-table button, button.primary")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const lum = (color: string) => {
            const c = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((v) => v / 255)
              .map((v) =>
                v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
              );
            return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
          };
          let parent: Element | null = node,
            bg = "rgb(255,255,255)";
          while (parent) {
            const c = getComputedStyle(parent).backgroundColor;
            if (c !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(c)) {
              bg = c;
              break;
            }
            parent = parent.parentElement;
          }
          const a = lum(getComputedStyle(node).color),
            b = lum(bg);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        }),
      );
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
    console.log(
      "Payroll computed header/action contrast minimum:",
      Math.min(...ratios).toFixed(2),
    );
    mkdirSync("artifacts/e2-5", { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({
        path: `artifacts/e2-5/nomina-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "Pronóstico", exact: true }).click();
    await page.getByLabel("Mes/corte consultado").fill("2026-06");
    await page.getByRole("button", { name: "Calcular pronóstico" }).click();
    await expect(
      page.getByText("Diferencia prudente − estimado:"),
    ).toContainText("−");
    await expect(page.getByText(/IRPF 10.27%/)).toBeVisible();
    await expect(page.getByText(/Corte 2026-06/)).toBeVisible();
    await page.getByLabel("Variable prevista €", { exact: true }).fill("10");
    await expect(page.getByText(/Corte 2026-06/)).toHaveCount(0);
    let releaseForecast!: () => void, heldForecast!: () => void;
    const forecastHeld = new Promise<void>((r) => {
        heldForecast = r;
      }),
      forecastRelease = new Promise<void>((r) => {
        releaseForecast = r;
      });
    await page.route("**/api/nomina/pronostico", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3007";
      const response = await route.fetch({ url: url.toString() });
      heldForecast();
      await forecastRelease;
      await route.fulfill({ response });
    });
    await page.getByRole("button", { name: "Calcular pronóstico" }).click();
    await forecastHeld;
    await page.getByLabel("Variable prevista €", { exact: true }).fill("20");
    releaseForecast();
    await expect(
      page.getByRole("button", { name: "Calcular pronóstico" }),
    ).toBeEnabled();
    await expect(page.getByText(/Corte 2026-06/)).toHaveCount(0);
    await page.unroute("**/api/nomina/pronostico");

    // Correct the actual banking fact through the existing UI, preserving salary originals.
    await page.goto("/movimientos/101/rectificar");
    await expect(
      page.getByRole("heading", { name: "Rectificar movimiento", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Importe (€) *", { exact: true }).fill("500");
    await page
      .getByLabel("Motivo *", { exact: true })
      .fill("Corrección bancaria ficticia con impacto salarial");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByText(/Este hecho tiene asignaciones salariales:/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Confirmar rectificación", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Rectificar", exact: true }),
    ).toBeVisible();
    await page.goto("/nomina");
    await expect(page.locator(".payroll-card")).toContainText(
      "Asociaciones pendientes de revisar",
    );
    const corrected = await page.evaluate(async () =>
      (await fetch("/api/nomina")).json(),
    );
    expect(corrected.pagas[0].historico).toBe("1000");
    expect(corrected.pagas[0].documentado).toBe("1000");
    expect(corrected.pagas[0].cobrado).toBe("0.00");
    expect(corrected.pagas[0].diferencia).toBeNull();
    expect(corrected.pagas[0].asignaciones[0].valida).toBe(false);
    expect(corrected.movimientos).toHaveLength(1);
    expect(corrected.movimientos[0].importe).toBe("500.00");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
