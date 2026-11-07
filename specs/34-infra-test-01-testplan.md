# 34 — INFRA-TEST-01: Test plan

Specification: [34 — entorno TEST reproducible con datos ficticios](34-infra-test-01-specification.md)

Status: **APPROVED — plan aprobado por el usuario el 2026-11-04; D7 aprobada el
2026-11-05; reconciliación documental a v27/C27 y a `origin/test` (2026-11-07);
ejecución UNRUN.** No se ha ejecutado ninguna comprobación de esta entrega. Este test
plan no autoriza DEV, auditoría del VPS, DNS, Caddy, despliegue, datos reales ni merge.
Base: `origin/test` `0d25be9a1ae97d1dc7e2d94dcf004641973b4b8c` (2026-11-07), igual que
`origin/main`; esquema 27/C27 (`C27-E411-FOTOS-PERIODO`), `data_contract=e4.11-v27`.
Approval source/date: usuario, 2026-11-04 («Apruebo SPEC34/testplan y D1–D6»); D7:
usuario, 2026-11-05 (registrada en el cierre del PR #229, CLOSED sin merge).
Contrato de alojamiento: `vps-infra` PR #9 (MERGED `901204c`); su operación y autorizaciones
siguen fuera de este plan. El PR #7 está CLOSED, sin merge y con rama eliminada; solo es
antecedente histórico.
Documentos de referencia: [RUNBOOK](../infra/RUNBOOK.md),
[preparación de despliegue](../infra/README.md),
[SPEC35 — tags y promoción](35-deploy-tags-01-specification.md),
[seguridad](guidelines/security.md), [calidad](guidelines/quality.md).

## 1. Cómo leer este plan

- **Estado.** Todos los criterios empiezan en `UNRUN`. `UNRUN` no es `PASS` ni `FAIL`; solo
  indica que no hay evidencia ejecutada. Un `PASS` exige comando real, entorno y evidencia
  enlazada.
- **Entorno.** Cada criterio declara dónde se ejecuta. Una comprobación en un runner
  efímero no acredita el VPS Debian ni Caddy reales.
- **Owner.** Quién ejecuta y quién revisa. El owner operativo no aprueba la fase.
- **Fase.** La fase de §4 que debe estar autorizada antes de ejecutar.
- **Evidencia.** Qué se conserva en el expediente privado del operador. Nunca se publican
  secretos, cookies, TOTP, importes, IPs privadas ni bases de datos.

## 2. Entornos de prueba

| ID | Entorno | Qué acredita | Qué **no** acredita |
| --- | --- | --- | --- |
| E0 | Checkout local limpio y diff de la rama | Clasificación documental, alcance y enlaces | Ejecución real de infraestructura |
| E1 | Host de ensayo aislado o runner Linux efímero | Imagen, seed, UID, permisos, backup/restore sintéticos | Debian 13, Caddy, DNS y disco del VPS |
| E2 | VPS TEST real, tras autorización | Unidad Quadlet, loopback, HTTPS, persistencia y aislamiento | Recuperación ante pérdida física del host |
| E3 | Red externa y resolutores públicos | DNS, TLS, cookies y no exposición de puertos | Estado interno del host |
| E4 | Destino externo de copia aprobado por el usuario | Copia off-VPS y restauración desde ella | Custodia definitiva o SLA |

## 3. Matriz de criterios de aceptación

Todos los estados son `UNRUN`.

| ID | Método | Entorno | Evidencia | Owner | Fase | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| `INFRA-TEST-01-AC01` | Revisar `git diff` y clasificación con `python3 scripts/verify`; comprobar que solo se añaden la spec y el test plan | E0 | Salida de clasificación `docs`, lista de archivos del diff, `git diff --check` | myfinanzas-app / QA | 0 | UNRUN |
| `INFRA-TEST-01-AC02` | Congelar SHA de 40 caracteres alcanzable desde `origin/test` (referencia `0d25be9`); verificar E4.6/E4.7/E4.9/E4.10/E4.11 integrados, esquema 27/C27 y `data_contract=e4.11-v27`; comprobar que `FT-1` excluye sus módulos por D5/D7 y que la promoción a `main` es un merge explícito | E0 | `git rev-parse`, `git merge-base`, tablero, `database-identity.ts` y `schema-contracts.json` | myfinanzas-app / QA | 3 | UNRUN |
| `INFRA-TEST-01-AC03` | Construir release y artefacto de seed desde el mismo SHA; inspeccionar inventario de la imagen de producción | E1 | Manifiestos con IDs inmutables, checksums y listado de rootfs sin `tools/test-seed` | myfinanzas-app | 3 | UNRUN |
| `INFRA-TEST-01-AC04` | Ejecutar casos negativos del seed: origen PROD, marcador ausente/ajeno, ruta relativa, symlink, permisos incorrectos, esquema distinto de 27 (24/25/26 y desconocido), propietario existente, estado no vacío | E1 | Códigos `2`/`3`, mensajes sin secretos, estado intacto tras cada rechazo | myfinanzas-app / QA | 3 | UNRUN |
| `INFRA-TEST-01-AC05` | Sembrar dos veces desde estados limpios independientes y comparar manifiestos y checksums lógicos | E1 | Dos `seed-manifest.json` con la misma huella lógica; IDs, fechas e importes idénticos | myfinanzas-app | 4 | UNRUN |
| `INFRA-TEST-01-AC06` | Repetir `seed apply` sobre el mismo estado y manifiesto; introducir un estado parcial en un entorno de ensayo | E1 | Segundo apply `0` sin escrituras; parcial rechazado sin reparación | myfinanzas-app / QA | 4 | UNRUN |
| `INFRA-TEST-01-AC07` | Ejecutar `seed reset` con unidad parada; verificar destino archivado y ausencia de cambios fuera de la raíz TEST | E1, E2 | Árbol de rutas antes/después, hash del estado archivado, secuencia de recreación | vps-infra / myfinanzas-app | 8 | UNRUN |
| `INFRA-TEST-01-AC08` | Revisar `FT-1` contra la base v27/C27; comprobar que no crea cierres E4.9, reaperturas E4.10, fotografías E4.11, históricos E4.5 ni resumen anual E4.7, y que las tablas C25–C27 quedan vacías | E0, E1 | Diff revisado del dataset, conteos de tablas y omisiones registradas | myfinanzas-app / Álex | 3 | UNRUN |
| `INFRA-TEST-01-AC09` | `seed verify` + `PRAGMA integrity_check`/`foreign_key_check` + `schema_version=27` + contrato C27 + tablas C25–C27 a 0 + lectura API autenticada + smoke UI de Saldos, Movimientos, Ciclos, Deudas y Presupuesto | E1, E2 | Resultado `0`, consultas de solo lectura, capturas ficticias sin datos sensibles | myfinanzas-app / usuario | 4, 7 | UNRUN |
| `INFRA-TEST-01-AC10` | `release.py verify` con commit y manifiesto esperados (v27/C27 y `data_contract=e4.11-v27`); comprobar par app+frontend, ID inmutable y Rootless sobre el SHA | E1 | Salida de `verify`, manifiesto y `podman image inspect` | myfinanzas-app | 3 | UNRUN |
| `INFRA-TEST-01-AC11` | Arrancar la unidad TEST y consultar estado, salud, ruta protegida, UID y límites | E2 | `systemctl --user show`, health 200, 401, `podman inspect` del UID y límites | vps-infra | 5 | UNRUN |
| `INFRA-TEST-01-AC12` | Acceder por HTTPS; revisar certificado, redirección, cabeceras, cookies y un `Origin` ajeno | E2, E3 | `curl -D-`, `openssl s_client`, captura privada de cookies; sin publicar valores | vps-infra / usuario | 6, 7 | UNRUN |
| `INFRA-TEST-01-AC13` | Comprobar `ss -ltnp`, UFW, acceso externo a `18082`/`3001`, ausencia de Vite y alcance de SQLite | E2, E3 | Inventario de puertos, reglas UFW, intento externo fallido | vps-infra | 2, 6 | UNRUN |
| `INFRA-TEST-01-AC14` | Crear copia cifrada local, copiarla fuera del VPS y restaurarla en destino nuevo con MFA | E2, E4 | Checksums origen/destino, restauración aislada, health 200 y RTO observado | myfinanzas-app / usuario | 7, 8 | UNRUN |
| `INFRA-TEST-01-AC15` | Intentar rollback de app sin prueba del par; ensayar rollback de Caddy al backup | E1, E2 | Bloqueo documentado con estado preservado; backup de Caddy validado y recargado | myfinanzas-app / vps-infra | 8 | UNRUN |
| `INFRA-TEST-01-AC16` | Revisar host, repo, logs y copias en busca de Excel, bases reales, exportaciones o credenciales | E0, E2, E4 | Inventario redactado; `seed verify`; ausencia de datos ajenos al dataset | usuario / QA | 7 | UNRUN |
| `INFRA-TEST-01-AC17` | Comparar DNS, HTTP y HTTPS de `myfinanzas.pp.ua` antes y después de añadir `test` | E3 | Respuestas y registros antes/después; solo aparece el registro `test` | usuario / vps-infra | 6 | UNRUN |
| `INFRA-TEST-01-AC18` | Medir memoria, CPU, pids y disco con TEST en marcha | E2 | `systemctl show`, `podman stats`, `df`/`df -i` dentro de los umbrales de vps-infra | vps-infra | 7 | UNRUN |
| `INFRA-TEST-01-AC19` | Retirada autorizada: parar unidad, retirar Caddy/DNS de TEST, deshabilitar `linger`, preservar datos | E2, E3 | Dominio raíz intacto, TEST sin responder, datos/copias inventariados | vps-infra / usuario | 9 | UNRUN |

AC01 describe la entrega documental original de SPEC34. La reconciliación de 2026-11-07
añade SPEC35 y la corrección documental de RUNBOOK; no altera AC01 ni convierte ningún AC
en PASS. Los 19 AC siguen `UNRUN`.

## 4. Fases y gates de autorización

Cada fila exige autorización explícita e identificable del usuario. Una autorización no
habilita las siguientes.

| Fase | Objetivo | Precondición | Evidencia de salida | Estado |
| --- | --- | --- | --- | --- |
| 0 | Aprobar spec y test plan; D7 | Documento revisado | Aprobación registrada | **PASS** (2026-11-04; D7 2026-11-05) |
| 1 | Auditoría de solo lectura | Autorización de acceso de lectura | Inventario redactado del host, Caddy, DNS, Podman, puertos y disco | UNRUN |
| 2 | Aprovisionar host | Auditoría completada | Usuario, rutas, `linger`, UFW y versiones registradas | UNRUN |
| 3 | Release y seed | SHA congelado de `origin/test`; gate Rootless | Manifiestos, IDs inmutables, verificación y artefacto test-only | UNRUN |
| 4 | Inicializar y sembrar | Rutas y permisos verificados | `production-init`, `seed init/apply/verify` y alta del propietario | UNRUN |
| 5 | Activar unidad y frontend | Seed verificado; imagen cargada | Unidad `active`, health 200, 401 y frontend correcto | UNRUN |
| 6 | DNS y Caddy | App y estático listos | TLS válido, cabeceras, cookies y sitio raíz intacto | UNRUN |
| 7 | Smoke, límites y copias | HTTPS operativo | `FT-1` visible, límites medidos, copia local y externa | UNRUN |
| 8 | Restauración y rollback | Copia externa verificada | Restauración aislada y bloqueo/rollback ensayados | UNRUN |
| 9 | Actualización y retirada | Autorización específica | Par nuevo verificado o retirada limpia y preservada | UNRUN |

`[CONFIRMADO]` El flujo adoptado es `feature/* → test → main`. El gate TEST→main exige el
mismo SHA ya validado en TEST y un merge explícito aprobado; un despliegue TEST no lo
autoriza. PROD futuro consume `main`. La protección efectiva de `test` no está configurada
a 2026-11-07 y se verifica antes de habilitar tags.

## 5. Casos negativos obligatorios

Todos `UNRUN`; ninguno se convierte en PASS por ausencia de error.

| Caso | Resultado esperado |
| --- | --- |
| Seed con `APP_ORIGIN=https://myfinanzas.pp.ua` | Rechazo `2`; sin escrituras |
| Seed sin `test-instance.json` | Rechazo `2`; sin escrituras |
| Seed con `--data-root` relativo o con symlink | Rechazo `2`; sin escrituras |
| Seed con directorio `0755` o archivos `0644` | Rechazo `2`; no se corrige el permiso |
| Seed con `owner` ya creado | Rechazo `2`; el estado se preserva |
| Seed sobre base con movimientos ajenos | Rechazo `2`/`3`; sin reparación automática |
| Seed con esquema distinto de 27 (24/25/26 o desconocido) | Rechazo `2`; no se migra ni se fuerza |
| Seed repetido con el mismo manifiesto | `0` sin escrituras |
| Reset con la unidad respondiendo en `18082` | Rechazo; no se archiva nada |
| Reset sin confirmación explícita | Rechazo; no se archiva nada |
| Artefacto de seed referenciado por la unidad permanente | Bloqueo de activación |
| Imagen por etiqueta móvil | Rechazo; solo ID inmutable |
| SHA no alcanzable desde `origin/test` | Rechazo; no se congela como candidato |
| Manifiesto alterado o commit distinto | No se carga la imagen |
| SHA sin Rootless `SUCCESS` | Bloqueo de despliegue |
| Intento de montar solo `database.sqlite` | Rechazo; raíz de datos completa |
| `:U`, `--privileged` o socket de Podman | Rechazo por contrato de seguridad |
| Dato real detectado en TEST | Parada, preservación y escalado; sin borrado |

## 6. Comandos previstos (borrador, no ejecutados)

Los comandos son ilustrativos y no se han ejecutado. Los placeholders `<…>` se sustituyen
solo con valores verificados. No se incluyen secretos ni rutas privadas reales.

```sh
# Fase 3 — release y verificación desde el SHA congelado de origin/test
python3 infra/release.py build --ref <SHA40> --output <DIR_PRIVADO_NUEVO>
python3 infra/release.py verify <DIR_PRIVADO> \
  --expected-commit <SHA40> --expected-manifest-sha256 <SHA_MANIFIESTO>

# Fase 4 — estado y seed (host de ensayo o TEST, UID/mount de la app)
# production-init y setup según RUNBOOK §"Ejemplo de tarea deliberada"
# <SEED_IMAGE_ID> solo para tareas efímeras:
podman run --rm --pull=never --http-proxy=false --network=none \
  --userns=keep-id:uid=10001,gid=10001 --user=10001:10001 \
  --read-only --read-only-tmpfs=false \
  --volume=<DATA_ROOT>:/var/lib/myfinanzas:rw \
  --env=NODE_ENV=production --env=APP_ORIGIN=https://test.myfinanzas.pp.ua \
  --env=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite \
  --env=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key \
  <SEED_IMAGE_ID> tools/test-seed/cli.ts verify --data-root /var/lib/myfinanzas

# Fase 5/6 — salud, protección y aislamiento (host)
curl -fsS http://127.0.0.1:18082/api/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18082/api/saldos
ss -ltnp | grep -E '18082|3001'

# Fase 6 — HTTPS y cabeceras (red externa)
curl -fsS -D- https://test.myfinanzas.pp.ua/api/health
curl -sS -o /dev/null -w '%{http_code}\n' https://test.myfinanzas.pp.ua/api/saldos
openssl s_client -connect test.myfinanzas.pp.ua:443 \
  -servername test.myfinanzas.pp.ua </dev/null 2>/dev/null |
  openssl x509 -noout -subject -issuer -dates
```

Los comandos exactos de vps-infra (usuario, rutas, unidad, Caddy, DNS, copia externa) se
toman de su spec y de la auditoría; este documento no los duplica.

## 7. Evidencia y expediente privado

Por cada ejecución se registra, fuera del repositorio y sin secretos:

- Fecha UTC, fase, operador y autorización aplicable.
- SHA de la app (origen `test`) y del manifiesto; SHA de `main` y gate TEST→main; ID de
  imagen app y seed.
- Resultado por AC: `PASS` / `FAIL` / `BLOCKED` / `UNRUN`, comando y salida redactada.
- Para seed: `dataset_sha256`, `seed_manifest_sha256`, checksums lógicos y resultado
  `verify`.
- Para copias: ruta lógica, checksums origen/destino, resultado de restauración y RTO.
- Para Caddy/DNS: hash del backup, resultado de `caddy validate`, registros antes/después.
- Desviaciones, excepciones y su aprobación explícita.

No se publican: contraseñas, TOTP, códigos de recuperación, cookies, tokens de `setup`,
claves, bases, importes reales, IPs privadas ni logs crudos.

## 8. Bloqueos y dependencias de ejecución

| ID | Bloqueo | Efecto | Desbloqueo |
| --- | --- | --- | --- |
| B01 | Aprobación de spec y test plan | Resuelta 2026-11-04; D7 2026-11-05 | Sin bloqueo documental; no autoriza fases |
| B02 | D1–D7 aprobadas; implementación del seed/release no autorizada | Fase 3 bloqueada | Autorización de fase 3 |
| B03 | E4.9–E4.11 integrados; `FT-1` los excluye por D5/D7; seed no implementado | Fases 3–4 bloqueadas hasta implementar | Autorización de fase 3 e implementación |
| B04 | DT6/T-BKP abierto | Activación productiva limitada | Copia externa mínima y decisión |
| B05 | Flake SQLite B3 sin reproducción Linux | Riesgo de falso FAIL/PASS | Diagnóstico Linux; no ocultar |
| B06 | Gate Rootless no ejecutado sobre el SHA congelado | Despliegue bloqueado | Run `SUCCESS` sobre el SHA exacto |
| B07 | Caddy real desconocido | Riesgo para el sitio raíz | Auditoría y backup |
| B08 | DNS no creado | Sin TLS ni entorno operativo | Autorización y registro `test` |
| B09 | Destino externo no aprobado | Activación bloqueada | Decisión del usuario |
| B10 | Presupuesto de disco no medido | Riesgo de ENOSPC | Medición en fase 1/7 |
| B11 | SHA de `test` no congelado | AC02 y fase 3 bloqueados | Congelar y registrar un SHA de 40 caracteres |
| B12 | `test` sin ruleset/protección verificada | El gate TEST→main no está impuesto por GitHub | Configurar y verificar la protección antes de tags |

`FT-2` no forma parte de esta entrega (D7): exige autorización independiente y E3.5/FIN_NETA
y DT6/backup resueltos. No bloquea `FT-1`.

## 9. Criterios de parada

Detener la fase, preservar evidencia y escalar si ocurre cualquiera de estos casos:

- Aparece un dato real, el Excel, una base real o una credencial en TEST.
- El seed detecta propietario, datos ajenos, esquema distinto o ruta no TEST.
- El manifiesto, el checksum o el SHA no coinciden.
- El SHA no es alcanzable desde `origin/test` o la promoción a `main` no tiene aprobación
  explícita.
- Falta el gate Rootless o la prueba de compatibilidad para el par exacto.
- La unidad entra en `start-limit`, el health falla o el puerto queda expuesto.
- Caddy no valida, el sitio raíz deja de responder o el certificado es inválido.
- La copia externa no existe, no verifica o la restauración falla.
- El disco o los inodos bajan de los márgenes acordados.

No se usa `reset-failed`, `chmod`/`chown`, `:U`, borrado de estado ni reintento ciego para
«hacer que funcione».

## 10. Estado actual

- Documentos: SPEC34, este test plan, SPEC35 y RUNBOOK, reconciliados a v27/C27 y a
  `origin/test` (2026-11-07). Sin código, sin `infra/` ejecutable, sin `vps-infra`.
- Comprobaciones ejecutadas para esta entrega: **ninguna** de infraestructura; solo lectura
  del repositorio, de la API de GitHub y la verificación documental de la rama.
- AC: **19 / 19 `UNRUN`**.
- Fases: **fase 0 aprobada; 0 / 9 ejecutadas**.
- Próxima acción independiente: congelar el SHA de `origin/test` y solicitar autorización
  para la fase 1 (auditoría de solo lectura); el seed y la release siguen sin autorizar.
