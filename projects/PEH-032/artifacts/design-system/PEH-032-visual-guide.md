# PEH-032 — Guía de implementación de UI

> Fuente: maqueta HTML aprobada `PEH-032 · maqueta de verificacion`. Esta guía describe **exactamente** lo aprobado: jerarquía, componentes, textos visibles, estados e interacciones. Todo texto entre comillas es literal y debe implementarse tal cual (sin tildes donde la maqueta no las tiene).

---

## 0. Alcance y convenciones globales

### 0.1 Vistas cubiertas

| ID | Vista | Tipo | Stacks | REQs |
|----|-------|------|--------|------|
| V1 | Lista de rumas | Modificada | Legacy + Nuxt | REQ-01, REQ-02 |
| V2 | Detalle de ruma: panel de ajustes | Modificada | Legacy + Nuxt | REQ-01, REQ-02 |
| V3 | Reporte de ajustes divergentes (solo lectura) | Nueva | Legacy + Nuxt | REQ-03 |
| V4 | Diagnostico de despachos sin registro SALIDA | Nueva | Legacy + Nuxt | REQ-04, REQ-06 |
| V5 | Backfill de materializacion del registro SALIDA | Nueva | Legacy + Nuxt | REQ-05 |
| V6 | Listado de categoria B (clasificacion, sin correccion) | Nueva | Legacy + Nuxt | REQ-06 |
| V7 | Graficos de stats por m3sec | Modificada | Legacy + Nuxt | REQ-07, REQ-08, REQ-09 |
| V8 | Stock por antiguedad y volumen en cancha por especie | Modificada | **Solo Legacy** | REQ-10, REQ-11 |
| V9 | Conciliacion: graficos contra la vista de rumas | Nueva | Legacy + Nuxt | REQ-12, REQ-09 |

**V8 es la única que no lleva badge Nuxt**: en `pehuen_nuxt` el cálculo ya está corregido. No replicar la vista en Nuxt.

### 0.2 Formato de datos (obligatorio, transversal)

- **Números**: separador decimal coma, separador de miles punto. Ej. `1.842,66`, `412,60`, `0,00`.
- **Porcentajes**: coma decimal, un decimal. Ej. `93,7%`, `22,1%`.
- **Fechas**: `DD-MM-AAAA`. Con hora: `DD-MM-AAAA HH:mm` (ej. `05-09-2026 09:12`).
- **Periodos MII**: `MM-AAAA` (ej. `03-2025`).
- **Latencias**: `0,84 s` (un espacio antes de `s`).
- **Valor ausente**: literal `--` (dos guiones), alineado a la derecha en la celda numérica, con estilo apagado. **Nunca** `0`, `0,00`, `null` o vacío.
- **Todas las celdas numéricas**: alineación derecha, fuente monoespaciada, `font-variant-numeric: tabular-nums`, sin wrap.

### 0.3 Sistema de diseño

Tokens de color (definidos como variables en el root del tema):

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#f4f6f4` | Fondo de página |
| `--panel` | `#ffffff` | Fondo de panel |
| `--ink` | `#1d2420` | Texto principal |
| `--ink-2` | `#4b5750` | Texto secundario |
| `--ink-3` | `#7c8a83` | Texto apagado, labels, ejes |
| `--line` | `#dfe5e1` | Borde de panel/control |
| `--line-2` | `#eef1ef` | Borde interno, separador de fila |
| `--green` / `--green-soft` | `#2f6b4f` / `#e7f1eb` | OK, primario, delta positivo |
| `--amber` / `--amber-soft` | `#8a5b12` / `#fdf1dc` | Advertencia |
| `--red` / `--red-soft` | `#a12d24` / `#fbe9e7` | Error, delta negativo |
| `--blue` / `--blue-soft` | `#20527d` / `#e6eef6` | Info, enlaces |
| `--violet` / `--violet-soft` | `#5b3f86` / `#efe9f8` | Badge "Nueva" |

Series de gráfico: entrada `#3f8a63`, salida `#b6543f`, hueco/referencia `#d8dedb`.

Tipografía: sistema sans para texto; monoespaciada (`SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`) para números, códigos de campo, valores KPI y etiquetas de eje. Base 14px / line-height 1.5.

Radios: panel 10px, control/botón 6px, KPI 9px, badge 999px, barra de progreso 6px.

Ancho de contenido: máximo 1180px, padding lateral 20px.

---

## 1. Componentes base

Estos componentes se usan en varias vistas. Implementarlos una sola vez por stack.

### 1.1 `Panel`

Contenedor blanco, borde `--line`, radio 10px, `overflow: hidden`.

Slots:
- **Header** (opcional): fila `space-between`, padding 12/16, fondo `#fbfcfb`, borde inferior `--line-2`. Contiene título (14px, peso 620) y sub-texto a la derecha (12px, `--ink-3`).
- **Body**: padding 16px. Variante `tight` (padding 0) cuando el contenido es una tabla a sangre.
- **Footer**: se implementa como un body adicional con borde superior `--line-2`.

### 1.2 `Toolbar` (barra de filtros)

Fila flexible con wrap, `align-items: flex-end`, padding 12/16, fondo `#fbfcfb`, borde inferior `--line-2`. Gap 10px.

Cada filtro es un `Field`:
- **Label**: 11px, mayúsculas, letter-spacing .04em, color `--ink-3`.
- **Control**: borde `--line`, fondo blanco, radio 6px, padding 6/10, 13px, ancho mínimo 130px. Los selects muestran chevron `▾` a la derecha.

Los botones van al final, empujados por un `spacer` flexible. Orden fijo: **acciones secundarias primero, acción primaria al final** (ej. `Exportar` · `Aplicar`).

### 1.3 `Button`

| Variante | Aspecto | Uso |
|----------|---------|-----|
| default | borde `--line`, fondo blanco, texto `--ink-2` | acción neutra |
| `primary` | fondo y borde `--green`, texto blanco | acción principal, una por toolbar |
| `ghost` | fondo transparente, borde `--line` | acción secundaria (exportar, descargar) |
| `danger` | fondo blanco, borde `#e3b7b2`, texto `--red` | Detener backfill |
| `disabled` / `off` | opacidad .45, no interactivo | acción bloqueada por precondición |

Padding 7/14, 13px, peso 560, radio 6px.

### 1.4 `Badge`

Pastilla: padding 2/8, radio 999px, 11px, peso 600, sin wrap.

