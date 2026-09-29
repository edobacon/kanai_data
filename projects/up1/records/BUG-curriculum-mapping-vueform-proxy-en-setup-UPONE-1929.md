---
id: BUG-curriculum-mapping-vueform-proxy-en-setup-UPONE-1929
project: up1
type: bug
module: curriculum-mapping
tags:
  - UPONE-1929
  - sp11
  - vueform
  - editor-matrices
---

El editor de matrices de competencias perdia campos al guardar (p.ej. ownerUnits) porque collectTabData leia resolveElementProxy(element)?.value dentro de un watch immediate, que corre en el setup. En ese momento setupState esta vacio, Vue cachea la resolucion fallida (accessCache[key] = OTHER) y proxy.value devuelve undefined toda la vida del componente. Solo se veia en build de produccion. readElementValue(element) lee el computed ref crudo del elemento sin pasar por el proxy: usarlo en toda lectura durante setup o watch immediate. Las escrituras pueden seguir por el proxy porque ocurren despues del setup.

sourceRef: 16f2710 (UPONE-1929, readElementValue en el editor de matrices)
