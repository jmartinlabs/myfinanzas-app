# 23 — E4.3 Valoración y resultados de posiciones: Brainstorming

Status: **DRAFT — 16 decisiones confirmadas por el usuario el 2026-11-02 y tres aclaraciones
de consistencia registradas el 2026-11-03 (no reabren D-01…D-16).** Specification y testplan
redactados como **candidatos** en este mismo PR; no aprobados. No implementa código, no modifica
esquema y no autoriza DEV. Base: `main` `c5a0ccc` (esquema v21).

Roadmap/context: [E4.3](roadmap.md#e43--valoración-y-resultados-de-posiciones),
[referencia funcional R5](functional-reference-v5.11.md),
[SPEC19/E4.1](19-instrumentos-compras-inversion-specification.md),
[SPEC22/E4.2](22-ventas-posicion-broker-specification.md),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md).

Next action: revisar y ratificar la specification y el testplan candidatos; el DEV y el DDL
del almacén requieren autorización separada.

## Hallazgo de partida

El modelo vigente **no tiene almacén de valoración**: `instrumentos` no guarda valor ni
precio, `operaciones_inversion` no persiste importes derivados, `precierre` fija `e43` y
`inversion.valoracion` en `No disponible`, y el catálogo v21 no incluye tabla ni columna de
valoración. Sin una decisión de persistencia (DT2), E4.3 no puede entregar valor manual ni una
valoración verificable para E4.9.

## Round 1 — 2026-11-02 — Alcance, valoración y resultado

### Frontera propuesta

E4.3 incluye: posiciones por `Saldo inversión + Instrumento` reutilizando el motor E4.1/E4.2;
estado `Abierta`/`Cerrada`/vacío; tipo `Manual`/`Automática`; valor en EUR con fecha y
procedencia; resultado según R5; agregado por `Tipo = Inversión`; contrato de lectura a corte.
No incluye: cotizaciones externas, dividendos/impuestos/splits, FIFO o coste por lotes,
patrimonio global (E4.6/E4.7), efectivo fuera del bloque de inversión, fotos/cierre (E4.9), ni
cambios a E4.1/E4.2/SPEC12/SPEC33.

### D-01 — Significado de «Automática» sin proveedor externo

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Precio/cambio introducidos por el usuario y producto calculado por la app**
  (propuesta; permite la etiqueta «Automática» sin proveedor).
- [ ] (b) Solo Manual en la primera entrega; «Automática» queda `No disponible`.
- [ ] (c) Proveedor externo futuro, fuera de E4.3.
- [ ] (d) Otra definición.

Recommendation (proposal only): (a) con precio y cambio fechados, redondeo único a céntimos y
procedencia declarada; nunca usar el precio de la última operación como valor actual.

Confirmed answer: **(a)** precio y cambio introducidos por el usuario, producto calculado por la app, con procedencia y fecha. source/date: usuario, sesión de brainstorming 2026-11-02

### D-02 — ¿El valor manual suprime Resultado y Rentabilidad?

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Sí: ambos `No disponible`** (R5 literal: «valor manual manda y deja
  Resultado/Rentabilidad sin cálculo automático»).
- [ ] (b) No: se calcula resultado desde el valor manual.
- [ ] (c) Resultado sí, rentabilidad no.

Recommendation (proposal only): (a), por fidelidad a R5; (b) exigiría cambiar la referencia.
**Precedencia:** el valor manual solo aplica a posiciones **abiertas**; una posición cerrada se
rige por D-03 (ventas − compras) aunque conserve una valoración histórica.

Confirmed answer: **(a)** el valor manual suprime Resultado y Rentabilidad en posiciones abiertas. source/date: usuario, sesión de brainstorming 2026-11-02

### D-03 — Resultado en posiciones cerradas

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Sí: ventas − compras, sin valoración.**
- [ ] (b) Solo si se define rentabilidad.
- [ ] (c) También `No disponible`.

Recommendation (proposal only): (a), con comisiones ya incluidas en `importe_eur`.

Confirmed answer: **(a)** cerrada = ventas − compras, sin valoración. source/date: usuario, sesión de brainstorming 2026-11-02

### D-04 — Derivación del Estado

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [ ] (a) cantidad > 0 → Abierta; = 0 → Cerrada; vacío si no aplica.
- [x] **(b) Cerrada exige cantidad = 0 y al menos una Venta vigente** (evita «Cerrada» en
  grupos solo anulados).
- [ ] (c) Estado manual.
- [ ] (d) Otra regla.

Recommendation (proposal only): (b), evaluado **a la misma fecha de corte** que la valoración.

