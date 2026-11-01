# Decisión — modelo de planificación y fuente de plan para E4.9

Fecha: 2026-11-01. Autor del registro: orquestador OpenCode, por decisión del usuario.
Estado: **aprobada por el usuario el 2026-11-01**; **D3 ratificado por el usuario el
2026-11-01**. Este documento registra decisiones; no implementa, no migra, no usa datos
reales y no autoriza DEV ni merge.

Contexto: revisión read-only de [PR #131](https://github.com/jmartinlabs/myfinanzas-app/pull/131),
[PR #132](https://github.com/jmartinlabs/myfinanzas-app/pull/132) y
[PR #134](https://github.com/jmartinlabs/myfinanzas-app/pull/134), dictamen del asesor y
[PR #152](https://github.com/jmartinlabs/myfinanzas-app/pull/152).

## 1. Decisiones

### D1 — Modelo de planificación: D′/SPEC33, provisional

- Se adopta como modelo de planificación **D′** ([SPEC33](../33-dprima-simplificada-specification.md)),
  ya integrado en `main`: Partidas raíz/hija, **Gastos Previstos** y **Plan Mensual por
  raíz** con Base, Esencial y Del mes.
- **Se descarta por ahora** el modelo de reservas/sobres virtuales, el maestro Fondo y el
  ledger de asignaciones propuesto en las auditorías. No se implanta ni se especifica.
- Presupuestos y Plan Anual legados permanecen **consultables y sin conversión**; no se
  reescriben hechos ni se inventan repartos.
- La raíz agrupadora **no registra Gastos nuevos ni crea consumo adicional**; la
  imputación económica sigue en la Partida/hoja.
- El Saldo exclusivo de D′ se mantiene como **restricción provisional de atribución**, no
  como propiedad del dinero reservado. Ampliarlo a varias finalidades por Saldo exigiría
  un caso demostrado y una decisión posterior.

### D2 — Corte de apertura único e inclusivo

`G` y `S` se leen al mismo corte civil, el día anterior al Inicio real del ciclo, e
incluyen los hechos de ese día. La corrección se integró en
[PR #152](https://github.com/jmartinlabs/myfinanzas-app/pull/152) (`main` `9240a52`);
la regla no cambia de significado, solo alinea la implementación con SPEC33.

### D3 — Fuente de plan que consumirá E4.9

**Ratificado por el usuario el 2026-11-01:** E4.9 utilizará el **plan D′ correspondiente al
ciclo**; si ese ciclo no tiene plan D′ aplicable, el **legado**; si D′ existe pero está
incompleto, **se bloquea el cierre** y no se recurre automáticamente al legado.

- La selección es **por ciclo y plan aplicable**, no por la mera existencia de un
  registro D′ en otra fecha o de una planificación general.
- Si ese ciclo tiene **Plan Mensual D′ aplicable**, el cierre E4.9 captura ese plan como
  plan final (líneas por raíz con Base, Esencial y Del mes).
- Si el Plan Mensual D′ **existe pero está incompleto o no es verificable**, el cierre
  queda en `PlanNoVerificable` y **bloquea**; no se usa el legado como respaldo silencioso.
- Si el ciclo no tiene fuente D′ aplicable, conserva el **plan legado del ciclo**
  (`cycle_plan_lines` por Presupuesto) cuando esté acreditado.
- Si tampoco existe plan legado acreditado, el cierre admite `SinPlan`; no se confunde
  «sin líneas por ausencia acreditada» con «lectura fallida» o «cobertura incompleta»
  (contrato de [SPEC27](../27-e49-cierre-financiero-specification.md)).
- **Nunca se suman ni se sustituyen en silencio**. Si coexisten ambos planes para un
  ciclo, se registran ambas presencias, la fuente aplicada y el motivo de precedencia,
  sin sumar líneas.
- La foto conserva **IDs, versión/revisión, líneas, importes, composición y criterio de
  selección al corte**, no referencias vivas que puedan reinterpretar el plan histórico.
- No hay conversión retroactiva ni backfill de ciclos históricos.
- El **precierre E4.8 sigue leyendo el plan legado** mientras no exista autorización de
  DEV para alinearlo. Antes de permitir un cierre real debe alinearse la vista previa con
  esta selección, o **señalar la discrepancia y bloquear la confirmación**; no puede
  mostrarse legado en precierre y capturarse D′ de forma inesperada en la foto.

Estas precisiones fueron **ratificadas por el usuario el 2026-11-01**. No autorizan cambio
de código; su implementación en E4.8/E4.9 requiere autorización de DEV separada.

### D4 — Auditorías de arquitectura: archivo sin merge

- #131, #132 y #134 se cierran **sin merge**. Sus ramas y commits se conservan como
  antecedente; no se borran.
- Sus conclusiones sobre reservas virtuales quedan **superadas por D1** salvo como
  evidencia del diagnóstico (doble eje de planificación, sobrecarga de `Presupuesto`,
  atribución histórica por catálogo actual).
- Sus secciones «qué existe» **no se actualizan**: al no mergearse, no se mantiene
  documentación duplicada.

## 2. Estado de dependencias (2026-11-01)

| Elemento | Estado |
| --- | --- |
| D7 / SPEC19 | Aprobada por el usuario el 2026-11-01 e integrada en `main` `e6475e6`; estado de aprobación registrado en `0e1b566`. Habilita el contrato de cantidad; **no autoriza DEV22**. |
| #152 corte D′ | Integrada en `main` `9240a52`; D2 vigente. |
| #131/#132/#134 | Cerradas sin merge; antecedente conservado. |
| E3.5/FIN_NETA | Abierto; bloquea AC-08 y, junto con DT6, E4.9. |
| DT6/T-BKP | Abierto y aparcado; bloquea el cierre real. |
| SPEC27/E4.9 | Sin DEV; requiere adaptación de SPEC27 antes de implementar y autorización separada. |
| E4.2/DEV22 | No autorizado; requiere gate de esquema, ownership y pruebas de integración. |

## 3. Qué no decide este documento

- No autoriza DEV, migración, activación, datos reales, despliegue ni merge de ningún PR.
- No modifica specs propietarias ni el tablero por sí mismo.
- No resuelve E3.5/FIN_NETA, DT6/T-BKP ni los gates de E4.9; el cierre sigue bloqueado
  hasta resolverlos ([tablero](../epic-board.md)).
- No implementa la adaptación de SPEC27 que E4.9 necesitará antes de desarrollarse.
- No autoriza E4.2/DEV22: la enmienda D7 de SPEC19 ya está aprobada e integrada, pero el
  desarrollo sigue requiriendo autorización separada.

## 4. Siguiente acción segura

Revisar y, si procede, aprobar el merge de este registro (#153). Después, decidir el inicio
de DEV22 con autorización separada y la adaptación de SPEC27 antes de implementar E4.9,
junto con E3.5/FIN_NETA y DT6/T-BKP. Nada de ello ocurre por publicar este documento.

## Referencias

- [SPEC33 — D′](../33-dprima-simplificada-specification.md)
- [SPEC27 — E4.9 cierre financiero](../27-e49-cierre-financiero-specification.md)
- [SPEC19 — E4.1, enmienda D7](../19-instrumentos-compras-inversion-specification.md)
- [SPEC22 — E4.2 Ventas](../22-ventas-posicion-broker-specification.md)
- [SPEC16 — Revisión Comida](../16-revision-comida-specification.md)
- [Tablero de epics](../epic-board.md)
- [Roadmap](../roadmap.md)
