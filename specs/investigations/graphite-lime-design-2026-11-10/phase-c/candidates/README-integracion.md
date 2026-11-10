# Paquete de integración · Graphite Lime

**Estado:** paquete de diseño y planificación. **No implementado.**
**Decisión:** Graphite Lime aprobado como candidato prioritario de integración futura.
**Fecha:** 2026-11-10.
**Base:** `feature/ui-premium-exploration`; checkout limpio; sin commits, push, merge ni deploy.
**Incremento 1A:** ejecución **detenida en el precheck**; la spec UI vigente no permite aún un
cuarto tema ni tocar tokens/`theme-boot.js`. Ver
[`incremento-1-bloqueo.md`](incremento-1-bloqueo.md).

## Documentos

| Documento | Contenido |
| --- | --- |
| [`README-graphite-final.md`](README-graphite-final.md) | Cierre de validación, semántica, formularios y evidencia |
| [`qa-graphite-final.md`](qa-graphite-final.md) | Contraste, foco, teclado, zoom, motion, táctil y overflow |
| [`catalogo-temas-tokens.md`](catalogo-temas-tokens.md) | Catálogo de seis temas y propuesta de tokens Graphite |
| [`inventario-componentes.md`](inventario-componentes.md) | Componentes reutilizables y reglas para no duplicar |
| [`riesgos-accesibilidad-compatibilidad.md`](riesgos-accesibilidad-compatibilidad.md) | Riesgos y mitigaciones |
| [`plan-integracion-visual.md`](plan-integracion-visual.md) | Incrementos 1–6, dependencias y criterios de salida |
| [`incremento-1-propuesta.md`](incremento-1-propuesta.md) | Propuesta concreta del Incremento 1: archivos, diff, pruebas, aceptación y preservación |
| [`README-movimientos.md`](README-movimientos.md) | Movimientos, responsive y estados ya entregados |
| [`README.md`](README.md) | Inicio de los tres candidatos |

## Prototipos

- [Inicio Graphite](inicio-candidatos.html)
- [Movimientos Graphite](movimientos-candidatos.html)
- [Estados Graphite](estados-candidatos.html)
- [Formularios Graphite](formularios-graphite.html)

## Evidencia visual

- [Inicio Graphite](shots/graphite-lime-1440.jpg)
- [Movimientos Graphite](shots-movimientos/graphite-lime-1440.jpg)
- [Movimientos tablet](shots-movimientos/graphite-lime-820.jpg)
- [Movimientos móvil](shots-movimientos/graphite-lime-390.jpg)
- [Detalle móvil](shots-movimientos/graphite-lime-390-detail.jpg)
- [Estados y formularios](shots-estados/graphite-lime-1440.jpg)
- [Formulario Compra USD](shots-formularios/graphite-lime-1440.jpg)
- [Formulario Compra EUR](shots-formularios/graphite-lime-1440-eur.jpg)
- [Formulario móvil](shots-formularios/graphite-lime-390.jpg)

Tableros:

- [Inicio · candidatos](comparativa-candidatos.jpg)
- [Movimientos · candidatos](comparativa-movimientos-desktop.jpg)
- [Movimientos · responsive](comparativa-movimientos-responsive.jpg)
- [Movimientos · seis temas](comparativa-movimientos-familia.jpg)
- [Estados Graphite](comparativa-estados-graphite.jpg)
- [Formularios Graphite](comparativa-formularios-graphite.jpg)

## Recomendación

1. Implementar inicialmente **solo Graphite Lime**, en los incrementos 1–4 de
   [`plan-integracion-visual.md`](plan-integracion-visual.md).
2. Conservar **Color Finance** como segundo candidato, sin más refinamiento ahora.
3. Conservar **Pastel Editorial** como candidato experimental, sin más refinamiento ahora.
4. Mantener Dark, Light y Hybrid sin cambios y sin regresiones.
5. No integrar los seis temas a la vez ni desplegar sin autorización específica.

## Diseño vs implementación vs validación

- **Diseño aprobado:** dirección Graphite Lime y sus pantallas de Inicio, Movimientos,
  responsive, estados y formularios.
- **Implementación pendiente:** bloque de tokens, catálogo, boot, shell, pantallas y QA de
  integración. Nada de esto se ha tocado.
- **Validación funcional:** cada módulo conserva sus specs y QA. La integración visual no
  valida ni cambia motores financieros.

## Límites

- No se ha modificado la aplicación funcional, la API, DTO, SQLite, el Excel, los motores
  financieros, los tokens de producción ni las ramas `test`/`main`.
- Datos exclusivamente sintéticos.
- No hay lector de pantalla, zoom manual real, pruebas con usuarios ni auditoría WCAG completa.
- No hay commit, push, merge ni despliegue.

## Siguiente paso

Revisar este paquete y, si se aprueba, autorizar el **Incremento 1** según la propuesta concreta
[`incremento-1-propuesta.md`](incremento-1-propuesta.md). No se inicia ningún incremento en esta
entrega.
