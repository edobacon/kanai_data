---
id: DOC-kb-sp8-UPONE-1538-pre-intake
project: up1
type: doc
---

# Pre-intake tecnico - UPONE-1538 (config plan modular)

> Material de trabajo del implementador (Eduardo). Alimenta el intake/execution del ticket UPONE-1538.
> Ticket (contrato): `sp8/UPONE-1538-detalle.md`. Verificado contra codigo real en `uplanner/up1` (2026-08-04).

## Veredicto

Fix de configuracion de layout en 3 JSON. Sin nuevo campo, sin migracion, sin backend.

## Modelo (ya soporta lo necesario, sin cambios)

- `Curriculum` base: `object-manager/objects/business/Base/curriculum.json` (`recordType` enum `Plan`|`Minor`, default `Plan`, l.106-116).
- RecordType Plan: `object-manager/objects/business/RecordTypes/rt__Plan__curriculum.json` (duplicado en `mods/curriculum-design/objects/RecordTypes/rt__Plan__curriculum.json`):
  - `progression` (l.11-18): enum `["Sequential","Modular"]`, default `Sequential`, Plan-only. Origen MC-01/UPONE-1344.
  - `totalCredits` (l.19-24), `totalPeriods` (l.25-30) integer.
  - `periodType` (l.31-37): enum `["Semester","Trimester","Quarter","Annual"]` con `[NEEDS CLARIFICATION]`.
- RecordType Minor: `rt__Minor__curriculum.json` con `properties: {}` (sin progresion/creditos/periodos).

## Layout (lo unico que cambia)

- `mods/curriculum-design/config/layouts/default_Curriculum_create.json`: `progression`/`totalCredits`/`totalPeriods`/`periodType` en l.61-64, todos con `conditions: [["recordType","==","Plan"]]`. Mismo patron en `_edit.json` (l.101-104) y `_view.json` (l.108-111).
- Cambio: a `totalPeriods` (y `periodType` segun escenario A) agregar `["progression","==","Sequential"]` (AND). `totalCredits` se mantiene solo con `recordType==Plan`.

## Notas de implementacion

- La key `conditions` es la prop nativa de Vueform (`[[campo,op,valor]]`), soporta condicionar por `progression`. El composable custom `useFieldConditions.ts` solo procesa `disableConditions` (disabled), no `conditions` (visible). No tocar el motor.
- `curriculum-create.resolver.js` / `curriculum-update.resolver.js` rutean por `recordType`; agnosticos de `progression`. Sin impacto.
- Verificar que Vueform excluye del required a los campos ocultos por `conditions` (para el caso de cambiar a Modular con periodos cargados).

## Gotcha critico: `conditions` sobre enum en modo VIEW (antecedente BUG-core)

`sp7/BUG-core-recorddetail-view-enum-conditions.md` documenta que las `conditions` nativas de Vueform, en modo **view**, se evaluan contra la **etiqueta traducida** del enum, no contra el valor crudo. El bug se detecto justamente en `default_Curriculum_view.json` con `recordType=="Plan"`. Este ticket AGREGA condiciones sobre otro enum (`progression=="Sequential"`) en los mismos layouts, incluido `_view.json`: riesgo alto de reincidir.

- Fix ya aplicado para `recordType`: campo espejo `hidden` con `{{record.recordType}}` (ej. `recordTypeKey`) y condicionar contra ese espejo en view.
- Aplicar el mismo patron para `progression` en `_view.json` (espejo `hidden` con `{{record.progression}}`), o verificar si ya existe un espejo reusable. En create/edit el valor es el del form (crudo), el problema es solo en view.
- Efecto lateral relevante: el fix de ese BUG tambien corrigio el campo `ownerId`/Dueño vacio en view (mismo acoplamiento enum-traducido/autoPopulate); es el mismo campo que 1540 investiga.

## Coordinacion

- UPONE-1450 (versionamiento del Plan) toca el mismo objeto `Curriculum` y su RT (`progression`, `totalCredits`) via prefill/deep-clone. Si sigue en curso, coordinar para no pisar los mismos layouts/RT en paralelo.

## Gotchas de plataforma

- Layout config servido `cache-first` por Apollo: tras `npm run sync`, hard reload para ver el cambio en UPU.
- i18n: si se agregan/tocan keys en `Curriculum.i18n.json` (archivo de objeto compartido), el sync aborta ante conflicto de key (no hay "core gana"); cuidar paridad es/en/pt.

## A resolver en intake

- Escenario `periodType` A vs B (Esteban). Por defecto A.
- Valores del enum `periodType` (heredan `[NEEDS CLARIFICATION]` de SP5).

## Reglas/patrones y su fuente (traza)

- `conditions` nativo es el unico mecanismo de visibilidad; `visibleWhen`/`showIf` no existen (verificado: cero matches en `layout/src`). Fuente: `layout/src/layouts/RecordDetail.vue`; ejemplo `default_Curriculum_create.json`.
- Labels de enum en `lang/es_CL@*.json`, no en el JSON del layout. Fuente: `up1/CLAUDE.md` (i18n) + `lang/` del mod.
- Naming `default_{Objeto}_{modo}` + resolucion por nombre. Fuente: `up1/CLAUDE.md` (Default layout naming convention).
- Enum de `progression` es `String` en el modelo generado, sin enforcement backend. Fuente: `object-manager/prisma/UPU/schema.prisma` (`progression String?`); `typeDefs/dynamic.js`.
- Condicion sobre enum en modo view compara la etiqueta traducida -> campo espejo. Fuente: Jira UPONE-1515; `layout/src/layouts/RecordDetail.vue`.
- Mod-only no toca `layout/src/`; si se tocara el motor, pasa a core (rama + PR). Fuente: `up1/CLAUDE.md` (Critical Rules).

## Archivos candidatos

`default_Curriculum_{create,edit,view}.json`.
