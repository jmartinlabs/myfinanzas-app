import type { Database } from "bun:sqlite";
import { Problem } from "./problem";
import { civil, cycleMaster, type Cycle } from "./ciclos";
import { fingerprint } from "./movement-ledger";
import { decimal, money } from "./saldos";
import {
  previewMovementInTransaction,
  spanishToday,
  writeMovementInTransaction,
  type MovementPlan,
  type MovementProtection,
} from "./movimientos";

/**
 * SPEC36 — shared Transferencia pendiente (increment 1).
 *
 * The pending record is operational: it never moves money, liquidity,
 * budget execution, Movimientos or photos before confirmation. The only real
 * fact is the E1.5 Movimiento created by `confirmar` (or linked by
 * `vincular`). Cancelling a pending writes no financial effect. Annulling the
 * confirmed Movimiento does not reopen the pending.
 *
 * `crearTransferenciaPendiente` is exported for increment 2 so generation can
 * call it inside its own transaction. The HTTP routes wrap every write in
 * `conIntento`, which owns the single IMMEDIATE transaction and stores the
 * idempotent response in `transferencia_pendiente_attempts` (24 h TTL).
 *
 * Schema v28 freezes a Reparto line once a pending references it. Therefore a
 * Reparto-origin pending cannot change importe/origen/destino: the schema would
 * reject it. Those fields stay editable only for the future
 * `RegistroCoordinado` origin (SPEC37), and are rejected here with a domain
 * error instead of leaking a SQLite constraint.
 */

const states = ["Pendiente de realizar", "Confirmada", "Cancelada"] as const;
type Estado = (typeof states)[number];

type PendingRow = {
  id: number;
  estado: Estado;
  importe: number;
  origen: string;
  destino: string;
  ciclo_origen: string;
  fecha_prevista: string;
  fecha_efectiva: string | null;
  concepto: string;
  nota: string;
  origen_tipo: "Reparto" | "RegistroCoordinado";
  reparto_linea: number | null;
  gasto: string | null;
  anticipo: string | null;
  movimiento: string | null;
  motivo_cancelacion: string | null;
  revision: number;
  creado: string;
  actualizado: string;
};

type LineRow = {
  id: number;
  reparto: number;
  clase: "Presupuesto" | "Adicional";
  presupuesto: string | null;
  origen: string | null;
  destino: string | null;
  importe: number | null;
  fecha_prevista: string;
  concepto: string | null;
  nota: string | null;
  incluida: number;
  motivo_exclusion: string | null;
  revision: number;
  creado: string;
  actualizado: string;
  ciclo: string;
  reparto_estado: "Borrador" | "Generado" | "Completado";
};

type SaldoRow = {
  id: string;
  nombre: string;
  tipo: string;
  control: string;
  estado: string;
};

type BudgetRow = {
  id: string;
  nombre: string;
  fuente: string;
  destino: string | null;
  estado: "Activo" | "Inactivo";
};

type MovementRow = {
  id: string;
  fecha: string;
  tipo: string;
  importe: number;
  origen: string;
  destino: string;
  referencia: string | null;
  concepto: string;
  nota: string;
  anulado: number;
  revision: number;
};

type Condicion = { requiereRevision: boolean; motivos: string[] };

function identifier(value: unknown, field = "id"): number {
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(id) || id < 1)
    throw new Problem(422, "VALIDATION", "Identificador inválido.", {
      [field]: "Indica un identificador positivo.",
    });
  return id;
}

function civilField(value: unknown, field: string, message?: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Problem(
      422,
      "VALIDATION",
      message ?? "Indica una fecha civil válida.",
      { [field]: "Fecha civil válida (AAAA-MM-DD)." },
    );
  try {
    return civil(value);
  } catch {
    throw new Problem(
      422,
      "VALIDATION",
      message ?? "Indica una fecha civil válida.",
      { [field]: "Fecha civil válida (AAAA-MM-DD)." },
    );
  }
}

function textField(
  value: unknown,
  field: string,
  max: number,
  allowEmpty = true,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Revisa los campos indicados.",
      { [field]: `Texto válido, máximo ${max} caracteres.` },
    );
  return value;
}

function amount(value: unknown, field = "importe"): { cents: bigint; text: string } {
  if (typeof value !== "string" || !value)
    throw new Problem(
      422,
      "VALIDATION",
      "Indica un importe EUR exacto mayor que cero, hasta dos decimales.",
      { [field]: "Importe exacto en euros con céntimos." },
    );
  try {
    const cents = money(value);
    if (cents === null || cents <= 0n) throw new Error("non-positive");
    return { cents, text: decimal(cents)! };
  } catch {
    throw new Problem(
      422,
      "VALIDATION",
      "Indica un importe EUR exacto mayor que cero, hasta dos decimales.",
      { [field]: "Importe exacto en euros con céntimos." },
    );
  }
}

function saldo(db: Database, id: string): SaldoRow | null {
  return (
    (db
      .query("SELECT id,nombre,tipo,control,estado FROM saldos WHERE id=?")
      .get(id) as SaldoRow | null) ?? null
  );
}

