---
id: SPEC-sp7-followups-code-audit
project: up1
type: followup
module: general
category: sp7
tags: [up1, follow-up, codigo, deuda-tecnica, doc-audit, no-jira]
fecha: 2026-07-20
---
# Follow-ups de codigo (auditoria doc-vs-codigo, 2026-07-20)

Issues de **codigo** (no de documentacion) detectados al auditar los docs evergreen contra el codigo real durante la actualizacion de la doc externa de las 2 semanas previas. Capturados como **follow-up local** (no se crean tickets Jira sin OK explicito del dev). El codigo manda: cada item tiene evidencia `archivo:linea`.

| # | Item | Ubicacion | Impacto | Prioridad sugerida |
|---|------|-----------|---------|--------------------|
| 1 | `appRoles.resolver.js` guarda sobre `prisma.dataLog`, modelo inexistente tras la migracion a `core_DataLog` (UPONE-1366) | `mods/up1-manager/logic/appRoles.resolver.js:92-95` (+ copia synced en `object-manager/src/graphql/resolvers/mods/up1-manager/appRoles.resolver.js`) | La guarda `if (changed && prisma.dataLog)` es siempre false: el audit `APP_ROLES_UPDATED` **no se registra** (no-op silencioso) | should |
| 2 | Tab "Change History" declara `objectName: "DataLog"` (tipo/alias de negocio retirado; hoy el objeto es `core_DataLog`) | `mods/up1-manager/config/layouts/objectdefinition-view.json:402` + test de contrato `mods/up1-manager/tests/datalog-viewer-contract.test.ts:34` (asserta `'DataLog'`) | El visor podria dejar de resolver si el alias `DataLog` se elimina; migrar a `core_DataLog` | should |
| 3 | Entrada `"status"` **duplicada** en el array `elements` | `mods/curriculum-design/config/layouts/default_Activity_view.json:28,30` | El campo status se renderiza dos veces en el view layout de Activity; artefacto del reorden/merge (UPONE-1381/1393) | could |
| 4 | `updateObjectDefinition` llama `applyChanges(tenantId)` sin `{ destructive: false }` (default destructivo) | `object-manager/src/graphql/resolvers/objectDefinition.resolver.js:1190` (cf. `createObjectDefinition:1071` y `createRecordType:1539` que si lo pasan) | Una edicion **solo de metadata** (`label`/`gender`/`description`/`defaultLayoutType`) gatea al tenant con 503 durante todo el pipeline (codegen + db push + generate), pese a ser aditiva | should |
| 5 | `duplicateReport` no copia `contextId` al payload del clon | `report-builder/logic/reportData.resolver.js` (bloque `duplicateReport`; `contextId` solo aparece en `createReport:960` / `updateReport:1022`) | La copia de un reporte queda sin contexto: bug latente o intencional, a confirmar con el equipo | could |
| 6 | La vista standalone de reporte no pasa `suppressEmptyAlert` | `mods/up1-manager/config/layouts/report-view.json:18` (`type: report-form-manager` → `ReportFormManagerElement` modo view) no pasa la prop; solo `ReportViewerManagerElement.vue:38` (widget de dashboard) la setea | El fix de UPONE-1377 (suprimir el alert bloqueante de Flexmonster en pivots vacios) **no aplica** a la vista standalone; el usuario puede seguir pegando el alert | should |
| 7 | `ActivityStatusBadge` quedo como dead code | `mods/curriculum-design/modsComponents/ActivityStatusBadge/` (Element.vue, composable, stories, test); sin referencias en `config/layouts/*.json` desde que el selector de transiciones lo reemplazo (UPONE-1381 P4) | Codigo muerto (componente + stories + a11y test) que ya no se registra en ningun layout | could |

## Notas

- Ninguno bloquea el deploy actual (verde). Son deuda de calidad/consistencia.
- 1, 2 y 4 tocan **core/object-manager** y **up1-manager**; requieren cuidado por ser workspaces core (no tocar sin permiso explicito).
- Origen: pasada de actualizacion de doc externa del 2026-07-20 (ver docs evergreen editados: `features/{datalog,delete-cascade,enum-transitions,config-system,schema-hot-swap,report-builder,soft-delete}.md`, `core/object-manager.md`, `rbac.md`, `mods/example-curriculum-design.md`).
