# TICKET-149 — Guía de implementación de UI

**Módulo:** `curriculum-mapping` (cm) · **DS:** up1 · **Fuente:** maqueta HTML aprobada (preview de verificación)

Esta guía es fiel a la maqueta aprobada. Todo texto visible se transcribe literal. Los nombres `kn-delta-*` del preview son andamiaje de verificación: **no** se implementan con esos nombres; cada delta se implementa con el nombre de componente indicado en la sección 7.

---

## 0. Reglas base que atraviesan toda la implementación

| Regla | Qué significa en la UI |
|---|---|
| REQ-15 | Se **extiende** `modsComponents/CompetencyAlignmentGrid/` (`CompetencyAlignmentGridTable`, `CompetencyAlignmentDetailModal`, `PlanSubjectsPanel`). Prohibido crear componentes paralelos (`CompetencyLevelGrid`, `DetailSidePanel`, panel lateral de detalle). |
| REQ-16 | El **único** mecanismo de asignación es: seleccionar en el panel lateral (queda "en mano") + click en "+ Asignar acá". **Sin drag and drop**: ninguna tabla, card ni chip declara `draggable`, `dragstart`, `dragover` ni `drop`. Tampoco hay equivalente por teclado del arrastre. |
| REQ-14 | La pestaña de solo lectura **no monta** panel de selección ni ningún componente del editor. |
| REQ-10 | La pestaña de solo lectura **no muestra selector de asignatura** en ninguno de sus dos modos. El selector pertenece solo al editor. |
| REQ-11 | Los dos modos del editor (por competencia / por malla) producen el **mismo payload de batch**. |
| M-26 | La vista por malla **no importa** `CurriculumMesh` de curriculum-design. Se redibuja en cm con `planEntry.period` / `planEntry.position` que ya trae `alignmentView.resolver.js`. |
| Dark mode | Clase `theme-dark` en `<html>` (nunca `[data-theme]` ni `.dark`) + `color-scheme`. Todos los tokens se redefinen. |
| Foco visible | `--up1-focus-ring` en **todo** control accionable, incluido el destino "+ Asignar acá". |

Formato numérico de pesos: display con coma decimal y 2 decimales más sufijo `%` separado por espacio → `60,00 %`. En inputs de edición el valor se escribe con punto (`33.33`, `60`, `105.456`) y el `%` va en el sufijo adosado, fuera del input.

---

## 1. Tokens y componentes del DS usados

Ningún token nuevo se inventa fuera de lo listado en la sección 7 (delta).

**Paleta usada**

| Token | Uso |
|---|---|
| `--up1-color-primary-500` | Botón primario (Guardar, Tributar); borde de input en foco |
| `--up1-color-primary-600` | Hover de primario; `--up1-text-link` |
| `--up1-color-primary-700` | Pestaña activa; texto del slot de destino |
| `--up1-color-primary-50` / `--up1-color-primary-light` | Fondo del elemento en mano y del slot activo |
| `--up1-color-primary-300` | Borde del destino disponible |
| `--up1-color-primary-800` / `-900` | Seleccionado en dark mode / texto sobre tinte primario |
| Escala neutra `0…950` | Superficies, bordes, texto secundario |
| `--up1-color-success` / `warning` / `danger` / `info` | Indicador de suma del grupo, errores de peso, resultado parcial de vía masiva |
| `--up1-badge-type-*` | Única vía declarada por el DS para color de `Badge` (`customColor`) |

**Tipografía:** `--up1-font-family-base` (Inter). xl = título de vista · lg = encabezado de modal · md = título de sección · base = cuerpo · sm = celdas de tabla · xs = glosas, contadores, códigos.

**Componentes DS reutilizados:** `Button` (primary / secondary / ghost / danger-ghost / sm / disabled), `Badge` (neutral / primary / success / warning / danger), `SegmentedControl` (con ítems `disabled`), `Tabs`, `Input`, `Select`, `Checkbox`, `Card`, `Table`, `Modal` (`@molecules/Modal` con `v-model:open`), `Alert` (info / success / warning / danger), `EmptyState`, `Skeleton`.

**Patrones transversales obligatorios**

| Patrón | Dónde aplica |
|---|---|
| Estado vacío | Matriz sin competencias adoptadas; plan sin asignaturas por período; vía masiva sin candidatas |
| Estado de error | Peso inválido por fila (REQ-03); fallo del batch transaccional (todo o nada, REQ-01) |
| Loading | `Skeleton` mientras carga `alignmentView.resolver.js` y mientras el batch está en vuelo |
| Foco visible | `--up1-focus-ring` en todo control accionable |
| Dark mode | `theme-dark` en `<html>` |

---

## 2. Vista 1 — Pestaña "Tributación" del plan (solo lectura)

