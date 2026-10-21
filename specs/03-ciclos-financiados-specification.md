# 03 — E1.3 Ciclos financiados: Specification
Status: DRAFT — contrato completo con Q1–Q3 resueltas y base visual aceptada; aprobación final pendiente.
Approval source/date: PENDING
Context and brainstorming: [ronda única](03-ciclos-financiados-brainstorming.md),
[roadmap](roadmap.md#e13--periodos-financiados-mínimos-para-imputar-hechos),
[R3](functional-reference-v5.11.md#r3--planificación-ciclos-y-nómina-secciones-56),
[UI común](guidelines/ui.md).

## Functionality
Crear y consultar el maestro único de Ciclos financiados para futuros consumidores.
Alta en página propia, listado y ficha. Disponible sin Nómina cobrada ni módulos de
hechos entregados. E1.3 incorpora derivaciones temporales, no motores de ejecución
financiera, planificación o cierre. Excel v5.11 sigue como maestro, fixtures exclusivos.
Publicación Draft autorizada no equivale a aprobar este contrato ni a implementar.

### Autoridad y trazabilidad de decisiones
R3 y solicitud fijan entradas manuales, mes siguiente, Fin por siguiente Inicio,
abierto sin Fin, referencia máxima financiera e independencia de Nómina/cierre.
El usuario confirma Q1–Q3 tras contraste de Álex con Excel físico/Criterios: cabecera
por intervalo de referencia; Inicio y saldo comida obligatorios; Inicio y mes
financiado únicos; importe explícito, cero válido y negativos admitidos.
La restricción de mes financiado corrige la propuesta previa; no se conserva como
alternativa. Evidencia: `COUNTIF(tblCiclos[Ciclo financiado],[@[Ciclo financiado]])>1`
→ `ERROR · Ciclo duplicado`. Alta solo posterior y separación de E2.1 son contratos
operativos app confirmados; no se atribuyen a una fórmula de Control no demostrada.
[Registro append-only](03-ciclos-financiados-brainstorming.md) conserva las preguntas
y respuestas, incluida aceptación de diseños como base. Sin inspección independiente
de Criterios por Codex. Contrato definido no equivale a aprobación final ni a pruebas.

## Data model and contracts
Modelo lógico, sin DDL ni SQL ejecutado. Mantener capas React → Effect HTTP → SQLite.

| Dato | Autoridad / representación propuesta | Escritura |
| --- | --- | --- |
| Identidad técnica | Estable, servidor, sin significado económico; preservar identidad de origen cuando mapping futuro la documente | No editable |
| Inicio ciclo | Día civil ISO; no instante UTC | Manual, obligatorio/único; alta posterior al último Inicio |
| Saldo inicial comida (€) | EUR exacto; céntimos INTEGER/strings JSON según patrón E1.1 | Manual obligatorio; cero/negativos válidos; sin default cero |
| Mes financiado | Primer día del mes siguiente al Inicio, cálculo civil; único en todo el maestro | Derivado, no editable |
| Siguiente Inicio | Mínimo Inicio cronológicamente mayor, en el mismo maestro | Derivado |
| Fin ciclo | Siguiente Inicio menos un día civil; ausente sin siguiente | Derivado, no editable |
| Estado temporal | Con siguiente: «Con fin temporal»; sin siguiente: «Abierto» | Derivado, sin declarar cierre financiero |
| Fecha de referencia | Máximo de fechas de hechos disponibles, con cobertura | Derivada, no fecha manual ni reloj |
| Corte de abierto | Referencia si existe y es ≥ Inicio; si no, ausente con motivo explícito | Derivado, sin default |
| Revisión y auditoría | Metadatos técnicos UTC, actor único y operación | Servidor |

Sin catálogo paralelo ni duplicación de Mes/Fin como entradas. Identificador técnico
no presupone un prefijo o ID físico del Excel desconocido; formato es detalle técnico,
no decisión financiera. Mes financiado es único por su fecha completa (mes y año),
pero derivado, no una entrada manual ni ID editable. No almacenar duración/indicadores
económicos que todavía no se consumen.
Fin se recalcula desde orden de Inicio, no orden de inserción ni ID. Fechas civiles
con año bisiesto y cambio de mes/año, sin desplazamientos por huso horario o DST.
La identidad del ciclo previo permanece aunque una alta derive su Fin por primera vez.

### Referencia: disponibilidad no es fecha inventada
Contrato único por fuente: no entregada; disponible sin hechos; disponible con
máxima fecha económica; o error de fuente instalada. Ninguna fuente usa createdAt,
fechas de fotografía, Nómina, fecha de Inicio o Date.now como sustituto de hechos.
Al incorporarse fuentes reales, calcular máximo de las fechas de Movimientos,
Revisión Comida y operaciones de inversión disponibles, según R3, declarando cobertura.
No sumar importes, crear hechos ficticios ni construir tablas vacías para simular motores.
Fuente instalada que falla: estado de error, sin omitirla silenciosamente ni presentar
un máximo incompleto como comprobado. Fuente no entregada: pendiente identificada.

En E1.3 las tres fuentes aún no existen: referencia ausente/cobertura pendiente,
no fechas financieras ficticias servidas como si fueran hechos. El maestro y sus
fechas derivadas siguen consultables. Sin referencia: corte ausente y cabecera
«Ciclo financiado: No disponible», conservando el motivo/cobertura.
Las pruebas aisladas pueden aportar fechas ficticias al contrato de agregación;
no equivalen a integración con tablas de hechos reales aún no entregadas.
No se crea un selector de fecha alternativa para ocultar esta carencia.

### Periodos e independencia de cierre
Intervalo con siguiente Inicio tiene extremos Inicio/Fin; los futuros consumidores
atribuirán hechos por las fechas civiles acordadas, nunca por mes natural financiado.
La prueba de inclusión exacta de hechos corresponde a su entrega; E1.3 prueba solo
extremos derivados. Fin no declara cierre financiero. En pantalla: «Cierre financiero:
funcionalidad no disponible», sin guardar falso/abierto financiero ni habilitar acciones.
No estado «cerrado» ambiguo. Alta de siguiente ciclo deriva Fin previo, sin ejecutar
cierre, fotografía ni operación de Nómina. No reconciliar comida automáticamente.

## Screens and interfaces
Wireframes aceptados por el usuario como base tras revisión de Álex; falta aprobación
final de especificación. Tema claro, verdes MyFinanzas,
texto oscuro sobre #8DBB2E y componentes existentes. Tablas escritorio/tarjetas móvil;
ficha y alta propias, IDs en ficha cuando ayudan; sin reaprobar la paleta.

### Escritorio — listado
```text
MyFinanzas | Ciclo financiado: [mes del intervalo / No disponible] · referencia [fecha/no disponible]
Ciclos financiados                                      [+ Nuevo ciclo]
[Buscar por mes o Inicio] [Todos / Abierto / Con fin temporal]
Mes financiado     Inicio       Fin          Estado temporal       Ver
Diciembre 2026     25/11/2026   —            Abierto               Ficha
Noviembre 2026     25/10/2026   24/11/2026    Con fin temporal      Ficha
Referencia financiera: No disponible · fuentes pendientes
```
Todos los ciclos visibles inicialmente, más reciente primero por Inicio. No filtrar
al mes del reloj ni esconder los de ejercicios anteriores. Mes/fechas de ejemplo son
ficticios; no se admiten dos ciclos con el mismo mes y año financiados.
Fin ausente se etiqueta «Sin siguiente Inicio», no cero/fecha falsa.

### Móvil
```text
[Menú] MyFinanzas
Ciclo financiado: [mes del intervalo / No disponible]
Ciclos financiados                         [+ Nuevo]
[Buscar] [Estado temporal v]
+--------------------------------------+
| Diciembre 2026               Abierto |
| Inicio: 25/11/2026                   |
| Fin: Sin siguiente Inicio           |
| Ver ficha                           |
+--------------------------------------+
Referencia: No disponible
```
Misma capacidad, sin scroll horizontal obligatorio ni dependencia solo del color.

### Ficha
```text
Ciclo · Diciembre 2026                        [Volver]
Identidad técnica: [servidor, no editable]
Inicio                         25/11/2026
Saldo inicial comida          [importe manual explícito, incluso 0 o negativo]
Mes financiado                01/12/2026 (derivado)
Fin                           Sin siguiente Inicio
Estado temporal               Abierto
Referencia financiera         No disponible · fuentes pendientes
Corte de abierto              No disponible / Sin corte aplicable / referencia válida
Cierre financiero             Funcionalidad no disponible
```
No resultado de gasto comida, conciliación, presupuesto, cobro ni duración negativa.
Si una fuente falla, error de referencia no borra el catálogo ni inventa un corte.

### Alta
```text
Nuevo ciclo financiado
Inicio ciclo *                 [fecha civil]
Saldo inicial comida (€) *     [vacío inicialmente; 0 o negativo admitidos]
Vista previa derivada:
  Mes financiado               [mes siguiente al Inicio]
  Fin temporal del anterior    [Inicio propuesto − 1 día, si existe anterior]
  Cierre financiero            No se realizará ninguna acción
[Cancelar]                                    [Crear ciclo]
```
Solo dos entradas financieras manuales. Sin selector de mes/corte/estado, fecha
«hoy» preseleccionada ni saldo copiado del cierre anterior. Vista previa no guarda;
servidor recalcula. Solo alta posterior; no reordenar ni ofrecer inserción intermedia.
Si el mes financiado ya existe, mostrar ERROR · Ciclo duplicado y conservar borrador.

### Cabecera común — Q1 confirmada
Un único contrato derivado para pantallas E1.1/E1.2/E1.3. Con referencia disponible,
actual es el ciclo con Inicio ≤ referencia ≤ Fin; para el último sin Fin, Inicio ≤
referencia. Se usan fechas civiles e inclusividad de los extremos del maestro.
Sin referencia, mostrar «Ciclo financiado: No disponible». Con referencia anterior
al primer Inicio: «Sin ciclo actual». Maestro vacío: «Sin ciclos»; la referencia
puede seguir mostrándose No disponible. Un ciclo creado anticipadamente no sustituye
al que contiene la referencia; último Abierto es un estado temporal independiente.
No fallback al reloj, al último creado, a Nómina ni a una selección manual paralela.
En abierto, referencia ausente implica corte ausente/No disponible; referencia anterior
a Inicio implica corte ausente/«Todavía no hay corte aplicable». No elevar referencia,
producir duración negativa ni almacenar la fecha anterior como corte válido.
Ciclos con siguiente conservan Fin derivado aun sin hechos, sin confundirlo con
cierre financiero. Carga/error distintos, sin contexto obsoleto como si fuera vigente.
Estos wireframes no sustituyen capturas de UI implementada ni pruebas de accesibilidad.

## Empty, loading and error states
- Maestro vacío: «Todavía no hay ciclos», acceso a crear sin exigir Nómina.
- Búsqueda vacía distinta de catálogo vacío; limpiar filtros.
- Carga anunciada; error con reintento y catálogo sin convertir a lista vacía falsa.
- Referencia ausente: motivo y cobertura, no cero/Date.now. Antes de Inicio: Sin corte aplicable.
- Alta con error conserva campos, identifica errores y foco; conflicto de otro alta
  muestra nuevo contexto y pide revisar, sin recalcular silenciosamente la intención.
- Sesión caducada conserva borrador con patrón existente; no bypass de autenticación.
- No encontrado: vuelta al listado; red fallida conserva intento y evita duplicados.

## API behavior and external dependencies
Propuesta técnica a reutilizar, no rutas implementadas: GET /api/ciclos, GET ficha,
POST alta con clave idempotente y revisión del contexto temporal previo; lectura del
contexto financiero derivado compartida para cabecera. Sin PATCH/DELETE/cierre ni
endpoints para fabricar fechas de fuentes. Forma de ID/detalles de rutas se concretan
en desarrollo tras aprobación, sin nueva ronda por decisiones técnicas ordinarias.
MFA/sesión/Origin/CSRF, límite JSON, errores y no-store existentes; consultas
parametrizadas. No nuevas dependencias. Campos derivados rechazados como escritura.
Lista paginada y búsqueda según patrones existentes; orden cronológico de todo el
maestro para calcular siguiente Inicio, nunca de una página de resultados.
400/422 petición o campos inválidos según patrón actual; 401/403 acceso; 404 ficha;
409 alta incompatible con estado actual/duplicado/contexto obsoleto; 500 genérico con
requestId. Sin SQL, payload financiero o factores en logs ni en capturas.

### Persistencia y continuidad técnica para futura implementación
Proponer extensión versionada de esquema v2 sin borrar/resembrar ni recrear bases.
Transacción IMMEDIATE, relectura de versión/contexto bajo bloqueo, FK/integridad y
rollback/versiones desconocidas siguiendo E1.2; claves e IDs previos estables.
Conservar Saldos, Clasificación, autenticación/MFA, contadores, auditoría e intentos.
Copias age coherentes y restauración aislada con esquema anterior/nuevo verificadas;
no copias externas ni configuración productiva. Antes de desarrollo no se elige DDL
ni se ejecuta actualización. Datos económicos ficticios deterministas; factores efímeros.

## Validation and edge cases
Fecha civil existente (incluye 29/02), orden basado en día completo; no normalizar
31/02 ni mezclar UTC de auditoría con fechas económicas. Inicio obligatorio y único;
mes financiado derivado único en todo el maestro. Dos Inicios distintos del mismo mes
civil derivan el mismo mes financiado y se rechazan, aunque el segundo sea posterior.
Alta ordinaria posterior al último Inicio; no imponer distancia mínima ni restringir
fechas futuras por cobro/reloj. Saldo inicial comida obligatorio; cero solo explícito,
negativos válidos, vacío rechazado sin convertirlo a cero ni copiar el cierre previo.
Nunca redondeos silenciosos. Formato exacto EUR y rango técnico
reutilizan stack vigente, sin introducir límites financieros arbitrarios.
Último ciclo sin siguiente conserva Fin ausente aunque la referencia avance. Alta
concurrente/idempotencia debe evitar IDs, Inicios o meses financiados duplicados y proteger la intención
de las dos pestañas/procesos del único titular. No cálculo derivado por datos paginados.
No permitir edición/borrado histórico como atajo: operación E2.1 y protección DT5 futura.

Control ciclo contrastado: Inicio y saldo informados; Inicio/mes financiado únicos;
Fin existente no anterior a Inicio; corte existente/aplicable no anterior a Inicio.
Para abierto sin referencia válida se conserva ausencia motivada, no un corte inválido.
Esta distinción sigue Q1 y no bloquea alta anticipada ni fabrica una fecha para pasar
el control. Mes/Fin/corte se validan tras derivación en servidor y en la transacción;
un conflicto no consume alta parcial ni sobrescribe otro ciclo.

## Exclusions
Dev 03, código, DDL/actualización ejecutada, importación, Excel/datos reales/despliegue;
E2.1 (operación/apertura revisable/conciliación), plan mensual/anual, Nómina,
Movimientos, Comida e inversiones operativos, motores de importes, cierre/reapertura,
fotografías, precarga de plan siguiente, fecha de referencia manual alternativa.

## Acceptance checks
Los 24 criterios tienen contrato definido y conservan sus IDs: **21 I** (alcance E1.3)
y **3 C** (integraciones futuras AC-11/23/24). Q1–Q3 están resueltas; AC-07/12/13 pasan
de Q a I. Ninguno se declara ejecutado/PASS: no hay implementación ni autorización dev.
La columna Fuente distingue evidencia financiera de controles técnicos reutilizados.

| ID | Acción / precondiciones | Resultado observable esperado | Fuente |
| --- | --- | --- | --- |
| AC-01 I | Consultar vacío y crear ciclo válido sin Nómina | Maestro consultable, ID estable; no ingreso ni maestro alternativo | Roadmap E1.3 / R3 |
| AC-02 I | Intentar escribir Mes/Fin/estado/corte como entradas | Rechazo de derivados; solo Inicio y saldo comida son entradas manuales | R3 / Q1–Q3 |
| AC-03 I | Inicio 25/10/2026 y 31/12/2026 ficticios | Mes financiado 01/11/2026 y 01/01/2027; no selector manual | R3 |
| AC-04 I | Inicios 28/02/2028 y 01/03/2028; sin hechos y con referencia ausente/anterior | Fin primero 29/02/2028, no anterior a Inicio; independiente de hechos/referencia; mismo resultado en distintos husos/DST | R3 / Q1 / Control ciclo Q2 |
| AC-05 I | Agregar siguiente Inicio y reconsultar previo | Fin previo se deriva sin cambiar identidad ni declarar cierre financiero | R3 / Q1 |
| AC-06 I | Consultar último ciclo sin siguiente y avanzar referencia de prueba | Fin sigue ausente; no se rellena desde reloj/referencia | R3 / Q1 |
| AC-07 I | Sin referencia; referencia antes del primer Inicio/abierto; referencia exactamente en Inicio/Fin; ciclo futuro creado | No disponible sin referencia; sin actual antes del primero; actual contiene referencia; abierto anticipado no lo sustituye; sin corte aplicable antes de Inicio y sin fecha inventada; Fin existente permanece | Q1 |
| AC-08 I | Probar contrato aislado de máximos con fechas de tres fuentes ficticias | Mayor fecha civil, cobertura explícita; sin usar metadatos/reloj | R3 / DT3 |
| AC-09 I | Consultar app E1.3 sin consumidores entregados | Tres fuentes pendientes identificadas; no hechos simulados ni referencia inventada | R3 / alcance E1.3 |
| AC-10 I | Contrato aislado: fuente instalada vacía frente a error | Vacío distinguible de fallo; error no se ignora como falta de hechos | Integridad / contrato técnico de fuentes |
| AC-11 C | Incorporar Movimientos/Revisión Comida/inversión en sus entregas | Máximos extraídos de hechos reales del módulo y maestro/contexto compartido | R3 / consumidores futuros |
| AC-12 I | Probar Inicio omitido/duplicado, alta anterior/intermedia y dos Inicios distintos 01/10 y 25/10/2026; probar siguiente mes/año y fecha futura | Rechaza Inicio inválido, alta no posterior y dos ciclos de noviembre 2026 con ERROR · Ciclo duplicado; meses/años distintos válidos sin distancia mínima ni veto por reloj | Control ciclo Q2 / contrato app |
| AC-13 I | En alta dejar saldo vacío/omitido/null; después informar 0 y -12,34 EUR ficticios | Ausencia rechazada, campo inicialmente vacío; cero y negativo explícitos aceptados exactamente, sin precarga ni copia del cierre | Control ciclo Q2 / Q3 |
| AC-14 I | Probar importes EUR no representables exactamente o exceso técnico | Rechazo sin redondear ni usar coma flotante; no límites económicos inventados | Precisión técnica E1.1 / Q3 |
| AC-15 I | Dos procesos intentan distintos Inicios del mismo mes y repetir intento tras error de red | Una sola alta por mes financiado, IDs/Inicios únicos; conflicto visible y rollback, reintento idempotente sin duplicación | Q2 / atomicidad E1.2 |
| AC-16 I | Fecha inválida como 31/02 y cambio de año bisiesto | Fecha inválida rechazada; calendario civil correcto | R3 / fechas civiles |
| AC-17 I | Listar varias páginas y filtrar registros | Siguiente Inicio/Fin se calcula desde maestro completo, no solo página visible | Maestro único R3 |
| AC-18 I | Abrir listado/ficha/alta a 390/1440 y teclado | Identidad común, tabla/tarjetas y dos campos; capturas reales inspeccionadas tras dev | Wireframes aceptados / UI común |
| AC-19 I | Forzar vacío/carga/error/reintento, 409 y sesión caducada | Estados distinguibles, borrador conservado y ausencia de ceros/contexto ficticio | Q1 / UX E1.1–E1.2 |
| AC-20 I | Actualizar base E1.2 existente e intentar fallo/concurrencia | Datos/IDs/autenticación preservados, esquema/versión atómicos y rechazo de desconocido | Continuidad técnica E1.2 |
| AC-21 I | Copiar/restaurar base ficticia con ciclos en destino aislado | Maestro/derivaciones coherentes y acceso MFA según política restauración; sin uso real | Backups DT6 / E1.2 |
| AC-22 I | Acceder sin MFA o mutar sin Origin/CSRF, probar campos extra | Protección existente mantenida; sin filtración de datos sensibles | Seguridad existente |
| AC-23 C | Integrar lectores de hechos y planificación | Periodos/corte del único maestro; no derivar ciclos de Nómina ni meses naturales | R3 / E2.1 y lectores futuros |
| AC-24 C | Entregar cierre/reapertura y conciliación comida | Fin temporal no cierra; apertura no copia cierre previo ni rectifica automáticamente | R3 / P5 / E2.1 y cierre futuros |

## Pruebas previstas y siguiente acción
Bun: calendario/contratos de fuentes y errores, API/SQLite, atomicidad, actualización
v2→extensión y restauración. Playwright: MFA real, cabecera/listado/ficha/alta, vacíos,
conflictos, teclado y capturas 390/1440; regresión completa E1.1/E1.2. Pruebas de fuentes
futuras aisladas se etiquetan contratos, sin atribuir integración económica real.
Ahora solo controles documentales. Q1–Q3 resueltas y wireframes aceptados como base.
Sin nuevas preguntas financieras: el control de corte se conserva sin publicar corte
inválido cuando no es aplicable, según Q1. PR #12 sigue Draft para cierre/aprobación
final de especificación y autorización explícita de dev 03. Sin código/SQL ejecutado,
merge, datos reales ni cambios al maestro. Detalles técnicos ordinarios se resuelven
en desarrollo, reutilizando arquitectura/componentes/pruebas.
