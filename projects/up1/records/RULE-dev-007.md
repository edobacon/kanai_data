---
id: RULE-dev-007
project: up1
type: rule
module: dev
tags:
  - confluence
  - source-of-truth
  - enums
  - modeling
  - curriculum-design
---

# Confluence Learning Assurance es la fuente de verdad para campos y enums del mod

## What

Antes de declarar cualquier campo, enum o FK en los objetos del mod, validar contra la página de Confluence Learning Assurance correspondiente. La fuente de verdad es Confluence, no el doc del PM ni la intuición del desarrollador.

## Why

Discrepancias entre Confluence y el modelo producen bugs en producción difíciles de rastrear: enums con casing incorrecto (UPPER_SNAKE vs PascalCase oficial), campos required/nullable invertidos, campos faltantes (ej. doi, externalId en BibliographyReference), y objetos no modelados (ej. Organization). El equipo funcional actualiza Confluence como contrato de dominio — es la única fuente auditada.

## Where

Aplica en todo el ciclo de modelado del mod: definición inicial de objetos JSON en `mods/<mod>/objects/business/Base/`, RecordTypes en `objects/business/RecordTypes/`, enums en los campos `enum: [...]`, y FKs con `isForeignKey` o polimórficas. También aplica al definir layouts y seeds que referencian esos campos.

## When

Activar al iniciar el modelado de cualquier objeto nuevo del mod (diseño del JSON Schema) y al modificar campos existentes (cambio de tipo, required, enum, FK). Si surge discrepancia entre Confluence y otra fuente (doc del PM, código legacy, intuición), registrar en `open-questions.md` del dominio y esperar resolución antes de implementar.

## Verification

1. Abrir la página Confluence Learning Assurance del dominio (ej. page 2038366242 para curriculum-design). 2. Por cada campo declarado: verificar que el tipo (required/nullable), los valores del enum (PascalCase oficial), y la FK target coincidan con Confluence. 3. Comparar lista de objetos del mod contra la sección 'En implementación' de Confluence — sin objetos faltantes ni extras. 4. Si hay discrepancia: registrar en `open-questions.md` con referencia al campo y a la sección de Confluence.

## Source

- **Discovered in**: TICKET-006
