# TICKET-143 · Curriculum Mapping — Tributación por competencia (grilla)
## Guía de implementación (fiel a la maqueta aprobada)

> Esta guía describe **exactamente** lo aprobado en la maqueta. Todo lo que no aparece acá es fuera de alcance, y las ausencias listadas en §11 son deliberadas: no deben implementarse "por completitud".

---

## 1. Ubicación y activación de la vista

**Ruta**: Plan de estudio → tab **"Tributación"**.

Tabs de la vista de plan, en este orden exacto:

`General` · `Asignaturas` · `Malla` · **`Tributación`** (activa) · `Resultados de aprendizaje`

Condiciones de visibilidad del tab:

| Condición | Efecto |
|---|---|
| El plan tiene al menos una matriz adoptada **y** el usuario tiene `competencyalignment:view` | Tab visible y navegable |
| Falta `competencyalignment:view` | Tab no se renderiza |
| No hay adopciones | Tab visible, contenido = estado vacío 4a (ver §7) |

**Capabilities**:
- `competencyalignment:view` → lectura de las tres zonas.
- `competencyalignment:create` / `:modify` / `:delete` → habilitan asignar / editar / mover / retirar respectivamente.
- Sin ninguna de las tres de escritura → **modo solo lectura** (§6).

---

## 2. Anatomía: jerarquía de componentes

```
TributacionTab
├── MatrixBar                       (barra superior, fija sobre el cuerpo)
│   ├── MatrixSelect                (select de matriz adoptada)
│   ├── PlanAlignmentCountBadge     ("12 tributaciones en este plan")
│   └── StatusBadge                 ("Adopción vigente" | "Solo lectura" | "Cargando…" | "N matrices adoptadas")
└── TributacionBody                 (grid 2 columnas: 290px / 1fr)
    ├── SubjectPanel (aside)
    │   ├── PanelTitle              ("Asignaturas del plan")
    │   ├── PanelTools
    │   │   ├── SearchInput         (placeholder "Buscar por código o nombre")
    │   │   └── FilterChips         (Todas / Con tributación / Sin tributar)
    │   ├── SubjectList
    │   │   └── SubjectItem[]       (código, badge de conteo, nombre, acción)
    │   └── SubjectPanelEmpty       (sin asignaturas | sin coincidencias)
    └── GridArea (main)
        ├── InHandBanner            (solo cuando hay asignatura en mano)
        ├── CompetencyBlock[]
        │   ├── CompetencyHeader    (twisty, id, nombre, tag, meta)
        │   ├── LevelGrid           (tabla: 1 columna por nivel declarado)
        │   │   └── LevelCell[]     (chips + botón "+ Asignar acá" | bloque "no destino")
        │   └── AlignmentDetailTable (visible si el bloque está expandido)
        └── GridLegend
```

Estados alternativos que **reemplazan** al cuerpo o al `GridArea` completo: `EmptyState`, `LoadingSkeleton`, `ErrorState` (§7, §8, §9).

---

## 3. `MatrixBar`

Fila horizontal con wrap, fondo `--surface-2`, borde inferior, padding `14px 20px`, gap `14px`.

**Contenido de izquierda a derecha:**

1. **Campo "Matriz de competencia"**: label + `<select>` (`min-width: 290px`). Cada opción muestra el nombre de la matriz seguido de `— adoptada`.
   - Ej.: `Matriz de Competencias Genéricas UP 2023 — adoptada`
   - Solo se listan matrices con adopción del plan.
2. **Badge de conteo**: `N tributaciones en este plan` (estilo `count`: fondo `--accent-soft`, borde `--accent-border`). Se calcula sobre **todo el plan**, no sobre la matriz seleccionada.
3. **Spacer** (`flex: 1`).
4. **Badge de estado** (a la derecha), mutuamente excluyentes:
   - `Adopción vigente` — estilo neutro, cuando hay matriz seleccionada y escritura habilitada.
   - `Solo lectura` — estilo `ro` (gris con borde), cuando faltan capabilities de escritura.
   - `Cargando…` — estilo neutro, durante la carga de la grilla.
   - `N matrices adoptadas` — estilo neutro, en el estado 4b (ninguna matriz seleccionada aún).

