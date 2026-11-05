import {
  ledgerInstalled,
  positionCents,
  saldoHasEconomicUse,
  fingerprint,
} from "./movement-ledger";
import { Schema } from "effect";
import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { cashAt, cents, investmentInstalled } from "./investment-engine";

import { Problem } from "./problem";
import {
  assertSaldoCreationWritable,
  saldoClosureConflict,
  saldoEconomicReview,
  type SaldoGuardValue,
} from "./e49-guards";
export { Problem } from "./problem";
export const pairs: Record<string, string[]> = {
  Efectivo: ["Movimientos", "Terminal", "No controlado", "Inversiones"],
  Inversión: ["Inversiones"],
};
export const booleanFields = [
  "liquidez",
  "mostrarComoBolsa",
  "permiteSalidaExterior",
] as const;
export type SaldoInput = {
  nombre: string;
  tipo: string;
  control: string;
  estado: string;
  finalidad: string | null;
  liquidez: boolean | null;
  mostrarComoBolsa: boolean | null;
  permiteSalidaExterior: boolean | null;
  fechaApertura: string | null;
  saldoApertura: string | null;
  objetivo: string | null;
};
export type Saldo = SaldoInput & {
  id: string;
  revision: number;
  posicion: { importe: string | null; condicion: string; motivo: string };
};
// Structural validation uses the already approved Effect dependency; economics remain explicit below.
const textOrNull = Schema.NullOr(Schema.String);
const writeFields: Record<string, Schema.Schema.AnyNoContext> = {
  nombre: Schema.String,
  tipo: Schema.String,
  control: Schema.String,
  estado: Schema.String,
  finalidad: textOrNull,
  fechaApertura: textOrNull,
  saldoApertura: textOrNull,
  objetivo: textOrNull,
  liquidez: Schema.Boolean,
  mostrarComoBolsa: Schema.Boolean,
  permiteSalidaExterior: Schema.Boolean,
};
const allowed = [
  "nombre",
  "tipo",
  "control",
  "estado",
  "finalidad",
  ...booleanFields,
  "fechaApertura",
  "saldoApertura",
  "objetivo",
];
export function money(value: unknown): bigint | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^-?(0|[1-9]\d*)(\.\d{1,2})?$/.test(value))
    throw new Problem(
      422,
      "VALIDATION",
      "Importe EUR inválido; máximo dos decimales.",
    );
  const [whole, dec = ""] = value.replace("-", "").split(".");
  const n =
    (BigInt(whole) * 100n + BigInt(dec.padEnd(2, "0"))) *
    (value.startsWith("-") ? -1n : 1n);
  if (n < -9223372036854775808n || n > 9223372036854775807n)
    throw new Problem(422, "VALIDATION", "Importe fuera del rango técnico.");
  return n;
}
export function decimal(value: string | bigint | null): string | null {
  if (value === null) return null;
  const n = BigInt(value),
    abs = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}
export function position(control: string, manual: string | null = null) {
  if (control === "Manual")
    return {
      importe: manual,
      condicion: manual === null ? "no_aplica" : "manual",
      motivo:
        manual === null
          ? "Valor manual sin informar"
          : "Valor manual autorizado",
    };
  if (["Exterior", "Terminal", "No controlado"].includes(control))
    return {
      importe: null,
      condicion: "no_aplica",
      motivo:
        control === "Exterior"
          ? "Contraparte técnica"
          : `Control ${control}: sin posición convencional`,
    };
  return {
    importe: null,
    condicion: "pendiente_motor",
    motivo:
      control === "Inversiones"
        ? "Valoración de inversión no disponible hasta E4.3"
        : `Motor ${control} pendiente de entrega`,
  };
}
const select = `SELECT id,nombre,tipo,control,estado,finalidad,liquidez,bolsa,exterior,
  CAST(apertura AS TEXT) apertura,fecha_apertura,CAST(objetivo AS TEXT) objetivo,CAST(manual AS TEXT) manual,revision FROM saldos`;
