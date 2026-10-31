import type { ReactNode } from "react";
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
