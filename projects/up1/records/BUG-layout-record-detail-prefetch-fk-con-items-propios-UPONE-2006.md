---
id: BUG-layout-record-detail-prefetch-fk-con-items-propios-UPONE-2006
project: up1
type: bug
module: layout/record-detail
tags:
  - UPONE-2006
  - record-detail
  - fk
---

Cuando la compuerta shouldUseReferenceSelect decidía no migrar un FK, igual caía a fetchRelationOptionsWithCurrent sin filtro y mezclaba opciones de otros cursos. Se agregó hasOwnItemsSource (items declarados, incluso vacíos, o autoPopulate.populateItems) y se usa en los dos sitios que prefetchean, para dejar el campo como lo declaró el layout. Caso real: modalityId en section-create del mod academic-scheduling.

Fuente: 6fb2544a src/layouts/RecordDetail/fkReferenceSelectGate.ts:92; src/layouts/RecordDetail/RecordDetail.vue:2718 y :3980.
