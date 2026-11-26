import { Problem } from "./problem";

/**
 * SPEC38 · I1 — constructor/validador central del DTO de auditoría de validación.
 *
 * §2.3 de la SPEC fija una **lista blanca exacta**: `detalle` sólo admite
 * `hechos`, `ciclos`, `cobertura` y `procedencia`, con `additionalProperties:false`
 * en cada nivel. La prohibición es de cifras o de datos que permitan
 * reconstruir resultados, no de dígitos dentro de identificadores, fechas o
 * huellas: por eso `RevisionDecimal` e `IdLegado` viajan como **texto decimal
 * canónico** y `IdExistente` valida el **formato propio de su entidad**
 * (`movimiento` decimal, `referencia` `REF`+dígitos), y la regla «ningún
 * `number` JSON» es una comprobación de tipo mecánica, sin excepciones ni lista
 * negra de nombres.
 *
 * Este módulo es la única puerta de construcción: copia sólo los campos
 * permitidos, rechaza claves extra, tipos incorrectos, enums/IDs/revisiones no
 * válidos, arrays excesivos y cualquier valor de tipo `number` —también
 * anidado—. Sus enums son la fuente única que también consumen los triggers de
 * §2.3.2, de modo que servicio y base no pueden derivar.
 *
 * La validación semántica (que la revisión coincida con la real y que el ID
 * exista) la vuelve a imponer la base al escribir; aquí se comprueba la forma
 * exacta, que es lo que el constructor puede saber sin leer el dominio.
 */

/** Dominios de hecho instalados con identidad decimal y `revision` propia. */
export const ENTIDADES_PERMITIDAS = ["movimiento", "referencia"] as const;
export type EntidadPermitida = (typeof ENTIDADES_PERMITIDAS)[number];

/**
 * Nombres de fuente de la cobertura: los del bloque E4.9 ya instalado más la
 * proyección de devoluciones de compras (`calcularGreIntervalo`, SPEC39).
 * `devoluciones` es independiente de `movimientos`: describe la cobertura del
 * GRE del intervalo, no la presencia del ledger bancario.
 */
export const FUENTES_COBERTURA = [
  "movimientos",
  "devoluciones",
  "efectivo",
  "posiciones",
  "plan",
  "e35",
  "deuda",
  "valoracion",
  "anticipos",
] as const;
export type FuenteCobertura = (typeof FUENTES_COBERTURA)[number];

export const ESTADOS_COBERTURA = [
  "Disponible",
  "Parcial",
  "NoDisponible",
] as const;
export type EstadoCobertura = (typeof ESTADOS_COBERTURA)[number];

/**
 * Códigos de causa. Los siete primeros son los que la SPEC nombra en §4.2 y §5;
 * los `FOTO_*` son la evidencia de legibilidad de §7.2/AC-46, el penúltimo es la
 * causa genérica de E1b y los siete últimos exponen 1:1 las causas de la
 * proyección de devoluciones de SPEC39 §3.3 (`EXCESO` es el diagnóstico de
 * descuento superior a la compra). No hay códigos genéricos para esa fuente.
 */
export const CAUSAS_COBERTURA = [
  "SIN_SIGUIENTE_INICIO",
  "S0_AUSENTE",
  "CICLO_SIN_HECHOS_VERIFICADOS",
  "PLAN_NO_VERIFICABLE",
  "FIN_NETA_NO_DISPONIBLE",
  "E36_NO_DISPONIBLE",
  "ANTICIPO_APERTURA_INCOHERENTE",
  "FOTO_AUSENTE",
  "FOTO_ILEGIBLE",
  "FOTO_INCOMPLETA",
  "FOTO_DIVERGENTE",
  "MIGRACION_FUENTE_NO_ACREDITADA",
  "SIN_VINCULO",
  "REVISAR",
  "SIN_ACREDITACION",
  "SIN_CLASIFICACION",
  "COMPRA_INVALIDA",
  "PERIODO_NO_RESOLUBLE",
  "EXCESO",
] as const;
export type CausaCobertura = (typeof CAUSAS_COBERTURA)[number];

/** Motivos cerrados de impacto material (§3.2). `MIGRACION` no es uno de ellos. */
export const IMPACTOS_MATERIALES = [
  "FLUJO_CICLO",
  "BALANCE_FIN",
  "POSICION",
  "ATRIBUCION",
  "REPARTO",
  "COMIDA",
  "VENTANA_CICLO",
  "S0_CICLO",
] as const;
export type ImpactoMaterial = (typeof IMPACTOS_MATERIALES)[number];

