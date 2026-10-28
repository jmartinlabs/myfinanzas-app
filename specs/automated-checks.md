# STEP 3 · Controles automáticos

## Alcance y autorización
Autorizado por el usuario mediante «procede», tras describir sincronización de main,
actualización de visibilidad y automatización de tipos/build/pruebas y reglas verificables.
Sin nuevas dependencias, cambios de lógica financiera, datos reales ni despliegue.

## Verificación inicial
- PR #1 integrada: merge 3ea80b2; PR #2 integrada: merge f698549, ambas mediante el usuario.
- Git confirma que 36f43e8 y ad89f01 son ancestros de main; checkout actualizado desde f698549.
- GitHub API confirma private=true y default_branch=main. No se cambió visibilidad.
- Rama específica: step-3/automated-checks. Main permanece sin cambios locales.
- La API GitHub vuelve a funcionar. La consulta administrativa de permisos de Actions
  no está autorizada para la integración; no se asume acceso administrativo ni se cambian permisos.

## Controles implementados
- scripts/check-project: Bun/Workspaces, versiones exactas, prevención de publicación npm,
  ORMs conocidos, límites léxicos de imports navegador/servidor y contratos de CI
  (fases requeridas, SHAs, historial y permisos).
- scripts/check-repository: commits alcanzables, mensajes, índice y archivos versionados;
  rutas sensibles, patrones de credenciales, firma SQLite y enlaces simbólicos; exige
  historia completa y no muestra valores. No sustituye inspección manual de datos privados.
- scripts/test-checks: ejemplos válidos e infracciones en repositorios y directorios temporales;
  incluye secreto borrado del árbol final, staging distinto del archivo actual, mensaje
  de commit, SQLite renombrado, salida redactada e historial shallow rechazado.
- scripts/test-validator: conserva assertions y excluye dependencias/salidas al copiar fixtures.
- Workflow de GitHub: todos los controles, tipos/build, pruebas Bun y Playwright; capturas
  ficticias como artefacto de retención limitada. SHA de acciones resueltos desde tags oficiales.

## Evidencia local STEP 3
- Validador de plantilla: pasa; sus 18 regresiones conservadas: pasan.
- check-project y check-repository: pasan, sin hallazgos en el índice/árbol versionado e historial.
- test-checks: 22 pruebas, todas pasan; los rechazos de fixtures corruptos son resultados esperados.
- Instalación con lockfile congelado, typecheck y build: pasan, sin cambiar dependencias/lockfile.
- Bun Test: 4 pruebas y 10 aserciones pasan.
- Playwright con Chromium del sistema: 4 pruebas pasan a 390 y 1440 px; capturas actuales
  catalog-mobile.png y catalog-desktop.png bajo artifacts/bootstrap inspeccionadas, sin recortes.
- diff --check: pasa. La revisión previa al push incluye historial completo y diff manual.

[PR #3](https://github.com/jmartinlabs/myfinanzas-app/pull/3) aprobada explícitamente
por el usuario e integrada en main mediante merge 193410d. Se verificó el estado MERGED
y la ascendencia de su HEAD c340bad en main. Sus dos ejecuciones del HEAD aprobado
terminaron en success. El workflow se ejecuta por push y
por pull_request; su resultado remoto se verifica en los checks del HEAD vigente
de la PR, sin deducirlo de la ejecución local.
[Workflow y ejecuciones](https://github.com/jmartinlabs/myfinanzas-app/actions/workflows/validate.yml).
Las capturas de la ejecución remota quedan en el artefacto bootstrap-screenshots durante siete días.

## Límites
No se ha configurado protección de rama, auditoría exhaustiva de secretos/dependencias,
lint/formateador ni diseño de autenticación. El análisis estático de imports es limitado;
no es una sandbox del navegador. Ninguna regla infiere o valida semántica económica.
No iniciar el roadmap financiero antes de recibir su especificación funcional revisada.
