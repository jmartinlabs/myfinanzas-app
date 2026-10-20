# Architecture guidelines

## Tecnología confirmada de MyFinanzas App
Fuente y aprobación: solicitud del usuario «Start New Project — MyFinanzas App», 2026-10-20.
- Frontend React + TypeScript + Vite; CSS propio y design tokens.
- Backend Bun + Effect TS; API con Effect HTTP.
- SQLite con bun:sqlite y SQL directo, sin ORM.
- Workspaces Bun. Pruebas con Bun Test y Playwright.
- Desarrollo local inicialmente. Destino futuro: VPS Linux, Docker Compose y Caddy.
- Aplicación de un usuario, sin registro público. HTTPS obligatorio en producción;
  autenticación robusta y segundo factor antes de usar datos reales online.
- Justificar cualquier dependencia adicional. Versiones exactas fijadas en los manifests
  y bun.lock; evidencia en [STEP 1](../bootstrap.md).

## Plan inicial aprobado — ejecución limitada al STEP 1
1. Workspaces apps/web y apps/api. React consume GET /api/saldos; el backend
   es propietario de SQLite. Vite redirige /api al backend durante desarrollo.
2. Catálogo de solo lectura con identificador sintético y nombre ficticio; sin importes
   ni lógica económica. SQL y semilla determinista e idempotente en el backend.
   Este esquema técnico no define el modelo financiero definitivo.
3. SQLite de desarrollo fuera del control de versiones, con ruta configurable;
   bases temporales aisladas para pruebas. No cargar archivos financieros originales.
4. Bootstrap exclusivamente local, escuchando en loopback y usando solo fixtures.
   Autenticación y 2FA quedan como requisito obligatorio previo al uso online con
   datos reales; su mecanismo concreto requiere especificación posterior.
5. UI en español, lista responsive con estados de carga, vacío y error,
   CSS propio, semántica accesible y tokens mínimos; sin identidad visual definitiva.
6. Seleccionar versiones compatibles y fijarlas, conservar lockfile Bun y justificar
   cada paquete necesario antes de instalar. Sin librerías UI ni ORM.
7. Verificar build y tipos, Bun Test para persistencia/API y errores, y Playwright
   para el flujo SQLite → API → UI; capturar e inspeccionar 390px y 1440px.
8. Documentar comandos reproducibles y arquitectura real; actualizar AGENTS y
   guidelines e incorporar controles a CI. Parar antes del roadmap financiero.

El usuario aprobó el plan el 2026-10-20 con prioridad explícita: solo STEP 1 ahora.
Guidelines definitivos y controles generales quedan aplazados a sus pasos.
La implementación y evidencia del bootstrap constan en [STEP 1](../bootstrap.md);
este documento aún conserva las secciones pendientes de la plantilla para STEP 2.

## Current template architecture
Markdown methodology and repository-local Codex Skills; portable Python 3 standard-library
validation, with no application runtime dependencies. Python is template tooling only,
not a required language for derived applications. GitHub Actions invokes the same checks.
The Skills own workflow instructions; guidelines own decisions; feature documents own scope.

## Project initialization — UNDECIDED
Replace this section only with approved project decisions, retaining relevant methodology.
- Stack and versions: UNDECIDED; record alternatives, actual rationale and approval.
- Repository/package structure and module responsibilities: UNDECIDED.
- Communication, data flow and data ownership: UNDECIDED.
- Persistence/API strategy: UNDECIDED or justified not applicable.
- Dependency management and version/lock policy: UNDECIDED.
- Security and testing boundaries: UNDECIDED.
- Checkable constraints: UNDECIDED; map each to a command/test and file owner.
Document implemented reality after bootstrap. Proposals and unresolved questions must
be labeled; never invent a rationale or silently replace an approved decision.
