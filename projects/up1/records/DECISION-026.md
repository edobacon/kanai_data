---
id: DECISION-026
project: up1
type: decision
module: core
tags:
  - object-manager
  - codegen
  - typeMappers
  - vocabulario
  - prisma
  - graphql
---

# DECISION-026: Vocabulario de tipos único (`typeMappers.js`) como fuente de verdad para codegen

## Contexto

Antes de UPONE-1386, el mapeo entre el `fieldType` declarado en un objeto JSON y los tipos generados de Prisma/GraphQL estaba disperso: `generatePrismaSchema.js`, `objectDefinition.resolver.js` y `typeDefs/static.js` tenían cada uno su propia lógica de mapeo, con riesgo de divergencia entre capas (un tipo que se codegenera distinto en el schema Prisma vs. el tipo GraphQL expuesto).

## Decisión

Se centraliza todo el vocabulario de tipos en `object-manager/src/services/typeMappers.js` (+84 líneas en el commit). `generatePrismaSchema.js`, `objectDefinition.resolver.js` y `typeDefs/static.js` consumen este vocabulario único en vez de mantener mapeos propios. Documentado en `docs/features/field-type-vocabulary.md`.

## Alternativas descartadas

- **Mantener mapeos independientes por consumidor con tests de regresión cruzada**: descartada porque no elimina la causa raíz (múltiples fuentes de verdad); solo detecta la divergencia después de que ocurre, en vez de prevenirla estructuralmente.
- **Generar los mapeos de las demás capas a partir de Prisma schema ya generado**: descartada porque invierte la dirección de dependencia deseada: el JSON de objeto (fuente de verdad de negocio) debe ser el origen del mapeo, no un artefacto derivado de Prisma.

## Impacto / reversibilidad

Cambio transversal en `object-manager` (codegen). Riesgo conocido: el vocabulario centralizado aún tiene un gap (`canonicalFieldTypeToJsonSchema` no cubre `fieldType:"float"` de forma correcta), ver [[BUG-platform-022]]. Reversibilidad: baja como decisión arquitectónica (volver a mapeos dispersos reintroduciría el problema que motivó el cambio); alta a nivel de implementación puntual (agregar/corregir un case en `typeMappers.js` no requiere revertir la centralización).
