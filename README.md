# MyFinanzas App

Aplicación privada y monousuario para migrar progresivamente MyFinanzas desde Excel.
E1.1 permite gestionar **Saldos ficticios en local**: listado, ficha, alta, edición,
desactivación y reactivación. React → Effect HTTP → SQLite, sin ORM.
E1.2 añade Clasificación: Categorías, Subcategorías y Partidas con jerarquía estable,
estados sin cascadas y rectificación explícita de dependencias del catálogo.
Acceso con contraseña y TOTP; no hay registro público. E1.2 completada e integrada mediante PR #11,
tras aprobación técnica y visual del usuario sobre 58b51f9.
E1.3 incorpora el maestro de **Ciclos financiados**: listado, ficha y alta posterior,
mes financiado único y Fin derivado del siguiente Inicio. Integrada mediante PR #13
(ff9d18d). [Pruebas y límites](specs/03-ciclos-financiados-testplan.md).
Movimientos ya alimenta la referencia; Comida/inversión siguen pendientes. Sin hechos
vigentes, referencia «No disponible»; maestro vacío «Sin ciclos». No usa el reloj, el último creado ni
Nómina para decidir el ciclo actual. No realiza cierre ni conciliación de comida.

El Excel estable `MyFinanzas2026_v5.11(5).xlsx` sigue como maestro. No se ha incorporado
ni inspeccionado en Codex, ni se han importado datos personales. Control Movimientos calcula apertura + entradas − salidas vigentes. Otros motores
pendientes no se presentan como posiciones completas ni como un cero ficticio.

## SQLite v6 — inicialización privada (especificación 31)

Contrato [31](specs/31-sqlite-produccion-specification.md) aprobado; implementación
local verificable, pendiente de revisión/integración. Esto no autoriza despliegue
ni datos reales. La API continúa en loopback; los bloqueos de infra siguen vigentes.

- Desarrollo/test: bases nuevas v6 con identidad demo; bases genuinas v1–v5 se
  actualizan transaccionalmente sin resembrar ni reiniciar acceso. Conserva copia
  cifrada verificada y clave antes de un upgrade de una base persistente.
- Producción: no crea estado durante arranque; exige base v6 production y pareja
  de clave válidas. Rechaza demo, legacy sin marcador y variante preliminar #22.
  Development/test rechazan a su vez bases production. No existe promoción.
- `DATABASE_PATH` y `AUTH_KEY_PATH` deben ser rutas absolutas canónicas distintas
  en un mismo directorio de estado dedicado. Clave tampoco puede ocupar WAL/SHM/journal.
  `APP_ORIGIN` debe ser explícito y HTTPS canónico. Directorios 0700, archivos
  0600, UID efectivo; sin symlinks/hardlinks. No hay reparación de permisos al abrir.
- La creación requiere raíz privada ya existente y **subdirectorio de estado nuevo**.
  DB+clave se preparan en área privada y publican sin sobrescribir. Se usa Bun FFI
  con `renameat2(RENAME_NOREPLACE)` de glibc: Linux/glibc es requisito de esta
  operación (Debian 13 objetivo); no se ha validado macOS/Windows ni una imagen Alpine.

Interfaces desde raíz del proyecto, con las tres variables anteriores ya configuradas
para un estado de ensayo ficticio y sin servicios apuntando al destino:

```sh
NODE_ENV=production bun apps/api/src/production-init.ts
NODE_ENV=production bun apps/api/src/setup.ts /ruta/privada/estado/token-inicial.txt
NODE_ENV=production bun apps/api/src/main.ts
```

El segundo comando exige un archivo de entrega **nuevo**, dentro del directorio de
estado; entrega el token solo allí (0600), nunca stdout/stderr. El operador lo consulta
por canal local privado, sin logs/capturas/chat, y completa contraseña/TOTP en la UI
existente. Caduca a los 10 minutos y es de un uso. Tras uso/caducidad, elimina el
archivo por ese mismo canal; no se promete borrado físico seguro. Para emitir otro,
retira antes el archivo caducado; nunca reinicia un propietario activo. Los códigos
de recuperación se custodian fuera del repositorio y de la máquina operativa.

