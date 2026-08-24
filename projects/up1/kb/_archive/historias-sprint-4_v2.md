# Historias de usuario — Sprint 4 uP1: Versionamiento de objetos (v2)

> Derivadas del doc de diseño `diseño-versionamiento_v2.md`.
> Reemplaza a `historias-sprint-4_v1.md`. Cambios documentados en `cambios-versionamiento_v1-a-v2.md`.
> Cada HU es un bloque autocontenido, listo para copiar a Jira.
> El doc de diseño se adjunta como contexto a todas las HUs.

---

## Track 1 — Core object-manager

---

### HU-1 · prefillFrom param en createInstance

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** que `createInstance` acepte el parámetro opcional `prefillFrom: { sourceId, includeRelations? }`
**Para** crear una instancia pre-llenada con datos de otra del mismo tipo, sin escribir resolver custom.

**Criterios de aceptación:**

- [ ] `createInstance(objectType: String!, data: JSON!, prefillFrom: PrefillFromInput)` acepta `prefillFrom` como parámetro opcional sin romper llamadas existentes.
  > Nota de naming: el param real del platform es `objectType`, NO `objectName`. Mantener consistencia en toda la mutation.
- [ ] Cuando `prefillFrom` está presente, el resolver lee `sourceId`, valida que existe y es del mismo `objectType`, y construye el `data` combinando los campos del source con los explícitos del input (explicit pisa source).
- [ ] El default `exclude` siempre incluye `id`, `createdAt`, `updatedAt`, `createdBy` — aunque no se declare config en el JSON.
- [ ] Si el source no existe → error `PREFILL_SOURCE_NOT_FOUND`.
- [ ] Si el source es de otro `objectType` → error `PREFILL_SOURCE_TYPE_MISMATCH`.
- [ ] Tests: prefill básico, prefill con override explícito, prefill con source inexistente, prefill cross-type rechazado.

**Dependencias:** Ninguna · **Spec:** adjuntar `_spec-HU1.md` durante desarrollo.

---

### HU-2 · Config prefillFrom en JSON del object (sintaxis simple + polimorfica)

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar `"prefillFrom": { "exclude": [...], "deepClone": [...] }` en el JSON del object, con `deepClone` soportando tanto Prisma relations directas como FKs polimorficas abiertas
**Para** gobernar qué se hereda al pre-llenar incluso cuando el modelo usa polimorfismo abierto (caso `Activity → CurricularSection` via `ownerType + ownerId`).

**Criterios de aceptación:**

- [ ] Codegen valida la estructura de `prefillFrom` al parsear el JSON; estructura inválida → error de codegen con mensaje claro.
- [ ] El resolver lee la config y aplica:
  - [ ] `exclude` (skip esos campos del source).
  - [ ] `deepClone` **sintaxis simple** — array de strings (field names) para Prisma relations directas. Recursive según relacion declarada.
  - [ ] `deepClone` **sintaxis polimorfica** — array de objetos con shape:
    ```json
    {
      "name": "<alias>",
      "via": "polymorphic",
      "object": "<TargetObject>",
      "ownerTypeField": "<fieldOnTarget>",
      "ownerIdField": "<fieldOnTarget>",
      "ownerTypeValue": "<ValorPolimorfico>",
      "recursiveBy": "<selfRefFieldOnTarget>"
    }
    ```
  - [ ] `deepClone` **sintaxis polimorfica derivada** — shape para objetos cuyo deep-clone depende del remap de FKs internas (caso `CurricularLink → sourceSectionId/targetSectionId`):
    ```json
    {
      "name": "<alias>",
      "via": "polymorphic-derived",
      "object": "<TargetObject>",
      "derivedFrom": "<otroAliasDelDeepClone>",
      "remapFields": { "<fkOnTarget>": "<alias>.id" },
      "skipIfEmpty": true
    }
    ```
