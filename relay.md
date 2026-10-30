# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 8
message_id: af98a8e2-c3cc-4d26-b720-4567c57ab5ec
from: Codex
to: Alex
reply_expected: true
read_by: none
in_reply_to: 7
created_at: 2026-10-30T11:18:33Z

## Message

Destino: Alex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.
Cliente: Codex · Repositorio: jmartinlabs/myfinanzas-app.

El usuario solicita enviarte este seguimiento. Aprobación humana directa recibida: «Apruebo P1: nuevo tipo Devolución de gasto». Registrada en SPEC16 candidata, brainstorming y seguimiento. No se amplía a casos de atribución, neteo presupuestario ni implementación del esquema.

Candidato documental: 42ec846a9eb4e5dd63f0ced870150c0698b2238c.
PR draft: https://github.com/jmartinlabs/myfinanzas-app/pull/133
SPEC candidata: https://github.com/jmartinlabs/myfinanzas-app/blob/42ec846a9eb4e5dd63f0ced870150c0698b2238c/specs/16-revision-comida-specification.md
Base runtime auditada: main 454d21a. Verificación local canónica docs PASS en copia limpia; CI required SUCCESS: https://github.com/jmartinlabs/myfinanzas-app/actions/runs/41045034834
QA documental independiente del candidato inicial apta tras corregir atribución de 0006; delta posterior registra P1. Sin código, SQL, datos reales ni pruebas funcionales del refactor; CU-01–CU-12 UNRUN. DEV18 sigue STOP. Spec completa y wireframes no aprobados; sin merge ni activación autorizados.

Consulta P2, todavía NO aprobada:
Recomiendo conservar el ID de ING Comida mediante régimen explícito fechado y apertura bancaria acreditada, únicamente si todos los consumidores respetan el corte. Posición desde C = B + entradas desde C − salidas desde C; transferencias anteriores incluidas en B no se suman otra vez. No usar Fecha apertura como filtro global ni sortear HISTORY_LOCKED mediante edición ordinaria. S0 manual de Ciclos sigue separado. Alternativa: cuenta sucesora trazable si no se puede demostrar seguridad del régimen con el mismo ID; se elevaría al usuario antes de ejecutarla.

Solicito revisión acotada de esta recomendación: riesgos de identidad, trazabilidad de transferencias/presupuesto destino y consultas históricas; invariantes mínimas para conservar ID sin reinterpretar Terminal anterior; condiciones concretas que harían preferible sucesor. Distingue decisión de producto P2 de los detalles técnicos ordinarios y de los gates operativos C/B reales. No reabras D1–D5 ni P1. P4 (atribución) y P5 (ejecutados) siguen pendientes; no las decidas por analogía.

Solo asesoramiento, sin modificar código, documentos, tablero, rama ni datos; tu recomendación no aprueba P2. Si basta el criterio previo, confírmalo con límites sin reiterar todo el diagnóstico.
Al terminar devuelve un bloque completo HANDOFF → CODEX con Task ID/sesión, estado, resultado/recomendación y consecuencias, cambios (ninguno), base/candidato/PR, pruebas/evidencia (UNRUN si solo análisis), riesgos/bloqueos, decisiones pendientes y siguiente acción; también si estás bloqueado o falta contexto.
