---
id: METASPEC-campaign-chapter-interaction-content
project: drunappgor
type: doc
module: campaign
tags:
  - campaign
  - chapters
  - interactions
  - setup
  - rewards
  - source-refs
---

# Campaign Chapter and Interaction Content

## Artifact Definition

```yaml
name: campaign-chapter-interaction-content
plural: Campaign Content
description: "Modelo de capitulos, secciones narrativas, setups, eventos e interacciones del Adventure Book"
location: "assets/data/generated/campaign*.json, assets/data/generated/interactions*.json, lib/src/features/campaign/"
```

Este meta-spec gobierna la informacion de capitulos e interacciones que viene de:

- `pdfdata_es/*.md`: narrativa, reglas, mecanicas especiales, setups, eventos, interacciones y recompensas.
- `pdfdata_es/adv*/capitulos.md`: capitulos de expansiones en archivos compuestos.
- `drunadoors/src/data/chapters.ts`: metadata resumida de capitulos.
- `drunadoors/src/data/chapter-details/*.ts`: secciones estructuradas, setup inicial, monstruos y rewards donde exista.
- `drunadoors/src/data/interactions*.ts`: interacciones estructuradas, opciones, decisiones e incompletos.
- `docs/09-data-extraction-guide.md`: reglas de extraccion completa y marcado de completitud.
- `docs/10-campaign-log-character-sheet.md`: semantica de Status, Outcome, Aura y mutaciones del Campaign Log.

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| campaignId | text | si | Campana/adventure propietaria (`aod`, `adv1`, `adv2`) |
| adventureId | text | si | Adventure concreta dentro de la campana |
| chapterId | text | si | ID estable del capitulo, incluyendo interludios/condicionales |
| chapterNumber | text | si | Numero visible (`01`, `03.1`, `I01`) |
| title | text | si | Titulo canonico |
| title_es | text | si | Titulo traducido |
| pages | text | no | Rango de paginas o pagina origen |
| chapterMetadata | table: difficulty, phase, doors, darkness, recallPenalty, runesPreloaded, equipmentLevel, rankRange | no | Metadata resumida del capitulo |
| sections | table: id, type, title, text, voiceReadable, sourceRefs | si | Bloques narrativos/mecanicos del capitulo |
| firstSetup | reference: chapter-setup | no | Setup inicial estructurado |
| interactions | reference: interaction[] | no | Interacciones asociadas a capitulo/setup/puerta/evento |
| rewards | reference: campaign-effect[] | no | Status, Outcomes, Auras, items, companions o focus detectados |
| sourceRefs | reference: source-reference[] | si | Trazabilidad a PDF/Markdown/DrunaDoors |
| completeness | enum: verified, partial, incomplete, ocr_suspect, inferred | si | Estado de confianza del contenido |

## Spec Section Template

```markdown
## Campaign Content

| Chapter | Source | Sections | Setups | Interactions | Completeness | Notas |
|---------|--------|----------|--------|--------------|--------------|-------|
| {chapterId} | {sourceRefs} | {section_count} | {setup_count} | {interaction_count} | {completeness} | {notas} |
```

### Chapter: {chapterId}

| Field | Value |
|-------|-------|
| Title | {title_es} |
| Pages | {pages} |
| Difficulty | {difficulty} |
| Darkness | {darkness} |
| Recall penalty | {recallPenalty} |
| Equipment level | {equipmentLevel} |

### Sections

| ID | Type | Title | Voice | Source | Completeness |
|----|------|-------|-------|--------|--------------|
| {sectionId} | narrative/rules/setup/event/ending/reward | {title} | yes/no | {sourceRef} | {status} |

### Interactions

| ID | Title | Decision | Options | Has setup | Effects | Completeness |
|----|-------|----------|---------|-----------|---------|--------------|
| {interactionId} | {title_es} | yes/no | {N} | yes/no | {summary} | {status} |

## Sub-Artifacts

### Chapter Section

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | ID estable `{chapterId}-section-{seq}` |
| type | enum: narrative, rules, setup, event, ending, reward, note | si | Tipo de bloque |
| title | text | si | Titulo del bloque |
| text | text | si | Texto completo en idioma fuente si existe |
| text_es | text | si | Texto completo traducido |
| voiceReadable | enum: true, false | si | Si debe exponerse al voice reader |
| chatChunkable | enum: true, false | si | Si alimenta el corpus RAG |
| sourceRefs | reference: source-reference[] | si | Fuente exacta |

