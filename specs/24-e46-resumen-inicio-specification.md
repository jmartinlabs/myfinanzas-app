# 24 — E4.6 Resumen de inicio completo: Specification

Status: **APROBADA documentalmente por el usuario el 2026-11-03.** Q1–Q12 ratificadas en
opción A, incluida **Q3-B=A** (E4.6 solo lectura, sin almacén de meses objetivo/umbrales) y
**Q4=A** (año de `mesFinanciado`, incluso si el corte cae en el ejercicio siguiente). DEV24
**NO autorizado**; ningún AC en PASS. Wireframes 1440/390: contrato documental aprobado; la
implementación visual no está autorizada.
Este documento no implementa código, API, SQLite, DDL ni migraciones.
Approval source/date: aprobación directa del usuario, 2026-11-03.
Context and brainstorming: [24-e46-resumen-inicio-brainstorming.md](24-e46-resumen-inicio-brainstorming.md),
[roadmap E4.6](roadmap.md#e46--resumen-de-inicio-completo),
[referencia R6](functional-reference-v5.11.md),
[SPEC12](12-flujo-mensual-specification.md), [SPEC21](21-pendientes-conciliacion-specification.md),
[SPEC22](22-ventas-posicion-broker-specification.md), [SPEC23](23-e43-valoracion-resultados-specification.md),
[SPEC17](17-e44-deuda-completa-specification.md), [SPEC27](27-e49-cierre-financiero-specification.md),
[guías UI](guidelines/ui.md), [arquitectura](guidelines/architecture.md),
[calidad](guidelines/quality.md) y [seguridad](guidelines/security.md).
Base de contenido: `main` `024b348` (2026-11-03), esquema SQLite **v23**.
Rebase mecánico sobre `origin/main` `bb076f1` (incluye `a26fffb`, E3.6/DEV21); no reaudita el
contenido ni cambia el alcance.
Test design: [24-e46-resumen-inicio-testplan.md](24-e46-resumen-inicio-testplan.md).

**Leyenda.** `CONFIRMADO` = regla de un documento aprobado o ratificación del usuario.
`PROPUESTA` = detalle técnico candidato dentro del alcance aprobado. `PENDIENTE` = dependencia
externa no resuelta. **Q1–Q12 están aprobadas en opción A el 2026-11-03, con Q3-B=A y Q4=A
explícitas.**

## Functionality

E4.6 ofrece una pantalla **de solo lectura** que reúne, en un único inicio, la información
que R6 enumera: liquidez, ciclo, Saldos/bolsas, ahorro, inversión, deuda no hipotecaria y
pendientes. No calcula economía nueva: **compone** resultados ya publicados por sus motores y
declara, por cada cifra, motor, contexto y cobertura.

Incluye:

1. Contexto del ciclo actual y su corte, leído del maestro de Ciclos y de la referencia
   financiera central.
2. Liquidez actual y `mesesCubiertos` cuando liquidez y coste esencial sean completos; mínimo
   objetivo R6 cuando exista configuración de meses objetivo.
3. Resumen del ciclo actual: ejecución real y márgenes ya publicados por E2.6.
4. Vistas independientes de Saldos: liquidez, ahorro y bolsas, sin sumarlas entre sí.
5. Inversión: agregado de posiciones de E4.3 (si está integrado y su cobertura lo permite) y
   efectivo del bróker por Saldo de E4.2, sin total combinado.
6. Deuda no hipotecaria de E4.4, con deuda viva por deuda y total solo si es calculable.
7. Pendientes de E3.6; esta spec define el consumo, pero el DEV E4.6 no está autorizado, por lo
   que el ejemplo de contrato figura `No disponible` con motivo.
8. Drill-down desde cada cifra a su módulo o ficha de origen.

No incluye: cálculo de motores, segunda contabilidad, patrimonio global, valoración fuera de
E4.3, cierre/fotos, comparación anual, archivo histórico, presupuestos alternativos ni
escrituras de ningún tipo.

### Frontera y autoridad

| Ámbito | Autoridad | Papel de E4.6 |
| --- | --- | --- |
| Ciclo actual, fechas, corte y referencia | E1.3 / `ciclos.cycleContext` | Consume; no selecciona por reloj ni crea ciclos |
| Liquidez, ejecución del ciclo, márgenes y estados de ahorro | E2.6 / `monthlyFlow` | Consume valores y cobertura; no re-suma Saldos |
| Coste esencial mensual | E2.4 / `annualEquivalent` | Consume el racional exacto y su estado; no recalcula |
| Saldos, posiciones y bolsas | E1.1 / `getSaldo`, `listSaldos` | Consume posición y atributos; no deriva pertenencia |
| Posiciones y efectivo del bróker | E4.2 / `positionsAtDate`, `cashAt` | Consume cantidades y efectivo; no valora |
| Valoración, resultado y agregado de posiciones | E4.3 | Consume su contrato; no calcula resultado ni reescala valores |
| Deuda viva y tipo de deuda | E4.4 / `listDeudasCompletas`, `getDeudaCompleta` | Consume; no reconstruye capital ni intereses |
| Pendientes y conciliación | E3.6 | Consume su read model; no crea un motor paralelo |
| Patrimonio global y comparación anual | E4.7 (futuro) | Fuera de E4.6 |
| Cierre, foto y reapertura | E4.8–E4.10 | Fuera de E4.6; no lee ni escribe fotos |
| Configuración de meses objetivo y umbrales | **No existe en v23** | Solo `minimoObjetivo` queda `No disponible` (Q3-B); `mesesCubiertos` no depende de ella |

**CONFIRMADO.** E4.6 no reabre E2.6, E3.6, E4.2, E4.3 ni E4.4. No introduce una fórmula
económica nueva ni una tabla de resultados.

### Fronteras con E4.7 y E4.9

| Entrega | Frontera |
| --- | --- |
| E4.7 — Resumen anual y flujo completo | E4.6 muestra el ciclo actual y posiciones actuales; **no** compara ejercicios, no agrega por año/trimestre, no reconstruye archivo, no calcula márgenes medio/estructural/puntual distintos de los ya publicados por E2.6 y no consume el archivo precontrol. E4.7 es el propietario de la comparación anual. |
| E4.9 — Cierre financiero y foto | E4.6 no lee estado de cierre, precierre ni foto; no crea snapshots, no valida ventana de cierre y no congela cifras. Un cierre futuro puede cambiar los hechos de origen, pero E4.6 se limita a leer los motores vivos. E4.9 no consume el DTO del inicio como foto. |

La frontera es de responsabilidad, no de formato: E4.6 puede enlazar a E4.7/E4.9 cuando
existan, pero no anticipa sus cálculos ni sus contratos.

## Data model and contracts

### Principios de composición

| ID | Regla | Origen |
| --- | --- | --- |
| P-01 | Solo lectura: la consulta no escribe hechos, planes, cierres, auditoría ni configuración | Roadmap / paquete |
| P-02 | Ninguna cifra se calcula en el navegador; la UI formatea lo que devuelve el API | T-DAT |
| P-03 | Cada cifra declara `fuente.motor`, IDs y revisión; sin fuente identificada no hay cifra | E4.6-AC1 |
| P-04 | `null` significa `No disponible` y nunca se normaliza a `0.00`; el cero explícito se conserva | SPEC12 / SPEC23 |
| P-05 | Cobertura por métrica; un parcial no se presenta como total | SPEC12 |
| P-06 | Contextos separados (`ciclo`, `actual`, `corte`); no se suman bloques de contextos distintos | Q2=A |
| P-07 | No se inventa un agregado donde el motor propietario no lo publica; si E4.6 suma (p. ej. deuda no hipotecaria Q7), la regla es explícita, trazable y conserva la cobertura | SPEC21 / SPEC22 |
| P-08 | Una lectura = un snapshot SQLite coherente con una `revision`; sin caché persistida | SPEC12 |
| P-09 | Los enlaces solo llevan IDs y rutas; nunca importes ni datos financieros | Security guidelines |
| P-10 | Sin motores nuevos, sin tablas nuevas y sin migración en E4.6 | Paquete / roadmap |

### Motores consumidos

| Bloque | Contrato consumido | Dato exacto | E4.6 no hace |
| --- | --- | --- | --- |
| Contexto | `GET /api/ciclos/contexto`; `cycleContext`, `cycleMaster` | `actual`, `referencia`, `corte`, `estadoCorte`, cobertura de fuentes | No elige ciclo por reloj ni inventa corte |
| Liquidez | `monthlyFlow().metrics.liquidez` y `.liquidez` | `valor`, `subtotal`, `estado`, `motivo`, `cobertura`, `incluidos`, `excluidos` | No re-suma Saldos ni reaplica el filtro Liquidez |
| Ciclo | `monthlyFlow().metrics` | `ingresos`, `gasto`, `extraordinaria`, `operativo` (`observedOperating`), `margenReal`, `nomina`, `base`, `delMes` | No recompone Gasto ni márgenes |
| Objetivo R6 | `annualEquivalent()` de E2.4 + configuración Q3-B | `estado`, `total {numeradorCentimos, divisor}`, `parcial`, `importesSinInformar` | No divide por 12 ni usa `mesesObjetivo` para `mesesCubiertos` |
| Saldos/bolsas | `listSaldos` / `getSaldo` | `posicion.importe`, `posicion.motivo`, `liquidez`, `finalidad`, `mostrarComoBolsa`, `estado` | No crea una posición nueva ni suma vistas |
| Ahorro | `metrics.ahorroCierre`, `variacionAhorro`, `ahorroResidual` de E2.6; Saldos con Finalidad `Ahorro` | Valores y cobertura publicados; lista de posiciones | No inventa «ahorro generado» ni total nuevo |
| Inversión valorada | Contrato E4.3 `GET /api/e43/corte?fecha=` (conceptual) | `agregado.valorEur`, `coberturaValoracion`, `resultadoEur`, `coberturaResultado`, `posiciones[]` | No valora, no reescala, no calcula resultado |
| Posiciones sin valorar | `positionsAtDate(db, corte)` de E4.2 | `cantidad`, `compras`, `ventas`, fechas | No crea valor si E4.3 falta |
| Efectivo del bróker | `cashAt` / `cashDto` / `GET /api/inversiones/efectivo?saldo=` | `disponible` por Saldo `Efectivo`/`Inversiones` | No suma un total de efectivo ni lo mezcla con posiciones |
| Deuda | `GET /api/deudas` (sin corte) y `GET /api/deudas/{id}?corte=` | `tipoDeuda`, `estado`, `capitalPendiente`, `capital.calculable`, `motivoNoCalculable` | No reconstruye capital ni resta la deuda del gasto |
| Pendientes | Read model E3.6 (conceptual) | `TransversalItem[]`, `metricas[]`, `cobertura`, `estado`, `enlaces` | No crea un total ni un contador propio |

**CONFIRMADO.** Las rutas y funciones anteriores son las fuentes; E4.6 no mantiene una
segunda implementación. `monthlyFlow` ya documenta que la cobertura histórica del intervalo
no está acreditada; E4.6 conserva esa marca.

### Contexto y selección

- El ciclo del inicio es `cycleContext().actual`, derivado de la referencia financiera
  central y del maestro. **No** se usa `Date.now` ni el mes natural para elegirlo.
- Si no hay ciclo actual, el contexto lo declara (`sin_ciclo_actual`, `sin_referencia` o
  `error_referencia`) y las métricas ligadas al ciclo pasan a `No disponible` con motivo.
  Liquidez, Saldos, deuda y efectivo actuales pueden seguir visibles, etiquetados como
  contexto actual.
- `corte` es el corte efectivo del ciclo publicado por E2.6. Si es `null`, no se sustituye por
  la fecha de consulta.
- Los bloques actuales (Liquidez, Saldos, Deuda, Efectivo) llevan su propio contexto; no se
  fechan con un corte histórico que no exista.

**APROBADA (Q4=A, 2026-11-03).** El ejercicio del coste esencial es el **año de
`ciclo.mesFinanciado`**, incluso si el corte cae en el ejercicio siguiente. No se usan el
reloj, el corte ni el año del ingreso para sustituirlo. `annualEquivalent` se consume sin
recalcular. Fuente: aprobación directa del usuario, 2026-11-03.

### Objetivo R6

```text
costeEsencialMensual = E2.4 annualEquivalent(plan anual del ejercicio).total
                       (racional exacto: numeradorCentimos / divisor)
minimoObjetivo       = costeEsencialMensual × mesesObjetivo
mesesCubiertos       = liquidezVerificada / costeEsencialMensual
zona                 = Informativa (siempre)
```

Reglas:

- `annualEquivalent.estado = Incompleto` o `Sin plan anual` → `costeEsencialMensual` no se
  publica como completo; `minimoObjetivo` y `mesesCubiertos` quedan `No disponible` por coste
  no verificado; el subtotal conocido se muestra aparte.
- `costeEsencialMensual = 0` verificado → `mesesCubiertos` `No disponible` por denominador no
  aplicable; nunca `0`, infinito ni «cobertura total». El tratamiento del `minimoObjetivo` con
  meses configurados en ese caso queda en Q11 y no se usa para declarar cobertura.
- `mesesCubiertos` se muestra cuando la **liquidez está verificada** (incluido `Cero
  verificado`) y el **coste está completo y es > 0**, aunque `mesesObjetivo` no exista. No
  depende de la configuración. Liquidez cero verificada → `0,00` meses con `Cero verificado`,
  no `No disponible`.
- `minimoObjetivo` requiere coste completo y `mesesObjetivo` configurado; **no depende de la
  liquidez**. Sin `mesesObjetivo` → `No disponible`; no se usan valores por defecto.
- Liquidez `Parcial` o `No disponible` → `mesesCubiertos` `No disponible` por su propio motivo;
  no se divide un subtotal como si fuera total.
- Los umbrales solo etiquetan la zona. No hay transferencia, reserva, bloqueo ni sugerencia
  operativa.
- El resultado se calcula sobre el racional exacto y se formatea una sola vez; el formato de
  meses (2 decimales propuesto) queda **PENDIENTE DT8** y no altera el valor.

**PENDIENTE Q3-B.** No existe almacén de `mesesObjetivo` ni de umbrales. El contrato admite una
configuración inyectada por un proveedor aprobado; en v23 el proveedor no existe y **solo**
`minimoObjetivo` figura `No disponible`. E4.6 no crea esa configuración, ni defaults, ni tabla,
ni motor duplicado.

### Saldos y bolsas

La sección publica la posición de cada Saldo y **conteos de pertenencia** a Liquidez, Ahorro y
Bolsas. No publica importes agregados por vista ni un total de Saldos: los atributos son
independientes y un mismo Saldo puede pertenecer a varias.

### Inversión, efectivo y deuda

- **Posiciones:** si E4.3 está integrado, se consume su `agregado` ya calculado. Si su
  cobertura no es completa, se publica `Parcial n/m` y `valorEur: null`. Si E4.3 no está
  integrado, las cantidades pueden mostrarse desde E4.2, pero el valor es `No disponible`.
- **Efectivo:** se lista un registro por Saldo `Efectivo`/`Inversiones` con `cashAt` al mismo
  corte. **No se publica un total de efectivo del bróker** (SPEC22 §4.2) y **no se suma** al
  agregado de posiciones (SPEC23 D-11).
- Un mismo Saldo puede aparecer en Liquidez y en Efectivo del bróker. Son dos vistas del mismo
  activo, no dos importes que se sumen.
- **Deuda no hipotecaria [Q7=A]:** se suman solo deudas `Activa` con
  `tipoDeuda = No hipotecaria` y `capital.calculable = true`. Si alguna no es calculable, el
  total es `null` con subtotal conocido y cobertura `n/m`. `Hipotecaria` y `Sin informar` se
  muestran aparte y **no** entran en el total.
- La deuda no se resta de la liquidez, del gasto ni del saldo operativo.

### Ahorro

- Se muestran por separado: (a) `ahorroCierre` y `variacionAhorro` de E2.6 con su cobertura
  (hoy `No disponible` por falta de proveedor histórico); (b) posiciones actuales de Saldos
  activos con Finalidad `Ahorro`, cada una con su motor. No se publica un total nuevo de
  ahorro sin decisión Q5.
- «Ahorro» no es «ejecución del Presupuesto de Ahorro» ni «ahorro generado anual». Cada
  etiqueta conserva su nombre de origen.

### Pendientes

- Con E3.6 integrado: se consumen sus `TransversalItem`, con `estado`, `cobertura`,
  `severidad` y `enlaces`. Se puede mostrar conteo por tipo/estado si E3.6 lo publica; **no**
  se publica un total monetario entre tipos.
- Sin E3.6: `No disponible` con motivo, sin conteo 0 y sin enlace inventado.

### DTO de lectura propuesto

`GET /api/resumen-inicio` devuelve un objeto con `contexto`, `secciones` y
`pendientesDelModelo`. Los importes son cadenas decimales exactas en EUR; `null` es
`No disponible`. Ejemplo ficticio (coherente con el oráculo del testplan):

```json
{
  "contexto": {
    "ciclo": {
      "id": "C007",
      "inicio": "2026-06-20",
      "fin": null,
      "mesFinanciado": "2026-07",
      "estadoTemporal": "Abierto",
      "corte": "2026-07-19",
      "estadoCorte": "disponible"
    },
    "referencia": {
      "fecha": "2026-07-19",
      "estado": "disponible",
      "cobertura": [
        { "source": "Movimientos", "state": "disponible", "maxDate": "2026-07-19" },
        { "source": "Revisión Comida", "state": "pendiente" },
        { "source": "Operaciones de inversión", "state": "disponible", "maxDate": "2026-07-19" }
      ]
    },
    "consulta": "2026-11-03T10:00:00.000Z",
    "revision": "huella-de-la-composicion",
    "motivos": []
  },
  "secciones": {
    "liquidez": {
      "metrica": {
        "clave": "liquidez",
        "etiqueta": "Liquidez",
        "clase": "posicion",
        "valor": null,
        "subtotal": "3456.40",
        "estado": "Parcial",
        "unidad": "EUR",
        "motivo": "Una posición elegible no tiene pertenencia verificable",
        "cobertura": {
          "estado": "Parcial",
          "incluidos": 3,
          "excluidos": 1,
          "motivos": ["S005: Liquidez sin informar"]
        },
        "fuente": { "motor": "E2.6 monthlyFlow", "ids": ["S001", "S002", "S003"], "revisiones": [] },
        "contexto": { "tipo": "actual" },
        "enlace": { "ruta": "/saldos", "ids": ["S001", "S002", "S003"] }
      },
      "incluidos": [
        { "id": "S001", "nombre": "Cuenta demo", "valor": "1200.00" },
        { "id": "S002", "nombre": "Ahorro demo", "valor": "800.00" },
        { "id": "S003", "nombre": "Efectivo inversión demo", "valor": "1456.40" }
      ],
      "excluidos": [
        { "id": "S005", "motivo": "Liquidez sin informar" }
      ]
    },
    "objetivo": {
      "metrica": {
        "clave": "minimoObjetivo",
        "etiqueta": "Mínimo objetivo",
        "clase": "objetivo",
        "valor": null,
        "estado": "No disponible",
        "unidad": "EUR",
        "motivo": "Meses objetivo no configurados",
        "cobertura": { "estado": "No disponible", "incluidos": 0, "excluidos": 0, "motivos": ["Meses objetivo no configurados"] },
        "fuente": { "motor": "E2.4 annualEquivalent + configuración R6", "ids": [], "revisiones": [] },
        "contexto": { "tipo": "actual" },
        "enlace": { "ruta": "/plan-anual", "ids": [] }
      },
      "costeEsencialMensual": {
        "valor": "1500.00",
        "estado": "Verificado",
        "ejercicio": 2026,
        "ejercicioOrigen": "mesFinanciado",
        "estadoEquivalente": "Completo"
      },
      "mesesObjetivo": null,
      "mesesCubiertos": {
        "valor": null,
        "estado": "No disponible",
        "unidad": "meses",
        "motivo": "Liquidez parcial: no se divide el subtotal conocido"
      },
      "zona": "Informativa"
    },
    "ciclo": {
      "ingresos": { "clave": "ingresos", "etiqueta": "Ingresos", "clase": "real", "valor": "2250.00", "subtotal": null, "estado": "Verificado", "unidad": "EUR", "motivo": "", "cobertura": { "estado": "Completa", "incluidos": 3, "excluidos": 0, "motivos": [] }, "fuente": { "motor": "E2.6 monthlyFlow", "ids": [], "revisiones": [] }, "contexto": { "tipo": "ciclo", "cicloId": "C007", "corte": "2026-07-19" }, "enlace": { "ruta": "/flujo-mensual?ciclo=C007", "ids": [] } },
      "gasto": { "clave": "gasto", "etiqueta": "Gasto bruto", "clase": "real", "valor": "1800.00", "subtotal": null, "estado": "Verificado", "unidad": "EUR", "motivo": "", "cobertura": { "estado": "Completa", "incluidos": 1, "excluidos": 0, "motivos": [] }, "fuente": { "motor": "E2.6 monthlyFlow", "ids": [], "revisiones": [] }, "contexto": { "tipo": "ciclo", "cicloId": "C007", "corte": "2026-07-19" }, "enlace": { "ruta": "/flujo-mensual?ciclo=C007", "ids": [] } },
      "extraordinaria": { "clave": "extraordinaria", "etiqueta": "Amortización extraordinaria", "clase": "real", "valor": "100.00", "subtotal": null, "estado": "Verificado", "unidad": "EUR", "motivo": "", "cobertura": { "estado": "Completa", "incluidos": 1, "excluidos": 0, "motivos": [] }, "fuente": { "motor": "E2.6 monthlyFlow", "ids": [], "revisiones": [] }, "contexto": { "tipo": "ciclo", "cicloId": "C007", "corte": "2026-07-19" }, "enlace": { "ruta": "/flujo-mensual?ciclo=C007", "ids": [] } },
      "operativo": { "clave": "operativo", "etiqueta": "Saldo operativo bruto observado", "clase": "real", "valor": "350.00", "subtotal": null, "estado": "Parcial", "unidad": "EUR", "motivo": "Definición parcial: no es ahorro real ni variación patrimonial", "cobertura": { "estado": "Parcial", "incluidos": 3, "excluidos": 0, "motivos": [] }, "fuente": { "motor": "E2.6 monthlyFlow", "ids": [], "revisiones": [] }, "contexto": { "tipo": "ciclo", "cicloId": "C007", "corte": "2026-07-19" }, "enlace": { "ruta": "/flujo-mensual?ciclo=C007", "ids": [] } },
      "margenReal": { "clave": "margenReal", "etiqueta": "Margen frente a nómina real", "clase": "plan", "valor": "100.00", "subtotal": null, "estado": "Verificado", "unidad": "EUR", "motivo": "Margen del plan, no ahorro ejecutado", "cobertura": { "estado": "Completa", "incluidos": 4, "excluidos": 0, "motivos": [] }, "fuente": { "motor": "E2.6 monthlyFlow", "ids": [], "revisiones": [] }, "contexto": { "tipo": "ciclo", "cicloId": "C007", "corte": "2026-07-19" }, "enlace": { "ruta": "/flujo-mensual?ciclo=C007", "ids": [] } }
    },
    "saldos": {
      "contexto": { "tipo": "actual" },
      "conteos": { "liquidez": 3, "ahorro": 1, "bolsas": 1 },
      "items": [
        { "id": "S001", "nombre": "Cuenta demo", "estado": "Activa", "posicion": "1200.00", "liquidez": true, "finalidad": null, "bolsa": false },
        { "id": "S002", "nombre": "Ahorro demo", "estado": "Activa", "posicion": "800.00", "liquidez": true, "finalidad": "Ahorro", "bolsa": false },
        { "id": "S003", "nombre": "Efectivo inversión demo", "estado": "Activa", "posicion": "1456.40", "liquidez": true, "finalidad": "Inversión", "bolsa": false },
        { "id": "S004", "nombre": "Cartera demo", "estado": "Activa", "posicion": "500.00", "liquidez": false, "finalidad": "Inversión", "bolsa": false },
        { "id": "S005", "nombre": "Cuenta sin marcar", "estado": "Activa", "posicion": "250.00", "liquidez": null, "finalidad": null, "bolsa": true },
        { "id": "S006", "nombre": "Cuenta inactiva", "estado": "Inactiva", "posicion": "999.00", "liquidez": true, "finalidad": null, "bolsa": false }
      ],
      "cobertura": { "estado": "Parcial", "incluidos": 5, "excluidos": 1, "motivos": ["S006: Saldo inactivo"] }
    },
    "ahorro": {
      "contexto": { "tipo": "actual" },
      "posiciones": [
        { "id": "S002", "nombre": "Ahorro demo", "valor": "800.00", "estado": "Verificado" }
      ],
      "ahorroCierre": { "estado": "No disponible", "valor": null, "motivo": "Sin proveedor de posiciones de ahorro al corte" },
      "variacionAhorro": { "estado": "No disponible", "valor": null, "motivo": "Faltan posiciones verificables en dos cortes consecutivos" }
    },
    "inversion": {
      "contexto": { "tipo": "corte", "corte": "2026-07-19" },
      "agregado": {
        "coberturaValoracion": "Completa",
        "valorEur": "1197.50",
        "coberturaResultado": "Parcial 1/2",
        "resultadoEur": null,
        "elegibilidadFechaExacta": "No evaluada por E4.6"
      },
      "posiciones": [
        { "instrumento": "I1001", "nombre": "Fondo índice demo", "cantidad": "7.5", "estado": "Abierta", "tipoValoracion": "Automática", "valorEur": "877.50", "resultadoEur": "258.50", "fechaValoracion": "2026-07-19" },
        { "instrumento": "I1002", "nombre": "Acción demo", "cantidad": "2", "estado": "Abierta", "tipoValoracion": "Manual", "valorEur": "320.00", "resultadoEur": null, "fechaValoracion": "2026-07-19" }
      ],
      "efectivo": [
        { "saldo": "S003", "nombre": "Efectivo inversión demo", "disponible": "1456.40", "fecha": "2026-07-19" },
        { "saldo": "S004", "nombre": "Cartera demo", "disponible": "500.00", "fecha": "2026-07-19" }
      ],
      "cobertura": { "estado": "Parcial", "incluidos": 2, "excluidos": 0, "motivos": ["Resultado no disponible para valoración manual"] }
    },
    "deudaNoHipotecaria": {
      "contexto": { "tipo": "actual" },
      "items": [
        { "id": "D001", "nombre": "Préstamo demo", "tipoDeuda": "No hipotecaria", "estado": "Activa", "capitalPendiente": "720.00", "calculable": true },
        { "id": "D002", "nombre": "Financiación demo", "tipoDeuda": "No hipotecaria", "estado": "Activa", "capitalPendiente": "300.00", "calculable": true },
        { "id": "D005", "nombre": "Deuda incompleta demo", "tipoDeuda": "No hipotecaria", "estado": "Activa", "capitalPendiente": null, "calculable": false, "motivo": "Desglose de un movimiento aplicable no verificable" }
      ],
      "total": {
        "valor": null,
        "subtotal": "1020.00",
        "estado": "Parcial",
        "cobertura": { "estado": "Parcial", "incluidos": 2, "excluidos": 1, "motivos": ["D005 no calculable"] }
      },
      "aparte": {
        "hipotecaria": [{ "id": "D003", "capitalPendiente": "50000.00" }],
        "sinInformar": [{ "id": "D004", "capitalPendiente": "100.00" }]
      }
    },
    "pendientes": {
      "contexto": { "tipo": "actual" },
      "metrica": { "clave": "pendientes", "etiqueta": "Pendientes", "clase": "informativo", "valor": null, "estado": "No disponible", "unidad": "EUR", "motivo": "Consumo E4.6 no implementado; E3.6 disponible en la base", "cobertura": { "estado": "No disponible", "incluidos": 0, "excluidos": 0, "motivos": [] }, "fuente": { "motor": "E3.6", "ids": [], "revisiones": [] }, "contexto": { "tipo": "actual" }, "enlace": null },
      "items": [],
      "conteo": null
    }
  },
  "pendientesDelModelo": [
    "E4.3 valoración/resultado",
    "E3.6 pendientes/conciliación (integración E4.6 pendiente)",
    "Configuración R6 de meses objetivo y umbrales (solo mínimo objetivo; meses cubiertos no depende)"
  ]
}
```

Campos derivados que el cliente **no** puede escribir: todos. El endpoint es solo GET.

### Estados de cobertura

| Estado | Condición | Presentación |
| --- | --- | --- |
| `Verificado` | Motor, contexto y todas las fuentes de esa métrica acotada disponibles | Importe + fuente + contexto |
| `Cero verificado` | Universo verificado sin importes distintos de 0, o resultado exactamente 0 | `0,00 €` explícito, no ausencia |
| `Parcial` | Subtotal comprobable con fuentes o pertenencia incompletas; o métrica parcial por definición | Etiqueta `PARCIAL`, incluidos/excluidos, subtotal y motivo |
| `No disponible` | Falta motor, dato, contexto o cálculo material | Sin cifra; motivo y fuente; componentes conocidos aparte |
| `No aplica` | La magnitud no existe por diseño (p. ej. un total de efectivo del bróker) | Texto `No aplica`, nunca `0` |
| `Sin datos` | Universo verificado y vacío (sin Saldos, sin deudas, sin plan) | Texto explícito; no confundir con `No disponible` |

## Screens and interfaces

**UX APROBADA documentalmente; la revisión visual de implementación conserva su gate.** Reutiliza
shell, tipografía, tokens y componentes existentes; no introduce tema, librería ni tokens nuevos.

### 1440 px — dashboard

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ INICIO · Resumen financiero                                                                  │
│ Ciclo financiado C007 · inicio 20/06/2026 · corte 19/07/2026 · Referencia 19/07 (disponible)   │
│ Solo lectura · [Cómo se calcula y qué falta]                                                 │
├───────────────────────────────────────────────┬──────────────────────────────────────────────┤
│ LIQUIDEZ                            POSICIÓN  │ OBJETIVO R6                         OBJETIVO │
│ Subtotal conocido 3.456,40 €        ! PARCIAL │ Coste esencial/mes 1.500,00 €      ✓ Completo│
│ 3/4 posiciones · 1 sin informar               │ Meses objetivo: No configurados    — ND      │
│ [Ver posiciones incluidas/excluidas]          │ Mínimo objetivo: No disponible              │
│                                               │ Meses cubiertos: ND · liquidez parcial      │
│                                               │ Zona informativa · sin transferencia        │
├───────────────────────────────────────────────┴──────────────────────────────────────────────┤
│ CICLO C007 · REAL vs PLAN                                                                    │
│ Ingresos 2.250,00 € REAL · Gasto bruto 1.800,00 € REAL · Extraordinaria 100,00 € REAL        │
│ Saldo operativo 350,00 € ! PARCIAL — no es ahorro real ni variación patrimonial              │
│ Margen frente a nómina 100,00 € PLAN · [Ver flujo mensual]                                   │
├──────────────────┬──────────────────┬──────────────────┬─────────────────────────────────────┤
│ SALDOS Y BOLSAS  │ AHORRO           │ INVERSIÓN        │ DEUDA NO HIPOTECARIA                │
│ 6 Saldos         │ Posición S002    │ Posiciones       │ 2/3 calculables                     │
│ Liquidez 3       │ 800,00 €         │ 1.197,50 €       │ Subtotal 1.020,00 €  ! PARCIAL      │
│ Ahorro 1         │ Ahorro cierre ND │ Efectivo S003    │ Hipotecaria: aparte                 │
│ Bolsas 1         │ Variación ND     │ 1.456,40 €       │ Sin informar: aparte                │
│ [Ver Saldos]     │ [Ver Saldos]     │ [Ver Inversión]  │ [Ver Deudas]                        │
├──────────────────┴──────────────────┴──────────────────┴─────────────────────────────────────┤
│ PENDIENTES (E3.6) — No disponible: consumo E4.6 no implementado. Sin conteo 0. [Ver cobertura] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 390 px — tarjetas apiladas

```text
┌─────────────────────────────┐
│ INICIO                      │
│ Ciclo C007                  │
│ 20/06–19/07 · Corte 19/07   │
│ Solo lectura                │
├─────────────────────────────┤
│ LIQUIDEZ          POSICIÓN  │
│ 3.456,40 €        ! PARCIAL │
│ 3/4 posiciones              │
│ Motivo: 1 sin informar      │
│ [Ver posiciones]            │
├─────────────────────────────┤
│ OBJETIVO R6       OBJETIVO  │
│ Mínimo: No disponible  — ND │
│ Meses cubiertos: ND         │
│ Motivo: liquidez parcial    │
│ [Ver coste esencial]        │
├─────────────────────────────┤
│ CICLO C007    REAL / PLAN   │
│ Ingresos 2.250,00 €  REAL   │
│ Gasto bruto 1.800,00 € REAL │
│ Saldo operativo 350,00 €    │
│ ! PARCIAL                   │
│ [Ver flujo mensual]         │
├─────────────────────────────┤
│ INVERSIÓN        POSICIÓN   │
│ Posiciones 1.197,50 €       │
│ Efectivo S003 1.456,40 €    │
│ Efectivo S004 500,00 €      │
│ Sin total combinado         │
│ [Ver Inversión]             │
└─────────────────────────────┘
```

### Secciones, orden y navegación

1. **Contexto** (cabecera): ciclo, fechas, corte, referencia y estado de cobertura general.
2. **Liquidez y objetivo** (primera fila): la lectura principal de R6.
3. **Ciclo actual** (ancho completo): real vs plan, con la etiqueta `PARCIAL` del saldo
   operativo siempre visible.
4. **Saldos/bolsas, Ahorro, Inversión, Deuda no hipotecaria** (cuatro bloques en 1440;
   apilados en 390). Cada bloque declara su contexto y no se suman entre sí.
5. **Pendientes** y **cobertura del modelo**: motores ausentes, parcialidad y enlaces.

- Nueva entrada de navegación **Inicio** al principio de «MI ESPACIO»; ruta propuesta
  `/inicio`. `/` puede redirigir a `/inicio` conservando `/saldos` como listado. **[PENDIENTE
  Q1/DT8]**
- Los botones `[Ver …]` son enlaces reales a módulos existentes; el detalle de IDs se expande
  en la propia página, sin crear filtros nuevos en otros módulos.
- Mapa de drill-down: liquidez/Saldos/Ahorro → `/saldos` y `/saldos/{id}`; ciclo →
  `/flujo-mensual?ciclo={id}`; inversión → `/inversiones` y ficha de Saldo; deuda →
  `/deudas` y `/deudas/{id}`; pendientes → `/pendientes` (vista E3.6).
- Volver conserva el ciclo y el contexto; no se usa `localStorage` para datos financieros.

### Diferenciación semántica visible

| Clase | Etiqueta textual | Tratamiento visual | Nunca |
| --- | --- | --- | --- |
| `real` | `REAL` + fuente `Movimientos` | Tarjeta con borde sólido; importe principal | Presentarlo como planificación |
| `plan` | `PLAN` + fuente `Plan del ciclo` | Tarjeta con borde discontinuo y fondo suave | Presentarlo como ejecutado |
| `posicion` | `POSICIÓN` + fecha/contexto | Importe con fecha de soporte | Presentarlo como flujo del ciclo |
| `objetivo` | `OBJETIVO` + `Informativo` | Tarjeta con nota «no genera transferencias» | Sugerir una acción automática |
| `informativo` | `INFORMATIVO` | Texto secundario; sin total | Restarlo de liquidez o gasto |
| `Parcial` | `! PARCIAL n/m` | Icono+texto ámbar; motivo visible | Ocultar el subtotal o llamarlo total |
| `No disponible` | `— NO DISPONIBLE` | Icono+texto gris; sin cifra | Mostrar `0` o un guion ambiguo |

El color nunca es el único portador del estado. Los importes se formatean `1.234,56 €` con
signo `−` para negativos; los meses, con 2 decimales propuestos y marca `meses`.

### Accesibilidad

- Un solo `h1` («Inicio»), `h2` por sección y `h3` por métrica; listas de definición para
  etiqueta/importe/estado.
- Orden de foco: cabecera → liquidez → objetivo → ciclo → bloques → pendientes → cobertura.
- Enlaces y botones con nombre accesible; foco visible con el token existente; objetivos
  táctiles de al menos 44 px en 390.
- Estado con icono **y** texto (`✓`, `!`, `—`), no solo color; contraste comprobado en la
  implementación, sin declarar WCAG completo por esta spec.
- Sin tooltip como único soporte de un motivo; el motivo se muestra en texto o en un
  `details` expandible.
- Sin scroll horizontal a 390; tablas de 1440 se convierten en tarjetas.

## Empty, loading and error states

| Estado | Comportamiento observable |
| --- | --- |
| Sin ciclos | Cabecera «Sin ciclo actual»; ciclo, márgenes y valoración `No disponible` con motivo; Liquidez/Saldos/Deuda actuales visibles y etiquetados |
| Sin referencia o corte | No se inventa fecha; métricas ligadas al corte `No disponible`; el resto conserva su contexto |
| Cargando | Esqueletos sin cifras; se conserva el contexto; no se muestran totales provisionales |
| Vacío verificado | «Sin Saldos», «Sin deudas no hipotecarias», «Sin plan anual» o «Sin pendientes»; no `0` ni `No disponible` |
| Parcial | `PARCIAL n/m`, incluidos/excluidos y subtotal; sin total definitivo |
| No disponible | Sin cifra, motivo y motor; componentes conocidos aparte |
| Cero verificado | `0,00 €` con etiqueta `Cero verificado` |
| Error de una fuente | Aviso en esa sección con reintento; las demás secciones no se borran ni se convierten en 0 |
| Error de todas las fuentes | Estado de error global con reintento; sin cifras parciales presentadas como definitivas |
| Respuesta antigua | Se descarta; se conserva la selección y se marca la recarga |
| Sesión expirada | Se conserva el contexto y se pide reautenticación; no se muestran importes |

## API behavior and external dependencies

**Contrato de lectura aprobado documentalmente; sin implementación.** `GET /api/resumen-inicio`
— solo lectura, autenticada con la sesión MFA existente y el mismo guard que las rutas
financieras.

| Aspecto | Contrato |
| --- | --- |
| Método | Solo `GET`; otros métodos → `405` sin escritura |
| Parámetros | Ninguno en v1; el ciclo sale del contexto central, no de la URL |
| Respuesta | `200` con el DTO anterior; `401` sin sesión; `500` genérico con `requestId` |
| Cache | `no-store` y cabeceras de seguridad existentes |
| Snapshot | Una transacción SQLite; `revision` de la composición |
| Fallos por fuente | Sección `No disponible`/`Parcial`; no se propaga un `500` por una fuente |
| Datos sensibles | Sin SQL, sin payload bancario, sin importes en logs ni en URL |
| Escrituras | Ninguna; sin idempotencia, sin endpoints auxiliares |

Dependencias externas: **ninguna**. No hay cotizaciones, bancos, FX ni servicios de terceros.

## Validation and edge cases

- Importes EUR exactos de extremo a extremo (céntimos enteros / decimal exacto); sin `float`,
  sin redondeo intermedio y con formato final una sola vez.
- `null` != `0`; un `0` solo es válido si la fuente y la cobertura lo verifican.
- Fechas civiles ISO; el corte no es futuro y no se sustituye por el reloj.
- El ciclo se selecciona por el contrato central; un ciclo histórico no se convierte en
  «actual».
- Un Saldo inactivo no entra en liquidez; un Saldo con `Liquidez` ausente se excluye con
  motivo y no se normaliza a `false`.
- Un Saldo puede pertenecer a varias vistas; no se suma entre vistas.
- Un agregado de inversión parcial no publica total; el efectivo nunca entra en el agregado.
- Una deuda no calculable no se sustituye por 0; el total queda parcial o no disponible.
- Si el consumo E3.6 no está disponible, no se produce conteo 0 ni enlace inventado.
- Un cambio de fuente entre la carga y el reintento no mezcla revisiones; se vuelve a leer.
- La respuesta no se pagina ni trunca listas que afecten a un total; si una lista es larga,
  se muestran los IDs y un enlace, sin truncar el agregado.

## Exclusions

- Implementación de E4.6, endpoints, UI, DDL, migración o datos reales por esta spec.
- Cálculo de liquidez, flujo, valoración, resultado, deuda, pendientes o coste esencial:
  pertenecen a sus motores.
- Patrimonio global, «neto patrimonial», suma de bloques o comparación anual (E4.7).
- Cierres, fotos, reaperturas, precierre, protección transversal o snapshots (E4.8–E4.11).
- Cotizaciones externas, dividendos, impuestos, splits, FIFO o rentabilidad.
- Configuración de meses objetivo/umbrales y cualquier tabla nueva.
- Notificaciones, transferencias automáticas, reservas o recomendaciones operativas.
- Migración o equivalencia con el Excel; datos personales o bases reales.

## Acceptance checks

Diseñados y **aprobados documentalmente**, NO ejecutados. La numeración es estable; el mapeo al
roadmap se indica después de la tabla.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-01 | Abrir el inicio con la fixture integrada | Cada cifra visible declara `fuente.motor`, IDs y contexto; ninguna cifra se calcula en el cliente |
| AC-02 | Comparar cada cifra con la respuesta del motor propietario al mismo contexto | Igualdad exacta al céntimo: E2.6 liquidez/ciclo, E2.4 coste esencial, E4.4 deuda, E4.3 agregado, E4.2 efectivo |
| AC-03 | `GET /api/resumen-inicio` antes/después | Sin cambios en hechos, planes, deudas, Saldos, ciclos, operaciones, auditoría ni `schema_version`; no hay métodos de escritura |
| AC-04 | Modificar un hecho de una fuente y recargar | Cambia la sección afectada y su `revision`; las demás conservan su valor; sin mezcla de revisiones |
| AC-05 | Fuente con una posición no verificable | Sección `Parcial` con incluidos/excluidos, subtotal y motivo; sin total definitivo |
| AC-06 | Motor ausente o error de fuente | `No disponible` con motivo y nombre del motor; no `0`, no omisión silenciosa |
| AC-07 | Motor devuelve `null` frente a `0.00` verificado | `null` se muestra `No disponible`; `0.00` se muestra `0,00 €` con `Cero verificado` |
| AC-08 | Cambiar el reloj del sistema y recargar | Ciclo, corte, referencia y cifras no cambian; no se usa la fecha de consulta como fuente |
| AC-09 | Activar cada enlace de drill-down y volver | Abre el módulo/ficha con el ID correcto; al volver se conserva el ciclo; la URL no contiene importes |
| AC-10 | Buscar un total patrimonial o una suma cruzada de bloques | No existe en la respuesta ni en la UI; cada bloque conserva su contexto |
| AC-11 | Cambiar Finalidad, bolsa o nombre de un Saldo | La pertenencia a Liquidez no cambia; solo cambia cuando cambia `Liquidez` |
| AC-12 | Coste esencial completo 1.500,00 € y 6 meses objetivo (proveedor aprobado) | Mínimo objetivo `9.000,00 €` exacto; sin redondeo intermedio |
| AC-13 | Liquidez completa 3.456,40 € y coste esencial completo 1.500,00 €, sin meses objetivo | `mesesCubiertos` 2,30 (racional exacto 345640/150000) visible; `minimoObjetivo` `No disponible`; nunca 0, infinito o total |
| AC-14 | Plan anual `Incompleto` o `Sin plan anual` | Coste no verificado; `minimoObjetivo` y `mesesCubiertos` `No disponible`; subtotal conocido visible; sin objetivo definitivo |
| AC-15 | Sin meses objetivo/umbrales configurados | `minimoObjetivo` `No disponible` con motivo; `mesesCubiertos` se rige por AC-13/16 y puede mostrarse; zona informativa; ningún botón, endpoint o efecto de transferencia |
| AC-16 | Liquidez parcial, coste incompleto o coste 0 | `mesesCubiertos` `No disponible` por su propio motivo; subtotal visible cuando aplique; no se divide el subtotal; nunca 0/infinito |
| AC-17 | Sin ciclo actual o sin corte | Métricas del ciclo y valoración `No disponible` con motivo; bloques actuales visibles y etiquetados; sin reloj |
| AC-18 | Fixture con posición valorada 1.197,50 € y efectivo S003 1.456,40 € | El efectivo no está dentro del agregado ni se publica un «total inversión» |
| AC-19 | Saldo marcado a la vez Liquidez, Ahorro y bolsa | Aparece en las tres vistas, pero no en una suma combinada; no hay total de saldos |
| AC-20 | Cambiar la cobertura de Presupuesto | Liquidez, ahorro y disponible no cambian; no se resta lo presupuestado ni se crea reserva exclusiva |
| AC-21 | Añadir o modificar deuda | No cambia liquidez, gasto, saldo operativo ni resultado; el bloque es informativo |
| AC-22 | Cuota ordinaria y amortización extraordinaria | Cuota dentro del Gasto bruto una vez; extraordinaria separada; sin segunda resta |
| AC-23 | E3.6 con pendientes de varios tipos | Se listan y enlazan por tipo/estado; no se suman a ingresos/gasto/operativo ni a un total monetario |
| AC-24 | Posición con valoración manual | Valor visible; resultado y rentabilidad `No disponible`; el inicio no los deriva |
| AC-25 | Agregado de inversión parcial y deuda con un no calculable | `Parcial n/m` sin total; deuda con subtotal conocido y motivo; sin ceros sustitutivos |
| AC-26 | 1440 y 390 con teclado, foco y estados | Sin scroll horizontal; estado con icono+texto; foco visible; capturas 390/1440 inspeccionadas |
| AC-27 | Acceso anónimo, sesión expirada y error de servidor | `401`/reautenticación sin datos; errores genéricos sin SQL ni importes; respuesta `no-store` |
| AC-28 | Ciclo con `mesFinanciado` 2026-12 y corte 2027-01; planes anuales 2026 y 2027 | `costeEsencialMensual` se consulta en el plan de 2026; no se usan 2027, el reloj, el corte ni el año del ingreso |
| AC-29 | Liquidez cero verificada y coste esencial completo > 0 | `mesesCubiertos` `0,00` con `Cero verificado`; no `No disponible` ni un 0 implícito |

### Trazabilidad al roadmap

| Criterio roadmap | Checks |
| --- | --- |
| E4.6-AC1 — cada cifra procede de un motor central identificado | AC-01 a AC-10 |
| E4.6-AC2 — Liquidez y objetivos usan R6, sin transferencia por zona informativa | AC-11 a AC-17, AC-28 y AC-29 |
| E4.6-AC3 — inversiones sin efectivo dos veces; cobertura de Presupuesto sin reserva exclusiva | AC-18 a AC-25 |
| Transversal T-UX/T-SEG | AC-26 y AC-27 |

## Approval and next action

**APROBADA documentalmente por el usuario el 2026-11-03** (Q1–Q12, opción A; Q3-B=A; Q4=A).
La aprobación no autoriza DEV24, DDL, migración, merge ni despliegue, y **ningún AC está en
PASS**. Q3-B=A mantiene E4.6 sin almacén de meses objetivo/umbrales. Para declarar completa la
entrega siguen aplicando las dependencias del roadmap: E4.3 no tiene DEV; E3.6/DEV21 está
integrado en `a26fffb`, sin reauditoría de su consumo en esta actualización. El siguiente gate
es la autorización separada de DEV por el coordinador.
