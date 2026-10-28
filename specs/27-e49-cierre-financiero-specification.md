# 27 — E4.9 Cierre financiero y primera fotografía: Specification

Status: **APPROVED — SPEC27/E4.9 aprobada documentalmente el 2026-10-28.** Los AC
siguen UNRUN; no autoriza DEV, cierre real ni despliegue.
Approval source/date: **aprobación funcional del usuario el 2026-10-28**, condicionada a
las correcciones documentales de `SinPlan` y bloqueo E4.9 por E3.5, ya aplicadas; CI
`40668646943` SUCCESS. Decisiones M1–M6 confirmadas; DT3/DT4/DT6 abiertos.
Context and brainstorming: [27-e49-cierre-financiero-brainstorming.md](27-e49-cierre-financiero-brainstorming.md),
[inventario DT5](investigations/dt5-write-impact-inventory.md),
[propuesta E4.8/E4.9](investigations/dt5-e48-e49-specification-proposal.md),
[E4.9](roadmap.md#e49--cierre-financiero-y-primera-fotografía).
Base: `main` `f077b7e`, esquema 18.

## Functionality

E4.9 cierra manualmente un ciclo con ventana financiera finita y acreditada. Al cerrar:

1. verifica ventana, S0, núcleo, plan (`SinPlan` válido), backup preflight y concurrencia;
2. persiste el cierre, una foto inmutable y auditoría en una transacción única;
3. bloquea T1, revalida T2 y permite T3;
4. expone un proveedor de estado de cierre a los consumidores;
5. no crea automáticamente el ciclo siguiente ni cambia su S0.

No incluye reapertura E4.10, fotos trimestrales/anuales E4.11, valoración/resultado/
patrimonio E4.3, Comida E3.5/FIN_NETA, Ventas E4.2 ni conciliaciones E4.4.

**Interpretación de «plan final»:** el roadmap E4.9-AC1 se lee como **estado final del
plan**, que puede ser `SinPlan` o líneas capturadas; no exige que existan líneas.

**E3.5/FIN_NETA:** E4.9 **no implementa** el motor de Comida. Cuando E3.5 esté integrado y
sea verificable, E4.9 **consumirá y capturará sus resultados**; no los reimplementa ni los
inventa. Mientras no exista, el cierre E4.9 queda bloqueado.

## Data model and contracts

No hay DDL ni migración en este borrador. Contratos conceptuales:

- **Cierre:** ciclo, versión, ventana congelada, S0 congelado, actor, UTC, motivo,
  fingerprint, estado y referencia a la foto.
- **Foto:** valores capturados e inmutables; no se recalcula desde el estado vivo.
- **Fingerprint de cierre:** huella propia sobre todas las fuentes que alimentan la foto.
  `financeRevision` es una huella técnica y no sustituye este fingerprint.
- **Evidencia de backup:** referencia al manifiesto/checksum/clave y a la prueba de
  restauración DT6/T-BKP.
- **Estado de cierre:** proveedor de lectura compartido; no una guarda distinta por
  dominio.

### Ventana

- `[inicio, fin]` finitos y acreditados.
- Si existe siguiente Inicio, `fin = día anterior`.
- Si no existe, no se inventa Fin: DT3 debe definir el corte; sin DT3 no hay cierre.
- La foto guarda la ventana congelada.

### T1/T2/T3

| Nivel | Escrituras | Comportamiento |
| --- | --- | --- |
| T1 | Movimientos (alta, rectificación, anulación, cambio de fecha), S0, ventana/Fin, Compras/rectificaciones/anulaciones E4.1 con fecha en ventana cerrada | 409 `HISTORY_LOCKED`; no escribe |
| T2 | Clasificación, Referencias, participantes/reparto, Anticipos, Compartidos, Deuda, Presupuestos, plan vivo, Revisión Comida, Instrumentos y atributos de Saldo que afectan métricas | Impacto + motivo + auditoría; foto intacta; vistas vivas actualizadas o marcadas |
| T3 | Notas, evidencias, etiquetas y nombres no usados en cálculos | Permitido; si la foto guarda versión del nombre, no la altera |

## Screens and interfaces

Wireframes pendientes de aprobación. Flujo previsto:

- precierre E4.8 → confirmación de cierre;
- vista de impacto con bloqueos/avisos;
- confirmación con idempotencia;
- estado `Cerrado` y acceso a la foto;
- estados de bloqueo, error y sesión expirada.

La UI no presenta `0` por ausencia ni declara completo un total parcial.

## Empty, loading and error states

- **Vacío:** ciclo sin hechos capturables; se muestra vacío explícito, no 0.
- **Carga:** conserva ciclo y filtros; no muestra totales provisionales.
- **Error:** no hay foto parcial; se declara fallo y se permite reintento idempotente.
- **Bloqueado:** ventana/S0/backup/concurrencia; no se escribe.
- **Sesión expirada:** conserva contexto; exige reautenticación.

## API behavior and external dependencies

Contratos conceptuales, sin implementación:

- `GET /api/cierres/precierre/:ciclo` — E4.8, solo lectura.
- `POST /api/cierres/:ciclo/cerrar` — cierre con clave de intento, revisión/hash y
  motivo; respuesta con foto/estado.
- `GET /api/cierres/:ciclo/estado` — estado y versión.
- `GET /api/cierres/:ciclo/foto` — foto vigente.
- Reintento idéntico devuelve la misma foto; payload distinto → 409
  `IDEMPOTENCY_CONFLICT`; cambio concurrente → 409 `IMPACT_CHANGED`/`REVISION_CONFLICT`.
- Sin servicios externos; el backup se verifica como preflight DT6/T-BKP.

## Validation and edge cases

- Sin ventana finita o sin S0 → bloqueo; no se cierra.
- `SinPlan` → válido; no bloquea; se captura como `SinPlan`. `PlanNoVerificable` → bloqueo.
- Inconsistencia estructural o fuente núcleo ausente → bloqueo.
- Backup no verificable o restauración no demostrada → bloqueo.
- E3.5/FIN_NETA no disponible → **cierre bloqueado**; no hay foto. No se admite cierre
  parcial anticipado ni re-cierre como sustituto.
- E4.3/E4.2/E4.4 no disponibles → totales parciales/`No disponible` cuando el cierre
  esté autorizado; no se declaran capturados.
- E4.1: efectivo y posiciones a Fin, incluidas operaciones anteriores y excluidas las
  posteriores; valoración no disponible. Un ciclo sin Compras nuevas no es vacío si hay
  posiciones anteriores.
- Cambio entre preview y confirmación → 409; no foto parcial.
- Doble cierre del mismo ciclo → conflicto; solo E4.10 reabre el último.
- Cierre no crea ciclo siguiente ni altera su S0.
- Foto inmutable: T2/T3 no la recalculan; vistas vivas pueden cambiar.

## Photo contract

| Bloque | Contenido |
| --- | --- |
| Identidad | Ciclo, versión, fecha/actor/motivo, fingerprint |
| Ventana | Inicio, Fin, S0 y estado temporal |
| Hechos | Movimientos del ciclo y totales |
| Plan | `SinPlan` o plan final con líneas capturadas; nunca líneas inventadas |
| Clasificación/Referencias | IDs y versiones de nombre |
| Inversión E4.1 | Instrumentos, Compras, efectivo y posiciones **a Fin** (incluye anteriores al ciclo y excluye posteriores); cobertura histórica parcial |
| Auxiliares | Anticipos, Compartidos, Nómina, Revisión Comida y Deuda E1.6 si hay hechos |
| Cobertura | `completo/parcial/no_disponible` por total y motivo |
| Backup | Evidencia DT6/T-BKP referenciada |
| No disponible | E4.3, E4.2, E4.4 cuando falten; E3.5 bloquea la foto y no se captura como `No disponible` |

**Totales parciales:** Gasto/Ingreso completo con Movimientos completo; efectivo/posición
inversión completo para Compras registradas con cobertura histórica parcial y valoración
no disponible; Neto Anticipo/Compartido/Nómina completos solo si se capturaron; Comida/
CIERRE no se captura y el cierre se bloquea sin E3.5/FIN_NETA; patrimonio `No disponible`
sin E4.3; plan `SinPlan` o completo si se capturó.

## Exclusions

- No `ciclo_id` en Movimientos.
- No reapertura, fotos trimestrales/anuales ni cierre automático.
- No E4.3, E3.5/FIN_NETA, E4.2 ni E4.4.
- No capturar una fuente como runtime si no existe; `No disponible` con motivo.
- No habilitar cierre parcial anticipado por E3.5/FIN_NETA no disponible; AC-19
  (cierre parcial y re-cierre futuro) queda **descartado**, no aprobado.
- No declarar AC36 completo sin proveedor real.
- No cerrar DT3, DT4 ni DT6 por inferencia.
- No código, migración, tablas ni endpoints en este borrador.

## Acceptance checks

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| AC-01 | Ciclo con ventana finita, S0, plan o `SinPlan` y backup verificado; cerrar | Cierre y foto creados; estado `Cerrado`; sin ciclo siguiente |
| AC-02 | Ciclo sin siguiente Inicio y sin DT3 | Bloqueado; no se inventa Fin ni se cierra |
| AC-03 | Alta/rectificación/anulación de Movimiento con fecha en ventana cerrada | 409 `HISTORY_LOCKED`; sin escritura |
| AC-04 | Mover un Movimiento desde/hacia una ventana cerrada | 409; fecha antigua y nueva comprobadas; sin escritura |
| AC-05 | Reclasificar un hecho de ciclo cerrado (T2) | Impacto/motivo/auditoría; foto intacta; vista viva actualizada o marcada |
| AC-06 | Renombrar Partida/Instrumento (T3) | Permitido; foto conserva ID + versión del nombre |
| AC-07 | Cerrar con posiciones E4.1 anteriores y sin Compras nuevas | Foto con efectivo/posiciones a Fin, incluidas anteriores y excluidas posteriores; valoración/patrimonio `No disponible` |
| AC-08 | Cerrar con E3.5/FIN_NETA no disponible | Cierre bloqueado; sin foto; no se declara parcial ni completo |
| AC-09 | Backup sin evidencia o restauración no demostrada | Cierre bloqueado antes de escribir |
| AC-10 | Repetir cierre con misma clave/payload; después con payload distinto | Misma foto en el reintento; 409 `IDEMPOTENCY_CONFLICT` con payload distinto |
| AC-11 | Cambio concurrente entre preview y confirmación | 409 `IMPACT_CHANGED`/`REVISION_CONFLICT`; sin foto parcial |
| AC-12 | Fallo dentro de la transacción de cierre | Rollback total; sin cierre ni foto |
| AC-13 | Reabrir/cerrar de nuevo por vía ordinaria | Solo E4.10 reabre el último; el cierre ordinario no reabre |
| AC-14 | Consultar la foto tras T2/T3 | Foto inmutable; vistas vivas separadas; no se recalcula |
| AC-15 | Consumidor Anticipos sin proveedor real | AC36 sigue PARCIAL; no se declara completo con proveedor ficticio |
| AC-16 | Operación E4.1 anterior al ciclo y operación posterior a Fin | Anterior incluida en posición/efectivo a Fin; posterior excluida; sin doble cómputo |
| AC-17 | Cerrar con `SinPlan` | Permitido; foto registra `SinPlan`; no se inventan líneas |
| AC-18 | Cerrar con `PlanNoVerificable` | Bloqueado; sin foto |
