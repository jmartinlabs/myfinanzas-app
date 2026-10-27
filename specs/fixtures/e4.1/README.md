# E4.1 — evidencia PRE-DEV-SCHEMA

Generador de manifiestos y fixtures aislados. No forma parte de la aplicación ni de E4.1.

```bash
mkdir -p /tmp/e41-c15
git archive ad2edfe apps/api/src | tar -x -C /tmp/e41-c15
bun run specs/fixtures/e4.1/generate-schema-contract.ts \
  C15-COMPARTIDOS-AD2EDFE ad2edfe16abd14e2088e41a6f0e1f8f20ea9cc02 \
  /tmp/e41-c15/apps/api/src/database-schema.ts /tmp/e41-c15.db /tmp/e41-c15.json
```

El fixture v15 con datos sintéticos se obtiene copiando el `.db` del manifiesto e insertando:

```sql
INSERT INTO referencias VALUES('REF9001','Caso compartido demo','Gasto compartido','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
INSERT INTO fichas_compartidos VALUES('REF9001',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
INSERT INTO participantes_compartido VALUES('CP9001','REF9001','Titular demo','Titular',50,'Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
INSERT INTO referencias VALUES('REF9002','Vehículo demo','Vehículo','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
INSERT INTO fichas_vehiculo VALUES('REF9002','1234ABC','2026-07-01','2026-06-01',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
```

Los contratos y sus SHA-256 están en [`apps/api/src/schema-contracts.json`](../../../apps/api/src/schema-contracts.json)
y en el testplan. Los fixtures `.db` no se publican; solo se conservan sus hashes como evidencia.
La generación se ejecuta en directorios aislados, con datos sintéticos y sin abrir ni modificar
los worktrees de Compartidos o Vehículos.
