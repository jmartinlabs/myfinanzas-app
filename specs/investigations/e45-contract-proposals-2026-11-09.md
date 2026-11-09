# E4.5 — Propuestas de contrato para cuatro puntos abiertos (2026-11-09)

> **PROPUESTA — ninguna opción aprobada.** Este documento **no modifica** SPEC20, su
> testplan ni ningún AC. No implementa código, SQL, migración, API, UI, importador ni
> fixtures ejecutables. No usa datos reales, Excel, bases reales ni información privada.
> No declara PASS: los **59 AC siguen `UNRUN`** y **DT7 sigue abierto**. Las opciones
> marcadas como `[PROPUESTA]` son recomendaciones del especialista funcional, no
> decisiones del usuario.

- **Tipo:** propuesta funcional/documental de enmienda de contrato.
- **Rama:** `docs/e45-contract-proposals`, base `test` `1947625`.
- **Fecha:** 2026-11-09.
- **Alcance:** cuatro puntos que SPEC20 no fija y que hoy solo están documentados en
  comentarios y pruebas del motor puro:
  1. **H-09** — conflictos globales de identidad/versión y `items[].conflictos`.
  2. **`fuenteId` en `AperturaHistorica`** — exención actual.
  3. **Atribución fuera de `intervalosArchivo`** — motivo
     `AgregadoNoAtribuibleAlCorte`.
  4. **Mapping `Pendiente`/`Ambigua` posterior al corte** — permanencia en
     `sinClasificar`.
- **Fuentes contrastadas:** `apps/api/src/historico-precontrol.ts`,
  `apps/api/src/historico-precontrol.test.ts`,
  `specs/20-historico-precontrol-specification.md`,
  `specs/20-historico-precontrol-testplan.md`,
  `specs/investigations/dt7-decision-closure-2026-11-05.md`,
  `specs/investigations/dt7-preparation-2026-11-05.md` y
  `specs/epic-board.md`.
- **Fuera de alcance:** reabrir Q1–Q10, Q5=A, Q7=A, Q10=A, D4 o D14; crear AC nuevos;
  cambiar el número de AC; cerrar DT7; autorizar DEV; tocar el tablero; publicar rama o
  PR; merge.

## Resumen ejecutivo

| Punto | Comportamiento actual | Recomendación `[PROPUESTA]` | ¿Cambia producto? | ¿Requiere autorización? |
| --- | --- | --- | --- | --- |
| **1. H-09** | `resultado.conflictos[]` es global; cada conflicto lleva `partidaId`; `items[].conflictos[]` no recibe los conflictos de identidad/versión | **A:** mantener el global como fuente canónica y documentar `items[].conflictos[]` como proyección local; no copiar | No | Sí, para enmendar la redacción de SPEC20 |
| **2. `fuenteId` en aperturas** | Las aperturas están exentas de validar que `fuenteId` exista en `fuentes[]` | **B:** exigir `fuenteId` declarado en `fuentes[]`, aunque la fuente no aporte intervalos ni control | Sí, validación de entrada | Sí; depende de DT7 M8/M2 |
| **3. Fuera de `intervalosArchivo`** | Se usa `AgregadoNoAtribuibleAlCorte` también para filas dentro del corte pero fuera de los tramos | **B:** nuevo `motivoCodigo=RegistroFueraDeIntervalosArchivo` y `causa` en `agregadoNoAtribuible[]`; reservar el código actual para el corte excedido | Sí, DTO y código de motivo | Sí; semántica pendiente de DT7 |
| **4. Mapping posterior al corte** | Un registro `Pendiente`/`Ambigua` enteramente posterior al corte sigue en `sinClasificar` y bloquea el global | **B:** acotar `sinClasificar` a `[inicio del ejercicio, corteConsulta]`, alineado con H-01/H-01c | Sí, alcance de salida | Sí; confirmar que no se pierde evidencia de auditoría |

**Lectura común:** ninguno de estos cuatro puntos es un PASS ni una decisión de producto
vigente. Las pruebas del motor son sintéticas y no acreditan DT7, importes reales ni
equivalencia con el Excel. Cualquier cambio de comportamiento exige autorización
explícita, enmienda de SPEC20, actualización del testplan y nueva verificación/QA.

## Precauciones comunes

1. **SPEC20 es la autoridad funcional.** Este documento no reescribe su contrato: propone
   textos alternativos para que el usuario decida. La única modificación aplicada en esta
   rama es una nota breve de enlace desde SPEC20, sin cambiar reglas ni AC.
2. **Los AC no se tocan.** `AC-01…AC-59` siguen `UNRUN`. Las propuestas indican qué AC o
   comprobación de reconciliación (`R-01…R-08`) quedaría afectada si se aprobaran, pero
   no convierten ningún AC en PASS ni crean AC nuevos.
3. **DT7 sigue abierto.** Las cuatro propuestas tienen una parte que no puede cerrarse
   sin evidencia DT7 o datos reales; se detalla en cada sección.
4. **No hay datos reales.** Todos los importes y fuentes citados son ficticios o
   ejemplos de las pruebas sintéticas.

## 1. H-09 — ¿copiar conflictos globales de identidad/versión a `items[].conflictos`?

### 1.1 Regla actual y evidencia en el motor

- `resolverVersiones()` agrupa por `identidad`, detecta huellas distintas, Partidas
  distintas para la misma identidad/huella y cadenas de versión bifurcadas. Emite
  `ConflictoPrecontrol` con `partidaId` y registra las Partidas afectadas en
  `partidasConflictuadas`:
  `apps/api/src/historico-precontrol.ts:720-865` (registro de conflictos en
  `:738-775`; marca de Partidas en `:764-765`).
