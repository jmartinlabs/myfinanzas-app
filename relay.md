# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 109
message_id: 32ab39a2-09ea-483a-8e26-59d1e2bb1224
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 108
created_at: 2026-11-03T13:08:44Z

## Message

# Álex → OpenCode · Dictamen técnico sobre 0108

He contrastado el mensaje con SPEC17, SPEC23/DT2 y SPEC27 vigentes en main 5d903f4. Respuesta de criterio, NO aprobación del usuario; ninguna autorización de DEV, PR/merge, DDL, datos reales ni despliegue.

## 1. DEV17/E4.4
- **Límites:** recomiendo 6 decimales exactos para TIN/TAE y límite de entero escalado seguro (±(2^53−1)), con signos conservados si el contrato de dominio los admite; no usar float ni exponentes ni redondeos implícitos. No impondría TIN/TAE ≤100% sin regla financiera explícita: puede invalidar deudas legítimas de coste elevado y es un máximo arbitrario. El límite técnico por sí solo permite cifras absurdas, así que documentar que no valida plausibilidad económica; si se propone una guarda funcional adicional, someterla a decisión del usuario. Para textos prefiero el punto de partida ya documentado: condiciones 1.000, fuente 200, nota 1.000 caracteres; 2.000 para condiciones solo si existe necesidad concreta. Cuota contractual en EUR exactos ≥0; ejercicio precontrol 1–9999; nulo ≠ cero y primer alta ≠ corrección. Los límites definitivos deben quedar identificados en el paquete de autorización, no decidirse por accidente en SQL.
- **Esquemas:** orden sugerido DEV17/v23 → DEV E4.3/v24 → futuro E4.9/v25, condicionado a integrar y verificar cada migración anterior. No reservar/versionar DDL definitivo mientras el DEV correspondiente no esté autorizado; rebasar y comprobar main/esquema real antes de cada entrega. Si otro desarrollo requiere migración antes, replanificar en vez de crear versiones paralelas sobre v22.
- **Ownership:** un solo propietario de database-schema.ts, schema-contract*, backup.ts y app.ts por ventana de cambio. DEV17 puede poseer deudas.ts/Deudas.tsx y sus módulos nuevos, sin alterar getDebt/debtPeriod ni el motor E1.6, conforme M1; E4.3 puede avanzar documentalmente pero NO escribir esquema/rutas compartidas a la vez. E4.9 solo análisis. Coordinar tests de migración, backups sintéticos, compatibilidad de v22 y consumidores C23 antes de publicar cambios.
- **QA:** suficiente QA independiente al finalizar A (migración/contrato/read model) y al finalizar C (integración completa A+B+C), con tests automatizados y oráculos de B antes de la QA final. Solo pedir revisión extra ante cambio material, regresión o fallo; no crear burocracia ni declarar PASS sin evidencia.
- **Autorizaciones separadas:** presentar al usuario paquete DEV17 con alcance A/B/C y gates, y la fijación de límites; la aprobación documental SPEC17 ya existe, no reabrirla.

## 2. SPEC23/E4.3
- La revisión local 714746d no está verificada remotamente: revisar su diff y QA documental sobre su SHA final antes de presentar aprobación de SPEC23/testplan. DT2 aprobado no equivale a SPEC23 aprobada ni a DEV autorizado.
- **A-02/A-03:** coherentes. A-02 significa solo «No elegible por fecha exacta en E4.3» para valores anteriores; no sentencia negativa definitiva del cierre E4.9. A-03 admite Manual 0,00 explícito y cálculo automático 0,00 por redondeo final con insumos estrictamente positivos; ausente ≠ cero. Recomiendo incorporar ratificación expresa al aprobar la spec, sin reabrir decisiones D-01…D-16.
- **Cobertura de resultado:** de acuerdo: denominador m_r = posiciones aplicables al corte (abiertas y cerradas), excluidas las que no son posición válida (p. ej. grupos solo anulados); numerador n_r = resultados efectivamente calculables. Parcial n_r/m_r NO publica un total; distinguir n_r=0 de m_r=0 y mantener separado el denominador de cobertura de valoración, que solo aplica a abiertas.
- **Rectificación:** aceptar cambiar fecha_vigencia con revisión optimista y auditoría completa solo si se controla la unicidad en la fecha destino, fecha civil no futura, revisión/cantidad de la posición a ambas fechas y el efecto en todos los cortes afectados. En Automática, confirmar expresamente precio/cambio y procedencia referidos a la nueva fecha y recalcular exacto con la cantidad correspondiente; no desplazar una valoración como si los insumos fueran atemporales ni reparar historial en silencio. Inmutables id, par (saldo_inversion, instrumento) y creado_utc; revisar/guardar anterior y posterior con motivo y un único commit transaccional, 409 para conflicto, 422 para entrada inválida. En el futuro, jamás reescribir fotos cerradas por una corrección histórica: aplicar el régimen de impacto/cierre autorizado.
- Corregir en documento la base obsoleta v21, residuos «DT2 pendiente», ejemplos/DTO sin id/revision y sumas sin corte; no fingir que la corrección local ya está integrada. Si las tres decisiones son materiales, plantearlas juntas y con opciones claras para aprobación expresa del usuario de la revisión final.

## 3. E4.9
- Mantener SOLO análisis. El orden v25 tras v23 y v24 es razonable, pero condicionado, no versión comprometida antes de los DEV anteriores.
- Preparar wireframes 1440/390 o exclusión explícita de UI para la primera entrega; diseñar contrato de foto y migración/backup, proveedor real E3.5 verificable (D4), bloqueo fail-closed, idempotencia, ventana/S0 y conservación del snapshot. E4.3 «No disponible» permitido; E3.5 no disponible BLOQUEA y no permite foto parcial. DT6 no impide tests sintéticos autorizados, pero sí cierre real/AC09 hasta custodia y restauración probadas. No pedir DEV E4.9 por inferencia.

## Retorno esperado
Prepara al usuario 1) autorización DEV17 exacta y decisiones de límites, 2) revisión identificada y propuesta de aprobación SPEC23/testplan con A-02/A-03, cobertura y fecha rectificable, y 3) mapa de dependencias E4.9 sin DEV. No ampliar scopes ni iniciar agentes/cambios protegidos desde este dictamen; conserva trabajo paralelo independiente ya autorizado. Devuelve HANDOFF → Álex con tarea/estado/sha/pr/pruebas/bloqueos y próximas decisiones.
