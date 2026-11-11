import { useEffect, useRef, useState } from "react";
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
import { SaleList, SaleForm, SaleDetail, AnnulSale } from "./Ventas";
import { Valoracion } from "./Valoracion";

type Position = {
  saldoInversion: { id: string; nombre: string };
  cantidad: string;
  compras: number;
  ventas: number;
  ultimaCompra: string | null;
  ultimaVenta: string | null;
  ultimaOperacion: string | null;
};
type Instrumento = {
  id: string;
  nombre: string;
  isin: string | null;
  isinEvidencia: string | null;
  divisaReferencia: string | null;
  estado: string;
  revision: number;
  creadoEn?: string;
  actualizadoEn?: string;
  posiciones?: Position[];
  comprasVigentes?: number;
};
type AuditRow = {
  revision: number;
  accion: string;
  motivo: string | null;
  instante: string;
  actor: string;
  anterior: unknown;
  posterior: any;
};
type Compra = {
  id: string;
  clase: string;
  fecha: string;
  cantidad: string;
  precio: string;
  divisa: string;
  cambio: string | null;
  importeEur: string;
  comisionEur: string | null;
  concepto: string | null;
  nota: string | null;
  estado: string;
  revision: number;
  instrumento: { id: string; nombre: string; estado: string } | null;
  saldoEfectivo: { id: string; nombre: string; estado: string } | null;
  saldoInversion: { id: string; nombre: string; estado: string } | null;
  referencia: { calculo: string; diferencia: string; nota: string };
};
type Options = {
  instrumentos: Instrumento[];
  instrumentosVenta: {
    saldoInversion: { id: string; nombre: string; estado: string };
    instrumentos: {
      id: string;
      nombre: string;
      estado: string;
      cantidad: string;
    }[];
  }[];
  divisas: string[];
  saldosEfectivo: {
    id: string;
    nombre: string;
    estado: string;
    disponible: string;
  }[];
  saldosInversion: { id: string; nombre: string; estado: string }[];
  cobertura: string;
};
export type Impact = {
  accion: string;
  impacto: {
    efectivo: {
      saldo: { id: string; nombre: string };
      antes: string;
      despues: string;
    };
    posicion: {
      saldoInversion: { id: string; nombre: string } | null;
      instrumento: { id: string; nombre: string } | null;
      antes: string;
      despues: string;
    };
  };
  referencia: Compra["referencia"] | null;
  aviso: string;
};
type Form = {
  fecha: string;
  instrumento: string;
  saldoEfectivo: string;
  saldoInversion: string;
  cantidad: string;
  precio: string;
  divisa: string;
  cambio: string;
  importeEur: string;
  comisionEur: string;
  concepto: string;
  nota: string;
  motivo: string;
};
export const BASE = "/inversiones";
export const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "No disponible";
const text = (value: string | null | undefined) => value ?? "—";
export const num = (value: string | null | undefined) =>
  value === null || value === undefined ? "—" : value.replace(".", ",");
const blank: Form = {
  fecha: "",
  instrumento: "",
  saldoEfectivo: "",
  saldoInversion: "",
  cantidad: "",
  precio: "",
  divisa: "EUR",
  cambio: "",
  importeEur: "",
  comisionEur: "",
  concepto: "",
  nota: "",
  motivo: "",
};
function formOf(compra: Compra): Form {
  return {
    fecha: compra.fecha,
    instrumento: compra.instrumento?.id ?? "",
    saldoEfectivo: compra.saldoEfectivo?.id ?? "",
    saldoInversion: compra.saldoInversion?.id ?? "",
    cantidad: compra.cantidad,
    precio: compra.precio,
    divisa: compra.divisa,
    cambio: compra.cambio ?? "",
    importeEur: compra.importeEur,
    comisionEur: compra.comisionEur ?? "",
    concepto: compra.concepto ?? "",
    nota: compra.nota ?? "",
    motivo: "",
  };
}
function scaled(value: string, scale: number) {
  if (!/^(0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > scale) return null;
  return BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, "0"));
}
function centsText(value: bigint) {
  const negative = value < 0n,
    abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}
