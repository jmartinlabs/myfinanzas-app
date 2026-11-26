import type { Database } from "bun:sqlite";
import { cycleForDate, cycleMaster } from "./ciclos";
import type { CoberturaValidada, ImpactoMaterial } from "./cierre-validacion-dto";
import {
  exigirEstadoValidacionDisponible,
  leerFilaValidacion,
  proyectarValidacion,
  type EstadoVisible,
} from "./cierre-validacion-estado";
import {
  huellaDe,
  impactoDeCandidatos,
  medirCandidatos,
  universoFinanciero,
  type ImpactoMedido,
  type UniversoFinanciero,
} from "./cierre-validacion-impacto";
import {
  marcarImpacto,
  operacionIdDe,
  type ReciboConfirmacion,
} from "./cierre-validacion-operaciones";
import { writeComidaDevolucionInTransaction } from "./comida";
import {
  exigirEscrituraDevolucion,
  type DevolucionGate,
} from "./devolucion-gate";
import {
  descuentoPorCompras,
  proyeccionDevolucionesCompra,
} from "./devoluciones";
import { previewMovement, writeMovementInTransaction } from "./movimientos";
import { Problem } from "./problem";
import { decimal, money } from "./saldos";

/**
 * SPEC39 §11 / ANEXO-INTERFACES §§1–6 (DEV #598 · F4) · Preview, impacto y cierres
 * para operaciones de devolución de compras, detrás del gate #572.
 *
 * - Validador de dominio común a preview y confirmación.
 * - Preview en `SAVEPOINT` con `ROLLBACK` total: nunca persiste hechos,
 *   revisiones, auditoría, intentos ni `dirty`.
 * - Confirmación en `BEGIN IMMEDIATE` con `busy_timeout=3000`:
 *   idempotencia completada → gate #572 → gate #547 → estructura/existencia →
 *   revisiones específicas (`REVISION_CONFLICT` / `ATTRIBUTION_REVISION_CONFLICT`) →
 *   `IMPACT_CHANGED` (trío `fingerprint`/`contextRevision`/`impactRevision`) →
 *   aplicación real + `marcarImpacto` únicamente por materialidad.
 * - Ninguna ruta emite `HISTORY_LOCKED` por cierre.
 */

export type AccionDevolucionImpacto =
  | "alta"
  | "atribuir"
  | "rectificar"
  | "anular";

export type EntradaDevolucionImpacto = {
  accion: AccionDevolucionImpacto;
  /** ID del movimiento de devolución (requerido en atribuir/rectificar/anular). */
  id?: string | null;
  /** Payload de la operación (movimiento o atribución). */
  body: Record<string, unknown>;
};

export type EntradaConfirmacionDevolucion = EntradaDevolucionImpacto & {
  fingerprint: string;
  contextRevision: string;
  impactRevision: string;
  key: string;
  actor?: string;
  instante?: string;
};

export type CifrasCicloDevolucion = {
  bruto: string;
  descuentoEconomico: string;
  gastoRealEconomico: string | null;
  devolucionBancaria: string;
  efectivo: string | null;
};

export type CicloAfectadoDevolucionDto = {
  ciclo: string;
  rango: { desde: string; hasta: string };
  motivo: ImpactoMaterial[];
  material: boolean;
  estadoValidacion: EstadoVisible;
  validado: boolean;
  dirtyPrevio: boolean;
  signoGasto: "baja" | "sube" | "invariante";
  cifrasAntes: CifrasCicloDevolucion;
  cifrasDespues: CifrasCicloDevolucion;
};

export type DevolucionImpactoDto = {
  compra: string;
  compraFecha: string;
  cicloAtribucion: string | null;
  anioAtribucion: string;
  bruto: string;
  devueltoAntes: string;
  devueltoDespues: string;
  restanteAntes: string | null;
  restanteDespues: string | null;
  estadoResultante: string;
  partidaResuelta: string | null;
  receptor: {
    saldo: string;
    nombre: string;
    fecha: string;
    saldoAntes: string | null;
    saldoDespues: string | null;
  };
  magnitudes: {
    gastoRealEconomicoAntes: string | null;
    gastoRealEconomicoDespues: string | null;
    descuentoEconomicoAntes: string | null;
    descuentoEconomicoDespues: string | null;
    disponibleOperativoAntes: string | null;
    disponibleOperativoDespues: string | null;
    aportacionSugeridaAntes: string | null;
    aportacionSugeridaDespues: string | null;
    flujoBancarioImporte: string;
    flujoBancarioFecha: string;
  };
  ciclosAfectados: CicloAfectadoDevolucionDto[];
};

export type PreviewDevolucionDto = {
  fingerprint: string;
  contextRevision: string;
  impactRevision: string;
  devolucionImpacto: DevolucionImpactoDto;
  noStore: true;
};

