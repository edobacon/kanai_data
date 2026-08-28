---
id: DOC-kb-archive-dise-o-versionamiento-v1
project: up1
type: doc
---

# Doc de diseño — Versionamiento como capacidad declarativa del core de uP1

| Campo | Valor |
|---|---|
| **Tipo de pieza** | Función transversal (contiene 4 ladrillos) |
| **Autor** | Esteban Cortés (PM) |
| **Dev responsable** | A confirmar — sugerido Eduardo Bacon, pair con JuanDi Galdames en HUs core |
| **Aprobador** | Klaus |
| **Sprint objetivo** | SP4 uP1 |
| **Fecha de envío** | 2026-05-26 |

---

## 1. Título y descripción

**Versionamiento de objetos como capacidad declarativa del core de uP1.**

Habilita que cualquier object pueda volverse versionable agregando un bloque de configuración en su JSON, sin escribir resolvers ni código del mod. Internamente se construye sobre una capacidad más general (clonación = prefill desde otro objeto), expresada también como configuración JSON.

Primera adopción real: `Activity` en `curriculum-design`. Adopciones planificadas: `Syllabus`, `CurriculumPlan`, `CompetencyMap`.

## 2. Objetivo final

Que crear "una nueva versión de algo" sea una operación uniforme en uP1, sin que cada equipo invente su propia mecánica. El consultor (configurador) ve el mismo botón "Crear nueva versión" sin importar el objeto; el dev de mod activa la capacidad declarándola en JSON, sin escribir resolvers.

## 3. Contexto: qué intenté ocupar antes y no me sirvió

### 3.1 CRUD generic (`createInstance` existente)

Acepta `data` desde input del usuario pero no tiene forma de pre-llenarlo desde un objeto existente. Si el frontend lo intentara emulando (lee source, copia campos, llama create), duplica lógica en cada mod, no respeta `exclude`/`deepClone` declarativos, y no garantiza linaje atómico.

### 3.2 `duplicateReport` (precedente en `up1.js` del core)

Mutation ad-hoc para `Report`, declarada en typeDefs pero con **resolver no implementado**. Confirma que el gap apareció antes y se intentó resolver con una operación específica del objeto — enfoque que no escala a N objetos.

### 3.3 Implementarlo como resolver `*Validated` del mod

Sigue el patrón ya establecido (`transitionActivityValidated`, `updateActivityValidated`), pero significa que cada mod que necesite versionar (curriculum-design, syllabus, plan-de-estudios, competencias) escribe el mismo resolver con variaciones. Rompe DRY y la regla `no cross-mod dependencies` impide que un mod reuse el de otro.

## 4. Criterio de éxito (para dev uP1)

- Un dev de mod puede activar versionamiento agregando ~12 líneas a `objects/<entity>.json` (bloque `prefillFrom` + bloque `versioning`) y un row action en el layout. Sin código nuevo.
- Un dev externo (sin experiencia previa en el core) puede entregar HU-1 a HU-5 con este doc aprobado como autorización + pair-programming inicial con dev core.
- La capacidad pasa el test de adopción simulada: un dev escribe la config para `Syllabus` (sin pertenecer al sprint) y obtiene versionamiento funcional en menos de 30 minutos.
- Tests cubren: prefill con/sin `exclude`/`deepClone`, `asNewVersion` con/sin workflow, `allowedFromStates` enforcement, query `getVersionChain` correcta.

## 5. Dependencias

### 5.1 Pre-requisitos cumplidos

- HU2 curriculum-design — audit chain (`changeLog`, enum `source`)
- HU3 curriculum-design — workflow platform (estados/transiciones)
- HU4 curriculum-design — Activity gobernada por workflow + patrón `*Validated`
- Schema: `previousVersionId` ya existe en `objects/activity.json`

### 5.2 Equipos involucrados

- Equipo platform UP1 (JuanDi Galdames) — owner del core, pair-programming con dev externo
- Mod curriculum-design (Eduardo Bacon) — primer adoptante + dev externo en validación del proceso
- Klaus — aprobador del diseño

---

## 6. Campos adicionales — Función transversal

