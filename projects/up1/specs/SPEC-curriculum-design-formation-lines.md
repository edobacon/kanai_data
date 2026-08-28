---
id: SPEC-curriculum-design-formation-lines
project: up1
ticket: TICKET-087
status: in_progress
---

# Malla — Pestaña "Líneas de formación" (CRUD + integración) (MC-07)

# Malla — Pestaña "Líneas de formación" (CRUD + integración) (MC-07)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: gestionar las **líneas de formación** (`requirementCategory`) de un plan desde una pestaña del detalle del Currículo: verlas en una lista, crearlas/editarlas (con color+ícono y rango de créditos), borrarlas con guard, y que alimenten el selector de la malla (MC-06). **Hallazgo clave del intake**: el ~70% de esto **ya está construido** en la rama `UPONE-1267-sp5` (por MC-02 / TICKET-093 / TICKET-094) — el objeto, el guard, la pestaña con un `record-list`, los layouts CRUD y los pickers ya existen. MC-07 es un **delta de gaps**, no una construcción. Además, por decisión del dev (2026-07-01) se agrega **REQ-05**: avisar de forma no bloqueante cuando los créditos asignados quedan **fuera de rango** — incompletos (bajo el mínimo) o excedidos (sobre el máximo). **100% mod-only** (config de layouts + un resolver de lectura del mod), no toca core, no cambia el modelo.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | "Etiqueta corta" del mockup **= `code`** (no se agrega `shortLabel`) | El objeto `requirementCategory` no tiene `shortLabel`; agregarlo contradice `creates_data:false` y toca codegen/migración. `code` ya es "código corto". |
| 2 | Columnas "obligatorias"/"electivas" y el estado "excedida" se **derivan en lectura** (backend enrichment), no se persisten | Mismo patrón que `currentCredits`/`isElective` (MC-02). Refleja cualquier cambio (rango o asignaturas) sin sincronización manual. |
| 3 | REQ-05 es un **aviso no bloqueante** con 3 estados: `under` (incompleta), `over` (excedida), `ok` | El diseñador ve lo que falta y lo que sobra. Bloquear rompería la edición de un plan en construcción. El bloqueo restrictivo al publicar es **MC-09**. |
| 4 | La lista sigue siendo un **`record-list` de config** (no un componente Vue custom) | H2 refutada: la pestaña ya usa `record-list` estándar; las columnas derivadas se logran extendiendo el enrichment, no con un element nuevo. |

**Riesgos principales y como los mitigamos**:

- **Runtime DB-gated** (layouts se aplican con `npm run sync` sobre la DB del tenant) → verificación de código = vitest del mod verde + JSON válido + `.spec.ts` de la lógica pura; el smoke visual lo corre el dev tras `layout sync` + `suite sync` + restart (RULE-mods-050, lección de MC-05).
- **Indicador coloreado por fila**: la tabla del `record-list` no soporta badge condicional por celda (formato sale de metadata); el modo **card** sí (`card.badges[]` con condición sobre `creditStatus`, un badge por estado under/over). Se resuelve en S2 eligiendo card-badge o columna de estado + contador; DB-gated, se valida en smoke.
- **Romper `currentCredits`** al extender el enrichment → el cambio es aditivo y reusa el mismo `findMany`; se cubre con `.spec.ts` que verifica currentCredits + counts + creditStatus juntos (no regresión).
- **Mover el contador de layouts** → `tests/integration/layouts-declared.test.ts` cuenta layouts exactos; MC-07 solo **edita** layouts, no agrega/quita.

**Que NO se hace en este ticket** (límites explícitos):

- Reconstruir objeto/guard/pickers/pestaña/layouts CRUD → ya existen (reuse).
- Agregar un campo `shortLabel` al modelo → fuera de scope (`creates_data:false`).
- **Bloqueo restrictivo** de créditos al publicar el plan → **MC-09**.
- Chips de color en la malla → **MC-08** (acá solo se alimenta el dato).
- Registrar un `layoutType`/componente nuevo en core → frontera mod-only.

**Tamano estimado**: 3 sessions (~4-6h efectivas). S1 lógica/BE (helpers + enrichment), S2 superficies (columnas + indicador + contador), S3 borrado + validación + integración + cierre. La más incierta es S2 (indicador coloreado DB-gated).

**Como vas a saber que funciona**:

- Tras `sync`, abro el detalle de un Plan → pestaña "Líneas de formación" → veo la lista con columnas nombre/código/créditos actual+mín/máx/**obligatorias**/**electivas**.
- Una línea sobre el máximo muestra **"Excedida"** (rojo) y una bajo el mínimo muestra **"Incompleta"** (ámbar); el contador de la pestaña dice cuántas están fuera de rango.
- Puedo **borrar** una línea sin entries; si tiene entries, el borrado se bloquea con "reasigna primero".
- Creo una línea nueva y aparece en el selector de la malla (MC-06).
- `npm test` del mod: los helpers puros (`.spec.ts`) pasan TC-06/07/08; la suite del mod no regresiona.

