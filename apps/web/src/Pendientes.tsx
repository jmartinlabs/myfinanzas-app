import { useEffect, useRef, useState } from "react";
import { api, ApiError, eur } from "./api";
import { Alert, PageHead, TableScroll, Tag } from "./ui";

/**
 * E3.6 — Pendientes y conciliación.
 *
 * Vista de solo lectura. Compone el read model transversal (una fila por caso y
 * tipo) sin total económico global ni acciones de escritura. Las claves de fila
 * son efímeras; los filtros viven solo en la URL y no incluyen importes.
 */

type EstadoItem =
  | "Pendiente"
  | "Exceso"
  | "Revisar"
  | "Alerta"
  | "No disponible"
  | "Resuelto";
type TipoItem = "Anticipo" | "Compartido" | "Comida" | "Conciliacion";
type Cobertura = "Verificada" | "Parcial" | "No disponible" | "No aplica";
type Severidad = "Alerta de conciliación" | "No disponible" | null;

type MetricaItem = {
  clave: string;
  etiqueta: string;
  importe: string | null;
  estado: EstadoItem | null;
  cobertura: Cobertura;
  motivo: string | null;
};
type ContextoHecho = {
  tipo: "Gasto" | "Aportacion" | "Adelanto" | "Devolucion" | "Comida" | "Cierre";
  fuenteId: string;
  fecha: string | null;
  cicloId: string | null;
  ejercicio: number | null;
};
type TransversalItem = {
  claveEfimera: string;
  tipo: TipoItem;
  fuente: {
    motor: string;
    id: string;
    revision: number | null;
  };
  caso: { id: string; nombre: string | null } | null;
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    estado: "Abierto" | "Con fin temporal";
  } | null;
  ejercicio: number | null;
  fechaHecho: string | null;
  magnitud: string;
  importe: string | null;
  signo: string | null;
  estado: EstadoItem;
  cobertura: Cobertura;
  severidad: Severidad;
  motivo: string | null;
  detalle: { etiqueta: string; valor: string | null }[];
  metricas: MetricaItem[];
  contextos: ContextoHecho[];
  alertas: {
    tipo: "Exceso" | "Revisar" | "No disponible";
    importe: string | null;
    participanteId: string | null;
    motivo: string;
  }[];
  enlaces: { tipo: string; href: string }[];
};
type ListaPendientes = {
  filas: TransversalItem[];
  total: number;
  page: number;
  pageSize: number;
  conteos: Record<EstadoItem, number>;
  fuenteFallos: { motor: string; id: string | null; motivo: string }[];
  sinTotalEconomico: true;
  soloLectura: true;
  flujoBase: {
    cicloId: string;
    gastoBruto: string | null;
    sBruto: string | null;
    cobertura: Cobertura;
    motivo: string | null;
  } | null;
};

type ConciliacionCiclo = {
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    estado: string;
    revision: number;
    s0: string;
  };
  siguiente: { id: string; inicio: string; s0: string } | null;
  baseAnalitica: string | null;
  otrosEfectos: string | null;
  cierreAnalitico: string | null;
  s0: string;
  s0Siguiente: string | null;
  bA: string | null;
  difS0Siguiente: string | null;
  difBanco: string | null;
  cobertura: Cobertura;
  estado: "Alerta" | "Coincide" | "No disponible";
  motivo: string | null;
  motivoBanco: string | null;
  calculoVivo: true;
  foto: null;
  noEsCierreFinanciero: true;
  enlaces: { tipo: string; href: string }[];
};

type Filtros = {
  tipo: string;
  estado: string;
  ciclo: string;
  ejercicio: string;
  cobertura: string;
  alcance: "abiertos" | "historico";
  texto: string;
  page: number;
};

const TIPOS: TipoItem[] = ["Anticipo", "Compartido", "Comida", "Conciliacion"];
const ESTADOS: EstadoItem[] = [
  "Pendiente",
  "Exceso",
  "Revisar",
  "Alerta",
  "No disponible",
  "Resuelto",
];
const COBERTURAS: Cobertura[] = [
  "Verificada",
  "Parcial",
  "No disponible",
  "No aplica",
];
const TIPO_LABEL: Record<TipoItem, string> = {
  Anticipo: "Anticipo",
  Compartido: "Compartido",
  Comida: "Comida",
  Conciliacion: "Conciliación",
};
const PAGE_SIZE = 10;

const fecha = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "—";
const importeTexto = (value: string | null, estado: EstadoItem) =>
  value !== null ? eur(value) : estado === "No disponible" ? "No disponible" : "—";
