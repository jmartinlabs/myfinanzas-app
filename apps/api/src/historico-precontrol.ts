/**
 * E4.5 — motor puro de histórico precontrol y transición de ejercicio.
 *
 * Este módulo implementa SOLO el combinador de lectura de la SPEC20: recibe
 * registros de archivo, fuentes/cobertura, universo DT7 declarado y Gastos
 * detallados; devuelve estados, componentes, huecos, solapes, total,
 * subtotal conocido, `sinClasificar` y aperturas.
 *
 * Límites deliberados de este primer G-DEV:
 * - No hay base de datos, SQL, persistencia, migración, importación, API, UI
 *   ni lectura de ficheros. Todas las funciones son deterministas.
 * - No se crean Movimientos, Saldos, Deudas, Partidas, planes, fotos ni
 *   cierres. Las aperturas históricas se muestran aparte y nunca suman a
 *   Gastos.
 * - Los importes de entrada son céntimos enteros exactos (`importeCentimos`);
 *   la salida usa decimal exacto (`"1200.00"`). Nunca hay coma flotante.
 * - `null` no es `0`: `"0.00"` solo aparece con cobertura/registro verificado.
 * - No se prorratea, no se recorta un importe agregado y no se elige fuente
 *   por importe. Un solape o duplicado no resoluble deja total/subtotal `null`.
 * - Un corte futuro solo se rechaza si el llamador aporta `hoy`; el módulo no
 *   consulta el reloj, porque una función pura no debe depender de la hora.
 *
 * Este motor NO acredita DT7, no certifica totales reales y no declara PASS de
 * ningún AC. Los fixtures que lo ejercitan son sintéticos.
 *
 * Referencias: specs/20-historico-precontrol-specification.md (D4, D14,
 * cobertura, combinador, transición, regularización) y
 * specs/investigations/dt7-preparation-2026-11-05.md (F-DT7-01…25).
 */

export type FechaCivil = string; // YYYY-MM-DD

export type Intervalo = { inicio: FechaCivil; fin: FechaCivil };

export type ClaseGasto =
  | "GastoHistorico"
  | "Regularizacion2026"
  | "AperturaHistorica";

export type EstadoVerificacion = "Verificado" | "NoVerificado" | "Rechazado";

export type EstadoMapeoPartida =
  | "Mapeado"
  | "Pendiente"
  | "Ambigua"
  | "Excluido";

export type EstadoMapeoReferencia =
  | "NoAplica"
  | "Pendiente"
  | "Ambigua"
  | "Mapeado";

export type Representacion = "Si" | "No" | "Desconocido";

export type EstadoCobertura =
  | "Completa"
  | "Parcial"
  | "NoAcreditada"
  | "NoDisponible"
  | "Solapada";

export type EstadoTotal = "Verificado" | "NoVerificable" | "NoDisponible";

export type MotivoCodigo =
  | "SinFuente"
  | "HuecoDemostrado"
  | "FuenteAusente"
  | "UniversoNoAcreditado"
  | "AusenciaVerificadaSinHechos"
  | "Solapamiento"
  | "DuplicadoAmbiguo"
  | "MappingPendiente"
  | "VerificacionPendiente"
  | "RegularizacionPendiente"
  | "AperturaNoGasto"
  | "AgregadoNoAtribuibleAlCorte";

export type TipoConflicto =
  | "Solapamiento"
  | "DuplicadoAmbiguo"
  | "DosFuentes"
  | "VersionBifurcada"
  | "FueraDeUniverso";

export type ConflictoPrecontrol = {
  tipo: TipoConflicto;
  partidaId: string | null;
  intervalo: Intervalo | null;
  /** Solo se informa si el importe afectado es separable; nunca se prorratea. */
  importe: string | null;
  fuente: string | null;
  motivo: string;
};

/** Registro de archivo histórico (contrato de lectura, no tabla). */
export type RegistroPrecontrol = {
  idArchivo: string;
  /** Identidad de origen estable: documento/hoja/ID o coordenada aprobada. */
  identidad: string;
  fuenteId: string;
  ejercicio: number;
  clase: ClaseGasto;
  intervalo: Intervalo;
  partidaId: string | null;
  referenciaId: string | null;
  /** Solo para `AperturaHistorica` de Saldo; nunca para Gastos. */
  saldoId: string | null;
  importeCentimos: string;
  /** Fecha económica acreditada o `null`; el intervalo no es fecha económica. */
  fecha: FechaCivil | null;
  huellaContenido: string;
  estadoVerificacion: EstadoVerificacion;
  estadoMapeo: EstadoMapeoPartida;
  estadoMapeoReferencia: EstadoMapeoReferencia;
  representadoEnMovimientos: Representacion;
  /** Vínculo de origen verificado para `representadoEnMovimientos=Si`. */
  evidenciaRepresentacion: string | null;
  /** Evidencia estructurada de no duplicidad para `Desconocido`→subtotal. */
  evidenciaNoDuplicidad: string | null;
  /** Q5=A: naturaleza, signo, inclusión y tratamiento de la regularización. */
  evidenciaRegularizacion: string | null;
  version: number;
  reemplazaA: number | null;
  motivo: string | null;
};

export type TipoMovimiento = "Gasto" | "Ingreso" | "Transferencia" | "Amortizacion";

/** Hecho detallado. Solo `Gasto` vigente y con fecha entra en el combinador. */
export type MovimientoPrecontrol = {
  idMovimiento: string;
  partidaId: string;
  fecha: FechaCivil;
  importeCentimos: string;
  tipo: TipoMovimiento;
  anulado: boolean;
  /** Enlace al `idArchivo` que este Movimiento representa (F13/F-DT7-12). */
  vinculoArchivoId: string | null;
};

export type FuentePrecontrol = {
  fuenteId: string;
  etiqueta: string;
  /** `Global` o el `PARxxx` al que se limita su control. */
  alcance: "Global" | string;
  corteArchivo: FechaCivil;
  /** Intervalos verificados de Gastos históricos/regularización. */
  intervalosArchivo: {
    intervalo: Intervalo;
    partidaId: string;
    clase: "GastoHistorico" | "Regularizacion2026";
  }[];
  controlDetalle: Intervalo | null;
  versionMapping: string;
};

export type UniversoPrecontrol = {
  estado: "Acreditado" | "NoAcreditado";
  /** Declaración cerrada DT7; nunca se amplía por descubrimiento. */
  partidas: string[];
  fuentesEsperadas: {
    fuenteId: string;
    partidaId: string;
    estado: "Presente" | "Ausente" | "NoAplica";
  }[];
};

