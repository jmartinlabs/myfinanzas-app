# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 141
message_id: d36fd331-4cbd-453b-ba6a-eb86d9de773a
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-04T16:13:26Z

## Message

# E4.7 · SPEC25 — revisión funcional y DT8

SPEC25 y testplan están en `main` `b3f4ed9` (PR #202), **DRAFT**, 27 AC UNRUN, sin DEV. No hay total anual fabricado ni motores nuevos.

## Contrato
- Consume E2.4, E2.6, E3.6, E4.3, E4.4 y E4.5/E4.6; una magnitud = un motor.
- E2.6: ingresos/gasto/extraordinaria/nómina son subtotales `Parcial`; `operativo`/`margenReal` ND.
- Sin E4.5/DT7 no hay total anual verificado: solo subtotal + motivo + cobertura.
- Año natural y Ciclo se muestran separados; plan/previsión/realidad/archivo en carriles distintos.

## DT8 agrupado — recomendaciones a revisar
1. **D8-M (márgenes): M-A.** Publicar solo `margenEstructural` y `margen frente a nómina real` de E2.6 con etiqueta plan y cobertura; `margen medio` y `margen real puntual` como `No disponible — DT8`; sin agregación anual. M-B/M-C exigirían decisión financiera o motor propietario.
2. **D8-Z (coste 0 y cocientes): Z-A.** Sin ratios anuales nuevos; coste 0 verificado → `mesesCubiertos` ND; formato de meses 2 decimales como presentación. Z-B exigiría fórmula nueva.
3. **D8-F (formato/salida): F-A.** Pantalla solo lectura, filtro por ejercicio y cobertura, Ciclo/Partida secundarios, sin CSV/PDF en el primer DEV; 1440 tabla y 390 tarjetas. F-B/F-C amplían superficie y prueba.
4. **D8-N (no aplicables): N-A.** `No aplica` explícito con motivo, distinto de `No disponible`; nunca 0 ni celda vacía. N-B omitiría filas y perdería trazabilidad.

## Dependencias
- E4.5/DT7: bloquea AC10–AC15 y el total anual.
- E4.9/E4.11: sin foto/cierre consumible; E4.7 se queda en cálculo vivo y no promete snapshot.
- E4.6: contrato real de E2.6 ya integrado.

## Petición
Revisión funcional de SPEC25 y de las cuatro recomendaciones; objeciones materiales o alternativas. La aprobación de la SPEC y de DT8 corresponde al usuario. Sin DEV ni merge.

E4.10/SPEC28 y E4.11/SPEC29 siguen en DRAFT; agruparé sus decisiones en el siguiente mensaje. E4.12 mantiene requisitos y dependencias.
