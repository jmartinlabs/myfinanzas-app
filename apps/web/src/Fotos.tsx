import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api } from "./api";
import {
  Alert,
  Amount,
  Badge,
  DataList,
  EmptyState,
  PageHead,
  Skeleton,
  Table,
  type TableColumn,
} from "./ui";
import {
  countPhrase,
  coverageRows,
  coverageState,
  noDisponibleRows,
  periodNoDisponibleRows,
  property,
} from "./fotos/data";
import { failureFrom, failureMessage } from "./fotos/errors";
import { date, money, utc } from "./fotos/format";
import { motivoTexto, TOTAL_LABELS } from "./fotos/labels";
import { amountState, estadoTone } from "./fotos/states";
import type {
  BloqueCoberturaDto,
  CicloResumen,
  ComponentePeriodoDto,
  ContrasteDto,
  ContrasteMetricaDto,
  CoverageRow,
  Failure,
  FailureContext,
  FotoCicloDto,
  FotoPeriodoDto,
  FotoPersistida,
  Modo,
  NoDisponibleRow,
  PaginaCiclos,
  ValorCicloDto,
  VersionFotoDto,
  Vista,
} from "./fotos/types";
import {
  seleccionComparacionVersion,
  trimestreActual,
  versionExiste,
  vistaDesdePath,
  vistaUrl,
} from "./fotos/view";

/**
 * E4.11 I5 — consulta provisional de fotografías.
 *
 * Solo lectura. El cliente consume exclusivamente los contratos publicados de
 * E4.11 (`/fotos/ciclos/:ciclo`, `/versiones`, `/fotos/periodos`, por id y el
 * contraste vivo de I4). No recalcula economía, no suma valores, no convierte
 * una ausencia en 0 y no certifica un total parcial. La foto y el cálculo vivo
 * se muestran siempre separados y etiquetados (`Foto` / `Actual`).
 *
 * DT8 no está aprobada: esta UI es provisional y no declara aceptación visual.
 */

function ErrorBox({
  failure,
  context,
  retry,
  focus = true,
  children,
}: {
  failure: Failure;
  context: FailureContext;
  retry?: () => void;
  focus?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) requestAnimationFrame(() => ref.current?.focus());
  }, [failure, focus]);
  return (
    <div tabIndex={-1} ref={ref}>
      <Alert retry={retry}>
        <p>{failureMessage(failure, context)}</p>
        {failure.code && (
          <p className="muted">
            Código: {failure.code}
            {failure.status ? ` · HTTP ${failure.status}` : ""}
          </p>
        )}
        {failure.requestId && (
          <p className="muted">Referencia: {failure.requestId}</p>
        )}
        {Object.keys(failure.fields).length > 0 && (
          <ul className="fotos-list">
            {Object.entries(failure.fields).map(([campo, mensaje]) => (
              <li key={campo}>
                <strong>{campo}</strong>: {mensaje}
              </li>
            ))}
          </ul>
        )}
        {children}
      </Alert>
    </div>
  );
}

function CoverageTable({
  rows,
  label,
}: {
  rows: CoverageRow[];
  label: string;
}) {
  const columns: TableColumn<CoverageRow>[] = [
    {
      id: "bloque",
      header: "Bloque",
      cell: (row) => TOTAL_LABELS[row.bloque] ?? row.bloque,
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (row) => <Badge tone={estadoTone(row.estado)} label={row.estado} />,
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: (row) =>
        row.motivo ? row.motivo : <span className="muted">Sin motivo</span>,
    },
  ];
  return (
    <>
      <div className="desktop-list fotos-table">
        <Table
          caption={label}
          label={label}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.bloque}
        />
      </div>
      <DataList
        columns={columns}
        rows={rows}
        rowKey={(row) => row.bloque}
        label={label + " móvil"}
        className="mobile-list"
      />
    </>
  );
}

function NoDisponibleList({ rows }: { rows: NoDisponibleRow[] }) {
  return (
    <ul className="fotos-list">
      {rows.map((row, index) => (
        <li key={`${row.ciclo ?? ""}:${row.version ?? ""}:${row.bloque}:${index}`}>
          <strong>
            {row.ciclo ? `${row.ciclo} · ` : ""}
            {TOTAL_LABELS[row.bloque] ?? row.bloque}
            {row.version !== undefined ? ` · v${row.version}` : ""}
          </strong>{" "}
          <Badge tone={estadoTone(row.estado)} label={row.estado} />{" "}
          <span>{row.motivo ?? "Sin motivo declarado"}</span>
        </li>
      ))}
    </ul>
  );
}

function Motivo({ value }: { value: string | null }) {
  if (!value) return <span className="muted">Sin motivo declarado</span>;
  return (
    <>
      {motivoTexto(value)}
      <small className="fotos-code">{value}</small>
    </>
  );
}

function PhotoSummary({ foto }: { foto: FotoPersistida }) {
  const rows = [
    { label: "Ciclo", value: foto.ciclo },
    { label: "Versión", value: `v${foto.version}` },
    {
      label: "Ventana",
      value: `${date(foto.ventana.inicio)} → ${date(foto.ventana.fin)}`,
    },
    { label: "Saldo inicial (S0)", value: money(foto.ventana.saldoInicial) },
    { label: "Creada", value: utc(foto.creadoUtc) },
    { label: "Actor", value: foto.actor },
    { label: "App / esquema", value: `${foto.appVersion} · ${foto.schemaVersion}` },
    {
      label: "Hechos",
      value: `${foto.estadoHechos} · ${countPhrase(
        property(foto.hechos, "movimientos"),
        "movimiento",
        "movimientos",
      )}`,
    },
    {
      label: "Plan",
      value: `${foto.estadoPlan} · ${countPhrase(
        property(foto.plan, "items"),
        "línea",
        "líneas",
      )}`,
    },
    { label: "Cobertura", value: coverageState(foto.cobertura) },
  ];
  return (
    <dl className="fotos-metrics">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
      <div>
        <dt>Fingerprint</dt>
        <dd>
          <code className="fotos-fingerprint" title={foto.fingerprint}>
            {foto.fingerprint}
          </code>
        </dd>
      </div>
      <div>
        <dt>Motivo</dt>
        <dd>{foto.motivo ?? "Sin motivo declarado"}</dd>
      </div>
    </dl>
  );
}