- [ ] Si el JSON no declara `prefillFrom`, se aplica solo el default `exclude` (id, timestamps, createdBy).
- [ ] El resolver garantiza que el remap de FKs (sintaxis derivada) se ejecuta despues de crear las instancias del bloque referenciado en `derivedFrom`.
- [ ] Documentado en `object-manager/docs/prefill-capability.md` con receta + ejemplo de ambas sintaxis.
- [ ] Tests: exclude respetado, deepClone simple recursivo, deepClone polimorfico (clona N CurricularSections de un Activity), deepClone polimorfico recursivo (jerarquia parentId), polymorphic-derived remapea sectionIds correctamente, sin config (defaults), config malformada rechazada.

**Dependencias:** HU-1 · **Spec:** adjuntar `_spec-HU2.md` durante desarrollo.

**Nota de scope (v2)**: si durante execute esta HU crece mas alla de 5 SP, considerar split en HU-2a (sintaxis simple) y HU-2b (sintaxis polimorfica). Decision al final del spike de JuanDi.

---

### HU-3 · asNewVersion param en createInstance

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** que `createInstance` acepte `asNewVersion: Boolean` que, leyendo el bloque `versioning` del JSON, aplique linkage + bump (segun strategy) + reset estado + audit metadata
**Para** crear una nueva versión de un objeto sin escribir resolver custom.

**Criterios de aceptación:**

- [ ] `createInstance` acepta `asNewVersion` opcional. Requiere `prefillFrom` definido — sin él → error `AS_NEW_VERSION_REQUIRES_PREFILL`.
- [ ] Si `asNewVersion=true` y el JSON no tiene bloque `versioning` → error `OBJECT_NOT_VERSIONABLE`.
- [ ] Setea `linkageField = prefillFrom.sourceId`.
- [ ] Aplica `versionField` según `versionStrategy`:
  - [ ] `versionStrategy: "user-provided"` → requiere que `data[versionField]` venga en el input. Si no viene → error `VERSION_VALUE_REQUIRED`. Si viene → usa el valor del input verbatim.
  - [ ] `versionStrategy: "increment"` → ignora `data[versionField]` del input, lee el valor del source, hace `+1`. Requiere que `versionField` sea tipo Int en el JSON (validado en HU-4).
- [ ] Si `initialStateField`/`initialStateValue` están declarados, resuelve el code a id:
  - [ ] Algoritmo: leer `source[workflowField]` (default `workflowId`) → buscar `WorkflowStatus` con `(institutionId=source.institutionId, code=initialStateValue)`.
  - [ ] Si no existe → error `INITIAL_STATE_CODE_NOT_FOUND` con detalle (code + institucion).
  - [ ] Si existe → setear `currentStatusId = <foundStatusId>` (bypass del workflow `*Validated` para este primer set).
- [ ] Si `allowedFromStates` está declarado:
  - [ ] Resolver `source[currentStatusId]` → obtener `WorkflowStatus.code` correspondiente.
  - [ ] Si el code resuelto NO esta en la lista → error `INVALID_SOURCE_STATE_FOR_VERSIONING`.
- [ ] Audit event registrado:
  - [ ] `action="Create"`.
  - [ ] `source` queda con el valor del canal real (`DirectEdit` / `Workflow` / etc.) — **NO se introduce valor `"Clone"` en el enum**.
  - [ ] `versionSourceId = prefillFrom.sourceId` (nuevo campo, ver HU-9).
- [ ] Toda la operación en una sola transacción Prisma (`$transaction({ isolationLevel: 'Serializable' })`).
- [ ] Tests: bump increment correcto, user-provided con value correcto, user-provided sin value rechazado, allowedFromStates enforcement con resolucion code, initialStateValue resuelto a id correcto, code no existente rechazado, sin versioning config rechazado, transacción rollback en fallo.

**Dependencias:** HU-1, HU-2, HU-4 · **Spec:** adjuntar `_spec-HU3.md` durante desarrollo.

