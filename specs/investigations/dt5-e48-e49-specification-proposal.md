# Propuesta de especificación — E4.8 Precierre y E4.9 Cierre financiero

**Status: PROPUESTA DOCUMENTAL — NO APROBADA, NO ES SPEC26/27, NO AUTORIZA DEV.**
Este documento traduce las decisiones M1–M6 y la reauditoría DT5 en un contrato
candidato para E4.8/E4.9. No implementa tablas, endpoints, locks ni fotos.

**Actualización 2026-10-28:** DT3 y DT4 quedaron resueltas en SPEC26/SPEC27; este
documento conserva valor histórico. DT6/T-BKP sigue abierto.

- Fecha: 2026-10-28.
- Base: `main` `f077b7e84684d9ccf79ed16805f9e8172e7576de` (`f077b7e`), esquema 18.
- Inventario de soporte: `specs/investigations/dt5-write-impact-inventory.md`.
- Decisiones incorporadas: M1–M6 (Q2 A reforzada sin `ciclo_id`; T1/T2/T3; núcleo
  y parciales con E4.1; backup preflight; fingerprint propio; identidad histórica
  vs etiquetas).
- Gates abiertos: **DT3** (ventana/corte del último ciclo), **DT4** (contenido,
  metadatos y versiones de la foto) y **DT6/T-BKP** (backup recuperable y
  restauración efectiva). No se cierran aquí.

## 1. Alcance y límites

### 1.1 E4.8 — Precierre

**Capacidad propuesta:** revisar un ciclo antes de cerrarlo, mostrando fuentes,
cobertura, diferencias, bloqueos y avisos, sin alterar S0, sin crear el cierre y sin
modificar hechos.

**Incluye:** lectura consolidada de ciclo, Movimientos, plan final (`SinPlan` o líneas),
Presupuestos,
clasificación/Referencias, Anticipos, Compartidos, Revisión Comida, Deuda E1.6,
Inversión E4.1, Nómina, archivo E4.5 (si existe) y pendientes/conciliación E3.6 (si
existe); comprobación de backup; revisión de concurrencia.

**No incluye:** escribir, cerrar, crear fotos, reabrir, corregir S0, crear ciclos,
calcular valoración E4.3, inventar Comida/FIN_NETA, inventar Ventas E4.2 ni
conciliaciones E4.4.

### 1.2 E4.9 — Cierre y primera foto

**Capacidad propuesta:** cerrar manualmente un ciclo con ventana financiera finita,
bloquear escrituras T1, revalidar T2, permitir T3 y persistir una foto inmutable con
los valores capturados.

**Incluye:** transacción de cierre, bloqueo por fecha/ventana, foto de núcleo y
módulos capturados, totales completos/parciales, auditoría, idempotencia, proveedor
de estado de cierre para consumidores y versión inicial para una futura reapertura
E4.10.

**No incluye:** `ciclo_id` en Movimientos, reapertura E4.10, fotos trimestrales/
anuales E4.11, valoración E4.3, Ventas E4.2, conciliaciones E4.4, Comida E3.5 ni
cálculo de patrimonio no disponible.

**E3.5/FIN_NETA:** E4.9 no implementa el motor de Comida. Cuando E3.5 esté integrado y
sea verificable, E4.9 consumirá y capturará sus resultados; no los reimplementa ni los
inventa. Mientras no exista, el cierre E4.9 queda bloqueado.

## 2. Componentes: implementado, documental y futuro

