import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
test("E2.6 real MFA/read model, coverage, sources, async selection, errors and responsive review", async ({
  page,
  request,
}) => {
  const child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/monthly-server.ts"],
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
              await request.get("http://127.0.0.1:3008/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect(
      (await request.get("http://127.0.0.1:3008/api/flujo-mensual/1")).status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3008";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/flujo-mensual?ciclo=1");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-monthly/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Clave ficticia mensual " + randomUUID());
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
    await expect(
      page.getByRole("heading", { name: "Flujo mensual base", exact: true }),
    ).toBeVisible();
    const select = page.getByLabel("Ciclo financiado", { exact: true });
    await expect(select).toHaveValue("1");
    const income = page.getByRole("article", {
      name: "Total ingresos",
      exact: true,
    });
    await expect(income).toContainText("2.250,00 €");
    await expect(income).toContainText("Parcial");
    await expect(income).toContainText("No disponible");
    const expense = page.getByRole("article", {
      name: "Gasto bruto registrado",
      exact: true,
    });
    await expect(expense).toContainText("1.800,00 €");
    const margin = page.getByRole("article", {
      name: "Margen estructural",
      exact: true,
    });
    await expect(margin).toContainText("150,00 €");
    await expect(margin).toContainText("Parcial");
    await expect(
      page.getByRole("article", {
        name: "Margen frente a nómina real",
        exact: true,
      }),
    ).toContainText("No disponible");
    await expect(
      page.getByRole("article", {
        name: "Liquidez al corte del ciclo",
        exact: true,
      }),
    ).toContainText("No disponible");
    await page
      .getByText("Ver meses incluidos, ausentes/incompletos y fuentes", {
        exact: true,
      })
      .click();
    await expect(page.locator(".flow-month")).toHaveCount(12);
    await expect(page.locator(".flow-month").last()).toContainText(
      "1.500,00 €",
    );
    await page
      .getByText("Ver meses incluidos, ausentes/incompletos y fuentes", {
        exact: true,
      })
      .click();
    // Leave/read source and browser-back: selection is in the existing URL query only.
    await page
      .getByRole("link", {
        name: "Consultar referencias salariales",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Nómina", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(select).toHaveValue("1");
    await expect(margin).toContainText("150,00 €");
    let held!: () => void, release!: () => void;
    const started = new Promise<void>((r) => (held = r)),
      gate = new Promise<void>((r) => (release = r));
    await page.route(
      "**/api/flujo-mensual/2",
      async (route) => {
        const response = await route.fetch({
          url: "http://127.0.0.1:3008/api/flujo-mensual/2",
        });
        held();
        await gate;
        await route.fulfill({ response });
      },
      { times: 1 },
    );
    await select.selectOption("2");
    await started;
    await expect(
      page.getByRole("status").filter({ hasText: "Cargando fuentes" }),
    ).toBeVisible();
    await select.selectOption("3");
    await expect(
      page.getByRole("heading", { name: /Ciclo 3 ·/ }),
    ).toBeVisible();
    release();
    await expect(page.getByRole("heading", { name: /Ciclo 2 ·/ })).toHaveCount(
      0,
    );
    await expect(select).toHaveValue("3");
    await expect(income).not.toContainText("2.250,00 €");
    await page.route(
      "**/api/flujo-mensual/3",
      (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Error de prueba controlado" }),
        }),
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Actualizar fuentes", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Error de prueba controlado",
    );
    await expect(select).toHaveValue("3");
    await expect(
      page.getByRole("group", { name: "Error de consulta", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Ciclo 3 ·/ }),
    ).toBeVisible();
    await select.selectOption("1");
    await expect(margin).toContainText("150,00 €");
    mkdirSync("artifacts/e2-6", { recursive: true });
    const contrast = await page.evaluate(() => {
      function rgb(v: string) {
        return v
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((x) => {
            const s = x / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
      }
      function luminance(v: string) {
        const [r, g, b] = rgb(v);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      return Array.from(
        document.querySelectorAll(
          ".flow-indicator h3,.flow-indicator .muted,.flow-indicator .tag",
        ),
      ).map((el) => {
        const s = getComputedStyle(el);
        let p: Element | null = el;
        let bg = "";
        while (p) {
          bg = getComputedStyle(p).backgroundColor;
          if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") break;
          p = p.parentElement;
        }
        const a = luminance(s.color),
          b = luminance(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
    });
    console.info(
      "E2.6 contraste mínimo de texto: " +
        Math.min(...contrast).toFixed(2) +
        ":1",
    );
    expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await expect(
        page.getByRole("article", { name: "Liquidez actual", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(async () => {
        window.scrollTo(0, 0);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      await page.screenshot({ path: `artifacts/e2-6/flujo-${width}.png` });
      for (const section of ["flow-plan", "flow-current", "flow-coverage"]) {
        await page
          .locator(
            section === "flow-coverage"
              ? "#flow-coverage"
              : `section[aria-labelledby="${section}"]`,
          )
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/e2-6/${section}-${width}.png`,
        });
      }
    }
    await select.focus();
    await expect(select).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Actualizar fuentes", exact: true }),
    ).toBeFocused();
    // Auth failure keeps selection and clears the prior financial response.
    await page.route(
      "**/api/flujo-mensual/1",
      (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Sesión expirada de prueba" }),
        }),
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Actualizar fuentes", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Sesión expirada de prueba" }),
    ).toBeVisible();
    await expect(select).toHaveValue("1");
    await expect(margin).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Volver a iniciar sesión",
        exact: true,
      }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null) resolve();
      else child.once("exit", () => resolve());
    });
  }
});
