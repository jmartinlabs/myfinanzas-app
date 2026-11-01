# Decisión — modelo de planificación y fuente de plan para E4.9

Fecha: 2026-11-01. Autor del registro: orquestador OpenCode, por decisión del usuario.
Estado: **aprobada por el usuario el 2026-11-01**. Este documento registra decisiones; no
implementa, no migra, no usa datos reales y no autoriza DEV ni merge.

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
incluyen los hechos de ese día. La corrección está en
[PR #152](https://github.com/jmartinlabs/myfinanzas-app/pull/152), pendiente de revisión y
merge; la regla no cambia de significado, solo alinea la implementación con SPEC33.

### D3 — Fuente de plan que consumirá E4.9

- Si el ciclo tiene **Plan Mensual D′**, el cierre E4.9 captura ese plan como plan final
  (líneas por raíz con Base, Esencial y Del mes).
- Si el ciclo no tiene plan D′, conserva el **plan legado del ciclo**
  (`cycle_plan_lines` por Presupuesto).
- **Nunca se suman ni se sustituyen en silencio**: la foto registra la fuente aplicada y
  su composición, y el ciclo conserva la fuente con la que se planificó.
- Sin plan, el cierre admite `SinPlan`; un plan no verificable bloquea, conforme a
  [SPEC27](../27-e49-cierre-financiero-specification.md).
- No hay conversión retroactiva ni backfill de ciclos históricos.
- El **precierre E4.8 sigue leyendo el plan legado** mientras no exista autorización de
  DEV para alinearlo; este documento no lo cambia.

### D4 — Auditorías de arquitectura: archivo sin merge

- #131, #132 y #134 se cierran **sin merge**. Sus ramas y commits se conservan como
  antecedente; no se borran.
- Sus conclusiones sobre reservas virtuales quedan **superadas por D1** salvo como
  evidencia del diagnóstico (doble eje de planificación, sobrecarga de `Presupuesto`,
  atribución histórica por catálogo actual).
- Sus secciones «qué existe» **no se actualizan**: al no mergearse, no se mantiene
  documentación duplicada.

## 2. Qué no decide este documento

- No autoriza DEV, migración, activación, datos reales, despliegue ni merge de ningún PR.
- No modifica specs propietarias ni el tablero por sí mismo.
- No resuelve E3.5/FIN_NETA, DT6/T-BKP ni los gates de E4.9; el cierre sigue bloqueado
  hasta resolverlos ([tablero](../epic-board.md)).
- No decide E4.2/DEV22, que mantiene su dependencia de la enmienda D7 de SPEC19.

## 3. Siguiente acción segura

Revisar y, si procede, aprobar el merge de la corrección de corte (#152) y de este
registro. Después, decidir la enmienda mínima de SPEC19 que desbloquea E4.2 y la
adaptación de E3.5/FIN_NETA al registro único de Comida. Nada de ello ocurre por
publicar este documento.

## Referencias

- [SPEC33 — D′](../33-dprima-simplificada-specification.md)
- [SPEC27 — E4.9 cierre financiero](../27-e49-cierre-financiero-specification.md)
- [SPEC16 — Revisión Comida](../16-revision-comida-specification.md)
- [Tablero de epics](../epic-board.md)
- [Roadmap](../roadmap.md)