export type EntradaPrecontrol = {
  ejercicio: number;
  corte: FechaCivil;
  /** Reloj civil del llamador; si falta, no se valida el futuro. */
  hoy?: FechaCivil;
  universo: UniversoPrecontrol;
  fuentes: FuentePrecontrol[];
  registros: RegistroPrecontrol[];
  movimientos: MovimientoPrecontrol[];
};

export type SinClasificar = {
  idArchivo: string;
  importe: string;
  motivo: string;
};

export type AgregadoNoAtribuible = {
  idArchivo: string;
  partidaId: string;
  intervalo: Intervalo;
  importe: string;
};

export type AperturaPrecontrol = {
  idArchivo: string;
  saldoId: string | null;
  importe: string;
  fecha: FechaCivil | null;
  motivo: string | null;
};

export type FuenteResumen = {
  fuenteId: string;
  etiqueta: string;
  alcance: string;
  corteArchivo: FechaCivil;
  versionMapping: string;
};

export type ItemPrecontrol = {
  partidaId: string;
  archivo: string | null;
  detalleControl: string | null;
  detallePrecontrolVinculado: string | null;
  detallePrecontrolNoVinculado: string | null;
  total: string | null;
  subtotalConocido: string | null;
  estadoCobertura: EstadoCobertura;
  estadoTotal: EstadoTotal;
  motivoCodigo: MotivoCodigo | null;
  motivo: string | null;
  cobertura: {
    intervalos: Intervalo[];
    huecos: Intervalo[];
    fuentes: string[];
  };
  /** `idArchivo` vigentes de la Partida, sumen o no. */
  registros: string[];
  /** Versiones anteriores conservadas como historia; nunca suman. */
  historicos: string[];
  conflictos: ConflictoPrecontrol[];
};

export type ResultadoPrecontrol = {
  tipoRegistro: "Archivo";
  ejercicio: number;
  corte: FechaCivil;
  alcanceTotal: "Anual" | "HastaCorte";
  universo: {
    estado: "Acreditado" | "NoAcreditado";
    partidas: string[];
  };
  cobertura: {
    estadoCobertura: EstadoCobertura;
    coberturaGlobal: EstadoCobertura;
    estadoUniverso: "Acreditado" | "NoAcreditado";
    universoPartidas: string[];
    fuentesEsperadas: UniversoPrecontrol["fuentesEsperadas"];
    fuentes: FuenteResumen[];
    huecos: (Intervalo & { partidaId: string })[];
    ultimoDatoVerificado: FechaCivil | null;
  };
  items: ItemPrecontrol[];
  totales: {
    valor: string | null;
    subtotalConocido: string | null;
    estadoTotal: EstadoTotal;
    estadoCobertura: EstadoCobertura;
    motivoCodigo: MotivoCodigo | null;
    motivo: string | null;
  };
  sinClasificar: SinClasificar[];
  conflictos: ConflictoPrecontrol[];
  agregadoNoAtribuible: AgregadoNoAtribuible[];
  /** `null` = sin evidencia de apertura; una apertura cero verificada es `"0.00"`. */
  aperturas: AperturaPrecontrol[] | null;
  duplicadosAbsorbidos: { idArchivo: string; identidad: string }[];
  versionesHistoricas: { idArchivo: string; identidad: string; version: number }[];
};

export type ResultadoTransicion = {
  ejercicioDesde: number;
  ejercicioHasta: number;
  desde: ResultadoPrecontrol;
  hasta: ResultadoPrecontrol;
  /** La transición es una vista: nunca suma ambos ejercicios. */
  totalPlurianual: null;
  sumaPlurianual: false;
  crea: {
    planes: false;
    movimientos: false;
    aperturas: false;
    fotos: false;
    cierres: false;
  };
};

/** Error de entrada estructural; la futura API lo traduciría a 422. */
export class ErrorPrecontrol extends Error {
  readonly codigo = "EntradaInvalida";
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorPrecontrol";
  }
}

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const ENTERO = /^-?(0|[1-9]\d*)$/;
const DIA_MS = 86_400_000;

function exigir(condicion: unknown, mensaje: string): void {
  if (!condicion) throw new ErrorPrecontrol(mensaje);
}

function fechaValida(valor: string): FechaCivil {
  const partes = FECHA.exec(valor);
  if (!partes) throw new ErrorPrecontrol("Fecha civil inválida.");
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() + 1 !== mes ||
    fecha.getUTCDate() !== dia
  )
    throw new ErrorPrecontrol("Fecha civil inválida.");
  return valor;
}

function sumarDias(valor: FechaCivil, dias: number): FechaCivil {
  const [anio, mes, dia] = valor.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia) + dias * DIA_MS)
    .toISOString()
    .slice(0, 10);
}

function centimos(valor: string): bigint {
  if (typeof valor !== "string" || !ENTERO.test(valor))
    throw new ErrorPrecontrol(
      "importeCentimos debe ser un entero exacto de céntimos.",
    );
  return BigInt(valor);
}

function decimal(valor: bigint): string {
  const negativo = valor < 0n;
  const absoluto = negativo ? -valor : valor;
  const entero = absoluto / 100n;
  const resto = String(absoluto % 100n).padStart(2, "0");
  return `${negativo ? "-" : ""}${entero}.${resto}`;
}

function desdeDecimal(valor: string): bigint {
  if (!/^-?\d+\.\d{2}$/.test(valor))
    throw new ErrorPrecontrol("Decimal de salida inválido.");
  const negativo = valor.startsWith("-");
  const [entero, resto] = (negativo ? valor.slice(1) : valor).split(".");
  const total = BigInt(entero!) * 100n + BigInt(resto!);
  return negativo ? -total : total;
}

function inicioEjercicio(ejercicio: number): FechaCivil {
  return `${String(ejercicio).padStart(4, "0")}-01-01`;
}

function finEjercicio(ejercicio: number): FechaCivil {
  return `${String(ejercicio).padStart(4, "0")}-12-31`;
}

function recortar(intervalo: Intervalo, desde: FechaCivil, hasta: FechaCivil) {
  const inicio = intervalo.inicio < desde ? desde : intervalo.inicio;
  const fin = intervalo.fin > hasta ? hasta : intervalo.fin;
  return inicio <= fin ? { inicio, fin } : null;
}

function unirIntervalos(intervalos: Intervalo[]): Intervalo[] {
  const orden = [...intervalos].sort(
    (a, b) => a.inicio.localeCompare(b.inicio) || a.fin.localeCompare(b.fin),
  );
  const unidos: Intervalo[] = [];
  for (const intervalo of orden) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && intervalo.inicio <= sumarDias(ultimo.fin, 1)) {
      if (intervalo.fin > ultimo.fin) ultimo.fin = intervalo.fin;
    } else {
      unidos.push({ ...intervalo });
    }
  }
  return unidos;
}

