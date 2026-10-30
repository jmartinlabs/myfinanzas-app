# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 26
message_id: 00ca6817-e6f5-4894-832a-3ee67f00afdb
from: Alex
to: Codex
reply_expected: true
read_by: none
in_reply_to: 25
created_at: 2026-10-30T19:02:53.957Z

## Message

Destino: Codex · Task ID ARQ-PARTIDA-UNICA-01 · ADENDA A 0025. El usuario aclara que tú NO tienes acceso físico al Excel. NO solicites ni simules inspección: Álex ha realizado el contraste de SOLO estructura y relaciones, sin enviar importes ni datos personales. Esta es la fuente física, no una hipótesis.

FUENTE: `MyFinanzas2026_v5.11(20261030-155958).xlsx`, acceso local de Álex, lectura con artifact_tool de tablas reales. NO se certifica identidad con `v5.11(7)`; no se modifica archivo ni se envía a GitHub.

INVENTARIO VERIFICADO SIN DATOS PERSONALES NI IMPORTES:
- `tblCategorias`: 19 Categorías. `tblSubcategorias`: 27 Subcategorías.
- `tblPresupuestos`: 34 presupuestos: 23 con Fuente ejecutado=Gasto real; 11 con Aportación a saldo; ninguno con No aplica en este corte.
- `tblPartidas`: 58 Partidas. De los 34 Presupuestos: **31 tienen exactamente 1 Partida vinculada** (23 Gasto real y 8 Aportación), **1 tiene 20 Partidas** («Gastos anuales», fuente Aportación a saldo) y **2 no tienen ninguna Partida** (objetivos de ahorro/inversión, ambos Aportación a saldo). Hay **7 Partidas sin Presupuesto**.
- Las 31 relaciones 1:1 tienen nombres iguales en ambos maestros; esto apoya la hipótesis de identidad duplicada, aunque no prueba que todas sus reglas y contratos sean equivalentes.
- «Gastos anuales» NO existe como Partida en el catálogo; hoy es SOLO Presupuesto PRE, por lo que D necesita una identidad canónica/parent nueva o mapping explícito desde PRE, no inferir que ya existe un PAR padre.
- `tblAnual2026`: 22 líneas anuales por ID Partida; **18** de las 20 Partidas actualmente asociadas a «Gastos anuales», y **4** asociadas a cuatro Presupuestos 1:1 independientes (todos Aportación a saldo). No asumir que las 20 hijas se planifican anualmente: 2 carecen de línea anual en este corte. Según D estricta esas cuatro líneas 1:1 deben quedar bajo padre anual, o requerir decisión expresa de cómo migrar; no reclasificar histórico.
- `tblPresupuestoMensual`: 34 líneas mensuales por ID Presupuesto, una por cada maestro PRE; no son líneas por ID Partida. Por tanto, pasar a PAR como clave exige mapear 31 uno-a-uno, introducir el padre anual para el PRE 1-a-20 y resolver expresamente los dos PRE sin Partida y los siete PAR sin PRE.
- `tblCategorias`: métodos Cálculo anual: 13 Gasto, 5 No aplica, 1 Ingreso; mensual: 13 Gasto, 4 No aplica, 1 Ingreso, 1 Gasto compartido neto; Referencia obligatoria: 3 Sí, 16 No. Aunque especifiques «atributos sin consumidor runtime», el Excel sí contiene reglas/campos físicos: no borrarlos sin revisión de impacto.

CASOS CRÍTICOS DE DISEÑO D:
1) 1 PRE→20 PAR: agrupar bajo un nuevo PAR padre, ejecución mensual Aportación a saldo y anual por 18 hijas con línea; conservar otras 2 hijas sin plan anual o justificar nueva regla, no crear importes.
2) 4 líneas anuales en PRE individuales: plantear migración mensual→hijo de un padre y explicar qué pasa con sus aportaciones mensuales anteriores, vínculo bancario e identidad.
3) 2 PRE Aportación sin Partida: son casos de financiación sin gasto; D debe admitir hojas de ahorro/inversión no ficticias.
4) 7 Partidas sin PRE: conservar gasto real válido sin plan; no inventar una línea mensual ni objetivo cero.
5) Si múltiples Partidas se reubican bajo padres, las Categorías/Subcategorías deben conservar una clasificación económica ortogonal, no deducir categoría por padre de financiación.
6) Las 31 igualdades de nombre no bastan para fusionar de manera automática ID PAR/PRE: preservar trazabilidad e histórico en mapping.

HALLAZGO: No es viable que Codex «contraste con Excel si tiene acceso». Tú no lo tienes: considera estos conteos como inspección física realizada por Álex, e identifica claramente lo que aún requiere evidencia. Solicita por Relay a Álex solo datos estructurales concretos faltantes para validar D; Álex los verifica en el libro y devuelve una adenda anonimizada. Ningún acceso directo, copia ni publicación del Excel.

MANDATO Y HANDOFF: Sigue SOLAMENTE el análisis independiente ARQ-PARTIDA-UNICA-01 del mensaje0025, con B/C/D, casos que invalidan o corrigen D, viabilidad del plan anual exclusivo de hijas, deudas, provisiones, históricos, fuente y rol de Categoria; ninguna aprobación implícita. No tocar COMIDA-UNICO-01, PR133/134, datos, código, specs, ni hacer merge. Devuelve dictamen a Álex por Relay, con límites, preguntas materiales y propuesta de decisión. Fin adenda.
