---
id: SPEC-confluence-006
project: up1
type: spec
module: confluence
tags: []
---

# Documentacion de Layouts (Detalle)

Seccion: Documentacion de Layouts
Link ES: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1944551427
Link EN: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1945370638
Tags: `layouts` `record-list` `record-detail` `chibi-list` `configuracion` `campos` `acciones`

Guias detalladas del Layout Engine. Existe version en espanol e ingles (contenido equivalente).

---

## Conceptos Clave de Layouts

- **ID ES**: 1944682503 | **ID EN**: 1945370650
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1944682503
- **Tags**: `layouts` `conceptos` `configuracion` `campos` `acciones` `relaciones`

### Anatomia de un layout
Un layout es un JSON que controla que se muestra, como se comporta y que acciones estan disponibles.

### Elementos clave

**Campos (fields):**
- Cada campo tiene `key` (nombre tecnico), `label` (nombre visible), tipo de dato
- Tipos: texto, numero, fecha, relacion (FK), booleano, enum, formula, rich text
- Campos virtuales: no existen en BD, se calculan en runtime

**Columnas (columns):**
- Solo para RecordList. Definen que campos se muestran en la tabla
- Propiedades: ancho, alineacion, ordenable, formato

**Secciones (sections):**
- Solo para RecordDetail. Agrupan campos en bloques visuales
- Tipos: tabs, steps (wizard), simple sections

**Acciones (actions):**
- Botones que ejecutan operaciones
- Tipos: create, edit, delete, custom (ejecuta logica definida en el mod)
- Se pueden configurar por fila o globales

**Filtros (filters):**
- Definen que criterios de busqueda estan disponibles
- Tipos: texto libre, dropdown (enum), rango de fechas, booleano

**Relaciones:**
- FK se muestran como dropdowns o lookup fields
- Relaciones 1:N se muestran como listas embebidas en RecordDetail

---

## Como Elegir el Tipo de Layout Correcto

- **ID ES**: 1944256520 | **ID EN**: 1945141251
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1944256520
- **Tags**: `layouts` `decision` `tipos`

### Arbol de decision

```
Necesitas mostrar multiples registros?
├── Si → Es una superficie reducida (sidebar, mobile)?
│   ├── Si → ChibiList
│   └── No → RecordList
└── No → Es un formulario de crear/editar/ver?
    ├── Si → RecordDetail
    └── No → Es un calendario?
        ├── Si → OfferingCalendar
        └── No → Es un flujo de importacion?
            ├── Si → ImportTaskList
            └── No → Es un chat?
                └── Si → AiChatbox
```

---

## Layouts por Defecto

- **ID ES**: 1944944645 | **ID EN**: 1945108485
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1944944645
- **Tags**: `layouts` `defaults` `convencion`

### Convencion
Cuando no se configura un layout especifico, el sistema genera uno automatico basado en la definicion del objeto.

**Patron de nombres:** `default_{ObjectName}_{mode}`
- `default_Person_list` → RecordList automatico con todos los campos visibles
- `default_Person_view` → RecordDetail automatico en modo lectura
- `default_Person_create` → RecordDetail automatico en modo creacion

### Comportamiento
- Incluye todos los campos del objeto
- Columnas/secciones generadas automaticamente
- Acciones CRUD estandar
- Para personalizar: crear layout explicito en el mod

---

## RecordDetail

- **ID ES**: 1944780813 | **ID EN**: 1945174022
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1944780813
- **Tags**: `record-detail` `formularios` `tabs` `steps` `campos`

Componente para visualizar o editar un registro individual.

### Modos
- **view**: solo lectura
- **create**: formulario de creacion
- **edit**: formulario de edicion

### Estructura
- **Secciones**: agrupan campos. Tipos: `tab` (pestanas), `step` (wizard), `section` (simple)
- **Campos**: heredan tipo y validacion del objeto. Pueden tener `readOnly`, `hidden`, `required` overrides
- **Listas embebidas**: relaciones 1:N se muestran como ChibiList o RecordList dentro del detalle
- **Acciones**: botones configurables (guardar, cancelar, custom)

### Configuracion minima
```json
{
  "layoutType": "RecordDetail",
  "objectName": "Person",
  "mode": "view",
  "sections": [
    {
      "label": "Datos generales",
      "fields": ["firstName", "lastName", "email"]
    }
  ]
}
```

---

## RecordList

- **ID ES**: 1945042949 | **ID EN**: 1944256532
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1945042949
- **Tags**: `record-list` `tablas` `filtros` `paginacion` `acciones`

Componente de tabla para listar registros con CRUD completo.

### Capacidades
- Busqueda por texto libre
- Filtros configurables por campo
- Paginacion (server-side)
- Ordenamiento por columna
- Acciones por fila (ver, editar, eliminar, custom)
- Acciones globales (crear, exportar, importar)
- Seleccion multiple para acciones bulk

### Configuracion minima
```json
{
  "layoutType": "RecordList",
  "objectName": "Person",
  "columns": [
    { "key": "firstName", "label": "Nombre" },
    { "key": "lastName", "label": "Apellido" },
    { "key": "email", "label": "Email" }
  ]
}
```

---

## Tipos de Layout Especializados

- **ID ES**: 1945370626 | **ID EN**: 1944780825
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1945370626
- **Tags**: `layouts` `especializados` `chibi-list` `calendar` `import` `chatbox`

### ChibiList
Lista compacta para superficies reducidas. Muestra titulo + subtitulo + avatar opcional.

### OfferingCalendar
Vista de calendario para programacion academica y eventos. Soporta drag-and-drop.

### ImportTaskList
Flujo guiado de importacion: seleccionar archivo → mapear columnas → ejecutar → ver resultados.

### AiChatbox
Widget conversacional de Yupi embebido en cualquier vista.
