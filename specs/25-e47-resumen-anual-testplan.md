# 25 — E4.7 Resumen anual y flujo completo trazable: Test plan

Status: **DRAFT — no aprobado; diseño de pruebas, NO EJECUTADO.** Ningún AC está en PASS.
No existe candidato funcional de E4.7, endpoint, UI, DDL ni migración. **DEV25 no autorizado.**
Este documento no autoriza datos reales, migración, snapshots ni merge.

Specification: [25-e47-resumen-anual-specification.md](25-e47-resumen-anual-specification.md)
Fuentes: [inventario anual E4.7](investigations/e47-annual-inventory-2026-11-03.md),
[roadmap E4.7](roadmap.md),
[SPEC10/E2.4](10-plan-anual-specification.md),
[SPEC12/E2.6](12-flujo-mensual-specification.md),
[SPEC21/E3.6](21-pendientes-conciliacion-specification.md),
[SPEC23/E4.3](23-e43-valoracion-resultados-specification.md),
[SPEC24/E4.6](24-e46-resumen-inicio-specification.md),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md),
[SPEC20/E4.5](20-historico-precontrol-specification.md),
[guías de calidad](guidelines/quality.md), [UI](guidelines/ui.md) y
[seguridad](guidelines/security.md).
Base de contenido: `main` `0b8aade` (2026-11-04). Rama documental: `docs/next-packages`,
base `eefc20d`. Todos los importes e IDs de las fixtures son ficticios y proceden de
documentos ya aprobados; no se introducen datos personales ni cifras de negocio nuevas.

**Leyenda de estado:** `UNRUN` = diseñado y no ejecutado; `BLOCKED` = no ejecutable por una
dependencia externa; `PASS`/`FAIL` solo pueden registrarse con candidato autorizado, comando,
entorno, SHA y evidencia. En este documento **todos los AC están `UNRUN`**; las dependencias
se indican en la columna de gate, sin convertir la falta de dependencia en un PASS.

## Estrategia

- **Fixtures sintéticas y deterministas.** Solo IDs e importes ficticios ya documentados en
  SPEC12/SPEC20/SPEC24. Nunca Excel, bases reales, datos personales, credenciales ni secretos.
- **Oráculo independiente.** Los valores esperados se calculan en una tabla separada del DTO
  y del motor. No se compara un motor consigo mismo; se compara la composición E4.7 con la
  respuesta directa del propietario al mismo contexto.
- **Contrato de solo lectura.** Se comprueba DTO, estados, cobertura, revisiones, ausencia de
  escritura y ausencia de `totalAnual`. No se prueba una implementación inexistente.
- **API/SQLite.** Cuando exista DEV25 autorizado, extender `apps/api/src` con
  `resumen-anual.test.ts` y reutilizar las suites de los motores consumidos.
- **UI.** Playwright real con MFA, 1440/390, capturas ficticias, teclado, foco, contraste y
  estados. La revisión visual de implementación sigue pendiente.
- **Verificación canónica.** En el futuro candidato:
  `python3.12 scripts/verify --base 0b8aade --head <SHA>` y, cuando corresponda,
  `python3.12 scripts/verify --full`. En esta rama documental solo se ejecutan validaciones
  de estructura; no se ejecutan suites financieras por una especificación.
- **Registro.** PASS/FAIL/UNRUN/BLOCKED con comando, entorno, SHA y evidencia. No se declara
  PASS por inspección ni se reutiliza evidencia de otra revisión.

## Entornos previstos

| Entorno | Uso | Límite |
| --- | --- | --- |
| macOS local | Bun 1.4.3, Python 3.10+, Chromium/Playwright 1.64.1; iteración | No sustituye CI Linux |
| Linux CI | Ubuntu 24.04, Bun/age/Chromium preparados; full del SHA candidato | Gate final del DEV |
| Fixtures | Bases ficticias, MFA real local, sin datos personales | Nunca Excel, DB real, claves o VPS |
| Documental actual | `python3 scripts/validate-template`, `check-project`, `test-validator`, `git diff --check` | Solo estructura; no valida E4.7 |

## Fixtures diseñadas

### F-E26-C007 — contrato real de E2.6

Fixture ficticia basada en el ciclo `C007` de SPEC24 (inicio `2026-06-20`, abierto, corte
`2026-07-19`, `mesFinanciado 2026-07`). Los importes ya figuran en SPEC12/SPEC24; aquí se
leen con el contrato real de E2.6 de 2026-11-04, no con los ejemplos obsoletos de `spec24`.

