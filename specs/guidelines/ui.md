# Ui guidelines

## Alcance
Interfaz web en español para el catálogo ficticio, implementada en STEP 1 y descrita
en STEP 2. CSS propio, sin librería UI. Estos valores documentan el bootstrap existente;
describen el bootstrap, no la implementación del diseño aprobado para futuras pantallas
registrado más abajo. Mantener separados inventario actual, aprobación y pruebas futuras.

## Presentación actual
Una página: cabecera MyFinanzas y etiqueta de entorno local; título del catálogo;
aviso de datos ficticios; lista de nombres e identificadores; pie técnico del bootstrap.
No muestra importes, gráficos, indicadores financieros ni acciones de negocio.

| Propiedad | Valor implementado |
| --- | --- |
| Tipografía | system-ui y fuentes de sistema; sin descargas externas |
| Fondo / texto | #f6f7f4 / #1c3432 |
| Tokens --muted / --line / --accent | #526562 / #d9e2dc / #195c4f |
| Panel / aviso | blanco / #eaf1eb |
| Contenedor / contenido principal | máximo 1120px / 800px |
| Márgenes laterales | 40px; 22px hasta 600px |
| Título principal | clamp(30px, 4vw, 44px) |
| Radios | lista 12px; indicador 10px; aviso 8px; botón 6px |

Los colores base y varias medidas son literales CSS; no existe aún un sistema completo
de tokens de espaciado o componentes. No introducir uno como si ya estuviera implementado.
Hasta 600px se ajustan márgenes y tipografía y se oculta la etiqueta redundante «Ficticio»
de cada fila; el aviso global permanece visible. Se admite scroll vertical normal.

## Estados e interacción
- Carga: mensaje «Cargando catálogo…» con role=status.
- Éxito: lista semántica de registros y contador, sin operaciones de edición.
- Vacío: mensaje explícito con role=status.
- Error o respuesta inválida: aviso con role=alert y botón Reintentar que consulta de nuevo.
- Peticiones canceladas al desmontar no generan un error de interfaz.

HTML con lang=es, header/main/section/footer, títulos jerárquicos y lista ul/li.
El enlace de marca y el botón usan controles nativos; foco visible de 3px y offset 4px.
Los números decorativos se ocultan al árbol accesible. Mantener uso de teclado, etiquetas
comprensibles y significado independiente del color al añadir interacciones aprobadas.

## Verificación y límites
Playwright comprueba el flujo y estados en 390×844 y 1440×1000; las capturas de página
completa de STEP 1 se inspeccionaron: legibilidad, jerarquía, espacios y ausencia de recortes.
Rutas y evidencia en [bootstrap](../bootstrap.md). No se ha hecho auditoría WCAG,
medición automatizada de contraste ni prueba con lector de pantalla: no afirmar conformidad.
Futuros cambios visuales deben verificar teclado, foco, contraste y estados afectados,
además de operar los flujos y capturar/inspeccionar 390px y 1440px según la Skill dev.

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
