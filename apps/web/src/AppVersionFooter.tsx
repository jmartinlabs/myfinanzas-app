import { useEffect, useId, useRef, useState } from "react";
import { loadVersionInfo } from "./version-source";
import {
  PANEL_TITLE,
  SCHEMA_NOTE,
  environmentText,
  footerEnvironmentLabel,
  footerIdentityLabel,
  schemaLabel,
  shaLabel,
  versionText,
  type AppVersionInfo,
} from "./version";

/**
 * #502 — pie persistente con la identidad de release.
 *
 * Una sola carga de `GET /api/version` cacheada en el estado del componente:
 * nunca un número hardcodeado ni Git en el navegador. Si la petición falla, el
 * texto cae a «Versión no disponible · build de desarrollo» y el panel muestra
 * `No disponible`; no se inventa una release.
 *
 * El control es un `button` con `aria-expanded`/`aria-controls`. El panel no
 * atrapa el foco: `Escape` lo cierra y devuelve el foco al control, y un puntero
 * fuera lo cierra. Funciona con ratón, teclado y táctil.
 */
export function AppVersionFooter() {
  const [info, setInfo] = useState<AppVersionInfo | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  useEffect(() => {
    let alive = true;
    loadVersionInfo().then((data) => {
      if (alive) setInfo(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    // El panel no es modal: al abrirse el foco entra en él (botón de cierre) y
    // `Escape` lo devuelve al disparador del pie. Un puntero fuera lo cierra.
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    const pointerdown = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    addEventListener("keydown", keydown);
    addEventListener("pointerdown", pointerdown);
    return () => {
      removeEventListener("keydown", keydown);
      removeEventListener("pointerdown", pointerdown);
    };
  }, [open]);
  return (
    <div className="app-version" ref={rootRef}>
      <div
        id={panelId}
        className="app-version-panel"
        role="dialog"
        aria-modal="false"
        aria-label={PANEL_TITLE}
        hidden={!open}
      >
        <div className="app-version-head">
          <p className="app-version-title">{PANEL_TITLE}</p>
          <button
            type="button"
            ref={closeRef}
            className="app-version-close"
            aria-label="Cerrar información de la aplicación"
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <dl>
          <div>
            <dt>Versión de aplicación</dt>
            <dd>{versionText(info)}</dd>
          </div>
          <div>
            <dt>Entorno</dt>
            <dd>{environmentText(info)}</dd>
          </div>
          <div>
            <dt>SHA corto</dt>
            <dd>{shaLabel(info)}</dd>
          </div>
          <div>
            <dt>Esquema SQLite</dt>
            <dd>{schemaLabel(info)}</dd>
          </div>
        </dl>
        <p className="app-version-note">{SCHEMA_NOTE}</p>
      </div>
      <button
        type="button"
        ref={buttonRef}
        className="app-version-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="app-version-label">{footerIdentityLabel(info)}</span>
        {footerEnvironmentLabel(info) && (
          <span className="app-version-env">{footerEnvironmentLabel(info)}</span>
        )}
        <span className="app-version-caret" aria-hidden="true">
          {open ? "▾" : "▴"}
        </span>
      </button>
    </div>
  );
}