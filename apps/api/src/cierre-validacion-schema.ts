import type { Database } from "bun:sqlite";
import {
  CAUSAS_COBERTURA,
  ENTIDADES_PERMITIDAS,
  ESTADOS_COBERTURA,
  FUENTES_COBERTURA,
  ID_MOVIMIENTO,
  ID_REFERENCIA,
  IMPACTOS_MATERIALES,
  LIMITES_DETALLE,
  TABLAS_LEGADAS,
  TABLAS_LEGADAS_SIN_ID,
} from "./cierre-validacion-dto";

/**
 * SPEC38 · I1 — esquema **v32**: estado de validación, auditoría de validación e
 * idempotencia de la operación.
 *
 * Alcance de este incremento: sólo esquema, guardas de datos, importación
 * conservadora y metadatos §7.3. No crea rutas, lectores, preview, UI ni borra
 * ninguna tabla. Las tablas de fotos, `cierres`, `cierre_audit`, reaperturas,
 * vínculos y periodos quedan intactas: #548 las retira después y sólo con
 * autorización propia.
 *
 * ## Por qué una migración aditiva de tablas nuevas
 * `cierres` no se reutiliza: es inmutable, exige foto por FK y sólo admite
 * `Cerrado` (§2.1). El estado de validación necesita mutar `dirty`,
 * metadatos de pendiente y la referencia humana, así que nace en tablas
 * nuevas. La migración crea tablas, no reconstruye ninguna existente.
 *
 * ## Estados y su guarda
 * Tres estados visibles no son tres columnas: son `SinValidar` (sin fila),
 * `Validada` (fila con `dirty=0`) y `Pendiente` (fila con `dirty=1`). El
 * esquema impone la coherencia que ningún servicio debe poder saltarse:
 *  - `dirty=1` exige `dirty_desde`, `dirty_ultimo`, `dirty_origen` y
 *    `dirty_motivos` (un array vacío es válido: es una transición, no un
 *    impacto medido).
 *  - `dirty=0` exige referencia humana completa —huella, versión de conjunto,
 *    actor e instante—, de modo que una fila limpia sin evidencia humana no
 *    existe.
 *  - `huella_validacion` y `version_conjunto` son pareja: o ambas o ninguna.
 *    `huella_validacion=null` dice «no hay referencia humana comparable en el
 *    conjunto nuevo», nunca «validado».
 *
 * ## Revisiones (§2.4)
 * Los triggers distinguen por **qué columnas cambian**, no por un parámetro del
 * cliente: marcar/reiterar exige `revision` igual y confirmar/validar exige
 * exactamente `revision+1`. Una disminución y un salto tienen mensaje propio.
 *
 * La revisión humana **no reutiliza evidencia**: `cierre_validacion_referencia_nueva`
 * exige un `revision_instante` estrictamente posterior al de la revisión previa
 * y rechaza repetir actor+instante+huella; `cierre_validacion_confirmacion`
 * añade, para la limpieza de una fila pendiente, instante posterior a
 * `dirty_ultimo`/`dirty_desde` y versión de conjunto sin reapuntar.
 *
 * Las tres ramas son independientes del estado `dirty`: avanzar `revision`
 * siempre exige referencia humana nueva, y una marca o reiteración —cambio de
 * `dirty` o de sus metadatos— no puede mover la revisión. La cronología de
 * `dirty_desde`/`dirty_ultimo` tampoco puede preceder a la referencia humana
 * vigente: si lo hiciera, la limpieza posterior podría compararse contra una
 * marca artificialmente vieja en lugar de contra la última revisión humana.
 *
 * ## DTO de auditoría (§2.3)
 * `detalle` se comprueba con `json_each`/`json_tree` y no con `json_valid` ni
 * una lista negra de nombres. El orden de las guardas es deliberado para que el
 * mensaje sea determinista: primero se rechaza **cualquier** `integer`/`real`
 * del árbol JSON —la regla «ningún `number`» es mecánica y no tiene
 * excepciones—, después la forma exacta del sobre y luego cada rama. Las demás
 * guardas sólo se evalúan cuando el árbol no tiene números y el sobre es
 * exacto, así que dos violaciones distintas nunca compiten por el mensaje.
 * `IdExistente` no comparte formato: `movimiento` es decimal canónico y
 * `referencia` es `REF`+dígitos, el dominio real de `referencias.id`.
 *
 * ## Metadatos que sobreviven (§7.3)
 * `cierre_validacion_manifiesto` es el recibo tipado por tabla+PK de los
 * metadatos de periodo y de las identidades compuestas: identidad con claves
 * exactas por tabla, procedencia, `observado_utc` y huella, sin cifras. Es
 * append-only y su PK impide duplicar; la migración de `cierre-validacion-metadatos.ts`
 * lo llena junto a los eventos `legado_*` que sí caben en el DTO.
 *
 * `EntidadPermitida`, fuentes, tablas y códigos salen del módulo del DTO: la
 * base y el constructor de servicio no pueden enumerar cosas distintas.
 */

/** Acciones del evento de validación, todas nombradas en la SPEC. */
export const ACCIONES_AUDITORIA = [
  /** Validación humana de un ciclo sin fila o migrado. */
  "validar",
  /** Revalidación voluntaria de un ciclo ya validado. */
  "revalidar",
  /** Única limpieza de una fila pendiente. */
  "confirmar_revision",
  /** Marca por impacto material medido. */
  "dirty_marcado",
  /** Nuevo impacto real sobre una fila ya pendiente. */
  "dirty_reiterado",
  /** La operación material devuelve el ciclo a la referencia comparable. */
  "reversion",
  /** Transición E1b: el cierre legado entra pendiente, sin motivo material. */
  "migracion",
  /** Transición por restauración de hechos fuera de banda. */
  "restauracion",
  /** Reacreditación de Anticipos (clase B). */
  "reacreditacion",
  /** Corrección estructural del Inicio de un ciclo. */
  "rectificar_inicio",
  /** Corrección del Saldo inicial (S0) de un ciclo. */
  "rectificar_s0",
  /** Metadatos legados migrados antes de #548. */
  "legado_reapertura_activa",
  "legado_cierre_vinculo",
  "legado_cierre_audit",
  "legado_reapertura",
] as const;
export type AccionAuditoria = (typeof ACCIONES_AUDITORIA)[number];

/** Procedencia de la marca pendiente. `Operacion` es un impacto medido. */
export const ORIGENES_PENDIENTE = [
  "Operacion",
  "Migracion",
  "Restauracion",
  "ReaperturaActiva",
  "ReexpresionAtribucion",
] as const;
export type OrigenPendiente = (typeof ORIGENES_PENDIENTE)[number];

/** Prefijos de `origen`: identidad del acto, nunca una magnitud. */
export const PREFIJOS_ORIGEN = ["MIGRACION", "RESTAURACION"] as const;

/**
 * Operaciones con recibo durable. `migracion` guarda el recibo por tabla+PK de
 * origen, que es lo que hace idempotente la repetición de E1b.
 */
export const OPERACIONES_VALIDACION = [
  "validar",
  "revalidar",
  "confirmar_revision",
  "migracion",
  /** §4.1: la corrección estructural del Inicio tiene recibo idempotente. */
  "rectificar_inicio",
  /** §4.1: la corrección de S0 tiene recibo idempotente. */
  "rectificar_s0",
] as const;

const lista = (valores: readonly string[]) =>
  valores.map((valor) => `'${valor}'`).join(",");

/** Decimal canónico: sin signo, sin ceros a la izquierda, sin exponente ni separador. */
const decimal = (columna: string) =>
  `(${columna} IS NULL OR (length(${columna}) BETWEEN 1 AND 18
     AND ${columna} NOT GLOB '*[^0-9]*'
     AND ${columna} = CAST(CAST(${columna} AS INTEGER) AS TEXT)))`;

const huella = (columna: string) =>
  `(${columna} IS NULL OR (length(${columna})=64 AND ${columna} NOT GLOB '*[^a-f0-9]*'))`;

/** Instante UTC ISO con milisegundos, el formato ya usado por el dominio. */
const instante = (columna: string) =>
  `(${columna} IS NULL OR (length(${columna})=24 AND ${columna} GLOB
     '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'))`;

const idTecnico = (columna: string) =>
  `(${columna} IS NULL OR (length(${columna}) BETWEEN 1 AND 200
     AND ${columna} NOT GLOB '*[^A-Za-z0-9:._-]*'))`;

/** Instante obligatorio, mismo formato UTC con milisegundos que el dominio. */
const instanteObligatorio = (columna: string) => `length(${columna})=24 AND ${columna} GLOB
  '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'`;
const INSTANTE_OBLIGATORIO = instanteObligatorio("instante");

/* ------------------------------------------------------------------ *
 * Predicados del DTO sobre `NEW.detalle`
 * ------------------------------------------------------------------ */

const ARBOL_SIN_NUMEROS = `NOT EXISTS(
  SELECT 1 FROM json_tree(NEW.detalle) WHERE type IN ('integer','real'))`;