Confirmed answer: **(b)** Cerrada exige cantidad 0 y al menos una Venta vigente, evaluado al corte. source/date: usuario, sesión de brainstorming 2026-11-02

### D-05 — Resultado agregado o separado realizado/no realizado

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Solo agregado R5**, etiquetado «resultado de la posición».
- [ ] (b) Separar realizado/no realizado y definir FIFO/coste medio/otra regla.
- [ ] (c) Solo cerradas.

Recommendation (proposal only): (a); (b) sería una regla económica nueva no aprobada.

Confirmed answer: **(a)** solo resultado agregado de la posición, sin etiqueta realizado/no realizado. source/date: usuario, sesión de brainstorming 2026-11-02

### D-06 — Fórmula y denominador de rentabilidad

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [ ] (a) resultado / compras totales.
- [ ] (b) resultado / coste restante (solo abiertas).
- [ ] (c) resultado / (compras − ventas).
- [ ] (d) TWR o TIR con fechas.
- [x] **(e) No mostrar rentabilidad hasta definirla**, mostrando solo importe.

Recommendation (proposal only): (e); sin fórmula aprobada, no inventar porcentaje.

Confirmed answer: **(e)** no se muestra porcentaje de rentabilidad hasta definir fórmula. source/date: usuario, sesión de brainstorming 2026-11-02

### D-07 — Resultado neto o bruto de comisiones

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Neto:** `importe_eur` ya incluye la comisión; no se resta dos veces.
- [ ] (b) Bruto: añadir `comision_eur` como métrica aparte.

Recommendation (proposal only): (a), coherente con E4.1/E4.2.

Confirmed answer: **(a)** neto; `importe_eur` ya incluye la comisión y no se resta dos veces. source/date: usuario, sesión de brainstorming 2026-11-02

### D-08 — Persistencia de la valoración

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [ ] (a) Valor actual único por posición, con auditoría.
- [x] (b) Serie fechada de valoraciones.
- [ ] **(c) Valor por fecha de corte con histórico**, corrección auditada y concurrencia
  optimista.

Recommendation (proposal only): (c), como decisión DT2 dentro de SPEC23; nunca reutilizar
`operaciones_inversion` ni `audit` como almacén.

Confirmed answer: **(b)** serie fechada de valoraciones, con auditoría y concurrencia optimista; el corte selecciona la última anterior según D-09. source/date: usuario, sesión de brainstorming 2026-11-02

### D-09 — Fecha de valoración válida para un corte

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Exactamente el corte** (o la última anterior con aviso de antigüedad explícito).
- [ ] (b) Anterior sin límite.
- [ ] (c) Posterior permitida.

Recommendation (proposal only): (a); una valoración posterior al corte es look-ahead y se
prohíbe.

Confirmed answer: **(a, con aviso)** se usa la valoración al corte o, si no existe, la última anterior mostrando su fecha y aviso de antigüedad; una posterior queda prohibida. source/date: usuario, sesión de brainstorming 2026-11-02

### D-10 — Agregado parcial

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) `Parcial n/m` sin total** cuando falta alguna valoración.
- [ ] (b) Total de lo valorado, etiquetado.
- [ ] (c) `No disponible` si falta alguna.

Recommendation (proposal only): (a); nunca rellenar con 0.

Confirmed answer: **(a)** `Parcial n/m` sin total cuando falte alguna valoración. source/date: usuario, sesión de brainstorming 2026-11-02

### D-11 — Total del bloque de inversión y efectivo mostrado aparte

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Solo bloque de inversión; efectivo separado** leído de `cashAt`.
- [ ] (b) Total posiciones + efectivo, etiquetado.
- [ ] (c) Incluir otros saldos (sería E4.6).

Recommendation (proposal only): (a); el efectivo no es posición ni tiene estado/valoración.

Confirmed answer: **(a)** agregado solo de posiciones; efectivo del bróker leído de `cashAt` y mostrado aparte. source/date: usuario, sesión de brainstorming 2026-11-02

### D-12 — Integración con Precierre/E4.9

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) E4.3 publica el contrato; la integración de `e43`/`inversion.valoracion` y la
  ampliación de foto de SPEC27 se autorizan por separado.**
- [ ] (b) E4.3 actualiza directamente la fila `e43`.
- [ ] (c) Se deja íntegro al owner de E4.8.

Recommendation (proposal only): (a), para no modificar contratos aprobados sin autorización.

Confirmed answer: **(a)** E4.3 publica el contrato; actualizar `e43`/`valoracion` y la foto de SPEC27 requiere autorización separada. source/date: usuario, sesión de brainstorming 2026-11-02

