---
id: SPEC-mods-012
project: up1
type: spec
module: mods
tags: [layout, RecordList, RecordDetail, tabs, steps, wizard, rowAction, modal, embebido, filtro]
---
# Layouts JSON

## Preparacion

```bash
# Crear carpeta si no existe
mkdir -p mods/{mod}/config/layouts
```

## Despues de CADA receta

```bash
npm run sync
# Layouts se insertan en BD (tabla up1_layen_layout) — recarga automatica en Suite
```

## Reglas criticas

- Todos los layouts van en `mods/{mod}/config/layouts/{name}.json`.
- `npm run sync` propaga los layouts a BD (tabla `up1_layen_layout`). Sin sync no se reflejan.
- **Placeholders disponibles:** `{{parentId}}` (ID del registro padre en listas embebidas), `{{CURRENT_USER_ID}}` (usuario logueado), `record.id` (ID de la fila en `initialDataMapping`), `record.{field}` (cualquier campo de la fila).
- El campo `name` del layout es el identificador unico global. Usar snake_case: `{objeto}_{modo}`.
- `layoutType` acepta: `RecordList`, `RecordDetail`, `OfferingCalendar`.

---

### LAY-01: RecordList basico

**Pre:** objeto definido en `objects/` y syncado
**In:** nombre del objeto, campos a mostrar como columnas

```json
{
  "name": "mi_objeto_list",
  "objectName": "MiObjeto",
  "layoutType": "RecordList",
  "roles": ["Admin", "Coordinador"],
  "layoutConfig": {
    "columns": [
      { "key": "nombre", "label": "Nombre", "sortable": true },
      { "key": "estado", "label": "Estado", "sortable": true },
      { "key": "puntuacion", "label": "Puntuacion", "sortable": true }
    ],
    "canCreate": true,
    "canCreateLayoutId": "mi_objeto_create",
    "canEdit": true,
    "canDelete": true,
    "showSearch": true,
    "associatedLayoutConfigs": {
      "view": { "layoutId": "mi_objeto_view" },
      "edit": { "layoutId": "mi_objeto_edit" }
    }
  }
}
```

**Validar:** lista aparece en la app; columnas visibles; busqueda filtra; botones crear/editar/eliminar presentes segun flags.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/mods/creation-guide.md §5.3`

---

### LAY-02: RecordDetail view con tabs

**Pre:** objeto syncado, layout list que apunta a este via `associatedLayoutConfigs.view`
**In:** campos a mostrar, agrupacion por tabs

```json
{
  "name": "mi_objeto_view",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "view",
    "associatedLayoutConfigs": {
      "edit": { "layoutId": "mi_objeto_edit" }
    },
    "tabs": {
      "general": {
        "label": "Datos Generales",
        "elements": ["nombre", "estado", "descripcion"]
      },
      "metricas": {
        "label": "Metricas",
        "elements": ["puntuacion", "fechaCreacion"]
      }
    },
    "schema": {
      "nombre":        { "type": "text",     "label": "Nombre",       "columns": { "container": 6 } },
      "estado":        { "type": "text",     "label": "Estado",       "columns": { "container": 6 } },
      "descripcion":   { "type": "textarea", "label": "Descripcion",  "columns": { "container": 12 } },
      "puntuacion":    { "type": "text",     "label": "Puntuacion",   "columns": { "container": 6 } },
      "fechaCreacion": { "type": "text",     "label": "Fecha",        "columns": { "container": 6 } }
    }
  }
}
```

**Validar:** click en fila de la lista abre el detail; tabs visibles; campo en modo lectura (sin inputs editables).
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/confluence/layouts-detalle.md`

---

### LAY-03: RecordDetail create simple

**Pre:** layout list con `canCreate: true` y `canCreateLayoutId` apuntando a este
**In:** campos del formulario, reglas de validacion

