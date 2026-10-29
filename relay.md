# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 26
message_id: 81c10ffd-1f97-4ec4-baac-9e954d685efd
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-10-29T12:55:33.810Z

## Message

# MyFinanzas · encargo integral para acelerar la auditoría (25 SPEC)

**Para:** OpenCode, coordinador
**De:** Álex, auditor
**Origen:** encargo explícito del usuario para avanzar más rápido y entregar más trabajo por intervención.
**Alcance autorizado en esta fase:** análisis, inspección, contrastes de solo lectura, coordinación y preparación de un paquete de ejecución. **Ninguna autorización para editar ficheros, crear PR, fusionar, desplegar o reanudar trabajos detenidos.**

Quiero que sustituyamos la secuencia de microencargos por **una entrega consolidada y sustancial**, sin pedir permiso por cada paso de inspección ni devolver únicamente otro plan de investigación.

## Trabajo a completar en este encargo

1. **Verificar el estado real vigente:** `main`, `audit/spec04-25`, `specs/investigations/spec-audit-tracker.md`, `specs/epic-board.md`, PR abiertas y gates relevantes. Partir de GitHub y evidencia actual, no de checkpoints históricos que hayan quedado superados. Bases conocidas al iniciar: `main` `2c97a66` (PR #128 integrada); `audit/spec04-25` `147008f` (registro SPEC07 actualizado); revalidarlas al leer.
2. **Clasificar las 25 SPEC sin falsos cierres:** cerradas formalmente; correcciones integradas con SPEC todavía abierta; discrepancias exclusivamente documentales; pendientes de aceptación/validación; DEV futuros no autorizados; bloqueos reales de integración, seguridad o despliegue. Identificar dependencias, evidencia, prioridad y responsable de cada decisión. Conservar la distinción entre especificación aprobada, implementación, CI, QA y aceptación global.
3. **Consolidar hallazgos históricos frente al estado vigente:** separar resueltos, mitigados, abiertos, provisionales y descartados; evitar duplicados y repetir auditorías concluidas. SPEC01–03 cerradas; SPEC04 #125 y SPEC07 #128 integradas, pero ambas abiertas en alcance global. No confundir dos E2E focales PASS reportadas con E2E global PASS.
4. **Preparar el lote documental completo:** identificar archivos, frases/entradas desactualizadas, corrección concreta, dependencias y riesgos de cada cambio. Preservar historia y decisiones anteriores; no proponer limpieza indiscriminada.
5. **Diseñar reconciliación segura** de `audit/spec04-25` con `main`: determinar divergencias y los pasos mínimos para integrar solo el resultado vigente sin sobrescribir cambios ajenos ni traer contenido histórico accidental. Determinar si conviene una nueva rama/PR focal en vez de merge de rama larga.
6. **Priorizar el siguiente trabajo funcional y sus gates:** contrastar con la realidad de SPEC32/PR #30 (compatibilidad de esquema/rollback/rootless), SPEC16 AC25 (equivalencia física con Excel), E3.5 (conciliación/FIN_NETA), E4.2/inversión y SPEC26/27 (posiciones a Fin y backup externo). Separar bloqueos y secuencias: no iniciar DEV sobre contratos no autorizados.
7. **Entregar una propuesta ejecutable de lotes:** para cada lote, objetivo, ficheros afectados, contratos a preservar, verificaciones exigibles, dependencias, trabajo paralelizable, estimación cualitativa de riesgo y una **única aprobación de alcance** requerida. Ordenar por impacto financiero/riesgo y esfuerzo; indicar claramente cuál ejecutar primero y por qué.

## Modo de ejecución

- Avanza por tu cuenta por todas estas comprobaciones **de solo lectura**. Consulta fuentes, contrasta SHAs/PR/CI y delega análisis read-only a agentes independientes en paralelo cuando aporte rendimiento. Coordina sus resultados sin inflar el contexto ni duplicar investigaciones.
- Resuelve detalles técnicos menores que no exijan decisión funcional. Evita turnos intermedios de mera solicitud de planificación o de permiso para inspeccionar.
- Conserva la separación `main` / rama de auditoría / documentación / desarrollo / despliegue; no supongas que una PR abierta está activa o autorizada. Mantén los límites de MyFinanzas: fuente única, compatibilidad con Excel real y reglas de Criterios; no homologar equivalencia física mediante fixtures.
- **No modificar ningún documento, código, tracker, fichero o rama; no crear PR, no fusionar, no desplegar y no reanudar ejecutores detenidos** con este encargo. Si necesitas autorización para realizar cambios, reúnelos en una propuesta de alcance conjunta que pueda aprobarse de una sola vez.
- **Entrega esperada en tu próxima respuesta:** informe consolidado con clasificación de las 25 SPEC, inventario corto de cambios documentales, estrategia de reconciliación y 2–4 lotes priorizados; incluye una recomendación clara sobre el primer lote a aprobar. No responder únicamente con un plan para hacer el análisis después.

**Estado de autorizaciones nuevas:** solo investigación y preparación de la propuesta; la aprobación de las futuras escrituras, PR y merges seguirá correspondiendo al usuario. **No confundas este relay con aprobación técnica o autorización de merge.**
