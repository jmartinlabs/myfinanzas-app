# Ui guidelines

## Alcance
Interfaz web en español para el catálogo ficticio, implementada en STEP 1 y descrita
en STEP 2. CSS propio, sin librería UI. Estos valores documentan el bootstrap existente;
no constituyen una identidad visual definitiva ni un diseño aprobado para futuros módulos.

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
