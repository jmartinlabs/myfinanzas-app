# 25 — E4.7 Resumen anual y flujo completo trazable: Test plan

Status: **APPROVED — SPEC25 y test plan aprobados por el usuario el 2026-11-04.**
Diseño de pruebas con **ejecución local DEV25 el 2026-11-04** (ver §Ejecución local DEV25) y
**revisión QA-01 local el 2026-11-09** (ver §Revisión QA-01). E4.7-AC3 sigue en cumplimiento
parcial; AC18 sigue PARCIAL; AC10–AC15 siguen BLOCKED por E4.5/DT7; AC19 se documenta **N/A**
porque E4.7 no publica el cociente de meses; AC25 queda verificado en local. Existe un
candidato publicado en PR #210 (rama `feat/e47-resumen-anual`); el merge requiere autorización
separada. No hay tablas, DDL ni migración nuevas. Ningún AC bloqueado se declara PASS. Este
documento no autoriza datos reales, migración, snapshots ni merge.

Specification: [25-e47-resumen-anual-specification.md](25-e47-resumen-anual-specification.md)
Dictamen funcional de Álex: relay 0142 (2026-11-04), favorable a M-A / Z-A / F-A / N-A;
la aprobación formal de la SPEC y de las seis decisiones es del usuario (2026-11-04). No autoriza
de la spec.
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
Base de contenido: `main` `b3f4ed9` (2026-11-04). Rama documental: `docs/e47-candidate`
(base `b3f4ed9`). Todos los importes e IDs de las fixtures son ficticios y proceden de
documentos ya aprobados; no se introducen datos personales ni cifras de negocio nuevas.

**Leyenda de estado:** `UNRUN` = diseñado y no ejecutado; `BLOCKED` = no ejecutable por una
dependencia externa; `PARCIAL` = cumplimiento parcial documental/contractual, **no PASS**;
`N/A` = no aplicable al alcance aprobado, no es PASS ni FAIL; `PASS (local)` = ejecutado en el
candidato local con comando, entorno y evidencia propios, sin CI Linux ni QA independiente;
`PASS`/`FAIL` completos exigen además el gate canónico y la revisión independiente. Resultado
local vigente: AC01, AC02, AC04–AC09, AC16, AC17, AC20–AC27 (salvo AC19) en `PASS
(local)`; AC03 y AC18 en `PARCIAL`; AC10–AC15 en `BLOCKED` por E4.5/DT7; AC19 en `N/A`. Las
dependencias se indican en la columna de gate, sin convertir la falta de dependencia en un
PASS.

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
  `python3.12 scripts/verify --base b3f4ed9 --head <SHA>` y, cuando corresponda,
  `python3.12 scripts/verify --full`. En esta rama documental solo se ejecutan validaciones
  de estructura; no se ejecutan suites financieras por una especificación.
- **Registro.** PASS/FAIL/UNRUN/BLOCKED/PARCIAL con comando, entorno, SHA y evidencia. No se
  declara PASS por inspección ni se reutiliza evidencia de otra revisión.

## Base funcional del dictamen (relay 0142)

El dictamen de Álex recomienda, **sin sustituir la aprobación del usuario**:

- **D8-M / M-A:** publicar solo `margenEstructural` y `margen frente a nómina real` de E2.6 por
  Ciclo, con etiqueta «márgenes del plan», estado y cobertura; `margen medio` y `margen real
  puntual` como `No disponible` DT8. E4.7-AC3 queda **PARCIAL**, no PASS completo.
- **D8-Z / Z-A:** sin cocientes anuales; coste esencial `0` → `mesesCubiertos` `No disponible`;
  dos decimales solo presentación, sin redondear el origen; magnitud no publicada → `No aplica`.
- **D8-F / F-A:** filtros funcionales principales ejercicio/cobertura y secundarios Ciclo/Partida;
  sin CSV/PDF en el primer DEV; 1440 tabla compacta, 390 tarjetas; QA visual separada.
- **D8-N / N-A:** `No aplica` (no existe en alcance/diseño) vs `No disponible` (existe, falta
  fuente/verificación), con motivo visible, nunca `0` ni celda vacía.
- **Patrimonio:** contexto separado E4.3/E4.4 solo al mismo corte verificable, con estado y
  cobertura; sin patrimonio neto, sin sumar valoración + deuda + flujo.
- **Gate E4.5/DT7:** primer alcance vivo de solo lectura desacoplado de E4.9; sin E4.5/DT7 no
  hay archivo anual verificado ni total anual; AC10–AC15 `UNRUN`/`BLOCKED`; sin fotos
  E4.9/E4.11, «cálculo vivo, sin foto».

## Entornos previstos

| Entorno | Uso | Límite |
| --- | --- | --- |
| macOS local | Bun 1.4.3, Python 3.10+, Chromium/Playwright 1.64.1; iteración | No sustituye CI Linux |
| Linux CI | Ubuntu 24.04, Bun/age/Chromium preparados; full del SHA candidato | Gate final del DEV |
| Fixtures | Bases ficticias, MFA real local, sin datos personales | Nunca Excel, DB real, claves o VPS |
| Documental actual | `python3 scripts/validate-template`, `check-project`, `test-validator`, `git diff --check` | Solo estructura; no valida E4.7 |

