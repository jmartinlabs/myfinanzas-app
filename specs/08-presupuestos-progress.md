# 08 — E2.2 Presupuestos: checkpoint WIP sin validar

Estado: **WIP — SIN VALIDACIÓN GLOBAL DE ACEPTACIÓN**. Checkpoint solicitado por el usuario el2026-10-23 (Europe/Madrid), después de ordenar detener la ejecución. No reanudar automáticamente ni abrir PR por este checkpoint.

Base integrada: main20d8f9a6eef9888e03a5a61ecb11a13b21fbc2ad, spec/wireframes aprobados PR39. Rama feat/08-presupuestos. Autorización vigente para esta acción: commit de todos los cambios de trabajo dev08 y push de rama, **sin PR ni merge**. El SHA del checkpoint se entrega en el recibo de publicación, evitando autorreferencia circular.

## Estado material conservado

- Backend maestro Presupuestos, relación Partida→Presupuesto y Deuda independiente, API y guardas de impacto implementados localmente; pendientes de revisión independiente.
- Migración8 propia con contrato e2.2-presupuestos-v8, fixturev7 genuina, backup/restore y rechazo de esquema8 ajeno. No incorpora dev07; futura reconciliación de ambas migraciones requiere diseño/revalidación explícitos, no basta igual número de versión.
- UI maestro y selector Partida, integración de navegación/estilos y escenarios E2E escritos. No hay resultado E2E satisfactorio ni inspección visual390/1440 terminada.
- Adaptaciones de expectativas heredadas para nuevo esquema/campo presupuesto incluidas en este estado; no se modificaron apertura SQLite, private-state ni checkpoints dev07.
- Developer se interrumpió por límite de uso. QA independiente solo preparó matriz; no revisó ni ejecutó checks sobre candidato funcional. No existe dictamen QA favorable de dev08.

## Evidencia disponible, no aceptación

Ver [testplan08](08-presupuestos-testplan.md). Typecheck reportado PASS y pruebas nuevas focales8 PASS/156 aserciones. Primera API global98 PASS/7 FAIL/1631 aserciones conservada. Log posterior API global105 PASS/0 FAIL/1713 aserciones,39.79s, localizado tras la interrupción; no se atribuye cierre causal de fallos previos ni de AC23. Entre ejecuciones se adaptaron expectativas técnicas y se habilitaron permisos de red para servidores locales; no se afirma que eso explique cada fallo anterior.

Primer E2E: config.webServer exit1 antes de ejecutar tests. No se ejecutan suites adicionales para este checkpoint. Los resultados previos no se atribuyen al SHA final como si se hubieran ejecutado después del commit. Pruebas/código pendientes de revisión de cobertura24AC y de validación sobre candidato fijo.

Logs y scripts intermedios permanecen privados/ignorados en work; bases/claves/estado local, dependencias y resultados privados no se publican. Su persistencia a otra sesión no se garantiza. Este commit conserva código/migración/pruebas/UI/documentación, no promete un artefacto listo para integrar.

## Congelación y siguiente acción

Todo desarrollo queda detenido. Publicar solo checkpoint WIP solicitado, verificar SHA remoto y detenerse. Para continuar se requiere nueva instrucción del usuario: revisar diff/candidato, completar E2E/visual y QA independiente y decidir validaciones faltantes, sin ampliar alcance financiero.

AC23/E2.1 sigue BLOQUEADO, E2.1 sin aceptación global, AC23-SQLITE investigación separada cerrada inconclusa; Dev32 pausado. PR40 conserva autorización de integración independiente. F-01/F-02 futuros pendientes. Sin E2.3, Excel real, datos personales, despliegue ni migración operativa.
