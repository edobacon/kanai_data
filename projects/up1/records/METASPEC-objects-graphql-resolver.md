---
id: METASPEC-objects-graphql-resolver
project: up1
type: doc
module: objects
tags:
  - graphql
  - apollo
  - backend
---

# GraphQL Resolvers

## Artifact Definition

```yaml
name: graphql-resolver
plural: Resolvers
description: "Funcion GraphQL custom que extiende CRUD auto-generado — siempre con .schema.graphql pair"
location: "mods/{mod}/logic/{resolver}.resolver.js + {resolver}.schema.graphql"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| name | text | si | Nombre camelCase del resolver (ej: reportDataResolver) |
| type | enum: Query, Mutation | si | Tipo de operacion GraphQL |
| schema | text | si | Definicion GraphQL (extend type Query/Mutation) |
| auth | enum: public, withAuth, withObjectAuth | si | Nivel de proteccion RBAC |
| capabilities | text | no | Capabilities requeridas si auth = withAuth (ej: mod/reports:read) |
| input | table: field, type, required, description | no | Parametros de entrada |
| output | table: field, type, description | si | Campos de respuesta |
| related_object | reference: json-object | no | Objeto principal que opera |
| mod | reference: mod | si | Mod al que pertenece |

## Spec Section Template

```markdown
## Resolvers

{Descripcion de los resolvers custom que esta feature requiere}

| name | type | auth | capabilities | input | output | Notas |
|------|------|------|-------------|-------|--------|-------|
| {valor} | {valor} | {valor} | {valor} | {resumen} | {resumen} | {contexto} |
```

### Resolver: {name}

**Schema GraphQL:**
```graphql
extend type {Query|Mutation} {
  {name}({params}): {ReturnType}
}
```

**Input:**
| field | type | required | description |
|-------|------|----------|-------------|
| {campo} | {tipo} | {si/no} | {descripcion} |

**Output:**
| field | type | description |
|-------|------|-------------|
| {campo} | {tipo} | {descripcion} |

## Requirements

### REQ-01: Const name con Query/Mutation

- **Aplica cuando**: Siempre
- **Esperado**: La const exportada DEBE contener 'Query' o 'Mutation' en el nombre
- **Verificacion**: Grep por const.*export en el archivo

### REQ-02: Schema pair obligatorio

- **Aplica cuando**: Siempre
- **Esperado**: Cada .resolver.js tiene un .schema.graphql companion
- **Verificacion**: Verificar que ambos archivos existen

### REQ-03: Extend type, nunca redefine

- **Aplica cuando**: Siempre
- **Esperado**: Schema usa `extend type Query` o `extend type Mutation`, nunca `type Query`
- **Verificacion**: Grep en .schema.graphql

### REQ-04: Tenant filtering

- **Aplica cuando**: Siempre que opera datos con tenantId
- **Esperado**: Toda query Prisma filtra por context.tenantId
- **Verificacion**: Revisar where clauses en el resolver

### REQ-05: Sync despues de crear

- **Aplica cuando**: Resolver en mod
- **Esperado**: `npm run sync` copia a object-manager/src/graphql/resolvers/mods/{mod}/
- **Verificacion**: Archivo presente en destino despues de sync

## Defaults

```yaml
defaults:
  auth: withAuth
  type: Query
```

## Relations

```yaml
relations:
  - artifact: json-object
    type: suggests
    description: "Un resolver custom usualmente opera sobre un objeto existente"
  - artifact: mod
    type: requires
    description: "Todo resolver custom pertenece a un mod"
  - artifact: vue-component
    type: suggests
    description: "Un resolver que expone datos nuevos puede requerir UI para consumirlo"
```
