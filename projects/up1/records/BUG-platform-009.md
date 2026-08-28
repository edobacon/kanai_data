---
id: BUG-platform-009
project: up1
type: bug
module: platform
tags:
  - apollo-cache
  - recordlist
  - recorddetail
  - route-mode
  - fk-display
  - UPONE-1035
---

# Apollo cache pollution: tras volver de RecordDetail route-mode, FK columns muestran ID raw

## Symptom

Flow de reproduccion:

1. Cargar RecordList (UPU > AcademicActivity). Los FKs (ej. `executionUnitId` con `relationDisplayFields: { OrgUnit: "name" }`) se muestran como nombre legible ("Departamento de Matematicas").
2. Click en un row → abre RecordDetail con `openMode: "route"`.
3. Click "Volver" → vuelve al listado.
4. **Los FK columns muestran el ID raw (cuid `cmokj05cv003kxxe7pokv31pu`)** en vez del nombre, hasta hacer click manual en el boton ↻ refresh.

## Expected behavior

Volver al listado no deberia degradar la presentacion de los datos cacheados.

## Root cause

[layout/src/composables/useDataFetching.ts:143](../../../up1/layout/src/composables/useDataFetching.ts#L143) usa `fetchPolicy: "cache-first"` por default (solo `network-only` con `forceRefresh`). El detail's query escribe scalar JSON `extended` distinto al listado y contamina la entidad cacheada (`Instance:<id>`). Al volver al listado, `cache-first` lee desde cache la entidad polucionada, sin la relacion populada — la columna cae al fallback raw value (cuid).

Confirmado:
- Refresh manual (boton ↻) restaura el display porque dispara `forceRefresh=true` → `network-only`.

## Impact

UX inaceptable para release — el user ve identificadores tecnicos donde antes habia nombres. Afecta multiples FK columns simultaneamente.

## Workaround

No hay band-aid mod-only viable — el cache-first es decision de plataforma. Para fix:
- (a) Cambiar default a `cache-and-network` para el listInstances del listado, O
- (b) Hacer que el detail's query escriba `extended` con el mismo shape que el listado, O
- (c) Invalidar cache del listInstances al cerrar route-mode detail.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L54b — Session 7 (2026-05-04). Reproducido y confirmado via Playwright.
- Relacionado: PR habilitador-UPONE-1035 (route-mode introducido sin contemplar cache invalidation).
