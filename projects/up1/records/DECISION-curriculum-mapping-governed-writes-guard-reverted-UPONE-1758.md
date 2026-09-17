---
id: DECISION-curriculum-mapping-governed-writes-guard-reverted-UPONE-1758
project: up1
type: decision
module: curriculum-mapping
---

El commit 7972381 agrego genericWriteGuard.resolver.js (229 lineas) que interceptaba las mutaciones genericas (MCP/UI/API) sobre los objetos del mod y las rechazaba si no pasaban por una mutacion *Validated propia. El commit 068ec91 (dia siguiente, mensaje "se remueve el guard del mod se buscara la forma de agregarlo al core") elimino integramente ese resolver, sus tests y el helper de errores. Conclusion: el enforcement de escritura gobernada NO esta activo hoy en curriculum-mapping; la direccion es resolverlo como capacidad de core (coherente con blockGenericMutation en cd/cm). Cualquier consumidor que asuma que el guard de mod bloquea CRUD generico sobre CompetencyAlignment esta desactualizado. Relaciona con DECISION-curriculum-mapping-uniform-matrix-UPONE-1689 (pack MCP read-only).

**sourceRef:** 7972381 logic/genericWriteGuard.resolver.js (creado, 229 lineas) revertido por 068ec91 (mismos archivos, eliminados).
