# Change-aware CI contract for derived projects

Bootstrap implements this contract in the generated project harness. This template
keeps its own complete validation workflow; it has no application stack to test.

## Classification
Use one reusable classifier locally and in CI, with exactly `docs` and `full` results.
`docs` requires a nonempty set containing only explicitly allowlisted documentation
paths (for example a project backlog). A Markdown extension alone is insufficient.
Instructions, Skills, methodology, harness scripts, workflows, configuration, SQL,
dependencies and lockfiles always require `full`, even when written in Markdown.
Unknown paths, mixed documentation/code, invalid input, missing Git base, empty or
incomplete change lists and classification errors default to `full`.
Inspect the complete event comparison, including additions, deletions and both sides
of renames. Document PR and push comparison bases; never silently inspect only HEAD's
last commit. Parse filenames safely, including spaces and unusual characters.

## Required checks and workflow enforcement
Documentation and security controls are mandatory for both classes. `full` also runs
all applicable type, build, API/integration and E2E checks. Record exact commands and
explicit reasons for inapplicable checks in project quality guidelines; do not invent
a browser, API or database requirement for stacks that do not use them.

The project harness (for example `scripts/check-project`) must validate workflow
structure and execution conditions, not merely command text. Require the shared
classifier, unconditional baseline controls, and full checks unless classification
has successfully produced exactly `docs`. Missing or invalid classifier output must
run full checks or fail visibly; it must never yield a green run with no validation.
Check job dependencies, conditions and a final required result that rejects failures
and unexpected skipped checks. Reject disabled controls (`if: false`), commented-only
commands, `continue-on-error` on required checks and event/path filters that omit all
validation. Preserve approved security controls, including permissions, action pins,
checkout credentials and history requirements; classification never relaxes them.

## Local regression evidence
The harness regression suite (for example `scripts/test-checks`) must exercise the
same classifier used by CI and valid/invalid workflow fixtures. Cover at least:

| Input or mutation | Expected result |
| --- | --- |
| Only allowlisted backlog documentation | `docs`, baseline controls required |
| Documentation plus code | `full`, complete applicable battery required |
| SQL, dependencies, lockfiles, workflows, harness, configuration, instructions or Skills | `full` |
| Unknown path, empty input, invalid output, missing comparison base or classifier failure | `full` or visible CI failure; never successful omission |
| Rename from code to documentation, or deleted protected file | `full` |
| Paths containing spaces or unusual characters | Parsed without losing changes |
| Missing classifier, disabled baseline/full check, broken dependency or unexpected skip | Workflow rejected |
| Commented command, allowed failure or filter skipping all validation | Workflow rejected |
| Valid docs and full workflow execution paths | Accepted with their required checks |

Prove the contract with local tests before changing Actions execution. Regressions
must check behavior, not repeat the implementation's string-presence assertions.
UI-specific classification, event deduplication and environment caching are separate
changes requiring their own evidence and scope.


## Adaptación MyFinanzas — v2.6.0, entrega local ampliada

Procedencia fijada: agent-project-template v2.6.0, commit
`267bd75f7c4a856f35a7a7a4c1d8a40f5a0de833`. El contrato anterior se conserva íntegro;
los siguientes apartados concretan su aplicación al proyecto existente.
Autorización: solicitud del usuario del 2026-10-23 para preparar/verificar localmente
el contrato y regresiones antes de cambiar Actions. La ampliación posterior «Autorizo» permite preparar el workflow y mejoras de Actions
localmente; siguen sin autorizarse publicación ni merge.
No se ejecuta init-project ni se reemplazan las guías o decisiones de la aplicación.

### Clasificador y bases completas

Implementación única: [ci_policy.py](../../scripts/ci_policy.py), Python estándar.
Única allowlist docs: archivos `.md` directamente dentro de `specs/backlog/`, excepto
nombres de instrucciones `AGENTS.md`, `CLAUDE.md`, `SKILL.md` e `instructions.md`
(comparación de esos nombres sin distinguir mayúsculas). No hay allowlist por mera
extensión fuera de esa carpeta ni para subcarpetas. Instrucciones, Skills, metodología,
guías, SQL, dependencias/lockfiles, configuración, workflows, harness, código y rutas
desconocidas son full. Mezclar cualquier ruta full con documentación produce full.

- PR: `merge-base(base.sha, head.sha)` hasta `head.sha` del evento, incluyendo todos
  los commits de la rama; no se compara solo el último commit ni HEAD~1.
- Push: `before` hasta `after` del evento, sin sustituir un before ausente/nulo por
  el padre de HEAD. Rama nueva, borrada, comparación vacía o manual: full.
- Ambos extremos deben ser commits SHA completos existentes y el repositorio no
  puede ser shallow. Error de Git/lectura/JSON, entrada desconocida o comparación
  incompleta: full; si el proceso clasificador falla, el job falla visiblemente.
- Si el checkout corresponde a una integración PR, se combina la comparación original
  con el diff acumulado de la PR, usando los padres del merge verificado. Solo docs si
  ambas comparaciones son docs: un último push documental no oculta código anterior
  de la misma PR ni evita full según el orden de llegada de los eventos.
- Git produce `--name-status -z --find-renames`; se inspeccionan altas, modificaciones,
  borrados, cambios de tipo y ambos lados de renombrados/copias. No se divide por líneas
  ni espacios. Se fuerza la inclusión de submódulos y se desactivan diff externo y
  textconv; la configuración local no puede ocultar gitlinks. UTF-8 inválido o registro
  truncado/desconocido: full.