---

### HU-4 · Config versioning en JSON del object

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar el bloque `versioning` en el JSON del object
**Para** activar versionamiento de mi object sin escribir código.

**Criterios de aceptación:**

- [ ] Codegen valida la estructura del bloque `versioning`.
- [ ] Campos requeridos: `linkageField`, `versionField`, `versionStrategy`. Opcionales: `auditSourceField` (default `"versionSourceId"`), `allowedFromStates`, `initialStateField`, `initialStateValue`.
- [ ] `linkageField` debe ser un campo declarado en el mismo object con `isForeignKey: true` Y `references: <mismo object>` Y `targetField: "id"` (FK reflexivo). Codegen valida y falla si no.
  > Pendiente P3 del diseño: verificar que el codegen del platform genera correctamente self-references en Prisma. Si no, esta validacion se degrada a `should` con warning, y se documenta el workaround en el resolver de HU-3.
- [ ] `versionField` debe ser tipo `String` o `Int`. Codegen valida coherencia con `versionStrategy`:
  - [ ] `versionStrategy: "user-provided"` → `versionField` puede ser `String` o `Int`.
  - [ ] `versionStrategy: "increment"` → `versionField` DEBE ser `Int`.
- [ ] `versionStrategy` solo acepta `"user-provided"` o `"increment"` en SP4 (otros valores rechazados con mensaje claro).
- [ ] `allowedFromStates` (si declarado) es array de strings con codes de WorkflowStatus. Codegen NO valida que los codes existan (validacion en runtime — los codes son institucionales y pueden no estar seedeados al momento de codegen).
- [ ] `initialStateField` (si declarado) debe ser un campo del object con `isForeignKey: true, references: "WorkflowStatus"`.
- [ ] `initialStateValue` (si declarado) es string con code. Validacion runtime (no codegen) por las mismas razones que `allowedFromStates`.
- [ ] Documentado en `object-manager/docs/versioning-capability.md` con receta paso a paso + ambas strategies.
- [ ] Tests: config válida con user-provided + String, valida con increment + Int, invalida con increment + String rechazado, linkageField sin FK rechazado, linkageField no reflexivo rechazado, versionStrategy invalida rechazado.

**Dependencias:** Ninguna · **Spec:** adjuntar `_spec-HU4.md` durante desarrollo.

---

### HU-5 · Query getVersionChain

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** una query `getVersionChain(objectType, instanceId)` que retorne el linaje completo del objeto
**Para** poder mostrar al usuario el historial de versiones y navegar entre ellas.

**Criterios de aceptación:**

- [ ] Query `getVersionChain(objectType: String!, instanceId: ID!): [Instance!]!` expuesta en el schema.
- [ ] Lee `versioning.linkageField` del JSON del object. Si no está declarado → error `OBJECT_NOT_VERSIONABLE`.
- [ ] Retorna instances ordenadas por `createdAt` ascendente.
- [ ] Cada instance incluye `isLatest: Boolean` (true si es la última en la cadena) y `versionLabel: String` (valor del `versionField` serializado a string — funciona tanto para user-provided String como para increment Int).
- [ ] Respeta RBAC — si el usuario no tiene `objectname:view` sobre alguna instance del linaje, se omite del array retornado (no se reporta como error). `isLatest` se calcula sobre el set visible.
- [ ] Tests: linaje completo retornado, isLatest correcto, RBAC respetado, objectType no versionable rechazado, versionLabel renderiza tanto String como Int.

**Dependencias:** HU-4 · **Spec:** adjuntar `_spec-HU5.md` durante desarrollo.

---

### HU-6 · createdVia metadata en eventos + versionSourceId en changeLog

**Sprint:** SP4 · **Track:** Core object-manager + flow n8n del mod · **Repos:** `object-manager`, `mods/curriculum-design/flows`