function ineligibleReason(db: Database, id: string): string | null {
  const row = saldo(db, id);
  if (!row) return "SALDO_NO_DISPONIBLE";
  if (row.id === "S000") return "SALDO_NO_ELEGIBLE";
  if (row.tipo === "Exterior" || row.control === "Exterior")
    return "SALDO_NO_ELEGIBLE";
  if (row.control === "Manual") return "SALDO_NO_ELEGIBLE";
  if (row.estado !== "Activa") return "SALDO_NO_ELEGIBLE";
  return null;
}

function assertEligible(db: Database, id: string, field: string) {
  const reason = ineligibleReason(db, id);
  if (reason)
    throw new Problem(
      422,
      "SALDO_NO_ELEGIBLE",
      "El Saldo no es elegible para una Transferencia pendiente.",
      { [field]: "Selecciona un Saldo interno activo y operativo." },
      { motivo: reason },
    );
}

function line(db: Database, id: number): LineRow | null {
  return (
    (db
      .query(
        `SELECT l.*, r.ciclo, r.estado reparto_estado
         FROM reparto_lineas l JOIN repartos r ON r.id=l.reparto
         WHERE l.id=?`,
      )
      .get(id) as LineRow | null) ?? null
  );
}

function budget(db: Database, id: string): BudgetRow | null {
  return (
    (db
      .query("SELECT id,nombre,fuente,destino,estado FROM presupuestos WHERE id=?")
      .get(id) as BudgetRow | null) ?? null
  );
}

function movement(db: Database, id: string): MovementRow | null {
  const row = db
    .query(
      "SELECT id,fecha,tipo,CAST(importe AS TEXT) importe,origen,destino,referencia,concepto,nota,anulado,revision FROM movimientos WHERE id=?",
    )
    .get(id) as (Omit<MovementRow, "importe"> & { importe: string }) | null;
  return row ? { ...row, importe: Number(row.importe) } : null;
}

function pending(db: Database, id: number): PendingRow | null {
  return (
    (db
      .query("SELECT * FROM transferencia_pendiente WHERE id=?")
      .get(id) as PendingRow | null) ?? null
  );
}

function snapshot(row: PendingRow) {
  return { ...row, importe: decimal(String(row.importe)) };
}

function audit(
  db: Database,
  id: number,
  revision: number,
  accion: "alta" | "actualizacion" | "confirmacion" | "cancelacion",
  before: PendingRow | null,
  after: PendingRow,
  motive: string | null,
  campos: string[],
  now: number,
) {
  const instant = new Date(now).toISOString();
  const posterior = {
    ...snapshot(after),
    ...(motive ? { motivo: motive } : {}),
  };
  db.run(
    "INSERT INTO transferencia_pendiente_audit(pendiente,revision,accion,anterior,posterior,instante,actor) VALUES(?,?,?,?,?,?,'usuario-unico')",
    [
      id,
      revision,
      accion,
      before ? JSON.stringify(snapshot(before)) : null,
      JSON.stringify(posterior),
      instant,
    ],
  );
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,?,?,?,?,'usuario-unico',?)",
    [
      `transferencia-pendiente:${id}`,
      accion,
      revision,
      JSON.stringify(campos),
      instant,
      before?.revision ?? 0,
      motive,
    ],
  );
}

function conditions(db: Database, row: PendingRow): Condicion {
  const motivos = new Set<string>();
  if (row.estado === "Confirmada") {
    const m = row.movimiento ? movement(db, row.movimiento) : null;
    if (!m) motivos.add("MOVIMIENTO_NO_DISPONIBLE");
    else {
      if (m.anulado === 1) motivos.add("MOVIMIENTO_ANULADO");
      if (
        m.tipo !== "Transferencia" ||
        m.origen !== row.origen ||
        m.destino !== row.destino ||
        m.importe !== row.importe ||
        m.fecha !== row.fecha_efectiva
      )
        motivos.add("MOVIMIENTO_NO_COINCIDE");
    }
  }
  if (row.estado === "Pendiente de realizar") {
    const originReason = ineligibleReason(db, row.origen);
    if (originReason) motivos.add("SALDO_ORIGEN_NO_ELEGIBLE");
    const destinationReason = ineligibleReason(db, row.destino);
    if (destinationReason) motivos.add("SALDO_DESTINO_NO_ELEGIBLE");
    const l = row.reparto_linea ? line(db, row.reparto_linea) : null;
    if (row.origen_tipo === "Reparto") {
      if (!l) motivos.add("LINEA_NO_DISPONIBLE");
      else {
        if (l.incluida !== 1) motivos.add("LINEA_EXCLUIDA");
        if (
          l.origen !== row.origen ||
          l.destino !== row.destino ||
          l.importe !== row.importe ||
          l.ciclo !== row.ciclo_origen
        )
          motivos.add("LINEA_CAMBIADA");
        if (l.reparto_estado !== "Generado") motivos.add("REPARTO_NO_GENERADO");
        if (l.clase === "Presupuesto" && l.presupuesto) {
          const b = budget(db, l.presupuesto);
          if (!b) motivos.add("PRESUPUESTO_NO_DISPONIBLE");
          else {
            if (b.estado !== "Activo") motivos.add("PRESUPUESTO_INACTIVO");
            if (b.fuente !== "Aportación a saldo")
              motivos.add("FUENTE_NO_APORTACION");
            if (b.destino !== row.destino)
              motivos.add("PRESUPUESTO_DESTINO");
          }
        }
      }
    }
  }
  return { requiereRevision: motivos.size > 0, motivos: [...motivos] };
}

