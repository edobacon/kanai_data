# Regresion: RecordDetail view muestra campos vacios (`replaceRecordPlaceholders is not defined`)

> Reporte de caso. Bug de **core** (`layout/`) descubierto durante el smoke de TICKET-112 (UPONE-1451) el 2026-07-24. No lo causo TICKET-112; es una regresion previa ya en `develop`.

## Resumen ejecutivo

En la vista (**view**) de `Activity` (Programa de asignatura), todos los campos aparecen **vacios**, aunque el registro tiene datos (en **edit** se ven bien) y en otros objetos la view funciona. La causa es un `import` faltante en `layout/src/layouts/RecordDetail.vue`: la funcion `replaceRecordPlaceholders` se usa pero no esta importada, lo que lanza un `ReferenceError` que aborta el render de la view. El fix es una linea.

| | |
|---|---|
| **Severidad** | Alta (datos no visibles en views que usan placeholders de record) |
| **Componente** | `layout/` (core) — `src/layouts/RecordDetail.vue` |
| **Estado en develop** | Presente (mergeado) |
| **Origen** | commit `52588ba`, PR #298, rama `feat/UPONE-1353` |
| **Autor del commit** | Ignacio Jorquera |
| **Fecha del commit** | 2026-07-15 |
| **Merge a develop** | 2026-07-17 (`38c1af7`) |
| **Ticket** | [UPONE-1353](https://u-planner.atlassian.net/browse/UPONE-1353) — RBAC-01 (epica UPONE-1355 "Capabilities Bundle") |

## Que esta pasando (sintoma)

- Ruta: `/{tenant}/Activity/{id}/RecordDetail/default_Activity_view`.
- El formulario renderiza los campos (Nombre, Codigo, Version, etc.) como inputs `disabled` pero **sin valor**.
- El **mismo registro** en `default_Activity_edit` carga todo correctamente (ej. `name: "Ecuaciones Diferenciales"`, `code: 111026C`, descripcion completa).
- Otros objetos (ej. `AcademicProgram`) muestran su view sin problema.
- Reproducible con rol Admin y Consultor por igual (no es RBAC).

Verificacion runtime (2026-07-24, suite local, tenant UPU): edit trae datos, view vacio; consola con error repetido en el render de la ruta view.

## Que lo causa (causa raiz)

`layout/src/layouts/RecordDetail.vue` **usa** `replaceRecordPlaceholders(...)` en 6 lugares (lineas 4513, 4537, 4571, 4586, 4600, 4706), pero la funcion **no esta importada**. La linea de import actual (`RecordDetail.vue:212`) es:

```ts
import { resolveFilterPlaceholders, stripReferenceSchemaHints, stripRelationHintsForFKField } from './recordDetailReferenceFilters'
```

Falta `replaceRecordPlaceholders`. La funcion existe y esta exportada en `src/layouts/recordDetailReferenceFilters.ts:44` (con tests en `src/layouts/__tests__/recordDetailReferenceFilters.spec.ts`), pero al no estar en el import, en runtime se lanza:

```
ReferenceError: replaceRecordPlaceholders is not defined
    at src/layouts/RecordDetail.vue:  (dentro de un Array.map en el render)
```

Vue no puede completar el render de la view y los campos quedan sin poblar.

## Por que pasa SOLO en Activity (y no en otros objetos)

`replaceRecordPlaceholders` se invoca en el code path que resuelve placeholders `{{record.*}}` en **filtros de referencia** de la view. Ese path solo corre si el layout de la view usa placeholders `{{record.*}}`.

- **Activity view** (`mods/curriculum-design/config/layouts/default_Activity_view.json`) los usa: el tab "Versiones" (`versionsList`) filtra por `{ "field": "code", "operator": "EQUALS", "value": "{{record.code}}" }`, ademas de titulos con `[record.name]`. Al resolverlos, entra al path roto y lanza.
- **AcademicProgram view** y otros no usan `{{record.*}}` en filtros → nunca entran al path → funcionan.
- **Edit** no dispara ese path de la misma forma (por eso edit carga bien aunque comparta el layout base).

Es decir: no es un problema del layout de Activity; es un bug de core que solo se manifiesta cuando un layout ejercita el placeholder de record. Activity view es el que lo ejercita en este mod.

> Nota: `default_Activity_view.json` tiene ademas un `status` duplicado en los `elements` del tab General (introducido por UPONE-1381). Se evaluo como hipotesis y se **descarto**: quitarlo no corrige la view (el bug es el import faltante). Es un detalle de config menor, aparte.

## Como se corrige

Agregar `replaceRecordPlaceholders` al import de `RecordDetail.vue:212`:

```ts
// Antes
import { resolveFilterPlaceholders, stripReferenceSchemaHints, stripRelationHintsForFKField } from './recordDetailReferenceFilters'

// Despues
import { resolveFilterPlaceholders, replaceRecordPlaceholders, stripReferenceSchemaHints, stripRelationHintsForFKField } from './recordDetailReferenceFilters'
```

- Es un cambio de **una linea**. La funcion ya existe, esta exportada y testeada.
- Verificacion sugerida: abrir la view de un Activity y confirmar que los campos cargan; correr typecheck + tests del workspace `layout`.
- Por **RULE-dev-004** (core): va en rama + revision del team up1, no directo a `develop`.
- Es reutilizable/transversal: corrige la view de cualquier objeto que use placeholders `{{record.*}}` en filtros, no solo Activity.

## Cuando se agrego, en que ticket y quien

Reconstruccion via git (workspace `layout/`):

1. **Definicion local historica**: `replaceRecordPlaceholders` estaba definida **dentro** de `RecordDetail.vue` desde `bb22c67` (Clemente Jara, 2026-02-11).
2. **Commit que rompio**: `52588ba` — *"fix: resolve record filters after loading edit data"* (Ignacio Jorquera, **2026-07-15**). Creo `recordDetailReferenceFilters.ts`, **movio** alli `replaceRecordPlaceholders` + `resolveFilterPlaceholders` (borro sus defs locales) y agrego `import { resolveFilterPlaceholders }` — **omitiendo** `replaceRecordPlaceholders` pese a sus 6 call-sites.
3. **Commit que perpetuo (no origino)**: `ea423651` — *"fix: preserve referencesFilter in schema after FK enrichment"* (mismo autor, mismo dia). Reescribio ese import agregando `stripReferenceSchemaHints, stripRelationHintsForFKField`, pero tampoco incluyo `replaceRecordPlaceholders`.
4. **Ticket / PR**: los tres commits pertenecen a la rama `feat/UPONE-1353`, mergeada a `develop` via **PR #298** (merge `38c1af7`, **2026-07-17**). Ticket **UPONE-1353** — *"RBAC-01 — Un rol institucional puede tener un rol interno distinto en cada mod"* (epica UPONE-1355 "Capabilities Bundle"), asignado a Ignacio Jorquera, hoy en "Revision de companeros".

**Matiz de scope**: UPONE-1353 es un ticket de **RBAC**. El refactor de los filtros de `RecordDetail` fue trabajo **colateral** dentro de ese PR (los commits se titulan sobre "record filters", sin relacion con el RBAC del ticket). Por eso el bug paso desapercibido en la revision de un PR de otra tematica.

## Impacto y recomendacion

- **Impacto**: cualquier RecordDetail **view** con placeholders `{{record.*}}` en filtros de referencia queda con campos vacios. Afecta produccion/develop desde 2026-07-17.
- **Recomendacion**: aplicar el fix de una linea en una rama de core y pasar por revision del team. Idealmente sumar un test de render/smoke de una view con placeholder de record para que no vuelva a romperse silenciosamente (los tests unit de `recordDetailReferenceFilters.spec.ts` prueban la funcion, pero no detectan el import faltante en `RecordDetail.vue`).
