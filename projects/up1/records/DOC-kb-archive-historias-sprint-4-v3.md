---
id: DOC-kb-archive-historias-sprint-4-v3
project: up1
type: doc
---

# Historias de usuario — Sprint 4 uP1: Versionamiento de objetos (v3)

> Derivadas del doc de diseño `diseño-versionamiento_v3.md`.
> Reemplaza a `historias-sprint-4_v2.md`. Cambios documentados en `cambios-versionamiento_v2-a-v3.md`.
> Prisma: **implementacion primero** — incluye track 0 de cambios en SOT (`IMP-1..IMP-8`).
> Cada HU es un bloque autocontenido, listo para copiar a Jira.
> El doc de diseño se adjunta como contexto a todas las HUs.

---

## Track 0 — Cambios en SOT (NUEVO en v3)

Estos cambios modifican el codigo, schema, BD, Confluence o KB para que las HUs del track 1+ entreguen el vision declarativo de v1. Se ejecutan **antes** que las HUs que dependen de ellos. Si un IMP es vetado, su HU se elimina y el track 1+ aplica fallback v2 para esa concesion (documentado en cada HU).

---

### HU-0a · Migrar Activity.version a Int + agregar versionLabel (IMP-1)

**Sprint:** SP4 · **Track:** SOT change · **Repos:** `mods/curriculum-design`, `object-manager` (prisma migration), Confluence (Esteban)

**Como** equipo platform + PM
**Quiero** que `Activity.version` sea `Int` (auto-managed) y agregar `versionLabel: String?` (codigo institucional libre)
**Para** que el versionamiento auto-incremental (`versionStrategy: "increment"`) funcione naturalmente sobre Activity, manteniendo la libertad de codificacion institucional via `versionLabel`.

**Criterios de aceptación:**

- [ ] **Coordinacion**: Esteban actualiza CAP-CUR-018 en Confluence reflejando la dualidad `version` (system) + `versionLabel` (user). Adjuntar link en este ticket.
- [ ] `mods/curriculum-design/objects/Activity.json`:
  - [ ] `version`: cambiar `"type": "string"` → `"type": "integer"`, agregar `"static_default": "1"`, actualizar `description`.
  - [ ] Agregar nuevo campo `versionLabel: { "type": "string", "not_null": false, ... }`.
- [ ] `mods/curriculum-design/seed/_data-univalle.js` y `_data-aiep.js`: cambiar `PROGRAMA_VERSION = 'v2022-actual'` → `PROGRAMA_VERSION = 1` + `PROGRAMA_VERSION_LABEL = 'v2022-actual'`. Actualizar el objeto seed con ambos campos.
- [ ] `specs/curriculum-design/legacy-examples.md` y `programa-de-asignatura.md`: actualizar referencias.
- [ ] Sync corre limpio en tenant UPU. Las 2 instancias seedeadas tienen `version=1` y `versionLabel="v2022-actual"`.
- [ ] Layouts existentes de Activity actualizados (RecordList y RecordDetail) para mostrar ambos campos.
- [ ] Tests: el seed produce instancias con `version: 1` (Int) + `versionLabel` poblado. Smoke UI muestra ambos campos.

**Dependencias:** Esteban firma actualizacion Confluence · **Spec:** `_spec-HU-0a.md`.

**Si vetado**: fallback v2 — `versionStrategy: "user-provided"` se mantiene como default. HU-3, HU-4, HU-7, HU-10 absorben la complejidad de input manual.

---

### HU-0b · Agregar transiciones APR al workflow activity-standard (IMP-2)

**Sprint:** SP4 · **Track:** SOT change · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design + PM
**Quiero** que el workflow `activity-standard` tenga un estado `APR` (Aprobado) entre `REV-DEC` y `PUB`
**Para** que `allowedFromStates: ["APR", "PUB"]` coincida con el modelo de negocio Confluence (BR-WKF-001) y la auditoria distinga "aprobar" de "publicar".

**Criterios de aceptación:**

- [ ] **Decision en planning (P3.2)**: ¿la transicion combinada `REV-DEC → PUB` ("Aprobar y publicar") se elimina, o coexiste como atajo opcional? Default v3 propone coexistir.
- [ ] `seed/_data-workflow-objects.js` activity-standard transitions, agregar:
  - [ ] `REV-DEC → APR` ("Aprobar", `requiresComment: false`)
  - [ ] `APR → PUB` ("Publicar", `requiresComment: false`)
  - [ ] (Opcional, segun decision) `APR → EDIT` ("Devolver para edicion desde aprobado", `requiresComment: true`)
- [ ] `npm run seed --tenant=UPU` corre limpio. Catalogo de WorkflowStatus en UPU incluye `APR` (Aprobado, category=Published).
- [ ] Tests de seed actualizados: workflow `activity-standard` tiene transitions esperadas.
- [ ] Smoke UI: una Activity en REV-DEC puede transicionar a APR via `transitionActivityValidated`. Una Activity en APR puede transicionar a PUB.

**Dependencias:** P3.2 resuelta · **Spec:** `_spec-HU-0b.md`.

**Si vetado**: fallback v2 — `allowedFromStates: ["PUB"]`. HU-10 row action visible solo en PUB.

---

### HU-0c · Rename sourceRefId → parentChildRefId en changeLog (IMP-3)

**Sprint:** SP4 · **Track:** SOT change · **Repos:** `mods/curriculum-design`, `mods/curriculum-design/flows`

**Como** dev del mod curriculum-design
**Quiero** renombrar los 3 campos del patron L40 en `changeLog` (`sourceRefId/Name/Type` → `parentChildRefId/Name/Type`)
**Para** liberar el nombre `sourceRefId` para su rol original (id del objeto origen al versionar/clonar) sin colision semantica.