function pendingDto(db: Database, row: PendingRow, now = Date.now()) {
  const cond = conditions(db, row);
  const origin = saldo(db, row.origen);
  const destination = saldo(db, row.destino);
  const l = row.reparto_linea ? line(db, row.reparto_linea) : null;
  const reparto = l
    ? (db
        .query("SELECT id,ciclo,estado,revision FROM repartos WHERE id=?")
        .get(l.reparto) as {
        id: number;
        ciclo: string;
        estado: string;
        revision: number;
      } | null)
    : null;
  const b =
    l?.clase === "Presupuesto" && l.presupuesto
      ? budget(db, l.presupuesto)
      : null;
  const m = row.movimiento ? movement(db, row.movimiento) : null;
  return {
    id: row.id,
    estado: row.estado,
    importe: decimal(String(row.importe)),
    origen: origin,
    destino: destination,
    cicloOrigen: row.ciclo_origen,
    fechaPrevista: row.fecha_prevista,
    fechaEfectiva: row.fecha_efectiva,
    concepto: row.concepto,
    nota: row.nota,
    origenTipo: row.origen_tipo,
    repartoLinea: l
      ? {
          id: l.id,
          reparto: l.reparto,
          clase: l.clase,
          presupuesto: l.presupuesto,
          incluida: l.incluida === 1,
          motivoExclusion: l.motivo_exclusion,
        }
      : null,
    reparto: reparto
      ? {
          id: reparto.id,
          ciclo: reparto.ciclo,
          estado: reparto.estado,
          revision: reparto.revision,
        }
      : null,
    presupuesto: b,
    gasto: row.gasto,
    anticipo: row.anticipo,
    movimiento: m
      ? {
          id: m.id,
          fecha: m.fecha,
          tipo: m.tipo,
          importe: decimal(String(m.importe)),
          origen: m.origen,
          destino: m.destino,
          referencia: m.referencia,
          anulado: m.anulado === 1,
          revision: m.revision,
        }
      : null,
    motivoCancelacion: row.motivo_cancelacion,
    revision: row.revision,
    creado: row.creado,
    actualizado: row.actualizado,
    requiereRevision: cond.requiereRevision,
    motivosRevision: cond.motivos,
    hoy: spanishToday(now),
  };
}

function existingForLine(db: Database, lineId: number): PendingRow | null {
  return (
    (db
      .query("SELECT * FROM transferencia_pendiente WHERE reparto_linea=?")
      .get(lineId) as PendingRow | null) ?? null
  );
}

/**
 * Insert one pending from a distribution line. Assumes the caller owns the
 * transaction (increment 2 generation or the HTTP attempt wrapper). It is
 * deliberately not a user form: only `lineaId` selects the data.
 */
