# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 92
message_id: 8d7c945f-9f10-48df-aae1-7466b1f9c63e
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 91
created_at: 2026-11-03T07:27:46.575Z

## Message

# Dictamen de Álex al retorno 0091 — E3.5 #171, SPEC23 #167 y SPEC17 #170

**Conclusión:** seguir con el DEV E3.5 autorizado, **sin proponer todavía merge funcional de #171**. Cerrar las reservas de aceptación y repetir QA. Los documentos #167 y #170 pueden avanzar a presentación y revisión humana por separado; este dictamen no los aprueba ni autoriza merges.

## 1. E3.5 / PR #171 — completar evidencia antes de integrar

- **AC-13:** implementar y probar el `subtotal` en métricas `Parcial` respetando cobertura, IDs y motivo, sin inventar valor completo ni convertir ausencias en cero. Exigir prueba propia FIN-TP-13.
- **AC-14:** asertar explícitamente la aritmética normativa completa: recursos **785**, falta **15**, base **585**, otros **−5**, cierre **580**; y subcaso cierre **190**, `DIF_S0_SIGUIENTE=105`, `DIF_BANCO=−150`. FIN-TP-14 debe probar las magnitudes y distinguirlas.
- **AC-03/08/09/11/17:** añadir casos FIN-TP propios, con entrada, oráculo y asserts focales, no declarar PASS por mera evidencia indirecta de CU/P7. Completar la cobertura negativa y temporal cuando aplique.
- **AC-12:** respetar D2=O0: **S0 es obligatorio en ciclos válidos** (`NOT NULL`). No inventar un caso válido con S0 ausente ni migración innecesaria. Probar fuente no disponible/corrupta por la ruta de lectura cuando se pueda representar y el caso de **banco parcial**, verificando que no se serializa como cero y que S0 no se confunde con `B_A`. Documentar casos estructuralmente inalcanzables en vez de crear datos imposibles.
- **AC-15:** validar en E3.5 la publicación del contrato FIN-12 con fuente, huella, ventana y cobertura, y la señal verificable de bloqueo/ND que consume E4.9. **No exigir ni implementar consumo real de E4.9** dentro de este DEV: D4 es gate del propio DEV E4.9.
- **AC-18:** cerrar la revisión documental de nombres/magnitudes y trazabilidad de referencias históricas SPEC21 contra la autoridad FIN-AC-01…18, con evidencia propia. No confundir una revisión documental PASS con integración de E4.9.
- Conservar la seguridad de migración v22 y sus tests (auditoría, FK, restricciones, restauración). Mantener la comparativa completa de los **56 fallos de entorno ya presentes en main**, sin calificar el suite global como totalmente PASS. Ejecutar QA independiente + CI sobre HEAD final y presentar matriz AC/TP con PASS/PARCIAL/UNRUN motivados.

**Criterio:** no solicitar merge de #171 con reservas funcionales de E3.5 subsanables y pruebas propias pendientes. Se puede continuar en la rama autorizada y corregirlas; no se requiere otra autorización de negocio para esa corrección dentro del alcance.

## 2. SPEC23 / PR #167

Las correcciones A-01…A-03 comunicadas son razonables y cierran las objeciones documentales conocidas **en principio**:
- No escalar una valoración fechada si cambia la cantidad: ND motivado y `Parcial n/m`, con nueva valoración exigida.
- Distinguir la elegibilidad de fecha exacta en E4.3 de la aptitud de cierre, que decidirá E4.9. Una valoración anterior se muestra con fecha/antigüedad, sin declararla apta automáticamente para foto de cierre.
- Precio/cambio/cantidad positivos en Automática; `0,00` solo en valor Manual.

**Adelante con presentación de specification/testplan candidatos al usuario para ratificación.** Revisar que numeración AC↔TP y criterios de salida están sincronizados (mencionas AC-17/TP-17) y que DT2 sigue identificado antes de ejecución del esquema. **Sin aprobar spec, DT2, DDL ni DEV E4.3** por este mensaje. El merge documental se autoriza aparte.

## 3. SPEC17 / PR #170

El alcance descrito de wireframes 390 px parece cubrir las omisiones advertidas. Antes de solicitar aprobación humana, ejecutar **QA documental/visual focalizado** de la ficha y listado 390: todos los bloques funcionales, estados D001/D002/D003, términos `Sin informar`/`Sin declarar`/`No comparable`/`Varias`, histórico/cortes, anulados, acciones, errores, navegación, teclado y ausencia de overflow. Registrar evidencia y cualquier reserva restante.

Si es APTO, **presentar #170 al usuario para revisión y merge exclusivamente documental por autorización expresa**. No interpretar integración de documentos como aprobación final de los wireframes o permiso de DEV17.

## 4. Retorno esperado

Comunica por Relay: PR/HEAD/CI y resultado QA por frente; **matriz E3.5 AC/TP y reservas restantes**, cambios hechos y pruebas; resultado de consistencia AC/TP de #167; QA visual de #170. Señalar separadamente las decisiones que requieren al usuario. Sin merges funcionales, datos reales, despliegues, DEV17/DEV E4.3 ni nuevas migraciones fuera del alcance previamente aprobado.
