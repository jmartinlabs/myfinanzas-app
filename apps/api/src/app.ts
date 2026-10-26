import { monthlyFlow } from "./flujo-mensual";
import {
  getAnticipo,
  listAnticipos,
  createAnticipo,
  previewAccreditation,
  confirmAccreditation,
  previewOpening,
  confirmOpening,
} from "./anticipos";
import {
  getPayroll,
  previewPayroll,
  confirmPayroll,
  payrollForecast,
} from "./nomina";
import {
  getAnnualPlan,
  previewAnnualPlan,
  confirmAnnualPlan,
  type AnnualProvider,
} from "./plan-anual";
import {
  getCyclePlan,
  executionDetail,
  previewCyclePlan,
  confirmCyclePlan,
} from "./planes-ciclo";
import {
  getBudget,
  listBudgets,
  createBudget,
  updateBudget,
  previewBudget,
  changeBudgetState,
  budgetParts,
  budgetUsage,
} from "./presupuestos";
import {
  getDebt,
  listDebts,
  createDebt,
  updateDebt,
  debtUsage,
} from "./deudas";
import {
  getReference,
  referenceUsage,
  listReferences,
  createReference,
  updateReference,
} from "./referencias";
import {
  getVehicle,
  listVehicles,
  vehicleIntegrity,
} from "./vehiculos";
import {
  nonVehicleFicha,
  vehicleFicha,
} from "./vehicle-rules";
import {
  getMovement,
  listMovements,
  movementOptions,
  previewMovement,
  writeMovement,
  type MovementProtection,
} from "./movimientos";
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

import {
  entity,
  listClassification,
  getClassification,
  descendants,
  createClassification,
  updateClassification,
  previewClassification,
  changeClassificationState,
  type ClassificationGuard,
} from "./clasificacion";

import {
  listCycles,
  getCycle,
  cycleContext,
  createCycle,
  previewCycleOperation,
  writeCycleOperation,
  cycleHistory,
} from "./ciclos";

