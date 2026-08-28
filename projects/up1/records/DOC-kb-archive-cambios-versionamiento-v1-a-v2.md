---
id: DOC-kb-archive-cambios-versionamiento-v1-a-v2
project: up1
type: doc
---

# Reporte de cambios — `diseño-versionamiento_v1` → `_v2`

| Campo | Valor |
|---|---|
| **Autor del reporte** | Eduardo Bacon |
| **Fecha** | 2026-05-26 |
| **Fuentes de validacion** | Codigo en `/Users/edobacon/Workspace/uplanner/up1` (object-manager, mods/curriculum-design, prisma schema UPU) + KB Deckard `projects/up1/` (specs, rules, decisions, tickets cerrados SP3) |
| **Tickets de referencia** | TICKET-018 (HU3 workflow, closed), TICKET-019 (HU4 rename, closed), TICKET-020 (HU2 changeLog, closed), TICKET-030 (PascalCase casing fix, closed) |

Este reporte documenta los cambios que se introducen en `diseño-versionamiento_v2.md` respecto a `_v1.md`, con la evidencia que los motiva. Cada cambio cita archivo+linea del codigo o del KB y propone la correccion concreta.

---

## Cambios criticos (bloqueaban entrega del SP4)

### CAMBIO-1 — `versionStrategy: "increment"` no aplica a Activity. Default cambia a `"user-provided"`

**Problema en v1**: HU4 dice `versionField` debe ser tipo Int. HU8 espera `version=2` post-clone. D9 declara `increment` como unica strategy en SP4.

**Evidencia**:

- [object-manager/prisma/UPU/schema.prisma:501](object-manager/prisma/UPU/schema.prisma) — `version String` (no Int).
- [mods/curriculum-design/objects/activity.json:39-43](mods/curriculum-design/objects/activity.json) — `"version": { "type": "string", "description": "Identificador de la versión del programa (por ejemplo: v2022-actual, v1)." }`.
- `deckard/projects/up1/specs/curriculum-design/programa-de-asignatura.md:245` — `version | string | Cadena libre (ej: "v2022-actual", "v2")`.
- CAP-CUR-018 Confluence verbatim (`deckard/projects/up1/specs/curriculum-design/capabilities/CAP-CUR-018.md`): *"La codificacion de version es libre (el usuario puede usar codigo de periodo academico, año, secuencial, u otro esquema segun la practica institucional)."*

**Razon**: si dejamos `increment` como unica strategy en SP4, el primer adoptante real (Activity) no puede usar la capacidad — los codes institucionales que ya estan en BD (`v2022-actual`) no son enteros. Migrar el campo a Int implica migracion masiva de datos legacy + romper la libertad de codificacion que CAP-CUR-018 establece como regla de negocio.

**Cambio en v2**:

- Soportar dos strategies en SP4: `"user-provided"` (default para Activity) e `"increment"` (disponible para objects nuevos que prefieran enteros).
- `versionField` puede ser `String` o `Int` — codegen valida coherencia con la strategy declarada.
- Activity adopta con `versionStrategy: "user-provided"` y el usuario provee el codigo de version al crear la nueva (input explicito en el form). El bump automatico no aplica.
- HU3 (param `asNewVersion` en createInstance): si `versionStrategy=user-provided`, el resolver requiere que `data.version` venga en el input — si falta → error `VERSION_VALUE_REQUIRED`.

**Impacto en HUs**:

- HU3 — agrega validacion `VERSION_VALUE_REQUIRED` para strategy user-provided.
- HU4 — `versionField` puede ser String o Int (no solo Int). Validacion de coherencia tipo ↔ strategy.
- HU8 — `versionStrategy: "user-provided"` en lugar de `"increment"`.
- HU10 — toast: "Versión {valor-provisto} creada desde versión {N-1}" (sin asumir formato numerico).

---

### CAMBIO-2 — `sourceRefId` ya tiene semantica activa en el audit chain. Introducir campo nuevo `versionSourceId`

**Problema en v1**: HU9 propone *"nuevo campo `sourceRefId: String (nullable)` en `objects/changeLog.json` con descripción 'ID del objeto origen cuando source=Clone'"*.

**Evidencia**:

- [mods/curriculum-design/objects/changeLog.json:91-96](mods/curriculum-design/objects/changeLog.json) — campo `sourceRefId` ya existe.
- [mods/curriculum-design/objects/changeLog.json:109-119](mods/curriculum-design/objects/changeLog.json) — `sourceRefName` y `sourceRefType` tambien existen.
- [mods/curriculum-design/logic/auditCapture.resolver.js:443-499](mods/curriculum-design/logic/auditCapture.resolver.js) — los tres campos estan en uso productivo:

  ```js
  // Cuando entityType resuelto es `CurricularSection` Y el record tiene `ownerType=Activity` +
  // `ownerId`, redirigimos la row al Activity padre... El item original queda
  // referenciado en `sourceRefId`, `sourceRefName` y `sourceRefType` para no perder trazabilidad.
  resolvedSourceRefId = entityId;                   // id de la CurricularSection
  resolvedSourceRefName = input.data.name ?? null;
  resolvedSourceRefType = input.data.recordType ?? null;
  ```

**Significado actual de `sourceRefId`** (patron L40, TICKET-020 / SP3): id del **hijo polimorfico** que cambio dentro del padre (consolidacion al padre del audit chain).

**Significado propuesto por v1**: id del **objeto origen** cuando se clona (linaje cross-instance).

**Razon**: son dos semanticas **incompatibles** que viven en el mismo campo. Un lector del changeLog no podria distinguir si la fila refleja "Modalidad X dentro de Activity Y cambio" o "Activity Y se clono de Activity Z". Esto corromperia el audit chain que se acaba de cerrar en TICKET-020.

**Cambio en v2**:

- NO tocar `sourceRefId` / `sourceRefName` / `sourceRefType`. Mantienen su semantica L40.
- Introducir campo NUEVO `versionSourceId: String (nullable)` en `changeLog.json` con descripcion explicita: *"ID de la instancia origen cuando esta fila refleja un Create derivado de versionamiento (asNewVersion=true). Distinto de sourceRefId (que captura el hijo polimorfico en el patron L40)."*
- Audit row para una nueva version queda:
  - `action="Create"`
  - `source="DirectEdit"` (o el canal real)
  - `versionSourceId=<sourceActivityId>` (poblado)
  - `sourceRefId=null` (no hay hijo polimorfico involucrado)

**Impacto en HUs**:

- HU9 reescrita: el cambio en `changeLog.json` es **agregar campo nuevo `versionSourceId`**, NO reusar `sourceRefId`. Validacion en `recordAuditEvent`: si `versionSourceId` esta poblado, el resolver valida que el source instance existe y es del mismo `entityType`.
- HU3: el audit emite `versionSourceId` en lugar de `sourceRefId` para el caso versioning.
- HU6 (`createdVia` metadata): el flow n8n del mod consume `versionSourceId` y lo persiste en el changeLog. Sin colision con el patron L40.

---

### CAMBIO-3 — La afirmacion "duplicateReport no tiene resolver" es factualmente falsa

**Problema en v1**: seccion 3.2 dice *"Mutation ad-hoc para `Report`, declarada en typeDefs pero con resolver no implementado."*

**Evidencia**:

- typeDef en [object-manager/src/graphql/typeDefs/up1.js:382](object-manager/src/graphql/typeDefs/up1.js) — `duplicateReport(tenantId: String!, reportId: ID!): Report!`.
- resolver completo en [object-manager/src/graphql/resolvers/up1/report-builder/reportData.resolver.js:1197-1290](object-manager/src/graphql/resolvers/up1/report-builder/reportData.resolver.js) — hace `prisma.report.create` con includes (`ext__uplanner__report`, filters, sorting, visualization, pivot), maneja `(Copy)` en el nombre, retorna formato GraphQL completo.
- cableado via dynamic loader en [object-manager/src/graphql/resolverIndex.js:70-85](object-manager/src/graphql/resolverIndex.js) — recorre `resolvers/up1/` recursivamente y agrega `reportBuilderMutation`.

**Razon**: la premisa de la seccion 3.2 esta mal — el resolver funciona, pero el argumento del doc sigue siendo valido (es ad-hoc, no generalizable).

