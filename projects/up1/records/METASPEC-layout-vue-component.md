---
id: METASPEC-layout-vue-component
project: up1
type: doc
module: layout
tags:
  - vue3
  - atomic-design
  - composition-api
---

# Vue Components

## Artifact Definition

```yaml
name: vue-component
plural: Components
description: "Componente Vue 3 con Composition API — sigue Atomic Design (atom/molecule/organism)"
location: "mods/{mod}/modsComponents/{ComponentName}/ o layout/src/components/{layer}/"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| name | text | si | Nombre PascalCase del componente |
| layer | enum: atom, molecule, organism, page | si | Nivel en Atomic Design |
| props | table: name, type, required, default, description | no | Props que recibe |
| emits | table: event, payload, description | no | Eventos que emite |
| slots | table: name, scoped, description | no | Slots disponibles |
| composables | reference: composable[] | no | Composables que usa |
| dependencies | reference: vue-component[] | no | Otros componentes que consume |
| mod | reference: mod | si | Mod al que pertenece (si es modsComponent) |
| storybook | enum: true, false | no | Si tiene story en Storybook |

## Spec Section Template

```markdown
## Components

{Descripcion de los componentes UI que esta feature requiere}

| name | layer | props clave | emits | Notas |
|------|-------|-------------|-------|-------|
| {valor} | {valor} | {resumen} | {resumen} | {contexto} |
```

### Component: {name}

**Props:**
| name | type | required | default | description |
|------|------|----------|---------|-------------|
| {prop} | {tipo} | {si/no} | {valor} | {descripcion} |

**Emits:**
| event | payload | description |
|-------|---------|-------------|
| {evento} | {tipo} | {descripcion} |

## Requirements

### REQ-01: Atomic Design hierarchy

- **Aplica cuando**: Componente en layout/
- **Esperado**: Atoms encapsulan Bootstrap (nunca clases Bootstrap en molecules/organisms). Molecules combinan atoms. Organisms combinan molecules
- **Verificacion**: Grep por clases Bootstrap en archivos molecule/organism — deben estar ausentes

### REQ-02: Composition API obligatoria

- **Aplica cuando**: Siempre
- **Esperado**: `<script setup lang="ts">`. No Options API
- **Verificacion**: Verificar tag script en .vue

### REQ-03: Typed props, no any

- **Aplica cuando**: Siempre
- **Esperado**: Props con tipos TypeScript especificos. Sin `any`
- **Verificacion**: Revisar defineProps<>()

### REQ-04: Apollo via useTenantApolloClient

- **Aplica cuando**: Componente que hace queries GraphQL
- **Esperado**: Usar useTenantApolloClient(), no importar Apollo Client directo
- **Verificacion**: Grep imports Apollo en el componente

### REQ-05: Sync si es modsComponent

- **Aplica cuando**: Componente en mods/{mod}/modsComponents/
- **Esperado**: `npm run sync` copia a layout/src/modsComponents/ y suite/modsComponents/
- **Verificacion**: Archivo presente en ambos destinos despues de sync

## Defaults

```yaml
defaults:
  layer: molecule
  storybook: true
  script_setup: true
  lang: ts
```

## Relations

```yaml
relations:
  - artifact: graphql-resolver
    type: suggests
    description: "Un componente que muestra datos puede necesitar un resolver custom"
  - artifact: layout-config
    type: suggests
    description: "Componentes custom pueden necesitar registrarse como Vueform elements o integrarse en layouts"
  - artifact: mod
    type: requires
    description: "modsComponents pertenecen a un mod"
```
