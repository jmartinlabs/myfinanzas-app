import type { Database } from "bun:sqlite";
import { Problem } from "./problem";
import { civil } from "./ciclos";
import { fingerprint } from "./movement-ledger";
import { decimal, money } from "./saldos";
import {
  getMovement,
  previewMovementInTransaction,
  spanishToday,
  writeMovementInTransaction,
  type MovementPlan,
  type MovementProtection,
} from "./movimientos";
import {
  createAnticipoInTransaction,
  getAnticipo,
  type Attribution,
} from "./anticipos";
import {
  crearTransferenciaPendiente,
  type TransferenciaPendiente,
} from "./transferencias-pendientes";

/**
 * SPEC37 · I3 — operación coordinada atómica.
 *
 * Una única operación registra, en **una sola transacción IMMEDIATE** y en el
 * orden de §4 de la spec:
 *
 *  1. la ficha de Anticipo, solo en modalidad B con Referencia nueva;
 *  2. la Transferencia real (ordinaria en A, de Anticipo en B), si se realiza;
 *  3. el Gasto real e íntegro desde el Saldo pagador (D4: siempre completo,
 *     nunca financiado, nunca dividido);
 *  4. el pendiente `RegistroCoordinado` de SPEC36 §6 / I2, si la Transferencia
 *     todavía no se ha realizado.
 *
 * No crea motores ni entidades nuevas (D7): compone `writeMovementInTransaction`
 * (E1.4/E1.5), `createAnticipoInTransaction` (E3.1) y `crearTransferenciaPendiente`
 * (SPEC36 §6). La idempotencia vive en la tabla técnica
 * `operacion_coordinada_attempts` —clave `('registrar', key)`, huella del
 * payload, respuesta y caducidad de 24 h, el patrón ya vigente—, no en una
 * entidad de negocio.
 *
 * Contrato de entrada (la spec no fija payloads, §11):
 *
 * ```
 * {
 *   gasto: { fecha, importe, saldo, partida, concepto?, nota? },
 *   transferencia?: {
 *     fecha, importe, origen, destino, concepto?, nota?,
 *     referencia?,                       // REF de Anticipo existente (B)
 *     anticipoNuevo?: { nombre, apertura?, evidencia? },  // alta en la misma tx (B)
 *     atribucion?: { evidencia, procedencia }             // evidencia del par E3.1 (B)
 *   },
 *   pendiente?: {
 *     modalidad: "A" | "B", importe, origen, destino, fechaPrevista,
 *     anticipoPrevisto?, concepto?, nota?
 *   }
 * }
 * ```
 *
 * Reglas derivadas, no inventadas:
 *  - Exactamente uno de `transferencia` o `pendiente`: esta operación no
 *    duplica el alta de un Gasto suelto, que sigue siendo `/api/movimientos`.
 *  - `referencia` XOR `anticipoNuevo` determinan la modalidad B; sin ninguno de
 *    los dos la Transferencia es ordinaria (A) y no admite Referencia (§3.2, §7).
 *  - El rol (`Adelanto`) y el par de Saldos de la atribución E3.1 se derivan de
 *    la propia Transferencia: la operación registra el adelanto, nunca una
 *    devolución (§5.4).
 *  - El Gasto se paga siempre desde el Saldo que recibe la Transferencia
 *    (§3.2 Cuenta 2, §3.3 Cuenta 1). Si no coincide, se rechaza: no se elige
 *    otro Saldo por el usuario.
 *  - Fechas e importes usan el criterio ya vigente de E1.4/E1.5
 *    (`movimientos.ts`): fecha civil no futura, importe EUR exacto > 0.
 *    `fechaPrevista` del pendiente es una intención y admite fecha futura.
 *  - `aceptarCoincidencia: true` es obligatorio cuando el plan de E1.4/E1.5
 *    detecta un hecho idéntico ya registrado: el control de duplicados no se
 *    debilita por pasar por la operación coordinada.
 */

const operation = "registrar";

const gastoFields = ["fecha", "importe", "saldo", "partida", "concepto", "nota"] as const;
const transferenciaFields = [
  "fecha",
  "importe",
  "origen",
  "destino",
  "concepto",
  "nota",
  "referencia",
  "anticipoNuevo",
  "atribucion",
] as const;
const pendienteFields = [
  "modalidad",
  "importe",
  "origen",
  "destino",
  "fechaPrevista",
  "anticipoPrevisto",
  "concepto",
  "nota",
] as const;

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Problem(
      422,
      "VALIDATION",
      `El bloque ${field} es obligatorio y debe ser un objeto.`,
      { [field]: "Objeto de datos." },
    );
  return value as Record<string, unknown>;
}

