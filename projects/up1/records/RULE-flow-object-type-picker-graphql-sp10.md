---
id: RULE-flow-object-type-picker-graphql-sp10
project: up1
type: rule
module: flow
---

getRealObjectTypes, compartido por Up1FormObject y Up1Event para poblar el dropdown de tipos de objeto reales (Base objects y RecordTypes de core_ObjectDefinition, nunca los Extended/System internos), dejo de abrir su propio pg.Client contra la DB de tenant y ahora llama a getObjectDefinitions por GraphQL. El filtro de objetos System se sigue aplicando client-side.

**sourceRef:** 56a4bd24 + packages/nodes-base/nodes/Up1Shared/objectSource.ts (getRealObjectTypes) + Up1FormObject/Up1FormObject.node.ts.
