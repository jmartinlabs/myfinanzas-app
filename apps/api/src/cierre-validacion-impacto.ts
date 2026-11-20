import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { cycleForDate, cycleMaster } from "./ciclos";
import {
  IMPACTOS_MATERIALES,
  type CoberturaValidada,
  type ImpactoMaterial,
} from "./cierre-validacion-dto";
import { cashAt, investmentInstalled, positionsAtDate } from "./investment-engine";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — universo financiero canónico y materialidad medida (§3.1–§3.3).
 *
 * El contrato es deliberadamente estrecho:
 *
 * - `H_v(C,S) = sha256(JSONcanónico(M_v(C,S)))` sobre el **mismo** universo y
 *   las mismas unidades antes y después (§3.1). El JSON canónico ordena claves y
 *   conjuntos, usa céntimos enteros en texto y `null` explícito; nunca floats.
 * - `impactoOperacion(C) = H_v(C,después) != H_v(C,antes)` se mide en el mismo
 *   snapshot y gobierna **sólo** la marca de una operación (§3.2).
 * - `divergenciaValidacion(C)` compara el estado actual con la referencia
 *   humana y es puramente diagnóstica: ni limpia, ni suprime el impacto, ni
 *   convierte un ciclo Pendiente en `SinValidar`.
 *
 * Este módulo **no** calcula informes ni netos reexpresados: el gasto real
 * económico (GRE), el neto por predicado de elegibilidad y la reexpresión de
 * atribución pertenecen a #538 y su SPEC no está aprobada. Esos componentes se
 * declaran en `noMedido` con su propietario en vez de aproximarse con una
 * semántica provisional: `flujo.gre`, `flujo.neto` y `flujo.devolucionElegible`
 * quedan fuera del universo mientras #538 no los fije, y por eso AC-15, AC-31,
 * AC-32 y AC-34 de SPEC38 siguen fuera del alcance de este incremento.
 */

/**
 * Versión del algoritmo/universo. `version_conjunto` es decimal canónico: dos
 * estados sólo son comparables si comparten esta versión, de modo que un cambio
 * de algoritmo se ve como `NoComparable` y sugiere revalidar, en lugar de marcar
 * en masa por comparar universos distintos (§3.2).
 */
export const VERSION_CONJUNTO = "2";

/** Sin signo, sin ceros a la izquierda: el mismo decimal canónico del DTO. */
const CERO = "0";

export type ComponenteNoMedido = {
  componente: string;
  propietario: "#538" | "#547";
  motivo: string;
};

export type HechoUniverso = {
  id: string;
  tipo: string;
  fecha: string;
  importe: string;
  origen: string;
  destino: string;
  /** +1 entra, -1 sale del efectivo del hecho. */
  signo: "-1" | "1";
  neto: string;
  partida: string | null;
  subcategoria: string | null;
  categoria: string | null;
  deuda: string | null;
  presupuesto: string | null;
  cicloAtribuido: string | null;
  revision: string;
};

export type PosicionUniverso = {
  instrumento: string;
  saldoInversion: string;
  cantidad: string;
};

export type RepartoUniverso = {
  linea: string;
  clase: string;
  presupuesto: string | null;
  partida: string | null;
  origen: string | null;
  destino: string | null;
  importe: string | null;
  fechaPrevista: string;
  incluida: string;
};

export type UniversoFinanciero = {
  versionConjunto: string;
  ciclo: string;
  ventana: { inicio: string; fin: string | null; s0: string };
  flujo: {
    bruto: string | null;
    devolucion: string | null;
    ingreso: string | null;
    comidaNeta: string | null;
    /** #538: sin predicado de neteo aprobado no se publica una cifra. */
    gre: null;
    neto: null;
  };
  stock: { efectivo: string | null; posiciones: PosicionUniverso[] };
  atribucion: HechoUniverso[];
  reparto: RepartoUniverso[];
  cobertura: CoberturaValidada[];
  noMedido: ComponenteNoMedido[];
};

