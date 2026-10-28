# 01 — E1.1 Saldos: Progress
Specification: [especificación aprobada](01-saldos-control-specification.md)
Current state: complete — E1.1 implementado e integrado mediante PR #7; corrección de concurrencia PR #9; sin acciones pendientes de E1.1.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| 1. Sincronizar main, completar Handoff/estados y mapear 43 AC | complete | main ebfe75b; efb7f7c |
| 2. Persistencia/API/validaciones exactas e integridad | complete | 0d6c296 y tests de revisión/concurrencia/rollback |
| 3. Acceso único/TOTP/sesiones y copia cifrada/restauración aislada | complete | 0d6c296 y pruebas age/MFA/recuperación |
| 4. Listado/ficha/formulario y estados responsive | complete | React real contra Effect HTTP/SQLite; sin motores futuros |
| 5. QA, restauración, capturas e inspección 390/1440 | complete | [testplan 43 AC](01-saldos-control-testplan.md), 15 Bun/195 aserciones + E2E |
| 6. Documentación y revisión de historia para PR funcional | complete | Controles locales pasan; rama feat/e1-1-saldos, CI por SHA en la PR |

## Estado vigente (2026-10-28)
E1.1 cerrada: PR #7 integrada y PR #9 corrigió la concurrencia (`main` `23e471e`).
Evidencia del [testplan](01-saldos-control-testplan.md): 38 PASA E1.1, 1 PARCIAL
(AC-38) y 4 contratos revisados (AC-30/31/32/36). E1.3 se integró después; su
integración no queda acreditada por las pruebas originales de E1.1. Esquema vigente
**18**. E1.2 y las entregas posteriores avanzaron por sus propias ramas/PR; el estado
global está en el [tablero](epic-board.md).

## Verified increments
Baseline main ebfe75b: CI success; Handoff y estados pendientes resueltos dentro de rama
funcional. Incremento backend local con pruebas antes de conectar pantallas; incremento
UI 363c603 completo, con fixture de ausencia histórica y restauración de archivo WAL.
43 criterios trazados; AC-30/31 contractuales y parte futura de AC-38 no son motores
probados. Evidencia detallada y cinco correcciones visuales en testplan.

## Decisions
[Arquitectura](guidelines/architecture.md), [UI](guidelines/ui.md), [seguridad](guidelines/security.md).
No se reabrieron decisiones financieras/visuales. OTPAuth 9.5.2 y age justificados según
DT1/DT6 ya aprobadas. Sin nuevo servicio, ORM, router UI ni librería de componentes.
Herramienta efímera Prettier para legibilidad, no dependencia de proyecto.

## Errors, regressions and blockers
Durante desarrollo se corrigieron etiquetas accesibles y una aserción que leía el color
intermedio de una transición. La inspección detectó checkbox apilado/artefacto de skip-link;
corregidos y verificados de nuevo. Sin fallos finales conocidos ni pruebas bloqueadas
por Codex. No hay auditoría completa de seguridad/WCAG ni producción validada.

## Next action
E1.1 cerrada; no hay acciones pendientes de esta entrega. No reabrir E1.1 ni usar este
progress como estado global. Futuras entregas y gates se consultan en el
[tablero](epic-board.md). Excel v5.11 continúa maestro; sin datos reales ni despliegue.

## Revisión posterior de Álex sobre ce7a92c — 2026-10-21
Contraste: excepción de texto oscuro documentada en guía UI (6.04:1 frente a blanco
2.26:1), sin cambiar CSS/diseño. Aserción Playwright del color real del botón añadida.
Se detectó semilla incondicional por entorno: ahora openDatabase solo admite
NODE_ENV=development/test y bloquea antes de crear directorios o abrir cualquier base.
Prueba de subprocesses cubre development/test (semilla idempotente), producción/entorno
ausente/desconocido (sin archivos) y bases existentes intactas ante rechazo. También verifica que bun run setup respeta
NODE_ENV=production y no crea base ni clave.
Baseline ce7a92c: 14 Bun/173 aserciones; revisión: 15 Bun/195 aserciones pasan.
Antes de datos reales: inicialización limpia sin fixtures y migración autorizada,
todavía no implementadas. Copias externas, automatización y configuración productiva
siguen pendientes. Sin nuevas dependencias/infraestructura, E1.2, STEP 8 ni merge.

## Cierre E1.1 — PR #7
Usuario aprueba expresamente la PR tras revisión final de Álex sobre 4f7cdda,
2026-10-21, y autoriza merge y cierre documental en la misma entrega.
E1.1 implementado e integrado mediante [PR #7](https://github.com/jmartinlabs/myfinanzas-app/pull/7).
CI de 4f7cdda: push 39549364881 y PR 39549369432 SUCCESS; el cierre exclusivamente
documental vuelve a pasar controles/CI antes del merge. Commit integrado verificable en la PR.
No se declaran implementados/probados los motores AC-30/31 ni la integración futura
Ciclos/cierre de AC-38. Siguen pendientes Manual operativo, inicialización real/migración,
copias externas/automatización y configuración productiva. Sin modificación del maestro.

## Seguimiento posterior — concurrencia de inicialización
Durante la CI documental de STEP 8 se detectó un fallo de un proceso hijo en AC03.
Usuario autoriza investigar/corregir en rama separada, 2026-10-21. [Incidencia](sqlite-startup-concurrency.md)
reproduce SQLITE_BUSY al inicializar esquema con transacción diferida; arreglo mínimo
BEGIN IMMEDIATE y regresión roja/verde. Verificación local: 16 Bun/200 aserciones,
tipos/build y Playwright pasan. Corrección aprobada e integrada en main 23e471e mediante
PR #9; precisión de comprobaciones previas de versión incorporada sin más código.
PR #8 actualizada desde main y validada, después aprobada e integrada. STEP 8 cerrado;
sin E1.2 o despliegues, que requieren nueva autorización.