| Métrica E2.6 | `valor` esperado | `subtotal` esperado | `estado` esperado |
| --- | --- | --- | --- |
| `ingresos` | `null` | `2250.00` | `Parcial` |
| `gasto` | `null` | `1800.00` | `Parcial` |
| `extraordinaria` | `null` | `100.00` | `Parcial` |
| `nómina` | `null` | `2000.00` | `Parcial` |
| `operativo` | `null` | `null` | `No disponible` |
| `margenReal` | `null` | `null` | `No disponible` |
| `margenEstructural` | según `F-MARGEN` | según `F-MARGEN` | `Parcial` o `No disponible` |

Lectura correcta: los cuatro subtotales son importes registrados conocidos, no totales del
Ciclo ni del año. `operativo` no se calcula como `2250 − 1800 − 100 = 350` porque sus tres
componentes tienen `valor:null`; `margenReal` no se calcula como `2000 − 1900 = 100` porque
`nómina.valor` es `null`.

### F-C008 — Ciclo que cruza diciembre/enero

Fixture de SPEC24: ciclo `C008`, inicio `2026-11-20`, abierto, corte `2027-01-19`,
`mesFinanciado 2026-12`. Se usa para comprobar que el mismo Ciclo aparece en 2026 y 2027 con
sus fechas, sin prorrateo, sin copia de archivo y sin reasignar el año natural de los hechos.
No se añaden importes nuevos: las métricas se leen de E2.6 en cada prueba.

### F-ARCHIVO-UNICO — archivo + detalle sin solape

Fixture ficticia de SPEC20/AC-05: archivo `01/01–27/08` por `1200.00`; detalle desde
`28/08` por `300.00`; control `28/08`; corte `31/12`. Salida E4.5 esperada: total `1500.00`
una vez, `estadoCobertura=Completa`, `estadoTotal=Verificado`, `alcanceTotal=Anual`.
E4.7 muestra ese total una vez y no suma `1200 + 300` por su cuenta. El detalle ya excluye
Amortización por contrato E4.5; E4.7 no la vuelve a restar.

### F-ARCHIVO-SOLAPE — solapamiento no separable

Fixture ficticia de SPEC20/AC-06: archivo `01/01–27/08` por `1200.00`; detalle
`27/08–31/12` por `320.00` (20,00 el 27/08 + 300,00 después); el solape del 27/08 no es
separable. Salida E4.5 esperada: total y subtotal `null`; `estadoCobertura=Solapada`;
`estadoTotal=NoVerificable`; componentes visibles; no `1500` ni `1520` como total.

### F-HASTACORTE — corte abierto

Fixture ficticia de SPEC20/AC-08: archivo hasta `27/08` por `1200.00`; detalle desde
`28/08`; consulta al `27/08` y al `28/08`. Al `27/08`, total verificado `HastaCorte` de
`1200.00`; al `28/08`, incorpora el detalle una vez. Ningún resultado se etiqueta como
`Anual`.

### F-NOACREDITADA — universo DT7 no acreditado

Fixture ficticia de SPEC20: sin universo DT7 aprobado, sin archivo y sin control completo.
Salida E4.5 esperada: `estadoCobertura=NoAcreditada`; total `null`; motivo visible; subtotal
solo si es verificable, no conflictivo y separable; nunca `0`.

### F-MARGEN — márgenes del plan

Fixture ficticia de SPEC12: media estructural `1750.00` con cobertura `Parcial 2/12`; Base
`1800.00`; nómina del ciclo con `valor:null` y `subtotal 2000.00`; Del mes del plan
`1900.00`. Esperado: `margenEstructural = −50.00`, `Parcial`; `margenReal` (etiqueta «Margen
frente a nómina real») `No disponible` por `nómina.valor:null`. No se calcula `100.00` como
margen real.

### F-PATRIMONIO — contexto opcional al corte

Solo si el alcance incluye patrimonio. Fixture ficticia de SPEC24: agregado E4.3
`1197.50` con cobertura de valoración completa y resultado `Parcial 1/2`; deuda E4.4
no hipotecaria con `total:null`, `subtotal:1020.00`, cobertura `2/3`. Esperado: dos bloques
separados, al mismo corte, sin patrimonio neto y sin suma al flujo.

### F-PREVISION — simulación separada

E2.5 no publica un contrato anual consumible para el ejercicio en el alcance actual. Esperado:
carril `No disponible` con motivo; si en el futuro existe contrato, la simulación se muestra
aparte y no se suma al año ni al Ciclo.