## Ejecución local DEV25 (2026-11-04)

**Candidato:** rama `feat/e47-resumen-anual`, publicada en PR #210, base `main` `90cd5dc`; commits DEV-01
`293ef16`, DEV-02 `d0c5401`, DEV-03 `130b27f`, QA `60f18f8` y corrección final QA (este
commit). Commit local, sin datos reales y sin migración. La publicación y el merge requieren
autorización separada.

**Entorno:** macOS local; Bun 1.4.3; TypeScript 7.0.2; Chromium/Playwright 1.64.1; 2026-11-04.
No sustituye la CI Linux ni la revisión independiente de QA.

| Comprobación | Comando real | Resultado |
| --- | --- | --- |
| Tipos | `bun run typecheck` | PASS (exit 0) |
| Build cliente | `bun run build` | PASS (exit 0); aviso de chunk >500 kB ya existente |
| API E4.7 + motores | `NODE_ENV=test bun test apps/api/src/resumen-anual.test.ts apps/api/src/flujo-mensual.test.ts apps/api/src/plan-anual.test.ts apps/api/src/pendientes.test.ts` | 48 pass / 0 fail (8 de E4.7 y 40 de los motores) |
| API E4.6 | `NODE_ENV=test bun test apps/api/src/resumen-inicio.test.ts` | 18 pass / 0 fail |
| API E4.7 + E4.6 + motores | `NODE_ENV=test bun test apps/api/src/resumen-anual.test.ts apps/api/src/resumen-inicio.test.ts apps/api/src/flujo-mensual.test.ts apps/api/src/plan-anual.test.ts apps/api/src/pendientes.test.ts` | 66 pass / 0 fail |
| E2E E4.7 | `bunx playwright test tests/e2e/resumen-anual.spec.ts` | 5 pass / 0 fail |
| Regresión inicio/temas | `bunx playwright test tests/e2e/inicio.spec.ts tests/e2e/theme.spec.ts` | 7 pass / 0 fail |
| Capturas | `artifacts/e4-7/*.png` | 7 capturas: tres temas a 1440/390 y el estado vacío |

**Lectura de la matriz (DEV25, histórica).** `PASS (local)` significa que la comprobación se
ejecutó en este candidato y entorno con el comando indicado; no es PASS de CI Linux ni de QA
independiente. AC07, AC08 y AC09 se verificaron en el DTO/API; las capturas E2E cubren la
composición de 2026. `PARCIAL` y `BLOCKED` conservan su causa. En DEV25, AC02, AC18, AC20, AC21
y AC23 quedaron `PARCIAL` por los límites de evidencia indicados; AC22 quedó `PARCIAL` porque
solo acreditaba una **comprobación parcial de contraste**, no una auditoría WCAG; AC19 quedó
`UNRUN`. La **revisión QA-01 (2026-11-09)** reevalúa AC02, AC20, AC21, AC22 y AC23 y documenta
AC19; la matriz siguiente refleja el resultado vigente. AC25 se verificó con dos consultas
retenidas en la misma pestaña; **no es concurrencia multi-cliente**. **No se declara E4.7
completa, PASS del roadmap ni merge.**

**Semántica de `cobertura=Completa` con `sinLinea`.** El filtro se aplica a la cobertura de
cada Partida publicada por E2.4. Una Partida con ejecución verificada y corte 31/12 puede
aparecer como `Completa` aunque no tenga línea de presupuesto (`sinLinea`); en ese caso
`CarrilPlan.estado` y la cobertura del carril son `Parcial`, porque el plan no cubre todas las
Partidas. No se oculta la Partida ni se inventa un presupuesto.

**Evidencia sintética.** La fixture `apps/api/test-support/resumen-anual-fixture.ts` usa solo IDs
e importes ficticios ya documentados (C007/C008, F-ARCHIVO y F-MARGEN no se conectan porque E4.5
no existe). No se usan Excel, bases reales, credenciales ni datos personales. Las capturas se
guardan en `artifacts/e4-7/`, ignorado por Git.

## Corrección QA (2026-11-04)

Commit local de corrección sobre `60f18f8`. No se modifica E4.9.

