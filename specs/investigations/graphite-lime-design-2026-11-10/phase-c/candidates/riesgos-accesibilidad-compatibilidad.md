# Riesgos de accesibilidad y compatibilidad

**Estado:** evaluación de diseño/prototipo. No hay implementación ni auditoría WCAG completa.

## 1. Accesibilidad

| Riesgo | Severidad | Evidencia / mitigación |
| --- | --- | --- |
| Confundir lima de marca con positivo financiero | **Alta** | Graphite usa lima `#D7FF5E` para acción/marca y menta `#7FE0A8` para positivo. “Vigente” es neutro; “Completo/Guardado” es menta. Debe auditarse cualquier `var(--accent)` usado como resultado positivo. |
| Texto secundario oscuro sobre carbón con margen ajustado | Media | Mínimos medidos: 5,16:1 en Movimientos/Estados y 5,76:1 en formularios. Cualquier aclaración futura de `--muted` debe revalidarse. |
| Inputs sin outline visible | **Alta** en el base actual | El prototipo base usaba borde/sombra y `outline: none`; se añadió un anillo de 3 px `--focus` para inputs/selects/textarea en candidatos. La integración debe aplicar la misma regla global en producción. |
| Foco en filas/tarjetas | Media | Fila de tabla con `tabindex` y outline de 3 px; tarjeta móvil con refuerzo propio. En producción, si la fila usa enlaces/botones, conservar foco y activación por Enter/Espacio. |
| Navegación por teclado del menú móvil | Media | Probado: abre, enfoca dentro, Escape cierra y devuelve foco. Mantener al migrar el shell. |
| Zoom 200 % | Media | Equivalente 720/640 px sin overflow de página; la tabla conserva scroll interno. Falta prueba manual real y con textos largos. |
| `prefers-reduced-motion` | Media | El prototipo base reduce transiciones a 0,01 ms; producción solo cubre un summary. Extender la regla global. |
| Objetivos táctiles | Baja | 0 controles visibles < 44 px a 390 en Movimientos/Estados/Formularios. Los controles compactos de escritorio no se consideran táctiles. |
| Estados solo por color | Baja | Badges con texto/icono, selección con barra/fondo, importes con signo y color. Mantener esta regla. |
| Formularios con campos derivados | Media | Capital/intereses, Deuda y cambio EUR son de solo lectura/condicionales. No convertirlos en entradas editables ni inventar valores. |
| Lector de pantalla / zoom manual | Pendiente | No probado; debe entrar en la QA del incremento 6. |

## 2. Compatibilidad técnica

| Riesgo | Severidad | Mitigación |
| --- | --- | --- |
| `theme-boot.js` hardcodea IDs | **Alta** | Actualizar la lista `known` al añadir Grafito; si no, la preferencia guardada cae a `dark-s` tras recargar. |
| `themes.ts` y `themes.css` desincronizados | Alta | Un único incremento debe añadir catálogo, tipo, bloque CSS y boot; test de persistencia/recarga. |
| `--positive` actualmente igual a `--accent` | Alta | Graphite los separa. Auditar componentes que usan `--accent` para ingresos/ok. No cambiar los temas existentes sin revisar su semántica. |
| CSS de prototipo con nombres/estructura propios | Media | No copiar `candidates.css` completo; traducir a tokens y estilos de componentes existentes. |
| Shell de 264 px vs producción 236 px | Media | El tema no cambia layout; conservar 236 y el contenido máximo actual. |
| Navegación del prototipo con módulos futuros | Alta | No habilitar rutas por el tema; usar el inventario real de `navigation.ts` y permisos. |
| Formularios duplicados | **Alta** | Reutilizar `Inversiones.tsx` y `Movimientos.tsx`; el prototipo solo valida presentación. No reescribir payloads ni validación. |
| Fechas nativas y locale | Baja | Mantener `input[type=date]`; la visualización `dd/mm/aaaa` depende del locale del navegador. No convertir a texto sin decisión de producto. |
| Regresiones en Dark/Light/Hybrid | Media | QA visual de los tres temas en cada incremento; no tocar sus bloques de tokens. |
| Especificidad CSS | Media | Prefijar tokens por `[data-theme]`; evitar `!important` salvo reduced motion; revisar overrides de módulos. |
| Dependencia del desarrollo funcional | Alta | Revalidar el tablero antes de DEV. Los módulos con AC pendientes o DEV no autorizado no deben recibir cambios de formulario/estado por el tema. |
| `test`/`main` y despliegue | Alta | Sin merge ni deploy; flujo `feature/* → test → main` con aprobación explícita. |

## 3. Riesgos de producto

- **Sobreintegración temprana:** implementar los seis temas antes de estabilizar los módulos
  funcionales multiplica la QA. Recomendación: Graphite primero; Color después; Pastel solo
  como candidato.
- **Tema como excusa para rediseñar flujos:** el tema debe cambiar superficie/tipografía, no
  validaciones, campos, permisos ni cálculos.
- **Densidad excesiva:** Graphite es compacto; no reducir tipografía ni objetivos táctiles para
  ganar filas. La QA ya fija 12 px y 44 px.
- **Pérdida de semántica:** lima para todo es el riesgo visual más probable. La tabla de tokens
  y la revisión de código deben impedirlo.

## 4. Riesgos aceptados en el prototipo

- No se ha probado con lector de pantalla.
- El zoom 200 % se ha simulado por ancho CSS equivalente, no con el zoom manual del navegador.
- Los formularios son demostrativos y no ejecutan lógica.
- Los datos son sintéticos.
- La navegación del prototipo incluye módulos futuros que no deben exponerse aún.

## 5. Puertas antes de implementar

1. Ratificación/actualización de la spec UI y decisión de catálogo.
2. Confirmación de que se implementa **solo Graphite** inicialmente.
3. Revalidación del tablero y de las dependencias funcionales.
4. Test de `theme-boot` + persistencia + fallback.
5. QA de foco, contraste, zoom, motion y responsive.
6. Revisión independiente y aprobación de merge.
