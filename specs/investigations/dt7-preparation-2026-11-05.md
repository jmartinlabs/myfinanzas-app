# DT7 — Preparación con material ficticio (2026-11-05)

**Estado:** `[PROPUESTA]` documental — **NO APROBADA — NO CIERRA DT7 — SOLO FICCIÓN.**
No autoriza DEV E4.5, datos reales, Excel, importación, SQL, migración, publicación de
evidencia privada, merge ni despliegue. Los 59 AC de SPEC20 siguen `UNRUN`.

- **Base:** `main` **`b1b3072`** (2026-11-05), con C1–C8 y R1–R4 integrados en `a806fd9`.
- **Autorización:** fase preparatoria de DT7 solicitada por el usuario el 2026-11-05,
  exclusivamente con material ficticio.
- **Alcance:** contrato/dependencias, requisitos, inventario ficticio, fixtures,
  escenarios positivos/negativos, matriz de trazabilidad, decisiones pendientes, pruebas
  previstas y próximos gates.
- **Fuera de alcance:** DEV, importador, mapping real, evidencia privada, P6/P7,
  restauración, UI/API, aceptación funcional, merge y despliegue.
- **Antecedente no vinculante:** `codex/docs-dt7-e45-reconciliation`
  (`specs/investigations/dt7-reconciliation-preparation.md`, 2026-10-27, 47 AC, base
  `fc48f19`). No se copia, mueve ni se le atribuye aprobación; sus supuestos se
  revalidan contra `b1b3072` en §7.

## 0. Registro de coordinación

| Workstream | Sesión | Alcance | Resultado | Solapamiento |
| --- | --- | --- | --- | --- |
| `DT7-PREP-CONTRACT` | `ses_e54756818ffe7iiBHGCPtWHe7f` | Contrato, dependencias, requisitos y decisiones | DONE documental, solo lectura | Leyó SPEC20/testplan/roadmap y el informe antiguo |
| `DT7-PREP-FIXTURES` | `ses_e54756817ffekWh49z3hI9dhdy` | Inventario, fixtures, matriz y pruebas | DONE documental, solo lectura | Leyó SPEC20/testplan y el informe antiguo |
| Consolidación | coordinador | Un único documento, sin escrituras concurrentes | DONE | Une ambas salidas; no duplica reglas |

- Ejecución concurrente real de dos análisis independientes; **cero solapamiento de
  escritura** (ambos read-only) y salidas disjuntas (requisitos vs fixtures).
- ORCH-PROACTIVE-01 está presente en `main` desde `0cec584` y esta sesión cargó la
  versión vigente de `AGENTS.md`/`$orchestrate`; no se modificó Agentic Template.
- No se abrió Excel, base real, extracto ni fuente financiera; no se ejecutaron suites.

## 1. Contrato y dependencias

### 1.1 Qué debe entregar DT7 antes de DEV o datos reales

1. Universo cerrado por ejercicio: Partidas y fuentes esperadas, con
   `Presente`/`Ausente`/`NoAplica` y evidencia (`20-historico-precontrol-specification.md:86-88,256-259`).
2. Identidad de fuente estable por rol/alcance y procedencia sanitizada: `fuenteId`,
   huella, versión, hoja/tabla, fila/columna (`:282-286`).
3. Mapping versionado por identidad de origen a ID existente, con estado, evidencia y
   vigencia; sin crear maestros (`:226-250`).
4. Cortes y control por fuente y por Partida, con intervalos inclusivos, huecos y
   solapes; sin corte global sintético (`:260-263,276-293`).
5. Aperturas históricas de Saldo admitidas y separadas; Deuda fuera (`:112-114,157-167`).
6. Regularización 2026 concreta, aprobada o pendiente con evidencia; sin generalización
   (`:452-478`).
7. Expediente de discrepancias/excepciones con evidencia, aprobador, alcance y efecto
   (`roadmap.md:462`).
8. Criterios de verificación independiente; el importador no es el oráculo
   (`20-historico-precontrol-testplan.md:126-127`).
9. Proyección mínima a consumidores: `idArchivo`, `fuenteId`, clase, mapping,
   tri-estado `representado`, cobertura y `AnnualProvenance` (`:1101-1141`).
10. Custodia y límites: ficción en esta fase; datos reales solo con P6/P7 (`:70,1057-1080`).

### 1.2 Productor → consumidor

| Productor → consumidor | Qué aporta / consume | Qué debe aportar DT7 | Qué NO bloquea | Gate |
| --- | --- | --- | --- | --- |
| DT7 → E4.5 | Universo, `fuenteId`, mapping, cortes/control, excepciones y evidencia; E4.5 no descubre el universo | Todo lo anterior, con evidencia privada y aprobación | QA documental, C1–C8, fixtures y specs de E4.9/E4.10 | G-DT7, G-DEV, G-P6/P7 |
| E4.5 → E2.4 | `AnnualSources`/`AnnualHistory`: total, estados, cobertura, `alcanceTotal`, subtotal y procedencia | `idArchivo`, `fuenteId`, clase, mapping, tri-estado, `controles[]`, estados y `AnnualProvenance` | E2.4 ya integrado y su operación sin proveedor histórico | G-DT7 + G-E2.4 |
| E2.4 → E4.7 | Presupuesto, ejecutado, diferencia y fecha ejecutada | Cobertura y procedencia del histórico | E4.7 documental | G-DT7, E4.7/DT8 |
| E4.5 → E4.7 | Combinador, componentes, cobertura, conflictos, `sinClasificar` y procedencia | Mismo universo, corte y mapping; E4.7 no recalcula | Spec de E4.7 | G-DT7 |
| E4.9 → E4.11 | Cierre y foto v1 inmutable; E4.11 lee valores persistidos | Nada: E4.5 no crea foto/cierre | DT7; DT7 no bloquea E4.9 | G-DT6 (cierre real) |
| E4.10 → E4.11 | Reapertura del último cierre y v2 | Nada; fuera de E4.5 | DT7 | E4.9 estable + D5/P1 |
| E4.5 + E4.9 + E4.10 → E4.12 | Restore/equivalencia de IDs, aperturas, plan, hechos y fotos | `idArchivo`, `idMapeo`, `idOrigen`, hash, fuentes, intervalos, control y regularización | DEV con fixtures | G-DT6 + G-DT7 |
| DT6 → E4.9/E4.12 | Backup/restore, custodia, RPO/RTO | Custodia de evidencia DT7 separada; DT7 no define backup | E4.5 DEV con fixtures y DT7 documental | G-DT6 |
| E4.4/E1.6 → E4.5 | Deuda: apertura y precontrol; E4.5 solo contexto | No mapear `Dxxx`; mostrar «No soportado por E4.5; ver E4.4» | E4.5 | E4.4 |
| E1.1/E1.2/E1.4/E1.5 → E4.5 | Saldos, IDs, Movimientos y vínculos | Destinos existentes; no crear maestros | Ya integrados | E1/DT2 |

### 1.3 Gates

