# UPONE-1686 - Reconciliacion: la premisa del ticket vs. el codigo real

> **Interno, no pegar en Jira.** Delta entre el analisis previo que origino UPONE-1686 (y la propia
> descripcion del ticket) y lo verificado contra el codigo de `layout` (rama develop) el 2026-08-20.
> Modo reconciliacion de detective-mode: no se descarta el analisis previo ni se cree a ciegas, se
> contrasta con la escena y se marca cada punto contra el dato original.

## Origen del dato reconciliado

- Descripcion del ticket UPONE-1686 (creado 2026-08-20).
- `sp9/UPONE-1619-followup-columnas-relacion-list-embebido.md` (2026-08-19).
- `sp9/UPONE-1619-core-extensions-recordlist.md` (Ticket 2, 2026-08-19).
- `sp9/UPONE-1619-aduana.md` (observacion original).

## Delta

| Estado | Afirmacion original | Realidad verificada (2026-08-20) | Fuente |
|---|---|---|---|
| **Corregido** | "No existe hoy el soporte de columna de proyeccion de relacion (dot-path) en el list" / "el motor las descarta" | **Existe y esta mergeado a develop.** Mecanismo opt-in de columnas de relacion (RelationField) | `useColumnConfiguration.ts:108-125, 203-219`; `recordListFormatters.ts:261-301`; commit `4b9bf665`, PR #351 (2026-08-12), en develop |
| **Corregido** | La causa raiz esta en `applyLayoutColumnOverrides` (`RecordList.vue:7283-7298`), que descarta las columnas no-campo-real | Esa funcion no maneja columnas dot-path (ni las agrega ni es donde vive el mecanismo). El manejo real esta en `useColumnConfiguration.ts`. `applyLayoutColumnOverrides` solo mergea overrides sobre campos reales | `RecordList.vue:7283-7298`; `useColumnConfiguration.ts:108-119` |
| **Confirmado (con matiz)** | El comentario de `RecordList.vue:~7421` ("Virtual columns appended as stubs") esta desactualizado | Confirmado en `7417-7423`. Matiz: las columnas virtuales SI se agregan, pero en otro archivo (`useColumnConfiguration.ts`), no en la funcion que el comentario acompana. El comentario esta mal atribuido, no simplemente obsoleto | `RecordList.vue:7417-7423` |
| **Confirmado** | El smoke S5.T4 vio solo "Nombre" en el listado de piezas | Confirmado, pero la causa NO es falta de capacidad: las 4 columnas dot-path de `piezasList` no declaran `visible: true`, y el mecanismo es opt-in | `default_rt__Modality__curricularsection_view.json:64-70`, `..._edit.json:40-45`; gate en `useColumnConfiguration.ts:203-219` |
| **Confirmado** | `layout/docs/reference/record-list-config-keys.md` no documenta la clave dot-path (relations solo como fetch) | Confirmado. El doc no menciona la columna dot-path, RelationField ni el opt-in `visible:true` | `record-list-config-keys.md` (50 lineas; `relations` solo en la fila de `includeRelations`) |
| **Confirmado** | El resolver del mod enriquece `item.data[rt__...]` con `componentTypeName` | Confirmado | `mods/curriculum-design/logic/curriculum-read.resolver.js:446, 477, 512` |
| **Confirmado** | El RecordDetail ya resuelve el FK escalar por nombre (no rehacer) | Confirmado | `RecordDetail.vue:2045, 3427` |
| **Ignorado / no verificado en su momento** | El analisis previo no valido la frescura: UPONE-1503 (nombre de rama/PR) habia mergeado el mecanismo 7 dias antes del follow-up | El follow-up (2026-08-19) es posterior al merge (2026-08-12) y aun asi concluyo "no existe". Miro la funcion equivocada | commit `4b9bf665` (2026-08-12) vs. fecha del follow-up |
| **Contradiccion** | El mecanismo "es UPONE-1503" | En Jira, UPONE-1503 = "MGR-05 Revision: Roles y Permisos" (Ignacio Jorquera), NO las columnas de relacion. La rama/PR se nombro con ese id pero el ticket Jira es otro tema | Jira UPONE-1503; commits `4b9bf665` / `2a56aae1` |

## Consecuencia para el ticket

- El AC central del PO ("una columna `<rel>.<campo>` renderiza el valor de la relacion") ya se cumple con
  el mecanismo vigente cuando la columna declara `visible: true`.
- El trabajo real remanente es acotado: comentario mal atribuido (core), documentacion de la clave y del
  opt-in (core), tests que fijen el contrato (core), smoke del consumidor, y `visible: true` en el config
  del mod (curriculum-design, fuera del ticket de core).
- Queda como Decision abierta el re-scope (mantener acotado / cerrar como ya resuelto / ampliar) y la
  aclaracion de la contradiccion de id. Ver `UPONE-1686-detalle.md`, seccion Decisiones abiertas.
