import { test, expect } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CONTEXT_ENV,
  allocatePorts,
  assertPortFree,
  buildContext,
  contextFromEnv,
  readContext,
  writeContext,
} from "./e2e-context";

const root = () => mkdtempSync(join(tmpdir(), "e2e-context-"));

test("508: el contexto deriva orígenes, directorios y puertos de fixture", () => {
  const context = buildContext({
    runId: "run-1",
    runRoot: "/tmp/e2e-run-1",
    webPort: 41234,
    apiPort: 41235,
    fixtures: { theme: 41236 },
  });
  expect(context.webOrigin).toBe("http://127.0.0.1:41234");
  expect(context.apiOrigin).toBe("http://127.0.0.1:41235");
  expect(context.fixturePort("theme")).toBe(41236);
  expect(context.stateDir("theme")).toBe("/tmp/e2e-run-1/state/theme");
  expect(context.artifactDir("theme")).toBe("/tmp/e2e-run-1/artifacts/theme");
  expect(context.childEnv()).toMatchObject({
    E2E_WEB_PORT: "41234",
    E2E_API_PORT: "41235",
    APP_ORIGIN: "http://127.0.0.1:41234",
    E2E_APP_ORIGIN: "http://127.0.0.1:41234",
  });
});

test("508: un fixture no reservado falla en vez de inventar un puerto", () => {
  const context = buildContext({
    runId: "run-2",
    runRoot: "/tmp/e2e-run-2",
    webPort: 41244,
    apiPort: 41245,
  });
  expect(() => context.fixturePort("inexistente")).toThrow(
    /no reservó el fixture/,
  );
});

test("508: puertos iguales o fuera de rango se rechazan", () => {
  const base = { runId: "run-3", runRoot: "/tmp/e2e-run-3" };
  expect(() => buildContext({ ...base, webPort: 4100, apiPort: 4100 })).toThrow(
    /no pueden coincidir/,
  );
  expect(() => buildContext({ ...base, webPort: 0, apiPort: 4101 })).toThrow(
    /fuera de rango/,
  );
  expect(() => buildContext({ ...base, webPort: 4102, apiPort: 70000 })).toThrow(
    /fuera de rango/,
  );
});

test("508: el contexto sobrevive al viaje por fichero", () => {
  const dir = root();
  try {
    const original = buildContext({
      runId: "run-4",
      runRoot: dir,
      webPort: 41254,
      apiPort: 41255,
      fixtures: { shell: 41256 },
    });
    const file = writeContext(original);
    const restored = contextFromEnv({ [CONTEXT_ENV]: file });
    expect(restored.runRoot).toBe(original.runRoot);
    expect(restored.webPort).toBe(41254);
    expect(restored.apiPort).toBe(41255);
    expect(restored.fixturePort("shell")).toBe(41256);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("508: sin contexto la ejecución falla, no cae a 5173/3001", () => {
  expect(() => contextFromEnv({})).toThrow(new RegExp(CONTEXT_ENV));
  const dir = root();
  try {
    const broken = join(dir, "context.json");
    writeFileSync(broken, JSON.stringify({ runId: "x" }));
    expect(() => contextFromEnv({ [CONTEXT_ENV]: broken })).toThrow(
      /Raíz de ejecución E2E ausente|Puerto E2E inválido|malformado/,
    );
    expect(() => readContext(null)).toThrow(/ausente o malformado/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("508: la reserva devuelve puertos distintos y utilizables", async () => {
  const ports = await allocatePorts(3);
  expect(ports).toHaveLength(3);
  expect(new Set(ports).size).toBe(3);
  for (const port of ports) {
    expect(port).toBeGreaterThan(1024);
    await assertPortFree(port);
  }
});

test("508: un puerto ocupado se detecta como tal", async () => {
  const [port] = await allocatePorts(1);
  const server = Bun.serve({ hostname: "127.0.0.1", port, fetch: () => new Response("x") });
  try {
    await expect(assertPortFree(server.port ?? port)).rejects.toThrow(/ocupado/);
  } finally {
    server.stop(true);
  }
});

test("508: la reserva falla cerrada si el SO entrega el mismo puerto dos veces", async () => {
  let calls = 0;
  const fake = () => ({ port: 41111 + (calls++ === 0 ? 0 : 0), stop: () => {} });
  await expect(allocatePorts(2, "127.0.0.1", fake)).rejects.toThrow(
    /puertos repetidos/,
  );
});