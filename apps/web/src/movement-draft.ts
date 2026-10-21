// Memory-only, explicit round trip to create a Reference; no financial data in storage.
export let referenceReturn: {
  path: string;
  form: Record<string, string>;
  reason: string;
} | null = null;
export function preserveMovement(
  path: string,
  form: Record<string, string>,
  reason: string,
) {
  referenceReturn = { path, form, reason };
}
export function clearMovementReturn() {
  referenceReturn = null;
}