- `combinarHistoricoPrecontrol()` inicializa el resultado global con
  `const conflictos = [...resolucion.conflictos]` y pasa ese array a `analizarItem()`
  (`:1623`, `:1753-1762`). El análisis de cada Partida añade a ese array global sus
  propios `Solapamiento`/`DosFuentes` (`:1156-1166`, `:1185-1197`, `:1227-1239`,
  `:1454-1465`).
- `analizarItem()` marca la Partida afectada por un conflicto de identidad/versión con
  `bloqueos.push("DuplicadoAmbiguo")` (`:1245-1246`). El item resultante conserva
  `estadoTotal=NoVerificable` y `motivoCodigo=DuplicadoAmbiguo`, pero su campo
  `conflictos` solo contiene los conflictos locales del análisis (`:1602`). Los
  conflictos de identidad/versión no se copian al item.
- Evidencia en pruebas:
  - `P-04` (`apps/api/src/historico-precontrol.test.ts:2134-2191`): misma
    identidad/huella en PAR100 y PAR200. Comprueba que **cada item** queda
    `NoVerificable`/`DuplicadoAmbiguo` y que **`resultado.conflictos`** contiene el
    conflicto con `partidaId` para cada Partida. **No** comprueba
    `items[].conflictos`.
  - `VersionBifurcada` (`:580-609`): comprueba estado/motivo por item y
    `resultado.conflictos` con `partidaId` PAR100/PAR200; **no** comprueba
    `items[].conflictos`.
  - `F-DT7-03` (`:234-268`) sí comprueba `par100.conflictos` para un `Solapamiento`
    local. Es el único caso donde se espera contenido en `items[].conflictos`.
  - El comentario de conformidad `:2028-2031` documenta expresamente H-09: SPEC20 solo
    contrata `conflictos[]` global y cada conflicto incluye `partidaId`; no exige copiar
    conflictos de identidad/versión a `items[].conflictos`.

### 1.2 Lectura literal de SPEC20 y por qué no lo resuelve

- SPEC20 §Combinador, paso 9 (`specs/20-historico-precontrol-specification.md:426-431`)
  exige exponer `conflictos[]` como componente global. §Cobertura y corte define
  `motivoCodigo` (`:280`) y D14 describe que cualquier conflicto no resuelto deja el
  total global `NoVerificable` (`:309-324`, `:410-413`).
- El DTO de ejemplo (`:917-918`, `:973-981`) muestra `conflictos[]` en el nivel global,
  no dentro de `items[]`.
- La tabla de «Contrato del motor puro integrado» (`:459-466`) documenta
  `items[].registros`, `items[].registrosNoComputados`, `aperturas`,
  `aperturasNoVerificadas`, `sinClasificar` y `duplicadosAbsorbidos/versionesHistoricas`;
  **no** documenta `items[].conflictos`. El tipo `ItemPrecontrol.conflictos` existe en el
  motor (`historico-precontrol.ts:257`) y se rellena con conflictos locales, pero SPEC20
  no fija su composición.
- Por tanto, la lectura literal no prohíbe copiar los conflictos globales, pero tampoco
  lo exige. El silencio se cubre hoy con un comentario y con pruebas que solo miran el
  nivel global. Es una **ambigüedad de contrato**, no una contradicción demostrada.

### 1.3 Opciones

| Opción | Comportamiento | Consecuencia financiera | UI/DTO | Compatibilidad | Riesgo |
| --- | --- | --- | --- | --- | --- |
| **A. Global-only documentado** | `resultado.conflictos[]` es la fuente canónica; `items[].conflictos[]` solo contiene conflictos emitidos por el análisis de esa Partida (por ejemplo, `Solapamiento` local). Los conflictos de identidad/versión se localizan por `partidaId` en el global. | Ninguna: la Partida sigue `NoVerificable`/`DuplicadoAmbiguo`; no suma. | El consumidor/UI debe leer el global y filtrar por `partidaId`; un item puede tener `conflictos=[]` y aun así estar bloqueado. | No cambia el motor, ni las pruebas, ni el DTO actual. Es la opción de menor riesgo. | Un consumidor que solo lea `items[].conflictos` no ve la causa del bloqueo; la UI debe conocer la regla. No hay duplicación. |
| **B. Copiar al item** | Además del global, cada `items[].conflictos` recibe los conflictos de identidad/versión que afectan a su `partidaId`, deduplicados. | Ninguna: mismo bloqueo y mismos importes. | Item autocontenido; el global sigue siendo canónico. Requiere deduplicar para no repetir `DosFuentes`/`Solapamiento` ya locales; el payload crece. | Aditivo en apariencia; las pruebas actuales con `toContainEqual` en el global y estado/motivo por item no fallarían, pero hay que añadir pruebas y fijar la deduplicación. Rompe la idea de que `items[].conflictos` es solo local. | Doble fuente de verdad y posible divergencia; un conflicto de identidad multi-Partida aparece duplicado en varios items. Puede confundir a un consumidor que sume listas. |
| **C. Campo separado** | Añadir `items[].conflictosGlobales[]` o `items[].conflictosQueAfectan[]`, dejando `items[].conflictos[]` como local. | Ninguna. | Máxima claridad semántica; nuevo campo y nuevo contrato de proyección; los consumidores deben adoptarlo. | Aditivo, pero exige cambio de motor y DTO; no existe hoy. | Más superficie de contrato y migración de consumidores; puede ser sobrediseño si el global con `partidaId` basta. |

