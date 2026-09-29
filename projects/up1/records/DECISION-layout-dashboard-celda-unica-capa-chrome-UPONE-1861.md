---
id: DECISION-layout-dashboard-celda-unica-capa-chrome-UPONE-1861
project: up1
type: decision
module: layout
tags:
  - UPONE-1861
  - sp11
  - dashboard
  - widgets
---

.dashboard-layout__cell en Dashboard.vue es la unica capa que aplica fondo, borde de 1px, radio y sombra con tokens canonicos. Un widget no declara border, border-radius ni box-shadow en su raiz ni pinta fondo propio (el borde inferior del header, que separa sin encerrar, si se permite). Un componente con card propia (calendario de RecordList, Flexmonster) se aplana con :deep dentro del widget que lo usa, nunca en el componente compartido, para que el uso standalone conserve su card. Es una convencion de revision, no forzada por codigo: un widget que reintroduce su marco produce doble borde en todo dashboard.

sourceRef: 8979a71f src/layouts/Dashboard/Dashboard.vue (.dashboard-layout__cell), aa6a4973 y ace17177 (RecordList, Fallback y ReportWidget sin marco), df781b33 docs
