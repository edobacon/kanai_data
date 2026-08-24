---
id: SPEC-operations-004
project: up1
type: spec
module: operations
category: operations
tags: [up1, UI, elementos, vistas, RecordList, RecordDetail, calendario, sidebar, modal, formulario, cards]
fecha: 2026-04-14
sources:
  - Capturas Playwright sobre localhost:3000 (tenant UPU, rol Colaborador)
  - operations/playwright-navigation.md
  - Screenshots en screenshots/ui-guide/
---
# Guia de elementos de UI en uP1

Referencia visual de todos los elementos de interfaz de uP1, documentados desde la plataforma real con Playwright.

---

## 1. Layout general de la aplicacion

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Logo uPlanner  │  [Idioma] [Tema] [Notif] [ROL ▼] [Usuario ▼] [?]   │  ← Header
├───────┬─────────┴───────────────────────────────────────────────────────┤
│ APPS  │  [Tab Eventos ▼]  [Tab Ofertas ▼]                              │  ← Top tabs
│       ├─────────────────────────────────────────────────────────────────┤
│ App 1 │                                                                 │
│ App 2 │  Contenido principal (RecordList / RecordDetail / Calendar)     │
│ App 3 │                                                                 │
│  ...  │                                                                 │
│       │                                                                 │
└───────┴─────────────────────────────────────────────────────────────────┘
```

**Ref:** [screenshot 00-reauth.png](screenshots/ui-guide/00-reauth.png)

---

## 2. Header

| Elemento | Que hace | Ubicacion | Como interactuar |
|----------|----------|-----------|-----------------|
| **Logo uPlanner** | Navega al home | Esquina superior izquierda | Click |
| **Selector de idioma** | Cambia idioma (ES, EN, PT) | Junto al logo | Click → dropdown |
| **Toggle tema** | Claro/oscuro | Icono sol/luna | Click |
| **Notificaciones** | Muestra notificaciones pendientes | Icono campana | Click |
| **Selector de ROL** | Cambia rol del usuario | "ROL: Colaborador ▼" | Click → dropdown con roles disponibles |
| **Menu usuario** | Email + rol actual + cerrar sesion | Esquina superior derecha | Click → dropdown |
| **Boton ayuda (?)** | Tour de la plataforma | Icono "?" teal | Click |

### Selector de rol (importante para RBAC)

Al cambiar de rol, el sidebar y el contenido visible cambian. Cada rol ve diferentes apps y layouts.

```
Playwright:
  // Abrir selector
  click en elemento con texto "ROL: {rolActual}"
  // Seleccionar nuevo rol
  click en item del dropdown
```

**Ref:** [screenshot vv-06-role-selector.png](screenshots/vv-06-role-selector.png)

---

## 3. Sidebar de apps

Lista vertical izquierda. Cada app tiene icono + nombre. La app activa tiene **borde teal**.

| Elemento | Que hace |
|----------|----------|
| **Item de app** | Click navega a la app |
| **Borde teal** | Indica app activa |
| **Icono** | SVG o Bootstrap Icon definido en `config/app.json` |

```
Playwright:
  // Navegar a app
  await page.getByRole('listitem').filter({ hasText: 'Engagement' }).click();
```

> **Regla:** navegar siempre via clicks del sidebar. `page.goto()` puede perder la sesion.

**Ref:** [screenshot 01-recordlist-table.png](screenshots/ui-guide/01-recordlist-table.png)

---

## 4. Top tabs (navegacion dentro de una app)

Barra horizontal bajo el header. Cada tab es un **dropdown** con sub-items.

| Elemento | Que hace |
|----------|----------|
| **Tab con ▼** | Click abre dropdown con layouts del objeto |
| **Sub-item** | Navega al layout especifico |
| **"+ Crear Vista Personalizada"** | Crea un layout custom |

Ejemplo: Tab "Eventos ▼" abre:
- Mis Eventos (Responsable)
- Crear Evento
- Test Calendario Responsable
- Test Calendario Responsable + ICS

```
Playwright:
  // Abrir dropdown
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim() === 'Eventos');
    if (btn) btn.click();
  });
  // Click en sub-item
  await page.evaluate(() => {
    const items = document.querySelectorAll('.dropdown-item');
    const target = Array.from(items).find(i => i.textContent.trim() === 'Crear Evento');
    if (target) target.click();
  });