**Como** dev de mod
**Quiero** que los eventos BullMQ de create incluyan `createdVia: "scratch" | "prefill" | "version"` y que el flow n8n `audit-capture` del mod persista `versionSourceId` en el changeLog
**Para** que consumidores (audit, notifications) puedan distinguir el tipo de creación y rastrear el origen de cada version.

**Criterios de aceptación:**

- [ ] Payload del evento BullMQ post-create incluye `createdVia`.
- [ ] `"scratch"` si no se pasó `prefillFrom`. `"prefill"` si se pasó pero `asNewVersion=false`. `"version"` si `asNewVersion=true`.
- [ ] Payload del evento incluye `versionSourceId` (poblado solo cuando `createdVia: "version"`).
- [ ] El flow n8n `mods/curriculum-design/flows/audit-capture.json` lee `versionSourceId` del payload y lo pasa a `recordAuditEvent`.
- [ ] `recordAuditEvent` (en `mods/curriculum-design/logic/auditCapture.resolver.js`) persiste `versionSourceId` en la fila del `changeLog`. NO modifica el comportamiento existente de `sourceRefId` / `sourceRefName` / `sourceRefType` (patron L40 intacto).
- [ ] Tests: payload correcto en los 3 casos (scratch / prefill / version), flow n8n persiste versionSourceId, audit row para version queda con `action=Create, source=<canal real>, versionSourceId=<sourceId>, sourceRefId=null`.

**Dependencias:** HU-1, HU-3, HU-9 (campo `versionSourceId` debe existir en el schema antes) · **Spec:** adjuntar `_spec-HU6.md` durante desarrollo.

---

## Track 2 — Core layout

---

### HU-7 · Row action con prefillFromCurrent + asNewVersion

**Sprint:** SP4 · **Track:** Core layout · **Repo:** `layout`

**Como** dev de mod
**Quiero** declarar `{ "type": "create", "prefillFromCurrent": true, "asNewVersion": true, "label": "..." }` en row actions del RecordList
**Para** ofrecer al usuario el botón "Crear nueva versión" sin escribir componentes.

**Criterios de aceptación:**

- [ ] El action de tipo `create` acepta las props nuevas `prefillFromCurrent` y `asNewVersion` (ambas opcionales, default false).
- [ ] Si `prefillFromCurrent: true`, al hacer click el layout invoca `createInstance` con `prefillFrom: { sourceId: <currentRowId> }`.
- [ ] Si además `asNewVersion: true`, pasa `asNewVersion: true` a la mutation.
- [ ] Si el object tiene `versioning.allowedFromStates` declarado, el botón se renderiza solo cuando el code del status actual del row está en la lista:
  - [ ] Layout resuelve `row[initialStateField]` → consulta `WorkflowStatus` correspondiente → compara `code` contra `allowedFromStates`.
  - [ ] Si el lookup falla (id no encontrado) → el boton NO se renderiza (fail-closed).
- [ ] Tras éxito redirige según `redirectTo` (default `edit`).
- [ ] Tras fallo muestra toast con el error code del Ladrillo 2 (`VERSION_VALUE_REQUIRED`, `INVALID_SOURCE_STATE_FOR_VERSIONING`, etc.).
- [ ] Si `versionStrategy: "user-provided"`, el row action debe abrir un modal pidiendo el valor de `version` antes de invocar la mutation (sino siempre fallaria con `VERSION_VALUE_REQUIRED`).
- [ ] Tests: visibilidad respeta allowedFromStates con resolucion code, modal version aparece para user-provided, redirect correcto, error handling.

**Dependencias:** HU-1, HU-3 · **Spec:** adjuntar `_spec-HU7.md` durante desarrollo.

---

## Track 3 — Aplicación en curriculum-design

---

### HU-8 · Declarar prefillFrom + versioning + FK reflexivo en activity.json

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design
**Quiero** declarar las configs en `objects/activity.json` (incluyendo el FK reflexivo de `previousVersionId`)
**Para** activar versionamiento de Activity sin escribir código adicional.

