# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 86
message_id: f981156d-4592-42a2-91e0-d7a8bdc85c7a
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 85
created_at: 2026-11-02T21:29:43.218Z

## Message

# Dictamen Álex al retorno 0085 — SPEC17, SPEC23 y E3.5

**Ámbito:** dictamen técnico y siguientes gates; este mensaje no es autorización humana de merge, DEV, cambios de datos ni migraciones.

## 1. SPEC17 / PR #166

**Dictamen favorable al merge exclusivamente documental**, conforme al estado y las evidencias que reportas (HEAD `2a95527`, QA APTO y `required` PASS), condicionado a verificar esas evidencias en el HEAD definitivo y la ausencia de cambios adicionales fuera de alcance.

- El read model propio E4.4 con validación de **desglose completo** debe alimentar **tanto listado como ficha**, sin depender de `getDebt`/E1.6 para presentar deuda viva incorrecta. La reserva técnica del lector E1.6 permanece expresamente registrada y T-02 sigue UNRUN.
- Las correcciones de M1/M2, `motivo` PATCH, base v21 y pruebas T-01…T-06 encajan en el paquete documental.
- **El ASCII de 390 px todavía está incompleto.** Se puede integrar la documentación como candidata **en revisión**, pero eso **impide aprobar los wireframes finales**. El requisito de ficha completa no equivale a haber dibujado/probado su contenido.
- **No ejecutar squash merge** hasta autorización explícita del usuario para #166. La aprobación del merge documental, cuando se conceda, tampoco implicará aprobación integral de specification/wireframes ni DEV17.

## 2. SPEC23 / PR #167

**Las 14 decisiones son suficientes como base para redactar una specification y un testplan candidatos**, sin volver a abrir el brainstorming íntegro. No constituyen aún aprobación del diseño final ni autorizan escribir los nuevos documentos por este Relay.

**D-08 serie fechada + D-09 última valoración anterior con aviso son compatibles** con una lectura a fecha de corte y con E4.9, si se fijan estos invariantes explícitos en la propuesta documental:

1. Valoraciones con fecha de vigencia, origen y posibilidad de corrección auditada; conservar el histórico sin mutar hechos de compra/venta, y sin asociar artificialmente cada registro a un ciclo.
2. Para un corte T solo usar valoración fechada **<= T**; nunca una posterior. La última anterior puede servir como **valor conocido a fecha T**, mostrando fecha y antigüedad, **no como precio verificado exactamente el día T**.
3. Distinguir **visualización informativa**, **cobertura del agregado** (`Parcial n/m`, sin total completo si falta información) y **elegibilidad para Precierre/cierre**. Una valoración antigua, aun visible con aviso, no queda automáticamente certificada para un cierre; el umbral de antigüedad o criterio de suficiencia exige decisión explícita antes de integrar E4.9. No inventar umbral ni interpretar ausencia como cero.
4. La foto de E4.9, cuando su desarrollo se autorice, deberá reflejar el valor, la fecha/origen y la cobertura usados **en aquel corte**, de forma inmutable; una valoración posterior o su corrección no puede recalcular retrospectivamente la foto cerrada. E4.3 solo publica el contrato de lectura; E4.9 es dueño del gate/foto bajo autorización separada.
5. Respetar el resto de D-01…D-14: en abierta con valor manual, Resultado/Rentabilidad ND; cerrada con resultado neto verificado; no % sin fórmula; no doble comisión; sin efectivo de bróker en el agregado de inversión; instrumentos inactivos/heredados con cobertura; EUR final a céntimos, precio/cambio sin redondeos intermedios.

**Siguiente gate:** presentar al usuario el alcance concreto de redacción de specification/testplan y las decisiones residuales (en particular criterio de antigüedad y aptitud de cierre). Solicitar autorización documental explícita. Hasta entonces, **no crear o editar** estos documentos por este mensaje; #167 continúa como brainstorming.

## 3. E3.5 / PR #165

**Sin objeción a D2=O0.** El contraste presentado acredita que S0 manual obligatorio forma parte del contrato de Ciclos, y que el caso de falta de fuente se trata como ND, nunca como cero. Conserva `saldo_comida NOT NULL`; **sin migración de D2**. AC-12 sigue UNRUN, pendiente de prueba real.

D1=A′ y D3=O1 permanecen como decisiones conceptuales. D3 requiere **migración de constraint todavía no autorizada**, con evidencia real de cobro y separación `R_caja`/`R_obl`. D4 sigue siendo gate de E4.9. No promover AC ni confundir QA documental con validación funcional.

## 4. Retorno solicitado

Confirmar que el alcance de #166 es solamente documental y elevar al usuario la solicitud expresa de squash merge; comunicar qué decisiones residuales de SPEC23 deben resolverse antes del gate de E4.9 y propuesta acotada para autorizar la redacción documental; conservar #165 en STOP de DEV.

**Prohibido por este Relay:** merge de #165/#166/#167, commits o ediciones de especificaciones nuevas, DEV17/DEV18/E4.3, migraciones, datos reales, despliegue o declarar AC PASS.
