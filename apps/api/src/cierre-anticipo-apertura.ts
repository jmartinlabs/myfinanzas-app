import type { Database } from "bun:sqlite";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — conservación de Anticipos ante una corrección de Inicio
 * (§4.2 y §4.3).
 *
 * `fotos_neto_apertura` es **declaración de negocio** de E3.1 por REF+ciclo,
 * con evidencia y procedencia: no es una foto financiera de E4.9–E4.11 y no se
 * retira. Lo que la SPEC cambia es el veto: «no se puede mover un Inicio porque
 * hay una declaración» pasa a ser un procedimiento autorizado con dos clases.
 *
 * - **Clase A** — no entran ni salen hechos de la REF y la declaración sigue
 *   concuerda con el corte nuevo: reanclaje automático auditado, sin nueva
 *   confirmación humana.
 * - **Clase B** — entran o salen hechos, o la evidencia/importe no concuerda:
 *   exige, por REF, importe explícito, evidencia, procedencia, cobertura,
 *   confirmación y motivo. Sin evidencia **no se guarda el Inicio**.
 *
 * El orden de escritura lo impone el esquema (`cierre-validacion-schema.ts`):
 * evento y capacidad PREPARADA → ciclo X→Y con revisión r+1 → cada apertura
 * X→Y con revisión a+1 → consumo de capacidades → verificación final. La
 * existencia histórica de un evento no autoriza nada: la autorización es la
 * capacidad de **este** intento, y el trigger la exige.
 */

export type ClaseReanclaje = "A" | "B";

export type RefReanclaje = {
  referencia: string;
  revisionApertura: number;
  importeDeclarado: string;
  importeAcreditado: string | null;
  evidencia: string;
  procedencia: string;
  cobertura: string;
  motivo: string | null;
  clase: ClaseReanclaje;
};

export type PlanReanclaje = {
  clase: ClaseReanclaje;
  refs: RefReanclaje[];
  /** Motivos legibles de la clasificación, sin importes ajenos. */
  causas: string[];
};

type Aporte = {
  referencia?: unknown;
  importe?: unknown;
  evidencia?: unknown;
  procedencia?: unknown;
  coberturaVerificada?: unknown;
  confirmado?: unknown;
  motivo?: unknown;
};

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim().length > 0 && valor.length <= 2000
    ? valor.trim()
    : null;
}

function entero(valor: unknown): string | null {
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const texto = String(valor).replace(/[.,]/g, "");
  return /^[0-9]+$/.test(texto) ? texto : null;
}

type FilaApertura = {
  referencia: string;
  inicio: string;
  importe: string;
  evidencia: string;
  procedencia: string;
  cobertura: string;
  revision: number;
};

type FilaTransferencia = {
  id: string;
  fecha: string;
  importe: string;
  rol: string | null;
  anulado: number;
  revision: number;
  revision_movimiento: number | null;
  origen: string;
  destino: string;
  a_origen: string | null;
  a_destino: string | null;
};

function aperturas(db: Database, ciclo: string): FilaApertura[] {
  const existe = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='fotos_neto_apertura'")
    .get();
  if (!existe) return [];
  return db
    .query(
      `SELECT referencia,inicio,CAST(importe AS TEXT) importe,evidencia,procedencia,
              cobertura,revision
         FROM fotos_neto_apertura WHERE ciclo=? ORDER BY referencia`,
    )
    .all(ciclo) as FilaApertura[];
}

function transferencias(db: Database, referencia: string): FilaTransferencia[] {
  const metadata = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='movimiento_anticipo'")
    .get();
  if (!metadata) return [];
  return db
    .query(
      `SELECT m.id,m.fecha,CAST(m.importe AS TEXT) importe,a.rol,m.anulado,m.revision,
              a.revision_movimiento,m.origen,m.destino,a.origen a_origen,a.destino a_destino
         FROM movimientos m LEFT JOIN movimiento_anticipo a ON a.movimiento=m.id
        WHERE m.referencia=? AND m.tipo='Transferencia'
        ORDER BY m.fecha,length(m.id),m.id`,
    )
    .all(referencia) as FilaTransferencia[];
}

/** Una transferencia cuenta sólo si está vigente, atribuida y con revisión viva. */
function acreditada(fila: FilaTransferencia): boolean {
  if (fila.anulado === 1 || !fila.rol) return false;
  if (fila.revision_movimiento !== null && fila.revision_movimiento !== fila.revision)
    return false;
  if (fila.rol === "Adelanto") return fila.a_origen === fila.origen && fila.a_destino === fila.destino;
  return fila.a_origen === fila.destino && fila.a_destino === fila.origen;
}

/**
 * Neto de apertura acreditado antes del corte: adelantos menos devoluciones de
 * la REF. Es la misma aritmética del negocio de Anticipos, no una cifra nueva.
 */
