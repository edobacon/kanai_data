---
id: RULE-curriculum-design-027
project: up1
type: rule
module: curriculum-design
tags:
  - metadata
  - directChildren
  - deepclone
  - versioning
  - record-list
  - embedding
  - layout
  - mod
---

# `metadata.directChildren` es solo para deepClone/versioning/codegen (object-manager); el embedding de hijos como tabs lo hace `record-list` + `filters {{parentId}}`

## What

No confundir dos mecanismos que "muestran hijos de un objeto":

1. **`metadata.directChildren` (up1)**: la consume **SOLO el object-manager** — deepClone/versioning + codegen. Declara qué hijos cascadean al clonar/versionar el padre. **0 usos en layout/suite.**
2. **Embedding de hijos como tabs/lista en el detalle**: lo hace el **layout** con un campo `record-list` + `filters` sobre `{{parentId}}` (ej. la pestaña "Líneas de formación" del Curriculum). NO depende de `directChildren`.

⇒ Agregar/quitar una relación de embedding en la UI se hace en el **layout** (record-list + filters), no tocando `directChildren`; y declarar `directChildren` NO hace que los hijos aparezcan en la UI (solo afecta clone/versioning).

## Why

Caso real: TICKET-093 (bajo MC-02) — al embeber la pestaña de líneas de formación se verificó (grep) que `directChildren` no tiene consumidores en layout/suite; el embedding funciona por el `record-list`+`filters` del layout de detalle. Confundirlos lleva a (a) tocar `directChildren` esperando efecto UI (no pasa) o (b) asumir que el embedding cascadea en clone/versioning (no necesariamente — ver el gap latente de versioning del Curriculum).

## Where

- `mods/curriculum-design/objects/*.json` → `metadata.directChildren` / `metadata.polymorphicChildren` (consumido por object-manager, ver RULE-core-023).
- `mods/curriculum-design/config/layouts/default_Curriculum_{view,edit}.json` → campo `record-list` con `filters` sobre `{{parentId}}` (embedding UI).

## When

Al embeber hijos en el detalle de un objeto (usar layout record-list + filters) o al configurar clone/versioning de un padre con hijos (usar directChildren/polymorphicChildren). Distinguir cuál se necesita.

## Verification

`grep directChildren` en layout/suite → 0 usos (es solo object-manager). El embedding de la pestaña se logra sin tocar `directChildren`; el cascadeo en clone/versioning requiere declararlo (independiente del embedding).

## Source

TICKET-093 (bajo MC-02 / UPONE-1345), learn L1. Complementa RULE-core-023 (clasificación de hijos clonables). Ver también BUG-curriculum-design-003 (gap de versioning del Curriculum).