function ComparisonCard({
  foto,
  etiqueta,
}: {
  foto: FotoCicloDto;
  etiqueta: string;
}) {
  const persistida = foto.foto;
  if (!persistida)
    return (
      <article className="fotos-compare-card">
        <h3>{etiqueta}</h3>
        <EmptyState title="Sin foto" icon="○">
          Esta versión no devolvió una fotografía persistida.
        </EmptyState>
      </article>
    );
  return (
    <article className="fotos-compare-card" aria-label={etiqueta}>
      <div className="fotos-section-head">
        <h3>
          {etiqueta} · v{persistida.version}
        </h3>
        <Badge
          tone={foto.vigente ? "ok" : "partial"}
          label={foto.vigente ? "Vigente" : "No vigente"}
        />
      </div>
      <PhotoSummary foto={persistida} />
      <p className="help">
        Solo lectura. La comparación no recalcula importes ni certifica
        equivalencia.
      </p>
    </article>
  );
}

function CicloPanel({
  ciclo,
  version,
  onSelectCiclo,
  onSelectVersion,
  go,
}: {
  ciclo: string;
  version: string;
  onSelectCiclo: (id: string) => void;
  onSelectVersion: (version: string) => void;
  go: (path: string) => void;
}) {
  const [ciclos, setCiclos] = useState<CicloResumen[] | null>(null);
  const [catalogoError, setCatalogoError] = useState<Failure | null>(null);
  const [catalogoCargando, setCatalogoCargando] = useState(true);
  const [catalogoReintento, setCatalogoReintento] = useState(0);

  const [versiones, setVersiones] = useState<VersionFotoDto[] | null>(null);
  const [versionesError, setVersionesError] = useState<Failure | null>(null);
  const [versionesCargando, setVersionesCargando] = useState(false);
  const [versionesReintento, setVersionesReintento] = useState(0);

  const [foto, setFoto] = useState<FotoCicloDto | null>(null);
  const [fotoError, setFotoError] = useState<Failure | null>(null);
  const [fotoCargando, setFotoCargando] = useState(false);
  const [fotoReintento, setFotoReintento] = useState(0);

  const [contraste, setContraste] = useState<ContrasteDto | null>(null);
  const [contrasteError, setContrasteError] = useState<Failure | null>(null);
  const [contrasteCargando, setContrasteCargando] = useState(false);
  const [contrasteReintento, setContrasteReintento] = useState(0);

  const [compararA, setCompararA] = useState("");
  const [compararB, setCompararB] = useState("");
  const [comparacion, setComparacion] = useState<{
    a: FotoCicloDto;
    b: FotoCicloDto;
  } | null>(null);
  const [comparacionError, setComparacionError] = useState<Failure | null>(
    null,
  );
  const [comparacionCargando, setComparacionCargando] = useState(false);
  const comparisonRequest = useRef(0);
  const comparisonContext = `${ciclo}|${
    versiones?.map((item) => item.version).join(",") ?? "null"
  }`;
  const comparisonContextRef = useRef(comparisonContext);
  comparisonContextRef.current = comparisonContext;

  useEffect(() => {
    let live = true;
    setCatalogoCargando(true);
    setCatalogoError(null);
    (async () => {
      try {
        const todos: CicloResumen[] = [];
        let page = 1;
        let total = 0;
        do {
          const data = await api<PaginaCiclos>(
            `/ciclos?estado=&page=${page++}`,
          );
          todos.push(...data.ciclos);
          total = data.total;
        } while (todos.length < total && page <= 100);
        if (!live) return;
        setCiclos(todos);
      } catch (error) {
        if (!live) return;
        setCiclos(null);
        setCatalogoError(failureFrom(error));
      } finally {
        if (live) setCatalogoCargando(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [catalogoReintento]);

  useEffect(() => {
    if (!ciclo && ciclos && ciclos.length > 0) onSelectCiclo(ciclos[0].id);
  }, [ciclo, ciclos, onSelectCiclo]);

  useEffect(() => {
    if (!ciclo) {
      setVersiones(null);
      setVersionesError(null);
      setVersionesCargando(false);
      return;
    }
    let live = true;
    setVersionesCargando(true);
    setVersionesError(null);
    setVersiones(null);
    setComparacion(null);
    setComparacionError(null);
    api<VersionFotoDto[]>(
      `/fotos/ciclos/${encodeURIComponent(ciclo)}/versiones`,
    )
      .then((data) => {
        if (live) setVersiones(data);
      })
      .catch((error) => {
        if (!live) return;
        setVersiones(null);
        setVersionesError(failureFrom(error));
      })
      .finally(() => {
        if (live) setVersionesCargando(false);
      });
    return () => {
      live = false;
    };
  }, [ciclo, versionesReintento]);

  useEffect(() => {
    if (!ciclo) {
      setFoto(null);
      setFotoError(null);
      setFotoCargando(false);
      return;
    }
    let live = true;
    setFotoCargando(true);
    setFoto(null);
    setFotoError(null);
    const query = version ? `?version=${encodeURIComponent(version)}` : "";
    api<FotoCicloDto>(
      `/fotos/ciclos/${encodeURIComponent(ciclo)}${query}`,
    )
      .then((data) => {
        if (live) setFoto(data);
      })
      .catch((error) => {
        if (live) setFotoError(failureFrom(error));
      })
      .finally(() => {
        if (live) setFotoCargando(false);
      });
    return () => {
      live = false;
    };
  }, [ciclo, version, fotoReintento]);

  useEffect(() => {
    if (!ciclo || !foto?.foto) {
      setContraste(null);
      setContrasteError(null);
      setContrasteCargando(false);
      return;
    }
    let live = true;
    setContrasteCargando(true);
    setContrasteError(null);
    setContraste(null);
    api<ContrasteDto>(`/fotos/contraste?ciclo=${encodeURIComponent(ciclo)}`)
      .then((data) => {
        if (live) setContraste(data);
      })
      .catch((error) => {
        if (live) setContrasteError(failureFrom(error));
      })
      .finally(() => {
        if (live) setContrasteCargando(false);
      });
    return () => {
      live = false;
    };
  }, [ciclo, foto?.foto?.version, contrasteReintento]);

  useEffect(() => {
    comparisonRequest.current += 1;
    setComparacion(null);
    setComparacionError(null);
    setComparacionCargando(false);
  }, [ciclo, versiones]);

  useEffect(() => {
    setCompararA((previous) =>
      seleccionComparacionVersion(versiones, previous, "primera"),
    );
    setCompararB((previous) =>
      seleccionComparacionVersion(versiones, previous, "ultima"),
    );
  }, [versiones]);

  async function comparar() {
    const a = Number(compararA);
    const b = Number(compararB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) {
      setComparacionError({
        status: 422,
        code: "VALIDATION",
        message: "Elige dos versiones distintas para comparar.",
        fields: { version: "Las dos versiones deben ser distintas." },
      });
      return;
    }
    const request = ++comparisonRequest.current;
    const context = comparisonContext;
    setComparacionCargando(true);
    setComparacionError(null);
    setComparacion(null);
    try {
      const base = `/fotos/ciclos/${encodeURIComponent(ciclo)}`;
      const [primera, segunda] = await Promise.all([
        api<FotoCicloDto>(`${base}?version=${a}`),
        api<FotoCicloDto>(`${base}?version=${b}`),
      ]);
      if (
        request !== comparisonRequest.current ||
        comparisonContextRef.current !== context
      )
        return;
      setComparacion({ a: primera, b: segunda });
    } catch (error) {
      if (
        request === comparisonRequest.current &&
        comparisonContextRef.current === context
      )
        setComparacionError(failureFrom(error));
    } finally {
      if (
        request === comparisonRequest.current &&
        comparisonContextRef.current === context
      )
        setComparacionCargando(false);
    }
  }

  function cambiarComparacion(version: "a" | "b", value: string) {
    comparisonRequest.current += 1;
    if (version === "a") setCompararA(value);
    else setCompararB(value);
    setComparacion(null);
    setComparacionError(null);
    setComparacionCargando(false);
  }

  const versionesListas = versiones !== null;
  const versionesPendientes = versiones === null && versionesError === null;
  const versionActualValida = !version || versionExiste(versiones, version);

  return (
    <>
      {catalogoError && (
        <ErrorBox
          failure={catalogoError}
          context="foto"
          retry={() => setCatalogoReintento((value) => value + 1)}
        />
      )}

      {!catalogoError && catalogoCargando && !ciclos && (
        <Skeleton lines={3} label="Cargando ciclos…" />
      )}

      {!catalogoError && ciclos && ciclos.length === 0 && (
        <section className="panel" aria-label="Sin ciclos">
          <EmptyState title="Sin ciclos" icon="○">
            No hay ciclos para consultar. Esta pantalla no crea ciclos ni
            fotografías.
          </EmptyState>
          <button
            className="secondary"
            type="button"
            onClick={() => go("/ciclos")}
          >
            Ir a Ciclos
          </button>
        </section>
      )}

      {ciclos && ciclos.length > 0 && (
        <section className="panel fotos-context" aria-label="Selector de ciclo y versión">
          <div className="fotos-context-row">
            <label htmlFor="fotos-ciclo">
              Ciclo
              <select
                id="fotos-ciclo"
                value={ciclo}
                disabled={catalogoCargando}
                onChange={(event) => onSelectCiclo(event.target.value)}
              >
                <option value="">Elegir ciclo</option>
                {ciclos.map((item) => (
                  <option key={item.id} value={item.id}>
                    Ciclo {item.id} · {date(item.inicio)}
                    {item.mesFinanciado
                      ? ` · mes financiado ${date(item.mesFinanciado)}`
                      : ""}
                  </option>
                ))}
                {ciclo &&
                  !ciclos.some((item) => item.id === ciclo) && (
                    <option value={ciclo}>Ciclo {ciclo} · no encontrado</option>
                  )}
              </select>
            </label>
            <label htmlFor="fotos-version">
              Versión
              <select
                id="fotos-version"
                value={version}
                disabled={fotoCargando || versionesPendientes}
                aria-busy={versionesPendientes}
                onChange={(event) => onSelectVersion(event.target.value)}
              >
                <option value="">Última versión (automática)</option>
                {versiones?.map((item) => (
                  <option key={item.version} value={String(item.version)}>
                    v{item.version}
                    {item.vigente
                      ? " · vigente"
                      : item.esUltima
                        ? " · última no vigente"
                        : " · histórica"}
                  </option>
                ))}
                {!versionesListas && version && versionesPendientes && (
                  <option value={version}>Cargando v{version}…</option>
                )}
                {!versionesListas && version && versionesError && (
                  <option value={version}>v{version} · índice no disponible</option>
                )}
                {versionesListas && version && !versionActualValida && (
                  <option value={version}>v{version} · no encontrada</option>
                )}
              </select>
            </label>
          </div>
          <p className="help fotos-help">
            La opción automática consulta la última versión persistida y lo
            declara. Elegir una versión concreta no cae a otra si no existe
            (404). No se recalcula la economía ni se convierte una ausencia en
            0.
          </p>
          {versionesCargando && (
            <p className="muted" role="status">
              Cargando índice de versiones…
            </p>
          )}
          {versionesError && !fotoError && (
            <div>
              <p className="field-error" role="status">
                No se pudo cargar el índice de versiones:{" "}
                {failureMessage(versionesError, "foto")}
              </p>
              <button
                className="text-button"
                type="button"
                onClick={() => setVersionesReintento((value) => value + 1)}
              >
                Reintentar índice
              </button>
            </div>
          )}
        </section>
      )}

      {ciclo && fotoCargando && (
        <Skeleton lines={5} label="Consultando foto del ciclo…" />
      )}

      {ciclo && fotoError && !fotoCargando && (
        <ErrorBox
          failure={fotoError}
          context="foto"
          retry={() => setFotoReintento((value) => value + 1)}
        >
          {fotoError.status === 404 && version && (
            <button
              className="secondary"
              type="button"
              onClick={() => onSelectVersion("")}
            >
              Consultar la última versión
            </button>
          )}
        </ErrorBox>
      )}

      {ciclo && foto && !fotoCargando && !fotoError && (
        <>
          {foto.estadoFoto === "SinFoto" && (
            <section className="panel" aria-label="Sin foto del ciclo">
              <div className="fotos-section-head">
                <div>
                  <p className="eyebrow">E4.9 · ESTADO DE LA FOTO</p>
                  <h2>Ciclo {ciclo}</h2>
                </div>
                <Badge tone="nd" label="SinFoto" />
              </div>
              <EmptyState title="Sin foto para este ciclo" icon="○">
                {motivoTexto(foto.motivo)}. No se crea una foto vacía ni se
                muestra 0.
              </EmptyState>
              <p className="help">
                Consulta de solo lectura. El cierre se crea en E4.9/E4.10; esta
                pantalla no lo crea ni lo rectifica.
              </p>
            </section>
          )}

          {foto.estadoFoto === "Disponible" && foto.foto && (
            <>
              <section className="panel" aria-label="Foto del ciclo">
                <div className="fotos-section-head">
                  <div>
                    <p className="eyebrow">E4.9 · FOTO DE CICLO</p>
                    <h2>
                      Ciclo {foto.foto.ciclo} · v{foto.foto.version}
                    </h2>
                  </div>
                  <div className="fotos-badges">
                    <Badge tone="info" icon="▣" label="Foto" />
                    <Badge
                      tone={foto.vigente ? "ok" : "partial"}
                      label={foto.vigente ? "Vigente" : "No vigente"}
                    />
                    <Badge
                      tone={estadoTone(foto.estado)}
                      label={foto.estado}
                    />
                  </div>
                </div>
                {foto.estado === "PendienteReCierre" && (
                  <div className="fotos-caveat" role="status">
                    <strong>PendienteReCierre (P4-A).</strong> El ciclo está
                    reabierto: la v{foto.foto.version} se conserva y es
                    consultable, pero no es vigente; no se ha creado una foto
                    nueva de re-cierre.
                  </div>
                )}
                <PhotoSummary foto={foto.foto} />
                <p className="help">
                  {foto.seleccionAplicada.porDefecto
                    ? "No se pidió versión: se consultó automáticamente la última persistida (regla P7-D)."
                    : `Versión v${foto.seleccionAplicada.version} solicitada explícitamente; no hay fallback silencioso.`}
                </p>
              </section>

              <section className="panel" aria-label="Cobertura de la foto">
                <h2>Cobertura de la foto</h2>
                <p>
                  <Badge
                    tone={estadoTone(coverageState(foto.foto.cobertura))}
                    label={coverageState(foto.foto.cobertura)}
                  />
                </p>
                {coverageRows(foto.foto.cobertura).length ? (
                  <CoverageTable
                    rows={coverageRows(foto.foto.cobertura)}
                    label="Cobertura por bloque de la foto"
                  />
                ) : (
                  <p className="muted">
                    Sin bloques de cobertura declarados. No se certifica un
                    total.
                  </p>
                )}
              </section>

              <section className="panel" aria-label="Bloques no disponibles de la foto">
                <h2>No disponible</h2>
                {noDisponibleRows(foto.foto.noDisponible).length ? (
                  <NoDisponibleList
                    rows={noDisponibleRows(foto.foto.noDisponible)}
                  />
                ) : (
                  <p className="muted">
                    Sin bloques No disponible declarados.
                  </p>
                )}
              </section>
            </>
          )}

          <section className="panel" aria-label="Versiones consultables de la foto">
            <h2>Versiones consultables</h2>
            <p className="muted">
              Todas las versiones persisten y siguen consultables. Ninguna se
              poda ni se reetiqueta.
            </p>
            {versiones && versiones.length > 0 ? (
              <VersionesTable
                versiones={versiones}
                seleccionada={version}
                onSelect={onSelectVersion}
              />
            ) : versionesCargando ? (
              <p role="status">Cargando versiones…</p>
            ) : (
              <p className="muted">
                Sin versiones persistidas para este ciclo.
              </p>
            )}
          </section>

          <section className="panel" aria-label="Comparación de versiones de la foto">
            <h2>Comparación v1 / v2 (solo lectura)</h2>
            <p className="muted">
              Compara dos versiones persistidas lado a lado. No hay edición ni
              recálculo; la igualdad o diferencia no certifica un total.
            </p>
            {versiones && versiones.length >= 2 ? (
              <>
                <div className="fotos-context-row">
                  <label htmlFor="fotos-comparar-a">
                    Versión A
                    <select
                      id="fotos-comparar-a"
                      value={compararA}
                      onChange={(event) =>
                        cambiarComparacion("a", event.target.value)
                      }
                    >
                      {[...versiones]
                        .sort((a, b) => a.version - b.version)
                        .map((item) => (
                          <option key={item.version} value={String(item.version)}>
                            v{item.version}
                            {item.vigente ? " · vigente" : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label htmlFor="fotos-comparar-b">
                    Versión B
                    <select
                      id="fotos-comparar-b"
                      value={compararB}
                      onChange={(event) =>
                        cambiarComparacion("b", event.target.value)
                      }
                    >
                      {[...versiones]
                        .sort((a, b) => a.version - b.version)
                        .map((item) => (
                          <option key={item.version} value={String(item.version)}>
                            v{item.version}
                            {item.vigente ? " · vigente" : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="secondary"
                    type="button"
                    disabled={
                      comparacionCargando ||
                      !compararA ||
                      !compararB ||
                      compararA === compararB
                    }
                    onClick={comparar}
                  >
                    {comparacionCargando ? "Comparando…" : "Comparar versiones"}
                  </button>
                </div>
                {comparacionError && (
                  <ErrorBox
                    failure={comparacionError}
                    context="comparacion"
                    retry={comparacionError.status === 422 ? undefined : comparar}
                    focus={false}
                  />
                )}
                {comparacionCargando && (
                  <Skeleton lines={3} label="Comparando versiones…" />
                )}
                {comparacion && !comparacionCargando && (
                  <div className="fotos-compare-grid">
                    <ComparisonCard foto={comparacion.a} etiqueta="Versión A" />
                    <ComparisonCard foto={comparacion.b} etiqueta="Versión B" />
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Sin comparación disponible" icon="○">
                {versiones && versiones.length === 1
                  ? "Solo hay una versión persistida; se necesitan dos para comparar v1/v2."
                  : "No hay dos versiones persistidas consultables para comparar."}
              </EmptyState>
            )}
          </section>

          <section className="panel fotos-live" aria-label="Cálculo vivo etiquetado">
            <div className="fotos-section-head">
              <div>
                <p className="eyebrow">E2.6 · CONTRASTE</p>
                <h2>Cálculo vivo</h2>
              </div>
              <Badge tone="info" label="Actual" />
            </div>
            <p className="help">
              Cálculo vivo — no es la foto ni un cierre histórico. Se muestra
              separado y nunca sustituye a la fotografía ni completa sus bloques
              No disponible.
            </p>
            {contrasteCargando && (
              <Skeleton lines={3} label="Consultando cálculo vivo…" />
            )}
            {contrasteError && !contrasteCargando && (
              <ErrorBox
                failure={contrasteError}
                context="contraste"
                retry={() => setContrasteReintento((value) => value + 1)}
                focus={false}
              />
            )}
            {contraste && !contrasteCargando && !contrasteError && (
              <>
                <dl className="fotos-metrics">
                  <div>
                    <dt>Origen</dt>
                    <dd>{contraste.origen}</dd>
                  </div>
                  <div>
                    <dt>Motor</dt>
                    <dd>{contraste.motor}</dd>
                  </div>
                  <div>
                    <dt>Revisión</dt>
                    <dd>{contraste.revision}</dd>
                  </div>
                  <div>
                    <dt>Corte</dt>
                    <dd>{date(contraste.corte)}</dd>
                  </div>
                  <div>
                    <dt>Cobertura</dt>
                    <dd>
                      <Badge
                        tone={estadoTone(contraste.cobertura.estado)}
                        label={contraste.cobertura.estado}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Total certificado</dt>
                    <dd>No · cálculo vivo</dd>
                  </div>
                </dl>
                <p className="fotos-caveat" role="note">
                  {contraste.etiqueta}. {contraste.cobertura.motivo} Total: no
                  disponible; no se certifica.
                </p>
                {Object.keys(contraste.metricas).length ? (
                  <ContrasteMetrics metricas={contraste.metricas} />
                ) : (
                  <EmptyState title="Sin métricas vivas" icon="○">
                    El motor no devolvió métricas; no se muestra 0.
                  </EmptyState>
                )}
                {contraste.noDisponible.length > 0 && (
                  <>
                    <h3>No disponible en el cálculo vivo</h3>
                    <ul className="fotos-list">
                      {contraste.noDisponible.map((item) => (
                        <li key={item.clave}>
                          <strong>{TOTAL_LABELS[item.clave] ?? item.clave}</strong>{" "}
                          — {item.motivo}{" "}
                          <small className="fotos-code">{item.fuente}</small>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}

function VersionesTable({
  versiones,
  seleccionada,
  onSelect,
}: {
  versiones: VersionFotoDto[];
  seleccionada: string;
  onSelect: (version: string) => void;
}) {
  const columns: TableColumn<VersionFotoDto>[] = [
    {
      id: "version",
      header: "Versión",
      cell: (item) => (
        <span className="fotos-badges">
          <strong>v{item.version}</strong>
          {item.esUltima && <Badge tone="info" label="Última" />}
        </span>
      ),
    },
    {
      id: "creado",
      header: "Creada",
      cell: (item) => utc(item.creadoUtc),
    },
    { id: "actor", header: "Actor", cell: (item) => item.actor },
    {
      id: "motivo",
      header: "Motivo",
      cell: (item) => item.motivo ?? "Sin motivo",
    },
    {
      id: "fingerprint",
      header: "Fingerprint",
      cell: (item) => (
        <code className="fotos-fingerprint" title={item.fingerprint}>
          {item.fingerprint}
        </code>
      ),
      card: "hidden",
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (item) => (
        <span className="fotos-badges">
          <Badge tone={estadoTone(item.estado)} label={item.estado} />
          <Badge
            tone={item.vigente ? "ok" : "nd"}
            label={item.vigente ? "Vigente" : "No vigente"}
          />
        </span>
      ),
    },
    {
      id: "accion",
      header: "Consulta",
      kind: "actions",
      cell: (item) => (
        <button
          className="secondary"
          type="button"
          aria-label={`Consultar la versión ${item.version}`}
          disabled={String(item.version) === seleccionada}
          onClick={() => onSelect(String(item.version))}
        >
          {String(item.version) === seleccionada
            ? "Seleccionada"
            : `Consultar v${item.version}`}
        </button>
      ),
    },
  ];
  return (
    <>
      <div className="desktop-list fotos-table">
        <Table
          caption="Versiones consultables de la foto"
          label="Tabla de versiones consultables"
          columns={columns}
          rows={versiones}
          rowKey={(item) => item.version}
        />
      </div>
      <DataList
        columns={columns}
        rows={versiones}
        rowKey={(item) => item.version}
        label="Versiones consultables móvil"
        className="mobile-list"
      />
    </>
  );
}

function ContrasteMetrics({
  metricas,
}: {
  metricas: Record<string, ContrasteMetricaDto>;
}) {
  const rows = Object.entries(metricas);
  const columns: TableColumn<[string, ContrasteMetricaDto]>[] = [
    {
      id: "metrica",
      header: "Métrica",
      cell: ([clave]) => TOTAL_LABELS[clave] ?? clave,
    },
    {
      id: "valor",
      header: "Valor vivo",
      kind: "amount",
      cell: ([, metrica]) => (
        <Amount
          value={metrica.valor}
          subtotal={metrica.subtotal}
          state={amountState(metrica.estado)}
          note={metrica.estado}
        />
      ),
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: ([, metrica]) => (
        <Badge tone={estadoTone(metrica.estado)} label={metrica.estado} />
      ),
    },
    {
      id: "fuente",
      header: "Fuente",
      cell: ([, metrica]) => metrica.fuente,
    },
    {
      id: "cobertura",
      header: "Cobertura / motivo",
      cell: ([, metrica]) => (
        <>
          {metrica.cobertura}
          {metrica.motivo ? (
            <small className="fotos-code">{metrica.motivo}</small>
          ) : null}
        </>
      ),
    },
  ];
  return (
    <>
      <div className="desktop-list fotos-table">
        <Table
          caption="Métricas del cálculo vivo"
          label="Tabla de métricas del cálculo vivo"
          columns={columns}
          rows={rows}
          rowKey={([clave]) => clave}
        />
      </div>
      <DataList
        columns={columns}
        rows={rows}
        rowKey={([clave]) => clave}
        label="Métricas del cálculo vivo móvil"
        className="mobile-list"
      />
    </>
  );
}

function PeriodoPanel({
  modo,
  periodoId,
  ejercicio,
  trimestre,
  versionAgregado,
  onCommit,
  onAbrirId,
  onAbrirCiclo,
  hrefCiclo,
  hrefPeriodoId,
}: {
  modo: "Trimestre" | "Anio";
  periodoId: string;
  ejercicio: string;
  trimestre: string;
  versionAgregado: string;
  onCommit: (patch: {
    modo: "Trimestre" | "Anio";
    periodoId: string;
    ejercicio: string;
    trimestre: string;
    versionAgregado: string;
  }) => void;
  onAbrirId: (id: string) => void;
  onAbrirCiclo: (ciclo: string, version?: number | null) => void;
  hrefCiclo: (ciclo: string, version?: number | null) => string;
  hrefPeriodoId: (id: number) => string;
}) {
  const [borrador, setBorrador] = useState({
    ejercicio,
    trimestre,
    versionAgregado,
    periodoId,
  });
  const [periodo, setPeriodo] = useState<FotoPeriodoDto | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [cargando, setCargando] = useState(false);
  const [reintento, setReintento] = useState(0);
  const ejercicioRef = useRef<HTMLInputElement>(null);
  const trimestreRef = useRef<HTMLSelectElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBorrador({ ejercicio, trimestre, versionAgregado, periodoId });
  }, [ejercicio, trimestre, versionAgregado, periodoId]);

  function focusCampo(fields: Record<string, string>) {
    const nombres = Object.keys(fields);
    const nombre = nombres[0] ?? "";
    const target = nombre.startsWith("trimestre")
      ? trimestreRef.current
      : nombre.startsWith("version")
        ? versionRef.current
        : nombre === "id"
          ? idRef.current
          : ejercicioRef.current;
    if (target) requestAnimationFrame(() => target.focus());
  }

  useEffect(() => {
    let live = true;
    setCargando(true);
    setError(null);
    setPeriodo(null);
    const url = periodoId
      ? `/fotos/periodos/${encodeURIComponent(periodoId)}`
      : (() => {
          const params = new URLSearchParams({
            tipo: modo,
            ejercicio,
          });
          if (modo === "Trimestre") params.set("trimestre", trimestre);
          if (versionAgregado) params.set("version", versionAgregado);
          return `/fotos/periodos?${params.toString()}`;
        })();
    api<FotoPeriodoDto>(url)
      .then((data) => {
        if (live) setPeriodo(data);
      })
      .catch((failure) => {
        if (!live) return;
        const normalized = failureFrom(failure);
        setError(normalized);
        if (normalized.status === 422) focusCampo(normalized.fields);
      })
      .finally(() => {
        if (live) setCargando(false);
      });
    return () => {
      live = false;
    };
  }, [
    modo,
    periodoId,
    ejercicio,
    trimestre,
    versionAgregado,
    reintento,
  ]);

  function consultar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCommit({
      modo,
      periodoId: borrador.periodoId.trim(),
      ejercicio: borrador.ejercicio.trim(),
      trimestre: borrador.trimestre,
      versionAgregado: borrador.versionAgregado.trim(),
    });
  }

  return (
    <>
      <section className="panel fotos-context" aria-label="Consulta de periodo">
        <form className="fotos-period-form" noValidate onSubmit={consultar}>
          <label htmlFor="fotos-ejercicio">
            Ejercicio
            <input
              id="fotos-ejercicio"
              ref={ejercicioRef}
              value={borrador.ejercicio}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              aria-invalid={Boolean(error?.fields.ejercicio || error?.fields.periodo)}
              onChange={(event) =>
                setBorrador((previous) => ({
                  ...previous,
                  ejercicio: event.target.value,
                }))
              }
            />
          </label>
          {modo === "Trimestre" && (
            <label htmlFor="fotos-trimestre">
              Trimestre
              <select
                id="fotos-trimestre"
                ref={trimestreRef}
                value={borrador.trimestre}
                aria-invalid={Boolean(error?.fields.trimestre)}
                onChange={(event) =>
                  setBorrador((previous) => ({
                    ...previous,
                    trimestre: event.target.value,
                  }))
                }
              >
                <option value="1">T1</option>
                <option value="2">T2</option>
                <option value="3">T3</option>
                <option value="4">T4</option>
              </select>
            </label>
          )}
          <label htmlFor="fotos-version-agregado">
            Versión del agregado
            <input
              id="fotos-version-agregado"
              ref={versionRef}
              value={borrador.versionAgregado}
              placeholder="A1 (vacío = última)"
              autoComplete="off"
              aria-invalid={Boolean(error?.fields.version)}
              onChange={(event) =>
                setBorrador((previous) => ({
                  ...previous,
                  versionAgregado: event.target.value,
                }))
              }
            />
          </label>
          <label htmlFor="fotos-periodo-id">
            ID del agregado
            <input
              id="fotos-periodo-id"
              ref={idRef}
              value={borrador.periodoId}
              placeholder="Opcional"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(error?.fields.id)}
              onChange={(event) =>
                setBorrador((previous) => ({
                  ...previous,
                  periodoId: event.target.value,
                }))
              }
            />
          </label>
          <div className="actions">
            <button className="primary" type="submit" disabled={cargando}>
              {cargando ? "Consultando…" : "Consultar foto"}
            </button>
          </div>
        </form>
        <p className="help fotos-help">
          Sin versión se consulta la última del periodo y se declara. Una
          versión inexistente devuelve 404 y no cae a otra. Si informas un ID,
          se consulta la identidad persistida y se ignoran los filtros.
        </p>
      </section>

      {cargando && (
        <Skeleton lines={5} label="Consultando agregado del periodo…" />
      )}

      {error && !cargando && error.status === 404 && (
        <section className="panel" aria-label="Sin fotos para el periodo">
          <EmptyState
            title={
              periodoId
                ? "Sin foto para esta identidad"
                : "Sin fotos para este periodo"
            }
            icon="○"
          >
            <strong>Motivo:</strong>{" "}
            {error.message ||
              "No hay agregados persistidos para este periodo."}{" "}
            No se muestra 0 ni una foto vacía.
          </EmptyState>
          <p className="muted">Código: {error.code || "NOT_FOUND"}</p>
        </section>
      )}

      {error && !cargando && error.status !== 404 && (
        <ErrorBox
          failure={error}
          context="periodo"
          retry={
            error.status === 422
              ? undefined
              : () => setReintento((value) => value + 1)
          }
          focus={error.status !== 422}
        />
      )}

      {periodo && !cargando && !error && (
        <PeriodoResultado
          data={periodo}
          hrefCiclo={hrefCiclo}
          onAbrirCiclo={onAbrirCiclo}
          hrefPeriodoId={hrefPeriodoId}
          onAbrirId={onAbrirId}
        />
      )}
    </>
  );
}

function PeriodoResultado({
  data,
  hrefCiclo,
  onAbrirCiclo,
  hrefPeriodoId,
  onAbrirId,
}: {
  data: FotoPeriodoDto;
  hrefCiclo: (ciclo: string, version?: number | null) => string;
  onAbrirCiclo: (ciclo: string, version?: number | null) => void;
  hrefPeriodoId: (id: number) => string;
  onAbrirId: (id: string) => void;
}) {
  const composicion = data.composicion;
  const cobertura = data.cobertura;
  const valores = data.valores.porCiclo;
  const noDisponible = periodNoDisponibleRows(data.noDisponible);
  const titulo =
    data.tipo === "Anio"
      ? `Año ${data.periodo.ejercicio}`
      : `T${data.periodo.trimestre} · ${data.periodo.ejercicio}`;

  const composicionColumns: TableColumn<ComponentePeriodoDto>[] = [
    {
      id: "ciclo",
      header: "Ciclo",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          {item.ciclo}
        </a>
      ),
    },
    {
      id: "mes",
      header: "Mes financiado",
      cell: (item) => date(item.mesFinanciado),
    },
    {
      id: "ventana",
      header: "Ventana de la foto",
      cell: (item) =>
        item.ventana
          ? `${date(item.ventana.inicio)} → ${date(item.ventana.fin)}`
          : "No disponible",
    },
    {
      id: "version",
      header: "Versión",
      cell: (item) =>
        item.versionFoto === null ? "Sin foto" : `v${item.versionFoto}`,
    },
    {
      id: "fingerprint",
      header: "Fingerprint",
      cell: (item) =>
        item.fingerprint ? (
          <code className="fotos-fingerprint" title={item.fingerprint}>
            {item.fingerprint}
          </code>
        ) : (
          <span className="muted">No disponible</span>
        ),
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (item) => (
        <span className="fotos-badges">
          <Badge tone={estadoTone(item.estado)} label={item.estado} />
          {item.estadoReapertura &&
            item.estadoReapertura !== "Abierta" && (
              <Badge tone="partial" label={item.estadoReapertura} />
            )}
        </span>
      ),
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: (item) => <Motivo value={item.motivo} />,
    },
    {
      id: "accion",
      header: "Foto",
      kind: "actions",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          {item.estado === "Incluido" ? "Abrir foto" : "Ver ciclo"}
        </a>
      ),
    },
  ];

  const valoresColumns: TableColumn<ValorCicloDto>[] = [
    {
      id: "ciclo",
      header: "Ciclo",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          {item.ciclo}
        </a>
      ),
    },
    {
      id: "version",
      header: "Versión",
      cell: (item) => `v${item.versionFoto}`,
    },
    {
      id: "ventana",
      header: "Ventana",
      cell: (item) =>
        `${date(item.ventana.inicio)} → ${date(item.ventana.fin)}`,
    },
    {
      id: "saldo",
      header: "Saldo inicial (S0)",
      kind: "amount",
      cell: (item) => money(item.ventana.saldoInicial),
    },
    {
      id: "hechos",
      header: "Hechos",
      cell: (item) =>
        `${item.estadoHechos} · ${countPhrase(
          property(item.hechos, "movimientos"),
          "movimiento",
          "movimientos",
        )}`,
    },
    {
      id: "plan",
      header: "Plan",
      cell: (item) =>
        `${item.estadoPlan} · ${countPhrase(
          property(item.plan, "items"),
          "línea",
          "líneas",
        )}`,
    },
    {
      id: "cobertura",
      header: "Cobertura",
      kind: "status",
      cell: (item) => (
        <Badge
          tone={estadoTone(coverageState(item.cobertura))}
          label={coverageState(item.cobertura)}
        />
      ),
    },
    {
      id: "accion",
      header: "Foto",
      kind: "actions",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          Abrir foto
        </a>
      ),
    },
  ];

  const coberturaColumns: TableColumn<BloqueCoberturaDto>[] = [
    {
      id: "ciclo",
      header: "Ciclo",
      cell: (item) => item.ciclo,
    },
    {
      id: "version",
      header: "Versión",
      cell: (item) =>
        item.versionFoto === null ? "Sin foto" : `v${item.versionFoto}`,
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (item) => <Badge tone={estadoTone(item.estado)} label={item.estado} />,
    },
    {
      id: "motivos",
      header: "Motivos",
      cell: (item) =>
        item.motivos.length ? item.motivos.join(" · ") : "Sin motivo",
    },
  ];

  return (
    <>
      <section className="panel" aria-label="Identidad del agregado">
        <div className="fotos-section-head">
          <div>
            <p className="eyebrow">
              E4.11 · AGREGADO {data.tipo.toUpperCase()}
            </p>
            <h2>
              {titulo} · {data.identidad.versionAgregado}
            </h2>
          </div>
          <div className="fotos-badges">
            <Badge tone="info" icon="▣" label="Foto" />
            <Badge tone="info" label={data.identidad.versionAgregado} />
            <Badge
              tone={data.seleccionVersion.porDefecto ? "nd" : "ok"}
              label={
                data.seleccionVersion.porDefecto
                  ? "Última automática"
                  : "Versión solicitada"
              }
            />
            <Badge
              tone={estadoTone(data.cobertura.estado)}
              label={data.cobertura.estado}
            />
          </div>
        </div>
        <dl className="fotos-metrics">
          <div>
            <dt>Periodo</dt>
            <dd>
              {date(data.periodo.inicio)} → {date(data.periodo.fin)}
            </dd>
          </div>
          <div>
            <dt>Identidad</dt>
            <dd>
              #{data.id} · {data.identidad.versionAgregado}
            </dd>
          </div>
          <div>
            <dt>Creado</dt>
            <dd>{utc(data.identidad.fechaUtc)}</dd>
          </div>
          <div>
            <dt>Actor</dt>
            <dd>{data.identidad.actor}</dd>
          </div>
          <div>
            <dt>App / esquema</dt>
            <dd>
              {data.identidad.versionApp} · {data.identidad.versionEsquema}
            </dd>
          </div>
          <div>
            <dt>Motivo</dt>
            <dd>{data.identidad.motivo ?? "Sin motivo declarado"}</dd>
          </div>
          <div>
            <dt>Fingerprint</dt>
            <dd>
              <code
                className="fotos-fingerprint"
                title={data.identidad.fingerprint}
              >
                {data.identidad.fingerprint}
              </code>
            </dd>
          </div>
          <div>
            <dt>Selección de versión</dt>
            <dd>
              {data.seleccionAplicada.porDefecto
                ? "Automática: última por ciclo"
                : "Explícita por ciclo"}
            </dd>
          </div>
          <div>
            <dt>Regla</dt>
            <dd>
              {data.seleccionAplicada.regla} · {data.seleccionAplicada.reglaPeriodo}
            </dd>
          </div>
        </dl>
        <p className="help">
          {data.seleccionAplicada.porDefecto
            ? "Selección automática: última versión cerrada de cada ciclo en el instante de generar el agregado."
            : "Selección explícita declarada por ciclo; la composición conserva la versión efectiva."}
        </p>
        {Object.keys(data.seleccionAplicada.solicitada).length > 0 && (
          <p className="help">
            Versiones solicitadas:{" "}
            {Object.entries(data.seleccionAplicada.solicitada)
              .map(([ciclo, version]) => `${ciclo} v${version}`)
              .join(" · ")}
            .
          </p>
        )}
        <p className="help">
          <a
            href={hrefPeriodoId(data.id)}
            onClick={(event) => {
              event.preventDefault();
              onAbrirId(String(data.id));
            }}
          >
            Consultar esta identidad persistida
          </a>{" "}
          · Sin versión se consulta la última del periodo y se declara.
        </p>
        <p className="fotos-caveat" role="note">
          Total del periodo: <strong>No disponible</strong>.{" "}
          {cobertura.motivos.includes("SIN_REGLA_ADITIVA")
            ? "No existe regla aditiva aprobada; no se certifica un parcial ni se muestra 0."
            : "No se certifica un total mientras la cobertura no sea completa."}
        </p>
      </section>

      <section className="panel" aria-label="Composición del periodo">
        <h2>Composición por ciclos financiados</h2>
        <p className="muted">
          Cada ciclo se incluye íntegro por mes financiado, sin prorrateo. Los
          excluidos figuran con su motivo; no se inventa un ciclo.
        </p>
        {composicion.length ? (
          <>
            <div className="desktop-list fotos-table">
              <Table
                caption="Composición del periodo"
                label="Tabla de composición del periodo"
                columns={composicionColumns}
                rows={composicion}
                rowKey={(item) => item.ciclo}
              />
            </div>
            <DataList
              columns={composicionColumns}
              rows={composicion}
              rowKey={(item) => item.ciclo}
              label="Composición del periodo móvil"
              className="mobile-list"
            />
          </>
        ) : (
          <EmptyState title="Sin ciclos en el periodo" icon="○">
            No hay ciclos atribuidos por mes financiado; no se muestra 0.
          </EmptyState>
        )}
      </section>

      <section className="panel" aria-label="Valores por ciclo del periodo">
        <h2>Cifras por ciclo</h2>
        <p className="muted">
          No hay total de periodo certificado. Cada cifra pertenece a una foto
          de ciclo y conserva su versión; no se suma ni se recalcula.
        </p>
        {valores.length ? (
          <>
            <div className="desktop-list fotos-table">
              <Table
                caption="Cifras por ciclo del periodo"
                label="Tabla de cifras por ciclo"
                columns={valoresColumns}
                rows={valores}
                rowKey={(item) => item.ciclo}
              />
            </div>
            <DataList
              columns={valoresColumns}
              rows={valores}
              rowKey={(item) => item.ciclo}
              label="Cifras por ciclo móvil"
              className="mobile-list"
            />
          </>
        ) : (
          <EmptyState title="Sin cifras por ciclo" icon="○">
            No hay ciclos incluidos con valores persistidos; no se muestra 0.
          </EmptyState>
        )}
      </section>

      <section className="panel" aria-label="Cobertura del periodo">
        <h2>Cobertura del periodo</h2>
        <p>
          <Badge
            tone={estadoTone(cobertura.estado)}
            label={cobertura.estado}
          />
        </p>
        {cobertura.motivos.length ? (
          <ul className="fotos-list">
            {cobertura.motivos.map((motivo) => (
              <li key={motivo}>{motivoTexto(motivo)}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sin motivos de cobertura declarados.</p>
        )}
        {cobertura.bloques.length > 0 && (
          <>
            <h3>Cobertura por ciclo</h3>
            <div className="desktop-list fotos-table">
              <Table
                caption="Cobertura por ciclo del periodo"
                label="Tabla de cobertura por ciclo"
                columns={coberturaColumns}
                rows={cobertura.bloques}
                rowKey={(item) => item.ciclo}
              />
            </div>
            <DataList
              columns={coberturaColumns}
              rows={cobertura.bloques}
              rowKey={(item) => item.ciclo}
              label="Cobertura por ciclo móvil"
              className="mobile-list"
            />
          </>
        )}
      </section>

      <section className="panel" aria-label="Bloques no disponibles del periodo">
        <h2>No disponible</h2>
        {noDisponible.length ? (
          <NoDisponibleList rows={noDisponible} />
        ) : (
          <p className="muted">
            Sin bloques No disponible declarados. El total sigue sin certificarse.
          </p>
        )}
      </section>
    </>
  );
}

export function Fotos({
  path,
  go,
}: {
  path: string;
  go: (path: string) => void;
}) {
  const [vista, setVista] = useState<Vista>(() => vistaDesdePath(path));

  useEffect(() => {
    setVista(vistaDesdePath(path));
  }, [path]);

  function actualizar(patch: Partial<Vista>, push = false) {
    const siguiente = { ...vista, ...patch };
    setVista(siguiente);
    const url = vistaUrl(siguiente);
    if (push) go(url);
    else history.replaceState(null, "", url);
  }

  function cambiarModo(modo: Modo) {
    if (modo === "ciclo") {
      actualizar({ modo, periodoId: "" });
      return;
    }
    actualizar({
      modo,
      periodoId: "",
      ejercicio: vista.ejercicio || String(new Date().getFullYear()),
      trimestre: vista.trimestre || trimestreActual(),
    });
  }

  const hrefCiclo = (ciclo: string, version?: number | null) =>
    vistaUrl({
      ...vista,
      modo: "ciclo",
      ciclo,
      version: version === null || version === undefined ? "" : String(version),
      periodoId: "",
    });

  function abrirCiclo(ciclo: string, version?: number | null) {
    actualizar(
      {
        modo: "ciclo",
        ciclo,
        version:
          version === null || version === undefined ? "" : String(version),
        periodoId: "",
      },
      true,
    );
  }

  function abrirPeriodoId(id: string) {
    actualizar({ periodoId: id }, true);
  }

  return (
    <section className="fotos-page">
      <PageHead
        eyebrow="E4.11 · FOTOGRAFÍAS INMUTABLES"
        title="Fotografías"
        description="Consulta de solo lectura de fotos de ciclo, trimestre y año. Sin recálculo, sin ceros por ausencia y sin certificar un total parcial."
      >
        <Badge tone="nd" label="UI provisional · DT8 pendiente" />
      </PageHead>

      <div className="fotos-boundary" role="note">
        <Badge tone="info" icon="▣" label="Foto" />
        <p>
          La foto es la fuente histórica. El contraste vivo se etiqueta{" "}
          <Badge tone="info" label="Actual" /> y nunca se suma ni sustituye a la
          foto. No se mezclan fuentes ni se suman orígenes.
        </p>
      </div>

      <section className="panel fotos-context" aria-label="Tipo de consulta">
        <div className="fotos-context-row">
          <label htmlFor="fotos-modo">
            Consultar por
            <select
              id="fotos-modo"
              value={vista.modo}
              onChange={(event) => cambiarModo(event.target.value as Modo)}
            >
              <option value="ciclo">Ciclo</option>
              <option value="Trimestre">Trimestre</option>
              <option value="Anio">Año</option>
            </select>
          </label>
        </div>
        <p className="help fotos-help">
          Solo lectura. No se crean cierres ni agregados desde esta pantalla; la
          creación del agregado P2-A tiene su propia ruta y clave.
        </p>
      </section>

      {vista.modo === "ciclo" ? (
        <CicloPanel
          ciclo={vista.ciclo}
          version={vista.version}
          onSelectCiclo={(ciclo) =>
            actualizar({ modo: "ciclo", ciclo, version: "" })
          }
          onSelectVersion={(version) => actualizar({ version })}
          go={go}
        />
      ) : (
        <PeriodoPanel
          modo={vista.modo}
          periodoId={vista.periodoId}
          ejercicio={vista.ejercicio}
          trimestre={vista.trimestre}
          versionAgregado={vista.versionAgregado}
          onCommit={(patch) => actualizar(patch)}
          onAbrirId={abrirPeriodoId}
          onAbrirCiclo={abrirCiclo}
          hrefCiclo={hrefCiclo}
          hrefPeriodoId={(id) =>
            vistaUrl({ ...vista, periodoId: String(id) })
          }
        />
      )}
    </section>
  );
}