export type ConfirmacionDevolucionDto = ReciboConfirmacion;

const CLAVE = /^[A-Za-z0-9][A-Za-z0-9:._-]{7,199}$/;
const HUELLA = /^[a-f0-9]{64}$/;
const SAVEPOINT = "devolucion_impacto_dry_run";
const GATE_ABIERTO: DevolucionGate = Object.freeze({ disponible: true });

function rechazo(campo: string, motivo: string, code = "VALIDATION"): never {
  throw new Problem(422, code, `Operación de devolución inválida en «${campo}»: ${motivo}.`, {
    [campo]: motivo,
  });
}

function conflicto(code: string, mensaje: string, detalle?: Record<string, string>): never {
  throw new Problem(409, code, mensaje, detalle);
}

type CompraRow = {
  id: string;
  fecha: string;
  importe: string;
  tipo: string;
  anulado: number;
  partida: string | null;
  control: string;
};

type MovimientoRow = {
  id: string;
  tipo: string;
  fecha: string;
  importe: string;
  origen: string;
  destino: string;
  anulado: number;
  revision: number;
};

type VinculoRow = {
  movimiento: string;
  compra: string | null;
  estado: string;
  elegibilidad: string;
  revision: number;
};

function leerCompra(db: Database, id: string): CompraRow | null {
  return (
    (db
      .query(
        `SELECT c.id,c.fecha,CAST(c.importe AS TEXT) importe,c.tipo,c.anulado,c.partida,s.control
           FROM movimientos c
           JOIN saldos s ON s.id=c.origen
          WHERE c.id=?`,
      )
      .get(id) as CompraRow | null) ?? null
  );
}

function leerMovimiento(db: Database, id: string): MovimientoRow | null {
  return (
    (db
      .query(
        `SELECT id,tipo,fecha,CAST(importe AS TEXT) importe,origen,destino,anulado,revision
           FROM movimientos WHERE id=?`,
      )
      .get(id) as MovimientoRow | null) ?? null
  );
}

function leerVinculo(db: Database, id: string): VinculoRow | null {
  const existe = db
    .query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='movimiento_devolucion'")
    .get();
  if (!existe) return null;
  return (
    (db
      .query(
        `SELECT movimiento,compra,estado,elegibilidad,revision
           FROM movimiento_devolucion WHERE movimiento=?`,
      )
      .get(id) as VinculoRow | null) ?? null
  );
}

function rangoDe(db: Database, ciclo: string): { desde: string; hasta: string } {
  const maestro = cycleMaster(db).find((entrada) => entrada.id === ciclo);
  if (!maestro) throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.");
  const desde = maestro.inicio;
  const hasta = maestro.fin ?? desde;
  return { desde, hasta: hasta >= desde ? hasta : desde };
}

/**
 * Posición bancaria real de un saldo a una fecha dada (céntimos en texto EUR).
 * Suma `saldo_inicial` más movimientos vigentes con `fecha <= corte`.
 */
function saldoBancarioAFecha(
  db: Database,
  saldoId: string,
  fecha: string,
): { nombre: string; valor: string | null } {
  const saldo = db
    .query("SELECT id,nombre,CAST(apertura AS TEXT) inicial FROM saldos WHERE id=?")
    .get(saldoId) as { id: string; nombre: string; inicial: string | null } | null;
  if (!saldo) return { nombre: saldoId, valor: null };
  const inicial = saldo.inicial !== null ? BigInt(saldo.inicial) : 0n;
  const entradas = db
    .query(
      `SELECT COALESCE(SUM(importe),0) total FROM movimientos
        WHERE anulado=0 AND destino=? AND fecha<=?`,
    )
    .get(saldoId, fecha) as { total: number | bigint };
  const salidas = db
    .query(
      `SELECT COALESCE(SUM(importe),0) total FROM movimientos
        WHERE anulado=0 AND origen=? AND fecha<=?`,
    )
    .get(saldoId, fecha) as { total: number | bigint };
  const total = inicial + BigInt(entradas.total) - BigInt(salidas.total);
  return { nombre: saldo.nombre, valor: decimal(total) };
}

type PlanDevolucion = {
  accion: AccionDevolucionImpacto;
  id: string | null;
  compraId: string;
  compraOrigenId: string | null;
  compra: CompraRow;
  movimiento: MovimientoRow | null;
  vinculo: VinculoRow | null;
  receptorSaldo: string;
  receptorFecha: string;
  flujoBancarioImporte: bigint;
  flujoBancarioFecha: string;
  estadoResultante: string;
  candidatos: string[];
};

/**
 * Validador de dominio común a preview y confirmación (ANEXO §1, §5, §6; SPEC39 §5–§6, §11).
 * Comprueba estructura, existencia, revisiones y guardas de dominio con los mismos códigos
 * canónicos en ambos caminos.
 */