---

## Purpose

Completar la gestión de líneas de formación (`requirementCategory`) en la pestaña del detalle del Currículo. Sobre lo ya construido (objeto, guard, pestaña `record-list`, layouts CRUD con pickers, enrichment de `currentCredits`), MC-07 agrega el **delta**: columnas de conteo obligatorias/electivas (REQ-01), habilitar el borrado con guard en la UI (REQ-03), asegurar la validación de rango y el mapeo de "etiqueta corta" (REQ-02), verificar la integración con el selector de la malla (REQ-04) y avisar de forma no bloqueante cuando los créditos asignados exceden el máximo de una línea (REQ-05). Mod-only: capa `logic/` (un resolver de lectura + helpers puros) + `config/layouts/`. Consume `requirementCategory`/`planEntry` de MC-02.

## Requirements

> ⚠️ **Bloqueo de plataforma (post-smoke 2026-07-01)**: la **superficie visual** de REQ-01 (columnas obligatorias/electivas + créditos actuales) y REQ-05 (estado por línea) **no se pudo entregar** vía `record-list`: el RecordList filtra columnas a campos reales/persistidos del objeto y descarta los derivados del enrichment (afecta también a `currentCredits`). El **backend** de REQ-01/REQ-05 (enrichment) SÍ quedó entregado y testeado — los datos están disponibles. La superficie requiere un cambio de core (campo virtual/columna derivada) o un componente custom. Ver `uplanner/specs/up1/sp5/SP5-issues.md` → **ISSUE-SP5-01**. REQ-02 (code) y REQ-04 (network-only) entregados; REQ-03 (borrado) desactivado por decisión del dev (`canDelete:false`).

### REQ-01: Ver líneas con conteo de obligatorias y electivas

> **Que cambia**: la lista de líneas suma dos columnas — cuántas asignaturas **obligatorias** y cuántas **electivas** tiene cada línea, además de los créditos actual/mín/máx que ya muestra.
> **Por que**: hoy la lista muestra créditos pero no cuántas asignaturas hay por tipo; el diseñador necesita ese conteo para dimensionar la línea.

El sistema MUST mostrar, en el `record-list` de líneas de la pestaña, las columnas: nombre, código, créditos mínimos, créditos máximos, créditos actuales, **obligatorias** (conteo de `planEntry` de la línea con `blockId == null`) y **electivas** (conteo con `blockId != null`). Los conteos MUST derivarse en lectura (no se persisten). La lista es sólo lectura fuera del modo edición del detalle.

<details><summary>Scenarios de validacion</summary>

#### Scenario: conteo por electividad
- **GIVEN** una línea con 3 `planEntry` (2 con `blockId == null`, 1 con `blockId != null`)
- **WHEN** se lee la línea (listInstances/getInstance)
- **THEN** la fila expone `mandatoryCount = 2` y `electiveCount = 1`

#### Scenario: línea sin entries
- **GIVEN** una línea sin `planEntry` asignados
- **WHEN** se lee
- **THEN** `mandatoryCount = 0`, `electiveCount = 0`, `currentCredits = 0`

</details>

### REQ-02: Crear / editar línea (rango, color e ícono)

> **Que cambia**: crear/editar una línea sigue el form con nombre, código (= "etiqueta corta"), rango de créditos y pickers de color e ícono, rechazando rangos invertidos.
> **Por que**: el CRUD ya existe (TICKET-093/094); MC-07 confirma el mapeo del campo "etiqueta corta" y refuerza la validación `min ≤ max`.

El sistema MUST permitir crear y editar una línea capturando: `name`, `code` (rol de "etiqueta corta"), `minCredits`, `maxCredits`, `description`, `color` (token `var(--up1-color-*)` o hex) e `icon` (`bi-*`), vía los pickers `ColorPicker`/`IconPicker` existentes. El sistema MUST rechazar `minCredits > maxCredits` (cuando `maxCredits` está definido); esta validación existe server-side (`assertMinMaxCredits`). El sistema SHOULD reflejar esa validación en el FE si el form declarativo lo soporta; si no, el error server-side surfaceado al guardar es aceptable.

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear línea válida
- **GIVEN** el modal de creación con `name="Núcleo"`, `minCredits=72`, `color=primary`, `icon=bi-mortarboard`
- **WHEN** se guarda
- **THEN** la línea se crea con color e ícono

#### Scenario: rango invertido
- **GIVEN** el modal con `minCredits=30`, `maxCredits=20`
- **WHEN** se guarda
- **THEN** el guardado se rechaza (`REQUIREMENT_CATEGORY_INVALID_CREDIT_RANGE`)

