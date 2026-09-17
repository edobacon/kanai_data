---
id: BUG-uengagement-up1-requesteventfeedback-int-UPONE-1560
project: up1
type: bug
module: uengagement-up1
---

studentUserIds era [Int!]! desde antes de UPONE-1560; tras la migracion core_User.id es texto y el resolver compara esos valores contra Student.userId (FK string), asi que Apollo rechazaba la coercion de variable antes de llegar al resolver y devolvia 400 sin mensaje util. Corregido el tipo del argumento GraphQL a [ID!]!.

**sourceRef:** 2ee2f8c + logic (schema.graphql de requestEventFeedback, [Int!]! a [ID!]!).