**Selector deshabilitado**: cuando el plan no tiene adopciones, el select se renderiza `disabled` con única opción `Sin matrices adoptadas`, y la barra no muestra badges de conteo ni de estado.

**Cambio de matriz**: recarga competencias, niveles y tributaciones. Si había asignatura en mano, **se suelta** (el destino ya no es válido en otra matriz).

---

## 4. `SubjectPanel` (columna izquierda, 290px)

Fondo `--surface-2`, borde derecho. En viewport `< 900px` el grid colapsa a una columna y el aside pasa a borde inferior.

### 4.1 Encabezado y herramientas

- Título: **"Asignaturas del plan"** (uppercase, con borde inferior).
- `SearchInput`: `type=search`, placeholder `Buscar por código o nombre`. Filtra por **código o nombre**, sin distinción de mayúsculas ni acentos.
- `FilterChips`, tres chips excluyentes (radio group), default **`Todas`** activa:
  - `Todas` · `Con tributación` · `Sin tributar`
  - Chip activo: fondo `--accent`, texto blanco, `font-weight: 600`.

> El buscador y los filtros acotan **solo la lista de asignaturas**. No filtran competencias ni ocultan tributaciones ya registradas en la grilla.

### 4.2 `SubjectItem`

Tres filas dentro del item:

1. **row1**: código en monoespaciada (`font-weight: 700`) + badge de conteo.
   - Con tributaciones: badge `count` con `N tributaciones` (singular `1 tributación`).
   - Sin tributaciones: badge `none` con texto `Sin tributar`.
2. **row2**: nombre de la asignatura, `12.5px`, color `--text-2`.
3. **row3** (solo en modo escritura): acción.
   - Estado normal → botón `Tomar para asignar`.
   - Estado en mano → etiqueta **`En mano`** (uppercase, color acento) + botón `Soltar`.

**Item en mano** (`.held`): fondo `--accent-soft` y barra lateral izquierda de 3px en color acento (`box-shadow: inset 3px 0 0`).

**Hover** (solo modo escritura): fondo `#f1f5fb`.

### 4.3 Estado "en mano" (selección lateral)

- Como máximo **una** asignatura en mano a la vez. Tomar otra reemplaza la anterior sin confirmación.
- El estado en mano es efímero, en memoria de la vista; no se persiste ni sobrevive a recarga.
- Se suelta con: `Soltar` en el item, `Soltar asignatura` en la banda, cambio de matriz, o al salir del tab.
- **No hay arrastre**: no existe asa de arrastre ni zona "suelta acá". Asignar y mover son siempre *selección lateral + click en la celda*.

---

## 5. `GridArea` (columna derecha)

### 5.1 `InHandBanner`

Aparece **solo** cuando hay asignatura en mano. Fondo `--accent-soft`, borde inferior `--accent-border`, texto `#255aa8`.

Dos variantes de copy según si la asignatura ya tributa a la competencia visible:

**Variante A — sin tributación previa en la competencia enfocada:**

> Asignatura en mano: **`MAT1101 — Cálculo I`** · pincha **"+ Asignar acá"** en la celda de competencia × nivel donde debe tributar.

**Variante B — la asignatura ya tributa a esa competencia (R-10):**

> Asignatura en mano: **`MAT1101 — Cálculo I`** · ya tributa a **C1.2 Razonamiento cuantitativo** en **Introduce**. Pinchar otra celda de esta competencia **mueve** la tributación, no crea una segunda.

A la derecha de la banda, siempre: botón `Soltar asignatura`.

### 5.2 `CompetencyBlock`

Un bloque por competencia, separados por borde inferior. Las competencias hijas se renderizan como bloques propios con **`padding-left: 40px`** en el header (indentación visual), inmediatamente después de su padre.

**`CompetencyHeader`** contiene:

| Elemento | Detalle |
|---|---|
| `twisty` | Botón cuadrado 20px. `+` cuando `aria-expanded="false"`, `−` cuando `true`. `aria-label`: `Expandir detalle de <id> <nombre>` / `Contraer detalle de <id> <nombre>` |
| `comp-id` | Código en monoespaciada. En una hija: `C4.1 · hija de C4` |
| `comp-name` | Nombre, `14px`, `font-weight: 650` |
| `tag` | Etiqueta de clasificación (ver tabla siguiente) |
| `comp-meta` | Línea gris: `N niveles declarados · N tributaciones`, precedida de la explicación cuando aplica |

