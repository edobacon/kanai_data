---
id: BUG-platform-008
project: up1
type: bug
module: platform
tags:
  - i18n
  - recordlist
  - recorddetail
  - route-mode
  - UPONE-1035
---

# i18n: keys del namespace `@RecordList` no se cargan en RecordDetail route-mode

## Symptom

En RecordDetail abierto con `openMode: "route"`, los embeds RecordList muestran keys literales sin traducir:

- `recordList.info.elements`
- `recordList.info.orderedBy`
- `recordList.info.filteredBy`
- `recordList.info.updated`
- `recordList.table.actionsColumn`
- `recordList.pagination.show` / `recordList.pagination.perPage`
- `recordList.modal.viewTitle`

En modal-mode (default) no se reproduce — los embeds heredan el namespace del listado padre.

## Expected behavior

Las keys del namespace `@RecordList` deberian estar disponibles en cualquier ruta donde se renderice un RecordList, incluyendo RecordDetail route-mode con embeds.

## Root cause

[suite/plugins/i18n.ts:135-141](../../../up1/suite/plugins/i18n.ts#L135-L141) carga overrides de lang JSON solo segun el `view_type` del route param activo. Cuando `view_type=RecordDetail`, los overrides `@RecordList` no se cargan, y los embeds quedan sin traducir.

## Impact

UX rota — el user ve strings literales en multiples ubicaciones de cada embed RecordList dentro de un detail route-mode. Inaceptable para release.

## Workaround

Mod-only viable: declarar override `@<Object>-RecordDetail` con keys `recordList.*` duplicadas. NO aplicado en TICKET-009 — decision de no parchar mod-side; bug responsabilidad de plataforma, ya reportado por user al equipo.

Fix real: el plugin i18n del suite deberia cargar los namespaces de RecordList SIEMPRE (no solo cuando view_type=RecordList).

## Source

- [TICKET-009](../../tickets/ticket-009.md) L54a — Session 7 (2026-05-04). Reproducido y confirmado via Playwright.
- Relacionado: PR habilitador-UPONE-1035 (route-mode introducido sin actualizar la carga de i18n).
