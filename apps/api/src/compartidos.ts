import type { Database } from "bun:sqlite";
import { decimal, Problem } from "./saldos";
import { getClassification } from "./clasificacion";
import { fingerprint, ledgerRows, type LedgerRow } from "./movement-ledger";
import { getReference } from "./reference-rules";
import { createReference } from "./referencias";

export type RolParticipante = "Titular" | "Tercero";
export type ParticipanteCompartido = {
  id: string;
  referencia: string;
  nombre: string;
  rol: RolParticipante;
  partes: number;
  estado: "Activa" | "Baja";
  revision: number;
  creado: string;
  actualizado: string;
};
export type FichaCompartido = {
  referencia: string;
  revision: number;
  creado: string;
  actualizado: string;
};
export type MetricaEstado =
  | "Verificada"
  | "Parcial"
  | "No disponible"
  | "No aplica";
export type Metrica = {
  valor: string | null;
  subtotal: string | null;
  estado: MetricaEstado;
  motivo: string;
  fuente: string;
  cobertura: string;
};
export type GastoEvaluado = {
  id: string;
  fecha: string;
  importe: string;
  importeCents: bigint;
  partida: { id: string; nombre: string } | null;
  valido: boolean;
  anulado: boolean;
  motivo: string | null;
  revision: number;
  saldoPagador: { id: string; nombre: string } | null;
};
type GastoBase = {
  id: string;
  fecha: string;
  importe: string;
  importeCents: bigint;
  partida: { id: string; nombre: string } | null;
  valido: boolean;
  anulado: boolean;
  motivo: string | null;
};

const metric = (
  valor: string | null,
  estado: MetricaEstado,
  motivo: string,
  cobertura: MetricaEstado | "Sin repartir" = estado,
  subtotal: string | null = null,
): Metrica => ({
  valor,
  subtotal,
  estado,
  motivo,
  fuente: "Motor central Compartidos (base B)",
  cobertura,
});

export type RepartoParticipante = {
  id: string;
  nombre: string;
  rol: RolParticipante;
  partes: number;
  estado: "Activa" | "Baja";
  asignado: Metrica;
  aportado: Metrica;
  pendiente: Metrica;
  exceso: Metrica;
  costePropio: Metrica | null;
};
export type RepartoGasto = {
  id: string;
  fecha: string;
  importe: string;
  partida: { id: string; nombre: string } | null;
  valido: boolean;
  anulado: boolean;
  motivo: string | null;
  asignaciones: { participanteId: string; importe: string | null }[];
  recuperado: Metrica;
  neto: Metrica;
};
export type RepartoPartida = {
  id: string;
  nombre: string;
  bruto: string;
  gastos: string[];
  neto: Metrica;
};
export type RepartoCalculado = {
  repartoValido: boolean;
  motivoReparto: string | null;
  bruto: Metrica;
  recuperado: Metrica;
  neto: Metrica;
  costePropio: Metrica;
  pendienteTerceros: Metrica;
  exceso: Metrica;
  cobertura: { estado: MetricaEstado; motivo: string };
  estado: "Sin repartir" | "Reparto parcial" | "Cerrado" | "Revisar";
  estadoReparto: "Sin repartir" | "Reparto parcial" | "Cerrado";
  puedeCerrar: boolean;
  hayTercerosConCuota: boolean;
  alertas: {
    tipo: "revisar" | "cobertura" | "exceso";
    participanteId?: string;
    gastoId?: string;
    importe?: string;
    motivo: string;
  }[];
  fechas: {
    ultimoGasto: string | null;
    ultimaAportacion: string | null;
    repartoSoportado: string | null;
    exceso: string | null;
    motivos: Record<string, string>;
  };
  brutoCents: bigint;
  asignadoTotal: Map<string, bigint>;
  participantes: RepartoParticipante[];
  gastos: RepartoGasto[];
  partidas: RepartoPartida[];
};

/** F4/D3 exact quota sharing: floor, largest remainder, stable ID tie-break. */
export function cuotasExactas(
  importeCents: bigint,
  participantes: { id: string; partes: number }[],
  totalPartes: bigint,
) {
  const bases = participantes.map((p) => {
    const weight = BigInt(p.partes);
    return {
      id: p.id,
      base: (importeCents * weight) / totalPartes,
      resto: (importeCents * weight) % totalPartes,
    };
  });
  let residual =
    importeCents - bases.reduce((sum, b) => sum + b.base, 0n);
  const order = [...bases].sort(
    (a, b) => (a.resto === b.resto ? (a.id < b.id ? -1 : 1) : a.resto > b.resto ? -1 : 1),
  );
  const result = new Map<string, bigint>(bases.map((b) => [b.id, b.base]));
  for (const b of order) {
    if (residual <= 0n) break;
    result.set(b.id, result.get(b.id)! + 1n);
    residual -= 1n;
  }
  return result;
}

