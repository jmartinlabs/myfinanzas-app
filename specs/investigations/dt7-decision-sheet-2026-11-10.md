# DT7 · Hoja de decisiones y revisión privada (2026-11-10)

**Base:** `test` `bff714e`. **Estado:** DT7 abierto; 59 AC de E4.5 `UNRUN`; M1 aprobado;
**M4/M7/M15/M16 ratificadas el 2026-11-16; R-H1…R-H9 aprobados y trasladados; F1/M2 2023
autorizada** (§7).
**Uso:** una sola página accionable. Los criterios completos están en
[inventario de evidencias](dt7-evidence-inventory-2026-11-10.md) y
[cierre DT7](dt7-decision-closure-2026-11-05.md). Este documento no aprueba nada por sí mismo:
solo registra decisiones del usuario, no contiene datos reales y no cierra DT7.

## 1. M1 · ejercicios incluidos — APROBADO 2026-11-10

**Decisión del usuario con revisión de Álex**, sobre la referencia vigente **`MyFinanzas2026_v5.11(20261110-134135).xlsx`** (2026-11-10). La relación con `v5.11(7)` no está
acreditada y no se afirma.. El repositorio no incluye el archivo ni su hash.

| Campo | Decisión |
| --- | --- |
| `ejerciciosIncluidos` | 2023, 2024, 2025 y 2026 |
| `primerEjercicioIncluido` | 2023 |
| 2019–2022 | Excluidos **por alcance**, no por ausencia de información |
| Posteriores a 2026 | Fuera del histórico; operativa futura |

**Límites:** 2023–2025 son histórico parcial y 2026 es transición; la inclusión **no**
acredita cobertura anual, importes ni aperturas. M2 verificará Partidas/fuentes/intervalos;
M5 la regularización de 2026; M8 las aperturas de Saldos de forma independiente de M1 (depende del inventario M2). No se borra nada del Excel. No se declara `estadoUniverso=Acreditado`.

**Evidencia de la decisión:** revisión financiera de Álex y el usuario sobre `MyFinanzas2026_v5.11(20261110-134135).xlsx`.
Referencia privada por año y hash: **`UNRUN`** (no verificable desde el repositorio; puede
existir en privado). El repositorio no contiene importes ni datos privados.

**Texto de la aprobación (usuario, 2026-11-10):** «APRUEBO la delimitación temporal de M1:
histórico desde 2023.» (mensaje de coordinación del 2026-11-10; revisión financiera con
Álex).

**Registro M1:** `M1 · APROBADA · 2026-11-10 · usuario (revisión Álex) · alcance 2023–2026 ·
evidencia: `MyFinanzas2026_v5.11(20261110-134135).xlsx`, privada, UNRUN · efecto: fija el universo, no acredita cobertura,
importes ni aperturas; M2/M5/M8 sin cambios`.

## 1.1 Siguiente paso: M2 de 2023 — AUTORIZADO 2026-11-16

**Autorización del usuario (2026-11-16, §7):** iniciar F1/M2 privada de 2023 **limitada a
preparar** el inventario, el mapping y el procedimiento de conciliación. Sin acceso de agentes a
datos financieros reales, sin importación y sin publicación de información privada.

Primer ejercicio a mapear. Solo **metadatos estructurales**, sin importes:

1. Lista de Partidas `PARxxx` esperadas en 2023.
2. Para cada Partida, fuentes esperadas (`SRC-*`) con `intervaloEsperado` y estado
   (`Presente`/`Ausente`/`NoAplica`), o `NoAplica` con evidencia negativa.
3. Mapping por campo/ID/archivo/apertura/Referencia con `idMapeo`, `version`, `estado`,
   `evidencia` y vigencia.
4. Conciliación de filas (0 sin explicación) y de importes (0 céntimos) en privado.
5. Verificación de que no hay `Dxxx`, ni destinos creados, ni Partidas absorbidas.

**Criterios:** `DT7-EV-M2-01…04`. **No** se fijan listas ni mappings por inferencia; cada
dato debe venir de la revisión privada. La inclusión de 2023 no depende de que su apertura
esté acreditada (decisión de alcance M1); M8 la valida aparte. La plantilla material de M2
sigue **`UNRUN`** hasta completar el inventario privado.

### Paquete de arranque de F1 (lo que se prepara sin datos)

