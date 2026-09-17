---
id: DECISION-object-manager-tenant-provisioner-UPONE-1795
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1795
  - sp10
  - tenant-provisioning
---

Aprovisionamiento de tenant cloud: scripts/tenant-provision.js (Job) + scripts/sync/clientAdminsSeed.js (seed de admins del cliente), con ajustes en scripts/tenant-create.js y prisma/seed/up1/minimal/core-rbac.js. Decision D7: los seeds NUNCA reactivan admins desactivados (la reactivacion es solo manual); match de admin case-insensitive; gates de sync estrictos y sync S3 obligatorio sin publicar baseline; flag de credenciales estrictas para n8n en src/services/flowService.js. sourceRef: 80707b9 (Job+seed+context depths+n8n flag), fa83a4a (review fixes: gates estrictos + admin matching case-insensitive), 1ec2a18 (D7: seeds never reactivate admins). Guia: docs/guides/provisioning-a-cloud-tenant.md.
