import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { fixtureContext } from "./fixture";

// Puerto y estado propios de la ejecución (#508): dos runs simultáneos de esta
// misma spec no comparten listener ni SQLite.
const fixture = fixtureContext("reparto");
const API_PORT = fixture.port;

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
  return `El fixture reparto terminó antes de servir (${how}): ${detail}`;
}

/** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
function assertFixtureAlive() {
  if (fixtureExit) throw new Error(fixtureFailure());
}

/**
 * SPEC36 · incremento 2 — reparto mensual asistido.
 *
 * Escenario real con servidor API aislado, MFA real y SQLite; depende del
 * mecanismo de Transferencia pendiente de #391 y de la API de reparto.
 */
test(
  "reparto mensual: propuesta, borrador, generación y pendientes separados de Movimientos",
  async ({ page, request }) => {
    child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/reparto-server.ts"],
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
    page.on("pageerror", (e) => errors.push(e.message));
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
      // El fixture provisionó su base ficticia antes de servir: se navega solo
      // cuando el estado de esta run está en disco.
      assertFixtureAlive();
      expect(
        existsSync(join(fixture.dir, "bootstrap.txt")),
        `El fixture reparto no provisionó ${fixture.dir}/bootstrap.txt: ${fixtureOutput.trim()}`,
      ).toBe(true);
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        url.port = String(API_PORT);
        await route.fulfill({
          response: await route.fetch({ url: url.toString() }),
        });
      });
      await page.goto("/planes-ciclo");
      await page
        .getByLabel("Código de activación")
        .fill(readFileSync(join(fixture.dir, "bootstrap.txt"), "utf8"));
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
      await expect(
        page.getByText("Cancelar pendiente", { exact: true }).first(),
      ).toBeVisible();
      expect(await page.getByText("Ejecutar", { exact: true }).count()).toBe(0);

      // Confirm the generated pending with its real bank date and explicit act.
      await page
        .getByRole("button", { name: "Confirmar transferencia", exact: true })
        .first()
        .click();
      const realDate = page.getByRole("textbox", {
        name: "Fecha real del banco",
        exact: true,
      });
      await expect(realDate).toBeVisible();
      // Fixed date inside the synthetic cycle: never depend on today().
      await realDate.fill(cycle.data.ciclo.inicio);
      await page
        .getByRole("button", { name: "Revisar confirmación", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Vista previa de confirmación" }),
      ).toBeVisible();
      await page
        .getByRole("checkbox", { name: "Transferencia realizada", exact: true })
        .check();
      await page
        .getByRole("button", {
          name: "Confirmar transferencia realizada",
          exact: true,
        })
        .click();
      await expect(
        page.getByText("Movimiento confirmado", { exact: true }),
      ).toBeVisible();
      const complete = page.getByRole("button", {
        name: "Completar reparto",
        exact: true,
      });
      await expect(complete).toBeEnabled();

      // A4/R1: after generating, new lines may be added; existing ones stay
      // frozen and the old "puedeCompletar:true" must not survive the alta.
      await expect(
        page.getByText("Generada · no editable", { exact: true }).first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Añadir transferencia", exact: true })
        .click();
      await page
        .getByRole("combobox", { name: "Origen", exact: true })
        .selectOption(origin.id);
      await page
        .getByRole("combobox", { name: "Destino", exact: true })
        .selectOption(destination.id);
      await page
        .getByRole("textbox", { name: "Importe (€)", exact: true })
        .fill("25");
      await page
        .getByRole("button", { name: "Añadir línea adicional", exact: true })
        .click();
      await expect(
        page.getByText("Transferencia adicional añadida al borrador.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(complete).toBeDisabled();
      await expect(
        page.getByText(/Faltan pendientes para las líneas/),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Generar 1 pendiente", exact: true })
        .click();
      await expect(complete).toBeDisabled();
      await expect(
        page.getByText("Hay pendientes sin confirmar o cancelar: #2.", {
          exact: true,
        }),
      ).toBeVisible();

      // Cancel the remaining pending with a mandatory motive.
      await page
        .getByRole("button", { name: "Cancelar pendiente", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Motivo de cancelación", exact: true })
        .fill("No se ejecutó finalmente");
      await page
        .getByRole("button", { name: "Confirmar cancelación", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Cancelar pendiente", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Cancelada", { exact: true }).first(),
      ).toBeVisible();
      await expect(complete).toBeEnabled();
      await complete.click();
      await expect(
        page.getByText(
          "Reparto completado. Conserva el seguimiento de sus líneas.",
          { exact: true },
        ),
      ).toBeVisible();

      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(
        page.getByRole("region", { name: "Seguimiento del reparto" }),
      ).toBeVisible();
      const closeReparto = page.getByRole("button", {
        name: "Cerrar reparto",
        exact: true,
      });
      await closeReparto.focus();
      await expect(closeReparto).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);

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
      child?.kill("SIGTERM");
      child?.stdout?.destroy();
      child?.stderr?.destroy();
      await page.unroute("**/api/**");
    }
  },
);