**Tags y semántica de destino:**

| Caso | Tag | ¿Recibe tributación? | `comp-meta` |
|---|---|---|---|
| Sin sub-competencias | `Sin hijos` (neutro) | Sí | `3 niveles declarados · 4 tributaciones` |
| Con hijos + holística | `Holística` (violeta `#ece7fa` / `#553a9c`) | Sí | `Tiene 2 sub-competencias, pero es holística: acepta tributación directa · 3 niveles declarados · 1 tributación` |
| Con hijos + no holística | `Consolida — no es destino` (beige `#f0efec` / `#6b6355`) | **No** (R-3) | `Tiene 3 sub-competencias y no es holística: la tributación se registra en sus hijas (R-3)` |

### 5.3 `LevelGrid`

Tabla `table-layout: fixed`, **una columna por nivel declarado por esa competencia**. El número de columnas varía entre competencias: si C1.2 declara 3 niveles muestra 3 columnas y si C2.1 declara 2 muestra 2. Los anchos se reparten en partes iguales (con la última columna absorbiendo el redondeo: `33.33% / 33.33% / 33.34%`).

**Encabezado de columna**: ordinal en monoespaciada gris (`N1`, `N2`, `N3`) + nombre del nivel (`Introduce`, `Reinforce`, `Master`). Los nombres provienen de los niveles de desarrollo de la competencia, no de una lista fija: C4.1 declara `N1 Reinforce` / `N2 Master`.

**`LevelCell` — celda destino válido:**

1. `cell-chips`: una `AlignmentChip` por tributación existente en esa competencia × nivel.
2. Si no hay ninguna: `cell-empty` con texto en itálica **`Sin tributaciones`**.
3. Botón de asignación al pie:
   - Sin asignatura en mano → **no se muestra**.
   - Con asignatura en mano, sin tributación previa en esa competencia → `+ Asignar acá (MAT1101)`, estilo outline punteado en color acento.
   - Con asignatura en mano que **ya tributa a esa competencia** → `+ Asignar acá (mover MAT1101)`, estilo sólido en acento con texto blanco (`.assign.move`).
   - En la **celda donde ya está** la asignatura en mano → no hay botón; el chip correspondiente lleva `outline: 2px solid var(--accent)` y bajo los chips se lee la leyenda `Celda actual de MAT1101`.

**`LevelCell` — celda no destino (competencia que consolida):**

- `td` con fondo rayado diagonal (`repeating-linear-gradient` a 135°).
- Bloque `no-target` con borde punteado y texto:
  > Esta competencia consolida a sus sub-competencias. Asigna en C4.1, C4.2 o C4.3.
  
  Los códigos listados son los de las hijas reales de esa competencia.
- Sin chips, sin botón de asignar, en cualquier modo.

**`AlignmentChip`:**

- Píldora con fondo `--accent-soft`, borde `--accent-border`. Muestra **solo el código** de la asignatura en monoespaciada.
- Botón `×` circular a la derecha, `aria-label`: `Retirar tributación de <código> en <competencia>`.
- El detalle completo va en el `aria-label` del chip, con el formato:
  `Ver detalle de <competencia> en <código>: <contribución>, nivel <nivel>`
- Variante `ro` (solo lectura): fondo neutro, sin botón `×`, padding derecho simétrico.
- El chip **no abre panel ni drawer**; el detalle se consulta expandiendo la tabla de la competencia.

### 5.4 `AlignmentDetailTable`

Se muestra al expandir el `twisty`. Zona con fondo `--surface-2`, borde superior, padding `12px 18px 16px`.

- Título: `Detalle de tributaciones — <id> <nombre>` (uppercase, `11.5px`).
- Tabla sobre fondo blanco con borde.

**Columnas en modo escritura** (en este orden, con estos anchos):

