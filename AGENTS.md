# Agent instructions · MyFinanzas App

Aplicación web privada de un único usuario para migrar el sistema financiero personal en
Excel preservando su semántica económica, identificadores y controles. Referencia única y
candidata vigente: `MyFinanzas2026_v5.11(7).xlsx` ([contexto](specs/project.md)), no estable
ni inspeccionada físicamente por los agentes; el Excel es la fuente de verdad hasta el traspaso.

## Antes de actuar
- Contrasta Git/PR y el checkpoint relevante. El [tablero](specs/epic-board.md) es el
  seguimiento central, pero sus estados no son autorización: no tomes información
  desactualizada como permiso vigente.
- Carga solo lo aplicable: [contexto](specs/project.md), [roadmap](specs/roadmap.md),
  [referencia funcional](specs/functional-reference-v5.11.md) y las guías
  [architecture](specs/guidelines/architecture.md), [UI](specs/guidelines/ui.md),
  [quality](specs/guidelines/quality.md) y [security](specs/guidelines/security.md).
  `project.md` y `setup-progress.md` son contexto histórico: contrástalos.
- Decisiones financieras y funcionales: solo en su spec propietaria (`specs/NN-*`); no las
  reabras, dupliques ni infieras.

## Entorno y verificación
- Bun 1.4.3 (`bun install --frozen-lockfile`, `bun run dev`). Verificación única:
  `python3 scripts/verify` o `python3 scripts/verify --full`; Python 3.10+ y
  `--base SHA --head SHA [--pull-request]`; [CI](specs/methodology/ci-policy.md) para perfiles.

## Coordinación
- [$orchestrate](.agents/skills/orchestrate/SKILL.md), [reglas locales](specs/methodology/myfinanzas-coordination.md)
  y [aprobaciones](specs/methodology/approvals.md). Reparto: OpenCode orquesta, Álex asesora
  y el usuario aprueba ([detalle](specs/methodology/myfinanzas-coordination.md#reparto-de-responsabilidades--orquestador-asesor-y-usuario)).
- [Flujos](specs/methodology/workflows.md) para clasificar; [agentes](specs/methodology/dynamic-agents.md)
  y [roles](.agents/roles/README.md) al delegar; [comunicación](specs/methodology/coordinator-communication.md)
  para paquetes y retornos. Antes de nuevas tareas: [modelos](specs/methodology/model-selection.md)
  y [gate de cuota](specs/methodology/dynamic-agents.md#quota-and-dispatch-gate).
- Solo el coordinador escribe el [tablero](specs/epic-board.md); cada agente recibe ownership
  y gates. Publicar rama y PR es trabajo autorizado ([publicación](specs/methodology/approvals.md#publicación-de-rama-y-pr));
  el merge exige aprobación explícita e identificable y nunca se auto-fusiona.
- Quick reversible: plan de una línea; un ejecutor por defecto, hitos y QA independiente.
  Aprobar una spec no autoriza desarrollo.
- [$handoff](.agents/skills/handoff/SKILL.md) consolida y para; continúa el alcance autorizado
  hasta completarlo o hasta un bloqueo real. Al parar, indica responsable, acción humana y
  estado según [comunicación](specs/methodology/coordinator-communication.md#7-closing-a-turn-or-stopping).

## Integridad y límites
- Rigor en lógica financiera, integridad histórica, seguridad y persistencia; sin reglas
  nuevas ni supuestos sobre extremos no demostrados. No reinicialices el proyecto.
- Datos financieros reales solo con autorización específica; nunca publiques información
  privada, bases reales, credenciales ni secretos en Git. Sin despliegue, VPS ni cambios de
  permisos o visibilidad sin autorización específica.
- Evita documentación redundante; resuelve lo técnico ordinario dentro del alcance.

## Política permanente de Git y GitHub
- Aprobada el 2026-10-20. Gestiona Git/GitHub de forma autónoma; repositorio privado, sin
  cambiar visibilidad. Rama por ámbito, nunca en `main`; preserva trabajo ajeno.
- Antes de push revisa commits, rutas, diff y archivos borrados; no confíes solo en `.gitignore`.
  Publica rama y PR con resumen, cambios, pruebas y limitaciones; declara dependencias.
- Espera aprobación explícita antes del merge; el permiso de push no la sustituye. Tras el
  merge verifica el commit y deja el checkout limpio. Ante seguridad, conflictos o validación
  fallida, detente; no fuerces push ni desactives verificaciones. Sin operaciones destructivas
  ni despliegues sin autorización específica.