| Gate | Contenido | Estado |
| --- | --- | --- |
| **G-DT7** | Aprobación de inventario, mapping y conciliación; evidencia privada | Abierto |
| **G-DEV** | Autorización explícita de DEV E4.5 | No concedida |
| **G-P6/P7** | Autorización específica para datos reales/importación | No concedida |
| **G-E2.4** | Ampliación/adaptación de `AnnualSources`/`AnnualHistory` antes de AC-58 | Abierto (técnico) |
| **G-DT6** | Backup/restauración para cierre real, AC-09 y E4.12 real | Abierto |
| **G-MERGE** | Aprobación explícita e identificable; el push no la sustituye | No aplica |

## 2. Requisitos DT7

| ID | Regla | Fuente | Ficción | No puede inferirse |
| --- | --- | --- | --- | --- |
| **REQ-DT7-01** Universo e inventario | Universo cerrado por ejercicio con `universoPartidas` y `fuentesEsperadas[]`; sin universo no hay total | `spec:86-88,256-259,287-289`; `roadmap:462` | Sí para estructura y negativos; no para la lista real | Inventario propuesto = acreditado; E2.4/archivo/Movimientos prueban exhaustividad; «todo el catálogo» es universo; fuente ausente = cobertura |
| **REQ-DT7-02** Cobertura y cortes | Cada fuente/Partida declara corte, control, intervalos y versión; unión de días inclusivos; huecos/solapes explícitos; sin corte global sintético; corte futuro no verificable | `spec:83-85,260-293,331-361`; AC-38/46/53/56 | Sí con intervalos ficticios | Corte único global; una fuente completa otra; mes/fila/tabla acreditan cobertura; `NoDisponible` se propaga; 27/08/2026 es default |
| **REQ-DT7-03** Identidad y procedencia | `fuenteId` lógico estable; `idArchivo` único/inmutable; conservar `idOrigen` si existe, huella, hoja, fila/columna, versiones y jerarquía; nombre no es clave | `spec:107-125,282-286,482-534` | Sí; estabilidad, versionado y renombrado | `idOrigen` obligatorio; nombre/hash/fila aislados son identidad; versión nueva = fuente nueva; jerarquía vigente = jerarquía de origen |
| **REQ-DT7-04** Mapping | Versión de identidad de origen a destino existente (`PARxxx`, `REFxxx`, `Sxxx`; no `Dxxx`), con estado, evidencia, vigencia y `reemplazaA`; solo `Aprobado` suma; no crear destinos; renombrar conserva ID; reclasificar exige versión | `spec:169-250,500-528` | Sí; F6/F10/F21 y AC-03/04/31/41 | Mapping por nombre/importe/parecido; crear maestros; Referencia pendiente bloquea siempre; cambio de jerarquía = renombrado |
| **REQ-DT7-05** Deduplicación y solapes | Identidad + huella; misma identidad y huella = uno; huella distinta = conflicto; dos fuentes con mismo intervalo/Partida = ambigüedad; no deduplicar por importe/nombre/mes; `Si` excluye archivo y cuenta Movimiento una vez; `Desconocido` no certifica; precontrol no vinculado impide total; no restar/prorratear | `spec:126-140,395-433,484-493` | Sí; F2/F5/F13/F15/F16 y AC-06/12/13/14/34/36 | Importe igual = mismo hecho; elegir fuente; restar detalle del archivo; `Desconocido` = `No`; solape solo de presentación |
| **REQ-DT7-06** Aperturas | Solo aperturas históricas de Saldo (`saldoId=Sxxx`), separadas; no suman a Gastos ni cubren; no escribir en Saldos/Deudas; ausencia = `null` | `spec:112-114,157-167,263,291-293`; AC-16/17/37/43 | Sí; F7/F14/F23 | Apertura cero por defecto; apertura de Deuda a `Dxxx`; apertura cubre Gastos; modifica Saldo actual |
| **REQ-DT7-07** Regularización 2026 | Solo `Regularizacion2026`, ejercicio 2026, intervalo dentro de 2026, importe/signo explícito, Partida/Referencia, procedencia, mapping aprobado y motivo; si está representada se excluye una vez; embebida inseparable no se resta; no generalizar | `spec:452-478,940-946`; AC-20/21/22/52 | Sí; F9/F-DT7-08 | Clase por texto «regularización»; Q5=A aprueba el registro; aplica a 2025/2027; se resta de un agregado; embebida es separable sin evidencia |
| **REQ-DT7-08** Excepciones y evidencia | Discrepancia/excepción explícita, acotada y auditable: tipo, ejercicio, fuente/Partida, registros, esperado/observado, evidencia, decisión, efecto, aprobador/fecha, vigencia y consumidores; sin evidencia = `Pendiente` | `roadmap:462`; `spec:236-239,271,1062-1078` | Sí para plantillas y negativos; no para aprobaciones reales | Excepción cambia la regla; se extiende a otro ejercicio/fuente/Partida; captura o total sin ubicación es evidencia; coordinador aprueba efecto financiero |
| **REQ-DT7-09** Aislamiento y seguridad | Solo ficción; sin Excel, bases reales, datos personales, red, importador, credenciales ni despliegue; evidencia real exige P6/P7 y custodia privada; repo solo con IDs, hashes, recuentos y agregados sanitizados | `spec:70,1057-1080`; `roadmap:462`; `functional-reference:159-160` | Sí por construcción | Autorización de esta fase = P6/P7; fixture = dato real; DT7 autoriza importación; publicar evidencia privada |
| **REQ-DT7-10** Verificabilidad | Criterios de aceptación documentales, verificación independiente y PASS/FAIL/UNRUN; el total del importador no es oráculo; no hay total verificado sin cobertura completa, registros verificados/mapeados y sin conflictos; aprobar un documento no es PASS | `testplan:126-127,149-159`; `spec:92-93,313-324,401-410` | Sí para métodos y negativos; no para equivalencia real | Aprobación de SPEC20/C1–C8 = PASS; esta propuesta cierra DT7; fixture demuestra valores reales; total del importador es esperado |

## 3. Inventario ficticio 2024–2027

> Todo es ficticio. No se afirma que estos ejercicios, Partidas, fuentes, IDs o importes
> existan en el Excel. Es una **plantilla DT7**, no una conciliación ni un universo real.

### 3.1 Convenciones

- `fuenteId` lógico estable por rol/alcance; una versión nueva conserva el ID y cambia
  hash/versión (`spec:282-286`).
- `alcance`: `Global` o `PARxxx`; cada `controlDetalle` aplica solo a su alcance
  (`spec:276-281`).
- Importes DTO como string decimal exacto; `null` desconocido, `"0.00"` cero verificado
  (`spec:114,884-886`).
- `fecha=null` salvo `procedencia.evidenciaFecha`; no se usan fechas de documento,
  extracción, intervalo, corte ni reloj (`spec:114-115,149-156`).