### 6.1 ¿Qué repositorios de uP1 implica esta función?

1. **`object-manager`** — extensión de `createInstance` con `prefillFrom` y `asNewVersion`, nueva query `getVersionChain`, lectura y validación de bloques `prefillFrom` y `versioning` en JSONs de objects.
2. **`layout`** — nuevas propiedades `prefillFromCurrent` y `asNewVersion` en row actions de tipo `create`, lógica de visibilidad basada en `allowedFromStates`.
3. **`mods/curriculum-design`** — declaración de config en `objects/activity.json`, agregado de `"Clone"` al enum `changeLog.source`, row action en layout de Activity.

### 6.2 ¿Cómo afecta a todos los productos existentes?

- **Mods que no usen la capacidad:** cero impacto. Las nuevas propiedades en `createInstance` son opcionales; layouts existentes ignoran las nuevas keys.
- **Mods que la usen:** ganan operación uniforme; no necesitan resolvers custom para clone/version.
- **Productos desplegados con datos vivos:** ninguno todavía (uP1 pre-producción). Cuando haya producción, la primera adopción real (Activity) requiere validar integridad referencial con datos existentes.

### 6.3 ¿Qué permite hacer que antes uP1 no podía hacer?

1. Crear una instancia pre-llenada desde otra del mismo tipo, declarativamente.
2. Mantener linaje de versiones de un objeto con campos auto-gobernados.
3. Versionar cualquier objeto agregando config JSON (sin tocar código).
4. Consultar la cadena completa de versiones de un objeto vía query genérica.

### 6.4 ¿Cómo se disponibiliza al cliente?

- **Cliente dev (consumidor de mods):** declarando bloques `prefillFrom` y `versioning` en el JSON del objeto, más row action en layout. Documentado en `object-manager/docs/versioning-capability.md` con receta y ejemplo.
- **Cliente consultor (configurador de mod desplegado):** vía la UI de Object Manager Editor cuando ese mod soporte editar estas keys — fuera de scope SP4.
- **Usuario final (consultor / coordinador):** vía el botón "Crear nueva versión" en RecordList del objeto, cuando el estado actual está en `allowedFromStates`.

### 6.5 ¿Es para cliente dev o cliente consultor?

**Cliente dev (primario):** la capacidad se entrega como contrato declarativo en JSON + UI que reacciona automáticamente.

**Cliente consultor (indirecto):** consume la feature vía mods que la activen. No interactúa con la config directamente en SP4.

### 6.6 ¿Requiere migración o cambios en productos ya desplegados?

- **Schema:** sí, acotado. Activity ya tiene `previousVersionId`. Solo se agrega `"Clone"` al enum `changeLog.source` + nuevo campo `sourceRefId` en `changeLog` (ambos vía sync + tenant:reset en dev).
- **Mods que adopten en el futuro:** cada uno declara su `linkageField` y `versionField`. Si el objeto no los tiene, los agrega en su próxima migración.
- **No requiere migración masiva de datos** — versionamiento solo aplica a objetos creados a partir de la entrega.

---

## 7. Anexo — 4 ladrillos que componen la función

### 7.1 Ladrillo 1 — `prefillFrom` en `createInstance` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **No.** Extensión del resolver genérico `createInstance` existente. Razón: clone es caso particular de create, no operación distinta. Reusa validaciones `core_ObjectValidation`, RBAC `objectname:create`, polymorphic RT handling. |
| ¿Layout nuevo? | No |
| Parámetros para que sirva a otros | `prefillFrom: { sourceId: ID!, includeRelations: Boolean = false }` en la mutation. En JSON del object: `"prefillFrom": { "exclude": [string], "deepClone": [string] }`. Defaults: `exclude` siempre agrega `id`, timestamps, `createdBy`. |
| Eventos y acciones expuestos | Hooks existentes de create (BullMQ post-create events) se disparan normal. Nueva metadata `createdVia: "prefill"` en el payload del evento — consumidores que quieran distinguir clone de create scratch pueden filtrar. |

