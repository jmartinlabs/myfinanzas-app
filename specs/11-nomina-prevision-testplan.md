# 11 — Nómina histórica y previsión separada: Test plan
Specification: [spec11](11-nomina-prevision-specification.md)

**Resultado vigente: PASS final Linux e integrado PR63.** Candidato `7d24a7f`,
main `ed4a272`; [CI40128422924](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40128422924)
SUCCESS con169 API/2683 aserciones y5 E2E. P11 backup/restore v12 demo/production PASS,
N:M/originales/auditoría conservados e intentos revocados. Focal final22 PASS/156
aserciones y QA independiente PASS. [Cierre y procedencia](11-nomina-prevision-progress.md#cierre-vigente--2026-10-24).
El mapping y los resultados parciales siguientes conservan la evidencia previa a CI;
las menciones pendientes quedan resueltas por este cierre, sin borrar fallos históricos.

Candidato local en verificación (checkpoint histórico). Ningún AC actual se reclasifica como futuro.
La aprobación documental completa/visual y el gate dev11 del usuario son distintos de
la evidencia de implementación. Sin datos reales, Excel, despliegue o merge; publicación del candidato para CI según política Git.

C1: `PATH=/tmp/myfinanzas-runtime/bun-darwin-aarch64:$PATH TMPDIR=/private/tmp NODE_ENV=test bun test apps/api/src/nomina.test.ts`.
C2 (coordinador): `node node_modules/@playwright/test/cli.js test tests/e2e/nomina.spec.ts`, con runtime/Chrome locales.

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Dos pagas documentadas del mismo Mes/Tipo | IDs distintos; no restricción única artificial | P1 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-02 | Cambiar referencias/escenario actuales | Originales/procedencia histórica intactos | P8/P14 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-03 | Base y tasa informadas o ausencia | Producto solo con operandos;0 informado no es falta | P6/P10/P15 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-04 | Ordinaria con Guardia | Atributo original; fórmula confirmada, sin paga/ingreso extra | P18 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-05 | Bonus | Neto estructural vacío, no cero ni fórmula de Ordinaria | P2 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-06 | Sin Guardia=Sí frente a con Guardia=Sí | Neto o fórmula completa según rama física; completitud propagada | P18 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-07 | Una paga con dos abonos parciales | Dos IDs/asignaciones/fechas conservados; suma sin fusión | P9 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-08 | Dos Ordinarias mismo mes | IDs/evidencia explíctos; no primera fila arbitraria | P1/P2 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-09 | Junio salarial cobrado en julio | Mes original intacto; ciclo por Fecha real | P3 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-10 | Abono sin evidencia | Remanente pendiente; Movimiento vigente intacto | P3/P15 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-11 | Intereses/Promoción | No candidatos salariales ni ingresos de Nómina por coincidencia | P9 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-12 | Un abono para varias pagas | N:M, cada importe asignado; un solo Movimiento real | P2 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-13 | Revisión y cambio de Movimiento | Contexto obsoleto rechazado sin pérdida de borrador | P4/P8 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-14 | Dos procesos asignan mismo remanente/doble envío | Suma global nunca excede el banco; idempotencia y rollback | P8/P12 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-15 | Anular/rectificar hecho con asignaciones | Revisión de coherencia/trazabilidad; no contabilizar vínculo inválido como verificado | P4/P9 · comando focal C1 o navegador C2 | PASS focal y C2: rectificación bancaria real muestra impacto e invalida vínculos sin alterar originales | 2026-10-24 · fuentes locales, sin CI |
| AC-16 | Consultar flujo del ciclo | Movimiento una vez, no Neto histórico+asignaciones+abono | P17 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-17 | Variable/Ajuste pp | Tres fórmulas confirmadas, unidades exactas y fuentes visibles | P6/P10 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-18 | Editar pronóstico | No escribe histórico/banco/presupuesto/Ciclos | P19 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-19 | Sin elegibles o empate de mes | No disponible o selección explícita con evidencia, sin orden físico | P10 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-20 | Paga futura/incompleta | No referencia de hecho confirmado ni nuevo cobro | P19 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-21 | Estimado/documentado/cobrado mismo periodo | Tres magnitudes separadas, sin triple ingreso | P17/P19 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-22 | Prudente vs base | +0,27pp sobre Último IRPF, no sobre tasa ya ajustada; resta con signo | P6 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-23 | Ajuste± y tasa fuera0–100 | Sin banda arbitraria; escenario inválido con motivo, no clamp | P6/P10 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-24 | Móvil/escritorio/errores/conflictos | Diseño aprobado y evidencia de implementación390/1440 | E2E · comando focal C1 o navegador C2 | PASS C2 final: async/corte/conflicto/rectificación/contraste y capturas inspeccionadas | 2026-10-24 · fuentes locales, sin CI |
| AC-25 | Abono1500 asignado1000+500 | Remanente0 y flujo1500, no3000 | P2 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-26 | Abono1000 asignado600 | Remanente400, hecho real1000 conservado | P3/P12 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-27 | Importe del banco baja por debajo de lo asignado | Inconsistencia visible y revisión; no alterar abono para cuadrar | P4 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-28 | Neto histórico0 y banco positivo | Histórico0/origenHistórico preservados; cobrado/diferencia separados | P1/P15 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-29 | Múltiples abonos y conciliación desconocida | Primera/última/lista/número visibles; fecha completa vacía con motivo | P3/P9 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-30 | Candidatas mismo mes con valores diferentes | Seleccionar por ID/evidencia una paga coherente, no sumar/mezclar operandos | P20 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-31 | Variable inicial0 y Ajuste0 con/sin referencias | Cálculo solo con fuentes válidas; defaults no fabrican datos faltantes | P3/P6 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-32 | Ajuste manual mayor que+0,27pp | Diferencia prudente puede ser positiva; no forzar signo | P6 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-33 | Prudente inválido pero base válido | Estados por escenario separados; base conservado | P10 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-34 | Tasas largas/medio céntimo/cálculo compuesto | Sin redondeo intermedio; equivalencia final a verificar, no declarada ahora | P7/P20 · comando focal C1 | PASS contrato decimal exacto/final; sin equivalencia física Excel afirmada | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-35 | Abono mixto Ordinaria/Bonus de meses distintos | Desglose con evidencia y Subtipo original, sin dos ingresos artificiales | P17 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-36 | Abonos de misma paga en ciclos distintos | Cada abono en ciclo real, no mover fechas a Mes salarial | P17 · comando focal C1 | PASS focal de comportamiento | 2026-10-24 · complemento C1:21 PASS/152 assertions |
| AC-37 | No existe referencia documental válida, aunque haya Ingresos | Cobrado/fechas reales visibles; Diferencia/Fecha completa no disponibles, sin cifra inventada | P3 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-38 | Neto bancario parcial disponible | No se eleva a documentado ni a referencia fiscal definitiva | P3 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-39 | Variable prevista negativa/ajuste salarial histórico negativo | Política app no negativa del forecast diferenciada de preservación del histórico | P6/P10 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-40 | Referencia0 fiscal informado y completo | No se sustituye por ausencia ni se aplica LOOKUP físico como regla universal | P6/P15 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-41 | Informar/corregir Neto documentado con evidencia | Dato manual opcional/procedencia/auditoría; Histórico intacto; no se obtiene del banco | P5/P14 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-42 | Documentado e Histórico discrepan | Aviso y resolución explícita; no elegir por prioridad ni coincidencia con banco | P5 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-43 | Cambia un original tras revisar referencia/conciliación | Revalidación del contexto; no confirmar selección obsoleta ni perder trazabilidad | P4/P5/P8 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-44 | Vacío frente a0 documentado; ninguno conocido | Ausencia/0 distintos; no llenar con total cobrado ni fecha de forecast | P1/P3 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-45 | Referencias coinciden monetariamente con un abono no vinculado | No asociación automática ni conciliación demostrada por mera igualdad | P15 · comando focal C1 o navegador C2 | PASS focal (C1); E2E C2 complementario PASS, sin atribuirle todos los casos focales | 2026-10-24 · fuentes locales, sin CI |
| AC-46 | Preparar diseño físico antes de futuro dev | Comprobar campo semánticamente idéntico; reutilizar si existe, sin duplicar banco/documento | Preflight · comando focal C1 o navegador C2 | PASS inspección de código; entidad nueva sin campo idéntico | 2026-10-24 · fuentes locales, sin CI |

## Regression checks
- Última focal registrada antes de ampliaciones finales: 16 PASS, 0 FAIL,94 assertions.
- Typecheck final PASS y build final PASS (31 módulos); cambios posteriores del complemento C1 tienen typecheck PASS.
- Nuevas versiones actuales esperadas de suites existentes actualizadas a12; no elimina assertions.
- P11 de `planes-ciclo.test.ts` amplía backup/restore demo/production: originales, N:M, fecha/cobrado y auditoría Nómina
  preservados e intentos revocados. Preparado, NO ejecutado aquí por guardas Linux.
- Fases canónicas: `scripts/verify baseline` PASS. `scripts/verify application`: typecheck/build PASS; API120 PASS/43 FAIL en macOS, antes del complemento P17–P21.39 fallos muestran falta de libc.so.6 y4 corresponden a procesos de inicialización/publicación dependientes del entorno Linux. E2E global UNRUN por fallo previo; C2 focal sí ejecutado. No es un full PASS; CI Linux queda obligatorio y pendiente. No se omiten ni relajan guardas.
- P12 ejecuta dos procesos Bun contra el mismo archivo WAL y contexto: un SAVED/un CONFLICT,
  una asignación700/1000 y remanente300, sin auditoría duplicada.

## Functional verification
P1–P16 en `apps/api/src/nomina.test.ts`: originales y0, IDs repetidos Mes/Tipo, N:M global,
parciales, invalidación banco, discrepancia/resolución, fórmulas/pp, precisión decimal,
preview rollback/idempotencia, conciliación/fechas, empate/futuro, genuinev11 y rollback,
procesos concurrentes y protección ABA por revisión monotónica, Effect HTTP con MFA/Origin/CSRF/no-store, auditoría de deltas.
`database-v11.ts` usa builder genuino v9 y extensiones v10/v11 sin crear Nómina ni reetiquetar v12.
El preflight no encuentra entidad/campo semánticamente idéntico a Neto documentado.

## Browser verification (web only)
Primer intento sandbox falló `config.webServer`; la escalación del ejecutor quedó esperando
803s y fue interrumpida sin ejecución. El coordinador centraliza permisos/navegador.
Primer recorrido real del coordinador PASS1(3,4s), capturas ficticias
`artifacts/e2-5/nomina-390.png` y `artifacts/e2-5/nomina-1440.png` inspeccionadas por coordinador.
Ampliación vigente de E2E: importe inválido conserva borrador, conflicto real mediante
API autenticada concurrente y retry, Neto documentado, reparto/forecast, viewport/overflow.
Ejecución final ampliada C2 PASS1 (3,7s): respuestas reales retenidas/descartadas al cambiar borrador y pronóstico, corte explícito, conflicto HTTP concurrente con retry, corrección bancaria desde Movimientos con aviso salarial y vínculos invalidados. Originales conservados y ledger único. Capturas finales inspeccionadas390/1440; tabla/tarjetas legibles y sin overflow.
Factores/credenciales no aparecen en capturas. Sin trace/storageState.

## Visual improvements (visual apps only)
1. Tabla compacta escritorio y tarjetas móvil equivalentes; IDs largos parten sin overflow.
2. Comparación legible por campo/fuente/asignación antes/después, sin JSON técnico al usuario.
3. Originales Devengo/Base/IRPF/Variable/Guardia/Nota y evidencias consultables; acción Documentar
   neto mantiene histórico y otros originales de solo lectura.
4. Fechas con tratamiento de no salto; capturas esperan estado Histórico estable.
5. Selectores con nombre accesible explícito; error enfocado y borrador conservado.
Paleta existente/acciones oscuras se reutiliza. C2 mide colores computados de cabeceras y acciones: mínimo6,04:1 (umbral4,5). No auditoría WCAG completa.

## Limitations and next action
N:M es ampliación aprobada de app y difiere de C176 físico. No proveedor ficticio de cierres,
calendario o importador. No equivalencia binaria/artefactos Excel afirmada; vectores exactos
sanitizados prueban el contrato decimal aprobado, sin inspección del libro.
QA independiente del candidato y deltas PASS sin bloqueantes; C2 final y contraste PASS. Regresión completa/restore en Linux pendientes de CI; no entrega integrada ni full PASS local.
No declarar entrega completa ni integrada hasta cerrar gates actuales con evidencia.

## Complemento focal de aceptación dev11
2026-10-24: C1 **21 PASS/0 FAIL,152 assertions**; typecheck y diff-check PASS.
Sólo pruebas nuevas P17–P20 para cobertura pendiente y ajuste civil de mes P21:

- P17 opera `listMovements` real filtrado por maestro Ciclos: julio un Ingreso1000 con
  reparto Ordinaria600/Bonus400 de meses salariales distintos; agosto otro Ingreso400
  de la misma Ordinaria; junio0. Total bancario1400, fechas/subtipo/ledger íntegros,
  cobro completo de Ordinaria en agosto. No suma histórico/documentado/asignaciones al flujo.
- P18 comprueba GuardiaSí con2000/1800/15%/Variable200/Neto1500 → Retención270,
  Deducciones230 y Estructural1330; GuardiaNo/null →1500 conservando ausencia; Bonus→null.
  Neto parcial600 produce Deducciones1130/Estructural430 marcados parciales y no elegibles.
- P19 compara todas las tablas persistidas antes/después de cuatro escenarios, error y
  consulta sin fuente; incluye Presupuesto/Plan del ciclo/Plan anual/Ciclos con datos ficticios.
  Verifica originales/auditoría/ledger/planificación intactos y exclusión de futura/incompleta.
- P20 selecciona explícitamente cada fuente de un empate con operandos distintos y prueba
  compuesto de tasa larga sin redondeo: base exacto1609.078172202→1609,08 y prudente
  exacto1599.5867775939795→1599,59, diferencia−9,49 desde exactos. Se contrasta el contrato
  decimal aprobado con constantes sanitizadas, sin afirmar inspección o equivalencia física Excel.
- P21 prueba31oct23:30UTC=1novMadrid: corteNov admitido y fuente noviembre elegible;
  antes del cambio civil se rechaza como futuro. UI usa Intl con zona Europe/Madrid.

Los resultados E2E/QA/globales posteriores los mantiene el coordinador; este complemento
no relanza esos gates ni cambia sus evidencias por inferencia.

## Corrección de fixture tras primera CI Linux — 2026-10-24

Candidato `5979731`, run40128010086: baseline PASS; API167 PASS/1 FAIL (2660assertions),
E2E global UNRUN. Único fallo en P11 backup/restore: nuevo abono asumía S001,
inexistente en la base production sin cuentas demo. No fallo del reparto ni permiso
para omitir el ensayo. La fixture crea ahora destino mediante createSaldo y utiliza
su ID real en ambos orígenes. P22 reproduce production-v9 sin cuenta demo, migra,
crea destino explícito y verifica N:M/FK. Corrección limitada a pruebas y revisión
independiente PASS. C1 repetido por delta de pruebas:22 PASS/156 assertions; typecheck
PASS. CI Linux/restore completo aún pendientes del candidato corregido.
