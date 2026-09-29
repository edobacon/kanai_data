---
id: RULE-object-manager-copia-s3-tolerante-UPONE-1499
project: up1
type: rule
module: object-manager
level: should
tags:
  - UPONE-1499
  - sp11
  - s3
  - archivos
---

El import masivo y la carga de archivos de instancia copian a S3 ademas de guardar en disco local, para servir a instancias multiples. Si la copia a S3 falla (bucket caido, permisos, red), la operacion no aborta ni pierde el archivo: fileUploadService captura el fallo y continua, porque el disco local sigue siendo la fuente. En AWS se habilita con ENABLE_UPLOADS_S3 en la task def del OM.

sourceRef: 11616556 y 17dd7fab src/services/fileUploadService.js; superrepo 65dd11a aws/om-task-def.json
