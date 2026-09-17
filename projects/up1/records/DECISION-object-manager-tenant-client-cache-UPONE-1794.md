---
id: DECISION-object-manager-tenant-client-cache-UPONE-1794
project: up1
type: decision
module: object-manager
---

src/services/clientCache.js cachea en S3 los clientes Prisma generados por tenant, restaurandolos al boot y guardandolos despues de cada generate; diseño fail-open (si S3 falla, el boot no se bloquea, cae a generar en caliente). Companero de 83bba555 (ensureTenantClients en boot, schema stamp) y 857da3c6 (binaryTargets dependientes de entorno, motores recortados al target real).

**sourceRef:** fee30016 + src/services/clientCache.js (nuevo) + src/services/ensureTenantClients.js.