export function validarOperacionDevolucion(
  db: Database,
  entrada: EntradaDevolucionImpacto,
): PlanDevolucion {
  const { accion, body } = entrada;
  const id = entrada.id ?? null;
  if (!["alta", "atribuir", "rectificar", "anular"].includes(accion))
    rechazo("accion", "acción de devolución no admitida");

  if (accion === "alta") {
    if (body.tipo !== "Devolución de gasto")
      rechazo("tipo", "el alta de devolución exige tipo «Devolución de gasto»");
    const dev =
      body.devolucion && typeof body.devolucion === "object"
        ? (body.devolucion as Record<string, unknown>)
        : null;
    const compraId = typeof dev?.compra === "string" ? dev.compra.trim() : "";
    if (!compraId)
      throw new Problem(
        422,
        "DEVOLUTION_LINK_REQUIRED",
        "El alta de devolución requiere una compra vinculada.",
        { compra: "Indica la compra original." },
      );
    if (body.partida !== undefined && body.partida !== null && body.partida !== "")
      rechazo("partida", "la clasificación se deriva de la compra vigente y no se envía en el alta");
    const compra = leerCompra(db, compraId);
    if (!compra)
      throw new Problem(404, "NOT_FOUND", "Compra no encontrada.", {
        compra: "No existe la compra indicada.",
      });
    if (compra.anulado === 1 || compra.tipo !== "Gasto" || compra.control === "Terminal")
      rechazo("compra", "la compra no es un Gasto vigente elegible");
    const importe = money(body.importe);
    if (importe === null || importe <= 0n)
      rechazo("importe", "el importe debe ser positivo");
    const fecha = typeof body.fecha === "string" ? body.fecha.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      rechazo("fecha", "fecha ISO inválida");
    const destino =
      typeof body.saldo === "string"
        ? body.saldo.trim()
        : typeof body.destino === "string"
          ? body.destino.trim()
          : "";
    if (!destino) rechazo("saldo", "saldo receptor obligatorio");

    // Validar tope de capacidad bancaria (SPEC39 §4 / AC-D10: ningún alta supera
    // la capacidad bancaria restante, tampoco en «Revisar»).
    const proy = proyeccionDevolucionesCompra(db, compraId);
    const devueltoVerificado = money(proy.resumen.devueltoVerificado) ?? 0n;
    const bruto = BigInt(compra.importe);
    const estadoSolicitado =
      typeof dev?.estado === "string" ? dev.estado : "Verificado";
    if (devueltoVerificado + importe > bruto)
      throw new Problem(
        422,
        "DEVOLUTION_EXCESS",
        "El importe supera la capacidad restante de esta compra.",
        { importe: "Excede la capacidad bancaria restante." },
      );

    const candidatos = resolverCandidatos(db, [compra.fecha, fecha]);
    return {
      accion,
      id: null,
      compraId,
      compraOrigenId: null,
      compra,
      movimiento: null,
      vinculo: null,
      receptorSaldo: destino,
      receptorFecha: fecha,
      flujoBancarioImporte: importe,
      flujoBancarioFecha: fecha,
      estadoResultante: estadoSolicitado,
      candidatos,
    };
  }

  // Acciones sobre movimiento existente: atribuir, rectificar, anular
  if (!id || !/^\d+$/.test(id)) rechazo("id", "identificador de devolución inválido");
  const mov = leerMovimiento(db, id);
  if (!mov)
    throw new Problem(404, "NOT_FOUND", "Movimiento no encontrado.", {
      id: "No existe la devolución indicada.",
    });
  if (mov.tipo !== "Devolución de gasto")
    rechazo("tipo", "el movimiento indicado no es una «Devolución de gasto»");

  const revBody = body.revision;
  if (revBody === undefined || revBody === null)
    rechazo("revision", "revisión del movimiento obligatoria");
  if (Number(revBody) !== mov.revision)
    conflicto(
      "REVISION_CONFLICT",
      "La revisión del movimiento está obsoleta.",
      { revision: "Refresca la ficha antes de confirmar." },
    );

  const vinculo = leerVinculo(db, id);

  if (accion === "atribuir") {
    // Revisión propia del vínculo (ANEXO §6): null si no existe fila; número real si existe.
    if (vinculo) {
      if (body.devolucionRevision === undefined || body.devolucionRevision === null)
        rechazo("devolucionRevision", "revisión del vínculo obligatoria");
      if (Number(body.devolucionRevision) !== vinculo.revision)
        conflicto(
          "ATTRIBUTION_REVISION_CONFLICT",
          "La revisión propia del vínculo está obsoleta.",
          { devolucionRevision: "Refresca el vínculo antes de confirmar." },
        );
      if (
        body.compraAnterior !== undefined &&
        body.compraAnterior !== vinculo.compra
      )
        conflicto(
          "ATTRIBUTION_REVISION_CONFLICT",
          "La compra anterior del vínculo ya no coincide.",
          { compraAnterior: "Refresca el vínculo antes de reatribuir." },
        );
    } else if (
      body.devolucionRevision !== undefined &&
      body.devolucionRevision !== null
    ) {
      conflicto(
        "ATTRIBUTION_REVISION_CONFLICT",
        "No existe vínculo previo para la revisión indicada.",
      );
    }

    const compraDestinoId = typeof body.compra === "string" ? body.compra.trim() : "";
    if (!compraDestinoId)
      throw new Problem(
        422,
        "DEVOLUTION_LINK_REQUIRED",
        "La atribución requiere una compra destino.",
        { compra: "Indica la compra destino." },
      );
    const compra = leerCompra(db, compraDestinoId);
    if (!compra)
      throw new Problem(404, "NOT_FOUND", "Compra destino no encontrada.", {
        compra: "No existe la compra destino.",
      });
    if (compra.anulado === 1 || compra.tipo !== "Gasto" || compra.control === "Terminal")
      rechazo("compra", "la compra destino no es un Gasto vigente elegible");

    const estadoResultante =
      typeof body.estado === "string" ? body.estado : (vinculo?.estado ?? "Verificado");
    if (estadoResultante === "Verificado" && mov.anulado === 0) {
      const proy = proyeccionDevolucionesCompra(db, compraDestinoId);
      let devueltoOtros = money(proy.resumen.devueltoVerificado) ?? 0n;
      // Excluir el propio vínculo si ya estaba Verificado sobre la misma compra
      if (vinculo && vinculo.compra === compraDestinoId && vinculo.estado === "Verificado")
        devueltoOtros -= BigInt(mov.importe);
      if (devueltoOtros + BigInt(mov.importe) > BigInt(compra.importe))
        throw new Problem(
          422,
          "DEVOLUTION_EXCESS",
          "La atribución excede la capacidad restante de la compra destino.",
          { compra: "Excede la capacidad bancaria restante." },
        );
    }

    const compraOrigen =
      vinculo?.compra && vinculo.compra !== compraDestinoId
        ? leerCompra(db, vinculo.compra)
        : null;
    const candidatos = resolverCandidatos(db, [
      compra.fecha,
      compraOrigen?.fecha ?? null,
      mov.fecha,
    ]);
    return {
      accion,
      id,
      compraId: compraDestinoId,
      compraOrigenId: compraOrigen?.id ?? null,
      compra,
      movimiento: mov,
      vinculo,
      receptorSaldo: mov.destino,
      receptorFecha: mov.fecha,
      flujoBancarioImporte: 0n,
      flujoBancarioFecha: mov.fecha,
      estadoResultante,
      candidatos,
    };
  }

  // rectificar o anular
  const compraId = vinculo?.compra ?? "";
  if (!compraId)
    rechazo("compra", "la devolución no tiene compra vinculada");
  const compra = leerCompra(db, compraId);
  if (!compra)
    throw new Problem(404, "NOT_FOUND", "Compra vinculada no encontrada.");

  if (accion === "rectificar") {
    const nuevoImporte =
      body.importe !== undefined ? money(body.importe) : BigInt(mov.importe);
    if (nuevoImporte === null || nuevoImporte <= 0n)
      rechazo("importe", "el importe debe ser positivo");
    const nuevaFecha =
      typeof body.fecha === "string" ? body.fecha.trim() : mov.fecha;
    const nuevoDestino =
      typeof body.saldo === "string"
        ? body.saldo.trim()
        : typeof body.destino === "string"
          ? body.destino.trim()
          : mov.destino;
    // SPEC39 §4 / §6 / AC-D10 / AC-D14: ninguna rectificación de una devolución
    // vinculada (tampoco en «Revisar») puede superar la capacidad restante.
    if (
      (vinculo?.estado === "Verificado" || vinculo?.estado === "Revisar") &&
      mov.anulado === 0
    ) {
      const proy = proyeccionDevolucionesCompra(db, compraId);
      const devueltoOtros =
        (money(proy.resumen.devueltoVerificado) ?? 0n) -
        (vinculo.estado === "Verificado" ? BigInt(mov.importe) : 0n);
      if (devueltoOtros + nuevoImporte > BigInt(compra.importe))
        throw new Problem(
          422,
          "DEVOLUTION_EXCESS",
          "El importe rectificado supera la capacidad restante de esta compra.",
          { importe: "Excede la capacidad bancaria restante." },
        );
    }
    const candidatos = resolverCandidatos(db, [compra.fecha, mov.fecha, nuevaFecha]);
    return {
      accion,
      id,
      compraId,
      compraOrigenId: null,
      compra,
      movimiento: mov,
      vinculo,
      receptorSaldo: nuevoDestino,
      receptorFecha: nuevaFecha,
      flujoBancarioImporte: nuevoImporte - BigInt(mov.importe),
      flujoBancarioFecha: nuevaFecha,
      estadoResultante: vinculo?.estado ?? "Verificado",
      candidatos,
    };
  }

  // anular
  const candidatos = resolverCandidatos(db, [compra.fecha, mov.fecha]);
  return {
    accion: "anular",
    id,
    compraId,
    compraOrigenId: null,
    compra,
    movimiento: mov,
    vinculo,
    receptorSaldo: mov.destino,
    receptorFecha: mov.fecha,
    flujoBancarioImporte: -BigInt(mov.importe),
    flujoBancarioFecha: mov.fecha,
    estadoResultante: "Anulado",
    candidatos,
  };
}

