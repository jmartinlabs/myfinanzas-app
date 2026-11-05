# DT7 — Propuesta de cierre de decisiones (2026-11-05)

**Estado:** `[PROPUESTA REVISADA]` — **NO APROBADA.** Ninguna recomendación de este documento es una
decisión, un cierre de DT7, un PASS ni una autorización de DEV, datos reales, importación,
P6/P7, SQL, migración, despliegue o merge. Los 59 AC siguen `UNRUN`.

**Revisión 2026-11-05:** Álex emite **APTO CON TRES AJUSTES**. El usuario acepta como
propuesta de decisión M4/M7/M15/M16; confirma las cuatro opciones A ya integradas en
C1–C8 (M14); propone ratificar M9–M13; mantiene M1/M2/M5/M8 pendientes de evidencia
privada real.

- **Base:** `main` **`136713b`** (squash de #217; documento DT7 preparatorio integrado).
- **Entrada:** `specs/investigations/dt7-preparation-2026-11-05.md`, SPEC20/testplan,
  roadmap DT7 y la guía del usuario del 2026-11-05.
- **Objetivo:** separar (A) decisiones que pueden cerrarse con una recomendación técnica
  concreta y contratos ya aprobados, (B) decisiones que exigen evidencia real del usuario,
  y (C) decisiones de gobernanza/seguridad. Ninguna se resuelve por inferencia.
- **Guía del usuario:** conciliación íntegra, sin tolerancias monetarias automáticas;
  aprobación del usuario para excepciones con efecto financiero; P6/P7 y datos reales
  **no autorizados**.

## 0. Reglas de esta propuesta

1. Una recomendación técnica **no** es una decisión aprobada, salvo M14 A, confirmada como
   contrato y sin implementación autorizada. El resto debe aceptarse, modificarse o
   rechazarse expresamente.
2. Una decisión que exige evidencia real no se simula con ficción. La ficción sirve para
   el contrato y las pruebas, no para acreditar el universo, las fuentes ni los importes.
3. No se reabren D4, D14, Q5=A, Q7=A ni Q10=A.
4. No se convierte una opción «recomendada» en estado `Aprobado` del mapping, del universo
   o de una excepción.
5. P6/P7, Excel, importación, DEV y merge conservan sus gates separados.

## 1. Clasificación de M1–M16

| ID | Tema | Grupo | Qué se propone ahora | Quién decide | Gate | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| **M1** | Ejercicios del histórico | **B** evidencia real | Preparar plantilla y criterios; no fijar años | Usuario con evidencia | G-DT7 | `PENDIENTE DE EVIDENCIA` |
| **M2** | Partidas y fuentes por ejercicio | **B** evidencia real | Preparar formato de inventario; no fijar listas | Usuario con evidencia | G-DT7 | `PENDIENTE DE EVIDENCIA` |
| **M3** | Identidad de fuentes sin ID | **A** técnica | Identidad estable y conservación ante cambios de fila/coordenada | Usuario sobre recomendación | G-DT7 | `AJUSTADA, PENDIENTE` |
| **M4** | Evidencia de `NoAplica`/Referencia | **A** técnica (política) | Reutilizar `referenciaOrigen`/`estadoMapeoReferencia`; no asumir | Usuario sobre recomendación | G-DT7 | `ACEPTADA COMO PROPUESTA` |
| **M5** | Regularización 2026 concreta | **B** evidencia real | Checklist y estados; no aprobar el registro | Usuario con evidencia | G-DT7 | `PENDIENTE DE EVIDENCIA` |
| **M6** | Checklist de evidencia de regularización | **A** técnica | Separar mapping de Partida y de Referencia; D4 | Usuario sobre recomendación | G-DT7 | `AJUSTADA, PENDIENTE` |
| **M7** | Evidencia de representación/precontrol | **A** técnica | Vínculo de origen o tupla+huella; nunca importe | Usuario sobre recomendación | G-DT7/G-E2.4 | `ACEPTADA COMO PROPUESTA` |
| **M8** | Saldos con apertura histórica | **B** evidencia real | Formato y límites; no fijar lista | Usuario con evidencia | G-DT7 | `PENDIENTE DE EVIDENCIA` |
| **M9** | Aprobador de excepciones financieras | **C** gobernanza | Usuario aprueba; coordinador solo prepara | Usuario | G-DT7 | `PROPUESTA DE RATIFICACIÓN` |
| **M10** | Conciliación y tolerancia | **C** gobernanza | 100 % y 0 céntimos; sin tolerancia automática | Usuario | G-DT7 | `PROPUESTA DE RATIFICACIÓN` |
| **M11** | Custodia/acceso a evidencia | **C** seguridad | Custodia privada cifrada y acceso mínimo; sin datos reales ahora | Usuario | G-P6/P7 + G-DT7 | `PROPUESTA DE RATIFICACIÓN` |
| **M12** | Firma de conciliación independiente | **C** gobernanza | Revisor independiente + aprobación del usuario | Usuario | G-DT7/G-DT6 | `PROPUESTA DE RATIFICACIÓN` |
| **M13** | Autorización P6/P7 | **C** seguridad | **No autorizada**; se mantiene el gate | Usuario | G-P6/P7 | `PROPUESTA DE RATIFICACIÓN` |
| **M14** | Adaptación E2.4 | **A** técnica | Cuatro opciones A confirmadas; implementación futura | Usuario sobre recomendación | G-E2.4/G-DEV | `CONFIRMADO (A); implementación PENDIENTE` |
| **M15** | Separación/disyunción de agregado | **A** técnica | Vínculo de origen o disyunción aprobada; sin prorrateo | Usuario sobre recomendación | G-DT7 | `ACEPTADA COMO PROPUESTA` |
| **M16** | Evidencia de fecha económica | **A** técnica | Campo/evidencia por fuente; `null` por defecto | Usuario sobre recomendación | G-DT7/G-E2.4 | `ACEPTADA COMO PROPUESTA` |

## 2. Recomendaciones técnicas (A)

**Estado tras la revisión:** M4/M7/M15/M16 aceptadas como propuesta de decisión; M3/M6
ajustadas y pendientes; M14 A confirmada como contrato; M9–M13 propuestas de ratificación;
M1/M2/M5/M8 pendientes de evidencia real.

### M3 — Identidad de fuentes sin ID

**Recomendación:** identidad estable y verificable, sin limitar las fuentes sin ID a
agregados anuales.

**Ajuste 2026-11-05:** se elimina la restricción a agregados anuales y se explicita la
conservación de identidad cuando cambian filas o coordenadas.

1. `fuenteId` lógico estable por rol/alcance, asignado en el inventario DT7; una versión
   nueva conserva el ID y actualiza hash/versión (`SPEC20:282-286`).
2. Identidad de registro:
   - con ID de origen: `(fuenteId, hojaTabla, idOrigen)`;
   - sin ID: `(fuenteId, hojaTabla, fila/columna, huella normalizada)` y, si existe,
     etiqueta de origen aprobada;
   - el nombre editable y el importe **nunca** son identidad.
3. La coordenada congelada puede usarse en **cualquier** fuente, no solo en agregados
   anuales, siempre que se documente y verifique; no se impone esa restricción.
4. **Conservación ante cambios de fila o coordenada:**
   - si existe un ancla estable (ID/clave), prevalece y la coordenada es solo procedencia;
   - si no existe, la identidad se conserva con la tupla de origen congelada + huella
     normalizada + etiqueta aprobada, no con la posición actual;
   - un movimiento de fila/columna se registra como nueva versión de mapping/archivo con
     coordenada anterior y nueva, motivo, evidencia y vigencia; no se reasigna por nombre,
     importe, orden ni parecido;
   - si no se puede probar que es el mismo registro, queda `Pendiente`/`Ambigua` y no suma;
   - si aparece un ID estable después, se incorpora conservando la historia y la
     procedencia anterior.
5. Si dos identidades compiten, `Pendiente`/`Ambigua`; no se suma ni se elige.
6. La evidencia por fuente (qué columnas, qué ID, qué coordenada) se aporta en M2; la
   política no acredita ninguna fuente real.

**Reutiliza:** D4 (identidad/procedencia), REQ-DT7-03, `procedencia.idOrigen` opcional.
**Verificación ficticia:** F-DT7-05/14/19.
**Riesgo residual:** una fuente sin ancla estable y con filas reordenadas puede quedar
fuera del total hasta que el usuario apruebe su reanclaje con evidencia.

### M4 — Evidencia de `NoAplica` y Referencia declarada

**Recomendación:** reutilizar el contrato existente y exigir evidencia negativa.

1. Usar `procedencia.referenciaOrigen` (texto o `null`) y `estadoMapeoReferencia`; no se
   crea un campo nuevo.
2. `NoAplica` solo con evidencia de que la fuente no declara Referencia (columna, esquema
   o muestra).
3. Si declara y no hay destino, `Pendiente`/`Ambigua`; nunca `NoAplica` por defecto.
4. `referenciaOrigen` se conserva para trazabilidad; no se infiere `REFxxx`.
5. La evidencia real por fuente queda en M2; la política no la sustituye.

**Reutiliza:** REQ-DT7-04, AC-59, `procedencia.referenciaOrigen`.
**Verificación ficticia:** F-DT7-05.
**Riesgo residual:** una fuente mal clasificada contaminaría el desglose por Referencia.

### M6 — Checklist de evidencia de regularización

**Recomendación:** checklist mínimo que separa mapping de Partida y de Referencia, sin
aprobar el registro concreto.

**Ajuste 2026-11-05:** se separan mapping de Partida y de Referencia y se aplica D4; la
evidencia de la regularización sigue siendo obligatoria.

**Mapping de Partida (`estadoMapeo`):**

- `Mapeado` es obligatorio para sumar.
- `Pendiente`/`Ambigua`/`Excluido` van a `sinClasificar` y bloquean el total de la
  Partida y el global; no se sustituyen por una Referencia.

**Mapping de Referencia (`estadoMapeoReferencia`):**

- `Pendiente`/`Ambigua` **no bloquean automáticamente** el total por Partida si no cambian
  Partida, elegibilidad, identidad económica ni deduplicación (D4); el desglose queda
  `Incompleto`.
- Si la Referencia puede cambiar la atribución económica, el total global y la Partida
  afectada quedan `NoVerificable`.
- `NoAplica` exige evidencia de que la fuente no declara Referencia; `Mapeado` certifica
  el desglose.

**Evidencia obligatoria de la regularización (Q5=A), independiente del mapping de Referencia:**

- Tipo `Regularizacion2026`, ejercicio 2026, intervalo dentro de 2026.
- Importe y signo explícitos; Partida/Referencia si procede.
- Procedencia (fuente, huella, hoja, fila/columna, versión).
- `representadoEnMovimientos` y evidencia de no duplicidad.
- Evidencia de inclusión previa en archivo/Movimiento o de ausencia.
- Aprobador, fecha, alcance y motivo.
- Si falta cualquier punto de la regularización: `Pendiente`/`NoVerificado`; no suma.

**Límite:** aprobar el checklist no aprueba el registro; eso es M5.

### M7 — Evidencia de representación y precontrol

**Recomendación:** vínculo verificable, nunca importe.

1. `representadoEnMovimientos=Si` exige ID de Movimiento/registro o tupla de origen
   verificada; el archivo se excluye y el hecho cuenta una vez. **`Si` sin vínculo
   verificado se normaliza a `Desconocido`; nunca se excluye en silencio** y el total
   queda `NoVerificable`.
2. `No` exige `evidenciaRepresentacion` por identidad/origen/huella; no por ausencia de
   coincidencia de importe.
3. `Desconocido` no certifica ni contamina el subtotal sin evidencia de no duplicidad.
4. `detallePrecontrolNoVinculado` impide el total; el vinculado cuenta una vez.
5. La coincidencia de importe, nombre o fecha no es vínculo.

**Reutiliza:** REQ-DT7-05, AC-50, F13/F-DT7-12.
**Verificación ficticia:** F-DT7-06/12/21.
**Riesgo residual:** sin vínculo, el total queda `NoVerificable`; es el comportamiento
correcto, no un defecto a relajar.

### M14 — Adaptación E2.4

**Recomendación:** ampliar el seam tipado y decidir por separado las cuatro filas de C1.4.

**Confirmado por el usuario (2026-11-05):** las cuatro opciones A ya integradas en C1–C8.
No se reabren ni se infieren opciones B. La implementación técnica es trabajo futuro y no
autoriza código ni DEV. Las cuatro filas confirmadas son:

| Hueco C1.4 | Opción A (confirmada) | Opción B (no adoptada) |
| --- | --- | --- |
| Control por Partida/fuente | `controles[]` con `fuenteId`, `partida` e intervalo; `control` obsoleto | Mantener `control` único y limitar el proveedor a un alcance |
| Estado global y `sinClasificar` | `AnnualSources` expone universo, cobertura global, `sinClasificar[]` y `conflictos[]`; `read()` propaga | Agregado global precalculado por el consumidor |
| Procedencia estructurada | Objeto `AnnualProvenance` (identidad, huella, versiones, ubicación) | String canónico validado por esquema |
| Tri-estado de representación | Unión `Si/No/Desconocido` + `vinculo` + evidencias | Dos booleanos que pueden contradecirse |

- Mantener compatibilidad: `historicoDisponible:false` por defecto y ausencia de proveedor
  no rompe E2.4.
- No usar `verificado:false` como sustituto de estados ni `procedencia:string` como
  sustituto de provenance estructurada.
- **Al aplicar la ampliación, actualizar `vehiculos.ts` y `plan-anual.test.ts` en el mismo
  cambio**; `controles[]` sustituye a `control` y no se mantienen dos lecturas de
  cobertura.
- El adaptador E4.5→E2.4 se documenta y prueba con fixtures; **no se implementa ni se
  modifica esquema en esta fase**.
- Alternativas: adaptar E4.5 con campos no representables (descartable), nueva interfaz
  de proveedor (mayor alcance) o aplazar AC-58 (no recomendable).

**Reutiliza:** C1–C8, C1.4, AC-58, `AnnualSources`/`AnnualHistory`.
**Gate:** G-E2.4 + G-DEV; la recomendación no autoriza código.

### M15 — Separación/disyunción de agregado

**Recomendación:** solo dos evidencias admiten sumar detalle sin el agregado:

1. vínculo de origen verificado (`representadoEnMovimientos=Si` con el hecho identificado);
2. separación/disyunción aprobada que demuestre que el agregado no contiene esos hechos.

Sin ellas: total `NoVerificable`, sin prorrateo, sin resta y sin elegir fuente. Si el
agregado excede el corte: `AgregadoNoAtribuibleAlCorte`, contexto separado.

**Reutiliza:** AC-39/44, Q10=A.
**Verificación ficticia:** F-DT7-09/18.

### M16 — Fecha económica

**Recomendación:** `fecha` solo con `procedencia.evidenciaFecha`.

- Válidas: fecha del hecho económico acreditada en la fuente.
- No válidas: fecha de documento, extracción, alta, mapping, corte, auditoría, intervalo,
  Periodo previsto o reloj.
- Sin evidencia: `fecha=null`; E2.4 no inventa `fechaEjecutada`; el Gasto detallado puede
  aportar su fecha real.
- La evidencia por fuente se define en M2; no se generaliza.

**Reutiliza:** AC-42, REQ-DT7-03.
**Verificación ficticia:** F-DT7-22.

## 3. Decisiones de gobernanza y seguridad (C)

**Propuesta de ratificación del usuario (2026-11-05).** Las cinco propuestas siguientes
no se consideran ratificadas hasta confirmación expresa; P6/P7 sigue sin autorización.

### M9 — Aprobador de excepciones financieras

**Propuesta de ratificación:** aprobación del usuario para excepciones financieras.

- El **usuario** aprueba toda excepción con efecto en total, cobertura, mapping,
  clasificación, duplicidad o regularización.
- El coordinador prepara el expediente (tipo, alcance, evidencia, efecto, alternativas) y
  no aprueba ni firma.
- Una excepción no cambia la regla general; se registra con vigencia y consumidores.
- Sin aprobación: `Pendiente`; no suma.

### M10 — Conciliación y tolerancia

**Propuesta de ratificación:** conciliación del **100 %** con **0 céntimos** de diferencia.

- Conciliación **íntegra**: 100 % de registros/filas elegibles y **0 céntimos** de
  diferencia.
- Sin tolerancia monetaria automática, sin muestreo que sustituya la cobertura y sin
  compensación entre Partidas.
- Cualquier diferencia exige excepción explícita aprobada por el usuario (M9).
- La verificación es independiente del importador; el total del importador no es oráculo.
- Un fallo de cobertura o de evidencia no se convierte en tolerancia.

### M11 — Custodia y acceso

**Propuesta de ratificación:** custodia privada cifrada y acceso mínimo; P6/P7 no autorizado.

- En esta fase no hay evidencia real ni custodia que activar.
- Cuando P6/P7 se autorice: custodia privada cifrada, acceso mínimo y auditado, hashes y
  agregados sanitizados; nunca el documento real en el repositorio.
- La custodia no sustituye la autorización P6/P7, el gate DT6 ni G-DT7.

### M12 — Firma de la conciliación independiente

**Propuesta de ratificación:** revisor independiente más aprobación del usuario.

- Firma un revisor independiente (no autor del cálculo, no importador) **y** el usuario.
- El coordinador prepara evidencia y reproducible; no se auto-firma.
- La firma cubre candidato/SHA, inventario, mapping, cobertura, excepciones y resultado.
- Sin firma, DT7 no se cierra.

### M13 — P6/P7

**Propuesta de ratificación:** P6/P7 **sin autorización.** Se mantiene el gate. Esta
propuesta no solicita Excel, datos reales, importación ni acceso a fuentes privadas.

## 4. Decisiones que requieren evidencia real (B)

### M1 — Ejercicios del histórico

**Evidencia necesaria:** lista cerrada de ejercicios y primero incluido, con evidencia
privada de cobertura por año y transición. Sin ella: `NoAcreditada`; no se infiere del
archivo, de E2.4 ni de los Movimientos.

**Formato de respuesta:** años incluidos, año inicial, exclusiones, evidencia por año.

### M2 — Partidas y fuentes por ejercicio

**Evidencia necesaria:** inventario cerrado por ejercicio con `PARxxx`, `fuenteId`,
alcance, `Presente`/`Ausente`/`NoAplica` y evidencia. Incluye la identidad por fuente
(M3) y la evidencia de `NoAplica` (M4).

**Formato de respuesta:** tabla por ejercicio/fuente/Partida; evidencia; fuentes
esperadas ausentes.

### M5 — Regularización 2026

**Evidencia necesaria:** expediente del registro concreto (tipo, ejercicio, intervalo,
importe/signo, Partida/Referencia, procedencia, mapping, representación, no duplicidad,
inclusión previa, aprobador). Opciones: aprobar, mantener pendiente, rechazar o dividir si
es separable.

**Límite:** Q5=A ya está aprobada; M5 no la reabre, solo acredita el registro.

### M8 — Saldos con apertura histórica

**Evidencia necesaria:** lista cerrada de `Sxxx` con apertura histórica, importe, fecha,
procedencia y evidencia, o la opción explícita «ninguno». No incluye Deuda (`Dxxx`), que
sigue en E4.4.

**Formato de respuesta:** `saldoId`, importe, fecha, evidencia; ausencias explícitas.

## 5. Matriz de cierre

Estados: `PENDIENTE DE EVIDENCIA` (M1/M2/M5/M8); `ACEPTADA COMO PROPUESTA` (M4/M7/M15/M16,
sin decisión formal); `AJUSTADA, PENDIENTE` (M3/M6 tras la revisión); `CONFIRMADO (A);
implementación PENDIENTE` (M14); `PROPUESTA DE RATIFICACIÓN` (M9–M13).

| ID | Grupo | Recomendación / decisión | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| M1 | B | Años y primero incluido | Privada por año | `PENDIENTE DE EVIDENCIA` |
| M2 | B | Partidas/fuentes por año | Privada por fuente | `PENDIENTE DE EVIDENCIA` |
| M3 | A | Identidad estable; coordenada en cualquier fuente; conservación ante cambios | Fuentes sin ID | `AJUSTADA, PENDIENTE` |
| M4 | A | `NoAplica` solo con evidencia | Esquema/muestra | `ACEPTADA COMO PROPUESTA` |
| M5 | B | Aprobar/pendiente/rechazar/dividir registro | Expediente 2026 | `PENDIENTE DE EVIDENCIA` |
| M6 | A | Mapping de Partida y de Referencia separados; D4 | Spec/Q5=A | `AJUSTADA, PENDIENTE` |
| M7 | A | Vínculo de origen o tupla+huella | Movimiento/registro | `ACEPTADA COMO PROPUESTA` |
| M8 | B | Saldos con apertura o «ninguno» | Lista/evidencia | `PENDIENTE DE EVIDENCIA` |
| M9 | C | Usuario aprueba excepciones financieras | Expediente | `PROPUESTA DE RATIFICACIÓN` |
| M10 | C | 100 % y 0 céntimos; sin tolerancia | Recálculo independiente | `PROPUESTA DE RATIFICACIÓN` |
| M11 | C | Custodia privada cifrada y acceso mínimo; P6/P7 no | Autorización futura | `PROPUESTA DE RATIFICACIÓN` |
| M12 | C | Revisor independiente + aprobación del usuario | Firma | `PROPUESTA DE RATIFICACIÓN` |
| M13 | C | P6/P7 no autorizado | — | `PROPUESTA DE RATIFICACIÓN` |
| M14 | A | Cuatro opciones A confirmadas; implementación futura | C1–C8/AC-58 | `CONFIRMADO (A); implementación PENDIENTE` |
| M15 | A | Vínculo o disyunción; sin prorrateo | AC-39/44 | `ACEPTADA COMO PROPUESTA` |
| M16 | A | Fecha solo con evidencia | AC-42 | `ACEPTADA COMO PROPUESTA` |

## 6. Secuencia de cierre propuesta

1. **Usuario:** revisa los ajustes M3/M6 y los acepta, modifica o rechaza. M4/M7/M15/M16
   ya están aceptadas como propuesta de decisión; M14 A está confirmada.
2. **Usuario:** ratifica o modifica M9–M13; P6/P7 sigue **no**.
3. **Usuario:** aporta evidencia privada para M1/M2/M5/M8 en el canal que autorice; no se
   publica en el repositorio.
4. **Coordinador:** redacta el DT7 definitivo (inventario, mapping por campo, excepciones,
   criterios de aceptación) con evidencia sanitizada y decisiones registradas.
5. **Usuario:** aprueba o rechaza DT7 como gate documental. Aprobar DT7 no autoriza DEV.
6. **M14:** la implementación técnica del seam es trabajo futuro; no se inicia sin
   autorización separada de DEV.
7. **DEV E4.5:** solo con autorización explícita separada; después fixtures ejecutables,
   API/UI, QA independiente y PR/merge propios.
8. **P6/P7 y DT6:** gates separados para datos reales, importación, backup y cierre real.

## 7. Plantilla de decisión

Para cada M1–M16, registrar:

```text
ID:
Decisión: aprobar / modificar / rechazar / mantener pendiente
Opción:
Evidencia (referencia privada, no el documento):
Alcance:
Fecha y responsable:
Efecto en cobertura/total/mapping:
```

Una respuesta sin evidencia deja la decisión en `PENDIENTE`; no se interpreta como
aprobación.

## 8. Límites

- Este documento **no** cierra DT7 ni ratifica M9–M13. M14 A queda confirmada como
  contrato, sin implementación; M4/M7/M15/M16 quedan aceptadas como propuesta, no como
  decisión formal.
- Sin DEV E4.5, datos reales, Excel, importación, P6/P7, SQL, migración, despliegue ni
  merge.
- Los 59 AC siguen `UNRUN`; no se declara PASS funcional.
- #204 y #205 siguen como propuestas, sin implementar.
