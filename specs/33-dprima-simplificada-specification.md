# 33 — D′ simplificada: Specification

Status: APPROVED — revisión2 y wireframes, más enmiendas E1 (integridad de T)
y E2 (fuente de la aportación), 2026-10-31. Sin implementación.
Approval source/date: mensaje humano directo «Apruebo SPEC33 D′ revisión 2 y sus wireframes»».
La comilla final adicional pertenece al mensaje recibido y no cambia su objeto inequívoco.
Candidato aprobado: specification SHA-256 cd7a4baea00f05fdd3813ff259621c7e9ec061df127e51db446853994e30ec49;
brainstorming SHA-256 4c973f5de8cc70fe41221c9d44a9d2ebb3d856758e24cffb90854b828530aefd.
Las huellas anteriores identifican revisión2 original; E1 y E2 se registran después
con sus propias fuentes humanas. No se atribuyen las enmiendas al hash anterior.
No autoriza desarrollo, migración real, activación, despliegue ni merge.
Autorización de redacción: usuario «Autorizo», tras solicitud única de especificar D′.
Task ID: DPRIMA-SPEC-01. Context and brainstorming:
[33-dprima-simplificada-brainstorming.md](33-dprima-simplificada-brainstorming.md).
Fuentes: [contexto](project.md), [roadmap](roadmap.md),
[SPEC02](02-clasificacion-specification.md), [SPEC08](08-presupuestos-specification.md),
[SPEC09](09-plan-ciclo-specification.md), [SPEC10](10-plan-anual-specification.md),
[SPEC27](27-e49-cierre-financiero-specification.md).
PR134 es diagnóstico, no dependencia de merge ni aprobación de esta arquitectura.
No incorporar ni modificar COMIDA-UNICO-01, SPEC16 o PR133.

## Functionality

D′ sustituye Presupuestos como maestro independiente por Partidas planificables y
sustituye el Plan Anual activo por Gastos Previstos. Conserva histórico y contratos
anteriores en su régimen de lectura; no renombra ni transforma automáticamente hechos.
Se especifica una evolución transversal, no una reinicialización.

### Alcance confirmado para el candidato

- Un maestro Partidas, sin tipos nuevos; relación padre-hija opcional independiente de
  Categoría/Subcategoría. Raíces en Plan Mensual, con o sin hijas.
- Fuente ejecutado en Partida; destino en línea mensual por ciclo, históricamente fijado.
- Raíces simples: Gasto real o Aportación a Saldo; Navidad/Feria sin hijas no necesitan
  correspondencia con compras posteriores para ejecutar aportaciones.
- Gastos Previstos: cabecera padre, rango inclusivo de meses financiados previstos y
  saldo inicial confirmado. Hijas activas copiadas al crear; después líneas manuales.
- Hija repetible por línea con importe/fecha prevista opcional. Ejecución global por
  ID Partida/periodo, no por recibo ni fila de vencimiento.
- Saldo efectivo exclusivo por planificación activa; destino estable salvo traspaso
  bancario real acreditado. No confundir campo destino único con exclusividad del dinero.
- Recalcular sugerencia al abrir ciclo, incluyendo ese ciclo en restantes; ajuste manual
  permitido. No modificar previsiones automáticamente por desviaciones.
- Ejecutado neto de devoluciones acreditadas de compras de la planificación; bruto y
  devoluciones separados. Esencial previsto y Esencial mensual manual independientes.
- Sin solapes del mismo padre. Sin desactivar/reparentar hija usada en planificación
  activa. Cambios abiertos/futuros, nunca reinterpretar cerrado.

Lo anterior recoge preferencias y respuestas directas del usuario (brainstorming);
su conjunto queda aprobado por el mensaje humano identificado en la cabecera.
No se presenta como código ni comportamiento entregado.

### Mensual y previsiones son magnitudes distintas

Para Gasto real, ejecución mensual agrega gastos elegibles por Partida raíz simple o
por hijas acreditadas a su raíz. Para Aportación a Saldo agrega Transferencias reales
elegibles al destino del ciclo. No sumar una financiación y su gasto como doble consumo.
El gasto previsto responde cuánto se espera gastar; la sugerencia mensual cuánto falta
aportar. Una Partida simple sin planificación agrupada admite importe mensual manual.

