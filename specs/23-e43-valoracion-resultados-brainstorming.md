# 23 — E4.3 Valoración y resultados de posiciones: Brainstorming

Status: **DRAFT — 14 decisiones confirmadas por el usuario el 2026-11-02; specification y
testplan no autorizados.** Brainstorming realizado para concretar D-01…D-14. No implementa
código, no modifica esquema y no autoriza DEV. Base: `main` `c827d4c` (esquema v21).

Roadmap/context: [E4.3](roadmap.md#e43--valoración-y-resultados-de-posiciones),
[referencia funcional R5](functional-reference-v5.11.md),
[SPEC19/E4.1](19-instrumentos-compras-inversion-specification.md),
[SPEC22/E4.2](22-ventas-posicion-broker-specification.md),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md).

Next action: presentar las decisiones confirmadas y solicitar autorización separada para
redactar specification y testplan. No redactarlos todavía.

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

**Sesión de brainstorming — 2026-11-02:** el usuario confirmó D-01…D-14 mediante preguntas
sucesivas (herramienta `question`), priorizando las decisiones económicas y de modelo de datos.
Las respuestas quedan registradas en cada decisión con su fuente y fecha; las preguntas no se
reescriben. Este documento no redacta specification/testplan, no declara AC, PASS ni DEV.
