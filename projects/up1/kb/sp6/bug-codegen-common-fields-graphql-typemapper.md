# Bug de codegen: common fields mapeados a `String` en GraphQL (drift `updatedById`)

> **Estado:** detectado, sin corregir. Preexistente en `develop`.
> **Ambito:** `object-manager` (core), servicio de codegen.
> **Severidad:** media. No rompe el arranque actual, pero produce un contrato de API inconsistente y drift permanente.
> **Detectado:** 2026-07-17, durante la actualizacion de todos los repos a `develop` y la validacion con `npm run drift:check`.

## TL;DR

El generador de codigo (`generatePrismaSchema.js`) produce los **common fields** con el tipo GraphQL equivocado. El caso mas claro es `updatedById`: la fuente lo define como `integer` y la columna Prisma es `Int`, pero el typeDef GraphQL lo expone como `String`. El mismo defecto afecta a `createdAt`/`updatedAt` (salen `String` cuando la capa OM/TS los considera `DateTime`).

La causa es una sola: en la rama de common fields, el codegen le pasa el tipo **crudo de JSON Schema** (`integer`, `string`) a un mapper que espera tipos **Prisma** (`Int`, `String`), y ante un tipo desconocido cae al `default: String`.

## Como se detecto

Al mover los repos a `develop` y correr la validacion canonica:

```bash
npm run drift:check --workspace=object-manager
```

Resultado:

```
DRIFT DETECTED: 74 errors across 203 total findings

  [1/8] Generated Prisma schema      ✓ No drift detected
  [2/8] Generated GraphQL typeDefs   ✗ 67 errors, 8 warnings
  [3/8] Mod object JSON files        ✗ 0 errors, 27 info
  [4/8] Mod GraphQL schemas          ✗ 7 errors, 10 info
  [5/8] TypeScript interfaces        ✗ 0 errors, 11 warnings
  [6/8] Layout config JSONs          ✗ 0 errors, 70 warnings
  [7/8] Event definitions            ✗ 0 errors, 3 warnings
  [8/8] External Prisma schemas      ✓ No drift detected
```

De los 74 errores, **67 son este bug**, todos con la misma forma:

```
❌ AcademicProgram.updatedById: GraphQL type mismatch (expected: Int, got: String)
❌ Activity.updatedById:        GraphQL type mismatch (expected: Int, got: String)
❌ Attendance.updatedById:      GraphQL type mismatch (expected: Int, got: String)
... (un error por cada objeto que hereda el campo comun)
```

El patron es uniforme: **un unico campo (`updatedById`) fallando en todos los objetos por igual**. Eso descarta un problema por objeto y apunta a la generacion de los campos comunes.

## Evidencia: las tres capas no coinciden

Mismo campo `updatedById`, tres definiciones:

| Capa | Archivo | Valor | Correcto? |
|------|---------|-------|-----------|
| 1. Fuente | `objects/business/common.json` | `"type": "integer"` | referencia |
| 2. Prisma / DB | `prisma/UPU/schema.prisma` | `updatedById Int?` | si, coincide con la fuente |
| 3. GraphQL API | `src/graphql/typeDefs/dynamic.js` | `updatedById: String` | no, deberia ser `Int` |

La definicion fuente incluso lo aclara:

```json
"updatedById": {
  "type": "integer",
  "description": "core_User id del ultimo usuario que modifico el registro (auditoria). ... Columna escalar Int, SIN FK ni relacion ... PLAT-12 (UPONE-1194)."
}
```

### Alcance mas alla de `updatedById`

El mismo defecto toca los otros common fields no-string:

| Campo comun | `type` en `common.json` | GraphQL generado | Esperado |
|-------------|-------------------------|------------------|----------|
| `updatedById` | `integer` | `String` | `Int` |
| `createdAt` | `string` + `format: date-time` | `String!` | `DateTime` |
| `updatedAt` | `string` + `format: date-time` | `String!` | `DateTime` |

