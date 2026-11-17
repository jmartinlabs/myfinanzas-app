import { afterEach, describe, expect, test } from "bun:test";
import { HttpApp } from "@effect/platform";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "./app";
import {
  BUILD_VERSION,
  appVersionIdentity,
  resolveAppVersion,
  resolveEnvironment,
  shortSha,
} from "./app-version";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { schemaVersion } from "./database-identity";

/**
 * #502 — contrato de metadatos de versión.
 *
 * Verifica la forma exacta de `/api/version` (campos, fallback sin
 * `APP_VERSION`, derivación del entorno) y que la respuesta no transporta
 * rutas, secretos, cadenas de conexión ni configuración. La identidad de
 * release se reutiliza de `resolveAppVersion`: aquí no hay un segundo número.
 */

const origin = "http://127.0.0.1:5173";
const password = "Versión ficticia de prueba " + randomUUID();
const SHA40 = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

const saved = { ...process.env };
afterEach(() => {
  for (const name of [
    "APP_VERSION",
    "APP_ENV",
    "APP_SHA",
    "GIT_SHA",
    "GITHUB_SHA",
    "COMMIT_SHA",
    "SOURCE_SHA",
    "NODE_ENV",
  ])
    delete process.env[name];
  Object.assign(process.env, saved);
});

function clearBuildIdentity() {
  for (const name of [
    "APP_VERSION",
    "APP_SHA",
    "GIT_SHA",
    "GITHUB_SHA",
    "COMMIT_SHA",
    "SOURCE_SHA",
  ])
    delete process.env[name];
}

