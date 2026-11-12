/**
 * Stable JSON for logical evidence. Object keys are sorted, undefined values are
 * omitted, bigint becomes canonical decimal text and binary becomes base64.
 * It never depends on insertion order, wall clock or environment.
 */
export function canonicalJson(value: unknown): string {
  const seen = new Set<object>();
  const visit = (current: unknown): string => {
    if (current === null) return "null";
    if (typeof current === "bigint") return JSON.stringify(current.toString());
    if (typeof current === "number") {
      if (!Number.isFinite(current))
        throw new Error("Número no finito en evidencia lógica.");
      return JSON.stringify(current);
    }
    if (typeof current === "string" || typeof current === "boolean")
      return JSON.stringify(current);
    if (current instanceof Uint8Array)
      return JSON.stringify(Buffer.from(current).toString("base64"));
    if (Array.isArray(current)) return `[${current.map(visit).join(",")}]`;
    if (typeof current === "object") {
      if (seen.has(current))
        throw new Error("Ciclo inesperado en evidencia lógica.");
      seen.add(current);
      const record = current as Record<string, unknown>;
      const fields = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${visit(record[key])}`);
      seen.delete(current);
      return `{${fields.join(",")}}`;
    }
    throw new Error("Valor no serializable en evidencia lógica.");
  };
  return visit(value);
}
