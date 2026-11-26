import type { Database } from "bun:sqlite";
import { cycleMaster, getCycle, dayBefore, type Cycle } from "./ciclos";
import { ledgerRows, fingerprint, type LedgerRow } from "./movement-ledger";
import { getSaldo, decimal, money, Problem } from "./saldos";
import { getClassification } from "./clasificacion";
import { e35Metrics } from "./e35";
import { exigirEscrituraDevolucion, type DevolucionGate } from "./devolucion-gate";

/**
 * COMIDA-UNICO-01 — Revisión Comida over central Movements.
 *
 * One economic fact: a new purchase or a commercial refund is a central
 * Movimiento. This module only owns analytical metadata, the integral purchase
 * attribution of a refund and explicitly accredited financing roles. It never
 * writes a second amount/date ledger, never creates a Movimiento and never adds
 * Revisión Comida totals to Saldos positions.
 */

export const comidaEtiquetas = [
  "Comida",
  "Pendiente revisar",
  "Ocio",
  "Niños",
  "Otros",
  "Fuera presupuesto",
] as const;
export type ComidaEtiqueta = (typeof comidaEtiquetas)[number];
export const comidaRoles = [
  "Financiación",
  "Reposición",
  "Devolución Anticipo",
] as const;
export type ComidaRol = (typeof comidaRoles)[number];

export type ComidaMetadata = {
  movimiento: string;
  etiqueta: ComidaEtiqueta | null;
  evidenciaBancaria: string | null;
  evidenciaComercial: string | null;
  estadoRevision: "Pendiente revisar" | "Revisada";
  revisionMovimiento: number;
  revision: number;
  creado: string;
  actualizado: string;
};
export type ComidaDevolucion = {
  movimiento: string;
  compra: string | null;
  partida: string | null;
  cicloOrigen: string | null;
  evidenciaRelacion: string | null;
  evidenciaOrigenTemporal: string | null;
  elegibilidad: "Acreditada" | "No acreditada";
  estado: "Sin vínculo" | "Verificado" | "Revisar";
  revisionMovimiento: number;
  revision: number;
  creado: string;
  actualizado: string;
};
export type ComidaRolRow = {
  movimiento: string;
  rol: ComidaRol;
  obligacionCiclo: string | null;
  evidencia: string;
  revisionMovimiento: number;
  revision: number;
  creado: string;
  actualizado: string;
};

const metadataSelect = `SELECT movimiento,etiqueta,evidencia_bancaria evidenciaBancaria,
  evidencia_comercial evidenciaComercial,estado_revision estadoRevision,
  revision_movimiento revisionMovimiento,revision,creado,actualizado
  FROM movimiento_revision_comida`;
const devolucionSelect = `SELECT movimiento,compra,partida,ciclo_origen cicloOrigen,
  evidencia_relacion evidenciaRelacion,
  evidencia_origen_temporal evidenciaOrigenTemporal,
  elegibilidad,estado,revision_movimiento revisionMovimiento,revision,creado,actualizado
  FROM movimiento_devolucion`;
const rolSelect = `SELECT movimiento,rol,obligacion_ciclo obligacionCiclo,evidencia,
  revision_movimiento revisionMovimiento,revision,creado,actualizado
  FROM movimiento_rol_financiacion`;

export function comidaInstalled(db: Database, table = "movimiento_revision_comida") {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table);
}
export function comidaMetadata(db: Database, id: string) {
  if (!comidaInstalled(db)) return null;
  return (db.query(`${metadataSelect} WHERE movimiento=?`).get(id) ??
    null) as ComidaMetadata | null;
}
export function comidaDevolucion(db: Database, id: string) {
  if (!comidaInstalled(db, "movimiento_devolucion")) return null;
  return (db.query(`${devolucionSelect} WHERE movimiento=?`).get(id) ??
    null) as ComidaDevolucion | null;
}
/** Revisión de `movimiento_devolucion`; `null` explícito sin fila de atribución (specs/38 §6). */
export function devolucionRevision(db: Database, id: string): number | null {
  return comidaDevolucion(db, id)?.revision ?? null;
}
export function comidaRol(db: Database, id: string) {
  if (!comidaInstalled(db, "movimiento_rol_financiacion")) return null;
  return (db.query(`${rolSelect} WHERE movimiento=?`).get(id) ??
    null) as ComidaRolRow | null;
}

