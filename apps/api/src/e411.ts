import type { Database } from "bun:sqlite";
import { getCierreEstado, getFotoCierre } from "./e49";
import { getReaperturaEstado } from "./e410";

/**
 * E4.11 I1 — read model of a closure photo by cycle and version.
 *
 * This module only reads E4.9/E4.10 evidence. It never writes, never
 * recalculates a historical value and never falls back to another version:
 * a requested version that does not exist is a 404 from `getFotoCierre`.
 *
 * The deliberate distinction is:
 *  - `seleccionAplicada.porDefecto` declares that no version was requested and
 *    the last persisted version was read;
 *  - `vigente` is true only for the last version while the cycle is not
 *    reopened. `getFotoCierre` without a version therefore never means
 *    "current" by itself.
 *  - a reopened cycle without v2 keeps v1 consultable but marks it
 *    `PendienteReCierre` and `vigente:false` (P4-A), without creating a photo.
 */

const REGLA = "P7-D" as const;

export type EstadoFotoCiclo = "Disponible" | "SinFoto" | "PendienteReCierre";

export type SeleccionAplicada = {
  version: number | null;
  porDefecto: boolean;
  regla: typeof REGLA;
};

type CierreFoto = ReturnType<typeof getFotoCierre>["cierre"];
type FotoPersistida = ReturnType<typeof getFotoCierre>["foto"];

/**
 * DTO of one cycle photo. Field precedence is deliberate:
 * - `estadoFoto` only states availability: `Disponible` when a persisted photo
 *   exists and `SinFoto` when the cycle has no closure.
 * - `estado` adds the cycle state: `PendienteReCierre` only for the last photo
 *   of a reopened cycle without v2; otherwise it repeats `estadoFoto`.
 * - `motivo` is `SIN_CIERRE` for `SinFoto` and `PENDIENTE_RE_CIERRE` for
 *   `PendienteReCierre`; it is `null` for a normal available photo.
 * - `vigente` is true only for the last persisted version of a non-reopened
 *   cycle; it is false for any previous version or for a reopened cycle.
 */
export type FotoCicloDto = {
  origen: "Foto";
  estadoFoto: "Disponible" | "SinFoto";
  estado: EstadoFotoCiclo;
  motivo: string | null;
  seleccionAplicada: SeleccionAplicada;
  vigente: boolean;
  reapertura: ReturnType<typeof getReaperturaEstado>;
  cierre: CierreFoto | null;
  foto: FotoPersistida | null;
};

export type VersionFotoDto = {
  version: number;
  creadoUtc: string;
  actor: string;
  motivo: string | null;
  fingerprint: string;
  appVersion: string;
  schemaVersion: number;
  esUltima: boolean;
  vigente: boolean;
  estado: "Disponible" | "PendienteReCierre";
};

type VersionRow = {
  version: number;
  creado_utc: string;
  actor: string;
  motivo: string | null;
  fingerprint: string;
  app_version: string;
  schema_version: number;
};

const SIN_CIERRE = "SIN_CIERRE";
const PENDIENTE_RE_CIERRE = "PENDIENTE_RE_CIERRE";

/**
 * Reads one persisted photo of a cycle.
 *
 * - no `version`: the last persisted version, declared `porDefecto:true`;
 * - `version`: exactly that version, or a 404 without fallback;
 * - cycle with no closure: `SinFoto` with a motive, unless an explicit
 *   version was requested (then it is a 404, like any inexistent version);
 * - unknown cycle: 404 from `getCierreEstado` / `getReaperturaEstado`.
 */
export function getFotoCiclo(
  db: Database,
  cicloId: string,
  version?: number,
): FotoCicloDto {
  const estadoCierre = getCierreEstado(db, cicloId);
  const reapertura = getReaperturaEstado(db, cicloId);

  if (estadoCierre.estado === "Abierto") {
    // A requested version on a cycle without any closure can never exist:
    // delegate to the canonical 404 instead of returning `SinFoto` for it.
    if (version !== undefined) getFotoCierre(db, cicloId, version);
    return {
      origen: "Foto",
      estadoFoto: "SinFoto",
      estado: "SinFoto",
      motivo: SIN_CIERRE,
      seleccionAplicada: { version: null, porDefecto: true, regla: REGLA },
      vigente: false,
      reapertura,
      cierre: null,
      foto: null,
    };
  }

  const { cierre, foto } = getFotoCierre(db, cicloId, version);
  const esUltima = foto.version === estadoCierre.version;
  const reabierto = reapertura.estado === "Reabierto";
  const pendiente = esUltima && reabierto;

  return {
    origen: "Foto",
    estadoFoto: "Disponible",
    estado: pendiente ? "PendienteReCierre" : "Disponible",
    motivo: pendiente ? PENDIENTE_RE_CIERRE : null,
    seleccionAplicada: {
      version: foto.version,
      porDefecto: version === undefined,
      regla: REGLA,
    },
    vigente: esUltima && !reabierto,
    reapertura,
    cierre,
    foto,
  };
}

/**
 * Index of consultable versions of one cycle, newest first. It only lists
 * persisted photos (`cierres` joined to `fotos_cierre`); it never creates one.
 * A cycle without closure returns an empty list.
 */
export function getVersionesFotoCiclo(
  db: Database,
  cicloId: string,
): VersionFotoDto[] {
  const estadoCierre = getCierreEstado(db, cicloId);
  const reapertura = getReaperturaEstado(db, cicloId);
  const rows = db
    .query(
      `SELECT c.version,c.creado_utc,c.actor,c.motivo,c.fingerprint,
        f.app_version,f.schema_version
       FROM cierres c JOIN fotos_cierre f
         ON f.ciclo=c.ciclo AND f.version=c.version
       WHERE c.ciclo=?
       ORDER BY c.version DESC`,
    )
    .all(cicloId) as VersionRow[];
  const reabierto = reapertura.estado === "Reabierto";

  return rows.map((row) => {
    const esUltima = row.version === estadoCierre.version;
    const pendiente = esUltima && reabierto;
    return {
      version: row.version,
      creadoUtc: row.creado_utc,
      actor: row.actor,
      motivo: row.motivo,
      fingerprint: row.fingerprint,
      appVersion: row.app_version,
      schemaVersion: row.schema_version,
      esUltima,
      vigente: esUltima && !reabierto,
      estado: pendiente ? "PendienteReCierre" : "Disponible",
    };
  });
}
