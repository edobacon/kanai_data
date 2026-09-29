---
id: DECISION-suite-config-null-cuenta-habilitado-UPONE-1917
project: up1
type: decision
module: suite
tags:
  - UPONE-1917
  - UPONE-1918
  - sp11
  - config
  - yupi
---

useConfig y useConfigs arrancan en null y resuelven de forma asincrona. Si el punto de lectura tratara null como apagado, la UI gateada desapareceria y volveria en cada carga (parpadeo) y no coincidiria con el default:true del setting. En useChannelLink y en el Navbar (yupi.enableWhatsApp / enableTelegram), ausente o ilegible cuenta como habilitado. El item del navbar desaparece solo con AMBOS canales apagados; con uno activo el modal ofrece solo ese canal y el tablist se oculta si queda un tab.

sourceRef: 58ac5ca (channelLink filtra canales), 4d9569f (navbar), c8362a5 (decision testeable)
