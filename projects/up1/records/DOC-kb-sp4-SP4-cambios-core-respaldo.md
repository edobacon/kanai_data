---
id: DOC-kb-sp4-SP4-cambios-core-respaldo
project: up1
type: doc
---

# SP4 — Cambios en core (no-mod): respaldo para el equipo de core

> **Propósito**: respaldar y explicar los cambios que el frente de Curriculum/diseño curricular tuvo que hacer en los
> repos **core** (`object-manager`, `layout`, `suite`) durante SP4, para su revisión y merge por el equipo de core.
> Todo trabajo de core vive en rama de épica y su merge a `develop` está gated por el equipo de core (RULE-dev-004);
> este documento es el insumo para esa revisión.
> **Fecha**: 2026-06-18.
> **Tickets Jira involucrados**: UPONE-1270 (versionado/convergencia de Curriculum), UPONE-1271 (clonado de AcademicProgram), UPONE-1219 (motor de clonado/versionado — épica core UPONE-1206), UPONE-1261 (rama de épica de core donde se alojan los commits de object-manager).
> **Alcance**: solo cambios de **código core**. Los cambios de mod (`curriculum-design`) y de seed/datos quedan fuera de este documento.

---

## 0. Por qué hubo cambios en core

El objetivo funcional de SP4 (clonar, versionar y converger **Curriculum** — Plan/Minor — y **AcademicProgram**) es
trabajo de mod, pero al ejercitarlo end-to-end aparecieron **límites del motor** que no se podían resolver desde el mod:

- El motor de clonado/versionado no remapeaba las FKs internas entre hijos clonados (solo el self-ref).
- El path de clonado del layout-engine inyectaba campos virtuales al `createInstance`.
- El helper de versionado asumía que todo objeto versionable tiene workflow.
- El `updateInstance` no normalizaba la FK escalar requerida como sí lo hacía el `createInstance`.

Cada uno es una **capacidad o corrección de plataforma**, no un caso especial de Curriculum. Por eso el fix correcto es
en core, generalizable, y no un parche por-mod. A continuación, cada cambio con su justificación.

---

## 1. `polymorphicChildrenDerived` — remap declarativo de FKs internas entre hijos clonados

| Campo | Detalle |
|-------|---------|
| **Jira** | UPONE-1219 (épica core UPONE-1206) |
| **Repo** | `object-manager` (codegen + motor de versionado) |
| **Flujo** | Clonado/versionado profundo de hijos polimórficos (`deep-clone-polymorphic.js`) |
| **Estado** | Implementado y verificado |

**Qué se hizo.** Se agregó un bloque declarativo `metadata.polymorphicChildrenDerived` en el JSON del objeto owner, un
**validador build-time** en el codegen, un **reader** del motor, y una **fase "derived" genérica** en el deep-clone que,
tras clonar los hijos primarios, re-crea los hijos "derivados" remapeando sus FKs internas vía el `cloneMap`. Se **migró**
el hook imperativo por-mod de SP4 (curriculum-design, ~93 líneas) y su flow n8n a esta configuración declarativa.

```json
"polymorphicChildrenDerived": [
  { "object": "CurricularLink", "via": "sourceSectionId,targetSectionId", "remapTo": "sections" }
]
```

**Por qué es necesario.** Al versionar/clonar un objeto, el motor clonaba los hijos y remapeaba el self-ref
(`recursiveBy`/`parentId`) automáticamente, pero **no** las FKs internas entre hijos (ej. `CurricularLink` que apunta a
otras `CurricularSection` clonadas). En SP4 eso se resolvió con un **hook escrito a mano por mod** + un flow n8n:
duplicado, frágil y no generalizable. Cualquier objeto con hijos que se referencian entre sí (hoy Curriculum, mañana
otros) volvería a necesitar código propio.

**Efecto.** Mods futuros obtienen el remap de FKs internas **gratis**, declarando el bloque — sin código ni flow por mod.
El comportamiento del versionado de Activity (links remapeados) se preserva vía la config genérica.

