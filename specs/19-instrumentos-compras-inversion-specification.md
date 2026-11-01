# 19 — E4.1 Instrumentos y Compras de inversión: Specification

Status: **APPROVED rev10 — IMPLEMENTADA en DEV19 (v18)** — aprobada por el usuario el
2026-10-27; **C16 y C17 congelados** en `apps/api/src/schema-contracts.json` el 2026-10-27.
Rev10 reconcilia el destino **18** con
`origin/main` `9977210` (esquema 17, D5/PR90) y **no cambia ninguna decisión funcional** de
rev7/rev8. **DEV19 implementó la 18** sobre `main` `9977210`: código adaptado, C16/C17
admitidos y cadena 16→17→18; la congelación de manifiestos se mantiene intacta. Sin merge ni
despliegue. El DEV/QA histórico del contrato 16 queda superado por la evidencia DEV19.

**Nota de vigencia (2026-10-29):** PR #95 se integró por squash en `main` `156a50d`;
las referencias posteriores a «draft/sin merge» describen la fase y no el estado vigente.
Los AC-03/24/27/30/33/34 conservan su cobertura parcial.

**Enmienda D7 (propuesta 2026-11-01).** Se propone una extensión mínima de integración con
E4.2: rectificar a la baja o anular una Compra con Ventas vigentes no puede dejar la
cantidad del par `saldo_inversion + instrumento` negativa en ninguna fecha. Añade AC-55 y
**no modifica** las decisiones ni los AC aprobados de rev10; requiere aprobación expresa
del usuario antes de DEV22 y no autoriza desarrollo por sí misma.
Approval source/date: rev8 fue aprobada por el usuario el 2026-10-26 sobre el commit
`f439010d527ba65953a1ccc0aa47cbeb51cfce31`, manteniendo las decisiones funcionales de rev7.
Rev9 (2026-10-27) quedó superada por la ocupación de la 16; rev10 fue aprobada por el usuario
el 2026-10-27 y sus manifiestos C16/C17 quedaron congelados ese mismo día.
Context and brainstorming: [19-instrumentos-compras-inversion-brainstorming.md](19-instrumentos-compras-inversion-brainstorming.md),
[roadmap E4.1](roadmap.md), [referencia R5](functional-reference-v5.11.md).
Base: `e408b1da5ae9f45c9bfd139d11f362216b5bce26`, rama
`codex/pilot-full-e41-instrumentos-compras-inversion`, 2026-10-26.
Historial: rev1 candidato sometido a revisión independiente; rev2 aplica H1/H2/H3
(integración con consumidores, guard de impacto, auditoría dedicada, rectificación completa,
límites de magnitud, wireframes W7–W10 y correcciones menores), usuario 2026-10-26; rev3
aplica N1–N12 de la revisión final (oráculo único de Liquidez con nota de cobertura,
previsualización de todos los Movimientos, versión de esquema, coherencia de wireframes,
exactitud interna, secuencia `I1001`, trazabilidad textual y pruebas de no-escritura),
2026-10-26; rev4 aplica los residuales R3-1–R3-3 de la verificación final (precondiciones
ejecutables de AC-41, alcance amplio de `financeRevision` probado en AC-53 y compuerta
`database-identity.ts` en §5.2/AC-33), 2026-10-26; rev5 aplica el delta técnico R6 solicitado
antes de la aprobación (reserva de esquema **15** con migración aditiva y compuertas `1..15`,
semántica unívoca de errores —422 `INSUFFICIENT_CASH`, 409 `REVISION_CONFLICT`, 409
`IMPACT_CHANGED`— y precondición ejecutable R4-1 de AC-41), 2026-10-26; rev6 corrige los
hallazgos de la revisión independiente del delta (restore en directorio nuevo sin mezclar
versiones, vaciado de intentos, rutas `metrics.liquidez`, alcance de `IMPACT_CHANGED`,
precondición AC-41 sin Movimientos y errata de AC-52), 2026-10-26; rev7 delimita el contrato
de esquema v14 (lista cerrada de contratos admitidos, manifiesto canónico obligatorio antes de
DEV, rechazo de variantes desconocidas o incompletas antes de mutar y revalidación obligatoria
de la versión destino), 2026-10-26; **aprobada rev7 por el usuario el 2026-10-26 sobre el commit
`47f469a902330ac199c910225563f909bd5116eb`**, incluidos wireframes y testplan; rev8 es el
ajuste técnico documental a la versión **16** para respetar la reserva 15 de Compartidos
(contrato real `C15-COMPARTIDOS-AD2EDFE`, rutas 13/14/15→16 y preservación de datos),
2026-10-26, **aprobada rev8 por el usuario el 2026-10-26 sobre el commit
`f439010d527ba65953a1ccc0aa47cbeb51cfce31`**, manteniendo las decisiones funcionales de rev7;
rev9 (2026-10-27) propuso la progresión canónica 13/14→16 con main v15 y quedó superada al
ocupar `main` la 16; rev10 (2026-10-27) fija destino **18**; primero documentó C16 y, tras integrarse D5/PR90
en `main` `cf6954a`, reconcilia el contrato v17 `C17-D5-CF6954A` (145 objetos, SHA-256
`e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`, congelado), preserva
datos e identidad de main 16/17 y repite el gate; **aprobada por el usuario el 2026-10-27**
e **implementada en DEV19** sobre la 18; sin merge ni despliegue.
Solo documentación y ejemplos ficticios; rev10 no autoriza por sí misma desarrollo, SQL,
migraciones, pruebas ejecutables, datos reales ni despliegue.

### Registro de congelación C16/C17 (2026-10-27)

Autorización: el usuario autorizó el 2026-10-27 la congelación reproducible de C16/C17 y la
asunción temporal de los archivos de integración, tras acreditar aislamiento, ausencia de
escritores y ownership compatible. Esta fase **no** autoriza DEV19 ni implementa la 18.

Artefacto: `apps/api/src/schema-contracts.json`, SHA-256
`f9a30cdcf0d3037f2801c88edbc13d4057f23be9eaa83d8fa8a7f928562eac6c` (212 958 bytes, 5
contratos). Solo adiciones respecto al artefacto previo (+1696/−0); las entradas C14/C14V/C15
no cambian y `admitted` sigue limitado a 14/15.

| Contrato | v | Objetos | SHA-256 | Fuente |
|---|---:|---:|---|---|
| `C16-REVISION-COMIDA-26B6F0C` | 16 | 135 | `9d9b0783c519d32d667ae2a3911310b3667bfc4783089db4e6eea9171a9d2dc4` | `26b6f0c8838e1d4dfe2a7bb38949f4fa240b7d5f` |
| `C17-D5-CF6954A` | 17 | 145 | `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50` | `cf6954a87c3e916f422b989df0faf0bc926c46b6` |

Reproducción (desde la raíz del worktree E4.1, en directorios aislados y sin abrir worktrees
ajenos):

```bash
git archive <commit> apps/api/src | tar -x -C <temp>
bun run specs/fixtures/e4.1/generate-schema-contract.ts <ID> <commit> \
  <temp>/apps/api/src/database-schema.ts <temp>.db <temp>.json
```

La regeneración produjo 135/145 objetos y los hashes indicados; los objetos coinciden
exactamente con el artefacto y con la evidencia previa del gate. El artefacto se valida con
`contracts()` del propio código y los cinco SHA-256 se recalculan con la serialización
canónica de §5.2. Evidencia independiente: revisión read-only PASS (9/9 comprobaciones).

Límites de esta fase histórica: la congelación no modificó `schema-contract.ts` ni
`database-identity.ts`; DEV19 se autorizó después y adaptó el código a la 18 (ver registro
siguiente).

### Registro DEV19 — adaptación a la versión 18 (2026-10-27)

Autorización: el usuario autorizó DEV19 el 2026-10-27. Alcance: reconciliar `origin/main`
`9977210` en la rama, adaptar E4.1 a `schemaVersion = 18`, admisión C16/C17, cadena 16→17→18
y backup/restore 13..18. Sin merge ni despliegue.

- Merge de reconciliación `8e9ce67` y `f57e6da` (`origin/main` `2364d9c`); candidato final `dd450de`.
- `database-identity.ts` y `database-schema.ts` admiten `1..17` y declaran 18; la cadena
  ejecuta `revisionComidaSchema` (16), `compartidoAportacionSchema` (17) e `investmentSchema`
  (18) tanto en base existente como nueva.
- `schema-contract.ts` admite C16/C17 y rechaza >18; `schema-contracts.json` permanece
  intacto (C16/C17 sin cambios).
- `backup.ts` acepta 1..18, etiqueta `e3.4-v16`/`e3.2-d5-v17`/`e4.1-v18` y vacía intentos
  E4.1 solo en copias 18.
- Se preservan D5 (`movimiento_compartido`, CHECK de Transferencia), E3.4 Revisión de Comida,
  Compartidos v15 y Vehículos; la prueba 17→18 con una fila D5 real está versionada.
- Evidencia: typecheck PASS; suite focal 58/58 PASS; suite API macOS 244 PASS y 50 fallos de
  plataforma (`libc.so.6`, rutas), sin regresión frente al baseline; CI Linux x86_64
  `40583217493` SUCCESS (perfil full, 13 E2E) sobre `dd450de`; QA independiente PASS
  (48 AC PASS, 6 PARCIAL, 0 FAIL).
- PR #95 en draft; sin merge ni despliegue. Los AC-03/24/27/30/33/34 conservan sus residuales
  de cobertura declarados en el testplan.

## 1. Contexto y alcance

E4.1 es la primera entrega de la Épica 4. Permite mantener un catálogo mínimo de
Instrumentos de inversión y registrar Compras conservando la ejecución económica real:
qué se compró, cuándo, en qué Saldos, a qué precio y divisa, con qué cambio histórico y
qué importe EUR se cargó realmente. No crea Movimientos, no ejecuta Presupuesto y no
calcula valoración ni rentabilidad.

**In:** maestro de Instrumentos con identidad `Ixxx`; ISIN opcional con evidencia;
renombrado y desactivación; Compra en EUR y en divisa; Saldo de efectivo y Saldo de
inversión explícitos; cantidad, precio, divisa, cambio histórico, EUR cargado y comisión;
efectivo del bróker calculado; cantidad por posición `Saldo inversión + Instrumento`;
rectificación y anulación con impacto; listado, ficha y alta; pestaña Compras; API protegida;
motor único de efectivo y consumidores (Saldos, Liquidez y previsualización de Gasto,
Ingreso, Transferencia y Amortización); estados vacío/carga/error; wireframes 390/1440 W1–W10;
validación y criterios de aceptación.

**Out:** Ventas (E4.2); integración de las fechas de inversión en la referencia temporal
compartida (E4.2-AC3); valoración, resultado, rentabilidad y cotizaciones (E4.3); tipos
nuevos de Movimiento; Gasto/Compra dentro de Movimientos; maestros de bróker, mercado o
tipo de activo no confirmados; dividendos, splits, fiscalidad, importación, histórico,
cierre y fotos (E4.5/E4.8–E4.11); datos reales.

## 2. Decisiones confirmadas por las fuentes

| # | Contrato confirmado | Fuente | Efecto en E4.1 |
| --- | --- | --- | --- |
| C1 | Compras/Ventas solo en el registro de inversión; nunca Gasto/Compra en Movimientos; sin tipos nuevos | R2, R5, E4.1-AC1 | No se crea ni modifica ningún Movimiento. |
| C2 | Aportar efectivo al bróker es una Transferencia | R5 | Financiación y Compra son hechos independientes. |
| C3 | Cada operación conserva Saldos efectivo/inversión, instrumento, cantidad, precio en divisa, cambio histórico cuando no EUR, EUR realmente cargado/cobrado y comisiones | R5, E4.1-AC3 | Son campos del hecho; no se derivan de una tabla actual. |
| C4 | El cambio actual valora; no recalcula hechos | R5 | Un cambio posterior no altera la Compra, el efectivo ni la cantidad. |
| C5 | Posición = Saldo de inversión + Instrumento; cantidad = Compras − Ventas | R5 | Clave derivada; sin acumulado editable. |
| C6 | Un mismo Instrumento puede estar en varios Saldos de inversión | R5 (clave Saldo+Instrumento), prueba E4.2 | Varias posiciones independientes por Instrumento. |
| C7 | Efectivo del bróker (`Efectivo`/`Inversiones`) y posición (`Inversión`/`Inversiones`) son distintos | R5, F1, E4.1-AC2 | El efectivo no se suma como posición ni al revés. |
| C8 | ISIN solo con evidencia; Ixxx e IDs de operaciones únicos y no reutilizables | R1, R5 | Identidad por ID; sin ISIN inventado. |
| C9 | EUR base; importes EUR en céntimos exactos; JSON decimal; fechas civiles; UTC solo auditoría | E1.1 DT2 | Sin float ni `number` para dinero; sin desplazamiento por huso. |
| C10 | E4.1 no incluye Ventas, valoración ni resultado | Roadmap E4.1–E4.3 | La posición muestra cantidad y hechos, nunca valor actual ni rentabilidad. |
| C11 | Solo `Efectivo`/`Inversiones`: apertura + entradas − salidas − Compras + Ventas; sin filtro por Fecha apertura | R2, F3, E1.1 | Fórmula reutilizada; `Efectivo`/`Movimientos` no incorpora Compras; en E4.1 no existen Ventas registrables. |
| C12 | Acceso MFA, sesión, CSRF, Origin, errores y límites se heredan de E1 | T-SEG, guías | Sin autenticación ni permisos paralelos. |
| C13 | Tema claro, shell, tokens y componentes existentes; 390/1440 | Guía UI | Sin modo oscuro ni librería UI nueva. |
| C14 | Sin datos reales, importación ni despliegue; fixtures deterministas | T-SEG, P7 | Ejemplos ficticios, sin Excel ni credenciales. |
| C15 | E4.1 no modifica el máximo de la referencia temporal; la integración es E4.2-AC3 | R3, roadmap E4.2 | Ninguna Compra entra en el máximo de fechas en esta entrega. |
| C16 | La posición solo refleja Compras registradas; el histórico anterior no se importa | Alcance E4.1, P7 | La UI declara cobertura histórica parcial y no la presenta como posición completa. |

## 3. Decisiones confirmadas (ronda 1, 2026-10-26)

