import type { Database } from "bun:sqlite";
import { Problem, decimal, money, getSaldo } from "./saldos";
import { civil, cycleContext, cycleMaster, type Cycle } from "./ciclos";
import { fingerprint, ledgerRows, type LedgerRow } from "./movement-ledger";
import { spanishToday } from "./movimientos";
import {
  revisionComidaById,
  revisionComidaRange,
  revisionComidaRows,
  type RevisionComidaRow,
} from "./revision-comida-ledger";

export const clasificaciones = [
  "Comida",
  "Pendiente revisar",
  "Ocio",
  "Niños",
  "Otros",
  "Fuera presupuesto",
] as const;
export type Clasificacion = (typeof clasificaciones)[number];
export const clasificacionGroups: Record<
  Clasificacion,
  "Gasto comida" | "Compensable" | "Excluido del análisis"
> = {
  Comida: "Gasto comida",
  "Pendiente revisar": "Gasto comida",
  Ocio: "Compensable",
  Niños: "Compensable",
  Otros: "Compensable",
  "Fuera presupuesto": "Excluido del análisis",
};
const tipos = ["Detalle", "Reposicion"] as const;
type Tipo = (typeof tipos)[number];
const commonFields = [
  "tipo",
  "fecha",
  "concepto",
  "importe",
  "direccion",
  "esDevolucion",
  "evidenciaBancaria",
  "cuentaOrigen",
] as const;
const detailFields = [
  ...commonFields,
  "clasificacion",
  "evidenciaRelacionCompra",
] as const;
const fieldsFor = (tipo: Tipo) =>
  tipo === "Detalle" ? detailFields : commonFields;
const editable = (tipo: Tipo, body: Record<string, unknown>) =>
  Object.fromEntries(
    fieldsFor(tipo)
      .filter((f) => f in body)
      .map((f) => [f, body[f]]),
  );

function fail(
  fields: Record<string, string>,
  message = "Revisa los campos indicados.",
): never {
  throw new Problem(422, "VALIDATION", message, fields);
}
function text(
  value: unknown,
  name: string,
  max = 500,
  required = false,
): string | null {
  if (value === undefined || value === null || value === "")
    return required ? (fail({ [name]: "Campo obligatorio." }), null) : null;
  if (typeof value !== "string" || value.length > max)
    fail({ [name]: `Texto válido, máximo ${max} caracteres.` });
  const clean = value.trim();
  if (required && !clean) fail({ [name]: "Campo obligatorio." });
  if (!clean) return null;
  return clean;
}

type Candidate = {
  tipo: Tipo;
  fecha: string;
  concepto: string;
  importe: string;
  direccion: "Salida" | "Entrada";
  esDevolucion: boolean;
  clasificacion: Clasificacion | null;
  evidenciaBancaria: string | null;
  evidenciaRelacionCompra: string | null;
  cuentaOrigen: string | null;
};
type Editable = Omit<Candidate, "tipo">;

function oldEditable(row: RevisionComidaRow): Editable {
  return {
    fecha: row.fecha,
    concepto: row.concepto,
    importe: decimal(row.importe)!,
    direccion: row.direccion,
    esDevolucion: row.esDevolucion === 1,
    clasificacion: row.clasificacion as Clasificacion | null,
    evidenciaBancaria: row.evidenciaBancaria,
    evidenciaRelacionCompra: row.evidenciaRelacionCompra,
    cuentaOrigen: row.cuentaOrigen,
  };
}

