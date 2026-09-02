---
id: RULE-workflow-archive-superseded-spec-007
project: horadric
type: rule
module: workflow
level: must
tags:
  - archive
  - superseded
  - spec-lifecycle
  - knowledge-preservation
  - reclassification
---

# Archivar spec con `superseded_by` cuando se reclasifica preserva grafo y valor educativo

## What

Cuando un spec necesita ser **reemplazado** por otra version (cambio fundamental de scope, reclassificacion de work_type, cambio arquitectural mayor), aplicar el patron de **archivado con `superseded_by`**:

1. **Crear post-mortem** del spec en `specs/_archive/{SPEC-id}.md` siguiendo `templates/records/spec-archived.md`
2. **Frontmatter del post-mortem**: `status: archived` + `archived_reason: superseded` + `superseded_by: SPEC-id-nuevo`
3. **Mantener el contenido educativo** del spec original como referencia (no es trabajo perdido)
4. **Borrar el spec original** de `specs/` (solo el archivo, no el contenido — vive en `_archive/`)
5. **Crear el nuevo spec** con `supersedes: [SPEC-id-original]` en frontmatter

NO aplicar para:
- Refinamientos menores del spec (Edit normal del archivo)
- Cambios de scope que ENCAJAN dentro del spec actual

SI aplicar para:
- Reclassificacion de work_type (improvement → explore, etc.)
- Cambio arquitectural fundamental (host-specific → cross-host)
- Cambio de modulo o re-foco mayor

## Why

Sin este patron, hay dos patologias:

1. **Sobreescribir spec sin trazabilidad**: el contenido original se pierde. Trabajo de design previo desechado sin posibilidad de re-evaluacion.
2. **Mantener spec stale activo**: el spec con status `draft/in_progress` indica al lector que es fuente de verdad, pero su contenido ya no aplica. Confusion + decisions basadas en info obsoleta.

Caso de referencia HOR-051 (closed 2026-05-16): spec v1 `SPEC-workflow-hooks-claude-code-51` (Claude-Code-specific) fue archivado con `superseded_by: SPEC-workflow-directive-enforcement-a-cross-host-51` cuando el dev pidio expandir a cross-host. El archivo del v1 NO fue trabajo perdido — quedo como referencia para "evaluacion del approach A.1 Claude Code hooks" en la decision matrix del v2. **El contenido educativo se preserva, el status arquitectural queda explicit**.

Patron analogo en otras industrias: ADRs (Architecture Decision Records) con `superseded by` (Michael Nygard 2011). DKC adopta el patron a nivel de spec.

## Where

Aplica a:

- **`projects/{project}/specs/_archive/`**: destino de specs archivados
- **`projects/{project}/specs/`**: source del spec a archivar
- **Frontmatter del spec nuevo**: campo `supersedes: [SPEC-id]`
- **Step ejecutor**: `prompts/steps/archive-spec.md`

- **Files**: spec a archivar + spec nuevo + index `_archive/INDEX.md` si existe
- **Layers**: meta (workflow), filesystem (move + frontmatter update)

## When

Aplicar **siempre** que:

1. Un spec se reclasifica (work_type change, ej HOR-051 improvement → explore)
2. Un spec cambia foco arquitectural fundamental (ej HOR-051 Claude-specific → cross-host)
3. Un spec es reemplazado por otro que cubre el mismo dominio con approach distinto

NO aplicar para:
- Edits incrementales del spec (refinamiento de scope, ajustes de tasks, etc.)
- Specs que pasan a `status: done` o `status: closed` (no requieren archivado especial — es lifecycle normal)

## Verification

- **Filesystem check**: spec movido a `_archive/{SPEC-id}.md`, archivo original en `specs/` no existe
- **Frontmatter check**: spec archivado tiene `status: archived` + `archived_reason: superseded` + `superseded_by: SPEC-id-nuevo`
- **Spec nuevo check**: frontmatter tiene `supersedes: [SPEC-id-archivado]`
- **Grep verification**: `find_by_reference(SPEC-id-archivado)` retorna referencias preservadas en otros artefactos (rules, bugs, decisions citan el ID archivado sin romper)
- **HC viewer**: el spec archivado aparece en tab "Archive" con link al successor

Step ejecutor: `prompts/steps/archive-spec.md` automatiza todo. Invocar via `/dkc-archive-spec {SPEC-id} "razon"`.

## Source

- **Discovered in**: HOR-051 (closed 2026-05-16), tras reclassificacion de improvement → explore cross-host
- **Evidence**:
  - `specs/_archive/SPEC-workflow-hooks-claude-code-51.md` archivado el mismo dia de su creacion (2026-05-16)
  - `specs/SPEC-workflow-directive-enforcement-a-cross-host-51.md` con `supersedes: [SPEC-workflow-hooks-claude-code-51]`
  - Lessons learned en `tickets/HOR-051.teach/teach-close.md` (item 2): "Spec v1 archivado preserva valor"
- **Related**: `prompts/steps/archive-spec.md` (step ejecutor), `templates/records/spec-archived.md` (template), RULE-workflow-catalog-executor-pattern-005 (patron arquitectural que motivo la reclassificacion)