| Columna | Ancho | Contenido |
|---|---|---|
| Código | 110px | Código en monoespaciada |
| Asignatura | auto | Nombre completo |
| Período | 110px | `Semestre N` |
| Cobertura | 190px | `<select>` con **los niveles que declara esa competencia**, el actual seleccionado |
| Contribución | 190px | `<select>` con `Develops` · `Introduces` · `Assesses`, el actual seleccionado |
| (acciones) | 100px | Botón de texto `Retirar` en rojo `--danger`, alineado a la derecha |

`aria-label` de cada select: `Cobertura de <código> en <competencia>` / `Contribución de <código> en <competencia>`.

**Columnas en modo solo lectura**: mismas cinco primeras columnas (Cobertura 170px, Contribución 170px), con los valores como **texto plano**; sin columna de acciones.

**Persistencia inmediata**: cada cambio de Cobertura o Contribución dispara la operación al instante. Al confirmar, toast de éxito bajo la tabla y nota persistente en gris:

> Cada cambio de Cobertura o Contribución persiste al instante. No hay guardado de conjunto.

### 5.5 `GridLegend`

Pie de la zona de grilla, fondo `--surface-2`, borde superior, `11.5px`, color `--text-3` con los rótulos en negrita `--text-2`.

**Modo escritura:**
> **Columnas por competencia:** son los niveles que cada competencia declara (leídos de sus niveles de desarrollo), por eso C1.2 muestra 3 y C2.1 muestra 2. · **Chip:** una por tributación; su "×" retira. · **Sin arrastrar:** asignar y mover se hacen tomando la asignatura en el panel y pinchando "+ Asignar acá".

**Modo solo lectura:**
> En solo lectura: el panel lateral no ofrece "Tomar para asignar", las celdas no muestran "+ Asignar acá" ni el "×" de las fichas, y el detalle muestra Cobertura y Contribución como texto.

---

## 6. Modo solo lectura

Con `competencyalignment:view` y sin `:create` / `:modify` / `:delete`. **La lectura se conserva íntegra**; las acciones mutadoras se renderizan **como ausencia**, nunca deshabilitadas.

| Zona | Diferencia |
|---|---|
| `MatrixBar` | Badge `Solo lectura` en lugar de `Adopción vigente`. Select de matriz sigue operativo |
| `SubjectPanel` | Los items pierden la fila 3 completa: sin `Tomar para asignar`, sin `Soltar`, sin `En mano`. Buscador y filtros siguen activos |
| `InHandBanner` | No existe |
| `LevelCell` | Chips en variante `ro` (sin `×`); sin botón `+ Asignar acá` |
| `AlignmentDetailTable` | Cobertura y Contribución como texto; sin columna `Retirar` |
| `GridLegend` | Texto de solo lectura (§5.5) |

---

## 7. Estados vacíos

Componente `EmptyState`: bloque centrado, padding `64px 24px`, ícono circular 44px sobre fondo neutro, título `15px/650`, párrafo `13px` con `max-width: 520px`.

| # | Situación | Ícono | Título | Cuerpo | Chrome |
|---|---|---|---|---|---|
| **4a** | El plan no tiene adopciones | `▦` | Este plan no ha adoptado ninguna matriz de competencia | La tributación se registra contra una matriz adoptada por el plan. La adopción se gestiona fuera de esta vista. | Tabs + MatrixBar con select `disabled` (`Sin matrices adoptadas`). Sin grilla ni panel |
| **4b** | Hay adopciones, ninguna seleccionada | `↑` | Elige una matriz de competencia arriba para empezar a tributar | La grilla competencia × nivel y el panel de asignaturas se cargan al seleccionar una matriz. | Select con opción inicial `Selecciona una matriz…` + badge `N matrices adoptadas`. Sin grilla ni panel |
| **5a** | La matriz no tiene competencias destino | `⌀` | Esta matriz no tiene competencias que puedan recibir tributación | Todas sus competencias consolidan a sus sub-competencias y ninguna es holística. Revisa la matriz o elige otra. | Reemplaza el cuerpo |
| **5b** | El plan no tiene asignaturas | `▦` | Sin asignaturas no hay nada que tributar | La grilla de competencias se muestra, pero no se puede asignar hasta que el plan tenga asignaturas. | Cuerpo de 2 columnas: panel con su propio vacío (abajo), main con este estado |
| **5c** | Filtro/búsqueda sin resultados | `▦` | La grilla no cambia con el filtro del panel | El buscador y los filtros "Todas / Con tributación / Sin tributar" acotan la lista de asignaturas, no las competencias ni las tributaciones ya registradas. | Panel con su propio vacío (abajo), main con este estado |

