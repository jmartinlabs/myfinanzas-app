import type { ReactNode } from "react";
import { formatAmount, type AmountUnit } from "./format";
export function Alert({
  children,
  retry,
}: {
  children: ReactNode;
  retry?: () => void;
}) {
  return (
    <div className="alert" role="alert">
      <div>{children}</div>
      {retry && (
        <button className="secondary" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
export function Switch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="switch-row">
      <span>{label}</span>
      {value === null ? (
        <span className="unknown">
          Sin informar{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => onChange(false)}
            aria-label={`Informar ${label} como No`}
          >
            Informar No
          </button>
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-label={label}
          aria-checked={value}
          className={"switch " + (value ? "on" : "off")}
          onClick={() => onChange(!value)}
        >
          <span className="knob" />
          <span>{value ? "Sí" : "No"}</span>
        </button>
      )}
    </div>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
export function Tag({
  children,
  inactive = false,
}: {
  children: ReactNode;
  inactive?: boolean;
}) {
  return (
    <span className={"tag " + (inactive ? "inactive" : "")}>{children}</span>
  );
}
export function TableScroll({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export type AmountState =
  | "Verificado"
  | "Cero verificado"
  | "Parcial"
  | "No disponible"
  | "No aplica"
  | "Sin datos";

/**
 * Cifra de una métrica con su estado explícito.
 *
 * `null` nunca se convierte en cero: se presenta como `ND`, «No aplica» o
 * «Sin datos». Solo los importes negativos reciben `--negative`.
 */
export function Amount({
  value,
  subtotal = null,
  state,
  unit = "EUR",
  note,
  className,
  showNote = true,
}: {
  value: string | null;
  subtotal?: string | null;
  state?: AmountState;
  unit?: AmountUnit;
  note?: string;
  className?: string;
  showNote?: boolean;
}) {
  const resolved =
    state ??
    (value !== null
      ? "Verificado"
      : subtotal !== null
        ? "Parcial"
        : "No disponible");
  const classes = `ui-amount-wrap${className ? ` ${className}` : ""}`;

  if (resolved === "No aplica" || resolved === "Sin datos") {
    const icon = resolved === "No aplica" ? "—" : "○";
    return (
      <span className={classes} data-state={resolved}>
        <span className="ui-amount-state">
          <span className="ui-amount-icon" aria-hidden="true">
            {icon}
          </span>{" "}
          {resolved}
        </span>
        {showNote && note && <small className="ui-amount-note">{note}</small>}
      </span>
    );
  }

  if (resolved === "No disponible") {
    return (
      <span className={classes} data-state={resolved}>
        {showNote && (
          <small className="ui-amount-note">{note ?? "No disponible"}</small>
        )}
        <strong className="ui-amount-value ui-amount-value-nd">ND</strong>
        {subtotal !== null && (
          <small className="ui-amount-note">
            Subtotal conocido {formatAmount(subtotal, unit)}
          </small>
        )}
      </span>
    );
  }

  const mostrado =
    resolved === "Parcial" ? (subtotal ?? value) : (value ?? subtotal);
  const defaultNote =
    resolved === "Parcial"
      ? "Subtotal conocido"
      : resolved === "Cero verificado"
        ? "Cero verificado"
        : "Total verificado";
  const negative = mostrado !== null && mostrado.startsWith("-");

  return (
    <span className={classes} data-state={resolved}>
      {showNote && (
        <small className="ui-amount-note">{note ?? defaultNote}</small>
      )}
      {mostrado === null ? (
        <strong className="ui-amount-value ui-amount-value-nd">ND</strong>
      ) : (
        <strong
          className={`ui-amount-value${negative ? " ui-amount-negative" : ""}`}
        >
          {formatAmount(mostrado, unit)}
        </strong>
      )}
    </span>
  );
}

export type BadgeTone = "ok" | "partial" | "nd" | "info";

/** Badge único de estado/cobertura: color, icono y texto, nunca solo color. */
export function Badge({
  tone = "nd",
  label,
  icon,
  estado,
  kind,
  className,
}: {
  tone?: BadgeTone;
  label: ReactNode;
  icon?: string;
  estado?: string;
  kind?: "estado" | "cobertura";
  className?: string;
}) {
  return (
    <span
      className={`ui-badge ui-badge-${tone}${
        className ? ` ${className}` : ""
      }`}
      data-estado={estado}
      data-tipo={kind}
    >
      {icon && (
        <span className="ui-badge-icon" aria-hidden="true">
          {icon}
        </span>
      )}{" "}
      {label}
    </span>
  );
}

/** Tarjeta de una lectura principal: título/clase, cifra y badge. */
export function Metric({
  title,
  titleAs = "h3",
  clase,
  dataClase,
  amount,
  badge,
  children,
  className,
  ariaLabel,
}: {
  title: ReactNode;
  titleAs?: "h2" | "h3" | "h4";
  clase?: ReactNode;
  dataClase?: string;
  amount?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const Heading = titleAs;
  return (
    <article
      className={`ui-metric${className ? ` ${className}` : ""}`}
      data-clase={dataClase}
      aria-label={ariaLabel}
    >
      <div className="ui-metric-head">
        <Heading className="ui-metric-title">{title}</Heading>
        {clase && <span className="ui-metric-class">{clase}</span>}
      </div>
      {(amount || badge) && (
        <div className="ui-metric-main">
          {amount}
          {badge}
        </div>
      )}
      {children}
    </article>
  );
}

/** Vacío compartido: icono + texto, nunca un cero o una fila inventada. */
export function EmptyState({
  title,
  children,
  icon = "○",
  className,
  role = "status",
}: {
  title?: ReactNode;
  children?: ReactNode;
  icon?: string;
  className?: string;
  role?: "status" | "note" | "alert";
}) {
  return (
    <div
      className={`ui-empty${className ? ` ${className}` : ""}`}
      role={role}
    >
      <span className="ui-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="ui-empty-content">
        {title && <p className="ui-empty-title">{title}</p>}
        {children && <p className="ui-empty-text">{children}</p>}
      </div>
    </div>
  );
}

/** Esqueleto de carga con la última línea corta. */
export function Skeleton({
  lines = 3,
  label = "Cargando…",
  className,
}: {
  lines?: number;
  label?: string;
  className?: string;
}) {
  const count = Math.max(1, Math.trunc(lines));
  return (
    <div
      className={`ui-skeleton${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={`ui-skeleton-line${
            index === count - 1 ? " short" : ""
          }`}
        />
      ))}
    </div>
  );
}