### 7.2 Ladrillo 2 — `asNewVersion` en `createInstance` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **No.** Extensión del mismo `createInstance`. Razón: versionar = prefill + metadata auto-gestionada. Mantener una única operación de creación evita divergencia conceptual. |
| ¿Layout nuevo? | No |
| Parámetros para que sirva a otros | `asNewVersion: Boolean = false` en mutation (requiere `prefillFrom`). En JSON del object: bloque `versioning` con `linkageField`, `versionField`, `versionStrategy` (`"increment"` \| `"semver"` \| `"user-provided"`), `auditSource`, `allowedFromStates` (opcional), `initialStateField` (opcional), `initialStateValue` (opcional). |
| Errores expuestos | `OBJECT_NOT_VERSIONABLE` (si `asNewVersion=true` y el object no tiene `versioning` config) · `INVALID_SOURCE_STATE_FOR_VERSIONING` (si source no está en `allowedFromStates`) · `AS_NEW_VERSION_REQUIRES_PREFILL` (si se invoca sin `prefillFrom`) |
| Eventos y acciones expuestos | Audit event registrado con `source = versioning.auditSource` y nuevo campo `sourceRefId = prefillFrom.sourceId`. Consumidores pueden suscribirse a creates y filtrar por `sourceRefId != null`. |

### 7.3 Ladrillo 3 — Query `getVersionChain` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **Sí.** Query genérica nueva — no existe equivalente. Razón: navegar el linaje requiere lógica que el CRUD generic no tiene. |
| ¿Layout nuevo? | No |
| Firma | `getVersionChain(objectName: String!, instanceId: ID!): [Instance!]!` |
| Comportamiento | Lee `versioning.linkageField` del JSON del object. Sigue la cadena en ambas direcciones desde `instanceId`. Retorna lista ordenada por `createdAt`. Cada item con flags computed `isLatest: Boolean` y `versionNumber: Int`. |
| Eventos y acciones expuestos | Query de lectura — no dispara eventos. Componentes de layout (sección "Versiones" en RecordDetail) la consumen. |

### 7.4 Ladrillo 4 — Row action con prefill + versioning (layout)

| Campo | Respuesta |
|---|---|
| ¿Layout nuevo? | **No.** Extensión del row action `create` existente del RecordList. |
| ¿Es versión de RecordList? | Sí — extensión, no nuevo layout. |
| Parámetros nuevos | `prefillFromCurrent: Boolean = false` · `asNewVersion: Boolean = false` (requiere `prefillFromCurrent: true`) · `label` (free string) · `redirectTo` existente. |
| Comportamiento | Si `prefillFromCurrent: true`, llama `createInstance` con `prefillFrom: { sourceId: <currentRowId> }`. Si además `asNewVersion: true`, pasa `asNewVersion: true`. Si el object tiene `versioning.allowedFromStates`, el botón aparece solo cuando el estado del row está en la lista (visibilidad automática). |
| Eventos y acciones expuestos | Tras éxito redirige según `redirectTo`; tras fallo muestra toast con el error code del Ladrillo 2. |

---

## 8. Decisiones de diseño (propuesta — pendientes de validación por el equipo)

| ID | Decisión | Default propuesto |
|---|---|---|
| D1 | Qué se clona del árbol de Activity | Activity + secciones (deepClone). BibliographyReference se referencia (no se clona). CurricularLink se vacía. |
| D2 | Campos sobrescritos al versionar Activity | `exclude`: `currentStatusId`, `createdAt`, `approvedBy`, `version`, `previousVersionId`. `code` se hereda. |
| D5 | Constraint de unicidad sobre `code` | No constraint hard. Múltiples versiones con mismo `code` permitidas. Workflow gobierna vigencia. |
| D7 | Límite de árbol para transacción | ≤200 nodos en SP4. Optimización para árboles grandes fuera de scope. |
| D9 | `versionStrategy` default en SP4 | `increment` (entero auto). `semver` y `user-provided` para SP futuro. |
| D10 | ¿Bump arranca en 1 o 2? | Activity nueva nace con `version=1`. Versión derivada de v1 → `version=2`. |
| D11 | Metadata `createdVia` en eventos | Sí, agregar — bajo costo, útil para auditoría. |
| D12 | Asignación de HUs | A confirmar en planning con JuanDi y Eduardo. Pair en HU-1, HU-3. |