type Row = {
  id: string;
  nombre: string;
  tipo: string;
  control: string;
  estado: string;
  finalidad: string | null;
  liquidez: number | null;
  bolsa: number | null;
  exterior: number | null;
  apertura: string | null;
  fecha_apertura: string | null;
  objetivo: string | null;
  manual: string | null;
  revision: number;
};
function dto(db: Database, r: Row): Saldo {
  return {
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    control: r.control,
    estado: r.estado,
    finalidad: r.finalidad,
    liquidez: r.liquidez === null ? null : r.liquidez === 1,
    mostrarComoBolsa: r.bolsa === null ? null : r.bolsa === 1,
    permiteSalidaExterior: r.exterior === null ? null : r.exterior === 1,
    fechaApertura: r.fecha_apertura,
    saldoApertura: decimal(r.apertura),
    objetivo: decimal(r.objetivo),
    revision: r.revision,
    posicion:
      r.control === "Movimientos" && ledgerInstalled(db)
        ? {
            importe: decimal(positionCents(db, r.id, r.apertura)),
            condicion: "calculado",
            motivo:
              "Apertura + entradas − salidas vigentes. Sin filtro por Fecha apertura.",
          }
        : r.tipo === "Efectivo" &&
            r.control === "Inversiones" &&
            investmentInstalled(db)
          ? {
              importe: cents(cashAt(db, r.id).disponible),
              condicion: "calculado",
              motivo:
                "Apertura + entradas − salidas − compras vigentes + ventas vigentes. Sin filtro por Fecha apertura.",
            }
          : position(r.control, decimal(r.manual)),
  };
}
function readSaldo(db: Database, id: string): Saldo {
  const r = db.query(select + " WHERE id=?").get(id) as Row | null;
  if (!r) throw new Problem(404, "NOT_FOUND", "Saldo no encontrado.");
  return dto(db, r);
}
function readSaldos(db: Database, params = new URLSearchParams()) {
  const q = (params.get("q") ?? "").toLocaleLowerCase("es");
  const estado = params.get("estado") ?? "Activa",
    tipo = params.get("tipo"),
    control = params.get("control");
  const page = Number(params.get("page") ?? "1");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Página inválida.");
  const rows = (db.query(select + " ORDER BY id").all() as Row[])
    .map((r) => dto(db, r))
    .filter(
      (s) =>
        (params.get("tecnico") === "true" || s.id !== "S000") &&
        (!estado || s.estado === estado) &&
        (!tipo || s.tipo === tipo) &&
        (!control || s.control === control) &&
        `${s.id} ${s.nombre}`.toLocaleLowerCase("es").includes(q),
    );
  return {
    saldos: rows.slice((page - 1) * 100, page * 100),
    total: rows.length,
    page,
  };
}
function validated(
  body: Record<string, unknown>,
  existing?: Saldo,
): SaldoInput {
  for (const key of Object.keys(body))
    if (!allowed.includes(key) && key !== "revision")
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`, {
        [key]: "Campo no editable",
      });
  const value = {
    ...(existing ?? {
      estado: "Activa",
      finalidad: null,
      liquidez: false,
      mostrarComoBolsa: false,
      permiteSalidaExterior: false,
      fechaApertura: null,
      saldoApertura: null,
      objetivo: null,
    }),
    ...body,
  } as unknown as SaldoInput;
  const errors: Record<string, string> = {};
  for (const [field, schema] of Object.entries(writeFields)) {
    if (field in body && !Schema.is(schema)(body[field]))
      errors[field] = "Tipo de dato no válido.";
  }
  if (
    typeof value.nombre !== "string" ||
    !value.nombre.trim() ||
    /[\u0000-\u001f\u007f]/.test(value.nombre)
  )
    errors.nombre = "Indica un nombre sin caracteres de control.";
  for (const f of booleanFields)
    if (f in body && typeof body[f] !== "boolean")
      errors[f] = "Debe ser un booleano explícito.";
  if (!["Activa", "Inactiva"].includes(value.estado))
    errors.estado = "Estado inválido.";
  if (
    ![null, "", "Gastos planificados", "Ahorro", "Inversión"].includes(
      value.finalidad,
    )
  )
    errors.finalidad = "Finalidad inválida.";
  if (
    value.fechaApertura !== null &&
    (typeof value.fechaApertura !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.fechaApertura) ||
      !Number.isFinite(Date.parse(value.fechaApertura)) ||
      new Date(value.fechaApertura).toISOString().slice(0, 10) !==
        value.fechaApertura)
  )
    errors.fechaApertura = "Fecha civil inválida.";
  for (const f of ["saldoApertura", "objetivo"] as const) {
    try {
      value[f] = decimal(money(value[f]));
    } catch (e) {
      errors[f] = (e as Error).message;
    }
  }
  if (Object.keys(errors).length)
    throw new Problem(
      422,
      "VALIDATION",
      "Revisa los campos indicados.",
      errors,
    );
  if (
    !Object.hasOwn(pairs, value.tipo) ||
    !pairs[value.tipo].includes(value.control)
  )
    throw new Problem(
      422,
      "PAIR_NOT_SUPPORTED",
      "Combinación no habilitada: requiere contraste funcional.",
    );
  value.nombre = value.nombre.trim();
  value.finalidad = value.finalidad || null;
  return value;
}
function args(v: SaldoInput) {
  return [
    v.nombre,
    v.tipo,
    v.control,
    v.estado,
    v.finalidad,
    v.liquidez === null ? null : Number(v.liquidez),
    v.mostrarComoBolsa === null ? null : Number(v.mostrarComoBolsa),
    v.permiteSalidaExterior === null ? null : Number(v.permiteSalidaExterior),
    money(v.saldoApertura),
    v.fechaApertura,
    money(v.objetivo),
  ];
}
export type ImpactGuard = (
  id: string,
  fields: string[],
  next?: SaldoGuardValue,
) => boolean;
function audit(
  db: Database,
  id: string,
  action: string,
  revision: number,
  fields: string[],
  now: number,
  motive?: string | null,
) {
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,?,?,?,?,?,?)",
    [
      id,
      action,
      revision,
      JSON.stringify(fields),
      new Date(now).toISOString(),
      revision - 1,
      "usuario-unico",
      motive !== undefined
        ? motive
        : fields.some((f) =>
            ["tipo", "control", "fechaApertura", "saldoApertura"].includes(f),
          )
          ? "Configuración sin operaciones históricas afectadas"
          : null,
    ],
  );
}
export function createSaldo(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const v = validated(body);
  const hash = createHash("sha256")
    .update(JSON.stringify(v, allowed))
    .digest("hex");
  return db
    .transaction(() => {
      db.run("DELETE FROM idempotency WHERE expires<?", [now]);
      const prev = db
        .query("SELECT hash,saldo FROM idempotency WHERE key=?")
        .get(key) as { hash: string; saldo: string } | null;
      if (prev) {
        if (prev.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        return getSaldo(db, prev.saldo);
      }
      assertSaldoCreationWritable(db, v);
      const row = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name='saldo' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) value",
        )
        .get() as { value: string } | null;
      if (!row)
        throw new Problem(
          503,
          "ID_SPACE",
          "No se pudo reservar un identificador.",
        );
      const id = "S" + row.value.padStart(3, "0"),
        time = new Date(now).toISOString();
      db.run("INSERT INTO saldos VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
        id,
        ...args(v),
        null,
        1,
        time,
        time,
      ]);
      audit(db, id, "alta", 1, allowed, now);
      db.run("INSERT INTO idempotency VALUES(?,?,?,?)", [
        key,
        hash,
        id,
        now + 86400000,
      ]);
      return getSaldo(db, id);
    })
    .immediate();
}
function planSaldo(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  guard: ImpactGuard,
) {
  const old = getSaldo(db, id);
  if (id === "S000")
    throw new Problem(
      409,
      "SYSTEM_SALDO",
      "S000 es una contraparte técnica protegida.",
    );
  if (!Number.isSafeInteger(body.revision) || body.revision !== old.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El Saldo ha cambiado. Revisa la versión actual.",
    );
  const value = validated(body, old);
  const changed = allowed.filter(
    (f) =>
      JSON.stringify(value[f as keyof SaldoInput]) !==
      JSON.stringify(old[f as keyof SaldoInput]),
  );
  const material = saldoClosureConflict(db, id, changed, value);
  const economicUse =
    saldoHasEconomicUse(db, id, changed) || guard(id, changed, value);
  const review = material.length ? [] : saldoEconomicReview(db, changed);
  const bloqueado = material.length > 0;
  const requiereRevision =
    !bloqueado && economicUse && review.length > 0;
  return {
    old,
    value,
    changed,
    material,
    economicUse,
    review,
    bloqueado,
    requiereRevision,
    cobertura: bloqueado
      ? "Atributo capturado por una foto: no se puede acreditar ausencia de impacto material."
      : requiereRevision
        ? "Cambio económico sin impacto fotográfico demostrado: exige motivo, huella y auditoría."
        : "Sin impacto material sobre una foto.",
    fingerprint: fingerprint([
      id,
      old.revision,
      changed,
      value,
      material,
      economicUse,
      review,
    ]),
  };
}

/**
 * T2 Saldo impact preview. Material changes to a stored photo are reported as
 * blocked; live economic changes that no photo captured require the explicit
 * motive/fingerprint confirmation in `rectificar`.
 */
export function previewSaldoChange(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  guard: ImpactGuard = () => false,
) {
  return db.transaction(() => {
    const p = planSaldo(db, id, body, guard);
    return {
      saldo: id,
      revision: p.old.revision,
      cambios: p.changed,
      antes: p.old,
      despues: p.value,
      bloqueado: p.bloqueado,
      requiereRevision: p.requiereRevision,
      cobertura: p.cobertura,
      cierres: (p.bloqueado ? p.material : p.review).map(
        ({ ciclo, version, inicio, fin }) => ({
          ciclo,
          version,
          inicio,
          fin,
        }),
      ),
      fingerprint: p.fingerprint,
    };
  })();
}

export function updateSaldo(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  guard: ImpactGuard = () => false,
  now = Date.now(),
  confirmation?: { fingerprint?: unknown; motivo?: unknown },
) {
  return db
    .transaction(() => {
      const p = planSaldo(db, id, body, guard);
      if (p.bloqueado)
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          "La modificación afecta a tipo, control o apertura de un Saldo capturado por un cierre; revisa la foto y la ventana antes de cambiarlo.",
          { saldo: "Atributo capturado por un cierre." },
          {
            cierres: p.material.map(({ ciclo, version, inicio, fin }) => ({
              ciclo,
              version,
              inicio,
              fin,
            })),
          },
        );
      if (p.requiereRevision) {
        if (!confirmation)
          throw new Problem(
            409,
            "RECTIFICATION_REQUIRED",
            "El cambio es económico y existe un cierre. Revisa su impacto y confirma con motivo.",
            { saldo: "Revisa el impacto antes de guardar." },
            {
              fingerprint: p.fingerprint,
              cierres: p.review.map(
                ({ ciclo, version, inicio, fin }) => ({
                  ciclo,
                  version,
                  inicio,
                  fin,
                }),
              ),
            },
          );
        if (confirmation.fingerprint !== p.fingerprint)
          throw new Problem(
            409,
            "IMPACT_CHANGED",
            "El impacto ha cambiado; genera otra revisión.",
          );
        if (
          typeof confirmation.motivo !== "string" ||
          !confirmation.motivo.trim() ||
          confirmation.motivo.length > 2000 ||
          /[\u0000-\u001f\u007f]/.test(confirmation.motivo)
        )
          throw new Problem(
            422,
            "VALIDATION",
            "Indica el motivo del cambio económico del Saldo.",
            { motivo: "Motivo obligatorio, máximo 2000 caracteres." },
          );
      } else if (p.economicUse)
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          "La modificación requiere rectificación explícita de su impacto histórico.",
        );
      const revision = p.old.revision + 1;
      db.run(
        "UPDATE saldos SET nombre=?,tipo=?,control=?,estado=?,finalidad=?,liquidez=?,bolsa=?,exterior=?,apertura=?,fecha_apertura=?,objetivo=?,revision=?,actualizado=? WHERE id=? AND revision=?",
        [
          ...args(p.value),
          revision,
          new Date(now).toISOString(),
          id,
          p.old.revision,
        ],
      );
      audit(
        db,
        id,
        "edición",
        revision,
        p.changed,
        now,
        typeof confirmation?.motivo === "string"
          ? confirmation.motivo.trim()
          : undefined,
      );
      return getSaldo(db, id);
    })
    .immediate();
}

export function getSaldo(db: Database, id: string): Saldo {
  return db.transaction(() => readSaldo(db, id))();
}
export function listSaldos(db: Database, params = new URLSearchParams()) {
  return db.transaction(() => readSaldos(db, params))();
}
