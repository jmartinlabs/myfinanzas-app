# 03 — Ciclos financiados: test plan
Status: VERIFIED LOCAL (2026-10-21, histórico) — 21 criterios E1.3 verificados;
PR #13 integrada en `ff9d18d`; auditoría 2026-10-28 con H-SPEC03-03 en corrección.
Fecha: 2026-10-21. Contrato: [especificación aprobada](03-ciclos-financiados-specification.md).
Base histórica: `feat/e1-3-ciclos-financiados`, main `179942e` (PR #12 aprobada sobre `bf3f2eb`).

## Suites y comandos
Desde la raíz con Bun 1.4.3 y age/age-keygen disponibles:
- `bun run typecheck`: PASS.
- `bun run build`: PASS, sin despliegue.
- `bun run test`: PASS, **33 pruebas / 451 assertions / 0 fallos** (8 nuevas de E1.3,
  25 regresiones E1.1/E1.2). Archivos en apps/api/src, sin saltar pruebas previas.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`: PASS,
  1 recorrido integrado E1.1/E1.2/E1.3 con servidores Effect/SQLite reales, MFA,
  copia cifrada/restauración aislada, 390/1440 px. No bypass de autenticación.
- `./scripts/validate-template`, `./scripts/test-validator`: PASS, 18 regresiones.
- `./scripts/check-project`, `./scripts/test-checks`: PASS, 22 regresiones.
- `./scripts/check-repository`, `git diff --check`: PASS; complementados por revisión
  manual de mensajes/rutas/contenidos de todos los commits salientes, índice y diff final.
- `bun audit --json`: `{}`, sin advisories reportados; no equivale a auditoría completa.

Claves de evidencia: **B1–B8** son, en orden, los ocho tests de
`apps/api/src/ciclos.test.ts`; **E3** es `tests/e2e/ciclos.ts`, incorporado al recorrido
`tests/e2e/catalog.spec.ts`. Cada fila identifica acción, resultado y prueba; comandos
B/E3 son los anteriores. Evidencia visual en artifacts/e1-3 y artifact PNG de CI.

## Trazabilidad completa
| AC | Resultado actual y evidencia |
| --- | --- |
| AC-01 | PASS B2/B8 + E3: maestro vacío, alta sin Nómina, ID estable, lectura real; sin movimiento creado. |
| AC-02 | PASS B2/B8: campos derivados/extra rechazados; E3 solo permite dos entradas financieras. |
| AC-03 | PASS B1: 25/10→01/11, 31/12→01/01 siguiente año; E3 muestra mes derivado sin selector. |
| AC-04 | PASS B1/B4 + E3: 28/02/2028 y 01/03/2028→Fin 29/02; cuatro husos (UTC/Madrid/Los Ángeles/Kiritimati), DST sin desplazamientos; sin hechos. |
| AC-05 | PASS B2 + E3: alta posterior conserva ID y deriva Fin previo; no ejecuta cierre. |
| AC-06 | PASS B1: referencia posterior de prueba no rellena Fin del último; E3 muestra Sin siguiente Inicio. |
| AC-07 | PASS B1: inclusión Inicio/Fin, referencia anterior y abierto anticipado, corte null motivado. E3 prueba solo estados realmente disponibles: Sin ciclos/No disponible; fuentes futuras no integradas. |
| AC-08 | PASS B1: contrato puro de máximo de tres fechas civiles ficticias; cobertura por fuente, sin reloj. No extracción desde hechos aún inexistentes. |
| AC-09 | PASS B2/B8 + E3: runtime con tres fuentes pendientes, referencia null, cabecera compartida sin fecha inventada. |
| AC-10 | PASS B1: fuente disponible vacía distinta de error; fallo fuerza referencia null, no máximo incompleto. Contrato puro, sin proveedor operativo simulado. |
| AC-11 | CONTRATO FUTURO: conectar máximos a Movimientos/Revisión Comida/inversión en sus entregas; no implementado ni integración probada. |
| AC-12 | PASS B2/B7/B8 + E3: Inicio y mes únicos, posterior estricto, distinto Inicio del mismo mes rechazado; años/meses distintos y fechas futuras válidos. |
| AC-13 | PASS B2 + E3: vacío/omitido/null rechazados; formulario vacío; cero explícito y -12,34 EUR preservados exactamente, sin copia de cierre. |
| AC-14 | PASS B2 + regresión monetaria E1.1: formato estricto/int64, exceso técnico/tercer decimal/number rechazados, sin redondeo silencioso. |
| AC-15 | PASS B2/B7 + E3: dos procesos compiten por mismo mes, solo una alta; dos clientes con contexto obsoleto→409 y borrador conservado; respuesta perdida tras escritura real→reintento mismo ID sin duplicación. |
| AC-16 | PASS B1/B4/B8: fecha inexistente rechazada, bisiesto y cambio de año correctos; representación civil de cuatro cifras. |
| AC-17 | PASS B3: 104 ciclos, paginación y filtros no alteran Fin calculado desde maestro completo; E3 filtra mes/estado y distingue Sin coincidencias. |
| AC-18 | PASS E3 + inspección PNG 390/1440: listado tabla/tarjetas, ficha y alta propias, dos entradas, foco/teclado y ausencia de overflow. No auditoría completa de lectores de pantalla. |
| AC-19 | PASS E3: vacío/carga real demorada/error/reintento, 404, 409, sesión caducada y borrador conservado; sin cero ni contexto ficticio. Pérdida de red tras escritura no duplica alta. |
| AC-20 | PASS B5/B6/B7: base E1.2 genuina congelada, filas previas/IDs/acceso/counters preservados, rollback DDL, desconocido intacto y upgrade concurrente. Regresiones conservan ruta v1. |
| AC-21 | PASS B5 + recorrido restauración E3: VACUUM INTO/age, v2 y v3 restaurables en destino aislado; MFA real tras restore, ciclos/saldos/clasificación preservados y Fin coherente. |
| AC-22 | PASS B8 + regresión acceso: sin MFA→401, Origin/CSRF→403, derivados/extra rechazados; errores genéricos y cabecera no-store existentes. |
| AC-23 | CONTRATO FUTURO: imputación económica por intervalos en consumidores; no hay motor de hechos ni prueba de atribución real. |
| AC-24 | CONTRATO FUTURO: cierre/reapertura/conciliación y rectificaciones E2.1; no implementados, sin copia automática del cierre a apertura. |

**21 PASS actuales; AC-11/23/24 son contratos futuros revisados, nunca pruebas financieras ejecutadas.**
B5 usa el inicializador v2 genuino congelado en apps/api/test-support/database-v2.ts,
no una base nueva v3 rebautizada. Compara tablas completas e intenta login/TOTP con
credenciales previas; upgrade no revoca sesiones. Restore sí aplica revocación existente.

**Estado actual (2026-10-28, `main` `3d87511`).** Movimientos (E1.4) y Revisión Comida
(E3.4) están integrados como fuentes temporales; Inversión sigue pendiente como fuente
temporal (sin proveedor conectado); SPEC22 aprobada documentalmente; DEV22 no iniciado;
proveedor temporal de inversión pendiente. AC-09/10
conservan su resultado histórico como contrato puro; AC-11/23/24 siguen CONTRATO FUTURO
y no se reclasifican. H-SPEC03-03 añade el estado `error` de `movementSource()` con
prueba de regresión; el detalle y los límites constan en el tracker de auditoría.

## Capturas y revisión visual
Solo datos ficticios; PNG ignorados por Git y publicados por CI como artifact
`e1-1-screenshots` (nombre heredado, incluye e1-1/e1-2/e1-3), retención 7 días.
Inspección directa de imágenes, no únicamente asserts de tamaños:
- 1440 px: list-desktop, detail-desktop, form-desktop, empty-desktop,
  duplicate-desktop y conflict-desktop.
- 390 px: list-mobile, detail-mobile, form-mobile, empty-mobile, validation-mobile,
  error-mobile, loading-mobile, session-draft-mobile y restored-mobile.
Rutas completas: `artifacts/e1-3/<nombre>.png`.

Cinco ajustes visuales/UX de mayor valor dentro del diseño aprobado:
1. Tabla de cuatro columnas con anchuras propias, evitando las columnas heredadas de Saldos.
2. Filtros apilados y cabecera de tarjeta con wrap en móvil: mes/etiqueta sin desbordar.
3. Cabecera común con carga/error/reintento y motivos diferentes; no presentar contexto obsoleto como actual.
4. Validación con foco, aria-invalid/aria-describedby y limpieza del error del campo al editarlo;
   409 conserva campos y exige refresco explícito del contexto.
5. Vista previa separada de entradas, con Inicio previsto en dd/mm/aaaa, mes y Fin previo
   legibles; evita ambigüedad del formato nativo de input date según navegador/SO.
No se rediseñan paleta/componentes ni se añade datepicker/dependencia. El input date
nativo puede verse mm/dd/yyyy en Chromium del entorno; su valor enviado es ISO civil,
la vista previa/listado/ficha explicitan fecha civil y mes financiado en español.
Texto oscuro sobre verde principal conservado; pares reales de la paleta compartida
verificados >=4,5:1 en recorrido. Tema claro incluso con preferencia dark del navegador.

## Incidencias y límites
El primer chequeo documental detectó exceso del máximo de 65 líneas en AGENTS al
registrar autorización; se compactaron estados históricos sin quitar política y
se repitieron validador y sus 18 regresiones: PASS. Sin bloqueo pendiente.
No hay datos reales, Excel, semillas de ciclos, fuentes financieras simuladas, nuevas
dependencias, despliegue ni infraestructura. SQLite/local y age actuales no equivalen
a inicialización productiva, custodia externa, automatización ni RPO/RTO demostrados.
PR de implementación: [#13](https://github.com/jmartinlabs/myfinanzas-app/pull/13),
**MERGED** por squash `ff9d18d` (2026-10-21). La evidencia local de este documento
corresponde al HEAD validado en esa PR y no se atribuye a commits posteriores; la CI
remota quedó registrada en la PR. La auditoría de 2026-10-28 no reescribe estos
resultados históricos.