function only(body: Record<string, unknown>, keys: readonly string[]) {
  for (const key of Object.keys(body))
    if (!keys.includes(key))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`, {
        [key]: "Campo no editable.",
      });
}
function text(value: unknown, field: string, max: number, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required)
      throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
        [field]: "Campo obligatorio.",
      });
    return null;
  }
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: `Texto válido, máximo ${max} caracteres.`,
    });
  return value;
}
function revision(value: unknown, field = "revision") {
  if (!Number.isSafeInteger(value) || (value as number) < 1)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: "Indica la revisión vigente del Movimiento.",
    });
  return value as number;
}
function key(value: string) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(value))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
  return value;
}
function retry<T>(
  db: Database,
  table: string,
  attempt: string,
  hash: string,
  now: number,
  run: () => T,
): T {
  db.run(`DELETE FROM ${table} WHERE expires<?`, [now]);
  const saved = db
    .query(`SELECT hash,response FROM ${table} WHERE key=?`)
    .get(attempt) as { hash: string; response: string } | null;
  if (saved) {
    if (saved.hash !== hash)
      throw new Problem(
        409,
        "IDEMPOTENCY_CONFLICT",
        "El intento ya corresponde a otros datos.",
      );
    return JSON.parse(saved.response) as T;
  }
  const result = run();
  db.run(`INSERT INTO ${table} VALUES(?,?,?,?)`, [
    attempt,
    hash,
    JSON.stringify(result),
    now + 86400000,
  ]);
  return result;
}
function movement(db: Database, id: string) {
  const row = ledgerRows(db).find((r) => r.id === id);
  if (!row) throw new Problem(404, "NOT_FOUND", "Movimiento no encontrado.");
  return row;
}
function estado(row: LedgerRow) {
  return row.anulado ? "Anulado" : "Vigente";
}

/* ------------------------------------------------------------------ reads */

export function comidaOptions(db: Database) {
  return db.transaction(() => ({
    etiquetas: comidaEtiquetas,
    roles: comidaRoles,
    partidas: (
      db.query("SELECT id FROM partidas ORDER BY id").all() as { id: string }[]
    ).map((r) => getClassification(db, "partidas", r.id)),
    ciclos: cycleMaster(db),
    regimen: regimenDto(db),
    saldos: (
      db.query("SELECT id FROM saldos WHERE id!='S000' ORDER BY id").all() as {
        id: string;
      }[]
    ).map((r) => getSaldo(db, r.id)),
  }))();
}

function validateDateRange(desde: string | null, hasta: string | null) {
  if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde))
    throw new Problem(422, "VALIDATION", "Fecha inicial inválida.");
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta))
    throw new Problem(422, "VALIDATION", "Fecha final inválida.");
  if (desde && hasta && desde > hasta)
    throw new Problem(422, "VALIDATION", "El intervalo de fechas es inválido.");
}

/** Orden estable de listComida: fecha desc, id numérico desc (longitud, luego texto). */
const ordenComida = (
  a: { fecha: string; id: string },
  b: { fecha: string; id: string },
) =>
  b.fecha.localeCompare(a.fecha) ||
  b.id.length - a.id.length ||
  b.id.localeCompare(a.id);

export const COMIDA_PAGE_SIZE = 100;

/** Importe de filtro R5: string decimal EUR exacto, no negativo; vacío = ausente. */
function r5Money(raw: string | null, name: string): bigint | null {
  if (raw === null || raw === "") return null;
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(raw))
    throw new Problem(422, "VALIDATION", `${name} inválido.`, {
      [name]: "Importe EUR exacto, no negativo, máximo dos decimales.",
    });
  const v = money(raw)!;
  return v;
}

/**
 * R5 (specs/38 §2 y §6; SPEC39 AC-D33): selector de compras para atribuir o
 * reatribuir una devolución. Solo lectura.
 *
 * Discriminación EXPLÍCITA: R5 se activa únicamente por la **presencia** de
 * `importeMin` o `importeMax` en la URL (incluso vacíos, como en la URL canónica
 * de specs/38 §2: `...&importeMin=&importeMax=&page=`). Una petición legacy
 * (p. ej. `?estado=` o `?tipo=Gasto&estado=Vigente` sin esos parámetros) conserva
 * la respuesta de `listComida`: el DTO nunca cambia de forma en silencio.
 */
export function esConsultaR5(params: URLSearchParams) {
  return params.has("importeMin") || params.has("importeMax");
}
export function listComprasR5(db: Database, params: URLSearchParams) {
  const tipo = params.get("tipo") || "Gasto",
    estadoFiltro = params.get("estado") || "Vigente";
  if (tipo !== "Gasto" || estadoFiltro !== "Vigente")
    throw new Problem(
      422,
      "VALIDATION",
      "R5 solo lista Gasto vigente (tipo=Gasto&estado=Vigente).",
    );
  const rawPage = params.get("page") ?? "1";
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
  const desde = params.get("desde") || null,
    hasta = params.get("hasta") || null;
  validateDateRange(desde, hasta);
  // specs/38 §2: «nunca lista sin acotación temporal» y no se limita al ciclo
  // vigente; la spec no fija un rango por defecto, así que sin desde ni hasta
  // se rechaza (la ampliación de rangos es acción humana).
  if (!desde && !hasta)
    throw new Problem(
      422,
      "VALIDATION",
      "R5 exige acotación temporal: indica desde y/o hasta.",
      { desde: "Indica al menos una fecha de acotación." },
    );
  const min = r5Money(params.get("importeMin"), "importeMin"),
    max = r5Money(params.get("importeMax"), "importeMax");
  if (min !== null && max !== null && min > max)
    throw new Problem(
      422,
      "VALIDATION",
      "importeMin no puede superar importeMax.",
    );
  return db.transaction(() => {
    const terminal = new Map<string, boolean>();
    const isTerminal = (id: string) => {
      if (!terminal.has(id))
        terminal.set(id, getSaldo(db, id).control === "Terminal");
      return terminal.get(id)!;
    };
    const all = ledgerRows(db)
      .filter(
        (r) =>
          r.tipo === "Gasto" &&
          estado(r) === "Vigente" &&
          (!desde || r.fecha >= desde) &&
          (!hasta || r.fecha <= hasta) &&
          (min === null || BigInt(r.importe) >= min) &&
          (max === null || BigInt(r.importe) <= max) &&
          !isTerminal(r.origen),
      )
      .sort(ordenComida);
    return {
      items: all
        .slice((page - 1) * COMIDA_PAGE_SIZE, page * COMIDA_PAGE_SIZE)
        .map((r) => ({
          id: r.id,
          fecha: r.fecha,
          importe: decimal(r.importe)!,
          concepto: r.concepto,
          partida: r.partida,
          // Decisión funcional (Álex, PR #580): `saldo` es el identificador del Saldo
          // origen/pagador de la compra, no el saldo receptor de una devolución ni un
          // importe de saldo bancario.
          saldo: r.origen,
        })),
      page,
      total: all.length,
    };
  })();
}

export function listComida(db: Database, params = new URLSearchParams()) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1);
    const desde = params.get("desde") || null,
      hasta = params.get("hasta") || null,
      etiqueta = params.get("etiqueta") || "",
      tipo = params.get("tipo") || "",
      estadoFiltro = params.get("estado") || "Vigente",
      q = (params.get("q") ?? "").toLocaleLowerCase("es");
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["", "Gasto", "Devolución de gasto"].includes(tipo) ||
      !["", "Vigente", "Anulado"].includes(estadoFiltro) ||
      (etiqueta && ![...comidaEtiquetas, "Sin clasificar"].includes(etiqueta))
    )
      throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
    validateDateRange(desde, hasta);
    const metadata = new Map(
      (
        db.query(`${metadataSelect} ORDER BY movimiento`).all() as ComidaMetadata[]
      ).map((r) => [r.movimiento, r]),
    );
    const devoluciones = new Map(
      (
        db.query(`${devolucionSelect} ORDER BY movimiento`).all() as ComidaDevolucion[]
      ).map((r) => [r.movimiento, r]),
    );
    const origen = (id: string) =>
      db.query("SELECT nombre,tipo,control FROM saldos WHERE id=?").get(id) as {
        nombre: string;
        tipo: string;
        control: string;
      };
    const cycles = cycleMaster(db);
    const regime = regimenRaw(db);
    const comidaSaldo = regime?.estado === "Activo" ? regime.saldo : null;
    const individual = ledgerRows(db)
      .filter(
        (r) =>
          r.tipo === "Devolución de gasto" ||
          (r.tipo === "Gasto" &&
            (comidaSaldo !== null
              ? r.origen === comidaSaldo
              : metadata.has(r.id))),
      )
      .map((r) => {
        const m = metadata.get(r.id) ?? null,
          d = devoluciones.get(r.id) ?? null,
          o = origen(r.origen),
          s = origen(r.destino);
        return {
          fuente: "Individual" as const,
          id: r.id,
          fecha: r.fecha,
          tipo: r.tipo,
          importe: decimal(r.importe),
          direccion: r.destino === "S000" ? ("Salida" as const) : ("Entrada" as const),
          concepto: r.concepto,
          nota: r.nota,
          estado: estado(r),
          anulado: r.anulado === 1,
          revision: r.revision,
          origen: r.origen,
          destino: r.destino,
          origenNombre: o.nombre,
          destinoNombre: s.nombre,
          agregadoTerminal: r.tipo === "Gasto" && o.control === "Terminal",
          partida: r.partida,
          etiqueta: m?.etiqueta ?? null,
          estadoRevision: m?.estadoRevision ?? "Pendiente revisar",
          etiquetaSinClasificar: m?.etiqueta == null,
          evidenciaBancaria: m?.evidenciaBancaria ?? null,
          evidenciaComercial: m?.evidenciaComercial ?? null,
          metadataRevision: m?.revision ?? null,
          devolucion: d,
          ciclo:
            cycles.find(
              (c) =>
                c.inicio <= r.fecha && (c.fin === null || r.fecha <= c.fin),
            ) ?? null,
        };
      })
      .filter(
        (r) =>
          (!estadoFiltro || r.estado === estadoFiltro) &&
          (!tipo || r.tipo === tipo) &&
          (!desde || r.fecha >= desde) &&
          (!hasta || r.fecha <= hasta) &&
          (!etiqueta ||
            (etiqueta === "Sin clasificar"
              ? r.etiquetaSinClasificar
              : r.etiqueta === etiqueta)) &&
          `${r.id} ${r.concepto} ${r.nota} ${r.partida ?? ""}`
            .toLocaleLowerCase("es")
            .includes(q),
      )
      .sort(ordenComida);
    const legacy = (
      db
        .query(
          `SELECT id,tipo,fecha,CAST(importe AS TEXT) importe,direccion,
             es_devolucion esDevolucion,clasificacion,estado_registro estadoRegistro
           FROM revision_comida WHERE estado_registro='Vigente' ORDER BY fecha DESC`,
        )
        .all() as {
        id: string;
        tipo: string;
        fecha: string;
        importe: string;
        direccion: string;
        esDevolucion: number;
        clasificacion: string | null;
        estadoRegistro: string;
      }[]
    )
      .filter(
        (r) =>
          (!desde || r.fecha >= desde) &&
          (!hasta || r.fecha <= hasta) &&
          `${r.id} ${r.clasificacion ?? ""}`
            .toLocaleLowerCase("es")
            .includes(q),
      )
      .map((r) => ({
        fuente: "Histórico auxiliar" as const,
        ...r,
        importe: decimal(r.importe),
        esDevolucion: r.esDevolucion === 1,
        nota: "Registro legado de Revisión Comida; no se suma a los hechos centrales.",
      }));
    return {
      items: individual.slice((page - 1) * 100, page * 100),
      total: individual.length,
      page,
      historico: legacy.slice(0, 100),
      historicoTotal: legacy.length,
      regimen: regimenDto(db),
      contexto: {
        fuente: "Movimientos · hechos centrales",
        historico:
          "El histórico agregado y auxiliar se conserva consultable y no se suma a los hechos individuales.",
      },
    };
  })();
}

export function getComidaMovement(db: Database, id: string) {
  return db.transaction(() => {
    const row = movement(db, id);
    if (row.tipo !== "Gasto" && row.tipo !== "Devolución de gasto")
      throw new Problem(
        404,
        "NOT_FOUND",
        "El Movimiento no pertenece al ámbito Comida.",
      );
    const data = db
      .query(
        `SELECT id,fecha,tipo,CAST(importe AS TEXT) importe,origen,destino,partida,
           concepto,nota,anulado,revision,creado,actualizado FROM movimientos WHERE id=?`,
      )
      .get(id) as Record<string, unknown>;
    const audit = (table: string) =>
      db.query(`SELECT * FROM ${table} WHERE ${table === "movement_audit" ? "id" : "movimiento"}=? ORDER BY revision`).all(id);
    return {
      movimiento: {
        ...data,
        importe: decimal(String(data.importe)),
        anulado: data.anulado === 1,
        estado: data.anulado === 1 ? "Anulado" : "Vigente",
        origenNombre: (
          db.query("SELECT nombre FROM saldos WHERE id=?").get(String(data.origen)) as {
            nombre: string;
          }
        ).nombre,
        destinoNombre: (
          db.query("SELECT nombre FROM saldos WHERE id=?").get(String(data.destino)) as {
            nombre: string;
          }
        ).nombre,
      },
      metadata: comidaMetadata(db, id),
      devolucion: comidaDevolucion(db, id),
      devolucionRevision: devolucionRevision(db, id),
      rol: comidaRol(db, id),
      auditoria: {
        movimiento: audit("movement_audit"),
        metadata: audit("movimiento_revision_comida_audit"),
        devolucion: audit("movimiento_devolucion_audit"),
        rol: audit("movimiento_rol_financiacion_audit"),
      },
    };
  })();
}

/* ------------------------------------------------------------------ writes */

export function applyComidaMetadata(
  db: Database,
  id: string,
  row: LedgerRow,
  input: Record<string, unknown>,
  now = Date.now(),
) {
  if (row.anulado)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El Movimiento está anulado; no admite metadatos nuevos.",
    );
  if (row.tipo !== "Gasto" && row.tipo !== "Devolución de gasto")
    throw new Problem(
      422,
      "VALIDATION",
      "Solo una compra o devolución de gasto admite metadatos de Comida.",
    );
  if (
    row.tipo === "Gasto" &&
    getSaldo(db, row.origen).control === "Terminal"
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Un agregado de Terminal no admite metadatos individuales.",
    );
  const etiqueta = (input.etiqueta ?? null) as ComidaEtiqueta | null;
  if (etiqueta !== null && !comidaEtiquetas.includes(etiqueta))
    throw new Problem(422, "VALIDATION", "Etiqueta no válida.", {
      etiqueta: "Selecciona una etiqueta aprobada o déjala vacía.",
    });
  if (
    row.tipo === "Gasto" &&
    etiqueta === "Fuera presupuesto" &&
    !row.partida
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Fuera presupuesto exige la Partida real del Gasto.",
      { etiqueta: "El Gasto conserva siempre su Partida." },
    );
  const estadoRevision =
    input.estadoRevision === "Revisada"
      ? "Revisada"
      : input.estadoRevision === "Pendiente revisar" ||
          input.estadoRevision === undefined
        ? etiqueta === null
          ? "Pendiente revisar"
          : "Revisada"
        : null;
  if (!estadoRevision)
    throw new Problem(422, "VALIDATION", "Estado de revisión no válido.", {
      estadoRevision: "Pendiente revisar o Revisada.",
    });
  if (estadoRevision === "Revisada" && etiqueta === null)
    throw new Problem(422, "VALIDATION", "Revisada exige etiqueta.", {
      etiqueta: "Selecciona la etiqueta analítica revisada.",
    });
  const before = comidaMetadata(db, id),
    time = new Date(now).toISOString();
  const motivo = text(input.motivo, "motivo", 2000);
  if (before && !motivo?.trim())
    throw new Problem(422, "VALIDATION", "Indica un motivo de rectificación.", {
      motivo: "Motivo obligatorio.",
    });
  if (!before && motivo)
    throw new Problem(422, "VALIDATION", "El alta no admite motivo.");
  const values = [
    etiqueta,
    text(input.evidenciaBancaria, "evidenciaBancaria", 500),
    text(input.evidenciaComercial, "evidenciaComercial", 500),
    estadoRevision,
  ] as const;
  if (before) {
    db.run(
      `UPDATE movimiento_revision_comida SET etiqueta=?,evidencia_bancaria=?,
       evidencia_comercial=?,estado_revision=?,revision_movimiento=?,
       revision=revision+1,actualizado=? WHERE movimiento=?`,
      [...values, row.revision, time, id],
    );
  } else {
    db.run(
      `INSERT INTO movimiento_revision_comida(movimiento,etiqueta,evidencia_bancaria,
       evidencia_comercial,estado_revision,revision_movimiento,revision,creado,actualizado)
       VALUES(?,?,?,?,?,?,1,?,?)`,
      [id, ...values, row.revision, time, time],
    );
  }
  const after = comidaMetadata(db, id)!;
  db.run(
    `INSERT INTO movimiento_revision_comida_audit(movimiento,accion,revision,
     anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
    [
      id,
      before ? "rectificación" : "alta",
      after.revision,
      before ? JSON.stringify(before) : null,
      JSON.stringify(after),
      before ? motivo!.trim() : null,
      time,
    ],
  );
  return after;
}

