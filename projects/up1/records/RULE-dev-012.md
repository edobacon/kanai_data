---
id: RULE-dev-012
project: up1
type: rule
module: dev
tags:
  - creation
  - up1-check
  - commandments
  - det-32
  - design
  - gate
  - hook
  - dkc
---

# Crear artefactos en up1 pasa por `/up1-check`, y el trabajo respeta los COMMANDMENTS del block que toca

## What

up1 tiene su propia puerta de creacion, declarada en su `CLAUDE.md` ("Regla de Creacion") y enforceada por un hook del repo. Cuando un ticket DKC de este proyecto va a **crear** un artefacto (componente, objeto, resolver, evento, flow, layout, composable), aplica:

1. **La cascada DET-32 se implementa corriendo el comando del repo**, no como razonamiento inline: `/up1-check <descripcion del requerimiento>` (`.claude/commands/up1-check.md`). Devuelve una decision por artifact — `REUSE` / `REQUEST EXTENSION` / `CREATE as brick in mod` / `CREATE` — que mapea 1:1 al veredicto de DET-32 (`reuse|reduce|drop|build`). El veredicto agregado se registra igual que siempre, via `dkc-record-decision --step necessity-assessment`, citando lo que el comando resolvio.
2. **Una corrida por requerimiento, no por archivo**. Si el design agrega artefactos despues, se vuelve a correr; el registro de sesion aprueba **directorios**, no nombres de archivo.
3. **El registro de sesion es parte del contrato**: `/up1-check` escribe `.claude/.session/up1-check-passed` con los `approvedPaths`. Sin ese archivo, el hook `.claude/hooks/validate-write.js` bloquea el `Write`. Si el gate corrio pero el archivo no existe (por ejemplo porque todo fue `REUSE`), no hay nada nuevo que crear: si igual aparece una task de creacion, el design esta inconsistente.
4. **El hook NO es la garantia, es el piso**. Cubre solo `Write` de archivos nuevos, solo bajo `mods/` y `layout/src/components/`, y solo si el cwd de la sesion es el repo up1 (`settings.json` es project-scoped). Crear un objeto en `object-manager/objects/business/`, un resolver, o cualquier cosa por `Edit` o desde un cwd distinto **no** dispara el hook y el gate igual aplica. `UP1_EXPERT_BYPASS=true` lo apaga por completo: apagarlo no exime del gate.
5. **COMMANDMENTS por repo alcanzado**: up1 es **multi-repo** — la raiz up1 es un repo y cada workspace core (`object-manager`/`layout`/`suite`/`flow`/`report-builder`) es su **propio** git repo (submodulo), mas `up1-mcp` standalone. Cada repo trae su `.ai/COMMANDMENTS.md` (una regla por linea) con la doc normativa de ESE repo. El trabajo debe leer y respetar el COMMANDMENTS de **cada repo/subtree que alcanza** — no un set fijo. "Que repos alcanza" sale del `execute_scope` del ticket (cada entry con prefijo `<repo>:<path>`), que son **los mismos** que itera la guarda de rama (RULE-dev-004 / DET-30, verificada por repo destino, no en el superproyecto). El mapeo scope → COMMANDMENTS vive en el bloque `commandments:` del `config.yaml` del proyecto:
   - `platform_always` (`.ai/COMMANDMENTS.md`) aplica a **todo** trabajo que alcance el monorepo up1 (reglas de plataforma: como crear un block nuevo, aislamiento por tenant), independiente del subtree.
   - `by_scope` mapea cada prefijo de `execute_scope` a su COMMANDMENTS. `null` = ese repo aun no tiene uno (hoy: `report-builder`, `up1-mcp`) — no bloquea.
   - Paths opcionales: los dos clones difieren por rama; leer los que existan, un ausente no es error ni se inventa.
   Contradecir un COMMANDMENTS alcanzado es un hallazgo de review (dimension docs de DET-23/DET-37). Crear un **block nuevo** sin su propio `.ai/COMMANDMENTS.md` lo deja incompleto por la regla 5 del COMMANDMENTS de plataforma.

