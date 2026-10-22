# MyFinanzas — aprobaciones explícitas (v2.3.2)

Política vinculante para `$orchestrate`, subagentes y Skills. Complementa los gates de
[coordinación](myfinanzas-coordination.md) y la [política Git](../../AGENTS.md).
Es una **regla de comportamiento**, no un hook ni una garantía técnica de GitHub.

## Qué requiere aprobación individual

- **Merge de cada PR**: requiere aprobación expresa de esa PR específica, no basta desarrollo aprobado, CI verde, QA o «prepara una PR».
- **Especificación y wireframes**: su preparación/revisión no equivale a aprobación; aprobar spec tampoco autoriza `$dev`.
- **Desarrollo de cada entrega**: requiere autorización de desarrollo separada cuando así lo exija la metodología local.
- **Decisiones financieras**; cambios materiales de arquitectura, seguridad o alcance;
  migraciones sobre datos reales, operaciones destructivas, despliegues y acceso sensible.

## Lenguaje válido y no válido

- Una autorización protegida requiere **verbo afirmativo explícito** y **objeto inequívoco**:
  `Apruebo PR #34`, `Apruebo el merge de la PR #34`,
  `Apruebo la especificación 07`, `Autorizo desarrollo de E2.1`.
- `Aprobado`, `Aprobada` o `Apruebo` sin identificador pueden ser válidos **solo** si
  responden inmediatamente a **una única** solicitud de aprobación inequívoca.
  Si hay dos decisiones pendientes, pedir aprobación individual para cada una.
- `dale`, `ok`, `okk`, `continúa`, `adelante`, `sigue`, `go ahead`,
  silencio y confirmaciones genéricas **nunca** autorizan merges, specs, despliegues,
  nuevas decisiones financieras ni otras acciones protegidas.
  Pueden significar seguir únicamente con tareas **ya autorizadas**.
- No incluir varias decisiones protegidas en una sola pregunta genérica.
  Solicita una por una con texto claro. Ante ambigüedad, detén solo la operación
  protegida y solicita confirmación concreta; continúa el trabajo independiente permitido.

## Evidencia y validez

1. Antes de solicitar aprobación, identificar decisión y objeto: PR número + HEAD SHA;
   spec ID + versión/revisión; desarrollo/alcance; producción/entorno si corresponde.
2. Tras autorización, registrar en el tablero/checkpoint: decisión, target/revisión,
   texto y referencia del mensaje **real del usuario**, fecha si disponible.
   Un commit o texto del propio agente que diga «usuario aprobó» **no demuestra**
   por sí solo que existió aprobación.
3. No volver a pedir una autorización inequívoca ya concedida para el mismo objeto
   y revisión. Nunca extenderla a otra PR, versión de spec o despliegue.
4. Inmediatamente antes del merge, verificar PR/HEAD, CI requerida y gates de Git.
   Si el contenido material de la PR cambió después de aprobarla, pedir nueva aprobación.

## Ejemplo obligatorio

El coordinador presenta: `PR #34 lista, HEAD abc123, CI verde.
¿Apruebas el merge de PR #34? Responde «Apruebo PR #34».`

- Respuesta `dale`: **NO** merge; pedir aprobación explícita.
- Respuesta `Apruebo PR #34`: comprobar revisión/CI y fusionar **solo esa PR**.
- La especificación E2.1 pendiente se pregunta por separado.
- `continúa` tras agotar cuota: retomar el alcance autorizado, sin nuevos permisos.

## Autonomía conservada

No pedir autorización para cada subagente, worktree, prueba, corrección técnica,
commit, push o preparación de PR dentro del alcance ya autorizado y de la política
local de Git. No configurar hooks o branch protection por inferencia: hacen falta
mecanismos/identidades independientes y verificación real para ofrecer garantías
técnicas más fuertes.