| Componente | Estado en `f077b7e` | Qué aporta a E4.8/E4.9 | Qué no se puede declarar |
| --- | --- | --- | --- |
| Movimientos, Ciclos, Saldos, Clasificación, Referencias | Implementado | Núcleo del ciclo, ventanas, S0, hechos, clasificación | No hay cierre ni lock |
| Anticipos | Implementado; AC36 PARCIAL | Fotos por REF+Ciclo y acreditaciones | Proveedor de Cierres y AC36 completo |
| Compartidos/D5 | Implementado | Fichas, participantes, aportaciones | Guarda de cierre |
| Revisión Comida E3.4 | Implementado | Registros, vínculos, referencia temporal | E3.5/FIN_NETA/CIERRE analítico |
| Deuda E1.6 | Implementado | Deuda, apertura, amortizaciones | E4.4 conciliaciones/condiciones completas |
| Plan de Ciclo/Anual, Presupuestos, Nómina | Implementado | `SinPlan` o líneas, ejecución, atribución | Foto de cierre |
| **E4.1 Inversión** | **Implementado** `156a50d` | Instrumentos, Compras, efectivo, cantidades, posiciones | Ventas E4.2; valoración/resultado/patrimonio E4.3 |
| E4.2 Ventas | Documental aprobado; DEV no iniciado | Futuro: Venta en `operaciones_inversion`, efectivo/posición | No hay código; 45 AC UNRUN |
| E4.3 Valoración/resultados | No implementado | Nada runtime | `No disponible`; no poner cero |
| E3.5 Comida/FIN_NETA | No implementado | Nada runtime | `No disponible`; no implementa motor; E4.9 bloqueado hasta integrarlo |
| E4.4 Deuda completa | Documental **en revisión; no aprobada**; sin código | Futuro: POST/PATCH Deuda y conciliaciones | No hay runtime |
| E4.5 Histórico/precontrol | Documental **aprobada**; sin código | Fuente de solo lectura (GET) | No es escritura que proteger |
| E3.6 Pendientes/conciliación | Documental **aprobada**; sin código | Fuente de solo lectura (GET) | No es escritura que proteger |
| E4.6/E4.7 | Futuro | Consumidores de la foto | No hay código |

Evidencia: E4.1 integrada `156a50d` y v18 (`specs/19-instrumentos-compras-inversion-progress.md:13-15`,
`:40`); SPEC22 (`specs/22-ventas-posicion-broker-specification.md:28-43`); E4.3
`No disponible` (`saldos.ts:112` es condición `pendiente_motor`, no el literal; `movimientos.ts:700`,
`instrumentos.ts:429-431`); E4.4 (`specs/17-e44-deuda-completa-specification.md:180-202`,
`:600-615`); E4.5 (`specs/20-historico-precontrol-specification.md:707-714`);
E3.6 (`specs/21-pendientes-conciliacion-specification.md:54-58`, `:754-763`, `:907`).

## 3. Contrato común

### 3.1 Ventana financiera finita (M1)

- El cierre exige `[inicio, fin]` finitos y acreditados.
- Si existe siguiente Inicio, `fin = día anterior` (derivación actual).
- Si no existe siguiente Inicio, **no se inventa Fin ni fecha manual**: DT3 debe
  definir el corte. Mientras DT3 no esté cerrado, E4.8 muestra `Bloqueado: ventana
  no acreditable` y E4.9 no cierra.
- No se introduce `ciclo_id` en `movimientos`; la membresía sigue derivada por
  fecha y se protege por ventana/fecha cerrada.
- La foto guarda la ventana congelada, aunque el ciclo vivo cambie después.

### 3.2 Clasificación de escrituras T1/T2/T3 (M2)

| Nivel | Escrituras | Comportamiento |
| --- | --- | --- |
| **T1 · Bloqueo financiero** | Movimientos (alta, rectificación, anulación, cambio de fecha), S0, ventana/Fin, Compras/rectificaciones/anulaciones de inversión con fecha en ventana cerrada | 409 `HISTORY_LOCKED`; no escribe |
| **T2 · Revalidación auditada** | Clasificación, Referencias (tipo/identidad), participantes/reparto, Anticipos, Compartidos, Deuda, Presupuestos, plan vivo, Revisión Comida, instrumentos, atributos de Saldo que afectan métricas (liquidez, bolsa, finalidad, estado) | Vista de impacto + motivo + auditoría; foto intacta; vistas vivas actualizadas o marcadas |
| **T3 · Descriptivo permitido** | Notas, evidencias, etiquetas y nombres no usados en cálculos | Permitido; si la foto guarda versión del nombre, no la altera |

Trazabilidad: **Q3 → T1**, **Q9 → T2**, **Q15 → T3**; el detalle de cada fila está en el inventario §8.1.

**Precisión E4.1:** Compras y sus rectificaciones/anulaciones son **T1** porque
cambian efectivo y posición capturados. El maestro de Instrumentos es **T2/T3**:
la foto guarda ID, ISIN, divisa, nombre y revisión; un renombrado no reescribe la
foto, pero un cambio de ISIN/divisa con Compras exige revalidación.

### 3.3 Foto: núcleo, capturado y parciales (M3)

