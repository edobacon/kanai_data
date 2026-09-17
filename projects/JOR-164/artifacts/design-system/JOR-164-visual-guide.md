# JOR-164 — Guía de implementación UI

> Paginación server-side + filtros en los listados de items. Fiel a la maqueta aprobada.
> Todo lo que aparece abajo (textos, orden, estados, deshabilitados) es contrato visual: no improvisar variantes.

---

## 0. Alcance por vista

| # | Vista / componente | Archivo | REQs | Cambio visual |
|---|---|---|---|---|
| 1 | `Pagination` | `front/jormat-front/src/components/ui/pagination/pagination.tsx` | REQ-01 | No |
| 2 | `CrearCatalogoView` + `ItemsPickerTable` | `front/jormat-front/src/.../CrearCatalogoView` | REQ-08, REQ-09, REQ-11, REQ-14 | Sí |
| 3 | `CrearCatalogoView` modo edición + `useItemsByIds` | idem | REQ-06, REQ-10, REQ-11 | Sí |
| 4 | `GenerarDesdeCatalogoView` | `front/jormat-front/src/.../GenerarDesdeCatalogoView` | REQ-10, REQ-12, REQ-14 | Sí (se elimina un aviso) |
| 5 | `ItemSearchPanel`, `ItemsListView` | — | REQ-01, REQ-14 | No (solo verificación) |

---

## 1. Componente `Pagination` (REQ-01)

### Cambio

Único cambio: `type="button"` en los **3 botones** del componente (Anterior, Siguiente y cualquier control interno que hoy sea `<button>` sin type). Sin `type`, el default es `submit`, y dentro de un `<form>` paginar dispara el submit del formulario.

**No cambia**: API pública (`page`, `pageCount`, `onPageChange`), markup, clases ni textos.

### Anatomía (se conserva tal cual)

```
[ info textual ]                    [ « Anterior ] [ Página X de Y ] [ Siguiente » ]
```

- Fila flex, `align-items:center`, `gap:10px`, `flex-wrap:wrap`, padding superior `12px`.
- Bloque izquierdo: `.info` — 12px, color muted.
- Bloque derecho: `.pages` empujado con `margin-left:auto`, `gap:6px`.
- Botones tamaño `sm` (12px, padding `4px 9px`).
- Separador central `.page-of` — 12px, muted, padding lateral `4px`.

### Textos

| Elemento | Texto |
|---|---|
| Botón anterior | `« Anterior` |
| Botón siguiente | `Siguiente »` |
| Indicador de página | `Página {page} de {pageCount}` |
| Info (patrón general) | `Mostrando {desde}–{hasta} de {total} items` |

Números con separador de miles local (`13.575`, `1.358`). El guion entre rango es `–` (en dash), no `-`.

### Estados de los botones

| Situación | Anterior | Siguiente |
|---|---|---|
| Página intermedia | habilitado | habilitado |
| `page === 1` | `disabled` | habilitado |
| `page === pageCount` | habilitado | `disabled` |
| `pageCount === 1` | `disabled` | `disabled` |
| Cargando | `disabled` | `disabled` |

Deshabilitado = atributo `disabled` real + opacidad `.45`. No se ocultan.

### Efecto observable a verificar

Antes: paginar dentro del form del catálogo disparaba el submit y mostraba el toast de error `Agrega al menos un item al catálogo`. Después: paginar no emite ningún toast. El toast se mantiene, pero **solo** al presionar Guardar.

---

## 2. Crear catálogo — picker server-side (REQ-08, REQ-09, REQ-11, REQ-14)

### 2.1 Jerarquía de la vista

```
CrearCatalogoView (<form>)
├─ AppBar
│   ├─ Título "Crear catálogo"
│   ├─ Subtítulo "Los items seleccionados se guardan por ID"
│   ├─ spacer
│   ├─ Botón "Cancelar" (secundario)
│   └─ Botón "Guardar catálogo" (primario, submit)
└─ Body
    ├─ Sección "Datos del catálogo"
    ├─ Sección "Generar catálogo"
    ├─ SelectionBar
    ├─ Sección "Items disponibles" → ItemsPickerTable
    ├─ Pagination
    └─ Nota + chips de selección
```

### 2.2 Sección "Datos del catálogo"

Grid de 4 columnas `1.2fr 1fr .8fr auto`, `gap:12px`, `align-items:end`, margen inferior `22px`. La cuarta celda queda vacía.

