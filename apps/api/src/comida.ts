import type { Database } from "bun:sqlite";
import { cycleMaster, getCycle, dayBefore, type Cycle } from "./ciclos";
import { ledgerRows, fingerprint, type LedgerRow } from "./movement-ledger";
import { getSaldo, decimal, money, Problem } from "./saldos";
import { getClassification } from "./clasificacion";

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
    if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde))
      throw new Problem(422, "VALIDATION", "Fecha inicial inválida.");
    if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta))
      throw new Problem(422, "VALIDATION", "Fecha final inválida.");
    if (desde && hasta && desde > hasta)
      throw new Problem(
        422,
        "VALIDATION",
        "El intervalo de fechas es inválido.",
      );
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
      .sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) ||
          b.id.length - a.id.length ||
          b.id.localeCompare(a.id),
      );
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
  const compra =
    typeof input.compra === "string" && input.compra ? input.compra : null;
  const partida =
    typeof input.partida === "string" && input.partida ? input.partida : null;
  const cicloOrigen =
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
        "Las devoluciones verificadas superan el importe de la compra. El vínculo no puede verificarse íntegramente.",
        { estado: "Guarda el vínculo como Revisar o revisa las devoluciones." },
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
) {
  only(body, [
    "revision",
    "compra",
    "partida",
    "cicloOrigen",
    "evidenciaRelacion",
    "evidenciaOrigenTemporal",
    "elegibilidad",
    "estado",
    "motivo",
  ]);
  key(attempt);
  const hash = fingerprint(["devolucion", id, body]);
  return db
    .transaction(() => {
      return retry(db, "comida_devolucion_attempts", attempt, hash, now, () => {
        const row = movement(db, id);
        if (revision(body.revision) !== row.revision)
          throw new Problem(
            409,
            "REVISION_CONFLICT",
            "El Movimiento ha cambiado. Revisa su ficha.",
          );
        const devolucion = applyComidaDevolucion(db, id, row, body, now);
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
        if (rol === "Reposición" && !obligacion)
          throw new Problem(422, "VALIDATION", "Reposición exige obligación.", {
            obligacionCiclo: "Selecciona el ciclo de la obligación.",
          });
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

export const cents = (value: string) => {
  const [whole, fraction = ""] = value.split(".");
  const sign = whole.startsWith("-") ? -1n : 1n;
  return (
    sign *
    (BigInt(whole.replace("-", "")) * 100n +
      BigInt(fraction.padEnd(2, "0").slice(0, 2)))
  );
};
const sum = (values: bigint[]) => values.reduce((a, b) => a + b, 0n);
function divRound(n: bigint, d: bigint) {
  if (d <= 0n) return null;
  const negative = n < 0n;
  const abs = negative ? -n : n;
  const rounded = (abs * 2n + d) / (2n * d);
  return negative ? -rounded : rounded;
}
const days = (from: string, to: string) =>
  Math.round(
    (Date.parse(to + "T00:00:00.000Z") - Date.parse(from + "T00:00:00.000Z")) /
      86400000,
  ) + 1;
function endOfMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
const isFood = (label: ComidaEtiqueta | null) =>
  label === "Comida" || label === "Pendiente revisar";
const isCompensable = (label: ComidaEtiqueta | null) =>
  label === "Ocio" || label === "Niños" || label === "Otros";

type Metric = {
  valor: string | null;
  subtotal: string | null;
  estado: "Verificado" | "Parcial" | "No disponible" | "Cero verificado";
  motivo: string;
  ids: string[];
};
function metric(
  value: bigint | null,
  reason: string | null,
  ids: string[] = [],
  partial = false,
  subtotal: bigint | null = null,
): Metric {
  return {
    valor: value === null ? null : decimal(value),
    subtotal: subtotal === null ? null : decimal(subtotal),
    estado:
      value !== null
        ? reason
          ? "Parcial"
          : value === 0n
            ? "Cero verificado"
            : "Verificado"
        : partial
          ? "Parcial"
          : "No disponible",
    motivo: reason ?? "",
    ids,
  };
}

export function comidaMetrics(
  db: Database,
  cicloId: string,
  now = Date.now(),
) {
  return db.transaction(() => {
    const { ciclo } = getCycle(db, cicloId);
    const corte = ciclo.fin ?? ciclo.corte;
    if (!corte)
      throw new Problem(
        409,
        "PERIOD_UNAVAILABLE",
        "El ciclo no tiene corte verificable; no se calculan métricas.",
      );
    const regime = regimenRaw(db);
    const active = regime?.estado === "Activo";
    const saldo = active ? regime.saldo ?? null : null;
    const start = ciclo.inicio;
    const rows = ledgerRows(db).filter(
      (r) => !r.anulado && r.fecha >= start && r.fecha <= corte,
    );
    const metadata = new Map(
      (db.query(metadataSelect).all() as ComidaMetadata[]).map((r) => [
        r.movimiento,
        r,
      ]),
    );
    const devolutions = new Map(
      (db.query(devolucionSelect).all() as ComidaDevolucion[]).map((r) => [
        r.movimiento,
        r,
      ]),
    );
    const roles = new Map(
      (db.query(rolSelect).all() as ComidaRolRow[]).map((r) => [
        r.movimiento,
        r,
      ]),
    );
    const saldoOf = (id: string) =>
      db.query("SELECT tipo,control,nombre FROM saldos WHERE id=?").get(id) as {
        tipo: string;
        control: string;
        nombre: string;
      };
    const purchases = rows
      .filter(
        (r) =>
          r.tipo === "Gasto" &&
          saldoOf(r.origen).control !== "Terminal" &&
          (saldo ? r.origen === saldo : metadata.has(r.id)),
      )
      .map((r) => ({ row: r, meta: metadata.get(r.id) ?? null }));
    const unclassified = purchases.filter((p) => p.meta?.etiqueta == null);
    const food = purchases.filter((p) => isFood(p.meta?.etiqueta ?? null));
    const comp = purchases.filter((p) => isCompensable(p.meta?.etiqueta ?? null));
    const other = purchases.filter(
      (p) =>
        p.meta?.etiqueta != null &&
        !isFood(p.meta.etiqueta) &&
        !isCompensable(p.meta.etiqueta),
    );
    const purchaseById = new Map(
      purchases.map((p) => [p.row.id, p]),
    );
    const devoluciones = rows.filter((r) => r.tipo === "Devolución de gasto");
    const attributed = (r: LedgerRow) => {
      const d = devolutions.get(r.id) ?? null;
      if (!d) return null;
      const purchase = d.compra ? purchaseById.get(d.compra) ?? null : null;
      const external = d.compra && !purchase
        ? (db
            .query("SELECT partida FROM movimientos WHERE id=?")
            .get(d.compra) as { partida: string | null } | null)
        : null;
      const partida =
        d.partida ??
        r.partida ??
        purchase?.row.partida ??
        external?.partida ??
        null;
      const label =
        metadata.get(r.id)?.etiqueta ??
        purchase?.meta?.etiqueta ??
        (d.compra ? metadata.get(d.compra)?.etiqueta ?? null : null);
      // A link in Revisar never proves eligibility by itself when a purchase is
      // present; external accreditation without FK remains valid (P4).
      const linkValid = !d.compra || d.estado === "Verificado";
      const accredited =
        d.elegibilidad === "Acreditada" &&
        d.cicloOrigen !== null &&
        partida !== null &&
        linkValid;
      const grouped = label !== null;
      const eligible = accredited && grouped && d.cicloOrigen === ciclo.id;
      return {
        d,
        purchase,
        partida,
        label,
        eligible,
        accredited,
        grouped,
        importe: r.importe,
      };
    };
    const eligibleFood = devoluciones
      .map(attributed)
      .filter(
        (a): a is NonNullable<ReturnType<typeof attributed>> =>
          !!a && a.eligible && isFood(a.label),
      );
    const eligibleComp = devoluciones
      .map(attributed)
      .filter(
        (a): a is NonNullable<ReturnType<typeof attributed>> =>
          !!a && a.eligible && isCompensable(a.label),
      );
    const pendingDev = devoluciones.filter((r) => {
      const a = attributed(r);

      // A refund accredited to another cycle is observed, not pending, and must
      // not block the receiver cycle resources (P5/CU-22).
      return !a || !a.accredited || !a.grouped;
    });
    const foodBruto = sum(food.map((p) => BigInt(p.row.importe)));
    const foodDev = sum(eligibleFood.map((a) => BigInt(a.importe)));
    const compBruto = sum(comp.map((p) => BigInt(p.row.importe)));
    const compDev = sum(eligibleComp.map((a) => BigInt(a.importe)));
    const netFood = foodBruto - foodDev;
    const netComp = compBruto - compDev;
    const pending = unclassified.map((p) => p.row.id);
    const coverageFood =
      pending.length === 0 && pendingDev.length === 0
        ? null
        : "Clasificación u origen pendientes; el neto afectado es parcial.";

    const obligation = (cycleId: string, destination: string | null) => {
      const movements = rows.filter((r) => {
        if (r.tipo !== "Transferencia") return false;
        const role = roles.get(r.id);
        if (!role || role.rol !== "Reposición" || role.obligacionCiclo !== cycleId)
          return false;
        if (destination && r.destino !== destination) return false;
        return true;
      });
      return {
        total: sum(movements.map((r) => BigInt(r.importe))),
        ids: movements.map((r) => r.id),
      };
    };
    const rObl = obligation(ciclo.id, null);
    const falta =
      coverageFood === null
        ? (() => {
            const raw = netComp - rObl.total;
            return raw > 0n ? raw : 0n;
          })()
        : null;

    const financing = (() => {
      if (!active || !saldo)
        return {
          available: false as const,
          reason: "Régimen individual no activado para ING Comida (P3 pendiente).",
        };
      const afectan = ledgerRows(db).filter(
        (r) =>
          !r.anulado &&
          r.fecha >= start &&
          r.fecha <= corte &&
          (r.origen === saldo || r.destino === saldo),
      );
      const transfers = afectan.filter((r) => r.tipo === "Transferencia");
      const missing = transfers.filter((r) => !roles.has(r.id));
      const fRows = transfers
        .map((r) => ({ r, role: roles.get(r.id)! }))
        .filter(
          ({ r, role }) =>
            (role.rol === "Financiación" && r.destino === saldo) ||
            (role.rol === "Devolución Anticipo" && r.origen === saldo),
        );
      const f = sum(
        fRows.map(({ r, role }) =>
          (role.rol === "Devolución Anticipo" ? -1n : 1n) * BigInt(r.importe),
        ),
      );
      const rCajaRows = transfers
        .map((r) => ({ r, role: roles.get(r.id)! }))
        .filter(
          ({ r, role }) => role.rol === "Reposición" && r.destino === saldo,
        );
      const rCaja = sum(rCajaRows.map(({ r }) => BigInt(r.importe)));
      const d = sum(
        afectan.map((r) =>
          (r.destino === saldo ? 1n : -1n) * BigInt(r.importe),
        ),
      );
      return {
        available: missing.length === 0,
        reason: missing.length
          ? `Transferencias sin función declarada: ${missing.map((r) => r.id).join(", ")}.`
          : null,
        f,
        rCaja,
        rCajaIds: rCajaRows.map(({ r }) => r.id),
        d,
        ids: afectan.map((r) => r.id),
      };
    })();

    const s0 = cents(ciclo.saldoInicialComida);
    const resources =
      financing.available && coverageFood === null
        ? s0 + financing.f + financing.rCaja - netComp
        : null;
    const analyticsClose = financing.available ? s0 + financing.d : null;

    const duration = (() => {
      if (ciclo.fin) {
        const total = days(ciclo.inicio, ciclo.fin);
        return {
          total,
          tipo: "Real" as const,
          horizon: ciclo.fin,
          elapsed: days(ciclo.inicio, corte),
        };
      }
      const horizon = endOfMonth(ciclo.mesFinanciado);
      const total = days(ciclo.inicio, horizon);
      const elapsed = days(ciclo.inicio, corte);
      return {
        total,
        tipo: elapsed > total ? ("Vencido" as const) : ("Provisional" as const),
        horizon,
        elapsed,
      };
    })();
    const equivalent =
      resources === null || duration.tipo === "Vencido" || duration.elapsed < 1
        ? null
        : divRound(resources * BigInt(duration.elapsed), BigInt(duration.total));
    const margin = equivalent === null ? null : equivalent - netFood;
    const weekly =
      coverageFood === null && duration.elapsed > 0
        ? divRound(netFood * 7n, BigInt(duration.elapsed))
        : null;

    const position = (() => {
      if (!active || !saldo || !regime) return null;
      const c = cycleMaster(db).find((x) => x.id === regime.cicloCorte);
      if (!c || ciclo.inicio < c.inicio) return null;
      const between = ledgerRows(db).filter(
        (r) => !r.anulado && r.fecha >= c.inicio && r.fecha < ciclo.inicio,
      );
      const delta = sum(
        between.map((r) =>
          r.destino === saldo ? BigInt(r.importe) : r.origen === saldo ? -BigInt(r.importe) : 0n,
        ),
      );
      const opening = cents(regime.apertura);
      const ba = opening + delta;
      return {
        b: opening,
        ba,
        atCut: financing.available ? ba + financing.d : null,
        difference:
          analyticsClose !== null ? decimal(analyticsClose - ba - (financing.available ? financing.d : 0n)) : null,
      };
    })();

    const bridge =
      resources !== null && financing.available && analyticsClose !== null
        ? {
            base: resources - netFood,
            other:
              financing.d -
              (financing.f +
                financing.rCaja -
                netComp -
                netFood),
            close: analyticsClose,
          }
        : null;

    const legacy = (() => {
      const aggregates = (
        db
          .query(
            `SELECT m.id,CAST(m.importe AS TEXT) importe FROM movimientos m
             JOIN saldos s ON s.id=m.origen
             WHERE m.tipo='Gasto' AND m.anulado=0 AND s.control='Terminal'
               AND m.fecha>=? AND m.fecha<=?`,
          )
          .all(start, corte) as { id: string; importe: string }[]
      );
      const legacyRows = db
        .query(
          `SELECT id,CAST(importe AS TEXT) importe,direccion,clasificacion
           FROM revision_comida WHERE estado_registro='Vigente'
             AND fecha>=? AND fecha<=?`,
        )
        .all(start, corte) as {
        id: string;
        importe: string;
        direccion: string;
        clasificacion: string | null;
      }[];
      return {
        agregadoReconocido: decimal(
          sum(aggregates.map((a) => BigInt(a.importe))),
        ),
        agregadosIds: aggregates.map((a) => a.id),
        detalleAuxiliar: decimal(
          sum(
            legacyRows.map(
              (r) =>
                (r.direccion === "Entrada" ? 1n : -1n) * BigInt(r.importe),
            ),
          ),
        ),
        detalleIds: legacyRows.map((r) => r.id),
        nota: "Valores legados conservados; no se suman entre sí ni a los hechos individuales.",
      };
    })();

    return {
      ciclo,
      regimen: regimenDto(db),
      periodo: { inicio: start, corte },
      cobertura: {
        estado:
          coverageFood === null
            ? financing.available
              ? "Verificable"
              : "Parcial"
            : "Parcial",
        motivos: [
          ...(pending.length
            ? [`Compras sin etiqueta analítica: ${pending.join(", ")}.`]
            : []),
          ...(pendingDev.length
            ? [`Devoluciones sin atribución elegible: ${pendingDev.map((r) => r.id).join(", ")}.`]
            : []),
          ...(!financing.available ? [financing.reason] : []),
        ],
        sinClasificar: pending,
        devolucionesPendientes: pendingDev.map((r) => r.id),
      },
      compras: {
        bruto: metric(
          foodBruto,
          pending.length ? coverageFood : null,
          food.map((p) => p.row.id),
        ),
        devoluciones: metric(
          foodDev,
          pendingDev.length ? coverageFood : null,
          eligibleFood.map((a) => a.d.movimiento),
        ),
        neto: metric(netFood, coverageFood, food.map((p) => p.row.id)),
      },
      compensable: {
        bruto: metric(
          compBruto,
          pending.length ? coverageFood : null,
          comp.map((p) => p.row.id),
        ),
        devoluciones: metric(
          compDev,
          pendingDev.length ? coverageFood : null,
          eligibleComp.map((a) => a.d.movimiento),
        ),
        neto: metric(netComp, coverageFood, comp.map((p) => p.row.id)),
      },
      fueraPresupuesto: other.map((p) => p.row.id),
      reposiciones: { obligacion: decimal(rObl.total), ids: rObl.ids },
      faltaPorReponer: metric(
        falta,
        coverageFood,
        [...comp.map((p) => p.row.id), ...rObl.ids],
      ),
      netoObservado: metric(
        sum(purchases.map((p) => BigInt(p.row.importe))) -
          sum(devoluciones.map((r) => BigInt(r.importe))),
        null,
      ),
      devolucionesObservadas: metric(
        sum(devoluciones.map((r) => BigInt(r.importe))),
        null,
        devoluciones.map((r) => r.id),
      ),
      financiacion: financing.available
        ? {
            estado: "Verificado",
            f: decimal(financing.f),
            reposicionesCaja: decimal(financing.rCaja),
            reposicionesCajaIds: financing.rCajaIds,
            d: decimal(financing.d),
            ids: financing.ids,
          }
        : {
            estado: "No disponible",
            motivo: financing.reason,
            f: null,
            reposicionesCaja: null,
            d: null,
            ids: [],
          },
      recursos: metric(resources, financing.available ? coverageFood : financing.reason),
      cierreAnalitico: metric(
        analyticsClose,
        financing.available ? null : financing.reason,
      ),
      posicionBancaria: position
        ? {
            apertura: decimal(position.b),
            alInicio: decimal(position.ba),
            alCorte: decimal(position.atCut),
            diferenciaAnaliticoBanco: position.difference,
          }
        : { estado: "No disponible", motivo: "Requiere régimen individual activo con cobertura." },
      puente: bridge
        ? {
            baseAnalitica: decimal(bridge.base),
            otrosEfectos: decimal(bridge.other),
            cierreAnalitico: decimal(bridge.close),
          }
        : null,
      ritmo: {
        semanalObservado: metric(weekly, coverageFood),
        equivalentes: metric(
          equivalent,
          duration.tipo === "Vencido"
            ? "Horizonte provisional vencido; no se extrapola."
            : coverageFood ?? (resources === null ? financing.reason : null),
        ),
        margen: metric(
          margin,
          duration.tipo === "Vencido"
            ? "Horizonte provisional vencido; no se extrapola."
            : coverageFood ?? (resources === null ? financing.reason : null),
        ),
        duracion: {
          ...duration,
          estado:
            duration.tipo === "Real"
              ? "Real"
              : duration.tipo === "Vencido"
                ? "Horizonte provisional vencido"
                : "Provisional",
        },
      },
      historico: legacy,
    };
  })();
}

/**
 * P4: rectifying/annulling a purchase revalidates the integral attribution of
 * every verified refund. A refund that no longer fits, or whose purchase is
 * annulled, stays as a real bank fact but its link becomes `Revisar`.
 */
export function revalidateDevolucionesCompra(
  db: Database,
  compraId: string,
  now = Date.now(),
) {
  if (!comidaInstalled(db, "movimiento_devolucion")) return [];
  const purchase = movement(db, compraId);
  const links = db
    .query(
      `SELECT movimiento,estado FROM movimiento_devolucion WHERE compra=? AND estado='Verificado'`,
    )
    .all(compraId) as { movimiento: string; estado: string }[];
  if (!links.length) return [];
  const time = new Date(now).toISOString();
  const changed: string[] = [];
  for (const link of links) {
    const row = movement(db, link.movimiento);
    const others = (
      db
        .query(
          `SELECT COALESCE(SUM(m.importe),0) n FROM movimiento_devolucion d
           JOIN movimientos m ON m.id=d.movimiento
           WHERE d.compra=? AND d.estado='Verificado' AND m.anulado=0 AND d.movimiento<>?`,
        )
        .get(compraId, link.movimiento) as { n: number }
    ).n;
    const total =
      BigInt(others) + (row.anulado ? 0n : BigInt(row.importe));
    if (
      !purchase.anulado &&
      purchase.tipo === "Gasto" &&
      total <= BigInt(purchase.importe)
    )
      continue;
    const before = comidaDevolucion(db, link.movimiento)!;
    db.run(
      `UPDATE movimiento_devolucion SET estado='Revisar',revision=revision+1,
       actualizado=? WHERE movimiento=?`,
      [time, link.movimiento],
    );
    const after = comidaDevolucion(db, link.movimiento)!;
    db.run(
      `INSERT INTO movimiento_devolucion_audit(movimiento,accion,revision,anterior,
       posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'sistema-comida')`,
      [
        link.movimiento,
        "rectificación",
        after.revision,
        JSON.stringify(before),
        JSON.stringify(after),
        purchase.anulado
          ? "Compra vinculada anulada; el vínculo queda en revisión."
          : purchase.tipo !== "Gasto"
            ? "La compra vinculada ya no es un Gasto; el vínculo queda en revisión."
            : "La compra ya no cubre íntegramente las devoluciones verificadas.",
        time,
      ],
    );
    changed.push(link.movimiento);
  }
  return changed;
}

/**
 * A refund rectified above the linked purchase, or whose purchase is no longer
 * valid, cannot remain `Verificado`: the bank fact is preserved and the link is
 * demoted to `Revisar` inside the same movement transaction.
 */
export function revalidateDevolucionPropia(
  db: Database,
  movimientoId: string,
  now = Date.now(),
) {
  if (!comidaInstalled(db, "movimiento_devolucion")) return false;
  const link = comidaDevolucion(db, movimientoId);
  if (!link || link.estado !== "Verificado" || !link.compra) return false;
  const purchase = movement(db, link.compra);
  const own = movement(db, movimientoId);
  const others = (
    db
      .query(
        `SELECT COALESCE(SUM(m.importe),0) n FROM movimiento_devolucion d
         JOIN movimientos m ON m.id=d.movimiento
         WHERE d.compra=? AND d.estado='Verificado' AND m.anulado=0 AND d.movimiento<>?`,
      )
      .get(link.compra, movimientoId) as { n: number }
  ).n;
  const total = BigInt(others) + BigInt(own.importe);
  if (
    !purchase.anulado &&
    purchase.tipo === "Gasto" &&
    total <= BigInt(purchase.importe)
  )
    return false;
  const time = new Date(now).toISOString();
  db.run(
    `UPDATE movimiento_devolucion SET estado='Revisar',revision=revision+1,
     actualizado=? WHERE movimiento=?`,
    [time, movimientoId],
  );
  const after = comidaDevolucion(db, movimientoId)!;
  db.run(
    `INSERT INTO movimiento_devolucion_audit(movimiento,accion,revision,anterior,
     posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'sistema-comida')`,
    [
      movimientoId,
      "rectificación",
      after.revision,
      JSON.stringify(link),
      JSON.stringify(after),
      purchase.anulado
        ? "Compra vinculada anulada; el vínculo queda en revisión."
        : purchase.tipo !== "Gasto"
          ? "La compra vinculada ya no es un Gasto; el vínculo queda en revisión."
          : "La devolución ya no cabe íntegramente en la compra vinculada.",
      time,
    ],
  );
  return true;
}

/** Devolution cents per effective Partida for a cycle, for P5 net execution. */
export function eligibleDevolutionCents(
  db: Database,
  cicloId: string,
): Map<string, { cents: bigint; ids: string[] }> {
  const start = (
    db.query("SELECT inicio FROM ciclos WHERE id=?").get(cicloId) as {
      inicio: string;
    } | null
  )?.inicio;
  if (!start) throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.");
  const cycle = cycleMaster(db).find((c) => c.id === cicloId)!;
  const end = cycle.fin ?? cycle.corte;
  if (!end) return new Map();
  const result = new Map<string, { cents: bigint; ids: string[] }>();
  const rows = db
    .query(
      `SELECT d.movimiento,m.importe,d.partida,m.partida movimientoPartida,
         c.partida compraPartida
       FROM movimiento_devolucion d
       JOIN movimientos m ON m.id=d.movimiento
       LEFT JOIN movimientos c ON c.id=d.compra
       WHERE d.elegibilidad='Acreditada' AND d.ciclo_origen=?
         AND m.anulado=0 AND m.fecha>=? AND m.fecha<=?
         AND (d.compra IS NULL OR (d.estado='Verificado' AND c.anulado=0 AND c.tipo='Gasto'))`,
    )
    .all(cicloId, start, end) as {
    movimiento: string;
    importe: number;
    partida: string | null;
    movimientoPartida: string | null;
    compraPartida: string | null;
  }[];
  for (const r of rows) {
    const partida = r.partida ?? r.movimientoPartida ?? r.compraPartida;
    if (!partida) continue;
    const current = result.get(partida) ?? { cents: 0n, ids: [] };
    current.cents += BigInt(r.importe);
    current.ids.push(r.movimiento);
    result.set(partida, current);
  }
  return result;
}