function huecosEntre(
  unidos: Intervalo[],
  desde: FechaCivil,
  hasta: FechaCivil,
): Intervalo[] {
  const huecos: Intervalo[] = [];
  let cursor = desde;
  for (const intervalo of unidos) {
    if (intervalo.fin < desde || intervalo.inicio > hasta) continue;
    const inicio = intervalo.inicio > desde ? intervalo.inicio : desde;
    if (inicio > cursor)
      huecos.push({ inicio: cursor, fin: sumarDias(inicio, -1) });
    if (intervalo.fin >= cursor) cursor = sumarDias(intervalo.fin, 1);
    if (cursor > hasta) break;
  }
  if (cursor <= hasta) huecos.push({ inicio: cursor, fin: hasta });
  return huecos;
}

function interseccion(a: Intervalo, b: Intervalo): Intervalo | null {
  const inicio = a.inicio > b.inicio ? a.inicio : b.inicio;
  const fin = a.fin < b.fin ? a.fin : b.fin;
  return inicio <= fin ? { inicio, fin } : null;
}

/** Une intervalos civiles inclusivos (exportado para pruebas y consumidores). */
export function intervalosUnidos(intervalos: Intervalo[]): Intervalo[] {
  for (const intervalo of intervalos) validarIntervalo(intervalo);
  return unirIntervalos(intervalos);
}

/** Huecos inclusivos dentro de `[desde, hasta]` que no cubre la unión. */
export function huecosDeCobertura(
  intervalos: Intervalo[],
  desde: FechaCivil,
  hasta: FechaCivil,
): Intervalo[] {
  fechaValida(desde);
  fechaValida(hasta);
  exigir(desde <= hasta, "Intervalo de cobertura invertido.");
  for (const intervalo of intervalos) validarIntervalo(intervalo);
  return huecosEntre(unirIntervalos(intervalos), desde, hasta);
}

function validarIntervalo(intervalo: Intervalo): void {
  fechaValida(intervalo.inicio);
  fechaValida(intervalo.fin);
  exigir(
    intervalo.inicio <= intervalo.fin,
    "El intervalo debe cumplir inicio <= fin.",
  );
}

function dentroDeEjercicio(intervalo: Intervalo, ejercicio: number): boolean {
  return (
    intervalo.inicio >= inicioEjercicio(ejercicio) &&
    intervalo.fin <= finEjercicio(ejercicio)
  );
}

function contiene(intervalo: Intervalo, fecha: FechaCivil): boolean {
  return fecha >= intervalo.inicio && fecha <= intervalo.fin;
}

function validarEntrada(entrada: EntradaPrecontrol): void {
  exigir(
    Number.isSafeInteger(entrada.ejercicio) &&
      entrada.ejercicio >= 1 &&
      entrada.ejercicio <= 9999,
    "Ejercicio inválido.",
  );
  fechaValida(entrada.corte);
  exigir(
    dentroDeEjercicio({ inicio: entrada.corte, fin: entrada.corte }, entrada.ejercicio),
    "El corte debe estar dentro del ejercicio.",
  );
  if (entrada.hoy !== undefined) {
    fechaValida(entrada.hoy);
    exigir(entrada.corte <= entrada.hoy, "El corte no puede ser futuro.");
  }

  const universo = entrada.universo;
  exigir(
    universo.estado === "Acreditado" || universo.estado === "NoAcreditado",
    "Estado de universo inválido.",
  );
  exigir(
    new Set(universo.partidas).size === universo.partidas.length,
    "El universo contiene Partidas duplicadas.",
  );
  if (universo.estado === "Acreditado")
    exigir(universo.partidas.length > 0, "Universo acreditado sin Partidas.");
  for (const esperada of universo.fuentesEsperadas) {
    exigir(
      ["Presente", "Ausente", "NoAplica"].includes(esperada.estado),
      "Estado de fuente esperada inválido.",
    );
  }

  const fuentes = new Set<string>();
  for (const fuente of entrada.fuentes) {
    exigir(!fuentes.has(fuente.fuenteId), "fuenteId duplicado.");
    fuentes.add(fuente.fuenteId);
    fechaValida(fuente.corteArchivo);
    exigir(
      dentroDeEjercicio(
        { inicio: fuente.corteArchivo, fin: fuente.corteArchivo },
        entrada.ejercicio,
      ),
      "corteArchivo fuera del ejercicio.",
    );
    for (const tramo of fuente.intervalosArchivo) {
      validarIntervalo(tramo.intervalo);
      exigir(
        dentroDeEjercicio(tramo.intervalo, entrada.ejercicio),
        "Intervalo de archivo fuera del ejercicio.",
      );
    }
    if (fuente.controlDetalle) {
      validarIntervalo(fuente.controlDetalle);
      exigir(
        dentroDeEjercicio(fuente.controlDetalle, entrada.ejercicio),
        "controlDetalle fuera del ejercicio.",
      );
    }
  }

  const ids = new Set<string>();
  for (const registro of entrada.registros) {
    exigir(!ids.has(registro.idArchivo), "idArchivo duplicado.");
    ids.add(registro.idArchivo);
    exigir(
      registro.ejercicio === entrada.ejercicio,
      "Registro de otro ejercicio en la consulta.",
    );
    validarIntervalo(registro.intervalo);
    exigir(
      dentroDeEjercicio(registro.intervalo, entrada.ejercicio),
      "Intervalo de registro fuera del ejercicio.",
    );
    const importe = centimos(registro.importeCentimos);
    exigir(
      registro.clase !== "GastoHistorico" || importe >= 0n,
      "GastoHistorico no admite importe negativo.",
    );
    exigir(
      Number.isSafeInteger(registro.version) && registro.version >= 1,
      "Versión de registro inválida.",
    );
    exigir(
      registro.reemplazaA === null ||
        (Number.isSafeInteger(registro.reemplazaA) &&
          registro.reemplazaA >= 1 &&
          registro.reemplazaA !== registro.version),
      "reemplazaA inválido.",
    );
  }

  for (const movimiento of entrada.movimientos) {
    fechaValida(movimiento.fecha);
    centimos(movimiento.importeCentimos);
  }
}

type ResolucionVersiones = {
  vigentes: RegistroPrecontrol[];
  historicos: RegistroPrecontrol[];
  absorbidos: { idArchivo: string; identidad: string }[];
  conflictos: ConflictoPrecontrol[];
  identidadesConflictuadas: Set<string>;
};