```

**Ref:** [screenshot vv-11-eventos-dropdown.png](screenshots/vv-11-eventos-dropdown.png)

---

## 5. RecordList — Vista de tabla

Vista principal de datos en formato tabla.

### Anatomia

```
┌─────────────────────────────────────────────────────────────────┐
│ Titulo ▼                                                         │
│ "26 elementos. Ordenado por createdAt. sin filtros."             │
│                                                                   │
│ [🔍 Buscar...] [🔽Filtros] [⚙Ajustes] [≡Lista] [⊞Cards] [📅Cal] [↻] │
├───┬──────────────┬──────────────┬────────────┬──────┬───────────┤
│ ☐ │ Nombre ↕     │ Descripcion ↕│ Fecha ↕    │ Tipo │ Acciones  │
├───┼──────────────┼──────────────┼────────────┼──────┼───────────┤
│ ☐ │ Jornada de...│ Dia completo │ -          │Curso │ [⋯]       │
│ ☐ │ Hackathon... │ Maraton 48h  │ -          │Taller│ [⋯]       │
├───┴──────────────┴──────────────┴────────────┴──────┴───────────┤
│ 1-5 de 26    [< 1 2 3 4 5 6 >]       Mostrar [5 ▼] por pagina │
└─────────────────────────────────────────────────────────────────┘
```

### Elementos de la toolbar

| Elemento | Titulo (title attr) | Que hace |
|----------|-------------------|----------|
| **Busqueda** | — | Filtra en todas las columnas. Texto coincidente se resalta en rojo |
| **Filtros** | "Filtros" | Abre modal "Configurar Filtros" con "+ Agregar Filtro" por campo/operador/valor |
| **Ajustes** | "Ajustes" | Dropdown: "Descargar plantilla de importacion", "Importar registros desde Excel" |
| **Vista Lista** | "Vista de Lista" | Cambia a vista tabla (activo = fondo oscuro) |
| **Vista Tarjetas** | "Vista de Tarjetas" | Cambia a vista cards |
| **Vista Calendario** | "Vista Calendario" | Cambia a vista calendario semanal |
| **Refresh** | "Actualizar datos" | Recarga datos sin recargar pagina |

> No confundir con el boton **Reload** de RecordDetail (seccion 7): Refresh opera sobre el listado completo de RecordList, Reload opera sobre un registro individual abierto en RecordDetail.

### Elementos de la tabla

| Elemento | Que hace |
|----------|----------|
| **Checkbox columna** | Selecciona registro para acciones bulk |
| **Checkbox header** | Selecciona todos los registros de la pagina |
| **Header con ↕** | Ordena por esa columna (click alterna asc/desc) |
| **Link en primera columna** | Abre RecordDetail view como modal |
| **Icono lapiz (Edit field)** | Abre mini-modal de edicion inline sobre la celda |
| **Boton ⋯ (Acciones)** | Dropdown con acciones por fila (ver, editar, eliminar, custom) |

### Paginacion

| Elemento | Que hace |
|----------|----------|
| **"1-5 de 26"** | Info de rango actual |
| **Numeros de pagina** | Navega a pagina especifica |
| **< >** | Pagina anterior/siguiente |
| **<< >>** | Primera/ultima pagina |
| **"Mostrar [5 ▼]"** | Cambia registros por pagina |

**Ref:** [screenshot 01-recordlist-table.png](screenshots/ui-guide/01-recordlist-table.png)

---

## 6. RecordList — Vista de tarjetas (cards)

Mismos datos pero en formato cards. Cada card muestra:

```
┌──────────────────────────┐
│ [CURSO]                  │  ← Badge de tipo (coloreado)
│ Jornada de Deporte       │  ← Titulo (link clickeable)
│ y Bienestar              │
│ Dia completo de          │  ← Descripcion truncada
│ actividades deportiva... │
│                          │
│ Capacidad    0/150       │  ← Barra de progreso
│ ━━━━━━━━━━━━━━━━━━━━━━━ │
│ ○ Inscribirse            │  ← Estado de inscripcion
│ [⊕ Inscribirse]          │  ← Boton de accion
└──────────────────────────┘
```

| Elemento | Que hace |
|----------|----------|
| **Badge** | Tipo del registro (CURSO, TALLER, WEBINAR) con color |
| **Titulo** | Nombre del registro, click abre RecordDetail |
| **Descripcion** | Truncada con "..." |
| **Barra capacidad** | Progreso usado/maximo |
| **Boton accion** | Accion contextual (Inscribirse, Ver, etc.) |

**Ref:** [screenshot 04-cards-view.png](screenshots/ui-guide/04-cards-view.png)

---

## 7. RecordDetail — Modal de vista

Se abre como **modal** sobre el RecordList. La lista queda visible detras.

```
┌────────────────────────────────────────────────────┐
│ Vista {Nombre del Registro}                    [✕] │  ← Titulo + cerrar
├────────────────────────────────────────────────────┤
│                                                     │
│ NOMBRE                                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Jornada de Deporte y Bienestar                  │ │  ← Input readonly
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ RECORD TYPE                                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Curso                                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ SERVICE                                             │
│ Deportes y Recreacion  ← Link clickeable (FK)       │
│                                                     │
│ MAX CAPACITY                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 150                                             │ │
│ └─────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### Elementos del modal

