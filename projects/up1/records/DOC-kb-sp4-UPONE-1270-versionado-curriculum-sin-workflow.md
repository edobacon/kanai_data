---
id: DOC-kb-sp4-UPONE-1270-versionado-curriculum-sin-workflow
project: up1
type: doc
---

# Versionar Curriculum (Plan/Minor) — el caso de objetos versionables SIN workflow

> **Origen**: descubierto en el smoke E2E de UPONE-1270 / TICKET-065 (clonar + versionar curriculum).
> **Estado**: análisis + alternativas. Decisión de enfoque pendiente.
> **Fecha**: 2026-06-17.
> **Relacionado**: TICKET-065 (Backlog B2), `version-from-source.js` (core), `Curriculum.json` (mod curriculum-design), patrón de versionado de `activity` (SP4 / UPONE-1209).

---

## 1. Resumen ejecutivo

Versionar un `Curriculum` (Plan/Minor) desde la UI lanza **`INTERNAL_SERVER_ERROR`**. La causa NO es el mod ni la
config del objeto: es que el helper de versionado de core (`prepareVersionData`) **asume incondicionalmente que el
objeto versionable tiene un workflow**, y `Curriculum` —por decisión de modelado— **no lo tiene** (usa un enum `status`
simple, igual que `AcademicProgram`). `Curriculum` es el **primer objeto versionable sin workflow** de la plataforma, y
por eso expone esta limitación que estaba latente.

El clonado y la unicidad por linaje (el resto de UPONE-1270) funcionan y están verificados E2E. Solo **versionar** queda
bloqueado por esta limitación de core.

Este documento describe el problema, las **3 alternativas** para abarcarlo (con pros/contras y por qué), la
**recomendación**, y el **alcance** de cada cambio (archivos, repos, ramas, riesgo, reversibilidad).

---

## 2. Contexto: cómo funciona el versionado hoy

El versionado de la plataforma (SP4, UPONE-1209) es **config-driven**: cada objeto declara en su metadata un bloque
`versioning`, y el `createInstance` genérico de core lo interpreta cuando recibe `asNewVersion: true`.

### 2.1. El objeto que SÍ tiene workflow — `activity`

```json
"versioning": {
  "linkageField": "previousVersionId",
  "versionField": "version",
  "versionStrategy": "increment",
  "auditSourceField": "versionSourceId",
  "initialStateField": "currentStatusId",      // ← clave: declara el campo de estado de workflow
  "requiredCapability": "activity:version"
}
```

`activity` tiene un workflow real: `currentStatusId` (FK → `WorkflowStatus`) y una relación `workflow`. Al versionar,
core resetea la nueva versión al **estado inicial del workflow** (`workflow.initialStatusId`) y solo permite versionar
desde un estado que lo habilita (`currentstatus.allowsVersioning`, ej. "Publicado").

### 2.2. El objeto que NO tiene workflow — `curriculum`

```json
"versioning": {
  "linkageField": "previousVersionId",
  "versionField": "version",
  "versionStrategy": "increment",
  "requiredCapability": "curriculum:version"
  // ← NO declara initialStateField (no hay workflow)
}
```

`Curriculum` modela el estado como un **enum simple**: `status` ∈ {Draft, Active, Archived}, `static_default: "Draft"`,
sin FK a `WorkflowStatus`, sin relación `workflow` ni `currentstatus`. Es **idéntico al patrón de `AcademicProgram`**
(que tampoco usa workflow formal). Es una decisión de modelado consciente de UPONE-1268, no un olvido.

---

## 3. El problema: `prepareVersionData` asume workflow

El config-driven funciona bien: core lee `versioning` de forma genérica (`instance.resolver.js:2461`) y aplica el
enforcement de capability. **El bloqueo está 100% en el cuerpo de `prepareVersionData`**
(`object-manager/src/graphql/resolvers/helpers/version-from-source.js:54-88`), escrito para `activity` y nunca
generalizado:

```js
// version-from-source.js (estado actual — asume workflow SIEMPRE)
const source = await modelClient.findUnique({
  where: { id: resolvedId },
  include: { currentstatus: true, workflow: true },   // ← (1) Curriculum no tiene estas relaciones → Prisma falla
});
if (!source) throw new Error('PREFILL_SOURCE_NOT_FOUND');

if (!source.currentstatus?.allowsVersioning) {          // ← (2) asume estado de workflow
  throw new Error('SOURCE_NOT_VERSIONABLE');
}
if (!source.workflow?.initialStatusId) {                // ← (3) asume workflow con estado inicial
  throw new Error('WORKFLOW_HAS_NO_INITIAL_STATUS');
}

const maxVersion = await maxVersionInLineage({ ... });

return {
  ...data,
  [versionField]: maxVersion + 1,
  [linkageField]: source.id,
  [initialStateField]: source.workflow.initialStatusId, // ← (4) setea estado inicial de workflow
};
```

