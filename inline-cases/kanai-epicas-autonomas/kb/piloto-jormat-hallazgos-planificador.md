# Piloto Jormat: tres fallas del planificador de épicas

Fecha: 2026-10-06. Épica: `EPIC-FACTURAS-CLIENTE-FEEDBACK` (proyecto jormat-evolution, tickets JOR-169 a JOR-175, rama `feature/facturas-cliente-feedback`, plan aprobado en versión 4, corrida sin iniciar). Código revisado en kanai-app rama `setup` (HEAD 8ff3acd). La rama `codex/epicas-autonomas` que figura en el intake no existe: todo el código de épicas está en `setup`.

Es la segunda cohorte real del piloto, en otro proyecto y con otro estilo de redacción de tickets. La persona decidió (06-10) corregir estas fallas antes de ejecutar la épica y usarla como cohorte de F10.

## 1. Dependencias inferidas falsas

**Observado.** Los cuerpos citan IDs de un documento de decisiones (R-05, P-08, T-01, CA-09), una pregunta histórica (JOR-167-Q8), tickets cerrados del proyecto (JOR-166, JOR-167) y nombres de documentos (JOR-166-JOR-167-decisiones-desarrollo-2026-10-06). El planificador generó 81 aristas inferidas, todas falsas, cada una con dos bloqueos ("Dependencia externa pendiente" y "Decidir dependencia inferida"). Hubo que rechazarlas con un lote de 80 decisiones; tras editar los cuerpos quedaron 73.

**Causa.** `server/epics/planner.ts:12`, regex `\b[A-Z][A-Z0-9]*(?:-[A-Za-z0-9]+)+\b`, casa cualquier token con mayúscula inicial y guiones. El único filtro es `CONTEXT_METADATA = /^(?:DEC|V|QA|EP)-/i` (`:14`), una lista fija del piloto Tao. El bucle de `:53-58` agrega como dependencia toda mención no resuelta (`from = mention`). No consulta `projects.ticketPrefix` (`server/db/schema.ts:86`) ni la tabla `tickets`; `evaluate` es pura y sin DB.

**Antecedente.** `kanai-pre-epica` F2 bajó el piloto Tao de 126 a 44 avisos con la denylist, y dejó anotado que REQ- y P- se colaban y que las historias cerradas aparecían como dependencias (`resultado-prueba-f2.md` §3). Jormat confirma que una denylist no escala: cada proyecto trae sus propios prefijos.

**Corrección propuesta.**
- Cargar el prefijo del proyecto en `canonicalDraft` (`server/epics/service.ts:37-49`, que sí tiene DB) y pasarlo a `evaluate`.
- Con prefijo: considerar solo menciones `PREFIJO-<número>` completas (sin segmento siguiente), de modo que `JOR-167-Q8` y nombres de documento no cuenten.
- Mención a un ticket del proyecto que existe y está cerrado o descartado: contexto, no dependencia. Mención que no existe: aviso, no dependencia externa bloqueante (o mantener decisión humana, a definir).
- Sin prefijo: comportamiento actual (compatibilidad con TAO/GH/HU).
- Tests en `tests/unit/epic-planner-references.test.ts` con R-05, P-08, CA-09, JOR-167-Q8, nombre de documento y ticket cerrado.

## 2. Archivos externos sin vía de entrada

**Observado.** Los tickets citaban 19 archivos fuera del repo de la épica (legacy y documentos del KB del proyecto). El plan los marcó "Asset sin clasificar"; declararlos como `input` con ruta absoluta o `../` fue rechazado ("Usar una ruta relativa dentro del repositorio"); sin `sourcePaths` quedaron "Entrada de asset pendiente (missing)". Los 19 sí estaban declarados en `readPaths` y aparecían en `readRequirements`. Solución de rodeo: se sacaron las rutas externas del texto de los 7 tickets y la evidencia quedó a un clic en el documento de decisiones.

**Causa.** `server/epics/schema.ts:5` rechaza absolutas y `..` para `assets[].path` y `sourcePaths`. En `server/epics/assets.ts:58-62`, una referencia del cuerpo solo se considera cubierta por lecturas externas si `resolve(root, path)` coincide exacto con un `readRequirement`; una ruta relativa al KB (`jormat_docs/tickets/x.md`) se resuelve dentro del repo y no coincide. `externalEvidence` no se consulta en `assets.ts`. `inspect` (`:17-48`) fuerza todo dentro del root.

**Corrección propuesta.**
- Clasificar como cubierta toda referencia del cuerpo que coincida por sufijo con una entrada de `readPaths`/`readRequirements`.
- Permitir `assets[]` con `external: true` (superRefine en el esquema): no se inspecciona en el repo; queda `ready` si su lectura está en `readRequirements` (y autorizada al iniciar) o tiene `externalEvidence`.
- Actualizar `tests/unit/epic-assets.test.ts:48` ("keeps external input missing as a blocker") con el caso cubierto, y documentar en `docs/development/epic-execution.md` y `kn-epic/SKILL.md`.

## 3. El repo de la épica solo por nombre

**Observado.** `repo: "jormat-evolution-backend-api"` (el id que devuelve `list_project_repos`) fue rechazado con "Repositorio no registrado/habilitado en el proyecto"; `"backend-api"` (el nombre) fue aceptado.

**Causa.** `server/epics/bridge.ts:15` busca solo `r.name === epic.repo`. Todo el resto del flujo usa el nombre como cadena opaca. Los tests usan `id: 'repo', name: 'repo'`, así que nunca distinguieron.

**Corrección propuesta.** Normalizar en `canonicalDraft`: aceptar nombre o id y guardar siempre el nombre; misma doble búsqueda en `repoRoot` por épicas ya guardadas; mensaje de error con los nombres válidos; test con id distinto del nombre.

## Hallazgo operativo adicional (no de código)

En un monorepo registrado por subcarpetas (backend y front como repos distintos), una épica fullstack no tiene repo que la contenga. Se resolvió registrando la raíz del monorepo como repo `monorepo` del proyecto. Vale documentarlo como práctica en `kn-epic` o detectarlo al crear la épica.

## Costo del rodeo en la sesión

Para llegar al plan aprobado hicieron falta: 4 intentos de `update` rechazados, 16 ediciones de sección en los tickets, 2 lotes de decisiones (88 y 80) y una salida de `epic_operate` de hasta 100 mil caracteres por llamada (la respuesta de `update`/`plan`/`approve` devuelve la épica completa, con los cuerpos de los tickets). Esto último merece revisión aparte: una respuesta compacta por defecto.