### F-COSTE-CERO — coste esencial 0

Coste esencial verificado `0` y `mesesCubiertos` solicitado. Esperado: `mesesCubiertos`
`No disponible`; nunca `0`, infinito ni «cobertura total». Si E4.7 no publica el cociente,
`No aplica` con motivo.

### F-ERROR-FUENTE / F-CONCURRENCIA

- `F-ERROR-FUENTE`: una fuente (por ejemplo, E4.5 o E2.6) devuelve error o timeout; el resto
  debe seguir visible.
- `F-CONCURRENCIA`: se modifica una fuente entre la carga y el reintento, o se lanzan dos
  consultas con contextos distintos; no se mezclan revisiones ni se acepta una respuesta
  antigua.

## Matriz de aceptación

Todos los AC están `UNRUN`. La columna «Gate» indica la dependencia que impide ejecutarlos
hoy; no es un resultado.

| AC | Tipo | Precondición y acción | Resultado esperado | Método / comando propuesto | Gate / dependencia | Evidencia esperada | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.7-AC01 | Negativo / contrato | Snapshot de tablas y `schema_version`; GET del resumen; intentar POST/PATCH/DELETE | Sin cambios en hechos, planes, cierres, auditoría, configuración ni `schema_version`; solo GET; no hay ruta de escritura | API + SQLite; `bun test apps/api/src/resumen-anual.test.ts` | DEV25 | Diff de tablas, códigos y `schema_version` | UNRUN |
| E4.7-AC02 | Positivo / contrato | Abrir cada cifra y su detalle en `F-E26-C007` | Cada cifra declara `fuente.motor`, IDs, contexto, estado y cobertura; la UI no calcula ni rellena | API + Playwright | DEV25 | DTO y captura | UNRUN |
| E4.7-AC03 | Positivo / contrato | Comparar cada bloque incluido con su motor al mismo contexto | Igualdad exacta al céntimo con el propietario de ese bloque; ninguna cifra se reimplementa | `bun test apps/api/src/resumen-anual.test.ts` + suites de motores | DEV25; E4.5 para archivo | Tabla de oráculo y DTO | UNRUN |
| E4.7-AC04 | Negativo / contrato | Consultar un ejercicio con cobertura parcial (`F-E26-C007`) | El DTO no contiene `totalAnual`; no hay etiqueta «total anual»; todo agregado monetario del propietario lleva `alcance`, `estado`, `subtotalConocido` y `motivo` | API + revisión de DTO/UI | DEV25 | DTO; ausencia de campo y texto | UNRUN |
| E4.7-AC05 | Límite / contrato | `F-E26-C007` con el contrato real de E2.6 | `ingresos`, `gasto`, `extraordinaria` y `nomina` con `valor:null`, `subtotal` conocido y `Parcial`; `operativo` y `margenReal` `No disponible`; E4.7 no rellena ni anualiza | `bun test apps/api/src/resumen-anual.test.ts` | DEV25 | DTO con estados exactos | UNRUN |
| E4.7-AC06 | Negativo / límite | Dos Ciclos ficticios del mismo ejercicio, ambos `Parcial` | El carril realidad lista los Ciclos y sus subtotales; no publica total anual ni suma de subtotales como año; `agregadoAnual.estado=No aplica` | API + revisión de DTO | DEV25 | DTO con dos Ciclos y ausencia de total | UNRUN |
| E4.7-AC07 | Límite | Una fuente devuelve `null` y otra `0.00` verificado (`F-E26-C007` y variante cero) | `null` se muestra `No disponible`; `0,00` se muestra `Cero verificado`; no se sustituyen | API + Playwright | DEV25 | DTO y captura | UNRUN |
| E4.7-AC08 | Límite / año-Ciclo | `F-C008` con hechos en 2026 y 2027 | Aparece en ambos ejercicios con el mismo `cicloId`, fechas y métricas de Ciclo; sin prorrateo ni copia; el plan usa el año natural | API + Playwright | DEV25 | Dos DTO comparables y capturas | UNRUN |
| E4.7-AC09 | Límite / año-Ciclo | Gasto `28/12/2026` en Ciclo `20/12–19/01` y aportación `25/01/2027` (escenario SPEC21) | El plan anual usa 2026; el flujo usa el Ciclo; ambos visibles; no se reasigna el hecho | API + Playwright | DEV25 | DTO y captura | UNRUN |
| E4.7-AC10 | Límite / archivo | `F-HASTACORTE`: E4.5 devuelve `alcanceTotal=HastaCorte` | La UI dice «hasta corte» y no «anual»; no se publica total anual; el total hasta corte conserva su estado | API + Playwright | E4.5 DEV / DT7 | DTO y captura | UNRUN |
| E4.7-AC11 | Negativo / archivo | `F-NOACREDITADA`: E4.5 devuelve `estadoCobertura=NoAcreditada` | No certifica Ejecutado/Diferencia/total; muestra «Universo no acreditado», motivo y subtotal separable si existe; no `0`, no `Parcial` | API + Playwright | E4.5 DEV / DT7 | DTO y captura | UNRUN |
| E4.7-AC12 | Positivo / archivo | `F-ARCHIVO-UNICO`: E4.5 combina `1200.00 + 300.00` sin solape | E4.7 muestra `1500.00` de E4.5 una vez; no suma componentes; no duplica amortización | `bun test apps/api/src/resumen-anual.test.ts` | E4.5 DEV / DT7 | DTO con total y componentes | UNRUN |
| E4.7-AC13 | Negativo / archivo | `F-ARCHIVO-SOLAPE`: solape no separable | Componentes visibles; total/subtotal `null`; no `1500` ni `1520` como total; `Solapada`/`NoVerificable` y motivo | API + Playwright | E4.5 DEV / DT7 | DTO y captura | UNRUN |
| E4.7-AC14 | Negativo / no suma | Archivo anual y flujo del Ciclo en el mismo ejercicio | Se muestran en carriles separados; no se suman; el archivo no entra en el plan mensual ni en el flujo | API + Playwright | E4.5 DEV / DT7 | DTO y captura | UNRUN |
| E4.7-AC15 | Negativo / archivo | Consultar ingresos históricos | `No disponible` con motivo; no se reconstruyen desde plan/E2.6/archivo; no `0` | API + revisión de DTO | E4.5 DEV / DT7 | DTO y motivo | UNRUN |
| E4.7-AC16 | Negativo / previsión | `F-PREVISION` con simulación E2.5 y flujo real | La previsión se muestra aparte; no se suma al año ni al Ciclo; no se etiqueta como realidad | API + Playwright | DEV25 | DTO y captura | UNRUN |
| E4.7-AC17 | Positivo / ajuste | E3.6 publica `G_n`/`S_aj` para un Ciclo (`F-E26-C007`) | Se muestran en bloque propio, con estado y motivo; `S_aj` es `Parcial`; no se suman al bruto E2.6 ni se convierten en margen | `bun test apps/api/src/resumen-anual.test.ts` + `pendientes.test.ts` | DEV25 | DTO con ambos bloques | UNRUN |
| E4.7-AC18 | Límite / márgenes | `F-MARGEN`: media `1750.00` parcial, Base `1800.00`, nómina `valor:null` | `margenEstructural=−50.00 Parcial`; `margenReal` ND; `margen medio` y `margen real puntual` ND «DT8»; no hay margen anual | API + Playwright | D8-M (PASS completo de AC3) | DTO y captura | UNRUN |
| E4.7-AC19 | Límite / coste 0 | `F-COSTE-CERO` y cociente no definido; si E4.7 muestra el contexto de coste esencial | `mesesCubiertos` `No disponible`; no se divide por cero; sin ratio anual nuevo; si no aplica, `No aplica` con motivo | API + revisión de DTO | D8-Z | DTO | UNRUN |
| E4.7-AC20 | Límite / patrimonio | `F-PATRIMONIO` con y sin inclusión de patrimonio | Si entra: E4.3 y E4.4 al mismo corte, separados y con cobertura; sin patrimonio neto ni suma al flujo. Si no: bloque ausente o `No aplica`, sin cifra global | API + Playwright | E4.3/E4.4; decisión de alcance | DTO y captura | UNRUN |
| E4.7-AC21 | Positivo / enlaces | Activar cada enlace de la vista y volver | Ruta/ID correctos; se conserva el ejercicio y los filtros; la URL no contiene importes ni datos personales | Playwright | DEV25 | Capturas, URLs y foco | UNRUN |
| E4.7-AC22 | Positivo / UX | 1440×1000 y 390×844; teclado, foco y contraste | Cuatro carriles legibles, sin scroll horizontal; estado icono+texto; foco visible; sin tema/tokens nuevos | Playwright + capturas | D8-F; DEV25 | `artifacts/e4-7/*.png` | UNRUN |
| E4.7-AC23 | Negativo / estados | Forzar vacío, carga, parcial, ND, error de una fuente y reintento | Estados diferenciados; solo el carril afectado degrada; no `0`; el reintento conserva la selección | Playwright con intercepción de red | DEV25 | Capturas y DTO | UNRUN |
| E4.7-AC24 | Negativo / seguridad | Acceso anónimo, sesión expirada, error 500 e intento de escritura | 401/reautenticación sin datos; errores genéricos sin SQL ni importes; `no-store`; no hay métodos de escritura | API + HTTP | DEV25 | Respuestas y cabeceras | UNRUN |
| E4.7-AC25 | Límite / concurrencia | Cambiar una fuente entre carga y reintento; dos consultas concurrentes | No se mezclan revisiones; la respuesta antigua se descarta; la selección se conserva | API + Playwright | DEV25 | Respuestas y capturas | UNRUN |
| E4.7-AC26 | Negativo / persistencia | Inspeccionar tablas, `schema_version` y artefactos antes/después | Sin tabla, snapshot, caché persistida ni migración; `schema_version` igual; no se persiste el resumen | SQLite + API | DEV25 | Diff de esquema y artefactos | UNRUN |
| E4.7-AC27 | Límite / cierre | Consultar sin E4.9/E4.11 | Cabecera «cálculo vivo, sin foto»; no hay cierre/foto ni certificación anual; no se simula una foto | API + Playwright | E4.9/E4.11 | DTO y captura | UNRUN |