- Aperturas de Saldo aparte; Deuda fuera (`spec:157-167`).
- Hashes `sha256:ficticio-*` son etiquetas, no huellas reales.
- Los fixtures 2026 con corte `2026-12-31` usan **reloj de prueba `2027-01-15`**;
  sin él, la consulta es 422/`NoVerificable` (`spec:357-361`). No se usa el reloj real.

### 3.2 Identidades ficticias

| ID | Nombre | Tipo | Jerarquía | Uso |
| --- | --- | --- | --- | --- |
| `PAR100` | Comida | Partida | SUB10/CAT01 | Gasto histórico principal |
| `PAR205` | Viajes | Partida | SUB20/CAT02 | Hueco y dos fuentes |
| `PAR206` | Viajes laborales | Partida | SUB20/CAT02 | Candidato ambiguo |
| `PAR300` | Formación | Partida | SUB30/CAT03 | Fuente ausente / cero |
| `PAR900` | Ajustes históricos 2026 | Partida | SUB90/CAT09 | Regularización 2026 |
| `REF100` | Viaje X | Referencia | — | Renombrado |
| `REF101` | Viaje Y | Referencia | — | Renombrado |
| `REF102` | Formación | Referencia | — | Referencia no declarada |
| `S001` | Saldo ficticio A | Saldo | — | Apertura histórica |
| `D100` | Deuda ficticia | Deuda | — | Solo contexto E4.4 |

#### Mapping ficticio

| `idMapeo` | Destino | Estado | Evidencia | Vigencia |
| --- | --- | --- | --- | --- |
| `MAP-2024-v1` | PAR100/PAR205/PAR300 | Aprobado | EV-MAP-2024 | 2024 |
| `MAP-2025-v1` | PAR100/PAR205/PAR300 | Aprobado | EV-MAP-2025 | 2025 |
| `MAP-2026-v3` | PAR100/PAR205/PAR300/PAR900 | Aprobado | EV-MAP-2026 | 2026 |
| `MAP-2026-v3` (origen «Viaje») | PAR205/PAR206 | Ambigua | EV-MAP-AMB-01 | 2026 |
| `MAP-2026-v4` | PAR200 (solo variante F-DT7-19) | Aprobado | EV-MAP-2026-04 | 2026 |

La ambigüedad es por identidad de origen, no por versión global; solo `Aprobado`
permite sumar (`spec:226-250`).

### 3.3 Resumen por ejercicio

| Ejercicio | Universo ficticio | Fuentes | Presentes | Cobertura | `estadoTotal` | Total / subtotal |
| --- | --- | --- | --- | --- | --- | --- |
| 2024 | `PAR100`, `PAR205`, `PAR300` | 1 | 1 | `Completa` | `Verificado` | `"13200.00"` |
| 2025 | `PAR100`, `PAR205`, `PAR300` | 3 | 2 | `Parcial` | `NoVerificable` | total `null`; subtotal `"13200.00"` |
| 2026 | `PAR100`, `PAR205`, `PAR206`, `PAR300`, `PAR900` | 6 (5 de Gastos/regularización + apertura) + contexto Deuda | 6 | `Parcial` | `NoVerificable` | total `null`; subtotal `"2500.00"` |
| 2027 | `PAR100`, `PAR205`, `PAR300` | 3 | 0 | `NoDisponible` | `NoDisponible` | `null` |

Agregación D14: `NoAcreditada` → `Solapada` → `Completa` → `NoDisponible` → `Parcial`;
`NoDisponible` individual no se propaga (`spec:294-324`).

### 3.4 Fuentes, intervalos y cortes

| `fuenteId` | Rol | Alcance | Intervalos | Corte | `controlDetalle` | Versión | Estado | Mapping |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SRC-2024-GAS-GLOBAL` | GastoHistorico | Global | 2024-01-01/2024-12-31 | 2024-12-31 | NoAplica | v1 | Presente | MAP-2024-v1 |
| `SRC-2025-GAS-P100` | GastoHistorico | PAR100 | 12 meses de 2025 | 2025-12-31 | NoAplica | v1 | Presente | MAP-2025-v1 |
| `SRC-2025-GAS-P205` | GastoHistorico | PAR205 | 01/01–30/06; 01/10–31/12 | 2025-12-31 | NoAplica | v1 | Presente | MAP-2025-v1 |
| `SRC-2025-GAS-P300` | GastoHistorico | PAR300 | — | — | NoAplica | — | Ausente | MAP-2025-v1 |
| `SRC-2026-GAS-P100` | GastoHistorico | PAR100 | 2026-01-01/2026-08-27 | 2026-08-27 | 2026-08-28/2026-12-31 | v1 | Presente | MAP-2026-v3 |
| `SRC-2026-GAS-P205` | GastoHistorico | PAR205 | 2026-01-01/2026-06-30 | 2026-06-30 | 2026-08-01/2026-12-31 | v1 | Presente | MAP-2026-v3 |
| `SRC-2026-GAS-P206` | GastoHistorico | PAR206 | 2026-01-01/2026-12-31 | 2026-12-31 | NoAplica | v1 | Presente | MAP-2026-v3 (ambigua) |
| `SRC-2026-GAS-P300` | GastoHistorico | PAR300 | 2026-01-01/2026-12-31 | 2026-12-31 | NoAplica | v1 | Presente | MAP-2026-v3 |
| `SRC-2026-REG-P900` | Regularizacion2026 | PAR900 | 2026-06-15/2026-06-15 | 2026-06-15 | NoAplica | v1 | Presente | MAP-2026-v3 |
| `SRC-2026-APERT-S001` | AperturaHistorica | S001 | 2026-01-01/2026-01-01 | 2026-01-01 | NoAplica | v1 | Presente | MAP-2026-v3 |
| `SRC-2026-DEUDA-D100` | DeudaContexto | D100 | 2026-08-28/2026-12-31 | 2026-08-27 | 2026-08-28/2026-12-31 | v1 | Solo contexto | — |
| `SRC-2027-GAS-P100` | GastoHistorico | PAR100 | — | — | NoAplica | — | Ausente | MAP-2027-v1 |
| `SRC-2027-GAS-P205` | GastoHistorico | PAR205 | — | — | NoAplica | — | Ausente | MAP-2027-v1 |
| `SRC-2027-GAS-P300` | GastoHistorico | PAR300 | — | — | NoAplica | — | Ausente | MAP-2027-v1 |

### 3.5 Registros ficticios clave

| `idArchivo` | Fuente | Partida | Clase | Intervalo | Importe | Representado | Verificación |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AH24001` | SRC-2024-GAS-GLOBAL | PAR100 | GastoHistorico | 2024-01-01/2024-12-31 | `"9600.00"` | No | Verificado |
| `AH24002` | SRC-2024-GAS-GLOBAL | PAR205 | GastoHistorico | 2024-01-01/2024-12-31 | `"2400.00"` | No | Verificado |
| `AH24003` | SRC-2024-GAS-GLOBAL | PAR300 | GastoHistorico | 2024-01-01/2024-12-31 | `"1200.00"` | No | Verificado |
| `AH25001–AH25012` | SRC-2025-GAS-P100 | PAR100 | GastoHistorico | 12 meses de 2025 | `"10200.00"` | No | Verificado |
| `AH25201–AH25203` | SRC-2025-GAS-P205 | PAR205 | GastoHistorico | Q1, Q2 y Q4 de 2025 | `"3000.00"` | No | Verificado |
| `AH26001` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-01-01/2026-02-28 | `"300.00"` | No | Verificado |
| `AH26002` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-03-01/2026-04-30 | `"250.00"` | No | Verificado |
| `AH26003` + `AH26003-DUP` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-05-01/2026-05-31 | `"120.00"` | No | Verificado |
| `AH26004` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-06-01/2026-06-30 | `"100.00"` | No | Verificado |
| `AH26005` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-07-01/2026-07-31 | `"130.00"` | No | Verificado |
| `AH26006` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-08-01/2026-08-09 | `"120.00"` | No | Verificado |
| `AH26008` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-08-10/2026-08-19 | `"120.00"` | No | Verificado |
| `AH26007` | SRC-2026-GAS-P100 | PAR100 | GastoHistorico | 2026-08-20/2026-08-20 | `"60.00"` | Sí → `M-2026-0140` | Verificado |
| `AH26101` | SRC-2026-GAS-P205 | PAR205 | GastoHistorico | 2026-01-01/2026-06-30 | `"800.00"` | No | Verificado |
| `AH26201` | SRC-2026-GAS-P206 | `null` | GastoHistorico | 2026-01-01/2026-12-31 | `"150.00"` | No | Verificado |
| `AH26901` | SRC-2026-REG-P900 | PAR900 | Regularizacion2026 | 2026-06-15/2026-06-15 | `"50.00"` | Desconocido | NoVerificado |
| `AH26S01` | SRC-2026-APERT-S001 | S001 | AperturaHistorica | 2026-01-01/2026-01-01 | `"500.00"` | No | Verificado |

