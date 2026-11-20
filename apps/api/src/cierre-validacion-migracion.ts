import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  construirDetalleValidacion,
  decimalCanonico,
  serializarDetalleValidacion,
  type CausaCobertura,
  type CoberturaValidada,
  type DetalleValidacion,
  type EstadoCobertura,
  type ProcedenciaValidada,
} from "./cierre-validacion-dto";
import { FUENTES_COBERTURA } from "./cierre-validacion-dto";

/**
 * SPEC38 · I1 — importación conservadora E1b (§7.2).
 *
 * **Decisión normativa:** todo cierre legado entra como **Pendiente**. No se
 * crea ninguna validación limpia por equivalencia de fotos: igualdad de totales
 * o de digest no es evidencia humana de atribución, cobertura, ventana/S0 y
 * posiciones, y no existe proyector semántico demostrado que lo sea.
 *
 * Por cada ciclo con alguna fila en `cierres`:
 *  - fila `cierre_validacion` de revisión técnica 1, `dirty=1`,
 *    `accion='migracion'` en el evento, `origen='MIGRACION:cierres:<ciclo>'`,
 *    `motivo=null` —la causa se lee como **transición**, no como impacto
 *    medido—, procedencia completa del cierre legado y
 *    `huella_validacion`/`version_conjunto` nulos: no hay referencia humana
 *    comparable en el conjunto nuevo;
 *  - evento `migracion` en `cierre_validacion_audit` con actor, instante y
 *    motivo originales conservados en sus campos propios;
 *  - recibo durable por `cierres:<ciclo>` en `validacion_attempts`, que es lo
 *    que hace idempotente la repetición.
 *
 * Sin cierre legado no se crea fila. La cobertura se deriva del bloque E4.9 de
 * la foto legada —nombres de fuente y estados, nunca cifras—; una foto ausente
 * o ilegible produce código de cobertura, jamás una limpieza automática.
 *
 * **Idempotencia:** el upsert sólo cubre la ausencia. Una fila humana ya
 * existente no se sobrescribe ni se duplica: repetir la transformación es un
 * no-op sobre ese ciclo.
 */

export type ResultadoImportacion = {
  /** Ciclos con cierre legado, en orden de ID. */
  legados: string[];
  /** Filas creadas por esta ejecución. */
  creados: string[];
  /** Ciclos con fila humana previa: no se tocan. */
  preservados: string[];
  /** Cobertura declarada por ciclo, sólo para el informe sin cifras. */
  cobertura: Record<string, CoberturaValidada[]>;
};

export type OpcionesImportacion = {
  /** Instante observado de la transición; determinista en pruebas. */
  ahora?: Date;
};

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type CierreLegado = {
  ciclo: string;
  version: number;
  inicio: string;
  fin: string;
  actor: string;
  creado_utc: string;
  motivo: string | null;
  fingerprint: string;
};

type FotoLegada = { cobertura: string };

const ESTADO_LEGADO: Record<string, EstadoCobertura> = {
  Completo: "Disponible",
  Parcial: "Parcial",
  "No disponible": "NoDisponible",
  NoDisponible: "NoDisponible",
  Disponible: "Disponible",
};

/**
 * Traduce el bloque `cobertura` de la foto E4.9 a códigos. Es una lectura
 * mecánica de nombres y estados ya persistidos: no recalcula ninguna magnitud,
 * no compara foto con vivo y no convierte una ausencia en cero.
 */
export function coberturaLegada(crudo: string | null): CoberturaValidada[] {
  let totales: Record<string, { estado?: unknown }> | null = null;
  let causaFoto: CausaCobertura | null = null;
  if (crudo === null) causaFoto = "FOTO_AUSENTE";
  else {
    try {
      const parseado = JSON.parse(crudo) as { totales?: unknown };
      if (typeof parseado !== "object" || parseado === null)
        causaFoto = "FOTO_ILEGIBLE";
      else if (
        typeof parseado.totales !== "object" ||
        parseado.totales === null ||
        Array.isArray(parseado.totales)
      )
        causaFoto = "FOTO_INCOMPLETA";
      else totales = parseado.totales as Record<string, { estado?: unknown }>;
    } catch {
      causaFoto = "FOTO_ILEGIBLE";
    }
  }
  const cobertura = FUENTES_COBERTURA.map((fuente) => {
    if (causaFoto) {
      return { fuente, estado: "NoDisponible" as EstadoCobertura, causas: [causaFoto] };
    }
    const entrada = totales?.[fuente];
    if (!entrada || typeof entrada !== "object") {
      return {
        fuente,
        estado: "NoDisponible" as EstadoCobertura,
        causas: ["FOTO_INCOMPLETA" as CausaCobertura],
      };
    }
    const estado = ESTADO_LEGADO[String(entrada.estado)];
    if (!estado) {
      return {
        fuente,
        estado: "NoDisponible" as EstadoCobertura,
        causas: ["MIGRACION_FUENTE_NO_ACREDITADA" as CausaCobertura],
      };
    }
    return estado === "Disponible"
      ? { fuente, estado, causas: [] as CausaCobertura[] }
      : { fuente, estado, causas: ["MIGRACION_FUENTE_NO_ACREDITADA" as CausaCobertura] };
  });
  return cobertura;
}