const SOBRE_EXACTO = `json_type(NEW.detalle)='object'
  AND (SELECT COUNT(*) FROM json_each(NEW.detalle))=4
  AND (SELECT COUNT(*) FROM json_each(NEW.detalle)
        WHERE key IN ('hechos','ciclos','cobertura','procedencia'))=4`;

/** Texto decimal canónico en una ruta de `NEW.detalle`. */
const canonicoPath = (ruta: string) => {
  const valor = `json_extract(NEW.detalle,'${ruta}')`;
  return `(json_type(NEW.detalle,'${ruta}')='text'
    AND length(${valor}) BETWEEN 1 AND 18
    AND ${valor} NOT GLOB '*[^0-9]*'
    AND ${valor} = CAST(CAST(${valor} AS INTEGER) AS TEXT))`;
};

/**
 * Texto decimal canónico dentro de un elemento ya extraído. Se usa `typeof` y
 * no `json_type`: `json_type` de un valor ya extraído reinterpreta el texto
 * «1» como número JSON, mientras que `typeof` dice el tipo SQL real.
 */
const canonicoValor = (valor: string) =>
  `(typeof(${valor})='text'
    AND length(${valor}) BETWEEN ${ID_MOVIMIENTO.minimo} AND ${ID_MOVIMIENTO.maximo}
    AND ${valor} NOT GLOB '*[^0-9]*'
    AND ${valor} = CAST(CAST(${valor} AS INTEGER) AS TEXT))`;

/**
 * Identidad de Referencia de negocio dentro de un elemento ya extraído: mismo
 * dominio que `referencias.id` (`REF` mayúsculas + dígitos, mínimo 6) con el
 * tope técnico de longitud. `GLOB` es sensible a mayúsculas, así que `ref001`
 * y `REF001x` caen aquí y no llegan a la comprobación de existencia.
 */
const referenciaValor = (valor: string) =>
  `(typeof(${valor})='text'
    AND length(${valor}) BETWEEN ${ID_REFERENCIA.minimo} AND ${ID_REFERENCIA.maximo}
    AND ${valor} GLOB '${ID_REFERENCIA.prefijo}[0-9]*'
    AND substr(${valor},4) NOT GLOB '*[^0-9]*')`;

/** Predicado de identidad por entidad: cada una valida su formato, sin atajos. */
const idPorEntidad = (alias: string) =>
  `((${alias}='movimiento' AND ${canonicoValor("json_extract(h.value,'$.id')")})
    OR (${alias}='referencia' AND ${referenciaValor("json_extract(h.value,'$.id')")}))`;

const clavesExactas = (alias: string, claves: readonly string[], cuantas: number) =>
  `((SELECT COUNT(*) FROM json_each(${alias}))=${cuantas}
    AND (SELECT COUNT(*) FROM json_each(${alias})
          WHERE key IN (${lista(claves)}))=${cuantas})`;

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

/**
 * Listas **congeladas** de v32. La cobertura está embebida en triggers creados
 * en C32; ampliarlas en sitio reescribiría ese contrato histórico. La versión
 * vigente (v34) añade `devoluciones` y las causas de SPEC39 mediante triggers
 * recreados, sin tocar C14–C33.
 */
const FUENTES_COBERTURA_V32 = [
  "movimientos",
  "efectivo",
  "posiciones",
  "plan",
  "e35",
  "deuda",
  "valoracion",
  "anticipos",
] as const;
const CAUSAS_COBERTURA_V32 = [
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
] as const;
const LIMITE_COBERTURA_V32 = 8;
const LIMITE_CAUSAS_V32 = 12;

/** Guarda reutilizable de un array de cobertura (`detalle.cobertura` o la columna). */
const coberturaValidaCon = (
  alias: string,
  fuentes: readonly string[],
  causas: readonly string[],
  limiteFuentes: number,
  limiteCausas: number,
) => `
  json_type(${alias})='array'
  AND json_array_length(${alias})<=${limiteFuentes}
  AND NOT EXISTS (
    SELECT 1 FROM json_each(${alias}) b WHERE NOT (
      json_type(b.value)='object'
      AND ${clavesExactas("b.value", CLAVES_COBERTURA, 3)}
      AND json_extract(b.value,'$.fuente') IN (${lista(fuentes)})
      AND json_extract(b.value,'$.estado') IN (${lista(ESTADOS_COBERTURA)})
      AND json_type(b.value,'$.causas')='array'
      AND json_array_length(b.value,'$.causas')<=${limiteCausas}
      AND NOT EXISTS (
        SELECT 1 FROM json_each(b.value,'$.causas') c
         WHERE typeof(c.value)<>'text'
            OR c.value NOT IN (${lista(causas)}))
      AND NOT (
        json_extract(b.value,'$.estado')='Disponible'
        AND json_array_length(b.value,'$.causas')>0)
      AND NOT (
        json_extract(b.value,'$.estado')<>'Disponible'
        AND json_array_length(b.value,'$.causas')=0)
    ))`;

/** Guarda de C32, con las listas de v32 congeladas. */
const coberturaValidaV32 = (alias: string) =>
  coberturaValidaCon(
    alias,
    FUENTES_COBERTURA_V32,
    CAUSAS_COBERTURA_V32,
    LIMITE_COBERTURA_V32,
    LIMITE_CAUSAS_V32,
  );

/** Guarda vigente (v34): incluye `devoluciones` y las causas de SPEC39. */
const coberturaValidaV34 = (alias: string) =>
  coberturaValidaCon(
    alias,
    FUENTES_COBERTURA,
    CAUSAS_COBERTURA,
    LIMITES_DETALLE.cobertura,
    LIMITES_DETALLE.causas,
  );

const SIN_ID = lista(TABLAS_LEGADAS_SIN_ID);

/* ------------------------------------------------------------------ *
 * Predicados del recibo durable (`validacion_attempts.response`)
 * ------------------------------------------------------------------ */

/** Los tres estados visibles de §2.2; el recibo no inventa un cuarto. */
export const ESTADOS_VALIDACION = [
  "SinValidar",
  "Validada",
  "Pendiente",
] as const;

const CLAVES_RECIBO = [
  "operacionId",
  "ciclos",
  "auditIds",
  "cierresDirty",
] as const;
const CLAVES_RECIBO_CICLO = ["id", "revision", "estado"] as const;
const CLAVES_RECIBO_DIRTY = [
  "ciclo",
  "rango",
  "estadoValidacion",
  "validado",
  "dirtyPrevio",
] as const;
const CLAVES_RECIBO_RANGO = ["desde", "hasta"] as const;

/** Topes del recibo: un array desmesurado no es un recibo, es un payload. */
export const LIMITES_RECIBO = {
  ciclos: LIMITES_DETALLE.ciclos,
  auditIds: LIMITES_DETALLE.hechos,
  cierresDirty: LIMITES_DETALLE.ciclos,
} as const;

/**
 * Nombres que pueden transportar un importe, con sus variantes. La lista
 * blanca de claves ya los excluye; esta comprobación es la defensa en
 * profundidad que sobrevive a una clave añadida por error en el futuro.
 */
export const CLAVES_IMPORTE = [
  "importe",
  "total",
  "saldo",
  "cantidad",
  "centimo",
  "monto",
  "cifra",
  "precio",
  "suma",
  "coste",
  "bruto",
  "neto",
] as const;

/** Ningún `integer`/`real` en todo el árbol JSON: la regla no tiene excepciones. */
const arbolSinNumeros = (alias: string) =>
  `NOT EXISTS (SELECT 1 FROM json_tree(${alias}) WHERE type IN ('integer','real'))`;

/** Ninguna clave —en ningún nivel— puede nombrar un importe ni su variante. */
const arbolSinClavesImporte = (alias: string) =>
  `NOT EXISTS (SELECT 1 FROM json_tree(${alias})
     WHERE type='object' AND key IS NOT NULL AND (
       ${CLAVES_IMPORTE.map((clave) => `lower(key) LIKE '%${clave}%'`).join(" OR ")}))`;

/**
 * Ningún texto puede esconder una cifra monetaria: separador decimal o de
 * millar entre dígitos, o símbolo de moneda. Un identificador técnico, una
 * fecha ISO y un enum de estado no contienen ninguno de los dos.
 */
const arbolSinImporteEnTexto = (alias: string) =>
  `NOT EXISTS (SELECT 1 FROM json_tree(${alias})
     WHERE type='text' AND (value GLOB '*[0-9][.,][0-9]*'
        OR value LIKE '%€%' OR value LIKE '%$%'))`;

/** Fecha ISO de calendario en una ruta del recibo. */
const fechaPath = (alias: string, ruta: string) =>
  `(json_type(${alias},'${ruta}')='text'
     AND length(json_extract(${alias},'${ruta}'))=10
     AND json_extract(${alias},'${ruta}')
         GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
     AND date(json_extract(${alias},'${ruta}'))=json_extract(${alias},'${ruta}'))`;