</details>

### REQ-03: Eliminar con guard *(🅲 Could)*

> **Que cambia**: la lista habilita el borrado de una línea; si la línea tiene asignaturas, el borrado se bloquea con "reasigna primero".
> **Por que**: el guard backend ya existe pero el `record-list` tiene `canDelete:false` — el borrado no está expuesto en la UI.

El sistema MUST habilitar el borrado de líneas desde la pestaña (`canDelete: true`). El sistema MUST bloquear el borrado de una línea con `planEntry` asignados, mostrando el mensaje del guard (`REQUIREMENT_CATEGORY_HAS_ENTRIES` — "reasigna primero"). El guard de dominio (`requirementCategoryDelete.resolver.js`) y el backstop DB (`onDelete: Restrict`) ya existen; MC-07 sólo expone la acción y verifica el surface del error.

<details><summary>Scenarios de validacion</summary>

#### Scenario: borrar línea con entries
- **GIVEN** una línea con 1 `planEntry` asignado
- **WHEN** el usuario intenta borrarla
- **THEN** el borrado se bloquea con el mensaje "reasigna primero"

#### Scenario: borrar línea vacía
- **GIVEN** una línea sin `planEntry`
- **WHEN** el usuario la borra
- **THEN** la línea se elimina

</details>

### REQ-04: Integración con el selector de la malla *(🅲 Could)*

> **Que cambia**: una línea creada/editada aparece de inmediato como opción en el selector de línea de la malla (MC-06).
> **Por que**: el selector ya lee `requirementCategory`, pero hay que verificar que no quede cache stale al crear una línea desde otra pestaña.

El sistema MUST asegurar que el selector de línea de MC-06 (`AddEntryModal`/`EditEntryModal`, vía `useCurriculumMesh`) refleje las `requirementCategory` vigentes del plan. Si al crear una línea desde la pestaña el selector no la refleja por cache de Apollo, el sistema SHOULD invalidar/refetch la query de categorías.

<details><summary>Scenarios de validacion</summary>

#### Scenario: línea nueva visible en el selector
- **GIVEN** un plan con la malla abierta y una línea recién creada en la pestaña "Líneas de formación"
- **WHEN** se abre el selector de línea en el modal de alta de la malla
- **THEN** la nueva línea aparece como opción

</details>

### REQ-05: Aviso de créditos fuera de rango *(🆂 Should)*

> **Que cambia**: si los créditos asignados a una línea quedan **fuera de su rango** — por debajo del mínimo (**Incompleta**) o por encima del máximo (**Excedida**) — la lista lo marca y la pestaña cuenta cuántas líneas están fuera de rango — sin impedir guardar.
> **Por que**: al editar el rango (o cambiar asignaturas) los créditos actuales pueden quedar fuera; el diseñador necesita ver tanto lo que falta (incompleta) como lo que sobra (excedida), pero bloquear rompería la edición de un plan en construcción.

El sistema MUST derivar, por línea, un estado `creditStatus` en lectura con tres valores:
- `'under'` cuando `currentCredits < minCredits` (**Incompleta** — aviso ámbar/warning);
- `'over'` cuando `maxCredits != null && currentCredits > maxCredits` (**Excedida** — aviso rojo/danger);
- `'ok'` cuando `minCredits <= currentCredits` y (`maxCredits == null` o `currentCredits <= maxCredits`) (en rango — verde/neutral).

El sistema MUST surfacear el estado de forma **no bloqueante** como una **columna "Estado" en el `record-list` de líneas de la pestaña** (decisión dev 2026-07-01: el indicador vive en el listado, como la maqueta — es la vista de rollup por línea y donde se edita el rango). El valor MUST mostrarse como **texto localizado** ("Incompleta" / "En rango" / "Excedida"), NO como badge — el `record-list` en modo tabla solo soporta texto. El sistema SHOULD aplicar color/estilo a la celda **si y solo si el record-list lo soporta dentro de sus capacidades** (a determinar en S2.T2); si no lo soporta, **queda como texto plano** (aceptable). El sistema MUST NOT rechazar el guardado por esta condición (el bloqueo restrictivo al publicar es alcance de MC-09).

> Nota: `under` y `over` son mutuamente excluyentes (el modelo garantiza `minCredits <= maxCredits`). En un plan recién iniciado la mayoría de las líneas estará `under` (0 créditos < mínimo) — es correcto: refleja lo que falta poblar.
>
> **Alcance de superficie (decisión dev)**: NO en el componente de malla (`CurriculumMesh`) — la malla agrupa por período, no por línea; el rollup por línea vs rango es propio del listado. NO badges/modo card. El **contador resumen** en la pestaña queda como **opcional**: solo si el record-list ofrece un lugar limpio (header/summary); si requiere un elemento nuevo, se difiere. La localización del texto (under/ok/over → label) se resuelve según lo que soporte el record-list (metadata de campo enum vs mapeo en columna — a determinar en S2.T2).