function only(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
) {
  for (const name of Object.keys(value))
    if (!allowed.includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${field}.${name}.`, {
        [field]: "Revisa los campos del bloque.",
      });
}

/** Un valor vacío equivale a ausente, igual que en `validateReference`. */
function declared(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}

function defined(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  );
}

function identifier(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim())
    throw new Problem(422, "VALIDATION", "Saldo o Partida inválidos.", {
      [field]: "Selecciona un identificador existente.",
    });
  return value;
}

function texto(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim())
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: "Texto obligatorio.",
    });
  return value;
}

/** Criterio de importe de E1.4/E1.5: texto EUR exacto, hasta dos decimales, > 0. */
function importe(value: unknown, field: string) {
  let cents: bigint | null = null;
  try {
    if (typeof value === "string" && value) cents = money(value) ?? null;
  } catch {
    cents = null;
  }
  if (cents === null || cents <= 0n)
    throw new Problem(
      422,
      "VALIDATION",
      "Indica un importe EUR exacto mayor que cero, hasta dos decimales.",
      { [field]: "Importe exacto en euros con céntimos." },
    );
  return decimal(cents.toString())!;
}

/** Criterio de fecha de E1.4: fecha civil válida y no futura (día de España). */
function fecha(value: unknown, field: string, now: number) {
  if (value === undefined)
    throw new Problem(422, "VALIDATION", "Indica la fecha.", {
      [field]: "Fecha obligatoria.",
    });
  let value2: string;
  try {
    value2 = civil(value);
  } catch {
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      [field]: "Fecha civil válida.",
    });
  }
  if (value2 > spanishToday(now))
    throw new Problem(
      422,
      "VALIDATION",
      "No se admiten fechas futuras.",
      { [field]: `Fecha máxima: ${spanishToday(now)} (España).` },
    );
  return value2;
}

/**
 * Fecha prevista del pendiente: es una intención, no el hecho bancario, así que
 * admite fecha futura (§8.2: nunca se usa como fecha efectiva). Solo se exige
 * fecha civil válida, el mismo criterio de `civilField` del mecanismo único.
 */
function fechaIntencion(value: unknown, field: string) {
  if (value === undefined)
    throw new Problem(422, "VALIDATION", "Indica la fecha prevista.", {
      [field]: "Fecha prevista obligatoria.",
    });
  try {
    return civil(value);
  } catch {
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      [field]: "Fecha civil válida.",
    });
  }
}

export type OperacionCoordinada = {
  modalidad: "A" | "B";
  gasto: ReturnType<typeof getMovement>;
  transferencia: ReturnType<typeof getMovement> | null;
  pendiente: TransferenciaPendiente | null;
  anticipo: ReturnType<typeof getAnticipo> | null;
};

/**
 * Alta atómica de Gasto + Transferencia (A/B) o Gasto + pendiente.
 *
 * Idempotente por (`registrar`, `key`): el mismo payload devuelve la misma
 * respuesta; otro payload con la misma clave es `409 IDEMPOTENCY_CONFLICT`
 * (AC-34, AC-40). Un fallo en cualquier paso revierte todo: Gasto, Movimiento,
 * ficha, Referencia, pendiente, contadores y auditoría (AC-20).
 */
export function registrarOperacionCoordinada(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
  guard?: MovementProtection,
): OperacionCoordinada {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
  const hash = fingerprint([
    operation,
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return db
    .transaction(() => {
      db.run("DELETE FROM operacion_coordinada_attempts WHERE expires<?", [now]);
      const retry = db
        .query(
          "SELECT hash,response FROM operacion_coordinada_attempts WHERE operacion=? AND key=?",
        )
        .get(operation, key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as OperacionCoordinada;
      }
      const result = ejecutar(db, body, key, now, guard);
      db.run(
        "INSERT INTO operacion_coordinada_attempts(operacion,key,hash,response,expires) VALUES(?,?,?,?,?)",
        [operation, key, hash, JSON.stringify(result), now + 86400000],
      );
      return result;
    })
    .immediate();
}

function ejecutar(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now: number,
  guard?: MovementProtection,
): OperacionCoordinada {
  for (const name of Object.keys(body))
    if (!["gasto", "transferencia", "pendiente", "aceptarCoincidencia"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);

  if (
    body.aceptarCoincidencia !== undefined &&
    typeof body.aceptarCoincidencia !== "boolean"
  )
    throw new Problem(422, "VALIDATION", "aceptarCoincidencia debe ser booleano.");
  const aceptarCoincidencia = body.aceptarCoincidencia === true;

  /** Mismo control que el alta de E1.4/E1.5: la coincidencia se revisa, no se ignora. */
  const revisarCoincidencias = (plan: MovementPlan) => {
    if (plan.duplicados.length && !aceptarCoincidencia)
      throw new Problem(
        409,
        "DUPLICATE_REVIEW",
        "Revisa las coincidencias y confirma si es otro hecho económico real.",
        {},
        { duplicados: plan.duplicados },
      );
  };

  const gastoBody = record(body.gasto, "gasto");
  only(gastoBody, gastoFields, "gasto");

  const conTransferencia = declared(body.transferencia);
  const conPendiente = declared(body.pendiente);
  if (conTransferencia === conPendiente)
    throw new Problem(
      422,
      "VALIDATION",
      "Indica una Transferencia realizada o un pendiente, y solo uno.",
      {
        transferencia: "Una Transferencia real o un pendiente; no ambos ni ninguno.",
        pendiente: "Un pendiente o una Transferencia real; no ambos ni ninguno.",
      },
    );

  // ── 1. Gasto: se valida y planifica antes de cualquier escritura ──────────
  const gastoMovement = defined({
    tipo: "Gasto",
    fecha: fecha(gastoBody.fecha, "fecha", now),
    importe: importe(gastoBody.importe, "importe"),
    saldo: identifier(gastoBody.saldo, "saldo"),
    partida: identifier(gastoBody.partida, "partida"),
    concepto: typeof gastoBody.concepto === "string" ? gastoBody.concepto : "",
    nota: typeof gastoBody.nota === "string" ? gastoBody.nota : "",
  });
  const gastoPlan = previewMovementInTransaction(
    db,
    gastoMovement,
    null,
    false,
    now,
    guard,
  );
  revisarCoincidencias(gastoPlan);

  // ── 2. Transferencia real (A/B) o pendiente ───────────────────────────────
  let transferMovement: Record<string, unknown> | null = null;
  let transferPlan: MovementPlan | null = null;
  let atribucion: Attribution | null = null;
  let ficha: ReturnType<typeof getAnticipo> | null = null;
  let pendienteBody: Record<string, unknown> | null = null;

  if (conTransferencia) {
    const t = record(body.transferencia, "transferencia");
    only(t, transferenciaFields, "transferencia");
    const origen = identifier(t.origen, "origen");
    const destino = identifier(t.destino, "destino");
    if (origen === destino)
      throw new Problem(
        422,
        "VALIDATION",
        "Origen y Destino deben ser distintos.",
        { destino: "Selecciona un Saldo distinto del origen." },
      );
    const fechaTransferencia = fecha(t.fecha, "fecha", now);
    const importeTransferencia = importe(t.importe, "importe");

    // §3.2/§3.3: el Gasto se paga desde el Saldo que recibe la Transferencia.
    if (gastoMovement.saldo !== destino)
      throw new Problem(
        422,
        "VALIDATION",
        "El Gasto debe pagarse desde el Saldo que recibe la Transferencia.",
        {
          saldo: "El Saldo pagador del Gasto debe ser el destino de la Transferencia.",
          destino: "El destino debe ser el Saldo pagador del Gasto.",
        },
      );

    const referenciaExistente = declared(t.referencia) ? t.referencia : null;
    if (referenciaExistente !== null && typeof referenciaExistente !== "string")
      throw new Problem(422, "VALIDATION", "Referencia prevista inválida.", {
        referencia: "Identificador de Referencia.",
      });
    const nuevo = declared(t.anticipoNuevo)
      ? record(t.anticipoNuevo, "anticipoNuevo")
      : null;
    if (nuevo) only(nuevo, ["nombre", "apertura", "evidencia"], "anticipoNuevo");

    const modalidadB = referenciaExistente !== null || nuevo !== null;
    if (!modalidadB) {
      // §3.2/§7: la Transferencia ordinaria no lleva Referencia de Anticipo.
      for (const name of ["referencia", "anticipoNuevo", "atribucion"] as const)
        if (declared(t[name]))
          throw new Problem(
            422,
            "REFERENCIA_NO_ADMITIDA",
            "La Transferencia ordinaria no admite Referencia de Anticipo.",
            {
              [name]:
                "La Referencia y su atribución solo aplican a la modalidad B.",
            },
          );
    } else {
      if (referenciaExistente !== null && nuevo !== null)
        throw new Problem(
          422,
          "VALIDATION",
          "Indica una Referencia existente o un alta nueva, no ambas.",
          { referencia: "Elige una de las dos vías." },
        );
      const a = record(t.atribucion, "atribucion");
      only(a, ["evidencia", "procedencia"], "atribucion");
      // El rol y la orientación se derivan: esta operación registra el
      // adelanto (Cuenta 2 → Cuenta 1), nunca una devolución.
      atribucion = {
        rol: "Adelanto",
        origen,
        destino,
        evidencia: texto(a.evidencia, "evidencia"),
        procedencia: texto(a.procedencia, "procedencia"),
      };
      if (nuevo) {
        // E3.1 no admite una Transferencia de Anticipo sin ficha: la ficha se
        // crea aquí, en la misma transacción y antes de planificar el
        // Movimiento. Si algo posterior falla, se revierte con todo lo demás.
        ficha = createAnticipoInTransaction(
          db,
          defined({
            nombre: nuevo.nombre,
            apertura: nuevo.apertura,
            evidencia: nuevo.evidencia,
          }),
          key,
          now,
        );
      }
    }

    transferMovement = defined({
      tipo: "Transferencia",
      fecha: fechaTransferencia,
      importe: importeTransferencia,
      origen,
      destino,
      referencia: modalidadB
        ? ficha
          ? ficha.referencia.id
          : (referenciaExistente as string)
        : undefined,
      anticipo: atribucion ?? undefined,
      concepto: typeof t.concepto === "string" ? t.concepto : "",
      nota: typeof t.nota === "string" ? t.nota : "",
    });
    transferPlan = previewMovementInTransaction(
      db,
      transferMovement,
      null,
      false,
      now,
      guard,
    );
    revisarCoincidencias(transferPlan);
  } else {
    const p = record(body.pendiente, "pendiente");
    only(p, pendienteFields, "pendiente");
    const origen = identifier(p.origen, "origen");
    const destino = identifier(p.destino, "destino");
    if (origen === destino)
      throw new Problem(
        422,
        "VALIDATION",
        "Origen y Destino deben ser distintos.",
        { destino: "Selecciona un Saldo distinto del origen." },
      );
    if (p.modalidad !== "A" && p.modalidad !== "B")
      throw new Problem(422, "VALIDATION", "Indica la modalidad del pendiente.", {
        modalidad: "Modalidad A (pago directo) o B (Anticipo).",
      });
    // §3.2/§3.3: el pendiente apunta al Saldo que pagará el Gasto ya real.
    if (gastoMovement.saldo !== destino)
      throw new Problem(
        422,
        "VALIDATION",
        "El pendiente debe apuntar al Saldo pagador del Gasto.",
        {
          destino: "El destino del pendiente debe ser el Saldo pagador del Gasto.",
        },
      );
    pendienteBody = defined({
      modalidad: p.modalidad,
      importe: importe(p.importe, "importe"),
      origen,
      destino,
      fechaPrevista: fechaIntencion(p.fechaPrevista, "fechaPrevista"),
      anticipoPrevisto: p.anticipoPrevisto,
      concepto: typeof p.concepto === "string" ? p.concepto : "",
      nota: typeof p.nota === "string" ? p.nota : "",
    });
  }

  // ── 3. Escrituras, en el orden de §4: Transferencia primero, Gasto después ─
  const transferencia = transferMovement
    ? writeMovementInTransaction(db, transferMovement, {
        now,
        planned: transferPlan!,
        guard,
      })
    : null;
  const gasto = writeMovementInTransaction(db, gastoMovement, {
    now,
    planned: gastoPlan,
    guard,
  });
  // El pendiente se vincula al Gasto recién escrito en esta misma transacción.
  const pendiente = pendienteBody
    ? crearTransferenciaPendiente(
        db,
        { ...pendienteBody, gasto: gasto.movimiento.id },
        now,
      )
    : null;

  return {
    modalidad: transferMovement
      ? atribucion
        ? "B"
        : "A"
      : (pendienteBody!.modalidad as "A" | "B"),
    gasto: getMovement(db, gasto.movimiento.id),
    transferencia: transferencia
      ? getMovement(db, transferencia.movimiento.id)
      : null,
    pendiente,
    // La ficha se relee al final: al crearla aún no existía la Transferencia,
    // así que su foto de alta no refleja el adelanto recién escrito.
    anticipo: ficha ? getAnticipo(db, ficha.referencia.id) : null,
  };
}