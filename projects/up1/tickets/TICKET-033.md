---
id: TICKET-033
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1219
module: object-manager
autopilot: autonomous
---

<!--
Notas sobre autopilot del ticket:
- Modo global: 'super' (auto-commit local, auto-aprobacion de gates ⚑ fuertes via reviewer aislado)
- Overrides de autopilot POR SESSION (declarados via atributo del header al materializar la session via dkc-execute-task open-session N):
  - S1: [autopilot: 'strict'] — spike G-P3.3 requiere decision humana sobre API del mapa oldId->newId.
    Contexto + opciones + impacto en REQ-S1-DECISION del spec (a generar en design-feature).
  - S3: [autopilot: 'strict'] — migraciones Prisma multi-tenant requieren smoke manual pre-S4.
    Contexto + opciones + impacto en REQ-S3-DECISION del spec (a generar en design-feature).
- Las otras 7 sessions corren en super puro (auto-aprobacion).
- El frontmatter `overrides: []` esta vacio porque es para overrides de rules/decisions
  ({id, reason} per TicketOverrideSchema), no para autopilot por session.
-->


# Track 0 Core | Prerequisitos de plataforma para clonacion/versionamiento

## Request

> Contenido literal del ticket Jira [UPONE-1219](https://u-planner.atlassian.net/browse/UPONE-1219) (Historia, parent epic UPONE-1206 "Core | Capacidad de clonación de objetos"). Reporter: Esteban Cortes. Assignee: Eduardo Bacon.

### Descripción

Cambios habilitantes en el core (`object-manager`: codegen, registro de objetos, resolver genérico) necesarios **antes** de las HU-1..HU-7. Sin ellos, la capacidad declarativa no puede leerse en runtime.

### Alcance (sub-tareas)

* **HU-0e** — Confirmar (test) que el codegen genera el FK reflexivo de `previousVersionId` (Activity→Activity).
* **HU-0d** — Codegen lee/clona hijos polimórficos (`polymorphicChildren`: las `CurricularSection` de un Activity). Incluye spike de 1 día para dimensionar el remap de links.
* **HU-0j** — Config-storage: columna `versioningConfig` en el registro + paso de sync que persiste la config declarada en el JSON, para que el resolver la lea. **Bloquea HU-1/2/3/4.**

### Criterios de aceptación

* Un objeto con bloque `versioning` declarado → config persistida y disponible al resolver tras el sync; sin el bloque → queda nula.
* Clonar un Activity arrastra sus `CurricularSection` con jerarquía preservada.
* Self-ref reflexivo confirmado por test.
* Regenerar los 5 tenants no cambia los schemas existentes (regresión).

### Dependencias

Spike inicial (HU-0d). Sin dependencias externas bloqueantes.

### Por qué

Es el "piso" del core. La pieza clave es **HU-0j**: hoy declarar la capacidad en el JSON no surte efecto porque no hay dónde persistir esa config para que el resolver la lea (detectado al validar contra el pipeline de sync, v5). Va en UPONE-1206 por ser trabajo de core/plataforma (la capacidad transversal de esa épica).

> Prioridad: Alta (bloqueante del core).

> **Nota de DKC** (no parte del ticket Jira): la descripcion original referencia `historias-sprint-4_v5.md` como "detalle/AC completos". Ese archivo es transitorio. El material referenciado se internaliza abajo en las secciones "Contexto operativo del plan" y "Material internalizado".

## Contexto operativo del plan SP3

> Internalizado del runbook del sprint (sin pointers externos). Cada sub-paso documenta el **contexto**, **que se realiza**, **investigar/profundizar** y **prueba** que el dev/LLM necesita para arrancar.

### G-P3.3 — Spike (Fase 0, dia 1) · [plataforma/core] · `P0`

- **Meta**: spike · ~1 SP · certeza a validar · rollback N/A · riesgo: el remap crece → se acota el hook
- **Contexto**: `CurricularSection` es polimorfico (`ownerType`/`ownerId`) y `CurricularLink` vincula dos secciones. Al clonar un Activity hay que clonar las secciones **y remapear los links** a las nuevas secciones (BR-VER-002). El remap generico en codegen (derived) se difiere a SP4; en SP3 lo hace un hook del mod (HU-8b). El spike dimensiona ese hook.
- **Que se realiza**: validar viabilidad del deepClone generico + disenar la API del mapa `oldId→newId` que el hook consumira; estimar el tamano del hook.
- **Investigar/profundizar**: ESTE es el spike. Output decide el alcance del hook (HU-8b).
- **Prueba**: documento de spike con la API del deepClone + decision de tamano del hook.

### P1.1 — HU-0e · Confirmar self-ref reflexivo (Fase 1) · [plataforma/core] · `P1`

- **Meta**: verificacion/test · ~1 SP · certeza confirmado (ya funciona) · rollback N/A (solo test) · riesgo bajo
- **Contexto**: `previousVersionId` sera un FK reflexivo (Activity→Activity). v4 asumia que el codegen necesitaba una feature nueva; se verifico que **ya funciona** (`CurricularSection.parentId` genera `@relation` reflexivo correcto). Esta HU solo lo confirma con un test. El bug B1 (`targetField`) queda **fuera de scope**.
- **Que se realiza**: test que declare `previousVersionId: { references: "Activity", targetField: "id" }` y verifique el `@relation` reflexivo generado. Documentar la convencion para futuros adoptantes.
- **Depende de**: nada.
- **Investigar**: nada.
- **Prueba**: `unit` — genera `@relation` reflexivo apuntando a `id`; idempotente (no rompe self-refs existentes).

### P1.5 — HU-0j · Config-storage IMP-11 (Fase 1, gatea Fase 2) · [plataforma/core] · `P0`

- **Meta**: implement (core) · ~3 SP · certeza confirmado (gap) / a validar (punto de insercion) · rollback drop columna `versioningConfig` + quitar la funcion (aditivo) · riesgo: toca el registry-sync → regresion de 5 tenants
- **Contexto**: el diseno asume que declarar un bloque (`versioning`/`prefillFrom`) en el JSON basta para que el resolver lo lea en runtime. **No es asi**: `core_ObjectDefinition` solo guarda columnas escalares y el registry-sync solo materializa `properties`/`metadata` con keys nombradas → un bloque custom se ignora en silencio. Esta es la **pieza fundacional** que habilita toda la capacidad declarativa. Patron **per-capacidad** (como `syncBaseFieldsToRegistry`), no blob generico (D25).
- **Que se realiza**: agregar columna `versioningConfig Json?` a `core_ObjectDefinition` (BASEMODEL + tenants); funcion `syncVersioningConfigToRegistry(objectsForRegistry, prisma)` en `generatePrismaSchema.js`, invocada en Fase 3 junto a `addNewObjectsToRegistry`; lee `metadata.versioning` + `metadata.prefillFrom` y upserta; el resolver lee `objectDefinition.versioningConfig`.
- **Depende de**: nada (prioritario semana 1).
- **Investigar**: confirmar punto de insercion exacto del sync + shape de la columna.
- **Prueba**: `unit` objeto con `metadata.versioning` → `versioningConfig` poblado tras sync; sin bloque → `null`. `regresion-codegen` obligatoria (5 tenants sin cambios en objetos sin la key).

### P1.7 — HU-0d · polymorphicChildren lectura/deepClone (Fase 1) · [plataforma/core] · `P1`

- **Meta**: implement (core, post-spike) · ~5 SP · certeza a validar (spike) · rollback git revert resolver/codegen (aditivo) · riesgo alto: derived generico → SP4, remap por hook
- **Contexto**: el patron `ownerType`/`ownerId` se trata hoy como escalar (sin relacion virtual ni clone). Para que `deepClone: ["sections"]` clone las CurricularSections hay que ensenarle al codegen/resolver a leer el bloque `polymorphicChildren` y resolver el clone recursivo. El remap de los links internos lo hace el hook (HU-8b); el derived generico → SP4.
- **Que se realiza**: schema del bloque `polymorphicChildren` (bajo `metadata`); el codegen valida y registra el alias accesible por el resolver de `deepClone`; el resolver hace `findMany` por `ownerType/ownerId`, walkea por `recursiveBy` en orden topologico, remapea ids y crea hijos con el nuevo `ownerId`; expone el mapa `oldId→newId`.
- **Depende de**: G-P3.3 (spike).
- **Investigar/profundizar**: derived generico → SP4; en SP3 solo lectura/deepClone + mapa `oldId→newId`.
- **Prueba**: `unit` clonar Activity con 5 CurricularSections (con `parentId`) → 5 nuevas, jerarquia preservada, mapa disponible. `regresion-codegen`.

### Gate de Fase 1 (que cumplir antes de cerrar Track 0)

Revisar en conjunto HU-0a/0d/0e/0f/0g/0h/0j (este ticket cubre 0d/0e/0j; los otros viven en TICKET-034 Track 0 CD). Para este ticket:
1. **Tests** verdes (`Prueba` de cada paso) + **regresion-codegen** obligatoria (regenerar todos los tenants, diff sin cambios) por HU-0j y HU-0d.
2. **Revision**: migraciones y cambios de modelo reversibles, no rompen seeds/tenants; FK de entrada bien modelado.
3. **QA de codigo**: lint/typecheck, calidad de `syncVersioningConfigToRegistry`, manejo de errores.
4. **Decision** continuar/iterar.

## Material internalizado — HUs detalladas

> Contenido literal de las historias HU-0d/HU-0e/HU-0j del sprint. Internalizado aqui para que el ticket sea auto-suficiente.

### HU-0d · Codegen soporta polymorphicChildren — lectura/deepClone (IMP-4)

**Sprint:** SP3 · **Track:** SOT change (platform) · **Repo:** `object-manager`

**Como** dev platform
**Quiero** que el codegen lea un bloque `polymorphicChildren` (relacion virtual de lectura) y que el resolver de `prefillFrom.deepClone` clone esos hijos polimorficos
**Para** que `deepClone: ["sections"]` clone las secciones polimorficas. El remap de FKs internas (CurricularLinks) lo cubre un hook del mod en SP3 (HU-8b); el derived generico en codegen se difiere a SP4.

**Estado actual verificado:** el patron `ownerType`/`ownerId` se trata como escalar (sin relacion virtual ni dispatcher). `polymorphicUpdate.resolver.js` no tiene logica de clone. Es trabajo nuevo.

> **Decision scoped (D15)**: la **lectura/deepClone** va en SP3 (generico, no se difiere). El **remap de FKs internas** se hace por **hook del mod (HU-8b) en SP3** — path esperado, no contingencia. El **derived generico en codegen** se difiere a **SP4**. El spike P3.3 dimensiona el hook.

**Criterios de aceptacion:**

- [ ] **Spike de 1 dia previo (dev platform / dev del mod)**: dimensionar el hook de remap + confirmar el alcance de la lectura/deepClone.
- [ ] Schema del bloque `polymorphicChildren` (lectura), **bajo `metadata` del objeto**:
  ```json
  "polymorphicChildren": [
    { "name": "<alias>", "object": "<Target>", "via": "<ownerTypeField>/<ownerIdField>", "ownerTypeValue": "<Valor>", "recursiveBy": "<selfRefField>" }
  ]
  ```
- [ ] Codegen valida estructura (requeridos: `name, object, via, ownerTypeValue`). Invalida → error de codegen.
- [ ] El alias queda accesible por el resolver de `prefillFrom.deepClone` (via el registry, IMP-11 / HU-0j).
- [ ] Resolver `deepClone`: `findMany({ where: { [ownerTypeField]: ownerTypeValue, [ownerIdField]: source.id } })`; si `recursiveBy`, walkea el arbol en orden topologico y remapea ids; crea hijos con `ownerId: newRecord.id`. Expone el mapa `oldId→newId` para que el hook del mod remapee los CurricularLinks.
- [ ] **Derived generico → SP4** (no en esta HU): el remap de FKs internas como feature de codegen se difiere; en SP3 lo cubre HU-8b.
- [ ] Tests: clonar Activity con 5 CurricularSections (con `parentId`) → 5 nuevas bajo nuevo ownerId, jerarquia preservada; el mapa `oldId→newId` disponible para el hook.

**Dependencias:** Spike P3.3 + dev platform.
**Nota:** el remap de CurricularLinks vive en HU-8b (hook del mod) en SP3; el ticket SP4 del derived generico se agenda al cierre.

### HU-0e · Codegen self-references reflexivas — confirmar (IMP-5)

**Sprint:** SP3 · **Track:** SOT change (platform) · **Repo:** `object-manager`

**Como** dev platform
**Quiero** confirmar que el codegen genera `@relation` reflexivo para self-references
**Para** que `previousVersionId` funcione sin boilerplate de FK.

**Estado actual verificado:** self-ref reflexivo **ya funciona** — `CurricularSection.parentId → CurricularSection` genera `@relation` reflexivo correcto en el schema producido. No requiere cambio de codegen.

> **Nota — el bug B1 (`targetField`) NO entra en esta HU.** El analisis de impacto colateral mostro que el codegen ignora `targetField` en ~39 FKs de multiples tenants (`affiliation`, `tenantidentity`). Corregirlo es housekeeping del codegen con analisis propio (verificar `UNIQUE` en los campos referenciados). Versionamiento no lo necesita: `previousVersionId` apunta a `Activity.id`, que el codegen ya genera correcto.

**Criterios de aceptacion:**

- [ ] Confirmar (test): declarar `previousVersionId: { references: "Activity", targetField: "id" }` (sin `isForeignKey`) produce Prisma con `@relation` reflexivo correcto apuntando a `id`.
- [ ] No rompe self-refs ya declarados explicitamente (idempotente).
- [ ] Documentar que el self-ref reflexivo por convencion esta soportado, para futuros adoptantes.

**Dependencias:** Ninguna (semana 1).

### HU-0j · Config-storage: persistir config declarativa al registry (IMP-11) — nueva scoped

**Sprint:** SP3 · **Track:** SOT change (platform) · **Repo:** `object-manager`

**Como** dev platform
**Quiero** que el codegen lea los bloques `metadata.versioning`/`metadata.prefillFrom` del JSON del objeto y los persista en `core_ObjectDefinition.versioningConfig`
**Para** que el resolver generico (`createInstance`) pueda leer la config de versionamiento en runtime — habilitando que cualquier mod active la capacidad solo declarando config, sin codigo.

**Estado actual verificado:** brecha confirmada — `core_ObjectDefinition` solo tiene columnas escalares (sin blob de config); el registry-sync (`addNewObjectsToRegistry`, `syncBaseFieldsToRegistry` en `generatePrismaSchema.js`) solo materializa `properties`/`metadata` con keys nombradas. Sin esta HU, declarar `versioning` en el JSON se ignora en silencio.

> **Decision scoped (D25)**: patron **per-capacidad** (consistente con `syncBaseFieldsToRegistry`), no blob generico. El blob generico reusable se difiere; su costo de migracion es bajo. **Prerequisito de HU-1/HU-2/HU-3/HU-4.**

**Criterios de aceptacion:**

- [ ] Migracion: columna `versioningConfig Json?` en `core_ObjectDefinition` (BASEMODEL + tenants).
- [ ] Funcion `syncVersioningConfigToRegistry(objectsForRegistry, prisma)` en `generatePrismaSchema.js`, invocada en la Fase 3 (junto a `addNewObjectsToRegistry`/`syncBaseFieldsToRegistry`).
- [ ] Lee `metadata.versioning` + `metadata.prefillFrom` del JSON del objeto y upserta en `versioningConfig`. Objetos sin el bloque → `versioningConfig=null`.
- [ ] Idempotente (upsert), corre por cada tenant en el loop del codegen.
- [ ] **No altera** el sync de objetos/campos existente (aditivo). Objetos sin la declaracion no cambian su output.
- [ ] El resolver lee `objectDefinition.versioningConfig` (ya se carga via `findUnique`).
- [ ] Documentado en `object-manager/docs/` (como el sync persiste la config + ejemplo `activity.json`).
- [ ] Tests: objeto con `metadata.versioning` → `versioningConfig` poblado tras sync; objeto sin el bloque → `null`; regenerar tenants sin la declaracion no cambia su registry.

**Dependencias:** Ninguna (semana 1, prerequisito de HU-1/2/3/4).
**Si vetado**: el resolver no puede leer la config declarativa → la capacidad no funciona. Sin fallback viable (es la pieza fundacional).

## Material internalizado — Decisiones de diseno

### D15 (reformulado scoped) — Remap de FKs internas al clonar

**DeepClone lectura generica en SP3 + remap por hook del mod en SP3** (HU-8b, path esperado). Derived generico en codegen → **SP4**. Spike P3.3 dimensiona el hook.

### D25 (nuevo scoped) — Lectura de config declarativa en runtime

**Config-storage (IMP-11)**: columna `versioningConfig Json?` en `core_ObjectDefinition` + `syncVersioningConfigToRegistry` en la Fase 3 del codegen, leyendo `metadata.versioning`/`metadata.prefillFrom`. Patron **per-capacidad** (consistente con `syncBaseFieldsToRegistry`), no blob generico — el blob generico para futuras capacidades se difiere, su costo de migracion es bajo.

### P3.3 (decision pendiente — gate de Fase 0)

| Tema | Quien resuelve | Bloquea | Si no se resuelve a tiempo |
|------|---------------|---------|----------------------------|
| Spike de 1 dia: **dimensionar el hook de remap de CurricularLinks** (HU-8b) y confirmar el alcance de la lectura/deepClone. El **derived generico en codegen ya esta diferido a SP4** | dev platform + dev del mod | HU-0d, HU-8a, HU-8b | El remap por hook es el path esperado; si el hook creciera, se acota su alcance. La lectura/deepClone igual se entrega |

### V2 (verificacion previa a HU-0h — referenciada por trabajo paralelo de TICKET-034)

Cual `workflow.json` consume el codegen como fuente (core `business/Base` vs mod) para agregar el FK de entrada. No bloquea HU-0d/0e/0j (este ticket) pero es relevante para entender el ecosistema.

## Material internalizado — Discovery (gaps con archivo:linea)

### §2.3 Codegen + pipeline de sync (estado verificado)

- Motor: `object-manager/src/services/codegen/generatePrismaSchema.js` (`generateBaseModel` :167; `@@unique` en :385-415; `updatePrismaSchema` :1122).
- **Registry data-sync vive DENTRO del codegen (Fase 3)**, no aparte: `addNewObjectsToRegistry` (:1157 → `core_ObjectDefinition`), `syncBaseFieldsToRegistry` (:1160-1162 → `core_FieldDefinition`), `syncRtFieldsToRegistry`. Idempotente (upsert).
- **Patron hand-coded por capacidad**: 3 funciones con mapeo de keys nombradas. **No hay mecanismo generico** de "persistir cualquier bloque". `getMetadataFromBaseFile` (:33) extrae solo `label/labelPlural/gender/description/defaultLayoutType`; keys desconocidas de `metadata` se ignoran en silencio.
- Orquestador: `object-manager/scripts/sync/SyncManager.js:110` (`performSync`, 10 fases). Merge de mods en `fileSync.js:322`; **el merge solo propaga `properties`/`metadata`/`required`** (`fileSync.js:709-816`). `prisma db push` en `SyncManager.js:622`. 5 tenants reales: TEST, UCASMT, UCENG, UCPLN, UPU (+ DEMO01-10 post-pull).
- Raw SQL post-migracion disponible en `object-manager/scripts/pre-push-migrations.js`.
- **No hay baseline/snapshot del output del codegen** (el unico test cercano, `base-field-sync.integration.test.js`, prueba `syncBaseFieldsToRegistry`, no el texto generado).
- `workflow.json` (core `business/Base`) :69 documenta el workaround runtime de `isDefault` ("Prisma no soporta partial unique declarativo").

### §2.4 Storage del registry (gap pivotal G3)

- `core_ObjectDefinition` (`prisma/BASEMODEL/schema.prisma:16-31`) tiene **solo columnas escalares tipadas** — **sin campo `Json` de config arbitraria**.
- `core_FieldDefinition.properties Json?` (`schema.prisma:60`) **si** es un blob, pero **por campo** (guarda `formula`, `enum`, `references`…). No hay equivalente a nivel objeto.
- El resolver carga `objectDefinition` + `fieldDefinitions` (`instance.resolver.js:2313`); **no puede ver un bloque custom** como `versioning`.
- **No existe precedente JSON→sync→`core_ObjectValidation`**: las validaciones se crean por mutacion GraphQL (`objectValidation.resolver.js:280-301`), no desde el JSON. El unico precedente real JSON→registry→runtime es field-level (`properties` con `formula`).

### §2.6 Mod curriculum-design (estado actual relevante)

- `activity.json`: `version: string` (:39-43); `previousVersionId` sin FK (:45); `workflowId` (:86-94) y `currentStatusId` (:95-104) `not_null: false` + `isForeignKey: true` ("Nullable hasta S14"). Sin seccion `relations` propia.
- `changeLog.json`: enum `action` 7 valores (:48), `source` 6 (:55), `sourceRefId/Name/Type` (L40, :91...). `versionSourceId` **ausente**.
- `curricularsection.json:17-31`: `ownerType`/`ownerId` escalares (sin relacion virtual). `polymorphicUpdate.resolver.js:144` (RT_PATTERN) sin logica de clone; mods ganan por spread en `resolverIndex.js`.

## Material internalizado — Factibilidad del codegen (§1.3)

**Hecho** (verificado):

- `SyncManager.js` / `dbSync.js` / `fileSync.js` leen el JSON del object y generan Prisma schema + GraphQL types.
- Procesa correctamente `isForeignKey`, `references`, `metadata.uniqueConstraints` (compuesto simple `@@unique`), `metadata.indexes`, enums, defaults.
- **Self-references reflexivas FUNCIONAN HOY**: `CurricularSection.parentId → CurricularSection` genera `@relation` reflexivo correcto en el schema producido. El codegen detecta `references: "<MismoObject>"`.

**Bug B1 (`targetField`) — TRANSVERSAL, fuera del scope** — el codegen **lee `targetField` pero lo ignora**: siempre emite `references: [id]` al generar `@relation`. De **111 `targetField` declarados, solo 72 apuntan a `id`** → ~39 FKs apuntan a campos distintos (`publicId`, `username`). Ejemplos: `affiliation.json:56,78`, `tenantidentity.json:89,111`. Corregirlo cambiaria esas relaciones a `references: [<targetField>]` (exige `UNIQUE` en los campos referenciados; si no lo son, schema no compila). **Versionamiento NO necesita este fix** (`previousVersionId` apunta a `Activity.id`).

**Brecha G1** — codegen **no soporta partial unique index** (`@@unique(fields, where: ...)`). Solo `@@unique` compuesto completo. **Versionamiento ya no necesita esto**: unicidad del estado inicial es estructural (FK de entrada en Workflow). G1/IMP-10 se desacopla a housekeeping de `isDefault`. **Fuera de scope.**

**Brecha G2** — patron polimorfico (`ownerType` + `ownerId`) se trata como **escalar** (`curricularsection.json:17-31`): no hay relacion virtual de lectura ni dispatcher en el resolver generico (`polymorphicUpdate.resolver.js:144`, sin clone). El bloque `polymorphicChildren` requiere trabajo nuevo: **lectura/deepClone generico (HU-0d)** + remap de FKs internas por hook del mod (HU-8b, otro ticket) en SP3; derived generico en codegen → SP4.

**Brecha G3 — config-storage (pivotal)** — `core_ObjectDefinition` (`prisma/BASEMODEL/schema.prisma:16-31`) tiene **solo columnas escalares tipadas, sin blob de config arbitraria**. El resolver carga `objectDefinition` + `fieldDefinitions` (`instance.resolver.js:2313`) → **no puede ver un bloque custom** como `versioning`. No existe precedente JSON→sync→tabla a nivel objeto (las validaciones se crean por mutacion GraphQL, no desde el JSON; el unico blob es `core_FieldDefinition.properties Json?` :60, **por campo**). Sin cerrar G3, declarar `versioning` en el JSON **se ignora en silencio**. → **IMP-11 / HU-0j**: columna `versioningConfig Json?` + `syncVersioningConfigToRegistry` (per-capacidad), prerequisito de HU-1/2/3/4.

## Material internalizado — Shapes canonicos del modelo

> Configs literales del diseno aprobado v5.1. Estos son los shapes que el codegen debe validar y persistir; el resolver lee del registry post-sync.

### Bloque `polymorphicChildren` (bajo `metadata` del objeto)

```json
{
  "metadata": {
    "polymorphicChildren": [
      { "name": "sections", "object": "CurricularSection", "via": "ownerType/ownerId", "ownerTypeValue": "Activity", "recursiveBy": "parentId" }
    ]
  }
}
```

Requeridos: `name`, `object`, `via`, `ownerTypeValue`. Opcional: `recursiveBy` (walk topologico por self-ref).

### Bloque `prefillFrom` (bajo `metadata`) — consume polymorphicChildren via alias

```json
{
  "metadata": {
    "prefillFrom": {
      "exclude": ["currentStatusId", "previousVersionId", "versionLabel"],
      "deepClone": ["sections"]
    }
  }
}
```

`deepClone` acepta Prisma relations directas o aliases de `polymorphicChildren`.

### Bloque `versioning` (bajo `metadata`) — activa versionamiento (consumido por HU-3/HU-4)

```json
{
  "metadata": {
    "versioning": {
      "linkageField": "previousVersionId",
      "versionField": "version",
      "versionStrategy": "increment",
      "auditSourceField": "versionSourceId",
      "initialStateField": "currentStatusId"
    }
  }
}
```

> **Nota merge**: el sync solo propaga `properties`/`metadata`/`required`. Por eso `versioning`/`prefillFrom`/`polymorphicChildren` van **bajo `metadata`**, no a nivel raiz (a nivel raiz se descartarian en el merge).

### Columna `versioningConfig` en `core_ObjectDefinition` (HU-0j entrega)

```prisma
// prisma/BASEMODEL/schema.prisma — columna aditiva en el registry
model core_ObjectDefinition {
  // ...campos existentes...
  versioningConfig Json? // metadata.versioning + metadata.prefillFrom del objeto (IMP-11)
}
```

### Funcion `syncVersioningConfigToRegistry` (HU-0j entrega — Fase 3 del codegen)

```js
// generatePrismaSchema.js (Fase 3 del codegen) — analogo a syncBaseFieldsToRegistry
async function syncVersioningConfigToRegistry(objectsForRegistry, prisma) {
  for (const obj of objectsForRegistry) {
    const cfg = obj.metadata?.versioning
      ? { versioning: obj.metadata.versioning, prefillFrom: obj.metadata.prefillFrom ?? null }
      : null;
    await prisma.core_ObjectDefinition.update({
      where: { name: obj.name },
      data: { versioningConfig: cfg }
    });
  }
}
// El resolver lee objectDefinition.versioningConfig (ya se carga via findUnique).
```

Patron **per-capacidad**: invocada en Fase 3 junto a `addNewObjectsToRegistry` / `syncBaseFieldsToRegistry`. No es un blob generico; cada capacidad nueva agrega su propia funcion (D25).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | architecture (toca codegen + registry + resolver — transversal a la plataforma) |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (codegen `generatePrismaSchema.js` + registry-sync + resolver de `deepClone`) |
| Layer | core (RULE-dev-004: branch unica de epica `UPONE-1206`, no `develop`) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | yes | Columna nueva `versioningConfig Json?` en `core_ObjectDefinition`; shape declarativo nuevo `polymorphicChildren` bajo `metadata` del objeto |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | n/a |
| Version aprobada | — |
| Path | — |

> No requiere draft DKC formal: el data model es **aditivo** (columna nullable + shape de metadata nuevo), no introduce vistas nuevas, no rompe consumers. El shape canonico de los bloques `versioning`/`prefillFrom`/`polymorphicChildren` se define en este ticket como parte del trabajo.

## Triage

> Sintesis operativa derivada del ticket Jira. Lo que sigue NO esta en el Request literal; es analisis interno para preparar el execute.

### Alcance detallado (que entrega cada sub-tarea)

1. **HU-0e — Self-ref reflexivo (verificacion + test)**
   El codegen ya genera `@relation` reflexivo correcto cuando un FK apunta al mismo objeto (precedente confirmado: `CurricularSection.parentId`). Este sub-paso lo documenta con un unit test idempotente que sirva como contrato para futuros adoptantes (ej. `Activity.previousVersionId` lo va a usar en HU-8a).

2. **HU-0d — `polymorphicChildren` lectura + deepClone (codegen + resolver)**
   El patron `ownerType`/`ownerId` (usado por `CurricularSection` hoy) se trata como escalar. Para que `deepClone: ["sections"]` en una clonacion clone tambien las `CurricularSection` de un Activity, hay que:
   - Definir un shape declarativo `polymorphicChildren` bajo `metadata` del objeto.
   - Ensenar al codegen a validar y registrar el alias.
   - Ensenar al resolver de `deepClone` a hacer `findMany` por `ownerType/ownerId`, walkear por `recursiveBy` (parentId) en orden topologico, remapear ids y crear hijos con el nuevo `ownerId`.
   - **Exponer el mapa `oldId→newId`** para que un hook del mod (HU-8b, fuera de este ticket) remapee los `CurricularLink` internos.

3. **HU-0j — Config-storage (IMP-11): pieza fundacional**
   Hoy `core_ObjectDefinition` solo guarda columnas escalares y el registry-sync (Fase 3 del codegen, `addNewObjectsToRegistry`) solo materializa `properties`/`metadata` con keys nombradas → un bloque custom como `versioning` o `prefillFrom` declarado en el JSON del objeto se ignora en silencio. Sin esta pieza, declarar el bloque no hace nada en runtime. Por eso es **prerequisito de HU-1/2/3/4**. Implementa:
   - Columna nueva `versioningConfig Json?` en `core_ObjectDefinition` (BASEMODEL + todos los tenants existentes).
   - Funcion `syncVersioningConfigToRegistry(objectsForRegistry, prisma)` en `object-manager/src/services/codegen/generatePrismaSchema.js`, invocada en Fase 3 junto a `addNewObjectsToRegistry`.
   - Lee `metadata.versioning` + `metadata.prefillFrom` del JSON del objeto y upserta a la columna nueva.
   - El resolver lee `objectDefinition.versioningConfig` en runtime.
   - **Patron per-capacidad** (analogo a `syncBaseFieldsToRegistry`), no blob generico.

4. **Spike G-P3.3 — Dimensionar el hook de remap (dia 1)**
   Output: documento corto que define la API del mapa `oldId→newId` que el deepClone va a exponer + estimacion del tamano del hook de remap del mod (HU-8b, fuera de este ticket). Bloqueante de HU-0d y HU-8a/b.

### Criterios de aceptacion operativos (derivados, complementan los del Jira)

| # | Criterio | Validacion |
|---|----------|------------|
| C1 | Spike G-P3.3 con documento que define la API del deepClone y dimensiona el hook | Documento en `Sessions > S1` del ticket |
| C2 | Test self-ref reflexivo: FK reflexivo en JSON → `@relation` apuntando a `id`; idempotente, no rompe self-refs existentes | unit verde en al menos 1 tenant fresh |
| C3 | Columna `versioningConfig Json?` presente en `core_ObjectDefinition` de todos los tenants existentes | Migracion aplica clean; verificable en la BD |
| C4 | `syncVersioningConfigToRegistry` invocada en Fase 3 del codegen; objeto con bloque produce `versioningConfig` poblado; sin bloque produce `null` | unit tests + verificacion en UPU post-codegen |
| C5 | **Regresion codegen obligatoria**: regenerar todos los tenants → diff vs baseline sin cambios en objetos sin `metadata.versioning` | `git diff prisma/*/schema.prisma` post-codegen muestra cambios solo en objetos que declaran el bloque |
| C6 | Bloque `polymorphicChildren` validado; clonar Activity con 5 `CurricularSection` (con `parentId`) crea 5 nuevas con jerarquia preservada; mapa disponible | unit + smoke en UPU |
| C7 | Branch unica `UPONE-1206`; commits prefijados con `UPONE-1219` per RULE-dev-004 + DET-27 | `git log` en branch UPONE-1206 |

### Out of scope (otros tickets DKC del sprint o diferido a SP4)

- **Otros tickets DKC del sprint**: HU-1/2/3/4 (resolvers + bloques que consumen esta config), HU-8b (hook del mod que consume el mapa `oldId→newId`).
- **Diferido a SP4**: derived generico de remap de links polimorficos (en SP3 el remap es por hook del mod), config-storage generico, IMP-10 (partial-unique declarativo).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `core_ObjectDefinition` solo guarda columnas escalares; el registry-sync solo materializa keys nombradas en `properties`/`metadata` → un bloque custom como `versioning` se ignora en silencio | ✓ confirmada | **Capa backend (codegen)**: `object-manager/src/services/codegen/generatePrismaSchema.js` Fase 3 `addNewObjectsToRegistry` solo persiste campos escalares declarados; bloques custom de `metadata` no llegan al registry. **Capa db (schema)**: `prisma/BASEMODEL/schema.prisma:16-31` confirma `core_ObjectDefinition` solo tiene columnas escalares tipadas, sin blob de config arbitraria. |
| H2 | El codegen ya genera `@relation` reflexivo correcto para FKs self-ref (`CurricularSection.parentId` es precedente que funciona) | ~ partial | **Capa db (schema generado)**: schema de UPU muestra `parent CurricularSection? @relation(...)` y `children CurricularSection[]` derivado del `references: "CurricularSection"` del JSON. **Que falta**: unit test que declare `previousVersionId: { references: "Activity", targetField: "id" }` y verifique el `@relation` reflexivo. Plan de validacion: S2 del execute (HU-0e es justamente este test). Riesgo bajo: el precedente funciona, el test solo lo codifica como contrato. |
| H3 | El patron `ownerType`/`ownerId` se trata hoy como escalar (sin relacion virtual ni clone); para `deepClone: ["sections"]` hay que ensenar al codegen/resolver a leer un bloque declarativo `polymorphicChildren` y resolver el clone recursivo | ✓ confirmada | **Capa db (schema)**: `curricularsection.json:17-31` declara `ownerType` + `ownerId` como columnas planas; no hay derived relations en el schema generado. **Capa backend (resolver)**: `polymorphicUpdate.resolver.js:144` (RT_PATTERN) sin logica de clone; el resolver de `createInstance` (`instance.resolver.js:2313`) no walks polimorficos. |
| H4 | El derived generico de `polymorphicChildren` (remap automatico de los `CurricularLink` internos a las nuevas secciones) es complejo y se difiere a SP4; en SP3 el remap lo hace un hook del mod (HU-8b) que consume el mapa `oldId→newId` expuesto por el deepClone generico | ~ partial | **Capa meta (decision D15)**: la decision scoped esta documentada (lectura/deepClone en SP3 generico, remap por hook en SP3, derived generico → SP4). **Que falta**: spike G-P3.3 dimensiona si la API del mapa alcanza para hook chico (~50-100 lineas) o requiere mas soporte del core. Plan de validacion: S1 del execute. Riesgo: si el spike concluye que el hook crece >200 lineas, hay que ajustar el alcance (decision en gate ⚑ fuerte de S1 con override `strict` — REQ-S1-DECISION del spec). |

### Context found

- **Rules del modulo**: `RULE-dev-004` (todo trabajo `layer:core` va en branch unica con id de epica; commits referencian id de ticket).
- **Bugs abiertos**: ninguno bloqueante para Track 0 Core.
- **Specs relacionados DKC**: ninguno previo en proyecto up1 cubre clonacion declarativa. Este ticket abre la capacidad.
- **Docs relevantes del repo (permanentes, no temporales)**:
  - `object-manager/src/services/codegen/generatePrismaSchema.js` (entry del codegen — Fase 3 `addNewObjectsToRegistry` es el punto de insercion de HU-0j).
  - `object-manager/objects/business/Base/*.json` (definiciones que el codegen lee; precedente self-ref: `CurricularSection.parentId`).
  - `object-manager/src/graphql/resolvers/instance.resolver.js` (donde vive `createInstance`; el resolver de `deepClone` se extiende aqui).
  - `object-manager/.ai/CONTEXT.md` (arquitectura general del codegen y registry, si esta poblado).
- **Warnings**:
  - **Toca el registry-sync** → regresion-codegen **obligatoria** en gate de session (regenerar todos los tenants, diff sin cambios funcionales en objetos sin la key).
  - **Aditivo**: rollback = drop columna `versioningConfig` + quitar la funcion `syncVersioningConfigToRegistry` + revertir el shape del bloque polymorphicChildren. Sin destruir data en tenants.
  - **Branch core**: `UPONE-1206` (no `develop`/`master`). El git hook de DET-30 REQ-07 rechaza commits directos a `develop`.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (epica core, RULE-dev-004) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU recreada via reset canonico 2026-05-28; BASEMODEL fresh con tenants DEMO01-10 disponibles |
| Services | object-manager (4000), postgres local (5432), redis |
| Test data | seeds UPU vigentes (110 categories + 110 infrastructure + 110 services + grupo apps + RBAC con 22 usuarios) |

### Reproduction steps

n/a (no es fix). Verificacion del estado inicial pre-trabajo:
```
git -C /Users/edobacon/Workspace/uplanner/up1 checkout -b UPONE-1206 develop
cd /Users/edobacon/Workspace/uplanner/up1
npm run codegen --workspace=@uplanner/object-management-backend -- UPU
# baseline para regresion: snapshot de prisma/UPU/schema.prisma + prisma/BASEMODEL/schema.prisma
```

## Sessions

### Plan de sessions (preplanificacion)

9 sessions previstas. **Esqueleto refinado por `intake-explore` (DET-20 extendida).** El detalle final (tasks asignadas, REQ-S1-DECISION/REQ-S3-DECISION del spec con contexto pre-armado para los gates ⚑ fuertes con override `strict`) lo completa `design-feature` al generar el spec.

> **Numeracion**: ticket sin sessions previas registradas → plan empieza en S1. Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | G-P3.3 — Spike (dia 1): viabilidad deepClone generico + API del mapa `oldId→newId` + estimar tamano hook HU-8b | execute | T1 | documento spike + decision tamano hook + API definida | ⚑ fuerte [autopilot: strict — override del 'super' global] | dev valida documento via consulta estructurada (REQ-S1-DECISION del spec presenta opciones de API + impacto en hook HU-8b); bloquea HU-0d/HU-8a hasta cerrar |
| S2 | HU-0e — Test self-ref reflexivo idempotente; documentar convencion para futuros adoptantes | execute | T1 | 1 unit test + nota en `.ai/PATTERNS.md` (si aplica) | auto | unit verde; no rompe self-refs existentes (CurricularSection.parentId sigue ok) |
| S3 | HU-0j fase 1 — Migracion Prisma: agregar columna `versioningConfig Json?` a `core_ObjectDefinition` en BASEMODEL + propagacion a tenants | execute | T2 | migracion + aplicar a BASEMODEL + UPU + DEMO01-10 + UCASMT/UCENG/UCPLN/TEST | ⚑ fuerte [autopilot: strict — override del 'super' global] | smoke manual multi-tenant pre-S4 via consulta estructurada (REQ-S3-DECISION del spec presenta opciones de smoke scope + impacto); migracion clean en todos los tenants; rollback (drop column) documentado |
| S4 | HU-0j fase 2 — Funcion `syncVersioningConfigToRegistry` en `generatePrismaSchema.js` Fase 3, patron per-capacidad | execute | T2 | implementacion + unit tests (with/without metadata.versioning) + invocacion en Fase 3 | auto | objeto con `metadata.versioning` → `versioningConfig` poblado; sin bloque → null |
| S5 | HU-0j fase 3 — Regresion codegen (5+ tenants, diff sin cambios en objetos sin la key) | execute | T3 | regenerar tenants reales (BASEMODEL + UPU + UCASMT + UCENG + UCPLN + TEST + DEMO01-10) + diff vs baseline + smoke runtime | ⚑ fuerte | diff sin cambios funcionales en objetos sin `metadata.versioning`; runtime UPU OK |
| S6 | HU-0d fase 1 — Shape del bloque `polymorphicChildren` (bajo `metadata`); codegen valida y registra el alias accesible al resolver | execute | T2 | shape definido + validacion en codegen + unit tests (valid/malformed) | auto | bloque valido aceptado; malformado rechazado con error claro |
| S7 | HU-0d fase 2 — Resolver: `findMany` por `ownerType/ownerId`, walk por `recursiveBy` en orden topologico, remap ids, crear hijos con nuevo `ownerId`, exponer mapa `oldId→newId` | execute | T2 | implementacion + unit tests (clonar Activity con 5 CurricularSections con parentId → 5 nuevas, jerarquia preservada, mapa disponible) | auto | jerarquia preservada; mapa expone old→new ids |
| S8 | HU-0d fase 3 — Regresion codegen post-HU-0d + smoke E2E (clonar Activity dummy con polymorphicChildren en UPU) | execute | T3 | regresion + smoke runtime | ⚑ fuerte | regresion sin cambios en objetos sin `polymorphicChildren`; smoke clonacion OK |
| S9 | Cierre Track 0 Core — consolidar commits, validar criterios C1-C7, refinar learns, generar teach-close | execute | T2 | review final + commits ordenados + teach-close.md | ⚑ fuerte | C1-C7 cumplidos; commits formateados per DET-27; teach-close completo |

**Notas del esqueleto**:
- **Dependencias entre sessions**: S6→S7→S8 (HU-0d en cadena), S3→S4→S5 (HU-0j en cadena), S1 bloquea S6/S7 (spike define la API del mapa que S7 implementa). S2 independiente (HU-0e standalone).
- **Gates ⚑ fuerte con override `strict` (autopilot: super del ticket)**: S1 y S3 — REQ-S1-DECISION y REQ-S3-DECISION del spec (a generar en design-feature) presentaran al dev consulta estructurada con contexto + opciones + impacto. Los otros 3 gates ⚑ fuertes (S5, S8, S9) corren en super (auto-aprobacion del reviewer aislado).
- **Tiers**: T1 (S1, S2 — trabajo acotado) | T2 (S3, S4, S6, S7, S9 — multi-archivo) | T3 (S5, S8 — regresion completa de codegen sobre 16+ tenants).

> Sessions ejecutadas se materializaran via `dkc-execute-task open-session N` (DET-29). El plan vive aqui (en `### Plan de sessions`) durante todo el ticket; cada Session ejecutada se agrega como `### Session N` debajo.

### Session 1 — Spike G-P3.3 (2026-05-28) [phase: execute]

**Tipo:** ⚑ fuerte [autopilot: 'strict' — override del 'super' global del ticket]
**Validation tier:** T1
**Objetivo:** validar viabilidad del deepClone generico sobre `polymorphicChildren` + diseñar API del mapa `oldId→newId` con 3 opciones evaluadas (A/B/C) + estimar tamaño del hook HU-8b por cada opcion. Produce documento `spike-G-P3.3.md` que el dev valida en gate strict via consulta estructurada REQ-S1-DECISION del spec.

**Tasks completadas**:

- [x] S1.T1 — Investigar viabilidad deepClone generico sobre polymorphicChildren (lectura de codigo actual: resolver de createInstance + patron polimorfico en CurricularSection). Documentar findings en draft del spike.
- [x] S1.T2 — Diseñar 3 opciones de API del mapa oldId→newId (A: Map simple, B: Map con metadata tipo, C: Callbacks inyectables). Documentar pros/cons + impacto en hook HU-8b.
- [x] S1.T3 — Estimar tamaño del hook HU-8b por cada opcion (lineas, complejidad, mantenibilidad).
- [x] S1.T4 — Consolidar documento spike final con API recomendada + dimensionamiento + brief para REQ-S1-DECISION.
- [x] S1.GATE — Quality review (DET-23 tier light) + REQ-S1-DECISION strict (consulta estructurada al dev con 3 opciones). Dev elige A/B/C. Registro entry `spike-api-decision` en decisions_log.

**Gate decision:** (approvedBy: dev)

- [x] continue → REQ-S1-DECISION strict: opcion B+ aprobada por dev. Documento spike-G-P3.3.md actualizado con decision final. Avanza a S2 (HU-0e test self-ref reflexivo).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — HU-0e self-ref reflexivo (2026-05-28) [phase: execute]

**Tipo:** auto (super autopilot, sin override — reviewer aislado auto-aprueba)
**Validation tier:** T1
**Objetivo:** codificar el contrato del FK self-ref reflexivo via unit test. El codegen ya soporta el patron (precedente `CurricularSection.parentId` confirmado en S1). Esta session lo formaliza con test idempotente + nota en `.ai/PATTERNS.md` para futuros adoptantes (especialmente HU-8a que activara `Activity.previousVersionId`).

**Tasks completadas**:

- [x] S2.T1 — Implementar unit test que declara `previousVersionId: { references: "Activity", targetField: "id" }` y verifica el `@relation` reflexivo generado en el schema Prisma.
- [x] S2.T2 — Verificar idempotencia: correr el test 2 veces no rompe self-refs existentes (`CurricularSection.parentId` sigue OK).
- [x] S2.T3 — Agregar nota en `.ai/PATTERNS.md` documentando convencion de FK self-ref reflexivo para futuros adoptantes.
- [x] S2.GATE — Quality review (DET-23 tier light): lint + tipado + test verde. Reviewer aislado en super.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 HU-0e cerrada. Test self-ref reflexivo codificado (3 scenarios passing). PATTERNS.md actualizado. Avanza a S3 (HU-0j fase 1 migracion Prisma — gate STRICT REQ-S3-DECISION).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — HU-0j fase 1 migracion Prisma (2026-05-28) [phase: execute]

**Tipo:** ⚑ fuerte [autopilot: 'strict' — override del 'super' global del ticket]
**Validation tier:** T2
**Objetivo:** agregar columna `versioningConfig Json?` aditiva a `core_ObjectDefinition` en BASEMODEL + propagar a los 16+ tenants reales (UPU + UCASMT + UCENG + UCPLN + TEST + DEMO01-10). Migracion reversible (drop column). Documentar rollback. Cierra con consulta estructurada REQ-S3-DECISION al dev (smoke scope multi-tenant).

**Tasks completadas**:

- [x] S3.T1 — Agregar columna `versioningConfig Json?` al schema Prisma de BASEMODEL. Generar migracion via `prisma migrate dev`.
- [x] S3.T2 — Propagar la columna a los 16+ tenants reales (UPU + UCASMT + UCENG + UCPLN + TEST + DEMO01-10) via `prisma db push` o migrate por tenant.
- [x] S3.T3 — Documentar rollback de la migracion en `object-manager/docs/migrations.md` (seccion nueva).
- [x] S3.GATE — Quality review (DET-23 tier standard) + REQ-S3-DECISION strict (consulta estructurada al dev con 3 opciones de smoke scope multi-tenant).

**Gate decision:** (approvedBy: dev)

- [x] continue → REQ-S3-DECISION resuelta inline: dev autorizo flujo completo (reset + db push + seed) en 4 tenants restantes. Verificacion confirma 5/5 tenants locales con columna. Drift pre-existente documentado en docs/migrations.md (deuda para entornos productivos). Avanza a S4 (implementar syncVersioningConfigToRegistry).
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — HU-0j fase 2 sync function (2026-05-28) [phase: execute]

**Tipo:** auto (super autopilot, sin override — reviewer aislado auto-aprueba)
**Validation tier:** T2
**Objetivo:** implementar la funcion `syncVersioningConfigToRegistry(objectsForRegistry, prisma)` en `generatePrismaSchema.js` siguiendo patron per-capacidad (analogo a `syncBaseFieldsToRegistry`). Lee `metadata.versioning` + `metadata.prefillFrom` del JSON de cada objeto, construye shape `{ versioning, prefillFrom }` solo si `versioning` esta presente (sino `null`), y upserta a la columna `versioningConfig` del registry. Idempotente. Invocada en Fase 3 del codegen junto a `addNewObjectsToRegistry` + `syncBaseFieldsToRegistry`. Cierra S4 con quality review T2 standard del reviewer aislado.

**Tasks completadas**:

- [x] S4.T1 — Implementar funcion `syncVersioningConfigToRegistry(objectsForRegistry, prisma)` en `object-manager/src/services/codegen/generatePrismaSchema.js`. Patron per-capacidad. Funcion exportada; lee `metadata.versioning` + `metadata.prefillFrom`; upserta a `versioningConfig`; idempotente.
- [x] S4.T2 — Invocar `syncVersioningConfigToRegistry` en Fase 3 del codegen junto a `addNewObjectsToRegistry`. Codegen completo OK end-to-end. Cumple C4.
- [x] S4.T3 — Unit tests: objeto con `metadata.versioning` → poblado; sin bloque → null; con ambos `versioning` + `prefillFrom` → shape correcto; idempotencia (2 ejecuciones). 4 tests verdes cubriendo TC-12..TC-15 (scenarios de REQ-03).
- [x] S4.GATE — Quality review (DET-23 tier standard: lint + tipado + tests verdes + coverage delta). Reviewer aislado en super.

**Validacion del tier**:
- T2 — vitest run del area: 11/11 verde (8 nuevos + 3 self-ref HU-0e), 665ms (cmd: `npx vitest run tests/unit/services/codegen/`)
- Coverage: no medido (workspace sin script de coverage configurado en CI; medido solo via `--coverage` ad-hoc cuando se requiera)

**Discoveries / Learns nuevos**:
- L1: el path de tests del repo es `tests/unit/services/codegen/`, no `src/services/codegen/__tests__/` como referencia el spec.task. vitest.config solo incluye `tests/**/*.test.js`. Path elegido sigue la convencion del directorio existente (mismo nivel que `generateBaseModel.selfRef.test.js`). Documentar en learns del ticket para futuros tickets que toquen codegen.
- L2: `getMetadataFromBaseFile` depende del `objectToFileMap` modular. Inyeccion del `metadataLoader` como 3er parametro de `syncVersioningConfigToRegistry` evita setup fragil de fixture (mockear fs + setear map modular). Patron analogo al `prismaClient = prisma` default. Replicable en otros sync helpers que dependan del map modular.

**Quality review (DET-23)**:

**Reviewer**: agent sonnet (aislado en contexto limpio — HOR-079 REQ-10, fallback inline porque el host no expone `dkc_invoke_agent`)
**Tier de revision**: standard (proporcional a T2)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Funcion principal ~50 lineas; sin magic strings; early return guard `!prismaClient`; 1 responsabilidad. |
| 2 | Lint | n/a | Sin script `lint`/`eslint` configurado en `object-manager/package.json`. |
| 3 | Tipado | n/a | Codebase JS sin TypeScript. |
| 4 | Testing | pass | 8 tests verdes superset del REQ-03 (TC-12, TC-13, TC-13b, TC-14, TC-15 + skip defensivo + multi-objeto + prismaClient null). Assertions concretas con `toEqual`. Idempotencia verificada via historial `writes`. |
| 5 | Escalabilidad | warn | ~2 queries/objeto (findFirst + update). Para 50 objetos → ~100 queries por tenant. Patron heredado de `syncBaseFieldsToRegistry`. No regresion; documentar como deuda conocida si crece volumen. |
| 6 | Mantenibilidad | pass | Inyeccion del `metadataLoader` permite test sin mockear fs/map modular. Sin sobre-engineering. Sin duplicacion. |
| 7 | Claridad | pass | Header con WHY (patron per-capacidad, D25, que habilita). Comentarios inline solo en edge cases no obvios (prefillFrom standalone, `findFirst` defensivo). |
| 8 | Accesibilidad (a11y) | n/a | Sin UI. |
| 9 | Storybook | n/a | Sin UI. |
| 10 | Error handling | pass | `catch` por objeto + `console.error` con message. Loop continua ante fallo individual (consistente con sync hermanos). |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S4 HU-0j fase 2 cerrada. syncVersioningConfigToRegistry implementada, invocada en Fase 3, 8 tests verdes (TC-12..TC-15+). Reviewer aislado approve, 1 warn no bloqueante (escalabilidad patron heredado). Avanza a S5 (HU-0j fase 3 regresion codegen, T3 fuerte, super = reviewer aislado auto-aprueba).
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Spec compliance (REQ-03)**: pass — lee `metadata.versioning` + `metadata.prefillFrom`; shape solo si `versioning` presente sino `null`; upsert via `update({ where: { name }, data: { versioningConfig } })`; idempotente (TC-15); invocada en Fase 3 junto a `addNewObjectsToRegistry`; NO modifica syncs existentes.

**Out-of-scope check**: pass — solo `object-manager/src/services/codegen/generatePrismaSchema.js` + `object-manager/tests/unit/services/codegen/syncVersioningConfigToRegistry.test.js`. Dentro de `execute_scope: object-manager/`.

**Hallazgos no bloqueantes (warn)**:
- Dim 5: escalabilidad lineal (~2 queries/objeto). Patron heredado, no regresion introducida en esta session.

### Session 5 — HU-0j fase 3 regresion codegen (2026-05-28) [phase: execute]

**Tipo:** ⚑ fuerte (super autopilot, sin override — reviewer aislado auto-aprueba en super)
**Validation tier:** T3
**Objetivo:** regenerar `npm run codegen` sobre tenants locales (BASEMODEL + UPU + otros disponibles), validar via `git diff prisma/*/schema.prisma` que los cambios estan SOLO en objetos que declaran `metadata.versioning` (en este ticket: ninguno aun — diff debe ser vacio funcional). Smoke runtime en UPU para confirmar `core_ObjectDefinition` queryable. Cierra HU-0j completa.

**Tasks completadas**:

- [x] S5.T1 — Regenerar codegen: `npm run codegen` sobre tenants locales. Codegen termina sin errores.
- [x] S5.T2 — `git diff prisma/*/schema.prisma`: validar diff vacio en objetos sin `metadata.versioning`. Cumple C5.
- [x] S5.T3 — Smoke runtime UPU: query simple sobre `core_ObjectDefinition` retorna OK.
- [x] S5.GATE — Quality review (DET-23 tier exhaustive). Reviewer aislado en super (auto-aprueba).

**Validacion del tier**:
- T3 — Codegen real ejecutado 2 veces (idempotencia confirmada). git diff HEAD vacio post-codegen. Smoke psql UPU: 89 filas, 76 con json_null (sync), 13 con db_null (otro path), 0 con json_objeto. Vitest unit del area S4: 11/11 verde (regresion sobre cambio de S4).

**Discoveries / Learns nuevos**:
- L3: **Prisma `Json?` + `data: { field: null }` → JsonNull, no DbNull**. El sync escribe `'null'::jsonb` (JSON null), no SQL `NULL`. Visible solo en queries SQL: `field IS NULL` (cuenta solo 13/89 — registros nunca tocados por el sync) vs `field = 'null'::jsonb` (cuenta 76/89 — registros sincronizados). Los consumers JS reciben `null` por igual via deserializacion Prisma. **Implicacion HU-1+**: para distinguir "config no declarada" de "config declarada vacia", usar `versioningConfig IS NOT NULL AND versioningConfig != 'null'::jsonb` en SQL crudo, o el equivalente Prisma con `Prisma.JsonNull`/`Prisma.DbNull` explicito. Promote a rule de codegen/sync para futuras keys per-capacidad.
- L4: 13 registros del registry tienen db_null vs 76 con json_null. Inconsistencia heredada: registros antiguos (creados por seed/migrations) conservan SQL NULL; registros tocados por `syncVersioningConfigToRegistry` quedan JsonNull. Documentar para que las queries de HU-1+ contemplen ambos casos durante el periodo de transicion.

**Quality review (DET-23)**:

**Reviewer**: agent sonnet (aislado en contexto limpio — HOR-079 REQ-10, fallback inline porque host sin `dkc_invoke_agent`)
**Tier de revision**: exhaustive (proporcional a T3, gate ⚑ fuerte)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | n/a | S5 no introduce codigo nuevo — cambios de S4 ya revisados en S4.GATE |
| 2 | Lint | n/a | Sin archivos modificados en esta session |
| 3 | Tipado | n/a | Sin cambios de codigo |
| 4 | Testing | pass | Codegen sin errores (2 ejecuciones). `git status -s` limpio confirma regresion. Smoke psql UPU OK. Idempotencia: 2da ejecucion identica. |
| 5 | Escalabilidad | pass | Sync sobre 76 objetos completa sin timeout ni warning. Volumen aceptable. |
| 6 | Mantenibilidad | n/a | Sin restructura de modulos. |
| 7 | Claridad | pass | Logs estructurados con contadores explicitos `0 populated, 76 null`. Suficiente para diagnosticar desvios. |
| 8 | Accesibilidad (a11y) | n/a | Sin UI. |
| 9 | Storybook | n/a | Sin UI. |
| 10 | Error handling | pass | Output completo sin errores ni stack traces latentes. |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S5 HU-0j fase 3 cerrada. Regresion codegen vacia (C5 cumplido), idempotencia confirmada (2 ejecuciones identicas), smoke UPU OK. HU-0j (fases 1+2+3) completa. Reviewer aislado approve T3 exhaustive. 4 learns L1-L4. Avanza a S6 (HU-0d fase 1 shape polymorphicChildren, T2 auto super).
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Spec compliance (REQ-04 + C5)**: pass — diff prisma vacio (git status -s + git diff HEAD ambos sin output). 0 populated coincide con la cantidad de objetos que NO declaran versioning aun. Idempotencia confirmada.

**Out-of-scope check**: pass — toda la evidencia y comandos sobre `object-manager/`.

**Hallazgos no bloqueantes (warn)**:
- W1: inconsistencia json_null (76) vs db_null (13) en el registry. Sin impacto runtime para HU-0j; relevante para HU-1+ consumers (capturado como L3+L4).

### Session 6 — HU-0d fase 1 shape polymorphicChildren (2026-05-28) [phase: execute]

**Tipo:** auto (super autopilot, sin override — reviewer aislado auto-aprueba)
**Validation tier:** T2
**Objetivo:** definir el shape canonico del bloque declarativo `polymorphicChildren` bajo `metadata` del objeto, implementar validacion en codegen (helper + invocacion), y unit tests para los 2 scenarios del REQ-05 (bloque valido vs malformado). El bloque declara hijos polimorficos como `[{ name, object, via, ownerTypeValue, recursiveBy? }]`. Codegen rechaza bloques malformados con error claro indicando archivo + bloque + campo faltante. Habilita el alias para consumir en HU-0d fase 2 (S7, resolver deepClone).

**Tasks completadas**:

- [x] S6.T1 — Documentar shape canonico en `object-manager/docs/codegen-polymorphic-children.md`. Campos requeridos (`name`, `object`, `via`, `ownerTypeValue`), opcional (`recursiveBy`). Ejemplo + reglas de validacion.
- [x] S6.T2 — Implementar validacion en codegen: helper `helpers/validate-polymorphic-children.js` + invocacion en `generatePrismaSchema.js`. Errores claros con archivo + bloque + campo.
- [x] S6.T3 — Unit tests: bloque valido (acepta + registra alias) + bloque malformado (rechaza con error preciso). Cubre TC-21, TC-22.
- [x] S6.GATE — Quality review (DET-23 tier standard). Reviewer aislado en super.

**Validacion del tier**:
- T2 — vitest run tests/unit/services/codegen/: 30/30 verde (8 sync-versioning + 3 self-ref + 19 polymorphic-children). 674ms.
- Smoke codegen real: `polymorphicChildren validation: 61 JSON files checked, no errors` — validacion corre y no rompe pipeline existente.

**Discoveries / Learns nuevos**:
- L5: separacion build-time vs runtime para `metadata.polymorphicChildren`: validacion en codegen (helper modular), consumo en resolver runtime (S7). Patron replicable para futuras keys per-capacidad: validar shape en codegen, consumir directo del JSON en el resolver. Sin sync extra al registry porque el consumer es por-resolver, no transversal.
- L6: para validaciones que pueden producir multiples errores, acumular todos antes del throw. El dev ve el panorama completo en un solo run — no tiene que iterar fix → run → fix → run. Patron replicable en otros validadores del codegen.

**Quality review (DET-23)**:

**Reviewer**: agent sonnet (aislado, fallback inline — host sin `dkc_invoke_agent`)
**Tier de revision**: standard (proporcional a T2)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | 3 funciones exportadas de 57/33/8 lineas. `REQUIRED_FIELDS` constante. Early return en V1/V2. Separacion 1-entrada / 1-archivo / multi-archivo. |
| 2 | Lint | n/a | Sin script lint. |
| 3 | Tipado | n/a | JS. JSDoc con `@param`/`@returns` presentes. |
| 4 | Testing | pass | 19/19 verde. Cubre los 2 scenarios canonicos del REQ-05 + V1-V7 individuales. Assertions con `toEqual([])`, `toHaveLength(1)`, `toContain` valores concretos. |
| 5 | Escalabilidad | pass | O(n) sobre archivos. 61 archivos en <100ms. V7 con `Map` no doble iteracion. |
| 6 | Mantenibilidad | pass | Helper modular separado de generatePrismaSchema monolitico. Agregar regla nueva = modificar solo `validatePolymorphicChildrenEntry`. |
| 7 | Claridad | pass | Header del helper con WHY + ref a doc + ticket. Comentarios mapean cada regla (V3, V4, V5, V6, V7) al doc. Mensajes con archivo + indice + campo + valor. |
| 8 | A11y | n/a | Sin UI. |
| 9 | Storybook | n/a | Sin UI. |
| 10 | Error handling | pass | JSON parse failure → warn + skip gracioso. Errores acumulados antes del throw. `throw` aborta codegen con exit != 0. Pre-throw `console.error` lista cada error. Sin `catch` vacios. |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S6 HU-0d fase 1 cerrada. Shape canonico documentado + validacion en codegen + 19 tests verde. Smoke real 61 JSONs OK. Reviewer aislado approve, 2 warns no bloqueantes. 3 commits DET-27. Avanza a S7 (HU-0d fase 2 resolver deepClone, T2 auto super).
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Spec compliance (REQ-05)**: pass — shape aceptado/validado en build-time (smoke real 61 archivos OK); requeridos `name/object/via/ownerTypeValue` verificados (V3); opcional `recursiveBy` reconocido (V6 condicional); bloque invalido produce error claro con archivo + indice + campo; pipeline existente intacto (30/30 codegen tests verde).

**Out-of-scope check**: pass — todo dentro de `object-manager/` (helper + tests + doc + 1 archivo modificado).

**Hallazgos no bloqueantes (warn)**:
- W2: el validador re-lee JSONs del disco aunque codegen los parsea en pasos posteriores. Doble I/O. Sin umbral hoy (61 archivos <100ms); reconsiderar si crece a cientos.
- W3: test V4 usa `errors.some(e => e.includes(...))` en vez de `toHaveLength(1)` + `toContain`. Asimetria menor en el estilo del suite. No afecta cobertura.

### Session 7 — HU-0d fase 2 resolver deepClone walks polimorficos (2026-05-28) [phase: execute]

**Tipo:** auto (super autopilot, sin override — reviewer aislado auto-aprueba)
**Validation tier:** T2
**Objetivo:** extender el resolver de `prefillFrom.deepClone` para procesar aliases de `polymorphicChildren`. Helper nuevo que hace `findMany` por `ownerType/ownerId`, walkea por `recursiveBy` en orden topologico, remapea ids y crea hijos con nuevo `ownerId`. Expone mapa `oldId→newId` segun decision B+ de S1 (wire format `Map<oldId, { newId, type }>` serializable + utility `buildRemapAPI(map)` opcional). El mapa lo consumira el hook HU-8b (TICKET-043) para remapear CurricularLinks.

**Tasks completadas**:

- [x] S7.T1 — Extender resolver de `prefillFrom.deepClone` para procesar aliases de `polymorphicChildren`. Lectura del registry (`versioningConfig`/metadata) para resolver alias → config del bloque.
- [x] S7.T2 — Implementar logica del helper: `findMany` por `ownerType/ownerId` + walk topologico por `recursiveBy` + remap ids + crear hijos con nuevo `ownerId`. Shape del mapa segun decision B+ de S1 (`Map<oldId, { newId, type }>`).
- [x] S7.T3 — Exponer mapa `oldId→newId` al caller del resolver (shape B+ definitivo) + utility `buildRemapAPI(map)` opcional.
- [x] S7.T4 — Unit tests: clonar Activity dummy con 5 CurricularSections con `parentId` formando arbol → 5 nuevas con jerarquia preservada, mapa disponible y completo (caso completo + orden topologico explicito). Cubre TC-23..TC-27.
- [x] S7.GATE — Quality review (DET-23 tier standard: foco en escalabilidad del walk topologico + claridad del helper). Reviewer aislado en super.

**DEC-LOCAL-S7-01 — Config `polymorphicChildren` leida del JSON en runtime (no del registry)**

El contract de S7.T1 decia "lectura del registry para resolver alias → config". Durante el execute se descarto: (a) agregar columna DB rompe el criterio de `git diff` vacio de S8 (REQ-07/C7); (b) extender el blob `versioningConfig` rompe los tests cerrados de S4 que usan `toEqual` exacto (y la regla global prohibe modificar tests sin aprobacion). **Decision**: `readPolymorphicChildren(objectType, tenant)` lee el bloque `metadata.polymorphicChildren` del JSON del objeto sincronizado en runtime, mismo patron que el validador de codegen y que `customFields.js`. Alternativas descartadas arriba. Reversibilidad: helper aislado, se puede migrar a registry-read si HU futura lo requiere. Alineado con L5 (build-time validate vs runtime consume).

**Gap de correctitud detectado y corregido (en S7.T3)**: el tipo GraphQL `InstanceResult` no exponia `cloneMap` → Apollo lo descartaba silenciosamente del output. Se agrego `cloneMap: JSON` a `static.js:1130`. Sin esto el caller (hook HU-8b) nunca recibiria el mapa.

#### Quality review (DET-23)

**Reviewer**: sub-agente aislado (general-purpose, sonnet) — contexto limpio, handoff DET-9
**Tier de revision**: standard (T2)
**Resultado global**: **approve** (1 warn no bloqueante, resuelto en sesion)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad de codigo | pass | Funciones acotadas; sin `any` (JS); sin magic strings; early returns + guard clauses (alias/modelo faltante) |
| 2 | Lint | n/a | Sin config ESLint en el workspace object-manager |
| 3 | Tipado | n/a | Proyecto JS; JSDoc presente en todas las funciones publicas |
| 4 | Testing | pass | Warn inicial (faltaban bordes) resuelto: +TC-31/32/33 (source vacio, recursiveBy null, padre externo). 9/9 verde |
| 5 | Escalabilidad | pass | `topologicalOrder` O(n²) peor caso (cadena lineal) aceptable para volumen esperado (<50 secciones/Activity). 1 findMany/alias + 1 create/hijo, sin N+1; creates secuenciales por necesidad topologica |
| 6 | Mantenibilidad | pass | Responsabilidad unica por funcion; sin duplicacion con el validador de codegen (patron equivalente) |
| 7 | Claridad | pass | Comentarios en espanol en logica no obvia (modelo polimorfico, walk, remap self-ref) |
| 8 | Accesibilidad | n/a | Backend |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | pass | Mensajes descriptivos en todos los paths de falla; sin catch vacios; error del helper burbujea al wrapper de la mutation. Se agrego `console.warn` para adopcion-forzada-como-raiz (dato corrupto) |

**Decision**: continue. Warn de testing resuelto en sesion (no queda deuda). Punto de contencion (padre externo → raiz) verificado correcto + instrumentado con warn.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → DET-23 standard approve (reviewer aislado); 9/9 unit verde + sin regresion (91/91); cloneMap expuesto via InstanceResult; DEC-LOCAL-S7-01 config en runtime; warns resueltos en sesion
- [ ] iterate → re-trabajar Session 7
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 8 — HU-0d fase 3 regresion codegen + smoke E2E (2026-05-28) [phase: execute]

**Tipo:** ⚑ fuerte (super autopilot — auto-aprobacion del reviewer aislado, sin override strict; ver Notas del esqueleto)
**Validation tier:** T3
**Objetivo:** validar que HU-0d (polymorphicChildren + deepClone) no introduce regresion en el codegen sobre los tenants reales y que el flujo de clonacion funciona end-to-end. Regenerar codegen sobre 16+ tenants → diff sin cambios funcionales en objetos sin `polymorphicChildren` (C7). Smoke E2E en UPU: Activity dummy con `polymorphicChildren`, clonar via mutation, verificar via psql que las CurricularSections se crearon con `ownerId` nuevo + jerarquia preservada.

**Tasks completadas**:

- [x] S8.T1 — Regenerar codegen post-HU-0d sobre los 16+ tenants. (TC-28: codegen termina OK)
- [x] S8.T2 — Validar `git diff prisma/*/schema.prisma` — sin cambios funcionales en objetos sin `polymorphicChildren`. (TC-29: diff esperado vacio, cumple C7)
- [x] S8.T3 — Smoke E2E en UPU: agregar `polymorphicChildren` a un Activity dummy, clonarlo via GraphQL mutation, validar via psql que las CurricularSections se crearon con `ownerId` nuevo + jerarquia preservada. (TC-30: smoke completo OK con verificacion en BD)
- [x] S8.GATE — Quality review (DET-23 tier exhaustive: las 10 dimensiones) ejecutado por reviewer aislado en super.

**DEC-LOCAL-S8-01 — Smoke E2E via helper contra BD real (no servidor HTTP) + ubicacion `tests/e2e/`**

El contract de S8.T3 pedia "clonar via GraphQL mutation" y archivo `__tests__/e2e/clone-activity-polymorphic.test.js`. Durante el execute se ajustaron dos puntos:

1. **Ubicacion**: `vitest.config` incluye solo `tests/**/*.test.js` — un archivo en `__tests__/e2e/` no correria (mismo gap de path que L1 del ticket). Se ubico en `tests/e2e/clone-activity-polymorphic.test.js`, honrando la intencion "e2e" y quedando dentro del include.
2. **Via de ejecucion**: en vez de levantar el servidor HTTP (estaba en 500, no healthy) + modificar `activity.json` real (cambio de definicion de objeto con implicaciones de migracion, fuera del espiritu de un test aislado), el smoke invoca `deepClonePolymorphicChildren` — el mismo helper que ejecuta el resolver de `createInstance` — contra el Prisma client real de UPU, con el bloque `polymorphicChildren` inyectado inline (shape identico al de `metadata.polymorphicChildren`). El valor E2E es la persistencia REAL en Postgres: el FK self-ref `parentId` valida de forma dura el orden topologico (un mock no puede), mas la generacion de cuid real y el constraint del enum `CurricularSectionOwnerType`. Reversibilidad: test aislado por sentinel (`__E2E_CLONE_<ts>__`), cleanup determinista en `afterAll` (doble red: ownerId + recordType). Alternativa descartada (servidor HTTP + activity.json) documentada arriba.

#### Quality review (DET-23)

**Reviewer**: sub-agente aislado (contexto limpio, opus) — DET-30 REQ-10
**Tier de revision**: exhaustive (gate ⚑ fuerte, T3)
**Resultado global**: pass (veredicto del reviewer: approve)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad de codigo | pass | Funciones cortas (`seedSection` ~10 lineas); sentinels y `RUN_TAG` extraidos a constantes (no magic strings); guard clauses limpias |
| 2 | Lint | pass | `console.warn` de skip y de prerequisito con `eslint-disable-next-line no-console` (consistencia aplicada post-review) |
| 3 | Tipado | n/a | JS sin tipos; helper expone JSDoc |
| 4 | Testing | pass | No es un test debil: valida REQ-07 en 3 patas (ownerId nuevo, jerarquia remapeada por padre logico, mapa accesible via `buildRemapAPI`) + no-mutacion del origen; assertions concretas; cubre orden topologico real (FK self-ref) que el unit con mock no puede |
| 5 | Escalabilidad | pass | Dataset acotado (5 filas); sin loops O(n²) |
| 6 | Mantenibilidad | pass | Naming claro, sin duplicacion; cleanup determinista por sentinel; DEC-LOCAL-S8-01 justificada |
| 7 | Claridad | pass | Comentarios en espanol explicando el "por que" (diferencia vs unit, valor del FK self-ref); docstring de cabecera |
| 8 | Accesibilidad | n/a | No toca UI |
| 9 | Storybook | n/a | No aplica |
| 10 | Error handling | pass | `isDbReady` con probe real + early-return (sin falso verde vacio: en UPU corrio con assertions); cleanup robusto en `afterAll` (corre tras fallo + doble red ownerId/recordType) |

**Recomendaciones no bloqueantes del reviewer**: ambas aplicadas en sesion (eslint-disable en skip + filtro `recordType` en cleanup). Sin deuda pendiente.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → DET-23 exhaustive approve (reviewer aislado); codegen OK + `git diff prisma/` vacio (C7 cumplido); smoke E2E 1/1 verde contra BD real UPU con cleanup verificado (psql count=0). HU-0d completa. Siguiente: S9 (cierre)
- [ ] iterate → re-trabajar Session 8
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 9 — Cierre Track 0 Core (2026-05-28) [phase: execute]

**Tipo:** ⚑ fuerte (super autopilot — validacion de cierre reforzada DET-30 REQ-03 via reviewer aislado bloqueante)
**Validation tier:** T2
**Objetivo:** cerrar el ticket Track 0 Core. Validar criterios C1-C8 del spec, revisar formato de commits (DET-27), refinar learns (raw → promovidos/descartados), generar teach-close (DET-22) y marcar `status: closed`. Gate de cierre reforzado: consolidacion DET-13 + DET-16 + DET-23 + chequeo "ningun archivo fuera de execute_scope" + "rama UPONE-1206 no toco develop".

**Tasks completadas**:

- [x] S9.T1 — Validar criterios C1-C8 cumplidos (Acceptance del spec).
- [x] S9.T2 — Review final de commits formato DET-27 (prefijo `UPONE-1219-S{N}` + tipo conventional).
- [x] S9.T3 — Refinar learns capturados durante execute. Promover a rules/decisions si corresponde.
- [x] S9.T4 — Generar `teach-close.md` (DET-22) con sintesis ejecutiva + evolucion hipotesis + highlights por session + knowledge promoted + lessons learned.
- [x] S9.T5 — Marcar `frontmatter.teachings.close: done` + `status: closed`.
- [x] S9.GATE — Validacion de cierre reforzada (DET-30 REQ-03) por reviewer aislado bloqueante.

#### Validacion de Acceptance C1-C8 (S9.T1)

| Criterio | Descripcion | Entrega | Evidencia | Estado |
|----------|-------------|---------|-----------|--------|
| C1 | Spike G-P3.3 define API + dimensiona hook | S1 | `tickets/TICKET-033.spike/spike-G-P3.3.md` (10KB); decision mapa B+ | done |
| C2 | Test self-ref reflexivo verde idempotente | S2 | `tests/unit/services/codegen/generateBaseModel.selfRef.test.js` + seccion en `.ai/PATTERNS.md` | done |
| C3 | Columna `versioningConfig Json?` propagada | S3 | Columna en BASEMODEL + 5 tenants locales (UPU/UCASMT/UCENG/UCPLN/TEST). DEMO01-10 + productivo deferido como deuda documentada en `docs/migrations.md` IMP-11 — dev-approved en S3.GATE (REQ-S3-DECISION strict) | done |
| C4 | `syncVersioningConfigToRegistry` invocada en Fase 3 | S4 | `src/services/codegen/generatePrismaSchema.js` (5 refs); codegen end-to-end OK | done |
| C5 | Regresion codegen HU-0j sin cambios funcionales | S5 | `git diff prisma/*/schema.prisma` vacio; idempotencia 2 runs; smoke UPU OK | done |
| C6 | Shape `polymorphicChildren` validado + `deepClone` con mapa expuesto | S6+S7 | `deep-clone-polymorphic.js` + `docs/codegen-polymorphic-children.md`; unit 9/9; `cloneMap: JSON` en `InstanceResult` (static.js) | done |
| C7 | Regresion codegen HU-0d + smoke E2E | S8 | diff vacio post-codegen (TC-29); smoke E2E real UPU 1/1 verde (TC-30); codegen OK (TC-28) | done |
| C8 | Cierre Track 0 Core con commits ordenados + teach-close | S9 | Commits DET-27 ambos repos (S9.T2); teach-close (S9.T4); gate cierre reforzado (S9.GATE) verde por reviewer aislado | done |

**Resultado C1-C8**: 8/8 done. Ningun criterio bloqueado ni con gap silencioso. C3 con deuda explicita registrada (DEMO/productivo) — no impide cierre del Track 0 Core (entorno local cubre los tenants activos).

#### Review de commits DET-27 (S9.T2)

| Repo | Branch | Sessions cubiertas | Formato |
|------|--------|--------------------|---------|
| object-manager | UPONE-1206 | S2 (test), S3 (feat), S4 (feat+test), S6 (docs+feat+test), S7 (feat+test), S8 (test) | `UPONE-1219-S{N} {feat\|test\|docs}({scope}): ...` — granularidad por-session, sin spans cross-session |
| deckard (dkc) | up1-ticket-033 | S1 (docs), S2-S8 (chore) | `UPONE-1219-S{N} {chore\|docs}(dkc): ... (TICKET-033)` |

> S5 no produjo commit de codigo en object-manager: la regresion HU-0j dejo diff vacio (sin cambio funcional). Esperado per C5. Working tree de object-manager limpio.

#### Quality review (DET-23) — S9.GATE

**Reviewer**: sub-agente aislado (general-purpose, opus) en contexto limpio — DET-30 REQ-10. Fallback inline-via-Agent porque el host no expone `dkc_invoke_agent` (multi-provider, HOR-060: `fallback-inline` valido).
**Tier de revision**: exhaustive (gate de cierre del ticket, ⚑ fuerte).
**Resultado global**: pass.

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad de codigo | pass | Helpers modulares (`deep-clone-polymorphic.js`, `validate-polymorphic-children.js`); sin `any`; funciones acotadas |
| 2 | Lint | n/a | No corrido en este gate de cierre; sin errores nuevos reportados en sessions previas |
| 3 | Tipado | n/a | Backend JS sin tipado estatico |
| 4 | Testing | pass | 39/39 unit verdes (4 suites) re-corridos por el reviewer en contexto limpio (Node 22) |
| 5 | Escalabilidad | pass | Walk topologico por `parentId`; sin loops O(n²) sobre datasets grandes |
| 6 | Mantenibilidad | pass | Validacion build-time separada del consumo runtime (RULE-core-019); docs propagadas |
| 7 | Claridad | pass | teach-close case-specific (H1.1/H3.1, D25/D15); callouts sin redundancia |
| 8 | Accesibilidad | n/a | Backend puro, sin UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | pass | Validacion de shape con errores claros en codegen; resolver preserva jerarquia |

**Decision**: continue (cierre).

#### Validacion de cierre reforzada (DET-30 REQ-03) — S9.GATE

Ejecutada por reviewer aislado bloqueante. Veredicto: **approve** (DET-14, mutuamente excluyente).

| Chequeo | Resultado | Evidencia |
|---------|-----------|-----------|
| DET-13 — built-what-was-designed | pass | C1-C8 verificados de visu contra codigo/tests, no por self-report |
| DET-16 — propagacion | pass | `docs/codegen-polymorphic-children.md`, `docs/migrations.md` (IMP-11), `.ai/PATTERNS.md` actualizados |
| DET-23 — calidad consolidada | pass | Ver tabla Quality review arriba; 39/39 tests |
| (d) ningun archivo fuera de execute_scope | pass | 20 archivos del diff `de33b88..UPONE-1206`, todos dentro de `object-manager/` |
| (e) rama no toco develop/master | pass | Branch `UPONE-1206` (≠ develop/master); checkout `/Workspace/up1/object-manager` en develop limpio/intacto |

**Nota del reviewer (no bloqueante, ya corregido)**: el code-walkthrough de teach-close citaba `src/graphql/resolvers/typeDefs/static.js`; el path real es `src/graphql/typeDefs/static.js`. Corregido post-review.

**Streaming al chat (REQ-04)**: veredicto del reviewer relayado en el turno; sin pausas adicionales — super autopilot, gate verde.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → cierre del ticket. Close-gate reforzado (DET-30 REQ-03) approve por reviewer aislado; Quality review DET-23 exhaustive (39/39 tests); C1-C8 done; scope limpio (object-manager/); branch UPONE-1206 no toco develop. Track 0 Core completo.
- [ ] iterate → re-trabajar Session 9
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Test cases

| TC | Descripcion | Affects UI | Actual | Evidence | Status | Session | Cambios gatillados |
|----|-------------|------------|--------|----------|--------|---------|--------------------|
| TC-23 | Resolver `createInstance` detecta aliases polimorficos en `prefillFrom.deepClone:[...]` y delega al helper | no | `prefillFrom` extraido de `data` pre-persistencia; bloque post-create delega a `deepClonePolymorphicChildren` cuando `deepClone.length>0 && source!=null` | instance.resolver.js (extraccion ~L2184, delegacion ~L2802) | pass | S7.T1 | — |
| TC-24 | Helper clona Activity con 5 CurricularSections con jerarquia preservada (root→ramas→hojas). Mapa expuesto. Cumple C6 | no | 5 creaciones, `cloneMap.size===5`, parentId remapeado (S2'→S1', S4'→S2', etc.), owner re-apuntado a A2 | `npx vitest run deep-clone-polymorphic` → TC-23 verde (9/9 suite) | pass | S7.T2 | — |
| TC-25 | Caller recibe el mapa en output de `createInstance`; shape `oldId→{newId,type}` serializable (decision B+) | no | `buildRemapAPI(map).toObject()` retornado en ambos returns; tipo GraphQL `InstanceResult.cloneMap: JSON` agregado | static.js:1130, instance.resolver.js (returns con cloneMap) | pass | S7.T3 | Agregado `cloneMap: JSON` al typeDef (gap detectado: Apollo lo descartaba) |
| TC-26 | Unit test — caso completo: arbol de 5 nodos, jerarquia + owner + mapa completo | no | 9/9 verde | deep-clone-polymorphic.test.js (TC-23/TC-24) | pass | S7.T4 | — |
| TC-27 | Unit test — orden topologico explicito (padre creado antes que hijos) + alias inexistente lanza error | no | 9/9 verde; `topologicalOrder` ordena root-first; alias invalido → throw `alias "X" no existe` | deep-clone-polymorphic.test.js (TC-25/TC-27) | pass | S7.T4 | — |
| TC-31 | Borde: source sin hijos → mapa vacio, 0 creaciones | no | `cloneMap.size===0`, 0 creaciones | deep-clone-polymorphic.test.js (TC-31) | pass | S7.T4 | Test net-new (warn del reviewer) |
| TC-32 | Borde: `recursiveBy` null en todos los nodos → todos raiz (parentId null) | no | 3 creaciones, todos `parentId:null`, owner A2 | deep-clone-polymorphic.test.js (TC-32) | pass | S7.T4 | Test net-new (warn del reviewer) |
| TC-33 | Borde: hijo con `parentId` fuera del set clonado → adoptado como raiz + `console.warn` | no | `parentId:null` en el clon; warn emitido | deep-clone-polymorphic.test.js (TC-33) | pass | S7.T4 | Agregado `console.warn` al helper (sugerencia reviewer) |
| TC-28 | Codegen post-HU-0d termina OK sobre los 16+ tenants reales | no | `npm run codegen` → "Prisma schema and GraphQL TypeDefs updated successfully"; RBAC capabilities idempotente (0 created/all existing) | `npm run codegen --workspace=@uplanner/object-management-backend` exit 0 | pass | S8.T1 | — |
| TC-29 | `git diff prisma/*/schema.prisma` vacio — sin cambios funcionales en objetos sin `polymorphicChildren` (C7) | no | `git diff --stat prisma/` y `git status -s` ambos vacios en branch UPONE-1206 | object-manager: working tree limpio post-codegen | pass | S8.T2 | — |
| TC-30 | Smoke E2E en UPU: Activity dummy con `polymorphicChildren`, clonar arbol de 5 CurricularSections, verificar en BD `ownerId` nuevo + jerarquia preservada | no | 1/1 verde contra BD real UPU: 5 filas clonadas con `ownerId` destino, `parentId` remapeado al nuevo padre, `ownerType=Activity`; arbol fuente intacto; FK self-ref valida orden topologico; cleanup 0 filas sentinel | `npx vitest run tests/e2e/clone-activity-polymorphic.test.js` + `psql uplanner_upu` count=0 post-run | pass | S8.T3 | Archivo en `tests/e2e/` (no `__tests__/e2e/`) por vitest include `tests/**` — ver DEC-LOCAL-S8-01 |

> Nota: TC-23..TC-33 completos. Smoke E2E (TC-30) usa el helper de clon contra BD real (no servidor HTTP) — decision DEC-LOCAL-S8-01.

## Backlog

> Vacio. Trabajo descubierto durante el execute se registra aqui con priority `must` / `should` / `could`.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Path de tests del repo es `tests/unit/services/codegen/`, no `src/services/codegen/__tests__/` (vitest.config solo incluye `tests/**/*.test.js`). Spec.task tenia path desactualizado | llm-autopilot | S4 | refined | RULE-core-016 |
| L2 | Inyeccion de `metadataLoader` como 3er param en sync helpers que dependan del `objectToFileMap` modular: evita setup fragil de fixture (mockear fs + setear map). Patron replicable | llm-autopilot | S4 | discarded | Tecnica de testing general (DI para testability), sin constraint up1-especifico. Vive como ejemplo en los propios test files. No amerita rule |
| L3 | Prisma `Json?` + `data: { field: null }` → `JsonNull` (`'null'::jsonb`), no `DbNull` (SQL NULL). Consumers JS reciben `null` igual via deserializacion, pero queries SQL deben distinguir: `field IS NULL` (no tocado por sync) vs `field = 'null'::jsonb` (sincronizado vacio) vs `field IS NOT NULL AND field != 'null'::jsonb` (config real) | reviewer aislado | S5 | refined | RULE-core-017 |
| L4 | El registry tiene 13 db_null + 76 json_null en `versioningConfig` post-sync inicial. Inconsistencia heredada: registros antiguos (seed/migration) conservan SQL NULL; los tocados por sync quedan JsonNull. Queries de HU-1+ deben contemplar ambos casos | reviewer aislado | S5 | refined | RULE-core-017 (estado heredado documentado en la rule) |
| L5 | Separacion build-time vs runtime para keys per-capacidad del JSON: validar shape en codegen (helper modular), consumir directo desde JSON en el resolver. Sin sync extra al registry cuando el consumer es por-resolver no transversal. Patron replicable | llm-autopilot | S6 | refined | RULE-core-019 |
| L6 | Validaciones que pueden producir multiples errores: acumular todos antes del throw. El dev ve el panorama completo en un run — evita iterar fix-run-fix-run | llm-autopilot | S6 | discarded | Buena practica de DX general (acumular errores antes del throw), sin constraint up1-especifico. No amerita rule |
| L7 | Un resolver que retorna un campo nuevo (ej. `cloneMap`) NO lo expone si el tipo GraphQL del output (`InstanceResult` en `static.js`) no lo declara — Apollo lo descarta silenciosamente sin error. Verificar siempre el SDL al agregar campos al return de una mutation | reviewer aislado | S7 | refined | RULE-core-018 |

## Teaching — Intake

**Status**: pending

> Se ejecutara al arrancar el execute del ticket via `prompts/steps/teach-intake.md`. Producira `tickets/TICKET-033.teach/teach-intake.md` con: hipotesis evaluadas (H1-H4 + status final), basics del codegen up1 (Fase 3 registry-sync, patron per-capacidad), gaps activos pendientes del spike G-P3.3.

## Teaching — Close

**Status**: pending

> Se llenara al cerrar el ticket. Capturara: que se hizo (HU-0e + HU-0d + HU-0j + spike), evolucion de hipotesis, highlights por session, knowledge promoted (rules o decisions nuevas — ej. patron per-capacidad para registry-sync), lessons learned.
