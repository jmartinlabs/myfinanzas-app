/**
 * Contexto de una ejecución E2E (issue #508).
 *
 * Una ejecución de Playwright necesita puertos y estado **propios** para no
 * chocar con el entorno de desarrollo del usuario (web 5173 / API 3001) ni con
 * otra ejecución concurrente. Este módulo es la única fuente de esos valores:
 *
 *  - `allocatePorts` pide al SO puertos libres en 127.0.0.1 (bind a puerto 0).
 *    Los sockets se mantienen abiertos hasta tener todos, de modo que el SO no
 *    reutilice el mismo número para dos reservas de la misma tanda.
 *  - `buildContext` compone un contexto inmutable: raíz de estado, puertos de
 *    web/API, un puerto por fixture con nombre y los directorios derivados.
 *  - `readContext` / `contextFromEnv` lo recuperan los procesos hijos (configs,
 *    servidores) desde el fichero JSON indicado por `E2E_CONTEXT_FILE`.
 *
 * No consulta procesos ajenos ni los termina: si un puerto se ocupa entre la
 * reserva y el arranque, el consumidor debe fallar de forma explícita.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type E2EContext = {
  runId: string;
  runRoot: string;
  webPort: number;
  apiPort: number;
  webOrigin: string;
  apiOrigin: string;
  fixtures: Record<string, number>;
  stateDir(name: string): string;
  artifactDir(name: string): string;
  fixturePort(name: string): number;
  childEnv(): Record<string, string>;
};

export type ContextInput = {
  runId: string;
  runRoot: string;
  webPort: number;
  apiPort: number;
  fixtures?: Record<string, number>;
};

/** Nombre del fichero de contexto que comparten config, specs y servidores. */
export const CONTEXT_ENV = "E2E_CONTEXT_FILE";

function assertPort(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value))
    throw new Error(`Puerto E2E inválido (${label}).`);
  if (value < 1 || value > 65535)
    throw new Error(`Puerto E2E fuera de rango (${label}): ${value}.`);
  return value;
}

function assertRunId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]{1,64}$/.test(value))
    throw new Error("runId E2E inválido.");
  return value;
}

export function buildContext(input: ContextInput): E2EContext {
  const runId = assertRunId(input.runId);
  if (typeof input.runRoot !== "string" || input.runRoot.trim().length === 0)
    throw new Error("Raíz de ejecución E2E ausente o inválida.");
  const runRoot = resolve(input.runRoot);
  const webPort = assertPort(input.webPort, "web");
  const apiPort = assertPort(input.apiPort, "api");
  if (webPort === apiPort)
    throw new Error("El puerto web y el de la API E2E no pueden coincidir.");
  const fixtures: Record<string, number> = {};
  for (const [name, port] of Object.entries(input.fixtures ?? {}))
    fixtures[name] = assertPort(port, `fixture ${name}`);
  return {
    runId,
    runRoot,
    webPort,
    apiPort,
    webOrigin: `http://127.0.0.1:${webPort}`,
    apiOrigin: `http://127.0.0.1:${apiPort}`,
    fixtures,
    stateDir: (name) => join(runRoot, "state", name),
    artifactDir: (name) => join(runRoot, "artifacts", name),
    fixturePort: (name) => {
      const port = fixtures[name];
      if (port === undefined)
        throw new Error(`El contexto E2E no reservó el fixture «${name}».`);
      return port;
    },
    childEnv: () => ({
      [CONTEXT_ENV]: contextFile(runRoot),
      E2E_WEB_PORT: String(webPort),
      E2E_API_PORT: String(apiPort),
      API_PORT: String(apiPort),
      // Los fixtures del repo usan los dos nombres: se publican ambos para que
      // ninguno caiga a su valor de desarrollo (5173).
      APP_ORIGIN: `http://127.0.0.1:${webPort}`,
      E2E_APP_ORIGIN: `http://127.0.0.1:${webPort}`,
    }),
  };
}

/** Fichero JSON del contexto dentro de la raíz de la ejecución. */
export function contextFile(runRoot: string): string {
  return join(runRoot, "context.json");
}

export function writeContext(context: E2EContext): string {
  mkdirSync(context.runRoot, { recursive: true, mode: 0o700 });
  const file = contextFile(context.runRoot);
  const data = {
    runId: context.runId,
    runRoot: context.runRoot,
    webPort: context.webPort,
    apiPort: context.apiPort,
    fixtures: context.fixtures,
  };
  writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
  return file;
}

/** Reconstruye el contexto desde su representación serializada. */
export function readContext(value: unknown): E2EContext {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Contexto E2E ausente o malformado.");
  const data = value as Record<string, unknown>;
  return buildContext({
    runId: data.runId as string,
    runRoot: data.runRoot as string,
    webPort: data.webPort as number,
    apiPort: data.apiPort as number,
    fixtures: (data.fixtures ?? {}) as Record<string, number>,
  });
}