| Hallazgo | Corrección aplicada | Evidencia |
| --- | --- | --- |
| B1 — Ciclo abierto eterno | `tocaEjercicio` acota el Ciclo por `fin ?? corte ?? inicio`; un ejercicio posterior al corte vivo no hereda Ciclos ni patrimonio | `resumen-anual.test.ts` «B1: un Ciclo abierto no se atribuye a años futuros» (2030) |
| B2 — Patrimonio/deuda | La deuda se lee con `getDeudaCompleta` en el mismo corte y solo se aplica el filtro Q7 de presentación (no hipotecaria activa). Se expone `corte` en valoración y deuda | `resumen-anual.test.ts` «B2: deuda E4.4 al corte y solo no hipotecaria activa»; UI «Corte aplicado» |
| M1 — Cobertura del plan | La cobertura de cada Partida deriva de E2.4 (`Completa` solo si el corte es 31/12); el filtro y el estado del carril dejan de ser degenerados | `resumen-anual.test.ts` «AC04/07/19/23» con `annualProvider` completo |
| M2 — Revisión | La huella incluye patrimonio, valoración y deuda al corte | `resumen-anual.test.ts` «M2: la revisión cambia al cambiar la deuda del patrimonio» |
| M3 — Matriz | AC02, AC18, AC20, AC21, AC22 y AC23 rebajados a `PARCIAL`; AC22 declara contraste parcial, no WCAG | Esta matriz |
| L1 — Estados y márgenes | `No aplica` con motivo en Diferencia; margen con `corte` real (no `null` fabricado); estados de corte humanizados; `margenes.estado` coherente (ND si ningún margen publica valor) | UI `ResumenAnual.tsx`; `resumen-anual.test.ts` |
| L2 — Contraste | Se declara comprobación parcial; no se afirma auditoría WCAG completa | Este testplan |
| N1 — Reloj E2E / deuda | El servidor E2E fija `now` al 2027-02-01; MFA y datos usan el mismo instante. E2E assertea deuda `1.020,00` y cobertura `Parcial`; si la lectura falla no se muestra «Corte aplicado» | `tests/e2e/resumen-anual.spec.ts`; `artifacts/e4-7/` |
| N2 — Motor de deuda | `fuente.motor` de deuda es `E4.4 getDeudaCompleta` | `resumen-anual.test.ts`; E2E |
| N3 — Plan con `sinLinea` | `CarrilPlan.estado` es `Parcial` si alguna Partida no tiene presupuesto, aunque su ejecución sea completa | `resumen-anual.test.ts` «AC04/07/19/23» |
| N4 — Agregación Q7 | Extraído `deuda-no-hipotecaria.ts` (listado paginado, predicado Q7 y agregación), usado por E4.6 y E4.7 sin cambiar el resultado de E4.6 | `resumen-inicio.test.ts` 18 pass; `resumen-anual.test.ts` |

**Comandos de la corrección:** `bun run typecheck` PASS; `bun run build` PASS (aviso de chunk
preexistente); `bun test apps/api/src/resumen-anual.test.ts apps/api/src/resumen-inicio.test.ts`
26 pass / 0 fail; `bun test` E4.7 + motores 48 pass / 0 fail; E2E E4.7 5 pass / 0 fail;
regresión inicio/temas 7 pass / 0 fail. Capturas regeneradas en `artifacts/e4-7/`.

**Integración con E4.9.** `style.css` mantiene el bloque `.e47-` separado y documenta el
conflicto previsible con `.cierre-*`; no se modifica ningún archivo de E4.9.

## QA independiente (2026-11-04)

Dictamen **APTO CON RESERVAS** sobre `05aee71`/`25c2cd5`. No sustituye la aprobación de merge,
que es separada. Reservas registradas: AC02 (IDs/contexto por cifra no visibles en la tabla de
1440), AC18 (F-MARGEN numérico no ejecutado), AC20 (falta la variante sin patrimonio), AC21 (no
se activaron todos los enlaces), AC22 (contraste parcial, no auditoría WCAG) y AC23 (no se probó
la degradación de un único carril). AC25 se cierra en esta entrega con la prueba E2E de descarte
de respuesta antigua; AC19 sigue `UNRUN` porque E4.7 no publica el cociente de meses. No se
declara E4.7 completa, PASS del roadmap ni merge.

La revisión QA-01 posterior (2026-11-09) añade evidencia para AC02, AC20, AC21, AC22 y AC23;
no sustituye esta QA independiente ni la aprobación de merge.

## Revisión QA-01 (2026-11-09)

Rama local `qa01/e47-anual`, base `test` `dbfe507`; solo módulos E4.7. No cambia el contrato
aprobado, la API pública, el esquema, la migración ni datos reales. Las modificaciones se
limitan a pruebas y a la traza compacta de fuente/IDs/contexto en las tablas de 1440 de
`ResumenAnual.tsx`.

| Comprobación | Comando real | Resultado |
| --- | --- | --- |
| Candidato | `4dca8a7` · rama `qa01/e47-anual` | Local |
| Entorno | macOS · Bun 1.4.3 · Playwright | Local |
| CI full | run `42674650276` | PASS |
| API E4.7 | `NODE_ENV=test bun test apps/api/src/resumen-anual.test.ts` | 13 pass / 0 fail |
| API E4.7 + E4.6 | `NODE_ENV=test bun test apps/api/src/resumen-anual.test.ts apps/api/src/resumen-inicio.test.ts` | 31 pass / 0 fail |
| API E4.7 + motores | `NODE_ENV=test bun test apps/api/src/resumen-anual.test.ts apps/api/src/flujo-mensual.test.ts apps/api/src/plan-anual.test.ts apps/api/src/pendientes.test.ts` | 53 pass / 0 fail |
| API patrimonio | `NODE_ENV=test bun test apps/api/src/deuda-completa.test.ts apps/api/src/e43-api.test.ts` | 20 pass / 0 fail |
| E2E E4.7 | `bunx playwright test tests/e2e/resumen-anual.spec.ts` | 5 pass / 0 fail |
| Tipos | `bun run typecheck` | PASS (exit 0) |
| Build | `bun run build` | PASS (exit 0); aviso de chunk >500 kB preexistente |
| Baseline canónico | `python3.12 scripts/verify baseline` | PASS |

