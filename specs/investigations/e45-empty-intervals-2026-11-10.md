# E4.5 — Fuente declarada con `intervalosArchivo: []` (investigación 2026-11-10)

Status: **INVESTIGACIÓN / CARACTERIZACIÓN — no implementa ninguna corrección.**
No acredita DT7, no certifica datos reales, no declara PASS de AC-01…AC-59 y no
cambia el motor, el DTO, la SPEC20 ni ninguna regla financiera. Los fixtures son
sintéticos. La propuesta de corrección del final está marcada como **NO
IMPLEMENTADA** y requiere un paquete DEV independiente.

- Rama: `investigation/e45-empty-intervals`
- Base: `test` `18f7c0c`
- Motor: `apps/api/src/historico-precontrol.ts`
- Pruebas de caracterización: `apps/api/src/historico-precontrol.test.ts`,
  bloque `E4.5 empty intervals · caracterización (investigación 2026-11-10)`.
- Fecha: 2026-11-10.

## 1. Resumen ejecutivo

**Defecto: sí (lógica; incidencia real no medida).** Cuando una fuente declarada
tiene `intervalosArchivo: []`, el motor omite por completo la comprobación de
contención de E45-A3:

```ts
// apps/api/src/historico-precontrol.ts:1345 (estado investigado)
if (fuenteRegistro && fuenteRegistro.intervalosArchivo.length > 0) {
  // ... calcula tramosAplicables y exige contención
}
```

Con la lista vacía no se calcula ningún `tramoAplicable`, no se añade el
registro a `agregadoNoAtribuible[]` y se continúa hasta la suma normal
(`archivo += importe`, líneas 1414–1417). El resultado es que un registro
`Verificado`/`Mapeado` puede sumarse a `archivo` y a `subtotalConocido` aunque su
propia fuente no acredite ningún intervalo de archivo. Si otra fuente (o un
`controlDetalle`) completa la cobertura global, el total puede quedar
`Verificado` e incluir ese importe.

**Certificable: sí, en las condiciones exactas del §3.** El caso 2a deja
deliberadamente SRC-1 fuera de `fuentesEsperadas` **como condición del fixture**
para evitar `FuenteAusente` y aislar la contención; no es una segunda
contradicción independiente ni un inventario que se proponga como válido. El
mismo defecto se observa con la fuente esperada en 2c (expectativa fuera del
corte), 3a (control cubre la expectativa) y 3b (control cubre la expectativa de
SRC-1): en los cuatro casos `estadoTotal=Verificado` y `total` no nulo incluyen
un importe de una fuente que no aporta cobertura propia.

**Contradicción con SPEC20/E45-A3: sí.** La cobertura global puede ser
`Completa` por la unión de otras fuentes/controles, pero E45-A3 exige además que
cada registro de archivo esté contenido en algún `intervalosArchivo` aplicable
de **su** fuente. Con cero intervalos no hay contención demostrada, así que el
registro no es elegible: debe ir a `agregadoNoAtribuible[]` con
`causa="FueraDeIntervalosArchivo"`, activar
`motivoCodigo=RegistroFueraDeIntervalosArchivo` y dejar
`total=null`/`subtotalConocido=null` para la Partida. El motor no lo hace.

**Inferencia:** el motor no inventa intervalos de cobertura a partir del
registro. Lo que hace es atribuir el importe a `archivo` sin la comprobación de
contención; no amplía `cobertura.intervalos`. Es una atribución por omisión, no
una cobertura inferida.

**Riesgo material (frecuencia no medida):** si el dato ocurre, un total marcado
`Verificado` puede incluir importes de una fuente cuya cobertura no está
acreditada (fuente obsoleta, parcial, mal declarada o no inventariada). El
consumidor no puede distinguir ese importe de uno respaldado por cobertura. No
se ha medido la frecuencia en datos reales ni se afirma que ocurra; los fixtures
sintéticos muestran que el motor lo permite. El caso 2a lo muestra con un total
`100.00` `Verificado` sostenido solo por SRC-2, incluyendo los `100.00` de SRC-1,
que no tiene intervalos y ni siquiera aparece en `fuentesEsperadas`. El caso 3b
lo muestra incluso con la fuente esperada: el registro de SRC-1 cae fuera de su
propio `controlDetalle` y aun así se certifica.

## 2. Matriz de casos

Todos los importes son `100.00` (entrada `importeCentimos: "10000"`). `corte`
por defecto `2026-12-31`, `hoy` `2027-01-15`; universo acreditado para `PAR100`.
Salvo que se indique, el registro `AH001` está `Verificado`, `Mapeado`,
`representadoEnMovimientos=No` con evidencia y su fuente es `SRC-1`.

