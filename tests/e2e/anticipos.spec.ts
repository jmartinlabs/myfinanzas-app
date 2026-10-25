import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
test("E3.1 real MFA, explicit roles, multi-pair return, historical accreditation and opening photographs390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/anticipo-server.ts"],
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
      (
        await request.get("http://127.0.0.1:3008/api/anticipos/fichas")
      ).status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3008";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/anticipos");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-anticipos/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Contraseña ficticia anticipo " + randomUUID());
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
    const nav = (p: string) => page.goto(p);
    const write = (path: string, body: any) =>
      page.evaluate(
        async ({ path, body }) => {
          const s = await (await fetch("/api/auth/session")).json(),
            r = await fetch("/api" + path, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-csrf-token": s.csrf,
                "idempotency-key": crypto.randomUUID(),
              },
              body: JSON.stringify(body),
            });
          return { status: r.status, data: await r.json() };
        },
        { path, body },
      );
    const get = (path: string) =>
      page.evaluate(async (path) => (await fetch("/api" + path)).json(), path);
    mkdirSync("artifacts/e3-1", { recursive: true });
    const shots = async (name: string) => {
      for (const [width, height] of [
        [1440, 1000],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => scrollTo(0, 0));
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await page.evaluate(
          () =>
            new Promise<void>((r) =>
              requestAnimationFrame(() => requestAnimationFrame(() => r())),
            ),
        );
        await page.screenshot({
          animations: "disabled",
          path: `artifacts/e3-1/${name}-${width}.png`,
          fullPage: true,
        });
      }
    };
    await nav("/anticipos");
    await page
      .getByRole("link", {
        name: "REF001 · Histórico ficticio pendiente",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("No disponible: sin par acreditado verificable.", {
        exact: false,
      }),
    ).toBeVisible();
    await shots("historical-unattributed");
    await page
      .getByRole("button", { name: "Acreditar Movimiento 101", exact: true })
      .click();
    await page
      .getByLabel("Rol acreditado", { exact: true })
      .selectOption("Adelanto");
    await page
      .getByLabel("Evidencia identificable", { exact: true })
      .fill("Documento ficticio de adelanto");
    await page
      .getByLabel("Fuente / procedencia", { exact: true })
      .fill("Archivo histórico ficticio");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Revisar y confirmar", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Confirmar acreditación", exact: true })
      .click();
    await expect(
      page.getByText("Subtotales acreditados, parciales.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Acreditar Movimiento 102", exact: true })
      .click();
    await page
      .getByLabel("Rol acreditado", { exact: true })
      .selectOption("Devolución");
    await page
      .getByLabel("Par acreditado histórico", { exact: true })
      .selectOption("S001>S002");
    await page
      .getByLabel("Evidencia identificable", { exact: true })
      .fill("Documento ficticio de devolución");
    await page
      .getByLabel("Fuente / procedencia", { exact: true })
      .fill("Archivo histórico ficticio");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar acreditación", exact: true })
      .click();
    await expect(
      page.getByText("Recuperación parcial", { exact: false }).first(),
    ).toBeVisible();
    await nav("/anticipos/nuevo");
    await page
      .getByLabel("Nombre del Anticipo", { exact: true })
      .fill("Formación ficticia Laura");
    await page
      .getByLabel("Fecha apertura histórica (opcional)", { exact: true })
      .fill("2025-12-15");
    await page
      .getByLabel("Evidencia de apertura Manual", { exact: true })
      .fill("Apertura ficticia documentada");
    await shots("create");
    await page
      .getByRole("button", { name: "Crear ficha", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "REF002 · Formación ficticia Laura",
        exact: true,
      }),
    ).toBeVisible();
    await shots("empty-case");
    await nav("/movimientos/nuevo");
    await page
      .getByLabel("Tipo *", { exact: true })
      .selectOption("Transferencia");
    await page
      .getByLabel("Fecha económica *", { exact: true })
      .fill("2026-02-03");
    await page.getByLabel("Importe (€) *", { exact: true }).fill("1000");
    await page
      .getByLabel("Saldo origen *", { exact: true })
      .selectOption("S001");
    await page
      .getByLabel("Saldo destino *", { exact: true })
      .selectOption("S002");
    await page
      .getByLabel("Referencia opcional", { exact: true })
      .selectOption("REF002");
    await page
      .getByLabel("Rol Anticipo obligatorio", { exact: true })
      .selectOption("Adelanto");
    await page
      .getByLabel("Evidencia de atribución", { exact: true })
      .fill("Adelanto ficticio declarado");
    await page
      .getByLabel("Procedencia de atribución", { exact: true })
      .fill("Registro explícito");
    await page
      .getByRole("button", { name: "Revisar transferencia", exact: true })
      .click();
    await shots("advance-review");
    await page
      .getByRole("button", { name: "Confirmar transferencia", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /Transferencia #/ }),
    ).toBeVisible();
    const b = {
        tipo: "Transferencia",
        fecha: "2026-02-04",
        importe: "500",
        origen: "S001",
        destino: "S003",
        referencia: "REF002",
        anticipo: {
          rol: "Adelanto",
          origen: "S001",
          destino: "S003",
          evidencia: "segundo par ficticio",
          procedencia: "registro explícito",
        },
      },
      p = await write("/movimientos/impacto", b);
    expect(p.status).toBe(200);
    expect(
      (await write("/movimientos", { ...b, fingerprint: p.data.fingerprint }))
        .status,
    ).toBe(201);
    await nav("/anticipos/REF002");
    await expect(
      page.getByRole("button", { name: "Registrar devolución", exact: true }),
    ).toBeDisabled();
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(2);
    expect(await radios.nth(0).isChecked()).toBe(false);
    await radios.nth(1).focus();
    await page.keyboard.press("Space");
    await expect(radios.nth(1)).toBeChecked();
    await shots("pairs");
    await page
      .getByRole("button", { name: "Registrar devolución", exact: true })
      .click();
    await expect(
      page.getByLabel("Rol Anticipo obligatorio", { exact: true }),
    ).toHaveValue("Devolución");
    await expect(
      page.getByLabel("Saldo origen *", { exact: true }),
    ).toHaveValue("S003");
    await expect(
      page.getByLabel("Saldo destino *", { exact: true }),
    ).toHaveValue("S001");
    await expect(page.getByLabel("Importe (€) *", { exact: true })).toHaveValue(
      "500.00",
    );
    await page
      .getByLabel("Fecha económica *", { exact: true })
      .fill("2026-07-01");
    await page.getByLabel("Importe (€) *", { exact: true }).fill("600");
    await page
      .getByRole("button", { name: "Revisar transferencia", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("supera el pendiente");
    await shots("return-excess");
    await page
      .getByRole("button", { name: "Confirmar transferencia", exact: true })
      .click();
    await nav("/anticipos/REF002");
    await expect(page.locator(".anticipo-metrics")).toContainText("900,00");
    await page
      .getByRole("button", {
        name: "Confirmar Neto de apertura / solicitar corrección",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Ciclo de apertura", { exact: true })
      .selectOption("1");
    await page
      .getByLabel("Neto al instante de apertura EUR", { exact: true })
      .fill("1500");
    await page
      .getByLabel("Evidencia identificable", { exact: true })
      .fill("Estado ficticio al abrir 20/06");
    await page
      .getByLabel("Fuente / procedencia", { exact: true })
      .fill("Documento ficticio con cobertura");
    await page.getByRole("checkbox", { name: /La evidencia acredita/ }).check();
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Revisar y confirmar", exact: true }),
    ).toBeFocused();
    await shots("opening-review");
    await page
      .getByRole("button", { name: "Confirmar Neto de apertura", exact: true })
      .click();
    await expect(
      page.getByText("1.500,00 € · Confirmada", { exact: false }),
    ).toBeVisible();
    await shots("case-complete");
    const current = await get("/anticipos/fichas/REF002");
    expect(current.neto).toBe("900.00");
    expect(current.fotos[0].importe).toBe("1500.00");
    expect(current.operaciones).toHaveLength(3);
    // Actual computed text/background contrast on the primary action; no factors in captures.
    const colors = await page
      .locator("button.primary")
      .first()
      .evaluate((node) => {
        const s = getComputedStyle(node);
        return { fg: s.color, bg: s.backgroundColor };
      });
    const lum = (c: string) => {
      const v = c
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((x) => {
          const n = x / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    expect(
      (Math.max(lum(colors.fg), lum(colors.bg)) + 0.05) /
        (Math.min(lum(colors.fg), lum(colors.bg)) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
    await nav("/anticipos/REF001");
    await expect(page.getByRole("radio")).toBeChecked();
    await page
      .getByRole("button", { name: "Registrar devolución", exact: true })
      .click();
    await expect(
      page.getByLabel("Rol Anticipo obligatorio", { exact: true }),
    ).toHaveValue("Devolución");
    await expect(
      page.getByLabel("Saldo origen *", { exact: true }),
    ).toHaveValue("S002");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await nav("/anticipos/REF002");
    const open = async (ciclo: string, value: string) => {
      await page
        .getByRole("button", {
          name: "Confirmar Neto de apertura / solicitar corrección",
          exact: true,
        })
        .click();
      await page
        .getByLabel("Ciclo de apertura", { exact: true })
        .selectOption(ciclo);
      await page
        .getByLabel("Neto al instante de apertura EUR", { exact: true })
        .fill(value);
      await page
        .getByLabel("Evidencia identificable", { exact: true })
        .fill("Revisión ficticia del instante histórico");
      await page
        .getByLabel("Fuente / procedencia", { exact: true })
        .fill("Documento ficticio acreditado");
      await page
        .getByRole("checkbox", { name: /La evidencia acredita/ })
        .check();
    };
    await open("1", "1499");
    await page
      .getByLabel("Motivo de corrección excepcional", { exact: true })
      .fill("Corrección documental ficticia");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Confirmar Neto de apertura",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByText(
        "Corrección bloqueada: protección de cierres/fotos no verificable en esta entrega",
        { exact: true },
      ),
    ).toBeVisible();
    await shots("correction-protected");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await open("2", "900");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    expect(
      (
        await write("/anticipos/fichas", {
          nombre: "Caso ficticio concurrente",
        })
      ).status,
    ).toBe(201);
    await page
      .getByRole("button", { name: "Confirmar Neto de apertura", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("contexto ha cambiado");
    await expect(
      page.getByLabel("Neto al instante de apertura EUR", { exact: true }),
    ).toHaveValue("900");
    expect((await get("/anticipos/fichas/REF002")).fotos).toHaveLength(1);
    await shots("conflict-draft");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await open("2", "900");
    await page.route(
      "**/api/anticipos/fichas/REF002/netos-apertura/preview",
      (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Inicia sesión para continuar." }),
        }),
    );
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByText("La sesión ha caducado.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Neto al instante de apertura EUR", { exact: true }),
    ).toHaveValue("900");
    await shots("expired-draft");
    expect(errors).toEqual([]);
  } finally {
    child.kill("SIGTERM");
  }
});
