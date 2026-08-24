# Inventario fuente DKC y plan global de migración a Kanai
 
> Fuente: repositorio DKC en commit e15fa24377cf1a0768cc10ad567c110b3ac2042e; worktree sucio: sí. Este documento describe la migración desde DKC, no desde el snapshot ya importado en Kanai. No ejecuta limpieza.
 
## Alcance real
 
DKC contiene 7 espacios con datos y 523 tickets canónicos. El proyecto deckard aporta reglas globales y no tickets de producto. La migración debe congelar una revisión limpia antes de escribir en Kanai.
 
| Proyecto | Config | Tickets canónicos | Sidecars ticket | Specs | Rules | Bugs | Decisions | KB | Archivos totales |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bayley | sí | 40 | 0 | 37 | 6 | 0 | 0 | 0 | 95 |
| deckard | no | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| drunappgor | sí | 29 | 0 | 2 | 4 | 0 | 3 | 0 | 51 |
| horadric | sí | 130 | 1 | 91 | 46 | 10 | 7 | 0 | 476 |
| jormat-evolution | sí | 156 | 0 | 105 | 39 | 2 | 19 | 0 | 420 |
| pehuen | sí | 31 | 0 | 19 | 45 | 1 | 22 | 0 | 160 |
| up1 | sí | 137 | 2 | 109 | 304 | 105 | 83 | 439 | 1686 |
 
## Artefactos y destino
 
| DKC | Kanai | Instrucción |
| --- | --- | --- |
| config.yaml | projects + project_repos | Importar identidad; convertir paths locales a mapping; conservar origin separado. |
| ticket Markdown | tickets | Conservar ID/body/external; mapear frontmatter y registrar estado legacy. |
| sessions/tasks inline | sessions + tasks | Parsear antes de insertar; prohibir tasks huérfanas. |
| learns/discoveries inline | learns | Conservar orden, status y source_ref; no promover automáticamente. |
| specs/reqs/drafts | specs + reqs + drafts | Permitir ticket nullable para specs huérfanos. |
| rules/bugs/decisions/transcripts | records | Tipar por type/module/tags/source_ref y validar enums. |
| meta-specs | records/metadata | Conservar definición de artefactos y versión. |
| teachings/drafts/screenshots/evidence/assets | teachings + drafts + assets | Conservar formato, path, MIME y hash. |
| KB/docs/references/code_refs/skills/templates | árbol de proyecto + docs | Clasificar por semántica, no solo extensión. |
| index.db, WAL, embeddings.sqlite | regeneración local | Derivados; no migrarlos como DB operativa. |
 
## Secuencia
 
1. Congelar DKC en un commit conocido y registrar branch/estado.
2. Calcular manifiesto SHA-256 de todos los archivos incluidos.
3. Separar tickets canónicos de sidecars y derivados.
4. Parsear frontmatter/body conservando el request original.
5. Mapear relaciones a specs, reqs, sessions, tasks, learns, tests, records, teachings y assets.
6. Validar Zod, FK, unicidad, enums y round-trip.
7. Poner ambiguos en cuarentena con motivo y estrategia.
8. Ejecutar dry-run y smoke; solo después importar por proyecto.
 
## Conversión de estados
 
Kanai acepta open, in_progress, ready_to_close, closed y blocked.
- Estados Kanai válidos: mapeo directo.
- design-feature/design-fix/design-refactor: destino provisional open; conservar legacy_status y exigir revisión.
- design-transition-to-execute: open; usar in_progress solo con evidencia de ejecución activa.
- archived/obsolete: closed solo tras confirmar semántica terminal; si no, cuarentena.
- Ausente/desconocido: cuarentena; nunca default silencioso.
 
## Casos borde detectados
 
- up1 mezcla tickets legacy en minúsculas (ticket-001.md) con tickets modernos (TICKET-###.md); no fusionar por casing sin evidencia.
- Sidecars como HOR-055.notes.md, TICKET-088.smoke.md y teach-ticket-001.md no son tickets automáticos.
- External repetido: identidad primaria project_id + ticket.id.
- Carpetas .draft, .teach, .screenshots, .evidence, .spike, .inventories requieren clasificación propia.
- Rules/bugs anidados por módulo conservan el módulo.
- Paths absolutos de config.yaml se convierten en mapping local.
- Índices y WAL se regeneran.
 
## Gate de limpieza de up1
 
No limpiar hasta tener migrador reproducible, dry-run, manifiesto, cuarentena, equivalencia de conteos, smoke por proyecto y rollback probado. DKC no se modifica durante la operación.
 