| Caso | Fuentes / expectativas | Registro | `archivo` | `subtotalConocido` | Cobertura item/global | `estadoTotal` | `total` | `motivoCodigo` item / totales | `agregadoNoAtribuible` | ¿Certifica? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SRC-1 `[]`, sin control; esperada `Presente` todo 2026; sin otras fuentes | `01/01–12/31` | `100.00` | `100.00` | `NoDisponible` / `NoDisponible` | `NoDisponible` | `null` | `SinFuente` / `FuenteAusente` | `[]` | No |
| 1b | Igual que 1 pero sin `fuentesEsperadas` | `01/01–12/31` | `100.00` | `100.00` | `NoDisponible` / `NoDisponible` | `NoDisponible` | `null` | `SinFuente` / `SinFuente` | `[]` | No |
| 2a | SRC-1 `[]`, sin control, **fuera de `fuentesEsperadas`** (montaje para evitar `FuenteAusente`); SRC-2 `01/01–12/31`; solo SRC-2 esperada | `01/01–12/31` | `100.00` | `100.00` | `Completa` / `Completa` | `Verificado` | `100.00` | `null` / `null` | `[]` | **Sí** |
| 2b | SRC-1 `[]`, sin control, esperada `Presente` todo 2026; SRC-2 cubre todo 2026 | `01/01–12/31` | `100.00` | `100.00` | `Parcial` / `Parcial` | `NoVerificable` | `null` | `FuenteAusente` / `FuenteAusente` | `[]` | No |
| 2c | SRC-1 `[]`, sin control, esperada `Presente` **07/01–12/31** (fuera del corte); SRC-2 cubre `01/01–06/30`; corte `06/30` | `02/01–05/31` | `100.00` | `100.00` | `Completa` / `Completa` | `Verificado` | `100.00` | `null` / `null` | `[]` | **Sí** |
| 3a | SRC-1 `[]`, `controlDetalle 01/01–12/31`; esperada todo 2026 | `01/01–12/31` | `100.00` | `100.00` | `Completa` / `Completa` | `Verificado` | `100.00` | `null` / `null` | `[]` | **Sí** |
| 3b | SRC-1 `[]`, control `01/01–06/30`; SRC-2 `07/01–12/31`; expectativas SRC-1 `01/01–06/30` y SRC-2 `07/01–12/31` | `07/01–12/31` | `100.00` | `100.00` | `Completa` / `Completa` | `Verificado` | `100.00` | `null` / `null` | `[]` | **Sí** |
| 4a | SRC-1 `intervalosArchivo 01/01–06/30`, sin control; esperada `01/01–06/30` | `07/01–12/31` | `null` | `null` | `Parcial` / `Parcial` | `NoVerificable` | `null` | `RegistroFueraDeIntervalosArchivo` / idem | `AH001`, `100.00`, `FueraDeIntervalosArchivo` | No |
| 4b | SRC-1 `[]`, sin control; corte `06/30`; esperada `01/01–06/30` | `01/01–08/27` (solapa corte) | `null` | `null` | `NoDisponible` / `NoDisponible` | `NoDisponible` | `null` | `AgregadoNoAtribuibleAlCorte` / idem | `AH001`, `100.00`, `CorteExcedido` | No |

Notas de la matriz:

- En 2a SRC-1 se deja fuera de `fuentesEsperadas` **como condición del
  fixture** para evitar `FuenteAusente` y aislar la contención. No es una
  segunda contradicción independiente ni implica que un inventario DT7 pueda
  omitir una fuente con registros; el motor no valida esa omisión, pero el
  defecto principal se observa igualmente con la fuente esperada en 2c/3a/3b.
- En 2b el importe sigue en `archivo` y `subtotalConocido`; lo único que impide
  el **total** es `FuenteAusente`. Es decir, el defecto de contención no
  desaparece: solo queda enmascarado por otro bloqueo. El bloqueo es del total,
  no del importe ya sumado a `archivo`/`subtotalConocido`.
- En 2c la expectativa de SRC-1 cae fuera de `[inicio, corte]`; el motor la
  considera fuera de alcance y no la declara ausente (mismo criterio que P-10).
  El registro de SRC-1 dentro del corte suma y el total se certifica con la
  cobertura de SRC-2.
- En 3a/3b la cobertura proviene del `controlDetalle`; la contención del
  registro **no** se comprueba contra el control. En 3b el registro está fuera
  del control de su propia fuente y aun así suma. El control solo aporta
  cobertura, no contención, de acuerdo con la letra de E45-A3 y con
  `E45-A3-T1`; el fallo es que la lista vacía de `intervalosArchivo` omite la
  comprobación en lugar de concluir «ningún tramo contiene».
- 4a demuestra el comportamiento correcto cuando sí hay intervalos declarados:
  el mismo tipo de registro fuera de tramos se bloquea.
- 4b demuestra que el corte se comprueba antes y no se ve afectado por la lista
  vacía: un registro que excede el corte se bloquea como `CorteExcedido`.

## 3. Condiciones exactas para `estadoTotal=Verificado` / `total` no nulo

Con el motor actual, un registro de una fuente con `intervalosArchivo: []`
**suma** si se cumplen todas estas condiciones:

1. La fuente existe en `fuentes[]` (validación de entrada) y el registro no es
   `AperturaHistorica`.
2. El registro está `Verificado`, `Mapeado`, no es `Rechazado`, no tiene
   conflicto de identidad/versión ni solape `DosFuentes`/parcial con otro
   registro.
3. El intervalo del registro está dentro de `[inicio del ejercicio, corte]` y
   su fin no supera `corteArchivo` de la fuente. Si excede, se bloquea como
   `CorteExcedido` (4b).