function resolverCandidatos(
  db: Database,
  fechas: readonly (string | null | undefined)[],
): string[] {
  const maestro = cycleMaster(db);
  const presentes = fechas.filter(
    (f): f is string => typeof f === "string" && f.length > 0,
  );
  const set = new Set<string>();
  for (const fecha of presentes) {
    const c = cycleForDate(db, fecha);
    if (c) set.add(c.id);
  }
  const minimo = presentes.length ? [...presentes].sort()[0] : null;
  if (minimo) {
    for (const ciclo of maestro) {
      if (ciclo.fin === null || ciclo.fin >= minimo) set.add(ciclo.id);
    }
  }
  return [...set].sort((a, b) => Number(a) - Number(b));
}

function aplicarEnTransaccion(
  db: Database,
  entrada: EntradaDevolucionImpacto,
  now: number,
): void {
  if (entrada.accion === "alta") {
    const p = previewMovement(db, entrada.body, null, false, now);
    writeMovementInTransaction(
      db,
      { ...entrada.body, fingerprint: p.fingerprint, contextRevision: p.contextRevision },
      {
        gate: GATE_ABIERTO,
        now,
        id: null,
        annul: false,
      },
    );
    return;
  }
  if (entrada.accion === "atribuir") {
    writeComidaDevolucionInTransaction(
      db,
      entrada.id!,
      entrada.body,
      now,
      GATE_ABIERTO,
    );
    return;
  }
  if (entrada.accion === "rectificar") {
    const p = previewMovement(db, entrada.body, entrada.id!, false, now);
    writeMovementInTransaction(
      db,
      { ...entrada.body, fingerprint: p.fingerprint, contextRevision: p.contextRevision },
      {
        gate: GATE_ABIERTO,
        now,
        id: entrada.id!,
        annul: false,
      },
    );
    return;
  }
  const p = previewMovement(db, entrada.body, entrada.id!, true, now);
  writeMovementInTransaction(
    db,
    { ...entrada.body, fingerprint: p.fingerprint, contextRevision: p.contextRevision },
    {
      gate: GATE_ABIERTO,
      now,
      id: entrada.id!,
      annul: true,
    },
  );
}

