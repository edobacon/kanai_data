---
id: BUG-suite-redirect-definepagemeta-pagina-blanco-UPONE-1501
project: up1
type: bug
module: suite
tags:
  - UPONE-1501
  - sp11
  - routing
  - nuxt
---

La pagina /{tenant_id}/{object_name}/index.vue redirigia con await navigateTo() dentro de script setup: la URL cambiaba mientras el Suspense de Nuxt mantenia montada la pagina vacia, y una URL tipeada a mano quedaba en blanco sin cargar la ruta destino. El redirect se movio a definePageMeta({ redirect: (to) => ... }), que corre en el route record antes de montar la pagina.

sourceRef: 5646bed pages/[tenant_id]/[object_name]/index.vue (UPONE-1501 H008)
