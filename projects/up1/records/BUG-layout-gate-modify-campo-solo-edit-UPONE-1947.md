---
id: BUG-layout-gate-modify-campo-solo-edit-UPONE-1947
project: up1
type: bug
module: layout
tags:
  - UPONE-1947
  - sp11
  - record-detail
  - rbac
---

RecordDetail deshabilitaba todos los campos en modo create para roles con capability create pero sin modify, porque generateCapabilities.js no emite capabilities de create por campo (solo view/modify); create ya se resuelve a nivel de objeto con getEffectivePermission. El gate por campo (UPONE-1439) se acoto a computedMode.value === 'edit'. Antes, un rol con ['create','view'] abria el formulario de creacion con todos los campos bloqueados.

sourceRef: 528b23ce src/layouts/RecordDetail/RecordDetail.vue:6880-6888