function fixture() {
  const db = openDatabase(":memory:"),
    key = randomBytes(32);
  const now = Date.UTC(2026, 10, 17, 12);
  const handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
  let cookie = "",
    csrf = "";
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await handler(
      new Request(origin + path, {
        method,
        headers: {
          origin,
          "content-type": "application/json",
          cookie,
          "x-csrf-token": csrf,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((part) => part && !part.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data && typeof data === "object" && "csrf" in data)
      csrf = String((data as { csrf: string }).csrf);
    return { status: response.status, data: data as Record<string, any> };
  }
  async function enroll() {
    const bootstrap = provision(db, now);
    const enrollResponse = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(enrollResponse.status).toBe(200);
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(enrollResponse.data.secret).generate({ timestamp: now }),
    });
    expect(verified.status).toBe(200);
  }
  return { db, request, enroll };
}

describe("identidad de versión", () => {
  test("sin APP_VERSION la única fuente es BUILD_VERSION y no es release", () => {
    clearBuildIdentity();
    expect(resolveAppVersion()).toBe(BUILD_VERSION);
    expect(appVersionIdentity()).toEqual({
      version: null,
      sha: null,
      label: "desarrollo",
    });
  });

  test("APP_VERSION y el SHA del build forman la identidad de release", () => {
    clearBuildIdentity();
    process.env.APP_VERSION = "0.2.0";
    process.env.APP_SHA = SHA40;
    expect(resolveAppVersion()).toBe(`0.2.0+${SHA40}`);
    expect(appVersionIdentity()).toEqual({
      version: "0.2.0",
      sha: SHA40.slice(0, 7),
      label: "release",
    });
  });

  test("un SHA inverificable no se publica y no rompe la versión", () => {
    clearBuildIdentity();
    process.env.APP_VERSION = "0.2.0";
    process.env.APP_SHA = "no-es-un-sha";
    expect(appVersionIdentity()).toEqual({
      version: "0.2.0",
      sha: null,
      label: "release",
    });
    expect(shortSha("no-es-un-sha")).toBeNull();
    expect(shortSha(SHA40.toUpperCase())).toBe(SHA40.slice(0, 7));
  });

  test("el entorno declarado manda y TEST nunca es el valor por defecto", () => {
    const env = (values: Record<string, string | undefined>) =>
      values as NodeJS.ProcessEnv;
    expect(resolveEnvironment({ env: env({ APP_ENV: "TEST" }) })).toBe("TEST");
    expect(resolveEnvironment({ env: env({ APP_ENV: "prod" }) })).toBe("PROD");
    expect(
      resolveEnvironment({ env: env({ APP_ENV: "PROD", NODE_ENV: "development" }) }),
    ).toBe("PROD");
    // `NODE_ENV=test` es el entorno de las pruebas, no una declaración de TEST.
    expect(resolveEnvironment({ env: env({ NODE_ENV: "test" }) })).toBe("DEV");
    expect(resolveEnvironment({ env: env({ APP_ENV: "staging" }) })).toBe("DEV");
    expect(resolveEnvironment({ demo: true, env: env({}) })).toBe("DEMO");
    expect(
      resolveEnvironment({ demo: true, env: env({ APP_ENV: "PROD" }) }),
    ).toBe("PROD");
    expect(
      resolveEnvironment({ env: env({ NODE_ENV: "production" }) }),
    ).toBe("PROD");
  });
});

describe("GET /api/version", () => {
  test("es una lectura pública de metadatos, como /api/health", async () => {
    clearBuildIdentity();
    const { request } = fixture();
    const { status, data } = await request("/api/version");
    expect(status).toBe(200);
    expect(data).toEqual({
      app: { version: null, sha: null, label: "desarrollo" },
      environment: "DEV",
      schema: schemaVersion,
    });
    // Solo GET: una escritura no existe y cae en el camino autenticado.
    expect((await request("/api/version", "POST", {})).status).not.toBe(200);
  });

  test("sin APP_VERSION devuelve identidad de desarrollo, sin release inventada", async () => {
    clearBuildIdentity();
    process.env.APP_ENV = "TEST";
    const { request, enroll } = fixture();
    await enroll();
    const { status, data } = await request("/api/version");
    expect(status).toBe(200);
    expect(data).toEqual({
      app: { version: null, sha: null, label: "desarrollo" },
      environment: "TEST",
      schema: schemaVersion,
    });
    expect(schemaVersion).toBe(31);
  });

  test("con artefacto de release expone versión, SHA corto y entorno", async () => {
    clearBuildIdentity();
    process.env.APP_VERSION = "0.2.0";
    process.env.APP_SHA = SHA40;
    process.env.APP_ENV = "PROD";
    const { request, enroll } = fixture();
    await enroll();
    const { data } = await request("/api/version");
    expect(data.app).toEqual({
      version: "0.2.0",
      sha: SHA40.slice(0, 7),
      label: "release",
    });
    expect(data.environment).toBe("PROD");
    expect(data.schema).toBe(schemaVersion);
  });

  test("sin APP_ENV y fuera de producción el entorno es DEV", async () => {
    clearBuildIdentity();
    process.env.NODE_ENV = "development";
    const { request, enroll } = fixture();
    await enroll();
    const { data } = await request("/api/version");
    expect(data.environment).toBe("DEV");
  });

  test("la respuesta no filtra rutas, secretos ni configuración", async () => {
    clearBuildIdentity();
    process.env.APP_VERSION = "0.2.0";
    const { request, enroll, db } = fixture();
    await enroll();
    const { data } = await request("/api/version");
    expect(Object.keys(data).sort()).toEqual(["app", "environment", "schema"]);
    expect(Object.keys(data.app).sort()).toEqual(["label", "sha", "version"]);
    const body = JSON.stringify(data);
    for (const forbidden of [
      process.cwd(),
      "/Users",
      ".sqlite",
      ".key",
      "DATABASE_PATH",
      "AUTH_KEY_PATH",
      "APP_ORIGIN",
      "http://",
      "Bearer",
      "password",
      "token",
      db.filename,
    ])
      expect(body).not.toContain(forbidden);
    expect(body).not.toMatch(/[a-f0-9]{16,}/i);
  });
});