/**
 * Tablas legadas admitidas en `procedencia`. `cierres`, `fotos_cierre` y
 * `cierre_vinculos` tienen clave compuesta (o la expresan con el `ciclo` del
 * evento), así que su identidad va en los campos estructurados y `id` queda
 * `null`; `reaperturas`, `cierre_audit` y `reapertura_activa` llevan `id`.
 */
export const TABLAS_LEGADAS = [
  "cierres",
  "fotos_cierre",
  "cierre_audit",
  "reaperturas",
  "reapertura_activa",
  "cierre_vinculos",
] as const;
export type TablaLegada = (typeof TABLAS_LEGADAS)[number];

/** Tablas cuya identidad legada es compuesta: `procedencia.id` queda `null`. */
export const TABLAS_LEGADAS_SIN_ID: readonly TablaLegada[] = [
  "cierres",
  "fotos_cierre",
  "cierre_vinculos",
];

/**
 * Formato real de identidad por entidad, derivado del esquema instalado y no de
 * una suposición. `movimiento` usa la PK decimal canónica de `movimientos`
 * (`CHECK(id NOT GLOB '*[^0-9]*' …)`); `referencia` usa el id de negocio de
 * `referencias`
 * (`CHECK(id GLOB 'REF[0-9]*' AND substr(id,4) NOT GLOB '*[^0-9]*' AND length(id)>=6)`),
 * es decir prefijo `REF` en mayúsculas y sólo dígitos detrás. La longitud se
 * acota al límite técnico de identificadores de §2.3 (200), que la propia
 * SPEC exige: un id más largo no es una identidad, es un payload.
 */
export const ID_MOVIMIENTO = {
  tipo: "decimal" as const,
  minimo: 1,
  maximo: 18,
};
export const ID_REFERENCIA = {
  tipo: "referencia" as const,
  prefijo: "REF",
  digitosMinimos: 3,
  minimo: 6,
  maximo: 200,
};

const PATRON_REFERENCIA = /^REF[0-9]{3,197}$/;

export type HechoValidado = {
  entidad: EntidadPermitida;
  id: string;
  revision: string;
};

export type CicloValidado = {
  id: string;
  impactos: ImpactoMaterial[];
};

export type CoberturaValidada = {
  fuente: FuenteCobertura;
  estado: EstadoCobertura;
  causas: CausaCobertura[];
};

export type ProcedenciaValidada = {
  tabla: TablaLegada;
  id: string | null;
  version: string | null;
  reaperturaId: string | null;
  activa: boolean | null;
  versionOrigen: string | null;
  versionDestino: string | null;
  correlacion: string | null;
};

export type DetalleValidacion = {
  hechos: HechoValidado[];
  ciclos: CicloValidado[];
  cobertura: CoberturaValidada[];
  procedencia: ProcedenciaValidada | null;
};

/** Topes de tamaño: un array desmesurado es un payload inválido, no un informe. */
export const LIMITES_DETALLE = {
  hechos: 500,
  ciclos: 200,
  cobertura: FUENTES_COBERTURA.length,
  causas: CAUSAS_COBERTURA.length,
  impactos: IMPACTOS_MATERIALES.length,
} as const;

const CLAVES_DETALLE = ["hechos", "ciclos", "cobertura", "procedencia"] as const;
const CLAVES_HECHO = ["entidad", "id", "revision"] as const;
const CLAVES_CICLO = ["id", "impactos"] as const;
const CLAVES_COBERTURA = ["fuente", "estado", "causas"] as const;
const CLAVES_PROCEDENCIA = [
  "tabla",
  "id",
  "version",
  "reaperturaId",
  "activa",
  "versionOrigen",
  "versionDestino",
  "correlacion",
] as const;

const DECIMAL_CANONICO = /^(?:0|[1-9][0-9]*)$/;
const CORRELACION = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/;

function rechazo(campo: string, motivo: string): never {
  throw new Problem(
    422,
    "VALIDATION",
    `Detalle de validación inválido en «${campo}»: ${motivo}.`,
    { [campo]: motivo },
  );
}

