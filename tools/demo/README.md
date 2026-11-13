# Dataset DEMO-1

Dataset ficticio, local y no productivo para la demo de MyFinanzas. Se aplica **solo con los
servicios existentes** de `apps/api/src`; no escribe entidades, contadores, auditoría ni
idempotencia con SQL. La única SQL del módulo es de lectura (`SELECT`/`PRAGMA`).

- Dataset: `DEMO-1`, versión `1`, fichero `dataset/demo.json`.
- Cargador tipado: `dataset/demo.ts` (`dataset`, `seedNow`).
- Aplicación: `apply.ts` — `DEMO_DATASET_ID`, `applyDemoDataset`, `verifyDemoDataset`,
  `isFreshDemoDatabase`.
- Pruebas: `apps/api/src/demo-seed.test.ts`.

## Cómo se aplica

Sobre una base DEMO recién creada, con identidad `demo` y sin usuario. El comando de
operación es el único punto de entrada (`tools/demo/cli.ts`), que abre la base, comprueba
el estado inicial, aplica el dataset y, opcionalmente, arranca la aplicación:

```sh
bun run demo:seed              # prepara la base y termina
bun run dev:demo               # prepara la base y arranca API + Vite
bun run dev:demo --reset       # archiva la base DEMO y crea otra
```

El contrato que usa `tools/demo/cli.ts` es:

```ts
export const DEMO_DATASET_ID = "DEMO-1";
export type DemoSummary = { dataset: string; counts: Record<string, number> };
export function applyDemoDataset(db: Database): DemoSummary;
export function verifyDemoDataset(db: Database): DemoSummary;
export function isFreshDemoDatabase(db: Database): boolean;
```

`applyDemoDataset` exige estado inicial y **no es re-aplicable**: si detecta datos lanza error.
La idempotencia de datos es por construcción (base vacía), con claves fijas
`demo-seed-<entidad>-<n>` en cada servicio y un único instante lógico
`2026-11-01T12:00:00.000Z`.

## Estado inicial de una base DEMO

`openDatabase()` con identidad `demo` (`NODE_ENV=development`/`test`) crea el esquema v29 y
siembra cinco saldos iniciales (`apps/api/src/database-schema.ts:212-218`), además de `S000`:

| Saldo | Nombre inicial | Tipo / Control |
| --- | --- | --- |
| `S000` | Exterior técnico | Exterior / Exterior |
| `S001` | Cuenta cotidiana demo | Efectivo / Movimientos |
| `S002` | Tarjeta terminal demo | Efectivo / Terminal |
| `S003` | Efectivo de inversión demo | Efectivo / Inversiones |
| `S004` | Cartera de inversión demo | Inversión / Inversiones |
| `S005` | Reserva sin control demo | Efectivo / No controlado |

`isFreshDemoDatabase` devuelve `true` solo mientras esos seis saldos sigan sin apertura ni
cambios y no existan ciclos, movimientos, clasificación, presupuestos, deudas, referencias,
inversiones, nómina, fichas compartidas, revisión de comida, planes ni previsión Dprima.

## Cobertura

Recuentos reales de `verifyDemoDataset` tras aplicar (verificados en test):

| Módulo | Tabla | Recuento |
| --- | --- | --- |
| Saldos | `saldos` | 8 (`S000` + `S001`…`S007`) |
| Categorías | `categorias` | 14 (`CAT001`…`CAT014`) |
| Subcategorías | `subcategorias` | 15 (`SUB001`…`SUB015`) |
| Partidas | `partidas` | 16 (`PAR001`…`PAR016`) |
| Presupuestos | `presupuestos` | 4 (`PRE001`…`PRE004`) |
| Deudas | `deudas` | 1 (`D001`) |
| Ciclos | `ciclos` | 10 (`1`…`10`, enero–octubre 2026) |
| Movimientos | `movimientos` | 29 (`1`…`29`) |
| Referencias | `referencias` | 3 (`REF001` anticipo, `REF002` vehículo, `REF003` compartido) |
| Fichas de anticipo | `fichas_anticipos` | 1 |
| Fichas de vehículo | `fichas_vehiculo` | 1 |
| Fichas compartidas | `fichas_compartidos` | 1 |
| Participantes | `participantes_compartido` | 2 (`CP001` titular, `CP002` tercero) |
| Aportaciones | `movimiento_compartido` | 1 |
| Instrumentos | `instrumentos` | 1 (`I1001`) |
| Operaciones de inversión | `operaciones_inversion` | 2 (compra `1`, venta `2`) |
| Nómina | `payroll` | 1 paga (`2026-01`, ID aleatorio capturado) |
| Reparto de nómina | `payroll_allocations` | 1 |
| Planes de ciclo | `cycle_plans` | 2 (ciclos `1` y `2`) |
| Líneas de plan de ciclo | `cycle_plan_lines` | 8 |
| Plan anual | `annual_plan_lines` | 3 (ejercicio 2026) |
| Revisión de comida | `revision_comida` | 2 |
| Metadatos de comida | `movimiento_revision_comida` | 1 |
| Dprima | `dprima_planificaciones` | 1 (`DP0001`) |

