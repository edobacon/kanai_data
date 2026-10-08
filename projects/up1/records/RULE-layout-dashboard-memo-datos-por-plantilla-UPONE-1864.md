---
id: RULE-layout-dashboard-memo-datos-por-plantilla-UPONE-1864
project: up1
type: rule
module: layout/dashboard
level: should
tags:
  - UPONE-1864
  - dashboard
  - perf
---

El Dashboard provee un memo (DASHBOARD_DATA_MEMO) que entrega la misma promesa a los widgets de reporte que piden la misma query y variables. Dura mientras el Dashboard esté montado: al salir y volver se pide de nuevo. Las requests fallidas se descartan para que el reintento pregunte otra vez, y force reemplaza el resultado guardado (refresh explícito). Fuera de un Dashboard no hay memo y el visor pide al servidor por su cuenta.

Fuente: 1513a384 src/layouts/Dashboard/dashboardDataMemo.ts:15-35; src/layouts/Dashboard/Dashboard.vue:295.
