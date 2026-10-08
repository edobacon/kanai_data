---
id: RULE-object-manager-campo-image-validacion-https-UPONE-1629
project: up1
type: rule
module: object-manager/validation
level: must
tags:
  - UPONE-1629
  - image-field
  - validation
---

El tipo de campo image (usado por core_User.profilePicture) se valida en el gate de validación: solo se aceptan URLs https, con un máximo de 2048 caracteres y sin credenciales embebidas en la URL.

Fuente: ded6a15e src/services/validation/validationGate.js:116.
