import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { getCycle } from "./ciclos";
import { actorDefault, captureCierre, type CierreOptions } from "./e49";
import { compareMaterial, requireWindow } from "./e410-recierre";
import type { ReopeningEvent } from "./e410-window";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";

/**
 * E4.10 I5 — cancellation of an active reopening window (D8).
 *
 * The cancellation is the audited `Reabierto(vN) -> Cerrado(vN)` transition. It
 * never writes `cierres`, `fotos_cierre` or `cierre_audit`, and it never creates
 * a photo: it is only allowed when the I4 material comparison proves the
 * absence of material changes against `vN`, including audited writes that were
 * later reverted. Any material change or unreadable evidence rejects the
 * cancellation and leaves the window open for the I4 `vN+1` re-closure.
 *
 * The append-only `reaperturas` event with `tipo='cancelacion'` is the audit
 * record. It references the reopened event through `reapertura_origen` and
 * stores the comparison outcome in `resultado`. Removing the singleton
 * `reapertura_activa` projection re-blocks T1; the guards read that projection,
 * so no second copy of the rule is introduced here.
 *
 * A later closure is not this cycle's window: `requireWindow` (shared with I4)
 * rejects it with `CIERRE_POSTERIOR` and no row is written. Extraordinary
 * recovery is explicitly outside this scope.
 */

export type CancelacionOptions = CierreOptions;

const keyPattern = /^[a-zA-Z0-9-]{16,100}$/;

/**
 * Cancels one active reopening window inside a single IMMEDIATE transaction.
 * Idempotent by `(operacion='cancelacion', key)`; the response is stored and
 * replayed verbatim. A different payload under the same key is a conflict.
 */
export function cancelarReapertura(
  db: Database,
  cicloId: string,
  body: Record<string, unknown>,
  key: string,
  options: CancelacionOptions = {},
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
  if (
    typeof body.versionEsperada !== "number" ||
    !Number.isSafeInteger(body.versionEsperada) ||
    body.versionEsperada <= 0
  )
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
      // Idempotency first: once the window is gone a replay must still return
      // the original cancellation event/response.
      const retry = db
        .query(
          "SELECT hash,response FROM reapertura_attempts WHERE operacion='cancelacion' AND key=?",
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
          "UPDATE reapertura_attempts SET expires=? WHERE operacion='cancelacion' AND key=?",
          [now + 86400000, key],
        );
        return { ...JSON.parse(retry.response), replayed: true };
      }
      db.run(
        "DELETE FROM reapertura_attempts WHERE expires<? AND NOT(operacion='cancelacion' AND key=?)",
        [now, key],
      );

      const { ciclo } = getCycle(db, cicloId);
      let evento: ReopeningEvent;
      try {
        evento = requireWindow(db, ciclo.id, "cancelar");
      } catch (error) {
        if (error instanceof Problem && error.code === "CIERRE_POSTERIOR")
          throw new Problem(
            409,
            "CIERRE_POSTERIOR",
            "Existe un cierre posterior durante la ventana; no se cancela ni se re-cierra. La única salida es recuperación extraordinaria documentada y aprobada por separado.",
            {},
            { ...error.details, siguientePaso: "recuperacion_extraordinaria" },
          );
        throw error;
      }
      if (evento.versionOrigen !== versionEsperada)
        throw new Problem(
          409,
          "VERSION_CONFLICTO",
          "La versión esperada no es la versión reabierta.",
          {},
          { version: evento.versionOrigen, versionEsperada },
        );

      // Reuse I4's conservative material comparison over DT-H. `creadoUtc` is
      // the reopening instant, so audited material writes that were later
      // reverted still force the vN+1 path instead of an automatic cancellation.
      const capture = captureCierre(db, ciclo.id, options, now);
      if (capture.estadoCierre.estado !== "Cerrado")
        throw new Problem(
          500,
          "ESTADO_INCONSISTENTE",
          "La ventana activa no corresponde a un ciclo cerrado.",
        );
      const comparacion = compareMaterial(
        db,
        ciclo.id,
        versionEsperada,
        capture,
        evento.creadoUtc,
      );
      if (comparacion.estado === "NoVerificable")
        throw new Problem(
          409,
          "IMPACTO_NO_VERIFICABLE",
          "No se acredita la ausencia de cambios materiales; no se cancela sin foto. Usa el re-cierre vN+1.",
          {},
          {
            comparacion,
            siguientePaso: "recierre",
            versionSiguiente: versionEsperada + 1,
          },
        );
      if (comparacion.estado === "ConCambios")
        throw new Problem(
          409,
          "CAMBIOS_MATERIALES",
          "Hay cambios materiales desde la reapertura; no se cancela. Usa el re-cierre vN+1.",
          {},
          {
            comparacion,
            siguientePaso: "recierre",
            versionSiguiente: versionEsperada + 1,
          },
        );

      const creadoUtc = new Date(now).toISOString(),
        correlacion = evento.correlacion ?? randomUUID();
      const inserted = db.run(
        `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,
          motivo,fingerprint_peticion,version_esperada,clave_intento,
          correlacion,reapertura_origen,resultado)
         VALUES(?,?,'cancelacion',?,?,?,?,?,?,?,?,?)`,
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
          evento.id,
          "Cancelada (SinCambios)",
        ],
      );
      const cancelacionId = Number(inserted.lastInsertRowid);
      const cleared = db.run(
        "DELETE FROM reapertura_activa WHERE id=1 AND ciclo=? AND reapertura_id=?",
        [ciclo.id, evento.id],
      );
      if (cleared.changes !== 1)
        throw new Problem(
          500,
          "ESTADO_INCONSISTENTE",
          "La proyección de reapertura cambió durante la cancelación.",
        );
      const response = {
        ciclo: ciclo.id,
        estado: "Cerrado" as const,
        version: versionEsperada,
        cancelacion: {
          id: cancelacionId,
          reaperturaOrigen: evento.id,
          versionOrigen: versionEsperada,
          actor,
          creadoUtc,
          motivo,
          correlacion,
          fingerprint: requestHash,
        },
        comparacion,
        replayed: false,
      };
      db.run(
        `INSERT INTO reapertura_attempts(operacion,key,hash,response,expires)
         VALUES('cancelacion',?,?,?,?)`,
        [key, requestHash, JSON.stringify(response), now + 86400000],
      );
      options.hooks?.beforeCommit?.();
      return response;
    })
    .immediate();
}