function netoAntesDeCorte(db: Database, referencia: string, corte: string): string | null {
  const filas = transferencias(db, referencia).filter(
    (fila) => fila.fecha < corte && acreditada(fila),
  );
  if (!filas.length) return "0";
  let neto = 0n;
  for (const fila of filas)
    neto += fila.rol === "Adelanto" ? BigInt(fila.importe) : -BigInt(fila.importe);
  return neto.toString();
}

/** ¿Algún hecho de la REF cruza el tramo que mueve el corte? */
function cruzaCorte(db: Database, referencia: string, anterior: string, nuevo: string) {
  return transferencias(db, referencia).some((fila) =>
    anterior < nuevo
      ? fila.fecha > anterior && fila.fecha <= nuevo
      : fila.fecha >= nuevo && fila.fecha < anterior,
  );
}

/**
 * Clasifica el reanclaje y, en clase B, exige los datos que la SPEC pide por
 * REF. Devuelve `null` cuando el ciclo no tiene declaraciones de apertura: no
 * hay nada que conservar y la corrección sigue su curso ordinario.
 */
export function planReanclaje(
  db: Database,
  ciclo: string,
  corteAnterior: string,
  corteNuevo: string,
  aportados: unknown,
): PlanReanclaje | null {
  const filas = aperturas(db, ciclo);
  if (!filas.length) return null;
  // Sin movimiento del corte no hay reanclaje: la declaración sigue apuntando
  // al mismo Inicio y no se toca ni su revisión ni su evidencia.
  if (corteAnterior === corteNuevo) return null;
  const lista = Array.isArray(aportados) ? (aportados as Aporte[]) : [];
  const causas: string[] = [];
  const refs: RefReanclaje[] = filas.map((fila) => {
    const acreditado = netoAntesDeCorte(db, fila.referencia, corteNuevo);
    const cruza = cruzaCorte(db, fila.referencia, corteAnterior, corteNuevo);
    const aporte = lista.find((item) => item.referencia === fila.referencia) ?? null;
    const concuerda = acreditado !== null && acreditado === fila.importe;
    const clase: ClaseReanclaje = !cruza && concuerda && !aporte ? "A" : "B";
    if (clase === "A")
      return {
        referencia: fila.referencia,
        revisionApertura: fila.revision,
        importeDeclarado: fila.importe,
        importeAcreditado: acreditado,
        evidencia: fila.evidencia,
        procedencia: fila.procedencia,
        cobertura: fila.cobertura,
        motivo: null,
        clase,
      };
    causas.push(
      `${fila.referencia}: ${cruza ? "hay hechos que cruzan el corte" : "la declaración no concuerda con el corte nuevo"}`,
    );
    const importe = entero(aporte?.importe);
    const evidencia = texto(aporte?.evidencia);
    const procedencia = texto(aporte?.procedencia);
    if (!importe || !evidencia || !procedencia || aporte?.coberturaVerificada !== true)
      throw new Problem(
        422,
        "ANTICIPO_APERTURA_INCOHERENTE",
        `La apertura de ${fila.referencia} exige importe explícito, evidencia, procedencia y cobertura verificada antes de mover el Inicio.`,
        {
          referencia: fila.referencia,
          motivo:
            "Clase B: sin evidencia no se guarda el Inicio. Acredita por REF el importe y su cobertura.",
        },
      );
    if (aporte?.confirmado !== true)
      throw new Problem(
        422,
        "ANTICIPO_APERTURA_INCOHERENTE",
        `La reacreditación de ${fila.referencia} exige confirmación explícita.`,
        { referencia: fila.referencia, confirmado: "Confirma la reacreditación por REF." },
      );
    const motivo = texto(aporte?.motivo);
    if (!motivo)
      throw new Problem(
        422,
        "ANTICIPO_APERTURA_INCOHERENTE",
        `La reacreditación de ${fila.referencia} exige motivo.`,
        { referencia: fila.referencia, motivo: "Motivo de reacreditación obligatorio." },
      );
    return {
      referencia: fila.referencia,
      revisionApertura: fila.revision,
      importeDeclarado: importe,
      importeAcreditado: acreditado,
      evidencia,
      procedencia,
      cobertura: "Verificada por declaración y evidencia explícitas",
      motivo,
      clase,
    };
  });
  const clase: ClaseReanclaje = refs.every((ref) => ref.clase === "A") ? "A" : "B";
  return { clase, refs, causas };
}

export type EscrituraReanclaje = {
  ciclo: string;
  corteAnterior: string;
  corteNuevo: string;
  revisionCiclo: number;
  plan: PlanReanclaje;
  intento: string;
  actor: string;
  instante: string;
  huellaAnterior: string | null;
  huellaPosterior: string | null;
};

/**
 * Paso 2 de §4.3: eventos append-only y capacidades PREPARADA ligadas a las
 * revisiones exactas del ciclo y de cada apertura. Se ejecuta **antes** de
 * tocar `ciclos.inicio`, porque el trigger del ciclo exige la capacidad viva.
 */
