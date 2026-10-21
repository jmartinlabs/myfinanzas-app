# 31 — Inicialización segura de SQLite: Brainstorming
Status: APPROVED — requisitos, decisiones D1–D4 y AC-01–33 aprobados.
Roadmap/context: [contexto](project.md), [roadmap](roadmap.md), [infraestructura](../infra/README.md).
Next action: cierre documental de `$spec 31` e inicio autorizado de `$dev 31`, sin merge.

## Round 1 — 2026-10-21

### Fuente y alcance confirmados
Solicitud adjunta del usuario «$spec — Inicialización segura de SQLite para producción».
Autoriza análisis y documentos, no implementación, acceso al VPS, despliegue, datos
reales, importación del Excel ni modificación/cierre/merge de las PR #21/#22.
Excel v5.11 continúa como maestro. Las ocho etapas iniciales permanecen cerradas;
se reutilizan `$spec` y, posteriormente con aprobación y autorización, `$dev`.

Identificador **31**: extensión técnica transversal, ajena a las 30 entregas
financieras. Se deja 06–30 disponible para ellas, incluida E1.6. Esta elección
aplica la petición expresa de evitar colisiones con módulos planificados sobre
la regla general del Skill de asignar el siguiente número libre. No añade una
entrega al roadmap ni reserva contratos financieros mediante esta numeración.

Confirmados por la solicitud: VPS Aruba/Debian 13, 2 vCPU/4 GB/40 GB, Caddy/HTTPS,
UFW, SSH por claves, Podman rootless/Quadlet y directorios privados preparados;
solo página estática, sin aplicación ni datos reales. Son observaciones del
usuario, no comprobaciones de Codex sobre el servidor.

### Inspección actual y fuentes

| Fuente | Evidencia / límite |
| --- | --- |
| `main` local y remoto | `0d6cfc0e4622e00e1084aefb35987b1954c5e3ef`; árbol inicialmente limpio; esquema 5 |
| PR #19 | Commit integrado `5492360` presente en historia de main; plantillas `.example` y documentación de preparación |
| E1.5 / PR #18 | Integrada en `0d6cfc0`; los textos que aún dicen «en revisión» son históricos/desactualizados |
| PR #21 | Ref descargada `3919e0a0052b48ca8a60e01f4b42339ec4e2532c`; añade solo `infra/production-bootstrap-spec.md` |
| PR #22 | Ref descargada `e1c6402afd2e12f762a460affe60510d289e9266`; cinco commits respecto de main, cuatro archivos de API/pruebas |
| Estado de PR y CI en GitHub | `gh pr view` y `gh run view 39650715325` devuelven 403; no se ha podido verificar estado abierto/draft, checks o log remoto actuales |
| Estado declarado por usuario | #21/#22 abiertas en borrador y sin integrar; CI de #22 falla en tests y no ejecuta Playwright. Se conserva como fuente del usuario |

Git HTTPS permite lectura de refs/contenido; no demuestra acceso a la API de
GitHub. No se solicita un token ni se afirma haber inspeccionado el log remoto.
Los commits de #21/#22 no son ancestros de la base main inspeccionada.

### Diagnóstico de #21

La separación esquema/fixtures, el origen persistente, las rutas explícitas,
la ausencia de conversión demo→production y la conservación de migraciones son
una buena base. No es una especificación aprobada y faltan decisiones verificables:
separación también production→demo, versionado del marcador, publicación conjunta
DB/clave, defensa contra carreras y enlaces, alta privada utilizable y contrato
de restauración. La mención a E1.5 en paralelo ya no corresponde a main actual.
La propuesta 31 recoge esas intenciones y concreta un contrato propio.

### Diagnóstico de #22 y evidencia local

Se exportó el commit a un directorio temporal, sin checkout adicional ni cambio
de código. Bun 1.4.3 y lockfile congelado; `age` 1.2.1 instalado desde Debian.
Primero se corrigió la resolución de dependencias del entorno temporal con la
instalación congelada; ese fallo de preparación no se atribuye a la PR.

`bun run test`: **55 pass / 1 fail**, 56 tests en seis archivos. La prueba
`semilla demo solo en development/test; otros entornos no crean ni modifican bases`
falla en `apps/api/src/app.test.ts:818`: espera «E1.1 solo admite», pero el rechazo
usa «Entorno no permitido…». En ese punto prueba el entorno ausente; el fallo
interrumpe las comprobaciones posteriores de esa misma prueba. No demuestra que
todos los rechazos siguientes se hayan ejecutado. Es una reproducción local del
síntoma, no identificación confirmada del log remoto 39650715325.

Cambiar esa expectativa podría corregir este fallo, pero no completaría seguridad:

| Hallazgo | Evidencia | Riesgo / corrección propuesta |
| --- | --- | --- |
| Producción abierta en `test` | Inicializar con origen production, después `openDatabase` en test devuelve la conexión | Separación unidireccional; exigir matriz simétrica antes de escrituras |
| Bypass público | `openDatabase(ruta, true)` crea una base production dentro de `nested/.local/` sin pasar por el inicializador validado | Quitar booleano privilegiado público y compartir validaciones en todos los accesos |
| Directorio no vacío aceptado | Inicializador acepta padre 0700 con un archivo ajeno | Diferenciar raíz privada y destino nuevo exclusivo; nunca mezclar ni sobrescribir |
| Clave/alta ausentes | Inicializador no crea `auth.key`; setup rechaza production incondicionalmente | No hay recorrido productivo de contraseña/TOTP terminado |
| Carreras y enlaces | `existsSync` antes de apertura, `statSync` que sigue enlaces y verificación en una conexión distinta | Riesgos por inspección estática; carreras/symlinks no ensayados exhaustivamente. Exigir reserva exclusiva y validación de identidad bajo bloqueo |
| Compatibilidad productiva limitada | Verificador exige exactamente esquema 5; no identidad demo ni evolución aprobada del marcador | Diseñar v6 y migración local explícita, sin aceptar como confiable una producción preliminar |
| Cobertura insuficiente | Dos tests nuevos; el test titulado «permissive directory» no cambia permisos | Faltan casos reales de permisos, concurrencia, fallos, claves, alta y restore productivo |

No se han ejecutado Playwright de #22 ni un despliegue. Las cuatro comprobaciones
de comportamiento de la tabla se hicieron exclusivamente con archivos ficticios
temporales y sin imprimir factores ni claves. No se implementó ninguna corrección.

### Propuesta para revisión completa

No se requieren respuestas financieras ni datos del servidor para redactar este
contrato. Los detalles técnicos ordinarios se concretan como recomendaciones;
su aprobación será la de la especificación completa, no una respuesta inferida.

- [x] D1 — Origen persistente demo/production en esquema 6 y separación simétrica;
  v1–v5 sin marcador solo migran en development/test. Recomendación, no aprobación.
- [ ] Alternativa D1 — Marcador sin incremento de esquema; complica distinguir
  el contrato aprobado de la propuesta preliminar de #22.
- [x] D2 — Inicializar DB+clave en destino nuevo exclusivo, validar y publicar
  como conjunto; ningún arranque ordinario crea producción. Propuesta.
- [ ] Alternativa D2 — Crear solo DB y esperar que el arranque cree la clave;
  deja estados parciales y debilita el rechazo ante pérdida de clave.
- [x] D3 — Reutilizar contraseña/TOTP y UI existentes; emitir el token inicial
  a un archivo local exclusivo 0600, nunca stdout/stderr. Propuesta.
- [ ] Alternativa D3 — Mantener producción sin alta operativa; no cubre el
  recorrido solicitado y obligaría a otra especificación para terminarlo.
- [x] D4 — Extender backup/restore para preservar identidad y vínculo DB/clave,
  manteniendo lectura de copias v1–v5 como demo histórica. Propuesta.
- [ ] Alternativa D4 — Habilitar apertura productiva sin restore probado;
  incompatible con las garantías de recuperación solicitadas.

Confirmed answer: los requisitos y exclusiones de la solicitud están confirmados
por el usuario el 2026-10-21. **D1–D4 y la especificación siguen PENDING**;
no se han presentado como respuestas del usuario. No hay una ronda independiente
de preguntas materiales sin resolver: se solicita revisión del contrato completo.

## Coverage

Funcionalidad: creación explícita, apertura, migración, alta, copias/restauración.
Interfaces: CLI privada y API/UI de autenticación existentes. Datos: esquema,
metadatos de origen, clave y factores. Dependencias: Bun/SQLite/age ya existentes.
Validaciones y fallos: permisos, rutas, versiones, carreras, caída, falta de clave,
env incorrecto, restauración y límites de autorización. AC en la especificación.

## Wireframes

N/A: entrega técnica sin nuevas pantallas ni cambio de diseño. Se reutiliza
el recorrido aprobado de token → contraseña → TOTP → códigos de recuperación.
Las interfaces CLI y sus salidas se describen en la especificación; la regresión
visual existente seguirá siendo obligatoria durante `$dev`.

## Append-only clarifications

Pendiente: aprobación expresa de la versión completa, registro de fuente/fecha,
commit documental aprobado y autorización para `$dev 31`. No se ha hecho commit,
push, merge ni modificación de las PR #21/#22. Si las refs cambian, revalidar el
diagnóstico antes de reutilizar esta evidencia.

### Publicación provisional autorizada para revisión

El usuario solicitó publicar exclusivamente brainstorming y specification de 31
en la rama de trabajo y abrir PR en borrador hacia main para revisión de Álex.
Tras explicitar la restricción del paso 6 de `$spec` (commit solo de documentos
aprobados), confirmó «si» a la excepción expresa limitada a esa publicación.
Se registra la excepción sin modificar el Skill ni presentar la especificación
como aprobada. El párrafo anterior conserva el estado anterior a esta autorización.

La aprobación del contrato completo y la autorización de `$dev 31` siguen
pendientes. No se autoriza merge, despliegue, cambios de código ni modificaciones
a las PR #21/#22. `specs/setup-progress.md` tiene un cambio local previo que se
preserva fuera de esta publicación; no forma parte del commit ni de la PR.

### Confirmación expresa posterior — 2026-10-21

Fuente: mensaje del usuario en esta conversación tras revisión con Álex:
«apruebo íntegramente su contenido, incluidas las decisiones D1–D4 y los 33
criterios de aceptación (AC-01 a AC-33)». D1–D4 quedan CONFIRMED y el contrato
completo APPROVED. Autoriza commits de cierre, actualizar PR #23 y comenzar
`$dev 31` tras completar `$spec`; implementación en PR independiente.
No se autoriza merge de ninguna PR, VPS, despliegue ni datos reales.
Esta confirmación sustituye los pendientes históricos, sin reescribir sus fuentes.
