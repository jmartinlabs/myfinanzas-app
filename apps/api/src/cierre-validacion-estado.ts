import type { Database } from "bun:sqlite";
import {
  parsearDetalleValidacion,
  type CoberturaValidada,
} from "./cierre-validacion-dto";
import {
  VERSION_CONJUNTO,
  divergenciaValidacion,
  huellaUniverso,
  universoFinanciero,
  type DivergenciaValidacion,
} from "./cierre-validacion-impacto";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — estado de validación por HTTP (§2.2, §5 y ANEXO §3).
 *
 * Tres estados visibles no son tres columnas: `SinValidar` es la ausencia de
 * fila tras una consulta **válida** al esquema, `Validada` es `dirty=0` con
 * referencia humana comparable y `Pendiente` es `dirty=1`. Este módulo proyecta
 * ese estado y lo hace fallar cerrado: si la tabla o el contrato de validación
 * no están, responde **503** y nunca `SinValidar` (G4). Un fallo de lectura no
 * puede parecer una validación pendiente de hacer.
 *
 * `divergenciaValidacion` es diagnóstica: `Igual`, `Distinta` o `NoComparable`.
 * `pendienteSinDelta` es un atributo —Pendiente con divergencia `Igual`— no un
 * cuarto estado, y `revalidacionSugerida` no marca nada por sí sola.
 */

export const ESTADOS_VISIBLES = ["SinValidar", "Validada", "Pendiente"] as const;
export type EstadoVisible = (typeof ESTADOS_VISIBLES)[number];

/** Columnas que este lector necesita; su ausencia es contrato incompleto. */
const COLUMNAS_ESPERADAS = [
  "ciclo",
  "revision",
  "dirty",
  "dirty_desde",
  "dirty_ultimo",
  "dirty_origen",
  "dirty_motivos",
  "huella_validacion",
  "version_conjunto",
  "revision_actor",
  "revision_instante",
  "revision_motivo",
  "cobertura",
] as const;

const CODIGO_NO_DISPONIBLE = "VALIDACION_NO_DISPONIBLE";

/**
 * Sustituto de estado que **falla cerrado** (§7.6, G4): sin tabla o sin las
 * columnas del contrato, ninguna lectura financiera puede presentarse como
 * «sin validar» ni como «validada». Se comprueba en cada lectura porque una
 * base restaurada o migrada a medias debe detenerse, no adivinar.
 */
export function exigirEstadoValidacionDisponible(db: Database): void {
  const tabla = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='cierre_validacion'")
    .get() as { name: string } | null;
  if (!tabla)
    throw new Problem(
      503,
      CODIGO_NO_DISPONIBLE,
      "El estado de validación no está disponible: falta el contrato de validación del esquema. No se presenta ningún ciclo como validado ni como sin validar.",
      { validacion: "Contrato de validación ausente." },
    );
  const columnas = new Set(
    (db.query("PRAGMA table_info(cierre_validacion)").all() as { name: string }[]).map(
      (columna) => columna.name,
    ),
  );
  const faltantes = COLUMNAS_ESPERADAS.filter((columna) => !columnas.has(columna));
  if (faltantes.length)
    throw new Problem(
      503,
      CODIGO_NO_DISPONIBLE,
      "El estado de validación no está disponible: el contrato instalado está incompleto.",
      { validacion: `Faltan columnas: ${faltantes.join(", ")}.` },
    );
}

export type FilaValidacion = {
  ciclo: string;
  revision: number;
  dirty: number;
  dirty_desde: string | null;
  dirty_ultimo: string | null;
  dirty_origen: string | null;
  dirty_motivos: string | null;
  huella_validacion: string | null;
  version_conjunto: string | null;
  revision_actor: string | null;
  revision_instante: string | null;
  revision_motivo: string | null;
  cobertura: string;
};

/** Fila cruda, o `null` cuando el ciclo todavía no tiene estado propio. */
export function leerFilaValidacion(db: Database, ciclo: string): FilaValidacion | null {
  exigirEstadoValidacionDisponible(db);
  return db
    .query(
      `SELECT ciclo,revision,dirty,dirty_desde,dirty_ultimo,dirty_origen,dirty_motivos,
              huella_validacion,version_conjunto,revision_actor,revision_instante,
              revision_motivo,cobertura
         FROM cierre_validacion WHERE ciclo=?`,
    )
    .get(ciclo) as FilaValidacion | null;
}

/** Estado persistido sin medir el universo: para lecturas que sólo necesitan
 * saber si el ciclo está pendiente, sin pagar la huella del conjunto. */
