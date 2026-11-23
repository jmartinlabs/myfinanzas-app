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
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { contextFromEnv, reservePorts } from "../../apps/api/test-support/e2e-context";

export type Fixture = {
  name: string;
  port: number;
  dir: string;
  baseURL: string;
  env: Record<string, string>;
};

/**
 * Directorio de capturas `name` de esta ejecución. Lo crea si falta y devuelve
 * la ruta absoluta bajo `<runRoot>/artifacts/`: dos runs simultáneas nunca
 * escriben en el mismo sitio.
 */
export function artifactDir(name: string): string {
  if (!/^[a-z0-9-]{1,40}$/.test(name))
    throw new Error(`Nombre de artefacto E2E inválido: ${name}`);
  const dir = contextFromEnv().artifactDir(name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

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

/**
 * Servidor de fixture en marcha, con su salida y su ciclo de vida bajo control.
 *
 * Se arranca con `stdio` de pipes —nunca heredado— para que la salida del
 * proceso quede en el mensaje de fallo en lugar de perderse, y para que el
 * hijo no comparta la entrada del runner.
 */
export type OwnedFixture = {
  fixture: Fixture;
  child: ChildProcess;
  /** Salida acumulada (stdout + stderr) del proceso. */
  output: () => string;
  /** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
  assertAlive: () => void;
  /** Detiene el proceso y cierra sus pipes. */
  stop: () => void;
};

/**
 * Arranca `script` con el puerto, el estado y el origen de `fixture`.
 *
 * `extraEnv` añade los selectores propios del servidor (por ejemplo el
 * escenario) sin pisar los valores del contexto.
 */
export function startFixtureServer(
  script: string,
  fixture: Fixture,
  extraEnv: Record<string, string> = {},
): OwnedFixture {
  const child = spawn(process.env.BUN_BIN ?? "bun", [script], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...fixture.env, ...extraEnv },
  });
  let output = "";
  let exit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    exit = { code, signal };
  });
  const assertAlive = () => {
    const ended = exit;
    if (!ended) return;
    const how = `código ${ended.code ?? "null"}${ended.signal ? ` / señal ${ended.signal}` : ""}`;
    throw new Error(
      `El fixture ${fixture.name} terminó antes de servir (${how}): ${output.trim() || "(sin salida)"}`,
    );
  };
  return {
    fixture,
    child,
    output: () => output,
    assertAlive,
    stop() {
      child.kill();
      child.stdout?.destroy();
      child.stderr?.destroy();
    },
  };
}

/**
 * Lo mínimo que `requireFixtureState` necesita de un fixture en marcha.
 *
 * `OwnedFixture` lo cumple tal cual; un spec con su propio rastreador de
 * procesos puede añadir solo su `fixture`.
 */
export type FixtureStateCheck = {
  fixture: Fixture;
  output: () => string;
  assertAlive: () => void;
};

/**
 * Comprueba que el fixture provisionó su estado **antes** de navegar.
 *
 * Falla cerrado: si `bootstrap.txt` no está, la sesión del run no existe y la
 * navegación hablaría con un estado ajeno o vacío.
 */
export function requireFixtureState(owned: FixtureStateCheck): void {
  const bootstrap = join(owned.fixture.dir, "bootstrap.txt");
  owned.assertAlive();
  if (!existsSync(bootstrap))
    throw new Error(
      `El fixture ${owned.fixture.name} no provisionó ${bootstrap}: ${owned.output().trim() || "(sin salida)"}`,
    );
}