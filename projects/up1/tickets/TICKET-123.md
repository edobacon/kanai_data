---
id: TICKET-123
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1557
module: layout
autopilot: manual
---

# Frontend: un bloqueo legitimo de custom delete debe mostrarse como aviso, no como error de carga full-view

## Request

Frente frontend del bug de hard-delete **UPONE-1557**. Cuando un borrado gobernado (`customDeleteMutation`) es rechazado por el servidor con un error de dominio (por ejemplo un esquema de niveles en uso por una matriz), el `RecordList` reemplaza toda la lista por la pantalla de error de carga con texto generico ("Ocurrio un error inesperado" / "Error al cargar"), en vez de mostrar el mensaje del servidor como aviso y conservar la vista. El path de rowAction `type: mutation` ya lo hace bien (toast, vista intacta); hay que llevar el custom delete a paridad.

> Atado al Jira **UPONE-1557** (frente frontend). El frente backend es TICKET-122 (hermano, mismo external). Afloro al probar el borrado de esquemas de niveles en la rama UPONE-1573.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (core, layout) |
| Modulo principal | layout |
| Modulos afectados | ninguno (comportamiento generico de RecordList; afecta a todo consumer de `customDeleteMutation`) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `handleCriticalDeleteConfirm` escribe el error del custom delete en `error.value`, el mismo ref que gobierna el `<ErrorState>` full-view de carga, y `useFriendlyErrors` no reconoce el mensaje personalizado (cae al generico) | ✓ confirmada | Ver doc de analisis, seccion 2 |
| H2 | El fix correcto es A1 (mostrar el mensaje del servidor como toast en la rama custom delete, sin tocar `error.value`), no A2 (convencion `_PERSONALISED_ERROR` end-to-end, que requiere cambio backend transversal) | ✓ confirmada | Ver doc de analisis, secciones 5-6 (el code llega como `INTERNAL_SERVER_ERROR`, A2 no es cambio de front puro) |

### Context found

- **Analisis code-grounded (fuente de verdad de este ticket)**: [`kb/sp8/BUG-core-recordlist-harddelete-block-renders-as-load-error.md`](../kb/sp8/BUG-core-recordlist-harddelete-block-renders-as-load-error.md). Causa raiz en 3 capas, opciones A1/A2/A2', malla de seguridad y plan de tests.
- **Propuesta Jira**: [`kb/sp8/PROPUESTA-jira-hard-delete-core-robustez-detalle.md`](../kb/sp8/PROPUESTA-jira-hard-delete-core-robustez-detalle.md).
- **Hermano backend**: [[TICKET-122]] (mismo `external`, frente `object-manager`).
- **Oraculo de correctitud**: `layout/src/composables/useRowMutation.ts:151` ya renderiza el error de una mutation como toast sin romper la vista; el fix lleva el custom delete a paridad.
- **Warnings**: cambiar SOLO la rama `customMutation` del catch; no tocar el `error.value` de carga (el `<ErrorState>` full-view de fetch/filtro debe seguir intacto).

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | (a crear) `UPONE-1557-layout-delete-render` |
| Base branch | develop |
| DB state | tenant real con un esquema de niveles en uso por una matriz (mod curriculum-mapping, seed UPU) para reproducir el rechazo de dominio |
| Services | object-manager + suite |
| Test data | escala en uso (ej. `LS-100` referenciada por `MAT-GEN` en el seed de curriculum-mapping) |

### Reproduction steps

1. Listado de un objeto con `customDeleteMutation` cuyo resolver puede rechazar por dominio (ej. LevelScheme).
2. Borrar una fila que el backend rechaza (esquema en uso).
3. Observado: la lista se reemplaza por "Error al cargar ... / Ocurrio un error inesperado". Esperado: aviso (toast) con el mensaje del servidor y la lista intacta.

## Acceptance

- [ ] Un borrado gobernado rechazado muestra el mensaje del servidor como aviso (toast) y la lista permanece visible.
- [ ] Un error de carga de la lista (fetch/filtro) sigue mostrando el `<ErrorState>` full-view (no se degrada).
- [ ] Un borrado gobernado exitoso sigue con toast de exito + refetch.
- [ ] Otros consumers de `customDeleteMutation` (ej. `deleteObjectDefinition`) siguen operando; el error se muestra como toast.
- [ ] Reproduce runtime: borrar un esquema de niveles en uso muestra el aviso "esta en uso, inactivalo en su lugar" con la lista intacta (evidencia runtime real, DET-36).

## Testing

### Test cases (plan; se ejecutan y registran en execute — orden tests-first)

| # | Case | Tipo | Momento | Esperado |
|---|------|------|---------|----------|
| TC-1 | Red: error de carga (fetch/filtro) muestra `<ErrorState>` full-view | component | verde sobre codigo actual | full-view intacto |
| TC-2 | Red: custom delete exitoso -> toast de exito + refetch | component | verde sobre codigo actual | exito |
| TC-3 | Reproduce: custom delete que rechaza -> toast con mensaje del servidor y lista NO reemplazada (`error.value` null) | component | ROJO hoy -> verde con fix | aviso + lista intacta |
| TC-4 | Runtime (DET-36): borrar esquema en uso muestra aviso con la lista intacta | manual/smoke | verde con fix | evidencia runtime real |

## Closure

**Estado:** `closed` — `superseded-by-UPONE-1600` (2026-08-12). Nunca se ejecuto.

Otro dev (Francisco Navarro) resolvio este mismo frente por **UPONE-1600** ("bug de runtime al eliminar un esquema de nivel en uso — Curriculum Mapping"), **PR [#340](https://bitbucket.org/uplanner/layout/pull-requests/340)**, mergeado a `develop` (`affeedec`, sobre `2b753ce0`).

Correspondencia 1:1 con el diseno de este ticket:

- Mismo archivo/funcion/linea: `layout/src/layouts/RecordList/RecordList.vue`, `handleCriticalDeleteConfirm`, el `catch` que escribia `error.value = "Error deleting record: ..."`.
- Mismo enfoque **A1**: el rechazo de negocio va a `showWarning(err.message)` (toast) y la lista queda intacta; una falla real sigue a `error.value` (full-view). La distincion la hace el codigo del error, no el texto.
- Agrega `layout/src/utils/graphqlErrors.ts` (`resolveBusinessErrorCode` / `readErrorExtensions`, discrimina por `extensions.code`) + regression `graphqlErrors.spec.ts`, y alinea `useRowMutation.ts`.
- La repro runtime del PR (borrar LevelScheme en uso en UPU) es exactamente el Acceptance DET-36 de este ticket.

**No cubierto por UPONE-1600 (residual):** el path de borrado **masivo** (`deleteBulkInstances.errors` -> `RecordList.vue:6486` -> `error.value`) sigue reemplazando la lista por full-view en un rechazo de negocio. El comentario del propio PR lo deja anotado. Registrado como follow-up (ver relacion con TICKET-122). El spec [[SPEC-layout-fix-recordlist-delete-error-render]] queda sin fuente de verdad; candidato a archivar con `/dkc-archive-spec`.