| Bloque | Contenido | Condición |
| --- | --- | --- |
| **Núcleo obligatorio** | Ciclo/ventana/S0; Movimientos; plan final (`SinPlan` o líneas); clasificación y Referencias de los hechos; **E4.1 instrumentos, Compras, efectivo y posiciones a Fin**; metadatos de cierre; backup | Si falta, no hay cierre |
| **Capturado si hay hechos** | Anticipos (foto/apertura, acreditaciones); Compartidos (ficha, participantes, aportaciones); Nómina (asignaciones); Revisión Comida (registros/vínculos); **Deuda E1.6** (apertura, capital, amortizaciones) | Si el ciclo tiene hechos, se captura; si no, vacío explícito |
| **No disponible** | E4.3 valoración/resultado/patrimonio; E4.2 Ventas; E4.4 conciliaciones | Se muestra `No disponible` con motivo; nunca cero |
| **Fuente de lectura** | E4.5 archivo/precontrol; E3.6 pendientes/conciliación | Se referencia versión/cobertura; no se escriben |

**Comida E3.5:** no está integrada. E4.8 puede mostrar precierre parcial con motivo;
**E4.9 bloquea el cierre y no crea foto** hasta que E3.5/FIN_NETA sea verificable. No se
admite cierre parcial anticipado ni re-cierre como sustituto.

**Totales parciales:** cada total lleva `completo | parcial | no_disponible` y motivo:

- Gasto/Ingreso: completo si Movimientos es completo.
- Efectivo/posición inversión: completo para Compras registradas; **cobertura
  histórica parcial** (no hay importación histórica); valoración `No disponible`.
- Neto Anticipo: completo si Anticipos se capturó; parcial si no.
- Neto Compartido: completo si Compartidos se capturó; parcial si no.
- Nómina/flujo: completo si asignaciones se capturaron; parcial si no.
- Comida/CIERRE: no se captura y el cierre se bloquea sin E3.5/FIN_NETA.
- Patrimonio/resultado: `No disponible` sin E4.3.
- Plan: `SinPlan` válido o completo si se capturó.

### 3.4 Backup como preflight (M4)

- El backup **no forma parte de la transacción SQLite**.
- E4.8 verifica evidencia DT6/T-BKP; E4.9 la revalida antes de abrir la transacción
  de cierre.
- Evidencia mínima: manifiesto, checksum, clave disponible y **restauración efectiva**
  en entorno aislado según DT6/T-BKP. Sin esa evidencia, E4.9 no se declara
  verificable.
- Si el backup falla, el cierre se aborta antes de escribir.

### 3.5 Fingerprint propio (M5)

- `financeRevision` (`movement-ledger.ts:64-139`) es una huella técnica, no una foto.
- Incluye Movimientos, Anticipos/fotos, asignaciones de Nómina, acreditaciones de
  Compartido, Deudas, Referencias, **una proyección parcial de Saldos** (sin
  finalidad, liquidez, bolsa, objetivo ni manual), **operaciones_inversion**,
  clasificación y Ciclos.
- **No incluye**: `instrumentos`, `fichas_anticipos`, `fichas_compartidos`,
  `participantes_compartido`, `revision_comida`, `annual_plan_lines`,
  `cycle_plans`/`cycle_plan_lines`, `presupuestos`, tabla `payroll` completa, ficha
  de Vehículo ni auditorías generales.
- E4.9 define un fingerprint de cierre sobre las fuentes que realmente captura.
  Una coincidencia de `financeRevision` no prueba que la foto esté completa.

### 3.6 Identidad histórica (M6)

- Se preservan IDs, tipo, cadena de clasificación, vínculos, apertura, divisa/ISIN
  y reparto.
- La foto guarda **ID + versión del nombre**; renombrar no reescribe la foto.
- Nombres/etiquetas/notas son T3; tipo/cadena/vínculos financieros son T2.

## 4. E4.8 — Precierre

### 4.1 Entradas y estados

**Entradas:** ciclo seleccionado, contexto, Movimientos, plan final (`SinPlan` o líneas),
Presupuestos, clasificación/Referencias, Anticipos, Compartidos, Revisión Comida, Deuda
E1.6, Inversión E4.1 a Fin, Nómina, E4.5 si existe, E3.6 si existe, backup.

**Estados de salida:** `Listo`, `Listo con avisos`, `Bloqueado`, `No disponible`.
Nunca se presenta un cero por ausencia.

### 4.2 Comprobaciones

