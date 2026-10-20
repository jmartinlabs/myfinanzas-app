# STEP 2 · Context files

## Autorización y alcance
El usuario autorizó STEP 2 y una política permanente de Git/GitHub el 2026-10-20,
tras revisar el resultado del bootstrap. La aprobación de continuar no autoriza merge.
Se documenta lo implementado sin modificar aplicación, dependencias, pruebas ni CI.

## Archivos de contexto
| Archivo | Contenido canónico |
| --- | --- |
| AGENTS.md | Entrada breve, comandos esenciales y política única de Git/GitHub |
| README.md | Presentación y arranque del proyecto derivado, con vínculos al contexto |
| specs/guidelines/architecture.md | Tecnología, módulos, contrato HTTP y persistencia reales |
| specs/guidelines/ui.md | Presentación y tokens existentes, estados, responsive y límites de accesibilidad |
| specs/guidelines/quality.md | Comandos, cobertura, CI real y criterios de evidencia |
| specs/guidelines/security.md | Datos, amenazas, medidas existentes y requisitos pendientes |
| specs/README.md | Propiedad de documentos y estado de inicialización |
| specs/setup-progress.md | Estado reanudable y siguiente acción |

Los principios económicos siguen en project.md, sin duplicarse en guidelines.
La política Git/GitHub vive en AGENTS.md; calidad y seguridad remiten allí.
Los prompts heredados se conservan como referencia, sin presentarlos como instrucciones
vigentes de creación o publicación de una nueva plantilla.

## Estado de Git y revisión previa a publicación
GitHub confirma públicamente el repositorio josemartin2000/myfinanzas-app;
el remoto de lectura y main son accesibles. El commit de bootstrap 36f43e8 aún no
estaba en main al iniciar STEP 2. Se conservó en step-1/bootstrap, con STEP 2 en
step-2/context-files basado en él. No se reescribió historial ni se cambió visibilidad.
Una PR de STEP 2 hacia main incluirá también el bootstrap mientras STEP 1 no se integre;
esta dependencia debe quedar explícita en ambas descripciones y aprobación.

Revisar antes de enviar cada rama los commits salientes completos, sus mensajes, árboles
y contenidos, no solo el diff final. El chequeo puntual de este STEP se ejecuta fuera
del repositorio: identifica rutas sensibles, binarios/bases y patrones de credenciales
(o IBAN) sin imprimir valores; se complementa con revisión del contenido del código y
los documentos. No constituye un escáner exhaustivo ni un nuevo control del STEP 3.
Los fixtures y cambios de la app provienen exclusivamente del bootstrap ficticio.
Las bases, capturas y dependencias generadas están ignoradas y no se añaden al commit.

## Evidencia y bloqueos
- Validador documental y sus 18 regresiones: pasan. diff --check pasó durante el
  trabajo, pero falló al cerrar setup-progress.md por una línea vacía al EOF. Se detuvo
  antes del commit/push de STEP 2 para consultar al usuario, según su instrucción.
  Con su respuesta «hazlo» se corrigió el formato; validador, diff --check y las
  18 regresiones pasan de nuevo. Las regresiones usan una copia exacta de archivos
  del commit, sin node_modules ni otros artefactos ignorados, sin cambiar sus assertions.
- Revisión del historial del bootstrap y su contenido completada sin hallazgos;
  revisar también el commit final de STEP 2 antes de su push. step-1/bootstrap ya
  está publicado y su SHA remoto 36f43e8 se verificó. No confundir push con una PR.
- El comportamiento no cambia; la evidencia vigente de tipos, build, 4 pruebas Bun,
  4 E2E y capturas está en [bootstrap](bootstrap.md). No se atribuyen a esta fase
  nuevas pruebas de navegador ni modificaciones visuales.
- El intento real de crear PR con gh pr create devuelve Forbidden al hacer POST
  a api.github.com/graphql. La API también recibió 403 de la política de red al conectar a api.github.com,
  antes de una respuesta autenticada. GH_TOKEN está presente; no se leyó su valor
  ni se pidió otro token. Acceso Git no demuestra permisos de API.
- Se guardó en el borrador del entorno api.github.com como dominio adicional necesario
  para crear/verificar PR y, tras aprobación, hacer merge. Guardar el borrador no
  activa la red ni publica el entorno. El bloqueo requiere aplicar esa configuración.

## Próxima acción
Crear/verificar las PR hacia main cuando la API sea accesible. El estado de commits
y ramas remotas se comprueba con Git. Esperar aprobación explícita de cada PR
antes de su merge. No comenzar STEP 3 ni roadmap sin nueva autorización.
