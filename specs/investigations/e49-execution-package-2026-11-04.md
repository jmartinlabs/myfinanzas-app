# E4.9 — Paquete de ejecución A/B/C (preparación, 2026-11-04)

**Estado:** preparado, **sin DEV y sin autorización**. Recoge el dictamen funcional favorable
de Álex a las cinco propuestas y las dependencias para un futuro DEV E4.9. La autorización
del usuario sigue pendiente. Base: `main` `5c4297a` (contenido funcional `dd56553`), esquema
v24; v25 propuesta.

Fuentes: [SPEC27](../27-e49-cierre-financiero-specification.md),
[testplan](../27-e49-cierre-financiero-testplan.md),
[paquete de decisión](e49-dev-authorization-package-2026-11-03.md) y
[brief de decisiones](e49-decision-brief-2026-11-04.md).

## 1. Decisiones adoptadas (favorable de Álex; pendiente usuario)

1. **D4 estricto:** sin foto si E3.5 no es verificable.
2. **T1 Ventas:** E4.2 incluida con alta, rectificación, anulación y cambio de fecha.
3. **v25:** reservada en exclusiva a E4.9; migración aditiva v24→v25 y C25.
4. **AC-20/T2:** comparar solo magnitudes históricas inmunes a T2 al corte de cada foto.
5. **DT4:** efecto e identidad de Ventas en la foto; conciliaciones E4.4 fuera de v1 con motivo.

## 2. Dependencias y gates

| Dependencia | Estado | Efecto |
| --- | --- | --- |
| E3.5/FIN_NETA | Integrada `1560d04`; AC-12/15 PARCIAL | Proveedor de cierre; D4 bloquea si no es verificable |
| E4.2 Ventas | Integrada v21 | T1 y bloque de inversión/foto |
| E4.3 Valoración | Integrada v24 `dd56553` | `e43/valoracion` se captura como `No disponible` motivado; no se reimplementa |
| E4.4 Deuda completa | Integrada `024b348` | Deuda viva; conciliaciones fuera de v1 |
| E4.8 Precierre | Integrada `e608bbb` | Consumidor de cierre; refrescar tabla de fuentes obsoleta |
| Backup/restore v24 | Integrado | Base de v25; DT6 real sigue abierto |
| `APP_VERSION` | Ausente | Necesaria para metadatos de foto v1 |
| UI/wireframes E4.9 | #178 integrados, con filas E4.2/E4.4/E3.5 desactualizadas | UI provisional o aprobación expresa |

**Gate de entrada:** autorización expresa del usuario para DEV E4.9 con fixtures. Sin ella no
se escribe código, DDL ni v25.

## 3. Bloques de ejecución

### A — Persistencia, esquema v25 y contrato C25

- Migración aditiva v24→v25: cierre, foto inmutable, auditoría, intentos de idempotencia y
  metadatos de versión de app/esquema.
- Actualizar en bloque: `database-identity`, admisión de versiones, `backup.ts`,
  `schema-contracts.json`, etiqueta de backup y pruebas v24→v25/restore.
- Proveedor único de estado de cierre y locks T1/T2/T3, con Ventas E4.2 en T1.
- Refrescar la tabla de fuentes de `precierre.ts` (`e43`, `e35`, `e44`, `e36`) antes de
  implementar D4/AC-08; dueño y límite explícitos.
- **AC principales:** 01, 03, 04, 08, 18; soporte 02, 09, 12, 16, 21.
- **Pruebas:** migración v24→v25, contrato C25, backup/restore, rollback, FK, inmutabilidad,
  locks T1/T2/T3, snapshots.
- **Prohibido:** tocar E4.3/v24, reutilizar v25, migrar datos reales.

### B — Preflight, transacción, foto y API

- Preflight D4: verificar E3.5, backup, plan, S0, siguiente Inicio y coherencia.
- Transacción única: fingerprint, idempotencia, concurrencia/409, rollback, cierre fuera de
  orden, doble cierre y `Sin hechos`.
