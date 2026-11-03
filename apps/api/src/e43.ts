import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { Problem } from "./problem";
import {
  CHANGE_SCALE,
  MAX_INPUT,
  PRICE_SCALE,
  cashDto,
  cents,
  changeText,
  civil,
  money,
  positionAtDate,
  positionsAtDate,
  priceText,
  quantityText,
  referenceEur,
  scaled,
  spanishToday,
} from "./investment-engine";

/**
 * E4.3 — read model and API for dated valuations (schema v24).
 *
 * The valuation is a fact of `valoracion_inversion`; positions are derived from
 * `operaciones_inversion` through the single E4.1/E4.2 engine. This module never
 * writes totals, `e43`, `inversion.valoracion`, the SPEC27 snapshot, Compras or
 * Ventas. Money stays in integer cents and quantities in scaled integers.
 */

type ValuationRow = {
  id: string;
  saldo_inversion: string;
  instrumento: string;
  fecha_vigencia: string;
  tipo: "Manual" | "Automática";
  valor_eur: number;
  precio_unitario: number | null;
  divisa: string | null;
  cambio: number | null;
  cantidad_base: number | null;
  procedencia: string;
  cobertura: string;
  actor: string;
  creado_utc: string;
  actualizado_utc: string;
  revision: number;
  motivo_correccion: string | null;
};

const SELECT = `SELECT id,saldo_inversion,instrumento,fecha_vigencia,tipo,
  valor_eur,precio_unitario,divisa,cambio,cantidad_base,procedencia,cobertura,
  actor,creado_utc,actualizado_utc,revision,motivo_correccion
  FROM valoracion_inversion`;

const CREATE_FIELDS = ["fecha", "tipo", "procedencia"] as const;
const MANUAL_FIELDS = [...CREATE_FIELDS, "valorEur"] as const;
const AUTOMATIC_FIELDS = [...CREATE_FIELDS, "precio", "divisa", "cambio"] as const;

type Content = {
  fecha: string;
  tipo: "Manual" | "Automática";
  valorEur: bigint;
  precio: bigint | null;
  divisa: string | null;
  cambio: bigint | null;
  cantidadBase: bigint | null;
  procedencia: string;
};

function findValuation(db: Database, id: string) {
  const row = db.query(SELECT + " WHERE id=?").get(id) as ValuationRow | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Valoración no encontrada.");
  return row;
}

function valuationPosition(db: Database, saldo: string, instrumento: string) {
  const saldoRow = db
    .query("SELECT id,nombre,tipo,control,estado FROM saldos WHERE id=?")
    .get(saldo) as {
    id: string;
    nombre: string;
    tipo: string;
    control: string;
    estado: string;
  } | null;
  const instrumentoRow = db
    .query("SELECT id,nombre,estado FROM instrumentos WHERE id=?")
    .get(instrumento) as {
    id: string;
    nombre: string;
    estado: string;
  } | null;
  if (
    !saldoRow ||
    saldoRow.tipo !== "Inversión" ||
    saldoRow.control !== "Inversiones" ||
    !instrumentoRow
  )
    throw new Problem(404, "NOT_FOUND", "Posición no encontrada.");
  return {
    saldo: {
      id: saldoRow.id,
      nombre: saldoRow.nombre,
      estado: saldoRow.estado,
    },
    instrumento: instrumentoRow,
  };
}

function operationSums(
  db: Database,
  saldo: string,
  instrumento: string,
  cutoff: string,
) {
  const rows = db
    .query(
      `SELECT clase,CAST(COALESCE(SUM(importe_eur),0) AS TEXT) total
       FROM operaciones_inversion
       WHERE estado='Vigente' AND saldo_inversion=? AND instrumento=? AND fecha<=?
       GROUP BY clase`,
    )
    .all(saldo, instrumento, cutoff) as { clase: string; total: string }[];
  let compras = 0n,
    ventas = 0n;
  for (const row of rows) {
    if (row.clase === "Venta") ventas += BigInt(row.total);
    else compras += BigInt(row.total);
  }
  return { compras, ventas };
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(to + "T00:00:00.000Z") - Date.parse(from + "T00:00:00.000Z")) /
      86400000,
  );
}

