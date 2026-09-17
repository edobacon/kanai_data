---
id: RULE-layout-friendly-error-unique-fallback-UPONE-1801
project: up1
type: rule
module: layout
tags:
  - UPONE-1801
  - sp10
  - errors
---

src/composables/useFriendlyErrors.ts agrega un patron de fallback: cuando una violacion de unique constraint no matchea una regla amigable especifica, se muestra un mensaje amigable generico en vez del error crudo del backend. sourceRef: c032529. Es el lado cliente/layout de UPONE-1801; el lado servidor es BUG-object-manager-softdelete-index-not-unique-UPONE-1801 (objetos soft-deletable emiten @@index en vez de @@unique).
