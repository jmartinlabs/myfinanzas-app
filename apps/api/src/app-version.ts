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
 * `+<sha>` so the photo stays traceable. No Git command runs at request time
 * and no network access is used.
 *
 * The repository package has no `version` field today, so the deterministic
 * fallback is `BUILD_VERSION`. A release can set `APP_VERSION` or inject the
 * value without changing financial code.
 */
export const BUILD_VERSION = "0.0.0-e49";

export function resolveAppVersion(override?: string | null): string {
  const candidate = withBuildSha(
    (typeof override === "string" && override.trim()) ||
      (typeof process.env.APP_VERSION === "string" &&
        process.env.APP_VERSION.trim()) ||
      packageVersion() ||
      BUILD_VERSION,
  );
  if (candidate.length === 0 || candidate.length > 200)
    throw new Error("Versión de aplicación inválida.");
  return candidate;
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