## Oráculo independiente y no duplicación

Los valores del oráculo se toman de los documentos de origen y de la respuesta directa del
motor; no se recalcula la composición E4.7.

| Comprobación | Valor esperado | Resultado prohibido |
| --- | --- | --- |
| E2.6 ingresos (C007) | `valor:null`, `subtotal:2250.00`, `Parcial` | `valor:2250.00`, `Verificado` o «total anual» |
| E2.6 gasto (C007) | `valor:null`, `subtotal:1800.00`, `Parcial` | `valor:1800.00` como total |
| E2.6 extraordinaria (C007) | `valor:null`, `subtotal:100.00`, `Parcial` | Sumarla al gasto como total |
| E2.6 nómina (C007) | `valor:null`, `subtotal:2000.00`, `Parcial` | `valor:2000.00` o nómina anual |
| E2.6 operativo (C007) | `valor:null`, `subtotal:null`, `No disponible` | `350.00` como `valor` o como ahorro real |
| E2.6 margenReal (C007) | `valor:null`, `No disponible` | `100.00` como margen real |
| E4.5 archivo único | `total:1500.00`, `Verificado`, `Anual` | `2700.00` por sumar componentes y total |
| E4.5 solape | `total:null`, `subtotal:null`, `Solapada`/`NoVerificable` | `1500.00` o `1520.00` como total |
| E4.5 `HastaCorte` | `1200.00` hasta `27/08`, `alcanceTotal:HastaCorte` | Etiquetarlo como anual |
| Márgenes F-MARGEN | `margenEstructural:−50.00`, `Parcial`; `margenReal:null`, ND | `100.00` de margen real o un margen anual |
| Patrimonio opcional | E4.3 `1197.50` y E4.4 `subtotal:1020.00`, separados | `2217.50` como patrimonio neto o suma al flujo |

