---
id: DOC-kb-sp8-formas-implementacion-passing-values-up1-cd-cm
project: up1
type: doc
---

# Formas de implementación para pasar valores a un element de layout: up1 vs curriculum-design vs curriculum-mapping

**Fecha:** 2026-08-04
**Relacionado:** [analisis-enum-view-mode-fef065b-cd-vs-cm.md](analisis-enum-view-mode-fef065b-cd-vs-cm.md) (origen del caso: el fix `fef065b` que dejó de entregar el valor crudo de un enum en modo vista).
**Objetivo:** catalogar las formas que existen en up1 para que un componente/element custom conozca el valor de otro campo o del record, comparar cómo lo resuelven curriculum-design (cd) y curriculum-mapping (cm), fundamentar por qué la de cm es incorrecta de forma, y buscar efectos secundarios del mismo origen que hoy no estamos viendo (dependencia entre inputs u otros detalles propios del form de cm).

Rutas relativas a `/Users/edobacon/Workspace/uplanner/up1`.

---

## 1. Las formas que existen en up1

### Forma 0: leer el propio valor del field (`this.value`)
Un Vueform element expone su propio valor. Es la vía natural para un element que representa UN campo (badge, picker). No es acoplamiento cross-field.
- Ej.: `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue:105-109` (`this.value`).

### Forma 1: prop inyectada por el layout via placeholder (`{{record.X}}`, `{{parentId}}`)
El layout resuelve el placeholder contra el **dato crudo** del record y lo pasa como prop declarada en `defineElement`.
- Resolución en el core: `layout/src/layouts/RecordDetail/recordDetailReferenceFilters.ts:44-85` resuelve `{{record.<campo>}}` contra `recordData.data[x] ?? recordData[x] ?? recordData.extended[x]` (valor de dominio crudo). `LayoutOrchestrator.vue:684-701` resuelve `{{parentId}}` recursivamente sobre el config. `usePlaceholderResolution.ts:64-91` resuelve `{{record.<path>}}`, `{{id}}`, etc.
- Documentada a nivel plataforma: `mods/docs/guides/layouts.md:157-165` (`{{parentId}}`).
- Prescrita paso a paso: `mods/curriculum-design/docs/guides/creating-vueform-element.md` (skeleton con `"ownerId": "{{parentId}}"` + `props` en `defineElement`).

### Forma 2: query GraphQL propia del componente, alimentada por esas props
El id llega por Forma 1; el componente trae el dato del backend en crudo, desacoplado del render.
- Ej.: `mods/curriculum-design/modsComponents/CurriculumMesh/useCurriculumMesh.ts` (queries por `planId`).

### Forma 3: `inject('parentContext')`
`RecordDetail.vue` provee el record contenedor a los hijos.
- `layout/src/layouts/RecordDetail/RecordDetail.vue:400-408` (`provide('parentContext', { id, objectName, data, record })`).
- El propio core la marca como "canonical path" para conocer el record (`ValidationTextEditorElement.vue:349-354`).

### Forma 4 (tribal): leer un campo HERMANO del form (`getSiblingField` / `el$` / `form$.data`)
Lee el valor de OTRO campo del mismo form desde el proxy reactivo de Vueform.
- `layout/src/modsComponents/ValidationTextEditor/ValidationTextEditorElement.vue:319-346` (define `getSiblingField`; lee `objectDefinitionId`, `id`).
- `EnumTransitionsEditor` (lee `enumValues`, metadata), `FormulaMaker` (lee `objectDefinitionId`).
- No está en ninguna guía curada (`layout/docs`, `mods/docs`, `.ai/`); vive solo en comentarios inline que se citan entre sí ("patrón ColorPicker", "patrón ValidationTextEditor"). El propio código admite su fragilidad ("the API surface varies between versions... fall back...").
- Uso legítimo observado en el core: siempre sobre **identificadores opacos o metadata cruda**, nunca sobre un valor que la capa de vista localiza. Y como **fallback**, subordinado a la Forma 3.

---

## 2. Cómo lo hace curriculum-design

