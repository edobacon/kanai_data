---
id: RULE-layout-011
project: up1
type: rule
module: layout
tags:
  - layout
  - i18n
  - recordlist
  - pattern
---

# Labels de columnas en RecordList son texto directo, no keys i18n

## What

El campo label de cada columna en RecordList se muestra tal cual como texto, no se resuelve como key de traduccion i18n. Para labels en español, escribir el texto directamente en el label del layout JSON.

## Why

El RecordList renderiza el label de la columna como string literal. El sistema i18n aplica a app labels (sidebar) y schema fields de RecordDetail, pero no a columns de RecordList.

## Where

mods/*/config/layouts/*.json (layoutType: RecordList)

## When

Al definir columnas en layouts RecordList.

## Verification

Verificar que los labels de columnas estan en el idioma deseado directamente en el JSON.

## Source

- **Discovered in**: —