El error concreto observado (E2E):

```
PrismaClientValidationError: Invalid `prisma.curriculum.findUnique()` invocation:
Unknown field `currentstatus` for include statement on model `Curriculum`.
    at async prepareVersionData (version-from-source.js:54)
```

Es un crash en una **lectura previa a cualquier write** → no deja versiones a medias (no hay efecto colateral en datos).

---

## 4. Alternativas

### Alternativa A — Hacer el workflow OPCIONAL en `prepareVersionData` (core) — **RECOMENDADA**

Gatear toda la lógica de workflow a la presencia de `initialStateField` en el `versioningConfig`. Objetos que lo
declaran (activity) corren igual; objetos que no (curriculum, academicProgram) saltan la lógica de workflow.

```js
// version-from-source.js (propuesto)
const { linkageField, versionField, initialStateField } = versioningConfig;
const needsWorkflow = !!initialStateField;

const source = await modelClient.findUnique({
  where: { id: resolvedId },
  include: needsWorkflow ? { currentstatus: true, workflow: true } : undefined,
});
if (!source) throw new Error('PREFILL_SOURCE_NOT_FOUND');

if (needsWorkflow) {
  if (!source.currentstatus?.allowsVersioning) throw new Error('SOURCE_NOT_VERSIONABLE');
  if (!source.workflow?.initialStatusId)       throw new Error('WORKFLOW_HAS_NO_INITIAL_STATUS');
}

const maxVersion = await maxVersionInLineage({ modelClient, source, linkageField, versionField });

const result = { ...data, [versionField]: maxVersion + 1, [linkageField]: source.id };
if (needsWorkflow) result[initialStateField] = source.workflow.initialStatusId;
return result;
```

**Por qué**: el versionado de objetos de estado-simple es una **capacidad legítima de la plataforma**, no un caso
especial de curriculum. `AcademicProgram` y futuros objetos sin workflow la van a necesitar. El cambio es pequeño
(~15 líneas), **backward-compatible** (activity declara `initialStateField` → comportamiento idéntico), y elimina una
asunción oculta del helper.

**Estado inicial de la nueva versión** (sin workflow): lo resuelve el `static_default` del enum. Como `curriculum.json`
ya excluye `status` en `prefillFrom.exclude` (agregado en UPONE-1270), la versión **no arrastra el `Active` del source**
→ aplica `static_default: "Draft"` → **v2 nace Draft** (cumple D-B). No se necesita `initialStateField` para curriculum.

**Gating de "desde qué estado se puede versionar"**: se pierde para curriculum (no hay `allowsVersioning`). El versionado
queda gateado solo por la capability `curriculum:version`. Es aceptable: el modelo no tiene el concepto de "estado
publicable" que sí tiene activity.

| Pros | Contras |
|------|---------|
| Generaliza la plataforma (sirve a curriculum, academicProgram, futuros) | Es **core** (`object-manager`) → rama de épica + review del team (core_work_policy / RULE-dev-004), fuera del scope mod-only |
| Backward-compatible (activity intacto, gateado por `initialStateField`) | Requiere coordinar el merge con el equipo de core |
| Cambio chico (~15 líneas), una sola función pura | — |
| Mantiene el patrón único de versionado (un solo path) | — |

---

### Alternativa B — Resolver de versión custom en el mod (mod-only, táctico)

Implementar una mutation `versionCurriculum` en el mod `curriculum-design` que replique la lógica simple de versionado
(sin workflow) y rutee por el path de create existente, evitando `prepareVersionData` por completo.

Mecánica:
1. Traer el source (base + extensión RT) y calcular `max(version del linaje) + 1` (el walk de linaje son ~30 líneas,
   replicables de `maxVersionInLineage`).
2. Armar el payload `{ ...campos del source, previousVersionId: source.id, version: max+1 }` (sin `status` → default Draft).
3. Rutear por `createCurriculumWithRecordType` (que ya maneja el alias `rt__<RT>__curriculum` + split base/RT). El guard
   de unicidad por linaje **se salta solo** porque `previousVersionId != null` (no es raíz).
