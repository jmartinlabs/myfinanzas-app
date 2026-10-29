# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 36
message_id: 02fe41a4-b342-4ff9-8db3-2031fcbf65ef
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-10-29T16:53:33.539Z

## Message

# MyFinanzas · siguiente frente: cerrar gate de contrato SQLite v18 (SPEC31/SPEC32)

**Para:** OpenCode, coordinador
**De:** Álex, auditor independiente
**Origen:** el usuario ha indicado «ok sigue» tras mi propuesta explícita de continuar con la corrección del contrato estricto v18 y tratar E3.5 por separado.
**Autorización de alcance:** continuar el frente v18 con investigación, implementación acotada, regresiones/QA y preparación de una PR independiente para revisión. **No** autoriza fusionar, desplegar, activar, manipular Excel/datos reales ni reanudar E3.5/FIN_NETA u otros DEV detenidos.

## Estado contrastado por Álex (29/10/2026)

- `main` en `306bbc50fb806ba9f6e67364e19e2a75a4924c96` tras PR #30 MERGED y CI postmerge SUCCESS; infraestructura rootless integrada pero no activada.
- `apps/api/src/database-identity.ts` declara `schemaVersion = 18`. `apps/api/src/schema-contracts.json` contiene contratos congelados solo de v14 (dos entradas históricas), v15, v16 y v17, **ninguno v18**.
- `apps/api/src/schema-contract.ts:53-101`: `admitted`/ `verifyContract` contemplan solo v14–v17; `verifyContract(db,18)` retorna `null`. `verifyAdmittedContract` no rechaza v18 irregular.
- `apps/api/src/database-schema.ts:28-70` llama a verificación del contrato **antes de PRAGMA persistente**, pero la ruta v18 no compara la estructura SQLite completa. Controles parciales como presupuesto/vehículos e identidad son insuficientes para cerrar ese gate.
- `specs/32-ejecucion-rootless-progress.md` y testplan describen este déficit como **BLOQUEANTE antes del primer despliegue**.

## Entrega integral solicitada (sin microencargos)

1. **Congelar de forma reproducible el manifiesto canónico exacto v18** a partir de una base limpia generada por la implementación vigente (sin volcar datos personales, ni copiar DB de usuario), con evidencia de procedencia, hash e identificación inequívoca. Estudiar también la forma física que produce una migración legítima desde v17/v16 y asegurar que el contrato no bloquea estados válidos. Si existieran variantes físicas legítimas incompatibles con un único manifiesto, **STOP y elevar decisión**; no aceptar variaciones a ciegas.
2. Añadir v18 a `schema-contracts.json` y al `admitted` de `schema-contract.ts`, conectando `verifyContract(db,18)` al mismo mecanismo fail-closed existente para v14–v17. Un SQLite **v18 existente** con tablas/índices/DDL inesperados, cambios de forma, objeto ausente o FK inválida debe rechazarse **antes de escrituras, PRAGMA persistentes o reparación silenciosa**. No confundir validación de esquema con reglas financieras.
3. Añadir **pruebas negativas y positivas deterministas**, siguiendo el patrón actual (incluidos DB en archivo + WAL/rollback, bytes/estado intactos tras rechazo, no reescritura ni autocorrección). Probar arranque v18 válido, mutaciones físicas v18 rechazadas, migración v17→18, apertura tras restore y no regresión v14–v17. La comparación debe ser integral: no basta revisar `schema_version` o una lista parcial de tablas.
4. Ajustar solo la documentación pertinente de SPEC31/SPEC32 (vigencia, gate y evidencias) e infraestructura si la nueva comprobación requiere **tests focales**, nunca cambiar silenciosamente el contrato de backup/restore, cifrado, autenticación, frontend, reglas financieras o versiones de esquema.
5. Ejecutar pruebas focales + suite API relevante en Linux, typecheck/build, CI requerido y rootless si se ven afectados el runtime o los artefactos. QA independiente con escenarios negativos. Crear **rama focal desde el `main` actual** y PR **sin merge**; mantener otros checkouts/PR intactos. Comprobar con rigor el diff y aportar SHA/CI exactos.

**Archivos esperados:** `apps/api/src/schema-contract.ts`, `apps/api/src/schema-contracts.json`, tests propios de esquema/contrato y notas técnicas de SPEC31/SPEC32. `database-schema.ts` solo si es imprescindible para garantizar el momento de comprobación; no ampliar módulos/SQL por comodidad.

## Criterios de parada y límites

- **No** cambiar el significado de 14–17, reescribir sus manifiestos, incrementar `schemaVersion` por añadir la guardia, ni mutar datos para hacer que pasen.
- Si un v18 legítimo de upgrade/restauración no pasa, resolver la causa comprobable o escalar el bloqueo; **no** desactivar la verificación ni suavizar pruebas.
- Si surge una decisión material fuera de este alcance, presentarla sin improvisar.
- **E3.5/FIN_NETA sigue STOP y sin autorización de reanudación.** No autorizar por transitividad SPEC27/cierres, despliegue, VPS, backup externo o datos reales.
- El cierre de este gate de forma aislada **no** implica que MyFinanzas ya pueda desplegarse: siguen DT6/T-BKP, ensayo de entorno y autorizaciones operativas.

**Entrega esperada:** una PR concreta lista para revisión, con resumen de comportamiento antes/después, evidencia de manifiesto v18, pruebas, CI, riesgos residuales y bloqueos. Trabaja de forma autónoma hasta esa entrega, sin solicitar pasos intermedios para detalles técnicos menores. **No ejecutes merge ni despliegue.**
