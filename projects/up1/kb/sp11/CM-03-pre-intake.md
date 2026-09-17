---
id: DOC-kb-sp11-CM-03-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-03
---

# CM-03 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-03. Material human-read, no va a Jira. Contrato en [CM-03-detalle](CM-03-niveles-desarrollo).

## Enfoque
Tres tools en `mods/curriculum-mapping/ai/`, mismo patrón que CM-02:
- `cm_upsert_development_level`: por `registerExtra` (upsert busca-luego-crea). Payload = header de la escala (name, code, description, position, ownerType, ownerId, isActive) + array `levels` (name, code, description, position). Si viene `id`, edita y reconcilia; si no, crea. Soporta `prefillFrom.source` para duplicar.
- `cm_set_development_level_active`: ficha (setDevelopmentLevelActiveValidated con id + isActive).
- `cm_delete_development_level`: ficha con `writePattern:"preview-confirm"` (guard RC6: bloquea si una tributación apunta a alguno de sus niveles).

## Origen (verificado)
- upsert/set_active/delete -> logic/developmentLevel-upsert.schema.graphql + logic/developmentLevel-upsert.resolver.js
- validaciones RC1-RC4 + RC6 -> logic/helpers/validateDevelopmentLevel.js

## Consideraciones
- deleteDevelopmentLevelValidated devuelve DevelopmentLevelDeleteResult (id + name); mapear `resultPath`.
- Escala inactiva sella sus niveles (un nivel no tiene ciclo propio).
- RC6 mira competencyAlignment.developmentLevelId: el guard es de tributación, no del propio esquema.

## Hipótesis a validar
- Forma exacta del `input` de cada ficha contra el resolver.
- Si la mutation escribe historial (para el DoD de auditoría).

## Decisiones técnicas
- upsert por registerExtra; set_active/delete por ficha; delete siempre preview-confirm.