**Vacíos internos del panel** (formato distinto: centrado, `12.5px`, título en negrita `13px`):

- **Sin asignaturas** (5b): ícono `▤`, título **`Este plan no tiene asignaturas`**, cuerpo `Agrega asignaturas al plan para poder tributarlas a las competencias.` El buscador queda `disabled`; los chips de filtro se mantienen visibles.
- **Sin coincidencias** (5c): sin ícono, título **`Ninguna asignatura coincide`**, cuerpo `Ninguna asignatura sin tributar coincide con "<término>". Ajusta la búsqueda o cambia el filtro.` El texto nombra el filtro activo y el término buscado; buscador y chips quedan operativos.

---

## 8. Carga

Mientras se resuelven competencias, niveles y tributaciones de la matriz seleccionada:

- `MatrixBar` visible con el select ya poblado; badge de estado = `Cargando…`.
- **Panel**: encabezado y chips de filtro visibles, buscador `disabled`, y cuatro pares de barras esqueleto (`w60/w80`, `w40/w60`, `w60/w80`, `w25/w60`) con separación de 16px entre pares.
- **Main**: por cada competencia simulada, una barra de título (`height: 20px`, ancho variable) y una grilla de rectángulos de 62px con `gap: 12px`, con tantas columnas como niveles (3, 2, 3 en la maqueta).
- Los esqueletos usan gradiente horizontal `#eceef1 → #f5f6f8 → #eceef1`, `border-radius: 4px`.

---

## 9. Errores

### 9.1 Error de carga de la grilla (7a)

`EmptyState` en variante `error`: ícono `!` sobre fondo `#fdecec` en rojo, título en `--danger`.

> **No se pudo cargar la tributación de esta matriz**
> Ocurrió un problema al obtener las competencias y sus tributaciones. Vuelve a intentar; si persiste, informa a soporte.

Acción: botón primario **`Volver a intentar`**.

### 9.2 Rechazos server-side de una operación (7b)

Todos se muestran como `inline-err` (fondo `#fdecec`, borde `#f0c2c2`, texto `#8e1c22`, `12.5px`), **junto a la zona donde ocurrió la operación**. Regla común: **el estado previo se conserva; nada queda a medias.**

| Código | Situación | Texto exacto |
|---|---|---|
| **R-1** | Sin adopción vigente de la matriz | La operación no se aplicó: el plan no tiene adopción vigente de esta matriz de competencia. Actualiza la vista y verifica la adopción del plan. |
| **R-2** | El par asignatura + competencia ya existe | `<código>` ya tributa a "`<competencia>`". Una asignatura puede tributar una sola vez a la misma competencia: mueve la tributación existente en lugar de crear otra. |
| **R-3a** | Destino inválido — consolida | "`<competencia>`" no puede recibir tributación: consolida a sus sub-competencias. Asigna en una de sus sub-competencias. |
| **R-3b** | Destino inválido — matriz mal configurada | La competencia destino está mal configurada: no tiene sub-competencias y no está marcada como holística. Corrige la matriz antes de tributar a este nodo. |
| **R-4** | Nivel no declarado | "`<competencia>`" no declara el nivel "`<nivel>`". Elige uno de los niveles que la competencia declara: `<lista de niveles declarados>`. |
| **R-5** | Contribución inválida | El tipo de contribución indicado no es válido. Valores aceptados: Develops, Introduces, Assesses. Si no se indica, se aplica Develops. |
| — | Sin permiso | No tienes permiso para modificar la tributación de este plan. La vista queda en solo lectura. |

Tras el rechazo por permiso, la vista **transiciona a solo lectura** (§6).

### 9.3 Fallo de red o del servidor en operación puntual

`Toast` en variante error (fondo `#8e1c22`, punto `#ffb4b4`):

> No se pudo guardar el cambio. La tributación quedó como estaba.