<details><summary>Scenarios de validacion</summary>

#### Scenario: excedida
- **GIVEN** una línea con `maxCredits=60` y `currentCredits=72`
- **WHEN** se lee
- **THEN** `creditStatus='over'`; la fila muestra "Excedida"; el contador la incluye

#### Scenario: dentro de rango
- **GIVEN** una línea con `maxCredits=60`, `currentCredits=48`
- **WHEN** se lee
- **THEN** `creditStatus='ok'`; sin alarma

#### Scenario: incompleta (bajo el mínimo)
- **GIVEN** una línea con `minCredits=72`, `currentCredits=30`
- **WHEN** se lee
- **THEN** `creditStatus='under'`; la fila muestra "Incompleta" (ámbar); el contador la incluye

#### Scenario: sin tope pero bajo el mínimo
- **GIVEN** una línea con `minCredits=72`, `maxCredits=null` y `currentCredits=30`
- **WHEN** se lee
- **THEN** `creditStatus='under'` (sin tope no hay exceso, pero sí falta para el mínimo)

#### Scenario: sin tope y sobre el mínimo
- **GIVEN** una línea con `minCredits=72`, `maxCredits=null` y `currentCredits=999`
- **WHEN** se lee
- **THEN** `creditStatus='ok'` (sin tope no hay exceso; ya supera el mínimo)

#### Scenario: editar el rango deja la línea excedida (no bloquea)
- **GIVEN** una línea con `currentCredits=60` y `maxCredits=80`
- **WHEN** el usuario edita `maxCredits` a `50` y guarda
- **THEN** el guardado tiene éxito; al re-leer, `creditStatus='over'` y el indicador/contador lo reflejan

#### Scenario: subir el mínimo deja la línea incompleta (no bloquea)
- **GIVEN** una línea con `currentCredits=48` y `minCredits=40`
- **WHEN** el usuario edita `minCredits` a `72` y guarda
- **THEN** el guardado tiene éxito; al re-leer, `creditStatus='under'` y el indicador/contador lo reflejan

</details>

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | El enrichment de líneas no agrega N+1 | queries por render de la pestaña | 1 `planEntry.findMany` por lote de categorías (reusa el de `currentCredits`) |
| A11y | El indicador de estado (incompleta/excedida) no depende solo del color | redundancia | color + ícono + texto (WCAG 1.4.1), patrón del design system up1 |

## Artifacts

> Sin meta-specs de componentes nuevos → el delta es config de layouts + un resolver de lectura del mod + helpers puros.

### Reusados (ya construidos — NO tocar)

| Artefacto | Path | Rol |
|-----------|------|-----|
| Objeto `requirementCategory` | `objects/requirementCategory.json` | modelo (name, code, min/maxCredits, color, icon, …) |
| Guard de borrado | `logic/requirementCategoryDelete.resolver.js` + `logic/helpers/categoryGuard.js` | REQ-03 (ya existe) |
| Validación de rango | `logic/helpers/creditRange.js` (`assertMinMaxCredits`) | REQ-02 (server-side, ya existe) |
| Pestaña + record-list | `config/layouts/default_Curriculum_{view,edit}.json` (`requirementCategoriesList`) | REQ-01 base |
| Layouts CRUD + pickers | `config/layouts/default_requirementCategory_{create,edit,view}.json` (`color-picker`/`icon-picker`) | REQ-02 (ya existe) |
| Enrichment `currentCredits` | `logic/curriculum-read.resolver.js` (`enrichRequirementCategoryRows`) | base de REQ-01/05 |
| Selector de línea | `modsComponents/CurriculumMesh/{AddEntryModal,EditEntryModal}.ts` + `useCurriculumMesh.ts` | REQ-04 (ya existe) |

### Nuevos / modificados (el delta)

| Artefacto | Path | Cambio | source_ref |
|-----------|------|--------|-----------|
| `countByCategory` (helper puro) | `logic/helpers/deriveElectivity.js` (extiende) | conteo `{mandatoryCount, electiveCount}` por categoría, reusa `isElective` | REQ-01 |
| `deriveCreditStatus` (helper puro) | `logic/helpers/creditRange.js` (extiende) | `'under' / 'ok' / 'over'` según `currentCredits` vs `[minCredits,maxCredits]` | REQ-05 |
| `.spec.ts`/`.test.js` de los helpers | `tests/unit/` | TC-06, TC-07, TC-08 con asserts concretos | REQ-01, REQ-05 |
| `enrichRequirementCategoryRows` | `logic/curriculum-read.resolver.js` (modifica) | agrega `blockId` al select; expone `mandatoryCount`/`electiveCount`/`creditStatus` junto a `currentCredits` (list + getInstance) | REQ-01, REQ-05 |
| Columnas + indicador + contador | `config/layouts/default_Curriculum_{view,edit}.json` (modifica) | 2 columnas (obligatorias/electivas) + indicador `creditStatus` + contador resumen; `canDelete:true` | REQ-01, REQ-03, REQ-05 |
| i18n | `lang/{es_CL,en_CL,pt_BR}.json` | labels de columnas + indicador "Excedida" + contador | REQ-01, REQ-05 |

