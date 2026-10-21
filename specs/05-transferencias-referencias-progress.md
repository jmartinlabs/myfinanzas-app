# 05 — Transferencias y Referencias: Progress
Status: IMPLEMENTED / VERIFIED LOCAL — pendiente auditoría de Álex, no integrado.
Specification: [APPROVED](05-transferencias-referencias-specification.md).
Base main a586fa7, rama feat/e1-5-transferencias-referencias; usuario autoriza dev 05,
migración local versionada y PR funcional. Fecha: 2026-10-21. Solo datos ficticios.

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| SQLite v5, catálogo REF, validación/impacto central | verified | 8c2f2f4; R1–R7 iniciales |
| Continuidad v4 genuina, rollback/concurrencia/age | verified | R4–R6 + regresiones previas |
| UI responsive reutilizada y flujo real E1.5 | verified | E5 en recorrido E1.4, sin nuevo onboarding/backend simulado |
| 30 AC actuales y 3 futuros separados | verified | [Testplan](05-transferencias-referencias-testplan.md), R1–R10, 54 Bun PASS |
| Capturas/inspección y mejoras | verified | 32 PNG a390/1440; cinco ajustes de UX documentados |
| Publicación PR/CI del HEAD final | follow-up | Registrar enlaces y SHA en descripción de PR al completar |
| Merge / siguiente entrega | waiting | Requiere autorización expresa; no E1.6 |

## Evidencia final local
Typecheck/build PASS. Bun **54 PASS / 908 assertions**: diez pruebas E1.5 y 44
regresiones. Playwright **2 PASS**, recorridos E1.1–E1.3 y E1.4–E1.5 reales con MFA,
SQLite/Effect y backup/restore age en servidor aislado. 30 criterios PASS, AC-31–33
no implementados ni probados. Controles de plantilla/repositorio según testplan y PR.
Sin dependencias añadidas ni lock modificado. No fuentes/posiciones/motores simulados.

## Incidencias y ajustes
Expectativas antiguas de esquema y nombres de snapshots actualizadas a v5, sin perder
comparación de tablas anteriores. Fixture v4 genuina y copias v4/v5 independientes.
Se corrigió una variable E2E anticipada, nombres accesibles de filtros y sincronización
de navegación de Clasificación. Regresión aislada y suite final completa PASS; no nuevos
retries, timeouts aumentados ni assertions quitados. Primeros timeouts locales y detalles
completos en testplan, sin atribuir causas financieras no demostradas.
Inspección visual corrigió contexto de dos Saldos, notas inline con borde, compacidad,
foco y errores. Reejecuciones y 32 capturas finales inspeccionadas, sin bloqueos locales.

## Alcance y siguiente acción
La autorización dev 05 sustituye límites documentales de spec 05 sin reabrir Q1–Q3.
Excel v5.11 maestro. Todas las Transferencias con Exterior y fichas E3 siguen fuera;
la entrega responsable de Exterior ordinario continúa pendiente de planificación.
AC-30/31 de E1.4 solo reciben cobertura parcial de lo entregado; no declarar completos
sus consumidores futuros. No E1.6, datos reales, Excel modificado ni despliegue.
Publicar PR para auditoría de Álex, comprobar ambas CI del commit final y esperar
aprobación expresa antes de merge. Árbol limpio al entregar.

## Revisión final de backup (PR #18)
Corregida etiqueta SQLite v5 a `e1.5-v5`, conservando v1–v4. R10 verifica manifiesto
cifrado y restauración de los cinco esquemas; detalles en el testplan. Sin cambios
financieros o de UI. Nuevo SHA y ambas CI en la PR; merge pendiente de autorización.
