# Preparación read-only — Comida, D′ y dependencias de cierre

Fecha: 2026-10-31. Autor: orquestador OpenCode. Estado: **preparación documental**.
No se ha accedido a datos reales, Excel, bases productivas ni secretos. No autoriza
DEV, migración, activación, despliegue ni merge. Los checklists describen qué
evidencia reunir y qué comprobar; no declaran AC cerrados ni PASS funcional.

Base: `main`/`origin/main` `2e710c0`. Contexto: [tablero](../epic-board.md),
[SPEC16](../16-revision-comida-specification.md),
[SPEC33](../33-dprima-simplificada-specification.md),
[SPEC27](../27-e49-cierre-financiero-specification.md) y
[DT6/T-BKP](../backlog/dt6-t-bkp-encargo.md).

## 1. Comida — P3 y AC-25

**Tipo:** pendiente técnico y dependencia de evidencia. Requiere autorización para
usar datos reales y para contrastar el Excel.

### 1.1 P3 — corte C y saldo B

Objetivo: fijar un corte C y una apertura bancaria B acreditados antes de activar
el régimen. B no es el Saldo inicial de Ciclos ni se infiere del primer Movimiento.

Checklist de evidencia:

1. **C:** Inicio del ciclo elegido, con identidad y fecha verificables. No se elige
   por conveniencia ni se crea un ciclo nuevo para el corte.
2. **B:** saldo bancario acreditado al comienzo de C, antes de sus operaciones.
   Fuente, fecha, cuenta y documento de evidencia identificados.
3. **Cobertura posterior a C:** todas las operaciones imputables al intervalo,
   incluidas compras individuales, devoluciones y hechos tardíos con su fecha real.
4. **Transferencias:** inventario de transferencias anteriores y posteriores a C;
   las anteriores ya incluidas en B no se vuelven a sumar.
5. **Agregados que atraviesan C:** identificarlos. Un agregado que cruce C bloquea
   la activación hasta acreditar cobertura o elegir otro corte; no se prorratea.
6. **Conciliación de consumidores:** plan mensual, Recursos, cierre analítico,
   Presupuestos/Plan Anual y cualquier consumidor de Comida. Se compara por corte,
   sin doble cómputo ni suma del detalle legado al agregado reconocido.
7. **Diferencia S0/B:** explicar la diferencia entre el Saldo inicial de Ciclos y B;
   no convertir uno en el otro ni inventar un arrastre.

Criterio de salida: C y B aprobados específicamente, cobertura íntegra posterior,
inventario de transferencias cerrado, ausencia de solapamientos y conciliación de
consumidores documentada. Sin cobertura se informa parcial/no disponible, nunca
conciliado.

### 1.2 AC-25 — contraste físico con v5.11(7)

Contraste documental, sin modificar el libro. v5.10 es evidencia histórica y no
equivale a v5.11(7).

| Campo / relación a contrastar | Qué registrar |
| --- | --- |
| Clasificación y `Fuera presupuesto` | Valores físicos, dominios y cómo se representan en la app |
| `Reposición` | Si existe como clasificación física, importe y relación con el hecho |
| Importe firmado | Signo, dirección y conservación sin normalización |
| `Estado` / `Referencia reposición` | Cardinalidad, nulabilidad y vínculo con la operación |
| Relación devolución–compra | Si hay FK, vínculo lógico o ausencia de relación |
| Ausencia de FK/cardinalidad | Confirmar o corregir la hipótesis D-01-R |
| Aplicabilidad D-01-R(v5.11(7)) | Si la representación app conserva la semántica física |
| Campos de la app | Distinguir cada campo físico del contrato app; si difiere, actualizar contrato |

Salida: matriz campo físico → campo app, diferencias, campos no representables y
decisión documental. No se declara equivalencia ni se cierra AC-25 sin contraste
acreditado.

### 1.3 CU parciales y huecos

Se mantienen identificados: **01, 03, 04, 05, 08, 10, 11, 15, 16, 20, 21 y 23**.
CU-11 incluye restore UNRUN y se acredita con RESTORE-19/20. No se reclasifican por
esta preparación.