### Chapter Setup

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | ID estable del setup |
| trigger | enum: first_setup, event, interaction, door | si | Que lo activa |
| trayLevel | text | no | Tray principal si existe |
| tiles | table: tray, tile, face | no | Tiles estructurados |
| tableSpace | text | no | Espacio de mesa si aparece |
| setupImage | text | no | Imagen si existe; null explicito si falta |
| monsters | table: slot, threshold, color, name, rank, count, source | no | Monstruos base/escalados |
| tokens | table: type, count, location, pageRef | no | Interaction, Chest, Rune, NPC, etc. |
| doorRefs | reference: door[] | no | Puertas asociadas |
| specialRules | table: title, text, sourceRefs | no | Reglas especiales del setup |
| completeness | enum: verified, partial, incomplete, ocr_suspect, inferred | si | Confianza |

### Interaction

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | Numero visible con padding (`INT-006-082`) o equivalente estable |
| number | integer | si | Numero oficial de la interaccion |
| title | text | si | Titulo original |
| title_es | text | si | Titulo traducido |
| chapterId | reference: chapter | si | Capitulo asociado |
| page | text | no | Pagina del Adventure Book |
| context | enum: chapter, setup, door, event, ending, unknown | si | Donde se dispara |
| intro | text | si | Intro completa; no resumir |
| intro_es | text | si | Intro traducida completa |
| isDecision | enum: true, false | si | Si el grupo elige entre opciones |
| options | table: id, label, text, branches, effects, hasSetup | si | Opciones/resoluciones |
| crossRefs | table: targetType, targetId, condition | no | Saltos a otras interacciones, puertas o endings |
| effects | reference: campaign-effect[] | no | Efectos mecanicos detectados |
| sourceRefs | reference: source-reference[] | si | Fuente exacta |
| completeness | enum: verified, partial, incomplete, ocr_suspect, inferred | si | Confianza |

### Interaction Option

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | ID estable de opcion (`82-a`, `86-b`) |
| label | text | si | Label original |
| label_es | text | si | Label traducida |
| text | text | si | Texto completo, con condiciones y SUCCESS/FAILURE |
| text_es | text | si | Texto traducido completo |
| hasSetup | enum: true, false | si | Si agrega setup |
| branches | table: condition, targetInteraction, textScope | no | Condicionales o saltos |
| skillChallenge | table: attribute, color, difficulty, bonusRule, autoSuccessPath, successText, failureText | no | Skill challenge estructurado |
| effects | reference: campaign-effect[] | no | Recompensas, estados, damage, focus, tokens |

### Campaign Effect

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| effectType | enum: focus, status, aura, outcome, item, companion, token, monster, damage, condition, campaign_log, remove_token, read_entry, setup | si | Tipo de efecto |
| name | text | no | Nombre exacto si aplica |
| amount | text | no | Cantidad (`FOCUS 2`, `BURN 4`, etc.) |
| duration | enum: instant, next_camp_phase, until_trauma_or_new_aura, campaign_until_changed, encounter | no | Duracion semantica |
| target | text | no | Party Leader, Hero, all Heroes, token, board, etc. |
| text | text | si | Texto mecanico completo |
| sourceRefs | reference: source-reference[] | si | Fuente exacta |

## Requirements

### REQ-01: Transcribe complete text

- **Aplica cuando**: Se extrae narrativa, reglas, eventos, intro de interaccion u opcion.
- **Esperado**: El texto completo se conserva; no resumir ni parafrasear el contenido canonico.
- **Verificacion**: Comparar muestra contra `pdfdata_es`/fuente original. Cada condicion, numero y duracion debe estar presente.

### REQ-02: Source refs are mandatory and precise

- **Aplica cuando**: Todo chapter, section, setup, interaction, option y effect.
- **Esperado**: Incluir `sourceRefs` con `sourceType`, `sourcePath`, `section/page` y `confidence`.
- **Verificacion**: Test del asset falla si falta trazabilidad.

### REQ-03: Completeness must be explicit