| Componente | Enum/valor derivado | Forma usada | Correcto |
|---|---|---|---|
| CurriculumMesh | `Curriculum.status` | Forma 1 (`planId: "{{parentId}}"`, `default_Curriculum_view.json:151-153`) + Forma 2 (status del resultado de la query) | Sí |
| RequirementEditor | discriminadores de `requirement` | Forma 1 (`ownerId: "{{parentId}}"`, `default_Activity_view.json:434-438`) + Forma 2 (`useReglaUnificada`) | Sí |
| ActivityStatusBadge | `Activity.status` | Forma 0 (valor propio) | Sí (olor latente: asume crudo; hoy inmune porque su `type` custom evita el enriquecimiento de enum del core) |
| IconPicker / ColorPicker | valor propio no-enum | Forma 0 (con el helper de `form$` sobre la PROPIA clave) | Sí |

cd resuelve las dependencias de valor por prop y/o query propia. Es exactamente lo que prescribe `creating-vueform-element.md:35`: la lógica derivada de otros campos del form NO se resuelve leyendo hermanos, sino con "composable + campo calculado en la query".

---

## 3. Cómo lo hace curriculum-mapping (LevelSchemeEditor)

El element `level-scheme-editor` necesita cuatro valores del Scheme para funcionar: `kind`, `scoreBasis`, `scaleMin`, `scaleMax`. Los obtiene por **Forma 4** (lectura de hermanos), no por prop:

- `mods/curriculum-mapping/modsComponents/LevelSchemeEditor/useLevelSchemeEditor.ts:252-260` (`readSiblingScheme` lee los 4 con `readSiblingField`, def en `:162-183`).
- Uso del valor: `LevelSchemeEditorElement.vue:184` (`scheme = readSiblingScheme(element)`), `:189` (`columns = buildLevelColumns(t, isNumericKind(scheme.value.kind), ...)`), `:196-203` (watch sobre `[kind, scaleMin, scaleMax]`), `:270` (load).
- Filtro roto: `isNumericKind(kind) => kind === 'Quantitative' || kind === 'Mixed'` (`useLevelSchemeEditor.ts:31`).
- El único valor que SÍ llega por prop es `schemeId: "{{parentId}}"` (`default_LevelScheme_edit.json:46`). O sea, el canal limpio (Forma 1) ya existe en el mismo element, pero no se usó para los 4 campos del scheme.

Wiring del `kind` por modo (clave del problema):

| Modo | Declaración de `kind` en el layout | Valor efectivo del field | `readSiblingField('kind')` devuelve |
|---|---|---|---|
| edit | `select` con `items` (`default_LevelScheme_edit.json:36`) | clave cruda (`"Quantitative"`) | crudo. Funciona |
| create | `select` con `items` (`default_LevelScheme_create.json:34`) | clave cruda | crudo. Funciona |
| view | `text` (`default_LevelScheme_view.json:39`) | label traducida (`"Cuantitativa"`) por el enriquecimiento de enum del core | traducido. **Se rompe** |

---

## 4. Comparación y por qué la de cm es incorrecta (de forma)

1. **Contradice una guía escrita del repo.** `creating-vueform-element.md:35` desaconseja derivar de otros campos del form leyéndolos; manda pasarlos por prop o traerlos por query. cm ya pasa `schemeId` por prop: bastaba pasar también `kind` (y los demás) por `{{record.kind}}`.
2. **Categoría equivocada de dato.** Donde el core usa Forma 4 lee IDs opacos o metadata (`objectDefinitionId`, `id`, `enumValues`), nunca un valor que la vista localiza. cm la aplicó a `kind`/`scoreBasis`, enums que el core convierte adrede a su label traducida en vista. Leer eso del form devuelve un **artefacto de presentación**, no el valor de dominio.
3. **Toma el fallback como vía principal.** `ValidationTextEditor`, del que cm dice heredar el patrón, subordina el sibling-read a `inject('parentContext')` (Forma 3). cm lo usa como única vía.
4. **Se apoya en algo explícitamente frágil y no documentado** para construir un filtro de negocio (mostrar/ocultar columnas de umbral).

---

## 5. Por qué está hecho así (la razón que no estábamos viendo)

