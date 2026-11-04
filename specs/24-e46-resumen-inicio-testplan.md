# 24 — E4.6 Resumen de inicio completo: Test plan

Status: **APROBADA documentalmente por el usuario el 2026-11-03 — DISEÑO DE PRUEBAS.**
Actualización 2026-11-04: la rama `feat/e46-inicio` contiene la composición de solo lectura
(A+B, `GET /api/resumen-inicio`) y la UI `/inicio` (bloque C). La matriz deja en **PASS local**
los AC con prueba concreta, incluidos AC-20, AC-21 y AC-27 (sesión expirada y error 500 con
intercepción de rutas). **AC-01 queda PARCIAL** solo por la cobertura por ítem de
Saldos/Ahorro/deuda aparte, que E1.1/E4.4 no publican; la justificación por campo está en la
spec. No se declara completo el DEV E4.6: faltan `--full`, QA independiente y aprobación de
merge.
Specification: [24-e46-resumen-inicio-specification.md](24-e46-resumen-inicio-specification.md)
Brainstorming: [24-e46-resumen-inicio-brainstorming.md](24-e46-resumen-inicio-brainstorming.md)
Base de contenido: `main` `024b348` (2026-11-03), esquema SQLite **v23**.
Rebase mecánico sobre `origin/main` `bb076f1` (incluye `a26fffb`, E3.6/DEV21); no reaudita el
contenido ni cambia el alcance.

**Nota de estado (2026-11-03):** Q1–Q12 están aprobadas en opción A. **Q3-B=A** mantiene E4.6
como solo lectura, sin almacén de meses objetivo/umbrales. **Q4=A** fija el ejercicio del coste
esencial en el año de `mesFinanciado`, incluso si el corte cae en el ejercicio siguiente.
`V-EJERCICIO`, AC-28 y `ejercicioOrigen` quedan aprobados documentalmente y se ejecutan en la
suite API de esta rama.

Antes de implementación, cada AC se mapea a entorno, caso positivo/negativo/límite y evidencia
esperada. El diseño aprobado documentalmente no se ejecuta ni declara PASS por inspección. Las
filas `BLOCKED` dependen de E4.3 o del consumo E3.6; la falta de configuración R6 solo afecta a
`minimoObjetivo`, no a `mesesCubiertos`.

## Estrategia

- **Fixtures sintéticas y deterministas.** Solo IDs e importes ficticios; nunca Excel, bases
  reales, datos personales, credenciales ni secretos.
- **Oráculo independiente.** Los importes esperados se calculan en una tabla separada del
  motor y del DTO; no se compara el motor consigo mismo. Las fuentes (`monthlyFlow`, `cashAt`,
  `listDeudasCompletas`, `annualEquivalent`) se usan como hechos, no como oráculo de la
  composición.
- **API/SQLite.** Extender la suite `apps/api` con un `resumen-inicio.test.ts` cuando el DEV
  esté autorizado. Comprobar DTO, códigos, cobertura, no escritura y snapshot.
- **Contrato de lectura.** Probar la composición, la degradación por fuente, la coherencia de
  revisiones y la ausencia de cálculos en el cliente.
- **UI.** Playwright real con MFA, 390/1440, capturas ficticias, teclado, foco y contraste.
  La revisión visual de implementación sigue pendiente.
- **Verificación canónica.** En el futuro candidato funcional:
  `python3.12 scripts/verify --base 024b348 --head <SHA>` y, cuando corresponda,
  `python3.12 scripts/verify --full`. En esta rama documental solo se ejecutan validaciones
  de estructura; no se ejecutan suites financieras por una especificación.
- **Registro.** PASS/FAIL/UNRUN/BLOCKED con comando, entorno, SHA y evidencia. No se declara
  PASS por inspección ni se reutiliza evidencia de otro candidato.

## Entornos previstos

