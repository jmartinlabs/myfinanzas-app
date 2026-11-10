# DT7 — Expediente de preparación de la revisión del mapping y del corte (2026-11-09)

**Estado:** `[BORRADOR DE PREPARACIÓN]` — **DT7 NO CERRADO. NINGÚN AC EN PASS.** Este
documento ordena la revisión del usuario; no aprueba mapping, corte ni excepción, no
cierra DT7 y no autoriza DEV, datos reales, Excel, importación, P6/P7, SQL, migración,
despliegue, push, PR ni merge. Los 59 AC de SPEC20 siguen `UNRUN`.

- **Base:** `test` **`1947625`** (2026-11-09), rama `docs/dt7-readiness`. Solo
  documentación.
- **Objetivo:** reunir el estado real de DT7, la evidencia sintética existente, lo que
  falta y dos checklists accionables —mapping y corte— para que el usuario y Álex puedan
  revisarlos cuando se autorice el acceso a la evidencia privada.
- **Regla de contenido:** no se inventan mappings, campos, IDs, intervalos, cortes ni
  importes. Todo hueco de evidencia queda como `[RELLENAR]` o `[PENDIENTE]`. No se citan
  importes, intervalos ni identificadores reales; las cifras de conteo y los criterios
  son del contrato.
- **No altera:** decisiones M1–M16, estados del [tablero](../epic-board.md), gates,
  reservas de E4.5 ni los 59 AC. Los criterios `DT7-R-MAP-*` y `DT7-R-CORTE-*` son de
  este expediente: **no son AC, ni gates, ni PASS**.
- **Etiquetas:** `[CONFIRMADO]` = verificable en spec, Git, código o tablero en la base
  indicada; `[PROPUESTA]` = recomendación de este expediente; `[PENDIENTE]` = evidencia o
  decisión que todavía no existe.

**Fuentes:** [inventario de evidencias M1/M2/M5/M8](dt7-evidence-inventory-2026-11-10.md),
[cierre de decisiones DT7](dt7-decision-closure-2026-11-05.md),
[preparación con ficción](dt7-preparation-2026-11-05.md),
[SPEC20](../20-historico-precontrol-specification.md),
[testplan 20](../20-historico-precontrol-testplan.md),
[tablero](../epic-board.md), [roadmap](../roadmap.md),
[readiness E4.5](e45-readiness-2026-11-04.md) y
[referencia funcional](../functional-reference-v5.11.md) (R6/P6).

---

## 1. Estado real de DT7

### 1.1 Qué es DT7 y qué no

`[CONFIRMADO]` DT7 cubre «mapping exhaustivo por campo/ID/apertura/archivo, corte,
discrepancias/excepciones, inventario privado y herramientas de importación aislada»;
el usuario revisa mapping y conciliación y no se suben fuentes reales
([roadmap](../roadmap.md), fila DT7). DT7 es un **gate documental y de evidencia**, no
una autorización de desarrollo.

`[CONFIRMADO]` DT7 sigue abierto. El motor puro E4.5 y sus pruebas sintéticas existen y
están integrados, pero no acreditan universo, mapping, corte, regularización ni
equivalencia con el Excel. Aprobar SPEC20 o el testplan tampoco fue un PASS.

### 1.2 Decisiones y estados vigentes

