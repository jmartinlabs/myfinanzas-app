import { useEffect, useRef, useState } from "react";
import { api, ApiError, eur } from "./api";
import {
  Alert,
  DataList,
  Field,
  FormGrid,
  FormSection,
  PageHead,
  Table,
  Tag,
  focusFirstInvalidField,
  type TableColumn,
} from "./ui";

type Clasificacion =
  | "Comida"
  | "Pendiente revisar"
  | "Ocio"
  | "Niños"
  | "Otros"
  | "Fuera presupuesto";
type MovementOption = {
  id: string;
  fecha: string;
  tipo: string;
  importe: string;
  concepto: string;
  origen: string;
  destino: string;
  origenNombre: string | null;
  origenControl: string | null;
  destinoNombre: string | null;
  destinoControl: string | null;
  anulado: boolean;
  revision: number;
};
type Operacion = {
  id: string;
  tipo: "Detalle" | "Reposicion";
  fecha: string;
  concepto: string;
  importe: string;
  direccion: "Salida" | "Entrada";
  esDevolucion: boolean;
  clasificacion: Clasificacion | null;
  fueraPresupuestoHistorico: boolean;
  evidenciaBancaria: string | null;
  estadoEvidenciaBancaria: "Con evidencia" | "Sin evidencia";
  evidenciaRelacionCompra: string | null;
  relacionCompra: "Acreditada" | "Sin relación acreditada";
  cuentaOrigen: string | null;
  tipoVinculo: "Individual" | "Agregado terminal" | null;
  estadoVinculo: "Sin vínculo" | "Verificado" | "Revisar";
  evidenciaVinculo: string | null;
  vinculoMovimiento: MovementOption | null;
  sinConciliacion: boolean;
  estadoRegistro: "Vigente" | "Anulado";
  estadoTrazabilidad: "Asignada" | "Sin asignación";
  revision: number;
  creado: string;
  actualizado: string;
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    estadoTemporal: string;
    cobertura?: string;
  } | null;
  efecto: string;
};
type Audit = {
  revision: number;
  accion: string;
  motivo: string | null;
  instante: string;
  actor: string;
  anterior: Record<string, unknown> | null;
  posterior: Record<string, unknown>;
};
type Detail = {
  operacion: Operacion;
  auditoria: Audit[];
  reposiciones: Operacion[];
  contexto: Context;
};
type Context = {
  referencia: {
    fecha: string | null;
    estado: "disponible" | "sin_referencia" | "error";
    coverage: { source: string; state: string }[];
  };
  actual: { id: string; inicio: string; fin: string | null } | null;
  motivo: string;
};
type Coverage = {
  desde: string | null;
  hasta: string | null;
  solicitadoDesde: string | null;
  solicitadoHasta: string | null;
  estado:
    | "disponible"
    | "sin_operaciones"
    | "sin_cobertura_historica"
    | "cobertura_parcial";
};
type CycleFilter = {
  id: string;
  inicio: string;
  fin: string | null;
  mesFinanciado: string;
  estadoTemporal: string;
};
type ListData = {
  operaciones: Operacion[];
  total: number;
  page: number;
  contexto: Context;
  cobertura: Coverage;
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    estadoTemporal: string;
    cobertura: "Parcial" | null;
  } | null;
  sinCicloAsignable: number;
  fueraDeCiclo: number;
};
type ReposData = Omit<ListData, "operaciones"> & { reposiciones: Operacion[] };
type Options = {
  clasificaciones: { valor: Clasificacion; grupo: string }[];
  movimientos: MovementOption[];
  hoy: string;
  contexto: Context;
};
const base = "/revision-comida",
  reposBase = "/revision-comida/reposiciones";
const date = (s: string | null) =>
  s ? s.split("-").reverse().join("/") : "No disponible";
const stamp = (s: string) => {
  const d = new Date(s);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(d);
};
const classification = (o: Operacion) =>
  o.tipo === "Reposicion" ? "—" : (o.clasificacion ?? "Sin clasificación");
const linkLabel = (o: Operacion) =>
  o.estadoVinculo === "Verificado"
    ? `Verificado · ${o.vinculoMovimiento?.id ?? ""}`
    : o.estadoVinculo;
const coverageLabel = (c: Coverage) =>
  c.estado === "sin_operaciones"
    ? "Sin operaciones registradas"
    : c.estado === "sin_cobertura_historica"
      ? "Sin cobertura histórica"
      : c.estado === "cobertura_parcial"
        ? "Cobertura parcial del periodo"
        : "Cobertura histórica parcial";
