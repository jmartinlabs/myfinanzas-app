# E4.1 — evidencia PRE-DEV-SCHEMA

Generador de manifiestos y fixtures aislados. No forma parte de la aplicación ni de E4.1.

```bash
# Ejemplo: contrato Compartidos v15 desde ad2edfe
git archive ad2edfe apps/api/src | tar -x -C /tmp/e41-c15
bun run specs/fixtures/e4.1/generate-schema-contract.ts \
  C15-COMPARTIDOS-AD2EDFE ad2edfe16abd14e2088e41a6f0e1f8f20ea9cc02 \
  /tmp/e41-c15/apps/api/src/database-schema.ts /tmp/e41-c15.db /tmp/e41-c15.json
```

Los contratos y sus SHA-256 están en [`apps/api/src/schema-contracts.json`](../../../apps/api/src/schema-contracts.json)
y en el testplan. Los fixtures `.db` no se publican; solo se conservan sus hashes como evidencia.
La generación se ejecuta en directorios aislados, con datos sintéticos y sin abrir ni modificar
los worktrees de Compartidos o Vehículos.
