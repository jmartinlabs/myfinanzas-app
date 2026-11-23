import type { Database } from "bun:sqlite";
import { cycleForDate } from "./ciclos";
import { comidaInstalled } from "./comida";
import { decimal, Problem } from "./saldos";

/**
 * SPEC39 §3-§5 (#538, F1) · proyección ÚNICA de devoluciones de compras.
 *
 * Solo lectura: nunca escribe filas, revisiones, auditoría ni dirty. Toda
 * clasificación se deriva de la compra vigente; las copias antiguas
 * (`movimiento_devolucion.partida`, `movimientos.partida` de la devolución y
 * `ciclo_origen`) solo se leen como lado «almacenado» de una comparación de
 * diagnóstico, nunca como fallback ni selector. Céntimos en bigint; DTO
 * monetarios como string decimal EUR; `null` = No disponible, nunca cero.
 */

export const DEVOLUCIONES_PAGE_SIZE = 100;

export const causasCobertura = [
  "sinVinculo",
  "revisar",
  "sinAcreditacion",
  "sinClasificacion",
  "compraInvalida",
  "periodoNoResoluble",
] as const;
export type CausaCobertura = (typeof causasCobertura)[number];
export type Cobertura = "Completa" | "Parcial" | "No disponible";

export type DevolucionDiagnostico = {
  codigo:
    | "CICLO_REEXPRESADO"
    | "PARTIDA_REEXPRESADA"
    | "EXCESO"
    | "COMPRA_ANULADA"
    | "COMPRA_NO_GASTO"
    | "COMPRA_TERMINAL";
  almacenado?: string | null;
  derivado?: string | null;
  exceso?: string;
};

type Clasificacion = {
  concepto: string;
  categoria: string | null;
  subcategoria: string | null;
  partida: string | null;
  referencia: string | null;
};
type CompraInfo = {
  id: string;
  fecha: string;
  importe: bigint;
  anulado: boolean;
  tipo: string;
  terminal: boolean;
  clasificacion: Clasificacion;
  ciclo: string | null;
};
export type DevolucionProyectada = {
  id: string;
  fecha: string;
  importe: bigint;
  saldoReceptor: string;
  revisionMovimiento: number;
  /** null cuando el movimiento no tiene fila de atribución. */
  vinculo: null | {
    estado: "Sin vínculo" | "Verificado" | "Revisar";
    elegibilidad: "Acreditada" | "No acreditada";
    revision: number;
    cicloAlmacenado: string | null;
    partidaAlmacenada: string | null;
    evidenciaRelacion: string | null;
    evidenciaOrigenTemporal: string | null;
  };
  partidaMovimiento: string | null;
  compra: string | null;
  /** Compra vigente de la que se deriva toda la clasificación. */
  clasificacion: Clasificacion | null;
  cicloDerivado: string | null;
  /** Suma el trigger de tope: Verificado vigente, incluida No acreditada. */
  verificado: boolean;
  elegible: boolean;
  /** Causa de exclusión del neteo; null si netea. */
  causa: "sinVinculo" | "compraInvalida" | "revisar" | "sinAcreditacion" | null;
  flags: CausaCobertura[];
  diagnosticos: DevolucionDiagnostico[];
};

const filled = (v: string | null | undefined) =>
  typeof v === "string" && v.trim().length > 0;

