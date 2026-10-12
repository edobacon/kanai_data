# Guía de implementación: Fondos claros de M1a (TAO-201 · HU-02-08)

Evidencia para la revisión diferida de Diseño (QA-02-08-01 y QA-02-08-04). Todas las composiciones son **provisionales**: ninguna figura como aprobada.

---

## 1. Alcance

Página de revisión (una sola vista, scroll vertical) con 7 bloques dentro de `main`:

1. Hoja de contacto (12 composiciones)
2. Resolución en tablet horizontal (QA-02-08-02)
3. Estados del fondo en la vista
4. Contraste AA con texto al 200 %
5. Inventario en el manifiesto
6. Salida del validador del manifiesto
7. Goldens por familia (HU-01-16), estado vacío

Los paisajes de la maqueta son una aproximación con CSS. La implementación real usa las PNG de `app/assets/fondos-vistas/composiciones/`. La aprobación se hace sobre esas PNG, no sobre la maqueta.

---

## 2. Tokens

### Superficie y texto

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f4ef` | `#16181c` |
| `--ink` | `#1f2328` | `#e8e6e1` |
| `--muted` | `#5b616b` | `#a3a7ae` |
| `--line` | `#d9d5cc` | `#33373e` |
| `--card` | `#ffffff` | `#1f2228` |
| `--canvas` | `#f3efe6` | `#f3efe6` (no cambia) |
| `--overlay` | `rgba(255,255,255,.86)` | igual |
| `--overlayInk` | `#1d2a24` | igual |

### Semánticos (fondo / texto)

| Rol | Light bg / fg | Dark bg / fg |
|---|---|---|
| ok | `#e3f4ea` / `#1a7f4b` | `#173626` / `#5fd398` |
| warn | `#fdf1d8` / `#8a5a00` | `#3a2e12` / `#f0c062` |
| err | `#fde7e5` / `#b42318` | `#3d1a17` / `#ff8a7e` |
| info | `#e4eefb` / `#1f5fae` | `#172a44` / `#8cb8f2` |

### Guías

`--bars`: `repeating-linear-gradient(135deg, rgba(180,35,24,.22) 0 6px, rgba(180,35,24,.08) 6px 12px)`.

### Tema

- Seguir `prefers-color-scheme: dark` salvo que `data-theme="light"` esté presente.
- `data-theme="dark"` fuerza oscuro.
- Los dispositivos simulados mantienen `--canvas` claro y borde `#2a2d33` en ambos temas. El chip "Tema: light" refleja el tema del fondo, no el de la página.

### Tipografía y layout base

- Fuente: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, 15px / 1.5.
- `box-sizing: border-box` global, `body` sin margen.
- Ancho máximo 1240px, centrado, gutter lateral 16px.
- Bloque tipo tarjeta (`section`): fondo `--card`, borde 1px `--line`, radio 12px, padding 18px, separación superior 18px.

---

## 3. Encabezado (`header.top`)

Padding `24px 16px 8px`.

- `h1` (22px, margen inferior 4px): **"Fondos claros de M1a: teléfono vertical, tablet vertical y tablet horizontal"**
- Párrafo en `--muted`: **"TAO-201 · HU-02-08 · Evidencia para la revisión diferida de Diseño (QA-02-08-01 y QA-02-08-04). Las composiciones son provisionales: ninguna figura como aprobada."**

### 3.1 Controles de guías (`role="group"`, `aria-label="Guías superpuestas"`)

Cuatro casillas, sin JS. Cada una es un `input type=checkbox` oculto accesiblemente (posición absoluta, opacidad 0, sin eventos de puntero) ubicado como hermano previo de `header` y `main`, con su `label` visible en el encabezado.

| Id | Etiqueta | Por defecto | Efecto |
|---|---|---|---|
| `g-quiet` | Zona tranquila (≥ 65 %) | marcada | Muestra los recuadros `.quiet` |
| `g-bars` | Barras del sistema | marcada | Muestra el relleno rayado de `.sysbar`; desmarcada deja fondo transparente y sin contorno |
| `g-tpl` | Plantilla HU-01-10 | marcada | Muestra la capa `.tpl` |
| `g-scale` | Texto al 200 % | desmarcada | `.tpl` a `font-size: 200%` |