4. La representación es `No` con `evidenciaRepresentacion`, o `Desconocido`
   solo con `evidenciaNoDuplicidad` (entra en `subtotalConocido`, no en total).
5. Una regularización 2026 cumple Q5=A (evidencia y motivo); si no, no suma.
6. La comprobación de contención de E45-A3 se omite porque
   `intervalosArchivo.length === 0`.

Para que el **total** sea `Verificado` hace falta además:

7. Universo acreditado y cobertura global `Completa` por la unión de
   `intervalosArchivo` + `controlDetalle` de las fuentes declaradas.
8. Ninguna fuente esperada queda ausente en la ventana consultada. La fuente
   sin intervalos puede no bloquear el total si:
   - SRC-1 no figura en `fuentesEsperadas` (solo como montaje de 2a para evitar
     `FuenteAusente`; no es una condición que se proponga para un inventario
     real), o
   - su intervalo esperado no solapa `[inicio, corte]` (2c; mismo criterio que
     P-10), o
   - su estado esperado es `NoAplica`, o
   - su propio `controlDetalle` cubre el intervalo esperado (3a/3b).
9. No hay huecos, conflictos, `sinClasificar`, agregados no atribuibles ni
   Partidas fuera del universo; todos los items con registros elegibles quedan
   `Verificado`.

`HuecoDemostrado` y `FuenteAusente` bloquean el **total** (`valor=null`,
`estadoTotal` no verificado), pero no retiran el importe ya sumado de
`archivo`/`subtotalConocido`. La única exclusión del importe es la elegibilidad
de E45-A3 (o los filtros de verificación, representación o conflicto); por eso
2b conserva el importe aunque el total no se certifique.

En 2b la fuente sí es esperada `Presente` y su intervalo esperado no está
cubierto por nada de esa fuente: `fuenteEsperadaCubierta` devuelve `false`,
`estadoCobertura=Parcial` y el total no se certifica. Pero el importe sigue
dentro de `archivo`/`subtotalConocido`.

## 4. DTO observado (extracto literal serializado)

Los siguientes bloques son el resultado real de
`JSON.stringify(combinarHistoricoPrecontrol(entrada))` para los campos
relevantes. Se omiten arrays invariantes vacíos (`registrosNoComputados`,
`historicos`, `conflictos`, `sinClasificar`) y `registros` cuando solo contiene
`["AH001"]`; no se ha reescrito ningún valor.

### Caso 1 — sin cobertura, fuente esperada

```json
{
  "item": {
    "partidaId": "PAR100",
    "archivo": "100.00",
    "detalleControl": null,
    "total": null,
    "subtotalConocido": "100.00",
    "estadoCobertura": "NoDisponible",
    "estadoTotal": "NoDisponible",
    "motivoCodigo": "SinFuente",
    "motivo": "PAR100: sin fuente de archivo ni control para el intervalo",
    "cobertura": { "intervalos": [], "huecos": [], "fuentes": [] }
  },
  "cobertura": {
    "estadoCobertura": "NoDisponible",
    "coberturaGlobal": "NoDisponible",
    "estadoUniverso": "Acreditado",
    "fuentesEsperadas": [
      {
        "fuenteId": "SRC-1",
        "partidaId": "PAR100",
        "estado": "Presente",
        "intervalo": { "inicio": "2026-01-01", "fin": "2026-12-31" }
      }
    ],
    "huecos": []
  },
  "totales": {
    "valor": null,
    "subtotalConocido": "100.00",
    "estadoTotal": "NoDisponible",
    "estadoCobertura": "NoDisponible",
    "motivoCodigo": "FuenteAusente",
    "motivo": "una fuente esperada del universo no está presente"
  },
  "agregadoNoAtribuible": []
}
```

### Caso 1b — sin cobertura, sin expectativas

```json
{
  "item": {
    "archivo": "100.00",
    "total": null,
    "subtotalConocido": "100.00",
    "estadoCobertura": "NoDisponible",
    "estadoTotal": "NoDisponible",
    "motivoCodigo": "SinFuente",
    "cobertura": { "intervalos": [], "huecos": [], "fuentes": [] }
  },
  "cobertura": {
    "estadoCobertura": "NoDisponible",
    "coberturaGlobal": "NoDisponible",
    "fuentesEsperadas": [],
    "huecos": []
  },
  "totales": {
    "valor": null,
    "subtotalConocido": "100.00",
    "estadoTotal": "NoDisponible",
    "estadoCobertura": "NoDisponible",
    "motivoCodigo": "SinFuente",
    "motivo": "sin fuente de archivo ni control para el intervalo"
  },
  "agregadoNoAtribuible": []
}
```

### Caso 2a — SRC-2 acredita cobertura y SRC-1 no es esperada

