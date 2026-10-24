# 09 — Plan del ciclo: progreso

Estado: EN CURSO. Rama codex/dev09-plan-ciclo; base main 568aeed.
Autorización: usuario «Autorizo dev 09», 2026-10-24. Spec09 rev4 aprobada.
Un ejecutor; sin merge, despliegue, Excel real ni reanudación Dev32/B3.

## Incrementos

- [x] I1 Migración v9→v10, persistencia, continuidad y backup.
- [x] I2 Motor R3 exacto, API lectura/preview/confirmación/copia y auditoría.
- [x] I3 Consumidores de impacto Presupuestos y Partidas.
- [ ] I4 UI responsive, recorrido navegador y accesibilidad.
- [ ] I5 Regresiones completas y QA independiente.

Candidato implementado, todavía sin PASS global. Typecheck/build correctos;
P1–P10 focales correctos y P12/P13 correctos. P11 backup/production requiere Linux.
E2E independiente real ha pasado una vez; se amplía copia efectiva/No aplica y
se repetirá tras formato. Capturas iniciales revisadas por coordinador.
Primera API completa en macOS:85 pass/46 fail con tmpdir /var alias. Segunda
con TMPDIR=/private/tmp:90 pass/42 fail por publicación Linux libc.so.6 ausente;
no se modifica apertura ni se desactiva test alguno. Gate Linux CI pendiente.
Próximo paso: formato, focales vigentes, E2E actualizado y QA independiente.
Cierres E4.9 y fuentes E3/E4 permanecen futuros, sin proveedores ficticios.

Checkpoint: fixturev9 extraída literalmente de main568aeed con imports/nombre
adaptados; tabla escritorio y tarjetas móvil conformes al wireframe. Formato
Prettier3.6.2 aplicado desde binario local; npm escalado no ejecutado tras bloqueo
de aprobación/aborto. No hay commit de este ejecutor; coordinador publicará candidato.
E2E ampliado listo para repetir, incluye copia efectiva, No aplica y restoreUI
(en recorrido Linux financiero). No se tocan archivos de metodología del coordinador.

## Candidato del coordinador — verificación local actual

Recorrido ampliado `planes-ciclo.spec.ts`:1 PASS,4.1s con MFA/Effect/SQLite/Chromium
reales, copia efectiva, No aplica, null/cero, recarga y conflicto/borrador. Tabla1440
y tarjetas390 inspeccionadas. Corregido solapamiento de columnas por anchuras heredadas;
regresión verifica anchura/contenido de cabeceras y contraste real de acciones ≥4.5.
Ningún cambio a test/timeouts para omitir fallos. Full Linux y QA del SHA fijo pendientes.

## Correcciones QA del candidato 45a73cf

PR #57 en borrador. Primera CI Linux40075502671:135 API PASS/3 FAIL; fallos en
paths de backup de dos regresiones (creaban v9 y buscaban v10) y configuración del
destino productivo de P11 antes de restore. Corregidos fixtures, sin relajar guardas.
QA detectó reintento inicial del catálogo no funcional y riesgo de respuesta manual
antigua al cambiar Ciclo: catálogo recargable y generación de peticiones implementados.
E2E real ampliado1 PASS/4.6s demuestra error→reintento y respuesta tardía descartada.
Typecheck/check-project/whitespace PASS. Nueva CI Linux y revisión del delta pendientes.
