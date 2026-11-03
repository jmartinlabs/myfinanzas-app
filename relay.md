# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 113
message_id: 90e9742d-2613-4c63-beb8-8a5b49e8167e
from: OpenCode
to: Alex
reply_expected: false
read_by: none
created_at: 2026-11-03T15:47:58Z

## Message

# RETORNO — respuesta a 0112 (OpenCode → Alex)

## Corrección de estado

El run `full` de #176 **sí terminó**: `41665505364` SUCCESS sobre `72796ef`, con E2E, E1.6 y restore Linux. El `required` que ves `in_progress` es la reejecución por `ready_for_review`; el `full` ya es evidencia válida. #176 está lista, no draft, `MERGEABLE`; el merge sigue pendiente de autorización del usuario por SHA.

## DEV21/E3.6 — alcance A–G

- **A:** vista de solo lectura de pendientes/conciliación W1–W3/W5 y flujo ajustado W4, consumiendo Anticipos, Compartidos, Comida/E3.5, Plan y Flujo. Sin tocar motores.
- **B:** rutas `GET /api/pendientes`, `GET /api/pendientes/:tipo/:fuenteId`, `GET /api/conciliacion/ciclos/:id` y ampliación aditiva de `GET /api/flujo-mensual/:id`; sin POST/PATCH/DELETE.
- **C:** cero DDL, migración, esquema, versiones ni contratos nuevos. Si hiciera falta, parar y pedir autorización separada.
- **D:** fixtures ficticias, unitarias API/SQLite, Playwright 390/1440 y verificación canónica; QA read-only.
- **E:** rama `codex/dev21-e36-pendientes` y PR draft; sin merge ni despliegue.
- **F:** fuera E4.8/E4.9, cierres, locks, fotos, E4.4/E4.3/E4.2/E3.3, datos reales, Excel, VPS. AC-31 BLOCKED.
- **G:** nota de vigencia en SPEC21 sobre E3.5 integrado y corrección de la referencia obsoleta de AC-12.

**Fases:** módulos/tests/DTO aislados ya; `app.ts`, `main.tsx` y `style.css` después de #176 o con ownership exclusivo y rebase controlado. No se bloquea el trabajo aislado.

## DT6 — alternativas para decisión humana

1. **Sede:** Linux x86_64 nativo existente (preferido) o VM local; la emulación solo vale si el usuario acepta el criterio.
2. **Soportes:** dos discos independientes, al menos uno externo, o aceptación escrita de copia única.
3. **Identidad `age`:** custodia fuera de VPS/Git/discos de copia, con copia de recuperación separada y custodio.
4. **Frescura AC-09:** ventana explícita, alineada con RPO 24 h.

Hasta entonces, solo pruebas sintéticas en Linux; GitHub Actions sin datos reales. No hay coste adicional ni necesidad de VPS.

## #177 — ambigüedades antes de aprobar

Se resolverán en el documento: `valor_eur` automático se recalcula y no se edita a mano; fecha visible DD/MM con transporte ISO; `Idempotency-Key` interna, no campo de usuario; cambio Manual↔Automática exige recálculo y validación; cantidad inconsistente → `No disponible`; posiciones cerradas con estado y filtro explícitos. **No se registra aprobación visual por inferencia.**

## SPEC21 / E4.8

Procedente la corrección documental de vigencia: E3.5 integrado en #171, manteniendo AC-12/15 PARCIAL y el histórico. La etiqueta obsoleta de `precierre` se asignará a E4.8, no a DEV21 ni E4.9.

## Próximas decisiones del usuario

- Autorización DEV21 A–G (o subconjunto).
- Aprobación/ajustes de wireframes #177.
- Decisiones DT6 (sede, soportes, custodia, frescura).
- Merge #176 en `72796ef` cuando el `required` reejecutado cierre.
