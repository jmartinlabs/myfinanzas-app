import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { getCycle } from "./ciclos";
import { actorDefault } from "./e49";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";

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

type ActiveRow = {
  ciclo: string;
  reapertura_id: number;
  id: number | null;
  evento_ciclo: string | null;
  version_origen: number | null;
  tipo: string | null;
  actor: string | null;
  creado_utc: string | null;
  motivo: string | null;
  correlacion: string | null;
  fingerprint_peticion: string | null;
  resultado: string | null;
};

type ActiveWindow = { ciclo: string; reapertura: ReaperturaEvento };

/**
 * Reads the singleton projection and fails closed if it cannot be explained by
 * a real `reapertura` event of its own cycle and last closure version. A
 * projection pointing at a cancellation, another cycle or a historical
 * version is corruption, not an open window.
 */
function activeWindow(db: Database): ActiveWindow | null {
  const row = db
    .query(
      `SELECT p.ciclo,p.reapertura_id,r.id,r.ciclo AS evento_ciclo,
        r.version_origen,r.tipo,r.actor,r.creado_utc,r.motivo,r.correlacion,
        r.fingerprint_peticion,r.resultado
       FROM reapertura_activa p
       LEFT JOIN reaperturas r ON r.id=p.reapertura_id
       WHERE p.id=1`,
    )
    .get() as ActiveRow | null;
  if (!row) return null;
  if (
    row.id === null ||
    row.tipo !== "reapertura" ||
    row.resultado !== "Abierta" ||
    row.evento_ciclo !== row.ciclo
  )
    throw new Problem(
      500,
      "ESTADO_INCONSISTENTE",
      "La proyección de reapertura no corresponde a una reapertura válida.",
    );
  const last = lastCierre(db, row.ciclo);
  if (!last || row.version_origen !== last.version)
    throw new Problem(
      500,
      "ESTADO_INCONSISTENTE",
      "La proyección de reapertura no corresponde a la última versión cerrada.",
    );
  const later = db
    .query(
      `SELECT 1 FROM cierres c
       WHERE c.ciclo<>?
         AND c.version=(SELECT MAX(v.version) FROM cierres v WHERE v.ciclo=c.ciclo)
         AND c.fin>=?
       LIMIT 1`,
    )
    .get(row.ciclo, last.fin);
  if (later)
    throw new Problem(
      409,
      "CIERRE_POSTERIOR",
      "Existe un cierre posterior durante la ventana de reapertura.",
      {},
      { ciclo: row.ciclo, fin: last.fin },
    );
  return {
    ciclo: row.ciclo,
    reapertura: {
      id: row.id,
      versionOrigen: row.version_origen as number,
      actor: row.actor as string,
      creadoUtc: row.creado_utc as string,
      motivo: row.motivo as string,
      correlacion: row.correlacion,
      fingerprint: row.fingerprint_peticion as string,
    },
  };
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