```json
{
  "name": "mi_objeto_create",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "create",
    "tabs": {
      "formulario": {
        "label": "Nuevo Registro",
        "elements": ["nombre", "estado", "puntuacion", "descripcion"]
      }
    },
    "schema": {
      "nombre":      { "type": "text",     "label": "Nombre",      "rules": ["required"],            "columns": { "container": 6 } },
      "estado":      { "type": "select",   "label": "Estado",      "rules": ["required"],            "columns": { "container": 6 },
                       "items": ["BORRADOR", "ACTIVO", "ARCHIVADO"] },
      "puntuacion":  { "type": "text",     "label": "Puntuacion",  "rules": ["numeric", "min:0"],    "columns": { "container": 6 } },
      "descripcion": { "type": "textarea", "label": "Descripcion",                                   "columns": { "container": 12 } }
    }
  }
}
```

**Validar:** boton Crear abre el formulario; campos con `rules: ["required"]` bloquean submit si vacios; registro aparece en la lista al guardar.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/mods/creation-guide.md §5.3`

---

### LAY-04: RecordDetail create con wizard (steps)

**Pre:** formulario de creacion que requiere flujo multi-paso
**In:** definicion de pasos, campos por paso

```json
{
  "name": "mi_objeto_create_wizard",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "create",
    "steps": {
      "paso1": {
        "label": "Identificacion",
        "elements": ["nombre", "codigo"]
      },
      "paso2": {
        "label": "Configuracion",
        "elements": ["estado", "puntuacion", "categoriaId"]
      },
      "paso3": {
        "label": "Detalle",
        "elements": ["descripcion", "observaciones"]
      }
    },
    "schema": {
      "nombre":       { "type": "text",   "label": "Nombre",     "rules": ["required"], "columns": { "container": 8 } },
      "codigo":       { "type": "text",   "label": "Codigo",     "rules": ["required"], "columns": { "container": 4 } },
      "estado":       { "type": "select", "label": "Estado",     "rules": ["required"], "columns": { "container": 6 },
                        "items": ["BORRADOR", "ACTIVO"] },
      "puntuacion":   { "type": "text",   "label": "Puntuacion",                        "columns": { "container": 6 } },
      "categoriaId":  { "type": "text",   "label": "Categoria",                         "columns": { "container": 12 } },
      "descripcion":  { "type": "textarea","label": "Descripcion",                       "columns": { "container": 12 } },
      "observaciones":{ "type": "textarea","label": "Observaciones",                     "columns": { "container": 12 } }
    }
  }
}
```

**Validar:** wizard muestra pasos en orden; no permite avanzar si hay `rules` incumplidas en el paso actual; el submit solo ocurre en el ultimo paso.
**Doc:** `specs/up1/mods/reference.md §9`

---

### LAY-05: RecordDetail edit

**Pre:** layout view con `associatedLayoutConfigs.edit` apuntando a este
**In:** mismos campos que el create, mode edit

```json
{
  "name": "mi_objeto_edit",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "edit",
    "tabs": {
      "formulario": {
        "label": "Editar Registro",
        "elements": ["nombre", "estado", "puntuacion", "descripcion"]
      }
    },
    "schema": {
      "nombre":      { "type": "text",     "label": "Nombre",      "rules": ["required"],         "columns": { "container": 6 } },
      "estado":      { "type": "select",   "label": "Estado",      "rules": ["required"],         "columns": { "container": 6 },
                       "items": ["BORRADOR", "ACTIVO", "ARCHIVADO"] },
      "puntuacion":  { "type": "text",     "label": "Puntuacion",  "rules": ["numeric", "min:0"], "columns": { "container": 6 } },
      "descripcion": { "type": "textarea", "label": "Descripcion",                                "columns": { "container": 12 } }
    }
  }
}
```

**Validar:** boton Editar en el view abre este layout con valores precargados; guardar actualiza el registro.
**Doc:** `specs/up1/mods/reference.md §9`

---

### LAY-06: Lista embebida en detail

**Pre:** objeto hijo con FK al objeto padre; layout list del hijo existente
**In:** nombre del objeto hijo, campo FK que referencia al padre, layoutId de la lista hija

```json
{
  "name": "mi_objeto_view",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "general":  { "label": "General",  "elements": ["nombre", "estado"] },
      "hijos":    { "label": "Hijos",    "elements": ["listaHijos"] }
    },
    "schema": {
      "nombre": { "type": "text", "label": "Nombre", "columns": { "container": 6 } },
      "estado": { "type": "text", "label": "Estado", "columns": { "container": 6 } },

      "listaHijos": {
        "type": "record-list",
        "objectName": "MiObjetoHijo",
        "layoutId": "mi_objeto_hijo_list",
        "layoutConfig": {
          "filters": [
            {
              "field": "miObjetoId",
              "operator": "EQUALS",
              "value": "{{parentId}}"
            }
          ]
        }
      }
    }
  }
}
```

**Validar:** tab "Hijos" muestra solo los registros cuyo `miObjetoId` coincide con el ID del padre actual; no muestra registros de otros padres.
**Doc:** `specs/up1/mods/reference.md §9`

---

### LAY-07: Layout auxiliar sin applicationId (target de row action)

**Pre:** necesidad de un layout solo invocado via row action, no desde el sidebar
**In:** objeto del layout, modo (generalmente create)

Un layout auxiliar se distingue por no tener `applicationId` — no aparece en la navegacion principal, solo se abre como modal desde una row action.

```json
{
  "name": "mi_objeto_hijo_create",
  "objectName": "MiObjetoHijo",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "create",
    "tabs": {
      "formulario": {
        "label": "Nuevo Hijo",
        "elements": ["nombre", "miObjetoId", "estado"]
      }
    },
    "schema": {
      "nombre":     { "type": "text",   "label": "Nombre", "rules": ["required"], "columns": { "container": 8 } },
      "miObjetoId": { "type": "hidden",                                            "columns": { "container": 0 } },
      "estado":     { "type": "select", "label": "Estado", "rules": ["required"], "columns": { "container": 4 },
                      "items": ["ACTIVO", "INACTIVO"] }
    }
  }
}
```

Nota: `miObjetoId` es `type: "hidden"` porque se pre-rellena via `initialDataMapping` de la row action (ver LAY-08).

**Validar:** el layout no aparece en la navegacion del sidebar; se abre correctamente desde la row action.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/mods/creation-guide.md §5.3`

