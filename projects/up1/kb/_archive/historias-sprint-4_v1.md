# Historias de usuario — Sprint 4 uP1: Versionamiento de objetos

> Derivadas del doc de diseño `diseño-versionamiento_v1.md` (sección 9).
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

- [ ] `createInstance` acepta `prefillFrom` como parámetro opcional sin romper llamadas existentes.
- [ ] Cuando `prefillFrom` está presente, el resolver lee `sourceId`, valida que existe y es del mismo `objectName`, y construye el `data` combinando los campos del source con los explícitos del input (explicit pisa source).
- [ ] El default `exclude` siempre incluye `id`, `createdAt`, `updatedAt`, `createdBy` — aunque no se declare config en el JSON.
- [ ] Si el source no existe → error `PREFILL_SOURCE_NOT_FOUND`.
- [ ] Si el source es de otro `objectName` → error `PREFILL_SOURCE_TYPE_MISMATCH`.
- [ ] Tests: prefill básico, prefill con override explícito, prefill con source inexistente, prefill cross-type rechazado.

**Dependencias:** Ninguna · **Spec:** adjuntar `_spec-HU1.md` durante desarrollo.

---

### HU-2 · Config prefillFrom en JSON del object

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar `"prefillFrom": { "exclude": [...], "deepClone": [...] }` en el JSON del object
**Para** gobernar qué se hereda y qué se ignora al pre-llenar.

**Criterios de aceptación:**

- [ ] Codegen valida la estructura de `prefillFrom` al parsear el JSON; estructura inválida → error de codegen.
- [ ] El resolver lee la config y aplica `exclude` (skip esos campos del source) y `deepClone` (para subobjetos relacionales — copia recursiva en lugar de referencia).
- [ ] Si el JSON no declara `prefillFrom`, se aplica solo el default `exclude` (id, timestamps, createdBy).
- [ ] Documentado en `object-manager/docs/prefill-capability.md` con ejemplo.
- [ ] Tests: exclude respetado, deepClone recursivo, sin config (defaults), config malformada rechazada.

**Dependencias:** HU-1 · **Spec:** adjuntar `_spec-HU2.md` durante desarrollo.

---

### HU-3 · asNewVersion param en createInstance

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** que `createInstance` acepte `asNewVersion: Boolean` que, leyendo el bloque `versioning` del JSON, aplique linkage + bump + reset estado + audit metadata
**Para** crear una nueva versión de un objeto sin escribir resolver custom.

**Criterios de aceptación:**

- [ ] `createInstance` acepta `asNewVersion` opcional. Requiere `prefillFrom` definido — sin él → error `AS_NEW_VERSION_REQUIRES_PREFILL`.
- [ ] Si `asNewVersion=true` y el JSON no tiene bloque `versioning` → error `OBJECT_NOT_VERSIONABLE`.
- [ ] Setea `linkageField = prefillFrom.sourceId`.
- [ ] Bumpea `versionField` según `versionStrategy` (en SP4 solo `increment` implementado).
- [ ] Si `initialStateField`/`initialStateValue` están declarados, setea ese campo al valor configurado.
- [ ] Si `allowedFromStates` está declarado y el source no está en la lista → error `INVALID_SOURCE_STATE_FOR_VERSIONING`.
- [ ] Audit event se registra con `source = versioning.auditSource` y `sourceRefId = prefillFrom.sourceId`.
- [ ] Toda la operación en una sola transacción Prisma (`$transaction({ isolationLevel: 'Serializable' })`).
- [ ] Tests: bump correcto, allowedFromStates enforcement, sin versioning config rechazado, transacción rollback en fallo.

**Dependencias:** HU-1, HU-2, HU-4 · **Spec:** adjuntar `_spec-HU3.md` durante desarrollo.

---

