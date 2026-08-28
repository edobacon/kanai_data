---
id: RULE-mods-015
project: up1
type: rule
module: mods
---

# modsComponents sin literales UI — siempre $t() contra lang/

## What

Los archivos `.vue`, `.ts` y `.js` en `modsComponents/` NO pueden contener literales de texto UI (labels, mensajes, tooltips, placeholders, textos de botones, etiquetas de enum). Todo texto visible debe resolverse por `$t('namespace.key')` contra los archivos de `lang/{locale}.json` o `lang/{locale}@{Object}.json` del mod. Prohibidos específicamente: objetos como `const CATEGORY_LABELS = { EXAM: 'Examen' }`, `const typeLabels = { GENERIC: 'Genérica' }`, y ternarios con textos literales.

## Why

Los maps inline duplican traducciones ya definidas en `lang/`, se desincronizan con facilidad y obligan a editar tres lugares al agregar un enum value. Además rompen theming multi-locale — un tenant con locale distinto ve el string hardcoded. Complementa RULE-mods-011 (estructura de lang) con una regla del lado del consumidor.

## Where

En `modsComponents/**/*.{vue,ts,js}` — tanto en templates como en lógica. Aplica a helpers que generan texto (`cellTooltip`, `statusLabel`, etc.).

## When

Al crear o editar cualquier componente de mod o su composable local.

## Verification

Grep en `modsComponents/**/*.vue` por literales español/inglés en el template y en maps de const — deben resolverse por `$t()`. Si existe un label de enum, existe la key correspondiente en `lang/`.

## Source

- **Discovered in**: TICKET-005
