---
id: DOC-kb-core-datalog-audit-recordtype-alias-gap
project: up1
type: doc
---

# DataLog audit — funcionalidad core usada/extendida por UPONE-1380 + gotcha del alias RecordType

> Doc local de platform (up1). Registra qué de **core** usó/extendió P3 (historial en DataLog) y un
> gotcha transversal a **cualquier mod** que audite objetos RecordType-projected editados por la UI.

## Core que P3 usó

- **`core_DataLog`** (`objects/core/core_DataLog.json`) — bitácora genérica por operación (PLAT-13).
  Consultable vía `listInstances("core_DataLog")`. ON por defecto (opt-out `enableDataLog: false`).
- **`withDataLog`** (`src/events/decorators/withDataLog.js`) — decorator en la cadena
  `withEventPublish → withObjectAuth → withDataLog → resolver`. Escribe la fila tras el éxito.
- **`metadata.polymorphicChildren` / `polymorphicChildrenDerived`** (declaración por objeto) +
  `readPolymorphicChildren` — base para atribuir el hijo al padre.

## Core que P3 extendió (UPONE-1380)

- `core_DataLog`: **+4 campos** `parentObject`, `parentId`, `childRecordType`, `historyKey`
  (atribución del hijo polimórfico + clave del historial unificado). Índices `(parentObject,parentId)`
  y `(historyKey,createdAt)`.
- `withDataLog`: **atribución polimórfica** vía `resolveAttribution` (`polymorphicAttribution.js`,
  3 caminos: owner directo / recursivo / derivado) + **normalización del alias RecordType** vía
  `resolveBaseObjectType` + **`recordMutationDataLog`** (helper de escritura exportado, reutilizable
  por resolvers que bypasean la cadena).

## ⚠️ Gotcha transversal — auditoría del path RecordType alias

**Cómo edita la UI:** los objetos tipados (Curriculum, Activity, secciones) se editan por su **alias
RecordType** `rt__<RT>__<base>`, no por el `objectType` base:
- Curriculum/Activity → `updateXWithRecordType` → `updateInstance("rt__<RT>__<base>")` (delega al generic).
- Secciones → el override del mod `polymorphicUpdate.resolver.js` intercepta `rt__X__curricularsection`
  y hace writes propios (NO pasa por el generic ni por `withDataLog`).

**El bug (P3, corregido):** `isDataLogEnabled` resolvía el objeto por `${objectType}.json` en
`business/Base` — no en `RecordTypes/` → para el alias daba `false` → **la edición tipada de la UI no
se auditaba**. Además el override del mod nunca llamaba a la escritura de DataLog. Resultado: los
planes de estudio y sus hijos no aparecían en el historial, pese a que la atribución backend
funcionaba con `objectType` base.

**La regla para futuros tickets/mods:**
1. Gates/auditoría que resuelven objetos **por nombre** deben **normalizar el alias `rt__X__base` a su
   base canónico** (usar `resolveBaseObjectType` o equivalente).
2. Cualquier resolver que **reemplace** create/update/deleteInstance con writes propios (bypass de la
   cadena de decorators) debe llamar **`recordMutationDataLog`** o esa mutación no se audita.
3. Testear el **path del alias** (el que usa la UI), no solo el `objectType` base — el gap de P3
   pasó S1-S5 porque todos los tests usaban el base.

Relacionado: [`event-publish-polymorphic-rt-gap.md`](event-publish-polymorphic-rt-gap.md) (mismo
patrón rt__ en el pre-fetch de `withEventPublish`, que motivó el override del mod).
