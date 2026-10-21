# Ui guidelines

## Implementación E1.1 — STEP 7
Diseño aprobado en STEP 5, ahora implementado bajo autorización expresa de $dev 01.
Shell con menú lateral escritorio y menú móvil, header Ciclo financiado: No disponible;
listado con búsqueda/filtros/paginación y tabla/tarjetas; ficha y alta/edición en página propia.
Identidad original MyFinanzas, CSS propio; componentes PageHead/Tag/Alert/Switch reutilizables.

Tokens vigentes: principal #8DBB2E, cabeceras #CBEA7B, secciones/switch off #DCECB3,
fondo #EEF7E8, texto #2B2B2B, blanco; texto auxiliar #536147, foco #335B0D.
Tipografía de sistema sin descarga; shell desktop 236px/sidebar, contenido fluido,
breakpoints 1050px/760px; móvil padding 16px. Tema light explícito incluso con sistema dark.
Switch binario accesible, knob blanco, texto Sí/No; ausencia histórica se representa
Sin informar y acción explícita Informar No antes de convertirse en switch, no false implícito.
Los tres indicadores nuevos comienzan false y en edición conservan valores reales.

Formularios en tres bloques, errores asociados a campos, foco al aviso y borrador conservado;
ID visible/inmutable, sin borrado físico. Desactivar/reactivar requiere confirmación.
Aperturas/Objetivo vacíos no se transforman en cero. Sin cálculo disponible: motivo visible
sin importe; no Manual operativo ni nuevas combinaciones. El menú no ofrece módulos inexistentes.

Acceso privado con enrolado/contraseña/TOTP/códigos de recuperación; factores no aparecen
en las capturas de evidencia. Estado de sesión caducada pide conservar borrador antes de
volver a identificarse. Formularios mantienen acciones Cancelar/Guardar y acceso por teclado.

Capturas reales 390×844 y 1440×1000 inspeccionadas; estados loading/empty/error/retry,
conflicto, ausencias y restauración verificados. Resultados y cinco ajustes de revisión
están en [testplan](../01-saldos-control-testplan.md), no en una aprobación gráfica supuesta.
Se midieron pares de texto de la paleta y se operaron switches/menú por teclado;
no auditoría WCAG completa ni ensayo con lector de pantalla.

## Excepción de contraste confirmada en revisión de PR #7
Revisión comunicada por el usuario el 2026-10-21: conservar texto oscuro sobre el verde
principal #8DBB2E, aunque la referencia original de la paleta emplee texto blanco.
La combinación implementada #24320E/#8DBB2E ofrece aproximadamente **6.04:1**;
blanco/#8DBB2E ofrece **2.26:1**, insuficiente para texto normal (4.5:1).
Esta excepción de accesibilidad afecta al texto de acciones, no cambia el verde, la
identidad ni el diseño aprobado. Los indicadores blancos de los switches se conservan;
sus etiquetas Sí/No siguen siendo oscuras. No se ha cambiado CSS ni distribución.
Playwright comprueba el color real de texto y fondo del botón principal, además de los
ratios de paleta; no se afirma una auditoría WCAG completa.

## Registro de aprobación STEP 5
Lo siguiente conserva el contrato visual aprobado y las limitaciones de aquella fase
**documental**. Las frases sobre implementación futura/no autorizada o PR #6 abierta
describen ese momento: PR #6 fue integrada en ebfe75b y STEP 7 sí está autorizado.
No son una revocación de las pruebas reales documentadas arriba ni permiso de merge.

## Diseño visual común aprobado — 2026-10-21

Fuente de aprobación: el usuario comunica que revisó y aprobó con Álex la primera
propuesta visual de MyFinanzas App y pide documentarla en PR #6. Se ha recibido su
descripción textual; no se afirma haber inspeccionado un archivo gráfico, prototipo
externo o aplicación que no se haya proporcionado. Los esquemas ASCII de E1.1 son una
traducción documental de esa descripción, no evidencia de una UI implementada.

### Identidad y distribución
- Estilo profesional, compacto y orientado al control financiero.
- Identidad original MyFinanzas, CSS propio y tokens: no sustituir por otra marca o
  librería de UI. Se aprueba la dirección visual; no afirmar que los tokens existan ya.
- Menú lateral en escritorio; navegación adaptada a móvil. La navegación solo expone
  capacidades disponibles, sin habilitar módulos pendientes por dibujar el menú común.
- Cabecera global con ciclo financiado actual leído del maestro único de Ciclos.
- Tablas compactas en escritorio, tarjetas compactas en móvil. La densidad no debe
  perjudicar legibilidad, foco, etiquetas o áreas de interacción.