/**
 * Resuelve la cadena `reemplazaA`: solo la versión vigente contribuye; las
 * anteriores se conservan como historia. Duplicados físicos con la misma
 * identidad y huella se absorben. Huellas distintas en la misma versión o dos
 * terminales de la misma identidad son conflicto y no suman.
 */
export function resolverVersiones(
  registros: RegistroPrecontrol[],
): ResolucionVersiones {
  const porIdentidad = new Map<string, RegistroPrecontrol[]>();
  for (const registro of registros) {
    const lista = porIdentidad.get(registro.identidad) ?? [];
    lista.push(registro);
    porIdentidad.set(registro.identidad, lista);
  }

  const vigentes: RegistroPrecontrol[] = [];
  const historicos: RegistroPrecontrol[] = [];
  const absorbidos: { idArchivo: string; identidad: string }[] = [];
  const absorbidosIds = new Set<string>();
  const conflictos: ConflictoPrecontrol[] = [];
  const identidadesConflictuadas = new Set<string>();

  for (const [identidad, grupo] of porIdentidad) {
    const porVersion = new Map<number, RegistroPrecontrol[]>();
    for (const registro of grupo) {
      const version = porVersion.get(registro.version) ?? [];
      version.push(registro);
      porVersion.set(registro.version, version);
    }

    const representantes = new Map<number, RegistroPrecontrol>();
    let conflictiva = false;
    for (const [version, filas] of porVersion) {
      const huellas = new Set(filas.map((fila) => fila.huellaContenido));
      if (huellas.size > 1) {
        conflictiva = true;
        conflictos.push({
          tipo: "DuplicadoAmbiguo",
          partidaId: filas[0]?.partidaId ?? null,
          intervalo: null,
          importe: null,
          fuente: filas[0]?.fuenteId ?? null,
          motivo: `Huellas distintas para la identidad ${identidad} y versión ${version}.`,
        });
        continue;
      }
      const ordenadas = [...filas].sort((a, b) =>
        a.idArchivo.localeCompare(b.idArchivo),
      );
      representantes.set(version, ordenadas[0]!);
      for (const duplicado of ordenadas.slice(1))
        absorbidos.push({ idArchivo: duplicado.idArchivo, identidad });
      for (const duplicado of ordenadas.slice(1))
        absorbidosIds.add(duplicado.idArchivo);
    }

    const reemplazadas = new Set(
      [...representantes.values()]
        .map((registro) => registro.reemplazaA)
        .filter((version): version is number => version !== null),
    );
    const terminales = [...representantes.values()].filter(
      (registro) => !reemplazadas.has(registro.version),
    );

    if (terminales.length !== 1) {
      conflictiva = true;
      conflictos.push({
        tipo: "VersionBifurcada",
        partidaId: grupo[0]?.partidaId ?? null,
        intervalo: null,
        importe: null,
        fuente: grupo[0]?.fuenteId ?? null,
        motivo:
          terminales.length === 0
            ? `Cadena de versiones cíclica para ${identidad}.`
            : `Dos versiones vigentes incompatibles para ${identidad}.`,
      });
    }

    if (conflictiva) {
      identidadesConflictuadas.add(identidad);
      historicos.push(...grupo);
      continue;
    }

    const vigente = terminales[0]!;
    vigentes.push(vigente);
    for (const registro of grupo)
      if (registro !== vigente && !absorbidosIds.has(registro.idArchivo))
        historicos.push(registro);
  }

  return {
    vigentes,
    historicos,
    absorbidos,
    conflictos,
    identidadesConflictuadas,
  };
}

type PiezaCobertura = {
  intervalo: Intervalo;
  fuenteId: string;
  tipo: "archivo" | "control";
};

type AnalisisItem = {
  partidaId: string;
  vigentes: RegistroPrecontrol[];
  historicos: RegistroPrecontrol[];
  conflictos: ConflictoPrecontrol[];
  piezas: PiezaCobertura[];
  intervalos: Intervalo[];
  huecos: Intervalo[];
  fuentes: string[];
  estadoCobertura: EstadoCobertura;
  archivo: bigint | null;
  detalleControl: bigint | null;
  precontrolVinculado: bigint | null;
  precontrolNoVinculado: bigint | null;
  desconocidoConEvidencia: bigint;
  agregados: AgregadoNoAtribuible[];
  bloqueos: MotivoCodigo[];
  subtotalNoSeparable: boolean;
  hayHechos: boolean;
};

const PRIORIDAD_MOTIVO: MotivoCodigo[] = [
  "UniversoNoAcreditado",
  "Solapamiento",
  "DuplicadoAmbiguo",
  "RegularizacionPendiente",
  "VerificacionPendiente",
  "MappingPendiente",
  "AgregadoNoAtribuibleAlCorte",
  "HuecoDemostrado",
  "FuenteAusente",
  "SinFuente",
  "AperturaNoGasto",
  "AusenciaVerificadaSinHechos",
];

function primerMotivo(motivos: Iterable<MotivoCodigo>): MotivoCodigo | null {
  const conjunto = new Set(motivos);
  return PRIORIDAD_MOTIVO.find((motivo) => conjunto.has(motivo)) ?? null;
}

function textoMotivo(motivo: MotivoCodigo | null, partidaId: string | null): string | null {
  if (!motivo) return null;
  const prefijo = partidaId ? `${partidaId}: ` : "";
  const textos: Record<MotivoCodigo, string> = {
    SinFuente: "sin fuente de archivo ni control para el intervalo",
    HuecoDemostrado: "hay un intervalo sin cobertura verificada",
    FuenteAusente: "una fuente esperada del universo no está presente",
    UniversoNoAcreditado: "el universo DT7 no está acreditado",
    AusenciaVerificadaSinHechos: "sin hechos en el intervalo cubierto",
    Solapamiento: "archivo y detalle se solapan; no se elige fuente ni se prorratea",
    DuplicadoAmbiguo: "duplicado o vínculo de representación no demostrado",
    MappingPendiente: "mapping de Partida pendiente o ambiguo",
    VerificacionPendiente: "hay registros o hechos pendientes de verificación",
    RegularizacionPendiente: "regularización 2026 sin evidencia Q5=A suficiente",
    AperturaNoGasto: "la apertura se muestra aparte y no suma a Gastos",
    AgregadoNoAtribuibleAlCorte: "agregado no atribuible al corte; no se prorratea",
  };
  return `${prefijo}${textos[motivo]}`;
}