| Entorno | Uso | Límite |
| --- | --- | --- |
| macOS local | Bun 1.4.3, Python 3.10+, Chromium/Playwright 1.64.1; iteración | No sustituye CI Linux |
| Linux CI | Ubuntu 24.04, Bun/age/Chromium preparados; full del SHA candidato | Gate final del DEV |
| Fixtures | Bases ficticias, MFA real local, sin datos personales | Nunca Excel, DB real, claves o VPS |
| Documental actual | `python3.12 scripts/validate-template`, `check-project`, `test-validator`, `git diff --check` | Solo estructura; no valida E4.6 |

## Fixture integrada E4.6 — diseñada, no ejecutada

Todos los datos son ficticios. El escenario se denomina `C007`, pero su **ID consumible por E2.6 es `7`** (el motor exige IDs numéricos) y así lo publica el DTO y sus enlaces; igual ocurre con `C008` → `8`. Inicia `2026-06-20`, está abierto y su corte efectivo es `2026-07-19`; `mesFinanciado` se deriva del inicio y es **`2026-07`**. No se fuerza el motor para obtener `2026-06`. Validación técnica 2026-11-04: `fundedMonth` y compra S003→S007 ejecutables con los contratos vigentes; la suite E4.6 sigue UNRUN sin DEV24.

### Saldos

| Saldo | Tipo / control | Estado | Liquidez | Finalidad | Bolsa | Posición / efectivo |
| --- | --- | --- | --- | --- | --- | --- |
| `S001` | Efectivo / Movimientos | Activa | Sí | — | No | `1200.00` |
| `S002` | Efectivo / Movimientos | Activa | Sí | Ahorro | No | `800.00` |
| `S003` | Efectivo / Inversiones | Activa | Sí | Inversión | No | `1456.40` (efectivo) |
| `S004` | Efectivo / Inversiones | Activa | No | Inversión | No | `500.00` (efectivo) |
| `S007` | Inversión / Inversiones | Activa | No | Inversión | No | posiciones `I1001`/`I1002` |
| `S005` | Efectivo / Movimientos | Activa | Sin informar | — | Sí | `250.00` |
| `S006` | Efectivo / Movimientos | Inactiva | Sí | — | No | `999.00` |
| `S000` | técnico | — | — | — | — | excluido del inicio |

### Posiciones de inversión (E4.2/E4.3)

| Instrumento | Saldo inversión | Cantidad | Tipo valoración | Valor EUR | Resultado |
| --- | --- | --- | --- | --- | --- |
| `I1001` Fondo índice demo | `S007` | `7.5` | Automática | `877.50` | `258.50` |
| `I1002` Acción demo | `S007` | `2` | Manual | `320.00` | `No disponible` |

Agregado E4.3 esperado: valoración **Completa** `1197.50`; resultado **Parcial 1/2** y
`resultadoEur: null` por la valoración manual.

### Deuda (E4.4)

| Deuda | Tipo | Estado | Capital pendiente | Cálculo |
| --- | --- | --- | --- | --- |
| `D001` | No hipotecaria | Activa | `720.00` | Calculable |
| `D002` | No hipotecaria | Activa | `300.00` | Calculable |
| `D003` | Hipotecaria | Activa | `50000.00` | Calculable, fuera del total |
| `D004` | Sin informar | Activa | `100.00` | Fuera del total |
| `D005` | No hipotecaria | Activa | `null` | Falta el capital de apertura; no calculable |
| `D006` | No hipotecaria | Inactiva | `400.00` | Excluida por estado |

Total no hipotecario esperado: `valor: null`, `subtotal: 1020.00`, cobertura `2/3`.

### Ciclo y presupuestos

| Concepto | Importe | Nota |
| --- | --- | --- |
| Nómina cobrada | `2000.00` | Movimientos |
| Bonus cobrado | `200.00` | Movimientos |
| Otros ingresos | `50.00` | Incluye Intereses una vez |
| Total ingresos | `2250.00` | Oráculo |
| Gasto bruto | `1800.00` | Incluye cuota `300.00`, compartido bruto `300.00`, Comida auxiliar `50.00` y terminal `100.00` |
| Amortización extraordinaria | `100.00` | Separada |
| Saldo operativo bruto | `No disponible` | Los tres componentes son subtotales parciales; no se fabrica `350.00` |
| Del mes del plan | `1900.00` | 4/4 líneas |
| Margen frente a nómina real | `No disponible` | Nómina publicada como subtotal; no se fabrica `100.00` |

