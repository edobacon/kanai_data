---
id: RULE-layout-backend-validation-message-bag-MGR-03
project: up1
type: rule
module: layout
---

Se normalizan todos los graphQLErrors via extensions.fieldErrors (fuente unica, se elimina la copia literal de RecordList), se traduce messageKey con params antes de mostrar (el modal de bulk ya no muestra keys crudas) y se ancla el error al campo con el messageBag nativo de Vueform (soporta paths con punto). Se agregan las keys validation.transition.* (en/es/pt). RecordDetail suma resumen de errores (molecula FormErrorSummary) + badge en tab + scroll al campo. Se elimina el motor de reglas cliente muerto y la inyeccion DOM estilo Salesforce.

**sourceRef:** 07b41600 + src/layouts/RecordDetail/RecordDetail.vue; 966665fd; e5919287; 76a98814 src/components/molecules/FormErrorSummary/FormErrorSummary.vue.
