---
id: RULE-mods-051
project: up1
type: rule
module: mods
tags:
  - modsComponents
  - vueform
  - arquitectura
  - agnostic
  - slots
  - eventos
  - tests
  - reuso
---

# Full-page modsComponent: core presentacional (slots/props/events) + adapter de dominio + lógica pura testeable

## What

Un custom Vueform element full-page de un mod (malla, board, árbol, etc.) DEBE estructurarse en dos capas con un **seam** limpio, para preservar reuso y testeabilidad:

1. **Core presentacional (agnóstico)** — render parametrizado por **props + slots + eventos**, sin conocer entidades del dominio:
   - El contenido de cada ítem/tarjeta se inyecta por **slot** (no hardcodear campos del dominio en el render).
   - Las acciones (alta, edición, mover, filtrar) se exponen por **evento/callback** — el primitivo NO ejecuta mutations del dominio.
   - Configuración por props tipadas (campo de agrupación, defs de resumen, flags), NO heurísticas por nombre de campo (alineado con el checklist de `design-feature` §5).
2. **Adapter de dominio** — el `<Comp>Element.vue` del caso concreto: mapea las entidades reales (objetos del mod) al view-model del core, provee el slot de tarjeta, las defs de resumen y los flujos (modales, checkers) específicos. **Todo el dominio vive aquí.**
3. **Lógica pura a `.ts` + `.spec.ts`** (refuerza RULE-curriculum-design-014): agrupación, derivaciones, cálculos, predicados de gating y validaciones van a módulos puros testeables. Las tasks **UI-pesadas** (modales, picker, drag&drop) DEBEN incluir **tests de interacción/componente**, no sólo el `.spec.ts` de la lógica pura.

**Extracción diferida (DET-32):** el core presentacional se **extrae a un componente publicable** (ej. `GroupedCardBoard`) sólo cuando exista un **2º consumidor concreto**. Hasta entonces se mantiene el seam (slots/eventos/lógica pura) dentro del componente, de modo que la extracción sea mecánica, no un rewrite. No publicar la abstracción sin consumidor.

## Why

`CurriculumMesh` (MC-05) nació especializado al dominio curricular, y MC-06/MC-08 agregan más dominio (electivos, prereqs, drag&drop) — la trayectoria aumentaba el acoplamiento y bloqueaba el reuso que el dev pidió (representar otros elementos en un board de columnas en otras partes de up1). El precedente `CompositeSectionTree` ya demuestra que un full-page element del mod puede ser agnóstico (parametrizado por baseObject/recordType/relationName/codeField/metricField). El seam evita hornear dominio en las primitivas de render y mantiene la extracción barata; la regla de tests cubre el gap observado (las tasks UI no declaraban tests de interacción). Decisión completa: DEC-038.

## Where

- Componentes full-page del mod: `mods/<mod>/modsComponents/<Comp>/<Comp>Element.vue` (adapter) + lógica en `<comp>.logic.ts` + `<comp>.logic.spec.ts`.
- Precedente agnóstico: `mods/curriculum-design/modsComponents/CompositeSectionTree/` (props parametrizadas + `buildTree.ts` puro).
- Caso de aplicación en curso: `CurriculumMesh/` (MC-05) y sus extensiones MC-06 (alta/edición) y MC-08 (filtros/prereqs/DnD).

## When

Al autorar o extender un full-page modsComponent. En MC-06/MC-08 específicamente: la lógica nueva (alta → planEntries, checker de prereqs, resaltado, recálculo period/position) va a `.ts`+`.spec.ts`; los modales/picker/DnD agregan tests de interacción; el dominio se agrega vía el adapter y los eventos del core, sin contaminar las primitivas de render (grid/columna/tarjeta-shell/summary-bar). Evaluar 2º consumidor antes de extraer el core.

## Verification

- Grep en las primitivas de render del componente: no aparecen identificadores del dominio (ej. `planEntry`, `blockId`, `credits`, `status`) fuera del adapter / la lógica `.ts`.
- El `.vue` rinde el ítem por `<slot>` y emite acciones por `$emit`/callback (no invoca mutations del dominio desde el primitivo).
- Cada task UI de MC-06/MC-08 tiene su test (interacción o lógica extraída con `.spec.ts`); coverage de la lógica nueva > 0.
- Si se declara un 2º consumidor: la extracción del core es mover archivos + tipar el VM genérico, sin reescribir lógica de dominio.

## Source

TICKET-085 (MC-05 / UPONE-1348) — pedido del dev de agnosticismo + tests para MC-06/MC-08; DEC-038. Extiende RULE-curriculum-design-014 (patrón full-page del mod) con el seam presentacional/adapter y el refuerzo de tests de interacción.