Presupuestos: `PRE001` y `PRE004` sobre `S001` (varios por saldo), `PRE002` Ahorro sobre
`S002`, `PRE003` Inversión sobre `S007`. Plan del ciclo `C007` con 4 líneas completas.

### Coste esencial

| Ejercicio | Plan anual | Esencial=Sí | Equivalente mensual | Estado |
| --- | --- | --- | --- | --- |
| 2026 | Completo | `18000.00` anual | `1500.00` | `Completo` |
| 2026 variante B | Una línea Sí sin importe | — | subtotal conocido | `Incompleto` |
| 2026 variante C | Sin líneas | — | — | `Sin plan anual` |

### Variantes de liquidez y ejercicio

| Variante | Cambio | Uso |
| --- | --- | --- |
| `V-LIQ-COMPLETA` | `S005.Liquidez = No` (o se excluye del universo activo) | Liquidez completa 3/3 `3456.40`; `mesesCubiertos = 345640/150000 = 2.304266…`, visible sin `mesesObjetivo` |
| `V-LIQ-PARCIAL` | Fixture base con `S005.Liquidez` sin informar | `mesesCubiertos` `No disponible` por liquidez parcial |
| `V-LIQ-CERO` | Todos los Saldos activos con `Liquidez = No`; sin posición elegible | Liquidez `Cero verificado`; `mesesCubiertos` `0,00`, no ND |
| `V-EJERCICIO` | Ciclo `C008`: inicio `2026-11-20`, abierto, corte `2027-01-19`, `mesFinanciado 2026-12` derivado; planes 2026 y 2027 con esenciales distintos | `annualEquivalent` de 2026; no 2027, reloj, corte ni año del ingreso |

### Configuración R6 (proveedor de prueba)

| Parámetro | Valor | Uso |
| --- | --- | --- |
| `mesesObjetivo` | `6` | Solo en pruebas de contrato |
| Umbral zona | `3` / `6` meses | Solo etiqueta informativa |

**Límite:** en v23 no existe almacén de configuración. El proveedor de prueba es un doble de
contrato; no acredita que la app pueda configurarlo. Sin el proveedor, **solo `minimoObjetivo`**
es `No disponible`; `mesesCubiertos` se publica si liquidez y coste son completos
(`V-LIQ-COMPLETA`).

## Oráculo independiente

| Métrica | Cálculo esperado | Resultado |
| --- | --- | --- |
| Liquidez | `1200.00 + 800.00 + 1456.40` (solo activos con Liquidez Sí y posición verificable) | subtotal `3456.40`; `valor: null`, `Parcial` por `S005` sin informar |
| Mínimo objetivo | `1500.00 × 6` | `9000.00` (solo con proveedor) |
| Meses cubiertos — liquidez parcial | `V-LIQ-PARCIAL` | `No disponible` por liquidez parcial; no se divide el subtotal |
| Meses cubiertos — liquidez completa | `3456.40 / 1500.00` (`V-LIQ-COMPLETA`) | `345640/150000 = 2.304266…`; se muestra `2,30` (formato propuesto DT8) aunque `mesesObjetivo` sea `null`; `minimoObjetivo` ND |
| Meses cubiertos — liquidez cero | `0 / 1500.00` (`V-LIQ-CERO`) | `0,00` con `Cero verificado`; no ND |
| Coste 0 | `0` verificado | meses cubiertos `No disponible`, no 0/infinito |
| Ejercicio esencial | `C008` (ID `8`) con inicio `2026-11-20`, `mesFinanciado 2026-12` y corte `2027-01-19` | `annualEquivalent` de 2026; 2027 no se usa |
| Agregado inversión | `877.50 + 320.00` | `1197.50`, cobertura completa |
| Efectivo bróker | `S003 1456.40` y `S004 500.00` | dos registros, sin total |
| Deuda no hipotecaria | `720.00 + 300.00` | subtotal `1020.00`; total `null` por `D005` |
| Ciclo operativo | `2250.00 − 1800.00 − 100.00` | `valor: null`, `No disponible`: componentes parciales, sin fabricar `350.00` |
| Margen real | `2000.00 − 1900.00` | `valor: null`, `No disponible`, clase `plan`: nómina solo subtotal |

