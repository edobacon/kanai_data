---
id: SPEC-mods-curriculum-mapping
project: up1
module: mods
status: archived
archived_date: '2026-04-17'
archived_reason: codigo_eliminado
superseded_by: null
ticket: TICKET-002
promoted_to: [RULE-core-009, RULE-layout-013, RULE-mods-008, BUG-mods-003, BUG-mods-004, BUG-mods-005, BUG-layout-004, BUG-mods-007]
original_status: done
created: '2026-04-16'
updated: '2026-04-17'
tags: [archived, poc, curriculum-mapping, learning-assurance, heatmap, tabs]
---

# Mod curriculum-mapping — POC con tabs y vista custom — ARCHIVED

> Esta spec fue archivada. No refleja el estado actual del codigo.
> Motivo: el mod `curriculum-mapping` fue eliminado del codebase — era una POC para validar tabs y vista custom.

## Purpose (historico)

Implementar el mod `curriculum-mapping` como POC end-to-end que demostrara al equipo de producto que uP1 puede soportar el dominio de Learning Assurance. Ejercitaba tabs en RecordDetail, un custom component visual (heatmap de tributacion curso x competencia) y el pipeline completo de mods.

## Outcome

La POC se implemento end-to-end y cumplio su proposito demostrativo. Los aprendizajes criticos (Prisma per-tenant sin campo tenantId, defineElement no propaga inject, seeds con connect+relation lowercase) se promovieron a rules reusables. Los bugs descubiertos se mantuvieron como patterns a evitar. El mod fue eliminado del codebase una vez extraido el conocimiento — la spec dejo de describir codigo existente.

## Knowledge preserved

Conocimiento extraido de esta spec antes de archivarse. Estos artefactos son fuente de verdad — esta spec no.

### Rules

| ID | Titulo | Modulo |
|----|--------|--------|
| RULE-core-009 | Prisma client per-tenant no tiene campo tenantId — no filtrar ni insertar tenantId | core |
| RULE-layout-013 | inject() no funciona en defineElement() de Vueform — usar getCurrentInstance() | layout |
| RULE-mods-008 | Seeds usan connect con relacion lowercase para FK, no campo directo | mods |

### Bugs

| ID | Titulo | Status |
|----|--------|--------|
| BUG-mods-003 | Layouts de curriculum-mapping no siguen naming convention default_ObjectName_mode | detected |
| BUG-mods-004 | TributationHeatmapElement usa patron obsoleto de instanceId (getCurrentInstance().parent) | detected |
| BUG-mods-005 | curriculum-mapping sin carpeta lang — i18n completamente ausente | detected |
| BUG-layout-004 | relationDisplayFields con formato incorrecto (array o string en vez de objeto) | detected |
| BUG-mods-007 | CSS tokens sin fallback a --up1-* en multiples mods (incluye inline dark-theme en CompetencyTree) | detected |

### Decisions

Ninguna decision formal promovida desde esta spec.

### Patterns / Templates / Recipes

El patron de custom component con visual (heatmap) quedo documentado via las rules de layout. El uso de tabs en RecordDetail se documento en `specs/mods/llm/recipes/layouts.md` (familia LAY-*). Los aprendizajes sobre `defineElement` viven en `specs/mods/llm/recipes/components.md` (VUE-*).

## Original tickets

- TICKET-002: Crear mod curriculum-mapping como POC con tabs y vista custom — status al archivarse: closed

## Why archived (detalle)

La POC valido que uP1 puede implementar Learning Assurance. Ese valor ya se capturo en las rules y recipes. El codigo del mod no tenia consumidores — mantenerlo implicaba mantener un mod sintetico que ensucia busquedas y puede confundir a devs que lo tomen como ejemplo con patterns inconsistentes (los bugs detectados nunca se arreglaron porque el mod no iba a produccion).

Los bugs `BUG-mods-003`, `BUG-mods-004`, `BUG-mods-005`, `BUG-layout-004`, `BUG-mods-007` se mantienen en `status: detected` porque son patterns a evitar en mods futuros — su valor es preventivo, no de correccion puntual.

## Do not use this spec for

- Diseñar un mod nuevo de Learning Assurance — los requirements son POC-grade, no production-ready
- Copiar layouts de curriculum-mapping — tenian naming inconsistente (BUG-mods-003)
- Referenciar el componente TributationHeatmap — usaba pattern obsoleto (BUG-mods-004)
- Buscar recipes de tabs o heatmap — ir a `specs/mods/llm/recipes/layouts.md` y `components.md`

## See also

- `specs/mods/llm/INDEX.md` — catalogo de recipes para mods nuevos
- `specs/learning-assurance/` — si existe documentacion de dominio LA vigente
