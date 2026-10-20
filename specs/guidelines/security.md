# Security guidelines

## Baseline safeguards
Never commit secrets or real personal data. Use fictional deterministic fixtures. Configure
credentials via the environment/secret store; document names and destinations, never values.
Do not print credentials. Keep TLS, package signatures and checksums enabled.
Inspect existing work and authorization before changes. Ask explicitly before destructive
operations, production deployment, remote publication, permission or visibility changes,
or material security-sensitive changes. No force pushes or silent overwrites.
Commit only reviewed own files. Inspect staged diff for credentials and unrelated work.

## Project initialization — UNDECIDED
Identify actual threats and record proportionate requirements for:
- Authentication and server-side authorization (or justified not applicable).
- Data classification, access, encryption, retention and deletion.
- Input validation and untrusted API/file content; safe errors and logs.
- Dependency provenance, vulnerabilities and update policy.
- Deployment targets, credentials, migration/backup/rollback restrictions.
- Confirmation boundaries for destructive data operations.
Add supported checks with positive/negative examples. The template heuristic credential
check is not a guarantee that arbitrary secrets or personal data will be detected.
