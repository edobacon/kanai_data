---
id: METASPEC-source-reference
project: drunappgor
type: doc
module: data_pipeline
tags:
  - traceability
  - sources
  - citations
---

# Source References

## Artifact Definition

```yaml
name: source-reference
plural: Source References
description: "Referencia auditable al origen local de un dato o respuesta"
location: "embedded in generated assets, models and chat citations"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| sourceType | enum: fullrules_es, pdfdata_es, doors_es, docs, drunadoors, derived | si | Familia de fuente |
| sourcePath | text | si | Path local relativo o absoluto conocido |
| sourceId | text | no | ID interno cuando exista |
| chapter | text | no | Capitulo/adventure asociado |
| door | text | no | Numero/version de puerta si aplica |
| section | text | no | Seccion, heading o rango semantico |
| confidence | enum: exact, derived, inferred, uncertain | si | Calidad de la referencia |
| note | text | no | Aclaracion breve |

## Spec Section Template

```markdown
## Source References

| Source type | Path | ID/Section | Confidence | Uso |
|-------------|------|------------|------------|-----|
| {type} | {path} | {id} | {confidence} | {uso} |
```

## Requirements

### REQ-01: Local sources first

- **Aplica cuando**: Cualquier dato de reglas, campana, puertas, monstruos, chat o voz.
- **Esperado**: La referencia apunta a una fuente local antes de usar fallback online.
- **Verificacion**: Fixtures y respuestas muestran `sourceRefs`.

### REQ-02: Inference is labelled

- **Aplica cuando**: Un dato se deriva o se infiere.
- **Esperado**: `confidence` no puede ser `exact`; debe ser `derived`, `inferred` o `uncertain`.
- **Verificacion**: Tests de casos derivados.

### REQ-03: Chat citations use source references

- **Aplica cuando**: Respuesta del asistente cita reglas o contenido.
- **Esperado**: Las citas salen de `sourceRefs`, no de texto libre inventado.
- **Verificacion**: Test de respuesta con citas.

### REQ-04: Missing data is traceable

- **Aplica cuando**: Una fuente no tiene stats/imagenes/detalles.
- **Esperado**: Se conserva referencia al lugar revisado y se marca incertidumbre.
- **Verificacion**: Caso de monstruo con `imageStatus: missing` o stats ausentes.

## Defaults

```yaml
defaults:
  confidence: exact
  online_source_policy: "solo fallback autorizado; registrar como note o derived source"
```

## Relations

```yaml
relations:
  - artifact: canonical-model
    type: requires
    description: "Modelos canonicos usan sourceRefs"
  - artifact: generated-asset
    type: requires
    description: "Assets generados deben ser auditables"
  - artifact: rag-chat-chunk
    type: requires
    description: "Chunks y citas del chat dependen de sourceRefs"
```