**REQ-10 · REQ-14 (a) · alcance 6 del request**

### Jerarquía

```
Tabs del plan  [Estructura] [Tributación*] [Indicadores]
└─ Barra de acciones (fila única)
   ├─ SegmentedControl "Modo de vista": [Por asignatura] [Por competencia]
   ├─ Texto xs muted: "Matriz: Matriz de Egreso 2024"   (solo modo Por asignatura)
   ├─ spacer
   └─ Button primary: "Tributar"
└─ Glosa xs muted (solo modo Por asignatura):
   "Sin selector de asignatura: la lista completa se muestra en la tabla. El selector pertenece
    solo al editor (REQ-10)."
└─ Table
```

La barra de acciones va **fuera** de la grilla: el botón "Tributar" no se mezcla con la tabla. **No se renderiza selector de asignatura en ninguno de los dos modos.**

### Caso A — modo "Por asignatura"

Tabla con columnas y anchos: `Asignatura 26%` · `Competencia` · `Nivel 13%` · `Tipo 16%` · `Peso 10%`.

- Celda Asignatura: `<strong>CÓDIGO</strong>` en la primera línea, nombre en xs muted en la segunda.
- Celda Nivel: chip de nivel (I/R/M) + etiqueta textual ("Introduce", "Reinforce", "Master").
- Celda Tipo: chip de tipo (D/E/A) + etiqueta textual ("Desarrolla", "Evalúa", "Ambas").
- Celda Peso: `60,00 %`, o `—` en muted cuando la fila no pesa.

Filas de la maqueta (usar tal cual como fixture de referencia visual):

| Asignatura | Competencia | Nivel | Tipo | Peso |
|---|---|---|---|---|
| MAT-1201 / Cálculo I | Razonamiento cuantitativo | I Introduce | D Desarrolla | — |
| ING-2310 / Diseño de Procesos | Razonamiento cuantitativo | R Reinforce | E Evalúa | 60,00 % |
| ING-3450 / Proyecto Integrador | Razonamiento cuantitativo | R Reinforce | A Ambas | 40,00 % |
| FIL-1100 / Ética Profesional | Compromiso ético | M Master | E Evalúa | 100,00 % |

### Caso B — modo "Por competencia"

Mismo encabezado (segmentado + "Tributar"), sin la línea de matriz ni la glosa. Tabla pivote: `Competencia 24%` · `Introduce` · `Reinforce` · `Master`.

- Celda de competencia: nombre en `<strong>` + sigla en xs muted (`RC`, `CE`).
- Celda de nivel: pila vertical (`gap: space-1`, `min-width: 168px`) de chips de tributación. Cada chip: `CÓDIGO` + chip de tipo + `Badge` neutral con el peso cuando existe.
- Celda sin tributaciones: texto xs muted **"Sin tributación"**.
- **Fila fuera de diseño:** el chip se pinta con `border-color: var(--up1-color-warning)` y `background: var(--up1-color-warning-light)`, y lleva `Badge warning` con el texto **"Fuera de diseño"**. Se marca, **no se borra** (R-12); el batch del editor tampoco la retira (REQ-02).
- Bajo la tabla, `Alert warning`:
  > La tributación de **HIS-2200** quedó fuera del diseño vigente del plan. Se conserva y se marca; el guardado del editor no la retira (R-12 / REQ-02).

### Caso C — estados

Tres columnas iguales:

- **Vacío** — `EmptyState`: título "Este plan todavía no tiene tributaciones"; cuerpo xs "Abrí el editor para asociar asignaturas a las competencias de la matriz."; debajo, `Button primary` "Tributar".
- **Loading** — 4 `Skeleton`: uno de 45% de ancho (título) y tres de 28px de alto (el último al 80%).
- **Error** — `Alert danger`: "No se pudo cargar la tributación del plan. Reintentá en unos instantes." + `Button secondary sm` "Reintentar".

---

## 3. Vista 2 — Editor de tributación, modo "Por competencia"

**REQ-11 · REQ-13 · REQ-14 (b) · REQ-16 · REQ-01**

Pantalla que abre "Tributar". Composición: `PlanSubjectsPanel` (izquierda) + `CompetencyAlignmentGridTable` (derecha) + `CompetencyAlignmentDetailModal` (al click en un chip).

### Jerarquía

