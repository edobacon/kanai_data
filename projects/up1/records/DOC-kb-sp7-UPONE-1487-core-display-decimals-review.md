---
id: DOC-kb-sp7-UPONE-1487-core-display-decimals-review
project: up1
type: doc
---

# UPONE-1487 (SP7) — Decimales de despliegue declarativos en RecordList/RecordDetail: verificacion de premisa y observaciones

> **Para**: quien tome UPONE-1487 (team core / layout) y reviewers.
> **Jira**: [UPONE-1487](https://u-planner.atlassian.net/browse/UPONE-1487) (Historia, labels Core/layout, prioridad Trivial, estado Backlog, sin asignar, sin links formales).
> **Relacionado**: [UPONE-1458](https://u-planner.atlassian.net/browse/UPONE-1458) (parametro `cm.displayDecimals`, mod curriculum-mapping) y [UPONE-1454](https://u-planner.atlassian.net/browse/UPONE-1454). PR del mod: curriculum-mapping [PR #4](https://bitbucket.org/uplanner/curriculum-mapping/pull-requests/4).
> **Fecha**: 2026-07-29.
> **Estado del analisis**: verificacion estatica. Core verificado contra `origin/develop` de `layout` (tip `96d861d`); contrato del mod contra `origin/UPONE-1458` de curriculum-mapping. Sin smoke runtime.
> **Alcance de este doc**: registrar que la premisa del ticket es correcta y dejar las observaciones (correcciones/aportes) para cuando se implemente o revise.

---

## 0. Contexto

UPONE-1487 es el follow-up de Core del parametro de decimales que el mod curriculum-mapping introdujo en UPONE-1458. El mod ya formatea sus propias celdas read-only del grid; 1487 lleva ese formateo a las superficies que pinta el Core (RecordList y RecordDetail en modo vista), consumiendo el mismo parametro por tenant via el Config System. Es la fase que cierra la "Limitacion 2" documentada en el PR del mod (los numeros que pinta Core seguian crudos).

---

## 1. Veredicto: la premisa es correcta

Cada premisa del ticket se verifico contra el codigo real:

| Premisa del ticket | Verificacion | Evidencia |
|---|---|---|
| Core hoy NO formatea decimales | Confirmado | Sin `toFixed`/decimales en `layout/src/utils/recordListFormatters.ts` (`getDisplayValue` en `:237` devuelve string sin formatear) ni en `layout/src/layouts/RecordDetail.vue` |
| El unico formateo vive mod-side | Confirmado | `mods/curriculum-mapping/modsComponents/RecordCollectionEditor/formatNumber.ts` + el grid (`RecordCollectionGrid.ts:143-144`) |
| Ganchos que nombra el ticket existen | Confirmado | `getDisplayValue` (`recordListFormatters.ts:237`), `viewModeDateInput` (`RecordDetail.vue:2578`, aplicado en `buildFormFromFields:2381`), `buildFormFromFields`/`populateSchemaFields`/`fetchAndBuildForm` presentes en `RecordDetail.vue`. `viewModeNumberInput` NO existe = es el nuevo que propone (coherente) |
| `useConfig` es cache-first | Confirmado | `layout/src/composables/useConfig.ts:83` -> `fetchPolicy: 'cache-first'` |
| Contrato declarativo | Correcto y ya alineado con el mod | El mod usa `displayDecimals: { configAppName, configKey, fallback }` + `formatDecimals: true` por columna en `config/layouts/default_LevelScheme_edit.json:47,51-53` y `_view.json:49,53-55`, la misma forma que propone 1487 |
| No requiere sync/codegen | Plausible | El resolver `getConfigs` ya existe en Core (`object-manager/src/graphql/resolvers/up1/coreConfig.resolver.js:46`); es layout + front |

Conclusion: el ticket no parte de una premisa falsa. El contrato y el mod fueron disenados juntos (ambos citan `DESIGN-core-display-decimals.md`), asi que Core y mod usan la misma forma. No hay que reescribir el ticket.

---

## 2. Observaciones (correcciones / aportes antes de implementar)

| # | Punto | Detalle | Peso |
|---|---|---|---|
| 1 | ChibiList omitido | `layout/src/layouts/ChibiList.vue:727` tambien renderiza numeros con su propio `getDisplayValue` y NO esta en el alcance. Es una tercera superficie de Core que seguiria mostrando crudo. Decidir: agregar al scope o excluir explicito con razon. | Aporte real |
| 2 | Duplicacion de helper (reuso, DET-32) | El mod ya tiene `formatNumber.ts` (`formatDisplayNumber` + `normalizeDecimals`) y `useDisplayDecimals.ts`; 1487 crea el gemelo en Core (`layout/src/utils/displayDecimals.ts`: `formatDisplayDecimals` + `normalizeDecimals`). Definir que el mod pase a consumir el helper de Core para no mantener dos `normalizeDecimals` que puedan divergir. El contrato identico hace la unificacion directa. | Aporte |
| 3 | Divergencia de reactividad + criterio contradictorio | 1487 acepta `useConfig` cache-first (aplica en el proximo reload). El mod, en cambio, EVITO `useConfig` y uso `getConfigs` en `network-only` justamente para cumplir el AC "sin recargar" de 1458 (`useDisplayDecimals.ts:17,96`). Tras 1487, en la misma vista el grid del mod refrescaria en vivo pero los numeros de Core necesitarian reload; y 1487 relaja el "sin recargar" que 1458 exigia. Decidir un criterio comun. | Importante |
| 4 | Design doc referenciado pero ausente | Tanto 1487 como el comentario del mod (`useDisplayDecimals.ts:14`) citan `DESIGN-core-display-decimals.md`, pero el archivo no esta en `layout/develop` ni en la rama del mod (`origin/UPONE-1458`). Confirmar donde vive o commitearlo. | Menor |
| 5 | Early-return del pre-fetch | El AC "layouts sin los flags no disparan la query extra de config" es correcto. El punto delicado (que el propio ticket marca) es el pre-fetch async en RecordDetail antes del render sincrono de vista (`fetchAndBuildForm`). Asegurar el early-return cuando el layout no declara `displayDecimals`, para no regresar performance. | Nota de implementacion |
| 6 | Prioridad subvaluada | Esta en "Trivial", pero toca RecordList + RecordDetail (pre-fetch async, "punto mas delicado") + tipos + tests + layouts + docs. Es al menos Menor/Media. | Higiene |

---

## 3. Relacion con el PR del mod (contexto ya posteado)

En el PR #4 de curriculum-mapping (review de UPONE-1458) quedaron dos AC parciales en F1:
- **Punto 1 (label crudo del panel de admin)**: el `ConfigPanel` de Core devuelve la key cruda cuando `t()` no la resuelve (`ConfigPanel.vue:184-187`, traductor de `i18next-vue` en `:104`). NO lo cubre 1487 (es i18n del suite, va por separado).
- **Punto 2 (formateo solo en el grid del mod)**: es exactamente lo que cierra 1487 (superficies de Core). Se posteo una adenda en el PR aclarando que el punto 2 se traza a 1487 y que el punto 1 y las consultas/nitpicks siguen pendientes del PR.

Nota de higiene Jira: 1487 no tiene `issuelinks`. Convendria linkearlo con 1458 ("relates to").

---

## 4. Pendiente de verificar en runtime (si se revisa el PR de 1487)

- Smoke en un tenant (ej. UPU): una columna de RecordList y un campo de RecordDetail (vista) con `formatDecimals: true` muestran el valor redondeado a los decimales del tenant; en `edit` el input muestra el crudo; un `number` sin el flag no regresa; valor no numerico/vacio pasa intacto (sin `NaN`).
- Que un layout sin los flags no dispare la query extra (AC de performance).
- Coherencia de comportamiento entre el grid del mod (live) y las superficies de Core tras 1487 (ver observacion #3).