export function crearTransferenciaPendiente(
  db: Database,
  body: Record<string, unknown>,
  now = Date.now(),
): ReturnType<typeof pendingDto> {
  for (const key of Object.keys(body))
    if (!["lineaId", "origenOperativo", "referencia"].includes(key))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`);
  if (body.referencia !== undefined && body.referencia !== null && body.referencia !== "")
    throw new Problem(
      422,
      "REFERENCIA_NO_ADMITIDA",
      "Incremento 1 no admite Referencia en una Transferencia pendiente.",
      { referencia: "El pendiente se confirma sin Referencia." },
    );
  if (
    body.origenOperativo !== undefined &&
    body.origenOperativo !== "Transferencia"
  )
    throw new Problem(
      422,
      "VALIDATION",
      "El origen operativo de una Transferencia pendiente no es Gasto.",
      { origenOperativo: "Solo se admite Transferencia." },
    );
  if (body.lineaId === undefined)
    throw new Problem(422, "VALIDATION", "Indica la línea de reparto.", {
      lineaId: "Identificador de línea obligatorio.",
    });
  const lineId = identifier(body.lineaId, "lineaId");
  const l = line(db, lineId);
  if (!l) throw new Problem(404, "NOT_FOUND", "Línea de reparto no encontrada.");
  if (l.reparto_estado !== "Generado")
    throw new Problem(
      409,
      "STATE_CONFLICT",
      "El reparto debe estar Generado antes de crear pendientes.",
      { reparto: "Genera el reparto y vuelve a intentarlo." },
    );
  if (l.incluida !== 1)
    throw new Problem(
      422,
      "VALIDATION",
      "La línea está excluida y no genera pendiente.",
      { lineaId: "Incluye la línea o crea otra." },
    );
  if (
    !l.origen ||
    !l.destino ||
    l.importe === null ||
    !Number.isSafeInteger(l.importe) ||
    l.importe <= 0
  )
    throw new Problem(
      422,
      "VALIDATION",
      "La línea no tiene origen, destino e importe completos.",
    );
  if (l.origen === l.destino)
    throw new Problem(422, "VALIDATION", "Origen y destino deben ser distintos.");
  assertEligible(db, l.origen, "origen");
  assertEligible(db, l.destino, "destino");
  if (l.clase === "Presupuesto") {
    if (!l.presupuesto)
      throw new Problem(422, "VALIDATION", "La línea no referencia un Presupuesto.");
    const b = budget(db, l.presupuesto);
    if (!b)
      throw new Problem(
        422,
        "PRESUPUESTO_NO_DISPONIBLE",
        "El Presupuesto de la línea no está disponible.",
      );
    if (b.fuente !== "Aportación a saldo")
      throw new Problem(
        422,
        "FUENTE_NO_APORTACION",
        "Solo una Aportación a saldo genera Transferencia pendiente.",
        { presupuesto: "La fuente debe ser Aportación a saldo." },
      );
    if (b.estado !== "Activo")
      throw new Problem(
        422,
        "PRESUPUESTO_INACTIVO",
        "No se crea un pendiente nuevo hacia un Presupuesto inactivo.",
        { presupuesto: "Reactiva el Presupuesto o excluye la línea." },
      );
    if (b.destino !== l.destino)
      throw new Problem(
        422,
        "PRESUPUESTO_DESTINO",
        "El destino de la línea no coincide con el destino actual del Presupuesto.",
        { destino: "El destino procede del Presupuesto y no es editable." },
      );
  }
  const previous = existingForLine(db, l.id);
  if (previous)
    throw new Problem(
      409,
      "LINEA_YA_GENERADA",
      "La línea ya tiene una Transferencia pendiente.",
      { lineaId: "Cada línea genera como máximo un pendiente." },
      { pendiente: previous.id },
    );
  const time = new Date(now).toISOString();
  const result = db.run(
    "INSERT INTO transferencia_pendiente(estado,importe,origen,destino,ciclo_origen,fecha_prevista,concepto,nota,origen_tipo,reparto_linea,revision,creado,actualizado) VALUES('Pendiente de realizar',?,?,?,?,?,?,?,'Reparto',?,1,?,?)",
    [
      l.importe,
      l.origen,
      l.destino,
      l.ciclo,
      l.fecha_prevista,
      l.concepto ?? "",
      l.nota ?? "",
      l.id,
      time,
      time,
    ],
  );
  const id = Number(result.lastInsertRowid);
  const after = pending(db, id)!;
  audit(db, id, 1, "alta", null, after, null, ["estado", "importe", "origen", "destino", "fechaPrevista", "concepto", "nota"], now);
  return pendingDto(db, after, now);
}

/** HTTP/attempt wrapper for the creation route; increment 2 calls the raw creator. */
export function crearTransferenciaPendienteConIntento(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  return conIntento(db, "crear", body, key, now, () =>
    crearTransferenciaPendiente(db, body, now),
  );
}

export function getTransferenciaPendiente(
  db: Database,
  idValue: unknown,
  now = Date.now(),
) {
  const id = identifier(idValue);
  const row = pending(db, id);
  if (!row)
    throw new Problem(404, "NOT_FOUND", "Transferencia pendiente no encontrada.");
  return {
    item: pendingDto(db, row, now),
    auditoria: (
      db
        .query(
          "SELECT revision,accion,anterior,posterior,instante,actor FROM transferencia_pendiente_audit WHERE pendiente=? ORDER BY revision",
        )
        .all(id) as {
        revision: number;
        accion: string;
        anterior: string | null;
        posterior: string;
        instante: string;
        actor: string;
      }[]
    ).map((a) => ({
      ...a,
      anterior: a.anterior ? JSON.parse(a.anterior) : null,
      posterior: JSON.parse(a.posterior),
    })),
  };
}

export function listTransferenciasPendientes(
  db: Database,
  params = new URLSearchParams(),
  now = Date.now(),
) {
  const page = Number(params.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Página inválida.");
  const estado = params.get("estado") ?? "";
  if (estado && !states.includes(estado as Estado))
    throw new Problem(422, "VALIDATION", "Estado de pendiente inválido.");
  const rawReview = params.get("requiereRevision") ?? "";
  if (!["", "true", "false", "1", "0"].includes(rawReview))
    throw new Problem(
      422,
      "VALIDATION",
      "Filtro requiereRevision inválido.",
    );
  const review =
    rawReview === "" ? null : rawReview === "true" || rawReview === "1";
  const ciclo = params.get("ciclo") ?? "";
  const presupuesto = params.get("presupuesto") ?? "";
  const reparto = params.get("reparto") ?? "";
  const q = (params.get("q") ?? "").toLocaleLowerCase("es");
  const rows = db
    .query("SELECT * FROM transferencia_pendiente ORDER BY id DESC")
    .all() as PendingRow[];
  const items = rows
    .map((row) => pendingDto(db, row, now))
    .filter(
      (item) =>
        (!estado || item.estado === estado) &&
        (review === null || item.requiereRevision === review) &&
        (!ciclo || item.cicloOrigen === ciclo) &&
        (!presupuesto || item.presupuesto?.id === presupuesto) &&
        (!reparto || String(item.reparto?.id ?? "") === reparto) &&
        `${item.id} ${item.concepto} ${item.nota}`
          .toLocaleLowerCase("es")
          .includes(q),
    );
  return {
    items: items.slice((page - 1) * 100, page * 100),
    total: items.length,
    page,
  };
}

function movementBody(row: PendingRow, fechaReal: string) {
  return {
    tipo: "Transferencia",
    fecha: fechaReal,
    importe: decimal(String(row.importe))!,
    origen: row.origen,
    destino: row.destino,
    concepto: row.concepto,
    nota: row.nota,
  };
}

function cycleForDate(db: Database, fecha: string): Cycle | null {
  return (
    cycleMaster(db).find(
      (c) => c.inicio <= fecha && (c.fin === null || fecha <= c.fin),
    ) ?? null
  );
}

function budgetEffect(db: Database, row: PendingRow) {
  const l = row.reparto_linea ? line(db, row.reparto_linea) : null;
  if (l?.clase === "Presupuesto" && l.presupuesto) {
    const b = budget(db, l.presupuesto);
    if (!b)
      return {
        aplica: false,
        presupuesto: l.presupuesto,
        fuente: null,
        destino: null,
        motivo: "El Presupuesto no está disponible.",
      };
    const aplica =
      b.estado === "Activo" &&
      b.fuente === "Aportación a saldo" &&
      b.destino === row.destino;
    return {
      aplica,
      presupuesto: b.id,
      fuente: b.fuente,
      destino: b.destino,
      motivo: aplica
        ? "La Transferencia ejecuta la Aportación a saldo de su Presupuesto."
        : "La Transferencia ya no ejecuta esa Aportación a saldo; revisa el Presupuesto.",
    };
  }
  const active = db
    .query(
      "SELECT id,nombre,fuente,destino,estado FROM presupuestos WHERE fuente='Aportación a saldo' AND estado='Activo' AND destino=?",
    )
    .all(row.destino) as BudgetRow[];
  if (active.length === 1)
    return {
      aplica: true,
      presupuesto: active[0].id,
      fuente: active[0].fuente,
      destino: active[0].destino,
      motivo:
        "La Transferencia ordinaria hacia el destino ejecuta esa Aportación a saldo.",
    };
  const inactive = db
    .query(
      "SELECT id FROM presupuestos WHERE fuente='Aportación a saldo' AND estado='Inactivo' AND destino=?",
    )
    .all(row.destino) as { id: string }[];
  return {
    aplica: false,
    presupuesto: null,
    fuente: null,
    destino: row.destino,
    motivo:
      active.length > 1
        ? "Hay varias Aportaciones a saldo para el destino; no se puede atribuir."
        : inactive.length
          ? "Existe un Presupuesto histórico inactivo hacia el destino; la Transferencia no ejecuta su fuente."
          : "El destino no ejecuta ninguna Aportación a saldo.",
  };
}

function impactPayload(
  db: Database,
  row: PendingRow,
  fechaReal: string,
  plan: MovementPlan,
  now: number,
) {
  const cond = conditions(db, row);
  const efecto = budgetEffect(db, row);
  const cycle = cycleForDate(db, fechaReal);
  return {
    estado: row.estado,
    revision: row.revision,
    pendiente: row.id,
    fechaReal,
    cicloFechaReal: cycle
      ? { id: cycle.id, inicio: cycle.inicio, fin: cycle.fin }
      : null,
    condiciones: cond,
    efectoPresupuestario: efecto,
    movimiento: plan,
    duplicados: plan.duplicados,
    fingerprint: fingerprint([
      row.id,
      row.revision,
      snapshot(row),
      fechaReal,
      cycle ? { id: cycle.id, inicio: cycle.inicio, fin: cycle.fin } : null,
      cond,
      efecto,
      plan.fingerprint,
      plan.duplicados.map((d) => d.id),
    ]),
    hoy: spanishToday(now),
  };
}

function buildImpact(
  db: Database,
  row: PendingRow,
  fechaReal: string,
  now: number,
  guard?: MovementProtection,
) {
  return impactPayload(
    db,
    row,
    fechaReal,
    previewMovementInTransaction(
      db,
      movementBody(row, fechaReal),
      null,
      false,
      now,
      guard,
    ),
    now,
  );
}

export function previewImpactoTransferenciaPendiente(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  now = Date.now(),
  guard?: MovementProtection,
) {
  for (const key of Object.keys(body))
    if (key !== "fechaReal")
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`);
  if (body.fechaReal === undefined)
    throw new Problem(422, "VALIDATION", "Indica la fecha real del banco.", {
      fechaReal: "Fecha efectiva obligatoria para la vista previa.",
    });
  const id = identifier(idValue);
  const row = pending(db, id);
  if (!row)
    throw new Problem(404, "NOT_FOUND", "Transferencia pendiente no encontrada.");
  if (row.estado !== "Pendiente de realizar")
    throw new Problem(
      409,
      "STATE_CONFLICT",
      "Solo un pendiente Pendiente de realizar admite vista previa de confirmación.",
    );
  const fechaReal = civilField(body.fechaReal, "fechaReal");
  if (fechaReal > spanishToday(now))
    throw new Problem(
      422,
      "VALIDATION",
      "La fecha real no puede ser futura.",
      {
        fechaReal: `Fecha máxima: ${spanishToday(now)} (España).`,
      },
    );
  const cond = conditions(db, row);
  if (cond.requiereRevision) {
    const effect = budgetEffect(db, row);
    const cycle = cycleForDate(db, fechaReal);
    return {
      estado: row.estado,
      revision: row.revision,
      pendiente: row.id,
      fechaReal,
      cicloFechaReal: cycle
        ? { id: cycle.id, inicio: cycle.inicio, fin: cycle.fin }
        : null,
      condiciones: cond,
      efectoPresupuestario: effect,
      movimiento: null,
      duplicados: [],
      motivoNoDisponible:
        "El pendiente requiere revisión; no se calcula una confirmación ejecutable.",
      fingerprint: fingerprint([
        row.id,
        row.revision,
        snapshot(row),
        fechaReal,
        cycle ? { id: cycle.id, inicio: cycle.inicio, fin: cycle.fin } : null,
        cond,
        effect,
      ]),
      hoy: spanishToday(now),
    };
  }
  return buildImpact(db, row, fechaReal, now, guard);
}