Acompañado de botón `Volver a intentar` que reintenta **esa operación**, no la vista completa.

### 9.4 Toasts de éxito

Píldora oscura (`#1f2733`), punto verde `#5ad18a`, `12.5px`. Ejemplos exactos de la maqueta:

- `Contribución de ICI2301 actualizada`
- `MAT1101 movida a Reinforce en Razonamiento cuantitativo`

---

## 10. Interacciones y reglas de negocio

### 10.1 Asignar

1. Click en `Tomar para asignar` de un `SubjectItem` → esa asignatura queda **en mano**; aparece `InHandBanner` y los botones `+ Asignar acá` en todas las celdas destino válidas.
2. Click en `+ Asignar acá (<código>)` en una celda → **crea** la tributación de inmediato (una operación, un request).
3. Al confirmar: aparece el chip en la celda, sube el contador del `SubjectItem` y el badge del plan, toast de éxito.
4. La asignatura **sigue en mano** tras asignar, para permitir tributar a varias competencias seguidas.

### 10.2 Mover (R-10)

Cuando la asignatura en mano **ya tributa a la competencia**:

- El botón de las demás celdas de esa competencia cambia a `+ Asignar acá (mover <código>)` en estilo sólido.
- La celda actual no ofrece botón; el chip queda con `outline` de acento y leyenda `Celda actual de <código>`.
- Al pinchar otra celda de esa competencia, la fila existente **se actualiza**: conserva su id, cambia su nivel y/o competencia destino.
- **No** queda una segunda tributación en esa competencia, ni sobrevive la anterior.
- El contador del panel **no cambia** (sigue en el mismo número de tributaciones).
- Toast: `<código> movida a <nivel> en <competencia>`.

> Consecuencia: si el usuario intenta crear una segunda tributación al mismo par asignatura+competencia por otra vía, el servidor responde R-2. La UI evita ese camino ofreciendo mover.

### 10.3 Editar Cobertura / Contribución

- Solo desde la `AlignmentDetailTable` de la competencia expandida.
- `Cobertura` lista **los niveles declarados por esa competencia** (no un catálogo global) → un valor fuera de esa lista produce R-4.
- `Contribución` lista `Develops` · `Introduces` · `Assesses`. Default cuando no se indica: **`Develops`**.
- Cada `change` persiste al instante y emite toast. **No hay guardado de conjunto.**
- Cambiar la Cobertura desde la tabla mueve el chip a la columna correspondiente en la grilla de arriba.

### 10.4 Retirar

Dos puntos de entrada, mismo efecto: `×` del chip en la celda, y `Retirar` de la fila en la tabla de detalle.

Ambos abren el diálogo de confirmación:

- Título: **`Retirar tributación`**
- Cuerpo: `Se retirará la tributación de **<código> — <nombre>** a **<id> <competencia>**, nivel **<nivel>**. La acción se aplica de inmediato.`
- Botones alineados a la derecha: `Cancelar` (secundario) · `Retirar` (primario en color `--danger`).
- Contenedor: `max-width: 520px`, borde, radio 6px, sombra `0 2px 10px rgba(31,39,51,.08)`.

Tras el retiro: baja el contador del `SubjectItem` (`2 tributaciones` → `1 tributación`); si llega a cero, el badge pasa a `none` con texto `Sin tributar`.

### 10.5 Expandir / contraer competencia

- El `twisty` alterna `aria-expanded` y el glifo `+` / `−`.
- Expandido muestra la `AlignmentDetailTable` bajo la grilla de esa competencia.
- Varias competencias pueden estar expandidas simultáneamente.
- El estado de expansión es local a la vista; no se persiste.

---

## 11. Ausencias deliberadas (verificar que NO existan)

Estas exclusiones se renderizan **como ausencia**: el elemento no aparece, ni siquiera deshabilitado.

- Sin barra global **"Guardar / Descartar"** ni aviso de "cambios sin guardar". Cada operación persiste al instante.
- Sin columna **"Peso"** / `contributionPercentage` en la tabla de detalle, ni campo de porcentaje en ninguna zona.
- Sin vía masiva **"Varias"** ni selección múltiple de celdas.
- Sin badge ni indicador **"SIN EVALUADOR"**.
- Sin panel ni drawer de detalle por tributación: el chip no abre una zona aparte; el detalle y la edición viven en la tabla expandible de la competencia.
- Sin arrastre: no hay asa de arrastre ni zona "suelta acá".
- Sin gestión de adopción ("Eximir", "Cerrar", "Planes que adoptan") ni panel de Medición.

