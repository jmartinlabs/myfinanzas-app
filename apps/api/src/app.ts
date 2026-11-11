import {
  getCompartido,
  listCompartidos,
  createCompartido,
  createParticipante,
  previewParticipante,
  rectificarParticipante,
  bajaParticipante,
  previewAportacion,
  confirmAportacion,
  previewNuevaAportacion,
} from "./compartidos";
import { monthlyFlow } from "./flujo-mensual";
import {
  aperturaPreview,
  confirmApertura,
  confirmLineas,
  confirmMapping,
  confirmPartidaConfig,
  createPlanificacion,
  getPlanificacion,
  getPlanMensualDprima,
  listDprimaPartidas,
  listPlanificaciones,
  mappingProposal,
  previewLineas,
  previewPartidaConfig,
  writeMensual,
} from "./dprima";
import {
  activateRegimen,
  comidaOptions,
  getComidaMovement,
  listComida,
  prepareRegimen,
  regimenDto,
  writeComidaDevolucion,
  writeComidaMetadata,
  writeComidaRol,
} from "./comida";
import { e35Metrics } from "./e35";
import {
  getRevisionComida,
  listOperaciones,
  listReposiciones,
  revisionComidaOptions,
  createRevisionComida,
  rectificarRevisionComida,
  anularRevisionComida,
  vincularRevisionComida,
  previewRevisionComidaImpact,
  previewRevisionComidaCreationImpact,
} from "./revision-comida";
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
  createDebt,
  updateDebt,
  debtUsage,
  previewDebtImpact,
} from "./deudas";
import {
  getDeudaCompleta,
  listConciliacionesDeuda,
  listDeudasCompletas,
} from "./deuda-completa";
import {
  createConciliacion,
  updateConciliacion,
} from "./conciliaciones";
import {
  getReference,
  referenceUsage,
  listReferences,
  createReference,
  updateReference,
  previewReferenceImpact,
} from "./referencias";
import {
  getVehicle,
  listVehicles,
  vehicleIntegrity,
} from "./vehiculos";
import {
  changeInstrumentoState,
  createInstrumento,
  getInstrumento,
  instrumentoAudit,
  instrumentOptions,
  listInstrumentos,
  updateInstrumento,
} from "./instrumentos";
import {
  annulPurchase,
  createPurchase,
  getPurchase,
  listPurchases,
  previewAnnulment,
  previewPurchase,
  previewRectification,
  purchaseAudit,
  rectifyPurchase,
} from "./compras";
import {
  annulSale,
  createSale,
  getSale,
  listSales,
  previewSale,
  previewSaleAnnulment,
  previewSaleRectification,
  rectifySale,
  saleAudit,
} from "./ventas";
import { cashDto, civil } from "./investment-engine";
import {
  createValuation,
  e43Corte,
  e43Position,
  e43Series,
  e43Valuation,
  rectifyValuation,
} from "./e43";
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
  previewSaldoChange,
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
import {
  getPrecierre,
  getPrecierreEstado,
  type PrecierreOptions,
} from "./precierre";
import {
  confirmCierre,
  getCierreEstado,
  getFotoCierre,
  previewCierre,
  type CierreOptions,
} from "./e49";
import {
  getReaperturaElegibilidad,
  getReaperturaEstado,
  reabrirCierre,
  type ReaperturaOptions,
} from "./e410";
import {
  getRevalidacion,
  type RevalidacionOptions,
} from "./e410-revalidacion";
import {
  previewRecierre,
  reCerrarCiclo,
  type RecierreOptions,
} from "./e410-recierre";
import {
  cancelarReapertura,
  type CancelacionOptions,
} from "./e410-cancelacion";
import { getFotoCiclo, getVersionesFotoCiclo } from "./e411";
import { getContraste } from "./e411-contraste";
import {
  crearFotoPeriodo,
  getFotoPeriodo,
  getFotoPeriodoPorId,
} from "./e411-periodo";
import {
  listPendientes,
  getPendiente,
  type TipoItem,
} from "./pendientes";
import {
  listTransferenciasPendientes,
  getTransferenciaPendiente,
  crearTransferenciaPendienteConIntento,
  editarTransferenciaPendiente,
  previewImpactoTransferenciaPendiente,
  confirmarTransferenciaPendiente,
  cancelarTransferenciaPendiente,
  candidatosTransferenciaPendiente,
  vincularTransferenciaPendiente,
} from "./transferencias-pendientes";
import { conciliacionCiclo } from "./conciliacion-ciclos";
import { resumenInicio } from "./resumen-inicio";
import { resumenAnual } from "./resumen-anual";
import { assertDemoDatabase, type DemoScope } from "./demo-mode";