/** Pure base-B engine. No contribution source exists here by design (D5 disabled). */
export function calcularReparto(
  participantes: Omit<
    ParticipanteCompartido,
    "referencia" | "creado" | "actualizado" | "revision"
  >[],
  gastos: GastoBase[],
): RepartoCalculado {
  const activos = participantes.filter((p) => p.estado === "Activa");
  const totalPartes = activos.reduce((sum, p) => sum + BigInt(p.partes), 0n);
  const elegibles = gastos.filter((g) => !g.anulado && g.valido);
  const incidencias = gastos.filter((g) => !g.anulado && !g.valido);
  const brutoCents = elegibles.reduce((sum, g) => sum + g.importeCents, 0n);
  const titular = activos.find((p) => p.rol === "Titular") ?? null;
  const repartoValido =
    activos.length > 0 && totalPartes > 0n && brutoCents > 0n && !!titular;
  const motivoReparto = !activos.length
    ? "Sin participantes activos."
    : totalPartes === 0n
      ? "Sin partes válidas: define al menos una parte mayor que cero."
      : !titular
        ? "Sin Titular activo: no se puede acreditar el coste propio exigido por F3."
        : brutoCents === 0n
          ? "Sin Gastos elegibles verificables."
          : null;

  const asignadoTotal = new Map<string, bigint>(
    activos.map((p) => [p.id, 0n]),
  );
  const porGasto = new Map<string, Map<string, bigint>>();
  if (repartoValido)
    for (const g of elegibles) {
      const cuotas = cuotasExactas(
        g.importeCents,
        activos.map((p) => ({ id: p.id, partes: p.partes })),
        totalPartes,
      );
      porGasto.set(g.id, cuotas);
      for (const [id, value] of cuotas)
        asignadoTotal.set(id, asignadoTotal.get(id)! + value);
    }

  const asignadoTitular = titular ? (asignadoTotal.get(titular.id) ?? 0n) : null;
  const tercerosConCuota = activos.some(
    (p) => p.rol === "Tercero" && (asignadoTotal.get(p.id) ?? 0n) > 0n,
  );
  const brutoDecimal = decimal(brutoCents.toString())!;
  const costePropioDecimal =
    asignadoTitular === null ? null : decimal(asignadoTitular.toString())!;

  const bruto: Metrica = !elegibles.length && !incidencias.length
    ? metric(
        null,
        "No disponible",
        "Sin Gastos elegibles; la ausencia no se convierte en 0,00.",
        "Sin repartir",
      )
    : incidencias.length
      ? metric(
          null,
          "Parcial",
          `${incidencias.length} Gasto(s) con incidencia de cobertura; solo se muestra el subtotal acreditado.`,
          "Parcial",
          brutoDecimal,
        )
      : metric(brutoDecimal, "Verificada", "Suma exacta de Gastos CAT013 elegibles.");

  const recuperado: Metrica = tercerosConCuota
    ? metric(
        null,
        "No disponible",
        "No disponible — D5 no habilitado: no existe fuente de aportaciones de terceros.",
        "No disponible",
      )
    : metric(
        null,
        "No aplica",
        "Sin terceros con cuota asignada; no hay recuperación que acreditar.",
        "No aplica",
      );

  const neto: Metrica = !repartoValido
    ? metric(
        null,
        "No disponible",
        motivoReparto ?? "Sin reparto válido.",
        "Sin repartir",
      )
    : incidencias.length
      ? metric(
          null,
          "Parcial",
          "Cobertura comprometida por una incidencia; Neto no se presenta como completo.",
          "Parcial",
          brutoDecimal,
        )
      : tercerosConCuota
        ? metric(
            null,
            "No disponible",
            "Depende del Recuperado; D5 no habilitado.",
            "No disponible",
          )
        : metric(
            brutoDecimal,
            "Verificada",
            "Sin terceros con cuota: Neto = Bruto y coincide con el coste propio (F1/F3).",
            "Verificada",
          );

  const costePropio: Metrica = !repartoValido
    ? metric(
        null,
        "No disponible",
        motivoReparto ?? "Sin reparto válido.",
        "Sin repartir",
      )
    : incidencias.length
      ? metric(
          null,
          "Parcial",
          "Cobertura comprometida; coste propio solo como subtotal acreditado.",
          "Parcial",
          costePropioDecimal,
        )
      : titular
        ? metric(
            costePropioDecimal!,
            "Verificada",
            "Asignado al Titular; coste propio sin aportación exigible (F3).",
            "Verificada",
          )
        : metric(
            null,
            "No disponible",
            "Sin Titular activo en el reparto.",
            "Sin repartir",
          );

  const pendienteTerceros: Metrica = !repartoValido
    ? metric(
        null,
        "No disponible",
        motivoReparto ?? "Sin reparto válido.",
        "Sin repartir",
      )
    : tercerosConCuota
      ? metric(
          null,
          "No disponible",
          "Requiere Aportado acreditado; D5 no habilitado. No se presenta Asignado como pendiente verificado.",
          "No disponible",
        )
      : metric(
          null,
          "No aplica",
          "Sin terceros con cuota asignada.",
          "No aplica",
        );

  const exceso: Metrica = tercerosConCuota
    ? metric(
        null,
        "No disponible",
        "Requiere Aportado acreditado; D5 no habilitado. Nunca 0,00 verificado por ausencia de fuente.",
        "No disponible",
      )
    : metric(
        null,
        "No aplica",
        "Sin terceros con cuota o sin fuente de aportaciones que pueda exceder.",
        "No aplica",
      );

  const cobertura = incidencias.length
    ? {
        estado: "Parcial" as MetricaEstado,
        motivo: "Cobertura del Bruto comprometida; revisa los Gastos señalados.",
      }
    : tercerosConCuota
      ? {
          estado: "No disponible" as MetricaEstado,
          motivo: "Cobertura de aportaciones no verificable: D5 no habilitado.",
        }
      : {
          estado: "No aplica" as MetricaEstado,
          motivo: "Sin terceros con cuota; no hay cobertura de aportaciones que verificar.",
        };

  const estado: RepartoCalculado["estado"] = !repartoValido
    ? "Sin repartir"
    : incidencias.length
      ? "Revisar"
      : tercerosConCuota
        ? "Reparto parcial"
        : "Cerrado";
  const estadoReparto: RepartoCalculado["estadoReparto"] = !repartoValido
    ? "Sin repartir"
    : tercerosConCuota
      ? "Reparto parcial"
      : "Cerrado";
  const alertas: RepartoCalculado["alertas"] = incidencias.map((g) => ({
    tipo: "revisar",
    gastoId: g.id,
    motivo:
      `Movimiento ${g.id} · ${g.motivo ?? "importe incompatible"} · Revisar: bloquea Cerrado y compromete Bruto/Neto.`,
  }));
  if (tercerosConCuota)
    alertas.push({
      tipo: "cobertura",
      motivo:
        "Cobertura de aportaciones no disponible — D5 no habilitado. No se declara Cerrado con terceros con cuota.",
    });
  if (repartoValido && !titular)
    alertas.push({
      tipo: "revisar",
      motivo:
        "Sin Titular activo: no se puede acreditar el coste propio exigido por F3.",
    });

  const gastosDto: RepartoGasto[] = gastos.map((g) => {
    const cuotas = porGasto.get(g.id) ?? null;
    const asignaciones = activos.map((p) => ({
      participanteId: p.id,
      importe: cuotas ? decimal(cuotas.get(p.id)!.toString()) : null,
    }));
    const netoGasto: Metrica = g.anulado
      ? metric(null, "No aplica", "Gasto anulado: no computa.", "No aplica")
      : !g.valido
        ? metric(
            null,
            "Parcial",
            "Gasto con incidencia de cobertura; no computa en el Bruto.",
            "Parcial",
          )
        : !repartoValido
          ? metric(
              null,
              "No disponible",
              motivoReparto ?? "Sin reparto válido.",
              "Sin repartir",
            )
          : tercerosConCuota
            ? metric(
                null,
                "No disponible",
                "Neto por Gasto depende del Recuperado atribuido; D5 no habilitado.",
                "No disponible",
              )
            : metric(
                g.importe,
                "Verificada",
                "Sin Recuperado de terceros: Neto por Gasto = Bruto del Gasto.",
                "Verificada",
              );
    return {
      id: g.id,
      fecha: g.fecha,
      importe: g.importe,
      partida: g.partida,
      valido: g.valido,
      anulado: g.anulado,
      motivo: g.motivo,
      asignaciones,
      recuperado: metric(
        null,
        tercerosConCuota ? "No disponible" : "No aplica",
        tercerosConCuota
          ? "Recuperado atribuido por Gasto no disponible; D5 no habilitado."
          : "Sin terceros con cuota asignada.",
      ),
      neto: netoGasto,
    };
  });

  const partidaIds = [
    ...new Set(elegibles.map((g) => g.partida?.id ?? "SIN_PARTIDA")),
  ];
  const partidas: RepartoPartida[] = partidaIds.map((id) => {
    const items = elegibles.filter((g) => (g.partida?.id ?? "SIN_PARTIDA") === id);
    const total = items.reduce((sum, g) => sum + g.importeCents, 0n);
    const nombre =
      items.find((g) => g.partida)?.partida?.nombre ??
      "Partida no disponible en el Gasto";
    const netoPartida: Metrica =
      !repartoValido
        ? metric(
            null,
            "No disponible",
            motivoReparto ?? "Sin reparto válido.",
            "Sin repartir",
          )
        : incidencias.length
          ? metric(
              null,
              "Parcial",
              "Cobertura comprometida; Neto por Partida parcial.",
              "Parcial",
              decimal(total.toString())!,
            )
          : tercerosConCuota
            ? metric(
                null,
                "No disponible",
                "Neto por Partida depende del Recuperado atribuido; D5 no habilitado.",
                "No disponible",
              )
            : metric(
                decimal(total.toString())!,
                "Verificada",
                "Suma de Netos de sus Gastos sin Recuperado de terceros.",
                "Verificada",
              );
    return {
      id,
      nombre,
      bruto: decimal(total.toString())!,
      gastos: items.map((g) => g.id),
      neto: netoPartida,
    };
  });

  const participantesDto: RepartoParticipante[] = participantes.map((p) => {
    const asignadoCents = p.estado === "Activa" ? asignadoTotal.get(p.id) : null;
    const activo = p.estado === "Activa";
    const asignado: Metrica = !activo
      ? metric(
          null,
          "No aplica",
          "Participante de baja lógica: conserva su historia y no computa.",
          "No aplica",
        )
      : !repartoValido
        ? metric(
            null,
            "No disponible",
            motivoReparto ?? "Sin reparto válido.",
            "Sin repartir",
          )
        : metric(
            decimal(asignadoCents!.toString())!,
            incidencias.length ? "Parcial" : "Verificada",
            incidencias.length
              ? "Reparto calculado sobre subtotal acreditado; cobertura parcial."
              : "Cuota exacta del reparto por Gasto/Partida.",
            incidencias.length ? "Parcial" : "Verificada",
          );
    const esTitular = p.rol === "Titular";
    const cero = asignadoCents === 0n;
    const pendiente: Metrica = !activo
      ? metric(null, "No aplica", "Participante de baja lógica.", "No aplica")
      : !repartoValido
        ? metric(
            null,
            "No disponible",
            "Sin reparto válido; no se fabrica un pendiente.",
            "Sin repartir",
          )
        : esTitular
          ? metric(
              "0.00",
              "Verificada",
              "Pendiente estructural del Titular: su coste propio no es aportación exigible (F3).",
              "Verificada",
            )
          : cero
            ? metric(
                null,
                "No aplica",
                "Tercero sin cuota asignada positiva.",
                "No aplica",
              )
            : metric(
                null,
                "No disponible",
                "Pendiente de tercero no disponible: requiere Aportado y D5 no está habilitado.",
                "No disponible",
              );
    const aportado: Metrica = !activo
      ? metric(null, "No aplica", "Participante de baja lógica.", "No aplica")
      : esTitular
        ? metric(
            null,
            "No aplica",
            "El Titular no tiene aportación exigible ni recuperación que acreditar.",
            "No aplica",
          )
        : metric(
            null,
            "No disponible",
            "Aportaciones de terceros no disponibles: D5 no habilitado.",
            "No disponible",
          );
    const exceso: Metrica = !activo
      ? metric(null, "No aplica", "Participante de baja lógica.", "No aplica")
      : esTitular || cero
        ? metric(
            null,
            "No aplica",
            "Sin aportación exigible o sin cuota asignada positiva.",
            "No aplica",
          )
        : metric(
            null,
            "No disponible",
            "Exceso de tercero no disponible: requiere Aportado; nunca 0,00 por ausencia.",
            "No disponible",
          );
    return {
      id: p.id,
      nombre: p.nombre,
      rol: p.rol,
      partes: p.partes,
      estado: p.estado,
      asignado,
      aportado,
      pendiente,
      exceso,
      costePropio: esTitular && activo ? asignado : null,
    };
  });

  const ultimoGasto =
    elegibles
      .map((g) => g.fecha)
      .sort()
      .at(-1) ?? null;
  return {
    repartoValido,
    motivoReparto,
    bruto,
    recuperado,
    neto,
    costePropio,
    pendienteTerceros,
    exceso,
    cobertura,
    estado,
    estadoReparto,
    puedeCerrar: repartoValido && !incidencias.length && !tercerosConCuota,
    hayTercerosConCuota: tercerosConCuota,
    alertas,
    fechas: {
      ultimoGasto,
      ultimaAportacion: null,
      repartoSoportado: null,
      exceso: null,
      motivos: {
        ultimaAportacion: "No disponible — D5 no habilitado.",
        repartoSoportado: "No disponible — D5 no habilitado.",
        exceso: "No aplica — sin fuente de aportaciones.",
      },
    },
    brutoCents,
    asignadoTotal,
    participantes: participantesDto,
    gastos: gastosDto,
    partidas,
  };
}