| # | Comprobación | Resultado |
| --- | --- | --- |
| P1 | Ventana finita y acreditada | Sin ventana → Bloqueado; DT3 |
| P2 | S0 presente | Sin S0 → Bloqueado |
| P3 | Movimientos y clasificación/Referencias consistentes | Inconsistencia estructural → Bloqueado |
| P4 | Plan final o `SinPlan` válido | `SinPlan` no bloquea; `PlanNoVerificable` → Bloqueado |
| P5 | E4.1 instrumentos/Compras/efectivo/posiciones a Fin | Fuente no disponible → Bloqueado; sin Compras nuevas pero con posiciones previas → posición a Fin, no vacío; cobertura histórica parcial → aviso |
| P6 | E4.3 valoración/patrimonio | `No disponible` → aviso, no bloqueo por sí solo |
| P7 | E3.5 Comida/FIN_NETA | `No disponible` → precierre parcial; E4.9 bloqueado, sin foto |
| P8 | E4.2 Ventas / E4.4 conciliaciones | `No disponible` → aviso/parcial |
| P9 | Backup preflight | Sin evidencia DT6 → Bloqueado |
| P10 | Concurrencia | Cambio entre preview y confirmación → 409 |
| P11 | S0/ventana no se alteran automáticamente | Siempre; no autoajuste |
| P12 | No crear cierre ni siguiente ciclo | Siempre |

### 4.3 Bloqueos y avisos

**Bloquean:** ventana no finita; S0 ausente; falta de fuente núcleo; backup no
verificable; inconsistencia estructural; cambio concurrente; intención de escribir
en el precierre.

**Avisan:** E4.3/E4.2/E4.4 no disponibles; E3.5 no disponible (precierre parcial; cierre
E4.9 bloqueado); cobertura histórica parcial de inversión; diferencias de conciliación
E3.6; archivo E4.5 no disponible; totales parciales.

**No hacen:** modificar S0; crear ciclo siguiente; cerrar; crear foto; corregir
hechos; convertir un aviso en bloqueo sin contrato aprobado.

### 4.4 API/UI conceptual

- `GET /api/cierres/precierre/:ciclo` (lectura; revisión/hash; sin escritura).
- La UI muestra fuentes, cobertura, bloqueos, avisos, diferencias y enlaces al caso.
- El botón “Cerrar” no existe en E4.8; solo prepara/revisa.

### 4.5 Mapeo E4.8

- **E4.8-AC1:** muestra Movimientos, plan, conciliación, auxiliares y relación con
  ciclo siguiente.
- **E4.8-AC2:** no altera S0 automáticamente.
- **E4.8-AC3:** diferencias informativas y bloqueos tienen tratamiento explícito.

## 5. E4.9 — Cierre financiero

### 5.1 Operación

1. Verificar ventana finita y S0.
2. Verificar backup preflight (DT6).
3. Calcular/leer fingerprint de cierre sobre fuentes capturadas.
4. Abrir transacción SQLite única.
5. Revalidar revisión/hash y que el ciclo no esté ya cerrado.
6. Persistir cierre + foto + auditoría.
7. Marcar el ciclo como cerrado (o equivalente) y devolver la foto.
8. Si algo falla, rollback total; no hay foto parcial.

### 5.2 Idempotencia y concurrencia

- Clave de intento + hash de payload; reintento idéntico devuelve la misma foto;
  payload distinto → 409 `IDEMPOTENCY_CONFLICT`.
- Revisión de ciclo/fuentes; cambio entre preview y confirmación → 409
  `IMPACT_CHANGED`/`REVISION_CONFLICT`.
- Un cierre vigente por ciclo; re-cierre solo por E4.10 y solo el último.
- Auditoría: actor, UTC, motivo, fingerprint, versión de foto.

### 5.3 Bloqueo y revalidación

- **T1** se bloquea si la fecha antigua o nueva cae en una ventana cerrada.
- **T2** se permite con impacto/motivo/auditoría; la foto no se recalcula.
- **T3** se permite; si la foto guarda nombre, se conserva la versión.
- Las vistas vivas pueden cambiar; la foto no.
- El cierre no crea automáticamente el ciclo siguiente ni cambia su S0.

### 5.4 Foto: contrato mínimo

| Campo | Contenido |
| --- | --- |
| Identidad | Ciclo, versión de foto, fecha/actor/motivo, fingerprint |
| Ventana | Inicio, Fin, S0, estado temporal |
| Hechos | Movimientos del ciclo y totales |
| Plan | `SinPlan` o plan final con líneas capturadas |
| Clasificación/Referencias | IDs y versiones de nombre |
| Inversión E4.1 | Instrumentos, Compras, efectivo y posiciones **a Fin** (anteriores incluidas, posteriores excluidas); cobertura histórica parcial |
| Auxiliares | Anticipos, Compartidos, Nómina, Revisión Comida y **Deuda E1.6** si hay hechos |
| Cobertura | `completo/parcial/no_disponible` por total y motivo |
| Backup | Evidencia DT6/T-BKP referenciada |
| No disponible | E4.3, E4.2, E4.4 cuando falten; E3.5 bloquea la foto y no se captura como `No disponible` |

