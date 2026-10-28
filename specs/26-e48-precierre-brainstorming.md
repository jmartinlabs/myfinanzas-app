# 26 — E4.8 Precierre y controles de consistencia: Brainstorming

Status: **DRAFT — borrador documental; decisiones M1–M6 confirmadas, spec/wireframes pendientes de aprobación.**
Roadmap/context: [E4.8](roadmap.md#e48--revisión-de-precierre-y-controles-de-consistencia),
[DT5](roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[inventario DT5](investigations/dt5-write-impact-inventory.md),
[propuesta E4.8/E4.9](investigations/dt5-e48-e49-specification-proposal.md).
Base: `main` `f077b7e`, esquema 18.

## Round 1 — 2026-10-28

**Q2/M1–M6 — confirmadas por el usuario el 2026-10-28** tras revisión con Álex y
reauditoría DT5. No se reabren sin contradicción material documentada.

- [x] **Q2 A reforzada:** membresía derivada por fecha; sin `ciclo_id`. El cierre exige
  ventana financiera finita y acreditada.
- [x] **M1:** si falta el siguiente Inicio, no se inventa Fin ni fecha manual; DT3 debe
  resolverlo antes de habilitar el cierre.
- [x] **T1/T2/T3:** bloqueo financiero, revalidación auditada y descriptivo permitido;
  Q3→T1, Q9→T2, Q15→T3. La clasificación es T2 y Q3 se limita a T1.
- [x] **M3:** núcleo con Movimientos, plan final, clasificación/Referencias, E4.1
  instrumentos/Compras/efectivo/posiciones y backup; auxiliares si hay hechos.
  E4.3 valoración/patrimonio y E3.5 Comida/FIN_NETA permanecen `No disponible`.
- [x] **M4:** backup como preflight, fuera de la transacción, con evidencia DT6/T-BKP
  y restauración efectiva.
- [x] **M5:** fingerprint de cierre propio; `financeRevision` es huella técnica, no foto.
- [x] **M6:** identidad histórica preservada; nombres/etiquetas separados de IDs.

**Pendiente de aprobación:** la especificación completa y los wireframes de E4.8. No hay
preguntas funcionales abiertas en esta ronda.

## Coverage

E4.8 revisa un ciclo antes de cerrarlo: fuentes, cobertura, diferencias, bloqueos y
avisos, sin alterar S0, sin crear el cierre, sin escribir hechos y sin crear el ciclo
siguiente. No incluye valoración E4.3, Comida E3.5/FIN_NETA, Ventas E4.2 ni
conciliaciones E4.4.

## Wireframes

Pendientes. Este borrador no incluye wireframes aprobados; la UI descrita es contractual,
no una aprobación visual. Cualquier wireframe deberá revisarse y aprobarse por separado.

## Gates abiertos

- **DT3:** ventana/corte del último ciclo.
- **DT4:** contenido, metadatos, versiones y retención de la foto.
- **DT6/T-BKP:** backup recuperable y restauración efectiva.
- **E4.1:** integrada `156a50d`; conserva 6 AC PARCIAL. Posiciones disponibles;
  valoración/resultado/patrimonio E4.3 no.
- **E4.4:** SPEC17 en revisión, no aprobada; sin código.
- **E4.5/E3.6:** documental aprobadas, sin código; solo lectura.

## Append-only clarifications

- **2026-10-28:** se incorpora la reauditoría DT5 contra `f077b7e`; E4.1 pasa de
  candidato a runtime integrado. No se reabren Q1–Q16.