### 1.4 Recomendación `[PROPUESTA]`

**Opción A.** Mantener `resultado.conflictos[]` como fuente canónica y documentar
explícitamente que `items[].conflictos[]` es una proyección local, no el conjunto
completo. Es la opción que no cambia comportamiento, no rompe pruebas y elimina la
ambigüedad con una regla clara de consumo. La opción B queda disponible si un consumidor
(E4.7/E2.4) o la UI exige un item autocontenido; en ese caso debe aprobarse como cambio
de contrato y añadirse la prueba de deduplicación.

No se propone C en esta fase: añade un campo nuevo sin necesidad demostrada y sin
consumidor que lo requiera.

### 1.5 Texto de enmienda sugerido para SPEC20

> **Texto propuesto (no aplicado).** Añadir a §«Contrato del motor puro integrado
> (reconciliación 2026-11-09)», después de la tabla de salidas:
>
> **Conflictos por Partida y globales.** `resultado.conflictos[]` es la fuente canónica
> y contiene todos los conflictos no resueltos de la consulta, incluidos los de
> identidad/versión (`DuplicadoAmbiguo`, `VersionBifurcada`) y los de procedencia
> (`DosFuentes`/`Solapamiento`). Cada conflicto declara `partidaId` cuando afecta a una
> Partida concreta y `null` cuando no es atribuible. `items[].conflictos[]` es una
> proyección de conveniencia y contiene solo los conflictos emitidos por el análisis de
> esa Partida; no se exige duplicar en cada item los conflictos globales de
> identidad/versión. Un consumidor que necesite el conjunto completo debe leer
> `resultado.conflictos[]` y filtrar por `partidaId`. La Partida afectada queda
> `estadoTotal=NoVerificable` y `motivoCodigo=DuplicadoAmbiguo` aunque
> `items[].conflictos[]` esté vacío. Esta proyección no crea conflictos nuevos ni altera
> el total, el subtotal o la cobertura.

### 1.6 Impacto en pruebas, AC y estados

- **Pruebas existentes:** ninguna expectativa cambia. `P-04` y `VersionBifurcada`
  siguen comprobando el global y el estado/motivo del item. `F-DT7-03` sigue comprobando
  el `Solapamiento` local en `items[].conflictos`.
- **Prueba nueva recomendada (si se aprueba A):** un caso de `VersionBifurcada` o
  `DuplicadoAmbiguo` que afirme que `resultado.conflictos` contiene el conflicto con
  `partidaId` y que `items[].conflictos` no lo copia, pero el item sigue
  `NoVerificable`/`DuplicadoAmbiguo`. Es una prueba de contrato documental, no un AC.
- **AC afectados:** AC-48 (exige `conflictos=[]` en el caso limpio; no cambia), AC-54
  (global `Solapada`; no cambia), AC-58 (proyección E2.4; el global sigue siendo la
  fuente). Ningún AC se modifica ni pasa a PASS.
- **Estados:** SPEC20 sigue APPROVED; los 59 AC siguen `UNRUN`; DT7 abierto; QA-01
  cerrado con reservas. La propuesta no cambia el estado del tablero.

### 1.7 Qué no se puede decidir sin DT7/datos reales

- Si las identidades pueden abarcar legítimamente varias Partidas (reclasificación) y con
  qué frecuencia aparecen conflictos multi-Partida. Eso depende de DT7 M3/M5 y del
  inventario real de fuentes; sin esa evidencia no se puede justificar B o C por volumen
  o por necesidad de UI.
- La semántica financiera no cambia: en todos los casos la Partida afectada no suma. Lo
  que no puede decidirse con datos reales es la **presentación** y si el consumidor
  necesita un item autocontenido.

## 2. `fuenteId` en `AperturaHistorica`

### 2.1 Regla actual y evidencia en el motor

- `validarEntrada()` exige que el `fuenteId` de cada registro esté declarado en
  `fuentes[]`, **salvo** cuando `clase === "AperturaHistorica"`:
  `apps/api/src/historico-precontrol.ts:649-657`.
- Las aperturas se procesan antes de la cobertura: las vigentes van a `aperturas` o
  `aperturasNoVerificadas` y no entran en `registrosItem`, `piezas`, `intervalos`,
  `archivo`, `detalleControl`, `subtotalConocido` ni `total`
  (`:1629-1655`). Por eso la exención no omite ningún límite de Gastos.
- Evidencia en pruebas:
  - `F-DT7-16/AC-16` (`apps/api/src/historico-precontrol.test.ts:704-736`) usa
    `fuentes: []` y una apertura con `fuenteId` por defecto `SRC-1`; la prueba pasa.
  - Apertura cero verificada (`:738-757`) también usa `fuentes: []`.
  - Aperturas `NoVerificado` y `Rechazado` (`:1566-1618`) usan `fuentes: []`.
  - El comentario `:2032-2034` documenta la exención: SPEC20 excluye las aperturas de la
    cobertura/corte de Gastos y no exige que su fuente esté en `fuentes[]`; la exención
    no omite ningún límite duro de atribución.

### 2.2 Lectura literal de SPEC20 y por qué no lo resuelve