export type AppOptions = {
  annualProvider?: AnnualProvider;
  classificationGuard?: ClassificationGuard;
  movementGuard?: MovementProtection;
  precierre?: PrecierreOptions;
  cierre?: CierreOptions;
  reapertura?: ReaperturaOptions;
  revalidacion?: RevalidacionOptions;
  recierre?: RecierreOptions;
  cancelacion?: CancelacionOptions;
  key: Buffer;
  origin?: string;
  now?: () => number;
  impactGuard?: ImpactGuard;
  /**
   * Doble de contrato de prueba para R6. No es un almacén ni un valor por
   * defecto: sin él, `minimoObjetivo` queda `No disponible`.
   */
  resumenInicio?: { mesesObjetivo?: number | null };
  /** Alcance DEMO ya validado en el arranque; ausente en TEST y PROD. */
  demo?: DemoScope;
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
  if (options.demo) assertDemoDatabase(db, options.demo);
  const auth = new Auth(
    db,
    options.key,
    options.origin,
    options.now,
    options.demo?.origins,
  );
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
        return reply({
          configured: auth.configured(),
          ...(options.demo ? { demo: true } : {}),
        });
      if (
        options.demo &&
        req.method === "POST" &&
        [
          "/api/auth/enroll",
          "/api/auth/login",
          "/api/auth/mfa",
          "/api/auth/recover",
        ].includes(path)
      )
        throw new Problem(
          403,
          "DEMO_MODE",
          "El modo DEMO no admite credenciales ni segundo factor.",
        );
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
      let session: { csrf: string };
      if (options.demo) {
        const demo = auth.demoSession(req);
        if (demo.created)
          headers.append(
            "set-cookie",
            auth.cookie(auth.cookieName, demo.session, 43200),
          );
        session = { csrf: demo.csrf };
      } else session = auth.session(req);
      if (path === "/api/auth/session" && req.method === "GET")
        return reply({
          csrf: session.csrf,
          ...(options.demo ? { demo: true } : {}),
        });
      if (path === "/api/auth/logout" && req.method === "POST") {
        auth.logout(req);
        headers.append("set-cookie", auth.cookie(auth.cookieName, "", 0));
        return reply({ ok: true });
      }
      // E4.6 — composición de solo lectura: un único GET, sin escrituras.
      if (path === "/api/resumen-inicio") {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El resumen de inicio es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            resumenInicio(db, now(), {
              annualProvider: options.annualProvider,
              mesesObjetivo: options.resumenInicio?.mesesObjetivo,
            }),
          )(),
        );
      }
      // E4.7 — composición anual de solo lectura: un único GET, sin escrituras.
      if (path === "/api/resumen-anual") {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El resumen anual es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            resumenAnual(
              db,
              new URL(req.url).searchParams,
              now(),
              { annualProvider: options.annualProvider },
            ),
          )(),
        );
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
      // SPEC36 I1 — shared Transferencia pendiente. Writes are authenticated
      // and CSRF-checked by `auth.session`; each one owns one IMMEDIATE tx.
      const pendingTransfers = path.match(
        /^\/api\/transferencias-pendientes(?:\/(\d+)(?:\/(impacto|confirmar|cancelar|vincular|candidatos))?)?$/,
      );
      if (pendingTransfers) {
        const [, rawId, action] = pendingTransfers;
        if (!rawId) {
          if (req.method === "GET")
            return reply(
              listTransferenciasPendientes(
                db,
                new URL(req.url).searchParams,
                now(),
              ),
            );
          if (req.method === "POST") {
            const item = crearTransferenciaPendienteConIntento(
              db,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            );
            headers.set("location", `/api/transferencias-pendientes/${item.id}`);
            return reply({ item }, 201);
          }
          headers.set("allow", "GET, POST");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "Las Transferencias pendientes se consultan con GET y se crean con POST.",
          );
        }
        const id = Number(rawId);
        if (!Number.isSafeInteger(id) || id < 1)
          throw new Problem(404, "NOT_FOUND", "Recurso no encontrado.");
        if (!action) {
          if (req.method === "GET")
            return reply(getTransferenciaPendiente(db, id, now()));
          if (req.method === "PATCH") {
            const item = editarTransferenciaPendiente(
              db,
              id,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            );
            return reply({ item });
          }
          headers.set("allow", "GET, PATCH");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "La Transferencia pendiente se consulta con GET y se edita con PATCH.",
          );
        }
        if (action === "candidatos" && req.method === "GET")
          return reply(candidatosTransferenciaPendiente(db, id));
        if (action === "candidatos") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "Los candidatos son de solo lectura.",
          );
        }
        if (action === "impacto" && req.method === "POST")
          return reply(
            previewImpactoTransferenciaPendiente(
              db,
              id,
              await jsonBody(req),
              now(),
              options.movementGuard,
            ),
          );
        if (action === "confirmar" && req.method === "POST")
          return reply({
            item: confirmarTransferenciaPendiente(
              db,
              id,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
              options.movementGuard,
            ),
          });
        if (action === "cancelar" && req.method === "POST")
          return reply({
            item: cancelarTransferenciaPendiente(
              db,
              id,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
          });
        if (action === "vincular" && req.method === "POST")
          return reply({
            item: vincularTransferenciaPendiente(
              db,
              id,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
          });
        if (req.method !== "POST") {
          headers.set("allow", "POST");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "Esta acción de la Transferencia pendiente se ejecuta con POST.",
          );
        }
      }
      // E3.6 — solo lectura: sin POST/PATCH/DELETE, sin importes en la URL.
      if (path === "/api/pendientes" && req.method === "GET")
        return reply(listPendientes(db, new URL(req.url).searchParams, now()));
      const pendiente = path.match(/^\/api\/pendientes\/([^/]+)\/([^/]+)$/);
      if (pendiente && req.method === "GET") {
        let tipo: string, fuenteId: string;
        try {
          tipo = decodeURIComponent(pendiente[1]);
          fuenteId = decodeURIComponent(pendiente[2]);
        } catch {
          throw new Problem(422, "VALIDATION", "Identificador de pendiente inválido.");
        }
        return reply(getPendiente(db, tipo as TipoItem, fuenteId, now()));
      }
      const conciliacion = path.match(/^\/api\/conciliacion\/ciclos\/([^/]+)$/);
      if (conciliacion && req.method === "GET") {
        let cicloId: string;
        try {
          cicloId = decodeURIComponent(conciliacion[1]);
        } catch {
          throw new Problem(422, "VALIDATION", "ID de ciclo inválido.");
        }
        return reply(conciliacionCiclo(db, cicloId, now()));
      }
      if (path === "/api/dprima/partidas" && req.method === "GET")
        return reply(listDprimaPartidas(db));
      if (
        path === "/api/dprima/planificaciones" &&
        req.method === "GET"
      )
        return reply({ planificaciones: listPlanificaciones(db) });
      if (
        path === "/api/dprima/planificaciones" &&
        req.method === "POST"
      ) {
        const item = createPlanificacion(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", "/api/dprima/planificaciones/" + item.planificacion.id);
        return reply(item, 201);
      }
      if (path === "/api/dprima/mapping" && req.method === "GET")
        return reply(mappingProposal(db));
      if (path === "/api/dprima/mapping/confirmar" && req.method === "POST")
        return reply(
          confirmMapping(
            db,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          ),
        );
      const dprimaMensual = path.match(/^\/api\/dprima\/mensual\/(\d+)$/);
      if (dprimaMensual) {
        if (req.method === "GET")
          return reply(getPlanMensualDprima(db, dprimaMensual[1], now()));
        if (req.method === "POST")
          return reply(
            writeMensual(
              db,
              dprimaMensual[1],
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
          );
      }
      const dprimaPartida = path.match(
        /^\/api\/dprima\/partidas\/(PAR\d+)\/(impacto|confirmar)$/,
      );
      if (dprimaPartida && req.method === "POST") {
        const body = await jsonBody(req);
        return reply(
          dprimaPartida[2] === "impacto"
            ? previewPartidaConfig(db, dprimaPartida[1], body)
            : confirmPartidaConfig(
                db,
                dprimaPartida[1],
                body,
                req.headers.get("idempotency-key") ?? "",
                now(),
              ),
        );
      }
      const dprimaPlan = path.match(
        /^\/api\/dprima\/planificaciones\/(DP\d+)(?:\/(lineas|apertura)\/(impacto|confirmar))?$/,
      );
      if (dprimaPlan) {
        const [, id, action, phase] = dprimaPlan;
        if (!action && req.method === "GET")
          return reply(getPlanificacion(db, id));
        if (action && phase && req.method === "POST") {
          const body = await jsonBody(req),
            key = req.headers.get("idempotency-key") ?? "";
          if (action === "lineas")
            return reply(
              phase === "impacto"
                ? previewLineas(db, id, body)
                : confirmLineas(db, id, body, key, now()),
            );
          return reply(
            phase === "impacto"
              ? aperturaPreview(db, id, body, now())
              : confirmApertura(db, id, body, key, now()),
          );
        }
      }
      if (path === "/api/comida/opciones" && req.method === "GET")
        return reply(comidaOptions(db));
      if (path === "/api/comida/regimen" && req.method === "GET")
        return reply(regimenDto(db));
      if (path === "/api/comida/regimen/preparar" && req.method === "POST")
        return reply(
          prepareRegimen(
            db,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          ),
        );
      if (path === "/api/comida/regimen/activar" && req.method === "POST")
        return reply(
          activateRegimen(
            db,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          ),
        );
      const comidaMetricsPath = path.match(
        /^\/api\/comida\/metricas\/(\d+)$/,
      );
      if (comidaMetricsPath && req.method === "GET")
        return reply(e35Metrics(db, comidaMetricsPath[1], now()));
      if (path === "/api/comida" && req.method === "GET")
        return reply(listComida(db, new URL(req.url).searchParams));
      const comidaAction = path.match(
        /^\/api\/comida\/(\d+)\/(metadata|devolucion|rol)$/,
      );
      if (comidaAction && req.method === "POST") {
        const body = await jsonBody(req),
          key = req.headers.get("idempotency-key") ?? "";
        if (comidaAction[2] === "metadata")
          return reply(
            writeComidaMetadata(db, comidaAction[1], body, key, now()),
          );
        if (comidaAction[2] === "devolucion")
          return reply(
            writeComidaDevolucion(db, comidaAction[1], body, key, now()),
          );
        return reply(writeComidaRol(db, comidaAction[1], body, key, now()));
      }
      const comida = path.match(/^\/api\/comida\/(\d+)$/);
      if (comida && req.method === "GET")
        return reply(getComidaMovement(db, comida[1]));
      if (path === "/api/revision-comida/opciones" && req.method === "GET")
        return reply(revisionComidaOptions(db, now()));
      if (path === "/api/revision-comida/impacto" && req.method === "POST")
        return reply(
          previewRevisionComidaCreationImpact(
            db,
            await jsonBody(req),
            "Detalle",
            now(),
          ),
        );
      if (path === "/api/revision-comida" && req.method === "GET")
        return reply(listOperaciones(db, new URL(req.url).searchParams));
      if (path === "/api/revision-comida" && req.method === "POST") {
        const item = createRevisionComida(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
          "Detalle",
        );
        headers.set(
          "location",
          "/api/revision-comida/" + item.operacion.id,
        );
        return reply(item, 201);
      }
      if (
        path === "/api/revision-comida/reposiciones" &&
        req.method === "GET"
      )
        return reply(listReposiciones(db, new URL(req.url).searchParams));
      if (
        path === "/api/revision-comida/reposiciones/impacto" &&
        req.method === "POST"
      )
        return reply(
          previewRevisionComidaCreationImpact(
            db,
            await jsonBody(req),
            "Reposicion",
            now(),
          ),
        );
      if (
        path === "/api/revision-comida/reposiciones" &&
        req.method === "POST"
      ) {
        const item = createRevisionComida(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
          "Reposicion",
        );
        headers.set(
          "location",
          "/api/revision-comida/reposiciones/" + item.operacion.id,
        );
        return reply(item, 201);
      }
      const reposicion = path.match(
        /^\/api\/revision-comida\/reposiciones\/(\d+)(?:\/(rectificar|anular|vinculo|impacto))?$/,
      );
      if (reposicion) {
        const [, id, action] = reposicion;
        if (!action && req.method === "GET")
          return reply(getRevisionComida(db, id, "Reposicion"));
        if (action && req.method === "POST") {
          const body = await jsonBody(req),
            key = req.headers.get("idempotency-key") ?? "";
          if (action === "impacto")
            return reply(
              previewRevisionComidaImpact(db, id, body, "Reposicion"),
            );
          if (action === "rectificar")
            return reply(
              rectificarRevisionComida(db, id, body, key, now(), "Reposicion"),
            );
          if (action === "anular")
            return reply(
              anularRevisionComida(db, id, body, key, now(), "Reposicion"),
            );
          return reply(
            vincularRevisionComida(db, id, body, key, now(), "Reposicion"),
          );
        }
      }
      const revision = path.match(
        /^\/api\/revision-comida\/(\d+)(?:\/(rectificar|anular|vinculo|impacto))?$/,
      );
      if (revision) {
        const [, id, action] = revision;
        if (!action && req.method === "GET")
          return reply(getRevisionComida(db, id, "Detalle"));
        if (action && req.method === "POST") {
          const body = await jsonBody(req),
            key = req.headers.get("idempotency-key") ?? "";
          if (action === "impacto")
            return reply(previewRevisionComidaImpact(db, id, body, "Detalle"));
          if (action === "rectificar")
            return reply(
              rectificarRevisionComida(db, id, body, key, now(), "Detalle"),
            );
          if (action === "anular")
            return reply(
              anularRevisionComida(db, id, body, key, now(), "Detalle"),
            );
          return reply(
            vincularRevisionComida(db, id, body, key, now(), "Detalle"),
          );
        }
      }
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
      const aportacionPath = path.match(
        /^\/api\/compartidos\/fichas\/(REF\d+)\/movimientos\/(\d+)\/acreditar(?:\/(preview))?$/,
      );
      if (aportacionPath) {
        const [, ref, movement, preview] = aportacionPath;
        if (preview && req.method === "POST")
          return reply(
            previewAportacion(db, ref, movement, await jsonBody(req)),
          );
        if (!preview && req.method === "POST")
          return reply(
            confirmAportacion(
              db,
              ref,
              movement,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
          );
      }
      if (path === "/api/compartidos/fichas" && req.method === "GET")
        return reply(listCompartidos(db, new URL(req.url).searchParams));
      if (path === "/api/compartidos/fichas" && req.method === "POST")
        return reply(
          createCompartido(
            db,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          ),
          201,
        );
      const compartidoPath = path.match(
        /^\/api\/compartidos\/fichas\/(REF\d+)(?:\/participantes(?:\/(CP\d+)(?:\/(impacto|rectificar|baja))?)?)?$/,
      );
      if (compartidoPath) {
        const [, ref, participant, action] = compartidoPath;
        if (!participant && req.method === "GET")
          return reply(getCompartido(db, ref));
        if (!participant && req.method === "POST")
          return reply(
            createParticipante(
              db,
              ref,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
            201,
          );
        if (participant && action === "impacto" && req.method === "POST")
          return reply(
            previewParticipante(db, ref, participant, await jsonBody(req)),
          );
        if (participant && action === "rectificar" && req.method === "POST")
          return reply(
            rectificarParticipante(
              db,
              ref,
              participant,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
          );
        if (participant && action === "baja" && req.method === "POST")
          return reply(
            bajaParticipante(
              db,
              ref,
              participant,
              await jsonBody(req),
              req.headers.get("idempotency-key") ?? "",
              now(),
            ),
          );
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
      const precierre = path.match(/^\/api\/cierres\/precierre\/(\d+)$/);
      if (precierre) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El precierre es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            getPrecierre(db, precierre[1], now(), options.precierre),
          )(),
        );
      }
      const cierreEstado = path.match(/^\/api\/cierres\/(\d+)\/estado$/);
      if (cierreEstado) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El estado de cierre es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() => ({
            // E4.8 shape stays at the top level (SPEC26 AC-15); the E4.9
            // closure state and the E4.10 reopening state are additive.
            ...getPrecierreEstado(db, cierreEstado[1], now(), options.precierre),
            cierre: getCierreEstado(db, cierreEstado[1]),
            reapertura: {
              ...getReaperturaEstado(db, cierreEstado[1]),
              elegibilidad: getReaperturaElegibilidad(db, cierreEstado[1]),
            },
          }))(),
        );
      }
      const cierrePreflight = path.match(
        /^\/api\/cierres\/(\d+)\/preflight$/,
      );
      if (cierrePreflight) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El preflight de cierre es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            previewCierre(db, cierrePreflight[1], options.cierre, now()),
          )(),
        );
      }
      const cierreFoto = path.match(/^\/api\/cierres\/(\d+)\/foto$/);
      if (cierreFoto) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "La foto de cierre es de solo lectura.",
          );
        }
        const rawVersion = new URL(req.url).searchParams.get("version");
        let version: number | undefined;
        if (rawVersion !== null) {
          version = Number(rawVersion);
          if (
            !Number.isSafeInteger(version) ||
            version < 1 ||
            rawVersion !== String(version)
          )
            throw new Problem(422, "VALIDATION", "Versión de foto inválida.", {
              version: "Indica una versión positiva.",
            });
        }
        return reply(
          db.transaction(() => getFotoCierre(db, cierreFoto[1], version))(),
        );
      }
      const cierreState = path.match(/^\/api\/cierres\/(\d+)\/cierre$/);
      if (cierreState) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El estado de cierre es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() => getCierreEstado(db, cierreState[1]))(),
        );
      }
      const cierreConfirm = path.match(/^\/api\/cierres\/(\d+)\/cerrar$/);
      if (cierreConfirm) {
        if (req.method !== "POST") {
          headers.set("allow", "POST");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El cierre se confirma con POST.",
          );
        }
        const result = confirmCierre(
          db,
          cierreConfirm[1],
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          options.cierre,
          now(),
        );
        headers.set("location", `/api/cierres/${cierreConfirm[1]}/foto`);
        return reply(result, 201);
      }
      const reaperturaEstado = path.match(
        /^\/api\/cierres\/(\d+)\/reapertura$/,
      );
      if (reaperturaEstado) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El estado de reapertura es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            getReaperturaEstado(db, reaperturaEstado[1]),
          )(),
        );
      }
      const revalidacion = path.match(
        /^\/api\/cierres\/(\d+)\/revalidacion$/,
      );
      if (revalidacion) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "La revalidación de dependencias es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            getRevalidacion(db, revalidacion[1], options.revalidacion),
          )(),
        );
      }
      const reabrirCierrePath = path.match(
        /^\/api\/cierres\/(\d+)\/reabrir$/,
      );
      if (reabrirCierrePath) {
        if (req.method !== "POST") {
          headers.set("allow", "POST");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "La reapertura se confirma con POST.",
          );
        }
        const result = reabrirCierre(
          db,
          reabrirCierrePath[1],
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          options.reapertura,
          now(),
        );
        headers.set(
          "location",
          `/api/cierres/${reabrirCierrePath[1]}/reapertura`,
        );
        return reply(result, 201);
      }
      const repreview = path.match(
        /^\/api\/cierres\/(\d+)\/repreflight$/,
      );
      if (repreview) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "La vista previa del re-cierre es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            previewRecierre(
              db,
              repreview[1],
              {
                ...options.cierre,
                ...options.revalidacion,
                ...options.recierre,
              },
              now(),
            ),
          )(),
        );
      }
      const reCerrarPath = path.match(
        /^\/api\/cierres\/(\d+)\/recerrar$/,
      );
      if (reCerrarPath) {
        if (req.method !== "POST") {
          headers.set("allow", "POST");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El re-cierre se confirma con POST.",
          );
        }
        const result = reCerrarCiclo(
          db,
          reCerrarPath[1],
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          {
            ...options.cierre,
            ...options.revalidacion,
            ...options.recierre,
          },
          now(),
        );
        const version = (result as { foto?: { version?: number } }).foto
          ?.version;
        headers.set(
          "location",
          version
            ? `/api/cierres/${reCerrarPath[1]}/foto?version=${version}`
            : `/api/cierres/${reCerrarPath[1]}/foto`,
        );
        return reply(result, 201);
      }
      const cancelarReaperturaPath = path.match(
        /^\/api\/cierres\/(\d+)\/(?:reapertura\/cancelar|cancelar)$/,
      );
      if (cancelarReaperturaPath) {
        if (req.method !== "POST") {
          headers.set("allow", "POST");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "La cancelación de la reapertura se confirma con POST.",
          );
        }
        const result = cancelarReapertura(
          db,
          cancelarReaperturaPath[1],
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          { ...options.cierre, ...options.cancelacion },
          now(),
        );
        headers.set(
          "location",
          `/api/cierres/${cancelarReaperturaPath[1]}/reapertura`,
        );
        return reply(result, 200);
      }
      // E4.11 I4 — contraste vivo de solo lectura. Etiquetado `CalculoVivo`,
      // separado de toda foto y sin escribir ni completar bloques No disponible.
      if (path === "/api/fotos/contraste") {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El contraste vivo es de solo lectura.",
          );
        }
        const params = new URL(req.url).searchParams;
        if (params.has("tipoRegistro"))
          throw new Problem(
            422,
            "VALIDATION",
            "El contraste vivo no mezcla fuentes: no admite tipoRegistro.",
            {
              tipoRegistro:
                "Parámetro no admitido; el contraste es solo E2.6 y no lee el archivo E4.5.",
            },
          );
        const ciclo = params.get("ciclo");
        if (ciclo === null || !/^\d+$/.test(ciclo))
          throw new Problem(422, "VALIDATION", "ID Ciclo inválido.", {
            ciclo: "Indica un ciclo válido.",
          });
        return reply(
          db.transaction(() => getContraste(db, ciclo, now()))(),
        );
      }
      // E4.11 I3 — agregado persistido de trimestre/año. La única escritura
      // de E4.11 vive aquí; las lecturas no recalculan desde motores vivos.
      if (path === "/api/fotos/periodos") {
        if (req.method === "POST") {
          const result = crearFotoPeriodo(
            db,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            {
              actor: options.cierre?.actor,
              appVersion: options.cierre?.appVersion,
            },
            now(),
          );
          headers.set("location", `/api/fotos/periodos/${result.id}`);
          return reply(result, 201);
        }
        if (req.method === "GET")
          return reply(
            db.transaction(() =>
              getFotoPeriodo(db, new URL(req.url).searchParams, now()),
            )(),
          );
        headers.set("allow", "GET, POST");
        throw new Problem(
          405,
          "METHOD_NOT_ALLOWED",
          "El agregado de periodo se crea con POST y se consulta con GET.",
        );
      }
      const fotoPeriodo = path.match(/^\/api\/fotos\/periodos\/(\d+)$/);
      if (fotoPeriodo) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El agregado de periodo es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            getFotoPeriodoPorId(db, Number(fotoPeriodo[1])),
          )(),
        );
      }
      // E4.11 I1 — consulta de solo lectura de fotos de ciclo y versiones.
      const fotoVersiones = path.match(
        /^\/api\/fotos\/ciclos\/([^/]+)\/versiones$/,
      );
      if (fotoVersiones) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "El índice de versiones es de solo lectura.",
          );
        }
        return reply(
          db.transaction(() =>
            getVersionesFotoCiclo(db, fotoVersiones[1]),
          )(),
        );
      }
      const fotoCiclo = path.match(/^\/api\/fotos\/ciclos\/([^/]+)$/);
      if (fotoCiclo) {
        if (req.method !== "GET") {
          headers.set("allow", "GET");
          throw new Problem(
            405,
            "METHOD_NOT_ALLOWED",
            "La foto de ciclo es de solo lectura.",
          );
        }
        const rawVersion = new URL(req.url).searchParams.get("version");
        let version: number | undefined;
        if (rawVersion !== null) {
          version = Number(rawVersion);
          if (
            !Number.isSafeInteger(version) ||
            version < 1 ||
            rawVersion !== String(version)
          )
            throw new Problem(422, "VALIDATION", "Versión de foto inválida.", {
              version: "Indica una versión positiva.",
            });
        }
        return reply(
          db.transaction(() => getFotoCiclo(db, fotoCiclo[1], version))(),
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
                Number(new URL(req.url).searchParams.get("comidaPage") ?? 1),
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
        return reply(
          listDeudasCompletas(db, new URL(req.url).searchParams),
        );
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
      const debtConciliaciones = path.match(
        /^\/api\/deudas\/(D\d+)\/conciliaciones(?:\/(C\d+))?$/,
      );
      if (debtConciliaciones) {
        const [, debtId, conciliacionId] = debtConciliaciones;
        if (!conciliacionId && req.method === "GET")
          return reply({
            items: listConciliacionesDeuda(db, debtId),
          });
        if (!conciliacionId && req.method === "POST") {
          const item = createConciliacion(
            db,
            debtId,
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          );
          headers.set(
            "location",
            `/api/deudas/${debtId}/conciliaciones/${item.id}`,
          );
          return reply({ item }, 201);
        }
        if (conciliacionId && req.method === "PATCH")
          return reply({
            item: updateConciliacion(
              db,
              debtId,
              conciliacionId,
              await jsonBody(req),
              now(),
            ),
          });
      }
      const debt = path.match(
        /^\/api\/deudas\/(D\d+)(?:\/(desactivar|reactivar|impacto))?$/,
      );
      if (debt) {
        const [, id, action] = debt;
        if (!action && req.method === "GET")
          return reply(
            db.transaction(() => ({
              item: getDeudaCompleta(
                db,
                id,
                new URL(req.url).searchParams.get("corte"),
                now(),
              ),
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
          if (action === "impacto")
            return reply(previewDebtImpact(db, id, body));
          if (action) {
            if (
              Object.keys(body).some(
                (k) => !["revision", "motivo", "fingerprint"].includes(k),
              )
            )
              throw new Problem(
                422,
                "VALIDATION",
                "Solo revisión, motivo y huella para Estado.",
              );
            body = {
              revision: body.revision,
              estado: action === "reactivar" ? "Activa" : "Inactiva",
              ...(body.motivo === undefined
                ? {}
                : { motivo: body.motivo }),
              ...(body.fingerprint === undefined
                ? {}
                : { fingerprint: body.fingerprint }),
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
        /^\/api\/referencias\/(REF\d+)(?:\/(desactivar|reactivar|impacto))?$/,
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
                          ? "La Referencia es un Anticipo y no admite conversión a Vehículo."
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
          if (action === "impacto")
            return reply(previewReferenceImpact(db, id, body));
          if (action) {
            if (
              Object.keys(body).some(
                (k) => !["revision", "motivo", "fingerprint"].includes(k),
              )
            )
              throw new Problem(
                422,
                "VALIDATION",
                "Solo se admite revisión, motivo y huella para Estado.",
              );
            body = {
              revision: body.revision,
              estado: action === "reactivar" ? "Activa" : "Inactiva",
              ...(body.motivo === undefined ? {} : { motivo: body.motivo }),
              ...(body.fingerprint === undefined
                ? {}
                : { fingerprint: body.fingerprint }),
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
      if (path === "/api/inversiones/efectivo" && req.method === "GET") {
        const params = new URL(req.url).searchParams,
          saldo = params.get("saldo") ?? "",
          fecha = params.get("fecha") || null;
        if (!/^S\d+$/.test(saldo))
          throw new Problem(422, "VALIDATION", "Saldo inválido.", {
            saldo: "Selecciona un Saldo existente.",
          });
        return reply(cashDto(db, saldo, fecha ? civil(fecha) : null));
      }
      if (path === "/api/e43/corte" && req.method === "GET")
        return reply(
          e43Corte(db, new URL(req.url).searchParams.get("fecha") ?? ""),
        );
      const e43SeriesPath = path.match(
        /^\/api\/e43\/posiciones\/(S\d+)\/(I\d+)\/valoraciones$/,
      );
      if (e43SeriesPath) {
        const params = new URL(req.url).searchParams;
        if (req.method === "GET")
          return reply(
            e43Series(
              db,
              e43SeriesPath[1],
              e43SeriesPath[2],
              params.get("desde"),
              params.get("hasta"),
            ),
          );
        if (req.method === "POST") {
          const result = createValuation(
            db,
            e43SeriesPath[1],
            e43SeriesPath[2],
            await jsonBody(req),
            req.headers.get("idempotency-key") ?? "",
            now(),
          );
          headers.set(
            "location",
            `/api/e43/valoraciones/${result.valoracion.id}`,
          );
          return reply(result, 201);
        }
      }
      const e43PositionPath = path.match(
        /^\/api\/e43\/posiciones\/(S\d+)\/(I\d+)$/,
      );
      if (e43PositionPath && req.method === "GET")
        return reply(
          e43Position(
            db,
            e43PositionPath[1],
            e43PositionPath[2],
            new URL(req.url).searchParams.get("fecha") ?? "",
          ),
        );
      const e43ValuationPath = path.match(
        /^\/api\/e43\/valoraciones\/(VAL-\d{12})$/,
      );
      if (e43ValuationPath && req.method === "GET")
        return reply(e43Valuation(db, e43ValuationPath[1]));
      const e43RectifyPath = path.match(
        /^\/api\/e43\/valoraciones\/(VAL-\d{12})\/rectificar$/,
      );
      if (e43RectifyPath && req.method === "POST")
        return reply(
          rectifyValuation(
            db,
            e43RectifyPath[1],
            await jsonBody(req),
            now(),
          ),
        );
      if (path === "/api/instrumentos/opciones" && req.method === "GET")
        return reply(instrumentOptions(db));
      if (path === "/api/instrumentos" && req.method === "GET")
        return reply(listInstrumentos(db, new URL(req.url).searchParams));
      if (path === "/api/instrumentos" && req.method === "POST") {
        const result = createInstrumento(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set(
          "location",
          `/api/instrumentos/${result.instrumento.id}`,
        );
        return reply(result, 201);
      }
      const instrumentAudit = path.match(
        /^\/api\/instrumentos\/(I\d+)\/auditoria$/,
      );
      if (instrumentAudit && req.method === "GET")
        return reply(instrumentoAudit(db, instrumentAudit[1]));
      const instrumentState = path.match(
        /^\/api\/instrumentos\/(I\d+)\/(desactivar|reactivar)$/,
      );
      if (instrumentState && req.method === "POST")
        return reply({
          instrumento: changeInstrumentoState(
            db,
            instrumentState[1],
            await jsonBody(req),
            instrumentState[2] === "reactivar",
            now(),
          ),
        });
      const instrument = path.match(/^\/api\/instrumentos\/(I\d+)$/);
      if (instrument && req.method === "GET")
        return reply(getInstrumento(db, instrument[1]));
      if (instrument && req.method === "PATCH")
        return reply({
          instrumento: updateInstrumento(
            db,
            instrument[1],
            await jsonBody(req),
            now(),
          ),
        });
      if (path === "/api/ventas/impacto" && req.method === "POST")
        return reply(previewSale(db, await jsonBody(req), now()));
      if (path === "/api/ventas" && req.method === "GET")
        return reply(listSales(db, new URL(req.url).searchParams));
      if (path === "/api/ventas" && req.method === "POST") {
        const result = createSale(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", `/api/ventas/${result.venta.id}`);
        return reply(result, 201);
      }
      const saleAuditPath = path.match(/^\/api\/ventas\/(\d+)\/auditoria$/);
      if (saleAuditPath && req.method === "GET")
        return reply(saleAudit(db, saleAuditPath[1]));
      const saleAction = path.match(
        /^\/api\/ventas\/(\d+)\/(impacto|impacto-anulacion|rectificar|anular)$/,
      );
      if (saleAction && req.method === "POST") {
        const [, id, action] = saleAction,
          body = await jsonBody(req);
        if (action === "impacto")
          return reply(previewSaleRectification(db, id, body, now()));
        if (action === "impacto-anulacion")
          return reply(previewSaleAnnulment(db, id, body));
        if (action === "rectificar")
          return reply(rectifySale(db, id, body, now()));
        return reply(annulSale(db, id, body, now()));
      }
      const sale = path.match(/^\/api\/ventas\/(\d+)$/);
      if (sale && req.method === "GET")
        return reply(getSale(db, sale[1]));
      if (path === "/api/compras/impacto" && req.method === "POST")
        return reply(
          previewPurchase(db, await jsonBody(req), now()),
        );
      if (path === "/api/compras" && req.method === "GET")
        return reply(listPurchases(db, new URL(req.url).searchParams));
      if (path === "/api/compras" && req.method === "POST") {
        const result = createPurchase(
          db,
          await jsonBody(req),
          req.headers.get("idempotency-key") ?? "",
          now(),
        );
        headers.set("location", `/api/compras/${result.compra.id}`);
        return reply(result, 201);
      }
      const purchaseAuditPath = path.match(
        /^\/api\/compras\/(\d+)\/auditoria$/,
      );
      if (purchaseAuditPath && req.method === "GET")
        return reply(purchaseAudit(db, purchaseAuditPath[1]));
      const purchaseAction = path.match(
        /^\/api\/compras\/(\d+)\/(impacto|impacto-anulacion|rectificar|anular)$/,
      );
      if (purchaseAction && req.method === "POST") {
        const [, id, action] = purchaseAction,
          body = await jsonBody(req);
        if (action === "impacto")
          return reply(previewRectification(db, id, body, now()));
        if (action === "impacto-anulacion")
          return reply(previewAnnulment(db, id, body));
        if (action === "rectificar")
          return reply(rectifyPurchase(db, id, body, now()));
        return reply(annulPurchase(db, id, body, now()));
      }
      const purchase = path.match(/^\/api\/compras\/(\d+)$/);
      if (purchase && req.method === "GET")
        return reply(getPurchase(db, purchase[1]));
      if (path === "/api/movimientos/opciones" && req.method === "GET")
        return reply(movementOptions(db, now()));
      if (path === "/api/movimientos" && req.method === "GET")
        return reply(listMovements(db, new URL(req.url).searchParams));
      if (path === "/api/movimientos/impacto" && req.method === "POST") {
        const body = await jsonBody(req),
          plan = previewMovement(
            db,
            body,
            null,
            false,
            now(),
            options.movementGuard,
          );
        const referencia =
          typeof body.referencia === "string" ? body.referencia : null;
        return reply(
          referencia &&
            body.tipo === "Transferencia" &&
            body.origen === "S000" &&
            body.compartido
            ? {
                ...plan,
                compartidoImpacto: previewNuevaAportacion(db, referencia, body),
              }
            : plan,
        );
      }
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
        /^\/api\/saldos\/(S\d+)(?:\/(desactivar|reactivar|impacto|rectificar))?$/,
      );
      if (match) {
        const [, id, action] = match;
        if (!action && req.method === "GET")
          return reply({ saldo: getSaldo(db, id) });
        if (action === "impacto" && req.method === "POST")
          return reply(
            previewSaldoChange(
              db,
              id,
              await jsonBody(req),
              options.impactGuard,
            ),
          );
        if (action === "rectificar" && req.method === "POST") {
          const body = await jsonBody(req);
          const cambios = body.cambios;
          if (
            !cambios ||
            typeof cambios !== "object" ||
            Array.isArray(cambios)
          )
            throw new Problem(
              422,
              "VALIDATION",
              "Envía los cambios del Saldo en cambios.",
              { cambios: "Objeto de cambios." },
            );
          if (
            Object.keys(body).some(
              (key) =>
                !["cambios", "motivo", "fingerprint"].includes(key),
            )
          )
            throw new Problem(
              422,
              "VALIDATION",
              "Campo no editable en la rectificación del Saldo.",
            );
          return reply({
            saldo: updateSaldo(
              db,
              id,
              cambios as Record<string, unknown>,
              options.impactGuard,
              now(),
              {
                fingerprint: body.fingerprint,
                motivo: body.motivo,
              },
            ),
          });
        }
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
          : e instanceof Error &&
              /SQLITE_CONSTRAINT/.test((e as { code?: string }).code ?? "") &&
              /overlapping forecast|dprima (grouped root|used daughter|reparent|source|parent)/.test(
                e.message,
              )
            ? new Problem(
                409,
                "CONFLICT",
                /overlapping forecast/.test(e.message)
                  ? "El rango previsto se solapa con otra planificación del mismo padre."
                  : "La operación choca con una regla de planificación vigente.",
              )
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
