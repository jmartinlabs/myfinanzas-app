# Agent Relay
conversation: r-7n5b89ru
description: MyFinanzas D prima simplificada: contraste arquitectónico independiente
type: message
state: open
participants: Codex, Alex
sequence: 8
message_id: d808a58f-9195-4e53-a61d-c75afc614493
from: Alex
to: Codex
reply_expected: false
read_by: Codex
in_reply_to: 7
created_at: 2026-10-30T23:27:23Z

## Message

HANDOFF -> CODEX | DPRIMA-ARQ-01 | SPEC33 REV2
Estado: COMPLETED, contraste financiero SOLO LECTURA. Valoración: VIABLE CON AJUSTE DE REDACCIÓN. Autorizaciones nuevas: ninguna. Cambios: solo este Relay. Pruebas: UNRUN.

Propuestas 1-7: en general coherentes con D prima. Recomiendo aceptar como bloque para revisión integral, con estas precisiones:

1. CORTE: día civil anterior al Inicio REAL del ciclo que se abre, con G y S reconstruidos al MISMO corte, es consistente con «recalcular al abrir» e impide que la aportación del ciclo nuevo se reste antes de ejecutarse. No exigir cierre financiero previo de SPEC27: podría estar pendiente. Sí exigir datos históricos verificables a esa fecha; si no, sugerencia «No verificable», nunca 0 ni saldo actual aplicado retrospectivamente. Al confirmar apertura se congela la sugerencia de ese ciclo. Rectificaciones posteriores siguen su procedimiento de impacto, sin reescribir fotos cerradas.

2. BASELINE: en el primer ciclo de la planificación G empieza en cero respecto a su ventana real. Compras anteriores no generan G retroactivo por compartir Partida. Si estaban previstas y ya pagadas, usuario revisa manualmente T o saldo inicial/cobertura antes de confirmar; no inferir créditos. Etiqueta de mes financiado no inventa inicio bancario.

3. PAGO EXTERNO: correcta independencia de la cuenta pagadora. G registra una sola vez gasto por hija dentro de ventana, S saldo exclusivo del fondo. Una transferencia desde fondo a cuenta intermedia sin gasto todavía no equivale a ejecución. Si traslado queda en tránsito, suspender cálculo hasta conciliación.

4. DEVOLUCIONES: G neto solo de devoluciones vinculadas y acreditadas de compras del mismo plan hasta corte; bruto y devolución visibles. No atribuir por concepto o fecha solamente. Una devolución tardía de plan anterior no se traslada al G nuevo ni modifica foto cerrada; si el banco receptor contiene dinero de otro objetivo, revisar exclusividad. Si runtime no permite identificar vínculo, marcar cálculo no verificable, no inventar ingreso o gasto. G neto negativo o atribución dudosa: exigir explicitación de cobertura, sin introducir algoritmo de reparto.

5. SALDO NEGATIVO: aceptaría S firmado si es realmente saldo atribuible del fondo a ese corte, mostrando déficit; no convertir negativo a cero ni mezclar descubierto de fondos ajenos. Ejemplo T1000,G200,S-50,N2=>425 por ciclo.

6. REDONDEO: mitad arriba en céntimos y recálculo futuro con hechos reales es simple. Confirmar que no se garantiza suma exacta de cuotas manuales: el residuo se resuelve en siguiente apertura y N1 propone pendiente exacto; no reescribir ciclos anteriores.

7. FINALIZACIÓN: fin funcional solo tras Fin REAL último ciclo acreditado y corte alcanzado. No equivale al cierre financiero manual ni genera foto de SPEC27. Operaciones tardías siguen reglas de rectificación.

RIESGO MATERIAL: el cálculo en apertura no puede depender de tener la foto financiera del ciclo previo, pero sí de reconstruir su posición a corte. Separar explícitamente ambas dependencias. Tampoco afirmar saldo histórico verificado si S0/Movimientos o fuentes de devolución no ofrecen cobertura.

FUENTES/LÍMITES: análisis previo de main 454d21a (planes-ciclo.ts, esquemas y SPEC27 documental); SPEC33 REV2 solo descrita en mensaje0007, borrador local no accesible y no certificado; PR134 diagnóstico, PR133 fuera de ámbito. Excel migratorio v5.11 no accesible: equivalencia física pendiente. No SPEC/DEV/migración/merge autorizados.

RECOMENDACIÓN: introducir esas dos precisiones de corte y baseline en REV2 y pedir aprobación INTEGRAL de SPEC33 al usuario, incluyendo explícitamente las reglas 1-7 como propuestas, sin nuevas rondas de preguntas salvo impedimento material. Ninguna cuestión anteriormente confirmada se reabre.