---

### LAY-08: Row action tipo modal con initialDataMapping

**Pre:** layout auxiliar destino creado (LAY-07); campo FK en el layout destino
**In:** ID de la row action, layoutId del destino, mapeo de campos

```json
{
  "name": "mi_objeto_list",
  "objectName": "MiObjeto",
  "layoutType": "RecordList",
  "layoutConfig": {
    "columns": [
      { "key": "nombre", "label": "Nombre" },
      { "key": "estado", "label": "Estado" }
    ],
    "canCreate": true,
    "canCreateLayoutId": "mi_objeto_create",
    "rowActions": [
      {
        "id": "crear-hijo",
        "label": "Agregar Hijo",
        "type": "modal",
        "targetLayoutId": "mi_objeto_hijo_create",
        "targetObjectName": "MiObjetoHijo",
        "requiredCapability": "miobjeto_hijo:create",
        "initialDataMapping": {
          "miObjetoId": "record.id",
          "estado": "ACTIVO"
        }
      }
    ]
  }
}
```

`initialDataMapping` acepta:
- `"record.{campo}"` — valor del campo de la fila actual
- valor literal — string, boolean, number

**Validar:** boton aparece en cada fila de la lista; modal se abre con `miObjetoId` pre-rellenado con el ID de la fila; campo hidden no es editable por el usuario.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/features/rbac-examples.md §3`

---

### LAY-09: FK display (relationDisplayFields + relationLayoutIds)

**Pre:** campo FK en el objeto (ej: `categoriaId`); objeto referenciado tiene campos de display
**In:** nombre del campo FK, campos a mostrar del objeto referenciado, layoutId para el link

```json
{
  "name": "mi_objeto_list",
  "objectName": "MiObjeto",
  "layoutType": "RecordList",
  "layoutConfig": {
    "columns": [
      { "key": "nombre",      "label": "Nombre" },
      { "key": "categoriaId", "label": "Categoria" }
    ],
    "relationDisplayFields": {
      "categoriaId": ["nombre", "codigo"]
    },
    "relationLayoutIds": {
      "categoriaId": "categoria_view"
    }
  }
}
```

`relationDisplayFields`: en vez de mostrar el UUID de la FK, muestra los campos indicados del objeto relacionado.
`relationLayoutIds`: convierte el display en un link que navega al layout indicado del objeto relacionado.

**Validar:** columna `categoriaId` muestra `"Nombre Categoria (COD)"` en vez del UUID; click navega al detail de la categoria.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/confluence/layouts-detalle.md`