type CompartidoRow = {
  referencia: string;
  revision: number;
  creado: string;
  actualizado: string;
};
type AuditRow = {
  id: number;
  referencia: string;
  accion: string;
  anterior: string | null;
  posterior: string;
  motivo: string | null;
  instante: string;
  actor: string;
};
function installed(db: Database) {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE name='fichas_compartidos'")
    .get();
}
function ficha(db: Database, referencia: string) {
  if (!installed(db))
    throw new Problem(404, "NOT_FOUND", "Ficha compartida no disponible.");
  const ref = getReference(db, referencia);
  const row = db
    .query("SELECT * FROM fichas_compartidos WHERE referencia=?")
    .get(referencia) as CompartidoRow | null;
  if (!row || ref.tipo !== "Gasto compartido")
    throw new Problem(404, "NOT_FOUND", "Ficha compartida no encontrada.");
  return { row, ref };
}
function participantes(db: Database, referencia: string) {
  return db
    .query(
      "SELECT * FROM participantes_compartido WHERE referencia=? ORDER BY length(id),id",
    )
    .all(referencia) as ParticipanteCompartido[];
}
function evaluateGastos(db: Database, referencia: string): GastoEvaluado[] {
  return ledgerRows(db)
    .filter((r) => r.tipo === "Gasto" && r.referencia === referencia)
    .map((r) => {
      let partida: { id: string; nombre: string } | null = null;
      let categoria: string | null = null;
      if (r.partida) {
        try {
          const p = getClassification(db, "partidas", r.partida);
          partida = { id: p.id, nombre: p.nombre };
          categoria = p.categoria?.id ?? null;
        } catch {}
      }
      const importeCents = BigInt(r.importe);
      const anulado = r.anulado === 1;
      const motivo = anulado
        ? "Anulado: conservado en historia, no computa."
        : !partida
          ? "Partida ausente o no verificable."
          : importeCents <= 0n
            ? "Importe inválido: no se computa ni se convierte en devolución."
            : categoria !== "CAT013"
              ? "Gasto con Referencia compartida fuera de CAT013; enlace incompatible."
              : null;
      const origen = db
        .query("SELECT id,nombre FROM saldos WHERE id=?")
        .get(r.origen) as { id: string; nombre: string } | null;
      return {
        id: r.id,
        fecha: r.fecha,
        importe: decimal(importeCents)!,
        importeCents,
        partida,
        valido: motivo === null,
        anulado,
        motivo,
        revision: r.revision,
        saldoPagador: origen,
      };
    });
}
function applied(
  rows: ParticipanteCompartido[],
  override?: {
    id: string;
    cambios: Partial<Pick<ParticipanteCompartido, "nombre" | "rol" | "partes">>;
  },
) {
  return rows.map((p) =>
    override?.id === p.id ? { ...p, ...override.cambios } : p,
  );
}
function baseGastos(gastos: GastoEvaluado[]): GastoBase[] {
  return gastos.map((g) => ({
    id: g.id,
    fecha: g.fecha,
    importe: g.importe,
    importeCents: g.importeCents,
    partida: g.partida,
    valido: g.valido,
    anulado: g.anulado,
    motivo: g.motivo,
  }));
}
function related(db: Database, referencia: string, gastos: GastoEvaluado[]) {
  const gastoIds = new Set(gastos.map((g) => g.id));
  return ledgerRows(db)
    .filter((r) => r.referencia === referencia && !gastoIds.has(r.id))
    .map((r) => ({
      id: r.id,
      fecha: r.fecha,
      tipo: r.tipo,
      importe: decimal(r.importe)!,
      origen: r.origen,
      destino: r.destino,
      anulado: r.anulado === 1,
      computaEnBruto: false,
      motivo:
        r.tipo === "Transferencia"
          ? "Movimiento interno con la Referencia del caso: conserva su efecto bancario y no acredita Recuperado."
          : "No es un Gasto CAT013: no computa en el Bruto.",
    }));
}
function contexto(
  db: Database,
  ref: { id: string; revision: number; estado: string; tipo: string },
  fichaRow: CompartidoRow,
  rows: ParticipanteCompartido[],
) {
  return fingerprint([
    ref,
    fichaRow,
    rows,
    ledgerRows(db)
      .filter((r) => r.referencia === ref.id)
      .map((r: LedgerRow) => [
        r.id,
        r.tipo,
        r.fecha,
        r.importe,
        r.anulado,
        r.revision,
        r.partida,
      ]),
  ]);
}
function readCase(
  db: Database,
  referencia: string,
  override?: {
    id: string;
    cambios: Partial<Pick<ParticipanteCompartido, "nombre" | "rol" | "partes">>;
  },
) {
  const { row: fichaRow, ref } = ficha(db, referencia);
  const rows = applied(participantes(db, referencia), override);
  const gastos = evaluateGastos(db, referencia);
  const calculo = calcularReparto(rows, baseGastos(gastos));
  return {
    referencia: ref,
    ficha: fichaRow,
    contexto: contexto(db, ref, fichaRow, rows),
    participantes: rows,
    gastos,
    relacionados: related(db, referencia, gastos),
    calculo,
    historia: db
      .query("SELECT * FROM compartido_audit WHERE referencia=? ORDER BY id DESC")
      .all(referencia)
      .map((h) => {
        const a = h as AuditRow;
        return {
          ...a,
          anterior: a.anterior ? JSON.parse(a.anterior) : null,
          posterior: JSON.parse(a.posterior),
        };
      }),
  };
}
export function getCompartido(db: Database, referencia: string) {
  return db.transaction(() => {
    const data = readCase(db, referencia);
    return {
      referencia: data.referencia,
      ficha: data.ficha,
      contexto: data.contexto,
      resumen: {
        bruto: data.calculo.bruto,
        recuperado: data.calculo.recuperado,
        neto: data.calculo.neto,
        costePropio: data.calculo.costePropio,
        pendienteTerceros: data.calculo.pendienteTerceros,
        exceso: data.calculo.exceso,
        cobertura: data.calculo.cobertura,
        estado: data.calculo.estado,
        estadoReparto: data.calculo.estadoReparto,
        puedeCerrar: data.calculo.puedeCerrar,
        hayTercerosConCuota: data.calculo.hayTercerosConCuota,
        alertas: data.calculo.alertas,
        fechas: data.calculo.fechas,
        d5: "No habilitado: sin aportaciones de terceros, Recuperado, Exceso ni atribución por Gasto.",
      },
      participantes: data.calculo.participantes.map((p) => {
        const row = data.participantes.find((x) => x.id === p.id)!;
        return {
          ...p,
          creado: row.creado,
          actualizado: row.actualizado,
          revision: row.revision,
        };
      }),
      gastos: data.calculo.gastos.map((g) => {
        const row = data.gastos.find((x) => x.id === g.id)!;
        return {
          ...g,
          revision: row.revision,
          saldoPagador: row.saldoPagador,
          computaEnBruto: row.valido && !row.anulado,
        };
      }),
      partidas: data.calculo.partidas,
      relacionados: data.relacionados,
      historia: data.historia,
    };
  })();
}
export type CompartidoDTO = ReturnType<typeof getCompartido>;