function TagFor({ o }: { o: Operacion }) {
  return (
    <>
      {o.tipo === "Reposicion" && <Tag>Reposición</Tag>}
      {o.esDevolucion && <Tag>Devolución</Tag>}
      {o.estadoEvidenciaBancaria === "Sin evidencia" && (
        <Tag inactive>Sin evidencia</Tag>
      )}
      {o.estadoVinculo === "Revisar" && <Tag inactive>Revisar vínculo</Tag>}
      {o.estadoRegistro === "Anulado" && <Tag inactive>Anulado</Tag>}
    </>
  );
}
function CoverageNote({ data }: { data: ListData | ReposData }) {
  const c = data.cobertura;
  return (
    <p className="notice">
      <strong>{coverageLabel(c)}</strong> · Observado{" "}
      {c.desde ? `${date(c.desde)} a ${date(c.hasta)}` : "sin registros"} ·
      Referencia central:{" "}
      {data.contexto.referencia.fecha
        ? date(data.contexto.referencia.fecha)
        : data.contexto.referencia.estado === "error"
          ? "Error de fuente"
          : "No disponible"}
      {c.estado === "cobertura_parcial" &&
        " · El rango observado no cubre por completo el periodo solicitado."}
      {!c.desde &&
        " · No se inventa historia anterior al primer registro ni se rellena con cero."}
    </p>
  );
}
function useCycles() {
  const [cycles, setCycles] = useState<CycleFilter[]>([]);
  useEffect(() => {
    let live = true;
    api<{ ciclos: CycleFilter[] }>("/ciclos?estado=&page=1")
      .then((d) => live && setCycles(d.ciclos))
      .catch(() => live && setCycles([]));
    return () => {
      live = false;
    };
  }, []);
  return cycles;
}
function Filters({
  value,
  change,
  cycles,
  repos = false,
}: {
  value: Record<string, string>;
  change: (k: string, v: string) => void;
  cycles: CycleFilter[];
  repos?: boolean;
}) {
  return (
    <>
      <div className="filters">
        <label>
          Buscar ID o concepto
          <input
            type="search"
            value={value.q}
            onChange={(e) => change("q", e.target.value)}
          />
        </label>
        {!repos && (
          <label>
            Clasificación
            <select
              value={value.clasificacion}
              onChange={(e) => change("clasificacion", e.target.value)}
            >
              <option value="">Todas</option>
              {[
                "Comida",
                "Pendiente revisar",
                "Ocio",
                "Niños",
                "Otros",
                "Fuera presupuesto",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Vínculo
          <select
            value={value.vinculo}
            onChange={(e) => change("vinculo", e.target.value)}
          >
            <option value="">Todos</option>
            <option>Sin vínculo</option>
            <option>Verificado</option>
            <option>Revisar</option>
          </select>
        </label>
        <label>
          Fuera presupuesto
          <select
            value={value.fueraPresupuesto}
            onChange={(e) => change("fueraPresupuesto", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
      </div>
      <details className="movement-filters">
        <summary>Más filtros</summary>
        <div className="form-grid">
          {!repos && (
            <label>
              Tipo
              <select
                value={value.tipo}
                onChange={(e) => change("tipo", e.target.value)}
              >
                <option value="">Todos</option>
                <option>Detalle</option>
                <option>Reposicion</option>
              </select>
            </label>
          )}
          {!repos && (
            <label>
              Devolución
              <select
                value={value.esDevolucion}
                onChange={(e) => change("esDevolucion", e.target.value)}
              >
                <option value="">Todas</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
          )}
          <label>
            Evidencia bancaria
            <select
              value={value.evidencia}
              onChange={(e) => change("evidencia", e.target.value)}
            >
              <option value="">Todas</option>
              <option>Con evidencia</option>
              <option>Sin evidencia</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={value.estado}
              onChange={(e) => change("estado", e.target.value)}
            >
              <option>Vigente</option>
              <option>Anulado</option>
              <option value="">Todos</option>
            </select>
          </label>
          <label>
            Ciclo
            <select
              value={value.ciclo}
              onChange={(e) => change("ciclo", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="sin_ciclo">Sin ciclo asignable</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · inicio {date(c.inicio)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={value.desde}
              onChange={(e) => change("desde", e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={value.hasta}
              onChange={(e) => change("hasta", e.target.value)}
            />
          </label>
        </div>
      </details>
    </>
  );
}
function emptyFilters(): Record<string, string> {
  return {
    q: "",
    clasificacion: "",
    vinculo: "",
    fueraPresupuesto: "",
    tipo: "",
    esDevolucion: "",
    evidencia: "",
    estado: "Vigente",
    ciclo: "",
    desde: "",
    hasta: "",
  };
}
function query(filters: Record<string, string>, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  for (const [k, v] of Object.entries(filters))
    if (v || k === "estado") params.set(k, v);
  return params.toString();
}
const stateLabel = (o: Operacion) =>
  o.estadoRegistro === "Anulado"
    ? o.tipo === "Reposicion"
      ? "Anulada"
      : "Anulado"
    : o.estadoRegistro;
function RowActions({
  o,
  go,
}: {
  o: Operacion;
  go: (p: string) => void;
}) {
  const href =
    (o.tipo === "Reposicion" ? reposBase : base) + "/" + o.id;
  return (
    <div className="actions">
      <button className="text-button" onClick={() => go(href)}>
        Ver
      </button>
      <button
        className="text-button"
        onClick={() => go(href + "/editar")}
      >
        Editar
      </button>
    </div>
  );
}
function OperationTable({
  data,
  go,
}: {
  data: ListData | ReposData;
  go: (p: string) => void;
}) {
  const rows = "operaciones" in data ? data.operaciones : data.reposiciones;
  const hrefFor = (o: Operacion) =>
    (o.tipo === "Reposicion" ? reposBase : base) + "/" + o.id;
  const columns: TableColumn<Operacion>[] = [
    {
      id: "id",
      header: "ID",
      cell: (operation) => `#${operation.id}`,
      cardCell: (operation) => (
        <Tag inactive={operation.estadoRegistro === "Anulado"}>
          #{operation.id} ·{" "}
          {operation.tipo === "Reposicion" ? "Reposición" : "Detalle"}
        </Tag>
      ),
    },
    {
      id: "fecha",
      header: "Fecha op.",
      cell: (operation) => date(operation.fecha),
    },
    {
      id: "concepto",
      header: "Operación",
      cell: (operation) => (
        <>
          <button
            className="text-button"
            onClick={() => go(hrefFor(operation))}
          >
            {operation.concepto}
          </button>
          <small className="table-id">
            <TagFor o={operation} />
          </small>
        </>
      ),
      cardCell: (operation) => (
        <>
          <button
            className="text-button"
            onClick={() => go(hrefFor(operation))}
          >
            {operation.concepto}
          </button>
          <small className="table-id">
            <TagFor o={operation} />
          </small>
          <p className="help">
            Evidencia bancaria:{" "}
            {operation.evidenciaBancaria ? "sí" : "Sin evidencia"}
          </p>
          <RowActions o={operation} go={go} />
        </>
      ),
    },
    {
      id: "importe",
      header: "Importe/dirección",
      label: "Importe y dirección",
      kind: "amount",
      cell: (operation) => `${eur(operation.importe)} · ${operation.direccion}`,
    },
    {
      id: "clasificacion",
      header: "Clasificación",
      cell: (operation) => classification(operation),
    },
    {
      id: "vinculo",
      header: "Vínculo",
      cell: (operation) => linkLabel(operation),
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (operation) => stateLabel(operation),
    },
  ];
  return (
    <>
      <div className="desktop-list">
        <Table
          caption="Operaciones de Revisión Comida"
          label="Tabla de operaciones de Revisión Comida"
          columns={columns}
          rows={rows}
          rowKey={(operation) => operation.id}
          rowClassName={(operation) =>
            operation.estadoRegistro === "Anulado" ? "annulled" : undefined
          }
        />
      </div>
      <DataList
        columns={columns}
        rows={rows}
        rowKey={(operation) => operation.id}
        rowClassName={(operation) =>
          operation.estadoRegistro === "Anulado" ? "annulled" : undefined
        }
        label="Operaciones de Revisión Comida móvil"
        className="mobile-list"
      />
    </>
  );
}
export function RevisionComida({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  if (path === base || path === base + "/") return <OperationList go={go} />;
  if (path === base + "/nueva")
    return <OperationForm tipo="Detalle" go={go} />;
  if (path === reposBase) return <ReposList go={go} />;
  if (path === reposBase + "/nueva")
    return <OperationForm tipo="Reposicion" go={go} />;
  const edit = path.match(/^\/revision-comida\/(reposiciones\/)?(\d+)\/editar$/);
  if (edit)
    return (
      <OperationForm
        key={path}
        id={edit[2]}
        tipo={edit[1] ? "Reposicion" : "Detalle"}
        go={go}
      />
    );
  const detail = path.match(/^\/revision-comida\/(reposiciones\/)?(\d+)$/);
  if (detail)
    return (
      <OperationDetail
        key={path}
        id={detail[2]}
        tipo={detail[1] ? "Reposicion" : "Detalle"}
        go={go}
      />
    );
  return <Alert>Página no encontrada.</Alert>;
}
function OperationList({ go }: { go: (p: string) => void }) {
  const [filters, setFilters] = useState(emptyFilters),
    [page, setPage] = useState(1),
    [data, setData] = useState<ListData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    cycles = useCycles();
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api<ListData>(base + "?" + query(filters, page))
      .then((d) => live && (setData(d), setLoading(false)))
      .catch((e) => live && (setError(e.message), setLoading(false)));
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  const change = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };
  const active = Object.entries(filters).some(
    ([k, v]) => v && v !== "Vigente",
  );
  const nonDateFilter =
    ["q", "clasificacion", "vinculo", "fueraPresupuesto", "tipo", "esDevolucion", "evidencia", "ciclo"].some(
      (k) => filters[k],
    ) || filters.estado !== "Vigente";
  const dateOnly =
    !nonDateFilter && !!(filters.desde || filters.hasta);
  const total = data?.total ?? 0;
  return (
    <>
      <PageHead
        eyebrow="E3.4 · REVISIÓN BANCARIA"
        title="Revisión Comida"
        description="Operaciones bancarias individuales con clasificación, evidencia y vínculo opcional."
      >
        <button className="primary" onClick={() => go(base + "/nueva")}>
          Nueva operación
        </button>
        <button className="secondary" onClick={() => go(reposBase)}>
          Ver reposiciones
        </button>
      </PageHead>
      <p className="page-foot">
        Revisión Comida registra el banco. Movimientos sigue siendo el
        reconocimiento económico central. E3.5 concilia por ciclo. No se suman
        ambas capas como hechos independientes.
      </p>
      <section className="panel revision-list" aria-label="Operaciones de Revisión Comida">
        <Filters value={filters} change={change} cycles={cycles} />
        {data && <CoverageNote data={data} />}
        {data && data.ciclo && (
          <p>
            Ciclo filtrado: {data.ciclo.id} · {date(data.ciclo.inicio)} a{" "}
            {data.ciclo.fin ? date(data.ciclo.fin) : "abierto"} ·{" "}
            {data.ciclo.estadoTemporal === "Abierto"
              ? "Ciclo abierto (sin Fin inventado)"
              : "Con fin temporal"}{" "}
            · Cobertura del ciclo: {data.ciclo.cobertura ?? "No disponible"}
          </p>
        )}
        {!!data?.sinCicloAsignable && (
          <p className="help">
            {data.sinCicloAsignable} operaciones sin ciclo asignable: la fecha no
            cae en ningún intervalo. No se inventa un ciclo ni se convierten en
            cero.
          </p>
        )}
        {!!data?.fueraDeCiclo && (
          <p className="help">
            {data.fueraDeCiclo} operaciones existen fuera del ciclo filtrado
            («Fuera de ciclo»); no son ausencia ni cero.
          </p>
        )}
        <div className="list-toolbar">
          <p role="status">
            {loading
              ? "Cargando operaciones…"
              : error
                ? "Consulta no disponible"
                : `${total} operaciones`}
          </p>
          <span>Fecha de operación · más reciente primero</span>
        </div>
        {error ? (
          <Alert retry={() => setRetry((v) => v + 1)}>
            {error} La selección y los filtros se conservan.
          </Alert>
        ) : loading ? (
          <p className="empty" aria-busy="true">
            Consultando operaciones bancarias…
          </p>
        ) : !total ? (
          <div className="empty">
            <h2>
              {data?.cobertura.estado === "sin_cobertura_historica"
                ? "Sin cobertura histórica"
                : data?.fueraDeCiclo
                  ? "Fuera de ciclo"
                  : dateOnly
                    ? "Sin operaciones"
                    : active
                      ? "Sin coincidencias"
                      : "Sin operaciones de Revisión Comida"}
            </h2>
            <p>
              {data?.cobertura.estado === "sin_cobertura_historica"
                ? "El periodo solicitado es anterior al primer registro disponible. No se rellena con cero ni se extrapola."
                : dateOnly
                  ? "El periodo está dentro del rango observado, pero no hay operaciones registradas. No es un cero financiero."
                  : active
                    ? "Ajusta los filtros. La ausencia no equivale a cero financiero."
                    : "Registra una operación bancaria real con datos ficticios."}
            </p>
            {active && (
              <button
                className="secondary"
                onClick={() => {
                  setFilters(emptyFilters());
                  setPage(1);
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <OperationTable data={data!} go={go} />
        )}
        <div className="list-footer">
          <span>Página {page}</span>
          <div className="actions">
            <button
              className="text-button"
              disabled={page <= 1 || loading || !!error}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </button>
            <button
              className="text-button"
              disabled={page * 100 >= total || loading || !!error}
              onClick={() => setPage((v) => v + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
      <p className="page-foot">
        Una Entrada solo se muestra como devolución si «esDevolucion» es true.
        Un vínculo verificado es trazabilidad, no reparto de importes. Sin
        vínculo es un estado normal.
      </p>
    </>
  );
}
function ReposList({ go }: { go: (p: string) => void }) {
  const [filters, setFilters] = useState(emptyFilters),
    [page, setPage] = useState(1),
    [data, setData] = useState<ReposData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    cycles = useCycles();
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api<ReposData>(reposBase + "?" + query(filters, page))
      .then((d) => live && (setData(d), setLoading(false)))
      .catch((e) => live && (setError(e.message), setLoading(false)));
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  const change = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };
  const columns: TableColumn<Operacion>[] = [
    {
      id: "id",
      header: "ID",
      cell: (operation) => `#${operation.id}`,
      cardCell: (operation) => (
        <Tag inactive={operation.estadoRegistro === "Anulado"}>
          #{operation.id} · Reposición
        </Tag>
      ),
    },
    {
      id: "fecha",
      header: "Fecha",
      cell: (operation) => date(operation.fecha),
    },
    {
      id: "importe",
      header: "Importe",
      kind: "amount",
      cell: (operation) => eur(operation.importe),
    },
    {
      id: "evidencia",
      header: "Evidencia bancaria",
      cell: (operation) => operation.evidenciaBancaria ?? "Sin evidencia",
    },
    {
      id: "trazabilidad",
      header: "Trazabilidad",
      cell: (operation) => (
        <>
          {operation.estadoTrazabilidad}
          <small className="table-id">C-02 (futuro E3.5)</small>
        </>
      ),
    },
    {
      id: "estado",
      header: "Estado/Rev",
      label: "Estado y revisión",
      kind: "status",
      cell: (operation) =>
        `${stateLabel(operation)} · Rev. ${operation.revision}`,
    },
    {
      id: "acciones",
      header: "Acciones",
      kind: "actions",
      cell: (operation) => (
        <>
          <RowActions o={operation} go={go} />
          <button
            className="text-button"
            disabled
            title="E3.5 no instalado: no se simula la asignación"
          >
            Asignar (E3.5)
          </button>
        </>
      ),
    },
  ];
  return (
    <>
      <PageHead
        eyebrow="E3.4 · REPOSICIONES"
        title="Reposiciones"
        description="Operaciones bancarias reales de entrada con evidencia propia."
      >
        <button className="primary" onClick={() => go(reposBase + "/nueva")}>
          Nueva reposición
        </button>
        <button className="secondary" onClick={() => go(base)}>
          Volver a operaciones
        </button>
      </PageHead>
      <p className="notice">
        Cobertura de compensación: E3.5 (no instalado). E3.4 registra y expone;
        no calcula «Parcial», «Completada» ni «Falta por reponer».
      </p>
      <section className="panel revision-list" aria-label="Reposiciones registradas">
        <Filters value={filters} change={change} cycles={cycles} repos />
        {data && <CoverageNote data={data} />}
        <div className="list-toolbar">
          <p role="status">
            {loading
              ? "Cargando reposiciones…"
              : error
                ? "Consulta no disponible"
                : `${data?.total ?? 0} reposiciones`}
          </p>
        </div>
        {error ? (
          <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
        ) : loading ? (
          <p className="empty" aria-busy="true">
            Consultando reposiciones…
          </p>
        ) : !data?.total ? (
          <div className="empty">
            <h2>Sin reposición registrada</h2>
            <p>
              No se presenta como completada. La cobertura de compensación
              pertenece a E3.5, que no está instalado.
            </p>
          </div>
        ) : (
          <>
            <div className="desktop-list">
              <Table
                caption="Reposiciones registradas"
                label="Tabla de Reposiciones registradas"
                columns={columns}
                rows={data.reposiciones}
                rowKey={(operation) => operation.id}
                rowClassName={(operation) =>
                  operation.estadoRegistro === "Anulado" ? "annulled" : undefined
                }
              />
            </div>
            <DataList
              columns={columns}
              rows={data.reposiciones}
              rowKey={(operation) => operation.id}
              rowClassName={(operation) =>
                operation.estadoRegistro === "Anulado" ? "annulled" : undefined
              }
              label="Reposiciones registradas móvil"
              className="mobile-list"
            />
          </>
        )}
      </section>
      <p className="page-foot">
        E3.4 registra y expone; no calcula «Parcial», «Completada», «Falta por
        reponer» ni cobertura de compensación. Esos estados pertenecen a E3.5.
      </p>
    </>
  );
}
function OperationDetail({
  id,
  tipo,
  go,
}: {
  id: string;
  tipo: "Detalle" | "Reposicion";
  go: (p: string) => void;
}) {
  const [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [linkOpen, setLinkOpen] = useState(false),
    [annulOpen, setAnnulOpen] = useState(false),
    [reason, setReason] = useState(""),
    [movement, setMovement] = useState(""),
    [tipoVinculo, setTipoVinculo] = useState("Individual"),
    [evidence, setEvidence] = useState(""),
    [options, setOptions] = useState<Options | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [fields, setFields] = useState<Record<string, string>>({}),
    alert = useRef<HTMLDivElement>(null),
    linkRef = useRef<HTMLDivElement>(null),
    annulRef = useRef<HTMLDivElement>(null);
  const endpoint = (tipo === "Reposicion" ? reposBase : base) + "/" + id;
  const actualEndpoint = data
    ? (data.operacion.tipo === "Reposicion" ? reposBase : base) + "/" + id
    : endpoint;
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<Detail>(endpoint)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [endpoint, retry]);
  async function openLink() {
    setLinkOpen(true);
    if (!options)
      try {
        setOptions(await api<Options>("/revision-comida/opciones"));
      } catch (e) {
        setError((e as Error).message);
      }
  }
  async function submitLink(undo = false) {
    if (!data) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      await api(
        actualEndpoint + "/vinculo",
        "POST",
        {
          revision: data.operacion.revision,
          motivo: reason,
          ...(undo
            ? { desvincular: true }
            : {
                movimiento: movement,
                tipoVinculo,
                evidenciaVinculo: evidence,
              }),
        },
        { "idempotency-key": crypto.randomUUID() },
      );
      setLinkOpen(false);
      setReason("");
      setMovement("");
      setEvidence("");
      setNotice(undo ? "Vínculo retirado." : "Vínculo verificado.");
      setRetry((r) => r + 1);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setFields(err.fields ?? {});
      requestAnimationFrame(() => {
        if (!focusFirstInvalidField(linkRef.current))
          alert.current?.focus();
      });
    } finally {
      setBusy(false);
    }
  }
  async function submitAnnul() {
    if (!data) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      await api(
        actualEndpoint + "/anular",
        "POST",
        { revision: data.operacion.revision, motivo: reason },
        { "idempotency-key": crypto.randomUUID() },
      );
      setAnnulOpen(false);
      setReason("");
      setNotice("Operación anulada; su historia se conserva.");
      setRetry((r) => r + 1);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setFields(err.fields ?? {});
      requestAnimationFrame(() => {
        if (!focusFirstInvalidField(annulRef.current))
          alert.current?.focus();
      });
    } finally {
      setBusy(false);
    }
  }
  if (error && !data)
    return (
      <Alert retry={() => setRetry((r) => r + 1)}>
        {error}
        <p>
          <button
            className="text-button"
            onClick={() => go(tipo === "Reposicion" ? reposBase : base)}
          >
            Volver a {tipo === "Reposicion" ? "Reposiciones" : "Revisión Comida"}
          </button>
        </p>
      </Alert>
    );
  if (!data) return <p role="status">Cargando ficha…</p>;
  const o = data.operacion;
  const movements = (options?.movimientos ?? []).filter((m) => {
    if (m.anulado) return false;
    if (tipo === "Detalle")
      return m.tipo === "Gasto" && m.origenControl !== "Exterior";
    if (m.tipo === "Ingreso") return m.destinoControl !== "Exterior";
    if (m.tipo === "Transferencia")
      return (
        m.origen !== "S000" &&
        m.destino !== "S000" &&
        m.origenControl !== "Exterior" &&
        m.destinoControl !== "Exterior"
      );
    return false;
  });
  return (
    <>
      <PageHead
        eyebrow="E3.4 · FICHA"
        title={`Operación ${o.id}`}
        description={`${o.concepto} · ${date(o.fecha)}`}
      >
        <button
          className="secondary"
          onClick={() => go(o.tipo === "Reposicion" ? reposBase : base)}
        >
          Volver
        </button>
      </PageHead>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div ref={alert} tabIndex={-1}>
          <Alert>{error} El borrador se conserva.</Alert>
        </div>
      )}
      <section className="panel revision-detail">
        <dl className="revision-facts">
          <div>
            <dt>ID</dt>
            <dd>#{o.id}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>
              {o.tipo}
              {o.esDevolucion ? " · Devolución Sí" : " · Devolución No"}
            </dd>
          </div>
          <div>
            <dt>Fecha operación</dt>
            <dd>{date(o.fecha)}</dd>
          </div>
          <div>
            <dt>Concepto</dt>
            <dd>{o.concepto}</dd>
          </div>
          <div>
            <dt>Importe</dt>
            <dd>
              {eur(o.importe)} · {o.direccion}
            </dd>
          </div>
          <div>
            <dt>Clasificación</dt>
            <dd>
              {classification(o)}
              {o.fueraPresupuestoHistorico &&
                " · marca histórica de fuera presupuesto (solo lectura)"}
            </dd>
          </div>
          <div>
            <dt>Evidencia bancaria</dt>
            <dd>
              {o.evidenciaBancaria ?? "Sin evidencia"} ·{" "}
              {o.estadoEvidenciaBancaria}
            </dd>
          </div>
          <div>
            <dt>Relación compra</dt>
            <dd>
              {o.evidenciaRelacionCompra
                ? `${o.evidenciaRelacionCompra} · Acreditada`
                : "Sin relación acreditada"}
            </dd>
          </div>
          <div>
            <dt>Cuenta/origen</dt>
            <dd>{o.cuentaOrigen ?? "No informada"}</dd>
          </div>
          <div>
            <dt>Vínculo</dt>
            <dd>
              {o.estadoVinculo}
              {o.vinculoMovimiento && (
                <>
                  {" "}
                  · Movimiento #{o.vinculoMovimiento.id} · {o.tipoVinculo}
                  {o.sinConciliacion &&
                    " · sin conciliación de importes"}
                </>
              )}
              {o.evidenciaVinculo && (
                <small className="table-id">
                  Evidencia: {o.evidenciaVinculo}
                </small>
              )}
            </dd>
          </div>
          <div>
            <dt>Efecto</dt>
            <dd>
              {o.efecto}
              <small className="table-id">
                Reconocimiento económico central: Movimientos
              </small>
            </dd>
          </div>
          <div>
            <dt>Ciclo</dt>
            <dd>
              {o.ciclo
                ? `${o.ciclo.id} · ${date(o.ciclo.inicio)} a ${o.ciclo.fin ? date(o.ciclo.fin) : "abierto"}`
                : "Sin ciclo asignable"}
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              {stateLabel(o)} · Rev. {o.revision}
            </dd>
          </div>
          <div>
            <dt>Auditoría (UTC)</dt>
            <dd>
              {stamp(o.actualizado)}
              {o.tipo === "Reposicion" && ` · ${o.estadoTrazabilidad}`}
            </dd>
          </div>
        </dl>
        {o.estadoVinculo === "Revisar" && (
          <p className="notice">
            El Movimiento vinculado cambió o está anulado. El vínculo se conserva
            en «Revisar» y no se reasigna automáticamente. La operación bancaria
            sigue siendo válida.
          </p>
        )}
        {o.tipo === "Reposicion" && (
          <p className="notice">
            Trazabilidad: {o.estadoTrazabilidad} · C-02 (futuro E3.5). La
            cobertura de compensación no se calcula en E3.4.
          </p>
        )}
        <div className="actions">
          {o.estadoRegistro === "Vigente" && (
            <>
              <button
                className="secondary"
                onClick={() =>
                  go(
                    (o.tipo === "Reposicion" ? reposBase : base) +
                      "/" +
                      o.id +
                      "/editar",
                  )
                }
              >
                Editar
              </button>
              <button className="secondary" onClick={() => setAnnulOpen((v) => !v)}>
                Anular
              </button>
              <button className="secondary" onClick={openLink}>
                {o.estadoVinculo === "Sin vínculo" ? "Vincular" : "Cambiar vínculo"}
              </button>
            </>
          )}
        </div>
        {annulOpen && (
          <div className="panel" ref={annulRef}>
            <h3>Anulación lógica</h3>
            <p>
              No se borra el registro. Se conservan ID, vínculo, evidencia y
              auditoría; dejará de computar.
            </p>
            <Field
              id="annul-motivo"
              label="Motivo"
              error={fields.motivo}
            >
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="actions">
              <button className="primary" disabled={busy} onClick={submitAnnul}>
                Confirmar anulación
              </button>
              <button className="secondary" onClick={() => setAnnulOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {linkOpen && (
          <div className="panel" ref={linkRef}>
            <h3>Vínculo con Movimiento</h3>
            <p>
              Solo trazabilidad verificada. No copia fecha/importe, no reparte el
              importe y no cambia el Movimiento.
            </p>
            <Field
              id="link-movimiento"
              label="Movimiento elegible"
              error={fields.movimiento}
            >
              <select
                value={movement}
                onChange={(e) => setMovement(e.target.value)}
              >
                <option value="">Selecciona</option>
                {movements.map((m) => (
                  <option key={m.id} value={m.id}>
                    #{m.id} · {m.fecha} · {m.tipo} · {eur(m.importe)} ·{" "}
                    {m.concepto}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="link-tipoVinculo"
              label="Tipo de vínculo"
              error={fields.tipoVinculo}
            >
              <select
                value={tipoVinculo}
                onChange={(e) => setTipoVinculo(e.target.value)}
              >
                <option>Individual</option>
                {tipo === "Detalle" && <option>Agregado terminal</option>}
              </select>
            </Field>
            <Field
              id="link-evidenciaVinculo"
              label="Evidencia del vínculo"
              error={fields.evidenciaVinculo}
            >
              <input
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </Field>
            <Field id="link-motivo" label="Motivo" error={fields.motivo}>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="actions">
              <button className="primary" disabled={busy} onClick={() => submitLink(false)}>
                Guardar vínculo
              </button>
              {o.estadoVinculo !== "Sin vínculo" && (
                <button className="secondary" disabled={busy} onClick={() => submitLink(true)}>
                  Desvincular
                </button>
              )}
              <button className="secondary" onClick={() => setLinkOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="panel" aria-labelledby="revision-repos">
        <h2 id="revision-repos">Reposiciones</h2>
        <p>
          Cobertura de compensación: E3.5 (no instalado). No se calcula
          «Parcial»/«Completada» en E3.4.
        </p>
        {!data.reposiciones.length ? (
          <p>Sin reposición registrada.</p>
        ) : (
          <ul>
            {data.reposiciones.map((r) => (
              <li key={r.id}>
                <button
                  className="text-button"
                  onClick={() => go(reposBase + "/" + r.id)}
                >
                  #{r.id} · {date(r.fecha)} · {eur(r.importe)}
                </button>{" "}
                · {r.evidenciaBancaria ?? "Sin evidencia"} ·{" "}
                {r.estadoTrazabilidad} · {stateLabel(r)} · Rev. {r.revision}
              </li>
            ))}
          </ul>
        )}
        <button className="secondary" onClick={() => go(reposBase + "/nueva")}>
          Nueva reposición
        </button>
      </section>
      <section className="panel">
        <h2>Auditoría</h2>
        <details>
          <summary>Ver historial ({data.auditoria.length})</summary>
          {data.auditoria.map((a) => (
            <article className="movement-audit" key={a.revision + a.accion}>
              <h3>
                Rev. {a.revision} · {a.accion}
              </h3>
              <p>
                {stamp(a.instante)} · {a.actor}
                {a.motivo ? ` · ${a.motivo}` : ""}
              </p>
            </article>
          ))}
        </details>
      </section>
    </>
  );
}
type Form = {
  fecha: string;
  concepto: string;
  importe: string;
  direccion: string;
  esDevolucion: string;
  clasificacion: string;
  evidenciaBancaria: string;
  evidenciaRelacionCompra: string;
  cuentaOrigen: string;
};
const emptyForm: Form = {
  fecha: "",
  concepto: "",
  importe: "",
  direccion: "Salida",
  esDevolucion: "false",
  clasificacion: "Comida",
  evidenciaBancaria: "",
  evidenciaRelacionCompra: "",
  cuentaOrigen: "",
};
function OperationForm({
  id,
  tipo,
  go,
}: {
  id?: string;
  tipo: "Detalle" | "Reposicion";
  go: (p: string) => void;
}) {
  const endpoint = (tipo === "Reposicion" ? reposBase : base) + (id ? "/" + id : "");
  const [form, setForm] = useState<Form>(emptyForm),
    [old, setOld] = useState<Operacion | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!!id),
    [saved, setSaved] = useState<{
      id: string;
      coincidencias: { id: string; fecha: string; concepto: string }[];
    } | null>(null),
    attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null),
    formRef = useRef<HTMLDivElement>(null),
    initialized = useRef(false);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alert.current?.focus();
    });
  }, [error, fields]);
  useEffect(() => {
    if (!id) return;
    let live = true;
    api<Detail>(endpoint)
      .then((d) => {
        if (!live) return;
        setOld(d.operacion);
        if (!initialized.current) {
          const o = d.operacion;
          setForm({
            fecha: o.fecha,
            concepto: o.concepto,
            importe: o.importe,
            direccion: o.direccion,
            esDevolucion: String(o.esDevolucion),
            clasificacion: o.clasificacion ?? "Comida",
            evidenciaBancaria: o.evidenciaBancaria ?? "",
            evidenciaRelacionCompra: o.evidenciaRelacionCompra ?? "",
            cuentaOrigen: o.cuentaOrigen ?? "",
          });
        }
        setLoading(false);
      })
      .catch((e) => live && (setError(e.message), setLoading(false)));
    return () => {
      live = false;
    };
  }, [endpoint, id]);
  const change = (k: keyof Form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const body = () =>
    tipo === "Detalle"
      ? {
          fecha: form.fecha,
          concepto: form.concepto,
          importe: form.importe.replace(",", "."),
          direccion: form.direccion,
          esDevolucion: form.esDevolucion === "true",
          clasificacion: form.clasificacion,
          evidenciaBancaria: form.evidenciaBancaria || null,
          evidenciaRelacionCompra: form.evidenciaRelacionCompra || null,
          cuentaOrigen: form.cuentaOrigen || null,
          ...(id ? { revision: old?.revision, motivo: reason } : {}),
        }
      : {
          fecha: form.fecha,
          concepto: form.concepto,
          importe: form.importe.replace(",", "."),
          direccion: "Entrada",
          esDevolucion: false,
          evidenciaBancaria: form.evidenciaBancaria,
          cuentaOrigen: form.cuentaOrigen || null,
          ...(id ? { revision: old?.revision, motivo: reason } : {}),
        };
  async function submit() {
    setBusy(true);
    setError("");
    setFields({});
    setSaved(null);
    try {
      const result = await api<
        Detail & {
          coincidencias?: { id: string; fecha: string; concepto: string }[];
        }
      >(
        id ? endpoint + "/rectificar" : endpoint,
        "POST",
        body(),
        { "idempotency-key": attempt.current },
      );
      const target =
        (tipo === "Reposicion" ? reposBase : base) + "/" + result.operacion.id;
      if (!id && result.coincidencias?.length) {
        setSaved({
          id: result.operacion.id,
          coincidencias: result.coincidencias,
        });
        attempt.current = crypto.randomUUID();
        return;
      }
      go(target);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setFields(err.fields ?? {});
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Cargando operación…</p>;
  if (id && !old && error)
    return <Alert retry={() => go(endpoint)}>{error}</Alert>;
  return (
    <>
      <PageHead
        eyebrow={id ? "E3.4 · RECTIFICACIÓN" : "E3.4 · ALTA"}
        title={
          id
            ? `Editar ${tipo === "Reposicion" ? "reposición" : "operación"} ${id}`
            : tipo === "Reposicion"
              ? "Nueva reposición"
              : "Nueva operación"
        }
        description={
          tipo === "Reposicion"
            ? "Entrada real con evidencia bancaria obligatoria. No es una devolución."
            : "Detalle bancario individual. La devolución se identifica expresamente."
        }
      >
        <button className="secondary" onClick={() => go(tipo === "Reposicion" ? reposBase : base)}>
          Cancelar
        </button>
      </PageHead>
      {error && (
        <div
          ref={alert}
          tabIndex={-1}
          role="group"
          aria-label="Error del formulario"
        >
          <Alert>{error} El borrador se conserva.</Alert>
        </div>
      )}
      {saved && (
        <div className="notice" role="status">
          <strong>Operación guardada con coincidencia.</strong> Existe otra
          operación con la misma fecha, importe y concepto. No se ha rechazado:
          revisa si es un hecho real distinto.
          <ul>
            {saved.coincidencias.map((c) => (
              <li key={c.id}>
                #{c.id} · {date(c.fecha)} · {c.concepto}
              </li>
            ))}
          </ul>
          <button
            className="secondary"
            onClick={() =>
              go(
                (tipo === "Reposicion" ? reposBase : base) + "/" + saved.id,
              )
            }
          >
            Ver operación
          </button>
        </div>
      )}
      <div ref={formRef}>
        <FormSection title="Datos de la operación">
          <FormGrid>
            <Field
              id="fecha"
              label="Fecha de operación"
              error={fields.fecha}
            >
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => change("fecha", e.target.value)}
              />
            </Field>
            <Field id="concepto" label="Concepto" error={fields.concepto}>
              <input
                value={form.concepto}
                onChange={(e) => change("concepto", e.target.value)}
              />
            </Field>
            <Field id="importe" label="Importe EUR" error={fields.importe}>
              <input
                inputMode="decimal"
                value={form.importe}
                onChange={(e) => change("importe", e.target.value)}
              />
            </Field>
            {tipo === "Detalle" && (
              <Field
                id="direccion"
                label="Dirección"
                error={fields.direccion}
              >
                <select
                  value={form.direccion}
                  onChange={(e) => change("direccion", e.target.value)}
                >
                  <option>Salida</option>
                  <option>Entrada</option>
                </select>
              </Field>
            )}
            {tipo === "Detalle" && (
              <Field
                id="esDevolucion"
                label="Devolución identificada expresamente"
                error={fields.esDevolucion}
              >
                <select
                  value={form.esDevolucion}
                  onChange={(e) => change("esDevolucion", e.target.value)}
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </Field>
            )}
            {tipo === "Detalle" && (
              <Field
                id="clasificacion"
                label="Clasificación"
                error={fields.clasificacion}
              >
                <select
                  value={form.clasificacion}
                  onChange={(e) => change("clasificacion", e.target.value)}
                >
                  {[
                    "Comida",
                    "Pendiente revisar",
                    "Ocio",
                    "Niños",
                    "Otros",
                    "Fuera presupuesto",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field
              id="evidenciaBancaria"
              label={
                tipo === "Reposicion"
                  ? "Evidencia bancaria (obligatoria)"
                  : "Evidencia bancaria"
              }
              error={fields.evidenciaBancaria}
            >
              <input
                value={form.evidenciaBancaria}
                onChange={(e) => change("evidenciaBancaria", e.target.value)}
              />
            </Field>
            {tipo === "Detalle" && (
              <Field
                id="evidenciaRelacionCompra"
                label="Relación con compra (opcional)"
                error={fields.evidenciaRelacionCompra}
              >
                <input
                  value={form.evidenciaRelacionCompra}
                  onChange={(e) =>
                    change("evidenciaRelacionCompra", e.target.value)
                  }
                />
              </Field>
            )}
            <Field
              id="cuentaOrigen"
              label="Cuenta/origen descriptiva"
              error={fields.cuentaOrigen}
            >
              <input
                value={form.cuentaOrigen}
                onChange={(e) => change("cuentaOrigen", e.target.value)}
              />
            </Field>
          </FormGrid>
          {tipo === "Detalle" && form.direccion === "Entrada" && (
            <p className="help">
              Una entrada de detalle solo es válida como devolución identificada
              expresamente. No se infiere por dirección, fecha, importe ni
              concepto.
            </p>
          )}
          {tipo === "Reposicion" && (
            <p className="help">
              La reposición es una entrada real, no una devolución. Su asignación
              y cobertura pertenecen a E3.5.
            </p>
          )}
          {id && (
            <Field
              id="motivo"
              label="Motivo de rectificación"
              error={fields.motivo}
            >
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          )}
          <p className="help">
            No crea ni modifica Movimientos, Saldos, Gastos ni ejecución
            presupuestaria. No se aceptan campos calculados por el cliente.
          </p>
          <div className="actions">
            <button className="primary" disabled={busy} onClick={submit}>
              {id ? "Guardar rectificación" : "Guardar"}
            </button>
            <button
              className="secondary"
              onClick={() => go(tipo === "Reposicion" ? reposBase : base)}
            >
              Cancelar
            </button>
          </div>
        </FormSection>
      </div>
    </>
  );
}
