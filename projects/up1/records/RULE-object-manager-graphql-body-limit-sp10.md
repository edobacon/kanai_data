---
id: RULE-object-manager-graphql-body-limit-sp10
project: up1
type: rule
module: object-manager
---

El default de 100kb de express.json() rechazaba con 413 los bulk upserts del algoritmo de scheduling (lotes de ~1000 filas). Se agrega env var GRAPHQL_BODY_LIMIT con default 20mb. Commit sin referencia de ticket en el subject.

**sourceRef:** d365c82e + src/index.js:555-561 (express.json({ limit: GRAPHQL_BODY_LIMIT })).