```
Editor
├─ SessionBar  (delta · patrón)
│  ├─ Título semibold: "Tributación · Ingeniería Civil Industrial 2024"
│  ├─ Subtítulo xs muted: "Matriz de Egreso 2024"
│  ├─ spacer
│  ├─ Badge de estado de cambios
│  ├─ Button secondary "Descartar"
│  └─ Button primary  "Guardar"
├─ Fila de modo
│  ├─ SegmentedControl "Modo del editor": [Por competencia] [Por malla]
│  ├─ spacer
│  └─ Alert info xs (solo si no hay nada en mano)
└─ Grilla 252px / 1fr  (colapsa a 1 columna bajo 900px)
   ├─ aside  PlanSubjectsPanel
   └─ main   CompetencyAlignmentGridTable
```

Layout: `grid-template-columns: 252px 1fr`. El `aside` lleva borde derecho; bajo 900px pasa a una columna y el borde se muda a `border-bottom`.

### Panel lateral — "Asignaturas del plan"

Orden vertical, `gap: space-3`:

1. Título de panel (xs, bold, uppercase, letter-spacing .05em): **"Asignaturas del plan"**.
2. `InHandPanelCard` — **solo cuando hay algo en mano** (ver 3.2).
3. `Input` con placeholder **"Buscar asignatura"**.
4. Lista de ítems.
5. Glosa xs muted — **solo cuando no hay nada en mano**: "Elegí una asignatura: queda en mano y se asigna con un click en el destino."

Cada ítem de la lista es un `<button type="button">` de ancho completo con `aria-pressed`, que muestra el código en xs muted seguido del nombre. Estado seleccionado (`aria-pressed="true"`): fondo `--up1-color-primary-light`, borde `--up1-color-primary-300`, texto `--up1-color-primary-900`, peso semibold.

Ítems de la maqueta: MAT-1201 Cálculo I · FIS-1300 Física General · ING-2310 Diseño de Procesos · ING-3450 Proyecto Integrador · FIL-1100 Ética Profesional.

### 3.1 Caso A — sin nada en mano

- SessionBar: `Badge` neutral **"Sin cambios"**; "Descartar" y "Guardar" **disabled**.
- A la derecha de la fila de modo, `Alert info` en tamaño xs con padding reducido:
  > Seleccioná una asignatura del panel para poder asignarla.
- Cada celda válida muestra el `AssignSlot` en **estado atenuado**: `aria-disabled="true"`, opacidad .55, color muted, fondo transparente, borde discontinuo neutro, cursor `not-allowed`. No es accionable.
- Tabla del editor: `Competencia 22%` · `Introduce` · `Reinforce` · `Master`.
- La celda de competencia incluye, además del nombre, el `BulkEntryButton` **"Varias"** (`Button secondary sm` con borde discontinuo) debajo del título, con `margin-top: space-2`.
- Nivel que la competencia **no declara**: la celda muestra solo texto xs muted **"La competencia no declara este nivel"** y **ningún** AssignSlot.
- Bajo "Compromiso ético", glosa xs muted: "Solo declara Reinforce y Master".
- El chip "Fuera de diseño" de HIS-2200 aparece también en el editor, con el mismo tratamiento warning.

### 3.2 Caso B — con una asignatura en mano

- Panel: aparece el `InHandPanelCard` sobre el buscador.
  - Fondo `--up1-color-primary-light`, borde `--up1-color-primary-300`, radio md, padding space-3, `display: grid; gap: space-2`.
  - Kicker (10px, bold, uppercase, letter-spacing .06em, color primary-700): **"En mano"**.
  - Chip semibold color primary-900: `ING-2310 · Diseño de Procesos`, con botón "×" alineado a la derecha, `aria-label="Soltar elemento"`.
  - En este modo **no** lleva selector de nivel.
- La glosa "Elegí una asignatura…" desaparece.
- El ítem correspondiente de la lista queda con `aria-pressed="true"`. Un click sobre el ítem ya elegido **lo suelta** (equivalente a la "×").
- Todos los `AssignSlot` de destinos válidos pasan a **estado activo**: fondo `--up1-color-primary-light`, borde discontinuo `--up1-color-primary-300`, texto primary-700, `cursor: pointer`, hover a `--up1-color-primary-100`, foco con `--up1-focus-ring`.
- Chips ya asignados de la asignatura en mano se resaltan con `border-color: var(--up1-color-primary-300)`.
- SessionBar: `Badge warning` **"3 cambios sin guardar"** (plural dinámico: "1 cambio sin guardar"); "Descartar" y "Guardar" habilitados.
- La `Alert info` de la fila de modo desaparece.

### 3.3 Interacción de asignación (REQ-16)

| Paso | Efecto |
|---|---|
| Click en ítem del panel | El elemento queda **en mano**; se monta `InHandPanelCard`; todos los destinos válidos activan su `AssignSlot` |
| Click en el mismo ítem, o en la "×" | Se suelta; los slots vuelven a atenuado |
| Click en "+ Asignar acá" | Se agrega la tributación al modelo local (no persiste aún); el contador de la SessionBar sube |
| Click en un chip de tributación | Abre `CompetencyAlignmentDetailModal` |
| Click en "Varias" | Abre el modal de vía masiva (vista 5) con el destino precargado |

