import { useEffect, useRef, useState } from "react";
import { api, ApiError, eur } from "./api";
import { Alert, PageHead, Tag } from "./ui";

type Reference = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  revision: number;
};
type Ficha = {
  referencia: string;
  matricula: string | null;
  proximaITV: string | null;
  cita: string | null;
  revision: number;
};
type Integrity = { estado: string; motivos: string[]; mensaje: string };
type Candidate = {
  referencia: string;
  nombre: string;
  matricula: string | null;
  estado: string;
};
type Row = {
  partida: { id: string; nombre: string };
  control: { inicio: string; fin: string } | null;
  corte: string | null;
  subtotalRegistrado: string;
  coberturaAlCorte: string;
  coberturaAnual: string;
  totalAlCorte: string | null;
  totalAnual: string | null;
  ceroVerificado: boolean;
  motivo: string | null;
};
type Annual = {
  ejercicio: number;
  universo: { inicio: string; fin: string };
  control: { inicio: string; fin: string } | null;
  corte: string | null;
  procedencia: Record<string, unknown>;
  coberturaMixta: boolean;
  coberturaAlCorte: string;
  coberturaAnual: string;
  subtotalRegistrado: string;
  totalAlCorte: string | null;
  totalAnual: string | null;
  ceroVerificado: boolean;
  hechosConocidos: number;
  hechosFueraConocidos: number;
  importeFueraDeControlCorte: string;
  hechosFueraDeControlCorte: {
    id: string;
    fecha: string;
    importe: string;
    partida: { id: string; nombre: string } | null;
  }[];
  resultadosPorPartida: Row[];
  motivo: string | null;
  gastos: {
    id: string;
    fecha: string;
    importe: string;
    partida: { id: string; nombre: string } | null;
  }[];
};
type View = {
  referencia: Reference;
  ficha: Ficha | null;
  integridad: Integrity;
  gastoAnual: Annual | null;
  auditoria?: {
    id: number;
    entidad: string;
    accion: string;
    revision: number;
    revisionPrevia: number;
    campos: unknown;
    instante: string;
    actor: string;
    motivo: string | null;
  }[];
};
type ListResponse = {
  ejercicio: number;
  page: number;
  total: number;
  control: { inicio: string; fin: string } | null;
  corte: string | null;
  procedencia: Record<string, unknown>;
  subtotalRegistrado: string;
  motivo: string | null;
  items: View[];
};
type IntegrityItem = {
  referencia: Reference | null;
  ficha: Ficha | null;
  integridad: Integrity;
  gastoAnual: Annual | null;
};
type IntegrityResponse = {
  ejercicio: number;
  estado: string;
  items: IntegrityItem[];
  cobertura: {
    ejercicio: number;
    control: { inicio: string; fin: string } | null;
    corte: string | null;
    procedencia: Record<string, unknown>;
    coberturaAlCorte: string;
    coberturaAnual: string;
    totalAlCorte: string | null;
    subtotalRegistrado: string;
    totalAnual: string | null;
    ceroVerificado: boolean;
    motivo: string | null;
  };
};
const base = "/vehiculos";

function date(value: string | null | undefined) {
  if (!value) return "No informada";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}
