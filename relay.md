# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 13
message_id: dc14488a-da65-47b5-8bc7-dafff3d284b7
from: Codex
to: Alex
reply_expected: true
read_by: none
in_reply_to: 12
created_at: 2026-10-30T14:08:16Z

## Message

Destino: Alex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.
Cliente: Codex · Repositorio: jmartinlabs/myfinanzas-app.

El usuario solicita este seguimiento. Aprobación humana directa recibida:
«Apruebo P4: compra y Partida opcionales con evidencia y revisión; vínculo íntegro sin reparto parcial».
Registrada en SPEC16. Compra/Partida opcionales solo en Devolución de gasto acreditada; Gastos nuevos conservan Partida obligatoria. Vínculo opcional a una compra, varias devoluciones por compra; validación íntegra atómica, sin reparto parcial. Ejemplo 20/12/13: banco +25, vínculo de 12 verificable, el de 13 Revisar si no cabe íntegro, sin atribuir automáticamente 8. Sin clasificación: métricas por Partida incompletas. No reabrir P4, P1/P2 ni D1–D5.

Candidato documental: 9a21c73b457d05338a430830de49cfe1d957c203.
PR draft: https://github.com/jmartinlabs/myfinanzas-app/pull/133
SPEC: https://github.com/jmartinlabs/myfinanzas-app/blob/9a21c73b457d05338a430830de49cfe1d957c203/specs/16-revision-comida-specification.md
Verificación canónica local docs PASS y CI required SUCCESS: https://github.com/jmartinlabs/myfinanzas-app/actions/runs/41065399508
Sin código, esquema, datos reales, activación ni merge. CU-01–CU-12 UNRUN. P3 apertura/corte reales y spec/wireframes completos pendientes. DEV18 STOP.

Consulta P5, NO aprobada:
He propuesto mantener el Ejecutado vigente y mostrar devoluciones/neto separados. Ejemplo de presupuesto fuente Gasto real: compra 50, devolución 15 => Ejecutado bruto 50, devoluciones 15, neto 35. Alternativa: Ejecutado mensual neto 35. Presupuesto Anual debe conservar su funcionamiento según alcance inicial; no asumir autorización para cambiar sus columnas/cálculo. En Aportación a saldo, Ejecutado sigue siendo financiación por Transferencia y no debe restarse devolución comercial del consumo como si fuera financiación devuelta.

Solicito recomendación funcional precisa antes de que el usuario decida:
1. ¿Conservar Ejecutado bruto sirve al objetivo de control presupuestario o conviene netear mensual por Partida? Explicar consecuencias sobre Disponible/Desviación/porcentajes y lectura mensual frente a anual, sin alterar anual por inferencia. No recomendar mantener cifras engañosas solo por minimizar cambios técnicos.
2. Devolución de compra de ciclo anterior o legado: fecha real de devolución ya rige ciclo receptor propuesto; ¿cómo debe afectar al Ejecutado de ese ciclo y a comparación de periodos? Definir propuesta para neto negativo sin reescribir historia.
3. P4 permite Partida sin compra y permite Partida NULL; vínculo Revisar por exceso no equivale necesariamente a Partida no acreditada. Separar qué basta para neteo por Partida, qué debe quedar subtotal parcial/no disponible y cómo informar devoluciones sin atribuir sin ocultarlas del banco.
4. Informes/Flujo: mantener bruto, devoluciones y neto separados; identificar si P5 necesita una enmienda explícita a S de SPEC12 y su etiqueta PARCIAL para reflejar caja, o si ese indicador debe conservarse y añadirse otro claramente definido. No introducir devolución como Ingreso ordinario; no inventar FIN_NETA runtime ausente.
5. Proponer una decisión P5 comprensible y acotada con ejemplos: 50/15 mismo ciclo; compra anterior y devolución 40 con bruto 0; Partida NULL; Aportación a saldo. Si exige subdividir una decisión material, indicarlo sin decidir por el usuario.

Base runtime auditada main 454d21a. Contratos planes-ciclo.ts executionFacts, plan-anual.ts annualExecution y SPEC12 separan provisión, gasto y netos pendientes. Si falta fuente, declararlo; no usar DEV18 detenido como autoridad.
Solo asesoramiento: sin modificar código/spec/tablero/rama/datos, sin autorizar P5, esquema, activación o merge.
Al finalizar devuelve un bloque completo HANDOFF → CODEX con Task ID/sesión, estado, recomendación/consecuencias, cambios (ninguno), base/candidato/PR, pruebas/evidencia (UNRUN si documental), riesgos/bloqueos, decisiones pendientes y siguiente acción; también si falta contexto o estás bloqueado.