El elemento **permanece en mano** después de asignar, para poder asignarlo a varios destinos seguidos.

### 3.4 Caso C — estados del guardado en conjunto (REQ-01, REQ-02)

El batch reemplaza el conjunto de `(planId, matriz)` en **una** transacción, con **una sola** entrada de historial. Si una fila falla R-1..R-5/R-10, **no se guarda nada**.

- **Guardando (loading):** SessionBar con `Skeleton` de 220px en lugar del título, `Badge` neutral "Guardando la matriz…", ambos botones disabled.
- **Guardado correcto:** `Alert success`:
  > Se guardó la tributación de **Matriz de Egreso 2024**: 3 altas, 1 modificación, 1 retiro. Quedó una sola entrada en el historial del plan.
- **Error del batch:** `Alert danger` en bloque, con encabezado y lista de filas culpables:
  > **No se guardó ningún cambio.** La transacción se revirtió completa por estas filas:
  > - ING-3450 · Razonamiento cuantitativo · Reinforce — el peso 105 está fuera del rango permitido (0 a 100).
  > - FIS-1300 · Compromiso ético · Introduce — la competencia no declara el nivel Introduce.

  Formato de cada ítem: `<código> · <competencia> · <nivel> — <motivo>`.
- **Alcance del retiro:** `Alert info`:
  > El guardado solo afecta a las competencias de **Matriz de Egreso 2024**. No toca las tributaciones de otras matrices adoptadas por el plan ni las marcadas como fuera de diseño (REQ-02).

### 3.5 Caso D — estados vacíos del editor

Dos `Card` en grilla de dos columnas, cada una con `EmptyState`:

- Panel de selección sin asignaturas → "El plan no tiene asignaturas" / "Agregá asignaturas al plan antes de tributar."
- Matriz sin competencias → "La matriz adoptada no tiene competencias" / "No hay destinos donde asignar."

---

## 4. Vista 3 — Editor de tributación, modo "Por malla"

**REQ-08 · REQ-11 · REQ-13 · REQ-16 · REQ-17 · alcance 5 del request**

Espejo exacto del modo por competencia, con los roles invertidos: el panel lateral lista **competencias** y lo que queda en mano es una **competencia**; las asignaturas del plan son los destinos.

### Jerarquía

```
Editor
├─ SessionBar  (idéntica a vista 2)
├─ Fila de modo: SegmentedControl [Por competencia] [Por malla*] + Alert info si nada en mano
└─ Grilla 252px / 1fr
   ├─ aside  "Competencias de la matriz"
   └─ main   Tablero por período (MeshBoard)
```

### Panel lateral — "Competencias de la matriz"

1. Título de panel: **"Competencias de la matriz"**.
2. `InHandPanelCard` cuando hay competencia en mano (ver abajo).
3. Lista de ítems: `RC` Razonamiento cuantitativo · `CE` Compromiso ético · `CO` Comunicación efectiva. Mismo botón con `aria-pressed` que en vista 2. **No lleva buscador.**
4. Glosa xs muted, solo sin nada en mano: "Elegí una competencia: queda en mano junto con el nivel con que se va a asignar."

**InHandPanelCard en este modo (REQ-17)** — además del kicker "En mano", el chip `CE · Compromiso ético` y la "×" (`aria-label="Soltar competencia"`), incluye un bloque con:

- `Label`: **"Nivel de desarrollo con que se va a asignar"**
- `Select` limitado a los niveles que la competencia declara (en el ejemplo: Reinforce, Master).

### Tablero por período (MeshBoard)

- Contenedor `display: flex; gap: space-3; overflow-x: auto; padding-bottom: space-2`. **Scroll horizontal**, nunca wrap.
- Columna: `flex: 0 0 236px`, `display: grid; gap: space-2; align-content: start`.
- Encabezado de columna: xs, bold, uppercase, letter-spacing .05em, color secundario, con `border-bottom: 2px solid var(--up1-border-color)`. Texto: **"Período N"**.
- Solo se dibujan los períodos que existen en `planEntry` (la maqueta salta del 2 al 5 y al 8).
- Dentro de cada columna, las asignaturas se ordenan por `position`.
- Glosa xs muted bajo el tablero (Caso A): "Columnas por período con scroll horizontal; dentro de cada columna, las asignaturas van ordenadas por `position`."

**SubjectCard** (`display: grid; gap: space-2`, padding space-3, radio lg, **borde discontinuo** `--up1-border-color-strong`):

