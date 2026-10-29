# Evidencia QA/E2E — SPEC07 · PR #128

**Fecha:** 2026-10-29  
**Producto:** `main` base `6d7b103`; PR #128 HEAD `a1e1be949649d8e2aed78f43817053cfa91b4400`  
**Código evaluado por QA:** `6483d06` (idéntico a `a1e1be9` salvo documentación)  
**CI:** Linux `critical` run `40862555880`: PASS, 311 API  
**Estado:** PR abierta, sin merge.

Esta rama contiene únicamente evidencia. No forma parte de `main`, no tiene PR y no modifica producto.

## Contenido

| Archivo | Origen |
| --- | --- |
| `qa-independent.md` | Retorno final de la sesión QA independiente `ses_e78ad04d6ffe1dwLLXxmiufCOM`, extraído de su mensaje final |
| `review-desktop-1440.png` | E2E focal principal, escritorio 1440 |
| `review-mobile-390.png` | E2E focal principal, móvil 390 |
| `pagination-real-desktop-1440.png` | E2E focal de paginación real 105+105, escritorio |
| `pagination-real-mobile-390.png` | E2E focal de paginación real 105+105, móvil |

SHA-256:

```text
7bf5a1a99ffdac87e22ca4dedad29cf609f33c225c3d80c43af5b0ee6f6ab842  review-desktop-1440.png
8c2e392625a72da958a91c14bb773678f9a8764d4deecb9f2a0e4cee8fe6aa3a  review-mobile-390.png
53c2cf6e1d94097c1e2b106c36695abd3bc01a95bf31e0d176afbf5e63747b9b  pagination-real-desktop-1440.png
27f2e5b575d52d4d0f0160f0a481738e70e027462bea4f234fe85f1b2cd115a7  pagination-real-mobile-390.png
```

## Ejecuciones focales

Ambas pruebas fueron efímeras (no persistidas en Git) y usaron datos ficticios:

1. `_tmp-spec07-comida.spec.ts` — `1 passed`; Comida afectada con `totalMovimientos=0`, antes/después, 409 al insertar Comida entre preview/confirmación; capturas review 390/1440.
2. `_tmp-spec07-pagination.spec.ts` — `1 passed`; 105 vigentes + 105 anuladas reales, página 2 con 5+5, totales 105/105/210 y «Siguiente Comida» deshabilitado; capturas reales 390/1440.

Comando base: `PATH=... TMPDIR=/private/tmp bunx playwright test <spec> --workers=1`.

**Limitación de conservación:** no se persistieron los logs crudos de terminal de estas dos ejecuciones; el resultado anterior y los exit code proceden del reporte de ejecución de OpenCode. No se reconstruyen como logs primarios.

## E2E completa

`bun run test:e2e` local: 11 passed, 2 failed. Los dos fallos corresponden al arranque del servidor de restauración en `catalog`/`movimientos`; el flujo de Ciclos focal no está afectado. **E2E global: UNRUN**, no PASS. El perfil CI `critical` no ejecuta Playwright.

## Privacidad

Capturas con datos ficticios, sin credenciales, secretos ni datos financieros reales. El retorno QA no contiene secretos.
