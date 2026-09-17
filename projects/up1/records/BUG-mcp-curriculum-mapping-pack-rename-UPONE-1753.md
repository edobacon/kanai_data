---
id: BUG-mcp-curriculum-mapping-pack-rename-UPONE-1753
project: up1
type: bug
module: mcp
---

El test de contrato del pack curriculum-mapping (UPONE-1530) todavia declaraba LevelScheme y CoverageScheme como objectType, desactualizado frente al rename de catalogos del mod (UPONE-1753): LevelScheme a PerformanceScale y CoverageScheme a DevelopmentLevel. El rename llega a la identidad del objeto (son los objectType reales que el MCP manda en up1_query_records, no etiquetas), asi que el test se corrigio para exigir los nombres nuevos y se agrego una aserto que prohibe reintroducir los viejos.

**sourceRef:** 9c36e27 + test/curriculum-mapping-pack.test.mjs:42-46, :54-60.
