import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { getCycle } from "./ciclos";
import { actorDefault } from "./e49";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";
import {
  readActiveWindow,
  type ReopeningEvent,
} from "./e410-window";

/**
 * E4.10 I2 — reopening of the last closure and its derived state.
 *
 * The append-only `reaperturas` event is the source of truth; the singleton
 * `reapertura_activa` row only serialises one open window. Reopening never
 * updates `cierres`, `fotos_cierre` or `cierre_audit`: those stay exactly as
 * E4.9 wrote them. Cancellation, re-closure, T1/T2/T3 guards, revalidation and
 * UI belong to later increments and are intentionally absent here.
 */

export type ReaperturaEvento = {
  id: number;
  versionOrigen: number;
  actor: string;
  creadoUtc: string;
  motivo: string;
  correlacion: string | null;
  fingerprint: string;
};

export type ReaperturaEstado = {
  ciclo: string;
  estado: "SinCierre" | "Cerrado" | "Reabierto";
  version: number | null;
  reapertura: ReaperturaEvento | null;
};

export type ReaperturaOptions = {
  actor?: string;
  /** Test-only seam: throws after every row is written, before commit. */
  hooks?: { beforeCommit?: () => void };
};

const keyPattern = /^[a-zA-Z0-9-]{16,100}$/;

type CierreRow = { ciclo: string; version: number; fin: string };

function lastCierre(db: Database, cicloId: string): CierreRow | null {
  return (
    (db
      .query(
        "SELECT ciclo,version,fin FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1",
      )
      .get(cicloId) as CierreRow | null) ?? null
  );
}

type ActiveWindow = { ciclo: string; reapertura: ReaperturaEvento };

function eventDto(evento: ReopeningEvent): ReaperturaEvento {
  return {
    id: evento.id,
    versionOrigen: evento.versionOrigen,
    actor: evento.actor,
    creadoUtc: evento.creadoUtc,
    motivo: evento.motivo,
    correlacion: evento.correlacion,
    fingerprint: evento.fingerprint,
  };
}

/**
 * Adapts the single non-throwing window reader to the I2 API contract: a
 * consistent open window is returned, a later closure is a 409 conflict and
 * any other inconsistency is a 500 corruption. Guards and revalidation use
 * the shared reader directly instead of this throwing adapter.
 */
function activeWindow(db: Database): ActiveWindow | null {
  const reading = readActiveWindow(db);
  if (reading.estado === "SinVentana") return null;
  if (reading.estado === "Abierta")
    return {
      ciclo: reading.ventana.ciclo,
      reapertura: eventDto(reading.ventana),
    };
  if (reading.estado === "CierrePosterior")
    throw new Problem(
      409,
      "CIERRE_POSTERIOR",
      "Existe un cierre posterior durante la ventana de reapertura.",
      {},
      { ciclo: reading.ciclo, fin: reading.finVentana },
    );
  throw new Problem(500, "ESTADO_INCONSISTENTE", reading.motivo);
}

