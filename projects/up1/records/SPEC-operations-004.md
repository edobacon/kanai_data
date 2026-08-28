---
id: SPEC-operations-004
project: up1
type: doc
module: operations
tags:
  - up1
  - UI
  - elementos
  - vistas
  - RecordList
  - RecordDetail
  - calendario
  - sidebar
  - modal
  - formulario
  - cards
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
│ Vista {Nombre del Registro}                    [✕