```json
{
  "item": {
    "archivo": "100.00",
    "total": "100.00",
    "subtotalConocido": "100.00",
    "estadoCobertura": "Completa",
    "estadoTotal": "Verificado",
    "motivoCodigo": null,
    "motivo": null,
    "cobertura": {
      "intervalos": [{ "inicio": "2026-01-01", "fin": "2026-12-31" }],
      "huecos": [],
      "fuentes": ["SRC-2"]
    }
  },
  "cobertura": {
    "estadoCobertura": "Completa",
    "coberturaGlobal": "Completa",
    "fuentesEsperadas": [
      {
        "fuenteId": "SRC-2",
        "partidaId": "PAR100",
        "estado": "Presente",
        "intervalo": { "inicio": "2026-01-01", "fin": "2026-12-31" }
      }
    ],
    "huecos": []
  },
  "totales": {
    "valor": "100.00",
    "subtotalConocido": "100.00",
    "estadoTotal": "Verificado",
    "estadoCobertura": "Completa",
    "motivoCodigo": null,
    "motivo": null
  },
  "agregadoNoAtribuible": []
}
```

### Caso 2b — SRC-1 es esperada y no aporta cobertura

```json
{
  "item": {
    "archivo": "100.00",
    "total": null,
    "subtotalConocido": "100.00",
    "estadoCobertura": "Parcial",
    "estadoTotal": "NoVerificable",
    "motivoCodigo": "FuenteAusente",
    "motivo": "PAR100: una fuente esperada del universo no está presente",
    "cobertura": {
      "intervalos": [{ "inicio": "2026-01-01", "fin": "2026-12-31" }],
      "huecos": [],
      "fuentes": ["SRC-2"]
    }
  },
  "cobertura": {
    "estadoCobertura": "Parcial",
    "coberturaGlobal": "Parcial",
    "fuentesEsperadas": [
      {
        "fuenteId": "SRC-1",
        "partidaId": "PAR100",
        "estado": "Presente",
        "intervalo": { "inicio": "2026-01-01", "fin": "2026-12-31" }
      },
      {
        "fuenteId": "SRC-2",
        "partidaId": "PAR100",
        "estado": "Presente",
        "intervalo": { "inicio": "2026-01-01", "fin": "2026-12-31" }
      }
    ],
    "huecos": []
  },
  "totales": {
    "valor": null,
    "subtotalConocido": "100.00",
    "estadoTotal": "NoVerificable",
    "estadoCobertura": "Parcial",
    "motivoCodigo": "FuenteAusente",
    "motivo": "una fuente esperada del universo no está presente"
  },
  "agregadoNoAtribuible": []
}
```

### Caso 2c — expectativa de SRC-1 posterior al corte

```json
{
  "item": {
    "archivo": "100.00",
    "total": "100.00",
    "subtotalConocido": "100.00",
    "estadoCobertura": "Completa",
    "estadoTotal": "Verificado",
    "motivoCodigo": null,
    "cobertura": {
      "intervalos": [{ "inicio": "2026-01-01", "fin": "2026-06-30" }],
      "huecos": [],
      "fuentes": ["SRC-2"]
    }
  },
  "cobertura": {
    "estadoCobertura": "Completa",
    "coberturaGlobal": "Completa",
    "fuentesEsperadas": [
      {
        "fuenteId": "SRC-1",
        "partidaId": "PAR100",
        "estado": "Presente",
        "intervalo": { "inicio": "2026-07-01", "fin": "2026-12-31" }
      },
      {
        "fuenteId": "SRC-2",
        "partidaId": "PAR100",
        "estado": "Presente",
        "intervalo": { "inicio": "2026-01-01", "fin": "2026-06-30" }
      }
    ],
    "huecos": []
  },
  "totales": {
    "valor": "100.00",
    "subtotalConocido": "100.00",
    "estadoTotal": "Verificado",
    "estadoCobertura": "Completa",
    "motivoCodigo": null,
    "motivo": null
  },
  "agregadoNoAtribuible": []
}
```

### Caso 3a — cobertura desde `controlDetalle`

```json
{
  "item": {
    "archivo": "100.00",
    "detalleControl": "0.00",
    "total": "100.00",
    "subtotalConocido": "100.00",
    "estadoCobertura": "Completa",
    "estadoTotal": "Verificado",
    "motivoCodigo": null,
    "cobertura": {
      "intervalos": [{ "inicio": "2026-01-01", "fin": "2026-12-31" }],
      "huecos": [],
      "fuentes": ["SRC-1"]
    }
  },
  "totales": {
    "valor": "100.00",
    "subtotalConocido": "100.00",
    "estadoTotal": "Verificado",
    "estadoCobertura": "Completa",
    "motivoCodigo": null,
    "motivo": null
  },
  "agregadoNoAtribuible": []
}
```

### Caso 3b — registro fuera del control de su propia fuente

```json
{
  "item": {
    "archivo": "100.00",
    "detalleControl": "0.00",
    "total": "100.00",
    "subtotalConocido": "100.00",
    "estadoCobertura": "Completa",
    "estadoTotal": "Verificado",
    "motivoCodigo": null,
    "cobertura": {
      "intervalos": [{ "inicio": "2026-01-01", "fin": "2026-12-31" }],
      "huecos": [],
      "fuentes": ["SRC-1", "SRC-2"]
    }
  },
  "totales": {
    "valor": "100.00",
    "subtotalConocido": "100.00",
    "estadoTotal": "Verificado",
    "estadoCobertura": "Completa",
    "motivoCodigo": null,
    "motivo": null
  },
  "agregadoNoAtribuible": []
}
```

### Caso 4a — fuera de intervalos con tramos declarados