function requirePendiente(row: PendingRow) {
  if (row.estado !== "Pendiente de realizar")
    throw new Problem(
      409,
      "STATE_CONFLICT",
      "Solo un pendiente Pendiente de realizar puede cambiar de estado.",
      { estado: row.estado },
    );
}

function requireRevision(row: PendingRow, value: unknown) {
  if (!Number.isSafeInteger(value) || value !== row.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "La Transferencia pendiente ha cambiado. Revisa su ficha.",
    );
}

export function editarTransferenciaPendiente(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  return conIntento(db, "actualizar", { id, ...body }, key, now, () => {
    for (const name of Object.keys(body))
      if (
        ![
          "revision",
          "importe",
          "fechaPrevista",
          "concepto",
          "nota",
          "origen",
          "destino",
        ].includes(name)
      )
        throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
    const row = pending(db, id);
    if (!row)
      throw new Problem(
        404,
        "NOT_FOUND",
        "Transferencia pendiente no encontrada.",
      );
    requirePendiente(row);
    requireRevision(row, body.revision);
    const l = row.reparto_linea ? line(db, row.reparto_linea) : null;
    const changes: Record<string, string | number> = {};
    if (body.fechaPrevista !== undefined) {
      const value = civilField(body.fechaPrevista, "fechaPrevista");
      if (value !== row.fecha_prevista)
        changes.fecha_prevista = value;
    }
    if (body.concepto !== undefined) {
      const value = textField(body.concepto, "concepto", 2000);
      if (value !== row.concepto) changes.concepto = value;
    }
    if (body.nota !== undefined) {
      const value = textField(body.nota, "nota", 4000);
      if (value !== row.nota) changes.nota = value;
    }
    if (body.importe !== undefined) {
      const value = amount(body.importe);
      if (value.cents !== BigInt(row.importe)) {
        if (row.origen_tipo === "Reparto")
          throw new Problem(
            422,
            "VALIDATION",
            "El importe procede de la línea de reparto congelada y no se puede editar.",
            { importe: "El importe está congelado por la línea de reparto; cancela y decide otro importe." },
          );
        changes.importe = Number(value.cents);
      }
    }
    for (const side of ["origen", "destino"] as const) {
      if (body[side] === undefined) continue;
      if (typeof body[side] !== "string" || !body[side])
        throw new Problem(422, "VALIDATION", "Saldo inválido.", {
          [side]: "Selecciona un Saldo interno activo.",
        });
      const value = body[side] as string;
      if (value !== row[side]) {
        if (row.origen_tipo === "Reparto")
          throw new Problem(
            422,
            "VALIDATION",
            "Origen y destino proceden de la línea de reparto congelada y no se pueden editar.",
            { [side]: "El dato está congelado por la línea de reparto; cancela y decide otro destino en el reparto." },
          );
        assertEligible(db, value, side);
        changes[side] = value;
      }
    }
    if (body.origen !== undefined && body.destino !== undefined) {
      const origin = (changes.origen ?? row.origen) as string;
      const destination = (changes.destino ?? row.destino) as string;
      if (origin === destination)
        throw new Problem(422, "VALIDATION", "Origen y destino deben ser distintos.");
    }
    if (!Object.keys(changes).length)
      throw new Problem(422, "VALIDATION", "No hay cambios que guardar.");
    const time = new Date(now).toISOString();
    const sets = ["revision=revision+1", "actualizado=?"];
    const values: (string | number)[] = [time];
    for (const [column, value] of Object.entries(changes)) {
      sets.push(`${column}=?`);
      values.push(value);
    }
    values.push(id, row.revision);
    const result = db.run(
      `UPDATE transferencia_pendiente SET ${sets.join(",")} WHERE id=? AND revision=? AND estado='Pendiente de realizar'`,
      values,
    );
    if (result.changes !== 1)
      throw new Problem(
        409,
        "REVISION_CONFLICT",
        "La Transferencia pendiente ha cambiado. Revisa su ficha.",
      );
    const after = pending(db, id)!;
    audit(
      db,
      id,
      after.revision,
      "actualizacion",
      row,
      after,
      null,
      Object.keys(changes),
      now,
    );
    return pendingDto(db, after, now);
  });
}