/**
 * Contexto del proceso actual. Si la variable no está definida, falla: un
 * contexto incompleto **no** puede caer silenciosamente a 5173/3001.
 */
export function contextFromEnv(
  env: Record<string, string | undefined> = process.env,
): E2EContext {
  const file = env[CONTEXT_ENV];
  if (!file)
    throw new Error(
      `Falta ${CONTEXT_ENV}: la ejecución E2E debe arrancar con su contexto propio.`,
    );
  return readContext(JSON.parse(readFileSync(file, "utf8")));
}

type Server = { port: number; stop(): void };

/**
 * Reserva `count` puertos libres en `host`.
 *
 * Los servidores se mantienen abiertos hasta haber reservado todos para que el
 * SO no entregue el mismo número dos veces en la misma tanda. Después se
 * liberan: entre la liberación y el `bind` real del consumidor existe una
 * ventana que este módulo no puede cerrar; por eso los consumidores deben
 * fallar de forma explícita si el puerto aparece ocupado.
 */
export function allocatePortsSync(
  count: number,
  host = "127.0.0.1",
  serve: (options: {
    hostname: string;
    port: number;
    fetch: () => Response;
  }) => Server = defaultServe,
): number[] {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("Número de puertos E2E inválido.");
  const reserved: Server[] = [];
  try {
    for (let index = 0; index < count; index += 1)
      reserved.push(
        serve({ hostname: host, port: 0, fetch: () => new Response("reserva") }),
      );
    const ports = reserved.map((server) => server.port);
    if (new Set(ports).size !== ports.length)
      throw new Error("El SO entregó puertos repetidos en la misma reserva.");
    return ports;
  } finally {
    for (const server of reserved) server.stop();
  }
}

/** Variante asíncrona de `allocatePortsSync`, para consumidores con `await`. */
export async function allocatePorts(
  count: number,
  host = "127.0.0.1",
  serve: (options: {
    hostname: string;
    port: number;
    fetch: () => Response;
  }) => Server = defaultServe,
): Promise<number[]> {
  return allocatePortsSync(count, host, serve);
}

function defaultServe(options: {
  hostname: string;
  port: number;
  fetch: () => Response;
}): Server {
  if (typeof Bun === "undefined")
    throw new Error(
      "Este proceso no es Bun: usa `reservePorts` para reservar puertos desde Node.",
    );
  const server = Bun.serve(options);
  return { port: server.port ?? 0, stop: () => server.stop(true) };
}

/**
 * Reserva puertos desde cualquier runtime.
 *
 * La config de Playwright la carga **Node**, donde `Bun` no existe y no hay
 * forma síncrona de escuchar en el puerto 0; en ese caso se delega en un hijo
 * de Node que abre los N sockets a la vez y devuelve los puertos asignados. El
 * hijo los cierra al terminar, así que la ventana de carrera es la misma que
 * describe `allocatePortsSync`.
 */
export function reservePorts(count: number, host = "127.0.0.1"): number[] {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("Número de puertos E2E inválido.");
  if (typeof Bun !== "undefined") return allocatePortsSync(count, host);
  const script = [
    "const net=require('node:net');",
    `const n=${count};const host=${JSON.stringify(host)};`,
    "const servers=[];const ports=[];let done=0;",
    "for(let i=0;i<n;i++){const s=net.createServer();",
    "s.on('error',(e)=>{console.error(e.message);process.exit(1);});",
    "s.listen(0,host,()=>{ports.push(s.address().port);",
    "if(++done===n){console.log(JSON.stringify(ports));servers.forEach((x)=>x.close());}});",
    "servers.push(s);}",
  ].join("");
  const output = execFileSync(process.execPath, ["-e", script], {
    encoding: "utf8",
    timeout: 10000,
  }).trim();
  const ports = JSON.parse(output) as number[];
  if (!Array.isArray(ports) || ports.length !== count)
    throw new Error("No se pudieron reservar los puertos E2E.");
  if (new Set(ports).size !== ports.length)
    throw new Error("El SO entregó puertos repetidos en la misma reserva.");
  return ports;
}

/** Comprueba que un puerto se puede ocupar ahora mismo (falla cerrado). */
export async function assertPortFree(
  port: number,
  host = "127.0.0.1",
  serve: (options: {
    hostname: string;
    port: number;
    fetch: () => Response;
  }) => Server = defaultServe,
): Promise<void> {
  let server: Server | undefined;
  try {
    server = serve({ hostname: host, port, fetch: () => new Response("probe") });
  } catch {
    throw new Error(
      `El puerto E2E ${port} está ocupado; la ejecución no adoptará un servicio ajeno.`,
    );
  } finally {
    server?.stop();
  }
}