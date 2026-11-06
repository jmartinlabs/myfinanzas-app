import { useEffect, useRef, useState } from "react";
import { api, ApiError, eur } from "./api";
import { Alert, PageHead, TableScroll, Tag } from "./ui";

/**
 * E4.9 — Cierre financiero y primera fotografía.
 *
 * Pantalla de cierre manual y consulta de la foto v1. Consume únicamente los
 * contratos publicados (`/cierres/:ciclo/preflight`, `/cerrar`, `/foto`,
 * `/estado`): no recalcula economía en el navegador, no inventa ceros y no
 * presenta un total parcial como completo.
 *
 * El cierre real sigue bloqueado por DT6/T-BKP. Esta UI consume la evidencia
 * que aporte el proveedor autorizado; en E2E esa evidencia es inyectada por el
 * servidor de test aislado y nunca se usa con datos reales.
 */

type Issue = { code: string; message: string };
type TotalState = { estado: string; motivo: string };
type Cobertura = {
  estado: string;
  totales: Record<string, TotalState>;
};
type CierreSnapshot = {
  ciclo: string;
  estado: "Abierto" | "Cerrado";
  version: number | null;
  fotoVersion: number | null;
  ventana: { inicio: string; fin: string | null };
  cierre: {
    version: number;
    inicio: string;
    fin: string;
    saldoInicial: string | null;
    actor: string;
    creadoUtc: string;
    motivo: string | null;
    fingerprint: string;
    estado: "Cerrado";
  } | null;
};
type Preflight = {
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    saldoInicialComida: string | null;
    estadoTemporal: string;
    revision: number;
  };
  estado: "Listo" | "Listo con avisos" | "Bloqueado";
  e49Bloqueado: boolean;
  ventana: { inicio: string; fin: string | null };
  siguienteInicio: string | null;
  plan: {
    estado: string;
    revision: number | null;
    sinPlanificar: boolean;
    contextRevision: string;
    lineas: number;
  };
  e35: {
    verificable: boolean;
    motivo: string | null;
    huella: string | null;
    cobertura: string | null;
  };
  backup: {
    verificado: boolean;
    restauracionProbada: boolean;
    referencia: string | null;
    motivo: string | null;
  };
  hechos: {
    estado: string;
    fuentes: { fuente: string; hechos: number; acreditado: boolean }[];
    totales: Record<string, string>;
  };
  coherencia: {
    requerida: boolean;
    cierres: {
      ciclo: string;
      version: number;
      fin: string;
      coherente: boolean;
      motivos: string[];
    }[];
    contradicciones: string[];
  };
  inversion: {
    efectivo: string | null;
    posiciones: unknown[];
    valoracion: string;
    motivo: string;
  };
  cobertura: Cobertura;
  noDisponible: Record<string, TotalState>;
  bloqueos: Issue[];
  avisos: Issue[];
  fingerprint: string;
  appVersion: string;
  schemaVersion: number;
  cierre: CierreSnapshot;
};
type Foto = {
  cierre: {
    ciclo: string;
    version: number;
    inicio: string;
    fin: string;
    saldoInicial: string;
    actor: string;
    creadoUtc: string;
    motivo: string | null;
    fingerprint: string;
    estado: string;
  };
  foto: {
    ciclo: string;
    version: number;
    creadoUtc: string;
    actor: string;
    motivo: string | null;
    fingerprint: string;
    appVersion: string;
    schemaVersion: number;
    ventana: {
      inicio: string;
      fin: string;
      saldoInicial: string | null;
      estadoTemporal: string;
    };
    estadoHechos: string;
    estadoPlan: string;
    hechos: {
      estado: string;
      movimientos: unknown[];
      fuentes: { fuente: string; hechos: number; acreditado: boolean }[];
      totales: Record<string, string>;
    };
    plan: {
      estado: string;
      items: unknown[];
      revision: number | null;
      contextRevision: string;
      sinPlanificar: boolean;
    };
    clasificacion: {
      categorias: unknown[];
      subcategorias: unknown[];
      partidas: unknown[];
      referencias: unknown[];
    };
    inversion: {
      efectivo: string | null;
      cuentas: unknown[];
      posiciones: unknown[];
      operaciones: unknown[];
      instrumentos: unknown[];
      valoracion: string;
      motivoValoracion: string;
    };
    auxiliares: {
      anticipos: unknown[];
      compartidos: unknown[];
      nomina: unknown[];
      revisionComida: unknown[];
      deuda: unknown[];
      e35: { verificable: boolean; huella: string | null; datos: unknown };
    };
    cobertura: Cobertura;
    backup: {
      verificado: boolean;
      restauracionProbada: boolean;
      referencia: string | null;
      motivo: string | null;
    };
    noDisponible: Record<string, TotalState>;
  };
  replayed?: boolean;
};

type ReaperturaEvento = {
  id: number;
  versionOrigen: number;
  actor: string;
  creadoUtc: string;
  motivo: string;
  correlacion: string | null;
  fingerprint: string;
};
type ReaperturaEstado = {
  ciclo: string;
  estado: "SinCierre" | "Cerrado" | "Reabierto";
  version: number | null;
  reapertura: ReaperturaEvento | null;
  elegibilidad?: {
    puedeReabrir: boolean;
    motivo: string | null;
    cierrePosterior: { ciclo: string; version: number; fin: string } | null;
  };
};
type EstadoCierre = {
  cierre: CierreSnapshot;
  reapertura: ReaperturaEstado;
};
type RevalidacionCheck = {
  clave: string;
  estado: "Verificado" | "NoDisponible" | "Aviso" | "Bloqueante";
  codigo: string | null;
  motivo: string | null;
  comparado: unknown;
};
type Revalidacion = {
  ciclo: string;
  estado: string;
  bloquea: boolean;
  version: number | null;
  reapertura: { id: number; versionOrigen: number } | null;
  comprobaciones: RevalidacionCheck[];
  bloqueos: string[];
  avisos: string[];
  fingerprint: string;
};
type Repreflight = Omit<Preflight, "estado"> & {
  estado: Preflight["estado"] | "Sin cambios";
  origen: {
    ciclo: string;
    versionOrigen: number;
    reaperturaId: number;
    correlacion: string | null;
  };
  revalidacion: Revalidacion;
  comparacion: {
    estado: "SinCambios" | "ConCambios" | "NoVerificable";
    bloques: string[];
    motivos: string[];
  };
  sinCambios: boolean;
};
type RecierreResultado = Foto & {
  estado: "Cerrado";
  recierre: {
    ciclo: string;
    versionOrigen: number;
    versionDestino: number;
    reaperturaId: number;
    correlacion: string;
    fingerprint: string;
  };
  vinculo: {
    ciclo: string;
    versionOrigen: number;
    versionDestino: number;
    reaperturaId: number;
    correlacion: string;
  };
  comparacion: Repreflight["comparacion"];
  revalidacion: {
    estado: string;
    fingerprint: string;
    bloqueos: string[];
    avisos: string[];
  };
  replayed?: boolean;
};

const MATERIAL_LABELS: Record<string, string> = {
  ventana: "Ventana y S0 congelados",
  hechos: "Hechos y relaciones",
  plan: "Plan del ciclo",
  clasificacion: "Clasificación y referencias",
  inversion: "Inversión a Fin",
  auxiliares: "Auxiliares usados",
};
const REVALIDACION_LABELS: Record<string, string> = {
  version: "Última versión cerrada",
  cierrePosterior: "Cierres posteriores",
  fotosPosteriores: "Versiones posteriores",
  s0PlanSiguiente: "S0 y plan del ciclo siguiente",
  auxiliares: "Auxiliares",
  agregadosE411: "Agregados E4.11",
  precontrolE45: "Precontrol E4.5",
};

const TOTAL_LABELS: Record<string, string> = {
  ingresos: "Ingresos",
  gastos: "Gastos",
  transferencias: "Transferencias",
  amortizaciones: "Amortizaciones",
  devoluciones: "Devoluciones",
  neto: "Neto ingreso − gasto",
  movimientos: "Movimientos",
  efectivo: "Efectivo a Fin",
  posiciones: "Posiciones a Fin",
  plan: "Plan",
  e35: "E3.5 / FIN_NETA",
  deuda: "Deuda E1.6",
  valoracion: "Valoración / patrimonio",
  anticipos: "Anticipos",
};
const NO_DISPONIBLE_LABELS: Record<string, string> = {
  valoracion: "Valoración / patrimonio (E4.3)",
  deudaCompleta: "Deuda completa (E4.4)",
  conciliaciones: "Conciliaciones (E4.4)",
  e35: "E3.5 / FIN_NETA",
};

const date = (value: string | null | undefined) =>
  value ? value.split("-").reverse().join("/") : "No derivable";
const utc = (value: string) => new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC";
const amount = (value: string | null | undefined) =>
  value === null || value === undefined ? "No disponible" : eur(value);
const backupAcreditado = (backup: {
  verificado: boolean;
  restauracionProbada: boolean;
  referencia: string | null;
}) =>
  backup.verificado &&
  backup.restauracionProbada &&
  Boolean(backup.referencia);
const issueMessage = (issues: Issue[], code: string) =>
  issues.find((issue) => issue.code === code)?.message;

function tone(estado: string) {
  const value = estado.toLowerCase();
  if (
    /bloque|no verificable|plannoverificable|plan no verificable|incoheren|conflicto|no disponible|sin siguiente|no acreditad|ausente|no legible/.test(
      value,
    )
  )
    return "danger";
  if (/parcial|aviso|sin planificar|fuera de orden|pendiente|reabiert/.test(value))
    return "warn";
  if (/sin hechos|sinplan|vacío|vacio/.test(value)) return "empty";
  if (/listo|completo|capturado|verificad|cerrad|coherente|válido|valido/.test(value))
    return "ok";
  return "neutral";
}