> **Checklist de calidad**: (a) labels de UI a i18n del mod (no hardcode); (b) cada artefacto tiene consumidor en este sprint; (c) los helpers reciben datos tipados (entries con `blockId`/`credits`), sin heurísticas por nombre.

## Tasks

### Session 1 — Lógica pura + enrichment (REQ-01 + REQ-05) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Helper puro `countByCategory(entries)` (agrupa por categoryId, cuenta por isElective) + `deriveCreditStatus({currentCredits,minCredits,maxCredits})` que retorna 'under'/'ok'/'over' | REQ-01, REQ-05 | developer | — | logic/helpers/deriveElectivity.js, logic/helpers/creditRange.js | vitest (S1.T2) | git revert | DET-1, DET-2, DET-8, DET-16 | pending | 1 |
| S1.T2 | `.spec.ts`/`.test.js` de los helpers cubriendo TC-06 (2 oblig/1 elec), TC-07 (over), TC-08 (under: bajo mínimo con y sin tope; ok: supera mínimo sin tope) con asserts de valores concretos | REQ-01, REQ-05 | developer | S1.T1 | tests/unit/categoryCounts.test.js | `vitest run` del mod verde | git revert | DET-7, DET-13 | pending | 1 |
| S1.T3 | Extender `enrichRequirementCategoryRows`: agregar `blockId` al `select` del `findMany`; exponer `mandatoryCount`/`electiveCount`/`creditStatus` junto a `currentCredits` (rutas list + getInstance); no romper currentCredits | REQ-01, REQ-05 | developer | S1.T1 | logic/curriculum-read.resolver.js | vitest (mock prisma) + lint | git revert | DET-5, DET-8, DET-11, DET-16, RULE-curriculum-design-014 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, `vitest run --coverage` del mod, quality review, decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + vitest verde + coverage no baja | (no aplica) | DET-13, DET-20, DET-23 | pending | 1 |

### Session 2 — Superficies en la lista (REQ-01 + REQ-05) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar columnas `mandatoryCount` ("Obligatorias") y `electiveCount` ("Electivas") al `requirementCategoriesList` en `default_Curriculum_view.json` y `_edit.json` | REQ-01 | developer | S1.GATE | config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_edit.json | JSON.parse OK + layouts-declared.test sin cambio | git checkout de los 2 layouts | DET-2, DET-8, RULE-curriculum-design-014 | pending | 2 |
| S2.T2 | Indicador por fila de "excedida" (`creditStatus`) + contador resumen en la pestaña; resolver card-badge vs columna de estado (DB-gated) | REQ-05 | developer | S1.GATE | config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_edit.json | JSON válido + smoke DB-gated (dev) | git checkout | DET-8, DET-16, RULE-curriculum-design-014 | pending | 2 |
| S2.T3 | i18n de labels (columnas + "Excedida" + contador) en `es_CL`/`en_CL`/`pt_BR`; sin hardcode | REQ-01, REQ-05 | developer | S2.T1, S2.T2 | lang/es_CL.json, lang/en_CL.json, lang/pt_BR.json | paridad de keys en 3 locales | git revert | DET-2, RULE-curriculum-design-014 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T3) — JSON válido, layouts-declared sin regresión, i18n paridad, smoke DB-gated del indicador/contador; persistir + decidir | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + JSON válido + smoke | (no aplica) | DET-13, DET-20, DET-23 | pending | 2 |