function huellaPayloadDevolucion(entrada: EntradaDevolucionImpacto): string {
  return huellaDe({
    familia: `devolucion:${entrada.accion}`,
    id: entrada.id ?? null,
    body: entrada.body,
  });
}

/**
 * `alta`/`atribuir` necesitan medir el impacto material del ciclo. Si el flujo
 * no es medible (exceso histórico en devoluciones), fallan con
 * `409 IMPACTO_NO_VERIFICABLE` sin escribir. `rectificar`/`anular` son el
 * saneamiento individual autorizado y siguen permitidos aunque el flujo no se
 * pueda medir: no inventan impacto ni dirty.
 */
function exigirImpactoDevolucion(
  accion: AccionDevolucionImpacto,
  impactos: readonly ImpactoMedido[],
): void {
  if (accion !== "alta" && accion !== "atribuir") return;
  if (impactos.some((impacto) => impacto.noDisponible.includes("flujo")))
    throw new Problem(
      409,
      "IMPACTO_NO_VERIFICABLE",
      "No se puede medir el impacto requerido: el flujo del ciclo no está disponible.",
      { flujo: "Sanea la cobertura de devoluciones antes de confirmar la operación." },
    );
}

/**
 * `impactRevision` cubre el resultado medido **y** la cobertura/universo completo
 * de los candidatos, igual que el envoltorio genérico. Así un cambio sólo de
 * cobertura entre preview y confirmación da `IMPACT_CHANGED` sin marcar dirty.
 */
function impactRevisionDevolucion(
  fingerprint: string,
  antes: ReadonlyMap<string, UniversoFinanciero>,
  despues: ReadonlyMap<string, UniversoFinanciero>,
  devolucionImpacto: DevolucionImpactoDto,
): string {
  const ordenado = (mapa: ReadonlyMap<string, UniversoFinanciero>) =>
    [...mapa.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([ciclo, lectura]) => [ciclo, huellaDe(lectura)]);
  return huellaDe({
    fingerprint,
    devolucionImpacto,
    antes: ordenado(antes),
    despues: ordenado(despues),
  });
}

