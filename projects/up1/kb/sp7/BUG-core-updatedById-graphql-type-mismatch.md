# BUG core: `updatedById` GraphQL type mismatch (expected Int, got String)

> Analisis de drift detectado durante `sync` / `drift:check` en la plataforma up1 (develop, 2026-07-27). Doc local de plataforma, no se commitea al repo de codigo.

## Sintoma

`drift:check` (Fase 10 del sync) reporta, en 129 objetos:

```
❌ <Model>.updatedById: GraphQL type mismatch (expected: Int, got: String)
```

Se replica en todos los objetos que heredan el campo comun `updatedById`.

## Causa raiz

Bug en el generador de typedefs GraphQL, en un solo lugar:

`object-manager/src/services/codegen/generatePrismaSchema.js:3559`

```js
let gqlType = mapPrismaToGraphQLType(commonField.type);   // ❌
```

`mapPrismaToGraphQLType()` (`object-manager/src/services/typeMappers.js:202`) espera un **tipo Prisma** (`Int`, `String`, `DateTime`...) y su `switch` cae a `default: return 'String'` para lo que no reconoce. Aca se le pasa el tipo **JSON-schema del OM** en minuscula (`"integer"`), que no matchea el case `"Int"`, entonces cae a default y devuelve `String`.

Los otros dos caminos del mismo codegen convierten primero el tipo y por eso quedan correctos:

- Bloque Prisma (`generatePrismaSchema.js:364`): `fieldTypeToPrisma(type, format, enum)`. Por eso el schema Prisma genera `updatedById Int?` bien.
- Bloque `properties` de GraphQL (`generatePrismaSchema.js:3576`): `mapPrismaToGraphQLType(fieldTypeToPrisma(...))`. Correcto.

El bloque de **common fields** (3559) se salteo esa conversion.

### Estado por capa

| Capa | Tipo de `updatedById` | Correcto? |
|------|----------------------|-----------|
| Definicion OM (`objects/business/common.json`) | `integer` | fuente de verdad |
| Prisma schema / DB (`prisma/*/schema.prisma`) | `Int?` | si |
| Typedef GraphQL (`typeDefs/dynamic.js`) | `String` | **no (bug)** |

`common.json` solo define `updatedById` como campo comun de tipo `integer` (no hay `createdById`), por eso el drift es unicamente de `updatedById`.

## Ticket que ingreso el bug

El drift lo activo el ticket que convirtio `updatedById` a `integer` escalar:

- **UPONE-1194** (PLAT-12) "implementacion Plat-12 updatedById"
  - Commit `d46d2802` (Nicolas Goldstein, 2026-06-21) en `curriculum-design` / repo OM: cambia `updatedById` a `integer` escalar en `common.json`.
  - Commit `8d9e3e72` (Nicolas Goldstein, 2026-06-22): "Remove unnecesary ForeignKeys" (quita la FK de `updatedById`).

Antes de UPONE-1194 el campo era String/FK, y `default -> String` daba el resultado correcto por casualidad. Al pasar a `integer`, Prisma quedo en `Int` pero el typedef GraphQL siguio en `String`, y ahi aparecio el mismatch.

### Defecto latente previo (sin ticket)

La linea buggeada 3559 es mas vieja y estuvo latente:

- Commit `dac84610c` (Nicolas Goldstein, 2025-10-13) "Uso del typeMapper correcto, eliminacion de 'Codigo Inutil'". **Sin ticket asociado.**
- El bloque `properties` si se corrigio despues en commit `41d558457` (Juan Domenech, 2026-01-02), pero nadie backporteo ese arreglo al bloque de common fields.

**Conclusion:** el ticket que hizo aparecer el bug en produccion/develop es **UPONE-1194 (PLAT-12)**. El defecto de codegen subyacente no tiene ticket (viene del refactor `dac84610c`).

## Impacto

- Runtime: bajo. GraphQL coacciona el `Int` de la DB al scalar `String` (`123` sale como `"123"`). La UI resuelve el campo por nombre, no por tipo.
- Contrato: inexacto (el tipo publicado no coincide con la DB).
- Ruido: 129 hallazgos `error` en cada `drift:check`, que enmascaran drift real.

No lo introdujo el update de develop del 2026-07-27; ya venia en develop.

## Fix propuesto (no aplicado)

`object-manager` es CORE, requiere OK explicito. Es cambio de codegen que regenera los typedefs de todos los tenants; conviene `db push` no destructivo + sync despues de aplicar.

### Opcion A: espejar el bloque `properties` (1 linea)

```js
let gqlType = mapPrismaToGraphQLType(fieldTypeToPrisma(commonField.type, commonField.format, commonField.enum));
```

Arregla `updatedById -> Int`. **Colateral:** flipea `createdAt`/`updatedAt` de `String!` a `DateTime!` en los 129 objetos (`fieldTypeToPrisma("string","date-time")` = `DateTime`). Cambia el contrato de las fechas para todos los consumers.

### Opcion B: quirurgica, cero colateral (recomendada)

```js
const pt = fieldTypeToPrisma(commonField.type, commonField.format, commonField.enum);
let gqlType = pt === 'DateTime' ? 'String' : mapPrismaToGraphQLType(pt);
```

Solo `updatedById` pasa a `Int`. Preserva `createdAt`/`updatedAt` como `String!`.

`fieldTypeToPrisma` ya esta importado en el archivo (linea 15).

### Validacion

1. Aplicar el cambio en `generatePrismaSchema.js:3559`.
2. `npm run codegen --workspace=@uplanner/object-management-backend`.
3. `drift:check`: los 129 hallazgos de `updatedById` deben desaparecer.
4. Verificar que `createdAt`/`updatedAt` no cambiaron (Opcion B) o que el cambio a `DateTime` es aceptado por los consumers (Opcion A).
5. Regression: query GraphQL que devuelva `updatedById` y confirmar tipo `Int`.

## Archivos

- `object-manager/src/services/codegen/generatePrismaSchema.js:3559` (fix)
- `object-manager/src/services/typeMappers.js:202` (`mapPrismaToGraphQLType`)
- `object-manager/objects/business/common.json` (definicion `updatedById`)
