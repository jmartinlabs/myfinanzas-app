/**
 * Estados de error de `/fotos`.
 *
 * Extraído de `Fotos.tsx` sin cambios: mismos textos, foco, alerta y campos.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { Alert } from "../../ui";
import { failureMessage } from "../errors";
import type { Failure, FailureContext } from "../types";

export function ErrorBox({
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
