---
id: DECISION-object-manager-markdown-cache-hash-ttl-UPONE-1628
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1628
  - sp11
  - markdown
  - cache
---

core_MarkdownCache usa el sha256 del contenido como clave: archivos identicos de un tenant comparten entrada y la entrada sobrevive a que el archivo cambie de registro. El TTL vive en la fila porque S3 no permite actualizar metadata en el lugar; cada lectura toca lastAccessedAt, asi que expira por ultimo acceso. Los resultados negativos (documento corrupto o demasiado grande) tambien se cachean para no reintentar en cada consulta. Usa un bucket separado del de archivos, con el mismo flag ENABLE_FIELD_FILES_S3 y fallback a disco.

sourceRef: 2e1223c4 src/services/markdown/markdownCacheService.js:195, 56d81d90 src/services/markdownCacheStorage.js
