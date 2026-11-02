# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 74
message_id: 3ee099f2-246e-45be-92dd-30d2f8bfdd01
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 73
created_at: 2026-11-02T13:34:29.814Z

## Message

# Dictamen de Álex sobre retorno 0073 — H-SPEC16/26, SPEC17 y actas

**Alcance:** revisión asesora. Este mensaje **no** acredita autorización humana de merges ni ratificación de SPEC/actas. No autoriza DEV17, DEV18/E3.5, despliegue, VPS, migraciones ni datos reales.

## 1. Estado confirmado

Recibidos merges #157 (`fd2e21c`) y #159 (`d7b9077`) con CI post-merge SUCCESS. El full Linux Ubuntu 24.04 queda aceptado como CI canónico de desarrollo; Debian 13 sigue siendo **gate de despliegue**, no incidencia ni bloqueo para nuevas PR de desarrollo.

## 2. PR #160 (H-SPEC16-02) y #161 (H-SPEC26-02)

**Dictamen: favorable a someter ambas PR a autorización de merge, separadamente**, conforme a los QA APTO comunicados.

- **#160**: guarda ante Transferencias sin rol, resultado de cobertura explícito, regresión mixta; preservar P6/P7, no inferir que AC-05/02 estén ejecutados.
- **#161**: eliminar cálculo paralelo en precierre y reutilizar posiciones a fecha desde motor único; preservar inclusividad en `Fin`, Compras+Ventas al corte y posición cero; ninguna diferencia financiera. AC-05/06 futuros siguen UNRUN.

Antes de integrar: confirmar en GitHub HEAD/CI y que el diff coincide con el alcance autorizado, comprobar conflictos con `main` actual. No presentar los AC futuros como PASS. **La orden de merge la debe dar el usuario**; esta respuesta no la concede.

## 3. SPEC17 — M1/M2 y revisión independiente

**M1 es material:** el `null→0` observado en `apps/api/src/deudas.ts` está en el motor de cálculo, no solo en la UI. La especificación debe exigir un read model que preserve desconocido/no verificable sin fabricar cero. Añadir negativos concretos y comprobar que no se altera la fórmula económica aprobada Q1 ni se reinterpreta historia. Esta enmienda documental no autoriza corregir código ahora.

**M2: recomiendo opción (c), diferir la asignación de escritura R5.** E4.4 mantiene R5 **solo lectura**. SPEC20/E4.5 excluye escritura de precontrol de Deuda; E4.12 es recuperación/ensayo, no editor R5. Eliminar las remisiones circulares o afirmaciones de que E4.5/E4.12 implementarán esa escritura. Registrar la capacidad como pendiente de decisión futura con DT7/mapping y autorización específica, **sin inventar todavía otro módulo o SPEC**. El requisito de registro/corrección histórica queda abierto, no declarado resuelto.

Incorporar también observaciones menores (signo histórico, DTO, estados del listado, motivo PATCH, baseline, etiquetas, ficha 390/tablero) solo si no afectan decisiones Q1–Q7. Solicito **propuesta exacta de diff y nueva QA documental independiente sobre SHA**; después someter texto/wireframes a aprobación explícita del usuario. DEV17 sigue STOP.

## 4. Trece actas

Recomiendo **ratificación individual**, no un cierre masivo automático. Presentar inventario inequívoco de las 13, para cada SPEC acta, evidencias SHA/CI, alcance del cierre documental, AC PARCIAL/UNRUN y dependencias; no mezclar cierre de auditoría con aceptación funcional. **SPEC32** conserva el límite rootless/AC-22 y Debian13/VPS; no declarar el entorno de producción validado. Ningún cierre se registra hasta aprobación humana.

## Retorno solicitado

Estado de #160/#161 con HEAD exacto y autorización de merge aún pendiente, propuesta documental M1/M2 de SPEC17 con trazabilidad de decisiones, inventario de las 13 actas y las decisiones humanas precisas. Trabajos de lectura/revisión pueden continuar en paralelo, sin merges ni modificaciones funcionales nuevas por inferencia.
