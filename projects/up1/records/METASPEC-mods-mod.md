---
id: METASPEC-mods-mod
project: up1
type: doc
module: mods
tags:
  - mod
  - extension
  - sync
---

# Mods (Modules)

## Artifact Definition

```yaml
name: mod
plural: Mods
description: "Extension autosuficiente que agrega funcionalidad al sistema — se sincroniza a core workspaces"
location: "mods/{modName}/ o up1_mods/{modName}/"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| modName | text | si | Nombre kebab-case del mod (ej: retention-wellbeing) |
| displayName | text | si | Nombre legible (ej: Retention & Wellbeing) |
| description | text | si | Proposito del mod en una linea |
| objects | reference: json-object[] | no | Objetos que define |
| resolvers | reference: graphql-resolver[] | no | Resolvers custom |
| components | reference: vue-component[] | no | Componentes UI |
| layouts | reference: layout-config[] | no | Layouts JSON |
| capabilities | table: name, description, risk_level | no | Permisos RBAC que define |
| events | table: name, trigger, description | no | Eventos BullMQ que publica/consume |
| dependencies | reference: mod[] | no | Otros mods de los que depende |

## Spec Section Template

```markdown
## Mod: {modName}

**Descripcion**: {description}

### Artefactos

| Tipo | Cantidad | Detalle |
|------|----------|---------|
| Objects | {N} | {lista} |
| Resolvers | {N} | {lista} |
| Components | {N} | {lista} |
| Layouts | {N} | {lista} |
| Capabilities | {N} | {lista} |
| Events | {N} | {lista} |

### Capabilities

| name | description | risk_level |
|------|-------------|-----------|
| {capability} | {descripcion} | {low/medium/high} |
```

## Requirements

### REQ-01: Estructura de directorios valida

- **Aplica cuando**: Siempre
- **Esperado**: package.json en raiz. Carpetas opcionales: objects/, logic/, modsComponents/, modsComposables/, config/, css/, lang/, events/, seed/, flows/, tests/
- **Verificacion**: `npm run check-mods` valida estructura

### REQ-02: app.json requerido (RULE-mods-007)

- **Aplica cuando**: Mod tiene navegacion visible
- **Esperado**: `config/app.json` (singular, NO en subcarpeta apps/). Formato: `{ name, label, icon (SVG inline), iconBg, order, tenants[], version, defaultObjects[] }`. El campo `tenants[]` lista explicitamente en que tenants se inserta la app. Sin el, la app no aparece en el sidebar.
- **Verificacion**: Verificar que config/app.json existe, tiene tenants[] con al menos un tenant, y que despues de sync la app aparece en el sidebar

### REQ-03: capabilities.json requerido

- **Aplica cuando**: Mod define permisos
- **Esperado**: capabilities.json en raiz del mod. Naming: mod/{modname}:{action} o {objectname}.{fieldname}:{action}
- **Verificacion**: Verificar formato y naming convention

### REQ-04: Sync obligatorio

- **Aplica cuando**: Siempre despues de cambios
- **Esperado**: `npm run sync` ejecuta 8 fases: Mirror → Merge → Capabilities → Logic → Apps&Layouts → DefaultLayouts → Seeds → PrismaSchema
- **Verificacion**: Artefactos presentes en destinos core

### REQ-05: Nunca modificar core directo

- **Aplica cuando**: Siempre
- **Esperado**: Cambios SOLO en mods/{mod}/. Nunca en layout/src/modsComponents/, suite/modsComponents/, object-manager/src/graphql/resolvers/mods/, etc.
- **Verificacion**: Git diff no muestra cambios en paths synced de core

### REQ-06: Codegen si hay objetos nuevos

- **Aplica cuando**: Mod crea o modifica objetos
- **Esperado**: `npm run sync` + `npm run codegen` despues del cambio
- **Verificacion**: Prisma schema y GraphQL types actualizados

## Defaults

```yaml
defaults:
  location: "mods/"
  sync_required: true
  capabilities_required: true
```

## Relations

```yaml
relations:
  - artifact: json-object
    type: suggests
    description: "Un mod nuevo usualmente define al menos un objeto de negocio"
  - artifact: layout-config
    type: suggests
    description: "Objetos del mod necesitan layouts para ser visibles en UI"
  - artifact: graphql-resolver
    type: suggests
    description: "Logica custom del mod se implementa como resolvers"
  - artifact: vue-component
    type: suggests
    description: "UI custom del mod se implementa como modsComponents"
```