**Criterios de aceptación:**

- [ ] **Bloqueado por decision P1 (Esteban)**: definir si CurricularLink se vacia o se remapea al versionar (afecta el deepClone polimorfico-derived).
- [ ] `objects/activity.json` se modifica con tres cambios:
  - [ ] **Cambio 1** — agregar a la property `previousVersionId`:
    ```json
    "isForeignKey": true,
    "references": "Activity",
    "targetField": "id"
    ```
  - [ ] **Cambio 2** — agregar bloque `prefillFrom`:
    ```json
    "prefillFrom": {
      "exclude": ["currentStatusId", "createdAt", "approvedBy", "previousVersionId"],
      "deepClone": [
        {
          "name": "sections",
          "via": "polymorphic",
          "object": "CurricularSection",
          "ownerTypeField": "ownerType",
          "ownerIdField": "ownerId",
          "ownerTypeValue": "Activity",
          "recursiveBy": "parentId"
        }
        /* + bloque polymorphic-derived para CurricularLink SI P1 = "remapear" */
      ]
    }
    ```
  - [ ] **Cambio 3** — agregar bloque `versioning`:
    ```json
    "versioning": {
      "linkageField": "previousVersionId",
      "versionField": "version",
      "versionStrategy": "user-provided",
      "auditSourceField": "versionSourceId",
      "allowedFromStates": ["APR", "PUB"],
      "initialStateField": "currentStatusId",
      "initialStateValue": "BOR"
    }
    ```
- [ ] Sync corre sin errores y aplica el schema a tenant UPU.
- [ ] El layout filename usa PascalCase (`default_Activity_list.json`) per RULE-platform-006.
- [ ] Tests del mod:
  - [ ] Crear v2 de Activity en estado APR — usuario provee `version: "v2026-mejorado"` → verificar `version="v2026-mejorado"`, `previousVersionId=v1.id`, `currentStatusId=<id del BOR>`, audit con `versionSourceId=v1.id`.
  - [ ] Crear v2 sin `version` en input → error `VERSION_VALUE_REQUIRED`.
  - [ ] Crear v2 desde Activity en estado BOR → error `INVALID_SOURCE_STATE_FOR_VERSIONING`.
  - [ ] CurricularSections del v1 se clonaron al v2 con nuevos ids + `ownerId=v2.id`.
  - [ ] Jerarquia `parentId` de sections preservada (re-mapeada con nuevos ids).
  - [ ] (Si P1=remapear) CurricularLinks del v1 se re-crearon en v2 con `sourceSectionId` y `targetSectionId` apuntando a los ids nuevos.
  - [ ] (Si P1=vaciar) v2 no tiene CurricularLinks.

**Dependencias:** HU-2, HU-4, HU-9, P1 resuelto · **Spec:** adjuntar `_spec-HU8.md` durante desarrollo.

---

### HU-9 · Agregar campo nuevo `versionSourceId` en changeLog.json

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design
**Quiero** extender el modelo de `changeLog` con un nuevo campo `versionSourceId: String (nullable)` para registrar el origen al versionar
**Para** que el audit chain pueda rastrear de qué objeto se versionó cada Activity, sin colisionar con la semantica de `sourceRefId` (patron L40).

**Criterios de aceptación:**

- [ ] Agregar a `objects/changeLog.json` la nueva property:
  ```json
  "versionSourceId": {
    "type": "string",
    "title": "Version Source ID",
    "not_null": false,
    "description": "ID de la instancia origen cuando esta fila refleja un Create derivado de versionamiento (asNewVersion=true). Distinto de sourceRefId — que captura el id del hijo polimorfico en el patron L40 de consolidacion al padre del audit chain SP3."
  }
  ```
