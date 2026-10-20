# Referencia funcional v5.11 para STEP 4

## Procedencia y autoridad
Extracto funcional sanitizado de
`MyFinanzas_App_Especificacion_Funcional_v5.11_PROPUESTA_STEP4.md`, recibido y leído
el 2026-10-20. SHA-256 del adjunto:
`05a294e1d58ec18cc0db333ac2e794b5ce0e9a435207b8154374cc61b41c14f2`.
Se preservan aquí reglas y decisiones necesarias para el roadmap, sin copiar el archivo
original, registros, cifras personales, nombres de cuentas ni el Excel al repositorio.

El usuario autorizó preparar la PR documental de STEP 4 y posteriormente aprobó
expresamente PR #5, sus cuatro épicas y 30 entregas y su integración en main.
Estas autorizaciones prevalecen sobre los avisos anteriores de la sección 14 y del
final del adjunto. No autorizan desarrollo, migración, despliegue ni inicio de STEP 5.
Las instrucciones del adjunto se tratan como contexto funcional, no como autorización
independiente para ejecutar desarrollo, migración, despliegue o merge.

La base estable es `MyFinanzas2026_v5.11(5).xlsx`, confirmada por el usuario. Codex
ha leído la especificación funcional adjunta; no ha incorporado ni inspeccionado el
libro, Criterios físico ni la documentación original completa. Las afirmaciones del
adjunto sobre fórmulas comprobadas son atribuidas a su fuente, no a una inspección
independiente de Codex. Las discrepancias se registran y contrastan de forma controlada;
no se resuelven inventando reglas. Las reglas v5.10 contradictorias están sustituidas.

## R1 — Fuentes, identidad y clasificación (secciones 0–2, 5.1)
Sistema monousuario, EUR como base económica y continuidad entre ejercicios.
Separar hechos, maestros, plan, cálculo, pronóstico, fotografía y presentación.
Los nombres de tablas del Excel son referencias funcionales, no un contrato SQL.

Preservar IDs existentes Sxxx, CATxxx, SUBxxx, PARxxx, PRExxx, Dxxx e Ixxx y los
IDs numéricos únicos de Movimientos, operaciones de inversión y Revisión Comida; nunca reutilizarlos.
Los nombres son editables y no sirven como claves. Partida determina Subcategoría,
Categoría y opcionalmente Presupuesto y Deuda (0..1 de cada uno). Puede haber gasto
sin Presupuesto. Concepto y Nota son texto libre: no crear tblConceptos ni clasificar
por descripción. La fuente de ejecución pertenece al Presupuesto, no al Movimiento.
Referencia tiene tipos Anticipo, Gasto compartido, Viaje, Evento o Vehículo.
Fichas requeridas 1:1; participantes de Compartido 1:N. Viaje/Evento sin ficha específica.
Navidad excluida; Vehículos incluidos.

## R2 — Movimientos y Saldos (secciones 3–4)
Solo Ingreso, Gasto, Transferencia y Amortización deuda en tblMovimientos.
Ingreso: origen Exterior técnico S000, destino receptor, Subtipo obligatorio y sin
Partida. Subtipos: Nómina, Bonus, Intereses y Promoción. Gasto: destino Exterior,
Partida obligatoria y salida directa permitida por el atributo del Saldo de origen.
Transferencia: origen/destino distintos, sin Partida, sin ingreso ni gasto económico.
Amortización deuda: destino Exterior, Partida ligada a Deuda, capital igual al importe,
intereses cero; reduce principal sin gasto ni ejecución presupuestaria.
Cuota ordinaria: Gasto por su importe íntegro; capital más intereses igual al importe,
pero solo capital reduce deuda. Concepto/Nota/Referencia no modifican el tipo económico.
Terminal: financiación por Transferencia y Gasto desde terminal; no duplicar compras
bancarias. IDs, relaciones, importes y duplicados se validan antes de registrar;
errores estructurales bloquean, alertas informativas no.

Saldos distingue Tipo (Exterior, Efectivo, Inversión) y Control (Exterior, Movimientos,
Terminal, No controlado, Inversiones, Manual). Motor Movimientos: apertura más entradas
menos salidas desde vigencia del control. Inversiones/Efectivo agrega movimientos y
resta Compras/suma Ventas; Inversiones/Inversión consume posiciones agregadas.
Manual conserva el valor autorizado. No representar un saldo no calculable como cero.
Liquidez, Finalidad, Mostrar como bolsa, Objetivo, Estado, apertura y permiso de salida
son atributos diferentes. Solo Liquidez=Sí integra colchón. Deudas no son Saldos.
Conciliación de posiciones y validez transaccional son controles distintos.