| Variante | Fondo / texto | Uso literal en la maqueta |
|----------|---------------|---------------------------|
| `new` | violeta soft / violeta | "Nueva" |
| `mod` | azul soft / azul | "Modificada" |
| `leg` | `#eceeed` / `#54605a` | "Legacy" |
| `nux` | verde soft / verde | "Nuxt" |
| `ok` | verde soft / verde | "Cargado", "Completo", "Coincide", "Sin desviacion", "Dentro del umbral", "ADD", "corregido" |
| `warn` | ámbar soft / ámbar | "Ajustada", "Backfill pendiente", "Revisar · posible gap" |
| `err` | rojo soft / rojo | "REDUCE", "Supera el umbral" |
| `mut` | `#f0f2f1` / `--ink-3` | "Sin ajustes", "Solo categoria B", "Sin despachos", "Fuera de MII (esperado)", "Referencia" |
| `req` | `#eef1f5` / `#3d4e5e`, monoespaciada | "REQ-01" … "REQ-12" |

### 1.5 `Callout`

Bloque horizontal: icono + contenido, gap 10px, padding 11/14, radio 8px, 13px, `align-items: flex-start`.

| Tipo | Icono | Fondo / texto / borde |
|------|-------|----------------------|
| `warn` | `!` | `--amber-soft` / `#5f3f0b` / `#f0dcb4` |
| `info` | `i` | `--blue-soft` / `#1c3f5e` / `#cfe0ee` |
| `err` | `×` | `--red-soft` / `#7d2019` / `#eec4bf` |
| `ok` | `✓` | `--green-soft` / `#1f4c37` / `#c9e2d5` |

El icono va en peso 700. Los párrafos internos no llevan margen; entre párrafos, 5px.

### 1.6 `Table`

Ancho 100%, `border-collapse: collapse`.
- **thead th**: 11.5px, mayúsculas, letter-spacing .04em, color `--ink-3`, peso 620, fondo `#fbfcfb`.
- **td/th**: padding 9/12, alineado arriba (`vertical-align: top`), borde inferior `--line-2`. La última fila sin borde.
- **Columna numérica** (`num`): derecha, monoespaciada, tabular-nums, `white-space: nowrap`. Aplica al `th` y al `td`.
- **Fila destacada** (`hl`): fondo `#fdfaf0`. Marca las filas que ilustran el caso central del ticket.
- **Valor tachado** (`strike`): color `--ink-3` + `line-through`. Solo para "MR actual" en V3.
- **Deltas**: positivo verde peso 600 con signo `+`; negativo rojo peso 600 con signo `-`.

### 1.7 `KpiGrid` / `Kpi`

Grid `repeat(auto-fit, minmax(180px, 1fr))`, gap 12px.

Cada KPI: borde `--line`, radio 9px, padding 12/14, fondo blanco, **borde izquierdo de 3px** que codifica el acento:

| Acento | Color | Semántica |
|--------|-------|-----------|
| `acc-a` | `--ink-3` gris | categoría A / neutro / omitido |
| `acc-b` | `--amber` | categoría B / a revisar |
| `acc-c` | `--red` | categoría C / anomalía |
| `acc-ok` | `--green` | correcto / sin impacto |

Estructura interna: **k** (etiqueta, 11.5px mayúsculas `--ink-3`) → **v** (valor, monoespaciada 22px peso 600, tabular) → **d** (descripción, 12px `--ink-3`).

### 1.8 `StatesRow` (fila de estados)

Bloque de documentación de estados **que también debe existir en la implementación real**: cada estado listado es un estado que la vista debe renderizar. En la maqueta se muestran lado a lado; en producción son excluyentes.

Grid `repeat(auto-fit, minmax(300px, 1fr))`, gap 14px. Cada tarjeta: borde **punteado** `--line`, radio 9px, cabecera con el nombre del estado en mayúsculas 11.5px `--ink-3`.

Estados canónicos y su render:
- **cargando**: skeletons (`sk`) de altura 11px, radio 5px, gradiente animado 1.3s, anchos 25/40/65/85%, separación 9px. Puede acompañarse de un texto explicativo apagado.
- **vacio**: bloque centrado — título 15px peso 600 (`empty .big`) + párrafo 12.5px `--ink-3` con `max-width: 44ch` centrado (`empty .small`) + botón de salida opcional.
- **error**: `Callout err` + botón de recuperación debajo (margen superior 12px).
- Estados específicos por vista se detallan en cada sección.

### 1.9 `Progress`

Barra 10px de alto, radio 6px, pista `--line-2`, relleno `--green`. Variante `err`: relleno `--red`. El ancho del relleno es el porcentaje de avance.

### 1.10 `Steps` (indicador de pasos, solo V5)

Lista horizontal de segmentos unidos: borde `--line`, sin borde derecho salvo el último; primer y último con esquinas redondeadas 7px en su extremo. Cada paso: círculo numerado de 18px + etiqueta 12.5px.

- **pendiente**: texto `--ink-3`, círculo fondo `#eceeed`.
- **done**: texto `--green`, fondo de fila `#fbfdfc`, círculo verde soft.
- **cur**: texto `--ink` peso 600, círculo fondo `--green` con número blanco.

### 1.11 `KeyValue` (dl)

Grid de dos columnas `auto 1fr`, gap 6px/18px, 13px. `dt` en `--ink-3`; `dd` monoespaciada, tabular, sin margen.

### 1.12 `LogConsole` (solo V5)

Bloque preformateado: fondo `#141b17`, texto `#cfe0d5`, monoespaciada 12px/1.7, padding 12/14, radio 8px, `white-space: pre`, scroll horizontal. Clases de color inline: `ok` `#8fd2ac`, `wr` `#e6c37a`, `er` `#eb9a90`, `dim` `#7d8f85`.

### 1.13 `LegendInline`

Fila de leyendas bajo un gráfico: gap 16px, 12.5px/12px `--ink-2`, margen superior 10px. Cada ítem: `swatch` de 11×11px, radio 3px, margen derecho 6px, alineado a `-1px`, seguido del texto.

### 1.14 `ChartWrap`

Envoltorio con `overflow-x: auto`. Los SVG se dibujan con `viewBox` y `role="img"` + `aria-label` descriptivo. Ejes con `stroke: --line`; línea de cero con `stroke: #b9c4be, width 1.5`; grilla `--line-2`. Etiquetas de eje: clase `lbl`, monoespaciada 11px, fill `--ink-3`.

---

## 2. Cabecera de vista (`ViewHead`)

Toda vista de esta entrega lleva la misma cabecera:

```
[H2: "Vn · Titulo"]  [Badge tipo] [Badge Legacy] [Badge Nuxt?] [Badge REQ]... ——spacer—— [path]
```

- H2 17px peso 650, sin margen.
- Badges en el orden: tipo (Nueva/Modificada) → stacks (Legacy, Nuxt) → REQs en orden ascendente.
- **path**: breadcrumb monoespaciada 12px `--ink-3`, alineado a la derecha, separador `›`.
- Borde inferior `--line`, padding inferior 10px.
- Debajo, la **nota de vista**: párrafo `--ink-2`, `max-width: 92ch`, con `code` inline para nombres de campo.

Los nombres de campo (`valorAjuste`, `valorAjusteMR`, `valorAjusteM3`) van **siempre** en `code`: fondo `#f0f2f1`, padding 1/5, radio 4px, monoespaciada 12.5px.

