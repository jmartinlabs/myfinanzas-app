# 21 — E3.6 Pendientes y conciliación transversal: Specification

Status: **PROPUESTA DOCUMENTAL (DRAFT)** — preparada bajo autorización de preparación;
no aprobada; no autoriza desarrollo, SQL, migraciones, pruebas funcionales, push, PR ni
merge.

Approval source/date: **PENDING**. El usuario autorizó preparar SPEC21 el 2026-10-27;
no aprobó su contenido.

Context and brainstorming:
[21-pendientes-conciliacion-brainstorming.md](21-pendientes-conciliacion-brainstorming.md),
[roadmap E3.6](roadmap.md#e36--pendientes-y-conciliación-transversal-de-casos),
[R1–R4/R6](functional-reference-v5.11.md),
[spec09](09-plan-ciclo-specification.md),
[spec12](12-flujo-mensual-specification.md),
[spec13](13-anticipos-specification.md),
[spec14](14-compartidos-specification.md),
[spec16](16-revision-comida-specification.md),
[spec18 candidata local](21-pendientes-conciliacion-progress.md#4-dependencias-locales-y-futuras).

Test design and UNRUN status:
[21-pendientes-conciliacion-testplan.md](21-pendientes-conciliacion-testplan.md).

## 0. Leyenda de autoridad

| Marca | Significado |
| --- | --- |
| **[A]** | Contrato aprobado en una especificación previa o por el usuario. |
| **[I]** | Comportamiento integrado en `main`, verificado por lectura de código/PR; no se declara PASS funcional nuevo. |
| **[P]** | Propuesta de SPEC21; requiere revisión y aprobación. |
| **[F]** | Dependencia futura o no disponible; no se simula. |
| **[ND]** | No disponible con motivo; nunca equivale a cero. |

La referencia funcional v5.11(7) es candidata, no equivalencia física certificada. No
se ha accedido a Excel, datos personales, bases reales ni VPS.

## 1. Purpose and scope

E3.6 permite **consultar pendientes de casos y conciliar de forma transversal**, y
**explicar cómo los motores de Anticipos, Compartidos y Comida alimentan el Plan del
ciclo y el Flujo mensual**. El resultado es una vista de lectura y una integración
explícita, no un motor financiero nuevo.

Incluye:

1. Una matriz de magnitudes, propietarios, identidades, fechas, ciclos, ejercicio,
   ventanas, cobertura, consumidores y exclusiones.
2. Una vista de pendientes por tipo, estado, ciclo y ejercicio, con enlaces a cada caso.
3. La distinción entre rechazo estructural, alerta de conciliación y No disponible.
4. La integración del Neto compartido central en el Flujo mensual mediante
   ajuste/sustitución, sin Bruto + Neto.
5. La conservación de Comida como capa auxiliar, sin segundo Gasto ni doble descuento.
6. La conservación de Plan del ciclo R3 sin netear recuperaciones ni devoluciones.
7. Una matriz preparatoria de impacto DT5 para Cierres futuros, sin implementar cierres,
   locks, snapshots, re-cierres ni proveedores.

No incluye: implementación de Cierres, endpoints operativos de cierre, migraciones,
cambios de esquema, escrituras, cálculo de Neto paralelo, segundo maestro de casos,
importación de históricos ni equivalencia real con el Excel.

## 2. Authority and dependency status

### 2.1 Reglas que SPEC21 consume sin reabrir

| Regla | Autoridad | Uso en E3.6 |
| --- | --- | --- |
| Movimientos: Ingreso, Gasto, Transferencia, Amortización; la Referencia no cambia el tipo económico. | R2; E1.4/E1.5 | Un Gasto con Referencia sigue siendo Gasto; una devolución sigue siendo Transferencia. |
| Ciclos: único maestro; Inicio manual; Fin derivado; corte por referencia central; ciclo puede existir antes del cobro. | R3; spec03/spec07 | Ventana de pendientes y flujo; no se sustituye por mes natural. |
| Plan: A transferir = Del mes; Gasto real por Partida; Aportación a saldo sin Referencia/Exterior; devolución no ejecuta. | R3; spec09; spec12 | El Plan no se netea por E3.6. |
| Anticipos: solo Transferencias acreditadas; Neto apertura es foto por REF+Ciclo. | R4; spec13 rev3/Q9/H1 | Pendiente actual y foto de apertura se muestran separados. |
| Compartidos: Bruto, Recuperado, Neto, atribución por Gasto/Partida; Cerrado ≠ Neto cero. | R4; spec14 | El flujo consume Neto central y atribución; no recalcula. |
| Comida: auxiliar; Gasto comida incluye Pendiente revisar; compensable Ocio+Niños+Otros; Falta = max(compensable − reposiciones, 0). | R4; spec16 | Bloque analítico separado; sin segundo Gasto. |
| Flujo: Gasto bruto registrado una vez; S parcial; no es H física. | spec12 | Se conserva el dato base y se añade una vista ajustada explícita. |
| Cobertura: Verificado, Cero verificado, Parcial, No disponible. | spec12/spec14/spec16 | Se aplica por métrica, no como un único semáforo global. |
| Cierres: protección transversal futura; DT5 preparatoria. | roadmap; P5/DT4/DT5 | Solo matriz de impacto; sin implementación. |

### 2.2 Estado de dependencias

| Dependencia | Estado real | Límite de esta spec |
| --- | --- | --- |
| E3.1/DEV13 | PR71 integrada. H1: Gastos/Ingresos relacionados fuera del motor; solo Transferencias acreditadas. AC36 PARCIAL por proveedor de Cierres ausente. | Se consume el DTO y la foto de apertura; no se declara AC36 completo. |
| E3.2 Base B | PR75 integrada; ficha, participantes, reparto exacto y Gasto CAT013. | Se consume el motor central. |
| E3.2 D5 | PR90 integrada; overflow PR93. Aportaciones de tercero son Transferencias S000→interno acreditadas. | Se consume el Recuperado; no se convierte en Ingreso. |
| E3.2 B-T11 | Pendiente/UNRUN: consumo por informes/E3.6. | Esta spec define el consumo, pero B-T11 no se declara PASS. |
| E3.4/DEV16 | PR82 integrada. AC25 abierto; AC12/31 condicionados; AC27/34/36 futuros E3.5. | Se consume el contrato de lectura; no se cierra AC25. |
| E3.5/DEV18 | Candidato local, no integrado ni aceptado. `FIN_NETA` runtime ausente; AC-12/13/17/39 BLOCKED. | Comida se especifica condicionalmente; sin motor, No disponible. |
| E2.6/DEV12 | PR67 integrada; documentación PR94; 56 AC y UNRUN de fuentes no disponibles. | Se conserva su semántica; la integración E3.6 no se declara ejecutada. |
| Cierres E4.8–E4.11 | Futuros; no existe proveedor. | Solo matriz DT5; no endpoints, locks ni snapshots. |

## 3. Magnitudes, propietarios y fronteras

### 3.1 Matriz por magnitud

| Magnitud | Maestro/motor propietario | Identidad estable | Fecha real | Ciclo | Ejercicio natural | Ventana/corte | Cobertura | Consumidor E3.6 | Exclusiones | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Adelantado de Anticipo | Movimientos + metadatos Anticipo | ID Movimiento; REFxxx + par origen/destino | Fecha de la Transferencia | Ciclo de la fecha | Año de la fecha | Inicio ≤ fecha ≤ corte de la consulta | Verificada/Parcial/ND según acreditación | Ficha, pendiente por caso | Gastos/Ingresos relacionados; Transferencias sin rol | [A][I] |
| Recuperado de Anticipo | Movimientos + metadatos Anticipo | ID Movimiento; REFxxx + par | Fecha de la Transferencia inversa | Ciclo de la fecha | Año de la fecha | Misma ventana | Verificada/Parcial/ND | Ficha, pendiente por caso | Otras Referencias; operaciones no acreditadas | [A][I] |
| Neto pendiente de Anticipo | Motor Anticipos | REFxxx | Derivada de hechos; no fecha propia | No se fuerza a un ciclo | No se fuerza a un año | Estado actual; no histórico | Según acreditación | Pendiente por caso | Pendiente actual no es Neto apertura | [A][I] |
| Exceso de Anticipo | Motor Anticipos | REFxxx | Derivada | No se fuerza | No se fuerza | Actual | Según acreditación | Alerta del caso | No se compensa con otros pares | [A][I] |
| Neto apertura de Anticipo | `fotos_neto_apertura` | REFxxx + ID Ciclo | Inicio del ciclo + fecha de confirmación separada | Ciclo explícito | Año del Inicio | Foto del instante de apertura | Verificada/ND con evidencia | Ficha y pendiente | Pendiente actual; reconstrucción sin evidencia | [A][I] |
| Bruto de Compartido | Movimientos (Gasto CAT013) | ID Movimiento; REFxxx | Fecha del Gasto | Ciclo de la fecha | Año de la fecha | Inicio ≤ fecha ≤ corte | Verificada/Parcial/ND | Ficha, flujo ajustado | Aportaciones; Gastos inválidos | [A][I] |
| Recuperado de Compartido | Movimientos (Transferencia S000→interno) + acreditación | ID Movimiento + participante | Fecha de la Transferencia | Ciclo de la fecha de aportación | Año de la fecha | Según regla temporal Q-S21-01 | Verificada/Parcial/ND | Ficha, flujo ajustado | Transferencias internas; Anticipos; Gastos/Ingresos | [A][I] |
| Neto de Compartido por Gasto | Motor central Compartidos | Gasto ID + REFxxx | Fecha del Gasto | Ciclo del Gasto | Año del Gasto | Decisión Q-S21-01 | Verificada/Parcial/ND | Flujo ajustado, ficha | Neto de caso no se reparte a mano | [A][I] |
| Neto de Compartido por Partida/caso | Motor central Compartidos | Partida ID / REFxxx | Derivada | No se fuerza | No se fuerza | Según Gastos elegibles | Verificada/Parcial/ND | Ficha, informes | Recuperado global no se reparte directamente | [A][I] |
| Pendiente/Exceso por participante | Motor central Compartidos | Participante ID | Derivada | No se fuerza | No se fuerza | Según Gastos e inputs | Verificada/Parcial/ND | Pendiente y ficha | Sin compensación cruzada | [A][I] |
| Estado de reparto | Motor central Compartidos | REFxxx | Derivada | No se fuerza | No se fuerza | Según cobertura | Verificada/Parcial/ND | Pendiente y ficha | No es campo manual | [A][I] |
| Gasto comida / Compensable / Reposiciones / Falta | E3.5 (candidato) sobre Revisión Comida + Ciclos | IDs de operación de Revisión Comida | Fecha de operación | Ciclo por intervalo | Año de la fecha | Inicio ≤ fecha ≤ corte analítico | Tres ejes: lectura, evidencia, histórico | Bloque Comida | Segundo Gasto; suma a Saldos | [P][F] |
| Recursos Comida | E3.5: S0 + FIN_NETA + REP | Ciclo ID | No propia | Ciclo | Año del Inicio | Según corte | Según E3.5 | Bloque Comida | FIN_NETA no se reconstruye; DEV_ANT no se resta otra vez | [P][F] |
| Cierre analítico Comida / Diferencia | E3.5 | Ciclo ID | No propia | Ciclo | Año del Inicio | Corte analítico | Solo con lectura completa y cobertura | Alerta de conciliación | No es cierre financiero ni foto E4 | [P][F] |
| Ejecutado del Plan | Motor Plan R3 | Presupuesto ID + Ciclo ID | Fecha real del hecho | Ciclo | No se usa el año para R3 | Inicio ≤ fecha ≤ Fin/corte | Según periodo y hechos | Plan y flujo | No se netea por recuperaciones | [A][I] |
| A transferir / Pendiente / Estado del Plan | Motor Plan | Presupuesto ID + Ciclo ID | No propia | Ciclo | No se usa | Ciclo | Según Del mes y ejecución | Plan | No es estado de caso | [A][I] |
| Gasto bruto registrado | Movimientos | ID Movimiento | Fecha del Gasto | Ciclo | Año de la fecha | Inicio ≤ fecha ≤ corte | Según intervalo | Flujo base | No es H física; no se suma dos veces | [A][I] |
| Gasto neto ajustado | E3.6 sobre Gasto bruto + Neto central | ID Movimiento + REFxxx | Fecha del Gasto | Ciclo del Gasto | Año del Gasto | Según Q-S21-01 | Verificada/Parcial/ND | Flujo ajustado | No es un segundo Gasto ni un Ingreso | [P] |
| Saldo inicial comida (S0) | `tblCiclos` | Ciclo ID | Inicio del ciclo | Ciclo | Año del Inicio | Manual al abrir | Dato manual explícito | Comida, diferencia | No se arrastra ni se autorrellena | [A][I] |

### 3.2 Identidad, fechas y precisión

- Identidades: se conservan IDs de fuente (`REFxxx`, IDs de Movimiento, IDs de
  participante, IDs de operación de Revisión Comida, IDs de Ciclo/Presupuesto). E3.6 no
  crea identidades financieras nuevas; la clave de fila de la vista es efímera.
- Importes: EUR exacto en céntimos; DTO como string decimal; sin binario flotante, sin
  redondeo por componente y sin truncar signos.
- Fechas: civiles ISO para hechos; los timestamps UTC son auditoría, no fecha financiera.
- Ventanas inclusivas en Inicio y Fin/corte. No se usa el reloj como referencia
  financiera.
- Cero explícito y `null`/No disponible son distintos. Un resultado exacto cero solo se
  emite si la fuente y la cobertura están verificadas.

## 4. Financial semantics by source

### 4.1 Anticipos

Fórmulas del motor único, solo con Transferencias acreditadas:

```text
Adelantado = Σ adelantos elegibles
Recuperado = Σ devoluciones elegibles
Neto pendiente = Adelantado − Recuperado
Exceso = max(Recuperado − Adelantado, 0)
```

- Los Gastos/Ingresos con la Referencia de un Anticipo conservan su efecto bancario y
  quedan en `relacionados`; no entran en Adelantado/Recuperado ni se convierten.
- Una Transferencia sin rol/par acreditado no computa; se muestra en
  `pendientesAcreditacion` y degrada la cobertura a Parcial o No disponible.
- La foto de Neto apertura es por REF+Ciclo. No se sustituye por el Neto actual ni se
  reconstruye con hechos posteriores. Sin foto/evidencia: No disponible.
- Las devoluciones son Transferencias: no ejecutan Presupuesto, no son Ingreso y no
  cambian A transferir.
- El exceso se conserva íntegro en el par y en el global acreditado; no se compensa con
  otros pares ni se recorta.

### 4.2 Compartidos

Fórmulas centrales, sin recálculo por vista:

```text
Bruto B = Σ Gastos elegibles CAT013
Recuperado R = Σ aportaciones acreditadas de terceros
Neto caso N = B − R                  # puede ser negativo
Asignado_p = Σ Gastos Asignado(g,p)  # Titular incluido
Coste propio C_T = Asignado_Titular
Pendiente_p = max(Asignado_p − Aportado_p, 0)
Exceso_p = max(Aportado_p − Asignado_p, 0)
Neto(g) = Bruto(g) − Recuperado atribuido(g)
Neto(P) = Σ Neto(g) de la Partida
```

- Céntimos exactos; mayor resto con desempate por ID estable; la suma de asignados es
  igual al Bruto del Gasto.
- Las aportaciones son Transferencias acreditadas desde Exterior; no son Ingreso ni
  ejecución presupuestaria. Una Transferencia interna con la misma Referencia no acredita
  recuperación.
- `Cerrado` significa sin pendientes ni excesos de terceros; puede coexistir con Neto
  positivo y coste propio positivo. No exige Neto cero.
- `Reparto parcial` puede coexistir con alerta de exceso de otro participante; no hay
  compensación cruzada.
- Una incidencia de cobertura (`Revisar`) bloquea `Cerrado` y presenta Bruto/Neto como
  Parcial. No se corrige el hecho ni se convierte un negativo en devolución.
- El Recuperado atribuido por Gasto es el que consume el Flujo; no se reparte el
  Recuperado global a mano entre Partidas.

### 4.3 Comida

Contrato de E3.5, condicionado a su integración:

```text
GC_B = salidas Detalle vigentes Comida + Pendiente revisar
GC_D = devoluciones Detalle+Entrada+esDevolucion=true Comida + Pendiente revisar
GC   = GC_B − GC_D
CO_B = salidas Ocio + Niños + Otros
CO_D = devoluciones Ocio + Niños + Otros
CO   = CO_B − CO_D
REP  = reposiciones vigentes dentro de Inicio..corte
FALTA = max(CO − REP, 0)
RECURSOS = S0 + FIN_NETA + REP
CIERRE = RECURSOS − GC − CO
DIF = S0_siguiente − CIERRE
```

- `FIN_NETA` es la financiación ya neta de la devolución de Anticipo. `DEV_ANT` es
  informativa y no se suma ni se resta otra vez.
- `Pendiente revisar` es una clasificación real: suma en Gasto comida una vez y se
  muestra como línea propia.
- `Compensable` es un grupo derivado de Ocio+Niños+Otros; no incluye Comida,
  Pendiente revisar ni Fuera presupuesto.
- `Fuera presupuesto` no entra en Gasto/Compensable/Falta, pero conserva su operación y
  efecto bancario. No se convierte en Gasto central ni se elimina.
- Una reposición parcial no es Completada. Una reposición tardía no se atribuye al ciclo
  anterior (Q3 C de E3.5); cuenta en el ciclo de su fecha.
- `CIERRE` es analítico, no cierre financiero ni saldo bancario total. `DIF` solo avisa;
  no modifica S0 siguiente ni crea asiento.
- Si falta `FIN_NETA`, el motor E3.5, la cobertura o el proveedor, los agregados
  dependientes son No disponible; no se usan entradas brutas ni cero.

### 4.4 Plan del ciclo

- `A transferir = Del mes` por Presupuesto, sin cambios.
- Gasto real: suma Gastos por Partida/Presupuesto dentro del ciclo, **incluido un Gasto
  con Referencia** y con su importe íntegro. La Referencia no cambia el tipo ni la
  Partida.
- Aportación a saldo: solo Transferencias ordinarias al destino, sin Referencia y sin
  origen Exterior. Una aportación de Compartido con Referencia no ejecuta Aportación.
- Una devolución de Anticipo es Transferencia con Referencia: no ejecuta Presupuesto.
- No se crea un «Plan neto» que reste recuperaciones. El Plan muestra su ejecución R3;
  E3.6 puede señalar el Neto de Compartidos como contexto, nunca como ejecución.
- Si el periodo/corte no es verificable, Ejecutado/Pendiente/Estado no se fabrican.

### 4.5 Flujo mensual: sustitución, no suma

E2.6 conserva sus métricas base. E3.6 añade una vista ajustada explícita:

```text
G_b   = Gasto bruto registrado del ciclo (Gastos centrales elegibles, una vez)
R_adj = Recuperado de Compartidos atribuido a los Gastos de ese ciclo
        según la regla temporal Q-S21-01
G_n   = G_b − R_adj
S_aj  = Total ingresos − G_n − Amortización extraordinaria
```

Reglas:

1. `G_n` **sustituye** a `G_b` en la vista ajustada; nunca se muestra `G_b + Neto` ni
   `G_b + R_adj` como segundo gasto.
2. `R_adj` no es Ingreso. Si `G_n` queda negativo, se conserva el signo y se explica que
   el exceso de recuperación reduce el gasto; no se reclasifica como ingreso.
3. `S_aj` es una métrica derivada y siempre Parcial; no es «ahorro real», «flujo
   completo» ni variación patrimonial.
4. Se conservan separados: flujo real/caja, ejecución del Plan, saldo patrimonial,
   provisiones y pronóstico. No se suman ni se sustituyen entre sí.
5. Comida no se resta de `G_n` ni de `S_aj`. Su bloque analítico es independiente.
6. Una devolución de Anticipo no se resta de `G_n` ni se suma a ingresos; ya es una
   Transferencia fuera del Gasto y del Ingreso.
7. Un Gasto de terminal y su Transferencia de financiación se cuentan una vez: el Gasto
   entra en `G_b`; la Transferencia no es Gasto ni Ingreso.
8. Una reposición de Comida no se suma como recurso del flujo central; pertenece al
   bloque Comida.
9. Si falta `G_b`, `R_adj`, periodo o cobertura, `G_n`/`S_aj` son No disponible; no se
   rellena con cero. Si el motor de Compartidos está instalado, el periodo es verificable
   y no hay Gastos compartidos, `R_adj = 0` verificado.
10. La vista base E2.6 sigue visible y etiquetada; la vista ajustada no la sobrescribe
    silenciosamente (Q-S21-02).

### 4.6 Ciclo, ejercicio natural y cruces

- El **ciclo** es la ventana financiada de `tblCiclos`: Inicio, Fin derivado o Abierto,
  corte por referencia central. Gobierna Flujo, Plan, pendientes por ciclo y Comida.
- El **ejercicio natural** es el año civil de la fecha del hecho. Gobierna el Plan anual
  y los filtros anuales; no sustituye al ciclo.
- Un Gasto de diciembre puede pertenecer a un ciclo que termina en enero; su año natural
  y su ciclo pueden diferir. Se muestran ambos.
- Un Gasto de 2026 y una aportación de 2027 pueden pertenecer al mismo ciclo o a ciclos
  distintos. La atribución temporal del Recuperado es Q-S21-01.
- Un ciclo abierto puede actualizarse con hechos nuevos; un ciclo con fotografía/cierre
  futuro no se reescribe. Esta spec no implementa esa protección.
- No se inventan periodos, cortes, cierres ni fechas de referencia.

## 5. Transversal pending and conciliation model

### 5.1 Principles

1. **Sin segundo maestro:** la vista compone resultados de Anticipos, Compartidos,
   Comida y conciliación de apertura. No persiste casos, estados ni importes.
2. **Sin motor de Neto paralelo:** los Netos se leen de sus motores; E3.6 solo ajusta el
   flujo con el Neto central y documenta la operación.
3. **Sin estados financieros artificiales:** no hay «total pendiente global» que sume
   magnitudes incompatibles ni semáforo único de reconciliación.
4. **Hechos preservados:** una alerta no borra ni corrige el hecho; navega a su fuente.
5. **Lectura consistente:** cada fila conserva fuente, ID, revisión y fecha de la
   lectura; una respuesta obsoleta no se mezcla con otra revisión.

### 5.2 Item taxonomy

| Tipo | Disparador | Magnitud mostrada | Estado por defecto | Acción |
| --- | --- | --- | --- | --- |
| Anticipo | Neto pendiente > 0 | Neto pendiente | Pendiente | Abrir ficha REF |
| Anticipo | Exceso > 0 | Exceso | Exceso | Abrir ficha REF |
| Anticipo | Transferencias sin acreditar | Hechos pendientes (conteo) | Revisar | Abrir ficha, ver motivos |
| Anticipo | Sin foto de Neto apertura para el ciclo consultado | Neto apertura | No disponible | Abrir ficha, confirmar con evidencia |
| Compartido | Pendiente de terceros > 0 | Pendiente de terceros | Pendiente | Abrir ficha REF |
| Compartido | Exceso de terceros > 0 | Exceso | Exceso | Abrir ficha REF |
| Compartido | Incidencia de cobertura / recuperado sin cuota | Motivo; subtotal acreditado | Revisar | Abrir ficha, ver Gasto/participante |
| Comida | Falta por reponer > 0 | Falta por reponer | Pendiente | Abrir Comida del ciclo |
| Comida | Reposición parcial o cobertura incompleta | Falta conocida / motivo | Pendiente + Parcial | Abrir Comida del ciclo |
| Comida | Motor E3.5 no integrado, FIN_NETA ausente o sin cobertura | Sin cifra | No disponible | Abrir alcance/motivo |
| Conciliación | S0 siguiente distinto del cierre analítico de Comida, con cobertura verificable | Diferencia | Alerta de conciliación | Abrir Comida y Ciclo |
| Conciliación | Sin proveedor de cierre/cobertura | Sin cifra | No disponible | Ver motivo |

Un caso `Cerrado`, `Recuperado` o sin pendiente no aparece por defecto; puede consultarse
con el filtro Histórico/Resueltos. `Resuelto` es historia, no un pendiente.

### 5.3 Severity taxonomy

| Categoría | Definición | Ejemplos | Efecto |
| --- | --- | --- | --- |
| **Rechazo estructural** | Operación inválida por identidad, Referencia, rol, dirección, acreditación o revisión incompatible. | Transferencia Anticipo sin rol/par; aportación de Compartido interna presentada como recuperación; participante de otra ficha; importe/fecha inválidos; clasificación de Comida incompatible. | Se rechaza atómicamente; no hay escritura parcial; no es una fila de conciliación. |
| **Alerta de conciliación** | Diferencia revisable con hechos conservados. | S0 siguiente ≠ cierre analítico; pendiente/exceso de participante; cobertura parcial; recuperado sin cuota; hecho histórico sin acreditar. | Se muestra con importe/motivo; navega al caso; no corrige ni bloquea por sí sola. |
| **No disponible** | Falta fuente, motor, periodo, evidencia o prueba suficiente. | E3.5 no integrada; FIN_NETA ausente; sin cobertura histórica; sin proveedor de Cierres; foto de apertura ausente. | Sin cifra; motivo visible; no se simula reconciliación. |

Un rechazo estructural no se convierte en alerta por mostrarlo en una lista. Una alerta
no se convierte en error estructural por tener importe distinto de cero.

### 5.4 Item read model (propuesta)

```text
type EstadoItem = "Pendiente" | "Exceso" | "Revisar" | "No disponible" | "Resuelto";
type TipoItem = "Anticipo" | "Compartido" | "Comida" | "Conciliacion";
type Cobertura = "Verificada" | "Parcial" | "No disponible" | "No aplica";
type Severidad = "Alerta de conciliación" | "No disponible";

TransversalItem {
  claveEfimera: string;          // tipo + ID fuente + ciclo/ejercicio; no persistida
  tipo: TipoItem;
  fuente: {
    motor: "Anticipos" | "Compartidos" | "Comida E3.5" | "Ciclos/Conciliación";
    id: string;                  // REFxxx, ID Movimiento, ID operación, ID Ciclo
    revision: number | null;
  };
  caso: { id: string; nombre: string | null } | null;
  ciclo: { id: string; inicio: string; fin: string | null; estado: "Abierto" | "Con fin temporal" } | null;
  ejercicio: number | null;      // año natural del hecho, no del ciclo
  fechaHecho: string | null;
  magnitud: string;              // "Neto pendiente", "Pendiente de terceros", "Falta por reponer", "Diferencia"
  importe: string | null;        // EUR exacto; null = No disponible
  signo: "Deuda" | "Exceso" | "Diferencia" | "Informativo" | null;
  estado: EstadoItem;
  cobertura: Cobertura;
  severidad: Severidad;
  motivo: string;
  detalle: { etiqueta: string; valor: string | null }[];
  enlaces: { tipo: "Anticipo" | "Compartido" | "Comida" | "Flujo" | "Plan" | "Ciclo"; href: string }[];
}
```

Reglas del DTO:

- `claveEfimera` es solo de presentación; no se usa como identidad financiera ni se
  persiste.
- `importe=null` obliga a `estado=No disponible` o `Revisar` con motivo; nunca se
  serializa como `"0.00"`.
- `cobertura` no se colapsa con `estado`: una fila `Pendiente` puede ser `Parcial`.
- `enlaces` solo contienen IDs/rutas de consulta; no incluyen importes ni datos
  financieros en la URL.
- No se incluye un campo `total` ni `suma` entre tipos.

### 5.5 Filters, ordering and navigation

- Filtros: `tipo`, `estado`, `ciclo`, `ejercicio`, `cobertura` y texto por ID/nombre.
- Por defecto: abiertos/accionables; histórico y resueltos requieren acción explícita.
- Orden: severidad (Revisar/No disponible antes que Pendiente/Exceso), luego fecha de
  hecho descendente, luego ID estable ascendente. El orden es determinista.
- Navegación:
  - Anticipo → ficha `REFxxx` y, si existe, foto de apertura del ciclo.
  - Compartido → ficha `REFxxx`, Gastos/Partidas y aportaciones acreditadas.
  - Comida → bloque Comida del ciclo y operaciones/reposiciones de Revisión Comida.
  - Conciliación → Comida del ciclo + Ciclo + Flujo.
  - Flujo/Plan → vista del ciclo con la métrica y su cobertura.
- Volver conserva filtros y selección; no usa `localStorage` para datos financieros.
- No hay acciones de escritura en la vista; solo enlaces a los formularios autorizados
  de cada módulo.

## 6. Integration with Plan and Flow

### 6.1 Plan del ciclo

| Caso | Ejecutado R3 | A transferir | Efecto E3.6 |
| --- | --- | --- | --- |
| Gasto con Referencia de Compartido | Incluido por Partida, importe íntegro | Sin cambio | Se muestra el Neto compartido como contexto, no como ejecución. |
| Gasto con Referencia de Anticipo | Incluido por Partida, importe íntegro | Sin cambio | No se compensa con devoluciones. |
| Devolución de Anticipo | No ejecuta | Sin cambio | Se muestra en el caso, no en el Plan. |
| Aportación de Compartido | No ejecuta Aportación (tiene Referencia) | Sin cambio | Se muestra en el caso, no en el Plan. |
| Transferencia interna de Compartido | No ejecuta Aportación (tiene Referencia) | Sin cambio | No acredita recuperación. |
| Comida auxiliar | No crea Gasto | Sin cambio | Bloque separado; no altera Plan. |

Regla: **E3.6 no crea un Plan neto ni descuenta recuperaciones del Ejecutado.** El Plan
conserva su autoridad R3; E3.6 solo explica qué hechos quedan fuera y por qué.

### 6.2 Flujo mensual

La vista ajustada se compone así:

1. Leer `G_b` del motor E2.6 (Gastos centrales del ciclo, una vez).
2. Leer del motor Compartidos los Gastos elegibles del ciclo y su Recuperado atribuido
   (`R_adj`) según Q-S21-01.
3. Calcular `G_n = G_b − R_adj`.
4. Leer ingresos y extraordinaria del motor E2.6.
5. Calcular `S_aj` solo si los tres componentes son verificables; en otro caso No
   disponible con componentes conocidos aparte.
6. Mostrar por separado:
   - Gasto bruto E2.6 (base).
   - Ajuste por Neto Compartido (negativo o positivo; nunca un segundo gasto).
   - Gasto neto ajustado.
   - S bruto E2.6 y S ajustado, ambos Parcial.
   - Memoria de caja: aportaciones de Compartidos cobradas en el ciclo, sin sumarlas a
     ingresos.
   - Pendientes de Comida/Anticipos como enlaces, no como ajustes del flujo.
7. No restar Comida, devoluciones de Anticipo, reposiciones ni gastos terminales ya
   contabilizados.

### 6.3 Reglas de no duplicación

| Hecho | Dónde se cuenta | Dónde no se vuelve a contar |
| --- | --- | --- |
| Gasto compartido bruto | Gasto bruto E2.6 y Bruto del caso | No se suma otra vez como Neto. |
| Aportación de tercero | Recuperado del caso; ajuste `R_adj` del flujo | No es Ingreso, no es Gasto, no ejecuta Plan. |
| Devolución de Anticipo | Recuperado del Anticipo | No es Ingreso, no reduce Gasto, no ejecuta Plan. |
| Detalle de Comida | Bloque Comida (auxiliar) | No crea Gasto central ni se suma a Movimientos. |
| Reposición de Comida | Reposiciones del bloque Comida | No es recurso del flujo central ni Ingreso. |
| Gasto de terminal | Gasto bruto una vez | La Transferencia de financiación no es Gasto/Ingreso. |
| Cuota ordinaria | Gasto bruto una vez | No se resta otra vez como deuda. |
| Amortización extraordinaria | Línea separada | No es Gasto bruto. |

## 7. Screens and interfaces

Reutiliza shell, tokens, tabla/tarjetas, foco y mensajes existentes. Tema claro. Sin
nuevo tema, librería ni gráficos que oculten ausencias. Los importes son ficticios.

### W1 — Pendientes y conciliación, escritorio 1440

```text
┌ MyFinanzas · Pendientes y conciliación ───────────────────────────────────────────┐
│ Ciclo [01/10/2026 → 31/10/2026 v]   Ejercicio [2026 v]   [Actualizar]             │
│ Tipo [Todos v]  Estado [Abiertos v]  Cobertura [Todas v]  Buscar [REF/ID/nombre]  │
│ Aviso: no se suman importes entre tipos; cada fila pertenece a su motor.           │
├───────────────────────────────────────────────────────────────────────────────────┤
│ Tipo        Caso / fuente          Ciclo        Ejercicio  Magnitud      Importe   │
│ Anticipo    REF013 · Laura         20/09–19/10  2026       Neto pend.    600,00 €  │
│             [Pendiente · Verificada]                       [Abrir ficha]           │
│ Compartido  REF014 · Piso 2026     01/10–31/10  2026       Pend. terc.   150,00 €  │
│             [Pendiente · Parcial]  ⚠ Exceso Álex 150,00 €  [Abrir ficha]           │
│ Compartido  REF015 · Cena          —            2026       Revisar       —         │
│             [Revisar · Parcial]  Recuperado sin cuota      [Ver motivo]           │
│ Comida      Ciclo 01/10–31/10     01/10–31/10  2026       Falta reponer 25,00 €   │
│             [Pendiente · Parcial]  [Abrir Comida]                                  │
│ Conciliación Ciclo 01/10–31/10    01/10–31/10  2026       Diferencia    90,00 €   │
│             [Alerta · Verificada]  [Abrir detalle]                                 │
│ Comida      Ciclo 01/12–31/12     —            —          —              —         │
│             [No disponible]  Motor E3.5 no integrado / FIN_NETA ausente [Motivo]   │
├───────────────────────────────────────────────────────────────────────────────────┤
│ 6 filas · 3 Pendiente · 1 Revisar · 1 Alerta · 1 No disponible · 1 exceso         │
│ [Ver histórico/resueltos]  [Ver Flujo ajustado del ciclo]  [Ver Plan del ciclo]   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Notas: no hay «total pendiente» global. El exceso se muestra junto al pendiente del
otro participante, sin compensarlos. La fila No disponible no muestra 0,00 €.

### W2 — Pendientes y conciliación, móvil 390

```text
┌ Pendientes y conciliación ─────────────┐
│ Ciclo 01/10 → 31/10 · Ej. 2026         │
│ [Tipo v] [Estado v] [Cobertura v]      │
│ Buscar [REF/ID/nombre]                  │
├────────────────────────────────────────┤
│ Anticipo · REF013 · Laura              │
│ Neto pendiente      600,00 €           │
│ Pendiente · Verificada                 │
│ [Abrir ficha]                          │
├────────────────────────────────────────┤
│ Compartido · REF014 · Piso 2026        │
│ Pendiente terceros  150,00 €           │
│ Pendiente · Parcial                    │
│ ⚠ Exceso Álex 150,00 € (separado)      │
│ [Abrir ficha]                          │
├────────────────────────────────────────┤
│ Comida · Ciclo 01/10–31/10             │
│ Falta por reponer    25,00 €           │
│ Pendiente · Parcial                    │
│ [Abrir Comida]                         │
├────────────────────────────────────────┤
│ Conciliación · Ciclo 01/10–31/10       │
│ Diferencia           90,00 €           │
│ Alerta de conciliación · Verificada    │
│ [Abrir detalle]                        │
├────────────────────────────────────────┤
│ Comida · Ciclo 01/12–31/12             │
│ No disponible                          │
│ Motor E3.5 no integrado / FIN_NETA     │
│ [Ver motivo]                           │
└────────────────────────────────────────┘
```

Las tarjetas conservan etiqueta, estado, cobertura y motivo; no dependen del color. El
foco inicial va al título de la página y el orden de tabulación sigue el orden visual.

### W3 — Detalle de fila / conciliación

```text
┌ Detalle · Conciliación de apertura ───────────────────────────────────────────────┐
│ Ciclo 01/10/2026 → 31/10/2026 · Siguiente Inicio 01/11/2026                       │
│ Saldo inicial siguiente (manual)        295,00 €   Ciclos · manual                 │
│ Cierre analítico Comida                 205,00 €   E3.5 · lectura completa         │
│ Diferencia                               90,00 €   Solo aviso                      │
│ Cobertura: lectura completa · evidencia verificada · rango cubre la ventana       │
│ Esto no es un cierre financiero ni modifica el saldo inicial.                     │
│ [Abrir Comida del ciclo] [Abrir Ciclo] [Volver a pendientes]                       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Si la cobertura no es completa: «Conciliación no disponible» con el motivo; no se
muestra la diferencia como definitiva.

### W4 — Flujo ajustado por Neto Compartido

```text
┌ Flujo del ciclo · 01/10/2026 → 31/10/2026 ────────────────────────────────────────┐
│ Base E2.6                                                                          │
│ Ingresos del ciclo                     800,00 €   Verificado                        │
│ Gasto bruto registrado                 450,00 €   Verificado como bruto            │
│ Ajuste Neto Compartido                −300,00 €   Neto central · REF014            │
│ Gasto neto ajustado                    150,00 €   Parcial · Q-S21-01               │
│ S bruto E2.6                          350,00 €    PARCIAL                          │
│ S ajustado                            650,00 €    PARCIAL · no es ahorro real      │
│ Memoria de caja: aportaciones cobradas 300,00 €   No es Ingreso                    │
│ Comida: bloque separado                 [Abrir Comida]                            │
│ Anticipos: solo enlaces                 [Abrir Anticipos]                          │
│ [Ver hechos] [Ver fuentes y cobertura]                                             │
└───────────────────────────────────────────────────────────────────────────────────┘
```

El ejemplo es ficticio y no cuadra con los importes de W1; solo ilustra la sustitución.
`Gasto bruto + Neto` no se muestra en ninguna variante. Si `R_adj` no es verificable,
`Gasto neto ajustado` y `S ajustado` son No disponible; el bruto y S bruto E2.6 siguen
visibles.

### W5 — Vacío, carga, error y parcial

```text
Vacío:       «No hay pendientes abiertos para este filtro.»
             [Ver histórico/resueltos] [Limpiar filtros]
Cargando:    esqueleto con etiquetas; sin importes provisionales.
Error:       «No se pudo leer <motor>. El resto de fuentes sigue disponible.»
             [Reintentar] [Ver alcance]
Parcial:     «Subtotal conocido; cobertura parcial.» + motivo + enlace a la fuente.
No disponible: «No disponible — <motivo>». Sin 0,00 € ni guion ambiguo.
Sesión:      conserva filtros/selección y pide reautenticar; sin datos en la URL.
```

## 8. Empty, loading and error states

| Estado | Comportamiento |
| --- | --- |
| Sin pendientes | «No hay pendientes abiertos»; no es un total cero de todas las magnitudes. |
| Sin ciclos | Sin periodo seleccionado; no se inventa ciclo actual. |
| Sin referencia/corte | No disponible con motivo; no se usa el reloj. |
| Carga | Sin importes provisionales ni filas ficticias. |
| Error de un motor | Se conserva el contexto de las demás fuentes; solo se bloquean los agregados dependientes. |
| Respuesta antigua | No sustituye la selección nueva; se marca desactualizada. |
| Parcial | Subtotal conocido etiquetado Parcial; no se presenta como total. |
| No disponible | Motivo visible; sin cifra; no se convierte en cero. |
| Conflicto de revisión | 409; conserva filtros y borrador de consulta; exige releer. |
| Sesión expirada | 401; conserva selección; no expone datos financieros. |
| Error de enlace | El caso ya no existe o no es accesible; mensaje seguro y vuelta a la lista. |

## 9. API behavior and external dependencies

Propuesta de solo lectura; no implementada. Las rutas definitivas y su forma requieren
aprobación técnica.

| Operación propuesta | Contrato |
| --- | --- |
| `GET /api/pendientes` | Lista paginada de `TransversalItem`; filtros `tipo`, `estado`, `ciclo`, `ejercicio`, `cobertura`, `texto`; sin total económico entre tipos. |
| `GET /api/pendientes/:tipo/:fuenteId` | Detalle de una fila y sus enlaces; 404 si la fuente no existe; no crea ni corrige nada. |
| `GET /api/conciliacion/ciclos/:id` | Diferencia S0 siguiente vs cierre analítico cuando exista proveedor y cobertura; estado y motivo. |
| `GET /api/flujo-mensual/:id` | Se amplía, si se aprueba, con `ajusteCompartidos` y `flujoAjustado`; conserva las métricas E2.6. |

Reglas:

- Todas las rutas reutilizan autenticación/MFA, autorización, `no-store`, errores
  genéricos con `requestId`, SQL parametrizado y límites de paginación existentes.
- No hay `POST`, `PATCH` ni `DELETE` en E3.6. Las acciones navegan a los servicios
  autorizados de cada módulo.
- La consulta compone una revisión coherente: si cambia una fuente, no mezcla revisiones
  incompatibles; conserva la selección y reintenta.
- La paginación no trunca agregados; los enlaces no incluyen importes ni datos
  financieros.
- Sin dependencias externas nuevas, sin acceso a Excel, sin integración bancaria.
- Los errores no revelan SQL, evidencia sensible ni datos de otro caso.

## 10. Validation and edge cases

- IDs inválidos/inexistentes: 404/422 seguro; sin datos parciales de otro caso.
- Filtros contradictorios o fuera de rango: 422; no se corrige silenciosamente.
- Importes: cero, negativos, netos negativos y excesos se conservan; no se normalizan.
- Céntimos: suma exacta; sin float; sin redondeo por componente.
- Fechas: civiles ISO; límites inclusivos; sin conversión por zona horaria.
- Cruce de ciclo/ejercicio: se muestran ambos; no se sustituye uno por otro.
- Ciclo abierto sin corte: No disponible para métricas que lo requieren; no se inventa
  Fin.
- Operación posterior al corte: fuera del análisis, visible como fuera de corte.
- Foto de apertura ausente: No disponible; no se usa el pendiente actual.
- Compartido sin terceros con cuota: puede estar Cerrado con coste propio; no se inventa
  Recuperado.
- Tercero con aportaciones y sin cuota: Revisar; no se divide entre cero.
- Exceso y pendiente simultáneos: se muestran separados; no se compensan.
- Gasto inválido en Compartido: Revisar; no computa en Bruto; bloquea Cerrado.
- Comida sin reposición: «Sin reposición»; nunca Completada.
- Reposición tardía: cuenta en su ciclo; no se atribuye al anterior.
- FIN_NETA ausente: Recursos/cierre/diferencia No disponible; no se usan entradas
  brutas.
- Conciliación sin proveedor: No disponible; no se simula.
- Intento de escritura desde E3.6: rechazo; no existe ruta.
- Concurrencia: una respuesta obsoleta no se mezcla; se conserva la selección.
- Reinicio/restore: la vista se recalcula desde fuentes; no persiste derivados.

## 11. Exclusions

No implementación, código, SQL/DDL/migración, datos reales, Excel, VPS, CI remoto,
push/PR/merge, despliegue ni pruebas funcionales.

No se incluye:

- Cierres operativos, locks, reapertura, re-cierre, snapshots o proveedor de Cierres.
- Segundo maestro de casos, tabla de pendientes persistida, motor de Neto paralelo o
  estados financieros artificiales.
- Cálculo de Neto de Compartidos distinto del motor central; reparto manual del
  Recuperado global; conversión de aportaciones en Ingresos.
- Recalculo de Anticipos, conversión de devoluciones en reposiciones o creación de
  Movimientos.
- Suma de Comida al Gasto bruto, resta de Comida del flujo o segundo Gasto por detalle
  auxiliar.
- Neteo del Plan, descuento de recuperaciones del Ejecutado o nuevas fuentes de
  Presupuesto.
- Atribución cross-ciclo de reposiciones de Comida (Q3 C) o de Recuperado de Compartidos
  sin decisión (Q-S21-01).
- Importación de históricos, equivalencia con v5.11(7), integración bancaria o
  conciliación automática.
- Reanudar DEV17, E4.1, B3, Dev32 u otros frentes.

## 12. DT5 preparatory impact matrix

Esta matriz es **preparatoria**. No define endpoints, locks, re-cierres, snapshots ni
simulaciones de un proveedor inexistente. Las columnas «necesidad futura» son insumos
para E4.8/E4.9, no decisiones operativas.

| Cambio relevante | Magnitudes/consumidores potencialmente afectados | Periodos/ciclos/años afectados | Dependencia de cierre/fotografía | Necesidad futura (candidata) | Autoridad/decisión abierta |
| --- | --- | --- | --- | --- | --- |
| Alta/rectificación/anulación de Movimiento (Ingreso/Gasto/Transferencia/Amortización) | Saldos, Gasto bruto, S, Plan R3, Compartido bruto, Anticipo, Comida (referencia), Deuda | Ciclo de la fecha; año natural; posible cruce | Todo cierre que incluya el hecho y su foto | Revisar si el ciclo está abierto; bloquear o exigir reapertura si cerrado; invalidar vistas vivas, no fotos | E1.4/spec12; DT5/DT4 |
| Creación/renombrado/desactivación de Referencia | Identidad de casos, nombres, agrupación, enlaces | Todos los ciclos/años con hechos de la REF | La foto conserva ID/nombre de la versión | Renombrar no cambia ID; desactivar no borra historia; revisar impacto si hay hechos | E1.5/P2; spec13/spec14 |
| Cambio de tipo de Referencia | Anticipo/Compartido/Comida/Vehículo, motores y validaciones | Todos los hechos de la REF | Identidad y tipo en foto | Bloqueo si hay hechos; no conversión retroactiva | E1.5/P2; spec13/spec14 |
| Cambio de participante o reparto de Compartido | Asignado, pendiente, exceso, Neto por Gasto/Partida, flujo ajustado | Ciclos de los Gastos; años naturales | Foto de Neto/atribución si se incluye | Vista de impacto, motivo, auditoría; revisar protección de cierre | spec14 D7; DT5 |
| Acreditación/retirada de rol o par de Anticipo | Adelantado, Recuperado, Neto, Exceso, foto de apertura | Ciclos de las Transferencias; foto por REF+Ciclo | Foto de apertura y cierres que la incluyan | Revisar impacto y evidencia; no reasignar pares; bloquear si foto/cierre no verificable | spec13 Q9/H1/Q8 |
| Acreditación/rectificación/anulación de aportación de Compartido | Recuperado, Neto, cobertura, flujo ajustado | Ciclos de Gastos y aportaciones; años | Foto de Neto/atribución | Revisar impacto; anulación excluye del motor; no borrar hecho | spec14 D4/D5; DT5 |
| Devolución de Anticipo | Transferencia, Saldos, Recuperado, Neto, Exceso | Ciclo de la devolución; foto de apertura del caso | Cierre que incluya la Transferencia o la foto | No ejecuta Plan; revisar si el ciclo está cerrado; conservar foto | spec13; spec09 |
| Clasificación/rectificación/anulación de Comida | Gasto comida, Compensable, Reposiciones, Falta, cobertura, referencia temporal | Ciclo de la operación; año natural | Foto/cierre si E3.5 se incluye en él | Revisar cobertura; no normalizar históricos; invalidar agregados vivos | spec16/spec18; E3.5 pendiente |
| Alta/anulación de Reposición | Reposiciones, Falta, Recursos, CIERRE analítico | Ciclo de la reposición; no se atribuye a otro | Foto/cierre si E3.5 se incluye | Revisar; no completar por ausencia; no reatribuir cross-ciclo | spec16; spec18 Q3 C |
| Cambio de Saldo inicial comida (S0) | Recursos, CIERRE, DIF, conciliación, alerta | Ciclo actual y siguiente Inicio | Foto de apertura/cierre si existe | No autorrellenar; alerta de diferencia; revisar impacto | E2.1/DT3/R4 |
| Creación/rectificación de Ciclo | Ventana, Fin, corte, referencia, todos los consumidores | Ciclo y ciclos posteriores; años naturales | Fotos y cierres dependientes | Revisar límites y continuidad; bloquear si afecta cierre/foto | E1.3/E2.1/DT3/DT5 |
| Cambio de línea de Plan (Base/Esencial/Del mes) | A transferir, Pendiente/Estado, márgenes del flujo | Ciclo; año solo si el Plan anual lo consume | Plan final de la foto de cierre | Revisar impacto; no versionar cada edición; bloquear si hay cierre | E2.3/P1/DT3 |
| Cambio de fuente/destino de Presupuesto o vínculo Partida→Presupuesto | Ejecutado R3, pendiente, estado, flujo | Ciclos afectados; años del Plan anual | Foto de ejecución/Plan | Vista de impacto completa; bloquear si cobertura insuficiente | E2.2/E2.3/DT5 |
| Cambio de `FIN_NETA` o disponibilidad del proveedor E3.5 | Recursos, CIERRE, DIF, alerta de Comida | Ciclos de Comida; años | Foto/cierre si se incluye | No reconstruir desde brutos; No disponible; revisar al integrar | E3.5 pendiente; DT5 |
| Cierre/reapertura futura | Todas las magnitudes y fotos | Ciclo cerrado y posteriores | Núcleo de DT4/DT5 | Fuera de E3.6; solo matriz preparatoria | E4.8–E4.11/P5/DT4/DT5 |

Lectura de la matriz:

- **Bloqueo** es una necesidad futura candidata cuando el hecho pertenece a un ciclo con
  protección de cierre; no se implementa aquí.
- **Alerta** es suficiente cuando la diferencia es revisable y no invalida la foto.
- **Revisión** exige vista de impacto, motivo y auditoría antes de confirmar.
- **Invalidación** afecta a vistas vivas/revisiones, nunca a fotos inmutables.
- **Sin efecto** no se usa para hechos con impacto económico; solo para metadatos
  descriptivos sin consumidores.

## 13. Traceability to E3.6 roadmap

| Criterio de roadmap | Comprobaciones de esta spec |
| --- | --- |
| **E3.6-AC1** — el flujo incorpora el Neto compartido central y no descuenta dos veces Anticipos/Comida | AC-01, AC-02, AC-03, AC-04, AC-07, AC-22, AC-24, AC-25 |
| **E3.6-AC2** — la Referencia no cambia el tipo del Gasto | AC-05, AC-06, AC-21, AC-24 |
| **E3.6-AC3** — alerta de conciliación distinta de rechazo estructural, con navegación al caso | AC-13, AC-14, AC-16, AC-17, AC-18, AC-19 |
| Pruebas de roadmap: caso compartido multi-Partida, devolución excluida de ejecución, saldo inicial discrepante, periodos/años distintos | AC-03, AC-05, AC-06, AC-10, AC-13, AC-23 |
| DT5: matriz de impacto preparatoria | AC-29 |
| Dependencias E3.1/E3.2/E3.4/E3.5/E2.6 | AC-09, AC-10, AC-11, AC-12, AC-14, AC-15 |

## 14. Acceptance checks

Diseño de pruebas, **no ejecutadas**. Todos los AC nuevos quedan UNRUN. Las
precondiciones que dependen de E3.5 se ejecutarán solo si ese motor se integra y acepta;
mientras tanto, el resultado observable es No disponible.

| ID | Acción / precondiciones | Resultado observable esperado | Trazabilidad |
| --- | --- | --- | --- |
| **E3.6-AC-01** | Ciclo con Gastos compartidos brutos 450,00 € y Recuperado acreditado 300,00 €; motor Compartidos instalado. | Gasto neto ajustado 150,00 €; se muestra la sustitución, no un segundo gasto; no aparece un Ingreso de 300,00 €. | E3.6-AC1 |
| **E3.6-AC-02** | Vista ajustada con Bruto 450,00 € y Neto 150,00 €. | Nunca se muestra 600,00 € ni «Bruto + Neto»; el Neto solo aparece como ajuste/sustitución. | E3.6-AC1 |
| **E3.6-AC-03** | Anticipo con adelanto 1.000,00 € y devolución 400,00 €; Plan del ciclo con línea afectada. | A transferir y Ejecutado R3 no cambian por la devolución; no se crea Ingreso/Gasto; no se ejecuta dos veces el Plan. | E3.6-AC1 |
| **E3.6-AC-04** | Comida con detalle auxiliar, devolución de Anticipo y `FIN_NETA` ya neta. | Comida no crea Gasto central ni se resta del flujo; `FIN_NETA` se usa una vez; `DEV_ANT` no se resta otra vez. | E3.6-AC1 |
| **E3.6-AC-05** | Gasto con Referencia de Compartido/Anticipo, con Partida. | Conserva Tipo Gasto, Partida, fecha e importe; ejecuta Plan por Partida; la Referencia no lo convierte en Transferencia. | E3.6-AC2 |
| **E3.6-AC-06** | Caso con G1 300 P1, G2 150 P2, tres participantes 1:1:1. | Cada Gasto/Partida conserva identidad e importe; Neto por Gasto/Partida suma el caso; no hay reparto manual. | E3.6-AC2 |
| **E3.6-AC-07** | Reparto parcial, completo, exceso y Cerrado con coste propio positivo. | Estados correctos; Cerrado sin pendientes/excesos aunque Neto>0; exceso íntegro; sin compensación cruzada. | E3.6-AC1/AC2 |
| **E3.6-AC-08** | Tercero A pendiente 150 y tercero B exceso 150. | Reparto parcial + alerta de exceso simultánea; ambos importes separados; no se anulan. | E3.6-AC1 |
| **E3.6-AC-09** | Anticipo con foto de Neto apertura 1.000 y pendiente actual 600. | La foto muestra 1.000; el pendiente actual 600; no se sustituyen; sin foto → No disponible. | E3.6-AC1 |
| **E3.6-AC-10** | Anticipo adelantado en C1 y devolución en C2. | Pendiente actual correcto; foto de C2 intacta; Plan no ejecutado dos veces; flujo sin Ingreso/Gasto por la devolución. | E3.6-AC1 |
| **E3.6-AC-11** | Comida con Comida 40, Pendiente revisar 30, Ocio 25, Niños 10, Otros 10, Fuera presupuesto 15, reposición 20. | Gasto comida 70; Compensable 45; Falta 25; Fuera presupuesto excluido del análisis y conservado en banco. | E3.6-AC1 |
| **E3.6-AC-12** | Reposición parcial y reposición tardía en el ciclo siguiente. | Parcial, no Completada; la tardía cuenta en su ciclo, no en el anterior; no se persiste atribución. | E3.6-AC1 |
| **E3.6-AC-13** | S0 siguiente 295 y cierre analítico 205, con cobertura verificable. | Diferencia 90 como alerta; no se modifica S0; no se crea asiento; sin cobertura → No disponible. | E3.6-AC3 |
| **E3.6-AC-14** | Sin motor E3.5, sin FIN_NETA, sin proveedor de Cierres o sin cobertura. | Fila/métrica No disponible con motivo; no 0; no «Coincide»; no reconciliación simulada. | E3.6-AC3 |
| **E3.6-AC-15** | Periodo verificable sin hechos frente a fuente ausente. | Sin hechos → 0 verificado en la métrica aplicable; fuente ausente → No disponible. | E3.6-AC1 |
| **E3.6-AC-16** | Transferencia de Anticipo sin rol/par, aportación interna presentada como recuperación, participante de otra ficha, importe/fecha inválidos. | Rechazo estructural atómico; sin escritura parcial; no aparece como alerta de conciliación. | E3.6-AC3 |
| **E3.6-AC-17** | Hecho histórico sin acreditación o con conflicto. | Se conserva; se muestra Revisar con motivo y enlace; no computa en el total acreditado; cobertura Parcial/ND. | E3.6-AC3 |
| **E3.6-AC-18** | Filtrar por tipo, estado, ciclo, ejercicio y cobertura. | Resultados correctos y deterministas; no se mezclan ciclo y año; no hay total económico global. | E3.6-AC3 |
| **E3.6-AC-19** | Abrir cada tipo de fila y volver. | Navega a ficha/caso/Comida/Flujo/Plan; no hay escritura desde E3.6; se conservan filtros y selección. | E3.6-AC3 |
| **E3.6-AC-20** | Inspeccionar la vista y sus claves. | No hay tabla/maestro nuevo; claves efímeras; IDs de fuente visibles; no se persisten estados ni Netos. | E3.6-AC1/AC3 |
| **E3.6-AC-21** | Métrica con fuente parcial, otra completa y otra no disponible. | Cada métrica conserva su cobertura; no se colapsa en un único estado; subtotal parcial no es total. | E3.6-AC1 |
| **E3.6-AC-22** | Neto negativo, exceso, cero explícito y céntimos. | Signo y cero conservados; suma exacta; sin float ni redondeo; sin truncar exceso. | E3.6-AC1 |
| **E3.6-AC-23** | Gasto 28/12/2026 en ciclo 20/12–19/01 y aportación 10/01/2027. | Se muestran ciclo y año natural por separado; Plan anual usa 2026; flujo usa ciclo; la atribución del Recuperado es explícita. | E3.6-AC1/AC3 |
| **E3.6-AC-24** | Gasto de terminal, su Transferencia de financiación, cuota, extraordinaria y reposición. | Gasto terminal una vez; Transferencia no es Gasto/Ingreso; cuota no se resta dos veces; extraordinaria separada; reposición solo en Comida. | E3.6-AC1 |
| **E3.6-AC-25** | Vista con flujo real, Plan, saldo patrimonial, provisión y pronóstico. | Se muestran separados; no se suman ni se sustituyen; la vista ajustada no se llama flujo completo ni ahorro real. | E3.6-AC1 |
| **E3.6-AC-26** | Cambio de fuente entre carga y respuesta; dos consultas concurrentes. | No se mezclan revisiones; se conserva la selección; una respuesta antigua no sustituye la nueva. | E3.6-AC1/AC3 |
| **E3.6-AC-27** | 390 y 1440; teclado, foco, estados vacío/carga/error/parcial/ND. | Tabla/tarjetas legibles; etiquetas y texto además de color; sin overflow; foco correcto; sin importes ficticios. | E3.6-AC3 |
| **E3.6-AC-28** | Acceso sin sesión/MFA, errores, URL manipulada, intento de escritura. | 401/403/4xx seguro; sin SQL, importes ni datos en logs/URL; no existe POST/PATCH/DELETE de E3.6. | E3.6-AC3 |
| **E3.6-AC-29** | Revisar la matriz DT5 y el alcance de Cierres. | La matriz cubre Movimiento, Referencia, participante/reparto, acreditación, devolución, Comida, reposición, S0, Ciclo y Plan; no hay endpoints/locks/snapshots. | DT5/E4.8 |
| **E3.6-AC-30** | Revisar la trazabilidad E3.6-AC1/2/3. | Cada criterio de roadmap tiene AC y prueba asociados; no se declara PASS funcional ni aprobación. | Roadmap E3.6 |

## 15. Worked examples (fictional)

### 15.1 Compartido multi-Gasto y multi-Partida

Caso REF014 «Piso 2026»: Titular (Yo), Bea y Álex, partes 1:1:1.

| Gasto | Partida | Importe | Bea | Yo | Álex |
| --- | --- | --- | --- | --- | --- |
| G1 Alquiler | P1 | 300,00 | 100,00 | 100,00 | 100,00 |
| G2 Limpieza | P2 | 150,00 | 50,00 | 50,00 | 50,00 |
| **Total** | | **450,00** | **150,00** | **150,00** | **150,00** |

Álex aporta 300,00; Bea aporta 0,00. Recuperado 300,00; Neto del caso 150,00;
coste propio 150,00; pendiente Bea 150,00; exceso Álex 150,00. Estado: Reparto parcial
con alerta de exceso. Flujo: Bruto 450,00 − ajuste 300,00 = Gasto neto 150,00; nunca
450,00 + 150,00.

### 15.2 Reembolso parcial, completo, exceso y Cerrado con Neto positivo

Caso de 300,00: Titular 100,00; Bea 100,00; Álex 100,00.

| Escenario | Aporta Bea | Aporta Álex | Recuperado | Neto | Estado |
| --- | --- | --- | --- | --- | --- |
| Parcial | 50,00 | 0,00 | 50,00 | 250,00 | Reparto parcial (Bea pendiente 50,00; Álex pendiente 100,00) |
| Completo | 100,00 | 100,00 | 200,00 | 100,00 | Cerrado (coste propio 100,00) |
| Exceso | 100,00 | 200,00 | 300,00 | 0,00 | Excedido (Álex exceso 100,00) |
| Exceso y pendiente | 50,00 | 200,00 | 250,00 | 50,00 | Reparto parcial + alerta de exceso |

El caso «Completo» demuestra que Cerrado no significa Neto cero. El exceso no se
compensa con el pendiente de otra persona.

### 15.3 Anticipo recuperado entre ciclos

- C1 (20/09–19/10): adelanto 1.000,00 a Laura.
- C2 (20/10–19/11): devolución 400,00 de Laura.
- Pendiente actual: 600,00.
- Foto de Neto apertura C2: 1.000,00, confirmada con evidencia; no se sustituye por 600.
- Plan C1/C2: sin ejecución por el adelanto ni por la devolución.
- Flujo C2: la devolución no es Ingreso ni reduce Gasto; se muestra en el caso.
- Si la foto de C2 no existe: Neto apertura C2 No disponible; el pendiente actual sigue
  visible.

### 15.4 Comida con devolución, reposiciones parciales y clasificación pendiente

Ciclo 01/10–31/10; S0 300,00; S0 siguiente 295,00; FIN_NETA 50,00; DEV_ANT 50,00
(informativa).

| Hecho | Fecha | Clasificación | Importe | Efecto |
| --- | --- | --- | --- | --- |
| Detalle salida | 01/10 | Comida | 40,00 | GC_B |
| Detalle salida | 03/10 | Pendiente revisar | 30,00 | GC_B, línea propia |
| Detalle salida | 05/10 | Ocio | 25,00 | CO_B |
| Detalle salida | 08/10 | Niños | 10,00 | CO_B |
| Detalle salida | 10/10 | Otros | 10,00 | CO_B |
| Detalle salida | 12/10 | Fuera presupuesto | 15,00 | FP, excluido |
| Devolución | 15/10 | Comida | 10,00 | GC_D |
| Reposición | 20/10 | — | 20,00 | REP |
| Detalle salida | 31/10 | Comida | 60,00 | GC_B, límite incluido |

```text
GC_B = 130,00; GC_D = 10,00; GC = 120,00
CO_B = 45,00; CO = 45,00; REP = 20,00; FALTA = 25,00
RECURSOS = 300 + 50 + 20 = 370,00
CIERRE = 370 − 120 − 45 = 205,00
DIF = 295 − 205 = 90,00 (solo aviso)
FP = 15,00 (excluido del análisis, conservado en banco)
```

`DEV_ANT` se muestra una vez y no se resta otra vez. `Pendiente revisar` no se suma dos
veces. Si `FIN_NETA` no existe, Recursos/CIERRE/DIF son No disponible.

### 15.5 Discrepancia entre saldo inicial manual y cierre anterior

- Cierre analítico del ciclo anterior: 205,00.
- S0 del ciclo siguiente introducido manualmente: 295,00.
- Diferencia: 90,00, con signo positivo (apertura mayor).
- Se muestra «Alerta de conciliación»; no se corrige 295,00, no se crea Movimiento y no
  se declara cierre.
- Sin cobertura completa o sin proveedor E3.5/Cierres: «Conciliación no disponible»; no
  se muestra 90,00 como definitivo.

### 15.6 Compras y aportaciones en ejercicios distintos; ciclo diciembre/enero

- Gasto compartido: 28/12/2026, 300,00, ciclo 20/12/2026–19/01/2027, ejercicio 2026.
- Aportación: 10/01/2027, 100,00, mismo ciclo, ejercicio 2027.
- Plan anual 2026: incluye el Gasto por Partida y año natural 2026.
- Flujo: usa el ciclo 20/12–19/01; muestra el Gasto y el ajuste según Q-S21-01.
- Vista de pendientes: muestra «Ciclo 20/12–19/01» y «Ejercicio 2026» en el Gasto;
  «Ejercicio 2027» en la aportación.
- No se fuerza la aportación al año 2026 ni el Gasto al año 2027.

### 15.7 Ausencia de E3.5, cobertura histórica o Cierres

- Sin motor E3.5: Comida y conciliación muestran No disponible con motivo; no 0.
- Sin cobertura histórica: «Sin cobertura anterior al primer registro» o «Cobertura
  parcial»; no se rellena con cero.
- Sin proveedor de Cierres: no se muestra una foto/cierre; la conciliación queda No
  disponible; Anticipos/Compartidos disponibles siguen visibles.
- No se simula una reconciliación completada ni se declara E3.6 completo.

## 16. Open decisions and approval gate

### 16.1 Decisiones pendientes

1. **Q-S21-01** — atribución temporal del Recuperado de Compartidos entre ciclos.
2. **Q-S21-02** — convivencia o sustitución del S bruto E2.6 por el S ajustado.
3. **Q-S21-03** — alcance por defecto de la vista (abiertos vs todos).
4. **Q-S21-04** — presentación de Comida cuando E3.5 no está integrada.

Las propuestas recomendadas están en el
[brainstorming §3](21-pendientes-conciliacion-brainstorming.md#3-preguntas-materiales-pendientes).
No se asumen aprobadas.

### 16.2 Gate

- Esta specification no está aprobada.
- No autoriza desarrollo, SQL, migraciones, pruebas funcionales, push, PR ni merge.
- La revisión independiente de Álex debe comprobar: fórmulas, no duplicación, estados,
  cobertura, navegación, wireframes, DT5 y dependencias E3.5/Cierres.
- Solo tras aprobación explícita del usuario podrá evaluarse una autorización separada
  de desarrollo.

## 17. Test design

El [testplan](21-pendientes-conciliacion-testplan.md) mapea cada AC a escenario
positivo/negativo/límite, resultado observable, método previsto, dependencia y estado.
Todas las pruebas nuevas quedan **UNRUN**; no se declara PASS funcional, QA independiente
ni aprobación.