function compras(db: Database, only?: string) {
  const cache = new Map<string, string | null>();
  const cicloDe = (fecha: string) => {
    if (!cache.has(fecha)) cache.set(fecha, cycleForDate(db, fecha)?.id ?? null);
    return cache.get(fecha)!;
  };
  const rows = db
    .query(
      `SELECT c.id,c.fecha,CAST(c.importe AS TEXT) importe,c.anulado,c.tipo,
         c.concepto,c.partida,c.referencia,s.control,
         p.padre subcategoria,q.padre categoria
       FROM movimientos c
       JOIN saldos s ON s.id=c.origen
       LEFT JOIN partidas p ON p.id=c.partida
       LEFT JOIN subcategorias q ON q.id=p.padre
       WHERE ${only === undefined ? "c.id IN (SELECT compra FROM movimiento_devolucion WHERE compra IS NOT NULL)" : "c.id=?"}`,
    )
    .all(...(only === undefined ? [] : [only])) as {
    id: string;
    fecha: string;
    importe: string;
    anulado: number;
    tipo: string;
    concepto: string;
    partida: string | null;
    referencia: string | null;
    control: string;
    subcategoria: string | null;
    categoria: string | null;
  }[];
  const map = new Map<string, CompraInfo>();
  for (const r of rows)
    map.set(r.id, {
      id: r.id,
      fecha: r.fecha,
      importe: BigInt(r.importe),
      anulado: r.anulado === 1,
      tipo: r.tipo,
      terminal: r.control === "Terminal",
      clasificacion: {
        concepto: r.concepto,
        categoria: r.categoria,
        subcategoria: r.subcategoria,
        partida: r.partida,
        referencia: r.referencia,
      },
      ciclo: cicloDe(r.fecha),
    });
  return map;
}
/** Dimensiones derivadas de la compra: sin Partida/Subcategoría/Categoría no hay agregado clasificado. */
const clasificada = (c: Clasificacion) =>
  !!c.partida && !!c.subcategoria && !!c.categoria;
const validPurchase = (c: CompraInfo | undefined) =>
  !!c && !c.anulado && c.tipo === "Gasto" && !c.terminal;

/**
 * Proyección única por devolución vigente (todas las del ledger). Es la ÚNICA
 * derivación de elegibilidad, clasificación, causa y diagnósticos; R1, R3 y R4
 * la comparten.
 */
export function proyectarDevoluciones(
  db: Database,
  compraId?: string,
): {
  items: DevolucionProyectada[];
  compras: Map<string, CompraInfo>;
} {
  const purchases = compras(db, compraId);
  const installed = comidaInstalled(db, "movimiento_devolucion");
  const rows = db
    .query(
      installed
        ? `SELECT m.id,m.fecha,CAST(m.importe AS TEXT) importe,m.destino,
             m.partida movimientoPartida,m.revision revisionMovimiento,
             d.movimiento linkId,d.compra,d.partida,d.ciclo_origen cicloOrigen,
             d.evidencia_relacion evidenciaRelacion,
             d.evidencia_origen_temporal evidenciaOrigenTemporal,
             d.elegibilidad,d.estado,d.revision
           FROM movimientos m
           LEFT JOIN movimiento_devolucion d ON d.movimiento=m.id
           WHERE m.tipo='Devolución de gasto' AND m.anulado=0
             ${compraId === undefined ? "" : "AND d.compra=?"}
           ORDER BY length(m.id),m.id`
        : `SELECT m.id,m.fecha,CAST(m.importe AS TEXT) importe,m.destino,
             m.partida movimientoPartida,m.revision revisionMovimiento,
             NULL linkId,NULL compra,NULL partida,NULL cicloOrigen,
             NULL evidenciaRelacion,NULL evidenciaOrigenTemporal,
             NULL elegibilidad,NULL estado,NULL revision
           FROM movimientos m
           WHERE m.tipo='Devolución de gasto' AND m.anulado=0
             ${compraId === undefined ? "" : "AND 0"}
           ORDER BY length(m.id),m.id`,
    )
    .all(...(installed && compraId !== undefined ? [compraId] : [])) as {
    id: string;
    fecha: string;
    importe: string;
    destino: string;
    movimientoPartida: string | null;
    revisionMovimiento: number;
    linkId: string | null;
    compra: string | null;
    partida: string | null;
    cicloOrigen: string | null;
    evidenciaRelacion: string | null;
    evidenciaOrigenTemporal: string | null;
    elegibilidad: "Acreditada" | "No acreditada" | null;
    estado: "Sin vínculo" | "Verificado" | "Revisar" | null;
    revision: number | null;
  }[];

  const items: DevolucionProyectada[] = rows.map((r) => {
    const vinculo = r.linkId
      ? {
          estado: r.estado!,
          elegibilidad: r.elegibilidad!,
          revision: r.revision!,
          cicloAlmacenado: r.cicloOrigen,
          partidaAlmacenada: r.partida,
          evidenciaRelacion: r.evidenciaRelacion,
          evidenciaOrigenTemporal: r.evidenciaOrigenTemporal,
        }
      : null;
    const compra = r.compra ? purchases.get(r.compra) : undefined;
    const flags: CausaCobertura[] = [];
    const diagnosticos: DevolucionDiagnostico[] = [];
    let causa: DevolucionProyectada["causa"];
    if (!vinculo || vinculo.estado === "Sin vínculo" || !r.compra)
      causa = "sinVinculo";
    else if (!validPurchase(compra)) {
      causa = "compraInvalida";
      diagnosticos.push({
        codigo: compra?.anulado
          ? "COMPRA_ANULADA"
          : compra && compra.tipo !== "Gasto"
            ? "COMPRA_NO_GASTO"
            : compra?.terminal
              ? "COMPRA_TERMINAL"
              : "COMPRA_ANULADA",
      });
    } else if (vinculo.estado === "Revisar") causa = "revisar";
    else if (
      vinculo.elegibilidad !== "Acreditada" ||
      !filled(vinculo.evidenciaRelacion) ||
      !filled(vinculo.evidenciaOrigenTemporal)
    )
      causa = "sinAcreditacion";
    else causa = null;

    const valid = vinculo && compra && validPurchase(compra) ? compra : null;
    if (valid) {
      if (!clasificada(valid.clasificacion)) flags.push("sinClasificacion");
      if (!valid.ciclo) flags.push("periodoNoResoluble");
      // Reexpresión: se compara el valor almacenado con el derivado, sin persistir.
      if (
        vinculo!.cicloAlmacenado !== null &&
        vinculo!.cicloAlmacenado !== valid.ciclo
      )
        diagnosticos.push({
          codigo: "CICLO_REEXPRESADO",
          almacenado: vinculo!.cicloAlmacenado,
          derivado: valid.ciclo,
        });
      for (const stored of [vinculo!.partidaAlmacenada, r.movimientoPartida])
        if (stored !== null && stored !== valid.clasificacion.partida) {
          diagnosticos.push({
            codigo: "PARTIDA_REEXPRESADA",
            almacenado: stored,
            derivado: valid.clasificacion.partida,
          });
          break;
        }
    }
    return {
      id: r.id,
      fecha: r.fecha,
      importe: BigInt(r.importe),
      saldoReceptor: r.destino,
      revisionMovimiento: r.revisionMovimiento,
      vinculo,
      partidaMovimiento: r.movimientoPartida,
      compra: r.compra,
      clasificacion: valid ? valid.clasificacion : null,
      cicloDerivado: valid ? valid.ciclo : null,
      verificado: !!vinculo && vinculo.estado === "Verificado" && !!r.compra,
      elegible: causa === null,
      causa,
      flags,
      diagnosticos,
    };
  });
  return { items, compras: purchases };
}