`updatedById` aparece como **error** de GraphQL (Int vs String). `createdAt`/`updatedAt` no disparan error de GraphQL (la fuente literal dice `string`), pero si generan warnings en la capa TypeScript:

```
⚠️  Report.createdAt: TS type differs from OM (expected: DateTime (OM), got: string (TS))
⚠️  Report.updatedAt: TS type differs from OM (expected: DateTime (OM), got: string (TS))
```

Es el mismo origen manifestandose en dos capas distintas.

## Causa raiz

El generador tiene dos ramas para armar los campos de un tipo GraphQL, en `src/services/codegen/generatePrismaSchema.js`:

**Rama de common fields (linea ~3550), defectuosa:**

```js
commonFields.forEach(commonField => {
  ...
  let gqlType = mapPrismaToGraphQLType(commonField.type); // <-- recibe "integer" (JSON Schema)
  fields.push(`  ${commonField.name}: ${gqlType}...`);
});
```

**Rama de properties normales (linea ~3567), correcta:**

```js
const prismaType = fieldTypeToPrisma(fieldDef.type, fieldDef.format); // "integer" -> "Int"
let gqlType = mapPrismaToGraphQLType(prismaType);                     // "Int" -> "Int"
```

La diferencia: la rama de properties **primero** normaliza JSON Schema a Prisma con `fieldTypeToPrisma`, y **despues** mapea a GraphQL. La rama de common fields se saltea ese paso y le entrega el tipo crudo.

El mapper (`src/services/typeMappers.js:118`) hace switch sobre tipos Prisma y cae a `String` ante cualquier valor desconocido:

```js
export function mapPrismaToGraphQLType(prismaType) {
  if (!prismaType) return 'String';
  switch (prismaType) {
    case 'String': return 'String';
    case 'Int':
    case 'BigInt': return 'Int';
    case 'Float':
    case 'Decimal': return 'Float';
    case 'Boolean': return 'Boolean';
    case 'DateTime': return 'DateTime';
    case 'Json': return 'JSON';
    default: return 'String';   // <-- "integer" y "string" caen aca
  }
}
```

`"integer"` no matchea `"Int"`, entonces cae al `default` y sale `String`.

### Origen del cambio

La linea defectuosa fue introducida por un refactor de tipos del codegen del **2025-10-13** (commit `dac84610`, subject: *"Uso del typeMapper correcto, eliminacion de 'Codigo Inutil'"*). Ese cambio reemplazo el mapper que si entendia JSON Schema por `mapPrismaToGraphQLType`, sin agregar la conversion previa:

```diff
- import { ... mapPrismaToGraphQLType, mapFieldTypeToGraphQL, ... }
+ import { ... mapPrismaToGraphQLType, ... }        // se elimino mapFieldTypeToGraphQL

-  let gqlType = mapFieldTypeToGraphQL(commonField.type);   // entendia "integer" -> Int
+  let gqlType = mapPrismaToGraphQLType(commonField.type);  // no lo entiende -> String
```

`mapFieldTypeToGraphQL` (el mapper de tipos JSON Schema) fue tratado como codigo muerto y removido, pero era justamente el correcto para `commonField.type`. La rama de properties fue corregida despues agregando `fieldTypeToPrisma`, pero **la rama de common fields quedo sin ese arreglo**. Por eso el bug pega solo en los campos comunes y de forma uniforme en todos los objetos.

## Que error genera / impacto actual

- **Contrato de API inconsistente:** el schema GraphQL declara `updatedById: String` mientras la columna es `Int`. En lectura, Postgres devuelve un entero y GraphQL lo coacciona a string (retorna `"123"` en vez de `123`).
- **Drift permanente:** `npm run drift:check` falla con 67 errores en cada corrida. Al ser exit code 1, cualquier gate o pipeline que dependa de drift:check queda en rojo de forma cronica, y enmascara drift nuevo/real que aparezca despues.
- **Ruido en validaciones:** ademas de los 67 errores, arrastra warnings de TS por `createdAt`/`updatedAt`.
- No rompe el arranque del backend ni el flujo actual porque `updatedById` lo setea el resolver desde el contexto de auth (el cliente no lo envia), y las lecturas se coaccionan.