### Saldos

`S001`…`S005` se configuran con `updateSaldo` (nombre, finalidad, apertura y permisos) y
`S006`/`S007` se crean con `createSaldo`:

| Saldo | Nombre | Tipo / Control | Apertura |
| --- | --- | --- | --- |
| `S001` | Cuenta corriente | Efectivo / Movimientos | 2.400,00 |
| `S002` | Terminal de cobros | Efectivo / Terminal | 150,00 |
| `S003` | Efectivo para inversión | Efectivo / Inversiones | 1.200,00 |
| `S004` | Cartera de fondos | Inversión / Inversiones | 0,00 |
| `S005` | Reserva no controlada | Efectivo / No controlado | 300,00 |
| `S006` | Cuenta de ahorro | Efectivo / Movimientos | 5.000,00 |
| `S007` | Caja de casa | Efectivo / Movimientos | 400,00 |

### Clasificación

Catorce categorías. Las posiciones `CAT009`, `CAT011`, `CAT012`, `CAT013` y `CAT014` son las
que exige `referenceMapping` (`apps/api/src/reference-rules.ts:13-21`) para Vehículo, Viaje,
Anticipo, Gasto compartido y Evento. `CAT013` usa mensual `Gasto compartido neto`; el resto no
referenciado no obliga a Referencia. Hay una partida de deuda (`PAR015` → `D001`), una partida
de gasto compartido (`PAR013` → `CAT013`) y una partida de vehículo (`PAR009` → `CAT009`).

### Movimientos

29 hechos ficticios entre `2026-01-05` y `2026-10-25`, todos EUR y anteriores al ancla:
ingresos de nómina y bonus, gastos ordinarios (incluido uno con metadatos de Comida),
transferencias internas (ahorro e inversión), una compra y una venta de inversión, cuatro
amortizaciones de deuda, un gasto con Referencia Vehículo, un gasto compartido con `REF003` y
una aportación del tercero (`S000` → `S001`, Transferencia, no Ingreso) con bloque `compartido`
atribuido a `CP002`.

## Módulos omitidos y motivo

- **Cierres y fotos de periodo**: no se cierran ciclos. No es un requisito del dataset y
  cerrar exigiría los flujos de E4.9/E4.10/E4.11; el dataset deja los ciclos abiertos con plan.
- **`confirmAportacion` histórico**: la aportación se registra en el alta del Movimiento con el
  bloque `compartido`. `apps/api/src/movimientos.ts:169-181` impide crear una Transferencia
  `S000` sin ese bloque, y `confirmAportacion` solo acredita movimientos históricos previos sin
  atribución; no hay ruta pública que produzca ese estado. No se fuerza con SQL.
- **Atribución de anticipo en movimientos**: la ficha 1:1 (`REF001`) existe, pero no se crean
  adelantos/devoluciones de anticipo para no inventar un reparto no requerido.
- **`reset` / borrado**: fuera de alcance; la aplicación exige base vacía.

## Verificación

```sh
cd /Users/josemartin/Projects/myfinanzas-app-demo
NODE_ENV=test bun test apps/api/src/demo-seed.test.ts
bun run typecheck
```

El test comprueba: `isFreshDemoDatabase` antes/después, recuentos por módulo, integridad
referencial (`PRAGMA foreign_key_check`), rechazo de una segunda aplicación, coherencia de
posición de saldo, deuda (apertura − amortizaciones), reparto compartido (2 partes y aportación
exacta de 45,00 sobre un gasto de 90,00), nómina y su reparto, inversión (10 − 2 unidades y caja
de inversión 720,00), fechas dentro del ancla, planes y ausencia de SQL de escritura en
`tools/demo/**`.

## Límites

- Datos 100% ficticios: sin personas, matrículas, cuentas ni credenciales reales.
- No se importa desde `main.ts`, `app.ts` ni el `Containerfile`; no expone endpoints.
- No hay commit, push ni despliegue asociados a este dataset.
