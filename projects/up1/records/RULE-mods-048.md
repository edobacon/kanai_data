---
id: RULE-mods-048
project: up1
type: rule
module: mods
tags:
  - audit
  - n8n
  - flow
  - event
  - metadata
  - versionSourceId
  - withEventPublish
  - curriculum
---

# Extender el audit n8n: emitir metadata con prefijo _ dentro de data; el flow no requiere edición

## What

Para que el flow n8n `audit-capture.json` persista un campo extra (ej. `versionSourceId`), emitir la metadata DENTRO del campo `data` del evento usando el prefijo `_` (ej. `_versionSourceId`). El Code node del flow rutea el campo `data` completo sin mapeo selectivo al llamar `recordAuditEvent` — el campo `_versionSourceId` llega directamente como `input.data._versionSourceId` sin editar el flow. El resolver `recordAuditEvent` (en el mod) lee `input.data._versionSourceId` y persiste el campo. Esta convención elimina la necesidad de editar `mods/curriculum-design/flows/audit-capture.json` al extender el audit.

## Why

El flow `audit-capture.json` es un artefacto compartido con whitelist de objetos (`Activity|CurricularSection|CurricularLink`). Editarlo para cada campo nuevo de metadata aumenta el riesgo de regresión en el pipeline de audit. Al emitir dentro de `data._` y dejar que el flow lo ruteice sin cambios, la extensión es segura y el scope del ticket se reduce al resolver del mod.

## Where

- `object-manager/src/middleware/withEventPublish.js:131-168` (donde se construye y publica el payload del evento `core:*`)
- `mods/curriculum-design/flows/audit-capture.json` (flow n8n — NO editar para metadata extra)
- `mods/curriculum-design/logic/auditCapture.resolver.js` (lee `input.data._versionSourceId`; persiste en ChangeLog)
- `object-manager/src/resolvers/createInstance.js` (3 return paths: RecordType ~L2479, extended ~L3010, regular ~L3012 — inyectar la metadata en LOS TRES)
- Tests: `tests/unit/events/created-via.test.js` (contract test del unwrap: `input.data._versionSourceId`)

## When

Cada vez que se necesita persistir metadata adicional en el audit de un evento de creación (ej. `_versionSourceId`, `_cloneSourceId`, `_createdVia`):
1. Inyectar `_<campo>` dentro del objeto `data` del payload en `withEventPublish.js`, en los 3 return paths de `createInstance`.
2. El resolver del mod lee `input.data._<campo>` y decide qué hacer con él (persistir, ignorar).
3. Escribir un contract test que verifique que `input.data._<campo>` llega con el valor esperado tras el unwrap del flow.

## Verification

1. `grep '_versionSourceId' mods/curriculum-design/logic/auditCapture.resolver.js` → el resolver lee el campo desde `input.data`.
2. `grep '_versionSourceId' mods/curriculum-design/flows/audit-capture.json` → no debe aparecer (el flow no mapea el campo explícitamente).
3. Correr `tests/unit/events/created-via.test.js` (o equivalente) y verificar que el contract test del unwrap pasa.

## Source

- **Discovered in**: TICKET-041
