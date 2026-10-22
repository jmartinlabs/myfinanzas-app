# 07 — E2.1 Operación de Ciclos y apertura revisable: Brainstorming
Status: DRAFT — Q1/Q2 respondidas; especificación/wireframes y desarrollo NO aprobados.
Roadmap/context: [E2.1](roadmap.md#e21--operación-de-ciclos-y-apertura-revisable),
[R3/R4](functional-reference-v5.11.md), [spec 03](03-ciclos-financiados-specification.md).
Next action: revisar spec07 completa y wireframes propuestos; esperar aprobación expresa, sin desarrollo.

## Autorización y procedencia — 2026-10-22
Fuente: usuario en la ejecución activa de `$orchestrate`: «Autorizo iniciar la
especificación funcional de E2.1 en paralelo con el desarrollo de E1.6». Autoriza
preparación documental, no implementar E2.1 ni aprobar sus decisiones automáticamente.
Identificador 07 libre comprobado antes de crear este archivo. Base de trabajo:
main da543f3, worktree aislado docs/07-ciclos-operacion; actualizado después por
fast-forward a 7c5c7d1b (PR #33, solo AGENTS y contrato de coordinación), preservando
este borrador. Instrucciones actualizadas leídas; este paquete no cambia reglas
ni el tablero. Las prohibiciones históricas de spec07 durante la adopción no
invalidan esta autorización posterior.

Referencia financiera única vigente: v5.11(7), candidata NO estable. Codex solo
ha leído las fuentes sanitizadas, sin inspeccionar el libro físico ni datos reales.
Sin cambios de código, SQL, infraestructura, Dev 32, despliegue o merges.

## Confirmado: no reabrir
- E2.1 es la siguiente entrega del roadmap; no existe E1.7. E1.3 y E1.4 están
  integradas y son sus dependencias directas. No necesita esperar a E1.6 para
  especificarse; E1.6 desarrolla otro ámbito en worktree distinto.
- Un solo maestro Ciclos. Inicio y saldo inicial comida son entradas manuales;
  Mes financiado = primer día del mes siguiente a Inicio, Fin = siguiente Inicio
  menos un día. Mes/año financiado e Inicio únicos, sin distancias mínimas nuevas.
- Cero y negativos explícitos de saldo comida válidos; vacío no es cero. No copiar
  cierre anterior, crear reposición, Gasto, ingreso ni Nómina al abrir o corregir.
- Fin temporal no es cierre financiero. No cerrar, reabrir ni crear fotografías
  en E2.1. Crear antes del cobro está permitido; no vetar Inicio futuro por reloj.
- Q1–Q3 de E1.3 siguen aprobadas: actual por intervalo inclusivo de referencia;
  sin referencia, No disponible; antes del primer Inicio, sin ciclo actual;
  último abierto anticipado no sustituye al actual y no tiene corte aplicable
  si la referencia precede al Inicio. No fecha manual ni fallback al reloj.
- Referencia desde máximos de hechos reales disponibles, con cobertura por fuente.
  Instalada vacía no es fallo; error de instalada no se ignora. Comida e inversión
  no entregadas se identifican pendientes y no aportan fechas inventadas.
- Rectificar periodos no debe editar el importe/fecha/ID de Movimientos ni crear
  un segundo catálogo de ciclos. La atribución por fecha se deriva del maestro.
- P5: rectificar un cierre antiguo no se habilita por esta entrega. Las guardas de
  cierre serán efectivas al existir el cierre real; no presentarlas como instaladas.
- Precarga del siguiente plan sigue fuera de E2.1: E2.3 especificará su decisión
  DT3 junto al plan operativo. No hay plan que copiar en el runtime actual.

## Estado comprobado de consumidores y cobertura
Lectura de `apps/api/src/ciclos.ts`, `cycle-schema.ts`, `movimientos.ts`, `app.ts`
y `apps/web/src/Ciclos.tsx` sobre esta base:
- Alta/consulta existentes; altas posteriores al último Inicio. Triggers actuales
  impiden UPDATE/DELETE e inserción intermedia. Cambiarlos requerirá el futuro
  desarrollo autorizado de E2.1, no se ejecuta aquí.
- Mes, Fin, corte y cabecera derivan del maestro completo; Movimientos lo utiliza
  para atribución y revisión de impacto. El saldo comida carece hoy de motor consumidor.
- Solo Movimientos aporta fechas reales de referencia. Revisión Comida e inversión
  siguen pendientes. No existe cierre financiero ni saldo de cierre comida calculable.
- E3.5 entregará Revisión Comida y E4 incorporará inversión; el roadmap exige
  revalidar con esas fuentes al incorporarlas, sin cambiar el maestro.

La comparación numérica con cierre comida real NO puede acreditarse en el runtime
actual. El contrato de aviso sin autorrelleno ya está confirmado; no se pregunta
otra vez su conveniencia. En la especificación se separarán apertura/rectificación
operativas de la integración real con E3.5. Esta brecha debe quedar visible: no
inventar cierre manual, cero, tabla vacía o motor simulado; no declarar ejecutado
E2.1-AC2 con solo un stub o un aviso de fuente pendiente. La aprobación de la futura
spec deberá explicitar esa cobertura y su comprobación posterior.

## Round 1 — 2026-10-22
Las casillas marcadas son recomendaciones, NO respuestas del usuario.

### Q1 — Rectificación de periodos ya utilizados
E1.3 dejó para E2.1 inserciones intermedias y rectificaciones con impacto revisado.
Falta decidir qué hacer si mover un Inicio cambia la atribución de hechos existentes.
¿Confirmamos permitirlo por procedimiento explícito de rectificación?

- [x] Recomendado: permitir insertar un ciclo omitido y rectificar Inicio/saldo
  comida de un ciclo existente, también si hay Movimientos afectados, mediante
  vista previa antes/después, motivo obligatorio y confirmación explícita. El ID
  existente se conserva; cambiar Inicio respeta el orden entre sus vecinos y la
  unicidad de Inicio/mes financiado. La vista muestra intervalos/meses afectados,
  hechos que cambian de ciclo o quedan sin ciclo y avisos de cobertura. Confirmar
  recalcula la atribución desde las fechas originales, sin modificar los hechos.
  Corregir saldo comida nunca modifica automáticamente el saldo del siguiente
  ciclo. No DELETE, fusión, reordenación arbitraria de IDs ni saltos sobre vecinos.
  Es un contrato nuevo de la app, no una fórmula física atribuida al Excel.
- [ ] Alternativa conservadora: permitir solo inserciones/cambios de Inicio sin
  hechos afectados; bloquear los demás hasta una especificación posterior de
  rectificación histórica. Reduce capacidad de corrección de E2.1 y deja los
  errores de periodificación con hechos sin resolver en esta entrega. Saldo comida
  seguiría siendo revisable explícitamente, sin propagación al siguiente ciclo.

Confirmed answer: PENDING; source/date: PENDING.

Con cualquiera de las opciones, revalidar el contexto en la confirmación; un cambio
concurrente exige nueva revisión, sin guardar parcialmente. No autorizar cambios
sobre futuros cierres protegidos por analogía. Si un consumidor instalado falla o
no puede determinar impacto, no confirmar una revisión presentada como completa.
El caso «fuente aún no entregada» se declara como cobertura pendiente, sin fingir
una comprobación de sus datos inexistentes.

## Coverage
Esquema previsto de la spec después de Q1: alta ordinaria conservada, alta intermedia
revisada, rectificación de Inicio/saldo con identidad estable, periodos/cabecera y
lectores centralizados, estado de conciliación comida según cobertura, auditoría y
reintentos coherentes. No nuevas decisiones sobre nombres de endpoints, columnas,
componentes o número de migración; detalles técnicos ordinarios del futuro dev.

Pruebas previstas, NO ejecutadas:
- Inicio−1/Inicio/Fin/siguiente Inicio, año bisiesto, cambio de ejercicio y DST;
  ausencia/error de referencia y ciclo futuro creado antes del cobro.
- Inserción intermedia sin duplicar mes y rectificación que cruza fechas de hechos,
  incluido antes del primer Inicio; vista previa y resultado consultado coinciden.
- Saldo comida explícito cero/negativo, corrección sin tocar el siguiente ciclo;
  comparación real ausente identificada, no «conciliado» por ausencia de fuente.
- Concurrencia entre preview/confirmación, reintento tras respuesta perdida,
  auditoría/ID/rollback atómicos; continuidad de bases y backup/restore/MFA.
- Regresión de posiciones de Saldos y capital de Deuda: cambiar periodos no cambia
  las fechas/importes de hechos ni sus motores económicos. Integrar E1.6 real
  cuando esté disponible, sin modificar su implementación desde este paquete.
- Comida real: diferencia informativa sin autorrelleno; nueva revisión al cambiar
  su fuente. Inversión real: mismo máximo/periodo/corte. Pendientes hasta sus entregas.
- Responsive 390/1440, teclado, foco y borrador conservado en error/409; sin tests
  reales ni capturas implementadas en esta fase documental.

## Wireframes — propuesta para feedback, NO aprobada
Se conservan shell, tema claro, tabla/tarjetas y formulario E1.3. Solo se amplía
la operación; no se pide otra aprobación de paleta o componentes existentes.

### Escritorio — ficha y rectificación
```text
MyFinanzas | Ciclo financiado: [contexto único] · referencia [fecha/motivo]
Ciclo · [mes financiado]                            [Volver]
Inicio [fecha] · Fin [fecha / Sin siguiente Inicio]
Saldo inicial comida [importe manual]
Conciliación comida: No disponible · Revisión Comida pendiente
Cierre financiero: Funcionalidad no disponible
[Rectificar ciclo]

Rectificar ciclo
Inicio * [fecha actual]      Saldo inicial comida * [importe actual]
Motivo * [_________________________________________________]
[Cancelar]                                      [Revisar impacto]

Revisar rectificación
                         Antes                   Después
Intervalo ciclo          [Inicio—Fin]            [Inicio—Fin]
Intervalo vecino         [Inicio—Fin]            [Inicio—Fin]
Mes financiado           [mes/año]               [mes/año]
Saldo comida             [manual]                [manual]
Movimientos              [IDs/periodos afectados, enlace a detalle]
No se alteran las fechas ni los importes de los hechos.
Comida / inversión: cobertura pendiente, no comprobada.
[Volver al borrador]                            [Confirmar rectificación]
```
La acción inserción intermedia parte del listado «Registrar ciclo omitido», solicita
las mismas dos entradas manuales y motivo, y presenta la misma revisión. El alta
ordinaria posterior conserva el recorrido existente. Nueva deuda/plan/cierre no se
crean al cambiar de ciclo. Reordenación que excede los vecinos se rechaza con motivo.

### Móvil — revisión
```text
[Menú] MyFinanzas
Revisar rectificación
Ciclo [mes/año · ID]
Antes:   [Inicio—Fin]
Después: [Inicio—Fin]
Vecino afectado: [antes → después]
Saldo comida: [antes → después]
Movimientos: [cantidad · Ver detalle]
Fuentes pendientes: Comida / inversión
[Volver] [Confirmar rectificación]
```
Detalle paginado de hechos por ID/fecha con ciclo antes/después, sin sumar tipos
heterogéneos como un único «Gasto». Estado de carga/error distinto de impacto cero;
409 conserva borrador y exige nueva vista previa. Aceptación visual pendiente.

## Append-only clarifications
Añadir respuestas/fecha/fuente a Q1 sin reescribir esta ronda como aprobada. Tras
respuesta, completar spec07 con AC actuales y reservas de integración identificadas,
presentar aprobación final expresa de especificación/wireframes y detenerse antes
de desarrollo. No se ha creado una especificación final ni un commit de documentos
no aprobados en esta fase.

## Respuestas expresas recibidas — 2026-10-22
Fuente: respuestas del usuario en la ejecución activa de `$orchestrate`, transmitidas
por el coordinador al paquete SPEC07. No son inferencias por silencio ni aprobación
de la especificación completa o de los wireframes.

### Q1 — Opción recomendada confirmada
Respuesta literal del usuario: «Permitir con revisión de impacto (recomendado)».
Queda confirmado el procedimiento recomendado de esta ronda: inserción de ciclo
omitido y rectificación de Inicio/saldo con revisión de impacto, motivo y confirmación,
incluso con hechos afectados, conservando IDs y hechos originales y sin propagación
automática del saldo comida al ciclo siguiente. Orden entre vecinos y unicidad siguen
vigentes; no DELETE ni reordenación arbitraria. La alternativa de bloquear todos los
casos utilizados no es la elegida.

### Q2 — Cobertura real de Comida confirmada
Respuesta literal del usuario: «Especificar operación disponible y conservar AC2
pendiente hasta integrar Comida».
Se especifica la operación que puede entregarse con los consumidores reales existentes.
E2.1-AC2 del roadmap conserva su criterio de aviso ante diferencia, sin autorrelleno:
NO se elimina ni se considera satisfecho por un stub, un cero o un mensaje de fuente
pendiente. Su comprobación real queda pendiente hasta integrar E3.5. No se crea campo
manual de cierre ni otro motor bancario para adelantarla. Esto no autoriza implementar
E2.1 ni modifica las decisiones financieras existentes sobre apertura comida.

### Siguiente acción
[Spec07 propuesta](07-ciclos-operacion-specification.md) completa para revisión expresa,
con AC de operación disponibles y reservas de integración separadas. Q1/Q2 resueltas;
wireframes y especificación completa siguen PENDING de aprobación. Sin código, SQL,
migraciones operativas, publicación, merge o cambios de Dev32.

## Aprobación documental posterior — 2026-10-22
Fuente: respuesta literal del usuario «dale» al cierre de ejecución que presentó
PR34 para merge y spec07/wireframes para aprobación. El coordinador registra esa
aprobación de cierre documental, sin extenderla a desarrollo E2.1 ni al merge de
una PR documental aún no creada. Q1/Q2 no se reabren. Las etiquetas DRAFT/PENDING
anteriores son historia de la propuesta y quedan sustituidas por esta aprobación.
E1.6 integrada mediante PR34 en cb9ba3b; siguiente acción: publicar PR documental
y verificar CI, esperando permiso expreso de merge de esa nueva PR. AC2 conserva
su dependencia de Comida; ninguna prueba funcional E2.1 ejecutada.
