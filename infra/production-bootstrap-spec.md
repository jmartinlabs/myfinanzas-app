# Inicialización limpia de producción — contrato previo a implementación

**Estado:** diseño para revisión. No autoriza despliegue ni elimina el bloqueo de producción.
**Base inspeccionada:** `main` 0d6cfc0, esquema SQLite 5 (`referenceSchemaVersion`).
Esta propuesta complementa `infra/README.md`, sin modificar reglas financieras.

## Diagnóstico verificable

- `apps/api/src/database.ts` solo acepta `NODE_ENV=development|test`; antes de abrir DB o crear directorios rechaza otros entornos.
- Una DB demo nueva se inicializa en transacción IMMEDIATE con `S000` técnico y `S001`–`S005` ficticios, y contador saldo 6.
- Las DB existentes con versión reconocida se actualizan sin sembrar; un fichero demo existente no queda identificado inequívocamente por su versión.
- El arranque `main.ts`, el CLI de configuración `setup.ts` y las copias comparten `openDatabase`.
- El esquema actual es v5, no v4; E1.5/Referencias se está desarrollando en paralelo.

## Contrato propuesto (necesita revisión técnica y aprobación)

1. **No habilitar producción por simple `NODE_ENV` o mediante un bypass global.**
   Separar creación de esquema técnico de la siembra de ejemplo.
   Para una DB productiva nueva, exigir procedimiento CLI explícito, ruta privada
   dedicada, directorio existente y vacío, sin fixture `S001`–`S005`.
   Mantener `S000` estrictamente técnico y contadores compatibles con el
   modelo de ID vigente; determinar el valor del primer ID real en pruebas.
2. **Identidad de la DB:** marcador persistente de origen `production` o
   `demo`, versionado y validado en apertura. Rechazar en producción una
   DB demo preexistente, antigua/no marcada o con esquema desconocido.
   No inferir el origen a partir de que las filas ficticias existan o no.
   No convertir una demo a producción borrando sus filas.
3. **Compatibilidad de upgrades:** preservar local `development/test` y
   actualizaciones existentes v1–v5; no resembrar ni borrar datos, usuario,
   claves o historial. Alinear el diseño con las migraciones nuevas de E1.5
   antes de implementar.
4. **Seguridad de inicialización:** operación atómica con fallo cerrado;
   prohibir directorios compartidos/demo, rutas por defecto y credenciales
   en argumentos/logs; permisos privados DB/clave (0700/0600).
   El CLI de arranque productivo no debe mostrar secretos de forma pública.
5. **Operación:** `APP_ORIGIN=https://myfinanzas.pp.ua`; misma pareja
   DATABASE_PATH/AUTH_KEY_PATH en arranque, configuración y backups.
   No se permite importar Excel ni valores reales hasta una aprobación aparte.
6. **Proteger las interfaces:** validar el bloqueo original para las rutas
   accidentales de `setup`, `backup` y `main`; no abrir la API en internet
   con el modo `development`.

## Pruebas obligatorias antes de habilitar producción

- Producción sin inicialización explícita => rechaza, sin crear archivos.
- Producción contra demo existente, DB sin marcador, ruta de demo,
  versión incompatible => rechazo **sin alterar bytes ni contenido**.
- Nueva DB productiva => tablas/versionado/S000 sin S001–S005,
  ninguna transacción económica, clave privada y setup MFA local seguro.
- Reinicio productivo => no modifica registros, IDs ni credenciales.
- Fallo intermedio o dos intentos simultáneos => no deja base parcialmente aceptada.
- Desarrollo/test v1–v5 => fixture y upgrades conservados sin regresiones.
- Backup `age` + restauración aislada de nueva DB => integridad, autenticación,
  revocación y permisos probados; ninguna copia real en repositorio.
- Pruebas del proyecto: `bun run typecheck`, `bun run build`,
  `bun run test`, `bun run test:e2e`; revisión de CI.
- Tests futuros de proxy/host/HTTPS/TOTP y offsite **antes del despliegue**.

## Fuera de alcance

No modificar el VPS, Caddy activo, Quadlet, Excel maestro, ni datos reales;
no alterar API de E1.4/E1.5; no integrar PR ni abrir producción en esta fase.

**Secuencia:** revisar contrato → implementar en PR de código independiente
sobre `main` actualizado → ejecutar pruebas → aprobar merge → validar
despliegue de prueba aislado → autorizar producción y migración por separado.