### Session 3 — Borrado, validación e integración (REQ-03/02/04) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T1, S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Habilitar `canDelete: true` en `requirementCategoriesList` (ambos layouts) + verificar surface del mensaje del guard (`REQUIREMENT_CATEGORY_HAS_ENTRIES`) | REQ-03 | developer | S2.GATE | config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_edit.json | JSON válido + smoke: borrar con/sin entries | git checkout | DET-8, RULE-curriculum-design-014 | pending | 3 |
| S3.T2 | REQ-02: confirmar `code` como "etiqueta corta" en los layouts CRUD; evaluar validación FE `min≤max` (agregar rule Vueform si el form lo soporta, si no documentar server-side-only) | REQ-02 | developer | S2.GATE | config/layouts/default_requirementCategory_{create,edit}.json | JSON válido + smoke: rango invertido rechazado | git checkout | DET-4, DET-8, RULE-curriculum-design-014 | pending | 3 |
| S3.T3 | REQ-04: verificar que una línea nueva aparece en el selector de MC-06 (TC-05); si hay cache stale, agregar `refetch`/policy en `useCurriculumMesh` | REQ-04 | developer | S2.GATE | modsComponents/CurriculumMesh/useCurriculumMesh.ts (solo si stale) | smoke: crear línea → selector la muestra | git revert | DET-5, DET-8, RULE-curriculum-design-014 | pending | 3 |
| S3.T4 | Sync (`layout npm run sync` + `suite npm run sync` + restart) + acceptance checkpoints + regression suite del mod | REQ-01..05 | reviewer | S3.T1, S3.T2, S3.T3 | — | acceptance + vitest del mod sin regresión | (no aplica) | DET-13, RULE-mods-050 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T3) — acceptance checkpoints ejecutados, quality review, decidir cierre | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + acceptance | (no aplica) | DET-13, DET-20, DET-23 | pending | 3 |

### Task contract — detalle

```
Task S1.T1: helpers puros de conteo y estado de crédito
- source_ref: REQ-01, REQ-05
- agent: developer
- files: logic/helpers/deriveElectivity.js (extiende countByCategory), logic/helpers/creditRange.js (extiende deriveCreditStatus)
- precondition: ninguna
- expected_output: countByCategory(entries) agrupa por categoryId y cuenta por isElective; deriveCreditStatus({currentCredits,minCredits,maxCredits}) = 'under' si currentCredits<minCredits, 'over' si maxCredits!=null && currentCredits>maxCredits, si no 'ok'. Sin Prisma ni imports de Vue.
- validation: cubierto por vitest en S1.T2
- rollback: git revert
- rules: [DET-1, DET-2, DET-8, DET-16]

Task S1.T2: tests de los helpers
- source_ref: REQ-01, REQ-05
- agent: developer
- files: tests/unit/categoryCounts.test.js
- precondition: S1.T1
- expected_output: TC-06 (2 oblig/1 elec), TC-07 (max=60,current=72 → 'over'), TC-08 (max=null,current=999 → 'ok'; min=72,current=30 → 'ok') con asserts concretos
- validation: vitest run del mod en verde
- rollback: git revert
- rules: [DET-7, DET-13]

Task S1.T3: enrichment de requirementCategory
- source_ref: REQ-01, REQ-05
- agent: developer
- files: logic/curriculum-read.resolver.js
- precondition: S1.T1
- expected_output: enrichRequirementCategoryRows agrega blockId al select, expone mandatoryCount/electiveCount/creditStatus junto a currentCredits en list y getInstance; currentCredits intacto
- validation: vitest (mock prisma) + lint
- rollback: git revert
- rules: [DET-5, DET-8, DET-11, DET-16, RULE-curriculum-design-014]

Task S2.T1: columnas obligatorias/electivas
- source_ref: REQ-01
- agent: developer
- files: config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_edit.json
- precondition: S1.GATE (campos enriquecidos)
- expected_output: 2 columnas nuevas en requirementCategoriesList; sin agregar/quitar layouts
- validation: JSON.parse OK + layouts-declared.test sin cambio de contador
- rollback: git checkout de los 2 layouts
- rules: [DET-2, DET-8, RULE-curriculum-design-014]

Task S2.T2: indicador excedida + contador
- source_ref: REQ-05
- agent: developer
- files: config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_edit.json
- precondition: S1.GATE
- expected_output: indicador por fila (card-badge o columna) sobre creditStatus + contador resumen "N excedidas"; no bloqueante
- validation: JSON válido + smoke DB-gated (dev)
- rollback: git checkout
- rules: [DET-8, DET-16, RULE-curriculum-design-014]

Task S2.T3: i18n
- source_ref: REQ-01, REQ-05
- agent: developer
- files: lang/es_CL.json, lang/en_CL.json, lang/pt_BR.json
- precondition: S2.T1, S2.T2
- expected_output: keys de columnas + "Excedida" + contador en 3 locales, con paridad
- validation: paridad de keys
- rollback: git revert
- rules: [DET-2, RULE-curriculum-design-014]

Task S3.T1: habilitar borrado + guard
- source_ref: REQ-03
- agent: developer
- files: config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_edit.json
- precondition: S2.GATE
- expected_output: canDelete:true en requirementCategoriesList; surface del mensaje del guard verificado
- validation: JSON válido + smoke: borrar con entries → bloqueado, sin entries → borra
- rollback: git checkout
- rules: [DET-8, RULE-curriculum-design-014]

Task S3.T2: etiqueta corta + validación FE
- source_ref: REQ-02
- agent: developer
- files: config/layouts/default_requirementCategory_create.json, config/layouts/default_requirementCategory_edit.json
- precondition: S2.GATE
- expected_output: code confirmado como "etiqueta corta"; validación FE min≤max si el form la soporta, si no documentar server-side-only
- validation: JSON válido + smoke: rango invertido rechazado
- rollback: git checkout
- rules: [DET-4, DET-8, RULE-curriculum-design-014]

Task S3.T3: integración selector MC-06
- source_ref: REQ-04
- agent: developer
- files: modsComponents/CurriculumMesh/useCurriculumMesh.ts (solo si hay cache stale)
- precondition: S2.GATE
- expected_output: línea nueva visible en el selector; si stale, refetch/policy
- validation: smoke: crear línea → selector la muestra (TC-05)
- rollback: git revert
- rules: [DET-5, DET-8, RULE-curriculum-design-014]

Task S3.T4: sync + acceptance + regression
- source_ref: REQ-01..05
- agent: reviewer
- files: —
- precondition: S3.T1, S3.T2, S3.T3
- expected_output: layout+suite sync + restart; acceptance checkpoints ejecutados; vitest del mod sin regresión
- validation: acceptance + vitest verde
- rollback: (no aplica)
- rules: [DET-13, RULE-mods-050]
```

