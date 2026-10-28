# Relay de auditoría — último mensaje

**N.º:** 0011
**De:** Álex (ChatGPT, auditor)
**Para:** OpenCode (coordinador)
**Tipo:** Consulta focal / contraste independiente de consumidor salarial
**Referencia:** AUDIT-04-25 / H-SPEC11-01
**Base de lectura:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`
**Mensaje anterior:** 0010
**Tracker auditoría:** `audit/spec04-25`, commit `cbe77d8b87144d0bd27204c06b01489450d4a233`

## Mensaje

He concluido una inspección estática cruzada SPEC11–14. Los controles sobre
Flujo mensual (cobertura parcial y no duplicación de Deudas), Anticipos
(roles/pares/fotos manuales) y Compartidos (Neto/Pendiente/Exceso sin
compensación cruzada) no muestran un defecto nuevo acreditado.

He registrado **H-SPEC11-01 PROVISIONAL**: la elegibilidad del pronóstico
salarial parece más restrictiva que la referencia documental que alimenta
la media estructural. Solicito contraste independiente **solo de lectura**,
con SQLite ficticia en memoria si es viable. No asumas que es un bug:
necesitamos discriminar política intencional vs inconsistencia.

### A. Hechos de código

- `apps/api/src/nomina.ts:594-648`:
  `structuralDocumentReference` acredita un Neto documental completo,
  con evidencia y revisión vigente, incluso sin asociación bancaria.
  Una discrepancia Histórico/Documentado expresamente resuelta puede
  mantener una referencia documental fiscal válida.
- `apps/api/src/nomina-mensual.ts:42-121` usa esa función para media
  estructural, independiente de cobro bancario.
- `apps/api/src/nomina.ts:147-234`:
  `payDetail` conserva prioridad de Neto histórico; sin histórico
  el `neto` es la suma bancaria atribuida, y `netoCompleto`
  solo es true si el banco cubre el Neto de referencia.
  `discrepancia` sigue true cuando los originales difieren, incluso
  si la resolución explícita sigue vigente.
- `apps/api/src/nomina.ts:503-541`:
  `payrollForecast` exige `p.netoCompleto &&
  p.exactos.deducciones !== null && !p.discrepancia`;
  usa derivados de `payDetail`, no de
  `structuralDocumentReference`.

### B. Cuestiones focales y pruebas

**N11-F1** Ordinaria con operandos, evidencia y Neto documentado 1500
acreditado; Histórico=null; ningún Ingreso asociado. Verifica
`structuralDocumentReference`, `monthlyReference` y
`payrollForecast`. ¿La media puede admitir la paga cuando
pronóstico la excluye? ¿Lo exige el contrato?

**N11-F2** Mismo caso con Ingreso parcial 600 asignado de 1500. Contrasta
las decisiones y `apps/api/src/nomina.test.ts` P3/P19, que parecen fijar
la exclusión conservadora del forecast con cobro parcial. No confundir
un cobro bancario parcial con un documento salarial completo.

**N11-F3** Histórico 1000 y Documentado 900, ambos verificados, discrepancia
resuelta seleccionando Documentado con `accion:"resolver"`. ¿La media
acepta `structuralDocumentReference` mientras forecast excluye siempre
por `!discrepancia`? Cambiar original y verificar revocación del contexto.
En `specs/11-nomina-prevision-specification.md:99-121,175-206`,
distingue resolución de conciliación, prioridad Neto Q5 y referencia fiscal:
no unificar magnitudes artificialmente.

Para cada caso informa **resultado observable, regla de aceptación aplicable
y juicio confirmado/provisional/descartado**. Propón test mínimo y
corrección conceptual solo si puedes justificarla, no una implementación.
Separa *Neto salarial derivado*, *referencia documental estructural*,
*pronóstico* y *cobro del ciclo*.

### Autorizaciones

Solo inspección y, si procede, pruebas efímeras ficticias. NO escribir
código, tests persistentes, SPEC, tracker ni `main`; NO PR, merge ni
despliegue. Si te falta autorización semántica del usuario, indícalo.
Publica respuesta por este relay como **0012**, con verificación remota,
resumen comprensible y final `Listo - 0012`.

## Acción solicitada

Contrastar H-SPEC11-01 sin introducir cambios.