**Cambio en v2**: reescribir 3.2 acknowledgeando que `duplicateReport` esta implementado y funciona para Reports, pero documentando por que el enfoque no escala: (a) cada objeto que necesite version requiere un resolver custom, (b) no reusa validaciones / RBAC / hooks del CRUD generic, (c) la logica de copy queda duplicada en cada mod.

---

### CAMBIO-4 — `deepClone: ["sections"]` no aplica al modelo polimorfico real de Activity

**Problema en v1**: D1 + HU8 + Anexo 13 declaran `"deepClone": ["sections"]` asumiendo que `sections` es un campo / Prisma relation sobre Activity.

**Evidencia**:

- [mods/curriculum-design/objects/activity.json](mods/curriculum-design/objects/activity.json) — las propiedades son `name, code, recordType, version, previousVersionId, language, description, credits, programLevel, executionUnitId, workflowId, currentStatusId, purpose, externalId`. **No existe campo `sections`.**
- [object-manager/prisma/UPU/schema.prisma:494-516](object-manager/prisma/UPU/schema.prisma) — modelo Activity en Prisma no tiene relacion a CurricularSection.
- [mods/curriculum-design/objects/CurricularSection.json:17-29](mods/curriculum-design/objects/CurricularSection.json) — relacion es polimorfica abierta: `ownerType` (string libre) + `ownerId` (sin FK directa, "polimorfica" segun comentario explicito).

**Razon**: el mecanismo declarativo `"deepClone": [<field-name>]` asume que el campo es una relacion Prisma navegable. Para Activity → CurricularSection eso no existe — la asociacion vive como discriminador polimorfico abierto. Para clonar las secciones de un Activity hay que:

1. Query polimorfica: `findMany({ where: { ownerType: "Activity", ownerId: <sourceId> } })`.
2. Walkear `parentId` recursivamente (jerarquia interna de secciones).
3. Re-mapear ids viejos → nuevos al crear las nuevas secciones.
4. Decidir que hacer con `CurricularLink` (FKs reales a sectionIds — las nuevas secciones tienen ids distintos, hay que remapear las foreign keys).

Esto **no es resoluble** solo con `"deepClone": ["sections"]`. La capacidad declarativa de los Ladrillos 1/2 como esta descrita en v1 no cubre este caso — exactamente el caso del primer adoptante real.

**Cambio en v2**: extender la sintaxis de `prefillFrom.deepClone` para soportar relaciones polimorficas + recursion + remap de FKs internas. Sintaxis propuesta:

```json
"prefillFrom": {
  "exclude": ["currentStatusId", "createdAt", "version", "previousVersionId"],
  "deepClone": [
    {
      "name": "sections",
      "via": "polymorphic",
      "object": "CurricularSection",
      "ownerTypeField": "ownerType",
      "ownerIdField": "ownerId",
      "ownerTypeValue": "Activity",
      "recursiveBy": "parentId"
    },
    {
      "name": "links",
      "via": "polymorphic-derived",
      "object": "CurricularLink",
      "derivedFrom": "sections",
      "remapFields": {
        "sourceSectionId": "sections.id",
        "targetSectionId": "sections.id"
      }
    }
  ]
}
```

Esto es mas complejo que el `deepClone: ["sections"]` original, pero captura la realidad del modelo. Mantenido declarativo — no requiere codigo del mod.

**Impacto en HUs**:

- HU2 (Config prefillFrom) — soporta dos sintaxis: simple (array de field names para Prisma relations) y polimorfica (objeto con metadata). Si crece el alcance, considerar split en HU2a / HU2b.
- HU8 — config concreta de Activity usa la sintaxis polimorfica.
- **Posible escalamiento de SP**: la sintaxis polimorfica + remap de FKs es trabajo platform no trivial. Si SP4 no alcanza, evaluar entregar Activity con un hook custom (`onClone` en el mod) y dejar la sintaxis polimorfica para SP5. Decision pendiente con JuanDi en planning.

---

## Cambios importantes

### CAMBIO-5 — `allowedFromStates: ["Approved", "Published"]` no matchea los codes reales

**Problema en v1**: HU8 declara `"allowedFromStates": ["Approved", "Published"]` (PascalCase EN). Pero los workflowStatus en seed UPU usan codes abreviados `APR`, `PUB`.