/** Identificador técnico (`operacionId`) en texto y con longitud acotada. */
const idTecnicoPath = (alias: string, ruta: string) =>
  `(json_type(${alias},'${ruta}')='text'
     AND length(json_extract(${alias},'${ruta}')) BETWEEN 1 AND 200
     AND json_extract(${alias},'${ruta}') NOT GLOB '*[^A-Za-z0-9:._-]*')`;

/**
 * Forma exacta del recibo de §2.4/ANEXO §2, comprobada **en la base**: claves
 * de lista blanca en cada nivel, tipos, arrays acotados y sin repetidos, cero
 * `number` JSON, cero claves o textos que puedan transportar un importe.
 */
const reciboValido = (alias: string) => `
  json_type(${alias})='object'
  AND ${clavesExactas(alias, CLAVES_RECIBO, 4)}
  AND ${idTecnicoPath(alias, "$.operacionId")}
  AND json_type(${alias},'$.ciclos')='array'
  AND json_array_length(${alias},'$.ciclos')<=${LIMITES_RECIBO.ciclos}
  AND json_type(${alias},'$.auditIds')='array'
  AND json_array_length(${alias},'$.auditIds')<=${LIMITES_RECIBO.auditIds}
  AND json_type(${alias},'$.cierresDirty')='array'
  AND json_array_length(${alias},'$.cierresDirty')<=${LIMITES_RECIBO.cierresDirty}
  AND NOT EXISTS (
    SELECT 1 FROM json_each(${alias},'$.ciclos') c WHERE NOT (
      json_type(c.value)='object'
      AND ${clavesExactas("c.value", CLAVES_RECIBO_CICLO, 3)}
      AND ${canonicoValor("json_extract(c.value,'$.id')")}
      AND ${canonicoValor("json_extract(c.value,'$.revision')")}
      AND json_type(c.value,'$.estado')='text'
      AND json_extract(c.value,'$.estado') IN (${lista(ESTADOS_VALIDACION)})))
  AND NOT EXISTS (
    SELECT 1 FROM json_each(${alias},'$.auditIds') a
     WHERE NOT ${canonicoValor("a.value")})
  AND NOT EXISTS (
    SELECT 1 FROM json_each(${alias},'$.cierresDirty') d WHERE NOT (
      json_type(d.value)='object'
      AND ${clavesExactas("d.value", CLAVES_RECIBO_DIRTY, 5)}
      AND ${canonicoValor("json_extract(d.value,'$.ciclo')")}
      AND json_type(d.value,'$.rango')='object'
      AND ${clavesExactas("json_extract(d.value,'$.rango')", CLAVES_RECIBO_RANGO, 2)}
      AND ${fechaPath("d.value", "$.rango.desde")}
      AND ${fechaPath("d.value", "$.rango.hasta")}
      AND json_extract(d.value,'$.rango.hasta')>=json_extract(d.value,'$.rango.desde')
      AND json_type(d.value,'$.estadoValidacion')='text'
      AND json_extract(d.value,'$.estadoValidacion') IN (${lista(ESTADOS_VALIDACION)})
      AND json_type(d.value,'$.validado') IN ('true','false')
      AND json_type(d.value,'$.dirtyPrevio') IN ('true','false')))
  AND (SELECT COUNT(*) FROM json_each(${alias},'$.ciclos'))
      = (SELECT COUNT(DISTINCT json_extract(value,'$.id'))
           FROM json_each(${alias},'$.ciclos'))
  AND (SELECT COUNT(*) FROM json_each(${alias},'$.auditIds'))
      = (SELECT COUNT(DISTINCT value) FROM json_each(${alias},'$.auditIds'))
  AND (SELECT COUNT(*) FROM json_each(${alias},'$.cierresDirty'))
      = (SELECT COUNT(DISTINCT json_extract(value,'$.ciclo'))
           FROM json_each(${alias},'$.cierresDirty'))`;

/** Guarda completa del recibo: mecánica de cifras + forma exacta. */
const RECIBO_VALIDO = (alias: string) =>
  `${arbolSinNumeros(alias)} AND ${arbolSinClavesImporte(alias)}
   AND ${arbolSinImporteEnTexto(alias)} AND (${reciboValido(alias)})`;

/* ------------------------------------------------------------------ *
 * Predicados del manifiesto de migración (§7.3)
 *
 * El manifiesto es la identidad tipada por tabla+PK de lo que no cabe —o no
 * debe forzarse— dentro de un evento de auditoría: los metadatos de periodo y
 * las identidades compuestas. Tipos aquí significa claves exactas por tabla y
 * formato de dominio en cada valor, sin cifras.
 * ------------------------------------------------------------------ */

export const TABLAS_MANIFIESTO = [
  "reaperturas",
  "reapertura_activa",
  "cierre_vinculos",
  "cierre_audit",
  "fotos_periodo",
  "foto_periodo_componentes",
] as const;
export type TablaManifiesto = (typeof TABLAS_MANIFIESTO)[number];

const decPath = (alias: string, ruta: string) => {
  const valor = `json_extract(${alias},'${ruta}')`;
  return `(json_type(${alias},'${ruta}')='text'
    AND length(${valor}) BETWEEN 1 AND 18
    AND ${valor} NOT GLOB '*[^0-9]*'
    AND ${valor} = CAST(CAST(${valor} AS INTEGER) AS TEXT))`;
};
const decONulo = (alias: string, ruta: string) =>
  `(json_type(${alias},'${ruta}')='null' OR ${decPath(alias, ruta)})`;
/** Correlación legada: identidad técnica en texto, nunca una magnitud. */
const tecnicoPath = (alias: string, ruta: string) => {
  const valor = `json_extract(${alias},'${ruta}')`;
  return `(json_type(${alias},'${ruta}')='text'
    AND length(${valor}) BETWEEN 1 AND 200
    AND ${valor} NOT GLOB '*[^A-Za-z0-9:._-]*')`;
};
const tecnicoONulo = (alias: string, ruta: string) =>
  `(json_type(${alias},'${ruta}')='null' OR ${tecnicoPath(alias, ruta)})`;
const shaPath = (alias: string, ruta: string) => {
  const valor = `json_extract(${alias},'${ruta}')`;
  return `(json_type(${alias},'${ruta}')='text' AND length(${valor})=64
    AND ${valor} NOT GLOB '*[^a-f0-9]*')`;
};
const shaONulo = (alias: string, ruta: string) =>
  `(json_type(${alias},'${ruta}')='null' OR ${shaPath(alias, ruta)})`;
const instantePath = (alias: string, ruta: string) => {
  const valor = `json_extract(${alias},'${ruta}')`;
  return `(json_type(${alias},'${ruta}')='text' AND length(${valor})=24
    AND ${valor} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')`;
};
const textoPath = (alias: string, ruta: string) => {
  const valor = `json_extract(${alias},'${ruta}')`;
  return `(json_type(${alias},'${ruta}')='text'
    AND length(trim(${valor}))>0 AND length(${valor})<=200)`;
};
const enumPath = (alias: string, ruta: string, admitidos: readonly string[]) =>
  `(json_type(${alias},'${ruta}')='text'
    AND json_extract(${alias},'${ruta}') IN (${lista(admitidos)}))`;

/** Claves exactas de la identidad tipada por tabla de origen. */
export const CLAVES_MANIFIESTO: Readonly<Record<TablaManifiesto, readonly string[]>> =
  {
    reaperturas: ["ciclo", "versionOrigen", "tipo", "correlacion", "reaperturaOrigen"],
    reapertura_activa: ["ciclo", "reaperturaId"],
    cierre_vinculos: [
      "ciclo",
      "versionOrigen",
      "versionDestino",
      "reaperturaId",
      "correlacion",
    ],
    cierre_audit: ["ciclo", "version", "accion"],
    fotos_periodo: [
      "tipo",
      "ejercicio",
      "trimestre",
      "version",
      "appVersion",
      "schemaVersion",
      "creadoUtc",
      "fingerprint",
    ],
    foto_periodo_componentes: [
      "periodoId",
      "ciclo",
      "versionFoto",
      "fingerprintFoto",
      "estado",
    ],
  };

const VERSION_PERIODO = `(json_type(NEW.identidad,'$.version')='text'
  AND length(json_extract(NEW.identidad,'$.version')) BETWEEN 2 AND 20
  AND json_extract(NEW.identidad,'$.version') GLOB 'A[0-9]*'
  AND substr(json_extract(NEW.identidad,'$.version'),2) NOT GLOB '*[^0-9]*'
  AND substr(json_extract(NEW.identidad,'$.version'),2)
      = CAST(CAST(substr(json_extract(NEW.identidad,'$.version'),2) AS INTEGER) AS TEXT))`;