```json
{
  "item": {
    "archivo": null,
    "total": null,
    "subtotalConocido": null,
    "estadoCobertura": "Parcial",
    "estadoTotal": "NoVerificable",
    "motivoCodigo": "RegistroFueraDeIntervalosArchivo",
    "motivo": "PAR100: registro fuera de los intervalos de archivo de su fuente; no se prorratea",
    "cobertura": {
      "intervalos": [{ "inicio": "2026-01-01", "fin": "2026-06-30" }],
      "huecos": [{ "inicio": "2026-07-01", "fin": "2026-12-31" }],
      "fuentes": ["SRC-1"]
    }
  },
  "cobertura": {
    "estadoCobertura": "Parcial",
    "coberturaGlobal": "Parcial",
    "huecos": [
      { "inicio": "2026-07-01", "fin": "2026-12-31", "partidaId": "PAR100" }
    ]
  },
  "totales": {
    "valor": null,
    "subtotalConocido": null,
    "estadoTotal": "NoVerificable",
    "estadoCobertura": "Parcial",
    "motivoCodigo": "RegistroFueraDeIntervalosArchivo",
    "motivo": "registro fuera de los intervalos de archivo de su fuente; no se prorratea"
  },
  "agregadoNoAtribuible": [
    {
      "idArchivo": "AH001",
      "partidaId": "PAR100",
      "intervalo": { "inicio": "2026-07-01", "fin": "2026-12-31" },
      "importe": "100.00",
      "causa": "FueraDeIntervalosArchivo"
    }
  ]
}
```

### Caso 4b — registro que solapa el corte, sin tramos

```json
{
  "item": {
    "archivo": null,
    "total": null,
    "subtotalConocido": null,
    "estadoCobertura": "NoDisponible",
    "estadoTotal": "NoDisponible",
    "motivoCodigo": "AgregadoNoAtribuibleAlCorte",
    "motivo": "PAR100: agregado no atribuible al corte; no se prorratea",
    "cobertura": { "intervalos": [], "huecos": [], "fuentes": [] }
  },
  "cobertura": {
    "estadoCobertura": "NoDisponible",
    "coberturaGlobal": "NoDisponible",
    "huecos": []
  },
  "totales": {
    "valor": null,
    "subtotalConocido": null,
    "estadoTotal": "NoDisponible",
    "estadoCobertura": "NoDisponible",
    "motivoCodigo": "AgregadoNoAtribuibleAlCorte",
    "motivo": "agregado no atribuible al corte; no se prorratea"
  },
  "agregadoNoAtribuible": [
    {
      "idArchivo": "AH001",
      "partidaId": "PAR100",
      "intervalo": { "inicio": "2026-01-01", "fin": "2026-08-27" },
      "importe": "100.00",
      "causa": "CorteExcedido"
    }
  ]
}
```

## 5. Contraste con SPEC20

### 5.1 Lo que la SPEC20 exige

- **Cobertura** es la «unión de intervalos verificados de archivo y control
  detallado, para un universo acreditado»; no es la presencia de una tabla, de
  una fila o de un total por omisión.
- **Total verificado** es la «suma de archivo y detalle elegible con cobertura
  continua hasta el corte»; no es la «suma de subtotales con huecos, overlap o
  registros sin mapping».
- El combinador, paso 8, solo calcula total si
  `estadoCobertura=Completa`, no hay conflictos, todos los registros elegibles
  están verificados/mapeados en el destino requerido y
  `detallePrecontrolNoVinculado` está vacío.
- **E45-A3 (aprobada 2026-11-10, definitiva)** es explícita:

  > «Un registro de archivo cuyo intervalo esté comprendido en `[inicio del
  > ejercicio, corteConsulta]` pero no quede contenido en ningún
  > `intervalosArchivo` aplicable de su fuente (misma Partida y clase) no se
  > prorratea, no se recorta y no se suma. Se expone en
  > `agregadoNoAtribuible[]` con `causa="FueraDeIntervalosArchivo"` y activa
  > `motivoCodigo=RegistroFueraDeIntervalosArchivo`; la Partida queda
  > `estadoTotal=NoVerificable`, `total=null` y `subtotalConocido=null`.»
  >
  > «Ningún caso de esta enmienda convierte el registro en importe del periodo,
  > en `0` ni en cobertura.»

- E45-A3 también aclara que la comprobación es contra `intervalosArchivo`, no
  contra `controlDetalle`. El control aporta cobertura; no acredita contención
  de un registro de archivo. `E45-A3-T1` ya lo prueba con intervalos no vacíos.

### 5.2 Dónde falla el motor

El motor cumple la parte de **cobertura global** (2a/2c/3a/3b tienen
`estadoCobertura=Completa` por la unión de otras fuentes/controles) y la parte de
**conflictos** (no hay solapes ni duplicados en los fixtures). Pero incumple la
**elegibilidad del registro**: con `intervalosArchivo: []` no hay ningún tramo
aplicable que contenga el registro y, aun así, no se emite
`FueraDeIntervalosArchivo`; se suma. Por tanto, el `total` certificado puede
incluir un importe que la propia SPEC20/E45-A3 declara no atribuible.

