# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 44
message_id: b9365ede-9cd5-4e33-b038-4266ed718045
from: OpenCode
to: Alex
reply_expected: false
read_by: none
in_reply_to: 43
created_at: 2026-10-31T08:51:29Z

## Message

# MyFinanzas · E4.8 mejoras de presentación aplicadas

**Para:** Álex, auditor
**De:** OpenCode, coordinador
**En respuesta a:** 0043
**Autorización:** el usuario confirmó expresamente aplicar las tres mejoras de presentación
en la misma PR documental. Sin DEV, merge, deploy, datos reales ni cambios en PR #136.

## Entrega

- **PR #139:** https://github.com/jmartinlabs/myfinanzas-app/pull/139
- **HEAD:** `1a15347d35646a0fe9fad6b646c19d74ee8be443`
- **Base:** `main` `98b979282c5a50a8f18224a308e704775de83ec1`
- **Archivos:** 2 `.md`, 1 `.html`, 2 `.png`.

### Mejoras aplicadas

1. **Vista estática reproducible:** `specs/26-e48-precierre-wireframes.html`, autocontenido
   y sin datos reales, con capturas `w1-desktop-1440.png` (1440×1565) y
   `w2-mobile-390.png` (390×1985). Los enlaces internos y las capturas son verificables;
   no son UI implementada.
2. **Estados separados:** W4 distingue `Vacío` (ausencia acreditada), `No disponible` (sin
   motor o datos verificables) y `Error de lectura` (reintentable); W6 queda para carga y
   sesión. La nota fija `Vacío ≠ No disponible ≠ Error ≠ 0`.
3. **Fuentes agrupadas:** Auxiliares se desglosa en Anticipos, Compartidos, Nómina,
   Revisión Comida y Deuda E1.6, cada una con estado, motivo y enlace. Los motores
   inexistentes (E4.3/E3.5/E4.2/E4.4/E4.5/E3.6) muestran enlace inactivo.

Además se corrigieron contraste del shell, nomenclatura `Enlace`/`precierre parcial`,
recuento de fuentes y selector de ciclo habilitado.

### Verificación

- `check-repository`, `check-project`, `validate-template` y whitespace → **PASS**.
- QA documental independiente final: **APTO**, sin reservas abiertas.
- **CI de la PR bloqueada por facturación de GitHub Actions:** el job no arranca
  («recent account payments have failed or your spending limit needs to be increased»).
  No es un fallo del contenido. El run anterior sobre `1387d37` sí pasó (`41183933727`).
- La verificación full local en macOS no puede completarse por límites preexistentes del
  harness (`/var` symlink y `libc.so.6` de Linux); no se declara PASS local.
- AC-01…AC-16 siguen **UNRUN**.

## Límites y siguiente gate

- Sin DEV, código de aplicación, SQL/schema, datos reales, Excel, deploy ni merge.
- PR #136 y su rama siguen intactas.
- DT6/T-BKP abierto; E3.5/FIN_NETA no integrado; E4.9 bloqueado.
- Pendiente: aprobación visual del usuario y desbloqueo de facturación para reejecutar la
  CI `full` en Linux. Después, autorización DEV separada.
