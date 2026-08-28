---
id: RULE-curriculum-design-050
project: up1
type: rule
module: curriculum-design
tags:
  - read-enrichment
  - campo-derivado
  - layout
  - edit
  - view
  - update
  - prisma
  - valor-invalido
---

# Un campo derivado por read-enrichment va SOLO en layouts view; nunca en edit ni create

## What

Un campo DERIVADO por read-enrichment (calculado en la lectura, no persistido, ausente de `core_FieldDefinition`) MUST aparecer únicamente en layouts de VIEW. Nunca debe colocarse en layouts de EDIT ni CREATE. `submits: false` en el custom element más `readonly: true` en el layout NO bastan para evitar el problema.

## Why

Dos consecuencias, ambas malas, si el derivado se cuela en un layout de edit:

1. **Se cuela al payload de la mutación y Prisma lo rechaza.** El override del mod `logic/polymorphicUpdate.resolver.js` (~564) clasifica los campos entrantes (rtFields / extFields / baseCustomFields) y hace fallback a `baseFields` para todo lo desconocido. El derivado termina en `prisma.CurricularSection.update({ data: { ...baseFields } })`, y Prisma lo rechaza como `Invalid value for argument`, que se mapea al mensaje amistoso "Valor inválido" (en `instance.resolver.js` ~6866 y `curriculum-update.resolver.js`). `submits: false` + `readonly: true` no impidieron el leak.
2. **Queda obsoleto en el formulario de edit hasta reabrir.** El enrichment recalcula solo en la lectura, no en vivo: mientras el usuario edita, el valor mostrado no refleja los cambios.

Regla general: un agregado / derivado es view-only. Si necesita verse en edit, se muestra en un componente custom que lee el valor enriquecido del contexto del form (no como campo del objeto), no como campo del layout.

## Where

- `logic/polymorphicUpdate.resolver.js` — clasificación de campos entrantes + fallback a `baseFields`.
- Layouts de objetos con campos derivados por el resolver del mod (patrón `effectiveCredits` / `currentCredits` / `totalHoursPerWeek`).
- `logic/curriculum-read.resolver.js` y sus helpers — donde vive el enrichment que produce estos derivados.

## When

Al exponer un agregado o campo derivado en un layout de un objeto del mod. Al revisar un PR que agregue un campo a un layout de edit / create: verificar que ese campo exista como columna real del objeto (persistido en `core_FieldDefinition`); si es derivado por enrichment, sacarlo del edit / create y dejarlo solo en view.

## Verification

- Grep: ningún campo derivado por enrichment aparece en la sección de campos de un layout `_edit` o `_create`.
- Runtime: editar y guardar el objeto no produce "Valor inválido"; el update pasa.
- El derivado se ve fresco en view en cada lectura.

## Source

- Descubierto en UPONE-1619 (Jira): `totalHoursPerWeek` (suma de las piezas de la Modality) se quitó del layout de edit de `rt__Modality__curricularsection` y quedó solo en view. En view se muestra con un componente custom (`InstructionalTotalDisplayElement`) que lee el valor enriquecido del contexto del form, correcto porque el valor no es un campo real.