**Criterios de aceptación:**

- [ ] **Tests de regresion completos del audit chain SP3** antes del merge (TICKET-020 / L40 pattern).
- [ ] `mods/curriculum-design/objects/changeLog.json` — rename de 3 properties:
  - [ ] `sourceRefId` → `parentChildRefId`
  - [ ] `sourceRefName` → `parentChildRefName`
  - [ ] `sourceRefType` → `parentChildRefType`
  - [ ] Actualizar `description` con la semantica explicita ("id del hijo polimorfico consolidado al padre per patron L40 del audit chain SP3").
- [ ] `mods/curriculum-design/logic/auditCapture.resolver.js`: rename de `resolvedSourceRef*` → `resolvedParentChildRef*` + actualizar comentarios L40.
- [ ] `mods/curriculum-design/flows/audit-capture.json`: actualizar mapping de campos pass-through.
- [ ] Tests de regresion del audit chain: todos los test cases de TICKET-020 / SP3 siguen pasando con los nombres nuevos.
- [ ] Migracion Prisma: rename de columnas en BD UPU (no perdida de datos).
- [ ] Tests AC2 de TICKET-020 re-ejecutados verde: changeLog para edits de CurricularSection consolidados al Activity padre tienen `parentChildRefId` poblado (no `sourceRefId`).

**Dependencias:** P3.3 resuelta (Klaus aprueba el rename) · **Spec:** `_spec-HU-0c.md`.

**Si vetado**: fallback v2 — agregar campo NUEVO `versionSourceId` en `changeLog.json` (sin tocar `sourceRefId`). HU-3, HU-6, HU-9 usan `versionSourceId`.

---

### HU-0d · Codegen soporta polymorphicChildren en object JSON (lectura) (IMP-4 parcial)

**Sprint:** SP4 · **Track:** SOT change (platform) · **Repo:** `object-manager`

**Como** dev platform
**Quiero** que el codegen lea un bloque `polymorphicChildren` en el JSON del object y genere una relacion virtual de lectura
**Para** que `prefillFrom.deepClone: ["sections"]` funcione naturalmente sobre objetos con relaciones polimorficas abiertas, sin requerir sintaxis explicita en cada JSON consumer.

**Criterios de aceptación:**

- [ ] Spike de 1 dia previo (JuanDi): validar viabilidad + diseñar API exacta.
- [ ] Schema del bloque (en JSON del object):
  ```json
  "polymorphicChildren": [
    {
      "name": "<aliasFieldName>",
      "object": "<TargetObject>",
      "via": "<ownerTypeField>/<ownerIdField>",
      "ownerTypeValue": "<ValorPolimorfico>",
      "recursiveBy": "<selfRefFieldOnTarget>"
    }
  ]
  ```
- [ ] Codegen valida la estructura — campos requeridos `name, object, via, ownerTypeValue`. Estructura invalida → error.
- [ ] Codegen registra el `<aliasFieldName>` en el "relation map" interno del platform — accesible por:
  - [ ] El resolver de `createInstance` cuando `prefillFrom.deepClone` lo referencia.
  - [ ] (Opcional SP4) Query GraphQL virtual: `activity.sections` retorna los hijos.
- [ ] Resolver de `prefillFrom.deepClone` (HU-2) consulta el relation map y, si encuentra una entrada polimorfica:
  - [ ] Ejecuta `findMany({ where: { [ownerTypeField]: ownerTypeValue, [ownerIdField]: source.id } })` sobre el target object.
  - [ ] Si `recursiveBy` esta declarado, walkea el arbol respetando la jerarquia y remapea ids.
  - [ ] Crea los nuevos hijos con `ownerId: <newRecord.id>` y nuevos `parentId` consistentes con la nueva jerarquia.
- [ ] Tests: clonar Activity con 5 CurricularSections (algunas con parentId) produce 5 nuevas secciones bajo el nuevo ownerId, con jerarquia preservada.
- [ ] **NO incluye `polymorphicChildrenDerived`** (remap de FKs internas tipo CurricularLink) — eso queda para SP5. Activity usa HU-8b (hook temporal del mod) para CurricularLinks.

**Dependencias:** Spike P3.4 + Klaus + JuanDi · **Spec:** `_spec-HU-0d.md`.

**Si vetado** (o spike concluye que no cabe en SP4): fallback v2 — sintaxis polimorfica explicita en `prefillFrom.deepClone` de Activity (modelo v2). HU-8a se complica.

---

### HU-0e · Codegen auto-declara self-references reflexivas (IMP-5)

**Sprint:** SP4 · **Track:** SOT change (platform) · **Repo:** `object-manager`

**Como** dev platform
**Quiero** que el codegen detecte campos que referencian al mismo object (self-reference) y agregue `@relation` reflexivo en Prisma automaticamente
**Para** que HU-8a no necesite agregar `isForeignKey + references` boilerplate cuando declare `previousVersionId`.

**Criterios de aceptación:**

- [ ] **Estrategia conservadora**: codegen detecta cuando un field tiene `references: "<MismoObjectName>"` declarado + auto-agrega `isForeignKey: true` implicito y genera `@relation` en Prisma con nombre canonico (`<Object>_self_<fieldName>`).
- [ ] Tests: declarar `previousVersionId: { type: "string", references: "Activity", targetField: "id" }` (sin `isForeignKey`) produce Prisma con `previousVersionId String?` + `@relation(...)` reflexivo.
- [ ] No rompe self-refs ya declarados explicitamente (idempotente).
- [ ] HU-4 (config versioning) usa esta capacidad para validar `linkageField` sin requerir el flag explicito.

**Dependencias:** Ninguna directa (puede arrancar semana 1) · **Spec:** `_spec-HU-0e.md`.

