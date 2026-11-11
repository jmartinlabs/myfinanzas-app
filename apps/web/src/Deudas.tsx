import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, eur } from "./api";
import {
  Alert,
  DataList,
  PageHead,
  Skeleton,
  Table,
  Tag,
  type TableColumn,
} from "./ui";
import { referenceReturn } from "./movement-draft";

/*
 * E4.4 — Deuda completa y conciliación desde apertura.
 *
 * The page consumes the E4.4 read model (`GET /api/deudas` and
 * `GET /api/deudas/:id`) for listing, control and capital, informative
 * conditions, read-only R5 history, executed history and reconciliations.
 * Derived values are never calculated or persisted in the browser; the only
 * local arithmetic is presentation of the exact declared/derived relation
 * already returned by the server (declared - difference).
 */

type CapitalDeuda = {
  aplicado: string | null;
  deudaViva: string | null;
  calculable: boolean;
  motivoNoCalculable: string | null;
  hechosInvalidos: string[];
};

type CoberturaDeuda = {
  desdeControl: boolean;
  hastaCorte: boolean;
  incluyePrecontrol: boolean;
  hechosAplicables: number;
  hechosExcluidosPorCorte: number;
  hechosAnulados: number;
  desgloseVerificable: boolean;
};

type HistoriaDeuda = {
  movimiento: string;
  fecha: string;
  tipo: string;
  total: string;
  capital: string | null;
  intereses: string | null;
  gasto: string;
  efectoBanco: string;
  aplicaAlCapital: boolean;
  estado: "Vigente" | "Anulado";
};

type TotalesDeuda = {
  capital: string | null;
  intereses: string | null;
  gasto: string;
  banco: string;
  anulados: number;
};

type Conciliacion = {
  id: string;
  deuda: string;
  fechaCorte: string;
  capitalDeclarado: string;
  fuente: string | null;
  nota: string | null;
  estado: "Vigente" | "Anulada";
  revision: number;
  diferencia: string | null;
  estadoConciliacion: "Conciliado" | "Diferencia" | "No comparable";
  motivoNoComparable: string | null;
};

type ComprobacionRelacion = {
  aplicable: boolean;
  estado: "Consistente" | "Inconsistente" | "Sin datos" | "No calculable";
  diferencia: string | null;
  motivo: string | null;
};

export type Debt = {
  id: string;
  nombre: string;
  estado: string;
  revision: number;
  tipoDeuda: string | null;
  inicioControl: string | null;
  capitalApertura: string | null;
  capitalPendiente: string | null;
  capital: CapitalDeuda;
  conciliacion: Conciliacion | null;
  varias: boolean;
};

type DeudaFicha = Debt & {
  creado: string;
  actualizado: string;
  control: {
    inicio: string | null;
    capitalApertura: string | null;
    capitalControl: string | null;
  };
  condiciones: {
    tin: string | null;
    tae: string | null;
    cuotaContractual: string | null;
    texto: string | null;
  };
  historico: {
    capitalInicial: string | null;
    capitalAmortizadoHistorico: string | null;
    amortizacionExtraHistorica: string | null;
    capitalHistoricoCuotas: string | null;
    interesesHistoricos: string | null;
    totalPagadoHistorico: string | null;
    precontrol: {
      ejercicio: number | null;
      cuotas: number | null;
      capital: string | null;
      amortizacionExtra: string | null;
    } | null;
    comprobacion: {
      capital: ComprobacionRelacion;
      cuotas: ComprobacionRelacion;
    };
  };
  corte: string | null;
  cobertura: CoberturaDeuda;
  historia: HistoriaDeuda[];
  totales: TotalesDeuda;
  conciliaciones: Conciliacion[];
  conciliacionVigente: Conciliacion | null;
};

type DetailData = {
  item: DeudaFicha;
  usos: { id: string; anulado: number }[];
  partidas: { id: string; nombre: string; estado: string }[];
};

const base = "/deudas";

/*
 * AC-29: loading, network, session and validation failures are distinct.
 * The API already distinguishes 401/404/409/422; the page only translates the
 * session case and keeps an actionable retry for transient failures.
 */
const failure = (e: unknown) =>
  e instanceof ApiError
    ? e
    : new ApiError(0, (e as Error)?.message ?? "No se pudo completar la operación.");

const failureText = (e: ApiError) =>
  e.status === 401
    ? "La sesión ha caducado. Vuelve a identificarte; no se envían datos."
    : e.message;

const retryable = (e: ApiError | null) =>
  !!e &&
  e.status !== 401 &&
  e.status !== 403 &&
  e.status !== 404 &&
  e.status !== 422;

const fecha = (iso: string | null) =>
  iso ? iso.split("-").reverse().join("/") : "Sin informar";

const amount = (value: string | null, fallback = "Sin informar") =>
  value === null ? fallback : eur(value);

const signed = (value: string | null) => {
  if (value === null) return "No calculable";
  if (/^-?0(?:\.0+)?$/.test(value)) return eur("0.00");
  return value.startsWith("-") ? eur(value) : "+" + eur(value);
};

const rate = (value: string | null) => {
  if (value === null) return "Sin informar";
  const [whole, fraction = ""] = value.split(".");
  return `${whole},${fraction.replace(/0+$/, "").padEnd(2, "0")} %`;
};

const tipoDeuda = (value: string | null) => value ?? "Sin informar";

const centsOf = (value: string) => {
  const negative = value.startsWith("-"),
    [whole, fraction = ""] = value.replace("-", "").split("."),
    n =
      BigInt(whole) * 100n +
      BigInt((fraction + "00").slice(0, 2));
  return negative ? -n : n;
};

const amountOfCents = (value: bigint) => {
  const negative = value < 0n,
    abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
};

const derivedAt = (conciliacion: Conciliacion) =>
  conciliacion.diferencia === null
    ? null
    : amountOfCents(
        centsOf(conciliacion.capitalDeclarado) -
          centsOf(conciliacion.diferencia),
      );

const conciliacionLabel = (value: Conciliacion | null) => {
  if (value === null) return "Sin declarar";
  if (value.estadoConciliacion === "No comparable") return "No comparable";
  return (
    signed(value.diferencia) +
    (value.estadoConciliacion === "Conciliado" ? " · Conciliado" : "")
  );
};

const normalizeAmount = (value: string) =>
  value.trim().replace(",", ".");

