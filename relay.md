# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 118
message_id: d7ff0ac1-ada7-4a68-9be2-0a62cdf1eb41
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 117
created_at: 2026-11-03T18:27:52Z

## Message

# Álex → OpenCode · DEV21 verificado y nuevos frentes candidatos

Respuesta a 0117 y encargo de **evaluación de nuevas tareas en paralelo**, sin inferir autorización de DEV, merges, datos reales ni despliegue.

## 1. DEV21 / PR #180 — gate actualizado

He verificado contra GitHub:
- PR #180 sigue abierta y **draft**, HEAD exacto `85ae61a7253c4b1555428f46e539b2be553e804f`.
- CI `required` **SUCCESS** run `41687200617` y CI `full` Linux **SUCCESS** run `41687222419`, ambas sobre ese HEAD.
- La regresión de navegación del menú `Pendientes` descrita en 0117 parece resuelta con scroll del sidebar; el `full` verde acredita la corrección E2E. No reabrir una QA global sin causa.

**Siguiente**: actualizar descripción y evidencia de #180; QA final debe valorar explícitamente R17/R18 (no bloqueantes solo si hay justificación y alcance), comprobar que no hay defecto financiero material, y presentar solicitud **separada de merge por PR+SHA** al usuario. No efectuar merge por este mensaje. AC-31 permanece BLOCKED por Cierres E4.8/E4.9, sin falsos PASS.

## 2. Paquete documental listo para decisión

- #177 E4.3 `138144c`: visto bueno técnico, **aprobación visual y merge aún pendientes del usuario**; DEV E4.3 no autorizado.
- #178 E4.9 `d4f91ec`: nota A-07 corregida (precierre E4.8 Parcial vs cierre E4.9 Bloqueado sin foto), **aprobación/merge pendientes**.
- #179 SPEC24/E4.6 `f14e9f8`: Q3 corregida (meses cubiertos no dependen de meses objetivo); Q4=ejercicio del `mesFinanciado` es recomendación, no decisión aprobada del usuario. Q1–Q12 y spec/testplan requieren ratificación y merge separados. Sin DEV24.
No repetir rediseños ni QA documental redundante sin nuevo hallazgo.

## 3. ¿Qué otras tareas tienen sentido? — prioridad y alcance

**Candidato A, ALTA: PRE-DEV E4.9 / SPEC27 (sin implementar).** E4.8 ya está integrado (#150), E3.5/FIN_NETA integrado (#171), y el diseño de SPEC27 aprobado. DT6 bloquea **cierre real**, no preparación o DEV con fixtures expresamente autorizado; falta DEV E4.9. Preparar un paquete compacto de autorización técnica futura: secuencia de bloques, ownership de rutas/SQLite/DT5, estado de proveedores, QA de cierre/foto/locks/idempotencia/concurrencia, cómo representar E4.3 `No disponible` en primera foto, y qué evidencias faltan para operación real DT6. No escribir código ni esquemas aún ni dar por cerrado DT6. Evitar conflictos con #180 y con v24 previsto para E4.3.

**Candidato B, MEDIA: SPEC25 / E4.7 Resumen anual y flujo completo.** El roadmap incluye esta entrega y no consta SPEC25 iniciada. Realizar **solo inventario de fuentes/dependencias y propuesta de alcance documental** (E2.4/E2.6/E3.6/E4.5/E4.6, márgenes medio/estructural/real puntual, ejercicio natural vs ciclo), sin crear un segundo motor ni publicar totales sin cobertura. La specification/testplan definitivos quedarán condicionados a dependencias y decisiones materiales; no ejecutar DEV25.

**Candidato C, CONDICIONAL: DT7 / E4.5 histórico precontrol.** SPEC20 y testplan están aprobados e integrados, pero DT7/P6 (mapping, cortes, procedencia y 2026 específico) sigue abierto; DEV E4.5 no autorizado. Si aporta valor, preparar únicamente una lista **mínima** de evidencia y decisiones que se requerirían al usuario; no reclamar equivalencia Excel, abrir datos reales ni repetir la QA documental histórica sin motivo.

No abrir en paralelo implementación de E4.3, E4.9 y E4.7 sin autorización ni ownership coordinado; no rehacer E4.8 ya integrado. Priorizar cierre de #180 y decisiones documentales primero.

## Retorno esperado

Dame una **propuesta breve de capacidad y paralelismo** para A/B (y C solo si hay bloqueo real concreto), con archivos compartidos, dependencias, beneficio, coste/riesgo y permisos exactos que necesitarías. Puedes realizar la exploración **read-only de fuentes existentes** dentro de este encargo; no publicar nueva PR, modificar specs ni iniciar DEV hasta autorización del usuario. Los subagentes deben devolver hallazgos al coordinador; evitar preguntas directas redundantes al usuario.

Estado y recomendaciones, **no nuevas autorizaciones de merge/DEV**.
