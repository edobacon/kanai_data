---
id: SPEC-features-006
project: up1
type: spec
module: features
category: features
tags: [up1, layout-engine, recorddetail, tabs, record-list, embedded-blocks, vueform, ui-pattern, UPONE-1101]
fecha: 2026-05-16
sources:
  - layout/src/layouts/RecordDetail.vue (commit 83de3eb — PR #224)
  - layout/src/elements/RecordListElement.vue
  - layout/css/3-viewType/recorddetail.css
  - layout/docs/features/recorddetail.md
  - mods/curriculum-design/config/layouts/grouped_AcademicActivity_{edit,list,view}.json (rama feat/UPONE-1101-grouped-tabs)
ticket: UPONE-1101
pr: https://bitbucket.org/uplanner/layout/pull-requests/224
---

# RecordDetail — Multiple bloques por tab (grouped tabs)

> Permite que un tab de `RecordDetail` contenga **varios bloques embedded** (record-lists, composite-section-tree, etc.) junto con campos simples, renderizandolos en orden con dividers visuales entre cada bloque. Mergeado en `layout/develop` por UPONE-1101 (Juan Diego Galdames, 2026-05-15).

## TLDR

Antes: cada tab solo podia mostrar un layout embebido (un record-list) o un grupo de campos. Si querias varios bloques en la misma vista, necesitabas un wizard o varios tabs separados.

Ahora: el array `elements` de un tab acepta cualquier combinacion de campos del schema y bloques embedded. Los campos se renderizan como sub-formulario; los bloques aparecen despues separados por una linea horizontal.

```json
{
  "tabs": {
    "diseno_pedagogico": {
      "label": "Diseño pedagógico",
      "elements": [
        "description",
        "outcomesList",
        "contentsList",
        "evaluationList"
      ]
    }
  }
}
```

Resultado: el tab muestra el campo `description` arriba como input, seguido de los 3 record-lists apilados con dividers entre cada uno.

## Problema que resuelve

`RecordDetail` ya soportaba tabs y `RecordListElement` ya permitia embedar un layout dentro del schema. Pero al apilar dos `record-list` en el mismo tab aparecian dos problemas visuales:

1. **Whitespace excesivo**: `RecordList.vue` legacy traia `min-height: 100vh` y `padding: 2rem 0` pensados para uso full-page. Al embeber dos, ocupaban dos pantallas innecesariamente.
2. **Sin separacion visual**: los listados se pegaban sin indicar donde termina uno y empieza el siguiente.

Ademas, los tabs con `elements` que referenciaban claves no existentes en el schema fallaban silenciosamente (o renderizaban espacios vacios sin warning).

UPONE-1101 resuelve los 3 issues en una sola pasada.

## Como activar la feature en un layout

En el JSON de tu layout (sea `default_*` o un layout custom como `grouped_*`):

1. Declara los `tabs` normalmente.
2. En `elements` lista todas las keys que quieres renderizar, mezclando **campos del schema** y **bloques embedded**:

```json
{
  "id": "grouped_AcademicActivity_view",
  "name": "grouped_AcademicActivity_view",
  "label": "Ver Programa de asignatura (agrupado)",
  "objectName": "AcademicActivity",
  "layoutType": "RecordDetail",
  "tenants": ["UPU"],
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "general": {
        "label": "General",
        "elements": ["name", "code", "version", "programLevel", "credits", "executionUnitId"]
      },
      "diseno_pedagogico": {
        "label": "Diseño pedagógico",
        "elements": ["description", "outcomesList", "contentsList", "evaluationList"]
      },
      "sessions": {
        "label": "Sesiones",
        "elements": ["sessionsList"]
      }
    },
    "schema": {
      "name":         { "type": "text", "label": "Nombre", "columns": { "container": 12 } },
      "description":  { "type": "textarea", "label": "Descripcion" },
      "outcomesList": { "type": "record-list", "layoutName": "embed_LearningOutcomes_list", "filter": { "ownerId": "{{parentId}}" } },
      "contentsList": { "type": "record-list", "layoutName": "embed_Contents_list", "filter": { "ownerId": "{{parentId}}" } }
      // ...
    }
  }
}
```

3. Sync + recarga del frontend: `npm run sync` propaga el JSON a la tabla `up1_layen_layout` del tenant.

No requiere cambios en backend ni codegen.

## Navegacion en suite

Patron de URL (de [operations/local-environment.md](../operations/local-environment.md)):

```
http://localhost:3000/{tenant_id}/{object_name}/{instance_id}/{view_type}/{layout_id}
```

Para los layouts grouped de la rama de prueba en UPU:

| Vista | URL |
|-------|-----|
| Lista agrupada | `http://localhost:3000/UPU/AcademicActivity/list/grouped_AcademicActivity_list` |
| Detalle (view) | `http://localhost:3000/UPU/AcademicActivity/{id}/view/grouped_AcademicActivity_view` |
| Detalle (edit) | `http://localhost:3000/UPU/AcademicActivity/{id}/edit/grouped_AcademicActivity_edit` |

Los grouped no son layouts default — la URL debe declarar el `layout_id` explicito. Si quieres que sea el default, renombra a `default_{ObjectName}_{mode}` (ver convencion en [confluence/layouts-detalle.md](../confluence/layouts-detalle.md#layouts-por-defecto)).

## Como funciona internamente

Tres capas colaboran:

### 1. `RecordDetail.vue` — validacion + dividers CSS

Al construir `resolvedForm` la vista hace dos pasadas sobre `tabs` y `steps`:

- **Filtrado de claves invalidas**: elementos cuyo nombre NO existe en `schema` se descartan del array y se emite `console.warn` para el autor del layout.
- **Drop de tabs vacios**: si un tab queda con `elements: []` despues del filtrado, se omite del nav. Cubre dos casos: tabs declarados vacios y tabs cuyas claves estan todas mal escritas.
- **Pass-through**: tabs sin `elements` (ej. asociados con `type: "associatedLayout"`) pasan intactos.

```ts
// layout/src/layouts/RecordDetail.vue:~4395
if (tabs && formSchema) {
  const validatedTabs: Record<string, any> = {};
  for (const [tabName, tabConfig] of Object.entries(tabs)) {
    const config = tabConfig as any;
    if (config.elements && Array.isArray(config.elements)) {
      const invalidFields = config.elements.filter(f => !(f in formSchema));
      if (invalidFields.length > 0) {
        console.warn(`[RecordDetail] Tab "${tabName}" references fields not in schema: ${invalidFields.join(', ')}`);
      }
      const validElements = config.elements.filter(f => f in formSchema);
      if (validElements.length === 0) continue; // tab vacio → drop
      validatedTabs[tabName] = { ...config, elements: validElements };
    } else {
      validatedTabs[tabName] = tabConfig;
    }
  }
  tabs = Object.keys(validatedTabs).length > 0 ? validatedTabs : null;
}
```

Los dividers son CSS puro al final del `<style scoped>`:

```css
/* layout/src/layouts/RecordDetail.vue: final del style scoped */
:deep(.vf-element-layout:not([style*="display: none"])
       ~ .vf-element-layout:not([style*="display: none"]):is(
          :has(.vf-record-list-wrapper),
          :has(.cst-card)
       )) {
  border-top: 1px solid var(--up1-border-color);
  margin-top: var(--up1-spacing-3);
  padding-top: var(--up1-spacing-3);
}
```

Lo importante:

- `~` general-sibling combinator → "cualquier `.vf-element-layout` precedido por otro visible".
- `:not([style*="display: none"])` → ignora elementos que Vueform oculto via `v-show` (importante porque Vueform mantiene TODOS los elements como siblings y solo cambia su visibility).
- `:is(:has(.vf-record-list-wrapper), :has(.cst-card))` → divider SOLO si el elemento contiene un bloque registrado. Aqui se agregan los selectores para nuevos tipos de bloque.

### 2. `RecordListElement.vue` — marker class `up1-embedded-block`

El element registra dos clases por default en su wrapper:

```js
// layout/src/elements/RecordListElement.vue
const defaultClasses = ref({
  container: '',
  wrapper: 'vf-record-list-wrapper up1-embedded-block',
})
```

`vf-record-list-wrapper` ya existia (selector del CSS de reset de whitespace). `up1-embedded-block` es la marca conceptual del PR: cualquier elemento que renderice un bloque self-contained deberia llevarla para que herede el comportamiento de divider.

### 3. CSS de reset del RecordList embebido

`record-detail` agrega overrides que neutralizan los defaults de pagina completa del RecordList:

```css
/* layout/src/layouts/RecordDetail.vue */
:deep(.vf-record-list-wrapper) {
  min-height: auto;
}
:deep(.vf-record-list-wrapper .record-list-container) {
  min-height: auto;
  padding: var(--up1-spacing-2) 0;
}
```

Y un fix relacionado en `recorddetail.css`: los selects nativos del RecordList embebido (page size, column customizer) se congelaban en modo `view` porque la regla `VM-3 NATIVE SELECTS` aplicaba a TODO `select`. Ahora esta scoped a `.vf-element select` — solo los selects de campos del formulario quedan readonly.

## Marker class — opt-in para elementos custom

Cualquier `*Element.vue` de un mod cuyo root renderice un bloque self-contained (lista, arbol, calendario, card grande) debe agregar `up1-embedded-block` al wrapper raiz para que el divider funcione. Dos patrones validos segun como se registren las clases del elemento:

**Patron A — Vueform `defaultClasses`** (cuando el elemento registra default classes desde el setup):

```js
// Ejemplo: layout/src/elements/RecordListElement.vue
export default defineElement({
  // ...
  setup(props) {
    const defaultClasses = ref({
      container: '',
      wrapper: 'vf-record-list-wrapper up1-embedded-block',
    })
    return { defaultClasses }
  }
})
```

**Patron B — Static class en el template root** (cuando el elemento renderiza markup custom directo):

```vue
<!-- Ejemplo: mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue -->
<template>
  <div class="cst-card up1-embedded-block" role="region" ...>
    <!-- contenido del bloque -->
  </div>
</template>
```

### Elementos shipping con marker

Confirmados al cierre del PR #224:

- `RecordListElement` (`layout/src/elements/RecordListElement.vue`)
- `CompositeSectionTreeElement` (`mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue`)

### Cuando NO usar el marker

Campos simples (text, textarea, select, toggle, number, date, etc.) **no deben** llevar `up1-embedded-block`. Si lo agregas, apareceria un divider arriba de cada campo en un tab, contaminando el formulario.

## Registrar un nuevo tipo de bloque en el divider CSS

Si tu elemento custom no usa `.vf-record-list-wrapper` ni `.cst-card` como root, el `:is(...)` del CSS de RecordDetail no lo reconocera y no se le aplicara el divider. Edita `layout/src/layouts/RecordDetail.vue` en su `<style scoped>` final y agrega tu selector:

```css
:deep(.vf-element-layout:not([style*="display: none"])
       ~ .vf-element-layout:not([style*="display: none"]):is(
          :has(.vf-record-list-wrapper),
          :has(.cst-card),
          :has(.tu-clase-raiz)        /* <-- agregar aqui */
       )) {
  border-top: 1px solid var(--up1-border-color);
  /* ... */
}
```

Despues, el wrapper raiz de tu elemento debe llevar `up1-embedded-block` (convencion) Y `.tu-clase-raiz` (matcher concreto del `:has`).

## Limitacion conocida — orden no consecutivo en el schema

Vueform monta TODOS los elementos del schema como siblings de un unico `FormElements` container y alterna visibility con `v-show` (`display: none` inline). El divider depende del general-sibling combinator y filtra hidden via `:not([style*="display: none"])`.

**Caso que funciona**: si los bloques visibles del tab tambien son consecutivos en el orden del schema.

**Caso que falla**: si un tab lista bloques que no son adyacentes en el schema (con bloques ocultos de otros tabs entre ellos), el divider del segundo bloque puede no renderizar.

Workaround manual: reordenar las keys del `schema` del layout JSON para que los bloques de un mismo tab queden consecutivos.

Documentado en `layout/docs/features/recorddetail.md` (seccion "Known limitation").

## Estilos sintetizados — selectores claves

| Selector | Donde | Que hace |
|----------|-------|----------|
| `.vf-record-list-wrapper.up1-embedded-block` | `RecordListElement.vue` default class | Marca el record-list como bloque para el divider |
| `.cst-card.up1-embedded-block` | `CompositeSectionTreeElement.vue` template root | Idem para el arbol de composite-section |
| `:deep(.vf-record-list-wrapper) { min-height: auto }` | `RecordDetail.vue` style scoped | Neutraliza `min-height: 100vh` legacy del RecordList |
| `:deep(.vf-record-list-wrapper .record-list-container) { padding: var(--up1-spacing-2) 0 }` | Idem | Reduce padding excesivo del RecordList standalone |
| `:deep(.vf-element-layout:not(...) ~ .vf-element-layout:not(...):is(:has(...)))` | Idem | Divider arriba de bloques consecutivos en un tab |
| `.recorddetail.mode-view .vf-element select` (en vez de `.recorddetail.mode-view select`) | `css/3-viewType/recorddetail.css` VM-3 | Estilo de view-mode aplica SOLO a selects de campos, no a selects de RecordLists embebidos |

## Como agregar un layout grouped a un mod

Pasos repetibles con el ejemplo de `curriculum-design`:

1. Crear el JSON en `mods/<mi-mod>/config/layouts/grouped_<Object>_view.json` (o `_edit`, `_list`).
2. Setear `objectName` al objeto raiz (ej. `AcademicActivity`).
3. Setear `tenants: [...]` con los tenants donde aplica.
4. En `layoutConfig.tabs.<tabKey>.elements` listar los campos + bloques que quieres juntos.
5. En `layoutConfig.schema` declarar todas las keys mencionadas (campos como `type: text|select|...`, bloques como `type: record-list` con su `layoutName` + filter).
6. `cd up1 && npm run sync` — el sync propaga el JSON a la tabla `up1_layen_layout` del tenant en la fase 6 ("Apps & Layouts Sync").
7. Navegar a `/{tenant}/<Object>/{instance_id}/view/grouped_<Object>_view` para validar.

Referencias en codigo:

- Ejemplo completo: `mods/curriculum-design/config/layouts/grouped_AcademicActivity_view.json` (rama `feat/UPONE-1101-grouped-tabs`) — 6 tabs, 4 con multiples bloques.
- Tabla destino: `up1_layen_layout` (columnas `name, objectName, layoutType, layoutConfig (jsonb), tenants, isActive`).

## Bonus — validacion y warnings

Despues del PR, abrir un layout que referencia campos inexistentes ya no falla silenciosamente:

- **Console warning** del browser para cada tab/step con claves invalidas:
  ```
  [RecordDetail] Tab "diseno_pedagogico" references fields not in schema: outcomesList, contentsListtt
  ```
- **Tabs vacios se ocultan** del nav. Si todas las claves de un tab estan mal escritas, el tab no aparece (no es un tab "fantasma" sin contenido).

Util al desarrollar el layout: revisar la consola apenas se abre la vista — los warnings indican exactamente que claves arreglar.

## Referencias

| Item | Donde |
|------|-------|
| PR mergeado a `layout/develop` | [PR #224](https://bitbucket.org/uplanner/layout/pull-requests/224) — commit `83de3eb` (2026-05-15) |
| Ticket Jira | [UPONE-1101](https://u-planner.atlassian.net/browse/UPONE-1101) |
| Doc oficial del repo `layout` | `layout/docs/features/recorddetail.md` seccion "Multiple elements per tab and the block-divider convention" |
| Rama de prueba (consumer) | `mods/curriculum-design/feat/UPONE-1101-grouped-tabs` — commit `e836cf6` (3 layouts grouped + marker en CompositeSectionTreeElement) |
| Autor | Juan Diego Galdames (`juan.galdames@uplanner.com`) |

## Relacion con otros docs

| Doc | Relacion |
|-----|----------|
| [confluence/layouts-detalle.md](../confluence/layouts-detalle.md) | Cubre RecordDetail en general (modos, tabs basicos). Este doc complementa con la feature especifica de multi-bloque |
| [mods/internals.md](../mods/internals.md) | Explica como Vueform monta los elements como siblings — contexto para entender la limitacion del orden no consecutivo |
| [core/style-guide.md](../core/style-guide.md) | Variables CSS (`--up1-border-color`, `--up1-spacing-*`) usadas en los dividers |
| [operations/local-environment.md](../operations/local-environment.md) | Patron de URLs de suite para acceder al layout por nombre |
