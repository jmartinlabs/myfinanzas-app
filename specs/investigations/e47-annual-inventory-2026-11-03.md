# E4.7 — Inventario anual de fuentes y fronteras (decisión)

**Fecha:** 2026-11-03 · **Base original:** `main` `8b5cf5c` · **Actualización:** 2026-11-04
sobre `main` `0b8aade` · **Estado:** inventario documental.
**Sin SPEC25, sin DEV25, sin PASS.** `[CONFIRMADO]` = regla aprobada o hecho verificado;
`[PROPUESTA]` = criterio propuesto; `[PENDIENTE]` = decisión del usuario.

## Actualización 2026-11-04

Esta sección prevalece sobre el inventario del 2026-11-03. El cuerpo original se conserva como
histórico; las filas superadas llevan la marca «Actualizado 2026-11-04». No se reabre ninguna
spec aprobada, no se crea SPEC25 y no se autoriza DEV.

**Cambios de estado respecto del inventario original** `[CONFIRMADO]`:

| Punto | 2026-11-03 | 2026-11-04 |
|---|---|---|
| E3.6 | Integrado DEV21/PR #180 | **MERGED `a26fffb`**; solo lectura, sin esquema |
| E4.3 | Spec aprobada, sin DEV | **Integrado v24** (A+B+C+QA y fix 409) |
| E4.6 | DRAFT, PR #179, Q1–Q12 abiertas | **Spec/testplan aprobados**; DEV24 en **PR #201 OPEN** |
| E4.9 | Spec aprobada, sin DEV | DEV en **PR #200 OPEN** (A+B núcleo), sin merge |
| E4.11 | «Aprobada, sin DEV» | **Sin SPEC propia ni DEV**; solo roadmap y contrato mínimo |
| E2.6 | Contrato documental | **Contrato real fijado el 2026-11-04**: subtotales `Parcial` con `valor:null` |

### A.1 Inventario de fuentes corregido