function procedenciaLegada(cierre: CierreLegado): ProcedenciaValidada {
  return {
    tabla: "cierres",
    id: null,
    version: decimalCanonico(cierre.version),
    reaperturaId: null,
    activa: null,
    versionOrigen: null,
    versionDestino: null,
    correlacion: null,
  };
}

function reciboMigracion(
  cierre: CierreLegado,
  operacionId: string,
  auditId: number,
): string {
  return JSON.stringify({
    operacionId,
    ciclos: [{ id: cierre.ciclo, revision: 1, estado: "Pendiente" }],
    auditIds: [auditId],
    cierresDirty: [
      {
        ciclo: cierre.ciclo,
        rango: { desde: cierre.inicio, hasta: cierre.fin },
        estadoValidacion: "Pendiente",
        validado: false,
        dirtyPrevio: true,
      },
    ],
  });
}

/**
 * Ejecuta E1b sobre una base v32 ya abierta, dentro de la transacción de quien
 * llama (la migración de esquema o una repetición explícita).
 */
export function importarCierresLegados(
  db: Database,
  opciones: OpcionesImportacion = {},
): ResultadoImportacion {
  const ahora = opciones.ahora ?? new Date();
  const instante = ahora.toISOString();
  if (!ISO.test(instante))
    throw new Error("Instante de migración con formato inesperado.");

  const legados = db
    .query(
      `SELECT DISTINCT ciclo FROM cierres ORDER BY length(ciclo), ciclo`,
    )
    .all() as { ciclo: string }[];

  const resultado: ResultadoImportacion = {
    legados: legados.map((fila) => fila.ciclo),
    creados: [],
    preservados: [],
    cobertura: {},
  };

  const ultimo = db.query(
    `SELECT ciclo,version,inicio,fin,actor,creado_utc,motivo,fingerprint
       FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1`,
  );
  const foto = db.query(
    "SELECT cobertura FROM fotos_cierre WHERE ciclo=? AND version=?",
  );
  const existente = db.query("SELECT 1 FROM cierre_validacion WHERE ciclo=?");
  const insertarFila = db.query(
    `INSERT INTO cierre_validacion(
       ciclo,revision,dirty,dirty_desde,dirty_ultimo,dirty_origen,dirty_motivos,
       huella_validacion,version_conjunto,revision_actor,revision_instante,revision_motivo,
       procedencia_tabla,procedencia_id,procedencia_version,procedencia_reapertura_id,
       procedencia_activa,procedencia_version_origen,procedencia_version_destino,
       procedencia_correlacion,procedencia_actor,procedencia_instante,procedencia_motivo,
       cobertura)
     VALUES(?,1,1,?,?,'Migracion','[]',NULL,NULL,NULL,NULL,NULL,
            'cierres',NULL,?,NULL,NULL,NULL,NULL,NULL,?,?,?,?)`,
  );
  const insertarEvento = db.query(
    `INSERT INTO cierre_validacion_audit(
       ciclo,revision,accion,actor,instante,motivo,intento,correlacion,origen,
       huella_anterior,huella_posterior,detalle)
     VALUES(?,1,'migracion',?,?,NULL,NULL,NULL,?,NULL,NULL,?)`,
  );
  const insertarRecibo = db.query(
    `INSERT INTO validacion_attempts(operacion,key,hash,response,completado,expira)
     VALUES('migracion',?,?,?,1,?)`,
  );

  for (const { ciclo } of legados) {
    if (existente.get(ciclo)) {
      resultado.preservados.push(ciclo);
      continue;
    }
    const cierre = ultimo.get(ciclo) as CierreLegado | null;
    if (!cierre)
      throw new Error(`Cierre legado ilegible para el ciclo ${ciclo}.`);
    if (!ISO.test(cierre.creado_utc))
      throw new Error(`Instante legado ilegible para el ciclo ${ciclo}.`);

    const cobertura = coberturaLegada(
      (foto.get(ciclo, cierre.version) as FotoLegada | null)?.cobertura ?? null,
    );
    const detalle: DetalleValidacion = construirDetalleValidacion({
      hechos: [],
      ciclos: [{ id: cierre.ciclo, impactos: [] }],
      cobertura,
      procedencia: procedenciaLegada(cierre),
    });
    const origen = `MIGRACION:cierres:${cierre.ciclo}`;
    const operacionId = `MIGRACION:cierres:${cierre.ciclo}`;

    insertarFila.run(
      cierre.ciclo,
      instante,
      instante,
      decimalCanonico(cierre.version),
      cierre.actor,
      cierre.creado_utc,
      cierre.motivo,
      JSON.stringify(cobertura),
    );
    const audit = insertarEvento.run(
      cierre.ciclo,
      cierre.actor,
      cierre.creado_utc,
      origen,
      serializarDetalleValidacion(detalle),
    );
    const auditId = Number(audit.lastInsertRowid);
    const response = reciboMigracion(cierre, operacionId, auditId);
    insertarRecibo.run(
      `cierres:${cierre.ciclo}`,
      createHash("sha256")
        .update(
          JSON.stringify({
            tabla: "cierres",
            ciclo: cierre.ciclo,
            version: cierre.version,
            accion: "migracion",
          }),
          "utf8",
        )
        .digest("hex"),
      response,
      ahora.getTime() + 24 * 60 * 60 * 1000,
    );
    resultado.creados.push(cierre.ciclo);
    resultado.cobertura[cierre.ciclo] = cobertura;
  }

  return resultado;
}
