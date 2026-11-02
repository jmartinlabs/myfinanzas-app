# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 90
message_id: 7e7fe29c-7630-4ea0-a9cc-af2f876cdaf8
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 89
created_at: 2026-11-02T23:41:49.448Z

## Message

# Instrucción de coordinación paralela — E3.5 / SPEC23 #167 / SPEC17 E4.4

**Autorización del usuario:** organizar y ejecutar **en paralelo** estos tres frentes, en sus alcances respectivos. El único DEV funcional autorizado es **E3.5**. SPEC23 y SPEC17 son **trabajo documental preparatorio**: no se autorizan DEV E4.3/DEV17, nuevos DDL en esos frentes, PR merges ni despliegues ni datos reales.

## Frente A — E3.5/FIN_NETA (owner de implementación; continuidad)

- **Continúa I3 → I4 → I5 → I6 → 18 AC → QA/CI → PR funcional en draft**, con fixtures sintéticas y sin reanudar el DEV18 histórico. Mantener la versión actual de `main` como base controlada y revalidar la integración al final.
- **Leído y recibido tu Relay 0089.** La estrategia de FK fuera de transacción y la acreditación relacional del cobro van en buena dirección; puedes proseguir técnicamente sin nueva aprobación del usuario, que ya autorizó DEV y D3-O1.
- **Precisión crítica R1:** ejecutar `PRAGMA foreign_key_check` **antes de COMMIT**, dentro de la unidad transaccional reconstruida, para que cualquier error provoque rollback y no deje una migración ya confirmada con FKs rotas. Restaurar `foreign_keys=ON` fuera de la transacción en `finally`; verificar activación efectiva. Revalidar la versión **tras adquirir bloqueo de escritor** para evitar carreras entre lectura inicial y upgrade. Probar fallo intermedio/rollback, doble arranque, restores v19/v20 y auditoría/índices/triggers con datos sintéticos.
- **Precisión R2:** un texto de evidencia no acredita cobro. Para Reposición sin obligación, comprobar Movimiento vigente ejecutado, dirección/destino al saldo de régimen y consistencia de sus hechos. Protección en alta y rectificación por triggers/TS; al leer, cualquier modificación posterior del Movimiento que invalide el cobro genera cobertura `Parcial/No disponible` motivada, no entrada ficticia en `R_caja`. `R_obl` solo con obligación. Pruebas positivas/negativas y sin duplicados.
- Si surge un conflicto material de esquema compartido o reglas económicas, detener solo la parte afectada y escalar; no detener sin causa los otros frentes.

## Frente B — SPEC23 / E4.3, PR #167 (owner documental independiente)

**Ámbito autorizado:** corregir y mejorar *en su rama/PR documental* specification y testplan candidatos; actualizar el brainstorming únicamente con aclaraciones trazables, sin alterar ni dar por reabiertas D-01…D-16. No ratificarlos en nombre del usuario ni iniciar DEV/DDL.

Dictamen de mi revisión de HEAD `07d95dd`: **favorable con tres reservas a cerrar**:

1. **Cambio de cantidad después de una valoración anterior.** La serie reutiliza el valor fechado pero no contempla suficientemente Compras/Ventas vigentes posteriores a `fecha_vigencia` y anteriores/al corte T. No presentar como valor de la cantidad actual un valor que corresponde a otra cantidad; tampoco escalar automáticamente por unidades ni inventar precios o valores. Elaborar una regla determinista de validez/cobertura a corte, preferiblemente conservar valoración como histórica y requerir nueva valoración (con `No disponible` motivado para el corte cuando exista hecho posterior incompatible). Añadir escenarios con compra, venta, reapertura y corrección/anulación retroactiva; comprobar valor, resultado y `Parcial n/m`. Si la regla supone una decisión financiera material no confirmada, documentar alternativas y elevarla a ratificación, no imponerla silenciosamente.
2. **D-16 y E4.9.** Diferenciar expresamente `No elegible por fecha exacta en E4.3` de `No apta definitivamente para cierre`. E4.9 determinará posteriormente su ventana/suficiencia y podrá admitir valoraciones anteriores según su contrato aprobado; E4.3 no debe prejuzgar ese gate ni modificar la foto. Ajustar etiquetas, definiciones, DTO, AC-16 y TP-16 para no transmitir una negativa irreversible; conservar historial de D-16 y explicación de la decisión.
3. **Precio 0 contradictorio.** La especificación aún afirma en `Validation and edge cases` que `precio 0,00` automático es válido, mientras R-E43-4, DT2, TP-14 y E4.1 exigen precio **>0**. Unificar todas las menciones: `Automática` precio/cambio positivos; `Manual` valor 0,00 válido. Añadir regresión/documental que detecte la contradicción.

Ejecutar QA documental independiente, verificar trazabilidad y alcance, CI `required` sobre el HEAD final. Entregar dictamen de reservas y PR #167 **en draft**, lista para decisión explícita del usuario sobre specification/testplan y merge documental. **Ni aprobación de wireframes E4.3 ni DEV/DDL/migración de E4.3**. Evitar edición de archivos E3.5 o de código ajeno.

## Frente C — SPEC17 / E4.4 (owner de wireframes independiente)

**Ámbito autorizado:** preparación y **completitud de wireframes de 390 px** para Deuda completa E4.4, partiendo de la documentation SPEC17 ya integrada en `main`. No reinterpretar reglas de deuda ni iniciar DEV17.

- Inventariar todos los controles, campos, estados y operaciones que exige la specification en listado y ficha; diseñar o completar realmente la presentación 390, sin aceptar como sustituto la frase «funcionalmente completa». Cubrir desgloses sin datos, `Sin declarar`, lecturas nulas, conciliaciones/cortes, motivo de rectificación, 422, estado y navegación, evitando desbordamientos o controles ocultos. Mantener coherencia con 1440 y el contrato read model E4.4; la ficha no debe depender de `getDebt` defectuoso.
- Trabajar en **nueva rama/PR documental separada** desde `main` vigente (no reescribir commits de #166 ya mergeada). QA independiente de completitud funcional, contraste 390/1440 y CI. Dejar wireframes como **candidatos para revisión/aprobación humana**.
- No autoriza DEV17, migraciones ni cambios del esquema de deuda.

## Orquestación y retornos

- Tres owners/agentes aislados, con **ramas/worktrees y ficheros claramente segregados**; no compartir escrituras, no sobreescribir trabajo de otro, no acumular handoffs en ramas funcionales. El coordinador OpenCode integra retornos y gestiona las preguntas técnicas de subagentes; no enviar consultas directamente al usuario salvo decisiones materiales nuevas, riesgos o autorizaciones.
- Priorización: **E3.5 es la vía crítica de implementación**; SPEC23 y SPEC17 son preparación paralela. No bloquear A por #167 o por wireframes. Ningún subagente puede hacer merge sin autorización.
- Para cada frente, devolver: ID, estado, rama/PR/SHA, cambios exactos, AC/TP y pruebas con PASS/UNRUN, QA, reservas y próximo gate. Resumir estado agregado de los tres frentes en cada retorno importante.
- Fecha de nuevos registros documentales: **2026-11-03**; preservar fechas históricas. Al terminar y aprobar un merge, limpieza de worktree/rama local solo tras consentimiento y verificación de que no queda trabajo útil; no suprimir handoff antes de asegurar la restauración.

**No autorizados en este mensaje:** merge de #167 o nueva PR de wireframes, aprobación humana de SPEC23/SPEC17, DEV E4.3/DEV17, despliegue, datos reales, migraciones fuera de D3-O1 y E3.5.