## Que puede significar a futuro

- **Fallos silenciosos en filtros/orden:** si en algun momento el frontend o un consumidor filtra, ordena o compara por `updatedById` via GraphQL tratandolo como `String` contra una columna `Int`, puede fallar la query o devolver resultados vacios sin error claro.
- **Tipos incorrectos propagados al frontend:** el codegen de tipos TS del cliente hereda `String`/`string`, arrastrando el tipo equivocado a componentes y validaciones aguas abajo (ya se ve en `createdAt`/`updatedAt` como `string` en vez de `DateTime`).
- **Gate de drift inutilizable:** mientras esto exista, `drift:check` nunca da verde. Un equipo que lo use como control de calidad pierde la senal (todo esta rojo, entonces se ignora), y drift real futuro pasa desapercibido.
- **Riesgo de regresion mas amplia:** cualquier common field nuevo con tipo no-string (numero, boolean, fecha) heredara el mismo defecto automaticamente en todos los objetos.

## Como solucionarlo

Fix de una linea: normalizar el tipo antes de mapear en la rama de common fields, igual que ya hace la rama de properties.

En `src/services/codegen/generatePrismaSchema.js` (linea ~3550):

```diff
- let gqlType = mapPrismaToGraphQLType(commonField.type);
+ let gqlType = mapPrismaToGraphQLType(fieldTypeToPrisma(commonField.type, commonField.format));
```

`fieldTypeToPrisma` ya esta importado en el archivo y ya se usa en la rama de properties, asi que no hay dependencias nuevas. Pasarle tambien `commonField.format` asegura que `date-time` resuelva a `DateTime` (arregla de paso `createdAt`/`updatedAt`).

Alternativa equivalente: restaurar `mapFieldTypeToGraphQL` (el mapper de JSON Schema) para la rama de common fields, si sigue existiendo en el historial.

### Verificacion del fix

```bash
# 1. Regenerar
npm run codegen --workspace=object-manager

# 2. Confirmar el typeDef
grep -m1 "updatedById" object-manager/src/graphql/typeDefs/dynamic.js
#   esperado: updatedById: Int

# 3. Drift limpio en la seccion GraphQL
npm run drift:check --workspace=object-manager
#   esperado: [2/8] Generated GraphQL: 0 errors (bajan 67 errores)
#   createdAt/updatedAt deberian pasar a DateTime y limpiar los warnings TS asociados
```

### Propagacion (revisar antes de dar por cerrado)

- Confirmar que ningun resolver ni consumidor dependa de recibir `updatedById` como `String`. Si el frontend lo trata como string en algun lado, ajustar junto con el fix.
- Regenerar los tipos TS del cliente y revisar que `createdAt`/`updatedAt` pasen a `DateTime` sin romper componentes que hoy los consumen como `string`.
- Al ser cambio en core sobre `develop`, coordinar el merge para que la baseline de `drift:check` quede en verde y el gate vuelva a ser util.

## Referencias

- Definicion fuente: `object-manager/objects/business/common.json` (campo `updatedById`)
- Codegen (rama defectuosa): `object-manager/src/services/codegen/generatePrismaSchema.js:3550`
- Codegen (rama correcta, patron a copiar): `object-manager/src/services/codegen/generatePrismaSchema.js:3567`
- Mapper: `object-manager/src/services/typeMappers.js:118` (`mapPrismaToGraphQLType`)
- Artefacto afectado: `object-manager/src/graphql/typeDefs/dynamic.js`
- Validacion: `npm run drift:check` (seccion `[2/8] Generated GraphQL typeDefs`)
- Origen del cambio: commit `dac84610` (2025-10-13)