La contradicción es material en 2a y 2c (total `Verificado`) y en 3b (total
`Verificado` con el registro fuera del control de su fuente). En 1/1b/2b el
importe queda en `archivo`/`subtotalConocido`, pero el total no se certifica por
otros motivos; siguen siendo contrarios a E45-A3, que exige
`subtotalConocido=null`.

### 5.3 ¿Hay inferencia de intervalos, importes o coberturas?

- **Intervalos:** no. `cobertura.intervalos` solo refleja
  `intervalosArchivo`/`controlDetalle` de las fuentes; el registro no añade
  cobertura.
- **Importes:** sí hay una atribución indebida: el importe del registro se suma
  a `archivo` sin que su fuente acredite contención. No se prorratea ni se
  recorta, pero se atribuye.
- **Coberturas:** no se sintetiza una cobertura nueva a partir del registro. El
  problema es que la ausencia de cobertura propia no impide la suma cuando otra
  fuente completa la cobertura global.

### 5.4 ¿Hace falta una enmienda de SPEC20?

Para el núcleo, **no**: E45-A3 ya exige que un registro no contenido en ningún
`intervalosArchivo` aplicable no sume y quede como `FueraDeIntervalosArchivo`.
La corrección es implementar la enmienda vigente, no cambiarla; solo requiere
autorización DEV y actualización del testplan.

Una enmienda de SPEC20 solo sería necesaria si se quisiera **mantener F2d**, es
decir, permitir que una fuente con `intervalosArchivo: []` (o solo con
`controlDetalle`) sume registros de archivo. Eso revertiría E45-A3 y exigiría una
decisión explícita; no se propone aquí.

## 6. Propuesta de corrección mínima — **NO IMPLEMENTADA**

> **Estado:** propuesta documental. No se ha modificado el motor, el DTO, la
> SPEC20 ni las reglas financieras. Requiere autorización DEV específica y
> actualización del testplan; no se deriva de esta investigación.

### 6.1 Cambio propuesto

En `analizarItem` (`apps/api/src/historico-precontrol.ts`) la comprobación debe
ejecutarse siempre, incluso con lista vacía, pero **solo para el registro que,
tras los filtros existentes, llegaría a `archivo`**. No basta con quitar el
guard: hay que mover la comprobación justo antes de `archivo += importe` y
respetar esta precedencia.

**Precedencia propuesta (para no sobre-bloquear):**

1. `Rechazado`, conflictos de identidad/versión, `DosFuentes` y solapes ya
   resueltos se `continue` antes; no cambian y no se convierten en
   `FueraDeIntervalosArchivo`.
2. `corteArchivo` o corte de consulta excedido se mantiene como `CorteExcedido`
   antes de la contención (4b).
3. `NoVerificado`: conserva `VerificacionPendiente`; no se evalúa A3.
4. Regularización 2026 sin evidencia/motivo Q5=A: conserva
   `RegularizacionPendiente`; no se evalúa A3.
5. `representadoEnMovimientos=Si` con vínculo y evidencia: se excluye y el
   Movimiento cuenta una vez; no se evalúa A3.
6. `representadoEnMovimientos=Desconocido`, o `No` sin evidencia, conserva
   `DuplicadoAmbiguo`; no se evalúa A3.
7. Solo el registro que, tras esos filtros, va a sumarse a `archivo` se somete a
   la contención de A3.
8. **Cero:** si el registro llega a `archivo` con `importe=0`, la contención se
   evalúa igual y, si queda fuera, se expone y bloquea como cualquier otro
   registro. No se propone excepción: A3 no la contempla y un cero fuera de
   tramo no puede acreditar un `0,00` verificado ni cobertura. La precedencia
   anterior solo evita que un cero ya filtrado (`NoVerificado`, vinculado o
   `Desconocido`) se convierta en `FueraDeIntervalosArchivo`. Si el producto
   quisiera que un cero fuera de tramo no bloqueara un total positivo, sería una
   regla nueva y requeriría decisión expresa.

La contención usa **misma Partida y misma clase** que el registro, además de la
regla de ejercicio de la regularización:

```ts
// Propuesto (NO implementado): ubicado justo antes de `archivo += importe`
if (fuenteRegistro) {
  const tramosAplicables = fuenteRegistro.intervalosArchivo
    .filter(
      (tramo) =>
        tramo.partidaId === partidaId && tramo.clase === registro.clase,
    )
    .filter(
      (tramo) =>
        tramo.clase !== "Regularizacion2026" || entrada.ejercicio === 2026,
    )
    .map((tramo) => tramo.intervalo);
  const contenido = unirIntervalos(tramosAplicables).some(
    (intervalo) =>
      intervalo.inicio <= registro.intervalo.inicio &&
      intervalo.fin >= registro.intervalo.fin,
  );
  if (!contenido) {
    agregados.push({
      idArchivo: registro.idArchivo,
      partidaId,
      intervalo: registro.intervalo,
      importe: decimal(importe),
      causa: "FueraDeIntervalosArchivo",
    });
    bloqueos.push("RegistroFueraDeIntervalosArchivo");
    subtotalNoSeparable = true;
    archivoConocido = false;
    continue;
  }
}
```