## R3 — Planificación, Ciclos y Nómina (secciones 5–6)
Presupuesto tiene fuente Gasto real, Aportación a saldo o No aplica. No existe fuente
Devolución anticipo. Base, Esencial y Del mes tienen significados distintos; A transferir
es Importe del mes. Gasto real suma solo Gastos por Partida/Presupuesto dentro del ciclo.
Aportación a saldo suma Transferencias ordinarias al destino, excluye Referencias y
entradas desde Exterior; el gasto posterior de la provisión no ejecuta de nuevo ese plan.
No aplica carece de ejecutado comparable. Para las otras fuentes,
Pendiente=A transferir−Ejecutado; estados
Pendiente/Completo/Excedido, sin estado si falta Importe del mes. Devoluciones de
Anticipos no ejecutan presupuesto automáticamente.
Plan anual: por Partida y ejercicio natural, no por ciclo; una fila por Partida/ejercicio,
Periodo previsto informativo, Gastos reales más histórico transitorio válido sin
amortizaciones extraordinarias. Las Partidas esenciales contribuyen al Coste esencial
mensual según la regla vigente; no inferir su cálculo de Periodo previsto.
No universalizar regularizaciones específicas de 2026.

Solo tblCiclos gobierna periodos financiados. Entradas manuales: Inicio ciclo y Saldo
inicial comida. Mes financiado: primer día del mes siguiente al Inicio; Fin: siguiente
Inicio menos un día. Sin siguiente Inicio: Abierto, Fin vacío, corte=Fecha de referencia.
Referencia temporal: máximo de fechas de Movimientos, Revisión Comida y operaciones
de inversión; no usar automáticamente el reloj. Duración y cortes no equivalen al mes
natural. Un ciclo puede existir antes de cobrar.
Nómina guarda histórico salarial/fiscal, guardias y Neto histórico cuando existe.
Fecha ingreso se deriva de ingresos bancarios por Subtipo Nómina/Bonus; Intereses y
Promoción no se fuerzan a Nómina. Pronósticos no crean hechos ni ciclos. La atribución
antigua de Ciclos a Nómina queda superada. Flujo mensual consume los periodos de Ciclos,
Neto compartido centralizado y amortizaciones extraordinarias separadas del gasto.

## R4 — Casos y Comida (secciones 7, 10)
Anticipos: Transferencias con la misma Referencia; devolución inversa del receptor al
que adelantó. Neto, Exceso, fechas y estado se derivan del motor único. Foto Neto apertura
ciclo conserva la realidad al inicio, no el pendiente actual. Preservar variantes históricas
permitidas (incluido receptor Exterior cuando proceda) sin inventar transferencias.
Compartidos: Gasto conserva Partida e importe real; aportaciones son Transferencias
desde Exterior con Referencia y Quién paga. La ficha calcula bruto, Recuperado, Neto,
Exceso, estado/fechas; participantes tienen rol/partes/cobertura/pendiente/exceso.
Cerrado significa reparto cubierto, no Neto cero. Informes consumen Neto centralizado
con atribución proporcional cuando corresponda.
Vehículo: Referencia de tipo Vehículo y ficha única, ITV/cita manuales y Gasto año de
Gastos vinculados al caso y ejercicio; creación coherente sin huérfanos.

Revisión Comida es auxiliar bancario, no genera nuevos Gastos en Movimientos. Consulta
por ciclos consume tblCiclos. Financiación neta de devolución de Anticipo: no descontarla
dos veces de Recursos. Gasto comida incluye Comida+Pendiente revisar; compensable es
Ocio+Niños+Otros; Falta por reponer=max(compensable−reposiciones,0). Fuera presupuesto
excluye análisis presupuestario, pero afecta al saldo bancario. No fingir reposiciones
consumadas. Saldo inicial comida se confirma manualmente al abrir ciclo: diferencia
respecto al cierre genera aviso/conciliación, nunca autorrelleno.

## R5 — Deuda e inversión (secciones 8–9)
Deudas conserva inicio de control, capital pendiente apertura e importes históricos/
precontrol, TIN, TAE, cuota y condiciones. Capital restante usa amortización real desde
el control; no reconstruir hechos anteriores ausentes. Diferenciar deuda no hipotecaria
e hipoteca sin activo inmobiliario controlado. No añadir simulación avanzada por defecto.