export type AppOptions = {
  annualProvider?: AnnualProvider;
  classificationGuard?: ClassificationGuard;
  movementGuard?: MovementProtection;
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
      const flow = path.match(/^\/api\/flujo-mensual\/([^/]+)$/);
      if (flow && req.method === "GET")
        return reply(monthlyFlow(db, flow[1], now()));
      if (path === "/api/anticipos/fichas" && req.method === "GET")
        return reply(listAnticipos(db, new URL(req.url).searchParams));
      if (path === "/api/anticipos/fichas" && req.method === "POST")
        return reply(
          createAnticipo(
            db,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          ),
          201,
        );
      const anticipoPath = path.match(
        /^\/api\/anticipos\/fichas\/(REF\d+)(?:\/(netos-apertura)(?:\/(preview))?|\/movimientos\/(\d+)\/acreditar(?:\/(preview))?)?$/,
      );
      if (anticipoPath) {
        const [, ref, opening, openingPreview, movement, accreditationPreview] =
          anticipoPath;
        if (req.method === "GET" && !opening && !movement)
          return reply(getAnticipo(db, ref));
        if (req.method === "POST" && (opening || movement)) {
          const body = await jsonBody(req),
            key = req.headers.get("idempotency-key") ?? "";
          return reply(
            opening
              ? openingPreview
                ? previewOpening(db, ref, body)
                : confirmOpening(db, ref, body, key, now())
              : accreditationPreview
                ? previewAccreditation(db, ref, movement, body)
                : confirmAccreditation(db, ref, movement, body, key, now()),
          );
        }
      }
      if (path === "/api/nomina" && req.method === "GET")
        return reply(getPayroll(db));
      if (path === "/api/nomina/impacto" && req.method === "POST")
        return reply(previewPayroll(db, await jsonBody(req)));
      if (path === "/api/nomina/confirmar" && req.method === "POST")
        return reply(
          confirmPayroll(
            db,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          ),
        );
      if (path === "/api/nomina/pronostico" && req.method === "POST")
        return reply(payrollForecast(db, await jsonBody(req), now()));
      const annual = path.match(
        /^\/api\/plan-anual\/(\d{4})(?:\/(impacto|confirmar))?$/,
      );
      if (annual) {
        const [, year, action] = annual;
        if (!action && req.method === "GET")
          return reply(getAnnualPlan(db, year, now(), options.annualProvider));
        if (action === "impacto" && req.method === "POST")
          return reply(
            previewAnnualPlan(
              db,
              year,
              await jsonBody(req),
              now(),
              options.annualProvider,
            ),
          );
        if (action === "confirmar" && req.method === "POST")
          return reply(
            confirmAnnualPlan(
              db,
              year,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
              options.annualProvider,
            ),
          );
      }
      const cyclePlan = path.match(
        /^\/api\/planes-ciclo\/(\d+)(?:\/(impacto|confirmar|ejecucion)(?:\/(PRE\d+))?)?$/,
      );
      if (cyclePlan) {
        const [, id, action, budgetId] = cyclePlan;
        if (!action && req.method === "GET")
          return reply(getCyclePlan(db, id, now()));
        if (action === "ejecucion" && budgetId && req.method === "GET")
          return reply(
            executionDetail(
              db,
              id,
              budgetId,
              new URL(req.url).searchParams,
              now(),
            ),
          );
        if (action === "impacto" && req.method === "POST")
          return reply(previewCyclePlan(db, id, await jsonBody(req), now()));
        if (action === "confirmar" && req.method === "POST")
          return reply(
            confirmCyclePlan(
              db,
              id,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
          );
      }
      if (path === "/api/ciclos/contexto" && req.method === "GET")
        return reply(db.transaction(() => cycleContext(db))());
      if (path === "/api/ciclos" && req.method === "GET")
        return reply(
          db.transaction(() => listCycles(db, new URL(req.url).searchParams))(),
        );
      if (path === "/api/ciclos" && req.method === "POST") {
        const result = createCycle(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", `/api/ciclos/${result.ciclo.id}`);
        return reply(result, 201);
      }
      const cycleOperation = path.match(
        /^\/api\/ciclos\/(omitido|\d+\/rectificar)(?:\/(preview))?$/,
      );
      if (cycleOperation && req.method === "POST") {
        const action =
            cycleOperation[1] === "omitido" ? "omitido" : "rectificar",
          id = action === "omitido" ? null : cycleOperation[1].split("/")[0];
        const body = await jsonBody(req);
        return reply(
          cycleOperation[2]
            ? previewCycleOperation(
                db,
                action,
                id,
                body,
                Number(new URL(req.url).searchParams.get("page") ?? 1),
              )
            : writeCycleOperation(
                db,
                action,
                id,
                body,
                req.headers.get("idempotency-key") ?? "",
                now(),
              ),
          cycleOperation[2] ? 200 : action === "omitido" ? 201 : 200,
        );
      }
      const cycleAudit = path.match(/^\/api\/ciclos\/(\d+)\/historial$/);
      if (cycleAudit && req.method === "GET")
        return reply(
          db.transaction(() => ({ items: cycleHistory(db, cycleAudit[1]) }))(),
        );
      const cycle = path.match(/^\/api\/ciclos\/(\d+)$/);
      if (cycle && req.method === "GET")
        return reply(db.transaction(() => getCycle(db, cycle[1]))());
      if (path === "/api/presupuestos" && req.method === "GET")
        return reply(listBudgets(db, new URL(req.url).searchParams));
      if (path === "/api/presupuestos" && req.method === "POST") {
        const item = createBudget(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", "/api/presupuestos/" + item.id);
        return reply({ item }, 201);
      }
      if (path === "/api/presupuestos/opciones" && req.method === "GET")
        return reply(
          db.transaction(() => ({
            saldos: db
              .query(
                "SELECT id,nombre,estado FROM saldos WHERE id!='S000' ORDER BY id",
              )
              .all(),
            presupuestos: (
              db
                .query("SELECT id FROM presupuestos ORDER BY length(id),id")
                .all() as { id: string }[]
            ).map((r) => getBudget(db, r.id)),
          }))(),
        );
      const budget = path.match(
        /^\/api\/presupuestos\/(PRE\d+)(?:\/(impacto|rectificar|desactivar|reactivar))?$/,
      );
      if (budget) {
        const [, id, action] = budget;
        if (!action && req.method === "GET")
          return reply(
            db.transaction(() => ({
              item: getBudget(db, id),
              partidas: budgetParts(db, id),
              usos: budgetUsage(db, id),
            }))(),
          );
        if (!action && req.method === "PATCH")
          return reply({
            item: updateBudget(db, id, await jsonBody(req), now()),
          });
        if (action && req.method === "POST") {
          const body = await jsonBody(req);
          if (action === "impacto") return reply(previewBudget(db, id, body));
          if (action === "desactivar" || action === "reactivar")
            return reply({
              item: changeBudgetState(
                db,
                id,
                body,
                action === "reactivar",
                now(),
              ),
            });
          if (
            Object.keys(body).some(
              (k) => !["cambios", "fingerprint", "motivo"].includes(k),
            ) ||
            !body.cambios ||
            typeof body.cambios !== "object" ||
            Array.isArray(body.cambios)
          )
            throw new Problem(
              422,
              "VALIDATION",
              "Se requieren cambios y confirmación.",
            );
          return reply({
            item: updateBudget(
              db,
              id,
              body.cambios as Record<string, unknown>,
              now(),
              { fingerprint: body.fingerprint, motivo: body.motivo },
            ),
          });
        }
      }
      if (path === "/api/deudas" && req.method === "GET")
        return reply(listDebts(db, new URL(req.url).searchParams));
      if (path === "/api/deudas" && req.method === "POST") {
        const item = createDebt(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", "/api/deudas/" + item.id);
        return reply({ item }, 201);
      }
      const debt = path.match(
        /^\/api\/deudas\/(D\d+)(?:\/(desactivar|reactivar))?$/,
      );
      if (debt) {
        const [, id, action] = debt;
        if (!action && req.method === "GET")
          return reply(
            db.transaction(() => ({
              item: getDebt(db, id),
              usos: debtUsage(db, id),
              partidas: db
                .query(
                  "SELECT id,nombre,estado FROM partidas WHERE deuda=? ORDER BY id",
                )
                .all(id),
            }))(),
          );
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
                "Solo revisión para Estado.",
              );
            body = {
              revision: body.revision,
              estado: action === "reactivar" ? "Activa" : "Inactiva",
            };
          }
          return reply({ item: updateDebt(db, id, body, now()) });
        }
      }
      if (path === "/api/referencias" && req.method === "GET")
        return reply(listReferences(db, new URL(req.url).searchParams));
      if (path === "/api/referencias" && req.method === "POST") {
        const item = createReference(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", "/api/referencias/" + item.id);
        return reply({ item }, 201);
      }
      const reference = path.match(
        /^\/api\/referencias\/(REF\d+)(?:\/(desactivar|reactivar))?$/,
      );
      if (reference) {
        const [, id, action] = reference;
        if (!action && req.method === "GET")
          return reply(
            db.transaction(() => {
              const item = getReference(db, id),
                usos = referenceUsage(db, id),
                ficha = vehicleFicha(db, id),
                otherFicha = nonVehicleFicha(db, id),
                puedeConvertir =
                  item.tipo !== "Vehículo" &&
                  item.tipo !== "Anticipo" &&
                  !ficha &&
                  !otherFicha &&
                  usos.length === 0;
              return {
                item,
                usos,
                vehiculo: ficha,
                conversion: {
                  disponible: puedeConvertir,
                  motivo: puedeConvertir
                    ? null
                    : item.tipo === "Vehículo"
                      ? "La Referencia ya es un Vehículo."
                      : ficha
                        ? "La Referencia ya tiene una ficha."
                        : otherFicha || item.tipo === "Anticipo"
                          ? "La Referencia es un Anticipo y conserva su ficha."
                          : "La Referencia tiene hechos y E1.5 protege su Tipo.",
                },
              };
            })(),
          );
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
                "Solo se admite revisión para Estado.",
              );
            body = {
              revision: body.revision,
              estado: action === "reactivar" ? "Activa" : "Inactiva",
            };
          } else if ("estado" in body)
            throw new Problem(
              422,
              "VALIDATION",
              "El Estado solo se cambia por /desactivar o /reactivar.",
              { estado: "Usa la acción canónica de Estado." },
            );
          return reply({ item: updateReference(db, id, body, now()) });
        }
      }
      if (path === "/api/vehiculos/integridad" && req.method === "GET")
        return reply(
          vehicleIntegrity(
            db,
            new URL(req.url).searchParams.get("ejercicio"),
            now(),
            options.annualProvider,
          ),
        );
      if (path === "/api/vehiculos" && req.method === "GET")
        return reply(
          listVehicles(
            db,
            new URL(req.url).searchParams,
            now(),
            options.annualProvider,
          ),
        );
      const vehicle = path.match(/^\/api\/vehiculos\/(REF\d+)$/);
      if (vehicle && req.method === "GET")
        return reply(
          getVehicle(
            db,
            vehicle[1],
            new URL(req.url).searchParams.get("ejercicio"),
            now(),
            options.annualProvider,
          ),
        );
      if (path === "/api/movimientos/opciones" && req.method === "GET")
        return reply(movementOptions(db, now()));
      if (path === "/api/movimientos" && req.method === "GET")
        return reply(listMovements(db, new URL(req.url).searchParams));
      if (path === "/api/movimientos/impacto" && req.method === "POST")
        return reply(
          previewMovement(
            db,
            await jsonBody(req),
            null,
            false,
            now(),
            options.movementGuard,
          ),
        );
      if (path === "/api/movimientos" && req.method === "POST") {
        const result = writeMovement(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          null,
          false,
          now(),
          options.movementGuard,
        );
        headers.set("location", "/api/movimientos/" + result.movimiento.id);
        return reply(result, 201);
      }
      const movement = path.match(
        /^\/api\/movimientos\/(\d+)(?:\/(impacto|rectificar|anular|impacto-anulacion))?$/,
      );
      if (movement) {
        const [, id, action] = movement;
        if (!action && req.method === "GET") return reply(getMovement(db, id));
        if (action && req.method === "POST") {
          const body = await jsonBody(req),
            annul = action === "anular" || action === "impacto-anulacion";
          if (action === "impacto" || action === "impacto-anulacion")
            return reply(
              previewMovement(
                db,
                body,
                id,
                annul,
                now(),
                options.movementGuard,
              ),
            );
          return reply(
            writeMovement(
              db,
              body,
              req.headers.get("idempotency-key") ?? "",
              id,
              annul,
              now(),
              options.movementGuard,
            ),
          );
        }
      }
      const classification = path.match(
        /^\/api\/clasificacion\/(categorias|subcategorias|partidas)(?:\/((?:CAT|SUB|PAR)\d+)(?:\/(desactivar|reactivar|impacto|rectificar))?)?$/,
      );
      if (classification) {
        const [, name, id, action] = classification;
        const kind = entity(name);
        if (!id && req.method === "GET")
          return reply(
            listClassification(db, kind, new URL(req.url).searchParams),
          );
        if (!id && req.method === "POST") {
          const item = createClassification(
            db,
            kind,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          );
          headers.set("location", `/api/clasificacion/${kind}/${item.id}`);
          return reply({ item }, 201);
        }
        if (id && !action && req.method === "GET")
          return reply({
            item: getClassification(db, kind, id),
            dependencies: descendants(db, kind, id),
          });
        if (id && !action && req.method === "PATCH")
          return reply({
            item: updateClassification(
              db,
              kind,
              id,
              await jsonBody(req),
              options.classificationGuard,
              now(),
            ),
          });
        if (id && action && req.method === "POST") {
          const body = await jsonBody(req);
          if (action === "desactivar" || action === "reactivar")
            return reply({
              item: changeClassificationState(
                db,
                kind,
                id,
                body,
                action === "reactivar",
                now(),
              ),
            });
          if (action === "impacto")
            return reply(
              previewClassification(
                db,
                kind,
                id,
                body,
                options.classificationGuard,
              ),
            );
          if (action === "rectificar") {
            if (
              Object.keys(body).some(
                (k) => !["cambios", "fingerprint", "motivo"].includes(k),
              ) ||
              !body.cambios ||
              typeof body.cambios !== "object" ||
              Array.isArray(body.cambios)
            )
              throw new Problem(
                422,
                "VALIDATION",
                "Se requieren cambios y confirmación de rectificación.",
              );
            return reply({
              item: updateClassification(
                db,
                kind,
                id,
                body.cambios as Record<string, unknown>,
                options.classificationGuard,
                now(),
                { fingerprint: body.fingerprint, motivo: body.motivo },
              ),
            });
          }
        }
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
          ...p.details,
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