| Campo | Label | Control |
|---|---|---|
| Nombre | `Nombre` | input texto |
| Descripción | `Descripción` | input texto |
| Estado | `Estado` | select con opciones `Activo` / `Inactivo` |

Labels: 12px, muted, `font-weight:500`, sobre el control, `gap:4px`.

### 2.3 Sección "Generar catálogo"

Título de sección `Generar catálogo` (13px, semibold) + bajada:

> `Aplica los filtros en el servidor y selecciona todos los items que coincidan.`

Mismo grid de 4 columnas:

| Col | Contenido |
|---|---|
| 1 | Campo `Marca` — input texto |
| 2 | Campo `Proveedores` — select. Primera opción: `Todos los proveedores` |
| 3 | Checkbox alineado a la base con label `Solo items en oferta` (se reserva un label vacío `&nbsp;` arriba para alinear con los demás campos, alto `33px`) |
| 4 | Botón primario `Generar catálogo` |

Comportamiento: envía los filtros al servidor, recibe los IDs coincidentes y los **agrega** a la selección acumulada (no la reemplaza). Debe ser `type="button"`.

### 2.4 SelectionBar

Barra sobre la tabla: fondo `#f7f8fa`, borde `1px solid var(--border)`, radio 6px, padding `10px 14px`, margen inferior `14px`, 13px.

```
[ **3 items seleccionados** en total ] · [ 2 de esta página ]  …  [ Ver selección ] [ Limpiar selección ]
```

- El conteo total va en `<strong>`, el resto en peso normal.
- Separador `·` y el texto `{n} de esta página` en color muted.
- `spacer` flexible antes de los botones.
- `Ver selección`: botón `sm` normal. `Limpiar selección`: botón `sm ghost` (sin borde, texto en color primario).

### 2.5 `ItemsPickerTable` — de no controlada a controlada

La tabla deja de filtrar y paginar en cliente. Pasa a recibir:

- `items` — solo la página vigente
- `total`, `page`, `pageCount`
- `filters` (los 4 filtros por columna) y `onFiltersChange`
- `onPageChange`
- `selectedIds` y `onToggle` / `onToggleAll`
- `loading`, `error`, `onRetry`

Regla: la tabla **no** deriva nada del universo de items; todo lo decide el servidor.

#### Columnas

| # | Header | Contenido | Notas |
|---|---|---|---|
| 1 | (checkbox) | checkbox de fila | ancho fijo `38px`; header lleva el checkbox "todos" |
| 2 | `Número` | código del item | fuente mono, 12px |
| 3 | `Descripción` | texto | |
| 4 | `Referencias` | lista separada por `, ` | fuente mono, 12px |
| 5 | `Marca` | texto | |
| 6 | `Oferta` | badge | `En oferta` (verde) o `—` (gris) |

Headers: 11px, mayúsculas, `letter-spacing:.05em`, muted, fondo `#f7f8fa`, `white-space:nowrap`. Contenedor con `overflow-x:auto` y `min-width:760px` en la tabla.

#### Fila de filtros

Segunda fila dentro del `<thead>`, con fondo blanco, sin mayúsculas. Un input por columna filtrable; las columnas de checkbox y Oferta van vacías.

| Columna | Placeholder |
|---|---|
| Número | `Filtrar número` |
| Descripción | `Filtrar descripción` |
| Referencias | `Filtrar referencias` |
| Marca | `Filtrar marca` |

Cada cambio de filtro dispara una consulta al servidor (con debounce) y **resetea a página 1**. Los filtros no se limpian al paginar.

#### Filas seleccionadas

Fila con checkbox marcado → fondo `var(--primary-weak)` (`#e8f0fe`) en toda la fila.

#### Selección acumulada (REQ-11)

- La selección vive en la vista, no en la tabla, y se guarda por **ID**.
- Sobrevive al cambio de página y al cambio de filtros.
- El checkbox del header afecta solo a los items de la página vigente.
- Bajo la paginación se muestra la nota: `La selección se conserva al cambiar de página o de filtros.` (12px, muted, margen superior `14px`).
- Debajo, chips con los items seleccionados: pill gris `#eef1f6`, borde, radio `999px`, padding `3px 10px`, 12px, con `✕` en color faint para quitar.

---

## 3. Crear catálogo — estados de la tabla (REQ-09, REQ-11)

### 3.1 Carga