**Si vetado**: fallback v2 — HU-8a agrega `isForeignKey: true, references: "Activity"` explicito en `previousVersionId`.

---

### HU-0f · SET NOT NULL en Activity.workflowId y currentStatusId (IMP-6)

**Sprint:** SP4 · **Track:** SOT change · **Repos:** `mods/curriculum-design`, `object-manager` (prisma migration)

**Como** dev del mod curriculum-design
**Quiero** que `Activity.workflowId` y `Activity.currentStatusId` sean NOT NULL en BD
**Para** simplificar la logica del resolver de versionamiento (no defensive null) y cerrar el "S14 deferido" de TICKET-019.

**Criterios de aceptación:**

- [ ] Pre-check: verificar que las 2 instancias UPU tienen ambos FKs poblados (esperado tras S15 de TICKET-019). Si alguna tiene null, backfill con seed → activate workflow per institutional default.
- [ ] `mods/curriculum-design/objects/Activity.json`:
  - [ ] `workflowId`: cambiar `"not_null": false` → `"not_null": true`. Actualizar `description` (remover "Nullable hasta S14").
  - [ ] `currentStatusId`: idem.
- [ ] Sync genera migracion Prisma con SET NOT NULL en ambas columnas. Aplica a tenant UPU sin errores (gracias al backfill previo).
- [ ] Tests: una Activity creada sin `workflowId` falla con error claro. Las 2 instancias UPU tienen FKs poblados.
- [ ] Actualizar `activity.resolver.js` para remover guardas defensivos por null en estos campos (si existen).

**Dependencias:** TICKET-019 S15 completado (ya esta) · **Spec:** `_spec-HU-0f.md`.

**Si vetado**: fallback v2 — HU-3 y HU-7 agregan defensive null handling con error `SOURCE_WORKFLOW_NOT_ASSIGNED` y fail-closed.

---

### HU-0g · Unificar KB AcademicActivity → Activity + agregar "Clone" a action enum (IMP-7 + IMP-8)

**Sprint:** SP4 · **Track:** SOT change · **Repos:** `mods/curriculum-design`, KB Deckard (`projects/up1/specs/curriculum-design`)

**Como** dev del mod curriculum-design
**Quiero** unificar las referencias del KB a `Activity` (post-rename de TICKET-019) y agregar el valor `"Clone"` al enum `action` de `changeLog`
**Para** cerrar el lag KB↔codigo y dar soporte semantico al audit row de versionamiento.

**Criterios de aceptación:**

- [ ] **KB rename** (IMP-7):
  - [ ] Grep + replace `AcademicActivity` → `Activity` en `deckard/projects/up1/specs/curriculum-design/`:
    - `overview.md`
    - `programa-de-asignatura.md`
    - `legacy-examples.md`
    - `open-questions.md`
    - `business-rules/BR-*.md`
    - `capabilities/CAP-CUR-*.md`
  - [ ] Mantener 1 nota historica del rename en `overview.md` ("renombrado de AcademicActivity → Activity en TICKET-019 / 2026-05-XX").
  - [ ] Verificar que ninguna referencia accidental quede a `AcademicActivity` con grep final.
- [ ] **Action enum** (IMP-8):
  - [ ] `mods/curriculum-design/objects/changeLog.json`: agregar `"Clone"` al enum `action`. Total: `["Create", "Update", "Delete", "StateTransition", "MADSSync", "Import", "Restore", "Clone"]`.
  - [ ] Actualizar `description` del campo `action` para incluir "`Clone` = creacion derivada de versionamiento (vs `Create` para creacion scratch)".
  - [ ] `mods/curriculum-design/logic/auditCapture.resolver.js`: aceptar `operation: "clone"` en input + persistir `action: "Clone"`.
  - [ ] `mods/curriculum-design/flows/audit-capture.json`: extender el routing para soportar la operacion clone (filtrar create events con `createdVia: "version"` y mappear a `action: Clone`).
  - [ ] Tests: audit row para Activity creada via versionamiento tiene `action: "Clone"`. Audit row para Activity creada scratch tiene `action: "Create"`.

**Dependencias:** Ninguna directa · **Spec:** `_spec-HU-0g.md`.

**Si vetado parcial**:
- IMP-7 (KB rename) vetado: HU-12 docs agrega nota al pie. Sin impacto en codigo.
- IMP-8 (`Clone` action) vetado: HU-9 mantiene `versionSourceId` como discriminador (fallback v2). El audit row queda con `action: "Create"` + `sourceRefId` o `versionSourceId` poblado.

---

## Track 1 — Core object-manager

---

### HU-1 · prefillFrom param en createInstance

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** que `createInstance` acepte `prefillFrom: { sourceId, includeRelations? }`
**Para** crear una instancia pre-llenada con datos de otra del mismo tipo, sin escribir resolver custom.

**Criterios de aceptación:**

- [ ] `createInstance(objectType: String!, data: JSON!, prefillFrom: PrefillFromInput)` acepta `prefillFrom` opcional sin romper llamadas existentes.
- [ ] Cuando `prefillFrom` está presente, el resolver lee `sourceId`, valida que existe y es del mismo `objectType`, y construye el `data` combinando los campos del source con los explícitos del input (explicit pisa source).
- [ ] El default `exclude` siempre incluye `id`, `createdAt`, `updatedAt`, `createdBy`.
- [ ] Errores: `PREFILL_SOURCE_NOT_FOUND`, `PREFILL_SOURCE_TYPE_MISMATCH`.
- [ ] Tests: prefill básico, prefill con override explícito, prefill con source inexistente, prefill cross-type rechazado.

**Dependencias:** Ninguna · **Spec:** `_spec-HU1.md`.

---