/** Predicado único de decimal canónico: sin signo, ceros a la izquierda, exponente ni separador. */
export function esDecimalCanonico(valor: unknown): valor is string {
  return typeof valor === "string" && DECIMAL_CANONICO.test(valor);
}

/**
 * Identidad de la Referencia de negocio: `REF` + dígitos, mayúsculas, sin
 * prefijo alternativo, sin sufijo y con longitud acotada. Es el mismo dominio
 * que impone `referencias.id` en el esquema, más el tope técnico de §2.3.
 */
export function esIdReferencia(valor: unknown): valor is string {
  return typeof valor === "string" && PATRON_REFERENCIA.test(valor);
}

/** Cada `EntidadPermitida` valida **su** formato; no hay formato compartido. */
export function esIdDeEntidad(
  entidad: EntidadPermitida,
  valor: unknown,
): valor is string {
  return entidad === "referencia"
    ? esIdReferencia(valor)
    : esDecimalCanonico(valor);
}

/** Mensaje de formato por entidad, para que el rechazo nombre el dominio real. */
export function motivoIdDeEntidad(entidad: EntidadPermitida): string {
  return entidad === "referencia"
    ? "se esperaba un id de Referencia «REF» seguido de dígitos"
    : "se esperaba texto decimal canónico";
}

/**
 * Serializa un entero ya calculado por el servidor como decimal canónico.
 * Nunca acepta un `number` de payload: es una ayuda de producción, no una
 * puerta de entrada.
 */
export function decimalCanonico(valor: number | bigint): string {
  if (typeof valor === "number" && !Number.isSafeInteger(valor))
    throw new Error("Decimal canónico inválido: sólo enteros seguros.");
  const texto = valor.toString();
  if (!DECIMAL_CANONICO.test(texto))
    throw new Error("Decimal canónico inválido: sólo enteros no negativos.");
  return texto;
}

function objetoExacto(
  valor: unknown,
  claves: readonly string[],
  campo: string,
): Record<string, unknown> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor))
    rechazo(campo, "se esperaba un objeto");
  const propio = valor as Record<string, unknown>;
  const extra = Object.keys(propio).filter((clave) => !claves.includes(clave));
  if (extra.length) rechazo(campo, `clave no admitida «${extra[0]}»`);
  const faltante = claves.filter((clave) => !(clave in propio));
  if (faltante.length) rechazo(campo, `falta la clave «${faltante[0]}»`);
  return propio;
}

/**
 * Rechazo mecánico de números JSON. Se aplica a la entrada completa antes de
 * cualquier otra comprobación, de modo que ninguna cifra —bajo una clave
 * permitida, desconocida o anidada— pueda colarse en el detalle.
 */
function sinNumeros(valor: unknown, campo = "detalle"): void {
  if (typeof valor === "number")
    rechazo(campo, "no se admite ningún número JSON");
  if (Array.isArray(valor)) {
    for (const item of valor) sinNumeros(item, campo);
    return;
  }
  if (typeof valor === "object" && valor !== null)
    for (const item of Object.values(valor)) sinNumeros(item, campo);
}

function textoOpcional(valor: unknown, campo: string): string | null {
  if (valor === null) return null;
  if (typeof valor !== "string") rechazo(campo, "se esperaba texto o null");
  if (!CORRELACION.test(valor)) rechazo(campo, "identificador técnico inválido");
  return valor;
}

function enumCerrado<T extends string>(
  valor: unknown,
  admitidos: readonly T[],
  campo: string,
): T {
  if (
    typeof valor !== "string" ||
    !(admitidos as readonly string[]).includes(valor)
  )
    rechazo(campo, `valor no admitido «${String(valor)}»`);
  return valor as T;
}

function decimalObligatorio(valor: unknown, campo: string): string {
  if (!esDecimalCanonico(valor))
    rechazo(campo, "se esperaba texto decimal canónico");
  return valor;
}

function decimalOpcional(valor: unknown, campo: string): string | null {
  if (valor === null) return null;
  return decimalObligatorio(valor, campo);
}

function lista<T extends string>(
  valor: unknown,
  admitidos: readonly T[],
  campo: string,
): T[] {
  if (!Array.isArray(valor)) rechazo(campo, "se esperaba un array");
  if (valor.length > admitidos.length)
    rechazo(campo, "demasiados elementos");
  const vistos = new Set<T>();
  const salida: T[] = [];
  for (const item of valor) {
    const codigo = enumCerrado(item, admitidos, campo);
    if (vistos.has(codigo)) rechazo(campo, `código repetido «${codigo}»`);
    vistos.add(codigo);
    salida.push(codigo);
  }
  return salida.sort(
    (a, b) => admitidos.indexOf(a) - admitidos.indexOf(b),
  );
}