---

## 3. V1 · Lista de rumas

**Path**: `Rumas › Cancha Norte` — **Modificada** — Legacy + Nuxt — REQ-01, REQ-02

**Nota de vista** (literal): "La columna **MR** pasa a ajustarse con `valorAjusteMR`. La columna **m3sec** (M3) no cambia. Se agrega el indicador de ajuste por fila para que el operador sepa que el valor mostrado ya viene ajustado y con que campo."

### 3.1 Toolbar

| Label | Control | Valor por defecto |
|-------|---------|-------------------|
| Cancha | select | Cancha Norte |
| Estado | select | Activas |
| Especie | select | Todas |
| Buscar ruma | input texto | placeholder "N° de ruma" |

Botones: `Exportar` (ghost) · `Aplicar` (primary).

### 3.2 Tabla

Columnas, en orden: `Ruma` | `Especie` | `Producto` | `m3sec (M3)`▸num | `MR`▸num | `Vol. calculado`▸num | `Ajustes` | `Actualizada`.

**Celda Ruma**: número en negrita con prefijo `#` (ej. `#5248`), salto de línea, nombre de cancha en 12px apagado.

**Celda MR**: valor en **negrita** cuando la ruma tiene ajuste aplicado. Esta es la columna que cambia de comportamiento con el fix.

