---
id: DOC-kb-onboarding-03-construir-vistas
project: up1
type: doc
---

# Construir vistas en un mod de UP1

Las vistas en UP1 se construyen con **layouts JSON** — archivos de configuracion que describen que mostrar y como. No se escribe HTML ni templates Vue para vistas standard. El sistema (LayoutOrchestrator) lee el JSON y renderiza los componentes correctos.

## Como funciona

```
config/layouts/mi-vista.json
        │
        │  npm run sync → guarda en DB (tabla up1_layen_layout)
        ▼
LayoutOrchestrator lee el JSON de la DB
        │
        │  Segun layoutType:
        ├── "RecordList"   → tabla con busqueda, filtros, paginacion, acciones
        ├── "RecordDetail" → formulario con tabs, campos, sub-listas
        └── "ChibiList"    → lista compacta para mobile/sidebar
```

**Regla**: siempre trabajar en `mods/{mod}/config/layouts/`. Nunca editar la DB directamente. El sync se encarga.

## Tipos de layout

### RecordList — listado de registros

Tabla interactiva con columnas, busqueda, ordenamiento, paginacion y acciones por fila.

**Campos principales del JSON:**

| Campo | Tipo | Que hace |
|-------|------|---------|
| `id` | string | Identificador unico del layout |
| `name` | string | Nombre interno (misma convencion que id) |
| `label` | string | Titulo visible en la UI |
| `objectName` | string | Que objeto muestra (PascalCase) |
| `layoutType` | `"RecordList"` | Tipo de vista |
| `tenants` | string[] | En que tenants esta disponible |
| `columns` | array | Columnas de la tabla |
| `rowActions` | array | Acciones disponibles por fila |
| `layoutConfig.filters` | array | Filtros predefinidos (fijos, no visibles al usuario) |
| `layoutConfig.defaultSort` | object | Ordenamiento por defecto |
| `layoutConfig.createLayout` | string | ID del layout de creacion (boton "Crear") |
| `layoutConfig.search` | object | Campos para busqueda |

**Resultado en la UI:**

```
┌─────────────────────────────────────────────────────┐
│ Matrices de Competencias              [+ Crear] [🔍] │
│ 1 elemento. Ordenado por createdAt.                  │
├──────────┬────────────────────┬─────┬───────┬───────┤
│ Codigo   │ Nombre             │ Ver │Estado │Accion │
├──────────┼────────────────────┼─────┼───────┼───────┤
│ MAT-001  │ Ing. Industrial    │ 1.0 │DRAFT  │ ⋮     │
├──────────┴────────────────────┴─────┴───────┴───────┤
│ 1-1 de 1                            5 por pagina    │
└─────────────────────────────────────────────────────┘
```

### RecordDetail — detalle de un registro

Formulario que muestra/edita un registro. Soporta tres modos: `view` (solo lectura), `edit` (editable), `create` (nuevo registro).

**Campos principales del JSON:**

| Campo | Tipo | Que hace |
|-------|------|---------|
| `layoutConfig.mode` | `"view"` / `"edit"` / `"create"` | Modo del formulario |
| `layoutConfig.tabs` | object | Tabs con sus elementos |
| `layoutConfig.schema` | object | Definicion de cada campo/elemento |

**Tipos de campo en el schema:**

| type | Renderiza | Uso comun |
|------|----------|----------|
| `text` | Input de texto | Strings, codigos |
| `textarea` | Area de texto | Descripciones |
| `select` | Dropdown | Enums, FK a otro objeto |
| `toggle` | Switch on/off | Booleans |
| `date` | Date picker | Fechas |
| `number` | Input numerico | Enteros, decimales |
| `record-list` | Listado embebido de otro objeto | Relaciones hijo |
| `{custom-type}` | Custom Vueform element | Arboles, widgets |

**Resultado en la UI (con tabs):**