export function listCompartidos(
  db: Database,
  params = new URLSearchParams(),
) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
      throw new Problem(422, "VALIDATION", "Página inválida.");
    const ids = db
      .query("SELECT referencia FROM fichas_compartidos ORDER BY referencia")
      .all() as { referencia: string }[];
    return {
      items: ids
        .slice((page - 1) * 100, page * 100)
        .map((x) => getCompartido(db, x.referencia)),
      total: ids.length,
      page,
    };
  })();
}

function attempt<T>(
  db: Database,
  action: string,
  body: Record<string, unknown>,
  key: string,
  now: number,
  run: () => T,
): T {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
  return db
    .transaction(() => {
      const hash = fingerprint([action, body]),
        retry = db
          .query("SELECT * FROM compartido_attempts WHERE key=? AND expires>=?")
          .get(key, now) as { hash: string; response: string } | null;
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
      db.run("DELETE FROM compartido_attempts WHERE key=? OR expires<?", [
        key,
        now,
      ]);
      db.run("INSERT INTO compartido_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(result),
        now + 86400000,
      ]);
      return result;
    })
    .immediate();
}
function name(value: unknown, field = "nombre") {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 120 ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Nombre obligatorio, máximo 120 caracteres, sin caracteres de control.",
      { [field]: "Indica un nombre válido." },
    );
  return value.trim();
}
function parts(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 1000000
  )
    throw new Problem(422, "VALIDATION", "Partes enteras entre 0 y 1000000.", {
      partes: "Indica un número entero de partes.",
    });
  return value;
}
function role(value: unknown) {
  if (value !== "Titular" && value !== "Tercero")
    throw new Problem(422, "VALIDATION", "Rol inválido.", {
      rol: "Selecciona Titular o Tercero.",
    });
  return value;
}
function allowed(body: Record<string, unknown>, keys: string[]) {
  for (const key of Object.keys(body))
    if (!keys.includes(key))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`);
}
function participantChanges(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Problem(422, "VALIDATION", "Se requieren cambios.", {
      cambios: "Indica al menos un cambio.",
    });
  const body = value as Record<string, unknown>;
  allowed(body, ["nombre", "rol", "partes"]);
  if (!Object.keys(body).length)
    throw new Problem(422, "VALIDATION", "Se requieren cambios.", {
      cambios: "Indica al menos un cambio.",
    });
  return {
    ...("nombre" in body ? { nombre: name(body.nombre) } : {}),
    ...("rol" in body ? { rol: role(body.rol) } : {}),
    ...("partes" in body ? { partes: parts(body.partes) } : {}),
  } as Partial<Pick<ParticipanteCompartido, "nombre" | "rol" | "partes">>;
}
function audit(
  db: Database,
  referencia: string,
  accion: string,
  before: unknown,
  after: unknown,
  motive: string | null,
  now: number,
) {
  db.run(
    "INSERT INTO compartido_audit(referencia,accion,anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,'usuario-unico')",
    [
      referencia,
      accion,
      before === null ? null : JSON.stringify(before),
      JSON.stringify(after),
      motive,
      new Date(now).toISOString(),
    ],
  );
}
function bumpFicha(db: Database, referencia: string, now: number) {
  db.run(
    "UPDATE fichas_compartidos SET revision=revision+1, actualizado=? WHERE referencia=?",
    [new Date(now).toISOString(), referencia],
  );
}
function assertTitularUnique(
  rows: ParticipanteCompartido[],
  candidate: { id?: string; rol: RolParticipante; estado: "Activa" | "Baja" },
) {
  if (candidate.rol !== "Titular" || candidate.estado !== "Activa") return;
  if (rows.some((p) => p.rol === "Titular" && p.estado === "Activa" && p.id !== candidate.id))
    throw new Problem(
      422,
      "TITULAR_UNIQUE",
      "Solo puede existir un Titular activo por ficha.",
      { rol: "Convierte antes al Titular actual en Tercero." },
    );
}

export function createCompartido(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  return attempt(db, "compartido:alta", body, key, now, () => {
    allowed(body, ["nombre"]);
    const nombre = name(body.nombre);
    const ref = createReference(
      db,
      { nombre, tipo: "Gasto compartido" },
      key,
      now,
    );
    return getCompartido(db, ref.id);
  });
}

export function createParticipante(
  db: Database,
  referencia: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  return attempt(db, "compartido:participante:alta:" + referencia, body, key, now, () => {
    allowed(body, ["nombre", "rol", "partes"]);
    const nombre = name(body.nombre),
      rol = role(body.rol),
      partes = parts(body.partes);
    const { row, ref } = ficha(db, referencia);
    if (ref.estado !== "Activa")
      throw new Problem(
        422,
        "INACTIVE_REFERENCE",
        "No se admiten nuevos participantes en una Referencia inactiva.",
      );
    const rows = participantes(db, referencia);
    assertTitularUnique(rows, { rol, estado: "Activa" });
    const n = db
      .query(
        "UPDATE counters SET next=next+1 WHERE name='participantes_compartido' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
      )
      .get() as { n: string } | null;
    if (!n)
      throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
    const id = "CP" + n.n.padStart(3, "0"),
      time = new Date(now).toISOString();
    db.run(
      "INSERT INTO participantes_compartido VALUES(?,?,?,?,?,'Activa',1,?,?)",
      [id, referencia, nombre, rol, partes, time, time],
    );
    bumpFicha(db, referencia, now);
    audit(
      db,
      referencia,
      "alta participante",
      null,
      { id, nombre, rol, partes, estado: "Activa", revision: 1 },
      null,
      now,
    );
    void row;
    return getCompartido(db, referencia);
  });
}

function participantPlan(
  db: Database,
  referencia: string,
  id: string,
  body: Record<string, unknown>,
) {
  allowed(body, ["revision", "cambios"]);
  const { row } = ficha(db, referencia);
  const rows = participantes(db, referencia),
    current = rows.find((p) => p.id === id);
  if (!current)
    throw new Problem(404, "NOT_FOUND", "Participante no encontrado.");
  if (current.estado !== "Activa")
    throw new Problem(
      409,
      "PARTICIPANTE_BAJA",
      "El participante está de baja lógica; conserva su historia.",
    );
  if (body.revision !== current.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El participante ha cambiado. Revisa su ficha actual.",
    );
  const cambios = participantChanges(body.cambios);
  const next = { ...current, ...cambios };
  assertTitularUnique(rows, next);
  const before = readCase(db, referencia);
  const after = readCase(db, referencia, { id, cambios });
  return {
    row,
    current,
    cambios,
    before,
    after,
    fingerprint: fingerprint([
      before.contexto,
      id,
      current.revision,
      cambios,
    ]),
  };
}
export function previewParticipante(
  db: Database,
  referencia: string,
  id: string,
  body: Record<string, unknown>,
) {
  return db.transaction(() => {
    const p = participantPlan(db, referencia, id, body);
    const summary = (c: RepartoCalculado) => ({
      bruto: c.bruto,
      recuperado: c.recuperado,
      neto: c.neto,
      costePropio: c.costePropio,
      pendienteTerceros: c.pendienteTerceros,
      exceso: c.exceso,
      cobertura: c.cobertura,
      estado: c.estado,
      estadoReparto: c.estadoReparto,
      puedeCerrar: c.puedeCerrar,
      alertas: c.alertas,
    });
    return {
      contexto: p.before.contexto,
      revision: p.current.revision,
      participante: {
        antes: p.current,
        despues: p.after.participantes.find((x) => x.id === id),
      },
      impacto: {
        antes: {
          resumen: summary(p.before.calculo),
          asignado: p.before.calculo.participantes.find((x) => x.id === id),
        },
        despues: {
          resumen: summary(p.after.calculo),
          asignado: p.after.calculo.participantes.find((x) => x.id === id),
        },
      },
      fingerprint: p.fingerprint,
    };
  })();
}
export function rectificarParticipante(
  db: Database,
  referencia: string,
  id: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  return attempt(
    db,
    "compartido:participante:rectificar:" + referencia + ":" + id,
    body,
    key,
    now,
    () => {
      allowed(body, ["revision", "cambios", "fingerprint", "motivo"]);
      const plan = participantPlan(db, referencia, id, {
        revision: body.revision,
        cambios: body.cambios,
      });
      if (body.fingerprint !== plan.fingerprint)
        throw new Problem(
          409,
          "IMPACT_CHANGED",
          "El contexto ha cambiado. Revisa otra vista de impacto; se conserva tu borrador.",
        );
      const repartoChange =
        "rol" in plan.cambios || "partes" in plan.cambios;
      const motive =
        typeof body.motivo === "string" ? body.motivo.trim() : "";
      if (repartoChange && !motive)
        throw new Problem(
          422,
          "VALIDATION",
          "Indica el motivo del cambio de reparto.",
          { motivo: "Motivo obligatorio." },
        );
      const next = {
        ...plan.current,
        ...plan.cambios,
        revision: plan.current.revision + 1,
      };
      db.run(
        "UPDATE participantes_compartido SET nombre=?,rol=?,partes=?,revision=revision+1,actualizado=? WHERE id=? AND revision=?",
        [
          next.nombre,
          next.rol,
          next.partes,
          new Date(now).toISOString(),
          id,
          plan.current.revision,
        ],
      );
      bumpFicha(db, referencia, now);
      audit(
        db,
        referencia,
        "rectificar participante",
        plan.current,
        next,
        motive || null,
        now,
      );
      return getCompartido(db, referencia);
    },
  );
}

export function bajaParticipante(
  db: Database,
  referencia: string,
  id: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  return attempt(
    db,
    "compartido:participante:baja:" + referencia + ":" + id,
    body,
    key,
    now,
    () => {
      allowed(body, ["revision", "motivo"]);
      const rows = participantes(db, referencia),
        current = rows.find((p) => p.id === id);
      if (!current)
        throw new Problem(404, "NOT_FOUND", "Participante no encontrado.");
      if (body.revision !== current.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "El participante ha cambiado. Revisa su ficha actual.",
        );
      const motive =
        typeof body.motivo === "string" ? body.motivo.trim() : "";
      if (!motive)
        throw new Problem(422, "VALIDATION", "Indica el motivo de la baja.", {
          motivo: "Motivo obligatorio.",
        });
      db.run(
        "UPDATE participantes_compartido SET estado='Baja',revision=revision+1,actualizado=? WHERE id=? AND revision=?",
        [new Date(now).toISOString(), id, current.revision],
      );
      const next = {
        ...current,
        estado: "Baja" as const,
        revision: current.revision + 1,
      };
      bumpFicha(db, referencia, now);
      audit(db, referencia, "baja participante", current, next, motive, now);
      return getCompartido(db, referencia);
    },
  );
}