Detalle de control ficticio: `M-2026-0123` `"100.00"` (2026-09-10), `M-2026-0124`
`"100.00"` (2026-10-15), `M-2026-0125` `"100.00"` (2026-11-20) para `PAR100`;
`M-2026-0201` `"100.00"` (2026-09-15), `M-2026-0202` `"100.00"` (2026-11-20) para
`PAR205`; precontrol `M-2026-0140` `"60.00"` (2026-08-20) vinculado a `AH26007`.

### 3.6 JSON esquemático 2026 (no ejecutable)

```json
{
  "ejercicio": 2026,
  "estadoUniverso": "Acreditado",
  "universoPartidas": ["PAR100", "PAR205", "PAR206", "PAR300", "PAR900"],
  "corteConsulta": "2026-12-31",
  "relojPrueba": "2027-01-15",
  "fuentes": [
    {"fuenteId": "SRC-2026-GAS-P100", "alcance": "PAR100", "versionFuente": "v1",
     "intervalos": [{"inicio": "2026-01-01", "fin": "2026-08-27"}],
     "corteArchivo": "2026-08-27",
     "controlDetalle": {"inicio": "2026-08-28", "fin": "2026-12-31"},
     "versionMapping": "MAP-2026-v3", "estado": "Presente"},
    {"fuenteId": "SRC-2026-GAS-P205", "alcance": "PAR205", "versionFuente": "v1",
     "intervalos": [{"inicio": "2026-01-01", "fin": "2026-06-30"}],
     "corteArchivo": "2026-06-30",
     "controlDetalle": {"inicio": "2026-08-01", "fin": "2026-12-31"},
     "versionMapping": "MAP-2026-v3", "estado": "Presente"},
    {"fuenteId": "SRC-2026-GAS-P206", "alcance": "PAR206", "estado": "Presente",
     "versionMapping": "MAP-2026-v3"},
    {"fuenteId": "SRC-2026-GAS-P300", "alcance": "PAR300", "estado": "Presente",
     "versionMapping": "MAP-2026-v3"},
    {"fuenteId": "SRC-2026-REG-P900", "alcance": "PAR900", "estado": "Presente",
     "intervalos": [{"inicio": "2026-06-15", "fin": "2026-06-15"}],
     "corteArchivo": "2026-06-15", "versionMapping": "MAP-2026-v3"},
    {"fuenteId": "SRC-2026-APERT-S001", "alcance": "S001", "estado": "Presente",
     "intervalos": [{"inicio": "2026-01-01", "fin": "2026-01-01"}],
     "versionMapping": "MAP-2026-v3"}
  ],
  "aperturas": ["AH26S01"],
  "esperado": {
    "estadoCobertura": "Parcial",
    "estadoTotal": "NoVerificable",
    "total": null,
    "subtotalConocido": "2500.00",
    "motivoCodigo": "HuecoDemostrado",
    "items": [
      {"partida": "PAR100", "archivo": "1140.00", "detalleControl": "300.00",
       "detallePrecontrolVinculado": "60.00", "total": "1500.00",
       "estadoCobertura": "Completa", "estadoTotal": "Verificado"},
      {"partida": "PAR205", "archivo": "800.00", "detalleControl": "200.00",
       "total": null, "subtotalConocido": "1000.00",
       "estadoCobertura": "Parcial", "estadoTotal": "NoVerificable",
       "huecos": ["2026-07-01/2026-07-31"]},
      {"partida": "PAR206", "total": null, "subtotalConocido": null,
       "estadoCobertura": "Completa", "estadoTotal": "NoVerificable",
       "motivoCodigo": "MappingPendiente"},
      {"partida": "PAR300", "archivo": "0.00", "total": "0.00",
       "estadoCobertura": "Completa", "estadoTotal": "Verificado",
       "motivoCodigo": "AusenciaVerificadaSinHechos"},
      {"partida": "PAR900", "archivo": "50.00", "total": null,
       "estadoCobertura": "Parcial", "estadoTotal": "NoVerificable",
       "motivoCodigo": "RegularizacionPendiente"}
    ],
    "conflictos": [],
    "sinClasificar": [
      {"idArchivo": "AH26201", "importe": "150.00",
       "motivo": "Mapping ambiguo PAR205/PAR206"}
    ],
    "agregadoNoAtribuible": []
  }
}
```

El `motivoCodigo` global es la causa principal de cobertura; los motivos por Partida
(`MappingPendiente`, `RegularizacionPendiente`) se conservan en `items[].motivoCodigo`.

## 4. Catálogo de fixtures `F-DT7-01…25`

> Todos ficticios y no ejecutados. Los resultados son DTO esquemáticos, no PASS.
> Cada fixture es autocontenido y no se acumula con el inventario ni con otros
> fixtures; las variantes se indican expresamente.

### Positivos y base

- **F-DT7-01 · Archivo + detalle contiguos.** Archivo `"1200.00"` 01/01–08/27;
  detalle `"300.00"` 08/28–12/31; corte 12/31 con reloj `2027-01-15`. Esperado:
  `Completa`/`Verificado`, total `"1500.00"`, componentes `"1200.00"`/`"300.00"`.
  Prohibido: `"2700.00"`, `"1200.00"`, doble cómputo, `Anual` con corte 08/27.