### HU-2 · Config prefillFrom en JSON del object (declarativo simple)

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar `"prefillFrom": { "exclude": [...], "deepClone": [...] }` en el JSON del object con sintaxis declarativa simple
**Para** gobernar qué se hereda al pre-llenar sin escribir sintaxis polimorfica explicita (la complejidad polimorfica vive en `polymorphicChildren` a nivel object — HU-0d).

**Criterios de aceptación:**

- [ ] Codegen valida la estructura de `prefillFrom`; estructura invalida → error de codegen.
- [ ] El resolver lee la config y aplica:
  - [ ] `exclude` (skip esos campos del source).
  - [ ] `deepClone` es array de strings. Cada string puede ser:
    - [ ] Una Prisma relation declarada (FK explicita) → walkea normal.
    - [ ] Un alias de `polymorphicChildren` (HU-0d) → walkea via relation map + remapea ids + recursivo si `recursiveBy` declarado.
- [ ] Si el JSON no declara `prefillFrom`, se aplica solo el default `exclude`.
- [ ] Documentado en `object-manager/docs/prefill-capability.md` con ejemplo simple + ejemplo con `polymorphicChildren`.
- [ ] Tests: exclude respetado, deepClone Prisma relation directa, deepClone polymorphicChildren alias, polymorphicChildren recursivo, sin config (defaults), config malformada rechazada.

**Dependencias:** HU-1, HU-0d · **Spec:** `_spec-HU2.md`.

**Si HU-0d vetada**: fallback v2 — esta HU acepta sintaxis polimorfica explicita en `deepClone` (objeto con `via: "polymorphic"`, etc.). Mas verbosa, mismo funcionamiento.

---

### HU-3 · asNewVersion param en createInstance

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** que `createInstance` acepte `asNewVersion: Boolean`
**Para** crear una nueva versión sin escribir resolver custom.

**Criterios de aceptación:**

- [ ] `createInstance` acepta `asNewVersion` opcional. Requiere `prefillFrom` — sin él → error `AS_NEW_VERSION_REQUIRES_PREFILL`.
- [ ] Si `asNewVersion=true` y el JSON no tiene bloque `versioning` → error `OBJECT_NOT_VERSIONABLE`.
- [ ] Setea `linkageField = prefillFrom.sourceId`.
- [ ] Aplica `versionField` según `versionStrategy`:
  - [ ] `"increment"` (default v3): lee `source[versionField]` (Int post-IMP-1), hace `+1`. Ignora `data[versionField]` del input.
  - [ ] `"user-provided"` (opcional): requiere `data[versionField]` en input. Sin valor → error `VERSION_VALUE_REQUIRED`.
- [ ] Resolucion code→id para `initialStateValue`:
  - [ ] Lee `source[workflowField]` (default `workflowId` — NOT NULL post-IMP-6, sin defensive null).
  - [ ] Busca `WorkflowStatus(institutionId=source.institutionId, code=initialStateValue)`.
  - [ ] No existe → error `INITIAL_STATE_CODE_NOT_FOUND`.
- [ ] `allowedFromStates`: resolver lee `source[currentStatusId]` (NOT NULL post-IMP-6) → obtiene `WorkflowStatus.code` → si no esta en la lista → error `INVALID_SOURCE_STATE_FOR_VERSIONING`.
- [ ] Audit event registrado:
  - [ ] `action="Clone"` (post-IMP-8).
  - [ ] `sourceRefId = prefillFrom.sourceId` (libre tras IMP-3 — rename a parentChildRefId).
  - [ ] `source` queda con el valor del canal real (`DirectEdit` / `Workflow`).
- [ ] El set inicial de `currentStatusId` ocurre en el momento del Create (no es transicion) — no requiere `transitionActivityValidated` (RULE-curriculum-design-004 NO se viola por que es creacion).
- [ ] Toda la operacion en `$transaction({ isolationLevel: 'Serializable' })`.
- [ ] Tests: increment correcto, prefillFrom requerido, sin versioning config rechazado, allowedFromStates enforcement, initialStateValue resuelto, transaccion rollback en fallo.

**Dependencias:** HU-1, HU-2, HU-4, HU-0a (Int version), HU-0b (APR state — solo si default v3), HU-0f (NOT NULL FKs), HU-0g (action enum) · **Spec:** `_spec-HU3.md`.

**Si HU-0a vetada**: agregar el branch `VERSION_VALUE_REQUIRED` para user-provided (fallback v2).
**Si HU-0f vetada**: agregar `SOURCE_WORKFLOW_NOT_ASSIGNED` defensive (fallback v2).
**Si HU-0g (IMP-8) vetada**: `action="Create"` + `versionSourceId` extra (fallback v2).

---

### HU-4 · Config versioning en JSON del object

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar el bloque `versioning` en el JSON del object
**Para** activar versionamiento sin escribir codigo.

**Criterios de aceptación:**

- [ ] Codegen valida estructura. Campos requeridos: `linkageField`, `versionField`, `versionStrategy`. Opcionales: `allowedFromStates`, `initialStateField`, `initialStateValue`.
- [ ] `linkageField` debe ser un campo del mismo object con `references: <SameObject>` declarado (codegen infiere FK reflexivo via IMP-5).
- [ ] `versionField`:
  - [ ] Con `versionStrategy: "increment"` → debe ser Int.
  - [ ] Con `versionStrategy: "user-provided"` → puede ser String o Int.
- [ ] `versionStrategy` solo acepta `"increment"` o `"user-provided"` en SP4.
- [ ] `allowedFromStates` (si declarado): array de strings con codes de WorkflowStatus. Validacion runtime (no codegen).
- [ ] `initialStateValue` (si declarado): string con code. Validacion runtime.
- [ ] Documentado en `object-manager/docs/versioning-capability.md`.
- [ ] Tests: config valida con increment + Int, valida con user-provided + String, increment + String rechazado, linkageField sin reflexive ref rechazado, versionStrategy invalida rechazado.

