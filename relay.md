# Agent Relay
conversation: r-7n5b89ru
description: MyFinanzas D prima simplificada: contraste arquitectónico independiente
type: message
state: open
participants: Codex, Alex
sequence: 2
message_id: 4501e702-27d0-466f-9bf5-e6223a81f72b
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 1
created_at: 2026-10-30T22:49:29Z

## Message

HANDOFF → CODEX
Task ID: DPRIMA-ARQ-01 · Sesión: MyFinanzas D′ simplificada
Estado: COMPLETED (análisis de solo lectura). Valoración: VIABLE CON CAMBIOS.
Destinatario: Codex. Autorizaciones nuevas: ninguna. Cambios de proyecto, PR, Excel, código y datos: NINGUNO; este mensaje Relay es el único escrito. Pruebas: UNRUN (no se ejecutaron).

Conclusión: D′ simplificada mejora la identidad Partida/Presupuesto sin exigir tipos de Partida adicionales, pero NO implementaría todavía su recálculo con saldo real hasta fijar el perímetro de fondos y el contrato de cierre/histórico.

Contradicciones y ejemplos verificables:
1) Exclusividad del dinero, no solo del selector destino. Dos planificaciones con necesidades 600+800 € y un saldo compartido de 1.000 € no pueden descontar 1.000 € en ambas: calcularían cero pese a faltar 400 €. Recomendación mínima: cada planificación financiadora activa debe controlar un Saldo real exclusivo, coherente con la preferencia operativa del usuario; si un saldo financia varios objetivos, se necesita asignación explícita, no inventada. Para gasto real (Hipoteca, Apple, Amazon) sí se permite compartir Origen.
2) La fórmula P=max(0,T-G-S) es correcta SOLO si T (previsto), G (gasto real acumulado de hijas) y S (saldo real exclusivo y disponible) representan la MISMA planificación y corte. Caso T=1000,S=500; salida 200 y Gasto hijo 200 => S=300,G=200,P=500, coherente. Salida 200 para otro uso, G=0 => P=700. Pero si 200 pasan a Nómina y todavía no se registra el gasto, aparece temporalmente P=700; no inferir finalidad de la Transferencia ni generar falso Gasto. Recalcular en apertura de ciclo contra hechos conciliados, mostrando cobertura/incidencia cuando no lo estén.
3) Destino variable por ciclo: si se cambia TR antigua → nueva cuenta, el saldo de la segunda NO incorpora automáticamente los fondos aún existentes en la primera. Exigir traspaso real y conciliado, o fijar destino por planificación activa y permitir cambiarlo solo tras la migración bancaria efectiva. El saldo inicial confirmado no se utiliza como dinero adicional al saldo actual.
4) Líneas hijas repetidas: IBI 100 abril + 100 octubre y un Gasto real de 80 ejecutan 80 TOTAL, no 80 por línea. Agregar ejecución por ID Partida y periodo; líneas conservan su identidad de previsión y vencimientos orientativos. Sin imputación por recibo no afirmar cuál venció ni ofrecer alertas de liquidez exactas cuando falte evidencia.
5) El cierre AUTOMÁTICO de Gastos Previstos al último ciclo no equivale al cierre FINANCIERO del ciclo. SPEC27/E4.9 es cierre manual con foto, requiere ventana finita acreditada, E3.5/FIN_NETA y backup; su aprobación es documental y los AC siguen UNRUN. El plan puede finalizar en estado funcional sin inventar ni forzar el cierre financiero; fotos de ciclo solo cuando exista cierre verificable. Aclarar operaciones tardías y corte real.
6) La arquitectura cambia relaciones reales: en main, partidas.padre FK apunta a SUBCATEGORIAS, no a otra Partida; habrá que introducir relación padre-Partida separada y conservar clasificación. cycle_plan_lines tiene PK(ciclo,presupuesto), annual_plan_lines PK(ejercicio,partida) y su campo presupuesto es IMPORTE, NO FK. Nuevo Gastos Previstos necesita cabecera por padre+rango y líneas con ID propio por hija repetible; preservar Esencial, vencimientos, cobertura e importes en migración. Migrar PRE→raíz con mapping explícito, sin fusionar PAR, inventar hijos ni reescribir historia; casos No aplica, Deuda y Referencias requieren pruebas específicas.
7) Congelar al cierre importe, Fuente ejecutado, Saldo destino, relación padre-hija/IDs, clasificación relevante y resultado/corte. No reinterpretar ciclos cerrados por cambios de maestro. Reutilizar el futuro proveedor de cierres/fotos SPEC27 en vez de añadir un segundo event sourcing o versionar cada edición. El código actual executionFacts suma Gastos por Partida→Presupuesto vigente y aportaciones por Transferencia a destino, sin Partida en Transferencia; cambiar el catálogo hoy puede cambiar vistas vivas, precisamente lo que la foto debe evitar. El trigger de bloqueo anterior se elimina en cycle-plan-schema (v10); no asumir protección universal actual.

Simplificaciones: mantener una Partida sin tipos (raíz simple de Gasto, raíz de aportación Navidad/Feria, raíz con hijas Gastos anuales); Categoría/Subcategoría como clasificación, no como árbol financiero. Navidad/Feria se ejecutan por aportaciones al Saldo, sin requerir gasto hijo ni correspondencia con compras: Concepto/Referencia Evento son analíticos opcionales. Una sola estructura mínima de plan mensual raíz-ciclo; cabecera + líneas de Gastos Previstos (varias líneas por hija); Movimientos/Saldos/Deudas existentes; fotos de cierre reutilizadas. No crear reservas virtuales, atribución automática, motor temporal paralelo ni reglas por tipo nuevo.

Decisiones imprescindibles para el usuario ANTES de DEV (no inferir): (i) confirmar exclusividad efectiva del Saldo de cada planificación activa; (ii) política sencilla para cambio de Saldo destino con fondos preexistentes; (iii) cómo enumerar los ciclos futuros del rango si tblCiclos aún no los contiene, sin inventar Inicio/Fin reales. Aclarar en especificación cómo preserva Esencial y el histórico anual. No hacen falta más preguntas de UX.

Fuentes verificadas: GitHub main 454d21a8793265a44051034e926db8f139eb279c — classification-schema.ts, budget-schema.ts, cycle-plan-schema.ts, annual-plan-schema.ts, planes-ciclo.ts y SPEC27; PR #134 diagnóstico https://github.com/jmartinlabs/myfinanzas-app/pull/134 (no aprobada). Excel físico disponible en este contexto: /mnt/data/MyFinanzas2026_v5.10.xlsx, leído sin editar con artifact_tool; revisadas Criterios F1.e, F5.p, F5.q, F6 y cabeceras de Presupuestos/Presupuesto Mensual/Presupuesto Anual. Criterios F5.p aún no prevé fotos mensuales; nueva decisión es FUTURA, no regla implementada. NO está disponible aquí MyFinanzas2026_v5.11(20261030-155958).xlsx ni v5.11(7); no certifico su catálogo, cifras o equivalencia, ni la migración contra ellos.

Riesgos/bloqueos: falta confirmar saldo exclusivo, transición de destino, futuro de ciclos y base física migratoria. No se ha probado ejecución ni cierre. Próxima acción: Codex combina esta crítica con la suya, propone al usuario únicamente las 2–3 decisiones realmente materiales, y redacta SPEC para aprobación separada. Sin implementar, mergear ni tocar PR #133.
