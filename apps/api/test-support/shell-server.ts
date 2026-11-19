// #503 E2E — fixture aislado del shell. Proceso de prueba únicamente: no existe
// en la aplicación real ni toca datos reales.
//
// Levanta en un solo proceso:
//  - la API real sobre SQLite ficticio con una cuenta recién provisionada
//    (`.local/e2e-shell`, puerto 3041);
//  - el build de `apps/web/dist` en un puerto libre (5291 por defecto) con
//    fallback de SPA y proxy `/api` hacia la API anterior, de modo que el
//    navegador habla con el artefacto tal como se sirve, sin servidores de
//    desarrollo compartidos.
//
// `E2E_SERVE_ONLY=1` sirve solo el artefacto con proxy a una API ya levantada
// por otra fixture (`E2E_API_PORT`), sin crear base ni cuenta: así se puede
// ejecutar una spec que provisiona su propio servidor (#502) sobre un puerto
// libre en lugar de 5173.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { loadKey, provision } from "../src/auth";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

// Puerto y estado del contexto de la ejecución (#514): los puertos ya venían
// de `E2E_API_PORT`/`E2E_WEB_PORT`; el estado acepta ahora `E2E_STATE_DIR`
// antes del directorio histórico, que se conserva para arrancarlo a mano.
const API_PORT = Number(process.env.E2E_API_PORT ?? 3041);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5291);
const ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const DIST = "apps/web/dist";
const dir = process.env.E2E_STATE_DIR ?? ".local/e2e-shell";
const SERVE_ONLY = process.env.E2E_SERVE_ONLY === "1";

function provisionFixture() {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const database = openDatabase(join(dir, "demo.sqlite"));
  const authKey = loadKey(database, join(dir, "auth.key"));
  writeFileSync(join(dir, "bootstrap.txt"), provision(database), { mode: 0o600 });
  return { database, authKey };
}

const setup = SERVE_ONLY ? null : provisionFixture();

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const web = Bun.serve({
  hostname: "127.0.0.1",
  port: WEB_PORT,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const target = new URL(
        url.pathname + url.search,
        `http://127.0.0.1:${API_PORT}`,
      );
      const proxied = await fetch(target, {
        method: request.method,
        headers: request.headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : request.body,
        redirect: "manual",
      });
      const headers = new Headers(proxied.headers);
      headers.delete("content-encoding");
      headers.delete("content-length");
      return new Response(proxied.body, {
        status: proxied.status,
        headers,
      });
    }
    const file = Bun.file(join(DIST, url.pathname));
    if (url.pathname !== "/" && (await file.exists()) && file.size > 0) {
      const ext = url.pathname.slice(url.pathname.lastIndexOf("."));
      return new Response(file, {
        headers: TYPES[ext] ? { "content-type": TYPES[ext] } : undefined,
      });
    }
    return new Response(Bun.file(join(DIST, "index.html")), {
      headers: { "content-type": TYPES[".html"] },
    });
  },
});

console.log(
  `#503 fixture: web ${ORIGIN} (${web.port}), api ${setup ? `http://127.0.0.1:${API_PORT}` : "externa"}`,
);

if (setup) {
  BunRuntime.runMain(
    Layer.launch(
      HttpServer.serve(createApp(setup.database, {
        key: setup.authKey,
        origin: ORIGIN,
      })).pipe(
        Layer.provide(
          BunHttpServer.layer({ hostname: "127.0.0.1", port: API_PORT }),
        ),
      ),
    ),
  );
}