- **F-DT7-15 · Cero verificado vs ausencia.** Fuente presente 01/01–12/31 sin filas.
  Esperado: `Completa`/`Verificado`, `"0.00"`, `AusenciaVerificadaSinHechos`. Variante:
  registro explícito `"0.00"` verificado; ambos suman 0, pero solo la ausencia usa
  `AusenciaVerificadaSinHechos` y el registro cero conserva identidad y estado.
  Prohibido: `NoDisponible`, `null`, `"0.00"` sin intervalo verificado.
- **F-DT7-16 · Transición y año vacío.** 2027 sin archivo/control/hechos; Ciclo
  dic/ene. Esperado: 2027 `NoDisponible`/`NoDisponible`, sin plan/Movimiento/foto/
  apertura/cierre; 2026 consultable. Prohibido: arrastre, total plurianual, `"0.00"`.

### Cobertura, huecos y solapes

- **F-DT7-02 · Hueco de un mes.** Archivo `"900.00"` 01/01–06/30; detalle `"300.00"`
  08/01–12/31; julio sin cobertura. Esperado: `Parcial`/`NoVerificable`, total `null`,
  subtotal `"1200.00"`, hueco 07/01–07/31. Prohibido: total `"1200.00"`, `"0.00"`,
  prorrateo.
- **F-DT7-03 · Solape en frontera inclusiva.** Archivo `"1200.00"` 01/01–08/27; control
  desde 08/27; detalle `"320.00"` (20 el 27/08). Esperado: `Solapada`, total/subtotal
  `null`, conflicto `"20.00"`. Prohibido: `"1520.00"`, `"1500.00"`, elegir fuente.
- **F-DT7-09 · Agregado que excede el corte.** Agregado `"1200.00"` 01/01–08/27; corte
  06/30. Esperado: `Completa` temporal, `NoVerificable`, `AgregadoNoAtribuibleAlCorte`,
  total/subtotal `null`. Prohibido: `"1200.00"`, prorrateo, recorte.
- **F-DT7-10 · Fuente esperada ausente.** 2025 PAR300 sin fuente. Esperado: `Parcial`,
  total `null`, subtotal `"13200.00"`, PAR300 `NoDisponible`/`FuenteAusente`. Prohibido:
  `"0.00"`, `Completa`, total `"13200.00"`.
- **F-DT7-11 · Universo no acreditado.** Sin declaración DT7; importes separables.
  Esperado: `NoAcreditada`, total `null`, subtotal `"1200.00"`, `Desconocido` fuera.
  Prohibido: `Parcial`, `Completa`, total, `"0.00"`, deducir universo.
- **F-DT7-23 · Agregación D14.** PAR100 `"900.00"` completo; PAR205 sin intervalo.
  Esperado: global `Parcial`/`NoVerificable`, PAR100 `Verificado`, PAR205
  `NoDisponible`; sin propagar. Prohibido: global `NoDisponible`, `"0.00"` para B.

### Deduplicación, identidad y versiones

- **F-DT7-04 · Duplicado de identidad y huella.** Dos filas idénticas de `"120.00"`.
  Esperado: un registro lógico; 9 filas físicas / 8 lógicas; suma bruta de archivo
  `"1200.00"`, archivo elegible `"1140.00"` (excluye el representado de 60), precontrol
  vinculado `"60.00"` y total combinado de PAR100 `"1500.00"`. Prohibido: `"1320.00"`,
  dos registros, llamar `"1200.00"` al total certificado, deduplicar por importe.
- **F-DT7-14 · Versión que reemplaza.** v1 `"1200.00"`; v2 `"1150.00"` con
  `reemplazaA`; detalle `"300.00"`; variante sin el precontrol de 60. Esperado: solo v2,
  total `"1450.00"`; v1 historia. Prohibido: `"2350.00"`, elegir por fila, borrar v1,
  reescribir mapping.
- **F-DT7-19 · Renombrado, reclasificación y jerarquía.** Renombrar conserva ID;
  reclasificar exige versión; cambio de jerarquía conserva `PARxxx`. AC-45 exige además
  impacto, motivo, confirmación, revisión/huella y protecciones E1.2; sin ellos, 409.
  Esperado: procedencia original y jerarquía vigente separadas; solo vigente suma.
  Prohibido: ID nuevo por renombrar, sumar original + reclasificación, inventar versión
  de catálogo, resolver el cambio de jerarquía sin impacto/confirmación.

### Mapping, procedencia y fecha

- **F-DT7-05 · Mapping pendiente/ambiguo y Referencia.** `"150.00"` con dos candidatos;
  Referencia declarada sin destino; fuente sin Referencia con evidencia; Partida
  pendiente. Esperado: `sinClasificar` para Partida ambigua; Referencia pendiente fuera
  de `sinClasificar`, desglose `Incompleto`; `NoAplica` solo con evidencia. Prohibido:
  asignar por nombre/importe, repartir, inferir `REFxxx`.
- **F-DT7-21 · D4 y desglose.** Referencia pendiente que no cambia atribución. Esperado:
  total por Partida `"1500.00"` verificado, `referenciaId:null`, desglose `Incompleto`;
  si cambia atribución, total global y Partida `NoVerificable`. Prohibido: bloquear
  siempre, inferir `REFxxx`, meter en `sinClasificar`.
- **F-DT7-22 · Fecha económica.** Archivo sin fecha; archivo con `evidenciaFecha`; Gasto
  20/06. Esperado: `fecha:null` sin evidencia; fecha aceptada solo con evidencia;
  `fechaEjecutada` del Gasto. Prohibido: usar documento/extracción/intervalo/corte/reloj.

### Representación, precontrol y aperturas

- **F-DT7-06 · Representación `Si/No/Desconocido`.** `Si` con vínculo; `No` con
  evidencia; `Desconocido` con Gasto; `Si` sin vínculo. Esperado: archivo excluido y
  Movimiento una vez; `No` suma; `Desconocido` no certifica ni contamina subtotal;
  `Si` sin vínculo se normaliza a `Desconocido`. Prohibido: `"150.00"`, excluir sin
  vínculo, `"0.00"` en vez de `null`.
- **F-DT7-12 · Precontrol vinculado, dentro del control y no vinculado.** `"60.00"`
  antes del control vinculado a `AH26007`; Movimiento dentro del control; no vinculado.
  Esperado: vinculado cuenta una vez; dentro ya está en `detalleControl`; no vinculado
  `NoVerificable`. Prohibido: omitir, duplicar, total con no vinculado.
- **F-DT7-07 · Apertura histórica de Saldo.** Solo apertura `"500.00"` de S001; sin
  fuente de Gastos. Esperado: Gastos `NoDisponible`, apertura aparte, sin escritura.
  Prohibido: sumar a Gastos, `"0.00"` de Gastos, escribir Saldos/Deudas.
