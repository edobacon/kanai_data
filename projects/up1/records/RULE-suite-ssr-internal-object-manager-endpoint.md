---
id: RULE-suite-ssr-internal-object-manager-endpoint
project: up1
type: rule
module: suite
tags:
  - sp10
  - ssr
  - apollo
  - object-manager-endpoint
---

plugins/apollo.server.ts: durante el render server-side, si hay un endpoint INTERNO de object-manager configurado, el cliente Apollo del servidor lo usa para las queries SSR (en vez del endpoint publico), reduciendo latencia y evitando el salto externo. sourceRef: f791680 (fix/UPONE-ssr-internal-graphql-endpoint, PR #265).
