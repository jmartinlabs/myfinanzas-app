# 23 — E4.3 Valoración y resultados de posiciones: Brainstorming

Status: **DRAFT — ninguna respuesta aprobada.** Brainstorming inicial autorizado el
2026-11-02 para concretar D-01…D-14. No crea specification ni testplan, no implementa código,
no modifica esquema y no autoriza DEV. Base: `main` `c827d4c` (esquema v21).

Roadmap/context: [E4.3](roadmap.md#e43--valoración-y-resultados-de-posiciones),
[referencia funcional R5](functional-reference-v5.11.md),
[SPEC19/E4.1](19-instrumentos-compras-inversion-specification.md),
[SPEC22/E4.2](22-ventas-posicion-broker-specification.md),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md).

Next action: confirmar D-01…D-14 antes de redactar specification y testplan.

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
patrimonio global, efectivo propio, fotos/cierre (E4.9), ni cambios a E4.1/E4.2/SPEC12/SPEC33.

### D-01 — Significado de «Automática» sin proveedor externo

Question: UNDECIDED

- [x] **(a) Precio/cambio introducidos por el usuario y producto calculado por la app**
  (propuesta; permite la etiqueta «Automática» sin proveedor).
- [ ] (b) Solo Manual en la primera entrega; «Automática» queda `No disponible`.
- [ ] (c) Proveedor externo futuro, fuera de E4.3.
- [ ] (d) Otra definición.

Recommendation (proposal only): (a) con precio y cambio fechados, redondeo único a céntimos y
procedencia declarada; nunca usar el precio de la última operación como valor actual.

Confirmed answer: PENDING; source/date: PENDING

### D-02 — ¿El valor manual suprime Resultado y Rentabilidad?

Question: UNDECIDED

- [x] **(a) Sí: ambos `No disponible`** (R5 literal: «valor manual manda y deja
  Resultado/Rentabilidad sin cálculo automático»).
- [ ] (b) No: se calcula resultado desde el valor manual.
- [ ] (c) Resultado sí, rentabilidad no.

Recommendation (proposal only): (a), por fidelidad a R5; (b) exigiría cambiar la referencia.

Confirmed answer: PENDING; source/date: PENDING

### D-03 — Resultado en posiciones cerradas

Question: UNDECIDED

- [x] **(a) Sí: ventas − compras, sin valoración.**
- [ ] (b) Solo si se define rentabilidad.
- [ ] (c) También `No disponible`.

Recommendation (proposal only): (a), con comisiones ya incluidas en `importe_eur`.

Confirmed answer: PENDING; source/date: PENDING

### D-04 — Derivación del Estado

Question: UNDECIDED

- [ ] (a) cantidad > 0 → Abierta; = 0 → Cerrada; vacío si no aplica.
- [x] **(b) Cerrada exige cantidad = 0 y al menos una Venta vigente** (evita «Cerrada» en
  grupos solo anulados).
- [ ] (c) Estado manual.
- [ ] (d) Otra regla.

Recommendation (proposal only): (b), evaluado **a la misma fecha de corte** que la valoración.

Confirmed answer: PENDING; source/date: PENDING

### D-05 — Resultado agregado o separado realizado/no realizado

Question: UNDECIDED

- [x] **(a) Solo agregado R5**, etiquetado «resultado de la posición».
- [ ] (b) Separar realizado/no realizado y definir FIFO/coste medio/otra regla.
- [ ] (c) Solo cerradas.

Recommendation (proposal only): (a); (b) sería una regla económica nueva no aprobada.

Confirmed answer: PENDING; source/date: PENDING

### D-06 — Fórmula y denominador de rentabilidad

Question: UNDECIDED

- [ ] (a) resultado / compras totales.
- [ ] (b) resultado / coste restante (solo abiertas).
- [ ] (c) resultado / (compras − ventas).
- [ ] (d) TWR o TIR con fechas.
- [x] **(e) No mostrar rentabilidad hasta definirla**, mostrando solo importe.

