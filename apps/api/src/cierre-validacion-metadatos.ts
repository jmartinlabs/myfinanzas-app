import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  construirDetalleValidacion,
  decimalCanonico,
  serializarDetalleValidacion,
  type DetalleValidacion,
  type ProcedenciaValidada,
} from "./cierre-validacion-dto";

/**
 * SPEC38 · I1 — metadatos que deben sobrevivir antes de borrar (§7.3).
 *
 * #548 no puede reconstruir nada que no esté migrado, y §7.3 prohíbe dejar
 * fuera las tablas «aparentes» (`reaperturas`, `reapertura_activa`,
 * `cierre_vinculos`) ni los metadatos de periodo. Este módulo los conserva
 * **sin borrar ni modificar las tablas de origen**:
 *
 *  - fila de `reapertura_activa` → evento `legado_reapertura_activa` con ciclo,
 *    id de reapertura, `activa:true`, actor y fecha originales, más la fila del
 *    ciclo pendiente por **transición** (`dirty_origen='ReaperturaActiva'`,
 *    `motivo=null`: la causa se lee en la acción y en el `origen` del evento);
 *  - fila de `cierre_vinculos` → evento `legado_cierre_vinculo` con versiones
 *    origen/destino, `reapertura_id` y correlación exactas: el vínculo no se
 *    supone reconstruible desde otra tabla;
 *  - fila de `reaperturas` → evento `legado_reapertura` con su identidad,
 *    actor, fecha y motivo originales;
 *  - fila de `cierre_audit` → evento `legado_cierre_audit` con identidad,
 *    actor, fecha y motivo; la acción legada (`cierre`/`cierre_fuera_de_orden`)
 *    se conserva en la identidad tipada del manifiesto y en
 *    `procedencia.correlacion`, porque el DTO no tiene un campo «acción
 *    original» y no se inventa texto financiero para representarla;
 *  - filas de `fotos_periodo` y `foto_periodo_componentes` → **manifiesto**
 *    tipado por tabla+PK con identidad, versiones técnicas, ciclos componentes
 *    y procedencia. Ni eventos forzados ni cifras ni estado validado de
 *    periodo.
 *
 * `cierre_validacion_manifiesto` es el recibo único por tabla+PK de origen: la
 * repetición es un no-op, y una identidad distinta bajo la misma PK se rechaza
 * en vez de sobrescribir. Los originales quedan intactos hasta I3.
 */

export type ResultadoMetadatos = {
  /** Filas migradas por esta ejecución, agrupadas por tabla y en orden de PK. */
  recibos: Record<string, string[]>;
  /** PKs migradas por esta ejecución (no estaban en el manifiesto). */
  creados: string[];
  /** PKs ya migradas: no se duplican ni se sobrescriben. */
  preservados: string[];
  /** Eventos nuevos escritos en `cierre_validacion_audit`. */
  eventos: number;
};

export type OpcionesMetadatos = {
  /** Instante observado de la transición; determinista en pruebas. */
  ahora?: Date;
};

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ID_TECNICO = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/;

type Reapertura = {
  id: number;
  ciclo: string;
  version_origen: number;
  tipo: "reapertura" | "cancelacion";
  actor: string;
  creado_utc: string;
  motivo: string;
  correlacion: string | null;
  reapertura_origen: number | null;
};

type ReaperturaActiva = { ciclo: string; reapertura_id: number };

type Vinculo = {
  ciclo: string;
  version_origen: number;
  version_destino: number;
  reapertura_id: number;
  correlacion: string | null;
};

type AuditoriaCierre = {
  id: number;
  ciclo: string;
  version: number;
  accion: "cierre" | "cierre_fuera_de_orden";
  motivo: string | null;
  instante: string;
  actor: string;
};

type FotoPeriodo = {
  id: number;
  tipo: "Trimestre" | "Anio";
  ejercicio: number;
  trimestre: number | null;
  version: string;
  creado_utc: string;
  actor: string;
  fingerprint: string;
  app_version: string;
  schema_version: number;
};

type ComponentePeriodo = {
  periodo_id: number;
  ciclo: string;
  version_foto: number | null;
  fingerprint_foto: string | null;
  estado: "Incluido" | "ExcluidoSinCierre" | "PendienteReCierre";
};