export function confirmarTransferenciaPendiente(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
  guard?: MovementProtection,
) {
  const id = identifier(idValue);
  return conIntento(db, "confirmar", { id, ...body }, key, now, () => {
    for (const name of Object.keys(body))
      if (
        !["revision", "fechaReal", "fingerprint", "aceptarCoincidencia"].includes(
          name,
        )
      )
        throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
    const row = pending(db, id);
    if (!row)
      throw new Problem(
        404,
        "NOT_FOUND",
        "Transferencia pendiente no encontrada.",
      );
    requirePendiente(row);
    requireRevision(row, body.revision);
    if (body.fechaReal === undefined)
      throw new Problem(422, "VALIDATION", "Indica la fecha real del banco.", {
        fechaReal: "Fecha efectiva obligatoria.",
      });
    const fechaReal = civilField(body.fechaReal, "fechaReal");
    if (fechaReal > spanishToday(now))
      throw new Problem(
        422,
        "VALIDATION",
        "La fecha real no puede ser futura.",
        { fechaReal: `Fecha máxima: ${spanishToday(now)} (España).` },
      );
    if (
      typeof body.fingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.fingerprint)
    )
      throw new Problem(
        422,
        "VALIDATION",
        "Falta la huella de la vista previa de impacto.",
        { fingerprint: "Genera la vista previa y envía su huella." },
      );
    if (
      body.aceptarCoincidencia !== undefined &&
      typeof body.aceptarCoincidencia !== "boolean"
    )
      throw new Problem(422, "VALIDATION", "aceptarCoincidencia debe ser booleano.");
    const cond = conditions(db, row);
    if (cond.requiereRevision)
      throw new Problem(
        409,
        "REVIEW_REQUIRED",
        "El pendiente requiere revisión antes de confirmar.",
        Object.fromEntries(
          cond.motivos.map((m) => [
            m,
            "Revisa, vincula o cancela el pendiente.",
          ]),
        ),
        { motivos: cond.motivos },
      );
    const impact = buildImpact(db, row, fechaReal, now, guard);
    if (body.fingerprint !== impact.fingerprint)
      throw new Problem(
        409,
        "IMPACT_CHANGED",
        "El impacto ha cambiado. Revisa otra vista previa; tu borrador se conserva.",
      );
    if (
      impact.movimiento.duplicados.length &&
      body.aceptarCoincidencia !== true
    )
      throw new Problem(
        409,
        "DUPLICATE_REVIEW",
        "Revisa las coincidencias y confirma si es otro hecho económico real.",
        {},
        { duplicados: impact.movimiento.duplicados },
      );
    const written = writeMovementInTransaction(
      db,
      movementBody(row, fechaReal),
      { now, planned: impact.movimiento, guard },
    );
    const movimientoId = written.movimiento.id;
    const result = db.run(
      "UPDATE transferencia_pendiente SET estado='Confirmada',movimiento=?,fecha_efectiva=?,revision=revision+1,actualizado=? WHERE id=? AND revision=? AND estado='Pendiente de realizar'",
      [
        movimientoId,
        fechaReal,
        new Date(now).toISOString(),
        id,
        row.revision,
      ],
    );
    if (result.changes !== 1)
      throw new Problem(
        409,
        "REVISION_CONFLICT",
        "La Transferencia pendiente ha cambiado. Revisa su ficha.",
      );
    const after = pending(db, id)!;
    audit(
      db,
      id,
      after.revision,
      "confirmacion",
      row,
      after,
      null,
      ["estado", "movimiento", "fechaEfectiva"],
      now,
    );
    return pendingDto(db, after, now);
  });
}

