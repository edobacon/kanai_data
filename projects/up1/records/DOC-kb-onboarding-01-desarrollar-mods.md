---
id: DOC-kb-onboarding-01-desarrollar-mods
project: up1
type: doc
---

# Desarrollar mods en UP1

Un mod es una extension autocontenida. Tiene su propio modelo de datos, logica, UI, traducciones y permisos. Nunca modifica el core — todo vive dentro de `mods/{nombre}/` y el sync se encarga de propagarlo.

## Estructura de un mod

```
mods/mi-mod/
├── package.json              # Registro en monorepo (requerido)
├── capabilities.json         # Permisos RBAC (requerido, puede ser [])
├── config/
│   ├── app.json              # Registro de la app en sidebar
│   └── layouts/              # Configuraciones de vistas (JSON)
│       ├── mi-list.json
│       ├── mi-view.json
│       └── mi-create.json
├── objects/                  # Definiciones de entidades (JSON)
│   └── MiEntidad.json
├── logic/                    # Resolvers GraphQL custom
│   ├── miResolver.schema.graphql
│   └── miResolver.resolver.js
├── modsComponents/           # Componentes Vue custom
│   └── MiWidget/
│       └── MiWidgetElement.vue
├── modsComposables/          # Composables compartidos
│   └── useMiLogica.ts
├── lang/                     # Traducciones (es_CL, en_CL, pt_BR)
│   ├── es_CL.json
│   ├── es_CL@MiEntidad.json
│   └── ...
├── css/                      # Estilos del mod
│   └── mi-mod.css
├── seed/                     # Datos de prueba
│   └── mi-seed.js
└── events/                   # Eventos async (BullMQ)
    └── mi-evento.json
```

### Donde se sincroniza cada cosa

| Carpeta del mod | Destino tras sync |
|-----------------|-------------------|
| `objects/` | `object-manager/objects/business/` |
| `logic/` | `object-manager/src/graphql/resolvers/mods/{mod}/` |
| `modsComponents/` | `layout/src/modsComponents/` |
| `modsComposables/` | `layout/src/composables/` + `suite/modsComposables/` |
| `config/layouts/` | Tabla `up1_layen_layout` en DB |
| `lang/` | `suite/lang/` |
| `css/` | `suite/css/mods/` |
| `events/` | `object-manager/events/` |

## Objects — modelo de datos

Un object es un JSON que define una entidad de negocio. Es la fuente de verdad del schema.

### Ejemplo: `objects/StudentSupport.json`

```json
{
  "name": "StudentSupport",
  "label": "Student Support Case",
  "labelPlural": "Student Support Cases",
  "gender": "masculine",
  "fields": [
    { "name": "code", "type": "String", "required": true, "unique": true },
    { "name": "studentName", "type": "String", "required": true },
    { "name": "status", "type": "String", "enum": ["OPEN", "IN_PROGRESS", "CLOSED"], "default": "OPEN" },
    { "name": "priority", "type": "String", "enum": ["LOW", "MEDIUM", "HIGH"] },
    { "name": "description", "type": "String" },
    { "name": "assigneeId", "type": "String" }
  ],
  "defaultLayout": "student_support_list"
}
```

### Tipos de campo comunes

| Tipo | Prisma | GraphQL | Uso |
|------|--------|---------|-----|
| `String` | `String` | `String` | Texto, enums, IDs externos |
| `Int` | `Int` | `Int` | Numeros enteros |
| `Float` | `Float` | `Float` | Decimales |
| `Boolean` | `Boolean` | `Boolean` | Flags |
| `DateTime` | `DateTime` | `DateTime` | Fechas |
| `Json` | `Json` | `JSON` | Datos estructurados flexibles |

### Relaciones entre objects

Para crear una FK a otro object, agrega un campo con el nombre del object en camelCase + "Id":

```json
{ "name": "caLevelSchemeId", "type": "String", "relation": "CaLevelScheme" }
```

Para self-reference (jerarquia):

```json
{ "name": "parentId", "type": "String", "relation": "self" }
```

### Despues de crear/modificar objects

```bash
npm run sync
npm run codegen --workspace=@uplanner/object-management-backend
npx prisma migrate dev --name "descripcion-del-cambio"
```

## Layouts — configuracion de vistas

Los layouts son JSON que definen como se muestra un objeto. Se almacenan en `config/layouts/` y se sincronizan a la DB.

### RecordList (listado)

```json
{
  "id": "student_support_list",
  "name": "student_support_list",
  "label": "Student Support Cases",
  "objectName": "StudentSupport",
  "layoutType": "RecordList",
  "tenants": ["TEST", "UPU"],
  "layoutConfig": {
    "columns": ["code", "studentName", "status", "priority"],
    "defaultSort": { "field": "createdAt", "order": "desc" },
    "search": { "fields": ["code", "studentName"] },
    "createLayout": "student_support_create"
  }
}
```

