---
id: RULE-object-manager-core-user-autoedicion-selfeditable-UPONE-1629
project: up1
type: rule
module: object-manager/auth
level: must
tags:
  - UPONE-1629
  - self-edit
  - core_User
---

selfEditAccess permite modificar sobre el propio id únicamente los campos con "selfEditable": true en core_User.json (denylist de identidad y cuenta; no aplica a ids, extended ni service accounts). Solo core_User.json se lee para evitar escalada por marcar email como selfEditable. Bajo el grant solo se escriben cambios reales, para no pisar ediciones admin concurrentes.

Fuente: d9841677 src/services/auth/selfEditAccess.js:5-15.
