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

/** Rol de presentación de una columna compartida por tabla y tarjetas. */
export type TableColumnKind = "text" | "amount" | "status" | "actions";

/**
 * Definición única de una columna.
 *
 * `Table` la usa para la cabecera y la celda de escritorio; `DataList` usa la
 * misma definición para la etiqueta y el valor de cada tarjeta móvil, de modo
 * que la paridad no depende de mantener dos JSX a mano. `card: "hidden"` solo
 * omite la columna de las tarjetas: nunca elimina información de la tabla.
 */
export type TableColumn<Row> = {
  id: string;
  header: ReactNode;
  /** Etiqueta de la tarjeta móvil; si falta se usa `header` o `id`. */
  label?: string;
  kind?: TableColumnKind;
  /** Ancho opcional de la columna (se aplica a su `th`). */
  width?: string;
  card?: "hidden";
  cell: (row: Row, index: number) => ReactNode;
  /**
   * Render alternativo solo para la tarjeta móvil. Permite conservar el texto
   * o los enlaces propios de la tarjeta sin duplicar falsos positivos de texto
   * exacto con la tabla. Por defecto se usa `cell`.
   */
  cardCell?: (row: Row, index: number) => ReactNode;
};

function tableColumnLabel<Row>(column: TableColumn<Row>): string {
  if (column.label) return column.label;
  if (typeof column.header === "string") return column.header;
  return column.id;
}

function cellClass(kind: TableColumnKind | undefined): string | undefined {
  return kind === "amount" ? "ui-table-amount" : undefined;
}

export type TableProps<Row> = {
  /** Texto accesible de la tabla; por defecto se oculta visualmente. */
  caption: ReactNode;
  /** Nombre de la región desplazable de `TableScroll`. */
  label: string;
  columns: ReadonlyArray<TableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey?: (row: Row, index: number) => string | number;
  /** Clase opcional de la fila (p. ej. `annulled`); no altera celdas. */
  rowClassName?: (row: Row, index: number) => string | undefined;
  /** Muestra el `caption` a la vista en lugar de ocultarlo. */
  captionVisible?: boolean;
  empty?: ReactNode;
  /** Clases del contenedor interno; conserva hooks como `desktop-list`. */
  className?: string;
  /** Clases del `<table>`; conserva hooks por página como `inversiones-table`. */
  tableClassName?: string;
};

/** Tabla de escritorio con cabecera, importes alineados y scroll rotulado. */
export function Table<Row>({
  caption,
  label,
  columns,
  rows,
  rowKey,
  rowClassName,
  captionVisible = false,
  empty = "Sin datos",
  className,
  tableClassName,
}: TableProps<Row>) {
  return (
    <TableScroll label={label}>
      <div className={`ui-table-wrap${className ? ` ${className}` : ""}`}>
        <table
          className={`ui-table${tableClassName ? ` ${tableClassName}` : ""}`}
        >
          <caption
            className={`ui-table-caption${captionVisible ? "" : " sr-only"}`}
          >
            {caption}
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cellClass(column.kind)}
                  data-kind={column.kind ?? "text"}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="ui-table-empty" colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row, index) : index}
                  className={rowClassName?.(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cellClass(column.kind)}
                      data-kind={column.kind ?? "text"}
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </TableScroll>
  );
}

export type DataListProps<Row> = {
  columns: ReadonlyArray<TableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey?: (row: Row, index: number) => string | number;
  /** Nombre accesible opcional de la lista de tarjetas. */
  label?: string;
  empty?: ReactNode;
  /** Clases de la lista; conserva hooks como `mobile-list`. */
  className?: string;
};

/**
 * Tarjetas móviles generadas desde las mismas columnas que `Table`.
 *
 * Cada campo expone `data-label` y su etiqueta visible. Las columnas
 * `card: "hidden"` no se muestran aquí, pero sí permanecen en la tabla.
 */
export function DataList<Row>({
  columns,
  rows,
  rowKey,
  label,
  empty = "Sin datos",
  className,
}: DataListProps<Row>) {
  const cardColumns = columns.filter((column) => column.card !== "hidden");

  return (
    <ul
      className={`ui-data-list${className ? ` ${className}` : ""}`}
      role="list"
      aria-label={label}
    >
      {rows.length === 0 ? (
        <li className="ui-data-list-empty">{empty}</li>
      ) : (
        rows.map((row, index) => (
          <li
            key={rowKey ? rowKey(row, index) : index}
            className="ui-data-list-item"
          >
            {cardColumns.map((column) => {
              const fieldLabel = tableColumnLabel(column);
              return (
                <div
                  key={column.id}
                  className="ui-data-list-field"
                  data-kind={column.kind ?? "text"}
                  data-label={fieldLabel}
                >
                  <span className="ui-data-list-label">{fieldLabel}</span>
                  <div className="ui-data-list-value">
                    {(column.cardCell ?? column.cell)(row, index)}
                  </div>
                </div>
              );
            })}
          </li>
        ))
      )}
    </ul>
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
