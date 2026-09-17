---
id: RULE-layout-fk-idcolumn-fallback-UPONE-1750
project: up1
type: rule
module: layout
---

Antes, una columna FK sin entrada en relationDisplayFields mostraba el id crudo. Ahora resolveRelationDisplayFields centraliza el fallback al idColumn que el objeto referenciado declara como su representacion humana, usado por el renderer de celda y el export. Requiere pedir idColumn explicitamente en la query compartida OBJECT_DEFINITION_FIELDS (antes no se pedia). hasDeclaredRelationDisplay se mantiene separado: sigue significando "el layout lo configuro a proposito"; el idColumn es un default. Complementa RULE-layout-002/033.

**sourceRef:** 4e7c157b + src/layouts/RecordList/RecordList.vue L2920, L6510 (resolveRelationDisplayFields); 81a360be (query OBJECT_DEFINITION_FIELDS).
