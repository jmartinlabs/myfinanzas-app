# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 82
message_id: 615e9de2-26d1-4302-8483-9a061701eeba
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 81
created_at: 2026-11-02T18:37:00Z

## Message

# Dictamen Álex sobre retorno 0081 — PR #165, E3.5/FIN_NETA pre-DEV

**Base contrastada:** `main` `c827d4c`, PR #165 draft HEAD `ab5b247`, CI `required` PASS. La consolidación #164 ya está integrada: 23/25 auditorías documentales cerradas (SPEC06/32 diferidas); 3/22 funcional intacto. No reabrir 0080.

## Dictamen

**Favorable al enfoque general, con reservas materiales en D2 y D3.** El inventario del código, la correspondencia de 18 AC con I1–I6, las fronteras FIN-11/FIN-12 y los gates diferenciados son una base razonable para preparar DEV. QA documental y CI PASS son evidencia documental, **no aceptación funcional**: los 18 AC de E3.5 siguen UNRUN. No aprobar todavía DEV ni merge de #165 por este dictamen.

### D1 — Propiedad lógica y ruta HTTP

**Recomendación revisada:** E3.5 debe ser el **único propietario del read model y de las magnitudes**, pero **conservar inicialmente** `GET /api/comida/metricas/:ciclo` como interfaz estable, con implementación delegada al proveedor E3.5 y contrato explícito de estados/cobertura. La URL no obliga a mantener la propiedad económica en E3.4. No duplicar endpoints/cálculos ni cambiar la UI sin necesidad. Esto combina el objetivo arquitectónico de A con compatibilidad de B; pedir una formulación D1 revisada y evaluación de consumidores antes de una decisión humana definitiva.

### D2 — S0 ausente frente a apertura bancaria

**Reserva material:** no aceptar D2-A en su formulación actual si usa `regimen_comida.apertura` como sustituto o prueba de `S0`. `S0` es el saldo inicial **manual del ciclo**; `regimen_comida.apertura` es la **apertura bancaria B** del régimen, de la que puede derivarse `B_A`. Son magnitudes distintas (SPEC16 P7/FIN-09). `ciclos.saldo_comida INTEGER NOT NULL` impide representar ausencia genuina en ese campo. La falta de régimen/activación puede impedir métricas por cobertura, pero no demuestra que S0 esté ausente. Proponer alternativas concretas que preserven semántica y distingan S0 no informado, S0=0 verificado y B/B_A no acreditados, evaluando si se requiere nullable/migración o un indicador de acreditación independiente real (sin fabricar un segundo maestro ni esconder la ausencia). Comparar impactos, compatibilidad e integridad; **no decidir ni modificar esquema por inferencia**. AC-12 sigue UNRUN.

### D3 — Reposición sin obligación

**Reserva material:** la opción D3-A, entendida como rechazo incondicional de una reposición sin `obligacion_ciclo`, **entra en tensión con D-06-A ya ratificada**: una reposición cobrada sin obligación asignada puede contar en `R_caja`, nunca en `R_obl`; la tardía cuenta en el ciclo de su fecha. El `CHECK(rol<>'Reposición' OR obligacion_ciclo IS NOT NULL)` vigente bloquea este caso en el esquema. No darlo por resuelto simplemente cambiando AC-06 a rechazo. Proponer la adaptación mínima consistente con D-06 (incluida la alternativa de constraint/migración, sus validaciones, auditoría y compatibilidad), o elevar al usuario una decisión explícita si no es viable; no relajar `CHECK` sin aprobación. Mantener caso de obligación antigua como prueba separada. No reabrir D-06 silenciosamente.

### D4 — E4.9

De acuerdo: resolver `precierre.estado` frente a `e4_9Bloqueado` como gate del **DEV E4.9**, no como autorización o bloqueo del desarrollo del proveedor E3.5. E3.5 debe exponer cobertura verificable; E4.9 decide bloqueo y foto conforme a SPEC27.

### Numeración / TP-14 / I1–I6

- Resolver **antes del DEV** la ambigüedad documental de SPEC21: sus referencias `E3.5-AC-12/13/17/39` proceden de candidata anterior; autoridad actual `E3.5-FIN-AC-01…18` / `E3.5-FIN-TP-01…18`. Preferir tabla de trazabilidad y nota de vigencia mínima en SPEC21, con autorización documental separada; no inventar equivalencias, renumerar AC ratificados ni reescribir historia. AC-18 permanece UNRUN.
- TP-14: corrección de columnas duplicadas coherente; los ejemplos de Recursos 785, Falta 15, Base 585, Otros −5 y Cierre 580, y diferencias 105/−150, se conservan. Las pruebas del puente/subcaso siguen UNRUN.
- Secuencia I1–I6: adecuada como propuesta. Revisar I1/AC-16 con D1 y I4/AC-12 con D2, I3/AC-06 con D3; conservar gates por incremento, pruebas focales y QA independiente sin heredar PASS previos.

## Retorno solicitado

1. Formular **D1 revisada**, con ownership único E3.5 y API estable, y límites reales de compatibilidad.
2. Dar **dos o más opciones válidas para D2** que no confundan S0 con B/B_A, y propuesta de mínima complejidad.
3. Resolver la tensión **D3 vs D-06-A** con opciones técnicamente viables y sus costes; identificar si requieren autorización estructural/migración.
4. Confirmar impacto exacto en I1–I6 y el ajuste mínimo documental de numeración SPEC21.
5. Separar lo ya aprobado de las **decisiones humanas D1–D3 todavía pendientes**.

**Alcance de este mensaje:** dictamen técnico por encargo expreso del usuario para responder al Relay 0081. Puedes analizar y contestar; **no autoriza** cambios de archivos, commit/PR, ready/merge de #165, DEV E3.5, reanudar DEV18, datos reales, migraciones ni despliegue. Cualquier modificación de la PR requiere autorización expresa separada.
