---
id: RULE-dev-010
project: up1
type: rule
module: dev
tags:
  - sync
  - drift-checker
  - gate
  - mod-only
  - S1-phase
---

# Gates S1 de tickets mod-only no usan `npm run sync exit 0` como criterio de exito

## What

El gate de Fase 1 (sync) de un ticket mod-only valida el efecto real del cambio propio (config en DB + Base downstream + capabilities en core_Capability), no el exit code de `npm run sync`.

## Why

El drift-checker (detect-schema-drift.js) genera falsos positivos para campos de extension de RecordType mods (no escanea objects/business/RecordTypes/) — `npm run sync` puede devolver exit 1 por drift ajeno preexistente sin revertir el push (sync upsertea ANTES del drift-check).

## Where

Phase 1 del gate de tickets del monorepo up1 con cambios en objetos/capabilities.

## When

Diseno y verificacion de Fase 1 de tickets mod-only (cualquier rama del mod).

## Verification

Checklist del ticket incluye `drift-checker exit != 0 es aceptable si config sincronizada` + verificacion explicita de effect en DB UPU.

## Source

- **Discovered in**: TICKET-065
