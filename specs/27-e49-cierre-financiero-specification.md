# 27 — E4.9 Cierre financiero y primera fotografía: Specification

Status: **APPROVED — SPEC27/E4.9 aprobada documentalmente el 2026-10-28.** Los AC
siguen UNRUN; no autoriza DEV, cierre real ni despliegue.
Approval source/date: **aprobación funcional del usuario el 2026-10-28**, condicionada a
las correcciones documentales de `SinPlan` y bloqueo E4.9 por E3.5, ya aplicadas; CI
`40668646943` SUCCESS. Decisiones M1–M6 confirmadas. **DT3 y DT4 resueltas el
2026-10-28** (ver «DT3/DT4 — resolución»); **DT6/T-BKP sigue abierto** y bloquea el
cierre real.
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
- Si no existe, no se inventa Fin: el ciclo no es cerrable (`SIN_SIGUIENTE_INICIO`)
  hasta que exista un ciclo posterior que acredite su Fin (DT3 resuelta 2026-10-28).
- La foto guarda la ventana congelada.

### DT3/DT4 — resolución (2026-10-28)

Decisiones del usuario, sin reabrir M1–M6:

- **DT3 · elegibilidad:** es cerrable todo ciclo con ventana finita, S0 y núcleo
  consistente. Sin siguiente Inicio no hay cierre.
- **DT3 · orden:** si ya existen cierres posteriores, el cierre exige
  `CIERRE_FUERA_DE_ORDEN` con motivo y auditoría, y una comprobación de coherencia con
  las fotos de esos cierres. La comprobación se realiza al mismo corte congelado de cada
  foto posterior y con todas las operaciones legítimas con fecha ≤ ese Fin, incluidas
  las posteriores al ciclo que se cierra. Se comparan las magnitudes derivadas
  comparables a ese corte (al menos posiciones y efectivo a Fin); una diferencia
  explicable por operaciones posteriores legítimas no es contradicción. Solo una
  diferencia no explicable bloquea con `INCOHERENCIA_CON_CIERRE_POSTERIOR`; el aviso y
  el motivo no sustituyen el bloqueo. La ventana y el S0 se conservan como identidad
  congelada y no se recalculan. La contradicción se resolverá por la vía que
  corresponda a E4.10/DT9, que no se desarrolla aquí.
- **DT3 · «último» para E4.10:** «último cierre» es el ciclo cerrado con el `Fin`
  cronológicamente más reciente y sin otro ciclo posterior cerrado. Un cierre tardío de
  un ciclo anterior no habilita su reapertura ordinaria si existen ciclos posteriores
  cerrados. La fecha de registro se conserva solo como auditoría. E4.10 sigue fuera de
  alcance.
- **DT3 · ciclo sin hechos:** `Sin hechos` significa ausencia acreditada de operaciones
  imputables al ciclo en todas las fuentes aplicables según la tabla de fuentes y
  cobertura. No significa ausencia de posiciones heredadas ni de S0: el S0 (incluido 0)
  es un dato del ciclo y las posiciones heredadas se capturan íntegras en la foto. La
  ausencia de Compras nuevas no convierte el ciclo en `Sin hechos` ni en inversión
  vacía. Un cero informado es un hecho, no ausencia.
- **DT4 · contenido:** se aprueba la tabla «Photo contract» de esta especificación.
- **DT4 · versiones:** cada cierre crea v1; un re-cierre crea v2 sin alterar v1. Todas
  las versiones son consultables.
- **DT4 · trimestre/año (E4.11):** el agregado usa la versión vigente en el momento de
  generarse, registra la versión usada y queda congelado; no se recalcula. Las versiones
  anteriores siguen consultables.
- **DT4 · retención:** permanente; no se podan fotos ni versiones.
- **DT6/T-BKP:** abierto; no hay destino externo todavía. Bloquea el cierre real hasta
  que exista evidencia externa y restauración probada.

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
- Doble cierre del mismo ciclo → conflicto; solo E4.10 reabre el cierre con Fin
  cronológicamente más reciente y sin otro ciclo posterior cerrado.
- Cierre fuera de orden con diferencia no explicable al mismo corte → `Bloqueado` por
  `INCOHERENCIA_CON_CIERRE_POSTERIOR`; no se escribe ni se emite foto.
- `Sin hechos` exige ausencia acreditada de operaciones imputables al ciclo en todas las
  fuentes aplicables; no se deduce de la falta de Movimientos, del S0 (incluido 0), de
  posiciones heredadas ni de la ausencia de Compras nuevas.
- Cierre no crea ciclo siguiente ni altera su S0.
- Foto inmutable: T2/T3 no la recalculan; vistas vivas pueden cambiar.

## Photo contract

| Bloque | Contenido |
| --- | --- |
| Identidad | Ciclo, versión de foto, fecha UTC/actor/motivo, fingerprint, **versión de aplicación y versión de esquema** |
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

**Versiones y retención (DT4):** la foto nace como v1 y es inmutable; un re-cierre crea
v2 y conserva v1. Trimestre/año usan la versión vigente al generar el agregado y
registran cuál usaron; todas las versiones se conservan indefinidamente. Los metadatos
inmutables incluyen versión de aplicación y de esquema, además de ciclo, versión de foto,
fecha UTC, actor, motivo y fingerprint; no se recalculan al consultar.

## Exclusions

- No `ciclo_id` en Movimientos.
- No reapertura, fotos trimestrales/anuales ni cierre automático.
- No se desarrolla E4.10 ni DT9; solo se precisa el significado de «último cierre».
- No E4.3, E3.5/FIN_NETA, E4.2 ni E4.4.
- No capturar una fuente como runtime si no existe; `No disponible` con motivo.
- No habilitar cierre parcial anticipado por E3.5/FIN_NETA no disponible; AC-19
  (cierre parcial y re-cierre futuro) queda **descartado**, no aprobado.
- No declarar AC36 completo sin proveedor real.
- No cerrar DT6/T-BKP por inferencia; DT3/DT4 ya están resueltas (ver arriba).
- No código, migración, tablas ni endpoints en este borrador.

## Acceptance checks

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| AC-01 | Ciclo con ventana finita, S0, plan o `SinPlan` y backup verificado; cerrar | Cierre y foto creados; estado `Cerrado`; metadatos inmutables con versión de app y esquema; sin ciclo siguiente |
| AC-02 | Ciclo sin siguiente Inicio | Bloqueado por `SIN_SIGUIENTE_INICIO`; no se inventa Fin ni se cierra |
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
| AC-20 | Cerrar un ciclo con cierres posteriores ya existentes, con y sin contradicción | Exige `CIERRE_FUERA_DE_ORDEN` con motivo, auditoría y comprobación de coherencia al mismo corte con las fotos posteriores, incluidas las operaciones legítimas posteriores; sin diferencia no explicable no altera cierres posteriores; una diferencia no explicable bloquea con `INCOHERENCIA_CON_CIERRE_POSTERIOR` |
| AC-21 | Cerrar un ciclo sin hechos | Permitido solo si se acredita ausencia de operaciones imputables al ciclo en todas las fuentes aplicables; la foto registra `Sin hechos`. S0 (incluido 0) y posiciones heredadas se capturan; ausencia de Compras nuevas no es `Sin hechos`; un cero informado se captura como 0 |