Interaccion con `RULE-mods-001` / `RULE-dev-004`: el default sigue siendo trabajo autocontenido en el mod. `REQUEST EXTENSION` del comando y `layer: core` de RULE-dev-004 son la misma frontera vista desde dos lados — si el comando dice "no lo modifiques, pidelo al team up1", el ticket no lo edita sin declarar `layer: core` y su rama.

## Why

DKC y up1 tenian dos gates gemelos sin acoplar: DET-32 (necesidad/reuso) pregunta lo mismo que `/up1-check` (¿ya existe? ¿lo da el framework? ¿se reduce a config?), pero DKC nunca lo invocaba ni producia el registro de sesion que el hook de up1 exige. Resultado: el trabajo dirigido por DKC podia crear archivos en up1 sin pasar por la puerta del repo — y en los paths que el hook no cubre, sin ninguna senal. Los COMMANDMENTS tenian el mismo problema por otra via: no estaban en `docs.sources` del proyecto, asi que ni intake ni el sub-agente developer los leian.

Correr el comando del repo en vez de re-razonar la cascada tambien evita que las dos puertas divergan: la tabla de busqueda por tipo de artifact vive en `up1-check.md` y se mantiene con el repo, no duplicada en el KB.

## Where

Paths exactos (leer los que existan; los dos clones de up1 tienen sets distintos de COMMANDMENTS segun la rama de cada workspace):

- `.claude/commands/up1-check.md` — el comando y su tabla de busqueda por tipo de artifact
- `.claude/hooks/validate-write.js` — enforcement del registro de sesion (alcance parcial, ver punto 4)
- `.claude/.session/up1-check-passed` — registro de sesion con `approvedPaths`
- `.claude/BRICK-STANDARDS.md` — estandares obligatorios si la decision es `CREATE as brick in mod`
- `CLAUDE.md` (seccion "Regla de Creacion")
- COMMANDMENTS por repo (leer los del `execute_scope`): `.ai/COMMANDMENTS.md` (plataforma), `mods/.ai/COMMANDMENTS.md`, `object-manager/.ai/COMMANDMENTS.md`, `layout/.ai/COMMANDMENTS.md`, `suite/.ai/COMMANDMENTS.md`, `flow/.ai/COMMANDMENTS.md`. Sin COMMANDMENTS hoy: `report-builder/`, `up1-mcp` (repo `uplanner/mcp`).
- `docs/guides/core-mod-boundary-workflow.md` — el proceso de la frontera core/mod

Del lado DKC en `projects/up1/config.yaml`: bloque `creation_gate:` (lo consume el Paso 0d de `prompts/steps/_design-shared.md`) y bloque `commandments:` (mapeo scope → COMMANDMENTS por repo).

## When

- **En design** (Paso 0d, DET-32): correr el comando por requerimiento, antes de bajar los artifacts a tasks, y registrar el veredicto.
- **En intake**, al fijar el `execute_scope`: los repos alcanzados quedan determinados ahi; sus COMMANDMENTS (y esta rule) entran al KB del ticket via `rules[]` / `kb_refs`.
- **En execute**, antes de tocar cada repo del `execute_scope`: leer `platform_always` + el COMMANDMENTS que `commandments.by_scope` mapea a ese prefijo, en la misma pasada por repo destino que la guarda de rama (RULE-dev-004 / DET-30). Antes de la primera task que crea archivos: verificar ademas que el registro de sesion del `creation_gate` cubre los paths de esa task; si no, volver a correr el comando en vez de forzar la escritura o apagar el hook.
- **No aplica** la cascada de creacion a trabajo sin creacion de codigo (docs, analisis, historias) ni a `Edit` de archivos existentes — pero los COMMANDMENTS de cada repo alcanzado aplican siempre, incluido el `Edit`.
