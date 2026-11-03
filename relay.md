# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 110
message_id: f85fff07-8e05-4111-a6b5-476484f8b692
from: OpenCode
to: Alex
reply_expected: false
read_by: none
created_at: 2026-11-03T13:12:12Z

## Message

# RETORNO Y HANDOFF — respuesta a 0109

## Tarea y estado

Preparación de la siguiente fase: DEV17/E4.4 listo para autorizar; SPEC23/E4.3 con candidata documental en QA; E4.9 solo análisis. Ninguna aprobación del usuario se infiere de este mensaje. Sin DEV, DDL, datos reales, despliegue ni merge.

## SHA / PR / pruebas

- `main` `5d903f4`; PR #173 y #174 fusionadas y verificadas.
- SPEC23 candidata local **`4eeed13`** en `docs/spec23-approval-prep`, sin publicar; QA documental independiente en curso. Sin PR todavía.
- Sin cambios de código ni de esquema.

## DEV17/E4.4 — paquete ajustado a tu criterio

- **Límites:** TIN/TAE 6 decimales exactos, signo conservado, cota técnica ±(`2⁵³−1`) a escala 1e6; sin máximo financiero ≤100 y documentando que no valida plausibilidad económica. Textos: `condiciones` 1.000, `fuente` 200, `nota` 1.000. `cuotaContractual` ≥ 0; `precontrolEjercicio` 1–9999; `null ≠ 0`.
- **Esquema:** E4.4 = v23 → E4.3 = v24 → E4.9 = v25, condicionado a integrar y verificar cada migración; sin reservar DDL antes de autorización y rechequeo de `main`/versión al iniciar.
- **Ownership:** un solo dueño de `database-schema.ts`, `schema-contract*`, `backup.ts` y `app.ts` por ventana. DEV17 posee `deudas.ts` (sin `getDebt`/`debtPeriod`) y `Deudas.tsx`; E4.3 puede avanzar documentalmente, no escribir esquema/rutas a la vez.
- **QA:** QA-1 tras A (migración/contrato/read model) y QA-2 final tras C; B se cubre en la final. Sin revisiones extra salvo cambio material.
- **Autorizaciones separadas:** (a) alcance A/B/C; (b) límites; (c) reserva v23/v24; (d) C23 y fixtures sin datos reales.

## SPEC23/E4.3 — candidata y decisiones

Errata aplicada en `4eeed13`: base v22, restos DT2 eliminados, A-02 alineada, sumas con `fecha <= T`, DTO con `id`/`revision`, cobertura de resultado `m_r`/`n_r` y rectificación con salvaguardas (unicidad en fecha destino, no futura, cantidad/revisión en ambas fechas, recálculo de Automática, commit transaccional, sin reescribir fotos cerradas).

Quedan tres confirmaciones del usuario, planteadas juntas: ratificar A-02/A-03; cobertura de resultado `m_r` (abiertas + cerradas); rectificabilidad de `fecha_vigencia` con esas salvaguardas. **DEV E4.3 no autorizado.**

## E4.9 — mapa de dependencias, sin DEV

- Gates: wireframes 1440/390 o exclusión explícita de UI; contrato de cierre/foto y migración/backup; D4 con consumo real de E3.5 y bloqueo fail-closed (sin foto parcial ni Comida=0); idempotencia, ventana/S0 y conservación del snapshot.
- E4.3 `No disponible` permitido; E3.5 no verificable bloquea y no permite foto parcial.
- DT6 no impide tests sintéticos; sí cierre real/AC-09 hasta custodia y restauración probadas.
- v25 solo condicional, no comprometida.

## Bloqueos y próximas decisiones

1. Cuatro autorizaciones DEV17 (a–d).
2. Tres confirmaciones SPEC23; después publicar `4eeed13`+QA, dar SHA final y texto de aprobación de spec/testplan.
3. Ninguna autorización de DEV E4.3/E4.9, merge, datos reales ni despliegue.

No amplío alcance ni inicio agentes de cambio desde este dictamen. Conservo el trabajo independiente ya autorizado.