No se propone añadir `controlDetalle` a la contención: E45-A3 habla solo de
`intervalosArchivo` y `E45-A3-T1` ya bloquea un registro dentro del control pero
fuera de los tramos. Si el producto quisiera que el control contuviera registros
de archivo, sería una regla nueva y requeriría una enmienda de SPEC20, no un
arreglo mínimo.

**Impacto en fuentes que solo tienen `controlDetalle`:** siguen siendo válidas
para acreditar cobertura y para `fuentesEsperadas`, y sus Movimientos siguen
yendo a `detalleControl`; pero **no pueden aportar registros de archivo** sin
`intervalosArchivo`. Si una fuente mezcla control y registros de archivo, debe
declarar intervalos para esos registros. F2d es el único fixture que hoy afirma
lo contrario.

### 6.2 Impacto en motor, DTO y fórmulas

- **Motor:** un registro de fuente con `intervalosArchivo: []` deja de sumar y
  pasa a `agregadoNoAtribuible[]` con `causa="FueraDeIntervalosArchivo"` y
  bloqueo `RegistroFueraDeIntervalosArchivo`.
- **DTO:** no cambia su forma. `agregadoNoAtribuible[]` ya existe y ya admite
  `causa`. `motivoCodigo` puede pasar a `RegistroFueraDeIntervalosArchivo`.
  `archivo`, `subtotalConocido` y `total` pueden pasar a `null`; `estadoTotal`
  a `NoVerificable` (o `NoDisponible` si no hay cobertura global).
- **Fórmulas:** no cambia la fórmula de `total` ni de `subtotalConocido`; cambia
  la **elegibilidad** de los registros que entran en `archivo`. No se prorratea,
  no se recorta, no se resta y no se elige fuente.
- **Cobertura:** no cambia. La cobertura sigue siendo la unión de
  `intervalosArchivo` + `controlDetalle`; un control puede mantener
  `estadoCobertura=Completa` aunque el registro de archivo quede fuera y el
  total sea `NoVerificable`, exactamente como en `E45-A3-T1`.
- **Motivos globales:** `agregados.some(causa === "FueraDeIntervalosArchivo")`
  ya añade `RegistroFueraDeIntervalosArchivo` al global; no hace falta código
  nuevo.
- **API/UI futuras:** el total no verificable debe mostrar el motivo; no se
  convierte en `0` ni se oculta el componente.

### 6.3 Regresiones y pruebas que habría que actualizar en un paquete DEV

La corrección haría fallar, deliberadamente, las pruebas que hoy caracterizan el
defecto:

- `F2d: una fuente con intervalosArchivo vacío no impide sumar un registro
  válido` (espera `archivo="100.00"`, `total="100.00"`). Debería reescribirse:
  el registro no está contenido en ningún `intervalosArchivo` y debe quedar
  fuera.
- `P-01a: sin intervalosArchivo declarados, un registro dentro del corte no
  inventa cobertura` (espera `archivo="100.00"`, `subtotalConocido="100.00"`).
  Debería reescribirse a `archivo=null`, `subtotalConocido=null`,
  `total=null`, `motivoCodigo=RegistroFueraDeIntervalosArchivo`.
- Las pruebas nuevas de esta investigación que documentan el comportamiento
  actual (casos 1, 1b, 2a, 2b, 2c, 3a, 3b) tendrían que actualizarse a la
  conducta corregida; se conservan ahora como caracterización, no como
  expectativa deseada.
- **`P-05` no cambia:** el registro es `Rechazado` y su `continue` ocurre antes
  de la comprobación de contención, por lo que sigue sin sumar y sin exponerse
  como `FueraDeIntervalosArchivo`. No debe añadirse a la lista de regresiones
  afectadas.
- **`NoVerificado`:** añadir/actualizar una regresión con `intervalosArchivo: []`
  y registro fuera de tramo; debe conservar `VerificacionPendiente` y no
  convertirse en `FueraDeIntervalosArchivo`.
- **Vinculado:** añadir/actualizar una regresión con
  `representadoEnMovimientos=Si` y vínculo/evidencia fuera de tramo; debe seguir
  excluido y deduplicado, no `FueraDeIntervalosArchivo`.
- **`Desconocido`/`No` sin evidencia:** añadir/actualizar una regresión fuera de
  tramo; debe conservar `DuplicadoAmbiguo`, no `FueraDeIntervalosArchivo`.
- **Cero:** añadir una regresión de cero fuera de tramo. Si el cero llega a
  `archivo`, la contención se evalúa y bloquea como A3; no se exime. Debe
  comprobarse además que un cero `NoVerificado`, vinculado o `Desconocido` no se
  convierte en `FueraDeIntervalosArchivo` por la nueva ubicación de la
  comprobación.
- `E45-A3-T1`, `E45-A3-T2`, `E45-A3-T3`, `E45-A3-T4`, `E45-A3-T5` y los casos
  con intervalos no vacíos no deberían cambiar.
- `P-10` (expectativa posterior al corte sin cobertura) no tiene registros y no
  cambia; sirve de precedente para la condición 2c.

### 6.4 Pruebas de corrección recomendadas (2a, 2c, 3a, 3b)