function valuationDto(
  db: Database,
  row: ValuationRow,
  cutoff: string | null,
  closed = false,
) {
  const quantityAtValuation = positionAtDate(
    db,
    row.saldo_inversion,
    row.instrumento,
    row.fecha_vigencia,
  );
  const quantityAtCutoff = cutoff
    ? positionAtDate(db, row.saldo_inversion, row.instrumento, cutoff)
    : null;
  const base =
    row.cantidad_base === null ? null : BigInt(row.cantidad_base);
  const baseMismatch =
    row.tipo === "Automática" &&
    (base === null || base !== quantityAtValuation);
  let estado: "Disponible" | "No disponible" | "No aplica" = "Disponible",
    motivo: string | null = null;
  if (closed) {
    estado = "No aplica";
    motivo = "Posición cerrada; la valoración histórica no se usa.";
  } else if (baseMismatch) {
    estado = "No disponible";
    motivo =
      "La cantidad base no coincide con la cantidad valorada; se exige corrección auditada.";
  } else if (quantityAtCutoff !== null && quantityAtCutoff !== quantityAtValuation) {
    estado = "No disponible";
    motivo = `Cantidad modificada desde la valoración: F=${row.fecha_vigencia} Q_F=${quantityText(quantityAtValuation)} → T ${cutoff} Q_T=${quantityText(quantityAtCutoff)}`;
  }
  return {
    id: row.id,
    revision: row.revision,
    estado,
    ...(motivo ? { motivo } : {}),
    fecha: row.fecha_vigencia,
    diasTranscurridos: cutoff ? daysBetween(row.fecha_vigencia, cutoff) : null,
    valorEur:
      estado === "Disponible" ? cents(BigInt(row.valor_eur)) : null,
    tipo: row.tipo,
    precio:
      row.precio_unitario === null
        ? null
        : priceText(BigInt(row.precio_unitario)),
    divisa: row.divisa,
    cambio: row.cambio === null ? null : changeText(BigInt(row.cambio)),
    cantidadBase:
      row.tipo === "Automática" && base !== null
        ? quantityText(base)
        : quantityText(quantityAtValuation),
    ...(cutoff ? { cantidadAlCorte: quantityText(quantityAtCutoff!) } : {}),
    procedencia: row.procedencia,
    cobertura: row.cobertura,
    elegibilidadFechaExacta: cutoff
      ? row.fecha_vigencia === cutoff
        ? "Elegible por fecha exacta (E4.9 no evaluado)"
        : "No elegible por fecha exacta en E4.3"
      : null,
  };
}

function latestValuation(
  db: Database,
  saldo: string,
  instrumento: string,
  cutoff: string,
) {
  return db
    .query(
      SELECT +
        " WHERE saldo_inversion=? AND instrumento=? AND fecha_vigencia<=? ORDER BY fecha_vigencia DESC,revision DESC LIMIT 1",
    )
    .get(saldo, instrumento, cutoff) as ValuationRow | null;
}

function resultUnavailable(motivo: string) {
  return { estado: "No disponible" as const, motivo };
}

function closedValuation() {
  return {
    id: null,
    revision: null,
    estado: "No aplica" as const,
    motivo: "Posición cerrada; la valoración no aplica.",
    fecha: null,
    diasTranscurridos: null,
    valorEur: null,
    tipo: null,
    precio: null,
    divisa: null,
    cambio: null,
    cantidadBase: null,
    cantidadAlCorte: null,
    procedencia: null,
    cobertura: "No aplica",
    elegibilidadFechaExacta: null,
  };
}