/** Forma exacta de la identidad según la tabla de origen declarada. */
const IDENTIDAD_MANIFIESTO = `(
  (NEW.tabla='reaperturas'
   AND ${clavesExactas("NEW.identidad", CLAVES_MANIFIESTO.reaperturas, 5)}
   AND ${decPath("NEW.identidad", "$.ciclo")}
   AND ${decPath("NEW.identidad", "$.versionOrigen")}
   AND ${enumPath("NEW.identidad", "$.tipo", ["reapertura", "cancelacion"])}
   AND ${tecnicoONulo("NEW.identidad", "$.correlacion")}
   AND ${decONulo("NEW.identidad", "$.reaperturaOrigen")})
  OR (NEW.tabla='reapertura_activa'
   AND ${clavesExactas("NEW.identidad", CLAVES_MANIFIESTO.reapertura_activa, 2)}
   AND ${decPath("NEW.identidad", "$.ciclo")}
   AND ${decPath("NEW.identidad", "$.reaperturaId")})
  OR (NEW.tabla='cierre_vinculos'
   AND ${clavesExactas("NEW.identidad", CLAVES_MANIFIESTO.cierre_vinculos, 5)}
   AND ${decPath("NEW.identidad", "$.ciclo")}
   AND ${decPath("NEW.identidad", "$.versionOrigen")}
   AND ${decPath("NEW.identidad", "$.versionDestino")}
   AND ${decPath("NEW.identidad", "$.reaperturaId")}
   AND ${tecnicoONulo("NEW.identidad", "$.correlacion")})
  OR (NEW.tabla='cierre_audit'
   AND ${clavesExactas("NEW.identidad", CLAVES_MANIFIESTO.cierre_audit, 3)}
   AND ${decPath("NEW.identidad", "$.ciclo")}
   AND ${decPath("NEW.identidad", "$.version")}
   AND ${enumPath("NEW.identidad", "$.accion", [
     "cierre",
     "cierre_fuera_de_orden",
   ])})
  OR (NEW.tabla='fotos_periodo'
   AND ${clavesExactas("NEW.identidad", CLAVES_MANIFIESTO.fotos_periodo, 8)}
   AND ${enumPath("NEW.identidad", "$.tipo", ["Trimestre", "Anio"])}
   AND (json_type(NEW.identidad,'$.ejercicio')='text'
        AND length(json_extract(NEW.identidad,'$.ejercicio'))=4
        AND json_extract(NEW.identidad,'$.ejercicio') GLOB '[1-9][0-9][0-9][0-9]')
   AND ((json_type(NEW.identidad,'$.trimestre')='null')
        = (json_extract(NEW.identidad,'$.tipo')='Anio'))
   AND (json_type(NEW.identidad,'$.trimestre')='null'
        OR ${enumPath("NEW.identidad", "$.trimestre", ["1", "2", "3", "4"])})
   AND ${VERSION_PERIODO}
   AND ${textoPath("NEW.identidad", "$.appVersion")}
   AND ${decPath("NEW.identidad", "$.schemaVersion")}
   AND ${instantePath("NEW.identidad", "$.creadoUtc")}
   AND ${shaPath("NEW.identidad", "$.fingerprint")})
  OR (NEW.tabla='foto_periodo_componentes'
   AND ${clavesExactas("NEW.identidad", CLAVES_MANIFIESTO.foto_periodo_componentes, 5)}
   AND ${decPath("NEW.identidad", "$.periodoId")}
   AND ${decPath("NEW.identidad", "$.ciclo")}
   AND ${decONulo("NEW.identidad", "$.versionFoto")}
   AND ${shaONulo("NEW.identidad", "$.fingerprintFoto")}
   AND ${enumPath("NEW.identidad", "$.estado", [
     "Incluido",
     "ExcluidoSinCierre",
     "PendienteReCierre",
   ])}
   AND ((json_extract(NEW.identidad,'$.estado')='Incluido')
        = (json_type(NEW.identidad,'$.versionFoto')='text'))
   AND ((json_type(NEW.identidad,'$.versionFoto')='text')
        = (json_type(NEW.identidad,'$.fingerprintFoto')='text')))
)`;

/** Existencia semántica del ID/versión legados frente al `ciclo` del evento. */
const EXISTENCIA_PROCEDENCIA = `
  (json_extract(NEW.detalle,'$.procedencia.tabla')='cierres' AND EXISTS (
     SELECT 1 FROM cierres x WHERE x.ciclo=NEW.ciclo
      AND CAST(x.version AS TEXT)=json_extract(NEW.detalle,'$.procedencia.version')))
  OR (json_extract(NEW.detalle,'$.procedencia.tabla')='fotos_cierre' AND EXISTS (
     SELECT 1 FROM fotos_cierre x WHERE x.ciclo=NEW.ciclo
      AND CAST(x.version AS TEXT)=json_extract(NEW.detalle,'$.procedencia.version')))
  OR (json_extract(NEW.detalle,'$.procedencia.tabla')='cierre_vinculos' AND EXISTS (
     SELECT 1 FROM cierre_vinculos x WHERE x.ciclo=NEW.ciclo
      AND CAST(x.version_origen AS TEXT)=json_extract(NEW.detalle,'$.procedencia.versionOrigen')
      AND CAST(x.version_destino AS TEXT)=json_extract(NEW.detalle,'$.procedencia.versionDestino')))
  OR (json_extract(NEW.detalle,'$.procedencia.tabla')='cierre_audit' AND EXISTS (
     SELECT 1 FROM cierre_audit x WHERE x.ciclo=NEW.ciclo
      AND CAST(x.id AS TEXT)=json_extract(NEW.detalle,'$.procedencia.id')))
  OR (json_extract(NEW.detalle,'$.procedencia.tabla')='reaperturas' AND EXISTS (
     SELECT 1 FROM reaperturas x WHERE x.ciclo=NEW.ciclo
      AND CAST(x.id AS TEXT)=json_extract(NEW.detalle,'$.procedencia.id')))
  OR (json_extract(NEW.detalle,'$.procedencia.tabla')='reapertura_activa' AND EXISTS (
     SELECT 1 FROM reapertura_activa x WHERE x.ciclo=NEW.ciclo
      AND CAST(x.reapertura_id AS TEXT)=json_extract(NEW.detalle,'$.procedencia.id')))`;

const PROCEDENCIA_VALIDA = `
  json_type(NEW.detalle,'$.procedencia')='object'
  AND (SELECT COUNT(*) FROM json_each(NEW.detalle,'$.procedencia'))=8
  AND (SELECT COUNT(*) FROM json_each(NEW.detalle,'$.procedencia')
        WHERE key IN (${lista(CLAVES_PROCEDENCIA)}))=8
  AND json_extract(NEW.detalle,'$.procedencia.tabla') IN (${lista(TABLAS_LEGADAS)})
  AND ((json_type(NEW.detalle,'$.procedencia.id')='null')
       = (json_extract(NEW.detalle,'$.procedencia.tabla') IN (${SIN_ID})))
  AND (json_type(NEW.detalle,'$.procedencia.id')='null'
       OR ${canonicoPath("$.procedencia.id")})
  AND (json_type(NEW.detalle,'$.procedencia.activa') IN ('null','true','false'))
  AND ((json_type(NEW.detalle,'$.procedencia.activa')='null')
       = (json_extract(NEW.detalle,'$.procedencia.tabla')<>'reapertura_activa'))
  AND (json_type(NEW.detalle,'$.procedencia.version')='null'
       OR ${canonicoPath("$.procedencia.version")})
  AND (json_type(NEW.detalle,'$.procedencia.versionOrigen')='null'
       OR ${canonicoPath("$.procedencia.versionOrigen")})
  AND (json_type(NEW.detalle,'$.procedencia.versionDestino')='null'
       OR ${canonicoPath("$.procedencia.versionDestino")})
  AND (json_type(NEW.detalle,'$.procedencia.reaperturaId')='null'
       OR ${canonicoPath("$.procedencia.reaperturaId")})
  AND (json_type(NEW.detalle,'$.procedencia.correlacion')='null'
       OR (json_type(NEW.detalle,'$.procedencia.correlacion')='text'
           AND length(json_extract(NEW.detalle,'$.procedencia.correlacion')) BETWEEN 1 AND 200
           AND json_extract(NEW.detalle,'$.procedencia.correlacion')
               NOT GLOB '*[^A-Za-z0-9:._-]*'))
  AND (json_extract(NEW.detalle,'$.procedencia.tabla')<>'reapertura_activa'
       OR json_type(NEW.detalle,'$.procedencia.reaperturaId')='text')
  AND (${EXISTENCIA_PROCEDENCIA})`;

/**
 * Prefijos válidos de `origen`: `MIGRACION:<tabla>:<identidad>`. Es el `CHECK`
 * de la columna, así que se escribe con el nombre de columna y no con `NEW`.
 */
const ORIGEN_VALIDO = `(${PREFIJOS_ORIGEN.map(
  (prefijo) =>
    TABLAS_LEGADAS.map(
      (tabla) => `origen GLOB '${prefijo}:${tabla}:?*'`,
    ).join(" OR "),
).join(" OR ")})`;

/**
 * Capacidad transaccional de §4.3: ligada a un intento, un ciclo/revisión
 * esperada, una REF/revisión esperada y los dos cortes. Existe sólo mientras
 * la operación está en curso; el servicio la elimina antes del COMMIT.
 */
