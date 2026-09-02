---
id: DECISION-layout-recorddetail-bulk-aichatbox
project: up1
type: decision
module: layout
tags:
  - UPONE-1715
  - UPONE-1694
  - UPONE-1695
  - UPONE-1703
  - sp9
  - layout
---

Bulk actions y feedback de seleccion para flujos no-delete, con showSelectionCount opt-in (UPONE-1715). AI-Chatbox con Markdown-it y origin de conversacion por mensaje (UPONE-1694/1695/1703). Nuevos elementos de layout: inline record picker, reference-select, y RecordDetail con optional steps / hidden labels / list folding / finish button.

sourceRef (verificado por diff): layout b77e6984 src/layouts/RecordList/RecordList.vue (bulk actions + selection feedback), 4aa4d333 docs/features/record-picker.md + css/3-viewType/recorddetail.css (inline record picker), 2dbd2439 (reference-select element), ff83bc78 (RecordDetail optional steps/finish button), dbe7ac8f (AI-Chatbox + Markdown-it).