### RecordDetail (detalle con tabs)

```json
{
  "id": "student_support_view",
  "name": "student_support_view",
  "label": "Ver Caso",
  "objectName": "StudentSupport",
  "layoutType": "RecordDetail",
  "tenants": ["TEST", "UPU"],
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "general": {
        "label": "General",
        "elements": ["studentName", "code", "status", "priority", "description"]
      },
      "history": {
        "label": "Historial",
        "elements": ["historyList"]
      }
    },
    "schema": {
      "studentName": { "type": "text", "label": "Estudiante", "columns": { "container": 12 } },
      "code": { "type": "text", "label": "Codigo", "columns": { "container": 6 } },
      "status": { "type": "text", "label": "Estado", "columns": { "container": 6 } },
      "priority": { "type": "text", "label": "Prioridad", "columns": { "container": 6 } },
      "description": { "type": "textarea", "label": "Descripcion", "columns": { "container": 12 } },
      "historyList": {
        "type": "record-list",
        "objectName": "SupportHistory",
        "layoutId": "support_history_list",
        "layoutConfig": {
          "filters": [
            { "field": "studentSupportId", "operator": "EQUALS", "value": "{{parentId}}" }
          ]
        }
      }
    }
  }
}
```

### Patrones importantes de layouts

**FK display** — mostrar nombre en vez de ID:

```json
"caLevelSchemeId": {
  "type": "text",
  "label": "Esquema",
  "relations": "calevelscheme",
  "relationDisplayFields": "CaLevelScheme.name"
}
```

**RecordList embebido** — listado hijo filtrado por padre:

```json
"childList": {
  "type": "record-list",
  "objectName": "ChildObject",
  "layoutId": "child_list",
  "layoutConfig": {
    "filters": [{ "field": "parentObjectId", "operator": "EQUALS", "value": "{{parentId}}" }]
  }
}
```

**Layout auxiliar** (sin navegacion en sidebar):

```json
{ "applicationId": null }
```

**Row actions** — acciones por fila en un listado:

```json
"rowActions": [
  {
    "id": "create-child",
    "label": "Crear hijo",
    "type": "modal",
    "targetLayoutId": "child_create",
    "targetObjectName": "ChildObject",
    "requiredCapability": "childobject:create",
    "visibilityConditions": {
      "operator": "AND",
      "conditions": [{ "field": "status", "operator": "==", "value": "ACTIVE" }]
    },
    "initialDataMapping": {
      "parentId": "record.id"
    }
  }
]
```

## App registration — la app en el sidebar

`config/app.json` registra el mod como aplicacion visible:

```json
{
  "name": "mi-mod",
  "label": "Mi Modulo",
  "icon": "bi bi-kanban",
  "order": 100,
  "tenants": ["TEST", "UPU"],
  "roles": [],
  "version": "1.0.0",
  "defaultObjects": [
    { "objectName": "StudentSupport", "layoutId": "student_support_list" },
    { "objectName": "SupportCategory", "layoutId": "support_category_list" }
  ]
}
```

`defaultObjects` define que tabs aparecen en el sidebar de la app. Cada entrada es un object con su layout de listado.

## i18n — traducciones

Dos tipos de archivos:

**Global** (`lang/es_CL.json`) — labels de layouts, acciones, mensajes:

```json
{
  "layout": {
    "student_support_list": { "label": "Casos de Soporte" },
    "student_support_view": { "label": "Ver Caso" }
  },
  "object": {
    "StudentSupport": "Soporte Estudiantil"
  }
}
```

**Por objeto** (`lang/es_CL@StudentSupport.json`) — columnas, modales:

```json
{
  "column": {
    "code": "Codigo",
    "studentName": "Estudiante",
    "status": "Estado",
    "priority": "Prioridad"
  },
  "createModalTitle": {
    "student_support_list": "Crear Caso de Soporte"
  }
}
```

**Regla**: las keys `object.{ObjectName}` en el global deben ser strings planos, no objetos nested. Usar `"StudentSupport": "Soporte"`, no `"StudentSupport": { "singular": "...", "plural": "..." }`.

## Resolvers — logica custom

Para mutations o queries que van mas alla del CRUD automatico.

**Schema** (`logic/miResolver.schema.graphql`):

```graphql
type MiResultado {
  success: Boolean!
  message: String
}

extend type Mutation {
  miAccionCustom(id: ID!, param: String!): MiResultado!
}
```

**Resolver** (`logic/miResolver.resolver.js`):

```javascript
import { withAuth } from '../../../../services/auth/withAuth.js';

export const miAccionCustomMutation = {
  miAccionCustom: withAuth(
    ['mod/mi-mod:mi_accion'],
    async (_parent, { id, param }, context) => {
      const { prisma } = context;
      // logica...
      return { success: true, message: 'OK' };
    }
  ),
};
```

