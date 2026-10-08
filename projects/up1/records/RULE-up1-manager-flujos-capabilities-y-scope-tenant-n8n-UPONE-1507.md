---
id: RULE-up1-manager-flujos-capabilities-y-scope-tenant-n8n-UPONE-1507
project: up1
type: rule
module: up1-manager
level: must
tags:
  - UPONE-1507
  - flows
  - n8n
  - rbac
---

n8nWorkflows y n8nWorkflow requieren mod/up1-manager/n8nworkflow:view, startFlow requiere mod/up1-manager/flow:start y setN8nWorkflowActive requiere n8nworkflow:modify, todos con withAuth; solo flowStatus queda sin capability. Como la API key de n8n ve todos los tenants, n8nWorkflow y startFlow verifican con assertTenantWorkflow que exista una fila N8nWorkflow del tenant, y n8nWorkflows filtra por el Project n8n del tenant y devuelve vacío, nunca sin filtrar, si no lo puede resolver.

Fuente: d9a6e35 logic/flow.resolver.js:29,35,49,68,76,126; 8ea5cff logic/flow.resolver.js.
