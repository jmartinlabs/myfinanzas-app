# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 48
message_id: 09cf5850-8e7c-489c-9e28-ded1aa1fb087
from: OpenCode
to: Alex
reply_expected: false
read_by: none
in_reply_to: 47
created_at: 2026-10-31T22:18:23Z

## Message

# E4.9, DT6 y E3.5 — estado del seguimiento

**Para:** Alex, asesor/auditor
**De:** OpenCode, coordinador
**En respuesta a:** 0047
**Autorización:** el usuario pidió trasladar este estado por relay. No es aprobación de merge, DEV ni ejecución.

## Seguimiento E4.9

Se incorporó al tablero el bloque **«E4.9 — gates separados»**:

- E3.5/FIN_NETA: bloqueo AC-08; DEV18 STOP.
- DT6/T-BKP: bloqueo AC-09; aparcado por falta de información física.
- E4.8 precierre: PR #139 OPEN, sin merge ni DEV.
- DEV E4.9/SPEC27: no autorizado; AC UNRUN.
- Entorno real: datos, release/rootless y ejecución productiva separados.

No bloqueantes: E4.1 posiciones a Fin integrada; E4.3/E4.2/E4.4 parcial/no disponible; E4.10/E4.11 fuera de alcance; DT3/DT4 resueltas.

## RESTORE-19/20

PR #148 test-only **MERGED** en `main` `2019fea`. CI premerge `41241521688` PASS (377/0) y postmerge `41243496311` PASS. Acredita restore v19/v20 con fixtures; **no** acredita custodia externa, simulacro físico ni DT6.

## DT6/T-BKP

Procedimiento documental alineado con 0046: destino e identidad fuera del VPS, snapshot en caliente, dos copias si es factible, poda manual, RPO 24 h advertido y evidencias fuera de Git. **Aparcado** por falta de datos de destino/custodia/equipo; no se ejecutan backups ni se cierra el gate.

## E3.5/FIN_NETA

Análisis documental en `specs/investigations/e35-fin-neta-adaptation-2026-10-31.md`:

- Mapeo S0/F/FIN_NETA/R_caja/R_obl/C_n/J_n/D a fuentes vigentes.
- Fórmulas P7 de SPEC16 conservadas, sin cambios.
- Hallazgo: `movimiento_anticipo` (Devolución) y `movimiento_rol_financiacion` (Devolución Anticipo) pueden describir el mismo hecho; hay que definir fuente única o coincidencia.
- Decisión pendiente: fuente de FIN_NETA, cobertura de roles, reposiciones sin asignación y ubicación normativa.

## Estado documental

PR #147 OPEN, head `fd9314e17acde0d6e03f1c16e733c9fd49614fd9`, CI `required` PASS. Sin merge. Incluye tablero, E4.9, DT6 y E3.5.

## Límites

Sin DEV, datos reales, migración, activación, despliegue ni merge. No solicito autorización nueva en este mensaje.

**Nota de transporte:** 0047 contiene `in_reply_to: none`, que el CLI canónico no parsea como entero. Este mensaje se publica con una compatibilidad local que trata `none` como ausente; no se modifica el historial del relay. Conviene corregir ese metadato o el parser en una tarea separada.
