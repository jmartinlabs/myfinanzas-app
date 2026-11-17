/**
 * #502 — identidad de versión del pie persistente.
 *
 * La única fuente es `GET /api/version` (que a su vez reutiliza
 * `resolveAppVersion` en la API): aquí no se hardcodea ninguna versión ni se
 * adivina una release. Este módulo es lógica pura para poder probarla sin DOM:
 * valida el payload no confiable y decide el texto visible y el contenido del
 * panel «Información de la aplicación».
 */

export type AppEnvironment = "DEMO" | "DEV" | "TEST" | "PROD";
export type VersionLabel = "release" | "desarrollo";

export type AppVersionInfo = {
  app: { version: string | null; sha: string | null; label: VersionLabel };
  environment: AppEnvironment;
  schema: number;
};

/** Fallback explícito: no hay identidad verificable, no se inventa release. */
export const NO_VERSION_TEXT = "Versión no disponible · build de desarrollo";
export const PANEL_TITLE = "Información de la aplicación";
export const SCHEMA_NOTE =
  "El esquema de SQLite es un contrato de datos y no es la versión de la aplicación.";
export const NO_DATA = "No disponible";

const ENVIRONMENTS: readonly AppEnvironment[] = ["DEMO", "DEV", "TEST", "PROD"];
const RELEASE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA_VALUE = /^[a-f0-9]{7,64}$/i;

/** Normaliza el SHA corto (7) o `null` si no es hexadecimal verificable. */
export function shortShaText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const sha = value.trim().toLowerCase();
  return SHA_VALUE.test(sha) ? sha.slice(0, 7) : null;
}

/**
 * Valida el payload de `/api/version` antes de pintarlo. Un `release` sin
 * versión SemVer fiable, o un entorno desconocido, degradan al fallback en vez
 * de mostrar datos dudosos.
 */
export function parseVersionPayload(value: unknown): AppVersionInfo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const app = data.app;
  if (!app || typeof app !== "object" || Array.isArray(app)) return null;
  const fields = app as Record<string, unknown>;
  const environment = data.environment;
  if (typeof environment !== "string") return null;
  if (!ENVIRONMENTS.includes(environment as AppEnvironment)) return null;
  if (typeof data.schema !== "number" || !Number.isInteger(data.schema))
    return null;
  if (data.schema < 1) return null;
  if (fields.label !== "release" && fields.label !== "desarrollo") return null;
  const version =
    typeof fields.version === "string" &&
    RELEASE_VERSION.test(fields.version.trim())
      ? fields.version.trim()
      : null;
  // Una «release» sin versión verificable no es una release.
  if (fields.label === "release" && version === null) return null;
  return {
    app: {
      version: fields.label === "release" ? version : null,
      sha: shortShaText(fields.sha),
      label: fields.label,
    },
    environment: environment as AppEnvironment,
    schema: data.schema,
  };
}

/**
 * Texto de una línea del pie. Sin identidad verificable
 * (`/api/version` falló o no respondió) el fallback es explícito.
 */
export function footerLabel(info: AppVersionInfo | null): string {
  if (!info) return NO_VERSION_TEXT;
  if (info.app.label === "release" && info.app.version)
    return `MyFinanzas · v${info.app.version} · ${info.environment}`;
  return `MyFinanzas · build de desarrollo · ${info.environment}`;
}

/** «vX.Y.Z» de release o el marcador de desarrollo; nunca `0.0.0-e49`. */
export function versionText(info: AppVersionInfo | null): string {
  return info?.app.label === "release" && info.app.version
    ? `v${info.app.version}`
    : "Build de desarrollo";
}

export function environmentText(info: AppVersionInfo | null): string {
  return info?.environment ?? NO_DATA;
}

export function shaLabel(info: AppVersionInfo | null): string {
  return info?.app.sha ?? NO_DATA;
}

export function schemaLabel(info: AppVersionInfo | null): string {
  return info ? `SQLite v${info.schema}` : NO_DATA;
}