---
id: RULE-object-manager-cors-allowlist-origenes-UPONE-1934
project: up1
type: rule
module: object-manager/http-security
level: must
tags:
  - UPONE-1934
  - cors
---

Reemplaza origin: true en todas las rutas. Sin la variable, en producción se usa el origen de SUITE_BASE_URL; en desarrollo, la suite local y Storybook. Una entrada inválida aborta el arranque; un origen no permitido no recibe Access-Control-Allow-Origin (el preflight sigue respondiendo 204) y las requests sin Origin no se afectan.

Fuente: 079cb1d7 src/middleware/cors.js:3-16,39,108-110.