Huecos principales a cubrir: rol de activación, fixture que sume consumidores,
bordes de ciclo, redirección económica sin E2E, agregado Terminal, coincidencia o
fuente fallida, Partida sin temporalidad, financiación anual/flujo, reintento de
reposición, ejemplo completo de Recursos/cierre/puente y cruce C/S0 ausente.

**No hacer:** activar el régimen, migrar datos, abrir bases reales o modificar el
Excel. Todo ello exige autorización separada.

## 2. D′ — inventario y mapping físico read-only

**Tipo:** pendiente técnico con dependencia de SPEC27. Requiere autorización para
leer la base/Excel reales; la preparación aquí es solo documental y de código.

### 2.1 Activos read-only ya existentes

| Activo | Uso | Límite |
| --- | --- | --- |
| `presupuestos` | Maestro legado: id, nombre, fuente, destino, estado, revisión | No es el maestro D′; se conserva como legado |
| `partidas.presupuesto` | Relación 0..1 Partida → Presupuesto | No crear PRE ficticio ni reparto automático |
| `annual_plan_lines` | Ejercicio, Partida, importe, periodo, Esencial, revisión | No convertir a líneas D′ por inferencia |
| `annual_plan_audit` | Auditoría append-only del plan anual | No reescribir historia |
| `GET /api/presupuestos` y `GET /api/presupuestos/:id` | Consulta del maestro y sus Partidas/usos | Solo lectura |
| `GET /api/plan-anual/:year` | Consulta del plan anual, ejecución, cobertura y protecciones | Solo lectura; no cierra ejercicios |
| `GET /api/dprima/mapping` | Propuesta diagnóstica Presupuestos → Partidas y líneas anuales | No es mapping físico ni migración |
| `Presupuestos.tsx`, `PlanAnual.tsx`, `Dprima.tsx` | Pantallas existentes | No se eliminan ni se convierten |

El mapping D′ ya implementado es **diagnóstico y explícito**: guarda
correspondencias en `dprima_mapping`, no renombra Presupuestos, no fusiona maestros
y no modifica hechos ni líneas anuales. No confundirlo con el inventario físico
pendiente.

### 2.2 Inventario físico a preparar

1. **Presupuestos:** contar filas y estados; inventariar IDs PRE, nombre, fuente,
   destino, estado y revisión; detectar duplicados, huérfanos y destinos inactivos.
2. **Partidas:** inventariar IDs PAR, jerarquía, clasificación, Deuda y vínculo
   `presupuesto`; detectar Partidas con varias relaciones o sin Presupuesto.
3. **Plan Anual:** contar líneas por ejercicio/Partida; registrar importe, periodo,
   Esencial, revisión y auditoría; detectar colisiones Partida/ejercicio, importes
   nulos/cero y líneas de Partidas inactivas.
4. **Relaciones:** PRE con varias PAR, PAR usadas por Deuda, PRE sin Partida y
   líneas anuales cuyo PRE no existe o está inactivo.
5. **Consumidores:** plan mensual, flujo, Presupuestos, Plan Anual y fotos de cierre.
   No se declara mapping completo si un consumidor no puede verificarse.
6. **Preservación:** comprobar que las rutas y pantallas de Presupuestos y Plan
   Anual siguen consultables y que ninguna migración D′ las elimina o reescribe.

Salida: inventario por ID, conteos, discrepancias, mapping propuesto explícito y
lista de decisiones que requieren al usuario. Sin reparto automático del objetivo
de un PRE entre varias PAR ni conversión de `No aplica` en Gasto real/Aportación.

### 2.3 AC pendientes de operativa real

- **Pendientes:** AC-02, 07, 08, 09, 15, 16, 22, 24 y 26.
- Estado del testplan que no se reclasifica: 02/08/09/15/22/24/26 PARCIAL; 07
  UNRUN; 16 PASS (E1/S) con cobertura real pendiente.
