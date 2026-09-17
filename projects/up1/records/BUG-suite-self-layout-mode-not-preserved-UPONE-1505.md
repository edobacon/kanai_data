---
id: BUG-suite-self-layout-mode-not-preserved-UPONE-1505
project: up1
type: bug
module: suite
---

resolveDetailLayoutId() nace en este commit porque antes el reemplazo por el layout self ignoraba requestedLayoutMode: la accion de editar la propia fila terminaba en un layout con mode:view. Se agrega SELF_USER_EDIT_LAYOUT_ID como contraparte editable, preservando el modo pedido.

**sourceRef:** 90c520d + composables/selfUserRecord.ts:40-65 (resolveDetailLayoutId).