No se ejecutan estos comandos contra el VPS en esta entrega. Las rutas de ejemplo
no constituyen instrucciones de activar Quadlet ni de copiar datos a producción.
El esquema limpio solo incluye S000 técnico; la primera alta deliberada usa S001.
La clave de 32 bytes se crea exclusivamente al inicializar, y se vincula a la DB
mediante huella SHA-256. Perderla bloquea arranque/alta/backup incluso sin usuario;
restaura la pareja cifrada, sin regenerar ni inventar factores.

Backup sigue usando los comandos existentes con NODE_ENV y configuración coherentes.
En production el padre del destino debe existir y ser privado (0700/UID efectivo),
validado antes del snapshot; no se reparan permisos automáticamente. DB/clave no
pueden llamarse `bundle.tmp` (temporal reservado de restore) ni tener espacios finales.
El archivo de entrega del token tampoco puede ocupar los sidecars SQLite.
Copias v6 añaden origen al manifest cifrado; copias v1–v5 siguen restaurables como demo.
Para restaurar production, configura las rutas DB/clave del **nuevo destino** antes
de ejecutar restore, y usa NODE_ENV=production. Se conserva origen/clave; no hay
conversión hacia demo para ensayar. La restauración revoca sesiones, desafíos y
códigos antiguos, conserva contraseña/TOTP y emite códigos nuevos tras identificación.
El nombre de archivo devuelto por restore es el configurado en producción; en demo
se conserva el nombre histórico demo.sqlite. No sobrescribe destinos existentes.

Caída durante inicialización: el área `.initialize-*` privada puede quedar en la
raíz de datos; el runtime rechaza los nombres reservados `.initialize-*`,
`.restore-*` y `.backup-*` como estado operativo. Detén únicamente tus procesos,
identifica la operación y conserva evidencia local antes de retirar su área temporal.
No borres directorios/locks ajenos ni reutilices bases parciales. Una caída después
de publicación puede haber dejado el conjunto completo: verifica antes de repetir.
Mantén siempre copia/clave externa; fsync no protege frente a daño físico del disco.

## Desarrollo local

Requisitos: Bun 1.4.3, Python 3.10+ y `age`/`age-keygen` para copias y pruebas.
Desde la raíz:

```sh
bun install --frozen-lockfile
bun run setup
bun run dev
```

Abre `http://127.0.0.1:5173`. Introduce el token local mostrado por setup (caduca en
10 minutos), una contraseña de 15–128 caracteres y configura tu aplicación autenticadora.
Completa TOTP y guarda los diez códigos de recuperación fuera del repositorio.
El token y los factores son privados: no compartirlos en capturas, logs o chat.
`setup` no reinicia un usuario ya activo ni ofrece recuperación administrativa.

API en 127.0.0.1:3001; Vite en 127.0.0.1:5173, proxy `/api`. Solo loopback y datos
ficticios. `.local/demo.sqlite` y `.local/auth.key` se generan con permisos privados y
están ignorados. Conserva la clave: no se regenera si existe un usuario.
`DATABASE_PATH`, `AUTH_KEY_PATH` y `APP_ORIGIN` permiten configurar rutas/origen locales
de confianza; mantén los mismos valores para setup, dev y backup. No son entradas HTTP.
La inicialización **demo** con semilla ficticia exige `NODE_ENV=development` o `test` y rechaza
producción sin estado productivo explícito, valores desconocidos o entorno ausente **antes de abrir SQLite o crear directorios**.
Los comandos `dev` de API, `setup` y `backup` usan development por defecto, preservando
un NODE_ENV explícito; las pruebas usan test. Una invocación directa requiere indicarlo.
Esto es un bloqueo preventivo, no una configuración de producción.
Antes de utilizar datos reales deberá existir una **inicialización limpia, sin fixtures,
y una migración del maestro expresamente autorizada**, conservando IDs y validando
integridad/equivalencia. No se implementan aquí ni se reutiliza una base demo como real.
No reutilices una base desconocida: se rechazan versiones de esquema incompatibles.