Además de actualizar las anteriores, fijar explícitamente el resultado esperado
tras la corrección. Para los cuatro casos con importe positivo:

| Caso | Cobertura que aporta la otra fuente/control | `archivo` | `subtotalConocido` | `total` | `estadoCobertura` | `estadoTotal` | `motivoCodigo` | `agregadoNoAtribuible` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2a | SRC-2 cubre todo 2026 | `null` | `null` | `null` | `Completa` | `NoVerificable` | `RegistroFueraDeIntervalosArchivo` | `AH001` · `100.00` · `FueraDeIntervalosArchivo` |
| 2c | SRC-2 cubre 01/01–06/30 | `null` | `null` | `null` | `Completa` | `NoVerificable` | `RegistroFueraDeIntervalosArchivo` | `AH001` · `100.00` · `FueraDeIntervalosArchivo` |
| 3a | control SRC-1 cubre todo 2026 | `null` | `null` | `null` | `Completa` | `NoVerificable` | `RegistroFueraDeIntervalosArchivo` | `AH001` · `100.00` · `FueraDeIntervalosArchivo` |
| 3b | control SRC-1 ene–jun + SRC-2 jul–dic | `null` | `null` | `null` | `Completa` | `NoVerificable` | `RegistroFueraDeIntervalosArchivo` | `AH001` · `100.00` · `FueraDeIntervalosArchivo` |

En 3a/3b, `detalleControl` puede seguir siendo `"0.00"` (el control existe y no
hay Movimientos) y la cobertura sigue siendo `Completa`; lo que cambia es que el
registro de archivo ya no es elegible y el total deja de certificarse. Para 1,
1b y 2b el resultado corregido es el mismo `archivo=null`,
`subtotalConocido=null`, `total=null` y agregado
`FueraDeIntervalosArchivo`; 1/1b mantienen `estadoCobertura=NoDisponible` y 2b
`Parcial`/`FuenteAusente`. `Rechazado`, `NoVerificado`, vinculados y
`Desconocido` conservan su motivo previo, según §6.3; un cero que llegue a
`archivo` se evalúa y bloquea igual que un positivo.

1. SRC-1 `intervalosArchivo: []`, `controlDetalle: null`, un registro
   `Verificado` dentro del corte.
2. SRC-2 con cobertura completa del universo y `fuentesEsperadas` que no
   incluyan SRC-1 (2a) o expectativa de SRC-1 fuera del corte (2c); para 3a/3b
   la cobertura se completa con el control de SRC-1.
3. Esperar `estadoCobertura=Completa`, `estadoTotal=NoVerificable`,
   `total=null`, `subtotalConocido=null`, `archivo=null`,
   `motivoCodigo=RegistroFueraDeIntervalosArchivo` y el agregado con
   `causa="FueraDeIntervalosArchivo"`.
4. Repetir con SRC-1 esperada `Presente` y comprobar que tampoco certifica y que
   el importe no aparece en `archivo`/`subtotalConocido`.

## 7. Pruebas añadidas y verificación

Bloque nuevo en `apps/api/src/historico-precontrol.test.ts`:

- `caso 1`: sin cobertura propia, el importe entra en `archivo`/`subtotal` pero
  no hay total.
- `caso 1b`: sin expectativa DT7, mismo resultado con motivo `SinFuente`.
- `caso 2a`: otra fuente acredita cobertura y el total certifica el importe de
  la fuente sin intervalos.
- `caso 2b`: si la fuente sin intervalos es esperada, el importe sigue en
  `archivo`/`subtotal` pero el total no se certifica.
- `caso 2c`: expectativa posterior al corte; el importe sin cobertura se
  certifica.
- `caso 3a`: el `controlDetalle` acredita cobertura y el registro suma.
- `caso 3b`: el registro suma fuera del control de su propia fuente y se
  certifica.
- `caso 4a`: con intervalos declarados, el registro fuera de ellos se bloquea.
- `caso 4b`: con lista vacía, un registro que solapa el corte se bloquea como
  `CorteExcedido`.

Comandos y resultados observados:

```text
bun test apps/api/src/historico-precontrol.test.ts
103 pass, 0 fail (650 expect() calls)

bun run typecheck
exit 0

python3.12 scripts/validate-template .
Template validation passed: structure, links, manifests, contracts, resume,
prompt, safety heuristics and CI.

python3.12 scripts/verify baseline
Baseline phase: PASS; application phase not included.
```

No se modifican las pruebas en esta revisión del documento; el resultado de
`bun test` es el del commit de caracterización. No se declaran PASS de AC, DT7
ni equivalencia con el Excel.

## 8. Límites

- Fixtures sintéticos; no hay datos reales, Excel, SQL, migración, API ni UI.
- No se ha ejecutado una corrección ni se ha modificado el motor.
- La interpretación de E45-A3 como bloqueo con lista vacía es la lectura
  normativa defendida aquí; el núcleo **no necesita una enmienda de SPEC20**.
  Una enmienda solo sería necesaria si se quisiera mantener F2d (permitir que
  una fuente sin `intervalosArchivo` sume registros de archivo), lo que
  revertiría E45-A3 y requeriría decisión explícita.
- DT7 sigue abierto; esta investigación no acredita inventario, cobertura real
  ni totales.