### HU-4 · Config versioning en JSON del object

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar el bloque `versioning` en el JSON del object con `linkageField`, `versionField`, `versionStrategy`, `auditSource`, `allowedFromStates`, `initialStateField`, `initialStateValue`
**Para** activar versionamiento de mi object sin escribir código.

**Criterios de aceptación:**

- [ ] Codegen valida la estructura del bloque `versioning`.
- [ ] `linkageField`, `versionField`, `versionStrategy`, `auditSource` son requeridos. El resto opcionales.
- [ ] `linkageField` debe ser un campo FK reflexivo declarado en el mismo object. Codegen valida esto y falla si no.
- [ ] `versionField` debe ser tipo Int (en SP4 con strategy `increment`).
- [ ] `versionStrategy` solo acepta `"increment"` en SP4 (otros valores rechazados).
- [ ] Documentado en `object-manager/docs/versioning-capability.md` con receta paso a paso.
- [ ] Tests: config válida aceptada, config malformada rechazada con mensaje claro, linkageField inexistente rechazado.

**Dependencias:** Ninguna · **Spec:** adjuntar `_spec-HU4.md` durante desarrollo.

---

### HU-5 · Query getVersionChain

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** una query `getVersionChain(objectName, instanceId)` que retorne el linaje completo del objeto
**Para** poder mostrar al usuario el historial de versiones y navegar entre ellas.

**Criterios de aceptación:**

- [ ] Query `getVersionChain(objectName: String!, instanceId: ID!): [Instance!]!` expuesta en el schema.
- [ ] Lee `versioning.linkageField` del JSON del object. Si no está declarado → error `OBJECT_NOT_VERSIONABLE`.
- [ ] Retorna instances ordenadas por `createdAt` ascendente.
- [ ] Cada instance incluye `isLatest: Boolean` (true si es la última en la cadena) y `versionNumber: Int` (valor del `versionField`).
- [ ] Respeta RBAC — si el usuario no tiene `objectname:view` sobre alguna instance del linaje, se omite (no se reporta como error).
- [ ] Tests: linaje completo retornado, isLatest correcto, RBAC respetado, objectName no versionable rechazado.

**Dependencias:** HU-4 · **Spec:** adjuntar `_spec-HU5.md` durante desarrollo.

---

### HU-6 · createdVia metadata en eventos

**Sprint:** SP4 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** que los eventos BullMQ de create incluyan `createdVia: "scratch" | "prefill" | "version"`
**Para** que consumidores (audit, notifications) puedan distinguir el tipo de creación.

**Criterios de aceptación:**

- [ ] Payload del evento BullMQ post-create incluye `createdVia`.
- [ ] `"scratch"` si no se pasó `prefillFrom`. `"prefill"` si se pasó pero `asNewVersion=false`. `"version"` si `asNewVersion=true`.
- [ ] El flow n8n `audit-capture` lee este campo y lo refleja en `changeLog.source` cuando corresponda.
- [ ] Tests: payload correcto en los 3 casos.

**Dependencias:** HU-1, HU-3 · **Spec:** adjuntar `_spec-HU6.md` durante desarrollo.

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
- [ ] Si el object tiene `versioning.allowedFromStates` declarado, el botón se renderiza solo cuando el estado del row está en la lista.
- [ ] Tras éxito redirige según `redirectTo` (default `edit`).
- [ ] Tras fallo muestra toast con el error code del Ladrillo 2.
- [ ] Tests: visibilidad respeta allowedFromStates, redirect correcto, error handling.

**Dependencias:** HU-1, HU-3 · **Spec:** adjuntar `_spec-HU7.md` durante desarrollo.

---

## Track 3 — Aplicación en curriculum-design

---

### HU-8 · Declarar prefillFrom + versioning en activity.json

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design
**Quiero** declarar las dos configs en `objects/activity.json`
**Para** activar versionamiento de Activity sin escribir código adicional.

**Criterios de aceptación:**