/* ------------------------------------------------------------------ R1/R3 */

export type DevolucionesResumen = {
  count: number;
  bruto: string;
  devueltoVerificado: string;
  capacidadBancariaRestante: string | null;
  descuentoEconomico: string;
  gastoRealEconomico: string | null;
  pendienteRevision: string;
  cobertura: Cobertura;
  causas: CausaCobertura[];
  ids: string[];
};
export type DevolucionesCompra = {
  compra: {
    id: string;
    fecha: string;
    importe: string;
    partida: string | null;
    referencia: string | null;
    cicloAtribucion: string | null;
  };
  resumen: DevolucionesResumen;
  items: {
    id: string;
    fecha: string;
    importe: string;
    saldoReceptor: string;
    estado: "Verificado" | "Revisar";
    elegibilidad: "Acreditada" | "No acreditada";
    revision: number;
    devolucionRevision: number;
    cicloDerivado: string | null;
    cicloAlmacenado: string | null;
    diagnosticos: DevolucionDiagnostico[];
    evidencias: { relacion: string | null; origenTemporal: string | null };
  }[];
  page: number;
  total: number;
};

function pageNumber(value: unknown) {
  const raw = String(value ?? "1");
  const page = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
  return page;
}

/**
 * R1. Una única función produce resumen e items de una compra; R3 reutiliza
 * exactamente `resumen`. El resumen se calcula sobre TODOS los items.
 */