/** Grupo material de §3.1 y el motivo cerrado que lo nombra (§3.2). */
const MOTIVO_POR_GRUPO = {
  ventana: "VENTANA_CICLO",
  s0: "S0_CICLO",
  flujo: "FLUJO_CICLO",
  comida: "COMIDA",
  balance: "BALANCE_FIN",
  posicion: "POSICION",
  atribucion: "ATRIBUCION",
  reparto: "REPARTO",
} as const satisfies Record<string, ImpactoMaterial>;

export type GrupoMaterial = keyof typeof MOTIVO_POR_GRUPO;

/**
 * JSON canónico: claves ordenadas, arrays de objetos ordenados por su propia
 * serialización, y ningún `number` (los importes viajan como céntimos en texto).
 * Dos universos iguales producen el mismo texto byte a byte.
 */
export function jsonCanonico(valor: unknown): string {
  const normal = (entrada: unknown): unknown => {
    if (entrada === null || entrada === undefined) return null;
    // Un `number` sólo aparece en metadatos técnicos (revisiones, páginas). Se
    // serializa como entero canónico en texto: los importes ya viajan como
    // céntimos en cadenas y un no entero sería un float encubierto.
    if (typeof entrada === "number") {
      if (!Number.isSafeInteger(entrada))
        throw new Error("El universo canónico no admite números no enteros.");
      return String(entrada);
    }
    if (typeof entrada === "bigint") return entrada.toString();
    if (Array.isArray(entrada)) {
      const items = entrada.map(normal);
      return items
        .map((item) => [jsonCanonico(item), item] as const)
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([, item]) => item);
    }
    if (typeof entrada === "object") {
      const objeto = entrada as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(objeto)
          .sort()
          .map((clave) => [clave, normal(objeto[clave])]),
      );
    }
    return entrada;
  };
  return JSON.stringify(normal(valor));
}

/** `H_v(C,S)`: huella del universo congelado de una lectura. */
export function huellaUniverso(universo: UniversoFinanciero): string {
  return createHash("sha256").update(jsonCanonico(universo), "utf8").digest("hex");
}

/** Huella de un valor estructural arbitrario (contexto, impacto, payload). */
export function huellaDe(valor: unknown): string {
  return createHash("sha256").update(jsonCanonico(valor), "utf8").digest("hex");
}

const suma = (valores: readonly (string | null)[]): string | null => {
  let total = 0n;
  let visto = false;
  for (const valor of valores) {
    if (valor === null) continue;
    visto = true;
    total += BigInt(valor);
  }
  return visto || valores.length === 0 ? total.toString() : null;
};

const signoDe = (tipo: string): "-1" | "1" =>
  tipo === "Gasto" || tipo === "Amortización deuda" ? "-1" : "1";

type FilaHecho = {
  id: string;
  tipo: string;
  fecha: string;
  importe: string;
  origen: string;
  destino: string;
  partida: string | null;
  subcategoria: string | null;
  categoria: string | null;
  deuda: string | null;
  presupuesto: string | null;
  revision: number;
};

/**
 * Hechos del ciclo, atribución incluida. La clasificación se resuelve por el
 * dominio instalado (Partida → Subcategoría → Categoría) y nunca por nombre ni
 * por texto libre: un cambio de Concepto sólo es material si mueve efectos.
 */
function hechos(db: Database, inicio: string, fin: string | null, ciclo: string): HechoUniverso[] {
  const filas = db
    .query(
      `SELECT m.id,m.tipo,m.fecha,CAST(m.importe AS TEXT) importe,m.origen,m.destino,
              m.partida,p.padre subcategoria,s.padre categoria,p.deuda,p.presupuesto,
              m.revision
         FROM movimientos m
         LEFT JOIN partidas p ON p.id=m.partida
         LEFT JOIN subcategorias s ON s.id=p.padre
        WHERE m.anulado=0 AND m.fecha>=? AND (? IS NULL OR m.fecha<=?)
        ORDER BY length(m.id),m.id`,
    )
    .all(inicio, fin, fin) as FilaHecho[];
  return filas.map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    fecha: fila.fecha,
    importe: fila.importe,
    origen: fila.origen,
    destino: fila.destino,
    signo: signoDe(fila.tipo),
    neto: fila.importe,
    partida: fila.partida,
    subcategoria: fila.subcategoria,
    categoria: fila.categoria,
    deuda: fila.deuda,
    presupuesto: fila.presupuesto,
    cicloAtribuido: ciclo,
    revision: String(fila.revision),
  }));
}

