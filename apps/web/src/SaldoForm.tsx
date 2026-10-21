import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, controls, flags, flagLabels, type Saldo } from "./api";
import { Alert, PageHead, Switch, Tag } from "./ui";

type Draft = {
  nombre: string;
  tipo: string;
  control: string;
  finalidad: string;
  fechaApertura: string;
  saldoApertura: string;
  objetivo: string;
  liquidez: boolean | null;
  mostrarComoBolsa: boolean | null;
  permiteSalidaExterior: boolean | null;
};
export function SaldoForm({
  saldo,
  onSaved,
  onCancel,
}: {
  saldo?: Saldo;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const initial: Draft = {
    nombre: saldo?.nombre ?? "",
    tipo: saldo?.tipo ?? "Efectivo",
    control: saldo?.control ?? "Movimientos",
    finalidad: saldo?.finalidad ?? "",
    fechaApertura: saldo?.fechaApertura ?? "",
    saldoApertura: saldo?.saldoApertura ?? "",
    objetivo: saldo?.objetivo ?? "",
    liquidez: saldo ? saldo.liquidez : false,
    mostrarComoBolsa: saldo ? saldo.mostrarComoBolsa : false,
    permiteSalidaExterior: saldo ? saldo.permiteSalidaExterior : false,
  };
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({});
  const attempt = useRef({ fingerprint: "", key: "" });
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  const label = (
    key: keyof Draft,
    title: string,
    element: React.ReactNode,
    hint?: string,
  ) => (
    <label>
      {title}
      {element}
      {hint && <small>{hint}</small>}
      {fields[key] && (
        <span className="field-error" id={`${key}-error`}>
          {fields[key]}
        </span>
      )}
    </label>
  );
  const props = (key: keyof Draft) => ({
    "aria-label": (
      {
        nombre: "Nombre *",
        tipo: "Tipo *",
        control: "Control *",
        fechaApertura: "Fecha apertura · opcional",
        saldoApertura: "Saldo apertura (€) · opcional",
        objetivo: "Objetivo (€) · opcional",
      } as Record<string, string>
    )[key],
    "aria-invalid": Boolean(fields[key]),
    "aria-describedby": fields[key] ? `${key}-error` : undefined,
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    const body: Record<string, unknown> = {
      ...draft,
      finalidad: draft.finalidad || null,
      fechaApertura: draft.fechaApertura || null,
      saldoApertura: draft.saldoApertura.trim().replace(",", ".") || null,
      objetivo: draft.objetivo.trim().replace(",", ".") || null,
    };
    if (saldo) {
      body.revision = saldo.revision;
      for (const f of flags) if (draft[f] === saldo[f]) delete body[f];
    }
    const fingerprint = JSON.stringify(body);
    if (attempt.current.fingerprint !== fingerprint)
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const result = await api<{ saldo: Saldo }>(
        saldo ? `/saldos/${saldo.id}` : "/saldos",
        saldo ? "PATCH" : "POST",
        body,
        { "idempotency-key": attempt.current.key },
      );
      onSaved(result.saldo.id);
    } catch (e) {
      const err = e as ApiError;
      setError(
        err.status === 409
          ? `${err.message} Tu borrador se conserva. Abre la ficha actual en otra pestaña para comparar antes de volver a editar.`
          : err.message,
      );
      setFields(err.fields ?? {});
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[role="alert"]')?.focus(),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a
        className="back"
        href={saldo ? `/saldos/${saldo.id}` : "/saldos"}
        onClick={(e) => {
          e.preventDefault();
          onCancel();
        }}
      >
        ← {saldo ? "Volver a la ficha" : "Volver a Saldos"}
      </a>
      <PageHead
        eyebrow="SALDOS · CONFIGURACIÓN"
        title={saldo ? "Editar Saldo" : "Nuevo Saldo"}
        description="Define su identidad y sus atributos. Los importes no se calculan en esta entrega."
      >
        {saldo ? (
          <span className="id-label">{saldo.id} · ID inmutable</span>
        ) : (
          <Tag>Estado inicial: Activa</Tag>
        )}
      </PageHead>
      <form className="saldo-form" onSubmit={submit} noValidate>
        {error && (
          <div role="alert" tabIndex={-1} className="alert">
            <div>{error}</div>
          </div>
        )}
        <section className="panel">
          <div className="section-title">
            <span className="step-number">01</span>
            <div>
              <h2>Identificación</h2>
              <p className="muted">Un nombre reconocible para tu Saldo.</p>
            </div>
          </div>
          <div className="form-grid">
            {label(
              "nombre",
              "Nombre *",
              <input
                {...props("nombre")}
                value={draft.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                autoComplete="off"
              />,
            )}
            {label(
              "tipo",
              "Tipo *",
              <select
                {...props("tipo")}
                value={draft.tipo}
                onChange={(e) => {
                  const tipo = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    tipo,
                    control: controls[tipo].includes(d.control)
                      ? d.control
                      : controls[tipo][0],
                  }));
                }}
              >
                {Object.keys(controls).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>,
            )}
          </div>
          <p className="help">
            {saldo
              ? `Identificador ${saldo.id}: permanece estable al editar, desactivar o reactivar.`
              : "El servidor asignará un identificador estable Sxxx. No se puede editar ni reutilizar."}
          </p>
        </section>
        <section className="panel">
          <div className="section-title">
            <span className="step-number">02</span>
            <div>
              <h2>Configuración económica</h2>
              <p className="muted">
                La apertura es una posición inicial, no un Movimiento.
              </p>
            </div>
          </div>
          <div className="form-grid">
            {label(
              "control",
              "Control *",
              <select
                {...props("control")}
                value={draft.control}
                onChange={(e) => set("control", e.target.value)}
              >
                {controls[draft.tipo].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>,
              "Solo combinaciones contrastadas. Manual aún no está habilitado.",
            )}
            {label(
              "fechaApertura",
              "Fecha apertura · opcional",
              <input
                {...props("fechaApertura")}
                type="date"
                value={draft.fechaApertura}
                onChange={(e) => set("fechaApertura", e.target.value)}
              />,
              "Fecha civil del inicio del control; no filtra el Saldo actual.",
            )}
            {label(
              "saldoApertura",
              "Saldo apertura (€) · opcional",
              <input
                {...props("saldoApertura")}
                inputMode="decimal"
                placeholder="Sin informar"
                value={draft.saldoApertura}
                onChange={(e) => set("saldoApertura", e.target.value)}
              />,
              "Admite negativos y cero explícito. Máximo dos decimales.",
            )}
          </div>
          <p className="help">
            {["Terminal", "No controlado"].includes(draft.control)
              ? "Aperturas opcionales, sin función actual demostrada para este control. Se conserva la información."
              : draft.tipo === "Inversión"
                ? "La apertura monetaria no tiene función actual demostrada para Inversión/Inversiones. Se conserva sin transformarla."
                : "El motor de cálculo se incorporará en su entrega. Hasta entonces, la posición no está disponible."}
          </p>
        </section>
        <section className="panel">
          <div className="section-title">
            <span className="step-number">03</span>
            <div>
              <h2>Atributos de control</h2>
              <p className="muted">
                Independientes entre sí, del Tipo y del Control.
              </p>
            </div>
          </div>
          <div className="form-grid">
            {label(
              "finalidad",
              "Finalidad · opcional",
              <select
                value={draft.finalidad}
                onChange={(e) => set("finalidad", e.target.value)}
              >
                <option value="">Sin informar</option>
                {["Gastos planificados", "Ahorro", "Inversión"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>,
            )}
            {label(
              "objetivo",
              "Objetivo (€) · opcional",
              <input
                {...props("objetivo")}
                inputMode="decimal"
                placeholder="Sin informar"
                value={draft.objetivo}
                onChange={(e) => set("objetivo", e.target.value)}
              />,
              "Sin objetivo no significa objetivo cero.",
            )}
          </div>
          <div className="switch-group">
            {flags.map((f) => (
              <Switch
                key={f}
                label={flagLabels[f]}
                value={draft[f]}
                onChange={(v) => set(f, v)}
              />
            ))}
          </div>
        </section>
        <div className="form-footer">
          <p className="muted">
            {saldo
              ? `Revisión ${saldo.revision} · Estado ${saldo.estado}`
              : "* Campos obligatorios. El resto puede quedar sin informar."}
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Guardando…" : saldo ? "Guardar cambios" : "Crear Saldo"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