El sibling-read no es gratuito. En **edit/create** el editor tiene que reaccionar en vivo a que el usuario cambie el `select` de `kind` (y los inputs `scaleMin`/`scaleMax`), para recalcular la herencia de mínimos (`syncMinThresholds`) y mostrar/ocultar las columnas numéricas. Un `{{record.kind}}` es un placeholder que el layout resuelve UNA vez contra el record almacenado: sería un snapshot estático que NO se actualizaría cuando el usuario cambia el select. Leer el hermano de forma reactiva (`form.el$['kind'].value` dentro de un computed) es lo que da esa reactividad, y en edit/create el `select` tiene el valor crudo, así que ahí es correcto.

El defecto real, entonces, es más preciso que "sibling-read está mal": **el componente usa una única estrategia reactiva de sibling-read para los tres modos, pero esa estrategia solo entrega el valor de dominio en edit/create (donde `kind` es `select` = crudo), no en view (donde `kind` es `text` = localizado)**. La estrategia es ciega al modo. `fef065b` no introdujo el defecto: solo dejó de compensarlo por accidente en view.

---

## 6. Efectos adicionales del mismo origen (búsqueda de lo no evidente)

### 6.1 Las escalas Mixed también pierden columnas en vista
`isNumericKind` cubre `Quantitative` **y** `Mixed`. En vista, `Mixed` se localiza a `"Mixta"`, y `isNumericKind("Mixta")` es `false`. Es decir, el bug de columnas de umbral ocultas afecta a Quantitative **y** a Mixed, no solo a la escala reproducida. (Qualitative no tiene columnas de umbral, así que coincidentemente no se nota.)

### 6.2 `scoreBasis` es un segundo enum leído del hermano
`readSiblingScheme` también lee `scoreBasis` (enum `RubricPoints`/`Grade`/`Percentage`, localizado en vista a "Puntaje de rúbrica"/"Nota"/"Porcentaje"). Hoy `scoreBasis` se guarda en el objeto `scheme` pero NO se consume en la lógica del editor (grep: solo asignación en `useLevelSchemeEditor.ts:254,259` y el tipo en `types.ts:38`), así que la localización es inerte por ahora. Es una **trampa latente**: cualquier lógica futura que use `scheme.scoreBasis` (p.ej. formatear porcentaje vs puntos) heredará el mismo bug en vista sin que nadie lo relacione con `fef065b`.

### 6.3 El watch muta el form en modo vista (sin guard de read-only)
El watch de `LevelSchemeEditorElement.vue:196-203` y el handler `onUpdateRows:268-274` llaman `proxy()?.update?.(levels.value)`. Existe un `isReadonly` computed (`:254`), pero el watch NO lo consulta antes de llamar `update`. En vista, `syncMinThresholds` queda protegido por `isNumericKind` (no muta niveles), pero igual se ejecuta `proxy().update(levels)` sobre un componente read-only. Efecto de bajo impacto (la vista no guarda), pero es un olor: un componente de solo lectura escribiendo en el modelo del form, con potencial de marcar el form como "sucio" o disparar guards de "cambios sin guardar". Conviene guardar el `update` detrás de `isReadonly`.

### 6.4 Riesgo del fix ingenuo (regresión de reactividad)
Si el fix se hiciera pasando `{{record.kind}}` como prop estática en LOS TRES modos y eliminando el sibling-read, se rompería edit/create: cambiar el `select` de `kind` ya no actualizaría columnas ni recomputaría umbrales, porque la prop quedó fijada al valor almacenado al abrir el form. Cualquier corrección debe preservar la reactividad de edición.

### 6.5 Cadena de dependencia entre inputs (contexto para no romper nada)
`kind` gobierna, en el mismo form, tres cosas a la vez: (a) la visibilidad condicional de `scoreBasis`/`scaleMin`/`scaleMax` via Vueform `conditions: [["kind","!=","Qualitative"]]` (`default_LevelScheme_edit.json:37-39`), (b) las columnas del editor (`isNumericKind`), y (c) el recálculo de umbrales. En edit/create esa cadena opera sobre el `select` (crudo), así que las `conditions` y el editor coinciden. En view el layout NO declara `conditions` (los tres campos son `text` y se muestran siempre), así que esa parte no se rompe; el único eslabón afectado en view es el editor. Nota de diseño aparte: en view, para una escala Qualitative, `scaleMin`/`scaleMax`/`scoreBasis` se muestran vacíos (sin `conditions` que los oculten); es una decisión previa del layout de view, no relacionada con `fef065b`.

---

