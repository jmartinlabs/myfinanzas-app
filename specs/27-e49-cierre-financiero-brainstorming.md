# 27 — E4.9 Cierre financiero y primera fotografía: Brainstorming

Status: **DRAFT — borrador documental; decisiones M1–M6 confirmadas, spec/wireframes pendientes de aprobación.**
Roadmap/context: [E4.9](roadmap.md#e49--cierre-financiero-y-primera-fotografía),
[DT5](roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[inventario DT5](investigations/dt5-write-impact-inventory.md),
[propuesta E4.8/E4.9](investigations/dt5-e48-e49-specification-proposal.md).
Base: `main` `f077b7e`, esquema 18.

## Round 1 — 2026-10-28

**Q2/M1–M6 — confirmadas por el usuario el 2026-10-28** tras revisión con Álex y
reauditoría DT5.

- [x] **Q2 A reforzada:** ventana financiera finita; sin `ciclo_id` en Movimientos.
- [x] **M1:** sin siguiente Inicio no se inventa Fin; DT3 debe resolver el último ciclo
  antes de habilitar el cierre.
- [x] **T1/T2/T3:** T1 bloquea; T2 revalida con auditoría; T3 se permite. Q3→T1,
  Q9→T2, Q15→T3.
- [x] **M3:** núcleo con Movimientos, plan final, clasificación/Referencias, E4.1
  instrumentos/Compras/efectivo/posiciones y backup; auxiliares si hay hechos.
  E4.3/E3.5 permanecen `No disponible`.
- [x] **M4:** backup preflight fuera de la transacción; evidencia DT6/T-BKP y
  restauración efectiva.
- [x] **M5:** fingerprint de cierre propio; `financeRevision` no es foto.
- [x] **M6:** identidad histórica preservada; ID + versión del nombre.

**Pendiente de aprobación:** especificación completa y wireframes. No hay preguntas
funcionales abiertas en esta ronda.

## Coverage

E4.9 cierra manualmente un ciclo con ventana finita, bloquea T1, revalida T2, permite T3
y persiste una foto inmutable. No incluye reapertura E4.10, fotos E4.11, valoración E4.3,
Ventas E4.2, conciliaciones E4.4, Comida E3.5 ni creación automática del ciclo siguiente.

## Wireframes

Pendientes. La UI de cierre/foto se describe contractualmente; no hay wireframes
aprobados ni capturas.

## Gates abiertos

- **DT3:** ventana/corte del último ciclo.
- **DT4:** contenido, metadatos, versiones y retención de la foto.
- **DT6/T-BKP:** backup recuperable y restauración efectiva.
- **E4.1:** integrada `156a50d`; posiciones disponibles, 6 AC PARCIAL.
- **E4.3/E3.5:** no implementadas; `No disponible`.
- **E4.2/E4.4:** documentales/futuros; no runtime.
- **E4.5/E3.6:** solo lectura.

## Append-only clarifications

- **2026-10-28:** E4.1 se incorpora como runtime integrado; `financeRevision` cubre
  `operaciones_inversion` pero no es foto financiera. No se reabren Q1–Q16.
- **2026-10-28 — resolución funcional:** inversión a fecha `Fin` con operaciones
  anteriores; `SinPlan` válido y `PlanNoVerificable` bloqueante; Comida opción A
  (cierre E4.9 bloqueado hasta E3.5/FIN_NETA, sin cierre parcial); ruta canónica
  `GET /api/cierres/:ciclo/estado`.
