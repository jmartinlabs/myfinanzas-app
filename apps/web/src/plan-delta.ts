export type PlanDeltaEntry = {
  anterior: string | null;
  posterior: string | null;
};

/**
 * Parses the historical `cycle_plan_audit.delta` JSON. DEV-06 persists the
 * impact certificate next to the field deltas under an `impacto` key, so the
 * UI must ignore every entry that is not a field change with
 * `anterior`/`posterior` values instead of assuming all keys have that shape.
 */
export function planDeltaEntries(raw: string): [string, PlanDeltaEntry][] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return [];
  return Object.entries(parsed as Record<string, unknown>).filter(
    (entry): entry is [string, PlanDeltaEntry] => {
      const value = entry[1];
      return (
        !!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        "anterior" in value &&
        "posterior" in value &&
        ((value as PlanDeltaEntry).anterior === null ||
          typeof (value as PlanDeltaEntry).anterior === "string") &&
        ((value as PlanDeltaEntry).posterior === null ||
          typeof (value as PlanDeltaEntry).posterior === "string")
      );
    },
  );
}