```
┌─────────────────────────────────────────────────┐
│ Vista Ingenieria Industrial 2026            [✕]  │
├─────────────────────────────────────────────────┤
│ [Detalle] [Facultades] [Curriculos] [Competencias]│
│                                                   │
│ NOMBRE                                            │
│ ┌───────────────────────────────────────────────┐ │
│ │ Ingenieria Industrial 2026                    │ │
│ └───────────────────────────────────────────────┘ │
│ CODIGO              VERSION                       │
│ ┌──────────────┐   ┌──────────────┐               │
│ │ MAT-IIND-2026│   │ 1.0          │               │
│ └──────────────┘   └──────────────┘               │
│ ESTADO                                            │
│ ┌──────────────┐                                  │
│ │ DRAFT        │                                  │
│ └──────────────┘                                  │
│                                                   │
│ [⬆ Enviar a Revision]    BORRADOR                 │
│                                                   │
│ ALCANCE             ESQUEMA DE NIVELES            │
│ ┌──────────────┐   ┌──────────────────────────┐   │
│ │ PROGRAM      │   │ 3 Niveles Basico         │   │
│ └──────────────┘   └──────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Patrones de composicion

### Patron 1: Listado con columnas y FK display

Mostrar un campo FK con el nombre legible del registro relacionado en vez del ID.

```json
{
  "columns": [
    { "key": "name", "label": "Nombre", "sortable": true },
    {
      "key": "caLevelSchemeId",
      "label": "Esquema de Niveles",
      "relations": "calevelscheme",
      "relationDisplayFields": "CaLevelScheme.name"
    }
  ]
}
```

**Sin relacion**: la columna mostraria `"am-scheme-qual-001"` (el ID).
**Con relacion**: muestra `"3 Niveles Basico"` (el nombre del registro relacionado).

Tres propiedades trabajan juntas:
- `relations`: nombre de la relacion Prisma (lowercase del objeto)
- `relationDisplayFields`: `{ObjectName}.{campo}` a mostrar
- `relationLayoutIds` (opcional): layout para navegar al hacer click

### Patron 2: Formulario de creacion

Layout con `mode: "create"`. Define los campos editables con validacion.

```json
{
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "create",
    "schema": {
      "code": {
        "type": "text",
        "label": "Codigo",
        "columns": { "container": 6 },
        "rules": ["required"]
      },
      "scope": {
        "type": "select",
        "label": "Alcance",
        "columns": { "container": 4 },
        "rules": ["required"],
        "items": [
          { "value": "INSTITUTIONAL", "label": "Institucional" },
          { "value": "PROGRAM", "label": "Programa" }
        ]
      },
      "caLevelSchemeId": {
        "type": "select",
        "label": "Esquema de Niveles",
        "columns": { "container": 4 },
        "relations": "calevelscheme",
        "relationDisplayFields": "CaLevelScheme.name",
        "objectName": "CaLevelScheme"
      }
    }
  }
}
```

**`columns.container`** controla el ancho responsive (sobre 12 columnas de grid):
- `12` = ancho completo
- `6` = mitad
- `4` = un tercio

**`rules`** define validaciones Vueform: `required`, `min:3`, `max:100`, `email`, etc.

**`items`** en un `select` define opciones estaticas. Para opciones dinamicas (de otro objeto), usar `relations` + `objectName`.

### Patron 3: Detalle con tabs y listas embebidas

Un RecordDetail que organiza la informacion en tabs, incluyendo sublistas de objetos hijo.

```json
{
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "detail": {
        "label": "Detalle",
        "elements": ["name", "code", "status", "description"]
      },
      "children": {
        "label": "Elementos Hijo",
        "elements": ["childrenList"]
      }
    },
    "schema": {
      "name": { "type": "text", "label": "Nombre", "columns": { "container": 12 } },
      "code": { "type": "text", "label": "Codigo", "columns": { "container": 6 } },
      "status": { "type": "text", "label": "Estado", "columns": { "container": 6 } },
      "description": { "type": "textarea", "label": "Descripcion", "columns": { "container": 12 } },
      "childrenList": {
        "type": "record-list",
        "objectName": "ChildObject",
        "layoutId": "child_list",
        "layoutConfig": {
          "filters": [
            { "field": "parentObjectId", "operator": "EQUALS", "value": "{{parentId}}" }
          ]
        }
      }
    }
  }
}
```

**`tabs`** define las pestanas. Cada tab tiene un `label` y un array de `elements` que referencian keys del `schema`.

**`{{parentId}}`** es un placeholder que LayoutOrchestrator reemplaza por el ID del registro padre. Asi la sublista solo muestra hijos de este registro.

**Composicion recursiva**: la sublista es otro LayoutOrchestrator que carga su propio layout (ej: `child_list`). Ese layout puede a su vez tener row actions que abran otro RecordDetail. No hay limite de niveles.

### Patron 4: Listado con filtros predefinidos

Un RecordList que muestra solo un subconjunto de registros. Util para crear vistas por estado o tipo.

```json
{
  "id": "ca_matrix_drafts",
  "label": "Borradores",
  "objectName": "CaCompetencyMatrix",
  "layoutType": "RecordList",
  "layoutConfig": {
    "filters": [
      { "field": "status", "operator": "EQUALS", "value": "DRAFT" }
    ]
  },
  "columns": [
    { "key": "code", "label": "Codigo" },
    { "key": "name", "label": "Nombre" }
  ]
}
```

Los filtros en `layoutConfig.filters` son **fijos** — el usuario no los ve ni puede cambiarlos. Se aplican a la query GraphQL antes de ejecutar.

Para que estos sub-layouts aparezcan como opciones en el sidebar de la app, se agregan al navigation. Si no, se usan como layouts auxiliares (con `"applicationId": null`).

### Patron 5: Row actions con condiciones y permisos

Acciones por fila que dependen del estado del registro y los permisos del usuario.

```json
{
  "rowActions": [
    {
      "label": "Ver detalle",
      "type": "navigate",
      "targetLayoutId": "ca_matrix_view"
    },
    {
      "label": "Crear Intervencion",
      "type": "modal",
      "targetLayoutId": "intervention_create",
      "targetObjectName": "Intervention",
      "modalTitle": "Crear Intervencion para [record.studentName]",
      "requiredCapability": "mod/my-mod:create_intervention",
      "visibilityConditions": {
        "operator": "AND",
        "conditions": [
          { "field": "status", "operator": "==", "value": "OPEN" }
        ]
      },
      "initialDataMapping": {
        "parentId": "record.id",
        "studentName": "record.studentName"
      }
    },
    {
      "label": "Eliminar",
      "type": "delete",
      "requiredCapability": "mod/my-mod:delete_records",
      "conditions": [
        { "field": "status", "operator": "EQUALS", "value": "DRAFT" }
      ]
    }
  ]
}
```

**Tipos de accion:**
- `navigate`: navega a otro layout (abre detalle)
- `modal`: abre un layout en modal (crear/editar registro relacionado)
- `delete`: elimina el registro (con confirmacion)
- `default`: accion custom con handler

**`visibilityConditions`**: muestra/oculta la accion segun valores del registro
**`requiredCapability`**: solo visible si el usuario tiene el permiso
**`initialDataMapping`**: pasa datos del registro actual al modal (ej: `"parentId": "record.id"`)
**`[record.fieldName]`**: placeholder en `modalTitle` que se reemplaza con el valor del registro

### Patron 6: Custom element dentro de un layout

Para UI que no se puede expresar con campos standard (arboles, graficos, widgets).

```json
{
  "layoutConfig": {
    "tabs": {
      "detail": { "label": "Detalle", "elements": ["name", "status"] },
      "tree": { "label": "Arbol", "elements": ["competencyTree"] }
    },
    "schema": {
      "name": { "type": "text", "label": "Nombre", "columns": { "container": 12 } },
      "status": { "type": "text", "label": "Estado", "columns": { "container": 6 } },
      "competencyTree": {
        "type": "competency-tree",
        "label": "Arbol de Competencias",
        "columns": { "container": 12 }
      }
    }
  }
}
```

El `type` debe coincidir con el nombre kebab-case del custom element (sin "Element"): `CompetencyTreeElement.vue` → `competency-tree`.

### Patron 7: Associated layout tab (cross-object)

Un tab que renderiza un layout completamente independiente de otro objeto.

```json
{
  "tabs": {
    "general": { "label": "General", "elements": ["name", "code"] },
    "related": {
      "type": "associatedLayout",
      "associatedLayoutId": "related_records_list",
      "label": "Registros Relacionados",
      "objectName": "OtherObject"
    }
  }
}
```

Diferencia con `record-list` embebido: el associated layout usa su propio LayoutOrchestrator completo, con todos los features del tipo de layout (busqueda, filtros, acciones, paginacion). Es mas poderoso pero menos integrado visualmente.

## Donde se ve cada layout

### Navegacion de la app

`config/app.json` define que tabs aparecen en el sidebar:

```json
{
  "defaultObjects": [
    { "objectName": "CaLevelScheme", "layoutId": "ca_levelscheme_list" },
    { "objectName": "CaCompetencyMatrix", "layoutId": "ca_matrix_list" }
  ]
}
```

Cada entrada genera un tab en la barra lateral de la app:

```
┌──────────────────────┐
│ Assessment Matrix     │
│                       │
│ > Esquemas de Niveles │  ← ca_levelscheme_list
│ > Matrices de Comp.   │  ← ca_matrix_list
│   ├ Borradores        │  ← ca_matrix_drafts (sub-layout)
│   ├ En Revision        │  ← ca_matrix_review
│   └ Publicadas         │  ← ca_matrix_published
└──────────────────────┘
```

Los sub-layouts (Borradores, En Revision, Publicadas) aparecen como dropdown si tienen el mismo `objectName` que el tab padre.

### URL de cada vista

```
/{tenant}/{objectName}/RecordList/{layoutId}     → listado
/{tenant}/{objectName}/RecordDetail/{layoutId}   → detalle (en modal sobre el listado)
```

Ejemplo: `http://localhost:3000/UPU/CaCompetencyMatrix/RecordList/ca_matrix_list`

