# SQLite B3 — comparación aislada y secuencia B1/B2 — 2026-10-24

Estado: diagnóstico acotado completado, fallo NO reproducido; incidencia NO resuelta.
Autorización: mensaje real del usuario «Autorizo» tras propuesta de contrastar B3
aislado frente a la secuencia B1/B2→B3, sin cambiar guardas ni aceptación.

## Hipótesis y montaje

Hipótesis: ejecutar B1 y B2 previamente en el mismo proceso puede determinar el fallo
B3 observado en la suite completa. Comparación en Ubuntu24.04, Bun1.4.3:

- Base anterior a dev09: `568aeedceceacd7c1acaf9caf67803e0ff98cbd6`.
- Candidato dev09: `88941e1e8fb3e545eae09e1e94df3d699b692030`.
- Dos selecciones originales: `^SQLite B3:` y `^SQLite B[123]:` sobre el archivo real.
- Tres rondas predefinidas por versión/selección, intercaladas en el mismo runner.
  Cada caso comienza con un proceso Bun nuevo; B1/B2/B3 comparten PID dentro del
  caso secuencial. No se instrumentan ni copian las funciones de aceptación.
- Mismo archivo de pruebas y dependencias en ambas versiones. SHA256 del archivo:
  `52ef166abb8011820058f071c05d868c0e0d1c9a54671a05d59d8758dda5ed5d`.
- Worktrees temporales, dependencias del lockfile instaladas en cada uno, preflight
  de imports y timeout45s por caso con eliminación del grupo de procesos al expirar.
  Límite del job12min. Cualquier fallo/selección incompleta mantiene resultado rojo.

Rama exclusiva `codex/diagnose-b3-sequence`, sin PR ni intención de merge. Su workflow
se identifica como diagnóstico y no sustituye la validación de dev09. Aplicación,
guardas y pruebas originales sin cambios. Script y parser en
[commit7314a88](https://github.com/josemartin2000/myfinanzas-app/commit/7314a88a12e1d45717b8b9be786df2abf94cbd74).
Parser:6 pruebas locales PASS; revisión estática independiente sin bloqueos.

## Resultado válido

[Run40078520525](https://github.com/josemartin2000/myfinanzas-app/actions/runs/40078520525),
job120826972832, COMPLETED/SUCCESS:

| Versión | Selección | Casos correctos | Timeout / selección inválida |
| --- | --- | --- | --- |
| Base568aeed | B3 aislado | 3/3 | 0/0 |
| Base568aeed | B1→B2→B3 | 3/3 | 0/0 |
| Dev09 88941e1 | B3 aislado | 3/3 | 0/0 |
| Dev09 88941e1 | B1→B2→B3 | 3/3 | 0/0 |

Doce procesos/casos completos, B3 ejecutado doce veces. Las selecciones secuenciales
comprueban también B1 y B2, dando24 ejecuciones individuales de pruebas en total.
No apareció SQLITE_IOERR_SHORT_READ en esta matriz.

## Intento de preparación anterior — excluido de la evidencia

[Run40078265490](https://github.com/josemartin2000/myfinanzas-app/actions/runs/40078265490)
terminó rojo porque el enlace de node_modules raíz no resolvía otpauth en los
workspaces temporales de Bun. No ejecutó pruebas B3. Se corrigió el montaje mediante
instalación congelada por checkout y preflight; no fue un reintento de B3 hasta verde.

## Conclusión y límites

En esta muestra, B1/B2 previos son insuficientes para reproducir el fallo. No se
demuestra causa ni resolución, ni equivalencia con el estado de toda la suite.
La comparación no reproduce los otros archivos ni su estado compartido en el proceso.
No permite descartar carreras, efectos de descubrimiento/importación de otros tests
o historia de conexiones SQLite. Esas posibilidades siguen siendo hipótesis.

El fallo de aceptación del candidato permanece:
[CI40076614284](https://github.com/josemartin2000/myfinanzas-app/actions/runs/40076614284),
137 API PASS/1 FAIL, B3 errno522 al reabrir tras contención en
sqlite-opening.test.ts:288. Las13 pruebas nuevas de dev09 pasan, pero E2E global no
se ejecutó. Ni esta sonda verde ni los probes anteriores16/16 sustituyen ese gate.

Revisión independiente coincide con esta interpretación. No se relanza la suite,
se elimina B3 ni se cambia seguridad. Siguiente hipótesis posible: efecto de
descubrimiento/importación entre archivos frente al archivo único, con una nueva
comparación limitada que requeriría decisión de alcance. La presente sonda termina aquí.