Comprobaciones de **no duplicación** (los valores erróneos no deben aparecer):

| Suma incorrecta | Resultado prohibido | Motivo |
| --- | --- | --- |
| Inversión + efectivo | `1197.50 + 1456.40 + 500.00 = 3153.90` | El efectivo no es posición |
| Liquidez + Ahorro + Bolsas | Cualquier suma cruzada (p. ej. `3456.40 + 800.00 + 250.00`) | Vistas solapadas del mismo Saldo |
| Liquidez − deuda | `3456.40 − 1020.00 = 2436.40` | La deuda es informativa |
| Gasto − total deudas | `1800.00 − 400.00 = 1400.00`; operativo fabricado `350.00` | La cuota ya está en el Gasto; con componentes parciales no hay operativo |
| Operativo − pendientes | Cualquier resta de E3.6 | Pendientes no son ajuste del flujo |
| Gasto + Neto compartido | `1800.00 + 180.00` | Neto sustituye/ajusta, no se suma al bruto |

## Matriz de casos

| AC | Tipo | Precondición y acción | Resultado esperado | Método y comando | Plataforma / owner | Evidencia | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Positivo | Abrir inicio con fixture | Toda cifra con `fuente.motor`, IDs y contexto; UI sin cálculos | API + Playwright | Local/CI · impl + QA | `tests/e2e/inicio.spec.ts` muestra fuente/cobertura/motivo por tarjeta y en mínimo/meses. Mapeados además: `fuente`/`ids`/`cobertura` de `ahorroCierre` y `variacionAhorro`, `cobertura` del coste (estado y contadores publicados por E2.4), `condicion` por Saldo/Ahorro, `valoracionMotivo`/`valoracionCobertura` por posición y `estado`/`tipoDeuda`/`revision` en deuda aparte. Persiste sin contrato de motor la cobertura estructurada por ítem de Saldos/Ahorro/deuda aparte; se muestra cobertura de sección y condición/motivo por ítem. Detalle por campo en la spec. | PARCIAL (2026-11-04, local) |
| AC-02 | Positivo | Comparar DTO con motores | Igualdad exacta por campo, incluidos `null`: liquidez `3456.40`/`Parcial`; ingresos `2250.00`, gasto `1800.00`, extraordinaria `100.00` y nómina `2000.00` como `subtotal` con `valor:null`/`Parcial`; base y delMes `1900.00`/`Verificado`/`plan`; `operativo` y `margenReal` `No disponible`; deuda `1020.00`/`Parcial`; coste `1500.00`; agregado `1197.50` | `bun test apps/api/src/resumen-inicio.test.ts` | Local/CI · impl | Tabla de oráculo + asserts de nómina/base/delMes | PASS (2026-11-04, local) |
| AC-03 | Negativo | Snapshot de tablas antes/después del GET | Sin cambios; solo GET; 405 en POST/PATCH/DELETE | API + SQLite | Local/CI · QA | `resumen-inicio.test.ts`: snapshot antes/después, 405 con `Allow: GET` y sin escrituras en POST/PATCH/DELETE | PASS (2026-11-04, local) |
| AC-04 | Límite | Modificar un hecho de una fuente y recargar | Cambia la sección y `revision`; las demás no | API | Local/CI · impl | `resumen-inicio.test.ts`: edita un Gasto real (`1050.00`→`1150.00`), cambia la revisión y Gasto `1800.00`→`1900.00`; ingresos, extraordinaria, inversión, deuda, objetivo y ahorro conservan su cifra/cobertura | PASS (2026-11-04, local) |
| AC-05 | Positivo | `S005` sin Liquidez | `Parcial`, 3 incluidos, 1 excluido, subtotal `3456.40` | API + UI | Local/CI · impl + QA | `tests/e2e/inicio.spec.ts` (Liquidez `3/4`, `S005: Liquidez sin informar`) | PASS (2026-11-04, local) |
| AC-06 | Negativo | Motor ausente o error de fuente | `No disponible` con motivo y motor; no 0 | API | Local/CI · impl | `resumen-inicio.test.ts` con alcance E2.4: fallo de fuente degrada su sección y conserva las demás. M-4 adicional: E3.6 con `fuenteFallos` y cero filas publica `Parcial`, no `Sin datos`; no se fuerzan E2.6/E4.4/E4.3 | PASS (alcance E2.4, 2026-11-04, local) |
| AC-07 | Límite | `null` de motor frente a `0.00` | `No disponible` vs `0,00 €`/`Cero verificado` | API + UI | Local/CI · QA | `tests/e2e/inicio.spec.ts` (base y escenario `zero`) + `artifacts/e4-6/inicio-cero-1440.png` | PASS (2026-11-04, local) |
| AC-08 | Negativo | Cambiar el reloj de consulta | Sin cambio de ciclo, corte ni cifras | API | Local · QA | `resumen-inicio.test.ts` compara `NOW` y `LATER`; solo cambia `consulta` | PASS (2026-11-04, local) |
| AC-09 | Positivo | Activar cada drill-down y volver | ID correcto, contexto conservado, URL sin importes | Playwright | Local/CI · QA | `tests/e2e/inicio.spec.ts`: Saldos, S001, Flujo, Inversiones, Deudas, D001, Pendientes y Plan anual; vuelta con `Ciclo 7` y sin importes en URL | PASS (2026-11-04, local) |
| AC-10 | Negativo | Buscar total patrimonial o suma cruzada | No existe cifra ni suma cruzada | API + UI | Local/CI · QA | `resumen-inicio.test.ts` (sin `totalSaldos`/total de inversión) + UI sin sumas | PASS (2026-11-04, local) |
| AC-11 | Positivo | Cambiar Finalidad/bolsa/nombre | Liquidez no cambia; solo `Liquidez` decide | API | Local/CI · impl | `resumen-inicio.test.ts` (AC-04/11) | PASS (2026-11-04, local) |
| AC-12 | Positivo | Coste `1500.00`, meses `6` | Mínimo `9000.00` exacto | API contrato | Local/CI · impl | `resumen-inicio.test.ts` (AC-12/13/15) | PASS (2026-11-04, local) |
| AC-13 | Positivo/Límite | `V-LIQ-COMPLETA`, sin meses objetivo | `mesesCubiertos` `2,30` (racional `345640/150000`) visible; `minimoObjetivo` `No disponible`; no 0/infinito | API | Local/CI · impl | `resumen-inicio.test.ts` (AC-12/13/15) | PASS (2026-11-04, local) |
| AC-14 | Negativo | Plan anual `Incompleto` y `Sin plan` | Coste no verificado; `minimoObjetivo` y `mesesCubiertos` `No disponible`; subtotal visible | API | Local/CI · impl | `resumen-inicio.test.ts` (AC-14/16) | PASS (2026-11-04, local) |
| AC-15 | Negativo | Sin configuración R6 | `minimoObjetivo` `No disponible`; `mesesCubiertos` se rige por AC-13/16; zona informativa; sin botón/endpoint de transferencia | API + UI | Local/CI · QA | `resumen-inicio.test.ts` + UI `Zona informativa` sin acción | PASS (2026-11-04, local) |
| AC-16 | Límite | `V-LIQ-PARCIAL`, coste incompleto y coste 0 | `mesesCubiertos` `No disponible` por su propio motivo; no se divide el subtotal; no 0/infinito | API | Local/CI · impl | `resumen-inicio.test.ts` (AC-14/16) | PASS (2026-11-04, local) |
| AC-17 | Negativo | Sin ciclo/corte | Ciclo y valoración `No disponible`; actuales visibles y etiquetados | API + UI | Local/CI · QA | `resumen-inicio.test.ts` (AC-17) | PASS (2026-11-04, local) |
| AC-18 | Negativo | Fixture de inversión | Efectivo fuera del agregado; sin total combinado | API + UI | Local/CI · impl | `resumen-inicio.test.ts` + UI `Sin total combinado`; ausencia de `3153.90` | PASS (2026-11-04, local) |
| AC-19 | Negativo | Saldo en varias vistas | Aparece en las vistas; sin suma combinada | API + UI | Local/CI · QA | `resumen-inicio.test.ts` (AC-09/10/19/23) + UI sin total de Saldos | PASS (2026-11-04, local) |
| AC-20 | Negativo | Cambiar cobertura de Presupuesto o línea de plan | Liquidez/ahorro no cambian; no se resta lo presupuestado | API | Local/CI · impl | `resumen-inicio.test.ts` (AC-20): E2.3 eleva `Del mes` de una línea de 1.000,00 a 2.500,00; el plan cambia a 3.400,00 y liquidez (`3.456,40`, `Parcial`), la posición de ahorro (`800,00`; `ahorroCierre`/`variación` siguen `No disponible`), gasto (`1.800,00`) y operativo (`No disponible`) conservan valor/subtotal/estado/cobertura; no aparece `1.956,40` ni resta presupuestada. | PASS (2026-11-04, local) |
| AC-21 | Negativo | Añadir deuda | Liquidez, gasto y operativo no cambian; solo cambia la deuda no hipotecaria | API | Local/CI · impl | `resumen-inicio.test.ts` (AC-21): alta E1.6/E4.4 de deuda no hipotecaria de 250,00; liquidez, gasto, operativo y ahorro conservan cifra/estado; el subtotal de deuda pasa de `1.020,00` a `1.270,00` con cobertura `3/4` y la nueva deuda calculable. | PASS (2026-11-04, local) |
| AC-22 | Límite | Cuota `300` + extraordinaria `100` | Operativo `No disponible`: no aparece `350`, `−50` ni `1400`; no se resta la cuota ni la extraordinaria de ninguna métrica publicada | API + UI | Local/CI · impl | `resumen-inicio.test.ts` + E2E: operativo ND y ausencia de `350,00 €` | PASS (2026-11-04, local) |
| AC-23 | Positivo | E3.6 con pendientes de varios tipos | Lista por tipo/estado; sin total monetario ni suma al flujo | API + UI | Local/CI · impl + QA | `resumen-inicio.test.ts` (AC-09/10/19/23) + UI sin total monetario | PASS (2026-11-04, local) |
| AC-24 | Positivo | `I1002` manual | Valor `320.00`; resultado/rentabilidad `No disponible` | API + UI | Local/CI · QA | `resumen-inicio.test.ts` + UI resultado ND | PASS (2026-11-04, local) |
| AC-25 | Límite | Agregado parcial y `D005` no calculable | `Parcial n/m` sin total; subtotal `1020.00`; sin 0 sustitutivo | API + UI | Local/CI · impl + QA | `resumen-inicio.test.ts` + UI deuda `2/3` y `1.020,00 €` | PASS (2026-11-04, local) |
| AC-26 | Positivo | 1440×1000 y 390×844, teclado/foco | Sin scroll horizontal; estado icono+texto; foco visible | Playwright + capturas | Local/CI · QA | `artifacts/e4-6/inicio-{light,dark,hybrid}-{1440,390}.png`; contraste de texto/motivos/enlaces ≥ 4,5 en los tres temas | PASS (2026-11-04, local) |
| AC-27 | Negativo | Anónimo, sesión expirada, error 500 | 401/reautenticación; error genérico; `no-store` | API + HTTP + Playwright | Local/CI · QA | `resumen-inicio.test.ts` y E2E: anónimo `401`, `405`/`403`, `no-store` y sin escrituras. Añadido E2E con intercepción: error 500 muestra alerta genérica con reintento, sin importes ni SQL; sesión expirada (401) muestra estado de caducidad, conserva la cabecera de contexto, no muestra cifras y reautentica volviendo a `/inicio`. | PASS (2026-11-04, local) |
| AC-28 | Positivo/Límite | `V-EJERCICIO` (ID `8`): `mesFinanciado 2026-12`, corte `2027-01-19`, planes 2026 y 2027 | `costeEsencialMensual` de 2026; no 2027, reloj, corte ni año del ingreso | API | Local/CI · impl | `resumen-inicio.test.ts` (AC-28) | PASS (2026-11-04, local) |
| AC-29 | Límite | `V-LIQ-CERO` con coste `1500.00` | `mesesCubiertos` `0,00` con `Cero verificado`; no ND ni 0 implícito | API + UI | Local/CI · impl | `tests/e2e/inicio.spec.ts` escenario `zero` (0,00 € y 0,00 meses) + `bun test apps/api/src/resumen-inicio.test.ts` | PASS (2026-11-04, local) |