export function writeComidaMetadata(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, [
    "revision",
    "etiqueta",
    "evidenciaBancaria",
    "evidenciaComercial",
    "estadoRevision",
    "motivo",
  ]);
  key(attempt);
  const hash = fingerprint(["metadata", id, body]);
  return db
    .transaction(() => {
      return retry(db, "comida_metadata_attempts", attempt, hash, now, () => {
        const row = movement(db, id);
        if (revision(body.revision) !== row.revision)
          throw new Problem(
            409,
            "REVISION_CONFLICT",
            "El Movimiento ha cambiado. Revisa su ficha.",
          );
        const metadata = applyComidaMetadata(db, id, row, body, now);
        return {
          movimiento: id,
          metadata,
          movimientos: getComidaMovement(db, id),
        };
      });
    })
    .immediate();
}

export function applyComidaDevolucion(
  db: Database,
  id: string,
  row: LedgerRow,
  input: Record<string, unknown>,
  now = Date.now(),
  options?: { requireRevision?: boolean },
) {
  if (row.anulado)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "La devolución anulada no admite atribución nueva.",
    );
  if (row.tipo !== "Devolución de gasto")
    throw new Problem(
      422,
      "VALIDATION",
      "Solo una Devolución de gasto admite atribución de compra.",
    );
  const before = comidaDevolucion(db, id);
  if (options?.requireRevision) {
    if (before) {
      if (input.devolucionRevision === undefined || input.devolucionRevision === null)
        throw new Problem(
          422,
          "VALIDATION",
          "La revisión de la atribución es obligatoria.",
          { devolucionRevision: "Envía la revisión actual de la atribución." },
        );
      if (
        typeof input.devolucionRevision !== "number" ||
        !Number.isInteger(input.devolucionRevision) ||
        input.devolucionRevision < 1
      )
        throw new Problem(422, "VALIDATION", "Revisión de atribución inválida.", {
          devolucionRevision: "Entero positivo.",
        });
      if (input.devolucionRevision !== before.revision)
        throw new Problem(
          409,
          "ATTRIBUTION_REVISION_CONFLICT",
          "La atribución ha cambiado. Recarga la ficha.",
        );
    } else if (input.devolucionRevision !== undefined && input.devolucionRevision !== null) {
      if (
        typeof input.devolucionRevision !== "number" ||
        !Number.isInteger(input.devolucionRevision) ||
        input.devolucionRevision < 1
      )
        throw new Problem(422, "VALIDATION", "Revisión de atribución inválida.", {
          devolucionRevision: "Entero positivo o null.",
        });
      throw new Problem(
        409,
        "ATTRIBUTION_REVISION_CONFLICT",
        "No existe atribución previa para esa revisión. Recarga la ficha.",
      );
    }
  }
  if (input.compraAnterior !== undefined && input.compraAnterior !== null) {
    if (typeof input.compraAnterior !== "string")
      throw new Problem(422, "VALIDATION", "Compra anterior inválida.", {
        compraAnterior: "Identificador de compra.",
      });
    if ((before?.compra ?? null) !== input.compraAnterior)
      throw new Problem(
        409,
        "ATTRIBUTION_REVISION_CONFLICT",
        "La compra anterior de la atribución ha cambiado. Recarga la ficha.",
      );
  }
  const compra =
    typeof input.compra === "string" && input.compra ? input.compra : null;
  // SPEC39 §6: una atribución con compra no se resuelve desvinculándola. Se
  // conserva (también en «Revisar») o se reatribuye a otra compra válida.
  if (before?.compra && !compra)
    throw new Problem(
      422,
      "DEVOLUTION_LINK_REQUIRED",
      "Una devolución vinculada no puede quedar sin compra. Conserva la compra o reatribúyela a otra compra válida.",
      { compra: "Indica la compra vinculada." },
    );
  let partida =
    typeof input.partida === "string" && input.partida ? input.partida : null;
  let cicloOrigen =
    typeof input.cicloOrigen === "string" && input.cicloOrigen
      ? input.cicloOrigen
      : null;
  const evidenciaRelacion = text(
    input.evidenciaRelacion,
    "evidenciaRelacion",
    500,
  );
  const evidenciaOrigenTemporal = text(
    input.evidenciaOrigenTemporal,
    "evidenciaOrigenTemporal",
    500,
  );
  const estadoValue = (input.estado === undefined
    ? before?.estado ?? "Sin vínculo"
    : input.estado) as ComidaDevolucion["estado"];
  if (!["Sin vínculo", "Verificado", "Revisar"].includes(estadoValue as string))
    throw new Problem(422, "VALIDATION", "Estado de vínculo no válido.", {
      estado: "Sin vínculo, Verificado o Revisar.",
    });
  if (
    input.elegibilidad !== undefined &&
    !["Acreditada", "No acreditada"].includes(input.elegibilidad as string)
  )
    throw new Problem(422, "VALIDATION", "Elegibilidad no válida.", {
      elegibilidad: "Acreditada o No acreditada.",
    });
  const elegibilidad = (input.elegibilidad === undefined
    ? before?.elegibilidad ?? "No acreditada"
    : input.elegibilidad) as ComidaDevolucion["elegibilidad"];
  if (estadoValue === "Sin vínculo")
    for (const [field, value] of [
      ["compra", compra],
      ["partida", partida],
      ["cicloOrigen", cicloOrigen],
      ["evidenciaRelacion", evidenciaRelacion],
      ["evidenciaOrigenTemporal", evidenciaOrigenTemporal],
    ] as const)
      if (value !== null)
        throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
          [field]:
            "Sin vínculo no admite compra, Partida, ciclo ni evidencias de relación.",
        });
  if (estadoValue === "Verificado") {
    if (!compra)
      throw new Problem(422, "VALIDATION", "Verificado exige compra.", {
        compra: "Selecciona la compra vinculada.",
      });
    if (!evidenciaRelacion?.trim())
      throw new Problem(422, "VALIDATION", "Verificado exige evidencia de relación.", {
        evidenciaRelacion: "Acredita la relación con la compra.",
      });
  }
  if (
    estadoValue === "Revisar" &&
    !compra &&
    !evidenciaRelacion &&
    !evidenciaOrigenTemporal &&
    !partida &&
    !cicloOrigen
  )
    throw new Problem(422, "VALIDATION", "Revisar exige algún dato de atribución.");
  const catalog = (table: "partidas" | "ciclos", value: string) => {
    const exists = db.query(`SELECT 1 ok FROM ${table} WHERE id=?`).get(value);
    if (!exists)
      throw new Problem(422, "VALIDATION", "Referencia inexistente.", {
        [table === "partidas" ? "partida" : "cicloOrigen"]:
          "Selecciona un valor existente.",
      });
  };
  if (partida) catalog("partidas", partida);
  if (cicloOrigen) catalog("ciclos", cicloOrigen);
  let purchase: LedgerRow | null = null;
  if (compra) {
    purchase = movement(db, compra);
    if (purchase.anulado || purchase.tipo !== "Gasto")
      throw new Problem(422, "VALIDATION", "La compra no es elegible.", {
        compra: "Debe ser un Gasto vigente.",
      });
    const source = getSaldo(db, purchase.origen);
    if (source.control === "Terminal")
      throw new Problem(
        422,
        "VALIDATION",
        "Un agregado de Terminal no se trata como compra individual.",
        { compra: "Selecciona una compra individual real." },
      );
    if (purchase.partida && partida && purchase.partida !== partida)
      throw new Problem(422, "VALIDATION", "La Partida no se cambia por inferencia.", {
        partida: "No contradigas la Partida de la compra vinculada.",
      });
    // ANEXO §5 / SPEC39 §3.1: no copiar Partida al vínculo; queda NULL.
    partida = null;
    // SPEC39 §3.1 / §5.4: derivar cicloOrigen de la compra; rechazar contradicción.
    const derivedCiclo =
      cycleMaster(db).find(
        (c) => c.inicio <= purchase!.fecha && (c.fin === null || purchase!.fecha <= c.fin),
      )?.id ?? null;
    if (cicloOrigen && derivedCiclo && cicloOrigen !== derivedCiclo)
      throw new Problem(
        422,
        "DEVOLUTION_ORIGIN_MISMATCH",
        "El ciclo de origen enviado contradice el ciclo de la compra vinculada.",
        { cicloOrigen: `Debe coincidir con el ciclo ${derivedCiclo} de la compra.` },
      );
    if (!cicloOrigen && derivedCiclo) cicloOrigen = derivedCiclo;
  }
  if (elegibilidad === "Acreditada") {
    if (!evidenciaOrigenTemporal?.trim() || !cicloOrigen)
      throw new Problem(
        422,
        "VALIDATION",
        "La elegibilidad exige ciclo de origen y su evidencia.",
        {
          cicloOrigen: "Acredita el ciclo de compra.",
          evidenciaOrigenTemporal: "Aporta la evidencia de origen.",
        },
      );
    if (!partida && !purchase?.partida && !row.partida)
      throw new Problem(422, "VALIDATION", "La elegibilidad exige Partida real.", {
        partida: "Selecciona o vincula una Partida.",
      });
  }
  if (estadoValue === "Verificado" && purchase) {
    const others = db
      .query(
        `SELECT COALESCE(SUM(m.importe),0) n FROM movimiento_devolucion d
         JOIN movimientos m ON m.id=d.movimiento
         WHERE d.compra=? AND d.estado='Verificado' AND d.movimiento<>? AND m.anulado=0`,
      )
      .get(purchase.id, id) as { n: number };
    if (BigInt(others.n) + BigInt(row.importe) > BigInt(purchase.importe))
      throw new Problem(
        422,
        "DEVOLUTION_EXCESS",
        "El importe supera la capacidad restante de esta compra. Revisa sus devoluciones y la compra vinculada. No se puede registrar este exceso como devolución de esta compra; puede requerir aclarar el abono o corregir hechos existentes, y no se garantiza que sea resoluble por este flujo.",
      );
  }
  const motivo = text(input.motivo, "motivo", 2000);
  if (before && !motivo?.trim())
    throw new Problem(422, "VALIDATION", "Indica un motivo de rectificación.", {
      motivo: "Motivo obligatorio.",
    });
  if (!before && motivo)
    throw new Problem(422, "VALIDATION", "El alta no admite motivo.");
  const time = new Date(now).toISOString();
  if (before) {
    db.run(
      `UPDATE movimiento_devolucion SET compra=?,partida=?,ciclo_origen=?,
       evidencia_relacion=?,evidencia_origen_temporal=?,elegibilidad=?,estado=?,
       revision_movimiento=?,revision=revision+1,actualizado=? WHERE movimiento=?`,
      [
        compra,
        partida,
        cicloOrigen,
        evidenciaRelacion,
        evidenciaOrigenTemporal,
        elegibilidad,
        estadoValue,
        row.revision,
        time,
        id,
      ],
    );
  } else {
    db.run(
      `INSERT INTO movimiento_devolucion(movimiento,compra,partida,ciclo_origen,
       evidencia_relacion,evidencia_origen_temporal,elegibilidad,estado,
       revision_movimiento,revision,creado,actualizado)
       VALUES(?,?,?,?,?,?,?,?,?,1,?,?)`,
      [
        id,
        compra,
        partida,
        cicloOrigen,
        evidenciaRelacion,
        evidenciaOrigenTemporal,
        elegibilidad,
        estadoValue,
        row.revision,
        time,
        time,
      ],
    );
  }
  const after = comidaDevolucion(db, id)!;
  db.run(
    `INSERT INTO movimiento_devolucion_audit(movimiento,accion,revision,
     anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
    [
      id,
      before ? "rectificación" : "alta",
      after.revision,
      before ? JSON.stringify(before) : null,
      JSON.stringify(after),
      before ? motivo!.trim() : null,
      time,
    ],
  );
  return after;
}

export function writeComidaDevolucion(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
  gate?: DevolucionGate,
) {
  key(attempt);
  const hash = fingerprint(["devolucion", id, body]);
  return db
    .transaction(() => {
      return retry(db, "comida_devolucion_attempts", attempt, hash, now, () => {
        // #572: gate tras la reproducción idempotente y antes de tocar estado.
        exigirEscrituraDevolucion(db, gate, { origen: "comida-devolucion" });
        // La estructura va después del gate (`specs/38` §1).
        only(body, [
          "revision",
          "devolucionRevision",
          "compra",
          "compraAnterior",
          "partida",
          "cicloOrigen",
          "evidenciaRelacion",
          "evidenciaOrigenTemporal",
          "elegibilidad",
          "estado",
          "motivo",
        ]);
        const row = movement(db, id);
        if (revision(body.revision) !== row.revision)
          throw new Problem(
            409,
            "REVISION_CONFLICT",
            "El Movimiento ha cambiado. Revisa su ficha.",
          );
        const devolucion = applyComidaDevolucion(db, id, row, body, now, {
          requireRevision: true,
        });
        return { devolucion, movimientos: getComidaMovement(db, id) };
      });
    })
    .immediate();
}

export function writeComidaRol(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, ["revision", "rol", "obligacionCiclo", "evidencia", "motivo"]);
  key(attempt);
  const hash = fingerprint(["rol", id, body]);
  return db
    .transaction(() => {
      return retry(db, "comida_rol_attempts", attempt, hash, now, () => {
        const row = movement(db, id);
        if (row.anulado)
          throw new Problem(
            409,
            "REVISION_CONFLICT",
            "El Movimiento está anulado; no admite un rol nuevo.",
          );
        if (!["Transferencia", "Amortización deuda"].includes(row.tipo))
          throw new Problem(
            422,
            "VALIDATION",
            "Solo una Transferencia real admite rol analítico.",
          );
        if (revision(body.revision) !== row.revision)
          throw new Problem(
            409,
            "REVISION_CONFLICT",
            "El Movimiento ha cambiado. Revisa su ficha.",
          );
        if (!comidaRoles.includes(body.rol as ComidaRol))
          throw new Problem(422, "VALIDATION", "Rol no válido.", {
            rol: "Financiación, Reposición o Devolución Anticipo.",
          });
        const rol = body.rol as ComidaRol;
        const obligacion =
          typeof body.obligacionCiclo === "string" && body.obligacionCiclo
            ? body.obligacionCiclo
            : null;
        if (rol === "Reposición" && !obligacion) {
          const collected = db
            .query(
              `SELECT 1 FROM movimientos m JOIN regimen_comida r ON r.saldo=m.destino
               WHERE m.id=? AND m.anulado=0 AND m.tipo='Transferencia' AND r.estado='Activo'`,
            )
            .get(id);
          if (!collected)
            throw new Problem(
              422,
              "VALIDATION",
              "Reposición exige obligación o cobro acreditado en ING Comida.",
              {
                obligacionCiclo:
                  "Selecciona la obligación o acredita el cobro real en ING Comida.",
              },
            );
        }
        if (rol !== "Reposición" && obligacion)
          throw new Problem(422, "VALIDATION", "Obligación no aplicable.", {
            obligacionCiclo: "Solo Reposición admite obligación.",
          });
        if (obligacion && !db.query("SELECT 1 FROM ciclos WHERE id=?").get(obligacion))
          throw new Problem(422, "VALIDATION", "Ciclo inexistente.", {
            obligacionCiclo: "Selecciona un ciclo existente.",
          });
        const evidencia = text(body.evidencia, "evidencia", 500, true)!;
        const before = comidaRol(db, id);
        const motivo = text(body.motivo, "motivo", 2000);
        if (before && !motivo?.trim())
          throw new Problem(
            422,
            "VALIDATION",
            "Indica un motivo de rectificación.",
            { motivo: "Motivo obligatorio." },
          );
        const time = new Date(now).toISOString();
        if (before) {
          db.run(
            `UPDATE movimiento_rol_financiacion SET rol=?,obligacion_ciclo=?,
             evidencia=?,revision_movimiento=?,revision=revision+1,actualizado=?
             WHERE movimiento=?`,
            [rol, obligacion, evidencia, row.revision, time, id],
          );
        } else {
          db.run(
            `INSERT INTO movimiento_rol_financiacion(movimiento,rol,obligacion_ciclo,
             evidencia,revision_movimiento,revision,creado,actualizado)
             VALUES(?,?,?,?,?,1,?,?)`,
            [id, rol, obligacion, evidencia, row.revision, time, time],
          );
        }
        const after = comidaRol(db, id)!;
        db.run(
          `INSERT INTO movimiento_rol_financiacion_audit(movimiento,accion,revision,
           anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
          [
            id,
            before ? "rectificación" : "alta",
            after.revision,
            before ? JSON.stringify(before) : null,
            JSON.stringify(after),
            before ? motivo!.trim() : null,
            time,
          ],
        );
        return { rol: after };
      });
    })
    .immediate();
}

