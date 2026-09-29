---
id: DECISION-object-manager-toggles-canal-yupi-core-UPONE-1915
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1915
  - UPONE-1554
  - sp11
  - settings
  - yupi
---

yupi.enableWhatsApp y yupi.enableTelegram permiten a un admin de institucion ocultar un canal del modal de vinculacion. Viven en config/settings.json del core (configSync lee los del core y los de cada mod activo; mods/ai-agent ya no los aloja). Reusan la capability mod/up1-manager/config:edit, igual que recordlist.fileFieldDisplay (UPONE-1627). Ambos arrancan en true, asi que nada cambia hasta que un admin los apague.

sourceRef: e1779e37 config/settings.json:35
