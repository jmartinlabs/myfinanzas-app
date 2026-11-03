# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 119
message_id: ca0514aa-3808-4de0-a013-6bca7f75f97f
from: OpenCode
to: Alex
reply_expected: false
read_by: none
created_at: 2026-11-03T18:35:33Z

## Message

# DEV21 VERDE Y PROPUESTA DE CAPACIDAD A/B/C (OpenCode → Alex)

## 1. DEV21 / #180

- HEAD `85ae61a`; `required` `41687200617` SUCCESS y `full` Linux `41687222419` SUCCESS, ambos sobre el mismo SHA. E2E/E1.6/restore cubiertos.
- PR fuera de draft, `MERGEABLE`/`CLEAN`; QA final **APTO CON RESERVAS**, sin defecto financiero material.
- R1/R2/R13/R15 corregidas; R14 declarada; R8/R9/R12 y R17/R18 residuales no bloqueantes. AC-31 BLOCKED.
- Merge pendiente de autorización del usuario por PR y SHA; no ejecutado.

## 2. Documentación pendiente del usuario

- #177 `138144c`; #178 `d4f91ec`; #179 `f14e9f8`. CI verde. Aprobación visual/ratificación y merge separados; DEV E4.3/E4.9/24 no autorizados.

## 3. Capacidad propuesta (read-only, sin PR ni specs nuevas)

### A — PRE-DEV E4.9/SPEC27 (prioridad alta)

- **Alcance:** paquete técnico de autorización futura: bloques, ownership de rutas/SQLite/DT5, estado de proveedores E3.5/E4.3/E4.8, QA de cierre/foto/locks/idempotencia/concurrencia, representación de E4.3 `No disponible`, evidencias DT6 pendientes.
- **Fuentes:** `specs/27-*`, `precierre.ts`, `app.ts`, `e35.ts`, inventario DT5, DT6. Solo lectura.
- **Beneficio:** desbloquea una autorización DEV E4.9 informada sin escribir código.
- **Coste/riesgo:** 1 agente functional, 1 sesión; riesgo bajo; no toca esquema v23/v24 ni #180.
- **Permiso:** autorizar exploración y paquete read-only; sin modificar specs/PR ni iniciar DEV.

### B — Inventario SPEC25/E4.7 (prioridad media)

- **Alcance:** fuentes y dependencias E2.4/E2.6/E3.6/E4.5/E4.6; propuesta de alcance documental; ejercicio natural vs ciclo; márgenes; sin motor nuevo ni totales sin cobertura.
- **Fuentes:** roadmap, `specs/10`, `12`, `21`, `24`, `25` (si existe), functional reference. Solo lectura.
- **Beneficio:** prepara decisión de si SPEC25 merece spec completa ahora.
- **Coste/riesgo:** 1 functional, 1 sesión; riesgo bajo; dependiente de E3.6/E4.6/E4.5.
- **Permiso:** autorizar inventario read-only; sin crear specs ni PR.

### C — DT7/E4.5 (solo si el usuario lo pide)

- **Alcance:** lista mínima de evidencia/decisiones para DT7/P6, sin mapping real ni equivalencia Excel.
- **Coste:** bajo; no bloquea A/B.
- **Permiso:** solo si hay interés explícito.

## 4. Paralelismo

- A y B pueden ejecutarse en paralelo con agentes separados y sin archivos compartidos.
- C no se abre salvo petición; evitar tres frentes documentales simultáneos sin decisión.
- No abrir DEV E4.3/E4.9/E4.7 en paralelo; no tocar v24, `precierre.ts` ni #180.
- Ningún agente publica PR ni modifica specs; los hallazgos vuelven al coordinador.

## 5. Decisión solicitada al usuario

Autorizar A y/o B (read-only) y, si procede, C. Sin DEV, merge, datos reales ni despliegue.
