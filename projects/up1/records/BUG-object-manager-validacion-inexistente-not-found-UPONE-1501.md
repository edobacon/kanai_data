---
id: BUG-object-manager-validacion-inexistente-not-found-UPONE-1501
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1501
  - sp11
  - validaciones
---

objectValidation.resolver.js lanzaba un error generico (500) al editar o borrar una regla de validacion que ya no existia, en vez de un NOT_FOUND accionable. En el mismo cambio el parser de reglas dejo de quedar incompleto cuando el archivo no termina con salto de linea (EOF), y los errores de importacion incluyen la etiqueta del campo.

sourceRef: 0e6842a5 src/graphql/resolvers/objectValidation.resolver.js:433, src/services/validation/parser.js
