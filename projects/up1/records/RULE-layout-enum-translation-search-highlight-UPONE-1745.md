---
id: RULE-layout-enum-translation-search-highlight-UPONE-1745
project: up1
type: rule
module: layout
---

TableCell en modo lectura resuelve enums.<field>.<value> igual que el modo edicion (fallback al valor crudo/valueLabels si no hay key). El branch de busqueda activa (highlightSegments) leia displayValue directo, bypaseando la traduccion de formattedDisplayValue: con busqueda activa toda la columna volvia al valor crudo; ahora lee formattedDisplayValue. RecordDetail carga el namespace i18n del objeto que renderiza (no solo el de la ruta). globalThis.useNuxtApp (que nunca existio) se reemplazo por provide/inject real desde suite. Complementa RULE-layout-040 y BUG-layout-003.

**sourceRef:** 7a7f01fd + src/components/molecules/TableCell/TableCell.vue + src/layouts/RecordDetail/RecordDetail.vue; c778a812; 15439ec2.