### Workflow actualizado — pendiente de publicación

[Receta de referencia](../../scripts/fixtures/ci-policy.workflow.json), validada también
contra el [workflow local](../../.github/workflows/validate.yml). JSON es un subconjunto
de YAML: no se añade un parser externo. La rama no está publicada ni integrada en main.
[ci_workflow.py](../../scripts/ci_workflow.py) valida el objeto completo contra una
receta cerrada de jobs, dependencias, condiciones, pasos, comandos y seguridad;
rechaza estructuras/expresiones no reconocidas, claves duplicadas, filtros,
continue-on-error, comandos comentados o pasos omitibles. No es un intérprete general
de YAML o expresiones de Actions. Modificar una receta requiere revisión del harness.

Grafo propuesto:

1. `baseline`: checkout completo sin credenciales persistidas, Python, contexto de
   integración verificado y SHA fijado. Clasificador con salida exactamente docs/full
   y controles documentales/de seguridad sin condición de omisión. No requiere Bun
   para esos controles Python. Solo este job añade pull-requests:read a contents:read,
   para consultar PR abiertas del mismo repositorio en pushes de ramas; el token de
   GitHub se limita al paso de consulta y no se registra ni persiste.
2. `full`: depende de baseline correcto y se ejecuta salvo salida exactamente docs.
   Conserva instalación congelada, tipos/build, age, gate AC23 en su rama actual,
   API/SQLite, Playwright, E2E y capturas ficticias, sobre el SHA fijado por baseline.
   No hay clasificación UI ni retirada del gate AC23.
3. `required`: depende de ambos y se evalúa con always(). El mismo script local
   comprueba sus resultados: solo acepta baseline=success con docs/full=skipped,
   o baseline=success con full/full=success. Vacíos, inválidos, fallos, cancelaciones
   o saltos inesperados fallan. No se configura branch protection por inferencia.

Se conservan push, pull_request y workflow_dispatch, permisos contents:read, acciones
por SHA y controles de historial/secretos. No se aplica ningún filtro de eventos/rutas.

### Concurrencia y preparación Linux

Se mantienen los tres eventos sin filtros de rutas ni ramas. Push y PR del mismo
repositorio/rama comparten grupo; se cancelan ejecuciones automáticas activas obsoletas.
Etiquetas tienen namespace propio; forks con nombres de rama iguales no colisionan.
Main no cancela una ejecución activa. Ejecuciones manuales se aíslan por run_id.
La concurrencia no recupera tiempo de una ejecución que terminó antes de abrir la PR,
ni garantiza orden de llegada. No se promete una única ejecución histórica por SHA.

Para que sobrevivir como push no reduzca la cobertura respecto a PR,
[ci_context.py](../../scripts/ci_context.py) consulta PR abiertas con head del evento
antes de seleccionar refs/pull/N/merge. Si no hay PR, se conserva el SHA del push;
main/etiquetas/manual mantienen su contexto. Error, lista incompleta, más de una PR
compatible o head cambiado fallan visiblemente. Tras checkout se verifica HEAD^2
contra el head del evento; baseline publica el SHA exacto para full/required. Un cambio
de la referencia merge entre consulta y checkout no puede producir un falso docs.

Todos los jobs usan Ubuntu24.04 x64. El [plan de paquetes](../../scripts/ci-linux-packages.json)
conserva tools+chromium oficiales de Playwright1.64.1, incluidas fuentes, más age.
[ci_prepare_linux.py](../../scripts/ci_prepare_linux.py) comprueba SO/arquitectura,
versión real del CLI instalado y manifiesto del proyecto; consulta dpkg con locale C,
y solo si faltan paquetes hace una actualización APT y una instalación de faltantes.
Errores de inventario, versión o APT fallan; no se sustituyen por éxito ni skips.
Chromium se descarga con el CLI exacto instalado, sin repetir --with-deps y sin usar
el navegador del sistema. No se añade caché: las demoras observadas estaban en paquetes
Linux y no en la descarga del binario. No se promete eliminar toda lentitud de red.

Fuentes revisadas: [inventario Ubuntu24.04](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md),
[dependencias Playwright1.64.1](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/server/registry/nativeDeps.ts),
[concurrencia GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
y [cachés Playwright](https://playwright.dev/docs/ci#caching-browsers).

### Estado y límites de verificación

La excepción heredada por huella se ha retirado después de probar el contrato local
(commit ac059f7). Check-project y validate-template exigen ahora el grafo estructural;
la receta de referencia y el workflow local deben satisfacerlo. Los tests comprueban
salidas, fallos/skips, rangos Git completos, PR acumulada, carreras de checkout,
separación de grupos y preparación APT mediante ejecutor simulado.

Acciones remotas, instalación APT y lanzamiento del navegador en Ubuntu: UNRUN hasta
publicación autorizada. Sus tiempos y permisos deben verificarse en esa fase;
las pruebas locales no se atribuyen a GitHub. Los [comandos y evidencia](../guidelines/quality.md#contrato-ci-v260--preparación-local)
registran cobertura y límites. No cambia código financiero, SQL, roadmap, Excel ni
estados de otras entregas. No se modifican reglas de protección de main.
