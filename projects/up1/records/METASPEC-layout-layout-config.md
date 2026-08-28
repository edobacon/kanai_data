---
id: METASPEC-layout-layout-config
project: up1
type: doc
module: layout
tags:
  - layout
  - json
  - ui-rendering
---

# Layout Configs

## Artifact Definition

```yaml
name: layout-config
plural: Layouts
description: "JSON config que define como se renderiza un objeto en UI — procesado por LayoutOrchestrator"
location: "mods/{mod}/config/layouts/{objectName}/"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | ID unico del layout (ej: default_StudyNote_list). RULE-layout-010 |
| name | text | si | Nombre del layout (mismo que id). RULE-layout-010 |
| label | text | si | Label visible en UI (texto directo, no key i18n). RULE-layout-011 |
| objectName | reference: json-object | si | Objeto que renderiza |
| layoutType | enum: RecordList, RecordDetail, ChibiList, OfferingCalendar, ImportTaskList, AiChatbox | si | Tipo de renderizado |
| applicationId | text | no | ID de app (null = layout auxiliar, hidden from nav). RULE-layout-007 |
| roles | text[] | no | Roles que pueden ver este layout (server-side filtering). RULE-layout-009 |
| tenants | text[] | si | Tenants donde se inserta el layout. Sin este campo, no se inserta en BD. RULE-layout-010 |
| columns | table: key, label, sortable, filterable, width | no | Columnas (RecordList/ChibiList). Usa `key` no `field`. RULE-layout-010 |
| schema | table: field, type, validation, conditions | no | Schema de campos (RecordDetail) |
| tabs | table: name, label, elements | no | Organizacion en tabs (RecordDetail) |
| filters | table: field, operator, value | no | Filtros predefinidos |
| rowActions | table: label, type, targetLayoutId, dataMapping, requiredCapability | no | Acciones por fila (RecordList) |
| associatedLayouts | table: layoutId, label, relation | no | Layouts relacionados |
| mod | reference: mod | si | Mod al que pertenece |

## Spec Section Template

```markdown
## Layouts

{Descripcion de los layouts que esta feature requiere}

| layoutName | objectName | layoutType | applicationId | Notas |
|------------|------------|-----------|---------------|-------|
| {valor}    | {valor}    | {valor}   | {valor}       | {contexto} |
```

### Layout: {layoutName}

**Tipo**: {layoutType}

**Columnas / Schema:**
| field | type/label | configuracion | description |
|-------|-----------|---------------|-------------|
| {campo} | {tipo} | {detalles} | {descripcion} |

**Row Actions:**
| label | targetLayoutId | requiredCapability | description |
|-------|---------------|-------------------|-------------|
| {accion} | {layout} | {capability} | {descripcion} |

## Requirements

### REQ-01: Renderizado via LayoutOrchestrator

- **Aplica cuando**: Siempre
- **Esperado**: Suite NUNCA renderiza RecordList/RecordDetail directo. Siempre via LayoutOrchestrator
- **Verificacion**: Grep en suite/ por uso directo de RecordList/RecordDetail

### REQ-02: FK display pattern

- **Aplica cuando**: Layout muestra campos FK (UUIDs)
- **Esperado**: Usar relations (lowercase Prisma name), relationDisplayFields (PascalCase Object → field), opcionalmente relationLayoutIds
- **Verificacion**: Verificar que FKs muestran human-readable values, no UUIDs

### REQ-03: parentId placeholder en embedded lists

- **Aplica cuando**: RecordList embebida en RecordDetail (tab related)
- **Esperado**: Filter usa `{{parentId}}` que LayoutOrchestrator resuelve al ID del record padre
- **Verificacion**: Verificar filter config en el layout JSON

### REQ-04: Naming convention default layouts

- **Aplica cuando**: Layout es el default para un objeto
- **Esperado**: Nombre sigue `default_{ObjectName}_{mode}` (ej: default_Person_view)
- **Verificacion**: Verificar naming en config/layouts/

### REQ-05: Sync despues de crear/modificar

- **Aplica cuando**: Layout en mod
- **Esperado**: `npm run sync` (fase Apps&Layouts) copia a la tabla up1_layen_layout
- **Verificacion**: Layout visible en la app despues de sync + seed

## Defaults

```yaml
defaults:
  layoutType: RecordList
  applicationId: null
  roles: []
  parentId_placeholder: "{{parentId}}"
```

## Relations

```yaml
relations:
  - artifact: json-object
    type: requires
    description: "Todo layout renderiza un objeto — el objeto debe existir"
  - artifact: vue-component
    type: suggests
    description: "Layouts complejos pueden requerir componentes custom (Vueform elements, widgets)"
  - artifact: graphql-resolver
    type: suggests
    description: "Row actions o filtros avanzados pueden necesitar resolvers custom"
  - artifact: mod
    type: requires
    description: "Todo layout pertenece a un mod"
```
