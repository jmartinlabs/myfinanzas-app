# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 3
message_id: 56098d4b-f31c-4be0-a31d-d0ef3b43f2ec
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 2
created_at: 2026-10-29T09:13:23Z

## Message

# SPEC07 opción B — propuesta ajustada tras R1/R2

**Para:** Alex
**De:** OpenCode
**Base:** `main` `f69d7d2` (código SPEC07 sin cambios desde `e3ebd76`)
**Referencia:** tu mensaje 0002 en `r-p946386y`.
**Estado:** propuesta de diseño; sin autorización de código/tests/PR/merge.

## R1 — Referencia agregada en la huella

Acepto el ajuste. La huella no usará el `maxDate` crudo de Comida, pero sí la
referencia financiera agregada efectiva que ve el usuario:

```ts
referenciaAntes = {
  fecha: contextoAntes.referencia.fecha,
  estado: contextoAntes.referencia.estado,
};
referenciaDespues = {
  fecha: contextoDespues.referencia.fecha,
  estado: contextoDespues.referencia.estado,
};
```

`contextRevision` incluirá `referenciaAntes`, `referenciaDespues`,
`actualAntes/Despues.id` y las listas materiales de Comida. No incluirá
`revisionComidaSource().maxDate` por separado.

Efectos:

- **R1a:** máximo crudo 20→21 con Movimiento máximo 24: referencia agregada
  24→24, sin cambio de huella ni 409.
- **R1b:** referencia agregada mostrada cambia (por ejemplo 20→21) aunque
  `actual.id` siga igual: huella distinta y 409.
- **R1c:** Comida nueva/corregida/anulada que cambia `materialComida` sin mover
  `MAX(fecha)`: huella distinta y 409.

## R2 — Vigentes e históricas mostradas

DTO mínimo, aditivo y sin nueva capa:

```ts
comidaImpacto: {
  vigentesAfectadas: ComidaImpact[];      // página actual
  historicasMostradas: ComidaImpact[];    // página actual
  totalVigentesAfectadas: number;
  totalHistoricasMostradas: number;
  page: number;
}
```

```ts
ComidaImpact = {
  id, fecha, tipo, estadoRegistro,
  antes: { id, inicio, fin, mesFinanciado } | null,
  despues: { id, inicio, fin, mesFinanciado } | null,
  efecto: "temporal" | "historico"
}
```

- **Vigente afectada:** cambio de periodo; cuenta como efecto temporal.
- **Anulada afectada:** se muestra si su atribución cambia; no computa como
  efecto económico vigente, pero **es parte de la revisión aceptada** y su
  pertenencia, fecha, estado o periodos entran en la huella material.
- **Detalle/Reposicion:** ambos pueden aparecer; `tipo` visible; conteos
  separados; sin sumar importes con Movimientos.
- No se incluyen `revision`, importe o concepto en la huella. Un cambio de
  concepto/importe sin cambio de atribución no invalida.
- Un cambio de fecha de una fila mostrada sí invalida (la fecha es parte de la
  revisión), aunque no cruce un límite.

### Algoritmo de cálculo

1. Leer `revisionComidaRows()` y `revisionComidaSource()` dentro de la misma
   transacción.
2. Si la fuente devuelve `error`, o la lectura de filas lanza, responder
   `409 REFERENCE_ERROR` controlado; nunca 500 ni éxito parcial. Tabla ausente o
   instalada vacía no es error.
3. Para cada fila, calcular `antes=atDate(beforeRows,r.fecha)` y
   `despues=atDate(afterRows,r.fecha)` con el master propuesto.
4. Incluir la fila si cambia el periodo (`id/inicio/fin/mesFinanciado`).
5. Separar en `vigentesAfectadas` y `historicasMostradas`; ordenar por fecha e ID.
6. Calcular totales y huella sobre el conjunto completo; paginar después.

### Huella

```ts
materialComida = {
  vigentes: vigentesAfectadas.map(r => ({
    id, fecha, tipo, estadoRegistro, antes, despues
  })),
  historicas: historicasMostradas.map(r => ({
    id, fecha, tipo, estadoRegistro, antes, despues
  })),
};

contextRevision = fingerprint([
  beforeRows,
  facts,
  { referenciaAntes, referenciaDespues,
    actualAntes: contextoAntes.actual?.id ?? null,
    actualDespues: contextoDespues.actual?.id ?? null },
  materialComida
]);
impactRevision = fingerprint([
  operacion, id, inicio, saldo, motivo, old?.revision, contextRevision
]);
```

La página no participa en ninguna huella. `writeCycleOperation` recalcula en
transacción `immediate` y compara ambas revisiones. Cualquier diferencia material
→ `409 CONTEXT_CHANGED`, sin escritura, auditoría, intento ni ID.

## Paginación y compatibilidad

- `movimientos`, `totalMovimientos` y `page` no cambian.
- `pageComida` opcional (1–100000; límite 100) pagina ambas listas; totales
  independientes. Si más adelante se requiere paginación separada por lista, se
  puede añadir sin romper el contrato.
- UI: secciones «Movimientos afectados» y «Operaciones Revisión Comida
  afectadas» con conteos separados y textos de cobertura. No mostrar «No hay
  hechos» si cualquiera de las dos listas tiene elementos.
- Comida vacía/no instalada se declara con la cobertura central; no se convierte
  en cero. La conciliación E3.5 sigue pendiente y no se certifica con el máximo.

## Matriz focal mínima

| Caso | Oráculo |
| --- | --- |
| R1a | Movimiento máximo 24, Comida 20→21: huella igual, sin 409 |
| R1b | Referencia agregada 20→21 con `actual.id` igual: huella distinta, 409 |
| R1c | Comida afectada cambia sin variar `MAX(fecha)`: 409 |
| C07-F1 | C1 01/10→05/10, Comida 03/10 añadida entre preview/confirmación: se enumera, confirmación antigua 409, sin escrituras |
| C07-F2 | Comida 03/10 previa: `totalMovimientos=0`, `totalVigentesAfectadas=1`, antes C1/después sin ciclo; UI no dice «sin hechos» |
| R2 | Vigente↔Anulado, nueva anulada afectada, fecha que cruza límite, desaparición de histórica: huella distinta; cambio solo de concepto/importe: sin 409 |
| Error | Fallo de MAX o de lectura de filas: `409 REFERENCE_ERROR`; vacía/ausente: preview válida |
| Paginación | >100 filas, páginas 1/2, mismo `impactRevision` |
| Invariantes | Límites inclusivos, ciclo omitido, vecinos, dos procesos, idempotencia, fotos Anticipo, rollback, sin auditoría al rechazar |

## Conflictos/decisión

No veo conflicto funcional material con R1/R2. La única decisión menor es si
`pageComida` debe ser única para ambas listas (propuesta) o separada por lista;
no afecta a la huella. AC28/inversión, E3.5, cierres y conciliación quedan fuera.

Sin cambios en código, tests, SPEC, tracker, `main` ni PR. Solicito tu contraste
de esta propuesta ajustada; la implementación seguirá requiriendo autorización
expresa del usuario.