const TABLA_CAPACIDAD_APERTURA = `
    CREATE TABLE anticipo_apertura_autorizacion(
      intento TEXT NOT NULL,
      referencia TEXT NOT NULL REFERENCES fichas_anticipos(referencia) ON DELETE RESTRICT,
      evento INTEGER NOT NULL REFERENCES anticipo_apertura_evento(id) ON DELETE RESTRICT,
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      revision_ciclo INTEGER NOT NULL CHECK(revision_ciclo>0),
      revision_apertura INTEGER CHECK(revision_apertura IS NULL OR revision_apertura>0),
      corte_anterior TEXT NOT NULL,
      corte_nuevo TEXT NOT NULL,
      fase TEXT NOT NULL CHECK(fase IN ('PREPARADA','CICLO_APLICADO','APERTURA_APLICADA')),
      PRIMARY KEY(intento,referencia)
    ) STRICT;`;

/**
 * Guardas del orden de escritura de §4.3. El esquema —no la cortesía del
 * servicio— impone la secuencia: la capacidad nace PREPARADA bajo un guard
 * activo y ligada a su evento exacto; el ciclo X→Y/r+1 sólo pasa si **cada**
 * REF con apertura en X tiene su capacidad vigente, y eso las promueve a
 * CICLO_APLICADO; cada apertura X→Y/a+1 sólo pasa con su capacidad en
 * CICLO_APLICADO, el ciclo ya en Y y la revisión esperada, y la consume.
 */
const TRIGGERS_CAPACIDAD_APERTURA = `
    CREATE TRIGGER anticipo_apertura_capacidad_vigente
      BEFORE INSERT ON anticipo_apertura_autorizacion
      WHEN NEW.fase<>'PREPARADA'
        OR NOT EXISTS(SELECT 1 FROM anticipo_apertura_guard WHERE intento=NEW.intento)
        OR NOT EXISTS(SELECT 1 FROM anticipo_apertura_evento e
                       WHERE e.id=NEW.evento AND e.intento=NEW.intento
                         AND e.referencia=NEW.referencia AND e.ciclo=NEW.ciclo
                         AND e.corte_anterior=NEW.corte_anterior
                         AND e.corte_nuevo=NEW.corte_nuevo
                         AND e.revision_ciclo_esperada=NEW.revision_ciclo
                         AND e.revision_apertura_esperada IS NEW.revision_apertura)
      BEGIN SELECT RAISE(ABORT,'capability outside an active attempt'); END;

    CREATE TRIGGER anticipo_apertura_capacidad_fase
      BEFORE UPDATE ON anticipo_apertura_autorizacion
      WHEN NEW.intento IS NOT OLD.intento OR NEW.referencia IS NOT OLD.referencia
        OR NEW.evento IS NOT OLD.evento OR NEW.ciclo IS NOT OLD.ciclo
        OR NEW.revision_ciclo IS NOT OLD.revision_ciclo
        OR NEW.revision_apertura IS NOT OLD.revision_apertura
        OR NEW.corte_anterior IS NOT OLD.corte_anterior
        OR NEW.corte_nuevo IS NOT OLD.corte_nuevo
        OR NOT ((OLD.fase='PREPARADA' AND NEW.fase='CICLO_APLICADO')
             OR (OLD.fase='CICLO_APLICADO' AND NEW.fase='APERTURA_APLICADA'))
      BEGIN SELECT RAISE(ABORT,'invalid capability transition'); END;

    DROP TRIGGER IF EXISTS anticipo_cycle_photo;

    CREATE TRIGGER anticipo_cycle_photo
      BEFORE UPDATE OF inicio ON ciclos
      WHEN NEW.inicio IS NOT OLD.inicio
       AND EXISTS(SELECT 1 FROM fotos_neto_apertura WHERE ciclo=OLD.id)
    BEGIN
      SELECT RAISE(ABORT,'protected anticipo opening')
      WHERE NOT EXISTS(SELECT 1 FROM anticipo_apertura_guard)
         OR NEW.revision<>OLD.revision+1
         OR (SELECT COUNT(*) FROM fotos_neto_apertura WHERE ciclo=OLD.id)
            <>(SELECT COUNT(*) FROM anticipo_apertura_autorizacion a
                 JOIN fotos_neto_apertura f
                   ON f.referencia=a.referencia AND f.ciclo=OLD.id
                WHERE a.intento=(SELECT intento FROM anticipo_apertura_guard)
                  AND a.ciclo=OLD.id AND a.fase='PREPARADA'
                  AND a.revision_ciclo=OLD.revision
                  AND a.revision_apertura=f.revision
                  AND a.corte_anterior=OLD.inicio
                  AND a.corte_nuevo=NEW.inicio);
      UPDATE anticipo_apertura_autorizacion SET fase='CICLO_APLICADO'
       WHERE intento=(SELECT intento FROM anticipo_apertura_guard)
         AND ciclo=OLD.id AND fase='PREPARADA';
    END;

    CREATE TRIGGER anticipo_apertura_aplicada
      BEFORE UPDATE OF inicio ON fotos_neto_apertura
      WHEN NEW.inicio IS NOT OLD.inicio
      BEGIN
        SELECT RAISE(ABORT,'protected anticipo opening')
        WHERE NOT EXISTS(
          SELECT 1 FROM anticipo_apertura_autorizacion a
            JOIN ciclos c ON c.id=a.ciclo
           WHERE a.intento=(SELECT intento FROM anticipo_apertura_guard)
             AND a.referencia=OLD.referencia AND a.ciclo=OLD.ciclo
             AND a.fase='CICLO_APLICADO'
             AND a.revision_apertura=OLD.revision
             AND a.corte_anterior=OLD.inicio AND a.corte_nuevo=NEW.inicio
             AND NEW.revision=OLD.revision+1
             AND c.inicio=NEW.inicio
             AND c.revision IN (a.revision_ciclo,a.revision_ciclo+1));
        UPDATE anticipo_apertura_autorizacion SET fase='APERTURA_APLICADA'
         WHERE intento=(SELECT intento FROM anticipo_apertura_guard)
           AND referencia=OLD.referencia AND ciclo=OLD.ciclo
           AND fase='CICLO_APLICADO';
      END;`;

