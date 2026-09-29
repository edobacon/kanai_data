---
id: BUG-object-manager-n8n-email-normalizado-UPONE-1922
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1922
  - sp11
  - flow
  - n8n
---

El lookup del proyecto de n8n por email de miembro (N8N_MEMBER_EMAIL_<TENANT>) fallaba si el valor traia espacios o mayusculas distintas a lo registrado en n8n. readMemberEmail centraliza la normalizacion (trim + lowercase) y devuelve null si queda vacio, en vez de repetirla en cada uso.

sourceRef: dbe296e3 src/services/flowService.js:1096
