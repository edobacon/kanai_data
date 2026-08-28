---
id: RULE-curriculum-design-016
project: up1
type: rule
module: curriculum-design
tags:
  - enum
  - recordtype
  - codegen
  - curriculum-design
  - sp5
---

# El `enum` de un campo de RecordType-extension (`rt__*`) es SOFT: lo enforzan UI y MCP, no el backend

## What

Declarar `"enum": [...]` en un campo de un objeto de RecordType-extension (ej. `rt__Plan__curriculum.progression`, `periodType`) NO genera un tipo enum en el backend: tras el sync, el codegen de up1 deja la columna como `String?` en Prisma y `field: String` en los typeDefs GraphQL. El enum SÍ se honra en (a) el widget `select` del layout (con `items`), y (b) el contrato del MCP (`enums`/`enumLabels` + `z.enum`). Pero el GraphQL/DB acepta cualquier string. En cambio, los campos enum de objetos **base** (no `rt__`) — `Activity.recordType`, `programLevel`, `purpose` — SÍ generan tipos enum (`ActivityRecordType`, etc.).

## Why

El enforcement "duro" del valor del enum no existe a nivel API para campos `rt__`. Si un ticket asume que declarar `enum` en el JSON basta para que el backend rechace valores inválidos, la suposición es falsa: el rechazo de "Foo" vive solo en la UI y en el MCP. Saberlo evita TCs mal calibrados (marcar "rechaza X" como verificado a nivel API cuando no lo es) y decide dónde poner la validación si se necesita dura.

## Where

- **Files**: `objects/RecordTypes/rt__*.json` (declaración del enum), `object-manager/prisma/<TENANT>/schema.prisma` + `object-manager/src/graphql/typeDefs/dynamic.js` (artefactos generados que lo confirman como `String`), `config/layouts/*.json` (widget select), repo MCP `src/contracts/registry.ts` (enums/enumLabels).
- **Layers**: codegen / schema, frontend (layout), MCP adapter.

## When

Al cerrar a enum cualquier campo de un `rt__` (toda la malla SP5: MC-02..MC-09 tocan campos de RecordType). Al redactar TCs de "rechaza valor inválido" para esos campos. Al decidir dónde validar.

## Verification

Tras el sync, `grep "<campo>" object-manager/prisma/<TENANT>/schema.prisma` muestra `String?` (no un tipo enum); `grep "enum .*<Campo>" typeDefs/` no encuentra un tipo generado. El select del layout y el `z.enum` del MCP sí restringen.

## Source

- **Discovered in**: TICKET-081 (S1, learn L2) — verificación post-sync de `progression`/`isCurrent` contra el schema UPU regenerado.
- **Evidence**: `prisma/UPU/schema.prisma:2206` (`progression String?`), `typeDefs/dynamic.js:2181` (`progression: String`); `periodType` idéntico. Enums base sí generan tipo (`schema.prisma:451` `enum ActivityRecordType`).
