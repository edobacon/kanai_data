---
id: DECISION-object-manager-validation-gate-MGR-03
project: up1
type: decision
module: object-manager
---

src/services/validation/validationGate.js es el punto unico de throw para errores de validacion (GraphQLError + extensions.fieldErrors, manteniendo el message legacy), reemplazando el patron disperso anterior. Corrige que updateInstance (base) descartaba el resultado de las reglas de validacion sin aplicarlas. Agrega relatedDataFetcher.js compartido, un guard de initialStates para transiciones de enum en create, y alinea el dry-run con el criterio del save real. Serie de 4 commits (0dbb98ee, 20704ad7, 56dc720a, 72c0ed9c) que endurece evaluacion de formulas, auth en lecturas de reglas y caché por lote.

**sourceRef:** 0dbb98ee + src/services/validation/validationGate.js (nuevo), src/graphql/resolvers/instance.resolver.js.