### D-13 — Posiciones heredadas, instrumentos inactivos y grupos solo anulados

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Incluir siempre** las posiciones con cantidad, incluidas heredadas e inactivas;
  los grupos solo anulados no son posición.
- [ ] (b) Incluir con aviso.
- [ ] (c) Ocultar.

Recommendation (proposal only): (a); ocultar patrimonio real no es aceptable.

Confirmed answer: **(a)** incluir posiciones con cantidad aunque el instrumento esté inactivo o la posición sea heredada; señalar cobertura insuficiente cuando corresponda y **no inventar valoración**; los grupos solo anulados no constituyen posición. source/date: usuario, sesión de brainstorming 2026-11-02

### D-14 — Límites de entrada (DT2)

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) EUR 2 decimales; cero explícito permitido; negativo rechazado; fecha civil no
  futura; sin exponentes; magnitud máxima pendiente de DT2.**
- [ ] (b) Diferir todos los límites a DT2 sin valor de partida.

Recommendation (proposal only): (a) como partida, sujeta a contraste con DT2.

Confirmed answer: **(a)** EUR final con dos decimales; precio unitario y cambio con precisión suficiente y **sin redondeos intermedios**; cero explícito permitido; negativos rechazados; límites máximos pendientes de DT2. source/date: usuario, sesión de brainstorming 2026-11-02

## Round 2 — 2026-11-02 — Antigüedad y aptitud para cierre

Estas dos decisiones resuelven los residuales señalados en el dictamen técnico antes de
redactar la specification.

### D-15 — Tratamiento de la antigüedad de una valoración anterior

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [x] **(a) Mostrar siempre la fecha y los días transcurridos**, sin umbral de caducidad
  inventado.
- [ ] (b) Aviso destacado desde 30 días.
- [ ] (c) Aviso destacado desde 90 días.
- [ ] (d) Diferir el umbral a E4.9.

Confirmed answer: **(a)** se muestra siempre la fecha de valoración y los días transcurridos;
no se fija un umbral de caducidad. La antigüedad no altera por sí sola la cobertura.
source/date: usuario, sesión de brainstorming 2026-11-02

### D-16 — Aptitud de una valoración para Precierre/cierre (E4.9)

Question: confirmada el 2026-11-02 (ver «Confirmed answer»).

- [ ] (a) Solo una valoración fechada exactamente en el corte es elegible.
- [x] **(b) E4.3 marca toda valoración anterior como no certificable y E4.9 define su ventana
  al desarrollar el cierre.**
- [ ] (c) Cualquier valoración anterior con aviso certifica.

Confirmed answer: **(b)** E4.3 distingue visualización informativa, cobertura del agregado y
elegibilidad para cierre. Ninguna valoración anterior al corte se presenta como certificada;
la ventana o criterio de suficiencia se decide en el DEV de E4.9, sin inventar umbrales.
source/date: usuario, sesión de brainstorming 2026-11-02

## Precisiones para la futura specification

Requisitos derivados de D-08/D-09/D-15/D-16 y del dictamen técnico, que la specification
deberá recoger sin reabrir las decisiones:

1. Valoraciones con **fecha de vigencia, origen y corrección auditada**; se conserva el
   histórico sin mutar compras/ventas y sin asociar artificialmente cada registro a un ciclo.
2. Para un corte `T` solo se usa una valoración con fecha **≤ T**; nunca posterior. La última
   anterior es un **valor conocido a fecha T**, con su fecha y antigüedad, no un precio
   verificado exactamente el día `T`.
3. Se distinguen tres planos: **visualización informativa**, **cobertura del agregado**
   (`Parcial n/m`, sin total completo si falta información) y **elegibilidad para
   Precierre/cierre**. Una valoración antigua visible no queda certificada.
4. La foto de E4.9, cuando se autorice su desarrollo, reflejará valor, fecha/origen y
   cobertura usados en aquel corte de forma inmutable; una corrección posterior no recalcula
   la foto cerrada. E4.3 solo publica el contrato; E4.9 es dueño del gate y de la foto.
5. Se respeta el resto de D-01…D-14: sin porcentaje de rentabilidad; resultado neto; sin
   doble comisión; efectivo de bróker fuera del agregado; posiciones inactivas/heredadas con
   cobertura; EUR final a céntimos y precio/cambio sin redondeos intermedios.

## Coverage

- **Funcional:** posiciones, estado, valoración, resultado, agregado, cobertura.
- **Interfaces:** lectura a corte; captura/edición de valor manual si D-08 lo autoriza;
  errores 401/404/409/422.