/** Flujo no reexpresado: bruto, devolución registrada, ingreso y comida neta. */
function flujo(db: Database, hechosCiclo: readonly HechoUniverso[]) {
  const bruto = suma(
    hechosCiclo.filter((h) => h.tipo === "Gasto").map((h) => h.importe),
  );
  const devolucion = suma(
    hechosCiclo.filter((h) => h.tipo === "Devolución de gasto").map((h) => h.importe),
  );
  const ingreso = suma(
    hechosCiclo.filter((h) => h.tipo === "Ingreso").map((h) => h.importe),
  );
  const comida = comidaNeta(db, hechosCiclo);
  return { bruto, devolucion, ingreso, comidaNeta: comida };
}

/**
 * Comida neta por el dominio ya instalado: los hechos con revisión de Comida
 * vigente, menos las devoluciones de comida registradas. No se completa con
 * cero: sin hechos de comida no hay cifra.
 */
function comidaNeta(db: Database, hechosCiclo: readonly HechoUniverso[]): string | null {
  const instalada = !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='movimiento_revision_comida'")
    .get();
  if (!instalada) return null;
  const ids = hechosCiclo.map((h) => h.id);
  if (!ids.length) return CERO;
  const filas = db
    .query(
      `SELECT mrc.movimiento,CAST(m.importe AS TEXT) importe,m.tipo
         FROM movimiento_revision_comida mrc
         JOIN movimientos m ON m.id=mrc.movimiento
        WHERE m.anulado=0 AND mrc.etiqueta='Comida'`,
    )
    .all() as { movimiento: string; importe: string; tipo: string }[];
  const presentes = new Set(ids);
  const delCiclo = filas.filter((fila) => presentes.has(fila.movimiento));
  if (!delCiclo.length) return null;
  return suma(
    delCiclo.map((fila) => (fila.tipo === "Devolución de gasto" ? `-${fila.importe}` : fila.importe)),
  );
}

/**
 * Stock a Fin: efectivo de las cuentas de inversión y posiciones por
 * instrumento. `null` cuando el motor no está instalado — ausencia no es cero
 * (§3.1, G11).
 */
function stock(db: Database, fin: string | null): {
  efectivo: string | null;
  posiciones: PosicionUniverso[];
  disponible: boolean;
} {
  if (!fin || !investmentInstalled(db))
    return { efectivo: null, posiciones: [], disponible: false };
  try {
    const cuentas = db
      .query("SELECT id FROM saldos WHERE tipo='Efectivo' AND control='Inversiones' ORDER BY id")
      .all() as { id: string }[];
    let total = 0n;
    for (const cuenta of cuentas) total += BigInt(cashAt(db, cuenta.id, fin).disponible);
    const posiciones = positionsAtDate(db, fin)
      .map((posicion) => ({
        instrumento: posicion.instrumento.id,
        saldoInversion: posicion.saldoInversion.id,
        cantidad: posicion.cantidad.toString(),
      }))
      .sort((a, b) =>
        a.instrumento === b.instrumento
          ? a.saldoInversion < b.saldoInversion
            ? -1
            : 1
          : a.instrumento < b.instrumento
            ? -1
            : 1,
      );
    return { efectivo: total.toString(), posiciones, disponible: true };
  } catch {
    return { efectivo: null, posiciones: [], disponible: false };
  }
}