/* ----------------------------------------------------------------- regime */

export type Regimen = {
  saldo: string;
  cicloCorte: string;
  apertura: string;
  evidencia: string;
  cobertura: "Verificable" | "Parcial";
  estado: "Preparado" | "Activo" | "Suspendido";
  revision: number;
};
export function regimenRaw(db: Database): Regimen | null {
  const r = db
    .query(
      `SELECT saldo,ciclo_corte cicloCorte,CAST(apertura AS TEXT) apertura,
       evidencia,cobertura,estado,revision FROM regimen_comida LIMIT 1`,
    )
    .get() as Regimen | null;
  return r ? { ...r, apertura: decimal(r.apertura)! } : null;
}
export function regimenDto(db: Database) {
  const r = regimenRaw(db);
  if (!r) return { modo: "Histórico" as const, regimen: null };
  const cycle = cycleMaster(db).find((c) => c.id === r.cicloCorte) ?? null;
  return {
    modo: r.estado === "Activo" ? ("Individual" as const) : ("Histórico" as const),
    regimen: {
      ...r,
      corte: cycle?.inicio ?? null,
      saldoNombre:
        (db.query("SELECT nombre FROM saldos WHERE id=?").get(r.saldo) as {
          nombre: string;
        } | null)?.nombre ?? null,
    },
  };
}

