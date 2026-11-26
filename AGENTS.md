# Agent instructions · MyFinanzas App

Aplicación web privada de un único usuario para migrar el sistema financiero personal en
Excel preservando su semántica económica, identificadores y controles. Referencia única y
candidata vigente: `MyFinanzas2026_v5.11(7).xlsx` ([contexto](specs/project.md)), no estable
ni inspeccionada físicamente por los agentes; el Excel es la fuente de verdad hasta el traspaso.

## Núcleo común y reglas locales
- El núcleo común (skills `orchestrate`, `spec`, `dev`, `task`, `tweak`, `handoff`, `relay`,
  `work-issue`, roles, plantillas y metodología base) proviene del plugin global
  `agentic-harness-plugin`.
- Reglas locales vinculantes (prevalece la más estricta): [project-rules](specs/project-rules.md),
  [coordinación local](specs/methodology/myfinanzas-coordination.md) y
  [aprobaciones](specs/methodology/approvals.md).

## Antes de actuar
- Contrasta Git/PR y el `Status` del Project **MyFinanzas · Development** (#4): es el único
  seguimiento operativo y el gate de fase. El [tablero](specs/epic-board.md) es **histórico**
  y no es permiso vigente.
- Carga solo lo aplicable: [contexto](specs/project.md), [roadmap](specs/roadmap.md),
  [referencia funcional](specs/functional-reference-v5.11.md) y las guías
  [architecture](specs/guidelines/architecture.md), [UI](specs/guidelines/ui.md),
  [quality](specs/guidelines/quality.md) y [security](specs/guidelines/security.md).
- Decisiones financieras y funcionales: solo en su spec propietaria (`specs/NN-*`); no las
  reabras, dupliques ni infieras.

## Entorno y verificación
- Bun 1.4.3 (`bun install --frozen-lockfile`, `bun run dev`). Verificación única:
  `python3 scripts/verify` o `python3 scripts/verify --full`; Python 3.10+ y
  `--base SHA --head SHA [--pull-request]`; [CI](specs/methodology/ci-policy.md) para perfiles.

## Coordinación
- Reparto: un coordinador técnico activo designado por el usuario (cualquier cliente
  compatible); Álex asesora y el usuario aprueba.
- The user talks only to the orchestrator. Roles and auxiliary workers act solely on a
  coordinator's work packet: they never run `work-issue`, claim Issues, write Project `Status`
  or delegate further.
- Configuración por coordinador en `.agents/harnesses/<coordinador>.json` (solo la edita el
  propietario). Un perfil configurado es una petición con herencia nativa si el cliente no
  puede aplicarlo o confirmarlo.
- Un ejecutor por tarea, QA independiente en subagente limpio de solo lectura y sin agentes
  artificiales. Aprobar una spec no autoriza desarrollo.

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
- Antes de push revisa commits, rutas, diff y archivos borrados; no confíes solo en `.gitignore`.
  Publica rama y PR con resumen, cambios, pruebas y limitaciones; declara dependencias.
- Espera aprobación explícita antes del merge; el permiso de push no la sustituye. Tras el
  merge verifica el commit y deja el checkout limpio. Ante seguridad, conflictos o validación
  fallida, detente; no fuerces push ni desactives verificaciones.