4. Cambiar el rowAction de `asNewVersion: true` a un `customEndpoint` que apunte a `versionCurriculum` (igual que el
   clone usa `cloneStrategy: "prefilledModal"`).

| Pros | Contras |
|------|---------|
| **Mod-scoped** — entra este sprint sin tocar core | **Duplica** el walk de linaje de core (deuda de mantenimiento; dos fuentes de verdad) |
| No depende del review del equipo de core | Solo resuelve curriculum; no generaliza (academicProgram volvería a chocar) |
| Reversible (todo en el mod) | Se **aparta del patrón** de activity (que usa el path de core), creando una inconsistencia de plataforma |

---

### Alternativa C — Darle workflow a `Curriculum` — **DESCARTADA**

Modelar un workflow formal para Curriculum (FK `currentStatusId`, relación `workflow`, seed de un workflow) para encajar
en el path actual.

**Por qué se descarta**: contradice la decisión de modelado de UPONE-1268 (Plan/Minor sin workflow formal, igual que
`AcademicProgram`). Sería sobre-modelar: agrega una máquina de estados que el dominio no pide, con costo de migración,
seed y mantenimiento, solo para evitar generalizar un helper de 15 líneas.

---

## 5. Recomendación

**Alternativa A** (fix en core, workflow opcional). Es el arreglo correcto y estratégico: pequeño, backward-compatible, y
le da a la plataforma la capacidad de versionar objetos sin workflow —que ya es un patrón real (curriculum hoy,
academicProgram mañana)— en vez de parchear caso por caso.

**Alternativa B** queda como **puente táctico** solo si se necesita versionar curriculum en este sprint sin abrir core;
en ese caso, A debería seguir después como limpieza (y eventualmente B se retira a favor del path de core).

---

## 6. Alcance del cambio (Alternativa A)

| Dimensión | Detalle |
|-----------|---------|
| **Repo** | `object-manager` (core) |
| **Archivo** | `src/graphql/resolvers/helpers/version-from-source.js` (función `prepareVersionData`) |
| **Tipo de cambio** | Lógica condicional: `needsWorkflow = !!initialStateField`. Include condicional + 2 checks gateados + set condicional de `initialStateField`. ~15 líneas en una función pura. |
| **Rama** | Rama de épica core (`UPONE-{epica}`), per `core_work_policy` / RULE-dev-004. NO mod-only. |
| **Merge** | A `develop` gated por review del team up1. |
| **Riesgo** | **Bajo**. La función es pura (solo lecturas), aislada y testeable en unidad. El gate `needsWorkflow` preserva 1:1 el comportamiento de activity (que declara `initialStateField`). |
| **Reversibilidad** | Alta (un solo archivo, `git revert`). |
| **Tests** | Extender `tests/unit/resolvers/version-from-source-helper.test.js`: caso "objeto sin `initialStateField` → no incluye currentstatus/workflow, no exige allowsVersioning, no setea estado, bumpea version + linkage". Preservar los casos de activity (con workflow). |
| **Config del mod** | Ninguna — `Curriculum.json` ya tiene el `versioning` correcto (sin `initialStateField`) y `prefillFrom.exclude` con `status`. Tras el fix de core, versionar curriculum funciona sin tocar el mod. |

### Detalles a verificar al implementar (aplican a A y a B)
1. **Estado inicial de la v2**: confirmar empíricamente que la versión nace `Draft` (vía `static_default` + `status` en
   `prefillFrom.exclude`). Ya está preparado en el mod; falta el run.
2. **Carga de los campos del RecordType + atomicidad**: en el crash, el path de versión resolvió `objectType=Curriculum`
   (base). Hay que verificar que la v2 cree también su extensión `rt__Plan__curriculum` (progression, totalCredits, …) y
   que el write base+RT sea **atómico**. Aplica el guard de `version-from-source.js:40`
   (`AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`) y la nota de TICKET-056 sobre el path RT no-atómico. Si la versión
   debe arrastrar los campos del RT, este punto puede requerir trabajo adicional independiente del workflow.

---

## 7. Disposición actual (UPONE-1270 / TICKET-065)

- El rowAction **"Nueva versión"** se dejó visible en el layout de Curriculum (decisión del dev), aunque hoy errorea,
  con el bloqueo documentado (Backlog B2 del ticket).
- Clonar + unicidad por linaje quedaron entregados y verificados E2E.
- Este documento es el insumo para decidir el enfoque (A o B) y ejecutarlo en el sprint que corresponda.
