# 03 — E1.3 Ciclos financiados: Specification
Status: DRAFT — provisional con Q1–Q3 pendientes, no aprobado ni implementado.
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

### Confirmado frente a propuesto
Reglas confirmadas de R3 y solicitud: entradas manuales, mes siguiente, Fin por
siguiente Inicio, abierto sin Fin, referencia máxima financiera, independencia de
Nómina y distinción temporal/cierre. Ronda Q1–Q3 cubre vacíos/cabecera, límites de alta
y obligatoriedad/signo de comida. Todo lo dependiente de ellas se marca CONDICIONAL;
no constituye regla nueva del Excel ni aceptación resuelta por casilla recomendada.
No se ha inspeccionado Criterios físico en Codex. Sin nuevas decisiones de producción.

## Data model and contracts
Modelo lógico, sin DDL ni SQL ejecutado. Mantener capas React → Effect HTTP → SQLite.

| Dato | Autoridad / representación propuesta | Escritura |
| --- | --- | --- |
| Identidad técnica | Estable, servidor, sin significado económico; preservar identidad de origen cuando mapping futuro la documente | No editable |
| Inicio ciclo | Día civil ISO; no instante UTC | Manual, obligatoriedad/orden según Q2 |
| Saldo inicial comida (€) | EUR exacto; céntimos INTEGER/strings JSON según patrón E1.1 | Manual; obligación/signo Q3, sin default cero |
| Mes financiado | Primer día del mes siguiente al Inicio, cálculo civil | Derivado, no editable |
| Siguiente Inicio | Mínimo Inicio cronológicamente mayor, en el mismo maestro | Derivado |
| Fin ciclo | Siguiente Inicio menos un día civil; ausente sin siguiente | Derivado, no editable |
| Estado temporal | Con siguiente: «Con fin temporal»; sin siguiente: «Abierto» | Derivado, sin declarar cierre financiero |
| Fecha de referencia | Máximo de fechas de hechos disponibles, con cobertura | Derivada, no fecha manual ni reloj |
| Corte de abierto | Fecha de referencia; aplicabilidad antes de Inicio según Q1 | Derivado, sin default |
| Revisión y auditoría | Metadatos técnicos UTC, actor único y operación | Servidor |

Sin catálogo paralelo ni duplicación de Mes/Fin como entradas. Identificador técnico
no presupone un prefijo o ID físico del Excel desconocido; formato es detalle técnico,
no decisión financiera. No asignar identidad por nombre de mes: puede repetirse según
Q2. No almacenar duración/indicadores económicos que todavía no se consumen.
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
fechas derivadas siguen consultables. Q1 decide corte y cabecera en ese caso.
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
Propuesta para feedback en esta misma revisión. Tema claro, verdes MyFinanzas,
texto oscuro sobre #8DBB2E y componentes existentes. Tablas escritorio/tarjetas móvil;
ficha y alta propias, IDs en ficha cuando ayudan; sin reaprobar la paleta.

### Escritorio — listado
```text
MyFinanzas | Ciclo financiado: [según Q1] · referencia [fecha/no disponible]
Ciclos financiados                                      [+ Nuevo ciclo]
[Buscar por mes o Inicio] [Todos / Abierto / Con fin temporal]
Mes financiado     Inicio       Fin          Estado temporal       Ver
Diciembre 2026     25/11/2026   —            Abierto               Ficha
Noviembre 2026     25/10/2026   24/11/2026    Con fin temporal      Ficha
Referencia financiera: No disponible · fuentes pendientes
```
Todos los ciclos visibles inicialmente, más reciente primero por Inicio. No filtrar
al mes del reloj ni esconder los de ejercicios anteriores. Mes/fechas de ejemplo son
ficticios; se muestran varios del mismo mes con Inicio/ID para desambiguar si Q2 permite.
Fin ausente se etiqueta «Sin siguiente Inicio», no cero/fecha falsa.