export function proyeccionDevolucionesCompra(
  db: Database,
  compraId: string,
  opts: { page?: unknown; pageSize?: number } = {},
): DevolucionesCompra {
  const page = pageNumber(opts.page);
  const size = opts.pageSize ?? DEVOLUCIONES_PAGE_SIZE;
  return db.transaction(() => {
    const { items: all, compras: purchases } = proyectarDevoluciones(db, compraId);
    const compra = purchases.get(compraId);
    if (!compra)
      throw new Problem(404, "NOT_FOUND", "Movimiento no encontrado.");
    if (compra.tipo !== "Gasto" || compra.terminal)
      throw new Problem(
        422,
        "VALIDATION",
        "Solo una compra individual (Gasto no Terminal) admite devoluciones.",
      );
    const own = all.filter((d) => d.compra === compraId && d.vinculo);
    const anulada = compra.anulado;
    let devuelto = 0n,
      descuento = 0n,
      pendiente = 0n;
    const causas = new Set<CausaCobertura>();
    for (const d of own) {
      if (d.verificado) devuelto += d.importe;
      if (d.elegible) descuento += d.importe;
      if (d.vinculo!.estado === "Revisar") pendiente += d.importe;
      if (d.causa) causas.add(d.causa);
      for (const f of d.flags) causas.add(f);
    }
    if (anulada) causas.add("compraInvalida");
    if (!clasificada(compra.clasificacion) && !anulada)
      causas.add("sinClasificacion");
    if (!compra.ciclo && !anulada) causas.add("periodoNoResoluble");
    const exceso = devuelto > compra.importe;
    const capacidad =
      anulada || exceso ? null : compra.importe - devuelto;
    const gre = anulada || descuento > compra.importe ? null : compra.importe - descuento;
    const cobertura: Cobertura = anulada
      ? "No disponible"
      : causas.size || exceso
        ? "Parcial"
        : "Completa";
    const resumen: DevolucionesResumen = {
      count: own.length,
      bruto: decimal(compra.importe)!,
      devueltoVerificado: decimal(devuelto)!,
      capacidadBancariaRestante: capacidad === null ? null : decimal(capacidad),
      descuentoEconomico: decimal(descuento)!,
      gastoRealEconomico: gre === null ? null : decimal(gre),
      pendienteRevision: decimal(pendiente)!,
      cobertura,
      causas: causasCobertura.filter((c) => causas.has(c)),
      ids: own.map((d) => d.id),
    };
    const signed = decimal(compra.importe - devuelto)!;
    const rows = own.slice((page - 1) * size, page * size).map((d) => ({
      id: d.id,
      fecha: d.fecha,
      importe: decimal(d.importe)!,
      saldoReceptor: d.saldoReceptor,
      estado: d.vinculo!.estado as "Verificado" | "Revisar",
      elegibilidad: d.vinculo!.elegibilidad,
      revision: d.revisionMovimiento,
      devolucionRevision: d.vinculo!.revision,
      cicloDerivado: d.cicloDerivado,
      cicloAlmacenado: d.vinculo!.cicloAlmacenado,
      diagnosticos:
        exceso && d.verificado
          ? [...d.diagnosticos, { codigo: "EXCESO" as const, exceso: signed }]
          : d.diagnosticos,
      evidencias: {
        relacion: d.vinculo!.evidenciaRelacion,
        origenTemporal: d.vinculo!.evidenciaOrigenTemporal,
      },
    }));
    return {
      compra: {
        id: compra.id,
        fecha: compra.fecha,
        importe: decimal(compra.importe)!,
        partida: compra.clasificacion.partida,
        referencia: compra.clasificacion.referencia,
        cicloAtribucion: compra.ciclo,
      },
      resumen,
      items: rows,
      page,
      total: own.length,
    };
  })();
}

/** R3: exactamente el `resumen` de R1 para un Gasto individual; null si no aplica. */
export function devolucionesResumenGasto(
  db: Database,
  id: string,
): DevolucionesResumen | null {
  const row = db
    .query(
      `SELECT m.tipo,s.control FROM movimientos m JOIN saldos s ON s.id=m.origen WHERE m.id=?`,
    )
    .get(id) as { tipo: string; control: string } | null;
  if (!row || row.tipo !== "Gasto" || row.control === "Terminal") return null;
  return proyeccionDevolucionesCompra(db, id).resumen;
}

/* --------------------------------------------------------------------- R4 */