### Casos específicos de no duplicación

| ID | Escenario | Oráculo | Resultado prohibido |
| --- | --- | --- | --- |
| ND-01 | Efectivo del bróker y posición | Posición `1197.50`; efectivo `1456.40` + `500.00` separados | `3153.90` como «inversión total» |
| ND-02 | Liquidez, Ahorro y Bolsas solapados | Tres vistas con sus IDs | Cualquier total cruzado |
| ND-03 | Cobertura de Presupuesto | La cobertura no altera liquidez | Restar presupuestado o crear reserva |
| ND-04 | Cuota y extraordinaria | Gasto `1800` incluye cuota una vez; extraordinaria `100` aparte | `1400` o `−50` |
| ND-05 | Compartido bruto y neto | Bruto dentro de `1800` una vez | `1800 + 180` |
| ND-06 | Comida auxiliar | Sin segundo Gasto | Sumar `50` otra vez |
| ND-07 | Pendientes E3.6 | Sin total ni ajuste del flujo | Sumar/restar pendientes al operativo |
| ND-08 | Deuda | Informativa | Restar `1020` de liquidez |

## Pruebas de contrato y precisión

- Importes como cadenas decimales exactas; sin `float`; suma exacta y formato final una vez.
- `3456.40`, `1197.50`, `1020.00`, `350.00`, `100.00` al céntimo.
- `meses cubiertos` con racional exacto y visible sin `mesesObjetivo`; el formato de 2 decimales es propuesta DT8. No se convierte un parcial/ND en 0.
- `null` nunca se convierte en `0.00`; `0.00` verificado se conserva.
- Fechas ISO civiles; corte no futuro; sin reloj.
- `revision` cambia cuando cambia una fuente; no se mezclan lecturas.