/** DDL completa de v32; determinista para que el manifiesto sea reproducible. */
export function cierreValidacionDdl(): string {
  return `
    CREATE TABLE cierre_validacion(
      ciclo TEXT PRIMARY KEY REFERENCES ciclos(id) ON DELETE RESTRICT,
      revision INTEGER NOT NULL CHECK(revision>0),
      dirty INTEGER NOT NULL CHECK(dirty IN (0,1)),
      dirty_desde TEXT CHECK(${instante("dirty_desde")}),
      dirty_ultimo TEXT CHECK(${instante("dirty_ultimo")}),
      dirty_origen TEXT CHECK(
        dirty_origen IS NULL OR dirty_origen IN (${lista(ORIGENES_PENDIENTE)})),
      dirty_motivos TEXT CHECK(dirty_motivos IS NULL OR json_valid(dirty_motivos)),
      huella_validacion TEXT CHECK(${huella("huella_validacion")}),
      version_conjunto TEXT CHECK(${decimal("version_conjunto")}),
      revision_actor TEXT CHECK(
        revision_actor IS NULL OR (length(trim(revision_actor))>0
          AND length(revision_actor)<=200)),
      revision_instante TEXT CHECK(${instante("revision_instante")}),
      revision_motivo TEXT CHECK(
        revision_motivo IS NULL OR (length(trim(revision_motivo))>0
          AND length(revision_motivo)<=1000)),
      procedencia_tabla TEXT CHECK(
        procedencia_tabla IS NULL OR procedencia_tabla IN (${lista(TABLAS_LEGADAS)})),
      procedencia_id TEXT CHECK(${decimal("procedencia_id")}),
      procedencia_version TEXT CHECK(${decimal("procedencia_version")}),
      procedencia_reapertura_id TEXT CHECK(${decimal("procedencia_reapertura_id")}),
      procedencia_activa INTEGER CHECK(
        procedencia_activa IS NULL OR procedencia_activa IN (0,1)),
      procedencia_version_origen TEXT CHECK(${decimal("procedencia_version_origen")}),
      procedencia_version_destino TEXT CHECK(${decimal("procedencia_version_destino")}),
      procedencia_correlacion TEXT CHECK(${idTecnico("procedencia_correlacion")}),
      procedencia_actor TEXT CHECK(
        procedencia_actor IS NULL OR (length(trim(procedencia_actor))>0
          AND length(procedencia_actor)<=200)),
      procedencia_instante TEXT CHECK(${instante("procedencia_instante")}),
      procedencia_motivo TEXT CHECK(
        procedencia_motivo IS NULL OR (length(trim(procedencia_motivo))>0
          AND length(procedencia_motivo)<=1000)),
      cobertura TEXT NOT NULL CHECK(json_valid(cobertura)),
      CHECK((huella_validacion IS NULL) = (version_conjunto IS NULL)),
      CHECK((procedencia_tabla IS NULL) = (procedencia_id IS NULL
             AND procedencia_version IS NULL
             AND procedencia_reapertura_id IS NULL
             AND procedencia_activa IS NULL
             AND procedencia_version_origen IS NULL
             AND procedencia_version_destino IS NULL
             AND procedencia_correlacion IS NULL
             AND procedencia_actor IS NULL
             AND procedencia_instante IS NULL
             AND procedencia_motivo IS NULL))
    ) STRICT;

    CREATE TABLE cierre_validacion_audit(
      id INTEGER PRIMARY KEY,
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      revision INTEGER NOT NULL CHECK(revision>0),
      accion TEXT NOT NULL CHECK(accion IN (${lista(ACCIONES_AUDITORIA)})),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0 AND length(actor)<=200),
      instante TEXT NOT NULL CHECK(${INSTANTE_OBLIGATORIO}),
      motivo TEXT CHECK(
        motivo IS NULL OR (length(trim(motivo))>0 AND length(motivo)<=2000)),
      intento TEXT CHECK(${idTecnico("intento")}),
      correlacion TEXT CHECK(${idTecnico("correlacion")}),
      origen TEXT CHECK(origen IS NULL OR (${idTecnico("origen")} AND (${ORIGEN_VALIDO}))),
      huella_anterior TEXT CHECK(${huella("huella_anterior")}),
      huella_posterior TEXT CHECK(${huella("huella_posterior")}),
      detalle TEXT NOT NULL CHECK(json_valid(detalle))
    ) STRICT;

    CREATE INDEX cierre_validacion_audit_ciclo
      ON cierre_validacion_audit(ciclo,id);

    CREATE TABLE validacion_attempts(
      operacion TEXT NOT NULL CHECK(operacion IN (${lista(OPERACIONES_VALIDACION)})),
      key TEXT NOT NULL CHECK(length(trim(key))>0 AND length(key)<=200),
      hash TEXT NOT NULL CHECK(length(hash)=64 AND hash NOT GLOB '*[^a-f0-9]*'),
      response TEXT NOT NULL CHECK(json_valid(response)),
      completado INTEGER NOT NULL CHECK(completado IN (0,1)),
      expira INTEGER NOT NULL CHECK(expira>0),
      PRIMARY KEY(operacion,key)
    ) STRICT;

    /* ------------------------------------------------------------------ *
     * §7.3 · manifiesto de migración tipado por tabla+PK
     *
     * Es el recibo único por fila de origen de los metadatos que deben
     * sobrevivir: identidad tipada, procedencia, instante observado y huella.
     * Append-only: la repetición es un no-op y una identidad distinta bajo la
     * misma PK se rechaza, nunca se sobrescribe.
     * ------------------------------------------------------------------ */

    CREATE TABLE cierre_validacion_manifiesto(
      tabla TEXT NOT NULL CHECK(tabla IN (${lista(TABLAS_MANIFIESTO)})),
      pk TEXT NOT NULL CHECK(length(pk) BETWEEN 1 AND 200
        AND pk GLOB '[0-9]*' AND pk NOT GLOB '*[^0-9:]*'),
      identidad TEXT NOT NULL CHECK(json_valid(identidad)),
      procedencia TEXT NOT NULL CHECK(${idTecnico("procedencia")}
        AND procedencia GLOB 'MIGRACION:'||tabla||':?*'),
      observado_utc TEXT NOT NULL CHECK(${instanteObligatorio("observado_utc")}),
      huella TEXT NOT NULL CHECK(length(huella)=64
        AND huella NOT GLOB '*[^a-f0-9]*'),
      evento_id INTEGER REFERENCES cierre_validacion_audit(id) ON DELETE RESTRICT,
      PRIMARY KEY(tabla,pk)
    ) STRICT;

    CREATE INDEX cierre_validacion_manifiesto_evento
      ON cierre_validacion_manifiesto(evento_id);

    /* ---------------------------------------------------------------- *
     * Estado de la fila de validación
     * ---------------------------------------------------------------- */

    CREATE TRIGGER cierre_validacion_no_delete
      BEFORE DELETE ON cierre_validacion
      BEGIN SELECT RAISE(ABORT,'no delete'); END;

    CREATE TRIGGER cierre_validacion_ciclo_immutable
      BEFORE UPDATE OF ciclo ON cierre_validacion
      WHEN NEW.ciclo<>OLD.ciclo
      BEGIN SELECT RAISE(ABORT,'immutable cycle'); END;

    CREATE TRIGGER cierre_validacion_estado_insert
      BEFORE INSERT ON cierre_validacion
      WHEN (NEW.dirty=1 AND (NEW.dirty_desde IS NULL
              OR NEW.dirty_ultimo IS NULL
              OR NEW.dirty_origen IS NULL
              OR NEW.dirty_motivos IS NULL))
        OR (NEW.dirty=0 AND (NEW.dirty_desde IS NOT NULL
              OR NEW.dirty_ultimo IS NOT NULL
              OR NEW.dirty_origen IS NOT NULL
              OR NEW.dirty_motivos IS NOT NULL
              OR NEW.huella_validacion IS NULL
              OR NEW.version_conjunto IS NULL
              OR NEW.revision_actor IS NULL
              OR NEW.revision_instante IS NULL))
      BEGIN SELECT RAISE(ABORT,'estado de validacion incoherente'); END;

    CREATE TRIGGER cierre_validacion_estado_update
      BEFORE UPDATE ON cierre_validacion
      WHEN (NEW.dirty=1 AND (NEW.dirty_desde IS NULL
              OR NEW.dirty_ultimo IS NULL
              OR NEW.dirty_origen IS NULL
              OR NEW.dirty_motivos IS NULL))
        OR (NEW.dirty=0 AND (NEW.dirty_desde IS NOT NULL
              OR NEW.dirty_ultimo IS NOT NULL
              OR NEW.dirty_origen IS NOT NULL
              OR NEW.dirty_motivos IS NOT NULL
              OR NEW.huella_validacion IS NULL
              OR NEW.version_conjunto IS NULL
              OR NEW.revision_actor IS NULL
              OR NEW.revision_instante IS NULL))
      BEGIN SELECT RAISE(ABORT,'estado de validacion incoherente'); END;

    CREATE TRIGGER cierre_validacion_motivos_insert
      BEFORE INSERT ON cierre_validacion
      WHEN NEW.dirty_motivos IS NOT NULL AND NOT (
        json_type(NEW.dirty_motivos)='array'
        AND json_array_length(NEW.dirty_motivos)<=${LIMITES_DETALLE.impactos}
        AND NOT EXISTS (
          SELECT 1 FROM json_each(NEW.dirty_motivos) m
           WHERE typeof(m.value)<>'text'
              OR m.value NOT IN (${lista(IMPACTOS_MATERIALES)}))
        AND (SELECT COUNT(*) FROM json_each(NEW.dirty_motivos))
            = (SELECT COUNT(DISTINCT value) FROM json_each(NEW.dirty_motivos))
      )
      BEGIN SELECT RAISE(ABORT,'motivos de impacto invalidos'); END;

    CREATE TRIGGER cierre_validacion_motivos_update
      BEFORE UPDATE ON cierre_validacion
      WHEN NEW.dirty_motivos IS NOT NULL AND NOT (
        json_type(NEW.dirty_motivos)='array'
        AND json_array_length(NEW.dirty_motivos)<=${LIMITES_DETALLE.impactos}
        AND NOT EXISTS (
          SELECT 1 FROM json_each(NEW.dirty_motivos) m
           WHERE typeof(m.value)<>'text'
              OR m.value NOT IN (${lista(IMPACTOS_MATERIALES)}))
        AND (SELECT COUNT(*) FROM json_each(NEW.dirty_motivos))
            = (SELECT COUNT(DISTINCT value) FROM json_each(NEW.dirty_motivos))
      )
      BEGIN SELECT RAISE(ABORT,'motivos de impacto invalidos'); END;

    CREATE TRIGGER cierre_validacion_cobertura_insert
      BEFORE INSERT ON cierre_validacion
      WHEN NOT (${coberturaValidaV32("NEW.cobertura")})
      BEGIN SELECT RAISE(ABORT,'cobertura de validacion invalida'); END;

    CREATE TRIGGER cierre_validacion_cobertura_update
      BEFORE UPDATE ON cierre_validacion
      WHEN NOT (${coberturaValidaV32("NEW.cobertura")})
      BEGIN SELECT RAISE(ABORT,'cobertura de validacion invalida'); END;

    /* §2.4: la rama se decide por columnas que cambian, nunca por un parámetro. */
    CREATE TRIGGER cierre_validacion_revision_baja
      BEFORE UPDATE ON cierre_validacion
      WHEN NEW.revision<OLD.revision
      BEGIN SELECT RAISE(ABORT,'la revision de validacion no puede disminuir'); END;

    CREATE TRIGGER cierre_validacion_revision_salto
      BEFORE UPDATE ON cierre_validacion
      WHEN NEW.revision>OLD.revision+1
      BEGIN SELECT RAISE(ABORT,'la revision de validacion no puede saltar'); END;

    CREATE TRIGGER cierre_validacion_revision_marca
      BEFORE UPDATE ON cierre_validacion
      WHEN NEW.revision=OLD.revision
       AND (NEW.huella_validacion IS NOT OLD.huella_validacion
         OR NEW.version_conjunto IS NOT OLD.version_conjunto
         OR NEW.revision_actor IS NOT OLD.revision_actor
         OR NEW.revision_instante IS NOT OLD.revision_instante
         OR NEW.revision_motivo IS NOT OLD.revision_motivo)
      BEGIN SELECT RAISE(ABORT,'la revision humana exige exactamente la siguiente'); END;

    CREATE TRIGGER cierre_validacion_revision_humana
      BEFORE UPDATE ON cierre_validacion
      WHEN NEW.revision=OLD.revision+1
       AND NOT (NEW.huella_validacion IS NOT OLD.huella_validacion
         OR NEW.version_conjunto IS NOT OLD.version_conjunto
         OR NEW.revision_actor IS NOT OLD.revision_actor
         OR NEW.revision_instante IS NOT OLD.revision_instante
         OR NEW.revision_motivo IS NOT OLD.revision_motivo)
      BEGIN SELECT RAISE(ABORT,'avanzar la revision exige una revision humana'); END;

    /* §2.4: marcar o reiterar —cambia 'dirty' o sus metadatos— no mueve la
     * revisión. La confirmación (1→0) no entra aquí: limpia y avanza a r+1. */
    CREATE TRIGGER cierre_validacion_marca_sin_revision
      BEFORE UPDATE ON cierre_validacion
      WHEN NEW.dirty=1
       AND NEW.revision<>OLD.revision
       AND (NEW.dirty IS NOT OLD.dirty
         OR NEW.dirty_desde IS NOT OLD.dirty_desde
         OR NEW.dirty_ultimo IS NOT OLD.dirty_ultimo
         OR NEW.dirty_origen IS NOT OLD.dirty_origen
         OR NEW.dirty_motivos IS NOT OLD.dirty_motivos)
      BEGIN SELECT RAISE(ABORT,'marcar o reiterar no cambia la revision'); END;

    /* §2.4: la marca no puede fecharse antes de la referencia humana vigente.
     * Si 'dirty_desde'/'dirty_ultimo' quedan por detrás de 'revision_instante',
     * la limpieza se compara contra una referencia antigua y no contra la
     * última revisión humana. */
    CREATE TRIGGER cierre_validacion_marca_cronologia
      BEFORE UPDATE ON cierre_validacion
      WHEN NEW.dirty=1
       AND NEW.revision_instante IS NOT NULL
       AND (NEW.dirty_desde IS NOT OLD.dirty_desde
         OR NEW.dirty_ultimo IS NOT OLD.dirty_ultimo)
       AND (NEW.dirty_desde<NEW.revision_instante
         OR NEW.dirty_ultimo<NEW.revision_instante)
      BEGIN SELECT RAISE(ABORT,'la marca no puede preceder a la revision humana'); END;

    /* ------------------------------------------------------------------ *
     * §2.4 · la revisión humana no reutiliza evidencia anterior
     *
     * Confirmar o revalidar exige una referencia **nueva**: instante
     * estrictamente posterior al de la última revisión humana y, al
     * confirmar, también posterior a las marcas de pendiente. La huella y la
     * versión de conjunto son las del estado medido actual; reenviar
     * actor+instante+huella de la validación anterior falla aunque la huella
     * coincida (caso «pendienteSinDelta»): lo que no puede repetirse es la
     * evidencia, no el valor.
     * ------------------------------------------------------------------ */

    CREATE TRIGGER cierre_validacion_referencia_nueva
      BEFORE UPDATE ON cierre_validacion
      WHEN (NEW.huella_validacion IS NOT OLD.huella_validacion
         OR NEW.version_conjunto IS NOT OLD.version_conjunto
         OR NEW.revision_actor IS NOT OLD.revision_actor
         OR NEW.revision_instante IS NOT OLD.revision_instante
         OR NEW.revision_motivo IS NOT OLD.revision_motivo)
       AND (
         NEW.revision_instante IS NULL
         OR (OLD.revision_instante IS NOT NULL
             AND NEW.revision_instante<=OLD.revision_instante)
         OR (OLD.revision_actor IS NOT NULL
             AND OLD.revision_instante IS NOT NULL
             AND OLD.huella_validacion IS NOT NULL
             AND NEW.revision_actor IS OLD.revision_actor
             AND NEW.revision_instante IS OLD.revision_instante
             AND NEW.huella_validacion IS OLD.huella_validacion))
      BEGIN SELECT RAISE(ABORT,'la revision humana exige evidencia nueva'); END;

    CREATE TRIGGER cierre_validacion_confirmacion
      BEFORE UPDATE ON cierre_validacion
      WHEN OLD.dirty=1 AND NEW.dirty=0
       AND (
         NEW.revision<>OLD.revision+1
         OR NEW.revision_instante IS NULL
         OR (OLD.dirty_ultimo IS NOT NULL AND NEW.revision_instante<=OLD.dirty_ultimo)
         OR (OLD.dirty_desde IS NOT NULL AND NEW.revision_instante<=OLD.dirty_desde)
         OR (OLD.version_conjunto IS NOT NULL
             AND NEW.version_conjunto IS NOT OLD.version_conjunto))
      BEGIN SELECT RAISE(ABORT,'confirmar la revision exige referencia nueva del conjunto actual'); END;

    /* ---------------------------------------------------------------- *
     * Auditoría: append-only y DTO estricto
     * ---------------------------------------------------------------- */

    CREATE TRIGGER cierre_validacion_audit_no_update
      BEFORE UPDATE ON cierre_validacion_audit
      BEGIN SELECT RAISE(ABORT,'immutable validation audit'); END;

    CREATE TRIGGER cierre_validacion_audit_no_delete
      BEFORE DELETE ON cierre_validacion_audit
      BEGIN SELECT RAISE(ABORT,'immutable validation audit'); END;

    CREATE TRIGGER cierre_validacion_audit_detalle_forma
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle)
       AND ${ARBOL_SIN_NUMEROS}
       AND NOT (${SOBRE_EXACTO})
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: forma exacta requerida'); END;

    CREATE TRIGGER cierre_validacion_audit_detalle_numeros
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle) AND NOT (${ARBOL_SIN_NUMEROS})
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: no admite numeros JSON'); END;

    CREATE TRIGGER cierre_validacion_audit_detalle_hechos
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle) AND ${ARBOL_SIN_NUMEROS} AND (${SOBRE_EXACTO}) AND (
        json_type(NEW.detalle,'$.hechos') IS NOT 'array'
        OR json_array_length(NEW.detalle,'$.hechos')>${LIMITES_DETALLE.hechos}
        OR EXISTS (
          SELECT 1 FROM json_each(NEW.detalle,'$.hechos') h WHERE NOT (
            json_type(h.value)='object'
            AND ${clavesExactas("h.value", CLAVES_HECHO, 3)}
            AND json_extract(h.value,'$.entidad') IN (${lista(ENTIDADES_PERMITIDAS)})
            AND ${idPorEntidad("json_extract(h.value,'$.entidad')")}
            AND ${canonicoValor("json_extract(h.value,'$.revision')")}
            AND (EXISTS (
                  SELECT 1 FROM movimientos m
                   WHERE json_extract(h.value,'$.entidad')='movimiento'
                     AND m.id=json_extract(h.value,'$.id')
                     AND CAST(m.revision AS TEXT)=json_extract(h.value,'$.revision'))
              OR EXISTS (
                  SELECT 1 FROM referencias r
                   WHERE json_extract(h.value,'$.entidad')='referencia'
                     AND r.id=json_extract(h.value,'$.id')
                     AND CAST(r.revision AS TEXT)=json_extract(h.value,'$.revision')))
          ))
      )
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: hechos invalidos'); END;

    CREATE TRIGGER cierre_validacion_audit_detalle_ciclos
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle) AND ${ARBOL_SIN_NUMEROS} AND (${SOBRE_EXACTO}) AND (
        json_type(NEW.detalle,'$.ciclos') IS NOT 'array'
        OR json_array_length(NEW.detalle,'$.ciclos')>${LIMITES_DETALLE.ciclos}
        OR EXISTS (
          SELECT 1 FROM json_each(NEW.detalle,'$.ciclos') c WHERE NOT (
            json_type(c.value)='object'
            AND ${clavesExactas("c.value", CLAVES_CICLO, 2)}
            AND ${canonicoValor("json_extract(c.value,'$.id')")}
            AND EXISTS (
              SELECT 1 FROM ciclos k
               WHERE k.id=json_extract(c.value,'$.id'))
            AND json_type(c.value,'$.impactos')='array'
            AND json_array_length(c.value,'$.impactos')<=${LIMITES_DETALLE.impactos}
            AND NOT EXISTS (
              SELECT 1 FROM json_each(c.value,'$.impactos') i
               WHERE typeof(i.value)<>'text'
                  OR i.value NOT IN (${lista(IMPACTOS_MATERIALES)}))
          ))
      )
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: ciclos invalidos'); END;

    CREATE TRIGGER cierre_validacion_audit_detalle_cobertura
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle) AND ${ARBOL_SIN_NUMEROS} AND (${SOBRE_EXACTO})
       AND NOT (${coberturaValidaV32("json_extract(NEW.detalle,'$.cobertura')")})
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: cobertura invalida'); END;

    CREATE TRIGGER cierre_validacion_audit_detalle_procedencia
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle) AND ${ARBOL_SIN_NUMEROS} AND (${SOBRE_EXACTO})
       AND json_type(NEW.detalle,'$.procedencia')<>'null'
       AND NOT (${PROCEDENCIA_VALIDA})
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: procedencia invalida'); END;

    /* ------------------------------------------------------------------ *
     * Manifiesto de migración: append-only, tipado y sin cifras
     * ------------------------------------------------------------------ */

    CREATE TRIGGER cierre_validacion_manifiesto_no_update
      BEFORE UPDATE ON cierre_validacion_manifiesto
      BEGIN SELECT RAISE(ABORT,'immutable migration manifest'); END;

    CREATE TRIGGER cierre_validacion_manifiesto_no_delete
      BEFORE DELETE ON cierre_validacion_manifiesto
      BEGIN SELECT RAISE(ABORT,'immutable migration manifest'); END;

    CREATE TRIGGER cierre_validacion_manifiesto_forma
      BEFORE INSERT ON cierre_validacion_manifiesto
      WHEN NOT (
        ${arbolSinNumeros("NEW.identidad")}
        AND ${IDENTIDAD_MANIFIESTO})
      BEGIN SELECT RAISE(ABORT,'manifiesto de migracion invalido'); END;

    CREATE TRIGGER cierre_validacion_manifiesto_pk
      BEFORE INSERT ON cierre_validacion_manifiesto
      WHEN NEW.tabla='foto_periodo_componentes'
       AND NEW.pk<>json_extract(NEW.identidad,'$.periodoId')||':'
                 ||json_extract(NEW.identidad,'$.ciclo')
      BEGIN SELECT RAISE(ABORT,'manifiesto de migracion invalido'); END;

    /* ---------------------------------------------------------------- *
     * Recibo durable sin cifras (§2.4)
     * ---------------------------------------------------------------- */

    CREATE TRIGGER validacion_attempts_recibo
      BEFORE INSERT ON validacion_attempts
      WHEN NOT (${RECIBO_VALIDO("NEW.response")})
      BEGIN SELECT RAISE(ABORT,'recibo de validacion invalido'); END;

    CREATE TRIGGER validacion_attempts_recibo_update
      BEFORE UPDATE ON validacion_attempts
      WHEN NOT (${RECIBO_VALIDO("NEW.response")})
      BEGIN SELECT RAISE(ABORT,'recibo de validacion invalido'); END;

    /* ------------------------------------------------------------------ *
     * §4.2/§4.3 · Reanclaje y reacreditación de Anticipos
     *
     * El veto absoluto del trigger legado de apertura («Inicio protegido por
     * Neto de apertura») retiraba la corrección estructural en lugar de
     * regularla. Se sustituye por el procedimiento autorizado de la SPEC: un
     * **evento** append-only por REF, una **capacidad** transaccional por
     * intento+REF y un **orden** de escritura que el esquema impone —evento y
     * capacidad PREPARADA antes del ciclo, ciclo X→Y/r+1 antes de cada
     * apertura, y consumo de cada capacidad al aplicarse su apertura—.
     *
     * Ni el evento ni la capacidad guardan importes: la evidencia y el dato
     * declarado siguen en la tabla de aperturas, que es negocio de Anticipos
     * (E3.1) y no una foto de cierre. La capacidad no sobrevive a un COMMIT
     * correcto: el servicio las elimina dentro de la misma transacción y la
     * verificación final comprueba que no queda ninguna.
     * ------------------------------------------------------------------ */

    CREATE TABLE anticipo_apertura_evento(
      id INTEGER PRIMARY KEY,
      referencia TEXT NOT NULL REFERENCES fichas_anticipos(referencia) ON DELETE RESTRICT,
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      intento TEXT NOT NULL CHECK(${idTecnico("intento")} AND intento IS NOT NULL),
      revision_ciclo_esperada INTEGER NOT NULL CHECK(revision_ciclo_esperada>0),
      revision_ciclo_resultante INTEGER NOT NULL CHECK(revision_ciclo_resultante=revision_ciclo_esperada+1),
      revision_apertura_esperada INTEGER CHECK(
        revision_apertura_esperada IS NULL OR revision_apertura_esperada>0),
      revision_apertura_resultante INTEGER CHECK(
        revision_apertura_resultante IS NULL
        OR revision_apertura_resultante=revision_apertura_esperada+1),
      corte_anterior TEXT NOT NULL,
      corte_nuevo TEXT NOT NULL,
      clase TEXT NOT NULL CHECK(clase IN ('A','B')),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0 AND length(actor)<=200),
      instante TEXT NOT NULL CHECK(${INSTANTE_OBLIGATORIO}),
      motivo TEXT CHECK(motivo IS NULL OR (length(trim(motivo))>0 AND length(motivo)<=2000)),
      huella_anterior TEXT CHECK(${huella("huella_anterior")}),
      huella_posterior TEXT CHECK(${huella("huella_posterior")}),
      UNIQUE(intento,referencia),
      CHECK(clase='B' OR corte_anterior<>corte_nuevo),
      CHECK((revision_apertura_esperada IS NULL)=(revision_apertura_resultante IS NULL))
    ) STRICT;

    CREATE INDEX anticipo_apertura_evento_ciclo
      ON anticipo_apertura_evento(ciclo,id);

    CREATE TRIGGER anticipo_apertura_evento_no_update
      BEFORE UPDATE ON anticipo_apertura_evento
      BEGIN SELECT RAISE(ABORT,'immutable opening event'); END;

    CREATE TRIGGER anticipo_apertura_evento_no_delete
      BEFORE DELETE ON anticipo_apertura_evento
      BEGIN SELECT RAISE(ABORT,'immutable opening event'); END;

    CREATE TABLE anticipo_apertura_guard(
      id INTEGER PRIMARY KEY CHECK(id=1),
      intento TEXT NOT NULL CHECK(${idTecnico("intento")} AND intento IS NOT NULL)
    ) STRICT;

    ${TABLA_CAPACIDAD_APERTURA}
    ${TRIGGERS_CAPACIDAD_APERTURA}

    UPDATE schema_version SET version=32;`;
}