**Dependencias:** HU-0e (codegen self-refs) · **Spec:** `_spec-HU4.md`.

**Si HU-0e vetada**: validacion estricta de `linkageField` requiere `isForeignKey: true` explicito en el JSON (fallback v2).

---

### HU-5 · Query getVersionChain

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** una query `getVersionChain(objectType, instanceId)` que retorne el linaje completo
**Para** mostrar al usuario el historial de versiones.

**Criterios de aceptación:**

- [ ] Query `getVersionChain(objectType: String!, instanceId: ID!): [Instance!]!` expuesta.
- [ ] Lee `versioning.linkageField` del JSON. Si no esta declarado → `OBJECT_NOT_VERSIONABLE`.
- [ ] Retorna instances ordenadas por **`version` ascendente** (Int post-IMP-1, asegura orden estable independiente de createdAt).
- [ ] Cada instance incluye `isLatest: Boolean` y `versionNumber: Int` (alias de `version`).
- [ ] Si `versionStrategy: "user-provided"` y `versionField` es String → ordena por `createdAt` como fallback + emite warning en log.
- [ ] Respeta RBAC — instances sin permiso se omiten del resultado.
- [ ] Tests: linaje completo retornado en orden, isLatest correcto, RBAC respetado, objectType no versionable rechazado.

**Dependencias:** HU-4 · **Spec:** `_spec-HU5.md`.

---

### HU-6 · createdVia metadata + flow n8n persiste sourceRefId para Clone

**Sprint:** SP4 · **Track:** Core object-manager + flow n8n del mod · **Repos:** `object-manager`, `mods/curriculum-design/flows`

**Como** dev de mod
**Quiero** que los eventos BullMQ incluyan `createdVia: "scratch" | "prefill" | "version"` y que el flow n8n persista `sourceRefId` (post-IMP-3 rename de L40 a parentChildRefId) con el id del source en el changeLog
**Para** trazabilidad completa del origen de versiones.

**Criterios de aceptación:**

- [ ] Payload del evento BullMQ post-create incluye `createdVia` y `sourceRefId` (poblado solo cuando `createdVia: "version"`).
- [ ] Flow n8n `mods/curriculum-design/flows/audit-capture.json`:
  - [ ] Detecta `createdVia: "version"` → invoca `recordAuditEvent` con `action: "Clone"` (post-IMP-8) + `sourceRefId: <prefillFromSourceId>`.
  - [ ] Detecta `createdVia: "scratch" | "prefill"` → invoca como antes con `action: "Create"`.
- [ ] `recordAuditEvent` persiste `sourceRefId` para `action=Clone`. NO confunde con `parentChildRefId` (semantica L40 intacta post-IMP-3).
- [ ] Tests: payload correcto en los 3 casos. Audit row para version queda con `action=Clone, sourceRefId=<sourceId>, parentChildRefId=null`. Audit row para L40 (cambio en CurricularSection consolidado al Activity padre) tiene `parentChildRefId=<childId>, sourceRefId=null`.

**Dependencias:** HU-1, HU-3, HU-0c (rename), HU-0g (Clone action) · **Spec:** `_spec-HU6.md`.

**Si HU-0c vetada**: fallback v2 — usar `versionSourceId` separado en lugar de `sourceRefId`.

---

## Track 2 — Core layout

---

### HU-7 · Row action con prefillFromCurrent + asNewVersion

**Sprint:** SP4 · **Track:** Core layout · **Repo:** `layout`

**Como** dev de mod
**Quiero** declarar `{ "type": "create", "prefillFromCurrent": true, "asNewVersion": true, ... }` en row actions
**Para** ofrecer el boton "Crear nueva version" sin escribir componentes.

**Criterios de aceptación:**

- [ ] El action `create` acepta `prefillFromCurrent` y `asNewVersion` (default false).
- [ ] Si `prefillFromCurrent: true`, layout invoca `createInstance(prefillFrom: { sourceId: <currentRowId> })`.
- [ ] Si `asNewVersion: true`, agrega `asNewVersion: true`.
- [ ] Visibilidad por `allowedFromStates`:
  - [ ] Layout resuelve `row[initialStateField]` → consulta `WorkflowStatus.code` → compara contra `allowedFromStates`.
  - [ ] Si el code esta en la lista → renderiza el boton. Sino → boton oculto.
  - [ ] Post-IMP-6 (NOT NULL): el currentStatusId siempre esta poblado, no hay caso null. Sin fail-closed defensivo.
- [ ] Tras exito: redirige segun `redirectTo` (default `edit`).
- [ ] Tras fallo: toast con el error code del Ladrillo 2.
- [ ] **No requiere modal de input** cuando `versionStrategy: "increment"` (system-managed, post-IMP-1). Solo `user-provided` requiere modal — abrir modal solo en ese caso.
- [ ] Tests: visibilidad respeta allowedFromStates con codes, no modal para increment, modal para user-provided, redirect correcto, error handling.

**Dependencias:** HU-1, HU-3, HU-0f (NOT NULL), HU-0a (Int default) · **Spec:** `_spec-HU7.md`.

**Si HU-0f vetada**: agregar fail-closed cuando FKs null (fallback v2).
**Si HU-0a vetada**: modal requerido siempre (fallback v2).

---

## Track 3 — Aplicación en curriculum-design

---

### HU-8a · Declarar prefillFrom + versioning + polymorphicChildren en Activity.json

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design
**Quiero** declarar las configs en `objects/Activity.json` con sintaxis declarativa simple
**Para** activar versionamiento de Activity sin codigo del mod.

**Criterios de aceptación:**