export function cancelarTransferenciaPendiente(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  return conIntento(db, "cancelar", { id, ...body }, key, now, () => {
    for (const name of Object.keys(body))
      if (!["revision", "motivo"].includes(name))
        throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
    const row = pending(db, id);
    if (!row)
      throw new Problem(
        404,
        "NOT_FOUND",
        "Transferencia pendiente no encontrada.",
      );
    requirePendiente(row);
    requireRevision(row, body.revision);
    const motive = textField(body.motivo, "motivo", 2000, false).trim();
    const result = db.run(
      "UPDATE transferencia_pendiente SET estado='Cancelada',motivo_cancelacion=?,revision=revision+1,actualizado=? WHERE id=? AND revision=? AND estado='Pendiente de realizar'",
      [motive, new Date(now).toISOString(), id, row.revision],
    );
    if (result.changes !== 1)
      throw new Problem(
        409,
        "REVISION_CONFLICT",
        "La Transferencia pendiente ha cambiado. Revisa su ficha.",
      );
    const after = pending(db, id)!;
    audit(
      db,
      id,
      after.revision,
      "cancelacion",
      row,
      after,
      motive,
      ["estado", "motivoCancelacion"],
      now,
    );
    return pendingDto(db, after, now);
  });
}

function candidates(db: Database, row: PendingRow) {
  return (
    db
      .query(
        `SELECT m.id,m.fecha,m.tipo,CAST(m.importe AS TEXT) importe,m.origen,m.destino,m.referencia,m.concepto,m.nota,m.anulado,m.revision
         FROM movimientos m
         WHERE m.tipo='Transferencia' AND m.anulado=0
           AND m.origen=? AND m.destino=? AND m.importe=? AND m.referencia IS NULL
           AND NOT EXISTS (SELECT 1 FROM transferencia_pendiente p WHERE p.movimiento=m.id)
         ORDER BY m.fecha DESC,length(m.id) DESC,m.id DESC`,
      )
      .all(row.origen, row.destino, row.importe) as (Omit<
      MovementRow,
      "importe"
    > & { importe: string })[]
  ).map((m) => ({ ...m, importe: decimal(m.importe) }));
}