- Componentes visuales reutilizables para entregas posteriores, sin construirlos aquí.
- Tema únicamente claro en esta fase, fondos blancos y verdes suaves MyFinanzas. Sin
  selector ni modo oscuro, tampoco activación automática por preferencia del sistema.

| Papel de la paleta existente | Color aprobado como referencia de identidad |
| --- | --- |
| Verde principal | #8DBB2E |
| Cabeceras | #CBEA7B |
| Secciones | #DCECB3 |
| Fondo | #EEF7E8 |
| Texto | #2B2B2B |

Paleta complementaria procedente de R6, mantenida por la aprobación del usuario.
No deducir que cualquier pareja de colores cumple contraste: comprobar combinaciones
reales en texto, controles, estados y foco durante la futura implementación. Roles de
superficie/acción deben conservar identidad y accesibilidad, sin aprobar valores nuevos
por esta documentación. Tipografía, medidas y breakpoints del bootstrap no se convierten
automáticamente en valores aprobados del nuevo diseño global.

### Cabecera y semántica financiera
El ciclo mostrado procede exclusivamente del maestro de Ciclos y de su contrato de
selección de ciclo actual. No inferirlo del reloj del navegador, Nómina o un catálogo
paralelo. El estado temporal y el cierre financiero son datos diferentes: Fin temporal
no declara cierre financiero y ausencia de Fin no demuestra que haya cierre financiero.
Mostrar etiquetas separadas cuando existan esos datos, sin habilitar acciones de cierre.

Según roadmap, el maestro mínimo llega en E1.3 y cierre financiero después. En E1.1
no se implementan para rellenar la cabecera. Mientras no esté disponible la fuente,
mostrar «Ciclo financiado: No disponible»; no inventar mes, ID, estado o fecha. Durante
carga/error/vacío de esa fuente, distinguir estados y no sustituirlos por un ciclo
supuesto. El corte y selección de ciclo mantienen decisiones DT3 aplicables antes de
su entrega, sin resolverlas aquí. Tampoco inferir estado financiero a partir del temporal.

### Patrones reutilizables previstos, no componentes implementados
| Patrón visual | Contrato previsto |
| --- | --- |
| Estructura común y navegación | Marca, menú lateral escritorio, alternativa móvil accesible y cabecera de contexto |
| Búsqueda y filtros | Etiquetas comprensibles, filtros/estados visibles y estado vacío diferenciado |
| Tabla/tarjeta de Saldo | Misma identidad/atributos y acciones disponibles en ambos formatos; ID visible |
| Ficha y secciones de formulario | Separar identidad, configuración económica y atributos de control |
| Switches de los tres booleanos (M2 vigente) | Alta inicial No/false; edición conserva dato; POST omitido=false, PATCH omitido=sin cambio; histórico ausente distinto de false |
| Estado/importe disponible | Distinguir ausencia, cero explícito, pendiente de motor y no aplicable; sin importes ficticios |
| Avisos y acciones | Carga/vacío/error/éxito, confirmación de acciones, foco y valores del formulario preservados |

## Pantallas E1.1 aprobadas

1. Listado: búsqueda, filtros y estados; tabla compacta escritorio y tarjetas compactas
   móvil, activos por defecto e inactivos consultables.
2. Ficha: identificación, configuración financiera y atributos separados, ID visible e
   inmutable; edición en página propia.
3. Alta/edición en página propia: tres bloques **Identificación**, **Configuración económica**
   y **Atributos de control**; Estado Activa inicial, tres switches No/false al alta y opcionalidad
   de M1/M2. Contrato exacto en [especificación E1.1](../01-saldos-control-specification.md).

No habilitar Manual operativo ni combinaciones Tipo/Control no contrastadas. Motores
aún no entregados no producen importes ficticios; vacío no equivale a cero. M1/M2,
reglas financieras, IDs y separación entre fuentes conservan su autoridad.

## Revisión M2 aprobada: switches — 2026-10-21

La última decisión expresa del usuario **sustituye** controles segmentados y exigencia
de elección manual de cada Sí/No. Contrato común para Liquidez, Mostrar como bolsa y
Permite salida a Exterior, sin derivar valores del Tipo, Control, Finalidad o entre sí.

| Estado booleano real | Apariencia aprobada | Texto visible |
| --- | --- | --- |
| true / activado | Fondo verde principal #8DBB2E, indicador blanco | Sí |
| false / desactivado | Fondo verde suave de la paleta MyFinanzas, indicador blanco | No |