| Elemento | Que hace | Selector CSS |
|----------|----------|-------------|
| **Titulo** | "Vista {nombre}" | `.modal-title, h2` en modal |
| **Boton cerrar (✕)** | Cierra el modal | `.modal-close-button` (NO `.btn-close`) |
| **Campos readonly** | Muestran datos del registro | `input[readonly]` dentro del modal |
| **Links FK** | Click navega al registro relacionado | `a` dentro del modal (ej: "Deportes y Recreacion") |
| **Tabs** (si aplica) | Cambian seccion visible | `div.vf-tab-wrapper` |
| **Listas embebidas** (si aplica) | RecordList dentro de un tab | `type: record-list` en schema |

### Boton Reload

`RecordDetail` (vista y formulario) muestra por default un boton de recarga en el header (`showReloadButton`, default `true`; opt-out con `layoutConfig.showReloadButton:false`). No aparece si el layout esta dentro de un modal stack.

- En modo **view**: hace un refetch completo del registro.
- En modo **edit/create**: reemplaza solo las opciones de los selects FK/references (y campos formula), sin resetear los valores que el usuario ya tipeo en el formulario. La logica vive en `useDetailContextReload`.

Ver diferencia con Refresh en la seccion 5. Ver [features/recordlist-recorddetail-2026-07.md](../features/recordlist-recorddetail-2026-07.md).

```
Playwright — cerrar modal (metodo seguro):
  await page.evaluate(() => {
    const close = document.querySelector('.modal-close-button');
    if (close) close.click();
  });
```

**Ref:** [screenshot 03-recorddetail-modal.png](screenshots/ui-guide/03-recorddetail-modal.png)

---

## 8. RecordDetail — Formulario de creacion

Se abre como **pagina completa** (no modal) al navegar a "Crear" desde dropdown.

### Tipos de campo en formularios

| Tipo visual | Ejemplo | HTML |
|-------------|---------|------|
| **Text input** | Nombre del Evento | `<input type="text">` |
| **Textarea** | Descripcion | `<textarea>` |
| **Select FK** | Oferta → "Select Oferta..." | `<select>` o componente custom con placeholder |
| **Select enum con transiciones** | Estado de Activity/Curriculum | `<select>` que en edicion solo ofrece el valor actual + destinos alcanzables; el resto se oculta (AP-03) |
| **Date picker** | Fecha de Inicio | `<input>` con calendario popup |
| **Time picker** | Hora de Inicio | `<input>` con formato `--:-- ----` |
| **Toggle** | Repetir evento | Switch on/off |
| **Number** | Max Capacity | `<input type="number">` |
| **Hidden** | eventId (auto-assign) | `<input type="hidden">` |

El select con transiciones reemplazo al badge de solo lectura (`activity-status-badge`) en los layouts de Activity (julio 2026): antes el estado se mostraba fijo, ahora es editable directo desde el formulario. Ver [features/enum-transitions.md](../features/enum-transitions.md).

### Selector de relacion multiple (Picker / MultiSelectPicker)

Componente dedicado para campos de relacion FK/N:M dentro de RecordDetail (UPONE-1159, rama `feature/RecordList-picker`). Se declara como un tab de tipo `multiSelectPicker` en el layout JSON y reemplaza al patron manual de "sub-lista + agregar uno a uno" cuando el formulario necesita relacionar el registro con multiples registros de otro objeto.