- Se conserva el `<thead>` completo, incluida la fila de filtros, con **todos los inputs y checkboxes `disabled`** (los placeholders siguen visibles).
- El `<tbody>` muestra **5 filas skeleton**: barras grises `#e9ecf1`, alto `11px`, radio `3px`, con anchos variados por celda (40 / 60 / 80 / 25 %). La celda del checkbox lleva un skeleton cuadrado de `16×16`.
- Paginación en carga:
  - Info: `Cargando items…`
  - Indicador: `Página {page}` — **sin** ` de {pageCount}`, porque el total aún no se conoce.
  - Ambos botones `disabled`.

### 3.2 Vacío con filtros aplicados

Header y fila de filtros **habilitados** (el usuario debe poder corregir el filtro). El `<tbody>` tiene una sola fila con `colspan="6"` y un bloque de estado centrado (padding `38px 20px`):

- Título (14px, semibold, color texto): `No hay items que coincidan con los filtros`
- Descripción (13px, muted, `max-width:460px`, centrada): `Prueba con otro número, descripción, referencia o marca.`
- Acción: botón `sm` `Limpiar filtros`

Paginación: info `0 items`, indicador `Página 1 de 1`, ambos botones `disabled`.

### 3.3 Vacío sin filtros (inventario vacío)

Sin fila de filtros (no tiene sentido filtrar la nada). Checkbox del header `disabled`.

- Título: `No hay items en el inventario`
- Descripción: `Carga items en el inventario para poder armar un catálogo.`
- Sin botón de acción.
- Sin bloque de paginación.

### 3.4 Error de carga de página

Dos piezas simultáneas:

1. **Alert error** sobre la tabla — fondo `#fdecea`, borde `#f2c3bd`, texto `#c0392b`, radio 6px, padding `10px 14px`, margen inferior `14px`:
   - Título en negrita, en línea propia: `No se pudieron cargar los items`
   - Cuerpo: `Ocurrió un error al consultar el inventario. Vuelve a intentarlo.`
2. **Estado dentro de la tabla** (`colspan="6"`), sin fila de filtros, checkbox del header `disabled`:
   - Título: `Error al cargar los items`
   - Descripción: `La selección actual ({n} items) se conserva.` — conteo dinámico
   - Acción: botón `sm` `Reintentar`

Sin bloque de paginación. La selección acumulada **no** se descarta ante un error.

### 3.5 Resultado de "Generar catálogo"

Alert **info** (fondo `#e8f0fe`, borde `#c6d9f8`, texto `#164a9f`) cuando hubo coincidencias:

- Título: `Se agregaron {n} items a la selección`
- Cuerpo: `Filtros aplicados: marca "{marca}", proveedor "{proveedor}", solo items en oferta.` — se listan solo los filtros efectivamente aplicados.

Alert **warn** (fondo `#fff6e0`, borde `#f0dcae`, texto `#8a6100`) cuando no hubo coincidencias:

- Título: `Ningún item coincide con los filtros`
- Cuerpo: `No se agregó ningún item a la selección. Ajusta marca, proveedores u oferta.`

### 3.6 Toast de validación al guardar

Se mantiene sin cambios, y **solo** se dispara al presionar Guardar con selección vacía:

- Toast oscuro variante error (`#7d2018`), texto blanco, ícono `⚠`, cierre `✕` con opacidad `.6`, `max-width:420px`.
- Texto en negrita: `Agrega al menos un item al catálogo`

---

## 4. Editar catálogo — hidratación por IDs (REQ-06, REQ-10, REQ-11)

El catálogo persiste **solo IDs**. Al abrir en modo edición, la selección se resuelve con `useItemsByIds` en **lotes de 100**. Nunca se carga el universo de items para reconstruirla. La tabla de items sigue siendo server-side, idéntica a la de creación.

AppBar: título `Editar catálogo`, subtítulo = nombre del catálogo, botones `Cancelar` y `Guardar catálogo`.

### 4.1 Carga — resolviendo la selección guardada

- `Guardar catálogo` **`disabled`** mientras la selección no esté resuelta (no se debe poder guardar un catálogo incompleto).
- SelectionBar en modo progreso:
  - Izquierda: `Cargando los items guardados en este catálogo…`
  - Derecha (muted): `{resueltos} de {total} resueltos` — avanza por lote.
- Chips con skeleton: pills con barra gris interior de ancho variable, sin texto ni `✕`.

### 4.2 Cargado