| Pieza | Quién | Estado |
| --- | --- | --- |
| Plantilla del inventario por ejercicio, solo encabezados y contratos de columna | Coordinador | Contrato en [laboratorio M2](dt7-m2-lab-2026-11-10.md) §1.2–§1.5; se entrega sin valores |
| Contrato de mapping por ID, campo y archivo | Coordinador | [laboratorio M2](dt7-m2-lab-2026-11-10.md) §2; se entrega como checklist vacío |
| Criterios de conciliación (0 filas / 0 céntimos) y su evidencia | Coordinador | [laboratorio M2](dt7-m2-lab-2026-11-10.md) §4; sin datos |
| Cumplimentación del inventario y mapping de 2023 | Usuario, en privado; Álex revisa | `[PENDIENTE]`: no la hace ningún agente |
| Conciliación de 2023 | Usuario, en privado | `[PENDIENTE]`: 0 filas / 0 céntimos |
| Registro de la decisión M2 | Usuario | `[PENDIENTE]`: solo llega el estado, no los datos |

**Salida de F1:** inventario y mapping de 2023 completos y conciliados en privado, con
`DT7-EV-M2-01…04` verificables y sin un solo valor publicado. F1 **no** abre M5, M8, E45-A2,
DEV ni importación.

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
  por M1 y **autorizado el 2026-11-16** (§1.1 y §7).
- Nada de E4.5 DEV nuevo, E45-A2, importación, F2/F3/F4 ni datos reales.

## 7. Registro de la decisión del usuario — 2026-11-16

**Decisión del usuario (2026-11-16), tras la revisión favorable de Álex** sobre #424 y la
revisión 1 de PR #483. Se registra el alcance; no se amplía. Detalle del paquete R-H en
[el análisis de #424](dt7-424-analysis-2026-11-16.md) §9.

| Acuerdo | Registro |
| --- | --- |
| **M4/M7/M15/M16** | `RATIFICADA · 2026-11-16 · usuario · conforme a [cierre DT7](dt7-decision-closure-2026-11-05.md) §2 · alcance: M4 NoAplica solo con evidencia; M7 representación por vínculo fiable; M15 disyunción acreditada sin prorrateos; M16 fecha económica solo con evidencia · efecto: ninguna regla nueva, no abre M2/M5/M8 ni DEV` |
| **R-H1…R-H9** | `APROBADO · 2026-11-16 · usuario · alcance: nueve requisitos, incluida la separación R-H8 (restore técnicamente íntegro) / R-H9 (histórico financieramente acreditado) · exclusión: no autoriza ejecución, custodia efectiva, retención real ni cambios operativos` |
| **Traslado documental a `vps-infra#42` y `#34`** | `AUTORIZADO Y REALIZADO · 2026-11-16 · solo documental, con trazabilidad y enlaces entre Issues · publicado en #42 (comment 6918562902) y #34 (comment 6918566976) · exclusión: no autoriza ejecución ni operación de infraestructura` |
| **F1/M2 privada 2023** | `AUTORIZADA · 2026-11-16 · alcance: preparar inventario, mapping y procedimiento de conciliación · exclusiones: sin acceso de agentes a datos financieros reales, sin importación, sin publicación de información privada` |
| **M5/M8 y E45-A2** | `SIN CAMBIOS · pendientes de evidencia` |
| **DT7 y AC de E4.5** | `SIN CAMBIOS · DT7 abierto; los 59 AC de E4.5 siguen UNRUN` |

**Texto de la aprobación (usuario, 2026-11-16):** «Tras la revisión favorable de Álex, APRUEBO:
1. Ratificación de M4/M7/M15/M16 […]. 2. R-H1…R-H9, incluyendo la separación entre restauración
técnicamente íntegra (R-H8) e histórico financieramente acreditado (R-H9). Autorizo
exclusivamente su traslado documental a jmartinlabs/vps-infra#42 y #34, con trazabilidad y
enlaces entre las Issues. 3. Inicio de F1/M2 privada de 2023, limitado a preparar el inventario,
mapping y procedimiento de conciliación. Sin acceso de agentes a datos financieros reales, sin
importación y sin publicación de información privada.»

**Límites declarados en la misma decisión:** nada de desarrollo de E4.5, P6/P7, migraciones,
importaciones, cambios operativos de infraestructura, acceso a datos personales, despliegues ni
modificaciones del Excel. El cierre de #424 es la finalización del trabajo documental, **no** la
aceptación funcional de DT7.
