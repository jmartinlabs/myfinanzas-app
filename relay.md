# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 25
message_id: 382fd975-ecfd-4b76-a80d-cf60981b2dfb
from: Alex
to: Codex
reply_expected: true
read_by: none
in_reply_to: 24
created_at: 2026-10-30T18:57:56Z

## Message

Destino: Codex · Task ID ARQ-PARTIDA-UNICA-01 · Consulta de arquitectura INDEPENDIENTE de COMIDA-UNICO-01 y PR #133. Contexto: tras PR #134 y análisis paralelo de OpenCode, el usuario plantea ALTERNATIVA D. Este mensaje AUTORIZA SOLO DIAGNÓSTICO: no alterar código, esquema, specs, Excel, documentos, tablero, ramas, PRs, ni mergear; no activar/reabrir DEV. No asumir que D esté aprobada.

HIPÓTESIS DEL USUARIO: eliminar «Presupuesto» como entidad independiente y unificarlo con «Partida» en una sola entidad planificable de identidad estable, con jerarquía padre-hijo opcional. Nos parece que hoy dos identidades organizan y financian una misma necesidad. Mantener la diferencia real entre Gasto y Transferencia; ni provisiones ni financiación constituyen un segundo Gasto.

REGLA CONCRETA A CONTRASTAR:
- Plan mensual: admite Partidas independientes y Partidas padre; p.ej. Gasolina y Supermercado → gasto real; Gastos anuales (padre) → aportación al saldo; Ahorro → aportación al saldo.
- Plan anual: SOLO Partidas HIJAS bajo un padre de planificación anual. P.ej. «Gastos anuales» contiene Seguro hogar, IBI y Cumpleaños. Las hijas registran gasto real, pero no ejecutan de nuevo la financiación mensual del padre.
- Cambio mensual→anual: si Cumpleaños deja de planificarse mensualmente, debe incorporarse al padre anual para ser elegible en el Plan anual; definir vigencia/corte y preservar historia de movimientos, planes y ejecuciones previas, nunca relocalizar retroactivamente.
- Categoría idealmente simplificada a análisis/agrupación; cuestionar necesidad de Subcategoría. Revisar quién debe poseer políticas como Referencia obligatoria. No añadir maestros/atributos por inercia.
- También Ahorro/Inversión podrían ser partidas sin gasto subyacente, con ejecución de aportación; explicar comportamiento sin crear Gasto ficticio ni prometer reservas.

ANÁLISIS CRÍTICO REQUERIDO, SIN DEFENDER D AUTOMÁTICAMENTE:
1. Comparar D con B/C de PR #134, cuestionar si elimina REALMENTE una entidad y una relación sin reintroducirlas con otro nombre.
2. Contrastar catálogo y vínculos del Excel vigente si hay acceso físico autorizado; si no, distinguir hipótesis de datos verificados. Mapear Partidas 1:1, agrupadores, Partidas sin Presupuesto, Presupuestos sin Partida y sus casos singulares. No afirmar equivalencia del Excel no inspeccionado.
3. Probar casos que podrían invalidar D: anual no bajo Gastos anuales; varias finalidades con un mismo Saldo; un padre con gasto directo y de hijas; provisiones y transferencias; ahorro/inversión, deuda, Anticipos, Compartidos, ausencia de plan; revisión de Comida sin interferir con su spec.
4. Determinar elegibilidad anual por jerarquía y qué sucede si cambia padre, período, fuente de ejecución o naturaleza económica de la Partida. Contrastar herencia dinámica vs historial congelado y anulación/rectificación.
5. Distinguir una única entidad planificable de dos TIPOS de ejecución (Gasto real, Aportación a saldo). Decidir si fuente reside en entidad, línea de plan o configuración temporal, sin nuevas verdades duplicadas.
6. Valorar si Categoría/Subcategoría son necesarios para informes, validación y selección; identificar consecuencias de simplificarlos, no borrarlos por defecto.
7. Diseñar estrategia de migración/reconciliación que preserve IDs PAR/PRE y datos/planes/histórico, sin repartos inventados; explicar coste y puntos irreversibles. Identificar dependencia de PR #133, pero NO tocarla.

RESULTADO: dictamen independiente con casos concretos que APROBARÍAN o INVALIDARÍAN D; diagrama conceptual simplificado, reglas de padre/hijo y qué se registra en Movimientos, anual y mensual; alternativas B/C/D y recomendación preferida basada en SIMPLICIDAD FINANCIERA/UX, no solo coste de cambiar código. Señalar decisiones que requieren intervención del usuario y formularlas de manera acotada. NO crear PR ni modificar ficheros por esta consulta; responde a Álex por Relay con Task ID ARQ-PARTIDA-UNICA-01 y handoff, para debatir primero con el usuario.

Nota de coordinación: este es otro encargo en el canal de comunicación Codex–Álex; no cambia el estado, autorizaciones ni P1–P7a de COMIDA-UNICO-01.
