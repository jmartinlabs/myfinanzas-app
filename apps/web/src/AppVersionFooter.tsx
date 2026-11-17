import { useEffect, useId, useRef, useState } from "react";
import { api } from "./api";
import {
  PANEL_TITLE,
  SCHEMA_NOTE,
  environmentText,
  footerLabel,
  parseVersionPayload,
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
  useEffect(() => {
    let alive = true;
    api<unknown>("/version")
      .then((data) => {
        if (alive) setInfo(parseVersionPayload(data));
      })
      .catch(() => {
        if (alive) setInfo(null);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
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
        role="group"
        aria-label={PANEL_TITLE}
        hidden={!open}
      >
        <p className="app-version-title">{PANEL_TITLE}</p>
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
        <span className="app-version-label">{footerLabel(info)}</span>
        <span className="app-version-caret" aria-hidden="true">
          {open ? "▾" : "▴"}
        </span>
      </button>
    </div>
  );
}