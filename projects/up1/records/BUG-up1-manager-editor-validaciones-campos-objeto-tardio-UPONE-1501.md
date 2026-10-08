---
id: BUG-up1-manager-editor-validaciones-campos-objeto-tardio-UPONE-1501
project: up1
type: bug
module: up1-manager
tags:
  - UPONE-1501
  - validations
  - editor
---

En la lista standalone de validaciones el objeto se elige después de montar el editor, por lo que availableFields nunca se cargaba y "Insertar campo" quedaba deshabilitado. Un watch sobre getObjectDefinitionId ahora recarga los campos y vuelve a parsear, y fieldsRequestSeq descarta respuestas viejas que llegan tras cambiar de objeto. Desde la pestaña Validaciones el objeto ya viene precargado y el watch no dispara.

Fuente: 3e1f9aa modsComponents/ValidationTextEditor/ValidationTextEditorElement.vue:558; tests/objectvalidation-form-contract.test.ts.
