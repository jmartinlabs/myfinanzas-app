import type { Database } from "bun:sqlite";
import { cycleMaster, getCycle } from "./ciclos";
import { financeRevision, ledgerRows, type LedgerRow } from "./movement-ledger";
import { decimal, Problem } from "./saldos";
import {
  agregarDescuentos,
  descuentoPorCompras,
  proyectarDevoluciones,
} from "./devoluciones";

/**
 * E3.5/FIN_NETA — read model de agregación, atribución por ciclo y cobertura.
 *
 * Consume el registro único de Movimientos y los metadatos de Revisión Comida
 * (E3.4). No crea hechos, no persiste totales y no escribe Movimientos ni Saldos.
 * Es el propietario único de las magnitudes E3.5; el endpoint histórico
 * `/api/comida/metricas/:ciclo` delega aquí (D1-A′).
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
export const comidaRoles = ["Financiación", "Reposición", "Devolución Anticipo"] as const;
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
export type Regimen = {
  saldo: string;
  cicloCorte: string;
  apertura: string;
  evidencia: string;
  cobertura: "Verificable" | "Parcial";
  estado: "Preparado" | "Activo" | "Suspendido";
  revision: number;
};

const metadataSelect = `SELECT movimiento,etiqueta,evidencia_bancaria evidenciaBancaria,
  evidencia_comercial evidenciaComercial,estado_revision estadoRevision,
  revision_movimiento revisionMovimiento,revision,creado,actualizado
  FROM movimiento_revision_comida`;
const rolSelect = `SELECT movimiento,rol,obligacion_ciclo obligacionCiclo,evidencia,
  revision_movimiento revisionMovimiento,revision,creado,actualizado
  FROM movimiento_rol_financiacion`;

function regimenRaw(db: Database): Regimen | null {
  const r = db
    .query(
      `SELECT saldo,ciclo_corte cicloCorte,CAST(apertura AS TEXT) apertura,
       evidencia,cobertura,estado,revision FROM regimen_comida LIMIT 1`,
    )
    .get() as Regimen | null;
  return r ? { ...r, apertura: decimal(r.apertura)! } : null;
}

function regimenDto(db: Database) {
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

export function e35Metrics(
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
    const hasTable = (table: string) =>
      !!db
        .query("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
        .get(table);
    const metaOk = hasTable("movimiento_revision_comida");
    const devOk = hasTable("movimiento_devolucion");
    const rolesOk = hasTable("movimiento_rol_financiacion");
    const metadata = new Map(
      (metaOk ? (db.query(metadataSelect).all() as ComidaMetadata[]) : []).map(
        (r) => [r.movimiento, r],
      ),
    );
    const roles = new Map(
      (rolesOk ? (db.query(rolSelect).all() as ComidaRolRow[]) : []).map((r) => [
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
    // SPEC39 §8 (F2b): el descuento sigue a la COMPRA vigente de Comida. Una sola
    // proyección; el abono no filtra por fecha ni por saldo receptor, y la
    // clasificación sale de la compra (nunca d.partida/m.partida/ciclo_origen).
    const projection = proyectarDevoluciones(db);
    // Hechos bancarios por fecha de abono: solo `*Observado` (no son GRE).
    const devoluciones = rows.filter((r) => r.tipo === "Devolución de gasto");
    const ids = (ps: { row: LedgerRow }[]) => ps.map((p) => p.row.id);
    const scopeSet = new Set([...ids(food), ...ids(comp), ...ids(unclassified)]);
    const foodSet = new Set(ids(food));
    const compSet = new Set(ids(comp));
    const scopeDiscounts = descuentoPorCompras(db, scopeSet, projection);
    const discountOf = (set: Set<string>) =>
      agregarDescuentos([...set].map((id) => scopeDiscounts.get(id)!));
    const aggFood = discountOf(foodSet);
    const aggComp = discountOf(compSet);
    const aggScope = agregarDescuentos(scopeDiscounts.values());
    const inWindow = (fecha: string) => fecha >= start && fecha <= corte;
    const ofScope = projection.items.filter(
      (i) => i.compra !== null && scopeSet.has(i.compra),
    );
    const eligibleFoodIds = ofScope
      .filter((i) => i.elegible && foodSet.has(i.compra!))
      .map((i) => i.id);
    const eligibleCompIds = ofScope
      .filter((i) => i.elegible && compSet.has(i.compra!))
      .map((i) => i.id);
    // Un abono sin compra válida no se atribuye a Comida ni por su saldo receptor ni
    // por su declaración histórica (SPEC39 §3.3, AC-D21): se informa (integridad global
    // R4) sin netear ni degradar la cobertura de Comida.
    const abonosVentana = projection.items.filter((i) => inWindow(i.fecha));
    const sinVinculo = abonosVentana
      .filter((i) => i.causa === "sinVinculo")
      .map((i) => i.id);
    const compraInvalida = abonosVentana
      .filter((i) => i.causa === "compraInvalida")
      .map((i) => i.id);
    const sinAcreditacion = ofScope
      .filter((i) => i.causa === "sinAcreditacion")
      .map((i) => i.id);
    const revisar = ofScope.filter((i) => i.causa === "revisar").map((i) => i.id);
    const comprasCon = (causa: string) =>
      [...scopeDiscounts.values()]
        .filter((d) => (d.causas as string[]).includes(causa))
        .map((d) => d.compra);
    const comprasSinClasificacion = comprasCon("sinClasificacion");
    const comprasPeriodoNoResoluble = comprasCon("periodoNoResoluble");
    // OTRO_CICLO es informativo: abono fuera de la ventana de una compra de este
    // ciclo, o abono de la ventana cuya compra de Comida pertenece a otro ciclo.
    const comidaPurchaseOutside = (compra: string) => {
      const row = db
        .query(
          `SELECT m.origen,m.tipo,m.anulado,s.control FROM movimientos m
           JOIN saldos s ON s.id=m.origen WHERE m.id=?`,
        )
        .get(compra) as
        | { origen: string; tipo: string; anulado: number; control: string }
        | null;
      return (
        !!row &&
        row.tipo === "Gasto" &&
        row.anulado === 0 &&
        row.control !== "Terminal" &&
        (saldo ? row.origen === saldo : metadata.has(compra))
      );
    };
    const otroCiclo = projection.items
      .filter((i) => {
        if (!i.elegible || !i.compra) return false;
        const own = scopeSet.has(i.compra);
        const here = inWindow(i.fecha);
        if (own) return !here;
        return here && comidaPurchaseOutside(i.compra);
      })
      .map((i) => i.id);
    const devolucionesPorCausa = {
      sinVinculo,
      sinAcreditacion,
      revisar,
      compraInvalida,
      otroCiclo,
    };
    const pendingDevIds = [...sinAcreditacion, ...revisar];
    const pendingDev = pendingDevIds.map((id) => ({ id }));
    const devGap =
      pendingDev.length > 0 ||
      aggScope.cobertura !== "Completa" ||
      aggFood.exceso ||
      aggComp.exceso;
    const foodBruto = sum(food.map((p) => BigInt(p.row.importe)));
    const foodDev = aggFood.descuento;
    const compBruto = sum(comp.map((p) => BigInt(p.row.importe)));
    const compDev = aggComp.descuento;
    const netFood = foodBruto - foodDev;
    const netComp = compBruto - compDev;
    // SPEC39 §7/§8, AC-D20/AC-D23: el GRE (netFood/netComp) se reduce retroactivamente,
    // pero recursos, financiación y obligación de reposición son operativos y NO se
    // recalculan desde GRE: solo descuentan el abono recibido dentro de este ciclo.
    // Una devolución recibida en otro ciclo no altera sus recursos.
    const compDevOp = sum(
      ofScope
        .filter((i) => i.elegible && compSet.has(i.compra!) && inWindow(i.fecha))
        .map((i) => i.importe),
    );
    const netCompOp = compBruto - compDevOp;
    const pending = unclassified.map((p) => p.row.id);
    const coverageFood =
      !metaOk || !devOk
        ? "Fuente de Comida no legible; cobertura no disponible."
        : pending.length === 0 && !devGap
        ? null
        : [
            pending.length
              ? `Compras sin clasificar: ${pending.join(", ")}.`
              : null,
            sinAcreditacion.length
              ? `Devoluciones sin acreditación suficiente: ${sinAcreditacion.join(", ")}.`
              : null,
            revisar.length
              ? `Devoluciones en Revisar: ${revisar.join(", ")}.`
              : null,
            comprasSinClasificacion.length
              ? `Compras de Comida con devolución sin clasificación requerida (sinClasificacion): ${comprasSinClasificacion.join(", ")}.`
              : null,
            comprasPeriodoNoResoluble.length
              ? `Compras de Comida con devolución sin periodo resoluble (periodoNoResoluble): ${comprasPeriodoNoResoluble.join(", ")}.`
              : null,
            aggFood.exceso || aggComp.exceso || aggScope.exceso
              ? "Descuento superior a la compra: gasto neto no verificable."
              : null,
          ]
            .filter((v): v is string => !!v)
            .join(" ");

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
            const raw = netCompOp - rObl.total;
            return raw > 0n ? raw : 0n;
          })()
        : null;

    const financing = (() => {
      if (!rolesOk)
        return {
          available: false as const,
          reason: "Fuente de roles de financiación no legible.",
        };
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
      // An undeclared role is a coverage gap: it is never inferred or dereferenced.
      const withRole = transfers.flatMap((r) => {
        const role = roles.get(r.id);
        return role ? [{ r, role }] : [];
      });
      const anticipo = new Map(
        (db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='movimiento_anticipo'").get()
          ? (db
              .query(
                "SELECT movimiento,referencia,rol,origen,destino,evidencia FROM movimiento_anticipo",
              )
              .all() as {
              movimiento: string;
              referencia: string;
              rol: "Adelanto" | "Devolución";
              origen: string;
              destino: string;
              evidencia: string;
            }[])
          : []
        ).map((a) => [a.movimiento, a]),
      );
      const incoherentAnticipo: string[] = [];
      const fRows = withRole.filter(
        ({ r, role }) =>
          (role.rol === "Financiación" && r.destino === saldo) ||
          (role.rol === "Devolución Anticipo" && r.origen === saldo),
      ).filter(({ r, role }) => {
        if (role.rol !== "Devolución Anticipo") return true;
        const a = anticipo.get(r.id);
        const ok =
          !!a &&
          a.rol === "Devolución" &&
          a.referencia.length > 0 &&
          a.origen === r.origen &&
          a.destino === r.destino;
        if (!ok) incoherentAnticipo.push(r.id);
        return ok;
      });
      const f = sum(
        fRows.map(({ r, role }) =>
          (role.rol === "Devolución Anticipo" ? -1n : 1n) * BigInt(r.importe),
        ),
      );
      const rCajaRows = withRole.filter(
        ({ r, role }) => role.rol === "Reposición" && r.destino === saldo,
      );
      const rCaja = sum(rCajaRows.map(({ r }) => BigInt(r.importe)));
      const d = sum(
        afectan.map((r) =>
          (r.destino === saldo ? 1n : -1n) * BigInt(r.importe),
        ),
      );
      const problems = [
        missing.length
          ? `Transferencias sin función declarada: ${missing.map((r) => r.id).join(", ")}.`
          : null,
        incoherentAnticipo.length
          ? `Devolución de Anticipo sin atribución canónica coherente: ${incoherentAnticipo.join(", ")}.`
          : null,
      ].filter((v): v is string => !!v);
      return {
        available: problems.length === 0,
        reason: problems.length ? problems.join(" ") : null,
        f,
        rCaja,
        rCajaIds: rCajaRows.map(({ r }) => r.id),
        d,
        ids: afectan.map((r) => r.id),
      };
    })();

    const obligacionEstado = (() => {
      if (!financing.available)
        return {
          estado: "No disponible" as const,
          motivo: financing.reason ?? "Cobertura no disponible.",
        };
      if (coverageFood !== null)
        return { estado: "No disponible" as const, motivo: coverageFood };
      if (netCompOp === 0n)
        return { estado: "Sin obligación acreditada" as const, motivo: "" };
      if (netCompOp < 0n)
        return {
          estado: "Parcial" as const,
          motivo: "C_n negativo: devoluciones elegibles superan el compensable bruto.",
        };
      return rObl.total >= netCompOp
        ? { estado: "Completada" as const, motivo: "" }
        : {
            estado: "Parcial" as const,
            motivo: "R_obl menor que C_n; obligación pendiente.",
          };
    })();

    const s0 = cents(ciclo.saldoInicialComida);
    const resourcesSubtotal = financing.available
      ? s0 + financing.f + financing.rCaja - netCompOp
      : null;
    const resources =
      financing.available && coverageFood === null ? resourcesSubtotal : null;
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

    const nextCycle =
      cycleMaster(db)
        .filter((c) => c.inicio > ciclo.inicio)
        .sort((a, b) => a.inicio.localeCompare(b.inicio))[0] ?? null;
    const diferencias = {
      banco: position?.difference ?? null,
      siguienteInicio: nextCycle?.inicio ?? null,
      s0Siguiente:
        nextCycle && analyticsClose !== null
          ? decimal(cents(nextCycle.saldoInicialComida) - analyticsClose)
          : null,
    };

    const bridge =
      resources !== null && financing.available && analyticsClose !== null
        ? {
            base: resources - netFood,
            other:
              financing.d -
              (financing.f +
                financing.rCaja -
                netCompOp -
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
      proveedor: {
        version: "e35-1",
        ventana: { inicio: start, corte },
        fuente: "movimientos+comida_metadata+comida_roles",
        unidad: "EUR",
        regimen: regime
          ? { saldo: regime.saldo, cobertura: regime.cobertura, estado: regime.estado }
          : null,
        huella:
          metaOk && devOk && rolesOk ? financeRevision(db) : null,
        soloLectura: true,
        cobertura:
          financing.available && coverageFood === null ? "Verificada" : "Parcial",
        motivo: financing.available ? coverageFood ?? null : financing.reason,
        bloqueo: {
          requerido: true,
          verificable: financing.available && coverageFood === null,
          motivo: financing.available ? coverageFood ?? null : financing.reason,
        },
      },
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
          ...(comprasSinClasificacion.length
            ? [`Compras de Comida con devolución sin clasificación requerida (sinClasificacion): ${comprasSinClasificacion.join(", ")}.`]
            : []),
          ...(comprasPeriodoNoResoluble.length
            ? [`Compras de Comida con devolución sin periodo resoluble (periodoNoResoluble): ${comprasPeriodoNoResoluble.join(", ")}.`]
            : []),
          ...(aggFood.exceso || aggComp.exceso || aggScope.exceso
            ? ["Descuento superior a la compra: gasto neto no verificable."]
            : []),
          ...(!financing.available ? [financing.reason] : []),
        ],
        sinClasificar: pending,
        devolucionesPendientes: pendingDev.map((r) => r.id),
      },
      // Advertencia de integridad, separada de la cobertura económica (SPEC39 §3.3,
      // AC-D21): un abono sin compra válida no netea ni degrada Comida, pero se avisa.
      // Informativa: no bloquea precierre ni cierre; su tratamiento en precierre queda
      // para F4 (sin nuevo bloqueo automático).
      integridad: {
        advertencia:
          sinVinculo.length || compraInvalida.length
            ? `Devoluciones sin compra válida, no atribuibles a Comida: ${[...sinVinculo, ...compraInvalida].join(", ")}. No netean ni degradan la cobertura económica de Comida; requieren revisión en Movimientos.`
            : null,
        ids: [...sinVinculo, ...compraInvalida],
        bloquea: false as const,
      },
      compras: {
        bruto: metric(
          foodBruto,
          pending.length ? coverageFood : null,
          food.map((p) => p.row.id),
        ),
        devoluciones: metric(
          foodDev,
          devGap ? coverageFood : null,
          eligibleFoodIds,
        ),
        neto: metric(
          aggFood.exceso ? null : netFood,
          coverageFood,
          food.map((p) => p.row.id),
          aggFood.exceso,
        ),
      },
      compensable: {
        bruto: metric(
          compBruto,
          pending.length ? coverageFood : null,
          comp.map((p) => p.row.id),
        ),
        devoluciones: metric(
          compDev,
          devGap ? coverageFood : null,
          eligibleCompIds,
        ),
        neto: metric(
          aggComp.exceso ? null : netComp,
          coverageFood,
          comp.map((p) => p.row.id),
          aggComp.exceso,
        ),
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
      obligacion: {
        ...obligacionEstado,
        cn: decimal(netCompOp),
        robl: decimal(rObl.total),
        falta: falta === null ? null : decimal(falta),
        ids: rObl.ids,
      },
      recursos: metric(
        resources,
        financing.available ? coverageFood : financing.reason,
        [...pending, ...pendingDevIds],
        coverageFood !== null && resourcesSubtotal !== null,
        resourcesSubtotal,
      ),
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
      diferencias,
      devoluciones: devolucionesPorCausa,
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