- [ ] `mods/curriculum-design/objects/Activity.json` modificado:
  - [ ] **Bloque `polymorphicChildren`** (post-IMP-4):
    ```json
    "polymorphicChildren": [
      {
        "name": "sections",
        "object": "CurricularSection",
        "via": "ownerType/ownerId",
        "ownerTypeValue": "Activity",
        "recursiveBy": "parentId"
      }
    ]
    ```
  - [ ] **Bloque `prefillFrom`**:
    ```json
    "prefillFrom": {
      "exclude": ["currentStatusId", "previousVersionId", "versionLabel"],
      "deepClone": ["sections"]
    }
    ```
  - [ ] **Bloque `versioning`**:
    ```json
    "versioning": {
      "linkageField": "previousVersionId",
      "versionField": "version",
      "versionStrategy": "increment",
      "allowedFromStates": ["APR", "PUB"],
      "initialStateField": "currentStatusId",
      "initialStateValue": "BOR"
    }
    ```
  - [ ] El campo `previousVersionId` solo necesita `references: "Activity"` (codegen agrega `@relation` reflexivo via IMP-5).
- [ ] Sync corre sin errores y aplica el schema a tenant UPU.
- [ ] El layout filename usa PascalCase (`default_Activity_list.json`) per RULE-platform-006.
- [ ] Tests del mod:
  - [ ] Crear v2 de Activity en estado APR → `version=2` (auto-incremented), `versionLabel=null` (excluded), `previousVersionId=v1.id`, `currentStatusId=<BOR id>`, audit con `action=Clone, sourceRefId=v1.id`.
  - [ ] Crear v2 desde Activity en estado BOR → `INVALID_SOURCE_STATE_FOR_VERSIONING`.
  - [ ] CurricularSections del v1 se clonaron al v2 con nuevos ids + `ownerId=v2.id` (sin codigo del mod — gracias a HU-0d + polymorphicChildren).
  - [ ] Jerarquia `parentId` de sections preservada.

**Dependencias:** HU-2, HU-4, HU-9, HU-0a, HU-0d, HU-0e, HU-0f, HU-0g · **Spec:** `_spec-HU8a.md`.

---

### HU-8b · Hook temporal del mod para remapear CurricularLinks

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design
**Quiero** un hook temporal que, post-creacion de Activity via versionamiento, remapee los CurricularLinks del source a las nuevas secciones del v2
**Para** preservar el wiring pedagogico (DEVELOPS, EVALUATES, COVERS, USES) per BR-VER-002 verbatim, mientras `polymorphicChildrenDerived` (IMP-4 forma completa) llega en SP5.

**Criterios de aceptación:**

- [ ] Documentado explicito como **hook temporal** — se reemplaza por `polymorphicChildrenDerived` declarativo en SP5.
- [ ] El hook escucha el evento BullMQ post-create de Activity con `createdVia: "version"`.
- [ ] Para cada CurricularLink del source Activity:
  - [ ] Localiza la seccion correspondiente en el v2 (mapping via `parentId` o nombre o position — definir en spec).
  - [ ] Crea un nuevo CurricularLink con `sourceSectionId` y `targetSectionId` apuntando a las secciones del v2.
- [ ] Si alguna seccion no se puede remapear (raro pero posible) → log warning + skip ese link.
- [ ] El hook vive en `mods/curriculum-design/logic/activity.versioning-hook.js` (nuevo archivo, claramente etiquetado como temporal).
- [ ] Tests: clonar Activity con 5 sections + 3 CurricularLinks produce v2 con 5 sections + 3 links re-creados apuntando a las nuevas sectionIds.
- [ ] Comentario inline en el hook: "TODO SP5: reemplazar por polymorphicChildrenDerived en Activity.json (IMP-4 forma completa)".

**Dependencias:** HU-8a · **Spec:** `_spec-HU8b.md`.

**Si IMP-4 se entrega completo en SP4** (decision P3.4): esta HU se elimina; la config se mueve a `polymorphicChildrenDerived` en Activity.json.

---

### HU-9 · Agregar "Clone" al enum action en changeLog (cubierto en HU-0g)

> **Nota v3**: la mayor parte del trabajo de esta HU del v2 se movio a HU-0g (track 0) — `"Clone"` en enum `action` (IMP-8) + actualizacion del flow n8n. Lo que queda aqui es la validacion runtime del resolver.

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design
**Quiero** que `recordAuditEvent` valide y persista `action=Clone` con `sourceRefId` cuando se reciba el evento de version
**Para** que el audit chain refleje el origen de cada version derivada.

**Criterios de aceptación:**

- [ ] Resolver `recordAuditEvent` valida que cuando `operation: "clone"` (o `action: "Clone"` directo segun shape final del input):
  - [ ] `sourceRefId` debe estar presente y ser no-null (no es opcional para Clone).
  - [ ] La instancia origen debe existir y ser del mismo `entityType` que el record auditado.
- [ ] Sin estas condiciones → error `CLONE_REQUIRES_SOURCE_REF`.
- [ ] Persiste el row con `action: "Clone"`, `source: <canal real>`, `sourceRefId: <sourceId>`.
- [ ] Tests: audit row clone con sourceRefId valido, clone sin sourceRefId rechazado, clone con sourceRefId de otro entityType rechazado.

**Dependencias:** HU-0g · **Spec:** `_spec-HU9.md`.

**Si HU-0g (IMP-8) vetada**: fallback v2 — esta HU pasa a "agregar campo `versionSourceId` separado en changeLog.json + persistir en resolver".

---

### HU-10 · Row action "Crear nueva versión" en RecordList de Activity

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** consultor (usuario final)
**Quiero** ver el botón "Crear nueva versión" en cada Activity aprobada/publicada
**Para** iniciar el ciclo de mejora curricular.

**Criterios de aceptación:**

