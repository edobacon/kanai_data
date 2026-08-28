---
id: RULE-layout-033
project: up1
type: rule
module: layout
tags:
  - record-list
  - relation-display-fields
  - fk-rendering
  - declarative
---

# Para mostrar el `name` (u otro field) de un FK relation en una columna RecordList como texto plano: agregar entry en `relationDisplayFields` del layoutConfig

## What

Cuando un RecordList del layout JSON tiene una columna que apunta a un FK (foreign key relation), por default el `TableCell` la renderea como link clickeable. Para mostrar un field especifico de la relation como **texto plano sortable** (sin link, sin badge, sin cell renderer custom), agregar entry en `relationDisplayFields` del `layoutConfig`:

```json
{
  "layoutType": "RecordList",
  "layoutConfig": {
    "columns": [
      { "key": "name", "label": "Nombre", "sortable": true },
      { "key": "currentStatusId", "label": "Estado", "sortable": true },  // <- FK
      { "key": "executionUnitId", "label": "Unidad", "sortable": true }   // <- FK
    ],
    "relationDisplayFields": {
      "workflowStatus": "name",   // <- mapeo objectName de la entidad target → field a mostrar
      "OrgUnit": "name"           // <- mapeo idem
    }
  }
}
```

El TableCell renderea el `status.name` (o equivalente) como texto plano, no como link. Mantiene sortable por `status.code` (u otro field configurable) y filterable. NO requiere Vueform renderer custom ni componente Vue propio.

## Why

RecordList no soporta Vueform renderers como cell renderers (descubierto empiricamente en TICKET-025 H3 + DEC-LOCAL-03 de SPEC-006). El TableCell renderea segun tipo:

- Boolean → checkbox
- Date/Datetime → formato fecha
- FK con `isForeignKey: true` → link clickeable al record relacionado
- URL → link externo
- Plaintext → `<span>`

`relationDisplayFields` cambia el rendering del FK de "link clickeable" a "texto plano del field configurado" — patron declarativo sin codigo.

## Where

- **Files**: `mods/<mod>/config/layouts/<*>_list.json` o cualquier layout JSON con `layoutType: "RecordList"`
- **Component consumer**: `layout/src/components/molecules/TableCell.vue`
- **Layers**: frontend (RecordList + TableCell rendering)

## When

Aplica cuando:

- Tu columna del list es un FK pero queres mostrar el `name` (o otro field) de la entidad relacionada como **texto plano**, no link
- Queres evitar la complejidad de Vueform cell renderer custom (que no funciona, ver DEC-LOCAL-03 SPEC-006)
- El TableCell default (FK → link) no es lo que el UX pide

NO aplica si:

- Queres link clickeable al record relacionado (TableCell default ya hace eso)
- Queres rendering visual rico (badge, color, icono) — eso requiere extension de TableCell o componente custom (out of scope para esta rule)

## Verification

```bash
# Buscar precedente en el mod
grep -A 5 "relationDisplayFields" mods/<mod>/config/layouts/*_list.json
# Expected: layouts con relationDisplayFields mapean ObjectName → displayField

# Smoke en UPU: abrir el list, verificar que la columna FK muestra el name como texto
# (no como link clickeable)
```

## Source

- **Discovered in**: TICKET-025, Session 3 (S3.T1 columna Estado texto plano en list)
- **Evidence**: Tras descubrir que RecordList no soporta Vueform renderers (DEC-LOCAL-03), busque patron declarativo. Hallado: `executionUnitId` (FK a OrgUnit) del `default_activity_list.json` ya usaba `relationDisplayFields: { "OrgUnit": "name" }`. Replicado para el nuevo campo `currentStatusId` agregando `"workflowStatus": "name"`. Aprendizaje L13 del ticket. Commit `b757661` curriculum-design
- **Related**: RULE-layout-016 (default sort), DEC-LOCAL-03 de SPEC-006 (list no soporta Vueform renderers)
