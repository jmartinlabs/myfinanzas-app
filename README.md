# MyFinanzas App

Aplicación privada y monousuario para migrar progresivamente MyFinanzas desde Excel.
E1.1 permite gestionar **Saldos ficticios en local**: listado, ficha, alta, edición,
desactivación y reactivación. React → Effect HTTP → SQLite, sin ORM.
Acceso con contraseña y TOTP; no hay registro público.

El Excel estable `MyFinanzas2026_v5.11(5).xlsx` sigue como maestro. No se ha incorporado
ni inspeccionado en Codex, ni se han importado datos personales. No hay motores de
Movimientos/Inversiones: su posición se muestra pendiente, nunca como un cero ficticio.

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
La inicialización con semilla ficticia exige `NODE_ENV=development` o `test` y rechaza
producción, valores desconocidos o entorno ausente **antes de abrir SQLite o crear directorios**.
Los comandos `dev` de API, `setup` y `backup` usan development por defecto, preservando
un NODE_ENV explícito; las pruebas usan test. Una invocación directa requiere indicarlo.
Esto es un bloqueo preventivo, no una configuración de producción.
Antes de utilizar datos reales deberá existir una **inicialización limpia, sin fixtures,
y una migración del maestro expresamente autorizada**, conservando IDs y validando
integridad/equivalencia. No se implementan aquí ni se reutiliza una base demo como real.
No reutilices una base desconocida: se rechazan versiones de esquema incompatibles.

## Copias y restauración de prueba

`age` es una herramienta CLI externa aprobada para cifrado, no una dependencia npm.
Instálala desde distribución/release oficial verificada. En Ubuntu: paquete `age`.
Para el ensayo local, genera una identidad fuera de Git:

```sh
mkdir -p .local/backups
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
Capturas ficticias ignoradas en `artifacts/e1-1`; CI las conserva siete días.
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
No E1.2, despliegue ni uso real autorizado. `$dev 01` reutiliza la especificación;
Skills locales en `.agents/skills`. No reabrir decisiones confirmadas.

## Universal AI development template

Proyecto derivado de agent-project-template; se conservan sus templates, controles y
prompts de referencia. Los prompts heredados no sustituyen este contexto vigente.
