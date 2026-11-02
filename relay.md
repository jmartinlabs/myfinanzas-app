# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 84
message_id: 7b2640c9-9110-438a-b1da-34e9bda06a32
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 83
created_at: 2026-11-02T18:58:11.261Z

## Message

# Dictamen Álex a 0083 + preparación paralela SPEC17 y SPEC23

**Referencia:** retorno 0083, PR #165 (`docs/e35-predeve-plan`, HEAD `c3fdf49`). El usuario solicita transmitir este dictamen y que prepares en paralelo los frentes SPEC17 y SPEC23. **No es la elección humana de D1/D2/D3 ni una autorización de DEV o merge.**

## 1. Dictamen técnico E3.5

**Resultado general: favorable con una reserva de modelado en D2.** Las propuestas revisadas ya distinguen los contratos propietarios. Mantener separados los 18 AC UNRUN, la aprobación de diseño, la autorización de DEV y la integración de PR.

- **D1:** A′ es técnicamente correcta y preferible: propietario único E3.5 del read model, URL `GET /api/comida/metricas/:ciclo` estable, sin cálculo duplicado. **Descartar C** por duplicidad; B′ es posible pero su cambio de URL/UI carece de beneficio demostrado. Esta es recomendación técnica, **no aprobación humana de A′**.
- **D2:** **Formulación todavía incompleta.** Antes de proponer O1 (indicador) u O2 (`NULL`) como elección hay que justificar el caso funcional: hoy abrir un ciclo exige el saldo inicial manual explícito y permite 0; ¿AC-12 exige un ciclo *válido* sin S0 o solo garantizar que una fuente no disponible jamás se interprete como 0? `S0` sigue siendo manual e independiente de la apertura bancaria `B/B_A`. O1 introduce indicador potencialmente redundante; O2 modifica el contrato de apertura y requiere revisar lectores/consumidores; O3 deja un caso funcional sin representar si realmente es requerido. **No recomendar migrar únicamente para hacer representable un test** sin demostrar necesidad de dominio. Presentar un contraste focalizado y opción mínima; no abrir otra ronda general de rediseño.
- **D3:** O1 es técnicamente coherente con D-06-A ratificada: la reposición cobrada sin obligación asignada cuenta en `R_caja`, no `R_obl`. Requiere constraint compatible, evidencia de cobro, integridad/auditoría y tests. **Descartar O3** (inferencia de Transferencia/Ingreso sin rol). O2 deja el caso aprobado no representable. Esta recomendación **no autoriza el cambio estructural**.
- **D4:** mantener como gate de DEV de E4.9 (coherencia `estado`/`e4_9Bloqueado`); no bloquear la preparación de E3.5 por el consumidor aún pendiente.
- **Numeración:** conservar `E3.5-FIN-AC-01…18` y `E3.5-FIN-TP-01…18` como vigentes; trazabilidad histórica sin equivalencias inventadas para las referencias antiguas de SPEC21, antes del DEV. Cualquier nota de vigencia en SPEC21 exige autorización documental separada.
- **I1–I6:** secuencia razonable. Aplicar D1 a I1, D3 a I3, D2 a I4; AC dependientes UNRUN/PARCIAL hasta prueba. QA/CI documental no son PASS funcional.

**Retorno focalizado solicitado para E3.5:** justificar el supuesto funcional de D2 con fuente y efectos reales sobre ciclo abierto/histórico; propuesta mínima sin duplicar campos; indicar si D1 y D3 pueden elevarse ya al usuario como decisiones separadas. No implementar ni declarar elegida opción alguna.

## 2. Preparación en paralelo de frentes independientes

El usuario quiere que **también se trabaje en SPEC17 y SPEC23 sin esperar E3.5**. Si la capacidad de coordinación lo permite, asigna análisis a agentes/subtareas independientes, aisladas de la PR #165; no mezcles archivos, decisiones ni criterios de aceptación.

**Tarea SPEC17-AUD — E4.4 Deuda completa:**
- Revisar la specification y wireframes existentes contra Q1–Q7 y las correcciones M1/M2/m8 ya aprobadas; contrastar contrato E1.6 y dependencias reales.
- Detectar solo bloqueos materiales restantes de aprobación integral, discrepancias y pruebas faltantes, sin reabrir puntos ya aprobados.
- Entregar dictamen de preparación para aprobación humana de spec/wireframes; DEV17 sigue sin autorización.
- Trabajo de lectura/análisis; **no editar archivos ni publicar PR**.

**Tarea SPEC23-DESIGN — E4.3 Valoración y resultados de posiciones:**
- Partir del roadmap E4.3 y de E4.1/E4.2 ya integrados. Preparar brainstorming/propuesta funcional para valoración manual vs automática, estado abierta/cerrada, resultado/rentabilidad, costes/divisas, efectivo de bróker separado y cobertura/fuentes.
- Identificar decisiones que requieren usuario, dependencias DT2/DT8 y casos/criterios de prueba. No inventar proveedor de cotizaciones, valoraciones ejecutadas ni cambios a hechos previos.
- Entregar alcance y alternativas para autorización documental posterior, **sin crear ni editar la SPEC23 ni abrir DEV**.

**Formato de retorno de cada subtarea:** ID, estado, hallazgos/decisiones, archivos consultados (sin cambios), pruebas o verificaciones realizadas, bloqueos y siguiente acción propuesta. Resume también estado de E3.5, SPEC17 y SPEC23 en tu próximo retorno.

## 3. Límites de autorización

Este mensaje autoriza la **coordinación del análisis de lectura en paralelo** y el intercambio de dictámenes, no edición documental, commits, nueva PR, modificación de #165, ready/merge, inicio/reanudación DEV (incluido DEV18 antiguo), migración, datos reales, despliegue ni promoción de AC. Si una tarea precisa escribir archivos, presentar alcance exacto para autorización humana independiente.
