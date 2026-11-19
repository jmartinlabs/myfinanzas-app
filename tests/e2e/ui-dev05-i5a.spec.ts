import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { fixtureContext } from "./fixture";

/**
 * UI · DEV-05 I5a — Compartidos y PlanesCiclo.
 *
 * Servidor aislado con MFA real, en el puerto y con el estado que el
 * contexto de la ejecución reserva para este fixture (#514); el defecto
 * histórico (3025, `.local/e2e-ui-dev05-i5a`) solo se usa al arrancarlo a
 * mano. Las capturas y los estados de error usan datos ficticios creados
 * por el propio servidor de test.
 */

// Puerto y estado propios de la ejecución (#514): dos runs simultáneos
// de esta misma spec no comparten listener ni SQLite.
const fixture = fixtureContext("ui-dev05-i5a");
const API_PORT = fixture.port;
const THEMES = ["light-s", "dark-s", "hybrid-s"] as const;

/** Salida del fixture: el pipe se lee siempre y se muestra si algo falla. */
let child: ChildProcess | undefined;
let fixtureOutput = "";
let fixtureExit: { code: number | null; signal: NodeJS.Signals | null } | null =
  null;

function fixtureFailure(): string {
  const detail = fixtureOutput.trim() || "(sin salida)";
  const how = fixtureExit
    ? `código ${fixtureExit.code ?? "null"}${fixtureExit.signal ? ` / señal ${fixtureExit.signal}` : ""}`
    : "salida no registrada";
  return `El fixture ui-dev05-i5a terminó antes de servir (${how}): ${detail}`;
}

/** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
function assertFixtureAlive() {
  if (fixtureExit) throw new Error(fixtureFailure());
}

test("UI DEV-05 I5a: formularios, error asociado, foco y temas", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/ui-dev05-i5a-server.ts"],
    { stdio: ["ignore", "pipe", "pipe"], env: fixture.env },
  );
  const errors: string[] = [];
  child.stdout?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    fixtureExit = { code, signal };
  });
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync("artifacts/ui-dev05-i5a", { recursive: true });
  try {
    await expect
      .poll(
        async () => {
          assertFixtureAlive();
          try {
            return (
              await request.get(`http://127.0.0.1:${API_PORT}/api/health`)
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    // El fixture provisionó su base ficticia antes de servir: se navega
    // solo cuando el estado de esta run está en disco.
    assertFixtureAlive();
    expect(
      existsSync(join(fixture.dir, "bootstrap.txt")),
      `El fixture ui-dev05-i5a no provisionó ${fixture.dir}/bootstrap.txt: ${fixtureOutput.trim()}`,
    ).toBe(true);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = String(API_PORT);
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    const password = "Contraseña ficticia UI DEV-05 I5a " + randomUUID();
    await page.goto("/compartidos/nuevo");
    await page
      .getByLabel("Código de activación")
      .fill(readFileSync(join(fixture.dir, "bootstrap.txt"), "utf8"));
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
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
      .getByRole("button", { name: "He guardado los códigos · Continuar" })
      .click();

    const settle = async () =>
      page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    const assertNoOverflow = async () =>
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    const selectTheme = async (theme: (typeof THEMES)[number]) => {
      await page.getByLabel("Cambiar tema").selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    };
    const openPlanEditor = async () => {
      await expect(
        page.getByRole("heading", { name: "Sin plan", exact: true }),
      ).toBeVisible();
      const add = page.getByLabel("Añadir Presupuesto al plan");
      await expect(add).toContainText("Presupuesto I5a ficticio");
      await add.selectOption({ index: 1 });
      await expect(
        page.getByRole("heading", {
          name: "Editar línea del plan",
          exact: true,
        }),
      ).toBeVisible();
    };
    const screens = [
      {
        name: "compartidos",
        path: "/compartidos/nuevo",
        ready: async () => {
          await expect(
            page.getByRole("heading", {
              name: "Nuevo caso compartido",
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.getByLabel("Nombre del caso")).toBeVisible();
        },
      },
      {
        name: "planes-ciclo",
        path: "/planes-ciclo",
        ready: openPlanEditor,
      },
    ];

    for (const theme of THEMES) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await selectTheme(theme);
      for (const screen of screens) {
        for (const [width, height] of [
          [1440, 1000],
          [390, 844],
        ] as const) {
          await page.setViewportSize({ width, height });
          await page.goto(screen.path);
          await screen.ready();
          await settle();
          await assertNoOverflow();
          await page.screenshot({
            path: `artifacts/ui-dev05-i5a/${screen.name}-${theme}-${width}.png`,
            fullPage: true,
          });
        }
      }
    }

    // Error y foco: el mensaje vive en el contenedor al que apunta
    // aria-describedby y el primer control inválido recibe el foco.
    await selectTheme("dark-s");
    for (const [width, height] of [
      [1440, 1000],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/compartidos/nuevo");
      await page
        .getByRole("button", { name: "Crear caso", exact: true })
        .click();
      await expect(page.locator("#shared-name-error")).toHaveText(
        "Indica un nombre válido.",
      );
      await expect(page.getByLabel("Nombre del caso")).toHaveAttribute(
        "aria-describedby",
        "shared-name-error",
      );
      await expect(page.getByLabel("Nombre del caso")).toBeFocused();
      await settle();
      await assertNoOverflow();
      await page.screenshot({
        path: `artifacts/ui-dev05-i5a/compartidos-error-${width}.png`,
        fullPage: true,
      });

      await page.goto("/planes-ciclo");
      await openPlanEditor();
      await page.getByLabel("Base", { exact: true }).fill("-1");
      await page
        .getByRole("button", { name: "Revisar cambios del plan", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText("Importe negativo.");
      await expect(page.locator("#plan-error-base")).toHaveText(
        "No se admiten negativos.",
      );
      await expect(page.getByLabel("Base", { exact: true })).toHaveAttribute(
        "aria-describedby",
        "plan-base-error",
      );
      await expect(page.getByLabel("Base", { exact: true })).toBeFocused();
      await settle();
      await assertNoOverflow();
      await page.screenshot({
        path: `artifacts/ui-dev05-i5a/planes-ciclo-error-${width}.png`,
        fullPage: true,
      });
    }

    expect(errors).toEqual([]);
  } finally {
    child?.kill();
    if (fixtureOutput && errors.length)
      console.error("ui-dev05-i5a-server:\n" + fixtureOutput);
    child?.stdout?.destroy();
    child?.stderr?.destroy();
  }
});