## Constraints

- RULE-curriculum-design-014: componentes/artefactos full-page del mod se autoran en el mod; lógica a `.ts` puro testeable. Aplica a los helpers y al resolver de lectura.
- RULE-mods-050: cambios a `config/layouts/*.json` y `lang/*.json` requieren `layout npm run sync` + `suite npm run sync` + restart. El `setup reset` de object-manager NO los hace.
- DEC-032: `requirementCategory` modela color (token/hex) e icon (`bi-*`) — pickers ya implementados.
- DET-32 (necesidad/reuso): objeto, guard, pickers, pestaña, layouts CRUD, enrichment currentCredits, selector MC-06 = reuse; solo se construyen 2 helpers puros + 3 campos derivados; canDelete/columnas = reduce.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| MC-02 (TICKET-082, closed) | internal | objeto requirementCategory + guard + validación de rango + enrichment currentCredits | bajo — cerrado |
| TICKET-093 (cerrado, bajo MC-02) | internal | pestaña embebida + record-list + layouts CRUD | bajo — en la rama |
| TICKET-094 (cerrado, bajo MC-02) | internal | ColorPicker / IconPicker | bajo — sincronizados |
| MC-06 (TICKET-086, closed) | internal | selector de línea (consume requirementCategory) — REQ-04 | bajo — cerrado |
| MC-09 (TICKET-089, open) | internal | bloqueo restrictivo de requisitos al publicar — REQ-05 delega el bloqueo duro | n/a — fuera de scope |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Extender el enrichment rompe `currentCredits` | low | regresión de REQ-10 (MC-02) | cambio aditivo, reusa el `findMany`; `.spec.ts` verifica currentCredits + counts + creditStatus juntos |
| El indicador coloreado por fila no es posible en modo tabla | medium | REQ-05 superficie degradada | modo card (`card.badges[]` sobre `creditStatus`) o columna de estado + contador; se resuelve en S2 (DB-gated) |
| Cache Apollo stale en el selector (REQ-04) | low | línea nueva no aparece hasta refetch | verificar en S3; agregar refetch/policy si aplica |
| Mover el contador de layouts | low | falla `layouts-declared.test` | solo se editan layouts, no se agregan/quitan |

## Open questions

- (ninguna abierta — "etiqueta corta"=code y semántica de REQ-05 resueltas por el dev en intake 2026-07-01)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: "Etiqueta corta" = `code` (sin campo nuevo)
- **Contexto**: el mockup del modal menciona "etiqueta corta"; el objeto no tiene `shortLabel`.
- **Drivers**: `creates_data:false`; `code` ya es "código corto opcional"; agregar campo toca codegen/migración.
- **Opcion elegida**: mapear "etiqueta corta" a `code`.
- **Alternativas**: agregar `shortLabel` al objeto (descartado — contradice el scope FE + `creates_data:false`).
- **Consecuencias**: cero cambio de modelo; si el mockup exige un texto distinto de `code`, escala a cambio de modelo (fuera de MC-07).
- **Session**: S0 (design).