- Layout: flex con wrap, gap 14px, 13px, margen superior 6px.
- Cada label: flex, gap 6px, cursor pointer, con un cuadro de 14×14px (borde 1.5px `--muted`, radio 3px) a la izquierda. Marcada: ese cuadro se rellena con `--info` y borde `--info`.
- Selectores clave: `#g-quiet:not(:checked) ~ main .quiet {display:none}`, `#g-bars:not(:checked) ~ main .sysbar {background:transparent; outline:none}`, `#g-tpl:not(:checked) ~ main .tpl {display:none}`, `#g-scale:checked ~ main .tpl {font-size:200%}`.
- Requiere que los inputs sean hermanos anteriores de `header` y `main` (misma jerarquía que la maqueta).

**Accesibilidad:** el input oculto no debe perder el foco por teclado. Añadir indicador `:focus-visible` sobre el cuadro del label (la maqueta no lo define; es un agregado necesario y no altera lo aprobado).

### 3.2 Chips informativos

Contenedor `.chips` (flex wrap, gap 6px, margen superior 10px). Chip: 12px, padding `2px 8px`, radio 999px, borde 1px `--line`, texto `--muted`.

- "Tema: light"
- "Overlay: surfaceOverlay"
- "Respaldo: canvas"
- "Mínimos: 1536 × 2732 · 2048 × 2732 · 2732 × 2048 px"

---

## 4. Componentes reutilizables

### 4.1 Badge

Inline-block, 11px, peso 600, padding `1px 7px`, radio 999px, sin salto de línea.

| Clase | Uso | Colores |
|---|---|---|
| `b-prov` | provisional / pendiente / por medir | warn |
| `b-ok` | correcto / esperado / cumple | ok |
| `b-err` | no permitido / error / no cumple | err |
| `b-ref` | referencia sin uso final | info |

### 4.2 Dispositivo simulado (`.dev`)

Contenedor `position: relative; overflow: hidden`, radio 14px, borde 3px `#2a2d33`, fondo `--canvas`.

| Variante | Ancho | Aspect-ratio | Radio |
|---|---|---|---|
| `phone` | 132px | 1536/2732 | 14px |
| `tabp` (tablet vertical) | 176px | 2048/2732 | 12px |
| `tabl` (tablet horizontal) | 264px | 2732/2048 | 12px |

Capas internas, de abajo hacia arriba (z-index):

1. `.land` (1): fondo / paisaje, `inset: 0`
2. `.quiet` (2): zona tranquila
3. `.sysbar` (3): barras del sistema, superior (`t`) e inferior (`b`)
4. `.tpl` (4): plantilla superpuesta
5. `.missing-note` (5): solo en estado de error

Orden en el DOM: `land`, `sysbar.t`, `quiet`, `tpl`, (`missing-note`), `sysbar.b`.

### 4.3 Barras del sistema (`.sysbar`)

Posición absoluta, ancho completo, contorno 1px dashed `rgba(180,35,24,.6)`, relleno `--bars`.

| Dispositivo | Alto superior | Alto inferior |
|---|---|---|
| phone / tabp | 5.5 % | 3.5 % |
| tabl | 6 % | 4.5 % |

### 4.4 Zona tranquila (`.quiet`)

Recuadro absoluto, borde 1.5px dashed `rgba(31,95,174,.85)`, radio 6px.

| Dispositivo | `inset` (arriba derecha abajo izquierda) |
|---|---|
| phone | 16 % 12 % 18 % 12 % |
| tabp | 15 % 14 % 17 % 14 % |
| tabl | 14 % 20 % 14 % 20 % |

Etiqueta interna: **"zona tranquila"**, 8px, fondo `rgba(31,95,174,.9)`, texto blanco, padding `0 4px`, esquina `4px 0 4px 0`, anclada arriba a la izquierda (`top:-1px; left:-1px`).

### 4.5 Plantilla HU-01-10 (`.tpl`)

Columna flex, gap 4px, `overflow: hidden`, color `--overlayInk`.

| Dispositivo | `inset` | Tamaño de fuente |
|---|---|---|
| phone | 18 % 15 % 20 % 15 % | 7px |
| tabp | 17 % 17 % 19 % 17 % | 8px |
| tabl | 16 % 23 % 16 % 23 % | 7.5px |

Hijos:

- `.ttl`: título, peso 700, 1.45em, interlineado 1.15.
- `.card`: fondo `--overlay`, radio 5px, padding `4px 5px`, interlineado 1.3.
- `.btn`: píldora (radio 999px), fondo `#245b47`, texto blanco, peso 600, padding `2px 7px`, `align-self: flex-start`, `margin-top: auto` (se pega al fondo de la plantilla).

Con "Texto al 200 %" activo, todo el contenido escala por em; el `overflow: hidden` recorta lo que exceda y eso es parte de la verificación visual.

### 4.6 Figure con leyenda

`figure` sin margen. `figcaption` 11.5px, `--muted`, interlineado 1.4, margen superior 6px; `<b>` en `--ink`, peso 600.

Estructura de leyenda en la hoja de contacto: `<b>` nombre de la composición, salto, medidas con tema ("1536 × 2732 · light"), salto, badge `b-prov` con **"Pendiente de aprobación"**.

### 4.7 Paisajes por familia (solo para la maqueta)

Cada familia define cinco variables: `--sky1`, `--sky2`, `--h1`, `--h2`, `--acc`.

| Clase | sky1 | sky2 | h1 | h2 | acc |
|---|---|---|---|---|---|
| `f-id` | `#fbf3e4` | `#f3e3c8` | `#c9b48e` | `#a99572` | `#e9b866` |
| `f-ini` | `#eef5ef` | `#dbe9dc` | `#9cbf9f` | `#6f9c78` | `#f2cf7a` |
| `f-con` | `#eef2f8` | `#dde5f1` | `#a9b9d3` | `#8095b8` | `#f0d9a8` |
| `f-rec` | `#f6efe9` | `#eadbcd` | `#d1a98b` | `#a97f64` | `#f2b880` |

Reglas de composición que debe respetar la PNG real (y que la aproximación CSS ilustra):

- **Vertical (teléfono y tablet):** paisaje abajo y en las esquinas, centro libre, punto focal (sol) arriba a la derecha.
- **Horizontal:** composición propia, paisaje a los lados, mismo punto focal arriba a la derecha.
- Nunca reutilizar el vertical estirado o recortado.

En la implementación, `.land` se reemplaza por la imagen real con `object-fit: cover` sobre un contenedor de la proporción exacta del dispositivo (no hay deformación porque coincide el aspecto).

---

## 5. Bloque 1: Hoja de contacto

`section` con `aria-labelledby="h-sheet"`.

- `h2` (17px): **"Hoja de contacto: 12 composiciones con la plantilla superpuesta"**
- Lead (14px, `--muted`): **"Cuatro familias por tres composiciones. Cada composición es propia: el paisaje se recoloca hacia los bordes y el centro queda libre para el contenido. Recuadro azul: zona tranquila. Franjas rojas: barras del sistema."**

### Estructura

`.sheet` (grid, gap 14px) contiene 4 `.row`. Cada fila: grid `150px 1fr`, gap 14px, alineada arriba, borde superior 1px dashed `--line` y padding superior 14px (la primera fila sin borde ni padding).

- Columna izquierda `.fam`: `h3` (14px) con el nombre, `code` (11px, `--muted`, `word-break: break-all`) con el id, y `.views` (12px, `--muted`, margen superior 4px) con las vistas.
- Columna derecha `.shots`: flex wrap, gap 14px, alineado al fondo, con 3 figuras en orden **Teléfono vertical, Tablet vertical, Tablet horizontal**.

En ≤ 640px la fila pasa a una columna.

### Contenido de las 4 filas

| Familia | Id | Vistas | Clase | Título plantilla | Texto de la tarjeta | Botón |
|---|---|---|---|---|---|---|
| Identidad y entrada | `identidad-entrada` | V-31 | `f-id` | Te damos la bienvenida | Entra con tu cuenta para continuar donde lo dejaste. | Entrar |
| Inicio | `v-01-inicio` | V-01 | `f-ini` | Buenos días | Tienes una consulta nueva y un paso pendiente en tu recorrido. | Continuar |
| Consultas y personas | `consultas-personas` | V-02, V-03, V-28, V-29, V-44 | `f-con` | Consultas | Escribe tu pregunta. Te respondemos en este mismo espacio. | Nueva consulta |
| Recorrido | `recorrido` | V-04 a V-07, V-32 | `f-rec` | Recorrido · Etapa 2 | Completa este paso para desbloquear la siguiente etapa. | Seguir |