- SPEC20 §«Registro de archivo histórico» exige procedencia trazable, incluida
  `procedencia.versionFuente` y `procedencia.documentoHash`/`hojaTabla`
  (`specs/20-historico-precontrol-specification.md:125-134`). La identidad de fuente se
  define en §Cobertura: `fuenteId` es un identificador lógico estable del inventario DT7,
  no un hash ni un nombre (`:297-301`), y `fuentes[]` describe cada fuente con
  `fuenteId`, `etiqueta`, `alcance`, `corteArchivo`, `intervalosArchivo` y
  `controlDetalle` (`:270`).
- Las aperturas se excluyen expresamente de la cobertura de Gastos y se muestran aparte
  (`:166-169`, `:307-308`). La spec no dice que una apertura pueda omitir su
  `fuenteId` ni que su fuente no deba estar declarada; tampoco dice lo contrario. La
  exención es una lectura de implementación para no obligar a una fuente de Gastos a
  cubrir una apertura.
- Por tanto, la lectura literal deja dos preguntas abiertas: (a) ¿toda apertura debe
  tener una identidad de fuente trazable?; (b) si la tiene, ¿debe estar en `fuentes[]`
  de Gastos o en un inventario separado? SPEC20 no lo resuelve.

### 2.3 Opciones

| Opción | Comportamiento | Consecuencia financiera | UI/DTO | Compatibilidad | Riesgo |
| --- | --- | --- | --- | --- | --- |
| **A. Mantener exención** | La apertura puede llevar un `fuenteId` no declarado en `fuentes[]`; no se valida su existencia. | Ninguna: no suma ni acredita cobertura. | La apertura puede mostrar una fuente huérfana o no mostrarla; el DTO no cambia. | No rompe pruebas; es el comportamiento actual. | Hueco de auditoría: un `fuenteId` inventado o con errata no se detecta; la procedencia no es plenamente trazable. |
| **B. Exigir fuente declarada en `fuentes[]`** | Toda apertura debe declarar un `fuenteId` existente en `fuentes[]`. La fuente puede tener `intervalosArchivo: []` y `controlDetalle: null`; acredita procedencia, no cobertura de Gastos. | Ninguna: la apertura sigue fuera de Gastos y de la cobertura; el total no cambia. | La fuente de apertura aparece en `cobertura.fuentes`; la UI debe etiquetarla como fuente de apertura y no como cobertura de Gastos; el filtro por fuente no debe inventar 0. | Cambia la validación de entrada; las cuatro pruebas de aperturas con `fuentes: []` deben añadir una fuente. No cambia AC por sí solo. | Una fuente sin cobertura en `fuentes[]` puede confundir la lectura de cobertura si la UI no la distingue; hay que documentarlo. |
| **C. Inventario separado de fuentes de apertura** | La apertura valida su `fuenteId` contra un inventario DT7 específico (por ejemplo, `fuentesApertura[]`), no contra `fuentes[]` de Gastos. | Ninguna. | Máxima separación semántica; nuevo campo/inventario, DTO y probable DDL futuro; más trabajo de API. | Aditivo pero mayor; requiere DT7 M8/M2 y no existe hoy. | Sobrediseño sin evidencia; duplica el registro de fuentes; retrasa la decisión. |

### 2.4 Recomendación `[PROPUESTA]`

**Opción B, con carácter provisional.** Es la opción que cierra el hueco de procedencia
sin mezclar la apertura con la cobertura de Gastos y sin exigir un inventario nuevo. Si
DT7 M8/M2 demuestra que las aperturas provienen de un conjunto de fuentes distinto del
inventario de Gastos, la opción C sustituye a B. La opción A solo debería mantenerse si
el usuario decide que la trazabilidad de la apertura se limita a `documentoHash` y
`hojaTabla`, sin identidad de fuente.

### 2.5 Texto de enmienda sugerido para SPEC20

> **Texto propuesto (no aplicado).** Añadir a §«Registro de archivo histórico» →
> «Reglas del registro», después del bullet de aperturas:
>
> **Fuente de las aperturas.** Toda `AperturaHistorica` debe declarar un `fuenteId` no
> vacío que exista en `fuentes[]` del inventario de la consulta. La fuente de una
> apertura puede declarar `intervalosArchivo: []` y `controlDetalle: null`: acredita
> procedencia, no cobertura de Gastos. Su `corteArchivo` sigue siendo un límite de la
> fuente, pero no se usa para atribuir la apertura a Gastos. Una apertura no acredita
> cobertura, no entra en `detalleControl`/`detallePrecontrol`, no suma a `archivo`,
> `subtotalConocido` ni `total`, y no se escribe en Saldos/Deudas. Si DT7 confirma que
> las aperturas usan un inventario separado, se aplicará la opción C
> (`fuentesApertura[]`) y esta regla se sustituirá por la validación contra ese
> inventario; no se inventa una Partida. Una apertura con `fuenteId` ausente o no
> declarado es entrada inválida (422/`ErrorPrecontrol`).

### 2.6 Impacto en pruebas, AC y estados

- **Pruebas que cambiarían:** las tres pruebas de aperturas con `fuentes: []` —
  `F-DT7-16/AC-16` (`:704-736`), apertura cero (`:738-757`) y aperturas
  `NoVerificado`/`Rechazado` (`:1566-1618`)— deben añadir una fuente válida, por ejemplo
  `fuente({ fuenteId: "SRC-1", alcance: "S001", intervalosArchivo: [], controlDetalle: null })`,
  y comprobar que la apertura sigue sin sumar y que la cobertura de Gastos no cambia.
- **Prueba nueva:** una apertura con `fuenteId: "NO-EXISTE"` debe lanzar
  `ErrorPrecontrol` tras la enmienda; hoy pasaría.
