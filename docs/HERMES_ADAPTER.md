# MyFinanzas · Uso con Hermes Agent (adaptador de agent-project-template PR #49)

Hermes es un **cliente adicional** del mismo harness. El coordinador técnico lo designa el
usuario para cada periodo de trabajo; el rol no queda atado al proveedor, y Hermes y OpenCode son
clientes válidos como coordinador, ejecutor o sustituto. Este adaptador no crea un segundo
coordinador, no sustituye ninguna Skill y no cambia reglas, aprobaciones ni estado del proyecto.

Se apoya en la integración aprobada y fusionada en
[agent-project-template#49](https://github.com/jmartinlabs/agent-project-template/pull/49)
(`38feb48`): Hermes lee `.agents/skills/` de forma nativa, así que la adaptación es
documentación y un paso de confianza, no un port.

## Qué se reutiliza

| Elemento | Uso en Hermes |
| --- | --- |
| `AGENTS.md` | Se inyecta como instrucciones del proyecto al arrancar en la raíz. |
| `.agents/skills/` (inventario del checkout) | Nivel de Skills de proyecto; se invocan como `/orchestrate`, `/spec`, `/dev`, `/handoff`, `/relay`, `/tweak`, `/task`, `/roadmap`, `/bootstrap`, `/init-project` `/adopt-project` y `/work-issue`. |
| `.agents/roles/` | Contratos reutilizables dentro de un paquete de trabajo; no son trabajadores permanentes. |
| `specs/methodology/` | Mismas reglas de flujo, aprobaciones, delegación y comunicación. |
| `specs/epic-board.md` | Histórico; no es seguimiento ni permiso vigente. El Project #4 es el estado operativo. |

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
- En la versión registrada, `AGENTS.md` se inyecta desde el directorio de trabajo. Una sesión abierta en un
  subdirectorio pierde todas las reglas: arranca en la raíz.
- En la versión registrada, los cambios en `AGENTS.md` no se reinyectan a mitad de sesión; aplica cambios de política en
  una sesión nueva.
- Una sesión nueva en el mismo checkout y perfil ya conserva la confianza concedida.

## Autoridad y límites en MyFinanzas

- **Cuando el usuario designa a Hermes como coordinador**, este gestiona el estado operativo en el Project #4; `specs/epic-board.md` es histórico. Cualquier
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

## Verificación registrada · rutas por rol en delegación (2026-11-18)

Cliente: Hermes Agent v0.23.2 (`2026.9.24`), perfil `engineering-lead`, macOS 15.5 arm64.
Sesión **nueva** (el enum de `option` se construye al abrir la sesión) con cinco delegaciones
mínimas, una por rol, ejecutadas contra el perfil real. Evidencia: `deleg_4ab52638`.

| Rol (`option`) | Proveedor observado | Modelo observado en metadatos | Resultado |
| --- | --- | --- | --- |
| `implementation` | `alibaba-token-plan` | `deepseek-v4.1-flash-1017` | PASS |
| `functional` | `alibaba-token-plan` | `deepseek-v4.1-flash-1017` | PASS |
| `review` | `alibaba-token-plan` | `deepseek-v4.1-flash-1017` | PASS |
| `qa` | `alibaba-token-plan` | `glm-5.3` | PASS |
| `infrastructure` | `alibaba-token-plan` | `deepseek-v4.1-flash-1017` | PASS |

Las cinco completaron una llamada API y los metadatos del runtime coincidieron con la ruta
configurada en ese momento.

**Alcance de esta evidencia:** demuestra que Hermes **selecciona y ejecuta** la ruta configurada
para cada rol. **No** es una identificación independiente del modelo por parte del proveedor, ni
prueba entitlement, ni mide varianza entre sesiones.

Los modelos observados corresponden al perfil **tal como estaba** en el momento de la sonda: las
opciones `functional` y `review` se habían reajustado a `deepseek-v4.1-flash-1017` después de la
edición inicial que documentó este adaptador (`openai-codex/gpt-6.1-sol` y `deepseek-v4-pro`
respectivamente). Lo verificado es la ruta vigente, no la del ejemplo.

Estado por cliente tras esta prueba: **Hermes 5/5 verificado a nivel de despacho**; **OpenCode
verificado por separado** (`opencode debug agents` resuelve `implementation`, `functional`,
`review` e `infrastructure` al modelo declarado); **Codex y Claude Code sin verificar** en esta
máquina porque no están instalados.

## Cuándo volver a verificar

Tras actualizar Hermes, cambiar de perfil (`HERMES_HOME`) o mover el checkout: verifica
el descubrimiento y que `/orchestrate` carga; no repitas trust automáticamente ni cambies
la confianza como parte de esta evaluación. Si cambian las Skills canónicas, la
confianza no se revoca, pero revisa el índice para detectar nombres nuevos, eliminados o en
conflicto.

## Alcance histórico y estado actual
Las cifras 11/11 de la muestra anterior son históricas (2026-11-10), no el inventario actual:
el checkout incluye también `/work-issue`. Contrasta los nombres presentes en `.agents/skills/`.
Las afirmaciones de descubrimiento y runtime corresponden exclusivamente a la versión registrada;
reverifica capacidades en otra versión. El Project MyFinanzas #4 es el estado operativo;
`specs/epic-board.md` es histórico y no se escribe como seguimiento. No cambia trust, autenticación
ni configuración de proveedores. Standard autorizado usa `/task`; Full `/dev` conserva spec
aprobada y autorización separada de desarrollo.

## Selección de modelos por sesión
En el cliente instalado verificado, `hermes chat --provider <proveedor-conectado>
--model <modelo-disponible> --reasoning low` aplica overrides de esa sesión;
`hermes model` fuera de sesión configura el valor por defecto, no solo la sesión actual.
En gateway, `/model <modelo> --provider <proveedor>` cambia el modelo en runtime cuando
la versión lo soporta. Comprueba la ayuda del cliente instalado: CLI, TUI y gateway
no garantizan los mismos comandos slash, y `/delegation` no es universal.
Referencia: [guía oficial CLI](https://hermes-agent.nousresearch.com/docs/user-guide/cli/).

El modelo del chat y las rutas `worker`/`advisor` de `model_map` son selecciones distintas:
cambiar el primero no prueba ni cambia las opciones fijadas para delegados. Usa únicamente
proveedores ya conectados y modelos cuyo catálogo esté verificado. Declara las opciones
solicitadas antes del despacho y contrasta la ruta efectiva con el
[verificador existente](#delegation-routes-effective-model-check-delegationbackend-model_map); no infieras éxito de un nombre
de slot ni inventes una ruta por tarea. No se cambia configuración ni autenticación automáticamente.

Instrucción inicial opcional: «Coordina con el modelo de esta sesión; para implementación usa
la opción worker verificada y para revisión crítica la opción advisor verificada, con contexto
independiente. Registra solicitado/observado; si la opción no está disponible o acreditada,
declara la limitación y aplica los gates/fallback canónicos». Los límites del
proveedor se respetan igual con cualquier cliente coordinador, sin pago ni otro proveedor sin consentimiento.

## Delegación por rol en el perfil real

El perfil en uso ya declara `delegation.backend: model_map` con opciones nombradas (`worker`,
`advisor`). Para alinear la delegación de Hermes con los cinco roles del harness se
añaden opciones **con nombre de rol** en `delegation.backends.model_map.options`:

```yaml
delegation:
  backend: model_map
  backends:
    model_map:
      options:                          # LISTA, no mapping: el cliente ignora un mapping
        - name: worker
          description: "Tareas habituales de desarrollo."
          provider: <proveedor-conectado>
          model: <modelo-verificado>
          reasoning_effort: high
        - name: implementation
          description: "DEV: implementación aprobada, pruebas y refactorización."
          provider: <proveedor-conectado>
          model: <modelo-verificado>
          reasoning_effort: high
        - name: functional
          description: "Análisis funcional y financiero."
          provider: <proveedor-conectado>
          model: <modelo-verificado>
          reasoning_effort: low
        - name: review
          description: "Revisión técnica crítica."
          provider: <proveedor-conectado>
          model: <modelo-verificado>
          reasoning_effort: high
        - name: qa
          description: "QA independiente del candidato."
          provider: <proveedor-conectado>
          model: <modelo-verificado>
          reasoning_effort: high
        - name: infrastructure
          description: "Entornos, puertos y diagnóstico de plataforma."
          provider: <proveedor-conectado>
          model: <modelo-verificado>
          reasoning_effort: medium
      default: worker
```

- **`options` es una lista de entradas `- name: …`**, y el campo **`name` ES el selector**: el
  delegado se elige por `implementation`, `review`, `qa`, etc. Un mapping (`options: {worker: …}`)
  es **ignorado por el cliente**: `model_map` avisa `options must be a list …` y no expone enum
  `option`, con lo que el binding queda inerte. No inventes alias para el mismo rol.
- `default: worker` declara la opción que se usa cuando la petición no nombra otra; es hermano
  de `options`, no una opción más. Si tu versión del plugin anida de otra forma, prevalece el
  esquema del cliente instalado: verifícalo antes de editar.
- Hay que **reiniciar la sesión** después de editar el perfil para que el esquema de
  `delegate_task` exponga las opciones nuevas; una sesión abierta no las ve aunque el fichero
  ya esté guardado.
- `provider`/`model` deben ser proveedores ya conectados y modelos verificados; declara en el
  packet lo solicitado y contrasta la ruta efectiva con
  [rutas de delegación](#delegation-routes-effective-model-check-delegationbackend-model_map). Los modelos y proveedores los fija
  manualmente el usuario en el perfil; este adaptador no los genera, sincroniza ni versiona.
- Este adaptador **no** escribe configuración de perfil ni ejecuta `hermes config`: documenta
  la forma del bloque para una edición revisada y manual del perfil. Sin plugins, flags ni
  rutas nuevas.

## Delegation routes (effective-model check, `delegation.backend: model_map`)
A route is a **slot** defined by an entry in `delegation.backends.model_map.options` — name,
provider, model, optional reasoning effort — not a fixed model. `worker`, `advisor` or any other
name may change provider, model or effort without touching the verifier, its tests or this
document. A route's actual choices come from the user's manual client configuration and its
verified availability; the advisor slot never replaces independent QA.

Measured failure mode (Hermes `model_map`, 2026-11-15): a per-task route parameter sometimes
never reaches the tool. The emitted call carries only `goal`/`context`, no error is raised, and
the task runs on the backend's `default` route — an `advisor` review silently executed by
`worker`. Of four dispatches, the two with a `goal` above ~2 500 characters lost it and the two
with a short `goal` (material in `context`) kept it. Keep `goal` short and put the payload in
`context`; the runtime copies arguments verbatim and the route resolved correctly whenever the
field arrived, so the loss is upstream of the plugin, not a routing bug to work around.

Before accepting a routed result, read the effective route from metadata: while it runs,
`delegate_task(action='list')` reports each child's `model`; afterwards,
`scripts/check-delegation-route --profile <profile> --delegation <id> --expect-label <option>
[--expect-provider <provider>] [--expect-model <model>] [--expect-effort <effort>]` reads it from
`state.db`. It passes only when every task finished `completed` and matched every requested
expectation; a task that did not finish, a mismatch, unreadable or malformed metadata, or a call
without any expectation never yields PASS (exit 2 is "no verdict", never a pass).

Where the expectations come from, and what the runtime can answer:

- **Recovered per task** by the check: route `label`, `provider`, `model`, `reasoning_effort` and
  the task's `status`.
- **Not recovered**: the option name requested at dispatch. Hermes keeps `task_json.model` — the
  model resolved at dispatch, blank when the tasks of a batch took different routes — but not the
  `option` parameter, nor the requested provider or effort. The coordinator therefore supplies the
  expectations from the option entry it actually dispatched with.
- Take them from **that** entry, not from the runtime's resolved values and not from the config as
  it reads after the run: the configuration can change between dispatch and check, and a model
  configured now is not the one expected then.
- Prefer `--delegation <id>` over `--latest`: with concurrent sessions the newest row may belong to
  another delegation.

A mismatch means the designated route failed; unavailable metadata means effective identity
is unverified, not proof that the route was not used. Do not credit the designated route in
either case; stop further dispatch at a safe boundary and investigate or record the blocker.
A same-model reviewer with independent context can still be independent QA; route identity
and independent review are separate checks.

La regla genérica de modelo pedido frente a observado está en [`$orchestrate`](../.agents/skills/orchestrate/SKILL.md#procedure) (paso 4); esta sección es la lectura específica de Hermes.