### Layouts auxiliares (sin navegacion)

Si un layout tiene `"applicationId": null`, no aparece en ningun menu. Se usa solo como:
- Modal de creacion (referenciado por `createLayout`)
- Vista de detalle (referenciada por `targetLayoutId` en row actions)
- Sublista embebida (referenciada por `layoutId` en un record-list)

---

## Casos de ejemplo: Assessment de suite-front en UP1

Estos casos muestran como las vistas del modulo de Assessment de suite-front se traducen a layouts de UP1.

### Caso 1: Lista de matrices con acciones

**En suite-front**: componente Angular `CompetencyMatrixList` con tabla, busqueda, y botones de accion por fila.

**En UP1**: un solo archivo JSON.

```json
{
  "id": "ca_matrix_list",
  "name": "ca_matrix_list",
  "label": "Matrices de Competencias",
  "objectName": "CaCompetencyMatrix",
  "layoutType": "RecordList",
  "tenants": ["TEST", "UPU"],
  "columns": [
    { "key": "code", "label": "Codigo", "sortable": true },
    { "key": "name", "label": "Nombre", "sortable": true },
    { "key": "version", "label": "Version", "sortable": true },
    { "key": "status", "label": "Estado", "sortable": true },
    { "key": "scope", "label": "Alcance", "sortable": true },
    {
      "key": "caLevelSchemeId",
      "label": "Esquema de Niveles",
      "sortable": false,
      "relations": "calevelscheme",
      "relationDisplayFields": "CaLevelScheme.name"
    }
  ],
  "rowActions": [
    {
      "label": "Ver detalle",
      "type": "navigate",
      "targetLayoutId": "ca_matrix_view"
    },
    {
      "label": "Eliminar",
      "type": "delete",
      "requiredCapability": "mod/assessment-matrix:manage_matrices",
      "conditions": [
        { "field": "status", "operator": "EQUALS", "value": "DRAFT" }
      ]
    }
  ]
}
```

