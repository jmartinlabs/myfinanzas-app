const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * True only when the page is served from this machine. TEST and PROD are
 * remote origins, so local-only labels must not appear there.
 */
export function isLocalEnvironment(hostname?: string): boolean {
  const host =
    hostname ?? (typeof location === "undefined" ? "" : location.hostname);
  return LOOPBACK_HOSTS.has(host);
}
