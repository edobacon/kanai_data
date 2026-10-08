---
id: RULE-layout-dashboard-filter-bar-auto-metadata-compartida-UPONE-1864
project: up1
type: rule
module: layout/dashboard
level: should
tags:
  - UPONE-1864
  - dashboard
  - filter-bar
---

useAutoDerivedFilters recibe la opción enabled y solo corre en modo auto. Lee cada reporte con los mismos documentos de metadata que usa el widget (src/shared/reportMetadata.ts), de modo que Apollo responde desde caché y la barra no cuesta requests extra. Hay una query de metadata por widget de reporte. Medido en cd_home_dashboard: de 79 a 37 requests en la primera visita.

Fuente: 703f9c5f src/composables/useAutoDerivedFilters.ts; src/shared/reportMetadata.ts; docs/features/dashboard-filter-bar.md (8b5cb397).