**Lo que obtiene el usuario**: tabla con busqueda automatica, ordenamiento por click en headers, paginacion, boton "Crear", menu de acciones por fila (ver/eliminar), y la columna Esquema de Niveles mostrando el nombre en vez del ID. Eliminar solo visible para registros en DRAFT y usuarios con el permiso.

### Caso 2: Formulario de creacion de matriz

**En suite-front**: `CompetencyGeneralForm` — componente Angular con formulario, validaciones, y select de facultades/planes.

**En UP1**: layout JSON con modo create.

```json
{
  "id": "ca_matrix_create",
  "name": "ca_matrix_create",
  "label": "Crear Matriz de Competencias",
  "objectName": "CaCompetencyMatrix",
  "layoutType": "RecordDetail",
  "applicationId": null,
  "tenants": ["TEST", "UPU"],
  "layoutConfig": {
    "mode": "create",
    "schema": {
      "code": { "type": "text", "label": "Codigo", "columns": { "container": 6 }, "rules": ["required"] },
      "name": { "type": "text", "label": "Nombre", "columns": { "container": 6 }, "rules": ["required"] },
      "version": { "type": "text", "label": "Version", "columns": { "container": 4 }, "rules": ["required"] },
      "scope": {
        "type": "select",
        "label": "Alcance",
        "columns": { "container": 4 },
        "rules": ["required"],
        "items": [
          { "value": "INSTITUTIONAL", "label": "Institucional" },
          { "value": "PROGRAM", "label": "Programa" }
        ]
      },
      "caLevelSchemeId": {
        "type": "select",
        "label": "Esquema de Niveles",
        "columns": { "container": 4 },
        "relations": "calevelscheme",
        "relationDisplayFields": "CaLevelScheme.name",
        "objectName": "CaLevelScheme"
      },
      "description": { "type": "textarea", "label": "Descripcion", "columns": { "container": 12 } }
    }
  }
}
```

