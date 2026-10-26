import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
test("E2.4 annual plan: real MFA, exact nullable manual lines, review/conflict/error and responsive coverage", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/annual-server.ts"],
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
              await request.get("http://127.0.0.1:3006/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect(
      (await request.get("http://127.0.0.1:3006/api/plan-anual/2026")).status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3006";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/plan-anual");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-annual/bootstrap.txt", "utf8"));
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
    await page.getByRole("link", { name: "Plan anual", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Plan anual", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Incompleto", { exact: true })).toBeVisible();
    await expect(page.getByText(/Parcial conocido: 100,00/)).toBeVisible();
    await expect(
      page.getByText(/Importes esenciales sin informar: 1/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Detalle Seguro ficticio", exact: true })
      .first()
      .click();
    await expect(page.getByLabel("Detalle anual")).toContainText(
      "Subtotal registrado: 300,00 €",
    );
    await expect(page.getByLabel("Detalle anual")).toContainText("2026-06-15");
    await page.getByRole("button", { name: "Cerrar detalle" }).click();
    await page
      .getByRole("button", { name: /Consultar ejecución registrada sin línea/ })
      .click();
    await expect(
      page.getByText("Hechos conocidos sin objetivo ni línea inventados."),
    ).toBeVisible();
    mkdirSync("artifacts/e2-4", { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width === 1440) {
        const widths = await page
          .locator(".annual-table th")
          .evaluateAll((nodes) =>
            nodes.map((n) => n.getBoundingClientRect().width),
          );
        expect(widths).toHaveLength(8);
        expect(Math.min(...widths)).toBeGreaterThanOrEqual(64);
        expect(
          await page
            .locator(".annual-table tbody tr")
            .first()
            .locator("td")
            .nth(6)
            .evaluate((node) => {
              const range = document.createRange();
              range.selectNodeContents(node);
              return range.getClientRects().length;
            }),
        ).toBe(1);
        const ratios = await page
          .locator(".annual-table th, .annual-table button")
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
          "Annual computed header/action contrast minimum:",
          Math.min(...ratios).toFixed(2),
        );
      }
      await page.screenshot({
        path: `artifacts/e2-4/plan-anual-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: "Editar Reserva ficticia", exact: true })
      .first()
      .click();
    await expect(page.getByLabel("Presupuesto (€)")).toHaveValue("");
    await page.getByLabel("Presupuesto (€)").fill("0");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(page.locator(".annual-editor > section")).toBeFocused();
    await expect(page.getByLabel("Cambios de derivados")).toContainText(
      "Diferencia",
    );
    await expect(
      page.getByLabel("Cambios del equivalente esencial"),
    ).toContainText("120000 céntimos / 12");
    await expect(page.getByLabel("Relaciones afectadas")).toContainText(
      "Ciclo 2: 2026-01-01",
    );
    await expect(page.getByLabel("Relaciones afectadas")).not.toContainText(
      "Ciclo 1:",
    );
    await page
      .getByRole("button", { name: "Confirmar plan anual", exact: true })
      .click();
    await expect(page.getByText("Plan anual guardado.")).toBeVisible();
    await expect(
      page.getByLabel("Equivalente esencial mensual anual").locator("strong"),
    ).toHaveText("Completo: 100,00 €/mes");
    // Past exercise requires explicit classification, review, reason and confirmation.
    await page.getByLabel("Ejercicio del plan anual").selectOption("2025");
    await expect(
      page.getByRole("heading", { name: "Sin plan anual", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Añadir Partida al plan anual")
      .selectOption("PAR900");
    await page.getByLabel("Presupuesto (€)").fill("120");
    await page
      .getByLabel("Periodo previsto", { exact: true })
      .fill("Mayo - Octubre");
    await page
      .getByRole("combobox", { name: "Esencial", exact: true })
      .selectOption("Pendiente");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Confirmar plan anual" }),
    ).toBeDisabled();
    await page
      .getByLabel("Motivo obligatorio")
      .fill("Revisión ficticia del ejercicio anterior");
    await page.getByRole("button", { name: "Confirmar plan anual" }).click();
    await expect(page.getByText("Plan anual guardado.")).toBeVisible();
    await page
      .getByRole("button", { name: "Editar Seguro ficticio", exact: true })
      .first()
      .click();
    await page.getByLabel("Presupuesto (€)").fill("321");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    // Another genuine write invalidates the reviewed context, without discarding the UI draft.
    await page.evaluate(async () => {
      const session = await (await fetch("/api/auth/session")).json(),
        p = await (await fetch("/api/plan-anual/2025")).json();
      const proposal = {
        partida: "PAR900",
        revision: p.items[0].linea.revision,
        contextRevision: p.contextRevision,
        cambios: { periodo: "Cambio concurrente" },
      };
      const headers = {
        "content-type": "application/json",
        "x-csrf-token": session.csrf,
        "idempotency-key": crypto.randomUUID(),
      };
      const preview = await (
        await fetch("/api/plan-anual/2025/impacto", {
          method: "POST",
          headers,
          body: JSON.stringify(proposal),
        })
      ).json();
      await fetch("/api/plan-anual/2025/confirmar", {
        method: "POST",
        headers,
        body: JSON.stringify({
          propuesta: proposal,
          fingerprint: preview.fingerprint,
          motivo: "Ensayo concurrente",
        }),
      });
    });
    await page.getByLabel("Motivo obligatorio").fill("Borrador conservado");
    await page.getByRole("button", { name: "Confirmar plan anual" }).click();
    await expect(page.getByRole("alert")).toContainText("contexto");
    await page.getByRole("button", { name: "Volver al borrador" }).click();
    await expect(page.getByLabel("Presupuesto (€)")).toHaveValue("321");
    await page
      .getByRole("button", { name: "Actualizar contexto", exact: true })
      .click();
    await expect(page.getByLabel("Presupuesto (€)")).toHaveValue("321");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar plan anual" }).click();
    await expect(page.getByText("Plan anual guardado.")).toBeVisible();
    await page.getByLabel("Ejercicio del plan anual").selectOption("2027");
    await expect(
      page.getByRole("heading", { name: "Sin plan anual", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Inicio de control no verificado/),
    ).toBeVisible();
    // Request failure/retry preserves the selected year; a delayed old response cannot replace it.
    let fail = true;
    await page.route("**/api/plan-anual/2027", async (route) => {
      if (fail) {
        fail = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Error anual ficticio" }),
        });
      } else {
        const url = new URL(route.request().url());
        url.port = "3006";
        await route.fulfill({
          response: await route.fetch({ url: url.toString() }),
        });
      }
    });
    await page
      .getByRole("button", { name: "Actualizar contexto", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Error anual ficticio");
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByLabel("Ejercicio del plan anual")).toHaveValue(
      "2027",
    );
    await page.route("**/api/plan-anual/2024", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3006";
      const response = await route.fetch({ url: url.toString() });
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({ response });
    });
    await page.getByLabel("Ejercicio del plan anual").selectOption("2024");
    await page.getByLabel("Ejercicio del plan anual").selectOption("2026");
    await expect(
      page.getByLabel("Equivalente esencial mensual anual").locator("strong"),
    ).toHaveText("Completo: 100,00 €/mes");
    await expect(page.getByLabel("Ejercicio del plan anual")).toHaveValue(
      "2026",
    );
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