Respuestas del usuario registradas en el [brainstorming](19-instrumentos-compras-inversion-brainstorming.md#ronda-1--respuestas-confirmadas-2026-10-26).
La especificación quedó aprobada (rev7/rev8) y ratificada por rev10; ver cabecera.

| ID | Decisión confirmada | Afecta a | AC |
| --- | --- | --- | --- |
| Q1 | Maestro mínimo: `Ixxx`, nombre obligatorio, ISIN opcional con evidencia obligatoria cuando exista, divisa de referencia opcional y estado; sin tipo de activo, mercado, ticker, país ni adjuntos; auditoría. La validación sintáctica del ISIN no certifica validez registral. | §4.1, §5, §7, §9, §11 | AC-01, AC-02 |
| Q2 | ISIN único cuando está informado, comparado normalizado (sin distinguir mayúsculas ni espacios de borde); sin validación del dígito de control; el nombre no es único. | §5, §7, §11 | AC-03, AC-04 |
| Q3 | Renombrar conserva `Ixxx`; editar ISIN/divisa se audita; desactivar impide nuevas Compras y conserva historial; reactivar vuelve a permitir Compras; sin borrado físico; los cambios del maestro no reescriben divisas ni factores históricos. | §4.1, §11 | AC-05, AC-06, AC-07, AC-36 |
| Q4 | Selección explícita por Compra de un Saldo `Efectivo`/`Inversiones` y uno `Inversión`/`Inversiones`, activos y distintos; sin emparejamiento recordado; un Instrumento puede tener posiciones en varios Saldos. E1.1 no se altera. | §4.2, §4.3.1, §5 | AC-08, AC-17 |
| Q5 | Fecha civil no futura; cantidad y precio positivos; divisa ISO 4217; cambio histórico solo si no es EUR; el EUR realmente cargado es la fuente de verdad; comisión opcional en EUR ya incluida, nunca se vuelve a sumar ni restar; sin Partida, Referencia, Ciclo ni Deuda. | §4.2, §5, §7, §11 | AC-09, AC-10, AC-12, AC-15 |
| Q6 | Importe EUR introducido por el usuario; diferencia con `cantidad×precio×cambio` informativa; escalas cantidad 8 / precio 6 / cambio 6 validadas en API y persistencia; exceso rechazado sin redondeo silencioso. | §6, §11 | AC-13, AC-14 |
| Q7 | Bloquear Compras que dejen negativo el efectivo disponible a la fecha; en retroactivas comprobar también los saldos posteriores afectados; sin alterar aperturas; no es una regla global de Saldos. | §4.3.2, §11 | AC-16, AC-35 |
| Q8 | Rectificaciones auditadas con impacto, motivo y revisión; cambiar Instrumento o Saldos exige anular y crear otra; originales conservados; anuladas excluidas de posición y efectivo. | §4.5, §7 | AC-25, AC-26, AC-32 |
| Q9 | E4.1 no modifica el máximo de la referencia temporal; la integración pertenece a E4.2-AC3. Dependencia explícita, sin promesa de integración en E4.1. | §4.6, §14 | AC-24 |
| Q10 | Módulo **Inversiones** con pestañas Instrumentos y Compras; posiciones derivadas por Saldo; historial; efectivo de solo lectura enlazado a Saldos; cobertura histórica parcial declarada; nunca presentada como posición completa. | §9, §10 | AC-22, AC-30, AC-37 |

### 3.1 Correcciones de revisión incorporadas (2026-10-26)

Tabla de trazabilidad del delta revisado. No introduce decisiones nuevas: fija cómo se
aplican en el contrato las decisiones ya confirmadas y las observaciones de la revisión
independiente.

| ID | Corrección aplicada | Dónde | AC |
| --- | --- | --- | --- |
| H1-1 | El efectivo del bróker se calcula con un motor único; `GET /api/saldos/{id}` y el endpoint del módulo devuelven la misma cifra; la previsualización de Transferencias calcula ambos extremos cuando interviene un `Efectivo`/`Inversiones`; `flujo-mensual` respeta el flag `liquidez` existente (`S003` pasa a incluirse) y E4.1 no reescribe R6. | §4.3.3, §7, §8 | AC-38, AC-39, AC-41 |
| H1-2 | Un Saldo con Compras no puede cambiar `tipo`, `control`, `saldoApertura`, `fechaApertura` ni `permiteSalidaExterior` (409 `HISTORY_LOCKED` sin escritura); desactivar/reactivar sí se permite y conserva Compras. Extensión de integración de E1.1 AC-14. | §4.1, §5, §8 | AC-42 |
| H1-3 | Auditoría dedicada `instrumento_audit` y `operacion_inversion_audit` con `anterior`/`posterior` JSON, revisión, actor, UTC, motivo y triggers append-only; `audit` existente no se altera; consulta de auditoría de Instrumento y de Compra. | §5, §7, §8 | AC-43 |
| H2-1 | Rama explícita por `(tipo, control)`: `Efectivo`/`Inversiones` → efectivo; `Inversión`/`Inversiones` → sigue «No disponible hasta E4.3» (`S004`). | §4.3.1, §4.3.3 | AC-40 |
| H2-2 | Rectificación con reemplazo completo del payload: campos omitidos se rechazan; `null` solo limpia nullable. | §4.5, §7, §11 | AC-45 |
| H2-3 | «Fecha no futura» = día civil `Europe/Madrid` con `spanishToday`; el reloj no es fecha económica. | §4.2, §11 | AC-44 |
| H2-4 | Un Saldo inactivo con Compras sigue computando en efectivo/posición y es consultable; solo se bloquea nueva selección; reactivar la recupera. | §4.1, §4.3.3, §11 | AC-49 |
| H2-5 | Varios Saldos `Efectivo`/`Inversiones` se listan por separado con su cifra; sin agregado; la Compra exige selección explícita. | §4.2, §9 | AC-48 |
| H2-6 | Rectificación retroactiva que deja negativo un saldo posterior: 422 con fecha e importe del mínimo; intento de cambiar Instrumento/Saldos: 422; anular+crear con distinta identidad: original fuera de posición/efectivo. | §4.5, §13 | AC-46, AC-47 |
| H2-7 | Wireframes W7/W8 (pestaña Compras 1440/390) y W9/W10 (impacto, rectificación y anulación 1440/390). | §9 | AC-30, AC-37 |
| H2-8 | Aplazamiento de DT7 (mapping/importación) a E4.5/E4.12 registrado como desviación explícita. | §5.2, §12, §14 | Sin AC propio: se verifica por el alcance declarado y por AC-29, que no admite rutas de importación. |
| H2-9 | Límites de magnitud de cantidad, precio y cambio por rango del entero escalado, con rechazo por encima. | §6, §11 | AC-50 |
| H3-1 | Comisión ≥ 0 y ≤ importe EUR; ISIN ASCII `[A-Z0-9]{12}` normalizado; `cambio` explícito para EUR igual a 1 o rechazo; longitudes de nombre/evidencia; `divisaReferencia` ISO 4217. | §4.2, §5, §11 | AC-01, AC-02, AC-09, AC-14 |
| H3-2 | AC-20 determinista (409 `REVISION_CONFLICT` separado del rechazo por suficiencia 422 `INSUFFICIENT_CASH`); código esperado de DELETE; AC-24 sin condicionales; AC-34 con causa concreta; AC de «impacto/GET no escribe». | §7, §13 | AC-20, AC-24, AC-34, AC-41 |
| H3-3 | Filtro de W1 coherente con la fila Inactiva. | §9 | AC-30 |
| H3-4 | `revision` y `motivo` en desactivar/reactivar/anular; 409 `REVISION_CONFLICT` en revisión obsoleta; consulta de auditoría del Instrumento. | §7, §8 | AC-07, AC-26, AC-43 |
| H3-5 | Nombres reales de fixture (`S003` «Efectivo de inversión demo», `S004` «Cartera de inversión demo»); sin afirmar preservación de `Ixxx` inexistentes; `S006` se crea por el servicio. | §4.3.1, §5.2, §9 | AC-08, AC-33 |
| H3-6 | La exclusión de backup se reformula: sin mecanismo nuevo, pero el backup/restore existente versiona y restaura las tablas nuevas. | §5.2, §8, §12 | AC-33 |
| H3-7 | Convención de agregación a fin de día declarada como convención técnica DT2 y probada con hechos del mismo día. | §4.3.2, §6 | AC-35, AC-46 |
| H3-8 | `Efectivo`/`Movimientos` (`S001`) no cambia por una Compra; normalización de búsqueda por ISIN; el filtro Saldo del listado se define sobre ambas columnas. | §7, §11 | AC-21, AC-23 |
| N2 | Liquidez mantiene `Verificado` cuando todas las posiciones elegibles son calculables y añade una nota explícita de cobertura histórica no importada; no se cambia R6 ni se convierte la nota en `Parcial`. Oráculo único: estado `Verificado`, valor S001+S003, `subtotal` `null`. | §4.3.3 | AC-39 |
| N3 | La previsualización `antes/despues` cubre todo Movimiento que toque `Efectivo`/`Inversiones` (Gasto, Ingreso, Transferencia, Amortización) y `financeRevision` incluye `operaciones_inversion`; una Compra entre la vista previa y la confirmación invalida el contexto. La invalidación es global y amplia (cualquier Compra afecta a todos los Movimientos); es una sobre-invalidación segura que puede devolver 409 `IMPACT_CHANGED` en una vista previa ajena. | §4.3.3, §8, §10 | AC-41, AC-53 |
| N9 | Exclusión registrada: el cambio de Estado de un Saldo conserva el cuerpo E1.1 (`revision` únicamente), sin `motivo` humano; E4.1 no amplía ese contrato y una extensión de E1.1 se tramitaría aparte. | §4.1, §12 | AC-42 (sin cambio) |
| R6-1 | Colisión de versión de esquema resuelta como contrato: E4.1 usa la **16** (14 de Vehículos/main y 15 de Compartidos quedan reservadas); migración aditiva sin `DROP`/`ALTER` destructivo de tablas ajenas; compuertas `database-identity.ts` 16, `database-schema.ts` `[1..15, version]`, `backup.ts` `1..16` y etiqueta `e4.1-v16`; rutas 13→16, 14→16 y 15→16 solo con contrato verificado; restore en directorio nuevo, sin mezclar versiones, que vacía intentos y sesiones. | §4.1, §5.2, §8, §13 | AC-33 |
| R6-2 | Semántica de errores unívoca: suficiencia (también la recalculada) → 422 `INSUFFICIENT_CASH`; revisión obsoleta → 409 `REVISION_CONFLICT`; huella/contexto de **Movimiento** obsoleto → 409 `IMPACT_CHANGED`; guard de Saldo → 409 `HISTORY_LOCKED`. Sin 409 genérico por «cambio concurrente»; 409 nunca señala suficiencia; las rutas de Compra no transportan huella. | §4.3.2, §4.5, §7, §8, §10, §11, §13 | AC-16, AC-20, AC-25, AC-26, AC-35, AC-42, AC-46, AC-53 |
| R6-3 (resuelve R4-1) | AC-41 ejecutable sin ambigüedad: precondición única desde `S003` sin Movimientos ni Compras, con `permiteSalidaExterior=true` fijado antes de cualquier Compra; se elimina la alternativa del Saldo dedicado y el resultado se enuncia sobre «el extremo del Saldo de prueba utilizado». | §13 | AC-41 |
| R7-1 | Contrato de esquema v14 delimitado: no se acepta una base por su número. Solo se admiten `C14-COMPARTIDOS-FCE1107` y `C14-VEHICULOS-C69E343`, comparando el manifiesto canónico exacto de `sqlite_master` y sus invariantes antes de `BEGIN IMMEDIATE`; el manifiesto y su SHA-256 se congelan antes de DEV. Una variante desconocida, incompleta, con tablas sintéticas o con contratos mezclados se rechaza sin mutar; el soporte de cualquier otro contrato v14 queda bloqueado hasta una revisión autorizada. | §5.2, §8, §13 | AC-33 |
| R7-2 | Revalidación de destino antes de DEV: la reserva 16 es provisional y no prevalece sobre `main`. Si `main` ya está en 16 o más, si la 16 está ocupada o si `main` contiene un v14/v15 no verificado, se detiene la implementación, se renumera en esta spec y se repite la revisión. Un `main` avanzado gana siempre. | §5.2, §13 | AC-33 |
| R8-1 | Ajuste técnico a la **16**: se respeta la reserva 15 de Compartidos y se añade su contrato real v15 `C15-COMPARTIDOS-AD2EDFE` (`ad2edfe`, 122 objetos) al manifiesto congelado. Se definen las rutas 13→16, 14→16 y 15→16, con preservación explícita de las tablas y filas de Compartidos v15 y Vehículos. No cambia ninguna decisión funcional de rev7. | §5.2, §8, §13 | AC-33 |
| R8-2 | Compuertas y backup/restore ajustados a 16: `schemaVersion = 16`, `[1..15, version]`, `1..16`, etiqueta `e4.1-v16`, verificación de manifiestos v14/v15 antes de publicar una copia y rechazo de v17. El gate pre-DEV debe repetirse sobre refs locales/remotos antes de DEV. | §5.2, §8, §13 | AC-33 |
| R10-1 | Destino **18** aprobado: `main` `9977210` (esquema 17, D5/PR90) declara 17; `C16/C17` están congelados en `apps/api/src/schema-contracts.json`; `C17-D5-CF6954A` tiene 145 objetos y SHA-256 `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`; cesión de D5 autorizada temporalmente el 2026-10-27; rutas 13/14/15/16/17→18, tablas heredadas vacías si faltaban y preservación D5. | §5.2, §8, §13 | AC-33 |
| R10-2 | Compuertas y backup/restore a 18: `schemaVersion = 18`, `[1..17, version]`, `1..18`, etiqueta `e4.1-v18`, verificación del manifiesto de la versión de la copia (C14V/C15/C16/C17; 13 solo integridad) y rechazo de v19; el gate debe repetirse antes de adaptar código. | §5.2, §8, §13 | AC-33 |

Nota de vigencia: las filas R6-1, R7-1, R7-2, R8-1 y R8-2 se conservan como historia del proceso; el
contrato vigente es el de R10 (versión 18; 17 D5, 16 Revisión de Comida, 15 Compartidos, 14 Vehículos/main).

## 4. Funcionalidad

### 4.1 Instrumentos

- Identidad `Ixxx`, estable e inmutable; el nombre es editable y no es clave. La tabla de
  Instrumentos se crea en la versión de esquema 18: la secuencia parte de `I1001` y no
  reutiliza IDs. Si la migración encontrara filas, continúa desde el mayor `Ixxx` real; E4.1
  no afirma la existencia de Instrumentos previos.
- Campos: nombre obligatorio (1–120 caracteres, sin caracteres de control, valor literal
  conservado); ISIN opcional; evidencia del ISIN obligatoria cuando exista (1–200
  caracteres); divisa de referencia opcional ISO 4217 usada solo para
  preselección/visualización, sin obligar la divisa de cada Compra; estado
  Activa/Inactiva. Sin tipo de activo, mercado, ticker, país ni adjuntos.
- Alta, consulta por ID, listado con búsqueda por nombre/ISIN y filtro por Estado. Sin
  borrado físico; la baja funcional es la desactivación.
- Renombrar conserva ID, Compras y posiciones. Editar nombre, ISIN o divisa de referencia
  se audita con `revision` y `motivo` obligatorio; el ISIN revalida evidencia y unicidad
  normalizada.
- Un Instrumento inactivo no se ofrece para nuevas Compras; sus posiciones e historial
  siguen consultables. Reactivar vuelve a permitir Compras.
- Desactivar y reactivar exigen `revision` vigente y `motivo` no vacío; una revisión
  obsoleta devuelve 409 `REVISION_CONFLICT` sin escritura. Ambas acciones conservan Compras,
  posiciones y auditoría.
- El Instrumento no almacena cantidad, valor, precio actual ni resultado: todo eso es
  derivado o pertenece a E4.3.
- Los cambios del maestro (nombre, ISIN, divisa de referencia, estado) no reescriben la
  divisa, el cambio, el precio, el importe EUR ni la comisión de Compras existentes.
- Un Saldo con Compras queda protegido por impacto: no se puede cambiar su `tipo`,
  `control`, `saldoApertura`, `fechaApertura` ni `permiteSalidaExterior`; la petición
  devuelve 409 `HISTORY_LOCKED` sin escritura (§8). Es una extensión de integración de E1.1
  AC-14, que exigía no fingir protección de fuentes aún no entregadas; ahora la fuente de
  inversión existe. Desactivar y reactivar el Saldo sí se permite y conserva sus Compras. La
  ruta de estado del Saldo conserva el cuerpo aprobado de E1.1 (`revision` únicamente); E4.1
  no le añade `motivo` y la auditoría del cambio de Estado sigue en la tabla `audit` existente
  (exclusión N9, §12).

### 4.2 Compra

- Una Compra es un hecho del registro de inversión, con ID propio, no un Movimiento.
- Datos: fecha civil; Instrumento; Saldo de efectivo; Saldo de inversión; cantidad; precio
  unitario en divisa; divisa ISO 4217; cambio histórico si la divisa no es EUR; importe EUR
  realmente cargado; comisión opcional en EUR ya incluida; concepto/nota opcionales (hasta
  2000 caracteres, sin caracteres de control). Sin Partida, Referencia ni atribución propia
  de Ciclo o Deuda; la fecha queda disponible para cruces futuros.
- EUR: no se exige cambio informado; a efectos de cálculo se trata como 1. Si un payload EUR
  informa `cambio`, el único valor admitido es exactamente `1` (`"1.000000"`); cualquier
  otro valor se rechaza con 422 y no se normaliza. Divisa distinta de EUR: cambio histórico
  obligatorio y positivo.
- Cantidad y precio son estrictamente positivos. Escalas: cantidad hasta 8 decimales, precio
  hasta 6 y cambio hasta 6; una precisión mayor se rechaza en API y en persistencia, sin
  redondeo ni truncamiento silencioso. Los límites de magnitud del entero escalado están en
  §6 y se rechazan por encima del máximo, no por redondeo.
- El importe EUR cargado es el importe observado del cargo y la única base del efecto en
  efectivo. La comisión es un desglose informativo ya incluido: no se suma ni se resta otra
  vez, es no negativa, con dos decimales, y nunca puede exceder el importe EUR cargado.
  `cantidad × precio × cambio` se muestra solo como referencia y su diferencia con el
  importe cargado es informativa, nunca un error ni una corrección automática.
- Un cambio posterior del mercado no modifica la Compra ni el efectivo (C4). No existe
  todavía valoración de la posición.
- La selección de Saldos es explícita por Compra: efectivo `Efectivo`/`Inversiones` e
  inversión `Inversión`/`Inversiones`, activos, existentes y distintos entre sí. No se
  recuerda la pareja por Instrumento y no hay preselección automática, aunque exista un solo
  Saldo elegible. Si existen varios Saldos de efectivo de inversión, cada uno se ofrece con
  su propia cifra; no se ofrece un agregado (§4.3.3, AC-48).

### 4.3 Efectivo del bróker

El efectivo de un Saldo `Efectivo`/`Inversiones` se calcula, no se almacena:

```text
efectivo(t) = apertura + entradas(≤t) − salidas(≤t) − compras(≤t) + ventas(≤t)
```

- Se reutiliza el motor de posición existente para apertura, entradas y salidas; las
  Compras vigentes restan y las Ventas sumarán en E4.2.
- Una apertura ausente contribuye cero solo en el cálculo, sin convertirse en cero
  persistido.
- En E4.1 no existe registro de Ventas ni escritura de Venta; el término Ventas es un cero
  estructural (no un cero de una fuente instalada que falle) y la UI declara «Ventas: no
  disponibles hasta E4.2».
- El efectivo del bróker es distinto de la posición de inversión y no se agrega con ella.
- El detalle mensual histórico y su comprobación de Fecha apertura quedan fuera de E4.1;
  no se altera el contrato F3.
- Solo `Efectivo`/`Inversiones` incorpora Compras. `Efectivo`/`Movimientos` sigue siendo
  caja/banco normal y no las incorpora: una Compra no altera su posición.
- Varios Saldos `Efectivo`/`Inversiones` son independientes: cada uno tiene su propio
  efectivo y se muestran/listan por separado; E4.1 no suma un «efectivo total del bróker».

#### 4.3.1 Contrato E1.1 verificado (2026-10-26)

El par de Saldos que usa una Compra ya está definido por E1.1 y no se reabre:

| Tipo/Control | Contrato E1.1 | E4.1 |
| --- | --- | --- |
| `Efectivo`/`Inversiones` | Apertura + entradas − salidas de Movimientos − Compras + Ventas; posición no disponible hasta E4.1/E4.2, sin falso cero | Implementa el motor pendiente y añade Compras a la fórmula; sin filtro por Fecha apertura (F3) |
| `Inversión`/`Inversiones` | Valoración agregada de posiciones de inversión; no disponible hasta E4.3 | Solo cantidad derivada por Saldo+Instrumento; sigue «No disponible hasta E4.3», sin falso cero y sin valoración |
| `Efectivo`/`Movimientos` | Apertura + entradas − salidas; caja/banco normal | No incorpora Compras y no es elegible como Saldo de efectivo de una Compra |

Evidencia verificada por el coordinador:

- Tabla de motores de E1.1: `Inversiones + Efectivo` = apertura + entradas − salidas −
  Compras + Ventas; `Inversiones + Inversión` = valoración agregada.
- F1: seis pares utilizados, entre ellos `Efectivo`/`Inversiones` e
  `Inversión`/`Inversiones`. F3: apertura es posición inicial; el Saldo actual de
  Movimientos no filtra por Fecha apertura; `Inversiones`/`Efectivo` añade Compras/Ventas.
- `apps/api/src/saldos.ts`: `pairs` admite `Efectivo`→`Inversiones` e
  `Inversión`→`Inversiones`; `position()` devuelve `pendiente_motor` con «Motor Inversiones
  pendiente de entrega» para todo Control `Inversiones`, sin distinguir todavía Tipo.
- Fixture demo: `S003` «Efectivo de inversión demo» (`Efectivo`/`Inversiones`) y `S004`
  «Cartera de inversión demo» (`Inversión`/`Inversiones`). `S003` tiene `liquidez=1` en el
  fixture mensual; `S004` no participa en Liquidez.

Consecuencia: E4.1 no altera E1.1 ni sus aperturas, no cambia el significado de
`Efectivo`/`Movimientos` y no convierte la validación de suficiencia en una regla global de
Saldos. La nota del usuario sobre v5.10/Control Movimientos es histórica y no cambia el
contrato v5.11/E1.1.

#### 4.3.2 Suficiencia de efectivo (Q7)

Definición determinista, con los hechos vigentes y Ventas = 0 en E4.1:

```text
saldo_E(t) = apertura + entradas(≤t) − salidas(≤t) − Σ compras vigentes de E con fecha ≤ t

candidato(t) = saldo_E(t) − importe de la Compra nueva o rectificada, si su fecha ≤ t
             = saldo_E(t), en otro caso
```

- Se evalúa `candidato(t)` en `t = f` (fecha de la Compra) y en cada fecha posterior a `f`
  con entradas, salidas o Compras vigentes del Saldo. Entre hechos el saldo es constante, de
  modo que esos puntos contienen el mínimo.
- **Convención técnica DT2 — agregación a fin de día.** Todos los hechos con la misma fecha
  civil se agregan al cierre de ese día; el mínimo se evalúa después de aplicar todos los
  hechos de la fecha. No existe orden intradía, ni hora económica, ni desempate por ID,
  instante de captura o tipo de hecho. Una Compra nueva y una salida del mismo día se
  consideran simultáneas a efectos de suficiencia: el resultado no depende del orden de
  captura. La convención se aplica igual al alta, a la rectificación, a la anulación y a la
  previsualización de impacto.
- Si el mínimo es negativo, el alta o la rectificación se rechaza con 422
  `INSUFFICIENT_CASH`, indicando `disponible` (saldo antes del hecho en la fecha del mínimo),
  `necesario` (importe del hecho aplicado en esa fecha), `minimo` (candidato negativo) y
  `fecha` del mínimo; no hay escritura, ni override, ni cambio de aperturas. El error
  identifica la fecha posterior cuando el mínimo no está en la fecha de la operación. El
  rechazo por suficiencia es siempre 422 `INSUFFICIENT_CASH`, también cuando la suficiencia se
  recalcula dentro de la transacción: nunca 409 y nunca un código genérico de validación.
- En una rectificación se retira el importe anterior y se aplica el nuevo desde la fecha
  resultante; se comprueba desde la menor de las fechas implicadas en adelante. La misma
  validación se aplica si la rectificación mueve la fecha hacia atrás.
- La comprobación usa el importe EUR cargado una sola vez; la comisión ya está incluida.
- No se filtra por Fecha apertura y no se impone un mínimo general a las aperturas ni a los
  Saldos fuera de esta validación.

Ejemplo ficticio (Saldo `S003`): apertura 1.000,00 el 2026-01-01; entrada 500,00 el
2026-02-01; salida 1.800,00 el 2026-03-01. Una Compra de 100,00 el 2026-02-10 deja 1.400,00
a esa fecha, pero 1.000,00 + 500,00 − 1.800,00 − 100,00 = −400,00 el 2026-03-01: se rechaza
(AC-35). Con salida 200,00 el mínimo posterior es 1.200,00 y la Compra se acepta.

Ejemplo ficticio de la convención de fin de día: apertura 1.000,00; el mismo 2026-02-10 una
entrada de 100,00 y una Compra de 1.050,00. Al cierre del día el efectivo es 50,00 y la
Compra se acepta; si la Compra fuese de 1.150,00 el cierre sería −50,00 y se rechazaría con
fecha 2026-02-10, aunque una lectura por orden de captura pudiera haberla admitido antes de
la entrada. El resultado no cambia si la Compra se registra antes que la entrada (AC-46).

### 4.3.3 Integración con consumidores (motor único)

E4.1 hace disponible una posición que hasta ahora estaba pendiente; no reescribe los
contratos de los consumidores ni la regla R6. Contrato explícito:

- **Motor único.** El efectivo de un Saldo `(Efectivo, Inversiones)` lo calcula una sola
  función de dominio, reutilizada por todos los consumidores. `GET /api/saldos/{id}`
  devuelve en `posicion.importe` exactamente la misma cifra que
  `GET /api/inversiones/efectivo?saldo={id}` sin `fecha`. La igualdad es de céntimos, no de
  presentación.
- **Rama por pareja `(tipo, control)`.** `Efectivo`/`Inversiones` → efectivo calculado.
  `Inversión`/`Inversiones` → sigue «No disponible hasta E4.3»: `posicion.importe` es
  `null`, `condicion` es `pendiente_motor` y el motivo declara la valoración pendiente.
  Nunca se devuelve 0 como sustituto. El endpoint de efectivo rechaza con 422 un Saldo que
  no sea `Efectivo`/`Inversiones` y no devuelve una cifra de efectivo para una posición.
  `Efectivo`/`Movimientos` conserva su motor actual y no incorpora Compras.
- **Previsualización de Movimientos.** La vista `antes/despues` de cualquier Movimiento que
  toque un Saldo `Efectivo`/`Inversiones` —Gasto, Ingreso, Transferencia y Amortización de
  deuda— calcula el extremo afectado con el motor de efectivo: parte de la posición actual y
  aplica el hecho propuesto (o retira el existente al rectificar/anular) sin escribirlo. En
  una Transferencia se calculan ambos extremos cuando alguno de los Saldos intervinientes es
  `Efectivo`/`Inversiones`. Para `Inversión`/`Inversiones` el extremo posterior sigue siendo
  «No disponible hasta E4.3» con su motivo; no se inventa una cifra. Un Saldo
  `Efectivo`/`Inversiones` deja de motivar «Posición no calculable por este motor», y la lista
  `pendientes` de la previsualización no puede seguir afirmando que el motor de efectivo de
  inversión falta: la valoración de inversión se declara pendiente de E4.3. Es un cambio de
  expectativa del contrato de `POST /api/movimientos/impacto`, no una regla nueva de
  Movimientos.
- **Contexto de la previsualización.** `financeRevision` incluye las filas de
  `operaciones_inversion`, de modo que una Compra registrada entre la vista previa y la
  confirmación invalida el contexto: la confirmación devuelve 409 `IMPACT_CHANGED` sin
  escritura y obliga a recalcular. La coherencia se aplica a alta, rectificación y anulación
  de Movimientos que tocan `Efectivo`/`Inversiones`; el borrador se conserva. La invalidación
  es **amplia por diseño**: `financeRevision` es una huella global del contexto financiero y
  no está acotada por Saldo, así que cualquier Compra, en cualquier Saldo o Instrumento,
  cambia la revisión de **todos** los Movimientos. Es una sobre-invalidación segura: puede
  devolver 409 `IMPACT_CHANGED` en una previsualización sin relación con la Compra, pero
  nunca acepta una confirmación con contexto obsoleto ni escribe con una huella vieja, y el
  usuario solo debe recalcular. Acotar la huella por Saldo es una optimización de rendimiento
  fuera del alcance de E4.1, no una condición de corrección; si se adoptara, necesitaría su
  propio criterio de aceptación. AC-53 prueba el caso ajeno y AC-38/AC-53 conservan la
  exigencia de igualdad y de no-escritura.
- **Liquidez (R6).** `flujo-mensual` sigue la regla vigente «Liquidez solo de saldos
  marcados» y el filtro de Estado Activa ya existente. E4.1 no cambia la regla ni escribe el
  flag: en el fixture mensual `S003` ya tiene `liquidez=1`, así que al existir su posición
  pasa a `incluidos` y deja de figurar en `excluidos`; con `liquidez=0` no se incluye; con
  `liquidez` sin informar sigue en `excluidos` con «Liquidez sin informar» y la métrica queda
  `Parcial`. Oráculo único con `S003` incluido y sin exclusiones:
  `metrics.liquidez.estado` es `Verificado` (no hay otro estado admitido para ese caso),
  `metrics.liquidez.subtotal` es `null` y `metrics.liquidez.valor` es la suma de las posiciones
  de `S001` y `S003`, cada una con su cifra; `liquidez.incluidos` y `liquidez.excluidos`
  siguen en el nivel superior del DTO.
  `Verificado` certifica el cálculo y la cobertura de las posiciones elegibles, no la
  cobertura histórica: `metrics.liquidez.motivo` incluye la nota literal «Cobertura histórica no
  importada: la posición de inversión solo incluye Compras registradas en la aplicación», la
  UI la muestra y la nota no cambia el estado a `Parcial`. La métrica actualiza su valor y su
  cobertura (posiciones elegibles) sin convertirse en un total patrimonial; el término Ventas
  sigue siendo cero estructural y la cobertura histórica no se acredita.
- **Sin invasión de otros consumidores.** Una Compra no altera la posición de
  `Efectivo`/`Movimientos` (`S001`), ni el número de Movimientos, ni Presupuesto, ni la
  referencia temporal. `E4.1` no modifica R6, no reescribe R5 y no adelanta valoración.
- **Varios Saldos de efectivo.** El módulo lista cada Saldo `Efectivo`/`Inversiones` con su
  cifra y sin agregado; la Compra exige selección explícita de uno. Con cero Saldos
  elegibles el alta se bloquea y explica el motivo; con uno, el selector sigue vacío y es
  obligatorio; con varios, se ofrecen todos con su cifra.
- **Saldo inactivo con Compras.** Sigue computando en el efectivo y en la posición del
  Instrumento, y sigue siendo consultable; solo deja de ser seleccionable para nuevas
  Compras. Reactivarlo lo devuelve a los selectores conservando sus Compras. El agregado de
  Liquidez mantiene su filtro de Estado Activa, que es una regla previa y no se reescribe.

### 4.4 Posición por Instrumento y Saldo de inversión

- Clave: `saldo_inversion + instrumento`. No se persiste una fila de posición editable.
- `cantidad = suma(Compras vigentes) − suma(Ventas vigentes)`. En E4.1 solo hay Compras, de
  modo que la cantidad es la suma de cantidades vigentes.
- La ficha muestra una fila por cada Saldo de inversión donde el Instrumento tenga Compras,
  con la cantidad y el número de compras vigentes. Un Instrumento puede aparecer en varios
  Saldos.
- No se muestra valor actual, coste agregado presentado como valor, resultado ni
  rentabilidad. Si la valoración no está disponible: «No disponible hasta E4.3», nunca 0.
- La cobertura es histórica parcial: solo incluye Compras registradas en la aplicación; el
  histórico anterior no se importa. La UI lo declara y no presenta el resultado como
  posición completa (AC-37).
- Anular una Compra la excluye del cálculo sin borrar el registro. Rectificar recalcula la
  cantidad desde los hechos vigentes.

### 4.5 Rectificación y anulación

- Rectificar fecha, cantidad, precio, divisa, cambio, importe EUR, comisión, concepto o nota
  exige vista de impacto (efectivo y cantidad antes/después), `motivo` y `revision` vigente;
  una `revision` obsoleta devuelve 409 `REVISION_CONFLICT` sin escritura; la escritura y la
  auditoría son atómicas.
- **Reemplazo completo del payload**, como en Movimientos: la petición contiene todos los
  campos rectificables (`fecha`, `cantidad`, `precio`, `divisa`, `cambio`, `importeEur`,
  `comisionEur`, `concepto`, `nota`). Un campo rectificable omitido devuelve 422 con el
  nombre del campo; no se conserva silenciosamente el valor anterior. `null` solo es válido
  en los campos nullable (`cambio` cuando la divisa es EUR, `comisionEur`, `concepto`,
  `nota`) y los limpia; `null` en `fecha`, `cantidad`, `precio`, `divisa` o `importeEur`
  devuelve 422. La UI envía el formulario completo aunque el usuario cambie un solo campo.
- Incluir `instrumento`, `saldoEfectivo`, `saldoInversion`, `clase`, `estado` o `id` en la
  rectificación devuelve 422 sin escritura: no son rectificables.
- Cambiar Instrumento o Saldos exige anular y crear otra Compra; no se reescribe la
  identidad económica de una operación existente. La nueva Compra se valida como alta
  completa, incluida la suficiencia de efectivo, y la original queda `Anulada`, fuera de
  efectivo y posición.
- Una rectificación que deje negativo cualquier saldo posterior se rechaza con 422
  `INSUFFICIENT_CASH` y la fecha/importe del mínimo (§4.3.2); no hay escritura parcial ni
  cambio de fecha parcial.
- **Enmienda D7 — cantidad no negativa con Ventas (propuesta 2026-11-01).** Cuando existan
  Ventas vigentes, rectificar a la baja o anular una Compra se somete a una comprobación de
  cantidad análoga a la de efectivo, alineada con
  [SPEC22 §4.1](22-ventas-posicion-broker-specification.md) (D7):

  ```text
  posicion_base(t) = Σ cantidad(Compras vigentes excluida la original, fecha ≤ t)
                   − Σ cantidad(Ventas vigentes, fecha ≤ t)
  candidato(t) = posicion_base(t) + cantidad_nueva, si t ≥ fecha_nueva
               = posicion_base(t), si la Compra se anula
  ```

  Se evalúa desde `min(fecha original, fecha resultante)` y en cada fecha posterior con una
  Compra o Venta vigente del mismo par `saldo_inversion + instrumento`. Los hechos de la
  misma fecha se agregan a fin de día (DT2) y las cantidades se calculan con enteros
  escalados a 8 decimales, sin `float`. Si el mínimo es negativo se rechaza con 422
  `INSUFFICIENT_UNITS`, con `disponible` (posición vigente antes del cambio en la fecha del
  mínimo), `necesario` (cantidad que el cambio retira en esa fecha), `minimo` (candidato
  negativo), `fecha`, `saldoInversion` e `instrumento`, sin escritura, sin auditoría de
  éxito y sin override. La comprobación de cantidad se ejecuta antes que la de efectivo; si
  ambas fallan, la respuesta es `INSUFFICIENT_UNITS`. En un runtime sin Ventas la
  comprobación no puede fallar y E4.1 conserva su comportamiento. Esta extensión no reabre
  D1–D7 de SPEC22 ni las decisiones de rev10.
- Anular conserva el registro, lo marca `Anulada`, lo excluye de efectivo y cantidad y no
  permite una segunda anulación. Exige `revision` vigente y `motivo` no vacío; revisión
  obsoleta devuelve 409 `REVISION_CONFLICT` sin escritura. Sin DELETE.
- Una Compra anulada no se rectifica. La auditoría conserva el antes/después y el motivo.
- La rectificación o anulación no crea Movimientos ni ejecuta Presupuesto.
- Rectificar divisa o cambio afecta solo a esa Compra; no toca el maestro ni otras
  operaciones.

### 4.6 Referencia temporal compartida

R3 define la referencia como el máximo de fechas de Movimientos, Revisión Comida y
operaciones de inversión, con cobertura explícita. **E4.1 no modifica ese máximo**: las
Compras no entran en la referencia temporal en esta entrega. La integración de las fechas
de inversión (y las Ventas) pertenece a **E4.2-AC3**, que se declara como dependencia
explícita. E4.1 no promete integración, no usa el reloj como sustituto y no inventa un
máximo; rectificar o anular no altera la referencia en esta entrega. Donde la UI muestre
cobertura temporal, la fuente Inversión se declara «pendiente hasta E4.2».

## 5. Modelo de datos y contratos

Modelo lógico documental; sin DDL ejecutable, migración ejecutada ni datos reales. La
versión 18 es un contrato documental que el desarrollo autorizado implementará.

| Objeto | Datos persistentes propuestos | Garantías y límites |
| --- | --- | --- |
| `instrumentos` | `id` TEXT PK `Ixxx`; `nombre`; `isin` NULL; `isin_evidencia` NULL; `divisa_referencia` NULL; `estado`; `revision`; `creado_en`/`actualizado_en` UTC | Identidad inmutable; sin DELETE; ISIN solo con evidencia; `divisa_referencia` solo presentación, no condiciona la divisa de la Compra; sin cantidad, valor ni precio actual |
| `operaciones_inversion` | `id` TEXT PK numérico; `clase` (`Compra` en E4.1); `fecha`; `instrumento` FK; `saldo_efectivo` FK; `saldo_inversion` FK; `cantidad`; `precio_divisa`; `divisa`; `cambio` NULL; `importe_eur` INTEGER céntimos; `comision_eur` NULL en céntimos; `concepto`/`nota` NULL; `estado`; `revision`; UTC | Un hecho por Compra; Venta se añadirá en E4.2 sin segunda tabla; sin Partida/Referencia/Ciclo/Deuda; sin importes derivados persistidos |
| `instrumento_attempts` / `operacion_attempts` | Clave de idempotencia, huella del payload, respuesta privada, instante | Reintento 24 h; se revoca al restaurar; no es fuente financiera |
| `instrumento_audit` | `instrumento` FK; `revision`; `accion` (`alta`, `edición`, `desactivación`, `reactivación`); `motivo` NULL solo en alta; `instante` UTC; `actor`; `anterior` JSON NULL; `posterior` JSON NOT NULL; PK `(instrumento, revision)` | Append-only con triggers que abortan `UPDATE`/`DELETE`; una fila por revisión resultante; conserva nombre, ISIN, evidencia, divisa de referencia y estado antes/después; no duplica posición ni efectivo |
| `operacion_inversion_audit` | `operacion` FK; `revision`; `accion` (`alta`, `rectificación`, `anulación`); `motivo` NULL solo en alta; `instante` UTC; `actor`; `anterior` JSON NULL; `posterior` JSON NOT NULL; PK `(operacion, revision)` | Append-only con triggers que abortan `UPDATE`/`DELETE`; `posterior` de una anulación es el estado `Anulada`; conserva los campos económicos completos antes/después; no es fuente de efectivo ni de cantidad |
| Contadores | Secuencia de `Ixxx` (inicio `I1001`) y de IDs de operación | Reserva atómica sin MAX+1; sin reutilización; continúa desde el máximo real si existiera |
| Efectivo | No persistido | Read model con apertura, entradas, salidas, compras y ventas; motor único de §4.3.3 |
| Posición | No persistida | Read model `saldo_inversion + instrumento`; cantidad desde Compras/Ventas |

La tabla `audit` existente (Saldos y otros maestros) no cambia de esquema, contenido ni
semántica. E4.1 no escribe en ella para Instrumentos ni Compras: usa exclusivamente las dos
tablas dedicadas, con el mismo precedente de `movement_audit` (clave por entidad y revisión,
JSON antes/después, triggers de inmutabilidad).

Reglas de integridad:

- `instrumentos.id` es PK inmutable y no se reutiliza. `operaciones_inversion.id` es único,
  inmutable y no se reutiliza.
- `operaciones_inversion.instrumento` referencia un Instrumento existente; los dos Saldos
  referencian Saldos existentes y activos en el alta.
- `saldo_efectivo` debe ser `Efectivo`/`Inversiones`; `saldo_inversion` debe ser
  `Inversión`/`Inversiones`; no pueden ser el mismo ID.
- `clase = Compra` en E4.1; cualquier otro valor se rechaza. E4.2 ampliará el dominio a
  Venta sin crear una tabla paralela.
- `cantidad > 0` con escala máxima 8; `precio_divisa > 0` con escala máxima 6; `divisa` ISO
  4217; `cambio > 0` con escala máxima 6 si la divisa no es EUR (para EUR, ausente o
  exactamente 1); `importe_eur > 0` en céntimos exactos; `comision_eur >= 0` en céntimos y
  `<= importe_eur`. La persistencia rechaza cualquier valor con más decimales que la escala
  o fuera del rango de §6, sin redondear.
- `fecha` es civil ISO; no se desplaza por zona; no puede ser futura según el día civil
  `Europe/Madrid` del servidor (§4.2, §11).
- `isin` NULL o exactamente 12 caracteres ASCII `[A-Z0-9]`, normalizados a mayúsculas y sin
  espacios de borde, con `isin_evidencia` no vacía; `isin_evidencia` NULL si no hay ISIN.
  Unicidad por ISIN normalizado; el índice lógico es único cuando el ISIN no es NULL. La
  validación es sintáctica: no valida el dígito de control ni certifica validez registral.
- `divisa_referencia` NULL o ISO 4217 de tres letras mayúsculas.
- `nombre` 1–120 caracteres y `isin_evidencia` 1–200, sin caracteres de control; `concepto`
  y `nota` hasta 2000.
- Sin DELETE de Instrumento ni de Compra. La baja funcional es desactivar/anular. Las
  rutas `DELETE` no se registran y caen en 404 `NOT_FOUND` sin escritura.
- Null no es `""`, `0` ni fecha de hoy. Una ausencia no se presenta como cero.

### 5.1 Identidad e IDs

Propuesta técnica (DT2), no decisión financiera:

- Instrumentos nuevos: `I` + secuencia decimal. La secuencia parte de `I1001` en la versión
  18 y no reutiliza IDs; si la migración encontrara filas, continúa desde el mayor `Ixxx`
  real. El formato exacto es detalle técnico, no una regla financiera, y E4.1 no afirma que
  existan Instrumentos previos.
- Compras nuevas: ID decimal exacto en TEXT, procedente de un contador atómico, como en
  Movimientos. El cliente no elige el ID.
- La posición no tiene ID propio: se identifica por la pareja de IDs.
- Los IDs se muestran en la UI y son inmutables; renombrar no cambia ninguno.

### 5.2 Persistencia y migración (contrato documental)

- **Versión destino: E4.1 usa la 18 (rev10 aprobada, documental).** El gate inicial verificó
  `main` 14; después se integraron Compartidos v15 (`24b48c5`), Revisión bancaria de Comida v16
  (`2487656`) y D5/Aportaciones de terceros v17 (`cf6954a`, PR90). `origin/main` declara
  `schemaVersion = 17` y ocupa la 16/17. La **18 está libre** en refs y worktrees a 2026-10-27;
  ningún ref ni worktree declara 18. Rev10 propone que E4.1 use la 18, sin reabrir ni modificar
  Compartidos, Revisión de Comida o D5. La reserva 18 es provisional frente a un `main` que
  avance o una reserva verificada.
- **Contrato real de main v16 (histórico y origen).** `main` `2487656`/`1d539a8` declara 16 con
  `C16-REVISION-COMIDA-26B6F0C`: **135 objetos**, SHA-256
  `9d9b0783c519d32d667ae2a3911310b3667bfc4783089db4e6eea9171a9d2dc4`; conserva Compartidos
  v15, Vehículos y contadores. Es origen de 16→17→18, no el contrato final.
- **Contrato real de main v17 (D5).** `origin/main` `cf6954a` (PR90, `feat(dev14): D5
  aportaciones de terceros desde Exterior (v17)`) declara `schemaVersion = 17`. No existe en
  `main` un `apps/api/src/schema-contracts.json` ni un manifiesto canónico publicado. El
  manifiesto generado desde el esquema físico de `cf6954a` tiene **145 objetos** (57 tablas, 17
  índices y 71 triggers) y SHA-256
  `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`; está **congelado**
  como **`C17-D5-CF6954A`** y la cesión de D5 fue autorizada temporalmente por el usuario el
  2026-10-27. Objetos distintivos:
  `movimiento_compartido` (PK `movimiento`, FK a `movimientos`, `fichas_compartidos` y
  `participantes_compartido`), índices `movimiento_compartido_referencia` y
  `movimiento_compartido_participante`, y triggers `movimiento_compartido_id_immutable`,
  `movimiento_compartido_no_delete`, `movimiento_compartido_shape`,
  `movimiento_compartido_participant`, `movimiento_compartido_update_shape`,
  `movimiento_compartido_update_participant` y
  `movimiento_compartido_reference_immutable`; conserva Compartidos v15, Revisión de Comida v16,
  Vehículos, `movimientos`, auditorías y contadores. D5 reconstruye `movimientos`,
  `movement_audit`, `movimiento_anticipo`, `payroll_allocations`, `revision_comida` y
  `revision_comida_audit` para relajar solo la forma de Transferencia `S000 → saldo interno`;
  **copia las filas existentes de esas seis tablas durante la reconstrucción**;
  `movimiento_compartido` no duplica importes ni fechas. D5 no reseedea. El `CHECK`
  resultante de `movimientos` conserva la
  forma `tipo='Transferencia' AND destino!='S000' AND origen!=destino AND partida IS NULL AND
  subtipo IS NULL` y las demás ramas de Ingreso/Gasto/Amortización; 17→18 debe preservarlo
  literalmente. Evidencia reproducible: `git archive cf6954a apps/api/src` + el generador
  `specs/fixtures/e4.1/generate-schema-contract.ts`, con la serialización canónica de §5.2 y
  SHA-256 recalculado. El hash está **congelado** en el artefacto de esta rama (registro de
  congelación) y DEV19 adaptó el código a la 18 sin alterarlo.
- **Relación de D5 con consumidores.** D5 se apoya en una Transferencia `S000 → saldo interno`
  con metadatos 0..1 en `movimiento_compartido`; no crea tipos de Movimiento, Presupuesto,
  Deuda, Ciclo ni efectos de Saldo paralelos. Compartidos mantiene sus reglas de ficha,
  participante y evidencia; Saldos conserva su contrato y Movimientos conserva sus reglas
  salvo la forma D5 de Transferencia y su acreditación asociada; `financeRevision` incorpora
  `movimiento_compartido`. E4.1 no reescribe esos consumidores ni convierte una Compra o una
  aportación D5 en otra cosa.
- **Progresión canónica y tablas vacías (rev10).** Al estar `main` en 17, las rutas 13→18,
  14→18, 15→18, 16→17→18 y 17→18 ejecutan la progresión canónica
  **13→14→15→16→17→18**, **14→15→16→17→18**, **15→16→17→18**, **16→17→18** o **17→18** con
  las migraciones de main. Si el origen no tenía Compartidos, Revisión de Comida o D5, la
  progresión crea sus tablas **vacías**; no importa datos, no reseedea, no crea hechos y no
  reutiliza identidades. E4.1 solo añade su propio esquema en 17→18 y actualiza
  `schema_version`. Las migraciones 14→15 (Compartidos), 15→16 (Revisión de Comida) y 16→17
  (D5) son las de `main`, pueden reconstruir tablas según sus contratos y **no forman parte del
  DDL propio de E4.1**. La garantía de «sin `DROP`/`ALTER` destructivo» se aplica al esquema
  propio de inversión (17→18) y a tablas ajenas desde E4.1, no a las migraciones prerequisito
  de main.
- **Regla de resolución.** Las versiones se resuelven por orden de integración. La 14 queda
  para Vehículos; la 15 para Compartidos/Base B; la 16 para Revisión de Comida; la 17 para
  D5/Aportaciones; E4.1 usa la 18. Si otra entrega ocupa la 18 antes de DEV, E4.1 renumera en
  su rama a la siguiente versión libre y repite el gate y la revisión; nunca se comparte el
  mismo número entre contratos distintos.
- **Contratos admitidos: lista cerrada y manifiesto obligatorio.** E4.1 **no** acepta una base
  por su número. Solo admite los contratos de la tabla, identificados y verificados en objetos
  e invariantes; cualquier otro v14, v15, v16 o v17 —incluida una revisión que cambie el
  manifiesto— es desconocido y se rechaza antes de mutar. El soporte de cualquier otro contrato
  queda bloqueado hasta una revisión autorizada. El manifiesto completo de cada contrato debe
  estar congelado en `apps/api/src/schema-contracts.json` con su SHA-256; sin ese artefacto y
  sus hashes, el gate pre-DEV falla. El artefacto de la rama contiene C14 histórico, C14V, C15,
  **C16 y C17** con sus hashes canónicos; DEV19 adaptó el código a la 18.

  | ID de contrato | Fuente congelada | Objetos distintivos exigidos | Invariante específica |
  | --- | --- | --- | --- |
  | `C14-COMPARTIDOS-FCE1107` | Compartidos v14, commit `fce1107`; **histórico, no admitido como origen de upgrade** | `fichas_compartidos`, `participantes_compartido`, `compartido_audit`, `compartido_attempts`; índices `participantes_compartido_referencia` y `participantes_compartido_titular`; triggers `compartido_no_delete`, `participante_compartido_id_immutable`, `participante_compartido_no_delete`, `compartido_audit_no_update` y `compartido_audit_no_delete` | `referencias` admite `'Gasto compartido'`; existe el contador `participantes_compartido`; 114 objetos |
  | `C14-VEHICULOS-C69E343` | Vehículos v14, commit `c69e343`; admitido como origen de la progresión 14→15→16→17→18 | `fichas_vehiculo`; índice `fichas_vehiculo_matricula`; triggers `ficha_vehiculo_identity`, `ficha_vehiculo_no_delete`, `ficha_vehiculo_type`, `referencia_vehicle_type`, `audit_ficha_no_update` y `audit_ficha_no_delete` | `referencias` admite `'Vehículo'`; no crea contador nuevo; 111 objetos |
  | `C15-COMPARTIDOS-AD2EDFE` | **Compartidos v15 real**, commit `ad2edfe`; admitido como origen 15→16→17→18 | Base 14 de Vehículos más `fichas_compartidos`, `participantes_compartido`, `compartido_audit` y `compartido_attempts`; mismos índices y triggers de Compartidos; `fichas_vehiculo` y sus triggers se conservan | `schema_version = 15`; `referencias` admite `'Vehículo'` y `'Gasto compartido'`; 122 objetos; la progresión debe preservar todas sus tablas y filas |
  | `C16-REVISION-COMIDA-26B6F0C` | **Revisión bancaria de Comida v16 real**, esquema `26b6f0c`, verificado en `main` `2487656`/`1d539a8`; manifiesto congelado en `schema-contracts.json`; admitido como origen 16→17→18 | `revision_comida`, `revision_comida_audit`, `revision_comida_attempts`, sus tres índices y siete triggers; contador `revision_comida`; conserva Compartidos v15, Vehículos y el resto | `schema_version = 16`; 135 objetos; SHA-256 `9d9b0783c519d32d667ae2a3911310b3667bfc4783089db4e6eea9171a9d2dc4` |
  | `C17-D5-CF6954A` (**congelado; cesión autorizada el 2026-10-27**) | **D5/Aportaciones v17 real**, `cf6954a` (PR90); sin `schema-contracts.json` en main | `movimiento_compartido`; índices `movimiento_compartido_referencia` y `movimiento_compartido_participante`; triggers `movimiento_compartido_id_immutable`, `movimiento_compartido_no_delete`, `movimiento_compartido_shape`, `movimiento_compartido_participant`, `movimiento_compartido_update_shape`, `movimiento_compartido_update_participant` y `movimiento_compartido_reference_immutable`; conserva Compartidos v15, Revisión de Comida v16, `movimientos`, auditorías y contadores | `schema_version = 17`; **145 objetos**; SHA-256 `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`; Transfer `S000 → saldo interno` con metadatos D5; FK/triggers D5; manifiesto congelado |

  Solo `C14-VEHICULOS-C69E343`, `C15-COMPARTIDOS-AD2EDFE`,
  `C16-REVISION-COMIDA-26B6F0C` y `C17-D5-CF6954A` son orígenes de upgrade; C16 y C17 están
  congelados y la cesión de D5 quedó autorizada temporalmente el 2026-10-27. El manifiesto `C14-COMPARTIDOS-FCE1107` se conserva como
  evidencia histórica y se rechaza como origen. La autoridad es el **manifiesto canónico
  completo** de cada contrato. Serialización: array JSON ordenado por `(type, name)` con campos
  en orden `type`, `name`, `tbl_name`, `sql` (UTF-8, `sql` recortado en bordes), sin filas
  `name LIKE 'sqlite_%'` ni `sql` NULL; `JSON.stringify` sin indentación, escape JSON estándar
  y sin espacios añadidos; el artefacto se parsea y re-serializa así antes de comparar; SHA-256
  sobre la cadena UTF-8 exacta.
- **Verificación del contrato antes de mutar.** El arranque aplica este orden; cualquier fallo
  cierra la base y devuelve el literal correspondiente **antes** de `BEGIN IMMEDIATE`,
  `PRAGMA journal_mode`, DDL, backup, contadores, auditoría o cambio de `schema_version`:
  1. Leer `schema_version`: exactamente una fila, con valor 14, 15, 16 o 17.
  2. Construir el manifiesto real y compararlo por igualdad exacta con el contrato admitido de
     esa versión: v14 contra `C14-VEHICULOS-C69E343`; v15 contra
     `C15-COMPARTIDOS-AD2EDFE`; v16 contra `C16-REVISION-COMIDA-26B6F0C`; v17 contra
     `C17-D5-CF6954A` (congelado). Si un v14 coincide con `C14-COMPARTIDOS-FCE1107`, se
     rechaza como origen no admitido. Deben existir todos los objetos con su SQL exacto y no
     puede aparecer ningún objeto ajeno.
  3. Comprobar invariantes (literales de `referencias`, contadores de Compartidos/Revisión de
     Comida, tablas `revision_comida*` en v16, `movimiento_compartido`, sus índices/triggers y
     la forma de Transferencia D5 en v17, `schema_version` real) y que
     `PRAGMA foreign_key_check` esté vacío.
  4. Solo si el manifiesto y las invariantes coinciden se permite evaluar el upgrade a 18.
  - v14/v15/v16/v17 desconocidos o incompletos:
    `Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.` /
    `Contrato de esquema v15 desconocido o incompleto; no se modificará esta base.` /
    `Contrato de esquema v16 desconocido o incompleto; no se modificará esta base.` /
    `Contrato de esquema v17 desconocido o incompleto; no se modificará esta base.`
  - Tablas sintéticas (`compartidos_demo`, `vehiculos_demo`, `revision_comida_demo`,
    `movimiento_compartido_demo` u otras), objetos ausentes, alterados o extra, o contratos
    mezclados no acreditan compatibilidad y se rechazan.
  - **Orden de apertura en DEV.** `database.ts` se reordena para que la comprobación del
    contrato sea la primera operación tras abrir la base en lectura; ninguna PRAGMA persistente
    ni transacción de identidad puede precederla. `database.ts` es compuerta de esta
    verificación.
- **Revalidación de destino (obligatoria).** La 18 no prevalece sobre `main`. Antes de adaptar
  código y antes de publicar: `git fetch origin`, leer
  `origin/main:apps/api/src/database-identity.ts`, las migraciones vigentes, **todos los refs
  locales y remotos** y **todos los worktrees y su estado sin commitear** que reserven versión.
  **STOP** si `origin/main` está en 18 o más, si la 18 está ocupada, si `main` contiene un
  v14/v15/v16/v17 no verificado, si falta C16/C17 canónicos o si falta un manifiesto/hash. Estado
  observado en rev10: `main` = `9977210` (17) con C17 congelado en la rama; la
  18 libre y ningún ref/worktree en 18. Un `main` posterior o una reserva no verificada ganan
  siempre y obligan a repetir el gate; la reserva documental no autoriza por sí misma.
- **Migración aditiva a la versión 18.** La extensión propia de E4.1 se aplica dentro de
  `BEGIN IMMEDIATE` y con rollback íntegro sobre una base 17 verificada. Crea `instrumentos`,
  `operaciones_inversion`, `instrumento_attempts`, `operacion_attempts`,
  `instrumento_audit` y `operacion_inversion_audit`; no ejecuta `DROP`, no borra ni renombra
  tablas y no aplica `ALTER` destructivo sobre tablas ajenas. Conserva intactas
  `movimiento_compartido`, `revision_comida`, `revision_comida_audit`,
  `revision_comida_attempts`, `fichas_compartidos`, `participantes_compartido`,
  `compartido_audit`, `compartido_attempts`, `fichas_vehiculo`, `referencias`, `movimientos`,
  auditorías (`audit`, `movement_audit`), contadores, índices, triggers y el resto de datos;
  conserva `database_origin`, `owner` y el `key_hash` de identidad, sin recifrar ni regenerar
  claves; solo añade lo propio y actualiza `schema_version` a 18. Las progresiones 14→15, 15→16 y 16→17 son de `main`, con sus contratos y
  reconstrucciones; rev10 las declara prerequisitos explícitos y no las atribuye a E4.1.
- **Compuertas explícitas.** `database.ts` verifica el contrato antes de las PRAGMAs
  persistentes y de la transacción de identidad. `database-identity.ts` declara
  `schemaVersion = 18` y admite `[1..18]`; `database-schema.ts` acepta `[1..17, version]`
  (con `version = 18`), verifica los contratos de 14/15/16/17 y aplica el esquema de inversión
  cuando la base es `< 18`. `backup.ts` admite `1..18` y etiqueta la copia como `e4.1-v18`;
  la etiqueta de origen D5 v17 es `e3.2-d5-v17`. Una versión mayor que 18 se rechaza antes de
  mutar.
- **Rutas de upgrade (rev10, pendiente de aprobación).**
  - **13→18:** 13→14 (Vehículos), 14→15 (Compartidos), 15→16 (Revisión de Comida), 16→17 (D5)
    y E4.1 17→18. Conserva filas; crea vacías las tablas heredadas que falten; no importa datos
    ni reseedea.
  - **14→18:** exige `C14-VEHICULOS-C69E343`; aplica 14→15→16→17→18. Preserva Vehículos y
    crea vacías Compartidos, Revisión de Comida y D5 si no existían.
  - **15→18:** exige `C15-COMPARTIDOS-AD2EDFE`; aplica 15→16→17→18 preservando Compartidos.
  - **16→17→18:** exige `C16-REVISION-COMIDA-26B6F0C`; aplica 16→17 (D5) y E4.1 17→18,
    preservando Revisión de Comida y creando vacío D5.
  - **17→18:** exige `C17-D5-CF6954A` canónico; aplica E4.1 17→18 preservando D5, Compartidos,
    Revisión de Comida, Vehículos y todos los datos; no reejecuta 14→15, 15→16 ni 16→17.
  **Todas las rutas 13–16 ejecutan la migración canónica D5 16→17 antes de la extensión E4.1
  17→18; ninguna puede saltarla.** La ruta 17→18 es la ruta canónica prevista, condicionada a
  C17 congelado y la cesión autorizada, no una hipótesis. Cualquier base con otro contrato, objeto
  ausente/alterado o tablas sintéticas se rechaza antes de mutar; no existe una ruta que salte
  la 17 sin C17 canónico.
- **Backup y restore (aprobado, sin implementar).** La propuesta amplía el backup/restore existente para reconocer las versiones 13, 14, 15, 16, 17 y 18;
  copia y restaura Instrumentos, Compras y las dos auditorías, y extiende el vaciado de intentos
  a `instrumento_attempts`, `operacion_attempts`, `compartido_attempts` y
  `revision_comida_attempts`. El restore exige un **directorio nuevo**, no mezcla versiones y
  verifica el manifiesto **correspondiente a la versión de la copia** (C14V para 14, C15 para
  15, C16 para 16 y C17 para 17; una copia 13 solo integridad/identidad). Una copia desconocida o no admitida (v14 de
  Compartidos, v16 distinto de C16, v17 sin C17) se rechaza sin publicar.
  Restaurar una copia de 13, 14, 15, 16 o 17 verificada conserva su esquema de origen y no
  incorpora tablas de la 18; una copia de 18 recupera sus tablas propias. La copia 17 usa la
  etiqueta `e3.2-d5-v17`; la 18, `e4.1-v18`. Restaurar mantiene la revocación de sesiones,
  desafíos e intentos vigente; D5 no añade tabla de intentos propia, pero `movimiento_compartido`,
  sus índices, triggers y datos se preservan, junto con identidad, `key_hash`, auditorías y
  contadores.
- **DT7 (mapping/importación por campo/ID/apertura/archivo) se aplaza expresamente** a
  E4.5/E4.12. E4.1 no importa datos, no mapea el Excel y no fija cortes ni excepciones de
  conciliación: los fixtures son nuevos, ficticios y deterministas.
- Fixtures ficticios y nombres reales: `S003` «Efectivo de inversión demo»
  (`Efectivo`/`Inversiones`) y `S004` «Cartera de inversión demo»
  (`Inversión`/`Inversiones`) ya existen en el entorno demo. `S006` «Cartera secundaria
  demo» (`Inversión`/`Inversiones`) se crea **por el servicio** (`POST /api/saldos`) desde
  el fixture de E4.1 para demostrar dos posiciones del mismo Instrumento; no se inserta por
  SQL directo y no cambia el contrato, las reglas ni el esquema de Saldos. Si se necesita un
  segundo Saldo de efectivo de inversión para AC-48, también se crea por el servicio y su ID
  lo asigna el contador, no el fixture.
- Sin datos reales, importación ni migración operativa en esta entrega.


## 6. Invariantes monetarios y precisión

| Concepto | Contrato |
| --- | --- |
| EUR | Entero de céntimos firmado de 64 bits, `BigInt` extremo a extremo, JSON como string decimal canónico (`"1125.00"`); nunca float ni `number` para operar. |
| Cantidad | Decimal exacto positivo; hasta 8 decimales; sin float. |
| Precio unitario | Decimal exacto positivo en la divisa de la operación; hasta 6 decimales. |
| Cambio histórico | Decimal exacto positivo cuando la divisa no es EUR; EUR se trata como 1 y no exige captura; hasta 6 decimales. |
| Límites de entrada (DT2) | El entero escalado de cada campo de entrada —cantidad (×10⁸), precio (×10⁶) y cambio (×10⁶)— debe quedar en `1..=9007199254740991` (2⁵³−1). En el límite se acepta y se persiste exacto; un valor por encima se rechaza con 422 y no se redondea. El tope garantiza representación exacta en JSON/JS y holgura dentro de `INTEGER` de 64 bits. Es un límite de **entrada**, no del cálculo interno. |
| Cálculo interno (DT2) | `cantidad × precio × cambio` y cualquier agregado monetario se calculan con `BigInt`/decimal exacto de precisión arbitraria, sin `number`, sin float y sin recortar al rango de entrada. El producto exacto de entradas en el límite supera 2⁵³ y su representación escalada excede ampliamente un `INTEGER` de 64 bits: el cálculo interno no se limita a ese rango y no hay desbordamiento, truncamiento ni saturación silenciosa. Solo la presentación se redondea a céntimos. |
| Importe EUR cargado | Céntimos exactos positivos; es el importe observado del cargo y la única base del efecto en efectivo; incluye la comisión si existe. |
| Comisión | EUR, no negativa, dos decimales, `<= importeEur`, ya incluida en el importe cargado; nunca se suma ni se resta otra vez. |
| Referencia | `cantidad × precio × cambio` es solo contraste informativo, calculado en decimal exacto y presentado redondeado a céntimos solo para visualización; su diferencia con el importe cargado no se persiste como segundo importe autorizado. |
| Precisión excesiva | Se rechaza en API y persistencia; no se redondea ni se trunca en silencio. |
| Fechas | Civiles `YYYY-MM-DD`, sin hora ni huso; UTC solo para auditoría técnica. «No futura» se resuelve con el día civil `Europe/Madrid` (`spanishToday`), no con UTC ni con la hora local del cliente. |
| Agregación temporal | Convención DT2 de fin de día: los hechos de la misma fecha se agregan al cierre; sin orden intradía ni hora económica. |
| Agregados | La cantidad y el efectivo se calculan desde hechos vigentes; no se almacenan como verdad editable. |

## 7. API behavior and external dependencies

Propuesta de contrato; rutas y esquema físico quedan sujetos al desarrollo autorizado. No
hay dependencias externas, cotizaciones, bancos ni servicios nuevos.

| Método y ruta | Uso | Reglas |
| --- | --- | --- |
| `GET /api/instrumentos?busqueda=&estado=&page=` | Listado | Autenticado; búsqueda por nombre (subcadena, sin distinguir caja ni tildes) o ISIN normalizado; paginación; sin escritura. |
| `POST /api/instrumentos` | Alta | Campos de §4.1; ISIN con evidencia; unicidad normalizada; idempotency-key; auditoría `alta` (motivo opcional). |
| `GET /api/instrumentos/{Ixxx}` | Ficha, posiciones e historial | 404 si no existe; incluye cantidades y compras; sin valoración; declara cobertura parcial; resumen de auditoría con enlace al endpoint dedicado. |
| `GET /api/instrumentos/{Ixxx}/auditoria` | Auditoría del Instrumento | Autenticado; orden por `revision` ascendente; `anterior`/`posterior` JSON, motivo, actor y UTC; 404 si no existe; sin escritura. |
| `PATCH /api/instrumentos/{Ixxx}` | Renombrar/editar | `revision` y `motivo` obligatorios; `revision` obsoleta → 409 `REVISION_CONFLICT`; revalida ISIN/evidencia y unicidad; no cambia Estado; auditoría `edición`; no reescribe Compras. |
| `POST /api/instrumentos/{Ixxx}/desactivar` y `/reactivar` | Ciclo de vida | Cuerpo `{revision, motivo}`; `revision` obsoleta → 409 `REVISION_CONFLICT`; sin DELETE; conserva historia; auditoría `desactivación`/`reactivación`. |
| `GET /api/instrumentos/opciones` | Selectores del alta | Instrumentos activos y divisas admitidas; **dos** listas de Saldos: `saldosEfectivo` con cada `Efectivo`/`Inversiones` activo y su cifra (sin agregado) y `saldosInversion` con cada `Inversión`/`Inversiones` activo (sin cifra de valoración); ambos selectores vacíos sin preselección y sin primera página truncada. |
| `GET /api/compras?instrumento=&saldo=&saldoEfectivo=&saldoInversion=&desde=&hasta=&estado=&page=` | Listado | `saldo` casa con `saldoEfectivo` **o** `saldoInversion`; los parámetros específicos estrechan a una sola columna. Vigentes por defecto, anuladas consultables; sin escritura. |
| `POST /api/compras` | Alta | Validación de §4.2 y §4.3.2; 422 `VALIDATION` para campos y 422 `INSUFFICIENT_CASH` para suficiencia; idempotency-key; auditoría y efecto en efectivo/cantidad en la misma transacción. |
| `GET /api/compras/{id}` | Ficha | 404 si no existe; incluye Saldos, Instrumento y resumen de auditoría. |
| `GET /api/compras/{id}/auditoria` | Auditoría de la Compra | Autenticado; orden por `revision`; `anterior`/`posterior` con los campos económicos; 404 si no existe; sin escritura. |
| `POST /api/compras/impacto` | Vista previa de alta | Efectivo antes/después y cantidad antes/después; 422 `INSUFFICIENT_CASH` si el candidato es negativo; no escribe. |
| `POST /api/compras/{id}/impacto` | Vista previa de rectificación | Antes/después con el payload completo propuesto, motivo y revisión; 409 `REVISION_CONFLICT` si la revisión es obsoleta; 422 `INSUFFICIENT_CASH` si el candidato es negativo; no escribe. |
| `POST /api/compras/{id}/rectificar` | Rectificación | `revision`, `motivo` y reemplazo completo de campos rectificables (§4.5); 409 `REVISION_CONFLICT` si la revisión es obsoleta; 422 `INSUFFICIENT_CASH` si el saldo resultante es negativo; atómica; auditoría. |
| `POST /api/compras/{id}/impacto-anulacion` | Vista previa de anulación | Efecto en efectivo/cantidad; 409 `REVISION_CONFLICT` si la revisión es obsoleta; no escribe. |
| `POST /api/compras/{id}/anular` | Anulación | Cuerpo `{revision, motivo}`; 409 `REVISION_CONFLICT` si la revisión es obsoleta; conserva el registro; atómica; auditoría `anulación`. |
| `GET /api/inversiones/efectivo?saldo={Sxxx}&fecha=YYYY-MM-DD` | Efectivo del bróker | Motor único de §4.3.3; sin `fecha` devuelve la cifra actual idéntica a `GET /api/saldos/{id}`; con `fecha`, el corte de suficiencia se etiqueta como vista distinta; 422 si el Saldo no es `Efectivo`/`Inversiones`; no escribe. |

Cuerpos propuestos:

```json
POST /api/instrumentos
{"nombre": "Fondo índice demo", "isin": "ES0000000001",
 "isinEvidencia": "Extracto ficticio F-01 · 2026-01-10", "divisaReferencia": "EUR"}

POST /api/compras
{"fecha": "2026-02-10", "instrumento": "I1001",
 "saldoEfectivo": "S003", "saldoInversion": "S004",
 "cantidad": "12.5", "precio": "100.00", "divisa": "USD",
 "cambio": "0.900000", "importeEur": "1125.00", "comisionEur": "5.00",
 "concepto": "Compra demo", "nota": null}

POST /api/compras/{id}/rectificar
{"revision": 1, "motivo": "Corrección de cantidad ficticia",
 "fecha": "2026-02-10", "cantidad": "10", "precio": "100.00", "divisa": "USD",
 "cambio": "0.900000", "importeEur": "900.00", "comisionEur": "0.00",
 "concepto": "Compra demo", "nota": null}
```

La rectificación es un reemplazo completo: si se omite `precio`, `divisa`, `comisionEur`,
`concepto` o `nota`, la petición se rechaza con 422 y el campo señalado. Para una Compra en
EUR, `cambio` debe enviarse como `null` (o `"1.000000"`, único valor admitido).

```json
POST /api/instrumentos/I1001/desactivar
{"revision": 2, "motivo": "Instrumento ficticio fuera de uso"}

POST /api/compras/5001/anular
{"revision": 1, "motivo": "Duplicado ficticio de la compra"}
```

DTO de lectura propuesto:

```json
{
  "instrumento": {
    "id": "I1001", "nombre": "Fondo índice demo", "isin": "ES0000000001",
    "isinEvidencia": "Extracto ficticio F-01 · 2026-01-10",
    "divisaReferencia": "EUR", "estado": "Activa", "revision": 2
  },
  "posiciones": [
    {"saldoInversion": {"id": "S004", "nombre": "Cartera de inversión demo"},
     "cantidad": "12.5", "compras": 1, "ultimaCompra": "2026-02-10"},
    {"saldoInversion": {"id": "S006", "nombre": "Cartera secundaria demo"},
     "cantidad": "3", "compras": 1, "ultimaCompra": "2026-03-03"}
  ],
  "cobertura": "Solo compras registradas; histórico anterior no importado",
  "valoracion": {"estado": "No disponible", "motivo": "Valoración E4.3 no entregada"},
  "compras": [
    {"id": "5001", "fecha": "2026-02-10", "cantidad": "12.5",
     "precio": "100.00", "divisa": "USD", "cambio": "0.900000",
     "importeEur": "1125.00", "comisionEur": "5.00", "estado": "Vigente",
     "saldoEfectivo": {"id": "S003"}, "saldoInversion": {"id": "S004"}},
    {"id": "5002", "fecha": "2026-03-03", "cantidad": "3",
     "precio": "98.00", "divisa": "USD", "cambio": "0.900000",
     "importeEur": "264.60", "comisionEur": "0.00", "estado": "Vigente",
     "saldoEfectivo": {"id": "S003"}, "saldoInversion": {"id": "S006"}},
    {"id": "5003", "fecha": "2026-03-20", "cantidad": "10",
     "precio": "100.00", "divisa": "USD", "cambio": "0.900000",
     "importeEur": "900.00", "comisionEur": "0.00", "estado": "Anulada",
     "saldoEfectivo": {"id": "S003"}, "saldoInversion": {"id": "S004"}}
  ]
}
```

```json
{
  "efectivo": {
    "saldo": {"id": "S003", "nombre": "Efectivo de inversión demo", "tipo": "Efectivo", "control": "Inversiones"},
    "fecha": null,
    "vista": "actual",
    "apertura": "1000.00", "entradas": "2500.00", "salidas": "300.00",
    "compras": "1389.60", "ventas": "0.00",
    "comisionIncluida": "5.00",
    "terminoVentas": "Sin registro de Ventas hasta E4.2; cero estructural",
    "disponible": "1810.40",
    "condicion": "calculado"
  }
}
```

Con `fecha=2026-02-10`, la misma ruta devuelve el corte de suficiencia de esa fecha
(`"vista": "corte"`, `compras: "1125.00"`, `disponible: "2075.00"`) y declara que no es la
cifra actual. El `comisionIncluida` es informativo y no se resta de nuevo. La cifra sin
`fecha` coincide al céntimo con `posicion.importe` de `GET /api/saldos/S003` (AC-38).

Reglas de API:

- Reutilizar MFA/sesión, Origin/CSRF, límites JSON, Effect Schema, revisiones,
  idempotencia 24 h, auditoría y errores sin SQL.
- `GET` no escribe, no repara posiciones y no crea Instrumentos. Las rutas de impacto
  (`/impacto`, `/{id}/impacto`, `/impacto-anulacion` y `/api/movimientos/impacto` para
  Gasto, Ingreso, Transferencia y Amortización) tampoco escriben: no reservan ID, no mueven
  el contador, no crean auditoría y no alteran efectivo, cantidad ni posición; la prueba
  compara tablas, contadores y auditoría antes/después.
- 404 `NOT_FOUND` para ID inexistente o ruta/método no registrado (incluido `DELETE`);
  401/403 para acceso/CSRF. Los 409 y 422 se emiten con el código de su causa, según la
  tabla siguiente; no existe un 409 ni un 422 genéricos. Sin rutas DELETE.

Códigos de error (contrato unívoco; una causa, un código):

| Causa | HTTP | Código | Cuerpo mínimo |
| --- | --- | --- | --- |
| Validación de campo, formato, escala, magnitud, fecha futura, Estado no elegible, campo rectificable omitido o no rectificable | 422 | `VALIDATION` | campo y motivo |
| Suficiencia de efectivo insuficiente, en alta, rectificación o previsualización, **incluida la recalculada dentro de la transacción** | 422 | `INSUFFICIENT_CASH` | `disponible`, `necesario`, `minimo`, `fecha` |
| `revision` obsoleta en editar, desactivar, reactivar, rectificar o anular | 409 | `REVISION_CONFLICT` | revisión vigente esperada |
| Huella o contexto de previsualización de un **Movimiento** obsoleto (`financeRevision` / `contextRevision`) | 409 | `IMPACT_CHANGED` | requiere recalcular; las rutas de Compra no transportan huella y no emiten este código |
| Guard de impacto de Saldo: cambio de `tipo`, `control`, `saldoApertura`, `fechaApertura` o `permiteSalidaExterior` con Compras | 409 | `HISTORY_LOCKED` | dependencia que lo bloquea |

- El rechazo por suficiencia es **siempre** 422 `INSUFFICIENT_CASH` con `disponible`,
  `necesario`, `minimo` y `fecha`, nunca 409 y nunca `VALIDATION`. A la inversa, 409 nunca
  expresa falta de efectivo: expresa revisión obsoleta (`REVISION_CONFLICT`), contexto
  obsoleto (`IMPACT_CHANGED`) o guard de impacto (`HISTORY_LOCKED`).
- `IMPACT_CHANGED` pertenece a la confirmación de un Movimiento previsualizado: solo esa ruta
  transporta `financeRevision`/`contextRevision`. Las rutas de Compra (impacto, rectificación y
  anulación) no reciben ni emiten huella; su control de concurrencia es `revision`, y un
  contexto de Movimiento invalidado por una Compra se prueba en AC-53, no en los endpoints de
  Compra.
- Importes como string decimal; null no se convierte en 0. La lista y la ficha declaran
  cuándo una cifra no está disponible y por qué.
- La confirmación de un Movimiento previsualizado revalida dentro de la transacción:
  Instrumento/Saldos activos, tipos correctos, efectivo suficiente, revisión y huella. Cada
  revalidación fallida devuelve
  **solo** el código de su causa: suficiencia recalculada → 422 `INSUFFICIENT_CASH`;
  `revision` obsoleta → 409 `REVISION_CONFLICT`; huella o contexto obsoleto → 409
  `IMPACT_CHANGED`; guard de Saldo → 409 `HISTORY_LOCKED`. Ninguna de ellas escribe de forma
  parcial. No hay una respuesta comodín para la concurrencia: el código depende de qué
  invariante falló, y dos peticiones simultáneas que no vulneren ninguna no se rechazan.
- No se aceptan campos de Movimiento (Tipo, Partida, Referencia, Subtipo) en el payload de
  Compra; no se ignoran silenciosamente para simular una clasificación.
- Ningún endpoint devuelve datos de otra sesión ni permite elegir actor. Sin endpoints de
  fixtures o de importación.

## 8. Concurrencia, atomicidad, persistencia y seguridad

- Una conexión de escritura administrada, WAL, `synchronous=FULL`, `busy_timeout` acotado y
  transacciones breves `BEGIN IMMEDIATE`; sin operaciones asíncronas dentro del callback
  transaccional.
- Apertura y contrato de esquema: antes de `BEGIN IMMEDIATE`, de `journal_mode` o de cualquier
  DDL, una base 14 se compara con el manifiesto congelado de un contrato admitido. Si el
  manifiesto no coincide, si falta o sobra un objeto, si el SQL difiere, si se mezclan
  contratos o si el número 14 acompaña a tablas sintéticas, se cierra la conexión y se rechaza
  literalmente `Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.`
  sin escribir, sin backup y sin actualizar `schema_version`. El orden de `database.ts` se
  reordena en DEV para que esta comprobación preceda a la transacción de identidad y a las
  PRAGMAs persistentes. La conservación de tablas ajenas solo se acredita después de esta
  comprobación, nunca por el número de versión.
- Alta de Compra: reserva de ID, validaciones, efecto en efectivo/cantidad y auditoría en la
  misma transacción. Cualquier fallo revierte todo: no hay Compra parcial, no se mueve el
  contador y no se altera el efectivo. La fila de `operacion_inversion_audit` se escribe en
  la misma transacción que el hecho; un fallo de auditoría aborta la Compra.
- La suficiencia de efectivo se recalcula dentro de la transacción, incluida la ventana
  posterior de una operación retroactiva; dos altas simultáneas no pueden dejar el efectivo
  negativo por una validación obsoleta. Si el recálculo ya no alcanza, la petición rechazada
  devuelve 422 `INSUFFICIENT_CASH` con `disponible`, `necesario`, `minimo` y `fecha`, sin
  escritura y sin consumir el contador; no es un conflicto de revisión.
- Rectificación/anulación: comparar `revision` dentro de la transacción; petición obsoleta
  devuelve 409 `REVISION_CONFLICT` sin sobrescribir. La huella de impacto de un Movimiento
  incluye Instrumento, Saldos, Compra, revisiones y hechos que afecten al efectivo/cantidad;
  las rutas de Compra no reciben ni emiten esa huella y usan `revision`. `financeRevision`
  incorpora las filas de `operaciones_inversion`, por lo que una Compra registrada entre la
  vista previa y la confirmación de un Movimiento invalida el contexto y devuelve 409
  `IMPACT_CHANGED` sin escritura. La huella es global, no por Saldo: cualquier Compra invalida
  el contexto de todos
  los Movimientos y una previsualización ajena puede recibir 409 `IMPACT_CHANGED` y exigir
  recálculo. Es una sobre-invalidación deliberada y segura —falla hacia el recálculo, nunca
  hacia la escritura con contexto obsoleto—; acotarla por Saldo es una optimización futura
  fuera de E4.1 y no una condición de corrección. Revisión y huella son causas distintas y no
  se sustituyen: una `revision` vieja nunca se reporta como `IMPACT_CHANGED` y una huella
  vieja nunca como `REVISION_CONFLICT`.
- Guard de impacto de Saldo: la comprobación existente de E1.1 (`tipo`, `control`,
  `saldoApertura`, `fechaApertura`, `permiteSalidaExterior`) se amplía a las Compras. Si el
  Saldo interviene como `saldo_efectivo` o `saldo_inversion` en alguna Compra, incluida una
  anulada, el cambio de esos cinco campos devuelve 409 `HISTORY_LOCKED` sin escritura. Los
  demás campos y el cambio de Estado siguen permitidos. Es una extensión de integración de
  E1.1 AC-14, no un cambio silencioso de la regla.
- Dos procesos o conexiones no pueden crear dos Compras para el mismo intento idempotente.
- Lecturas financieras con snapshot transaccional; la posición y el efectivo se calculan
  desde hechos vigentes, no desde cachés persistidas. `GET /api/saldos/{id}`, el endpoint de
  efectivo y la previsualización de Movimientos consumen el mismo motor y no pueden
  discrepar dentro del mismo snapshot.
- Auditoría append-only en `instrumento_audit` y `operacion_inversion_audit`: actor único del
  servidor, UTC, revisión resultante, motivo y JSON `anterior`/`posterior`; triggers que
  abortan `UPDATE` y `DELETE`. No se registran contraseñas, tokens, OTP, claves, importes ni
  payloads en logs públicos. La tabla `audit` existente no se modifica.
- La propuesta de backup/restore de E4.1 amplía el mecanismo existente para reconocer las versiones 13, 14, 15, 16, 17 y 18; la 17 usa la
  etiqueta `e3.2-d5-v17` y la 18 `e4.1-v18`. Restaura Instrumentos, Compras, auditorías y los
  datos D5; una base 13-17 verificada sube a 18 con la migración propia de E4.1. El restore
  exige un directorio nuevo —no escribe sobre una base existente ni mezcla tablas de otra
  entrega—, vacía sesiones, desafíos e intentos (incluidas `instrumento_attempts`,
  `operacion_attempts`, `compartido_attempts` y `revision_comida_attempts`), y verifica el
  manifiesto de la versión de la copia (C14V/C15/C16/C17; 13 solo integridad). Una
  copia de 13-17 verificada conserva su esquema de origen sin incorporar tablas de la 18; una copia de 18 recupera sus tablas
  propias. D5 no añade tabla de intentos propia, pero `movimiento_compartido`, sus índices,
  triggers y datos se preservan, junto con identidad, `key_hash`, auditorías y contadores. Restaurar revoca sesiones y desafíos según la política vigente. No se añade un
  mecanismo de copia nuevo. El guard de entorno demo sigue intacto.
- Sin nuevas dependencias, ORM, servicios externos ni cambios de autenticación.

## 9. Pantallas y wireframes (APROBADAS rev7)

Datos ficticios. Se reutiliza el shell, tokens, tablas/tarjetas, foco y componentes
existentes; tema claro; sin modo oscuro. Wireframes W1–W10 aprobados por el usuario el
2026-10-26 como parte de SPEC19 rev7; la aprobación no acredita implementación ni pruebas de
navegador. Q10 confirmada: módulo **Inversiones** con pestañas **Instrumentos** y
**Compras**; la ficha muestra posiciones por Saldo e historial; el efectivo del bróker es
solo lectura y enlaza a Saldos. W1–W3 son 1440; W4–W6 son 390; W7/W8 son la pestaña
**Compras** a 1440/390; W9/W10 son impacto, rectificación y anulación a 1440/390. Los
nombres de fixture son los reales del entorno demo: `S003` «Efectivo de inversión demo»,
`S004` «Cartera de inversión demo» y `S006` «Cartera secundaria demo», creado por el
servicio.

La cobertura es parcial: todas las pantallas de posición declaran «Posición calculada solo
con las compras registradas; no incluye histórico anterior no importado» y no la presentan
como posición completa.

### W1 — Listado de Instrumentos (1440)

```text
Inversiones · [Instrumentos] [Compras]                          [+ Nuevo instrumento]
[Buscar por nombre o ISIN]  [Estado: Todos v]
Efectivo del bróker (por Saldo, sin total agregado)
S003 · Efectivo de inversión demo · 1.810,40 €                    [Ver Saldos]
Ventas: no disponibles hasta E4.2
Cobertura: solo compras registradas; histórico anterior no importado

Ixxx   Nombre                ISIN            Divisa ref.  Posiciones (cantidad)              Compras  Estado
I1001  Fondo índice demo     ES0000000001    EUR          S004 Cartera de inversión demo · 12,5           1        Activa
                                                           S006 Cartera secundaria demo · 3   1
I1002  Acción ficticia       —               USD          S004 Cartera de inversión demo · 10             1        Activa
I1003  Fondo antiguo         ES0000000009    EUR          Sin posiciones                     0        Inactiva

«Compras» cuenta las vigentes; las anuladas se consultan en la ficha y no computan.
El filtro por defecto es «Todos» para que la fila Inactiva sea coherente; «Activos» es una
opción explícita que la oculta.
```

Sin columna de valor actual, resultado ni rentabilidad. «Sin posiciones» es una cantidad
cero verificada del registro de Compras, no una valoración. Si existen varios Saldos
`Efectivo`/`Inversiones`, se añade una línea por Saldo con su cifra; nunca una suma.

### W2 — Ficha y posición (1440)

```text
‹ Volver   I1001 · Fondo índice demo                              [Activa]
ISIN: ES0000000001 · Evidencia: Extracto ficticio F-01 · 2026-01-10
Divisa de referencia: EUR
[Editar instrumento] [Desactivar]

Posiciones por Saldo de inversión
Saldo                              Cantidad   Compras   Última vigente
S004 · Cartera de inversión demo   12,5       1         10/02/2026
S006 · Cartera secundaria demo     3          1         03/03/2026
Posición calculada solo con las compras registradas; no incluye histórico anterior.
Valoración y resultado: No disponible hasta E4.3. No se muestra 0.

Compras del Instrumento (3)                                        [+ Nueva compra]
Fecha        Saldo efectivo               Saldo inversión                Cantidad  Precio   Divisa  Cambio    EUR cargado  Comisión  Estado
10/02/2026   S003 Efectivo de inversión   S004 Cartera de inversión      12,5      100,00   USD     0,900000  1.125,00 €   5,00 €    Vigente
03/03/2026   S003 Efectivo de inversión   S006 Cartera secundaria        3         98,00    USD     0,900000  264,60 €     0,00 €    Vigente
20/03/2026   S003 Efectivo de inversión   S004 Cartera de inversión      10        100,00   USD     0,900000  900,00 €     0,00 €    Anulada
```

### W3 — Alta de Compra (1440)

```text
Nueva compra · I1001 · Fondo índice demo
Datos de la operación
Fecha *                    [2026-02-10]
Instrumento *              [I1001 · Fondo índice demo v]
Saldo de efectivo *        [Selecciona Saldo de efectivo v]   ← sin preselección
                           Opciones: S003 · Efectivo de inversión demo · 3.200,00 €
Saldo de inversión *       [S004 · Cartera de inversión demo v]
Cantidad *                 [12,5]
Precio unitario *          [100,00]
Divisa *                   [USD v]
Cambio histórico *         [0,900000]   (solo si la divisa no es EUR; EUR = 1 o vacío)
Importe EUR cargado *      [1.125,00]
Comisión EUR (incluida)    [5,00]
Referencia cantidad×precio×cambio: 1.125,00 € · Diferencia: 0,00 €
Concepto                   [Compra demo]
Nota                       [ ]
[Cancelar] [Revisar compra]
La comisión incluida no se resta otra vez. El cambio posterior no alterará esta compra.
```

La referencia y la diferencia son informativas; no son un segundo importe autorizado. El
efectivo baja exactamente por el importe cargado. El selector de efectivo lista cada Saldo
`Efectivo`/`Inversiones` con su cifra y sin agregado; con cero Saldos elegibles el alta se
bloquea con el motivo y sin formulario operativo.

### W4 — Listado de Instrumentos (390)

```text
Inversiones · [Instrumentos] [Compras]              [+ Nuevo]
[Buscar] [Todos v]
Efectivo del bróker
S003 · 1.810,40 €  (una línea por Saldo; sin total)
Ventas: no disponibles hasta E4.2
Cobertura: solo compras registradas

I1001 · Fondo índice demo [Activa]
ISIN ES0000000001 · EUR
S004 Cartera de inversión demo · 12,5 · 1 compra vigente
S006 Cartera secundaria demo · 3 · 1 compra vigente
Valoración: No disponible hasta E4.3

I1002 · Acción ficticia [Activa]
Sin ISIN · USD
S004 Cartera de inversión demo · 10 · 1 compra

I1003 · Fondo antiguo [Inactiva]
ISIN ES0000000009 · EUR
Sin posiciones · 0 compras
```
El filtro «Todos» muestra también la fila Inactiva; «Activos» la oculta, igual que en W1.

### W5 — Ficha y posición (390)

```text
‹ Volver  I1001 · Fondo índice demo [Activa]
ISIN ES0000000001
Evidencia: Extracto ficticio F-01 · 2026-01-10
Divisa ref. EUR
[Editar] [Desactivar]

Posiciones
S004 · Cartera de inversión demo: 12,5 · 1 compra vigente
S006 · Cartera secundaria demo: 3 · 1 compra vigente
Posición basada solo en compras registradas; no incluye histórico anterior.
Valoración y resultado: No disponible hasta E4.3

Compras (3)                         [+ Nueva compra]
10/02/2026 · S003 → S004
12,5 × 100,00 USD · cambio 0,900000
EUR cargado 1.125,00 € · comisión 5,00 € · Vigente

03/03/2026 · S003 → S006
3 × 98,00 USD · cambio 0,900000
EUR cargado 264,60 € · comisión 0,00 € · Vigente

20/03/2026 · S003 → S004
10 × 100,00 USD · cambio 0,900000
EUR cargado 900,00 € · comisión 0,00 € · Anulada
```

### W6 — Alta de Compra (390)

```text
Nueva compra · I1001
Fecha * [2026-02-10]
Efectivo * [Selecciona Saldo v] (S003 · 3.200,00 €)
Inversión * [S004 · Cartera de inversión demo]
Cantidad * [12,5]
Precio * [100,00]
Divisa * [USD]
Cambio * [0,900000]
EUR cargado * [1.125,00]
Comisión incluida [5,00]
Diferencia referencia: 0,00 €
[Cancelar] [Revisar compra]
```

### W7 — Pestaña Compras (1440)

```text
Inversiones · [Instrumentos] [Compras]                              [+ Nueva compra]
[Instrumento v] [Saldo v] [Desde] [Hasta] [Estado: Todas v]
Compras (3) · 2 vigentes · 1 anulada
Fecha        Instrumento           Efvo.  Inv.   Cantidad  Precio   Divisa  Cambio    EUR cargado  Comisión  Estado    Acciones
10/02/2026   I1001 Fondo índice    S003   S004   12,5      100,00   USD     0,900000  1.125,00 €   5,00 €    Vigente   [Ver] [Rectificar] [Anular]
03/03/2026   I1001 Fondo índice    S003   S006   3         98,00    USD     0,900000  264,60 €     0,00 €    Vigente   [Ver] [Rectificar] [Anular]
20/03/2026   I1001 Fondo índice    S003   S004   10        100,00   USD     0,900000  900,00 €     0,00 €    Anulada   [Ver]
Sin compras: «Sin compras registradas» + alta. Carga: esqueleto sin ceros.
«Saldo» filtra por Saldo de efectivo o de inversión; los filtros específicos estrechan a uno.
La fila Anulada no ofrece Rectificar ni Anular y no computa.
```

### W8 — Pestaña Compras (390)

```text
Inversiones · [Instrumentos] [Compras]              [+ Nueva]
[Buscar] [Filtros v]  Todas (3) · 2 vigentes · 1 anulada
Filtros: Instrumento · Saldo · Desde · Hasta · Estado (Todos por defecto)

10/02/2026 · I1001 Fondo índice demo
S003 → S004 · 12,5 × 100,00 USD · 0,900000
EUR cargado 1.125,00 € · comisión 5,00 € · Vigente
[Ver] [Rectificar] [Anular]

03/03/2026 · I1001 Fondo índice demo
S003 → S006 · 3 × 98,00 USD · 0,900000
EUR cargado 264,60 € · comisión 0,00 € · Vigente

20/03/2026 · I1001 Fondo índice demo  [Anulada]
S003 → S004 · 10 × 100,00 USD · 0,900000
EUR cargado 900,00 € · comisión 0,00 € · solo [Ver]
```

### W9 — Impacto, rectificación y anulación (1440)

```text
Rectificar compra 5001 · I1001 Fondo índice demo · 10/02/2026
Impacto (no escribe hasta confirmar)
Efectivo S003 · Efectivo de inversión demo   antes 1.810,40 € → después 2.035,40 €
Posición S004 · Cartera de inversión demo    antes 12,5      → después 10

Datos (reemplazo completo)
Fecha *            [2026-02-10]
Cantidad *         [10]
Precio *           [100,00]
Divisa *           [USD v]
Cambio *           [0,900000]
EUR cargado *      [900,00]
Comisión           [0,00]
Concepto           [Compra demo]
Nota               [ ]
Motivo *           [Corrección de cantidad ficticia]
Revisión actual 1 · se guardará revisión 2
[Cancelar] [Confirmar rectificación]   (deshabilitado sin motivo o con revisión obsoleta)

Anular compra 5001
Efectivo S003 antes 1.810,40 € → después 2.935,40 € · Posición S004 12,5 → 0
Motivo * [Duplicado ficticio]   Revisión actual 1
[Borrador] [Anular compra] (no borra; el registro queda Anulada)
```

### W10 — Impacto, rectificación y anulación (390)

```text
‹ Volver  Rectificar compra 5001
Efectivo S003
antes 1.810,40 €
después 2.035,40 €
Posición S004 · I1001: 12,5 → 10
Fecha * [2026-02-10]
Cantidad * [10]
Precio * [100,00]
Divisa * [USD]
Cambio * [0,900000]
EUR cargado * [900,00]
Comisión [0,00]
Motivo * [Corrección de cantidad ficticia]
Revisión 1 → 2
[Cancelar] [Confirmar]  (deshabilitado si falta motivo)
Error 422 `INSUFFICIENT_CASH`: muestra fecha e importe del mínimo y lleva el foco al aviso.
Conflicto 409 `REVISION_CONFLICT`: conserva el borrador y pide actualizar la revisión.

Anular compra 5001
Efectivo S003 antes 1.810,40 € → después 2.935,40 €
Posición S004 · I1001: 12,5 → 0
Motivo * [Duplicado ficticio]   Revisión 1 → 2
[Borrador] [Anular compra] (no borra; el registro queda Anulada)
```
W9 y W10 cubren rectificación y anulación; la pestaña Compras (W7/W8) muestra ambas.

Notas comunes: «No disponible» no es cero; «Sin posiciones» sí es un cero verificado del
registro, no de la valoración. No hay columnas ni etiquetas de rentabilidad. Se conserva el
borrador ante errores y se mantiene el foco en el primer campo inválido o en el aviso. Los
botones de confirmación quedan deshabilitados sin `motivo` o con revisión obsoleta, y el
panel de impacto declara que no escribe hasta confirmar. Las cifras de S003 (1.810,40 €)
corresponden a las dos Compras vigentes ficticias y no incluyen la anulada; la rectificación
de W9 libera 225,00 € y la anulación los 1.125,00 € de la compra.

## 10. Empty, loading and error states

- **Listado vacío:** «Sin Instrumentos» + alta; ninguna fila ficticia. **Sin compras:**
  «Sin compras registradas»; no se inventa una compra de ejemplo.
- **Ficha sin posiciones:** «Sin posiciones registradas» con cantidad 0 verificada del
  registro; la valoración sigue «No disponible hasta E4.3».
- **Carga:** estado visible y filtros conservados; no se muestra 0 mientras carga.
- **Error de fuente/DB:** identidad y hechos conocidos permanecen visibles; efectivo,
  posición o compras no verificables se muestran «No disponible» con motivo, sin borrar el
  resto ni convertirlos en cero.
- **Conflicto de revisión o contexto:** 409; se distingue el código —`REVISION_CONFLICT`
  para una `revision` obsoleta, `IMPACT_CHANGED` para una huella/contexto de **Movimiento**
  obsoleto—; se conserva el borrador y se pide actualizar. `REVISION_CONFLICT` aplica a
  rectificar, anular, desactivar y reactivar; `IMPACT_CHANGED` solo a confirmar un Movimiento
  previsualizado cuando una Compra cambió el efectivo entre la vista previa y la confirmación.
  Nunca se sobrescribe una revisión ni un contexto obsoleto; las rutas de Compra no usan
  huella.
- **Guard de impacto de Saldo:** intentar cambiar `tipo`, `control`, `saldoApertura`,
  `fechaApertura` o `permiteSalidaExterior` de un Saldo con Compras devuelve 409
  `HISTORY_LOCKED`, con explicación de la dependencia y sin escritura; desactivar/reactivar
  siguen disponibles.
- **Alta fallida:** rollback completo; sin Compra parcial ni efecto en efectivo/cantidad.
- **Instrumento inactivo o Saldo no elegible:** no seleccionable; si llega por API, 422 con
  motivo y sin escritura.
- **Sin Saldo de efectivo elegible:** el alta se bloquea y explica que no hay ningún Saldo
  `Efectivo`/`Inversiones` activo; no se ofrece una cifra agregada ni un Saldo de otro
  Tipo/Control.
- **Efectivo insuficiente:** bloqueo con 422 `INSUFFICIENT_CASH`, `disponible`, `necesario`,
  `minimo` y `fecha`
  del mínimo (incluida la fecha posterior de una operación retroactiva); el borrador se
  conserva y no se ofrece override.
- **Sesión expirada:** se conserva el borrador y se pide reautenticar sin exponer datos.
- **Respuesta antigua:** no sustituye un Instrumento, Saldo o fecha elegidos después.
- **Anulada:** se muestra como anulada y no computa; no se ofrece rectificarla.
- **Valoración no disponible:** etiqueta y motivo; nunca 0 ni «sin resultados» ambiguo.
- **Cobertura parcial:** siempre visible en listado y ficha; no se presenta como posición
  completa ni se completa con datos no registrados.

## 11. Validation and edge cases

- **Nombre:** obligatorio, no vacío, 1–120 caracteres, sin caracteres de control; se
  conserva el valor literal; renombrar no cambia ID ni enlaces.
- **ISIN:** vacío/NULL permitido; si existe, exactamente 12 caracteres ASCII `[A-Z0-9]`,
  normalizados a mayúsculas y sin espacios de borde (los espacios interiores no son válidos),
  evidencia de 1–200 caracteres y unicidad normalizada. No se valida el dígito de control ni
  se declara validez registral. No se deduce del nombre ni se rellena solo.
- **Búsqueda por ISIN:** el término se recorta en bordes y se compara en mayúsculas contra el
  ISIN normalizado; una consulta de 12 caracteres se compara por igualdad y el resto por
  nombre. La búsqueda por nombre es por subcadena sin distinguir caja ni tildes. `%` y `_` se
  tratan como literales, nunca como comodines SQL. Un ISIN con espacios interiores no
  coincide.
- **Divisa:** ISO 4217 de tres letras mayúsculas; EUR se trata como 1; no se aceptan símbolos
  ni importes con separadores ambiguos. `US`, `USDD`, `usd` o `EURO` devuelven 422 sin
  escritura. La UI admite coma decimal española y la API punto. `divisaReferencia` sigue la
  misma regla y no obliga la divisa de la Compra.
- **Fecha:** civil válida, incluido bisiesto; no se desplaza por huso; no futura. «No futura»
  se decide con `spanishToday` (día civil `Europe/Madrid`) en el servidor: a las 23:30Z el
  día civil español ya puede ser el siguiente. No se usa el reloj ni la hora del cliente como
  fecha económica.
- **Cantidad/precio:** estrictamente positivos; cero, negativos, NaN, infinito y exponentes
  rechazados; escala máxima 8/6 respectivamente y entero escalado dentro de `1..=2⁵³−1`
  (§6), rechazando el exceso sin redondeo. En el límite se acepta. Este rango es un límite de
  entrada: el cálculo interno de `cantidad×precio×cambio` usa `BigInt` de precisión
  arbitraria y no se recorta a 2⁵³ ni a 64 bits.
- **Cambio:** obligatorio y positivo si la divisa no es EUR; escala máxima 6 y mismo rango de
  magnitud de entrada; para EUR no se exige y se trata como 1; si se informa para EUR, solo
  `1` (`"1.000000"`) es válido; no se completa con un cambio actual.
- **Importe EUR:** positivo, céntimos exactos; sin float. Una diferencia con
  `cantidad×precio×cambio` se conserva y se muestra como informativa, no se corrige sola.
- **Comisión:** no negativa, en EUR, dos decimales, `<= importe EUR`, ya incluida en el
  importe cargado; nunca se suma ni se resta otra vez. Sin comisión = 0 explícito o NULL, sin
  doble efecto. Una comisión con 3 decimales (`"5.001"`) devuelve 422 sin escritura.
- **Concepto y nota:** opcionales; hasta 2000 caracteres cada uno y sin caracteres de control;
  2000 se acepta y 2001 se rechaza con 422 sin escritura.
- **Saldos:** ambos existentes, activos y de Tipo/Control elegible; no iguales. Un Saldo
  inactivo no se ofrece; un ID de otro Tipo/Control se rechaza. `Efectivo`/`Movimientos` no
  es elegible como efectivo de inversión. Varios Saldos de efectivo de inversión se ofrecen
  por separado y la selección es obligatoria.
- **Efectivo:** bloqueo si el mínimo del saldo corriente desde la fecha es negativo,
  incluida la ventana posterior de una retroactiva; el rechazo es 422 `INSUFFICIENT_CASH`;
  hechos del mismo día agregados a fin de
  día (§4.3.2); no se impone un mínimo general a las aperturas; la fórmula no filtra por
  Fecha apertura. Una Compra no altera `Efectivo`/`Movimientos`.
- **Estado:** Activa/Inactiva para Instrumento; Vigente/Anulada para Compra. Sin DELETE
  (404 sin escritura). Reactivar no crea Compras; anular no borra. Desactivar/reactivar/anular
  exigen `revision` y `motivo`; una revisión obsoleta devuelve 409 `REVISION_CONFLICT`.
- **Rectificación:** solo sobre Vigente; revisión y motivo obligatorios; reemplazo completo
  de fecha, cantidad, precio, divisa, cambio, importe, comisión, concepto y nota; campo
  omitido se rechaza; `null` solo limpia nullable; Instrumento y Saldos se rechazan con 422.
  Anular dos veces se rechaza.
- **Duplicados:** el mismo Instrumento puede tener varias Compras el mismo día; no se impone
  unicidad de compra. El ISIN duplicado normalizado se rechaza y enlaza al existente.
- **Concurrencia:** dos altas simultáneas no duplican intento ni dejan efectivo negativo; si
  la segunda ya no alcanza, devuelve 422 `INSUFFICIENT_CASH`; una revisión obsoleta devuelve
  409 `REVISION_CONFLICT`; una huella de **Movimiento** obsoleta, 409 `IMPACT_CHANGED` (las
  rutas de Compra no usan huella). Ningún caso usa un 409 genérico por el mero hecho de ser
  concurrente.
- **Integridad de lectura:** una Compra con referencias ausentes se muestra como incidencia
  «Revisar», sin reparar ni borrar; no se computa como posición válida.
- **Sin datos reales:** los fixtures son deterministas y ficticios; no se importa Excel ni
  se publican importes personales.

## 12. Exclusions

- Sin tipos nuevos de Movimiento y sin Gasto/Compra en Movimientos.
- Sin Ventas, posiciones cerradas, cantidades negativas ni resultado (E4.2/E4.3).
- Sin integración de las fechas de Compra en la referencia temporal compartida; pertenece a
  E4.2-AC3.
- Sin valoración automática, cotizaciones, valor manual, rentabilidad ni comparación de
  mercado (E4.3).
- Sin dividendos, splits, ampliaciones, fiscalidad, retenciones ni comisiones bancarias
  distintas de la comisión de la operación.
- Sin maestro de bróker, mercado, tipo de activo, ticker ni país; sin cambiar la semántica de
  Saldos. El guard de impacto de §4.1/§8 solo impide cambiar cinco campos de un Saldo que ya
  tiene Compras; no crea maestros ni reglas nuevas de Saldos.
- Sin importación, histórico, migración real, datos personales ni Excel. DT7
  (mapping/importación por campo, ID, apertura y archivo, corte y excepciones) se aplaza
  expresamente a E4.5/E4.12; E4.1 no lo anticipa ni promete mapping.
- Sin ejecución de Presupuesto, Partida, Referencia, Ciclo, Deuda ni cierre.
- Sin fotos, bloqueo de cierre (E4.8–E4.11) ni despliegue. No se añade un mecanismo de
  backup nuevo; el backup/restore existente debe versionar y restaurar las tablas nuevas.
- Sin alertas, recordatorios, exportaciones ni automatizaciones externas.
- Sin autenticación, permisos ni componentes visuales nuevos; se reutiliza E1.
- Sin ampliar el contrato de cambio de Estado de un Saldo de E1.1: conserva su cuerpo aprobado
  (`revision` únicamente) y no añade un `motivo` humano. Esa extensión, si se quisiera, se
  tramitaría aparte como cambio de E1.1 y no forma parte de E4.1 (exclusión N9).
- Sin campo formal de enlace entre una Compra anulada y su reemplazo: la trazabilidad es el
  `motivo` textual y la auditoría de ambas operaciones (N10).
- Sin cambios en `audit`, en el motor de `Efectivo`/`Movimientos` ni en R6 más allá de hacer
  disponible una posición antes pendiente y respetar los flags existentes.

## 13. Acceptance checks

Todos los criterios están **aprobados como contrato de diseño rev7** y la rev8 solo ajusta la
versión de esquema y las rutas de migración; ninguno declara un resultado ejecutado ni un PASS. Ninguno depende de una respuesta pendiente ni de una
condición abierta: cada resultado es determinista con las decisiones confirmadas de §3 y las
correcciones de §3.1. «Sin escritura» significa que no cambian Compra, efectivo, cantidad,
contador ni auditoría. Los códigos esperados se fijan por caso y no se solapan: 404
`NOT_FOUND` para recurso/ruta inexistente (incluido `DELETE`); 409 `REVISION_CONFLICT` para
`revision` obsoleta; 409 `IMPACT_CHANGED` para huella/contexto de **Movimiento** obsoleto
(no para rutas de Compra); 409 `HISTORY_LOCKED`
para el guard de impacto de Saldo; 422 `VALIDATION` para validación de campos; 422
`INSUFFICIENT_CASH` para suficiencia, incluida la recalculada; 422 `INSUFFICIENT_UNITS`
para la invariante de cantidad de la enmienda D7; 401/403 para acceso o CSRF. No
existe un 409 ni un 422 genéricos, y la suficiencia nunca se reporta como 409. Los AC marcados
**(integración/regresión)** —AC-38, AC-39, AC-40, AC-41, AC-42, AC-49 y AC-53— verifican contratos
previos o consumidores y no cuentan como funcionalidad nueva de E4.1. Total: 54 AC
aprobados (47 funcionales de E4.1 y 7 de integración/regresión), más **AC-55** propuesto en
la enmienda D7; si se aprueba, la matriz pasará a 55 AC (48 funcionales y 7 de
integración/regresión). AC-33 incluye los contratos v14, v15, v16 y v17 y la revalidación de la versión
destino; su apartado (h) es una comprobación pre-DEV, no una migración ejecutada.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| E4.1-AC-01 | Alta de Instrumento con nombre y sin ISIN; nombre de 121 caracteres; `divisaReferencia="EURO"` | `Ixxx` nuevo, único e inmutable, estado Activa; en una base sin Instrumentos el primer ID es `I1001`; nombre 1–120 persistido literal; ISIN, evidencia y `divisaReferencia` NULL o ISO 4217; el nombre largo y la divisa inválida devuelven 422 sin fila; aparece en listado; no se crea Movimiento ni cambia efectivo o cantidad |
| E4.1-AC-02 | Alta con ISIN y evidencia; alta con ISIN sin evidencia; ISIN en minúsculas; ISIN con espacio interior; evidencia de 201 caracteres | Con evidencia se guarda normalizado a mayúsculas y la ficha lo muestra; sin evidencia, con espacio interior o con evidencia fuera de 1–200 se rechaza 422 sin Instrumento parcial; la comprobación es solo sintáctica (12 ASCII `[A-Z0-9]`) y no se declara validez registral |
| E4.1-AC-03 | Dos altas con el mismo ISIN normalizado, variando mayúsculas y espacios de borde | La segunda devuelve 422 con enlace al `Ixxx` existente; no hay fusión ni sobrescritura; dos altas concurrentes del mismo ISIN producen un solo Instrumento |
| E4.1-AC-04 | Dos Instrumentos con el mismo nombre | Permitido: dos IDs distintos, sin fusión ni sobrescritura; el nombre no es clave |
| E4.1-AC-05 | Renombrar un Instrumento con Compras | Conserva `Ixxx`, Compras, posiciones e historial; exige `revision` y `motivo`; `instrumento_audit` registra revisión, motivo, actor, UTC y JSON antes/después; sin motivo → 422 |
| E4.1-AC-06 | Editar ISIN y evidencia de un Instrumento con Compras | Se guarda con `revision` nueva, `motivo` y auditoría dedicada; se revalida la unicidad normalizada; las Compras conservan sus datos económicos y el efectivo/cantidad no cambian |
| E4.1-AC-07 | Desactivar con `revision`/`motivo`, consultar, intentar nueva Compra, reactivar y repetir con revisión obsoleta; intentar DELETE | Inactivo no seleccionable y rechazado por API con 422 `VALIDATION`; historial y posiciones visibles; reactivar permite nuevas Compras; revisión obsoleta → 409 `REVISION_CONFLICT` sin escritura; DELETE → 404 `NOT_FOUND` sin escritura; auditoría de desactivación y reactivación consultable |
| E4.1-AC-08 | Mismo Instrumento comprado en `S004` «Cartera de inversión demo» y `S006` «Cartera secundaria demo» (creado por el servicio) | Dos posiciones independientes por Saldo+Instrumento, cada una con su cantidad y compras; no se suman en una posición única ni se mezclan |
| E4.1-AC-09 | Compra en EUR sin comisión; misma compra EUR con `cambio="1.000000"`; otra con `cambio="1.100000"` | Las dos primeras se guardan con cantidad, precio, divisa EUR e importe; el efectivo baja exactamente una vez por el importe y la cantidad sube; `cambio` distinto de 1 en EUR → 422 sin escritura; no hay Movimiento |
| E4.1-AC-10 | Compra en divisa ficticia con cambio histórico | Se conservan cantidad, precio, divisa, cambio e importe EUR; el efectivo baja una vez por el importe EUR; no hay Movimiento |
| E4.1-AC-11 | Registrar después otra Compra con un cambio distinto | La Compra anterior, el efectivo y la cantidad no cambian; no se recalcula el hecho con el cambio nuevo |
| E4.1-AC-12 | Compra con comisión en EUR ya incluida en el importe; comisión mayor que el importe; comisión negativa | La válida se registra con desglose y el efectivo baja exactamente por `importeEur`, no por `importeEur + comisionEur`; las otras dos se rechazan con 422 sin escritura; no hay doble efecto |
| E4.1-AC-13 | Importe EUR distinto de `cantidad×precio×cambio` | Se conserva el importe observado como fuente de verdad; se muestra la diferencia como informativa; no se sobrescribe, corrige ni redondea |
| E4.1-AC-14 | Cantidad con 9 decimales, precio o cambio con 7; valores en el límite 8/6/6; EUR con céntimos | Exceso rechazado con 422 en API y por la persistencia, sin fila ni redondeo; el límite de escala se acepta; el EUR se guarda exacto en céntimos, sin float |
| E4.1-AC-15 | Fecha futura, fecha inválida, 29 de febrero bisiesto y fecha pasada válida | Futuro e inválida rechazadas con 422; bisiesto y pasado aceptados; la fecha civil se conserva literal sin desplazamiento por zona ni sustitución por hoy |
| E4.1-AC-16 | Compra que a su propia fecha dejaría el efectivo negativo | 422 `INSUFFICIENT_CASH` sin escritura, con `disponible`, `necesario`, `minimo` y `fecha`; no hay override; aperturas y hechos existentes no cambian; nunca 409 |
| E4.1-AC-17 | Instrumento o Saldo inexistente/inactivo; Saldo de tipo incorrecto; efectivo = inversión; `Efectivo`/`Movimientos` como efectivo | 422 con motivo; sin Compra, sin movimiento de efectivo/cantidad y sin auditoría de éxito |
| E4.1-AC-18 | Fallo inyectado tras reservar ID o antes de auditar | Rollback completo: sin Compra, sin cambio de efectivo/cantidad, sin contador consumido y sin auditoría parcial |
| E4.1-AC-19 | Reintento con la misma idempotency-key y payload; luego payload distinto | Un solo hecho y un solo cargo en el primer caso; conflicto sin segunda Compra en el segundo |
| E4.1-AC-20 | (a) Dos altas concurrentes donde el segundo cálculo de suficiencia ya no alcanza; (b) dos peticiones con revisión desactualizada; (c) una confirmación de un Movimiento previsualizado con huella/contexto desactualizado | (a) una sola Compra válida y la otra 422 `INSUFFICIENT_CASH` por suficiencia recalculada, sin negativo; (b) una escritura válida y la otra 409 `REVISION_CONFLICT`; (c) 409 `IMPACT_CHANGED` sin escritura; cada respuesta lleva solo el código de su causa, sin 409 genérico por concurrencia; nunca doble cargo ni efectivo negativo. Las rutas de Compra no transportan huella y no emiten `IMPACT_CHANGED`: usan `revision`. |
| E4.1-AC-21 | Listado con `saldo` (ambas columnas), `saldoEfectivo`, `saldoInversion`, fechas, Estado y paginación; búsqueda por ISIN con minúsculas y por nombre | `saldo` devuelve compras cuyo efectivo o inversión coincide; los específicos estrechan a una columna; filtros/página estables; vigentes por defecto y anuladas consultables; sin filas ajenas; la búsqueda normalizada encuentra el ISIN y `%`/`_` son literales |
| E4.1-AC-22 | Consultar ficha/posición de un Instrumento | Cantidad = suma de Compras vigentes; sin Ventas; sin valor actual, resultado ni rentabilidad; «No disponible hasta E4.3», no 0; cobertura parcial declarada |
| E4.1-AC-23 | Consultar efectivo del bróker (`S003`), posición de inversión (`S004`) y la posición de `Efectivo`/`Movimientos` (`S001`) antes y después de una Compra | Efectivo = apertura + entradas − salidas − compras + ventas (ventas 0 estructural); se muestra separado de la cantidad y no se suma como inversión; `S004` sigue «No disponible hasta E4.3» sin 0; `S001` no cambia por la Compra; Ventas se declara no instalada |
| E4.1-AC-24 | Crear, rectificar y anular Compras y consultar la referencia temporal | El máximo de la referencia temporal no cambia por las Compras; la fuente Inversión se declara «pendiente hasta E4.2» (E4.2-AC3); no se usa el reloj ni se inventa una fecha |
| E4.1-AC-25 | Rectificar una Compra vigente con payload completo; repetir con `revision` obsoleta y omitiendo `precio` | Vista de impacto con efectivo y cantidad antes/después; `motivo` y `revision`; escritura atómica y auditoría; posiciones recalculadas; el payload debe incluir todos los campos rectificables; la `revision` obsoleta devuelve 409 `REVISION_CONFLICT` y el campo omitido 422 `VALIDATION`, ambos sin escritura |
| E4.1-AC-26 | Anular una Compra con `revision` y `motivo`; repetir la anulación con la revisión ya vigente; usar revisión obsoleta | El registro se conserva como Anulada, deja de computar y no se borra; la segunda anulación devuelve 422 `VALIDATION` por Estado no elegible y la revisión obsoleta 409 `REVISION_CONFLICT`, ambas sin escritura; auditoría `anulación` consultable |
| E4.1-AC-27 | Crear, rectificar y anular Compras; comparar Movimientos y Presupuesto | El número de Movimientos no cambia; no se crea Gasto/Compra; no hay Partida, Referencia ni ejecución presupuestaria |
| E4.1-AC-28 | Transferir efectivo al bróker y después comprar | La Transferencia y la Compra son hechos distintos; cada uno afecta al efectivo una vez; ninguno crea el otro |
| E4.1-AC-29 | Acceder sin sesión, sin CSRF/Origin y provocar error interno | 401/403 según corresponda; sin escritura; errores sin SQL, importes, tokens ni payload; no hay DELETE ni rutas de fixtures |
| E4.1-AC-30 | Recorrer listado, ficha, alta, pestaña Compras (W7/W8) e impacto/rectificación/anulación (W9/W10) a 390 y 1440 con teclado; comprobar el filtro de Estado y el alcance de W8/W10 | Flujos operables, foco visible y devuelto al aviso, etiquetas asociadas, sin overflow; tema claro; borrador conservado; botones deshabilitados sin motivo o con revisión obsoleta; en W1/W4 «Todos» muestra la fila Inactiva `I1003` y «Activos» la oculta; W8 declara «Todas (3)» y muestra la Anulada solo con «Ver»; W9 y W10 cubren rectificación y anulación; capturas ficticias inspeccionadas |
| E4.1-AC-31 | Provocar vacío, carga, error de fuente, 409 y sesión expirada | Estados distintos y accionables; «No disponible» con motivo; nunca 0 ficticio; no se pierde el borrador ni la selección |
| E4.1-AC-32 | Inspeccionar IDs y `instrumento_audit`/`operacion_inversion_audit` tras alta, edición, desactivación, rectificación y anulación; intentar `UPDATE`/`DELETE` sobre ambas tablas | IDs `Ixxx` y de Compra únicos e inmutables; una fila por revisión con actor, UTC, motivo y JSON `anterior`/`posterior`; los triggers abortan modificaciones; la tabla `audit` existente no cambia; sin DELETE |
| E4.1-AC-33 | (a) actualizar una base 13 a 18 sin tablas v14/v15/v16/v17; (b) verificar el manifiesto histórico `C14-COMPARTIDOS-FCE1107` y rechazar su v14; (c) verificar `C14-VEHICULOS-C69E343` y subir su fixture v14 a 18; (d) verificar `C15-COMPARTIDOS-AD2EDFE` y subir su fixture v15 a 18; (e) verificar `C16-REVISION-COMIDA-26B6F0C` y subir su fixture v16 a 18; (f) verificar el contrato D5 `C17-D5-CF6954A` (145 objetos, SHA-256 `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`, `cf6954a`) y subir su fixture v17 con filas sintéticas de D5, Compartidos, Revisión de Comida y Vehículos a 18, comprobando `movimiento_compartido`, índices, triggers y filas reconstruidas de `movimientos`/auditorías; (g) intentar abrir variantes v14/v15/v16/v17 desconocidas o incompletas; (h) abrir una base 19; (i) gate con main 18+, 18 ocupada, main 14/15/16/17 no verificado, C16/C17 no canónicos, sin manifiestos o worktree en 18; (j) inspeccionar rutas 13/14/15→18, 16→17→18 y 17→18, compuertas y restore 13/14/15/16/17 verificada/18 | (a) 13→18 por progresión canónica 13→14→15→16→17→18, conserva filas y crea vacías las tablas heredadas que falten; (b) histórico v14 rechazado sin mutar; (c) C14V preservado y 14→18 conserva Vehículos; (d) C15 preservado y 15→18 conserva Compartidos; (e) C16 preservado y 16→17→18 conserva Revisión de Comida; (f) C17 coincide (145 objetos/hash) y 17→18 preserva D5, `movimiento_compartido` y sus índices/triggers, las seis tablas reconstruidas (`movimientos`, `movement_audit`, `movimiento_anticipo`, `payroll_allocations`, `revision_comida`, `revision_comida_audit`), el `CHECK` D5 de Transferencia, Compartidos, Revisión de Comida, Vehículos, `referencias`, auditorías, identidad (`database_origin`/`owner`/`key_hash`), contadores y filas, sin reejecutar 14→15/15→16/16→17; (g) variantes desconocidas/incompletas rechazadas antes de `BEGIN IMMEDIATE`/`journal_mode`/DDL/backup/`schema_version` con literal v14/v15/v16/v17 y sin escribir; (h) v19 rechazada antes de mutar; (i) gate STOP si main 18+, 18 ocupada, main 14/15/16/17 no verificado, C16/C17 no canónicos, faltan manifiestos o hay worktree en 18; (j) E4.1 17→18 aditivo sin `DROP`/`ALTER` destructivo; migraciones 14→15/15→16/16→17 son de main; `database-identity.ts` `1..18`, `database-schema.ts` `[1..17, version]`, `backup.ts` `1..18`, etiqueta `e4.1-v18` (origen D5 `e3.2-d5-v17`); restore verifica el manifiesto de la versión de la copia (C14V/C15/C16/C17; 13 solo integridad), copias 13-17 verificadas conservan su esquema, copia desconocida no se publica, copia 18 recupera Instrumentos/Compras/auditorías y vacía sesiones/desafíos/intentos; todas las rutas conservan datos, identidad, auditorías, referencias, contadores e integridad; rollback íntegro |
| E4.1-AC-34 | Simular error de la fuente de Compras/efectivo (tabla ilegible o consulta fallida) | La UI muestra «No disponible» con la causa concreta («No se pudo leer el registro de Compras»/«No se pudo calcular el efectivo») y conserva identidad/filtros; no presenta 0, no repara y no permite guardar una rectificación que presuma integridad |
| E4.1-AC-35 | Compra retroactiva que deja negativo un saldo posterior (entrada/salida vigente después de la fecha) y hechos del mismo día (apertura 1.000,00; entrada 100,00 y Compra 1.050,00 el 2026-02-10; repetir con 1.150,00) | 422 `INSUFFICIENT_CASH` sin escritura con `disponible`, `necesario`, `minimo` y la fecha del mínimo posterior; aperturas y hechos intactos; la retroactiva que no deja ningún saldo posterior negativo se acepta; con 1.050,00 el cierre del día es 50,00 y se acepta, con 1.150,00 se rechaza con fecha 2026-02-10 y mínimo −50,00, sin depender del orden de captura |
| E4.1-AC-36 | Editar la divisa de referencia de un Instrumento con Compras en divisa no EUR | Solo cambia el dato de presentación del maestro con auditoría; las Compras conservan divisa, cambio, precio, importe EUR y comisión; efectivo y cantidad no cambian |
| E4.1-AC-37 | Abrir listado y ficha con posiciones calculadas | Se declara «Posición calculada solo con las compras registradas; no incluye histórico anterior no importado»; no se presenta como posición completa; no se rellena con 0 ni con datos no registrados |
| E4.1-AC-38 (integración/regresión) | Consultar `GET /api/saldos/S003` y `GET /api/inversiones/efectivo?saldo=S003` sin `fecha`, y con `fecha` | Sin `fecha` ambas respuestas dan la misma cifra al céntimo, calculada por el mismo motor y sin diferencias de redondeo; con `fecha` la respuesta se etiqueta como corte de suficiencia y declara que no es la cifra actual; ninguna de las dos escribe |
| E4.1-AC-39 (integración/regresión) | Ejecutar `flujo-mensual` con `S003` en `liquidez=1` (posición no nula: apertura ficticia de 3.200,00 y una Compra vigente de 1.389,60), después `liquidez=0` y después `liquidez=NULL`; registrar además una Compra válida con efectivo `S003` e inversión `S004` y comparar `S001` antes/después | Con `=1`, `liquidez.incluidos` contiene `S001` y `S003` con su posición, `excluidos` no contiene `S003`, `metrics.liquidez.estado` es `Verificado`, `metrics.liquidez.subtotal` es `null` y `metrics.liquidez.valor` es exactamente la posición de `S001` + la posición de `S003` (1.810,40 en el fixture); `metrics.liquidez.motivo` contiene «Cobertura histórica no importada: la posición de inversión solo incluye Compras registradas en la aplicación» y la UI de Liquidez muestra la nota; con `=0` no se incluye y el valor es solo `S001`; con `NULL` sigue en `excluidos` con «Liquidez sin informar», `metrics.liquidez.estado = "Parcial"` y `metrics.liquidez.subtotal` de `S001`; la Compra válida no altera la posición ni el número de Movimientos de `S001` (`Efectivo`/`Movimientos`); la regresión de `apps/api/src/flujo-mensual.test.ts` se actualiza a este oráculo único |
| E4.1-AC-40 (integración/regresión) | Consultar `GET /api/saldos/S004` y el endpoint de efectivo para `S004` (debe rechazarlo); previsualizar una Transferencia sobre `S004` | `S004` (`Inversión`/`Inversiones`) sigue con `posicion.importe = null`, condición `pendiente_motor` y motivo de valoración pendiente hasta E4.3; el endpoint de efectivo devuelve 422 y no una cifra; la previsualización no inventa el extremo posterior y declara la valoración como pendiente |
| E4.1-AC-41 (integración/regresión) | Previsualizar un Gasto y un Ingreso sobre `S003`, una Transferencia `S001 → S003` y `S003 → S001`, y una Amortización de deuda desde `S003` (`POST /api/movimientos/impacto`); comparar tablas, contadores y auditoría antes/después. Precondiciones de ejecutabilidad, en este orden: (1) partir de un `S003` **sin Movimientos y sin Compras** y fijar `permiteSalidaExterior=true` **antes** de que tenga cualquier Compra (con Movimientos previos, el guard E1.1 de `saldoHasEconomicUse` también bloquearía el cambio con 409; después de una Compra lo bloquea el guard de AC-42); (2) crear después las Compras del fixture; (3) Partida activa con ancestros activos para Gasto y Amortización; (4) Subtipo válido para el Ingreso; (5) para la Amortización, Partida ligada a una Deuda activa | En los cuatro tipos el extremo del Saldo de prueba utilizado (`S003`) se calcula con el motor de efectivo (antes y después), con el hecho propuesto aplicado o retirado; ninguna previsualización devuelve 422 `EXTERIOR_PERMISSION`, `DEBT_REQUIRED`, `INACTIVE_DEBT`, `INACTIVE_CLASSIFICATION` ni un error de Subtipo por precondición; la lista de pendientes ya no afirma que falta el motor de efectivo de inversión y sí declara la valoración de E4.3; el impacto no escribe, no reserva ID y no crea auditoría |
| E4.1-AC-42 (integración/regresión) | Con una Compra vigente y otra anulada que usan `S003`: intentar cambiar `tipo`, `control`, `saldoApertura`, `fechaApertura` y `permiteSalidaExterior`; después desactivar y reactivar; cambiar solo el nombre | Los cinco cambios devuelven 409 `HISTORY_LOCKED` sin escritura y con el hecho intacto; desactivar/reactivar con `revision` funcionan y conservan las Compras; el nombre sí se puede cambiar; la auditoría existente del Saldo refleja solo los cambios permitidos |
| E4.1-AC-43 | Consultar `GET /api/instrumentos/{Ixxx}/auditoria` y `GET /api/compras/{id}/auditoria` tras alta, edición, desactivación, rectificación y anulación; consultar un ID inexistente | Cada consulta devuelve las revisiones ordenadas con acción, motivo, actor, instante UTC y JSON `anterior`/`posterior`; una anulación muestra `posterior` con estado Anulada; ID inexistente → 404; ambas son de solo lectura y no alteran `audit` |
| E4.1-AC-44 | Registrar con reloj fijo `2026-01-15T23:30:00Z`, `2026-01-16T00:30:00Z`, `2026-07-15T22:30:00Z`, `2026-03-29T00:30:00Z` y `2026-10-25T00:30:00Z` | La fecha máxima admitida es el día civil `Europe/Madrid` calculado con `spanishToday`: 16/01/2026, 16/01/2026, 16/07/2026, 29/03/2026 y 25/10/2026 respectivamente; el día siguiente devuelve 422; la fecha guardada es la civil enviada, sin conversión de huso |
| E4.1-AC-45 | Rectificar omitiendo `precio`; enviando `null` en `comisionEur`, `concepto`, `nota` y `cambio` (EUR); enviando `null` en `importeEur`; incluyendo `instrumento` o `saldoInversion` | La omisión devuelve 422 con el campo; los `null` nullable limpian el valor y el `null` en `importeEur` se rechaza; incluir Instrumento/Saldos devuelve 422 sin escritura; una rectificación válida guarda revisión nueva y auditoría |
| E4.1-AC-46 | Rectificar al alza una Compra que deja negativo un saldo posterior; rectificar a un importe válido; rectificar moviendo la fecha hacia atrás; repetir con dos hechos del mismo día en distinto orden de captura; repetir la rectificación con `revision` obsoleta | La primera devuelve 422 `INSUFFICIENT_CASH` con `disponible`, `necesario`, `minimo` y `fecha` del mínimo posterior, sin escritura; la válida se acepta y recalcula efectivo/cantidad; el resultado de la convención de fin de día es idéntico en ambos órdenes de captura; la `revision` obsoleta devuelve 409 `REVISION_CONFLICT` sin escritura |
| E4.1-AC-47 | Anular una Compra y crear otra con distinto Instrumento y/o Saldos, con el mismo `motivo` textual (no existe campo formal de enlace) | La original queda Anulada y sale de efectivo y posición; la nueva computa en sus propios Saldos e Instrumento; ambas conservan auditoría; se localizan por fecha y estado en el listado y por `motivo` en la auditoría; no se reescribe la identidad de la original ni se crea un vínculo persistido entre ambas |
| E4.1-AC-48 | Escenario con 0, 1 y N Saldos `Efectivo`/`Inversiones` activos (el segundo creado por el servicio); consultar `/api/instrumentos/opciones` | `saldosEfectivo` y `saldosInversion` se devuelven como listas separadas y sin preselección; con 0 el alta se bloquea y explica el motivo; con 1 el selector de efectivo sigue vacío y es obligatorio; con N se listan todos con su cifra, sin agregado, y la Compra exige uno explícito; el listado del módulo muestra una línea por Saldo |
| E4.1-AC-49 (integración/regresión) | Desactivar un Saldo con Compras y consultar efectivo, posición, listado y selectores; reactivar | El efectivo y la posición siguen incluyendo sus Compras y son consultables; no aparece en los selectores de nueva Compra; reactivar lo recupera conservando Compras; el agregado de Liquidez mantiene su filtro de Estado Activa |
| E4.1-AC-50 | Registrar cantidad `90071992.54740991`, precio `9007199254.740991` y cambio `9007199254.740991`; después un valor una unidad escalada por encima en cada campo | Los valores del límite se aceptan y se persisten exactos, sin pérdida de decimales; cada valor por encima devuelve 422 sin fila y sin redondeo; ningún cálculo usa `number` para estos valores |
| E4.1-AC-51 | Calcular la referencia de una Compra con cantidad `90071992.54740991`, precio `9007199254.740991` y cambio `1.000000`, cuyo producto exacto supera 2⁵³ y cuya representación escalada supera un entero de 64 bits; comparar con el valor exacto y con otro producto que quepa en el rango de entrada | El producto se calcula con precisión exacta y sin desbordamiento, truncamiento ni saturación; la referencia se muestra redondeada a céntimos solo para visualización; el cálculo interno no se recorta al límite de entrada `2⁵³−1` ni a 64 bits, y el límite por campo sigue rechazando 422 por encima |
| E4.1-AC-52 | Invocar `POST /api/compras/impacto`, `POST /api/compras/{id}/impacto`, `POST /api/compras/{id}/impacto-anulacion` y los GET de listado, ficha, auditoría, efectivo y opciones; comparar tablas, contadores, revisiones y auditoría antes/después | Ninguna ruta escribe: no hay filas nuevas ni modificadas en `instrumentos`, `operaciones_inversion`, tablas de auditoría o intentos; los contadores no se mueven, no se reserva ID y las revisiones no cambian; las respuestas de impacto son solo lectura |
| E4.1-AC-53 (integración/regresión) | Previsualizar un Gasto sobre `S003`; registrar una Compra en `S003` que cambie su efectivo; confirmar el Movimiento con el `contextRevision` y la huella de la vista previa. Repetir con una previsualización de Gasto sobre `S001` (`Efectivo`/`Movimientos`, sin Compras) y una Compra en `S003` | La confirmación devuelve 409 `IMPACT_CHANGED` —no `REVISION_CONFLICT`, porque la `revision` del Movimiento no cambió— sin escribir el Movimiento; el efectivo refleja solo la Compra registrada; el borrador se conserva y, tras recalcular la vista previa, la confirmación es válida. El caso ajeno también devuelve 409 `IMPACT_CHANGED` sin escritura: se registra como sobre-invalidación segura de la huella global, no como defecto, y la confirmación tras recalcular es válida |
| E4.1-AC-54 | Alta o rectificación con `concepto` y `nota` de 2000 y de 2001 caracteres; `divisa` `US`, `USDD` y `usd`; `comisionEur` `5.001` | 2000 se acepta y persiste literal; 2001, cada divisa inválida y la comisión con 3 decimales devuelven 422 con el campo señalado, sin escritura ni redondeo |
| E4.1-AC-55 (enmienda D7, propuesta) | Con Ventas vigentes: rectificar a la baja una Compra por debajo de la cantidad vendida; anular una Compra ya consumida por una Venta posterior; mover la fecha de una Compra hacia delante dejando una Venta en el hueco; repetir con una rectificación válida; repetir sin Ventas; probar ambos órdenes de captura del mismo día | Los tres casos inválidos devuelven 422 `INSUFFICIENT_UNITS` con `disponible`, `necesario`, `minimo`, `fecha`, `saldoInversion` e `instrumento`, sin escritura, sin auditoría de éxito ni ID consumido; la válida se acepta y recalcula la cantidad; sin Ventas no aparece un rechazo nuevo; el resultado es idéntico en ambos órdenes de captura (DT2); si también falla el efectivo, el código es `INSUFFICIENT_UNITS` |

## 14. Trazabilidad a los criterios del roadmap

| Criterio del roadmap | AC de esta especificación | Cómo se demuestra |
| --- | --- | --- |
| E4.1-AC1: registro solo en operaciones de inversión, nunca Gasto/Compra en Movimientos | AC-09, AC-10, AC-27, AC-28, AC-41, AC-52 | Comparar tablas Movimientos, Presupuesto, Compra, efectivo y `flujo-mensual` antes/después de alta, rectificación y anulación; la financiación es una Transferencia independiente y su previsualización no escribe. |
| E4.1-AC2: cash de bróker y saldo de inversión distintos, Ixxx/ISIN con evidencia | AC-01, AC-02, AC-03, AC-04, AC-08, AC-17, AC-22, AC-23, AC-37, AC-38, AC-40, AC-48, AC-49 | Instrumento con ID/evidencia; posiciones por Saldo+Instrumento; efectivo separado de cantidad y no agregado; `S004` sigue sin valoración; varios Saldos de efectivo por separado; cobertura parcial declarada. |
| E4.1-AC3: preservar cantidad/precio/divisa/cambio histórico/EUR efectivo y comisiones aplicables | AC-10, AC-11, AC-12, AC-13, AC-14, AC-25, AC-26, AC-32, AC-35, AC-36, AC-43, AC-45, AC-46, AC-47, AC-50, AC-51, AC-54 | Leer la Compra después de un cambio actual, editar el maestro, rectificar con reemplazo completo y anular; comparar campos exactos, efectivo, cantidad, límites de entrada, cálculo interno y auditoría dedicada. |
| E4.2-AC1 (D7, extensión de integración) | AC-55 | Con Ventas vigentes, rectificar a la baja o anular una Compra y comprobar que la cantidad por `saldo_inversion + instrumento` nunca queda negativa; 422 `INSUFFICIENT_UNITS` sin escritura, también al mover la fecha hacia delante. |

Los AC de integración/regresión (AC-38, AC-39, AC-40, AC-41, AC-42, AC-49 y AC-53) se declaran
como tales en §13 y no amplían la funcionalidad de E4.1; AC-52 acredita que las vistas previas
y las lecturas no escriben.

Otras integraciones declaradas:

- **E1.1 AC-14 (guard de impacto).** E1.1 ya bloqueaba con 409 los cambios de `tipo`,
  `control`, `apertura`, `fechaApertura` y `permiteSalidaExterior` cuando existían
  Movimientos, y advertía de no fingir protección de fuentes no entregadas. E4.1 amplía la
  misma comprobación a las Compras (AC-42): es una extensión de integración, no una regla
  nueva de Saldos ni un cambio silencioso.
- **R6 (Liquidez).** E4.1 no reescribe R6: mantiene «Liquidez solo de saldos marcados» y el
  filtro de Estado Activa. Solo hace disponible una posición antes pendiente; por eso `S003`
  pasa a computar con su `liquidez=1` ya existente (AC-39). No se añade un total patrimonial
  ni se altera el significado de la métrica; la nota de cobertura histórica no importada
  acompaña al `motivo` y no cambia el estado `Verificado` del caso sin exclusiones.
- **E4.2-AC3:** integración de las fechas de inversión en la referencia temporal compartida.
  E4.1 no la implementa ni la promete (AC-24 y §4.6).
- **E4.3:** valoración, resultado y rentabilidad. E4.1 muestra «No disponible hasta E4.3» y
  `S004` conserva su condición pendiente (AC-40).
- **DT7 (mapping/importación).** Aplazado expresamente a E4.5/E4.12 (§5.2, §12); E4.1 no
  mapea campos, IDs, aperturas ni archivos, y no fija cortes ni excepciones. La desviación
  queda registrada y no se presenta como cumplimiento diferido implícito.
- Los AC se acreditan en el testplan: 48 PASS, 6 PARCIAL y 0 FAIL en DEV19 (v18), con CI Linux
  `40583217493` SUCCESS; la aprobación rev7/rev8 es del contrato de diseño.

## 15. Siguiente acción

SPEC19 rev10 está **aprobada por el usuario (2026-10-27)** con C16/C17 **congelados**; ver el
registro de congelación al inicio. Reconcilia el destino **18** con `main` `9977210` (D5/v17),
documenta `C17-D5-CF6954A` (145 objetos, SHA-256
`e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`) y mantiene íntegras las
decisiones funcionales de rev7/rev8. **DEV19 está implementado** sobre `main` `9977210`: el
código declara la 18, admite C16/C17 y ejecuta la cadena 16→17→18. El candidato `dd450de`
tiene CI Linux x86_64 SUCCESS y QA independiente PASS (48 PASS / 6 PARCIAL / 0 FAIL). La PR
#95 sigue en draft; no hay merge ni despliegue. Los residuales de cobertura AC-03/24/27/30/33/34
están declarados en el testplan.
