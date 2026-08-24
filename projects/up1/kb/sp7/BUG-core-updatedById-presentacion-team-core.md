# Bug de codegen: `updatedById` sale `String` en el typedef GraphQL (debe ser `Int`)

**Para:** Team Core (owners de `object-manager`)
**Repo afectado:** `object-manager`
**Severidad:** Baja en runtime, Media en higiene de contrato y ruido de `drift:check`
**Estado:** Diagnosticado, fix propuesto, sin aplicar (esperando decision de Core)

---

## TL;DR

El generador de typedefs GraphQL emite `updatedById: String` en los 129 tipos de negocio, cuando la definicion OM y el schema Prisma dicen `Int`. Es un bug de una sola linea en el codegen: el bloque de campos comunes no convierte el tipo JSON-schema a tipo Prisma antes de mapearlo a GraphQL, cosa que los otros dos bloques del mismo archivo si hacen. El impacto en runtime es casi nulo (los datos viajan por un scalar `JSON`, no por estos tipos), pero ensucia cada `drift:check` con 129 errores y publica un contrato incorrecto. Fix recomendado: 3 lineas, sin colaterales.

---

## 1. Sintoma

`drift:check` (Fase 10 del sync) reporta, en 129 objetos:

```
❌ <Model>.updatedById: GraphQL type mismatch (expected: Int, got: String)
```

Se repite en todos los objetos que heredan el campo comun `updatedById`.

## 2. Causa raiz

Un solo punto: `object-manager/src/services/codegen/generatePrismaSchema.js:3559`

```js
// generateBaseGraphQLType(), bloque de campos comunes
let gqlType = mapPrismaToGraphQLType(commonField.type);   // ❌
```

`mapPrismaToGraphQLType()` (`src/services/typeMappers.js:202`) espera un **tipo Prisma** (`Int`, `String`, `DateTime`, ...). Su `switch` cae a `default: return 'String'` para todo lo que no reconoce. Aca recibe el **tipo JSON-schema del OM** en minuscula (`"integer"`), que no matchea el case `"Int"`, entonces devuelve `String`.

Los otros dos caminos del mismo codegen convierten primero y quedan correctos:

```js
// Bloque Prisma, :364  -> genera "updatedById Int?" correcto
prismaType = fieldTypeToPrisma(commonField.type, commonField.format, commonField.enum);

// Bloque properties de GraphQL, :3576-3577  -> correcto
const prismaType = fieldTypeToPrisma(fieldDef.type, fieldDef.format);
let gqlType = mapPrismaToGraphQLType(prismaType);
```

El bloque de campos comunes (3559) se salteo el paso `fieldTypeToPrisma(...)`.

### Estado por capa

| Capa | Fuente | Tipo de `updatedById` | Correcto |
|------|--------|----------------------|:--------:|
| Definicion OM | `objects/business/common.json` | `integer` | fuente de verdad |
| Prisma / DB | `prisma/*/schema.prisma` | `Int?` | si |
| Typedef GraphQL | `typeDefs/dynamic.js` | `String` | **no** |

`common.json` solo declara `updatedById` como campo comun de tipo `integer` (no hay `createdById`), por eso el drift es unicamente de `updatedById`.

## 3. Origen (cuando y como aparecio)

| Evento | Commit | Fecha |
|--------|--------|-------|
| Bloque `properties` se corrige (convierte tipo antes de mapear) | `41d558457` | 2026-01-02 |
| **Gatillo:** `updatedById` pasa a `integer` escalar en `common.json` | `d46d2802` (UPONE-1194 / PLAT-12) | 2026-06-21 |
| Se quita la FK de `updatedById` | `8d9e3e72` | 2026-06-22 |

La linea 3559 es anterior (refactor `dac84610c`, 2025-10-13, sin ticket) y estuvo **latente**: mientras `updatedById` fue String/FK, `default -> String` daba el resultado correcto por casualidad. Cuando UPONE-1194 (PLAT-12) lo convirtio a `integer`, Prisma paso a `Int` y el typedef GraphQL quedo en `String`. Ahi aparecio el drift. El arreglo que ya se habia hecho en enero para el bloque `properties` nunca se backporteo al bloque de comunes.

No lo introdujo ningun update reciente de develop, ya venia asi.

## 4. Alcance (blast radius medido)

**Hallazgo que domina el alcance:** el frontend trae records con `listInstances` (`layout/src/composables/useDataFetching.ts:92`), que devuelve `InstanceResult { id, data: JSON, extended: JSON }` (`static.js:1372`). Los valores de campo viajan dentro del scalar `JSON`, no por los tipos por-objeto generados. Ninguna query (suite, layout, mods) selecciona `updatedById` por su tipo GraphQL. El drift es de contrato/introspeccion, no de wire.

