---
id: RULE-mods-035
project: up1
type: rule
module: mods
---

# Custom Vueform components renderizados en tabs de LayoutRecordDetail deben alinear su diagramacion con el record-list standard del platform

## What

Todo SFC custom Vueform definido via `defineElement({ ... })` en `modsComponents/{Component}/` que se renderice como tab dentro de un `LayoutRecordDetail` debe matchear la diagramacion visual del record-list standard del platform. Concretamente:

| Atributo | Valor canonico | Origen |
|----------|---------------|--------|
| Heading level | `h2` | record-list-title |
| Heading font-weight | `500` | record-list-title (Bootstrap h2 default, NO `fw-semibold`) |
| Heading line-height | `1.2` | Bootstrap h2 default |
| Heading font-family | `Inter, system-ui, ...` (heredado) | tokens platform |
| Padding lateral del contenedor raiz | `24px` (left + right) | wrap `container-fluid px-4` |
| Gap tabs → heading | `48px` | spacing del LayoutRecordDetail |
| Gap heading → subtitle metadata | `24px` (e.g. "X elementos. Ordenado por...") | record-list-header `mb-4` |
| Gap heading → subtitle descriptivo (texto largo, no metadata) | `≥40px` | excepcion permitida cuando el subtitle es contenido real, no summary |

El atom `Heading` aplica `fw-semibold` (font-weight 600) con `!important` via Bootstrap utility — overrides tipograficos en el SFC custom requieren `!important` para vencer la cascada (font-weight: 500 !important; line-height: 1.2 !important;).

## Why

El usuario ve los tabs como una UI homogenea. Si un tab custom renderiza con heading mas grande/bold (h4 vs h2), distinto peso (600 vs 500), distinto padding lateral (0 vs 24px), o gaps verticales mas comprimidos (16px vs 48px), la pestaña destaca como "diferente" y rompe la jerarquia visual del platform. Caso documentado: en TICKET-012 S12.T8/T8.1/T8.2 (sync UP1 2026-05-06) el `CompositeSectionTreeElement` se descubrio con `<Heading :level="4">`, `border` envolvente, `padding: 16px`, gaps de 16/16, `fw-semibold`. Los usuarios reportaron en la reunion del 2026-05-06: "el tamaño del titulo es distinto, falta espacio entre tabs y titulo, falta espacio entre titulo y descripcion, la tipografia/peso/compresion se ve distinta".

Sin alineacion con el record-list standard:
1. Inconsistencia visual entre tabs (custom vs standard)
2. Heading con jerarquia incorrecta (h4 lee como subtitulo)
3. Densidad visual rota — tabs custom comprimidos, standard espaciados
4. Tipografia diferente delata el origen distinto del componente
5. Padding lateral inconsistente (heading no alineado horizontalmente entre tabs)

## Where

- **Files**: SFCs en `up1/mods/*/components/**/*.vue` o `up1/mods/*/modsComponents/**/*.vue` que sean custom Vueform elements (`defineElement`) renderizados como tabs de `LayoutRecordDetail`.
- **Layers**: ui-components, mods.

## When

- Al crear un SFC custom Vueform que se renderice en un tab de `LayoutRecordDetail`
- Al refactorizar uno existente
- Al hacer code review de PRs de mods que toquen estos SFCs
- Cuando un usuario reporta "el tab se ve distinto" o "el titulo no esta alineado"

## Verification

**Manual via chrome-devtools MCP** (preferido):

```javascript
// Comparar el heading custom vs uno del record-list standard
() => {
  const tabsList = Array.from(document.querySelectorAll('div'))
    .find(d => d.querySelectorAll('[role="tab"]').length > 5);
  const tabsRect = tabsList?.getBoundingClientRect();
  const h = document.querySelector('h2');  // o el heading especifico
  const cs = window.getComputedStyle(h);
  const r = h?.getBoundingClientRect();
  return {
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    x: Math.round(r.x),
    tabs_to_heading: Math.round(r.y - tabsRect.bottom)
  };
}
```

Valores target: `fontWeight: "500"`, `lineHeight: ~37.84px (1.2)`, `x: 164` (en viewport con sidebar visible), `tabs_to_heading: 48`.

**Heuristica grep automatizable**:

```bash
# Detectar SFCs custom Vueform con heading nivel incorrecto
grep -rE "<Heading\s+:level=\"([34-6])\"" up1/mods/*/components/ up1/mods/*/modsComponents/

# Detectar overrides de tipografia sin !important en componentes custom
grep -rE "font-weight:\s*5(00)?\s*;" up1/mods/*/components/*.vue | grep -v "!important"
```

## Source

- **Discovered in**: TICKET-012 S12.T8/T8.1/T8.2 (sync UP1 2026-05-06)
- **Evidence**:
  - `CompositeSectionTreeElement.vue` pre-T8: `<Heading :level="4">`, border envolvente, padding 16px, font-weight 600 (atom Heading default), gaps verticales 16/16. Usuario reporto: "diagramacion no sigue los mismos patrones, tipografia/peso/compresion distinta".
  - Mediciones via `evaluate_script` confirmaron el delta: tab Sesiones x=164/font-weight=500/line-height=37.84px vs Evaluacion x=140/font-weight=600/line-height=39.41px.
  - Resolucion en commits a6ac154 (h2 + sin border), 0a85dcf (padding 32 24 0 + header gap 40 + reset h2 margin), 72c3ca4 (font-weight 500 !important + line-height 1.2 !important).
- **Related**:
  - RULE-mods-014 (atoms del layout-library — no HTML crudo)
  - RULE-mods-015 (i18n via $t — no literales)
  - RULE-platform-001 (CSS inline en SFCs custom Vueform)
  - RULE-platform-002 (style scoped no aplica a render functions inline)
  - RULE-layout-031 (CSS solo `var(--up1-*)` declarados)
- **Excepcion documentada**: gap heading → subtitle puede ser ≥40px (en lugar de 24px) cuando el subtitle es contenido descriptivo real, no summary metadata. Caso: `CompositeSectionTreeElement` tiene un subtitle descriptivo ("Estructura del esquema de evaluación...") que beneficia respiracion mayor, mientras los record-list standard tienen summary metadata densa ("X elementos. Ordenado por...").
