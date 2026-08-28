---
id: RULE-platform-011
project: up1
type: rule
module: platform
tags:
  - i18n
  - layout
  - suite
  - sync-i18n
  - backend-errors
  - UNIQUE_VIOLATION
  - locale
  - formatError
---

# i18n de layout: editar en module/lang (fuente) y correr sync-i18n; backend devuelve code, no idioma

## What

Las traducciones del layout se editan en `<module>/lang/` (fuente — ej. `layout/lang/es_CL@RecordList.json`). El runtime de `suite` lee `suite/lang/` (copia generada). El script `suite/scripts/sync-i18n.js` (invocado via `npm run sync` desde `suite/`) recorre los workspaces (incl. `layout` y `mods/*`), mergea keys nuevas a `suite/lang/` y falla ante conflicto de key (no sobreescribe). El backend devuelve siempre el `code` estable (ej. `UNIQUE_VIOLATION`) más un mensaje técnico canónico; el cliente resuelve el idioma via i18n.

## Why

Editar solo `layout/lang/` sin correr `sync-i18n` deja la key cruda en el runtime (el `$t` devuelve el key literal, ej. `recordList.modal.cloneTitle`). El plugin de i18n de suite (`suite/plugins/i18n.ts`) hace `import.meta.glob('../lang/**/*.json')` y solo ve `suite/lang/`. Después del sync, Vite HMR del glob eager recompila con un reload de página (sin reiniciar Nuxt). El backend NO traduce — hardcodear español en los mensajes de error del server rompe la multi-tenancy de idioma.

## Where

layout/lang/{es_CL,en_CL,pt_BR}@*.json (FUENTE — editar aquí) · mods/<mod>/lang/ (fuente del mod) · suite/lang/ (COPIA generada — no editar directo) · suite/scripts/sync-i18n.js (script de merge) · suite/plugins/i18n.ts (runtime, solo lee suite/lang) · object-manager/src/index.js `formatError` (devuelve `code` + mensaje técnico canónico, sin traducción).

## When

Al agregar o modificar cualquier clave i18n en el layout o en un mod. Al diagnosticar un `$t` que muestra la key literal en la UI en vez del texto traducido. Al definir mensajes de error en el servidor: devolver siempre `code` + `extensions.fields`; el cliente los traduce vía `useFriendlyErrors` o `resolveErrorCode`.

## Verification

Tras editar `layout/lang/`, correr `npm run sync` desde `suite/` y verificar que la key existe en `suite/lang/`. En runtime: el `$t('clave')` debe resolver el texto, no la key literal. Para errores del backend: `grep -r 'en español' object-manager/src/` no debe tener hits en mensajes de error al cliente.

## Source

- **Discovered in**: TICKET-044