---

## 9. Historias de usuario (sprint 4)

### Track 1 — Core object-manager

#### HU-1 · prefillFrom param en createInstance

**Como** dev de mod
**Quiero** que `createInstance` acepte el parámetro opcional `prefillFrom: { sourceId, includeRelations? }`
**Para** crear una instancia pre-llenada con datos de otra del mismo tipo, sin escribir resolver custom

**Criterios de aceptación:**

- `createInstance` acepta `prefillFrom` como parámetro opcional sin romper llamadas existentes
- Cuando `prefillFrom` está presente, el resolver lee `sourceId`, valida que existe y es del mismo `objectName`, y construye el `data` combinando los campos del source con los explícitos del input (explicit pisa source)
- El default `exclude` siempre incluye `id`, `createdAt`, `updatedAt`, `createdBy` — aunque no se declare config en el JSON
- Si el source no existe → error `PREFILL_SOURCE_NOT_FOUND`
- Si el source es de otro `objectName` → error `PREFILL_SOURCE_TYPE_MISMATCH`
- Tests: prefill básico, prefill con override explícito, prefill con source inexistente, prefill cross-type rechazado

#### HU-2 · Config prefillFrom en JSON del object

**Como** dev de mod
**Quiero** declarar `"prefillFrom": { "exclude": [...], "deepClone": [...] }` en el JSON del object
**Para** gobernar qué se hereda y qué se ignora al pre-llenar

**Criterios de aceptación:**

- Codegen valida la estructura de `prefillFrom` al parsear el JSON; estructura inválida → error de codegen
- El resolver lee la config y aplica `exclude` (skip esos campos del source) y `deepClone` (para subobjetos relacionales — copia recursiva en lugar de referencia)
- Si el JSON no declara `prefillFrom`, se aplica solo el default `exclude` (id, timestamps, createdBy)
- Documentado en `object-manager/docs/prefill-capability.md` con ejemplo
- Tests: exclude respetado, deepClone recursivo, sin config (defaults), config malformada rechazada

#### HU-3 · asNewVersion param en createInstance

**Como** dev de mod
**Quiero** que `createInstance` acepte `asNewVersion: Boolean` que, leyendo el bloque `versioning` del JSON, aplique linkage + bump + reset estado + audit metadata
**Para** crear una nueva versión de un objeto sin escribir resolver custom

**Criterios de aceptación:**

- `createInstance` acepta `asNewVersion` opcional. Requiere `prefillFrom` definido — sin él → error `AS_NEW_VERSION_REQUIRES_PREFILL`
- Si `asNewVersion=true` y el JSON no tiene bloque `versioning` → error `OBJECT_NOT_VERSIONABLE`
- Setea `linkageField = prefillFrom.sourceId`
- Bumpea `versionField` según `versionStrategy` (en SP4 solo `increment` implementado)
- Si `initialStateField`/`initialStateValue` están declarados, setea ese campo al valor configurado
- Si `allowedFromStates` está declarado y el source no está en la lista → error `INVALID_SOURCE_STATE_FOR_VERSIONING`
- Audit event se registra con `source = versioning.auditSource` y `sourceRefId = prefillFrom.sourceId`
- Toda la operación en una sola transacción Prisma (`$transaction({ isolationLevel: 'Serializable' })`)
- Tests: bump correcto, allowedFromStates enforcement, sin versioning config rechazado, transacción rollback en fallo

#### HU-4 · Config versioning en JSON del object

**Como** dev de mod
**Quiero** declarar el bloque `versioning` en el JSON del object con `linkageField`, `versionField`, `versionStrategy`, `auditSource`, `allowedFromStates`, `initialStateField`, `initialStateValue`
**Para** activar versionamiento de mi object sin escribir código

**Criterios de aceptación:**