**Pruebas añadidas o reforzadas.**

- `resumen-anual.test.ts` «AC02: cada cifra expone motor, IDs, contexto, estado y cobertura»:
  recorre plan, realidad y márgenes; comprueba `fuente.motor`, `fuente.ids`, `contexto`,
  `estado`, `cobertura` y `motivo` sin recalcular cifras.
- `resumen-anual.test.ts` «AC20: patrimonio opcional separado, al mismo corte y sin suma
  publicada»: E4.3/E4.4 al mismo corte, sin `patrimonioNeto`, `totalGeneral`, `totalPatrimonio`
  ni `flujoCompleto`. La variante sin corte comparable ya cubierta se mantiene.
- `resumen-anual.test.ts` «AC21: enlaces de trazabilidad sin importes y con contexto por ID»:
  plan, previsión, flujo por Ciclo, movimientos, inversiones y deudas; ninguna URL contiene
  importes.
- `resumen-anual.test.ts` «AC23: un fallo de E2.4 degrada solo el carril plan»: el carril plan
  pasa a `No disponible`, mientras realidad conserva C007 y archivo sigue `BLOCKED`; no hay
  `0` inventado.
- `resumen-anual.test.ts` «AC19: no publica mesesCubiertos ni cociente anual; No aplica con
  motivo»: guarda de alcance Z-A; el DTO no contiene `mesesCubiertos`, `costeEsencial`,
  `ratioAnual`, `cocienteAnual` ni `margenMedioAnual`; la vista declara el motivo en «Cómo se
  calcula y qué falta».
- E2E `resumen-anual.spec.ts`: la tabla de 1440 muestra motor, IDs y contexto por cifra
  (plan y realidad); las tarjetas de 390 conservan el detalle; el test AC21 activa **todos**
  los enlaces y conserva ejercicio, Ciclo, Partida y Cobertura al volver; AC22 comprueba
  icono+texto en los estados y foco visible a 1440 y 390; AC23 simula la degradación de un
  único carril; AC20 comprueba la ausencia del bloque de patrimonio (`patrimonio:null`) sin
  fabricar una cifra.

**AC19 — aplicabilidad.** E4.7 **no publica** `mesesCubiertos` ni ningún cociente de coste
esencial. El carril plan solo expone la clasificación `esencial` de E2.4 (`Sí`/`No`/`Pendiente`),
que no es un coste ni un ratio. El AC19 es condicional («Si E4.7 muestra el contexto de coste
esencial»); como el alcance aprobado Z-A no publica el cociente, se registra **`N/A`**, no PASS.
La prueba de guarda verifica la ausencia de campos y la nota visible
«D8-Z: No aplica mesesCubiertos ni cocientes anuales…». No se introduce fórmula, ratio ni
división por cero.

**Reconciliación de la matriz.** AC02, AC20, AC21, AC22 y AC23 pasan de `PARCIAL` a `PASS
(local)` con la evidencia anterior. AC18 sigue `PARCIAL` porque el valor numérico de F-MARGEN
no se ejecuta: la fixture devuelve `margenEstructural` `No disponible` (0/12 meses de nómina) y
la prueba solo verifica la composición y el estado, no `−50,00`. AC03 sigue `PARCIAL` por DT8;
AC10–AC15 siguen `BLOCKED` por E4.5/DT7; AC19 queda `N/A`. **No se declara E4.7 completa,
PASS del roadmap ni merge.** La QA independiente y la aprobación de merge siguen siendo
separadas.

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
frente a nómina real») `No disponible` por `nómina.valor:null`. Ambos se rotulan como
**márgenes del plan**, no ahorro ejecutado. No se calcula `100.00` como margen real, ni
«margen medio»/«margen real puntual», que son `No disponible — DT8`. Este caso sostiene el
**cumplimiento PARCIAL** de E4.7-AC3, nunca su PASS.

### F-PATRIMONIO — contexto opcional al corte

Solo si el alcance incluye patrimonio. Fixture ficticia de SPEC24: agregado E4.3
`1197.50` con cobertura de valoración completa y resultado `Parcial 1/2`; deuda E4.4
no hipotecaria con `total:null`, `subtotal:1020.00`, cobertura `2/3`, **al mismo corte
verificable** que E4.3. Esperado: dos bloques separados, cada uno con estado/cobertura, sin
patrimonio neto y sin suma valoración + deuda + flujo. Variante sin corte comparable: ambos
bloques `No disponible` con motivo, sin cifra fabricada.

