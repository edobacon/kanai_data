---
id: METASPEC-objects-json-object
project: up1
type: doc
module: objects
tags:
  - schema-driven
  - codegen
  - prisma
---

# JSON Object Definitions

## Artifact Definition

```yaml
name: json-object
plural: Objects
description: "Definicion JSON de una entidad de negocio — source of truth para DB (Prisma) y API (GraphQL)"
location: "mods/{mod}/objects/ o object-manager/objects/business/"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| objectName | text | si | Nombre PascalCase del objeto (ej: TimeBlockTemplate) |
| namespace | text | no | Prefijo de namespace (ej: core_, up1_, ext__CLIENT__) |
| labelSingular | text | si | Etiqueta singular para UI |
| labelPlural | text | si | Etiqueta plural para UI |
| fields | table: name, type, required, unique, default, description | si | Campos del objeto |
| relations | table: target, type, fk, description | no | Relaciones con otros objetos |
| indexes | table: fields, unique | no | Indices adicionales |
| tenantScoped | enum: true, false | si | Si filtra por tenantId (casi siempre true) |
| mod | reference: mod | si | Mod al que pertenece |

## Spec Section Template

```markdown
## Objects

{Descripcion de los objetos que esta feature requiere}

| objectName | namespace | tenantScoped | Campos clave | Relaciones | Notas |
|------------|-----------|-------------|--------------|------------|-------|
| {valor}    | {valor}   | {valor}     | {valor}      | {valor}    | {contexto} |
```

### Object: {objectName}

| name | type | required | unique | default | description |
|------|------|----------|--------|---------|-------------|
| {campo} | {tipo} | {si/no} | {si/no} | {valor} | {descripcion} |

## Requirements

### REQ-01: Tenant isolation obligatorio

- **Aplica cuando**: tenantScoped = true (default)
- **Esperado**: El objeto incluye campo tenantId y toda query filtra por el
- **Verificacion**: Revisar schema generado y resolvers

### REQ-02: Codegen sync

- **Aplica cuando**: Siempre que se crea o modifica un objeto
- **Esperado**: Ejecutar `npm run codegen` despues del cambio + `npm run sync` si esta en un mod
- **Verificacion**: Prisma schema regenerado, GraphQL types actualizados

### REQ-03: Naming convention

- **Aplica cuando**: Siempre
- **Esperado**: objectName en PascalCase. Campos en camelCase. Namespace snake_case si aplica
- **Verificacion**: Lint del nombre contra patron

### REQ-04: No editar archivos auto-generados

- **Aplica cuando**: Siempre
- **Esperado**: Modificar solo el JSON source, nunca el Prisma schema ni GraphQL types generados
- **Verificacion**: Verificar que cambios estan en objects/*.json, no en prisma/ ni typeDefs/

## Defaults

```yaml
defaults:
  tenantScoped: true
  namespace: ""
  fields_base:
    - { name: id, type: uuid, required: true }
    - { name: tenantId, type: uuid, required: true }
    - { name: createdAt, type: datetime, required: true }
    - { name: updatedAt, type: datetime, required: true }
```

## Relations

```yaml
relations:
  - artifact: graphql-resolver
    type: generates
    description: "Codegen genera CRUD resolvers automaticamente. Custom resolvers extienden"
  - artifact: layout-config
    type: suggests
    description: "Un objeto nuevo sugiere crear layouts (RecordList + RecordDetail minimo)"
  - artifact: mod
    type: requires
    description: "Todo objeto pertenece a un mod"
```