- [ ] **NO modificar el enum `source`** (mantiene los 6 valores actuales: DirectEdit, Workflow, ChangeRequest, MADS, Import, SystemCalculation).
- [ ] **NO modificar el campo `sourceRefId`** ni sus descripciones — patron L40 intacto.
- [ ] Flow n8n `flows/audit-capture.json` actualizado para recibir y persistir `versionSourceId` (cubierto en HU-6).
- [ ] Resolver `recordAuditEvent` en `logic/auditCapture.resolver.js`:
  - [ ] Lee `versionSourceId` del input (si viene).
  - [ ] Si esta poblado, valida que la instancia source existe y es del mismo `entityType` que el record auditado.
  - [ ] Persiste el campo en el `changeLog.create({...})`.
- [ ] Indexes opcional: agregar `versionSourceId` al `indexes` de `changeLog.json` si se anticipa busqueda frecuente (decision menor del dev).
- [ ] Migración Prisma generada + sync aplica a tenants.
- [ ] Tests: audit entry con `versionSourceId` correctos para Create derivado de version, audit entry sin `versionSourceId` para Create normal, audit entry para L40 (cambio en CurricularSection consolidado al Activity padre) mantiene `sourceRefId` poblado y `versionSourceId=null`.

**Dependencias:** Ninguna (puede correr en paralelo con HU-1/HU-3/HU-4) · **Spec:** adjuntar `_spec-HU9.md` durante desarrollo.

---

### HU-10 · Row action "Crear nueva versión" en RecordList de Activity

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** consultor (usuario final)
**Quiero** ver el botón "Crear nueva versión" en cada Activity aprobada/publicada del RecordList, y proveer manualmente el valor de la nueva version
**Para** poder iniciar el ciclo de mejora curricular con el codigo de version que use mi institucion.

**Criterios de aceptación:**

- [ ] Config del layout `default_Activity_list.json` (PascalCase per RULE-platform-006) incluye row action:
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
- [ ] Botón visible solo cuando el code del WorkflowStatus actual de la row está en `["APR", "PUB"]` (resolucion runtime cubierta en HU-7).
- [ ] Click abre modal pidiendo el valor de `version` (porque strategy es user-provided), placeholder con sugerencia ("ej: v2026-1") + helper text explicando que la codificacion es libre.
- [ ] Al confirmar el modal: ejecuta `createInstance` con `prefillFrom + asNewVersion + data.version=<valor del modal>` y redirige al RecordDetail del nuevo Activity en modo edit.
- [ ] Toast de éxito: "Versión {valor-provisto} creada desde versión {valor-del-source}".
- [ ] Toast de error con el mensaje apropiado (`VERSION_VALUE_REQUIRED` no deberia ocurrir si el modal valida).
- [ ] Traducciones es_CL / en_CL / pt_BR (keys: `createNewVersion`, `versionModalTitle`, `versionModalPlaceholder`, `versionModalHelp`, `versionCreatedToast`).
- [ ] Tests e2e: flujo completo desde RecordList con modal + valor explicito.

**Dependencias:** HU-7, HU-8 · **Spec:** adjuntar `_spec-HU10.md` durante desarrollo.

---

### HU-11 · Sección "Versiones" en RecordDetail de Activity

**Sprint:** SP4 · **Track:** Mod curriculum-design (+ posible layout o suite) · **Repo:** `mods/curriculum-design` + condicional

**Como** consultor
**Quiero** ver una sección colapsable "Versiones" en el RecordDetail de Activity con todas las versiones del programa
**Para** poder navegar entre versiones y entender la evolución del programa.

**Criterios de aceptación (fase 0 — discovery):**

- [ ] Revisar `layout/config/` y primitivos existentes para responder: ¿existe un primitivo de RecordDetail que renderice una lista navegable con badges + click-through a otro RecordDetail?
- [ ] Documentar el hallazgo en el spec de la HU + decision de split:
  - [ ] **Camino A** — primitivo existe → toda la HU es config-only en `mods/curriculum-design`. Mantiene SP estimado.
  - [ ] **Camino B** — primitivo no existe → split en HU-11a (primitivo nuevo en `layout`) + HU-11b (config en `mods/curriculum-design`). Aumenta SP.

