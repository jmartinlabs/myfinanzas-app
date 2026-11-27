# Agent instructions · MyFinanzas App

Aplicación web privada de un único usuario para migrar el sistema financiero personal en
Excel preservando su semántica económica, identificadores y controles. Referencia única y
candidata vigente: `MyFinanzas2026_v5.11(7).xlsx` ([contexto](specs/project.md)), no estable
ni inspeccionada físicamente por los agentes; el Excel es la fuente de verdad hasta el traspaso.

## Coordinator only
Antes de la primera delegación o de tomar una Issue (`work-issue`), asegura que el texto completo de
`orchestrate` está en el contexto actual; cárgalo solo si falta y aplica su paso 4 antes de cada despacho.

## Núcleo común y reglas locales
- El núcleo común (skills `orchestrate`, `spec`, `dev`, `task`, `tweak`, `handoff`, `relay`,
  `work-issue`, roles, plantillas y metodología base) proviene del plugin global
  `agentic-harness-plugin`.
- Reglas locales vinculantes (prevalece la más estricta): [project-rules](specs/project-rules.md),
  [coordinación local](specs/methodology/myfinanzas-coordination.md) y
  [aprobaciones](specs/methodology/approvals.md).

## Antes de actuar
- El estado operativo y el gate de fase viven en los **estados nativos de la Issue**; Project #4 y el
  [tablero](specs/epic-board.md) son **históricos**, sin sincronización ni autorización.
- Carga solo lo aplicable: [contexto](specs/project.md), [roadmap](specs/roadmap.md),
  [referencia funcional](specs/functional-reference-v5.11.md) y las guías
  [architecture](specs/guidelines/architecture.md), [UI](specs/guidelines/ui.md),
  [quality](specs/guidelines/quality.md) y [security](specs/guidelines/security.md).
- Decisiones financieras y funcionales: solo en su spec propietaria (`specs/NN-*`); no las
  reabras, dupliques ni infieras.

## Entorno y verificación
- Bun 1.4.3 (`bun install --frozen-lockfile`, `bun run dev`). Verificación única: `python3 scripts/verify`
  o `python3 scripts/verify --full`; Python 3.10+ (en local se usa `python3.12` cuando `python3` es `<3.10`)
  y `--base SHA --head SHA [--pull-request]`; [CI](specs/methodology/ci-policy.md) para perfiles.

## Coordinación
- Un coordinador técnico activo designado por el usuario (cualquier cliente compatible)
  delega **todo** el trabajo técnico (incluido Quick) y no ejecuta técnicamente; Álex asesora
  y el usuario aprueba.
- The user talks only to the orchestrator. Roles and auxiliary workers act solely on a coordinator's
  work packet: they never run `work-issue`, claim Issues, transition status or delegate further.
- Configuración: `.agents/harnesses/<coordinador>.json` (solo la edita el propietario); en T3
  rige `t3.json` o, si existe, `t3.local.json` en exclusiva. Un proveedor/modelo no disponible
  detiene el despacho, sin sustitución. Un perfil es una petición, no un requisito.
- Un ejecutor por tarea, QA independiente limpia de solo lectura y sin agentes artificiales. Checkout
  principal del coordinador en `test`, limpio; trabajadores en worktrees aislados. PR Watch, checkout y
  renovación de contexto se rigen por el plugin y no se duplican. Aprobar una spec no autoriza desarrollo.

## Integridad y límites
- Rigor en lógica financiera, integridad histórica, seguridad y persistencia; sin reglas
  nuevas ni supuestos sobre extremos no demostrados. No reinicialices el proyecto.
- Datos financieros reales solo con autorización específica; nunca publiques información
  privada, bases reales, credenciales ni secretos en Git. Sin despliegue, VPS, Dev32/PR30 ni
  cambios de permisos o visibilidad sin autorización específica.

## Política permanente de Git y GitHub
- Aprobada el 2026-10-20. Gestiona Git/GitHub de forma autónoma; repositorio público
  (visibilidad confirmada intencional el 2026-10-31), sin cambiar visibilidad. Rama por
  ámbito, nunca en `main` ni `test`; flujo `feature/* → test → main` con promoción del
  mismo SHA validado en `test`, nunca de cambios no validados; preserva trabajo ajeno.
  Project #4 no se modifica; `test → main` requiere aprobación independiente.
- Antes de push revisa commits, rutas, diff y archivos borrados; no confíes solo en `.gitignore`.
  Publica rama y PR con resumen, cambios, pruebas y limitaciones; declara dependencias.
- Espera aprobación explícita antes del merge; el permiso de push no la sustituye. Tras el
  merge verifica el commit y deja el checkout limpio. Ante seguridad, conflictos o validación
  fallida, detente; no fuerces push ni desactives verificaciones.
