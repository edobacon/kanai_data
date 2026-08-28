---
id: RULE-layout-003
project: up1
type: rule
module: layout
tags:
  - layout
  - pattern
  - embedded
---

# Embedded record-lists usan parentId placeholder para filtrar

## What

Cuando un RecordDetail tiene un RecordList embebido (tab related), el filtro del RecordList debe usar '{{parentId}}' como valor. LayoutOrchestrator resuelve este placeholder al ID del record padre.

## Why

Sin el placeholder, la lista embebida no filtra por el padre y muestra todos los registros. El LayoutOrchestrator es el unico que tiene el contexto del padre para resolver el placeholder.

## Where

mods/*/config/layouts/

## When

Al crear layouts RecordDetail con tabs que contienen record-lists embebidas.

## Verification

Verificar que el filter del embedded RecordList contiene: { field: 'parentObjectId', operator: 'EQUALS', value: '{{parentId}}' }.

## Source

- **Discovered in**: —
