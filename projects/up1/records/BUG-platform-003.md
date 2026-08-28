---
id: BUG-platform-003
project: up1
type: bug
module: platform
tags:
  - recorddetail
  - mode-view
  - embeds
  - editing
---

# RecordDetail en `mode: view` fuerza TODOS los embeds a read-only

## Symptom

RecordDetail en `mode: view` sobrescribe `canEdit/canCreate/canDelete/canBulkDelete/canEditRowField` a `false` en todos los embeds (`record-list`, `record-detail`), ignorando el config del JSON del embed. No hay forma desde el config del mod de habilitar edicion en embeds cuando el detail padre esta en view.

## Expected behavior

Cada embed deberia respetar su propio `canEdit` declarado, independientemente del mode del detail padre. O al menos un flag explicito (`forceEditableEmbeds: true`) que permita edicion en mode view.

## Root cause

[RecordDetail.vue:4082-4098](../../../up1/layout/src/layouts/RecordDetail.vue#L4082-L4098) — los flags se sobrescriben antes de pasarse al embed, sin path para opt-out.

## Impact

Bloquea el patron "vista resumen con edicion contextual" — el user tendria que entrar a edit del padre completo para editar un embed. Para un programa de asignatura con multiples tabs editables, esto degrada la UX.

## Workaround

Mantener la edicion en `mode: edit` del padre (flow Session 5 de TICKET-009). Para fix real, PR a plataforma que agregue `forceEditableEmbeds` o desactive el override.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L33 — Session 5 (2026-04-30)
