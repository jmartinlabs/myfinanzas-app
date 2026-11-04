# Master backlog — MyFinanzas (2026-11-03)

Base de referencia: `main` `9b76569`; esquema **v24 integrado** con DEV E4.3-A+B+C; v25 no reservada.
No se reserva v25 sin decisión.
Este documento es un índice de trabajo, no una aprobación. Los AC solo pasan a PASS con
evidencia ejecutada; una spec aprobada no autoriza DEV.

## Controles que se mantienen

- QA independiente antes de proponer merge funcional.
- Autorización expresa para DEV nuevos, cambios financieros materiales, merges funcionales,
  datos reales, migraciones operativas y despliegue.
- Un solo dueño de DDL/migraciones; v24 solo E4.3.
- Sin datos reales, Excel, VPS ni secretos en agentes, CI o Git.

## En ejecución

| Tarea | Estado | Evidencia | Siguiente |
| --- | --- | --- | --- |
| DEV E4.3-A (v24, migración, C24, backup) | **MERGED** `3b9be46` | 644/644 en PR `7de64c1`; post-merge `41722741566` fast PASS; QA-A APTO CON RESERVAS | — |
| DEV E4.3-B (read model/API) | **MERGED** `3b9be46` | `e43-api` 14/14; QA-B APTO CON RESERVAS | — |
| DEV E4.3-C (UI/E2E) | **MERGED** `8552d4a` | Playwright 1/1 + regresión Inversiones; CI PR `41728978112` 644/644; QA-C APTO CON RESERVAS | — |
| QA final E4.3 | **PR #189 draft** `66d58d3` | CI 644/644; Playwright 1/1; 15 PASS/2 PARCIAL; reservas menores | Revisión Álex y aprobación de merge |
| E4.4/E3.6 evidencia | **MERGED** #190/#191 | Progress 17, evidencia 21 y R17/R18 clasificadas | — |
| #181 cola/tablero + reparto autónomo | MERGED `7bfb5a2` | CI PASS `41710499996` | — |
| Backlog único | Este documento | — | Mantener por hitos |

## Integrado con evidencia pendiente

| Frente | Integración | Hueco |
| --- | --- | --- |
| E4.4/DEV17 | `024b348` | Falta `17-progress` con mapa AC↔pruebas; TP17 sigue «no ejecutado» |
| E3.6/DEV21 | `a26fffb` | TP21 sigue «no autorizado/UNRUN»; falta registro de evidencia |
| E4.3 wireframes | `bb076f1` | DEV A en curso |
| SPEC24/E4.6 | `5dc1dd3` | Q1–Q12 aprobadas; DEV24 no autorizado |
| E4.9 wireframes | `8b5cf5c` | DEV E4.9 no autorizado |
| E4.7 inventario | `e069bdc` | Sin spec ni DEV25 |

## Cola priorizada

### P0 — Ahora

1. **DEV E4.3:** A+B+C integrados; QA final en PR #189 pendiente de revisión funcional de Álex y aprobación de merge.
2. **Evidencia post-merge E4.4/E3.6:** completada (#190/#191), sin PASS indebido.
3. **#181:** MERGED `7bfb5a2`; verificado.
4. **Estabilizar CI:** flake `sqlite-opening.test.ts:288` en investigación; no enmascarar.

### P1 — Preparación sin DEV nuevo

5. **E4.9:** paquete actualizado a 2026-11-04; resolver D4, T1 Ventas, versionado v25, versión de app, UI, AC-20, DT4 y MFA.
6. **E4.6:** contrato de consumidores/fixtures cuando E4.3 esté avanzado; no duplicar motores.
7. **E4.7:** frontera/DT8; no abrir SPEC25 hasta decisiones.
8. **E4.5/DT7:** checklist de mapping/cortes/2026 y QA documental, solo si se prioriza.
9. **PR #50/#51:** cerradas como superadas (2026-11-03) con evidencia: #51 por el fix `#56` ya integrado (`useEffect([impact])`); #50 por documentación posterior (#128/#159 y tablero E4). Sin merge.
10. **Documentación de vigencia:** tablero histórico, `spec-audit-tracker`, handoff local y SPEC33.

### P2 — Bloqueado por decisión

11. **DEV E4.9:** D4/T1/foto/versionado/DT6; v25 tras E4.3.
12. **DEV E4.6 / DEV25 / DEV E4.5:** autorizaciones expresas.
13. **E4.10–E4.12:** tras E4.9.
14. **DT6 real:** sede Linux x86_64/VM, discos y segunda copia, custodia `age`, frescura AC-09.
15. **Migración/equivalencia Excel:** DT7/P6/P7, datos reales y criterio de traspaso.
16. **Despliegue/rootless real:** VPS Debian 13, Caddy/HTTPS, firewall/SSH, secretos, rollback.

## AC y evidencias pendientes (resumen)

- **PARCIAL:** E3.5 AC-12/15; E4.8 AC-04; SPEC01 AC-38; SPEC09 AC31/33/34; SPEC13 AC-36; SPEC32 AC-22.
- **UNRUN críticos:** E4.3 17 AC; E4.9 21 AC; E4.6 29 AC; E4.5 59 AC; SPEC27/28–30; E2E propios SPEC04/32; restore dedicado v21–v24.
- **BLOCKED:** E3.6 AC-31 por E4.8/E4.9; DT6 AC-09 real; DT7/E4.5; equivalencia Excel.
- **Evidencia ausente:** E4.4 y E3.6 integrados sin mapa AC↔prueba publicado; SPEC33/otros estados «sin merge» obsoletos.

## Riesgos activos

- Flake SQLite B3 puede tumbar CI crítico; no se enmascara con reintentos.
- Gobernanza: AGENTS.md/approvals y reparto autónomo deben quedar coherentes tras #181.
- Tablero con secciones históricas sin marca clara; usar cabecera de cola como estado vigente.
- Backup/restore real y despliegue no acreditados; CI sintética no cierra DT6.
- Muchas ramas remotas históricas; no borrar sin comprobar ancestro y autorización.

## Decisiones agrupadas pendientes

1. **DT6:** sede, soportes/segunda copia, custodia `age`, frescura AC-09.
2. **E4.9:** D4 estricto, T1 Ventas, v24/v25, versión de app, UI, AC-20/T2, DT4, MFA.
3. **Nuevos DEV:** E4.6, E4.7, E4.5; y v25.
4. **Cierre de PR #50/#51** como superseded.
5. **Operación real:** datos/Excel, migración y despliegue cuando corresponda.

## Próximo hito

Aceptación visual de E4.3, decidir reservas de cobertura y registrar la evidencia post-merge de E4.4/E3.6.