**Que es:** un modal que abre un `RecordList` embebido en `mode="picker"` (`layout/src/layouts/RecordList.vue:1493`) sobre el objeto relacionado, con busqueda, seleccion multiple (fila a fila o "seleccionar todos los que matchean el filtro actual") y confirmacion en bloque.

**Ejemplo real:** asignar `ResourceTypes` a un `Resource` en academic-scheduling (`mods/academic-scheduling/config/layouts/resource-edit.json:16-27`):

```json
"resourceTypes": {
  "type": "multiSelectPicker",
  "label": "Tipos de recurso",
  "sourceObject": "ResourceTypes",
  "sourceLayout": "resourcetypes_picker",
  "displayField": "name",
  "onConfirm": {
    "action": "bulkCreate",
    "object": "ResourceTypeAssignment",
    "fields": { "resourceId": "{{id}}", "resourceTypeId": "{{selectedId}}" }
  }
}
```

Al confirmar, crea un registro `ResourceTypeAssignment` por cada `ResourceTypes` seleccionado (bulk mutation), materializando la relacion N:M via tabla junction. El listado de asignaciones existentes se ve aparte, en el tab `general` via el campo `resourceTypesList` (`type: record-list`, `resource-edit.json:37-44`).

**Componentes reales:**

| Pieza | Archivo | Responsabilidad |
|-------|---------|-----------------|
| `MultiSelectPickerTab` | `layout/src/components/organisms/MultiSelectPickerTab/MultiSelectPickerTab.vue:1` | Host del tab: boton "+ Agregar" (`:disabled="!canAdd"`, linea 8), chips de seleccion pendiente en modo creacion |
| `MultiSelectPickerModal` | `layout/src/components/organisms/Modal/MultiSelectPickerModal/MultiSelectPickerModal.vue:1` | El modal en si: envuelve un `LayoutOrchestrator` con `mode="picker"` (linea 95) |
| `useMultiSelectPicker` | `layout/src/composables/useMultiSelectPicker.ts:168` | Logica de confirmacion (`bulkCreate` / `bulkUpdate` / `customMutation`), materializacion de ids seleccionados, limite de fetch (`PICKER_FETCH_ALL_LIMIT = 10000`, linea 103) |

**Comportamiento:**

- **Busqueda y seleccion:** igual que el RecordList estandar (seccion 5), pero en modo picker el banner de seleccion masiva se reemplaza por el "picker banner" (`layout/src/layouts/RecordList.vue:300-350`), con contador de seleccionados y boton "Confirmar seleccion".
- **Modo creacion (registro padre aun no existe):** el tab detecta este caso via `inject(PICKER_IS_NEW_RECORD_KEY)` (`MultiSelectPickerTab.vue:128`) y NO ejecuta la mutacion al confirmar: materializa los ids seleccionados y los encola (evento `deferred-confirm`, `MultiSelectPickerModal.vue:423`), mostrandolos como chips "pendientes" (icono reloj de arena) hasta que el registro padre se guarda. Recien ahi RecordDetail dispara la mutacion real con el `{{id}}` definitivo (PICK-05 / UPONE-1161).
- **Modo edicion (registro padre ya existe):** el picker ejecuta la mutacion de inmediato al confirmar (`deferred: false`), sin encolar.
- **Prefill opcional:** si el tab declara `prefill`, el modal muestra primero un mini-formulario (`PrefillStepForm.vue`) antes de la lista de seleccion, para capturar campos compartidos (por ejemplo un contexto) que luego se resuelven como `{{prefill.<campo>}}` en `onConfirm`.
- **Capacidad opcional:** si la row action declara `capacity`, el banner muestra cupos restantes en vivo y bloquea "Confirmar seleccion" al superar el limite (`overCapacity`, `MultiSelectPickerModal.vue:339`).

**Multimodal y z-index (fix reciente):** cuando el picker se abre dentro de un formulario de creacion que a su vez esta dentro de un modal (`ModalStackManager`, z-index base 1050 + incrementos de 10 por modal apilado), el z-index default del picker (1060) puede colisionar con el del formulario host. `MultiSelectPickerTab` fuerza `z-index: 2000` (constante `PICKER_MODAL_Z_INDEX`, `MultiSelectPickerTab.vue:107`) para quedar siempre por encima del RecordDetail alojado en modal, sin llegar a los dialogos de emergencia (9999).

