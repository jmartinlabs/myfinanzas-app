# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 147
message_id: 907b981e-e8b5-41c7-96d1-a3a450389a0c
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-04T18:43:16Z

## Message

# INFRA-TEST-01 · SPEC del entorno TEST — revisión

## Publicado
- **PR #207** en myfinanzas-app, HEAD `96ab897`, CI **PASS** (`41882419519`), draft.
- `specs/34-infra-test-01-specification.md` + `testplan`; 19 AC `UNRUN`.
- Solo documentación: sin VPS, DNS, Caddy, firewall, deploy, datos reales ni merge.

## Diseño
- Reutiliza `infra/` existente: Containerfile Bun 1.4.3 por digest, `release.py`, `runtime.py`, healthcheck, RUNBOOK, Quadlet rootless, UID 10001.
- TEST: `https://test.myfinanzas.pp.ua`, Caddy → `127.0.0.1:18082` → `3001`, estado privado, SQLite + clave, backup/restore y rollback.
- **Seed reproducible `FT-1`**: artefacto test-only del mismo SHA, sin endpoint ni SQL crudo, marcador TEST, guardas de origen/ruta/esquema/propietario, manifiesto/checksums, idempotencia y reset archivado. Dataset limitado a funcionalidades de `main` (`b713b08`, esquema 24): sin cierres E4.9, históricos E4.5 ni E4.7/E4.10/E4.11.
- **vps-infra PR #7** ya existe y se referencia; no se duplica ni se edita. §11 solicita: D6 reproducible, SHA/estado actual, secuencia `production-init → seed → setup`, rutas nuevas, segundo ID de seed, AC reforzados y nota de `render-unit`.

## Decisiones D1–D6
1. **D1** imagen test-only del mismo commit (recomendada) vs herramienta en host.
2. **D2** marcador `test-instance.json` + origen + manifiesto (recomendado).
3. **D3** `production-init → seed → setup` (recomendado).
4. **D4** archivar `state` y recrear (recomendado).
5. **D5** dataset `FT-1` fijo; ampliar exige versión nueva.
6. **D6** unidad TEST redactada por vps-infra mientras `runtime.py:render` fija PROD/18081.

## Dependencias y riesgos
- E4.9/v25 **no mergeado**: esquema 24 y sin cierres; E4.5/DT7 no apta; E4.7/E4.10/E4.11 DRAFT.
- Gate Rootless, DT6/T-BKP, Caddy/DNS reales y flake B3 siguen abiertos.
- Riesgo principal: seed que salte invariantes o se ejecute fuera de TEST; mitigado con servicios, guardas y manifiesto.

## Petición
Revisión de la SPEC y de D1–D6, con objeciones de seguridad/infraestructura. La aprobación y las autorizaciones de fase (empezando por auditoría read-only) corresponden al usuario. Sin merge, VPS ni deploy.
