# 24 — E4.6 Resumen de inicio completo: Test plan

Status: **DRAFT — DISEÑO DE PRUEBAS; NO EJECUTADO.** Ningún AC está en PASS. No existe
candidato funcional de E4.6, endpoint, UI, DDL ni migración. DEV E4.6 no autorizado.
Specification: [24-e46-resumen-inicio-specification.md](24-e46-resumen-inicio-specification.md)
Brainstorming: [24-e46-resumen-inicio-brainstorming.md](24-e46-resumen-inicio-brainstorming.md)
Base: `main` `024b348` (2026-11-03), esquema SQLite **v23**.

**Nota de estado (2026-11-03):** Q4 es una propuesta técnica de Álex pendiente de confirmación
del usuario al aprobar SPEC24. `V-EJERCICIO`, AC-28 y `ejercicioOrigen` se mantienen como
diseño candidato condicionado a esa confirmación; no son una decisión cerrada. La regla de
`mesesCubiertos` de Q3 procede de una instrucción expresa del usuario; Q3-B sigue pendiente.

Antes de implementación, cada AC se mapea a entorno, caso positivo/negativo/límite y evidencia
esperada. Un borrador admite diseño provisional, nunca implementación ni PASS. Las filas
`BLOCKED` dependen de E4.3 o E3.6; la falta de configuración R6 solo afecta a
`minimoObjetivo`, no a `mesesCubiertos`. No se convierten en PASS por inspección.

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
  Los wireframes siguen pendientes de aprobación.
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

Todos los datos son ficticios. El ciclo `C007` cubre `2026-06-20`–`2026-07-19`, con
`mesFinanciado 2026-06` y corte efectivo `2026-07-19`.

### Saldos

| Saldo | Tipo / control | Estado | Liquidez | Finalidad | Bolsa | Posición / efectivo |
| --- | --- | --- | --- | --- | --- | --- |
| `S001` | Efectivo / Movimientos | Activa | Sí | — | No | `1200.00` |
| `S002` | Efectivo / Movimientos | Activa | Sí | Ahorro | No | `800.00` |
| `S003` | Efectivo / Inversiones | Activa | Sí | Inversión | No | `1456.40` (efectivo) |
| `S004` | Efectivo / Inversiones | Activa | No | Inversión | No | `500.00` (efectivo) |
| `S005` | Efectivo / Movimientos | Activa | Sin informar | — | Sí | `250.00` |
| `S006` | Efectivo / Movimientos | Inactiva | Sí | — | No | `999.00` |
| `S000` | técnico | — | — | — | — | excluido del inicio |

### Posiciones de inversión (E4.2/E4.3)

| Instrumento | Saldo inversión | Cantidad | Tipo valoración | Valor EUR | Resultado |
| --- | --- | --- | --- | --- | --- |
| `I1001` Fondo índice demo | `S004` | `7.5` | Automática | `877.50` | `258.50` |
| `I1002` Acción demo | `S004` | `2` | Manual | `320.00` | `No disponible` |

Agregado E4.3 esperado: valoración **Completa** `1197.50`; resultado **Parcial 1/2** y
`resultadoEur: null` por la valoración manual.

### Deuda (E4.4)

| Deuda | Tipo | Estado | Capital pendiente | Cálculo |
| --- | --- | --- | --- | --- |
| `D001` | No hipotecaria | Activa | `720.00` | Calculable |
| `D002` | No hipotecaria | Activa | `300.00` | Calculable |
| `D003` | Hipotecaria | Activa | `50000.00` | Calculable, fuera del total |
| `D004` | Sin informar | Activa | `100.00` | Fuera del total |
| `D005` | No hipotecaria | Activa | `null` | Desglose inválido; no calculable |
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
| Saldo operativo bruto | `350.00` | `2250 − 1800 − 100`; siempre PARCIAL |
| Del mes del plan | `1900.00` | 4/4 líneas |
| Margen frente a nómina real | `100.00` | Plan, no ahorro |

Presupuestos: `PRE001` y `PRE004` sobre `S001` (varios por saldo), `PRE002` Ahorro sobre
`S002`, `PRE003` Inversión sobre `S004`. Plan del ciclo `C007` con 4 líneas completas.

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
| `V-EJERCICIO` | Ciclo `C008`: inicio `2026-12-20`, fin/corte `2027-01-19`, `mesFinanciado 2026-12`; planes 2026 y 2027 con esenciales distintos | `annualEquivalent` de 2026; no 2027, reloj, corte ni año del ingreso |

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
| Ejercicio esencial | `C008` con `mesFinanciado 2026-12` y corte `2027-01-19` | `annualEquivalent` de 2026; 2027 no se usa |
| Agregado inversión | `877.50 + 320.00` | `1197.50`, cobertura completa |
| Efectivo bróker | `S003 1456.40` y `S004 500.00` | dos registros, sin total |
| Deuda no hipotecaria | `720.00 + 300.00` | subtotal `1020.00`; total `null` por `D005` |
| Ciclo operativo | `2250.00 − 1800.00 − 100.00` | `350.00`, `Parcial` |
| Margen real | `2000.00 − 1900.00` | `100.00`, clase `plan` |