Una base local **E1.1/E1.2/E1.3 existente (versión 1/2/3) se actualiza transaccionalmente a versión 4**
al abrirla, sin borrar/resembrar Saldos ni reiniciar autenticación. No vuelvas a ejecutar
setup si el usuario ya está configurado. Conserva la clave y realiza/verifica una copia
con la versión E1.1 antes de actualizar; las copias v1, v2, v3, v4 y v5 siguen restaurables.
El catálogo Clasificación comienza vacío; crea datos ficticios desde sus páginas.
Esto no importa el Excel ni convierte la base demo en una base para datos reales.

## Copias y restauración de prueba

`age` es una herramienta CLI externa aprobada para cifrado, no una dependencia npm.
Instálala desde distribución/release oficial verificada. En Ubuntu: paquete `age`.
Para el ensayo local, genera una identidad fuera de Git:

```sh
mkdir -p -m 700 .local/backups
age-keygen -o .local/backup-identity.txt
age-keygen -y .local/backup-identity.txt
```

Con el destinatario **público** mostrado por el último comando:

```sh
bun run backup create .local/backups/copia-01 DESTINATARIO_AGE
bun run backup restore .local/backups/copia-01 .local/ensayo .local/backup-identity.txt
```

La copia contiene `database.age` (snapshot y manifest cifrados) y `access-key.age`
(paquete de clave TOTP cifrado separado). La restauración exige directorio nuevo,
valida integridad, FK, checksum y esquema; revoca sesiones/desafíos/códigos antiguos.
En la próxima identificación con contraseña+TOTP emite nuevos códigos. Una copia
mayor de 24 h exige `--allow-older`, aceptación explícita de antigüedad, no garantía de RPO.
Para abrir el ensayo, detén tus servidores y arranca con `DATABASE_PATH=.local/ensayo/demo.sqlite`
y `AUTH_KEY_PATH=.local/ensayo/auth.key`. No sustituye una base activa ni borra copias.
No existe scheduler/poda automática: objetivos 7 diarias/4 semanales/3 mensuales,
RPO 24 h/RTO 2 h y custodia externa siguen pendientes de operación antes del despliegue.
En producción la identidad privada deberá custodiarse separadamente, fuera del servidor.

## Comprobaciones

```sh
bun run typecheck
bun run build
bun run test
bunx playwright install chromium
bun run test:e2e
./scripts/validate-template
./scripts/test-validator
./scripts/check-project
./scripts/check-repository
./scripts/test-checks
git diff --check
```

