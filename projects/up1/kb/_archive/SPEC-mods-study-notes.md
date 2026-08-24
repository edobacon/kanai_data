---
id: SPEC-mods-study-notes
project: up1
module: mods
status: archived
archived_date: '2026-04-17'
archived_reason: codigo_eliminado
superseded_by: null
ticket: TICKET-001
promoted_to: [RULE-mods-013, BUG-mods-001, BUG-mods-002, BUG-mods-007]
original_status: done
created: '2026-04-15'
updated: '2026-04-17'
tags: [archived, poc, study-notes, pipeline-validation]
---

# Mod study-notes — POC pipeline end-to-end — ARCHIVED

> Esta spec fue archivada. No refleja el estado actual del codigo.
> Motivo: el mod `study-notes` fue eliminado del codebase — era una POC para validar el pipeline.

## Purpose (historico)

Crear un mod minimal (`study-notes`) que ejercitara todas las carpetas y mecanismos del pipeline de mods de uP1 (objeto, resolver, componente, layouts, capabilities, i18n, css, seeds, tests). Objetivo: validar que el pipeline funciona de inicio a fin, no entregar valor funcional.

## Outcome

El mod se implemento end-to-end, paso validacion visual y cumplio el proposito de POC. Una vez que los aprendizajes se promovieron a rules y bugs reusables, el mod fue eliminado del codebase. La spec dejo de reflejar codigo existente.

## Knowledge preserved

Conocimiento extraido de esta spec antes de archivarse. Estos artefactos son fuente de verdad — esta spec no.

### Rules

| ID | Titulo | Modulo |
|----|--------|--------|
| RULE-mods-013 | Dependencies de runtime peer van en peerDependencies, no en dependencies | mods |

### Bugs

| ID | Titulo | Status |
|----|--------|--------|
| BUG-mods-001 | Tenant isolation roto en study-notes: resolver y seed sin filtro por tenant | detected |
| BUG-mods-002 | applicationId hardcodeado en default_StudyNote_list viola RULE-mods-009 | detected |
| BUG-mods-007 | CSS tokens sin fallback a --up1-* en multiples mods (incluye inline dark-theme en CompetencyTree) | detected |

### Decisions

Ninguna decision formal promovida desde esta spec.

### Patterns / Templates / Recipes

El pipeline validado con esta POC quedo documentado en `specs/mods/llm/recipes/` (mod-setup, objects, resolvers, layouts, components, i18n, css, seeds, testing). La POC confirmo que el arbol de recetas es ejecutable end-to-end.

## Original tickets

- TICKET-001: Crear mod study-notes end-to-end como POC del pipeline — status al archivarse: closed

## Why archived (detalle)

La POC cumplio su proposito. No hay valor funcional en mantener `mods/study-notes/` en el codebase — es un mod sintetico cuyo unico objetivo era ejercitar el pipeline. Al eliminarlo, la spec quedo describiendo codigo inexistente. Los aprendizajes reales viven en las rules y bugs listados arriba, y en las recipes de `specs/mods/llm/`.

Los bugs `BUG-mods-001`, `BUG-mods-002` y `BUG-mods-007` permanecen en `status: detected` porque fueron descubiertos durante la POC pero no aplicaban solo a study-notes — son patterns a evitar en mods futuros.

## Do not use this spec for

- Diseñar un mod nuevo similar — ir a `specs/mods/llm/INDEX.md` y sus recipes
- Buscar patterns de CRUD/resolver/layout — ir a las recipes
- Buscar reglas del pipeline — ir a rules/mods/ y rules/layout/

## See also

- `specs/mods/llm/INDEX.md` — catalogo de recipes para mods nuevos
- `specs/mods/creation-guide.md` — guia oficial de creacion
