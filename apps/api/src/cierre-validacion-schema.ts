import type { Database } from "bun:sqlite";
import {
  CAUSAS_COBERTURA,
  ENTIDADES_PERMITIDAS,
  ESTADOS_COBERTURA,
  FUENTES_COBERTURA,
  IMPACTOS_MATERIALES,
  LIMITES_DETALLE,
  TABLAS_LEGADAS,
  TABLAS_LEGADAS_SIN_ID,
} from "./cierre-validacion-dto";

/**
 * SPEC38 · I1 — esquema **v32**: estado de validación, auditoría de validación e
 * idempotencia de la operación.
 *
 * Alcance de este incremento: sólo esquema, guardas de datos e importación
 * conservadora. No crea rutas, lectores, preview, UI ni borra ninguna tabla. Las
 * tablas de fotos, `cierres`, `cierre_audit`, reaperturas y vínculos quedan
 * intactas: #548 las retira después y sólo con autorización propia.
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
 * ## DTO de auditoría (§2.3)
 * `detalle` se comprueba con `json_each`/`json_tree` y no con `json_valid` ni
 * una lista negra de nombres. El orden de las guardas es deliberado para que el
 * mensaje sea determinista: primero se rechaza **cualquier** `integer`/`real`
 * del árbol JSON —la regla «ningún `number`» es mecánica y no tiene
 * excepciones—, después la forma exacta del sobre y luego cada rama. Las demás
 * guardas sólo se evalúan cuando el árbol no tiene números y el sobre es
 * exacto, así que dos violaciones distintas nunca compiten por el mensaje.
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
const INSTANTE_OBLIGATORIO = `length(instante)=24 AND instante GLOB
  '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'`;

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
    AND length(${valor}) BETWEEN 1 AND 18
    AND ${valor} NOT GLOB '*[^0-9]*'
    AND ${valor} = CAST(CAST(${valor} AS INTEGER) AS TEXT))`;

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

/** Guarda reutilizable de un array de cobertura (`detalle.cobertura` o la columna). */
const coberturaValida = (alias: string) => `
  json_type(${alias})='array'
  AND json_array_length(${alias})<=${LIMITES_DETALLE.cobertura}
  AND NOT EXISTS (
    SELECT 1 FROM json_each(${alias}) b WHERE NOT (
      json_type(b.value)='object'
      AND ${clavesExactas("b.value", CLAVES_COBERTURA, 3)}
      AND json_extract(b.value,'$.fuente') IN (${lista(FUENTES_COBERTURA)})
      AND json_extract(b.value,'$.estado') IN (${lista(ESTADOS_COBERTURA)})
      AND json_type(b.value,'$.causas')='array'
      AND json_array_length(b.value,'$.causas')<=${LIMITES_DETALLE.causas}
      AND NOT EXISTS (
        SELECT 1 FROM json_each(b.value,'$.causas') c
         WHERE typeof(c.value)<>'text'
            OR c.value NOT IN (${lista(CAUSAS_COBERTURA)}))
      AND NOT (
        json_extract(b.value,'$.estado')='Disponible'
        AND json_array_length(b.value,'$.causas')>0)
      AND NOT (
        json_extract(b.value,'$.estado')<>'Disponible'
        AND json_array_length(b.value,'$.causas')=0)
    ))`;

const SIN_ID = lista(TABLAS_LEGADAS_SIN_ID);

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
      WHEN NOT (${coberturaValida("NEW.cobertura")})
      BEGIN SELECT RAISE(ABORT,'cobertura de validacion invalida'); END;

    CREATE TRIGGER cierre_validacion_cobertura_update
      BEFORE UPDATE ON cierre_validacion
      WHEN NOT (${coberturaValida("NEW.cobertura")})
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
       AND NEW.dirty=OLD.dirty
      BEGIN SELECT RAISE(ABORT,'avanzar la revision exige una revision humana'); END;

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
            AND ${canonicoValor("json_extract(h.value,'$.id')")}
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
       AND NOT (${coberturaValida("json_extract(NEW.detalle,'$.cobertura')")})
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: cobertura invalida'); END;

    CREATE TRIGGER cierre_validacion_audit_detalle_procedencia
      BEFORE INSERT ON cierre_validacion_audit
      WHEN json_valid(NEW.detalle) AND ${ARBOL_SIN_NUMEROS} AND (${SOBRE_EXACTO})
       AND json_type(NEW.detalle,'$.procedencia')<>'null'
       AND NOT (${PROCEDENCIA_VALIDA})
      BEGIN SELECT RAISE(ABORT,'detalle de validacion: procedencia invalida'); END;

    /* ---------------------------------------------------------------- *
     * Recibo durable sin cifras (§2.4)
     * ---------------------------------------------------------------- */

    CREATE TRIGGER validacion_attempts_recibo
      BEFORE INSERT ON validacion_attempts
      WHEN NOT (
        json_type(NEW.response)='object'
        AND (SELECT COUNT(*) FROM json_each(NEW.response))=4
        AND (SELECT COUNT(*) FROM json_each(NEW.response)
              WHERE key IN ('operacionId','ciclos','auditIds','cierresDirty'))=4
        AND json_type(NEW.response,'$.ciclos')='array'
        AND json_type(NEW.response,'$.auditIds')='array'
        AND json_type(NEW.response,'$.cierresDirty')='array'
        AND NOT EXISTS (
          SELECT 1 FROM json_each(NEW.response,'$.ciclos') c WHERE NOT (
            json_type(c.value)='object'
            AND ${clavesExactas("c.value", ["id", "revision", "estado"] as const, 3)}))
        AND NOT EXISTS (
          SELECT 1 FROM json_each(NEW.response,'$.cierresDirty') d WHERE NOT (
            json_type(d.value)='object'
            AND ${clavesExactas(
              "d.value",
              ["ciclo", "rango", "estadoValidacion", "validado", "dirtyPrevio"] as const,
              5,
            )}))
      )
      BEGIN SELECT RAISE(ABORT,'recibo de validacion invalido'); END;

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