## 7. Forma correcta recomendada para cm

Preferir prop explícita cuando el layout la provee, y caer al sibling-read reactivo cuando no: es el MISMO idiom que el propio componente ya usa para `levels` (`readValue()` en `LevelSchemeEditorElement.vue:165-170`: `props.default` primero, luego el form).

- **Layout de view**: pasar los valores del scheme como props estáticas (correcto porque view es read-only, y `{{record.X}}` entrega el crudo de `record.data`):
```json
"type": "level-scheme-editor",
"schemeId": "{{parentId}}",
"kind": "{{record.kind}}",
"scoreBasis": "{{record.scoreBasis}}",
"scaleMin": "{{record.scaleMin}}",
"scaleMax": "{{record.scaleMax}}"
```
- **Layouts de edit/create**: NO pasar esas props → el componente cae al sibling-read reactivo, que ahí es correcto (el `select` tiene el crudo y se necesita reactividad).
- **Componente**: `readSiblingScheme` pasa a `resolveScheme(props, element)` = "usa `props.kind`/`scoreBasis`/`scaleMin`/`scaleMax` si vienen; si no, lee el hermano". Declarar esas props en `defineElement`. Guardar además el `proxy().update()` detrás de `isReadonly` (efecto 6.3).

Alternativa equivalente: en el composable, traer el Scheme por `schemeId` con una query propia (Forma 2) en lugar de leer los hermanos, y usar el sibling-read solo para la reactividad de edición. Cualquiera de las dos alinea cm con cd y con `creating-vueform-element.md`, sin regresión de edición.

---

## 8. Tabla comparativa final

| Dimensión | up1 (patrón sancionado) | cd | cm (actual) |
|---|---|---|---|
| Valor propio del field | Forma 0 | Forma 0 (badge/pickers) | usa niveles via `props.default`/form |
| Valor de otro campo / record | Forma 1 (prop `{{record.X}}`) + Forma 2 (query) + Forma 3 (`parentContext`) | Forma 1 + Forma 2 | Forma 4 (sibling-read) para `kind`/`scoreBasis`/`scaleMin`/`scaleMax` |
| Reactividad a edición de inputs | sibling-read reactivo, pero sobre IDs/metadata; o `conditions` del layout | n/a (no depende de otros inputs en vivo) | sí la necesita en edit/create (razón legítima del sibling-read) |
| Corrección en view | el core localiza enums; se lee el crudo por `{{record.X}}` | correcto | roto: lee la label localizada |
| Alineación con guía escrita | es la guía | alineado | contradice `creating-vueform-element.md:35` |
| Efectos latentes | - | olor menor en el badge (asume crudo) | Mixed también afectado; `scoreBasis` trampa latente; `update()` sin guard de read-only en view |

---

## 9. Evidencia documental: dónde se especifica que cada patrón es correcto o incorrecto

Citas verbatim de la documentación y el código del propio repo (no interpretación). Cada una fija si un patrón está sancionado o desaconsejado.

### 9.1 La forma correcta ESTÁ especificada (props + composable/query + mecanismos declarativos)

**E1 — La derivación desde otros campos se resuelve por composable/query, no leyendo el form.**
`mods/curriculum-design/docs/guides/creating-vueform-element.md:35` (tabla "¿Cuándo crear un element nuevo?"), verbatim:
> | Logica derivada (computed de otros fields del mismo form) | **NO** — usa un composable + campo calculado en la query | No necesitas un element; el result lo puede proveer el backend o un computed en el composable |

Esta fila es la especificación directa: si tu valor deriva de otros campos del mismo form, la vía sancionada es composable + campo calculado en la query, no un element que lea esos campos. cm hace justo lo contrario.

**E2 — El canal de entrada de un element son las props del schema del RecordDetail.**
`creating-vueform-element.md:46`, verbatim:
> El componente se embebe en layout JSON via `"type": "my-element"`. Recibe props desde el RecordDetail schema.

**E3 — El placeholder `{{parentId}}` (Forma 1) es feature documentada de plataforma.**
`mods/docs/guides/layouts.md:157-159`, verbatim:
> ### `{{parentId}}`
> Resolves to the parent record's ID at runtime. Used in embedded lists and contextual create forms:

**E4 — up1 tiene mecanismos DECLARATIVOS y documentados para valores que dependen de otros campos (Auto-populate / Auto-assign).**
`layout/docs/confluence/en/recorddetail.md:255-268`, verbatim:
> | A value depends on other fields or requires a backend calculation | Auto-populate |
> ...
> - A value derived from another field's label

Es decir, el caso exacto de cm ("las columnas dependen del valor de `kind`") tiene una respuesta documentada de primera clase (Auto-populate / Auto-assign / prop), no una lectura ad-hoc del hermano.

### 9.2 La forma de cm (sibling-read) NO está sancionada: es fallback y no está documentada

**E5 — En el propio core, el sibling-read es FALLBACK, subordinado a `inject('parentContext')` que se marca como "Canonical path".**
`layout/src/modsComponents/ValidationTextEditor/ValidationTextEditorElement.vue:348-354`, verbatim:
> // Best-effort lookup of the current record's primary key for the VAL-02
> // fallback. Tries, in order:
> //   1. Vue `inject('parentContext')` — populated by RecordDetail.vue
> //      with the loaded instance's id. Canonical path.
> //   2. Sibling form field named `id` — works if the layout JSON declares it.

La jerarquía es explícita: la vía canónica es `parentContext`; el sibling-read es el paso 2 (fallback). cm elevó el fallback a vía única, y para un enum, no para un id.

**E6 — El propio código admite que el sibling-read es frágil ("best-effort", superficie que varía entre versiones).**
`ValidationTextEditorElement.vue:319-323`, verbatim:
> // Sibling form fields come from Vueform's reactive form proxy. The API
> // surface varies between versions, so try the documented shapes in order
> // and fall back to the form's flat data object.

Y en cm, `useLevelSchemeEditor.ts:162-166`, verbatim:
> Lee un campo hermano del form (patron `getSiblingField` de ValidationTextEditor): la superficie del
> form$ varia entre versiones de Vueform, asi que se intenta en orden: (1) `form.el$[name].value` ...
> (2) fallback a `form.data[name]`.

El linaje del patrón se documenta a sí mismo por comentario, citando a ValidationTextEditor, admitiendo la fragilidad.

**E7 — El sibling-read NO aparece en ninguna guía curada (verificación del negativo).**
Comando ejecutado (2026-08-04):
```
grep -rin "getSiblingField\|readSiblingField\|sibling field\|campo hermano\|el\$\|form\$" \
  layout/docs mods/docs mods/*/docs layout/.ai mods/*/.ai
```
Resultado: cero coincidencias sobre el patrón (los únicos hits son `fetchSiblingLayouts`, el selector de layouts, y menciones de "sibling" en otro sentido). Es decir, `getSiblingField`/`el$`/`form$` no está en `layout/docs`, `mods/docs`, ni `.ai/`: existe solo en comentarios inline del código. No hay ningún doc que lo prescriba como patrón oficial (ni que lo prohíba explícitamente; su estatus es "convención tribal no documentada").

### 9.3 Cierre de la evidencia

| Afirmación | Evidencia | Fuente |
|---|---|---|
| Derivar de otros campos → composable/query, no leer el form | E1 | `creating-vueform-element.md:35` |
| El element recibe valores por props del schema | E2 | `creating-vueform-element.md:46` |
| `{{parentId}}`/placeholders son feature documentada | E3 | `mods/docs/guides/layouts.md:157` |
| Valor que depende de otros campos → Auto-populate/Auto-assign (declarativo, documentado) | E4 | `recorddetail.md:255-268` |
| Sibling-read es fallback, subordinado a `parentContext` (canonical) | E5 | `ValidationTextEditorElement.vue:348-354` |
| Sibling-read es "best-effort"/frágil por diseño | E6 | `ValidationTextEditorElement.vue:319-323`; `useLevelSchemeEditor.ts:162-166` |
| Sibling-read no está en documentación curada | E7 | grep sobre `layout/docs`, `mods/docs`, `.ai/` (0 hits) |

Conclusión respaldada: la forma de cd (props + query) coincide con lo que E1-E4 especifican como correcto; la forma de cm (sibling-read para un enum, como vía única en los tres modos) usa un mecanismo que E5-E7 muestran como fallback, frágil por diseño y no documentado, y que E1 desaconseja explícitamente para lógica derivada de otros campos.
