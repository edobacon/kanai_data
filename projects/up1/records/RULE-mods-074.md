---
id: RULE-mods-074
project: up1
type: rule
module: mods
level: should
tags:
  - UPONE-1749
  - UPONE-1750
  - UPONE-1751
  - UPONE-1742
  - idColumn
  - relationDisplayFields
  - fk-display
---

# Un objeto del mod que otros referencian declara `metadata.idColumn` con su campo legible; `relationDisplayFields` queda para las excepciones del layout

## What

Al crear o modificar un objeto que es destino de FKs (catalogos, planes, actividades, matrices), declarar en su JSON (`mods/<mod>/objects/<Objeto>.json`) `metadata.idColumn` con un campo propio, escalar y estable (`code` o `name`):

```json
"metadata": {
  "label": "Linea de actividad",
  "labelPlural": "Lineas de actividad",
  "defaultLayoutType": "RecordList",
  "idColumn": "code"
}
```

Con eso, toda columna FK de un RecordList (y su export) que apunte al objeto muestra ese valor en vez del id, y los filtros sobre campos de referencia aceptan el texto legible, sin tocar layout por layout. Un layout nuevo solo declara `relationDisplayFields` cuando necesita OTRO campo o varios (p. ej. `["firstName","lastName"]`).

Precedencia (igual en celda, export y filtro): `relationDisplayFields` del layout > `idColumn` del objeto referenciado > id crudo. Un mapeo para otra relacion no cuenta.

## Why

Evita repetir el mismo mapeo en cada layout y el caso "la celda muestra un CUID" cuando una lista nueva olvida su `relationDisplayFields`. Es aditivo: con `idColumn` NULL todo se comporta como antes.

## Reglas de uso

- **Campo elegible**: uno solo, propio y escalar. Quedan fuera `id`, `createdAt`, `updatedAt`, las columnas de plataforma (`createdById`, `updatedById`, `deletedAt`, `deletedById`, `tenantId`, `recordType`), las FKs, `json`/`object`, `formula` y `boolean`. Preferir un `code` o `name` que identifique al registro para un humano, no una descripcion larga.
- **Sin validacion desde el JSON**: un nombre mal escrito equivale a "sin configurar" y la FK sigue mostrando el id crudo. Verificar que el campo exista en `properties`.
- **RecordTypes**: cada `rt__X__base` tiene su propia fila en `core_ObjectDefinition` y declara su propio `idColumn` en su metadata. No hereda el del objeto base.
- **Semantica del sync**: se registra como `metadata.idColumn || existente`. Si el JSON lo declara, pisa en cada sync lo que el tenant haya elegido en el editor de objetos (UP1 Manager, pestaña Metadata). Quitar la clave del JSON NO lo borra: se limpia desde el editor o enviando `null` por GraphQL (`updateObjectDefinition`).
- **Filtros**: `EQUALS`/`IN` sobre la FK se reescriben a `rel.<idColumn> = v OR <fk>Id = v`; los negativos (`NOT_EQUALS`, `NOT_IN`) combinan con AND. Los valores de `{{placeholder}}` y los operadores `IS_NULL`/`IS_NOT_NULL` NO se reescriben. Si el campo elegido no es unico, filtrar por texto puede traer mas de un registro. La UI de filtros sigue ofreciendo solo operadores exactos (CONTAINS pendiente de decision).
- **PDF**: si el objeto raiz de `generateDocument` tiene `idColumn`, el archivo se llama `<callId>-<idColumn>.pdf` (UPONE-1742).
- **No aplica a RecordDetail** (view/edit/create): ahi sigue RULE-curriculum-design-049 (select nativo con `references` + `displayField`) y los `relationDisplayFields` del layout de detalle. No quitar esos mapeos al adoptar `idColumn`.
- **Custom resolvers**: los resolvers propios que resuelven nombres por Prisma (fuera de `listInstances`) no se benefician; `idColumn` actua solo en la ruta generica.

## Where

- `mods/<mod>/objects/*.json` (bloque `metadata`), incluidos los `rt__*`.
- Motor: `object-manager/src/services/codegen/generatePrismaSchema.js` (registro/sync), `src/graphql/resolvers/instance.resolver.js` (include y reescritura de filtros), `layout/src/utils/recordListFormatters.ts` (`resolveRelationDisplayFields`).

## When

Al crear un objeto nuevo que otros van a referenciar, o al tocar uno existente que ya es destino de FKs y no declara `idColumn`. Tambien al crear un RecordList nuevo: antes de agregar `relationDisplayFields`, verificar si el objeto destino ya declara `idColumn` y alcanza.

## Verification

- `npm run sync` y recargar el layout (el campo llega con `getObjectFields`).
- Una lista sin `relationDisplayFields` para ese objeto muestra el `idColumn` en la columna FK y en el export.
- Filtrar la FK por el valor legible devuelve el registro; filtrar por id sigue funcionando.
- Revisar que el campo elegido exista en `properties` y sea elegible.

## Source

- UPONE-1749 (epic), UPONE-1750, UPONE-1751; UPONE-1742 (nombre del PDF). Mergeado en develop de object-manager (PR #550), layout (PR #385) y up1-manager.
- `object-manager/docs/features/salesforce-metadata.md` (seccion idColumn); `mods/.ai/PATTERNS.md` ("FK Display Pattern").
- Complementa RULE-layout-fk-idcolumn-fallback-UPONE-1750, RULE-layout-002, RULE-layout-033 y RULE-curriculum-design-049.
