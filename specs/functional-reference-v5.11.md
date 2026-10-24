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

Desde la confirmación expresa del usuario del 2026-10-22, la referencia financiera única
es `MyFinanzas2026_v5.11(7).xlsx`, **base candidata vigente, NO promovida a estable**;
sustituye a v5.11(5), anteriormente estable. La procedencia de evidencias anteriores
se conserva como histórica, sin afirmar un contraste nuevo de todos los módulos. Codex
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
menos salidas; el saldo actual no filtra Movimientos por Fecha apertura (precisión
posterior del usuario, F3, que sustituye la expresión ambigua «desde vigencia»). Inversiones/Efectivo agrega movimientos y
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
La evidencia física de Q1 E1.6 (fórmula inclusiva y operandos de v5.11(7)) se transcribe
en el apartado final de este documento; prevalece sobre la anterior indeterminación.

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


## Evidencias sanitizadas F1–F3 aportadas por el usuario — 2026-10-20
Fuente: mensaje explícito del usuario tras revisar directamente el Excel físico estable
`MyFinanzas2026_v5.11(5).xlsx`. Son evidencias de su inspección, no inspección independiente
de Codex. No se incorpora el libro, datos financieros personales ni manuales originales.
Esta precisión prevalece sobre resúmenes anteriores contradictorios o incompletos.

### F1 — Combinaciones utilizadas, no matriz exhaustiva de validez
- Exterior / Exterior.
- Efectivo / Movimientos.
- Efectivo / Terminal.
- Efectivo / No controlado.
- Efectivo / Inversiones.
- Inversión / Inversiones.
Manual está implementado en la fórmula de Saldo actual, sin registros actuales.
Conservar soporte conceptual, sin habilitar combinaciones Manual no contrastadas.
Los seis pares observados no demuestran que todos los demás sean inválidos ni una
matriz exhaustiva: no convertir la muestra en una regla financiera universal.

### F2 — Dominios y atributos independientes
| Atributo | Evidencia aportada |
| --- | --- |
| Finalidad | Vacío, Gastos planificados, Ahorro, Inversión |
| Estado | Activa, Inactiva |
| Objetivo (€) | Importe EUR opcional; sin objetivos informados en la base actual |
| Liquidez | Sí / No |
| Mostrar como bolsa | Sí / No |
| Permite salida a Exterior | Sí / No |
No exigir Objetivo, no rellenarlo con cero ni inferir un atributo desde otro.
La ausencia de objetivos no demuestra restricciones de signo o fórmulas de cobertura.

### F3 — Apertura, Saldo actual e histórico mensual
- Saldo apertura es posición inicial, no Movimiento.
- Saldo actual de Movimientos = apertura + entradas − salidas.
- Saldo actual de Inversiones/Efectivo incorpora además Compras y Ventas.
- Control Manual devuelve Valor manual directamente, o vacío si no existe.
- Terminal, No controlado y Exterior no presentan Saldo actual convencional.
- La fórmula de Saldo actual NO filtra Movimientos por Fecha apertura.
- El histórico mensual sí comprueba Fecha apertura para no mostrar valores anteriores.
- No existe fecha efectiva independiente de Valor manual.