/** Validates a complete candidate. Link fields are never writable here. */
function validated(
  body: Record<string, unknown>,
  old: RevisionComidaRow | null,
  now: number,
  tipo: Tipo,
): Candidate {
  if (body.tipo !== undefined && body.tipo !== tipo)
    fail({ tipo: "El tipo de operación no se puede cambiar." });
  const merged = {
    ...(old ? oldEditable(old) : {}),
    ...editable(tipo, body),
  } as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const problem = (name: string, message: string) => {
    errors[name] = message;
  };
  let fecha = "";
  try {
    fecha = civil(merged.fecha);
    if (fecha > spanishToday(now))
      problem("fecha", "No se admiten fechas futuras (España).");
  } catch {
    problem("fecha", "Indica una fecha civil válida.");
  }
  let importe = "";
  try {
    if (typeof merged.importe !== "string" || !merged.importe)
      throw Error();
    const cents = money(merged.importe);
    if (cents === null || cents <= 0n) throw Error();
    importe = decimal(cents)!;
  } catch {
    problem("importe", "Importe EUR exacto mayor que cero, máximo dos decimales.");
  }
  let concepto = "";
  try {
    concepto = text(merged.concepto, "concepto", 500, true) ?? "";
  } catch (e) {
    if (e instanceof Problem) Object.assign(errors, e.fields);
    else throw e;
  }
  const direccion = merged.direccion;
  if (direccion !== "Salida" && direccion !== "Entrada")
    problem("direccion", "Selecciona Salida o Entrada.");
  let esDevolucion = false;
  if (typeof merged.esDevolucion !== "boolean")
    problem(
      "esDevolucion",
      "Indica expresamente si es devolución; no se infiere por dirección.",
    );
  else esDevolucion = merged.esDevolucion;
  let clasificacion: Clasificacion | null = null;
  if (tipo === "Reposicion") {
    if (
      merged.clasificacion !== undefined &&
      merged.clasificacion !== null &&
      merged.clasificacion !== ""
    )
      problem("clasificacion", "No aplica a una reposición.");
  } else {
    if (!clasificaciones.includes(merged.clasificacion as Clasificacion))
      problem("clasificacion", "Selecciona una clasificación válida.");
    else clasificacion = merged.clasificacion as Clasificacion;
  }
  let evidenciaBancaria: string | null = null;
  try {
    evidenciaBancaria = text(merged.evidenciaBancaria, "evidenciaBancaria", 1000);
  } catch (e) {
    if (e instanceof Problem) Object.assign(errors, e.fields);
    else throw e;
  }
  if (tipo === "Reposicion" && !evidenciaBancaria)
    problem(
      "evidenciaBancaria",
      "Una reposición real exige evidencia bancaria.",
    );
  let evidenciaRelacionCompra: string | null = null;
  if (tipo === "Detalle") {
    const raw = merged.evidenciaRelacionCompra;
    if (raw !== undefined && raw !== null && raw !== "") {
      if (typeof raw !== "string" || !raw.trim() || raw.length > 1000)
        problem(
          "evidenciaRelacionCompra",
          "Relación incompleta: indica documento o motivo válido.",
        );
      else evidenciaRelacionCompra = raw.trim();
    }
  } else if (
    merged.evidenciaRelacionCompra !== undefined &&
    merged.evidenciaRelacionCompra !== null &&
    merged.evidenciaRelacionCompra !== ""
  )
    problem("evidenciaRelacionCompra", "No aplica a una reposición.");
  let cuentaOrigen: string | null = null;
  try {
    cuentaOrigen = text(merged.cuentaOrigen, "cuentaOrigen", 200);
  } catch (e) {
    if (e instanceof Problem) Object.assign(errors, e.fields);
    else throw e;
  }
  if (tipo === "Detalle" && direccion === "Salida" && esDevolucion)
    problem("esDevolucion", "Una salida no se registra como devolución.");
  if (tipo === "Detalle" && direccion === "Entrada" && !esDevolucion)
    problem(
      "esDevolucion",
      "Una entrada de detalle exige devolución identificada expresamente.",
    );
  if (tipo === "Reposicion" && direccion === "Salida")
    problem("direccion", "Una reposición es una entrada.");
  if (tipo === "Reposicion" && esDevolucion)
    problem("esDevolucion", "Una reposición no es una devolución.");
  if (Object.keys(errors).length) fail(errors);
  return {
    tipo,
    fecha,
    concepto,
    importe,
    direccion: direccion as "Salida" | "Entrada",
    esDevolucion,
    clasificacion,
    evidenciaBancaria,
    evidenciaRelacionCompra,
    cuentaOrigen,
  };
}