export function prepararReanclaje(db: Database, escritura: EscrituraReanclaje): number {
  db.run("INSERT INTO anticipo_apertura_guard(id,intento) VALUES(1,?)", [escritura.intento]);
  let eventos = 0;
  for (const ref of escritura.plan.refs) {
    const evento = db.run(
      `INSERT INTO anticipo_apertura_evento(referencia,ciclo,intento,
         revision_ciclo_esperada,revision_ciclo_resultante,
         revision_apertura_esperada,revision_apertura_resultante,
         corte_anterior,corte_nuevo,clase,actor,instante,motivo,
         huella_anterior,huella_posterior)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ref.referencia,
        escritura.ciclo,
        escritura.intento,
        escritura.revisionCiclo,
        escritura.revisionCiclo + 1,
        ref.revisionApertura,
        ref.revisionApertura + 1,
        escritura.corteAnterior,
        escritura.corteNuevo,
        ref.clase,
        escritura.actor,
        escritura.instante,
        ref.motivo,
        escritura.huellaAnterior,
        escritura.huellaPosterior,
      ],
    );
    db.run(
      `INSERT INTO anticipo_apertura_autorizacion(intento,referencia,evento,ciclo,
         revision_ciclo,revision_apertura,corte_anterior,corte_nuevo,fase)
       VALUES(?,?,?,?,?,?,?,?,'PREPARADA')`,
      [
        escritura.intento,
        ref.referencia,
        Number(evento.lastInsertRowid),
        escritura.ciclo,
        escritura.revisionCiclo,
        ref.revisionApertura,
        escritura.corteAnterior,
        escritura.corteNuevo,
      ],
    );
    eventos += 1;
  }
  return eventos;
}

/**
 * Paso 4 de §4.3: cada apertura X→Y con revisión a+1 y, sólo en clase B, el dato
 * declarado reacreditado. El trigger exige CICLO_APLICADO, el ciclo ya en Y y la
 * revisión esperada, y consume la capacidad.
 */
export function aplicarAperturasReanclaje(db: Database, escritura: EscrituraReanclaje): void {
  for (const ref of escritura.plan.refs) {
    const cambio = db.run(
      `UPDATE fotos_neto_apertura
          SET inicio=?,revision=revision+1,importe=?,evidencia=?,procedencia=?,
              cobertura=?,confirmado=?
        WHERE referencia=? AND ciclo=? AND revision=?`,
      [
        escritura.corteNuevo,
        ref.importeDeclarado,
        ref.evidencia,
        ref.procedencia,
        ref.cobertura,
        escritura.instante,
        ref.referencia,
        escritura.ciclo,
        ref.revisionApertura,
      ],
    );
    if (cambio.changes !== 1)
      throw new Problem(
        409,
        "REVISION_CONFLICT",
        `La apertura de ${ref.referencia} cambió durante la operación.`,
      );
  }
}

/**
 * Paso 6: capacidades y guard fuera de la transacción antes del COMMIT. Las
 * capacidades no sobreviven a un commit correcto y el envoltorio comprueba que
 * no queda ninguna.
 */
export function cerrarReanclaje(db: Database): void {
  db.run("DELETE FROM anticipo_apertura_autorizacion");
  db.run("DELETE FROM anticipo_apertura_guard");
}

/** Verificación final de la invariante de §4.3 (no hay triggers diferidos). */
export function verificarReanclaje(db: Database, escritura: EscrituraReanclaje): void {
  const pendientes = db
    .query("SELECT COUNT(*) n FROM anticipo_apertura_autorizacion")
    .get() as { n: number };
  if (pendientes.n !== 0)
    throw new Problem(500, "INVARIANT", "Quedaron capacidades de apertura sin consumir.");
  const ciclo = db
    .query("SELECT inicio,revision FROM ciclos WHERE id=?")
    .get(escritura.ciclo) as { inicio: string; revision: number } | null;
  if (!ciclo || ciclo.inicio !== escritura.corteNuevo || ciclo.revision !== escritura.revisionCiclo + 1)
    throw new Problem(
      500,
      "INVARIANT",
      "El ciclo no quedó en el corte y la revisión esperados.",
    );
  const aperturasCiclo = db
    .query("SELECT referencia,inicio,revision FROM fotos_neto_apertura WHERE ciclo=?")
    .all(escritura.ciclo) as { referencia: string; inicio: string; revision: number }[];
  for (const fila of aperturasCiclo)
    if (fila.inicio !== escritura.corteNuevo)
      throw new Problem(
        500,
        "INVARIANT",
        `La apertura de ${fila.referencia} no quedó alineada con el Inicio.`,
      );
  const eventos = db
    .query(
      "SELECT COUNT(*) n FROM anticipo_apertura_evento WHERE ciclo=? AND intento=?",
    )
    .get(escritura.ciclo, escritura.intento) as { n: number };
  if (eventos.n !== escritura.plan.refs.length)
    throw new Problem(500, "INVARIANT", "Faltan eventos de apertura del intento.");
}