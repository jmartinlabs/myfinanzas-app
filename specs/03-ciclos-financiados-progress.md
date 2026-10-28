# 03 — Ciclos financiados: progreso
Status: INTEGRADO — PR #13 squash `ff9d18d`; auditoría 2026-10-28 con H-SPEC03-03
en corrección.
Base histórica: PR #12 aprobada sobre `bf3f2eb`, MERGED `179942e`.
Rama histórica: `feat/e1-3-ciclos-financiados`. Fecha original: 2026-10-21.

- [x] Cerrar spec 03: SHA aprobado y ambas CI SUCCESS, PR lista, squash y main limpio.
- [x] Persistencia v2→v3, calendario/referencia/contexto/API y continuidad.
- [x] UI/listado/ficha/alta/cabecera común, componentes existentes.
- [x] 21 AC actuales, 3 contratos futuros separados; Bun + Playwright.
- [x] Capturas 390/1440 inspeccionadas y ajustes justificados, controles locales.
- [x] [PR funcional #13 publicada](https://github.com/jmartinlabs/myfinanzas-app/pull/13)
  e integrada por squash `ff9d18d`.
- [x] CI remota del HEAD final: dos checks `validate` SUCCESS registrados en PR #13.
- [x] Revisión y merge autorizados; integrado.

Incremento 16a2273: maestro/API/upgrade, 33 pruebas backend y regresión navegador previa PASS.
Incremento UI: pantallas reales/cabecera, errores/idempotencia de red/conflicto, restauración
con MFA, capturas y documentación común. [Trazabilidad y resultados](03-ciclos-financiados-testplan.md).
La aprobación documental se registró en esta rama después de integrar exactamente el
SHA aprobado: checks PR #12 push 39587914869 y PR 39587919359 SUCCESS.

Siguiente acción: completar H-SPEC03-01/02 (documentales) y H-SPEC03-03 (técnico) en
la PR de auditoría; después esperar revisión de Álex y autorización expresa de merge.
No avanzar otra entrega ni SPEC04.
AC-11/23/24 pendientes de consumidores financieros, no pruebas de motores inexistentes.
Excel maestro intacto; solo fixtures locales, sin semillas de ciclos. No E2.1,
datos reales, nuevas dependencias, despliegue ni infraestructura productiva.

## Integración y auditoría posterior — 2026-10-28

PR #13 integrada por squash `ff9d18d` (2026-10-21). Movimientos (E1.4) y Revisión Comida
(E3.4) se incorporaron después como fuentes temporales del contexto compartido;
Inversión sigue pendiente como fuente temporal (sin proveedor conectado); SPEC22
aprobada documentalmente; DEV22 no iniciado; proveedor temporal de inversión pendiente.
La auditoría SPEC03 registra H-SPEC03-01/02 (documentales)
y H-SPEC03-03 (técnico: estado `error` de `movementSource()`).

Límite explícito: la corrección de H-SPEC03-03 restablece la referencia contractual
ante un fallo de consulta, pero **no** hace que todos los consumidores recuperen
disponibilidad. `monthlyFlow()` y otras rutas consultan el ledger directamente
(`ledgerRows()`), por lo que un fallo del mismo origen puede seguir afectándolas.
No se amplía esa cobertura sin autorización nueva.

SPEC03 no se declara cerrada hasta la revisión de Álex, la autorización expresa de
merge y la verificación posterior en `main`. Evidencia y estado en el tracker de
auditoría; AC-11/23/24 conservan su carácter de contrato.
