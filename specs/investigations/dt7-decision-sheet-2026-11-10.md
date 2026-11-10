# DT7 · Hoja de decisiones y revisión privada (2026-11-10)

**Base:** `test` `bff714e`. **Estado:** DT7 abierto; 59 AC de E4.5 `UNRUN`; M1 aprobado.
**Uso:** una sola página accionable. Los criterios completos están en
[inventario de evidencias](dt7-evidence-inventory-2026-11-10.md) y
[cierre DT7](dt7-decision-closure-2026-11-05.md). Este documento no aprueba nada,
no contiene datos reales y no cierra DT7.

## 1. M1 · ejercicios incluidos — APROBADO 2026-11-10

**Decisión del usuario con revisión de Álex**, sobre `MyFinanzas2026_v5.11(20261110-134135).xlsx`.

| Campo | Decisión |
| --- | --- |
| `ejerciciosIncluidos` | 2023, 2024, 2025 y 2026 |
| `primerEjercicioIncluido` | 2023 |
| 2019–2022 | Excluidos **por alcance**, no por ausencia de información |
| Posteriores a 2026 | Fuera del histórico; operativa futura |

**Límites:** 2023–2025 son histórico parcial y 2026 es transición; la inclusión **no**
acredita cobertura anual, importes ni aperturas. M2 verificará Partidas/fuentes/intervalos;
M5 la regularización de 2026; M8 las aperturas de Saldos de forma independiente. No se
borran datos anteriores del Excel. No se declara `estadoUniverso=Acreditado`.

**Evidencia de la decisión:** revisión financiera de Álex y el usuario sobre la versión
v5.11 indicada. El repositorio no contiene importes ni datos privados.

## 1.1 Siguiente paso: M2 de 2023

Primer ejercicio a mapear. Solo **metadatos estructurales**, sin importes:

1. Lista de Partidas `PARxxx` esperadas en 2023.
2. Para cada Partida, fuentes esperadas (`SRC-*`) con `intervaloEsperado` y estado
   (`Presente`/`Ausente`/`NoAplica`), o `NoAplica` con evidencia negativa.
3. Mapping por campo/ID/archivo/apertura/Referencia con `idMapeo`, `version`, `estado`,
   `evidencia` y vigencia.
4. Conciliación de filas (0 sin explicación) y de importes (0 céntimos) en privado.
5. Verificación de que no hay `Dxxx`, ni destinos creados, ni Partidas absorbidas.

**Criterios:** `DT7-EV-M2-01…04`. **No** se fijan listas ni mappings por inferencia; cada
dato debe venir de la revisión privada. 2023 no requiere apertura acreditada para entrar
en M1; M8 la valida aparte.

## 2. Decisiones por bloque

| ID | Decisión | Quién | Requiere Excel | Salida |
| --- | --- | --- | --- | --- |
| **M1** | Años incluidos, primero y exclusiones | Usuario; Álex revisa | **Sí** | **APROBADA 2026-11-10:** 2023–2026; 2019–2022 fuera por alcance |
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

## 6. Trabajo técnico posible mientras se revisa M2–M8

- Mantener CI, tablero y correcciones de estabilidad ya autorizadas.
- Preparar la plantilla M2 de 2023 y el contraste de estructura (sin valores), ya habilitado
  por M1.
- Nada de E4.5 DEV nuevo, E45-A2, importación, F2/F3/F4 ni datos reales.