**Celda Ajustes** — dos estados:
- Con ajustes: `Badge warn "Ajustada"` + texto apagado 12px con el detalle de los deltas por campo, formato `MR ±n,nn · M3 ±n,nn`. Si un campo no tiene delta, se omite (ej. fila #5270: solo `MR -12,60`).
- Sin ajustes: `Badge mut "Sin ajustes"`, sin texto adicional.

**Celda Actualizada**: fecha-hora apagada.

Filas de referencia de la maqueta (usar como fixtures de verificación):

| Ruma | Especie | Producto | m3sec | MR | Vol. calc | Ajustes | Actualizada |
|------|---------|----------|-------|-----|-----------|---------|-------------|
| #5248 *(hl)* | Pino radiata | Trozo aserrable 2,44 m | 412,60 | **187,74** | 398,15 | Ajustada · MR +179,03 · M3 +0,10 | 05-09-2026 09:12 |
| #5251 | Eucalipto globulus | Trozo pulpable 2,44 m | 228,40 | 96,55 | 228,40 | Sin ajustes | 04-09-2026 17:40 |
| #5263 | Pino radiata | Trozo aserrable 3,20 m | `--` | 54,10 | 140,80 | Sin ajustes | 04-09-2026 11:02 |
| #5270 | Eucalipto nitens | Trozo pulpable 2,44 m | 88,90 | 41,20 | 76,30 | Ajustada · MR -12,60 | 03-09-2026 15:55 |

### 3.3 Footer del panel

Fila con borde superior `--line-2`:
- Izquierda, texto apagado 12.5px: "4 rumas · total m3sec **729,90** · total MR **379,59**" (los totales en monoespaciada negrita).
- Derecha: "Filas por pagina 50" + botones `Anterior` (disabled en primera página) y `Siguiente`.

**Regla de cálculo del total**: el total de m3sec **excluye** las rumas con valor `--`. En la maqueta, 412,60 + 228,40 + 88,90 = 729,90 (sin #5263).

### 3.4 Callout de m3sec ausente

Debajo del panel, margen superior 14px, `Callout warn`:

> **m3sec no disponible.** La ruma #5263 muestra `--` en m3sec porque ninguna de sus guias tiene volumen MII asociado. No es un error de la vista: es el hueco de cobertura MII descrito en el ticket.
>
> Texto visible al pasar el cursor: *"Sin volumen MII para las guias de esta ruma. El total de la cancha excluye este valor."*

**Interacción obligatoria**: cada celda `--` de m3sec lleva un tooltip con el texto exacto **"Sin volumen MII para las guias de esta ruma. El total de la cancha excluye este valor."**

### 3.5 Estados

- **cargando**: 5 skeletons, anchos 25 / 85 / 65 / 85 / 40%.
- **vacio**: título "No hay rumas activas en esta cancha"; texto "Cambia el filtro de cancha o de estado. Si esperabas ver rumas recien creadas, verifica que la recepcion se haya registrado."; botón "Ver todas las canchas".
- **error**: `Callout err` con "**No se pudo cargar el listado de rumas.**" / "Reintenta en unos segundos. Si persiste, informa el codigo `RUMA-LIST-500` al equipo."; botón primary "Reintentar".

---

## 4. V2 · Detalle de ruma: panel de ajustes

**Path**: `Rumas › #5248 › Ajustes` — **Modificada** — Legacy + Nuxt — REQ-01, REQ-02

**Nota de vista** (literal): "El panel hace explicito que campo alimenta cada volumen. Hoy el usuario captura `valorAjusteMR` pero no ve su efecto, porque el MR se ajustaba con `valorAjuste`. La maqueta muestra la trazabilidad del calculo, no un campo nuevo."

### 4.1 Layout

Dos paneles en grid `1fr 1fr`, gap 16px. **Bajo 820px colapsa a una columna** (panel de volúmenes arriba).

### 4.2 Panel izquierdo — "Volumenes de la ruma #5248"

Sub-texto de cabecera: "Calculados al vuelo, no persistidos". Este texto es normativo: **no se persiste ningún volumen**.

Tabla: `Volumen` | `Base`▸num | `Ajuste`▸num | `Campo aplicado` | `Resultado`▸num.

| Volumen | Base | Ajuste | Campo aplicado | Resultado |
|---------|------|--------|----------------|-----------|
| m3sec (M3) | 412,50 | +0,10 | `valorAjusteM3` | **412,60** |
| MR *(hl)* | 8,71 | **+179,03** (verde) | `valorAjusteMR` + `Badge ok "corregido"` | **187,74** |
| Vol. calculado | 398,15 | "sin ajuste" (apagado) | "no aplica" (apagado) | **398,15** |

La fila MR es la fila destacada: es la que cambia con el fix. El badge "corregido" acompaña al nombre del campo, no al valor.

### 4.3 Panel derecho — "Ajustes registrados"

Sub-texto: recuento de ajustes ("2 ajustes"). Body `tight` (tabla a sangre).

Tabla: `Fecha` | `Tipo` | `Ajuste`▸num | `M3`▸num | `MR`▸num | `Motivo`.

| Fecha | Tipo | Ajuste | M3 | MR | Motivo |
|-------|------|--------|-----|-----|--------|
| 28-07-2026 | `Badge ok "ADD"` | 8,66 | 0,10 | **179,03** | Reconteo en cancha |
| 12-08-2026 | `Badge err "REDUCE"` | 0,00 | 0,00 | 0,00 | Correccion administrativa |

El valor de la columna MR va en negrita cuando es el que efectivamente se aplica.

Footer del panel (borde superior `--line-2`), `Callout info`:

> **ADD suma, REDUCE resta.** El MR usa la columna MR del ajuste y el m3sec usa la columna M3. Si las columnas difieren, cada volumen se mueve distinto: es el comportamiento esperado.

### 4.4 Estados

V2 no declara estados propios en la maqueta: hereda los del detalle de ruma existente. No inventar estados nuevos.

---

## 5. V3 · Reporte de ajustes divergentes (solo lectura)

**Path**: `Reportes › Rumas con ajuste MR divergente` — **Nueva** — Legacy + Nuxt — REQ-03

**Nota de vista** (literal): "Reporte acotado y sin efectos de escritura. No hay migracion ni backfill de volumenes: los volumenes se calculan al vuelo y no se persisten. Este reporte solo permite verificar el efecto del fix comparando el MR antes y despues para las rumas cuyo `valorAjuste` difiere de `valorAjusteMR`."

**Restricción dura**: la vista **no escribe nada**. No debe existir ningún endpoint de mutación asociado.

### 5.1 Cabecera de panel

Título con código inline: "Rumas con `valorAjuste` distinto de `valorAjusteMR`". Sub-texto: "Solo lectura · no modifica datos".

### 5.2 Toolbar

| Label | Control | Valor |
|-------|---------|-------|
| Cancha | select | Todas |
| Estado de ruma | select | Activas |
| Limite de filas | select | 100 |
| Diferencia minima (m3) | input | 0,01 |

Botones: `Descargar CSV` (ghost) · `Generar reporte` (primary).

### 5.3 KPIs (4)

| Acento | Etiqueta | Valor | Descripción |
|--------|----------|-------|-------------|
| `acc-b` | Ajustes divergentes | 23 | "de 267 ajustes registrados" |
| `acc-b` | Rumas afectadas | 19 | "una ruma puede tener varios ajustes" |
| `acc-c` | MR total no aplicado | 1.842,66 | "suma de las diferencias, en m3" |
| `acc-ok` | m3sec afectado | 0,00 | "el M3 no cambia con este fix" |

El cuarto KPI en verde es intencional: comunica que el m3sec **no** se ve afectado.

### 5.4 Tabla

Columnas: `Ruma` | `Cancha` | `Ajustes` | `MR actual`▸num | `MR con el fix`▸num | `Diferencia`▸num | `m3sec (sin cambio)`▸num.

- **MR actual**: siempre con estilo **tachado** (`strike`) — es el valor que deja de ser válido.
- **MR con el fix**: negrita.
- **Diferencia**: delta con signo, verde si positivo, rojo si negativo.
- **Ajustes**: descripción textual de la composición (`1 ADD`, `2 ADD`, `1 REDUCE`, `1 ADD · 1 REDUCE`).

| Ruma | Cancha | Ajustes | MR actual | MR con el fix | Diferencia | m3sec |
|------|--------|---------|-----------|---------------|------------|-------|
| #5248 *(hl)* | Cancha Norte | 1 ADD | ~~8,81~~ | **187,74** | +178,93 | 412,60 |
| #5119 | Cancha Sur | 2 ADD | ~~74,20~~ | **210,05** | +135,85 | 305,40 |
| #4987 | Cancha Sur | 1 REDUCE | ~~160,00~~ | **128,45** | -31,55 | 288,10 |
| #4802 | Cancha Poniente | 1 ADD · 1 REDUCE | ~~45,90~~ | **52,30** | +6,40 | `--` |

### 5.5 Footer

"Mostrando 4 de 19 rumas · limite aplicado 100" + `Anterior` (off) / `Siguiente`.

### 5.6 Estados

- **generando**: texto apagado 13px "Recorriendo rumas activas y recalculando volumenes en memoria. No se escribe nada." + `Progress` al 38% + contador apagado 12.5px "1.240 de 3.260 rumas revisadas".
- **sin divergencias**: título "No se encontraron ajustes divergentes"; texto "Con los filtros actuales, todos los ajustes tienen el mismo valor en `valorAjuste` y `valorAjusteMR`. El MR de esas rumas no cambia con el fix."
- **limite alcanzado**: `Callout warn` — "**Se alcanzo el limite de 100 filas.** Hay mas rumas divergentes de las mostradas." / "Sube el limite o acota por cancha para revisar el resto." Se dispara cuando el número de filas devueltas iguala el límite configurado.

---

## 6. V4 · Diagnostico de despachos sin registro SALIDA

**Path**: `Operacion › Integridad MII › Despachos sin SALIDA` — **Nueva** — Legacy + Nuxt — REQ-04, REQ-06

**Nota de vista** (literal): "Vista de diagnostico. Clasifica los despachos sin registro SALIDA en las tres categorias del analisis y deja claro cual es la unica anomalia real (categoria C). El desfase por periodo MII no cargado es comportamiento aceptable y se muestra como tal, no como falla."

### 6.1 Modelo de las tres categorías (normativo)

| Cat. | Nombre en UI | Semántica | Acento |
|------|--------------|-----------|--------|
| A | "A · periodo MII no cargado" | Desfase esperable entre carga de periodos. **No es incumplimiento.** | gris `acc-a` |
| B | "B · guia ausente del MII" | A clasificar, sin corregir en este ticket. | ámbar `acc-b` |
| C | "C · no se materializo" | **Anomalía real**, la única accionable. | rojo `acc-c` |

Este mapeo categoría→color debe ser consistente en V4, V5 y V6.

### 6.2 Toolbar

| Label | Control | Valor |
|-------|---------|-------|
| Periodo MII desde | select | 01-2025 |
| Periodo MII hasta | select | 08-2026 |
| Cancha | select | Todas |

Botones: `Descargar clasificacion` (ghost) · `Recalcular diagnostico` (primary).

### 6.3 KPIs (4)

| Acento | Etiqueta | Valor | Descripción |
|--------|----------|-------|-------------|
| `acc-ok` | Cobertura SALIDA | 93,7% | "99.441 de 106.159 despachos" |
| `acc-a` | A · periodo MII no cargado | 0 | "desfase aceptable, no aplica hoy" |
| `acc-b` | B · guia ausente del MII | 1.736 | "25,8% · a clasificar, sin corregir" |
| `acc-c` | C · no se materializo | 4.982 | "74,2% · anomalia real" |

Los porcentajes de B y C son sobre el total de despachos **sin SALIDA** (6.718), no sobre el total general.

### 6.4 Callout explicativo

Body con `padding-top: 0` (pegado a los KPIs). `Callout info`:

> **Como leer esta vista.** El registro SALIDA se genera al procesar un periodo MII, que se carga de forma manual y periodica. Un desfase entre la carga de un periodo y el siguiente es esperable: esos despachos quedan en categoria A y no cuentan como incumplimiento.
>
> MII cargado hasta **12-2026**. Despachos registrados hasta **08-2026**. No hay desfase pendiente en este snapshot.

El segundo párrafo es **dinámico**: los dos periodos en negrita se calculan del snapshot. La frase final varía según haya o no desfase.

### 6.5 Tabla por periodo

Columnas: `Periodo MII` | `Estado del periodo` | `Despachos`▸num | `Con SALIDA`▸num | `A`▸num | `B`▸num | `C`▸num | `Accion sugerida`.

La columna `C` va en **negrita** cuando es > 0.

| Periodo | Estado | Despachos | Con SALIDA | A | B | C | Accion sugerida |
|---------|--------|-----------|------------|---|---|---|-----------------|
| 03-2025 *(hl)* | ok "Cargado" | 4.120 | 2.880 | 0 | 318 | **922** | warn "Backfill pendiente" |
| 07-2025 *(hl)* | ok "Cargado" | 3.905 | 2.941 | 0 | 241 | **723** | warn "Backfill pendiente" |
| 11-2025 | ok "Cargado" | 4.480 | 4.402 | 0 | 78 | 0 | mut "Solo categoria B" |
| 04-2026 | ok "Cargado" | 5.010 | 5.010 | 0 | 0 | 0 | ok "Completo" |
| 12-2026 | ok "Cargado" | 0 | 0 | 0 | 0 | 0 | mut "Sin despachos" |

**Regla de acción sugerida**:
- `C > 0` → warn "Backfill pendiente" (fila destacada `hl`).
- `C = 0` y `B > 0` → mut "Solo categoria B".
- `C = 0`, `B = 0` y despachos > 0 → ok "Completo".
- despachos = 0 → mut "Sin despachos".

### 6.6 Estados

- **calculando**: skeletons anchos 40 / 85 / 65% + texto apagado "Cruzando despachos con periodos MII cargados. Puede tardar en rangos amplios."
- **sin anomalias**: título "Todos los despachos del rango tienen su registro SALIDA"; texto "No hay casos de categoria C. Si aparecen despachos sin SALIDA en un periodo aun no cargado, se listaran como categoria A y no requieren accion."
- **rango sin MII cargado**: `Callout warn` — "**El rango seleccionado no tiene periodos MII cargados.** Todos los despachos caen en categoria A." / "Esto no es un defecto: el registro SALIDA se genera cuando el usuario carga el periodo correspondiente."

---

## 7. V5 · Backfill de materializacion del registro SALIDA

**Path**: `Operacion › Integridad MII › Backfill` — **Nueva** — Legacy + Nuxt — REQ-05

**Nota de vista** (literal): "Herramienta acotada: dry-run obligatorio antes de ejecutar, lotes con tamano y timeout configurables, reanudable. Solo opera sobre periodos MII **ya cargados**. Nunca fuerza la carga de un periodo nuevo: eso lo sigue haciendo el usuario en su proceso periodico. La escritura es idempotente por clave guia + periodo."

### 7.1 Reglas de comportamiento (normativas)

1. **Dry-run obligatorio**: el botón "Ejecutar backfill" está deshabilitado hasta que exista un dry-run exitoso **sobre la misma selección**. Cambiar cualquier parámetro de la selección invalida el dry-run y vuelve a deshabilitar el botón.
2. **Solo periodos ya cargados**: la lista de periodos afectados nunca ofrece periodos no cargados.
3. **Idempotencia por clave guía + periodo**: los registros existentes se omiten, nunca se duplican.
4. **Reanudable**: al interrumpir, se conservan los lotes confirmados y se retoma desde el último.
5. **Timeout por lote**: si un lote excede el timeout, ese lote se **revierte**; los anteriores quedan aplicados.

### 7.2 Panel 1 — "Configuracion" (sub: "Paso 1 de 3")

`Steps` de tres pasos:
1. "Seleccionar periodos" — **done**
2. "Dry-run" — **cur**
3. "Ejecutar backfill" — pendiente

Debajo, una toolbar **encuadrada** (borde `--line`, radio 8px, fondo `#fbfcfb`) — a diferencia del resto de las vistas, aquí la toolbar es un bloque dentro del body, no una barra a sangre:

| Label | Control | Valor |
|-------|---------|-------|
| Periodos afectados | select | "03-2025, 07-2025 (2)" |
| Tamano de lote | input | 500 |
| Timeout por lote (s) | input | 30 |
| Modo | select | Dry-run |

Botones: `Ejecutar dry-run` (primary) · `Ejecutar backfill` (**off**).

Nota bajo la toolbar, apagada 12.5px: "El boton de ejecucion se habilita solo despues de un dry-run exitoso sobre la misma seleccion."

### 7.3 Panel 2 — "Resultado del dry-run" (sub: "No se escribio nada")

KPIs (margen inferior 14px):

| Acento | Etiqueta | Valor | Descripción |
|--------|----------|-------|-------------|
| `acc-ok` | Se crearian | 1.645 | "registros SALIDA" |
| `acc-a` | Ya existentes | 312 | "se omiten por idempotencia" |
| `acc-b` | Sin dato en MII | 98 | "quedan en categoria B" |
| `acc-c` | Con conflicto | 4 | "requieren revision manual" |

`LogConsole` con el contenido literal:

```
$ backfill-salida --periodos 03-2025,07-2025 --lote 500 --timeout 30 --dry-run
[10:02:11] periodo 03-2025 · lote 1/2 · 500 guias ok
[10:02:19] periodo 03-2025 · lote 2/2 · 422 guias ok
[10:02:26] periodo 07-2025 · lote 1/2 · 500 guias ok
[10:02:34] periodo 07-2025 · lote 2/2 · 223 guias 4 conflictos
[10:02:34] guia 88214 volumen MII distinto del registrado, se omite
[10:02:34] resumen: crear 1.645 · omitir 312 · sin MII 98 · conflictos 4
dry-run finalizado sin escrituras
```

Coloreado: timestamps `[hh:mm:ss]` en `dim`; `ok` final de línea en verde; "4 conflictos" y "volumen MII distinto del registrado, se omite" en ámbar (`wr`); la línea final completa en verde (`ok`). Errores duros usarían `er` (rojo).

**Nota de trazabilidad**: la guía 88214 del log es la misma que aparece en V6 como categoría B. Mantener la coherencia del dato entre vistas.

### 7.4 Estados (cuatro)

**ejecutando**
- Texto 13px: "**Backfill en curso.** Periodo 07-2025, lote 2 de 2."
- `Progress` al 74%.
- Texto apagado 12.5px: "1.218 de 1.645 registros creados · puedes cerrar esta vista, el proceso continua"
- Botón `danger` "Detener".

**interrumpido y reanudable**
- `Callout warn`: "**El backfill se detuvo en el lote 2 del periodo 07-2025.** Los 1.218 registros ya creados se conservan." / "Al reanudar se retoma desde el ultimo lote confirmado. Los registros existentes se omiten, no se duplican."
- Botones: `Reanudar` (primary) · `Descartar y volver a empezar`.

**error de timeout**
- `Callout err`: "**El lote supero el timeout de 30 s.** Se revirtio el lote en curso; los lotes anteriores quedaron aplicados." / "Reduce el tamano de lote o sube el timeout y reanuda."
- `Progress` variante `err` al 52%, margen superior 12px. La barra roja indica progreso detenido, no error de la barra.

**nada que hacer**
- Vacío: "No hay periodos con backfill pendiente" / "Todos los periodos MII cargados tienen su registro SALIDA materializado. Vuelve a revisar despues de la proxima carga de periodo."

---

## 8. V6 · Listado de categoria B (clasificacion, sin correccion)

**Path**: `Operacion › Integridad MII › Guias ausentes del MII` — **Nueva** — Legacy + Nuxt — REQ-06

**Nota de vista** (literal): "Estas guias no se corrigen en este ticket. La vista entrega el criterio para decidir si son guias legitimamente fuera de MII (fuera de alcance) o un gap distinto que necesita un ticket aparte. Toda accion de escritura esta deshabilitada de forma deliberada."

### 8.1 Toolbar

| Label | Control | Valor |
|-------|---------|-------|
| Periodo MII | select | Todos los cargados |
| Tipo de guia | select | Todos |
| Clasificacion | select | Sin clasificar |
| Limite | select | 200 |

Botones: `Descargar CSV` (ghost) · `Corregir seleccionadas` (**off**, con `title="Deshabilitado en este ticket"`).

**El botón deshabilitado se implementa, visible y bloqueado.** Es una decisión de diseño: comunica que la corrección existe como concepto pero está fuera de alcance. No eliminarlo ni ocultarlo.

### 8.2 Tabla

Columnas: `Guia` | `Fecha despacho` | `Periodo MII` | `Cancha origen` | `Vol. despacho`▸num | `Criterio` | `Clasificacion`.

| Guia | Fecha | Periodo | Cancha | Vol. | Criterio | Clasificacion |
|------|-------|---------|--------|------|----------|---------------|
| **88214** | 14-03-2025 | 03-2025 | Cancha Norte | 32,40 | Guia de traslado interno, no exportable a MII | mut "Fuera de MII (esperado)" |
| **88530** | 22-03-2025 | 03-2025 | Cancha Sur | 28,10 | Anulada despues de emitida | mut "Fuera de MII (esperado)" |
| **91002** | 08-07-2025 | 07-2025 | Cancha Poniente | 45,90 | Sin criterio identificado | warn "Revisar · posible gap" |
| **91117** | 19-07-2025 | 07-2025 | Cancha Norte | 51,20 | Sin criterio identificado | warn "Revisar · posible gap" |

**Regla**: criterio identificado → badge `mut` "Fuera de MII (esperado)". Criterio no identificado ("Sin criterio identificado") → badge `warn` "Revisar · posible gap".

### 8.3 Footer

`Callout info`:

> **Alcance de esta vista.** Reporte de clasificacion. Las guias marcadas como *posible gap* se informan para abrir un ticket aparte; no se corrigen aqui.

### 8.4 Estados

- **cargando**: skeletons 40 / 85 / 85 / 65%.
- **vacio**: "No hay guias de categoria B en el rango" / "Todas las guias de los periodos cargados estan presentes en su MII correspondiente."
- **error**: `Callout err` — "**No se pudo construir la clasificacion.** El cruce con los periodos MII fallo. Reintenta o acota el rango de periodos."

---

## 9. V7 · Graficos de stats por m3sec

**Path**: `Estadisticas › Movimiento de cancha` — **Modificada** — Legacy + Nuxt — REQ-07, REQ-08, REQ-09

**Nota de vista** (literal): "Cambia el eje de todos los graficos: en vez del volumen crudo de la guia se grafica el m3sec (volumen MII de recepcion sumado por movimiento, con ajustes por `valorAjusteM3`). El encabezado deja visible que unidad se esta graficando y que cobertura tiene el dato."

### 9.1 Toolbar

| Label | Control | Valor |
|-------|---------|-------|
| Cancha | select | Cancha Norte |
| Desde | input fecha | 01-01-2026 |
| Hasta | input fecha | 31-08-2026 |
| Unidad | select | m3sec (MII) |

Botón: `Actualizar` (primary).

El selector **Unidad** es visible siempre: hace explícito qué se está graficando.

### 9.2 Callout de cobertura (permanente)

Va en un body con `padding-bottom: 0`, encima del gráfico. `Callout warn`:

> **Cobertura del m3sec: 22,1% de las guias de rumas activas** (entradas 17,3%, despachos 91,9%).
>
> El grafico es consistente con lo que muestra la vista de rumas, pero hereda el hueco de datos MII de 2025. Completar esa data es una tarea aparte y no forma parte de este ticket.

Los tres porcentajes son dinámicos. El callout **no es descartable**: acompaña siempre al gráfico mientras la cobertura sea parcial.

### 9.3 Gráfico "Entradas y salidas por mes, en m3sec"

Título h4 13.5px, margen 6px arriba / 12px abajo.

SVG 880×250, `aria-label="Grafico de barras de entradas y salidas mensuales en m3sec"`.

Especificación:
- Eje Y: líneas de grilla en 1.500, 1.000, 500; eje base en 0 (`y=200`, `x` de 60 a 860). Etiquetas monoespaciadas a la izquierda.
- Por mes, **dos barras adyacentes** de 26px de ancho: entrada (`#3f8a63`) a la izquierda, salida (`#b6543f`) a la derecha, separadas 4px. Paso entre meses: 100px, comenzando en x=80.
- Etiqueta de mes debajo del eje (y=218), minúsculas de tres letras: `ene feb mar abr may jun jul ago`.
- **Mes sin dato MII** (abr en la maqueta): **una sola barra gris** (`#d8dedb`) de 56px de ancho y altura mínima (24px), con la etiqueta "sin MII" encima. **No se dibuja cero**: se dibuja un hueco.
- Pie del SVG (y=240, clase `lbl val`): "Unidad: m3sec (MII VOLUMEN_M3_RECEPCION, ajustado por valorAjusteM3)".

Leyenda inline (tres ítems):
- `#3f8a63` — "Entradas (recepcion)"
- `#b6543f` — "Salidas (despacho)"
- `#d8dedb` — "Periodo sin volumen MII: se muestra hueco, no cero"

### 9.4 Footer del panel — métricas del cruce

Borde superior `--line-2`. `KeyValue`:

| dt | dd |
|----|----|
| Guias del rango | 1.482 |
| Guias con m3sec | 328 (22,1%) |
| Total graficado | 12.847,32 m3sec |
| Latencia del endpoint | 0,84 s *(referencia previa al cambio: 0,52 s)* |

La referencia previa va en texto apagado entre paréntesis, dentro del mismo `dd`.

### 9.5 Estados (cuatro)

**cargando**: skeleton de 25% arriba, luego una fila de 6 skeletons verticales de 26px de ancho y alturas 60/85/45/70/95/55% dentro de un contenedor de 110px alto, alineados abajo (simula barras). Texto apagado: "Uniendo guias con volumenes MII. En rangos amplios puede tardar mas que antes."

**sin datos de m3sec**: "No hay volumen MII para el rango seleccionado" / "Las guias existen pero ninguna tiene volumen MII asociado, por lo que no hay m3sec que graficar. Prueba con otro rango de fechas o revisa la carga de periodos MII." + botón "Ver diagnostico de integridad MII" (**navega a V4**).

**error**: `Callout err` — "**No se pudo calcular el grafico.** El cruce con MII no respondio a tiempo." / "Acota el rango de fechas o filtra por una sola cancha y reintenta." + botón primary "Reintentar".

**resultado parcial**: `Callout warn` — "**Grafico parcial.** Se muestran los meses con volumen MII disponible; los demas aparecen como hueco." / "El total no representa el movimiento completo del periodo." Este estado convive con el gráfico renderizado (no lo reemplaza).

---

## 10. V8 · Stock por antiguedad y volumen en cancha por especie

**Path**: `Estadisticas › Stock` — **Modificada** — **Solo Legacy** — REQ-10, REQ-11

**Nota de vista** (literal): "Solo legacy: en nuxt ya esta corregido. El tramo de mas de 120 dias vuelve a restar los despachos (hoy los suma), y el volumen por especie deja de restar despachos cuyo origen no es la cancha consultada. Visualmente el cambio se nota en el signo de las barras y en los totales."

### 10.1 Panel 1 — "Stock por antiguedad, en m3sec"

Sub-texto: "Cancha Norte · al 31-08-2026".

SVG 820×270, `aria-label="Grafico de barras con valores positivos y negativos de stock por antiguedad"`.

- **Eje de cero explícito** en y=130, trazo `#b9c4be` de 1.5px — más marcado que la grilla, porque el signo es el punto de la vista.
- Grilla en +1.500 (y=30), +750 (y=75), -750 (y=185). Etiquetas con signo explícito: `+1.500`, `+750`, `0`, `-750`.
- Barras de 44px de ancho, paso de 130px desde x=110.
- Valores positivos en verde (`bar-in`) creciendo hacia arriba desde el cero; negativos en rojo (`bar-out`) creciendo hacia abajo.
- Etiqueta de valor: encima de la barra si es positiva, debajo si es negativa. Siempre con signo.
- Etiquetas de tramo en y=212.

| Tramo | Valor | Color |
|-------|-------|-------|
| 0 a 30 d | +1.240,5 | verde |
| 31 a 60 d | +860,2 | verde |
| 61 a 90 d | +415,8 | verde |
| 91 a 120 d | -320,4 | rojo |
| mas de 120 d | **-100,0** | rojo |

**Barra fantasma de comparación**: junto a "mas de 120 d", una barra gris (`#d8dedb`) de 44px pegada a la derecha, dibujada **hacia arriba** desde el cero, con etiqueta `+100,0`. Bajo el gráfico (y=232): "barra clara: valor que devolvia el calculo anterior".

> **Decisión de alcance**: la barra fantasma es **solo material de verificación**. La leyenda lo declara: "Comportamiento anterior (solo referencia, no se muestra en produccion)". En la implementación productiva **no se dibuja**; se mantiene únicamente si se implementa un modo de comparación explícito para QA.

Leyenda inline:
- `#3f8a63` — "Ingreso neto"
- `#b6543f` — "Salida neta"
- `#d8dedb` — "Comportamiento anterior (solo referencia, no se muestra en produccion)"

`Callout info` (margen superior 14px):

> **Que cambia para el usuario.** Un despacho de madera con mas de 120 dias ahora reduce el stock del tramo en vez de aumentarlo. El total de la cancha baja en consecuencia y coincide con el stock real.

### 10.2 Panel 2 — "Volumen en cancha por especie, en m3sec"

Sub-texto: "Cancha Norte".

**Componente `hbars`**: grid de tres columnas `170px 1fr 110px`, gap 8px/12px, alineado al centro. Bajo 820px: `120px 1fr 90px`.

- **name**: nombre de especie, 13px.
- **track**: pista de 16px de alto, fondo `--line-2`, radio 4px, `overflow: hidden`.
- **fill**: relleno absoluto desde la izquierda, `#3f8a63`, radio 4px. Variante `part`: **rayado diagonal a 45°** alternando `#3f8a63` y `#79ad93` cada 6px — indica cobertura parcial de m3sec.
- **val**: valor a la derecha, monoespaciado tabular 12.5px.

| Especie | Ancho | Valor | Relleno |
|---------|-------|-------|---------|
| Pino radiata | 78% | 6.412,80 | sólido |
| Eucalipto globulus | 44% | 3.620,15 | sólido |
| Eucalipto nitens | 26% | 2.140,37 | **rayado (parcial)** |
| Otras especies | 8% | 674,00 | sólido |

Leyenda inline (un ítem, swatch con el mismo rayado a 4px): "Cobertura parcial de m3sec en esta especie".

`Callout ok` (margen superior 14px):

> **Origen validado.** Los despachos ahora se restan solo cuando la cancha consultada es el origen del movimiento. Antes, un despacho con origen en otra cancha reducia el volumen de esta.

### 10.3 Estados

- **cargando**: skeletons 40 / 85 / 65 / 25%.
- **vacio**: "No hay stock en esta cancha para el corte seleccionado" / "Revisa la fecha de corte o selecciona otra cancha."
- **error**: `Callout err` — "**No se pudo calcular el stock por antiguedad.** Reintenta en unos segundos."

---

## 11. V9 · Conciliacion: graficos contra la vista de rumas

**Path**: `Estadisticas › Conciliacion` — **Nueva** — Legacy + Nuxt — REQ-12, REQ-09

**Nota de vista** (literal): "Panel de verificacion del criterio de aceptacion cruzado: para una misma cancha y conjunto de rumas, el total graficado debe coincidir con la suma de m3sec de la vista de rumas. Deja documentado que la completitud queda limitada por el hueco de MII 2025, lo cual es esperado."

### 11.1 Panel 1 — Conciliación

**Toolbar**:

| Label | Control | Valor |
|-------|---------|-------|
| Cancha | select | Cancha Norte |
| Conjunto de rumas | select | Activas |
| Rango | select | 01-2026 a 08-2026 |

Botón: `Conciliar` (primary).

**Callout de resultado** (margen inferior 14px, encima de la tabla) — su tipo depende del resultado:
- Cuadra → `Callout ok`: "**Los totales cuadran.** El total graficado por stats coincide con la suma de m3sec de la vista de rumas para el mismo conjunto."
- No cuadra → el estado "no cuadra" descrito en 11.3.

**Tabla de tres filas**: `Fuente` | `Rumas`▸num | `Guias`▸num | `Guias con m3sec`▸num | `Total m3sec`▸num | `Resultado`.

| Fuente | Rumas | Guias | Guias con m3sec | Total m3sec | Resultado |
|--------|-------|-------|-----------------|-------------|-----------|
| Vista de rumas | 142 | 1.482 | 328 | **12.847,32** | mut "Referencia" |
| Graficos de stats | 142 | 1.482 | 328 | **12.847,32** | ok "Coincide" |
| Diferencia | 0 | 0 | 0 | 0,00 | ok "Sin desviacion" |

La tercera fila es siempre la resta de las dos primeras. Con diferencia distinta de cero, sus badges pasan a `err`.

**Footer** (borde superior `--line-2`), `Callout warn`:

> **Limite conocido de completitud.** Solo 328 de 1.482 guias (22,1%) tienen volumen MII. Los totales son consistentes entre ambas vistas, pero no representan el 100% del movimiento.
>
> Completar la data de MII 2025 esta fuera del alcance de este ticket.

Este callout aparece **incluso cuando los totales cuadran**: consistencia ≠ completitud.

### 11.2 Panel 2 — "Rendimiento del cruce con MII"

Sub-texto: "Medicion sobre rumas activas". Body `tight`.

Tabla: `Endpoint` | `Latencia antes`▸num | `Latencia despues`▸num | `Documentos escaneados`▸num | `Estado`.

| Endpoint | Antes | Despues | Docs escaneados | Estado |
|----------|-------|---------|-----------------|--------|
| Movimiento mensual | 0,52 s | 0,84 s | 148.320 | ok "Dentro del umbral" |
| Stock por antiguedad | 0,61 s | 1,02 s | 162.440 | ok "Dentro del umbral" |
| Volumen por especie *(hl)* | 0,74 s | **2,91 s** | 421.980 | err "Supera el umbral" |
| Resumen por cancha | 0,44 s | 0,69 s | 96.110 | ok "Dentro del umbral" |
| Detalle por producto | 0,58 s | 0,91 s | 131.500 | ok "Dentro del umbral" |

La fila que supera el umbral se marca `hl` + badge `err`.

**Footer**, `Callout warn`:

> **Volumen por especie supera el umbral acordado.** Requiere una forma acotada del cruce (filtro previo por periodo o guia, proyeccion, o indice) antes de cerrar la sesion.

### 11.3 Estados

- **conciliando**: texto apagado 13px "Calculando ambos totales sobre el mismo conjunto de rumas." + `Progress` al 61%.
- **no cuadra**: `Callout err` — "**Los totales no coinciden.** Vista de rumas 12.847,32 · graficos 12.610,08 · diferencia -237,24 m3sec." / "Revisa el mapeo de ajustes por `valorAjusteM3` y que ambas vistas usen el mismo conjunto de rumas." + botón "Ver guias con diferencia".
- **vacio**: "No hay rumas que conciliar" / "El conjunto seleccionado no tiene rumas con guias en el rango indicado."

---

## 12. Navegación entre vistas

Enlaces explícitos que la maqueta define:

| Origen | Destino | Disparador |
|--------|---------|------------|
| V7 estado "sin datos de m3sec" | V4 | Botón "Ver diagnostico de integridad MII" |
| V4 fila con "Backfill pendiente" | V5 | El badge indica la acción; el acceso a V5 vive bajo `Operacion › Integridad MII › Backfill` |
| V9 estado "no cuadra" | listado de guías con diferencia | Botón "Ver guias con diferencia" |
| V1 estado vacío | listado de canchas | Botón "Ver todas las canchas" |

Las tres vistas de integridad (V4, V5, V6) comparten la raíz de breadcrumb `Operacion › Integridad MII` y deben agruparse en el mismo nodo de menú.

---

## 13. Responsive

Único breakpoint declarado: **820px**.

- `.split` (V2): `1fr 1fr` → `1fr`.
- `.hbars` (V8): `170px 1fr 110px` → `120px 1fr 90px`.
- Todas las toolbars ya llevan `flex-wrap: wrap`: los filtros se apilan solos.
- Los gráficos SVG viven dentro de `ChartWrap` con `overflow-x: auto`: no se reescalan, se desplazan.
- Los grids de KPIs y de estados son `auto-fit`: colapsan a una columna sin regla extra.

---

## 14. Accesibilidad

- Cada SVG lleva `role="img"` y `aria-label` que describe el gráfico completo (textos literales en 9.3 y 10.1).
- El color nunca es el único portador de información: el signo acompaña a los deltas, el badge acompaña al color de fila, la etiqueta "sin MII" acompaña a la barra gris, el rayado distingue la cobertura parcial más allá del tono.
- Los valores ausentes usan `--`, legible por lector de pantalla, con el tooltip como texto asociado (`title` o `aria-describedby`).
- El botón deshabilitado de V6 conserva su `title` explicativo: "Deshabilitado en este ticket".
- Contraste: todos los pares texto/fondo de callouts y badges de la maqueta cumplen AA en 13px.

---

## 15. Checklist de verificación contra la maqueta

- [ ] Los 9 breadcrumbs coinciden literalmente, incluido el separador `›`.
- [ ] V8 **no** tiene badge Nuxt ni implementación en Nuxt.
- [ ] El valor ausente se renderiza `--`, nunca `0` ni vacío, en V1 (m3sec #5263) y V3 (m3sec #4802).
- [ ] El total de V1 (729,90) excluye la ruma con m3sec ausente.
- [ ] "MR actual" en V3 va tachado en todas las filas.
- [ ] En V2, la fila MR está destacada y el badge "corregido" acompaña a `valorAjusteMR`.
- [ ] "Ejecutar backfill" (V5) nace deshabilitado y solo se habilita tras dry-run exitoso de la misma selección.
- [ ] "Corregir seleccionadas" (V6) está presente, visible y permanentemente deshabilitado con su `title`.
- [ ] El mes sin dato MII en V7 se dibuja como barra gris con etiqueta "sin MII", no como cero.
- [ ] En V8, el tramo "mas de 120 d" es **negativo** y la línea de cero tiene trazo diferenciado.
- [ ] La barra fantasma de V8 no se envía a producción salvo modo comparación explícito.
- [ ] Los 4 KPIs de V4 conservan el mapeo de acento: cobertura verde, A gris, B ámbar, C rojo.
- [ ] El callout de cobertura de V7 y el de completitud de V9 se muestran siempre que la cobertura sea parcial, incluso con totales que cuadran.
- [ ] Todos los estados listados por vista existen en la implementación: V1 (3), V3 (3), V4 (3), V5 (4), V6 (3), V7 (4), V8 (3), V9 (3).
- [ ] Los números usan coma decimal y punto de miles en toda la UI.