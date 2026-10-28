# 26 — E4.8 Precierre y controles de consistencia: Specification

Status: **DRAFT — borrador documental; no aprobada.**
Approval source/date: **PENDIENTE**. Decisiones M1–M6 confirmadas por el usuario el 2026-10-28; DT3/DT4/DT6 abiertos.
Context and brainstorming: [26-e48-precierre-brainstorming.md](26-e48-precierre-brainstorming.md),
[inventario DT5](investigations/dt5-write-impact-inventory.md),
[propuesta E4.8/E4.9](investigations/dt5-e48-e49-specification-proposal.md),
[E4.8](roadmap.md#e48--revisión-de-precierre-y-controles-de-consistencia).
Base: `main` `f077b7e`, esquema 18.

## Functionality

E4.8 permite revisar un ciclo antes de cerrarlo. Es una capacidad **de solo lectura**: no
crea, modifica ni elimina hechos, no altera S0, no cambia la ventana, no crea el cierre ni
crea el ciclo siguiente.

Incluye:

- ventana financiera, S0 y estado del ciclo;
- Movimientos del ciclo y su clasificación/Referencias;
- plan final o `SinPlan`, y presupuestos;
- Anticipos, Compartidos, Revisión Comida, Deuda E1.6 y Nómina si hay hechos;
- E4.1 Instrumentos/Compras/efectivo/posiciones;
- E4.5 histórico/precontrol y E3.6 pendientes/conciliación como fuentes de solo lectura,
  si están disponibles;
- cobertura, diferencias, bloqueos, avisos y evidencia de backup preflight.

No incluye: valoración/resultado/patrimonio E4.3, Comida E3.5/FIN_NETA, Ventas E4.2,
conciliaciones E4.4, escritura, cierre, foto, reapertura ni cálculo de patrimonio no
disponible.

## Data model and contracts

No se crea tabla ni migración en E4.8. El precierre es una lectura derivada.

### Ventana y estados

- `ciclo`: identidad existente; `inicio` y `fin` finitos y acreditados.
- Si existe siguiente Inicio, `fin = día anterior` según la derivación vigente.
- Si no existe siguiente Inicio, no se inventa `fin`: estado `Bloqueado` con motivo
  `DT3_PENDIENTE`.
- `S0`: `saldo_comida` del ciclo; su ausencia bloquea.

### Fuentes y cobertura

| Fuente | Estado esperado | Efecto |
| --- | --- | --- |
| Movimientos, clasificación, Referencias | Implementado | Núcleo; inconsistencia estructural bloquea |
| Plan de Ciclo/Anual, Presupuestos | Implementado | `SinPlan` válido; `PlanNoVerificable` bloquea |
| Anticipos, Compartidos, Nómina, Revisión Comida, Deuda E1.6 | Implementado | Se capturan si hay hechos |
| E4.1 Inversión | Integrado `156a50d` | Instrumentos, Compras, efectivo, cantidades y posiciones |
| E4.3 valoración/resultado/patrimonio | No implementado | `No disponible`; aviso, no cero |
| E3.5 Comida/FIN_NETA | No implementado | `No disponible`; aviso/parcial |
| E4.2 Ventas | Documental; sin DEV | `No disponible`; aviso/parcial |
| E4.4 Deuda completa/conciliaciones | Documental en revisión; sin código | `No disponible`; Deuda E1.6 sí |
| E4.5 Histórico y E3.6 Pendientes | Documental; sin código | Solo lectura; no escritura |

### Inversión a fecha Fin

El precierre calcula efectivo con `cashAt(..., fin)` y posiciones con
`positionsFor(..., fin)`. Incluye operaciones anteriores al ciclo y excluye las
posteriores a `fin`; un ciclo sin Compras nuevas no es una inversión vacía si existen
posiciones anteriores. La valoración, resultado y patrimonio E4.3 siguen `No disponible`.

### Plan

- **`SinPlan`:** no existen líneas; es un estado válido y no bloquea el precierre.
- **`PlanVerificado`:** líneas presentes y consistentes; se capturan.
- **`PlanNoVerificable`:** líneas presentes pero fuente/revisión inconsistente, duplicada
  o no verificable; bloquea el cierre.
- **`SinPlanificar`:** ejecución real sin línea; aviso independiente, no «Sin plan».

### Comida E3.5

E4.8 puede mostrar precierre parcial con motivo mientras E3.5/FIN_NETA no esté integrado.
E4.9 no puede cerrar con Comida `No disponible`; el cierre queda bloqueado hasta que E3.5
sea verificable. No se admite cierre parcial anticipado ni re-cierre como sustituto.

### Backup preflight

E4.8 no ejecuta el cierre. Verifica que exista evidencia DT6/T-BKP recuperable:
manifiesto, checksum, clave disponible y prueba de restauración efectiva. Sin evidencia,
el resultado es `Bloqueado`; no se sustituye por un checkbox.

## Screens and interfaces

Wireframes pendientes de aprobación. La interfaz prevista:

- selector de ciclo y contexto;
- panel de ventana/S0/estado;
- tablas o tarjetas por fuente con cobertura y motivo;
- lista de bloqueos y avisos;
- enlaces a Movimientos, plan, auxiliares y casos;
- botón de cierre **no disponible** en E4.8.

La UI no muestra `0` por ausencia. Distingue `No disponible`, `Parcial`, `Bloqueado` y
`Listo con avisos`.

## Empty, loading and error states

- **Vacío:** ciclo sin hechos en una fuente capturable; se muestra vacío explícito, no 0.
- **Carga:** conserva filtros y ciclo; no muestra cifras provisionales.
- **Error de fuente:** conserva identidad y hechos conocidos; declara la cifra no
  verificable y ofrece reintento.
- **Bloqueado:** motivo y acción segura; no permite cerrar.
- **Sesión expirada:** conserva el contexto y exige reautenticación.

## API behavior and external dependencies

Contrato conceptual de solo lectura:

- `GET /api/cierres/precierre/:ciclo` — resumen, fuentes, cobertura, bloqueos, avisos,
  revisión/hash y evidencia de backup.
- `GET /api/cierres/:ciclo/estado` — estado y versión; sin escritura. Ruta canónica
  compartida con SPEC27.
- Cualquier `POST/PATCH/DELETE` en E4.8 devuelve 405/422; no hay cierre ni mutación.

Sin servicios externos, importadores ni acceso a datos reales. El backup se lee como
evidencia DT6/T-BKP, no se ejecuta desde este endpoint.

## Validation and edge cases

- Ventana no finita o sin S0 → `Bloqueado`; no se inventa fecha ni S0.
- `SinPlan` → válido; no bloquea ni inventa líneas. `PlanNoVerificable` → `Bloqueado`.
- Inconsistencia estructural en Movimientos/clasificación/Referencias → `Bloqueado`.
- E4.1 no disponible → `Bloqueado` para el núcleo de inversión; un ciclo sin inversiones
  nuevas pero con posiciones anteriores muestra posición a Fin, no vacío.
- E4.3/E4.2/E4.4 no disponibles → aviso/parcial; no bloqueo por sí solo.
- E3.5/FIN_NETA no disponible → precierre parcial con motivo; E4.9 bloqueado, sin foto.
- Backup no verificable → `Bloqueado`.
- Cambio entre preview y confirmación → 409; E4.8 no confirma.
- Cualquier intento de escritura, cierre o creación del ciclo siguiente → rechazo.
- La vista no altera S0 ni la ventana.

## Exclusions

- No crear cierre, foto, reapertura, versión ni ciclo siguiente.
- No calcular E4.3, E3.5/FIN_NETA, E4.2 ni E4.4.
- No duplicar motores de Comida, inversión o conciliación.
- No habilitar cierre parcial anticipado por E3.5/FIN_NETA no disponible.
- No cerrar DT3, DT4 ni DT6.
- No escribir en tablas, código, migraciones ni endpoints de mutación.

## Acceptance checks

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| AC-01 | Ciclo con siguiente Inicio y S0; abrir precierre | Ventana finita, S0 visible y `Listo`/`Listo con avisos`; sin escritura |
| AC-02 | Ciclo sin siguiente Inicio; abrir precierre | `Bloqueado` con `DT3_PENDIENTE`; no se inventa Fin ni fecha |
| AC-03 | Ciclo sin S0 | `Bloqueado`; no se crea S0 |
| AC-04 | Movimientos/clasificación/Referencias inconsistentes | `Bloqueado`; no se corrige ni escribe |
| AC-05 | Ciclo con posiciones E4.1, incluidas operaciones anteriores | Instrumentos, Compras, efectivo y posiciones a Fin visibles; valoración/patrimonio `No disponible` |
| AC-06 | Ciclo sin Compras nuevas pero con posiciones anteriores; después sin ninguna operación histórica | Con posiciones: posición acumulada a Fin, no vacío ni 0; sin operaciones: vacío explícito; no bloqueo automático |
| AC-07 | E4.3/E4.2/E4.4 no disponibles | Aviso/parcial con motivo; no cero y no bloqueo por sí solo |
| AC-08 | Backup sin evidencia DT6/T-BKP | `Bloqueado`; no se permite cerrar |
| AC-09 | Intentar POST/PATCH/DELETE en precierre | 405/422; sin escritura |
| AC-10 | Abrir precierre y comprobar S0/ventana | No se alteran; no se crea ciclo siguiente ni cierre |
| AC-11 | Cambiar fuente entre preview y lectura | Revisión/hash cambia; se declara `IMPACT_CHANGED`/409 si se intenta confirmar |
| AC-12 | Ciclo `SinPlan` | No bloquea; muestra `Sin plan`; no inventa líneas |
| AC-13 | Plan con líneas inconsistentes, duplicadas o no verificables | `Bloqueado`; motivo; no se captura plan |
| AC-14 | E3.5/FIN_NETA no disponible | Precierre parcial con motivo; E4.9 queda bloqueado; no se presenta como completo |
| AC-15 | Consultar estado por `GET /api/cierres/:ciclo/estado` | Ruta canónica compartida con SPEC27; misma versión/estado; solo lectura |