Comprobaciones de **no duplicación** (los valores erróneos no deben aparecer):

| Suma incorrecta | Resultado prohibido | Motivo |
| --- | --- | --- |
| Inversión + efectivo | `1197.50 + 1456.40 + 500.00 = 3153.90` | El efectivo no es posición |
| Liquidez + Ahorro + Bolsas | Cualquier suma cruzada (p. ej. `3456.40 + 800.00 + 250.00`) | Vistas solapadas del mismo Saldo |
| Liquidez − deuda | `3456.40 − 1020.00 = 2436.40` | La deuda es informativa |
| Gasto − total deudas | `1800.00 − 400.00 = 1400.00` | La cuota ya está en el Gasto; la extraordinaria ya está separada |
| Operativo − pendientes | Cualquier resta de E3.6 | Pendientes no son ajuste del flujo |
| Gasto + Neto compartido | `1800.00 + 180.00` | Neto sustituye/ajusta, no se suma al bruto |

## Matriz de casos

| AC | Tipo | Precondición y acción | Resultado esperado | Método y comando | Plataforma / owner | Evidencia | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Positivo | Abrir inicio con fixture | Toda cifra con `fuente.motor`, IDs y contexto; UI sin cálculos | API + Playwright | Local/CI · impl + QA | DTO y captura | UNRUN |
| AC-02 | Positivo | Comparar DTO con motores | Igualdad exacta: `3456.40`, `1500.00`, `1197.50`, `1020.00`, `350.00`, `100.00` | `bun test apps/api/resumen-inicio.test.ts` | Local/CI · impl | Tabla de oráculo | UNRUN |
| AC-03 | Negativo | Snapshot de tablas antes/después del GET | Sin cambios; solo GET; 405 en POST/PATCH/DELETE | API + SQLite | Local/CI · QA | Diff de tablas y códigos | UNRUN |
| AC-04 | Límite | Modificar un Gasto y recargar | Cambia la sección y `revision`; las demás no | API | Local/CI · impl | Respuestas antes/después | UNRUN |
| AC-05 | Positivo | `S005` sin Liquidez | `Parcial`, 3 incluidos, 1 excluido, subtotal `3456.40` | API + UI | Local/CI · impl + QA | DTO y captura | UNRUN |
| AC-06 | Negativo | Error forzado de E2.6/E4.4/E4.3 | `No disponible` con motivo y motor; no 0 | API | Local/CI · impl | Respuesta con error de fuente | UNRUN |
| AC-07 | Límite | `null` de motor frente a `0.00` | `No disponible` vs `0,00 €`/`Cero verificado` | API + UI | Local/CI · QA | DTO y captura | UNRUN |
| AC-08 | Negativo | Cambiar reloj del sistema | Sin cambio de ciclo, corte ni cifras | API + Playwright | Local · QA | Capturas y DTO | UNRUN |
| AC-09 | Positivo | Activar cada drill-down y volver | ID correcto, contexto conservado, URL sin importes | Playwright | Local/CI · QA | Capturas y URLs | UNRUN |
| AC-10 | Negativo | Buscar total patrimonial | No existe cifra ni suma cruzada | API + UI | Local/CI · QA | DTO y captura | UNRUN |
| AC-11 | Positivo | Cambiar Finalidad/bolsa/nombre | Liquidez no cambia; solo `Liquidez` decide | API | Local/CI · impl | Antes/después | UNRUN |
| AC-12 | Positivo | Coste `1500.00`, meses `6` | Mínimo `9000.00` exacto | API contrato | Local/CI · impl | DTO | UNRUN |
| AC-13 | Positivo/Límite | `V-LIQ-COMPLETA`, sin meses objetivo | `mesesCubiertos` `2,30` (racional `345640/150000`) visible; `minimoObjetivo` `No disponible`; no 0/infinito | API | Local/CI · impl | DTO y motivos | UNRUN |
| AC-14 | Negativo | Plan anual `Incompleto` y `Sin plan` | Coste no verificado; `minimoObjetivo` y `mesesCubiertos` `No disponible`; subtotal visible | API | Local/CI · impl | DTO | UNRUN |
| AC-15 | Negativo | Sin configuración R6 | `minimoObjetivo` `No disponible`; `mesesCubiertos` se rige por AC-13/16; zona informativa; sin botón/endpoint de transferencia | API + UI | Local/CI · QA | DTO y captura | UNRUN |
| AC-16 | Límite | `V-LIQ-PARCIAL`, coste incompleto y coste 0 | `mesesCubiertos` `No disponible` por su propio motivo; no se divide el subtotal; no 0/infinito | API | Local/CI · impl | DTO | UNRUN |
| AC-17 | Negativo | Sin ciclo/corte | Ciclo y valoración `No disponible`; actuales visibles y etiquetados | API + UI | Local/CI · QA | DTO y captura | UNRUN |
| AC-18 | Negativo | Fixture de inversión | Efectivo fuera del agregado; sin total combinado | API | Local/CI · impl | DTO; ausencia de `3153.90` | UNRUN |
| AC-19 | Negativo | Saldo en tres vistas | Aparece en las tres; sin suma combinada | API + UI | Local/CI · QA | DTO y captura | UNRUN |
| AC-20 | Negativo | Cambiar cobertura de Presupuesto | Liquidez/ahorro no cambian; no se resta lo presupuestado | API | Local/CI · impl | Antes/después | UNRUN |
| AC-21 | Negativo | Añadir deuda | Liquidez, gasto y operativo no cambian | API | Local/CI · impl | Antes/después | UNRUN |
| AC-22 | Límite | Cuota `300` + extraordinaria `100` | Operativo `350`, no `−50` ni `1400` | API | Local/CI · impl | DTO | UNRUN |
| AC-23 | Positivo/BLOCKED | E3.6 con pendientes de varios tipos | Lista por tipo/estado; sin total monetario ni suma al flujo | API + UI | Local/CI · impl + QA | DTO | BLOCKED (E3.6) |
| AC-24 | Positivo | `I1002` manual | Valor `320.00`; resultado/rentabilidad `No disponible` | API + UI | Local/CI · QA | DTO y captura | UNRUN |
| AC-25 | Límite | Agregado parcial y `D005` no calculable | `Parcial n/m` sin total; subtotal `1020.00`; sin 0 sustitutivo | API + UI | Local/CI · impl + QA | DTO y captura | UNRUN |
| AC-26 | Positivo | 1440×1000 y 390×844, teclado/foco | Sin scroll horizontal; estado icono+texto; foco visible | Playwright + capturas | Local/CI · QA | `artifacts/e4-6/*.png` | UNRUN |
| AC-27 | Negativo | Anónimo, sesión expirada, error 500 | 401/reautenticación; error genérico; `no-store` | API + HTTP | Local/CI · QA | Respuestas y cabeceras | UNRUN |
| AC-28 | Positivo/Límite | `V-EJERCICIO`: `mesFinanciado 2026-12`, corte `2027-01-19`, planes 2026 y 2027 | `costeEsencialMensual` de 2026; no 2027, reloj, corte ni año del ingreso | API | Local/CI · impl | DTO y `ejercicioOrigen` | UNRUN |
| AC-29 | Límite | `V-LIQ-CERO` con coste `1500.00` | `mesesCubiertos` `0,00` con `Cero verificado`; no ND ni 0 implícito | API | Local/CI · impl | DTO | UNRUN |

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
| `bun run typecheck` | Tipos del DTO y UI | Candidato | UNRUN |
| `bun run build` | Cliente | Candidato | UNRUN |
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