- Foto v1 inmutable: ventana, hechos E4.1/E4.2, plan, clasificación/Referencias, deuda E1.6,
  auxiliares, cobertura, backup, `APP_VERSION`, esquema, actor/UTC y fingerprint.
- AC-20/T2: comparar posiciones/efectivo a Fin en el corte congelado de cada foto posterior;
  registrar valores comparados; bloqueo solo por diferencia no explicable.
- **AC principales:** 02, 05–14, 15–18, 20, 21.
- **Pruebas:** API/HTTP 401/403/409/422, idempotencia, concurrencia, rollback, AC-20 × T2,
  no escritura de vistas vivas, foto inmutable y snapshot SQL.

### C — UI/E2E y revisión visual

- Pantallas de cierre, preflight, foto y comparación posterior; estados de bloqueo, error,
  cierre fuera de orden y `Sin hechos`.
- E2E real con MFA, 390/1440, teclado, foco, contraste y capturas ficticias.
- UI provisional si el usuario no aprueba #178; la revisión visual final no bloquea A/B.
- **AC principales:** 02, 05, 08, 13, 14, 17, 20; apoyo visual de 01/21.

## 4. Mapa AC → bloque

| AC | Bloque | Evidencia mínima |
| --- | --- | --- |
| 01 | A+B | Cierre/foto, metadatos y snapshot |
| 02 | A+B+C | Bloqueo `SIN_SIGUIENTE_INICIO` y UI |
| 03/04 | A+B | 409 `HISTORY_LOCKED`, fecha antigua/nueva |
| 05/06 | B+C | T2/T3, auditoría y foto inmutable |
| 07 | B | Posiciones/efectivo a Fin, sin patrimonio inventado |
| 08 | A+B+C | D4 y bloqueo por E3.5 |
| 09 | A+B | Preflight de backup; fixtures vs real |
| 10/11 | B | Idempotencia y concurrencia 409 |
| 12 | B | Rollback total |
| 13 | B+C | Cierre ordinario no reabre |
| 14 | B+C | Foto vs vistas vivas |
| 15 | B | AC36 PARCIAL con proveedor ficticio |
| 16 | B | Corte E4.1 anterior/posterior |
| 17/18 | B+C | `SinPlan` / `PlanNoVerificable` |
| 20 | B+C | AC-20 × T2 y foto posterior |
| 21 | A+B | `Sin hechos` y snapshot |

AC-19 queda descartado. Ningún AC se declara PASS por este paquete.

## 5. Pruebas y gates

- API: `bun test apps/api` con nuevas suites `e49-*`.
- Contrato/migración: v24→v25, C25, backup/restore, rollback y FK.
- E2E: Playwright 390/1440 con MFA real y capturas ficticias.
- `bun run typecheck`, `bun run build`, `python3 scripts/verify --base <main> --head <SHA>` y
  CI Linux; `--full` cuando aplique.
- QA independiente y merge con autorización expresa.

## 6. Autorización propuesta (una sola)

> Autorizo DEV E4.9/SPEC27 **solo con fixtures**, sobre `main` `<SHA>`, con v25 reservada a
> E4.9, D4 estricto, Ventas E4.2 en T1, AC-20/T2 según el brief y DT4 con Ventas/identidad e
> conciliaciones E4.4 fuera de v1. Incluye A/B/C, migración/backup, API, UI provisional/E2E,
> QA independiente y publicación de rama/PR. Sin merge, datos reales, cierre real,
> despliegue ni reapertura E4.10. AC-09 y cierre real quedan `PASS (fixtures)` y
> `BLOQUEADO (real)` hasta DT6.

## 7. Riesgos y límites

- **D4 estricto** puede impedir cerrar ciclos con E3.5 parcial; es el comportamiento acordado.
- **T1 Ventas** amplía un alcance aprobado; requiere aceptación expresa.
- **v25** debe actualizarse en toda la cadena o backup/restore queda inconsistente.
- **AC-20** comparar magnitudes sensibles a T2 produciría falsos bloqueos.
- **DT6 real** no se acredita con fixtures.
- No se reabre E4.3 ni se reimplementan sus motores.
