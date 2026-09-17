---
id: DECISION-up1-manager-file-field-editors-UPONE-1627
project: up1
type: decision
module: up1-manager
---

Se agrego el tipo Archivo (file) a los layouts de creacion/edicion de definicion de objeto y tipo de registro. El select de tipo de campo pasa a autopoblarse desde getFieldTypeVocabulary (sin lista hardcodeada). Cuando el tipo es file aparecen editores por fila (multiple, tamaño, cantidad, tipos permitidos) en fielddefinition-create/edit.json, y luego el tipo file en los layouts de creacion de objeto/RT. Se excluyo file del campo Default Value en el modal.

**sourceRef:** 122f4a9 fielddefinition-create.json/edit.json; c14308e objectdefinition-create.json/recordtype-create.json; 577f5ae (exclusion Default Value).