- **AC afectados:** AC-16, AC-17, AC-37 y AC-43 tratan aperturas y no mencionan
  `fuenteId`; no cambian de texto, pero su fixture debe declarar la fuente. AC-37 (solo
  apertura, sin fuente/control de Gastos) debe seguir dando cobertura de Gastos
  `NoDisponible` y no 0,00. Ningún AC pasa a PASS.
- **Estados:** SPEC20 APPROVED; AC `UNRUN`; DT7 abierto; no cambia el tablero.

### 2.7 Qué no se puede decidir sin DT7/datos reales

- DT7 **M8 — Saldos con apertura histórica** sigue `PENDIENTE DE EVIDENCIA`
  (`dt7-decision-closure-2026-11-05.md:49`, `:314-317`) y DT7 **M2 — Partidas y fuentes
  por ejercicio** también (`:43`, `:296-302`). Sin esa evidencia no se sabe:
  - si las aperturas tienen un `fuenteId` propio o comparten el de una fuente de Gastos;
  - si existe un inventario separado de fuentes de apertura (opción C);
  - cuántas aperturas hay y si alguna fuente no tiene intervalos de Gastos.
- Tampoco se puede decidir con datos reales si una fuente sin cobertura en `fuentes[]`
  confunde la UI de cobertura; eso requiere el inventario y el diseño de la pantalla.

## 3. Atribución fuera de `intervalosArchivo` — ¿es adecuado `AgregadoNoAtribuibleAlCorte`?

### 3.1 Regla actual y evidencia en el motor

- En `analizarItem()` un registro `Mapeado` se excluye del componente `archivo` y se
  añade a `agregados` con `bloqueos.push("AgregadoNoAtribuibleAlCorte")`,
  `subtotalNoSeparable = true` y `archivoConocido = false` en tres supuestos:
  1. su intervalo excede el `corteArchivo` de su fuente (`:1296-1310`);
  2. su intervalo no queda contenido en los `intervalosArchivo` aplicables de su fuente
     para esa Partida/clase (`:1316-1342`);
  3. su intervalo no está completamente dentro de `[inicio del ejercicio, corteConsulta]`
     (`:1346-1357`).
- El mismo código, por tanto, se usa para «excede el corte» y para «está dentro del corte
  pero fuera de los tramos declarados». La diferencia no se expone en
  `AgregadoNoAtribuible` (`:192-197` solo tiene `idArchivo`, `partidaId`, `intervalo`,
  `importe`) ni en el `motivoCodigo`.
- Evidencia en pruebas:
  - `P-01b` (`apps/api/src/historico-precontrol.test.ts:2664-2695`): registro
    `07/01–12/31` dentro del corte pero fuera de `intervalosArchivo 01/01–06/30`;
    espera `motivoCodigo=AgregadoNoAtribuibleAlCorte` y el agregado en
    `agregadoNoAtribuible[]`.
  - `F2e` (`:2597-2633`): caso mixto; el registro `AH002` fuera de los tramos espera
    `AgregadoNoAtribuibleAlCorte`.
  - `F2b` (`:2203-2233`): registro fuera de los tramos; comprueba el agregado, sin
    afirmar el `motivoCodigo` del item.
  - `P-02` (`:2040-2071`): registro que excede `corteArchivo`; espera el mismo código.
  - `F-DT7-09` (`:270-345`): agregado que excede el corte; espera el mismo código y usa
    `toEqual` exacto sobre `resultado.agregadoNoAtribuible` (sin campo `causa`).

### 3.2 Lectura literal de SPEC20 y por qué no lo resuelve

- SPEC20 §Cobertura y corte (`specs/20-historico-precontrol-specification.md:354-368`)
  describe `AgregadoNoAtribuibleAlCorte` para un **agregado cuyo intervalo no está
  completamente contenido en `[universo.inicio, corteConsulta]`**. §Combinador, paso 4
  (`:396-400`) lo repite para un agregado que **excede el corte**. La lista de
  `motivoCodigo` incluye `AgregadoNoAtribuibleAlCorte` (`:280`).
- La spec **no** define el caso de un registro cuyo intervalo está dentro del corte pero
  fuera de los `intervalosArchivo` declarados por su fuente. Ese caso es una cuestión de
  atribución a la cobertura verificada de la fuente, no de exceso de corte. El motor lo
  trata igual por prudencia (no atribuye, no prorratea, no suma), pero el nombre del
  motivo no describe la causa.
- Por tanto, la lectura literal no autoriza a sumar ni a prorratear, pero tampoco fija
  que el motivo correcto sea `AgregadoNoAtribuibleAlCorte` cuando el corte no se excede.
  Es un hueco de nomenclatura/estado, no una contradicción de importes.

### 3.3 Opciones

