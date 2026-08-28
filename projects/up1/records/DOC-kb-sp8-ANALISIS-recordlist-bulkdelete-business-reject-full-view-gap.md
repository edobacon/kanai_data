---
id: DOC-kb-sp8-ANALISIS-recordlist-bulkdelete-business-reject-full-view-gap
project: up1
type: doc
---

# Gap residual: el borrado MASIVO de negocio rechazado sigue renderizando full-view

> **Tipo:** nota de analisis (KB, no record DKC)
> **Sprint:** SP8
> **Familia:** UPONE-1557 (robustez hard-delete core)
> **Origen:** comentario que el propio PR [#340](https://bitbucket.org/uplanner/layout/pull-requests/340) (UPONE-1600) dejo anotado al arreglar el path individual
> **Fecha:** 2026-08-12
> **Estado del gap:** abierto, sin ticket asignado (candidato a follow-up de layout)

## 1. Que se resolvio (contexto)

**UPONE-1600 / PR #340** (Francisco Navarro, mergeado a `develop` en `affeedec` sobre `2b753ce0`) llevo el path de borrado **individual** gobernado (`customDeleteMutation`) a paridad con el patron toast: un rechazo de negocio ahora sale como aviso y la lista queda intacta.

`layout/src/layouts/RecordList/RecordList.vue`, `handleCriticalDeleteConfirm`, en `origin/develop`:

```ts
// :6514
if (resolveBusinessErrorCode(err)) {
  showWarning(err.message);        // :6515  rechazo de negocio -> toast, lista intacta
} else {
  error.value = `Error deleting record: ${err.message}`;  // :6517  falla real -> full-view
}
```

Discrimina por `extensions.code` via `resolveBusinessErrorCode` (nuevo `layout/src/utils/graphqlErrors.ts`). Esto cubria TICKET-123 (frente frontend de UPONE-1557), que quedo **superseded**.

## 2. El gap (evidencia del comentario)

El path individual **lanza** (throw de `apolloClient.mutate`) y el error trae `extensions.code`. El path **masivo** (`deleteBulkInstances`) no lanza: devuelve los errores en el payload. Ese path sigue escribiendo en `error.value`, que es el mismo ref que gobierna el `<ErrorState>` full-view de carga, asi que un rechazo de negocio por la via bulk **vacia la lista**.

Evidencia en codigo, `RecordList.vue` en `origin/develop`:

```ts
// :6485
const bulkErrors = bulkResult?.data?.deleteBulkInstances?.errors || [];
if (bulkErrors.length > 0) {                                    // :6486
  error.value = bulkErrors.map((e) => e.message).join(' ');     // :6487  <-- full-view, tambien para rechazo de negocio
  return;
}
```

Comentario que el propio autor del PR dejo en el `catch` del path individual, documentando el gap (`RecordList.vue:6510-6513`, verbatim):

```
// OJO: el borrado MASIVO no pasa por aca. Devuelve sus errores en el payload
// (`deleteBulkInstances.errors`, unas lineas arriba) y el tipo `ValidationError` no tiene
// campo `code`, asi que no hay con que discriminar: sigue escribiendo en `error.value`.
// Emparejarlo exige agregar `code` a ese tipo en object-manager.
```

## 3. Analisis: el comentario apunta a `code`, pero el path bulk ya tiene `type`

El comentario razona sobre el mecanismo `extensions.code` (el que usa el path individual). Correcto para ese path. Pero el path bulk **no** usa `extensions`: usa el shape del payload `ValidationError`, que **si** trae un campo de categorizacion (`type`), y el frontend **ya lo pide**.

- Type GraphQL: `object-manager/src/graphql/typeDefs/static.js:531` define `type ValidationError { id, field, message!, messageKey, type }`. Tiene `type` (categorizacion), no tiene `code`.
- El backend lo puebla: `object-manager/src/services/referenceValidationService.js:331,473,495` arma el error con `type: ERROR_TYPES.CONSTRAINT_VIOLATION` para el rechazo por referencia.
- El frontend ya selecciona `type`: `RecordList.vue:1787-1791`, el selection set de `DELETE_BULK_INSTANCES` pide `errors { id field message type }`. O sea `bulkErrors[].type` ya llega al cliente hoy.

**Conclusion:** el rechazo de negocio por la via bulk **se puede discriminar hoy en el frontend** por `bulkErrors[].type` (`CONSTRAINT_VIOLATION` = rechazo de dominio) sin ningun cambio de backend. La premisa del comentario ("no hay con que discriminar") es cierta solo si se insiste en usar `extensions.code`; con el `type` del payload alcanza.

## 4. Opciones de fix

| Opcion | Alcance | Repos | Blast radius | Nota |
|--------|---------|-------|--------------|------|
| **A. Frontend-only** | En `RecordList.vue:6486`, discriminar por `bulkErrors[].type`: rechazo de negocio (`CONSTRAINT_VIOLATION`) -> `showWarning(mensaje)`, lista intacta; falla real -> `error.value`. Gemelo bulk del fix de UPONE-1600. | layout | Minimo, quirurgico | No requiere backend. El `type` ya viaja al cliente. |
| **B. Backend uniforme** | Agregar `code` a `ValidationError` (object-manager), poblarlo, y que el frontend use `resolveBusinessErrorCode` en ambos paths (individual + bulk). | object-manager + layout | Cambia un type GraphQL compartido por create/update/bulk de todos los mods | Unifica el contrato, pero toca un type transversal. |

## 5. Relacion con TICKET-122 (por que NO va dentro)

TICKET-122 (mismo external UPONE-1557, frente `object-manager`) corrige `validateBulkDelete` para que la **proyeccion RT propia** (`rt__*__<base>`) no se cuente como referencia externa, eliminando un `CONSTRAINT_VIOLATION` **falso**. Es causa raiz distinta y en otra capa:

- **122:** el bulk bloquea **de mas** (falso positivo en el conteo de referencias). Backend.
- **Este gap:** cuando el bulk bloquea **con razon**, se renderiza como full-view en vez de toast. Frontend (primary), o contrato backend (opcion B).

Son secuenciales y complementarios: 122 primero deja de bloquear indebidamente; este gap arregla como se ve el bloqueo legitimo. El primary fix (opcion A) vive en `layout`, fuera del `execute_scope` single-module de 122. Meterlo dentro romperia su clasificacion `single (core, object-manager)` y cruzaria repos. La opcion B tocaria el modulo de 122, pero es un cambio de contrato compartido con blast radius mayor que el fix quirurgico de 122; tampoco deberia viajar dentro de ese ticket.

**Recomendacion:** follow-up propio de layout (hermano bulk de TICKET-123), opcion A por defecto.

## Referencias

- PR: https://bitbucket.org/uplanner/layout/pull-requests/340 (UPONE-1600, MERGED a develop, `affeedec`)
- Jira: https://u-planner.atlassian.net/browse/UPONE-1600 (Finalizada), label `core-extension`
- `layout/src/layouts/RecordList/RecordList.vue` (origin/develop): bulk `:6485-6487`; comentario del gap `:6510-6513`; fix individual `:6514-6517`; selection set `:1787-1791`
- `object-manager/src/graphql/typeDefs/static.js:531` (type `ValidationError`)
- `object-manager/src/services/referenceValidationService.js:331,473,495` (`type: CONSTRAINT_VIOLATION`)
- Hermanos: TICKET-123 (superseded por UPONE-1600), TICKET-122 (object-manager, RT projection false-restrict)
- Analisis previos: `BUG-core-recordlist-harddelete-block-renders-as-load-error.md`, `BUG-core-bulkdelete-rt-projection-false-restrict.md`
