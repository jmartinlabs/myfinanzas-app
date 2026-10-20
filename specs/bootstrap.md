# STEP 1 · Bootstrap MyFinanzas App

## Alcance y aprobación
Plan aprobado por el usuario el 2026-10-20, con precisión explícita: ejecutar solo
STEP 1 y detenerse para revisión antes de STEP 2. Guidelines definitivos y controles
automáticos generales se aplazan. Las pruebas de este bootstrap sí forman parte del STEP 1.

## Implementación mínima
- apps/web: React + TypeScript + Vite, CSS propio, catálogo responsive en español.
- apps/api: Effect HTTP sobre Bun, SQLite mediante bun:sqlite y SQL directo, sin ORM.
- GET /api/saldos devuelve `{ saldos: [{ id, nombre }] }`, ordenado por identificador.
- Tabla técnica demo_saldos, tres filas ficticias deterministas, sin importes ni
  cálculos financieros. Semilla transaccional idempotente; no modifica filas existentes.
- El navegador solo accede a la API; Vite redirige /api al backend en desarrollo.
- Ambos procesos escuchan exclusivamente en 127.0.0.1, puertos 5173 y 3001.
- SQLite por defecto: .local/demo.sqlite. DATABASE_PATH permite otra base ficticia.
  Ningún proceso ni prueba importa documentos reales. E2E usa SQLite en memoria;
  la prueba Bun de persistencia crea un archivo temporal y lo elimina al terminar.
- Se ignoran bases SQLite, journals, .local, .env, claves y formatos financieros comunes.
  Esto no sustituye una revisión de archivos antes de cada commit.

## Dependencias y versiones
Bun 1.4.3; las dependencias directas están fijadas y bun.lock conserva la resolución.
React/React DOM son la UI; effect, @effect/platform y @effect/platform-bun proporcionan
Effect HTTP y su servidor Bun. TypeScript y sus tipos verifican contratos estáticos;
Vite y su plugin React sirven y construyen la UI; Playwright verifica el navegador.
Los paquetes transitivos de Effect son requeridos por sus dependencias/peers, no se
utilizan como ORM ni incorporan funcionalidad de negocio. Sin librerías UI adicionales.

## Arranque reproducible
Desde la raíz del repositorio, con Bun 1.4.3 disponible en PATH:

```sh
bun install --frozen-lockfile
bun run dev
```

Abrir el frontend local en el puerto 5173. La API local usa 3001; la ruta de lectura
es /api/saldos. Ctrl+C detiene los procesos en una terminal interactiva.
En este entorno Bun está en ../.tools/node_modules/.bin; anteponer esa ruta
al PATH si no se ha activado. No se necesita autenticación ni secreto para fixtures.
No exponer estos servidores a Internet ni introducir datos reales.
El build genera solo el cliente estático; no constituye un despliegue de producción.

## Verificación y evidencias, 2026-10-20
Desde la raíz:

```sh
bun run typecheck
bun run build
bun run test
bun run test:e2e
```

Para instalar el navegador oficial: `bunx playwright install chromium`.
En este entorno esa descarga recibió 403 Domain forbidden. Se utilizó Chromium
154.0.8037.57 del sistema con Playwright 1.64.1 mediante:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e
```

- Validación existente de plantilla: pasa; sus 18 pruebas de regresión pasan.
- git diff --check: pasa. Se confirmó con git check-ignore la exclusión de bases,
  archivos financieros, secretos locales y capturas.
- TypeScript: pasa.
- Build Vite: pasa.
- Bun Test: 4 pruebas, 10 aserciones; pasan. Persistencia tras cierre/reapertura,
  semilla idempotente, respuesta Effect HTTP que refleja modificaciones SQL,
  catálogo vacío, ruta 404 y error SQLite 500 sin detalles internos.
- Playwright: 4 pruebas; pasan (2 flujos en cada viewport: 390×844 y 1440×1000).
  Flujo real sin mocks: SQLite → API → React, nombres visibles, tres registros,
  sin errores JS y sin desbordamiento horizontal. Carga/vacío/error usan interceptación
  controlada; el reintento vuelve a la API real.
- Arranque `bun run dev` y petición HTTP real al backend: 200, tres fixtures esperadas.
- Capturas generadas e inspeccionadas: artifacts/bootstrap/catalog-mobile.png
  (390×930, página completa) y artifacts/bootstrap/catalog-desktop.png (1440×1000).
  Son artefactos locales ignorados por Git; se regeneran con la prueba E2E.
- Revisión visual: jerarquía, legibilidad, espacios y adaptación correctas; sin recortes.
  No se justifica rediseño en este alcance; identidad visual definitiva queda pendiente.

## Incidencias resueltas y límites
- Bun ausente: instalado localmente con npm, sin desactivar TLS ni verificaciones.
- El caché npm predeterminado no era escribible: se usó caché bajo /workspace.
- Latest de Effect y platform-bun pertenecía a otra versión mayor que platform:
  se fijó una combinación compatible de Effect 3 y platform-bun 0.91.3.
- Descarga de Chromium bloqueada: sustituida por Chromium preinstalado; no quedaron
  pruebas requeridas sin ejecutar. No se verificaron Firefox/WebKit ni el binario
  Chromium específico descargable de Playwright.
- No hay autenticación, 2FA, datos reales, importación Excel ni despliegue. Se requieren
  autenticación robusta, 2FA y HTTPS antes de utilizar datos reales online.
- No se han definido épicas ni añadido CI/controles generales ni guidelines definitivos.

## Configuración reutilizable del entorno
Se guardaron install_script (Bun 1.4.3 e instalación con lockfile congelado) y
start_skill (arranque y comprobaciones, con parada previa a STEP 2). El script de
instalación se ejecutó y verificó. No se publicó el entorno ni la aplicación.
La ampliación temporal del borrador de red para descargar Chromium se retiró al
utilizar el navegador del sistema; se preservó la política original.

## Próxima acción
Revisión del usuario del STEP 1. Esperar autorización antes de STEP 2.