Los `code` se muestran como `id: <id>`, y las vistas como `Vistas: <lista>`.

Cada figura repite la leyenda: **"Teléfono vertical"** / **"Tablet vertical"** / **"Tablet horizontal"**, medidas **1536 × 2732**, **2048 × 2732**, **2732 × 2048**, tema `light`, badge `b-prov` "Pendiente de aprobación".

### Nota final

`.note` (13px, fondo `--infobg`, borde izquierdo 3px `--info`, padding `8px 12px`, radio 6px, margen superior 12px): **"Los paisajes de esta maqueta son una aproximación con CSS para revisar la disposición. La aprobación se hace sobre las PNG reales de `app/assets/fondos-vistas/composiciones/`."**

---

## 6. Bloque 2: Resolución en tablet horizontal (QA-02-08-02)

`h2`: **"Resolución en tablet horizontal (QA-02-08-02)"**

Lead: **"Con shortestSide ≥ TaoBreakpoint.mediumMin y orientación horizontal, el resolvedor entrega `lightTabletLandscape`. Nunca se estira ni se recorta el vertical."**

Contenedor `.cmp`: grid `repeat(auto-fit, minmax(280px, 1fr))`, gap 16px. Dos figuras con tablet horizontal:

| Caso | Dispositivo | Veredicto |
|---|---|---|
| Correcto | `tabl f-rec` con zona tranquila, plantilla "Recorrido · Etapa 2" | Badge `b-ok` **"Esperado"** + "Variante `lightTabletLandscape`, 2732 × 2048. Paisaje recolocado a los lados, mismo punto focal." |
| Incorrecto | `tabl stretched f-rec`, **sin** zona tranquila | Badge `b-err` **"No permitido"** + "El vertical 9:16 estirado: deforma el paisaje, lo pixela y lo pone bajo el contenido. El golden falla si aparece." |

`.verdict`: flex, gap 6px, alineado al inicio, 13px, margen superior 8px.

El caso `stretched` usa la composición vertical (sol, colinas inferiores) con `filter: blur(.6px)`, para mostrar deformación y pixelado. Es un contraejemplo visual: no debe existir como asset real; el golden debe fallar si el resolvedor lo produce.

---

## 7. Bloque 3: Estados del fondo

`h2`: **"Estados del fondo en la vista"**
Lead: **"El contenido de la plantilla siempre se muestra. Solo cambia la capa del fondo."**

Grid `.states`: `repeat(auto-fit, minmax(200px, 1fr))`, gap 16px. Cuatro figuras. Ninguna lleva zona tranquila.

| Estado | Dispositivo | Capa de fondo | Leyenda |
|---|---|---|---|
| **Cargado** | phone `f-ini` | Composición de la familia | **Cargado** / "Composición de la familia según el layout." |
| **Cargando** | phone `loading` | Gradiente lineal 100° (`--canvas` 30 %, `#ebe5d8` 50 %, `--canvas` 70 %), tamaño 200 % × 100 % | **Cargando** / "Superficie canvas mientras se decodifica la imagen. Sin indicador de carga: el contenido ya es usable." |
| **Error: fondo retirado del paquete** (QA-02-08-03) | phone `fallback` | Color plano `--canvas`, con `.missing-note` "fondo ausente" | "Se usa `fallbackSurfaceToken: 'canvas'`. La vista no falla ni muestra mensaje al usuario; se registra el asset faltante." |
| **Error en tablet horizontal** | tabl `fallback` | `--canvas` plano, con "fondo ausente" | "Mismo respaldo canvas, sin caer al vertical." |

- `.missing-note`: posición absoluta, z 5, `left: 6px; bottom: 7%`, 8px, fondo `rgba(0,0,0,.65)`, texto blanco, padding `1px 5px`, radio 4px. Es una anotación de la maqueta; **en la app real no se muestra nada al usuario**, solo se registra el asset faltante.
- La plantilla (título, tarjeta, botón) se renderiza idéntica en los cuatro estados.
- Comportamiento: sin spinner ni skeleton de contenido. El shimmer de "Cargando" es estático en la maqueta; si se anima, solo el fondo y respetando `prefers-reduced-motion`.
- El estado cargando muestra el título "Buenos días", pero sin clase de familia (solo `canvas`).

---

## 8. Bloque 4: Contraste AA con texto al 200 %