- **Aplica cuando**: Cualquier contenido importado desde OCR, TS legacy o fuente parcial.
- **Esperado**: Usar `verified`, `partial`, `incomplete`, `ocr_suspect` o `inferred`. Si `incomplete: true` existe en DrunaDoors, mapear a `incomplete` u `ocr_suspect`.
- **Verificacion**: Ningun record queda con confianza implícita.

### REQ-04: Interactions preserve branches and cross references

- **Aplica cuando**: Texto contiene "proceed to Interaction #N", "read Interaction #N", "End of the Adventure", "If any Hero has...".
- **Esperado**: Capturar `crossRefs`/`branches` ademas del texto completo.
- **Verificacion**: Tests detectan referencias `#NN` y endings.

### REQ-05: Skill challenges are structured

- **Aplica cuando**: Opcion contiene Skill Challenge.
- **Esperado**: Capturar atributo/color, dificultad, bonus por cubos, path de auto-exito, SUCCESS y FAILURE.
- **Verificacion**: Parser/test extrae esos campos sin perder texto completo.

### REQ-06: Campaign Log effects are semantic

- **Aplica cuando**: Texto otorga Status, Aura, Outcome, item, companion o muta Campaign Log.
- **Esperado**: Crear `campaign-effect` con duracion correcta:
  - Status: `next_camp_phase`
  - Aura: `until_trauma_or_new_aura`
  - Outcome: `campaign_until_changed`
- **Verificacion**: Tests de extracción y reglas de `docs/10-campaign-log-character-sheet.md`.

### REQ-07: Setups from interactions are first-class records

- **Aplica cuando**: Opcion dice "Add the following Setup", coloca tiles/tokens/monsters, reemplaza token por NPC/Commander, o marca `hasSetup`.
- **Esperado**: Crear/ligar `chapter-setup` con trigger `interaction`; si falta detalle, marcar `completeness: partial`.
- **Verificacion**: `hasSetup=true` nunca queda sin setup link o backlog de completitud.

### REQ-08: Voice and chat eligibility are marked

- **Aplica cuando**: Seccion/interaccion tiene texto narrativo o reglas consultables.
- **Esperado**: `voiceReadable` y `chatChunkable` definidos explicitamente.
- **Verificacion**: Assets de voice/chat pueden generarse sin heuristicas ad hoc.

### REQ-09: Expansion chapter numbering supports decimals and interludes

- **Aplica cuando**: `adv1`, `adv2`, interludios o finales condicionales.
- **Esperado**: `chapterNumber` acepta `03.1`, `I01`, y capitulos condicionales; `chapterId` estable no depende solo de integer.
- **Verificacion**: Fixtures de `pdfdata_es/adv*/capitulos.md` e interludios.

### REQ-10: Official and derived data are not conflated

- **Aplica cuando**: Se mezcla `pdfdata_es` con `drunadoors` estructurado o inferencias.
- **Esperado**: Fuente oficial/transcrita conserva `confidence: exact/verified`; datos reconstruidos usan `derived`, `inferred`, `partial` u `ocr_suspect`.
- **Verificacion**: Source refs y completeness muestran origen/confianza.

## Defaults

```yaml
defaults:
  language_primary: es
  supported_campaigns:
    - aod
    - adv1
    - adv2
  section_types:
    - narrative
    - rules
    - setup
    - event
    - ending
    - reward
    - note
  interaction_context: unknown
  completeness: partial
  voiceReadable:
    narrative: true
    event: true
    ending: true
    reward: true
    rules: true
    setup: false
  chatChunkable:
    narrative: true
    rules: true
    setup: true
    event: true
    ending: true
    reward: true
```

## Relations

```yaml
relations:
  - artifact: canonical-model
    type: requires
    description: "Chapter, Interaction, Setup y CampaignEffect son modelos canonicos"
  - artifact: source-reference
    type: requires
    description: "Todo contenido debe ser auditable contra pdfdata_es o DrunaDoors"
  - artifact: generated-asset
    type: generates
    description: "El pipeline genera campaign/interactions JSON desde estas fuentes"
  - artifact: flutter-feature-screen
    type: suggests
    description: "Exploradores de campana/interacciones consumen este modelo"
  - artifact: rag-chat-chunk
    type: suggests
    description: "Secciones e interacciones alimentan chunks del asistente"
  - artifact: voice-readable-content
    type: suggests
    description: "Narrativa, eventos, endings y reglas pueden leerse por voz"
```