function positionDto(
  db: Database,
  position: ReturnType<typeof positionsAtDate>[number],
  cutoff: string,
) {
  const quantity = position.cantidad;
  const closed = quantity === 0n && position.ventas > 0;
  const estado =
    quantity > 0n ? "Abierta" : closed ? "Cerrada" : "No aplica";
  const row = latestValuation(
    db,
    position.saldoInversion.id,
    position.instrumento.id,
    cutoff,
  );
  const valoracion = row
    ? valuationDto(db, row, cutoff, closed)
    : closed
      ? closedValuation()
      : null;
  const sums = operationSums(
    db,
    position.saldoInversion.id,
    position.instrumento.id,
    cutoff,
  );
  let resultado;
  if (quantity < 0n)
    resultado = resultUnavailable(
      "Incidencia de integridad: la cantidad al corte es negativa.",
    );
  else if (closed)
    resultado = {
      estado: "Disponible" as const,
      importeEur: cents(sums.ventas - sums.compras),
    };
  else if (!row || !valoracion)
    resultado = resultUnavailable("Sin valoración válida a la fecha de corte.");
  else if (valoracion.estado !== "Disponible")
    resultado = resultUnavailable(
      valoracion.motivo ?? "La valoración no es válida al corte.",
    );
  else if (row.tipo === "Manual")
    resultado = resultUnavailable(
      "Valor manual: el resultado no se calcula (D-02).",
    );
  else
    resultado = {
      estado: "Disponible" as const,
      importeEur: cents(
        BigInt(row.valor_eur) + sums.ventas - sums.compras,
      ),
    };
  return {
    saldoInversion: position.saldoInversion,
    instrumento: {
      ...position.instrumento,
      estado: (
        db
          .query("SELECT estado FROM instrumentos WHERE id=?")
          .get(position.instrumento.id) as { estado: string }
      ).estado,
    },
    cantidad: quantityText(quantity),
    estado,
    tipoValoracion: row?.tipo ?? null,
    valoracion,
    resultado,
    rentabilidad: resultUnavailable("Fórmula no aprobada"),
  };
}

function coverage(n: number, m: number) {
  if (m === 0) return "No aplica";
  if (n === 0) return "No disponible";
  if (n === m) return "Verificada";
  return `Parcial ${n}/${m}`;
}

export function e43Corte(db: Database, fecha: unknown) {
  const corte = civil(fecha);
  const positions = positionsAtDate(db, corte).map((position) =>
    positionDto(db, position, corte),
  );
  const open = positions.filter((position) => position.estado === "Abierta");
  const m = open.length,
    n = open.filter(
      (position) => position.valoracion?.estado === "Disponible",
    ).length,
    valoracionCobertura = coverage(n, m),
    verified = valoracionCobertura === "Verificada";
  const aplicables = positions.filter(
    (position) =>
      position.estado === "Abierta" || position.estado === "Cerrada",
  );
  const mr = aplicables.length,
    nr = aplicables.filter(
      (position) => position.resultado.estado === "Disponible",
    ).length,
    resultadoCobertura = coverage(nr, mr),
    resultadoVerified = resultadoCobertura === "Verificada";
  const allExact =
    verified &&
    open.every((position) => position.valoracion?.fecha === corte);
  const hasPrevious =
    m > 0 &&
    open.some(
      (position) =>
        typeof position.valoracion?.fecha === "string" &&
        position.valoracion.fecha < corte,
    );
  const elegibilidadFechaExacta =
    m === 0
      ? "No aplica"
      : allExact
        ? "Elegible por fecha exacta (E4.9 no evaluado)"
        : `No elegible por fecha exacta en E4.3: ${
            hasPrevious
              ? "hay valores anteriores al corte"
              : "cobertura incompleta o cantidad inconsistente"
          }; el gate de E4.9 no se evalúa`;
  const efectivo = (
    db
      .query(
        "SELECT id FROM saldos WHERE tipo='Efectivo' AND control='Inversiones' ORDER BY id",
      )
      .all() as { id: string }[]
  ).map((row) => cashDto(db, row.id, corte).efectivo);
  return {
    corte,
    posiciones: positions,
    agregado: {
      coberturaValoracion: valoracionCobertura,
      valorEur: verified
        ? cents(
            open.reduce(
              (total, position) =>
                total +
                (position.valoracion?.valorEur
                  ? BigInt(
                      position.valoracion.valorEur.replace(".", ""),
                    )
                  : 0n),
              0n,
            ),
          )
        : null,
      coberturaResultado: resultadoCobertura,
      resultadoEur: resultadoVerified
        ? cents(
            aplicables.reduce(
              (total, position) =>
                total +
                (position.resultado.estado === "Disponible"
                  ? BigInt(
                      position.resultado.importeEur.replace(".", ""),
                    )
                  : 0n),
              0n,
            ),
          )
        : null,
      elegibilidadFechaExacta,
    },
    efectivo,
    coberturaHistorica:
      "Solo operaciones registradas; el histórico anterior no importado no se reconstruye.",
  };
}