function contextRevisionDevolucion(
  db: Database,
  plan: PlanDevolucion,
): string {
  const compraActual = leerCompra(db, plan.compraId);
  const compraOrigenActual = plan.compraOrigenId
    ? leerCompra(db, plan.compraOrigenId)
    : null;
  const movActual = plan.id ? leerMovimiento(db, plan.id) : null;
  const vinculoActual = plan.id ? leerVinculo(db, plan.id) : null;
  const validaciones = plan.candidatos.map((c) => {
    const v = proyectarValidacion(db, c);
    return { ciclo: c, estado: v.estado, revision: v.revision, validado: v.validado };
  });
  return huellaDe({
    accion: plan.accion,
    compra: compraActual,
    compraOrigen: compraOrigenActual,
    movimiento: movActual,
    vinculo: vinculoActual,
    validaciones,
  });
}

function medirEstadoCiclos(
  db: Database,
  candidatos: readonly string[],
): Map<string, UniversoFinanciero> {
  return medirCandidatos(db, candidatos);
}

function cifrasDeUniverso(u: UniversoFinanciero): CifrasCicloDevolucion {
  return {
    bruto: u.flujo.bruto !== null ? (decimal(BigInt(u.flujo.bruto)) ?? "0.00") : "0.00",
    descuentoEconomico:
      u.flujo.devolucionEconomica !== null
        ? (decimal(BigInt(u.flujo.devolucionEconomica)) ?? "0.00")
        : "0.00",
    gastoRealEconomico:
      u.flujo.gre !== null ? (decimal(BigInt(u.flujo.gre)) ?? null) : null,
    devolucionBancaria:
      u.flujo.devolucion !== null
        ? (decimal(BigInt(u.flujo.devolucion)) ?? "0.00")
        : "0.00",
    efectivo: u.stock.efectivo,
  };
}

function construirCiclosAfectados(
  db: Database,
  antes: ReadonlyMap<string, UniversoFinanciero>,
  despues: ReadonlyMap<string, UniversoFinanciero>,
): {
  ciclosAfectados: CicloAfectadoDevolucionDto[];
  impactos: ImpactoMedido[];
} {
  const impactos = impactoDeCandidatos(antes, despues);
  const ciclosAfectados: CicloAfectadoDevolucionDto[] = [];

  for (const imp of impactos) {
    if (!imp.material) continue;
    const uAntes = antes.get(imp.ciclo)!;
    const uDespues = despues.get(imp.ciclo)!;
    const validacion = proyectarValidacion(db, imp.ciclo);
    const greAntes = uAntes.flujo.gre !== null ? BigInt(uAntes.flujo.gre) : null;
    const greDespues = uDespues.flujo.gre !== null ? BigInt(uDespues.flujo.gre) : null;
    const signoGasto: "baja" | "sube" | "invariante" =
      greAntes !== null && greDespues !== null
        ? greDespues < greAntes
          ? "baja"
          : greDespues > greAntes
            ? "sube"
            : "invariante"
        : "invariante";
    ciclosAfectados.push({
      ciclo: imp.ciclo,
      rango: rangoDe(db, imp.ciclo),
      motivo: imp.motivos,
      material: true,
      estadoValidacion: validacion.estado,
      validado: validacion.validado,
      dirtyPrevio: validacion.estado === "Pendiente",
      signoGasto,
      cifrasAntes: cifrasDeUniverso(uAntes),
      cifrasDespues: cifrasDeUniverso(uDespues),
    });
  }

  return { ciclosAfectados, impactos };
}