- **F-DT7-17 · Apertura de Deuda.** D100 apertura `"1000.00"` y precontrol `"2000.00"`.
  Esperado: «No soportado por E4.5; ver E4.4», `aperturas:null`, D100 intacto.
  Prohibido: sumar, mapear a `Dxxx`, modificar capital/condiciones.

### Regularización, fuentes y proyección

- **F-DT7-08 · Regularización 2026.** `"50.00"` PAR900 el 15/06; variantes sin
  evidencia, Referencia pendiente, ya representada, embebida y solo nombre. Esperado:
  solo 2026 con evidencia; sin evidencia `RegularizacionPendiente`; representada se
  excluye una vez; embebida no se resta; solo nombre no suma. Prohibido: aplicar a
  otros años, inferir por nombre, doble cómputo, restar del agregado.
- **F-DT7-13 · Dos fuentes, cortes y filtro.** SRC-A/SRC-B solapadas; control por
  Partida; filtro por fuente. Esperado: `Solapada`, total `null`; Gasto de otra Partida
  no es control; vista filtrada no consolida. Prohibido: `"800.00"`, elegir fuente,
  ocultar conflicto, crear fuente nueva por versión.
- **F-DT7-18 · Agregado + detalle sin vínculo.** Agregado `"1200.00"`, detalle
  `"300.00"` sin vínculo ni disyunción. Esperado: `NoVerificable`, total `null`; con
  evidencia, detalle `"300.00"` una vez. Prohibido: total solo-detalle, `"900.00"`,
  prorrateo.
- **F-DT7-20 · Solo Gastos, corte abierto y futuro.** Ingreso/Transferencia/
  Amortización/Gasto; corte 27/10; corte futuro. Esperado: solo Gasto `"50.00"`;
  `HastaCorte`; futuro 422. Prohibido: `"650.00"`, anual con corte abierto, 0.
- **F-DT7-24 · Proyección E2.4/E4.7 (AC-56).** Reloj `2027-01-15`. (a) Archivo
  `"900.00"` 01/01–06/30, corte 30/06: `Completa`/`Verificado`, `"900.00"`, `HastaCorte`.
  (b) Mismo archivo + detalle `"300.00"` 07/01–12/31, corte 31/12: `Completa`/
  `Verificado`, `"1200.00"`, `Anual`. (c) Variante con `controlDetalle` desde 08/01 y
  corte 31/12: julio sin cobertura, `Parcial`/`NoVerificable`, total `null`.
  `annualExecution` por Partida; `diferencia` solo si ejecutado verificable. Prohibido:
  anual con corte abierto, `"1200.00"` en (c), prorrateo, `0` por ausencia.
- **F-DT7-25 · Sin archivo y control desde 01/09 (AC-10).** Sin archivo;
  `controlDetalle` 01/09–12/31; hueco 01/01–08/31; corte 31/12. Esperado: `Parcial`/
  `NoVerificable`, total `null`, motivo de cobertura anterior, no `0`. Prohibido:
  `"0.00"`, cobertura completa, total con hueco.

## 5. Matriz de trazabilidad

> Todos los estados son `UNRUN`. La aprobación de SPEC20/testplan no es PASS
> (`20-historico-precontrol-testplan.md:5-11,126-127`). No se declara ningún PASS.

| AC | Fixtures | Requisito | Evidencia esperada | Estado |
| --- | --- | --- | --- | --- |
| AC-02 | F-DT7-04, 14 | REQ-03/05 | `idArchivo` único/inmutable; huella y procedencia | `UNRUN` |
| AC-03 | F-DT7-19 | REQ-04 | Mismo ID tras renombrar; nombre original | `UNRUN` |
| AC-04 | F-DT7-05 | REQ-04 | `Ambigua`/`Pendiente`; `sinClasificar` | `UNRUN` |
| AC-05 | F-DT7-01 | REQ-02/05 | `Completa`/`Verificado`; `"1500.00"` | `UNRUN` |
| AC-06 | F-DT7-03 | REQ-02/05 | `Solapada`; total `null`; conflicto `"20.00"` | `UNRUN` |
| AC-07 | F-DT7-02 | REQ-02 | `Parcial`; hueco; subtotal `"1200.00"` | `UNRUN` |
| AC-08 | F-DT7-01, 03 | REQ-02 | Corte inclusivo; `HastaCorte`/`Anual` | `UNRUN` |
| AC-09 | F-DT7-15 | REQ-02 | `Completa`/`Verificado`; `"0.00"` | `UNRUN` |
| AC-10 | F-DT7-02, 10, 25 | REQ-01/02 | Fuente ausente/hueco; no `0` | `UNRUN` |
| AC-11 | F-DT7-15 | REQ-02 | Cero explícito vs ausencia | `UNRUN` |
| AC-12 | F-DT7-04 | REQ-05 | Un registro lógico; una suma | `UNRUN` |
| AC-13 | F-DT7-13 | REQ-05 | Dos candidatos; no suma ni elige | `UNRUN` |
| AC-14 | F-DT7-06, 12 | REQ-05 | Archivo excluido; Movimiento una vez | `UNRUN` |
| AC-15 | F-DT7-04, 21 | REQ-03 | Huella, hoja, fila, mapping visibles | `UNRUN` |
| AC-16 | F-DT7-07 | REQ-06 | Aperturas sin mutación | `UNRUN` |
| AC-17 | F-DT7-07 | REQ-06 | No suma a Gastos; no escribe | `UNRUN` |
| AC-18 | F-DT7-16 | REQ-01/02 | 2027 `NoDisponible`; sin arrastre | `UNRUN` |
| AC-19 | F-DT7-16 | REQ-02 | Hechos dic/ene separados | `UNRUN` |
| AC-20 | F-DT7-08 | REQ-07 | Solo 2026; sin regla general | `UNRUN` |
| AC-21 | F-DT7-08 | REQ-07 | Sin evidencia no suma | `UNRUN` |
| AC-22 | F-DT7-08 | REQ-07 | Representada una vez; embebida no resta | `UNRUN` |
| AC-24 | F-DT7-16 | REQ-01/02 | Estado vacío explicativo | `UNRUN` |
| AC-31 | F-DT7-14 | REQ-04/05 | Versión usada; no reescribe | `UNRUN` |
| AC-32 | F-DT7-20 | REQ-02 | `HastaCorte`; futuro 422 | `UNRUN` |
| AC-33 | F-DT7-20 | REQ-05 | Solo Gasto `"50.00"` | `UNRUN` |
| AC-34 | F-DT7-12 | REQ-05 | Vinculado una vez; no vinculado bloquea | `UNRUN` |
| AC-35 | F-DT7-18 | REQ-05 | No resta `"300.00"`; no `"900.00"` | `UNRUN` |
| AC-36 | F-DT7-06 | REQ-05 | `Desconocido` no suma ni subtotal | `UNRUN` |
| AC-37 | F-DT7-07 | REQ-06 | Gastos `NoDisponible`; apertura aparte | `UNRUN` |
| AC-38 | F-DT7-13 | REQ-02 | Control por alcance de Partida | `UNRUN` |
| AC-39 | F-DT7-09 | REQ-02 | `AgregadoNoAtribuibleAlCorte` | `UNRUN` |
| AC-40 | F-DT7-14 | REQ-04/05 | Solo v2; bifurcación `NoVerificable` | `UNRUN` |
| AC-41 | F-DT7-19 | REQ-04 | Renombrado vs reclasificación | `UNRUN` |
| AC-42 | F-DT7-22 | REQ-03 | Fecha solo con evidencia | `UNRUN` |
| AC-43 | F-DT7-17 | REQ-06 | Deuda no se enlaza ni suma | `UNRUN` |
| AC-44 | F-DT7-18 | REQ-05 | Detalle no se prioriza sin evidencia | `UNRUN` |
| AC-45 | F-DT7-19 | REQ-03/04 | Jerarquía, impacto/confirmación, 409 | `UNRUN` |
| AC-46 | F-DT7-10, 11, 15, 23 | REQ-01/02 | `NoAcreditada`, `FuenteAusente`, cero, D14 | `UNRUN` |
| AC-47 | F-DT7-13 | REQ-02 | `Filtrada`; conflicto visible | `UNRUN` |
| AC-48 | F-DT7-21 | REQ-03/04 | Referencia pendiente sin cambio; suma | `UNRUN` |
| AC-49 | F-DT7-21, 12 | REQ-04/05 | Atribución afectada `NoVerificable` | `UNRUN` |
| AC-50 | F-DT7-06, 12 | REQ-05 | `Si/No/Desconocido`; precontrol | `UNRUN` |
| AC-51 | F-DT7-21, 19 | REQ-04 | Referencia completa; reclasificación auditada | `UNRUN` |
| AC-52 | F-DT7-08, 21 | REQ-07 | Regularización y Referencia separadas | `UNRUN` |
| AC-53 | F-DT7-23 | REQ-02 | Global `Parcial`; B `NoDisponible` | `UNRUN` |
| AC-54 | F-DT7-03, 13 | REQ-05 | `Solapada`; sin fuente ni prorrateo | `UNRUN` |
| AC-55 | F-DT7-11 | REQ-01/02 | `NoAcreditada`; subtotal separable | `UNRUN` |
| AC-56 | F-DT7-24 | REQ-02 | `"900.00"`/`"1200.00"`; julio | `UNRUN` |
| AC-57 | F-DT7-21 | REQ-04 | Total por Partida; desglose incompleto | `UNRUN` |
| AC-58 | F-DT7-24 | REQ-10 | `annualExecution`; `items[]`/`totales` | `UNRUN` |
| AC-59 | F-DT7-05 | REQ-04 | `NoAplica` con evidencia; pendiente visible | `UNRUN` |

