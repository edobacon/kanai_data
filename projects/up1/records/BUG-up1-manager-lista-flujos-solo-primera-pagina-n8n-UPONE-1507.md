---
id: BUG-up1-manager-lista-flujos-solo-primera-pagina-n8n-UPONE-1507
project: up1
type: bug
module: up1-manager
tags:
  - UPONE-1507
  - flows
  - n8n
  - pagination
---

La lista descarta toda fila cuyo workflow no esté en lo que leyó de n8n, y fetchN8nWorkflowMap leía una sola página, por lo que ocultaba flujos del tenant. n8n pagina con tope de 250 y responde 400 por encima. listAllWorkflowPages sigue nextCursor de a 250 y corta si n8n devuelve un cursor ya enviado, y el mapa se pide con el projectId del tenant; sin Project retorna null y no lee otros tenants.

Fuente: dba4565 logic/n8nWorkflowProxy.js:321,344; tests/n8nWorkflowList.test.ts.
