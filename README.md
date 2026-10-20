# MyFinanzas App

Aplicación web privada de gestión financiera personal que migrará progresivamente
el sistema MyFinanzas existente en Excel. El repositorio es privado; la aplicación
es de un único usuario y no tendrá registro público.

Actualmente solo existe un **walking skeleton local con datos ficticios**:
React → Effect HTTP → SQLite. Muestra tres entradas de un catálogo técnico de Saldos,
sin importes ni cálculos financieros. No importa el Excel ni contiene datos personales.

## Desarrollo local
Requisitos: Bun 1.4.3; Python 3.10+ para las comprobaciones heredadas de la plantilla.
Desde la raíz del repositorio:

```sh
bun install --frozen-lockfile
bun run dev
```

Frontend en el puerto 5173 y API en 3001, ambos limitados a 127.0.0.1.
La UI consulta GET /api/saldos mediante el proxy de Vite. La base ficticia se crea
en .local/demo.sqlite, fuera de Git. DATABASE_PATH permite elegir otra base ficticia.
Ctrl+C detiene el desarrollo desde una terminal interactiva.
No expongas estos servidores ni uses datos reales: no implementan autenticación ni 2FA.

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

Playwright inicia sus propios servidores; detén previamente los de desarrollo.
Si ya hay Chromium instalado, puede indicarse mediante
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`.
Consulta [calidad](specs/guidelines/quality.md) para cobertura, CI y límites reales.
El build genera el cliente estático, no un despliegue de producción.

## Contexto y estado
- [Propósito, referencias y principios financieros](specs/project.md).
- [Arquitectura implementada y decisiones confirmadas](specs/guidelines/architecture.md).
- [Interfaz](specs/guidelines/ui.md), [calidad](specs/guidelines/quality.md) y
  [seguridad](specs/guidelines/security.md).
- [Evidencia del bootstrap](specs/bootstrap.md) y [estado reanudable](specs/setup-progress.md).
- [Instrucciones de agentes y política Git/GitHub](AGENTS.md).
- [Propiedad de documentos y metodología de ocho pasos](specs/README.md).

STEP 1, STEP 2 y STEP 3 están integrados en main. STEP 3 automatiza las comprobaciones de
proyecto, historial, tipos, build y pruebas en CI; [evidencia y estado](specs/automated-checks.md).
La referencia funcional vigente es v5.11. MyFinanzas2026_v5.11(5).xlsx es la base
estable vigente, confirmada por el usuario. El Excel y su documentación asociada
original no se han incorporado ni inspeccionado en Codex. Sí se ha leído la especificación
funcional adjunta; [referencia sanitizada](specs/functional-reference-v5.11.md).
Las reglas confirmadas y la precedencia sobre v5.10 están en
[project.md](specs/project.md). No se ha diseñado
el modelo financiero definitivo. La agrupación en cuatro épicas está aprobada; el
[roadmap STEP 4](specs/roadmap.md) propone sus entregas y queda pendiente de revisión.
Solo documentación y PR: no se ha iniciado STEP 5 ni autorizado implementación.

## Skills
Las Skills locales coordinan el trabajo: `$init-project` inicia o reanuda la configuración;
`$bootstrap` construye el flujo mínimo; `$roadmap` prepara épicas tras recibir el contexto
funcional; `$spec` especifica y `$dev` implementa alcance aprobado.
Leer los archivos de .agents/skills si el cliente no descubre las Skills automáticamente.
No reiniciar decisiones confirmadas; reanudar desde specs/setup-progress.md.

## Universal AI development template
Proyecto derivado de agent-project-template. Se conservan templates, Skills, comprobaciones
estructurales y los prompts de referencia de la plantilla. Sus referencias a creación
inicial de repositorios no describen trabajo pendiente: este proyecto ya existe.
Los archivos NEW_PROJECT_PROMPT.md, PROMPT_BACKUP.md y PROMPT_BACKUP_COMPLETE.md son
material heredado; el contexto vigente lo definen los documentos enlazados arriba.