«Desactivado» es off, no disabled: el control sigue siendo operable. Verde suave usa
la paleta existente, sin introducir otro tono como decisión aprobada ni inventar un
hex concreto no indicado para este switch. La etiqueta del atributo y Sí/No visibles
impiden depender solo del color. Indicador blanco en ambos estados; contraste de pista,
indicador, borde, texto y foco se comprobará en futura implementación, sin declarar
conformidad por esta aprobación textual.

Alta: tres switches en No/false inicialmente; no pedir interacción manual para aceptar
ese valor. Edición: representar el valor realmente guardado, nunca inicializar desde el
estado del formulario de alta. Guardar un cambio no modifica los otros dos indicadores.
Semántica accesible de switch con nombre del atributo, estado checked true/false, foco
visible y teclado; no simular un tercer estado mediante checked=false o mixed.

Si una futura importación autorizada conserva un valor ausente, mostrar «Sin informar»
y distinguirlo del switch en No. No asignarle estado falso para dibujar el control ni
normalizarlo al abrir/cancelar/guardar otro campo. Si el usuario informa ese atributo,
se registra el booleano elegido; si no lo toca, PATCH lo omite y conserva la ausencia.
La presentación de ausencia no convierte al switch binario en un control de tres estados.
No se importan datos ni se implementa esta UI en esta PR documental.

POST ordinario omitido aplica false y persiste valor explícito; PATCH omitido no altera
el valor. Null explícito no es booleano de escritura ordinaria ni activa el default de
omisión. No trasladar ese default a futuras importaciones, históricos o S000. Detalle
canónico en [especificación](../01-saldos-control-specification.md).

Tema claro exclusivamente: superficies blancas/verdes suaves, sin versión oscura,
selector de tema ni tokens oscuros implementados. Futuras pruebas verificarán que una
preferencia de sistema oscura no active otro tema; no ampliar alcance para implementarlo.

## Aprobación de diseño frente a comprobación futura

| Evidencia | Estado real |
| --- | --- |
| Primera propuesta visual común y tres pantallas E1.1 | Aprobadas según comunicación expresa del usuario, 2026-10-21 |
| Documentación y esquemas ASCII | Describen la aprobación; no ejecutan componentes ni sustituyen pruebas |
| Navegación, formularios, tarjetas/tablas nuevos en aplicación | No implementados en este STEP documental |
| Inspección de la futura UI a 390×844 y 1440×1000 | Pendiente de implementación autorizada, capturas e inspección efectiva |
| Contraste, teclado, foco, etiquetas, semántica y estados responsive de la nueva UI | Pruebas futuras; no conformidad WCAG declarada por una aprobación de diseño |

La validación futura cubrirá los tres flujos, menú lateral/navegación móvil, cabecera
con fuente disponible/no disponible/carga/error, ausencia/cero, y persistencia de los
campos después de errores, switches Sí/No y preservación de históricos ausentes. Playwright y capturas inspeccionadas a 390 y 1440 px deben
complementarse con revisión de accesibilidad; capturas viejas del bootstrap y CI de sus
flujos no validan este diseño. La aprobación no autoriza implementar, generar CSS/tokens,
componentes o SQL, hacer merge o iniciar E1.2. PR #6 permanece abierta para revisión final.


## E1.2 Clasificación — implementación en revisión
Reutiliza shell/PageHead/Alert/Tag y tokens aprobados. Pestañas de tres catálogos,
búsqueda y filtros jerárquicos/estado, tabla compacta de tres columnas y tarjetas
móvil. Ficha con enlaces de jerarquía, ID, Estado y dependencias reales; formularios
en página propia, Referencia obligatoria sin preselección (no aplica default de
switches E1.1). Rectificar presenta Antes/Después legibles, motivo y cobertura
financiera no comprobada. No importes fingidos ni motores simulados. Evidencia y
revisión visual en [testplan 02](../02-clasificacion-testplan.md).


## Ciclos E1.3
Base visual aprobada en spec 03; implementación revisable con capturas reales 390/1440
trazadas en [testplan](../03-ciclos-financiados-testplan.md), no aprobación por capturas.
Reutiliza cabecera, navegación, paneles, tabla/tarjetas, etiquetas y texto oscuro sobre
verde #8DBB2E. Cabecera consulta maestro/contexto real: «Sin ciclos» ≠ «No disponible»
por referencia pendiente ≠ error de carga. Abierto es temporal, nunca cierre financiero.
Formulario propio de dos campos, ambos vacíos; vista previa derivada separada. 409
conserva borrador y exige actualizar contexto explícitamente; sin ajustes silenciosos.
