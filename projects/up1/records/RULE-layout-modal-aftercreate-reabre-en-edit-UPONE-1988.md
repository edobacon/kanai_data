---
id: RULE-layout-modal-aftercreate-reabre-en-edit-UPONE-1988
project: up1
type: rule
module: layout/modal
level: should
tags:
  - UPONE-1988
  - modal
  - aftercreate
---

Solo continúa tras instance-created (la acción es lo único que se evalúa) y el valor resuelto del layout gana sobre el layoutConfig estático. Se reabre en edit porque el footer del modal solo se dibuja fuera de modo view. Se ignora al editar o si layoutId está vacío, y un usuario sin permiso de modificar ve el destino en view sin footer. Se resuelve en resolveAfterCreate.

Fuente: f0717b53 src/components/organisms/modal/ModalStackManager/afterCreate.ts (resolveAfterCreate); docs/features/recorddetail.md (fila layoutConfig.afterCreate).