**Evidencia**:

- [mods/curriculum-design/seed/_data-workflow-objects.js](mods/curriculum-design/seed/_data-workflow-objects.js) — codes seed: `BOR`, `EDIT`, `PUB`, `APR`, `DIS`, `REV-DEC`, `PROP`, `EVAL`, `REJ`.
- [mods/curriculum-design/objects/workflowStatus.json:29-46](mods/curriculum-design/objects/workflowStatus.json) — `code` es campo unique por institucion, distinto de `name` (display) y `category` (PascalCase EN: ToDo / InExecution / InReview / Published / Closed).

**Razon**: el doc mezcla casing — usa `"BOR"` (codigo corto ES) para `initialStateValue` Y `["Approved", "Published"]` (PascalCase EN) para `allowedFromStates`. Inconsistente internamente. Ademas DECISION-005 (que proponia PascalCase EN) fue superada al implementar HU3 con codes cortos.

**Cambio en v2**: `allowedFromStates` usa codes reales del seed: `["APR", "PUB"]`. `initialStateValue: "BOR"` se mantiene.

---

### CAMBIO-6 — Resolucion de `initialStateValue: "BOR"` debe ser explicita

**Problema en v1**: `Activity.currentStatusId` es FK a `WorkflowStatus.id` (cuid). El doc trata `"BOR"` como valor literal — pero el campo espera un id, no un code.

**Evidencia**:

- [mods/curriculum-design/objects/activity.json:95-104](mods/curriculum-design/objects/activity.json) — `currentStatusId` es FK a WorkflowStatus, referenciado por id.
- [object-manager/prisma/UPU/schema.prisma:511-512](object-manager/prisma/UPU/schema.prisma) — `currentStatusId String?` con `@relation(... fields: [currentStatusId], references: [id])`.
- [mods/curriculum-design/objects/workflowStatus.json:11-14](mods/curriculum-design/objects/workflowStatus.json) — `code` es unique por `institutionId`.

**Razon**: para setear `currentStatusId="BOR"` el resolver del Ladrillo 2 necesita resolver el code al id real del WorkflowStatus correspondiente, considerando: (a) la institucion del usuario que ejecuta el clone, (b) el workflow asignado al source (Activity.workflowId), (c) que el code existe en el catalogo de esa institucion.

**Cambio en v2**: HU3 + HU4 documentan explicito el algoritmo de resolucion:

1. Leer `Activity.workflowId` del source.
2. Buscar el WorkflowStatus con `(institutionId=<source.institutionId>, code=initialStateValue)`.
3. Si no existe → error `INITIAL_STATE_CODE_NOT_FOUND` con detalle (code + institucion).
4. Si existe → setear `currentStatusId = <foundStatusId>` en el nuevo record.

Para `allowedFromStates`: mismo lookup, pero comparando el `code` del WorkflowStatus actual del source (resuelto via FK) contra la lista declarada.

---

### CAMBIO-7 — Versionar y Clonar son capacidades distintas en Confluence — acknowledge explicito

**Problema en v1**: el doc presenta clone como capacidad base y version como `clone + linkage`. Pero el KB tiene los dos conceptos separados.

**Evidencia**:

- BR-VER-002 verbatim: *"Origen de clonacion = campo separado de previousVersionId. La clonacion NO es versionamiento."*
- CAP-CUR-018 (Versionar, Must) y CAP-CUR-022 (Clonar, Should) son capacidades distintas en Confluence.

**Razon**: la unificacion tecnica que propone el doc es defendible (un solo mecanismo evita duplicacion), pero invierte la semantica del modelo de negocio. Sin un acknowledge explicito, un dev futuro puede leer el doc y terminar marcando linaje espurio cuando deberia ser un clone limpio.

**Cambio en v2**: agregar seccion "Decision de unificacion tecnica vs separacion de producto" en la seccion 3 (Contexto). Aclarar que:

- Tecnicamente: ambas operaciones usan `createInstance(prefillFrom: {...})`.
- Versionar = `prefillFrom + asNewVersion=true` → popula `linkageField` (previousVersionId).
- Clonar = `prefillFrom + asNewVersion=false` → NO popula linkageField; instancia independiente sin linaje.
- A nivel de UI siguen existiendo dos row actions distintos: "Crear nueva versión" (Versionar) y "Duplicar" (Clonar, cuando aplique en SP futuro).

---

### CAMBIO-8 — `previousVersionId` debe declararse como FK reflexivo en activity.json (no esta hoy)

**Problema en v1**: HU4 dice *"`linkageField` debe ser un campo FK reflexivo declarado en el mismo object. Codegen valida esto y falla si no."*

**Evidencia**:

- [mods/curriculum-design/objects/activity.json:45-50](mods/curriculum-design/objects/activity.json) — `previousVersionId` solo declarado como string libre, sin `isForeignKey: true` ni `references: "Activity"`.
- [object-manager/prisma/UPU/schema.prisma:502](object-manager/prisma/UPU/schema.prisma) — `previousVersionId String?` sin `@relation`.

**Razon**: para que la validacion de HU4 pase y el codegen genere la relacion en Prisma, hay que declararla en el JSON primero. Si HU4 ejecuta antes de HU8 con la validacion estricta, HU8 quedaria bloqueada por la propia precondicion que HU4 introdujo.

**Cambio en v2**: HU8 incluye explicitamente el cambio en `activity.json`:

```json
"previousVersionId": {
  "type": "string",
  "title": "Previous Version",
  "not_null": false,
  "description": "...",
  "isForeignKey": true,
  "references": "Activity",
  "targetField": "id"
}
```

+ verificar que codegen del platform soporta self-references reflexivas en Prisma. Si no las soporta, HU8 incluye un sub-task de extension del codegen (o degradar la validacion de HU4 a `should` con override documentado).

---

### CAMBIO-9 — Alinear naming: el param real es `objectType`, no `objectName`

**Problema en v1**: el doc usa `objectName` consistentemente (HU-5: `getVersionChain(objectName: String!, ...)`).

**Evidencia**:

- [object-manager/src/graphql/typeDefs/static.js:1145](object-manager/src/graphql/typeDefs/static.js) — `createInstance(objectType: String!, data: JSON!): InstanceResult`.

**Razon**: cambiar el param del platform (a `objectName`) es breaking si hay clientes hardcoded. Mas simple alinear el doc al naming actual.

**Cambio en v2**: usar `objectType` consistentemente en HUs, errores, y ejemplos. Mantener el wording "object" en prosa.

---

## Cambios menores / clarificaciones

### CAMBIO-10 — Acknowledge explicito que SP4 entrega solo versionamiento individual

CAP-CUR-018 menciona versionamiento masivo (job BullMQ asincrono). El doc v1 lo deja implicito en "fuera de alcance". El v2 lo documenta explicito en seccion 10 + cita BR-VER-002 para que el dev de mod entienda que la operacion masiva es trabajo posterior.

### CAMBIO-11 — D1 ("CurricularLink se vacía") requiere mas validacion de producto

La decision en v1 es declarar CurricularLinks vacios al versionar. Esto pierde el wiring pedagogico (DEVELOPS / EVALUATES / COVERS / USES) que el programa tenia.

**Cambio en v2**: marcar D1 como **decision pendiente de Esteban (PM)**, con dos opciones documentadas:

- **D1.a** — vaciar links (perdida total del wiring; nueva version arranca limpia). Justificacion: si el usuario versiona porque cambio la estructura de secciones, los links viejos probablemente no aplican.
- **D1.b** — re-crear links remapeando section ids (preservar wiring). Justificacion: si el versionado es minor (e.g., actualizar bibliografia), perder el wiring es mas perdida que ganancia.

Sin decision firme, no se puede implementar HU8. Bloquea el cierre del diseño.

### CAMBIO-12 — Acknowledge que HU-11 puede requerir componente Vue en suite

El doc v1 no aclara si la seccion "Versiones" en RecordDetail es config-only sobre primitivos existentes, nuevo primitivo en `layout`, o componente Vue en `suite`.

