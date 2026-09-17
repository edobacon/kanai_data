---
id: BUG-layout-modal-cascade-close-backdrop-MGR-fix
project: up1
type: bug
module: layout
---

ModalStackManager.closeModal ahora cierra el modal y todo lo apilado ENCIMA; la pila es plana, asi que cerrar el padre dejaba al hijo huerfano pero interactivo. Tambien deja de abrir hijos de un modal ya cerrado. El backdrop pasa de 5% de opacidad (se leia como transparente) a 35% via el token --up1-overlay-backdrop.

**sourceRef:** f137d52c + src/composables/modal/ModalStackManager/ModalStackManager.vue.