- SelectionBar normal: `**{n} items seleccionados** en total` · `{m} de esta página`, más `Ver selección` y `Limpiar selección`.
- Chips: se muestran los primeros items por número, cada uno con `✕`. Cuando hay más de los que se listan, se cierra con un chip de fondo blanco, sin `✕`, con el texto `y {n} más`.
- Debajo, `Items disponibles` con la misma `ItemsPickerTable` (fila de filtros incluida, vacía por defecto) y su paginación.

### 4.3 Error — no se pudo resolver la selección guardada

Alert error:

- Título: `No se pudieron cargar los items del catálogo`
- Cuerpo: `No se pudo resolver la selección guardada. Reintenta antes de guardar, o guardarás un catálogo incompleto.`

SelectionBar degradada: texto `Selección sin resolver`, spacer, botón `sm` `Reintentar`. Sin chips.

### 4.4 Vacío — catálogo guardado sin items

Solo la SelectionBar con el mensaje, sin conteo ni botones:

> `Este catálogo no tiene items todavía. Selecciónalos en la tabla o usa "Generar catálogo".`

---

## 5. Generar desde catálogo (REQ-10, REQ-12, REQ-14)

Los items del catálogo se resuelven por IDs en lotes de 100. El filtrado es **en cliente** sobre ese subconjunto acotado, reutilizando `filterCatalogItems`. La paginación también es cliente, sobre el resultado filtrado.

AppBar: título `Generar desde catálogo`, subtítulo `{nombre del catálogo} · {n} items`, botones `Cancelar` y `Generar` (primario).

### 5.1 Filtros

Título de sección: `Filtrar dentro del catálogo`. Grid de **4 columnas iguales**, `gap:12px`, margen inferior `16px`. Cada campo con label arriba:

| Label | Placeholder |
|---|---|
| `Número` | `Filtrar número` |
| `Descripción` | `Filtrar descripción` |
| `Referencias` | `Filtrar referencias` |
| `Marca` | `Filtrar marca` |

En pantallas ≤900px el grid pasa a 2 columnas.

### 5.2 SelectionBar

```
[ **12 items seleccionados** de 340 del catálogo ]  …  [ Seleccionar todos los visibles ] [ Limpiar selección ]
```

`Seleccionar todos los visibles` opera sobre el resultado filtrado, no sobre la página. `Limpiar selección` es `ghost`.

### 5.3 Tabla

Columnas: checkbox, `Número`, `Descripción`, `Referencias`, `Marca`, `Cantidad`. **No** tiene fila de filtros (los filtros viven arriba) ni columna Oferta.

- `Cantidad`: input numérico angosto, ancho `74px`, dentro de la celda.
- Filas seleccionadas: fondo `var(--primary-weak)`.

### 5.4 Paginación

Info con doble conteo:

> `Mostrando {desde}–{hasta} de {filtrados} items filtrados (de {total} del catálogo)`

Indicador `Página {page} de {pageCount}`, mismos estados de deshabilitado que en §1.

### 5.5 Estados

**Carga — resolviendo por lotes**

Alert info sobre la tabla:
- Título: `Cargando los items del catálogo`
- Cuerpo: `Resolviendo {total} items… {resueltos} de {total}.`

`<tbody>` con **3 filas skeleton** (mismo tratamiento que §3.1). Header presente con checkbox `disabled`. Sin paginación.

**Vacío — el filtro no encuentra items**

Los filtros permanecen visibles y editables. Fila `colspan="6"`:
- Título: `Ningún item del catálogo coincide con los filtros`
- Descripción: `El catálogo tiene {n} items. Ajusta los filtros para verlos.`
- Acción: `Limpiar filtros`

**Vacío — el catálogo no tiene items**

- Título: `Este catálogo no tiene items`
- Descripción: `Edita el catálogo y agrega items para poder generar desde él.`
- Acción: `Ir al catálogo` (navega a la edición del catálogo)

**Error — falló la resolución por IDs**

Alert error:
- Título: `No se pudieron cargar los items del catálogo`
- Cuerpo: `Ocurrió un error al resolver los items. Vuelve a intentarlo.`

Debajo, bloque de estado centrado con un único botón `sm` `Reintentar`. Sin tabla ni paginación.

### 5.6 Se elimina: aviso de truncado

