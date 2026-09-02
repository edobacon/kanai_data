---
id: RULE-project-001
project: drunappgor
type: rule
module: project
level: must
tags:
  - drunadoors
  - architecture
  - source-refs
  - pipeline
---

# DrunaDoors solo puede usarse como cantera de datos, no como arquitectura

## What

DrunaDoors puede usarse para recuperar datos, traducciones, casos manuales, overrides y aprendizajes, pero no se debe copiar su arquitectura, estructura de runtime Vue, composables ni patrones de acoplamiento como base de DrunAppGor.

Todo dato recuperado desde DrunaDoors debe pasar por modelos canonicos, `sourceRefs`, estado de completitud/confianza y pipeline de assets generados antes de llegar a la UI Flutter.

Para puertas, DrunaDoors no puede usarse como fuente canonica: sus puertas son 1.0. DrunAppGor debe construir puertas desde `doors_es` version 1.5.

## Why

DrunaDoors fue un intento fallido por falta de orden inicial. Tiene valor como evidencia y fuente auxiliar, pero copiarlo repetiria el problema: datos mezclados con UI, excepciones manuales y ausencia de contrato canonico inicial.

DrunAppGor debe empezar ordenado: meta-specs primero, modelos despues, pipeline reproducible, y recien entonces pantallas Flutter.

## Where

- **Files**:
  - `drunadoors/src/data/**` como fuente auxiliar.
  - `drunappgor/tool/**` para pipeline futuro.
  - `drunappgor/assets/data/generated/**` para outputs normalizados.
  - `drunappgor/lib/src/**` no debe parsear fuentes DrunaDoors crudas.
- **Layers**: data_pipeline, campaign, doors, monsters, assistant, voice_reader, app_shell.

## When

Aplica siempre que una spec o ticket quiera usar informacion de `../drunadoors`, especialmente interacciones, chapter details, monstruos, content inventory u overrides. En puertas, aplica solo para descartar, comparar o usar como referencia no canonica frente a `doors_es` 1.5.

## Verification

- Review de specs: cualquier uso de DrunaDoors debe declararse como fuente con `sourceRefs`.
- Review de specs: cualquier puerta activa debe tener fuente canonica `doors_es` 1.5.
- Review de codigo: no importar/copiar composables Vue ni estructuras de runtime web en Flutter.
- Tests de pipeline: datos provenientes de DrunaDoors quedan normalizados en assets JSON.
- Tests de pipeline: fallan si una puerta canonica usa DrunaDoors como fuente principal.
- UI review: widgets Flutter consumen repositorios/assets canonicos, no archivos fuente DrunaDoors.

## Source

- **Discovered in**: init de `drunappgor`.
- **Evidence**: el dev aclaro que DrunaDoors fue un intento fallido por falta de orden inicial.
- **Related**: DEC-001, METASPEC-data-canonical-model, METASPEC-data-generated-asset, METASPEC-source-reference, METASPEC-campaign-chapter-interaction-content.