1. Código, xs muted.
2. Nombre, sm semibold.
3. Lista de chips de tributación (`gap: space-1`), o texto xs muted **"Sin tributaciones"** si no tiene. Cada chip: sigla de competencia + chip de nivel + chip de tipo + `Badge` de peso si aplica.
4. Confirmación efímera, cuando corresponde (ver abajo).
5. Pie (`display: flex; gap: space-2`): `AssignSlot` "+ Asignar acá" + `BulkEntryButton` "Varias".

### 4.1 Caso A — sin competencia en mano

- `Alert info` a la derecha de la fila de modo: **"Seleccioná una competencia del panel para poder asignarla."**
- Todos los `AssignSlot` en estado atenuado (`aria-disabled="true"`).
- No hay SessionBar visible en esta captura (el editor aún no tiene cambios); cuando aparezca, se comporta igual que en vista 2.

### 4.2 Caso B — competencia en mano y confirmación tras asignar

- SessionBar con `Badge warning` **"1 cambio sin guardar"** y botones habilitados. En esta vista la SessionBar muestra solo el título, sin subtítulo de matriz.
- Panel con `InHandPanelCard` + selector de nivel; el ítem `CE` con `aria-pressed="true"`.
- Todos los `AssignSlot` activos.
- **Card recién asignada** (FIS-1300 en la maqueta):
  - La card cambia a `border-style: solid` con `border-color: var(--up1-color-primary-300)`.
  - El chip nuevo se pinta con `border-color: var(--up1-color-primary-300)` y `background: var(--up1-color-primary-light)`.
  - Debajo de los chips aparece la confirmación efímera: fondo `--up1-color-success-light`, color `--up1-color-success`, radio sm, xs medium, texto **"✓ Tributación agregada"**.

### 4.3 Caso C — estados

- **Vacío** — `EmptyState`: "El plan no tiene asignaturas por período" / "Sin entradas de plan no hay cards que dibujar."
- **Loading** — tablero con dos columnas de skeletons: cada una con un skeleton de título al 60% y uno o dos bloques de 66px de alto.
- **Error al asignar** — `Alert danger`:
  > **FIS-1300** ya tributa a Compromiso ético en Reinforce. No se agregó una segunda vez.

---

## 5. Vista 4 — `CompetencyAlignmentDetailModal`

**REQ-09 · REQ-05 · REQ-06 · REQ-03 · REQ-04**

Se **extiende el modal ya existente** sobre `@molecules/Modal` con `v-model:open`. No se rediseña, no se crea panel lateral de detalle, y "Repartir en partes iguales" vive **dentro** del modal (REQ-05).

Estructura común (`max-width: 520px`):

```
Modal
├─ header
│  ├─ lg semibold: "<CÓDIGO> · <Nombre asignatura>"
│  └─ xs muted:    "tributa a <Competencia>"
├─ body   (display: grid; gap: space-4)
└─ footer (bg subtle, flex con spacer)
```

### 5.1 Caso A — solo lectura

Body con tres bloques `Label` + valor en texto plano:

- "Nivel de desarrollo" → `Reinforce`
- "Tipo de contribución" → `Evalúa`, con help debajo: "La mide y genera evidencia de logro"
- "Matriz de competencia" → `Matriz de Egreso 2024`

Nivel y tipo se muestran **como texto**, no como segmentado.

Footer: `Button ghost` **"Editar en tributación"** (izquierda) · spacer · `Button primary` **"Listo"** (derecha).

### 5.2 Caso B — edición, fila que pesa

Body:

1. **Nivel de desarrollo** — `SegmentedControl` [Introduce] [Reinforce*] [Master]. Los niveles que la competencia **no declara** van `disabled`. Help debajo cuando hay alguno deshabilitado: "La competencia no declara el nivel Master."
2. **Tipo de contribución** — `SegmentedControl` [Desarrolla] [Evalúa*] [Ambas]. Help con la glosa del tipo seleccionado:
   - Desarrolla → "La forma, pero no la mide"
   - Evalúa → "La mide y genera evidencia de logro"
   - Ambas → (glosa correspondiente del catálogo)
3. **`AlignmentWeightField`** (delta) — ver 5.4.

Footer: `Button danger-ghost` **"Retirar tributación"** (izquierda) · spacer · `Button primary` **"Listo"**.

### 5.3 Caso C — edición, tipo "Desarrolla": no pesa (R-6 / REQ-04)

Solo **Evalúa** y **Ambas** admiten peso. Con **Desarrolla** el `AlignmentWeightField` conserva su título ("Peso dentro de Introduce") pero **no renderiza input, ni badge, ni botón de reparto**; en su lugar muestra un hint muted:

> Las tributaciones de tipo Desarrolla no llevan peso. Cambiá el tipo a Evalúa o Ambas para asignarlo.