| Opción | Comportamiento | Consecuencia financiera | UI/DTO | Compatibilidad | Riesgo |
| --- | --- | --- | --- | --- | --- |
| **A. Mantener el código actual** | Dentro y fuera de los tramos se usa `AgregadoNoAtribuibleAlCorte`. | No suma; total/subtotal `null`; Partida `NoVerificable`. Conservador. | El mensaje «no atribuible al corte» se muestra para una fila que sí está dentro del corte; puede confundir. Sin campos nuevos. | No rompe pruebas ni DTO. | Diagnóstico erróneo y soporte: el usuario puede creer que la fila está fuera del periodo; se oculta que la fuente declara tramos incompletos. |
| **B. Nuevo código y `causa`** | `RegistroFueraDeIntervalosArchivo` para el registro dentro del corte pero fuera de los tramos; `AgregadoNoAtribuibleAlCorte` se reserva para el corte/`corteArchivo` excedido. `agregadoNoAtribuible[]` gana `causa: "CorteExcedido" \| "FueraDeIntervalosArchivo"`. | No suma; mismo bloqueo y mismos `null`. No cambia la cuantía. | Motivo preciso; nuevo enum y campo; la UI puede explicar «fuera de los tramos verificados» o «excede el corte». | Cambia el DTO; las pruebas `P-01b`, `F2e` y `F2b` cambian de código; las pruebas con `toEqual` exacto sobre `agregadoNoAtribuible` deben añadir `causa`. AC-39 se mantiene con el código antiguo. | Expansión de contrato; consumidores deben manejar el nuevo código; riesgo de que un consumidor trate el nuevo código como un estado distinto cuando el bloqueo es el mismo. |
| **C. Mantener el código y añadir solo `causa`** | `AgregadoNoAtribuibleAlCorte` sigue siendo el `motivoCodigo` único; se añade `causa` a cada entrada de `agregadoNoAtribuible[]` y la UI explica la causa. | No suma; mismo bloqueo. | Cambio aditivo y compatible; no hay nuevo enum; la UI necesita leer `causa`. | Menor ruptura que B; solo cambian las aserciones exactas que incluyan el objeto completo. | El `motivoCodigo` sigue siendo semánticamente impreciso; un consumidor que solo mire el código no distingue la causa. |

### 3.4 Recomendación `[PROPUESTA]`

**Opción B.** El problema planteado es que el motivo actual no describe la causa; un
campo `causa` sin cambiar el código (opción C) mejora la UI pero deja el `motivoCodigo`
genérico. La opción B separa dos causas financieramente distintas —«el corte no permite
atribuir el agregado» y «la fuente no declara cobertura para ese tramo»— sin cambiar la
garantía de no suma ni el estado `NoVerificable`. La opción C es aceptable como paso
intermedio si se quiere evitar un nuevo enum; la opción A solo debe mantenerse si el
usuario prefiere no ampliar el contrato.

### 3.5 Texto de enmienda sugerido para SPEC20

> **Texto propuesto (no aplicado).** Sustituir el bullet de §«Cobertura y corte» sobre
> agregados y añadir el código a la lista de `motivoCodigo`:
>
> **Atribución de un registro fuera de los tramos verificados.** Un registro de archivo
> cuyo intervalo esté dentro de `[inicio del ejercicio, corteConsulta]` pero no quede
> contenido en ningún `intervalosArchivo` aplicable de su fuente (misma Partida y clase)
> no se prorratea, no se recorta y no se suma. Se expone en `agregadoNoAtribuible[]` con
> `causa=FueraDeIntervalosArchivo` y activa
> `motivoCodigo=RegistroFueraDeIntervalosArchivo`; la Partida queda
> `estadoTotal=NoVerificable`, `total=null` y `subtotalConocido=null`.
> `AgregadoNoAtribuibleAlCorte` se reserva para el registro cuyo intervalo excede
> `[inicio del ejercicio, corteConsulta]` o el `corteArchivo` de su fuente, con
> `causa=CorteExcedido`. Ambos casos son contexto, nunca importe sumado; no se elige
> fuente ni se prorratea. `causa` es informativo y no altera el bloqueo.
>
> Añadir `RegistroFueraDeIntervalosArchivo` a la lista de `motivoCodigo` y `causa` a la
> forma de `agregadoNoAtribuible[]`.

### 3.6 Impacto en pruebas, AC y estados

- **Pruebas que cambiarían de expectativa:**
  - `P-01b` (`:2664-2695`): `motivoCodigo` pasa de `AgregadoNoAtribuibleAlCorte` a
    `RegistroFueraDeIntervalosArchivo`; añadir `causa`.
  - `F2e` (`:2597-2633`): el item pasa al nuevo código; añadir `causa` al agregado.
  - `F2b` (`:2203-2233`): añadir la comprobación del nuevo código y `causa`.
  - `F-DT7-09` (`:270-345`): los `toEqual` exactos de `agregadoNoAtribuible` deben
    incluir `causa: "CorteExcedido"` (o cambiar a `objectContaining`).
  - `P-02` (`:2040-2071`): conserva `AgregadoNoAtribuibleAlCorte` y gana
    `causa: "CorteExcedido"`.
- **Prueba nueva:** un registro dentro del corte y fuera de los tramos, con una fuente
  que declara `intervalosArchivo` incompletos, debe dar `NoVerificable`, `total=null`,
  `subtotal=null`, el nuevo código y `causa=FueraDeIntervalosArchivo`.
- **AC afectados:** AC-39 (agregado que excede el corte) sigue con el código antiguo y no
  cambia. AC-44 (agregado + detalle) no cambia de resultado. AC-48/AC-58 no cambian. La
  nueva causa requeriría, si se aprueba, una comprobación de reconciliación adicional
  (por ejemplo, R-09) y una nota en el testplan; **no** un AC nuevo sin autorización.
- **Estados:** ningún AC pasa a PASS; el motor seguirá sin acreditar DT7.

### 3.7 Qué no se puede decidir sin DT7/datos reales

- DT7 **M2/M3** y la estructura real de las fuentes: si una fila fuera de los tramos es
  un agregado, un detalle, un error de mapping o una fuente cuyos intervalos declarados
  están incompletos. La opción B es segura (no suma), pero la causa exacta y si la fila
  debe bloquear la Partida o solo mostrarse como contexto dependen de esa evidencia.