| Vector | Evidencia | Impacto |
|--------|-----------|:-------:|
| Filtros `where` | `FilterInput { field: String!, operator, value: JSON }` generico (`static.js:1353`) | Nulo |
| Sort `orderBy` | `SortInput { field: String!, direction }` por nombre (`static.js:83`) | Nulo |
| Input types generados | `updatedById` no existe en ningun `input` de `dynamic.js` | Nulo |
| Fetch de datos (frontend) | via `InstanceResult.data` (JSON); nadie pide `updatedById` por tipo | Nulo en runtime |
| Consumer por nombre (layout) | `useUserDisplay` cachea y busca con `String(id)` en set y get (`:127`, `:150`) | Nulo, robusto a Int o String |
| Resolvers server | `academic-scheduling/scenario-detail.resolver.js` ya trata `updatedById` como Int | Nulo o positivo |
| Labels i18n (suite) | solo strings de display | Nulo |

**Conclusion de alcance:** el fix de `updatedById` (String a Int) tiene radio efectivo cercano a cero en runtime. El unico efecto real es corregir el contrato publicado y limpiar 129 errores recurrentes del `drift:check`.

## 5. Fixes propuestos

`fieldTypeToPrisma` ya esta importado en el archivo (`:15`). Aplicar en `generatePrismaSchema.js:3559`.

### Opcion B (recomendada): quirurgica, cero colateral

```js
const pt = fieldTypeToPrisma(commonField.type, commonField.format, commonField.enum);
let gqlType = pt === 'DateTime' ? 'String' : mapPrismaToGraphQLType(pt);
```

Solo `updatedById` pasa a `Int`. Preserva `createdAt`/`updatedAt` como `String!` (que es como se publican hoy). No introduce superficie nueva.

### Opcion A: espejar el bloque `properties` (1 linea)

```js
let gqlType = mapPrismaToGraphQLType(fieldTypeToPrisma(commonField.type, commonField.format, commonField.enum));
```

Arregla `updatedById` **y ademas** flipea `createdAt`/`updatedAt` de `String!` a `DateTime!` en los 129 tipos (porque `fieldTypeToPrisma("string","date-time")` = `DateTime`). Semanticamente mas correcto para las fechas, pero:
- Amplia la superficie de contrato/introspeccion sin beneficio runtime (esos campos tampoco se consumen por tipo).
- Riesgo teorico de `mergeTypeDefs` si otro typedef declarara el MISMO type con `createdAt: String`. **Verificado sin colision:** los mods con `.graphql` a mano declaran tipos propios (`FlowSession`, `N8nWorkflow`, `HwAssessmentResult`, ...), nombres distintos a los objetos de negocio.

### Comparacion

| | Opcion B | Opcion A |
|---|:---:|:---:|
| Arregla `updatedById` | si | si |
| Toca `createdAt`/`updatedAt` | no | si (a `DateTime`) |
| Superficie de contrato nueva | ninguna | fechas en 129 tipos |
| Riesgo de merge en boot | ninguno | validar (hoy sin colision) |
| Lineas | 3 | 1 |

## 6. Plan de validacion (cualquiera de las dos)

1. Aplicar el cambio en `generatePrismaSchema.js:3559`.
2. `npm run codegen --workspace=@uplanner/object-management-backend`.
3. Arrancar el OM y confirmar que `mergeTypeDefs` no tira en boot.
4. `npm run drift:check`: deben desaparecer los 129 hallazgos de `updatedById`.
5. Regresion de contrato: query GraphQL que devuelva `updatedById` y confirmar tipo `Int`.
6. Smoke UI: un RecordList/RecordDetail que muestre "Ultima modificacion por" (usa `useUserDisplay`) sigue mostrando el nombre.

Si se elige Opcion A, agregar: verificar que ningun consumer trate `createdAt`/`updatedAt` como String en un contexto sensible al tipo (hoy no se encontro ninguno).

## 7. Decision que se pide a Core

1. Confirmar Opcion B (recomendada) u Opcion A.
2. Si aplica: si la unica arista de `mergeTypeDefs` para Opcion A es aceptable, o se prefiere B por conservadora.
3. Owner del fix + ticket para regresion (el cambio regenera typedefs de todos los tenants).

## Referencias

- `object-manager/src/services/codegen/generatePrismaSchema.js:3559` (fix)
- `object-manager/src/services/codegen/generatePrismaSchema.js:364` (bloque Prisma, patron correcto)
- `object-manager/src/services/codegen/generatePrismaSchema.js:3576` (bloque properties, patron correcto)
- `object-manager/src/services/typeMappers.js:202` (`mapPrismaToGraphQLType`)
- `object-manager/src/services/typeMappers.js:282` (`fieldTypeToPrisma`)
- `object-manager/objects/business/common.json` (`updatedById: integer`, nota PLAT-12)
- `layout/src/composables/useUserDisplay.ts` (consumer por nombre, robusto)
