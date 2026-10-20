import { useEffect, useState } from "react";
import { api, eur, flags, flagLabels, type Saldo } from "./api";
import { Alert, PageHead, Tag } from "./ui";
export function SaldoList({ go }: { go: (path: string) => void }) {
  const [q, setQ] = useState(""),
    [estado, setEstado] = useState("Activa"),
    [tipo, setTipo] = useState(""),
    [control, setControl] = useState(""),
    [tecnico, setTecnico] = useState(false);
  const [data, setData] = useState<{
      saldos: Saldo[];
      total: number;
      page: number;
    } | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [page, setPage] = useState(1);
  useEffect(() => {
    let current = true;
    setError("");
    setData(null);
    const params = new URLSearchParams({
      q,
      estado,
      tipo,
      control,
      tecnico: String(tecnico),
      page: String(page),
    });
    const timer = setTimeout(
      () =>
        api("/saldos?" + params)
          .then((d) => {
            if (current) {
              if (
                !Array.isArray(d.saldos) ||
                !d.saldos.every((s: Saldo) => s.id && s.nombre && s.posicion)
              )
                throw new Error("Catálogo no válido.");
              setData(d);
            }
          })
          .catch((e) => {
            if (current) setError(e.message);
          }),
      150,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [q, estado, tipo, control, tecnico, attempt, page]);
  const resetPage = () => setPage(1);
  function link(s: Saldo) {
    return (
      <a
        href={`/saldos/${s.id}`}
        onClick={(e) => {
          e.preventDefault();
          go(`/saldos/${s.id}`);
        }}
      >
        {s.nombre}
      </a>
    );
  }
  return (
    <>
      <PageHead
        eyebrow="NÚCLEO FINANCIERO"
        title="Saldos"
        description="Identifica tus posiciones y configura cómo se controlan."
      >
        <button className="primary" onClick={() => go("/saldos/nuevo")}>
          ＋ Nuevo Saldo
        </button>
      </PageHead>
      <div className="context-note">
        <span aria-hidden="true">ⓘ</span>
        <p>
          Los motores de cálculo llegarán en sus entregas. Aquí gestionas la
          configuración, sin importes calculados.
        </p>
      </div>
      <section className="panel catalog-panel" aria-label="Catálogo de Saldos">
        <div className="filters">
          <label className="search">
            Buscar Saldo
            <input
              type="search"
              placeholder="Nombre o identificador…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                resetPage();
              }}
            />
          </label>
          <label>
            Estado
            <select
              aria-label="Estado"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                resetPage();
              }}
            >
              <option>Activa</option>
              <option>Inactiva</option>
              <option value="">Todos</option>
            </select>
          </label>
          <label>
            Tipo
            <select
              aria-label="Tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                resetPage();
              }}
            >
              <option value="">Todos</option>
              <option>Efectivo</option>
              <option>Inversión</option>
              <option>Exterior</option>
            </select>
          </label>
          <label>
            Control
            <select
              aria-label="Control"
              value={control}
              onChange={(e) => {
                setControl(e.target.value);
                resetPage();
              }}
            >
              <option value="">Todos</option>
              {[
                "Movimientos",
                "Terminal",
                "No controlado",
                "Inversiones",
                "Exterior",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="list-toolbar">
          <p aria-live="polite">
            {data
              ? `${data.total} ${data.total === 1 ? "Saldo" : "Saldos"}`
              : error
                ? "Consulta no disponible"
                : "Consultando…"}
            <span className="separator">·</span>
            {estado || "Todos los estados"}
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={tecnico}
              onChange={(e) => {
                setTecnico(e.target.checked);
                resetPage();
              }}
            />{" "}
            Incluir técnico S000
          </label>
        </div>
        {error ? (
          <Alert retry={() => setAttempt((a) => a + 1)}>{error}</Alert>
        ) : !data ? (
          <div className="empty" role="status">
            Cargando Saldos…
          </div>
        ) : !data.saldos.length ? (
          <div className="empty" role="status">
            <span className="empty-symbol" aria-hidden="true">
              ⌕
            </span>
            <h2>Sin resultados</h2>
            <p>Prueba otra búsqueda o revisa los filtros.</p>
            <button
              className="secondary"
              onClick={() => {
                setQ("");
                setEstado("Activa");
                setTipo("");
                setControl("");
                resetPage();
              }}
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <>
            <div className="desktop-list">
              <table>
                <caption className="sr-only">
                  Saldos y configuración de control
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Saldo / ID</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Control</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Posición actual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.saldos.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {link(s)}
                        <small className="table-id">
                          {s.id}
                          {s.id === "S000" ? " · Técnico protegido" : ""}
                        </small>
                      </td>
                      <td>{s.tipo}</td>
                      <td>{s.control}</td>
                      <td>
                        <Tag inactive={s.estado === "Inactiva"}>{s.estado}</Tag>
                      </td>
                      <td>
                        <span className="position-label">
                          {s.posicion.condicion === "pendiente_motor"
                            ? "Pendiente de motor"
                            : "No aplicable"}
                        </span>
                        <small className="table-id">{s.posicion.motivo}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {data.saldos.map((s) => (
                <li key={s.id}>
                  <div className="card-head">
                    <span className="id-label">
                      {s.id}
                      {s.id === "S000" ? " · Técnico protegido" : ""}
                    </span>
                    <Tag inactive={s.estado === "Inactiva"}>{s.estado}</Tag>
                  </div>
                  <h2>{link(s)}</h2>
                  <p>
                    {s.tipo}
                    <span className="separator">/</span>
                    {s.control}
                  </p>
                  <div className="card-position">
                    <span>
                      {s.posicion.condicion === "pendiente_motor"
                        ? "Pendiente de motor"
                        : "No aplicable"}
                    </span>
                    <small>{s.posicion.motivo}</small>
                  </div>
                </li>
              ))}
            </ul>
            <div className="list-footer">
              <span>Página {data.page} · Hasta 100 por página</span>
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
      </section>
      <p className="page-foot">
        Los Saldos inactivos conservan su historial. S000 es una contraparte
        técnica protegida.
      </p>
    </>
  );
}
export function SaldoDetail({
  saldo: s,
  go,
  onReload,
}: {
  saldo: Saldo;
  go: (p: string) => void;
  onReload: () => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const action = s.estado === "Activa" ? "Desactivar" : "Reactivar";
  async function transition() {
    setBusy(true);
    setError("");
    try {
      await api(`/saldos/${s.id}/${action.toLowerCase()}`, "POST", {
        revision: s.revision,
      });
      setConfirm(false);
      onReload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const row = (label: string, value: React.ReactNode) => (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  return (
    <>
      <a
        className="back"
        href="/saldos"
        onClick={(e) => {
          e.preventDefault();
          go("/saldos");
        }}
      >
        ← Volver a Saldos
      </a>
      <PageHead
        eyebrow="SALDOS · FICHA"
        title={s.nombre}
        description={`${s.id} · Identificador estable e inmutable`}
      >
        <Tag inactive={s.estado === "Inactiva"}>{s.estado}</Tag>
        {s.id !== "S000" && (
          <button
            className="primary"
            onClick={() => go(`/saldos/${s.id}/editar`)}
          >
            Editar Saldo
          </button>
        )}
      </PageHead>
      {s.id === "S000" && (
        <div className="context-note">
          S000 · Contraparte técnica protegida. No editable ni desactivable
          mediante operaciones ordinarias.
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      <div className="detail-grid">
        <section className="panel">
          <h2>Identificación</h2>
          <dl>
            {row("Identificador", <code>{s.id}</code>)}
            {row("Nombre", s.nombre)}
            {row("Tipo", s.tipo)}
            {row("Estado", s.estado)}
          </dl>
        </section>
        <section className="panel">
          <h2>Configuración financiera</h2>
          <dl>
            {row("Control", s.control)}
            {row(
              "Fecha apertura",
              s.id === "S000"
                ? "No aplicable"
                : (s.fechaApertura ?? "Sin informar"),
            )}
            {row(
              "Saldo apertura",
              s.id === "S000" ? "No aplicable" : eur(s.saldoApertura),
            )}
          </dl>
          <p className="help">
            La apertura no es un Movimiento. Su fecha no filtra el Saldo actual.
          </p>
        </section>
        <section className="panel">
          <h2>Atributos de control</h2>
          <dl>
            {row("Finalidad", s.finalidad ?? "Sin informar")}
            {row("Objetivo (€)", eur(s.objetivo))}
            {flags.map((f) => (
              <div key={f}>
                <dt>{flagLabels[f]}</dt>
                <dd>{s[f] === null ? "Sin informar" : s[f] ? "Sí" : "No"}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel position-panel">
          <p className="eyebrow">POSICIÓN ACTUAL</p>
          <h2>
            {s.posicion.condicion === "pendiente_motor"
              ? "Pendiente de motor"
              : "No aplicable"}
          </h2>
          <p>{s.posicion.motivo}</p>
          <div className="position-placeholder" aria-hidden="true">
            —
          </div>
          <p className="muted">
            {s.posicion.condicion === "pendiente_motor"
              ? "No se presenta un importe hasta disponer del motor correspondiente."
              : "Este control no presenta un saldo actual convencional."}
          </p>
        </section>
      </div>
      {s.id !== "S000" && (
        <section className="panel lifecycle">
          <div>
            <h2>Disponibilidad del Saldo</h2>
            <p>
              {s.estado === "Activa"
                ? "Puedes desactivarlo para excluirlo de nuevas selecciones, conservando su historial."
                : "Puedes reactivarlo con el mismo identificador y configuración."}
            </p>
          </div>
          {!confirm ? (
            <button className="secondary" onClick={() => setConfirm(true)}>
              {action} Saldo
            </button>
          ) : (
            <div
              className="confirmation"
              role="group"
              aria-label={`Confirmar ${action.toLowerCase()}`}
            >
              <p>
                ¿{action} <strong>{s.nombre}</strong>? No se borrará ni
                recalculará información.
              </p>
              <div className="actions">
                <button className="secondary" onClick={() => setConfirm(false)}>
                  Cancelar
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={transition}
                >
                  {busy ? "Guardando…" : `Confirmar ${action.toLowerCase()}`}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      <p className="page-foot">
        Revisión {s.revision} · Sin borrado físico ni cambios en las relaciones
        históricas.
      </p>
    </>
  );
}
