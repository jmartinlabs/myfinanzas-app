const LOOPBACK_HOSTS = new Set([
  "localhost",
  "localhost.",
  "127.0.0.1",
  "::1",
  "[::1]",
]);
const TEST_HOSTS = new Set(["test.myfinanzas.pp.ua"]);

/**
 * True only when the page is served from this machine. TEST and PROD are
 * remote origins, so local-only labels must not appear there.
 */
export function isLocalEnvironment(hostname?: string): boolean {
  const host = (
    hostname ?? (typeof location === "undefined" ? "" : location.hostname)
  ).toLowerCase();
  return LOOPBACK_HOSTS.has(host) || host.endsWith(".localhost");
}

/** Visible environment label, or null when the host is not a known one. */
export function environmentLabel(hostname?: string): string | null {
  const host = (
    hostname ?? (typeof location === "undefined" ? "" : location.hostname)
  ).toLowerCase();
  if (isLocalEnvironment(host)) return "Entorno local";
  if (TEST_HOSTS.has(host)) return "Entorno TEST";
  return null;
}
