---
id: KANAI-KB009
project: kanai_self
type: ticket
status: open
work_type: improvement
tier: T3
module: dispatch
autopilot: manual
---

## Request

Durante la ejecución de un ticket real (up1 / UPONE-1530) el LLM (Claude 4.8) NO usó el camino canónico de Kanai para gran parte del registro (test cases, learns, teach, cuerpo del spec, estados): lo hizo editando el store directamente. Todo debía quedar registrado por el motor (tools MCP + propose_transition). Hay que endurecer ese camino para que sea imposible (o al menos que el motor lo fuerce), y cerrar los huecos que obligaron a ir a manual. Inventario completo abajo.

## Contexto: por qué pasó (causa raíz verificada)

- `run_process` (el despachador de ejecución) sin `backend` cae a `'local'`: `normalizeBackend(undefined) → 'local'` en `server/dispatch/adapters/index.ts:43`. El adapter local necesita un LLM en localhost (`KANAI_LOCAL_URL`, LM Studio/Ollama) que no estaba corriendo → "fetch failed".
- En cambio `refine_spec`/`review_spec` funcionaron porque hardcodean `backend:'claude'` (`server/mcp/tools.ts:188`). El adapter de Claude soporta `claude-opus-4-8` (`server/dispatch/adapters/claude.ts:137`).
- O sea: el motor SÍ podía correr con Claude 4.8; bastaba pasar `backend:'claude'` a `run_process`. El LLM no lo hizo y se fue a edición directa del store.

## Alcance (dentro) — inventario de cambios

### 1. Selección de backend/LLM (P0)
- `run_process` NO debe caer a un default roto. Si NO hay un LLM ya elegido (ni en el input, ni en config de proyecto, ni en sesión), **debe PREGUNTAR al usuario entre los LLM marcados como FAVORITOS**, no elegir silenciosamente.
- Introducir el concepto de **LLM/backends favoritos** (marcables por el usuario) y un default de ejecución configurable por proyecto (`config.yaml`: p.ej. `executionBackend` + `model`, ej. `claude` + `claude-opus-4-8`).
- Fallback seguro: si el favorito/elegido no responde, `run_process` falla con fix-hint claro ("elegí un backend disponible" / "pasá backend:claude"), NO con un fetch error genérico ni cayendo a `local`.

### 2. Regla de contrato: no improvisar (P0)
- Regla explícita: si la vía canónica no está disponible (backend caído, tool faltante), **frenar y avisar; nunca editar el store directamente**. Reintentar con el backend real elegido antes de rendirse.

### 3. Enforcement: bloquear escritura directa al store (P1)
- Hook `PreToolUse` (instalable) que bloquee Bash/Edit/Write sobre `~/.kanai/data/**` (DB, KB, teach, ndjson). Única vía de mutación = tools MCP. Convierte el "no toques el store" de advisory a enforced.
- Nota: el propio `kanai-app/CLAUDE.md` ya advierte el hazard de writer concurrente; se golpeó (escrituras fuera de proceso pisadas por el MCP abierto; solo CLI + `wal_checkpoint` persistía).

### 4. Huecos de tools MCP (P1) — sin canónico, por eso se fue a directo
- Tool para **test cases**: alta + actualizar estado/actual/evidencia (DET-25). No existe hoy.
- Tool para **refinar/descartar learns** (DET-39). Hoy solo vía chat `/refine-learn` (que pasa por run_process).
- Tool para **registrar teach** (intake/close) (DET-21/22) sin depender del dispatch LLM.
- `refine_spec` solo edita REQs/tasks estructurados; **no reescribe la prosa del spec** (Artifacts, Decisions, Technical reference, Acceptance, tabla ## Tasks del cuerpo). Se reescribió a mano. Resolver: o el cuerpo se RENDERIZA desde datos estructurados (nada que editar a mano), o una tool de enmienda de secciones del cuerpo.

### 5. Defectos que forzaron retrabajo (P2)
- `refine_spec` **duplicaba/resucitaba tasks** en cada enmienda (2 filas por código; los deletes se pisaban al re-materializar del cuerpo).
- **Test cases basura** ("File"/"Suite") re-derivados de los encabezados de las tablas vacías de `## Testing` del ticket (parser toma el header como TC).
- Store **frágil ante escritura concurrente** (el MCP con la DB abierta pisa writers externos; requerir `busy_timeout` + checkpoint no alcanza para robustez).

### 6. Reglas DKC → Kanai + instalación al global (P1)
- Kanai tiene `DET_CATALOG` (`server/engine/guards/catalog.ts`, 41 DETs) + instalador de skills (`scripts/install-claude-skills.mts`), pero **no inyecta sus reglas al `CLAUDE.md` global** (solo runtime vía `kanai_bootstrap`). Por eso hoy el global tiene el bloque de **DKC** siempre-on y el de Kanai no.
- Construir `kanai export-rules --global` (regenerable, entre marcadores, "no editar a mano") que escriba el contrato + DETs condensados de Kanai en el `CLAUDE.md` global, **reemplazando el bloque DKC** (Kanai es el sucesor; los DET son casi 1:1).
- El instalador (`pnpm kanai:install`) debe hacer las 3 cosas: skills + reglas al global + el hook del punto 3.

## Fuera de alcance
- Migrar los proyectos existentes de DKC (ya migrados). Este ticket es sobre el MOTOR/instalación de Kanai, no sobre datos.
- Reescribir el modelo de datos del spec (evaluar si el cuerpo se renderiza desde estructura es parte de #4, pero su implementación completa puede derivar a su propio ticket).

## Criterios de aceptación (borrador)
- [ ] `run_process` sin backend elegido PREGUNTA entre los favoritos; no cae a `local` ni falla con error genérico.
- [ ] Existe la noción de LLM favoritos y un default de ejecución por proyecto.
- [ ] El hook bloquea escrituras a `~/.kanai/data/**` desde Bash/Edit/Write.
- [ ] Hay tools MCP para test cases, learns (refine/discard) y teach; un ticket se puede ejecutar y cerrar SIN tocar el store a mano.
- [ ] `refine_spec` no duplica tasks; no se re-derivan TCs basura.
- [ ] `kanai export-rules --global` inyecta las reglas de Kanai en el global y reemplaza el bloque DKC; el instalador lo corre.

## Origen
Detectado ejecutando up1/UPONE-1530 (Curriculum Mapping | MCP sync) por Kanai el 2026-08-27. Ese ticket se completó (S1-S3, verificación runtime) pero el registro se hizo mayormente por edición directa del store por los gaps de arriba.
