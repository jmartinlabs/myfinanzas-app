# 32 — Lectura coherente de identidad durante apertura/migración SQLite

## Autorización y alcance

2026-10-22, Europe/Madrid. Fuente: respuesta expresa del usuario en este chat:
«Autorizo investigar y corregir únicamente la ruta técnica de apertura/migración
SQLite, sin cambiar reglas financieras». No autoriza VPS, despliegue ni merge.
Solo cambia la validación de apertura demo/memoria en database.ts y se añade B5.
Sin modificar SQL de migraciones, identidad, finanzas, MFA ni tests existentes.

## Incidencia observada y límite causal

Run39734977613 / 77e4982: E1.4 concurrente falla en hijo de upgrade v3, ubicaciones
movimientos.test.ts:885:16 / :910:21; 89 PASS/1 FAIL, sin timeout. Los códigos del
hijo no están disponibles en las anotaciones originales. Los verdes posteriores
no diagnostican esa ejecución ni se usan como corrección por repetición.

La investigación demuestra una carrera real en esa misma ruta, sin atribuir
retrospectivamente un mensaje exacto al run histórico: inspectIdentity consulta
por separado existencia del marcador y schema_version. En autocommit, otro
proceso puede migrar entre ambas lecturas; combinar «marcador ausente» de v3 con
«versión 6» posterior provoca «Identidad ausente.» sobre una base válida.
Esto es una incoherencia temporal de lectura, no una regla financiera ni prueba
de SQLITE_BUSY. No se atribuye automáticamente a R6/API histórico39687644407.

## Reproducción determinista B5

`NODE_ENV=test bun test apps/api/src/sqlite-migration-opening.test.ts`:

1. Fixture genuina v3, exclusivamente ficticia, con contador técnico17 y WAL
   checkpointed. Directorio temporal privado; sin DB/clave del usuario.
2. Proceso lector real ejecuta openDatabase. Un espía solo introduce una barrera
   antes de SELECT schema_version de la conexión efectiva, después de leer la
   ausencia de database_origin. No sustituye resultados SQL ni inyecta errores.
3. FIFO del SO bloquea al lector. Otro proceso real abre/migra v3→6 y termina.
4. Se libera el lector. Antes de corregir: exit1/IDENTITY_ABSENT, 0 PASS/1 FAIL.
   Tras corregir: exit0/valid, 1 PASS/0 FAIL y seis aserciones; versión6, contador17,
   integrity_check OK y foreign_key_check vacío.

La FIFO sincroniza un interleaving concreto; no sleeps arbitrarios, reintentos SQL,
repetición hasta verde ni timeouts aumentados. El test nuevo conserva el timeout
por defecto; no se modifican concurrencia ni expectativas del test E1.4 existente.
Un sondeo separado sobre la sonda inmutable no reproduce ese fallo en este
interleaving y queda sin cambios; no se generaliza esa observación a otros casos.

## Corrección mínima y preservación de seguridad

Después del PRAGMA busy_timeout=3000 ya existente, envolver únicamente
assertMode(inspectIdentity(db), production) en una transacción DEFERRED de lectura.
Las lecturas comparten snapshot SQLite y no mezclan v3/v6. Se termina esa
transacción **antes** de prepareSchema y de su BEGIN IMMEDIATE: no hay upgrade
de una transacción diferida de lectura a escritura ni se cambia el bloqueo de
migración. El otro proceso puede confirmar la migración mientras existe el lector
WAL; B5 lo comprueba realmente.

La rama productiva retorna antes de esta línea y permanece intacta. También
permanecen la sonda persistente immutable=1 previa, verificaciones de inode,
permisos/enlaces/sidecars, pareja DB/clave, timeout3000 y propagación/cierre de
errores. No se añaden CREATE, fallback demo, regeneración, reparaciones ni
restauraciones. Se preserva la corrección temprana de timeout de main #31.

## Evidencia local y remota

Sobre corrección local: B5 PASS; suite completa **91 PASS/0 FAIL/1415 aserciones**,
tipos/build PASS. Incluye B1–B4, E1.4 concurrente, R6 y guardas/producción/restore.
La prueba B5 antes de aplicar el cambio falla por IDENTITY_ABSENT; una sustitución
de edición no aplicada conserva ese fallo, no constituye otro estado del producto.
El ensayo auxiliar tras aplicar el cambio devuelve live0/ok e immutable0/ok.
E2E y CI del commit corregido se registran en progress/testplan y PR #30.

La CI nueva debe ejecutar toda la suite y B5 dentro de la imagen definitiva,
además de repetir rootless/UID/red/Quadlet/rollback/backup/MFA. Ningún PASS local
sustituye esa ejecución. Solo después se puede cerrar AC-22 del código actual.
La atribución exacta del fallo77, R6 y el API histórico sigue limitada por la
falta del diagnóstico original; fsync post-rename conserva su riesgo residual.
