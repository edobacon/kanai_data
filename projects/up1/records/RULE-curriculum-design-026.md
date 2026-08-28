---
id: RULE-curriculum-design-026
project: up1
type: rule
module: curriculum-design
tags:
  - testing
  - vitest
  - jsdom
  - vue-test-utils
  - mod
  - components
---

# Tests del mod: lógica pura a `.ts`+`.spec` (vitest node); componentes con `@vitest-environment jsdom` + `@vue/test-utils`

## What

El `vitest` del mod corre por default en `environment: 'node'` (molecules del design system aliasadas a stubs, sin `@vitejs/plugin-vue` global) → los `.vue`/render-functions **no se montan** en node. Dos patrones:

1. **Lógica → `.ts` puro + `.spec.ts`** (node): la lógica de presentación (transformaciones, validaciones, resolución de estado) vive en módulos `.ts` sin Vue/GraphQL y se testea directo. Es el patrón por defecto del mod (RULE-curriculum-design-014).
2. **Componente → test con docblock `@vitest-environment jsdom`** + `@vue/test-utils` `mount`: para verificar render/interacción real (ej. que un click emite un evento, que una opción aparece), usar un test de componente con el docblock jsdom al tope del archivo. Las deps (`@vue/test-utils`, `jsdom`) están disponibles desde el root del monorepo.

## Why

Caso real: TICKET-086 detectó que el vitest del mod es node-env y los `.vue` no montan → se extrajo la lógica a `.ts`. Corrección (TICKET-098): los tests de componente **sí corren** cuando el archivo declara `@vitest-environment jsdom` (ej. `tests/component/EditEntryModal.component.spec.ts` monta el modal con `@vue/test-utils` y verifica el flujo real — 11 tests verdes). El sub-supuesto de 086 L4 ("deps no registradas en el vitest del mod") quedó **superado**: con el docblock jsdom, el component test corre sin config extra.

## Where

- `mods/curriculum-design/vitest.config.ts` (env `node` por default).
- Lógica pura: `modsComponents/**/​*.logic.ts` + `*.logic.spec.ts`; helpers `logic/helpers/*.js` + `tests/unit/*`.
- Componentes: `tests/component/*.component.spec.ts` con `// @vitest-environment jsdom` al tope.

## When

Al escribir tests del mod: decidir lógica-pura (node) vs componente (jsdom docblock). Preferir extraer lógica a `.ts` cuando sea posible; usar component test cuando el valor está en el render/interacción (emits, condicionales de UI).

## Verification

`npx vitest run` del mod: los `.logic.spec.ts` corren en node; los `*.component.spec.ts` con docblock jsdom montan el componente sin error de entorno.

## Source

TICKET-086 (MC-06 / UPONE-1349), learn L4; sub-supuesto corregido en TICKET-098 (component tests corriendo con `@vitest-environment jsdom`).