function auditValue(row: RevisionComidaRow) {
  return {
    ...row,
    importe: decimal(row.importe),
    esDevolucion: row.esDevolucion === 1,
    fueraPresupuestoHistorico: row.fueraPresupuestoHistorico === 1,
  };
}

function movementMap(db: Database) {
  return new Map(ledgerRows(db).map((m) => [m.id, m]));
}
function cycleFor(cycles: Cycle[], fecha: string) {
  return (
    cycles.find(
      (c) => c.inicio <= fecha && (c.fin === null || fecha <= c.fin),
    ) ?? null
  );
}
function linkState(row: RevisionComidaRow, movement: LedgerRow | undefined) {
  if (row.estadoVinculo === "Sin vínculo" || !row.movimiento)
    return "Sin vínculo" as const;
  if (
    !movement ||
    movement.anulado ||
    movement.revision !== row.revisionMovimiento
  )
    return "Revisar" as const;
  return "Verificado" as const;
}
function movementDto(db: Database, m: LedgerRow) {
  const name = (id: string) =>
    (db.query("SELECT nombre,control,tipo FROM saldos WHERE id=?").get(id) as
      | { nombre: string; control: string; tipo: string }
      | null) ?? null;
  return {
    id: m.id,
    fecha: m.fecha,
    tipo: m.tipo,
    importe: decimal(m.importe),
    concepto: m.concepto,
    origen: m.origen,
    destino: m.destino,
    origenNombre: name(m.origen)?.nombre ?? null,
    origenControl: name(m.origen)?.control ?? null,
    destinoNombre: name(m.destino)?.nombre ?? null,
    destinoControl: name(m.destino)?.control ?? null,
    anulado: m.anulado === 1,
    revision: m.revision,
  };
}
function decorate(
  db: Database,
  row: RevisionComidaRow,
  cycles: Cycle[],
  movements: Map<string, LedgerRow>,
) {
  const movement = row.movimiento ? movements.get(row.movimiento) : undefined;
  const estadoVinculo = linkState(row, movement);
  return {
    id: row.id,
    tipo: row.tipo,
    fecha: row.fecha,
    concepto: row.concepto,
    importe: decimal(row.importe)!,
    direccion: row.direccion,
    esDevolucion: row.esDevolucion === 1,
    clasificacion: row.clasificacion,
    fueraPresupuestoHistorico: row.fueraPresupuestoHistorico === 1,
    evidenciaBancaria: row.evidenciaBancaria,
    estadoEvidenciaBancaria: row.evidenciaBancaria
      ? ("Con evidencia" as const)
      : ("Sin evidencia" as const),
    evidenciaRelacionCompra: row.evidenciaRelacionCompra,
    relacionCompra: row.evidenciaRelacionCompra
      ? ("Acreditada" as const)
      : ("Sin relación acreditada" as const),
    cuentaOrigen: row.cuentaOrigen,
    tipoVinculo: row.tipoVinculo,
    estadoVinculo,
    evidenciaVinculo: row.evidenciaVinculo,
    vinculoMovimiento: movement ? movementDto(db, movement) : null,
    sinConciliacion: row.tipoVinculo === "Agregado terminal",
    estadoRegistro: row.estadoRegistro,
    estadoTrazabilidad: row.estadoTrazabilidad,
    revision: row.revision,
    creado: row.creado,
    actualizado: row.actualizado,
    ciclo: cycleFor(cycles, row.fecha),
    efecto:
      "Operación bancaria individual; no crea Gasto, Saldo ni ejecución presupuestaria.",
  };
}

