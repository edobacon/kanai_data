---
id: RULE-up1-superrepo-docker-local-host-docker-internal-UPONE-1958
project: up1
type: rule
module: up1-superrepo
level: must
tags:
  - UPONE-1958
  - sp11
  - docker
  - n8n
---

GRAPHQL_ENDPOINT de flow y N8N_BASE_URL de object-manager estan fijos en docker-compose.yml con host.docker.internal y no se leen del .env raiz, cuyo valor apunta a localhost para suite en el host. Para abrir un flujo, el navegador va a N8N_PUBLIC_URL=http://localhost:${N8N_PORT}, porque el host no resuelve host.docker.internal y las cookies del bridge son solo de localhost. El compose construye con los Dockerfiles de cada workspace (object-manager/Dockerfile, suite/Dockerfile, no los aws/*.aws) y ya no tiene servicio worker.

sourceRef: 898eab3 docker-compose.yml:42, :66, :116, :154; b889d3d docker-compose.yml:119, docs/reference/environment-variables.md
