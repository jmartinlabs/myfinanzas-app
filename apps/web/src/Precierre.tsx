import { useEffect, useRef, useState } from "react";
import { api, eur } from "./api";
import { Alert, PageHead, TableScroll, Tag } from "./ui";

type Source = {
  key: string;
  label: string;
  cobertura: string;
  estado: string;
  motivo: string;
  enlace: string | null;
  aplicable: boolean;
};
type Precierre = {
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    saldoInicialComida: string | null;
    estadoTemporal: string;
    revision: number;
  };
  estado: "Listo" | "Listo con avisos" | "Parcial" | "Bloqueado";
  cobertura: "Completa" | "Parcial";
  e4_9Bloqueado: boolean;
  revision: string;
  bloqueos: { code: string; message: string }[];
  avisos: { code: string; message: string }[];
  fuentes: Source[];
  plan: { estado: string; sinPlanificar: boolean };
  inversion: {
    efectivo: string | null;
    instrumentos: number;
    valoracion: string;
    motivo: string;
  };
  backup: { estado: string; motivo: string };
  cierres: { id: string; fin: string; coherent: boolean }[];
};

const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "No derivable";
const amount = (value: string | null) =>
  value === null ? "No informado" : eur(value);

export function Precierre({ go }: { go: (p: string) => void }) {
  const [cycles, setCycles] = useState<{ id: string; inicio: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<Precierre | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const request = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    let live = true;
    setCatalogFailed(false);
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
        if (live) {
          setCycles(all);
          if (all.length) setSelected((previous) => previous || all[0].id);
        }
      } catch (e) {
        if (live) {
          setCatalogFailed(true);
          setError((e as Error).message);
        }
      }
    }
    void catalog();
    return () => {
      live = false;
    };
  }, [retry]);

  useEffect(() => {
    if (!selected) {
      setData(null);
      setLoading(false);
      return;
    }
    const current = ++request.current;
    setLoading(true);
    setError("");
    setData(null);
    api<Precierre>("/cierres/precierre/" + selected)
      .then((result) => {
        if (current === request.current && selectedRef.current === selected)
          setData(result);
      })
      .catch((e) => {
        if (current === request.current && selectedRef.current === selected)
          setError((e as Error).message);
      })
      .finally(() => {
        if (current === request.current && selectedRef.current === selected)
          setLoading(false);
      });
    return () => {
      ++request.current;
    };
  }, [selected, retry]);

  return (
    <section className="precierre-page">
      <PageHead
        eyebrow="E4.8 · Precierre"
        title="Revisión de precierre"
        description="Solo lectura. No cierra el ciclo, no crea fotos, no cambia S0 y no ejecuta backups."
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
        Wireframes W1–W6 pendientes de aprobación visual. Esta pantalla es
        funcional y provisional; no se declara aprobada visualmente.
      </div>

      <div className="panel" aria-label="Contexto del precierre">
        <label htmlFor="precierre-cycle">Ciclo</label>{" "}
        <select
          id="precierre-cycle"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={loading || !cycles.length}
        >
          <option value="">Elegir ciclo</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.inicio}
            </option>
          ))}
        </select>
      </div>

      {catalogFailed && (
        <Alert retry={() => setRetry((value) => value + 1)}>
          No se pudieron cargar los ciclos. {error}
        </Alert>
      )}
      {error && !catalogFailed && (
        <Alert retry={() => setRetry((value) => value + 1)}>{error}</Alert>
      )}
      {loading && <p role="status">Cargando precierre…</p>}
      {!loading && !cycles.length && !catalogFailed && (
        <p className="muted">Sin ciclos para revisar.</p>
      )}

      {data && (
        <>
          <div className="panel" aria-label="Estado del precierre">
            <dl className="shared-metrics">
              <div className="metric">
                <dt>Estado</dt>
                <dd>
                  <Tag inactive={data.estado === "Bloqueado"}>
                    {data.estado}
                  </Tag>{" "}
                  <small>Cobertura: {data.cobertura}</small>
                </dd>
              </div>
              <div className="metric">
                <dt>Ventana</dt>
                <dd>
                  {date(data.ciclo.inicio)} → {date(data.ciclo.fin)}
                </dd>
                <small>Fin derivado del siguiente Inicio.</small>
              </div>
              <div className="metric">
                <dt>S0</dt>
                <dd>{amount(data.ciclo.saldoInicialComida)}</dd>
                <small>Manual; no se recalcula ni se crea.</small>
              </div>
              <div className="metric">
                <dt>Revisión</dt>
                <dd title={data.revision}>{data.revision.slice(0, 12)}…</dd>
                <small>
                  E4.9: {data.e4_9Bloqueado ? "Bloqueado" : "Sin bloqueo de lectura"}.
                </small>
              </div>
            </dl>
          </div>

          {data.bloqueos.length > 0 && (
            <div className="panel" aria-label="Bloqueos">
              <h2>Bloqueos</h2>
              <ul>
                {data.bloqueos.map((block) => (
                  <li key={block.code}>
                    <strong>{block.code}</strong> — {block.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.avisos.length > 0 && (
            <div className="panel" aria-label="Avisos">
              <h2>Avisos</h2>
              <ul>
                {data.avisos.map((warning) => (
                  <li key={warning.code}>
                    <strong>{warning.code}</strong> — {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel" aria-label="Fuentes y cobertura">
            <h2>Fuentes y cobertura</h2>
            <TableScroll label="Fuentes y cobertura del precierre">
              <div className="shared-table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fuente</th>
                      <th>Cobertura</th>
                      <th>Estado</th>
                      <th>Motivo</th>
                      <th>Enlace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fuentes.map((source) => (
                      <tr key={source.key}>
                        <td data-label="Fuente">{source.label}</td>
                        <td data-label="Cobertura">{source.cobertura}</td>
                        <td data-label="Estado">
                          <Tag inactive={source.estado === "No disponible"}>
                            {source.estado}
                          </Tag>
                        </td>
                        <td data-label="Motivo">{source.motivo}</td>
                        <td data-label="Enlace">
                          {source.enlace ? (
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => go(source.enlace!)}
                            >
                              Abrir
                            </button>
                          ) : (
                            <span className="muted">No disponible</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableScroll>
          </div>

          <div className="panel" aria-label="Plan e inversión">
            <h2>Plan e inversión</h2>
            <p>
              Plan: <strong>{data.plan.estado}</strong>
              {data.plan.sinPlanificar ? " · con hechos sin planificar" : ""}
            </p>
            <p>
              Inversión: {data.inversion.instrumentos} instrumentos · efectivo{" "}
              {amount(data.inversion.efectivo)}. Valoración:{" "}
              <strong>{data.inversion.valoracion}</strong>.
            </p>
            <p className="muted">{data.inversion.motivo}</p>
          </div>

          <div className="panel" aria-label="Backup preflight">
            <h2>Backup preflight</h2>
            <p>
              <Tag inactive={data.backup.estado !== "Verificado"}>
                {data.backup.estado}
              </Tag>{" "}
              {data.backup.motivo}
            </p>
          </div>

          <div className="actions">
            <button className="primary" type="button" disabled>
              Cerrar ciclo (E4.9) — no disponible en E4.8
            </button>
          </div>
        </>
      )}
    </section>
  );
}