## Regression checks

| Suite | Qué cubre | Cuándo | Estado |
| --- | --- | --- | --- |
| `bun test apps/api/flujo-mensual.test.ts` | E2.6 liquidez, operativo, márgenes | Candidato E4.6 | UNRUN |
| `bun test apps/api/ventas.test.ts` / inversiones | E4.2 cantidades y efectivo | Candidato E4.6 | UNRUN |
| `bun test apps/api/deuda-completa.test.ts` | E4.4 deuda viva y cobertura | Candidato E4.6 | UNRUN |
| `bun test apps/api/plan-anual.test.ts` | E2.4 equivalente esencial | Candidato E4.6 | UNRUN |
| `bun test apps/api/src/resumen-inicio.test.ts` | Composición API E4.6, AC-04 Gasto, AC-20 plan, AC-21 deuda y M-4 | Candidato | PASS 16/16 (2026-11-04, local) |
| `bunx playwright test tests/e2e/inicio.spec.ts` | UI E2E E4.6, drills, M-4, AC-27 500/sesión expirada | Candidato | PASS 5/5 (2026-11-04, local) |
| `bun run typecheck` | Tipos del DTO y UI | Candidato | PASS (2026-11-04, local) |
| `bun run build` | Cliente | Candidato | PASS (2026-11-04, local) |
| `python3.12 scripts/verify --full` | Gate canónico | Candidato estable | UNRUN |

