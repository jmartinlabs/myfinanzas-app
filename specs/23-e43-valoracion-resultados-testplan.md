# 23 — E4.3 Valoración y resultados de posiciones: Test plan

Status: **APROBADO — DISEÑO DE PRUEBAS; NO EJECUTADO.** 2026-11-03, revisión `acc2d98`
(PR #175) sobre `main` `5d903f4`. Ningún AC/TP en PASS; no hay candidato funcional de E4.3, ni
implementación, endpoints, DDL ni datos reales. DEV E4.3 no autorizado.
Specification: [23-e43-valoracion-resultados-specification.md](23-e43-valoracion-resultados-specification.md)
Base: `main` `5d903f4` (2026-11-03), esquema SQLite **v22**.

Antes de implementación, cada AC debe mapearse a su entorno, caso positivo/negativo/límite y
evidencia esperada. Los borradores admiten diseño provisional, nunca implementación ni PASS.

## Estrategia

- **Fixtures sintéticas y deterministas.** Solo identificadores y operaciones ficticias; nunca
  Excel, bases reales, datos personales, credenciales ni secretos.
- **Oráculo independiente.** Los importes esperados se calculan en una tabla de oráculo separada
  del motor; no se compara el motor consigo mismo. Se reutilizan `positionsFor`/`positionsAtDate`
  y `cashAt` de [investment-engine.ts](../apps/api/src/investment-engine.ts) como fuentes de
  hechos, no como oráculo de valoración.
- **API/SQLite futura.** Extender la suite `apps/api` con un `e43-valoracion.test.ts` cuando el
  DEV esté autorizado; esta entrega no crea el archivo. Comprobar respuestas, códigos, DTO,
  auditoría y no escritura.
- **Contrato de lectura.** Probar el DTO de corte, la serie, la cobertura y la elegibilidad por
  fecha exacta; comprobar antes/después que `e43`, `inversion.valoracion` y la foto de SPEC27 no cambian.
- **UI futura.** Playwright real con MFA, 390/1440, capturas ficticias, teclado, foco y
  contraste. Los wireframes siguen pendientes de autorización; no hay pantalla que probar hoy.
- **Verificación canónica.** En el futuro candidato funcional:
  `python3.12 scripts/verify --base <main> --head <SHA>` y, cuando corresponda,
  `python3.12 scripts/verify --full`. En esta rama documental solo se ejecutan validaciones de
  estructura; no se ejecutan suites financieras por una especificación.
- **Registro.** PASS/FAIL/UNRUN/BLOCKED con comando, entorno, SHA y evidencia. No se declara PASS
  por inspección ni se reutiliza evidencia de otro candidato.

## Entornos previstos

| Entorno | Uso | Límite |
| --- | --- | --- |
| macOS local | Bun 1.4.3, Python 3.10+, Chromium/Playwright 1.64.1; iteración | No sustituye CI Linux |
| Linux CI | Ubuntu 24.04, Bun/age/Chromium preparados; full del SHA candidato | Gate final del DEV |
| Fixtures | Bases ficticias, MFA real local, sin datos personales | Nunca Excel, DB real, claves o VPS |
| Documental actual | `python3.12 scripts/validate-template`, `check-project`, `test-validator`, `git diff --check` | Solo estructura; no valida E4.3 |

## Oráculo ficticio E4.3 — diseñado, no ejecutado

Todos los importes son ficticios. No representan datos personales ni el Excel. El efectivo de
S003 parte de una apertura ficticia de 1.000,00 € y recibe una Transferencia de 2.000,00 € el
2026-02-01 y una salida de 300,00 € el 2026-03-01. S007 es otro Saldo `Efectivo`/`Inversiones`
con apertura 500,00 € y sin operaciones.

### Instrumentos y Saldos

| Instrumento | Nombre | Estado | Posición asociada |
| --- | --- | --- | --- |
| `I1001` | Fondo índice demo | Activa | P1 (`S004`), P2 (`S006`) |
| `I1002` | Acción demo | Activa | P3 (`S004`) |
| `I1003` | Fondo heredado demo | Inactiva | P4 (`S006`) |
| `I1004` | Instrumento anulado demo | Activa | Solo grupo anulado; no es posición |
| `I1005` | Fondo manual demo | Activa | P5 (`S006`) |

| Saldo | Tipo / control | Apertura | Uso |
| --- | --- | ---: | --- |
| `S003` | `Efectivo` / `Inversiones` | 1.000,00 | Efectivo del bróker |
| `S004` | `Inversión` / `Inversiones` | — | Posiciones P1 y P3 |
| `S006` | `Inversión` / `Inversiones` | — | Posiciones P2, P4 y P5 |
| `S007` | `Efectivo` / `Inversiones` | 500,00 | Segundo efectivo, sin operaciones |

### Operaciones

| ID | Fecha | Clase | Instrumento | Saldo inversión | Cantidad | Precio | Divisa | Cambio | Importe EUR | Comisión | Estado |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| C1 | 2026-02-10 | Compra | I1001 | S004 | 12,5 | 100,000000 | USD | 0,900000 | 1.125,00 | 5,00 | Vigente |
| V1 | 2026-04-10 | Venta | I1001 | S004 | 5 | 110,000000 | USD | 0,920000 | 506,00 | 2,00 | Vigente |
| C2 | 2026-03-03 | Compra | I1001 | S006 | 3 | 98,000000 | USD | 0,900000 | 264,60 | 0,00 | Vigente |
| C3 | 2026-05-02 | Compra | I1002 | S004 | 4 | 50,000000 | EUR | 1,000000 | 200,00 | 0,00 | Vigente |
| V2 | 2026-05-20 | Venta | I1002 | S004 | 4 | 60,000000 | EUR | 1,000000 | 240,00 | 0,00 | Vigente |
| C4 | 2026-01-15 | Compra | I1003 | S006 | 10 | 20,000000 | EUR | 1,000000 | 200,00 | 0,00 | Vigente |
| C5 | 2026-01-20 | Compra | I1004 | S004 | 2 | 10,000000 | EUR | 1,000000 | 20,00 | 0,00 | Anulada |
| C6 | 2026-02-01 | Compra | I1005 | S006 | 2 | 100,000000 | EUR | 1,000000 | 200,00 | 0,00 | Vigente |

Todas las operaciones usan `S003` como Saldo de efectivo. C5 está anulada: no altera efectivo,
cantidad ni posición, y deja a I1004 como grupo solo anulado.

### Valoraciones

| ID | Posición | Fecha | Tipo | Precio / valor | Divisa | Cambio | EUR | Procedencia |
| --- | --- | --- | --- | ---: | --- | ---: | ---: | --- |
| Q1 | P1 (`S004`/`I1001`) | 2026-03-15 | Automática | 105,000000 | USD | 0,900000 | 1.181,25 | Precio y cambio declarados por el usuario |
| Q2 | P1 | 2026-04-30 | Automática | 120,000000 | USD | 0,950000 | 855,00 | Precio y cambio declarados por el usuario |
| Q3 | P1 | 2026-06-30 | Automática | 130,000000 | USD | 0,900000 | 877,50 | Precio y cambio declarados por el usuario |
| Q4 | P2 (`S006`/`I1001`) | 2026-04-30 | Automática | 120,000000 | USD | 0,950000 | 342,00 | Precio y cambio declarados por el usuario |
| Q5 | P5 (`S006`/`I1005`) | 2026-04-30 | Manual | 205,00 | EUR | 1,000000 | 205,00 | Valor declarado por el usuario |

No hay valoración para P4 (`I1003`). P3 está cerrada y su valoración es `No aplica`. No se
registra ninguna valoración posterior a los cortes que la usan.

### Cálculos de oráculo

| Consulta | Posiciones | Valores | Cobertura valor | Resultados | Cobertura resultado | Efectivo S003 | Efectivo S007 |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| Corte 2026-02-15 | P1, P4, P5 | Ninguno ≤ T | `No disponible` (sin cifra) | Ninguno | `No disponible` (sin cifra) | 1.475,00 | 500,00 |
| Corte 2026-03-31 | P1, P2, P4, P5 | P1 Q1 = 1.181,25 | `Parcial 1/4` | P1 = 56,25 | `Parcial 1/4` | 910,40 | 500,00 |
| Corte 2026-04-30 | P1, P2, P4, P5 | P1 Q2 = 855,00; P2 Q4 = 342,00; P5 Q5 = 205,00 | `Parcial 3/4` | P1 = 236,00; P2 = 77,40 | `Parcial 2/4` | 1.416,40 | 500,00 |
| Corte 2026-06-30 | P1, P2, P3, P4, P5 | P1 Q3 = 877,50; P2 Q4 = 342,00 (61 días); P5 Q5 = 205,00 (61 días) | `Parcial 3/4` (P3 `No aplica`) | P1 = 258,50; P2 = 77,40; P3 = 40,00 | `Parcial 3/5` | 1.456,40 | 500,00 |
| Variante completa: solo P1/P2 a 2026-04-30 | P1, P2 | 855,00 + 342,00 | `Verificada` 2/2; total 1.197,00 | 236,00 + 77,40 | `Verificada` 2/2; total 313,40 | — | — |
| Variante solo cerrada: P3 a 2026-06-30 | P3 | `No aplica` | `No aplica` | 240,00 − 200,00 = 40,00 | `Verificada` 1/1 | — | — |

Comprobaciones del oráculo:

- P1 a 03-31: 1.181,25 + 0 − 1.125,00 = **56,25**.
- P1 a 04-30: 855,00 + 506,00 − 1.125,00 = **236,00**.
- P1 a 06-30: 877,50 + 506,00 − 1.125,00 = **258,50**.
- P2 a 04-30: 342,00 + 0 − 264,60 = **77,40**.
- P3 cerrada: 240,00 − 200,00 = **40,00**.
- P4: cantidad 10, compras 200,00, sin valoración; resultado `No disponible`.
- P5: cantidad 2, compras 200,00, valor manual 205,00; valor visible, resultado `No disponible`.

**Variantes de límite:** P5 con valor manual `0,00` cuenta como valoración presente; P1 con
precio automático `0,00` se rechaza con 422 (E4.1 exige precio positivo) y no produce valor;
P1 con valor automático 498,75 (precio 70,00 USD y cambio 0,95) da resultado **−120,25**,
también válido y con signo; P3 con compra 100,00 y venta 100,00 da resultado **0,00**; un corte
sin ninguna valoración ≤ T da `No disponible`, no `0,00`.

## Matriz de casos E4.3-TP-01…17

Cada caso incluye un escenario positivo (P), uno negativo (N) y uno límite (L). Todos están
**UNRUN**: no hay candidato. La columna de dependencia identifica lo que debe existir antes de
ejecutarlo; no autoriza desarrollo.

| ID | AC / D | P (positivo) | N (negativo) | L (límite) | Resultado esperado | Método | Dependencia | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E4.3-TP-01 | AC-01 / D-01 | P1 a 04-30: 7,5 × 120,000000 × 0,950000 = 855,00; variante con producto no exacto (7,500000 × 33,333333 × 0,900000) redondeada una sola vez | Usar el precio de la última operación o omitir procedencia/cambio | Precio/cambio de 6 decimales; producto con cola decimal; solo céntimos finales | Valor 855,00 y variante 225,00 (redondeo final); fecha y procedencia visibles; sin precio de última operación | Bun API + oráculo | E4.1/E4.2; DT2 | UNRUN |
| E4.3-TP-02 | AC-02 / D-02 | P5 abierta con manual 205,00 → valor visible; Resultado/Rentabilidad `No disponible` | P3 cerrada con valor manual histórico → debe regir D-03, no la supresión del manual | Manual 0,00: valor válido y resultado suprimido; 0 ≠ ausencia | Abierta: manual manda y suprime; cerrada: ventas − compras = 40,00; sin porcentaje | API/DTO + UI | D-03; wireframes | UNRUN |
| E4.3-TP-03 | AC-03 / D-03 | P3 cerrada: 240,00 − 200,00 = 40,00; valoración `No aplica` | Grupo solo anulado I1004; posición con cantidad 0 sin Venta vigente | Compra 100,00 / venta 100,00 → resultado 0,00; cerrada | Resultado cerrado sin valoración; sin etiqueta realizado/no realizado; solo anulado no es posición | Bun API + oráculo | E4.2 | UNRUN |
| E4.3-TP-04 | AC-04 / D-04 | A 04-30 P1/P2/P4/P5 abiertas; a 06-30 P3 cerrada; P1/P2/P4/P5 abiertas | Venta posterior a T no cierra T; grupo solo anulado no es posición | Cantidad 0 con Venta vigente → `Cerrada`; nueva Compra reabre | Estado derivado al corte; sin Estado manual; reapertura correcta | Bun API/tabla | E4.2; DT2 fin de día | UNRUN |
| E4.3-TP-05 | AC-05 / D-05 | P1 abierta = 236,00; P3 cerrada = 40,00; una cifra por posición | Separar realizado/no realizado, FIFO o coste por lotes | P1 con valor 498,75 → resultado −120,25 visible con signo | Solo resultado agregado; sin desglose realizado/no realizado; sin clamp | Bun API + oráculo | R5; E4.2 | UNRUN |
| E4.3-TP-06 | AC-06 / D-06 | Resultado disponible en P1; DTO sin porcentaje | Intentar `resultado/compras`, TWR, TIR o ratio | P3 cerrada y P5 manual: tampoco porcentaje | Solo importe EUR; `Rentabilidad: No disponible`; sin denominador inventado | API/DTO + UI | D-06; DT8 solo si se define la métrica | UNRUN |
| E4.3-TP-07 | AC-07 / D-07 | C1 comisión 5,00 y V1 comisión 2,00 → resultado 236,00 usando `importe_eur`; variante con `importe_eur` distinto de cantidad×precio×cambio | Restar 7,00 otra vez (229,00) o sumar comisión (243,00) | Comisión 0,00 y comisión igual al importe: no duplicar | Resultado neto 236,00; con `importe_eur` distinto se usa el importe cargado/cobrado, no el producto; comisión una sola vez | API + oráculo | E4.1/E4.2 | UNRUN |
| E4.3-TP-08 | AC-08 / D-08 | Serie Q1/Q2/Q3; corregir Q2 con revisión y motivo; auditoría anterior/posterior | Duplicar P1/04-30 (409; unicidad DT2 confirmada); revisión obsoleta 409; DELETE; `ciclo_id` | Corregir al mismo valor; dos procesos concurrentes → una revisión gana | Serie y auditoría conservadas; 409 sin escritura parcial; sin Ciclo; Compras/Ventas intactas | API/SQL + concurrencia | DT2-E4.3 almacén; autorización | UNRUN |
| E4.3-TP-09 | AC-09 / D-09 | Corte 03-31 usa Q1 (16 días); corte 04-30 usa Q2 exacta | Usar Q2 en 03-31 (look-ahead); única valoración posterior → no usarla | Fecha = corte → 0 días; anterior 61 días | Solo fecha ≤ T; última anterior con fecha/antigüedad; sin posterior; sin valor → `No disponible` | API + oráculo | Serie D-08 | UNRUN |
| E4.3-TP-10 | AC-10 / D-10 | Variante P1/P2 04-30 → `Verificada`, total 1.197,00, resultado 313,40 | Fixture 04-30 con P4 sin valor → `Parcial 3/4`, sin total; resultado `Parcial 2/4` | P5 manual 0,00 cuenta; solo P3 → `No aplica`; sin valores → `No disponible` | Nunca total parcial como completo; 0 explícito válido; no sustituir ausencia por 0 | API/DTO + oráculo | D-02; D-03 | UNRUN |
| E4.3-TP-11 | AC-11 / D-11 | Agregado solo P1–P5; S003 1.456,40 y S007 500,00 aparte | Sumar 1.956,40 al agregado o convertir efectivo en posición | Varios Saldos de efectivo, cada uno separado; sin patrimonio global | Efectivo leído de `cashAt` y mostrado aparte; no suma; no posición | API/DTO + `cashAt` | E4.1; frontera E4.6 | UNRUN |
| E4.3-TP-12 | AC-12 / D-12 | `GET /api/e43/corte` devuelve DTO; antes/después `e43`, `valoracion` y foto sin cambio | Escribir `e43`/`valoracion` o foto desde E4.3 | Consumidor E4.8/E4.9 lee el contrato sin escribir; autorización separada | Contrato de lectura; ninguna escritura de totales; `e43` sigue `No disponible`; foto intacta | API + SQL antes/después + contrato | SPEC27/E4.8/E4.9 | UNRUN |
| E4.3-TP-13 | AC-13 / D-13 | P4 inactiva/heredada con cantidad se incluye; P1/P2 activas | Ocultar P4 por inactiva/heredada; inventarle valor; incluir I1004 solo anulado | P3 cerrada con cantidad 0 y Venta se incluye; I1004 no | Incluidas con cobertura declarada; sin valor inventado; solo anulado excluido; `No disponible` ≠ 0 | API/tabla + UI | E4.1/E4.2 | UNRUN |
| E4.3-TP-14 | AC-14 / D-14 | EUR 2 decimales; precio/cambio 6; valor manual 0,00; precio automático > 0; fecha no futura | Valor/precio/cambio negativo; **precio 0 en Automática**; cambio 0; fecha futura; exponente; precisión excesiva | Límite E4.1/E4.2 `2⁵³−1` adoptado por DT2; valor manual 0,00 válido; producto no exacto con redondeo final | 2 decimales finales; valor manual 0,00 válido; precio 0 en Automática → 422; 422 sin escritura en inválidos; sin máximo inventado | API/DB + oráculo | DT2 | UNRUN |
| E4.3-TP-15 | AC-15 / D-15 | Q2 a 06-30 muestra 2026-04-30 y 61 días; Q3 muestra 0 días | Ocultar fecha/antigüedad; aplicar caducidad a los 30/90 días | Valor muy antiguo sigue visible; la antigüedad no cambia la cobertura por sí sola | Fecha y días siempre visibles; sin umbral; sin caducidad automática | DTO/UI 1440/390 | Wireframes/UI | UNRUN |
| E4.3-TP-16 | AC-16 / D-16 | Q3 exacta a 06-30 → `Elegible por fecha exacta (E4.9 no evaluado)`; Q2 anterior → `No elegible por fecha exacta en E4.3` | Presentar Q2 como elegible por fecha exacta o como rechazo definitivo; escribir foto; corrección posterior que recalcule foto | Sin valoración → no elegible; E4.9 aún no define ventana | Tres planos separados; E4.3 no certifica, no prejuzga E4.9 ni escribe foto; E4.9 decide; sin PASS | DTO + contrato + SQL | E4.9; autorización separada | UNRUN |
| E4.3-TP-17 | AC-17 / A-01 | P1 valorada el 04-30; compra vigente el 05-10; consulta al 05-31 | Escalar el valor por unidades; usar el valor antiguo como cantidad actual; inventar precio | Venta posterior que reabre/cierra; anulación o corrección retroactiva; `cantidad_base` distinta de la recalculada | Valor no escalado; posición `No disponible` con motivo `Cantidad modificada desde la valoración`; resultado `No disponible`; agregado `Parcial n/m`; nueva valoración exigida; anterior conservada; si la cantidad vuelve a coincidir, valor conocido | API/DTO + oráculo | E4.1/E4.2; DT2 | UNRUN |

## Riesgos residuales y criterios de salida

| Riesgo | Señal de fallo | Criterio de salida |
| --- | --- | --- |
| **Look-ahead** | El corte usa una valoración posterior o el precio de la última operación | Solo `fecha_vigencia <= T`; prueba con Q2 posterior a 03-31 y Q1 anterior |
| **Doble comisión** | Resultado 229,00 en vez de 236,00; comisión sumada aparte | `importe_eur` una sola vez; oráculo con comisiones 5,00 y 2,00 |
| **Total parcial como completo** | Se muestra 1.197,00/1.592,00 con `Parcial 3/4` | `valorEur: null` y `resultadoEur: null` si falta una posición aplicable |
| **Antigüedad no elegible** | Una valoración de 61 días se presenta como elegible | `No elegible por fecha exacta en E4.3` separado de `cobertura`; E4.9 define la ventana |
| **FX** | Se ignora el cambio, se usa el de la última operación o se redondea antes de multiplicar | Producto exacto; Q2 = 855,00, no 900,00 ni 810,00; sin redondeo intermedio |
| **Serie/auditoría** | Se sobrescribe una valoración, se borra o no hay revisión/motivo | Serie, revisión, auditoría anterior/posterior y 409; sin DELETE |
| **Manual** | Se calcula resultado desde el valor manual | Abierta manual: Resultado/Rentabilidad `No disponible`; cerrada: D-03 |
| **Inactivo/heredado** | Se oculta una posición real o se le inventa valor | Incluir con cobertura; `No disponible` sin valor inventado; solo anulados fuera |
| **Esquema/migración** | Se crea una tabla sin autorización o se toca `operaciones_inversion`/`instrumentos` | Sin DDL en esta entrega; DT2 y autorización separadas; migración/backup futuros |
| **Contrato E4.9** | E4.3 escribe `e43`/`valoracion` o recalcula la foto | Lectura únicamente; foto inmutable; autorización separada |
| **UI/accesibilidad** | Overflow, foco perdido, información oculta o color como único indicador | 390/1440, teclado, foco y contraste; revisión pendiente |
| **Datos/alcance** | Datos reales, Excel, cotizaciones externas, FIFO o patrimonio global | Fixtures ficticias; exclusión verificable; sin datos reales |

**Criterios de salida del DEV futuro:** los 17 AC con evidencia en un mismo SHA; oráculo
independiente; suite API/SQLite; UI 390/1440 con capturas; comprobación de no escritura en
`e43`/`valoracion`/foto; migración/backup/restore si se autoriza el DEV/DDL; `typecheck`, build,
suite completa y CI Linux full; QA independiente sin bloqueantes. Esta lista no autoriza ese DEV
ni declara PASS ahora.

## Regression checks

Suites y comprobaciones previstas; **ninguna ejecutada** en esta entrega documental:

| Comprobación | Uso | Resultado actual |
| --- | --- | --- |
| `bun test apps/api` | API/SQLite, incluida la futura suite E4.3 | UNRUN |
| `bun run typecheck` | Tipos del candidato | UNRUN |
| `bun run build` | Build web | UNRUN |
| `bun run test:e2e` | Playwright 390/1440 | UNRUN |
| `python3.12 scripts/verify --base <main> --head <SHA>` | Verificación canónica del candidato | UNRUN |
| `python3.12 scripts/verify --full` | Perfil completo cuando aplique | UNRUN |

No se reutiliza evidencia de otro candidato. Los conteos, el código de salida y los fallos se
registrarán por separado cuando exista un candidato funcional.

## Functional verification

No hay candidato E4.3. No se ejecutaron endpoints, consultas, migraciones ni capturas. La
verificación futura deberá registrar respuestas reales (corte, serie, cobertura, errores 401/404/
409/422), comparación antes/después de `e43`/`valoracion`/foto y ausencia de escritura. El
arranque del proceso no acredita funcionalidad.

## Browser verification (web only)

Pendiente. No hay wireframes aprobados ni UI E4.3. Cuando se autorice, Playwright deberá operar
todos los flujos de aceptación y capturar 390 y 1440, con evidencia de teclado, foco, contraste,
estados vacío/carga/error/parcial/manual/cerrada/valor anterior/no elegible por fecha exacta y borrador
conservado ante 409/422. No se declara accesibilidad ni responsive sin esas capturas.

## Visual improvements (visual apps only)

N/A: no hay UI implementada, wireframes aprobados ni una entrega visual que evaluar. No se
proponen mejoras visuales sobre pantallas inexistentes.

## QA independiente

**Pendiente.** No hay revisor independiente, candidato ni evidencia funcional. La QA futura
deberá ser distinta del autor, con contexto nuevo, sin editar reglas financieras, sin escribir
`specs/epic-board.md`, sin merge y sin datos reales. Cualquier dictamen será documental o
funcional según el candidato, y no convertirá un AC en PASS sin evidencia.

## Limitations and next action

- **Sin aprobación:** specification, wireframes y testplan no están aprobados.
- **Sin DEV:** no hay código, endpoints, DDL, migración, UI ni tests ejecutables de E4.3.
- **DT2 aprobada (`24f3efb`):** unicidad, IDs con prefijo `VAL`, constraints, límites
  E4.1/E4.2 y migración/backup quedan fijados por la revisión final de DT2; el DDL y la
  migración siguen sin autorizar hasta la autorización de DEV E4.3.
- **E4.9 pendiente:** la integración `e43`/`valoracion`, la ventana de certificación y la foto
  requieren autorización separada. Este testplan no las implementa.
- **Wireframes pendientes:** 390/1440 y estados de UI no están diseñados ni aprobados.
- **Datos:** solo fixtures ficticias; nunca Excel, bases reales, credenciales ni secretos.
- **Next action:** revisión humana de specification/testplan; DT2 ya está aprobada; después, si
  se autoriza, plan de DEV. Ningún AC se declara completo hasta que todas las comprobaciones
  requeridas pasen con evidencia.

## Registro de ejecuciones

| Fecha | Candidato | Comando | Resultado | Nota |
| --- | --- | --- | --- | --- |
| 2026-11-02 | — | — | UNRUN | Diseño documental; no hay implementación E4.3 |
| 2026-11-02 | — | Validaciones de estructura del repositorio | Documental | No son PASS de AC ni sustituyen la verificación funcional |
