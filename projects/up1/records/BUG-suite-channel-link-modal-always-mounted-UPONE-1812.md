---
id: BUG-suite-channel-link-modal-always-mounted-UPONE-1812
project: up1
type: bug
module: suite
---

Navbar.vue montaba ChannelLinkModal sin v-if; como el Navbar esta en todas las paginas, el componente (y su intervalo de un tick por segundo) vivia siempre, para algo que casi nadie abre. Se agrega v-if="showChannelLink" para que el reloj solo exista mientras el modal esta abierto; el watcher corre con immediate porque con v-if el componente monta ya abierto.

**sourceRef:** 7de0350 + components/static/Navbar.vue:114-121.