function localReference(form: Form) {
  if (form.divisa !== "EUR" && !form.cambio.trim()) return null;
  const cantidad = scaled(form.cantidad, 8),
    precio = scaled(form.precio, 6),
    cambio =
      form.divisa === "EUR"
        ? 1_000_000n
        : scaled(form.cambio, 6);
  if (cantidad === null || precio === null || cambio === null) return null;
  const denominator = 10n ** 18n,
    cents = (cantidad * precio * cambio + denominator / 2n) / denominator;
  return centsText(cents);
}
function localDifference(form: Form) {
  const referenceValue = localReference(form);
  if (referenceValue === null || !/^\d+(\.\d{1,2})?$/.test(form.importeEur))
    return null;
  const [whole, fraction = ""] = form.importeEur.split("."),
    importe = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return centsText(importe - BigInt(referenceValue.replace(".", "")));
}
function tab(path: string) {
  return path.startsWith(BASE + "/valoracion")
    ? "valoracion"
    : path.startsWith(BASE + "/ventas")
      ? "ventas"
      : path.startsWith(BASE + "/compras")
        ? "compras"
        : "instrumentos";
}
export function Tabs({ active, go }: { active: string; go: (path: string) => void }) {
  return (
    <nav className="classification-tabs" aria-label="Secciones de Inversiones">
      <a
        href={BASE}
        aria-current={active === "instrumentos" ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          go(BASE);
        }}
      >
        Instrumentos
      </a>
      <a
        href={BASE + "/compras"}
        aria-current={active === "compras" ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          go(BASE + "/compras");
        }}
      >
        Compras
      </a>
      <a
        href={BASE + "/ventas"}
        aria-current={active === "ventas" ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          go(BASE + "/ventas");
        }}
      >
        Ventas
      </a>
      <a
        href={BASE + "/valoracion"}
        aria-current={active === "valoracion" ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          go(BASE + "/valoracion");
        }}
      >
        Valoración
      </a>
    </nav>
  );
}
export function CoverageNote() {
  return (
    <p className="help">
      Posición calculada solo con las operaciones registradas; no incluye
      histórico anterior no importado. Sin valoración hasta E4.3.
    </p>
  );
}
export function CashLines({
  options,
  error,
}: {
  options: Options | null;
  error?: boolean;
}) {
  return (
    <section className="panel inversiones-cash" aria-label="Efectivo del bróker">
      <div className="panel-head">
        <h2>Efectivo del bróker (por Saldo, sin total agregado)</h2>
        <a href="/saldos">Ver Saldos</a>
      </div>
      {error ? (
        <p>
          No disponible. No se pudo calcular el efectivo del bróker; no se declara
          cero.
        </p>
      ) : !options ? (
        <p role="status">Cargando efectivo…</p>
      ) : options.saldosEfectivo.length === 0 ? (
        <p>
          Sin Saldo Efectivo/Inversiones activo. El alta de Compras queda
          bloqueada hasta crear uno en Saldos.
        </p>
      ) : (
        <ul className="inversiones-cash-list">
          {options.saldosEfectivo.map((saldo) => (
            <li key={saldo.id}>
              <span>
                {saldo.id} · {saldo.nombre}
              </span>
              <strong>{eur(saldo.disponible)}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="help">{options?.cobertura ?? ""}</p>
    </section>
  );
}
export { type Compra, type Options, type Instrumento, type Position };

export function Inversiones({
  path,
  go,
}: {
  path: string;
  go: (path: string) => void;
}) {
  if (path === BASE) return <InstrumentList go={go} />;
  if (path === BASE + "/instrumentos/nuevo")
    return <InstrumentForm go={go} />;
  const edit = path.match(/^\/inversiones\/instrumentos\/(I\d+)\/editar$/);
  if (edit) return <InstrumentForm key={path} id={edit[1]} go={go} />;
  const detail = path.match(/^\/inversiones\/instrumentos\/(I\d+)$/);
  if (detail)
    return <InstrumentDetail key={path} id={detail[1]} go={go} />;
  if (path === BASE + "/compras") return <PurchaseList go={go} />;
  if (path === BASE + "/compras/nueva")
    return <PurchaseForm go={go} />;
  const rectify = path.match(/^\/inversiones\/compras\/(\d+)\/rectificar$/);
  if (rectify)
    return <PurchaseForm key={path} id={rectify[1]} mode="rectificar" go={go} />;
  const annul = path.match(/^\/inversiones\/compras\/(\d+)\/anular$/);
  if (annul)
    return <AnnulPurchase key={path} id={annul[1]} go={go} />;
  const purchase = path.match(/^\/inversiones\/compras\/(\d+)$/);
  if (purchase)
    return <PurchaseDetail key={path} id={purchase[1]} go={go} />;
  if (path === BASE + "/ventas")
    return <SaleList go={go} />;
  if (path === BASE + "/ventas/nueva") return <SaleForm go={go} />;
  const saleRectify = path.match(/^\/inversiones\/ventas\/(\d+)\/rectificar$/);
  if (saleRectify)
    return <SaleForm key={path} id={saleRectify[1]} mode="rectificar" go={go} />;
  const saleAnnul = path.match(/^\/inversiones\/ventas\/(\d+)\/anular$/);
  if (saleAnnul)
    return <AnnulSale key={path} id={saleAnnul[1]} go={go} />;
  const sale = path.match(/^\/inversiones\/ventas\/(\d+)$/);
  if (sale) return <SaleDetail key={path} id={sale[1]} go={go} />;
  const valoracionPath = path.split("?")[0];
  if (
    valoracionPath === BASE + "/valoracion" ||
    valoracionPath.startsWith(BASE + "/valoracion/")
  )
    return (
      <Valoracion
        path={path}
        go={go}
        tabs={<Tabs active="valoracion" go={go} />}
      />
    );
  return <Alert>Página no encontrada.</Alert>;
}
function InstrumentList({ go }: { go: (path: string) => void }) {
  const [search, setSearch] = useState(""),
    [estado, setEstado] = useState(""),
    [data, setData] = useState<{
      instrumentos: Instrumento[];
      total: number;
      cobertura: string;
    } | null>(null),
    [options, setOptions] = useState<Options | null>(null),
    [optionsError, setOptionsError] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [page, setPage] = useState(1);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    setOptionsError(false);
    api<{ instrumentos: Instrumento[]; total: number; cobertura: string }>(
      `${BASE.replace("/inversiones", "")}/instrumentos?busqueda=${encodeURIComponent(search)}&estado=${estado}&page=${page}`,
    )
      .then((value) => live && setData(value))
      .catch(
        (value) =>
          live &&
          setError(
            "No se pudo leer el registro de Instrumentos. " + value.message,
          ),
      );
    api<Options>("/instrumentos/opciones")
      .then((value) => live && setOptions(value))
      .catch(() => live && setOptionsError(true));
    return () => {
      live = false;
    };
  }, [search, estado, page, retry]);
  const columns: TableColumn<Instrumento>[] = [
    { id: "id", header: "ID", cell: (instrumento) => instrumento.id },
    {
      id: "nombre",
      header: "Nombre",
      cell: (instrumento) => (
        <a
          href={`${BASE}/instrumentos/${instrumento.id}`}
          onClick={(event) => {
            event.preventDefault();
            go(`${BASE}/instrumentos/${instrumento.id}`);
          }}
        >
          {instrumento.nombre}
        </a>
      ),
      cardCell: (instrumento) => (
        <a
          href={`${BASE}/instrumentos/${instrumento.id}`}
          onClick={(event) => {
            event.preventDefault();
            go(`${BASE}/instrumentos/${instrumento.id}`);
          }}
        >
          {instrumento.id} · {instrumento.nombre}
        </a>
      ),
    },
    {
      id: "isin",
      header: "ISIN",
      cell: (instrumento) => instrumento.isin ?? "—",
    },
    {
      id: "divisa",
      header: "Divisa ref.",
      label: "Divisa de referencia",
      cell: (instrumento) => instrumento.divisaReferencia ?? "—",
    },
    {
      id: "posiciones",
      header: "Posiciones (cantidad)",
      label: "Posiciones",
      cell: (instrumento) =>
        instrumento.posiciones?.length
          ? instrumento.posiciones.map((position) => (
              <div key={position.saldoInversion.id}>
                {position.saldoInversion.id} {position.saldoInversion.nombre} ·{" "}
                {num(position.cantidad)} · {position.compras} compra(s)
              </div>
            ))
          : "Sin posiciones",
    },
    {
      id: "compras",
      header: "Compras",
      cell: (instrumento) => instrumento.comprasVigentes ?? 0,
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (instrumento) => (
        <Tag inactive={instrumento.estado === "Inactiva"}>
          {instrumento.estado}
        </Tag>
      ),
      cardCell: (instrumento) => (
        <>
          <Tag inactive={instrumento.estado === "Inactiva"}>
            {instrumento.estado}
          </Tag>
          <small className="help">
            Valoración: No disponible hasta E4.3
          </small>
        </>
      ),
    },
  ];
  return (
    <div className="inversiones-page">
      <PageHead
        eyebrow="E4.1 · INVERSIONES"
        title="Inversiones"
        description="Instrumentos y Compras · efectivo separado de la posición"
      >
        <button className="primary" onClick={() => go(BASE + "/instrumentos/nuevo")}>
          Nuevo instrumento
        </button>
      </PageHead>
      <Tabs active="instrumentos" go={go} />
      <CashLines options={options} error={optionsError} />
      <section className="catalog-panel inversiones-list" aria-label="Listado de Instrumentos">
        <div className="filters">
          <label>
            Buscar por nombre o ISIN
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre o ISIN"
            />
          </label>
          <label>
            Estado
            <select
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="Activa">Activos</option>
              <option value="Inactiva">Inactivos</option>
            </select>
          </label>
        </div>
        {error ? (
          <Alert retry={() => setRetry((value) => value + 1)}>{error}</Alert>
        ) : !data ? (
          <p role="status">Cargando instrumentos…</p>
        ) : data.instrumentos.length === 0 ? (
          <div className="empty">
            <p className="empty-symbol" aria-hidden="true">◇</p>
            <h2>Sin Instrumentos</h2>
            <p>Crea el primer Instrumento ficticio para registrar Compras.</p>
            <button className="primary" onClick={() => go(BASE + "/instrumentos/nuevo")}>
              Nuevo instrumento
            </button>
          </div>
        ) : (
          <>
            <div className="desktop-list inversiones-desktop">
              <Table
                caption="Instrumentos registrados"
                label="Tabla de instrumentos registrados"
                columns={columns}
                rows={data.instrumentos}
                rowKey={(instrumento) => instrumento.id}
                rowClassName={(instrumento) =>
                  instrumento.estado === "Inactiva"
                    ? "ui-row-inactive"
                    : undefined
                }
                tableClassName="inversiones-table"
              />
            </div>
            <DataList
              columns={columns}
              rows={data.instrumentos}
              rowKey={(instrumento) => instrumento.id}
              rowClassName={(instrumento) =>
                instrumento.estado === "Inactiva"
                  ? "ui-row-inactive"
                  : undefined
              }
              label="Instrumentos registrados móvil"
              className="mobile-list inversiones-mobile"
            />
            <p className="help">{data.cobertura}</p>
            <div className="list-footer">
              <span>{data.total} Instrumento(s) · página {page}</span>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Anterior
                </button>
                <button
                  className="secondary"
                  disabled={page * 100 >= data.total}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
function InstrumentDetail({
  id,
  go,
}: {
  id: string;
  go: (path: string) => void;
}) {
  const [data, setData] = useState<any>(null),
    [audit, setAudit] = useState<AuditRow[]>([]),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [motivo, setMotivo] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setData(null);
    setAudit([]);
    setError("");
  }, [id]);
  useEffect(() => {
    let live = true;
    setError("");
    api(`/instrumentos/${id}`)
      .then((value) => live && setData(value))
      .catch((value) => live && setError(value.message));
    api(`/instrumentos/${id}/auditoria`)
      .then((value) => live && setAudit(value.items))
      .catch(() => live && setAudit([]));
    return () => {
      live = false;
    };
  }, [id, retry]);
  async function changeState(active: boolean) {
    if (!data || !motivo.trim()) return;
    setBusy(true);
    try {
      await api(`/instrumentos/${id}/${active ? "reactivar" : "desactivar"}`, "POST", {
        revision: data.instrumento.revision,
        motivo: motivo.trim(),
      });
      setMotivo("");
      setRetry((value) => value + 1);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error && !data) return <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>;
  if (!data) return <p role="status">Cargando ficha…</p>;
  const instrumento = data.instrumento as Instrumento;
  const positionColumns: TableColumn<Position>[] = [
    {
      id: "saldo",
      header: "Saldo",
      cell: (position) =>
        `${position.saldoInversion.id} · ${position.saldoInversion.nombre}`,
    },
    {
      id: "cantidad",
      header: "Cantidad",
      kind: "amount",
      cell: (position) => num(position.cantidad),
    },
    {
      id: "compras",
      header: "Compras",
      cell: (position) => position.compras,
    },
    {
      id: "ventas",
      header: "Ventas",
      cell: (position) => position.ventas,
    },
    {
      id: "ultimaCompra",
      header: "Última compra",
      cell: (position) => date(position.ultimaCompra),
    },
    {
      id: "ultimaVenta",
      header: "Última venta",
      cell: (position) => date(position.ultimaVenta),
    },
    {
      id: "ultimaOperacion",
      header: "Última operación",
      cell: (position) => date(position.ultimaOperacion),
    },
  ];
  const compraColumns: TableColumn<Compra>[] = [
    { id: "fecha", header: "Fecha", cell: (compra) => date(compra.fecha) },
    {
      id: "efectivo",
      header: "Efectivo",
      cell: (compra) => compra.saldoEfectivo?.id,
    },
    {
      id: "inversion",
      header: "Inversión",
      cell: (compra) => compra.saldoInversion?.id,
    },
    {
      id: "cantidad",
      header: "Cantidad",
      kind: "amount",
      cell: (compra) => num(compra.cantidad),
    },
    {
      id: "precio",
      header: "Precio",
      kind: "amount",
      cell: (compra) => num(compra.precio),
    },
    { id: "divisa", header: "Divisa", cell: (compra) => compra.divisa },
    {
      id: "cambio",
      header: "Cambio",
      kind: "amount",
      cell: (compra) => num(compra.cambio),
    },
    {
      id: "eur",
      header: "EUR cargado",
      kind: "amount",
      cell: (compra) => eur(compra.importeEur),
    },
    {
      id: "comision",
      header: "Comisión",
      kind: "amount",
      cell: (compra) =>
        compra.comisionEur ? eur(compra.comisionEur) : "0,00 €",
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (compra) => (
        <Tag inactive={compra.estado === "Anulada"}>{compra.estado}</Tag>
      ),
    },
  ];
  const ventaColumns: TableColumn<Compra>[] = compraColumns.map((column) =>
    column.id === "eur"
      ? { ...column, header: "EUR cobrado", label: "EUR cobrado" }
      : column,
  );
  return (
    <div className="inversion-detail-page">
      <a
        className="back"
        href={BASE}
        onClick={(event) => {
          event.preventDefault();
          go(BASE);
        }}
      >
        ‹ Volver
      </a>
      <PageHead
        eyebrow={`${instrumento.id} · INSTRUMENTO`}
        title={instrumento.nombre}
        description="Ficha, posiciones por Saldo y hechos registrados"
      >
        <button
          className="secondary"
          onClick={() => go(`${BASE}/instrumentos/${instrumento.id}/editar`)}
        >
          Editar instrumento
        </button>
        <button
          className="secondary"
          disabled={busy || !motivo.trim()}
          onClick={() => changeState(instrumento.estado === "Inactiva")}
        >
          {instrumento.estado === "Inactiva" ? "Reactivar" : "Desactivar"}
        </button>
      </PageHead>
      {error && <Alert>{error}</Alert>}
      <section className="panel" aria-label="Identidad del Instrumento">
        <dl className="detail-grid">
          <div>
            <dt>Estado</dt>
            <dd>
              <Tag inactive={instrumento.estado === "Inactiva"}>
                {instrumento.estado}
              </Tag>
            </dd>
          </div>
          <div>
            <dt>ISIN</dt>
            <dd>{instrumento.isin ?? "Sin ISIN"}</dd>
          </div>
          <div>
            <dt>Evidencia del ISIN</dt>
            <dd>{text(instrumento.isinEvidencia)}</dd>
          </div>
          <div>
            <dt>Divisa de referencia</dt>
            <dd>{instrumento.divisaReferencia ?? "Sin informar"}</dd>
          </div>
          <div>
            <dt>Revisión</dt>
            <dd>{instrumento.revision}</dd>
          </div>
        </dl>
      </section>
      <section className="panel" aria-labelledby="posiciones-title">
        <div className="panel-head">
          <h2 id="posiciones-title">Posiciones por Saldo de inversión</h2>
          <span className="help">{data.cobertura}</span>
        </div>
        {data.posiciones.length === 0 ? (
          <p>
            Sin posiciones registradas; cero verificado del registro de Compras y
            Ventas.
          </p>
        ) : (
          <div className="desktop-list inversiones-desktop">
            <Table
              caption="Posiciones por Saldo"
              label="Tabla de posiciones por Saldo"
              columns={positionColumns}
              rows={data.posiciones}
              rowKey={(position) => position.saldoInversion.id}
              tableClassName="inversiones-table"
            />
          </div>
        )}
        {data.posiciones.length > 0 && (
          <DataList
            columns={positionColumns}
            rows={data.posiciones}
            rowKey={(position) => position.saldoInversion.id}
            label="Posiciones por Saldo móvil"
            className="mobile-list inversiones-mobile"
          />
        )}
        <p className="help">
          Valoración y resultado: {data.valoracion.estado} ·{" "}
          {data.valoracion.motivo}. No disponible hasta E4.3. No se muestra 0.
        </p>
        <div className="form-grid">
          <label>
            Motivo para desactivar o reactivar
            <input
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              aria-label="Motivo de estado del Instrumento"
            />
          </label>
        </div>
      </section>
      <section className="panel" aria-labelledby="compras-instrumento-title">
        <div className="panel-head">
          <h2 id="compras-instrumento-title">
            Compras del Instrumento ({data.compras.length})
          </h2>
          {instrumento.estado === "Activa" && (
            <button
              className="primary"
              onClick={() => go(`${BASE}/compras/nueva?instrumento=${instrumento.id}`)}
            >
              Nueva compra
            </button>
          )}
        </div>
        {data.compras.length === 0 ? (
          <p>Sin compras registradas.</p>
        ) : (
          <div className="desktop-list inversiones-desktop">
            <Table
              caption="Compras del Instrumento"
              label="Tabla de compras del Instrumento"
              columns={compraColumns}
              rows={data.compras}
              rowKey={(compra) => compra.id}
              rowClassName={(compra) =>
                compra.estado === "Anulada" ? "annulled" : undefined
              }
              tableClassName="inversiones-table"
            />
          </div>
        )}
        {data.compras.length > 0 && (
          <DataList
            columns={compraColumns}
            rows={data.compras}
            rowKey={(compra) => compra.id}
            rowClassName={(compra) =>
              compra.estado === "Anulada" ? "annulled" : undefined
            }
            label="Compras del Instrumento móvil"
            className="mobile-list inversiones-mobile"
          />
        )}
      </section>
      <section className="panel" aria-labelledby="ventas-instrumento-title">
        <div className="panel-head">
          <h2 id="ventas-instrumento-title">
            Ventas del Instrumento ({data.ventas.length})
          </h2>
          <button
            className="primary"
            onClick={() => go(`${BASE}/ventas/nueva?instrumento=${instrumento.id}`)}
          >
            Nueva venta
          </button>
        </div>
        {data.ventas.length === 0 ? (
          <p>Sin ventas registradas.</p>
        ) : (
          <>
            <div className="desktop-list inversiones-desktop">
              <Table
                caption="Ventas del Instrumento"
                label="Tabla de ventas del Instrumento"
                columns={ventaColumns}
                rows={data.ventas}
                rowKey={(venta) => venta.id}
                rowClassName={(venta) =>
                  venta.estado === "Anulada" ? "annulled" : undefined
                }
                tableClassName="inversiones-table"
              />
            </div>
            <DataList
              columns={ventaColumns}
              rows={data.ventas}
              rowKey={(venta) => venta.id}
              rowClassName={(venta) =>
                venta.estado === "Anulada" ? "annulled" : undefined
              }
              label="Ventas del Instrumento móvil"
              className="mobile-list inversiones-mobile"
            />
          </>
        )}
        <p className="help">
          Cobertura parcial: solo operaciones registradas; el histórico anterior
          no se importa.
        </p>
      </section>
      <section className="panel" aria-labelledby="auditoria-instrumento-title">
        <h2 id="auditoria-instrumento-title">Auditoría del Instrumento</h2>
        {audit.length === 0 ? (
          <p>Sin cambios auditados.</p>
        ) : (
          <ul className="inversiones-audit">
            {audit.map((row) => (
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
function InstrumentForm({
  id,
  go,
}: {
  id?: string;
  go: (path: string) => void;
}) {
  const [form, setForm] = useState({
      nombre: "",
      isin: "",
      isinEvidencia: "",
      divisaReferencia: "",
      motivo: "",
    }),
    [revision, setRevision] = useState(1),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(!id),
    formRef = useRef<HTMLFormElement>(null),
    alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alertRef.current?.focus();
    });
  }, [error]);
  useEffect(() => {
    if (!id) return;
    let live = true;
    api(`/instrumentos/${id}`)
      .then((data) => {
        if (!live) return;
        setForm({
          nombre: data.instrumento.nombre,
          isin: data.instrumento.isin ?? "",
          isinEvidencia: data.instrumento.isinEvidencia ?? "",
          divisaReferencia: data.instrumento.divisaReferencia ?? "",
          motivo: "",
        });
        setRevision(data.instrumento.revision);
        setLoaded(true);
      })
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [id]);
  function change(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setErrors((current) => ({ ...current, [field]: "" }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    const body: Record<string, unknown> = {
      nombre: form.nombre,
      isin: form.isin || null,
      isinEvidencia: form.isinEvidencia || null,
      divisaReferencia: form.divisaReferencia || null,
    };
    if (id) Object.assign(body, { revision, motivo: form.motivo });
    try {
      if (id) {
        await api(`/instrumentos/${id}`, "PATCH", body);
        go(`${BASE}/instrumentos/${id}`);
      } else {
        const created = await api<{ instrumento: Instrumento }>(
          "/instrumentos",
          "POST",
          body,
          { "idempotency-key": crypto.randomUUID() },
        );
        go(`${BASE}/instrumentos/${created.instrumento.id}`);
      }
    } catch (value) {
      const apiError = value as ApiError;
      setError(apiError.message);
      setErrors(apiError.fields ?? {});
    } finally {
      setBusy(false);
    }
  }
  if (!loaded) return <p role="status">Cargando instrumento…</p>;
  return (
    <>
      <a
        className="back"
        href={id ? `${BASE}/instrumentos/${id}` : BASE}
        onClick={(event) => {
          event.preventDefault();
          go(id ? `${BASE}/instrumentos/${id}` : BASE);
        }}
      >
        ‹ Volver
      </a>
      <PageHead
        eyebrow="E4.1 · INSTRUMENTO"
        title={id ? "Editar instrumento" : "Nuevo instrumento"}
        description="ISIN solo con evidencia; la validación es sintáctica"
      />
      {error && (
        <div ref={alertRef} tabIndex={-1} className="focus-alert">
          <Alert>{error}</Alert>
        </div>
      )}
      <form
        className="saldo-form"
        onSubmit={submit}
        noValidate
        ref={formRef}
      >
        <FormSection title="Identificación">
          <FormGrid>
            <Field id="nombre" label="Nombre *" error={errors.nombre}>
              <input
                value={form.nombre}
                onChange={(event) => change("nombre", event.target.value)}
                required
              />
            </Field>
            <Field id="isin" label="ISIN (opcional)" error={errors.isin}>
              <input
                value={form.isin}
                onChange={(event) => change("isin", event.target.value)}
                maxLength={16}
              />
            </Field>
            <Field
              id="isinEvidencia"
              label="Evidencia del ISIN"
              error={errors.isinEvidencia}
            >
              <input
                value={form.isinEvidencia}
                onChange={(event) => change("isinEvidencia", event.target.value)}
              />
            </Field>
            <Field
              id="divisaReferencia"
              label="Divisa de referencia (opcional)"
              error={errors.divisaReferencia}
            >
              <input
                value={form.divisaReferencia}
                onChange={(event) => change("divisaReferencia", event.target.value)}
                placeholder="EUR"
                maxLength={3}
              />
            </Field>
            {id && (
              <Field
                id="motivo"
                label="Motivo de la edición *"
                className="ui-form-span"
                error={errors.motivo}
              >
                <input
                  value={form.motivo}
                  onChange={(event) => change("motivo", event.target.value)}
                  required
                />
              </Field>
            )}
          </FormGrid>
          <p className="help">
            Renombrar conserva el ID y las Compras. Un Instrumento inactivo no se
            ofrece para nuevas Compras.
          </p>
        </FormSection>
        <div className="form-footer">
          <button
            type="button"
            className="secondary"
            onClick={() => go(id ? `${BASE}/instrumentos/${id}` : BASE)}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar instrumento"}
          </button>
        </div>
      </form>
    </>
  );
}
function PurchaseList({ go }: { go: (path: string) => void }) {
  const [options, setOptions] = useState<Options | null>(null),
    [filters, setFilters] = useState({
      instrumento: "",
      saldo: "",
      desde: "",
      hasta: "",
      estado: "",
    }),
    [data, setData] = useState<{
      compras: Compra[];
      total: number;
      resumen: { total: number; vigentes: number; anuladas: number };
      cobertura: string;
    } | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [page, setPage] = useState(1);
  useEffect(() => {
    api<Options>("/instrumentos/opciones")
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    );
    if (filters.estado === "") query.set("estado", "");
    query.set("page", String(page));
    api(`/compras?${query.toString()}`)
      .then((value) => live && setData(value))
      .catch(
        (value) =>
          live &&
          setError("No se pudo leer el registro de Compras. " + value.message),
      );
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  useEffect(() => setPage(1), [filters]);
  const columns: TableColumn<Compra>[] = [
    { id: "fecha", header: "Fecha", cell: (compra) => date(compra.fecha) },
    {
      id: "instrumento",
      header: "Instrumento",
      cell: (compra) => `${compra.instrumento?.id} · ${compra.instrumento?.nombre}`,
    },
    {
      id: "efectivo",
      header: "Efvo.",
      label: "Efectivo",
      cell: (compra) => compra.saldoEfectivo?.id,
    },
    {
      id: "inversion",
      header: "Inv.",
      label: "Inversión",
      cell: (compra) => compra.saldoInversion?.id,
    },
    {
      id: "cantidad",
      header: "Cantidad",
      kind: "amount",
      cell: (compra) => num(compra.cantidad),
    },
    {
      id: "precio",
      header: "Precio",
      kind: "amount",
      cell: (compra) => num(compra.precio),
    },
    { id: "divisa", header: "Divisa", cell: (compra) => compra.divisa },
    {
      id: "cambio",
      header: "Cambio",
      kind: "amount",
      cell: (compra) => num(compra.cambio),
    },
    {
      id: "eur",
      header: "EUR cargado",
      kind: "amount",
      cell: (compra) => eur(compra.importeEur),
    },
    {
      id: "comision",
      header: "Comisión",
      kind: "amount",
      cell: (compra) =>
        compra.comisionEur ? eur(compra.comisionEur) : "0,00 €",
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (compra) => (
        <Tag inactive={compra.estado === "Anulada"}>{compra.estado}</Tag>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      kind: "actions",
      cell: (compra) => (
        <>
          <button
            className="text-button"
            onClick={() => go(`${BASE}/compras/${compra.id}`)}
          >
            Ver
          </button>
          {compra.estado === "Vigente" && (
            <>
              <button
                className="text-button"
                onClick={() => go(`${BASE}/compras/${compra.id}/rectificar`)}
              >
                Rectificar
              </button>
              <button
                className="text-button"
                onClick={() => go(`${BASE}/compras/${compra.id}/anular`)}
              >
                Anular
              </button>
            </>
          )}
        </>
      ),
    },
  ];
  return (
    <>
      <PageHead
        eyebrow="E4.1 · INVERSIONES"
        title="Compras de inversión"
        description="Hechos del registro de inversión; no son Movimientos"
      >
        <button className="primary" onClick={() => go(`${BASE}/compras/nueva`)}>
          Nueva compra
        </button>
      </PageHead>
      <Tabs active="compras" go={go} />
      <section className="catalog-panel inversiones-list" aria-label="Listado de Compras">
        <div className="filters inversiones-filters">
          <label>
            Instrumento
            <select
              value={filters.instrumento}
              onChange={(event) =>
                setFilters({ ...filters, instrumento: event.target.value })
              }
            >
              <option value="">Todos</option>
              {options?.instrumentos.map((instrumento) => (
                <option key={instrumento.id} value={instrumento.id}>
                  {instrumento.id} · {instrumento.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Saldo
            <select
              value={filters.saldo}
              onChange={(event) => setFilters({ ...filters, saldo: event.target.value })}
            >
              <option value="">Todos</option>
              {options && (
                <>
                  {options.saldosEfectivo.map((saldo) => (
                    <option key={saldo.id} value={saldo.id}>
                      {saldo.id} · {saldo.nombre} (efectivo)
                    </option>
                  ))}
                  {options.saldosInversion.map((saldo) => (
                    <option key={saldo.id} value={saldo.id}>
                      {saldo.id} · {saldo.nombre} (inversión)
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={filters.desde}
              onChange={(event) => setFilters({ ...filters, desde: event.target.value })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filters.hasta}
              onChange={(event) => setFilters({ ...filters, hasta: event.target.value })}
            />
          </label>
          <label>
            Estado
            <select
              value={filters.estado}
              onChange={(event) => setFilters({ ...filters, estado: event.target.value })}
            >
              <option value="">Todas</option>
              <option value="Vigente">Vigentes</option>
              <option value="Anulada">Anuladas</option>
            </select>
          </label>
        </div>
        {error ? (
          <Alert retry={() => setRetry((value) => value + 1)}>{error}</Alert>
        ) : !data ? (
          <p role="status">Cargando compras…</p>
        ) : data.compras.length === 0 ? (
          <div className="empty">
            <p className="empty-symbol" aria-hidden="true">◇</p>
            <h2>Sin compras registradas</h2>
            <p>Registra una Compra ficticia para ver la posición.</p>
            <button className="primary" onClick={() => go(`${BASE}/compras/nueva`)}>
              Nueva compra
            </button>
          </div>
        ) : (
          <>
            <p className="help">
              Todas ({data.resumen.total}) · {data.resumen.vigentes} vigentes ·{" "}
              {data.resumen.anuladas} anulada(s). {data.cobertura}
            </p>
            <div className="desktop-list inversiones-desktop">
              <Table
                caption="Compras registradas"
                label="Tabla de compras registradas"
                columns={columns}
                rows={data.compras}
                rowKey={(compra) => compra.id}
                rowClassName={(compra) =>
                  compra.estado === "Anulada" ? "annulled" : undefined
                }
                tableClassName="inversiones-table"
              />
            </div>
            <DataList
              columns={columns}
              rows={data.compras}
              rowKey={(compra) => compra.id}
              rowClassName={(compra) =>
                compra.estado === "Anulada" ? "annulled" : undefined
              }
              label="Compras registradas móvil"
              className="mobile-list inversiones-mobile"
            />
            <div className="list-footer">
              <span>{data.total} Compra(s) · página {page}</span>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Anterior
                </button>
                <button
                  className="secondary"
                  disabled={page * 100 >= data.total}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
function PurchaseFields({
  form,
  change,
  options,
  errors,
  locked,
}: {
  form: Form;
  change: (field: keyof Form, value: string) => void;
  options: Options | null;
  errors: Record<string, string>;
  locked: boolean;
}) {
  const referenceValue = localReference(form),
    difference = localDifference(form);
  return (
    <>
      <FormSection title="Datos de la operación">
        <FormGrid>
          <Field id="fecha" label="Fecha *" error={errors.fecha}>
            <input
              type="date"
              value={form.fecha}
              onChange={(event) => change("fecha", event.target.value)}
              required
            />
          </Field>
          <Field id="instrumento" label="Instrumento *" error={errors.instrumento}>
            <select
              value={form.instrumento}
              onChange={(event) => change("instrumento", event.target.value)}
              disabled={locked}
              required
            >
              <option value="">Selecciona Instrumento</option>
              {options?.instrumentos.map((instrumento) => (
                <option key={instrumento.id} value={instrumento.id}>
                  {instrumento.id} · {instrumento.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="saldoEfectivo"
            label="Saldo de efectivo *"
            error={errors.saldoEfectivo}
          >
            <select
              value={form.saldoEfectivo}
              onChange={(event) => change("saldoEfectivo", event.target.value)}
              disabled={locked}
              required
            >
              <option value="">Selecciona Saldo de efectivo</option>
              {options?.saldosEfectivo.map((saldo) => (
                <option key={saldo.id} value={saldo.id}>
                  {saldo.id} · {saldo.nombre} · {eur(saldo.disponible)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="saldoInversion"
            label="Saldo de inversión *"
            error={errors.saldoInversion}
          >
            <select
              value={form.saldoInversion}
              onChange={(event) => change("saldoInversion", event.target.value)}
              disabled={locked}
              required
            >
              <option value="">Selecciona Saldo de inversión</option>
              {options?.saldosInversion.map((saldo) => (
                <option key={saldo.id} value={saldo.id}>
                  {saldo.id} · {saldo.nombre}
                </option>
              ))}
            </select>
          </Field>
        </FormGrid>
      </FormSection>
      <FormSection title="Importe y divisa">
        <FormGrid>
          <Field id="cantidad" label="Cantidad *" error={errors.cantidad}>
            <input
              value={form.cantidad}
              onChange={(event) => change("cantidad", event.target.value)}
              inputMode="decimal"
              required
            />
          </Field>
          <Field id="precio" label="Precio unitario *" error={errors.precio}>
            <input
              value={form.precio}
              onChange={(event) => change("precio", event.target.value)}
              inputMode="decimal"
              required
            />
          </Field>
          <Field id="divisa" label="Divisa *" error={errors.divisa}>
            <select
              value={form.divisa}
              onChange={(event) => change("divisa", event.target.value)}
              required
            >
              {options?.divisas.map((divisa) => (
                <option key={divisa} value={divisa}>
                  {divisa}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="cambio"
            label={`Cambio histórico ${
              form.divisa === "EUR" ? "(EUR = 1 o vacío)" : "*"
            }`}
            error={errors.cambio}
          >
            <input
              value={form.cambio}
              onChange={(event) => change("cambio", event.target.value)}
              inputMode="decimal"
              disabled={form.divisa === "EUR" && form.cambio === ""}
              required={form.divisa !== "EUR"}
            />
          </Field>
          <Field
            id="importeEur"
            label="Importe EUR cargado *"
            error={errors.importeEur}
          >
            <input
              value={form.importeEur}
              onChange={(event) => change("importeEur", event.target.value)}
              inputMode="decimal"
              required
            />
          </Field>
          <Field
            id="comisionEur"
            label="Comisión EUR (incluida)"
            error={errors.comisionEur}
          >
            <input
              value={form.comisionEur}
              onChange={(event) => change("comisionEur", event.target.value)}
              inputMode="decimal"
            />
          </Field>
        </FormGrid>
        <p className="help">
          Referencia cantidad×precio×cambio:{" "}
          {referenceValue ? eur(referenceValue) : "No calculable"} · Diferencia:{" "}
          {difference ? eur(difference) : "No calculable"}. La referencia y la
          diferencia son informativas; el efectivo baja exactamente por el importe
          cargado. La comisión incluida no se resta otra vez.
        </p>
      </FormSection>
      <FormSection title="Detalle">
        <FormGrid>
          <Field id="concepto" label="Concepto" error={errors.concepto}>
            <input
              value={form.concepto}
              onChange={(event) => change("concepto", event.target.value)}
            />
          </Field>
          <Field
            id="nota"
            label="Nota"
            className="ui-form-span"
            error={errors.nota}
          >
            <textarea
              value={form.nota}
              onChange={(event) => change("nota", event.target.value)}
            />
          </Field>
        </FormGrid>
      </FormSection>
    </>
  );
}
export function ImpactPanel({ impact }: { impact: Impact }) {
  return (
    <section className="panel inversiones-impact" aria-label="Impacto de la operación">
      <h2 tabIndex={-1}>Impacto (no escribe hasta confirmar)</h2>
      <dl className="detail-grid">
        <div>
          <dt>Efectivo {impact.impacto.efectivo.saldo.id}</dt>
          <dd>
            antes {eur(impact.impacto.efectivo.antes)} → después{" "}
            <strong>{eur(impact.impacto.efectivo.despues)}</strong>
          </dd>
        </div>
        <div>
          <dt>
            Posición {impact.impacto.posicion.saldoInversion?.id ?? "—"} ·{" "}
            {impact.impacto.posicion.instrumento?.id ?? "—"}
          </dt>
          <dd>
            antes {num(impact.impacto.posicion.antes)} → después{" "}
            <strong>{num(impact.impacto.posicion.despues)}</strong>
          </dd>
        </div>
      </dl>
      <p className="help">{impact.aviso}</p>
    </section>
  );
}
function PurchaseForm({
  id,
  mode,
  go,
}: {
  id?: string;
  mode?: "rectificar";
  go: (path: string) => void;
}) {
  const rectifying = Boolean(id && mode === "rectificar");
  const [options, setOptions] = useState<Options | null>(null),
    [form, setForm] = useState<Form>(blank),
    [revision, setRevision] = useState(1),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [impact, setImpactState] = useState<Impact | null>(null),
    [busy, setBusy] = useState(false),
    [stale, setStale] = useState(false),
    [loaded, setLoaded] = useState(!rectifying),
    attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null),
    formRef = useRef<HTMLFormElement>(null);
  const queryInstrument = new URLSearchParams(location.search).get("instrumento");
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alert.current?.focus();
    });
  }, [error]);
  useEffect(() => {
    api<Options>("/instrumentos/opciones")
      .then((value) => {
        setOptions(value);
        if (!rectifying && queryInstrument)
          setForm((current) => ({ ...current, instrumento: queryInstrument }));
      })
      .catch((value) => setError(value.message));
  }, [rectifying, queryInstrument]);
  useEffect(() => {
    if (!rectifying || !id) return;
    let live = true;
    api(`/compras/${id}`)
      .then((value) => {
        if (!live) return;
        setForm(formOf(value.compra));
        setRevision(value.compra.revision);
        setLoaded(true);
      })
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [rectifying, id]);
  function change(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setImpactState(null);
    setError("");
    setStale(false);
    setErrors((current) => ({ ...current, [field]: "" }));
    attempt.current = crypto.randomUUID();
  }
  function payload(includeMotivo: boolean) {
    const body: Record<string, unknown> = {
      fecha: form.fecha,
      cantidad: form.cantidad,
      precio: form.precio,
      divisa: form.divisa,
      cambio: form.divisa === "EUR" ? (form.cambio || null) : form.cambio,
      importeEur: form.importeEur,
      comisionEur: form.comisionEur || null,
      concepto: form.concepto || null,
      nota: form.nota || null,
    };
    if (!rectifying) {
      body.instrumento = form.instrumento;
      body.saldoEfectivo = form.saldoEfectivo;
      body.saldoInversion = form.saldoInversion;
    }
    if (rectifying) {
      body.revision = revision;
      if (includeMotivo) body.motivo = form.motivo;
    }
    return body;
  }
  async function review(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    try {
      const result = await api<Impact>(
        rectifying ? `/compras/${id}/impacto` : "/compras/impacto",
        "POST",
        payload(rectifying),
      );
      setImpactState(result);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".inversiones-impact h2")?.focus(),
      );
    } catch (value) {
      const apiError = value as ApiError;
      setError(apiError.message);
      setErrors(apiError.fields ?? {});
      setStale(apiError.code === "REVISION_CONFLICT");
    } finally {
      setBusy(false);
    }
  }
  async function refreshRevision() {
    if (!id) return;
    try {
      const value = await api(`/compras/${id}`);
      setRevision(value.compra.revision);
      setStale(false);
      setError("");
    } catch (value) {
      setError((value as Error).message);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ compra: Compra }>(
        rectifying ? `/compras/${id}/rectificar` : "/compras",
        "POST",
        payload(rectifying),
        rectifying ? {} : { "idempotency-key": attempt.current },
      );
      go(`${BASE}/compras/${result.compra.id}`);
    } catch (value) {
      const apiError = value as ApiError;
      setError(apiError.message);
      setErrors(apiError.fields ?? {});
      setStale(apiError.code === "REVISION_CONFLICT");
    } finally {
      setBusy(false);
    }
  }
  if (!loaded) return <p role="status">Cargando compra…</p>;
  const noCash = options && options.saldosEfectivo.length === 0;
  return (
    <>
      <a
        className="back"
        href={rectifying ? `${BASE}/compras/${id}` : `${BASE}/compras`}
        onClick={(event) => {
          event.preventDefault();
          go(rectifying ? `${BASE}/compras/${id}` : `${BASE}/compras`);
        }}
      >
        ‹ Volver
      </a>
      <Tabs active="compras" go={go} />
      <PageHead
        eyebrow="E4.1 · COMPRA"
        title={rectifying ? `Rectificar compra ${id}` : "Nueva compra"}
        description="Los Saldos se eligen explícitamente; no hay preselección automática"
      />
      {error && (
        <div ref={alert} tabIndex={-1} className="focus-alert">
          <Alert>
            {error}
            {stale && rectifying && (
              <p>
                <button className="secondary" type="button" onClick={refreshRevision}>
                  Actualizar revisión conservando el borrador
                </button>
              </p>
            )}
          </Alert>
        </div>
      )}
      {noCash && !rectifying && (
        <Alert>
          No hay ningún Saldo Efectivo/Inversiones activo. El alta está bloqueada:
          crea o reactiva un Saldo en Saldos.
        </Alert>
      )}
      <form
        className="saldo-form"
        onSubmit={review}
        noValidate
        ref={formRef}
      >
        <PurchaseFields
          form={form}
          change={change}
          options={options}
          errors={errors}
          locked={rectifying}
        />
        {rectifying && (
          <FormSection title="Motivo de la rectificación">
            <FormGrid>
              <Field
                id="motivo"
                label="Motivo *"
                className="ui-form-span"
                error={errors.motivo}
              >
                <input
                  value={form.motivo}
                  onChange={(event) => change("motivo", event.target.value)}
                  required
                />
              </Field>
            </FormGrid>
            <p className="help">Revisión actual {revision} → se guardará {revision + 1}.</p>
          </FormSection>
        )}
        {impact && <ImpactPanel impact={impact} />}
        <div className="form-footer">
          <button
            type="button"
            className="secondary"
            onClick={() => go(rectifying ? `${BASE}/compras/${id}` : `${BASE}/compras`)}
          >
            Cancelar
          </button>
          {impact ? (
            <button
              type="button"
              className="primary"
              disabled={busy || (rectifying && !form.motivo.trim())}
              onClick={confirm}
            >
              {busy
                ? "Guardando…"
                : rectifying
                  ? "Confirmar rectificación"
                  : "Confirmar compra"}
            </button>
          ) : (
            <button
              className="primary"
              disabled={busy || Boolean(noCash && !rectifying)}
            >
              {busy ? "Revisando…" : "Revisar compra"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
function PurchaseDetail({ id, go }: { id: string; go: (path: string) => void }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    api(`/compras/${id}`)
      .then((value) => live && setData(value))
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [id, retry]);
  if (error) return <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>;
  if (!data) return <p role="status">Cargando compra…</p>;
  const compra = data.compra as Compra;
  return (
    <>
      <a
        className="back"
        href={BASE + "/compras"}
        onClick={(event) => {
          event.preventDefault();
          go(BASE + "/compras");
        }}
      >
        ‹ Volver
      </a>
      <Tabs active="compras" go={go} />
      <PageHead
        eyebrow={`${compra.id} · COMPRA`}
        title={`${compra.instrumento?.id} · ${compra.instrumento?.nombre}`}
        description={`${date(compra.fecha)} · ${compra.estado}`}
      >
        {compra.estado === "Vigente" && (
          <>
            <button
              className="secondary"
              onClick={() => go(`${BASE}/compras/${compra.id}/rectificar`)}
            >
              Rectificar
            </button>
            <button
              className="secondary"
              onClick={() => go(`${BASE}/compras/${compra.id}/anular`)}
            >
              Anular
            </button>
          </>
        )}
      </PageHead>
      <section className="panel" aria-label="Datos de la Compra">
        <dl className="detail-grid">
          <div>
            <dt>Saldo efectivo</dt>
            <dd>
              {compra.saldoEfectivo?.id} · {compra.saldoEfectivo?.nombre}
            </dd>
          </div>
          <div>
            <dt>Saldo inversión</dt>
            <dd>
              {compra.saldoInversion?.id} · {compra.saldoInversion?.nombre}
            </dd>
          </div>
          <div>
            <dt>Cantidad</dt>
            <dd>{num(compra.cantidad)}</dd>
          </div>
          <div>
            <dt>Precio</dt>
            <dd>
              {num(compra.precio)} {compra.divisa}
            </dd>
          </div>
          <div>
            <dt>Cambio histórico</dt>
            <dd>{compra.cambio ? num(compra.cambio) : "EUR = 1 (sin captura)"}</dd>
          </div>
          <div>
            <dt>Importe EUR cargado</dt>
            <dd>{eur(compra.importeEur)}</dd>
          </div>
          <div>
            <dt>Comisión incluida</dt>
            <dd>{compra.comisionEur ? eur(compra.comisionEur) : "0,00 €"}</dd>
          </div>
          <div>
            <dt>Revisión</dt>
            <dd>{compra.revision}</dd>
          </div>
          <div>
            <dt>Concepto</dt>
            <dd>{compra.concepto ?? "—"}</dd>
          </div>
          <div>
            <dt>Nota</dt>
            <dd>{compra.nota ?? "—"}</dd>
          </div>
        </dl>
        <p className="help">
          Referencia informativa: {eur(compra.referencia.calculo)} · Diferencia:{" "}
          {eur(compra.referencia.diferencia)}. {compra.referencia.nota}
        </p>
      </section>
      <section className="panel" aria-label="Auditoría de la Compra">
        <h2>Auditoría de la Compra</h2>
        {data.auditoria.length === 0 ? (
          <p>Sin cambios auditados.</p>
        ) : (
          <ul className="inversiones-audit">
            {data.auditoria.map((row: AuditRow) => (
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
export function AnnulPurchaseMotivo({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <Field id="motivo" label="Motivo *" error={error}>
      <input value={value} onChange={onChange} required />
    </Field>
  );
}

function AnnulPurchase({ id, go }: { id: string; go: (path: string) => void }) {
  const [data, setData] = useState<any>(null),
    [impact, setImpactState] = useState<Impact | null>(null),
    [motivo, setMotivo] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    alert = useRef<HTMLDivElement>(null),
    formRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let live = true;
    api(`/compras/${id}`)
      .then((value) => live && setData(value))
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [id]);
  async function review() {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      setImpactState(
        await api<Impact>(`/compras/${id}/impacto-anulacion`, "POST", {
          revision: data.compra.revision,
        }),
      );
    } catch (value) {
      fail(value);
    } finally {
      setBusy(false);
    }
  }
  function fail(value: unknown) {
    const apiError = value as ApiError;
    setError(apiError.message);
    setFields(apiError.fields ?? {});
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alert.current?.focus();
    });
  }
  async function confirm() {
    if (!data || !motivo.trim()) return;
    setBusy(true);
    try {
      const result = await api<{ compra: Compra }>(`/compras/${id}/anular`, "POST", {
        revision: data.compra.revision,
        motivo: motivo.trim(),
      });
      go(`${BASE}/compras/${result.compra.id}`);
    } catch (value) {
      fail(value);
    } finally {
      setBusy(false);
    }
  }
  if (error && !data) return <Alert>{error}</Alert>;
  if (!data) return <p role="status">Cargando compra…</p>;
  if (data.compra.estado !== "Vigente")
    return <Alert>La Compra ya está anulada; no se puede rectificar.</Alert>;
  return (
    <>
      <a
        className="back"
        href={`${BASE}/compras/${id}`}
        onClick={(event) => {
          event.preventDefault();
          go(`${BASE}/compras/${id}`);
        }}
      >
        ‹ Volver
      </a>
      <Tabs active="compras" go={go} />
      <PageHead
        eyebrow={`${id} · ANULACIÓN`}
        title="Anular compra"
        description="El registro se conserva como Anulada; no se borra"
      />
      {error && (
        <div ref={alert} tabIndex={-1} className="focus-alert">
          <Alert>{error}</Alert>
        </div>
      )}
      {impact && <ImpactPanel impact={impact} />}
      <section className="panel" ref={formRef}>
        <AnnulPurchaseMotivo
          value={motivo}
          error={fields.motivo}
          onChange={(event) => {
            setMotivo(event.target.value);
            setError("");
            setFields((current) => ({ ...current, motivo: "" }));
          }}
        />
        <p className="help">
          Revisión actual {data.compra.revision} → se guardará{" "}
          {data.compra.revision + 1}. La Compra anulada deja de computar en
          efectivo y posición.
        </p>
        <div className="form-footer">
          {!impact ? (
            <button className="primary" onClick={review} disabled={busy}>
              {busy ? "Calculando…" : "Ver impacto de anulación"}
            </button>
          ) : (
            <button
              className="primary"
              onClick={confirm}
              disabled={busy || !motivo.trim()}
            >
              {busy ? "Anulando…" : "Anular compra"}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