No añadir filtro de Movimientos por Fecha apertura ni fecha Manual nueva sin
especificación y prueba de equivalencia. Este contrato se conserva aunque el motor
se entregue después de E1.1. No se interpreta la ocultación histórica como borrado,
recorte de operaciones ni autorización de importar datos reales.
Aún no están demostrados la matriz exhaustiva, obligatoriedad por control, signo de
Objetivo/Manual y el detalle del corte mensual (fecha ausente, comparación/límite exacto).
No se inventan restricciones para cubrir estas lagunas; ver trazabilidad en
[especificación E1.1](01-saldos-control-specification.md#reservas-financieras-y-trazabilidad).


## Evidencias de clasificación aportadas durante E1.2
Fuente: mensajes del usuario tras contraste de Álex y revisión física por el usuario
de Categorias, Configuración, Movimientos y Criterios de MyFinanzas2026_v5.11.
No inspección independiente por Codex ni incorporación del libro. Registro completo
y separación de decisiones app: [brainstorming 02](02-clasificacion-brainstorming.md).
- Jerarquía única por IDs: Subcategoría → Categoría; Partida → Subcategoría.
- Categoría: nombre, Grupo, Cálculo anual/mensual, Referencia obligatoria.
  Subcategoría: nombre y Categoría; Control derivado de integridad. Partida: nombre,
  Subcategoría, Presupuesto/Deuda opcionales, Estado. Estado de padres es extensión app.
- Grupo es texto sin lista cerrada; no se encontraron fórmulas consumidoras directas.
  Opcional descriptivo sin efecto económico es decisión app, no conclusión universal
  de que la muestra prueba ausencia de consumidores.
- Anual: Ingreso/Gasto/No aplica. Mensual: Ingreso/Gasto/Gasto compartido neto/No aplica.
  Métodos independientes; significados contrastados en Configuración. No se encontró
  consumo directo actual de Cálculo anual. Ningún motor se implementa en E1.2.
- Control Subcategoría valida ID/nombre informados, ID/nombre no duplicados, Categoría
  existente única y coincidencia del ID derivado. No dato maestro persistente en app.
- Referencia obligatoria admite Sí/No y técnicamente vacío: Sí exige, No/vacío no
  activan obligación. Herencia desde Categoría vía Partida para Gastos y Amortizaciones.
  Si obligatoria: Referencia registrada, Tipo válido y esperado según tblTiposReferencia.
  Anticipo restringe a Transferencia; Compartido tiene reglas propias. No inventar matriz.
- Importe base/esencial/del mes son de Presupuesto Mensual; Esencial también de plan
  anual por Partida. No trasladarlos a maestros.
Reglas de nuevos formularios y pantallas siguen como propuesta en
[especificación E1.2](02-clasificacion-specification.md), pendiente de aprobación.


### Reserva SUB resuelta durante dev 02
Usuario confirma fórmula física COUNTIF(tblSubcategorias[Subcategoría],s)<>1:
alcance global, sin distinción de mayúsculas, sin eliminación de tildes/espacios.
App conserva texto y trata * y ? literalmente, sin trasladar comodines de COUNTIF.
Detalles/casos en [especificación 02](02-clasificacion-specification.md) y testplan;
no se declara equivalencia de collation Excel para todo Unicode sin pruebas.


## Evidencia de Control ciclo y decisiones E1.3 — 2026-10-21
Fuente: usuario comunica contraste de Álex con libro estable/Criterios; no inspección
independiente de Codex. Control ciclo exige Inicio y saldo inicial comida informados,
Inicio y Ciclo financiado no duplicados, corte aplicable y Fin no anteriores a Inicio.
`COUNTIF(tblCiclos[Ciclo financiado],[@[Ciclo financiado]])>1` da
`ERROR · Ciclo duplicado`: unicidad de mes/año financiado, incluso con Inicios distintos.
Saldo inicial explícito admite cero y negativos; no prohibición de signo demostrada.
Q1 confirma actual por intervalo de referencia, ausencia sin referencia, abierto
anticipado distinto de actual y sin corte aplicable si referencia anterior a Inicio.
Fin derivado se mantiene sin hechos. Alta solo posterior es contrato app confirmado,
no fórmula adicional atribuida al libro; inserciones/rectificaciones quedan en E2.1.
Registro y aceptación trazados en [spec 03](03-ciclos-financiados-specification.md).


## E1.6 Q1 — evidencia física aportada y referencia autorizada — 2026-10-22
Fuente: transcripción sanitizada aportada por el usuario tras inspección de
MyFinanzas2026_v5.11(7).xlsx, Deudas/tblDeudas y Criterios. Confirmación posterior
expresa: (7) sustituye a (5) como referencia única/base candidata, no automáticamente
estable. Codex NO ha incorporado ni inspeccionado el Excel ni modificado sus archivos.

### Fórmula física — Deudas!J20:J21, tblDeudas[Capital pendiente actual (€)]
```excel
=IF(tblDeudas[[#This Row],[ID deuda]]="","",tblDeudas[[#This Row],[Capital pendiente apertura (€)]]-SUMIFS(tblMovimientos[Capital amortizado (€)],tblMovimientos[ID deuda],tblDeudas[[#This Row],[ID deuda]],tblMovimientos[Fecha],">="&tblDeudas[[#This Row],[Fecha inicio control]]))
```
Misma lógica reportada en Deudas!B15 para la deuda seleccionada. Por ID deuda Dxxx,
Capital pendiente apertura menos Capital amortizado de Movimientos cuya Fecha sea
mayor o igual a Fecha inicio control: propio día incluido, anteriores excluidos.
No usa Fecha inicio de la deuda como frontera, ni filtro adicional por Tipo o Control.
Con ID vacío devuelve vacío. La fórmula no demuestra por sí sola obligatoriedad/signo
de apertura ni autoriza persistir una ausencia como cero.

### Criterios aportados (IDs anonimizados)
- C30, Modelo de deuda: tblDeudas usa Dxxx; para deudas sujetas al corte histórico
  de 2026, corte 27/08/2026 y control de Movimientos desde 28/08/2026. Históricos y
  precontrol preservan capital, intereses y cuotas anteriores sin inventar movimientos;
  capital actual descuenta capital registrado desde Inicio control. Es un corte de
  esas deudas, NO una fecha fija ni un default global que deba codificarse en la app.
- C88, Deudas: no son Saldos; maestro Dxxx consolida capital, intereses, cuotas,
  histórico de apertura y estado actual; pagos desde saldo bancario real a Exterior.
- C109, Movimientos de deuda: cuota ordinaria Gasto con Partida asociada, importe
  íntegro como gasto; extraordinaria Amortización deuda y misma Partida, sin Gasto
  ni ejecución presupuestaria; ID deuda deriva de Partida; capital+intereses=importe.

### Apertura e históricos — roles demostrados
| Campo físico | Papel |
| --- | --- |
| Fecha inicio control | Frontera inclusiva sobre Fecha de Movimientos |
| Capital pendiente apertura (€) | Base monetaria del capital actual |
| Capital amortizado (€) de Movimientos | Reducción aplicable desde la frontera por mismo ID |
| Capital inicial (€) | Dato histórico distinto de apertura |
| Capital amortizado histórico (€) | Capital inicial menos capital pendiente apertura |
| Amortización extra histórica (€) | Desglose histórico |
| Capital histórico en cuotas (€) | Capital histórico menos extraordinaria histórica |
| Intereses históricos (€) | Histórico de intereses |
| Total pagado histórico (€) | Agregado histórico de capital e intereses |
| Cuotas/capital/amortización precontrol del año | Información histórica diferenciada |
Los históricos/precontrol NO son operandos adicionales del capital actual. Apertura
es la posición en la frontera: no descontar otra vez lo anterior ni crear hechos para
reconstruirlo. Fecha inicio deuda y campos históricos no son entradas necesarias del
motor mínimo E1.6; la conservación/conciliación amplia sigue prevista para E4.4.

### Traducción controlada a la app
Q1 cerrada por evidencia y autorización del usuario; no implica aprobación de spec06.
Aplicar fórmula al registro canónico de hechos vigentes: la exclusión de anulados es
contrato app ya aprobado de E1.4, NO un filtro que se atribuya al SUMIFS físico.
No añadir filtro por Tipo/Control en este agregado. Los validadores de escritura de
cada Tipo siguen protegiendo qué desgloses son admisibles: ausencia de filtro en el
motor NO autoriza payloads inválidos. Aperturas ausentes no se inventan ni convierten
en cero; mostrar capital no calculable cuando falten entradas necesarias de control.


## E2.4 — precisión del plan anual y esenciales, 2026-10-24

Fuente: decisiones Q1–Q3 de Álex transmitidas expresamente por el usuario, tras su
contraste de v5.11(7)/Criterios; no inspección independiente por Codex. Detalle y
pendientes posteriores en [brainstorming10](10-plan-anual-brainstorming.md).
Esta precisión concreta R3 y la contribución anual a R6 sin cambiar sus fórmulas.

Una línea por ID de Partida/ejercicio natural. Único importe manual Presupuesto (€),
editable, vacío o cero explícito distintos y sin negativos. No copiar/calcular desde
otro ejercicio o Ejecutado automáticamente, ni reconstruir cada mes. No importe
esencial anual independiente. Ejecutado, Diferencia y Fecha ejecutada derivados;
su semántica de signo/fecha múltiple se concreta en spec10 antes de aprobarla.
Periodo previsto es texto flexible opcional/editable (uno o varios meses/periodos),
sin lista cerrada, varias filas ni motor de periodicidad; no gobierna la ejecución.
Transitorios2026 son histórico/migración, no nuevos campos del plan.

Esencial manual por línea: Sí/No/Pendiente. Solo Sí contribuye; Pendiente no se
convierte en No. Equivalente esencial mensual anual = suma de Presupuesto anual
con Esencial=Sí dividida por12, sin redondear contribuciones antes de sumar.
Evidencia física atribuida: `=SUMIFS(tblAnual2026[Presupuesto (€)],tblAnual2026[Esencial],"Sí")/12`.
Si un importe esencial está vacío sigue no informado, no decisión de0€.
El equivalente anual alimenta el Importe esencial del Presupuesto Mensual de Gastos
anuales; Coste esencial mensual global suma importes esenciales mensuales. No sumar
el equivalente anual otra vez. En la app se preserva el contrato manual de spec09;
el enlace/consumo no autoriza sobrescritura automática ni conexión por nombre.
R6 consume coste global, no este equivalente aislado. Liquidez/objetivos no se
implementan en E2.4; cobertura, nulos y cero deben propagarse sin inventar resultados.
Autorización solo documental, sin SQL, cambios del Excel, desarrollo ni merge.


### E2.4 — precisión Q4–Q6, 2026-10-24

Fuente: «Spec10 — Resolución Q4–Q6 por Álex», transmitida por el usuario tras su
contraste de tblAnual2026/Criterios T5.n. Resuelve la semántica de derivados pendiente
arriba; no es aprobación completa de spec10 ni inspección física independiente.
Diferencia=ROUND(Presupuesto−Ejecutado,2). Presupuesto vacío implica Diferencia vacía;
Ejecutado0 verificado da Diferencia=Presupuesto. Cobertura no verificable impide
presentarla como definitiva. Fecha ejecutada=máxima fecha conocida entre Fecha histórica
y Gastos elegibles de la Partida en el ejercicio natural/periodo de control. Histórico
válido conservado sin duplicarlo con Movimientos. Sin fecha conocida queda vacía,
no inferida del importe. Amortización extraordinaria no es Gasto ejecutado.

Con Esencial=Sí e importe sin informar, equivalente total Incompleto; subtotal
conocido Parcial y contador de importes faltantes. No usarlo silenciosamente como
objetivo definitivo de liquidez. Clasificación Pendiente se avisa por separado,
sin incluirla ni convertirla a No. La fórmula suma de anuales esenciales/12 no cambia.
Conservar líneas históricas inactivas y prohibir nuevas líneas para inactivas.
Editar planes pasados requiere ausencia de protección financiera aplicable, impacto,
motivo y confirmación. Revalidar también ciclos cerrados/fotografías dentro del año,
aunque no exista cierre anual. Preservar identidades, relaciones y fotos inmutables;
no reescribir Gastos ni crear históricos inexistentes. Solo autorización documental.


Aprobación documental posterior, 2026-10-24: el usuario responde «Aprobadas» a la
solicitud única de aprobar spec10 rev2 completa y sus wireframes. Se confirma el
contrato documental descrito; no autoriza desarrollo, SQL, migración, Excel ni merge.
Trazabilidad/candidato en [brainstorming10](10-plan-anual-brainstorming.md).


## E2.5 — precisión de Nómina Q1–Q3, 2026-10-24

Fuente: «E2.5 — Nómina: decisiones funcionales Q1–Q3», usuario tras contraste de Álex
sobre hoja Nómina, tblNominaIRPF, tblNominaForecast, tblCalculosFlujoMensual/Criterios
v5.11(7). No inspección independiente de Codex. [Registro11](11-nomina-prevision-brainstorming.md).
Paga documentada por Mes nómina/Tipo Ordinaria o Bonus, sin unicidad que impida dos
pagas realmente distintas del mismo mes/tipo. Originales/procedencia: Mes, Tipo,
Guardia, Devengo, Base IRPF, IRPF%, Variable, Neto histórico y Nota. Retención IRPF
=Base IRPF×IRPF% si ambos informados. Guardia atributo de Ordinaria, salvo evidencia
de paga diferenciada. Neto estructural según regla vigente de Ordinaria; Bonus vacío.
Fecha ingreso, Neto, Neto estructural y Origen neto derivados; no sustituir originales.

Movimientos es la verdad bancaria: Ingreso Nómina/Bonus, cada abono con ID/Fecha/
Importe/Destino reales. Parciales separados, paga origen aunque se cobre en otro mes;
ciclo por fecha bancaria/Ciclos. Separar histórico, documentado y cobrado, sin doble
entrada. MINIFS/SUMIFS por mes/Subtipo y XLOOKUP Ordinaria del Excel no resuelven
inequívocamente esos vínculos; la app propondrá relación mínima explícita por IDs,
sin otro maestro ni asociaciones por proximidad. Sin evidencia: pendiente de asociación,
Movimiento intacto. Cardinalidad/estructura pendientes de aprobación posterior.

Previsión manual: Variable prevista (€), Ajuste IRPF esperado (pp). Referencias:
último Devengo ordinario con datos fiscales suficientes, última Base IRPF ordinaria
válida, Deducciones no IRPF y último IRPF ordinario válido. IRPF estimado=Último IRPF
+Ajuste; Retención estimada=(Base referencia+Variable prevista)×IRPF estimado;
Neto estimado=(Devengo referencia+Variable prevista)−Deducciones no IRPF−Retención estimada.
Conservar escenario prudente como simulación configurable, no reglas fijas universales.
No produce cobros/Movimientos, cambia presupuesto o ciclos, sobrescribe histórico/real
ni convierte registros futuros/incompletos en hechos. Precisiones de fórmulas derivadas,
selección de referencias y redondeos aún pendientes en spec11. Solo autorización documental.


### E2.5 — resolución Q4–Q6: físico, límites y propuesta app, 2026-10-24

Fuente: resolución de Álex transmitida por el usuario; no inspección física por Codex.
**Comprobado Excel:** Retención=Base IRPF×IRPF; Deducciones no IRPF=Devengo−Retención−Neto.
Neto estructural Bonus vacío; Ordinaria sin Guardia=Sí:Neto; con Guardia=Sí:
(Devengo−Variable)−(Base IRPF−Variable)×IRPF−(Devengo−Retención−Neto).
Neto:histórico informado, luego Ingresos mes/Subtipo, sin valores vacío; origen
Histórico/Movimientos/vacío. Fecha ingreso MINIFS mes/Subtipo. LOOKUP toma última fila
física Ordinaria con Base>0/IRPF>0/Retención>0, después agrega por mes con SUMIFS.
Sin ROUND explícitos ni límites numéricos en Variable prevista/Ajuste del Excel.

**Limitaciones:** esas selecciones no prueban relación inequívoca de cada paga/cobro;
C176 describe una paga por Ingreso. No reconstruir historia con reglas nuevas.
**Ampliación app conceptual Q4:** N:M por IDs/importe asignado, suma por Movimiento
≤importe real, remanente/diferencias visibles y evidencia entre meses/tipos mixtos.
Un Movimiento real, sin división/duplicación, contado una vez por Fecha/Ciclo; diseño
técnico sujeto a aprobación de spec11 completa, sin alterar Excel.

Referencias propuestas por mes salarial más reciente de Ordinarias documentadas
completas, excluyendo futuras/incompletas; empate por ID/evidencia, no suma ni inserción.
Sin referencia verificable, no disponible/incompleto. Cobros:primera/última fecha,
total/número/diferencia y fecha completa solo si conciliación demostrable.
Forecast:Variable prevista€ y Ajuste pp inicialmente0. Fórmulas Q3 intactas.
Prudente usa Último IRPF+0,0027 (=+0,27pp), manteniendo demás referencias/Variable;
Neto prudente=(Devengo ref+Variable prevista)−Deducciones ref−(Base ref+Variable prevista)
×(Último IRPF+0,0027); Diferencia prudente=Neto prudente−Neto estimado. Simulación,
no ingreso realizado ni banda del ajuste manual.

App propuesta:decimal preciso, monetarios visibles2decimales sin redondeos tempranos,
equivalencia económica a verificar; finitos, IRPF estimado0–100%, Variable no negativa
por defecto sin máximo financiero arbitrario, ajustes salariales negativos aparte;
Ajuste pp± mientras tasa válida, sin banda arbitraria. Faltantes no se completan con0.
Nuevos vínculos, fallback de Neto y desempates se identifican en spec11 como propuestas
pendientes de aprobación técnica completa, no equivalencia estructural con C176.
Solo elaboración documental:sin código, SQL, Excel, migración o merge.


### E2.5 — Neto documentado y conciliación, decisión posterior, 2026-10-24

Fuente: «E2.5 — Decisión sobre Neto documentado y conciliación», usuario. Acepta
Neto documentado€ opcional por paga, captura manual con evidencia salarial identificable,
procedencia y auditoría de altas/correcciones. Histórico independiente/intacto; vacío≠0;
nunca autocompletar desde Movimientos/cobrado ni crear segunda verdad bancaria.
Cobrado solo desde hechos reales asociados; referencia documental válida=Documentado
o Histórico original cuando corresponda. Si ambos informados discrepan, mostrarlo,
sin elegir silenciosamente. Diferencia=referencia válida−cobrado real asociado.
Fecha completa solo desde abonos asociados suficientes y conciliación demostrable;
sin referencia válida, Diferencia/Fecha completa no disponibles aunque haya Ingresos.
Coincidencia monetaria no prueba vínculo documental; N:M no duplica ingreso económico.
Antes de implementar comprobar campo con idéntica semántica y evitar duplicidad.
Histórico salarial, documentación, banco y pronóstico independientes. Solo elaboración
documental; no código/SQL/Excel/merge. Resolución M1 en brainstorming11, sin reabrirla.


Aprobación documental E2.5 posterior, 2026-10-24: usuario «Aprobadas» a solicitud única
de spec11 rev3 completa, incluida relación técnica N:M y wireframes. Quedan aprobadas
las ampliaciones de app descritas, distintas del modelo físico C176; no se modifica
Excel ni se autoriza desarrollo/SQL/migración/merge. Registro/candidato en brainstorming11.
