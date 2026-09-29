---
id: RULE-suite-useconfigs-varias-claves-UPONE-1919
project: up1
type: rule
module: suite
level: should
tags:
  - UPONE-1919
  - sp11
  - config
  - performance
---

useConfig manda una clave por llamada; leer N claves costaba N round-trips por carga en componentes como el Navbar. useConfigs(keys) hace una sola query con getConfigs y comparte el mismo cache por clave que useConfig: una clave ya pedida por otro componente no se vuelve a pedir, e invalidateConfig sigue notificando a todos.

sourceRef: 48d3dd2 composables/useConfig.ts:123 (useConfigs)