export function estadoPersistido(
  db: Database,
  ciclo: string,
): { estado: EstadoVisible; revision: number | null; validado: boolean; dirtyDesde: string | null } {
  const fila = leerFilaValidacion(db, ciclo);
  if (!fila) return { estado: "SinValidar", revision: null, validado: false, dirtyDesde: null };
  const validado =
    fila.huella_validacion !== null &&
    fila.version_conjunto === VERSION_CONJUNTO &&
    fila.revision_actor !== null &&
    fila.revision_instante !== null;
  return {
    estado: fila.dirty === 1 ? "Pendiente" : "Validada",
    revision: fila.revision,
    validado,
    dirtyDesde: fila.dirty_desde,
  };
}

export type ValidacionDto = {
  estado: EstadoVisible;
  revision: number | null;
  dirty: boolean;
  dirtyDesde: string | null;
  dirtyUltimo: string | null;
  dirtyOrigen: string | null;
  motivos: string[];
  cobertura: CoberturaValidada[];
  divergenciaValidacion: DivergenciaValidacion;
  pendienteSinDelta: boolean;
  revalidacionSugerida: boolean;
  validado: boolean;
  versionConjunto: string | null;
  huellaValidacion: string | null;
  huellaVigente: string;
  ultimaRevision: { actor: string; instante: string; motivo: string | null } | null;
};

function motivosDe(texto: string | null): string[] {
  if (!texto) return [];
  try {
    const crudo = JSON.parse(texto) as unknown;
    return Array.isArray(crudo) ? crudo.filter((item): item is string => typeof item === "string") : [];
  } catch {
    throw new Problem(
      503,
      CODIGO_NO_DISPONIBLE,
      "El estado de validación no está disponible: sus motivos no son legibles.",
      { validacion: "Motivos de pendiente ilegibles." },
    );
  }
}

function coberturaDe(texto: string): CoberturaValidada[] {
  const detalle = parsearDetalleValidacion(
    JSON.stringify({ hechos: [], ciclos: [], cobertura: JSON.parse(texto), procedencia: null }),
  );
  return detalle.cobertura;
}

/**
 * Proyección de §2.2/ANEXO §3. `validado` significa «existe referencia humana
 * comparable del conjunto nuevo», no «existe fila»; `dirtyPrevio` y `validado`
 * son independientes y una referencia no comparable nunca autoriza decir «ya
 * validaste».
 */
export function proyectarValidacion(db: Database, ciclo: string): ValidacionDto {
  const fila = leerFilaValidacion(db, ciclo);
  const huellaVigente = huellaUniverso(universoFinanciero(db, ciclo));
  if (!fila)
    return {
      estado: "SinValidar",
      revision: null,
      dirty: false,
      dirtyDesde: null,
      dirtyUltimo: null,
      dirtyOrigen: null,
      motivos: [],
      cobertura: [],
      divergenciaValidacion: "NoComparable",
      pendienteSinDelta: false,
      revalidacionSugerida: false,
      validado: false,
      versionConjunto: null,
      huellaValidacion: null,
      huellaVigente,
      ultimaRevision: null,
    };
  const divergencia = divergenciaValidacion(
    { huella: fila.huella_validacion, versionConjunto: fila.version_conjunto },
    huellaVigente,
    VERSION_CONJUNTO,
  );
  const estado: EstadoVisible = fila.dirty === 1 ? "Pendiente" : "Validada";
  const validado =
    fila.huella_validacion !== null &&
    fila.version_conjunto === VERSION_CONJUNTO &&
    fila.revision_actor !== null &&
    fila.revision_instante !== null;
  return {
    estado,
    revision: fila.revision,
    dirty: fila.dirty === 1,
    dirtyDesde: fila.dirty_desde,
    dirtyUltimo: fila.dirty_ultimo,
    dirtyOrigen: fila.dirty_origen,
    motivos: motivosDe(fila.dirty_motivos),
    cobertura: coberturaDe(fila.cobertura),
    divergenciaValidacion: divergencia,
    pendienteSinDelta: estado === "Pendiente" && divergencia === "Igual",
    // AC-07: una referencia humana de otro conjunto sugiere revalidar aunque no
    // sea comparable. Sin referencia (huella nula) no hay nada que revalidar:
    // el ciclo está sin validar y la acción es validar.
    revalidacionSugerida:
      divergencia === "Distinta" ||
      (divergencia === "NoComparable" && fila.huella_validacion !== null),
    validado,
    versionConjunto: fila.version_conjunto,
    huellaValidacion: fila.huella_validacion,
    huellaVigente,
    ultimaRevision:
      fila.revision_actor !== null && fila.revision_instante !== null
        ? {
            actor: fila.revision_actor,
            instante: fila.revision_instante,
            motivo: fila.revision_motivo,
          }
        : null,
  };
}