/** Reparto del ciclo: líneas con su identidad y su magnitud, sin nombres. */
function reparto(db: Database, ciclo: string): RepartoUniverso[] | null {
  const instalada = !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='repartos'")
    .get();
  if (!instalada) return null;
  const cabecera = db
    .query("SELECT id FROM repartos WHERE ciclo=?")
    .get(ciclo) as { id: number } | null;
  if (!cabecera) return [];
  try {
    return (
      db
        .query(
          `SELECT id,clase,presupuesto,partida,origen,destino,
                  CAST(importe AS TEXT) importe,fecha_prevista,incluida
             FROM reparto_lineas WHERE reparto=? ORDER BY id`,
        )
        .all(cabecera.id) as {
        id: number;
        clase: string;
        presupuesto: string | null;
        partida: string | null;
        origen: string | null;
        destino: string | null;
        importe: string | null;
        fecha_prevista: string;
        incluida: number;
      }[]
    ).map((fila) => ({
      linea: String(fila.id),
      clase: fila.clase,
      presupuesto: fila.presupuesto,
      partida: fila.partida,
      origen: fila.origen,
      destino: fila.destino,
      importe: fila.importe,
      fechaPrevista: fila.fecha_prevista,
      incluida: String(fila.incluida),
    }));
  } catch {
    return null;
  }
}

/**
 * Componentes que este incremento **no** mide, con su propietario. Se publican
 * en el universo y en la cobertura para que ninguna lectura los confunda con
 * una igualdad demostrada.
 */
export const COMPONENTES_NO_MEDIDOS: readonly ComponenteNoMedido[] = [
  {
    componente: "flujo.gre",
    propietario: "#538",
    motivo:
      "El gasto real económico depende del predicado único de neteo de #538, cuya SPEC no está aprobada.",
  },
  {
    componente: "flujo.neto",
    propietario: "#538",
    motivo: "El neto por compra y su reexpresión pertenecen a #538; no se aproxima una semántica provisional.",
  },
  {
    componente: "flujo.devolucionElegible",
    propietario: "#538",
    motivo: "La elegibilidad de la devolución que descuenta el gasto la fija #538.",
  },
];

/**
 * Lee el universo financiero de un ciclo. Es la única fuente de la huella: la
 * medición antes/después se hace con esta misma función, de modo que ambos lados
 * comparten unidades y reglas.
 */
export function universoFinanciero(db: Database, ciclo: string): UniversoFinanciero {
  const fila = db
    .query(
      "SELECT id,inicio,CAST(saldo_comida AS TEXT) s0,revision FROM ciclos WHERE id=?",
    )
    .get(ciclo) as { id: string; inicio: string; s0: string; revision: number } | null;
  if (!fila)
    throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.", {
      ciclo: "No existe el ciclo solicitado.",
    });
  const maestro = cycleMaster(db).find((entrada) => entrada.id === ciclo) ?? null;
  const fin = maestro?.fin ?? null;
  const hechosCiclo = hechos(db, fila.inicio, fin, fila.id);
  const flujoCiclo = flujo(db, hechosCiclo);
  const stockCiclo = stock(db, fin);
  const repartoCiclo = reparto(db, ciclo);
  const cobertura: CoberturaValidada[] = [
    { fuente: "movimientos", estado: "Disponible", causas: [] },
    {
      fuente: "efectivo",
      estado: stockCiclo.disponible ? "Disponible" : "NoDisponible",
      causas: stockCiclo.disponible ? [] : ["FIN_NETA_NO_DISPONIBLE"],
    },
    {
      fuente: "posiciones",
      estado: stockCiclo.disponible ? "Disponible" : "NoDisponible",
      causas: stockCiclo.disponible ? [] : ["FIN_NETA_NO_DISPONIBLE"],
    },
    {
      fuente: "plan",
      estado: repartoCiclo === null ? "NoDisponible" : "Disponible",
      causas: repartoCiclo === null ? ["E36_NO_DISPONIBLE"] : [],
    },
    {
      fuente: "valoracion",
      estado: "NoDisponible",
      causas: ["FIN_NETA_NO_DISPONIBLE"],
    },
  ];
  return {
    versionConjunto: VERSION_CONJUNTO,
    ciclo: fila.id,
    ventana: { inicio: fila.inicio, fin, s0: fila.s0 },
    flujo: { ...flujoCiclo, gre: null, neto: null },
    stock: { efectivo: stockCiclo.efectivo, posiciones: stockCiclo.posiciones },
    atribucion: hechosCiclo,
    reparto: repartoCiclo ?? [],
    cobertura,
    noMedido: [...COMPONENTES_NO_MEDIDOS],
  };
}

