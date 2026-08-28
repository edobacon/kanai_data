---
id: DOC-kb-sp7-curriculum-design-auditoria-tokens-color-wcag
project: up1
type: doc
---

# curriculum-design · Auditoria de tokens de color + contraste WCAG 2.1 AA

> Doc local del platform up1 (no se commitea al repo de codigo). Origen: revision del
> **PR #32 de `curriculum-design`** ("Consideraciones con cambios consistentes de tokens y
> ultimos cambios en filtros", autor Nelson Cornejo, rama `fix/colors&filters-consideration`,
> base `develop@de102c4`). La revision se amplio a una auditoria completa del uso de color
> del mod contra el catalogo real de tokens de la plataforma, mas un calculo de contraste
> WCAG 2.1 AA de los pares que el PR modifica.

**Fecha:** 2026-07-30
**Rama auditada:** `origin/develop` de `curriculum-design` (tip `de102c4`, ya incluye PR #31 / UPONE-1378)
**Alcance:** `mods/curriculum-design/modsComponents/**` (54 archivos `.vue` + `.ts`, excluidos `.spec.ts` y `.stories.ts`)
**Estado:** analisis cerrado. Principio rector y decisiones de las dos tensiones **tomadas**
(ver "Decisiones tomadas"). **Ejecucion pendiente**, no se toco codigo.

---

## Resumen ejecutivo

1. **`develop` esta al dia.** El tip de `origin/develop` es exactamente la base del PR #32,
   e incluye el merge de UPONE-1378. El PR no necesita rebase.
2. **El PR #32 no rompe nada: corrige tres bugs reales.** Los tres tokens que reemplaza
   (`--up1-primary`, `--up1-on-primary`, `--up1-color-danger`) **no existen** en ninguna capa
   de tokens que se cargue en runtime. Los estilos afectados se renderizaban roto o con hex
   hardcodeado.
3. **El PR mejora el contraste.** En tema claro, el bloque de error de `CurriculumMesh` pasa de
   **4.41:1 (FAIL AA)** a **7.22:1 (PASS)**. El boton primario de `CompositeSectionTree` pasa de
   invisible (fondo transparente) a 4.69:1 claro / 9.35:1 oscuro.
4. **Quedan 16 referencias a tokens inexistentes** que el PR no cubre, **3 de ellas en
   `RequirementEditor`**, componente nuevo de UPONE-1378.
5. **Dos hallazgos WCAG nuevos, con fix ya decidido y ejecucion pendiente:** los links del
   `RichTextRenderer` fallan AA dentro de `<th>`, `<code>` y `<pre>` en tema claro (3.59:1 y
   3.13:1, **regresion que introduce el PR**), y el texto de error de `CurriculumMesh` falla
   marginal en tema oscuro (4.45:1). Ver decisiones D3 y D2.
6. **Un bloque NO se debe tocar:** los 15 hex de `useActivityStatusBadge.ts` son fixes WCAG
   auditados con axe-core. Tokenizarlos romperia el AA validado.

---

## Principio rector (decision del dev, 2026-07-30)

> **Los colores que entrega up1 son la base. El mod los referencia, no los replica.**
> Ningun color hardcodeado en el mod puede duplicar un color que la plataforma ya expone como
> token. Si el valor existe en la escala de up1, se usa el token; si no existe, se evalua si el
> caso justifica un color propio o si falta un token en CORE.

Esto convierte la auditoria en una regla verificable y desplaza el criterio: la pregunta no es
"se ve bien?" sino **"este literal replica un color de up1?"**. Bajo esa regla, cada color del
mod cae en una de cuatro categorias:

| Cat. | Definicion | Accion | Refs |
|---|---|---|---|
| **A** | Replica un color de up1 y **existe token exacto** | Reemplazar por el token | 39 |
| **B** | Es un fallback dentro de `var()` cuyo token **si existe** | Quitar el fallback (es codigo muerto) | ~72 |
| **C** | Replica un color de up1 pero esta **fijado por tema a proposito** (WCAG) | **No tocar.** Excepcion documentada | 15 |
| **D** | **No replica** ningun color de up1 (funcion propia, o no hay token) | Se queda, con comentario que explique por que | 5 + comentarios |

El detalle por categoria esta en la Parte 2. Las dos tensiones que la regla no resuelve sola
estan en "Tensiones" al final de la Parte 3, **ya resueltas** por decision del dev.

---

## Decisiones tomadas (2026-07-30)

| # | Tema | Decision | Donde se ejecuta |
|---|---|---|---|
| **D1** | Principio rector | Los colores de up1 son la base; el mod los referencia y no los replica. Ningun literal hardcodeado puede duplicar un color que la plataforma expone como token. | Transversal |
| **D2** | Bloque de error de `CurriculumMesh` en dark (tension **T2**) | **Fondo a `--up1-color-danger-50` Y texto a `--up1-text-primary`**, conservando el rojo en el `border-left` y el icono. Se hacen **los dos cambios juntos**; el fondo solo empeoraria el contraste. | Fase 3.1 |
| **D3** | Links del `RichTextRenderer` en `<th>`/`<code>`/`<pre>` (hallazgo **W-A**) | **`color: inherit`** en esos tres selectores. Sube a 10-13:1 en ambos temas y el subrayado existente sigue marcando el link (SC 1.4.1). Se descarta `light-dark()` inline para no introducir el primer CSS por tema del mod. | Fase 3.2 |
| **D4** | Overrides WCAG del badge (tension **T1**) | **No se tocan.** Excepcion explicita y documentada. | Fase 5.1 |
| **D5** | Alcance del PR #32 | No se le pide el cambio del tinte. Solo queda aclarar el tema de los filtros ausentes del diff. | Fase 0 |
| **D6** | Ejecucion | **No se ejecuta todavia.** Este documento queda como registro; las fases se abordan en un ticket propio cuando se decida el momento. | — |

---

## Metodo

La auditoria es reproducible. Fuentes de verdad consultadas:

| Capa | Archivo | Rol |
|---|---|---|
| Tokens base | `layout/src/styles/design-tokens/*.css` | Escalas de color, radios, sombras, tipografia |
| Tema de Suite | `suite/css/1-theme/theme-tokens.css` | Sobrescribe la base con `light-dark()` |
| Aliases de Suite | `suite/css/1-theme/default.css`, `dark.css` | Aliases (`--up1-radius-*`) y mapeo Vueform |
| Carga en Suite | `suite/nuxt.config.ts:88` | Importa `design-tokens/index.css` |
| Carga en Storybook del mod | `mods/curriculum-design/.storybook/preview.ts:14-29` | Importa `layout/src/styles/main.css` + `theme-tokens.css` + `default.css` + `dark.css` |

**Consecuencia importante:** ambos entornos (Suite y Storybook del mod) cargan el stack completo
de tokens. Por lo tanto, **todo fallback dentro de `var(--token, fallback)` cuyo token exista es
codigo muerto**, y todo token que no exista cae siempre al fallback.

**Trampa detectada durante la auditoria.** Existe un `layout/src/assets/styles/main.css`
huerfano que si define `--up1-primary: #0a808c`. **Nadie lo importa.** El `main.css` que
realmente se carga es `layout/src/styles/main.css`, que hace `@import './design-tokens/index.css'`
y no define `--up1-primary`. Es facil concluir mal que el token existe si se busca por nombre de
archivo en vez de seguir la cadena de imports.

---

## Parte 1: que trae el PR #32

Un solo commit (`5374ac3e`), 4 archivos, +10 / -10, **puro CSS, cero logica**.

| Archivo | Cambio |
|---|---|
| `CompositeSectionTree/CompositeSectionTreeElement.vue:1172-1174` | `--up1-primary` → `--up1-color-primary`, `--up1-on-primary` → `--up1-text-inverse` |
| `IconPicker/IconPickerElement.vue:296,301` | `--up1-primary` → `--up1-color-primary` |
| `RichTextRenderer/RichTextRendererElement.vue:161` | `--up1-primary` → `--up1-color-primary` |
| `CurriculumMesh/CurriculumMeshElement.vue:1855,2123,2168,2208` | `--up1-color-danger` → `--up1-color-danger-500` |

### Por que es un fix y no un rename cosmetico

| Token viejo | Definido? | Que pasaba en runtime |
|---|---|---|
| `--up1-primary` (5 usos) | **No** | Sin fallback, el `var()` queda invalido at computed-value time. `background` (no heredable) cae a `transparent`, `border-color` a `currentColor`, `color` (heredable) hereda del padre. **El boton primario del arbol se veia transparente.** |
| `--up1-on-primary` (1 uso) | **No** | Idem: el texto del boton heredaba el color del contenedor. |
| `--up1-color-danger` (4 usos) | **No** (existe la escala `-50/-100/-500/-600/-700`, no el alias pelado) | Vivia del fallback hardcodeado `#dc2626`. |

Los tres tokens nuevos si existen y son los correctos:

- `--up1-color-primary` = `primary-500` = `light-dark(#0a808c, #2dd4bf)`
- `--up1-text-inverse` = `light-dark(#ffffff, #1a1a1a)`
- `--up1-color-danger-500` = `light-dark(#9c2121, #ef4444)`

### El barrido de esos tres tokens queda completo

El PR cubre **exactamente** los 5 + 1 + 4 usos que quedaban en el mod. Post-merge la convencion
queda unificada en `--up1-color-primary` (34 usos) y `--up1-text-inverse` (10 usos), y coincide con
lo que ya prescribe la doc del propio mod:

- `docs/guides/composite-section-tree.md:230`
- `docs/guides/creating-vueform-element.md:691`

Ambas piden literal `outline 2px solid var(--up1-color-primary)`, sin fallback, igual que el PR.

**Referencia interna de lo que ya estaba bien hecho:** `ColorPicker/useColorPicker.ts` define un
set curado de tokens semanticos (DEC-LOCAL-01), verificado contra `colors.css`, y ya usaba
`--up1-color-danger-500`. El PR alinea el resto del mod con ese canon.

### Observacion de proceso

El titulo del PR dice "y ultimos cambios en filtros", pero el diff **no tiene una sola linea de
filtros**. O falta pushear ese trabajo, o el titulo viene heredado del nombre de rama
(`fix/colors&filters-consideration`). Confirmar con el autor antes de mergear.

**Post-merge hay que correr `npm run sync`:** las copias sincronizadas en
`layout/src/modsComponents/` y `suite/modsComponents/` todavia tienen los tokens viejos.

---

## Parte 2: hallazgos del mod completo

Numeros medidos sobre `origin/develop`:

- **41 tokens distintos referenciados**, de los cuales **7 no existen** (26 referencias).
- **131 usos de `var(--token, fallback)`**, de los cuales **~72 tienen fallback desalineado**
  con el valor real del token.
- **42 colores hardcodeados sueltos**, en 5 archivos.

El PR #32 resuelve 10 de las 26 referencias rotas. **Quedan 16.**

### H1. Tokens que no existen (16 refs) · severidad: bug

| Uso actual | Token correcto | Cambia el pixel? |
|---|---|---|
| `var(--up1-radius, 6px)` x11 (`CurriculumMesh`) | `--up1-radius-md` | **No.** `--up1-radius-md` = `--up1-border-radius` = `0.375rem` = 6px exacto. El mismo archivo ya usa `--up1-radius-md` y `--up1-radius-sm` correctamente en las lineas 1584, 1662 y 1704. Inconsistencia interna pura. |
| `var(--up1-color-primary-subtle, #f0f9fa)` x2 + `#e6f4f5` x1 (`RequirementEditor:1074,1078,1199`) | `--up1-color-primary-50` | Si, leve (`#f0f9fa` → `#E7F2F3`). Hoy ademas **no reacciona al tema oscuro**: queda casi blanco sobre fondo oscuro. Y hay **dos fallbacks distintos para el mismo token**, senal de copy-paste divergente. |
| `var(--up1-color-success, #16a34a)` (`RequirementEditor:1106`) | `--up1-color-success-500` | Si: `#16a34a` → `#22946e`. |
| `var(--up1-color-primary-bg, rgba(10,128,140,.08))` (`CurriculumMesh:1675`, ghost de drop) | `--up1-color-primary-50` | Si, leve. |

**Nota:** las lineas de `RequirementEditor` son de UPONE-1378, es decir codigo nuestro. El fix
conviene que lo hagamos nosotros porque el smoke visual de esa seccion lo conocemos.

### H2. Colores de marca derivados a mano (6 refs) · severidad: consistencia

| Actual | Propuesta | Nota |
|---|---|---|
| `box-shadow: 0 0 0 3px rgba(10, 128, 140, .15)` x4 (`CurriculumMesh:1885,1950,1970,2153`) | **`var(--up1-shadow-focus)`** | Son los **anillos de foco** de `.aem-input`, `.ap-search`, `.ap-depto-select` y `.eem-input`. La plataforma tiene el token exacto: `--up1-shadow-focus: 0 0 0 3px var(--up1-focus-ring-color)` con `--up1-focus-ring-color: light-dark(rgba(10,128,140,0.25), rgba(45,212,191,0.4))`. **Geometria identica** (`0 0 0 3px`). Ver la nota de a11y abajo. |
| `rgba(220, 38, 38, .06)` x2 (`CurriculumMesh:2171,2207`) | `--up1-color-danger-50`, **condicionado** | Es el tinte de fondo de los bloques de error. Tokenizarlo solo **empeora** el contraste en tema oscuro. Ver tension **T2**. |

**Nota de a11y sobre el anillo de foco.** El halo por si solo tiene contraste bajisimo contra el
fondo (1.22:1 con el alpha actual de .15 en claro, 1.15:1 en oscuro). SC 1.4.11 se cumple por el
**`border-color: var(--up1-color-primary)`** que acompana cada `:focus` (4.69:1 claro / 9.35:1
oscuro), no por el halo. Pasar al token es una mejora clara igual: el halo sube a 1.40:1 en claro y
a **2.52:1 en oscuro**, donde hoy es practicamente invisible.

**Trampa a evitar.** Si en algun caso hace falta un tinte de marca y no un anillo de foco, **no
usar** `rgba(var(--up1-color-primary-rgb), .15)`. Ese token existe solo en
`layout/src/styles/design-tokens/colors.css:105` como triplete fijo `10, 128, 140`, y
`theme-tokens.css` **no lo sobrescribe**, asi que en tema oscuro daria el teal claro equivocado.
Para tinte usar `--up1-color-primary-50` o `-100`, que si flipean.

### H3. Sombras y overlays (9 refs) · severidad: consistencia

La plataforma tiene escala completa y theme-aware: `--up1-shadow-xs..2xl`, `-dropdown`, `-modal`,
`-dragging`, `-popover`, mas los sub-tokens de color `--up1-shadow-color-*`
(`light-dark(rgba(0,0,0,.1), rgba(0,0,0,.5))` y variantes).

Recomendacion transversal: **conservar la geometria y tokenizar solo el color**, porque los tokens
compuestos traen otro offset/blur y cambiarlos altera el look.

| Actual | Propuesta | Nota |
|---|---|---|
| `0 2px 8px rgba(0,0,0,.18)` (tooltip, `CompositeSectionTree:1081`) | `var(--up1-shadow-dropdown)` | Geometria identica (`0 2px 8px`). Alpha pasa a .12 claro / .6 oscuro. Unico swap directo limpio. |
| `0 4px 12px rgba(0,0,0,0.2)` (drag, `CompositeSectionTree:916`) | `0 4px 12px var(--up1-shadow-color-intense)` | `--up1-shadow-dragging` cambiaria la geometria a `0 8px 24px`, sombra visiblemente mas grande. |
| `0 4px 12px rgba(0,0,0,.2)` (drag, `CurriculumMesh:1679`) | idem | |
| `0 8px 32px rgba(0,0,0,0.18)` (modal, `CompositeSectionTree:1214`) | `0 8px 32px var(--up1-shadow-color-strong)` | `--up1-shadow-modal` es `0 10px 40px`. |
| `rgba(0,0,0,.08)` x2 (`CurriculumMesh:1663,1678`) | ya son fallback de `--up1-shadow-sm` | Solo el fallback esta desalineado. Trivial. |
| `rgba(0, 0, 0, 0.5)` (backdrop del modal, `CompositeSectionTree:1195`) | **no hay token** | Los `--up1-overlay-*` tienen semantica invertida (`overlay-white` en dark vale `rgba(0,0,0,.3)`). Crear `--up1-overlay-backdrop` toca `layout/` (CORE) y requiere permiso explicito. **Dejar como esta.** |
| `drop-shadow(0 0 1.5px rgba(0,0,0,0.7))` (`ColorPicker:275`) | **no tocar** | Es el contorno de legibilidad del check sobre un swatch de color arbitrario. Debe ser fijo. |

### H4. Fallbacks desalineados (~72 refs) · severidad: deuda

El mod arrastra grises de Tailwind como fallback de la rampa neutra de up1, que es gris puro
sin tinte azul:

| Token | Valor real (claro) | Fallback en el mod | Usos |
|---|---|---|---|
| `--up1-text-muted` | `#9b9b9b` (gray-600) | `#6b7280` | 28 |
| `--up1-text-primary` | `#262626` (gray-900) | `#111827` | 11 |
| `--up1-text-secondary` | `#525252` (gray-700) | `#374151` | 6 |
| `--up1-bg-secondary` | `#e1e1e1` (gray-100) | `#f3f4f6` | 5 |
| `--up1-border-color` | `#d3d3d3` (gray-200) | `#e5e7eb` | 6 |
| `--up1-border-color` | `#d3d3d3` | `#f1f5f9` | 2 |
| `--up1-bg-tertiary` | `#d3d3d3` (gray-200) | `#e5e7eb` | 2 |
| `--up1-gray-400` | `#b6b6b6` | `#9ca3af` | 1 |
| `--up1-table-row-hover` | `gray-50` / `bg-secondary` | `#f0f9fa` | 1 |

Si estan alineados: los 20 de `var(--up1-color-primary, #0a808c)`, los 12 de
`var(--up1-border-color, #d3d3d3)`, los 9 de `var(--up1-bg-primary, #fff)`, los 3 de
`var(--up1-text-inverse, #fff)`, los 2 de `var(--up1-color-success-500, #22946e)` y el de
`--up1-color-warning-600, #d97706`.

**Postura recomendada: quitar el fallback donde el token existe**, en vez de alinearlo. Un
fallback desalineado es peor que ninguno, porque enmascara el fallo de carga y pinta un color
ajeno al sistema. La doc del mod ya prescribe la forma sin fallback.

### H5. Lo que NO se debe tocar (17 refs)

**1. `ActivityStatusBadge/useActivityStatusBadge.ts` (15 hex, lineas 71-89).**

`STATUS_OVERRIDES` es una matriz de fixes WCAG por `(variant, theme)`, validada empiricamente con
axe-core 4.11.1, documentada en `SPEC-009-hu4-followup-a11y-contrast-badge` (TICKET-027), con todas
las combinaciones a ratio >= 4.5:1 contra texto blanco.

Cada hex es deliberadamente **la mitad "equivocada" del `light-dark()`**, fijada igual en ambos
temas para garantizar texto blanco legible:

| Hex | Que es | Por que no se puede tokenizar |
|---|---|---|
| `#b45309` | `warning-700` en **claro** | `warning-700` en oscuro es `#fbbf24` (ambar claro): **falla** con texto blanco |
| `#15803d` | `success-700` en **oscuro** | `success-700` en claro es `#156147` |
| `#0f766e` | `primary-800` en **oscuro** | `primary-700` da 3.74:1 (falla), `-800` da 5.47:1 |
| `#b91c1c` | `danger-700` en **oscuro** | solo se aplica en dark |
| `#525252` | `gray-700` en **claro** | `gray-700` en oscuro es `#e5e5e5`, invertiria |

Pasarlos a `var()` los haria flipear por tema y **romperia el AA auditado**. Solo se podrian
tokenizar si CORE agregara tokens no flipeantes (`--up1-badge-bg-warning`, etc.), lo que es un
cambio de plataforma, no del mod.

**2. `#ffffff` del `stroke` del SVG del check (`ColorPicker:74`)** y el `drop-shadow` de
`ColorPicker:275`: van sobre un swatch de color arbitrario elegido por el usuario, tienen que ser
fijos.

**3. Hex dentro de comentarios** (documentan el por que de cada override, no son CSS):
`CompositeSectionTree:924-931` (`#9b9b9b`, `#d4d4d4`, `#21498a`, `#38bdf8`),
`CurriculumMesh:30` (`#9b9b9b`), `ReglaUnificadaView/RequirementTreeNode.ts:251` (`#9b9b9b`).

---

## Parte 3: auditoria WCAG 2.1 AA de los colores del PR

### Umbrales aplicados

| Criterio | Requisito | Aplica a |
|---|---|---|
| SC 1.4.3 Contrast (Minimum) | **4.5:1** | Texto normal (< 18.66px bold o < 24px) |
| SC 1.4.3 | 3:1 | Texto grande |
| SC 1.4.11 Non-text Contrast | **3:1** | Bordes de componentes UI, indicadores de foco |

Todos los tamanos de fuente involucrados estan por debajo del umbral de "texto grande"
(`.cst-btn` 14px, `.eem-error` .82rem ≈ 13px, `.eem-required` .72rem ≈ 11.5px), asi que **todos
los pares de texto exigen 4.5:1**.

### Validacion del metodo

Antes de reportar, el calculador se valido contra los numeros de axe-core que ya estan
documentados en el mod (`useActivityStatusBadge.ts`, comentario de `STATUS_OVERRIDES`):

| Par | Doc del mod | Calculado |
|---|---|---|
| `primary-700` dark (`#0d9488`) vs blanco | 3.74:1 | **3.74:1** |
| `primary-800` dark (`#0f766e`) vs blanco | 5.47:1 | **5.47:1** |

Coincidencia exacta. Los numeros de abajo son confiables.

### Resultados: tema CLARO

| Veredicto | Ratio | Min | Componente | Par |
|---|---|---|---|---|
| PASS | 4.69:1 | 4.5 | `CST .cst-btn--primary` | `text-inverse` sobre `color-primary` |
| PASS | 4.69:1 | 3.0 | `CST .cst-btn--primary` | borde `color-primary` vs `bg-primary` |
| PASS | 4.69:1 | 3.0 | `IconPicker :focus-visible` | outline vs `bg-primary` (contenedor) |
| PASS | 3.59:1 | 3.0 | `IconPicker :focus-visible` | outline vs `bg-secondary` (celda) |
| PASS | 3.13:1 | 3.0 | `IconPicker --selected` | borde vs `bg-tertiary` (celda) |
| PASS | 4.69:1 | 4.5 | `RTR link` | `color-primary` sobre `bg-primary` (`.rtr-card`) |
| **FAIL** | **3.59:1** | 4.5 | `RTR link` en `<th>` | `color-primary` sobre `bg-secondary` |
| **FAIL** | **3.13:1** | 4.5 | `RTR link` en `<code>`/`<pre>` | `color-primary` sobre `bg-tertiary` |
| PASS | 7.92:1 | 4.5 | `Mesh .aem/.eem-required` | `danger-500` sobre `bg-primary` |
| PASS | 7.22:1 | 4.5 | `Mesh .eem-error` | `danger-500` sobre tinte `rgba(220,38,38,.06)` |
| ~~FAIL~~ | ~~4.41:1~~ | 4.5 | `Mesh .eem-error` **ANTES del PR** | `#dc2626` sobre el mismo tinte |
| PASS | 7.22:1 | 3.0 | `Mesh .pbm-list__item` | `border-left danger-500` vs tinte |
| PASS | 13.81:1 | 4.5 | `Mesh .pbm-list__label` | `text-primary` sobre tinte |

### Resultados: tema OSCURO

| Veredicto | Ratio | Min | Componente | Par |
|---|---|---|---|---|
| PASS | 9.35:1 | 4.5 | `CST .cst-btn--primary` | `text-inverse` sobre `color-primary` |
| PASS | 9.35:1 | 3.0 | `CST .cst-btn--primary` | borde vs `bg-primary` |
| PASS | 9.35:1 | 3.0 | `IconPicker :focus-visible` | outline vs `bg-primary` |
| PASS | 7.50:1 | 3.0 | `IconPicker :focus-visible` | outline vs `bg-secondary` |
| PASS | 6.11:1 | 3.0 | `IconPicker --selected` | borde vs `bg-tertiary` |
| PASS | 9.35:1 | 4.5 | `RTR link` | sobre `bg-primary` |
| PASS | 7.50:1 | 4.5 | `RTR link` en `<th>` | sobre `bg-secondary` |
| PASS | 6.11:1 | 4.5 | `RTR link` en `<code>`/`<pre>` | sobre `bg-tertiary` |
| PASS | 4.62:1 | 4.5 | `Mesh .aem/.eem-required` | `danger-500` sobre `bg-primary` |
| **FAIL** | **4.45:1** | 4.5 | `Mesh .eem-error` | `danger-500` sobre tinte `rgba(220,38,38,.06)` |
| ~~FAIL~~ | ~~3.46:1~~ | 4.5 | `Mesh .eem-error` **ANTES del PR** | `#dc2626` sobre el mismo tinte |
| PASS | 4.45:1 | 3.0 | `Mesh .pbm-list__item` | `border-left` vs tinte |
| PASS | 16.03:1 | 4.5 | `Mesh .pbm-list__label` | `text-primary` sobre tinte |

### Veredicto WCAG del PR #32

**Neto positivo.** El PR corrige un fallo AA real y no introduce ninguno nuevo en el contexto
principal de cada componente.

| # | Efecto |
|---|---|
| W1 | **Corrige un FAIL AA en claro:** `.eem-error` pasa de 4.41:1 a **7.22:1**. En oscuro mejora de 3.46:1 a 4.45:1 (sigue marginalmente corto, ver W3). |
| W2 | **Corrige un fallo de SC 1.4.11:** el anillo de foco de `IconPicker` antes resolvia a `currentColor` (indeterminado). Ahora 3.59-4.69:1 en claro y 6.11-9.35:1 en oscuro, todos >= 3. |
| W3 | **El boton primario de `CompositeSectionTree`** deja de ser invisible: 4.69:1 claro / 9.35:1 oscuro, ambos PASS. |

### Hallazgos WCAG con fix decidido (no bloquean el PR)

**W-A. Regresion de contraste en links del `RichTextRenderer` (tema claro).** FAIL AA.

`.rtr-content :deep(a) { color: var(--up1-color-primary) }` aplica a **todos** los links del
contenido renderizado, incluidos los que caen dentro de `<th>` (fondo `bg-secondary`) y de
`<code>` / `<pre>` (fondo `bg-tertiary`), que el propio componente define en las lineas 141, 148
y 186.

| Contexto | Antes del PR | Despues del PR | Requisito |
|---|---|---|---|
| sobre `.rtr-card` (`bg-primary`) | heredaba `text-primary`, ~13.8:1 | 4.69:1 PASS | 4.5 |
| dentro de `<th>` (`bg-secondary`) | ~10.1:1 | **3.59:1 FAIL** | 4.5 |
| dentro de `<code>`/`<pre>` (`bg-tertiary`) | ~10.1:1 | **3.13:1 FAIL** | 4.5 |

Es contraintuitivo pero real: antes el link no era teal (heredaba el color del texto), lo cual era
un bug de identidad visual pero daba contraste holgado. Al volverlo teal, en fondos grises claros
no llega.

Opciones de fix evaluadas, con numeros:

| Token para el link | claro: `bg-primary` / `bg-secondary` / `bg-tertiary` | oscuro: idem |
|---|---|---|
| `primary-500` (actual) | 4.69 / **3.59** / **3.13** | 9.35 / 7.50 / 6.11 |
| `primary-700` | 7.02 / 5.36 / 4.69 | 4.65 / **3.73** / **3.04** |
| `primary-800` | 8.55 / 6.54 / 5.71 | **3.18** / **2.55** / **2.08** |
| `inherit` (= `text-primary`) | 15.13 / 11.57 / **10.11** | 16.67 / 13.38 / **10.90** |

**Ningun token de la escala primary pasa en ambos temas**, porque la escala flipea de oscura a
clara: `primary-500` falla en 2 contextos de claro y `primary-700` invierte el problema al tema
oscuro.

> **Decision D3:** `color: inherit` en `.rtr-content :deep(th a)`,
> `.rtr-content :deep(code a)` y `.rtr-content :deep(pre a)`. Es la unica opcion que pasa holgado
> en ambos temas sin introducir CSS por tema en el mod (que hoy no tiene ninguno: cero
> `light-dark()`, cero `prefers-color-scheme`, cero `data-theme`). El link sigue siendo
> identificable por el subrayado que ya define `.rtr-content :deep(a)`, asi que no depende del
> color para comunicar su rol (SC 1.4.1).
>
> Se descarta `light-dark(var(--up1-color-primary-700), var(--up1-color-primary-500))`: pasaria
> todo, pero seria el primer CSS por tema del mod y rompe el principio de delegar el tema a los
> tokens. Alternativa de largo plazo si se quiere el link teal en todos los contextos: pedir a
> CORE un par de tokens de link con contraste garantizado sobre superficies secundarias.

**W-B. `.eem-error` en tema oscuro: 4.45:1, FAIL marginal.**

Falta 0.05 para AA. Y las alternativas "mas limpias" **empeoran**:

| Variante del fondo (dark) | Ratio con `danger-500` |
|---|---|
| tinte hardcodeado actual `rgba(220,38,38,.06)` | 4.45 (FAIL por 0.05) |
| tokenizado a `--up1-color-danger-50` (dark = `rgba(239,68,68,.1)`) | **4.21** (peor) |
| tokenizado a `--up1-icon-bg-danger-subtle` (dark = `rgba(239,68,68,.2)`) | **3.71** (peor) |
| fondo neutro `bg-secondary` (`#2c2c2c`) | **3.71** (peor) |
| sin fondo, sobre `bg-primary` (`#1a1a1a`) | 4.62 (PASS) |

En claro los tres candidatos pasan holgado (7.22, 7.24 y 6.42 respectivamente). El problema es
exclusivo de dark, y **cuanto mas tinte rojo tiene el fondo, peor**: el rojo claro del texto y el
rojo del fondo convergen.

Y bajar el tono del texto tampoco sirve en oscuro, porque la escala se oscurece:
`danger-600` da 3.46 y `danger-700` da 2.59.

**Causa raiz: gap del sistema de tokens.** La escala `danger` no tiene un tono claro para tema
oscuro (existen `-50/-100/-500/-600/-700`, no hay `-300`/`-400`), y `danger-500` en oscuro
(`#ef4444`) solo alcanza AA sobre la superficie mas oscura.

Opciones:

- **B1 (sin tocar CORE) · ELEGIDA, decision D2:** en el bloque de error, dejar el **texto** en
  `--up1-text-primary` (13.81:1 claro / 16.03:1 oscuro) y usar el rojo solo en el `border-left` y
  en el icono, donde el requisito es 3:1 y pasa (7.22 claro / 4.45 oscuro). El bloque sigue
  leyendose como error y el contraste queda holgado en ambos temas. Precedente en el mismo
  archivo: `.pbm-list__label` ya usa `text-primary` sobre el tinte.
- **B2 (toca CORE):** pedir `--up1-color-danger-400` con un rojo claro para dark. Fuera del
  alcance del mod, requiere permiso.
- **B3:** aceptar 4.45:1 como desviacion documentada. No recomendada: es justo el tipo de fallo
  marginal que un audit externo marca.

---

## Tensiones entre el principio rector y WCAG

La regla "no replicar colores de up1" choca en dos puntos con el contraste. Ambos necesitan
decision explicita del dev; no se resuelven solos.

### T1. Los overrides WCAG del badge (categoria C, 15 refs)

**El choque.** Los 15 hex de `useActivityStatusBadge.ts` **si replican** colores de up1 (son
literalmente una de las dos mitades de cada `light-dark()`), asi que la regla pediria tokenizarlos.
Pero tokenizarlos los haria flipear por tema y **romperia el AA auditado con axe-core**
(ver H5 para el detalle par por par).

**Resolucion (decision D4).** Tratarlos como **excepcion explicita y documentada**, no como deuda:

- Se quedan como estan. El comentario que ya existe en el archivo explica el por que y cita la spec.
- Agregar una linea en `docs/guides/creating-vueform-element.md` que registre la excepcion, para
  que un futuro barrido automatico no los "corrija".
- La salida limpia de largo plazo es **pedir a CORE tokens de badge no flipeantes**
  (`--up1-badge-bg-warning`, `--up1-badge-bg-success`, etc., con el mismo valor en ambos temas).
  Eso es cambio de plataforma, fuera del alcance del mod.

### T2. El tinte de los bloques de error (categoria A condicionada, 2 refs)

**El choque.** `rgba(220,38,38,.06)` replica un rojo de up1, asi que la regla pide tokenizarlo a
`--up1-color-danger-50`. Pero eso **baja** el contraste del texto en dark de 4.45:1 a 4.21:1
(ambos FAIL de todos modos).

**Resolucion (decision D2): hacer los dos cambios juntos, no uno solo.**

| Paso | Cambio | Efecto |
|---|---|---|
| 1 | `background: rgba(220,38,38,.06)` → `var(--up1-color-danger-50)` | cumple el principio rector |
| 2 | texto del bloque: `color: var(--up1-color-danger-500)` → `var(--up1-text-primary)` | 13.81:1 claro / 16.03:1 oscuro, **PASS holgado** |
| 3 | el rojo se conserva en el `border-left` y el icono | requisito 3:1, pasa en ambos temas |

Asi se satisfacen **las dos cosas a la vez**: cero color hardcodeado que replique up1, y AA
cumplido en ambos temas. **Hacer solo el paso 1 seria peor que no hacer nada** (bajaria el
contraste en dark de 4.45:1 a 4.21:1), por eso este cambio NO se le pide al PR #32 y se ejecuta
completo en la Fase 3.

Precedente en el mismo archivo: `.pbm-list__label` ya usa `text-primary` sobre ese tinte
(13.81:1 claro / 16.03:1 oscuro).

Alcance afectado: `.eem-error` (`CurriculumMesh:2166-2171`) y `.pbm-list__item`
(`CurriculumMesh:2203-2208`).

---

## Plan de ejecucion

Cinco fases atomicas, ordenadas por categoria del principio rector y de menor a mayor riesgo
visual. Cada una deja el mod funcional y tiene validacion propia.

### Fase 0. Cerrar el PR #32 (dependencia externa)

| Paso | Detalle |
|---|---|
| 0.1 | Confirmar con el autor el punto de los filtros ausentes del diff (titulo vs contenido). |
| 0.2 | **No pedirle nada mas al PR.** El tinte de `CurriculumMesh:2171,2207` se resuelve en la Fase 3 junto con el color del texto (tension T2); tokenizarlo suelto empeoraria el contraste en dark. |
| 0.3 | Merge y `npm run sync` para propagar a `layout/modsComponents/` y `suite/modsComponents/`. |

**Validacion:** `git grep` de los tres tokens viejos devuelve 0 en el mod y en las copias
sincronizadas.

### Fase 1. Categoria A sin costo visual (12 refs)

| Paso | Archivo | Cambio | Riesgo visual |
|---|---|---|---|
| 1.1 | `CurriculumMesh` (11 lineas) | `var(--up1-radius, 6px)` → `var(--up1-radius-md)` | **Nulo.** Mismo valor computado (6px). |
| 1.2 | `CurriculumMesh:1663,1678` | alinear los 2 fallbacks de `--up1-shadow-sm` | **Nulo.** Codigo muerto. |

**Validacion:** el script del anexo A debe reportar 11 tokens inexistentes menos. Sin smoke, no
hay cambio de pixel posible.

### Fase 2. Categoria A con cambio visual leve (9 refs)

| Paso | Archivo | Cambio | Nota |
|---|---|---|---|
| 2.1 | `CurriculumMesh:1885,1950,1970,2153` | anillos de foco → `var(--up1-shadow-focus)` | Geometria identica. Mejora notable en dark (halo 1.15:1 → 2.52:1). |
| 2.2 | `RequirementEditor:1074,1078,1199` | `--up1-color-primary-subtle` → `--up1-color-primary-50` | Gana soporte de tema oscuro. |
| 2.3 | `RequirementEditor:1106` | `--up1-color-success` → `--up1-color-success-500` | `#16a34a` → `#22946e`. |
| 2.4 | `CurriculumMesh:1675` | `--up1-color-primary-bg` → `--up1-color-primary-50` | Ghost de drop. |

**Validacion:** el script del anexo A debe reportar **0 tokens `--up1-*` inexistentes**. Smoke
visual en claro y oscuro de: foco en inputs de los modales de la malla, `RequirementEditor`,
drag&drop en la malla.

### Fase 3. Categoria A condicionada + fixes WCAG (8 refs)

Las dos decisiones que bloqueaban esta fase **ya estan tomadas** (D2 y D3):

| Paso | Archivo / selector | Cambio decidido |
|---|---|---|
| 3.1 | `CurriculumMesh` `.eem-error:2166-2171` y `.pbm-list__item:2203-2208` | **D2:** `background` a `var(--up1-color-danger-50)` **y** `color` del texto a `var(--up1-text-primary)`. El rojo se conserva en el `border-left` y el icono. Los dos cambios van juntos. |
| 3.2 | `RichTextRenderer` `.rtr-content :deep(th a)`, `:deep(code a)`, `:deep(pre a)` | **D3:** `color: inherit`. Sube a 11.57 / 10.11 en claro y 13.38 / 10.90 en oscuro. El subrayado existente sigue marcando el link. |
| 3.3 | `CompositeSectionTree:916`, `CurriculumMesh:1679` (drag) y `CompositeSectionTree:1214` (modal) | `0 4px 12px var(--up1-shadow-color-intense)` y `0 8px 32px var(--up1-shadow-color-strong)`, conservando geometria |
| 3.4 | `CompositeSectionTree:1081` (tooltip) | `var(--up1-shadow-dropdown)`, geometria identica |

**Validacion:** recalcular con el script del anexo B y exigir PASS en ambos temas. Smoke de drag,
tooltip, modal y bloque de error. Idealmente axe-core sobre las stories de Storybook.

### Fase 4. Categoria B: fallbacks muertos (~72 refs)

Ultima porque es la de mayor volumen y menor valor funcional.

| Paso | Cambio |
|---|---|
| 4.1 | Quitar el fallback en los ~72 `var(--token, fallback)` cuyo token existe |
| 4.2 | Conservar el fallback solo donde el token **no** existe (deberia ser cero tras la Fase 2) |
| 4.3 | Documentar la regla en `docs/guides/creating-vueform-element.md`: sin fallback cuando el token existe |

**Validacion:** `npm run lint:css`, mas smoke visual amplio. Al ser codigo muerto, el render **no
deberia cambiar en ningun pixel**. Si cambia, hay un token que no se estaba cargando y eso es un
hallazgo nuevo.

### Fase 5. Categorias C y D: dejar constancia (20 refs)

No hay cambio de codigo salvo comentarios. El objetivo es que un barrido futuro no las "corrija".

| Paso | Cambio |
|---|---|
| 5.1 | Registrar la excepcion del badge (T1) en `docs/guides/creating-vueform-element.md`, citando `SPEC-009-hu4-followup-a11y-contrast-badge` |
| 5.2 | Comentar el por que en los 3 casos de categoria D: `#ffffff` del stroke del check, `drop-shadow` del `ColorPicker`, backdrop `rgba(0,0,0,0.5)` (no hay token de backdrop en la plataforma) |
| 5.3 | Opcional: abrir el pedido a CORE por `--up1-color-danger-400` y `--up1-overlay-backdrop` |

### Resumen de alcance

| Fase | Categoria | Archivos | Lineas aprox. | Riesgo visual | Bloquea? |
|---|---|---|---|---|---|
| 0 | (PR externo) | 4 | 10 | ya validado | no |
| 1 | A sin costo | 1 | 13 | **nulo** | no |
| 2 | A leve | 2 | 9 | bajo | no |
| 3 | A condicionada + WCAG | 3 | 8 | medio | no (D2 y D3 tomadas) |
| 4 | B | 5 | ~72 | nulo esperado | no |
| 5 | C y D | 1 doc + 3 comentarios | ~10 | ninguno | no |

**Estado final esperado:** cero tokens `--up1-*` inexistentes, cero color hardcodeado que replique
un color de up1 (salvo la excepcion documentada del badge), y AA cumplido en ambos temas en todos
los pares auditados.

**Todo queda dentro de `mods/curriculum-design/`.** No se toca `layout/`, `object-manager/`,
`suite/` ni `flow/`, salvo que se elija T2/B2 o se pida el token de backdrop, que si serian
cambios en CORE y requieren permiso explicito.

**Reversibilidad:** total. Son cambios de CSS aislados, sin migraciones ni cambios de contrato.
Revertir es un `git revert` del commit de la fase.

**Riesgo principal:** no hay tests de estilo en el mod, asi que la unica red es el smoke visual.
Recomendado hacerlo en Storybook del mod (claro + oscuro) y ademas en el tenant UPU, porque
Storybook y Suite cargan el stack de tokens por caminos distintos.

---

## Anexos

### Anexo A. Reproducir la auditoria de tokens

Detecta tokens `--up1-*` referenciados por el mod que no existen en ninguna capa:

1. Exportar `modsComponents` desde la rama a auditar:
   `git archive origin/develop modsComponents | tar -x -C <tmp>`
2. Extraer todo `var(--token` de los `.vue` y `.ts` (excluyendo `.spec.ts` y `.stories.ts`).
3. Extraer todas las definiciones `^\s*(--[a-zA-Z0-9-]+)\s*:` de:
   `suite/css/1-theme/{theme-tokens,default,dark}.css` y `layout/src/styles/design-tokens/*.css`.
4. Diferencia, excluyendo prefijos locales del mod (`--cm-`, `--cst-`, `--rgu-`, `--ip-`, `--rtr-`,
   `--aem-`, `--eem-`, `--ap-`) y los de terceros (`--bs-`, `--vf-`).

Script usado en esta pasada: `tokens.py` y `audit.py` (scratchpad de la sesion, no versionados).

### Anexo B. Calculador de contraste

Implementa WCAG 2.1 (linearizacion sRGB con umbral 0.03928, luminancia
`0.2126R + 0.7152G + 0.0722B`, ratio `(L1+0.05)/(L2+0.05)`) mas composicion alpha para los
`rgba()` sobre fondo opaco. Los valores de token se toman resueltos por tema desde
`theme-tokens.css` (la mitad correspondiente de cada `light-dark()`).

**Se valido contra los numeros de axe-core documentados en el mod** (3.74:1 y 5.47:1), con
coincidencia exacta a dos decimales. Script: `wcag.py` (scratchpad de la sesion).

### Anexo C. Valores de token usados en los calculos

| Token | Claro | Oscuro |
|---|---|---|
| `--up1-gray-0` (= `bg-primary`) | `#ffffff` | `#1a1a1a` |
| `--up1-gray-100` (= `bg-secondary`) | `#e1e1e1` | `#2c2c2c` |
| `--up1-gray-200` (= `bg-tertiary`, `border-color`) | `#d3d3d3` | `#3a3a3a` |
| `--up1-color-primary` (= `-500`) | `#0a808c` | `#2dd4bf` |
| `--up1-color-primary-700` | `#16626b` | `#0d9488` |
| `--up1-color-primary-800` | `#17545b` | `#0f766e` |
| `--up1-text-inverse` | `#ffffff` | `#1a1a1a` |
| `--up1-text-primary` (= `gray-900`) | `#262626` | `#fafafa` |
| `--up1-color-danger-500` | `#9c2121` | `#ef4444` |
| `--up1-color-danger-600` | `#851b1b` | `#dc2626` |
| `--up1-color-danger-700` | `#6e1616` | `#b91c1c` |
| `--up1-color-danger-50` | `#fef2f2` | `rgba(239,68,68,.1)` |

### Anexo D. Referencias

- PR auditado: `https://bitbucket.org/uplanner/curriculum-design/pull-requests/32`
- Doc del mod que ya prescribe la convencion: `docs/guides/composite-section-tree.md:230`,
  `docs/guides/creating-vueform-element.md:691`
- Referencia interna de buen uso: `modsComponents/ColorPicker/useColorPicker.ts` (DEC-LOCAL-01)
- Fixes WCAG que no se deben tocar: `modsComponents/ActivityStatusBadge/useActivityStatusBadge.ts`,
  spec `SPEC-009-hu4-followup-a11y-contrast-badge` (TICKET-027)
- Carga de tokens: `suite/nuxt.config.ts:88`, `mods/curriculum-design/.storybook/preview.ts:14-29`