**Scroll (fix reciente):** el body del modal es scrollable salvo en el paso de prefill (`:scrollable="step !== 'prefill'"`, `MultiSelectPickerModal.vue:6`), que en cambio usa `overflow: visible` y una altura minima fija (`.multi-select-picker-body--prefill`, `MultiSelectPickerModal.vue:550-554`) para que el dropdown de un select FK abierto no quede recortado por el scroll interno. El picker banner (contador + boton confirmar) queda `position: sticky; top: 0` (`MultiSelectPickerModal.vue:540-544`) para permanecer visible mientras la lista interna se desplaza.

Ver tambien: `layout/src/composables/usePickerEmits.ts` y los tipos `MultiSelectPickerConfirmConfig` / `PrefillConfig` / `MultiSelectPickerTabConfig` en `layout/src/types/recordlist.ts`.

### Botones de formulario

| Boton | Donde aparece | Que hace |
|-------|--------------|----------|
| **Guardar / Save** | Footer del formulario | Crea el registro via GraphQL mutation |
| **Cancelar / Cancel** | Footer del formulario | Cierra sin guardar |
| **Siguiente / Next** | Footer de wizard (steps) | Avanza al paso siguiente |
| **Anterior / Previous** | Footer de wizard (steps) | Retrocede al paso anterior |

**Ref:** [screenshot vv-12-crear-evento.png](screenshots/vv-12-crear-evento.png)

---

## 9. Edicion inline

Mini-modal que aparece sobre la celda al clickear el icono de lapiz.

```
              ┌───────────────────────────────────────┐
              │ Nombre                            [✕] │
              │ ┌───────────────────────────────────┐ │
              │ │ Jornada de Deporte y Bienestar    │ │
              │ └───────────────────────────────────┘ │
              │ [Cancelar]          [Guardar]          │
              └───────────────────────────────────────┘
```

| Elemento | Que hace |
|----------|----------|
| **Label** | Nombre del campo |
| **Input** | Valor actual editable |
| **Cancelar** | Cierra sin guardar |
| **Guardar** | Persiste el cambio via GraphQL mutation |

Si el campo tiene transiciones declaradas, al abrir la celda el dropdown consulta `getValidTransitions` y muestra solo los destinos permitidos desde el valor actual. Si el query falla, cae al enum completo (fail-soft): esto no abre una brecha de seguridad porque el backend sigue rechazando cualquier transicion invalida.

### Edicion masiva con transiciones de estado

Cuando el campo elegido en un bulk edit tiene transiciones declaradas, el flujo agrega un paso de dry-run antes de aplicar el cambio:

1. Se ejecuta `previewBulkTransition` sobre los registros seleccionados (sin mutar).
2. Se abre el modal `BulkTransitionPreview` con el resultado agrupado: "N actualizados / M omitidos", con la causa de omision por grupo (ej. transicion no valida desde el estado actual).
3. Al confirmar, el cambio solo se aplica a los `applicableIds` (los omitidos quedan sin tocar).

Ver [features/enum-transitions.md](../features/enum-transitions.md).

```
Playwright:
  // Abrir inline edit
  await page.evaluate(() => {
    const editBtn = document.querySelector('button[title="Edit field"]');
    if (editBtn) editBtn.click();
  });
  // Cancelar
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim() === 'Cancelar');
    if (btn) btn.click();
  });
```

**Ref:** [screenshot 07-inline-edit.png](screenshots/ui-guide/07-inline-edit.png)

---

## 10. Row actions (menu contextual)

Dropdown que aparece al clickear ⋯ al final de cada fila.

| Accion | Tipo | Que hace |
|--------|------|----------|
| **Ver** | Navegacion | Abre RecordDetail view como modal |
| **Editar** | Navegacion | Abre RecordDetail edit como modal |
| **Eliminar** | Destructiva | Elimina registro (con confirmacion) |
| **Custom** (ej: "Crear Hijo") | Modal | Abre layout target con datos pre-poblados |

### Eliminar con impacto en cascada

Cuando el layout declara `deleteWarning.enabled:true` y `type:"critical"` en su `layoutConfig`, la fila **Eliminar** abre `CriticalWarningModal` en vez del modal estandar de confirmacion.