function amount(value: string | null | undefined) {
  return value === null || value === undefined ? "No disponible" : eur(value);
}
function yearNow() {
  return String(new Date().getFullYear());
}
function yearOptions() {
  const y = new Date().getFullYear();
  return Array.from({ length: 21 }, (_, i) => y - 10 + i);
}
function integrityTag(estado: string) {
  return estado === "OK" ? "OK" : estado;
}
function CoverageText({ value }: { value: string }) {
  return <>{value}</>;
}
function VehicleFields({
  ficha,
  maturity = false,
}: {
  ficha: Ficha | null;
  maturity?: boolean;
}) {
  if (!ficha)
    return <p className="help">Ficha no disponible; integridad requiere revisión.</p>;
  return (
    <dl className="vehicle-fields">
      <div>
        <dt>Matrícula</dt>
        <dd>{ficha.matricula ?? "Sin informar"}</dd>
      </div>
      <div>
        <dt>Próxima ITV</dt>
        <dd>{date(ficha.proximaITV)}</dd>
      </div>
      <div>
        <dt>Cita</dt>
        <dd>{date(ficha.cita)}</dd>
      </div>
      {maturity && (
        <div>
          <dt>Revisión de ficha</dt>
          <dd>{ficha.revision}</dd>
        </div>
      )}
    </dl>
  );
}
function CoveragePanel({ annual }: { annual: Annual | null }) {
  if (!annual)
    return (
      <section className="panel annual-coverage" aria-label="Cobertura y procedencia">
        <h2>Gasto año</h2>
        <p>No disponible. No se declara cero ni total completo.</p>
      </section>
    );
  return (
    <section className="panel annual-coverage" aria-label="Gasto año y cobertura">
      <h2>Gasto año</h2>
      <p>
        Control:{" "}
        {annual.control
          ? `${date(annual.control.inicio)} — ${date(annual.control.fin)}`
          : "No disponible"}{" "}
        · Corte: {date(annual.corte)} · Procedencia: Movimientos
        {annual.procedencia.historico === "No instalado"
          ? "; histórico no instalado."
          : "."}
      </p>
      <p>
        Cobertura al corte: <strong>{annual.coberturaAlCorte}</strong> · Cobertura
        anual: <strong>{annual.coberturaAnual}</strong>
        {annual.coberturaMixta ? " · cobertura mixta por Partida" : ""}
      </p>
      {annual.motivo && <p className="help">{annual.motivo}</p>}
      <div className="vehicle-summary">
        <div>
          <span>Subtotal registrado</span>
          <strong>{eur(annual.subtotalRegistrado)}</strong>
        </div>
        <div>
          <span>Total al corte</span>
          <strong>{amount(annual.totalAlCorte)}</strong>
        </div>
        <div>
          <span>Total anual</span>
          <strong>{amount(annual.totalAnual)}</strong>
        </div>
        <div>
          <span>Cero verificado</span>
          <strong>{annual.ceroVerificado ? "Sí, al corte" : "No"}</strong>
        </div>
      </div>
      <p className="help">
        {annual.hechosConocidos} Gastos conocidos dentro del control/corte.
        {annual.hechosFueraConocidos
          ? ` ${annual.hechosFueraConocidos} Gasto(s) fuera de control/corte por ${eur(annual.importeFueraDeControlCorte)} no computan.`
          : ""}
      </p>
      {annual.resultadosPorPartida.length > 0 && (
        <div className="vehicle-parts">
          <table>
            <caption className="sr-only">Resultados por Partida</caption>
            <thead>
              <tr>
                <th scope="col">Partida</th>
                <th scope="col">Subtotal</th>
                <th scope="col">Cobertura corte</th>
                <th scope="col">Total corte</th>
                <th scope="col">Cobertura anual</th>
                <th scope="col">Total anual</th>
              </tr>
            </thead>
            <tbody>
              {annual.resultadosPorPartida.map((row) => (
                <tr key={row.partida.id}>
                  <td>
                    {row.partida.id} · {row.partida.nombre}
                  </td>
                  <td>{eur(row.subtotalRegistrado)}</td>
                  <td>{row.coberturaAlCorte}</td>
                  <td>{amount(row.totalAlCorte)}</td>
                  <td>{row.coberturaAnual}</td>
                  <td>{amount(row.totalAnual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {annual.hechosFueraDeControlCorte.length > 0 && (
        <div className="vehicle-outside">
          <h3>Fuera de control/corte</h3>
          <ul>
            {annual.hechosFueraDeControlCorte.map((h) => (
              <li key={h.id}>
                {date(h.fecha)} · {h.partida?.nombre ?? "Sin Partida"} ·{" "}
                {eur(h.importe)} (no computa)
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
function AnnualFacts({ annual }: { annual: Annual | null }) {
  if (!annual) return null;
  return (
    <section className="panel" aria-label="Gastos del año">
      <div className="panel-head">
        <h2>Gastos del año ({annual.hechosConocidos})</h2>
        <span className="help">Solo lectura desde Movimientos</span>
      </div>
      {annual.gastos.length === 0 ? (
        <p>Sin Gastos registrados conocidos para este ejercicio.</p>
      ) : (
        <div className="desktop-list">
          <table>
            <caption className="sr-only">Gastos del año</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Partida</th>
                <th scope="col">Importe</th>
              </tr>
            </thead>
            <tbody>
              {annual.gastos.map((g) => (
                <tr key={g.id}>
                  <td>{date(g.fecha)}</td>
                  <td>{g.partida ? `${g.partida.id} · ${g.partida.nombre}` : "—"}</td>
                  <td>{eur(g.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function AuditPanel({ view }: { view: View }) {
  const rows = view.auditoria ?? [];
  return (
    <section className="panel" aria-label="Historial de la ficha">
      <h2>Historial de la ficha</h2>
      {rows.length === 0 ? (
        <p>Sin cambios auditados.</p>
      ) : (
        <ul className="vehicle-audit">
          {rows.map((a) => (
            <li key={a.id}>
              <strong>{a.accion}</strong> · {a.entidad} · revisión {a.revision}{" "}
              <span className="help">
                {new Date(a.instante).toLocaleString("es-ES")} · {a.actor}
              </span>
              {a.motivo && <p className="help">{a.motivo}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function Vehiculos({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  if (path === base) return <VehicleList go={go} />;
  if (path === base + "/nuevo") return <VehicleForm go={go} />;
  if (path === base + "/integridad") return <VehicleIntegrity go={go} />;
  const m = path.match(/^\/vehiculos\/(REF\d+)(?:\/(editar))?$/);
  if (m)
    return m[2] ? (
      <VehicleForm key={path} id={m[1]} go={go} />
    ) : (
      <VehicleDetail key={path} id={m[1]} go={go} />
    );
  return <Alert>Página no encontrada.</Alert>;
}
function VehicleList({ go }: { go: (p: string) => void }) {
  const [year, setYear] = useState(yearNow()),
    [page, setPage] = useState(1),
    [data, setData] = useState<ListResponse | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<ListResponse>(`${base}?ejercicio=${year}&page=${page}`)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [year, page, retry]);
  const link = (id: string, text: string) => (
    <a
      href={`${base}/${id}`}
      onClick={(e) => {
        e.preventDefault();
        go(`${base}/${id}`);
      }}
    >
      {text}
    </a>
  );
  return (
    <>
      <PageHead
        eyebrow="E3.3 · VEHÍCULOS"
        title="Vehículos"
        description="Ficha 1:1 con la Referencia · gasto anual desde Movimientos"
      >
        <button className="primary" onClick={() => go(base + "/nuevo")}>
          Nuevo vehículo
        </button>
        <button className="secondary" onClick={() => go(base + "/integridad")}>
          Integridad y cobertura
        </button>
      </PageHead>
      <section className="panel plan-controls" aria-label="Ejercicio de vehículos">
        <label>
          Ejercicio
          <select
            aria-label="Ejercicio de vehículos"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
          >
            {yearOptions().map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        {data && (
          <p className="help">
            Control:{" "}
            {data.control
              ? `${date(data.control.inicio)} — ${date(data.control.fin)}`
              : "No disponible"}{" "}
            · Corte: {date(data.corte)} · Procedencia: Movimientos; histórico no
            instalado.
          </p>
        )}
      </section>
      <div role="status" aria-live="polite">
        {error && <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>}
        {!data && !error && <p>Cargando vehículos…</p>}
      </div>
      {data && !data.items.length && (
        <section className="panel empty">
          <h2>Sin vehículos</h2>
          <p>Crea un vehículo con Referencia y ficha en una sola operación.</p>
          <button className="primary" onClick={() => go(base + "/nuevo")}>
            Nuevo vehículo
          </button>
        </section>
      )}
      {data && data.items.length > 0 && (
        <>
          <p role="status">{data.total} vehículos</p>
          <div className="desktop-list vehicle-table">
            <table>
              <caption className="sr-only">Vehículos del ejercicio</caption>
              <thead>
                <tr>
                  <th scope="col">Referencia</th>
                  <th scope="col">Matrícula</th>
                  <th scope="col">Próx. ITV</th>
                  <th scope="col">Cita</th>
                  <th scope="col">Subtotal reg.</th>
                  <th scope="col">Cob. corte</th>
                  <th scope="col">Total corte</th>
                  <th scope="col">Cob. anual</th>
                  <th scope="col">Total anual</th>
                  <th scope="col">Integridad</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <tr key={v.referencia.id}>
                    <td>
                      {link(v.referencia.id, v.referencia.nombre)}
                      <small className="table-id">{v.referencia.id}</small>
                    </td>
                    <td>{v.ficha?.matricula ?? "Sin informar"}</td>
                    <td>{date(v.ficha?.proximaITV)}</td>
                    <td>{date(v.ficha?.cita)}</td>
                    <td>{amount(v.gastoAnual?.subtotalRegistrado)}</td>
                    <td>
                      <CoverageText value={v.gastoAnual?.coberturaAlCorte ?? "No disponible"} />
                    </td>
                    <td>{amount(v.gastoAnual?.totalAlCorte)}</td>
                    <td>
                      <CoverageText value={v.gastoAnual?.coberturaAnual ?? "No disponible"} />
                    </td>
                    <td>{amount(v.gastoAnual?.totalAnual)}</td>
                    <td>
                      {v.integridad.estado === "OK" ? (
                        <Tag>OK</Tag>
                      ) : (
                        <Tag inactive>{integrityTag(v.integridad.estado)}</Tag>
                      )}
                    </td>
                    <td>
                      <Tag inactive={v.referencia.estado === "Inactiva"}>
                        {v.referencia.estado}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mobile-list vehicle-cards">
            {data.items.map((v) => (
              <li key={v.referencia.id} className="panel">
                <div className="card-head">
                  <span>{v.referencia.id}</span>
                  <Tag inactive={v.referencia.estado === "Inactiva"}>
                    {v.referencia.estado}
                  </Tag>
                </div>
                <h2>{link(v.referencia.id, v.referencia.nombre)}</h2>
                <p>
                  {v.ficha?.matricula ?? "Sin matrícula"} · Próx. ITV{" "}
                  {date(v.ficha?.proximaITV)} · Cita {date(v.ficha?.cita)}
                </p>
                <dl className="vehicle-values">
                  <div>
                    <dt>Subtotal registrado</dt>
                    <dd>{amount(v.gastoAnual?.subtotalRegistrado)}</dd>
                  </div>
                  <div>
                    <dt>Cobertura al corte</dt>
                    <dd>{v.gastoAnual?.coberturaAlCorte ?? "No disponible"}</dd>
                  </div>
                  <div>
                    <dt>Total al corte</dt>
                    <dd>{amount(v.gastoAnual?.totalAlCorte)}</dd>
                  </div>
                  <div>
                    <dt>Cobertura anual</dt>
                    <dd>{v.gastoAnual?.coberturaAnual ?? "No disponible"}</dd>
                  </div>
                  <div>
                    <dt>Total anual</dt>
                    <dd>{amount(v.gastoAnual?.totalAnual)}</dd>
                  </div>
                  <div>
                    <dt>Cero verificado</dt>
                    <dd>{v.gastoAnual?.ceroVerificado ? "Sí" : "No"}</dd>
                  </div>
                  <div>
                    <dt>Integridad</dt>
                    <dd>{v.integridad.estado}</dd>
                  </div>
                </dl>
                {v.gastoAnual && v.gastoAnual.hechosFueraConocidos > 0 && (
                  <p className="help">
                    Fuera de control/corte: {v.gastoAnual.hechosFueraConocidos}{" "}
                    Gasto(s) · {eur(v.gastoAnual.importeFueraDeControlCorte)} (no
                    computa)
                  </p>
                )}
                {v.integridad.estado !== "OK" && (
                  <p className="help">{v.integridad.mensaje}</p>
                )}
              </li>
            ))}
          </ul>
          <div className="list-footer">
            <span>Página {page}</span>
            <div className="actions">
              <button
                className="text-button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className="text-button"
                disabled={page * 100 >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
function VehicleDetail({ id, go }: { id: string; go: (p: string) => void }) {
  const [year, setYear] = useState(yearNow()),
    [view, setView] = useState<View | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    generation = useRef(0),
    yearRef = useRef(year);
  yearRef.current = year;
  useEffect(() => {
    const request = ++generation.current;
    let live = true;
    setView(null);
    setError("");
    api<View>(`${base}/${id}?ejercicio=${year}`)
      .then((d) => {
        if (live && request === generation.current && yearRef.current === year)
          setView(d);
      })
      .catch((e) => {
        if (live && request === generation.current && yearRef.current === year)
          setError((e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [id, year, retry]);
  const canEdit = view?.ficha && view.integridad.estado === "OK";
  return (
    <>
      <button className="text-button" onClick={() => go(base)}>
        Volver a Vehículos
      </button>
      {error && (
        <Alert retry={() => setRetry((v) => v + 1)}>
          {error}
          <p>
            <a
              href={base}
              onClick={(e) => {
                e.preventDefault();
                go(base);
              }}
            >
              Volver al listado
            </a>
          </p>
        </Alert>
      )}
      {!view && !error && <p role="status">Cargando vehículo…</p>}
      {view && (
        <>
          <PageHead
            eyebrow={`${view.referencia.id} · VEHÍCULO`}
            title={view.referencia.nombre}
            description="Identidad estable de Referencia · ficha 1:1"
          >
            <Tag inactive={view.referencia.estado === "Inactiva"}>
              {view.referencia.estado}
            </Tag>
            {canEdit && (
              <button
                className="secondary"
                onClick={() => go(`${base}/${id}/editar`)}
              >
                Editar ficha
              </button>
            )}
          </PageHead>
          {view.integridad.estado !== "OK" && (
            <Alert>
              <strong>Integridad: {view.integridad.estado}</strong>
              <p>{view.integridad.mensaje}</p>
              <p className="help">
                Los motivos se muestran; no se crea, repara ni borra nada
                automáticamente.
              </p>
            </Alert>
          )}
          <section className="panel" aria-label="Identidad y fechas del vehículo">
            <h2>Identificación</h2>
            <p>
              Identidad estable: <strong>{view.referencia.id}</strong> (no
              editable) · Tipo {view.referencia.tipo}
            </p>
            <VehicleFields ficha={view.ficha} maturity />
            <p className="help">
              Integridad: <strong>{view.integridad.estado}</strong> ·{" "}
              {view.integridad.mensaje}
            </p>
            <p className="help">
              Fechas manuales e independientes; la cita puede quedar vacía. Las
              fechas pasadas son válidas y no se normalizan.
            </p>
            <div className="actions">
              <button
                className="secondary"
                onClick={() => go(`/referencias/${view.referencia.id}`)}
              >
                Abrir Referencia
              </button>
              <button
                className="secondary"
                onClick={() =>
                  go(`/movimientos?referencia=${view.referencia.id}`)
                }
              >
                Ver en Movimientos
              </button>
            </div>
          </section>
          <section className="panel plan-controls" aria-label="Ejercicio del vehículo">
            <label>
              Ejercicio
              <select
                aria-label="Ejercicio del gasto del vehículo"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {yearOptions().map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <span className="help">
              El año inicial es solo de vista; no atribuye Gastos ni decide
              cobertura.
            </span>
          </section>
          <CoveragePanel annual={view.gastoAnual} />
          <AnnualFacts annual={view.gastoAnual} />
          <AuditPanel view={view} />
        </>
      )}
    </>
  );
}
function CandidateList({
  title,
  candidates,
  confirmed,
  onConfirm,
}: {
  title: string;
  candidates: {
    referencia: string;
    nombre: string;
    matricula: string | null;
    estado: string;
  }[];
  confirmed: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="duplicate-warning" role="alert">
      <p>
        <strong>{title} coincide</strong>
      </p>
      <ul>
        {candidates.map((c) => (
          <li key={c.referencia}>
            {c.referencia} · {c.nombre} · {c.matricula ?? "Sin matrícula"} ·{" "}
            {c.estado}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={confirmed ? "secondary" : "primary"}
        disabled={confirmed}
        onClick={onConfirm}
      >
        {confirmed ? "Dimensión confirmada" : `Confirmar ${title.toLowerCase()}`}
      </button>
    </div>
  );
}
export function VehicleForm({
  id,
  conversionId,
  go,
}: {
  id?: string;
  conversionId?: string;
  go: (p: string) => void;
}) {
  const editing = Boolean(id),
    converting = Boolean(conversionId),
    target = id ?? conversionId,
    [loading, setLoading] = useState(editing || converting),
    [revision, setRevision] = useState<number | null>(null),
    [fichaRevision, setFichaRevision] = useState<number | null>(null),
    [name, setName] = useState(""),
    [registration, setRegistration] = useState(""),
    [itv, setItv] = useState(""),
    [cita, setCita] = useState(""),
    [conversionConfirmed, setConversionConfirmed] = useState(false),
    [blocked, setBlocked] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [warning, setWarning] = useState<{
      name?: Candidate[];
      registration?: Candidate[];
      nameHash?: string;
      registrationHash?: string;
    } | null>(null),
    [confirmedName, setConfirmedName] = useState(false),
    [confirmedRegistration, setConfirmedRegistration] = useState(false),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false),
    key = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!target) return;
    let live = true;
    setLoading(true);
    (async () => {
      try {
        if (editing) {
          const v = await api<View>(`${base}/${id}?ejercicio=${yearNow()}`);
          if (!live) return;
          setRevision(v.referencia.revision);
          setFichaRevision(v.ficha?.revision ?? null);
          setName(v.referencia.nombre);
          setRegistration(v.ficha?.matricula ?? "");
          setItv(v.ficha?.proximaITV ?? "");
          setCita(v.ficha?.cita ?? "");
          if (!v.ficha || v.integridad.estado !== "OK")
            setBlocked(
              "La ficha no es editable mientras la integridad requiera revisión.",
            );
        } else {
          const r = await api<{
            item: Reference;
            usos: unknown[];
            vehiculo: Ficha | null;
            conversion: { disponible: boolean; motivo: string | null };
          }>(`/referencias/${conversionId}`);
          if (!live) return;
          setRevision(r.item.revision);
          setName(r.item.nombre);
          setRegistration(r.vehiculo?.matricula ?? "");
          setItv(r.vehiculo?.proximaITV ?? "");
          setCita(r.vehiculo?.cita ?? "");
          if (!r.conversion.disponible)
            setBlocked(
              r.conversion.motivo ??
                "La conversión no está disponible para esta Referencia.",
            );
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [editing, converting, id, conversionId, target]);
  useEffect(() => {
    if (warning || error) alert.current?.focus();
  }, [warning, error]);
  function invalidate() {
    setWarning(null);
    setConfirmedName(false);
    setConfirmedRegistration(false);
    key.current = crypto.randomUUID();
    setError("");
    setFields({});
  }
  function body() {
    const vehiculo = {
        matricula: registration.trim() ? registration : null,
        proximaITV: itv || null,
        cita: cita || null,
      },
      confirmations = warning
        ? {
            ...(warning.name
              ? {
                  confirmarDuplicadoNombre: confirmedName,
                  candidateNameHash: warning.nameHash,
                }
              : {}),
            ...(warning.registration
              ? {
                  confirmarDuplicadoMatricula: confirmedRegistration,
                  candidateMatriculaHash: warning.registrationHash,
                }
              : {}),
          }
        : {};
    if (converting)
      return {
        revision,
        nombre: name,
        tipo: "Vehículo",
        confirmarConversion: conversionConfirmed,
        vehiculo,
        ...confirmations,
      };
    if (editing)
      return { revision, fichaRevision, nombre: name, vehiculo, ...confirmations };
    return { nombre: name, tipo: "Vehículo", vehiculo, ...confirmations };
  }
  async function submit() {
    if (blocked) return;
    if (converting && !conversionConfirmed) {
      setError("Confirma explícitamente la conversión a Vehículo.");
      return;
    }
    setBusy(true);
    setError("");
    setFields({});
    try {
      const result = await api<{ item: Reference }>(
        editing || converting ? `/referencias/${target}` : "/referencias",
        editing || converting ? "PATCH" : "POST",
        body(),
        editing || converting ? {} : { "idempotency-key": key.current },
      );
      go(
        editing
          ? `${base}/${id}`
          : `${base}/${result.item.id}`,
      );
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409 && err.data.code === "DUPLICATE_WARNING") {
        setWarning({
          name: err.data.coincidenciasNombre,
          registration: err.data.coincidenciasMatricula,
          nameHash: err.data.candidateNameHash,
          registrationHash: err.data.candidateMatriculaHash,
        });
        setConfirmedName(false);
        setConfirmedRegistration(false);
        setError(err.message);
        setConflict(false);
      } else {
        setWarning(null);
        setError(err.message);
        setFields(err.fields ?? {});
        setConflict(err.status === 409);
      }
      requestAnimationFrame(() => alert.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  async function refreshContext() {
    if (!target) return;
    setError("");
    setConflict(false);
    try {
      if (editing) {
        const v = await api<View>(`${base}/${id}?ejercicio=${yearNow()}`);
        setRevision(v.referencia.revision);
        setFichaRevision(v.ficha?.revision ?? null);
      } else {
        const r = await api<{ item: Reference }>(`/referencias/${target}`);
        setRevision(r.item.revision);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (loading)
    return (
      <>
        <p role="status">Cargando vehículo…</p>
      </>
    );
  return (
    <>
      <PageHead
        eyebrow={
          converting
            ? "REFERENCIAS · CONVERSIÓN"
            : editing
              ? "VEHÍCULO · EDICIÓN"
              : "VEHÍCULO · ALTA"
        }
        title={
          converting
            ? "Convertir a Vehículo"
            : editing
              ? "Editar vehículo"
              : "Nuevo vehículo"
        }
        description="Tipo Vehículo fijo · ficha 1:1 · identidad de Referencia"
      />
      <div tabIndex={-1} ref={alert}>
        {error && (
          <Alert>
            {error}
            {conflict && (
              <button className="secondary" onClick={refreshContext}>
                Actualizar contexto
              </button>
            )}
          </Alert>
        )}
        {blocked && <Alert>{blocked}</Alert>}
      </div>
      {converting && (
        <section className="panel">
          <h2>Impacto de la conversión</h2>
          <p>
            REF {target} · {name || "Sin nombre"} → Vehículo; se crea una ficha
            1:1. ID, nombre e historial se conservan; no se borra ni recrea una
            ficha.
          </p>
          <p className="help">
            Solo si no tiene ficha y no tiene hechos. Una Referencia usada queda
            bloqueada por E1.5.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={conversionConfirmed}
              onChange={(e) => {
                setConversionConfirmed(e.target.checked);
                invalidate();
              }}
            />
            Confirmo la conversión explícita
          </label>
        </section>
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="saldo-form"
      >
        <section className="panel">
          <h2>Identificación</h2>
          {target && <p>ID inmutable: {target}</p>}
          <div className="form-grid">
            <label>
              Nombre *
              <input
                aria-label="Nombre del vehículo *"
                maxLength={120}
                value={name}
                aria-invalid={!!fields.nombre}
                onChange={(e) => {
                  setName(e.target.value);
                  invalidate();
                }}
              />
              {fields.nombre && <span className="field-error">{fields.nombre}</span>}
            </label>
            <label>
              Matrícula (opcional)
              <input
                aria-label="Matrícula del vehículo"
                maxLength={32}
                value={registration}
                aria-invalid={!!fields.matricula}
                onChange={(e) => {
                  setRegistration(e.target.value);
                  invalidate();
                }}
              />
              {fields.matricula && (
                <span className="field-error">{fields.matricula}</span>
              )}
            </label>
            <label>
              Próxima ITV (opcional)
              <input
                type="date"
                aria-label="Próxima ITV"
                value={itv}
                onChange={(e) => {
                  setItv(e.target.value);
                  invalidate();
                }}
              />
              {fields.proximaITV && (
                <span className="field-error">{fields.proximaITV}</span>
              )}
            </label>
            <label>
              Cita (opcional)
              <input
                type="date"
                aria-label="Cita del vehículo"
                value={cita}
                onChange={(e) => {
                  setCita(e.target.value);
                  invalidate();
                }}
              />
              {fields.cita && <span className="field-error">{fields.cita}</span>}
            </label>
          </div>
          <p className="help">
            Fechas en formato dd/mm/aaaa según el selector del navegador. La
            cita puede quedar vacía; las fechas pasadas son válidas. No se
            calcula periodicidad ni se envían avisos. Estado inicial Activa.
          </p>
        </section>
        {warning && (
          <section className="panel" aria-label="Avisos de duplicado">
            <h2>Duplicados confirmables</h2>
            <p>
              Son vehículos distintos; cada dimensión se confirma por separado.
              Si falta una confirmación requerida, no se guarda nada.
            </p>
            {warning.name && (
              <CandidateList
                title="Nombre"
                candidates={warning.name}
                confirmed={confirmedName}
                onConfirm={() => setConfirmedName(true)}
              />
            )}
            {warning.registration && (
              <CandidateList
                title="Matrícula"
                candidates={warning.registration}
                confirmed={confirmedRegistration}
                onConfirm={() => setConfirmedRegistration(true)}
              />
            )}
          </section>
        )}
        <div className="form-footer">
          <span>Sin importes ni Gastos propios; solo ficha y enlaces</span>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                go(
                  editing
                    ? `${base}/${id}`
                    : converting
                      ? `/referencias/${conversionId}`
                      : base,
                )
              }
            >
              Cancelar
            </button>
            <button
              className="primary"
              disabled={busy || !!blocked}
            >
              {busy
                ? "Guardando…"
                : converting
                  ? "Revisar y convertir"
                  : editing
                    ? "Confirmar y guardar"
                    : "Crear vehículo"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
function VehicleIntegrity({ go }: { go: (p: string) => void }) {
  const [year, setYear] = useState(yearNow()),
    [data, setData] = useState<IntegrityResponse | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<IntegrityResponse>(`${base}/integridad?ejercicio=${year}`)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [year, retry]);
  return (
    <>
      <PageHead
        eyebrow="E3.3 · CONTROL"
        title="Integridad de vehículos"
        description="Solo lectura · no se crea, repara ni borra nada automáticamente"
      />
      <section className="panel plan-controls" aria-label="Ejercicio de integridad">
        <label>
          Ejercicio
          <select
            aria-label="Ejercicio de integridad"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {yearOptions().map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <button className="secondary" onClick={() => go(base)}>
          Volver a Vehículos
        </button>
      </section>
      {error && <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>}
      {!data && !error && <p role="status">Cargando integridad…</p>}
      {data && (
        <>
          <section className="panel" aria-label="Estado de integridad">
            <h2>{data.estado === "OK" ? "Sin incidencias" : "Revisar"}</h2>
            {data.items.length === 0 ? (
              <p>No se detectan fichas ausentes, huérfanas o de Tipo incorrecto.</p>
            ) : (
              <ul className="integrity-list">
                {data.items.map((item, index) => (
                  <li key={`${item.referencia?.id ?? item.ficha?.referencia ?? "x"}-${index}`}>
                    <strong>
                      [{item.integridad.estado}]{" "}
                      {item.referencia?.id ?? item.ficha?.referencia ?? "REF ?"}
                    </strong>{" "}
                    {item.referencia?.nombre ?? "Ficha sin Referencia"} ·{" "}
                    {item.integridad.motivos.join(", ")}
                    <p>{item.integridad.mensaje}</p>
                    {item.gastoAnual && (
                      <p className="help">
                        Gasto al corte: {amount(item.gastoAnual.subtotalRegistrado)} ·{" "}
                        {item.gastoAnual.coberturaAlCorte}
                      </p>
                    )}
                    <div className="actions">
                      {item.referencia && (
                        <button
                          className="text-button"
                          onClick={() => go(`/referencias/${item.referencia!.id}`)}
                        >
                          Ver REF
                        </button>
                      )}
                      {item.referencia && (
                        <button
                          className="text-button"
                          onClick={() =>
                            go(`/movimientos?referencia=${item.referencia!.id}`)
                          }
                        >
                          Ver Movimientos
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel annual-coverage" aria-label="Cobertura del ejercicio">
            <h2>Cobertura y procedencia · {data.ejercicio}</h2>
            <p>
              Control:{" "}
              {data.cobertura.control
                ? `${date(data.cobertura.control.inicio)} — ${date(data.cobertura.control.fin)}`
                : "No disponible"}{" "}
              · Corte: {date(data.cobertura.corte)}
            </p>
            <p>
              Cobertura al corte:{" "}
              <strong>{data.cobertura.coberturaAlCorte}</strong> · Cobertura
              anual: <strong>{data.cobertura.coberturaAnual}</strong>
            </p>
            <p>
              Procedencia: Movimientos; histórico no instalado. Subtotal
              registrado: {amount(data.cobertura.subtotalRegistrado)} · Cero
              verificado: {data.cobertura.ceroVerificado ? "Sí" : "No"} · Total
              anual: {amount(data.cobertura.totalAnual)}
            </p>
            {data.cobertura.motivo && (
              <p className="help">{data.cobertura.motivo}</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
