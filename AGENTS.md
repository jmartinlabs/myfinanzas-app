# Agent instructions · MyFinanzas App
Aplicación web privada para migrar el sistema financiero personal existente en Excel.
Repositorio privado: E1.1–E1.6 y E2.1–E2.6 integradas (E2.6 con límites de cobertura declarados); spec12 PR65/42a3efe aprobada/integrada; DEV12/PR67 integrado en a445f908 (candidato e66bbd3; QA independiente favorable; CI 40243368188 SUCCESS). B3 sigue abierto; no reanudar su investigación por inferencia.
Antes de actuar verifica Git/PR y el checkpoint relevante; consulta [contexto](specs/project.md) y [estado reanudable](specs/setup-progress.md) en las secciones necesarias, sin recargar documentos completos sin cambios.

- Carga solo las guías aplicables: [architecture](specs/guidelines/architecture.md), [UI](specs/guidelines/ui.md),
  [quality](specs/guidelines/quality.md) y [security](specs/guidelines/security.md).
- Desde la raíz, con Bun 1.4.3: `bun install --frozen-lockfile`, `bun run dev`.
- Verificación única: `python3 scripts/verify` (auto) o `python3 scripts/verify --full`.
  Python3.10+; comparación `--base SHA --head SHA [--pull-request]`, prerrequisitos y perfiles CI local-first en calidad.
- Dentro de trabajo autorizado, `$orchestrate` puede gestionar subagentes, ramas y worktrees
  aislados sin permiso operativo adicional, aplicando la política de seguridad y ownership local.
- Próximas entregas: evitar documentación/rondas redundantes; resolver detalles técnicos
  ordinarios durante desarrollo reutilizando arquitectura/componentes/pruebas. Mantener
  revisión rigurosa de lógica financiera, integridad, seguridad y persistencia.
- Sigue las ocho etapas de la metodología y las Skills locales; no inventes reglas
  financieras ni reabras decisiones confirmadas sin incompatibilidad justificada.
- E1.1: Q1–Q8 respondidas en specs/01-saldos-control-brainstorming.md; specification
  aprobada/integrada con evidencias F1–F3 del usuario. No reabrir decisiones;
  respetar extremos no demostrados. Saldo actual no filtra por Fecha apertura; histórico
  mensual sí comprueba esa fecha. No añadir filtro temporal ni fecha Manual por inferencia.
  M1/M2 respondidas y aprobadas como contrato de aplicación, no reglas físicas Excel;
  matriz vigente en specification. Revisión M2 del 2026-10-21: switches No/false
  al alta y POST omitido=false; PATCH conserva y ausencias históricas no se convierten.
  Sustituye elección manual obligatoria anterior. Tema solo claro; sin modo oscuro.
  Primera propuesta visual común y pantallas E1.1 aprobadas por comunicación del usuario
  el 2026-10-21; guía UI y specification documentan alcance. No confundir aprobación
  con pruebas de UI implementada ni adelantar Ciclos para la cabecera.
  E1.1–E1.5 implementadas e integradas; ocho etapas iniciales cerradas. Historial y
  aprobaciones en specs/project.md y specs/setup-progress.md; motores futuros pendientes.
  Unicidad SUB global sin mayúsculas, tildes/espacios conservados y comodines literales.
  E1.6 integrada PR34: 30 AC actuales verificados/3 futuros. Spec07 aprobada/integrada; dev07 autorizado (estado en progress07), sin Exterior Transferencia ni deploy.
- Referencia funcional vigente: v5.11 en specs/project.md.
- Especificación funcional recibida y leída: specs/functional-reference-v5.11.md.
- Roadmap aprobado en specs/roadmap.md; DT1–DT10 progresivas antes de cada entrega.
- SQL/actualización local E1.2 autorizados conforme especificación 02, preservando E1.1. Sin despliegue. Contexto
  en specs/project.md; Excel sigue como fuente de verdad hasta el traspaso autorizado.
## Coordinación v2.14.0 selectiva — publicación, continuidad y handoff
- Usa [$orchestrate](.agents/skills/orchestrate/SKILL.md) y [reglas locales](specs/methodology/myfinanzas-coordination.md) para coordinar trabajo autorizado; aprobaciones: [approvals](specs/methodology/approvals.md).
- Consulta [flujos](specs/methodology/workflows.md) para clasificar; carga [agentes dinámicos](specs/methodology/dynamic-agents.md) y [roles](.agents/roles/README.md) solo al delegar; Skills preservadas. Paquetes, retornos completos y estado manual: [comunicación](specs/methodology/coordinator-communication.md).
- Modelos/cuota: aplicar [techo Codex](specs/methodology/model-selection.md) y [gate de cuota](specs/methodology/dynamic-agents.md#quota-and-dispatch-gate) antes de nuevas tareas, incluida QA; OpenCode solo si está habilitado para esa ejecución.
- Solo el coordinador escribe [tablero](specs/epic-board.md); cada agente recibe ownership y gates. Roles no son agentes permanentes. Trabajo autorizado de código o documentación incluye publicar su rama y crear o actualizar su PR, conforme a [publicación](specs/methodology/approvals.md#publicación-de-rama-y-pr); el merge de cada PR conserva aprobación explícita e identificable y nunca se auto-fusiona.
- Quick autorizado, reversible y de bajo riesgo: plan de una línea, sin reconfirmar; consulta o Plan no autoriza editar. Un ejecutor por defecto, coordinación por hitos y QA independiente.
- Aprobar spec NO autoriza desarrollo; [$handoff](.agents/skills/handoff/SKILL.md) (Claude: `/handoff`) consolida y para, sin reanudar ni controlar chats externos. Continuar el alcance autorizado hasta completarlo o hasta un bloqueo real: un informe intermedio o un check corregible no cierra el turno. Al terminar o parar, indicar responsable, acción humana exacta y estado/motivo de espera según [comunicación](specs/methodology/coordinator-communication.md#7-closing-a-turn-or-stopping).

## Política permanente de Git y GitHub
Aprobada por el usuario el 2026-10-20. El usuario cambió el repositorio a privado; no cambies su visibilidad.
- Gestiona autónomamente Git/GitHub; el usuario no debe ejecutar comandos manuales.
- Comprueba estado, remoto y rama principal; preserva cambios ajenos y commits locales.
- Trabaja en una rama específica por STEP o funcionalidad, nunca directamente en main.
- Revisa tus cambios, ejecuta las validaciones aplicables y crea los commits necesarios.
- Antes de cada push inspecciona todos los commits que se enviarán, sus mensajes,
  rutas y contenido, incluidos archivos borrados en commits posteriores. Revisa también
  el diff final: no publiques datos financieros reales, bases, credenciales, secretos
  ni archivos sensibles. No confíes únicamente en .gitignore o un escáner.
- Haz push de la rama y crea una PR hacia main con resumen, cambios, pruebas y limitaciones.
  Si depende de otra rama aún no integrada, declara la dependencia y no la ocultes.
- Espera aprobación explícita del usuario de esa PR antes de hacer merge; una aprobación
  del plan o permiso para push no equivale a aprobación de merge.
- Tras esa aprobación, realiza el merge en GitHub, verifica estado y commit integrado,
  actualiza el checkout sin perder trabajo y confirma árbol limpio.
- Ante problemas de seguridad, conflictos o fallos de validación, detente y consulta;
  no fuerces un push ni desactives verificaciones. Informa de permisos o accesos bloqueados.
- No despliegues a producción, cambies permisos/visibilidad ni realices operaciones
  destructivas sin autorización específica. No publiques fuera del flujo autorizado.