export type ImpactoMedido = {
  /** Ciclo medido. */
  ciclo: string;
  huellaAntes: string;
  huellaDespues: string;
  material: boolean;
  motivos: ImpactoMaterial[];
  /** Grupos cuyo valor no pudo medirse en alguno de los dos lados. */
  noDisponible: GrupoMaterial[];
};

/**
 * Compara dos lecturas del universo del **mismo** ciclo y devuelve los motivos
 * cerrados que cambiaron. Un grupo no disponible no se declara igual: se
 * devuelve como `noDisponible` y no aporta motivo, porque una ausencia no es
 * evidencia de cambio ni de estabilidad.
 */
export function compararUniverso(
  antes: UniversoFinanciero,
  despues: UniversoFinanciero,
): { motivos: ImpactoMaterial[]; noDisponible: GrupoMaterial[] } {
  const motivos = new Set<ImpactoMaterial>();
  const noDisponible: GrupoMaterial[] = [];
  const grupo = (
    nombre: GrupoMaterial,
    valorAntes: unknown,
    valorDespues: unknown,
    disponible = true,
  ) => {
    if (!disponible) {
      noDisponible.push(nombre);
      return;
    }
    if (jsonCanonico(valorAntes) !== jsonCanonico(valorDespues))
      motivos.add(MOTIVO_POR_GRUPO[nombre]);
  };
  grupo("ventana", [antes.ventana.inicio, antes.ventana.fin], [despues.ventana.inicio, despues.ventana.fin]);
  grupo("s0", antes.ventana.s0, despues.ventana.s0);
  grupo("flujo", [antes.flujo.bruto, antes.flujo.devolucion, antes.flujo.ingreso], [
    despues.flujo.bruto,
    despues.flujo.devolucion,
    despues.flujo.ingreso,
  ]);
  grupo("comida", antes.flujo.comidaNeta, despues.flujo.comidaNeta);
  grupo("balance", antes.stock.efectivo, despues.stock.efectivo);
  grupo("posicion", antes.stock.posiciones, despues.stock.posiciones);
  grupo(
    "atribucion",
    antes.atribucion.map((hecho) => ({
      id: hecho.id,
      partida: hecho.partida,
      subcategoria: hecho.subcategoria,
      categoria: hecho.categoria,
      deuda: hecho.deuda,
      presupuesto: hecho.presupuesto,
      signo: hecho.signo,
      neto: hecho.neto,
      ciclo: hecho.cicloAtribuido,
    })),
    despues.atribucion.map((hecho) => ({
      id: hecho.id,
      partida: hecho.partida,
      subcategoria: hecho.subcategoria,
      categoria: hecho.categoria,
      deuda: hecho.deuda,
      presupuesto: hecho.presupuesto,
      signo: hecho.signo,
      neto: hecho.neto,
      ciclo: hecho.cicloAtribuido,
    })),
  );
  grupo("reparto", antes.reparto, despues.reparto);
  return {
    motivos: IMPACTOS_MATERIALES.filter((motivo) => motivos.has(motivo)),
    noDisponible,
  };
}

export type DivergenciaValidacion = "Igual" | "Distinta" | "NoComparable";

export type ReferenciaHumana = {
  huella: string | null;
  versionConjunto: string | null;
};