**Criterios de aceptación (fase 1 — implementación):**

- [ ] Nueva sección colapsable "Versiones" en el layout RecordDetail de Activity (`default_Activity_view.json`), después de "Historial".
- [ ] La sección consume `getVersionChain(objectType: "Activity", instanceId: <currentId>)`.
- [ ] Cada versión se muestra con: `versionLabel`, estado actual (badge resuelto desde `currentStatusId` → `WorkflowStatus.name`), fecha de creación, autor.
- [ ] La versión actual está marcada visualmente (badge "Versión actual" o equivalente).
- [ ] Click en una versión navega al RecordDetail de esa versión.
- [ ] Traducciones es_CL / en_CL / pt_BR.
- [ ] Tests: sección renderiza correctamente con 1, 2, N versiones; click navega; loading state mientras `getVersionChain` resuelve.

**Dependencias:** HU-5 · **Spec:** adjuntar `_spec-HU11.md` durante desarrollo.

---

## Track 4 — Documentación + adopción futura

---

### HU-12 · Documentación de la capacidad para futuros adoptantes

**Sprint:** SP4 · **Track:** Docs · **Repos:** `object-manager`, `layout`, `mods/curriculum-design`

**Como** dev de cualquier mod uP1
**Quiero** una guía clara de cómo activar versionamiento en mi object
**Para** adoptarla en mi mod sin tener que leer el código del core.

**Criterios de aceptación:**

- [ ] `object-manager/docs/prefill-capability.md` — documenta Ladrillo 1 con ejemplos de ambas sintaxis de `deepClone` (simple Prisma relations + polimorfica).
- [ ] `object-manager/docs/versioning-capability.md` — documenta Ladrillo 2 + Ladrillo 3, con receta paso a paso, ejemplo completo de Activity (sintaxis polimorfica + user-provided strategy), receta breve para Syllabus / CurriculumPlan (que serian sintaxis simple + increment hipotetico).
- [ ] `layout/docs/row-actions.md` actualizado — documenta Ladrillo 4 con flujo del modal user-provided y resolucion de codes en `allowedFromStates`.
- [ ] Sección "Diferencias entre Versionar y Clonar" en `versioning-capability.md` — aclara la decision tecnica de unificacion vs la separacion de producto (cita CAP-CUR-018 vs CAP-CUR-022, BR-VER-002).
- [ ] Ejemplo de config completo (prefillFrom polimorfico + versioning user-provided + row action) en `mods/curriculum-design/.ai/PATTERNS.md` con link a la doc del core.
- [ ] Test de adopción simulada documentado: tiempo objetivo <45 min para activar en un object nuevo con sintaxis simple, <90 min con sintaxis polimorfica.

**Dependencias:** HU-1 a HU-11 (la doc se cierra cuando todas las HUs están entregadas) · **Spec:** adjuntar `_spec-HU12.md` durante desarrollo.

---

## Track 5 — Validación del proceso

---

### HU-13 · Pair-programming inicial dev externo + dev core

**Sprint:** SP4 · **Track:** Proceso · **Repo:** N/A (proceso)

**Como** dev externo (Eduardo)
**Quiero** pair-programming con un dev core (JuanDi) en HU-1, HU-3 y HU-8
**Para** validar que el Flujo de Klaus permite a un dev externo contribuir al core con doc aprobado como autorización.

**Criterios de aceptación:**

- [ ] Sesión de pair en HU-1 documentada (1-2h, screen-sharing).
- [ ] Sesión de pair en HU-3 documentada (foco: resolucion code→id + manejo transaccional + bypass del workflow validated).
- [ ] Sesión de pair en HU-8 documentada (foco: sintaxis polimorfica de `deepClone` aplicada a Activity → CurricularSection → CurricularLink — esta es la HU mas conceptual y la primera adopcion real).
- [ ] Retro al cierre del sprint: fricciones del proceso, qué falló, qué funcionó, propuestas de ajuste al Flujo.
- [ ] Retro adjunta al `brief.md` de la tarea PM.

