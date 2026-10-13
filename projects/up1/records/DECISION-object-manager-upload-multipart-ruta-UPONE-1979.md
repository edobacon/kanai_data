---
id: DECISION-object-manager-upload-multipart-ruta-UPONE-1979
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1979
---

Los archivos de campos de tipo archivo se suben por la ruta multipart `POST /graphql/files/upload`, fuera de Apollo. El tope por archivo es `FIELD_FILES_UPLOAD_MAX_BYTES` (default 5.000.000 bytes), elegido bajo el corte de ~5 MiB del WAF en la nube. Un archivo mayor devuelve `{ error: { code, message, maxBytes } }`. Complementa el almacenamiento de DECISION-object-manager-file-field-storage-UPONE-1627.

sourceRef: 47505f6c (UPONE-1979), src/api/routes/fieldFileUpload.js:29-38, src/index.js:319-320, .env.template:92-93
