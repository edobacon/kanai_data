---
id: METASPEC-data-canonical-model
project: drunappgor
type: doc
module: data_pipeline
tags:
  - data-model
  - dart
  - json
  - source-refs
---

# Canonical Data Models

## Artifact Definition

```yaml
name: canonical-model
plural: Canonical Models
description: "Entidad Dart/JSON que representa datos del corpus local de Drunagor"
location: "lib/src/data/models/ y assets/data/generated/"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| name | text | si | Nombre PascalCase del modelo Dart |
| purpose | text | si | Que representa en la app y en mesa |
| fields | table: name, type, required, default, description | si | Campos canonicos del modelo |
| sourceRefs | reference: source-reference[] | si | Trazabilidad hacia archivos/secciones origen |
| serialization | enum: json_serializable, freezed_json, manual | si | Estrategia de serializacion |
| imageStatus | enum: available, missing, partial, not_applicable | no | Estado de imagenes asociadas si aplica |
| missingDataPolicy | text | no | Que hacer si una fuente local no trae el dato |

## Spec Section Template

```markdown
## Canonical Models

| Model | Purpose | Fields clave | Source refs | Notas |
|-------|---------|--------------|-------------|-------|
| {name} | {purpose} | {fields} | {sourceRefs} | {notas} |
```

### Model: {name}

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| {field} | {type} | yes/no | {default} | {description} |

## Requirements

### REQ-01: Source references are mandatory

- **Aplica cuando**: Siempre que un modelo represente contenido derivado de reglas, aventuras, puertas o DrunaDoors.
- **Esperado**: El modelo incluye `sourceRefs` o una relacion equivalente hacia `METASPEC-source-reference`.
- **Verificacion**: Revisar schema/modelo y fixture generado.

### REQ-02: Missing images are explicit

- **Aplica cuando**: El modelo puede tener imagenes.
- **Esperado**: Usar `imageStatus: missing | partial | available | not_applicable`; no usar null ambiguo.
- **Verificacion**: Tests de serializacion con caso `missing`.

### REQ-03: No runtime parsing as source of truth

- **Aplica cuando**: Datos de corpus local.
- **Esperado**: La app consume assets normalizados; el parsing de Markdown/TS/JSON fuente ocurre en pipeline.
- **Verificacion**: No hay parsing ad hoc de fuentes crudas en widgets/repositorios.

### REQ-04: JSON roundtrip

- **Aplica cuando**: Todo modelo canonico.
- **Esperado**: `fromJson`/`toJson` preserva campos obligatorios y opcionales.
- **Verificacion**: Test unitario de roundtrip por modelo.

## Defaults

```yaml
defaults:
  serialization: json_serializable
  imageStatus: not_applicable
  missingDataPolicy: "preservar sourceRefs, marcar incertidumbre y no inventar datos"
  base_models:
    - Product
    - Campaign
    - Adventure
    - Chapter
    - Door
    - Monster
    - RuleEntry
    - Keyword
    - Status
    - ChatChunk
```

## Relations

```yaml
relations:
  - artifact: source-reference
    type: requires
    description: "Todo modelo derivado debe conservar trazabilidad a fuentes locales"
  - artifact: generated-asset
    type: generates
    description: "Los modelos se materializan en assets JSON reproducibles"
  - artifact: rag-chat-chunk
    type: suggests
    description: "Modelos con texto largo pueden generar chunks de chat"
```
