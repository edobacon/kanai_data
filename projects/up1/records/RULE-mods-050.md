---
id: RULE-mods-050
project: up1
type: rule
module: mods
tags:
  - modsComponents
  - sync
  - i18n
  - vueform
  - deployment
  - dark-theme
  - layout
  - suite
---

# Un modsComponent (Vueform element) nuevo requiere DOS syncs + restart para renderizar

## What

Al autorar un custom Vueform element en `mods/<mod>/modsComponents/<Comp>/<Comp>Element.vue` y referenciarlo en un layout por su `type` kebab, NO basta con commitear el código ni con re-seedear el backend. Para que renderice en runtime se requieren **dos syncs distintos + reinicio del dev server**:

1. **`cd layout && npm run sync`** (`layout/scripts/sync.js`) — copia el folder del componente a `layout/src/modsComponents/<Comp>/` y **regenera `layout/src/modsComponents/component-registry.json`** con la entrada `"<type-kebab>": { componentName: "<Comp>Element" }`. Sin esto, el `import.meta.glob('./src/modsComponents/*/*.vue')` de `layout/vueform.config.ts` no ve el element y el `type` no resuelve → la pestaña/campo queda **en blanco**.
2. **`cd suite && npm run sync`** (corre `suite/scripts/sync-i18n.js`) — mergea los namespaces de `mods/<mod>/lang/<locale>.json` a `suite/lang/<locale>.json`, que es lo que lee el i18n global (`suite/plugins/i18n.ts:27` → `import.meta.glob('../lang/**/*.json')`). Sin esto, los `$t('<comp>.…')` del element salen como **claves crudas**.
3. **Reiniciar/recargar el dev server de suite/storybook** — ambos globs son *build-time/eager*; un server ya corriendo no toma el folder ni el lang nuevos hasta reiniciarse.

`npm run setup reset` / seed de **object-manager NO hace ninguno de los dos** — es backend (datos + aplica layouts a la DB). Aplicar layouts (que el record-list desaparezca) NO implica que el element de reemplazo esté registrado.

> Convención `type`↔element (RULE relacionada): el element `XxxElement` se referencia como `type: "xxx"` (kebab, sufijo `Element` eliminado), per `layout/src/registry/auto-register.ts` + `CustomElements.stories.ts`.

## Why

Caso real (TICKET-085 / MC-05, learns L4): tras cerrar el ticket con el código commiteado, la malla no renderizaba — primero en blanco (element no en `component-registry.json` ni en `layout/src/modsComponents/`), luego con claves i18n crudas (`curriculumMesh.*` no estaba en `suite/lang/es_CL.json`, sólo en el lang del mod). El dev había corrido `npm run setup reset` en object-manager (backend), que no registra componentes de frontend. La causa fue el gap entre "código mergeado" y "registrado en el runtime del frontend": dos pipelines de sync (layout components + suite i18n) que viven fuera del repo del mod y producen artefactos generados (no se commitean).

## Where

- Element fuente: `mods/<mod>/modsComponents/<Comp>/<Comp>Element.vue` + i18n en `mods/<mod>/lang/<locale>.json`.
- Sync de componentes: `layout/scripts/sync.js` → genera `layout/src/modsComponents/component-registry.json` (consumido por `layout/vueform.config.ts`).
- Sync de i18n: `suite/scripts/sync-i18n.js` (vía `suite` `npm run sync`) → escribe `suite/lang/<locale>.json` (consumido por `suite/plugins/i18n.ts`).
- Artefactos generados (NO commitear, per `config.yaml` critical_rules): `layout/src/modsComponents/*`, `component-registry.json`, `suite/lang/*`.

## When

Cada vez que se crea un modsComponent nuevo, se renombra su element/`type`, o se agregan/cambian claves i18n del element. Checklist antes de validar en runtime o de declarar "funciona": (1) `layout npm run sync` → verificar entrada en `component-registry.json`; (2) `suite npm run sync` → verificar el namespace en `suite/lang/<locale>.json`; (3) reiniciar dev. NO concluir desde un `setup reset` de object-manager.

## Verification

- `grep '"<type-kebab>"' layout/src/modsComponents/component-registry.json` retorna la entrada con `componentName: "<Comp>Element"`.
- `python3 -c "import json;print('<comp-namespace>' in json.load(open('suite/lang/es_CL.json')))"` → `True`.
- En runtime (tras reiniciar): el element renderiza y los `$t('<comp>.*')` muestran texto traducido, no claves.

## Source

TICKET-085 (MC-05 / UPONE-1348), learns L4 (dos syncs) y L5 (Badge `secondary` ilegible en dark — bug aparte del átomo). Diagnóstico en runtime post-cierre: element ausente de `component-registry.json` + `curriculumMesh` ausente de `suite/lang/es_CL.json`; resuelto corriendo ambos syncs.