type Identidad = Record<string, string | null>;

function sha256(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/**
 * Huella de la identidad migrada: mismo `tabla`+`pk`+`identidad` produce la
 * misma huella, así que repetir es idempotente y una identidad distinta se
 * detecta sin escribir nada.
 */
function huellaIdentidad(tabla: string, pk: string, identidad: Identidad): string {
  return sha256(JSON.stringify({ tabla, pk, identidad }));
}

function exigirIdTecnico(valor: string | null, campo: string): string | null {
  if (valor === null) return null;
  if (!ID_TECNICO.test(valor))
    throw new Error(
      `Metadato legado con ${campo} fuera del dominio técnico: no se migra a ciegas.`,
    );
  return valor;
}

function filaValidacion(db: Database, ciclo: string): { revision: number } {
  const fila = db
    .query("SELECT revision FROM cierre_validacion WHERE ciclo=?")
    .get(ciclo) as { revision: number } | null;
  if (!fila)
    throw new Error(
      `El ciclo ${ciclo} no tiene fila de validación; E1b debe ejecutarse antes que los metadatos.`,
    );
  return fila;
}

export function migrarMetadatosLegados(
  db: Database,
  opciones: OpcionesMetadatos = {},
): ResultadoMetadatos {
  const ahora = opciones.ahora ?? new Date();
  const observado = ahora.toISOString();
  if (!ISO.test(observado))
    throw new Error("Instante de migración con formato inesperado.");

  const resultado: ResultadoMetadatos = {
    recibos: {},
    creados: [],
    preservados: [],
    eventos: 0,
  };

  const existente = db.query(
    "SELECT huella,evento_id FROM cierre_validacion_manifiesto WHERE tabla=? AND pk=?",
  );
  const insertarManifiesto = db.query(
    `INSERT INTO cierre_validacion_manifiesto(tabla,pk,identidad,procedencia,
       observado_utc,huella,evento_id)
     VALUES(?,?,?,?,?,?,?)`,
  );
  const insertarEvento = db.query(
    `INSERT INTO cierre_validacion_audit(ciclo,revision,accion,actor,instante,
       motivo,intento,correlacion,origen,huella_anterior,huella_posterior,detalle)
     VALUES(?,?,?,?,?,?,NULL,NULL,?,NULL,NULL,?)`,
  );

  /**
   * Registra el recibo y, si toca, su evento. Devuelve `true` cuando la fila es
   * nueva: sólo entonces se aplica cualquier efecto de estado (marcar
   * pendiente), de modo que repetir la migración no reescribe nada.
   */
  function recibir(
    tabla: string,
    pk: string,
    identidad: Identidad,
    evento: {
      ciclo: string;
      accion: string;
      actor: string;
      instante: string;
      motivo: string | null;
      detalle: DetalleValidacion;
    } | null,
  ): boolean {
    const huella = huellaIdentidad(tabla, pk, identidad);
    const previo = existente.get(tabla, pk) as
      | { huella: string; evento_id: number | null }
      | null;
    if (previo) {
      if (previo.huella !== huella)
        throw new Error(
          `El metadato ${tabla}:${pk} ya está migrado con otra identidad: no se sobrescribe.`,
        );
      resultado.preservados.push(`${tabla}:${pk}`);
      return false;
    }

    let eventoId: number | null = null;
    if (evento) {
      const revision = filaValidacion(db, evento.ciclo).revision;
      const escrito = insertarEvento.run(
        evento.ciclo,
        revision,
        evento.accion,
        evento.actor,
        evento.instante,
        evento.motivo,
        `MIGRACION:${tabla}:${pk}`,
        serializarDetalleValidacion(evento.detalle),
      );
      eventoId = Number(escrito.lastInsertRowid);
      resultado.eventos += 1;
    }

    insertarManifiesto.run(
      tabla,
      pk,
      JSON.stringify(identidad),
      `MIGRACION:${tabla}:${pk}`,
      observado,
      huella,
      eventoId,
    );
    resultado.creados.push(`${tabla}:${pk}`);
    (resultado.recibos[tabla] ??= []).push(pk);
    return true;
  }

  const detallePara = (ciclo: string, procedencia: ProcedenciaValidada): DetalleValidacion =>
    construirDetalleValidacion({
      hechos: [],
      ciclos: [{ id: ciclo, impactos: [] }],
      cobertura: [],
      procedencia,
    });

  /* ---------------------------------------------------------------- *
   * 1 · Reaperturas y su fila activa
   * ---------------------------------------------------------------- */

  const reaperturas = db
    .query(
      `SELECT id,ciclo,version_origen,tipo,actor,creado_utc,motivo,correlacion,
              reapertura_origen
         FROM reaperturas ORDER BY id`,
    )
    .all() as Reapertura[];

  for (const fila of reaperturas) {
    if (!ISO.test(fila.creado_utc))
      throw new Error(`Reapertura ${fila.id} con instante ilegible.`);
    const pk = decimalCanonico(fila.id);
    recibir(
      "reaperturas",
      pk,
      {
        ciclo: fila.ciclo,
        versionOrigen: decimalCanonico(fila.version_origen),
        tipo: fila.tipo,
        correlacion: exigirIdTecnico(fila.correlacion, "correlacion"),
        reaperturaOrigen:
          fila.reapertura_origen === null
            ? null
            : decimalCanonico(fila.reapertura_origen),
      },
      {
        ciclo: fila.ciclo,
        accion: "legado_reapertura",
        actor: fila.actor,
        instante: fila.creado_utc,
        motivo: fila.motivo,
        detalle: detallePara(fila.ciclo, {
          tabla: "reaperturas",
          id: pk,
          version: decimalCanonico(fila.version_origen),
          reaperturaId: null,
          activa: null,
          versionOrigen: null,
          versionDestino: null,
          correlacion: exigirIdTecnico(fila.correlacion, "correlacion"),
        }),
      },
    );
  }

  const activas = db
    .query("SELECT id,ciclo,reapertura_id FROM reapertura_activa ORDER BY id")
    .all() as (ReaperturaActiva & { id: number })[];
  const marcarPendiente = db.query(
    `UPDATE cierre_validacion
        SET dirty=1,dirty_desde=?,dirty_ultimo=?,dirty_origen='ReaperturaActiva',
            dirty_motivos='[]'
      WHERE ciclo=? AND dirty=0`,
  );
  const reapertura = db.query(
    "SELECT actor,creado_utc FROM reaperturas WHERE id=? AND ciclo=?",
  );

  for (const activa of activas) {
    const origen = reapertura.get(activa.reapertura_id, activa.ciclo) as
      | { actor: string; creado_utc: string }
      | null;
    if (!origen)
      throw new Error(
        `Reapertura activa del ciclo ${activa.ciclo} sin fila de reapertura: metadato incoherente.`,
      );
    const nuevo = recibir(
      "reapertura_activa",
      decimalCanonico(activa.id),
      {
        ciclo: activa.ciclo,
        reaperturaId: decimalCanonico(activa.reapertura_id),
      },
      {
        ciclo: activa.ciclo,
        accion: "legado_reapertura_activa",
        actor: origen.actor,
        instante: origen.creado_utc,
        motivo: null,
        detalle: detallePara(activa.ciclo, {
          tabla: "reapertura_activa",
          id: decimalCanonico(activa.reapertura_id),
          version: null,
          reaperturaId: decimalCanonico(activa.reapertura_id),
          activa: true,
          versionOrigen: null,
          versionDestino: null,
          correlacion: null,
        }),
      },
    );
    if (nuevo)
      marcarPendiente.run(observado, observado, activa.ciclo);
  }

  /* ---------------------------------------------------------------- *
   * 2 · Vínculos de cierre
   * ---------------------------------------------------------------- */

  const vinculos = db
    .query(
      `SELECT ciclo,version_origen,version_destino,reapertura_id,correlacion
         FROM cierre_vinculos ORDER BY ciclo,version_destino`,
    )
    .all() as Vinculo[];

  for (const fila of vinculos) {
    const correlacion = exigirIdTecnico(fila.correlacion, "correlacion");
    const origen = reapertura.get(fila.reapertura_id, fila.ciclo) as
      | { actor: string; creado_utc: string }
      | null;
    if (!origen)
      throw new Error(
        `Vínculo del ciclo ${fila.ciclo} sin reapertura ${fila.reapertura_id}: metadato incoherente.`,
      );
    recibir(
      "cierre_vinculos",
      `${fila.ciclo}:${decimalCanonico(fila.version_destino)}`,
      {
        ciclo: fila.ciclo,
        versionOrigen: decimalCanonico(fila.version_origen),
        versionDestino: decimalCanonico(fila.version_destino),
        reaperturaId: decimalCanonico(fila.reapertura_id),
        correlacion,
      },
      {
        ciclo: fila.ciclo,
        accion: "legado_cierre_vinculo",
        actor: origen.actor,
        instante: origen.creado_utc,
        motivo: null,
        detalle: detallePara(fila.ciclo, {
          tabla: "cierre_vinculos",
          id: null,
          version: null,
          reaperturaId: decimalCanonico(fila.reapertura_id),
          activa: null,
          versionOrigen: decimalCanonico(fila.version_origen),
          versionDestino: decimalCanonico(fila.version_destino),
          correlacion,
        }),
      },
    );
  }

  /* ---------------------------------------------------------------- *
   * 3 · Auditoría de cierre legada
   * ---------------------------------------------------------------- */

  const auditorias = db
    .query(
      `SELECT id,ciclo,version,accion,motivo,instante,actor
         FROM cierre_audit ORDER BY id`,
    )
    .all() as AuditoriaCierre[];

  for (const fila of auditorias) {
    if (!ISO.test(fila.instante))
      throw new Error(`Auditoría de cierre ${fila.id} con instante ilegible.`);
    const pk = decimalCanonico(fila.id);
    recibir(
      "cierre_audit",
      pk,
      {
        ciclo: fila.ciclo,
        version: decimalCanonico(fila.version),
        accion: fila.accion,
      },
      {
        ciclo: fila.ciclo,
        accion: "legado_cierre_audit",
        actor: fila.actor,
        instante: fila.instante,
        motivo: fila.motivo,
        detalle: detallePara(fila.ciclo, {
          tabla: "cierre_audit",
          id: pk,
          version: decimalCanonico(fila.version),
          reaperturaId: null,
          activa: null,
          versionOrigen: null,
          versionDestino: null,
          correlacion: fila.accion,
        }),
      },
    );
  }

  /* ---------------------------------------------------------------- *
   * 4 · Metadatos de periodo → manifiesto tipado, sin eventos ni cifras
   * ---------------------------------------------------------------- */

  const periodos = db
    .query(
      `SELECT id,tipo,ejercicio,trimestre,version,creado_utc,actor,fingerprint,
              app_version,schema_version
         FROM fotos_periodo ORDER BY id`,
    )
    .all() as FotoPeriodo[];

  for (const fila of periodos) {
    if (!ISO.test(fila.creado_utc))
      throw new Error(`Foto de periodo ${fila.id} con instante ilegible.`);
    recibir(
      "fotos_periodo",
      decimalCanonico(fila.id),
      {
        tipo: fila.tipo,
        ejercicio: decimalCanonico(fila.ejercicio),
        trimestre: fila.trimestre === null ? null : decimalCanonico(fila.trimestre),
        version: fila.version,
        appVersion: fila.app_version,
        schemaVersion: decimalCanonico(fila.schema_version),
        creadoUtc: fila.creado_utc,
        fingerprint: fila.fingerprint,
      },
      null,
    );
  }

  const componentes = db
    .query(
      `SELECT periodo_id,ciclo,version_foto,fingerprint_foto,estado
         FROM foto_periodo_componentes ORDER BY periodo_id,ciclo`,
    )
    .all() as ComponentePeriodo[];

  for (const fila of componentes) {
    recibir(
      "foto_periodo_componentes",
      `${decimalCanonico(fila.periodo_id)}:${fila.ciclo}`,
      {
        periodoId: decimalCanonico(fila.periodo_id),
        ciclo: fila.ciclo,
        versionFoto:
          fila.version_foto === null ? null : decimalCanonico(fila.version_foto),
        fingerprintFoto: fila.fingerprint_foto,
        estado: fila.estado,
      },
      null,
    );
  }

  return resultado;
}