export function candidatosTransferenciaPendiente(
  db: Database,
  idValue: unknown,
) {
  const id = identifier(idValue);
  const row = pending(db, id);
  if (!row)
    throw new Problem(404, "NOT_FOUND", "Transferencia pendiente no encontrada.");
  return { items: candidates(db, row) };
}

export function vincularTransferenciaPendiente(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  return conIntento(db, "vincular", { id, ...body }, key, now, () => {
    for (const name of Object.keys(body))
      if (!["revision", "movimientoId"].includes(name))
        throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
    const row = pending(db, id);
    if (!row)
      throw new Problem(
        404,
        "NOT_FOUND",
        "Transferencia pendiente no encontrada.",
      );
    requirePendiente(row);
    requireRevision(row, body.revision);
    if (body.movimientoId === undefined)
      throw new Problem(422, "VALIDATION", "Indica el Movimiento a vincular.", {
        movimientoId: "Identificador obligatorio.",
      });
    const movementId =
      typeof body.movimientoId === "number"
        ? String(body.movimientoId)
        : typeof body.movimientoId === "string"
          ? body.movimientoId
          : "";
    if (!/^\d+$/.test(movementId))
      throw new Problem(422, "VALIDATION", "Movimiento inválido.", {
        movimientoId: "Identificador numérico.",
      });
    const m = movement(db, movementId);
    if (!m)
      throw new Problem(404, "NOT_FOUND", "Movimiento no encontrado.");
    if (m.anulado === 1)
      throw new Problem(
        422,
        "VALIDATION",
        "Un Movimiento anulado no puede resolver el pendiente.",
        { movimientoId: "Selecciona una Transferencia vigente." },
      );
    if (m.tipo !== "Transferencia")
      throw new Problem(
        422,
        "VALIDATION",
        "El Movimiento debe ser una Transferencia.",
        { movimientoId: "Selecciona una Transferencia." },
      );
    if (m.referencia !== null)
      throw new Problem(
        422,
        "REFERENCIA_NO_ADMITIDA",
        "Incremento 1 no vincula Transferencias con Referencia.",
        { movimientoId: "Selecciona una Transferencia ordinaria sin Referencia." },
      );
    if (
      m.origen !== row.origen ||
      m.destino !== row.destino ||
      m.importe !== row.importe
    )
      throw new Problem(
        422,
        "VALIDATION",
        "La Transferencia no coincide en origen, destino e importe.",
        { movimientoId: "Selecciona una Transferencia exacta." },
      );
    const linked = db
      .query("SELECT id FROM transferencia_pendiente WHERE movimiento=?")
      .get(m.id) as { id: number } | null;
    if (linked)
      throw new Problem(
        409,
        "MOVEMENT_ALREADY_LINKED",
        "El Movimiento ya está vinculado a otra Transferencia pendiente.",
        {},
        { pendiente: linked.id },
      );
    const result = db.run(
      "UPDATE transferencia_pendiente SET estado='Confirmada',movimiento=?,fecha_efectiva=?,revision=revision+1,actualizado=? WHERE id=? AND revision=? AND estado='Pendiente de realizar'",
      [m.id, m.fecha, new Date(now).toISOString(), id, row.revision],
    );
    if (result.changes !== 1)
      throw new Problem(
        409,
        "REVISION_CONFLICT",
        "La Transferencia pendiente ha cambiado. Revisa su ficha.",
      );
    const after = pending(db, id)!;
    audit(
      db,
      id,
      after.revision,
      "confirmacion",
      row,
      after,
      null,
      ["estado", "movimiento", "fechaEfectiva"],
      now,
    );
    return pendingDto(db, after, now);
  });
}

/**
 * Single IMMEDIATE transaction per write with the shared attempt table. The
 * same key + payload replays the stored response and status; another payload
 * with the same key is a conflict. TTL 24 h.
 */
function conIntento<T>(
  db: Database,
  operation: string,
  payload: Record<string, unknown>,
  key: string,
  now: number,
  run: () => T,
): T {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const hash = fingerprint([
    operation,
    Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return db
    .transaction(() => {
      db.run("DELETE FROM transferencia_pendiente_attempts WHERE expires<?", [
        now,
      ]);
      const retry = db
        .query(
          "SELECT hash,response FROM transferencia_pendiente_attempts WHERE operacion=? AND key=?",
        )
        .get(operation, key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as T;
      }
      const result = run();
      db.run(
        "INSERT INTO transferencia_pendiente_attempts(operacion,key,hash,response,expires) VALUES(?,?,?,?,?)",
        [operation, key, hash, JSON.stringify(result), now + 86400000],
      );
      return result;
    })
    .immediate();
}