export function e43Position(
  db: Database,
  saldo: string,
  instrumento: string,
  fecha: unknown,
) {
  const cutoff = civil(fecha);
  valuationPosition(db, saldo, instrumento);
  const position = positionsAtDate(db, cutoff).find(
    (row) =>
      row.saldoInversion.id === saldo &&
      row.instrumento.id === instrumento,
  );
  if (!position)
    throw new Problem(404, "NOT_FOUND", "Posición no encontrada al corte.");
  const detail = positionDto(db, position, cutoff);
  const serie = (
    db
      .query(
        SELECT +
          " WHERE saldo_inversion=? AND instrumento=? AND fecha_vigencia<=? ORDER BY fecha_vigencia,revision",
      )
      .all(saldo, instrumento, cutoff) as ValuationRow[]
  ).map((row) => valuationDto(db, row, null));
  return { ...detail, serie };
}

export function e43Series(
  db: Database,
  saldo: string,
  instrumento: string,
  desde: unknown,
  hasta: unknown,
) {
  const position = valuationPosition(db, saldo, instrumento);
  const from = desde ? civil(desde, "desde") : null;
  const to = hasta ? civil(hasta, "hasta") : null;
  const params: string[] = [saldo, instrumento];
  let where = "saldo_inversion=? AND instrumento=?";
  if (from) {
    where += " AND fecha_vigencia>=?";
    params.push(from);
  }
  if (to) {
    where += " AND fecha_vigencia<=?";
    params.push(to);
  }
  const rows = db
    .query(
      SELECT +
        ` WHERE ${where} ORDER BY fecha_vigencia,revision`,
    )
    .all(...params) as ValuationRow[];
  return {
    saldoInversion: position.saldo,
    instrumento: position.instrumento,
    valoraciones: rows.map((row) => valuationDto(db, row, null)),
  };
}

function auditValue(row: ValuationRow) {
  return {
    id: row.id,
    fecha: row.fecha_vigencia,
    tipo: row.tipo,
    valorEur: cents(BigInt(row.valor_eur)),
    precio:
      row.precio_unitario === null
        ? null
        : priceText(BigInt(row.precio_unitario)),
    divisa: row.divisa,
    cambio: row.cambio === null ? null : changeText(BigInt(row.cambio)),
    cantidadBase:
      row.cantidad_base === null
        ? null
        : quantityText(BigInt(row.cantidad_base)),
    procedencia: row.procedencia,
    cobertura: row.cobertura,
    revision: row.revision,
  };
}

export function e43Valuation(db: Database, id: string) {
  const row = findValuation(db, id);
  const auditoria = (
    db
      .query(
        "SELECT revision,accion,motivo,instante,actor,anterior,posterior FROM valoracion_inversion_audit WHERE valoracion=? ORDER BY revision",
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
  ).map((entry) => ({
    ...entry,
    anterior: entry.anterior ? JSON.parse(entry.anterior) : null,
    posterior: JSON.parse(entry.posterior),
  }));
  return {
    valoracion: valuationDto(db, row, null),
    posicion: valuationPosition(db, row.saldo_inversion, row.instrumento),
    auditoria,
  };
}

function requiredText(value: unknown, field: string, max: number) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    !value.trim()
  )
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: `Texto obligatorio de hasta ${max} caracteres, sin controles.`,
    });
  return value.trim();
}