Los recuentos reales se registran en la ejecución; no se heredan cifras de otros testplans.
Un fallo esperado de un caso negativo no es un fallo de la suite: debe demostrar el rechazo y
la suite global terminar correctamente.

## Functional verification

Se registrará, por AC: petición/respuesta, código, DTO, IDs y revisión; para los negativos, el
motivo y la ausencia de escritura. El arranque del proceso no acredita la funcionalidad. La
verificación de no escritura compara las tablas y `schema_version` antes/después.

## Browser verification (web)

- Playwright real con MFA; sin bypass.
- Resoluciones 1440×1000 y 390×844; capturas en `artifacts/e4-6/` (ignoradas por Git).
- Recorridos: liquidez/objetivo, ciclo, Saldos, Ahorro, Inversión, Deuda, Pendientes,
  drill-down y vuelta, estados parcial/ND/error, sesión expirada.
- Teclado: orden de foco, activación de enlaces y `details`; foco visible.
- Comprobar que ningún estado depende solo del color; que no hay scroll horizontal a 390; que
  los importes no aparecen en URLs ni en logs de red.
- Revisión de accesibilidad básica; no se declara auditoría WCAG completa.

## Visual improvements (propuesta para implementación, no aprobada visualmente)

1. Reducir a dos tarjetas la primera fila (Liquidez/Objetivo) para una lectura inmediata.
2. Hacer visible el contexto y la cobertura en la cabecera, no en un tooltip.
3. Etiquetar explícitamente «sin total combinado» en Inversión y Saldos.
4. Reservar el ámbar solo para `Parcial` y el gris para `No disponible`, con texto.
5. En 390, mantener el estado pegado al importe y el enlace de origen a ancho completo.