Jerarquía candidata: dos niveles raíz/hija, sin ciclos ni autorreferencias.
Criterio comunicado por Álex en
[relay0006](https://github.com/jmartinlabs/myfinanzas-app/blob/4435b676d43b3db902df55f8194850c9ebd0bf3d/relay.md):
el usuario le indicó «confirmo gastos a los hijos». Se incorporó al candidato como
preferencia transmitida y después quedó cubierta por aprobación humana integral
de revisión2; el relay no concede aprobación protegida por sí solo.
Si hay hijas, los Gastos NUEVOS van exclusivamente a ellas; la raíz agrupa/financia.
Una raíz simple sí admite gasto propio según su fuente y clasificación válida.
Sin hija puente ficticia ni tipo adicional. Gastos antiguos del padre conservan su ID,
Partida, clasificación y resultado original; no se reclasifican automáticamente.
Añadir hijas a una raíz con historia exige revisión de impacto y corte de uso nuevo,
para no excluir sus gastos antiguos ni mezclarlos con G de una planificación de hijas.
No inferir fuente por tener hijos, nombre o Categoría. No añadir un enum oculto de tipos.

### E1 — importes previstos incompletos, aprobada 2026-10-31

Fuente humana: «Aprobados», respuesta inmediata a la única aclaración «¿Querías decir
Apruebo la primera enmienda —no calcular la sugerencia automática mientras falten
importes previstos, salvo exclusión manual explícita—?». Se registra E1, no se infiere
aprobación de la segunda enmienda de fuente por el plural de la respuesta.

T requiere importe informado en cada línea incluida. Si falta alguno, mostrar suma
conocida como subtotal Parcial; T completo, P y aportación sugerida son null/No
verificables, con IDs de líneas pendientes. No sustituir ausencias por cero ni dividir
el subtotal como si fuera total completo. G/S/N válidos no corrigen T incompleto.
Exclusión manual explícita y auditada permite retirar una línea de T para el ciclo
abierto/futuro; conservar línea, motivo y fotos cerradas. No excluir por omisión ni
por etiqueta, y no suprimir un Gasto real del ejecutado por excluir su previsión.
Importe0 informado es un dato válido y distinto de Sin informar o Exclusión.

Ejemplo: IBI100, Seguro sin importe, S100/G0/N2 => subtotal previsto100, T/P/sugerida
no verificables; no sugerir0. Si se excluye expresamente Seguro, T100/P0/sugerida0
son resultados legítimos con alcance y exclusión visibles. No se modifica el banco.

### E2 — P/N solo para fuente Aportación a saldo, aprobada 2026-10-31

Fuente humana directa: «Apruebo E2: P/N solo genera aportaciones para raíces con
fuente Aportación a saldo». Es enmienda explícita al alcance de la fórmula, no una
interpretación inferida de respuestas anteriores ni autorización de desarrollo.

| Fuente aplicada de la raíz | Ejecución mensual | Uso de P/N |
| --- | --- | --- |
| Gasto real | Gasto elegible de la raíz simple o de sus hijas, según contratos de ejecución mensual aplicables | No genera cuota ni rellena Del mes como aportación. Plan mensual de gasto conserva importe manual y pendiente frente a ese gasto. |
| Aportación a saldo | Transferencias reales elegibles al destino inequívoco del ciclo, sin doble cómputo de compras posteriores | P/N puede proponer aportación si existe planificación, saldo exclusivo y datos completos E1/G/S/N verificables. Confirmar propuesta no ejecuta transferencia. |
| No aplica histórico | Sin comparable según fuente histórica | Sin cuota ni conversión automática a otra fuente. |

G neto para calcular financiación no autoriza por extensión un nuevo neto mensual;
la ejecución Gasto real conserva su contrato propietario aplicable.
Una planificación con raíz Gasto real puede consultar previsiones y ejecución por
hijas; no por ello se ofrece una cuota transferible. P/N figura No aplica por fuente,
distinto de No verificable por T incompleto cuando sí se intenta calcular aportación.
Una raíz simple de aportación sin planificación mantiene importe mensual manual;
no inventar T, hijas ni una planificación para aplicar fórmula.

La fuente aplicada en el ciclo y sus fotos históricas manda sobre su ejecución.
Cambiar fuente para ciclos abiertos/futuros exige impacto y revisión; no ejecutar
ambas modalidades simultáneamente en una misma línea ni reinterpretar cerrado.
Combinar gasto y aportación en una raíz como nueva modalidad necesitaría decisión
material aparte; E2 no la crea ni cambia los hechos económicos centrales.

### Apertura y cálculo de financiación

Cada planificación tiene rango de etiquetas de mes financiado, por ejemplo enero–marzo.
No crear Inicio/Fin ni filas ficticias de Ciclos. Al abrir el ciclo real se enlaza por
su mes financiado derivado; las etiquetas no mandan sobre fechas económicas.

Para ciclo enero quedan 3 etiquetas incluyendo enero; febrero, 2. Usar orden/mes-año,
no cantidad de filas existentes ni nómina/reloj. Si falta el ciclo real que debe abrirse,
no ejecutar recálculo. Un salto/rectificación de ciclos que invalide el rango exige
revisión, no crear o reasignar hechos automáticamente.

Fórmula de financiación, aplicable solo a raíz con fuente Aportación a saldo según E2:
- T: suma de cada línea incluida una sola vez, incluidas varias líneas de la misma
  hija, con completitud E1. No deduplicar previsiones por ID Partida ni contar una
  exclusión manual como dato perdido. La deduplicación de hechos corresponde a G.
- G: gasto neto acumulado elegible de esa planificación al corte común de apertura.
- S: saldo real exclusivo disponible al mismo corte; no sumarle de nuevo saldo inicial.
- P = max(0, T − G − S).
- N: etiquetas financiadas restantes incluyendo la que se abre, positivo.
- Aportación sugerida = P/N, importe EUR exacto, con política de céntimos del cuadro
  aprobada junto con revisión2. Requiere T completo según E1.

Ejemplo ficticio T=1000, G=200, S=300, N=2: P=500, sugerida=250.
Con dos previsiones 100 de una hija y gasto real 80: T=200, G=80, no G=160.
Un pago 200 desde saldo500 deja G200/S300, cobertura total500; no restar el pago
nuevamente del saldo leído. Saldo inicial es foto de origen, no financiación adicional.

S solo es verificable si cuenta y fondos son exclusivos, posición/cobertura completas
y sin tránsitos sin resolver. Dos planes con T600/T800 no pueden descontar cada uno
un mismo saldo1000. Si hay fondos ajenos, cuenta no conciliada, saldo no calculable,
partida/origen de devolución sin acreditar o dinero trasladado en tránsito: no presentar
sugerencia completa ni cero; bloquear cálculo automático y explicar el dato pendiente.
El usuario puede planificar manualmente, sin borrar incidencias ni fabricar hechos.

Apertura obtiene snapshot coherente de fuentes y muestra propuesta antes de confirmar.
Confirmación idempotente guarda sugerida, importe aceptado y fuentes/corte del recálculo.
No hay recálculo continuo de importes editables ni sobrescritura silenciosa de ajustes.
Una reejecución técnica del mismo intento no crea otra apertura/aportación/Movimiento.
Nueva evidencia/corrección después de confirmar invalida disponibilidad, pero no rehace
un ciclo cerrado ni cambia el importe manual sin acción revisada.

### Reglas de cálculo — aprobadas con la revisión 2

Estas precisiones formaron el cuadro explícito sometido a revisión y quedan aprobadas
con la especificación revisión2. Se conservan respuestas y secuencia de aprobación en
brainstorming. La aprobación financiera/funcional no autoriza implementación.

| Tema | Propuesta explícita para cerrar la especificación |
| --- | --- |
| Ventana de ejecución | Proponer límite inferior en Inicio real del primer ciclo enlazado a la planificación; límite superior en el corte de apertura, acotado por Fin real del último ciclo cuando exista. Sin primer ciclo real, no inferir límite desde año natural, etiqueta mensual o fecha prevista. En la apertura del primer ciclo, G de esta ventana empieza en0. Compras anteriores no se incorporan automáticamente a G; si una previsión las incluye, revisar T y su cobertura antes de sugerir, sin crear crédito de ejecución ni cambiar importes por inferencia. |
| Corte de apertura | Leer G y S al mismo corte civil anterior al Inicio real del ciclo que se abre, antes de incorporar su nueva aportación. Si apertura es tardía, reconstruir ese corte solo con cobertura acreditada, sin usar posición actual como apertura pasada. Si no se puede, propuesta automática no disponible. No exigir foto ni cierre financiero del ciclo previo para calcular: basta reconstrucción acreditada a corte; aprobación de apertura no cierra ese ciclo. |
| Gastos desde otra cuenta | G se atribuye por Partida y periodo de la planificación, no por banco pagador; S solo es el saldo exclusivo. Un pago externo no exige devolución entre bancos por inferencia. Un traslado real aún en tránsito bloquea la sugerencia verificable para evitar volver a financiarlo. |
| Neto y devolución tardía | G=bruto de compras de la planificación−devoluciones acreditadas de esas compras hasta el corte. Devolución de una planificación anterior no entra en G de la nueva. El efectivo efectivamente recibido sigue en el banco y en S si la cuenta pertenece ahora de forma acreditada al nuevo plan; no crear ejecución o financiación ficticia para explicarlo. |
| Falta de atribución/exceso | Entrada bancaria acreditada no se borra ni se convierte en Ingreso por no tener compra atribuible. Sin pertenencia/Partida acreditada, G afectado queda parcial/no disponible y no se calcula una sugerencia completa. No atribuir a una compra más reembolso que su importe elegible ni introducir repartos nuevos. |
| Saldo negativo | Conservar S real firmado, sin recortarlo a0 antes de aplicar P=max(0,T−G−S); advertir déficit. Exclusividad/cobertura siguen obligatorias. Si S no se puede acreditar, no sustituir por0. |
| Céntimos | Calcular P/N racionalmente, mostrar sugerida redondeada al céntimo más próximo, mitad hacia arriba, sin float. N=1 sugiere P exacto. Siguiente apertura recalcula con aportaciones/gastos reales, por lo que un céntimo pendiente no se convierte en hecho ni arrastre de ejecución. Confirmar sigue permitiendo ajuste manual; no garantizar suma exacta de cuotas manuales ni reescribirlas para cuadrar un residuo. |
| Finalización y hechos tardíos | Finalizar funcionalmente al acreditarse el Fin real del último ciclo y un corte que lo alcance; sin esos datos, estado Pendiente de finalización. No generar cierre financiero. Foto final solo mediante proveedor SPEC27. Hecho tardío real se registra con su fecha; no reescribir foto ni plan siguiente. Revisión de impacto/rectificación según contrato de cierre antes de modificar resultados congelados. |

Ejemplos ficticios de estas reglas aprobadas:
- P100/N3 => sugerida33,33; las siguientes aperturas usan saldo/hechos reales y N
  restante, no una ejecución arrastrada. Si al último ciclo P=33,34, sugiere33,34.
- T1000/G200/S−50/N2 => P850/sugerida425; no ocultar50 de déficit ni truncar S.
- Compra100 de la planificación, devolución20 acreditada antes de apertura: G80.
  Con S120 y T1000 => P800. Si esos20 pertenecen a una planificación anterior, G de
  esta no baja; el banco conserva los20 según saldo real exclusivo, sin doble crédito.

En main no existe aún contrato ejecutable completo de devoluciones comerciales.
D′ necesita un proveedor central aprobado/entregado para obtener neto acreditado;
no resolver su ausencia con Ingreso artificial ni crear otro ledger. No modificar
SPEC16/PR133 para conseguirlo desde esta rama. La integración se acuerda por contrato
y autorización posterior; hasta entonces no declarar el neto D′ implementado.

### Atribución y disponibilidad — decisiones no cerradas

El código actual atribuye Transferencias por destino, sin Partida. Propuesta mínima:
destino inequívoco entre raíces de aportación en el ciclo; verificar antes de confirmar.
Si dos raíces lo comparten, no contar una Transferencia dos veces: bloquear atribución
automática hasta decisión. Un destino exclusivo por planificación no basta si una raíz
simple también lo usa para aportar durante el mismo ciclo.

Gasto neto requiere evidencia de Partida y pertenencia al periodo de planificación;
compra anterior a la planificación o devolución sin origen no se atribuyen por nombre.
Las devoluciones reales siguen en su banco receptor. Reglas de tardíos,
exceso y cobertura del cuadro anterior están aprobadas con revisión2.
Compra anulada/rectificada invalida atribución afectada y exige revisión, sin borrar
una entrada bancaria real. No importar decisiones de SPEC16 por analogía ni duplicar
Movimiento económico.

Para S proponer cuenta conciliable en posición real al corte, no objetivo/manual sin
evidencia ni saldo Terminal sin motor. El cuadro de propuestas concreta saldo negativo/pago externo;
fondos transferidos antes de ejecutar y devolución recibida fuera del saldo exclusivo
exigen acreditar pertenencia/cobertura al mismo corte. No interpretar cualquier
Transferencia como financiación o gasto ni crear reservas virtuales para cuadrarlo.

### Modificaciones, renovación y cierre

Al crear planificación, incluir hijas activas como líneas iniciales. La copia es una
propuesta revisable; altas posteriores del catálogo no modifican líneas automáticamente.
Importe y fecha son previsiones, no hechos. Fechas opcionales: no inventar vencimiento
ni prometer aviso exacto de liquidez si faltan fechas o asignación por recibo.

Cambios de previsión afectan ciclo abierto y futuros. Fotos de ciclos cerrados conservan
composición/importes/reglas/resultados que tenían. No mover hija a otro padre ni
desactivarla durante planificación activa. La clasificación relevante usada en cerrado
también se conserva; cambio futuro del maestro no reclasifica informes cerrados.

Destino estable durante planificación. Excepción entre ciclos requiere operación
explícita revisada que acredite traslado bancario real y continuidad del fondo, sin
modificar destino de ciclos cerrados. Fondos repartidos/tránsitos: cálculo automático
no verificable hasta conciliación; cambiar un selector no mueve dinero.

Finalizar planificación al acabar el último ciclo es cierre funcional, no cierre
financiero automático. No usar duración provisional de Comida para cerrar D′.
Dependencia del maestro y corte/ventana real; si no se acredita finalización, presentar
pendiente, sin inventar Fin. La foto financiera se toma por el cierre verificable de
SPEC27, no por un evento duplicado ni por un scheduler nuevo.

Nueva planificación: copiar solo previsiones como propuesta editable; revisar fechas,
importes y nuevo rango. No trasladar gasto ejecutado, pendiente de ejecución ni
saldo final como si fuera financiación nueva. Confirmar nuevo saldo inicial con evidencia.
Operaciones tardías de un periodo ya cerrado no se ocultan ni se imputan al nuevo;
procedimiento de rectificación/impacto y relación con foto previa conforme a las
propuestas y dependencia de cierre indicadas, sin presumir proveedor instalado.

## Data model and contracts

Esquema conceptual mínimo candidato; no DDL ni versión técnica reservada:

| Entidad | Datos propios | Límite |
| --- | --- | --- |
| Partida | ID estable, nombre/estado, padre-Partida opcional, clasificación, fuente ejecutado, relación Deuda vigente | Padre actual FK Subcategoría se conserva separado; no sobrecargarlo. Sin saldo/importe acumulado de gasto. |
| Plan Mensual / línea | ciclo real, raíz, Base, Esencial manual, Del mes, destino por ciclo, sugerencia aceptada/corte y revisión | Fuente/composición aplicada conservadas al cierre, sin leer maestro actual para reinterpretar pasado. |
| Planificación prevista | ID, padre, etiquetas inicial/final, saldo inicial confirmado y fuente, estado/revisión | Sin fechas financieras alternativas ni segundo ledger. Identificación del saldo de financiación coherente con mensual. |
| Línea prevista | ID propio, planificación, hija, importe previsto, fecha opcional y Esencial | Una hija puede aparecer varias veces; ejecutado global no se copia monetariamente en cada línea. |
| Fotos de cierre | Datos y resultados finales más IDs/configuración/criterios y cobertura del ciclo | Reutilizar contrato SPEC27, no event sourcing ni versión de cada edición. |
| Movimientos/Saldos/Deudas/Referencias | Hechos, identidad y contratos existentes | Sin reasignación/destrucción ni tipos nuevos por planificar. |

Categoría/Subcategoría siguen clasificación independiente. Gasto exige clasificación
válida; financiadora sin clasificación no pasa por ello a ser una Partida válida para
Gasto. Políticas de Referencia y Deuda no se heredan de raíz por nombre ni se borran.
La validación concreta de raíces con hijas/Partida sin Categoría se propone al revisar
la spec; no modificar el catálogo real para adaptarlo.

No mantener Presupuestos como segundo maestro editable en el nuevo régimen. Sus IDs y
configuración anteriores se conservan como legado/mapping y fotos históricas, sin
destruir referencias. Las líneas/fuentes históricas No aplica conservan importes,
ausencia de comparable y procedencia; no se convierten por defecto en Gasto real o
Aportación. El formato del mapping no convierte dos maestros en uno por
renombrar columnas. Un PRE con varias PAR requiere raíz/mapping explícito; no repartir
automáticamente su objetivo entre hijas ni fusionar PAR usados por deuda.

EUR en céntimos exactos, DTO decimal string; no float ni cero por omisión. Fechas civiles.
FK, revisión/huellas, auditoría e idempotencia atómicas reutilizan patrones existentes;
sin ORM, motor de reglas genérico o dependencias preventivas. No guardar otra copia
editable de ejecución o saldo. Foto final y recibo de apertura no son versiones de cada edición.

### Plan Anual sustituido y conservación

El usuario elige sustitución, no dos planes editables paralelos. Antes de activar nuevo
régimen, el antiguo queda consultable con ejercicio, Partida, importe, periodo, Esencial,
ejecutado/cobertura, Fecha ejecutada/Fecha histórica y procedencia originales.
Preservar ausencias y fechas suministradas por histórico sin reconstruirlas por
inferencia desde un Movimiento que no existe. No convertir automáticamente año natural
en rango de ciclos ni fecha prevista; ciclos pueden cruzar años.

Propuesta de traslado para revisión: importe anual a propuesta de líneas previstas,
Periodo previsto como evidencia histórica hasta elegir fecha opcional, Esencial a cada
línea prevista. Mensual conserva Base/Esencial/Del mes y no sincroniza Esencial con
hijas ni aplica /12. Valores sin informar y Pendiente no se convierten a cero/No.
Si una PAR anual se divide en varias líneas, no copiar el importe total en cada una.

No se certifica migración física: falta contraste de la base vigente para D′. v5.10
observada por Álex es solo histórica. PR134 no decide qué filas deben convertirse.
Archivo v5.11 aportado en otro contexto tampoco prueba el mapping D′ sin inspección
específica. Migración real/activación requieren autorización separada e inventario
de consumidores y comparación por corte.

## Screens and interfaces

Wireframes aprobados con revisión2; no UI implementada; conservar shell/tokens propios.
1440: tablas; 390: mismas magnitudes en tarjetas, sin perder identidad/etiquetas.

### Maestro Partidas y Mensual

    Partidas | Raíz [todas] | Clasificación [filtro] | Estado [activo]
    ID / Nombre       Padre planificación   Clasificación   Fuente   Estado
    Raíz gastos       —                     —               Aportación
      Seguro coche    Raíz gastos           Seguros         —        Activa

    Plan Mensual · ciclo real [maestro] · cobertura [...]
    Raíz | Fuente aplicada | Destino | Base | Esencial | Del mes | Ejecutado | Pendiente
    [...] [Ver previsión] [Ver hechos] [Revisar apertura]
    Gasto y aportación son magnitudes distintas; sin total que los duplique.

### Gastos Previstos y revisión de apertura

    Gastos Previstos | padre [...] | rango financiado ene–dic2027
    Estado [...]   Saldo inicial confirmado [...]   Saldo actual [cobertura]
    Línea ID | Hija | Importe previsto | Fecha opcional | Esencial
    [Añadir línea] [Editar futuro] [Ver ejecución global por Partida]

    Apertura · ciclo real [...] · corte [...]
    Total previsto T [...]   Bruto [...]   Devoluciones [...]   Neto G [...]
    S al corte de apertura [...] (distinto de saldo actual)
    Pendiente P [...]  Restantes N [...]
    T incompleto: No verificable [Ver líneas pendientes / exclusiones]
    Sugerida [solo Aportación a saldo; otras fuentes: No aplica]
    Importe a incorporar al mensual [editable, no ejecuta transferencia]
    Fuentes/advertencias [...]   [Cancelar] [Confirmar propuesta]

Móvil (390), complemento de las pantallas de Maestro y Mensual, mismos campos aprobados:

    Partidas · [Filtros]
    Raíz gastos · ID PAR[...] · Padre planificación [Ninguno]
    Clasificación [Sin informar] · Fuente [Aportación] · Estado [Activo]
    [Ver hijas] [Ver detalle]
    Seguro coche · ID PAR[...] · Padre [Raíz gastos]
    Clasificación [Seguros / ...] · Estado [Activa]
    [Ver detalle]

    Mensual · Ciclo real [...] · Cobertura [...]
    Raíz [...] · Fuente aplicada [...]
    Destino del ciclo [...]
    Base [...] · Esencial manual [...] · Del mes [...]
    Ejecutado [magnitud según fuente] · Pendiente [...]
    [Ver hechos] [Ver previsión] [Revisar apertura]

    Apertura tardía
    Corte histórico [...] · S reconstruido al corte [importe / No verificable]
    Saldo actual [solo consulta, no sustituto de S]
    [Ver evidencia] [Revisar propuesta]

Móvil (390), propuesta ASCII específica:

    MyFinanzas       Ciclo [real / sin enlace]
    Gastos Previstos · Padre [...] · ene–dic2027
    [Cobertura parcial · Ver motivo]
    Línea LP1 · Seguro coche
    Previsto [...]   Fecha [Sin fecha]   Esencial [Sí]
    [Editar futuro]  [Ver hechos de Partida]
    Línea LP2 · Seguro coche (otra previsión)
    Previsto [...]   Fecha [...]         Esencial [No]
    [Editar futuro]
    [Añadir línea] [Revisar apertura]

    Revisión de apertura
    T [...]   Bruto [...] / Devoluciones [...] / Neto G [...]
    S al corte de apertura [...] (distinto de saldo actual)
    Pendiente P [...]  Restantes N [...]
    Sugerida [solo Aportación a saldo / No aplica por fuente]
    Incorporar al mensual [importe editable, sin transferir]
    [Desplegar fuentes y motivos]
    [Cancelar]   [Confirmar propuesta]

La ejecución se muestra global por Partida y periodo, no duplicada dentro de ambas
líneas. Panel desplegable conserva acceso por teclado; botones con etiquetas,
foco visible y errores por campo.
Bloquear recálculo con motivo no bloquea registrar un hecho bancario real válido.
No exponer botones operativos de funcionalidades aún no entregadas.

## Empty, loading and error states

Sin planificación difiere de total0, sin saldo confirmado y cobertura insuficiente.
Sin plan mensual no equivale a importe mensual0. Fuente fallida nunca devuelve vacío
ni sugerida0. Mostrar subtotal conocido con Parcial, no resultado completo falso.
Fechas ausentes son Sin fecha prevista, no primer día del año. Desviación no cambia plan.
409 por revisión/huella obsoleta conserva borrador y exige nuevo impacto; 422 por dato
inválido, 404 por ID ausente, 401 exige sesión; errores sin SQL ni datos privados.
Plan finalizado/periodo cerrado: lectura disponible, edición protegida con motivo.
Restantes0: sin división; fuera del rango no se genera aportación ni arrastre automático.

## API behavior and external dependencies

Contrato candidato, nombres concretos por revisar sin adelantar DDL. Reutilizar
recursos de clasificación/plan mensual y servicios centrales de hechos/posición.
Gastos Previstos necesita lectura/listado/ficha, alta/copiar propuesta, impacto y
confirmación de cambios. Apertura preview→confirmación con snapshot de fuentes,
huella, versión y clave de intento; guardar importe manual en el mismo commit lógico.
Ningún endpoint crea Movimiento por sugerir/confirmar previsión ni ejecuta transferencia.
Rol autenticado monousuario, MFA/Origin/CSRF/no-store y límites JSON actuales.
Transacciones de escritura y revalidación servidor; selección UI no sustituye guard.

Ciclos es maestro único; Saldos posición; Movimientos hechos; Deuda/Referencia sus
contratos. Fotografías y edición cerrada dependen del proveedor de cierre, actualmente
no instalado en los motores de planes; especificarlo no equivale a disponer de él.
Los eventos de apertura/fin necesitan fuente central acreditada; no scheduler paralelo.
La sugerencia para fuente Aportación a saldo NO depende de foto/cierre financiero previo: sí depende de
posición y hechos reconstruibles al corte común. Si faltan S0/movimientos o evidencia
de devolución, no afirmar saldo histórico ni sugerencia verificables.

## Validation and edge cases

- Rango financiado coherente e inclusivo, sin solape para mismo padre; límites contiguos
  no comparten el mismo mes. Snapshot/comprobación bajo transacción para altas concurrentes.
- Una hija pertenece a un padre; sin bucles. Dos filas previstas de la misma hija son
  válidas y distintas por ID, no duplicados económicos de Movimientos.
- Saldo de planificación exclusivo y destino mensual no ambiguo; si falta evidencia de
  exclusividad/cobertura bloquear cálculo automático, no simular fondos reservados.
- Alta/cambio de maestro no reinterpreta cerrado. Cambio de fuente/destino tiene preview.
- Importe previsto/plan sin informar se conserva; políticas de saldo negativo,
  devoluciones tardías/exceso y céntimos fueron aprobadas con revisión2; ejecutar
  esas reglas sigue requiriendo autorización de desarrollo.
- Gasto sin Partida/clasificación válida sigue contrato propietario; no crear Partida puente.
- Copia de renovación no arrastra ejecución. Fechas se ofrecen como propuesta y deben
  revisarse; no mover vencimientos automáticamente al nuevo año.
- Cambio de cuenta sin traslado real y pagos en tránsito afectan cobertura; no transferencias
  ficticias. Correcciones pasadas requieren procedimiento con impacto/fotos, no edición libre.

## Exclusions

Sin implementación, DDL, migración, datos reales, despliegue, activación ni merge.
Sin nueva arquitectura aprobada por publicar documento. Sin edición de PR133/134,
SPEC16 o roadmap vigente; su coordinación futura se decide antes de desarrollo.
Sin reservas virtuales/globales, Pockets, reconciliación automática inventada,
asignación económica por vencimiento, árbol ilimitado, versionado de cada edición
ni segundo maestro temporal. Revisión de calidad de clasificación queda posterior.

## Acceptance checks

Todos UNRUN: criterios aprobados de acciones/resultados, no pruebas de aplicación ejecutadas.

| ID | Action / preconditions | Expected observable result |
| --- | --- | --- |
| AC-01 | Crear raíz simple y raíz con dos hijas; consultar mensual | Ambas raíces planificables sin tipo nuevo; jerarquía separada de clasificación. |
| AC-02 | Gasto real desde cuenta compartida y aportación a destino | Gasto se atribuye por Partida; aportación por hecho elegible, sin doble ejecución. |
| AC-03 | Crear planificación con hijas activas y añadir hija después | Copia inicial revisable; catálogo posterior no altera líneas sin acción manual. |
| AC-04 | Dos líneas100 para misma hija, una compra80 | Previsto200, ejecutado80 global; no duplicar ni afirmar recibo pagado. |
| AC-05 | Misma planificación/rango: T1000/G200/S300/N2 | Pendiente500, sugerida250, saldo inicial no se suma otra vez. |
| AC-06 | Dos planificaciones usan mismo dinero1000 | Bloquear descuento automático duplicado, no sugerir0 para ambas necesidades600/800. |
| AC-07 | Rango previsto ene–mar y apertura real enero/febrero | N3/N2 incluye ciclo que abre; no Inicio/Fin ficticios. |
| AC-08 | Cambiar destino con fondos antiguos o tránsito | Sin traslado/cobertura, cálculo no verificable; destino histórico intacto. |
| AC-09 | Ajustar manual sugerida y registrar gasto nuevo | Importe editable no se sobrescribe continuamente; hechos no cambian previsión. |
| AC-10 | Nueva apertura con mismo intento / dos confirmaciones concurrentes | Una apertura incorporada; conflicto coherente, sin Movimiento financiero creado. |
| AC-11 | Desactivar/reparentar hija de planificación activa | Rechazo íntegro; identidad, deuda y líneas conservadas. |
| AC-12 | Cambiar maestro o plan abierto tras foto de ciclo anterior | Abierto/futuro puede revisarse; foto/configuración/resultados cerrados intactos. |
| AC-13 | Finalizar último ciclo y abrir nueva planificación | Finalización funcional separada de cierre financiero; copiar solo previsiones, no ejecución. |
| AC-14 | Sustituir Plan Anual mediante propuesta de mapping | Histórico consultable, Esencial/periodo/nulls preservados; sin reparto/fechas inventadas. |
| AC-15 | Devolución acreditada de compra de planificación | Bruto/devolución/neto separados, sin Ingreso ficticio ni doble resta en financiación. |
| AC-16 | Cuenta/corte/Partida incompletos, fuente fallida o N0 | Motivo y Parcial/No disponible; sin sugerida0 falsa o división inválida. |
| AC-17 | Mapping PRE agrupado con varias PAR y deuda/Referencia | IDs/relaciones/historia preservados; sin duplicar objetivo en cada hija. |
| AC-18 | Usar 1440/390, teclado y 401/404/409/422 | Mismas magnitudes legibles, foco y borrador conservados; sin acciones inexistentes. |
| AC-19 | Reabrir/restore fixture de futuro esquema aprobado | Hechos, mapping, fotos y relaciones conservados, accesos/intentos revocados según contrato. |
| AC-20 | Comparar árbol/datos/diff de entrega documental | Solo esta spec/brainstorming, sin modificar código ni Comida ni diagnóstico134. |
| AC-21 | Raíz con hijas e histórico de gastos propios | Rechazar Gasto nuevo en padre, permitir en hijas; preservar hechos/fotos antiguas, sin hija ficticia. |
| AC-22 | Corte previo sin foto financiera anterior, primer ciclo, pago externo y tránsito | Apertura posible con datos a corte acreditados aunque no haya cierre financiero; G inicial0 sin compras previas; pago por Partida sin banco impuesto; tránsito sin resolver no produce sugerida verificable. |
| AC-23 | Propuestas de P100/N3 y S−50 con T1000/G200/N2 | Sugerida33,33 con redondeo explícito; saldo firmado conserva P850/sugerida425. |
| AC-24 | Reembolso atribuible actual, de plan anterior o sin origen, y hecho tardío cerrado | No duplicar crédito ni trasladar ejecución; banco conserva hecho; cobertura afectada visible y fotos sin reescritura automática. |
| AC-25 / E1 | IBI100/Seguro sin importe/G0/S100/N2; después excluir Seguro explícitamente | Primero subtotal100 y T/P/sugerida null con motivo; después T100/P0/sugerida0 con exclusión visible/auditada. Cero explícito no es ausencia; hechos y cerrado intactos. |
| AC-26 / E2 | Raíz Gasto real con hijas, gasto elegible80 y Del mes manual100; aparte raíz Aportación con T200/G80/S20/N2 al abrir | Gasto real ejecuta80/pendiente20 sin cuota P/N ni autollenado por transferencia. Aportación sugiere50; si se acepta50 y se transfiere25 en el ciclo, ejecutado25/pendiente25 sin sumar gastos de hijas a la financiación. |

## Gates posteriores a la aprobación documental

La revisión2 y sus wireframes están aprobados. Las reglas del cuadro de cálculo y
el alcance raíz/hija forman parte de esa aprobación; no requieren otra ronda idéntica.
E1 y E2 están aprobadas por mensajes humanos separados. Las observaciones materiales
de Álex0010 tienen enmiendas explícitas; su aprobación no acredita código ni elimina
gates de implementación, migración, activación o merge.
Permanecen además los siguientes gates de ejecución, sin ampliar la autorización:
1. Autorización expresa y separada de desarrollo de SPEC33; la redacción/spec aprobada
   no la sustituye. Identificar dependencias satisfechas antes de despachar implementación.
2. Proveedor central de neto/devoluciones y cierre verificable, pruebas y enmiendas de
   contratos propietarios/roadmap antes de sustituir runtime. No declarar integración
   con fuentes aún ausentes ni reiniciar DEV detenidos.
3. Mapping físico vigente y conservación de Esencial/Deuda/Referencia e histórico;
   autorización específica de migración real/activación. No equivale a certificación
   del Excel ni cierra gates históricos pendientes.
4. QA independiente y verificación canónica de un candidato de código, sin heredar
   PASS de esta fase documental. Merge de cada PR requiere aprobación propia.

Publicar documentación no implementa ni activa el modelo. La arquitectura mínima y
reglas aprobadas solo se ejecutarán dentro de la autorización de desarrollo posterior.