function movimientosElegibles(
  entrada: EntradaPrecontrol,
  partidaId: string,
): MovimientoPrecontrol[] {
  const vistos = new Set<string>();
  const elegibles: MovimientoPrecontrol[] = [];
  for (const movimiento of entrada.movimientos) {
    if (vistos.has(movimiento.idMovimiento)) continue;
    if (movimiento.partidaId !== partidaId) continue;
    if (movimiento.tipo !== "Gasto" || movimiento.anulado) continue;
    if (movimiento.fecha < inicioEjercicio(entrada.ejercicio)) continue;
    if (movimiento.fecha > entrada.corte) continue;
    vistos.add(movimiento.idMovimiento);
    elegibles.push(movimiento);
  }
  return elegibles;
}

function analizarItem(
  entrada: EntradaPrecontrol,
  partidaId: string,
  universoAcreditado: boolean,
  vigentes: RegistroPrecontrol[],
  historicos: RegistroPrecontrol[],
  identidadesConflictuadas: Set<string>,
  conflictosGlobales: ConflictoPrecontrol[],
): AnalisisItem {
  const desde = inicioEjercicio(entrada.ejercicio);
  const hasta = entrada.corte;
  const bloqueos: MotivoCodigo[] = [];
  const conflictos: ConflictoPrecontrol[] = [];

  const registrosItem = vigentes.filter(
    (registro) =>
      registro.partidaId === partidaId &&
      registro.clase !== "AperturaHistorica" &&
      registro.estadoMapeo === "Mapeado",
  );
  const historicosItem = historicos.filter(
    (registro) => registro.partidaId === partidaId,
  );

  const piezas: PiezaCobertura[] = [];
  for (const fuente of entrada.fuentes) {
    for (const tramo of fuente.intervalosArchivo) {
      if (tramo.partidaId !== partidaId) continue;
      const recortado = recortar(tramo.intervalo, desde, hasta);
      if (recortado)
        piezas.push({
          intervalo: recortado,
          fuenteId: fuente.fuenteId,
          tipo: "archivo",
        });
    }
    if (fuente.controlDetalle && (fuente.alcance === "Global" || fuente.alcance === partidaId)) {
      const recortado = recortar(fuente.controlDetalle, desde, hasta);
      if (recortado)
        piezas.push({
          intervalo: recortado,
          fuenteId: fuente.fuenteId,
          tipo: "control",
        });
    }
  }

  const intervalos = unirIntervalos(piezas.map((pieza) => pieza.intervalo));
  const fuentes = [...new Set(piezas.map((pieza) => pieza.fuenteId))].sort();

  const fuentesEsperadasItem = entrada.universo.fuentesEsperadas.filter(
    (esperada) => esperada.partidaId === partidaId,
  );
  const fuenteEsperadaAusente = fuentesEsperadasItem.some((esperada) => {
    if (esperada.estado === "NoAplica") return false;
    if (esperada.estado === "Ausente") return true;
    return !entrada.fuentes.some((fuente) => fuente.fuenteId === esperada.fuenteId);
  });

  // Solapes: cualquier par de piezas de cobertura que comparta al menos un día.
  const solapes: Intervalo[] = [];
  for (let i = 0; i < piezas.length; i += 1) {
    for (let j = i + 1; j < piezas.length; j += 1) {
      const cruce = interseccion(piezas[i]!.intervalo, piezas[j]!.intervalo);
      if (cruce) solapes.push(cruce);
    }
  }
  const solapesUnidos = unirIntervalos(solapes);
  const movimientos = movimientosElegibles(entrada, partidaId);
  for (const solape of solapesUnidos) {
    const importeDetalle = movimientos
      .filter((movimiento) => contiene(solape, movimiento.fecha))
      .reduce((total, movimiento) => total + centimos(movimiento.importeCentimos), 0n);
    const conflicto: ConflictoPrecontrol = {
      tipo: "Solapamiento",
      partidaId,
      intervalo: solape,
      importe: importeDetalle > 0n ? decimal(importeDetalle) : null,
      fuente: null,
      motivo: "Solapamiento no resuelto; no se elige fuente ni se prorratea.",
    };
    conflictos.push(conflicto);
    conflictosGlobales.push(conflicto);
  }
  if (solapesUnidos.length > 0) bloqueos.push("Solapamiento");

  // Dos fuentes/identidades con exactamente el mismo intervalo y Partida.
  const certificables = registrosItem.filter(
    (registro) =>
      registro.estadoVerificacion === "Verificado" &&
      !identidadesConflictuadas.has(registro.identidad),
  );
  for (let i = 0; i < certificables.length; i += 1) {
    for (let j = i + 1; j < certificables.length; j += 1) {
      const a = certificables[i]!;
      const b = certificables[j]!;
      if (
        a.intervalo.inicio === b.intervalo.inicio &&
        a.intervalo.fin === b.intervalo.fin &&
        (a.identidad !== b.identidad || a.fuenteId !== b.fuenteId)
      ) {
        const conflicto: ConflictoPrecontrol = {
          tipo: "DosFuentes",
          partidaId,
          intervalo: a.intervalo,
          importe: null,
          fuente: a.fuenteId,
          motivo: `Procedencia ambigua entre ${a.fuenteId} y ${b.fuenteId}; no se suman ni se elige por importe.`,
        };
        conflictos.push(conflicto);
        conflictosGlobales.push(conflicto);
      }
    }
  }
  if (conflictos.some((conflicto) => conflicto.tipo === "DosFuentes"))
    bloqueos.push("DuplicadoAmbiguo");

  // Conflictos de identidad/versión ya resueltos globalmente.
  const conflictoIdentidad = conflictosGlobales.some(
    (conflicto) =>
      conflicto.partidaId === partidaId &&
      (conflicto.tipo === "DuplicadoAmbiguo" ||
        conflicto.tipo === "VersionBifurcada"),
  );
  if (conflictoIdentidad) bloqueos.push("DuplicadoAmbiguo");

  let archivo = 0n;
  let archivoConocido = false;
  let control = 0n;
  let controlConocido = false;
  let precontrolVinculado = 0n;
  let hayPrecontrolVinculado = false;
  let precontrolNoVinculado = 0n;
  let hayPrecontrolNoVinculado = false;
  let desconocidoConEvidencia = 0n;
  let hayNoVinculado = false;
  let hayRegistrosArchivoExcluidos = false;
  let hayHechosCertificados = false;
  let subtotalNoSeparable =
    solapesUnidos.length > 0 || conflictoIdentidad;
  const agregados: AgregadoNoAtribuible[] = [];

  const intervalosArchivo = piezas
    .filter((pieza) => pieza.tipo === "archivo")
    .map((pieza) => pieza.intervalo);
  archivoConocido =
    intervalosArchivo.length > 0 || registrosItem.length > 0;

  for (const registro of registrosItem) {
    const importe = centimos(registro.importeCentimos);
    if (identidadesConflictuadas.has(registro.identidad)) continue;
    if (registro.estadoVerificacion === "Rechazado") continue;

    if (registro.estadoVerificacion === "NoVerificado") {
      bloqueos.push("VerificacionPendiente");
      if (importe !== 0n) hayRegistrosArchivoExcluidos = true;
      continue;
    }

    if (registro.clase === "Regularizacion2026") {
      const evidencia = registro.evidenciaRegularizacion?.trim();
      if (entrada.ejercicio !== 2026 || !evidencia) {
        bloqueos.push("RegularizacionPendiente");
        if (importe !== 0n) hayRegistrosArchivoExcluidos = true;
        continue;
      }
    }

    let representacion = registro.representadoEnMovimientos;
    if (representacion === "No" && !registro.evidenciaRepresentacion?.trim())
      representacion = "Desconocido";
    if (representacion === "Si") {
      const vinculado = movimientos.find(
        (movimiento) => movimiento.vinculoArchivoId === registro.idArchivo,
      );
      if (!vinculado || !registro.evidenciaRepresentacion?.trim())
        representacion = "Desconocido";
      else {
        if (importe !== 0n) hayRegistrosArchivoExcluidos = true;
        continue; // el Movimiento vinculado cuenta una sola vez
      }
    }
    if (representacion === "Desconocido") {
      bloqueos.push("DuplicadoAmbiguo");
      if (registro.evidenciaNoDuplicidad?.trim())
        desconocidoConEvidencia += importe;
      else if (importe !== 0n) hayRegistrosArchivoExcluidos = true;
      continue;
    }

    if (
      registro.intervalo.inicio < desde ||
      registro.intervalo.fin > hasta
    ) {
      agregados.push({
        idArchivo: registro.idArchivo,
        partidaId,
        intervalo: registro.intervalo,
        importe: decimal(importe),
      });
      bloqueos.push("AgregadoNoAtribuibleAlCorte");
      subtotalNoSeparable = true;
      archivoConocido = false;
      continue;
    }

    archivo += importe;
    hayHechosCertificados = true;
  }

  if (archivo === 0n && hayRegistrosArchivoExcluidos) archivoConocido = false;

  // Detalle de control y precontrol por fecha y alcance de cada fuente.
  const controles = piezas
    .filter((pieza) => pieza.tipo === "control")
    .map((pieza) => pieza.intervalo);
  controlConocido = controles.length > 0;

  for (const movimiento of movimientos) {
    const importe = centimos(movimiento.importeCentimos);
    hayHechosCertificados = true;
    const enControl = controles.some((intervalo) =>
      contiene(intervalo, movimiento.fecha),
    );
    if (enControl) {
      control += importe;
      continue;
    }
    const vinculado = movimiento.vinculoArchivoId
      ? registrosItem.find(
          (registro) =>
            registro.idArchivo === movimiento.vinculoArchivoId &&
            registro.representadoEnMovimientos === "Si" &&
            registro.evidenciaRepresentacion?.trim(),
        )
      : undefined;
    if (vinculado) {
      precontrolVinculado += importe;
      hayPrecontrolVinculado = true;
    } else {
      precontrolNoVinculado += importe;
      hayPrecontrolNoVinculado = true;
      hayNoVinculado = true;
    }
    // Un Gasto precontrol dentro de cobertura de archivo no excluida es solape.
    const solapaArchivo = intervalosArchivo.some((intervalo) =>
      contiene(intervalo, movimiento.fecha),
    );
    const excluidoPorArchivo = registrosItem.some(
      (registro) =>
        registro.representadoEnMovimientos === "Si" &&
        registro.evidenciaRepresentacion?.trim() &&
        contiene(registro.intervalo, movimiento.fecha) &&
        registro.idArchivo === movimiento.vinculoArchivoId,
    );
    if (solapaArchivo && !excluidoPorArchivo) {
      const conflicto: ConflictoPrecontrol = {
        tipo: "Solapamiento",
        partidaId,
        intervalo: { inicio: movimiento.fecha, fin: movimiento.fecha },
        importe: decimal(importe),
        fuente: null,
        motivo: "Gasto precontrol dentro de cobertura de archivo; no se suma dos veces.",
      };
      conflictos.push(conflicto);
      conflictosGlobales.push(conflicto);
      bloqueos.push("Solapamiento");
      subtotalNoSeparable = true;
    }
  }
  if (hayNoVinculado) bloqueos.push("VerificacionPendiente");

  const huecos = intervalos.length > 0 ? huecosEntre(intervalos, desde, hasta) : [];

  let estadoCobertura: EstadoCobertura;
  if (!universoAcreditado) estadoCobertura = "NoAcreditada";
  else if (bloqueos.includes("Solapamiento")) estadoCobertura = "Solapada";
  else if (intervalos.length === 0) estadoCobertura = "NoDisponible";
  else if (huecos.length > 0 || fuenteEsperadaAusente) estadoCobertura = "Parcial";
  else estadoCobertura = "Completa";

  if (estadoCobertura === "Parcial" && huecos.length > 0)
    bloqueos.push("HuecoDemostrado");
  if (estadoCobertura === "NoDisponible") bloqueos.push("SinFuente");
  if (fuenteEsperadaAusente && intervalos.length > 0)
    bloqueos.push("FuenteAusente");

  return {
    partidaId,
    vigentes: registrosItem,
    historicos: historicosItem,
    conflictos,
    piezas,
    intervalos,
    huecos,
    fuentes,
    estadoCobertura,
    archivo: archivoConocido ? archivo : null,
    detalleControl: controlConocido ? control : null,
    precontrolVinculado: hayPrecontrolVinculado ? precontrolVinculado : null,
    precontrolNoVinculado: hayPrecontrolNoVinculado
      ? precontrolNoVinculado
      : null,
    desconocidoConEvidencia,
    agregados,
    bloqueos,
    subtotalNoSeparable,
    hayHechos: hayHechosCertificados,
  };
}