export function cierreValidacionSchemaV32(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 31)
    throw new Error("Esquema previo inesperado para migración SPEC38 v32.");
  db.exec(cierreValidacionDdl());
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("Migración v32 rechazada: claves foráneas inconsistentes.");
}

/**
 * v33 -> v34 (SPEC38 / #598): permite avanzar `version_conjunto` al confirmar
 * o revalidar hacia el conjunto vigente, rechazando `NULL` o retrocesos.
 */
export function cierreValidacionTriggerV34(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 33)
    throw new Error("Esquema previo inesperado para migración Validación v34.");

  db.exec(`
    DROP TRIGGER IF EXISTS cierre_validacion_confirmacion;
    CREATE TRIGGER cierre_validacion_confirmacion
      BEFORE UPDATE ON cierre_validacion
      WHEN OLD.dirty=1 AND NEW.dirty=0
       AND (
         NEW.revision<>OLD.revision+1
         OR NEW.revision_instante IS NULL
         OR (OLD.dirty_ultimo IS NOT NULL AND NEW.revision_instante<=OLD.dirty_ultimo)
         OR (OLD.dirty_desde IS NOT NULL AND NEW.revision_instante<=OLD.dirty_desde)
         OR NEW.version_conjunto IS NULL
         OR (OLD.version_conjunto IS NOT NULL
             AND CAST(NEW.version_conjunto AS INTEGER) < CAST(OLD.version_conjunto AS INTEGER)))
      BEGIN SELECT RAISE(ABORT,'confirmar la revision exige referencia nueva del conjunto actual'); END;

    DROP TRIGGER IF EXISTS cierre_validacion_cobertura_insert;
    CREATE TRIGGER cierre_validacion_cobertura_insert
      BEFORE INSERT ON cierre_validacion
      WHEN NOT (${coberturaValidaV34("NEW.cobertura")})
      BEGIN SELECT RAISE(ABORT,'cobertura de validacion invalida'); END;

    DROP TRIGGER IF EXISTS cierre_validacion_cobertura_update;
    CREATE TRIGGER cierre_validacion_cobertura_update
      BEFORE UPDATE ON cierre_validacion
      WHEN NOT (${coberturaValidaV34("NEW.cobertura")})
      BEGIN SELECT RAISE(ABORT,'cobertura de validacion invalida'); END;

    DROP TRIGGER IF EXISTS cierre_validacion_audit_detalle_cobertura;
    CREATE TRIGGER cierre_validacion_audit_detalle_cobertura
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle) AND ${ARBOL_SIN_NUMEROS} AND (${SOBRE_EXACTO})
       AND NOT (${coberturaValidaV34("json_extract(NEW.detalle,'$.cobertura')")})
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: cobertura invalida'); END;

    UPDATE schema_version SET version=34;
  `);
}