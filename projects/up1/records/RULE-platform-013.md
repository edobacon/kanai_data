---
id: RULE-platform-013
project: up1
type: rule
module: platform
tags:
  - casing
  - PascalCase
  - audit-chain
  - entityType
  - n8n
  - ENTITY_TYPE_MAP
  - changelog
  - workflowTransitionHistory
  - layouts
  - migration
---

# Migración de casing en objetos auditables: actualizar todas las capas semánticas silenciosas

## What

Al renombrar un objeto base auditable (ej. `activity` → `Activity`) se deben migrar TODAS las capas semánticas: (1) regex `auditableRe` del flow n8n `audit-capture.json`, (2) `ENTITY_TYPE_MAP` en `auditCapture.resolver.js`, (3) `publishers` que usan `objectType` en el payload (ej. `activity.resolver.js:234`), (4) consumers del MAP dentro del resolver que comparan contra el valor (ej. `entityTypeStored === 'CurricularSection'`), (5) todos los filters `entityType` en los layouts del tab Historial (9 en curriculum-design), (6) entries del seed con `entityType`, (7) `workflowTransitionHistory.create({ entityType })`, (8) `grep === '<old_value>'` para encontrar checks directos. Migrar también los datos históricos en DB (`changeLog.entityType` y `workflowTransitionHistory.entityType`).

## Why

Las capas visibles (Prisma errors, GraphQL errors) se parchean rápido porque generan runtime noise. Las capas semánticas (string libre `entityType`, regex de filtros, MAP de lookup) son silenciosas: no rompen el runtime, pero dejan datos huérfanos en DB y el tab Historial vacío. TICKET-030 documentó que TICKET-028 parcheó 5 capas pero omitió 3 capas semánticas, causando el bug del tab Historial vacío. El commit `2e47a62` (UPONE-1100 followup) aún fue un fix parcial. Consumers del MAP fuera del scope original pueden detectarse solo al correr los tests de integración (ej. L5: `=== 'curricularSection'` roto; L6: `objectType: 'activity'` en el publish event).

## Where

mods/curriculum-design/flows/audit-capture.json (regex `auditableRe`, L29) · mods/curriculum-design/logic/auditCapture.resolver.js (`ENTITY_TYPE_MAP` ~L90-94, consumer del MAP ~L361) · mods/curriculum-design/logic/activity.resolver.js (wth entityType ~L207, publish event objectType ~L234) · mods/curriculum-design/config/layouts/default_Activity_view.json y 8 más (filters del tab Historial) · mods/curriculum-design/seed/_data-workflow-objects.js (entries entityType) · SQL migration sobre `changeLog.entityType` y `workflowTransitionHistory.entityType`.

## When

Antes de cerrar cualquier ticket que renombre un objeto base auditable. Checklist obligatorio: (a) `grep -r 'old_name' flows/` para regex en n8n, (b) `grep -r 'old_name' logic/` para MAP + consumers + publishers, (c) `grep -r '"value": "old_name"' config/layouts/` para filters, (d) `grep -r "entityType: 'old_name'" seed/` para datos del seed, (e) SQL UPDATE sobre `changeLog` y `workflowTransitionHistory` en DB, (f) regression completa del mod.

## Verification

Post-fix: `grep -r 'activity' flows/audit-capture.json` (solo dentro del grupo rt__ lowercase, no como objectType). `npm test` mod 597/597 (o equivalente) verde. SQL: `SELECT entityType, COUNT(*) FROM changeLog GROUP BY entityType` sin entradas lowercase residuales (excepto polimórficos abiertos `curriculumPlan`/`changeRequest`).

## Source

- **Discovered in**: TICKET-030
