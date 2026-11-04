# 23 — E4.3 QA final (A+B+C)

Status: **QA VISUAL Y FUNCIONAL COMPLETADA — APTO CON RESERVAS MENORES.** Integrada en
`main` `dd56553` (squash de #189). 15 AC PASS de cobertura, 2 PARCIAL; 409 con sobrescritura
explícita. La aceptación funcional final sigue pendiente de Álex; no se declara PASS de
aceptación.

## 1. Alcance y evidencia

- **A+B** integrados en `main` `3b9be46`; **C** integrado en `8552d4a`; cierre documental
  `7306494`.
- **QA-A/B/C** independientes: APTO CON RESERVAS; R1/R3 corregidos y re-QA confirmada.
- **Esta ronda** corrige R5 (contexto de sesión expirada), O3 (singular/plural del listado),
  recaptura el 390 parcial antes de mutar y añade evidencia E2E de A-01, Manual 0,00,
  resultado negativo y serie vacía.
- **Comandos:** `bun run typecheck` PASS; `bun run build` PASS (aviso preexistente de chunk);
  `tests/e2e/valoracion.spec.ts` 1/1; `tests/e2e/inversiones.spec.ts` 1/1; CI del PR y
  `python3 scripts/verify` se registran en el PR de esta rama.

## 2. QA visual

Capturas ficticias versionadas en [`23-e43-captures/`](23-e43-captures/):

| Captura | Revisión |
| --- | --- |
| `w1-list-1440.png` | Listado parcial 3/4, cerrada, inactiva, manual y efectivo separado; tabla legible y sin cortes |
| `w2-list-390.png` | Tarjetas 390 del mismo corte parcial; sin overflow horizontal |
| `w2-list-390-verificada.png` | Variante verificada 4/4 con total 1.674,50 €; no se presenta como parcial |
| `w3-detail-1440.png` | Detalle con valoración usada, serie, resultado y elegibilidad |
| `w5-alta-1440.png` | Alta Automática con previsualización exacta y aviso A-01 |
| `w9-409-1440.png` | 409 de revisión con borrador conservado y acción de actualización |
| `a01-detail-1440.png` | A-01: cantidad base 10 → corte 8; `No disponible` con motivo y sin escalar el valor |

Observaciones menores, no bloqueantes:

- El `input type="date"` muestra el formato del navegador (`06/30/2026`) junto al texto
  explícito `DD/MM/AAAA` e ISO; se mantiene por coherencia con el resto de formularios y no
  impide la lectura.
- La captura 390 verificada es una variante posterior y está separada de la parcial; no
  sustituye a W2.
- No se aprecian desbordes, pérdida de foco ni estados dependientes solo del color.

## 3. Cobertura funcional

| AC | Evidencia API/UI | Estado |
| --- | --- | --- |
| 01 | 855,00 €; redondeo único 225,00 € | PASS |
| 02 | Manual manda; Manual 0,00; cerrada prevalece D-03 | PASS |
| 03 | Cerrada 40,00 €; grupo anulado excluido | PASS |
| 04 | Estado al corte; P1 abierta a 03-31 y P3 cerrada a 06-30 | PARCIAL (reapertura explícita no E2E) |
| 05 | Resultado negativo −120,25 € | PASS |
| 06 | Rentabilidad `No disponible` sin porcentaje | PASS |
| 07 | `importe_eur` una sola vez (API) | PASS |
| 08 | Serie, rectificación, auditoría, 409 duplicado/revisión | PARCIAL (concurrencia real no ejecutada) |
| 09 | Sin look-ahead; 16/61 días | PASS |
| 10 | Parcial/Verificada, total solo completo, 0,00 cuenta | PASS |
| 11 | Efectivo S003/S007 separado; no suma | PASS |
| 12 | Sin escritura en totales/`e43`/`valoracion`/foto; snapshot de tablas | PASS |
| 13 | Inactiva/heredada incluida; solo anulado excluido | PASS |
| 14 | 2⁵³−1, exponentes, negativos, cambio 0, 422 sin escritura | PASS |
| 15 | Fecha y días visibles; sin umbral | PASS |
| 16 | Elegibilidad exacta/anterior separada de cobertura | PASS |
| 17 | A-01 cantidad modificada y nueva valoración exigida | PASS |

Resultado: **15 PASS de cobertura (API+UI), 2 PARCIAL, 0 UNRUN, 0 BLOCKED**. Los PARCIAL son huecos de evidencia, no defectos observados. `PASS` acredita la comprobación ejecutada; la aceptación funcional final de Álex sigue pendiente y no se infiere del PASS de cobertura.

## 4. Clasificación de reservas

### Bloqueantes

- **Ninguna abierta.** R1 (detalle cerrado) y R5 (contexto de sesión expirada) están
  corregidos; R3 (409 real) y O1/O2 también.

### Menores, documentadas

| Reserva | Clasificación | Justificación |
| --- | --- | --- |
| 403 CSRF y reintento idempotente solo cubiertos por API | Menor | El shell aplica Origin/CSRF a todo POST y la API ya prueba ambos; forzarlos desde UI exigiría instrumentar el navegador sin aportar cobertura financiera nueva |
| Sin Saldos de efectivo en el fixture | Menor | El API devuelve lista vacía y la UI tiene estado vacío; no hay riesgo de inventar efectivo ni de sumarlo al agregado |
| Concurrencia real de dos procesos en E4.3 | Menor | La unicidad y la revisión optimista están cubiertas por API/DDL; la prueba de dos procesos añadiría coste de infraestructura y no cambia el contrato |
| Reapertura explícita por compra posterior | Menor | El estado al corte y la cerrada están cubiertos; el caso es una variante de la misma derivación `positionsAtDate` |
| Formato nativo de fecha | Menor | El texto DD/MM/AAAA e ISO siempre está visible; coherente con el resto de formularios |
| Detalle sin Σ Compras/Σ Ventas ni operaciones | Menor (hueco de B) | El DTO de detalle no los expone; la UI enlaza a la ficha del Instrumento y no inventa sumandos |
| Aceptación visual de wireframes | Decisión del usuario | Las capturas están disponibles; QA no sustituye la aceptación formal |
| Sesión expirada en otras secciones | Menor | R5 conserva `/inversiones`; el resto del shell mantiene su comportamiento previo |

## 5. Riesgos residuales

- **PASS de cobertura ≠ PASS de aceptación final:** los 15 PASS acreditan pruebas
  ejecutadas con fixtures/CI; la aceptación funcional final sigue pendiente y no se infiere
  de ellos.
- La evidencia es de fixtures y CI, no de datos reales.
- La ventana de E4.9, la foto y la integración `e43`/`valoracion` siguen fuera de alcance.
- El detalle no muestra los hechos de Compra/Venta; se consultan en la ficha del Instrumento.
- No se ha ejecutado el perfil `full` con datos reales ni migración operativa.

## 6. QA independiente incremental

- **2026-11-04:** revisión independiente del diff de QA final: **APTO CON RESERVAS**, sin
  defecto bloqueante.
- Detectó P2: al cambiar el corte, `main.tsx` podía reautenticar con el `path` de estado
  anterior y perder la fecha consultada. Corregido en esta rama usando
  `location.pathname + location.search`; el E2E cambia a 2026-03-31 antes de la caducidad y
  comprueba el retorno a ese corte (4 filas, Parcial 1/4).
- La copia de O3 se aparta ligeramente del wireframe aprobado; queda como reserva visual
  menor sujeta a la aceptación final.
- **Conflicto 409:** la interfaz ya no actualiza la revisión en silencio. Muestra las
  diferencias, bloquea el guardado y exige elegir entre descartar el borrador y recargar la
  versión vigente o confirmar expresamente la sobrescritura con una casilla. El E2E cubre el
  descarte seguro, el bloqueo y la confirmación explícita.

## 7. Recomendación

Publicar esta rama y su PR, ejecutar CI y QA independiente final, y presentar a Álex la
revisión funcional con las capturas anteriores. El merge funcional queda pendiente de
aprobación explícita.