`h2`: **"Contraste AA con texto al 200 %"**

Lead: **"Se mide el texto de la plantilla sobre surfaceOverlay, en la zona de contenido principal de cada composición. Umbral: 4.5:1 para texto normal. Activa "Texto al 200 %" arriba para ver la escala en la hoja de contacto."**

### Tabla (dentro de `.tbl-wrap` con `overflow-x: auto`)

Columnas: **Familia · Teléfono vertical · Tablet vertical · Tablet horizontal · Peor caso**

| Familia | Tel. | Tab. V | Tab. H | Peor caso |
|---|---|---|---|---|
| identidad-entrada | `__ : 1` | `__ : 1` | `__ : 1` | badge `b-prov` "Por medir" |
| v-01-inicio | `__ : 1` | `__ : 1` | `__ : 1` | "Por medir" |
| consultas-personas | `__ : 1` | `__ : 1` | `__ : 1` | "Por medir" |
| recorrido | `__ : 1` | `__ : 1` | `__ : 1` | "Por medir" |

Los valores se muestran con el marcador `__ : 1` hasta que se midan. Tabla base: 13px, ancho completo, `border-collapse: collapse`, celdas con padding `7px 8px`, borde inferior 1px `--line`, alineadas arriba. `th`: 12px, `--muted`, peso 600, sin salto de línea.

Leyenda de estados bajo la tabla (`.chips`):

- `b-ok` **"Cumple AA ≥ 4.5:1"**
- `b-err` **"No cumple: bloquea el cierre"**
- `b-prov` **"Por medir"**

Regla: cuando haya valores, "Peor caso" es el mínimo de la fila; ≥ 4.5 es `b-ok`, menor es `b-err`.

---

## 9. Bloque 5: Inventario en el manifiesto

`h2`: **"Inventario en el manifiesto"**

Lead: **"`app/assets/manifest.json` · 12 maestros provisionales y 4 referencias de maqueta retiradas del uso final."**

Columnas: **Familia · Variante · Archivo · Medidas (mínimo) · Tema · Autoría · Estado**

### Filas de maestros (estado `b-prov` "provisional", tema `light`, autoría `registrada`)

| Familia | Variante | Archivo (`code`) | Medidas |
|---|---|---|---|
| identidad-entrada | lightPhonePortrait | `composiciones/…phone-portrait.png` | ≥ 1536 × 2732 |
| (vacío) | lightTabletPortrait | `composiciones/…tablet-portrait.png` | ≥ 2048 × 2732 |
| (vacío) | lightTabletLandscape | `composiciones/…tablet-landscape.png` | ≥ 2732 × 2048 |
| v-01-inicio | 3 variantes | `composiciones/…` | según composición |
| consultas-personas | 3 variantes | `composiciones/…` | según composición |
| recorrido | 3 variantes | `composiciones/…` | según composición |

Las celdas de familia vacías en las filas 2 y 3 indican agrupación visual, no datos faltantes.

### Filas de referencias (clase `retired`: texto en `--muted`)

Primera celda con `colspan=2`: "Referencia de maqueta". Tema `light`, autoría `registrada`, medidas **940/941 × 1672**, estado badge `b-ref` **"referencia, sin uso final"**.

Archivos: `familia-identidad-entrada.png`, `v-01-inicio.png`, `familia-consultas-personas.png`, `familia-recorrido.png`.

Nota final (`.note`): **"El estado **aprobado** solo se asigna con la aprobación de Diseño (verificación humana diferida, adenda 1). Los derivados se generan con `export_assets.py` cuando pasen a aprobado."**

---

## 10. Bloque 6: Salida del validador del manifiesto

`h2`: **"Salida del validador del manifiesto"**

Lead: **"`validate_manifest.py` con las reglas nuevas: mínimos por composición y rechazo de 940/941 × 1672 como aprobado."**

Grid `.grid2`: `repeat(auto-fit, minmax(320px, 1fr))`, gap 16px. Dos columnas.

Cada una abre con un `.verdict` sin margen superior y 6px de margen inferior, con badge y texto.

### Columna A: badge `b-ok` "Correcto" + "Manifiesto actual"

Bloque de log (`.log`):