### Móvil
```text
[Menú] MyFinanzas
Ciclo financiado: [según Q1]
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
Saldo inicial comida          [valor explícito / ausencia según Q3]
Mes financiado                01/12/2026 (derivado)
Fin                           Sin siguiente Inicio
Estado temporal               Abierto
Referencia financiera         No disponible · fuentes pendientes
Corte de abierto              [según Q1]
Cierre financiero             Funcionalidad no disponible
```
No resultado de gasto comida, conciliación, presupuesto, cobro ni duración negativa.
Si una fuente falla, error de referencia no borra el catálogo ni inventa un corte.

### Alta
```text
Nuevo ciclo financiado
Inicio ciclo *                 [fecha civil]
Saldo inicial comida (€)       [importe vacío; obligación/signo Q3]
Vista previa derivada:
  Mes financiado               [mes siguiente al Inicio]
  Fin temporal del anterior    [Inicio propuesto − 1 día, si aplica Q2]
  Cierre financiero            No se realizará ninguna acción
[Cancelar]                                    [Crear ciclo]
```
Solo dos entradas financieras manuales. Sin selector de mes/corte/estado, fecha
«hoy» preseleccionada ni saldo copiado del cierre anterior. Vista previa no guarda;
servidor recalcula. Q2 define si se permite reordenar; no se dibuja acción no aprobada.

### Cabecera común — CONDICIONAL Q1
Se consume el maestro por contrato único para todas las pantallas E1.1/E1.2/E1.3.
Q1 decide si «actual» sigue referencia o se etiqueta último Abierto. Sin ciclos,
mostrar «Sin ciclos»; sin referencia, etiqueta explícita acordada, no mes del reloj.
Ciclo abierto y cierre financiero siempre separados. No segunda selección/calendario
financiero paralelo. Carga y error distinguibles, sin conservar contexto obsoleto como
si fuera vigente. Esta propuesta ASCII no valida UI futura ni accesibilidad efectiva.

## Empty, loading and error states
- Maestro vacío: «Todavía no hay ciclos», acceso a crear sin exigir Nómina.
- Búsqueda vacía distinta de catálogo vacío; limpiar filtros.
- Carga anunciada; error con reintento y catálogo sin convertir a lista vacía falsa.
- Referencia ausente: motivo y cobertura, no cero/Date.now. Anterior a Inicio: Q1.
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
31/02 ni mezclar UTC de auditoría con fechas económicas. Q2 fija unicidad/límite de alta.
No limitar creación a fechas anteriores a cobro o reloj. Q3 fija importe obligatorio
/signo: nunca redondeos silenciosos ni ausencia=0. Formato exacto EUR y rango técnico
reutilizan stack vigente, sin introducir límites financieros arbitrarios.
Último ciclo sin siguiente conserva Fin ausente aunque la referencia avance. Alta
concurrente/idempotencia debe evitar IDs o Inicios duplicados y proteger la intención
de los dos usuarios/pestañas del único titular. No cálculo derivado por datos paginados.
No permitir edición/borrado histórico como atajo: operación E2.1 y protección DT5 futura.

## Exclusions
Dev 03, código, DDL/actualización ejecutada, importación, Excel/datos reales/despliegue;
E2.1 (operación/apertura revisable/conciliación), plan mensual/anual, Nómina,
Movimientos, Comida e inversiones operativos, motores de importes, cierre/reapertura,
fotografías, precarga de plan siguiente, fecha de referencia manual alternativa.