### Sumas prohibidas

| Suma incorrecta | Resultado prohibido | Motivo |
| --- | --- | --- |
| Archivo `1200` + detalle `300` + total E4.5 `1500` | `3000.00` | E4.7 no recombina lo que ya combinó E4.5 |
| Archivo + flujo del Ciclo | Cualquier «flujo total» | Son carriles y fuentes distintas |
| Plan + realidad | Cualquier «total ejecutado» | El plan no es ejecución |
| Previsión + realidad | Cualquier «año real» | La previsión no crea hechos |
| Varios Ciclos del mismo año | «Total anual de flujo» | E2.6 no publica año natural y un Ciclo puede cruzar año |
| `G_n`/`S_aj` + E2.6 | «Flujo completo» monetario | E3.6 ajusta y documenta; no se suma al bruto |
| E4.3 + E4.4 | «Patrimonio neto» | Son bloques separados; no hay patrimonio global |
| Márgenes entre Ciclos | «Margen anual/medio» | No hay fórmula aprobada; DT8 pendiente |

## Regression checks

| Suite | Qué cubre | Cuándo | Estado |
| --- | --- | --- | --- |
| `bun test apps/api/src/flujo-mensual.test.ts` | Contrato real de E2.6, cobertura, `S`, márgenes | Candidato E4.7 | UNRUN |
| `bun test apps/api/src/plan-anual.test.ts` | E2.4 plan, ejecución, cobertura y equivalente | Candidato E4.7 | UNRUN |
| `bun test apps/api/src/pendientes.test.ts` | E3.6 `G_n`, `S_aj` y ausencia de total | Candidato E4.7 | UNRUN |
| `bun test apps/api/src/deuda-completa.test.ts` | E4.4 deuda viva, si el patrimonio entra | Candidato E4.7 | UNRUN |
| `bun test apps/api/src/e43-api.test.ts` | E4.3 agregado/cobertura, si el patrimonio entra | Candidato E4.7 | UNRUN |
| `bun test apps/api/src/resumen-anual.test.ts` | Composición E4.7 y AC de contrato | Candidato E4.7 | UNRUN |
| `bun run typecheck` | Tipos del DTO y UI | Candidato | UNRUN |
| `bun run build` | Cliente | Candidato | UNRUN |
| `bun run test:e2e` | 1440/390, enlaces, estados, seguridad de sesión | Candidato | UNRUN |
| `python3.12 scripts/verify --base 0b8aade --head <SHA>` | Gate canónico del candidato | Candidato estable | UNRUN |
| `python3.12 scripts/verify --full` | Full del candidato | Candidato estable | UNRUN |
| `git diff --check` | Whitespace/errores del diff documental | Ahora y candidato | UNRUN |