function parseContent(
  db: Database,
  body: Record<string, unknown>,
  saldo: string,
  instrumento: string,
  now: number,
): Content {
  const tipo = body.tipo;
  if (tipo !== "Manual" && tipo !== "Automática")
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      tipo: "Selecciona Manual o Automática.",
    });
  const allowed: readonly string[] =
    tipo === "Manual" ? MANUAL_FIELDS : AUTOMATIC_FIELDS;
  for (const field of Object.keys(body))
    if (!allowed.includes(field))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${field}.`, {
        [field]: "Campo no editable.",
      });
  const fecha = civil(body.fecha);
  if (fecha > spanishToday(now))
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      fecha: `No se admiten fechas futuras. Fecha máxima: ${spanishToday(now)} (España).`,
    });
  const cantidad = positionAtDate(db, saldo, instrumento, fecha);
  if (cantidad <= 0n)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      fecha: "No hay posición abierta con cantidad en la fecha indicada.",
    });
  const procedencia = requiredText(body.procedencia, "procedencia", 200);
  if (tipo === "Manual") {
    const valor = money(body.valorEur, "valorEur");
    if (valor === null || valor < 0n || valor > MAX_INPUT)
      throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
        valorEur:
          "Importe EUR manual entre 0 y el límite exacto admitido (2^53-1).",
      });
    return {
      fecha,
      tipo,
      valorEur: valor,
      precio: null,
      divisa: null,
      cambio: null,
      cantidadBase: null,
      procedencia,
    };
  }
  const precio = scaled(body.precio, PRICE_SCALE, "precio");
  const divisa = body.divisa;
  if (typeof divisa !== "string" || !/^[A-Z]{3}$/.test(divisa))
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      divisa: "Divisa ISO 4217 de tres letras mayúsculas.",
    });
  const cambio = scaled(body.cambio, CHANGE_SCALE, "cambio");
  if (divisa === "EUR" && cambio !== 1_000_000n)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      cambio: 'Para EUR el único cambio admitido es "1.000000".',
    });
  const valor = referenceEur(cantidad, precio, cambio);
  if (valor > MAX_INPUT)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      valorEur: "El valor calculado supera el límite exacto admitido (2^53-1).",
    });
  return {
    fecha,
    tipo,
    valorEur: valor,
    precio,
    divisa,
    cambio,
    cantidadBase: cantidad,
    procedencia,
  };
}

function duplicate(
  db: Database,
  saldo: string,
  instrumento: string,
  fecha: string,
  except?: string,
) {
  const row = db
    .query(
      "SELECT id FROM valoracion_inversion WHERE saldo_inversion=? AND instrumento=? AND fecha_vigencia=? AND id!=?",
    )
    .get(saldo, instrumento, fecha, except ?? "") as { id: string } | null;
  if (row)
    throw new Problem(
      409,
      "VALUATION_EXISTS",
      "Ya existe una valoración para esa posición y fecha.",
    );
}

function translation(error: unknown): never {
  if (
    /SQLITE_CONSTRAINT_UNIQUE/.test(
      (error as { code?: string }).code ?? "",
    )
  )
    throw new Problem(
      409,
      "VALUATION_EXISTS",
      "Ya existe una valoración para esa posición y fecha.",
    );
  throw error;
}

function idempotentHash(
  saldo: string,
  instrumento: string,
  body: Record<string, unknown>,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        ["saldoInversion", saldo],
        ["instrumento", instrumento],
        ...Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
      ]),
    )
    .digest("hex");
}

function writeAudit(
  db: Database,
  row: ValuationRow,
  action: "alta" | "corrección",
  motivo: string | null,
  before: unknown,
  now: number,
) {
  db.run(
    "INSERT INTO valoracion_inversion_audit(valoracion,revision,accion,anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')",
    [
      row.id,
      row.revision,
      action,
      before === null ? null : JSON.stringify(before),
      JSON.stringify(auditValue(row)),
      motivo,
      new Date(now).toISOString(),
    ],
  );
}

export function createValuation(
  db: Database,
  saldo: string,
  instrumento: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
  valuationPosition(db, saldo, instrumento);
  return db
    .transaction(() => {
      db.run("DELETE FROM valoracion_attempts WHERE expires<?", [now]);
      const hash = idempotentHash(saldo, instrumento, body);
      const retry = db
        .query("SELECT hash,response FROM valoracion_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof e43Valuation>;
      }
      const content = parseContent(db, body, saldo, instrumento, now);
      duplicate(db, saldo, instrumento, content.fecha);
      const counter = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name='valoraciones_inversion' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) value",
        )
        .get() as { value: string } | null;
      if (!counter || counter.value.length > 12)
        throw new Problem(
          503,
          "ID_SPACE",
          "No se pudo reservar identidad de valoración.",
        );
      const id = "VAL-" + counter.value.padStart(12, "0");
      const time = new Date(now).toISOString();
      try {
        db.run(
          `INSERT INTO valoracion_inversion(id,saldo_inversion,instrumento,fecha_vigencia,tipo,valor_eur,precio_unitario,divisa,cambio,cantidad_base,procedencia,cobertura,actor,creado_utc,actualizado_utc,revision,motivo_correccion)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,'Completa','usuario-unico',?,?,1,NULL)`,
          [
            id,
            saldo,
            instrumento,
            content.fecha,
            content.tipo,
            Number(content.valorEur),
            content.precio === null ? null : Number(content.precio),
            content.divisa,
            content.cambio === null ? null : Number(content.cambio),
            content.cantidadBase === null
              ? null
              : Number(content.cantidadBase),
            content.procedencia,
            time,
            time,
          ],
        );
      } catch (error) {
        translation(error);
      }
      const row = findValuation(db, id);
      writeAudit(db, row, "alta", null, null, now);
      const response = e43Valuation(db, id);
      db.run("INSERT INTO valoracion_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(response),
        now + 86400000,
      ]);
      return response;
    })
    .immediate();
}

export function rectifyValuation(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  const current = findValuation(db, id);
  valuationPosition(
    db,
    current.saldo_inversion,
    current.instrumento,
  );
  return db
    .transaction(() => {
      const before = findValuation(db, id);
      if (body.revision !== before.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La valoración ha cambiado. Revisa la versión actual.",
        );
      const motivo = requiredText(body.motivo, "motivo", 1000);
      const contentBody: Record<string, unknown> = { ...body };
      delete contentBody.revision;
      delete contentBody.motivo;
      const content = parseContent(
        db,
        contentBody,
        before.saldo_inversion,
        before.instrumento,
        now,
      );
      duplicate(
        db,
        before.saldo_inversion,
        before.instrumento,
        content.fecha,
        id,
      );
      const time = new Date(now).toISOString();
      let result: { changes: number };
      try {
        result = db.run(
          `UPDATE valoracion_inversion
           SET fecha_vigencia=?,tipo=?,valor_eur=?,precio_unitario=?,divisa=?,cambio=?,
               cantidad_base=?,procedencia=?,actualizado_utc=?,revision=revision+1,
               motivo_correccion=?
           WHERE id=? AND revision=?`,
          [
            content.fecha,
            content.tipo,
            Number(content.valorEur),
            content.precio === null ? null : Number(content.precio),
            content.divisa,
            content.cambio === null ? null : Number(content.cambio),
            content.cantidadBase === null
              ? null
              : Number(content.cantidadBase),
            content.procedencia,
            time,
            motivo,
            id,
            before.revision,
          ],
        );
      } catch (error) {
        translation(error);
      }
      if (result.changes !== 1)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La valoración ha cambiado. Revisa la versión actual.",
        );
      const after = findValuation(db, id);
      writeAudit(
        db,
        after,
        "corrección",
        motivo,
        auditValue(before),
        now,
      );
      return e43Valuation(db, id);
    })
    .immediate();
}