---

## 12. Deuda explícita registrada

**Retiro sin aviso de dependencias.** El retiro implementado en este ticket es un borrado simple: el diálogo no nombra dependencias. Al entrar el ticket de `outcomeAlignment`, ese diálogo debe ganar el aviso **R-7**: listar los resultados de aprendizaje dependientes antes de borrar. **El flujo de retiro no se considera definitivo sin esa salvaguarda.**

---

## 13. Inventario de literales visibles

Textos exigidos, para verificación literal:

| Contexto | Literal |
|---|---|
| Tab | `Tributación` |
| Panel | `Asignaturas del plan` |
| Buscador | `Buscar por código o nombre` |
| Filtros | `Todas` · `Con tributación` · `Sin tributar` |
| Acción de item | `Tomar para asignar` · `Soltar` · `En mano` |
| Banda | `Soltar asignatura` |
| Celda | `+ Asignar acá` (y su variante `(mover <código>)`) |
| Celda vacía | `Sin tributaciones` |
| Badges de asignatura | `N tributaciones` / `1 tributación` / `Sin tributar` |
| Badge de plan | `N tributaciones en este plan` |
| Badges de estado | `Adopción vigente` · `Solo lectura` · `Cargando…` · `N matrices adoptadas` |
| Tags de competencia | `Sin hijos` · `Holística` · `Consolida — no es destino` |
| Meta de competencia | `N niveles declarados · N tributaciones` |
| Columnas del detalle | `Código` · `Asignatura` · `Período` · `Cobertura` · `Contribución` |
| Acción de fila | `Retirar` |
| Vacío 4a | `Este plan no ha adoptado ninguna matriz de competencia` |
| Vacío 4b | `Elige una matriz de competencia arriba para empezar a tributar` |
| Select sin adopciones | `Sin matrices adoptadas` |
| Select sin selección | `Selecciona una matriz…` |
| Reintento | `Volver a intentar` |
| Diálogo | `Retirar tributación` · `Cancelar` · `Retirar` |

**`aria-label` normalizados:**

| Elemento | Formato |
|---|---|
| Chip (detalle) | `Ver detalle de <competencia> en <código>: <contribución>, nivel <nivel>` |
| Chip `×` | `Retirar tributación de <código> en <competencia>` |
| Twisty | `Expandir detalle de <id> <nombre>` / `Contraer detalle de <id> <nombre>` |
| Select Cobertura | `Cobertura de <código> en <competencia>` |
| Select Contribución | `Contribución de <código> en <competencia>` |

---

## 14. Tokens visuales

```css
--bg:#f5f6f8;          --surface:#ffffff;      --surface-2:#fafbfc;
--border:#dfe3e8;      --border-strong:#c3cad3;
--text:#1f2733;        --text-2:#5a6675;       --text-3:#8b96a5;
--accent:#2f6fd0;      --accent-soft:#e8f0fb;  --accent-border:#b7cef0;
--danger:#b4232a;      --neutral-bg:#eef0f3;
--radius:6px;
--mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

Base tipográfica: `14px/1.5`, stack de sistema. Ancho máximo de la vista: `1400px`. Altura mínima del cuerpo: `520px`. Breakpoint único en `900px` (colapso a una columna).

---

## 15. Trazabilidad a requerimientos

| Zona / comportamiento | REQ |
|---|---|
| Vista completa con escritura | REQ-11, REQ-12, REQ-13, REQ-16, REQ-17, REQ-18, REQ-19 |
| Movimiento por R-10 | REQ-08, REQ-17 |
| Solo lectura | REQ-14, REQ-02 |
| Estados vacíos del selector | REQ-11, REQ-12 |
| Vacíos internos y carga | REQ-13, REQ-16 |
| Rechazos server-side | REQ-03, REQ-04, REQ-05, REQ-06, REQ-07 |
| Retiro de tributación | REQ-10 |