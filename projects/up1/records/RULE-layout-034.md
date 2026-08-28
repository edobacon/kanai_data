---
id: RULE-layout-034
project: up1
type: rule
module: layout
tags:
  - css-scoped
  - bootstrap
  - anti-patron
  - silent-fail
  - override
---

# Vue scoped CSS con `:deep(.bg-*)`/`:deep(.text-*)` y clases Bootstrap genericas matchea elementos fuera del componente — usar prop API del atom o wrapper propio

## What

En componentes Vue con `<style scoped>`, las reglas con `:deep()` apuntando a clases **Bootstrap genericas** (`.bg-primary`, `.bg-secondary`, `.bg-success`, `.bg-danger`, `.bg-warning`, `.bg-info`, `.bg-light`, `.bg-dark`, `.text-primary`, etc., `.border-*`, etc.) pueden matchear elementos **fuera del componente** porque esas clases se usan en multiples containers/cards/panels del design system Bootstrap 5.

**Anti-patron BLOQUEANTE** (TICKET-025 S3.T6 — observado empiricamente):

```css
/* ❌ MAL — modifica el fondo de la VISTA COMPLETA, no solo el badge target */
:global(.theme-dark) .asb-wrapper :deep(.bg-secondary) {
  background-color: #525252 !important;
  color: #ffffff !important;
}
```

Resultado observable: el override afecta containers, cards o cualquier elemento con `.bg-secondary` que vive dentro del scope ancestro — NO solo el atom Badge que queriamos modificar. Sintoma: el fondo de la pagina completa cambia, badges no cambian o cambian incoherentes.

**3 patrones correctos** segun el caso:

### Patron A — Prop API del atom (preferido)

Si el atom (Badge, Card, etc.) expone un prop como `customColor`, `customStyle`, `customBg`, usar ese prop directo:

```vue
<!-- ✅ Usar prop API del atom Badge -->
<Badge :variant="variant" :custom-color="darkModeOverride" :label="label" />
```

```typescript
computed: {
  darkModeOverride(): string {
    if (this._isDarkMode && this.variant === 'secondary') return '#525252'
    return ''  // sin override
  }
}
```

El atom Badge ya tiene la logica `customColor ? 'badge-custom' : variantClass` — el dev del consumer no rompe encapsulacion.

### Patron B — Wrapper propio sin reusar el atom (cuando no hay prop adecuado)

Crear un componente Vue propio con CSS proprio (NO reusa el atom). Acepta codigo duplicado a cambio de control total del DOM y scope CSS limpio.

### Patron C — `:deep()` con selector especifico del atom

Si DEBES usar `:deep()`, prefiere selectores con atributo o clase **propia del atom** (no clase Bootstrap):

```css
/* ✅ Si el atom expone .badge[role="status"] o .badge[data-variant="..."] */
.my-wrapper :deep(.badge[role="status"][data-variant="secondary"]) {
  /* override scoped al atom Badge, no a cualquier elemento Bootstrap */
}
```

PERO: requiere que el atom exponga atributos identificables. Si no, fallback a A o B.

## Why

CSS scoped en Vue 3 compila `<style scoped>` a selectores con `[data-v-hash]`. Pero `:deep()` rompe ese scope deliberadamente para alcanzar componentes hijos. Cuando combinas `:deep(.bg-secondary)` con un selector ancestro como `:global(.theme-dark) .my-wrapper`, el compilado genera algo como:

```css
.theme-dark .my-wrapper[data-v-xxx] .bg-secondary { /* ... */ }
```

Que en runtime matchea **cualquier elemento `.bg-secondary` descendiente** del `.my-wrapper[data-v-xxx]`. Si el wrapper esta dentro de un container con su propio `.bg-secondary` (panel, card, navbar fragment), o si el atom Badge se renderea en multiples lugares dentro del wrapper, el override afecta a todos.

**El problema fundamental**: Bootstrap genericas (`.bg-*`) son clases globales reusadas en TODO el design system. Usarlas como selector de override scoped es como hacer `[data-id="any"]` — sin scope efectivo.

## Where

- **Files**: cualquier SFC del mod con `<style scoped>` en `mods/<mod>/modsComponents/`
- **Layers**: frontend (Vue scoped CSS + Bootstrap 5)

## When

Aplica siempre que necesites override visual de un componente atom child en CSS scoped. Especialmente:

- Overrides condicionales por dark mode / light mode
- Overrides condicionales por estado (active, disabled, error)
- Overrides cosmeticos puntuales

**Antes de escribir `:deep(.bg-*)` con clase Bootstrap, preguntar**:

1. ¿El atom expone un prop API para esto? → Patron A
2. Si no, ¿realmente necesito reusar el atom o puedo wrappear con CSS propio? → Patron B
3. Si DEBO usar `:deep()`, ¿el atom expone selector identificable propio? → Patron C
4. Si nada de lo anterior aplica → reconsiderar el approach, posiblemente requiere extension al atom (alto blast radius cross-mod)

## Verification

**Code review checklist**:

- [ ] Grep `:deep(\.bg-` / `:deep(\.text-` / `:deep(\.border-` en SFCs del mod → ningun match con clases Bootstrap genericas
- [ ] Si hay `:deep()` valido (Patron C), usa selector propio del atom no clase Bootstrap

**Smoke en browser**: tras aplicar override visual via CSS scoped, abrir el componente en una pagina con multiples instancias del atom y verificar que SOLO el target cambia. Si elementos no-target tambien cambian → anti-patron, refactor a Patron A o B.

## Source

- **Discovered in**: TICKET-025, Session 3 (S3.T7 fix dark mode contraste secondary — primer intento fallido)
- **Evidence**: Para fix de contraste perceptual del variant `secondary` en dark mode, escribi:
  ```css
  :global(.theme-dark) .asb-wrapper :deep(.bg-secondary) { background-color: #525252 !important; color: #fff !important; }
  ```
  Sintoma observable: cambio el fondo de la vista completa, no solo el badge. Reverti. Fix correcto: usar prop `customColor` del atom Badge (Patron A) — control directo, scope contenido. Aprendizaje L17 del ticket. Guardado tambien como feedback memory global en `/Users/edobacon/.claude/projects/-Users-edobacon-Workspace-up1/memory/feedback_vue_scoped_deep_bootstrap_classes.md`. Commit `3c31b50` curriculum-design (fix con customColor)
- **Related**: RULE-layout-001 (atoms encapsulan Bootstrap), RULE-mods-043 (Vueform Options API no mezclar con Composition)
