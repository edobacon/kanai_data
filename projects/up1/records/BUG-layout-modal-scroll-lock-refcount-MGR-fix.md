---
id: BUG-layout-modal-scroll-lock-refcount-MGR-fix
project: up1
type: bug
module: layout
---

Antes cada Modal manejaba su propio lock de scroll del body; al cerrar un modal dentro de un stack, el body se desbloqueaba aunque quedara otro abierto debajo. Fix: shared/bodyScrollLock con un holder por componente y un contador compartido en window; Modal y ModalStackManager lo consumen. Ademas ConfirmationModal deja de usar :key dinamico (era stateless; el remount lo desmontaba con modelValue en true y liberaba el scroll).

**sourceRef:** 88b12f19 + src/components/molecules/Modal/Modal.vue L82, L318-330 + src/composables/modal/ModalStackManager/ModalStackManager.vue.
