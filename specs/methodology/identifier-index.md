# Índice de identificadores históricos ↔ entrega canónica

**Estado:** aprobado el 2026-11-04; integración pendiente de merge. Solo registro de
trazabilidad; no renombra ni reescribe artefactos. Ver [convención](identifier-convention.md).

## Specs por número

| Documento | Entrega canónica | Estado |
| --- | --- | --- |
| `01-saldos-control-*` | E1.1 | Implementada |
| `02-clasificacion-*` | E1.2 | Implementada |
| `03-ciclos-financiados-*` | E1.3 | Implementada |
| `04-movimientos-*` | E1.4 | Implementada |
| `05-transferencias-referencias-*` | E1.5 | Implementada |
| `06-deuda-*` | E1.6 | Implementada |
| `07-ciclos-operacion-*` | E2.1 | Implementada |
| `08-presupuestos-*` | E2.2 | Implementada |
| `09-plan-ciclo-*` | E2.3 | Implementada |
| `10-plan-anual-*` | E2.4 | Implementada |
| `11-nomina-prevision-*` | E2.5 | Implementada |
| `12-flujo-mensual-*` | E2.6 | Implementada |
| `13-anticipos-*` | E3.1 | Implementada |
| `14-compartidos-*` | E3.2 | Implementada |
| `15-vehiculos-itv-*` | E3.3 | Implementada |
| `16-revision-comida-*` | E3.4 | Implementada |
| `17-e44-deuda-completa-*` | E4.4 | Implementada (`024b348`) |
| `19-instrumentos-compras-inversion-*` | E4.1 | Implementada |
| `20-historico-precontrol-*` | E4.5 | Spec/testplan aprobados; sin DEV |
| `21-pendientes-conciliacion-*` | E3.6 | Implementada (`a26fffb`) |
| `22-ventas-posicion-broker-*` | E4.2 | Implementada (`fd2e21c`) |
| `23-e43-valoracion-resultados-*` | E4.3 | Implementada |
| `24-e46-resumen-inicio-*` | E4.6 | PR #201 |
| `26-e48-precierre-*` | E4.8 | Implementada |
| `27-e49-cierre-financiero-*` | E4.9 | PR #200 (núcleo); guards/UI pendientes |
| `31-sqlite-produccion-*` | Transversal (base) | Implementada |
| `32-ejecucion-rootless-*` | Transversal (B3) | Abierta |
| `33-dprima-simplificada-*` | Transversal (D′) | Implementada |

Números libres: `18`, `25`, `28`, `29`, `30`. Asignación **propuesta, no vinculante**, que
solo se aplica al crear cada spec:

| Número | Entrega prevista | Estado |
| --- | --- | --- |
| `25` | E4.7 | Propuesto en el inventario anual |
| `28` | E4.10 | Propuesto en el análisis de reapertura |
| `29` | E4.11 | Propuesto en el análisis de fotografías |
| `30` | E4.12 | Reservado; no asignado |

`18` queda libre. Los números son soporte documental, no identidad de la entrega.

## Referencias DEV verificadas

| Referencia | Entrega canónica | Estado |
| --- | --- | --- |
| DEV17 | E4.4 | Merged `024b348` |
| DEV18 | E3.5 | STOP histórico; no reanudar por inferencia |
| DEV19 | E4.1 | Merged |
| DEV21 | E3.6 | Merged `a26fffb` |
| DEV22 | E4.2 | Merged `fd2e21c` |
| DEV24 | E4.6 | PR #201 (A+B+C) |
| DEV25 | E4.7 | Planificado; sin spec |
| DEV43 | E4.3 | Merged (`3b9be46`, UI `8552d4a`) |
| DEV E4.9 | E4.9 | PR #200 (núcleo) |
| DEV32 | Transversal B3 | Abierto, separado |

`DEV43` no coincide con el número de spec de E4.3 (`23`): el número de DEV es histórico y
no debe inferirse del número de spec. Las referencias no listadas no se reutilizan sin
contrastar el tablero.

## Bloques DEV por funcionalidad

Los bloques son locales a cada `E4.x`. `A/B/C` se conservan como alias históricos y no se
renombran; el siguiente bloque nuevo continúa la secuencia.

| Funcionalidad | Bloques históricos | Alias | Siguiente bloque |
| --- | --- | --- | --- |
| E4.3 | A (esquema), B (read model), C (UI) | DEV-01/02/03 | DEV-04 |
| E4.6 | A+B (composición/API), C (UI) | DEV-01/02/03 | DEV-04 |
| E4.9 | A (esquema), B (núcleo), C (UI prevista) | DEV-01/02/03 | **DEV-04 — guards** |
| E4.7 / E4.10 / E4.11 | — | — | DEV-01 al iniciar |

Un bloque pendiente conserva su número aunque no esté completado. La numeración no es global
entre funcionalidades ni entre proyectos.

## PR de referencia

| PR | Entrega / tema | Estado |
| --- | --- | --- |
| #189 | E4.3 A+B+C | Merged `dd56553` |
| #194 | E4.3 KI-409 | Merged `17d86c3` |
| #198 | Tema visual Fase 1 | Merged `0b8aade` |
| #199 | E4.6 A+B | Cerrado; sustituido por #201 |
| #200 | E4.9 A+B núcleo | Abierto, draft |
| #201 | E4.6 A+B+C | Abierto, draft |

## Decisiones y riesgos

| ID | Tema | Documento propietario |
| --- | --- | --- |
| DT6 | Copia/restauración | Roadmap; gate de E4.9/E4.12 |
| DT7 | Mapping precontrol | Roadmap; gate de E4.5/E4.12 |
| DT8 | UX/métricas de informes | Roadmap; gate de E4.6/E4.7 |
| DT9 | Reapertura excepcional y fotos agregadas | Roadmap; gate de E4.10/E4.11 |

No se deduce ninguna decisión de este índice.