function hechos(valor: unknown): HechoValidado[] {
  if (!Array.isArray(valor)) rechazo("hechos", "se esperaba un array");
  if (valor.length > LIMITES_DETALLE.hechos)
    rechazo("hechos", "demasiados elementos");
  const vistos = new Set<string>();
  return valor.map((item, indice) => {
    const campo = `hechos[${indice}]`;
    const hecho = objetoExacto(item, CLAVES_HECHO, campo);
    const entidad = enumCerrado(
      hecho.entidad,
      ENTIDADES_PERMITIDAS,
      `${campo}.entidad`,
    );
    const id = esIdDeEntidad(entidad, hecho.id)
      ? (hecho.id as string)
      : rechazo(`${campo}.id`, motivoIdDeEntidad(entidad));
    const revision = decimalObligatorio(hecho.revision, `${campo}.revision`);
    const clave = `${entidad}:${id}`;
    if (vistos.has(clave)) rechazo(campo, `hecho repetido «${clave}»`);
    vistos.add(clave);
    return { entidad, id, revision };
  });
}

function ciclos(valor: unknown): CicloValidado[] {
  if (!Array.isArray(valor)) rechazo("ciclos", "se esperaba un array");
  if (valor.length > LIMITES_DETALLE.ciclos)
    rechazo("ciclos", "demasiados elementos");
  const vistos = new Set<string>();
  return valor.map((item, indice) => {
    const campo = `ciclos[${indice}]`;
    const ciclo = objetoExacto(item, CLAVES_CICLO, campo);
    const id = decimalObligatorio(ciclo.id, `${campo}.id`);
    if (vistos.has(id)) rechazo(campo, `ciclo repetido «${id}»`);
    vistos.add(id);
    return {
      id,
      impactos: lista(ciclo.impactos, IMPACTOS_MATERIALES, `${campo}.impactos`),
    };
  });
}

function cobertura(valor: unknown): CoberturaValidada[] {
  if (!Array.isArray(valor)) rechazo("cobertura", "se esperaba un array");
  if (valor.length > LIMITES_DETALLE.cobertura)
    rechazo("cobertura", "demasiados elementos");
  const vistos = new Set<string>();
  return valor.map((item, indice) => {
    const campo = `cobertura[${indice}]`;
    const entrada = objetoExacto(item, CLAVES_COBERTURA, campo);
    const fuente = enumCerrado(
      entrada.fuente,
      FUENTES_COBERTURA,
      `${campo}.fuente`,
    );
    if (vistos.has(fuente)) rechazo(campo, `fuente repetida «${fuente}»`);
    vistos.add(fuente);
    const estado = enumCerrado(
      entrada.estado,
      ESTADOS_COBERTURA,
      `${campo}.estado`,
    );
    const causas = lista(entrada.causas, CAUSAS_COBERTURA, `${campo}.causas`);
    if (estado === "Disponible" && causas.length)
      rechazo(`${campo}.causas`, "una fuente disponible no declara causas");
    if (estado !== "Disponible" && !causas.length)
      rechazo(`${campo}.causas`, "una fuente parcial o ausente exige causa");
    return { fuente, estado, causas };
  });
}