/** Read-only derived closure/reopening state consumed by the API. */
export function getReaperturaEstado(
  db: Database,
  cicloId: string,
): ReaperturaEstado {
  const { ciclo } = getCycle(db, cicloId);
  const last = lastCierre(db, ciclo.id);
  const active = activeWindow(db);
  if (!last)
    return {
      ciclo: ciclo.id,
      estado: "SinCierre",
      version: null,
      reapertura: null,
    };
  if (active && active.ciclo === ciclo.id)
    return {
      ciclo: ciclo.id,
      estado: "Reabierto",
      version: last.version,
      reapertura: active.reapertura,
    };
  return {
    ciclo: ciclo.id,
    estado: "Cerrado",
    version: last.version,
    reapertura: null,
  };
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * Reopens the last closure of one cycle inside a single IMMEDIATE
 * transaction. Idempotent by `(operacion='reapertura', key)`; the response is
 * stored verbatim and replayed. No E4.9 row is written or updated.
 */
export function reabrirCierre(
  db: Database,
  cicloId: string,
  body: Record<string, unknown>,
  key: string,
  options: ReaperturaOptions = {},
  now = Date.now(),
) {
  for (const name of Object.keys(body))
    if (!["versionEsperada", "motivo"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`, {
        [name]: "Campo no editable.",
      });
  if (!keyPattern.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  if (!isPositiveInteger(body.versionEsperada))
    throw new Problem(422, "VALIDATION", "Revisa la versión esperada.", {
      versionEsperada: "Indica una versión positiva.",
    });
  if (
    typeof body.motivo !== "string" ||
    body.motivo.trim().length === 0 ||
    body.motivo.trim().length > 1000
  )
    throw new Problem(422, "VALIDATION", "Indica un motivo válido.", {
      motivo: "Motivo obligatorio y de hasta 1000 caracteres.",
    });
  const versionEsperada = body.versionEsperada,
    motivo = body.motivo.trim();
  const rawActor = options.actor ?? actorDefault;
  if (typeof rawActor !== "string")
    throw new Problem(422, "VALIDATION", "Actor inválido.");
  const actor = rawActor.trim();
  if (actor.length === 0 || actor.length > 200)
    throw new Problem(422, "VALIDATION", "Actor inválido.");
  const requestHash = fingerprint({ ciclo: cicloId, versionEsperada, motivo });

  return db
    .transaction(() => {
      // Idempotency first: a replay must return the original window even though
      // the projection now makes a fresh request look like YA_REABIERTO.
      const retry = db
        .query(
          "SELECT hash,response FROM reapertura_attempts WHERE operacion='reapertura' AND key=?",
        )
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== requestHash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        db.run(
          "UPDATE reapertura_attempts SET expires=? WHERE operacion='reapertura' AND key=?",
          [now + 86400000, key],
        );
        // Replay returns the original result; the live state is always
        // getReaperturaEstado. I4/I5 must not treat this as the current state.
        return { ...JSON.parse(retry.response), replayed: true };
      }
      db.run(
        "DELETE FROM reapertura_attempts WHERE expires<? AND NOT(operacion='reapertura' AND key=?)",
        [now, key],
      );

      const { ciclo } = getCycle(db, cicloId);
      const last = lastCierre(db, ciclo.id);
      if (!last)
        throw new Problem(
          409,
          "SIN_CIERRE",
          "El ciclo no tiene ningún cierre que reabrir.",
        );
      if (versionEsperada !== last.version)
        throw new Problem(
          409,
          "VERSION_CONFLICTO",
          "La versión esperada no es la última versión cerrada.",
          {},
          { version: last.version, versionEsperada },
        );

      // Only the closure with the latest `fin` across the last version of every
      // cycle is eligible. `>=` rejects ties (fail-closed) and any later
      // closure; historical versions of another cycle do not compete.
      const later = db
        .query(
          `SELECT 1 FROM cierres c
           WHERE c.ciclo<>?
             AND c.version=(SELECT MAX(v.version) FROM cierres v WHERE v.ciclo=c.ciclo)
             AND c.fin>=?
           LIMIT 1`,
        )
        .get(ciclo.id, last.fin);
      if (later)
        throw new Problem(
          409,
          "NO_ES_ULTIMO_CIERRE",
          "Solo puede reabrirse el cierre con el Fin más reciente y sin cierre posterior.",
          {},
          { version: last.version, fin: last.fin },
        );

      const active = activeWindow(db);
      if (active)
        throw new Problem(
          409,
          "YA_REABIERTO",
          "Ya existe una reapertura activa.",
          {},
          { ciclo: active.ciclo, reapertura: active.reapertura },
        );

      const creadoUtc = new Date(now).toISOString(),
        correlacion = randomUUID();
      const inserted = db.run(
        `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,
          motivo,fingerprint_peticion,version_esperada,clave_intento,
          correlacion,reapertura_origen,resultado)
         VALUES(?,?,'reapertura',?,?,?,?,?,?,?,NULL,'Abierta')`,
        [
          ciclo.id,
          versionEsperada,
          actor,
          creadoUtc,
          motivo,
          requestHash,
          versionEsperada,
          key,
          correlacion,
        ],
      );
      const id = Number(inserted.lastInsertRowid);
      db.run(
        "INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(1,?,?)",
        [ciclo.id, id],
      );
      const response = {
        ciclo: ciclo.id,
        estado: "Reabierto" as const,
        version: versionEsperada,
        reapertura: {
          id,
          versionOrigen: versionEsperada,
          actor,
          creadoUtc,
          motivo,
          correlacion,
          fingerprint: requestHash,
        },
        replayed: false,
      };
      db.run(
        "INSERT INTO reapertura_attempts(operacion,key,hash,response,expires) VALUES('reapertura',?,?,?,?)",
        [key, requestHash, JSON.stringify(response), now + 86400000],
      );
      options.hooks?.beforeCommit?.();
      return response;
    })
    .immediate();
}
