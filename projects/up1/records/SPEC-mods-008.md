---
id: SPEC-mods-008
project: up1
type: doc
module: mods
tags:
  - estilos
  - theme
  - tokens
  - capas
  - objectName
---

# Estilos CSS

## Preparacion

```bash
# Crear carpetas de capas segun necesidad
mkdir -p mods/{mod}/css/1-theme
mkdir -p mods/{mod}/css/2-objectName
mkdir -p mods/{mod}/css/3-viewType
```

## Despues de CADA receta

```bash
npm run sync
# CSS se copia a suite/css/mods/ — hard refresh en browser para ver cambios
```

## Reglas criticas

- 5 capas semanticas en orden de cascada: `1-theme` → `2-objectName` → `3-viewType` → `4-objectId` → `5-contextId`
- **SIEMPRE** `var(--up1-*)` para tokens de plataforma, con fallback hardcodeado
- **NUNCA** Bootstrap directo (`btn`, `h2`, clases utilitarias)
- **NUNCA** valores hardcodeados sin token (`color: #212529`, `padding: 16px`)
- Tokens del mod usan prefijo `--{mod}-*` y delegan a `--up1-*` como base
- Sync destino: `suite/css/mods/` — nunca editar directamente el destino

---

### CSS-01: Crear tokens del mod
**Pre:** carpeta `mods/{mod}/css/1-theme/` creada  
**In:** nombre del mod (kebab-case), tokens especificos del dominio  
**Pasos:**
1. Crear `mods/{mod}/css/1-theme/{mod}.css`:
```css
@layer theme {
  :root {
    /* Tokens del mod delegando a UP1 con fallback */
    --{mod}-card-bg: var(--up1-bg-primary, #ffffff);
    --{mod}-card-border: var(--up1-border-color, #d3d3d3);
    --{mod}-card-radius: var(--up1-border-radius-md, 8px);
    --{mod}-card-shadow: var(--up1-shadow-sm, 0 1px 3px rgba(0,0,0,0.1));

    /* Tokens semanticos del dominio */
    --{mod}-risk-low: var(--up1-color-success-500, #22946e);
    --{mod}-risk-medium: var(--up1-color-warning-500, #f59e0b);
    --{mod}-risk-high: var(--up1-color-danger-500, #9c2121);
    --{mod}-risk-critical: var(--up1-color-rose-500, #e11d48);

    /* Espaciado interno del mod */
    --{mod}-spacing-card: var(--up1-spacing-md, 1rem);
    --{mod}-header-height: 56px;
  }
}
```
2. `npm run sync` — se copia a `suite/css/mods/`

**Validar:** tokens visibles en DevTools bajo `:root`; cambiar el tema de la plataforma (light/dark) actualiza los valores de `--up1-*` y los del mod en cascada  
**Doc:** `specs/up1/core/style-guide.md` § 2, § 3, § 14

---

### CSS-02: Crear estilos por objeto
**Pre:** `CSS-01` ejecutado; objeto `MiObjeto` existe  
**In:** nombre del objeto (kebab-case), estilos especificos del objeto  
**Pasos:**
1. Crear `mods/{mod}/css/2-objectName/mi-objeto.css`:
```css
@layer objectName {
  /* Contenedor principal del objeto */
  .mi-objeto-card {
    background: var(--{mod}-card-bg);
    border: 1px solid var(--{mod}-card-border);
    border-radius: var(--{mod}-card-radius);
    box-shadow: var(--{mod}-card-shadow);
    padding: var(--{mod}-spacing-card);
  }

  /* Badge de riesgo — usa tokens semanticos del mod */
  .mi-objeto-risk-badge {
    display: inline-flex;
    align-items: center;
    padding: var(--up1-spacing-xs, 0.25rem) var(--up1-spacing-sm, 0.5rem);
    border-radius: var(--up1-border-radius-full, 9999px);
    font-size: var(--up1-font-size-xs, 0.75rem);
    font-weight: var(--up1-font-weight-semibold, 600);
  }

  .mi-objeto-risk-badge--low {
    background: color-mix(in srgb, var(--{mod}-risk-low) 15%, transparent);
    color: var(--{mod}-risk-low);
  }

  .mi-objeto-risk-badge--high {
    background: color-mix(in srgb, var(--{mod}-risk-high) 15%, transparent);
    color: var(--{mod}-risk-high);
  }

  /* Header del objeto */
  .mi-objeto-header {
    display: flex;
    align-items: center;
    gap: var(--up1-spacing-sm, 0.5rem);
    margin-bottom: var(--up1-spacing-md, 1rem);
    color: var(--up1-text-primary);
    font-size: var(--up1-font-size-lg, 1.125rem);
    font-weight: var(--up1-font-weight-semibold, 600);
  }
}
```
2. `npm run sync`

**Validar:** clases `.mi-objeto-card` y `.mi-objeto-risk-badge--low/high` visibles en DevTools aplicadas al componente; colores cambian con dark mode  
**Doc:** `specs/up1/core/style-guide.md` § 2 (capas), § 4 (colores), § 14

---

### CSS-03: Crear estilos por tipo de vista
**Pre:** `CSS-01` ejecutado; layouts del mod definidos  
**In:** tipo de vista (`recordlist`, `recorddetail`, `wizard`, `modal`)  
**Pasos:**
1. Crear `mods/{mod}/css/3-viewType/{tipo}.css` — sobreescribe `objectName` para ese tipo de vista:
```css
@layer viewType {
  /* Estilos especificos de RecordList del mod */
  .{mod}-recordlist .mi-objeto-card {
    /* En lista: version compacta sin sombra */
    box-shadow: none;
    border-bottom: 1px solid var(--{mod}-card-border);
    border-radius: 0;
    padding: var(--up1-spacing-sm, 0.5rem) var(--{mod}-spacing-card);
  }

  .{mod}-recordlist .mi-objeto-card:last-child {
    border-bottom: none;
  }

  /* Estilos especificos de RecordDetail del mod */
  .{mod}-recorddetail .mi-objeto-card {
    /* En detalle: version completa con sombra elevada */
    box-shadow: var(--up1-shadow-md, 0 4px 6px rgba(0,0,0,0.1));
    margin-bottom: var(--up1-spacing-lg, 1.5rem);
  }

  /* Header de seccion en wizard del mod */
  .{mod}-wizard .mi-objeto-header {
    border-bottom: 2px solid var(--up1-color-primary, #0a808c);
    padding-bottom: var(--up1-spacing-sm, 0.5rem);
    margin-bottom: var(--up1-spacing-lg, 1.5rem);
  }
}
```
2. Para aplicar la clase de tipo en el componente Vue, usar el tipo de layout como clase en el contenedor:
```vue
<div :class="`${modName}-${layoutType}`">
  <!-- contenido -->
</div>
```
3. `npm run sync`

**Validar:** en RecordList, las cards aparecen compactas sin sombra; en RecordDetail, con sombra elevada; la especificidad de `viewType` sobreescribe `objectName` sin `!important`  
**Doc:** `specs/up1/core/style-guide.md` § 2 (capas semanticas), § 14
