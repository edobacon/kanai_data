---
id: DECISION-up1-manager-validation-editor-ux-MGR-03
project: up1
type: decision
module: up1-manager
---

Mejoras al editor (ValidationTextEditorElement.vue): element.update(text) se llama siempre en vez de perder texto en la ventana de debounce; los errores de parseo bloquean el guardado nativamente via una rule custom formula con el mensaje real del parser; los identificadores desconocidos bajan a warning no bloqueante; el debounce hace flush en blur. Se sumo agrupacion de campos propios/heredados/de sistema en useObjectFieldGroups.ts. Las keys i18n objectvalidation.list.columns.* migraron a core_ObjectValidation.fields.*.

**sourceRef:** 698a306 ValidationTextEditorElement.vue, vueformRules.js; 223fb5a useObjectFieldGroups.ts; 3421d71 objectvalidation-*.json.