function Section({
  id,
  title,
  count,
  hint,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="e44-section">
      <h2 className="e44-section-title">
        <button
          type="button"
          id={id + "-toggle"}
          className="e44-toggle"
          aria-expanded={open}
          aria-controls={id + "-body"}
          onClick={onToggle}
        >
          <span aria-hidden="true" className="e44-chevron">
            {open ? "▾" : "▶"}
          </span>
          <span>{title}</span>
          {count !== undefined && <span className="e44-count">({count})</span>}
          {hint && <span className="e44-hint">{hint}</span>}
        </button>
      </h2>
      <div
        id={id + "-body"}
        className="e44-section-body"
        role="region"
        aria-labelledby={id + "-toggle"}
        hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}

export function Deudas({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  const match = path.match(/^\/deudas\/(D\d+)(?:\/(editar))?$/);
  if (path === base) return <List go={go} />;
  if (path === base + "/nueva") return <Form key="nueva" go={go} />;
  if (match)
    return match[2] ? (
      <Form key={path} id={match[1]} go={go} />
    ) : (
      <Detail key={path} id={match[1]} go={go} />
    );
  return <Alert>Página no encontrada.</Alert>;
}

function List({ go }: { go: (p: string) => void }) {
  const [filters, setFilters] = useState({
      q: "",
      estado: "Activa",
      tipoDeuda: "",
    }),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [data, setData] = useState<{ items: Debt[]; total: number } | null>(null),
    [error, setError] = useState<ApiError | null>(null);
  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    api(
      base +
        "?" +
        new URLSearchParams({ ...filters, page: String(page) }),
    )
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (!live) return;
        setError(failure(e));
      });
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  useEffect(() => {
    if (error && !Object.keys(error.fields).length) alert.current?.focus();
  }, [error]);
  const link = (d: Debt) => (
    <a
      href={base + "/" + d.id}
      onClick={(e) => {
        e.preventDefault();
        go(base + "/" + d.id);
      }}
    >
      {d.nombre}
    </a>
  );
  const columns: TableColumn<Debt>[] = [
    {
      id: "id",
      header: "ID",
      cell: (d) => <span className="debt-id">{d.id}</span>,
    },
    {
      id: "nombre",
      header: "Nombre",
      cell: (d) => (
        <>
          {link(d)}
          <small className="table-id">
            <Tag inactive={d.estado === "Inactiva"}>{d.estado}</Tag>
          </small>
          <button
            className="text-button debt-open"
            onClick={() => go(base + "/" + d.id)}
          >
            Ver ficha
          </button>
        </>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      cell: (d) => tipoDeuda(d.tipoDeuda),
    },
    {
      id: "inicio",
      header: "Inicio control",
      cell: (d) => fecha(d.inicioControl),
    },
    {
      id: "apertura",
      header: "Apertura",
      kind: "amount",
      cell: (d) => amount(d.capitalApertura),
    },
    {
      id: "viva",
      header: "Deuda viva",
      kind: "amount",
      cell: (d) =>
        d.capital.calculable
          ? amount(d.capital.deudaViva)
          : "No calculable",
    },
    {
      id: "conciliacion",
      header: "Conciliación",
      cell: (d) => (
        <>
          {conciliacionLabel(d.conciliacion)}
          {d.varias && <span className="e44-varias"> · Varias</span>}
        </>
      ),
    },
  ];
  return (
    <div className="deudas-page">
      <PageHead
        eyebrow="CAPITAL Y PAGOS"
        title="Deudas"
        description="Apertura, deuda viva y conciliación desde Inicio control"
      >
        <button className="primary" onClick={() => go(base + "/nueva")}>
          Nueva deuda
        </button>
      </PageHead>
      <section className="panel catalog-panel">
        <div className="filters debt-filters">
          <label className="search">
            Buscar nombre o ID
            <input
              type="search"
              value={filters.q}
              onChange={(e) => {
                setFilters((v) => ({ ...v, q: e.target.value }));
                setPage(1);
              }}
            />
          </label>
          <label>
            Estado de Deuda
            <select
              value={filters.estado}
              onChange={(e) => {
                setFilters((v) => ({ ...v, estado: e.target.value }));
                setPage(1);
              }}
            >
              <option>Activa</option>
              <option>Inactiva</option>
              <option value="">Todas</option>
            </select>
          </label>
          <label>
            Tipo de Deuda
            <select
              value={filters.tipoDeuda}
              onChange={(e) => {
                setFilters((v) => ({ ...v, tipoDeuda: e.target.value }));
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option>Hipotecaria</option>
              <option>No hipotecaria</option>
              <option value="Sin informar">Sin informar</option>
            </select>
          </label>
        </div>
        {error ? (
          <div tabIndex={-1} ref={alert} className="focus-alert">
            <Alert
              retry={
                retryable(error) ? () => setRetry((v) => v + 1) : undefined
              }
            >
              {failureText(error)}
            </Alert>
          </div>
        ) : !data ? (
          <Skeleton label="Cargando Deudas…" lines={5} />
        ) : !data.items.length ? (
          <div className="empty">
            <h2>Sin deudas que mostrar</h2>
            <p>
              Registra una deuda sin crear Saldos ni Movimientos de apertura.
            </p>
            <button className="primary" onClick={() => go(base + "/nueva")}>
              Registrar la primera deuda
            </button>
          </div>
        ) : (
          <>
            <p className="list-toolbar" role="status">
              {data.total} {data.total === 1 ? "deuda" : "deudas"}
            </p>
            <div className="desktop-list">
              <Table
                caption="Deudas"
                label="Tabla de Deudas"
                columns={columns}
                rows={data.items}
                rowKey={(d) => d.id}
                rowClassName={(d) =>
                  d.estado === "Inactiva" ? "ui-row-inactive" : undefined
                }
                tableClassName="debt-list"
              />
            </div>
            <DataList
              columns={columns}
              rows={data.items}
              rowKey={(d) => d.id}
              rowClassName={(d) =>
                d.estado === "Inactiva" ? "ui-row-inactive" : undefined
              }
              label="Deudas móvil"
              className="mobile-list debt-cards"
            />
          </>
        )}
        <div className="list-footer">
          <span>
            Página {page} · {data?.total ?? 0} registros
          </span>
          <div className="actions">
            <button
              className="text-button"
              disabled={page === 1 || !data}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </button>
            <button
              className="text-button"
              disabled={!data || page * 100 >= data.total}
              onClick={() => setPage((v) => v + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Detail({ id, go }: { id: string; go: (p: string) => void }) {
  const [data, setData] = useState<DetailData | null>(null),
    [error, setError] = useState<ApiError | null>(null),
    [retry, setRetry] = useState(0),
    [corte, setCorte] = useState(""),
    [corteDraft, setCorteDraft] = useState(""),
    [estadoForm, setEstadoForm] = useState(false),
    [estadoMotivo, setEstadoMotivo] = useState(""),
    [estadoField, setEstadoField] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState<Record<string, boolean>>(() => {
      const narrow =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 760px)").matches;
      return {
        control: true,
        condiciones: !narrow,
        historico: !narrow,
        historia: !narrow,
        conciliacion: !narrow,
      };
    }),
    [concCreate, setConcCreate] = useState(false),
    [concEdit, setConcEdit] = useState<string | null>(null),
    [concAnnul, setConcAnnul] = useState<string | null>(null),
    [concForm, setConcForm] = useState({
      fechaCorte: "",
      capitalDeclarado: "",
      fuente: "",
      nota: "",
    }),
    [concMotivo, setConcMotivo] = useState(""),
    [concFields, setConcFields] = useState<Record<string, string>>({});
  const alert = useRef<HTMLDivElement>(null),
    attempt = useRef(crypto.randomUUID()),
    estadoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    api(
      base +
        "/" +
        id +
        (corte ? "?corte=" + encodeURIComponent(corte) : ""),
    )
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (!live) return;
        const err = failure(e);
        setError(err);
        focusError(err.fields);
      });
    return () => {
      live = false;
    };
  }, [id, retry, corte]);
  useEffect(() => {
    if (error && !Object.keys(error.fields).length) alert.current?.focus();
  }, [error]);

  const reload = () => setRetry((v) => v + 1);
  const focusError = (fields: Record<string, string> = {}) => {
    const first = Object.keys(fields)[0];
    requestAnimationFrame(() => {
      const target = first ? document.getElementById("debt-" + first) : null;
      (target ?? alert.current)?.focus();
    });
  };

  async function changeState() {
    if (!data) return;
    if (!estadoMotivo.trim()) {
      setEstadoField("Indica el motivo del cambio de Estado.");
      requestAnimationFrame(() => estadoRef.current?.focus());
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(
        base +
          "/" +
          id +
          (data.item.estado === "Activa" ? "/desactivar" : "/reactivar"),
        "POST",
        {
          revision: data.item.revision,
          motivo: estadoMotivo.trim(),
        },
      );
      setEstadoForm(false);
      setEstadoMotivo("");
      setEstadoField("");
      reload();
    } catch (e) {
      setError(failure(e));
      requestAnimationFrame(() => alert.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setConcCreate(true);
    setConcEdit(null);
    setConcAnnul(null);
    setError(null);
    setConcForm({
      fechaCorte: "",
      capitalDeclarado: "",
      fuente: "",
      nota: "",
    });
    setConcMotivo("");
    setConcFields({});
    setOpen((v) => ({ ...v, conciliacion: true }));
  }

  function openEdit(c: Conciliacion) {
    setConcCreate(false);
    setConcAnnul(null);
    setConcEdit(c.id);
    setError(null);
    setConcForm({
      fechaCorte: c.fechaCorte,
      capitalDeclarado: c.capitalDeclarado,
      fuente: c.fuente ?? "",
      nota: c.nota ?? "",
    });
    setConcMotivo("");
    setConcFields({});
    setOpen((v) => ({ ...v, conciliacion: true }));
  }

  function openAnnul(c: Conciliacion) {
    setConcCreate(false);
    setConcEdit(null);
    setConcAnnul(c.id);
    setError(null);
    setConcMotivo("");
    setConcFields({});
    setOpen((v) => ({ ...v, conciliacion: true }));
  }

  const body = (withMotivo: boolean) => ({
    fechaCorte: concForm.fechaCorte,
    capitalDeclarado: normalizeAmount(concForm.capitalDeclarado),
    fuente: concForm.fuente.trim() || null,
    nota: concForm.nota.trim() || null,
    ...(withMotivo ? { motivo: concMotivo } : {}),
  });

  async function createConciliacion() {
    setBusy(true);
    setError(null);
    setConcFields({});
    try {
      await api(
        base + "/" + id + "/conciliaciones",
        "POST",
        body(false),
        { "idempotency-key": attempt.current },
      );
      attempt.current = crypto.randomUUID();
      setConcCreate(false);
      setConcForm({
        fechaCorte: "",
        capitalDeclarado: "",
        fuente: "",
        nota: "",
      });
      reload();
    } catch (e) {
      const err = failure(e);
      setError(err);
      setConcFields(err.fields ?? {});
      focusError(err.fields);
    } finally {
      setBusy(false);
    }
  }

  async function saveConciliacion(c: Conciliacion) {
    setBusy(true);
    setError(null);
    setConcFields({});
    try {
      await api(
        base + "/" + id + "/conciliaciones/" + c.id,
        "PATCH",
        { revision: c.revision, ...body(true) },
      );
      setConcEdit(null);
      setConcMotivo("");
      reload();
    } catch (e) {
      const err = failure(e);
      setError(err);
      setConcFields(err.fields ?? {});
      focusError(err.fields);
    } finally {
      setBusy(false);
    }
  }

  async function annulConciliacion(c: Conciliacion) {
    setBusy(true);
    setError(null);
    setConcFields({});
    try {
      await api(
        base + "/" + id + "/conciliaciones/" + c.id,
        "PATCH",
        { revision: c.revision, motivo: concMotivo, estado: "Anulada" },
      );
      setConcAnnul(null);
      setConcMotivo("");
      reload();
    } catch (e) {
      const err = failure(e);
      setError(err);
      setConcFields(err.fields ?? {});
      focusError(err.fields);
    } finally {
      setBusy(false);
    }
  }

  const d = data?.item;
  const vigentes =
    d?.conciliaciones.filter((c) => c.estado === "Vigente") ?? [];
  const r5Fields: [string, string | null][] = d
    ? [
        ["Capital inicial", d.historico.capitalInicial],
        ["Amortizado histórico", d.historico.capitalAmortizadoHistorico],
        ["Extra histórica", d.historico.amortizacionExtraHistorica],
        ["Capital histórico en cuotas", d.historico.capitalHistoricoCuotas],
        ["Intereses históricos", d.historico.interesesHistoricos],
        ["Total pagado histórico", d.historico.totalPagadoHistorico],
      ]
    : [];
  const r5Count = r5Fields.filter(([, value]) => value !== null).length;
  const historyColumns: TableColumn<HistoriaDeuda>[] = [
    { id: "fecha", header: "Fecha", cell: (h) => fecha(h.fecha) },
    {
      id: "tipo",
      header: "Tipo",
      cell: (h) => (
        <>
          {h.tipo}
          {h.estado === "Anulado" && " · Anulado"}
        </>
      ),
      cardCell: (h) => (
        <>
          {h.tipo}
          {h.estado === "Anulado" && (
            <>
              {" "}
              <Tag inactive>Anulado</Tag>
            </>
          )}
        </>
      ),
    },
    {
      id: "total",
      header: "Total",
      kind: "amount",
      cell: (h) => eur(h.total),
    },
    {
      id: "capital",
      header: "Capital",
      kind: "amount",
      cell: (h) => amount(h.capital, "No verificable"),
    },
    {
      id: "intereses",
      header: "Intereses",
      kind: "amount",
      cell: (h) => amount(h.intereses, "No verificable"),
    },
    {
      id: "banco",
      header: "Banco",
      kind: "amount",
      cell: (h) => eur(h.efectoBanco),
    },
    {
      id: "aplica",
      header: "Aplica",
      cell: (h) => (h.aplicaAlCapital ? "Sí" : "No"),
    },
    {
      id: "movimiento",
      header: "Movimiento",
      kind: "actions",
      cell: (h) => (
        <a
          href={"/movimientos/" + h.movimiento}
          onClick={(e) => {
            e.preventDefault();
            go("/movimientos/" + h.movimiento);
          }}
        >
          {h.movimiento}
        </a>
      ),
    },
  ];

  return (
    <div className="reference-detail debt-detail">
      <button className="text-button" onClick={() => go(base)}>
        Volver a Deudas
      </button>
      {error && (
        <div tabIndex={-1} ref={alert} className="focus-alert">
          <Alert retry={retryable(error) ? reload : undefined}>
            {failureText(error)}
          </Alert>
        </div>
      )}
      {!data ? (
        !error && <Skeleton label="Cargando Deuda…" lines={6} />
      ) : (
        <>
          <PageHead
            eyebrow={`${id} · ${tipoDeuda(d!.tipoDeuda)} · ${d!.estado}`}
            title={d!.nombre}
            description="Capital pendiente · no es un Saldo bancario"
          >
            <Tag inactive={d!.estado === "Inactiva"}>{d!.estado}</Tag>
            <button
              className="secondary"
              onClick={() => go(base + "/" + id + "/editar")}
            >
              Editar deuda
            </button>
            <button
              className="secondary"
              onClick={() => {
                setEstadoForm((v) => !v);
                setEstadoField("");
              }}
            >
              {d!.estado === "Activa" ? "Desactivar deuda" : "Reactivar deuda"}
            </button>
          </PageHead>

          <div className="actions e44-debt-actions">
            <button
              className="secondary"
              onClick={() => go("/movimientos?deuda=" + id)}
            >
              Consultar movimientos de esta deuda
            </button>
          </div>

          {estadoForm && (
            <section className="panel e44-state-panel" aria-label="Cambio de Estado">
              <h2>
                {d!.estado === "Activa" ? "Desactivar" : "Reactivar"} {id}
              </h2>
              <p>
                El cambio exige revisión vigente y motivo. No borra la historia
                ni los hechos vinculados.
              </p>
              <label>
                Motivo del cambio *
                <input
                  ref={estadoRef}
                  id="debt-motivo-estado"
                  value={estadoMotivo}
                  maxLength={1000}
                  aria-invalid={!!estadoField}
                  aria-describedby={
                    estadoField ? "debt-motivo-estado-error" : undefined
                  }
                  onChange={(e) => {
                    setEstadoMotivo(e.target.value);
                    setEstadoField("");
                  }}
                />
                {estadoField && (
                  <span id="debt-motivo-estado-error" className="field-error">
                    {estadoField}
                  </span>
                )}
              </label>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setEstadoForm(false)}
                >
                  Cancelar cambio de Estado
                </button>
                <button
                  className={d!.estado === "Activa" ? "secondary" : "primary"}
                  disabled={busy}
                  onClick={changeState}
                >
                  {busy
                    ? "Guardando…"
                    : `Confirmar ${d!.estado === "Activa" ? "desactivar" : "reactivar"}`}
                </button>
              </div>
            </section>
          )}

          <Section
            id="control"
            title="Control y capital"
            open={open.control}
            onToggle={() => setOpen((v) => ({ ...v, control: !v.control }))}
          >
            <form
              className="e44-corte"
              onSubmit={(e) => {
                e.preventDefault();
                setCorte(corteDraft);
                if (corteDraft === corte) reload();
              }}
            >
              <label>
                Corte histórico
                <input
                  type="date"
                  id="debt-corte"
                  value={corteDraft}
                  onChange={(e) => setCorteDraft(e.target.value)}
                />
              </label>
              <div className="actions">
                <button className="secondary" type="submit">
                  Aplicar corte
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setCorteDraft("");
                    setCorte("");
                    reload();
                  }}
                >
                  Todos los hechos
                </button>
              </div>
            </form>
            <dl className="e44-facts">
              <div>
                <dt>Inicio control</dt>
                <dd>{fecha(d!.control.inicio)}</dd>
              </div>
              <div>
                <dt>Capital apertura</dt>
                <dd>{amount(d!.control.capitalApertura)}</dd>
              </div>
              <div>
                <dt>Capital de control</dt>
                <dd>{amount(d!.control.capitalControl)}</dd>
              </div>
              <div>
                <dt>Corte aplicado</dt>
                <dd>{d!.corte ? fecha(d!.corte) : "Todos los hechos"}</dd>
              </div>
              <div>
                <dt>Cobertura</dt>
                <dd>
                  {d!.capital.calculable
                    ? d!.cobertura.desgloseVerificable
                      ? "Verificable"
                      : "Parcial"
                    : "No calculable"}
                </dd>
              </div>
              <div>
                <dt>Capital aplicado</dt>
                <dd>
                  {d!.capital.calculable
                    ? amount(d!.capital.aplicado)
                    : "No calculable"}
                </dd>
              </div>
              <div>
                <dt>Deuda viva</dt>
                <dd className="e44-money">
                  {d!.capital.calculable
                    ? amount(d!.capital.deudaViva)
                    : "No calculable"}
                </dd>
              </div>
              <div>
                <dt>Hechos aplicables</dt>
                <dd>{d!.cobertura.hechosAplicables}</dd>
              </div>
              <div>
                <dt>Excluidos por corte</dt>
                <dd>{d!.cobertura.hechosExcluidosPorCorte}</dd>
              </div>
              <div>
                <dt>Anulados</dt>
                <dd>{d!.cobertura.hechosAnulados}</dd>
              </div>
            </dl>
            <p className="e44-coverage">
              {d!.cobertura.desdeControl
                ? "Desde control"
                : "Antes del Inicio control"}{" "}
              · {d!.cobertura.incluyePrecontrol
                ? "incluye precontrol"
                : "sin precontrol"}{" "}
              · {d!.cobertura.hastaCorte ? "hasta el corte" : "sin corte"}
            </p>
            {!d!.capital.calculable && (
              <p className="e44-warning" role="status">
                No calculable: {d!.capital.motivoNoCalculable}
                {d!.capital.hechosInvalidos.length > 0 &&
                  ` Movimientos: ${d!.capital.hechosInvalidos.join(", ")}.`}
              </p>
            )}
            <p className="help">
              No incluye intereses futuros, comisiones ni saldo bancario. El
              corte es inclusivo y no crea una fotografía persistida.
            </p>
          </Section>

          <Section
            id="condiciones"
            title="Condiciones informativas"
            count={
              [d!.condiciones.tin, d!.condiciones.tae, d!.condiciones.cuotaContractual].filter(
                (v) => v !== null,
              ).length
            }
            open={open.condiciones}
            onToggle={() =>
              setOpen((v) => ({ ...v, condiciones: !v.condiciones }))
            }
          >
            <dl className="e44-facts">
              <div>
                <dt>TIN</dt>
                <dd>{rate(d!.condiciones.tin)}</dd>
              </div>
              <div>
                <dt>TAE</dt>
                <dd>{rate(d!.condiciones.tae)}</dd>
              </div>
              <div>
                <dt>Cuota contractual</dt>
                <dd>{amount(d!.condiciones.cuotaContractual)}</dd>
              </div>
            </dl>
            <p>
              <strong>Condiciones:</strong>{" "}
              {d!.condiciones.texto ?? "Sin informar"}
            </p>
            <p className="help">
              Valores informativos: no calculan intereses, cuotas, fechas ni
              cuadros de amortización. Una condición desconocida no es cero.
            </p>
          </Section>

          <Section
            id="historico"
            title="Histórico R5"
            count={r5Count}
            hint="solo lectura"
            open={open.historico}
            onToggle={() => setOpen((v) => ({ ...v, historico: !v.historico }))}
          >
            <dl className="e44-facts">
              {r5Fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{amount(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="e44-precontrol">
              {d!.historico.precontrol === null ? (
                <p>Sin histórico precontrol aportado.</p>
              ) : (
                <p>
                  <strong>
                    Precontrol {d!.historico.precontrol.ejercicio ?? ""} (R5):
                  </strong>{" "}
                  cuotas {d!.historico.precontrol.cuotas ?? "Sin informar"} ·
                  capital {amount(d!.historico.precontrol.capital)} ·
                  amortización extra{" "}
                  {amount(d!.historico.precontrol.amortizacionExtra)}
                </p>
              )}
            </div>
            <div className="e44-check">
              <p>
                <strong>Comprobación histórica:</strong>{" "}
                {d!.historico.comprobacion.capital.estado}
                {d!.historico.comprobacion.capital.aplicable &&
                  d!.historico.comprobacion.capital.diferencia !== null && (
                    <>
                      {" · "}
                      {centsOf(d!.historico.comprobacion.capital.diferencia) ===
                      0n
                        ? "sin diferencias"
                        : "diferencia " +
                          signed(d!.historico.comprobacion.capital.diferencia)}
                    </>
                  )}
                {d!.historico.comprobacion.capital.motivo &&
                  ` · ${d!.historico.comprobacion.capital.motivo}`}
              </p>
              <p className="help">
                {d!.historico.comprobacion.cuotas.estado}:{" "}
                {d!.historico.comprobacion.cuotas.motivo}
              </p>
            </div>
            <p className="help">
              El agregado R5 no reconstruye filas ni reduce el capital actual.
            </p>
          </Section>

          <Section
            id="historia"
            title="Historia ejecutada"
            count={d!.historia.filter((h) => h.estado === "Vigente").length}
            open={open.historia}
            onToggle={() => setOpen((v) => ({ ...v, historia: !v.historia }))}
          >
            {!d!.historia.length ? (
              <p>Sin historia ejecutada registrada.</p>
            ) : (
              <>
                <div className="desktop-list e44-history-desktop">
                  <Table
                    caption="Historia ejecutada de la Deuda"
                    label="Tabla de historia ejecutada"
                    columns={historyColumns}
                    rows={d!.historia}
                    rowKey={(h) => h.movimiento}
                    rowClassName={(h) =>
                      h.estado === "Anulado" ? "annulled" : undefined
                    }
                  />
                </div>
                <DataList
                  columns={historyColumns}
                  rows={d!.historia}
                  rowKey={(h) => h.movimiento}
                  rowClassName={(h) =>
                    h.estado === "Anulado" ? "annulled" : undefined
                  }
                  label="Historia ejecutada móvil"
                  className="e44-history-mobile"
                />
              </>
            )}
            <p className="e44-totals">
              Totales desde control: capital{" "}
              {amount(d!.totales.capital, "No calculable")} · intereses{" "}
              {amount(d!.totales.intereses, "No calculable")} · gasto{" "}
              {eur(d!.totales.gasto)} · banco {eur(d!.totales.banco)}
            </p>
            <p className="e44-annulled">Anulados: {d!.totales.anulados}</p>
          </Section>

          <Section
            id="conciliacion"
            title="Conciliación desde apertura"
            count={vigentes.length}
            hint={d!.varias ? "Varias" : undefined}
            open={open.conciliacion}
            onToggle={() =>
              setOpen((v) => ({ ...v, conciliacion: !v.conciliacion }))
            }
          >
            <div className="actions e44-conciliation-actions">
              <button className="secondary" onClick={openCreate}>
                Nueva conciliación
              </button>
            </div>
            {!d!.conciliaciones.length ? (
              <p>Sin declarado. Puedes registrar un saldo externo opcional.</p>
            ) : (
              <ul className="e44-conciliation-list">
                {d!.conciliaciones.map((c) => {
                  const derivado = derivedAt(c);
                  return (
                    <li
                      key={c.id}
                      className={
                        "e44-conciliation " +
                        (c.estado === "Anulada" ? "annulled" : "")
                      }
                    >
                      <div className="card-head">
                        <h3>
                          {fecha(c.fechaCorte)} · {c.estado}
                        </h3>
                        <Tag inactive={c.estado === "Anulada"}>
                          {c.estadoConciliacion}
                        </Tag>
                      </div>
                      <dl className="e44-facts">
                        <div>
                          <dt>Declarado</dt>
                          <dd>{eur(c.capitalDeclarado)}</dd>
                        </div>
                        <div>
                          <dt>Derivado</dt>
                          <dd>
                            {derivado === null
                              ? "No calculable"
                              : eur(derivado)}
                          </dd>
                        </div>
                        <div>
                          <dt>Diferencia</dt>
                          <dd className="e44-money">
                            {c.diferencia === null
                              ? "No comparable"
                              : signed(c.diferencia)}
                          </dd>
                        </div>
                        <div>
                          <dt>Fuente</dt>
                          <dd>{c.fuente ?? "Sin informar"}</dd>
                        </div>
                        <div>
                          <dt>Nota</dt>
                          <dd>{c.nota ?? "Sin informar"}</dd>
                        </div>
                        <div>
                          <dt>Revisión</dt>
                          <dd>{c.revision}</dd>
                        </div>
                      </dl>
                      {c.motivoNoComparable && (
                        <p className="e44-warning">
                          No comparable: {c.motivoNoComparable}
                        </p>
                      )}
                      <p className="help">
                        No crea Movimiento ni ajuste de capital.
                      </p>
                      {c.estado === "Vigente" && (
                        <div className="actions">
                          <button
                            className="secondary"
                            onClick={() => openEdit(c)}
                          >
                            Corregir declarado
                          </button>
                          <button
                            className="secondary"
                            onClick={() => openAnnul(c)}
                          >
                            Anular
                          </button>
                        </div>
                      )}
                      {concEdit === c.id && (
                        <div className="e44-inline-form" role="group" aria-label="Corregir conciliación">
                          <ConciliationFields
                            value={concForm}
                            fields={concFields}
                            onChange={(patch) =>
                              setConcForm((v) => ({ ...v, ...patch }))
                            }
                          />
                          <label>
                            Motivo de la corrección *
                            <textarea
                              id="debt-motivo"
                              value={concMotivo}
                              maxLength={1000}
                              aria-invalid={!!concFields.motivo}
                              aria-describedby={
                                concFields.motivo ? "debt-motivo-error" : undefined
                              }
                              onChange={(e) => {
                                setConcMotivo(e.target.value);
                                setConcFields((v) => ({ ...v, motivo: "" }));
                              }}
                            />
                            {concFields.motivo && (
                              <span id="debt-motivo-error" className="field-error">
                                {concFields.motivo}
                              </span>
                            )}
                          </label>
                          <div className="actions">
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => {
                                setConcEdit(null);
                                setConcMotivo("");
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() => saveConciliacion(c)}
                            >
                              Guardar corrección
                            </button>
                          </div>
                        </div>
                      )}
                      {concAnnul === c.id && (
                        <div className="e44-inline-form" role="group" aria-label="Anular conciliación">
                          <p>
                            Anular conserva el registro y lo excluye de la
                            vista vigente. No hay borrado.
                          </p>
                          <label>
                            Motivo de la anulación *
                            <textarea
                              id="debt-motivo"
                              value={concMotivo}
                              maxLength={1000}
                              aria-invalid={!!concFields.motivo}
                              aria-describedby={
                                concFields.motivo
                                  ? "debt-motivo-anulacion-error"
                                  : undefined
                              }
                              onChange={(e) => {
                                setConcMotivo(e.target.value);
                                setConcFields((v) => ({ ...v, motivo: "" }));
                              }}
                            />
                            {concFields.motivo && (
                              <span
                                id="debt-motivo-anulacion-error"
                                className="field-error"
                              >
                                {concFields.motivo}
                              </span>
                            )}
                          </label>
                          <div className="actions">
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => {
                                setConcAnnul(null);
                                setConcMotivo("");
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => annulConciliacion(c)}
                            >
                              Confirmar anulación
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {concCreate && (
              <div className="e44-inline-form" role="group" aria-label="Nueva conciliación">
                <h3>Nueva conciliación</h3>
                <ConciliationFields
                  value={concForm}
                  fields={concFields}
                  onChange={(patch) =>
                    setConcForm((v) => ({ ...v, ...patch }))
                  }
                />
                <div className="actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setConcCreate(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={createConciliacion}
                  >
                    {busy ? "Guardando…" : "Registrar declarado"}
                  </button>
                </div>
              </div>
            )}
            <p className="help">
              La diferencia es exacta y con signo: declarado − deuda viva en la
              fecha de corte. No se compensa ni se crea un ajuste.
            </p>
          </Section>

          <section className="panel e44-partidas">
            <h2>Partidas vinculadas</h2>
            {!data!.partidas.length ? (
              <p>Sin Partidas vinculadas.</p>
            ) : (
              <ul>
                {data!.partidas.map((p) => (
                  <li key={p.id}>
                    <a
                      href={"/clasificacion/partidas/" + p.id}
                      onClick={(e) => {
                        e.preventDefault();
                        go("/clasificacion/partidas/" + p.id);
                      }}
                    >
                      {p.id} · {p.nombre}
                    </a>{" "}
                    · {p.estado}
                  </li>
                ))}
              </ul>
            )}
            <button
              className="secondary"
              onClick={() => go("/clasificacion/partidas")}
            >
              Configurar Partidas
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function ConciliationFields({
  value,
  fields,
  onChange,
}: {
  value: {
    fechaCorte: string;
    capitalDeclarado: string;
    fuente: string;
    nota: string;
  };
  fields: Record<string, string>;
  onChange: (patch: Partial<typeof value>) => void;
}) {
  const error = (key: string) =>
    fields[key] ? (
      <span id={"debt-conc-" + key + "-error"} className="field-error">
        {fields[key]}
      </span>
    ) : null;
  return (
    <div className="form-grid">
      <label>
        Fecha de corte *
        <input
          id="debt-fechaCorte"
          type="date"
          value={value.fechaCorte}
          aria-invalid={!!fields.fechaCorte}
          aria-describedby={
            fields.fechaCorte ? "debt-conc-fechaCorte-error" : undefined
          }
          onChange={(e) => onChange({ fechaCorte: e.target.value })}
        />
        {error("fechaCorte")}
      </label>
      <label>
        Capital declarado EUR *
        <input
          id="debt-capitalDeclarado"
          inputMode="decimal"
          value={value.capitalDeclarado}
          aria-invalid={!!fields.capitalDeclarado}
          aria-describedby={
            fields.capitalDeclarado
              ? "debt-conc-capitalDeclarado-error"
              : undefined
          }
          onChange={(e) => onChange({ capitalDeclarado: e.target.value })}
        />
        {error("capitalDeclarado")}
      </label>
      <label>
        Fuente
        <input
          id="debt-fuente"
          value={value.fuente}
          maxLength={200}
          aria-invalid={!!fields.fuente}
          aria-describedby={
            fields.fuente ? "debt-conc-fuente-error" : undefined
          }
          onChange={(e) => onChange({ fuente: e.target.value })}
        />
        {error("fuente")}
      </label>
      <label className="full-width">
        Nota
        <textarea
          id="debt-nota"
          value={value.nota}
          maxLength={1000}
          aria-invalid={!!fields.nota}
          aria-describedby={
            fields.nota ? "debt-conc-nota-error" : undefined
          }
          onChange={(e) => onChange({ nota: e.target.value })}
        />
        {error("nota")}
      </label>
    </div>
  );
}

function Form({ id, go }: { id?: string; go: (p: string) => void }) {
  const [data, setData] = useState<DetailData | null>(null),
    [form, setForm] = useState({
      nombre: "",
      inicioControl: "",
      capitalApertura: "",
      tipoDeuda: "",
      tin: "",
      tae: "",
      cuotaContractual: "",
      condiciones: "",
      motivo: "",
    }),
    [error, setError] = useState<ApiError | null>(null),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [conflict, setConflict] = useState(false);
  const initialized = useRef(false),
    attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    setError(null);
    api(base + "/" + id)
      .then((d) => {
        if (!live) return;
        setData(d);
        if (!initialized.current) {
          setForm({
            nombre: d.item.nombre,
            inicioControl: d.item.inicioControl ?? "",
            capitalApertura: d.item.capitalApertura ?? "",
            tipoDeuda: d.item.tipoDeuda ?? "",
            tin: d.item.condiciones.tin ?? "",
            tae: d.item.condiciones.tae ?? "",
            cuotaContractual: d.item.condiciones.cuotaContractual ?? "",
            condiciones: d.item.condiciones.texto ?? "",
            motivo: "",
          });
          initialized.current = true;
        }
        setConflict(false);
        setError(null);
      })
      .catch((e) => {
        if (!live) return;
        setError(failure(e));
      });
    return () => {
      live = false;
    };
  }, [id, retry]);
  useEffect(() => {
    if (error && !Object.keys(error.fields).length) alert.current?.focus();
  }, [error]);
  const back = () =>
    go(
      !id && referenceReturn
        ? referenceReturn.path
        : id
          ? base + "/" + id
          : base,
    );
  async function save() {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const normalizedTipo = form.tipoDeuda || null,
        normalizedTin = form.tin.trim() || null,
        normalizedTae = form.tae.trim() || null,
        normalizedCuota = form.cuotaContractual.trim()
          ? normalizeAmount(form.cuotaContractual)
          : null,
        normalizedTexto = form.condiciones.trim()
          ? form.condiciones
          : null,
        payload: Record<string, unknown> = { nombre: form.nombre };
      if (!id) {
        payload.inicioControl = form.inicioControl;
        payload.capitalApertura = normalizeAmount(form.capitalApertura);
        if (normalizedTipo !== null) payload.tipoDeuda = normalizedTipo;
        if (normalizedTin !== null) payload.tin = normalizedTin;
        if (normalizedTae !== null) payload.tae = normalizedTae;
        if (normalizedCuota !== null) payload.cuotaContractual = normalizedCuota;
        if (normalizedTexto !== null) payload.condiciones = normalizedTexto;
      } else {
        const item = data!.item;
        payload.revision = item.revision;
        if (form.inicioControl !== (item.inicioControl ?? ""))
          payload.inicioControl = form.inicioControl;
        if (
          normalizeAmount(form.capitalApertura) !==
          (item.capitalApertura ?? "")
        )
          payload.capitalApertura = normalizeAmount(form.capitalApertura);
        if (normalizedTipo !== item.tipoDeuda) payload.tipoDeuda = normalizedTipo;
        if (normalizedTin !== item.condiciones.tin) payload.tin = normalizedTin;
        if (normalizedTae !== item.condiciones.tae) payload.tae = normalizedTae;
        if (normalizedCuota !== item.condiciones.cuotaContractual)
          payload.cuotaContractual = normalizedCuota;
        if (normalizedTexto !== item.condiciones.texto)
          payload.condiciones = normalizedTexto;
        if (form.motivo.trim()) payload.motivo = form.motivo.trim();
      }
      const r = await api(
        base + (id ? "/" + id : ""),
        id ? "PATCH" : "POST",
        payload,
        id ? {} : { "idempotency-key": attempt.current },
      );
      go(
        !id && referenceReturn ? referenceReturn.path : base + "/" + r.item.id,
      );
    } catch (e) {
      const err = failure(e);
      setError(err);
      setFields(err.fields ?? {});
      setConflict(err.status === 409);
      const first = Object.keys(err.fields ?? {})[0];
      requestAnimationFrame(() => {
        if (first) document.getElementById("debt-" + first)?.focus();
        else alert.current?.focus();
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="deuda-form-page">
      <PageHead
        eyebrow={id ?? "NUEVA DEUDA"}
        title={id ? "Editar deuda" : "Nueva deuda"}
        description="Sin hechos automáticos ni cuotas programadas"
      />
      {error && (
        <div tabIndex={-1} ref={alert} className="focus-alert">
          <Alert
            retry={
              !!id && !data && retryable(error)
                ? () => setRetry((v) => v + 1)
                : undefined
            }
          >
            {failureText(error)}
            {conflict && (
              <button
                className="secondary"
                onClick={() => {
                  setError(null);
                  setRetry((v) => v + 1);
                }}
              >
                Actualizar contexto
              </button>
            )}
          </Alert>
        </div>
      )}
      {id && !data ? (
        !error && <Skeleton label="Cargando Deuda…" lines={6} />
      ) : (
        <form
          className="saldo-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <section className="panel">
            <h2>Identificación y apertura</h2>
            {id && <p>ID inmutable: {id}</p>}
            <div className="form-grid">
              {(["nombre", "inicioControl", "capitalApertura"] as const).map(
                (k) => (
                  <label key={k}>
                    {k === "nombre"
                      ? "Nombre de Deuda *"
                      : k === "inicioControl"
                        ? "Inicio control *"
                        : "Capital apertura EUR *"}
                    <input
                      id={"debt-" + k}
                      aria-label={
                        k === "nombre"
                          ? "Nombre de Deuda *"
                          : k === "inicioControl"
                            ? "Inicio control *"
                            : "Capital apertura EUR *"
                      }
                      type={k === "inicioControl" ? "date" : "text"}
                      inputMode={
                        k === "capitalApertura" ? "decimal" : undefined
                      }
                      value={form[k]}
                      maxLength={k === "nombre" ? 120 : undefined}
                      disabled={k !== "nombre" && !!data?.usos.length}
                      aria-invalid={!!fields[k]}
                      aria-describedby={
                        fields[k] ? "debt-" + k + "-error" : undefined
                      }
                      onChange={(e) => {
                        setForm((v) => ({ ...v, [k]: e.target.value }));
                        attempt.current = crypto.randomUUID();
                        setError(null);
                        setFields((v) => ({ ...v, [k]: "" }));
                      }}
                    />
                    {fields[k] && (
                      <span id={"debt-" + k + "-error"} className="field-error">
                        {fields[k]}
                      </span>
                    )}
                  </label>
                ),
              )}
            </div>
            <p className="help">
              Apertura explícita, sin precargar cero. Inicio control y apertura
              quedan protegidos cuando la Deuda tiene movimientos, incluidos
              anulados. No se exige Fecha inicio deuda ni TIN/TAE.
            </p>
          </section>

          <section className="panel">
            <h2>Tipo y condiciones informativas</h2>
            <div className="form-grid">
              <label>
                Tipo de Deuda
                <select
                  id="debt-tipoDeuda"
                  value={form.tipoDeuda}
                  aria-invalid={!!fields.tipoDeuda}
                  aria-describedby={
                    fields.tipoDeuda ? "debt-tipoDeuda-error" : undefined
                  }
                  onChange={(e) => {
                    setForm((v) => ({ ...v, tipoDeuda: e.target.value }));
                    setFields((v) => ({ ...v, tipoDeuda: "" }));
                  }}
                >
                  <option value="">Sin informar</option>
                  <option>Hipotecaria</option>
                  <option>No hipotecaria</option>
                </select>
                {fields.tipoDeuda && (
                  <span id="debt-tipoDeuda-error" className="field-error">
                    {fields.tipoDeuda}
                  </span>
                )}
              </label>
              <label>
                TIN %
                <input
                  id="debt-tin"
                  inputMode="decimal"
                  value={form.tin}
                  aria-invalid={!!fields.tin}
                  aria-describedby={fields.tin ? "debt-tin-error" : undefined}
                  onChange={(e) => {
                    setForm((v) => ({ ...v, tin: e.target.value }));
                    setFields((v) => ({ ...v, tin: "" }));
                  }}
                />
                {fields.tin && (
                  <span id="debt-tin-error" className="field-error">
                    {fields.tin}
                  </span>
                )}
              </label>
              <label>
                TAE %
                <input
                  id="debt-tae"
                  inputMode="decimal"
                  value={form.tae}
                  aria-invalid={!!fields.tae}
                  aria-describedby={fields.tae ? "debt-tae-error" : undefined}
                  onChange={(e) => {
                    setForm((v) => ({ ...v, tae: e.target.value }));
                    setFields((v) => ({ ...v, tae: "" }));
                  }}
                />
                {fields.tae && (
                  <span id="debt-tae-error" className="field-error">
                    {fields.tae}
                  </span>
                )}
              </label>
              <label>
                Cuota contractual EUR
                <input
                  id="debt-cuotaContractual"
                  inputMode="decimal"
                  value={form.cuotaContractual}
                  aria-invalid={!!fields.cuotaContractual}
                  aria-describedby={
                    fields.cuotaContractual
                      ? "debt-cuotaContractual-error"
                      : undefined
                  }
                  onChange={(e) => {
                    setForm((v) => ({
                      ...v,
                      cuotaContractual: e.target.value,
                    }));
                    setFields((v) => ({ ...v, cuotaContractual: "" }));
                  }}
                />
                {fields.cuotaContractual && (
                  <span
                    id="debt-cuotaContractual-error"
                    className="field-error"
                  >
                    {fields.cuotaContractual}
                  </span>
                )}
              </label>
              <label className="full-width">
                Condiciones informativas
                <textarea
                  id="debt-condiciones"
                  value={form.condiciones}
                  maxLength={1000}
                  aria-invalid={!!fields.condiciones}
                  aria-describedby={
                    fields.condiciones ? "debt-condiciones-error" : undefined
                  }
                  onChange={(e) => {
                    setForm((v) => ({ ...v, condiciones: e.target.value }));
                    setFields((v) => ({ ...v, condiciones: "" }));
                  }}
                />
                {fields.condiciones && (
                  <span id="debt-condiciones-error" className="field-error">
                    {fields.condiciones}
                  </span>
                )}
              </label>
              {id && (
                <label className="full-width">
                  Motivo del cambio
                  <textarea
                    id="debt-motivo"
                    value={form.motivo}
                    maxLength={1000}
                    aria-invalid={!!fields.motivo}
                    aria-describedby={
                      fields.motivo ? "debt-motivo-error" : undefined
                    }
                    onChange={(e) => {
                      setForm((v) => ({ ...v, motivo: e.target.value }));
                      setFields((v) => ({ ...v, motivo: "" }));
                    }}
                  />
                  {fields.motivo && (
                    <span id="debt-motivo-error" className="field-error">
                      {fields.motivo}
                    </span>
                  )}
                </label>
              )}
            </div>
            <p className="help">
              TIN, TAE, cuota y condiciones son informativos: no calculan
              intereses, cuotas ni cuadros. El motivo es obligatorio al
              corregir un tipo o condición ya informados. El histórico y el
              precontrol R5 no se editan en esta pantalla.
            </p>
          </section>
          <div className="form-footer">
            <span>Estado inicial Activa · EUR exacto</span>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={back}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy || conflict}>
                {busy ? "Guardando…" : "Guardar deuda"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