```
$ python validate_manifest.py
OK  12 maestros con medidas ≥ mínimo de su composición
OK  4 familias declaran phone/tabletPortrait/tabletLandscape
OK  ningún fondo 940/941 × 1672 figura como aprobado
OK  ninguna familia de uso final apunta a una referencia
0 errores · 12 provisionales · 4 referencias
```

### Columna B: badge `b-err` "Error" + "Ejemplo de rechazo"

```
$ python validate_manifest.py
ERROR recorrido/lightTabletLandscape: 2048 × 1536
      menor que el mínimo 2732 × 2048 (tablet-landscape)
ERROR familia-recorrido.png (941 × 1672) en estado
      aprobado: solo se admite como referencia
2 errores · el check falla
```

### Estilo del log

Fondo `#111418`, texto `#d7dde5`, radio 8px, padding 12px, monoespaciada (`ui-monospace, SFMono-Regular, Menlo`) 12.5px / 1.55, `white-space: pre`, `overflow-x: auto`.

- `OK`: `#6fdc9f`
- `ERROR`: `#ff8a7e`
- Líneas de comando y resumen: `#8b949e` (dim)

El log no cambia con el tema de la página.

---

## 11. Bloque 7: Goldens por familia (HU-01-16)

`h2`: **"Goldens por familia (HU-01-16)"**
Lead: **"12 goldens: plantilla con el fondo de cada familia en teléfono vertical, tablet vertical y tablet horizontal."**

Estado vacío (`.empty`): borde 1.5px dashed `--line`, radio 10px, padding 22px, centrado, 14px, `--muted`.

- Título en `<b>` (bloque, `--ink`, margen inferior 4px): **"Aún no hay goldens generados"**
- Texto: **"Se generan al correr la suite de goldens de plantillas. Hasta entonces, la hoja de contacto de arriba es la evidencia para Diseño."**

Cuando existan goldens, este bloque se sustituye por la grilla de 12 imágenes (misma estructura de hoja de contacto). El estado vacío no incluye acción.

---

## 12. Responsive

- Gutter lateral 16px en todos los anchos.
- ≤ 640px: `.row` de la hoja de contacto pasa a una columna (la ficha de familia arriba, los dispositivos debajo).
- `.shots` con wrap permite que los tres dispositivos bajen de línea.
- Tablas dentro de `.tbl-wrap` con scroll horizontal propio; la página no debe tener scroll horizontal.
- `.cmp`, `.states` y `.grid2` usan `auto-fit` con mínimos de 280px, 200px y 320px.

---

## 13. Accesibilidad

- Cada `section` con `aria-labelledby` apuntando a su `h2` (`h-sheet`, `h-res`, `h-states`, `h-aa`, `h-inv`, `h-val`, `h-gold`).
- El grupo de guías con `role="group"` y `aria-label="Guías superpuestas"`.
- El estado no depende solo del color: cada badge lleva texto.
- Los dispositivos simulados son decorativos: marcar `.land`, `.sysbar` y `.quiet` con `aria-hidden="true"`. El contenido textual de `.tpl` se mantiene accesible; considerar `role="img"` con `aria-label` descriptivo en el contenedor `.dev` si se prefiere tratarlo como una sola imagen (decisión del desarrollador, no está en la maqueta).
- Contraste AA ≥ 4.5:1 del texto de la plantilla sobre `--overlay` es el criterio del bloque 4.

---

## 14. Interacciones (resumen)

- Solo las 4 casillas del encabezado. Sin JS, solo CSS.
- Sin hover, modales, navegación ni envío de datos.
- Sin indicador de carga en el estado "Cargando".
- Sin mensajes de error al usuario en el estado "fondo ausente"; solo se registra el asset faltante.

---

## 15. Reglas de aprobación (no negociables)

1. Ninguna composición figura como aprobada: todas llevan "Pendiente de aprobación" o "provisional".
2. El estado **aprobado** solo lo asigna Diseño (verificación humana diferida, adenda 1).
3. Las referencias de maqueta (940/941 × 1672) nunca se usan como fondo final ni figuran como aprobadas.
4. Mínimos: 1536 × 2732 (teléfono), 2048 × 2732 (tablet vertical), 2732 × 2048 (tablet horizontal).
5. En tablet horizontal se usa `lightTabletLandscape`, nunca el vertical estirado o recortado.
6. Respaldo ante fondo ausente: `fallbackSurfaceToken: 'canvas'`, sin fallo ni mensaje visible.