## Visual improvements (propuesta, no aprobada)

1. Reducir a dos tarjetas la primera fila (Liquidez/Objetivo) para una lectura inmediata.
2. Hacer visible el contexto y la cobertura en la cabecera, no en un tooltip.
3. Etiquetar explícitamente «sin total combinado» en Inversión y Saldos.
4. Reservar el ámbar solo para `Parcial` y el gris para `No disponible`, con texto.
5. En 390, mantener el estado pegado al importe y el enlace de origen a ancho completo.

Las correcciones y recapturas se registrarán tras la revisión visual; esta lista no sustituye
la aprobación de wireframes.

## Criterios de salida

- Todos los AC en PASS o `BLOCKED` con causa externa verificable (E4.3 o E3.6); la ausencia
  de configuración R6 solo puede dejar `minimoObjetivo` en `No disponible`, nunca
  `mesesCubiertos` si liquidez y coste son completos. Ningún `BLOCKED` se presenta como
  completado.
- Ningún AC en PASS por inspección, por arranque del proceso o por reutilizar evidencia de otra
  revisión.
- Sin FAIL abiertos, sin regresiones en E2.4/E2.6/E4.2/E4.4 y sin cambios de datos.
- `python3.12 scripts/verify --full` del candidato estable en PASS.
- Capturas 390/1440 inspeccionadas; teclado, foco y estados comprobados.
- Revisión independiente de QA y aprobación de merge separada.
- La entrega no se declara completa si falta E4.3 o E3.6. La falta de configuración R6 deja
  solo `minimoObjetivo` en `No disponible`; `mesesCubiertos` puede PASS con liquidez y coste
  completos.

## Limitaciones y siguiente acción

No hay implementación, endpoint, UI ni datos que probar. E4.3 y E3.6 están aprobadas
documentalmente pero sin DEV. La configuración R6 no existe, pero solo condiciona
`minimoObjetivo`; `mesesCubiertos` se prueba sin ella con liquidez y coste completos. Este
testplan es diseño provisional: cualquier PASS requiere un candidato funcional autorizado,
fixtures nuevas y evidencia propia. La siguiente acción es resolver Q1, Q2, Q3-B y Q5–Q12 del
brainstorming y aprobar la specification; después, autorizar DEV y ejecutar esta matriz.
