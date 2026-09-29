---
id: RULE-up1-superrepo-settings-core-en-object-manager-UPONE-1920
project: up1
type: rule
module: up1-superrepo
level: must
tags:
  - UPONE-1920
  - UPONE-1554
  - sp11
  - settings
---

configSync lee dos ubicaciones: config/settings.json de cada mod activo y config/settings.json del core en object-manager. user.theme, recordlist.fileFieldDisplay y yupi.enableWhatsApp / enableTelegram viven en el core porque gatean comportamiento fuera de un mod (el modal de vinculacion de canal esta en suite). La guia anterior decia solo "crea config/settings.json en tu mod", lo que llevaba a poner ahi settings de plataforma.

sourceRef: d85019a mods/docs/guides/settings.md:17-20