**`applicationId: null`** hace que este layout no aparezca en el sidebar — solo se abre como modal desde el boton "Crear" del listado.

**Lo que obtiene el usuario**: modal con formulario, validacion de campos requeridos, dropdown de Alcance con opciones fijas, dropdown de Esquema de Niveles que carga dinamicamente todos los CaLevelScheme disponibles mostrando su nombre. Al guardar, cierra el modal y refresca el listado.

### Caso 3: Vista de detalle con sublistas y custom element

**En suite-front**: `CompetencyMatrixEdit` con tabs de datos generales, competencias (arbol), y asociaciones.

**En UP1**: layout con tabs, record-lists embebidos, y custom Vueform element.

```json
{
  "id": "ca_matrix_view",
  "name": "ca_matrix_view",
  "label": "Ver Matriz de Competencias",
  "objectName": "CaCompetencyMatrix",
  "layoutType": "RecordDetail",
  "applicationId": null,
  "tenants": ["TEST", "UPU"],
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "detail": {
        "label": "Detalle",
        "elements": ["name", "code", "version", "status", "workflowActions", "scope", "caLevelSchemeId", "description"]
      },
      "faculties": {
        "label": "Facultades",
        "elements": ["facultiesList"]
      },
      "curricula": {
        "label": "Curriculos",
        "elements": ["curriculaList"]
      },
      "competencies": {
        "label": "Competencias",
        "elements": ["competencyTree"]
      }
    },
    "schema": {
      "name": { "type": "text", "label": "Nombre", "columns": { "container": 12 } },
      "code": { "type": "text", "label": "Codigo", "columns": { "container": 6 } },
      "version": { "type": "text", "label": "Version", "columns": { "container": 4 } },
      "status": { "type": "text", "label": "Estado", "columns": { "container": 4 } },
      "workflowActions": {
        "type": "workflow-actions",
        "label": " ",
        "columns": { "container": 12 }
      },
      "scope": { "type": "text", "label": "Alcance", "columns": { "container": 4 } },
      "caLevelSchemeId": {
        "type": "text",
        "label": "Esquema de Niveles",
        "columns": { "container": 6 },
        "relations": "calevelscheme",
        "relationDisplayFields": "CaLevelScheme.name"
      },
      "description": { "type": "textarea", "label": "Descripcion", "columns": { "container": 12 } },
      "facultiesList": {
        "type": "record-list",
        "objectName": "CaMatrixFaculty",
        "layoutId": "ca_matrixfaculty_list",
        "layoutConfig": {
          "filters": [
            { "field": "caCompetencyMatrixId", "operator": "EQUALS", "value": "{{parentId}}" }
          ]
        }
      },
      "curriculaList": {
        "type": "record-list",
        "objectName": "CaMatrixCurriculum",
        "layoutId": "ca_matrixcurriculum_list",
        "layoutConfig": {
          "filters": [
            { "field": "caCompetencyMatrixId", "operator": "EQUALS", "value": "{{parentId}}" }
          ]
        }
      },
      "competencyTree": {
        "type": "competency-tree",
        "label": "Arbol de Competencias",
        "columns": { "container": 12 }
      }
    }
  }
}
```

