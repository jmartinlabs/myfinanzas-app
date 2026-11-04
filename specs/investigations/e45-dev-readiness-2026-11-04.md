# E4.5 — Paquete de entrada a DEV (2026-11-04)

**Estado:** preparación documental. **No autoriza DEV**, no abre datos reales, no define SQL
ni importador. SPEC20/testplan ya están aprobados; no se duplican.

## Gates de entrada

| Gate | Estado | Qué falta |
| --- | --- | --- |
| SPEC20/testplan aprobados | Cumplido (2026-10-28) | — |
| QA documental AC-48…AC-59 | **NO APTO** | Enmienda C1–C7 y reauditoría (`e45-qa-ac48-59-2026-11-04.md`) |
| DT7: mapping/corte/regularización | **Abierto** | Evidencia privada y aprobación del usuario |
| Autorización de DEV | **No concedida** | Decisión explícita del usuario |
| Fixtures | Diseñadas | Materializar en el paquete de DEV |

## Alcance mínimo del futuro DEV

- Read model/API de archivo histórico separado de los hechos detallados, solo Gastos.
- Consumo del universo/mapping aprobado por DT7; sin importador definitivo ni carga real.
- Estados de cobertura (`Verificado/Parcial/NoAcreditada/Solapada`), `total=null` cuando
  corresponda, subtotal separable y motivos; nunca 0 sustitutivo.
- Ninguna operación, plan o foto pasada inventada.
- UI de consulta y cobertura cuando la spec lo exija; sin crear maestros paralelos.

## Dependencias y límites

- E2.4/E4.7: el adaptador E4.5→E2.4 debe quedar documentado antes de consumir AC-58.
- E4.9/E4.10/E4.11: no se leen fotos ni se crean cierres desde E4.5.
- DT7 real sigue siendo un gate separado del DEV con fixtures.
- Sin datos personales, Excel real, migración ni despliegue.

## Paquete propuesto

`E4.5 · DEV-01 — Archivo precontrol de solo lectura` (nombre descriptivo), tras:
1. aprobar la enmienda documental C1–C7;
2. reauditar AC-48…AC-59;
3. disponer de evidencia DT7 y autorización de DEV.

El paquete debe recibir ownership de módulos/rutas nuevas, fixtures aisladas y plan de QA
independiente. No se inicia por este documento.
