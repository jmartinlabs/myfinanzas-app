import { afterEach, describe, expect, test } from "bun:test";
import { HttpApp } from "@effect/platform";
import { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "./app";
import { Auth } from "./auth";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { keyHash } from "./database-identity";
import { assertDemoDatabase, demoScope, type DemoScope } from "./demo-mode";
import { isPrivateHost, localHttpOrigin } from "./local-network";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function demoDirectory() {
  const root = mkdtempSync(join(tmpdir(), "mf-demo-"));
  roots.push(root);
  return join(root, ".local", "demo");
}

function scope(origins: string[], database = join(demoDirectory(), "demo.sqlite")): DemoScope {
  return {
    origins,
    database,
    key: join(demoDirectory(), "auth.key"),
    bindHost: "127.0.0.1",
  };
}

const base = {
  NODE_ENV: "development",
  MYFINANZAS_DEMO: "1",
  DEMO_ORIGINS: "http://127.0.0.1:5173,http://192.168.1.50:5173",
  API_BIND_HOST: "127.0.0.1",
};

function env(overrides: Record<string, string | undefined> = {}) {
  const directory = demoDirectory();
  return {
    ...base,
    DATABASE_PATH: join(directory, "demo.sqlite"),
    AUTH_KEY_PATH: join(directory, "auth.key"),
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe("demoScope", () => {
  test("sin activación explícita no hay modo DEMO", () => {
    expect(demoScope({ NODE_ENV: "development" })).toBeNull();
    expect(demoScope({ NODE_ENV: "test", MYFINANZAS_DEMO: "0" })).toBeNull();
  });

  test("nunca se activa fuera de development", () => {
    for (const mode of ["test", "production", undefined])
      expect(() => demoScope(env({ NODE_ENV: mode }))).toThrow(
        "NODE_ENV=development",
      );
  });

  test("rechaza orígenes públicos, no canónicos, con credenciales o puerto privilegiado", () => {
    // Las credenciales se componen por partes para no dejar una URL con
    // usuario:contraseña literal en el repositorio.
    const withCredentials =
      "http://" + ["usuario", "secreto"].join(":") + "@192.168.1.50:5173";
    for (const origin of [
      "https://demo.example.com:5173",
      "http://8.8.8.8:5173",
      "http://192.168.1.50:5173/",
      withCredentials,
      "http://192.168.1.50:80",
    ])
      expect(() => demoScope(env({ DEMO_ORIGINS: origin }))).toThrow();
  });

  test("rechaza APP_ORIGIN productivo reutilizado", () => {
    expect(() =>
      demoScope(env({ APP_ORIGIN: "https://test.myfinanzas.pp.ua" })),
    ).toThrow();
  });

  test("rechaza bases fuera de .local/demo", () => {
    expect(() =>
      demoScope(env({ DATABASE_PATH: "/tmp/demo.sqlite" })),
    ).toThrow(".local/demo");
    expect(() =>
      demoScope(env({ AUTH_KEY_PATH: "/tmp/auth.key" })),
    ).toThrow(".local/demo");
  });

  test("la API DEMO nunca se publica en la red", () => {
    expect(demoScope(env({ API_BIND_HOST: "127.0.0.1" }))?.bindHost).toBe(
      "127.0.0.1",
    );
    expect(demoScope(env({ API_BIND_HOST: undefined }))?.bindHost).toBe(
      "127.0.0.1",
    );
    for (const value of ["0.0.0.0", "192.168.1.50", "::"])
      expect(() => demoScope(env({ API_BIND_HOST: value }))).toThrow(
        "solo escucha en 127.0.0.1",
      );
  });

  test("alcance de red: solo loopback e IPv4 privada", () => {
    expect(isPrivateHost("192.168.1.50")).toBe(true);
    expect(isPrivateHost("10.0.5.7")).toBe(true);
    expect(isPrivateHost("172.16.0.1")).toBe(true);
    expect(isPrivateHost("172.32.0.1")).toBe(false);
    expect(isPrivateHost("192.169.1.1")).toBe(false);
    expect(isPrivateHost("8.8.8.8")).toBe(false);
    expect(localHttpOrigin("http://127.0.0.1:5173")).toBe("http://127.0.0.1:5173");
  });
});

describe("assertDemoDatabase", () => {
  test("acepta una base demo vacía y rechaza credenciales", () => {
    const database = join(demoDirectory(), "demo.sqlite");
    const db = openDatabase(database);
    try {
      const demo = scope(["http://127.0.0.1:5173"], database);
      expect(() => assertDemoDatabase(db, demo)).not.toThrow();
      db.run("INSERT OR REPLACE INTO owner VALUES(1,'x','y',1,-1)");
      expect(() => assertDemoDatabase(db, demo)).toThrow("credenciales");
    } finally {
      db.close();
    }
  });

  test("rechaza una identidad productiva", () => {
    const database = join(demoDirectory(), "demo.sqlite");
    mkdirSync(dirname(database), { recursive: true, mode: 0o700 });
    const key = randomBytes(32);
    const db = new Database(database, { create: true, strict: true });
    try {
      prepareSchema(db, { origin: "production", key_hash: keyHash(key) });
      expect(() =>
        assertDemoDatabase(db, scope(["http://127.0.0.1:5173"], database)),
      ).toThrow("identificada como DEMO");
    } finally {
      db.close();
    }
  });

  test("rechaza una conexión distinta de la declarada", () => {
    const database = join(demoDirectory(), "demo.sqlite");
    const db = openDatabase(":memory:");
    try {
      expect(() =>
        assertDemoDatabase(db, scope(["http://127.0.0.1:5173"], database)),
      ).toThrow("no es la base DEMO");
    } finally {
      db.close();
    }
  });
});

function harness(demo: DemoScope | null) {
  const database = demo?.database ?? ":memory:";
  const db = openDatabase(database);
  const key = randomBytes(32);
  let now = Date.UTC(2026, 10, 1, 12);
  const handler = HttpApp.toWebHandler(
    createApp(db, {
      key,
      now: () => now,
      ...(demo ? { demo } : {}),
    }),
  );
  let cookie = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
    csrf = "",
  ) {
    const response = await handler(
      new Request("http://127.0.0.1:5173" + path, {
        method,
        headers: {
          origin: "http://127.0.0.1:5173",
          "content-type": "application/json",
          cookie,
          "x-csrf-token": csrf,
          ...headers,
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
    return response;
  }
  return { db, request, close: () => db.close() };
}

describe("modo DEMO en la API", () => {
  test("abre sesión sin credenciales y conserva CSRF y origen", async () => {
    const demo = scope([
      "http://127.0.0.1:5173",
      "http://192.168.1.50:5173",
    ]);
    const h = harness(demo);
    try {
      const session = await h.request("/api/auth/session");
      expect(session.status).toBe(200);
      const body = (await session.json()) as { csrf: string; demo?: boolean };
      expect(body.demo).toBe(true);
      expect(body.csrf.length).toBeGreaterThan(20);
      expect(session.headers.getSetCookie().length).toBe(1);

      // Origen de red privada admitido solo con la sesión válida.
      const lan = await h.request("/api/saldos", "GET", undefined, {
        origin: "http://192.168.1.50:5173",
      });
      expect(lan.status).toBe(200);

      // Sin token CSRF no se escribe.
      const noCsrf = await h.request("/api/auth/session", "POST", {});
      expect(noCsrf.status).toBe(403);

      const created = await h.request(
        "/api/saldos",
        "POST",
        { nombre: "Efectivo DEMO", tipo: "Efectivo", control: "Movimientos" },
        { "idempotency-key": randomUUID() },
        body.csrf,
      );
      expect(created.status).toBe(201);

      // Un origen ajeno sigue rechazado en escrituras.
      const foreign = await h.request(
        "/api/saldos",
        "POST",
        { nombre: "Otro", tipo: "Efectivo", control: "Movimientos" },
        { origin: "http://evil.example:5173" },
        body.csrf,
      );
      expect(foreign.status).toBe(403);

      // DEMO nunca configura credenciales.
      const enroll = await h.request(
        "/api/auth/enroll",
        "POST",
        { token: "x", password: "12345678" },
        {},
        body.csrf,
      );
      expect(enroll.status).toBe(403);
      expect(h.db.query("SELECT id FROM owner LIMIT 1").get()).toBeNull();
    } finally {
      h.close();
    }
  });

  test("sin DEMO la sesión sigue exigiendo autenticación", async () => {
    const h = harness(null);
    try {
      const session = await h.request("/api/auth/session");
      expect(session.status).toBe(401);
      const status = await h.request("/api/auth/status");
      expect(await status.json()).toEqual({ configured: false });
    } finally {
      h.close();
    }
  });

  test("una escritura sin cookie DEMO no estrena sesión", async () => {
    const h = harness(scope(["http://127.0.0.1:5173"]));
    try {
      const response = await h.request("/api/saldos", "POST", {
        nombre: "Sin sesión",
        tipo: "Efectivo",
        control: "Movimientos",
      });
      expect(response.status).toBe(401);
    } finally {
      h.close();
    }
  });
});

describe("Auth: la red privada es exclusiva del alcance DEMO", () => {
  function authDb() {
    return openDatabase(":memory:");
  }

  test("sin orígenes DEMO, HTTP solo se admite en loopback", () => {
    const db = authDb();
    try {
      const key = randomBytes(32);
      expect(() => new Auth(db, key, "http://127.0.0.1:5173")).not.toThrow();
      expect(() => new Auth(db, key, "http://localhost:5173")).not.toThrow();
      // La barra final se normaliza al mismo origen loopback.
      expect(() => new Auth(db, key, "http://127.0.0.1:5173/")).not.toThrow();
      for (const origin of [
        "http://192.168.1.50:5173",
        "http://10.0.0.7:5173",
        "http://172.16.1.9:5173",
        "http://127.0.0.1:5173/inicio",
        "http://8.8.8.8:5173",
      ])
        expect(() => new Auth(db, randomBytes(32), origin)).toThrow(
          "HTTP solo permitido en loopback.",
        );
    } finally {
      db.close();
    }
  });

  test("con orígenes DEMO se admite la IPv4 privada declarada y nada más", () => {
    const db = authDb();
    try {
      const auth = new Auth(
        db,
        randomBytes(32),
        "http://127.0.0.1:5173",
        Date.now,
        ["http://192.168.1.50:5173"],
      );
      expect([...auth.origins].sort()).toEqual([
        "http://127.0.0.1:5173",
        "http://192.168.1.50:5173",
      ]);
      const sameOrigin = (value: string) =>
        auth.sameOrigin(
          new Request("http://127.0.0.1:5173/api/saldos", {
            method: "POST",
            headers: { origin: value },
          }),
        );
      expect(() => sameOrigin("http://192.168.1.50:5173")).not.toThrow();
      expect(() => sameOrigin("http://192.168.1.60:5173")).toThrow();
      // Un origen público sigue rechazado incluso dentro del alcance DEMO.
      expect(
        () =>
          new Auth(db, randomBytes(32), "http://127.0.0.1:5173", Date.now, [
            "http://8.8.8.8:5173",
          ]),
      ).toThrow("HTTP solo permitido");
    } finally {
      db.close();
    }
  });
});