- [ ] `objects/activity.json` incluye:
  - `"prefillFrom": { "exclude": ["currentStatusId", "createdAt", "approvedBy", "version", "previousVersionId"], "deepClone": ["sections"] }`
  - `"versioning": { "linkageField": "previousVersionId", "versionField": "version", "versionStrategy": "increment", "auditSource": "Clone", "allowedFromStates": ["Approved", "Published"], "initialStateField": "currentStatusId", "initialStateValue": "BOR" }`
- [ ] Sync corre sin errores y aplica el schema a tenant UPU.
- [ ] Tests del mod: crear v2 de Activity aprobada, verificar `version=2`, `previousVersionId=v1.id`, `currentStatusId=BOR`, audit con source=Clone.

**Dependencias:** HU-2, HU-4, HU-9 · **Spec:** adjuntar `_spec-HU8.md` durante desarrollo.

---

### HU-9 · Agregar Clone al enum changeLog.source + campo sourceRefId

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod curriculum-design
**Quiero** extender el modelo de `changeLog` con `"Clone"` como nuevo valor de `source` y campo `sourceRefId` nullable
**Para** que el audit chain pueda registrar de dónde se clonó cada versión.

**Criterios de aceptación:**

- [ ] Enum `source` en `objects/changeLog.json` incluye `"Clone"`.
- [ ] Nuevo campo `sourceRefId: String (nullable)` en `objects/changeLog.json` con descripción "ID del objeto origen cuando source=Clone".
- [ ] Flow n8n `audit-capture` actualizado para recibir y persistir `sourceRefId`.
- [ ] Resolver `recordAuditEvent` valida que si `source=Clone`, `sourceRefId` debe estar presente.
- [ ] Migración Prisma generada + sync aplica a tenants.
- [ ] Tests: audit entry con source=Clone y sourceRefId correctos.

**Dependencias:** Ninguna · **Spec:** adjuntar `_spec-HU9.md` durante desarrollo.

---

### HU-10 · Row action "Crear nueva versión" en RecordList de Activity

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** consultor (usuario final)
**Quiero** ver el botón "Crear nueva versión" en cada Activity aprobada/publicada del RecordList
**Para** poder iniciar el ciclo de mejora curricular.

**Criterios de aceptación:**

- [ ] Config del layout `RecordList` de Activity incluye row action `{ "type": "create", "prefillFromCurrent": true, "asNewVersion": true, "label": "{{$t('createNewVersion')}}", "redirectTo": "edit" }`.
- [ ] Botón visible solo cuando `currentStatusId` está en `["Approved", "Published"]`.
- [ ] Click ejecuta `createInstance` y redirige al RecordDetail del nuevo Activity en modo edit.
- [ ] Toast de éxito: "Versión {N} creada desde versión {N-1}".
- [ ] Traducciones es_CL / en_CL / pt_BR.
- [ ] Tests e2e: flujo completo desde RecordList.

**Dependencias:** HU-7, HU-8 · **Spec:** adjuntar `_spec-HU10.md` durante desarrollo.

---

### HU-11 · Sección "Versiones" en RecordDetail de Activity

**Sprint:** SP4 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** consultor
**Quiero** ver una sección colapsable "Versiones" en el RecordDetail de Activity con todas las versiones del programa
**Para** poder navegar entre versiones y entender la evolución del programa.

**Criterios de aceptación:**

- [ ] Nueva sección colapsable "Versiones" en el layout RecordDetail de Activity, después de "Historial".
- [ ] La sección consume `getVersionChain(objectName: "Activity", instanceId: <currentId>)`.
- [ ] Cada versión se muestra con: número de versión, estado (badge), fecha de creación, autor.
- [ ] La versión actual está marcada visualmente (badge "Versión actual").
- [ ] Click en una versión navega al RecordDetail de esa versión.
- [ ] Traducciones es_CL / en_CL / pt_BR.
- [ ] Tests: sección renderiza correctamente con 1, 2, N versiones.

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