**Lo que obtiene el usuario**: modal de detalle con 4 tabs. Tab Detalle muestra datos + botones de workflow. Tabs Facultades y Curriculos muestran sublistas filtradas por esta matriz. Tab Competencias muestra el arbol jerarquico interactivo (custom element).

### Caso 4: Vistas filtradas por estado como sub-layouts

**En suite-front**: filtros en el sidebar o dropdowns en el componente de listado.

**En UP1**: multiples layouts del mismo objeto con filtros predefinidos.

```json
{
  "id": "ca_matrix_drafts",
  "label": "Borradores",
  "objectName": "CaCompetencyMatrix",
  "layoutType": "RecordList",
  "layoutConfig": {
    "filters": [
      { "field": "status", "operator": "EQUALS", "value": "DRAFT" }
    ]
  },
  "columns": [
    { "key": "code", "label": "Codigo", "sortable": true },
    { "key": "name", "label": "Nombre", "sortable": true }
  ]
}
```

Se crean layouts similares para cada estado: `ca_matrix_review` (status=REVIEW), `ca_matrix_published` (status=PUBLISHED). Como todos tienen el mismo `objectName`, aparecen como dropdown del tab "Matrices de Competencias" en el sidebar.

### Caso 5: Detalle con dos sublistas de objetos diferentes

**En suite-front**: vista de un nivel de logro con seccion de criterios y seccion de umbrales.

**En UP1**: RecordDetail con tabs que embeben listados de CaCriteria y CaThreshold.

```json
{
  "id": "ca_level_view",
  "label": "Ver Nivel de Logro",
  "objectName": "CaLevel",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "detail": {
        "label": "Detalle",
        "elements": ["name", "code", "description", "order", "weight"]
      },
      "criteria": {
        "label": "Criterios",
        "elements": ["criteriaList"]
      },
      "thresholds": {
        "label": "Umbrales",
        "elements": ["thresholdList"]
      }
    },
    "schema": {
      "name": { "type": "text", "label": "Nombre", "columns": { "container": 12 } },
      "code": { "type": "text", "label": "Codigo", "columns": { "container": 4 } },
      "description": { "type": "textarea", "label": "Descripcion", "columns": { "container": 12 } },
      "order": { "type": "text", "label": "Orden", "columns": { "container": 4 } },
      "weight": { "type": "text", "label": "Peso", "columns": { "container": 4 } },
      "criteriaList": {
        "type": "record-list",
        "objectName": "CaCriteria",
        "layoutId": "ca_criteria_list",
        "layoutConfig": {
          "filters": [{ "field": "caLevelId", "operator": "EQUALS", "value": "{{parentId}}" }]
        }
      },
      "thresholdList": {
        "type": "record-list",
        "objectName": "CaThreshold",
        "layoutId": "ca_threshold_list",
        "layoutConfig": {
          "filters": [{ "field": "caLevelId", "operator": "EQUALS", "value": "{{parentId}}" }]
        }
      }
    }
  }
}
```

**Lo que obtiene el usuario**: al abrir un nivel, ve sus datos generales + tab de criterios cualitativos + tab de umbrales cuantitativos. Cada tab muestra solo los registros asociados a este nivel via `{{parentId}}`.

## Resumen: que usar para cada escenario

| Necesito... | Solucion | Patron |
|------------|---------|--------|
| Tabla de registros | RecordList | Caso 1 |
| Formulario de creacion | RecordDetail mode create | Caso 2 |
| Detalle con informacion organizada en tabs | RecordDetail mode view con tabs | Caso 3 |
| Mostrar registros hijo dentro de un detalle | record-list embebido con `{{parentId}}` | Caso 3, 5 |
| UI interactiva (arbol, grafico) | Custom Vueform element en el schema | Caso 3 |
| Vista filtrada por estado/tipo | RecordList con filters predefinidos | Caso 4 |
| Accion que abre formulario en modal | rowAction type modal | Patron 5 |
| Accion condicionada a estado + permiso | rowAction con visibilityConditions + requiredCapability | Patron 5 |
| Tab que muestra otro objeto completo | associatedLayout | Patron 7 |
| Mostrar nombre de FK en vez de ID | relations + relationDisplayFields | Patron 1 |

---

Anterior: [02 — Caso: Assessment](02-caso-assessment.md)
