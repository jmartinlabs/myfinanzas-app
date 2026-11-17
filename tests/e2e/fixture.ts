/**
 * Fixtures E2E con puerto y estado propios (issue #508, segundo corte).
 *
 * Cada spec que arranca su propio servidor de fixture pide aquí su puerto y su
 * directorio: salen del contexto de la ejecución (`e2e-context.ts`), no de
 * constantes compartidas. Dos ejecuciones simultáneas de la misma spec obtienen
 * puertos distintos y directorios distintos aunque el nombre del fixture
 * coincida.
 *
 * El servidor recibe los valores por entorno (`E2E_PORT`, `E2E_STATE_DIR`) y
 * conserva su valor por defecto histórico cuando se arranca a mano, de modo que
 * el cambio es aditivo para quien no usa el arnés.
 */
import { contextFromEnv, reservePorts } from "../../apps/api/test-support/e2e-context";

export type Fixture = {
  name: string;
  port: number;
  dir: string;
  baseURL: string;
  env: Record<string, string>;
};

/** Contexto de un fixture: puerto libre reservado y directorio de esta run. */
export function fixtureContext(name: string): Fixture {
  if (!/^[a-z0-9-]{1,40}$/.test(name))
    throw new Error(`Nombre de fixture E2E inválido: ${name}`);
  const context = contextFromEnv();
  const [port] = reservePorts(1);
  const dir = context.stateDir(name);
  return {
    name,
    port,
    dir,
    baseURL: `http://127.0.0.1:${port}`,
    env: {
      ...(process.env as Record<string, string>),
      ...context.childEnv(),
      NODE_ENV: "test",
      E2E_PORT: String(port),
      E2E_STATE_DIR: dir,
    },
  };
}