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
 * The repository package has no `version` field today, so the deterministic
 * fallback is `BUILD_VERSION`. A release can set `APP_VERSION` or inject the
 * value without changing financial code. No Git command runs at request time.
 */
export const BUILD_VERSION = "0.0.0-e49";

export function resolveAppVersion(override?: string | null): string {
  const candidate =
    (typeof override === "string" && override.trim()) ||
    (typeof process.env.APP_VERSION === "string" &&
      process.env.APP_VERSION.trim()) ||
    packageVersion() ||
    BUILD_VERSION;
  if (candidate.length === 0 || candidate.length > 200)
    throw new Error("Versión de aplicación inválida.");
  return candidate;
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
