# INFRA-TEST-01 · Paquete técnico FT-1 y diseño FT-2 (2026-11-07)

**Estado:** `[PROPUESTA]` de análisis. No implementa seed, no modifica SPEC34, no
autoriza DEV, imagen, VPS, DNS, Caddy, backups, despliegue ni merge. **Base verificada:**
`main` `c7a480f0f51e055d9420edd8957073493d43cf1c` (2026-11-07), rama
`docs/infra-test-ft-package`. **Documento:** solo añade este informe; no toca código,
`apps/`, `infra/`, schema, manifiestos ni specs aprobadas. No se ejecutó ninguna
prueba de aplicación ni de infraestructura; la verificación es lectura de repositorio.

**Fuentes leídas:** [SPEC34](../34-infra-test-01-specification.md) y
[testplan](../34-infra-test-01-testplan.md) (base `b713b08`, v24);
[SPEC31](../31-sqlite-produccion-specification.md);
[handoff vps-infra 2026-11-04](infra-test-01-infra-handoff-2026-11-04.md);
[SPEC35 D11](../35-deploy-tags-01-specification.md);
código de `apps/api/src` (`database-identity.ts`, `database-schema.ts`, `private-state.ts`,
`production-state.ts`, `nomina.ts`, servicios), `apps/api/test-support`,
`infra/` (`release.py`, `runtime.py`, `Containerfile`, `tests/`) y
[vps-infra SPEC02](https://github.com/jmartinlabs/vps-infra/blob/main/specs/02-infra-test-01-host-specification.md).

**Decisiones recuperadas:** D1–D6 siguen vigentes. D7 (aprobada el 2026-11-05 en el PR
#229, **cerrado sin merge**) mantiene `FT-1 v1` sin cierres ni fotografías y reserva `FT-2`
para una ampliación independiente. D11 de SPEC35 sigue pendiente: hay que reconciliar
SPEC34/seed con el SHA elegido; `main` ya no está en v25/v26 sino en v27.

## 0. Resumen

- `main` está en **v27/C27**, no en v24; SPEC34, testplan, handoff y el manifiesto de
  seed deben reanclarse a 27/C27 antes de implementar.
- `FT-1` sigue siendo el dataset pequeño de TEST, sin cierres ni fotografías (D5/D7).
  Las funcionalidades E4.9–E4.11 ya existen en `main`, pero se excluyen por alcance, no
  por ausencia.
- No existe `tools/test-seed` ni `FT-1`; los fixtures de `infra/tests` y
  `apps/api/test-support` no son un seed válido porque crean filas con SQL crudo.
- `FT-1` es viable con cuatro correcciones: quinto Saldo `Efectivo/Inversiones`, ID
  determinista de nómina, preflight de esquema sin migración y archivado/backup de
  marcador y manifiesto.
- `FT-2` se diseña aparte, con 3–5 años y volumen realista, y queda bloqueado por D7 y
  por E3.5/FIN_NETA y DT6/backup. No se implementa en este trabajo.

---

## 1. Reconciliación SPEC34 ↔ `main` v27

### 1.1 Diferencia de contrato

| Elemento | SPEC34 (base `b713b08`) | `main` `c7a480f` | Cambio propuesto, **no aplicado** |
| --- | --- | --- | --- |
| Esquema | `schemaVersion = 24` | `schemaVersion = 27` | Reanclar SPEC34, testplan y manifiesto de seed a **27**. |
| Contrato | No fija contrato explícito; presupone v24 | `C27-E411-FOTOS-PERIODO`, 320 objetos, `sha256 = ecc4306bfaa6e27cf41ed15d30f612684051ef53bdf557eb8535187bf1a57e23` | Declarar en el manifiesto `schema=27`, `contract=C27…` y su checksum. |
| Contrato de backup | v24 | `e4.11-v27` (derivado por `release.py` de `backup.ts`) | Declarar `data_contract=e4.11-v27` en el manifiesto de seed y en la evidencia. |
| E4.9 | «no mergeado»; TEST anclado a v24 | Integrado (`0176ffc`, v25/C25) | Corregir la tabla de estado y la razón de exclusión. |
| E4.10 | «en borrador» | Integrado (v26/C26) | Igual: excluido por D5/D7, no por ausencia. |
| E4.11 | «en borrador» | I1–I6 integrados; v27/C27 | Excluido de `FT-1` por D5/D7, no por ausencia. |
| E4.5/E4.7 | «fuera» | Estado distinto según tablero; no se reabre | Mantener fuera de `FT-1`; documentar la razón vigente. |
| Seed | Diseño `tools/test-seed/` | **No existe** ninguna herramienta ni dataset `FT-1` | Mantener el diseño y crear la herramienta en un incremento autorizado. |
| Fixtures existentes | No las menciona | `infra/tests/release-fixture.mjs` usa `INSERT` crudos y cubre el contrato de release; `apps/api/test-support` son fixtures de tests | **No reutilizar** como seed de `FT-1`; no cumplen «solo servicios» ni determinismo de IDs. |
| Manifiesto de release | «registra par app+seed» | `manifest.json` registra `contracts={schema:27,data:e4.11-v27}`, imagen, frontend y hashes; **no** registra seed | Añadir, en su incremento, un bloque/artefacto `seed` o un `release-pair.json` verificado. |
| Rutas | No hay rutas de seed | Existen `/api/cierres`, `/api/fotos`, etc.; no hay endpoint de seed | No añadir endpoint ni flag. `FT-1` no llama a cierres/fotos. |
| Runtime | `runtime.py:render` fija `18081` y PROD | Sin cambios | TEST sigue fuera de `render`; vps-infra define `18082`. |
| Rutas de estado | `<data-root>/state`, marcador y manifiesto en raíz | `private-state.ts` y `production-init` coherentes | Mantener; ver §2.4. |
| Secuencia | `production-init → seed → setup` | `production-init` crea estado limpio; `setup` exige estado válido | Mantener. |
| Backup | Snapshot DB+clave | `backup.ts`/`restore` solo tratan DB+clave; **no** copian marcador ni manifiesto de seed | Resolver en el incremento de seed (§1.3, H5). |
| Handoff vps-infra | Base v24; E4.9 no mergeado | Handoff desactualizado | Actualizar el handoff en una rama documental autorizada; no en este commit. |
| Testplan | AC02 ancla v24; AC08 excluye E4.9/E4.10/E4.11 | Main ya los tiene | Actualizar AC02/AC08 y la evidencia esperada; mantener `FT-1` sin esos módulos. |
| SPEC35 D11 | Bloqueo por v25/v26 | Main v27; D11 sigue abierto | Este paquete propone v27/C27 como primer candidato, sin habilitar tags ni TEST. |

### 1.2 Lo que no cambia

- Identidad productiva `production` + pareja DB/clave, `production-init`, `setup`,
  `backup-cli`, UID `10001`, bind interno `0.0.0.0`, puerto `3001`, health
  `{"ok":true}`, ruta protegida `401` y cookies `__Host-`.
- `infra/Containerfile` de producción **no** copia `tools/test-seed`; el contexto de
  `release.py` solo materializa `apps/api/src`, `apps/web/src` y ficheros de receta.
- `C27` es aditivo; las tablas de cierres/fotos existen aunque `FT-1` no las use.

### 1.3 Hallazgos que impiden una implementación literal de SPEC34

| # | Hallazgo | Evidencia | Propuesta (sin aplicar) |
| --- | --- | --- | --- |
| H1 | `FT-1` dice «4 altas» de Saldos, pero una Compra exige un Saldo `Efectivo/Inversiones` y otro `Inversión/Inversiones`. Con solo 4 altas no se puede registrar la compra por servicios. | `compras.ts:validReferences` exige `tipo=Efectivo, control=Inversiones` y `tipo=Inversión, control=Inversiones`. | Enmienda de `FT-1 v1`: añadir `S002 Efectivo/Inversiones` (5 altas). Alternativa: omitir la compra y declarar E4.1 no cubierto; no recomendada. |
| H2 | `confirmPayroll` genera `id = "PAGA-" + randomUUID()`, por lo que dos ejecuciones limpias no producen los mismos IDs. | `nomina.ts:parsePay`. | **Propuesta pendiente de aprobación:** permitir un `id` determinista solo en la creación usada por el seed (p. ej. `PAY001`), conservando el UUID por defecto en la API. Si no se aprueba, `FT-1` omite la nómina y rebaja AC05. |
| H3 | `openDatabase` en producción ejecuta `prepareSchema`, que puede migrar cualquier versión admitida anterior a 27. El seed no debe migrar ni «arreglar». | `database.ts`, `database-schema.ts`. | Preflight de solo lectura (`schema_version=27` + `verifyContract`) **antes** de abrir la conexión de escritura; usar `openProductionConnection` y aplicar PRAGMA de conexión (FK, busy_timeout, WAL, synchronous) sin migrar. |
| H4 | `seed reset` archiva `<data-root>/state`, pero no dice qué pasa con `test-instance.json` y `seed-manifest.json`; quedan apuntando a un estado archivado. | SPEC34 §4.8. | Archivar también marcador y manifiesto en `reset/state-<UTC>/` y dejar la raíz sin marcador; la recreación exige nueva `seed init`. |
| H5 | `backup-cli restore` restaura DB+clave, pero no marcador/manifiesto; `seed verify` sobre el destino restaurado no puede comparar el manifiesto. | `backup.ts`, `backup-cli.ts`. | Incluir una copia cifrada del manifiesto/marcador en el paquete de backup o permitir `seed verify --manifest <ruta>` con el manifiesto de evidencia. Decidir en el incremento de backup/seed. |
| H6 | `validateSharedReferenceOperation` exige `CAT013` para un Gasto con Referencia de Gasto compartido; `FT-1` solo crea `CAT001`/`CAT002`. | `reference-rules.ts`, `movimientos.ts`. | **Decisión pendiente:** añadir `CAT013` y una Partida para el Gasto compartido, o eliminar `REF001` del movimiento 5 y declarar cobertura parcial. No se resuelve por inferencia. |
| H7 | El manifiesto de release no registra el seed; el manifiesto de seed no existe. | `infra/release.py`. | Artefacto/manifiesto de seed separado y bloque de pareja en la release; no tocar el manifiesto de producción hasta el incremento autorizado. |
| H8 | `infra/tests/release-fixture.mjs` y `release-contract.mjs` usan SQL crudo y `installFixture`; no son un seed válido. | `infra/tests/*`. | No reutilizarlos para `FT-1`; conservarlos como aceptación de release. El seed solo usará servicios. |
| H9 | El handoff de vps-infra cita v24 y E4.9 no mergeado. | `infra-test-01-infra-handoff-2026-11-04.md`. | Actualización documental posterior; el host ya declara `schema=27` y contrato pendiente en su SPEC02. |
| H10 | El testplan espera `schema_version=24` y ausencia de E4.9/E4.10/E4.11. | Testplan AC02/AC08. | Reanclar a 27/C27 y cambiar la justificación de exclusión a D5/D7. |
| H11 | `seed reset` debe rechazar si el health de `127.0.0.1:18082` responde, pero el seed se ejecuta con `--network=none`; desde ese namespace no se puede consultar el loopback del host. | SPEC34 §4.4 y §4.8. | Decidir: preflight de salud ejecutado por vps-infra con evidencia/precondición verificable, o una ejecución de `reset` con red de solo lectura al loopback. No relajar `--network=none` para `apply`. |

---

## 2. Paquete técnico `FT-1`

### 2.1 Identidad y formato

- **Dataset:** `FT-1`, versión `1`, formato `1`, fijado en un módulo TypeScript/JSON
  legible y congelado. No se genera con aleatoriedad ni con reloj de pared.
- **Ancla temporal:** todas las llamadas a servicios usan `now = 2025-12-31T12:00:00Z`.
  Ninguna fecha de hecho supera `2025-12-31`; así el dataset no depende del día de
  ejecución ni de guardas de fechas futuras.
- **Origen:** base productiva limpia creada por `production-init` (identidad
  `production`), sin usuario. `setup` se ejecuta **después** de `seed verify`.
- **Semántica:** creación exclusivamente con servicios de `apps/api/src`
  (`createSaldo`, `createClassification`, `createReference`, `createDebt`,
  `createBudget`, `createCycle`, `previewMovement`/`writeMovement`,
  `createInstrumento`, `createPurchase`, `createAnticipo`, `createCompartido`,
  `createParticipante`, `confirmPayroll`). **Prohibido** `INSERT`/`UPDATE`/`DELETE`
  crudo para crear entidades, contadores, auditoría o idempotencia.

### 2.2 Dataset fijo propuesto

Los importes son ficticios y están en EUR. Los nombres llevan `TEST`. La propuesta
incluye **cinco altas** de Saldos (H1); requiere enmienda autorizada antes de implementar.

**Saldos** (S000 del sistema no se toca):

| ID | Nombre | Tipo | Control | Apertura | Fecha | `permiteSalidaExterior` |
| --- | --- | --- | --- | --- | --- | --- |
| S001 | Efectivo TEST | Efectivo | Movimientos | 1000.00 | 2025-01-01 | true |
| S002 | Efectivo inversión TEST | Efectivo | Inversiones | 500.00 | 2025-01-01 | true |
| S003 | Terminal TEST | Efectivo | Terminal | 100.00 | 2025-01-01 | true |
| S004 | No controlado TEST | Efectivo | No controlado | 0.00 | 2025-01-01 | true |
| S005 | Cartera TEST | Inversión | Inversiones | 0.00 | 2025-01-01 | false |

**Clasificación, presupuesto y deuda:**

| ID | Tipo | Nombre | Padre / relación |
| --- | --- | --- | --- |
| CAT001 | Categoría | Ingreso TEST | anual `Ingreso`, mensual `Ingreso`, referencia `false` |
| CAT002 | Categoría | Gasto TEST | anual `Gasto`, mensual `Gasto`, referencia `false` |
| SUB001 | Subcategoría | Nómina TEST | CAT001 |
| SUB002 | Subcategoría | Gastos TEST | CAT002 |
| SUB003 | Subcategoría | Deuda TEST | CAT002 |
| PAR001 | Partida | Nómina TEST | SUB001 |
| PAR002 | Partida | Gasto general TEST | SUB002, presupuesto PRE001 |
| PAR003 | Partida | Gasto compartido TEST | SUB002, presupuesto PRE001 |
| PAR004 | Partida | Amortización deuda TEST | SUB003, deuda D001 |
| PRE001 | Presupuesto | Presupuesto mensual TEST | fuente `Gasto real`, destino S001 |
| D001 | Deuda | Deuda TEST | inicio 2025-01-01, apertura 1200.00, `No hipotecaria`, TIN 5.000000, TAE 5.116190, cuota 150.00 |

**Referencias y fichas:**

| ID | Tipo | Nombre / datos |
| --- | --- | --- |
| REF001 | Gasto compartido | Gasto compartido TEST; ficha compartida; CP001 `Titular TEST` (1 parte), CP002 `Tercero TEST` (1 parte) |
| REF002 | Anticipo | Anticipo TEST; apertura 2025-01-15; evidencia `documento ficticio TEST` |
| REF003 | Vehículo | Vehículo TEST; matrícula `TEST-0001`; próxima ITV 2025-06-30; cita nula |

**Ciclo:** `1`, inicio `2025-01-20`, saldo inicial de comida `300.00`. Sin cierres,
reaperturas ni fotografías.

**Movimientos:**

| ID | Fecha | Tipo | Importe | Saldo / origen → destino | Clasificación / referencia |
| --- | --- | --- | --- | --- | --- |
| 1 | 2025-01-25 | Ingreso | 2500.00 | S000 → S001 | subtipo `Nómina` |
| 2 | 2025-02-03 | Gasto | 120.00 | S001 → S000 | PAR002 |
| 3 | 2025-02-05 | Transferencia | 200.00 | S001 → S003 | — |
| 4 | 2025-02-10 | Amortización deuda | 150.00 | S001 → S000 | PAR004 (D001) |
| 5 | 2025-02-12 | Gasto | 90.00 | S001 → S000 | PAR003, REF001 |
| 6 | 2025-02-20 | Transferencia | 500.00 | S001 → S003 | REF002 + bloque anticipo `Adelanto` |

**Inversión:** instrumento `I1001` (`Instrumento TEST`, divisa EUR), compra `1`:
2025-02-25, cantidad 10, precio 10.00, importe 100.00, comisión 0.00, saldo efectivo
S002, saldo inversión S005.

**Nómina:** `PAY001` (requiere H2), mes 2025-01, ordinaria, guardia `No`, devengo
2500.00, base 2500.00, IRPF 15.00, variable 0.00, histórico 2500.00, documentado
2500.00, evidencias ficticias, verificado y documentado verificado. Asignación de
2125.00 al movimiento 1. Si H2 no se aprueba, se omite la nómina y se registra la
omisión; no se usa SQL crudo para inventar el ID.

### 2.3 Manifiesto y checksums

`seed-manifest.json` (0600, no secreto) propuesto:

```json
{
  "format": 1,
  "dataset": {
    "id": "FT-1",
    "version": 1,
    "file_sha256": "<hash del fichero revisado>",
    "logical_sha256": "<hash canónico del dataset>"
  },
  "source": {
    "commit": "<SHA40 del artefacto de seed>",
    "schema": 27,
    "schema_contract": "C27-E411-FOTOS-PERIODO",
    "schema_contract_sha256": "ecc4306bfaa6e27cf41ed15d30f612684051ef53bdf557eb8535187bf1a57e23",
    "data_contract": "e4.11-v27",
    "bun": "1.4.3",
    "seed_image": "sha256:<ID inmutable>"
  },
  "environment": {
    "name": "test",
    "public_origin": "https://test.myfinanzas.pp.ua",
    "data_root": "/var/lib/myfinanzas",
    "database": "state/database.sqlite",
    "key": "state/auth.key"
  },
  "ids": { "saldos": ["S001", "S002", "S003", "S004", "S005"], "ciclos": ["1"], "movimientos": ["1", "2", "3", "4", "5", "6"] },
  "counts": { "saldos": 6, "movimientos": 6, "ciclos": 1, "deudas": 1, "presupuestos": 1, "referencias": 3, "instrumentos": 1, "operaciones_inversion": 1, "payroll": 1 },
  "empty_tables": ["cierres", "fotos_cierre", "cierre_audit", "cierre_attempts", "reaperturas", "reapertura_activa", "cierre_vinculos", "fotos_periodo", "foto_periodo_componentes", "periodo_attempts", "revision_comida", "movimiento_revision_comida", "cycle_plans", "cycle_plan_lines", "annual_plan_lines", "conciliaciones_deuda", "valoracion_inversion", "dprima_aperturas", "dprima_lineas", "dprima_mapping", "dprima_plan_mensual", "dprima_planificaciones"],
  "logical_checksums": { "<tabla>": "<sha256>" },
  "excluded_from_hash": {
    "tables": ["owner", "auth_events", "auth_limits", "sessions", "challenges", "bootstrap", "recovery", "idempotency"],
    "table_patterns": ["*_attempts"],
    "columns": ["instante", "creado", "actualizado", "creado_en", "actualizado_en", "key_hash"]
  },
  "created_at": "2025-12-31T12:00:00.000Z"
}
```

El marcador `<data-root>/test-instance.json` (0600) contiene:

```json
{
  "format": 1,
  "environment": "test",
  "public_origin": "https://test.myfinanzas.pp.ua",
  "dataset": "FT-1",
  "dataset_version": 1,
  "schema_version": 27,
  "schema_contract": "C27-E411-FOTOS-PERIODO",
  "seed_manifest_sha256": "<hash del manifiesto>",
  "seed_image": "sha256:<ID inmutable>",
  "created_at": "2025-12-31T12:00:00.000Z"
}
```

**Canonicalización de checksums:** JSON estable con claves ordenadas; campos
length-prefixed y UTF-8; NULL como centinela distinto de `""`; importes como texto
decimal canónico; fechas `YYYY-MM-DD`; orden por clave primaria. Se excluyen
`owner`, autenticación/sesiones/desafíos, `idempotency`, todas las `*_attempts`, los
instantes y las marcas `creado`/`actualizado`. `database_origin.key_hash` se excluye
porque `production-init` genera una clave aleatoria en cada ejecución limpia; sí se
incluyen `origin=production` y `contract=1`. `counters` y `schema_version` se incluyen.
Las tablas de auditoría se incluyen con proyección estable (entidad/acción/revisión/
motivo/actor) y sin instantes ni payloads que contengan timestamps. No se promete
igualdad byte a byte de SQLite (WAL, orden físico y páginas libres).

### 2.4 Invariantes y guardas

1. `NODE_ENV=production` y `APP_ORIGIN=https://test.myfinanzas.pp.ua` exactos; otro
   origen se rechaza con código `2`.
2. `test-instance.json` regular, `0600`, `environment=test`, origen exacto y manifiesto
   coherente.
3. `--data-root` absoluto, canónico, sin symlinks; `<root>/state` `0700`; DB/clave
   `0600`; UID efectivo; DB y clave en el mismo directorio.
4. Esquema **27/C27** verificado en solo lectura; cualquier versión distinta de 27
   (incluidas 24/25/26/28) → `2`, sin migrar.
5. `owner` vacío en el primer seed; `movimientos=0`; `audit=0`; `saldos=1` (solo S000);
   cierres/fotos en 0; sin `seed-manifest.json` previo.
6. No acepta ficheros, stdin, Excel, SQL externo, `--from` ni datos de entorno.
7. Idempotencia: si marcador + manifiesto + checksums coinciden, `apply` es no-op `0`
   antes de las guardas 5–6. Un estado parcial o un checksum distinto → `3` sin reparar.
8. Todas las fechas de hecho ≤ 2025-12-31; sin reloj de pared; sin aleatoriedad; claves
   de idempotencia fijas `seed-ft1-<entidad>-<n>`.
9. `S000` solo interviene como contraparte técnica de Ingreso/Gasto; no se renombra ni
   se modifica.
10. No hay cierres, reaperturas, fotografías, históricos E4.5, resumen anual E4.7,
    Dprima, ventas, valoraciones ni conciliaciones.
11. `reset` solo archiva `<root>/state` + marcador + manifiesto + `seed-failure.json` si
    existe; nunca toca PROD ni copias cifradas.
12. El manifiesto y el marcador no contienen claves, tokens, contraseñas ni contenido
    financiero real.
13. No se promete atomicidad global entre servicios. Un fallo escribe
    `<data-root>/seed-failure.json` `0600` con el paso alcanzado (sin secretos), no declara
    éxito parcial y exige `reset` antes de reintentar.
14. `seed init` puede escribir el hash del manifiesto **esperado** calculado del dataset;
    `seed apply` escribe el manifiesto efectivo, completa `seed_image` desde el ID
    inmutable del artefacto y exige que ambos hashes coincidan.
15. `reset` es la única operación que archiva; su comprobación de salud no puede
    prescindir del preflight del host (H11).

### 2.5 Cobertura

| Área | Servicio / IDs | Verificación API/UI |
| --- | --- | --- |
| Saldos E1.1 | `createSaldo` S001–S005 | `GET /api/saldos`; ficha; S000 oculto salvo `tecnico=true` |
| Clasificación E1.2 | `createClassification` CAT/SUB/PAR | Catálogos y formulario de Movimiento |
| Ciclos E1.3 | `createCycle` 1 | `GET /api/ciclos`; contexto |
| Movimientos E1.4 | `writeMovement` 1–6 (4 tipos) | `GET /api/movimientos`; alta/lista |
| Referencias E1.5 | `createReference` REF001–REF003 | `GET /api/referencias`; gasto con REF001 |
| Deuda E1.6 | `createDebt` D001 + movimiento 4 | `GET /api/deudas`; amortización |
| Presupuesto E2.2 | `createBudget` PRE001 | `GET /api/presupuestos`; PAR002/PAR003 |
| Nómina E3.1 | `confirmPayroll` PAY001 + asignación | `GET /api/nomina` (si H2) |
| Compartido E3.2 | `createCompartido` REF001 + CP001/CP002 + movimiento 5 | `GET /api/compartidos/fichas` |
| Vehículo E3.3 | `createReference` REF003 | `GET /api/vehiculos`; ficha 1:1 |
| Anticipo E3.4 | `createAnticipo` REF002 + movimiento 6 | `GET /api/anticipos/fichas` |
| Inversión E4.1 | `createInstrumento` I1001 + `createPurchase` 1 | `GET /api/instrumentos`, `/api/compras` |

Cobertura **excluida por D5/D7** (no se declara cubierta): E2.1 operaciones de ciclo,
E2.3/E2.4 según alcance, E3.5/FIN_NETA, E4.2 ventas, E4.3 valoración, E4.5 históricos,
E4.7 resumen anual, E4.9 cierres, E4.10 reaperturas, E4.11 fotografías, Dprima.
La referencia obligatoria por categoría no se cubre (H6); la referencia opcional sí.

### 2.6 Volumen y tiempos objetivo

| Métrica | `FT-1` | `FT-2` (diseño) |
| --- | --- | --- |
| Filas de negocio | ~100–150 | 8.000–12.000 |
| Tamaño SQLite | < 2 MB | 40–80 MB |
| `seed apply` en E1 | < 10 s | 2–5 min |
| `seed verify` | < 5 s | < 30 s |
| `seed reset` | < 2 s | < 10 s |
| Consulta de lista (p95) | < 200 ms | < 500 ms |
| Cierre / foto (p95) | no aplica | < 3 s |

Son objetivos de ensayo en E1, no garantías del VPS. El host real (2 vCPU/3,8 GiB)
debe medirse en la fase correspondiente.

### 2.7 Criterios de aceptación del paquete

| ID | Criterio verificable | Evidencia | Fase |
| --- | --- | --- | --- |
| `FT1-AC01` | Manifiesto y marcador declaran `FT-1 v1`, esquema 27, C27, `e4.11-v27`, commit y checksum del dataset. | `seed-manifest.json`, `test-instance.json`, `seed verify` | 3/4 |
| `FT1-AC02` | Guardas negativas: origen PROD, marcador ausente/ajeno, ruta relativa/symlink, permisos anchos, owner existente, estado no vacío, esquema distinto de 27 (24/25/26/28). | Códigos `2`/`3`, estado intacto | 3/4 |
| `FT1-AC03` | Dos ejecuciones limpias independientes producen los mismos IDs, fechas, importes y checksums lógicos, salvo `key_hash`. | Dos manifiestos comparados | 4 |
| `FT1-AC04` | Segundo `seed apply` es no-op `0`; un estado parcial se rechaza sin reparación. | Conteos, checksums y ausencia de escrituras | 4 |
| `FT1-AC05` | `seed reset` archiva solo estado/marcador/manifiesto TEST y deja secuencia de recreación; no toca PROD ni copias. | Árbol antes/después y hashes | 8 |
| `FT1-AC06` | La imagen de producción no contiene `tools/test-seed`, dataset ni manifiesto de seed. | Inventario de ambas imágenes y verificación de release/seed | 3 |
| `FT1-AC07` | Cobertura §2.5 y exclusiones §2.5; sin tablas de cierres/fotos con filas. | Diff del dataset, SQL de solo lectura | 3/4 |
| `FT1-AC08` | Smoke API/UI con MFA sobre IDs ficticios; sin sesión `401`; sin errores ni datos ajenos. | Respuestas API y capturas privadas | 4/7 |
| `FT1-AC09` | Backup cifrado y restore aislado conservan `FT-1` y permiten `seed verify` con la evidencia del manifiesto (resuelve H5). | Checksums, restore, health/401 | 7/8 |
| `FT1-AC10` | Volumen y tiempos §2.6 medidos en E1; sin fallos de integridad/FK. | `integrity_check`, tiempos, tamaño | 3/4 |
| `FT1-AC11` | Sin Excel, bases reales, exportaciones, credenciales, PII ni datos de PROD; solo `FT-1`. | Inventario redactado y revisión | 4/7 |
| `FT1-AC12` | El seed no migra el esquema: cualquier versión distinta de 27 (24/25/26/28) se rechaza antes de abrir escritura; 27 permanece 27. | `schema_version` antes/después | 3/4 |

Mapeo: `FT1-AC01/02/07/12` → SPEC34 AC02/AC04/AC08; `FT1-AC03/04` → AC05/AC06;
`FT1-AC05` → AC07; `FT1-AC06` → AC03/AC10; `FT1-AC08` → AC09/AC11;
`FT1-AC09` → AC14; `FT1-AC10/11` → AC16/AC18. Ningún AC se declara PASS aquí.

### 2.8 Ownership

| Elemento | MyFinanzas (`myfinanzas-app`) | `vps-infra` | Usuario |
| --- | --- | --- | --- |
| Dataset `FT-1`, CLI, manifiesto, checksums, tests | Propietario y ejecutor en E1 | Consume el artefacto | Aprueba |
| Imagen test-only, par release+seed, gate Rootless | Propietario | Verifica y carga | Autoriza |
| Rutas, UID, permisos, mount, tareas efímeras | Define el contrato de datos | Propietario y ejecutor | Autoriza |
| `production-init`, `setup`, seed, reset | Entrega comandos y evidencia | Ejecuta en host | Autoriza cada fase |
| Backup local/externo, restore, rollback | Contrato de app | Ejecuta y custodia | Decide destino/claves |
| Unidad `18082`, Caddy, DNS, UFW | No accede | Propietario | Autoriza |

### 2.9 Gates de autorización

| Gate | Autorización | Efecto |
| --- | --- | --- |
| G0 | Aprobar este paquete y la enmienda documental de reconciliación | Habilita planificar, no implementar |
| G1 | Autorizar DEV del seed `FT-1` (incremento I1) | Permite escribir herramienta y tests, sin imagen ni host |
| G2 | Autorizar artefacto/imagen test-only y par de release (I2) | Permite construir y verificar en E1 |
| G3 | Autorizar ejecución E1 (sin VPS) | Permite production-init/seed/verify/reset/backup en entorno desechable |
| G4 | Autorizar fase 4 del host TEST | Permite ejecutar el seed en el VPS, tras Rootless y contrato |
| G5 | Autorizar backup/restore de TEST | Permite copia local/externa y simulacro |
| G6 | Autorizar `FT-2` como entrega independiente | Permite diseñar/implementar el generador, con D7/E3.5/DT6 resueltos |
| G7 | Aprobar merge de cualquier PR | No se deduce de G0–G6 |

Ningún gate autoriza VPS, DNS, Caddy, despliegue ni merge por sí mismo.

---

## 3. Diseño `FT-2` (dataset realista, no implementado)

### 3.1 Condición y separación

`FT-2` no forma parte de INFRA-TEST-01. D7 lo reserva para una ampliación independiente
y exige resolver E3.5/FIN_NETA y DT6/backup antes de implementarlo. Debe ser un
**dataset y generador distintos**:

- `FT-1` es fijo, pequeño y revisable; no se genera.
- `FT-2` es un perfil determinista generado por semilla y parámetros versionados; no
  importa constantes de `FT-1` ni escribe sobre un estado `FT-1`.
- Manifiestos, IDs de dataset, CLI y evidencias separados. `seed verify` de `FT-1`
  rechaza `FT-2`; el generador `FT-2` no acepta `FT-1`.
- `FT-2` no se aplica al TEST de línea base; solo a entornos E1 desechables o a una
  instancia TEST nueva autorizada.
- Código compartido permitido: canonicalización de checksums, guardas de ruta y
  utilidades de manifiesto. Nunca datos, IDs ni flujo de aplicación de `FT-1`.
- El generador y el perfil viven en `myfinanzas-app`. `vps-infra` solo ejecuta la tarea
  efímera sobre un `data-root` aislado, con UID/mount correctos, y conserva evidencia;
  no edita dataset, manifiesto ni checksums.

### 3.2 Perfil realista propuesto

Horizonte fijado: **2021-10-20 → 2026-09-20**, 60 ciclos mensuales, con todos los
ciclos cerrados salvo el último. No usa la fecha actual.

| Ámbito | Distribución objetivo |
| --- | --- |
| Saldos | 10: 3 Efectivo/Movimientos, 2 Efectivo/Terminal, 1 Efectivo/No controlado, 2 Efectivo/Inversiones, 2 Inversión/Inversiones |
| Ciclos | 60; inicio mensual fijo; 59 cerrados, 1 abierto; 6 reaperturas con v2 |
| Movimientos | ~3.000: 70 % Gasto, 22 % Ingreso, 6 % Transferencia, 2 % Amortización; ~50/mes |
| Compras / ventas | 3 instrumentos; 150 compras (2,5/mes), 36 ventas (0,6/mes) |
| Deudas | 3 deudas; 72 amortizaciones; 12 conciliaciones |
| Anticipos | 24 fichas; 48 transferencias (adelanto/devolución) |
| Comida | 720 registros; 36 devoluciones; 60 ciclos con saldo de comida |
| Compartidos | 36 fichas; 72 participantes; 108 gastos compartidos |
| Nómina | 60 ordinarias + 10 bonus; 70 asignaciones |
| Presupuestos / planes | 12 presupuestos; 60 planes de ciclo; 720 líneas |
| Cierres / fotos | 59 cierres; 20 fotos trimestrales y 5 anuales; 2 versiones en periodos reabiertos |
| Plan anual | 5 ejercicios × 8 partidas = 40 líneas |
| Volumen | 8.000–12.000 filas; 40–80 MB |

### 3.3 Pruebas de `FT-2`

- Determinismo: dos generaciones desde estado limpio con la misma semilla producen
  el mismo manifiesto lógico; el `key_hash` y los timestamps quedan fuera.
- Distribución: conteos por tipo/mes dentro de ±5 % del perfil; ningún mes vacío;
  todos los movimientos dentro de un ciclo; sin fechas futuras.
- Consultas: listados paginados, filtros, `resumen-inicio`, ciclo, deuda, nómina,
  presupuesto y plan anual; p95 según §2.6.
- Cierres: preflight, cierre, foto, reapertura y re-cierre; ventanas contiguas; foto
  inmutable; agregados trimestrales/anuales coherentes; sin downgrade.
- Rendimiento: `seed apply` 2–5 min, `verify` < 30 s, memoria < 512 MB, DB < 100 MB;
  medido en E1, no prometido en VPS.
- Integridad: `PRAGMA integrity_check=ok`, `foreign_key_check` vacío, conteos y
  checksums; sin tablas E4.5.
- Aislamiento: no lee Excel, bases reales, `.env`, secretos ni estado de PROD.

### 3.4 Límites de `FT-2`

No se implementa ahora. No se usa para el smoke de TEST, no se mezcla con `FT-1`, no
se declara cobertura E3.5/E4.5, no se despliega y no se aprueba por este documento.
Su spec/testplan y su autorización son independientes.

---

## 4. Incrementos propuestos

| Incremento | Objetivo | Archivos/módulos previstos | Pruebas | Parada |
| --- | --- | --- | --- | --- |
| I0 | Reconciliación documental (este informe y enmienda futura de SPEC34/testplan/handoff) | `specs/34-*`, `specs/investigations/infra-test-01-infra-handoff-*` | `scripts/verify` perfil docs; diff solo docs | No toca código ni seed; requiere autorización |
| I1 | Núcleo del seed `FT-1` | `tools/test-seed/{cli,dataset/ft1,manifest,checksum,guards,apply,verify,reset,status}.ts`, tests y README; `apps/api/src/nomina.ts` solo si se aprueba H2 | Unitarias de guardas/checksums; doble ejecución; no-op; reset; sin SQL crudo | Sin imagen, host ni VPS |
| I2 | Imagen test-only y par release+seed | `Containerfile.seed`, `infra/seed_release.py`, `infra/tests/seed-ft1.py`, bloque `seed` en el manifiesto de release o `release-pair.json` | Build repetible, inventario, verificación de release/seed, Rootless E1 | La imagen de producción no cambia; sin VPS |
| I3 | Handoff y ensayo E1 | actualización del handoff, script/CI de E1, evidencia de seed/backup/restore | production-init → seed → verify → backup → restore → reset en directorio desechable | Sin VPS, DNS, Caddy ni deploy |
| I4 | Generador `FT-2` (solo si G6) | `tools/test-data/{cli,profile,generator,manifest}.ts` y tests; spec/testplan propios | Determinismo, distribución, consultas, cierres, rendimiento | Gated por D7/E3.5/DT6; no se aplica a TEST |

**Orden:** G0 → I0 → G1 → I1 → G2 → I2 → G3 → I3. I4 es una entrega separada y
posterior; no bloquea `FT-1`. Cada incremento es un PR independiente con CI y QA; no se
paralizan escritores sobre los mismos archivos.

**Archivos que no se tocan en I1–I3:** `apps/api/src/main.ts`, `apps/api/src/app.ts`
(rutas), `infra/Containerfile` de producción, `infra/runtime.py`, esquema/migraciones,
`specs/34` (salvo I0 autorizado) y `vps-infra`.

---

## 5. Riesgos, límites y lo que no se implementa

### 5.1 Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Deriva de esquema tras v27 | Seed/manifiesto obsoletos | Congelar SHA y contrato; regenerar solo con nueva versión aprobada |
| Cambio de servicios o IDs | Dos ejecuciones no coinciden | Tests de determinismo; H2 para nómina; revisión de servicios |
| SQL crudo o bypass de invariantes | Datos incoherentes/auditoría falsa | Prohibición, revisión y test estático; solo lectura en verify |
| Seed en entorno equivocado | Contaminación o pérdida | Marcador + origen + ruta + owner + base vacía; fallo cerrado |
| Migración silenciosa | Se siembra un esquema distinto | Preflight de solo lectura; cualquier versión ≠27 → `2` |
| Reset/backup pierden evidencia | Imposible verificar restauración | Archivar marcador/manifiesto; incluirlos en la evidencia de backup |
| Reset sin preflight de salud | Se archiva una unidad activa | H11: preflight del host con evidencia o red de solo lectura para `reset` |
| Imagen de seed en producción | Superficie innecesaria | Inventario de rootfs; `Pull=never`; ID inmutable |
| `FT-1` no cubre cierres/fotos | Falsa sensación de cobertura | Declararlo; `FT-2` separado y gated |
| Rendimiento no representativo | Decisiones erróneas | `FT-2` con perfil realista y medición E1 |
| VPS 2 vCPU/3,8 GiB/40 GB | Disco/contención | Límites y presupuesto de vps-infra; no se toca el host |
| Datos ficticios confundidos con reales | Riesgo de privacidad | Nombres `TEST`, procedencia, revisión y ausencia de Excel/PII |

### 5.2 Límites de los datos ficticios

- Solo personas, cuentas, instrumentos, matrículas y conceptos ficticios con `TEST` en
  el nombre. No se usan nombres, importes, fechas ni identificadores reales.
- No se importa el Excel, una base real, un volcado, un `.env` ni un fichero externo.
- No se copia, monta ni «limpia» estado de PROD. `FT-1` nace de `production-init`.
- No hay datos personales, credenciales, tokens, TOTP, cookies ni claves en el
  dataset, manifiesto, logs o Git.
- No se inventan reglas financieras nuevas: el dataset solo ejercita servicios y
  contratos existentes.
- La auditoría de los servicios usa su actor fijo `usuario-unico`; la procedencia del
  seed se acredita con marcador, manifiesto y checksums, no con un actor distinto. No se
  cambia el contrato de auditoría para el seed.

### 5.3 Qué **no** se implementa en este trabajo

- Ningún fichero de `tools/test-seed`, `tools/test-data`, `Containerfile.seed`,
  `seed_release.py` o test de seed.
- Ningún cambio en `apps/api/src`, `infra/`, `scripts/`, `apps/web`, esquema,
  migraciones, rutas, manifiestos o `specs/34`.
- Ninguna imagen, release, dataset `FT-1` aplicado, backup, restore, reset ni
  evidencia de ejecución.
- Ningún acceso al VPS, SSH, DNS, Caddy, UFW, Podman, systemd, disco o backups.
- Ningún `FT-2`, generador, seed real, datos reales, despliegue, tag, PR o merge.
- Ninguna modificación de `vps-infra`.

### 5.4 Próxima acción

El usuario debe decidir si aprueba este paquete y la enmienda de reconciliación
(v27/C27, G1–G6 y los hallazgos H1–H11). Sin esa aprobación, la siguiente acción
segura es solo revisar este documento y el diff documental; no se solicita E1, VPS
ni DEV.