| AC-29 | F-DT7-24 | REQ-10 | Consumidor E4.7; no recalcula | `UNRUN` |
| AC-30 | F-DT7-01 + manifiesto | REQ-03/05/06 | Restore preserva IDs/mapping; G-DT6 | `UNRUN` |

Fuera de fixtures DT7: AC-01/23 (E4.11), AC-25/26 (API/seguridad) y AC-27/28 (UI).
Requieren DEV/contratos o ensayo de interfaz; no se declaran cubiertos.

## 6. Decisiones materiales pendientes

> Ninguna está resuelta. Las opciones no son aprobaciones; el usuario decide. Las
> decisiones ya cerradas (D4, D14, Q5=A, Q7=A, Q10=A) no se reabren.

| ID | Decisión | Opciones | Impacto | Decide | Gate |
| --- | --- | --- | --- | --- | --- |
| **DT7-M1** | Ejercicios del histórico y primero incluido | Lista cerrada; solo 2026; otro rango; descubrimiento | Universo, `NoAcreditada`, transición | Usuario con evidencia privada | G-DT7 |
| **DT7-M2** | Partidas y fuentes esperadas por ejercicio | Inventario cerrado; descubrimiento; híbrido con faltantes | Cobertura, `FuenteAusente`, subtotal | Usuario | G-DT7 |
| **DT7-M3** | Identidad de fuentes sin ID | ID/clave estable; híbrido con coordenada solo para agregados; coordenada amplia; solo nombre (no admisible) | Verificabilidad, ambigüedad, mapping | Usuario sobre propuesta técnica | G-DT7 |
| **DT7-M4** | Evidencia de `NoAplica`/Referencia declarada | Campo por fuente; evidencia negativa; revisión manual; asumir (no admisible) | `estadoMapeoReferencia`, desglose | Usuario | G-DT7 |
| **DT7-M5** | Regularización 2026 concreta | Aprobar con evidencia; mantener pendiente; rechazar; dividir si es separable | Total 2026, PAR900, subtotal | Usuario | G-DT7 |
| **DT7-M6** | Checklist mínimo de evidencia de regularización | Campos de la spec; fuente independiente; no incluir sin evidencia | Verificabilidad y auditoría | Usuario | G-DT7 |
| **DT7-M7** | Evidencia de representación y precontrol | ID de Movimiento/origen; tupla + huella; conciliación manual; importe (no admisible) | Doble cómputo, exclusión, subtotal, E2.4 | Usuario sobre propuesta técnica | G-DT7 + G-E2.4 |
| **DT7-M8** | Saldos con apertura histórica | Lista cerrada; todos los que aparezcan; ninguno | Visualización de aperturas; no total | Usuario | G-DT7 |
| **DT7-M9** | Aprobador de excepciones con efecto financiero | Usuario para efecto financiero; usuario para toda excepción; umbral delegado | Gobernanza, auditoría | Usuario | G-DT7 |
| **DT7-M10** | Conciliación: 100 %/tolerancia o muestreo | 100 % y 0 céntimos; muestreo estratificado; 100 % con tolerancia; otro | Esfuerzo, aceptación, riesgo | Usuario | G-DT7 |
| **DT7-M11** | Custodia y acceso a evidencia privada | Local; externa cifrada; híbrida; accesos | Seguridad, auditoría, P6/P7 | Usuario | G-P6/P7 + G-DT7 |
| **DT7-M12** | Firma de la conciliación independiente | Revisor + usuario; solo usuario; coordinador + usuario | Aceptación, E4.12 | Usuario | G-DT7 + G-DT6 |
| **DT7-M13** | Autorización P6/P7 para datos reales | No; sí con alcance/fecha; solo muestra; más tarde | Alcance real; no afecta ficción | Usuario | G-P6/P7 |
| **DT7-M14** | Frontera E2.4: ampliar seam o adaptar E4.5 | Ampliar `AnnualSources`/`AnnualHistory`; adaptar E4.5; nueva interfaz; aplazar AC-58 | Alcance DEV y regresiones E2.4 | Usuario sobre propuesta del coordinador | G-E2.4/G-DEV |
| **DT7-M15** | Evidencia de separación/disyunción de agregado | Vínculo de origen; separación aprobada; ambas; ninguna | Desbloquea o no total solo-detalle | Usuario sobre propuesta técnica | G-DT7 |
| **DT7-M16** | Evidencia de fecha económica | Campo por fuente; evidencia documental; `null` por defecto; otra | Atribución de fecha; no importe | Usuario sobre propuesta técnica | G-DT7 + G-E2.4 |