---

### LAY-10: AutoAssign fields al crear

**Pre:** campo que debe tener un valor fijo o del contexto al momento de crear
**In:** nombre del campo, valor a asignar (literal o placeholder)

```json
{
  "name": "mi_objeto_create",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "create",
    "autoAssignFields": {
      "estado":       "BORRADOR",
      "creadoPorId":  "{{CURRENT_USER_ID}}",
      "activo":       true
    },
    "tabs": {
      "formulario": { "label": "Nuevo", "elements": ["nombre", "descripcion"] }
    },
    "schema": {
      "nombre":      { "type": "text",     "label": "Nombre",      "rules": ["required"], "columns": { "container": 8 } },
      "descripcion": { "type": "textarea", "label": "Descripcion",                        "columns": { "container": 12 } }
    }
  }
}
```

Los campos en `autoAssignFields` se asignan automaticamente al submit — no necesitan aparecer en `tabs.elements` ni en `schema`.

**Validar:** registro creado tiene `estado = "BORRADOR"` y `creadoPorId = ID del usuario logueado` aunque el usuario no los vio en el formulario.
**Doc:** `specs/up1/mods/reference.md §9`

---

### LAY-11: EnableFKCreateButton (crear FK inline)

**Pre:** campo FK en el formulario; objeto referenciado tiene un layout de creacion
**In:** campo FK a habilitar, layoutId de creacion del objeto referenciado

```json
{
  "name": "mi_objeto_create",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "create",
    "enableFKCreateButton": true,
    "tabs": {
      "formulario": { "label": "Nuevo", "elements": ["nombre", "categoriaId"] }
    },
    "schema": {
      "nombre":      { "type": "text", "label": "Nombre",    "rules": ["required"], "columns": { "container": 8 } },
      "categoriaId": {
        "type": "select",
        "label": "Categoria",
        "rules": ["required"],
        "columns": { "container": 12 },
        "createLayoutId": "categoria_create"
      }
    }
  }
}
```

Con `enableFKCreateButton: true` y `createLayoutId` en el campo FK, aparece un boton "+" junto al dropdown que abre un modal para crear la FK en el momento.

**Validar:** dropdown de `categoriaId` tiene boton "+"; al hacer click abre modal de creacion de Categoria; la nueva categoria queda seleccionada en el dropdown.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/mods/creation-guide.md §5.3`

---

### LAY-12: VisibilityConditions en row action

**Pre:** row action que solo debe mostrarse cuando el registro cumple ciertas condiciones
**In:** campo del registro, operador, valor

```json
{
  "rowActions": [
    {
      "id": "activar",
      "label": "Activar",
      "type": "modal",
      "targetLayoutId": "mi_objeto_activar",
      "visibilityConditions": {
        "operator": "AND",
        "conditions": [
          { "field": "estado",  "operator": "==",  "value": "BORRADOR" },
          { "field": "activo",  "operator": "==",  "value": true }
        ]
      }
    },
    {
      "id": "archivar",
      "label": "Archivar",
      "type": "modal",
      "targetLayoutId": "mi_objeto_archivar",
      "visibilityConditions": {
        "operator": "OR",
        "conditions": [
          { "field": "estado", "operator": "==",  "value": "ACTIVO" },
          { "field": "estado", "operator": "==",  "value": "BORRADOR" }
        ]
      }
    }
  ]
}
```

Operadores soportados: `==`, `!=`, `>`, `<`, `>=`, `<=`.
`operator` de agrupacion: `AND` (todas las condiciones), `OR` (al menos una).

**Validar:** accion "Activar" solo aparece en filas con `estado = BORRADOR` Y `activo = true`; accion "Archivar" aparece en filas con estado ACTIVO o BORRADOR.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/features/rbac-examples.md §3`