El valor persistido queda en `null`.

### 5.4 `AlignmentWeightField` — anatomía y estados

Anatomía (contenedor con borde, radio md, padding space-3, `display: grid; gap: space-2`):

```
head:  título sm semibold "Peso dentro de <nivel>"   [Badge de modo de reparto]
row:   [Input alineado a la derecha][sufijo "%"]   [Button ghost sm "Repartir en partes iguales"]
hint:  "<N> evalúa · suma <S>%"
```

- El **control** (`max-width: 148px`) es input + sufijo adosado: el input pierde los radios derechos y el sufijo lleva fondo subtle, borde `--up1-border-color-strong` sin borde izquierdo y radios md a la derecha.
- El input lleva `inputmode="decimal"` y `aria-label="Peso dentro de <nivel>"`.
- El badge de modo es **derivado** de los pesos actuales, **no persistido** (REQ-06): `Badge success` "Reparto automático" cuando el reparto coincide con el equitativo; `Badge` neutral "Reparto manual" en caso contrario.
- "Repartir en partes iguales" es **client-side** (`weights.ts`, G-6).

Matriz de estados:

| Estado | Badge | Valor | Hint | Clase de hint |
|---|---|---|---|---|
| Automático, suma 100 | success "Reparto automático" | `33.33` | "3 evalúa · suma 100%" | ok (success) |
| Manual, suma 100 | neutral "Reparto manual" | `60` | "2 evalúa · suma 100%" | ok |
| Manual, suma corta | neutral "Reparto manual" | `40` | "2 evalúa · suma 70% (faltan 30%)" | warn |
| Manual, suma excedida | neutral "Reparto manual" | `80` | "2 evalúa · suma 120% (se excede en 20%)" | warn |
| Valor inválido (REQ-03) | sin badge | `105.456`, input `--invalid` + `aria-invalid="true"`, sin botón de reparto | "El peso debe estar entre 0 y 100, con hasta 2 decimales." | err (danger) |
| Grupo de una sola fila | success "Reparto automático" | `100` | "1 evalúa · suma 100%" | ok |

En el estado automático, nota xs muted adicional: "El residuo se ajusta para que la suma dé 100 con 2 decimales (33,33 / 33,33 / 33,34)."

Al pie del panel de estados, `Alert info`:
> La validación de "suma 100 al publicar el plan" (D1) es cross-mod hacia curriculum-design y queda **fuera de alcance** de este ticket: acá el desvío se informa, no bloquea el guardado.

El desvío de suma **no bloquea** el guardado. El valor inválido de fila (REQ-03) **sí** hace fallar el batch completo.

---

## 6. Vista 5 — Vía masiva (acción "Varias")

**REQ-07 · alcance 4 del request · AD-12**

Camino aparte del mecanismo individual de REQ-16. Aplica un destino (nivel + tipo) a varias asignaturas en **una sola transacción**, con el trabajo **troceado en el backend** (patrón `matrixAdoption`), y devuelve el detalle de las aplicadas y de las **salteadas con su motivo**. Se abre desde "Varias" de la card (por malla) o de la fila de competencia (por competencia).

### 6.1 Caso A — modal de selección

```
Modal (max-width 520px)
├─ header
│  ├─ lg semibold: "Agregar asignaturas"
│  └─ xs muted:    "tributarán a <Competencia>"
├─ body
│  ├─ Fila de destino (dos Select, flex 1 1 140px cada uno)
│  │  ├─ "Nivel de desarrollo"  → Reinforce | Master  (solo niveles declarados)
│  │  └─ "Tipo de contribución" → Evalúa | Desarrolla | Ambas
│  ├─ Fila de filtro: Input "Buscar asignatura" (flex 1 1 180px)
│  │                 + Button ghost sm "Todos" + Button ghost sm "Ninguno"
│  └─ Lista agrupada (max-height 268px, overflow-y auto, borde + radio md)
└─ footer
   ├─ xs muted: "<N> seleccionadas"
   ├─ spacer
   ├─ Button secondary "Cancelar"
   └─ Button primary   "Asociar"
```

**Encabezado de grupo** (`position: sticky; top: 0`, fondo subtle, xs semibold uppercase): checkbox de grupo + nombre del período + contador **"<seleccionadas> de <total>"**. El checkbox de grupo marca/desmarca todas las filas seleccionables del período (las "Ya tributa" no cuentan ni se marcan).

**Fila normal:** checkbox + `<strong>CÓDIGO</strong> · Nombre`.

**Fila ya asignada:** clase `--taken` (color muted, fondo subtle), checkbox `disabled`, y `Badge` neutral **"Ya tributa"** a la derecha.

