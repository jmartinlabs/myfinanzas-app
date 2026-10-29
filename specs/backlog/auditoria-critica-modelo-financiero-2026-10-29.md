# Auditoría crítica del modelo financiero y propuesta de simplificación

Fecha: 2026-10-29. Estado: **propuesta de auditoría independiente para discusión**.
No es una especificación aprobada, no reabre decisiones de las specs vigentes y no
autoriza desarrollo, migración, datos reales ni despliegue.

Base auditada: `main` `454d21a`, coincidente con el remoto de
`jmartinlabs/myfinanzas-app` al realizar la revisión. La auditoría original fue de
lectura: no modificó archivos, no ejecutó pruebas y no abrió bases de datos. Esta
entrega publica únicamente este documento.

Documento relacionado que se conserva sin sustituirlo:
`specs/backlog/auditoria-simplificacion-modelo-financiero.md` (PR draft #131).
Este texto es una segunda lectura independiente, con el mismo objetivo pero con
conclusiones propias sobre la separación entre clasificación, reserva y custodia.

---

## Veredicto de entrada

La propuesta acierta en el diagnóstico, pero la solución que plantea crea el problema
que intenta resolver.

- Acierta al querer **reservas virtuales** sin transferencias bancarias ficticias.
- Acierta al querer **una vista única** de planificación.
- Acierta al cuestionar **Revisión Comida** como segundo registro bancario.
- Falla al convertir **Partida** en reserva y al atar la reserva a un **Saldo** como
  si el dinero tuviera dueño bancario.

La alternativa más sencilla y financieramente sólida es: **caja real en Saldos, un solo
ledger de Movimientos, reservas globales separadas de las Partidas, asignaciones
explícitas y ningún pago ficticio entre Saldos**.

---

## 1. Qué existe realmente

| Capa | Estado | Evidencia |
| --- | --- | --- |
| Saldos, Clasificación, Ciclos, Movimientos, Transferencias, Deuda mínima | Implementado e integrado | SPEC01–06; `apps/api/src/saldos.ts`, `movement-schema.ts` |
| Presupuestos, Plan del ciclo, Plan anual, Nómina, Flujo mensual | Implementado/integrado, con residuales de QA | SPEC08–12; `budget-schema.ts`, `cycle-plan-schema.ts`, `annual-plan-schema.ts` |
| Anticipos, Compartidos, Vehículos, Revisión Comida | Implementado/integrado | SPEC13–16; `revision-comida-schema.ts` |
| Inversiones | Implementado, con AC parciales | SPEC19 |
| Cierre/fotos, histórico precontrol, conciliación, ventas de bróker, deuda completa | Especificado, **no implementado** | SPEC20/22/26/27; tablero |
| E3.5 Comida por ciclo y compensaciones | **No integrado en main**; solo roadmap y cierre técnico local no publicado | No existe `specs/18-*` en main; tablero |

Dos precisiones importantes:

- **No hay tantas contabilidades paralelas como parece.** Solo hay un ledger económico:
  `movimientos`. `Presupuestos`, `cycle_plan_lines` y `annual_plan_lines` son
  configuración/planificación, no hechos. La única contabilidad realmente paralela es
  **Revisión Comida**, que guarda operaciones bancarias individuales con importe, fecha
  y clasificación propios.
- **Terminal no es una cuenta ni un ledger**: es un valor de `Control` en `saldos`. Su
  posición se declara «no aplicable» (`saldos.ts`, `position()`), así que no se concilia.

---

## 2. Diagnóstico: los problemas reales

### 2.1. Dos ejes de planificación distintos

El plan mensual se guarda por **Presupuesto** (`cycle_plan_lines.presupuesto`), pero el
plan anual se guarda por **Partida** (`annual_plan_lines.partida`). Son dos unidades de
plan diferentes.

Consecuencia: no existe «una sola cifra de plan» por concepto. El usuario tiene que
mantener dos árboles mentales y es fácil que el anual y el mensual no cuadren. La
propuesta lo detecta bien, pero lo resuelve fusionando todo en Partida.

### 2.2. `Presupuesto.fuente` mezcla financiación y consumo

`fuente` vale `Gasto real`, `Aportación a saldo` o `No aplica`. En la misma entidad y
bajo la misma columna «Ejecutado» conviven dos significados:

- `Gasto real`: ejecutado = gastos de las Partidas vinculadas.
- `Aportación a saldo`: ejecutado = transferencias reales al Saldo destino.

Eso es una sobrecarga semántica. «Ejecutado» no significa lo mismo en ambas filas. La
propuesta intenta expresar esa dualidad con «padre que recibe financiación / hijas que
consumen», pero la mete dentro de una sola jerarquía.

### 2.3. `Aportación a saldo` obliga a mover dinero real

La ejecución de una Aportación es una Transferencia real al destino, y dos Aportaciones
no pueden compartir Saldo destino (`budget-schema.ts`, índice
`budget_contribution_destination`). Es una regla heredada del Excel: para reservar, hay
que transferir.

Eso impide exactamente lo que el usuario quiere: **reservar virtualmente sin crear
transferencias bancarias ficticias**. Aquí la propuesta tiene razón.

### 2.4. El «pago desde otro Saldo» ya está resuelto para gastos

En `planes-ciclo.ts`, `executionFacts()` suma los Gastos por Partida **sin filtrar por
el Saldo pagador**. SPEC08 lo dice expresamente: el destino es contexto/cobertura, no
criterio de imputación.

Es decir: hoy un gasto de «Seguro coche» pagado desde OpenBank ya cuenta en el
presupuesto de Gastos Anuales, aunque su destino configurado sea Trade Republic. **No
hay problema de compensación en el modelo actual.**

El problema aparece si se ata la reserva a un Saldo como si fuera propiedad del dinero.
Ahí es donde la propuesta crea una deuda artificial entre Saldos.

### 2.5. Partida no puede ser a la vez clasificación y reserva

Hoy Partida es la unidad de imputación económica: determina Subcategoría y Categoría, y
puede tener Presupuesto y Deuda opcionales (SPEC02). Si se convierte en reserva con
padres e hijas:

- Se añade una **segunda jerarquía** encima de Categoría → Subcategoría → Partida.
- Un padre como «Gastos Anuales» agruparía hijas de categorías distintas: Seguro coche
  (Seguros), IBI (Impuestos), Seguro hogar (Hogar). ¿Qué Categoría/Subcategoría tiene el
  padre? Ninguna puede representar correctamente a todas.
- Los informes por Categoría/Subcategoría tendrían que decidir si suman el padre, las
  hijas o ambas. Es el caldo de cultivo perfecto para contar dos veces.

La agrupación que el usuario quiere ya existe: **Presupuesto agrupa varias Partidas**.
No hace falta convertir la Partida en padre.

### 2.6. Terminal es un caso especial sin posición

`Control=Terminal` no tiene saldo calculable. Se usa para modelar una tarjeta o bolsa
de comida: se financia por Transferencia y se gastan agregados desde ella. Pero no se
concilia con el banco y obliga a ramas especiales en Saldos, Revisión Comida y tests.

Si es una tarjeta prepago real, debería ser un Saldo con `Control=Movimientos` y
apertura. Si es solo un canal de pago, no debería ser una cuenta. En ambos casos, el
`Control=Terminal` sobra en el modelo objetivo.

### 2.7. Revisión Comida sí es un ledger bancario paralelo

La spec dice que es auxiliar y que no crea un segundo Gasto; es cierto. Pero tiene su
propia tabla, sus propios IDs, importes, fechas, clasificación, estado y evidencias.
Ciclos la lee directamente para impacto. Es un segundo registro bancario, aunque no un
segundo gasto económico.

El riesgo no es «contar dos veces el gasto», sino **registrar dos veces el mismo
hecho**: una operación individual en Revisión Comida y un Gasto agregado en Movimientos.
La propuesta de convertirla en vista es correcta en dirección; hay que decidir la
granularidad.

### 2.8. No existe un tipo de devolución de gasto

`movimientos.tipo` solo admite `Ingreso` y `Gasto`; `importe > 0`; y un `Ingreso` no
lleva Partida (`movement-schema.ts`). Una devolución real de una compra:

- como `Ingreso`: infla los ingresos y no reduce el gasto;
- como `Gasto` negativo: el esquema lo rechaza;
- como anulación/rectificación: solo vale para errores, no para una devolución real.

Revisión Comida tiene `esDevolucion`; Movimientos no. Es un hueco contable real, no un
detalle.

### 2.9. Guardas históricas demasiado rígidas

`partida_used_budget` impide cambiar el Presupuesto de una Partida si tiene Movimientos.
`budget_used_configuration` impide cambiar fuente/destino de un Presupuesto usado. Se
trata el vínculo planificado como si fuera historia económica inmutable.

Para corregir la clasificación de un gasto, el usuario acaba creando nuevas Partidas o
Presupuestos. Eso aumenta el catálogo y aleja la app de la realidad. Una reasignación de
reserva debería ser un cambio auditado con impacto, no un bloqueo absoluto.

### 2.10. Anual y mensual son independientes a propósito

SPEC10 dice expresamente que no se sincroniza el plan anual con el mensual. No es un
descuido: son decisiones distintas. Un divisor 12 que convierta automáticamente el anual
en «100 €/mes reservados» rompería esa independencia y, peor, podría convertir un plan
en dinero reservado ficticio.

---

## 3. Comparación de alternativas

| Dimensión | A. Modelo actual | B. Propuesta Partida-reserva | C. Recomendada: reservas globales | D. Solo transferencias reales |
| --- | --- | --- | --- | --- |
| Complejidad técnica | Media, ya implementada | Alta: árbol nuevo, compensaciones, doble jerarquía | Media: reutiliza Presupuesto, añade asignaciones | Baja |
| Facilidad de uso | Media: dos ejes y conceptos solapados | Buena al principio; compleja en pagos cruzados | Alta: un eje, árbol de reservas, sin compensaciones | Media: exige mover dinero |
| Trazabilidad | Alta | Media: deudas entre Partidas difíciles de seguir | Alta: eventos append-only | Alta |
| Conciliación | Alta para caja; Terminal no concilia | Baja/media: deudas y coberturas ficticias | Alta: caja siempre real; cobertura separada | Alta |
| Extensibilidad | Media | Media/baja: jerarquía rígida y un Saldo por padre | Alta: árbol, cadencias, etiquetas | Baja/media |
| Riesgo de duplicidad | Medio: Revisión Comida | Alto: padre/hija + compensación + clasificación | Bajo si se respetan invariantes | Bajo |

**Veredicto comparativo:**

- **A** no es un desastre, pero arrastra artefactos del Excel: Terminal, Aportación con
  transferencia obligatoria, guardas rígidas y dos ejes de plan.
- **B** acierta en reservas virtuales, vista única y eliminar el doble registro; falla al
  fusionar clasificación, reserva y custodia en Partida, y al atar la reserva a un Saldo.
- **C** es la que recomiendo: mantiene la riqueza del modelo actual, elimina los
  artefactos y resuelve el caso difícil sin compensaciones.
- **D** es el fallback si el usuario prefiere verdad bancaria pura y no quiere disciplina
  de asignaciones. No cumple el objetivo de reservar sin mover dinero.

---

## 4. Arquitectura recomendada

### 4.1. Tres preguntas, tres entidades

| Pregunta | Entidad | No debe ser |
| --- | --- | --- |
| ¿Qué es el gasto? | Partida / Categoría / Subcategoría | Saldo o Reserva |
| ¿Para qué está apartado el dinero? | Reserva (árbol de sobres) | Partida o Saldo |
| ¿Dónde está el dinero? | Saldo real | Partida o Reserva |
| ¿Qué ocurrió? | Movimiento | Plan o Reserva |

La clave es **no meter tres ejes en una sola entidad**. La propuesta mete clasificación,
financiación y custodia en Partida; el modelo actual ya mezcla financiación y consumo en
Presupuesto. Hay que separar ambos.

### 4.2. Capas

```text
Capa 1 · Caja real
  Saldos (OpenBank, ING, Trade Republic, efectivo…)
  Movimientos (Ingreso, Gasto, Transferencia, Amortización, Devolución)

Capa 2 · Reservas virtuales
  Reservas / Sobres (árbol: Gastos Anuales > Seguro coche, IBI…)
  Asignaciones (eventos: «apartar 100 € de disponible a esta reserva»)
  Reasignaciones (mover reserva de un sobre a otro, sin mover dinero)

Capa 3 · Clasificación
  Categoría > Subcategoría > Partida
  Partida → Reserva hoja (0..1)

Capa 4 · Plan
  Objetivo anual por reserva
  Aportación mensual/trimestral sugerida
  Esencial sí/no
  Ejecutado real derivado de Movimientos
```

### 4.3. La decisión que elimina el problema difícil

**No atar la reserva a un Saldo como propiedad. El Saldo asociado es solo una preferencia
de cobertura.**

Si la reserva es global:

- OpenBank paga el seguro de 350 €.
- La reserva de Gastos Anuales baja 350 €.
- El efectivo de OpenBank baja 350 €.
- Trade Republic no se toca.
- No hay transferencia ficticia, ni deuda entre Saldos, ni compensación obligatoria.

Si el usuario quiere que Trade Republic «cubra» esa reserva, se muestra como informe de
cobertura: «Trade Republic tiene 5.000 € y la reserva de Gastos Anuales es 850 €;
cobertura suficiente». Si no coincide, se muestra un aviso, no se crea una deuda.

Esto es más simple que la propuesta y responde exactamente al ejemplo planteado.

### 4.4. Asignaciones explícitas, no divisores automáticos

El divisor 12 es una **sugerencia de aportación**, no una reserva automática. La
diferencia:

- Planificado: «quiero apartar 1.200 €/año».
- Asignado: «he apartado 300 €».
- Gastado: «he pagado 350 €».
- Disponible: «me quedan −50 € o 0 € según el caso».

Si el sistema convierte automáticamente el plan en asignación, crea dinero ficticio. La
regla debe ser: **nunca derivar «reservado» de «presupuestado»**. El usuario asigna
explícitamente, aunque la app le sugiera la cifra mensual.

### 4.5. Sin compensación obligatoria

No recomiendo el mecanismo de «seleccionar qué Partida del Saldo pagador adelanta el
dinero». Crea un préstamo entre sobres: la Partida A presta a la B, hay que recordar
quién debe a quién, y el plan de A queda artificialmente infra financiado.

Alternativas más simples:

- Permitir reserva negativa («descubierto de reserva») y mostrarla.
- Permitir una reasignación explícita entre sobres, con motivo.
- Si falta efectivo en el Saldo pagador, mostrar «efectivo insuficiente»; no tomar
  prestado de otro sobre para ocultarlo.

La compensación entre Saldos puede existir como **nota de cobertura opcional** (OpenBank
adelantó 350 € por Trade Republic), pero no como requisito para guardar el gasto ni como
Movimiento.

---

## 5. Ejemplos completos

### 5.1. Asignación inicial

```text
Saldos: OpenBank 2.000 € · Trade Republic 5.000 € · ING Comida 300 €
Reservas: Hipoteca 800 € · Gastos Anuales 1.200 € · Comida 300 €
Asignaciones: 800 + 1.200 + 300 = 2.300 €
Total caja: 7.300 €
Sin asignar: 5.000 €
```

No se mueve dinero. Las reservas son virtuales. Si se quiere, cada reserva tiene un
Saldo preferido para el informe de cobertura.

### 5.2. Financiación mensual y gasto anual

```text
Objetivo Gastos Anuales: 1.200 €/año → sugerencia 100 €/mes
Mes 1: asigno 100 € → reserva 100 €
Mes 2: asigno 100 € → reserva 200 €
Mes 3: asigno 100 € → reserva 300 €
Mes 4: pago seguro coche 350 € desde OpenBank
       → reserva 300 − 350 = −50 €
       → «provisión insuficiente: 50 €»
```

La app no inventa 50 €. El usuario decide si asigna 50 € desde «sin asignar» o desde otra
reserva.

### 5.3. Pago desde otro Saldo, sin compensación

```text
Reserva Gastos Anuales: 1.200 € (preferida: Trade Republic)
Pago seguro: 350 € desde OpenBank
Movimiento: Gasto 350 € · origen OpenBank · Partida Seguro coche

Efectos:
  OpenBank: 2.000 − 350 = 1.650 €
  Trade Republic: 5.000 € (sin cambios)
  Reserva Gastos Anuales: 1.200 − 350 = 850 €
  Caja total: 6.650 €
  Reservado total: 850 €
  Sin asignar: 5.800 €
```

No hay transferencia ficticia ni deuda. Si el usuario quiere que Trade Republic reponga
el efectivo, hace una **Transferencia real** de 350 € de Trade Republic a OpenBank. Eso
no cambia la reserva; solo mueve caja.

### 5.4. Si se insiste en asociar la reserva a un Saldo

La única forma coherente es tratar la asociación como **cobertura**, no como propiedad:

```text
Pago 350 € desde OpenBank contra reserva cubierta en Trade Republic.
Propuesta opcional: reasignar 350 € de cobertura de Trade Republic a OpenBank.
Aceptar → evento de cobertura, sin movimiento bancario.
Rechazar → aviso de cobertura desviada; el gasto sigue siendo correcto.
```

Lo que no recomiendo es crear una deuda entre Partidas ni un Movimiento de compensación.

### 5.5. Reasignación entre reservas

```text
Hipoteca: 800 € · Gastos Anuales: 850 €
Necesito 100 € más para el seguro.
Reasignación: 100 € de Hipoteca → Gastos Anuales.
Resultado: Hipoteca 700 € · Gastos Anuales 950 €.
Caja: sin cambios. No es un Movimiento.
```

Si Hipoteca no tiene 100 €, se bloquea la reasignación por defecto (es una acción de
plan) o se permite con confirmación y reserva negativa. Los gastos reales nunca se
bloquean por el plan.

### 5.6. Devolución

```text
Seguro coche: gasto 350 €.
Devolución del seguro: 50 € a OpenBank.
Movimiento: Devolución 50 € · vinculada al gasto original · Partida Seguro coche.
Efectos: OpenBank +50 €; reserva Gastos Anuales +50 €; gasto neto 300 €.
No es Ingreso. No infla los ingresos.
```

Si la devolución supera el gasto original, se avisa; no se convierte automáticamente en
ingreso.

### 5.7. Saldo insuficiente

```text
Caja total: 500 € · Reservas: 700 €
→ «Sobre asignado: 200 €». No se crea dinero.

Saldo pagador: 100 € · Gasto: 150 €
→ Se permite registrar el hecho real; saldo −50 € con aviso.
→ No se bloquea la realidad ni se inventa una transferencia.

Reserva: 20 € · Gasto: 50 €
→ Reserva −30 €; «provisión insuficiente». No se toma prestado de otro sobre.
```

### 5.8. Provisión trimestral

```text
Objetivo: 1.200 €/año · cadencia trimestral · sugerencia 300 €/trimestre.
Ene: asigno 300 €. Abr: asigno 300 €. Jul: asigno 300 €. Oct: asigno 300 €.
La vista mensual muestra «equivalente 100 €/mes» y «aporte programado 300 €/trimestre»,
pero no suma ambas cifras.
```

La cadencia es una preferencia de financiación; el gasto real manda.

---

## 6. Entidades: conservar, fusionar, eliminar

| Entidad | Decisión | Motivo |
| --- | --- | --- |
| **Saldos** | Conservar, acotar a caja real | Solo custodia; no reservas virtuales |
| **Movimientos** | Conservar como único ledger | Añadir `Devolución`; el resto igual |
| **Partidas** | Conservar como clasificación | Sin padres/hijas; sin saldo de reserva; enlace 0..1 a reserva hoja |
| **Presupuestos** | Conservar y renombrar a **Reservas/Sobres** | Ya agrupa Partidas; añadir padre, objetivo anual, esencial, cadencia; destino = cobertura preferida |
| **Plan del ciclo** | Conservar; cambiar eje a Reserva | Separar «financiado» y «gastado»; mantener Base/Esencial/Del mes |
| **Plan anual** | Fusionar en la Reserva, no eliminar la capacidad | Objetivo anual por reserva/año; conservar esencial, periodo, ejecutado y cobertura |
| **Revisión Comida** | Convertir en vista/extensión de Movimientos | No mantener un segundo ledger económico; conservar clasificación y evidencias |
| **Terminal** | Eliminar como `Control` | Si es tarjeta real, Saldo con `Control=Movimientos`; si no, no es cuenta |
| **Anticipos, Compartidos, Vehículos, Inversiones, Deudas, Ciclos** | Conservar | Ajustar enlaces e impactos |
| **Cierres/fotos** | Conservar y ampliar alcance | Deben fotografiar también reservas y asignaciones |

---

## 7. Invariantes mínimas

1. `Caja_s = apertura + entradas − salidas` (sin anulados; inversiones donde aplique).
2. Una `Transferencia` netea cero entre Saldos; nunca es ingreso ni gasto.
3. Cada `Gasto` cuenta una sola vez; cada `Devolución` reduce una sola vez; no hay
   Gastos negativos ni Ingresos disfrazados de devolución.
4. `Reserva_e = Asignado_e − Gastado_e + Devoluciones_e` por reserva hoja.
5. `Reserva_padre = suma de reservas hijas`; nunca sumar padre e hijas a la vez.
6. `TotalReservado = suma de hojas`; `SinAsignar = CajaTotal − TotalReservado`; puede ser
   negativo y se muestra.
7. `Objetivo` es plan; `Asignado` es dinero apartado; `Gastado` es hecho; nunca derivar
   asignado de objetivo automáticamente.
8. `Disponible = Reserva` (puede ser negativo); no truncar a cero.
9. Solo las hojas tienen Partidas/Gastos; los padres son agrupaciones.
10. Una Partida pertenece como máximo a una reserva hoja; un Gasto tiene una sola reserva.
11. Las asignaciones y reasignaciones son eventos append-only, con actor, fecha y motivo.
12. La realidad nunca se bloquea por el plan: un gasto real se registra aunque falte caja
    o reserva; se avisa.
13. Las acciones de plan (asignar, reasignar) sí se validan contra disponible/reserva y
    pueden bloquearse.
14. No se crean transferencias ni deudas ficticias por pagar desde otro Saldo.
15. Revisión Comida no crea un segundo importe económico; si guarda detalle, suma
    exactamente al Movimiento vinculado.
16. El cierre fotografía caja, reservas, asignaciones y coberturas pendientes.

---

## 8. Impacto por módulo

| Módulo | Impacto | Acción |
| --- | --- | --- |
| **Movimientos** | Añadir `Devolución`; reserva derivada de Partida | Cambio de esquema y reportes; no tocar Transferencia |
| **Saldos** | Eliminar Terminal; informe reservado/disponible | Migrar Terminal a Saldo real o No controlado |
| **Presupuestos** | Renombrar/reshape; quitar unicidad de destino de Aportación; relajar guardas | Migración v18 → nueva versión |
| **Partidas** | Sin jerarquía padre/hija; enlace a reserva hoja | Revisar guards de reasignación |
| **Plan del ciclo** | Eje Presupuesto → Reserva; separar financiado/gastado | Cambio de UI y DTO |
| **Plan anual** | Objetivo por reserva/año; conservar esencial/periodo | Migrar líneas por Partida a su reserva |
| **Revisión Comida** | Vista/extensión de Movimientos; eliminar ledger paralelo | Actualizar Ciclos, E3.5 y pantalla |
| **Ciclos** | Saldo comida desde Movimientos; impacto de Comida | Reescribir consultas que leen `revision_comida` |
| **Anticipos** | Sin cambios; evitar llamar «anticipo» a la cobertura entre Saldos | Solo nomenclatura |
| **Compartidos** | Gasto bruto + recuperación; decidir neto en reserva | Enlazar recuperación al gasto si se quiere neto |
| **Vehículos** | Sin cambios | — |
| **Inversiones** | Reserva solo sobre caja, no sobre posiciones | Aclarar si Trade Republic es efectivo o inversión |
| **Deudas** | Sin cambios; Amortización no es gasto | — |
| **Informes** | Añadir reservado/disponible; no mezclar con flujo de caja | Nuevas métricas, no sustituir las actuales |
| **Cierres/fotos** | Ampliar alcance a reservas/asignaciones | Diseñar antes de implementar cierre |

---

## 9. Riesgos y decisiones pendientes

**Riesgos**

- **Sobreingeniería**: añadir árbol, asignaciones y cadencias puede ser más complejo que
  el modelo actual. Mitigación: MVP con reservas globales, un nivel de árbol, asignación
  mensual y sin compensaciones.
- **Disciplina de asignación**: si el usuario no asigna cada mes, la reserva no crece.
  Mitigación: sugerencias, asignación masiva e importación; no autoasignar.
- **Falsa sensación de protección**: una reserva virtual no impide gastar. Etiquetarla
  como «asignación», no como «saldo».
- **Doble cómputo**: padre/hija y financiado/gastado son los puntos calientes. Los
  invariantes 4–6 y 9–10 deben probarse.
- **Migración**: `presupuestos.fuente`, `annual_plan_lines` por Partida y
  `revision_comida` tienen semántica propia. Mapear antes de tocar código.
- **Cierres**: si las reservas son virtuales y no se fotografían, un cierre puede quedar
  reescrito. Diseñar el snapshot ahora.
- **E3.5/E3.6**: no construir sobre el ledger paralelo actual; decidir el modelo primero.

**Decisiones pendientes**

1. ¿Reservas globales o atadas a un Saldo? Recomiendo globales, con Saldo preferido solo
   para cobertura.
2. ¿Reutilizar `Presupuestos` renombrándolo o crear una entidad nueva? Recomiendo
   reutilizar.
3. ¿Plan anual por reserva o por Partida? Recomiendo reserva, con desglose opcional por
   Partida.
4. ¿Asignaciones explícitas o divisor automático? Recomiendo explícitas; divisor como
   sugerencia.
5. ¿Revisión Comida con Movimientos individuales o agregado + detalle? Recomiendo
   individual si hay importación; si no, detalle 1:1 que sume al Movimiento, nunca ledger
   independiente.
6. ¿Terminal se convierte en Saldo real o se elimina? Recomiendo convertirlo/eliminarlo.
7. ¿Devolución como tipo propio o Gasto negativo? Recomiendo tipo propio `Devolución`.
8. ¿Compartidos y devoluciones afectan a la reserva en bruto o neto? Recomiendo bruto en
   el gasto y recuperación enlazada para el neto.
9. ¿El cierre incluye reservas y asignaciones? Recomiendo sí, antes de implementar cierre.
10. ¿Se migran ya las specs/tests o se espera? No hay datos reales importados; es el
    momento barato.

---

## 10. Orden recomendado para el refinamiento

1. **Taller de decisión, sin código**: aprobar la separación de capas y el modelo de
   reservas globales. Salir con una nota conceptual de 2–3 páginas, no una spec.
2. **Fijar invariantes y ejemplos**: validar los 8 ejemplos y los 16 invariantes con el
   usuario/Álex. Sin esto, cualquier spec posterior será ambigua.
3. **Elegir entidades y migración**: confirmar que `Presupuestos` se convierte en
   Reservas, que `annual_plan_lines` se consolida y que `Revisión Comida` deja de ser
   ledger.
4. **Actualizar las specs propietarias**: 01 (Terminal), 02 (Partida sin padre), 04
   (Devolución), 08 (Reserva), 09 (eje y métricas), 10 (anual consolidado), 16 (Comida
   vista), 12 (informes), 27 (snapshot). Sin crear una spec paralela.
5. **Prototipar los casos difíciles con fixtures**: asignación inicial, pago anual desde
   otro Saldo, reasignación, devolución, insuficiencia, trimestral, compartido. Sin datos
   reales.
6. **Implementar por rodajas**: (a) reservas + asignaciones + informe de cobertura;
   (b) Devolución + reserva derivada; (c) UI de árbol y plan anual consolidado; (d)
   Revisión Comida como vista; (e) Terminal; (f) cierre/snapshot. Cada rodaja con QA.
7. **Migrar fixtures y después datos reales** solo bajo P7, sin doble escritura.
8. **Solo entonces** implementar E3.5/E3.6 sobre el modelo nuevo y retirar el ledger
   paralelo.
9. **Revisar complejidad**: si el resultado no es más simple que el modelo actual, volver
   a la alternativa D (solo transferencias reales). La simplificación debe medirse en
   casos difíciles resueltos, no en número de tablas.

---

## Cierre

La propuesta no es descartable: acierta al querer reservas virtuales, una vista única y
eliminar el doble registro. Pero **no recomiendo convertir Partida en reserva ni atar la
reserva a un Saldo**. Eso mezcla clasificación, financiación y custodia, crea una segunda
jerarquía y produce el problema de compensación que luego hay que resolver con más
mecanismos.

La alternativa más simple y financieramente sólida es: **caja real en Saldos, un solo
ledger de Movimientos, reservas globales separadas de las Partidas, asignaciones
explícitas y ningún pago ficticio entre Saldos**. Con eso, el caso «seguro pagado desde
OpenBank contra una reserva de Trade Republic» deja de ser un problema y pasa a ser un
gasto normal con un aviso de cobertura.

Este documento no modifica código, esquema, Excel ni base de datos. Es una auditoría para
discusión, no una especificación ni una autorización de desarrollo.
