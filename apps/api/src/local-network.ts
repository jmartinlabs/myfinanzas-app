/**
 * Alcance de red admitido para HTTP sin TLS: loopback y IPv4 privada (RFC 1918).
 * Se comparte entre el modo DEMO y la validación de `Auth` para no duplicar la
 * lista de hosts permitidos.
 */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

const PRIVATE_IPV4 =
  /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

function octets(host: string) {
  return host.split(".").map(Number);
}

export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

/** IPv4 privada con octetos válidos; no acepta rangos reservados ni nombres. */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!PRIVATE_IPV4.test(host)) return false;
  return octets(host).every((value) => value >= 0 && value <= 255);
}

export function isLocalHttpHost(hostname: string): boolean {
  return isLoopbackHost(hostname) || isPrivateHost(hostname);
}

/**
 * Origen HTTP canónico en loopback o red privada: sin credenciales, sin ruta,
 * sin puerto privilegiado. Devuelve `origin` normalizado.
 */
export function localHttpOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.origin !== value ||
    !isLocalHttpHost(url.hostname)
  )
    throw new Error(
      "Origen HTTP no permitido: solo loopback o IPv4 privada, con forma canónica.",
    );
  const port = Number(url.port === "" ? "80" : url.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Puerto HTTP no permitido fuera del rango 1024-65535.");
  return url.origin;
}