**Importante**: el nombre del export debe contener `Query` o `Mutation` (case-insensitive) para que el sistema lo registre automaticamente.

## Componentes Vue custom

Para UI que no se puede resolver con layouts JSON (arboles, graficos, widgets interactivos).

### Reglas de estructura

- **Una carpeta, un .vue**: `modsComponents/MiWidget/MiWidgetElement.vue`
- Archivos auxiliares (.ts, .css) en la misma carpeta: OK
- Subcarpetas con .vue: NO (sync las rechaza)
- Multiples .vue en una carpeta: NO

### Patron con defineElement (Vueform)

```vue
<template>
  <ElementLayout>
    <template #element>
      <div ref="rootEl" class="mi-widget">
        <!-- contenido -->
      </div>
    </template>
  </ElementLayout>
</template>

<script>
import { ref, onMounted, getCurrentInstance } from 'vue';
import { defineElement } from '@vueform/vueform';
import { gql } from '@apollo/client/core';
import { useTenantApolloClient } from '@/composables/useApolloClient';

export default defineElement({
  name: 'MiWidgetElement',  // → type "mi-widget" en el layout JSON
  submits: false,
  setup(props) {
    // Apollo para queries/mutations
    const { client } = useTenantApolloClient();

    // logica del componente...

    return { /* valores reactivos para el template */ };
  },
});
</script>
```

### Uso en layout JSON

```json
"miWidget": {
  "type": "mi-widget",
  "label": "Mi Widget",
  "columns": { "container": 12 }
}
```

El registro es automatico: `vueform.config.ts` usa `import.meta.glob` para detectar todos los `.vue` en `modsComponents/`. Tras sync, requiere restart del dev server de suite para que el glob los detecte.

### Obtener el ID del registro padre

Dentro de un `defineElement`, la cadena `getCurrentInstance().parent` no llega al `LayoutRecordDetail` padre (Vueform la corta con wrappers internos). Alternativa: caminar el DOM hacia arriba:

```javascript
function findInstanceIdFromDOM(el) {
  let node = el;
  while (node) {
    if (node.__vueParentComponent) {
      let comp = node.__vueParentComponent;
      while (comp) {
        if (comp.props?.instanceId) return comp.props.instanceId;
        comp = comp.parent;
      }
    }
    node = node.parentElement;
  }
  return '';
}
```

### Leer datos del registro padre

El formulario Vueform (`form$`) contiene los datos del registro cargado por RecordDetail:

```javascript
const instance = getCurrentInstance();
const form = instance.proxy?.form$;
const status = form?.data?.status; // campo del layout schema
```

Nota: `form$.data` solo contiene los campos listados en el schema del layout, no el `id` del registro.

## Capabilities — permisos

`capabilities.json` en la raiz del mod:

```json
[
  { "name": "mod/mi-mod:view_cases", "description": "Ver casos de soporte", "riskLevel": "low" },
  { "name": "mod/mi-mod:manage_cases", "description": "Crear y editar casos", "riskLevel": "medium" },
  { "name": "mod/mi-mod:close_cases", "description": "Cerrar casos", "riskLevel": "high" }
]
```

Se usan en tres lugares:
1. **Resolver**: `withAuth(['mod/mi-mod:manage_cases'], resolver)`
2. **Row action**: `"requiredCapability": "mod/mi-mod:close_cases"`
3. **App/layout**: `"roles": ["Admin", "Coordinator"]`

## Seed — datos de prueba

`seed/mi-seed.js` con datos para testing:

```javascript
module.exports = async function seed(prisma, tenantId) {
  await prisma.studentSupport.create({
    data: {
      tenantId,
      publicId: 'ss-001',
      code: 'CASE-001',
      studentName: 'Maria Lopez',
      status: 'OPEN',
      priority: 'HIGH',
    },
  });
};
```

Ejecutar: `npm run seed --workspace=@uplanner/object-management-backend`

## Flujo completo de desarrollo

```
1. Crear mod           → package.json, capabilities.json, config/app.json
2. Definir objects      → objects/*.json
3. Sync + codegen       → npm run sync && npm run codegen && npx prisma migrate dev
4. Crear layouts        → config/layouts/*.json
5. Sync                 → npm run sync (layouts van a DB)
6. Crear i18n           → lang/*.json
7. Sync                 → npm run sync (traducciones van a suite/lang/)
8. Crear seed           → seed/mi-seed.js → npm run seed
9. Verificar en UI      → localhost:3000/{tenant}/{Object}/RecordList/{layout_id}
10. Iterar              → editar → sync → verificar
```

**Despues de cada cambio en el mod**: `npm run sync`. Es el paso que nunca se salta.

---

Anterior: [00 — Que es UP1](00-que-es-up1.md) | Siguiente: [02 — Caso: Assessment](02-caso-assessment.md)
