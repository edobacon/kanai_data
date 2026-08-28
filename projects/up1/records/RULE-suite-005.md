---
id: RULE-suite-005
project: up1
type: rule
module: suite
tags:
  - dark-mode
  - theme
  - mutation-observer
  - reactive
---

# Detect dark mode runtime con `document.documentElement.classList.contains('theme-dark')` + `MutationObserver` para reactividad al toggle de tema sin reload

## What

UP1 setea el modo oscuro via clase `theme-dark` en `<html>` por un script inline definido en `nuxt.config.ts` que evalua:

1. `localStorage.getItem('up1-theme')` — preferencia explicita del user (`'dark'` o `'light'`)
2. Si no hay localStorage: `prefers-color-scheme: dark` del OS (auto-mode)
3. Fallback: light mode (clase ausente)

Para que un componente Vue **reaccione al toggle de tema sin necesitar reload**, el patron canonico es:

```typescript
// Vue Options API (Vueform element pattern)
export default defineElement({
  data() {
    return { _isDarkMode: false, _themeObserver: null as MutationObserver | null }
  },

  mounted() {
    this.updateDarkMode()
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      const observer = new MutationObserver(() => this.updateDarkMode())
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
      this._themeObserver = observer
    }
  },

  beforeUnmount() {
    if (this._themeObserver) {
      this._themeObserver.disconnect()
      this._themeObserver = null
    }
  },

  methods: {
    updateDarkMode() {
      if (typeof document === 'undefined') return  // SSR guard
      this._isDarkMode = document.documentElement.classList.contains('theme-dark')
    }
  }
})
```

Y luego se consume el flag reactivo en `computed`:

```typescript
computed: {
  badgeCustomColor(): string {
    if (this._isDarkMode && this.variant === 'secondary') return '#525252'
    return ''
  }
}
```

## Why

CSS native `light-dark()` + `prefers-color-scheme` cubre la mayoria de los casos visuales — pero hay scenarios donde se necesita logic JS condicional al modo (ej. pasar custom color a un atom que NO usa `light-dark()` internamente, calcular ARIA labels distintos, lazy load de assets oscuros).

Sin `MutationObserver`:

- El flag se evalua solo al mount → si el user toggle tema sin reload, el flag queda stale
- Cambios reactivos no propagan a computeds que dependen del modo
- UX rota: el component "no sabe" que se cambio el tema

Con `MutationObserver`:

- Observa el cambio de clase en `<html>` (que el script inline o el toggle UI provoca)
- Trigger del `updateDarkMode()` actualiza el flag
- Computed reactivos re-evaluan automaticamente
- UX correcta: toggle tema sin reload funciona en todas las instancias del component

## Where

- **Files**:
  - Componentes Vue/Vueform en `mods/<mod>/modsComponents/` o `layout/src/components/` que necesitan logica reactiva por tema
- **Layers**: frontend (Vue + DOM)
- **Trigger script**: `up1/nuxt.config.ts` lineas ~51-60 (script inline que setea `theme-dark` class)

## When

Aplica cuando:

- Necesitas logica JS condicional al modo (no solo CSS — para CSS prefiere `light-dark()` nativo)
- El componente puede vivir cuando el user toggle el tema sin reload
- Necesitas pasar valores diferentes a props de un atom child (ej. `customColor` del Badge)

NO aplica si:

- Solo necesitas styling diferente y `light-dark()` CSS cubre el caso (RULE-layout-034 — preferir CSS nativo cuando posible)
- El component vive solo por el tiempo de una mutation rapida que no admite toggle

## Verification

**Smoke en browser**:

1. Abrir component en light mode
2. Verificar render esperado
3. DevTools console: `document.documentElement.classList.add('theme-dark')` (simula toggle)
4. Sin reload: el component debe re-renderear con el override dark
5. `classList.remove('theme-dark')` y verificar vuelta a light

**Code review**:

- [ ] Si el component lee `_isDarkMode` o equivalente → verificar `MutationObserver` en mounted + disconnect en beforeUnmount
- [ ] Sin disconnect → memory leak (observer queda activo entre instancias)
- [ ] Sin SSR guard (`typeof document === 'undefined'`) → falla en build Nuxt

## Source

- **Discovered in**: TICKET-025, Session 3 (S3.T7 fix dark mode contraste secondary via customColor)
- **Evidence**: Para el fix de `customColor` del atom Badge en dark mode + variant secondary, necesitaba detectar dark mode reactivo (no solo CSS). Patron `MutationObserver` implementado en `ActivityStatusBadgeElement.vue` v3. Sin observer: el badge no actualizaba `customColor` cuando el user togglea el tema. Aprendizaje L18 del ticket. Commit `3c31b50` curriculum-design
- **Related**: RULE-layout-034 (anti-patron `:deep(.bg-*)` Bootstrap — prefer prop API), RULE-mods-043 (Vueform Options API), nuxt.config.ts theme script
