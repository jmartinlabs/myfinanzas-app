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
  if (/parcial|aviso|sin planificar|fuera de orden|pendiente/.test(value))
    return "warn";
  if (/sin hechos|sinplan|vacío|vacio/.test(value)) return "empty";
  if (/listo|completo|capturado|verificad|cerrad|coherente|válido|valido/.test(value))
    return "ok";
  return "neutral";
}

function Badge({ estado }: { estado: string }) {
  return <span className={`cierre-badge tone-${tone(estado)}`}>{estado}</span>;
}

function IssueList({ items, kind }: { items: Issue[]; kind: "bloqueo" | "aviso" }) {
  if (!items.length) return null;
  return (
    <div
      className={"cierre-issues " + kind}
      role={kind === "bloqueo" ? "alert" : "status"}
      aria-label={kind === "bloqueo" ? "Bloqueos que impiden cerrar" : "Avisos del cierre"}
    >
      <h2>{kind === "bloqueo" ? "Bloqueos que impiden cerrar" : "Avisos"}</h2>
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
      setLoading(false);
      return;
    }
    const current = ++request.current;
    setLoading(true);
    setError("");
    setErrorCode("");
    setFields({});
    api<Preflight>("/cierres/" + selected + "/preflight")
      .then((result) => {
        if (current !== request.current || selectedRef.current !== selected) return;
        setPreflight(result);
        setAttemptKey(crypto.randomUUID());
        attempt.current = null;
        setError("");
        setErrorCode("");
        setPhotoVersion(result.cierre.fotoVersion ?? result.cierre.version);
      })
      .catch((e) => {
        if (current !== request.current || selectedRef.current !== selected) return;
        setPreflight(null);
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

  function selectCycle(id: string) {
    setSelected(id);
    history.replaceState(null, "", "/cierre?ciclo=" + id);
    setMotivo("");
    setPhoto(null);
    setPhotoVersion(null);
    setNotice("");
  }

  function retry() {
    setReload((value) => value + 1);
  }

  function refreshReview() {
    setNotice("");
    setReload((value) => value + 1);
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
  const versionCount = preflight?.cierre.version ?? 1;
  const estadoDisplay = closed ? "Cerrado" : preflight?.estado;

  return (
    <section className="cierre-page">
      <PageHead
        eyebrow="E4.9 · Cierre y fotografía"
        title="Cierre financiero"
        description="Cierre manual del ciclo y fotografía inmutable. No crea el ciclo siguiente, no cambia su S0 y no recalcula la foto."
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
          {errorSource === "confirm" && !conflict && (
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
            <div className="panel cierre-closed-note" aria-label="Cierre existente">
              <h2>Ciclo ya cerrado</h2>
              <p>
                El cierre ordinario no reabre ni crea una segunda fotografía. Solo
                E4.10 puede habilitar un re-cierre y queda fuera de E4.9.
              </p>
            </div>
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
                    <Badge estado={"Cerrado · v" + photo.foto.version} />
                  </div>
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
                      Versión de la fotografía
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
        </>
      )}
    </section>
  );
}