Ejemplo de la maqueta: Período 1 → "2 de 2" (MAT-1201, FIS-1300 marcadas); Período 2 → "0 de 1" (FIL-1100 ya tributa); Período 5 → "1 de 2" (ING-2310 marcada, ING-3450 no). Pie: "3 seleccionadas".

### 6.2 Caso B — resultado parcial

Al confirmar "Asociar" se reemplaza el contenido por el modal de resultado (superficie **nueva**, delta):

```
header: lg semibold "Resultado de la asociación"
        xs muted   "<Competencia> · <Nivel> · <Tipo>"
body:   Alert success — "<N> asignaturas quedaron asociadas."  (N en negrita)
        Label "<M> salteadas" + Table [Asignatura | Motivo]
footer: spacer + Button primary "Listo"
```

Motivos de salteo (textos canónicos):

- "Ya tributa a esta competencia en este nivel"
- "No pertenece a la matriz seleccionada"
- "La competencia no declara el nivel `<nivel>`"

### 6.3 Caso C — estados

- **Vacío** — `EmptyState`: "No hay asignaturas para asociar" / "Todas las asignaturas del plan ya tributan a esta competencia en este nivel."
- **Aplicando (troceado)** — dos `Skeleton` de 24px (el segundo al 85%) + texto xs muted "Aplicando el destino a 24 asignaturas…".
- **Error total** — `Alert danger`: "**No se asoció ninguna asignatura.** La transacción se revirtió completa. Reintentá o revisá el destino elegido." + `Button secondary sm` "Reintentar".

---

## 7. DELTA — piezas que no existen en el DS up1 (14 ítems)

Cada ítem se resuelve de una de dos formas: **se aporta al DS**, o **se declara local** del módulo `curriculum-mapping`. Esa decisión es previa a codear y hay que tomarla explícitamente por ítem.

### Componentes (5)

| Nombre a implementar | Qué es | Por qué no lo cubre el DS |
|---|---|---|
| **AssignSlot** | Botón-destino "+ Asignar acá": ancho completo, `min-height: 34px`, xs medium, área punteada con "+". Dos estados: activo y atenuado (`aria-disabled`). | El `Button` del DS no cubre el destino-contenedor ni su estado atenuado. |
| **InHandPanelCard** | Tarjeta del panel lateral con el elemento tomado, el "×" para soltarlo y (por malla) el selector de nivel. | El DS no declara ningún componente de selección persistente en panel lateral. |
| **AlignmentWeightField** | Input numérico con sufijo "%" adosado + badge de modo de reparto + leyenda "N evalúa · suma S%". | El `Input` del DS no soporta sufijo/addon ni agrupación con badge e indicador. |
| **BulkEntryButton** | Disparador "Varias" al pie de cada card y de cada fila de competencia. Look de `Button secondary sm` + borde discontinuo. | `ActionMenu` / `ActionToolbar` no cubren esta acción secundaria dentro de la tarjeta. |
| **BulkAssignModal agrupado por período** | Lista con encabezado de grupo (checkbox + contador), "Todos/Ninguno", filas "Ya tributa" no seleccionables, contador en el pie. | `MultiSelectPickerModal` no declara agrupación, checkbox de grupo ni filas ya-asignadas. |

### Tokens (2)

| Delta | Detalle |
|---|---|
| **Escala de dominio para nivel (I/R/M) y tipo (D/E/A)** | Chips con color propio por nivel y por tipo. El DS solo expone `--up1-badge-type-*` para `Badge customColor` y no declara tokens de esta escala. Los colores de la maqueta son **provisorios**. Alternativa sin delta: usar `Badge` neutro con la letra, perdiendo la distinción cromática. |
| **Borde discontinuo de superficie de destino** | Cards de asignatura del modo por malla y el `AssignSlot`. El DS declara anchos y radios, pero no estilo de borde ni "superficie de destino". |

Valores provisorios de los chips (light / dark):

| Chip | bg | fg | border | dark bg / fg / border |
|---|---|---|---|---|
| Nivel I | `#e8eff7` | `#1f4a73` | `#b9cfe3` | `#1b2a38` / `#a8cae8` / `#31506d` |
| Nivel R | `#eceaf8` | `#3d3480` | `#c6c0e8` | `#231f38` / `#bdb5e8` / `#453c70` |
| Nivel M | `#f3e9f5` | `#63296e` | `#ddc2e2` | `#301f33` / `#dcaee4` / `#5b3a60` |
| Tipo D | `#eef3ea` | `#3c5c2c` | `#cbdcc0` | `#1e2718` / `#b6cfa4` / `#3d5230` |
| Tipo E | `#fbf0e3` | `#7a4a10` | `#e9cfa8` | `#33250f` / `#e6c18a` / `#63491f` |
| Tipo A | `#e6f1f2` | `#16545b` | `#b4d6da` | `#123032` / `#9ccfd4` / `#2f5a5f` |