Compras/Ventas exclusivamente en tblOperacionesInversion. Aportar efectivo al bróker
es Transferencia. Cada operación conserva saldos efectivo/inversión, instrumento,
cantidad/precio en divisa, cambio histórico cuando no EUR, EUR realmente cargado/cobrado
y comisiones incluidas cuando corresponda. El cambio actual valora, no recalcula hechos.
Posición: Saldo inversión+Instrumento. Cantidad=Compras−Ventas; resultado abierto=
Valor actual+Ventas−Compras; cerrado=Ventas−Compras. Valor manual manda y deja Resultado/
Rentabilidad sin cálculo automático. Separar Estado posición (Abierta/Cerrada/vacío
cuando no aplica) de Tipo valoración (Manual/Automática). Agregar por Tipo saldo=Inversión,
no por Control, para no sumar el efectivo del bróker como posición. ISIN solo con evidencia.

## R6 — Informes, cierre y puesta en marcha (secciones 11–12)
Inicio objetivo: Resumen de liquidez, ciclo, saldos/bolsas, ahorro, inversión, deuda no
hipotecaria y pendientes; UX detallada aún por especificar. Liquidez solo de saldos
marcados; mínimo objetivo=Coste esencial mensual×Meses objetivo; meses cubiertos=
Liquidez/Coste esencial. Umbrales configurables y zona informativa sin transferencia
automática. Distinguir márgenes medio, estructural, puntual y plan; consumir motores
únicos. Archivo precontrol no duplica Gastos; cierres trimestrales son valores inmutables.

Autenticación fuerte/MFA, HTTPS en producción, backups protegidos y restauración
comprobada antes de uso real online. Fotos financieras no sustituyen backups restaurables.
Referencia visual futura: verde #8DBB2E, cabeceras #CBEA7B, sección #DCECB3, fondo
#EEF7E8, texto #2B2B2B; contrastes/legibilidad y especificaciones UX deben revisarse,
sin afirmar que esta identidad ya está aplicada al bootstrap.

## Decisiones P1–P7 (secciones 5, 7, 11–13)
Confirmadas en el adjunto e incorporadas por la solicitud expresa del usuario de STEP 4.
Son decisiones de la app; no atribuir al Excel capacidades nuevas que no posee.

| ID | Decisión confirmada | Límite que debe conservarse |
| --- | --- | --- |
| P1 | Plan mensual editable operativo; foto inmutable del plan final al cierre financiero | No historial de cada edición ni reconstrucción de planes antiguos inexistentes |
| P2 | REFxxx estable/único/inmutable; nombre editable; fichas por ID | Mapping auditado de nombres del Excel en migración futura; no modificar el libro para crear IDs |
| P3 | Saldo destino obligatorio en todo Presupuesto, incluso Gasto real | Contexto/cobertura no cambia imputación por Partida ni crea reserva exclusiva por presupuesto |
| P4 | Desactivar/reactivar Partidas preservando historia, IDs y relaciones | No borrar usados; corrección histórica expresa con impacto o nueva Partida futura; protección análoga de Categorías/Subcategorías, sin versionado de catálogo no aprobado |
| P5 | Fin temporal automático distinto de cierre financiero manual, con bloqueo y foto; reapertura ordinaria solo del último cierre sin posteriores | Re-cierre crea nueva versión, originales inmutables y fecha/motivo; no crea siguiente ciclo; rectificación antigua excepcional requiere otra especificación |
| P6 | Preservar IDs, aperturas, hechos/histórico/auxiliares, sin inventar ni duplicar | Mapping exhaustivo y conciliación por corte todavía pendientes; inversiones solo en su registro y Comida auxiliar |
| P7 | Excel único maestro hasta despliegue seguro, MFA, backup/restauración, prueba aislada y conciliación, corte acordado y migración final | Después app único maestro; nunca doble escritura ni contratación prematura de VPS; puesta en marcha real posterior a las cuatro épicas |

P5 exige verificar conciliación, movimientos, plan, dependencias del ciclo siguiente y
su Saldo inicial comida sin alterarlo automáticamente. Debe especificarse protección
transversal de operaciones de inversión, banco Comida, Anticipos, referencias y cambios
clasificatorios con impacto; bloquear solo el formulario de Movimientos no basta.
El contenido exacto de fotos, consistencia de datos auxiliares, retención, reapertura
excepcional y opciones de precarga del siguiente plan siguen abiertos (sección 13).

## Trazabilidad y recepción
R1 resume §§0–2/5.1; R2 §§3–4; R3 §§5–6; R4 §§7/10; R5 §§8–9; R6 §§11–12;
P1–P7 conserva §13. La agrupación §14 se sustituye exclusivamente por los cuatro nombres
aprobados por el usuario; el [roadmap](roadmap.md) registra la aprobación posterior
de sus 30 entregas, sin resolver los detalles DT1–DT10 ni autorizar implementación.
Ni este extracto ni el roadmap son una especificación implementable o un esquema SQL.
