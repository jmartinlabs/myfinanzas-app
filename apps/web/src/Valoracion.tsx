import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, eur } from "./api";
import {
  Alert,
  DataList,
  Field,
  focusFirstInvalidField,
  FormGrid,
  FormSection,
  PageHead,
  Table,
  Tag,
  type TableColumn,
} from "./ui";

export const VALORACION_BASE = "/inversiones/valoracion";

type ValoracionDto = {
  id: string | null;
  revision: number | null;
  estado: "Disponible" | "No disponible" | "No aplica";
  motivo?: string;
  fecha: string | null;
  diasTranscurridos: number | null;
  valorEur: string | null;
  tipo: "Manual" | "Automática" | null;
  precio: string | null;
  divisa: string | null;
  cambio: string | null;
  cantidadBase: string | null;
  cantidadAlCorte: string | null;
  procedencia: string | null;
  cobertura: string;
  elegibilidadFechaExacta: string | null;
};
type Resultado = {
  estado: "Disponible" | "No disponible";
  importeEur?: string;
  motivo?: string;
};
type Posicion = {
  saldoInversion: { id: string; nombre: string };
  instrumento: { id: string; nombre: string; estado: string };
  cantidad: string;
  estado: "Abierta" | "Cerrada" | "No aplica";
  tipoValoracion: string | null;
  valoracion: ValoracionDto | null;
  resultado: Resultado;
  rentabilidad: { estado: string; motivo: string };
};
type Efectivo = {
  saldo: { id: string; nombre: string; tipo: string; control: string };
  fecha: string;
  vista: string;
  disponible: string;
  condicion: string;
  nota?: string;
};
type Corte = {
  corte: string;
  posiciones: Posicion[];
  agregado: {
    coberturaValoracion: string;
    valorEur: string | null;
    coberturaResultado: string;
    resultadoEur: string | null;
    elegibilidadFechaExacta: string;
  };
  efectivo: Efectivo[];
  coberturaHistorica: string;
};
type Detalle = Posicion & { serie: ValoracionDto[] };
type AuditRow = {
  revision: number;
  accion: string;
  motivo: string | null;
  instante: string;
  actor: string;
  anterior: unknown;
  posterior: unknown;
};
type Ficha = {
  valoracion: ValoracionDto;
  posicion: {
    saldo: { id: string; nombre: string; estado: string };
    instrumento: { id: string; nombre: string; estado: string };
  };
  auditoria: AuditRow[];
};

const BASE = "/inversiones";
const dateText = (value: string | null | undefined) =>
  value ? value.split("-").reverse().join("/") : "—";
const numText = (value: string | null | undefined) =>
  value === null || value === undefined ? "—" : value.replace(".", ",");
const todayIso = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const queryFecha = (search: string) =>
  new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(
    "fecha",
  ) ?? "";
const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) /
      86400000,
  );
function stateKind(text: string) {
  if (/^Elegible/.test(text)) return "ok";
  if (/^No elegible/.test(text)) return "warn";
  if (/^Verificada/.test(text)) return "ok";
  if (/^Parcial/.test(text)) return "partial";
  if (/^No disponible/.test(text) || /^Sin valoración/.test(text))
    return "unavailable";
  if (/^No aplica/.test(text)) return "na";
  return "info";
}
const stateSymbol: Record<string, string> = {
  ok: "✓",
  warn: "!",
  partial: "!",
  unavailable: "◇",
  na: "—",
  info: "·",
};
function State({ text }: { text: string }) {
  if (!text) return null;
  const kind = stateKind(text);
  return (
    <span className={"valoracion-state " + kind}>
      <span className="symbol" aria-hidden="true">
        {stateSymbol[kind]}
      </span>{" "}
      {text}
    </span>
  );
}
function PositionState({ estado }: { estado: string }) {
  const kind =
    estado === "Abierta" ? "ok" : estado === "Cerrada" ? "closed" : "na",
    symbol = estado === "Abierta" ? "●" : estado === "Cerrada" ? "■" : "—";
  return (
    <span className={"valoracion-state position " + kind}>
      <span className="symbol" aria-hidden="true">
        {symbol}
      </span>{" "}
      {estado}
    </span>
  );
}
function ValoracionCell({ valoracion }: { valoracion: ValoracionDto | null }) {
  if (!valoracion)
    return (
      <>
        <State text="No disponible" />
        <small className="help">
          Sin valoración ≤ T; no se inventa valor.
        </small>
      </>
    );
  if (valoracion.estado === "No aplica")
    return (
      <>
        <State text="No aplica" />
        <small className="help">Posición cerrada: sin valoración.</small>
      </>
    );
  if (valoracion.estado === "Disponible")
    return (
      <>
        <strong>{eur(valoracion.valorEur)}</strong>
        <small className="help">
          {valoracion.tipo} · {dateText(valoracion.fecha)} ·{" "}
          {valoracion.diasTranscurridos ?? "—"} días
        </small>
        {valoracion.elegibilidadFechaExacta && (
          <State text={valoracion.elegibilidadFechaExacta} />
        )}
      </>
    );
  return (
    <>
      <State text="No disponible" />
      {valoracion.motivo && <small className="help">{valoracion.motivo}</small>}
      <small className="help">
        {valoracion.tipo} · {dateText(valoracion.fecha)} ·{" "}
        {valoracion.diasTranscurridos ?? "—"} días
      </small>
      <small className="help">
        Cantidad base {numText(valoracion.cantidadBase)} · al corte{" "}
        {numText(valoracion.cantidadAlCorte)}
      </small>
      {valoracion.elegibilidadFechaExacta && (
        <State text={valoracion.elegibilidadFechaExacta} />
      )}
    </>
  );
}
function ResultadoCell({ resultado }: { resultado: Resultado }) {
  if (resultado.estado === "Disponible")
    return <strong>{eur(resultado.importeEur ?? null)}</strong>;
  return (
    <>
      <State text="No disponible" />
      {resultado.motivo && <small className="help">{resultado.motivo}</small>}
    </>
  );
}
function AllowedState({ valoracion }: { valoracion: ValoracionDto | null }) {
  if (!valoracion) return <State text="Sin valoración" />;
  if (valoracion.estado === "No aplica") return <State text="No aplica" />;
  if (valoracion.estado === "Disponible")
    return <State text={valoracion.cobertura} />;
  return <State text="No disponible" />;
}
function positionHref(
  position: Pick<Posicion, "saldoInversion" | "instrumento">,
  corte: string,
) {
  return `${VALORACION_BASE}/${position.saldoInversion.id}/${position.instrumento.id}?fecha=${corte}`;
}
function fichaHref(id: string | null) {
  return id ? `${VALORACION_BASE}/valoraciones/${id}` : "";
}

/** Local integer preview only; the server recalculates with the same exact scale. */
function scaled(value: string, scale: number) {
  const text = value.trim();
  if (!/^(0|[1-9]\d*)(?:\.(\d+))?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > scale) return null;
  return BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, "0"));
}
function centsText(value: bigint) {
  const negative = value < 0n,
    abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}