- **UNRUN:** AC-12, 13, 18 y 19. AC-12/13 dependen de SPEC27; AC-18 es UI/E2E;
  AC-19 es restore v20 y se acredita con RESTORE-19/20.
- Sin migración ni activación real.

## 3. SPEC27 y DT6/T-BKP — matriz de dependencias

**Tipo:** dependencias y bloqueos. Nada de esta sección es ejecutable sin
autorización específica.

| Dependencia | Estado | Qué bloquea | Evidencia necesaria | Gate |
| --- | --- | --- | --- | --- |
| SPEC27 / E4.9 | Diseño aprobado; AC UNRUN; sin DEV | Cierre real, foto y estado `Cerrado` | Implementación autorizada, pruebas de cierre y foto inmutable | Autorización DEV separada |
| E3.5 / FIN_NETA | No integrado; DEV18 STOP | AC-08 de cierre; totales de Comida | Motor verificable y consumidores conciliados | Autorización y adaptación posterior |
| DT6/T-BKP | Abierto; sin destino externo | AC-09 de cierre; recuperación real | Manifiesto, checksum, clave, restauración aislada y custodia | Decisión del usuario y evidencia externa |
| RESTORE-19/20 | Pendiente; prioridad inmediata | Acreditación de restore v19/v20 | Fixtures v19/v20, Linux, migración v19→v20 y negativos | Autorización de ejecución |
| Gate rootless | Gate integrado; validación real pendiente | Release/rollback autorizado | Release real autorizada y matriz de compatibilidad | Autorización de release |
| Datos reales / activación | No autorizado | P3, AC-25, mapping físico y migración | Evidencia y contraste físico aprobados | Autorización específica |

### 3.1 Cierre y hechos tardíos

SPEC27 exige ventana finita, S0, núcleo, plan final (`SinPlan` válido), backup
preflight, concurrencia y foto inmutable. Un hecho tardío se registra con su fecha
real; no reescribe la foto ni el plan siguiente. Modificar resultados congelados
exige revisión de impacto y el contrato de cierre. E3.5/FIN_NETA no disponible
bloquea el cierre: no se admite cierre parcial anticipado.

### 3.2 DT6/T-BKP

Objetivo registrado: exportar backup cifrado, custodiarlo en destino físico elegido
por el usuario y restaurarlo. Gate exigido: restauración aislada real, manifiesto,
checksum, versión de app/esquema, clave disponible y pasos reproducibles. RPO/RTO
aceptados: 24 h / 2 h; retención 7 diarias, 4 semanales y 3 mensuales. Pendiente:
destino externo, custodia de claves, automatización/poda y evidencia de restauración.
No se cierra DT6 por inferencia ni por el restore técnico v19/v20.

### 3.3 Gate rootless

El gate comprueba contratos de release y rollback; **no sustituye** el restore
cifrado v19/v20. Su validación sobre una release real requiere autorización de
release y no implica despliegue ni activación. Mantener separados:

1. restore técnico de copias v19/v20 (RESTORE-19/20);
2. evidencia DT6/T-BKP de custodia y recuperación externa;
3. validación rootless sobre release autorizada;
4. cierre E4.9 y activación real.

## 4. Orden recomendado

1. **RESTORE-19/20** en Linux, por ser técnico, acotado y sin datos reales.
2. **P3/AC-25** y **mapping físico D′** en paralelo, solo si se autoriza lectura de
   datos/Excel y con artefactos separados.
3. **SPEC27/DT6** como trabajo documental y de evidencia; su ejecución sigue
   bloqueada por E3.5, backup y autorizaciones.
4. **Gate rootless** sobre release real, después de restore y con autorización.
5. **Mejoras UI opcionales** al final, sin desplazar los gates anteriores.

## 5. Límites

- Sin datos reales, Excel, bases productivas, secretos ni despliegue.
- Sin DEV, migración, activación, cierre ni merge.
- Los checklists no cierran AC, no declaran PASS y no sustituyen QA.
- Cualquier ejecución requiere autorización separada e identificable.
