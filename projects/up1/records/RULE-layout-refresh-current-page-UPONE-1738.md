---
id: RULE-layout-refresh-current-page-UPONE-1738
project: up1
type: rule
module: layout
---

Un host que embebe un RecordList y muta las filas seleccionadas no tenia forma de pedirle un re-read: la unica via era remontar con :key, lo que se ve como reload y manda a pagina 1. refreshCurrentPage() re-lee la pagina actual y limpia la seleccion, preservando paginacion/filtros/busqueda; delega en refreshRecordListAfterMutation. Expuesto via defineExpose junto a handleRefreshData.

**sourceRef:** 64a55abd + src/layouts/RecordList/RecordList.vue L7969-8022 (refreshCurrentPage) y L8850 (expose).