- Codegen valida la estructura del bloque `versioning`
- `linkageField`, `versionField`, `versionStrategy`, `auditSource` son requeridos. El resto opcionales
- `linkageField` debe ser un campo FK reflexivo declarado en el mismo object. Codegen valida esto y falla si no
- `versionField` debe ser tipo Int (en SP4 con strategy `increment`)
- `versionStrategy` solo acepta `"increment"` en SP4 (otros valores rechazados)
- Documentado en `object-manager/docs/versioning-capability.md` con receta paso a paso
- Tests: config válida aceptada, config malformada rechazada con mensaje claro, linkageField inexistente rechazado

#### HU-5 · Query getVersionChain

**Como** dev de mod
**Quiero** una query `getVersionChain(objectName, instanceId)` que retorne el linaje completo del objeto
**Para** poder mostrar al usuario el historial de versiones y navegar entre ellas

**Criterios de aceptación:**

- Query `getVersionChain(objectName: String!, instanceId: ID!): [Instance!]!` expuesta en el schema
- Lee `versioning.linkageField` del JSON del object. Si no está declarado → error `OBJECT_NOT_VERSIONABLE`
- Retorna instances ordenadas por `createdAt` ascendente
- Cada instance incluye `isLatest: Boolean` (true si es la última en la cadena) y `versionNumber: Int` (valor del `versionField`)
- Respeta RBAC — si el usuario no tiene `objectname:view` sobre alguna instance del linaje, se omite (no se reporta como error)
- Tests: linaje completo retornado, isLatest correcto, RBAC respetado, objectName no versionable rechazado

#### HU-6 · createdVia metadata en eventos

**Como** dev de mod
**Quiero** que los eventos BullMQ de create incluyan `createdVia: "scratch" | "prefill" | "version"`
**Para** que consumidores (audit, notifications) puedan distinguir el tipo de creación

**Criterios de aceptación:**

- Payload del evento BullMQ post-create incluye `createdVia`
- `"scratch"` si no se pasó `prefillFrom`. `"prefill"` si se pasó pero `asNewVersion=false`. `"version"` si `asNewVersion=true`
- El flow n8n `audit-capture` lee este campo y lo refleja en `changeLog.source` cuando corresponda
- Tests: payload correcto en los 3 casos

### Track 2 — Core layout

#### HU-7 · Row action con prefillFromCurrent + asNewVersion

**Como** dev de mod
**Quiero** declarar `{ "type": "create", "prefillFromCurrent": true, "asNewVersion": true, "label": "..." }` en row actions del RecordList
**Para** ofrecer al usuario el botón "Crear nueva versión" sin escribir componentes

**Criterios de aceptación:**

- El action de tipo `create` acepta las props nuevas `prefillFromCurrent` y `asNewVersion` (ambas opcionales, default false)
- Si `prefillFromCurrent: true`, al hacer click el layout invoca `createInstance` con `prefillFrom: { sourceId: <currentRowId> }`
- Si además `asNewVersion: true`, pasa `asNewVersion: true` a la mutation
- Si el object tiene `versioning.allowedFromStates` declarado, el botón se renderiza solo cuando el estado del row está en la lista
- Tras éxito redirige según `redirectTo` (default `edit`)
- Tras fallo muestra toast con el error code del Ladrillo 2
- Tests: visibilidad respeta allowedFromStates, redirect correcto, error handling

### Track 3 — Aplicación en curriculum-design

#### HU-8 · Declarar prefillFrom + versioning en activity.json

**Como** dev del mod curriculum-design
**Quiero** declarar las dos configs en `objects/activity.json`
**Para** activar versionamiento de Activity sin escribir código adicional

**Criterios de aceptación:**

- `objects/activity.json` incluye:
  - `"prefillFrom": { "exclude": ["currentStatusId", "createdAt", "approvedBy", "version", "previousVersionId"], "deepClone": ["sections"] }`
  - `"versioning": { "linkageField": "previousVersionId", "versionField": "version", "versionStrategy": "increment", "auditSource": "Clone", "allowedFromStates": ["Approved", "Published"], "initialStateField": "currentStatusId", "initialStateValue": "BOR" }`