### DEC-LOCAL-02: REQ-05 avisa "incompleta" y "excedida" (3 estados), no bloquea
- **Contexto**: al editar el rango o las asignaturas, `currentCredits` puede quedar fuera de `[min,max]`.
- **Drivers**: el diseñador necesita ver tanto lo que falta (bajo el mínimo) como lo que sobra (sobre el máximo); bloquear rompería la edición de un plan en construcción; el bloqueo duro al publicar es MC-09.
- **Opcion elegida**: derivar `creditStatus` en lectura con tres estados — `'under'` (incompleta, ámbar), `'over'` (excedida, rojo), `'ok'` (en rango). Ambos fuera-de-rango avisan; ninguno bloquea. Color+ícono+texto (WCAG).
- **Alternativas**: (a) bloquear al guardar (descartado — rompe edición); (b) marcar solo "excedida" (decisión inicial del dev 2026-07-01, **revertida** el mismo día: el dev pidió que "bajo el mínimo también debería alarmar").
- **Consecuencias**: aviso informativo cubre edición de rango Y cambios de asignaturas (derivado en lectura); en planes nuevos muchas líneas estarán "incompleta" (0 créditos) — es correcto (refleja lo pendiente). El bloqueo restrictivo queda para MC-09.
- **Session**: S0 (design); ajustado por el dev durante S1 (2026-07-01).

### DEC-LOCAL-03: El indicador de estado vive en el listado de líneas, como texto (no badges, no malla)
- **Contexto**: dónde y cómo mostrar el estado `creditStatus` (incompleta/excedida).
- **Drivers**: la maqueta pone el estado en el listado de líneas; el listado es el rollup por-línea (min/max/current) y donde se edita el rango; la malla agrupa por período (no por línea); el `record-list` en tabla solo soporta texto (no badge coloreado por celda).
- **Opción elegida**: columna "Estado" en el `record-list` de líneas, **texto localizado** ("Incompleta"/"En rango"/"Excedida"). Color/estilo **solo si el record-list lo soporta** dentro de sus capacidades (a determinar en S2.T2); si no, texto plano.
- **Alternativas**: (a) modo card con badges (descartado — diverge de la maqueta tabla); (b) indicador en el componente de malla (descartado — la malla es por período, no por línea; el rollup por línea es del listado); (c) elemento custom (descartado — el dev pidió mantenerse dentro de las capacidades del record-list).
- **Consecuencias**: implementación dentro de config (sin componente nuevo); si el record-list no ofrece color, el aviso es texto (aceptable). Contador resumen queda opcional.
- **Session**: S2 (2026-07-01), decidido por el dev.

## Technical reference

- **Enrichment actual** (`curriculum-read.resolver.js:224-270`): `enrichRequirementCategoryRows` hace `planEntry.findMany({ where:{ categoryId:{ in: categoryIds } }, select:{ categoryId, credits, activityId } })`, agrupa por categoryId y setea `d.currentCredits = sumCurrentCredits(...)`. **Delta**: agregar `blockId` al `select`; setear `d.mandatoryCount`/`d.electiveCount` (via `countByCategory`) y `d.creditStatus` (via `deriveCreditStatus({currentCredits: d.currentCredits, minCredits: d.minCredits, maxCredits: d.maxCredits})` → 'under'/'ok'/'over').
- **Helpers puros existentes reusables**: `deriveElectivity.js` (`isElective`, `partitionByElectivity`, `electivesByCategory`); `effectiveCredits.js` (`sumCurrentCredits`, `computeEffectiveCredits`); `creditRange.js` (`assertMinMaxCredits`).
- **Guard de borrado**: `deleteInstance(objectType:'requirementCategory', id)` corre `assertNoEntriesForCategory` → lanza `REQUIREMENT_CATEGORY_HAS_ENTRIES` si hay entries; backstop DB `onDelete:Restrict`.
- **Record-list**: config nativo `"type":"record-list"` en `default_Curriculum_view.json` (schema `requirementCategoriesList`); columnas, `filters` (`curriculumId == {{parentId}}`), `canCreate/canEdit/canDelete`. Formato de columna en tabla = metadata del campo; badges condicionales solo en modo card (`card.badges[]`, condición campo-vs-literal → por eso `creditStatus` literal).
- **Tests**: vitest. Lógica pura → `.test.js`/`.spec.ts` (node). Mock prisma: `vi.fn()` sobre `prisma.planEntry.count`/`findMany` (patrón `tests/unit/requirementCategoryGuard.test.js`).

## Acceptance checkpoints

- [ ] **Funcional**: REQ-01 (columnas obligatorias/electivas), REQ-02 (crear/editar con pickers + rango), REQ-03 (borrar con guard), REQ-04 (selector refleja línea nueva), REQ-05 (indicador + contador de excedida, no bloqueante)
- [ ] **Tests**: TC-06/07/08 escritos y pasando (helpers puros); guard test existente sin regresión
- [ ] **NFRs**: enrichment sin N+1 (1 findMany); indicador con color+ícono+texto (WCAG)
- [ ] **Rules**: RULE-mods-050 (sync ejecutado); layouts-declared.test sin cambio de contador
- [ ] **Integration**: la vista de malla (MC-05) y el selector (MC-06) no se rompen
- [ ] **Docs**: i18n del mod poblado en 3 locales

## Archiving

Cuando la spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-curriculum-design-formation-lines "razon"`.