function find(db: Database, id: string, tipo?: Tipo) {
  if (!/^\d+$/.test(id))
    throw new Problem(422, "VALIDATION", "ID de operación inválido.");
  const row = revisionComidaById(db, id);
  if (!row || (tipo && row.tipo !== tipo))
    throw new Problem(404, "NOT_FOUND", "Operación no encontrada.");
  return row;
}
function revisionFrom(body: Record<string, unknown>, old: RevisionComidaRow) {
  if (
    typeof body.revision !== "number" ||
    !Number.isSafeInteger(body.revision) ||
    body.revision < 1
  )
    fail({ revision: "Indica la revisión actual." });
  if (body.revision !== old.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "La operación ha cambiado. Revisa su ficha antes de continuar.",
    );
}
function motive(body: Record<string, unknown>, required = true) {
  const value = text(body.motivo, "motivo", 1000, required);
  if (required && !value) fail({ motivo: "Motivo obligatorio." });
  return value;
}
function rejectUnknown(body: Record<string, unknown>, allowed: readonly string[]) {
  for (const name of Object.keys(body))
    if (!allowed.includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`, {
        [name]: "Campo no editable.",
      });
}

function attempt<T>(
  db: Database,
  key: string,
  hash: string,
  now: number,
  execute: () => T,
): T {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  return db
    .transaction(() => {
      db.run("DELETE FROM revision_comida_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM revision_comida_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as T;
      }
      const response = execute();
      db.run("INSERT INTO revision_comida_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(response),
        now + 86400000,
      ]);
      return response;
    })
    .immediate();
}

function audit(
  db: Database,
  id: string,
  revision: number,
  action: string,
  previous: unknown,
  posterior: unknown,
  motivo: string | null,
  time: string,
) {
  db.run(
    "INSERT INTO revision_comida_audit(operacion,accion,revision,anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')",
    [
      id,
      action,
      revision,
      previous === null ? null : JSON.stringify(previous),
      JSON.stringify(posterior),
      motivo,
      time,
    ],
  );
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,?,?,?,?,'usuario-unico',?)",
    [
      "revision-comida:" + id,
      action,
      revision,
      JSON.stringify(
        action === "anulación"
          ? ["estado_registro"]
          : action === "vínculo" || action === "desvínculo"
            ? ["movimiento", "tipo_vinculo", "evidencia_vinculo"]
            : fieldsFor(
                (previous as RevisionComidaRow | null)?.tipo ??
                  (posterior as RevisionComidaRow).tipo,
              ),
      ),
      time,
      (previous as RevisionComidaRow | null)?.revision ?? 0,
      motivo,
    ],
  );
}

export function createRevisionComida(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
  tipo: Tipo = "Detalle",
) {
  rejectUnknown(body, fieldsFor(tipo));
  if (
    body.tipo !== undefined &&
    (typeof body.tipo !== "string" || body.tipo !== tipo)
  )
    fail({ tipo: "Tipo no válido para esta ruta." });
  const hash = fingerprint([
    "alta",
    tipo,
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return attempt(db, key, hash, now, () => {
    const candidate = validated(body, null, now, tipo),
      time = new Date(now).toISOString(),
      rows = revisionComidaRows(db);
    if (tipo === "Reposicion") {
      const duplicate = rows.find(
        (r) =>
          r.estadoRegistro === "Vigente" &&
          r.tipo === "Reposicion" &&
          (r.evidenciaBancaria ?? "").trim().toLocaleLowerCase("es") ===
            candidate.evidenciaBancaria!.toLocaleLowerCase("es"),
      );
      if (duplicate)
        throw new Problem(
          409,
          "DUPLICATE",
          "Ya existe una reposición vigente con la misma evidencia bancaria.",
        );
    }
    const coincidencias = rows
        .filter(
          (r) =>
            r.estadoRegistro === "Vigente" &&
            r.tipo === tipo &&
            r.fecha === candidate.fecha &&
            r.direccion === candidate.direccion &&
            r.importe === money(candidate.importe)!.toString() &&
            r.concepto.toLocaleLowerCase("es") ===
              candidate.concepto.toLocaleLowerCase("es"),
        )
        .map((r) => ({ id: r.id, fecha: r.fecha, concepto: r.concepto }));
    const reserved = db
      .query(
        "UPDATE counters SET next=next+1 WHERE name='revision_comida' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
      )
      .get() as { n: string } | null;
    if (!reserved)
      throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
    const id = reserved.n;
    db.run(
      `INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,clasificacion,fuera_presupuesto_historico,evidencia_bancaria,evidencia_relacion_compra,cuenta_origen,tipo_vinculo,estado_vinculo,evidencia_vinculo,movimiento,revision_movimiento,estado_registro,estado_trazabilidad,revision,creado,actualizado)
       VALUES(?,?,?,?,?,?,?,?,NULL,?,?,?,NULL,'Sin vínculo',NULL,NULL,NULL,'Vigente','Sin asignación',1,?,?)`,
      [
        id,
        tipo,
        candidate.fecha,
        candidate.concepto,
        money(candidate.importe)!,
        candidate.direccion,
        candidate.esDevolucion ? 1 : 0,
        candidate.clasificacion,
        candidate.evidenciaBancaria,
        candidate.evidenciaRelacionCompra,
        candidate.cuentaOrigen,
        time,
        time,
      ],
    );
    const after = find(db, id, tipo);
    audit(db, id, 1, "alta", null, auditValue(after), null, time);
    return {
      ...getRevisionComida(db, id),
      coincidencias,
    };
  });
}

export function rectificarRevisionComida(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
  tipo: Tipo = "Detalle",
) {
  rejectUnknown(body, [...fieldsFor(tipo), "revision", "motivo"]);
  const hash = fingerprint([
    "rectificación",
    tipo,
    id,
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return attempt(db, key, hash, now, () => {
    const old = find(db, id, tipo);
    if (old.estadoRegistro === "Anulado")
      throw new Problem(
        409,
        "ANNULLED",
        "Una operación anulada no se rectifica; conserva su historia.",
      );
    revisionFrom(body, old);
    const motivo = motive(body)!,
      candidate = validated(body, old, now, tipo),
      time = new Date(now).toISOString();
    db.run(
      `UPDATE revision_comida SET fecha=?,concepto=?,importe=?,direccion=?,es_devolucion=?,clasificacion=?,evidencia_bancaria=?,evidencia_relacion_compra=?,cuenta_origen=?,revision=revision+1,actualizado=? WHERE id=?`,
      [
        candidate.fecha,
        candidate.concepto,
        money(candidate.importe)!,
        candidate.direccion,
        candidate.esDevolucion ? 1 : 0,
        candidate.clasificacion,
        candidate.evidenciaBancaria,
        candidate.evidenciaRelacionCompra,
        candidate.cuentaOrigen,
        time,
        id,
      ],
    );
    const after = find(db, id, tipo);
    audit(
      db,
      id,
      after.revision,
      "rectificación",
      auditValue(old),
      auditValue(after),
      motivo,
      time,
    );
    return getRevisionComida(db, id);
  });
}

export function anularRevisionComida(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
  tipo: Tipo = "Detalle",
) {
  rejectUnknown(body, ["revision", "motivo"]);
  const hash = fingerprint([
    "anulación",
    tipo,
    id,
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return attempt(db, key, hash, now, () => {
    const old = find(db, id, tipo);
    if (old.estadoRegistro === "Anulado")
      throw new Problem(
        409,
        "ANNULLED",
        "La operación ya está anulada; conserva su historia.",
      );
    revisionFrom(body, old);
    const motivo = motive(body)!,
      time = new Date(now).toISOString();
    db.run(
      "UPDATE revision_comida SET estado_registro='Anulado',revision=revision+1,actualizado=? WHERE id=?",
      [time, id],
    );
    const after = find(db, id, tipo);
    audit(
      db,
      id,
      after.revision,
      "anulación",
      auditValue(old),
      auditValue(after),
      motivo,
      time,
    );
    return getRevisionComida(db, id);
  });
}

function eligibleLink(
  db: Database,
  row: RevisionComidaRow,
  movimiento: LedgerRow,
  tipoVinculo: string,
) {
  if (movimiento.anulado)
    fail({ movimiento: "El Movimiento está anulado." }, "Movimiento no elegible.");
  if (row.tipo === "Detalle") {
    if (movimiento.tipo !== "Gasto")
      fail(
        { movimiento: "Un detalle solo se vincula a un Gasto." },
        "Movimiento no elegible.",
      );
    if (!["Individual", "Agregado terminal"].includes(tipoVinculo))
      fail({ tipoVinculo: "Selecciona Individual o Agregado terminal." });
    const source = getSaldo(db, movimiento.origen);
    if (
      source.id === "S000" ||
      source.tipo === "Exterior" ||
      source.control === "Exterior"
    )
      fail(
        {
          movimiento:
            "Movimientos con Exterior/D5 no habilitados para este vínculo.",
        },
        "Movimiento no elegible.",
      );
    if (tipoVinculo === "Agregado terminal" && source.control !== "Terminal")
      fail(
        {
          tipoVinculo:
            "Un agregado terminal solo admite un Gasto originado en Terminal.",
        },
        "Movimiento no elegible.",
      );
    return;
  }
  if (tipoVinculo !== "Individual")
    fail({ tipoVinculo: "Una reposición solo admite vínculo Individual." });
  if (movimiento.tipo === "Ingreso") {
    if (!movimiento.subtipo)
      fail(
        { movimiento: "El Ingreso no tiene Subtipo existente." },
        "Movimiento no elegible.",
      );
    return;
  }
  if (movimiento.tipo !== "Transferencia")
    fail(
      {
        movimiento:
          "Una reposición solo se vincula a Transferencia interna o Ingreso existente.",
      },
      "Movimiento no elegible.",
    );
  for (const saldo of [movimiento.origen, movimiento.destino]) {
    const value = getSaldo(db, saldo);
    if (value.id === "S000" || value.tipo === "Exterior" || value.control === "Exterior")
      fail(
        {
          movimiento:
            "Transferencias con Exterior/D5 no habilitadas para este vínculo.",
        },
        "Movimiento no elegible.",
      );
  }
}

export function vincularRevisionComida(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
  tipo: Tipo = "Detalle",
) {
  rejectUnknown(body, [
    "revision",
    "motivo",
    "movimiento",
    "tipoVinculo",
    "evidenciaVinculo",
    "desvincular",
  ]);
  const hash = fingerprint([
    "vínculo",
    tipo,
    id,
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return attempt(db, key, hash, now, () => {
    const old = find(db, id, tipo);
    if (old.estadoRegistro === "Anulado")
      throw new Problem(
        409,
        "ANNULLED",
        "Una operación anulada no cambia su vínculo.",
      );
    revisionFrom(body, old);
    const motivo = motive(body)!,
      time = new Date(now).toISOString();
    const unlink =
      body.desvincular === true ||
      body.movimiento === null ||
      body.movimiento === "";
    if (body.desvincular !== undefined && typeof body.desvincular !== "boolean")
      fail({ desvincular: "Valor booleano requerido." });
    if (unlink) {
      if (old.estadoVinculo === "Sin vínculo" || !old.movimiento)
        fail({ movimiento: "La operación no tiene vínculo que retirar." });
      db.run(
        `UPDATE revision_comida SET tipo_vinculo=NULL,estado_vinculo='Sin vínculo',evidencia_vinculo=NULL,movimiento=NULL,revision_movimiento=NULL,revision=revision+1,actualizado=? WHERE id=?`,
        [time, id],
      );
      const after = find(db, id, tipo);
      audit(
        db,
        id,
        after.revision,
        "desvínculo",
        auditValue(old),
        auditValue(after),
        motivo,
        time,
      );
      return getRevisionComida(db, id);
    }
    if (typeof body.movimiento !== "string" || !body.movimiento)
      fail({ movimiento: "Indica un Movimiento." });
    if (!["Individual", "Agregado terminal"].includes(body.tipoVinculo as string))
      fail({ tipoVinculo: "Selecciona un tipo de vínculo." });
    const evidencia = text(
      body.evidenciaVinculo,
      "evidenciaVinculo",
      1000,
      true,
    );
    if (!evidencia)
      fail({
        evidenciaVinculo:
          "La evidencia del vínculo es obligatoria para Verificado.",
      });
    const movement = ledgerRows(db).find((m) => m.id === body.movimiento);
    if (!movement)
      fail({ movimiento: "El Movimiento no existe." }, "Movimiento no elegible.");
    eligibleLink(db, old, movement, body.tipoVinculo as string);
    db.run(
      `UPDATE revision_comida SET tipo_vinculo=?,estado_vinculo='Verificado',evidencia_vinculo=?,movimiento=?,revision_movimiento=?,revision=revision+1,actualizado=? WHERE id=?`,
      [
        body.tipoVinculo as string,
        evidencia,
        movement.id,
        movement.revision,
        time,
        id,
      ],
    );
    const after = find(db, id, tipo);
    audit(
      db,
      id,
      after.revision,
      "vínculo",
      auditValue(old),
      auditValue(after),
      motivo,
      time,
    );
    return getRevisionComida(db, id);
  });
}

export function listRevisionComida(
  db: Database,
  params = new URLSearchParams(),
  forceTipo?: Tipo,
) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1),
      tipo = forceTipo ?? params.get("tipo") ?? "",
      estado = params.get("estado") ?? "Vigente",
      devolucion = params.get("esDevolucion") ?? "",
      vinculo = params.get("vinculo") ?? "",
      evidencia = params.get("evidencia") ?? "",
      fuera = params.get("fueraPresupuesto") ?? "",
      clasificacion = params.get("clasificacion") ?? "",
      ciclo = params.get("ciclo") ?? "";
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["", "Detalle", "Reposicion"].includes(tipo) ||
      !["", "Vigente", "Anulado"].includes(estado) ||
      !["", "true", "false"].includes(devolucion) ||
      !["", "Verificado", "Sin vínculo", "Revisar"].includes(vinculo) ||
      !["", "Con evidencia", "Sin evidencia"].includes(evidencia) ||
      !["", "true", "false"].includes(fuera) ||
      !["", ...clasificaciones].includes(clasificacion)
    )
      throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
    const from = params.get("desde"),
      to = params.get("hasta");
    if (from) civil(from);
    if (to) civil(to);
    if (from && to && from > to)
      throw new Problem(
        422,
        "VALIDATION",
        "El intervalo de fechas es inválido.",
      );
    const cycles = cycleMaster(db),
      selected = ciclo && ciclo !== "sin_ciclo" ? cycles.find((c) => c.id === ciclo) : null;
    if (ciclo && ciclo !== "sin_ciclo" && !selected)
      throw new Problem(422, "VALIDATION", "Ciclo no encontrado.");
    const query = (params.get("q") ?? "").toLocaleLowerCase("es"),
      rows = revisionComidaRows(db),
      movements = movementMap(db),
      decorated = rows.map((r) => decorate(db, r, cycles, movements)),
      allVigentes = rows.filter((r) => r.estadoRegistro === "Vigente"),
      range = revisionComidaRange(db);
    const filtered = decorated.filter(
      (r) =>
        (!tipo || r.tipo === tipo) &&
        (!estado || r.estadoRegistro === estado) &&
        (!devolucion || String(r.esDevolucion) === devolucion) &&
        (!clasificacion || r.clasificacion === clasificacion) &&
        (!vinculo || r.estadoVinculo === vinculo) &&
        (!evidencia || r.estadoEvidenciaBancaria === evidencia) &&
        (!fuera ||
          (fuera === "true"
            ? r.clasificacion === "Fuera presupuesto"
            : r.clasificacion !== "Fuera presupuesto")) &&
        (!from || r.fecha >= from) &&
        (!to || r.fecha <= to) &&
        (!ciclo ||
          (ciclo === "sin_ciclo"
            ? r.ciclo === null
            : r.ciclo?.id === ciclo)) &&
        `${r.id} ${r.concepto}`
          .toLocaleLowerCase("es")
          .includes(query),
    );
    filtered.sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.id.length - a.id.length ||
        b.id.localeCompare(a.id),
    );
    const inSelected = (fecha: string) =>
      !!selected &&
      selected.inicio <= fecha &&
      (selected.fin === null || fecha <= selected.fin);
    const fueraDeCiclo = selected
      ? allVigentes.filter((r) => !inSelected(r.fecha)).length
      : 0;
    const sinCicloAsignable = allVigentes.filter(
      (r) => !cycleFor(cycles, r.fecha),
    ).length;
    let estadoCobertura:
      | "sin_operaciones"
      | "sin_cobertura_historica"
      | "cobertura_parcial"
      | "disponible" = "disponible";
    if (!allVigentes.length || !range.desde || !range.hasta)
      estadoCobertura = "sin_operaciones";
    else if (
      (to && to < range.desde) ||
      (from && from > range.hasta)
    )
      estadoCobertura = "sin_cobertura_historica";
    else if (
      (from && from < range.desde) ||
      (to && to > range.hasta)
    )
      estadoCobertura = "cobertura_parcial";
    const cicloCobertura = (() => {
      if (!selected) return null;
      // The observed min/max never proves an uninterrupted complete period, even
      // when it spans a closed cycle. E3.4 always reports partial cycle coverage.
      return "Parcial";
    })();
    const base = {
      total: filtered.length,
      page,
      contexto: cycleContext(db),
      cobertura: {
        desde: range.desde,
        hasta: range.hasta,
        solicitadoDesde: from ?? null,
        solicitadoHasta: to ?? null,
        estado: estadoCobertura,
      },
      ciclo: selected
        ? {
            id: selected.id,
            inicio: selected.inicio,
            fin: selected.fin,
            estadoTemporal: selected.estadoTemporal,
            cobertura: cicloCobertura,
          }
        : null,
      sinCicloAsignable,
      fueraDeCiclo,
    };
    return {
      ...base,
      pageItems: filtered.slice((page - 1) * 100, page * 100),
    };
  })();
}

export function listReposiciones(db: Database, params = new URLSearchParams()) {
  const result = listRevisionComida(db, params, "Reposicion");
  return {
    reposiciones: result.pageItems,
    total: result.total,
    page: result.page,
    contexto: result.contexto,
    cobertura: result.cobertura,
    ciclo: result.ciclo,
    sinCicloAsignable: result.sinCicloAsignable,
    fueraDeCiclo: result.fueraDeCiclo,
  };
}

export function listOperaciones(db: Database, params = new URLSearchParams()) {
  const result = listRevisionComida(db, params);
  return {
    operaciones: result.pageItems,
    total: result.total,
    page: result.page,
    contexto: result.contexto,
    cobertura: result.cobertura,
    ciclo: result.ciclo,
    sinCicloAsignable: result.sinCicloAsignable,
    fueraDeCiclo: result.fueraDeCiclo,
  };
}

export function getRevisionComida(db: Database, id: string, tipo?: Tipo) {
  return db.transaction(() => {
    const row = find(db, id, tipo),
      cycles = cycleMaster(db),
      movements = movementMap(db),
      all = revisionComidaRows(db),
      operacion = decorate(db, row, cycles, movements),
      ciclo = operacion.ciclo;
    return {
      operacion,
      auditoria: (
        db
          .query(
            "SELECT revision,accion,motivo,instante,actor,anterior,posterior FROM revision_comida_audit WHERE operacion=? ORDER BY id",
          )
          .all(id) as {
          revision: number;
          accion: string;
          motivo: string | null;
          instante: string;
          actor: string;
          anterior: string | null;
          posterior: string;
        }[]
      ).map((a) => ({
        ...a,
        anterior: a.anterior ? JSON.parse(a.anterior) : null,
        posterior: JSON.parse(a.posterior),
      })),
      reposiciones: all
        .filter(
          (r) =>
            r.tipo === "Reposicion" &&
            (!ciclo ||
              (ciclo.inicio <= r.fecha &&
                (ciclo.fin === null || r.fecha <= ciclo.fin))),
        )
        .map((r) => decorate(db, r, cycles, movements)),
      contexto: cycleContext(db),
    };
  })();
}

export function revisionComidaOptions(db: Database, now = Date.now()) {
  return db.transaction(() => ({
    clasificaciones: clasificaciones.map((valor) => ({
      valor,
      grupo: clasificacionGroups[valor],
    })),
    movimientos: ledgerRows(db)
      .filter((m) => !m.anulado)
      .map((m) => movementDto(db, m)),
    hoy: spanishToday(now),
    contexto: cycleContext(db),
  }))();
}

export type RevisionComida = ReturnType<typeof getRevisionComida>;
