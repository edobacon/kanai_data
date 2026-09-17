---
id: DECISION-object-manager-idcolumn-UPONE-1750
project: up1
type: decision
module: object-manager
---

Se declara idColumn en core_ObjectDefinition: el campo propio designado como representacion humana de un objeto, usado como fallback cuando un layout no declara relationDisplayFields. Decision clave: el sync del registro PRESERVA el valor de la DB en vez de sobrescribir desde el JSON (`metadata.idColumn || existingObject.idColumn`, NO overwrite incondicional), porque el editor de objetos permite setear idColumn en objetos CORE (UPONE-1751) cuyo JSON vive en objects/core|business/ y nunca lo declara por tenant; con overwrite, cada `npm run sync` lo borraria en silencio. updateObjectDefinition deja pasar idColumn solo en objetos CORE.

**sourceRef:** c844aa15 + src/services/codegen/generatePrismaSchema.js ~2268-2318; src/graphql/resolvers/objectDefinition.resolver.js.