function medirDryRunDevolucion(
  db: Database,
  entrada: EntradaDevolucionImpacto,
  plan: PlanDevolucion,
  now: number,
) {
  const proyAntes = proyeccionDevolucionesCompra(db, plan.compraId);
  const receptorAntes = saldoBancarioAFecha(db, plan.receptorSaldo, plan.receptorFecha);
  const ciclosAntes = medirEstadoCiclos(db, plan.candidatos);

  db.run(`SAVEPOINT ${SAVEPOINT}`);
  let proyDespues: ReturnType<typeof proyeccionDevolucionesCompra>;
  let receptorDespues: ReturnType<typeof saldoBancarioAFecha>;
  let ciclosDespues: Map<string, UniversoFinanciero>;
  try {
    aplicarEnTransaccion(db, entrada, now);
    proyDespues = proyeccionDevolucionesCompra(db, plan.compraId);
    receptorDespues = saldoBancarioAFecha(db, plan.receptorSaldo, plan.receptorFecha);
    ciclosDespues = medirEstadoCiclos(db, plan.candidatos);
  } finally {
    db.run(`ROLLBACK TO ${SAVEPOINT}`);
    db.run(`RELEASE ${SAVEPOINT}`);
  }

  const { ciclosAfectados, impactos } = construirCiclosAfectados(
    db,
    ciclosAntes,
    ciclosDespues,
  );
  const cicloAtribucion = cycleForDate(db, plan.compra.fecha)?.id ?? null;
  const devolucionImpacto: DevolucionImpactoDto = {
    compra: plan.compraId,
    compraFecha: plan.compra.fecha,
    cicloAtribucion,
    anioAtribucion: plan.compra.fecha.slice(0, 4),
    bruto: proyAntes.resumen.bruto,
    devueltoAntes: proyAntes.resumen.devueltoVerificado,
    devueltoDespues: proyDespues.resumen.devueltoVerificado,
    restanteAntes: proyAntes.resumen.capacidadBancariaRestante,
    restanteDespues: proyDespues.resumen.capacidadBancariaRestante,
    estadoResultante: plan.estadoResultante,
    partidaResuelta: plan.compra.partida ?? null,
    receptor: {
      saldo: plan.receptorSaldo,
      nombre: receptorAntes.nombre,
      fecha: plan.receptorFecha,
      saldoAntes: receptorAntes.valor,
      saldoDespues: receptorDespues.valor,
    },
    magnitudes: {
      gastoRealEconomicoAntes: proyAntes.resumen.gastoRealEconomico,
      gastoRealEconomicoDespues: proyDespues.resumen.gastoRealEconomico,
      descuentoEconomicoAntes: proyAntes.resumen.descuentoEconomico,
      descuentoEconomicoDespues: proyDespues.resumen.descuentoEconomico,
      disponibleOperativoAntes: null,
      disponibleOperativoDespues: null,
      aportacionSugeridaAntes: null,
      aportacionSugeridaDespues: null,
      flujoBancarioImporte: decimal(plan.flujoBancarioImporte) ?? "0.00",
      flujoBancarioFecha: plan.flujoBancarioFecha,
    },
    ciclosAfectados,
  };

  return { devolucionImpacto, ciclosAntes, ciclosDespues, impactos };
}

/**
 * `POST /api/impacto/preview` para `tipo: "devolucion"`.
 * Solo lectura: nunca persiste hechos, auditoría, intentos ni `dirty`.
 * Disponible incluso con el gate #572 cerrado (F2G-AC-07).
 */
export function previewDevolucionImpacto(
  db: Database,
  entrada: EntradaDevolucionImpacto,
  now = Date.now(),
): PreviewDevolucionDto {
  exigirEstadoValidacionDisponible(db);
  const plan = validarOperacionDevolucion(db, entrada);
  const fingerprint = huellaPayloadDevolucion(entrada);
  const contextRevision = contextRevisionDevolucion(db, plan);
  const { devolucionImpacto, ciclosAntes, ciclosDespues, impactos } =
    medirDryRunDevolucion(db, entrada, plan, now);
  exigirImpactoDevolucion(entrada.accion, impactos);
  const impactRevision = impactRevisionDevolucion(
    fingerprint,
    ciclosAntes,
    ciclosDespues,
    devolucionImpacto,
  );
  return {
    fingerprint,
    contextRevision,
    impactRevision,
    devolucionImpacto,
    noStore: true,
  };
}

function tablaIntentos(accion: AccionDevolucionImpacto): string {
  return accion === "atribuir"
    ? "comida_devolucion_attempts"
    : "movement_attempts";
}

/**
 * `POST /api/impacto/confirmar` para `tipo: "devolucion"`.
 * Ejecuta en una única transacción `BEGIN IMMEDIATE` con `busy_timeout=3000`:
 * idempotencia → gate #572 → gate #547 → estructura/existencia → revisiones →
 * `IMPACT_CHANGED` → aplicación real → marcas `dirty` solo por materialidad →
 * recibo con `cierresDirty` desde estado real.
 */
