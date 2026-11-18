import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Minimal reproducible application version for E4.9 photo metadata.
 *
 * Source of truth, in order:
 *  1. explicit injection (`CierreOptions.appVersion`), used by tests and the
 *     caller that knows the deployed build;
 *  2. `APP_VERSION` from the environment;
 *  3. the `version` field of the repository `package.json`, when it exists;
 *  4. `BUILD_VERSION`, a versioned constant in this file.
 *
 * When the build exposes a commit SHA in the environment (`APP_SHA`,
 * `GIT_SHA`, `GITHUB_SHA`, `COMMIT_SHA` or `SOURCE_SHA`), it is appended as
 * `+<sha>` to the environment/package/fallback version so the photo stays
 * traceable. An explicit injected override is returned verbatim and never
 * receives the suffix. No Git command runs at request time and no network
 * access is used.
 *
 * The repository package has no `version` field today, so the deterministic
 * fallback is `BUILD_VERSION`. A release can set `APP_VERSION` or inject the
 * value without changing financial code.
 */
export const BUILD_VERSION = "0.0.0-e49";

/** Etiqueta pública de la identidad: nunca se presenta un build como release. */
export type VersionLabel = "release" | "desarrollo";

/**
 * Identidad de release que consume la UI (#502). `version` omite el sufijo
 * `+sha` que sí conserva `resolveAppVersion` para las fotos, y es `null`
 * cuando la única fuente es `BUILD_VERSION`: `0.0.0-e49` no es una release.
 */
export type AppVersionIdentity = {
  version: string | null;
  sha: string | null;
  label: VersionLabel;
};

/** Entornos públicos admitidos en la UI. `TEST` nunca es un valor por defecto. */
export type AppEnvironment = "DEMO" | "DEV" | "TEST" | "PROD";

const SHA_VALUE = /^[a-f0-9]{7,64}$/;
const SHA_SUFFIX = /\+([a-f0-9]{7,64})$/i;

export function resolveAppVersion(override?: string | null): string {
  // An explicit injected value is already the caller's reproducible version:
  // return it verbatim, without appending the build SHA.
  if (typeof override === "string" && override.trim())
    return validated(override.trim());
  return validated(withBuildSha(versionSource().base));
}

/**
 * SHA corto (7 caracteres) del artefacto, o `null` si el valor no es un SHA
 * hexadecimal verificable. No consulta Git: solo lee lo que el build expuso.
 */
export function shortSha(value?: string | null): string | null {
  const sha = (value ?? "").trim().toLowerCase();
  return SHA_VALUE.test(sha) ? sha.slice(0, 7) : null;
}

/**
 * Identidad de release reutilizando `resolveAppVersion`: misma fuente única,
 * sin un segundo número manual en React ni Git en tiempo de petición.
 */
export function appVersionIdentity(
  override?: string | null,
): AppVersionIdentity {
  const source =
    typeof override === "string" && override.trim()
      ? { base: override.trim(), release: true }
      : versionSource();
  const resolved = validated(withBuildSha(source.base));
  const suffix = SHA_SUFFIX.exec(resolved);
  return {
    version: source.release ? resolved.replace(SHA_SUFFIX, "") : null,
    sha: shortSha(suffix?.[1] ?? buildSha()),
    label: source.release ? "release" : "desarrollo",
  };
}

/**
 * Entorno que se muestra junto a la versión. Un `APP_ENV` válido manda; si no
 * existe, el modo DEMO ya validado de la base decide DEMO, `NODE_ENV=production`
 * decide PROD y todo lo demás es DEV. TEST solo aparece si se declara: nunca se
 * deduce de `NODE_ENV=test`, que es el entorno de las pruebas.
 */
export function resolveEnvironment(
  input: { demo?: boolean; env?: NodeJS.ProcessEnv } = {},
): AppEnvironment {
  const env = input.env ?? process.env;
  const declared = (env.APP_ENV ?? "").trim().toUpperCase();
  if (declared === "DEMO" || declared === "TEST" || declared === "PROD")
    return declared;
  if (input.demo === true) return "DEMO";
  if ((env.NODE_ENV ?? "").trim() === "production") return "PROD";
  return "DEV";
}

function validated(candidate: string): string {
  if (candidate.length === 0 || candidate.length > 200)
    throw new Error("Versión de aplicación inválida.");
  return candidate;
}

/** Fuente efectiva de la versión y si es apta para presentarse como release. */
function versionSource(): { base: string; release: boolean } {
  const declared = process.env.APP_VERSION;
  if (typeof declared === "string" && declared.trim())
    return { base: declared.trim(), release: true };
  const pkg = packageVersion();
  if (pkg) return { base: pkg, release: true };
  return { base: BUILD_VERSION, release: false };
}

function buildSha(): string | null {
  for (const name of [
    "APP_SHA",
    "GIT_SHA",
    "GITHUB_SHA",
    "COMMIT_SHA",
    "SOURCE_SHA",
  ]) {
    const value = process.env[name];
    if (typeof value === "string" && /^[a-f0-9]{7,64}$/i.test(value.trim()))
      return value.trim().toLowerCase();
  }
  return null;
}

function withBuildSha(base: string): string {
  const sha = buildSha();
  return sha && !base.includes("+") ? `${base}+${sha}` : base;
}

function packageVersion(): string | null {
  try {
    const data = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { version?: unknown };
    return typeof data.version === "string" && data.version.trim()
      ? data.version.trim()
      : null;
  } catch {
    return null;
  }
}