**¿Está contenido?** Sí. **Backward-compatible**: un objeto sin el bloque se comporta igual que antes. La fase derived es
**defensiva**: si una FK cae fuera del `cloneMap` (cross-owner), loguea y la salta (mismo criterio que el hook que
reemplaza). Bloques malformados **abortan el codegen** con mensaje claro (archivo + índice + campo), no fallan en runtime.

**Alternativas consideradas.** Mantener el hook imperativo por mod (descartada: duplicación, sin generalización, dos
fuentes de verdad para el walk de linaje).

**Archivos / commits.**
- `src/services/codegen/` (`generatePrismaSchema.js`, `helpers/validate-polymorphic-children-derived.js`)
- `src/graphql/resolvers/helpers/deep-clone-polymorphic.js`, `instance.resolver.js` (fase derived en `finalizeCreate`)
- Commits (rama de épica): `bb615ed` (validator + reader), `b754d4f`/`4340894`/`d9bd25f` (applyDerivedRemap + unit),
  `18d7467` (fase derived in-engine), `eeee741` (e2e), `efd2992` (sync del bloque al base).

---

## 2. Filtrado de `initialData` en `RecordDetail.handleSubmit`

| Campo | Detalle |
|-------|---------|
| **Jira** | UPONE-1271 |
| **Repo** | `layout` (layout-engine) |
| **Flujo** | Clonado vía `cloneStrategy: "prefilledModal"` → `createInstance` |
| **Estado** | Implementado y verificado |

**Qué se hizo.** En `RecordDetail.handleSubmit`, la inyección de `initialData` al payload de `createInstance` ahora se
**filtra** a los campos reales del schema (`baseFields ∪ customFields`) más una allowlist de owner
(`ownerType`, `ownerId`, `recordType`). Se extrajo un helper puro (`isinjectableInitialDataKey` +
`INITIAL_DATA_OWNER_ALLOWLIST`).

**Por qué es necesario.** Al guardar un clone (`prefilledModal`), el primitivo copia de la fila campos **virtuales**
(display-siblings de FKs como `institutionName`/`executionUnitName`, objetos de relación, `extended`) al `initialData`.
El `handleSubmit` inyectaba **todas** las keys de `initialData` al payload (bloque pensado para el owner polimórfico) →
Prisma rechazaba la primera columna desconocida ("Unknown field" / "La información proporcionada no es válida").

**Efecto.** El clone vía prefilledModal de **cualquier objeto con FK display** guarda sin error. Antes fallaba para todos
ellos (se descubrió con AcademicProgram).

**¿Está contenido?** Sí. El filtro descarta solo el junk virtual; preserva los campos reales y el owner. Verificado con
unit 5/5 + **regresión 1021/1021** del layout-engine + smoke en UI (clone de AcademicProgram guarda) + revisión aislada.

**Alternativas / aprendizaje.** La primera hipótesis apuntaba al field-loop del form; la causa real era la inyección de
`initialData`. Lección registrada: leer el flujo completo de submit antes de fijar el lugar del fix.

**Archivos / commits.**
- `layout/src/layouts/RecordDetail.vue`, `layout/src/layouts/recordDetailInitialData.ts`, `__tests__/recordDetailInitialData.spec.ts`
- Commit: `ce94be7` (rama `UPONE-1271-recorddetail-payload-fix`).

---

## 3. Versionado sin workflow + normalización de FK en update

| Campo | Detalle |
|-------|---------|
| **Jira** | UPONE-1270 |
| **Repo** | `object-manager` (helper de versionado + resolver de update) |
| **Flujo** | Versionado (`prepareVersionData`) y actualización (`updateInstance`) |
| **Estado** | Implementado y verificado |

Dos cambios independientes que emergieron al versionar y editar Curriculum.

### 3a. `prepareVersionData` workflow-opcional