function regimenGates(db: Database, saldo: string, corte: string) {
  const blocks: string[] = [];
  const terminal = db
    .query(
      `SELECT m.id FROM movimientos m JOIN saldos s ON s.id=m.origen
       WHERE m.tipo='Gasto' AND m.anulado=0 AND s.control='Terminal' AND m.fecha>=?
       LIMIT 5`,
    )
    .all(corte) as { id: string }[];
  if (terminal.length)
    blocks.push(
      `Agregado de Terminal no cubierto tras el corte: ${terminal.map((t) => t.id).join(", ")}.`,
    );
  const unrolled = db
    .query(
      `SELECT m.id FROM movimientos m
       LEFT JOIN movimiento_rol_financiacion r ON r.movimiento=m.id
       WHERE m.tipo='Transferencia' AND m.anulado=0 AND (m.origen=? OR m.destino=?)
         AND m.fecha>=? AND r.movimiento IS NULL LIMIT 5`,
    )
    .all(saldo, saldo, corte) as { id: string }[];
  if (unrolled.length)
    blocks.push(
      `Transferencias sin función de financiación declarada: ${unrolled.map((t) => t.id).join(", ")}.`,
    );
  return blocks;
}

export function prepareRegimen(
  db: Database,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, [
    "saldo",
    "cicloCorte",
    "apertura",
    "evidencia",
    "cobertura",
    "motivo",
  ]);
  key(attempt);
  const hash = fingerprint(["regimen-preparar", body]);
  return db
    .transaction(() => {
      return retry(db, "comida_regimen_attempts", attempt, hash, now, () => {
        const existing = regimenRaw(db);
        if (existing?.estado === "Activo")
          throw new Problem(
            409,
            "REGIMEN_ACTIVO",
            "El régimen ya está activo; no se modifica por esta vía.",
          );
        if (typeof body.saldo !== "string" || !body.saldo)
          throw new Problem(422, "VALIDATION", "Selecciona el Saldo.", {
            saldo: "Saldo obligatorio.",
          });
        const saldo = getSaldo(db, body.saldo);
        if (
          saldo.id === "S000" ||
          saldo.estado !== "Activa" ||
          saldo.control !== "Movimientos" ||
          saldo.tipo === "Exterior"
        )
          throw new Problem(422, "VALIDATION", "Saldo no elegible.", {
            saldo: "Debe ser un Saldo activo con control Movimientos.",
          });
        if (typeof body.cicloCorte !== "string" || !body.cicloCorte)
          throw new Problem(422, "VALIDATION", "Selecciona el ciclo de corte.", {
            cicloCorte: "Ciclo obligatorio.",
          });
        const cycle = getCycle(db, body.cicloCorte).ciclo;
        let apertura: bigint | null = null;
        try {
          apertura = money(body.apertura);
        } catch {}
        if (apertura === null)
          throw new Problem(422, "VALIDATION", "Apertura inválida.", {
            apertura: "Importe EUR exacto; puede ser negativo.",
          });
        if (!["Verificable", "Parcial"].includes(body.cobertura as string))
          throw new Problem(422, "VALIDATION", "Cobertura no válida.", {
            cobertura: "Verificable o Parcial.",
          });
        const evidencia = text(body.evidencia, "evidencia", 500, true)!;
        const motivo = text(body.motivo, "motivo", 2000, true)!;
        const previousRevision = existing?.revision ?? 0;
        const time = new Date(now).toISOString();
        if (existing)
          db.run(
            `UPDATE regimen_comida SET ciclo_corte=?,apertura=?,evidencia=?,cobertura=?,
             estado='Preparado',revision=revision+1,actualizado=? WHERE saldo=?`,
            [
              cycle.id,
              String(apertura),
              evidencia,
              body.cobertura as string,
              time,
              existing.saldo,
            ],
          );
        else
          db.run(
            `INSERT INTO regimen_comida(saldo,ciclo_corte,apertura,evidencia,cobertura,
             estado,revision,creado,actualizado) VALUES(?,?,?,?,?,?,1,?,?)`,
            [
              saldo.id,
              cycle.id,
              String(apertura),
              evidencia,
              body.cobertura as string,
              "Preparado",
              time,
              time,
            ],
          );
        const after = regimenRaw(db)!;
        db.run(
          `INSERT INTO regimen_comida_audit(saldo,accion,revision,anterior,posterior,
           motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
          [
            after.saldo,
            "preparación",
            after.revision,
            existing ? JSON.stringify(existing) : null,
            JSON.stringify(after),
            motivo.trim(),
            time,
          ],
        );
        if (previousRevision === 0)
          db.run("DELETE FROM regimen_comida WHERE saldo<>?", [after.saldo]);
        return { regimen: regimenDto(db), bloqueos: regimenGates(db, after.saldo, cycle.inicio) };
      });
    })
    .immediate();
}

export function activateRegimen(
  db: Database,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, ["revision", "motivo", "confirmar"]);
  key(attempt);
  const hash = fingerprint(["regimen-activar", body]);
  return db
    .transaction(() => {
      return retry(db, "comida_regimen_attempts", attempt, hash, now, () => {
        const existing = regimenRaw(db);
        if (!existing)
          throw new Problem(404, "NOT_FOUND", "No hay régimen preparado.");
        if (body.confirmar !== true)
          throw new Problem(
            422,
            "VALIDATION",
            "La activación exige confirmación expresa.",
          );
        if (revision(body.revision) !== existing.revision)
          throw new Problem(
            409,
            "REVISION_CONFLICT",
            "El régimen ha cambiado. Revisa la vista previa.",
          );
        if (existing.estado !== "Preparado")
          throw new Problem(
            409,
            "REGIMEN_ESTADO",
            "El régimen no está preparado para activarse.",
          );
        if (existing.cobertura !== "Verificable")
          throw new Problem(
            409,
            "COVERAGE_INCOMPLETE",
            "La cobertura no es verificable; no se activa el régimen.",
          );
        const cycle = getCycle(db, existing.cicloCorte).ciclo;
        const blocks = regimenGates(db, existing.saldo, cycle.inicio);
        if (blocks.length)
          throw new Problem(409, "REGIMEN_BLOCKED", blocks.join(" "), {
            cobertura: "Resuelve la cobertura y el inventario antes de activar.",
          });
        const motivo = text(body.motivo, "motivo", 2000, true)!;
        const time = new Date(now).toISOString();
        db.run(
          "UPDATE regimen_comida SET estado='Activo',revision=revision+1,actualizado=? WHERE saldo=?",
          [time, existing.saldo],
        );
        const after = regimenRaw(db)!;
        db.run(
          `INSERT INTO regimen_comida_audit(saldo,accion,revision,anterior,posterior,
           motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
          [
            after.saldo,
            "activación",
            after.revision,
            JSON.stringify(existing),
            JSON.stringify(after),
            motivo.trim(),
            time,
          ],
        );
        return { regimen: regimenDto(db), corte: cycle.inicio };
      });
    })
    .immediate();
}

