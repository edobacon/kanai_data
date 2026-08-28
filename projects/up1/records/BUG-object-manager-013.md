---
id: BUG-object-manager-013
project: up1
type: bug
module: object-manager
tags:
  - codegen
  - prisma
  - updatedAt
  - builder-symmetry
---

# El marcador "Auto-updated" solo lo leia el builder de modelos core

## Symptom

Un objeto de negocio (JSON bajo `objects/business/`) que declaraba explicitamente un campo `updatedAt` con el marcador "Auto-updated" en su descripcion perdia el atributo `@updatedAt` de Prisma en silencio: el timestamp nunca se actualizaba en escritura, sin error ni warning.

## Expected behavior

Un campo `updatedAt` marcado "Auto-updated" en su descripcion deberia emitir el atributo `@updatedAt` de Prisma sin importar si el objeto es de negocio o core, de modo que el timestamp se actualice en cada escritura.

## Root cause

File: `object-manager/src/services/codegen/generatePrismaSchema.js`. Confirmado por Grep el simbolo `generateBaseModel` (declarado en linea 342); el chequeo del marcador dentro de esa funcion vive en las lineas 515-518. La linea exacta previa al fix (antes de que la funcion incluyera el chequeo) no se confirmo, ya que el fix ya esta aplicado en el working tree actual.

Cause: dos builders de `generatePrismaSchema.js` que deberian espejarse divergieron. El builder de modelos core ya leia "Auto-updated" desde la descripcion del campo para emitir `@updatedAt` (ver el chequeo equivalente en la rama core del codegen, linea 984). El builder de modelos de negocio (`generateBaseModel`) no lo leia, y por eso cualquier objeto de negocio que declarara `updatedAt` explicitamente perdia el atributo silenciosamente.

## Fix

`generateBaseModel` ahora incluye el mismo chequeo que la rama core: `if (fieldDef.description?.includes('Auto-updated')) fieldLine += ' @updatedAt';`, comentado en el codigo como "Honor the audit marker the core-model builder already interprets (see generateCoreModels)". La nulabilidad del campo sigue gobernada por la lista `required`, sin cambio de contrato GraphQL. Sin migracion SQL para los modelos existentes: solo objetos que declaren el marcador explicitamente ganan el atributo desde este fix en adelante.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Objeto de negocio con `updatedAt` + marcador "Auto-updated" | atributo `@updatedAt` perdido en silencio | atributo emitido, timestamp se actualiza en escritura |
| Builders core vs negocio de `generatePrismaSchema.js` | asimetricos en el manejo del marcador | espejados |

## Reproduction

### Steps
1. Crear un objeto de negocio bajo `objects/business/` que declare un campo `updatedAt` con "Auto-updated" en su descripcion.
2. Correr `npm run codegen`.
3. Inspeccionar el modelo generado en `schema.prisma`: el campo no lleva `@updatedAt`.
4. Actualizar una instancia del objeto y verificar que el timestamp no cambia.