Playwright inicia servidores propios, usa `.local/e2e` exclusiva y la reemplaza al iniciar;
no apuntar allí el desarrollo ni guardar datos. El ensayo restaurado escucha en loopback
3002 durante la prueba. No se guardan factores en capturas o trazas. Si Chromium ya está
instalado: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`.
Capturas ficticias ignoradas en `artifacts/e1-1` y `artifacts/e1-2`; CI las conserva siete días.
Build solo genera cliente estático: no despliega ni hace la app apta para datos reales online.

## Contexto y metodología

- [Contexto, referencias y principios](specs/project.md), [estado](specs/setup-progress.md).
- [Arquitectura](specs/guidelines/architecture.md), [UI](specs/guidelines/ui.md),
  [calidad](specs/guidelines/quality.md) y [seguridad](specs/guidelines/security.md).
- [E1.1 aprobada](specs/01-saldos-control-specification.md),
  [progreso](specs/01-saldos-control-progress.md) y [43 criterios/evidencia](specs/01-saldos-control-testplan.md).
- [Roadmap aprobado](specs/roadmap.md): cuatro épicas/30 entregas; no 30 sprints o PR.
- [AGENTS y política Git/GitHub](AGENTS.md), [metodología de ocho pasos](specs/README.md).

## Skills

STEP 5 integrado en main ebfe75b. Handoff completado; Skill spec reutilizada en STEP 6.
STEP 7 E1.1 implementado e integrado mediante PR #7, aprobada expresamente por el usuario
tras revisión de Álex sobre 4f7cdda. Motores financieros posteriores pendientes.
STEP 8 completado e integrado mediante PR #8: [cierre de las ocho etapas iniciales](specs/dev-skill-consolidation.md).
Las Skills `$spec` y `$dev` quedan preparadas para reutilizarse, sin duplicados ni nueva
inicialización. Esperar autorización antes de la próxima entrega.
E1.1–E1.4 integradas; E1.5 implementada en rama para revisión, sin merge. Despliegue y uso real requieren autorización. `$dev 01` reutiliza la especificación;
Skills locales en `.agents/skills`. No reabrir decisiones confirmadas.

## Universal AI development template

Proyecto derivado de agent-project-template; se conservan sus templates, controles y
prompts de referencia. Los prompts heredados no sustituyen este contexto vigente.


## E1.4 — integrada PR #15/#16 (b51b89b/a693aeb)
Ingresos/Gastos: listado/ficha/alta, filtros, rectificación/anulación auditadas con ID
estable, advertencia revisable de coincidencias e idempotencia. [Trazabilidad](specs/04-movimientos-testplan.md).
Importes positivos, fecha no futura según Europe/Madrid y validación en servidor.
Gasto exige Partida y permiso Exterior; Referencia obligatoria se integra en E1.5
solo para casos y reglas verificables, conservando bloqueados los tipos E3. No controlado puede operar, pero no presenta posición convencional.
Solo Control Movimientos usa apertura ausente como cero en cálculo, sin cambiar null
persistente ni filtrar por Fecha apertura. Anulados conservados, sin cómputo ni borrado.
Actualizar una base E1.3 no requiere reiniciar el usuario ni ejecutar setup otra vez:
copia previa verificada y clave externa conservada. Esquema v4 transaccional sin semillas
de hechos en esa entrega. E1.5 amplía a v5 según el apartado siguiente. Excel maestro, solo fixtures.


## E1.5 — implementación local en revisión, no integrada
[Especificación aprobada](specs/05-transferencias-referencias-specification.md),
[progreso](specs/05-transferencias-referencias-progress.md) y
[pruebas](specs/05-transferencias-referencias-testplan.md). Transferencia interna como
un único hecho, sin Partida/Subtipo, con posición derivada por cada motor. No exige
permiso Exterior ni excluye Terminal/No controlado; todas las Transferencias con S000
siguen fuera del alcance, incluidas las ordinarias. Gastos desde terminal siguen
exigiendo permiso Exterior. Referencias Viaje/Evento por ID REF estable, sin fichas E3.

Abrir una base v4 existente actualiza transaccionalmente a v5 sin reinicializar datos,
usuario, clave ni historial. No volver a ejecutar setup para actualizar. Conservar copia
cifrada verificada y clave externa; la restauración aislada sigue revocando sesiones.
No hay importación ni arranque productivo: el guard development/test permanece intacto.
Sin E1.6, referencias de Anticipo/Compartido/Vehículo operativas, datos reales ni deploy.

### Ensayos y errores de publicación

Las pruebas Bun de 31 también arrancan una API real en 3001: detén tus servidores
locales antes de Bun y Playwright, y ejecuta esas suites secuencialmente. El
preflight de identidad no abre WAL/SHM para rechazos; la conexión de trabajo sí
lee WAL y comprueba su propia identidad/clave. Se exige raíz/UID de confianza.
Si falla fsync del directorio después de publicar un restore, el destino puede
contener una pareja completa pero de durabilidad incierta: detén la operación,
verifica y preserva el destino y las copias; nunca lo borres o sobrescribas por
suponer que el fallo significa que no existe.

### Incremento 32: bind explícito (entrega incompleta)

`API_BIND_HOST` ausente conserva `127.0.0.1:3001`; solo admite ese valor o
`0.0.0.0` explícito para un namespace de contenedor aislado. Cualquier otro valor,
incluido vacío, rechaza antes de abrir SQLite. No usar `0.0.0.0` en el host público.
La publicación host prevista sigue siendo `127.0.0.1:18081:3001`, pendiente de
ensayo real rootless. El workflow `Rootless infrastructure 32` ya ensaya API/UID,
volúmenes y Quadlet temporal en ubuntu-24.04 efímero. No instala ni modifica nada
en el VPS y usa una imagen de prueba, no la release final. Ver
[estado 32](specs/32-ejecucion-rootless-progress.md).
