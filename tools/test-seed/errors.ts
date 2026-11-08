export type SeedExitCode = 0 | 1 | 2 | 3;

/** Códigos del contrato SPEC34: 0 éxito/no-op, 2 guarda, 3 drift/verificación, 1 técnico. */
export class SeedError extends Error {
  constructor(
    public readonly code: SeedExitCode,
    message: string,
    public readonly step?: string,
  ) {
    super(message);
    this.name = "SeedError";
  }
}

export function guardError(message: string, step?: string): never {
  throw new SeedError(2, message, step);
}

export function driftError(message: string, step?: string): never {
  throw new SeedError(3, message, step);
}
