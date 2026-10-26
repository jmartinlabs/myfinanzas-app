# MyFinanzas — aprobaciones explícitas (v2.14.0 selectiva)

Fuente única de las reglas de aprobación para `$orchestrate` (Claude: `/orchestrate`),
subagentes, Skills y wrappers. Contrato base de agent-project-template v2.14.0, adaptado
desde la versión local v2.5.0 y la propuesta local v2.3.2 (PR #35, sustituida).
Complementa los gates de [coordinación](myfinanzas-coordination.md) y la
[política Git](../../AGENTS.md); ante conflicto prevalece la regla más estricta.
Es una **regla de comportamiento**, no un hook ni una garantía técnica de GitHub.
`.claude/settings.json` solo añade confirmaciones `ask` en Claude Code; no concede ni
sustituye aprobaciones.

## Qué requiere aprobación individual

- **Merge de cada PR**: aprobación expresa de esa PR concreta; no bastan desarrollo
  aprobado, CI verde, QA terminada ni «prepara una PR».
- **Especificación y wireframes**: prepararlos o revisarlos no es aprobarlos; aprobar
  una spec tampoco autoriza `$dev`.
- **Desarrollo de cada entrega**: autorización de desarrollo separada (gate MyFinanzas).
- **Decisiones financieras o de producto**; cambios materiales de arquitectura,
  seguridad o alcance; cambios de roadmap.
- **Operaciones destructivas**, migraciones sobre datos reales, despliegues, acceso al
  VPS u otro acceso sensible, y cambios de permisos o visibilidad del repositorio.

CI verde, QA terminada, un plan aprobado, una autorización anterior o código terminado
**nunca implican** aprobación de otra acción protegida.

## Trabajo ordinario (sin nueva aprobación)

Dentro de un alcance ya autorizado no se pide permiso por cada paso: implementación,
pruebas, subagentes, ramas, commits, correcciones técnicas y worktrees locales que
cumplan la política siguiente. La publicación sigue la sección siguiente. Es continuar
trabajo autorizado, no una acción protegida.

## Publicación de rama y PR

La autorización para realizar el trabajo —código o documentación, incluida la redacción
o edición de una especificación— también autoriza publicar su rama y crear o actualizar
su pull request en el repositorio existente. No se necesita otra aprobación de
publicación.

- Respetar instrucciones explícitas como «solo local» o «no publiques»; no toda tarea
  requiere PR.
- Antes de publicar, revisar todos los commits que se enviarán, el diff, los archivos
  preparados, los secretos y los cambios ajenos, conforme a la
  [política Git](../../AGENTS.md).
- Un PR en borrador es válido mientras queden checks o decisiones pendientes, nombrándolos.
  Un PR abierto no termina la tarea mientras queden checks ejecutables; completar los
  checks y la QA requeridos antes de declararlo listo para merge.
- Actualizar el PR existente de la tarea en lugar de abrir otro duplicado.
- Crear o integrar un PR de especificación no aprueba su contenido ni autoriza el
  desarrollo cuando esos son gates separados.
- El merge de un PR siempre requiere aprobación explícita e identificable de ese PR y del
  candidato aprobado. Nunca activar auto-merge como atajo. Tampoco se hace merge por
  inferencia de esta autorización de publicación.

Esta política no cubre crear repositorios, cambiar visibilidad, pushes directos a ramas
protegidas, force pushes, releases, paquetes ni despliegues. Siguen protegidos o prohibidos
según las reglas del proyecto. La Skill `$handoff` conserva su prohibición de abrir un PR
nuevo.

## Lenguaje válido y no válido

- Una autorización protegida requiere **verbo afirmativo explícito** y **objeto
  inequívoco**: `Apruebo PR #34`, `Apruebo el merge de la PR #34`,
  `Apruebo la especificación 07`, `Autorizo desarrollo de E2.1`.
- `Aprobado`, `Aprobada` o `Apruebo` sin identificador valen **solo** si responden
  inmediatamente a **una única** solicitud de aprobación inequívoca.
- `dale`, `ok`, `okk`, `sí`, `continúa`, `adelante`, `sigue`, `go ahead`, silencio,
  reacciones y confirmaciones genéricas **nunca** autorizan merges, specs, despliegues,
  nuevas decisiones financieras ni otras acciones protegidas. Solo permiten seguir con
  tareas **ya autorizadas**.
- Pedir una decisión protegida cada vez, con su objeto. Nunca agrupar merge, aceptación
  de spec, despliegue y autorización de desarrollo en una aprobación inferida.
- Ante ambigüedad de objeto, revisión, intención u origen, hacer una pregunta corta y
  detener solo la operación afectada; el trabajo independiente permitido continúa.

## Evidencia y validez

1. Antes de pedir aprobación, identificar decisión y objeto: PR número + HEAD SHA;
   spec ID + revisión; entrega/alcance de desarrollo; entorno si corresponde.
2. Tras autorizar, registrar en tablero o checkpoint: decisión, objeto/revisión y texto
   del mensaje **real del usuario**, con fecha. Un commit o nota de agente que diga
   «usuario aprobó» **no demuestra** que existió aprobación.
3. No volver a pedir una autorización inequívoca ya concedida para el mismo objeto y
   revisión. Nunca extenderla a otra PR, revisión de spec o despliegue.
4. Antes de actuar, volver a verificar objeto, estado Git, CI requerida y gates. Un
   cambio material posterior (nuevo SHA, contenido o artefacto) exige nueva aprobación.

## Ejemplo de merge de PR

El coordinador presenta: `PR #34 lista, HEAD abc123, CI verde. Para autorizar el merge
responde «Apruebo PR #34».`

- `dale`: **no** hay merge; pedir aprobación explícita.
- `Apruebo PR #34`: comprobar HEAD y CI y fusionar **solo esa PR** (squash, fijando HEAD).
- Una especificación pendiente se pregunta por separado.
- `continúa` tras agotar cuota: retomar el alcance autorizado, sin permisos nuevos.

## Worktrees locales

Un worktree local no necesita aprobación individual cuando apoya trabajo ya autorizado,
aporta aislamiento útil y no afecta a trabajo existente. Antes de crearlo, comprobar
alcance, estado Git (incluidos cambios sin commit o sin seguimiento), worktrees
existentes, rama y destino. Usar una ubicación nueva sin conflicto; nunca sobrescribir,
mover ni descartar cambios. Si no se puede verificar, mantener el checkout actual o
detener ese paso. Detalle local de ownership y limpieza:
[coordinación](myfinanzas-coordination.md#scheduler-propiedad-y-ejecución).

Un work packet asigna responsabilidades y ownership; un worktree aísla; la autorización
viene del alcance concedido por el usuario. Ninguno concede tareas nuevas, acciones
protegidas ni merges; la publicación solo es ordinaria dentro del alcance autorizado
y conforme a la sección anterior.

Garantías técnicas más fuertes (hooks, rulesets o branch protection) requieren
configuración separada y una fuente de autorización que los agentes no puedan editar;
no se configuran por inferencia.
