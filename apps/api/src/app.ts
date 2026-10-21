import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Effect } from "effect";
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { Auth } from "./auth";
import {
  createSaldo,
  getSaldo,
  listSaldos,
  updateSaldo,
  Problem,
  type ImpactGuard,
} from "./saldos";

export type AppOptions = {
  key: Buffer;
  origin?: string;
  now?: () => number;
  impactGuard?: ImpactGuard;
};
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new Problem(415, "CONTENT_TYPE", "Se requiere JSON.");
  const reader = req.body?.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  if (reader)
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 16384) {
          await reader.cancel();
          throw new Problem(413, "BODY_LIMIT", "Petición demasiado grande.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Problem(422, "INVALID_JSON", "JSON inválido.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Problem(422, "INVALID_JSON", "Se requiere un objeto JSON.");
  return data as Record<string, unknown>;
}
export function createApp(db: Database, options: AppOptions) {
  const auth = new Auth(db, options.key, options.origin, options.now);
  const now = options.now ?? Date.now;
  async function handle(req: Request) {
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
      "x-frame-options": "DENY",
    });
    const reply = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers });
    try {
      const path = new URL(req.url).pathname;
      if (path === "/api/health" && req.method === "GET")
        return reply({ ok: true });
      if (path === "/api/auth/status" && req.method === "GET")
        return reply({ configured: auth.configured() });
      if (
        req.method === "POST" &&
        [
          "/api/auth/enroll",
          "/api/auth/login",
          "/api/auth/mfa",
          "/api/auth/recover",
        ].includes(path)
      ) {
        auth.sameOrigin(req);
        const body = await jsonBody(req);
        if (path === "/api/auth/mfa") {
          const result = auth.verify(req, body.code);
          headers.append(
            "set-cookie",
            auth.cookie(auth.cookieName, result.session, 43200),
          );
          headers.append("set-cookie", auth.cookie(auth.challengeName, "", 0));
          return reply({
            csrf: result.csrf,
            recoveryCodes: result.recoveryCodes,
          });
        }
        const result =
          path === "/api/auth/enroll"
            ? await auth.enroll(body.token, body.password)
            : path === "/api/auth/recover"
              ? await auth.recover(body.password, body.code)
              : await auth.login(body.password);
        headers.append(
          "set-cookie",
          auth.cookie(auth.challengeName, result.challenge, 300),
        );
        const { challenge, ...publicResult } = result;
        return reply(publicResult);
      }
      const session = auth.session(req);
      if (path === "/api/auth/session" && req.method === "GET")
        return reply({ csrf: session.csrf });
      if (path === "/api/auth/logout" && req.method === "POST") {
        auth.logout(req);
        headers.append("set-cookie", auth.cookie(auth.cookieName, "", 0));
        return reply({ ok: true });
      }
      if (path === "/api/saldos" && req.method === "GET")
        return reply(listSaldos(db, new URL(req.url).searchParams));
      if (path === "/api/saldos" && req.method === "POST") {
        const saldo = createSaldo(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", `/api/saldos/${saldo.id}`);
        return reply({ saldo }, 201);
      }
      const match = path.match(
        /^\/api\/saldos\/(S\d+)(?:\/(desactivar|reactivar))?$/,
      );
      if (match) {
        const [, id, action] = match;
        if (!action && req.method === "GET")
          return reply({ saldo: getSaldo(db, id) });
        if (
          (!action && req.method === "PATCH") ||
          (action && req.method === "POST")
        ) {
          let body = await jsonBody(req);
          if (action) {
            if (Object.keys(body).some((k) => k !== "revision"))
              throw new Problem(
                422,
                "VALIDATION",
                "Solo se admite revisión para cambiar Estado.",
              );
            body = {
              revision: body.revision,
              estado: action === "desactivar" ? "Inactiva" : "Activa",
            };
          }
          return reply({
            saldo: updateSaldo(db, id, body, options.impactGuard, now()),
          });
        }
      }
      throw new Problem(404, "NOT_FOUND", "Recurso no encontrado.");
    } catch (e) {
      const p =
        e instanceof Problem
          ? e
          : new Problem(500, "INTERNAL", "No se pudo completar la operación.");
      if (p.status === 429) headers.set("retry-after", "60");
      return reply(
        {
          code: p.code,
          error: p.message,
          fields: p.fields,
          requestId: randomUUID(),
        },
        p.status,
      );
    }
  }
  return HttpRouter.empty.pipe(
    HttpRouter.all(
      "*",
      Effect.gen(function* () {
        const serverRequest = yield* HttpServerRequest.HttpServerRequest;
        const request = yield* HttpServerRequest.toWeb(serverRequest);
        return HttpServerResponse.fromWeb(
          yield* Effect.promise(() => handle(request)),
        );
      }),
    ),
  );
}