- [ ] Config del layout `default_Activity_list.json` (PascalCase) incluye row action:
  ```json
  {
    "type": "create",
    "prefillFromCurrent": true,
    "asNewVersion": true,
    "label": "{{$t('createNewVersion')}}",
    "redirectTo": "edit",
    "icon": "bi-arrow-clockwise"
  }
  ```
- [ ] Botón visible solo cuando el code del WorkflowStatus actual está en `["APR", "PUB"]` (post-IMP-2).
- [ ] Click ejecuta `createInstance(prefillFrom + asNewVersion)`. **Sin modal** (`versionStrategy: "increment"` system-managed post-IMP-1) — la version se incrementa automaticamente.
- [ ] Redirige al RecordDetail del nuevo Activity en modo edit.
- [ ] Toast de éxito: "Versión {N} creada desde versión {N-1}" (N e N-1 son enteros tras IMP-1).
- [ ] Toast de error con mensaje apropiado en caso de fallo.
- [ ] Traducciones es_CL / en_CL / pt_BR.
- [ ] Tests e2e: flujo completo desde RecordList sin modal.

**Dependencias:** HU-7, HU-8a, HU-0a (Int default), HU-0b (APR state — si default v3) · **Spec:** `_spec-HU10.md`.

**Si HU-0a vetada**: modal requerido (fallback v2).
**Si HU-0b vetada**: `allowedFromStates: ["PUB"]` (fallback v2).

---

### HU-11 · Sección "Versiones" en RecordDetail de Activity

**Sprint:** SP4 · **Track:** Mod curriculum-design (+ posible layout o suite) · **Repo:** `mods/curriculum-design` + condicional

**Como** consultor
**Quiero** ver una seccion colapsable "Versiones" en el RecordDetail
**Para** navegar entre versiones.

**Criterios de aceptación (fase 0 — discovery):**

- [ ] Revisar primitivos existentes en `layout/config/`. ¿Existe primitivo de RecordDetail que renderice lista navegable con badges + click-through?
- [ ] Decision de split:
  - [ ] **Camino A** — config-only en `mods/curriculum-design`.
  - [ ] **Camino B** — split en HU-11a (primitivo en `layout`) + HU-11b (config en `mods/curriculum-design`).

**Criterios de aceptación (fase 1 — implementación):**

- [ ] Sección colapsable "Versiones" en layout RecordDetail (`default_Activity_view.json`), después de "Historial".
- [ ] Consume `getVersionChain(objectType: "Activity", instanceId: <currentId>)`.
- [ ] Cada versión muestra: `version` (Int), `versionLabel` (si poblado), estado (badge resuelto desde currentStatusId), fecha de creacion, autor.
- [ ] Versión actual marcada visualmente.
- [ ] Click navega al RecordDetail.
- [ ] Traducciones es_CL / en_CL / pt_BR.
- [ ] Tests: sección renderiza con 1, 2, N versiones.

**Dependencias:** HU-5 · **Spec:** `_spec-HU11.md`.

---

## Track 4 — Documentación + adopción futura

---

### HU-12 · Documentación de la capacidad para futuros adoptantes

**Sprint:** SP4 · **Track:** Docs · **Repos:** `object-manager`, `layout`, `mods/curriculum-design`, KB Deckard

**Como** dev de cualquier mod uP1
**Quiero** una guia clara de como activar versionamiento
**Para** adoptarla sin leer codigo del core.

**Criterios de aceptación:**

- [ ] `object-manager/docs/prefill-capability.md` — documenta Ladrillo 1 con ejemplos.
- [ ] `object-manager/docs/versioning-capability.md` — documenta Ladrillo 2 + Ladrillo 3, receta paso a paso, ejemplo Activity completo, receta breve para Syllabus / CurriculumPlan (Int o String versionField — ambas options).
- [ ] `object-manager/docs/polymorphic-children.md` (nuevo) — documenta IMP-4 (HU-0d). Cuando declararlo. Limitaciones de SP4 (lectura solo, NO derived).
- [ ] `layout/docs/row-actions.md` — actualizado.
- [ ] Seccion "Versionar vs Clonar" en `versioning-capability.md` — explica la unificacion tecnica vs separacion de producto (CAP-CUR-018 vs CAP-CUR-022, BR-VER-002).
- [ ] Ejemplo de config completo en `mods/curriculum-design/.ai/PATTERNS.md`.
- [ ] Test de adopcion simulada: <30 min para activar en un object nuevo con Prisma relations directas, <60 min con `polymorphicChildren`.

**Dependencias:** HU-1 a HU-11 · **Spec:** `_spec-HU12.md`.

---

## Track 5 — Validación del proceso

---

### HU-13 · Pair-programming inicial dev externo + dev core

**Sprint:** SP4 · **Track:** Proceso · **Repo:** N/A

**Como** dev externo (Eduardo)
**Quiero** pair-programming con un dev core (JuanDi) en HU-1, HU-3 y HU-8a (mas HU-0d si Eduardo participa)
**Para** validar el Flujo de Klaus.

**Criterios de aceptación:**

- [ ] Sesion de pair en HU-1 documentada.
- [ ] Sesion de pair en HU-3 documentada (foco: resolucion code→id + bypass del workflow validated en creacion).
- [ ] Sesion de pair en HU-8a documentada (foco: configuracion declarativa completa Activity + integracion con `polymorphicChildren`).
- [ ] Si Eduardo participa en HU-0d: pair adicional documentado (foco: feature de codegen para polymorphic).
- [ ] Retro al cierre del sprint con foco en proceso del track 0 (cambios SOT mientras se desarrolla la feature consumer).
- [ ] Retro adjunta al `brief.md` de la tarea PM.

**Dependencias:** HU-1, HU-3, HU-8a · **Spec:** no aplica.

---

## Resumen — dependencias entre HUs

