# Architecture guidelines

## Decisiones confirmadas y alcance actual
Fuente: solicitud «Start New Project — MyFinanzas App» y aprobación posterior del plan,
2026-10-20. El usuario autorizó después STEP 2 · CONTEXT FILES y la gestión Git/GitHub.
El propósito, los principios financieros y las referencias pendientes pertenecen a
[project.md](../project.md); este documento describe tecnología y límites técnicos.

Stack confirmado: React + TypeScript + Vite; Bun + Effect TS y Effect HTTP; SQLite
mediante bun:sqlite, SQL directo sin ORM; CSS propio con design tokens; Bun Workspaces;
Bun Test y Playwright. Desarrollo local primero. No reabrir estas decisiones sin una
incompatibilidad concreta. Justificar cualquier dependencia adicional antes de incorporarla.

## Estructura implementada

| Ruta | Responsabilidad |
| --- | --- |
| apps/web | React, presentación y estados de lectura; Vite y proxy local /api |
| apps/api | Servidor Effect HTTP, consultas SQL, creación y semilla del catálogo ficticio |
| tests/e2e | Flujos de navegador y capturas de los dos viewports |
| .local | Base ficticia local generada e ignorada por Git |
| specs | Contexto, decisiones, estado y evidencia; sin originales financieros |
| .agents/skills y templates | Metodología reutilizable |

El servidor abre y libera SQLite con un recurso Effect scoped; BunHttpServer sirve
el router en 127.0.0.1:3001. Vite escucha en 127.0.0.1:5173 y redirige /api al servidor.
React hace una petición relativa a /api/saldos y representa su resultado. No hay acceso
al archivo SQLite desde el navegador ni servicios externos en el flujo.

## Contrato y propiedad de datos
GET /api/saldos devuelve 200 JSON `{ "saldos": [{ "id": "demo-001", "nombre": "…" }] }`.
El resultado se ordena por id. Lista vacía: 200 con saldos vacío. Fallo de lectura:
500 con mensaje genérico, sin detalles SQL. Las rutas desconocidas devuelven 404.
El frontend comprueba la forma mínima de la respuesta y muestra error si no es válida.
No existen endpoints de escritura ni importación.

SQLite es propiedad exclusiva del backend. La tabla demo_saldos contiene id TEXT
PRIMARY KEY y nombre TEXT NOT NULL. La semilla es transaccional, determinista e idempotente:
INSERT OR IGNORE conserva filas existentes. Es un catálogo técnico de solo lectura,
no el modelo financiero definitivo de Saldos ni una migración del Excel.

La ruta por defecto es .local/demo.sqlite, independiente del directorio de invocación
del servidor. DATABASE_PATH es una configuración local de confianza, no una entrada HTTP.
Las pruebas de persistencia usan un archivo temporal eliminado al terminar; E2E usa
SQLite en memoria, aislado de la base de desarrollo. No hay migraciones versionadas,
autenticación, cálculos, sincronización ni lógica financiera implementados.

## Herramientas y dependencias
Bun 1.4.3 está indicado en .bun-version y packageManager. Versiones directas exactas
en package.json de raíz y workspaces; resolución íntegra en bun.lock. Instalación congelada.
Frontend: React/React DOM 19.3.1 y Vite 8.3.4 con plugin React 6.1.2.
Backend: Effect 3.22.3, platform 0.97.2 y platform-bun 0.91.3, combinación compatible
con sus peers. TypeScript 7.0.2 y tipos Bun/React para chequeos; Playwright 1.64.1 para E2E.
Los adaptadores oficiales proporcionan HTTP y ejecución Bun; no se añade ORM,
librería UI ni validación externa. bun:sqlite no requiere paquete de base de datos.

## Decisiones de destino aún no implementadas
VPS Linux con Docker Compose y Caddy; HTTPS obligatorio. Un único usuario, sin registro
público; autenticación robusta y segundo factor antes de utilizar datos reales online.
No se ha elegido mecanismo de autenticación, sesiones, recuperación, backups ni esquema
financiero. Estos detalles requieren especificaciones y aprobaciones posteriores.

## Estado y límites
La [evidencia STEP 1](../bootstrap.md) documenta comprobaciones y capturas; comandos y
cobertura vigente en [calidad](quality.md), presentación en [UI](ui.md) y amenazas en
[seguridad](security.md). STEP 2 documenta lo implementado sin cambiar código ni contratos.
STEP 3 automatiza los controles descritos en [calidad](quality.md), sin cambiar la app.
No inferir reglas económicas
de nombres, ejemplos o código técnico. La referencia vigente es la arquitectura v5.11
definida en [project.md](../project.md); sustituye reglas v5.10 contradictorias. No
convertir las tablas del Excel directamente en el modelo SQL definitivo.
La especificación funcional ya fue recibida para STEP 4; su
[referencia sanitizada](../functional-reference-v5.11.md) separa reglas y decisiones
confirmadas de los detalles técnicos abiertos. La planificación aprobada en
[roadmap](../roadmap.md) no altera la arquitectura implementada ni autoriza código.
El dominio previsto y la preferencia de ubicación del VPS están en
[contexto operativo](../project.md); no se ha contratado infraestructura ni desplegado la app.