**Dependencias:** HU-1, HU-3, HU-8 (las sesiones de pair ocurren durante el desarrollo de esas HUs) · **Spec:** no aplica (proceso, no código).

---

## Resumen — dependencias entre HUs

```
HU-2 (config prefillFrom simple + polimorfico) ──> HU-1 (param prefillFrom) ──┐
                                                                                │
HU-4 (config versioning user-provided | increment) ──> HU-3 (param asNewVersion) ──┤
                                                                                │
HU-5 (getVersionChain)    <── HU-4                                              │
                                                                                │
HU-9 (versionSourceId field)  ──────────────────────────────> HU-6 + HU-8       │
                                                                                │
HU-6 (createdVia events + flow n8n) <── HU-1, HU-3, HU-9                        │
                                                                                │
HU-7 (row action layout)  <── HU-1, HU-3                                        │
                                                                                │
HU-8 (activity.json + FK reflexivo + polimorfico) <── HU-2, HU-4, HU-9, P1     │
                                                                                │
HU-10 (row action Activity con modal) <── HU-7, HU-8                            │
                                                                                │
HU-11 (sección Versiones — discovery + impl) <── HU-5                           │
                                                                                │
HU-12 (docs)              <── HU-1 a HU-11                                      │
                                                                                │
HU-13 (pair + retro)      <── proceso transversal a HU-1, HU-3, HU-8
```

## Orden sugerido de entrega

| Semana | HUs en paralelo |
|---|---|
| Semana 1 | HU-9 (versionSourceId field — independiente) · HU-2 (configs JSON con polimorfico) · HU-4 (config versioning) · HU-13 (pair empieza) · P1 resuelto por Esteban |
| Semana 1-2 | HU-1, HU-3 (params en createInstance con resolucion code) · HU-5 (getVersionChain) · HU-11 discovery |
| Semana 2 | HU-6 (createdVia + n8n flow) · HU-7 (row action layout con modal) · HU-8 (activity.json polimorfico + FK reflexivo) |
| Semana 2 | HU-10 (row action Activity con modal user-provided) · HU-11 implementación · HU-12 (docs) |

## Capacidad estimada

13 HUs en un sprint de 2 semanas con 2 devs (Eduardo + JuanDi). Con CAMBIO-4 (sintaxis polimorfica), HU-2 y HU-8 son mas pesadas que en v1. Candidatas a recortar/mover a SP5:

- **HU-6** (createdVia en eventos) — nice-to-have. Mover a SP5 si hay presión. Cierra el loop de audit-chain pero no bloquea la operacion principal.
- **HU-11** (sección Versiones en RecordDetail) — si discovery muestra Camino B (sin primitivo), la HU crece. Moverla a SP5 si HU-2/HU-8 se complican.
- **HU-12** (documentación completa) — se puede empezar pero entregar formal en SP5.

Con estos recortes: 10-11 HUs entregables en SP4, con HU-6, HU-11 (caso B) y HU-12 cerrando en SP5.

---

## Pendientes que bloquean el sprint

| # | Decision | Quien resuelve | Bloquea |
|---|----------|----------------|---------|
| **P1** | ¿Links se vacian o se remapean al versionar? | Esteban (PM) | HU-8 |
| **P2** | ¿Sintaxis polimorfica completa en SP4, o hook custom + diferir a SP5? | JuanDi (spike) + Klaus | HU-2, HU-8 |
| **P3** | ¿Codegen del platform soporta self-references reflexivas en Prisma? | Spike tecnico de 1 dia (JuanDi) | HU-4 (validacion estricta de `linkageField`) |

Las HUs no se crean en Jira hasta resolver P1, P2 y P3.