function previewAutomatic(
  cantidad: string | null,
  precio: string,
  cambio: string,
) {
  if (!cantidad) return null;
  const quantity = scaled(cantidad, 8),
    price = scaled(precio, 6),
    change = scaled(cambio, 6);
  if (
    quantity === null ||
    quantity <= 0n ||
    price === null ||
    price <= 0n ||
    change === null ||
    change <= 0n
  )
    return null;
  const denominator = 10n ** 18n,
    cents = (quantity * price * change + denominator / 2n) / denominator;
  return centsText(cents);
}
function previewManual(value: string) {
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  return centsText(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
}

export function Valoracion({
  path,
  go,
  tabs,
}: {
  path: string;
  go: (path: string) => void;
  tabs: ReactNode;
}) {
  const clean = path.split("?")[0],
    search = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  if (clean === VALORACION_BASE)
    return <CorteList go={go} tabs={tabs} search={search} />;
  const ficha = clean.match(
    /^\/inversiones\/valoracion\/valoraciones\/(VAL-\d{12})$/,
  );
  if (ficha)
    return <ValuationFicha id={ficha[1]} go={go} tabs={tabs} />;
  const rectificar = clean.match(
    /^\/inversiones\/valoracion\/valoraciones\/(VAL-\d{12})\/rectificar$/,
  );
  if (rectificar)
    return (
      <ValuationForm
        key={clean}
        id={rectificar[1]}
        mode="rectificar"
        go={go}
        tabs={tabs}
        search={search}
      />
    );
  const nueva = clean.match(
    /^\/inversiones\/valoracion\/(S\d+)\/(I\d+)\/nueva$/,
  );
  if (nueva)
    return (
      <ValuationForm
        key={clean}
        saldo={nueva[1]}
        instrumento={nueva[2]}
        mode="alta"
        go={go}
        tabs={tabs}
        search={search}
      />
    );
  const detalle = clean.match(
    /^\/inversiones\/valoracion\/(S\d+)\/(I\d+)$/,
  );
  if (detalle)
    return (
      <PositionDetail
        key={clean}
        saldo={detalle[1]}
        instrumento={detalle[2]}
        go={go}
        tabs={tabs}
        search={search}
      />
    );
  return (
    <>
      {tabs}
      <Alert>Página de Valoración no encontrada.</Alert>
    </>
  );
}

function CorteList({
  go,
  tabs,
  search,
}: {
  go: (path: string) => void;
  tabs: ReactNode;
  search: string;
}) {
  const initial = queryFecha(search) || todayIso();
  const [fecha, setFecha] = useState(initial),
    [corte, setCorte] = useState(initial),
    [data, setData] = useState<Corte | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setData(null);
    setError("");
    api<Corte>(`/e43/corte?fecha=${encodeURIComponent(corte)}`)
      .then((value) => {
        if (!live) return;
        setData(value);
        setLoading(false);
      })
      .catch((value) => {
        if (!live) return;
        setError(value.message);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [corte, retry]);
  function consultar(event: React.FormEvent) {
    event.preventDefault();
    if (!fecha) {
      setError("Indica una fecha de corte válida.");
      return;
    }
    if (fecha === corte) setRetry((value) => value + 1);
    else setCorte(fecha);
    if (typeof history !== "undefined")
      history.replaceState(
        null,
        "",
        `${VALORACION_BASE}?fecha=${encodeURIComponent(fecha)}`,
      );
  }
  const corteHref = (position: Posicion) =>
    positionHref(position, data?.corte ?? corte);
  const positionColumns: TableColumn<Posicion>[] = [
    {
      id: "posicion",
      header: "Posición",
      cell: (position) => (
        <>
          <a
            href={corteHref(position)}
            onClick={(event) => {
              event.preventDefault();
              go(corteHref(position));
            }}
          >
            {position.saldoInversion.id} · {position.instrumento.id}
          </a>
          <small className="help">{position.instrumento.nombre}</small>
          {position.instrumento.estado === "Inactiva" && (
            <Tag inactive>Inactiva · heredada</Tag>
          )}
        </>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (position) => <PositionState estado={position.estado} />,
    },
    {
      id: "cantidad",
      header: "Cantidad",
      kind: "amount",
      cell: (position) => numText(position.cantidad),
    },
    {
      id: "valoracion",
      header: "Valoración",
      kind: "amount",
      cell: (position) => (
        <ValoracionCell valoracion={position.valoracion} />
      ),
    },
    {
      id: "resultado",
      header: "Resultado",
      kind: "amount",
      cell: (position) => (
        <ResultadoCell resultado={position.resultado} />
      ),
    },
    {
      id: "rentabilidad",
      header: "Rentabilidad",
      cell: (position) => (
        <>
          <State text="No disponible" />
          <small className="help">{position.rentabilidad.motivo}</small>
        </>
      ),
    },
    {
      id: "cobertura",
      header: "Cobertura / elegibilidad",
      label: "Cobertura",
      cell: (position) => (
        <>
          <AllowedState valoracion={position.valoracion} />
          {position.valoracion?.elegibilidadFechaExacta && (
            <State text={position.valoracion.elegibilidadFechaExacta} />
          )}
        </>
      ),
    },
    {
      id: "accion",
      header: "Acción",
      kind: "actions",
      cell: (position) => (
        <a
          className="secondary valoracion-link valoracion-row-link"
          href={corteHref(position)}
          aria-label={`Ver detalle de ${position.saldoInversion.id} · ${position.instrumento.id}`}
          onClick={(event) => {
            event.preventDefault();
            go(corteHref(position));
          }}
        >
          Ver
        </a>
      ),
      cardCell: (position) => (
        <a
          className="secondary valoracion-link"
          href={corteHref(position)}
          aria-label={`Abrir detalle de ${position.saldoInversion.id} · ${position.instrumento.id}`}
          onClick={(event) => {
            event.preventDefault();
            go(corteHref(position));
          }}
        >
          Detalle
        </a>
      ),
    },
  ];
  return (
    <>
      {tabs}
      <PageHead
        eyebrow="E4.3 · INVERSIONES"
        title="Valoración y resultados"
        description="Posiciones a fecha de corte · solo lectura; efectivo separado del agregado"
      />
      <section className="panel valoracion-controls-panel" aria-label="Consulta de corte">
        <form className="valoracion-controls" onSubmit={consultar}>
          <label>
            Fecha de corte (DD/MM/AAAA)
            <input
              type="date"
              value={fecha}
              max={todayIso()}
              onChange={(event) => {
                setFecha(event.target.value);
                setError("");
              }}
              required
            />
            <small className="help">
              DD/MM/AAAA: {fecha ? dateText(fecha) : "—"} · API ISO{" "}
              {fecha || "—"}
            </small>
          </label>
          <button className="primary" type="submit">
            Consultar
          </button>
        </form>
        <p className="help">
          Único filtro: fecha de corte. No se añaden filtros de Estado, Tipo o
          cobertura.
        </p>
      </section>
      {error ? (
        <Alert retry={() => setRetry((value) => value + 1)}>
          No se pudo leer la fuente de valoración al corte. {error}
        </Alert>
      ) : loading ? (
        <p role="status">
          Cargando posiciones…{" "}
          <span className="help">
            Corte {dateText(corte)} conservado; sin totales provisionales.
          </span>
        </p>
      ) : !data ? (
        <p role="status">Preparando consulta de valoración…</p>
      ) : (
        <>
          <Summary data={data} />
          <ListState data={data} />
          {data.posiciones.length === 0 ? (
            <div className="empty">
              <p className="empty-symbol" aria-hidden="true">◇</p>
              <h2>Sin posiciones</h2>
              <p>
                La fuente de hechos está completa y no hay posiciones con
                cantidad al corte. No se muestra una valoración 0,00 ni una fila
                inventada.
              </p>
            </div>
          ) : (
            <>
              <div className="desktop-list valoracion-desktop">
                <Table
                  caption={`Posiciones y resultados al corte ${dateText(data.corte)}. Datos ficticios.`}
                  label="Tabla de posiciones al corte"
                  columns={positionColumns}
                  rows={data.posiciones}
                  rowKey={(position) =>
                    position.saldoInversion.id + "-" + position.instrumento.id
                  }
                  tableClassName="valoracion-table"
                />
              </div>
              <DataList
                columns={positionColumns}
                rows={data.posiciones}
                rowKey={(position) =>
                  position.saldoInversion.id + "-" + position.instrumento.id
                }
                rowClassName={(position) =>
                  position.instrumento.estado === "Inactiva"
                    ? "ui-row-inactive"
                    : undefined
                }
                label="Posiciones al corte móvil"
                className="valoracion-cards valoracion-mobile"
              />
            </>
          )}
          <CashPanel data={data} />
        </>
      )}
    </>
  );
}

function Summary({ data }: { data: Corte }) {
  const aggregate = data.agregado;
  return (
    <section className="valoracion-summary" aria-label="Agregado a corte">
      <article className="valoracion-card">
        <h2>Cobertura de valoración</h2>
        <State text={aggregate.coberturaValoracion} />
        <p className="help">
          n = posiciones abiertas con valoración válida y consistente; m =
          posiciones abiertas aplicables.
        </p>
      </article>
      <article className="valoracion-card">
        <h2>Valor agregado</h2>
        {aggregate.valorEur === null ? (
          <>
            <span className="valoracion-value">No se muestra</span>
            <p className="help">
              Se publica solo con cobertura <b>Verificada</b>; no se presenta la
              suma de lo valorado como total.
            </p>
          </>
        ) : (
          <>
            <span className="valoracion-value">{eur(aggregate.valorEur)}</span>
            <p className="help">Cobertura Verificada de valores conocidos.</p>
          </>
        )}
      </article>
      <article className="valoracion-card">
        <h2>Cobertura de resultado</h2>
        <State text={aggregate.coberturaResultado} />
        {aggregate.resultadoEur === null ? (
          <p className="help">
            Resultado agregado oculto: faltan posiciones aplicables con
            resultado calculable.
          </p>
        ) : (
          <p className="help">
            Resultado total: <b>{eur(aggregate.resultadoEur)}</b>
          </p>
        )}
      </article>
      <article className="valoracion-card">
        <h2>Elegibilidad por fecha exacta</h2>
        <State text={aggregate.elegibilidadFechaExacta} />
        <p className="help">
          E4.9 no evaluado: esta etiqueta no es una negativa definitiva de
          cierre ni certifica la foto.
        </p>
      </article>
    </section>
  );
}

function ListState({ data }: { data: Corte }) {
  const abiertas = data.posiciones.filter(
      (position) => position.estado === "Abierta",
    ).length,
    cerradas = data.posiciones.filter(
      (position) => position.estado === "Cerrada",
    ).length;
  const abiertasTexto = `${abiertas} ${abiertas === 1 ? "abierta" : "abiertas"}`,
    cerradasTexto = `${cerradas} ${cerradas === 1 ? "cerrada incluida" : "cerradas incluidas"}`;
  return (
    <div className="valoracion-list-state">
      <p>
        <b>
          Estado del listado: {abiertasTexto}
          {cerradas > 0 ? ` · ${cerradasTexto}.` : "."}
        </b>{" "}
        {cerradas > 0 && (
          <>
            {cerradas === 1 ? "La cerrada muestra" : "Las cerradas muestran"}{" "}
            resultado Ventas − Compras y valoración <b>No aplica</b>;{" "}
            {cerradas === 1 ? "no exige" : "no exigen"} valoración.
          </>
        )}
      </p>
      <p className="help">
        Cobertura histórica: {data.coberturaHistorica}
      </p>
    </div>
  );
}

function CashPanel({ data }: { data: Corte }) {
  return (
    <section className="panel" aria-label="Efectivo del bróker">
      <div className="panel-head">
        <h2>Efectivo del bróker · separado</h2>
        <a href="/saldos">Ver Saldos</a>
      </div>
      {data.efectivo.length === 0 ? (
        <p>Sin Saldo Efectivo/Inversiones registrado; no se declara cero.</p>
      ) : (
        <ul className="inversiones-cash-list">
          {data.efectivo.map((row) => (
            <li key={row.saldo.id}>
              <span>
                {row.saldo.id} · {row.saldo.nombre} · {dateText(row.fecha)}
                <small className="help"> · {row.condicion}</small>
              </span>
              <strong>{eur(row.disponible)}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="help">
        <b>No suma al agregado de posiciones.</b> Se lee de cashAt, un registro
        por Saldo de efectivo. No es una posición ni un patrimonio global.
      </p>
    </section>
  );
}

function PositionDetail({
  saldo,
  instrumento,
  go,
  tabs,
  search,
}: {
  saldo: string;
  instrumento: string;
  go: (path: string) => void;
  tabs: ReactNode;
  search: string;
}) {
  const corte = queryFecha(search) || todayIso();
  const [data, setData] = useState<Detalle | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<Detalle>(
      `/e43/posiciones/${saldo}/${instrumento}?fecha=${encodeURIComponent(corte)}`,
    )
      .then((value) => live && setData(value))
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [saldo, instrumento, corte, retry]);
  const listHref = `${VALORACION_BASE}?fecha=${corte}`;
  if (error)
    return (
      <>
        {tabs}
        <a
          className="back"
          href={listHref}
          onClick={(event) => {
            event.preventDefault();
            go(listHref);
          }}
        >
          ‹ Volver a Valoración
        </a>
        <Alert retry={() => setRetry((value) => value + 1)}>
          No se pudo leer la posición {saldo} · {instrumento} al corte{" "}
          {dateText(corte)}. {error}
        </Alert>
      </>
    );
  if (!data)
    return (
      <>
        {tabs}
        <p role="status">
          Cargando posición… <span className="help">Corte {dateText(corte)}.</span>
        </p>
      </>
    );
  const valoracion = data.valoracion,
    nuevaHref = `${VALORACION_BASE}/${saldo}/${instrumento}/nueva?fecha=${corte}`,
    instrumentoHref = `${BASE}/instrumentos/${instrumento}`;
  return (
    <>
      {tabs}
      <a
        className="back"
        href={listHref}
        onClick={(event) => {
          event.preventDefault();
          go(listHref);
        }}
      >
        ‹ Volver a Valoración
      </a>
      <PageHead
        eyebrow="E4.3 · POSICIÓN"
        title={`${saldo} · ${instrumento} · ${data.instrumento.nombre}`}
        description={`${data.saldoInversion.nombre} · Instrumento ${data.instrumento.estado} · posición derivada, no editable`}
      >
        {data.estado === "Abierta" && (
          <a
            className="primary valoracion-link"
            href={nuevaHref}
            onClick={(event) => {
              event.preventDefault();
              go(nuevaHref);
            }}
          >
            Nueva valoración
          </a>
        )}
      </PageHead>
      <div className="valoracion-badges">
        <PositionState estado={data.estado} />
        {valoracion && <State text={valoracion.cobertura} />}
        {valoracion?.elegibilidadFechaExacta && (
          <State text={valoracion.elegibilidadFechaExacta} />
        )}
        {data.instrumento.estado === "Inactiva" && (
          <Tag inactive>Inactiva · heredada</Tag>
        )}
      </div>
      <section className="valoracion-kpis" aria-label="Resumen de la posición">
        <article className="valoracion-kpi">
          <b>Cantidad al corte</b>
          <span className="valoracion-value">{numText(data.cantidad)}</span>
          <small className="help">Σ Compras − Σ Ventas vigentes ≤ T</small>
        </article>
        <article className="valoracion-kpi">
          <b>Valoración usada</b>
          <span className="valoracion-value">
            {valoracion?.estado === "Disponible"
              ? eur(valoracion.valorEur)
              : valoracion?.estado === "No aplica"
                ? "No aplica"
                : "No disponible"}
          </span>
          <small className="help">
            {valoracion?.estado === "No aplica"
              ? "Posición cerrada: sin valoración."
              : valoracion?.tipo && valoracion.fecha
                ? `${valoracion.tipo} · ${dateText(valoracion.fecha)} · ${valoracion.diasTranscurridos ?? "—"} días`
                : "Sin valoración ≤ T; no se inventa valor."}
          </small>
        </article>
        <article className="valoracion-kpi">
          <b>Resultado</b>
          <span className="valoracion-value">
            {data.resultado.estado === "Disponible"
              ? eur(data.resultado.importeEur ?? null)
              : "No disponible"}
          </span>
          <small className="help">
            {data.resultado.estado === "Disponible"
              ? "Valor + Ventas − Compras"
              : data.resultado.motivo}
          </small>
        </article>
        <article className="valoracion-kpi">
          <b>Rentabilidad</b>
          <span className="valoracion-value">
            <State text="No disponible" />
          </span>
          <small className="help">{data.rentabilidad.motivo}</small>
        </article>
      </section>
      <div className="valoracion-two-col">
        <section className="panel" aria-labelledby="valoracion-usada-title">
          <h2 id="valoracion-usada-title">Última valoración ≤ T</h2>
          {!valoracion ? (
            <>
              <State text="No disponible" />
              <p className="help">
                Sin valoración ≤ T. La cantidad y el Estado siguen visibles; no
                se convierte la ausencia en 0,00.
              </p>
            </>
          ) : (
            <>
              <dl className="valoracion-lines">
                <div>
                  <dt>ID / revisión</dt>
                  <dd>
                    {valoracion.id ?? "—"} · revisión{" "}
                    {valoracion.revision ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{valoracion.tipo ?? "—"}</dd>
                </div>
                <div>
                  <dt>Fecha de vigencia</dt>
                  <dd>
                    {dateText(valoracion.fecha)} ·{" "}
                    {valoracion.diasTranscurridos ?? "—"} días
                  </dd>
                </div>
                {valoracion.tipo === "Automática" && (
                  <div>
                    <dt>Precio · divisa · cambio</dt>
                    <dd>
                      {numText(valoracion.precio)} {valoracion.divisa ?? ""} ·{" "}
                      {numText(valoracion.cambio)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Cantidad base</dt>
                  <dd>{numText(valoracion.cantidadBase)}</dd>
                </div>
                <div>
                  <dt>Cantidad al corte</dt>
                  <dd>{numText(valoracion.cantidadAlCorte)}</dd>
                </div>
                <div>
                  <dt>Valor EUR</dt>
                  <dd>
                    {valoracion.estado === "Disponible"
                      ? eur(valoracion.valorEur)
                      : "No se muestra"}
                  </dd>
                </div>
                <div>
                  <dt>Procedencia</dt>
                  <dd>{valoracion.procedencia ?? "—"}</dd>
                </div>
                <div>
                  <dt>Cobertura</dt>
                  <dd>{valoracion.cobertura}</dd>
                </div>
                <div>
                  <dt>Elegibilidad por fecha exacta</dt>
                  <dd>{valoracion.elegibilidadFechaExacta ?? "—"}</dd>
                </div>
              </dl>
              {valoracion.estado === "No disponible" && (
                <div className="valoracion-notice error">
                  <b>No disponible.</b> {valoracion.motivo}. No se escala ni se
                  prorratea el importe; la valoración anterior permanece en la
                  serie como valor de su fecha.
                </div>
              )}
              {valoracion.estado === "Disponible" &&
                valoracion.cantidadBase === valoracion.cantidadAlCorte && (
                  <div className="valoracion-notice ok">
                    <b>Cantidad base = cantidad al corte.</b> La valoración
                    representa la cantidad de su fecha de vigencia; no se
                    escala, no se prorratea y no se presenta como precio
                    verificado del día T.
                  </div>
                )}
              {valoracion.estado === "No aplica" && (
                <div className="valoracion-notice">
                  Posición cerrada: la valoración no aplica. El resultado se
                  calcula como Ventas − Compras, sin porcentaje.
                </div>
              )}
            </>
          )}
          <div className="actions valoracion-actions">
            {data.estado === "Abierta" && (
              <a
                className="secondary valoracion-link"
                href={nuevaHref}
                onClick={(event) => {
                  event.preventDefault();
                  go(nuevaHref);
                }}
              >
                Nueva valoración
              </a>
            )}
            {valoracion?.id && (
              <>
                <a
                  className="secondary valoracion-link"
                  href={fichaHref(valoracion.id)}
                  onClick={(event) => {
                    event.preventDefault();
                    go(fichaHref(valoracion.id));
                  }}
                >
                  Ficha y auditoría
                </a>
                <a
                  className="secondary valoracion-link"
                  href={`${VALORACION_BASE}/valoraciones/${valoracion.id}/rectificar`}
                  onClick={(event) => {
                    event.preventDefault();
                    go(
                      `${VALORACION_BASE}/valoraciones/${valoracion.id}/rectificar`,
                    );
                  }}
                >
                  Rectificar valoración
                </a>
              </>
            )}
            <a
              className="secondary valoracion-link"
              href={instrumentoHref}
              onClick={(event) => {
                event.preventDefault();
                go(instrumentoHref);
              }}
            >
              Ver Compras y Ventas del Instrumento
            </a>
          </div>
          <p className="help">
            El E4.3 no devuelve los hechos de Compra/Venta en este DTO; se
            consultan en la ficha del Instrumento.
          </p>
        </section>
        <aside>
          <section className="panel" aria-labelledby="resultado-title">
            <h2 id="resultado-title">Resultado de la posición</h2>
            {data.resultado.estado === "Disponible" ? (
              <>
                <p className="valoracion-amount">
                  {eur(data.resultado.importeEur ?? null)}
                </p>
                <p className="help">
                  {data.estado === "Cerrada"
                    ? "Ventas − Compras (importe_eur neto de comisión, una sola vez)."
                    : "Valor + Ventas − Compras (importe_eur neto de comisión, una sola vez)."}
                </p>
              </>
            ) : (
              <>
                <State text="No disponible" />
                <p className="help">{data.resultado.motivo}</p>
              </>
            )}
            <p className="help">
              Una sola cifra por posición. Sin etiqueta realizado/no
              realizado, sin FIFO, sin lotes.
            </p>
          </section>
          <section className="panel" aria-labelledby="rentabilidad-title">
            <h2 id="rentabilidad-title">Rentabilidad</h2>
            <State text="No disponible" />
            <p className="help">
              {data.rentabilidad.motivo}. No se publica porcentaje, ratio, TWR,
              TIR ni denominador mientras no exista una fórmula aprobada.
            </p>
          </section>
          <section className="panel" aria-labelledby="cobertura-title">
            <h2 id="cobertura-title">Cobertura y elegibilidad</h2>
            <dl className="valoracion-lines">
              <div>
                <dt>Cobertura de la valoración</dt>
                <dd>{valoracion?.cobertura ?? "No aplica"}</dd>
              </div>
              <div>
                <dt>Elegibilidad por fecha exacta</dt>
                <dd>{valoracion?.elegibilidadFechaExacta ?? "No aplica"}</dd>
              </div>
            </dl>
            <div className="valoracion-notice">
              <b>Esta etiqueta no certifica el cierre.</b> E4.3 solo acredita lo
              que puede observar por fecha exacta. E4.9 define su ventana de
              suficiencia y su foto; E4.3 no escribe e43 ni valoracion.
            </div>
          </section>
        </aside>
      </div>
      <Serie data={data} corte={corte} go={go} />
    </>
  );
}

function Serie({
  data,
  corte,
  go,
}: {
  data: Detalle;
  corte: string;
  go: (path: string) => void;
}) {
  const columns: TableColumn<ValoracionDto>[] = [
    {
      id: "fecha",
      header: "Fecha",
      cell: (row) => dateText(row.fecha),
    },
    {
      id: "dias",
      header: "Días",
      kind: "amount",
      cell: (row) => (row.fecha ? daysBetween(row.fecha, corte) : "—"),
    },
    {
      id: "tipo",
      header: "Tipo",
      cell: (row) => row.tipo ?? "—",
    },
    {
      id: "cantidad",
      header: "Cantidad base",
      kind: "amount",
      cell: (row) => numText(row.cantidadBase),
    },
    {
      id: "valor",
      header: "Valor",
      kind: "amount",
      cell: (row) =>
        row.estado === "Disponible" ? eur(row.valorEur) : "No disponible",
    },
    {
      id: "revision",
      header: "Revisión",
      cell: (row) => row.revision ?? "—",
    },
    {
      id: "elegibilidad",
      header: "Elegibilidad",
      cell: (row) => (
        <State
          text={
            row.fecha === corte
              ? "Elegible por fecha exacta (E4.9 no evaluado)"
              : "No elegible por fecha exacta en E4.3"
          }
        />
      ),
    },
    {
      id: "accion",
      header: "Acción",
      kind: "actions",
      cell: (row) =>
        row.id && (
          <a
            className="text-button"
            href={fichaHref(row.id)}
            aria-label={`Ver ficha de ${row.id}`}
            onClick={(event) => {
              event.preventDefault();
              go(fichaHref(row.id));
            }}
          >
            Ficha
          </a>
        ),
    },
  ];
  return (
    <section className="panel" aria-labelledby="serie-title">
      <h2 id="serie-title">Serie histórica</h2>
      {data.serie.length === 0 ? (
        <p>
          Serie vacía. No se inventan valores ni se adelanta una valoración
          posterior al corte.
        </p>
      ) : (
        <>
          <div className="desktop-list valoracion-desktop">
            <Table
              caption={`Serie ficticia de valoraciones al corte ${dateText(corte)}.`}
              label="Tabla de serie histórica"
              columns={columns}
              rows={data.serie}
              rowKey={(row) => (row.id ?? "") + "-" + row.revision}
              tableClassName="valoracion-table valoracion-series-table"
            />
          </div>
          <DataList
            columns={columns}
            rows={data.serie}
            rowKey={(row) => (row.id ?? "") + "-" + row.revision}
            label="Serie histórica móvil"
            className="valoracion-cards valoracion-mobile"
          />
        </>
      )}
      <p className="help">
        Cada fila conserva su propia fecha y su cantidad base. Una valoración
        posterior al corte nunca se usa. La serie no se asocia a un Ciclo.
      </p>
    </section>
  );
}

function ValuationFicha({
  id,
  go,
  tabs,
}: {
  id: string;
  go: (path: string) => void;
  tabs: ReactNode;
}) {
  const [data, setData] = useState<Ficha | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<Ficha>(`/e43/valoraciones/${id}`)
      .then((value) => live && setData(value))
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [id, retry]);
  if (error)
    return (
      <>
        {tabs}
        <Alert retry={() => setRetry((value) => value + 1)}>
          No se pudo leer la valoración {id}. {error}
        </Alert>
      </>
    );
  if (!data) return <>{tabs}<p role="status">Cargando valoración…</p></>;
  const valoracion = data.valoracion,
    detailHref = `${VALORACION_BASE}/${data.posicion.saldo.id}/${data.posicion.instrumento.id}?fecha=${valoracion.fecha ?? todayIso()}`;
  return (
    <>
      {tabs}
      <a
        className="back"
        href={detailHref}
        onClick={(event) => {
          event.preventDefault();
          go(detailHref);
        }}
      >
        ‹ Volver a la posición
      </a>
      <PageHead
        eyebrow="E4.3 · VALORACIÓN"
        title={`Valoración ${valoracion.id ?? id}`}
        description={`${data.posicion.saldo.id} · ${data.posicion.instrumento.id} · ${data.posicion.instrumento.nombre} · revisión ${valoracion.revision ?? "—"}`}
      >
        <a
          className="secondary valoracion-link"
          href={`${VALORACION_BASE}/valoraciones/${id}/rectificar`}
          onClick={(event) => {
            event.preventDefault();
            go(`${VALORACION_BASE}/valoraciones/${id}/rectificar`);
          }}
        >
          Rectificar
        </a>
        <a
          className="secondary valoracion-link"
          href={detailHref}
          onClick={(event) => {
            event.preventDefault();
            go(detailHref);
          }}
        >
          Ver posición al corte
        </a>
      </PageHead>
      <div className="valoracion-badges">
        <State text={valoracion.estado} />
        <State text={valoracion.tipo ?? "—"} />
        <State text={valoracion.cobertura} />
      </div>
      <div className="valoracion-two-col">
        <section className="panel" aria-labelledby="ficha-datos-title">
          <h2 id="ficha-datos-title">Datos de la valoración</h2>
          <dl className="valoracion-lines">
            <div>
              <dt>ID inmutable</dt>
              <dd>{valoracion.id ?? "—"}</dd>
            </div>
            <div>
              <dt>Revisión</dt>
              <dd>{valoracion.revision ?? "—"}</dd>
            </div>
            <div>
              <dt>Posición</dt>
              <dd>
                {data.posicion.saldo.id} · {data.posicion.instrumento.id} ·{" "}
                {data.posicion.instrumento.nombre}
              </dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{valoracion.tipo ?? "—"}</dd>
            </div>
            <div>
              <dt>Fecha de vigencia</dt>
              <dd>{dateText(valoracion.fecha)}</dd>
            </div>
            <div>
              <dt>Valor EUR</dt>
              <dd>{eur(valoracion.valorEur)}</dd>
            </div>
            {valoracion.tipo === "Automática" && (
              <>
                <div>
                  <dt>Precio unitario</dt>
                  <dd>{numText(valoracion.precio)}</dd>
                </div>
                <div>
                  <dt>Divisa</dt>
                  <dd>{valoracion.divisa ?? "—"}</dd>
                </div>
                <div>
                  <dt>Cambio</dt>
                  <dd>{numText(valoracion.cambio)}</dd>
                </div>
              </>
            )}
            <div>
              <dt>Cantidad base</dt>
              <dd>{numText(valoracion.cantidadBase)}</dd>
            </div>
            <div>
              <dt>Procedencia</dt>
              <dd>{valoracion.procedencia ?? "—"}</dd>
            </div>
            <div>
              <dt>Cobertura</dt>
              <dd>{valoracion.cobertura}</dd>
            </div>
          </dl>
        </section>
        <section className="panel" aria-labelledby="ficha-auditoria-title">
          <h2 id="ficha-auditoria-title">Auditoría de la valoración</h2>
          {data.auditoria.length === 0 ? (
            <p>Sin cambios auditados.</p>
          ) : (
            <ul className="inversiones-audit">
              {data.auditoria.map((row) => (
                <li key={row.revision}>
                  <strong>{row.accion}</strong> · revisión {row.revision} ·{" "}
                  <span className="help">
                    {new Date(row.instante).toLocaleString("es-ES", {
                      timeZone: "UTC",
                      timeZoneName: "short",
                    })}{" "}
                    · {row.actor}
                  </span>
                  {row.motivo && <p className="help">{row.motivo}</p>}
                  <details>
                    <summary>Estado anterior y posterior</summary>
                    <pre className="valoracion-json">
                      {JSON.stringify(
                        { anterior: row.anterior, posterior: row.posterior },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
          <p className="help">
            Alta y corrección append-only. No existe DELETE. Una corrección
            posterior no reescribe una foto cerrada de E4.9.
          </p>
        </section>
      </div>
    </>
  );
}

function ValuationForm({
  id,
  saldo,
  instrumento,
  mode,
  go,
  tabs,
  search,
}: {
  id?: string;
  saldo?: string;
  instrumento?: string;
  mode: "alta" | "rectificar";
  go: (path: string) => void;
  tabs: ReactNode;
  search: string;
}) {
  const rectifying = mode === "rectificar" && Boolean(id);
  const [ficha, setFicha] = useState<Ficha | null>(null),
    [loaded, setLoaded] = useState(!rectifying),
    [tipo, setTipo] = useState<"Manual" | "Automática">("Manual"),
    [fecha, setFecha] = useState(queryFecha(search) || todayIso()),
    [valorEur, setValorEur] = useState(""),
    [precio, setPrecio] = useState(""),
    [divisa, setDivisa] = useState("EUR"),
    [cambio, setCambio] = useState("1.000000"),
    [procedencia, setProcedencia] = useState(""),
    [motivo, setMotivo] = useState(""),
    [revision, setRevision] = useState(1),
    [posicion, setPosicion] = useState<{
      saldoId: string;
      instrumentoId: string;
      saldoNombre: string;
      instrumentoNombre: string;
      estado: string;
    } | null>(null),
    [cantidad, setCantidad] = useState<string | null>(null),
    [positionError, setPositionError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false),
    [conflict, setConflict] = useState<{
      current: ValoracionDto;
      changes: string[];
    } | null>(null),
    [overwrite, setOverwrite] = useState(false),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null),
    formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alert.current?.focus();
    });
  }, [error]);
  useEffect(() => {
    if (!rectifying || !id) return;
    let live = true;
    api<Ficha>(`/e43/valoraciones/${id}`)
      .then((value) => {
        if (!live) return;
        const current = value.valoracion;
        setFicha(value);
        setTipo(current.tipo ?? "Manual");
        setFecha(current.fecha ?? todayIso());
        setValorEur(current.valorEur ?? "");
        setPrecio(current.precio ?? "");
        setDivisa(current.divisa ?? "EUR");
        setCambio(
          current.cambio ??
            (current.divisa === null || current.divisa === "EUR"
              ? "1.000000"
              : ""),
        );
        setProcedencia(current.procedencia ?? "");
        setRevision(current.revision ?? 1);
        setPosicion({
          saldoId: value.posicion.saldo.id,
          instrumentoId: value.posicion.instrumento.id,
          saldoNombre: value.posicion.saldo.nombre,
          instrumentoNombre: value.posicion.instrumento.nombre,
          estado: value.posicion.instrumento.estado,
        });
        setLoaded(true);
      })
      .catch((value) => {
        if (!live) return;
        setError(value.message);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [id, rectifying, retry]);
  const saldoId = rectifying ? posicion?.saldoId ?? "" : saldo ?? "",
    instrumentoId = rectifying
      ? posicion?.instrumentoId ?? ""
      : instrumento ?? "";
  useEffect(() => {
    if (!saldoId || !instrumentoId) return;
    let live = true;
    setPositionError("");
    api<Detalle>(
      `/e43/posiciones/${saldoId}/${instrumentoId}?fecha=${encodeURIComponent(fecha)}`,
    )
      .then((value) => {
        if (!live) return;
        setCantidad(value.cantidad);
        setPosicion((current) => ({
          saldoId,
          instrumentoId,
          saldoNombre:
            value.saldoInversion.nombre || current?.saldoNombre || "",
          instrumentoNombre:
            value.instrumento.nombre || current?.instrumentoNombre || "",
          estado: value.instrumento.estado || current?.estado || "",
        }));
      })
      .catch((value) => {
        if (!live) return;
        setCantidad(null);
        setPositionError(
          value?.status === 404
            ? "No hay posición abierta en la fecha indicada."
            : value.message,
        );
      });
    return () => {
      live = false;
    };
  }, [saldoId, instrumentoId, fecha]);
  useEffect(() => {
    if (conflict) setOverwrite(false);
  }, [conflict, fecha, tipo, valorEur, precio, divisa, cambio, procedencia, motivo]);
  function changed() {
    setError("");
    setErrors({});
    attempt.current = crypto.randomUUID();
  }
  function change(field: string, value: string) {
    changed();
    if (field === "tipo") setTipo(value as "Manual" | "Automática");
    if (field === "fecha") setFecha(value);
    if (field === "valorEur") setValorEur(value);
    if (field === "precio") setPrecio(value);
    if (field === "divisa") {
      const upper = value.toUpperCase();
      setDivisa(upper);
      if (upper === "EUR") setCambio("1.000000");
      else if (divisa === "EUR") setCambio("");
    }
    if (field === "cambio") setCambio(value);
    if (field === "procedencia") setProcedencia(value);
    if (field === "motivo") setMotivo(value);
  }
  const preview =
      tipo === "Manual" ? previewManual(valorEur) : previewAutomatic(cantidad, precio, cambio),
    detalleHref = rectifying && ficha
      ? `${VALORACION_BASE}/${ficha.posicion.saldo.id}/${ficha.posicion.instrumento.id}?fecha=${fecha}`
      : `${VALORACION_BASE}/${saldo ?? ""}/${instrumento ?? ""}?fecha=${fecha}`,
    backHref = rectifying && id
      ? fichaHref(id)
      : `${VALORACION_BASE}/${saldo ?? ""}/${instrumento ?? ""}?fecha=${fecha}`;
  async function loadConflict() {
    if (!id) return;
    try {
      const value = await api<Ficha>(`/e43/valoraciones/${id}`);
      const current = value.valoracion;
      const changes: string[] = [];
      const add = (label: string, currentValue: string | null, draft: string) => {
        if ((currentValue ?? "") !== (draft ?? "")) changes.push(label);
      };
      add("Fecha", current.fecha, fecha);
      add("Tipo", current.tipo, tipo);
      add("Procedencia", current.procedencia, procedencia);
      if (tipo === "Manual") add("Importe EUR", current.valorEur, valorEur);
      else {
        add("Precio", current.precio, precio);
        add("Divisa", current.divisa, divisa);
        add("Cambio", current.cambio, cambio);
      }
      setConflict({ current, changes });
    } catch (value) {
      setError((value as Error).message);
    }
  }
  function failed(value: unknown) {
    const apiError = value as ApiError;
    setError(apiError.message);
    setErrors(apiError.fields ?? {});
    setStale(apiError.code === "REVISION_CONFLICT");
    setOverwrite(false);
    if (apiError.code === "REVISION_CONFLICT" && rectifying)
      void loadConflict();
  }
  function discardAndReload() {
    if (!conflict) return;
    const current = conflict.current;
    setTipo(current.tipo ?? "Manual");
    setFecha(current.fecha ?? todayIso());
    setValorEur(current.valorEur ?? "");
    setPrecio(current.precio ?? "");
    setDivisa(current.divisa ?? "EUR");
    setCambio(
      current.cambio ??
        (current.divisa === null || current.divisa === "EUR"
          ? "1.000000"
          : ""),
    );
    setProcedencia(current.procedencia ?? "");
    setRevision(current.revision ?? revision);
    setMotivo("");
    setConflict(null);
    setStale(false);
    setOverwrite(false);
    setError("");
    setErrors({});
    attempt.current = crypto.randomUUID();
  }
  function useDraftOverwrite() {
    if (!conflict || !overwrite) return;
    setRevision(conflict.current.revision ?? revision);
    setConflict(null);
    setStale(false);
    setOverwrite(false);
    setError("");
    setErrors({});
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    const body: Record<string, unknown> = {
      fecha,
      tipo,
      procedencia: procedencia.trim(),
    };
    if (tipo === "Manual") body.valorEur = valorEur.trim();
    else {
      body.precio = precio.trim();
      body.divisa = divisa.trim().toUpperCase();
      body.cambio = cambio.trim();
    }
    if (rectifying) {
      body.revision = revision;
      body.motivo = motivo.trim();
    }
    try {
      const result = rectifying
        ? await api<Ficha>(
            `/e43/valoraciones/${id}/rectificar`,
            "POST",
            body,
          )
        : await api<Ficha>(
            `/e43/posiciones/${saldo}/${instrumento}/valoraciones`,
            "POST",
            body,
            { "idempotency-key": attempt.current },
          );
      go(`${VALORACION_BASE}/valoraciones/${result.valoracion.id}`);
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  }
  if (!loaded) return <>{tabs}<p role="status">Cargando valoración…</p></>;
  return (
    <>
      {tabs}
      <a
        className="back"
        href={backHref}
        onClick={(event) => {
          event.preventDefault();
          go(backHref);
        }}
      >
        ‹ Volver
      </a>
      <PageHead
        eyebrow={rectifying ? "E4.3 · CORRECCIÓN" : "E4.3 · ALTA"}
        title={
          rectifying
            ? "Corrección auditada de valoración"
            : tipo === "Manual"
              ? "Registrar valoración Manual"
              : "Registrar valoración Automática"
        }
        description={
          rectifying
            ? "Reemplazo completo con revisión optimista y motivo. No hay DELETE."
            : "La app calcula con precisión exacta; solo el importe final se redondea a céntimos."
        }
      />
      {(error || (stale && rectifying && conflict)) && (
        <div ref={alert} tabIndex={-1} className="focus-alert">
          <Alert>
            {error && <>{error}</>}
            {stale && rectifying && conflict && (
              <div className="valoracion-conflict">
                <p>
                  <b>
                    Cambios concurrentes en la revisión{" "}
                    {conflict.current.revision}.
                  </b>{" "}
                  Tu borrador no se ha guardado.
                </p>
                {conflict.changes.length ? (
                  <ul>
                    {conflict.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                ) : (
                  <p>La revisión avanzó sin diferencias de contenido.</p>
                )}
                <p className="help">
                  Diferencias detectadas al recibir el 409; editar el borrador no
                  autoriza la sobrescritura.
                </p>
                <p>
                  <button
                    className="secondary"
                    type="button"
                    onClick={discardAndReload}
                  >
                    Descartar mi borrador y cargar la revisión vigente
                  </button>
                </p>
                <label className="valoracion-overwrite">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(event) => setOverwrite(event.target.checked)}
                  />{" "}
                  Entiendo que guardar reemplazará la revisión vigente con mi
                  borrador.
                </label>
                <p>
                  <button
                    className="secondary"
                    type="button"
                    disabled={!overwrite}
                    onClick={useDraftOverwrite}
                  >
                    Usar mi borrador sobre la revisión{" "}
                    {conflict.current.revision}
                  </button>
                </p>
              </div>
            )}
          </Alert>
        </div>
      )}
      <form
        className="saldo-form"
        onSubmit={submit}
        noValidate
        ref={formRef}
      >
        <FormSection title="Datos de la valoración">
          <FormGrid>
            <div className="valoracion-readonly full-width">
              <span className="help">Posición</span>
              <strong>
                {posicion
                  ? `${posicion.saldoId} · ${posicion.instrumentoId} · ${posicion.instrumentoNombre}`
                  : `${saldo ?? "—"} · ${instrumento ?? "—"}`}
              </strong>
              <small className="help">
                Posición derivada de Saldo de inversión + Instrumento; no
                editable.
              </small>
            </div>
            <fieldset className="valoracion-tipo full-width">
              <legend>Tipo de valoración *</legend>
              <label>
                <input
                  type="radio"
                  name="tipo"
                  value="Manual"
                  checked={tipo === "Manual"}
                  onChange={() => change("tipo", "Manual")}
                  aria-invalid={Boolean(errors.tipo)}
                  aria-describedby={errors.tipo ? "tipo-error" : undefined}
                />{" "}
                Manual
              </label>
              <label>
                <input
                  type="radio"
                  name="tipo"
                  value="Automática"
                  checked={tipo === "Automática"}
                  onChange={() => change("tipo", "Automática")}
                  aria-invalid={Boolean(errors.tipo)}
                  aria-describedby={errors.tipo ? "tipo-error" : undefined}
                />{" "}
                Automática
              </label>
              {/* Mismo contrato que `Field`: el hueco existe siempre y solo se
                  referencia cuando hay mensaje. */}
              <p className="ui-field-error" id="tipo-error">
                {errors.tipo ?? ""}
              </p>
            </fieldset>
            <Field
              id="fecha"
              label="Fecha de vigencia (DD/MM/AAAA) *"
              help={
                <>
                  DD/MM/AAAA: {fecha ? dateText(fecha) : "—"} · API ISO{" "}
                  {fecha || "—"} · no puede ser futura.
                </>
              }
              error={errors.fecha}
            >
              <input
                type="date"
                value={fecha}
                max={todayIso()}
                onChange={(event) => change("fecha", event.target.value)}
                required
              />
            </Field>
            <div className="valoracion-readonly">
              <span className="help">Cantidad en la fecha</span>
              <strong>{cantidad ? numText(cantidad) : "—"}</strong>
              <small className="help">
                Recalculada en servidor; no se acepta cantidad base del
                cliente.
              </small>
              {positionError && (
                <small className="field-error">{positionError}</small>
              )}
            </div>
            <Field
              id="procedencia"
              label="Procedencia *"
              help="Obligatoria; no se valida contra un proveedor externo."
              error={errors.procedencia}
            >
              <input
                value={procedencia}
                onChange={(event) => change("procedencia", event.target.value)}
                maxLength={200}
                required
              />
            </Field>
            <div className="valoracion-readonly">
              <span className="help">Cobertura (derivada)</span>
              <strong>Completa · toda la cantidad</strong>
              <small className="help">
                Derivada y no editable. Solo Completa; sin lotes ni tramos.
              </small>
            </div>
          </FormGrid>
          <div className="valoracion-notice">
            <b>A-01 / R-E43-13.</b> El importe se refiere a la cantidad de su
            fecha de vigencia. Si al corte la cantidad cambia, no se extrapola
            ni se escala; la posición quedará <b>No disponible</b> y exigirá una
            nueva valoración.
          </div>
        </FormSection>
        {tipo === "Manual" ? (
          <FormSection title="Importe declarado">
            <FormGrid>
              <Field
                id="valorEur"
                label="Importe EUR *"
                help="Valor declarado por el usuario; hasta céntimos. 0,00 es válido y no es ausencia."
                error={errors.valorEur}
              >
                <input
                  value={valorEur}
                  onChange={(event) => change("valorEur", event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </Field>
            </FormGrid>
          </FormSection>
        ) : (
          <FormSection title="Insumos declarados">
            <FormGrid>
              <Field
                id="precio"
                label="Precio unitario *"
                help="Debe ser > 0; sin redondeo intermedio."
                error={errors.precio}
              >
                <input
                  value={precio}
                  onChange={(event) => change("precio", event.target.value)}
                  inputMode="decimal"
                  placeholder="120.000000"
                  required
                />
              </Field>
              <Field
                id="divisa"
                label="Divisa *"
                help="ISO 4217, tres letras mayúsculas."
                error={errors.divisa}
              >
                <input
                  value={divisa}
                  onChange={(event) => change("divisa", event.target.value)}
                  maxLength={3}
                  placeholder="EUR"
                  required
                />
              </Field>
              <Field
                id="cambio"
                label="Cambio a EUR *"
                help="Debe ser > 0; si la divisa es EUR, exactamente 1."
                error={errors.cambio}
              >
                <input
                  value={cambio}
                  onChange={(event) => change("cambio", event.target.value)}
                  inputMode="decimal"
                  placeholder="1.000000"
                  required
                />
              </Field>
            </FormGrid>
          </FormSection>
        )}
        <FormSection title="Vista previa · no persiste">
          <dl className="valoracion-lines">
            <div>
              <dt>Tipo</dt>
              <dd>{tipo}</dd>
            </div>
            <div>
              <dt>Cantidad base</dt>
              <dd>{numText(cantidad)}</dd>
            </div>
            <div>
              <dt>Importe que se registrará</dt>
              <dd>
                {preview ? (
                  <strong>{eur(preview)}</strong>
                ) : (
                  <State text="No calculable" />
                )}
              </dd>
            </div>
          </dl>
          {tipo === "Automática" && (
            <p className="valoracion-formula">
              {numText(cantidad)} × {numText(precio)} × {numText(cambio)} ={" "}
              {preview ? eur(preview) : "No calculable"}
            </p>
          )}
          <p className="help">
            El producto se calcula con enteros exactos; solo el importe final se
            redondea a céntimos, una vez. El servidor recalcula y valida con la
            cantidad real de la fecha.
          </p>
          <p className="help">
            En Automática, precio, cambio y cantidad deben ser &gt; 0. Un valor
            calculado que redondea a 0,00 con insumos positivos sí cuenta como
            valoración presente. La idempotencia se genera internamente; no es
            un campo de usuario.
          </p>
          {tipo === "Manual" && (
            <p className="help">
              Manual en posición abierta: el valor se muestra, pero Resultado y
              Rentabilidad quedan No disponible con motivo (D-02).
            </p>
          )}
        </FormSection>
        {rectifying && (
          <FormSection title="Corrección auditada">
            <FormGrid>
              <div className="valoracion-readonly">
                <span className="help">Revisión vigente enviada</span>
                <strong>
                  {revision}
                  {stale && conflict
                    ? ` (obsoleta; vigente ${conflict.current.revision})`
                    : ""}
                </strong>
                <small className="help">
                  Una revisión obsoleta produce 409 REVISION_CONFLICT.
                </small>
              </div>
              <Field
                id="motivo"
                label="Motivo de corrección *"
                help="Obligatorio; se conserva en auditoría."
                error={errors.motivo}
              >
                <input
                  value={motivo}
                  onChange={(event) => change("motivo", event.target.value)}
                  maxLength={1000}
                  required
                />
              </Field>
            </FormGrid>
            <p className="help">
              Son inmutables el ID, la posición y creado_utc. No hay DELETE: una
              valoración no se anula, se corrige con revisión y motivo.
            </p>
            {ficha && (
              <p className="help">
                Antes: {ficha.valoracion.tipo} ·{" "}
                {eur(ficha.valoracion.valorEur)} · revisión{" "}
                {ficha.valoracion.revision}. Después: {tipo} ·{" "}
                {preview ? eur(preview) : "No calculable"} · revisión{" "}
                {revision + 1}.
              </p>
            )}
          </FormSection>
        )}
        <div className="form-footer">
          <button
            type="button"
            className="secondary"
            onClick={() => go(backHref)}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy || stale}>
            {busy
              ? "Guardando…"
              : rectifying
                ? "Guardar corrección"
                : "Guardar valoración"}
          </button>
        </div>
        <p className="help">
          {rectifying
            ? "Un 409 conserva el borrador; un 422 no escribe. No hay botón de borrado."
            : "Un 409 no crea una segunda valoración; un 422 no escribe y conserva el borrador."}{" "}
          {detalleHref && (
            <a
              href={detalleHref}
              onClick={(event) => {
                event.preventDefault();
                go(detalleHref);
              }}
            >
              Ver posición al corte
            </a>
          )}
        </p>
      </form>
    </>
  );
}