```
Track 0 (SOT) — semana 1 paralelo:
  HU-0a (version Int + versionLabel) ────────────────┐
  HU-0b (APR state) ─────────────────────────────────┤
  HU-0c (rename audit fields) ───────────────────────┤
  HU-0d (codegen polymorphicChildren) ───────────────┤
  HU-0e (codegen self-refs) ─────────────────────────┤  →  Track 1+ consume
  HU-0f (SET NOT NULL workflowId/currentStatusId) ───┤
  HU-0g (KB rename + Clone action) ──────────────────┘

Track 1 (Core) — semana 1-2:
  HU-2 (config prefillFrom)   ──> HU-1 (param prefillFrom)
  HU-4 (config versioning)    ──> HU-3 (param asNewVersion) <── HU-0a, HU-0b, HU-0f, HU-0g
  HU-5 (getVersionChain)      <── HU-4
  HU-6 (createdVia + n8n)     <── HU-1, HU-3, HU-0c, HU-0g

Track 2 (Layout) — semana 2:
  HU-7 (row action)           <── HU-1, HU-3, HU-0a, HU-0f

Track 3 (Mod) — semana 2:
  HU-8a (Activity config)     <── HU-2, HU-4, HU-9, HU-0a, HU-0d, HU-0e, HU-0f, HU-0g
  HU-8b (hook temporal links) <── HU-8a (eliminada si IMP-4 derived va en SP4)
  HU-9 (action Clone validacion)  <── HU-0g
  HU-10 (row action Activity) <── HU-7, HU-8a, HU-0a, HU-0b
  HU-11 (seccion Versiones)   <── HU-5

Track 4: HU-12 <── HU-1..HU-11
Track 5: HU-13 — proceso transversal a HU-1, HU-3, HU-8a, (HU-0d opcional)
```

## Orden sugerido de entrega

| Semana | HUs en paralelo |
|---|---|
| **Semana 1 — track 0 first** | HU-0a, HU-0b, HU-0c, HU-0e, HU-0f, HU-0g (paralelos) · HU-0d (spike P3.4 + ejecucion) · HU-2, HU-4 (configs JSON) · HU-13 pair empieza |
| **Semana 1-2 — track 1 unlocks** | HU-1, HU-3 (params) · HU-5 (getVersionChain) · HU-11 discovery |
| **Semana 2 — apps** | HU-6 (createdVia + flow n8n) · HU-7 (row action layout) · HU-8a (Activity config) · HU-8b (hook temporal) · HU-9 (validacion clone) |
| **Semana 2 — finales** | HU-10 (row action Activity) · HU-11 implementacion · HU-12 (docs) · HU-13 retro |

## Capacidad estimada

20 HUs (13 base + 7 track 0) en 2 semanas con 2 devs. Mas grande que v2 pero los track 0 son tipicamente <1 SP cada uno (la mayoria son <0.5 SP).

**Candidatas a recortar a SP5** si el sprint se aprieta:

- **HU-0d** (codegen polymorphicChildren) — la mas pesada del track 0. Si el spike P3.4 indica que crece, fallback a sintaxis explicita en `prefillFrom` para Activity → HU-8a se vuelve verbosa pero sigue funcionando.
- **HU-8b** (hook temporal links) — si IMP-4 derived sale en SP5, esta HU desaparece.
- **HU-11** (seccion Versiones) — si discovery muestra camino B sin primitivo, mover a SP5.
- **HU-12** (docs completos) — empezar en SP4, entregar formal en SP5.
- **HU-6** (createdVia events) — nice-to-have. Mover a SP5 si presion.

Con estos recortes: ~14-15 HUs entregables en SP4.

---

## Pendientes que bloquean el sprint

| # | Decision | Quien resuelve | Bloquea |
|---|----------|----------------|---------|
| **P3.1** | ¿Esteban actualiza CAP-CUR-018 para `version` Int + `versionLabel`? | Esteban (PM) | HU-0a |
| **P3.2** | ¿IMP-2 agrega APR puro o coexistente con "Aprobar y publicar"? | JuanDi + Esteban | HU-0b |
| **P3.3** | ¿IMP-3 (rename audit fields) cabe en SP4 dado el riesgo? | Klaus + JuanDi | HU-0c |
| **P3.4** | ¿IMP-4 entrega solo lectura (D15) o tambien derived? | JuanDi (spike) + Klaus | HU-0d, HU-8a, HU-8b |

**Adicional**: cada pendiente vetado activa el fallback v2 correspondiente — la capacidad sigue siendo funcional, con menos elegancia declarativa.

---

## Mapeo de fallbacks (si algun IMP es vetado)

| IMP vetado | Fallback v2 que se activa |
|-----------|---------------------------|
| **IMP-1** (version Int) | `versionStrategy: "user-provided"` para Activity + modal de input version + error `VERSION_VALUE_REQUIRED` |
| **IMP-2** (APR state) | `allowedFromStates: ["PUB"]` |
| **IMP-3** (rename audit) | Campo NUEVO `versionSourceId` en changeLog (no rename) |
| **IMP-4** (codegen polymorphic) | Sintaxis polimorfica explicita en `prefillFrom.deepClone` de Activity |
| **IMP-5** (codegen self-refs) | HU-8a agrega `isForeignKey: true, references: "Activity"` explicito |
| **IMP-6** (NOT NULL) | Defensive null handling en HU-3 + HU-7 + error `SOURCE_WORKFLOW_NOT_ASSIGNED` |
| **IMP-7** (KB rename) | Nota al pie sobre KB lag |
| **IMP-8** (Clone action) | Distinguir version por `versionSourceId != null` (sin tocar enum action) |

v3 es **robusto** a vetos parciales — cada IMP rechazado degrada elegantemente al equivalente v2 sin invalidar el resto del entregable.