- [ ] `object-manager/docs/prefill-capability.md` — documenta Ladrillo 1.
- [ ] `object-manager/docs/versioning-capability.md` — documenta Ladrillo 2 + Ladrillo 3, con receta paso a paso, ejemplo completo de Activity, y receta para Syllabus / CurriculumPlan.
- [ ] `layout/docs/row-actions.md` actualizado — documenta Ladrillo 4.
- [ ] Ejemplo de config completo (prefillFrom + versioning + row action) en `mods/curriculum-design/.ai/PATTERNS.md` con link a la doc del core.
- [ ] Test de adopción simulada documentado: tiempo objetivo <30 min para activar en un object nuevo.

**Dependencias:** HU-1 a HU-11 (la doc se cierra cuando todas las HUs están entregadas) · **Spec:** adjuntar `_spec-HU12.md` durante desarrollo.

---

## Track 5 — Validación del proceso

---

### HU-13 · Pair-programming inicial dev externo + dev core

**Sprint:** SP4 · **Track:** Proceso · **Repo:** N/A (proceso)

**Como** dev externo (Eduardo)
**Quiero** pair-programming con un dev core (JuanDi) en HU-1 y HU-3
**Para** validar que el Flujo de Klaus permite a un dev externo contribuir al core con doc aprobado como autorización.

**Criterios de aceptación:**

- [ ] Sesión de pair en HU-1 documentada (1-2h, screen-sharing).
- [ ] Sesión de pair en HU-3 documentada.
- [ ] Retro al cierre del sprint: fricciones del proceso, qué falló, qué funcionó, propuestas de ajuste al Flujo.
- [ ] Retro adjunta al `brief.md` de la tarea PM (`076-refinar-historias-sprint-4`).

**Dependencias:** HU-1, HU-3 (las sesiones de pair ocurren durante el desarrollo de esas HUs) · **Spec:** no aplica (proceso, no código).

---

## Resumen — dependencias entre HUs

```
HU-2 (config prefillFrom) ──> HU-1 (param prefillFrom) ──┐
                                                          │
HU-4 (config versioning)  ──> HU-3 (param asNewVersion) ──┤
                                                          │
HU-5 (getVersionChain)    <── HU-4                        │
                                                          │
HU-6 (createdVia events)  <── HU-1, HU-3                  │
                                                          │
HU-7 (row action layout)  <── HU-1, HU-3                  │
                                                          │
HU-9 (changeLog Clone)    ──────────────────────────────> HU-8
                                                          │
HU-8 (activity.json)      <── HU-2, HU-4, HU-9            │
                                                          │
HU-10 (row action Activity) <── HU-7, HU-8                │
                                                          │
HU-11 (sección Versiones) <── HU-5                        │
                                                          │
HU-12 (docs)              <── HU-1 a HU-11                │
                                                          │
HU-13 (pair + retro)      <── proceso transversal a HU-1, HU-3
```

## Orden sugerido de entrega

| Semana | HUs en paralelo |
|---|---|
| Semana 1 | HU-2, HU-4 (configs en JSON) · HU-9 (changeLog) · HU-13 (pair empieza) |
| Semana 1-2 | HU-1, HU-3 (params en createInstance) · HU-5 (getVersionChain) |
| Semana 2 | HU-6 (createdVia) · HU-7 (row action layout) · HU-8 (activity.json) |
| Semana 2 | HU-10 (row action Activity) · HU-11 (sección Versiones) · HU-12 (docs) |

## Capacidad estimada

13 HUs en un sprint de 2 semanas con 2 devs (Eduardo + JuanDi) es agresivo. Candidatas a recortar/mover a SP5:

- **HU-6** (createdVia en eventos) — nice-to-have, no bloquea. Mover a SP5 si hay presión.
- **HU-12** (documentación completa) — se puede empezar pero entregar formal en SP5.

Con estos recortes: 11 HUs entregables en SP4, con HU-6 y HU-12 cerrando en SP5.