- Al abrirse dispara la query `deleteImpactPreview` (el mismo motor que el delete real, sin mutar) que calcula cuantos hijos se borrarian en cascada y si hay referencias externas que bloquean.
- Mientras carga, muestra "Calculando el impacto...".
- Estado `cascade`: lista el desglose de hijos por tipo (ej. "CurricularSection: 4") y habilita el boton Eliminar.
- Estado `restricted`: muestra las referencias que bloquean (mensajes con nombres legibles, no ids) y **deshabilita** el boton de confirmar.
- El nombre del registro va en la **pregunta** del cuerpo ("Estas seguro de que deseas eliminar «N»?"), nunca en el boton (que mantiene el label fijo "Eliminar"), para que nombres largos envuelvan sin desbordar el boton.
- Las row actions de eliminar embebidas dentro de un `RecordDetail` (por ejemplo, secciones o categorias de un Curriculum) usan el mismo mecanismo.

Ejemplo real de configuracion: `mods/curriculum-design/config/layouts/default_Activity_list.json:52-61`. Ver [features/delete-cascade.md](../features/delete-cascade.md).

Las acciones visibles dependen de:
- `requiredCapability` del row action → RBAC
- `visibilityConditions` → estado del registro
- `roles` del layout

```
Playwright:
  // Abrir menu
  await page.evaluate(() => {
    const btn = document.querySelector('td .btn-link.dropdown-toggle');
    if (btn) btn.click();
  });
  // Click en accion
  await page.evaluate((label) => {
    const items = document.querySelectorAll('.dropdown-item');
    const target = Array.from(items).find(i => i.textContent.includes(label));
    if (target) target.click();
  }, 'Ver');
```

**Ref:** [screenshot 02-row-actions.png](screenshots/ui-guide/02-row-actions.png)

---

## 11. Panel de filtros

Modal "Configurar Filtros" con builder de condiciones.

```
┌─────────────────────────────────────────────────┐
│ Configurar Filtros                          [✕] │
│                                                  │
│           🔽                                     │
│   Aun no tienes filtros                         │
│   Los filtros te permiten encontrar registros   │
│   especificos segun sus campos y valores        │
│                                                  │
│   [⊕ Agregar Filtro]                            │
│                                                  │
│ [Cancelar]                         [Aplicar]    │
└─────────────────────────────────────────────────┘
```

Al agregar un filtro: seleccionar campo → operador → valor.

Operadores: EQUALS, NOT_EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH, GREATER_THAN, LESS_THAN, IN, IS_NULL, IS_NOT_NULL.

**Ref:** [screenshot 05-filters-panel.png](screenshots/ui-guide/05-filters-panel.png)

---

## 12. Menu de ajustes (importacion)

Dropdown con opciones de importacion masiva.

| Opcion | Que hace |
|--------|----------|
| **Descargar plantilla de importacion** | Descarga Excel con columnas del objeto |
| **Importar registros desde Excel** | Abre wizard de importacion (upload → preview → import) |

**Ref:** [screenshot 06-settings-panel.png](screenshots/ui-guide/06-settings-panel.png)

---

## 13. Vista calendario (OfferingCalendar)

Vista semanal con eventos en franjas horarias.