- También depende de datos reales saber si `intervalosArchivo` se declara por fuente o
  por Partida/clase y si una fila fuera de tramo es frecuente; sin ello no se puede
  justificar la prioridad de UI ni el coste de un nuevo código.

## 4. Mapping `Pendiente`/`Ambigua` posterior al corte

### 4.1 Regla actual y evidencia en el motor

- El bucle de `sinClasificar` recorre `resolucion.vigentes` y añade cualquier registro
  con `partidaId=null`, `estadoMapeo=Pendiente` o `estadoMapeo=Ambigua`
  (`apps/api/src/historico-precontrol.ts:1629-1680`). **No** aplica
  `registroEnAlcance()` ni comprueba el corte.
- `registroEnAlcance()` (`:524-530`) se usa para descubrir Partidas (`:1685`) y para el
  diagnóstico `FueraDeUniverso` (`:1729`), pero no para `sinClasificar`.
- `globalVerificable` exige `sinClasificar.length === 0` (`:1828-1836`). Por tanto, un
  registro `Pendiente`/`Ambigua` enteramente posterior al corte impide certificar el
  total global aunque no sea un hecho del corte consultado.
- Evidencia en pruebas:
  - No hay una prueba específica de mapping `Pendiente`/`Ambigua` posterior al corte.
  - `H-01c` (`apps/api/src/historico-precontrol.test.ts:2783-2809`) usa un registro
    posterior al corte con `estadoMapeo` por defecto `Mapeado`; comprueba que no descubre
    una Partida fuera del universo y que `sinClasificar` queda vacío. No cubre
    `Pendiente`/`Ambigua`.
  - `H-01b` (`:2388-2413`) cubre un Gasto posterior al corte, no un registro de archivo
    con mapping pendiente.
  - El comentario `:2036-2037` remite al caso mixto F2e; el tablero
    (`specs/epic-board.md:2020-2024`) documenta que el mapping `Pendiente`/`Ambigua`
    posterior al corte sigue en `sinClasificar` porque SPEC20 lo ampara.

### 4.2 Lectura literal de SPEC20 y por qué no lo resuelve

- SPEC20 §D4.5 (`specs/20-historico-precontrol-specification.md:219-224`) reserva
  `sinClasificar` a «Partida ausente o mapping de Partida `Pendiente`/`Ambigua`». §Contrato
  del motor (`:465`) describe `sinClasificar` como «Registros sin Partida, con mapping de
  Partida `Pendiente`/`Ambigua`, o de una Partida no declarada en un universo
  acreditado». **No** dice que se limite a los registros que solapan el corte.
- El combinador lee archivo «con intervalo dentro del ejercicio y del corte»
  (§Combinador, paso 4, `:396-400`) y el detalle se recorta al corte (paso 2,
  `:385-389`). Pero `sinClasificar` se describe como salida global sin una condición
  temporal explícita.
- Por tanto, la lectura literal **ampara** el comportamiento actual (todos los vigentes
  con Partida ausente/pendiente), pero no armoniza con H-01/H-01c, que establecen que un
  registro posterior al corte no descubre Partidas ni contamina el corte. Es una
  inconsistencia de alcance, no una contradicción de importes.

### 4.3 Opciones

| Opción | Comportamiento | Consecuencia financiera | UI/DTO | Compatibilidad | Riesgo |
| --- | --- | --- | --- | --- | --- |
| **A. Mantener estado actual** | Un `Pendiente`/`Ambigua` posterior al corte permanece en `sinClasificar` y deja el global `NoVerificable`. | No suma; bloquea la certificación de un corte pasado por un registro futuro. Conservador pero temporalmente contaminante. | La sección «Sin clasificar» muestra un registro fuera del periodo; el total global queda no verificable; el usuario no ve por qué un dato futuro afecta al corte. | No rompe pruebas; es el comportamiento actual. | Inconsistencia con H-01c; un dato futuro puede invalidar un histórico; soporte y confianza. |
| **B. Acotar a `registroEnAlcance`** | Solo entra en `sinClasificar` el registro que solapa `[inicio del ejercicio, corteConsulta]`. Un registro enteramente posterior no entra ni bloquea el global; se verá en la consulta que lo incluya. | No suma; el corte pasado puede certificarse si no concurre otro bloqueo; el registro futuro no contamina. | `sinClasificar` es del periodo; `items[].registros` puede seguir mostrando el vigente por trazabilidad; la UI debe marcar «fuera del corte» si lo muestra. | Cambia el comportamiento y exige una prueba nueva; AC-04/AC-59 necesitan la precisión «dentro del corte» si se aprueba. | Un registro conocido deja de verse en la consulta del corte; si `items[].registros` lo muestra, puede haber mensajes mixtos. |
| **C. Lista separada no bloqueante** | Mantener `sinClasificar` para el periodo y añadir `sinClasificarFueraDeCorte[]` (o `fueraDeCorte: true`) para los registros posteriores, sin que bloqueen el global. | No suma; el corte pasado se certifica; se conserva la visibilidad. | Más superficie de DTO; la UI puede mostrar una sección «fuera del corte» separada; los consumidores deben distinguir ambas listas. | Aditivo; requiere motor y DTO nuevos; pruebas nuevas. | Complejidad y duplicación de la noción de `sinClasificar`; puede ser sobrediseño si el usuario no necesita ver datos futuros. |

### 4.4 Recomendación `[PROPUESTA]`