---

### LAY-13: Filtro por usuario actual

**Pre:** objeto con campo FK al usuario (ej: `asignadoAId`); necesidad de vista "Mis registros"
**In:** campo FK al usuario, placeholder `{{CURRENT_USER_ID}}`

```json
{
  "name": "mis_objetos_list",
  "objectName": "MiObjeto",
  "layoutType": "RecordList",
  "layoutConfig": {
    "columns": [
      { "key": "nombre", "label": "Nombre" },
      { "key": "estado", "label": "Estado" }
    ],
    "defaultFilters": [
      {
        "field":    "asignadoAId",
        "operator": "EQUALS",
        "value":    "{{CURRENT_USER_ID}}"
      }
    ],
    "canCreate": false,
    "showSearch": true
  }
}
```

El placeholder `{{CURRENT_USER_ID}}` se reemplaza en runtime con el ID del usuario autenticado. Util para vistas "Mis tareas", "Mis asignaciones", etc.

**Validar:** lista muestra solo registros donde `asignadoAId` es el ID del usuario logueado; con otro usuario logueado muestra sus propios registros.
**Doc:** `specs/up1/mods/reference.md §9`

---

### LAY-14: Layout con roles restrictivos

**Pre:** layout que solo deben ver ciertos roles
**In:** array de roles permitidos

```json
{
  "name": "mi_objeto_admin_list",
  "objectName": "MiObjeto",
  "layoutType": "RecordList",
  "roles": ["Admin", "Coordinador"],
  "layoutConfig": {
    "columns": [
      { "key": "nombre",    "label": "Nombre" },
      { "key": "estado",    "label": "Estado" },
      { "key": "creadoPor", "label": "Creado Por" }
    ],
    "canCreate":  true,
    "canEdit":    true,
    "canDelete":  true,
    "showSearch": true
  }
}
```

Sin `roles` → layout visible para todos. Con `roles` → solo esos roles lo ven (verificacion server-side via `getAllLayoutsFiltered`).

Para control adicional client-side, agregar `requiredPermissions`:
```json
{
  "roles": ["Admin"],
  "requiredPermissions": ["mod/mi-mod:manage_data"]
}
```

**Validar:** usuario con rol Docente no ve este layout en la navegacion; usuario con rol Admin lo ve.
**Doc:** `specs/up1/features/rbac.md §11`, `specs/up1/features/rbac-examples.md §7`

---

### LAY-15: Layout Calendar (OfferingCalendar)

**Pre:** objeto con campos de fecha/horario; datos de tipo calendario/agenda
**In:** campos de fecha inicio y fin, campo de titulo

```json
{
  "name": "mi_evento_calendar",
  "objectName": "MiEvento",
  "layoutType": "OfferingCalendar",
  "layoutConfig": {
    "startField":   "fechaInicio",
    "endField":     "fechaFin",
    "titleField":   "nombre",
    "colorField":   "estado",
    "colorMapping": {
      "PENDIENTE":  "#F59E0B",
      "CONFIRMADO": "#10B981",
      "CANCELADO":  "#EF4444"
    },
    "canCreate": true,
    "canCreateLayoutId": "mi_evento_create",
    "associatedLayoutConfigs": {
      "view": { "layoutId": "mi_evento_view" }
    }
  }
}
```

**Validar:** vista de calendario muestra eventos posicionados en la fecha correcta; colores reflejan el estado; click en evento abre el view.
**Doc:** `specs/up1/confluence/layouts-detalle.md §tipos-especializados`, `specs/up1/mods/example-engagement.md §5`

