# DT7 · Hoja de decisiones y revisión privada (2026-11-10)

**Base:** `test` `9c9544b`. **Estado:** DT7 abierto; 59 AC de E4.5 `UNRUN`.
**Uso:** una sola página accionable. Los criterios completos están en
[inventario de evidencias](dt7-evidence-inventory-2026-11-10.md) y
[cierre DT7](dt7-decision-closure-2026-11-05.md). Este documento no aprueba nada,
no contiene datos reales y no cierra DT7.

## 1. Primera decisión: M1 · ejercicios incluidos

**Decide el usuario (responsable financiero), con revisión de Álex.**

Declarar, con evidencia privada del libro:

1. `ejerciciosIncluidos`: lista de años naturales que entran en el histórico.
2. `primerEjercicioIncluido`: año inicial con apertura utilizable.
3. Años excluidos y motivo (sin datos, previo al sistema, duplicado, etc.).

**Evidencia exacta necesaria:** para cada año, hoja/tabla del libro que lo contiene,
qué cubre (resumen anual, archivo, Movimientos), versión y fecha, y la apertura de Saldos
con la que arranca. No basta con que el año aparezca en E2.4 o en un archivo.

**Por qué primero:** fija el universo. Sin M1 no pueden acotarse M2 (Partidas/fuentes),
M5 (regularización 2026) ni M8 (aperturas). Un año no se incluye por inferencia.

**Salida:** registro M1 firmado (ID, opción, evidencia, alcance, fecha/responsable) y
`estadoUniverso` solo para años con declaración completa.

## 2. Decisiones por bloque

| ID | Decisión | Quién | Requiere Excel | Salida |
| --- | --- | --- | --- | --- |
| **M1** | Años incluidos, primero y exclusiones | Usuario; Álex revisa | **Sí** | Lista y transición declaradas |
| **M2** | Inventario cerrado de Partidas y fuentes por año; mapping por campo/ID/apertura/Referencia; conciliación 0 filas / 0 céntimos | Usuario aporta; coordinador mapea | **Sí** (mapping y conciliación) | Mapping versionado y evidencia |
| **M5** | Regularización 2026: checklist M6, inclusión/no duplicidad, separabilidad | Usuario; Álex | **Sí** | Aprobada / Pendiente / Rechazada / Dividida |
| **M8** | Lista cerrada de aperturas `Sxxx` o «ninguno» explícito | Usuario | **Sí** | Lista y firma |
| **M12** | Revisor independiente y firma | Usuario | No | Nombre/rol y alcance |
| **M13** | Autorización P6/P7 | Usuario | No | Autorizada / no autorizada |
| **E45-A2** | ¿Aperturas requieren `fuenteId` declarado (B) o inventario separado (C)? | Usuario + DT7 M2/M8 | **Sí** (M2/M8) | B/C y alcance |

Decisiones que pueden tomarse **sin** el Excel: M12 (revisor) y M13 (P6/P7). El resto
depende de contrastar el libro y sus Criterios.

## 3. Procedimiento mínimo de revisión privada

1. **Estructura sin datos:** el coordinador entrega las plantillas del inventario
   (encabezados, IDs, criterios) sin valores, importes ni rutas privadas.
2. **Cumplimentación local:** el usuario completa en un libro/entorno privado, fuera del
   repositorio, PR, CI y herramientas externas. Solo se admiten capturas o extractos
   anonimizados si el usuario lo autoriza expresamente.
3. **Contraste:** Álex revisa Criterios, fuentes y coherencia; el coordinador solo
   contrasta estructura, hashes y criterios técnicos, nunca importes reales.
4. **Registro de decisión:** se firma el registro por bloque (M1, M2, M5, M8) con ID,
   opción, evidencia, alcance, fecha y responsable. Se conserva en privado.
5. **Trazabilidad pública:** al repositorio solo llega el estado (`[PENDIENTE]`,
   `[LISTO PARA DECISIÓN]`, decisión tomada) y un hash/referencia privada, sin datos.

**Responsables:** usuario decide; Álex revisa; coordinador funcional mantiene mapping,
pruebas y trazabilidad; infraestructura mantiene custodia y DT6. Ningún dato real se
sube al repositorio.

## 4. Verificación por bloque

- **M1:** `DT7-EV-M1-01…03` — cada año con referencia privada; primero incluido y
  exclusiones motivadas; año sin cobertura no vale `0.00`.
- **M2:** `DT7-EV-M2-01…04` — Partida con fuente o `NoAplica` justificado; `intervaloEsperado`
  obligatorio; mapping 100 % con versión y evidencia; conciliación 0 filas / 0 céntimos.
- **M5:** `DT7-EV-M5-01…03` — checklist M6 completo; solo ejercicio 2026; importe/signo
  exactos; Q5=A no se generaliza; aprobador, fecha y motivo constan.
- **M8:** `DT7-EV-M8-01…03` — cada `Sxxx` existe; `Dxxx` fuera; «ninguno» explícito; la
  apertura no suma a Gastos ni escribe Saldos/Deudas.

## 5. E45-A2 · qué evidencia la desbloquea

1. ¿Las aperturas tienen `fuenteId` propio en el libro?
2. ¿Comparten inventario con Gastos o exigen un conjunto separado?
3. ¿Existe al menos una apertura `Sxxx` con fuente demostrable?

- Si la evidencia responde **sí** a 1 y 3 y **comparten** inventario: opción **B**
  (exigir `fuenteId` declarado).
- Si exigen inventario separado: opción **C** (`fuentesApertura[]`, requiere enmienda).
- Sin evidencia: E45-A2 sigue **provisional y bloqueada**; el motor no cambia.

## 6. Trabajo técnico posible mientras se revisa

- Mantener CI, tablero y correcciones de estabilidad ya autorizadas.
- Preparar la plantilla de M2 y el contraste de estructura (sin valores) una vez M1 esté
  decidido.
- Nada de E4.5 DEV nuevo, E45-A2, importación, F2/F3/F4 ni datos reales.