- Sync corre sin errores y aplica el schema a tenant UPU
- Tests del mod: crear v2 de Activity aprobada, verificar `version=2`, `previousVersionId=v1.id`, `currentStatusId=BOR`, audit con source=Clone

#### HU-9 · Agregar Clone al enum changeLog.source + campo sourceRefId

**Como** dev del mod curriculum-design
**Quiero** extender el modelo de `changeLog` con `"Clone"` como nuevo valor de `source` y campo `sourceRefId` nullable
**Para** que el audit chain pueda registrar de dónde se clonó cada versión

**Criterios de aceptación:**

- Enum `source` en `objects/changeLog.json` incluye `"Clone"`
- Nuevo campo `sourceRefId: String (nullable)` en `objects/changeLog.json` con descripción "ID del objeto origen cuando source=Clone"
- Flow n8n `audit-capture` actualizado para recibir y persistir `sourceRefId`
- Resolver `recordAuditEvent` valida que si `source=Clone`, `sourceRefId` debe estar presente
- Migración Prisma generada + sync aplica a tenants
- Tests: audit entry con source=Clone y sourceRefId correctos

#### HU-10 · Row action "Crear nueva versión" en RecordList de Activity

**Como** consultor (usuario final)
**Quiero** ver el botón "Crear nueva versión" en cada Activity aprobada/publicada del RecordList
**Para** poder iniciar el ciclo de mejora curricular

**Criterios de aceptación:**

- Config del layout `RecordList` de Activity incluye row action `{ "type": "create", "prefillFromCurrent": true, "asNewVersion": true, "label": "{{$t('createNewVersion')}}", "redirectTo": "edit" }`
- Botón visible solo cuando `currentStatusId` está en `["Approved", "Published"]`
- Click ejecuta `createInstance` y redirige al RecordDetail del nuevo Activity en modo edit
- Toast de éxito: "Versión {N} creada desde versión {N-1}"
- Traducciones es_CL / en_CL / pt_BR
- Tests e2e: flujo completo desde RecordList

#### HU-11 · Sección "Versiones" en RecordDetail de Activity

**Como** consultor
**Quiero** ver una sección colapsable "Versiones" en el RecordDetail de Activity con todas las versiones del programa
**Para** poder navegar entre versiones y entender la evolución del programa

**Criterios de aceptación:**

- Nueva sección colapsable "Versiones" en el layout RecordDetail de Activity, después de "Historial"
- La sección consume `getVersionChain(objectName: "Activity", instanceId: <currentId>)`
- Cada versión se muestra con: número de versión, estado (badge), fecha de creación, autor
- La versión actual está marcada visualmente (badge "Versión actual")
- Click en una versión navega al RecordDetail de esa versión
- Traducciones es_CL / en_CL / pt_BR
- Tests: sección renderiza correctamente con 1, 2, N versiones

### Track 4 — Documentación + adopción futura

#### HU-12 · Documentación de la capacidad para futuros adoptantes

**Como** dev de cualquier mod uP1
**Quiero** una guía clara de cómo activar versionamiento en mi object
**Para** adoptarla en mi mod sin tener que leer el código del core

**Criterios de aceptación:**

- `object-manager/docs/prefill-capability.md` — documenta Ladrillo 1
- `object-manager/docs/versioning-capability.md` — documenta Ladrillo 2 + Ladrillo 3, con receta paso a paso, ejemplo completo de Activity, y receta para Syllabus / CurriculumPlan
- `layout/docs/row-actions.md` actualizado — documenta Ladrillo 4
- Ejemplo de config completo (prefillFrom + versioning + row action) en `mods/curriculum-design/.ai/PATTERNS.md` con link a la doc del core
- Test de adopción simulada documentado: tiempo objetivo <30 min para activar en un object nuevo

### Track 5 — Validación del proceso

#### HU-13 · Pair-programming inicial dev externo + dev core

**Como** dev externo (Eduardo)
**Quiero** pair-programming con un dev core (JuanDi) en HU-1 y HU-3
**Para** validar que el Flujo de Klaus permite a un dev externo contribuir al core con doc aprobado como autorización

**Criterios de aceptación:**

