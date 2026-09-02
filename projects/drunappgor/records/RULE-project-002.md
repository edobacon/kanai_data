---
id: RULE-project-002
project: drunappgor
type: rule
module: project
level: must
tags:
  - ids
  - source-refs
  - canonical-data
  - deep-links
  - rag
---

# Todo dato canonico debe tener ID estable, sourceRefs y confidence

## What

Todo record canonico generado para DrunAppGor debe tener:

- ID estable y deterministico.
- `sourceRefs` suficientes para auditar su origen.
- `confidence` o `completeness` explicito.

Los IDs deben ser estables entre ejecuciones del pipeline para soportar deep links, cache local, busqueda, RAG, voz, favoritos y referencias cruzadas.

## Why

Sin IDs estables y trazabilidad, los tickets de datos se vuelven fragiles: una puerta, interaccion o capitulo puede cambiar de path o forma sin que la UI, el chat o los tests sepan que paso. Ademas, DrunaDoors ya demostro que empezar sin contratos claros produce desorden dificil de corregir.

## Where

- **Files**:
  - `assets/data/generated/**`
  - `tool/**`
  - `lib/src/data/models/**`
  - specs que usen `METASPEC-data-canonical-model`, `METASPEC-source-reference`, `METASPEC-campaign-chapter-interaction-content`, `METASPEC-rag-chat-chunk`.
- **Layers**: data_pipeline, campaign, doors, rules, monsters, assistant, voice_reader, app_shell.

## When

Aplica siempre que se cree o modifique un asset/modelo de campaña, capítulos, puertas, interacciones, reglas, keywords, estados, monstruos, productos, chunks de chat o contenido leíble por voz.

## ID conventions

| Entidad | Formato |
|---------|---------|
| Campaign | `aod`, `adv1`, `adv2` |
| Adventure | `{campaign}-main`, `{campaign}-{slug}` |
| Chapter | `{campaign}-ch{NN}`, `{campaign}-ch{NN}-{decimal}`, `{campaign}-interlude-{NN}` |
| Chapter section | `{chapterId}-section-{seq}` |
| Setup | `{chapterId}-setup-initial`, `{chapterId}-setup-event-{seq}`, `{interactionId}-setup` |
| Interaction | `{campaign}-int-{NNN}` o `{chapterId}-int-{NNN}` si hay colision |
| Interaction option | `{interactionId}-{letter}` |
| Door | `{campaign}-ch{NN}-door-{DD}-v1-5` |
| Rule entry | `rule-{slug}` o ID derivado de heading/path |
| Keyword | `keyword-{slug}` |
| Status/Aura/Outcome definition | `{kind}-{slug}` |
| Monster | `monster-{slug}` |
| Product | `product-{slug}` |
| Chat chunk | `chunk-{sourceId}-{seq}` |
| Source ref | `src-{sourceType}-{hash-or-stable-path}` |

## SourceRef minimum fields

| Field | Requerido | Nota |
|-------|-----------|------|
| `sourceType` | si | `fullrules_es`, `pdfdata_es`, `doors_es`, `docs`, `drunadoors`, `refs`, `online` |
| `sourcePath` | si | Path local o URL si fallback online autorizado |
| `section` | no | Heading, page, chapter, door, interaction o rango semantico |
| `sourceId` | no | ID interno si existe |
| `confidence` | si | Vocabulario de DEC-002 |
| `note` | no | Aclaracion corta |

## Verification

- Tests de pipeline fallan si falta `id`, `sourceRefs` o `confidence`.
- Re-ejecutar generador dos veces no cambia IDs para los mismos records.
- Review de specs verifica que los formatos de ID se declaren antes de implementar.
- Chat/voz/UI consumen IDs canonicos, no rutas crudas ni indices de array.

## Source

- **Discovered in**: init de `drunappgor`.
- **Evidence**: necesidad de deep links, RAG, voz, cache local y trazabilidad; DrunaDoors fue fallido por falta de orden inicial.
- **Related**: DEC-001, DEC-002, METASPEC-source-reference, METASPEC-data-canonical-model, METASPEC-campaign-chapter-interaction-content.
