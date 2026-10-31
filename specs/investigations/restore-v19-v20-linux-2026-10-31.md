# Restore v19/v20 en Linux — alcance técnico

Fecha: 2026-10-31. Autor: orquestador OpenCode. Estado: **alcance propuesto**.
No ejecuta pruebas, no modifica código y no autoriza DEV, datos reales, despliegue
ni activación. Es un expediente de trabajo para una tarea independiente.

## 1. Motivo

Las entregas de Comida (esquema v19) y D′ (esquema v20) están integradas en
`main`, pero la validación de restore de sus copias sigue sin acreditarse. El
fallo local de macOS por `libc.so.6` y el gate rootless no son evidencia
equivalente: el primero es una limitación de plataforma y el segundo comprueba
contratos de release, no la restauración cifrada de una copia v19/v20.

## 2. Hechos verificados

- `main`/`origin/main`: `2e710c0` (PR #146). Esquema vigente: **v20**.
- PR #136 integrada en `7f3a66c` (Comida, v19); PR #137 integrada en `e0249c5`
  (D′, v20). CI postmerge `Validate project` PASS: run `41235452202`.
- `backup.ts` acepta esquemas `1..20`; el manifiesto etiqueta las copias v19 como
  `e3.4-v19` y las v20 como `e2.7-v20`.
- `restore()` publica en un destino nuevo, verifica manifiesto/contrato e invalida
  sesiones e intentos según el contrato vigente. No hace downgrade destructivo.
- Contratos congelados disponibles en `schema-contracts.json`:
  `C19-COMIDA-UNICO-01` (209 objetos) y `C20-DPRIMA-SIMPLIFICADA` (258 objetos).
  `materializeContract()` permite construir fixtures aisladas de ambos esquemas.
- No existe un expediente dedicado previo a restore v19/v20. El informe
  [rootless-schema-upgrade-2026-10-31](rootless-schema-upgrade-2026-10-31.md)
  propone una matriz v18→v19/v20→backup→restore, pero está vinculada al gate
  rootless y no se ha ejecutado.
- Cobertura existente: `inversiones-backup.test.ts` y `referencias.test.ts`
  incluyen v13–v17 y v20 (`referencias.test.ts` cubre además versiones
  anteriores); `d5-backup.test.ts` cubre v18; `app.test.ts` cubre el restore
  genérico del esquema vigente. **Ninguna prueba dedicada cubre una copia v19.**
- SPEC16 CU-11 mantiene el restore como UNRUN/PARCIAL; SPEC33 AC-19 sigue UNRUN.
- El fallo de macOS (`Failed to open library "libc.so.6"`) afecta a la ejecución
  local; no acredita ni invalida el comportamiento en Linux.

## 3. Artefactos reutilizables

| Artefacto | Uso | Límite |
| --- | --- | --- |
| `apps/api/test-support/restore-server.ts` | Servidor E2E que hace backup, restore y abre la copia | No es una prueba de matriz de versiones |
| `apps/api/test-support/inversiones-schema.ts` | `materializeContract()` para fixtures congeladas | Requiere sembrar filas y clave |
| `apps/api/src/inversiones-backup.test.ts` | Patrón backup→restore→verificación | No incluye v19 |
| `apps/api/src/referencias.test.ts` | Matriz de versiones y etiquetas de manifiesto | No incluye v19 |
| `apps/api/src/d5-backup.test.ts` | Contrato de restore v18 | No cubre v19/v20 |
| `apps/api/src/app.test.ts` | Restore cifrado, antigüedad, clave errónea y publicación atómica | Esquema vigente, no matriz histórica |
| `apps/api/src/backup.ts` | Implementación y etiquetas v19/v20 | No sustituye la prueba |

## 4. Alcance propuesto

Tarea independiente, solo fixtures ficticias y sin datos reales:

1. **Fixture v19:** materializar `C19-COMIDA-UNICO-01`, sembrar filas
   representativas (Movimientos, devolución de gasto, metadatos, atribución,
   auditoría, identidad y una sesión/intento), generar clave y ejecutar `backup`.
   Verificar manifiesto `app: e3.4-v19`, `schema: 19` y origen.
2. **Restore v19:** restaurar en directorio nuevo y comprobar que la copia
   conserva esquema 19, filas, vínculos, auditoría, identidad y clave; que
   sesiones/intentos quedan revocados; y que abrirla con la app vigente migra a
   v20 sin pérdida ni duplicación.
3. **Fixture y restore v20:** repetir con `openDatabase()` sobre esquema 20 y
   manifiesto `e2.7-v20`; comprobar datos de Comida y D′, identidad, auditoría y
   revocación de accesos.
4. **Negativos:** copia corrupta, clave ajena, destino existente, manifiesto o
   esquema desconocido, antigüedad vencida y fallo inyectado. Ningún caso debe
   publicar un destino parcial ni dejar restos `.restore-*`.
5. **Aislamiento:** `TMPDIR` privado 0700, `age` real, sin red, sin Excel y sin
   bases reales.
6. **Plataforma:** ejecución en Linux (Debian/glibc) con Bun 1.4.3. macOS no
   cuenta como evidencia. El gate rootless se mantiene como control separado.

## 5. Criterios de salida de la tarea

- v19 y v20 restauran y verifican con manifiesto, esquema y etiqueta correctos.
- v19 restaurada abre y migra a v20 conservando hechos, vínculos, auditoría,
  identidad y contadores.
- Los negativos fallan cerrado sin publicar destino parcial.
- La matriz se ejecuta en Linux y queda registrada con comando, run y evidencia.
- No se declara PASS de producto ni se cierran AC por esta prueba: solo se
  acredita el restore técnico que hoy está UNRUN.
- Sin cambios de contrato, datos reales, despliegue ni activación.

## 6. Fuera de alcance

- Implementar o modificar el gate rootless.
- Validar una release real o desplegar.
- Migrar datos reales, activar el régimen de Comida o cerrar E4.9.
- Sustituir la QA funcional, E2E o los AC de SPEC16/SPEC33.
- Cerrar DT6/T-BKP o declarar recuperación externa acreditada.

## 7. Riesgos y límites

- Una fixture v19 materializada no demuestra por sí sola que una copia real
  histórica sea restaurable; sí acredita el contrato y la ruta de código.
- La migración v19→v20 al abrir la copia restaurada debe probarse expresamente;
  verificar solo el esquema restaurado sería insuficiente.
- El resultado en macOS no se extrapola a Linux ni al contrario.
- La tarea requiere autorización separada de DEV/ejecución y no autoriza merge.

## 8. Siguiente paso

Solicitar autorización para ejecutar **RESTORE-19/20** como tarea independiente,
con este alcance y sin ampliar a rootless, release, datos reales ni activación.