### F-PREVISION — simulación separada

E2.5 no publica un contrato anual consumible para el ejercicio en el alcance actual. Esperado:
carril `No disponible` con motivo; si en el futuro existe contrato, la simulación se muestra
aparte y no se suma al año ni al Ciclo.

### F-COSTE-CERO — coste esencial 0

Coste esencial verificado `0` y `mesesCubiertos` solicitado. Esperado: `mesesCubiertos`
`No disponible`; nunca `0`, infinito ni «cobertura total». Los dos decimales de presentación no
redondean el valor de origen. Si E4.7 no publica el cociente, `No aplica` con motivo, no `0`.
No se introduce ningún ratio anual nuevo.

### F-FILTROS — alcance F-A

Fixture ficticia sin importes nuevos. Esperado para D8-F: filtros principales de ejercicio y
cobertura, secundarios de Ciclo y Partida; sin CSV ni PDF en el primer DEV; 1440 tabla compacta
y 390 tarjetas; sin scroll horizontal a 390; los filtros se conservan al volver de un enlace y
la URL no contiene importes. La QA visual/responsive es un gate separado.

### F-ERROR-FUENTE / F-CONCURRENCIA

- `F-ERROR-FUENTE`: una fuente (por ejemplo, E4.5 o E2.6) devuelve error o timeout; el resto
  debe seguir visible.
- `F-CONCURRENCIA`: se modifica una fuente entre la carga y el reintento, o se lanzan dos
  consultas con contextos distintos; no se mezclan revisiones ni se acepta una respuesta
  antigua.

## Matriz de aceptación

**Resultado local vigente (QA-01, 2026-11-09).** AC01, AC02, AC04–AC09, AC16, AC17,
AC20–AC27 (salvo AC19) quedan `PASS (local)` con la evidencia de §Revisión QA-01.
AC03 y AC18 quedan `PARCIAL`: AC03 por DT8; AC18 porque no se ejecuta el valor numérico de
F-MARGEN. AC10–AC15 quedan `BLOCKED` por E4.5/DT7. AC19 queda `N/A` porque E4.7 no publica el
cociente de meses; su guarda de alcance está en «AC19». AC25 conserva la prueba de descarte de
respuesta antigua en la misma pestaña. La columna «Gate» indica la dependencia que impide
ejecutar un AC; no es un resultado.