## 7. Supuestos obsoletos del informe antiguo

| # | Supuesto (2026-10-27) | Estado en `b1b3072` |
| --- | --- | --- |
| 1 | Base `9977210`, 47 AC, PR87 draft/CI FAIL | `b1b3072`; PR87 integrada `3d70fd6`; 59 AC; C1–C8/R1–R4 en `a806fd9` |
| 2 | Referencia pendiente bloquea el total | D4: no bloquea automáticamente; solo si cambia atribución |
| 3 | D14 pendiente; precedencia antigua | D14 aprobada: `NoAcreditada` → `Solapada` → `Completa` → `NoDisponible` → `Parcial` |
| 4 | `idOrigen` obligatorio para verificar | `idOrigen` opcional; identidad + huella + procedencia trazable |
| 5 | Sin adaptador E2.4 documentado | C1/AC-58 documentados; el código sigue con `boolean`/`string` y exige DT7-M14 |
| 6 | Aprobación de SPEC20 no constaba | Aprobada 2026-10-28 e integrada |
| 7 | Trazabilidad hasta AC-47 | 59 AC; AC-30/AC-58 consumen E4.5/DT7 |
| 8 | Aceptación DT7 con 12 criterios sin C1–C8 | SPEC20 añade AC-48…59, R1–R4 y proyección E2.4 |

## 8. Pruebas previstas (no ejecutadas)

| Prueba | Fixtures | Tipo | Positivo | Negativo | Estado |
| --- | --- | --- | --- | --- | --- |
| Unión de intervalos y huecos | 01, 02, 09, 15, 23 | Bun unitario | Completa, cero, `HastaCorte` | Hueco, agregado fuera de corte, D14 | `NO EJECUTADO` |
| Frontera y solape | 03, 13 | Bun unitario | Archivo/detalle contiguos | Mismo día, dos fuentes, no elegir | `NO EJECUTADO` |
| Dedup y versiones | 04, 14 | Bun unitario | Misma identidad/huella = una | Huella distinta, v1+v2, bifurcación | `NO EJECUTADO` |
| Mapping y Referencia | 05, 19, 21 | Bun unitario/contrato | Renombrado conserva ID; D4 | Ambigüedad, `REFxxx`, `NoAplica` sin evidencia | `NO EJECUTADO` |
| Representación | 06, 12 | Bun unitario | `Si` excluye; `No` suma | `Desconocido`, `Si` sin vínculo, precontrol | `NO EJECUTADO` |
| Aperturas | 07, 17 | Bun + snapshot | Saldo separado; Deuda intacta | Apertura suma; escritura; ausencia = 0 | `NO EJECUTADO` |
| Regularización | 08 | Bun unitario | Solo 2026 con evidencia | Sin evidencia, embebida, otro año | `NO EJECUTADO` |
| Universo/fuente | 10, 11, 23 | Bun unitario | Acreditado; subtotal | Sin universo, ausente, propagación | `NO EJECUTADO` |
| Solo Gastos/corte | 20 | Bun unitario/API | Gasto `"50.00"`; abierto | Ingresos, futuro, anual abierto | `NO EJECUTADO` |
| E2.4/E4.7 | 24 | Bun contrato | `"900.00"`/`"1200.00"`; diferencia | Julio, `Desconocido`, `null` | `NO EJECUTADO` |
| API lectura | 01, 03, 10, 11, 13, 20, 23 | Bun API | 200, filtro, `no-store` | 401/422/404/405 | `NO EJECUTADO` |
| UI 390/1440 | 02, 03, 05, 07–11, 16, 20, 23 | Playwright/visual | Tabla/tarjetas, foco, teclado | Vacío/parcial/ambiguo/error | `NO EJECUTADO` |
| Restore E4.12 | 01 + manifiesto | Ensayo aislado | IDs/mapping/intervalos preservados | Total persistido como oráculo | `NO EJECUTADO`/bloqueado |
| Regresión | Todos | Bun + Python | `test`, `typecheck`, `build`, `e2e` | Fallo E1/E2/E4; verify | `NO EJECUTADO` |

Comandos previstos, no ejecutados: `bun run test`, `bun run typecheck`, `bun run build`,
`bun run test:e2e`, `python3 scripts/verify --base <SHA> --head <SHA>`.

## 9. Huecos y próximos gates

### 9.1 Qué queda sin cubrir

- Inventario real, Partidas/fuentes reales y evidencia privada (M1/M2).
- Mapping exhaustivo por campo, columnas ignoradas y normalización de huella (M3/M6).
- Cortes/controles reales y excepciones con aprobador/custodia/firma (M8–M12).
- Importador aislado, dry-run, idempotencia y rollback (M13/P6-P7).
- Restore/equivalencia E4.12 y harness de restauración (G-DT6).
- API/UI/seguridad y regresión (requieren DEV).
- Conciliación 100 %/tolerancia (M10).

### 9.2 Secuencia propuesta

1. **Usuario:** responder M1–M3 y M5–M13; confirmar si M14–M16 se delegan al
   coordinador con propuesta técnica. Sin ellas no hay inventario real ni mapping.
2. **Coordinador:** convertir las respuestas en el documento DT7 definitivo
   (inventario, mapping por campo, excepciones, criterios de aceptación), sin datos
   reales.
3. **Usuario:** aprobar o rechazar DT7 como gate documental. Aprobar DT7 no autoriza DEV.
4. **DEV E4.5:** solo con autorización explícita separada; entonces materializar fixtures,
   implementar API/UI y ejecutar las pruebas previstas.
5. **QA independiente:** sobre el candidato real; después PR y merge separados.
6. **P6/P7:** datos reales, Excel e importación solo con autorización específica; DT6
   sigue siendo gate del cierre real.

## 10. Evidencia, límites y fuentes

- **Comprobaciones:** `git rev-parse HEAD` = `b1b3072`; lectura de SPEC20/testplan,
  roadmap, referencia funcional, E2.4, readiness E4.5 y cola de decisiones; `git show`
  del antecedente no vinculante.
- **Sesiones:** `DT7-PREP-CONTRACT` `ses_e54756818ffe7iiBHGCPtWHe7f`;
  `DT7-PREP-FIXTURES` `ses_e54756817ffekWh49z3hI9dhdy`; ambas read-only y terminadas.
- **Sin datos reales:** no Excel, base, extracto, credenciales, red ni importador.
- **Sin suites:** ninguna prueba ejecutada; todos los AC siguen `UNRUN`.
- **Sin cambios de template:** Agentic Template no se modificó; solo se verificó que
  ORCH-PROACTIVE-01 está presente y se ejerció el look-ahead.
- **Sin merge:** esta propuesta no se fusiona; #204 y #205 siguen como propuestas.
- **Límite:** este documento no cierra DT7, no aprueba DEV, no autoriza datos reales y no
  sustituye la aprobación del usuario.
