/** Shared API problem. Kept dependency-free so domain read models can throw it. */
export class Problem extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
