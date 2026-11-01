import { useEffect, useRef, useState } from "react";
import { api, ApiError, eur } from "./api";
import { Alert, PageHead, Tag } from "./ui";
import {
  BASE,
  CashLines,
  CoverageNote,
  ImpactPanel,
  Tabs,
  date,
  num,
  type Compra,
  type Impact,
  type Options,
} from "./Inversiones";

/**
 * E4.2 Ventas UI (SPEC22 W11–W16, D4). A Venta is a fact of the investment
 * register: it never creates a Movimiento and never uses Partida, Referencia,
 * Ciclo, Presupuesto or Deuda. Amounts are exact strings from the API.
 */
type SaleFormState = {
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
const blank: SaleFormState = {
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
function formOf(sale: Compra): SaleFormState {
  return {
    fecha: sale.fecha,
    instrumento: sale.instrumento?.id ?? "",
    saldoEfectivo: sale.saldoEfectivo?.id ?? "",
    saldoInversion: sale.saldoInversion?.id ?? "",
    cantidad: sale.cantidad,
    precio: sale.precio,
    divisa: sale.divisa,
    cambio: sale.cambio ?? "",
    importeEur: sale.importeEur,
    comisionEur: sale.comisionEur ?? "",
    concepto: sale.concepto ?? "",
    nota: sale.nota ?? "",
    motivo: "",
  };
}
function scaled(value: string, scale: number) {
  if (!/^(0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > scale) return null;
  return (
    BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"))
  );
}
function centsText(value: bigint) {
  const negative = value < 0n,
    abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}
function localReference(form: SaleFormState) {
  if (form.divisa !== "EUR" && !form.cambio.trim()) return null;
  const cantidad = scaled(form.cantidad, 8),
    precio = scaled(form.precio, 6),
    cambio = form.divisa === "EUR" ? 1_000_000n : scaled(form.cambio, 6);
  if (cantidad === null || precio === null || cambio === null) return null;
  const denominator = 10n ** 18n;
  return centsText((cantidad * precio * cambio + denominator / 2n) / denominator);
}
function localDifference(form: SaleFormState) {
  const reference = localReference(form);
  if (reference === null || !/^\d+(\.\d{1,2})?$/.test(form.importeEur))
    return null;
  const [whole, fraction = ""] = form.importeEur.split("."),
    importe = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return centsText(importe - BigInt(reference.replace(".", "")));
}

export function SaleList({ go }: { go: (path: string) => void }) {
  const [options, setOptions] = useState<Options | null>(null),
    [filters, setFilters] = useState({
      instrumento: "",
      saldo: "",
      desde: "",
      hasta: "",
      estado: "",
    }),
    [data, setData] = useState<{
      ventas: Compra[];
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
    api(`/ventas?${query.toString()}`)
      .then((value) => live && setData(value))
      .catch(
        (value) =>
          live &&
          setError("No se pudo leer el registro de Ventas. " + value.message),
      );
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  useEffect(() => setPage(1), [filters]);
  return (
    <>
      <PageHead
        eyebrow="E4.2 · INVERSIONES"
        title="Ventas de inversión"
        description="Hechos del registro de inversión; no son Movimientos"
      >
        <button className="primary" onClick={() => go(`${BASE}/ventas/nueva`)}>
          Nueva venta
        </button>
      </PageHead>
      <Tabs active="ventas" go={go} />
      <CashLines options={options} />
      <section className="catalog-panel inversiones-list" aria-label="Listado de Ventas">
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
              onChange={(event) =>
                setFilters({ ...filters, saldo: event.target.value })
              }
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
              onChange={(event) =>
                setFilters({ ...filters, desde: event.target.value })
              }
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filters.hasta}
              onChange={(event) =>
                setFilters({ ...filters, hasta: event.target.value })
              }
            />
          </label>
          <label>
            Estado
            <select
              value={filters.estado}
              onChange={(event) =>
                setFilters({ ...filters, estado: event.target.value })
              }
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
          <p role="status">Cargando ventas…</p>
        ) : data.ventas.length === 0 ? (
          <div className="empty">
            <p className="empty-symbol" aria-hidden="true">
              ◇
            </p>
            <h2>Sin ventas registradas</h2>
            <p>Registra una Venta ficticia para ver la posición y el efectivo.</p>
            <button
              className="primary"
              onClick={() => go(`${BASE}/ventas/nueva`)}
            >
              Nueva venta
            </button>
          </div>
        ) : (
          <>
            <p className="help">
              Todas ({data.resumen.total}) · {data.resumen.vigentes} vigentes ·{" "}
              {data.resumen.anuladas} anulada(s). {data.cobertura}
            </p>
            <div className="desktop-list inversiones-desktop">
              <table className="inversiones-table">
                <caption className="sr-only">Ventas registradas</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Instrumento</th>
                    <th scope="col">Efvo.</th>
                    <th scope="col">Inv.</th>
                    <th scope="col">Cantidad</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Divisa</th>
                    <th scope="col">Cambio</th>
                    <th scope="col">EUR cobrado</th>
                    <th scope="col">Comisión</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ventas.map((venta) => (
                    <tr key={venta.id}>
                      <td>{date(venta.fecha)}</td>
                      <td>
                        {venta.instrumento?.id} · {venta.instrumento?.nombre}
                      </td>
                      <td>{venta.saldoEfectivo?.id}</td>
                      <td>{venta.saldoInversion?.id}</td>
                      <td>{num(venta.cantidad)}</td>
                      <td>{num(venta.precio)}</td>
                      <td>{venta.divisa}</td>
                      <td>{num(venta.cambio)}</td>
                      <td>{eur(venta.importeEur)}</td>
                      <td>
                        {venta.comisionEur ? eur(venta.comisionEur) : "0,00 €"}
                      </td>
                      <td>
                        <Tag inactive={venta.estado === "Anulada"}>
                          {venta.estado}
                        </Tag>
                      </td>
                      <td className="inversiones-actions">
                        <button
                          className="text-button"
                          onClick={() => go(`${BASE}/ventas/${venta.id}`)}
                        >
                          Ver
                        </button>
                        {venta.estado === "Vigente" && (
                          <>
                            <button
                              className="text-button"
                              onClick={() =>
                                go(`${BASE}/ventas/${venta.id}/rectificar`)
                              }
                            >
                              Rectificar
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                go(`${BASE}/ventas/${venta.id}/anular`)
                              }
                            >
                              Anular
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul
              className="mobile-list inversiones-mobile"
              aria-label="Ventas registradas móvil"
            >
              {data.ventas.map((venta) => (
                <li key={venta.id}>
                  <div className="card-head">
                    <strong>
                      {date(venta.fecha)} · {venta.instrumento?.id} ·{" "}
                      {venta.saldoInversion?.id}
                    </strong>
                    <Tag inactive={venta.estado === "Anulada"}>
                      {venta.estado}
                    </Tag>
                  </div>
                  <p>
                    {num(venta.cantidad)} × {num(venta.precio)} {venta.divisa}
                    {venta.cambio ? ` · ${num(venta.cambio)}` : ""}
                  </p>
                  <p>
                    EUR cobrado {eur(venta.importeEur)} · comisión{" "}
                    {venta.comisionEur ? eur(venta.comisionEur) : "0,00 €"}
                  </p>
                  <div className="actions">
                    <button
                      className="text-button"
                      onClick={() => go(`${BASE}/ventas/${venta.id}`)}
                    >
                      Ver
                    </button>
                    {venta.estado === "Vigente" && (
                      <>
                        <button
                          className="text-button"
                          onClick={() =>
                            go(`${BASE}/ventas/${venta.id}/rectificar`)
                          }
                        >
                          Rectificar
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            go(`${BASE}/ventas/${venta.id}/anular`)
                          }
                        >
                          Anular
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="list-footer">
              <span>
                {data.total} Venta(s) · página {page}
              </span>
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
        <CoverageNote />
      </section>
    </>
  );
}

function SaleFields({
  form,
  change,
  options,
  errors,
  locked,
}: {
  form: SaleFormState;
  change: (field: keyof SaleFormState, value: string) => void;
  options: Options | null;
  errors: Record<string, string>;
  locked: boolean;
}) {
  const group = options?.instrumentosVenta.find(
      (entry) => entry.saldoInversion.id === form.saldoInversion,
    ),
    offers = group?.instrumentos ?? [],
    selected = offers.find((row) => row.id === form.instrumento),
    reference = localReference(form),
    difference = localDifference(form);
  return (
    <section className="panel">
      <div className="form-grid">
        <label>
          Fecha *
          <input
            type="date"
            value={form.fecha}
            onChange={(event) => change("fecha", event.target.value)}
            aria-invalid={Boolean(errors.fecha)}
            required
          />
          {errors.fecha && <small className="field-error">{errors.fecha}</small>}
        </label>
        <label>
          Saldo de efectivo *
          <select
            value={form.saldoEfectivo}
            onChange={(event) => change("saldoEfectivo", event.target.value)}
            aria-invalid={Boolean(errors.saldoEfectivo)}
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
          {errors.saldoEfectivo && (
            <small className="field-error">{errors.saldoEfectivo}</small>
          )}
        </label>
        <label>
          Saldo de inversión *
          <select
            value={form.saldoInversion}
            onChange={(event) => {
              change("saldoInversion", event.target.value);
              change("instrumento", "");
            }}
            aria-invalid={Boolean(errors.saldoInversion)}
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
          {errors.saldoInversion && (
            <small className="field-error">{errors.saldoInversion}</small>
          )}
        </label>
        <label>
          Instrumento *
          <select
            value={form.instrumento}
            onChange={(event) => change("instrumento", event.target.value)}
            aria-invalid={Boolean(errors.instrumento)}
            disabled={locked || !form.saldoInversion}
            required
          >
            <option value="">
              {form.saldoInversion
                ? "Selecciona Instrumento con cantidad"
                : "Selecciona primero el Saldo de inversión"}
            </option>
            {offers.map((instrumento) => (
              <option key={instrumento.id} value={instrumento.id}>
                {instrumento.id} · {instrumento.nombre} ·{" "}
                {num(instrumento.cantidad)} disponibles
                {instrumento.estado !== "Activa" ? " · inactivo" : ""}
              </option>
            ))}
          </select>
          {errors.instrumento && (
            <small className="field-error">{errors.instrumento}</small>
          )}
        </label>
        <label>
          Cantidad *
          <input
            value={form.cantidad}
            onChange={(event) => change("cantidad", event.target.value)}
            aria-invalid={Boolean(errors.cantidad)}
            inputMode="decimal"
            required
          />
          {errors.cantidad && (
            <small className="field-error">{errors.cantidad}</small>
          )}
        </label>
        <label>
          Precio unitario *
          <input
            value={form.precio}
            onChange={(event) => change("precio", event.target.value)}
            aria-invalid={Boolean(errors.precio)}
            inputMode="decimal"
            required
          />
          {errors.precio && <small className="field-error">{errors.precio}</small>}
        </label>
        <label>
          Divisa *
          <select
            value={form.divisa}
            onChange={(event) => change("divisa", event.target.value)}
            aria-invalid={Boolean(errors.divisa)}
            required
          >
            {options?.divisas.map((divisa) => (
              <option key={divisa} value={divisa}>
                {divisa}
              </option>
            ))}
          </select>
          {errors.divisa && <small className="field-error">{errors.divisa}</small>}
        </label>
        <label>
          Cambio histórico {form.divisa === "EUR" ? "(EUR = 1 o vacío)" : "*"}
          <input
            value={form.cambio}
            onChange={(event) => change("cambio", event.target.value)}
            aria-invalid={Boolean(errors.cambio)}
            inputMode="decimal"
            disabled={form.divisa === "EUR" && form.cambio === ""}
            required={form.divisa !== "EUR"}
          />
          {errors.cambio && <small className="field-error">{errors.cambio}</small>}
        </label>
        <label>
          EUR cobrado *
          <input
            value={form.importeEur}
            onChange={(event) => change("importeEur", event.target.value)}
            aria-invalid={Boolean(errors.importeEur)}
            inputMode="decimal"
            required
          />
          {errors.importeEur && (
            <small className="field-error">{errors.importeEur}</small>
          )}
        </label>
        <label>
          Comisión EUR (incluida)
          <input
            value={form.comisionEur}
            onChange={(event) => change("comisionEur", event.target.value)}
            aria-invalid={Boolean(errors.comisionEur)}
            inputMode="decimal"
          />
          {errors.comisionEur && (
            <small className="field-error">{errors.comisionEur}</small>
          )}
        </label>
        <label>
          Concepto
          <input
            value={form.concepto}
            onChange={(event) => change("concepto", event.target.value)}
            aria-invalid={Boolean(errors.concepto)}
          />
          {errors.concepto && (
            <small className="field-error">{errors.concepto}</small>
          )}
        </label>
        <label>
          Nota
          <textarea
            value={form.nota}
            onChange={(event) => change("nota", event.target.value)}
            aria-invalid={Boolean(errors.nota)}
          />
          {errors.nota && <small className="field-error">{errors.nota}</small>}
        </label>
      </div>
      <p className="help">
        Referencia cantidad×precio×cambio:{" "}
        {reference ? eur(reference) : "No calculable"} · Diferencia:{" "}
        {difference ? eur(difference) : "No calculable"}. Ambas son informativas;
        el efectivo sube exactamente por el EUR cobrado y la comisión ya incluida
        no se suma otra vez.
      </p>
      <p className="help">
        Cantidad disponible en {form.saldoInversion || "el Saldo de inversión"}:{" "}
        {selected ? num(selected.cantidad) : "selecciona Instrumento"}.
      </p>
      {selected && selected.estado !== "Activa" && (
        <p className="alert" role="status">
          Aviso: el Instrumento está inactivo. La Venta se permite solo por la
          cantidad disponible en este Saldo; no se ofrece para nuevas Compras.
        </p>
      )}
    </section>
  );
}

export function SaleForm({
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
    [form, setForm] = useState<SaleFormState>(blank),
    [revision, setRevision] = useState(1),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [details, setDetails] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState(""),
    [impact, setImpactState] = useState<Impact | null>(null),
    [busy, setBusy] = useState(false),
    [stale, setStale] = useState(false),
    [loaded, setLoaded] = useState(!rectifying),
    attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null);
  const queryInstrument = new URLSearchParams(location.search).get("instrumento");
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
    api(`/ventas/${id}`)
      .then((value) => {
        if (!live) return;
        setForm(formOf(value.venta));
        setRevision(value.venta.revision);
        setLoaded(true);
      })
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [rectifying, id]);
  function change(field: keyof SaleFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setImpactState(null);
    setError("");
    setDetails(null);
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
      cambio: form.divisa === "EUR" ? form.cambio || null : form.cambio,
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
  function failed(value: unknown) {
    const apiError = value as ApiError;
    setError(apiError.message);
    setErrors(apiError.fields ?? {});
    setDetails(apiError.data ?? null);
    setStale(apiError.code === "REVISION_CONFLICT");
    requestAnimationFrame(() => alert.current?.focus());
  }
  async function review(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setDetails(null);
    setErrors({});
    try {
      const result = await api<Impact>(
        rectifying ? `/ventas/${id}/impacto` : "/ventas/impacto",
        "POST",
        payload(rectifying),
      );
      setImpactState(result);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".inversiones-impact h2")?.focus(),
      );
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  }
  async function refreshRevision() {
    if (!id) return;
    try {
      const value = await api(`/ventas/${id}`);
      setRevision(value.venta.revision);
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
      const result = await api<{ venta: Compra }>(
        rectifying ? `/ventas/${id}/rectificar` : "/ventas",
        "POST",
        payload(rectifying),
        rectifying ? {} : { "idempotency-key": attempt.current },
      );
      go(`${BASE}/ventas/${result.venta.id}`);
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  }
  if (!loaded) return <p role="status">Cargando venta…</p>;
  const noCash = options && options.saldosEfectivo.length === 0,
    noPosition =
      options &&
      options.instrumentosVenta.every(
        (entry) => entry.instrumentos.length === 0,
      );
  return (
    <>
      <a
        className="back"
        href={rectifying ? `${BASE}/ventas/${id}` : `${BASE}/ventas`}
        onClick={(event) => {
          event.preventDefault();
          go(rectifying ? `${BASE}/ventas/${id}` : `${BASE}/ventas`);
        }}
      >
        ‹ Volver
      </a>
      <Tabs active="ventas" go={go} />
      <PageHead
        eyebrow="E4.2 · VENTA"
        title={rectifying ? `Rectificar venta ${id}` : "Nueva venta"}
        description="Los Saldos se eligen explícitamente; no hay preselección automática"
      />
      {error && (
        <div ref={alert} tabIndex={-1} className="focus-alert">
          <Alert>
            {error}
            {details && details.minimo ? (
              <p className="help">
                Disponible {String(details.disponible)} · necesario{" "}
                {String(details.necesario)} · mínimo {String(details.minimo)} ·{" "}
                {String(details.fecha)}. El borrador se conserva; no hay override.
              </p>
            ) : null}
            {stale && rectifying && (
              <p>
                <button
                  className="secondary"
                  type="button"
                  onClick={refreshRevision}
                >
                  Actualizar revisión conservando el borrador
                </button>
              </p>
            )}
          </Alert>
        </div>
      )}
      {noCash && !rectifying && (
        <Alert>
          No hay ningún Saldo Efectivo/Inversiones activo. El alta está
          bloqueada: crea o reactiva un Saldo en Saldos.
        </Alert>
      )}
      {noPosition && !rectifying && (
        <Alert>
          No hay ningún Instrumento con cantidad disponible en un Saldo de
          inversión activo. Registra una Compra antes de vender.
        </Alert>
      )}
      <form className="saldo-form" onSubmit={review} noValidate>
        <SaleFields
          form={form}
          change={change}
          options={options}
          errors={errors}
          locked={rectifying}
        />
        {rectifying && (
          <section className="panel">
            <label>
              Motivo *
              <input
                value={form.motivo}
                onChange={(event) => change("motivo", event.target.value)}
                aria-invalid={Boolean(errors.motivo)}
                required
              />
              {errors.motivo && (
                <small className="field-error">{errors.motivo}</small>
              )}
            </label>
            <p className="help">
              Revisión actual {revision} → se guardará {revision + 1}. El
              reemplazo es completo: todos los campos rectificables son
              obligatorios.
            </p>
          </section>
        )}
        {impact && <ImpactPanel impact={impact} />}
        <div className="form-footer">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              go(rectifying ? `${BASE}/ventas/${id}` : `${BASE}/ventas`)
            }
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
                  : "Confirmar venta"}
            </button>
          ) : (
            <button
              className="primary"
              disabled={busy || Boolean(noCash && !rectifying)}
            >
              {busy ? "Revisando…" : "Revisar venta"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export function SaleDetail({ id, go }: { id: string; go: (path: string) => void }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    api(`/ventas/${id}`)
      .then((value) => live && setData(value))
      .catch((value) => live && setError(value.message));
    return () => {
      live = false;
    };
  }, [id, retry]);
  if (error) return <Alert retry={() => setRetry((value) => value + 1)}>{error}</Alert>;
  if (!data) return <p role="status">Cargando venta…</p>;
  const venta = data.venta as Compra;
  return (
    <>
      <a
        className="back"
        href={BASE + "/ventas"}
        onClick={(event) => {
          event.preventDefault();
          go(BASE + "/ventas");
        }}
      >
        ‹ Volver
      </a>
      <Tabs active="ventas" go={go} />
      <PageHead
        eyebrow={`${venta.id} · VENTA`}
        title={`${venta.instrumento?.id} · ${venta.instrumento?.nombre}`}
        description={`${date(venta.fecha)} · ${venta.estado}`}
      >
        {venta.estado === "Vigente" && (
          <>
            <button
              className="secondary"
              onClick={() => go(`${BASE}/ventas/${venta.id}/rectificar`)}
            >
              Rectificar
            </button>
            <button
              className="secondary"
              onClick={() => go(`${BASE}/ventas/${venta.id}/anular`)}
            >
              Anular
            </button>
          </>
        )}
      </PageHead>
      {venta.estado === "Anulada" && (
        <Alert>
          La Venta está anulada: no computa en efectivo, cantidad ni referencia y
          no se rectifica.
        </Alert>
      )}
      <section className="panel" aria-label="Datos de la Venta">
        <dl className="detail-grid">
          <div>
            <dt>Saldo efectivo</dt>
            <dd>
              {venta.saldoEfectivo?.id} · {venta.saldoEfectivo?.nombre}
            </dd>
          </div>
          <div>
            <dt>Saldo inversión</dt>
            <dd>
              {venta.saldoInversion?.id} · {venta.saldoInversion?.nombre}
            </dd>
          </div>
          <div>
            <dt>Cantidad</dt>
            <dd>{num(venta.cantidad)}</dd>
          </div>
          <div>
            <dt>Precio</dt>
            <dd>
              {num(venta.precio)} {venta.divisa}
            </dd>
          </div>
          <div>
            <dt>Cambio histórico</dt>
            <dd>{venta.cambio ? num(venta.cambio) : "EUR = 1 (sin captura)"}</dd>
          </div>
          <div>
            <dt>EUR cobrado</dt>
            <dd>{eur(venta.importeEur)}</dd>
          </div>
          <div>
            <dt>Comisión incluida</dt>
            <dd>{venta.comisionEur ? eur(venta.comisionEur) : "0,00 €"}</dd>
          </div>
          <div>
            <dt>Revisión</dt>
            <dd>{venta.revision}</dd>
          </div>
          <div>
            <dt>Concepto</dt>
            <dd>{venta.concepto ?? "—"}</dd>
          </div>
          <div>
            <dt>Nota</dt>
            <dd>{venta.nota ?? "—"}</dd>
          </div>
        </dl>
        <p className="help">
          Referencia informativa: {eur(venta.referencia.calculo)} · Diferencia:{" "}
          {eur(venta.referencia.diferencia)}. {venta.referencia.nota}
        </p>
      </section>
      <section className="panel" aria-label="Auditoría de la Venta">
        <h2>Auditoría de la Venta</h2>
        {data.auditoria.length === 0 ? (
          <p>Sin cambios auditados.</p>
        ) : (
          <ul className="inversiones-audit">
            {data.auditoria.map((row: any) => (
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

export function AnnulSale({ id, go }: { id: string; go: (path: string) => void }) {
  const [data, setData] = useState<any>(null),
    [impact, setImpactState] = useState<Impact | null>(null),
    [motivo, setMotivo] = useState(""),
    [error, setError] = useState(""),
    [details, setDetails] = useState<Record<string, unknown> | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api(`/ventas/${id}`)
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
    setDetails(null);
    try {
      setImpactState(
        await api<Impact>(`/ventas/${id}/impacto-anulacion`, "POST", {
          revision: data.venta.revision,
        }),
      );
    } catch (value) {
      const apiError = value as ApiError;
      setError(apiError.message);
      setDetails(apiError.data ?? null);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!data || !motivo.trim()) return;
    setBusy(true);
    try {
      const result = await api<{ venta: Compra }>(`/ventas/${id}/anular`, "POST", {
        revision: data.venta.revision,
        motivo: motivo.trim(),
      });
      go(`${BASE}/ventas/${result.venta.id}`);
    } catch (value) {
      const apiError = value as ApiError;
      setError(apiError.message);
      setDetails(apiError.data ?? null);
    } finally {
      setBusy(false);
    }
  }
  if (error && !data) return <Alert>{error}</Alert>;
  if (!data) return <p role="status">Cargando venta…</p>;
  if (data.venta.estado !== "Vigente")
    return <Alert>La Venta ya está anulada; no se puede rectificar.</Alert>;
  return (
    <>
      <a
        className="back"
        href={`${BASE}/ventas/${id}`}
        onClick={(event) => {
          event.preventDefault();
          go(`${BASE}/ventas/${id}`);
        }}
      >
        ‹ Volver
      </a>
      <Tabs active="ventas" go={go} />
      <PageHead
        eyebrow={`${id} · ANULACIÓN`}
        title="Anular venta"
        description="El registro se conserva como Anulada; no se borra"
      />
      {error && (
        <Alert>
          {error}
          {details && details.minimo ? (
            <p className="help">
              Disponible {String(details.disponible)} · necesario{" "}
              {String(details.necesario)} · mínimo {String(details.minimo)} ·{" "}
              {String(details.fecha)}. El borrador se conserva; no hay override.
            </p>
          ) : null}
        </Alert>
      )}
      {impact && <ImpactPanel impact={impact} />}
      <section className="panel">
        <label>
          Motivo *
          <input
            value={motivo}
            onChange={(event) => {
              setMotivo(event.target.value);
              setError("");
            }}
            required
          />
        </label>
        <p className="help">
          Revisión actual {data.venta.revision} → se guardará{" "}
          {data.venta.revision + 1}. La Venta anulada deja de computar en efectivo,
          cantidad y referencia temporal.
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
              {busy ? "Anulando…" : "Anular venta"}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