### 5.5 Proveedor de Cierres y AC36

Contrato de lectura compartido, sin duplicar lógica:

- `estadoCierre(ciclo)` → cerrado/abierto/versión.
- `ventanaCerrada(fecha)` → ciclo/ventana que la contiene.
- `puedeEscribir(tipo, fecha, objeto)` → bloqueo/revalidación/permiso.
- `fotoVigente(ciclo)` → versión y valores capturados.

Consumidores: Anticipos (AC36), Plan Anual, Vehículos, Movimientos, Clasificación,
Saldos, Flujo Mensual, Inversión E4.1. Una sola lectura de estado con adaptadores
finos; no una guarda distinta por dominio.

**AC36:** solo puede pasar a completo cuando el proveedor esté instalado y una
prueba de integración demuestre que Anticipos consulta el estado real. Una prueba
con proveedor ficticio no acredita Cierres.

### 5.6 Mapeo E4.9

- **E4.9-AC1:** bloqueo ordinario y foto coherentes, incluido el estado final del plan
  (`SinPlan` o líneas).
- **E4.9-AC2:** proteger o revalidar todas las rutas con impacto, no solo
  Movimientos.
- **E4.9-AC3:** fin temporal no crea cierre; cerrar no crea otro ciclo.

## 6. Dependencias y gates

| Gate | Estado | Efecto |
| --- | --- | --- |
| DT3 | Abierto | Sin ventana finita/corte del último ciclo no hay cierre; no inventar fecha |
| DT4 | Abierto | Contenido/metadatos/versiones/retención de la foto; M1–M6 orientan, no cierran |
| DT6/T-BKP | Abierto | Sin backup recuperable/restauración efectiva, E4.9 no es verificable |
| E4.1 | Integrado `156a50d`; 6 AC PARCIAL | Fuente real de instrumentos/Compras/efectivo/posiciones; no es E4.2/E4.3 |
| E4.2 | Documental; sin DEV | Ventas futuras; no capturadas como runtime |
| E4.3 | No implementado | Valoración/resultado/patrimonio `No disponible` |
| E3.5 | No implementado | Comida/FIN_NETA/CIERRE analítico `No disponible`; E4.9 bloqueado hasta integrarlo |
| E4.4 | Documental **en revisión; no aprobada**; sin DEV | Deuda E1.6 sí; conciliaciones futuras |
| E4.5 | Documental **aprobada**; sin código | Fuente de lectura; no escritura |
| E3.6 | Documental **aprobada**; sin código | Fuente de lectura; no escritura |

## 7. Riesgos y decisiones abiertas

- **R1:** confundir `financeRevision` con foto. Mitigación: fingerprint propio y
  pruebas de cobertura.
- **R2:** capturar inversión sin valoración y presentarla como patrimonio completo.
  Mitigación: `No disponible` E4.3 y cobertura histórica parcial.
- **R3:** cerrar el último ciclo sin ventana finita. Mitigación: DT3; bloquear.
- **R4:** declarar backup verificado sin restauración. Mitigación: DT6; bloquear.
- **R5:** revalidar T2 y recalcular la foto. Mitigación: foto inmutable; vistas vivas
  separadas.
- **R6:** duplicar el motor de Comida. Mitigación: E4.9 no lo implementa; consume y
  captura el resultado verificado de E3.5 cuando exista.
- **R7:** que E4.2/E4.4/E4.3/E3.5 se cuelen como capturados. Mitigación: estados
  `No disponible` y gates.

## 8. Stop conditions

Detenerse y reportar, sin rellenar por inferencia, si:

- `financeRevision` no coincide con lo aquí descrito;
- E4.1 no está integrada o cambia de esquema/contrato;
- falta DT3, DT4 o DT6 para el alcance que se pretende;
- se exige capturar E4.3/E3.5/E4.2/E4.4 como si existieran;
- se pide implementar código, migración, endpoint o prueba;
- una fuente devuelve datos que no se pueden distinguir de `No disponible`.

## 9. Handoff de esta propuesta

**Estado:** propuesta documental completa; no aprobada; no SPEC26/27; sin DEV.

**Siguiente acción:** revisión independiente del inventario reauditado y de esta
propuesta; después, decisión del usuario sobre convertirla en SPEC26/E4.8 y
SPEC27/E4.9. No cerrar DT3/DT4/DT6 por inferencia.