---

### LAY-16: Row action con languageTag y modalTitleTag (i18n)

**Pre:** archivo de traducciones del mod con claves para la accion
**In:** claves i18n para el label del boton y titulo del modal

```json
{
  "rowActions": [
    {
      "id":             "crear-hijo",
      "languageTag":    "actions.crearHijo",
      "modalTitleTag":  "actions.crearHijoTitle",
      "type":           "modal",
      "targetLayoutId": "mi_objeto_hijo_create",
      "targetObjectName": "MiObjetoHijo",
      "initialDataMapping": {
        "padreId": "record.id"
      }
    }
  ]
}
```

En `lang/es_CL.json`:
```json
{
  "actions": {
    "crearHijo":      "Agregar hijo",
    "crearHijoTitle": "Nuevo elemento hijo"
  }
}
```

`languageTag` reemplaza `label` cuando se necesita i18n. `modalTitleTag` define el titulo del modal en el idioma del usuario.

**Validar:** boton muestra el texto traducido segun el idioma del usuario; titulo del modal cambia con el idioma.
**Doc:** `specs/up1/mods/i18n.md §6`, `specs/up1/mods/reference.md §9`

---

### LAY-17: Conectar set completo list→view→create→edit

**Pre:** los 4 layouts creados (list, view, create, edit)
**In:** IDs de los 4 layouts

Conexiones necesarias en cada archivo:

**`mi_objeto_list.json`** — conecta hacia view, create:
```json
{
  "layoutConfig": {
    "canCreate": true,
    "canCreateLayoutId": "mi_objeto_create",
    "associatedLayoutConfigs": {
      "view": { "layoutId": "mi_objeto_view" },
      "edit": { "layoutId": "mi_objeto_edit" }
    }
  }
}
```

**`mi_objeto_view.json`** — conecta hacia edit:
```json
{
  "layoutConfig": {
    "mode": "view",
    "associatedLayoutConfigs": {
      "edit": { "layoutId": "mi_objeto_edit" }
    }
  }
}
```

**`mi_objeto_create.json`** y **`mi_objeto_edit.json`** — no necesitan `associatedLayoutConfigs` (el sistema redirige al view tras guardar).

Despues de crear/modificar los 4 archivos: `npm run sync`.

**Validar:** flujo completo funciona — lista → click fila → view → boton editar → edit → guardar → vuelve a view; crear desde lista → create → guardar → aparece en lista.
**Doc:** `specs/up1/mods/reference.md §9`, `specs/up1/mods/llm-guide.md §6`

---

## Diagrama de navegacion

```text
┌──────────────────────┐     click fila                ┌─────────────────────────┐
│     RecordList       │   associatedLayoutConfigs.view │   RecordDetail view     │
│   mi_objeto_list     │ ─────────────────────────────► │   mi_objeto_view        │
└──────────┬───────────┘                                └──────────┬──────────────┘
           │                                                       │
           │ boton Crear                                           │ boton Editar
           │ canCreateLayoutId                                     │ associatedLayoutConfigs.edit
           ▼                                                       ▼
┌──────────────────────┐                                ┌─────────────────────────┐
│  RecordDetail create │                                │  RecordDetail edit      │
│  mi_objeto_create    │                                │  mi_objeto_edit         │
└──────────┬───────────┘                                └──────────┬──────────────┘
           │ guardar → redirige                                    │ guardar → redirige
           ▼                                                       ▼
     (RecordList)                                           (RecordDetail view)
           ▲
           │ guardar → cierra modal
           │
┌──────────┴───────────┐             tab Hijos          ┌─────────────────────────┐
│  RecordDetail create │             type: record-list  │  RecordList embebida    │
│  mi_objeto_hijo_     │◄──────────────────────────     │  mi_objeto_hijo_list   │
│  create              │  row action modal              │  filtro: parentId       │
│  (sin applicationId) │◄── targetLayoutId ─────────── │                         │
└──────────────────────┘                                └─────────────────────────┘
```