## Acceptance checks
Futuros y no ejecutados. I = alcance previsto E1.3; Q = condicionado a respuesta de
esta ronda; C = integración/consumidor posterior, no motor entregado. IDs estables;
los criterios Q no se declaran aprobados/implementables hasta resolver su decisión.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-01 I | Consultar vacío y crear ciclo válido sin Nómina | Maestro consultable, ID estable; no ingreso ni maestro alternativo |
| AC-02 I | Intentar escribir Mes/Fin/estado/corte como entradas | Rechazo de derivados; solo Inicio y saldo comida son entradas manuales |
| AC-03 I | Inicio 25/10/2026 y 31/12/2026 ficticios | Mes financiado 01/11/2026 y 01/01/2027; no selector manual |
| AC-04 I | Inicios 28/02/2028 y 01/03/2028 | Fin primero 29/02/2028; mismo resultado en distintos husos/DST |
| AC-05 I | Agregar siguiente Inicio y reconsultar previo | Fin previo se deriva sin cambiar identidad ni declarar cierre financiero |
| AC-06 I | Consultar último ciclo sin siguiente y avanzar referencia de prueba | Fin sigue ausente; no se rellena desde reloj/referencia |
| AC-07 Q | Sin fuentes/fechas o referencia anterior a primer/último Inicio | Corte y cabecera según Q1, sin fecha de sustitución ni duración negativa |
| AC-08 I | Probar contrato aislado de máximos con fechas de tres fuentes ficticias | Mayor fecha civil, cobertura explícita; sin usar metadatos/reloj |
| AC-09 I | Consultar app E1.3 sin consumidores entregados | Tres fuentes pendientes identificadas; no hechos simulados ni referencia inventada |
| AC-10 I | Contrato aislado: fuente instalada vacía frente a error | Vacío distinguible de fallo; error no se ignora como falta de hechos |
| AC-11 C | Incorporar Movimientos/Revisión Comida/inversión en sus entregas | Máximos extraídos de hechos reales del módulo y maestro/contexto compartido |
| AC-12 Q | Alta duplicada, anterior/intermedia y dos Inicios en mismo mes | Reglas Q2 explícitas, sin restricciones mensuales inferidas |
| AC-13 Q | Alta con saldo ausente, cero y negativo | Obligación/signo según Q3; ausencia nunca se convierte en cero |
| AC-14 I | Probar importes EUR no representables exactamente o exceso técnico | Rechazo sin redondear ni usar coma flotante; no límites económicos inventados |
| AC-15 I | Crear desde dos procesos y repetir intento tras error de red | IDs/altas no duplicados; conflicto de contexto visible, sin escritura parcial |
| AC-16 I | Fecha inválida como 31/02 y cambio de año bisiesto | Fecha inválida rechazada; calendario civil correcto |
| AC-17 I | Listar varias páginas y filtrar registros | Siguiente Inicio/Fin se calcula desde maestro completo, no solo página visible |
| AC-18 I | Abrir listado/ficha/alta a 390/1440 y teclado | Identidad común, tabla/tarjetas y dos campos; capturas reales inspeccionadas tras dev |
| AC-19 I | Forzar vacío/carga/error/reintento, 409 y sesión caducada | Estados distinguibles, borrador conservado y ausencia de ceros/contexto ficticio |
| AC-20 I | Actualizar base E1.2 existente e intentar fallo/concurrencia | Datos/IDs/autenticación preservados, esquema/versión atómicos y rechazo de desconocido |
| AC-21 I | Copiar/restaurar base ficticia con ciclos en destino aislado | Maestro/derivaciones coherentes y acceso MFA según política restauración; sin uso real |
| AC-22 I | Acceder sin MFA o mutar sin Origin/CSRF, probar campos extra | Protección existente mantenida; sin filtración de datos sensibles |
| AC-23 C | Integrar lectores de hechos y planificación | Periodos/corte del único maestro; no derivar ciclos de Nómina ni meses naturales |
| AC-24 C | Entregar cierre/reapertura y conciliación comida | Fin temporal no cierra; apertura no copia cierre previo ni rectifica automáticamente |

## Pruebas previstas y siguiente acción
Bun: calendario/contratos de fuentes y errores, API/SQLite, atomicidad, actualización
v2→extensión y restauración. Playwright: MFA real, cabecera/listado/ficha/alta, vacíos,
conflictos, teclado y capturas 390/1440; regresión completa E1.1/E1.2. Pruebas de fuentes
futuras aisladas se etiquetan contratos, sin atribuir integración económica real.
Ahora solo controles documentales. Resolver Q1–Q3 y revisar wireframes en esta misma
PR Draft; después aprobación expresa. No dev 03, merge ni nueva ronda por detalles
ordinarios de implementación que no alteren reglas financieras.