function Badge({ estado }: { estado: string }) {
  return <span className={`cierre-badge tone-${tone(estado)}`}>{estado}</span>;
}

function IssueList({
  items,
  kind,
  title,
}: {
  items: Issue[];
  kind: "bloqueo" | "aviso";
  title?: string;
}) {
  if (!items.length) return null;
  const heading =
    title ??
    (kind === "bloqueo" ? "Bloqueos que impiden cerrar" : "Avisos");
  return (
    <div
      className={"cierre-issues " + kind}
      role={kind === "bloqueo" ? "alert" : "status"}
      aria-label={heading}
    >
      <h2>{heading}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.code + ":" + item.message}>
            <strong>{item.code}</strong> — {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TotalsTable({
  totals,
  label,
}: {
  totals: Record<string, string>;
  label: string;
}) {
  return (
    <TableScroll label={label}>
      <div className="shared-table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Total</th>
              <th>Valor capturado</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(totals).map(([key, value]) => (
              <tr key={key}>
                <td data-label="Total">{TOTAL_LABELS[key] ?? key}</td>
                <td data-label="Valor capturado">{amount(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableScroll>
  );
}

function CoverageTable({ cobertura }: { cobertura: Cobertura }) {
  return (
    <TableScroll label="Cobertura por métrica">
      <div className="shared-table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Cobertura</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cobertura.totales).map(([key, value]) => (
              <tr key={key}>
                <td data-label="Métrica">{TOTAL_LABELS[key] ?? key}</td>
                <td data-label="Cobertura">
                  <Badge estado={value.estado} />
                </td>
                <td data-label="Motivo">{value.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableScroll>
  );
}

type ActionKind = "reabrir" | "recerrar" | "cancelar";
type ActionFailure = {
  kind: ActionKind;
  message: string;
  code: string;
  hint: string;
};

const ACTION_HINTS: Record<string, string> = {
  NO_ES_ULTIMO_CIERRE:
    "Solo el cierre con el Fin más reciente es reabrible. Actualiza la revisión: el cierre posterior no se modifica.",
  CIERRE_POSTERIOR:
    "Apareció un cierre posterior durante la ventana. No se altera y el re-cierre ordinario queda bloqueado; la recuperación extraordinaria requiere aprobación separada.",
  VERSION_CONFLICTO:
    "La versión esperada ya no es la última. Actualiza el estado y revisa de nuevo antes de escribir.",
  YA_REABIERTO:
    "Ya existe una ventana de rectificación activa. No se abre una segunda.",
  NO_REABIERTO:
    "El ciclo ya no tiene una reapertura activa. Actualiza el estado: pudo re-cerrarse o cancelarse.",
  IDEMPOTENCY_CONFLICT:
    "La clave de intento se usó antes con otros datos. Actualiza la revisión para generar una clave nueva; no se duplica ninguna ventana ni foto.",
  REVISION_CONFLICT:
    "La vista previa cambió entre la lectura y la confirmación. No se emite foto parcial: actualiza y repite el preflight.",
  SIN_CAMBIOS:
    "No hay cambios materiales acreditados. No se crea una foto nueva; usa la cancelación D8 solo si la ausencia de cambios está acreditada.",
  BACKUP_NO_VERIFICABLE:
    "Falta evidencia DT6/T-BKP (manifiesto, checksum, clave o restauración probada). No se escribe ninguna foto.",
  E35_NO_VERIFICABLE:
    "E3.5/FIN_NETA no es verificable. Sin ese gate no hay re-cierre ni foto.",
  REVALIDACION_BLOQUEANTE:
    "Una dependencia posterior contradice la rectificación. Se bloquea sin modificar S0 ni planes ajenos.",
  IMPACTO_NO_VERIFICABLE:
    "No se puede acreditar la comparación material con vN. Se bloquea en lugar de asumir equivalencia.",
  VENTANA_INCONSISTENTE:
    "La ventana o el S0 congelados cambiaron durante la reapertura. No se reescribe vN; actualiza y revisa.",
  VENTANA_RECTIFICACION_CERRADA:
    "La escritura queda fuera de la ventana de rectificación. Actualiza el estado.",
  SESION_EXPIRADA:
    "La sesión ha caducado. Conserva el motivo escrito, vuelve a identificarte y repite la operación.",
};

function actionFailure(error: unknown, kind: ActionKind): ActionFailure {
  const failure = error as ApiError;
  if (failure instanceof ApiError && failure.status === 401)
    return {
      kind,
      message:
        "La sesión ha caducado. El motivo escrito se conserva en esta pantalla.",
      code: "SESION_EXPIRADA",
      hint: ACTION_HINTS.SESION_EXPIRADA,
    };
  const code = failure instanceof ApiError ? failure.code : "";
  return {
    kind,
    message: failure?.message || "No se pudo completar la operación.",
    code,
    hint:
      ACTION_HINTS[code] ??
      "No se ha escrito ningún estado parcial. Revisa el motivo y vuelve a intentarlo.",
  };
}

function ActionError({
  failure,
  onRefresh,
}: {
  failure: ActionFailure;
  onRefresh: () => void;
}) {
  return (
    <div className="e410-action-error" role="alert">
      <p>
        <strong>{failure.message}</strong>
      </p>
      <p>{failure.hint}</p>
      {failure.code && <p className="muted">Código: {failure.code}</p>}
      <button className="secondary" type="button" onClick={onRefresh}>
        Actualizar estado y reintentar
      </button>
    </div>
  );
}

function RevalidacionTable({ revalidacion }: { revalidacion: Revalidacion }) {
  const compared = (value: unknown) => {
    if (value === null || value === undefined) return "Sin valores comparados.";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "Valores no representables.";
    }
  };
  return (
    <TableScroll label="Revalidación de dependencias posteriores">
      <div className="shared-table-scroll">
        <table className="table e410-table">
          <thead>
            <tr>
              <th>Dependencia</th>
              <th>Resultado</th>
              <th>Motivo y valores comparados</th>
            </tr>
          </thead>
          <tbody>
            {revalidacion.comprobaciones.map((check) => (
              <tr key={check.clave}>
                <td data-label="Dependencia">
                  {REVALIDACION_LABELS[check.clave] ?? check.clave}
                </td>
                <td data-label="Resultado">
                  <Badge estado={check.estado} />
                </td>
                <td data-label="Motivo y valores comparados">
                  {check.motivo ?? "Sin incidencias."}
                  {check.comparado !== null && check.comparado !== undefined && (
                    <details className="e410-compared">
                      <summary>Valores comparados (solo lectura)</summary>
                      <pre>{compared(check.comparado)}</pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableScroll>
  );
}

function MaterialComparisonView({
  comparacion,
}: {
  comparacion: Repreflight["comparacion"];
}) {
  return (
    <div
      className={
        "e410-diff " +
        (comparacion.estado === "SinCambios"
          ? "ok"
          : comparacion.estado === "ConCambios"
            ? "warn"
            : "danger")
      }
      role="status"
    >
      <h3>Diferencias materiales frente a vN</h3>
      <p>
        Comparación de solo lectura sobre ventana/S0, hechos, plan, clasificación,
        inversión y auxiliares. No se recalculan totales ni se usa la vista viva
        como foto.
      </p>
      <p>
        Resultado: <Badge estado={comparacion.estado} />
      </p>
      {comparacion.bloques.length > 0 && (
        <ul>
          {comparacion.bloques.map((block) => (
            <li key={block}>{MATERIAL_LABELS[block] ?? block}</li>
          ))}
        </ul>
      )}
      {comparacion.motivos.length > 0 && (
        <ul>
          {comparacion.motivos.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {comparacion.estado === "SinCambios" && (
        <p className="e410-strong">
          SIN_CAMBIOS: no se crea una foto nueva. No basta la igualdad de importes;
          aquí la ausencia se acredita por bloques materiales y auditoría.
        </p>
      )}
      {comparacion.estado === "NoVerificable" && (
        <p className="e410-strong">
          No se puede acreditar la comparación: el re-cierre queda bloqueado y no
          se asume equivalencia.
        </p>
      )}
    </div>
  );
}

function countList(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function auxiliarySummary(auxiliares: Record<string, unknown>) {
  const entries = Object.entries(auxiliares).filter(([, value]) =>
    Array.isArray(value),
  );
  return entries.length
    ? entries.map(([key, value]) => `${key} ${countList(value)}`).join(" · ")
    : "Sin auxiliares capturados";
}

function PhotoComparison({
  before,
  after,
  comparacion,
  correlacion,
  onVersion,
}: {
  before: Foto;
  after: Foto;
  comparacion: Repreflight["comparacion"];
  correlacion?: string;
  onVersion?: (version: number) => void;
}) {
  const rows = [
    {
      key: "ventana",
      label: MATERIAL_LABELS.ventana,
      before: `${date(before.foto.ventana.inicio)} → ${date(before.foto.ventana.fin)} · S0 ${amount(before.foto.ventana.saldoInicial)}`,
      after: `${date(after.foto.ventana.inicio)} → ${date(after.foto.ventana.fin)} · S0 ${amount(after.foto.ventana.saldoInicial)}`,
    },
    {
      key: "hechos",
      label: MATERIAL_LABELS.hechos,
      before: `${before.foto.hechos.estado} · ${countList(before.foto.hechos.movimientos)} movimiento(s)`,
      after: `${after.foto.hechos.estado} · ${countList(after.foto.hechos.movimientos)} movimiento(s)`,
    },
    {
      key: "plan",
      label: MATERIAL_LABELS.plan,
      before: `${before.foto.plan.estado} · ${countList(before.foto.plan.items)} línea(s)`,
      after: `${after.foto.plan.estado} · ${countList(after.foto.plan.items)} línea(s)`,
    },
    {
      key: "clasificacion",
      label: MATERIAL_LABELS.clasificacion,
      before: `Categorías ${countList(before.foto.clasificacion.categorias)} · subcategorías ${countList(before.foto.clasificacion.subcategorias)} · partidas ${countList(before.foto.clasificacion.partidas)} · referencias ${countList(before.foto.clasificacion.referencias)}`,
      after: `Categorías ${countList(after.foto.clasificacion.categorias)} · subcategorías ${countList(after.foto.clasificacion.subcategorias)} · partidas ${countList(after.foto.clasificacion.partidas)} · referencias ${countList(after.foto.clasificacion.referencias)}`,
    },
    {
      key: "inversion",
      label: MATERIAL_LABELS.inversion,
      before: `Efectivo ${amount(before.foto.inversion.efectivo)} · ${countList(before.foto.inversion.posiciones)} posición(es) · ${countList(before.foto.inversion.instrumentos)} instrumento(s)`,
      after: `Efectivo ${amount(after.foto.inversion.efectivo)} · ${countList(after.foto.inversion.posiciones)} posición(es) · ${countList(after.foto.inversion.instrumentos)} instrumento(s)`,
    },
    {
      key: "auxiliares",
      label: MATERIAL_LABELS.auxiliares,
      before: auxiliarySummary(before.foto.auxiliares),
      after: auxiliarySummary(after.foto.auxiliares),
    },
  ];
  return (
    <section className="panel e410-result" aria-label="Resultado del re-cierre">
      <div className="e410-head">
        <div>
          <p className="eyebrow">E4.10 · RE-CIERRE</p>
          <h2>Fotografía v{after.foto.version} creada</h2>
        </div>
        <Badge estado={`Cerrado · v${after.foto.version}`} />
      </div>
      <p>
        v{before.foto.version} se conserva intacta y consultable. La comparación es
        un artefacto de auditoría/UI: no es una foto parcial ni una mezcla de
        versiones.
      </p>
      <p className="muted">
        Vínculo v{before.foto.version} → v{after.foto.version}
        {correlacion ? (
          <>
            {" "}· correlación <code>{correlacion}</code>
          </>
        ) : null}{" "}
        · fingerprints persistidos.
      </p>
      <TableScroll label="Comparación lado a lado de versiones de la fotografía">
        <div className="shared-table-scroll">
          <table className="table e410-table">
            <thead>
              <tr>
                <th>Bloque</th>
                <th>v{before.foto.version} (persistida)</th>
                <th>v{after.foto.version} (persistida)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className={
                    comparacion.bloques.includes(row.key) ? "e410-changed" : ""
                  }
                >
                  <td data-label="Bloque">{row.label}</td>
                  <td data-label={`v${before.foto.version}`}>{row.before}</td>
                  <td data-label={`v${after.foto.version}`}>{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableScroll>
      <p className="muted">
        Valores persistidos de cada fotografía; no se recalculan ni se suman
        totales provisionales.
      </p>
      {onVersion && (
        <div className="actions">
          <button
            className="secondary"
            type="button"
            onClick={() => onVersion(before.foto.version)}
          >
            Consultar v{before.foto.version}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => onVersion(after.foto.version)}
          >
            Consultar v{after.foto.version}
          </button>
        </div>
      )}
    </section>
  );
}

export function Cierre({ go }: { go: (path: string) => void }) {
  const [cycles, setCycles] = useState<{ id: string; inicio: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [photo, setPhoto] = useState<Foto | null>(null);
  const [photoVersion, setPhotoVersion] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [attemptKey, setAttemptKey] = useState("");
  const attempt = useRef<{ key: string; fingerprint: string; motivo: string } | null>(
    null,
  );
  const [reload, setReload] = useState(0);
  const [photoReload, setPhotoReload] = useState(0);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [errorSource, setErrorSource] = useState<"load" | "confirm">("load");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  // E4.10 I7 — reapertura, rectificación y re-cierre.
  const [estadoCierre, setEstadoCierre] = useState<EstadoCierre | null>(null);
  const [repreflight, setRepreflight] = useState<Repreflight | null>(null);
  const [repreflightLoading, setRepreflightLoading] = useState(false);
  const [repreflightError, setRepreflightError] = useState("");
  const [repreflightReload, setRepreflightReload] = useState(0);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState("");
  const [motivoRecierre, setMotivoRecierre] = useState("");
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [reopenKey, setReopenKey] = useState("");
  const [recierreKey, setRecierreKey] = useState("");
  const [cancelKey, setCancelKey] = useState("");
  const reopenAttempt = useRef<{ key: string; signature: string } | null>(null);
  const recierreAttempt = useRef<{ key: string; signature: string } | null>(null);
  const cancelAttempt = useRef<{ key: string; signature: string } | null>(null);
  const [actionBusy, setActionBusy] = useState<ActionKind | "">("");
  const [actionError, setActionError] = useState<ActionFailure | null>(null);
  const [recierreResult, setRecierreResult] = useState<RecierreResultado | null>(
    null,
  );
  const [previousPhoto, setPreviousPhoto] = useState<Foto | null>(null);
  const request = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const photoHeading = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    let live = true;
    setCatalogFailed(false);
    setCatalogLoaded(false);
    async function catalog() {
      try {
        const all: { id: string; inicio: string }[] = [];
        let page = 1,
          total = 0;
        do {
          const result = await api("/ciclos?estado=&page=" + page++);
          all.push(...result.ciclos);
          total = result.total;
        } while (all.length < total);
        if (!live) return;
        setCycles(all);
        setCatalogLoaded(true);
        if (all.length) {
          const requested = new URLSearchParams(location.search).get("ciclo");
          const initial = all.some((cycle) => cycle.id === requested)
            ? requested!
            : all[0].id;
          setSelected((previous) => previous || initial);
        }
      } catch (e) {
        if (live) {
          setCatalogFailed(true);
          setCatalogLoaded(true);
          setError((e as Error).message);
        }
      }
    }
    void catalog();
    return () => {
      live = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!selected) {
      setPreflight(null);
      setEstadoCierre(null);
      setRepreflight(null);
      setLoading(false);
      return;
    }
    const current = ++request.current;
    setLoading(true);
    setError("");
    setErrorCode("");
    setFields({});
    setActionError(null);
    Promise.all([
      api<Preflight>("/cierres/" + selected + "/preflight"),
      api<EstadoCierre>("/cierres/" + selected + "/estado"),
    ])
      .then(([result, state]) => {
        if (current !== request.current || selectedRef.current !== selected) return;
        setPreflight(result);
        setEstadoCierre(state);
        setAttemptKey(crypto.randomUUID());
        attempt.current = null;
        setReopenKey(crypto.randomUUID());
        reopenAttempt.current = null;
        setRecierreKey(crypto.randomUUID());
        recierreAttempt.current = null;
        setCancelKey(crypto.randomUUID());
        cancelAttempt.current = null;
        setReopenOpen(false);
        setCancelOpen(false);
        setError("");
        setErrorCode("");
        setPhotoVersion(result.cierre.fotoVersion ?? result.cierre.version);
      })
      .catch((e) => {
        if (current !== request.current || selectedRef.current !== selected) return;
        setPreflight(null);
        setEstadoCierre(null);
        setError((e as Error).message);
        setErrorSource("load");
        setErrorCode(e instanceof ApiError ? e.code : "");
      })
      .finally(() => {
        if (current === request.current && selectedRef.current === selected)
          setLoading(false);
      });
    return () => {
      ++request.current;
    };
  }, [selected, reload]);

  useEffect(() => {
    if (!selected || preflight?.cierre.estado !== "Cerrado") {
      setPhoto(null);
      return;
    }
    let live = true;
    setPhotoLoading(true);
    api<Foto>(
      "/cierres/" +
        selected +
        "/foto" +
        (photoVersion ? "?version=" + photoVersion : ""),
    )
      .then((result) => {
        if (!live) return;
        setPhoto(result);
        if (!photoVersion) setPhotoVersion(result.foto.version);
      })
      .catch((e) => {
        if (!live) return;
        setPhoto(null);
        setError((e as Error).message);
        setErrorSource("load");
        setErrorCode(e instanceof ApiError ? e.code : "");
      })
      .finally(() => {
        if (live) setPhotoLoading(false);
      });
    return () => {
      live = false;
    };
  }, [selected, preflight?.cierre.estado, photoVersion, photoReload]);

  useEffect(() => {
    if (photo) photoHeading.current?.focus();
  }, [photo]);

  useEffect(() => {
    if (
      !selected ||
      estadoCierre?.reapertura.estado !== "Reabierto"
    ) {
      setRepreflight(null);
      setRepreflightError("");
      setRepreflightLoading(false);
      return;
    }
    let live = true;
    setRepreflightLoading(true);
    setRepreflightError("");
    api<Repreflight>("/cierres/" + selected + "/repreflight")
      .then((result) => {
        if (live) setRepreflight(result);
      })
      .catch((e) => {
        if (!live) return;
        setRepreflight(null);
        setRepreflightError((e as Error).message);
      })
      .finally(() => {
        if (live) setRepreflightLoading(false);
      });
    return () => {
      live = false;
    };
  }, [
    selected,
    estadoCierre?.reapertura.estado,
    estadoCierre?.reapertura.version,
    repreflightReload,
  ]);

  useEffect(() => {
    if (!selected || !recierreResult) {
      setPreviousPhoto(null);
      return;
    }
    const version =
      recierreResult.vinculo?.versionOrigen ??
      recierreResult.recierre?.versionOrigen;
    if (!version || version === recierreResult.foto.version) {
      setPreviousPhoto(null);
      return;
    }
    let live = true;
    api<Foto>("/cierres/" + selected + "/foto?version=" + version)
      .then((result) => {
        if (live) setPreviousPhoto(result);
      })
      .catch(() => {
        if (live) setPreviousPhoto(null);
      });
    return () => {
      live = false;
    };
  }, [selected, recierreResult]);

  function selectCycle(id: string) {
    setSelected(id);
    history.replaceState(null, "", "/cierre?ciclo=" + id);
    setMotivo("");
    setPhoto(null);
    setPhotoVersion(null);
    setNotice("");
    setEstadoCierre(null);
    setRepreflight(null);
    setActionError(null);
    setRecierreResult(null);
    setPreviousPhoto(null);
    setReopenOpen(false);
    setCancelOpen(false);
    setMotivoReapertura("");
    setMotivoRecierre("");
    setMotivoCancelacion("");
  }

  function retry() {
    setReload((value) => value + 1);
  }

  function refreshReview() {
    setNotice("");
    setReload((value) => value + 1);
    setRepreflightReload((value) => value + 1);
  }

  async function confirm() {
    if (!preflight || preflight.e49Bloqueado) return;
    setClosing(true);
    setError("");
    setErrorCode("");
    setFields({});
    const trimmed = motivo.trim();
    const current = attempt.current;
    const key =
      current &&
      current.fingerprint === preflight.fingerprint &&
      current.motivo === trimmed
        ? current.key
        : attemptKey || crypto.randomUUID();
    attempt.current = { key, fingerprint: preflight.fingerprint, motivo: trimmed };
    setAttemptKey(key);
    try {
      const body: Record<string, string> = { fingerprint: preflight.fingerprint };
      if (trimmed) body.motivo = trimmed;
      const result = await api<Foto>(
        "/cierres/" + selected + "/cerrar",
        "POST",
        body,
        { "idempotency-key": key },
      );
      setNotice(
        result.replayed
          ? "Reintento idempotente: se conserva la misma fotografía."
          : "Cierre registrado. La fotografía v" + result.foto.version + " es inmutable.",
      );
      setPhoto(result);
      setPhotoVersion(result.foto.version);
      setReload((value) => value + 1);
    } catch (e) {
      const failure = e as ApiError;
      setError(failure.message);
      setErrorSource("confirm");
      setErrorCode(failure instanceof ApiError ? failure.code : "");
      setFields(failure instanceof ApiError ? failure.fields : {});
    } finally {
      setClosing(false);
    }
  }

  function nextKey(
    ref: { current: { key: string; signature: string } | null },
    signature: string,
    fallbackKey = "",
  ) {
    if (ref.current?.signature === signature && ref.current.key)
      return ref.current.key;
    if (!ref.current && fallbackKey) {
      ref.current = { key: fallbackKey, signature };
      return fallbackKey;
    }
    const key = crypto.randomUUID();
    ref.current = { key, signature };
    return key;
  }

  function rotateKey(
    ref: { current: { key: string; signature: string } | null },
    setKey: (key: string) => void,
    signature: string,
  ) {
    const key = crypto.randomUUID();
    ref.current = { key, signature };
    setKey(key);
  }

  function refreshActions() {
    setActionError(null);
    setRepreflightError("");
    setReload((value) => value + 1);
    setRepreflightReload((value) => value + 1);
  }

  function openReopen() {
    setActionError(null);
    setReopenOpen(true);
    const version = estadoCierre?.reapertura.version ?? "";
    const key = crypto.randomUUID();
    reopenAttempt.current = { key, signature: version + "|" + motivoReapertura.trim() };
    setReopenKey(key);
  }

  async function confirmReopen() {
    if (!estadoCierre || actionBusy) return;
    const version = estadoCierre.reapertura.version;
    const trimmed = motivoReapertura.trim();
    if (version === null) {
      setActionError({
        kind: "reabrir",
        message: "No hay una versión cerrada que reabrir.",
        code: "SIN_CIERRE",
        hint: ACTION_HINTS.NO_ES_ULTIMO_CIERRE,
      });
      return;
    }
    if (!trimmed) {
      setActionError({
        kind: "reabrir",
        message: "Indica el motivo de la reapertura.",
        code: "MOTIVO_REQUERIDO",
        hint: "El motivo es obligatorio y se conserva con actor y UTC en la auditoría.",
      });
      return;
    }
    const key = nextKey(reopenAttempt, version + "|" + trimmed);
    setReopenKey(key);
    setActionBusy("reabrir");
    setActionError(null);
    try {
      const result = await api<{
        ciclo: string;
        estado: "Reabierto";
        version: number;
        reapertura: ReaperturaEvento;
        replayed: boolean;
      }>("/cierres/" + selected + "/reabrir", "POST", {
        versionEsperada: version,
        motivo: trimmed,
      }, { "idempotency-key": key });
      setNotice(
        result.replayed
          ? "Reintento idempotente: se conserva la misma ventana de reapertura."
          : `Reapertura registrada sobre v${version}. v${version} sigue intacta; no se ha creado una foto nueva.`,
      );
      setReopenOpen(false);
      setMotivoReapertura("");
      setPhotoVersion(version);
      setReload((value) => value + 1);
    } catch (e) {
      setActionError(actionFailure(e, "reabrir"));
    } finally {
      setActionBusy("");
    }
  }

  async function confirmRecierre() {
    if (!estadoCierre || !repreflight || actionBusy) return;
    const version =
      estadoCierre.reapertura.version ?? repreflight.origen.versionOrigen;
    const trimmed = motivoRecierre.trim();
    if (!trimmed) {
      setActionError({
        kind: "recerrar",
        message: "Indica el motivo del re-cierre.",
        code: "MOTIVO_REQUERIDO",
        hint: "El motivo de re-cierre («qué se rectificó») es obligatorio y queda en la auditoría y la foto.",
      });
      return;
    }
    const key = nextKey(
      recierreAttempt,
      `${version}|${repreflight.fingerprint}|${trimmed}`,
      recierreKey,
    );
    setRecierreKey(key);
    setActionBusy("recerrar");
    setActionError(null);
    try {
      const result = await api<RecierreResultado>(
        "/cierres/" + selected + "/recerrar",
        "POST",
        {
          versionEsperada: version,
          motivo: trimmed,
          fingerprint: repreflight.fingerprint,
        },
        { "idempotency-key": key },
      );
      setRecierreResult(result);
      setPhoto(result);
      setPhotoVersion(result.foto.version);
      setNotice(
        result.replayed
          ? "Reintento idempotente: se conserva la misma fotografía del re-cierre."
          : `Re-cierre registrado: v${result.foto.version} creada; v${result.vinculo.versionOrigen} intacta.`,
      );
      setMotivoRecierre("");
      setReload((value) => value + 1);
    } catch (e) {
      setActionError(actionFailure(e, "recerrar"));
    } finally {
      setActionBusy("");
    }
  }

  async function confirmCancel() {
    if (!estadoCierre || actionBusy) return;
    const version = estadoCierre.reapertura.version;
    const trimmed = motivoCancelacion.trim();
    if (version === null) {
      setActionError({
        kind: "cancelar",
        message: "No hay una ventana de reapertura que cancelar.",
        code: "NO_REABIERTO",
        hint: ACTION_HINTS.NO_REABIERTO,
      });
      return;
    }
    if (!trimmed) {
      setActionError({
        kind: "cancelar",
        message: "Indica el motivo de la cancelación.",
        code: "MOTIVO_REQUERIDO",
        hint: "La cancelación D8 exige motivo y solo se admite sin cambios materiales acreditados.",
      });
      return;
    }
    const key = nextKey(cancelAttempt, version + "|" + trimmed);
    setCancelKey(key);
    setActionBusy("cancelar");
    setActionError(null);
    try {
      const result = await api<{
        ciclo: string;
        estado: "Cerrado";
        version: number;
        replayed: boolean;
      }>("/cierres/" + selected + "/cancelar", "POST", {
        versionEsperada: version,
        motivo: trimmed,
      }, { "idempotency-key": key });
      setNotice(
        result.replayed
          ? "Reintento idempotente: la cancelación ya estaba registrada."
          : `Cancelación registrada: el ciclo vuelve a Cerrado(v${version}) sin foto nueva.`,
      );
      setCancelOpen(false);
      setMotivoCancelacion("");
      setRecierreResult(null);
      setPhotoVersion(version);
      setReload((value) => value + 1);
    } catch (e) {
      setActionError(actionFailure(e, "cancelar"));
    } finally {
      setActionBusy("");
    }
  }

  const blocked = Boolean(
    preflight && (preflight.e49Bloqueado || preflight.bloqueos.length),
  );
  const closed = preflight?.cierre.estado === "Cerrado";
  const needsMotive = Boolean(preflight?.coherencia.requerida);
  const conflict =
    errorCode === "REVISION_CONFLICT" ||
    errorCode === "IMPACT_CHANGED" ||
    errorCode === "ALREADY_CLOSED" ||
    errorCode === "IDEMPOTENCY_CONFLICT";
  const versionCount = Math.max(
    preflight?.cierre.version ?? 1,
    estadoCierre?.cierre.version ?? 1,
    estadoCierre?.reapertura.version ?? 1,
    recierreResult?.foto.version ?? 1,
  );
  const estadoDisplay = closed ? "Cerrado" : preflight?.estado;

  const reapertura = estadoCierre?.reapertura ?? null;
  const reopened = reapertura?.estado === "Reabierto";
  const sinCierre = reapertura?.estado === "SinCierre";
  const originVersion = reapertura?.version ?? preflight?.cierre.version ?? null;
  const nextVersion = originVersion === null ? null : originVersion + 1;
  const elegibilidad = reapertura?.elegibilidad ?? null;
  const puedeReabrir =
    reapertura?.estado === "Cerrado" && elegibilidad?.puedeReabrir === true;
  const repreflightBlocked = Boolean(
    repreflight &&
      (repreflight.e49Bloqueado ||
        repreflight.bloqueos.length > 0 ||
        repreflight.estado === "Bloqueado"),
  );
  const repreflightSinCambios = Boolean(
    repreflight &&
      (repreflight.sinCambios || repreflight.comparacion.estado === "SinCambios"),
  );

  return (
    <section className="cierre-page">
      <PageHead
        eyebrow="E4.9 · E4.10 · Cierre, reapertura y re-cierre"
        title="Cierre financiero"
        description="Cierre manual y fotografía inmutable; reapertura ordinaria del último cierre, rectificación y re-cierre vN+1. No crea el ciclo siguiente, no cambia su S0 y no recalcula la foto."
      >
        <button className="secondary" type="button" onClick={refreshReview}>
          Actualizar revisión
        </button>
      </PageHead>

      {catalogFailed && (
        <Alert retry={retry}>No se pudieron cargar los ciclos. {error}</Alert>
      )}

      {!catalogFailed && (
        <div className="panel cierre-context" aria-label="Contexto del cierre">
          <label htmlFor="cierre-cycle">Ciclo</label>{" "}
          <select
            id="cierre-cycle"
            value={selected}
            onChange={(event) => selectCycle(event.target.value)}
            disabled={loading || !cycles.length}
          >
            <option value="">Elegir ciclo</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                Ciclo {cycle.id} · {date(cycle.inicio)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!cycles.length && !catalogFailed && catalogLoaded && !loading && (
        <div className="panel" aria-label="Sin ciclos">
          <h2>Sin ciclos para cerrar</h2>
          <p className="muted">
            Crea o importa un ciclo antes de revisar el cierre. Esta pantalla no
            crea ciclos ni altera S0.
          </p>
          <button
            className="secondary"
            type="button"
            onClick={() => go("/ciclos")}
          >
            Volver a Ciclos
          </button>
        </div>
      )}

      {loading && <p role="status">Cargando preflight del cierre…</p>}

      {error && !catalogFailed && (
        <Alert
          retry={conflict || errorSource === "confirm" ? undefined : retry}
        >
          <p>{error}</p>
          {errorCode && <p className="muted">Código: {errorCode}</p>}
          {conflict && (
            <button className="secondary" type="button" onClick={refreshReview}>
              Actualizar revisión y reintentar
            </button>
          )}
          {errorSource === "confirm" &&
            !conflict &&
            errorCode !== "MOTIVO_REQUERIDO" && (
              <button className="secondary" type="button" onClick={confirm}>
                Reintentar cierre (misma clave)
              </button>
            )}
        </Alert>
      )}

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {preflight && (
        <>
          <div className="panel" aria-label="Estado del cierre">
            <dl className="shared-metrics cierre-metrics">
              <div className="metric">
                <dt>Estado</dt>
                <dd>
                  <Badge estado={estadoDisplay ?? "Sin estado"} />
                </dd>
                <small>
                  {closed
                    ? "Ciclo cerrado: solo E4.10 podría habilitar un re-cierre."
                    : "El cierre no crea el ciclo siguiente ni cambia su S0."}
                </small>
              </div>
              <div className="metric">
                <dt>Versión</dt>
                <dd>
                  {preflight.cierre.version === null
                    ? "Sin cierre"
                    : "v" + preflight.cierre.version}
                </dd>
                <small>
                  {closed
                    ? "Fotografía v" + preflight.cierre.fotoVersion + " consultable."
                    : "La primera fotografía será v1."}
                </small>
              </div>
              <div className="metric">
                <dt>Ventana</dt>
                <dd>
                  {date(preflight.ventana.inicio)} → {date(preflight.ventana.fin)}
                </dd>
                <small>
                  {preflight.ventana.fin === null
                    ? "Sin siguiente Inicio no se inventa un Fin."
                    : "Fin derivado del siguiente Inicio."}
                </small>
              </div>
              <div className="metric">
                <dt>S0</dt>
                <dd>{amount(preflight.ciclo.saldoInicialComida)}</dd>
                <small>Manual; no se recalcula ni se sustituye por 0.</small>
              </div>
              <div className="metric">
                <dt>Cobertura</dt>
                <dd>{preflight.cobertura.estado}</dd>
                <small>Un total parcial no se presenta como completo.</small>
              </div>
              <div className="metric">
                <dt>Revisión</dt>
                <dd>
                  <code className="cierre-fingerprint" title={preflight.fingerprint}>
                    {preflight.fingerprint}
                  </code>
                </dd>
                <small>
                  App {preflight.appVersion} · esquema {preflight.schemaVersion}
                </small>
              </div>
            </dl>
          </div>

          <div className="panel" aria-label="Gates del cierre">
            <h2>Gates del cierre</h2>
            <div className="shared-table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-label="Gate">E4.8 precierre</td>
                    <td data-label="Estado">
                      <Badge estado="Referencia documental" />
                    </td>
                    <td data-label="Detalle">
                      Referencia documental: el preflight E4.8 está integrado y
                      es de solo lectura; no autoriza ni cierra.
                    </td>
                  </tr>
                  <tr>
                    <td data-label="Gate">E3.5 / FIN_NETA</td>
                    <td data-label="Estado">
                      <Badge
                        estado={
                          preflight.e35.verificable
                            ? "Verificable"
                            : "No verificable"
                        }
                      />
                    </td>
                    <td data-label="Detalle">
                      {preflight.e35.verificable
                        ? "Se consume tal y como lo publica el proveedor; no se recalcula."
                        : preflight.e35.motivo ??
                          "Sin proveedor verificable: el cierre queda bloqueado."}
                    </td>
                  </tr>
                  <tr>
                    <td data-label="Gate">DT6 / T-BKP</td>
                    <td data-label="Estado">
                      <Badge
                        estado={
                          backupAcreditado(preflight.backup)
                            ? "Acreditado"
                            : "No acreditado"
                        }
                      />
                    </td>
                    <td data-label="Detalle">
                      {backupAcreditado(preflight.backup)
                        ? "Evidencia de manifiesto, checksum, clave y restauración."
                        : issueMessage(
                            preflight.bloqueos,
                            "BACKUP_NO_VERIFICABLE",
                          ) ??
                          preflight.backup.motivo ??
                          "Falta evidencia DT6/T-BKP: manifiesto, checksum, clave o restauración."}
                      {preflight.backup.referencia
                        ? ` Referencia: ${preflight.backup.referencia}.`
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td data-label="Gate">Plan del ciclo</td>
                    <td data-label="Estado">
                      <Badge estado={preflight.plan.estado} />
                    </td>
                    <td data-label="Detalle">
                      {preflight.plan.estado === "PlanNoVerificable"
                        ? issueMessage(preflight.bloqueos, "PLAN_NO_VERIFICABLE") ??
                          "El plan no es verificable; no se captura ni se inventan líneas."
                        : preflight.plan.estado === "SinPlan"
                          ? "SinPlan es válido; no se inventan líneas."
                          : `${preflight.plan.lineas} línea(s) capturadas.`}
                      {preflight.plan.sinPlanificar
                        ? " Existen hechos reales sin línea de plan."
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td data-label="Gate">Cierres posteriores</td>
                    <td data-label="Estado">
                      <Badge
                        estado={
                          preflight.coherencia.contradicciones.length
                            ? "Incoherencia"
                            : preflight.coherencia.requerida
                              ? "Fuera de orden"
                              : "Sin cierres posteriores"
                        }
                      />
                    </td>
                    <td data-label="Detalle">
                      {preflight.coherencia.requerida
                        ? preflight.coherencia.cierres
                            .map(
                              (entry) =>
                                `Ciclo ${entry.ciclo} v${entry.version} al ${date(entry.fin)}: ${
                                  entry.coherente ? "coherente" : entry.motivos.join(" ")
                                }`,
                            )
                            .join(" · ")
                        : "No hay cierres posteriores que comprobar."}
                    </td>
                  </tr>
                  <tr>
                    <td data-label="Gate">E4.1 posiciones a Fin</td>
                    <td data-label="Estado">
                      <Badge
                        estado={preflight.inversion.efectivo === null ? "No disponible" : "Integrado"}
                      />
                    </td>
                    <td data-label="Detalle">
                      Efectivo {amount(preflight.inversion.efectivo)} ·{" "}
                      {preflight.inversion.posiciones.length} posición(es).
                      Incluye anteriores a Fin y excluye posteriores.
                    </td>
                  </tr>
                  <tr>
                    <td data-label="Gate">E4.3 valoración / patrimonio</td>
                    <td data-label="Estado">
                      <Badge estado={preflight.inversion.valoracion} />
                    </td>
                    <td data-label="Detalle">{preflight.inversion.motivo}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {closed ? (
            <section
              className="panel e410-panel"
              aria-label="Reapertura y re-cierre del último cierre"
            >
              <div className="e410-head">
                <div>
                  <p className="eyebrow">E4.10 · REAPERTURA Y RE-CIERRE</p>
                  <h2>
                    {reopened
                      ? "Ciclo reabierto"
                      : sinCierre
                        ? "Sin cierre que reabrir"
                        : "Último cierre y reapertura"}
                  </h2>
                </div>
                <Badge
                  estado={
                    reopened
                      ? `Reabierto · v${originVersion ?? "?"}`
                      : `Cerrado · última v${originVersion ?? "?"}`
                  }
                />
              </div>

              <p className="muted">
                <strong>Ciclo ya cerrado</strong>. El cierre ordinario no reabre
                ni crea una segunda fotografía; solo E4.10 habilita la vía
                ordinaria de reapertura y re-cierre.
              </p>

              {actionError && (
                <ActionError failure={actionError} onRefresh={refreshActions} />
              )}

              {!reopened && !sinCierre && (
                <>
                  <p>
                    Solo el cierre con el <strong>Fin cronológicamente más
                    reciente</strong> y sin otro ciclo posterior cerrado es
                    reabrible. DT9 —ciclos antiguos— queda fuera de E4.10.
                  </p>
                  {puedeReabrir ? (
                    <>
                      <div className="e410-note ok" role="note">
                        <strong>Último cierre.</strong> v{originVersion} es la
                        última versión cerrada y no existe un cierre posterior.
                        La reapertura no crea ni modifica ninguna foto.
                      </div>
                      {!reopenOpen ? (
                        <div className="actions">
                          <button
                            className="primary"
                            type="button"
                            onClick={openReopen}
                          >
                            Reabrir el último cierre
                          </button>
                        </div>
                      ) : (
                        <div
                          className="e410-form"
                          aria-label="Confirmar reapertura"
                        >
                          <h3>Confirmar reapertura de v{originVersion}</h3>
                          <p>
                            Se abrirá una ventana de rectificación auditada con
                            actor de sesión y UTC. El motivo de reapertura
                            («por qué») es independiente del motivo del re-cierre.
                          </p>
                          <div className="e410-note warn" role="note">
                            <strong>Qué cambia y qué no.</strong>
                            <ul>
                              <li>
                                v{originVersion} y su foto quedan{" "}
                                <strong>intactas</strong>; no se crea una foto
                                nueva ni se reescribe la existente.
                              </li>
                              <li>
                                Se habilita T1 en Movimientos, Compras y Ventas
                                dentro de la ventana y del ciclo, con impacto y
                                auditoría por escritura; T2/T3 conservan sus
                                guardas.
                              </li>
                              <li>
                                S0, <code>inicio</code>, <code>Fin</code>, otros
                                ciclos y el cierre posterior siguen bloqueados.
                              </li>
                              <li>
                                El re-cierre crea una versión nueva v
                                {nextVersion ?? "?"} con el contrato
                                completo de foto y revalida DT6/E3.5.
                              </li>
                            </ul>
                          </div>
                          <div className="e410-readonly">
                            <span>Clave de intento (idempotencia)</span>
                            <code data-testid="e410-reopen-key">
                              {reopenKey || "Se generará al confirmar"}
                            </code>
                          </div>
                          <label htmlFor="e410-motivo-reapertura">
                            Motivo de la reapertura{" "}
                            <span className="e410-required">obligatorio</span>
                          </label>
                          <textarea
                            id="e410-motivo-reapertura"
                            rows={3}
                            maxLength={1000}
                            value={motivoReapertura}
                            onChange={(event) => {
                              const value = event.target.value;
                              setMotivoReapertura(value);
                              rotateKey(
                                reopenAttempt,
                                setReopenKey,
                                `${originVersion}|${value.trim()}`,
                              );
                            }}
                            placeholder="Por qué se reabre el último cierre"
                          />
                          <p className="muted">
                            Máximo 1000 caracteres; se guarda con trim, actor y
                            UTC en la auditoría. No sustituye al fingerprint.
                          </p>
                          <div className="actions">
                            <button
                              className="secondary"
                              type="button"
                              onClick={() => setReopenOpen(false)}
                            >
                              Cancelar
                            </button>
                            <button
                              className="primary"
                              type="button"
                              onClick={confirmReopen}
                              disabled={actionBusy === "reabrir"}
                            >
                              {actionBusy === "reabrir"
                                ? "Reabriendo…"
                                : "Confirmar reapertura"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="e410-note warn" role="note">
                      <strong>No reabrible.</strong>{" "}
                      {elegibilidad?.motivo ??
                        "No se pudo verificar la elegibilidad con el contrato de lectura. Actualiza la revisión antes de intentar reabrir."}
                      {elegibilidad?.cierrePosterior && (
                        <p>
                          Cierre posterior: ciclo{" "}
                          {elegibilidad.cierrePosterior.ciclo} · v
                          {elegibilidad.cierrePosterior.version} · Fin{" "}
                          {date(elegibilidad.cierrePosterior.fin)}. No se
                          modifica ni se reabre por esta vía.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {sinCierre && (
                <div className="e410-note warn" role="note">
                  <strong>Sin cierre financiero.</strong> La reapertura exige un
                  cierre previo; el primer cierre corresponde a E4.9 y esta
                  pantalla no lo inventa.
                </div>
              )}

              {reopened && reapertura && (
                <>
                  <div className="e410-band" role="status">
                    <strong>
                      Ventana de rectificación abierta sobre v{originVersion}
                    </strong>
                    <p>
                      Una sola ventana activa. v{originVersion} es consultable,
                      pero <strong>no es la versión vigente sin advertencia</strong>.
                      No se presenta la vista viva como si fuera la foto.
                    </p>
                  </div>

                  <dl className="shared-metrics cierre-metrics">
                    <div className="metric">
                      <dt>Estado de cierre</dt>
                      <dd>
                        <Badge estado={`Reabierto · v${originVersion}`} />
                      </dd>
                      <small>Reserva del último cierre; DT9 no habilitado.</small>
                    </div>
                    <div className="metric">
                      <dt>Versión de origen</dt>
                      <dd>v{originVersion}</dd>
                      <small>No se crea versión de foto al reabrir.</small>
                    </div>
                    <div className="metric">
                      <dt>Ventana</dt>
                      <dd>
                        {date(preflight.ventana.inicio)} →{" "}
                        {date(preflight.ventana.fin)}
                      </dd>
                      <small>S0, inicio y Fin congelados; no se recalculan.</small>
                    </div>
                    <div className="metric">
                      <dt>Reapertura</dt>
                      <dd>
                        {reapertura.reapertura
                          ? utc(reapertura.reapertura.creadoUtc)
                          : "No disponible"}
                      </dd>
                      <small>
                        Actor {reapertura.reapertura?.actor ?? "No disponible"}.
                      </small>
                    </div>
                    <div className="metric">
                      <dt>Motivo de reapertura</dt>
                      <dd>{reapertura.reapertura?.motivo ?? "Sin motivo"}</dd>
                      <small>
                        Separado del motivo de re-cierre; máximo 1000 caracteres.
                      </small>
                    </div>
                    <div className="metric">
                      <dt>Fingerprint de la petición</dt>
                      <dd>
                        <code
                          className="cierre-fingerprint"
                          title={reapertura.reapertura?.fingerprint}
                        >
                          {reapertura.reapertura?.fingerprint ?? "No disponible"}
                        </code>
                      </dd>
                      <small>
                        Correlación{" "}
                        {reapertura.reapertura?.correlacion ?? "No disponible"}.
                      </small>
                    </div>
                  </dl>

                  <div className="e410-grid-2">
                    <div>
                      <h3>Permitido dentro de la ventana</h3>
                      <ul className="e410-list">
                        <li>
                          T1 en Movimientos, Compras y Ventas dentro del ciclo y
                          de la ventana, con impacto y auditoría por escritura.
                        </li>
                        <li>
                          T2 con impacto/motivo/auditoría; la foto v
                          {originVersion} no se altera.
                        </li>
                        <li>T3 según su guarda vigente.</li>
                      </ul>
                      <p className="muted">
                        Cada corrección conserva su propia auditoría. Esta vista
                        muestra el impacto acumulado y la revalidación, no
                        sustituye la auditoría de la ruta T1/T2.
                      </p>
                    </div>
                    <div>
                      <h3>Sigue bloqueado</h3>
                      <ul className="e410-list">
                        <li>
                          S0, <code>inicio</code> y <code>Fin</code>: identidad
                          congelada.
                        </li>
                        <li>
                          Otros ciclos, su S0 y su plan; no se recalculan ni se
                          «cuadran» automáticamente.
                        </li>
                        <li>
                          Editar o borrar v{originVersion}, su foto o una versión:
                          inmutable.
                        </li>
                        <li>
                          Abrir una segunda ventana o saltarse el re-cierre.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="e410-note warn" role="note">
                    <strong>La fotografía v{originVersion} no es la vista viva.</strong>{" "}
                    Los cambios de la rectificación se leen en sus pantallas y en
                    la preparación del re-cierre. La foto persistida no se
                    recalcula ni se mezcla con el estado vivo.
                  </div>

                  <div className="actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => {
                        if (originVersion !== null) setPhotoVersion(originVersion);
                      }}
                      disabled={originVersion === null}
                    >
                      Consultar v{originVersion ?? "?"}
                    </button>
                    {originVersion !== null && originVersion > 1 && (
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => setPhotoVersion(1)}
                      >
                        Consultar v1
                      </button>
                    )}
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => go("/movimientos")}
                    >
                      Ir a Movimientos
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => go("/inversiones")}
                    >
                      Ir a Compras/Ventas
                    </button>
                  </div>

                  <div className="e410-preparation">
                    <div className="e410-head">
                      <h3>Preparación del re-cierre</h3>
                      {repreflight && (
                        <Badge estado={repreflight.estado} />
                      )}
                    </div>
                    {repreflightLoading && (
                      <p role="status">Cargando vista previa del re-cierre…</p>
                    )}
                    {repreflightError && (
                      <Alert
                        retry={() =>
                          setRepreflightReload((value) => value + 1)
                        }
                      >
                        {repreflightError}
                      </Alert>
                    )}
                    {repreflight && (
                      <>
                        <p className="muted">
                          Preflight de solo lectura. Vínculo con v
                          {repreflight.origen.versionOrigen} · fingerprint{" "}
                          <code
                            className="cierre-fingerprint"
                            title={repreflight.fingerprint}
                          >
                            {repreflight.fingerprint}
                          </code>{" "}
                          · App {repreflight.appVersion} · esquema{" "}
                          {repreflight.schemaVersion}.
                        </p>
                        <MaterialComparisonView
                          comparacion={repreflight.comparacion}
                        />
                        <h3>Revalidación de dependencias posteriores</h3>
                        <p className="muted">
                          Revalidación de solo lectura: no modifica el S0 ni el
                          plan de otro ciclo. Una contradicción material bloquea;
                          un aviso solo se muestra si queda acreditado como no
                          bloqueante.
                        </p>
                        <RevalidacionTable
                          revalidacion={repreflight.revalidacion}
                        />
                        <IssueList
                          items={repreflight.bloqueos}
                          kind="bloqueo"
                          title="Bloqueos del re-cierre"
                        />
                        <IssueList
                          items={repreflight.avisos}
                          kind="aviso"
                          title="Avisos del re-cierre"
                        />
                        <div className="e410-grid-2">
                          <div>
                            <h3>Evidencia de backup DT6/T-BKP</h3>
                            <p>
                              <Badge
                                estado={
                                  backupAcreditado(repreflight.backup)
                                    ? "Acreditado"
                                    : "No acreditado"
                                }
                              />
                            </p>
                            <p>
                              {backupAcreditado(repreflight.backup)
                                ? "Manifiesto, checksum, clave y restauración probada."
                                : repreflight.backup.motivo ??
                                  "Falta evidencia DT6/T-BKP para el cierre real."}
                            </p>
                            <p className="muted">
                              Referencia:{" "}
                              {repreflight.backup.referencia ?? "No disponible"}
                            </p>
                          </div>
                          <div>
                            <h3>Plan y cobertura</h3>
                            <p>
                              Plan: <Badge estado={repreflight.plan.estado} /> ·{" "}
                              {repreflight.plan.lineas} línea(s). Cobertura:{" "}
                              {repreflight.cobertura.estado}.
                            </p>
                            <p className="muted">
                              Un plan <code>SinPlan</code> es válido y se captura
                              como tal; no se inventan líneas. Un auxiliar ausente
                              se declara «No disponible» con motivo.
                            </p>
                          </div>
                        </div>

                        {repreflightBlocked ? (
                          <div className="e410-note danger" role="alert">
                            <strong>Re-cierre bloqueado.</strong> No se ofrece
                            «re-cerrar igualmente» ni una foto parcial. Corrige la
                            causa o actualiza la revisión; el ciclo permanece
                            Reabierto(v{originVersion}).
                          </div>
                        ) : repreflightSinCambios ? (
                          <div className="e410-note warn" role="note">
                            <strong>SIN_CAMBIOS.</strong> No se crea una foto
                            nueva. Si la ausencia de cambios materiales está
                            acreditada, usa la cancelación D8; no basta la
                            igualdad de importes o totales.
                          </div>
                        ) : (
                          <div
                            className="e410-form"
                            aria-label="Confirmar re-cierre"
                          >
                            <h3>
                              Confirmar re-cierre v{nextVersion ?? "?"}
                            </h3>
                            <p>
                              Se escribirán el cierre v
                              {nextVersion ?? "?"}, la foto completa, el
                              vínculo v{originVersion} → v
                              {nextVersion ?? "?"}, la auditoría y el
                              intento en una transacción única. Un fallo deja
                              rollback total y el ciclo sigue Reabierto(v
                              {originVersion}).
                            </p>
                            <div className="e410-readonly">
                              <span>Fingerprint del preflight</span>
                              <code
                                className="cierre-fingerprint"
                                title={repreflight.fingerprint}
                              >
                                {repreflight.fingerprint}
                              </code>
                            </div>
                            <div className="e410-readonly">
                              <span>Clave de intento (idempotencia)</span>
                              <code data-testid="e410-recierre-key">
                                {recierreKey || "Se generará al confirmar"}
                              </code>
                            </div>
                            <label htmlFor="e410-motivo-recierre">
                              Motivo del re-cierre{" "}
                              <span className="e410-required">obligatorio</span>
                            </label>
                            <textarea
                              id="e410-motivo-recierre"
                              rows={3}
                              maxLength={1000}
                              value={motivoRecierre}
                              onChange={(event) => {
                                const value = event.target.value;
                                setMotivoRecierre(value);
                                rotateKey(
                                  recierreAttempt,
                                  setRecierreKey,
                                  `${originVersion}|${repreflight.fingerprint}|${value.trim()}`,
                                );
                              }}
                              placeholder="Qué se rectificó y por qué"
                            />
                            <p className="muted">
                              Motivo separado del de reapertura; máximo 1000
                              caracteres. El fingerprint de la vista previa debe
                              seguir vigente.
                            </p>
                            <div className="actions">
                              <button
                                className="primary"
                                type="button"
                                onClick={confirmRecierre}
                                disabled={actionBusy === "recerrar"}
                              >
                                {actionBusy === "recerrar"
                                  ? "Re-cerrando…"
                                  : `Confirmar re-cierre v${nextVersion ?? "?"}`}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="e410-cancel">
                    <h3>Cancelar la reapertura (D8)</h3>
                    <p>
                      Solo se admite sin cambios materiales acreditados desde la
                      reapertura. No basta la igualdad de importes: se comparan
                      hechos, relaciones, clasificación, plan y componentes. Ante
                      incertidumbre se bloquea.
                    </p>
                    {repreflight &&
                    repreflight.comparacion.estado !== "SinCambios" ? (
                      <p className="muted">
                        La comparación actual es{" "}
                        <Badge estado={repreflight.comparacion.estado} />. No se
                        ofrece la cancelación sin foto: usa el re-cierre v
                        {nextVersion ?? "?"} si hay cambios materiales.
                      </p>
                    ) : !cancelOpen ? (
                      <div className="actions">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setCancelOpen(true);
                            const key = crypto.randomUUID();
                            cancelAttempt.current = {
                              key,
                              signature:
                                originVersion + "|" + motivoCancelacion.trim(),
                            };
                            setCancelKey(key);
                          }}
                          disabled={!repreflight}
                        >
                          Cancelar reapertura sin foto
                        </button>
                      </div>
                    ) : (
                      <div className="e410-form" aria-label="Cancelar reapertura">
                        <div className="e410-readonly">
                          <span>Clave de intento (idempotencia)</span>
                          <code data-testid="e410-cancel-key">
                            {cancelKey || "Se generará al confirmar"}
                          </code>
                        </div>
                        <label htmlFor="e410-motivo-cancelacion">
                          Motivo de la cancelación{" "}
                          <span className="e410-required">obligatorio</span>
                        </label>
                        <textarea
                          id="e410-motivo-cancelacion"
                          rows={3}
                          maxLength={1000}
                          value={motivoCancelacion}
                          onChange={(event) => {
                            const value = event.target.value;
                            setMotivoCancelacion(value);
                            rotateKey(
                              cancelAttempt,
                              setCancelKey,
                              `${originVersion}|${value.trim()}`,
                            );
                          }}
                          placeholder="Por qué no hay cambios materiales"
                        />
                        <div className="actions">
                          <button
                            className="secondary"
                            type="button"
                            onClick={() => setCancelOpen(false)}
                          >
                            Volver
                          </button>
                          <button
                            className="primary"
                            type="button"
                            onClick={confirmCancel}
                            disabled={actionBusy === "cancelar"}
                          >
                            {actionBusy === "cancelar"
                              ? "Cancelando…"
                              : "Confirmar cancelación sin foto"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : (
            <>
              <IssueList items={preflight.bloqueos} kind="bloqueo" />
              <IssueList items={preflight.avisos} kind="aviso" />

              <div className="panel" aria-label="Hechos previstos">
                <h2>Hechos y plan previstos</h2>
                <p>
                  Hechos: <Badge estado={preflight.hechos.estado} /> · Plan:{" "}
                  <Badge estado={preflight.plan.estado} />
                </p>
                <TotalsTable
                  totals={preflight.hechos.totales}
                  label="Totales de hechos previstos"
                />
                <ul className="cierre-sources">
                  {preflight.hechos.fuentes.map((source) => (
                    <li key={source.fuente}>
                      {source.fuente}: {source.hechos} hecho(s) ·{" "}
                      {source.acreditado ? "acreditado" : "no acreditado"}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel" aria-label="Cobertura del cierre">
                <h2>Cobertura por métrica</h2>
                <CoverageTable cobertura={preflight.cobertura} />
              </div>

              {Object.keys(preflight.noDisponible).length > 0 && (
                <div className="panel" aria-label="No disponible">
                  <h2>No disponible</h2>
                  <ul className="cierre-sources">
                    {Object.entries(preflight.noDisponible).map(([key, value]) => (
                      <li key={key}>
                        <strong>{NO_DISPONIBLE_LABELS[key] ?? key}</strong> —{" "}
                        {value.estado}: {value.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="panel cierre-form" aria-label="Confirmar cierre">
                <h2>Confirmar cierre</h2>
                {blocked ? (
                  <>
                    <p role="note">
                      El cierre está bloqueado: no se ofrece «cerrar igualmente» ni
                      una fotografía parcial. Corrige la causa fuera de esta
                      pantalla o actualiza la revisión.
                    </p>
                    <div className="actions">
                      <button
                        className="primary"
                        type="button"
                        disabled
                        aria-describedby="cierre-block-reason"
                      >
                        Confirmar cierre
                      </button>
                    </div>
                    <p id="cierre-block-reason" className="muted">
                      {preflight.bloqueos.map((item) => item.code).join(" · ") ||
                        "Preflight bloqueado."}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="cierre-readonly">
                      <span>Fingerprint que se enviará</span>
                      <code
                        className="cierre-fingerprint"
                        title={preflight.fingerprint}
                        data-testid="cierre-form-fingerprint"
                      >
                        {preflight.fingerprint}
                      </code>
                    </div>
                    <div className="cierre-readonly">
                      <span>Clave de intento (idempotencia)</span>
                      <code
                        className="cierre-fingerprint"
                        title={attemptKey}
                        data-testid="cierre-attempt-key"
                      >
                        {attemptKey}
                      </code>
                    </div>
                    <label htmlFor="cierre-motivo">
                      Motivo del cierre{" "}
                      {needsMotive ? (
                        <span className="cierre-required">obligatorio</span>
                      ) : (
                        <small>opcional</small>
                      )}
                    </label>
                    <textarea
                      id="cierre-motivo"
                      rows={3}
                      maxLength={1000}
                      value={motivo}
                      onChange={(event) => setMotivo(event.target.value)}
                      placeholder="Motivo del cierre"
                      aria-invalid={fields.motivo ? "true" : "false"}
                      aria-describedby={
                        fields.motivo ? "cierre-motivo-error" : "cierre-motivo-help"
                      }
                    />
                    <p id="cierre-motivo-help" className="muted">
                      {needsMotive
                        ? "Hay cierres posteriores coherentes: el cierre fuera de orden exige motivo y auditoría."
                        : "SPEC27 no fija un catálogo ni una longitud; el motivo se congela con la foto."}
                    </p>
                    {fields.motivo && (
                      <p id="cierre-motivo-error" className="field-error">
                        {fields.motivo}
                      </p>
                    )}
                    <div className="cierre-warning" role="note">
                      <strong>Aviso de irreversibilidad.</strong> Se escriben cierre,
                      foto v1 y auditoría en una transacción única. T1 queda
                      bloqueado, T2 se revalida con impacto/motivo/auditoría y T3 se
                      permite. Un fallo deja rollback total: sin cierre ni foto
                      parcial. No se crea el ciclo siguiente ni se cambia su S0.
                    </div>
                    <div className="actions">
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => go("/precierre")}
                      >
                        Ver precierre
                      </button>
                      <button
                        className="primary"
                        type="button"
                        onClick={confirm}
                        disabled={closing}
                      >
                        {closing ? "Cerrando…" : "Confirmar cierre"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {closed && (
            <>
              {photoLoading && <p role="status">Cargando fotografía…</p>}
              {photo ? (
                <section className="panel cierre-photo" aria-label="Fotografía de cierre">
                  <div className="cierre-photo-head">
                    <div>
                      <p className="eyebrow">FOTOGRAFÍA INMUTABLE</p>
                      <h2 ref={photoHeading} tabIndex={-1}>
                        Fotografía v{photo.foto.version}
                      </h2>
                    </div>
                    <Badge
                      estado={
                        reopened
                          ? "Reabierto · foto v" +
                            photo.foto.version +
                            " no vigente"
                          : "Cerrado · v" + photo.foto.version
                      }
                    />
                  </div>
                  {reopened && (
                    <div className="e410-note warn" role="note">
                      <strong>Foto consultable, no vigente sin advertencia.</strong>{" "}
                      El ciclo está reabierto sobre v{photo.foto.version}. Esta
                      fotografía conserva los valores persistidos del último
                      cierre; no incluye las correcciones de la ventana y no se
                      presenta como vista viva.
                    </div>
                  )}
                  <div className="cierre-immutable" role="note">
                    <strong>Registro inmutable.</strong> Fingerprint propio{" "}
                    <code className="cierre-fingerprint" title={photo.foto.fingerprint}>
                      {photo.foto.fingerprint}
                    </code>
                    . Retención permanente: T2/T3 no la recalculan y la UI no la
                    edita ni la borra.
                  </div>

                  {versionCount > 1 && (
                    <label htmlFor="cierre-version">
                      Versión de la fotografía (persistida)
                      <select
                        id="cierre-version"
                        value={photo.foto.version}
                        onChange={(event) =>
                          setPhotoVersion(Number(event.target.value))
                        }
                      >
                        {Array.from({ length: versionCount }, (_, index) => index + 1).map(
                          (version) => (
                            <option key={version} value={version}>
                              v{version}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}

                  <dl className="shared-metrics cierre-metrics">
                    <div className="metric">
                      <dt>Identidad</dt>
                      <dd>Ciclo {photo.foto.ciclo} · v{photo.foto.version}</dd>
                      <small>
                        Seleccionada v{photo.foto.version} · última cerrada v
                        {preflight.cierre.version ?? photo.foto.version} ·{" "}
                        {utc(photo.foto.creadoUtc)} · actor {photo.foto.actor}
                      </small>
                    </div>
                    <div className="metric">
                      <dt>Motivo</dt>
                      <dd>{photo.foto.motivo ?? "Sin motivo"}</dd>
                      <small>Se congela con la foto y no se recalcula.</small>
                    </div>
                    <div className="metric">
                      <dt>Versiones</dt>
                      <dd>
                        App {photo.foto.appVersion} · esquema {photo.foto.schemaVersion}
                      </dd>
                      <small>Metadatos inmutables del cierre.</small>
                    </div>
                    <div className="metric">
                      <dt>Ventana congelada</dt>
                      <dd>
                        {date(photo.foto.ventana.inicio)} →{" "}
                        {date(photo.foto.ventana.fin)}
                      </dd>
                      <small>
                        Estado temporal: {photo.foto.ventana.estadoTemporal}
                      </small>
                    </div>
                    <div className="metric">
                      <dt>S0 congelado</dt>
                      <dd>{amount(photo.foto.ventana.saldoInicial)}</dd>
                      <small>No se sustituye por 0 ni se recalcula.</small>
                    </div>
                    <div className="metric">
                      <dt>Backup DT6/T-BKP</dt>
                      <dd>
                        <Badge
                          estado={
                            backupAcreditado(photo.foto.backup)
                              ? "Acreditado"
                              : "No acreditado"
                          }
                        />
                      </dd>
                      <small>
                        {backupAcreditado(photo.foto.backup)
                          ? photo.foto.backup.motivo
                          : !photo.foto.backup.referencia
                            ? "Falta la referencia de manifiesto/checksum/clave de la evidencia DT6/T-BKP."
                            : photo.foto.backup.motivo ??
                              "Backup no acreditado: falta la restauración probada."}
                      </small>
                    </div>
                  </dl>

                  <div className="cierre-grid-2">
                    <div>
                      <h3>Hechos y plan</h3>
                      <p>
                        Hechos: <Badge estado={photo.foto.hechos.estado} /> ·{" "}
                        {photo.foto.hechos.movimientos.length} movimiento(s) · Plan:{" "}
                        <Badge estado={photo.foto.plan.estado} /> ·{" "}
                        {photo.foto.plan.items.length} línea(s)
                      </p>
                      <TotalsTable
                        totals={photo.foto.hechos.totales}
                        label="Totales capturados en la fotografía"
                      />
                      <ul className="cierre-sources">
                        {photo.foto.hechos.fuentes.map((source) => (
                          <li key={source.fuente}>
                            {source.fuente}: {source.hechos} hecho(s) ·{" "}
                            {source.acreditado ? "acreditado" : "no acreditado"}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Inversión E4.1 a Fin</h3>
                      <p>
                        Efectivo {amount(photo.foto.inversion.efectivo)} ·{" "}
                        {photo.foto.inversion.instrumentos.length} instrumento(s) ·{" "}
                        {photo.foto.inversion.posiciones.length} posición(es)
                      </p>
                      <p className="muted">
                        Valoración: {photo.foto.inversion.valoracion}.{" "}
                        {photo.foto.inversion.motivoValoracion}
                      </p>
                      <h3>Cobertura de la fotografía</h3>
                      <CoverageTable cobertura={photo.foto.cobertura} />
                    </div>
                  </div>

                  <h3>No disponible en la foto</h3>
                  <ul className="cierre-sources">
                    {Object.entries(photo.foto.noDisponible).map(([key, value]) => (
                      <li key={key}>
                        <strong>{NO_DISPONIBLE_LABELS[key] ?? key}</strong> —{" "}
                        {value.estado}: {value.motivo}
                      </li>
                    ))}
                  </ul>

                  <h3>Evidencia de backup</h3>
                  <dl className="cierre-backup">
                    <div>
                      <dt>Manifiesto / checksum / clave</dt>
                      <dd>{photo.foto.backup.referencia ?? "No disponible"}</dd>
                    </div>
                    <div>
                      <dt>Restauración</dt>
                      <dd>
                        {photo.foto.backup.restauracionProbada
                          ? "Probada"
                          : "No probada"}
                      </dd>
                    </div>
                    <div>
                      <dt>Motivo registrado</dt>
                      <dd>{photo.foto.backup.motivo ?? "Sin motivo"}</dd>
                    </div>
                  </dl>

                  <div className="actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setPhotoReload((value) => value + 1)}
                    >
                      Volver a leer la foto
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => go("/precierre")}
                    >
                      Ver precierre
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => go("/ciclos")}
                    >
                      Volver a ciclos
                    </button>
                  </div>
                </section>
              ) : (
                !photoLoading && (
                  <p className="muted">La fotografía no se pudo cargar.</p>
                )
              )}
            </>
          )}

          {recierreResult && (
            <>
              {previousPhoto ? (
                <PhotoComparison
                  before={previousPhoto}
                  after={recierreResult}
                  comparacion={recierreResult.comparacion}
                  correlacion={recierreResult.vinculo.correlacion}
                  onVersion={setPhotoVersion}
                />
              ) : (
                <section
                  className="panel e410-result"
                  aria-label="Resultado del re-cierre"
                >
                  <div className="e410-head">
                    <div>
                      <p className="eyebrow">E4.10 · RE-CIERRE</p>
                      <h2>
                        Fotografía v{recierreResult.foto.version} creada
                      </h2>
                    </div>
                    <Badge
                      estado={`Cerrado · v${recierreResult.foto.version}`}
                    />
                  </div>
                  <p>
                    v{recierreResult.vinculo.versionOrigen} se conserva intacta.
                    No se pudo cargar la fotografía anterior para la comparación
                    lado a lado; no se sustituye por una vista viva ni por totales
                    provisionales.
                  </p>
                  <div className="actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() =>
                        setPhotoVersion(recierreResult.vinculo.versionOrigen)
                      }
                    >
                      Consultar v{recierreResult.vinculo.versionOrigen}
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() =>
                        setPhotoVersion(recierreResult.foto.version)
                      }
                    >
                      Consultar v{recierreResult.foto.version}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