| Fuente / motor | Estado real 2026-11-04 | Evidencia | Límite para E4.7 |
|---|---|---|---|
| **E2.4** Plan anual | Integrado. `annualEquivalent`/`annualExecution`; proveedor por defecto `unavailable` (`plan-anual.ts:47-54`). Si no hay cobertura completa, `ejecutado:null`, `subtotalRegistrado` y `cobertura:Parcial` (`:235-249`). | Código en `0b8aade`; SPEC10 aprobada. | Sin E4.5/DT7 no hay histórico; el Ejecutado no es total anual. E4.7 lee el plan y su cobertura; no reimplementa la suma. |
| **E2.6** Flujo mensual | Integrado y **solo por Ciclo**. Contrato real 2026-11-04: `ingresos`, `gasto`, `extraordinaria` y `nómina` devuelven `valor:null` + `subtotal` + `Parcial` (`flujo-mensual.ts:492-509`); `operativo` y `margenReal` quedan `No disponible` (`:595-605`, `:658-662`); `margenEstructural` puede calcularse si media y Base existen (`:663-673`). | Decisión registrada en PR #201; comportamiento ya presente en `0b8aade`. | No agrega año natural ni ingresos anuales; no hay `valor` que sumar. Un subtotal de subtotales no es total anual. |
| **E3.6** Pendientes | **MERGED `a26fffb`** (DEV21). Solo lectura, sin esquema; `listPendientes` (`pendientes.ts:1275`), `sinTotalEconomico:true` (`:138-143`); `flujoBase` por Ciclo (`:124-130`). | Tablero y código en `0b8aade`. | No existe total económico; `flujoBase` no es anual; Comida/E3.5 sigue ausente. E4.7 consume `G_n`/`S_aj` por Ciclo, no los suma como año. |
| **E4.3** Valoración | **Integrado v24**: A+B `3b9be46`, C `8552d4a`, QA `dd56553`, fix 409 `17d86c3`; API `/api/e43/...` (`app.ts:1154-1202`). QA de cobertura 15 PASS / 2 PARCIAL, sin PASS de aceptación. | Tablero, líneas 31-39; commits en `main`. | Valoración por corte, Manual/Automática; no calcula patrimonio global. Si E4.7 lo incluye, solo contexto al corte, nunca flujo anual. |
| **E4.4** Deuda completa | Integrado DEV17, **MERGED `024b348`** (PR #176; `deuda-completa.ts:584,601`). | Tablero, línea 17. | Es stock, no magnitud anual. Si aparece, bloque patrimonial separado; no se suma a Gastos ni al flujo. |
| **E4.5 / DT7** Archivo | Spec/testplan aprobados 2026-10-28; **sin DEV**. DT7 abierto. Solo Gastos (Q2=A, `spec20:63-64`); no ingresos históricos. | SPEC20; tablero. | Sin runtime no hay total anual verificado. E4.7 solo puede definir `NoAcreditada`, subtotal+motivo y AC UNRUN. |
| **E4.6** Inicio | Spec/testplan **APROBADOS** 2026-11-03 (Q1–Q12=A; `5dc1dd3`); DEV24 en **PR #201 OPEN** (A+B+C), sin merge. Según PR: 12/12 API, 4/4 E2E; AC-01/AC-27 PARCIAL y AC-20/21 UNRUN. | PR #201; SPEC24. | No compara años, no agrega año/trimestre, no consume archivo ni calcula márgenes nuevos (`spec24:73-80`). Es consumidor, no fuente de E4.7; no acoplar E4.7 a su DTO/UI. |
| **E4.9** Cierre / foto | Spec aprobada 2026-10-28; DEV en **PR #200 OPEN** (A+B núcleo, v25), sin merge. QA APTO CON RESERVAS; faltan guards T1/T2/T3, UI/E2E C y DT6. | PR #200; SPEC27. | No hay cierre ni foto disponible. E4.7 sigue siendo cálculo vivo y no puede certificar un año ni sustituir E4.11. |
| **E4.11** Fotos de periodo | **Sin SPEC propia ni DEV**. Solo roadmap y contrato mínimo `spec20:1134-1140`; depende de E4.5/E4.9/E4.10. | Roadmap; SPEC20. | No hay foto anual. No confundir archivo ni cálculo vivo con foto; fuera del alcance de E4.7 salvo enlace futuro. |

### A.2 Contrato real de E2.6 tras la decisión del 2026-11-04

`[CONFIRMADO]` El motor E2.6 no publica `valor` cuando la cobertura histórica del intervalo no
está acreditada. Publica el importe registrado como `subtotal` y marca la métrica `Parcial`.
La decisión está registrada en la descripción del PR #201 y el comportamiento ya existe en
`0b8aade`.

| Métrica E2.6 | DTO real | Estado | Lectura correcta |
|---|---|---|---|
| `ingresos`, `gasto`, `extraordinaria`, `nómina` | `valor:null`, `subtotal` con los hechos registrados, `motivo` de cobertura | `Parcial` | El subtotal es conocido, no certificado; no es total del Ciclo ni del año. |
| `operativo` (`S`) | `valor:null`, `subtotal:null` | `No disponible` | Sus tres componentes tienen `valor:null`; no se fabrica la resta. Cuando sea calculable seguirá siendo `Parcial` por definición. |
| `margenReal` | `valor:null` | `No disponible` | Es `Nómina cobrada − Del mes` y se etiqueta «Margen del PLAN»; no es resultado real ni ahorro ejecutado. |
| `margenEstructural` | Puede tener `valor` si media y Base son verificables; `Parcial` si la media lo es | `Verificado`/`Parcial`/`No disponible` | Es un margen del plan; no se convierte en margen anual ni en resultado real. |
| `S_aj` de E3.6 | Derivado de `G_b − R_adj`; siempre `Parcial` cuando es calculable | `Parcial`/`No disponible` | No es un margen ni «ahorro real»; no se suma a los márgenes de E2.6. |

**Qué implica para el flujo anual** `[CONFIRMADO]`:

1. `valor:null` no es `0` y `subtotal` no es total. Un anual que sume `valor` no tiene operandos.
2. Si E4.7 suma subtotales de Ciclo, el resultado es un **subtotal de subtotales** con la peor
   cobertura; debe publicarse como `subtotalConocido` + estado + motivo, nunca como «total anual».
3. `operativo` y `margenReal` no se pueden anualizar mientras sean `No disponible`; se muestran
   como ND con motivo o se omiten. No se rellenan con una cifra distinta.
4. `margenEstructural` sigue siendo un margen del plan; no autoriza un «margen medio anual» ni
   un «margen real puntual».
5. El DTO anual no debe tener un campo `totalAnual` incondicional. Todo agregado lleva `alcance`
   (`Anual`/`HastaCorte`), `estado`, `subtotalConocido` y `motivo`.
6. La cobertura se declara por Ciclo y por año natural; no se mezclan para completar una cifra.
7. Los ingresos históricos siguen `No disponible` (E4.5 Q2=A); no se reconstruyen desde el plan
   ni desde E2.6.

> **Defecto documental detectado** `[CONFIRMADO]`: en `main` `0b8aade`, los ejemplos DTO de
> `spec24:304-308` aún muestran `valor` numérico para métricas E2.6 y cifra en `operativo`/
> `margenReal`. El PR #201 declara esos ejemplos alineados; hasta el merge no deben usarse como
> contrato. La fuente vigente es el código de E2.6 y esta decisión.

### A.3 Decisiones DT8 pendientes, agrupadas

DT8 no es una única decisión. Para E4.7 se agrupa en tres bloques; solo el primero exige
criterio financiero nuevo.

| Bloque | Qué falta | Decidible ya por composición | Requiere criterio del usuario |
|---|---|---|---|
| **D8-M — Márgenes** | `margen medio` y `margen real puntual` no tienen fórmula aprobada. `margen plan` no está separado: `margenReal` y `margenEstructural` ya se declaran del plan. Falta la agregación anual de cualquier margen. | Qué motor posee cada cifra; mostrar `margenEstructural` y `margenReal` con su etiqueta y cobertura de E2.6; no sumar márgenes entre Ciclos ni lanes; no calcular sobre `null`. | Fórmula y denominador de «medio» y «real puntual»; si «plan» es categoría propia; si el anual es suma, media de márgenes o margen de agregados; tratamiento de Bonus, extraordinaria y Recuperado; meses parciales. |
| **D8-Z — Coste esencial nulo** | Solo queda el formato de meses y cualquier cociente nuevo que E4.7 quisiera publicar. | `[CONFIRMADO]` coste verificado `0` → `mesesCubiertos` `No disponible`, nunca `0`/infinito; coste parcial o incompleto → `No disponible`; no se divide un subtotal (`spec24:150-163`, AC-16). `0` anual sigue siendo decisión explícita, no ausencia (`spec10:17,34`). | Si E4.7 introduce un ratio anual nuevo: definirlo o prohibirlo; formato exacto de meses (2 decimales es propuesta DT8); presentación del caso 0 en el informe. |
| **D8-F — Formato y filtros** | Selector año/Ciclo/Partida, columnas, exportación, densidad 1440/390 y tratamiento de ausencias. | `es-ES`, importes tabulares, dos decimales visuales, sin color como único estado, sin ocultar el motivo `Parcial`/`ND`; no mostrar totales parciales como definitivos. | Filtros y columnas exactas; exportación; orden; rutas; si el informe es pantalla, PDF u otra salida; revisión visual final. |

**Recomendación para no bloquear la spec** `[PROPUESTA]`: publicar solo los márgenes que E2.6
ya define (`margenEstructural` y `margen frente a nómina real`, con la etiqueta «plan»), y
mostrar `margen medio` y `margen real puntual` como `No disponible — definición pendiente DT8`.
Si el usuario quiere un margen real puntual, su fórmula debe nacer en el motor propietario
(E2.6/E3.6), no en E4.7. Así E4.7-AC3 queda especificado con cobertura visible, pero no PASS.

### A.4 Cobertura histórica: qué publica E4.7

**Qué necesita E4.5/DT7** `[CONFIRMADO]`:

- DT7 debe declarar un **universo cerrado** de Partidas y fuentes esperadas por ejercicio, con
  `fuenteId`, intervalos, mapping versionado, excepciones y evidencia. No se deduce del catálogo,
  de E2.4, del archivo ni de los Movimientos (`spec20:252-320`).
- E4.5 debe estar desarrollado (hoy no lo está) para combinar archivo y detalle, deduplicar,
  calcular huecos/solapes y emitir `estadoCobertura`/`estadoTotal`.
- E2.4 necesita el proveedor histórico de E4.5; hoy su proveedor por defecto es `unavailable`.

**Qué se publica** `[CONFIRMADO]`:

- Por Partida y ejercicio: `archivo`, `detalleControl`, `detallePrecontrol`, `total` (solo si
  procede), `alcanceTotal`, `subtotalConocido`, `estadoCobertura`, `estadoTotal`, `corte`,
  `fuentes`, `procedencia`, `motivoCodigo`, `motivo` y `sinClasificar` (`spec20:1099-1106`).
- `subtotalConocido` + motivo + cobertura cuando no hay total certificable.
- `HastaCorte` cuando el corte no es 31/12 y la evidencia llega hasta ese corte; no se etiqueta
  como anual (`spec20:1094-1097,1107-1109`).
- `0` verificado solo si la cobertura es completa, el intervalo está acreditado y no hay hechos
  elegibles; nunca por ausencia de tabla o de fuente.

**Qué nunca se publica como total anual** `[CONFIRMADO]`:

- Un total con `estadoCobertura=NoAcreditada`, `Parcial`, `NoDisponible` o `Solapada`.
- Un total con huecos, fuente ausente, solapamiento, mapping pendiente, duplicado ambiguo o
  registro no atribuible al corte.
- Un `HastaCorte` presentado como anual; un año futuro presentado como `0`.
- Archivo + detalle sin deduplicación; archivo agregado sin desglose separable; aperturas
  históricas; ingresos, Transferencias, Amortización o deuda sumados al total de Gastos.
- Inversión, Comida o patrimonio como parte del total anual de Gastos.
- Un cálculo vivo etiquetado como foto o cierre.

`NoAcreditada` prevalece y no se degrada a `Parcial`; `NoDisponible` de una Partida no se
propaga automáticamente al global (`spec20:1107-1115`).

### A.5 Propuesta de especificación E4.7 (SPEC25)

`[PROPUESTA]` Abrir una SPEC25 **de solo lectura y sin DEV**, con estas secciones:

1. Estado, autoridad, alcance y frontera con E2.4/E2.6/E3.6/E4.3/E4.4/E4.5/E4.6/E4.9/E4.11.
2. Definiciones: ejercicio natural, Ciclo, corte, cobertura, subtotal, total verificado,
   `HastaCorte`, cálculo vivo y foto.
3. Matriz fuente/magnitud/propietario y regla «una fuente por magnitud».
4. Composición anual: qué se puede sumar, qué solo se lista, qué queda ND y cómo se propaga la
   cobertura. Sin fórmulas nuevas.
5. Contrato de lectura del resumen anual (DTO conceptual de A.5.2).
6. Márgenes: solo los publicados por E2.6; bloque DT8-M marcado `[PENDIENTE]`.
7. Cobertura histórica y subtotales: contrato E4.5, `NoAcreditada` y motivos.
8. Pantallas, carriles, filtros y formato; bloque DT8-F.
9. Vacíos, carga, errores, degradación por fuente y reintento.
10. AC y trazabilidad al testplan; fuera de alcance y dependencias.

#### A.5.1 Carriles

| Carril | Fuente propietaria | Contenido | Regla |
|---|---|---|---|
| **Plan** | E2.4 (y E2.3 para el plan del Ciclo, solo enlace) | Líneas por Partida/ejercicio, Presupuesto, Esencial, Ejecutado y cobertura | Año natural; no se suma al flujo real. |
| **Previsión** | E2.5 | Simulación por paga/mes, si existe contrato consumible | No crea hechos y no se suma como año; si no hay contrato anual, `No disponible` con motivo. |
| **Realidad** | E2.6 + E3.6 + Movimientos | Métricas por Ciclo, `G_n`/`S_aj` y hechos por fecha natural | Un Ciclo puede cruzar año; se muestran ambos. Los subtotales no se convierten en total. |
| **Archivo** | E4.5 | Registros históricos y combinación con detalle, por ejercicio | Solo Gastos; no se suma al flujo de un Ciclo ni al plan mensual. |

#### A.5.2 DTO conceptual (solo lectura)

Nombres alineados con `Metric` de E2.6/E4.6 y con el contrato E4.5; no es un contrato cerrado.

```ts
type ResumenAnual = {
  ejercicio: number;                    // año natural consultado
  corte: { fecha: string | null; fuente: string; estado: Estado };
  cobertura: {
    estado: "Completa" | "Parcial" | "NoAcreditada" | "NoDisponible" | "Solapada";
    fuentes: FuenteCobertura[];
    motivos: string[];
  };
  carriles: {
    plan: CarrilPlan;
    prevision: CarrilPrevision;
    realidad: CarrilRealidad;
    archivo: CarrilArchivo;
  };
  margenes: {
    estado: "Pendiente DT8" | "Parcial" | "No disponible";
    publicados: MargenPublicado[];       // solo E2.6; sin fórmula nueva
  };
  enlaces: Enlace[];                     // IDs/rutas, sin importes en URL
};

type Metrica = {
  valor: string | null;                  // decimal exacto; null ≠ 0
  subtotal: string | null;               // conocido, no certificado
  estado: "Verificado" | "Parcial" | "No disponible" | "Cero verificado" | "No aplica";
  motivo: string;
  fuente: string;
  ids: string[];
  cobertura: string;
};

type CarrilPlan = {
  estado: Estado;
  items: {
    partidaId: string;
    presupuesto: string | null;
    esencial: "Sí" | "No" | "Pendiente";
    ejecutado: Metrica;
    diferencia: Metrica | null;
  }[];
};

type CarrilPrevision = {
  estado: "No disponible" | "Parcial";
  motivo: string;                        // E2.5 no publica previsión anual
  enlace: string | null;
};

type CarrilRealidad = {
  estado: Estado;
  ciclos: {
    cicloId: string;
    inicio: string;
    fin: string | null;
    corte: string;
    ejercicios: number[];                // puede cruzar diciembre/enero
    ingresos: Metrica;
    gasto: Metrica;
    extraordinaria: Metrica;
    operativo: Metrica;
    margenReal: Metrica;
    margenEstructural: Metrica;
    ajusteCompartidos: { gNeto: string | null; sAjustado: string | null; estado: Estado };
  }[];
  subtotalConocido: string | null;
};

type CarrilArchivo = {
  estado: Estado;
  items: {
    partidaId: string;
    archivo: string | null;
    detalleControl: string | null;
    detallePrecontrol: string | null;
    total: string | null;
    alcanceTotal: "Anual" | "HastaCorte";
    subtotalConocido: string | null;
    estadoCobertura: string;
    estadoTotal: string;
    motivo: string;
  }[];
  subtotalConocido: string | null;
};
```

No existe `totalAnual` en el DTO. Cualquier agregado es `subtotalConocido` con `estado`,
`alcance` y `motivo`; un `total` solo aparece donde su propietario lo certifica. Los tipos
auxiliares (`Estado`, `FuenteCobertura`, `MargenPublicado`, `Enlace`) se detallan en la SPEC;
aquí solo se fija su papel.

#### A.5.3 Año natural y Ciclo

`[CONFIRMADO]` El ejercicio natural es el año civil de la fecha del hecho; el Ciclo es la
ventana de `tblCiclos` y puede cruzar diciembre/enero (`spec21:382-396`). E4.7 muestra ambos y
no reasigna hechos. Un Ciclo que cruza año aparece en los dos ejercicios con sus fechas y su
`cicloId`; no se prorratea ni se copia el archivo de un año a otro (`spec20:1122-1123`).

`[PROPUESTA]` No reutilizar el año de `mesFinanciado` de E4.6 (Q4=A) como año del hecho: E4.6
lo usa para el coste esencial (`spec24:133-135`); E4.7 usa la fecha natural del hecho y, si
muestra el coste esencial como contexto, declara su procedencia.

#### A.5.4 Sin duplicar motores

`[PROPUESTA]` E4.7 **compone y enlaza**, no recalcula:

- Plan y Ejecutado anual: E2.4/E4.5.
- Flujo, `S`, `margenReal`, `margenEstructural`: E2.6.
- `G_n`, `S_aj`, pendientes: E3.6.
- Archivo, cobertura y deduplicación: E4.5.
- Valoración y resultado de posiciones: E4.3, solo si el alcance lo incluye.
- Deuda viva: E4.4, solo como contexto patrimonial separado.
- Cierre/foto: E4.9/E4.11, fuera de esta entrega.

No se crean tablas, snapshots, cachés persistidas ni fórmulas alternativas. Los cálculos de
presentación (suma de subtotales, agrupación por año) se declaran en la spec y conservan
`fuente`, `ids`, `estado` y `motivo`.

### A.6 Riesgos y criterios de entrada

| Riesgo | Efecto | Mitigación / criterio |
|---|---|---|
| Sumar `subtotal` y llamarlo total anual | Cifra falsa y decisión financiera incorrecta | Sin `totalAnual`; `subtotalConocido` + estado + motivo; AC específico. |
| Duplicar archivo + detalle o archivo + Ciclo | Gasto inflado | E4.7 consume E4.5; no reimplementa el combinador; AC con archivo y detalle. |
| Mezclar año natural y Ciclo | Hechos reasignados o prorrateados | Mostrar ambos; `cicloId` + `ejercicios`; AC con Ciclo que cruza diciembre. |
| Acoplar E4.7 a E4.6 (PR abierto) | Reescritura por contrato no estable | Consumir E2.6/E2.4/E3.6 directamente; E4.6 solo enlace/consumidor. |
| E4.5 sin DEV/DT7 | No hay total anual ni AC1 ejecutable | Spec con `NoAcreditada`, subtotal+motivo y AC UNRUN; no simular archivo. |
| E4.9 sin merge/foto | Un cálculo vivo se presenta como cierre | Etiqueta «cálculo vivo, sin foto»; E4.9/E4.11 fuera del alcance. |
| E4.3 manual/cobertura parcial | Patrimonio ficticio | Si entra, solo posiciones con cobertura y al corte; no patrimonio global. |
| DT8-M sin resolver | AC3 no puede PASS | Agrupar decisiones; publicar solo márgenes existentes y ND el resto. |
| Deriva documental (SPEC23/24/27 y tablero) | Se cita un estado obsoleto | Este documento y el PR/commit mandan; corregir encabezados al mergear. |

**Criterios de entrada a SPEC25** `[PROPUESTA]`:

- [ ] DT8-M, D8-Z y D8-F respondidos por el usuario, o diferidos explícitamente con `ND`.
- [ ] Alcance cerrado: sin patrimonio global; inversión/deuda solo contexto si se aprueba;
      sin cierre/foto.
- [ ] Confirmado que E4.7 consume E2.6/E2.4/E3.6/E4.5 y no E4.6.
- [ ] Aceptado que sin E4.5 DEV/DT7 solo habrá subtotales y AC UNRUN.
- [ ] Sin tablas, migraciones, datos reales ni motores nuevos.
- [ ] Aprobación de la SPEC, no del DEV.

### A.7 Propuesta de siguiente paquete: `E4.7 · SPEC` (SPEC25)

| Campo | Contenido |
|---|---|
| **ID** | `E4.7 · SPEC` / SPEC25; solo documentación. |
| **Objetivo** | Especificar el resumen anual de solo lectura y sus fronteras, con las decisiones DT8 agrupadas. |
| **Entradas** | Esta actualización; roadmap E4.7; SPEC10/12/20/21/23/24/27; tablero y estado Git/PR actual. |
| **Entregables** | `specs/25-e47-resumen-anual-specification.md`, testplan y, si el usuario lo pide, wireframes; registro de decisiones DT8. |
| **Decisiones del paquete** | D8-M márgenes; D8-Z coste 0 y cocientes; D8-F formato/filtros. |
| **AC candidatos** | E4.7-AC1 (archivo+detalle sin duplicar amortización), AC2 (fuentes temporales y `G_n` del mismo motor), AC3 (márgenes con cobertura; parcial hasta DT8). Añadir AC de no-total, año/Ciclo y `NoAcreditada`. |
| **Exclusiones** | DEV25, código, esquema, migración, datos reales, E4.5 DEV, merge E4.9, E4.11 y fotos. |
| **Salida** | SPEC aprobada por el usuario y DT8 registradas; el DEV exige autorización separada. |

**Preguntas DT8 para el usuario** `[PENDIENTE]`:

1. **D8-M:** ¿qué fórmula y denominador tienen «margen medio» y «margen real puntual»? ¿El
   margen «plan» es una categoría propia o el nombre de `margenReal`/`margenEstructural`? ¿El
   anual es suma, media de márgenes o margen de agregados?
2. **D8-Z:** ¿E4.7 publica algún cociente anual nuevo? Si no, se mantiene la regla confirmada:
   coste 0 → `mesesCubiertos` ND y ningún cociente con denominador 0. ¿Formato de meses?
3. **D8-F:** ¿qué filtros (año, Ciclo, Partida, cobertura), columnas, exportación y salida
   (pantalla/PDF) necesita el informe?

**No autoriza DEV.** El paquete termina cuando el usuario aprueba la SPEC y las decisiones; no
cuando se implementa.

## 1. Fuentes y motores

| Motor | Estado | Límite para E4.7 |
|---|---|---|
| **E2.4** Plan anual | Integrado; `annualEquivalent`/`annualExecution` (`apps/api/src/plan-anual.ts:97-259`). | Proveedor por defecto `unavailable` (`:47-54`): sin histórico/control, Ejecutado anual parcial/null. |
| **E2.6** Flujo mensual | Integrado; `monthlyFlow` (`flujo-mensual.ts:469`), `margenReal`/`margenEstructural` (`:649-673`), ajuste compartido (`:751-806`). **Actualizado 2026-11-04:** `ingresos`/`gasto`/`extraordinaria`/`nómina` devuelven `valor:null` + `subtotal` + `Parcial` (`:492-509`); `operativo` y `margenReal` quedan `No disponible` (`:595-605`, `:658-662`). | Solo por Ciclo; no agrega año natural ni ingresos anuales; no hay `valor` que sumar en un total anual. |
| **E3.6** Pendientes | Integrado DEV21; **MERGED `a26fffb`** (PR #180); `pendientes.ts:1275`; sin total económico (`:138-143`). | Comida/E3.5 no disponible; `flujoBase` solo por Ciclo. |
| **E4.4** Deuda completa | Integrado DEV17; **MERGED `024b348`** (PR #176; `deuda-completa.ts:584,601`). | Solo si E4.7 incluye bloque patrimonial/deuda; es stock, no flujo anual. |
| **E4.5 / DT7** Archivo | Spec/testplan aprobados 2026-10-28, **sin DEV a 2026-11-04**; DT7 abierto (`specs/20-historico-precontrol-specification.md:3-6`). Solo Gastos (Q2=A, `:63-64`). | Total anual solo con cobertura completa y universo DT7 (`:252-320,1099-1132`); sin ingresos históricos. |
| **E4.6** Inicio | **Spec/testplan APROBADOS** 2026-11-03 (Q1–Q12=A; `5dc1dd3`); DEV24 en **PR #201 OPEN**, sin merge; DTO/UI no es contrato estable. *(Histórico 2026-11-03: «DRAFT no aprobada, PR #179, Q1–Q12 abiertas».)* | No compara años ni consume archivo (`spec24:73-80`); no es fuente de E4.7. |
| **E4.3** Valoración | **Integrado v24** (A+B `3b9be46`, C `8552d4a`, QA `dd56553`, fix `17d86c3`); API `/api/e43/...`; QA 15 PASS / 2 PARCIAL, sin PASS de aceptación. *(Histórico 2026-11-03: «Spec aprobada, sin DEV»; el encabezado de SPEC23 conserva ese estado.)* | Ya no bloquea DEV; si E4.7 incluye patrimonio/valoración, solo contexto al corte; no flujo anual. |
| **E4.9** Cierre | Spec aprobada 2026-10-28; DEV en **PR #200 OPEN** (A+B núcleo, v25), sin merge; QA APTO CON RESERVAS; faltan guards T1/T2/T3, UI/E2E C y DT6. *(Histórico: «aprobada, sin DEV».)* | **Downstream** de E4.7 (`roadmap.md:376,387`); no hay cierre/foto; E4.7 sigue vivo. |
| **E4.11** Fotos | **Sin SPEC propia ni DEV**; solo roadmap y contrato mínimo `spec20:1134-1140`; depende de E4.5/E4.9/E4.10. *(La fila original las agrupaba y decía «aprobadas»; E4.11 no tiene spec aprobada.)* | No hay foto anual; no confundir archivo o cálculo vivo con foto. |

## 2. Fronteras

- **Ejercicio natural vs Ciclo** `[CONFIRMADO]`: año = fecha civil del hecho; Ciclo = ventana de `tblCiclos`, puede cruzar diciembre/enero. Se muestran ambos sin reasignar (`specs/21-pendientes-conciliacion-specification.md:377-396`; `specs/20-historico-precontrol-specification.md:433-448`).
- **Plan / previsión / realidad / archivo** `[CONFIRMADO]`: E2.4/E2.3 plan; E2.5 previsión (no crea hechos); Movimientos realidad; E4.5 archivo solo Gastos (`specs/11-nomina-prevision-specification.md:17-20`; `specs/12-flujo-mensual-specification.md:87-105`).
- **Una fuente por magnitud** `[PROPUESTA]`: E4.7 compone y enlaza; no reimplementa E2.4/E4.5/E3.6. Gastos anuales desde E2.4/E4.5; flujo y márgenes desde E2.6; Neto compartido desde E3.6, nunca `G_b + Neto` (`spec21:318-375`).
- **Comida auxiliar** `[CONFIRMADO]`: no crea Gasto central ni se suma/resta al flujo (`spec21:358-366`).
- **Cobertura** `[CONFIRMADO]`: `null` ≠ `0`; `HastaCorte` no es anual; `NoAcreditada` no certifica (`spec20:1107-1113`).

## 3. Diseñable ya vs decisiones

**Diseñable ya** `[PROPUESTA]`: resumen anual de solo lectura que seleccione ejercicio, declare corte/cobertura, consuma E2.4/E2.6/E3.6/E4.5, separe Ciclo y año y muestre plan/previsión/realidad en carriles distintos; sin tablas, snapshots ni totales persistidos.

| Requiere decisión | Estado | Efecto |
|---|---|---|
| **DT8: márgenes medio/estructural/real puntual/plan** | `[PENDIENTE]`; solo definidos `Margen frente a nómina real` (`spec12:167`) y `Margen estructural` (`spec12:168`). **Actualizado 2026-11-04:** se agrupa en D8-M (márgenes), D8-Z (coste 0/cocientes) y D8-F (formato/filtros); ver A.3. | Sin D8-M no se cumple E4.7-AC3 ni se cierra la spec; los márgenes no definidos se publican `ND`. |
| **DT7 / E4.5 DEV** | `[PENDIENTE]`; sin archivo runtime. | Sin total anual verificado ni AC1 real; la spec puede definir `NoAcreditada`. |
| **Patrimonio / E4.3** | `[PENDIENTE]`; **E4.3 ya está integrado** (2026-11-04) y no bloquea DEV; sigue abierto si E4.7 muestra patrimonio/valoración. *(Histórico: «E4.3 sin DEV».)* | Si entra, solo contexto al corte; el flujo anual no lo suma. |
| **Total anual verificado** | `[PENDIENTE]`; exige cobertura completa, universo DT7 y sin huecos/solapes/mapping. | Si no: subtotal + motivo, nunca total. |
| **Previsión anual / E4.6** | `[PENDIENTE]`; E2.5 solo simula por paga/mes; E4.6 no compara años. **Actualizado 2026-11-04:** E4.6 está en PR #201, pero sigue sin comparación anual. | No sumar previsión como año; consumir motores propietarios. |

## 4. Recomendación

**Actualización 2026-11-04 — recomendación vigente** `[PROPUESTA]`: **sí abrir `E4.7 · SPEC`
(SPEC25), acotada y sin DEV**, con las decisiones DT8 agrupadas. El motivo principal del
2026-11-03 para no abrirla ya no se sostiene: E4.3 está integrado y E4.6 tiene spec aprobada y
PR #201. Persisten E4.5 sin DEV/DT7 y D8-M, pero no impiden especificar; obligan a que el
contrato nazca con `NoAcreditada`/subtotal y AC UNRUN. La spec no debe fijar fórmulas nuevas de
márgenes ni prometer un total anual.

*(Histórico 2026-11-03, superado en su conclusión: «No abrir SPEC25 completa ahora» porque
obligaría a fijar contratos provisionales de E4.6, E4.5, E4.3 y DT8. Se conserva como
justificación del inventario; la situación de E4.3/E4.6 cambió.)*

## 5. Decisiones y próximos pasos

1. `[PENDIENTE]` D8-M: fórmulas/denominadores de los márgenes medio y real puntual, relación con
   plan/estructural y agregación anual.
2. `[PENDIENTE]` ¿Patrimonio/valoración y deuda entran? Recomendación: no como flujo anual; solo
   contexto al corte si el usuario lo pide.
3. `[PENDIENTE]` Previsión anual: simulación separada, no suma.
4. `[CONFIRMADO]` E4.6: spec aprobada y PR #201; consumir motores propietarios, no su DTO/UI.
5. `[CONFIRMADO]` Ingresos históricos: solo detalle; precontrol No disponible (E4.5 Q2=A).
6. `[CONFIRMADO]` Neto compartido: `G_n = G_b − R_adj`, atribuido por Gasto.
7. `[CONFIRMADO]` Coste esencial 0: `mesesCubiertos` `No disponible`, sin división por 0
   (`spec24:153-159`, AC-16).

**Próximo paso:** el coordinador lleva D8-M/D8-Z/D8-F al usuario y prepara el paquete
`E4.7 · SPEC`. La aprobación de la SPEC no autoriza DEV25 ni PASS; este documento sigue siendo
evidencia de inventario y frontera.

## Cierre para el usuario — 2026-11-04

- **E4.3 ya está integrado** (v24); **E4.6 y E4.9 tienen PR abierta** (#201 y #200); **E3.6 está
  mergeado** (`a26fffb`); **E4.5 sigue sin DEV** y DT7 abierto.
- **E2.6 ya no publica totales**: ingresos, gasto, extraordinaria y nómina son subtotales
  `Parcial` con `valor:null`; `operativo` y `margenReal` son `ND`. E4.7 no puede fabricar un
  total anual.
- **DT8 se reduce a tres bloques**: márgenes (medio/real puntual sin fórmula), coste esencial 0
  (regla ya confirmada; solo quedan formato y cocientes nuevos) y formato/filtros.
- **Sin E4.5/DT7** solo hay subtotal + motivo + cobertura; nunca total anual, `HastaCorte`
  anualizado ni archivo sumado al Ciclo.
- **Propuesta**: abrir `E4.7 · SPEC` (SPEC25) sin DEV, consumiendo motores existentes y sin
  tablas nuevas; los márgenes no definidos se publican como `ND`.
- **Siguiente paso**: que el usuario responda las tres preguntas DT8 y autorice la SPEC; el
  coordinador prepara el paquete. **No se autoriza desarrollo.**