/* ---------------------------------------------------------------- metrics */


/**
 * SPEC39 §6 / #597: guarda dura sobre una compra con devoluciones vinculadas.
 * Nunca degrada automáticamente a `Revisar`: rechaza y revierte la transacción.
 */
export function revalidateDevolucionesCompra(
  db: Database,
  compraId: string,
  _now = Date.now(),
) {
  if (!comidaInstalled(db, "movimiento_devolucion")) return [];
  const purchase = movement(db, compraId);
  if (purchase.anulado || purchase.tipo !== "Gasto") {
    const vigente = db
      .query(
        `SELECT 1 FROM movimiento_devolucion d
         JOIN movimientos m ON m.id=d.movimiento
         WHERE d.compra=? AND m.anulado=0 LIMIT 1`,
      )
      .get(compraId);
    if (vigente)
      throw new Problem(
        422,
        "DEVOLUTION_LINKED",
        "Una compra con devoluciones vinculadas vigentes no puede anularse, eliminarse ni retipificarse.",
        { tipo: "Resuelve antes las devoluciones vigentes vinculadas." },
      );
    return [];
  }
  const verified = db
    .query(
      `SELECT COALESCE(SUM(m.importe),0) n FROM movimiento_devolucion d
       JOIN movimientos m ON m.id=d.movimiento
       WHERE d.compra=? AND d.estado='Verificado' AND m.anulado=0`,
    )
    .get(compraId) as { n: number };
  if (BigInt(verified.n) > BigInt(purchase.importe))
    throw new Problem(
      422,
      "PURCHASE_BELOW_REFUNDED",
      "El importe de la compra no puede quedar por debajo del acumulado de devoluciones vigentes verificadas.",
      { importe: "Aumenta el importe o resuelve antes las devoluciones verificadas." },
    );
  return [];
}

