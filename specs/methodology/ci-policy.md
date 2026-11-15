# Change-aware CI contract for derived projects

Bootstrap implements this contract in the generated project harness. This template
keeps its own lightweight validation workflow; it has no application stack to test.
The local-first policy below applies to derived projects without adding a new Skill,
agent service, attestation system or mandatory client hook.

## Classification
Use one reusable classifier locally and in CI, with exactly `docs` and `full` results.
`docs` requires a nonempty set containing only explicitly allowlisted documentation
paths. A Markdown extension alone is insufficient; backlog is not the only eligible
product documentation.
Instructions, Skills, methodology, harness scripts, workflows, configuration, SQL,
dependencies and lockfiles always require `full`, even when written in Markdown.
Unknown paths, mixed documentation/code, invalid input, missing Git base, empty or
incomplete change lists and classification errors default to `full`.
Inspect the complete event comparison, including additions, deletions and both sides
of renames. Document PR and push comparison bases; never silently inspect only HEAD's
last commit. Parse filenames safely, including spaces and unusual characters.

## Adaptable product-document allowlist
Record the exact allowlist in each project's CI policy and implement it in the shared
classifier. Start with these bounded product-document families, adapting paths and
naming to the existing project rather than renaming its documents:

- Direct backlog documents under an explicitly named product backlog directory.
- Direct numbered brainstorming, specification, progress and testplan documents.
  For this template's convention, match the whole relative path with
  `specs/[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*-(?:brainstorming|specification|progress|testplan)\.md`.
  Do not match arbitrary suffixes, nested directories or every file in `specs/`.
- Exact context/plan/tracking files reviewed as product documentation, such as
  `specs/project.md`, `specs/roadmap.md`, `specs/setup-progress.md` and
  `specs/epic-board.md`. Additional references need explicit exact paths or bounded
  families, with rationale and positive/negative tests. A README is not automatically
  eligible: it may contain operational agent instructions.

Protected exclusions take precedence over every allowlist entry. Exclude instructions
(including AGENTS.md, CLAUDE.md, SKILL.md and instructions.md regardless of case), Skills,
operational methodology, guidelines, harness, workflows and configuration, even if
stored beside product documents or matching an allowed name. Code, SQL, dependencies,
lockfiles, mixed changes and unknown paths remain `full`. Never use a blanket `*.md`
or `specs/**` exemption. If a product document becomes operational instructions,
reclassify its path as `full`; review this boundary when changing document ownership.
Changes to the allowlist or classifier themselves require `full`.

