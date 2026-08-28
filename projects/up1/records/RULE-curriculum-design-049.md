---
id: RULE-curriculum-design-049
project: up1
type: rule
module: curriculum-design
tags:
  - layout
  - recorddetail
  - fk-escalar
  - select-nativo
  - catalogo
  - references
  - rbac
---

# El NOMBRE de una FK escalar en un RecordDetail se muestra con el select nativo del layout, no con un componente custom

## What

Para mostrar el NOMBRE de una FK escalar (un campo string que guarda el id de un objeto catálogo, SIN relación Prisma) dentro de un RecordDetail, SHOULD usarse el select nativo del layout, no un componente custom. Configuración en el layout, en los tres modos (view / edit / create):

```json
{
  "type": "select",
  "references": "<ObjetoCatalogo>",
  "valueField": "id",
  "displayField": "name"
}
```

En view queda como un select disabled que muestra el nombre; en edit / create es un dropdown buscable que guarda el id.

**Precondición de RBAC**: el rol necesita la capability `<objetocatalogo>:view`, porque el dropdown resuelve las opciones haciendo `listInstances` del catálogo. Sin esa capability el select queda vacío.

## Why

El motor ya resuelve este caso; un componente custom es innecesario y frágil. En `layout/src/layouts/RecordDetail/RecordDetail.vue` lo manejan `fetchReferenceSelectOptions` (~2045) más un branch de `enrichSchemaWithFKMetadata` (~3427) para campos que NO son `isForeignKey` pero declaran `references` + `type: select`. Es un camino distinto del FK automático (RecordDetail.vue ~2264, gateado por `field.isForeignKey`), que exige una relación Prisma real; la FK escalar no la tiene, por eso va por el branch de `references`.

Reemplazar esto por un componente custom duplica lógica que el motor ya provee (fetch del catálogo, binding id↔nombre, estado disabled en view) y hay que mantenerla a mano.

## Where

- `layout/src/layouts/RecordDetail/RecordDetail.vue` — `fetchReferenceSelectOptions`, branch de `enrichSchemaWithFKMetadata` para campos no-FK con `references`.
- Layouts view / edit / create de cualquier objeto con una FK escalar a un catálogo.
- Precedente en producción: `default_Offering_syllabus_create.json` (selector Asignatura → Activity) y ~10 layouts más de otros mods.

## When

Siempre que se muestre una FK escalar por su nombre en un RecordDetail. Antes de escribir un componente custom para "mostrar el nombre de una FK", verificar si basta el select nativo con `references` + `valueField` + `displayField`.

## Verification

- Grep de layouts nuevos: un campo FK escalar que se muestra por nombre declara `type: select` + `references` + `valueField` + `displayField`, no un `component` custom.
- Runtime: en view el campo muestra el nombre (select disabled); en edit / create es un dropdown buscable que persiste el id.
- Confirmar que el rol tiene `<objetocatalogo>:view`; si el dropdown aparece vacío, falta esa capability.

## Source

- Descubierto en UPONE-1619 (Jira): `componentTypeId` → catálogo `InstructionalComponentType`. Se reemplazó un componente custom (`InstructionalComponentTypeName`, eliminado) por el select nativo con `references`.
- Precedente que valida el patrón: `default_Offering_syllabus_create.json`.
