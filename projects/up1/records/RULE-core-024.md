---
id: RULE-core-024
project: up1
type: rule
module: core
tags:
  - createInstance
  - prefillFrom
  - asNewVersion
  - event-payload
  - return-paths
  - RecordType
  - core
---

# Contrato de createInstance: prefillFrom/asNewVersion van en data:JSON! y la metadata de eventos cubre los 3 return paths

## What

En `createInstance`, los flags `prefillFrom` y `asNewVersion` viajan **dentro** de `data: JSON!` (no como argumentos top-level de la mutation). Toda metadata que deba viajar en el payload del evento post-create debe inyectarse en los **3 return paths** del resolver: RecordType (~L2479), extended (~L3010) y regular (~L3012). Omitir el path RT deja que los objetos `rt__*` emitan eventos sin esa metadata.

## Why

El SDL de `createInstance` no expone `prefillFrom`/`asNewVersion` como args propios — viajan opacamente en `data`. Un consumer que los pase como top-level arg los ignorará silenciosamente. Si la metadata de evento se inyecta solo en los paths extended/regular y se omite el path RT, los RecordTypes (en la whitelist de auditoría) quedan sin trazabilidad; el error no aparece en tests unitarios que no ejercen ese path.

## Where

- `object-manager/src/graphql/resolvers/instance.resolver.js` — 3 return paths del create: RecordType (~L2479), extended (~L3010), regular (~L3012)
- `object-manager/src/middleware/withEventPublish.js:131-168` — payload publicado al canal `core:*`
- `layout/src/composables/useCreateRowAction.ts` — `buildCreateData` embebe prefillFrom/asNewVersion en `data`
- `object-manager/src/graphql/resolvers/instance.resolver.js:2186` — lectura de `data.prefillFrom` (no arg top-level)

## When

Al agregar nuevos campos al payload de eventos post-create. Al implementar cualquier consumer frontend o mod que invoque `createInstance` con prefill o versioning. Al extender `createInstance` con nuevas flags de comportamiento.

## Verification

1. Grep `prefillFrom` / `asNewVersion` en el SDL de `createInstance` — NO deben aparecer como args top-level. 2. Verificar que los 3 return paths de `createInstance` incluyen el spread de metadata. 3. Correr `created-via.test.js` con el path RT ejercido. 4. Verificar en el evento BullMQ que los `rt__*` incluyen `_createdVia`.

## Source

- **Discovered in**: TICKET-042, TICKET-041
