---
id: METASPEC-rag-chat-chunk
project: drunappgor
type: doc
module: assistant
tags:
  - chat
  - rag
  - retrieval
  - citations
---

# RAG Chat Chunks

## Artifact Definition

```yaml
name: rag-chat-chunk
plural: Chat Chunks
description: "Unidad consultable del corpus local para el asistente"
location: "assets/data/generated/chat_chunks*.json"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | ID estable del chunk |
| sourceType | enum: rule, chapter, door, interaction, monster, keyword, status, docs | si | Tipo de contenido |
| sourceId | text | si | ID de entidad origen |
| title | text | si | Titulo visible/citable |
| body | text | si | Texto del chunk |
| aliases | table: alias, reason | no | Terminos alternativos para retrieval |
| category | text | no | Categoria tematica |
| sourceRefs | reference: source-reference[] | si | Citas auditables |
| embeddingRef | text | no | Referencia a embedding/cache si existe |
| retrievalTests | table: query, expected_rank, expected_citation | no | Tests de recuperacion |

## Spec Section Template

```markdown
## Chat Chunks

| Source | Chunk strategy | Aliases | Retrieval tests | Notas |
|--------|----------------|---------|-----------------|-------|
| {sourceType} | {strategy} | {aliases} | {tests} | {notas} |
```

## Requirements

### REQ-01: Local corpus first

- **Aplica cuando**: Toda respuesta del chat.
- **Esperado**: Retrieval local se intenta antes de fallback online.
- **Verificacion**: Test de pregunta comun resuelta sin internet.

### REQ-02: Citations come from sourceRefs

- **Aplica cuando**: Chunk se usa en respuesta.
- **Esperado**: La respuesta cita capitulo/regla/puerta desde `sourceRefs`.
- **Verificacion**: Test de respuesta con citation payload.

### REQ-03: Uncertainty is explicit

- **Aplica cuando**: Retrieval no encuentra evidencia suficiente.
- **Esperado**: El asistente marca incertidumbre y no inventa datos faltantes.
- **Verificacion**: Test negativo.

### REQ-04: Official, inference and table suggestion are separated

- **Aplica cuando**: Respuesta combina reglas oficiales e inferencias.
- **Esperado**: La respuesta separa reglas oficiales, inferencias y sugerencias de mesa.
- **Verificacion**: Prompt/test de salida.

### REQ-05: Retrieval tests cover common questions

- **Aplica cuando**: Nuevo corpus/chunk strategy.
- **Esperado**: Hay tests con preguntas frecuentes y expected citations.
- **Verificacion**: Suite de recuperacion.

## Defaults

```yaml
defaults:
  source_priority:
    - fullrules_es
    - pdfdata_es
    - doors_es
    - docs
    - drunadoors
  fallback_online: "disabled unless user/config allows"
  uncertainty_policy: "say what is known, cite sources, state gap"
```

## Relations

```yaml
relations:
  - artifact: generated-asset
    type: requires
    description: "Chunks se generan desde assets o fuentes normalizadas"
  - artifact: source-reference
    type: requires
    description: "Cada chunk necesita citas auditables"
  - artifact: flutter-feature-screen
    type: suggests
    description: "La UI de chat consume chunks y muestra citas"
```