**Cambio en v2**: HU-11 documenta explicito que el primer paso es **discovery** — revisar si existe un primitivo de RecordDetail que renderice una lista navegable con badges + click-through. Si existe → config-only en `mods/curriculum-design`. Si no existe → split en HU-11a (primitivo en `layout`) + HU-11b (config en `mods/curriculum-design`). El doc no asume el camino feliz.

### CAMBIO-13 — `Clone` no se agrega al enum `source` de changeLog

Derivado de CAMBIO-2. Como `versionSourceId` reemplaza el rol de "marca de clonacion via source", el enum `source` queda con sus 6 valores actuales (`DirectEdit, Workflow, ChangeRequest, MADS, Import, SystemCalculation`). El doc v1 proponia agregar `"Clone"` — v2 no lo hace.

Para distinguir filas "Create normal" vs "Create derivado de version" se mira el campo `versionSourceId` (poblado / null), no el enum `source`.

---

## Resumen ejecutivo

| Cambio | Severidad | HUs afectadas | Razon principal |
|--------|-----------|---------------|-----------------|
| **CAMBIO-1** — strategy `user-provided` default en SP4 | Critico | HU3, HU4, HU8, HU10 | `version` es String libre en schema + CAP-CUR-018 |
| **CAMBIO-2** — nuevo campo `versionSourceId`, NO reusar `sourceRefId` | Critico | HU3, HU6, HU9 | `sourceRefId` en uso productivo con semantica L40 |
| **CAMBIO-3** — corregir afirmacion sobre `duplicateReport` | Critico (factual) | Solo prosa seccion 3.2 | Resolver SI esta implementado y cableado |
| **CAMBIO-4** — `deepClone` polimorfico para CurricularSection | Critico | HU2, HU8 | Activity no tiene Prisma relation a secciones |
| **CAMBIO-5** — codes reales en `allowedFromStates` (`APR`/`PUB`) | Importante | HU8 | Seed usa codes cortos ES |
| **CAMBIO-6** — algoritmo de resolucion code→id explicito | Importante | HU3, HU4 | `currentStatusId` es FK a cuid, no code |
| **CAMBIO-7** — separacion Versionar vs Clonar acknowledgeada | Importante | Seccion 3 + prosa | BR-VER-002 verbatim |
| **CAMBIO-8** — declarar FK reflexivo en activity.json | Importante | HU8 | Campo existe pero sin `isForeignKey` |
| **CAMBIO-9** — `objectType` no `objectName` | Menor | Toda la doc | Naming del param real |
| **CAMBIO-10** — masivo explicito fuera de alcance | Menor | Seccion 10 | CAP-CUR-018 / BR-VER-002 |
| **CAMBIO-11** — D1 (CurricularLink) decision PM pendiente | Menor (proceso) | HU8 | Decision de producto, no tecnica |
| **CAMBIO-12** — HU-11 puede crecer si falta primitivo | Menor (scope) | HU-11 | Discovery pendiente en `layout/` |
| **CAMBIO-13** — no agregar `Clone` al enum source | Menor | HU9 | Derivado de CAMBIO-2 |

---

## Pendientes para Esteban / Klaus antes de aprobar v2

1. **CAMBIO-11 (D1)**: ¿links se vacian o se remapean al versionar? Decision de producto.
2. **CAMBIO-4 (deepClone polimorfico)**: ¿SP4 entrega la sintaxis polimorfica completa, o Activity arranca con hook custom y la sintaxis va a SP5? Decision de scope.
3. **CAMBIO-8 (FK reflexivo)**: ¿el codegen del platform soporta self-references hoy? Si no, HU8 crece o HU4 baja la validacion a `should`. Verificacion tecnica con JuanDi.

---

## Apendice — checklist de verificacion contra codigo

Cada item del doc v2 debe poder responder a estas tres preguntas antes del merge:

1. **¿Existe en el codigo lo que el doc afirma que existe?** (precondiciones, fields, resolvers, patterns)
2. **¿El cambio propuesto colisiona con algo existente?** (semanticas activas, patrones consolidados, decisions ya tomadas)
3. **¿La sintaxis declarativa del doc puede expresarse contra el data model real?** (relaciones Prisma vs polimorficas abiertas, codes vs ids, strings vs ints)

Las HUs que no pasan estas tres preguntas regresan a diseño antes de execute.
