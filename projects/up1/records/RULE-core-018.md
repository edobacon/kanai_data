---
id: RULE-core-018
project: up1
type: rule
module: core
tags:
  - graphql
  - apollo
  - resolvers
  - typedefs
  - sdl
---

# Un campo nuevo en el return de una mutation NO se expone si el tipo GraphQL del output no lo declara — Apollo lo descarta en silencio

## What

Si un resolver agrega un campo nuevo al objeto que retorna (ej. `cloneMap` en el return de `createInstance`), ese campo **no llega al cliente** a menos que el tipo de salida en el SDL (ej. `InstanceResult` en `src/graphql/typeDefs/static.js`) lo declare explicitamente. Apollo Server filtra el resultado contra el SDL y **descarta los campos no declarados sin emitir error ni warning** — la query simplemente no ve el campo.

Al agregar un campo al return de una mutation/resolver, hay que tocar **dos lugares**:

1. El resolver (poblar el campo en el objeto retornado).
2. El typeDef SDL del tipo de salida (declarar el campo con su tipo, ej. `cloneMap: JSON`).

## Why

Apollo aplica el contrato del SDL como filtro de serializacion. Lo que no esta en el schema no existe para el cliente, por diseño. El fallo es especialmente traicionero porque no hay excepcion: el resolver "funciona", retorna el dato, los tests del resolver en aislamiento pasan, pero la respuesta GraphQL real lo omite. Solo se detecta inspeccionando la respuesta del cliente o el SDL.

## Where

- **Files**:
  - Resolver: `up1/object-manager/src/graphql/resolvers/**` (donde se puebla el return)
  - SDL: `up1/object-manager/src/graphql/typeDefs/static.js` (tipos estaticos; ej. `InstanceResult`)
  - SDL dinamico: `src/graphql/typeDefs/dynamic.js` (auto-generado — no editar a mano)
- **Layers**: api (GraphQL), backend (resolvers)

## When

Siempre que un resolver agregue un campo nuevo al objeto que retorna. Antes de dar por hecho que el cliente lo recibe, verificar que el tipo de salida en el SDL lo declara.

## Verification

```bash
# Al agregar un campo X al return de una mutation, confirmar que el tipo de salida lo declara
grep -n "cloneMap" up1/object-manager/src/graphql/typeDefs/static.js
# Expected: linea con `cloneMap: JSON` dentro de type InstanceResult

# Verificacion runtime: ejecutar la mutation y confirmar que el campo aparece en data
```

## Source

- **Discovered in**: TICKET-033, Session 7 (L7) — detectado por reviewer aislado
- **Evidence**: `createInstance` poblaba `cloneMap` en el return pero el cliente no lo recibia. Apollo lo descartaba porque `InstanceResult` en `static.js` no lo declaraba. Fix: agregar `cloneMap: JSON` al typeDef (static.js:~1130). Tras el fix, el campo se expone (TC-25 verde).
- **Related**: RULE-core-017 (JsonNull vs DbNull en campos Json)
