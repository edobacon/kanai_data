---
id: RULE-object-manager-n8n-public-url-UPONE-1958
project: up1
type: rule
module: object-manager
level: must
tags:
  - UPONE-1958
  - sp11
  - flow
  - n8n
---

En Docker, OM llega a n8n por host.docker.internal, un host que el navegador no puede resolver. N8N_PUBLIC_URL (default: N8N_BASE_URL) es el origen al que se manda el navegador al abrir un flujo; N8N_BASE_URL sigue siendo el que usa OM del lado del servidor. Donde difieren (Docker local) hay que configurar ambos por separado.

sourceRef: c8a44e77 src/services/flowService.js:35, src/services/flowService.js:654