- Sesión de pair en HU-1 documentada (1-2h, screen-sharing)
- Sesión de pair en HU-3 documentada
- Retro al cierre del sprint: fricciones del proceso, qué falló, qué funcionó, propuestas de ajuste al Flujo
- Retro adjunta al `brief.md` de la tarea PM

---

## 10. Fuera de alcance (explícito)

- Versionamiento de objetos distintos a Activity en SP4 (Syllabus, CurriculumPlan, CompetencyMap — adopción posterior)
- `versionStrategy = "semver"` y `"user-provided"` (solo `increment` en SP4)
- Edición de la config `versioning` desde Object Manager Editor (UI declarativa para no-devs)
- Diff visual entre versiones (comparar v1 vs v2 lado a lado)
- Bloqueo de edición de versiones anteriores tras publicación (inmutabilidad post-aprobación)
- Optimización para árboles >200 nodos (timeouts de Prisma)
- Migración de Activities pre-versionamiento (no existen aún en producción)
- UI para el flag `includeRelations: true` del `prefillFrom` — en SP4 siempre se controla via JSON `deepClone`

---

## 11. Riesgos y dificultades posibles

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | El dev externo (Eduardo) no logra entregar las HUs del core sin ayuda continua del dev core, ralentizando ambos | Pair-programming acotado a HU-1 y HU-3; resto se hace en paralelo con review async. Si en HU-2 Eduardo está bloqueado, JuanDi asume |
| 2 | El bloque `versioning` en JSON termina siendo verboso para activación en muchos objects | Aceptable en SP4 — si crece la adopción y se vuelve doloroso, agregar shortcut (ej. `"versionable": true` que aplica defaults razonables) |
| 3 | La transacción de versioning con `deepClone` en árbol grande (>200 nodos) falla por timeout | Documentar el límite. Si en producción aparecen Activities reales con más nodos, levantar ticket de optimización (batched insert, raw SQL) |
| 4 | Conflicto entre `versioning.initialStateField` y validaciones de workflow (HU3/HU4): la nueva versión debería poder forzar estado `BOR` aunque la transición desde "nuevo" no esté declarada en `workflowTransition` | El resolver de Ladrillo 2 bypasea `transitionActivityValidated` al setear el estado inicial (solo aplica al primer set, no a cambios subsecuentes). Documentar explícitamente |
| 5 | Adoptantes futuros (Syllabus, CurriculumPlan) descubren limitaciones de los Ladrillos 1-4 que solo aparecen al usar | Test de adopción simulada (HU-12) intenta cubrir esto. Aceptar que la primera iteración puede requerir extensiones — el costo de descubrirlo ahora es mayor |
| 6 | Eventos BullMQ con `createdVia: "version"` no son consumidos por handlers existentes y se acumulan | Verificar que el handler del audit-chain (n8n flow) consume el evento. Si otro handler espera distinto, agregarlo a `events/` del mod |

---

## 12. Próximos pasos (post-aprobación)

1. Klaus aprueba o pide ajustes.
2. Si aprueba: las HUs se crean en Jira con este doc adjunto. Asignación según HU-13 (pair en HU-1/HU-3).
3. Devs entregan en paralelo según el Flujo (paso 5: desarrollo + revisión paralela). Specs por HU se llenan con el template `_spec-template-es.docx.md`.
4. Al cierre del sprint: retro del proceso (HU-13) y lecciones aprendidas escaladas al equipo platform UP1.

---

## 13. Anexo — Configs completos de Activity (para referencia rápida)

**`objects/activity.json` — fragmento agregado:**

```json
{
  "prefillFrom": {
    "exclude": [
      "currentStatusId",
      "createdAt",
      "approvedBy",
      "version",
      "previousVersionId"
    ],
    "deepClone": ["sections"]
  },
  "versioning": {
    "linkageField": "previousVersionId",
    "versionField": "version",
    "versionStrategy": "increment",
    "auditSource": "Clone",
    "allowedFromStates": ["Approved", "Published"],
    "initialStateField": "currentStatusId",
    "initialStateValue": "BOR"
  }
}
```

**`config/layouts/activity-list.json` — row action agregado:**

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