function construirItem(
  analisis: AnalisisItem,
  universoAcreditado: boolean,
): ItemPrecontrol {
  const motivos = [...analisis.bloqueos];
  if (!universoAcreditado) motivos.push("UniversoNoAcreditado");

  const subtotalPosible = [
    analisis.archivo,
    analisis.detalleControl,
    analisis.precontrolVinculado,
  ].some((valor) => valor !== null);
  let subtotal: bigint | null = null;
  if (!analisis.subtotalNoSeparable) {
    if (subtotalPosible || analisis.desconocidoConEvidencia !== 0n) {
      subtotal =
        (analisis.archivo ?? 0n) +
        (analisis.detalleControl ?? 0n) +
        (analisis.precontrolVinculado ?? 0n) +
        analisis.desconocidoConEvidencia;
    }
  }

  const certificable =
    universoAcreditado &&
    analisis.estadoCobertura === "Completa" &&
    !analisis.subtotalNoSeparable &&
    motivos.length === 0;

  let total: bigint | null = null;
  if (certificable)
    total =
      (analisis.archivo ?? 0n) +
      (analisis.detalleControl ?? 0n) +
      (analisis.precontrolVinculado ?? 0n);

  let estadoTotal: EstadoTotal;
  if (analisis.estadoCobertura === "NoDisponible") estadoTotal = "NoDisponible";
  else if (total !== null) estadoTotal = "Verificado";
  else estadoTotal = "NoVerificable";

  let motivoCodigo: MotivoCodigo | null = primerMotivo(motivos);
  if (total !== null) {
    const sinHechos =
      !analisis.hayHechos &&
      (analisis.archivo ?? 0n) === 0n &&
      (analisis.detalleControl ?? 0n) === 0n &&
      (analisis.precontrolVinculado ?? 0n) === 0n &&
      analisis.agregados.length === 0;
    motivoCodigo = sinHechos ? "AusenciaVerificadaSinHechos" : null;
  }

  return {
    partidaId: analisis.partidaId,
    archivo: analisis.archivo === null ? null : decimal(analisis.archivo),
    detalleControl:
      analisis.detalleControl === null ? null : decimal(analisis.detalleControl),
    detallePrecontrolVinculado:
      analisis.precontrolVinculado === null
        ? null
        : decimal(analisis.precontrolVinculado),
    detallePrecontrolNoVinculado:
      analisis.precontrolNoVinculado === null
        ? null
        : decimal(analisis.precontrolNoVinculado),
    total: total === null ? null : decimal(total),
    subtotalConocido: subtotal === null ? null : decimal(subtotal),
    estadoCobertura: analisis.estadoCobertura,
    estadoTotal,
    motivoCodigo,
    motivo: textoMotivo(motivoCodigo, analisis.partidaId),
    cobertura: {
      intervalos: analisis.intervalos,
      huecos: analisis.huecos,
      fuentes: analisis.fuentes,
    },
    registros: analisis.vigentes.map((registro) => registro.idArchivo),
    historicos: analisis.historicos.map((registro) => registro.idArchivo),
    conflictos: analisis.conflictos,
  };
}

