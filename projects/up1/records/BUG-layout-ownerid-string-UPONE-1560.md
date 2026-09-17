---
id: BUG-layout-ownerid-string-UPONE-1560
project: up1
type: bug
module: layout
---

El objeto up1_layen_layout (y up1_layen_layout_role) declaraban ownerId como "integer"; se corrige a "string" porque los ids de usuario del core ya son string. Ajuste propagado a OfferingCalendar stories, MultiSelectPickerModal y CreateViewWizard/types.ts. Regla: no asumir que un id de core_User es numerico en el frontend.

**sourceRef:** 73e1b6df + objects/up1_layen_layout.json L155-159 (ownerId) + up1_layen_layout_role.json.
