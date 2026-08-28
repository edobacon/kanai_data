---
id: RULE-layout-038
project: up1
type: rule
module: layout
tags:
  - layout
  - conditions
  - condicional
  - polimorfismo
  - FK-polimorfíca
  - autoPopulate
  - composable
  - RecordDetail
---

# Campos condicionales y owner polimórfico en layouts: conditions vs visibleWhen, y autoPopulate para FK polimórfica

## What

El layout engine de up1 soporta dos mecanismos de UI condicional que se combinan para resolver campos por tipo y FK polimórficas, pero tienen gotchas específicos:

**1. Visibilidad condicional nativa: `conditions`, NO `visibleWhen`/`showIf`.**
El mecanismo real que `RecordDetail.vue` pasa a Vueform es `conditions: [[campo, operador, valor]]`. Los identificadores `visibleWhen` y `showIf` NO existen en el engine — si se declaran, se ignoran silenciosamente. Referencia: `mods/object-manager-editor/config/layouts/fielddefinition-create.json:136-165` (precedente de producción). Gotcha de create-mode: en create el campo dependiente puede no estar poblado al render inicial, por lo que la condición evalúa contra un valor vacío — validar empíricamente que Vueform re-evalúa al cambiar el campo disparador.

```json
{
  "field": "recordType",
  "conditions": [["recordType", "==", "Plan"]],
  "label": "Progresión"
}
```

**2. FK polimórfica (`ownerType`/`ownerId`): `autoPopulate` + `populateItems` + composable propio.**
`references` en el layoutConfig es estático (no cambia según otro campo), y los selects virtuales chocan con el bug TICKET-067 (campos fuera del schema Prisma son rechazados al guardar). La solución mod-only es:
- El field `ownerId` (campo real del objeto, no virtual) declara `items: []` + `watchFields: ["ownerType"]`.
- Un composable propio en `mods/<mod>/modsComposables/useOwnerIdOptions.ts` se proyecta por sync a `layout/src/composables/` y repuebla las opciones del picker según el valor actual de `ownerType` (query por objeto destino).
- El campo `ownerType` va como select estático (enum). El campo del objeto destino (ej. `academicProgramId`, `institutionId`) va con `conditions` sobre `ownerType` para mostrarse solo cuando corresponde.

Referencia: `layout/src/layouts/RecordDetail.vue:693-902` (autoPopulate), `layout/src/composables/useRoleDefinitions.ts` (patrón). En TICKET-063 se implementó `modsComposables/useOwnerIdOptions.ts` con este patrón.

## Why

En TICKET-063 las hipótesis iniciales asumieron `visibleWhen`/`showIf` (que no existen) y un picker polimórfico nativo (que tampoco existe). Ambos imprecisiones se corrigieron en el design-explore (L1, L6) antes de llegar a execute, pero si no se hubiera hecho el explore habrían bloqueado S2. El bug de selects virtuales (TICKET-067) no es obvio: los campos virtuales renderan y parecen funcionar hasta que intentas guardar y Prisma los rechaza. Los dos mecanismos (`conditions` + `autoPopulate`) son los caminos de producción verificados sin necesidad de modificar el core.

## Where

- `layout/src/layouts/RecordDetail.vue:2850-2893` — `references` estático
- `layout/src/layouts/RecordDetail.vue:693-902` — `autoPopulate` + `populateItems`
- `mods/object-manager-editor/config/layouts/fielddefinition-create.json:136-165` — precedente de `conditions` en producción
- `mods/curriculum-design/modsComposables/useOwnerIdOptions.ts` — composable owner polimórfico (TICKET-063)
- `layout/src/composables/useRoleDefinitions.ts` — patrón de composable en mods proyectado por sync
- `mods/curriculum-design/config/layouts/default_Curriculum_{create,edit}.json` — uso real de `conditions` + `autoPopulate`

## When

Al diseñar un layout con campos que solo aplican a un subtipo (ej. campos PLAN-ONLY en un objeto que también tiene Minor), o al implementar un picker de FK polimórfica donde el objeto destino varía según otro campo del form. En ambos casos: (a) para visibilidad condicional usar `conditions`, no ninguna otra variante; (b) para FK polimórfica, verificar primero si `references` estático alcanza — si no (porque el objeto destino varía), implementar el composable `useOwnerIdOptions` en `modsComposables/`.

## Verification

1. Grep `visibleWhen\|showIf` en los layout JSONs del mod — deben dar 0 resultados. 2. Para condiciones: verificar que el campo usa `conditions: [[campo, op, valor]]` y que el campo disparador está declarado en el mismo form. 3. Para FK polimórfica: verificar que `ownerId` (u equivalente) es un campo real del objeto (no virtual), que usa `items: []` + `watchFields`, y que el composable `useOwnerIdOptions` existe en `modsComposables/` y fue proyectado por sync a `layout/src/composables/`. 4. Smoke del create: validar empíricamente que `conditions` re-evalúa al cambiar el campo disparador (Vueform reactivo — H4.1 de TICKET-063).

## Source

- **Discovered in**: TICKET-063