function procedencia(valor: unknown): ProcedenciaValidada | null {
  if (valor === null) return null;
  const entrada = objetoExacto(valor, CLAVES_PROCEDENCIA, "procedencia");
  const tabla = enumCerrado(entrada.tabla, TABLAS_LEGADAS, "procedencia.tabla");
  const compuesta = TABLAS_LEGADAS_SIN_ID.includes(tabla);
  const id = decimalOpcional(entrada.id, "procedencia.id");
  if (compuesta && id !== null)
    rechazo("procedencia.id", "la clave legada es compuesta: id debe ser null");
  if (!compuesta && id === null)
    rechazo("procedencia.id", "la tabla legada exige id");
  if (entrada.activa !== null && typeof entrada.activa !== "boolean")
    rechazo("procedencia.activa", "se esperaba booleano o null");
  if ((entrada.activa !== null) !== (tabla === "reapertura_activa"))
    rechazo(
      "procedencia.activa",
      "sólo la fila activa de reapertura declara «activa»",
    );
  const version = decimalOpcional(entrada.version, "procedencia.version");
  const versionOrigen = decimalOpcional(
    entrada.versionOrigen,
    "procedencia.versionOrigen",
  );
  const versionDestino = decimalOpcional(
    entrada.versionDestino,
    "procedencia.versionDestino",
  );
  const reaperturaId = decimalOpcional(
    entrada.reaperturaId,
    "procedencia.reaperturaId",
  );
  const correlacion = textoOpcional(entrada.correlacion, "procedencia.correlacion");
  if (
    (tabla === "cierres" || tabla === "fotos_cierre" || tabla === "cierre_vinculos") &&
    version === null && versionOrigen === null && versionDestino === null
  )
    rechazo(
      "procedencia.version",
      "la tabla legada exige la versión que la identifica",
    );
  if (tabla === "cierre_vinculos" && (versionOrigen === null || versionDestino === null))
    rechazo(
      "procedencia.versionOrigen",
      "el vínculo exige versionOrigen y versionDestino",
    );
  if (tabla === "reapertura_activa" && reaperturaId === null)
    rechazo("procedencia.reaperturaId", "la fila activa exige reaperturaId");
  return {
    tabla,
    id,
    version,
    reaperturaId,
    activa: entrada.activa as boolean | null,
    versionOrigen,
    versionDestino,
    correlacion,
  };
}

/**
 * Constructor central: valida y **copia** sólo los campos de la lista blanca.
 * Ninguna propiedad del objeto de entrada sobrevive por referencia.
 */
export function construirDetalleValidacion(entrada: unknown): DetalleValidacion {
  sinNumeros(entrada);
  const objeto = objetoExacto(entrada, CLAVES_DETALLE, "detalle");
  return {
    hechos: hechos(objeto.hechos),
    ciclos: ciclos(objeto.ciclos),
    cobertura: cobertura(objeto.cobertura),
    procedencia: procedencia(objeto.procedencia),
  };
}

/** Alias normativo del constructor: valida y devuelve la copia canónica. */
export function validarDetalleValidacion(entrada: unknown): DetalleValidacion {
  return construirDetalleValidacion(entrada);
}

/** Parseo estricto del texto persistido; un JSON roto es un fallo explícito. */
export function parsearDetalleValidacion(texto: string): DetalleValidacion {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    rechazo("detalle", "JSON ilegible");
  }
  return construirDetalleValidacion(crudo);
}

/**
 * Serialización canónica: orden fijo de claves y de arrays (por enum y por ID
 * numérico) para que dos construcciones equivalentes produzcan el mismo texto.
 */
export function serializarDetalleValidacion(detalle: DetalleValidacion): string {
  const copia = construirDetalleValidacion(detalle);
  const orden = (a: string, b: string) =>
    a.length === b.length ? (a < b ? -1 : a > b ? 1 : 0) : a.length - b.length;
  return JSON.stringify({
    hechos: [...copia.hechos]
      .sort(
        (a, b) =>
          ENTIDADES_PERMITIDAS.indexOf(a.entidad) -
            ENTIDADES_PERMITIDAS.indexOf(b.entidad) || orden(a.id, b.id),
      )
      .map((hecho) => ({
        entidad: hecho.entidad,
        id: hecho.id,
        revision: hecho.revision,
      })),
    ciclos: [...copia.ciclos]
      .sort((a, b) => orden(a.id, b.id))
      .map((ciclo) => ({ id: ciclo.id, impactos: ciclo.impactos })),
    cobertura: [...copia.cobertura]
      .sort(
        (a, b) =>
          FUENTES_COBERTURA.indexOf(a.fuente) - FUENTES_COBERTURA.indexOf(b.fuente),
      )
      .map((fuente) => ({
        fuente: fuente.fuente,
        estado: fuente.estado,
        causas: fuente.causas,
      })),
    procedencia: copia.procedencia
      ? {
          tabla: copia.procedencia.tabla,
          id: copia.procedencia.id,
          version: copia.procedencia.version,
          reaperturaId: copia.procedencia.reaperturaId,
          activa: copia.procedencia.activa,
          versionOrigen: copia.procedencia.versionOrigen,
          versionDestino: copia.procedencia.versionDestino,
          correlacion: copia.procedencia.correlacion,
        }
      : null,
  });
}