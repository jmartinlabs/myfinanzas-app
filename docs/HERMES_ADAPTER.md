# MyFinanzas · Uso con Hermes Agent (adaptador de agent-project-template PR #49)

Hermes es un **cliente adicional** del mismo harness y, por decisión del usuario (2026-11-12),
el **coordinador técnico activo**; el rol no queda atado al proveedor y OpenCode sigue siendo un
cliente válido como ejecutor o sustituto. Este adaptador no crea un segundo coordinador, no
sustituye ninguna Skill y no cambia reglas, aprobaciones ni estado del proyecto.

Se apoya en la integración aprobada y fusionada en
[agent-project-template#49](https://github.com/jmartinlabs/agent-project-template/pull/49)
(`38feb48`): Hermes lee `.agents/skills/` de forma nativa, así que la adaptación es
documentación y un paso de confianza, no un port.

## Qué se reutiliza

| Elemento | Uso en Hermes |
| --- | --- |
| `AGENTS.md` | Se inyecta como instrucciones del proyecto al arrancar en la raíz. |
| `.agents/skills/` (11 Skills) | Nivel de Skills de proyecto; se invocan como `/orchestrate`, `/spec`, `/dev`, `/handoff`, `/relay`, `/tweak`, `/task`, `/roadmap`, `/bootstrap`, `/init-project` y `/adopt-project`. |
| `.agents/roles/` | Contratos reutilizables dentro de un paquete de trabajo; no son trabajadores permanentes. |
| `specs/methodology/` | Mismas reglas de flujo, aprobaciones, delegación y comunicación. |
| `specs/epic-board.md` | Lo escribe el coordinador activo (hoy Hermes); los demás clientes lo leen salvo designación expresa. |

No se copian Skills, roles, workflows, prompts, pruebas ni scripts del template. Los
adaptadores de Codex (`.codex/`), Claude Code (`.claude/`) y OpenCode (`.opencode/`) quedan
intactos.

## Activación (una vez por checkout y perfil)

```sh
hermes skills trust /ruta/a/myfinanzas-app   # revocable con: hermes skills untrust <ruta>
hermes                                       # arrancar SIEMPRE en la raíz del repositorio
/orchestrate                                 # misma Skill canónica que en los demás clientes
```

- La confianza es **por checkout y por perfil** (`HERMES_HOME`). Sin ella no se carga ninguna
  Skill de proyecto, aunque `hermes skills list` no enumera ese nivel: no lo uses como prueba
  de descubrimiento.
- `AGENTS.md` se inyecta desde el directorio de trabajo. Una sesión abierta en un
  subdirectorio pierde todas las reglas: arranca en la raíz.
- Los cambios en `AGENTS.md` no se reinyectan a mitad de sesión; aplica cambios de política en
  una sesión nueva.
- Una sesión nueva en el mismo checkout y perfil ya conserva la confianza concedida.

## Autoridad y límites en MyFinanzas

- **Hermes ejerce hoy como coordinador designado** y escribe `specs/epic-board.md`. Cualquier
  cliente compatible puede sustituirlo por decisión del usuario con el handoff de
  [Cambio de coordinador](../specs/methodology/myfinanzas-coordination.md#cambio-de-coordinador);
  ningún coordinador abre una cola paralela ni un segundo scheduler.
- Las aprobaciones se rigen solo por `specs/methodology/approvals.md`. Aprobar una
  especificación **no** autoriza desarrollo; el merge exige aprobación explícita e
  identificable y nunca se auto-fusiona.
- No se habilitan cron, Kanban ni automatizaciones persistentes. No hay continuación de
  trabajo entre sesiones.
- Sin datos financieros reales, VPS, TEST/PROD, despliegues ni cambios de permisos o
  visibilidad. Sin operaciones destructivas.
- Hermes delega subagentes propios, incluida la QA independiente, con resultados verificables; lo
  que **no** está validado es que un proveedor lance sesiones de otro (Hermes → OpenCode/Codex o
  al contrario). Sin despachador acreditado, el handoff es explícito y el trabajo no se declara
  iniciado.
- Una aprobación de comando en Hermes es control de shell, no consentimiento semántico. No
  ejecutes con `--yolo` ni con `approvals.mode: off`.
- Hermes protege `AGENTS.md` y otros archivos de instrucciones con una aprobación de escritura
  del cliente. Este adaptador no necesita editar instrucciones canónicas; si una tarea futura
  lo exige, la aprobación debe ser interactiva y explícita, o realizarse desde un cliente
  autorizado para ello.

## Compatibilidad entre clientes

| Cliente | Invocación | Adaptador |
| --- | --- | --- |
| Codex | `$orchestrate` | `AGENTS.md` + Skills canónicas |
| Claude Code | `/orchestrate` | `CLAUDE.md` + wrappers en `.claude/skills/` + perfiles en `.claude/agents/` |
| OpenCode | Skills canónicas | agentes nativos en `.opencode/agents/` |
| Hermes | `/orchestrate` | lectura nativa de `.agents/skills/`; sin wrappers ni copias |

Los cuatro leen la misma Skill; no hay contratos divergentes ni tableros duplicados.

## Verificación registrada (2026-11-10)

Cliente: Hermes Agent v0.23.0 (2026.9.24), build `2bd378ed1b8d`, macOS 15.5 arm64, modelo
`deepseek/deepseek-v4.1-flash`. Una sesión real; sin delegación y sin llamadas de modelo
adicionales para las comprobaciones de descubrimiento.

| Comprobación | Resultado |
| --- | --- |
| `hermes skills trust <repo>` | «11 project skill(s) will load in sessions started inside this repo» |
| Índice de Skills en sesión viva | 11/11 nombres canónicos, sin entradas duplicadas de `.claude/skills` |
| `skill_view('orchestrate')` | Contenido servido desde `.agents/skills/orchestrate/SKILL.md` |
| `AGENTS.md` | Presente en el contexto de la sesión |
| Clasificación con el contrato de `orchestrate` | `Quick`: cambio documental reversible, ya autorizado, sin gate protegido |
| Ejecución | Un ejecutor (esta sesión), sin paquetes ni tablero modificado |

Límites de esta evidencia: una sola sesión y una sola versión del cliente; no mide varianza ni
comportamiento con otros modelos. Las pruebas extensas P0/P-ISO ya están documentadas en el
template y no se repiten aquí. En esa sesión no se ejercitó la delegación, y el despacho entre
proveedores sigue sin validar.

## Cuándo volver a verificar

Tras actualizar Hermes, cambiar de perfil (`HERMES_HOME`) o mover el checkout: repite
`hermes skills trust` y confirma que `/orchestrate` carga. Si cambian las Skills canónicas, la
confianza no se revoca, pero revisa el índice para detectar nombres nuevos, eliminados o en
conflicto.
