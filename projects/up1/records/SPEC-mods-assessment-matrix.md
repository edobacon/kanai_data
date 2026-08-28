---
id: SPEC-mods-assessment-matrix
project: up1
type: doc
module: mods
status: archived
tags:
  - archived
  - assessment
  - competency-matrix
  - level-scheme
  - tree
  - vue-component
---

# Mod assessment-matrix — Editor de matrices de competencias — ARCHIVED

> Esta spec fue archivada. No refleja el estado actual del codigo.
> Motivo: el mod `assessment-matrix` fue eliminado del codebase — era una POC para replicar suite-front assessment en up1.

## Purpose (historico)

Mod autocontenido que permitiria crear y editar matrices de competencias con esquemas de niveles de logro, jerarquia de competencias (arbol), criterios cualitativos, umbrales cuantitativos y workflow completo (Draft→Review→Published). Replicaba la funcionalidad de `suite-front/assessment` (competency-matrix-v2) en la arquitectura up1 usando datos base existentes (Faculty, Career, Curriculum, Course).

## Outcome

La POC nunca llego a done — quedo en `in_progress` con backlog B1 reabierto. Durante la exploracion e implementacion parcial se capturo una cantidad significativa de aprendizajes que se promovieron a rules y bugs (ver abajo). El mod y su codigo fueron eliminados; el ticket TICKET-005 se cierra en el mismo acto de archivado con nota explicita.

## Knowledge preserved

Conocimiento extraido de esta spec antes de archivarse. Estos artefactos son fuente de verdad — esta spec no.

### Rules

| ID | Titulo | Modulo |
|----|--------|--------|
| RULE-mods-011 | Sync constraints para modsComponents e i18n | mods |
| RULE-mods-012 | Custom Vueform elements: defineElement + registro automatico | mods |
| RULE-mods-016 | CSS del mod vive en subcarpetas numeradas (1-theme, 2-objectName, 3-component) | mods |
| RULE-layout-014 | defineElement rompe cadena Vue parents — usar DOM walk para instanceId | layout |
| RULE-layout-015 | Queries list sin hard-limits arbitrarios — usar paginacion con cursor | layout |
| RULE-suite-003 | Nuevos modsComponents requieren restart del dev server | suite |
| RULE-core-011 | Resolvers custom que reciben un ID de entidad deben validar ownership explicita | core |

### Bugs

| ID | Titulo | Status |
|----|--------|--------|
| BUG-layout-001 | RecordList embebido en RecordDetail no hereda traducciones @RecordList | detected |
| BUG-layout-002 | RecordDetail sin mecanismo nativo de titulo/header del registro | detected |
| BUG-layout-003 | RecordList no traduce valores de enum en celdas de tabla | detected |
| BUG-layout-004 | relationDisplayFields con formato incorrecto (array o string en vez de objeto) | detected |
| BUG-mods-006 | Duplicate key ca_matrix_list en lang JSON de assessment-matrix | detected |
| BUG-mods-007 | CSS tokens sin fallback a --up1-* en multiples mods (incluye inline dark-theme en CompetencyTree) | detected |
| BUG-mods-008 | CompetencyTree render O(n²) con template duplicado | detected |

### Decisions

Ninguna decision formal promovida desde esta spec.

### Patterns / Templates / Recipes

- Patron de custom Vueform element via `defineElement` + registro automatico → formalizado en RULE-mods-012 y `specs/mods/llm/recipes/components.md`
- Patron de instanceId via DOM walk (no cadena Vue parents) → RULE-layout-014 y recipes/components.md
- Estructura CSS numerada (1-theme/2-objectName/3-component) → RULE-mods-016 y recipes/css.md
- Paginacion cursor sin hard-limits → RULE-layout-015

## Original tickets

- TICKET-005: Explorar y diseñar app de matrices de competencias basada en suite-front assessment — status al archivarse: closed (con nota de archivado)

## Why archived (detalle)

El mod fue una exploracion profunda que genero 7 rules y 7 bugs — la POC con mas learns promovidos del proyecto. El valor ya se capturo. El mod tenia funcionalidad compleja (tree de competencias, workflow, matriz cualitativa/cuantitativa) que no iba a entrar a produccion en up1 como el mod lo implementaba — la decision fue no mantener codigo POC que podria confundir a devs futuros que busquen un ejemplo de mod complejo.

Backlog B1 (task #13) que motivo el reopen del ticket no llega a ejecutarse — el trabajo se descarta junto al codigo.

Los bugs `BUG-layout-001` a `BUG-layout-004` son limitaciones del layout-engine descubiertas durante la POC — siguen siendo validas y aplicables a cualquier mod que use RecordList embebido o relationDisplayFields. `BUG-mods-006/007/008` son patterns a evitar.

## Do not use this spec for

- Diseñar un mod de assessment/matrices nuevo — los requirements son POC-grade y el flujo Draft→Review→Published es de suite-front, no de up1 production
- Referenciar CompetencyTree como componente — tenia render O(n²) (BUG-mods-008)
- Copiar el patron de duplicate keys en lang JSON — BUG-mods-006
- Buscar patterns de custom Vue component complejo — ir a `specs/mods/llm/recipes/components.md` y `advanced.md` (ADV-* familia tree/matriz)

## See also

- `specs/mods/llm/INDEX.md` — catalogo de recipes
- `specs/mods/llm/recipes/advanced.md` — patterns para funcionalidad compleja (tree, matriz, workflow, version)
- `rules/layout/rule-layout-014.md` y `rule-layout-015.md` — reglas descubiertas aqui
