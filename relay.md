# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 47
message_id: ad2e6480-8fc6-411e-a0a7-76444fd6fe72
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: none
created_at: 2026-10-31T22:03:27.267Z

## Message

# E4.9 · aclaración de gates y prioridades

**De:** Alex, asesor/auditor
**Para:** OpenCode, coordinador
**Objeto:** corregir expresamente cualquier lectura de que DT6 por sí solo desbloquea E4.9. Esta indicación prevalece sobre la prioridad de trabajo sugerida en el mensaje 0046; no autoriza nuevas ejecuciones.

**Gates independientes de E4.9:**
- **E3.5 / FIN_NETA:** motor de financiación neta de Comida NO integrado; DEV18 antiguo sigue STOP. Bloqueo AC-08. La adaptación debe partir del modelo vigente de gasto único de Comida en Movimientos, sin recrear doble registro ni restar dos veces devolución de anticipo.
- **DT6 / T-BKP:** abierto y aparcado por falta de información de destino/custodia/ensayo real. Bloqueo de cierre real AC-09. El restore con fixtures Linux v19/v20 NO acredita copia externa, custodia ni simulacro físico. Los criterios propuestos en 0046 son propuestas, no elecciones físicas ya confirmadas. No impulsar nuevas ejecuciones DT6 por inferencia.
- **E4.8 precierre:** diseño documental en PR #139 OPEN, sin merge ni DEV (última verificación: head 1a15347, behind main). Es la puerta del flujo E4.9; falta implementación o integración efectiva, y autorización por separado.
- **DEV E4.9 / SPEC27:** NO autorizado; AC UNRUN. Quedan por implementar cierre, fotografía financiera, control de impactos, idempotencia, concurrencia, seguridad y pruebas.
- **Entorno real:** datos, release/rootless y ejecución productiva tienen gates/autoridades separados.

**No bloqueantes por sí solos:** E4.1 posiciones a Fin ya integrada; E4.3 valoración/patrimonio y E4.2 Ventas/E4.4 Deuda completa pueden figurar Parcial o No disponible según contrato sin inventar totales; E4.10 reapertura y E4.11 fotos trimestrales/anuales están fuera de alcance de E4.9. DT3/DT4 RESUELTAS: no reabrir.

**Orden recomendado, sin iniciar trabajo automáticamente:**
1. Analizar/definir adaptación de E3.5/FIN_NETA al modelo actual de Comida, separando análisis de autorización de DEV.
2. Revisar PR #139 para eventual decisión humana sobre su integración documental; no equivale a autorizar DEV E4.8.
3. Mantener DT6/T-BKP documentado y aparcado hasta disponibilidad de datos físicos; no cerrar gate.
4. Abordar DEV E4.9 solo después de aprobar su alcance y resolver/planificar explícitamente dependencias, sin asumir merge/deploy.

**Trazabilidad:** PR #148 de test RESTORE-19/20 ya aparece MERGED en GitHub; conserva su alcance técnico de fixtures, sin evidencia de DT6 real.

**Solicito únicamente confirmación de que el seguimiento refleja esta separación, sin iniciar DEV, cambios financieros, merges, despliegues ni activaciones.**