| AC | Tipo | Precondición y acción | Resultado esperado | Método / comando propuesto | Gate / dependencia | Evidencia esperada | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.7-AC01 | Negativo / contrato | Snapshot de tablas y `schema_version`; GET del resumen; intentar POST/PATCH/DELETE | Sin cambios en hechos, planes, cierres, auditoría, configuración ni `schema_version`; solo GET; no hay ruta de escritura | API + SQLite; `bun test apps/api/src/resumen-anual.test.ts` | DEV25 | Diff de tablas, códigos y `schema_version` | PASS (local) |
| E4.7-AC02 | Positivo / contrato | Abrir cada cifra y su detalle en `F-E26-C007` | Cada cifra declara `fuente.motor`, IDs, contexto, estado y cobertura; la UI no calcula ni rellena | `bun test apps/api/src/resumen-anual.test.ts` + Playwright | DEV25 | DTO («AC02») y E2E con tabla 1440 y tarjetas 390. Los IDs vacíos se muestran como ausencia: no se afirma que toda celda sin IDs declare `IDs:` | PASS (local) |
| E4.7-AC03 | Positivo / contrato | Comparar cada bloque incluido con su motor al mismo contexto | Igualdad exacta al céntimo con el propietario de ese bloque; ninguna cifra se reimplementa. **Cumplimiento PARCIAL**: `margen medio` y `margen real puntual` quedan ND por DT8 y no pueden verificar igualdad; AC3 no puede PASS completo | `bun test apps/api/src/resumen-anual.test.ts` + suites de motores | DEV25; E4.5 para archivo; D8-M y definición futura | Cumplimiento parcial documental (dos márgenes + ND DT8); sin PASS | PARCIAL |
| E4.7-AC04 | Negativo / contrato | Consultar un ejercicio con cobertura parcial (`F-E26-C007`) | El DTO no contiene `totalAnual`; no hay etiqueta «total anual»; todo agregado monetario del propietario lleva `alcance`, `estado`, `subtotalConocido` y `motivo` | API + revisión de DTO/UI | DEV25 | DTO; ausencia de campo y texto | PASS (local) |
| E4.7-AC05 | Límite / contrato | `F-E26-C007` con el contrato real de E2.6 | `ingresos`, `gasto`, `extraordinaria` y `nomina` con `valor:null`, `subtotal` conocido y `Parcial`; `operativo` y `margenReal` `No disponible`; E4.7 no rellena ni anualiza | `bun test apps/api/src/resumen-anual.test.ts` | DEV25 | DTO con estados exactos | PASS (local) |
| E4.7-AC06 | Negativo / límite | Dos Ciclos ficticios del mismo ejercicio, ambos `Parcial` | El carril realidad lista los Ciclos y sus subtotales; no publica total anual ni suma de subtotales como año; `agregadoAnual.estado=No aplica` | API + revisión de DTO | DEV25 | DTO con dos Ciclos y ausencia de total | PASS (local) |
| E4.7-AC07 | Límite | Una fuente devuelve `null` y otra `0.00` verificado (`F-E26-C007` y variante cero) | `null` se muestra `No disponible`; `0,00` se muestra `Cero verificado`; no se sustituyen | API + Playwright | DEV25 | DTO y captura | PASS (local) |
| E4.7-AC08 | Límite / año-Ciclo | `F-C008` con hechos en 2026 y 2027 | Aparece en ambos ejercicios con el mismo `cicloId`, fechas y métricas de Ciclo; sin prorrateo ni copia; el plan usa el año natural | API + Playwright | DEV25 | Dos DTO comparables y capturas | PASS (local) |
| E4.7-AC09 | Límite / año-Ciclo | Gasto `28/12/2026` en Ciclo `20/12–19/01` y aportación `25/01/2027` (escenario SPEC21) | El plan anual usa 2026; el flujo usa el Ciclo; ambos visibles; no se reasigna el hecho | API + Playwright | DEV25 | DTO y captura | PASS (local) |
| E4.7-AC10 | Límite / archivo | `F-HASTACORTE`: E4.5 devuelve `alcanceTotal=HastaCorte` | La UI dice «hasta corte» y no «anual»; no se publica total anual; el total hasta corte conserva su estado | API + Playwright | E4.5 DEV / DT7; DEV25 | Sin evidencia; UNRUN hasta candidato, BLOCKED por E4.5/DT7 | BLOCKED |
| E4.7-AC11 | Negativo / archivo | `F-NOACREDITADA`: E4.5 devuelve `estadoCobertura=NoAcreditada` | No certifica Ejecutado/Diferencia/total; muestra «Universo no acreditado», motivo y subtotal separable si existe; no `0`, no `Parcial` | API + Playwright | E4.5 DEV / DT7; DEV25 | Sin evidencia; UNRUN hasta candidato, BLOCKED por E4.5/DT7 | BLOCKED |
| E4.7-AC12 | Positivo / archivo | `F-ARCHIVO-UNICO`: E4.5 combina `1200.00 + 300.00` sin solape | E4.7 muestra `1500.00` de E4.5 una vez; no suma componentes; no duplica amortización | `bun test apps/api/src/resumen-anual.test.ts` | E4.5 DEV / DT7; DEV25 | Sin evidencia; UNRUN hasta candidato, BLOCKED por E4.5/DT7 | BLOCKED |
| E4.7-AC13 | Negativo / archivo | `F-ARCHIVO-SOLAPE`: solape no separable | Componentes visibles; total/subtotal `null`; no `1500` ni `1520` como total; `Solapada`/`NoVerificable` y motivo | API + Playwright | E4.5 DEV / DT7; DEV25 | Sin evidencia; UNRUN hasta candidato, BLOCKED por E4.5/DT7 | BLOCKED |
| E4.7-AC14 | Negativo / no suma | Archivo anual y flujo del Ciclo en el mismo ejercicio | Se muestran en carriles separados; no se suman; el archivo no entra en el plan mensual ni en el flujo | API + Playwright | E4.5 DEV / DT7; DEV25 | Sin evidencia; UNRUN hasta candidato, BLOCKED por E4.5/DT7 | BLOCKED |
| E4.7-AC15 | Negativo / archivo | Consultar ingresos históricos | `No disponible` con motivo; no se reconstruyen desde plan/E2.6/archivo; no `0` | API + revisión de DTO | E4.5 DEV / DT7; DEV25 | Sin evidencia; UNRUN hasta candidato, BLOCKED por E4.5/DT7 | BLOCKED |
| E4.7-AC16 | Negativo / previsión | `F-PREVISION` con simulación E2.5 y flujo real | La previsión se muestra aparte; no se suma al año ni al Ciclo; no se etiqueta como realidad | API + Playwright | DEV25 | DTO y captura | PASS (local) |
| E4.7-AC17 | Positivo / ajuste | E3.6 publica `G_n`/`S_aj` para un Ciclo (`F-E26-C007`) | Se muestran en bloque propio, con estado y motivo; `S_aj` es `Parcial`; no se suman al bruto E2.6 ni se convierten en margen | `bun test apps/api/src/resumen-anual.test.ts` + `pendientes.test.ts` | DEV25 | DTO con ambos bloques | PASS (local) |
| E4.7-AC18 | Límite / márgenes | `F-MARGEN`: media `1750.00` parcial, Base `1800.00`, nómina `valor:null` | `margenEstructural=−50.00 Parcial`; `margenReal` ND; ambos con etiqueta «márgenes del plan»; `margen medio` y `margen real puntual` ND «DT8»; no hay margen anual ni promedio | API + Playwright | D8-M; E4.7-AC3 es PARCIAL | DTO y captura; sin PASS de AC3 | PARCIAL |
| E4.7-AC19 | Límite / coste 0 | `F-COSTE-CERO` y cociente no definido; si E4.7 muestra el contexto de coste esencial | E4.7 no publica el cociente: `N/A` con motivo visible; no se divide por cero; sin ratio anual nuevo | `bun test apps/api/src/resumen-anual.test.ts` «AC19» + revisión de DTO/UI | D8-Z | DTO sin `mesesCubiertos`/`costeEsencial`/`ratioAnual`/`cocienteAnual`/`margenMedioAnual`; nota visible | N/A |
| E4.7-AC20 | Límite / patrimonio | `F-PATRIMONIO` con y sin inclusión de patrimonio; variante sin corte comparable | Si entra: E4.3 y E4.4 al mismo corte verificable, separados y cada uno con estado/cobertura; sin patrimonio neto ni suma valoración + deuda + flujo. Si no hay corte comparable: ambos `No disponible`, sin cifra fabricada. Si no entra: bloque ausente o `No aplica` con motivo | `bun test apps/api/src/resumen-anual.test.ts` «AC20» + Playwright (incluido, sin corte y `patrimonio:null`) | E4.3/E4.4; decisión de alcance | DTO y E2E; el alcance API aprobado incluye patrimonio, la ausencia se verifica en el límite UI | PASS (local) |
| E4.7-AC21 | Positivo / enlaces | Activar cada enlace de la vista y volver | Ruta/ID correctos; se conserva el ejercicio y los filtros; la URL no contiene importes ni datos personales | Playwright «AC21» (plan, nómina, flujo por Ciclo, movimientos, inversiones y deudas) | DEV25 | URLs, foco y DTO «AC21» | PASS (local) |
| E4.7-AC22 | Positivo / UX | `F-FILTROS`: 1440×1000 y 390×844; filtros principales ejercicio/cobertura y secundarios Ciclo/Partida; teclado, foco y contraste automatizado | Cuatro carriles legibles, sin scroll horizontal; estado icono+texto; foco visible; sin tema/tokens nuevos; sin CSV/PDF en el primer DEV | Playwright + capturas | D8-F; DEV25 | E2E con badges icono+texto, foco a 1440/390 y comprobación **automatizada** de contraste; **no es una auditoría WCAG** | PASS (local) |
| E4.7-AC23 | Negativo / estados | Forzar vacío, carga, parcial, ND, error de una fuente y reintento | Estados diferenciados; solo el carril afectado degrada; no `0`; el reintento conserva la selección | Playwright con intercepción de red + `bun test apps/api/src/resumen-anual.test.ts` «AC23» | DEV25 | E2E (vacío, 500, 401, reintento y degradación de un carril) y DTO con plan ND y realidad intacta | PASS (local) |
| E4.7-AC24 | Negativo / seguridad | Acceso anónimo, sesión expirada, error 500 e intento de escritura | 401/reautenticación sin datos; errores genéricos sin SQL ni importes; `no-store`; no hay métodos de escritura | API + HTTP | DEV25 | Respuestas y cabeceras | PASS (local) |
| E4.7-AC25 | Límite / concurrencia | Dos consultas con ejercicios distintos; la primera se retiene y la segunda completa antes; después se libera la primera | No se mezclan revisiones; la respuesta antigua se descarta; se conserva el ejercicio y la cobertura seleccionados | `tests/e2e/resumen-anual.spec.ts` «AC25: descarta la respuesta antigua de una consulta retenida» | DEV25 | Prueba E2E 5/5; no es concurrencia multi-cliente | PASS (local) |
| E4.7-AC26 | Negativo / persistencia | Inspeccionar tablas, `schema_version` y artefactos antes/después | Sin tabla, snapshot, caché persistida ni migración; `schema_version` igual; no se persiste el resumen | SQLite + API | DEV25 | Diff de esquema y artefactos | PASS (local) |
| E4.7-AC27 | Límite / cierre | Consultar sin E4.9/E4.11 | Cabecera «cálculo vivo, sin foto»; no hay cierre/foto ni certificación anual; no se simula una foto | API + Playwright | E4.9/E4.11 | DTO y captura | PASS (local) |

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
| Márgenes F-MARGEN | `margenEstructural:−50.00`, `Parcial`; `margenReal:null`, ND; etiqueta «márgenes del plan» | `100.00` de margen real, «ahorro ejecutado» o un margen anual |
| Márgenes no definidos | `margen medio` y `margen real puntual`: `No disponible`, motivo DT8 | Cualquier cifra, promedio o cociente inventado |
| Coste esencial 0 | `mesesCubiertos: No disponible`; 2 decimales no redondean el origen | `0`, infinito, «cobertura total» o redondeo del valor origen |
| Patrimonio opcional | E4.3 `1197.50` y E4.4 `subtotal:1020.00`, separados y al mismo corte verificable | `2217.50` como patrimonio neto, suma con flujo o cifra con corte no comparable |

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
| E4.3 + E4.4 + flujo | «Patrimonio total» o «flujo completo» | Cada bloque tiene corte/cobertura propios; no se suman entre sí |
| Márgenes entre Ciclos | «Margen anual/medio» | No hay fórmula aprobada; DT8 pendiente |