Los recuentos reales se registran en la ejecución; no se heredan cifras de otros testplans.
Un fallo esperado de un caso negativo no es un fallo de la suite: debe demostrar el rechazo y
la suite global terminar correctamente.

## Functional verification

Se registrará, por AC: petición/respuesta, código, DTO, IDs, revisión y estado. Para los
negativos, el motivo y la ausencia de escritura. El arranque del proceso no acredita la
funcionalidad. La verificación de no escritura compara tablas y `schema_version` antes/después.
La comprobación de contrato E2.6 usa la respuesta directa de `monthlyFlow`, no una suma
manual de subtotales.

## Browser verification (web)

- Playwright real con MFA; sin bypass.
- Resoluciones 1440×1000 y 390×844; capturas en `artifacts/e4-7/` (ignoradas por Git).
- Recorridos: plan, previsión, realidad por Ciclo, archivo, márgenes, patrimonio opcional,
  drill-down y vuelta, estados parcial/ND/NoAcreditada/Solapada/error/sesión expirada.
- Teclado: orden de foco, activación de enlaces y `details`; foco visible.
- Comprobar que ningún estado depende solo del color; que no hay scroll horizontal a 390; que
  los importes no aparecen en URLs ni en logs de red.
- Revisión de accesibilidad básica; no se declara auditoría WCAG completa.

## Criterios de salida

- Todos los AC en PASS o `BLOCKED` con causa externa verificable (E4.5/DT7, D8-M, D8-Z,
  D8-F, E4.9/E4.11); ningún `BLOCKED` se presenta como completado.
- Ningún AC en PASS por inspección, por arranque del proceso o por reutilizar evidencia de otra
  revisión.
- Sin `totalAnual` en DTO/UI; sin suma de archivo al Ciclo; sin `HastaCorte` anualizado; sin
  previsión como realidad.
- Sin FAIL abiertos, sin regresiones en E2.4/E2.6/E3.6/E4.5 y sin cambios de datos.
- `python3.12 scripts/verify --full` del candidato estable en PASS.
- Capturas 390/1440 inspeccionadas; teclado, foco y estados comprobados.
- Revisión independiente de QA y aprobación de merge separada.
- La entrega no se declara completa si falta E4.5/DT7, si D8-M no está decidido o si E4.9/E4.11
  no existen; en esos casos los AC afectados quedan `UNRUN`/`BLOCKED`, no PASS.

## Limitaciones y siguiente acción

No hay implementación, endpoint, UI ni datos que probar. E4.5 sigue sin DEV y DT7 abierto;
E4.9 está en PR #200 sin merge; E4.11 no tiene SPEC propia en `main` `0b8aade`. D8-M, D8-Z,
D8-F y D8-N siguen abiertos. Este testplan es diseño no ejecutado: cualquier PASS requiere
candidato funcional autorizado, fixtures nuevas y evidencia propia. La siguiente acción es que
el coordinador lleve las seis decisiones materiales de la SPEC25 a Álex y al usuario; la
aprobación de la spec no autoriza DEV25 ni merge.
