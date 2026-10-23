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


## Adaptación MyFinanzas — v2.6.0, primera entrega local

Procedencia fijada: agent-project-template v2.6.0, commit
`267bd75f7c4a856f35a7a7a4c1d8a40f5a0de833`. El contrato anterior se conserva íntegro;
los siguientes apartados concretan su aplicación al proyecto existente.
Autorización: solicitud del usuario del 2026-10-23 para preparar/verificar localmente
el contrato y regresiones antes de cambiar Actions. No autoriza publicación ni merge.
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
- Git produce `--name-status -z --find-renames`; se inspeccionan altas, modificaciones,
  borrados, cambios de tipo y ambos lados de renombrados/copias. No se divide por líneas
  ni espacios. Se fuerza la inclusión de submódulos y se desactivan diff externo y
  textconv; la configuración local no puede ocultar gitlinks. UTF-8 inválido o registro
  truncado/desconocido: full.

### Workflow candidato — aún NO activado

[Receta exacta propuesta](../../scripts/fixtures/ci-policy.workflow.json), fuera de
`.github/workflows/`. JSON es un subconjunto de YAML: no se añade un parser externo.
[ci_workflow.py](../../scripts/ci_workflow.py) valida el objeto completo contra una
receta cerrada de jobs, dependencias, condiciones, pasos, comandos y seguridad;
rechaza estructuras/expresiones no reconocidas, claves duplicadas, filtros,
continue-on-error, comandos comentados o pasos omitibles. No es un intérprete general
de YAML o expresiones de Actions. Modificar una receta requiere revisión del harness.

Grafo propuesto:

1. `baseline`: checkout completo sin credenciales persistidas, Python, clasificador
   con salida verificada exactamente docs/full y todos los controles documentales
   y de seguridad, sin condición de omisión. No requiere Bun instalado para estos
   controles de Python; comprueban los manifests sin ejecutar código de aplicación.
2. `full`: depende de baseline correcto y se ejecuta salvo salida exactamente docs.
   Conserva instalación congelada, tipos/build, age, gate AC23 en su rama actual,
   API/SQLite, instalación Playwright, E2E y capturas ficticias. Sin cambios de
   clasificación UI, eventos, cachés o cobertura AC23.
3. `required`: depende de ambos y se evalúa con always(). El mismo script local
   comprueba sus resultados: solo acepta baseline=success con docs/full=skipped,
   o baseline=success con full/full=success. Vacíos, inválidos, fallos, cancelaciones
   o saltos inesperados fallan. No se configura branch protection por inferencia.

Se conservan push, pull_request y workflow_dispatch, permisos contents:read, acciones
por SHA y controles de historial/secretos. No se aplica ningún filtro de eventos/rutas.

### Transición verificable y límites

El workflow activo conserva sus bytes y ejecución completa. Durante esta primera
entrega, el harness acepta exclusivamente su huella SHA-256 revisada
`758b9d32207baa448b566ada043c637b13f4ba0f7f99aa9e7624e751e44175e8` como excepción
transitoria explícita. Cualquier alteración de ese YAML deja de beneficiarse de ella.
A la vez, check-project valida siempre el candidato estructural. La opción --workflow
valida una receta candidata sin aceptar el workflow heredado por huella.

Tras autorización para activar Actions, el cambio propuesto es sustituir únicamente
el workflow por la receta candidata verificada y retirar la excepción heredada y sus
pruebas de transición. Esta primera entrega no lo aplica. La futura ejecución remota
será evidencia separada; los tests locales no afirman que Actions haya corrido el grafo.
Los [comandos y evidencia](../guidelines/quality.md#contrato-ci-v260--preparación-local)
registran cobertura y límites. No cambia código financiero, SQL, roadmap, Excel ni
estados de otras entregas.