Adapt existing projects without init-project, replacing functional decisions or
reinitializing their harness. This is a CI scope policy, not product approval.
Reference: [MyFinanzas PR #55](https://github.com/jmartinlabs/myfinanzas-app/pull/55)
illustrates the correction; its project-specific filenames are not universal defaults.

## Required checks and workflow enforcement
Documentation and security controls are mandatory for both classes. `full` defines
required delivery coverage: all applicable type, build, API/integration and E2E checks.
It does not require running every suite on every GitHub event. Record exact commands,
execution profiles, critical paths and platform requirements in project quality guidelines;
do not invent a browser, API or database requirement for stacks that do not use them.

Use local-first QA with a minimal CI gate:

- Local development and independent QA run E2E and complete regressions for each stable
  candidate. Platform-dependent checks require a compatible isolated environment;
  a host OS that cannot exercise them is not equivalent evidence.
- Every PR has one unconditional `required` job: baseline documentation/security controls,
  the shared conservative classifier and the project's fast type/build checks.
  Critical persistence, migration, financial, security and dependency changes also run
  independent checks in CI on the required platform. Keep their commands and path map
  in the project, including indirect consumers; unknown paths or uncertain impact select
  critical verification or fail visibly, never a successful omission.
- Automatic push runs target only `main`, providing a fast post-merge gate. PR runs
  compare the complete base/head change; working-branch pushes must not duplicate them.
  Keep manual full verification available. Cancel superseded PR runs using a PR-specific
  concurrency group; never let a push cancel the PR check or silently pass a cancellation.
- Keep a single habitual job rather than separate baseline/full/aggregator runners.
  Preserve the check identity through migration or explicitly coordinate protection
  updates with user approval. A job named `required` alone does not enforce branch
  protection; inspect actual required checks and bypass settings before claiming enforcement.

The project harness (for example `scripts/check-project`) must validate workflow
structure and execution conditions, not merely command text. Require unconditional
baseline controls, conservative profile selection and a required result that rejects
failures and unexpected skipped checks. Missing or invalid classifier output must
select critical/full verification or fail visibly. Reject disabled controls (`if: false`),
commented-only commands, `continue-on-error` on required checks and event/path filters
that omit the PR gate. Preserve approved security controls, including permissions,
action pins, checkout credentials and history requirements; classification never relaxes them.

## Evidence validity and independent QA
Reuse the existing testplan/checkpoint, not a second evidence registry. Before integration,
the coordinator and independent QA verify the clean candidate commit, current base commit,
complete comparison and tested environment against reachable raw logs and artifacts.
Record exact commands, tool/runtime versions, platform/architecture, run time, test counts,
exit statuses and expected coverage. Dirty/untracked inputs must be identified and cannot
be represented as evidence for a clean commit. A PASS declared by an agent or a self-authored
manifest is not sufficient evidence. QA inspects raw output and candidate diff and reruns
checks that resolve material risks; it does not merely repeat the author's conclusion.

After a candidate, base, dependency, toolchain, filesystem or environment change, reassess
impact and rerun affected checks; uncertain impact requires complete verification. Reuse
unchanged evidence only with an explicit equivalence rationale verified independently.
Missing, stale, inaccessible or incompatible evidence blocks integration even if CI is green.
The fast CI gate does not attest that local QA ran. Keep explicit merge approval; no
repository-controlled PASS file, client hook or successful check substitutes for it.
Codex and Claude Code follow this same canonical policy through their existing adapters;
do not make correctness depend on optional lifecycle hooks or a particular client.

## Canonical verification entry point
Bootstrap establishes one canonical verification command for local use and CI.
Reuse an existing command when it already covers this contract; do not add a wrapper
or rename commands merely for uniformity. The command name and implementation belong
to the approved project stack (for example a script, task runner or package command).
Record its working directory, prerequisites, comparison inputs and a way to force
`full` verification in AGENTS.md and project quality guidelines.

The entry point coordinates the shared classifier and required checks; keep their
logic in existing tools rather than copying it. Use explicit local-full, fast-CI and critical-CI profiles in the existing entry point.
Apply the same check selection and failure semantics for equivalent inputs within each
profile; profile differences are intentional and documented, not silent skips.
Environment preparation may differ and must be documented. The required CI result
verifies its profile coverage; the independent integration review verifies local-full
evidence. Keep conservative docs/full coverage classification separate from execution venue.
Within one verification run, execute each required suite once unless a documented
repeat is needed for an acceptance criterion or flakiness investigation. This does
not remove independent QA or require reusing stale evidence between candidates.

Propagate a nonzero exit status for any required failure or missing prerequisite.
An invalid mode must fail visibly. Report passed, failed, intentionally skipped and
unrun checks separately; unexpected skips and unexpectedly zero discovered tests
must not count as success. Classification uncertainty retains the conservative
`full` or visible failure behavior specified above. Successful `docs` verification
must say that application checks were intentionally omitted, not claim they passed.
Verification must not install dependencies, change task state, commit, deploy or
reinitialize a project implicitly; provision the documented environment separately.

Derived-project regression tests must invoke the real entry point and demonstrate:
valid docs/full paths, forced full mode, each required check failing, missing tooling,
invalid modes, unexpected zero tests/skips, local/CI selection parity within profiles, and each suite
executing once per run. Prove reuse of an adequate existing command without a second
verification layer. These are generated-harness behavioral tests; this template's
validator only protects preservation of the contract.

## Local regression evidence
The harness regression suite (for example `scripts/test-checks`) must exercise the
same classifier used by CI and valid/invalid workflow fixtures. Cover at least:

| Input or mutation | Expected result |
| --- | --- |
| Only allowlisted backlog documentation | `docs`, baseline controls required |
| Each allowed brainstorming/specification/progress/testplan and exact tracking path: additions, modifications and deletions | `docs`, baseline controls required |
| Renames between two allowed product-document paths | `docs`, both endpoints checked |
| Protected/unknown to product documentation, and product documentation to protected/unknown | `full`, both rename directions checked |
| Each protected category added, modified or deleted, alone and mixed with allowed product documentation | `full` |
| Markdown lookalikes: nested paths, wrong suffix/extension, arbitrary specs files or protected names in allowed directories | `full` |
| Documentation plus code | `full` delivery coverage; CI follows the explicit execution profile |
| SQL, dependencies, lockfiles, workflows, harness, configuration, instructions or Skills | `full` |
| Unknown path, empty input, invalid output, missing comparison base or classifier failure | `full` or visible CI failure; never successful omission |
| Rename from code to documentation, or deleted protected file | `full` |
| Paths containing spaces or unusual characters | Parsed without losing changes |
| Missing classifier, disabled required check, broken dependency or unexpected skip | Workflow rejected |
| Commented command, allowed failure or filter skipping all validation | Workflow rejected |
| Valid docs and full workflow execution paths | Accepted with their required checks |

Prove the contract with local tests before changing Actions execution. Regressions
must check behavior, not repeat the implementation's string-presence assertions.
Also exercise working-branch push exclusion, PR/main/manual admission, PR cancellation,
failed/cancelled/timed-out checks, invalid profile selection and unknown critical paths.
Evidence validity tests cover stale candidate/base, dirty inputs, incompatible environment,
missing/raw-log mismatch and a forged PASS claim. Keep environment caching optional and
review its trust boundary separately.

For every allowed family and exact path, use real Git comparisons for additions,
modifications, deletions and renames. Exercise both rename endpoints even if the old
file no longer exists. Include protected files mixed with each product-document
family; one protected or unknown path makes the whole comparison `full`. Test policy
adaptations with valid alternate product paths and rejected broad Markdown exemptions.

## MyFinanzas — local-first vigente (2026-10-27)

Autorizado por el usuario: implementación y PR independientes, sin merge, deploy,
protecciones ni intervención en los cinco desarrollos paralelos. Esta adaptación
aplica el contrato portable anterior; los apartados v2.6/v2.7 inferiores son historia
sustituida solo en selección de entorno, eventos y grafo CI. **La actualización de
documentación del 2026-10-28 sustituye para este repositorio la allowlist genérica y
v2.6; el resto del contrato sigue vigente.** No son excepciones vigentes.

**Revisión 2026-11-12 — FAST en PR, FULL en despliegue (decisión del usuario).** Un PR
hacia `main`/`test` valida solo lo mínimo imprescindible y rápido: baseline, typecheck,
build y la suite unitaria web. La batería completa de API/SQLite y E2E **no** se ejecuta
en cada PR; se ejecuta en el FULL del tag de despliegue, sobre el commit exacto del tag.
Esto **sustituye** para este repositorio la selección `critical` y la escalada por rutas
sensibles en PR descritas en el contrato portable: ninguna prueba se elimina ni se
relaja, solo cambia *cuándo* se ejecuta. Perfiles vigentes: `docs`, `fast`, `full`.

- `python3 scripts/verify` conserva la cobertura local completa cuando la comparación
  no es `docs`; una comparación `docs` omite aplicación y regresiones del harness.
  `--full` fuerza toda la cobertura local (baseline, tipos/build, API/SQLite y E2E).
  La excepción histórica AC23 sigue limitada a su rama.
- CI usa un único job de ejecución `required`: `ci-plan`, baseline, preparación y
  `ci`, más `ci-result` siempre. Un job adicional `profile` (solo metadatos, sin pasos
  de verificación) depende de `required` y publica el perfil en el nombre del check.
  `ci-result` rechaza fases ausentes, fallidas, canceladas o con skips fuera de la
  matriz; no concede un PASS local ni una aprobación de merge.
- Eventos (revisión 2026-11-11): PR hacia `main` o `test` —incluido
  `ready_for_review` para que un draft que pasa a listo reciba validación—, push del
  tag `deploy-test-v*` y manual completo. Ya **no** hay push automático a `main` ni a
  `test`: la PR ya validó su merge ref y el postmerge duplicaba ejecuciones. Los
  drafts conservan el gate rápido; no se desactiva globalmente. PR valida el head
  del evento (`HEAD^2`) y exige que la base probada (`HEAD^1`) no reescriba la base del
  evento: se acepta que la base (`main` o `test`) haya avanzado por fast-forward y se
  clasifica contra esa base efectiva; una base divergente o un merge ref anterior al
  evento fallan visiblemente. La comprobación de ancestro no demuestra que el merge ref
  sea el tip vigente de la base: un avance posterior al checkout no se detecta en este
  proceso, el SHA probado queda publicado y la protección exige base actualizada antes
  del merge. No hay filtro de paths que omita el check. Solo cada PR cancela su
  candidato anterior; las ejecuciones manuales y de tag no se cancelan entre sí ni por
  una PR, para que el deploy pueda consumir su evidencia.
- `docs/full` sigue midiendo cobertura de entrega; el perfil de ejecución es otra cosa.
  El perfil CI `docs` ejecuta un baseline documental: `check-repository` (historial,
  índice y seguridad), `check-project` (estructura y workflow), `validate-template`
  (estructura, enlaces, anclas, contratos y heurísticas) y whitespace de trabajo y
  commit. Omite las regresiones `test-*` del harness porque un diff compuesto solo
  por documentación no modifica sus entradas; `full` las ejecuta todas y `fast` aplica
  la selección por rutas declarada más abajo. La
  selección se recalcula dentro del paso `baseline` con el mismo `ci_profile` y el
  contexto verificado; sin contexto, evento inválido o error de clasificación ejecuta
  la batería completa. No hay skip de workflow ni estado nuevo en `ci-result`.
  `fast` (todo PR) añade tipos/build y la suite web (`bun test apps/web`); `full`
  añade la suite API/SQLite completa (incluidas las pruebas que dependen de `age`),
  `prepare` con `age`+Chromium y E2E. PR compara todo el rango mediante merge-base
  sobre la base probada (`main` o `test`) y solo puede seleccionar `docs` o `fast`:
  **ninguna ruta sensible escala un PR**, porque esa cobertura la da el FULL del tag.
  `full` se selecciona únicamente por dispatch manual o por push del tag
  `deploy-test-v*`; el tag se valida sobre el commit exacto (un tag anotado se pela a
  su commit) y ejecuta `full` con toda la batería. Si GitHub reconstruye el merge ref
  sobre una base más nueva antes del checkout, esa misma ejecución es la repetición y
  solo omite aplicación cuando el diff propio de la PR es documental; un merge ref
  anterior al evento falla y debe relanzarse. La validación completa de un cambio de
  alto riesgo se hace con el tag de despliegue o con un dispatch full sobre el SHA que
  se quiere promover, no con un perfil intermedio en la PR.
- **Coste y cobertura retirada de PR (2026-11-12):** la suite API/SQLite (varios cientos
  de pruebas y minutos de ejecución), el filtro libre de `age` que la acompañaba y E2E
  salen del camino de PR. Motivo: el PR debe dar señal rápida de tipos, build y lógica
  de cliente; la cobertura de API/E2E se paga una vez por candidato de despliegue, en
  el tag, y bloquea el deploy si falla. Riesgo aceptado y explícito: un fallo que solo
  detecte la suite API puede llegar a `test` y descubrirse al etiquetar; el gate FULL
  del tag lo impide en producción. Para reducir esa ventana, el paso previo a etiquetar
  puede usar `Validate project` con `workflow_dispatch` (FULL sobre el SHA exacto) — es
  opcional y no crea un gate nuevo.
- **Selección de las regresiones del harness por rutas en `fast` (2026-11-13).** El
  baseline de `fast` ejecuta **siempre** los controles esenciales (`check-repository`,
  `check-project`, `validate-template` y whitespace de trabajo y commit) y solo las
  regresiones `test-*` que declara la comparación verificada. La declaración vive en
  `scripts/ci_policy.py` (`HARNESS_INPUTS` por suite, `CONTRACT_INPUTS` transversales y
  `APPLICATION_ONLY`) y no crea un segundo clasificador: usa el mismo `ci_comparison`
  que decide el perfil. Un diff limitado a `apps/` o `tests/` no ejecuta ninguna
  regresión del harness; `templates/`, `.agents/`, `specs/methodology/`,
  `specs/guidelines/`, `AGENTS.md`, `CLAUDE.md` o `scripts/` ejecutan todas; `.github/`,
  `docs/`, `.codex/`, `package.json`, `bun.lock` o `infra/` seleccionan solo las suites
  que los declaran. Una ruta no declarada, un evento ilegible, una comparación no
  verificable, un árbol de trabajo sucio o un clasificador que falle ejecutan **todas**
  (fail-closed). La selección se anuncia en el log
  (`INTENTIONALLY SKIPPED harness regressions: ...`) y nunca se contabiliza como PASS.
  `full` ignora cualquier selección: la batería completa sigue siendo la del tag.
  **Riesgo declarado:** una regresión omitida en la PR se ejecuta en el FULL del tag de
  despliegue, sobre el commit exacto que se promueve; un PR sin la cobertura completa no
  autoriza el merge por sí mismo, y el deploy espera ese FULL. El riesgo aceptado es que
  un fallo que solo detecte una suite omitida aparezca al etiquetar; se acota lanzando
  `Validate project` con `workflow_dispatch` (FULL sobre el SHA exacto) antes de etiquetar.
- **Paralelismo del baseline (2026-11-13).** Las suites del baseline son independientes
  (cada una trabaja sobre repositorios y temporales propios), así que `scripts/verify
  baseline` las ejecuta en paralelo con `min(4, cpu)` procesos; `VERIFY_JOBS` fija el
  número para medir o depurar. La salida sigue siendo determinista: se anuncian todas
  las suites seleccionadas y después se imprimen sus bloques y sus `PASS`/`FAIL` en el
  orden de declaración del baseline, con los segundos de cada una. Cada suite se ejecuta
  exactamente una vez, y un fallo ya no oculta el resultado real de las demás suites
  (todas se han ejecutado); la fase falla igualmente y el código de salida se propaga.
  La fase de aplicación (`typecheck`, `build`, `web`) sigue secuencial dentro de un solo
  paso para no competir por artefactos compartidos. La cobertura no cambia: misma lista
  de suites, mismo criterio de cobertura por reporter y mismos fallos.
- **Coste evitable retirado de los dos controles más caros (2026-11-13).**
  `check-repository` lanzaba un proceso Git por mensaje de commit y por blob del índice
  (más de 5.000 arranques en este historial); ahora lee el historial con un `git log`
  único y los blobs con un `git cat-file --batch` persistente, y descarta por literales
  necesarios antes de aplicar las expresiones de credenciales. `validate-template`
  releía y reescribía la normalización de los mismos documentos por cada regla; ahora
  memoiza la lectura dentro de una ejecución y filtra por literales necesarios antes de
  las expresiones de secretos y de rutas de máquina. Ninguna regla cambia: los
  literales son condiciones necesarias de cada patrón y `test-checks`/`test-validator`
  prueban que cada forma sigue detectándose.
- **Medición local de referencia (macOS, reloj de pared; varía con la carga de la
  máquina y el tamaño del historial):** baseline completo secuencial ≈ 181–275 s; el mismo
  baseline en paralelo ≈ 78–165 s; un PR de UI (solo `apps/`) ≈ 9 s de baseline; un PR que
  toca `scripts/` ≈ 78 s en frío y 97–146 s con la máquina cargada; un PR de documentación
  ≈ 9 s. La cifra de CI la publica el log de cada paso (`PASS <suite> (<s>)`); no es una
  garantía de contrato y debe re-medirse al cambiar la lista de suites o el tamaño del
  árbol. El límite conocido es `test-validator`: 52 fixtures validan el contrato completo y
  dominan el muro cuando la selección las incluye.
- **Corrección del prefiltro de `github_pat_` (2026-11-13):** el prefiltro por literales
  añadido con la optimización usaba `gh` como condición necesaria del token de GitHub, pero
  `github_pat_…` no contiene esa subcadena, así que la regla no se evaluaba. Los literales
  se ampliaron (`github_pat_`) en `check-repository` y `validate-template`, con pruebas en
  `test-checks` y `test-validator`. Regla permanente: al añadir una alternativa a un patrón
  de secretos hay que añadir su literal y un caso que lo dispare.
- **Retirada del perfil `critical` sin `age` (2026-11-12):** el perfil intermedio
  `critical` (suite API con filtro negativo de las 36 pruebas que dependen de `age`,
  `FULL_ONLY_TESTS`/`FULL_ONLY_PREFIXES`, `prepare=skipped`) desaparece junto con su
  filtro y su prueba de lista. Motivo: sin perfil en el que ejecutarse no tenía
  consumidor, y mantener una lista de exclusión sin uso invita a que se desincronice de
  la suite. `full` ejecuta la suite API **completa** con `age`, preparación Linux,
  Chromium y E2E; no queda ningún camino que filtre pruebas por dependencia. `age`,
  `prepare` (`success`) y `browser` (`success`) son obligatorios en `full` y
  `skipped` en `docs`/`fast`, y `ci-result` lo exige literalmente.
- **Flujo de integración `feature/* → test → main` (TEST-BOOTSTRAP-01, 2026-11-07):**
  `test` es la base de integración: los PR de trabajo apuntan a `test` y ejecutan
  `fast` (o `docs` si el diff es solo documentación); `main` conserva su ruleset y
  recibe la promoción. Se promueve el
  mismo SHA validado en `test`, sin añadir ni reescribir cambios después de la
  validación; un PR de promoción `test → main` vuelve a ejecutar el gate contra `main` y
  cualquier diferencia exige validación propia. No se promueven commits no validados en
  `test`. Bases de PR distintas de `main`/`test`, pushes de ramas de trabajo, tags
  ajenos a `deploy-test-v*` y eventos incompletos fallan visiblemente. El tag
  `deploy-test-v*` valida y fija su commit exacto con `full`; un PR valida su merge
  ref. La protección/ruleset de `test` y sus required checks son una operación separada
  no aplicada por este cambio; `rootless.yml` acepta PRs a `main`/`test` con los mismos
  paths y guardas, y ya no reacciona a un push de `test`.
  [SPEC35 §6](../35-deploy-tags-01-specification.md#6-estrategia-de-ramas)
  conserva su texto aprobado (`feature/* → main`) hasta que su dueño lo actualice: este
  apartado posee solo la mecánica de CI y no reescribe esa decisión funcional.
- **Visibilidad del perfil (2026-11-11):** el job obligatorio conserva el nombre fijo
  `required` (sin `name`, el check se llama como el id) y su step summary publica
  `Perfil CI: DOCS|FAST|FULL`. Un job adicional `profile`, dependiente de
  `required` con `always()` y sin pasos de verificación, lleva el perfil en el nombre
  del check: `CI profile: docs|fast|full` (`UNKNOWN` si falta el output). Así
  la lista de checks de la PR muestra el perfil sin permisos `checks: read` ni un paso
  extra que consulte la API. El nombre del run no puede mostrar el perfil porque se
  evalúa antes de clasificar. El nombre `required` no configura por sí solo la
  protección de rama.
- **Deploy por tag (2026-11-11):** `rootless.yml` conserva PR por paths, tags
  `deploy-test-v*` y manual, sin push de `test`. No ejecuta suites de aplicación: el job
  `qa` se retiró porque `bun test apps/web` pertenece a los perfiles canónicos, así que el
  tag la ejecuta dentro de `required` full sobre el mismo commit y no se repite aparte.
  Antes de desplegar se conservan las guardas de tag, actor,
  ancestro en `origin/test`, anotación `sha`/`qa_reference` y SHA exacto, y se espera
  hasta 35 minutos a que el `required` del propio tag figure en `success` sobre `TAG_SHA`;
  un fallo terminal conocido o el timeout detienen el deploy. La consulta filtra
  `event=push`, `head_sha=RELEASE_SHA` y `head_branch=<tag>`: **no consume el check de la
  PR** ni un check antiguo que comparta SHA, así que un PR verde nunca sustituye al FULL
  del tag. No se debilita ningún control
  por esperar. El tag debe ser **anotado**: `git cat-file -t refs/tags/<tag>` tiene que
  devolver `tag`; un tag lightweight se rechaza antes de ejecutar `full`. Un
  `workflow_dispatch` manual de `rootless` no sustituye el gate de aplicación; para
  typecheck/build/baseline hay que lanzar `Validate project` full sobre el mismo SHA.
- **PROD — regla obligatoria (contrato, no implementado):** hoy no existe workflow de
  producción y este cambio **no** lo inventa. Cuando se implemente, el contrato es el
  mismo que TEST y no admite atajos: (1) un tag de PROD (p. ej. `deploy-prod-vX.Y.Z`)
  debe ser **anotado** y resolver a un commit exacto; (2) ese commit debe ser el mismo
  SHA ya validado en `test`, sin reescrituras; (3) el despliegue solo puede empezar con
  el **FULL del propio tag** en `success` sobre ese commit exacto — run de
  `validate.yml` con `event=push`, `head_sha=<commit>` y `head_branch=<tag>`; (4) no
  valen como sustituto el check de un PR, un run de otro SHA, un `workflow_dispatch`
  manual de despliegue ni un PASS declarado; (5) ausente, fallido, cancelado o fuera de
  plazo ⇒ no se despliega y el job falla visiblemente; (6) el *environment* de GitHub y
  su aprobación son controles adicionales, no equivalentes; (7) implementarlo exige su
  propia SPEC, un `DEPLOY_TAG` de PROD en `scripts/ci_policy.py` (selección `full`,
  igual que TEST) y regresiones que fijen los puntos 1–5. Hasta entonces, ninguna rama
  puede publicar en producción: no hay workflow, secreto ni tag de PROD configurado.
- **Crédito QA por árbol (2026-11-11):** la QA independiente se registra sobre el commit
  revisado y se reutiliza en el commit de integración solo si
  `scripts/check-evidence --qa-equivalence` demuestra identidad de árbol o composición
  limpia sobre el primer padre, y `qa_reference` resuelve a una review, comentario de PR o
  comentario de commit del SHA revisado con veredicto favorable (`APPROVED` o `qa=APTO`).
  Cubre merge, squash y rebase; conflicto resuelto,
  cambio extra o evidencia insuficiente bloquean. El preflight vive en `rootless.yml`; no
  añade workflow, job ni perfil, ni CI post-merge. La CI `required` full del tag sigue
  ejecutándose sobre el SHA exacto. La equivalencia no es aprobación de QA, ni de merge, ni
  de despliegue.
- **Focused (no implementado):** si en el futuro se necesita un perfil más estrecho, la
  vía simple es filtrar suites de test por paths de forma explícita y probada (mapa de
  rutas → suites), sin crear un perfil nuevo ni un workflow adicional; requiere su
  propia SPEC y regresiones antes de aplicarse.
- **Documentación (actualización 2026-10-28):** `docs` admite cualquier `.md` de
  documentación en cualquier directorio, sin allowlist de familias. Se excluyen siempre
  `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, `instructions.md`, `NEW_PROJECT_PROMPT.md`,
  `PROMPT_BACKUP*.md`, `.agents/`, `.claude/`, `templates/`, `specs/methodology/`,
  `specs/guidelines/`, `specs/README.md`, `docs/CLAUDE_CODE.md`,
  `docs/GUIA_VISUAL_ORQUESTACION.md` y cualquier Markdown funcional bajo `apps/`,
  `packages/`, `tests/`, `scripts/`, `.github/`, `specs/fixtures/`, `build/` o `dist/`.
  Mezclar documentación con código/configuración conserva el perfil de mayor riesgo;
  renombrados y eliminaciones se evalúan en ambos extremos. Non-Markdown, rutas
  desconocidas y clasificación incierta siguen siendo `full`. Limitación conocida
  (2026-10-28): `validate-template` comprueba enlaces en `AGENTS.md`, `README.md`,
  `NEW_PROJECT_PROMPT.md`, `specs/**`, `templates/**` y `.agents/skills/**`; cualquier
  `.md` admitido fuera de esas rutas (por ejemplo `docs/`, `infra/` o un futuro
  `CONTRIBUTING.md`) aún no tiene comprobación completa de enlaces relativos. Se
  registra como cobertura pendiente y no reduce el baseline actual.
- `fast` es el perfil de PR y no depende de las rutas: cualquier cambio no documental
  (TS/TSX, API, persistencia, migraciones, infra, dependencias, harness, instrucciones,
  rutas nuevas o desconocidas) ejecuta baseline + typecheck + build + suite web. La
  cobertura de API/SQLite y E2E no se omite: se traslada al FULL del tag, que es
  obligatorio antes de desplegar. Borrados y ambos extremos de renombres cuentan para
  decidir `docs`. Clasificación incierta nunca selecciona `docs`.
- Ubuntu24.04 x64 conserva acciones SHA, historia completa y permisos de lectura.
  `ci_prepare_linux.py` ya no tiene modo reducido: solo se ejecuta en `full`, donde
  instala la lista completa (`age` + Chromium y sus paquetes). `fast` no instala ni
  `age` ni Chromium; por eso `prepare` y `browser` valen `skipped` fuera de `full` y
  `ci-result` lo exige literalmente.
- SQLite local requiere Linux Debian13/glibc aislado compatible con producción,
  Bun1.4.3 y arquitectura de destino; usar filesystem Linux para WAL, bloqueos,
  permisos y renameat2. macOS, Ubuntu CI y un bind mount de macOS no demuestran
  por sí solos equivalencia Debian/host. Si falta ese entorno, registrar BLOCKED;
  no afirmar QA completa ni integrar por un CI verde.
- Evidencia y QA siguen el apartado portable de validez anterior, en testplan y
  checkpoint existentes: candidato limpio, base vigente y árbol de integración,
  versiones/arquitectura/filesystem, comandos, fecha, salidas crudas, conteos y
  código de salida. El coordinador comprueba esos objetos contra Git y los logs;
  QA inspecciona el diff y reproduce los controles de riesgo independientemente.
  Un PASS declarado, log inaccesible o evidencia para otra base/candidato bloquea.
  `scripts/check-evidence --candidate SHA --base SHA --environment ENV
  --log NAME=PATH [--linux-required NAME] [--record TESTPLAN]` comprueba candidato
  limpio, HEAD, ancestro/base vigente, logs crudos y registro existente; solo exige
  entorno Linux/glibc para los logs declarados en `--linux-required`. No prueba la
  autenticidad del log: QA sigue leyendo la salida cruda. El gate rápido **no**
  autentica pruebas locales; no se añade un registro ni hook.
- Codex lee AGENTS/Skills; Claude Code importa AGENTS y delega en las mismas Skills.
  No cambia ningún adaptador ni se depende de hooks opcionales. Protección de main
  requiere verificación y autorización separada; el nombre required no la configura.

### Historia de adopción — selección CI anterior sustituida

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
Allowlist docs (ampliación autorizada por el usuario el 2026-10-24):

- Archivos `.md` directamente dentro de `specs/backlog/`.
- Documentos directamente en `specs/` con número de dos dígitos, slug de segmentos
  alfanuméricos minúsculos separados por guiones y sufijo `-brainstorming.md`,
  `-specification.md`, `-progress.md` o `-testplan.md`.
- Archivos exactos `specs/project.md`, `specs/roadmap.md`, `specs/setup-progress.md`,
  `specs/epic-board.md` y `specs/functional-reference-v5.11.md`.

Siempre se excluyen nombres `AGENTS.md`, `CLAUDE.md`, `SKILL.md` e `instructions.md`
(sin distinguir mayúsculas). No hay permiso general por extensión ni para subcarpetas.
Estas rutas son documentos de producto/seguimiento, no instrucciones ejecutables del
agente; una futura incorporación de instrucciones exige reclasificar su ruta como full.
Instrucciones, Skills, metodología,
guías, SQL, dependencias/lockfiles, configuración, workflows, harness, código y rutas
desconocidas son full. Mezclar cualquier ruta full con documentación produce full.
La corrección no modifica el grafo ni omite baseline/required: el propio cambio del
clasificador requiere full. Solo comparaciones posteriores compuestas exclusivamente
por las rutas documentales permitidas pueden omitir pruebas de aplicación.

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

## Adaptación histórica v2.7.0

Fuente fijada: agent-project-template v2.7.0, commit
`ed61c62ea62dc378d2281222dfec6ebecada2410`. Solicitud del usuario del 2026-10-24.
Este apartado actualiza el estado histórico anterior; la adopción está en preparación
local y requiere PR, CI y aprobación específica antes del merge.

Entrada compartida: `python3 scripts/verify`, desde la raíz, Python 3.10+.
Sin comparación verificable ejecuta full. Admite `--base SHA --head SHA` y
`--pull-request` para comparar mediante merge-base; `--full` fuerza toda la batería.
Las fases `classify`, `baseline`, `application` y `result` permiten al workflow usar
la misma implementación; una fase aislada no acredita la verificación completa.
Baseline conserva seguridad, estructura, regresiones del harness y whitespace en
ambas clases (sustituido para el perfil CI `docs` el 2026-10-28: el baseline
documental conserva seguridad, estructura, enlaces y whitespace y omite solo las
regresiones `test-*`; `fast`, `critical`, `full` y `--full` local conservan todo).
Application ejecuta tipos, build, API/SQLite y E2E una vez cada uno.
Solo se conserva la repetición histórica explícita AC23 en feat/07-ciclos-operacion.
La instalación congelada, age y Chromium se preparan por separado en Actions.
Herramientas ausentes, errores, salida inválida, cero pruebas o skips inesperados
fallan visiblemente. Required conserva el cierre fail-closed del grafo.

Se mantienen las familias documentales acotadas. `specs/README.md` es full porque
contiene instrucciones operativas de ownership; no se concede permiso por extensión.
No se añaden clasificación UI, cachés ni retirada de AC23. Se preservan contexto de
integración, concurrencia y preparación Linux ya aprobados.

Los informes locales y hooks de uso de v2.7.0 son opcionales y advisory. Las pruebas
usan registros sintéticos; no acreditan activación ni confianza del cliente Codex.
No se modifican configuración global, trust, decisiones financieras ni código de app.

La selección docs exige un checkout limpio y, con `--head`, ese mismo commit en HEAD.
Cambios locales sin commit o un snapshot distinto fuerzan full conservadoramente.