Estados copiados sin reinterpretación del
[cierre de decisiones](dt7-decision-closure-2026-11-05.md#5-matriz-de-cierre):

| Bloque | ID | Tema | Estado vigente | Qué falta para cerrarlo |
| --- | --- | --- | --- | --- |
| Evidencia real | **M1** | Ejercicios del histórico y primero incluido | `PENDIENTE DE EVIDENCIA` | Lista cerrada por año con evidencia privada; no se infiere |
| Evidencia real | **M2** | Partidas y fuentes por ejercicio | `PENDIENTE DE EVIDENCIA` | Inventario cerrado `PARxxx`/`fuenteId` con `Presente`/`Ausente`/`NoAplica` y evidencia |
| Evidencia real | **M5** | Regularización 2026 concreta | `PENDIENTE DE EVIDENCIA` | Expediente del registro concreto: tipo, ejercicio, intervalo, importe/signo, Partida/Referencia, procedencia, representación, no duplicidad, aprobador |
| Evidencia real | **M8** | Saldos con apertura histórica | `PENDIENTE DE EVIDENCIA` | Lista cerrada de `Sxxx` con importe, fecha, procedencia y evidencia, o «ninguno» explícito |
| Técnica | **M3** | Identidad de fuentes sin ID | `ACEPTADA (2026-11-05)` | Aplicarla a fuentes reales; la política no acredita ninguna fuente |
| Técnica | **M4** | Evidencia de `NoAplica`/Referencia | `ACEPTADA COMO PROPUESTA` | Formalizar aceptar/modificar/rechazar |
| Técnica | **M6** | Checklist de evidencia de regularización | `ACEPTADA (2026-11-05)` | Aplicarlo al registro real de M5 |
| Técnica | **M7** | Evidencia de representación/precontrol | `ACEPTADA COMO PROPUESTA` | Formalizar aceptar/modificar/rechazar |
| Gobernanza | **M9** | Aprobador de excepciones financieras | `RATIFICADA (2026-11-05)` | Sin decisión nueva; el usuario aprueba, el coordinador prepara |
| Gobernanza | **M10** | Conciliación y tolerancia | `RATIFICADA (2026-11-05)` | 100 % y 0 céntimos; sin tolerancia automática |
| Seguridad | **M11** | Custodia/acceso a evidencia | `RATIFICADA (2026-11-05)` | **Procedimiento concreto pendiente de decisión**; P6/P7 no autorizado |
| Gobernanza | **M12** | Firma de conciliación independiente | `RATIFICADA (2026-11-05)` | Designar revisor independiente y ejecutar la firma |
| Seguridad | **M13** | Autorización P6/P7 | `RATIFICADA (2026-11-05)` | Sigue **no autorizada**; gate separado |
| Técnica | **M14** | Adaptación E2.4 | `CONFIRMADO (A); implementación PENDIENTE` | Implementación futura con autorización DEV separada |
| Técnica | **M15** | Separación/disyunción de agregado | `ACEPTADA COMO PROPUESTA` | Formalizar aceptar/modificar/rechazar |
| Técnica | **M16** | Evidencia de fecha económica | `ACEPTADA COMO PROPUESTA` | Formalizar aceptar/modificar/rechazar |

**Lectura correcta:** hay **cuatro decisiones de evidencia real** (M1/M2/M5/M8), **cuatro
propuestas técnicas sin decisión formal** (M4/M7/M15/M16), **un procedimiento de custodia
pendiente** (M11) y **una implementación futura** (M14). Nada de esto se cierra con este
documento.

### 1.3 Decisiones ya cerradas que no se reabren

`[CONFIRMADO]` No se reabren D4, D14, Q5=A, Q7=A ni Q10=A. Con ellas ya están decididos,
entre otros: la Referencia pendiente no bloquea automáticamente el total por Partida; la
precedencia de cobertura es `NoAcreditada → Solapada → Completa → NoDisponible → Parcial`;
la regularización es solo 2026 y exige evidencia; las aperturas de Saldo se conservan
aparte sin escribir Saldos; el agregado no se prorratea ni se resta sin vínculo o
disyunción.

### 1.4 Gates vigentes

| Gate | Contenido | Estado |
| --- | --- | --- |
| **G-DT7** | Inventario, mapping, corte y conciliación aprobados con evidencia privada | Abierto |
| **G-DEV** | Autorización de DEV de E4.5 (API/SQL/importador/UI) | No concedida; el motor puro ya integrado no la sustituye |
| **G-P6/P7** | Datos reales, Excel e importación | No concedida |
| **G-E2.4** | Adaptación del seam `AnnualSources`/`AnnualHistory` (M14) | Abierto (técnico) |
| **G-DT6** | Backup/restore para cierre real, AC-09 y E4.12 real | Abierto |
| **G-MERGE** | Aprobación explícita e identificable; el push no la sustituye | No aplica a este documento |

### 1.5 Decisiones abiertas además de M1/M2/M5/M8

`[CONFIRMADO]` El tablero y SPEC20 dejan documentados, **sin cambio de producto**, tres
comportamientos de E4.5 que solo requieren decisión si el usuario quiere otro resultado:

1. **H-09:** `conflictos[]` global, con `partidaId` en cada conflicto.
2. **`fuenteId` en `AperturaHistorica`:** la exención no omite los límites de Gastos.
3. **Mapping `Pendiente`/`Ambigua` posterior al corte:** sigue en `sinClasificar` porque
   SPEC20 lo ampara.

`[PROPUESTA]` No convertirlos en deuda de DT7 mientras no se quiera un comportamiento
distinto. Si se quiere, exige enmienda de SPEC20 y decisión del usuario; este expediente
no la propone.

`[CONFIRMADO]` El testplan deja otra decisión opcional: promover `R-01…R-08` a AC. No es
necesaria para DT7 y no se hace aquí.

---

## 2. Evidencia disponible hoy y evidencia faltante

### 2.1 Evidencia disponible

| Evidencia | Dónde está | Qué acredita | Límite |
| --- | --- | --- | --- |
| Motor puro E4.5 | `apps/api/src/historico-precontrol.ts`; commits `da93897`, `9c793d3`, `642f0c0` (#321, #324 y #329, respectivamente) | Contrato del combinador, cobertura, corte, estados, `sinClasificar`, aperturas no verificadas y transición | No es API, SQL, persistencia, importador ni UI; no es PASS de los AC |
| Suite sintética | `apps/api/src/historico-precontrol.test.ts`; el tablero registra **81 pruebas** | Comportamiento del motor con entradas ficticias | Sin datos reales; el tablero registra APTO CON RESERVAS por incremento y **sin informe QA versionado** |
| Contrato del motor `R-01…R-08` | [testplan 20](../20-historico-precontrol-testplan.md#contrato-del-motor-puro-reconciliación-2026-11-09) | Trazabilidad de registros no computados, aperturas no verificadas, corte duro, validación `PAR`, `sinClasificar` y límites de entrega | Prueba sintética; los 59 AC siguen `UNRUN` |
| Catálogo `F-DT7-01…25` | [preparación §4](dt7-preparation-2026-11-05.md#4-catálogo-de-fixtures-f-dt7-0125) | Casos ficticios con resultado esperado y valores prohibidos para cobertura, deduplicación, mapping, representación, aperturas, regularización, fecha y proyección | Ficticios y **no ejecutados como catálogo**; no usan datos reales; no validan un mapping real |
| Matriz `F-DT7 → AC` | [preparación §5](dt7-preparation-2026-11-05.md#5-matriz-de-trazabilidad) | Diseño de cobertura de los 59 AC | Todos `UNRUN`; no hay PASS |
| SPEC20 y testplan aprobados | [SPEC20](../20-historico-precontrol-specification.md), [testplan](../20-historico-precontrol-testplan.md) (2026-10-28) | Contratos, definiciones verificables, D4/D14, 59 AC y proyección a E2.4/E4.7/E4.12 | Diseño documental; sin implementación completa ni evidencia real |
| Decisiones M3/M6, M9–M13 y M14 A | [cierre](dt7-decision-closure-2026-11-05.md) | Política de identidad, checklist de regularización, gobernanza, custodia y frontera E2.4 | No acreditan fuentes, importes ni cortes reales |
| Plantillas documentales | [preparación §3](dt7-preparation-2026-11-05.md#3-inventario-ficticio-20242027), [cierre §7](dt7-decision-closure-2026-11-05.md#7-plantilla-de-decisión) | Estructura de inventario, mapping, fuentes, registros y plantilla de decisión | Placeholders ficticios; no son inventario real |
| Evidencia de dependencias | [readiness E4.5](e45-readiness-2026-11-04.md), tablero | E1–E4 integrados; E2.4 consumidor; Deuda fuera de E4.5 | El readiness es anterior al motor puro y debe contrastarse con el tablero |

### 2.2 Evidencia faltante

| Falta | Por qué bloquea | Quién la aporta | Dónde se registra |
| --- | --- | --- | --- |
| Lista cerrada de ejercicios y primero incluido (M1) | Sin universo no hay cobertura ni total verificable | Usuario, con evidencia privada | Checklist §3, bloque M-0; canal privado |
| Inventario de Partidas y fuentes por ejercicio (M2) | `fuentesEsperadas[]` no se descubre desde E2.4, archivo ni Movimientos | Usuario/asesor | Checklist §3, M-1/M-2 |
| Mapping por **campo** | Sin campo de origen → contrato no se puede saber qué se lee, qué se ignora y cómo se normaliza | Usuario/asesor con la fuente | Checklist §3, M-2 |
| Mapping por **ID** | `fuenteId`, `idArchivo`, `idOrigen`, `PARxxx`, `REFxxx`, `Sxxx` reales; nombres e importes no son identidad | Usuario/asesor | Checklist §3, M-1/M-3/M-4/M-5 |
| Mapping de **archivo** | Hash, versión, hoja/tabla, fila/columna y reemplazos | Usuario/asesor | Checklist §3, M-1/M-2 |
| Mapping de **apertura** | Qué `Sxxx` entran, con importe/fecha/procedencia; Deuda `Dxxx` queda fuera | Usuario (M8) | Checklist §3, M-5 |
| Mapping de **Referencia** y `NoAplica` | Sin evidencia negativa no se distingue «no declara» de «declara sin destino» | Usuario/asesor (M4) | Checklist §3, M-4 |
| **Corte** real por fuente y Partida | `corteArchivo`, `intervalosArchivo` y `controlDetalle` reales; no hay corte global | Usuario, con evidencia privada | Checklist §4, C-1/C-2 |
| Regularización 2026 concreta (M5) | Sin expediente el registro queda `Pendiente` y no suma | Usuario | Checklist §3, M-6 |
| Conciliación 100 % / 0 céntimos | El total del importador no es oráculo; se exige recálculo independiente | Revisor independiente + usuario (M10/M12) | Checklist §4, C-3 |
| Revisión y aprobación del usuario | Una recomendación no es una decisión | Usuario | §7 de este expediente |
| Custodia y acceso (M11) | La evidencia real no puede publicarse en Git | Usuario | Procedimiento pendiente; fuera de este documento |
| Datos reales / Excel / importación | P6/P7 no autorizado | Usuario | Gate separado; no se solicita aquí |
| Equivalencia con el Excel | No verificable sin datos reales y conciliación | Usuario + revisor | Posterior a P6/P7 y DT6 |

`[CONFIRMADO]` El motor puro y `F-DT7-01…25` **no cubren** las filas de esta segunda
tabla: prueban reglas del contrato, no la verdad del universo, del mapping ni del corte.

---

## 3. Checklist de revisión del mapping

**Uso:** rellenar solo en el canal privado que el usuario autorice. En el repositorio se
registran IDs, hashes, recuentos y agregados sanitizados; **nunca** el documento, datos
personales ni importes reales. Un campo vacío no se interpreta como «no aplica»: se marca
`[PENDIENTE]`, `[RELLENAR]` o `NoAplica` con evidencia negativa.

### 3.1 Precondiciones

- [ ] Autorización expresa de la revisión y del canal privado; si P6/P7 no está
      autorizado, solo se revisa la **estructura**, no valores reales.
- [ ] Copia/versión de la fuente identificada por hash y versión en el canal privado; el
      archivo no se copia al repositorio.
- [ ] M1 y M2 declarados: sin ejercicios, Partidas y fuentes esperadas no se puede
      afirmar que un mapping es exhaustivo.
- [ ] Destinos `PARxxx`/`REFxxx`/`Sxxx` existentes; E4.5/DT7 no crean maestros.
- [ ] Versión candidata del mapping identificada (`idMapeo`, `version`) y vigencia
      propuesta.
- [ ] Responsables: quién rellena, quién revisa y quién aprueba (usuario), con fecha.

### 3.2 Bloque M-1 · Identidad de fuente y archivo

Una fila por fuente esperada. `fuenteId` es un identificador lógico estable por
rol/alcance; una versión nueva conserva el ID y actualiza hash/versión.

| Campo a rellenar | Contrato | Criterio de aceptación |
| --- | --- | --- |
| `fuenteId` | Identificador lógico estable | Único; no es hash, nombre ni ruta |
| Rol/clase | `GastoHistorico`, `Regularizacion2026` o `AperturaHistorica` de Saldo | Deuda `Dxxx` no se mapea en E4.5 |
| Alcance | `Global` o `PARxxx` | Un alcance no `PAR` no crea item ni amplía universo |
| `hojaTabla` | Hoja/tabla/bloque de origen | Texto acotado, sin datos personales |
| `documentoHash` | SHA-256 sanitizado del documento | No se publica el documento |
| `versionFuente` | Versión inmutable | Una versión nueva no crea `fuenteId` nuevo |
| `idOrigen` | ID original si existe | Opcional; no se inventa ni se exige para sumar |
| Etiqueta de origen | Solo si está aprobada | El nombre editable no es identidad |
| Coordenada | Hoja/fila/columna | No es clave por sí sola |
| Evidencia | Fuente/fecha/actor, texto acotado | Sin datos personales |

### 3.3 Bloque M-2 · Mapping campo → contrato

Una fila por campo relevante. La columna «campo de origen» la aporta el usuario/asesor;
la columna «contrato» ya está fijada por SPEC20 y no se modifica aquí.

| # | Campo de origen `[RELLENAR]` | Tipo | ¿Presente? | Campo de contrato | Normalización / regla | ¿Ignorado? | Evidencia | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | Sí/No/NoAplica | `idArchivo` | Único, inmutable, no reutilizado | | | `[PENDIENTE]` |
| 2 | | | | `ejercicio` | Año natural; no ID de ciclo | | | `[PENDIENTE]` |
| 3 | | | | `intervalo.inicio` | Fecha civil inclusiva | | | `[PENDIENTE]` |
| 4 | | | | `intervalo.fin` | Fecha civil inclusiva; `inicio <= fin` | | | `[PENDIENTE]` |
| 5 | | | | `partidaId` | `PARxxx` o `null`; no por nombre | | | `[PENDIENTE]` |
| 6 | | | | `referenciaId` | `REFxxx` o `null`; no se infiere | | | `[PENDIENTE]` |
| 7 | | | | `clase` | `GastoHistorico`/`Regularizacion2026`/`AperturaHistorica` | | | `[PENDIENTE]` |
| 8 | | | | `saldoId` | `Sxxx` solo apertura; `null` en gastos | | | `[PENDIENTE]` |
| 9 | | | | `importe` | Entero exacto de céntimos en modelo; string decimal en DTO; signo explícito | | | `[PENDIENTE]` |
| 10 | | | | `fecha` | Solo con `procedencia.evidenciaFecha`; si no, `null` | | | `[PENDIENTE]` |
| 11 | | | | `procedencia.documentoHash` | Hash sanitizado | | | `[PENDIENTE]` |
| 12 | | | | `procedencia.idOrigen` | Opcional; conservar | | | `[PENDIENTE]` |
| 13 | | | | `procedencia.referenciaOrigen` | Texto o `null`; solo si la fuente la declara | | | `[PENDIENTE]` |
| 14 | | | | `procedencia.fila/columna` | Coordenada si aplica | | | `[PENDIENTE]` |
| 15 | | | | `procedencia.extraidoEn` | UTC técnico; nunca fecha financiera | | | `[PENDIENTE]` |
| 16 | | | | `estadoVerificacion` | Verificado/NoVerificado/Excluido/Rechazado/Pendiente/Ambigua | | | `[PENDIENTE]` |
| 17 | | | | `estadoMapeo` (Partida) | Aprobado/Pendiente/Ambigua/Rechazado | | | `[PENDIENTE]` |
| 18 | | | | `estadoMapeoReferencia` | Mapeado/Pendiente/Ambigua/NoAplica | | | `[PENDIENTE]` |
| 19 | | | | `representadoEnMovimientos` | Si/No/Desconocido + vínculo/evidencia | | | `[PENDIENTE]` |
| 20 | | | | `evidenciaFecha` / `evidenciaRepresentacion` | Por identidad/origen/huella, nunca por importe | | | `[PENDIENTE]` |

**Regla:** si un campo de contrato no existe en la fuente, la fila se marca `NoAplica`
**solo con evidencia** de ausencia (esquema, columna, muestra). No se rellena por defecto.

### 3.4 Bloque M-3 · Mapping de Partida

| `idMapeo` | `identidadOrigen` | `nombreOrigen` | `destinoId` (`PARxxx`) | `estado` | Evidencia | `vigenteDesde`/`Hasta` | `reemplazaA` | `version` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `[RELLENAR]` | | | | Aprobado/Pendiente/Ambigua/Rechazado | | | | |

Criterios: solo `Aprobado` permite sumar; dos mappings incompatibles no pueden estar
vigentes a la vez; el destino debe existir; renombrar conserva el ID; reclasificar exige
versión nueva; no se aprueba por nombre, importe, orden ni parecido.

### 3.5 Bloque M-4 · Mapping de Referencia y `NoAplica`

| `identidadOrigen` | ¿La fuente declara Referencia? | `referenciaOrigen` | `destinoId` (`REFxxx`) o `null` | `estadoMapeoReferencia` | Evidencia (positiva o negativa) | ¿Puede cambiar Partida/elegibilidad/identidad/deduplicación? |
| --- | --- | --- | --- | --- | --- | --- |
| `[RELLENAR]` | Sí/No | | | Mapeado/Pendiente/Ambigua/NoAplica | | Sí/No + motivo |

Criterios: `NoAplica` solo con evidencia de que la fuente no declara Referencia; si
declara y no hay destino, `Pendiente`/`Ambigua`; una Referencia pendiente sin cambio de
atribución no bloquea el total por Partida pero deja el desglose `Incompleto`; si puede
cambiar la atribución, el total global y la Partida afectada quedan `NoVerificable`; no se
infiere `REFxxx`.

### 3.6 Bloque M-5 · Aperturas y archivo

| `idArchivo` | `fuenteId` | `clase` | `saldoId` (`Sxxx`) | Importe con signo | `fecha` + evidencia | `procedencia` | ¿Escribe Saldos/Deudas? | Evidencia de que no suma a Gastos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `[RELLENAR]` | | `AperturaHistorica` | | Verificado en privado | | | **No** | |

Criterios: solo `Sxxx`; Deuda `Dxxx` se muestra como «No soportado por E4.5; ver E4.4»;
una apertura no acredita cobertura de Gastos; `aperturas=null` si no hay evidencia; un
cero solo si hay apertura cero verificada; nunca se escribe en Saldos/Deudas.

### 3.7 Bloque M-6 · Regularización 2026 (M5/M6)

- [ ] Tipo `Regularizacion2026`; ejercicio 2026; intervalo dentro de 2026.
- [ ] Importe y signo explícitos y acreditados.
- [ ] Partida/Referencia si procede; sin inferencia por nombre.
- [ ] Mapping aprobado (versión, evidencia y vigencia) y `estadoMapeo=Mapeado`.
- [ ] `estadoMapeoReferencia` según D4.
- [ ] Procedencia: fuente, huella, hoja, fila/columna, versión.
- [ ] `representadoEnMovimientos` y evidencia de no duplicidad.
- [ ] Evidencia de inclusión previa en archivo/Movimiento o de ausencia.
- [ ] Aprobador, fecha, alcance y motivo.
- [ ] Si falta cualquier punto: `Pendiente`/`NoVerificado`; no suma.

### 3.8 Fuentes sin ID (M3 aplicada)

- [ ] Nivel de identidad elegido y documentado: ID/clave estable; si no existe,
      `(fuenteId, hojaTabla, fila/columna, huella normalizada)` más etiqueta aprobada.
- [ ] El nombre editable y el importe **nunca** son identidad.
- [ ] Movimiento de fila/columna: nueva versión de mapping/archivo con coordenada
      anterior y nueva, motivo, evidencia y vigencia; no reasignación por parecido.
- [ ] Dos identidades que compiten: `Pendiente`/`Ambigua`; no se suma ni se elige.
- [ ] Si aparece un ID estable después, se incorpora conservando la historia.

### 3.9 Criterios de aceptación de la revisión del mapping

`DT7-R-MAP-01…12` — criterios documentales de este expediente, **no AC**.

| ID | Criterio |
| --- | --- |
| `DT7-R-MAP-01` | El 100 % de los registros elegibles tiene `idArchivo`, `fuenteId`, identidad de origen, intervalo, importe, clase y procedencia trazable. |
| `DT7-R-MAP-02` | Cada fila de mapping tiene `estado`, evidencia, `version` y vigencia; solo `Aprobado` permite sumar. |
| `DT7-R-MAP-03` | No se crean destinos; no hay `Dxxx`; `Sxxx` solo aparece en aperturas. |
| `DT7-R-MAP-04` | Ninguna asignación se justifica por nombre, importe, orden, posición o parecido. |
| `DT7-R-MAP-05` | `NoAplica` de Referencia solo consta con evidencia negativa; si la fuente declara y no hay destino, queda `Pendiente`/`Ambigua`. |
| `DT7-R-MAP-06` | Renombrar conserva el ID; reclasificar exige versión nueva y no reescribe la historia. |
| `DT7-R-MAP-07` | Una versión nueva del archivo conserva `fuenteId` y actualiza hash/versión. |
| `DT7-R-MAP-08` | Los registros sin Partida o con mapping `Pendiente`/`Ambigua` quedan visibles en `sinClasificar` con importe y motivo; el total global no se certifica. |
| `DT7-R-MAP-09` | Conciliación de filas: leídas = mapeadas + excluidas + pendientes + no aplica; **0 filas sin explicación**. |
| `DT7-R-MAP-10` | Conciliación de importes: **0 céntimos** de diferencia en el recálculo privado; el repositorio no contiene importes reales. |
| `DT7-R-MAP-11` | Cada evidencia identifica fuente, hoja/tabla, versión, fecha y actor; sin datos personales ni documento publicado. |
| `DT7-R-MAP-12` | Usuario y asesor firman la revisión con fecha y alcance; el coordinador prepara y **no aprueba**. |

---

## 4. Checklist de revisión del corte

**Uso:** una fila por fuente y una por Partida. El corte no es una fecha global: cada
fuente declara su `corteArchivo`, su `versionFuente`, sus intervalos y su
`controlDetalle`. Rellenar solo en el canal privado.

### 4.1 Precondiciones

- [ ] Universo M1/M2 acreditado para el ejercicio.
- [ ] Fuentes identificadas con `fuenteId` y versión (bloque M-1).
- [ ] Mapping candidato con versión identificada.
- [ ] `corteConsulta` elegido y dentro del ejercicio; no futuro respecto al reloj de
      consulta.
- [ ] Responsables y fecha de revisión.

### 4.2 Bloque C-1 · Corte y cobertura por fuente

| `fuenteId` | Clase/rol | Alcance | `intervalosArchivo` (inicio/fin) | `corteArchivo` | `controlDetalle.inicio/fin` | `versionFuente` | `versionMapping` | Estado `Presente`/`Ausente`/`NoAplica` | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `[RELLENAR]` | | `Global`/`PARxxx` | | | | | | | |

Criterios por fila: `corteArchivo` dentro del ejercicio; inclusivo; límite duro; no se
amplía por intervalos ni `controlDetalle` posteriores; el `controlDetalle` solo aplica a
su alcance; `Presente` exige intervalo que cubra la Partida recortado al corte; una
fuente ausente no es cobertura por omisión.

### 4.3 Bloque C-2 · Cobertura por Partida

| `partidaId` | Fuentes esperadas | Intervalo esperado | Unión de intervalos | Huecos | Solapes | Inicio de control | `estadoCobertura` | Motivo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `[RELLENAR]` | | | | | | | `Completa`/`Parcial`/`NoAcreditada`/`NoDisponible`/`Solapada` | |

Criterios: la unión es de días inclusivos; un hueco de un día debe aparecer; un solape no
se oculta ni se resuelve eligiendo fuente; `NoDisponible` individual no se propaga a las
demás Partidas; el global usa la precedencia D14.

### 4.4 Bloque C-3 · Conciliación y cierre de la revisión

- [ ] Recálculo independiente del importador (el importador no es oráculo).
- [ ] 100 % de registros/filas elegibles conciliados; 0 céntimos de diferencia.
- [ ] Sin tolerancia automática, sin muestreo sustitutivo y sin compensación entre
      Partidas; cualquier diferencia exige excepción aprobada por el usuario (M9).
- [ ] Totales no verificables quedan `null`; no se convierten en `"0.00"`.
- [ ] `Anual` solo con corte 31/12; un corte abierto produce `HastaCorte`, no anual.
- [ ] Un corte futuro es entrada inválida (422 en el contrato futuro), no un total.
- [ ] Firma de revisor independiente y del usuario (M12).
- [ ] Sin escritura en Saldos, Deudas, planes, Movimientos, fotos ni cierres.

### 4.5 Criterios de aceptación de la revisión del corte

`DT7-R-CORTE-01…12` — criterios documentales de este expediente, **no AC**.

| ID | Criterio |
| --- | --- |
| `DT7-R-CORTE-01` | Cada fuente esperada tiene `corteArchivo`, intervalos y `controlDetalle` con evidencia. |
| `DT7-R-CORTE-02` | `corteArchivo` es límite duro: ningún intervalo ni control posterior lo amplía. |
| `DT7-R-CORTE-03` | Cada `controlDetalle` se aplica solo a su Partida/fuente; no contamina otra Partida. |
| `DT7-R-CORTE-04` | Todo hueco entre 01/01 y `corteConsulta` está listado, o la cobertura es `Completa`. |
| `DT7-R-CORTE-05` | Todo solape está declarado y bloquea el total (`Solapada`); no se elige fuente. |
| `DT7-R-CORTE-06` | Un agregado que excede el corte queda `AgregadoNoAtribuibleAlCorte`; no se prorratea ni se recorta. |
| `DT7-R-CORTE-07` | `Presente` sin intervalo es inválido; una fuente ausente no es `"0.00"` ni cobertura. |
| `DT7-R-CORTE-08` | El total solo se certifica con cobertura completa, registros verificados/mapeados y sin conflicto; si no, `null`. |
| `DT7-R-CORTE-09` | `Anual`/`HastaCorte` se derivan del corte; no hay anual con corte abierto ni total con corte futuro. |
| `DT7-R-CORTE-10` | 100 % de filas elegibles conciliadas y **0 céntimos** de diferencia en el recálculo independiente. |
| `DT7-R-CORTE-11` | No se mutan Saldos, Deudas, planes, Movimientos, fotos ni cierres; las aperturas quedan aparte. |
| `DT7-R-CORTE-12` | Usuario y revisor independiente firman fuente y Partida con fecha y alcance. |

---

## 5. Qué puede prepararse documentalmente y qué no

| Documentable ahora | Requiere datos reales (P6/P7) | Requiere decisión del usuario |
| --- | --- | --- |
| Estructura de los checklists M-1…M-6 y C-1…C-3 | Campos y columnas reales de cada fuente | Aceptar/modificar M4, M7, M15 y M16 |
| Criterios `DT7-R-MAP-*` y `DT7-R-CORTE-*` | `fuenteId`, `idArchivo`, `idOrigen`, `PARxxx`, `REFxxx`, `Sxxx` reales | M1: años y primero incluido |
| Plantilla de inventario por ejercicio | Lista real de Partidas y fuentes por ejercicio | M2: declaración cerrada del universo |
| Plantilla de mapping versionado y de excepciones | Fechas reales de `/` y `controlDetalle` | M5: aprobar/pendiente/rechazar/dividir la regularización |
| Reglas de identidad para fuentes sin ID (M3) | Evidencia de qué ancla existe en cada fuente | M8: lista de aperturas o «ninguno» |
| Trazabilidad a `F-DT7-01…25` y `R-01…R-08` | Valores, importes y huellas reales | M11: procedimiento de custodia y acceso |
| Procedimiento de conciliación 100 %/0 céntimos | Resultado real de la conciliación | M12: designar revisor y firmar |
| Requisitos de evidencia, seguridad y no publicación | Equivalencia real con el Excel | M14: autorizar implementación futura del seam |
| Estimación de esfuerzo y dependencias | — | Aprobar DT7 como gate documental |
| — | — | Autorizar o no P6/P7 (hoy **no**) |

**Frontera:** aprobar un checklist o este expediente **no aprueba** ningún mapping ni
corte. La aprobación solo puede producirse después de rellenar la evidencia real, y la
decisión es del usuario (M9/M12). Tampoco se puede «simular» un mapping con los fixtures
`F-DT7`: sirven para el contrato y las pruebas, no para acreditar el universo ni los
importes.

---

## 6. Riesgos de aprobar un mapping o corte incompleto

| Riesgo | Cómo se materializa | Efecto | Prueba sintética que protege la regla | Límite residual |
| --- | --- | --- | --- | --- |
| Atribución a Partida equivocada | Se mapea por nombre/parecido o se aprueba una fila ambigua | Gasto en la Partida incorrecta; total por Partida falso aunque el global cuadre | `F-DT7-05`, `F-DT7-19`, `F-DT7-21`; `R-06`; AC-04/41/48/49/51/59 | Una asignación errónea pero internamente consistente no la detecta ninguna prueba |
| Duplicado o pérdida de registros | Identidad/huella mal definida o dos filas tratadas como una | Doble cómputo o falta de gasto | `F-DT7-04`, `F-DT7-14`; `R-01`; AC-02/12/31/40 | Las pruebas usan identidades ficticias; no validan la identidad real de la fuente |
| Fuente sin ID inestable | Se usa la fila/columna actual como identidad | Al reordenar, se pierden o duplican registros | `F-DT7-19`; política M3; AC-31/41 | Requiere revisar la fuente real; el motor no puede saber si el ancla existe |
| Referencia mal clasificada | `NoAplica` sin evidencia negativa | Desglose por Referencia contaminado | `F-DT7-05`; AC-59 | No detecta una fuente que declara Referencia y se marcó `NoAplica` sin mirar |
| Apertura sumada como Gasto o Deuda mapeada | Se mapea `Sxxx`/`Dxxx` al total o se escribe Saldos | Infla Gastos o altera Deuda | `F-DT7-07`, `F-DT7-17`; `R-02`; AC-16/17/37/43 | La prueba no impide que el mapping real elija la clase equivocada |
| Regularización sin evidencia | Se infiere por nombre o se generaliza a otros años | Total 2026 incorrecto; regla inventada | `F-DT7-08`; AC-20/21/22/52 | Requiere el expediente M5; la ficción no acredita inclusión previa ni no duplicidad |
| Fecha económica inventada | Se usa fecha de documento, extracción, corte o reloj | Gasto imputado al año equivocado | `F-DT7-22`; `R-05`; AC-42 | No valida la evidencia documental real |
| Corte incompleto o control mal situado | `corteArchivo`/`controlDetalle` reales no verificados | Hueco oculto o solape no declarado; total certificado sobre cobertura falsa | `F-DT7-01/02/03/09/13/18/25`; `R-03`; AC-05–10/38/39/44/46/54 | El motor confía en el corte declarado; no lo descubre |
| Universidad no acreditado tratado como cubierto | Se asume «todo el catálogo» o se omite una fuente | Total verificado sobre un universo incompleto | `F-DT7-10/11/23`; `R-04/R-07`; AC-46/53/55 | Solo M1/M2 y la evidencia privada pueden acreditarlo |
| Anual con corte abierto o futuro | Se interpreta el corte como 31/12 | Total anual ficticio | `F-DT7-20`, `F-DT7-24`; AC-32/56 | La prueba usa reloj ficticio; no valida la fecha real de consulta |
| Conciliación no independiente | Se acepta el total del importador | Diferencias silenciosas | `R-08`; M10/M12 | Ninguna prueba sintética sustituye el recálculo real ni la firma |
| Evidencia privada expuesta | Se publica el documento o importes en Git | Incidente de privacidad y seguridad | No es una prueba funcional; `REQ-DT7-09`/M11 | Exige procedimiento y custodia aprobados |

**Riesgo principal:** el motor puede devolver `Verificado` para un universo y un mapping
**internamente coherentes pero falsos**. Las pruebas sintéticas protegen las reglas; la
verdad del mapping y del corte solo la pueden acreditar la evidencia privada, la
conciliación 100 %/0 céntimos y la firma del usuario y del revisor independiente.

---

## 7. Decisiones que requieren al usuario

| ID | Decisión | Opciones | Evidencia / requisito | Efecto |
| --- | --- | --- | --- | --- |
| **M1** | Ejercicios y primero incluido | Lista cerrada; solo 2026; otro rango | Evidencia privada por año | Universo y transición |
| **M2** | Partidas y fuentes por ejercicio | Inventario cerrado; híbrido con faltantes explícitos | Evidencia por fuente | `fuentesEsperadas[]`, cobertura y subtotal |
| **M4** | Evidencia de `NoAplica`/Referencia | Aceptar la propuesta; modificar; rechazar | Esquema/muestra por fuente | Desglose por Referencia |
| **M5** | Regularización 2026 | Aprobar con evidencia; mantener pendiente; rechazar; dividir si es separable | Expediente completo M-6 | Total 2026 y `PAR900` |
| **M7** | Evidencia de representación/precontrol | Aceptar la propuesta; modificar; rechazar | Vínculo o tupla+huella | Doble cómputo y subtotal |
| **M8** | Saldos con apertura histórica | Lista cerrada; ninguno explícito | `saldoId`, importe, fecha, procedencia | Aperturas; no total de Gastos |
| **M11** | Procedimiento de custodia y acceso | Local cifrado; externo cifrado; híbrido | Autorización P6/P7 futura | Seguridad y auditabilidad |
| **M12** | Revisor independiente | Designar revisor y alcance | Firma | Cierre de la conciliación |
| **M14** | Implementación del seam E2.4 | Autorizar DEV futuro o aplazar | AC-58/propuesta técnica | Consumo E2.4/E4.7 |
| **M15** | Separación/disyunción de agregado | Aceptar la propuesta; modificar; rechazar | Vínculo o disyunción | Total solo-detalle |
| **M16** | Fecha económica | Aceptar la propuesta; modificar; rechazar | `evidenciaFecha` por fuente | Atribución de fecha |
| **DT7** | Aprobar el gate documental | Aprobar; aprobar con reservas; rechazar | Inventario, mapping, corte y conciliación revisados | Cierre documental; **no** autoriza DEV |
| **P6/P7** | Datos reales / importación | Mantener no autorizado; autorizar con alcance y fecha | Seguridad y custodia | Trabajo real; gate separado |
| **E4.5** | ¿Enmendar SPEC20 por H-09, `fuenteId` en aperturas o mapping post-corte? | Mantener el comportamiento documentado; enmendar | Decisión funcional | Solo si se quiere otro producto |
| **R-01…R-08** | ¿Promover a AC? | Sí; no | Testplan | Opcional; no bloquea DT7 |

`[PROPUESTA]` Responder cada fila con la plantilla del
[cierre §7](dt7-decision-closure-2026-11-05.md#7-plantilla-de-decisión): ID, decisión,
opción, evidencia (referencia privada), alcance, fecha/responsable y efecto. Una respuesta
sin evidencia deja la decisión `PENDIENTE`; el silencio no aprueba.

---

## 8. Siguiente acción segura

1. **Usuario:** decidir si autoriza la revisión con evidencia privada y designar el canal
   y al asesor. Sin esa autorización, el trabajo se limita a estructura y criterios.
2. **Usuario/asesor:** rellenar §3 (M-1…M-6) y §4 (C-1…C-3) con evidencia real,
   manteniendo fuera del repositorio el documento y los importes. El detalle de la
   evidencia exigida por M1/M2/M5/M8 está en el
   [inventario de evidencias](dt7-evidence-inventory-2026-11-10.md).
3. **Coordinador:** contrastar los checklists, señalar huecos y preparar el DT7 definitivo
   con IDs, hashes, recuentos y agregados sanitizados. No aprueba.
4. **Usuario:** resolver §7 y aprobar o rechazar el DT7 documental. Aprobar DT7 no autoriza
   DEV ni P6/P7.
5. **DEV E4.5:** solo con autorización separada; después API/SQL/importador/UI, QA
   independiente y PR/merge propios.

**No hacer ahora:** rellenar mappings con ficción, declarar un corte verificado, promover
`F-DT7` a PASS, cerrar DT7, abrir Excel/datos reales, implementar importador o cambiar el
tablero.

---

## 9. Límites y verificación

- **No cierra DT7:** M1/M2/M5/M8 siguen `PENDIENTE DE EVIDENCIA`; M4/M7/M15/M16 siguen
  `ACEPTADA COMO PROPUESTA`; M11 mantiene su procedimiento pendiente; M14 sigue sin
  implementación. Los 59 AC siguen `UNRUN`.
- **No declara PASS:** ni funcional, ni de QA, ni de aceptación financiera, ni de
  equivalencia con el Excel.
- **No crea gates ni AC:** `DT7-R-MAP-*` y `DT7-R-CORTE-*` son criterios de revisión de
  este expediente.
- **No usa datos reales:** no se abrió Excel, base real, extracto ni fuente privada; no se
  ejecutaron suites funcionales.
- **No modifica** decisiones, tablero, SPEC20, testplan ni estados de E4.5.
- **Verificación de esta rama:** `python3.12 scripts/validate-template .` PASS y
  `python3.12 scripts/verify baseline` PASS (fase de aplicación no incluida).
