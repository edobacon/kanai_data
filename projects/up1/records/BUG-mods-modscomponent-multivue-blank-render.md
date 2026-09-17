---
id: BUG-mods-modscomponent-multivue-blank-render
project: up1
type: bug
module: mods
---

Sintoma: un tab/vista que monta un custom Vueform element del mod renderiza VACIO en runtime (una tarjeta gris colapsada, sin selector ni estado vacio), pese a unit tests verdes.

Causa raiz: la carpeta del componente en `mods/<m>/modsComponents/<Comp>/` tenia MAS de un `.vue` (Element + subcomponentes como Table/Panel). `layout/scripts/sync.js` valida "exactamente 1 .vue por carpeta" y SALTEA la carpeta entera (warning "Multiple .vue files found (N). Only one .vue file allowed per folder."). El componente nunca se copia a `layout/src/modsComponents/` (lo que sirve el frontend) ni se registra en `component-registry.json`, asi que el element type no existe -> el layout monta un element desconocido -> vacio.

Por que los tests no lo cazan: los unit del mod corren en vitest node-env e importan los `.vue` directo (no montan el frontend real ni pasan por el sync). Se caza SOLO en verificacion runtime (montar la vista en la app). Caso real: UPONE-1756 (TICKET-143), CompetencyAlignmentGrid con 3 .vue.

Prevencion: RULE-mods-022 (subcomponentes de un Vueform element van INLINE en el mismo SFC) + RULE-mods-011/050 (sync de modsComponents). El backend/queries del mod pueden estar 100% OK y la vista igual vacia: es empaquetado de frontend, no datos ni resolver.