**Opción B.** Alinear `sinClasificar` con `registroEnAlcance` es la regla coherente con
H-01/H-01b/H-01c: un registro enteramente posterior al corte no es un hecho del corte y
no debe bloquear su certificación. La opción C es preferible solo si el usuario exige
conservar la visibilidad de los registros futuros en la misma consulta; en ese caso debe
ser una lista separada y no bloqueante, nunca una ampliación silenciosa de
`sinClasificar`.

### 4.5 Texto de enmienda sugerido para SPEC20

> **Texto propuesto (no aplicado).** Añadir a §D4, punto 5, y precisar la fila de
> `sinClasificar` del «Contrato del motor puro integrado»:
>
> **Alcance temporal de `sinClasificar`.** Un registro de archivo cuyo intervalo no
> solape `[inicio del ejercicio, corteConsulta]` no entra en `sinClasificar` ni bloquea
> `totales.estadoTotal` por tener `partidaId=null` o mapping de Partida
> `Pendiente`/`Ambigua`; no se considera un hecho del corte consultado. Sigue conservado
> en la fuente y se mostrará en la consulta del ejercicio/corte que lo incluya. Un
> registro que solape el corte sí se rige por D4.5 y permanece en `sinClasificar` con
> importe y motivo. Esta regla no cambia `items[].registros` (trazabilidad de vigentes)
> ni convierte un registro fuera de corte en `0`, total o cobertura; un registro fuera de
> corte no acredita cobertura ni bloquea el total por su mapping.

### 4.6 Impacto en pruebas, AC y estados

- **Pruebas existentes:** ninguna prueba cubre este caso; `H-01c` sigue pasando porque su
  registro es `Mapeado`. No hay expectativa que cambiar, pero debe añadirse una prueba.
- **Prueba nueva:** (a) registro `Pendiente` de una Partida ya declarada, enteramente
  posterior al corte: no aparece en `sinClasificar` y el global puede certificarse si el
  resto es completo; (b) registro `Ambigua` con `partidaId=null` posterior al corte: no
  aparece en `sinClasificar`; (c) registro `Pendiente` que solapa el corte: sí aparece y
  bloquea.
- **AC afectados:** AC-04 y AC-59 mencionan `sinClasificar` con mapping pendiente; si se
  aprueba, debe precisarse «dentro del corte» sin cambiar el número de AC. AC-46/AC-53
  no cambian. R-06/R-07 se mantienen; añadir una comprobación R-10 (o similar) para el
  alcance temporal.
- **Estados:** ningún AC pasa a PASS; SPEC20 sigue APPROVED; DT7 abierto.

### 4.7 Qué no se puede decidir sin DT7/datos reales

- DT7 **M2/M5** y los datos reales: si existen registros posteriores al corte con mapping
  pendiente, si son errores de carga/fechas futuras y si el usuario necesita verlos en la
  consulta del corte por auditoría. La regla temporal es una decisión de producto; la
  evidencia real determina si B es suficiente o si hace falta C.
- También depende de datos reales saber si `items[].registros` debe seguir mostrando el
  registro fuera de corte; si se muestra, la UI necesita una marca explícita para no
  confundirlo con un hecho del periodo.

## 5. Matriz de autorización y dependencias

| Punto | Decisión que se propone | Autoriza | Gate/dependencia | No decidible sin |
| --- | --- | --- | --- | --- |
| 1. H-09 | Documentar `resultado.conflictos[]` como canónico y `items[].conflictos[]` como proyección local (A) | Usuario/coordinador | SPEC20; sin DT7 para la semántica | Volumen real de conflictos multi-Partida (M3/M5) y necesidad de UI |
| 2. `fuenteId` aperturas | Exigir fuente declarada en `fuentes[]` con intervalos vacíos (B) o inventario separado (C) | Usuario; DT7 | DT7 M8/M2 | Identidad y número de fuentes de apertura; si comparten inventario con Gastos |
| 3. Fuera de tramos | Nuevo código `RegistroFueraDeIntervalosArchivo` + `causa` (B), o código actual + `causa` (C) | Usuario | SPEC20/testplan; DT7 M2/M3 | Si la fila es agregado, detalle, error o fuente con tramos incompletos |
| 4. Mapping post-corte | Acotar `sinClasificar` al corte (B) o lista separada no bloqueante (C) | Usuario | SPEC20/testplan; DT7 M2/M5 | Si hay registros futuros, su causa y la necesidad de auditoría |

**Ninguna fila está aprobada.** Este documento no concede ni presume autorización. La
aprobación de una opción debe ser explícita e identificable; una ausencia de respuesta no
es aprobación.

## 6. Verificación documental de esta rama

- `python3.12 scripts/validate-template .` — valida estructura, enlaces y convenciones.
- `python3.12 scripts/verify baseline` — ejecuta el baseline canónico (repositorio,
  proyecto, plantilla, enlaces, whitespace y suites de harness).
- Resultado: ver el cierre de la tarea en el retorno al coordinador. Esta sección no
  declara PASS funcional de E4.5 ni de ningún AC.

## 7. Próxima acción segura

1. El coordinador revisa este documento y eleva al usuario las cuatro decisiones, sin
   presentarlas como aprobadas.
2. Si el usuario aprueba una opción, se prepara una enmienda de SPEC20 y del testplan en
   una rama documental separada, con el texto exacto y el impacto en pruebas/AC.
3. No se autoriza DEV, SQL, importación, UI ni datos reales por este documento. DT7 sigue
   siendo un gate independiente y los 59 AC siguen `UNRUN`.
