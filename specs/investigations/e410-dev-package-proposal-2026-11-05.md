# E4.10 — propuesta de paquete DEV (2026-11-05)

> **PROPUESTA — NO AUTORIZADA.** Este documento separa alcance, dependencias, decisiones
> técnicas pendientes y pruebas para una futura autorización de DEV E4.10. **No autoriza
> desarrollo**, no fija DDL ni endpoints definitivos, no declara ningún AC en PASS y no
> habilita datos reales, SQL, migración, cierre real ni despliegue. La ejecución requiere
> autorización humana expresa sobre un SHA concreto.

- **Base:** `main` **`28582f9`** (2026-11-05).
- **SPEC28:** ratificada como contrato documental el 2026-11-05; D1–D9 y `SIN_CAMBIOS`.
- **Testplan:** 24 AC (`E4.10-AC01…AC24`), todos **`UNRUN`**.
- **Dependencia integrada:** E4.9 en `0176ffc` (#200), esquema **v25**.
- **Gates abiertos:** DT6/T-BKP, E3.5-AC-15 PARCIAL y decisiones P2/P3/P6/P7/P8 de SPEC29.

---

## 1. Alcance propuesto

### Dentro

- Reapertura del **último cierre** con motivo, actor, UTC, versión/estado esperado e
  idempotencia; una sola ventana activa (D1-A, D3-B+C, D7).
- Correcciones T1/T2/T3 dentro de la ventana, con impacto, motivo y auditoría (D2-B).
- Revalidación de solo lectura de S0, planes, fotos, auxiliares, agregados y precontrol (D4).
- Re-cierre con foto completa `vN+1`, comparación con `vN` y vínculo consultable (D1-A, D6).
- Cancelación auditada sin foto solo si se acredita ausencia de cambios materiales (D8).
- Consulta de todas las versiones; `vN` no vigente sin advertencia (D5-A).
- Estados vacío, carga, error, bloqueo y sesión expirada de SPEC28 §13.

### Fuera

- DT9: rectificación excepcional de ciclos antiguos y su efecto en fotos de periodo.
- Restore/backup como reapertura; recuperación extraordinaria con cierre posterior.
- Recalcular fotos, agregados o precontrol desde el estado vivo.
- Agregados E4.11 y composición trimestral/anual (SPEC29 P2/P3/P6/P7/P8).
- Roles, permisos o autenticación nuevos; cambios de temas o UI cerrada.
- Cierre real o acceso a datos reales durante DEV/QA.

---

## 2. Dependencias y gates

| Dependencia | Estado | Efecto |
| --- | --- | --- |
| E4.9 cierre y foto v1 | Integrado `0176ffc`; v25 | Reutiliza preflight, foto, auditoría e idempotencia |
| Esquema posterior a v25 | **Pendiente** de asignación | Bloquea DDL y migración; no se asume v26 |
| DT6/T-BKP | Abierto | Bloquea cierre/re-cierre real; DEV con fixtures no lo acredita |
| E3.5/FIN_NETA (AC-15 PARCIAL) | Parcial | Sin verificación suficiente no hay re-cierre ni foto |
| E4.5 precontrol | SPEC/documentación integrada; **DEV no autorizado** (59 AC `UNRUN`); DT7 abierto | Solo lectura prevista; no se transforma en foto ni hecho |
| SPEC29 P2/P3/P6/P7/P8 | Pendientes | No se aprueban ni se infieren en este paquete |
| Autenticación MFA | Vigente | Las operaciones exigen sesión completa |

---

## 3. Decisiones técnicas pendientes

Estas decisiones **no están tomadas** por SPEC28 y deben resolverse antes o dentro del DEV,
con aprobación explícita. Ninguna se presupone.

| ID | Decisión | Opciones / límite | Impacto |
| --- | --- | --- | --- |
| DT-A | Persistencia de la reapertura | Tabla de eventos append-only o tabla de estado propia; nunca un `UPDATE` de la fila de `cierres` ni materializar el estado reescribiendo el cierre | Esquema, migración, consultas |
| DT-B | Auditoría | Extender `cierre_audit` (el CHECK actual solo admite `cierre` y `cierre_fuera_de_orden`, exige migración) o crear tabla de eventos | Migración, append-only, AC18 |
| DT-C | Fingerprint de `v2` | Candidato: huella del payload y coherencia de v2; vínculo y motivo como metadatos separados. No decidido si incluye identidad de v1, motivo o revalidación | Foto, comparación, AC02/AC10 |
| DT-D | Estado observable | `Cerrado(vN)`/`Reabierto(vN)` derivado o persistido; garantías de una sola ventana | Estado, concurrencia, AC12/AC16 |
| DT-E | Superficie API | Rutas, métodos, DTO y códigos de error no son contrato estable; deben fijarse con el contrato de E4.9 | API, UI, pruebas |
| DT-F | Versión de esquema y migración | Asignación posterior a v25, migración aditiva, backup previo y rollback probado | DDL, despliegue, backup |
| DT-G | Frontera T1/T2/T3 en código | Implementar SPEC28 §8 sin ampliar ni reducir; evidencia de impacto y bloqueo fail-closed | Guardas, AC08/AC09 |
| DT-H | Detección de cambios materiales (D8) | Comparar hechos, relaciones, clasificación, plan y componentes; no basta igualdad de importes; ante duda, bloquear | AC21/AC24 |
| DT-I | Recuperación con cierre posterior | Solo recuperación extraordinaria documentada y aprobada por separado; no es una ruta ordinaria | AC16/AC21 |

---

## 4. Secuencia de implementación propuesta

Cada incremento debe ser verificable, con fixtures sintéticos y sin datos reales.

| # | Incremento | Contenido | AC principales |
| --- | --- | --- | --- |
| I1 | Esquema y auditoría | DT-A/DT-B/DT-F: migración aditiva, triggers de inmutabilidad, auditoría append-only, backup/rollback probado | AC05, AC13, AC18 |
| I2 | Reapertura | Evento, motivo/actor/UTC, versión esperada, una ventana, rechazos (no último, histórico, DT9) | AC01, AC04, AC05, AC06, AC07, AC14, AC22 |
| I3 | Correcciones y revalidación | T1/T2/T3 en ventana, impacto/auditoría, revalidación de solo lectura y bloqueo por contradicción | AC08, AC09, AC17 |
| I4 | Re-cierre `vN+1` | Foto completa, vínculo v1→v2, comparación, preflight/DT6, `SIN_CAMBIOS` | AC02, AC10, AC13, AC15, AC19, AC20, AC23, AC24 |
| I5 | Cancelación D8 | Sin cambios acreditados; con cambios, `vN+1`; con cierre posterior, bloqueo | AC16, AC21 |
| I6 | Idempotencia y concurrencia | Claves separadas, payload distinto, conflicto, dos operaciones concurrentes | AC11, AC12 |
| I7 | Contrato y UI | DTO, estados, consulta de versiones, accesibilidad y temas vigentes | AC06, AC20; SPEC28 §13 |
| I8 | Regresión y hardening | E4.9 sin regresiones, seguridad, límites de payload, sesión | Todos |

---

## 5. Pruebas y evidencia

- **Unidad/API:** Bun Test con SQLite de fixture; snapshots antes/después; errores motivados.
- **Persistencia:** versiones, `MAX(version)+1`, triggers, auditoría append-only, ausencia de
  estados parciales; migración desde v25 y rollback.
- **Idempotencia/concurrencia:** misma clave y payload; payload distinto; dos operaciones
  simultáneas; versión esperada obsoleta.
- **Seguridad:** sesión MFA, Origin/CSRF, límites de JSON, ausencia de `PATCH`/`DELETE` sobre
  fotos, rechazo de payloads manipulados.
- **UI:** estados de SPEC28 §13, consulta de versiones y advertencia de no vigencia; matriz
  de evidencia con temas y anchos vigentes, contraste AA, teclado/foco y zoom 200 %.
- **Regresión:** E4.9 (cierre, foto, T1/T2/T3, idempotencia) y precontrol E4.5 en solo lectura.
- **Datos:** exclusivamente fixtures sintéticos; el cierre real sigue bloqueado por DT6 y
  E3.5 verificable.

Los 24 AC se ejecutarán contra el candidato autorizado; este documento no adelanta PASS ni
resultados.

---

## 6. QA y gates

1. QA independiente sobre el SHA autorizado, con evidencia por AC.
2. Revisión de seguridad y de integridad histórica (inmutabilidad, auditoría, concurrencia).
3. Verificación de que no se modifican contratos de E4.9 ni datos reales.
4. Merge separado, con autorización explícita; sin auto-merge.
5. La aceptación funcional no se deduce del DEV ni de la QA.

---

## 7. Riesgos

- **Migración:** extender `cierre_audit` puede requerir reconstruir CHECK y triggers; un error
  afecta a auditoría histórica.
- **Fingerprint:** una composición ambigua puede impedir comparar `vN` y `vN+1`.
- **Concurrencia:** sin restricción única puede abrirse más de una ventana.
- **D8:** una detección laxa de cambios materiales podría cancelar una reapertura con impacto.
- **Alcance:** convertir la recuperación extraordinaria en ruta ordinaria reintroduciría DT9.
- **Datos:** usar datos reales en DEV/QA invalidaría la evidencia y la autorización.

---

## 8. Autorización futura (no concedida)

Texto candidato para una autorización separada:

> Autorizo el DEV E4.10 sobre el SHA indicado, con el alcance, dependencias y pruebas de este
> paquete, usando datos sintéticos y sin cierre real. La autorización no incluye DT9,
> recuperación extraordinaria, datos reales, migración en producción ni despliegue, y exige
> QA independiente y merge separado.

**No concedida.** Sin esa autorización no se escribe código, DDL, migración ni prueba alguna.