```
┌─────────────────────────────────────────────────────────────────┐
│ [<] [Hoy] [>]  13 - 19 Abr. 2026 ▼  [+ Crear evento]  [👁]    │
│                                        [Semana ▼]  [Todos ▼]   │
├─────────────────────────────────────────────────────────────────┤
│ ⚠ Conflicto de horario detectado                               │
│   Algunos eventos se superponen con horarios de descanso...     │
├─────────────────────────────────────────────────────────────────┤
│ 🟧Taller ✅Inscrito 🟠Pendiente ✖En espera ⬜Cancelado          │
│ 🔄Recurrente  ▓Zona de descanso  ⚠Conflicto  □Feriado          │
├─────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┤
│     │ LUN  │ MAR  │ MIE  │ JUE  │ VIE  │ SAB  │ DOM  │         │
│     │  13  │  14  │  15  │  16  │  17  │  18  │  19  │         │
├─────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤         │
│09:00│      │      │██████│      │      │      │      │         │
│     │      │      │Taller│      │      │      │      │         │
│10:00│      │      │0/50  │      │      │      │      │         │
│     │      │      │Klaus │      │      │      │      │         │
│11:00│      │──────│Molt  │      │      │      │      │         │
│     │      │      │09-13 │      │      │      │      │         │
│12:00│      │      │██████│      │      │      │      │         │
│13:00│▓▓▓▓▓▓│▓▓▓▓▓▓│▓▓▓▓▓▓│▓▓▓▓▓▓│▓▓▓▓▓▓│      │      │ ← Zona descanso
└─────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

### Elementos del calendario

| Elemento | Que hace |
|----------|----------|
| **Flechas < >** | Semana anterior/siguiente |
| **Hoy** | Vuelve a la semana actual |
| **Rango de fecha** | Muestra semana actual, click abre selector |
| **+ Crear evento** | Abre formulario de creacion de evento |
| **Selector Semana/Dia/Mes** | Cambia granularidad de vista |
| **Filtro "Todos"** | Filtra por persona/grupo |
| **Leyenda** | Colores por estado del evento |
| **Bloque de evento** | Click abre detalle del evento |
| **Zona de descanso** | Franja diagonal gris (bloqueada o soft) |
| **Alerta de conflicto** | Warning amarillo cuando hay superposicion |
| **Dia actual** | Resaltado en teal con linea horizontal |

**Ref:** [screenshot 08-calendar-from-list.png](screenshots/ui-guide/08-calendar-from-list.png), [screenshot vv-14-calendar.png](screenshots/vv-14-calendar.png)

---

## 14. Selectores CSS reales (verificados con Playwright)

Referencia para automatizacion — selectores reales, no documentados.

| Elemento | Selector CSS real |
|----------|------------------|
| Boton cerrar modal | `.modal-close-button` |
| Items de sidebar | `[role="listitem"]` con `hasText` |
| Dropdown items (tabs) | `.dropdown-item` |
| Input de busqueda | `input[placeholder*="Buscar"]` |
| Headers de tabla | `th` |
| Links de primera columna | `td a` |
| Boton de acciones por fila | `td .btn-link.dropdown-toggle` |
| Boton inline edit | `button[title="Edit field"]` |
| Tabs dentro de modal | `div.vf-tab-wrapper` |
| Checkbox de fila | `td input[type="checkbox"]` |
| Paginacion | `.page-link` |
| Toggle vista lista | `button[title="Vista de Lista"]` |
| Toggle vista cards | `button[title="Vista de Tarjetas"]` |
| Toggle vista calendario | `button[title="Vista Calendario"]` |
| Boton filtros | `button[title="Filtros"]` |
| Boton ajustes | `button[title="Ajustes"]` |
| Boton refresh | `button[title="Actualizar datos"]` |

---

## 15. Flujo de navegacion completo

```text
┌───────────────────────────────┐
│ localhost:3000                │
│ → /login/UPU → auto-auth      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ /UPU                          │
│ Bienvenido a uPlanner One     │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ Click app en sidebar          │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ App activa (tabs visibles)    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ Click tab ▼ → dropdown items  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ RecordList                    │
│ (tabla / cards / calendario)  │
└──┬──────┬───────┬────────┬────┘
   │      │       │        │
   │ Click│ Click │ Click  │ Click
   │ link │ Crear │  ⋯    │  ✏️
   ▼      ▼       ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│Record│ │Record│ │Row   │ │Inline    │
│Detail│ │Detail│ │action│ │edit      │
│view  │ │create│ │(drop)│ │(mini-mod)│
│(mod) │ │(pag.)│ └──┬───┘ └──────────┘
└──┬───┘ └──┬───┘    │
   │        │     ▼Ver
   │Click   │Guar-┌──────────────┐
   │Editar  │dar  │RecordDetail  │
   │        │     │view (modal)  │
   ▼        │     └──────────────┘
┌──────────┐│     │Custom
│RecordDet.││     ▼
│edit (mod)││  ┌──────────────┐
└──┬───────┘│  │Modal target  │
   │Guardar ▼  │(layout aux.) │
   └────────►  └──────────────┘
```

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-14 | Documento inicial: guia completa de elementos UI documentada con Playwright sobre uP1 local |
| 2026-07-16 | Delete en cascada (UPONE-1382), selector de estado con transiciones (AP-03/04, UPONE-1381) y boton reload de RecordDetail (AP-07) |
| 2026-07-16 | Selector de relacion multiple Picker / MultiSelectPicker (UPONE-1159, rama feature/RecordList-picker): modo creacion diferido, fix de z-index en contexto multimodal y fix de scroll del paso de prefill |