const cicloTexto = (ciclo: TransversalItem["ciclo"]) =>
  ciclo
    ? `${fecha(ciclo.inicio)}${ciclo.fin ? "–" + fecha(ciclo.fin) : " · Abierto"}`
    : "—";
const nombreFila = (fila: TransversalItem) =>
  fila.caso?.nombre?.trim() || fila.fuente.id;

function filtrosDesde(path: string): Filtros {
  const query = new URLSearchParams(path.split("?")[1] ?? "");
  const estado = query.get("estado") ?? "";
  const alcance = query.get("alcance") === "historico" ? "historico" : "abiertos";
  return {
    tipo: query.get("tipo") ?? "",
    estado: alcance === "abiertos" && estado === "Resuelto" ? "" : estado,
    ciclo: query.get("ciclo") ?? "",
    ejercicio: query.get("ejercicio") ?? "",
    cobertura: query.get("cobertura") ?? "",
    alcance,
    texto: query.get("texto") ?? "",
    page: Math.max(1, Number(query.get("page") ?? 1) || 1),
  };
}

function queryDesde(filtros: Filtros) {
  const query = new URLSearchParams();
  if (filtros.tipo) query.set("tipo", filtros.tipo);
  if (filtros.estado) query.set("estado", filtros.estado);
  if (filtros.ciclo) query.set("ciclo", filtros.ciclo);
  if (filtros.ejercicio) query.set("ejercicio", filtros.ejercicio);
  if (filtros.cobertura) query.set("cobertura", filtros.cobertura);
  if (filtros.alcance === "historico") query.set("alcance", "historico");
  if (filtros.texto) query.set("texto", filtros.texto);
  if (filtros.page > 1) query.set("page", String(filtros.page));
  const text = query.toString();
  return text ? "?" + text : "";
}

function filtrosApi(filtros: Filtros) {
  const query = new URLSearchParams();
  if (filtros.tipo) query.set("tipo", filtros.tipo);
  if (filtros.estado) query.set("estado", filtros.estado);
  if (filtros.ciclo) query.set("ciclo", filtros.ciclo);
  if (filtros.ejercicio) query.set("ejercicio", filtros.ejercicio);
  if (filtros.cobertura) query.set("cobertura", filtros.cobertura);
  query.set("alcance", filtros.alcance);
  if (filtros.texto) query.set("texto", filtros.texto);
  query.set("page", String(filtros.page));
  query.set("pageSize", String(PAGE_SIZE));
  return query.toString();
}

function mensajeEstado(estado: EstadoItem) {
  if (estado === "No disponible")
    return "No disponible: falta fuente, motor, periodo, evidencia o prueba suficiente. No equivale a cero.";
  if (estado === "Revisar")
    return "Revisar: una incidencia de cobertura conserva el hecho y no se corrige aquí.";
  if (estado === "Alerta")
    return "Alerta de conciliación: solo aviso; no modifica el saldo inicial ni crea asiento.";
  return null;
}

function coberturaTag(cobertura: Cobertura) {
  return (
    <Tag inactive={cobertura === "No disponible" || cobertura === "No aplica"}>
      {cobertura}
    </Tag>
  );
}

