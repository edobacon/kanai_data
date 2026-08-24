# Análisis de impacto: fix de enums en modo vista (layout `fef065b`) sobre curriculum-design

**Fecha:** 2026-08-04
**Autor del análisis:** revisión asistida
**Commit gatillo (core `layout`):** `fef065bd` "fix: preserve translated enum label in RecordDetail view mode" (24/jul), integrado a `develop` por el merge `90c20f4` (PR #311, 27/jul).
**Caso reportado (referencia):** rotura en **curriculum-mapping (cm)**, componente editor de niveles.
**Objeto del análisis:** determinar si el mismo cambio de core afecta a **curriculum-design (cd)**, dónde y por qué.

---

## 1. Veredicto

**curriculum-design NO resulta afectado por `fef065b`.**

El patrón que se rompió en curriculum-mapping (un componente que lee el valor de un **campo hermano enum** desde el form del RecordDetail en modo vista) **no existe en curriculum-design**. Todos los consumidores de enums de cd obtienen el valor por una vía que este fix no toca:

- leen el valor crudo desde su **propia** query GraphQL (no desde el form), o
- leen su **propio** valor de campo, que además no pasa por el enriquecimiento de enum del core, o
- el único componente equivalente estructural ya fue desconectado del layout de vista por un cambio previo no relacionado.

El detalle por consumidor está en la sección 4.

---

## 2. Qué cambió el core y por qué importa

El core, al renderizar un RecordDetail en **modo vista**, convierte cada campo enum (tipo `text`/`select`/sin tipo, con `enumValues`) en un input de texto deshabilitado cuyo `default` es la **label traducida** del valor (por ejemplo `"Cuantitativa"` en vez de `"Quantitative"`). Ese branch vive en `enrichSchemaWithFKMetadata` de `layout/src/layouts/RecordDetail.vue`.

- **Antes de `fef065b`:** una pasada posterior, `populateSchemaFields`, volvía a derivar `default` desde el valor crudo del registro cuando el campo ya no tenía `items` (justo el caso del enum convertido a `text`). Efecto secundario: el valor efectivo del campo quedaba **crudo** en inglés (`"Quantitative"`). Era un bug, pero dejaba el valor crudo accesible por accidente.
- **Con `fef065b`:** el campo se marca con `_enumDisplayOnly: true` y `populateSchemaFields` lo saltea. El valor efectivo queda con la **label traducida** (`"Cuantitativa"`), que es el comportamiento correcto.

Consecuencia para terceros: cualquier consumidor que en modo vista leyera el valor de un campo enum **a través del form** (su propio field o un field hermano), y que comparara ese valor contra el **crudo en inglés**, pasó de recibir el crudo (por el bug) a recibir la traducción (por el fix), y su comparación dejó de matchear.

Alcance real del cambio: solo campos que pasan por el branch de enriquecimiento de enum en modo vista (tipo `text`/`select`/sin tipo con `enumValues`). Un campo declarado con un `type` de elemento custom NO entra a ese branch y conserva el valor crudo.

---

## 3. El caso de referencia (curriculum-mapping)

Sirve como patrón contra el cual comparar cd.

- Objeto: `LevelScheme`, campo enum `kind` con valores `Qualitative` / `Quantitative` / `Mixed` (labels `Cualitativa` / `Cuantitativa` / `Mixta`).
- Layout: `config/layouts/default_LevelScheme_view.json` declara `"kind": { "type": "text" }` y, al lado, el element `"type": "level-scheme-editor"`. Al ser `text` con `enumValues`, el campo `kind` entra al enriquecimiento de enum en vista.
- Componente: `LevelSchemeEditorElement.vue` lee el **campo hermano** `kind` del form:
  - `const scheme = computed(() => readSiblingScheme(element))` (lee `form.el$[name].value` con fallback a `form.data[name]`).
  - `const columns = computed(() => buildLevelColumns(t, isNumericKind(scheme.value.kind), props.columnDefs))`.
  - `isNumericKind(kind)` en `useLevelSchemeEditor.ts`: `return kind === 'Quantitative' || kind === 'Mixed'` (comparación estricta contra el crudo en inglés).
- Rotura: con `fef065b`, el hermano `kind` en vista pasa a valer `"Cuantitativa"`. `isNumericKind("Cuantitativa")` devuelve `false`, y las columnas de umbral (min/max) se ocultan aunque la escala sea cuantitativa. Ese es "el filtro que se cae".
- Fix correcto (según el reporte): que el layout pase el valor **crudo** por un prop explícito (`{{record.kind}}`), en vez de que el componente lea el hermano del form (contrato explícito, independiente de cómo el core renderice el campo visible).

---

## 4. Auditoría de curriculum-design

Se revisó todo el mod (`modsComponents/`, `logic/`, `config/layouts/`, `objects/`), buscando el patrón "leer un campo hermano enum del form en modo vista" y cualquier comparación de enum contra crudo.

### 4.1 `ActivityStatusBadge` (enum `Activity.status`)

- Lee `this.value` (su **propio** field), lo mapea con `STATE_TO_VARIANT` (claves crudas `Draft|InReview|Approved|Active|Deprecated|Archived`) y arma la label con `$t('activity.enums.status.{estado}')`.
- **No afectado**, por dos motivos independientes:
  1. El field usa `type: 'activity-status-badge'` (element custom). El branch de enriquecimiento de enum del core exige `type` vacío/`text`/`select`; con un type custom se saltea, así que el valor llega **crudo** aunque esté en vista. `fef065b` no lo toca.
  2. Además, en `config/layouts/default_Activity_view.json` el campo `status` fue cambiado de `activity-status-badge` a `select` el 14-15/jul (commits `a56a601`, `356317b`, contexto UPONE-1381), **antes** del fix. Hoy el badge ni siquiera está cableado en esa vista.
- Nota: aunque lee su propio valor, no es el patrón de cm (hermano), y el mapeo asume crudo; conviene tenerlo en el radar si en el futuro se recablea el badge sobre un field enriquecido.

### 4.2 `CurriculumMesh` (enum `Curriculum.status`)

- `curriculumMesh.logic.ts`: `EDITABLE_STATUSES = ['Draft']`, `isEditableStatus(status) = EDITABLE_STATUSES.includes(status)`, `canEdit(status, mode)`.
- `CurriculumMeshElement.vue:512`: `const editable = computed(() => canEdit(plan.value.status, mode.value))`.
- `plan.value.status` proviene de la **query GraphQL propia** del componente (valor crudo de BD), no del field del form. **No afectado.**

### 4.3 `ReglaUnificadaView` / `RequirementEditor` (discriminador `requirement.recordType`, sub-enum `mustBe`)

- Comparan `recordType` (`Group`/`RecordState`/`MetricThreshold`) y `mustBe` (`Approved`/`Taken`) contra crudo, en cascada (`describeRequirementNode.logic.ts`, `RequirementTreeNode.ts`, `RequirementEditorElement.vue`, etc.).
- El valor viene de `listInstances` (campos `data`/`extended` del backend), armado por `buildRequirementTree`. Es lectura por **query propia**, no por field del form en vista. **No afectado.**
- Adicional: `recordType` no es un enum de dominio con label i18n visible, así que tampoco pasaría por el enriquecimiento de enum del core.

### 4.4 `IconPicker` / `ColorPicker` (patrón de lectura de form)

- Son los únicos componentes de cd que usan la lectura tipo hermano (`element.form$.data[name]`, `resolveElementProxy`), pero leen su **propio** valor (`elementName(element)`), que es un string no-enum (icono `bi-...`, color `#...`). No pasa por enriquecimiento de enum. **No afectado.**

### 4.5 Placeholders de layout

- El único `{{record.X}}` en todo `config/layouts/` de cd es `default_Activity_view.json:490` con `{{record.code}}` (campo `code`, string, no enum). Todos los demás placeholders son `{{parentId}}`. Ningún layout de cd pasa un valor de enum traducido como `initialData`/mapping a un subcomponente.

### Resumen

| Consumidor | Campo enum | Vía de lectura | Afectado por `fef065b` |
|---|---|---|---|
| ActivityStatusBadge | `Activity.status` | field propio (type custom, saltea enriquecimiento) + hoy descableado | No |
| CurriculumMesh | `Curriculum.status` | query GraphQL propia (crudo BD) | No |
| ReglaUnificadaView / RequirementEditor | `requirement.recordType`, `mustBe` | `listInstances` (crudo BD) | No |
| IconPicker / ColorPicker | ninguno (valor propio no-enum) | form propio | No |

**No existe en cd el patrón de cm** (leer un campo hermano enum del form en modo vista y comparar contra crudo).

---

## 5. Recomendaciones

1. **cd:** no requiere cambios por `fef065b`.
2. **Regla transversal (para no repetir el caso de cm):** ningún componente debería inferir el valor de un enum leyéndolo de un campo visible del RecordDetail (propio o hermano). El valor debe llegar por un contrato explícito del layout (prop con `{{record.<campo>}}`), que siempre entrega el crudo de BD y es independiente de cómo el core renderice el campo. Cualquier comparación de enum en UI debe hacerse contra el valor crudo.
3. **Vigilancia en cd:** si a futuro se recablea `ActivityStatusBadge` (o cualquier element custom) sobre un field declarado `text`/`select` que el core enriquezca, revalidar; el mapeo por estado crudo lo asume.

---

## 6. Smoke test (runtime)

Entorno: plataforma up1 corriendo en local (suite `:3000`, object-manager `:4000`), tenant **UPU** (`uplanner_upu`), rol Consultor. El build de layout servido está en `develop` e incluye `fef065b` (verificado por git: `fef065bd` es ancestro de `HEAD e4e69947`).

### 6.1 El fix está vivo en este build (enum traducido en vista)

Vista de una Activity de cd (`/UPU/Activity/{id}/RecordDetail/default_Activity_view`, "Accionamientos Electricos"):

- Campo **ESTADO** renderiza `"Activo"` (label traducida). Valor crudo en BD y en el RecordList: `Active`.
- Campo **NIVEL** renderiza `"Pregrado"`. Crudo: `Undergraduate`.

Confirma que en modo vista los enums exponen la label traducida (comportamiento de `fef065b`), no el crudo.

### 6.2 curriculum-design NO se rompe

La misma vista de Activity renderiza completa y correcta (Nombre, Código, Versión, Etiqueta, Idioma, Nivel, Créditos, Unidad Organizativa, Estado, Vigente). Ningún componente de cd infiere un enum leyéndolo del form en vista, así que la traducción del valor no rompe nada. **cd OK en runtime.**

### 6.3 Reproducción del caso de referencia (curriculum-mapping)

Vista del LevelScheme cuantitativo "Escala 100 (cuantitativa)" (`/UPU/LevelScheme/cmserjgcf06ktxxmskciv1oaf/RecordDetail/default_LevelScheme_view`):

- BD: `kind = Quantitative`, `scaleMin = 0`, `scaleMax = 100` (escala numérica).
- Layout `default_LevelScheme_view.json` declara en `columnDefs` las columnas `minThreshold` y `maxThreshold` con `numericOnly: true` (solo se muestran en escalas numéricas).
- Grid renderizado en la pestaña "Niveles" (headers leídos del DOM): **Orden, Nombre, Código, Peso, Logrado, Descriptor**.
- Las columnas de umbral (`minThreshold` / `maxThreshold`) **NO aparecen**, pese a ser una escala cuantitativa.

Esto reproduce el bug tal como lo describe el reporte: el editor lee el hermano `kind` que en vista vale `"Cuantitativa"` (traducido por `fef065b`), y `isNumericKind("Cuantitativa")` devuelve `false`, ocultando las columnas de umbral. Valida el mecanismo end-to-end y, por contraste, que cd no tiene esa dependencia.

### Conclusión del smoke

| Verificación | Resultado |
|---|---|
| `fef065b` vivo en el build (enum traducido en vista) | Confirmado (ESTADO="Activo", NIVEL="Pregrado") |
| curriculum-design renderiza sin rotura | Confirmado (vista de Activity OK) |
| Reproducción del bug de curriculum-mapping | Confirmado (columnas de umbral ocultas en escala cuantitativa) |

---

## 7. Juicio arquitectónico (más allá de si funciona)

La pregunta no es si compila o si "andaba", sino si la **forma** de obtener el valor está acorde a los patrones establecidos de up1. Respuesta corta: **cd está bien y es idiomático; cm está mal, y contradice una guía escrita del propio repo.**

### 7.1 Cuáles son las vías sancionadas en up1

Un element/componente custom tiene tres vías legítimas para conocer un valor de otro campo o del record, en orden de preferencia según el repo:

1. **Prop inyectada por el layout via placeholder** (`{{record.<campo>}}`, `{{parentId}}`). El layout resuelve el placeholder contra el **dato crudo** del record y lo pasa como prop declarada en `defineElement`. Es la vía documentada a nivel plataforma (`mods/docs/guides/layouts.md:157-165`) y prescrita paso a paso en la guía canónica de creación de elements (`mods/curriculum-design/docs/guides/creating-vueform-element.md`).
2. **Query GraphQL propia** del componente, alimentada por esas props (típicamente un id). El valor viene del backend en crudo, desacoplado del render.
3. **`inject('parentContext')`** que `RecordDetail.vue` provee (`layout/src/layouts/RecordDetail/RecordDetail.vue:400-408`). El propio core la marca como "canonical path" para conocer el record contenedor.

Punto clave del porqué la vía 1 es correcta: `{{record.X}}` se resuelve contra `recordData.data[x] ?? recordData[x] ?? recordData.extended[x]` (`layout/src/layouts/RecordDetail/recordDetailReferenceFilters.ts:44-85`), es decir el **valor de dominio crudo**, independiente de cómo el core decida renderizar el campo visible. Por eso un enum leído por `{{record.kind}}` siempre llega `"Quantitative"`, nunca `"Cuantitativa"`.

### 7.2 curriculum-design: correcto e idiomático

- `CurriculumMesh` recibe `planId: "{{parentId}}"` como prop (`default_Curriculum_view.json:151-153`; prop declarada en `CurriculumMeshElement.vue:483-494`) y resuelve todo por su propia query (`useCurriculumMesh.ts`). Lee `Curriculum.status` del resultado de la query (crudo), no del form. Vías 1 + 2.
- `RequirementEditor` recibe `ownerType`/`ownerId: "{{parentId}}"` como props (`default_Activity_view.json:434-438`; props en `RequirementEditorElement.vue:448-458`) y dispara `useReglaUnificada`. Vías 1 + 2.
- `ActivityStatusBadge`, `IconPicker`, `ColorPicker` leen su **propio** valor de campo (no un hermano). Eso es el comportamiento normal de un Vueform element y no incurre en acoplamiento cross-field. Matiz: el badge asume el enum crudo en inglés; hoy es inmune solo porque su `type` custom queda fuera del enriquecimiento de enum del core. Es un olor latente (documentarlo), no un defecto activo.

Veredicto cd: alineado con `creating-vueform-element.md`, que en su línea 35 dice literalmente que la lógica derivada de otros campos del form NO se resuelve leyendo hermanos sino con "composable + campo calculado en la query". cd hace exactamente eso.

### 7.3 curriculum-mapping: funciona, pero es la forma incorrecta

`LevelSchemeEditor` **sí** recibe `schemeId: "{{parentId}}"` como prop (`default_LevelScheme_view.json:44-48`), o sea el canal limpio ya existe. Pero para `kind`/`scoreBasis`/`scaleMin`/`scaleMax` NO usa ese canal: los lee del **form hermano** con `readSiblingField` (`useLevelSchemeEditor.ts:162-183, 252-256`). Dos problemas de forma:

1. **Contradice la guía escrita.** `creating-vueform-element.md:35` desaconseja explícitamente derivar de otros campos del form leyéndolos; manda pasarlos por prop o traerlos por query. cm ya tiene el `schemeId`: bastaba pasar también `kind` por `{{record.kind}}` (y los demás por `{{record.X}}`), o traer el Scheme por su id en la query propia.
2. **Categoría equivocada de dato.** El patrón `getSiblingField` sí existe en up1, pero donde el core lo usa lee **identificadores opacos o metadata cruda**, nunca un valor que la capa de vista localiza:
   - `ValidationTextEditor` lee `objectDefinitionId` e `id` (`ValidationTextEditorElement.vue:346,363`).
   - `EnumTransitionsEditor` lee `enumValues` (metadata, en modo edición) (`EnumTransitionsEditorElement.vue:255-273`).
   - `FormulaMaker` lee `objectDefinitionId`.
   cm lo aplicó a `kind`, que es un enum de dominio que el core **deliberadamente** convierte a su label traducida en modo vista. Leer ese campo del form devuelve un **artefacto de presentación** (la traducción), no el valor de dominio. Ahí está el defecto de fondo, no en `fef065b`.
3. **Ni siquiera es la vía primaria del patrón que cita.** El propio `ValidationTextEditor`, del que cm dice heredar el patrón, subordina el sibling-read a `inject('parentContext')` y lo marca como fallback #2 (`ValidationTextEditorElement.vue:349-354`). cm tomó el fallback como vía principal.

Además `getSiblingField`/`readSiblingField` no está en ninguna guía curada del repo (`layout/docs`, `mods/docs`, `.ai/`); es convención tribal que vive solo en comentarios de código que se citan entre sí ("patrón ColorPicker", "patrón ValidationTextEditor"). El propio código admite su fragilidad ("la superficie del form$ varía entre versiones... fallback silencioso"). Construir un filtro de negocio (mostrar/ocultar columnas de umbral) sobre esa base es apoyarse en algo explícitamente frágil y no documentado.

### 7.4 Recomendación de forma para cm

Pasar los campos del scheme por props del layout, homogéneo con cómo el mismo element ya recibe `schemeId`:

```json
"type": "level-scheme-editor",
"schemeId": "{{parentId}}",
"kind": "{{record.kind}}",
"scoreBasis": "{{record.scoreBasis}}",
"scaleMin": "{{record.scaleMin}}",
"scaleMax": "{{record.scaleMax}}"
```

y declarar esas props en `defineElement`, eliminando `readSiblingScheme`. Alternativa equivalente: traer el Scheme por `schemeId` en la query propia del composable. Cualquiera de las dos alinea cm con cd, con `creating-vueform-element.md`, y elimina la dependencia del render del core.

### 7.5 Tabla resumen

| Componente | Cómo obtiene el enum/valor derivado | ¿Acorde a up1? | Referencia del patrón correcto |
|---|---|---|---|
| cd · CurriculumMesh | prop `{{parentId}}` + query propia (status del resultado) | Sí | `default_Curriculum_view.json:151-153` |
| cd · RequirementEditor | props `{{parentId}}` + query propia | Sí | `default_Activity_view.json:434-438` |
| cd · ActivityStatusBadge / IconPicker / ColorPicker | valor propio del field (no hermano) | Sí (olor latente en el badge por asumir crudo) | comportamiento normal de Vueform element |
| cm · LevelSchemeEditor | `readSiblingField` sobre `kind` (enum localizado en vista) | No | debería usar `{{record.kind}}` como prop, igual que su propio `schemeId` |

### 7.6 Evidencia documental (dónde se especifica correcto/incorrecto)

Citas verbatim del propio repo que respaldan el juicio (el detalle completo, con las 7 evidencias y el método de verificación del negativo, está en [formas-implementacion-passing-values-up1-cd-cm.md](formas-implementacion-passing-values-up1-cd-cm.md) sección 9):

- **Correcto (props/composable/query):** `mods/curriculum-design/docs/guides/creating-vueform-element.md:35`, verbatim: "Logica derivada (computed de otros fields del mismo form) | **NO** — usa un composable + campo calculado en la query". Refuerzo: `:46` "Recibe props desde el RecordDetail schema".
- **Correcto (mecanismo declarativo documentado):** `layout/docs/confluence/en/recorddetail.md:255-268`, verbatim: "A value depends on other fields or requires a backend calculation | Auto-populate" y "A value derived from another field's label".
- **Placeholder oficial:** `mods/docs/guides/layouts.md:157-159`, verbatim: "### `{{parentId}}` / Resolves to the parent record's ID at runtime".
- **Sibling-read es fallback, no vía canónica:** `layout/src/modsComponents/ValidationTextEditor/ValidationTextEditorElement.vue:348-354`, verbatim: "1. Vue `inject('parentContext')` ... Canonical path. 2. Sibling form field named `id` ...".
- **Sibling-read es frágil por diseño:** mismo archivo `:319-323` "The API surface varies between versions, so try the documented shapes in order and fall back".
- **No documentado:** grep sobre `layout/docs`, `mods/docs`, `.ai/` para `getSiblingField`/`readSiblingField`/`el$`/`form$` devuelve 0 coincidencias sobre el patrón (solo `fetchSiblingLayouts`, no relacionado).