## Regression checks

| Suite | Qué cubre | Cuándo | Estado |
| --- | --- | --- | --- |
| `bun test apps/api/src/flujo-mensual.test.ts` | Contrato real de E2.6, cobertura, `S`, márgenes | Candidato E4.7 | PASS (local) |
| `bun test apps/api/src/plan-anual.test.ts` | E2.4 plan, ejecución, cobertura y equivalente | Candidato E4.7 | PASS (local) |
| `bun test apps/api/src/pendientes.test.ts` | E3.6 `G_n`, `S_aj` y ausencia de total | Candidato E4.7 | PASS (local) |
| `bun test apps/api/src/deuda-completa.test.ts` | E4.4 deuda viva, si el patrimonio entra | Candidato E4.7 | PASS (local) |
| `bun test apps/api/src/e43-api.test.ts` | E4.3 agregado/cobertura, si el patrimonio entra | Candidato E4.7 | PASS (local) |
| `bun test apps/api/src/resumen-anual.test.ts` | Composición E4.7 y AC de contrato | Candidato E4.7 | PASS (local) |
| `bun run typecheck` | Tipos del DTO y UI | Candidato | PASS (local) |
| `bun run build` | Cliente | Candidato | PASS (local) |
| `bunx playwright test tests/e2e/resumen-anual.spec.ts` | 1440/390, enlaces, estados y sesión E4.7 | Candidato | PASS (local) |
| `bun run test:e2e` | Suite E2E completa | Candidato | UNRUN |
| `python3.12 scripts/verify baseline` | Baseline canónico local | Candidato | PASS (local) |
| `python3.12 scripts/verify --base b3f4ed9 --head <SHA>` | Gate canónico del candidato | Candidato estable | UNRUN |
| `python3.12 scripts/verify --full` | Full del candidato | Candidato estable | UNRUN |
| `git diff --check` | Whitespace/errores del diff documental | Ahora y candidato | PASS (local) |

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