Las correcciones y recapturas se registrarán tras la revisión visual; esta lista no sustituye
la aprobación de wireframes.

## Criterios de salida

- Todos los AC en PASS o `BLOCKED` con causa externa verificable (E4.3 o consumo E3.6); la
  ausencia de configuración R6 solo puede dejar `minimoObjetivo` en `No disponible`, nunca
  `mesesCubiertos` si liquidez y coste son completos. Ningún `BLOCKED` se presenta como
  completado.
- Ningún AC en PASS por inspección, por arranque del proceso o por reutilizar evidencia de otra
  revisión.
- Sin FAIL abiertos, sin regresiones en E2.4/E2.6/E4.2/E4.4 y sin cambios de datos.
- `python3.12 scripts/verify --full` del candidato estable en PASS.
- Capturas 390/1440 inspeccionadas; teclado, foco y estados comprobados.
- Revisión independiente de QA y aprobación de merge separada.
- La entrega no se declara completa mientras AC-01 esté en PARCIAL, salvo que QA lo bloquee
  con causa externa verificable. La falta de configuración R6 deja solo `minimoObjetivo` en
  `No disponible`; `mesesCubiertos` puede PASS con liquidez y coste completos.

## Limitaciones y siguiente acción

La rama `feat/e46-inicio` implementa la composición API (A+B) y la UI `/inicio` (bloque C).
Evidencia local de esta actualización (2026-11-04): `bun run typecheck`, `bun run build`,
`bunx playwright test tests/e2e/inicio.spec.ts` (5/5, incluidos el escenario degradado M-4,
todos los drill-down, contraste y AC-27 con 500 y sesión expirada) y
`bun test apps/api/src/resumen-inicio.test.ts` (16/16, incluidos AC-04, AC-20, AC-21 y M-4 de
E3.6 con fuentes fallidas). La matriz deja en PASS local los AC con prueba concreta. **AC-01
sigue PARCIAL** solo por la cobertura estructurada por ítem de Saldos/Ahorro/deuda aparte, que
E1.1/E4.4 no publican; la spec justifica campo por campo qué se muestra en su lugar. No se
declara PASS de la matriz completa ni se reutiliza esta evidencia para el gate canónico.

Siguen pendientes: `python3 scripts/verify --full` del SHA candidato, la revisión independiente
de QA y la aprobación de merge. E4.3 está integrado en `main`; E3.6/DEV21 sigue en `a26fffb`
sin reauditoría de su consumo. La configuración R6 no existe; Q3-B=A mantiene E4.6 sin almacén
y solo condiciona `minimoObjetivo`; `mesesCubiertos` se prueba sin ella con liquidez y coste
completos. La siguiente acción es la revisión de QA y el `--full` antes de cualquier merge.