Recommendation (proposal only): (e); sin fórmula aprobada, no inventar porcentaje.

Confirmed answer: PENDING; source/date: PENDING

### D-07 — Resultado neto o bruto de comisiones

Question: UNDECIDED

- [x] **(a) Neto:** `importe_eur` ya incluye la comisión; no se resta dos veces.
- [ ] (b) Bruto: añadir `comision_eur` como métrica aparte.

Recommendation (proposal only): (a), coherente con E4.1/E4.2.

Confirmed answer: PENDING; source/date: PENDING

### D-08 — Persistencia de la valoración

Question: UNDECIDED

- [ ] (a) Valor actual único por posición, con auditoría.
- [ ] (b) Serie fechada de valoraciones.
- [x] **(c) Valor por fecha de corte con histórico**, corrección auditada y concurrencia
  optimista.

Recommendation (proposal only): (c), como decisión DT2 dentro de SPEC23; nunca reutilizar
`operaciones_inversion` ni `audit` como almacén.

Confirmed answer: PENDING; source/date: PENDING

### D-09 — Fecha de valoración válida para un corte

Question: UNDECIDED

- [x] **(a) Exactamente el corte** (o la última anterior con aviso de antigüedad explícito).
- [ ] (b) Anterior sin límite.
- [ ] (c) Posterior permitida.

Recommendation (proposal only): (a); una valoración posterior al corte es look-ahead y se
prohíbe.

Confirmed answer: PENDING; source/date: PENDING

### D-10 — Agregado parcial

Question: UNDECIDED

- [x] **(a) `Parcial n/m` sin total** cuando falta alguna valoración.
- [ ] (b) Total de lo valorado, etiquetado.
- [ ] (c) `No disponible` si falta alguna.

Recommendation (proposal only): (a); nunca rellenar con 0.

Confirmed answer: PENDING; source/date: PENDING

### D-11 — Total de cartera con efectivo

Question: UNDECIDED

- [x] **(a) Solo bloque de inversión; efectivo separado** leído de `cashAt`.
- [ ] (b) Total posiciones + efectivo, etiquetado.
- [ ] (c) Incluir otros saldos (sería E4.6).

Recommendation (proposal only): (a); el efectivo no es posición ni tiene estado/valoración.

Confirmed answer: PENDING; source/date: PENDING

### D-12 — Integración con Precierre/E4.9

Question: UNDECIDED

- [x] **(a) E4.3 publica el contrato; la integración de `e43`/`inversion.valoracion` y la
  ampliación de foto de SPEC27 se autorizan por separado.**
- [ ] (b) E4.3 actualiza directamente la fila `e43`.
- [ ] (c) Se deja íntegro al owner de E4.8.

Recommendation (proposal only): (a), para no modificar contratos aprobados sin autorización.

Confirmed answer: PENDING; source/date: PENDING

### D-13 — Posiciones heredadas, instrumentos inactivos y grupos solo anulados

Question: UNDECIDED

- [x] **(a) Incluir siempre** las posiciones con cantidad, incluidas heredadas e inactivas;
  los grupos solo anulados no son posición.
- [ ] (b) Incluir con aviso.
- [ ] (c) Ocultar.

Recommendation (proposal only): (a); ocultar patrimonio real no es aceptable.

Confirmed answer: PENDING; source/date: PENDING

### D-14 — Límites de entrada (DT2)

Question: UNDECIDED

- [x] **(a) EUR 2 decimales; cero explícito permitido; negativo rechazado; fecha civil no
  futura; sin exponentes; magnitud máxima pendiente de DT2.**
- [ ] (b) Diferir todos los límites a DT2 sin valor de partida.

Recommendation (proposal only): (a) como partida, sujeta a contraste con DT2.

Confirmed answer: PENDING; source/date: PENDING

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

Las respuestas se añadirán aquí con su fuente y fecha, sin reescribir las preguntas. Este
documento no aprueba ninguna opción ni declara AC, PASS o DEV.
