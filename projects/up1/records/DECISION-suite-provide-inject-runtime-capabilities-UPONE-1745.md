---
id: DECISION-suite-provide-inject-runtime-capabilities-UPONE-1745
project: up1
type: decision
module: suite
---

RecordDetail.vue (en layout) necesitaba cargar el namespace i18n propio de un modal embebido, no solo el de la ruta; antes intentaba globalThis.useNuxtApp, que no existe (los auto-imports de Nuxt reescriben identificadores, nunca los cuelgan de globalThis). vueApp.provide('ensureNavNamespaces', ensureNavNamespaces) expone la funcion via provide/inject real, mismo patron que 'vueformElementTypes', para que layout (que tambien corre fuera de Nuxt, ej. Storybook) pueda inject() de forma defensiva.

**sourceRef:** 24ee4b8 + plugins/i18n.ts:266-274 (vueApp.provide); 36536fc .ai/PATTERNS.md:217-230.