export function confirmarDevolucionImpacto(
  db: Database,
  entrada: EntradaConfirmacionDevolucion,
  gate?: DevolucionGate,
  now = Date.now(),
): ConfirmacionDevolucionDto {
  if (!CLAVE.test(entrada.key)) rechazo("Idempotency-Key", "clave de intento inválida");
  if (!HUELLA.test(entrada.fingerprint))
    rechazo("fingerprint", "se esperaba una huella SHA-256");
  if (!HUELLA.test(entrada.contextRevision))
    rechazo("contextRevision", "token inválido");
  if (!HUELLA.test(entrada.impactRevision))
    rechazo("impactRevision", "token inválido");

  const actor = entrada.actor?.trim() || "usuario-unico";
  const instante = entrada.instante || new Date(now).toISOString();
  const hash = huellaPayloadDevolucion(entrada);
  const tabla = tablaIntentos(entrada.accion);

  db.run("PRAGMA busy_timeout=3000");

  return db
    .transaction((): ConfirmacionDevolucionDto => {
      // 1 · Clave completada antes de revalidar contexto ni gate (ANEXO §1).
      const previo = db
        .query(`SELECT hash,response FROM ${tabla} WHERE key=?`)
        .get(entrada.key) as { hash: string; response: string } | null;
      if (previo) {
        if (previo.hash !== hash)
          conflicto(
            "IDEMPOTENCY_CONFLICT",
            "La clave de intento ya corresponde a otros datos.",
            { key: "Reutiliza la clave sólo con el mismo payload." },
          );
        return JSON.parse(previo.response) as ConfirmacionDevolucionDto;
      }

      // 2 · Gate #572 (503 DEVOLUTION_INTEGRATION_UNAVAILABLE si cerrado).
      exigirEscrituraDevolucion(
        db,
        gate,
        entrada.accion === "atribuir"
          ? { origen: "comida-devolucion" }
          : {
              origen: "movimiento",
              body: entrada.body,
              id: entrada.id ?? null,
              anular: entrada.accion === "anular",
            },
      );

      // 3 · Gate #547 (estado de validación disponible).
      exigirEstadoValidacionDisponible(db);

      // 4 · Huella de payload.
      if (entrada.fingerprint !== hash)
        rechazo("fingerprint", "el payload no corresponde a esta operación");

      // 5 · Estructura, existencia y revisiones específicas antes que IMPACT_CHANGED.
      const plan = validarOperacionDevolucion(db, entrada);

      // 6 · Revalidación de contexto e impacto en la misma transacción IMMEDIATE.
      const contextRevision = contextRevisionDevolucion(db, plan);
      const { devolucionImpacto, ciclosAntes, ciclosDespues, impactos: impactosMedidos } =
        medirDryRunDevolucion(db, entrada, plan, now);
      exigirImpactoDevolucion(entrada.accion, impactosMedidos);
      const impactRevision = impactRevisionDevolucion(
        entrada.fingerprint,
        ciclosAntes,
        ciclosDespues,
        devolucionImpacto,
      );

      if (
        contextRevision !== entrada.contextRevision ||
        impactRevision !== entrada.impactRevision
      ) {
        conflicto(
          "IMPACT_CHANGED",
          "Cambió el contexto, la validación o el impacto desde la previsualización; vuelve a previsualizar.",
          { revisar: "El borrador se conserva; hace falta un preview nuevo." },
        );
      }

      // 7 · Aplicación real + marcas `dirty` solo por materialidad.
      const antesReal = medirEstadoCiclos(db, plan.candidatos);
      const pendientePrevio = new Map<string, boolean>();
      for (const ciclo of plan.candidatos)
        pendientePrevio.set(
          ciclo,
          proyectarValidacion(db, ciclo).estado === "Pendiente",
        );

      aplicarEnTransaccion(db, entrada, now);

      const despuesReal = medirEstadoCiclos(db, plan.candidatos);
      const { impactos } = construirCiclosAfectados(db, antesReal, despuesReal);
      const intento = operacionIdDe(entrada.key);
      const auditIds: string[] = [];

      for (const imp of impactos) {
        if (!imp.material) continue;
        const referencia = leerFilaValidacion(db, imp.ciclo);
        const cobertura: CoberturaValidada[] =
          universoFinanciero(db, imp.ciclo).cobertura;
        const auditId = marcarImpacto(db, {
          ciclo: imp.ciclo,
          motivos: imp.motivos,
          cobertura,
          actor,
          instante,
          intento,
          huellaAnterior: imp.huellaAntes,
          huellaPosterior: imp.huellaDespues,
          referenciaHumana: referencia?.huella_validacion ?? null,
          referenciaActual: imp.huellaDespues,
        });
        if (auditId !== null) auditIds.push(String(auditId));
      }

      const ciclos = plan.candidatos.map((ciclo) => {
        const v = proyectarValidacion(db, ciclo);
        return {
          id: ciclo,
          revision: String(v.revision ?? 0),
          estado: v.estado,
        };
      });

      const cierresDirty = plan.candidatos
        .map((ciclo) => ({ ciclo, validacion: proyectarValidacion(db, ciclo) }))
        .filter(({ validacion }) => validacion.estado === "Pendiente")
        .map(({ ciclo, validacion }) => ({
          ciclo,
          rango: rangoDe(db, ciclo),
          estadoValidacion: validacion.estado,
          validado: validacion.validado,
          dirtyPrevio: pendientePrevio.get(ciclo) === true,
        }));

      const recibo: ConfirmacionDevolucionDto = {
        operacionId: intento,
        ciclos,
        auditIds,
        cierresDirty,
      };

      db.run(
        `INSERT INTO ${tabla}(key,hash,response,expires) VALUES(?,?,?,?)`,
        [entrada.key, hash, JSON.stringify(recibo), now + 86_400_000],
      );

      return recibo;
    })
    .immediate();
}
