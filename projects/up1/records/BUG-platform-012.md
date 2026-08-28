---
id: BUG-platform-012
project: up1
type: bug
module: platform
tags:
  - platform
  - sync
  - css
  - C1
---

# sync-styles.js no agrega CSS de mods al up1.css auto-generated imports

## Symptom

Cuando un mod declara un CSS en `mods/<mod>/css/1-theme/<file>.css`, el script `suite/scripts/sync-styles.js` lo copia a `suite/css/1-theme/<file>.css` correctamente, pero NO lo agrega al `@import` de la seccion 'Auto-generated mod imports' en `suite/css/up1.css`. Resultado: el CSS sincronizado nunca se carga en el bundle del browser, los componentes que dependen de el quedan sin estilos.

## Expected behavior

El sync deberia detectar todos los CSS sincronizados de mods (`suite/css/1-theme/*.css`, `2-objectName/*.css`, etc.) y mantener sincronizada la seccion 'Auto-generated mod imports' del `up1.css` con los `@import` correspondientes. La seccion delimitada por `/* --- Auto-generated mod imports --- */` y `/* --- End of auto-generated mod imports --- */` debe regenerarse en cada sync.

## Root cause

El script sync-styles.js procesa la fase de copia (mod → suite/css/) pero le falta una fase posterior de actualizacion del up1.css con los @import correspondientes. La seccion auto-generated existe estructuralmente pero solo lista los CSS de viewType (recordlist.css, recorddetail.css), no incluye los nuevos CSS de los mods.

## Impact

Item C1 del refactor TICKET-010 intento extraer 582 LOC del CSS del SFC CompositeSectionTreeElement.vue al archivo `mods/curriculum-design/css/1-theme/composite-section-tree.css`. Tras sync, el archivo aparece en suite/css/1-theme/ pero up1.css no lo @importa. Componente queda sin estilos en runtime. Workaround intentado (@import desde el SFC con path relativo) falla en Vite build porque post-sync el SFC vive en `layout/src/modsComponents/` y el CSS en `suite/css/1-theme/` — paths relativos rotos. Decision pragmatica: revertir el extract, mantener CSS inline en SFC. Bloquea reduccion significativa de LOC en SFCs custom Vueform que tienen mucho CSS asociado.

## Reproduction

1. Crear `mods/<mod>/css/1-theme/test.css` con cualquier regla.
2. Ejecutar `npm run sync` desde up1 root.
3. Verificar que el archivo se copio a `suite/css/1-theme/test.css` (OK).
4. Verificar `suite/css/up1.css`: la seccion 'Auto-generated mod imports' NO incluye `@import './1-theme/test.css';`.
5. En el browser, las reglas de test.css NO aplican.

## Workaround

Mantener el CSS inline dentro del bloque <style> del SFC del mod. Limita la posibilidad de reducir tamano del SFC. Alternativa fallida: @import CSS desde el SFC con path relativo — Vite no resuelve correctamente post-sync porque los archivos terminan en directorios distintos. Path absoluto via alias Vite (@/css/...) podria funcionar pero requiere config del workspace que el mod no controla.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-010 item C1 (revert parcial)