/**
 * SPEC39 §6 / #597: guarda dura sobre la propia devolución al rectificarse.
 * Nunca degrada automáticamente a `Revisar`: rechaza con DEVOLUTION_EXCESS.
 */
export function revalidateDevolucionPropia(
  db: Database,
  movimientoId: string,
  _now = Date.now(),
) {
  if (!comidaInstalled(db, "movimiento_devolucion")) return false;
  const own = movement(db, movimientoId);
  if (own.anulado) return false;
  const link = comidaDevolucion(db, movimientoId);
  if (!link || link.estado !== "Verificado" || !link.compra) return false;
  const purchase = movement(db, link.compra);
  if (purchase.anulado || purchase.tipo !== "Gasto")
    throw new Problem(
      422,
      "VALIDATION",
      "La compra vinculada ya no es un Gasto vigente.",
    );
  const others = (
    db
      .query(
        `SELECT COALESCE(SUM(m.importe),0) n FROM movimiento_devolucion d
         JOIN movimientos m ON m.id=d.movimiento
         WHERE d.compra=? AND d.estado='Verificado' AND m.anulado=0 AND d.movimiento<>?`,
      )
      .get(link.compra, movimientoId) as { n: number }
  ).n;
  if (BigInt(others) + BigInt(own.importe) > BigInt(purchase.importe))
    throw new Problem(
      422,
      "DEVOLUTION_EXCESS",
      "El importe supera la capacidad restante de esta compra. Revisa sus devoluciones y la compra vinculada. No se puede registrar este exceso como devolución de esta compra; puede requerir aclarar el abono o corregir hechos existentes, y no se garantiza que sea resoluble por este flujo.",
    );
  return false;
}

/* E3.5 owns the read model; alias kept for existing importers. */
export const comidaMetrics = e35Metrics;