- Todos los AC en PASS, `PARCIAL` documentado, `N/A` justificado o `BLOCKED` con causa externa
  verificable (E4.5/DT7, D8-M, D8-Z, D8-F, E4.9/E4.11); ningún `PARCIAL`, `N/A` ni `BLOCKED`
  se presenta como completado. E4.7-AC3 solo puede quedar `PARCIAL` mientras «margen medio» y
  «margen real puntual» carezcan de definición aprobada.
- Ningún AC en PASS por inspección, por arranque del proceso o por reutilizar evidencia de otra
  revisión.
- Sin `totalAnual` en DTO/UI; sin suma de archivo al Ciclo; sin `HastaCorte` anualizado; sin
  previsión como realidad; sin patrimonio neto ni suma valoración + deuda + flujo.
- Sin FAIL abiertos, sin regresiones en E2.4/E2.6/E3.6/E4.5 y sin cambios de datos.
- `python3.12 scripts/verify --full` del candidato estable en PASS.
- Capturas 390/1440 inspeccionadas; teclado, foco y estados comprobados.
- QA independiente emitida (**APTO CON RESERVAS**) y aprobación de merge separada.
- La entrega no se declara completa si falta E4.5/DT7, si D8-M no está decidido o si E4.9/E4.11
  no existen; en esos casos los AC afectados quedan `UNRUN`/`BLOCKED`/`PARCIAL`, no PASS.

## Limitaciones y siguiente acción

Existe un candidato corregido de DEV25 publicado en PR #210 (rama `feat/e47-resumen-anual`,
commits DEV-01/DEV-02/DEV-03 más las correcciones QA) y una revisión local QA-01 posterior
(rama `qa01/e47-anual`, base `test` `dbfe507`, 2026-11-09) con 13 pruebas API de E4.7, 5 E2E y
las regresiones de motores en PASS local. Ninguno se ha fusionado. E4.5 sigue sin DEV y DT7
abierto; E4.9 está en PR #200 sin merge; E4.11 tiene SPEC29 en `main` pero sin DEV conocido.
Las seis decisiones D8-M/Z/F/N, patrimonio y gate E4.5/DT7 están aprobadas por el usuario el
2026-11-04; D8-M mantiene E4.7-AC3 en `PARCIAL`. AC18 sigue `PARCIAL` (F-MARGEN numérico no
ejecutado); AC10–AC15 siguen `BLOCKED` por E4.5/DT7; AC19 queda `N/A` porque no se publica el
cociente de meses; AC02, AC20, AC21, AC22, AC23 y AC25 quedan `PASS (local)` tras QA-01. La QA
independiente ya emitió **APTO CON RESERVAS** sobre `05aee71`/`25c2cd5`; QA-01 no la sustituye.
La autorización de merge sigue siendo separada. Ningún AC bloqueado se declara PASS ni se
presenta E4.7 como completa.
