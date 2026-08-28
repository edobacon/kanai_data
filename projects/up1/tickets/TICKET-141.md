---
id: TICKET-141
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1686
module: core
autopilot: manual
---

# Core · RecordList · corregir comentario obsoleto + documentar columnas de proyeccion de relacion (dot-path)

## Request

> Core Extension (Non-breaking improvement). Jira: UPONE-1686. Origen: UPONE-1619 (mod curriculum-design). No bloquea a 1619.

El request original pedia CONSTRUIR el soporte de columnas de proyeccion de relacion (dot-path `<relacion>.<campo>`) en RecordList. El comentario del ticket (2026-08-20, Eduardo Bacon) RE-ENCUADRA: la capacidad **ya existe** (opt-in via `visible: true`, mergeada en commit `4b9bf665` "feat(recordlist): support opt-in to-one relation columns", 2026-08-12), y el consumidor real (listado embebido de piezas en la Modalidad) se resolvio mod-only. Por eso el ticket pasa a **corregir lo que la hizo parecer faltante** (doc + comentario, sin cambio de comportamiento):

1. Corregir el comentario obsoleto y mal atribuido en `RecordList.vue` ("Virtual columns ... appended as stubs"): no refleja el comportamiento real. El manejo de columnas de relacion vive en `composables/useColumnConfiguration.ts` (deteccion dot-path + gate `visible`) y `utils/recordListFormatters.ts` (`getDisplayValue` camina el path), no en `applyLayoutColumnOverrides`.
2. Documentar la clave en `layout/docs/reference/record-list-config-keys.md`: como declarar una columna de proyeccion de relacion (`key: "<relacion>.<campo>"` + `relations: ["<relacion>"]` + `visible: true`), con ejemplo y la nota de que es opt-in.
3. (Opcional) Verificar y documentar la degradacion por RBAC del objeto relacionado en la celda dot-path (`getDisplayValue` no consulta RBAC por si solo).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement |
| Tipo de cambio | Core Extension - Non-breaking improvement (doc + comentario) |
| Modulo principal | core (layout) |
| Tier | T0 (doc/comentario, sin cambio de comportamiento) |

## Triage (verificado en codigo, rama develop de layout, 2026-08-25)

- **Commit `4b9bf665`** presente en develop ("feat(recordlist): support opt-in to-one relation columns"). La capacidad existe.
- **Comentario obsoleto**: el texto "Virtual columns (not present in backend metadata) are appended as stubs" esta en `RecordList.vue:7625-7626` (las lineas se corrieron desde las 7417-7423 que citaba el ticket). Ademas el docstring de `~7483` ("backend response are intentionally NOT added") describe el viejo comportamiento de `applyLayoutColumnOverrides`.
- **Mecanismo real** (donde vive de verdad):
  - `src/composables/useColumnConfiguration.ts:108-110`: `relationColumnFields` = columnas con `c.key?.includes('.')` (deteccion dot-path); linea ~212 documenta el gate `visible: true`.
  - `src/utils/recordListFormatters.ts:279`: `getDisplayValue` hace `fieldName.split('.')` y camina el dato de la relacion.
  - `src/composables/useDataFetching.ts`: el fetch de la relacion se activa al declarar `relations`.
- **Doc**: `docs/reference/record-list-config-keys.md` documenta `includeRelations`/`relations` como fetch de datos, pero NO documenta la clave de columna dot-path de render.
- **Nota de atribucion**: el mecanismo se mergeo bajo la rama `feat/UPONE-1503`, pero ese id en Jira es otro tema (Roles y Permisos); no atribuirlo a esa historia.

## Environment

| Campo | Valor |
|-------|-------|
| Branch | UPONE-1686 (layout) |
| Base branch | develop |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Sessions

### S1 — execute (2026-08-25)

Cambio T0 Non-breaking improvement (doc + comentario). Tasks:
- [x] T1 — Corregir el comentario obsoleto en `RecordList.vue:7621-7630` (antes 7625-7626 "Virtual columns ... appended as stubs"): ahora explica que `applyLayoutColumnOverrides` NO agrega columnas ausentes del backend, y que las columnas de proyeccion de relacion (dot-path) las maneja `initializeColumnConfiguration` (`useColumnConfiguration.ts`) con gate `visible: true`, resolviendo el valor con `getDisplayValue` (`recordListFormatters.ts`).
- [x] T2 — Documentar la clave dot-path en `docs/reference/record-list-config-keys.md`: nueva seccion "Columnas de proyeccion de relacion (dot-path)" (requisitos relations + key dot-path + visible:true, ejemplo, donde vive, RBAC, opt-in) + cross-ref en la fila de `includeRelations`/`relations`.
- [x] T3 (item 3, RBAC) — Verificado y documentado: el RBAC se aplica en el fetch de la relacion (respeta el RBAC del objeto relacionado); `getDisplayValue` (`recordListFormatters.ts:278-296`) solo camina `item.data[<rel>].<campo>` y degrada a `-` si el path es null/undefined. Incluido en la seccion nueva del doc.
- [x] T4 (extra, re-verificacion del dev) — Corregido un 2do comentario impreciso en `useColumnConfiguration.ts:104`: decia que el dato llega con `relations` + `includeRelations`; verificado en `useDataFetching.ts:144-156` que el motor lee SOLO `relations` (config del autor) y agrega `includeRelations: true` como variable GraphQL por su cuenta. Comentario reescrito. Re-verificacion completa del mecanismo confirmo que la doc es fiel al codigo (visible-gate literal en useColumnConfiguration.ts:218).

Verificacion (DET-33): diff limpio (2 archivos: RecordList.vue comentario, record-list-config-keys.md +31); `.vue` intacto (llamada `applyLayoutColumnOverrides` preservada); contenido contrastado contra el codigo real en develop (commit 4b9bf665, useColumnConfiguration.ts:108-110, recordListFormatters.ts:278). Sin cambio de comportamiento -> sin tests nuevos (los AC de test del request original ya no aplican: la capacidad existe y esta cubierta por su propio merge). `.sync-registry.json` dirty = output de Lazarus, excluido del commit.

## Testing

| TC | Escenario | Esperado | Actual | Status | Affects UI |
|----|-----------|----------|--------|--------|------------|
| TC1 | Comentario de `RecordList.vue` refleja el mecanismo real | apunta a useColumnConfiguration + getDisplayValue + gate visible, no "stubs" | corregido, verificado en el diff | PASS | no |
| TC2 | Doc documenta la clave dot-path con ejemplo + opt-in + RBAC | seccion nueva presente y precisa | agregada, contrastada contra codigo | PASS | no |

## Summary

**CERRADO 2026-08-25.** PR #366 (layout UPONE-1686->develop) OPEN. Cierre DKC basado en evidencia: cambio T0 verificado contra codigo, teach skip, 0 raw learns, gates PASS.

**Non-breaking improvement (doc + comentario).** El request original pedia construir el soporte de columnas dot-path en RecordList; el comentario del ticket (2026-08-20) re-encuadro: la capacidad ya existe (opt-in via `visible: true`, commit 4b9bf665). Este ticket corrige lo que la hizo parecer faltante: (1) comentario obsoleto en RecordList.vue alineado al mecanismo real; (2) doc de la clave dot-path en record-list-config-keys.md; (3) RBAC verificado y documentado. Ademas se corrigio un 2do comentario impreciso (`useColumnConfiguration.ts:104`, `relations`+`includeRelations` -> solo `relations`). Re-verificacion del mecanismo confirmo que la doc es fiel al codigo. Sin cambio de comportamiento. Rama layout `UPONE-1686` commit `f24eb378` (3 archivos).