Geometría del chip: 10px, bold, letter-spacing .03em, padding `1px 6px`, radio pill, borde 1px.

### Patrones (3)

| Delta | Detalle |
|---|---|
| **Tablero de asignaturas por período con scroll horizontal dentro de cm** | Replica el scaffold de columnas de `CurriculumMesh` (cd), pero M-26 prohíbe el import cross-mod: hay que redibujarlo en `curriculum-mapping`. |
| **Barra de sesión del editor** (Guardar / Descartar con cambios pendientes) | El DS solo declara "botón en estado de guardado"; no hay patrón para sesión con descarte ni para el aviso de cambios sin guardar al salir. |
| **Asignación por selección lateral + click** (dos pasos, sin drag and drop) | Mecanismo tomar-en-mano → "+ Asignar acá", espejado en los dos modos (REQ-16). No figura entre los patrones transversales del DS. |

### Estados de vista (4)

| Delta | Detalle |
|---|---|
| **Sin elemento en mano** | Estado atenuado del destino + aviso del shell ("Seleccioná una asignatura/competencia del panel para poder asignarla"). |
| **Confirmación efímera tras asignar** | Barra verde en línea dentro de la card. El DS solo declara `Alert` y `NotificationBanner`; no hay feedback efímero en línea dentro de una tarjeta. |
| **Resultado parcial de la vía masiva** | La maqueta cierra con "Asociar" y no reserva lugar para informar las salteadas y su motivo, que es justo lo que devuelve el troceo del backend (REQ-07). |
| **Grupo de peso con suma distinta de 100** | Falta el estado del indicador cuando la suma no llega o excede 100, y el del reparto manual frente a "Reparto automático". |

---

## 8. Fuera de alcance — no se implementa

| Queda fuera | Dónde vive |
|---|---|
| Validación "suma 100 al publicar el plan" (D1) | Cross-mod hacia `curriculum-design`, ticket aparte. Acá el desvío se informa en el indicador del grupo, pero **no bloquea** el guardado. |
| Indicadores y versionado del plan | UPONE-1771 |
| `outcomeAlignment` y retiro con aviso | UPONE-1772 |
| Migración de niveles | UPONE-1773 |
| R-9 — gate del peso por institución | Legacy, no aplica en up1: el único parámetro de tenant del módulo es `cm.displayDecimals`. Sin superficie de configuración. |
| Import del objeto `CurriculumMesh` de curriculum-design | Prohibido por M-26: la vista por malla se dibuja solo con `planEntry` (`period` / `position`) de `alignmentView.resolver.js`. |
| Drag and drop y su equivalente por teclado | Excluido por REQ-16. Ninguna vista declara `draggable` ni handlers de arrastre. |
| Panel lateral de detalle / `CompetencyLevelGrid` / `DetailSidePanel` | Prohibidos por REQ-15: el detalle vive en el `CompetencyAlignmentDetailModal` existente y "Repartir en partes iguales" va dentro del modal (REQ-05). |
| Test de paridad MCP sobre `contributionPercentage` (REQ-12) | En alcance del ticket, pero sin superficie de interfaz. |

---

## 9. Checklist de verificación contra la maqueta

- [ ] La pestaña de solo lectura no monta selector de asignatura en ninguno de sus dos modos, ni componentes del editor.
- [ ] "Tributar" vive en la barra de acciones, no dentro de la grilla.
- [ ] Ningún elemento declara `draggable` ni handlers `dragstart` / `dragover` / `drop`.
- [ ] Sin nada en mano: todos los `AssignSlot` atenuados con `aria-disabled="true"` y `Alert info` visible en la fila de modo.
- [ ] Con algo en mano: `InHandPanelCard` montado, ítem con `aria-pressed="true"`, todos los destinos válidos activos, `Alert info` oculta.
- [ ] Un nivel no declarado por la competencia no muestra `AssignSlot`, solo el texto "La competencia no declara este nivel".
- [ ] Las filas "Fuera de diseño" se marcan con warning y sobreviven al guardado.
- [ ] El badge "Reparto automático / manual" es derivado, no persistido.
- [ ] Con tipo "Desarrolla" el bloque de peso no ofrece input y el valor queda en `null`.
- [ ] El desvío de suma informa pero no bloquea; el peso inválido de fila sí revierte el batch completo.
- [ ] La vía masiva reporta las salteadas con motivo.
- [ ] `theme-dark` en `<html>` deja legibles todas las vistas, incluidos los chips de dominio.
- [ ] Todo control accionable muestra `--up1-focus-ring` al foco por teclado.