function Alertas({ fila }: { fila: TransversalItem }) {
  if (!fila.alertas.length)
    return fila.motivo ? (
      <p className="pendiente-motive">{fila.motivo}</p>
    ) : null;
  return (
    <div className="pendiente-alerts">
      {fila.alertas.length > 1 && (
        <span className="tag inactive">Varias alertas</span>
      )}
      <ul>
        {fila.alertas.map((alerta, index) => (
          <li key={alerta.tipo + ":" + index}>
            {alerta.tipo}
            {alerta.importe !== null ? ` · ${eur(alerta.importe)}` : ""} —{" "}
            {alerta.motivo}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MotivoCelda({ fila }: { fila: TransversalItem }) {
  const parcial =
    fila.cobertura === "Parcial"
      ? "Subtotal conocido; cobertura parcial. "
      : "";
  return (
    <>
      {fila.alertas.length ? (
        <Alertas fila={fila} />
      ) : (
        <p className="pendiente-motive">
          {parcial}
          {fila.motivo ?? mensajeEstado(fila.estado) ?? "—"}
        </p>
      )}
      {fila.alertas.length > 0 && parcial && (
        <p className="pendiente-motive">Subtotal conocido; cobertura parcial.</p>
      )}
    </>
  );
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function Pendientes({
  path,
  go,
}: {
  path: string;
  go: (path: string) => void;
}) {
  const [filtros, setFiltros] = useState<Filtros>(() => filtrosDesde(path));
  const [texto, setTexto] = useState(() => filtrosDesde(path).texto);
  const [data, setData] = useState<ListaPendientes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState("");
  const [retry, setRetry] = useState(0);
  const [cycles, setCycles] = useState<{ id: string; inicio: string }[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [detail, setDetail] = useState<TransversalItem | null>(null);
  const [conciliacion, setConciliacion] = useState<ConciliacionCiclo | null>(
    null,
  );
  const [detailError, setDetailError] = useState("");
  const [detailStatus, setDetailStatus] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRetry, setDetailRetry] = useState(0);
  const generation = useRef(0);
  const detailGeneration = useRef(0);
  const errorRef = useRef<HTMLDivElement>(null);
  const detailErrorRef = useRef<HTMLDivElement>(null);

  const detailMatch = path
    .split("?")[0]
    .match(/^\/pendientes\/([^/]+)\/([^/]+)$/);
  const detailKey = detailMatch
    ? detailMatch[1] + "/" + detailMatch[2]
    : "";
  const detailTipo = detailMatch ? safeDecode(detailMatch[1]) : null;
  const detailId = detailMatch ? safeDecode(detailMatch[2]) : null;

  useEffect(() => {
    const next = filtrosDesde(path);
    setFiltros(next);
    setTexto(next.texto);
  }, [path]);

  useEffect(() => {
    let live = true;
    async function catalog() {
      try {
        const all: { id: string; inicio: string }[] = [];
        let page = 1,
          total = 0;
        do {
          const result = await api<{
            ciclos: { id: string; inicio: string }[];
            total: number;
          }>("/ciclos?estado=&page=" + page++);
          all.push(...result.ciclos);
          total = result.total;
        } while (all.length < total && page <= 100);
        if (live) {
          setCycles(all);
          setCatalogError("");
        }
      } catch (e) {
        if (live)
          setCatalogError(
            (e as Error).message ||
              "No se pudo leer el catálogo de Ciclos; el filtro por ciclo queda vacío.",
          );
      }
    }
    void catalog();
    return () => {
      live = false;
    };
  }, [retry]);

  useEffect(() => {
    if (detailKey) return;
    const current = ++generation.current;
    setLoading(true);
    setError("");
    setStale("");
    api<ListaPendientes>("/pendientes?" + filtrosApi(filtros))
      .then((result) => {
        if (current !== generation.current) {
          setStale(
            "Se descartó una respuesta anterior; la selección actual se conserva.",
          );
          return;
        }
        setData(result);
      })
      .catch((e) => {
        if (current !== generation.current) return;
        setData(null);
        setError((e as Error).message);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [
    detailKey,
    filtros.tipo,
    filtros.estado,
    filtros.ciclo,
    filtros.ejercicio,
    filtros.cobertura,
    filtros.alcance,
    filtros.texto,
    filtros.page,
    retry,
  ]);

  useEffect(() => {
    if (!detailMatch) {
      setDetail(null);
      setConciliacion(null);
      setDetailError("");
      setDetailStatus(0);
      return;
    }
    const current = ++detailGeneration.current;
    setDetailLoading(true);
    setDetail(null);
    setConciliacion(null);
    if (detailTipo === null || detailId === null) {
      setDetailStatus(422);
      setDetailError("Identificador no válido.");
      setDetailLoading(false);
      return;
    }
    const tipo = detailTipo,
      id = detailId;
    setDetailError("");
    setDetailStatus(0);
    setDetail(null);
    setConciliacion(null);
    let conciliacionFailed = false;
    api<{ fila: TransversalItem }>(
      `/pendientes/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}`,
    )
      .then((result) => {
        if (current === detailGeneration.current) setDetail(result.fila);
      })
      .catch((e) => {
        if (current !== detailGeneration.current) return;
        setDetailStatus(e instanceof ApiError ? e.status : 0);
        setDetailError((e as Error).message);
      })
      .finally(() => {
        if (current === detailGeneration.current) setDetailLoading(false);
      });
    if (tipo === "Conciliacion")
      api<ConciliacionCiclo>(
        `/conciliacion/ciclos/${encodeURIComponent(id)}`,
      )
        .then((result) => {
          if (current === detailGeneration.current) setConciliacion(result);
        })
        .catch(() => {
          conciliacionFailed = true;
        })
        .finally(() => {
          if (conciliacionFailed) setConciliacion(null);
        });
    return () => {
      detailGeneration.current++;
    };
  }, [detailKey, detailRetry]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => errorRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [error]);
  useEffect(() => {
    if (!detailError) return;
    const timer = setTimeout(() => detailErrorRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [detailError]);

  function update(patch: Partial<Filtros>, resetPage = true) {
    const next: Filtros = {
      ...filtros,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? filtros.page),
    };
    if (next.alcance === "abiertos" && next.estado === "Resuelto")
      next.estado = "";
    if (next.estado === "Resuelto") next.alcance = "historico";
    setFiltros(next);
    setTexto(next.texto);
    history.replaceState(null, "", "/pendientes" + queryDesde(next));
  }
  function buscar() {
    update({ texto, page: 1 });
  }
  const listHref = "/pendientes" + queryDesde(filtros);
  const detailHref = (fila: TransversalItem) =>
    `/pendientes/${encodeURIComponent(fila.tipo)}/${encodeURIComponent(fila.fuente.id)}` +
    queryDesde(filtros);

  if (detailMatch) {
    const tipo = detailTipo ?? detailMatch[1],
      id = detailId ?? detailMatch[2];
    const volver = (
      <a
        className="back"
        href={listHref}
        onClick={(event) => {
          event.preventDefault();
          go(listHref);
        }}
      >
        ← Volver a pendientes
      </a>
    );
    if (detailLoading && !detail)
      return (
        <section className="pendientes-page" aria-busy="true">
          {volver}
          <PageHead
            eyebrow="E3.6 · Detalle"
            title={`Detalle · ${tipo} ${id}`}
            description="Consultando la fila y sus fuentes. Sin importes provisionales."
          />
          <p role="status">Cargando detalle del pendiente…</p>
        </section>
      );
    if (detailError || !detail)
      return (
        <section className="pendientes-page">
          {volver}
          <PageHead
            eyebrow="E3.6 · Detalle"
            title={`Detalle · ${tipo} ${id}`}
            description="Solo lectura; no corrige ni escribe hechos."
          />
          <div
            ref={detailErrorRef}
            tabIndex={-1}
            role="group"
            aria-label="Error del detalle"
          >
            <Alert
              retry={() => setDetailRetry((value) => value + 1)}
            >
              {detailStatus === 404
                ? "El caso ya no existe o no es accesible. Vuelve a la lista de pendientes."
                : detailStatus === 409
                  ? "La revisión cambió. Vuelve a leer la lista antes de continuar."
                  : detailStatus === 422
                    ? "La consulta del detalle no es válida. Revisa el tipo o el identificador."
                    : detailError ||
                      "No se pudo leer el detalle. El resto de fuentes sigue disponible."}
            </Alert>
          </div>
        </section>
      );
    const fila = detail;
    return (
      <section className="pendientes-page">
        {volver}
        <PageHead
          eyebrow={`E3.6 · ${TIPO_LABEL[fila.tipo] ?? fila.tipo}`}
          title={`Detalle · ${nombreFila(fila)}`}
          description="Solo lectura. No hay acciones de escritura; los enlaces abren el módulo propietario."
        >
          <Tag inactive={fila.estado === "No disponible" || fila.estado === "Resuelto"}>
            {fila.estado}
          </Tag>
          {coberturaTag(fila.cobertura)}
        </PageHead>

        {fila.importe === null && (
          <p className="notice">
            <strong>No disponible — </strong>
            {fila.motivo ?? mensajeEstado(fila.estado) ?? "motivo no informado."}
            {" "}No se muestra cero como sustituto.
          </p>
        )}

        <section className="panel" aria-label="Resumen del caso">
          <h2>Resumen del caso</h2>
          <dl className="pendiente-detail-grid">
            <div>
              <dt>Fuente</dt>
              <dd>
                {fila.fuente.motor} · {fila.fuente.id}
                {fila.fuente.revision !== null
                  ? ` · revisión ${fila.fuente.revision}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Caso</dt>
              <dd>{nombreFila(fila)}</dd>
            </div>
            <div>
              <dt>Ciclo</dt>
              <dd>
                {fila.ciclo
                  ? `${fila.ciclo.id} · ${cicloTexto(fila.ciclo)}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Ejercicio</dt>
              <dd>{fila.ejercicio ?? "—"}</dd>
            </div>
            <div>
              <dt>Magnitud</dt>
              <dd>{fila.magnitud}</dd>
            </div>
            <div>
              <dt>Importe</dt>
              <dd>
                <strong>{importeTexto(fila.importe, fila.estado)}</strong>
                <small> Importe actual, no un pendiente al corte.</small>
              </dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{fila.estado}</dd>
            </div>
            <div>
              <dt>Cobertura</dt>
              <dd>{fila.cobertura}</dd>
            </div>
            <div>
              <dt>Severidad</dt>
              <dd>{fila.severidad ?? "Sin alerta"}</dd>
            </div>
            <div>
              <dt>Fecha del último hecho</dt>
              <dd>{fecha(fila.fechaHecho)}</dd>
            </div>
          </dl>
          <p className="pendiente-motive">
            {fila.motivo ?? mensajeEstado(fila.estado) ?? "Sin motivo adicional."}
          </p>
        </section>

        {fila.tipo === "Conciliacion" && (
          <section className="panel" aria-label="Conciliación de apertura">
            <h2>Conciliación de apertura</h2>
            {conciliacion ? (
              <>
                <dl className="pendiente-detail-grid">
                  <div>
                    <dt>Ciclo anterior</dt>
                    <dd>
                      {conciliacion.ciclo.id} ·{" "}
                      {fecha(conciliacion.ciclo.inicio)} →{" "}
                      {fecha(conciliacion.ciclo.fin)}
                    </dd>
                  </div>
                  <div>
                    <dt>Siguiente Inicio</dt>
                    <dd>
                      {conciliacion.siguiente
                        ? `${conciliacion.siguiente.id} · ${fecha(conciliacion.siguiente.inicio)}`
                        : "Sin siguiente Inicio"}
                    </dd>
                  </div>
                  <div>
                    <dt>S0 siguiente (manual)</dt>
                    <dd>
                      {importeTexto(
                        conciliacion.s0Siguiente,
                        conciliacion.cobertura === "Verificada"
                          ? "Alerta"
                          : "No disponible",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Base analítica</dt>
                    <dd>{importeTexto(conciliacion.baseAnalitica, "No disponible")}</dd>
                  </div>
                  <div>
                    <dt>Cierre analítico</dt>
                    <dd>
                      {importeTexto(conciliacion.cierreAnalitico, "No disponible")}
                    </dd>
                  </div>
                  <div>
                    <dt>DIF_S0_SIGUIENTE</dt>
                    <dd>
                      <strong>
                        {conciliacion.estado === "No disponible"
                          ? "No disponible"
                          : importeTexto(conciliacion.difS0Siguiente, "No disponible")}
                      </strong>
                      <small> Solo aviso; no modifica S0 ni crea asiento.</small>
                    </dd>
                  </div>
                  <div>
                    <dt>DIF_BANCO</dt>
                    <dd>
                      {importeTexto(conciliacion.difBanco, "No disponible")}
                      <small> {conciliacion.motivoBanco}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Cobertura</dt>
                    <dd>{conciliacion.cobertura}</dd>
                  </div>
                  <div>
                    <dt>B_A (posición al Inicio)</dt>
                    <dd>{importeTexto(conciliacion.bA, "No disponible")}</dd>
                  </div>
                  <div>
                    <dt>Otros efectos bancarios</dt>
                    <dd>{importeTexto(conciliacion.otrosEfectos, "No disponible")}</dd>
                  </div>
                </dl>
                {conciliacion.estado === "No disponible" && (
                  <p className="notice">
                    <strong>Conciliación no disponible — </strong>
                    {conciliacion.motivo ?? fila.motivo ?? "motivo no informado."}
                  </p>
                )}
                <p className="pendiente-motive">
                  Cálculo vivo, sin foto ni cierre. Esto no es un cierre
                  financiero ni modifica el saldo inicial. AC-31 sigue bloqueado
                  por E4.8/E4.9.
                </p>
                <div className="actions">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() =>
                      go(`/comida?ciclo=${encodeURIComponent(conciliacion.ciclo.id)}`)
                    }
                  >
                    Abrir Comida del ciclo
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() =>
                      go(`/ciclos/${encodeURIComponent(conciliacion.ciclo.id)}`)
                    }
                  >
                    Abrir Ciclo
                  </button>
                </div>
              </>
            ) : (
              <p className="notice">
                <strong>Conciliación no disponible — </strong>
                {fila.motivo ?? "sin proveedor de cierre/cobertura verificable."}
              </p>
            )}
          </section>
        )}

        <section className="panel" aria-label="Métricas del caso">
          <h2>Métricas y cobertura</h2>
          {fila.metricas.length ? (
            <TableScroll label="Métricas del caso">
              <table className="pendiente-metrics">
                <thead>
                  <tr>
                    <th scope="col">Métrica</th>
                    <th scope="col">Importe</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Cobertura</th>
                    <th scope="col">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {fila.metricas.map((metrica) => (
                    <tr key={metrica.clave}>
                      <td data-label="Métrica">{metrica.etiqueta}</td>
                      <td data-label="Importe">
                        {metrica.importe === null
                          ? metrica.cobertura === "No disponible"
                            ? "No disponible"
                            : "—"
                          : eur(metrica.importe)}
                      </td>
                      <td data-label="Estado">{metrica.estado ?? "—"}</td>
                      <td data-label="Cobertura">{metrica.cobertura}</td>
                      <td data-label="Motivo">
                        {metrica.motivo ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          ) : (
            <p>Sin métricas: la fila solo conserva el motivo de indisponibilidad.</p>
          )}
        </section>

        <section className="panel" aria-label="Detalle y hechos">
          <h2>Detalle y hechos</h2>
          {fila.detalle.length > 0 && (
            <dl className="pendiente-detail-grid">
              {fila.detalle.map((item, index) => (
                <div key={item.etiqueta + ":" + index}>
                  <dt>{item.etiqueta}</dt>
                  <dd>
                    {item.valor === null
                      ? "No disponible"
                      : item.valor}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {fila.contextos.length > 0 && (
            <ul className="pendiente-contextos">
              {fila.contextos.map((contexto) => (
                <li key={contexto.tipo + ":" + contexto.fuenteId}>
                  {contexto.tipo} · {contexto.fuenteId} ·{" "}
                  {fecha(contexto.fecha)} · ciclo {contexto.cicloId ?? "—"} ·
                  ejercicio {contexto.ejercicio ?? "—"}
                </li>
              ))}
            </ul>
          )}
          <Alertas fila={fila} />
        </section>

        <section className="panel" aria-label="Enlaces del caso">
          <h2>Enlaces al módulo propietario</h2>
          <div className="actions">
            {fila.enlaces.map((enlace) => (
              <button
                key={enlace.tipo + ":" + enlace.href}
                className="secondary"
                type="button"
                onClick={() => go(enlace.href)}
              >
                Abrir {enlace.tipo}
              </button>
            ))}
            <button
              className="text-button"
              type="button"
              onClick={() => go(listHref)}
            >
              Volver a pendientes
            </button>
          </div>
        </section>
        {detailLoading && <p role="status">Actualizando detalle…</p>}
      </section>
    );
  }

  const totalPaginas = Math.max(
    1,
    Math.ceil((data?.total ?? 0) / (data?.pageSize ?? PAGE_SIZE)),
  );
  return (
    <section className="pendientes-page">
      <PageHead
        eyebrow="E3.6 · CONSULTA"
        title="Pendientes y conciliación"
        description="Una fila por caso y tipo. Sin total económico global entre tipos; cada importe pertenece a su motor."
      >
        <button
          className="secondary"
          type="button"
          onClick={() => setRetry((value) => value + 1)}
        >
          Actualizar
        </button>
      </PageHead>

      <div className="notice" role="note">
        No se suman importes entre tipos. El exceso se mantiene separado del
        pendiente y no se compensa. «No disponible» nunca equivale a cero.
      </div>

      <section
        className="panel catalog-panel pendientes-list"
        aria-label="Listado de pendientes y conciliación"
      >
        <form
          className="filters pendientes-filters"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            buscar();
          }}
        >
          <label>
            Tipo
            <select
              aria-label="Tipo"
              value={filtros.tipo}
              onChange={(event) => update({ tipo: event.target.value })}
            >
              <option value="">Todos</option>
              {TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_LABEL[tipo]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select
              aria-label="Estado"
              value={filtros.estado}
              onChange={(event) => update({ estado: event.target.value })}
            >
              <option value="">No resueltos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ciclo
            <select
              aria-label="Ciclo"
              value={filtros.ciclo}
              onChange={(event) => update({ ciclo: event.target.value })}
            >
              <option value="">Todos</option>
              {cycles.map((ciclo) => (
                <option key={ciclo.id} value={ciclo.id}>
                  {ciclo.id} · {fecha(ciclo.inicio)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ejercicio
            <select
              aria-label="Ejercicio"
              value={filtros.ejercicio}
              onChange={(event) => update({ ejercicio: event.target.value })}
            >
              <option value="">Todos</option>
              {[
                ...new Set(
                  (data?.filas ?? [])
                    .map((fila) => fila.ejercicio)
                    .filter((year): year is number => year !== null),
                ),
              ]
                .sort()
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Cobertura
            <select
              aria-label="Cobertura"
              value={filtros.cobertura}
              onChange={(event) => update({ cobertura: event.target.value })}
            >
              <option value="">Todas</option>
              {COBERTURAS.map((cobertura) => (
                <option key={cobertura} value={cobertura}>
                  {cobertura}
                </option>
              ))}
            </select>
          </label>
          <label>
            Alcance
            <select
              aria-label="Alcance"
              value={filtros.alcance}
              onChange={(event) =>
                update({ alcance: event.target.value as Filtros["alcance"] })
              }
            >
              <option value="abiertos">No resueltos</option>
              <option value="historico">Histórico / resueltos</option>
            </select>
          </label>
          <label className="search">
            Buscar por REF/ID/nombre
            <input
              type="search"
              aria-label="Buscar por REF/ID/nombre"
              value={texto}
              maxLength={120}
              onChange={(event) => setTexto(event.target.value)}
            />
          </label>
          <div className="pendientes-search-action">
            <button className="primary" type="submit">
              Buscar
            </button>
          </div>
        </form>

        <div className="list-toolbar">
          <p role="status">
            {loading
              ? "Cargando pendientes…"
              : error
                ? "Consulta no disponible; los filtros se conservan."
                : `${data?.total ?? 0} ${data?.total === 1 ? "fila" : "filas"} · sin total económico global`}
          </p>
          <span>
            Orden: estado · último hecho descendente · ID estable
          </span>
        </div>

        {catalogError && (
          <Alert retry={() => setRetry((value) => value + 1)}>
            No se pudo leer el catálogo de Ciclos. {catalogError} El resto de
            fuentes sigue disponible.
          </Alert>
        )}
        {stale && (
          <p className="notice" role="status">
            {stale}
          </p>
        )}
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="group"
            aria-label="Error de consulta"
          >
            <Alert retry={() => setRetry((value) => value + 1)}>
              {error} Los filtros y la selección se conservan.
            </Alert>
          </div>
        )}

        {loading && (
          <div className="pendientes-skeleton" aria-busy="true">
            <p role="status">Cargando pendientes…</p>
            <p className="muted">
              Esqueleto con etiquetas; no hay importes provisionales.
            </p>
            <ul>
              <li>Tipo</li>
              <li>Caso / fuente</li>
              <li>Ciclo</li>
              <li>Ejercicio</li>
              <li>Magnitud</li>
              <li>Importe</li>
              <li>Estado · cobertura</li>
            </ul>
          </div>
        )}

        {!loading && !error && data && data.filas.length === 0 && (
          <div className="empty">
            <h2>
              {filtros.alcance === "historico"
                ? "Sin histórico/resueltos para este filtro."
                : "No hay pendientes abiertos para este filtro."}
            </h2>
            <p>
              El vacío no es un total cero de todas las magnitudes. Puedes
              consultar el histórico o limpiar los filtros.
            </p>
            <div className="actions">
              <button
                className="secondary"
                type="button"
                onClick={() =>
                  update(
                    filtros.alcance === "historico"
                      ? { alcance: "abiertos", estado: "", page: 1 }
                      : { alcance: "historico", page: 1 },
                  )
                }
              >
                {filtros.alcance === "historico"
                  ? "Volver a no resueltos"
                  : "Ver histórico/resueltos"}
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  const empty: Filtros = {
                    tipo: "",
                    estado: "",
                    ciclo: "",
                    ejercicio: "",
                    cobertura: "",
                    alcance: "abiertos",
                    texto: "",
                    page: 1,
                  };
                  setFiltros(empty);
                  setTexto("");
                  history.replaceState(null, "", "/pendientes");
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data && data.filas.length > 0 && (
          <>
            <div className="desktop-list">
              <TableScroll label="Pendientes y conciliación">
                <table className="pendientes-table">
                  <caption className="sr-only">
                    Pendientes y conciliación por caso y tipo
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Tipo</th>
                      <th scope="col">Caso / fuente</th>
                      <th scope="col">Ciclo</th>
                      <th scope="col">Ejercicio</th>
                      <th scope="col">Magnitud</th>
                      <th scope="col">Importe</th>
                      <th scope="col">Estado · cobertura</th>
                      <th scope="col">Motivo y alertas</th>
                      <th scope="col">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.filas.map((fila) => (
                      <tr key={fila.claveEfimera}>
                        <td>
                          <strong>{TIPO_LABEL[fila.tipo] ?? fila.tipo}</strong>
                          <span className="table-id">{fila.fuente.motor}</span>
                        </td>
                        <td>
                          <a
                            href={detailHref(fila)}
                            onClick={(event) => {
                              event.preventDefault();
                              go(detailHref(fila));
                            }}
                          >
                            {nombreFila(fila)}
                          </a>
                          <span className="table-id">{fila.fuente.id}</span>
                        </td>
                        <td>{cicloTexto(fila.ciclo)}</td>
                        <td>{fila.ejercicio ?? "—"}</td>
                        <td>{fila.magnitud}</td>
                        <td className="money">
                          {importeTexto(fila.importe, fila.estado)}
                        </td>
                        <td>
                          <Tag
                            inactive={
                              fila.estado === "No disponible" ||
                              fila.estado === "Resuelto"
                            }
                          >
                            {fila.estado}
                          </Tag>
                          <span className="table-id">
                            Cobertura: {fila.cobertura}
                            {fila.severidad ? ` · ${fila.severidad}` : ""}
                          </span>
                        </td>
                        <td>
                          <MotivoCelda fila={fila} />
                        </td>
                        <td className="pendiente-action">
                          <a
                            href={detailHref(fila)}
                            onClick={(event) => {
                              event.preventDefault();
                              go(detailHref(fila));
                            }}
                          >
                            Abrir
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </div>
            <ul className="mobile-list pendientes-cards">
              {data.filas.map((fila) => (
                <li key={fila.claveEfimera}>
                  <div className="card-head">
                    <h2>
                      <a
                        href={detailHref(fila)}
                        onClick={(event) => {
                          event.preventDefault();
                          go(detailHref(fila));
                        }}
                      >
                        {nombreFila(fila)}
                      </a>
                    </h2>
                    <Tag
                      inactive={
                        fila.estado === "No disponible" ||
                        fila.estado === "Resuelto"
                      }
                    >
                      {fila.estado}
                    </Tag>
                  </div>
                  <p className="id-label">
                    {TIPO_LABEL[fila.tipo] ?? fila.tipo} · {fila.fuente.id} ·{" "}
                    {fila.fuente.motor}
                  </p>
                  <dl className="pendiente-facts">
                    <div>
                      <dt>{fila.magnitud}</dt>
                      <dd>{importeTexto(fila.importe, fila.estado)}</dd>
                    </div>
                    <div>
                      <dt>Ciclo</dt>
                      <dd>{cicloTexto(fila.ciclo)}</dd>
                    </div>
                    <div>
                      <dt>Ejercicio</dt>
                      <dd>{fila.ejercicio ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Cobertura</dt>
                      <dd>{fila.cobertura}</dd>
                    </div>
                  </dl>
                  {fila.motivo && !fila.alertas.length && (
                    <p className="pendiente-motive">{fila.motivo}</p>
                  )}
                  <Alertas fila={fila} />
                  <a
                    href={detailHref(fila)}
                    onClick={(event) => {
                      event.preventDefault();
                      go(detailHref(fila));
                    }}
                  >
                    Abrir detalle
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        {!loading && !error && data && data.fuenteFallos.length > 0 && (
          <section
            className="pendientes-fallos"
            aria-label="Fuentes con error"
          >
            <h2>Fuentes con error</h2>
            <ul>
              {data.fuenteFallos.map((fallo, index) => (
                <li key={fallo.motor + ":" + (fallo.id ?? "") + ":" + index}>
                  No se pudo leer {fallo.motor}
                  {fallo.id ? ` (${fallo.id})` : ""}. {fallo.motivo} El resto
                  de fuentes sigue disponible.
                </li>
              ))}
            </ul>
          </section>
        )}

        {data && (
          <div className="list-footer">
            <span>
              {data.total} {data.total === 1 ? "fila" : "filas"}
              {data.filas.length > 0 ? ` · página ${data.page} de ${totalPaginas}` : ""}
              {Object.entries(data.conteos)
                .filter(([estado, count]) => estado !== "Resuelto" && count > 0)
                .map(([estado, count]) => ` · ${count} ${estado}`)
                .join("")}
              {data.conteos.Resuelto > 0
                ? ` · ${data.conteos.Resuelto} Resuelto (histórico)`
                : ""}
            </span>
            <div className="actions">
              {filtros.ciclo && (
                <>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      go(`/flujo-mensual?ciclo=${encodeURIComponent(filtros.ciclo)}`)
                    }
                  >
                    Ver Flujo ajustado del ciclo
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      go(`/planes-ciclo?ciclo=${encodeURIComponent(filtros.ciclo)}`)
                    }
                  >
                    Ver Plan del ciclo
                  </button>
                </>
              )}
              <button
                className="text-button"
                type="button"
                disabled={filtros.page <= 1 || loading}
                onClick={() => update({ page: filtros.page - 1 }, false)}
              >
                Anterior
              </button>
              <button
                className="text-button"
                type="button"
                disabled={
                  loading || filtros.page >= totalPaginas || data.filas.length === 0
                }
                onClick={() => update({ page: filtros.page + 1 }, false)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="page-foot">
        Vista de solo lectura. Cada fila conserva sus métricas y cobertura; no
        se persisten pendientes ni se crea un segundo maestro.
      </p>
    </section>
  );
}
