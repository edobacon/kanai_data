---
id: DOC-kb-sp5-auditoria-viabilidad-2026-06-23
project: up1
type: doc
---

# SP5 — Auditoría de viabilidad técnica (pre-sprint)

> **Fecha:** 2026-06-23 · **Objetivo:** verificar contra el **código real** los supuestos del plan antes de codear, para detectar bloqueantes y controlar imprevistos.
> **Método:** 4 exploraciones paralelas del codebase (core object-manager, modelado del mod, infra de componentes, campos de datos). Cada hallazgo lleva evidencia `archivo:línea`.
> **Veredicto global:** **viable**, con **1 bloqueante real** (proyección RT al versionar), **2 sorpresas a favor** (E1 ya está aplicado; el motor de cascada ya existe en core) y **3 riesgos a controlar con POC temprano**.

> 🧭 **En lenguaje claro:** revisamos el código real para no llevarnos sorpresas a mitad de sprint. **Conclusión:** la malla es totalmente viable; lo único realmente roto es **versionar un plan** (un problema del core de la plataforma, no del mod) — por eso ese trabajo se va a SP6. Lo demás está despejado. Si no eres dev, con esto basta; el detalle técnico (códigos H-3, H-7…) está explicado en el [glosario del README](README.md#-glosario-códigos-y-jerga-que-aparecen-en-los-docs).

---

## 1. Sorpresas a favor (reducen alcance/estimación de la Épica E)

### H-1 · El fix de versionado sin workflow (E1) **YA ESTÁ APLICADO** en core
El doc de SP4 describía el bug como vigente, pero `object-manager/src/graphql/resolvers/helpers/version-from-source.js` (líneas 26-114) **ya tiene** el gate `needsWorkflow = !!initialStateField` (L57), el include condicional (L71) y los checks gateados (L75-86). El header lo documenta para Curriculum (UPONE-1270).
- **Impacto:** **E1 deja de ser implementación → pasa a verificación.** Estimación 3 SP → **~1 SP** (smoke E2E de que versionar un Plan ya no crashea y nace `Draft`).

### H-2 · El motor de **deep-copy en cascada ya existe en core** y es config-driven
No hay que construir un motor nuevo (era el supuesto de E2 §5.8-A). Core ya tiene:
- `helpers/deep-clone-polymorphic.js` (hijos polimórficos `ownerType`/`ownerId`).
- `helpers/deep-clone-direct.js` (hijos FK directa 1-N).
- `applyDerivedRemap` (re-mapeo de FKs internas entre hijos clonados).
- Se activa en `instance.resolver.js` (L3353-3416) cuando `prefillFrom.deepClone.length > 0`.
- **Precedente real:** `Activity` declara `"deepClone": ["sections"]` (`activity.json:33`) y arrastra `CurricularSection` + subsecciones (`recursiveBy: "parentId"`) + `CurricularLink` con remapeo de FKs.

- **Impacto:** **E2 deja de ser "construir motor" → pasa a "declarar config + validar remapeo".** El trabajo real es: declarar `polymorphicChildren`/`directChildren` + `deepClone` en `Curriculum.json` para `planEntry`/`requirementCategory`/`requirement(owner=curriculum)`, y verificar el remapeo de `categoryId`/`blockId`/`parentId`/`sourceEntryId` (que es exactamente el caso de `CurricularLink` ya resuelto por `applyDerivedRemap`). Estimación del motor baja; queda la config + tests.

> **Nota de decisión:** §5.8 (cascada genérica en core) no solo era la opción correcta — **ya es la realidad de la plataforma**. Solo hay que usarla.

---

## 2. BLOQUEANTE real (atacar temprano)

### H-3 · Versionar un `Curriculum(Plan)` **NO arrastra hoy la extensión RecordType** (`rt__Plan__curriculum`), y el path RT es no-atómico
Es el imprevisto más importante. Detalle:
- El rowAction "Nueva versión" usa `asNewVersion: true` con `objectType=Curriculum` (la **base**, no el alias RT). El path normal de `createInstance` (con `$transaction Serializable`, L3437) crea **solo la fila base** — **no** crea `rt__Plan__curriculum` (que tiene `progression`, `totalCredits`, `totalPeriods`, `periodType`).
- El guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` (`version-from-source.js:33-45`) **bloquea** versionar vía el alias RT. → Hay una tensión: versionar por base pierde los campos del RT; versionar por alias RT está bloqueado.
- `cloneChildProjections` (`deep-clone-polymorphic.js:218-245`) ya resuelve la proyección RT **de los hijos** (caso Activity→sections), pero **no hay equivalente para el objeto padre** que se versiona.
- Además, el path RT (`instance.resolver.js:2684-2858`) hace 4 writes secuenciales con `prisma` directo **fuera de `$transaction`** → no atómico (TICKET-056 / backlog B1): una falla a mitad deja una fila base huérfana sin RT.

- **Impacto:** versionar un Plan produciría una v2 **sin sus campos temporales** → malla rota. Es **core work**, no cubierto por el fix de SP4 ni por el motor de cascada actual.
- **Acción:** **spike de core temprano (E3 adelantado)** para (a) hacer que el versionado del padre clone su proyección RT, y (b) decidir si se envuelve el path RT en `$transaction`. Confirmar empíricamente antes de comprometer la copia de hijos (E2), porque si el padre no versiona bien, los hijos colgarían de una v2 inválida.

---

## 3. Riesgos a controlar con POC temprano

### H-4 · Layouts por RecordType — **RESUELTO: ya hay precedente productivo en el propio mod** ✅
El `RISK-001` (`specs/up1/curriculum-design/risks/layouts-recordtype-untested.md`, abril 2026) decía "ningún mod usa layouts por RT". **Quedó obsoleto:** el propio `curriculum-design` ya los adoptó para `CurricularSection` — **19 layouts `default_rt__<RT>__curricularsection_{create,edit,view}.json` committeados** (Bibliography, Content, CustomSection, EvaluationComponent, LearningOutcome, Modality, Session), bajo ticket real `UPONE-1216-S3`, con mantenimiento activo (producción, no stubs).
- **Verificación del mecanismo:** `up1/layout/logic/layout.resolver.js` (`resolveDefaultLayout`) resuelve por convención `default_{objectName}_{mode}` donde el `objectName` **es** el nombre completo del RT. Ej. real: `default_rt__Modality__curricularsection_view.json` → `id: default_rt__Modality__curricularsection_view`, `objectName: rt__Modality__curricularsection`, `mode: view`. Calza exacto. **No se necesita un parámetro `recordType` ni un fix de core.**
- **Afecta:** A3 (`requirement` con 3 RTs) → sigue el **patrón idéntico ya probado**: declarar `default_rt__RecordState__requirement_{view,edit,create}.json`, etc.
- **Acción:** SPK-2 se reduce de "POC riesgoso" a **"copiar el patrón de `CurricularSection`"**. Sin riesgo de frontera, sin core.

### H-5 · FK polimórfica `ownerType/ownerId`: **sin integridad referencial** (convención, no enforcement)
`ownerId` se modela como `String` plano sin `@relation` ni constraint (igual que `Curriculum.ownerId` y `CurricularSection.ownerId`). La DB acepta un `ownerId` inválido para el `ownerType` dado. La validación es responsabilidad del consumidor.
- **Afecta:** A3 (`requirement.ownerType` {curriculum, activity, offering}).
- **Acción:** validación en capa de aplicación (resolver del mod) si se requiere integridad; documentar como deuda si se acepta convención.

### H-6 · Modales desde Vueform elements: `ModalStackManager` no expuesto (BUG-platform-011)
Los componentes custom (Vueform elements) **no** acceden al `ModalStackManager` de plataforma. El precedente `CompositeSectionTree` resuelve con **modales caseros** (átomo `Modal` del design system) — funciona y es themeable, pero es net-new respecto a los modales gestionados por plataforma.
- **Afecta:** B4 (modal 2 pasos), B5, B6 (bloqueo), B7 (editar entry).
- **Acción:** seguir el patrón de `CompositeSectionTree` (modal casero). El riesgo es de **complejidad del flujo 2 pasos**, no de inviabilidad.

---

## 4. Confirmaciones que despejan supuestos

| # | Supuesto del plan | Veredicto | Evidencia |
|---|---|---|---|
| C-1 | `progression` es string libre hoy → BE-0 cierra a enum | **Confirmado** | `rt__Plan__curriculum.json:11` (NEEDS CLARIFICATION, sin enum) |
| C-2 | `Curriculum.status` tiene un estado "publicado" para D2 | **Confirmado: `Active`** | `Curriculum.json:79-86` enum {Draft, Active, Archived}, default Draft |
| C-3 | El picker de B4 filtra por departamento | **Confirmado: `executionUnitId`** | `activity.json:116-124` FK → **OrgUnit** (OrgUnit vive en mod `uengagement-up1`; `OrgUnit.type` puede ser "Departamento") |
| C-4 | Activity no tiene prereqs hoy → `requirement` es net-new | **Confirmado** | `activity.json` sin campos prereq; `Curriculum.json:9` "hijos en sprints siguientes" |
| C-5 | FK polimórfica `ownerType/ownerId` soportada | **Confirmado** (con H-5) | `Curriculum.json:49-62`, `CurricularSection.json:29-43` |
| C-6 | Self-FK `parentId` (árbol Composite) soportado | **Confirmado** | `CurricularSection.parentId` (`CurricularSection.json:73-81`) + `directChildren` (L14-21) |
| C-7 | Multi-RecordType (3 RTs en `requirement`) soportado | **Confirmado** | `CurricularSection` tiene 7 RTs (`schema.prisma:995-1002`) |
| C-8 | Componente full-page custom con GraphQL + DnD + modales | **Confirmado: precedente `CompositeSectionTree`** | `layout/src/modsComponents/CompositeSectionTree/*`; `sortablejs` ya en `package.json:26` del mod |
| C-9 | Pestaña custom en RecordDetail | **Confirmado: `type: "associatedLayout"`** | `RecordDetail.vue:4465`; precedente `academic-scheduling/config/layouts/ruleset-view.json:16-21` |
| C-10 | Los objetos planEntry/requirementCategory/requirement NO existen aún | **Confirmado** | listado `objects/` del mod |

---

## 5. Spikes/POCs recomendados ANTES o al inicio del sprint

| Spike | Por qué | Bloquea a | Esfuerzo |
|---|---|---|---|
| **SPK-1 · Versionar un Plan real y mirar la v2** | Confirmar el bloqueante H-3 (¿arrastra `rt__Plan__curriculum`?) | E2, E3 (y la utilidad de toda la Épica E) | 0.5 día |
| ~~SPK-2 · POC layout por RecordType~~ **YA NO NECESARIO** | H-4 resuelto: hay precedente productivo (19 layouts RT en el mod) | — | copiar patrón de `CurricularSection` |
| **SPK-3 · `deepClone` con un hijo de Curriculum (dummy)** | Validar que el motor de cascada existente (H-2) corre para Curriculum y remapea FKs | E2 | 0.5 día |

> Estos 3 spikes (≈1.5 días) **destraban el grueso del riesgo** de las épicas A y E. Recomendado correrlos en la **primera mitad de la semana 1**, antes de comprometer E2.

---

## 5.bis · Validación estática profunda (round 2 — lectura directa del código)

Tras el barrido inicial, se leyó el código fuente línea por línea para **probar** (no inferir) H-2 y H-3. Resultado: ambos confirmados desde la fuente.

### H-3 confirmado — cadena completa (BLOQUEANTE)
1. **Layout:** `mods/curriculum-design/config/layouts/default_Curriculum_list.json:20-27` — rowAction `create-new-version` con `"asNewVersion": true` + `"prefillFromCurrent": true`, **sin alias RT** → el versionado corre con `objectType=Curriculum` (la base).
2. **Resolver:** `instance.resolver.js:2684-2858` — el "RecordType early-return", único path que crea **base + RT + ext** (prefill RT en L2718-2729), **solo dispara si `parseRecordTypeFileName(objectType)` es truthy** (objectType = `rt__*`). Con `objectType=Curriculum` se **salta** → solo se crea la fila base.
3. **Guard:** `version-from-source.js:43-45` — versionar **por** el alias `rt__Plan__curriculum` lanza `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`. El comentario L39 confirma que hoy es **latente** (Activity es base; Curriculum sería el primer versionable con RT real).
4. **Helper:** `deep-clone-polymorphic.js:218-245` (`cloneChildProjections`) copia base+RT+ext **solo de los HIJOS** (fix FINDING-V1/UPONE-1219), **no del padre versionado**.

**Conclusión probada:** no hay path hoy que versione un `Curriculum(Plan)` arrastrando `rt__Plan__curriculum` (progression/totalCredits/totalPeriods/periodType). Versionar por base pierde el RT; versionar por alias está bloqueado. **E4 es necesario y es camino crítico.**

> **Atenuante para E4:** el building block ya existe. `cloneChildProjections` es genérico (copia base+RT+ext de una fila por su FK). E4 ≈ **invocarlo para el objeto padre versionado** + resolver el ruteo base-vs-alias + envolver el path RT en `$transaction`. No es un fix desde cero → estimación baja de 5 a **~3 SP** (sigue siendo core + review).

### H-2 confirmado — el motor de cascada es más completo de lo asumido
`instance.resolver.js:3353-3439` enruta cada alias de `prefillFrom.deepClone` a su helper y corre dentro de `$transaction Serializable` cuando `asNewVersion`. El motor ya cubre:
- **Hijos RT-proyectados**: `cloneChildProjections` copia base+RT+ext de cada hijo (clave para `requirement` con sus 3 RTs).
- **Árbol**: orden topológico por `recursiveBy` (`parentId`) — `deep-clone-polymorphic.js:260+`.
- **Hijos polimórficos**: seleccionados por `via = "ownerType/ownerId"` (`parseVia`, L252) → para `requirement` toma solo los `ownerType=curriculum` naturalmente.
- **Remapeo de FKs internas**: `applyDerivedRemap` (mismo mecanismo que ya remapea `CurricularLink` en el árbol de Activity) → cubre `planEntry.categoryId`/`blockId` y `requirement.parentId`.

**Conclusión:** E2 es **declarar config en `Curriculum.json` + validar el remapeo**, sobre un motor que ya resuelve los casos difíciles. La decisión §5.8(A) no solo era correcta — la plataforma ya la implementa.

### Test en vivo (SPK-1) — EJECUTADO vía GraphQL directo (sin MCP) ✅
A pedido, se validó en runtime **sin MCP**: DB directa (Postgres `uplanner_upu`, contenedor `pg:5432`) + el endpoint GraphQL real del object-manager (`localhost:4000`), autenticando con el `STORYBOOK_STATIC_TOKEN` (path de dev legítimo → usuario admin real con caps).

**Procedimiento:** se ejecutó `createInstance(objectType:"Curriculum", data:{ asNewVersion:true, prefillFrom:{ source:<plan v1> } })` contra el único Plan de UPU (`UV-ICIV-PLAN-2026`). El `$transaction` hizo rollback (DB intacta, sigue solo v1 — sin cleanup necesario).

**Evidencia runtime (el payload que el resolver intentó crear):**
```
prisma.curriculum.create({ data: {
  name, code, recordType:"Plan", ownerType, ownerId, version:2,
  previousversion:{ connect:{ id:<v1> } },
  ext__uplanner__curriculum:{ create:{ updatedById:15 } },   // ← crash
  updatedById:3
}})
```

**Dos bloqueantes confirmados en vivo:**
1. **H-3 (proyección RT dropeada) — PROBADO en runtime.** El payload de create **no incluye `rt__Plan__curriculum` ni ninguno de `progression`/`totalCredits`/`totalPeriods`/`periodType`**. El resolver, con `objectType=Curriculum` (base), construye un create que omite la extensión RT por completo. Confirma H-3 empíricamente, no solo por lectura de código.
2. **H-7 (NUEVO) — versionar Curriculum crashea en el write del ext-base.** Error real: `PrismaClientValidationError: Unknown argument 'updatedById'` en `ext__uplanner__curriculum.create`. La tabla `ext__uplanner__curriculum` tiene **solo la columna `curriculumId`** (sin custom fields), pero el path de versión le inyecta `updatedById` → revienta. Versionar un Curriculum **falla hoy incluso antes** de llegar al problema del RT.

**Corrección a H-1:** el fix de "workflow opcional" SÍ está aplicado (ya no crashea en el `include` de `currentstatus`/`workflow`). **Pero versionar un Curriculum end-to-end sigue roto** — el fallo se movió aguas abajo (H-7 + H-3). El síntoma del doc de SP4 ("versionar errorea") **sigue vigente**, con causa raíz distinta. → **E1 no es "solo verificar": versionar Curriculum no funciona hoy.** El trabajo real vive en E4 (ahora cubre H-7 + H-3).

---

## 6. Deltas al plan (aplicados en `SP5-plan-malla-curricular.md`)

- **E1**: 3 SP → **~1 SP** (verificación, no implementación). H-1.
- **E2**: se mantiene 8 SP pero el trabajo se redefine: **config-driven sobre motor existente** + tests de remapeo (no construir motor). H-2.
- **Nuevo E4 (core)**: **proyección RT del padre al versionar + atomicidad del path RT**. Es el bloqueante H-3. ~5 SP (core, ligado a TICKET-056).
- **Riesgos nuevos** en §6 del plan: H-3 (bloqueante RT), H-4 (layouts por RT → POC), H-5 (FK polimórfica sin enforcement), H-6 (modales caseros).
- **Nota B4**: el filtro por departamento es `executionUnitId` → **OrgUnit** (cross-mod con `uengagement-up1`).
- **Nota B-épica**: modelar el componente de malla sobre el precedente **`CompositeSectionTree`** (full-page Vueform element, GraphQL, sortablejs, modal casero).
