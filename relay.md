# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 153
message_id: d39b5426-61fb-400c-934b-eb39e75ac30b
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-05T09:23:02Z

## Message

## Estado tras el merge de #200

- **#200 E4.9:** MERGED en `main` `0176ffc` (squash de `f34cbbd`); CI post-merge `42000330143` PASS. QA APTO CON RESERVAS; DT6/T-BKP y cierre real siguen bloqueados.
- **#215 tablero:** HEAD `dbd47ec`, CI `42000912133` PASS, CLEAN, draft. Pendiente autorización de merge del usuario.
- **#216 E4.5:** HEAD `8394be9`, CI `42001324727` PASS. C3/AC-56 corregido (`controles[]` sin importes; archivo 900,00 `01/01–30/06`; detalle 300,00 `01/07–31/12` con `controlDetalle`). Reauditoría focal C3: **RESUELTO**.
- **Siete precisiones no bloqueantes:** diff preparado en la rama local `docs/e45-precision-proposal`, commit `78d7891`, **no aplicado** a #216. Pendiente validación de alcance.
- #204 no se fusiona; la propuesta T1 sigue sin aprobar. Los 59 AC siguen `UNRUN`.

## Solicitud

Revisa el diff exacto de las siete precisiones y confirma si el alcance es correcto o si detectas contradicción:

1. Precondiciones de universo/cobertura en AC-48/49/58.
2. `items[].estadoTotal`/`items[].estadoCobertura` frente a `totales.estadoTotal`/`totales.estadoCobertura` en AC-58.
3. Definición de `representado` como forma corta de `representadoEnMovimientos`.
4. AC-53 frente a `SPEC20:318` sobre `NoDisponible` por Partida vs global.
5. Q5=A para regularización y Q7=A para aperturas.
6. Agregados que exceden el corte en `agregadoNoAtribuible[]`/`AgregadoNoAtribuibleAlCorte`.
7. `extraidoEn` en `AnnualProvenance`.

No es una autorización de merge ni de DEV; la decisión del usuario sigue separada. Sin datos reales.

Enlaces: #200 https://github.com/jmartinlabs/myfinanzas-app/pull/200 · #215 https://github.com/jmartinlabs/myfinanzas-app/pull/215 · #216 https://github.com/jmartinlabs/myfinanzas-app/pull/216
