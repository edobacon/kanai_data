---
id: RULE-up1-manager-permiso-sin-roles-rechazado-UPONE-1500
project: up1
type: rule
module: up1-manager
level: must
tags:
  - UPONE-1500
  - sp11
  - permisos
  - rbac
---

manageObjectRoles hace REPLACE de la asignacion completa: guardar un permiso con la lista vacia (o antes de que carguen los chips del editor) revocaba ese permiso, o los cuatro, para todos. Ahora hay dos capas: el schema zod de manageObjectRoles rechaza con superRefine cualquier asignacion que deje una accion (view, create, modify, delete) sin rol, y los layouts de alta y edicion de objeto y tipo de registro marcan rolesView, rolesCreate, rolesModify y rolesDelete como required. Complementa el record de object-manager del mismo ticket.

sourceRef: 0b68546 logic/objectRoles.schema.js:17-46 (OBJECT_ROLE_ACTIONS, superRefine), 7000ff4 config/layouts/objectdefinition-create.json:271, 6d48f3b (edicion)