El alert warn `Se muestran solo los primeros {N} items del catálogo` / `Refina la búsqueda para ver el resto.` **desaparece de todos los estados**, junto con la lógica de recorte que lo alimentaba. La carga por IDs trae el catálogo completo en lotes, así que ya no existe ni carga masiva ni truncado. Verificar que no quede el string huérfano en i18n ni condicionales muertos que lo evalúen.

---

## 6. Vistas sin cambio visual (REQ-01, REQ-14)

Solo verificación, sin tocar aspecto ni textos:

- **`ItemSearchPanel`** (builder de facturas): ya es server-side. Verificar únicamente que paginar dentro del `<form>` no dispare el submit — queda cubierto por el fix de `type="button"` en `Pagination` (§1).
- **`ItemsListView`** (inventario): ya es server-side; es el patrón de referencia para los cambios de §2. No se modifica.

---

## 7. Tokens y primitivas transversales

### Colores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#f4f5f7` | fondo de página |
| `--surface` | `#ffffff` | superficie de card/tabla |
| `--border` | `#dfe3e8` | bordes de tabla y contenedores |
| `--border-strong` | `#c4cad2` | bordes de inputs y botones |
| `--text` | `#1f2430` | texto principal |
| `--text-muted` | `#66707f` | labels, info, descripciones |
| `--text-faint` | `#8a93a1` | placeholders, `✕` de chips |
| `--primary` | `#1f5fd6` | botón primario, ghost |
| `--primary-weak` | `#e8f0fe` | fila seleccionada, alert info |
| `--danger` / `--danger-weak` | `#c0392b` / `#fdecea` | alert error |
| `--warn` / `--warn-weak` | `#8a6100` / `#fff6e0` | alert warn |
| `--ok` / `--ok-weak` | `#1e7a45` / `#e7f5ec` | badge "En oferta" |

Radio base: `6px`. Fuente mono para códigos y números: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.

### Botones

- Base: borde `--border-strong`, fondo blanco, 13px, padding `6px 12px`, radio 6px.
- `primary`: fondo y borde `--primary`, texto blanco.
- `ghost`: sin borde, sin fondo, texto `--primary`.
- `sm`: 12px, padding `4px 9px`.
- Deshabilitado: `opacity:.45` + atributo `disabled`.

Todo botón que no sea el submit del formulario debe llevar `type="button"`. Aplica a: paginación, `Generar catálogo`, `Limpiar filtros`, `Reintentar`, `Ver selección`, `Limpiar selección`, `Seleccionar todos los visibles`, `Ir al catálogo`, `✕` de chips.

### Alerts

Radio 6px, padding `10px 14px`, 13px, margen inferior `14px`, borde de 1px del color de la variante. El título va en un `<span>` propio, `font-weight:600`, `display:block`, `margin-bottom:2px`; el cuerpo sigue en el mismo bloque.

### Skeletons

Barra `#e9ecf1`, alto `11px`, radio `3px`, `display:block`. Variantes de ancho 25 / 40 / 60 / 80 %. Variante caja `16×16` para celdas de checkbox.

### Responsive

- ≤900px: la grilla de 4 filtros pasa a 2 columnas; la grilla `1.2fr 1fr .8fr auto` pasa a 1 columna; los layouts de dos columnas pasan a una.
- La tabla siempre en contenedor con `overflow-x:auto` y `min-width:760px`, para que no rompa el layout de la página.

---

## 8. Checklist de verificación visual

- [ ] Paginar dentro del form de crear/editar catálogo no dispara el submit ni muestra toast.
- [ ] El toast `Agrega al menos un item al catálogo` aparece solo al presionar Guardar con selección vacía.
- [ ] Los 4 filtros por columna del picker siguen presentes, con sus placeholders exactos.
- [ ] Cambiar un filtro resetea a página 1; cambiar de página no limpia filtros.
- [ ] La selección sobrevive a paginación, a cambio de filtros y a un error de carga.
- [ ] En carga, el thead se mantiene con controles `disabled` y el indicador dice `Página {n}` sin total.
- [ ] Los tres vacíos (con filtros / inventario vacío / catálogo vacío) muestran su título y descripción exactos.
- [ ] En edición, `Guardar catálogo` está deshabilitado hasta resolver la selección, con el contador `{n} de {m} resueltos` visible.
- [ ] En Generar desde catálogo, la info de paginación muestra el doble conteo (filtrados y total del catálogo).
- [ ] El aviso de truncado no aparece en ningún estado y su lógica fue eliminada del código y de i18n.