/**
 * Combinador de solo lectura archivo + Gastos detallados.
 *
 * Orden (SPEC20): validar entrada → resolver versiones/duplicados → separar
 * sin clasificar y aperturas → analizar cobertura por Partida → elegir
 * componentes → calcular estados/total/subtotal → exponer motivos. No muta la
 * entrada y no consulta el reloj ni ninguna fuente externa.
 */
export function combinarHistoricoPrecontrol(
  entrada: EntradaPrecontrol,
): ResultadoPrecontrol {
  validarEntrada(entrada);
  const universoAcreditado = entrada.universo.estado === "Acreditado";
  const desde = inicioEjercicio(entrada.ejercicio);
  const hasta = entrada.corte;

  const resolucion = resolverVersiones(entrada.registros);
  const conflictos: ConflictoPrecontrol[] = [...resolucion.conflictos];

  const sinClasificar: SinClasificar[] = [];
  const aperturasVerificadas: AperturaPrecontrol[] = [];

  for (const registro of resolucion.vigentes) {
    if (registro.clase === "AperturaHistorica") {
      if (registro.estadoVerificacion !== "Verificado") continue;
      aperturasVerificadas.push({
        idArchivo: registro.idArchivo,
        saldoId: registro.saldoId,
        importe: decimal(centimos(registro.importeCentimos)),
        fecha: registro.fecha,
        motivo:
          registro.saldoId === null
            ? "Apertura sin mapping de Saldo; no se suma a Gastos."
            : null,
      });
      continue;
    }
    const mappingPendiente =
      registro.partidaId === null ||
      registro.estadoMapeo === "Pendiente" ||
      registro.estadoMapeo === "Ambigua";
    if (mappingPendiente) {
      sinClasificar.push({
        idArchivo: registro.idArchivo,
        importe: decimal(centimos(registro.importeCentimos)),
        motivo:
          registro.estadoMapeo === "Ambigua"
            ? "Mapping de Partida ambiguo; no se elige candidato."
            : registro.estadoMapeo === "Pendiente"
              ? "Mapping de Partida pendiente; no se suma."
              : "Partida ausente; no se asigna por nombre ni por importe.",
      });
    }
  }

  const partidasDescubiertas = new Set<string>();
  for (const registro of resolucion.vigentes) {
    if (registro.clase === "AperturaHistorica") continue;
    if (registro.partidaId) partidasDescubiertas.add(registro.partidaId);
  }
  for (const movimiento of entrada.movimientos)
    if (movimiento.tipo === "Gasto" && !movimiento.anulado)
      partidasDescubiertas.add(movimiento.partidaId);
  for (const fuente of entrada.fuentes)
    if (fuente.alcance !== "Global") partidasDescubiertas.add(fuente.alcance);
  for (const esperada of entrada.universo.fuentesEsperadas)
    partidasDescubiertas.add(esperada.partidaId);

  const partidas = universoAcreditado
    ? [...entrada.universo.partidas]
    : [...partidasDescubiertas];
  for (const partida of partidasDescubiertas)
    if (!partidas.includes(partida)) partidas.push(partida);
  partidas.sort((a, b) => a.localeCompare(b));
  const items: ItemPrecontrol[] = [];
  const agregados: AgregadoNoAtribuible[] = [];
  for (const partidaId of partidas) {
    if (universoAcreditado && !entrada.universo.partidas.includes(partidaId)) {
      const conflicto: ConflictoPrecontrol = {
        tipo: "FueraDeUniverso",
        partidaId,
        intervalo: null,
        importe: null,
        fuente: null,
        motivo:
          "Partida descubierta fuera del universo DT7 acreditado; no se certifica.",
      };
      conflictos.push(conflicto);
    }
    const analisis = analizarItem(
      entrada,
      partidaId,
      universoAcreditado,
      resolucion.vigentes,
      resolucion.historicos,
      resolucion.identidadesConflictuadas,
      conflictos,
    );
    if (universoAcreditado && !entrada.universo.partidas.includes(partidaId))
      analisis.bloqueos.push("UniversoNoAcreditado");
    agregados.push(...analisis.agregados);
    items.push(construirItem(analisis, universoAcreditado));
  }

  const fuentesEsperadas = entrada.universo.fuentesEsperadas;
  const fuenteEsperadaAusenteGlobal = fuentesEsperadas.some((esperada) => {
    if (esperada.estado === "NoAplica") return false;
    if (esperada.estado === "Ausente") return true;
    return !entrada.fuentes.some(
      (fuente) => fuente.fuenteId === esperada.fuenteId,
    );
  });

  let estadoCobertura: EstadoCobertura;
  if (!universoAcreditado) estadoCobertura = "NoAcreditada";
  else if (items.some((item) => item.estadoCobertura === "Solapada"))
    estadoCobertura = "Solapada";
  else if (
    items.every((item) => item.estadoCobertura === "NoDisponible") &&
    items.length > 0
  )
    estadoCobertura = "NoDisponible";
  else if (
    !fuenteEsperadaAusenteGlobal &&
    items.length > 0 &&
    items.every((item) => item.estadoCobertura === "Completa")
  )
    estadoCobertura = "Completa";
  else estadoCobertura = "Parcial";

  const huecos = items.flatMap((item) =>
    item.cobertura.huecos.map((hueco) => ({ ...hueco, partidaId: item.partidaId })),
  );
  const ultimoDatoVerificado =
    items
      .flatMap((item) => item.cobertura.intervalos)
      .reduce<FechaCivil | null>(
        (ultimo, intervalo) =>
          ultimo === null || intervalo.fin > ultimo ? intervalo.fin : ultimo,
        null,
      ) ?? null;

  const motivosGlobales: MotivoCodigo[] = [];
  if (!universoAcreditado) motivosGlobales.push("UniversoNoAcreditado");
  if (estadoCobertura === "Solapada") motivosGlobales.push("Solapamiento");
  if (conflictos.some((conflicto) => conflicto.tipo === "DuplicadoAmbiguo" || conflicto.tipo === "VersionBifurcada" || conflicto.tipo === "DosFuentes"))
    motivosGlobales.push("DuplicadoAmbiguo");
  if (agregados.length > 0) motivosGlobales.push("AgregadoNoAtribuibleAlCorte");
  if (sinClasificar.length > 0) motivosGlobales.push("MappingPendiente");
  if (items.some((item) => item.detallePrecontrolNoVinculado !== null))
    motivosGlobales.push("VerificacionPendiente");
  if (fuenteEsperadaAusenteGlobal) motivosGlobales.push("FuenteAusente");
  if (huecos.length > 0) motivosGlobales.push("HuecoDemostrado");
  if (estadoCobertura === "NoDisponible") motivosGlobales.push("SinFuente");

  const globalVerificable =
    universoAcreditado &&
    estadoCobertura === "Completa" &&
    items.length > 0 &&
    conflictos.length === 0 &&
    sinClasificar.length === 0 &&
    agregados.length === 0 &&
    items.every((item) => item.estadoTotal === "Verificado");

  let valor: string | null = null;
  if (globalVerificable)
    valor = decimal(
      items.reduce(
        (total, item) => total + desdeDecimal(item.total ?? "0.00"),
        0n,
      ),
    );

  const subtotales = items
    .map((item) => item.subtotalConocido)
    .filter((subtotal): subtotal is string => subtotal !== null);
  const subtotalConocido =
    subtotales.length > 0
      ? decimal(
          subtotales.reduce(
            (total, subtotal) => total + desdeDecimal(subtotal),
            0n,
          ),
        )
      : null;

  let estadoTotal: EstadoTotal;
  if (estadoCobertura === "NoDisponible") estadoTotal = "NoDisponible";
  else if (valor !== null) estadoTotal = "Verificado";
  else estadoTotal = "NoVerificable";

  let motivoCodigo = primerMotivo(motivosGlobales);
  if (estadoTotal === "Verificado") {
    motivoCodigo =
      items.every(
        (item) =>
          item.total === "0.00" && item.motivoCodigo === "AusenciaVerificadaSinHechos",
      )
        ? "AusenciaVerificadaSinHechos"
        : null;
  }

  return {
    tipoRegistro: "Archivo",
    ejercicio: entrada.ejercicio,
    corte: entrada.corte,
    alcanceTotal:
      entrada.corte === finEjercicio(entrada.ejercicio) ? "Anual" : "HastaCorte",
    universo: {
      estado: entrada.universo.estado,
      partidas: [...entrada.universo.partidas].sort((a, b) => a.localeCompare(b)),
    },
    cobertura: {
      estadoCobertura,
      coberturaGlobal: estadoCobertura,
      estadoUniverso: entrada.universo.estado,
      universoPartidas: [...entrada.universo.partidas].sort((a, b) =>
        a.localeCompare(b),
      ),
      fuentesEsperadas,
      fuentes: entrada.fuentes.map((fuente) => ({
        fuenteId: fuente.fuenteId,
        etiqueta: fuente.etiqueta,
        alcance: fuente.alcance,
        corteArchivo: fuente.corteArchivo,
        versionMapping: fuente.versionMapping,
      })),
      huecos,
      ultimoDatoVerificado,
    },
    items,
    totales: {
      valor,
      subtotalConocido,
      estadoTotal,
      estadoCobertura,
      motivoCodigo,
      motivo: textoMotivo(motivoCodigo, null),
    },
    sinClasificar,
    conflictos,
    agregadoNoAtribuible: agregados,
    aperturas: aperturasVerificadas.length > 0 ? aperturasVerificadas : null,
    duplicadosAbsorbidos: resolucion.absorbidos,
    versionesHistoricas: resolucion.historicos.map((registro) => ({
      idArchivo: registro.idArchivo,
      identidad: registro.identidad,
      version: registro.version,
    })),
  };
}

/**
 * Vista de transición entre dos ejercicios naturales contiguos.
 *
 * No suma importes, no reasigna hechos por Ciclo y no crea planes, Movimientos,
 * aperturas, fotos ni cierres. Un ejercicio sin archivo/control conserva su
 * `NoDisponible`; no se rellena con el otro ejercicio.
 */
export function compararTransicion(
  desde: ResultadoPrecontrol,
  hasta: ResultadoPrecontrol,
): ResultadoTransicion {
  exigir(
    hasta.ejercicio === desde.ejercicio + 1,
    "La transición exige dos ejercicios naturales contiguos.",
  );
  return {
    ejercicioDesde: desde.ejercicio,
    ejercicioHasta: hasta.ejercicio,
    desde,
    hasta,
    totalPlurianual: null,
    sumaPlurianual: false,
    crea: {
      planes: false,
      movimientos: false,
      aperturas: false,
      fotos: false,
      cierres: false,
    },
  };
}
