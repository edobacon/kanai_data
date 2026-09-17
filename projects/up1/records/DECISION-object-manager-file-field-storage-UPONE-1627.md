---
id: DECISION-object-manager-file-field-storage-UPONE-1627
project: up1
type: decision
module: object-manager
---

Feature de campo tipo file a lo largo de ~13 commits: tipo file mapeado a Json con metadata (typeMappers), fileTypes como fuente unica de tipos permitidos, servicio fieldFileStorage.js aislado por tenant (S3 o local segun entorno), resolvers de subida/borrado con validacion y RBAC, query de descarga con RBAC de vista, exclusion de campos file de la plantilla de import Excel, ajuste del limite de body de GraphQL, y persistencia de metadata en creacion de objeto/RecordType.

**sourceRef:** 18512914 + src/services/fieldFileStorage.js (nuevo); fc26185b (fileTypes); 760de04a (typeMappers); df0ef59d (resolver de descarga).
