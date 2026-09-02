---
id: METASPEC-data-generated-asset
project: drunappgor
type: doc
module: data_pipeline
tags:
  - data-pipeline
  - assets
  - json
  - reproducible
---

# Generated Data Assets

## Artifact Definition

```yaml
name: generated-asset
plural: Generated Assets
description: "Archivo JSON generado desde fuentes locales versionadas"
location: "assets/data/generated/"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| path | text | si | Ruta final del asset generado |
| sourceRoots | reference: source-reference[] | si | Fuentes locales consumidas |
| generator | text | si | Script o comando que genera el asset |
| schema | reference: canonical-model[] | si | Modelos canonicos incluidos |
| deterministic | enum: true, false | si | Si el output debe ser reproducible byte-a-byte |
| validation | table: check, failure_message | si | Validaciones del asset |
| failureMode | text | si | Como falla cuando cambia una fuente |

## Spec Section Template

```markdown
## Generated Assets

| Path | Sources | Generator | Schema | Validation | Notas |
|------|---------|-----------|--------|------------|-------|
| {path} | {sources} | {command} | {schema} | {checks} | {notas} |
```

## Requirements

### REQ-01: Generated assets are reproducible

- **Aplica cuando**: Siempre.
- **Esperado**: Mismo input produce mismo JSON ordenado y estable.
- **Verificacion**: Ejecutar generator dos veces y comparar diff.

### REQ-02: Every record carries source refs

- **Aplica cuando**: Records derivados de `fullrules_es`, `pdfdata_es`, `doors_es`, `docs` o `drunadoors`.
- **Esperado**: Cada record tiene referencias suficientes para auditar origen.
- **Verificacion**: Test que falla si falta `sourceRefs`.

### REQ-03: Pipeline fails loudly on format drift

- **Aplica cuando**: Una fuente cambia de estructura esperada.
- **Esperado**: Error accionable con path, record afectado y razon.
- **Verificacion**: Fixture de formato invalido.

### REQ-04: No generated output without schema

- **Aplica cuando**: Nuevo asset.
- **Esperado**: Todo asset referencia uno o mas modelos canonicos.
- **Verificacion**: Spec y tests del pipeline.

## Defaults

```yaml
defaults:
  deterministic: true
  output_dir: assets/data/generated/
  failureMode: "fail fast with source path and parser stage"
  source_roots:
    - fullrules_es
    - pdfdata_es
    - doors_es
    - docs
    - drunadoors
```

## Relations

```yaml
relations:
  - artifact: canonical-model
    type: requires
    description: "Un asset generado debe declarar que modelos contiene"
  - artifact: source-reference
    type: requires
    description: "Cada record generado debe conservar trazabilidad"
  - artifact: rag-chat-chunk
    type: suggests
    description: "Assets con texto consultable pueden alimentar el corpus del chat"
```
