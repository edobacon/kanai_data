---
id: BUG-academic-scheduling-ingest-audit-id-22P02-UPONE-1646
project: up1
type: bug
module: academic-scheduling
---

Causa raiz: updatedById es columna integer (core_User.id), pero el contexto del algoritmo corriendo como cuenta de servicio (ej. "service/n8n-flow") llega con un id no numerico, y el helper de auditoria del core deployado reenvia context.user.id tal cual. El valor llegaba a la UPDATE set-based como $n::integer y fallaba. Fix: sanitizar una sola vez con la misma semantica del helper (parseInt para strings, solo un entero finito se usa, si no la columna queda intacta) y reusar el valor en la UPDATE bulk y en el createMany.

**sourceRef:** eef0681 + logic/scheduling-outputs.resolver.js:285 (parsedAuditId).
