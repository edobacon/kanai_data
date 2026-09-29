---
id: BUG-mcp-scalar-json-builtin-scalars-UPONE-1758
project: up1
type: bug
module: mcp
tags:
  - UPONE-1758
  - sp11
  - mcp-sync
  - schema
---

BUILTIN_SCALARS en schema-index.js tenia solo los 5 scalars del spec GraphQL. JSON es un scalar custom declarado una vez en object-manager y nunca en el .schema.graphql de un mod, asi que el compilador lo trataba como tipo desconocido y pedia un selection set. El error "Tipo JSON desconocido o sin campos" hacia buscar un .schema.graphql que no faltaba. Rompia las 21 mutaciones de mods que devuelven JSON, incluidas todas las escrituras gobernadas de curriculum-mapping. Regla dejada en TROUBLESHOOTING.md: esa lista es "tipos que nunca llevan selection set en este schema", no "los scalars del spec".

sourceRef: 5056092 scripts/schema-index.js:22, .ai/TROUBLESHOOTING.md