**Qué se hizo.** Gatear toda la lógica de workflow a la presencia de `initialStateField` en el `versioningConfig`:
`needsWorkflow = !!initialStateField`. El `include` de `currentstatus`/`workflow`, los dos checks
(`allowsVersioning`, `initialStatusId`) y el set del estado inicial pasan a ser **condicionales**.

**Por qué es necesario.** El helper asumía **incondicionalmente** que el objeto versionable tiene workflow (include de
`currentstatus`/`workflow`, exige `allowsVersioning` e `initialStatusId`, setea el estado inicial). Curriculum (y
AcademicProgram) modelan el estado como un **enum simple** sin FK a `WorkflowStatus` → versionar lanzaba
`INTERNAL_SERVER_ERROR` (`Unknown field 'currentstatus' for include on model Curriculum`). Es un crash en una lectura
previa a cualquier write (no deja versiones a medias).

**Efecto.** La plataforma puede versionar objetos **sin workflow** (Curriculum hoy, AcademicProgram y futuros). La v2 nace
en su estado por defecto (`static_default: "Draft"`).

### 3b. `updateInstance` — FK escalar → relation `connect`

**Qué se hizo.** `updateInstance` convierte la FK escalar base a `{ relation: { connect } }`, igual que ya lo hacía
`createInstance` (simetría create/update).

**Por qué es necesario.** Al setear una FK requerida (`institutionId`) junto con la escritura anidada de la extensión
RecordType, Prisma fuerza el *checked input* y rechaza la FK escalar. `createInstance` lo resolvía; `updateInstance` no.

**Efecto.** La actualización de objetos con relación requerida + extensión (Curriculum) ya no es rechazada; la relación se
preserva.

**¿Está contenido?** Sí. `prepareVersionData` es una función pura: el gate `needsWorkflow` preserva 1:1 el comportamiento
de Activity (que declara `initialStateField`). El cambio de update replica el patrón del create (un solo patrón). Unit
13/13 del helper + **542/542** de los resolvers sin regresión + E2E en vivo.

**Alternativas consideradas.** (1) Resolver de versión custom en el mod (descartada: duplica el walk de linaje de core,
no generaliza). (2) Darle un workflow formal a Curriculum (descartada: sobre-modela, contradice la decisión de modelado
de Plan/Minor sin workflow). Detalle en `UPONE-1270-versionado-curriculum-sin-workflow.md`.

**Archivos / commits.**
- `src/graphql/resolvers/helpers/version-from-source.js`, `src/graphql/resolvers/instance.resolver.js`
- Commits: `9e82d33` (versionado workflow-opcional), `98590c0` (FK escalar → connect).

---

## 4. Resumen para revisión

| # | Cambio | Jira | Repo | Riesgo | Backward-compatible | Verificación |
|---|--------|------|------|--------|---------------------|--------------|
| 1 | `polymorphicChildrenDerived` (remap declarativo) | UPONE-1219 | object-manager | Bajo | Sí (sin bloque = igual) | unit + e2e; Activity preservado |
| 2 | Filtrado de `initialData` en handleSubmit | UPONE-1271 | layout | Bajo | Sí | unit 5/5 + regresión 1021/1021 + UI |
| 3a | `prepareVersionData` workflow-opcional | UPONE-1270 | object-manager | Bajo | Sí (Activity 1:1) | unit 13/13 + 542/542 + E2E |
| 3b | `updateInstance` FK escalar → connect | UPONE-1270 | object-manager | Bajo | Sí (replica create) | unit + 542/542 + E2E |

Todos los cambios: aislados, backward-compatibles, con tests y verificación en vivo, en rama de épica de core, **merge a
`develop` pendiente de revisión del equipo de core**.

**Doc de respaldo adicional (caso 3):** `UPONE-1270-versionado-curriculum-sin-workflow.md` — análisis completo del
versionado de objetos sin workflow (alternativas A/B/C, recomendación y alcance).
