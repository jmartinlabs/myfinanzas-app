# 05 — Transferencias y Referencias: Progress
Status: IN PROGRESS — dev 05 autorizado por usuario desde main a586fa7, 2026-10-21.
Specification: [APPROVED](05-transferencias-referencias-specification.md).
Rama feat/e1-5-transferencias-referencias, solo local/ficticio, sin merge automático.

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| SQLite v5 y continuidad genuina v4; REF mínima | verified backend | R4/R5, copia age v4/v5, autenticación previa |
| Transferencia/Referencia y validaciones/impacto central | verified backend | R1–R3/R6/R7, 7 pruebas nuevas |
| UI responsive reutilizada y recorridos reales | pending | Pendiente |
| Regresiones, concurrencia, idempotencia y restore age | pending | Pendiente |
| Capturas/inspección, documentación y PR/CI | pending | Pendiente |

30 criterios actuales; AC-31–33 futuros, no implementados ni probados.
No E1.6, Exterior ordinario/especial, fichas E3, datos reales o despliegue.
Excel v5.11 maestro. La autorización posterior dev 05 sustituye el límite documental
anterior de spec 05 sin cambiar sus reglas. Próxima acción: completar UI y recorridos E1.5.

Backend: 51 Bun PASS / 843 assertions (44 regresiones + 7 nuevas). Expectativas de
esquema actual y etiquetas de snapshots anteriores actualizadas a v5, conservando
comparación de datos antiguos; v4 genuina se verifica separadamente. Primer ensayo
tuvo timeouts de recursos de entorno que no reaparecieron al repetir sin modificar
timeouts; rutas antiguas de snapshot ajustadas al nombre real. UI aún pendiente.
