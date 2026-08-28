---
id: RULE-suite-001
project: up1
type: rule
module: suite
tags:
  - layout
  - pattern
  - ui
---

# Renderizar layouts solo via LayoutOrchestrator

## What

Suite NUNCA debe usar RecordList, RecordDetail, ChibiList u otros componentes de layout directamente. Siempre via LayoutOrchestrator.

## Why

LayoutOrchestrator es el punto unico de renderizado: resuelve layoutType, procesa {{parentId}}, maneja sub-layouts, propaga Apollo client. Bypass rompe toda esta logica.

## Where

suite/pages/, suite/components/, suite/modsComponents/

## When

Al crear paginas, componentes o templates que necesiten renderizar datos de un objeto.

## Verification

Grep en suite/ por import de RecordList, RecordDetail, ChibiList — deben estar ausentes salvo en LayoutOrchestrator mismo.

## Source

- **Discovered in**: —