export const categoriasIntegridad = [
  "sinVinculo",
  "reexpresadas",
  "vinculoInvalido",
  "exceso",
] as const;
export type CategoriaIntegridad = (typeof categoriasIntegridad)[number];
export type IntegridadItem = {
  categoria: CategoriaIntegridad;
  id: string;
  causa: string;
  importe: string;
  compra: string | null;
  almacenado: Record<string, string | null> | null;
  derivado: Record<string, string | null> | null;
  ids?: string[];
};

/** R4: inventario de solo lectura. No convierte, no propone compra, no persiste. */
export function integridadDevoluciones(db: Database, params = new URLSearchParams()) {
  const page = pageNumber(params.get("page"));
  const categoria = params.get("categoria") ?? "";
  if (categoria && !(categoriasIntegridad as readonly string[]).includes(categoria))
    throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
  return db.transaction(() => {
    const { items: all, compras: purchases } = proyectarDevoluciones(db);
    const out: IntegridadItem[] = [];
    for (const d of all) {
      if (d.causa === "sinVinculo")
        out.push({
          categoria: "sinVinculo",
          id: d.id,
          causa: "sinVinculo",
          importe: decimal(d.importe)!,
          compra: null,
          almacenado: {
            estado: d.vinculo?.estado ?? null,
            compra: d.compra,
            elegibilidad: d.vinculo?.elegibilidad ?? null,
            partida: d.vinculo?.partidaAlmacenada ?? d.partidaMovimiento,
            ciclo: d.vinculo?.cicloAlmacenado ?? null,
          },
          derivado: null,
        });
      if (d.causa === "compraInvalida" || d.causa === "revisar")
        out.push({
          categoria: "vinculoInvalido",
          id: d.id,
          causa: d.causa,
          importe: decimal(d.importe)!,
          compra: d.compra,
          almacenado: {
            estado: d.vinculo!.estado,
            elegibilidad: d.vinculo!.elegibilidad,
          },
          derivado: null,
        });
      for (const g of d.diagnosticos)
        if (g.codigo === "CICLO_REEXPRESADO" || g.codigo === "PARTIDA_REEXPRESADA")
          out.push({
            categoria: "reexpresadas",
            id: d.id,
            causa: g.codigo,
            importe: decimal(d.importe)!,
            compra: d.compra,
            almacenado: { [g.codigo === "CICLO_REEXPRESADO" ? "ciclo" : "partida"]: g.almacenado ?? null },
            derivado: { [g.codigo === "CICLO_REEXPRESADO" ? "ciclo" : "partida"]: g.derivado ?? null },
          });
    }
    const byCompra = new Map<string, DevolucionProyectada[]>();
    for (const d of all)
      if (d.verificado && d.compra)
        byCompra.set(d.compra, [...(byCompra.get(d.compra) ?? []), d]);
    for (const [id, list] of byCompra) {
      const compra = purchases.get(id);
      if (!compra) continue;
      const devuelto = list.reduce((n, d) => n + d.importe, 0n);
      if (devuelto > compra.importe)
        out.push({
          categoria: "exceso",
          id,
          causa: "exceso",
          importe: decimal(devuelto - compra.importe)!,
          compra: id,
          almacenado: { devueltoVerificado: decimal(devuelto)! },
          derivado: {
            bruto: decimal(compra.importe)!,
            exceso: decimal(compra.importe - devuelto)!,
          },
          ids: list.map((d) => d.id),
        });
    }
    const order = (c: string) => categoriasIntegridad.indexOf(c as CategoriaIntegridad);
    const filtered = out
      .filter((i) => !categoria || i.categoria === categoria)
      .sort(
        (a, b) =>
          order(a.categoria) - order(b.categoria) ||
          a.id.length - b.id.length ||
          a.id.localeCompare(b.id) ||
          a.causa.localeCompare(b.causa),
      );
    const conteo = Object.fromEntries(
      categoriasIntegridad.map((c) => [c, out.filter((i) => i.categoria === c).length]),
    ) as Record<CategoriaIntegridad, number>;
    return {
      items: filtered.slice((page - 1) * DEVOLUCIONES_PAGE_SIZE, page * DEVOLUCIONES_PAGE_SIZE),
      page,
      total: filtered.length,
      conteo,
    };
  })();
}