- **Datos:** sin cambios a E4.1/E4.2; almacén de valoración a decidir en SPEC23/DT2.
- **Dependencias:** E4.1/E4.2 integrados; DT2 (precisión/IDs/constraints); DT8 (formato, UX,
  métricas no definidas); SPEC27 no se modifica aquí.
- **Errores y extremos:** valor vacío ≠ 0; fuente ilegible ≠ sin posiciones; valor posterior al
  corte prohibido; ventas parciales sin etiqueta realizado/no realizado; divisa con FX fechado.

## Wireframes

N/A en esta fase: no se dibujan pantallas antes de fijar D-01…D-14. La captura de valor manual,
si se autoriza, se diseñará en la specification con estados vacío/carga/error/409/422.

## Append-only clarifications

**Sesión de brainstorming — 2026-11-02:** el usuario confirmó D-01…D-16 mediante preguntas
sucesivas (herramienta `question`): D-01…D-14 en la ronda 1 (economía y modelo de datos) y
D-15/D-16 en la ronda 2 (antigüedad y aptitud para cierre).
Las respuestas quedan registradas en cada decisión con su fuente y fecha; las preguntas no se
reescriben. Este documento no redacta specification/testplan, no declara AC, PASS ni DEV.

**Aclaración 2026-11-03 (A-01) — consistencia entre la cantidad valorada y la cantidad al
corte.** No reabre D-09: sigue vigente que, para un corte T, se usa la valoración con
`fecha_vigencia <= T` más reciente, mostrada con su fecha y antigüedad. La precisión delimita
qué significa «valor de la posición»: una valoración solo representa la cantidad existente en su
`fecha_vigencia`; si entre esa fecha y T hay hechos vigentes que cambian la cantidad neta
(compra, venta, reapertura, corrección o anulación retroactiva), el importe registrado **no** se
presenta como valor de la cantidad actual, no se escala, no se deriva un precio nuevo y no se
prorratea. La posición y el corte quedan `No disponible` con motivo; en el agregado,
`Parcial n/m` o `No disponible`. Se exige una nueva valoración a la fecha adecuada; la anterior
permanece en la serie como valor de su propia fecha y no se reescribe. Se aplica a `Automática` y
a `Manual` (el importe manual se refiere a la cantidad de su fecha). Si la cantidad neta vuelve a
coincidir con la de la valoración, el valor sigue siendo un «valor conocido» de esa cantidad con
su aviso de antigüedad, sin convertirse en precio del día.
Alternativas consideradas y no adoptadas: (i) escalar el valor por la nueva cantidad — inventa un
precio implícito y supone linealidad no aprobada; (ii) prorratear el importe — mismo problema,
agravado con valor manual; (iii) mostrar el valor anterior con etiqueta de «cantidad distinta» —
se confunde con el valor actual y contradice D-09/R5; (iv) invalidar cualquier valoración si
hubo algún hecho intermedio aunque la cantidad neta no cambie — más estricto que lo necesario y
choca con D-09. La regla adoptada se deriva de I-2, R-E43-4 y D-13 (no inventar valoración) y no
cambia ninguna decisión confirmada. Si el usuario considera que la extensión a `Manual` excede
D-02/D-14, debe ratificarlo o corregirlo antes de aprobar la specification.

**Ratificación 2026-11-03:** el usuario ratificó A-01 también para valoración `Manual`: el
importe corresponde a la cantidad de su `fecha_vigencia` y no puede extrapolarse a otra
cantidad; si la cantidad difiere al corte, la posición queda `No disponible` con motivo.

**Aclaración 2026-11-03 (A-02) — alcance de la etiqueta de D-16.** D-16 no cambia: E4.3 no
certifica una valoración anterior al corte y E4.9 define su ventana en su propio DEV. La
precisión es de vocabulario y de contrato: E4.3 emite «No elegible por fecha exacta en E4.3»,
no «No apta definitivamente para cierre». E4.3 no prejuzga el gate de E4.9 ni escribe la foto;
E4.9 podrá admitir valoraciones anteriores según su contrato de suficiencia. El historial de
D-16 se conserva tal cual.

**Aclaración 2026-11-03 (A-03) — alcance del «cero explícito permitido» de D-14.** D-14
conserva sus términos. Se precisa su lectura para eliminar una contradicción interna: el cero
explícito permitido es el **valor manual `0,00`**. Una valoración `Automática` exige precio
unitario > 0, cambio > 0 y cantidad valorada > 0; un precio `0,00`, un cambio `0` o una cantidad
`0` no se admiten como valoración automática (422). Un valor calculado que redondea a `0,00` con
insumos positivos sigue siendo una valoración presente y cuenta en la cobertura; no se sustituye
la ausencia por cero.