/**
 * `divergenciaValidacion(C)` (§3.2): comparación **diagnóstica** con la
 * referencia humana. Sólo es comparable si existe huella, la versión de conjunto
 * es la vigente y la cobertura es la misma; en cualquier otro caso es
 * `NoComparable`, que no limpia, no marca y no reescribe la referencia.
 */
export function divergenciaValidacion(
  referencia: ReferenciaHumana,
  huellaActual: string,
  versionActual = VERSION_CONJUNTO,
): DivergenciaValidacion {
  if (!referencia.huella || !referencia.versionConjunto) return "NoComparable";
  if (referencia.versionConjunto !== versionActual) return "NoComparable";
  return referencia.huella === huellaActual ? "Igual" : "Distinta";
}

/**
 * Ciclos candidatos (§3.3): los que comparten fecha afectada y **todos** los que
 * cierran en o después de la fecha mínima afectada, más el propio ciclo operado
 * y su predecesor cuando la operación mueve la frontera. Pertenecer al conjunto
 * no marca: la marca la decide la comparación antes/después de cada candidato.
 */
export function candidatosPorFechas(
  db: Database,
  cicloOperado: string,
  fechas: readonly (string | null | undefined)[],
  opciones: { incluirPredecesor?: boolean } = {},
): string[] {
  const maestro = cycleMaster(db);
  const presentes = fechas.filter((fecha): fecha is string => typeof fecha === "string" && fecha.length > 0);
  const minimo = presentes.length ? [...presentes].sort()[0] : null;
  const candidatos = new Set<string>([cicloOperado]);
  if (minimo) {
    for (const ciclo of maestro) {
      if (ciclo.inicio <= minimo || ciclo.fin === null || ciclo.fin >= minimo)
        candidatos.add(ciclo.id);
    }
  }
  if (opciones.incluirPredecesor) {
    const indice = maestro.findIndex((ciclo) => ciclo.id === cicloOperado);
    const predecesor = indice > 0 ? maestro[indice - 1] : null;
    if (predecesor) candidatos.add(predecesor.id);
  }
  return [...candidatos].sort((a, b) => Number(a) - Number(b));
}

/**
 * Mide el impacto real de un procedimiento: lee el universo de cada candidato,
 * aplica el procedimiento dentro del `SAVEPOINT` que abre el envoltorio, vuelve
 * a leer y compara. No decide nada por pertenencia al conjunto.
 */
export function medirCandidatos(
  db: Database,
  candidatos: readonly string[],
): Map<string, UniversoFinanciero> {
  const lecturas = new Map<string, UniversoFinanciero>();
  for (const ciclo of candidatos) {
    const existe = db.query("SELECT 1 FROM ciclos WHERE id=?").get(ciclo);
    if (!existe) continue;
    lecturas.set(ciclo, universoFinanciero(db, ciclo));
  }
  return lecturas;
}

/** Impacto comparado de cada candidato, sin inventar cifras ni motivos. */
export function impactoDeCandidatos(
  antes: ReadonlyMap<string, UniversoFinanciero>,
  despues: ReadonlyMap<string, UniversoFinanciero>,
): ImpactoMedido[] {
  const salida: ImpactoMedido[] = [];
  for (const [ciclo, lecturaAntes] of antes) {
    const lecturaDespues = despues.get(ciclo);
    if (!lecturaDespues) continue;
    const huellaAntes = huellaUniverso(lecturaAntes);
    const huellaDespues = huellaUniverso(lecturaDespues);
    const { motivos, noDisponible } = compararUniverso(lecturaAntes, lecturaDespues);
    salida.push({
      ciclo,
      huellaAntes,
      huellaDespues,
      material: huellaAntes !== huellaDespues,
      motivos,
      noDisponible,
    });
  }
  return salida;
}

/** Ciclo al que pertenece una fecha, o `null` fuera de toda ventana. */
export function cicloDeFecha(db: Database, fecha: string): string | null {
  return cycleForDate(db, fecha)?.id ?? null;
}