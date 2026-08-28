---
id: DOC-kb-archive-activity-code-uniqueness-versioning-conflict
project: up1
type: doc
---

# Conflicto de contrato en `Activity.code`: unicidad plana vs versionado

> **Para**: dev/owner de `uengagement-up1` (+ core).
> **De**: curriculum-design (descubierto en UPONE-1271, SP5).
> **Fecha**: 2026-06-15 · **Verificado vigente**: 2026-06-24.
> **Estado**: **conflicto confirmado, sin resolver** — requiere decisión cross-mod. **El fix ya tiene precedente implementado y en producción para `Curriculum`** (`lineageUniqueness.js`, UPONE-1270): para Activity es replicar ese patrón.
> **Tipo**: conflicto de modelo sobre objeto Base compartido (`activity`/`Activity`).

---

## TL;DR

El objeto **`activity`/`Activity` es compartido** entre `curriculum-design` (Courses, **versionables**) y `uengagement-up1` (Services). Hoy `Activity.code` tiene un **UNIQUE plano** que **uengagement declara** (`code.unique: true`). Ese unique **rompe el versionado de Courses** de curriculum-design, porque versionar mantiene el mismo `code` entre versiones del mismo linaje.

**Lo que necesitamos**: cambiar la unicidad de `Activity.code` de **plana → por raíz de linaje** (`code` único solo entre registros con `previousVersionId IS NULL`). Esto **preserva** la unicidad de los Services de uengagement (que son todos raíz) **y** desbloquea el versionado de Courses. Como el `unique: true` lo posee uengagement, **necesitamos su acuerdo** para cambiarlo.

---

## Síntoma

Al versionar un Course (`activity`, recordType Course) desde la UI, el guardado falla con:

> *"Ya existe un registro con ese valor. Usa un valor diferente."*

Es una violación del índice **`Activity_code_key` (UNIQUE sobre `code` solo)** de la DB.

---

## Cómo está definido `Activity` en cada mod (claridad cross-mod)

`Activity`/`activity` es **UN objeto/tabla única, co-definido por TRES mods** (verificado 2026-06-24 — son los únicos; otros solo lo referencian como FK). El codegen **mergea** las declaraciones de todos en `business/Base/activity.json` → un solo schema Prisma → una sola tabla.

| Mod | Qué aporta | Archivo |
|---|---|---|
| **curriculum-design** | El **objeto base** con la semántica de versionado | `objects/activity.json` |
| **uengagement-up1** | El **objeto base** con `code.unique` + el RecordType Service | `objects/Activity.json` + `objects/RecordTypes/rt__Service__Activity.json` |
| **academic-scheduling** | El **RecordType Course** (tabla 1:1 del Course para FK, ej. asignaciones a docentes) | `objects/RecordTypes/rt__Course__activity.json` |

> **Ojo (matiz de ownership):** el RecordType **`Course`** lo define **academic-scheduling**, NO curriculum-design. curriculum-design aporta el **base** (versioning + discriminador `recordType`); academic-scheduling aporta la extensión Course. uengagement aporta la otra mitad del base (`code.unique`) + la extensión Service. **El `code` y su `unique` viven en el BASE** — los RecordTypes (Course/Service) NO declaran `code` ni `unique`, así que el conflicto es 100% a nivel base.

**Las dos declaraciones del BASE que chocan** (curriculum-design vs uengagement):

| Aspecto del base | **curriculum-design** (`activity.json`) | **uengagement-up1** (`Activity.json`) |
|---|---|---|
| Concepto de dominio | "Programa de asignatura" (versionable, género masculino) | "Actividad" (Service, no versionable, género femenino) |
| `metadata.versioning` | **Sí** — `linkageField: previousVersionId`, `versionField: version`, `versionStrategy: increment`, `initialStateField: currentStatusId`, `requiredCapability: activity:version` | (ausente) |
| `metadata.uniqueConstraints` | **`[["previousVersionId","version"]]`** — integridad de la cadena de versiones | (ausente) |
| `code` | `not_null`, **SIN `unique`** — descripción literal: *"Código institucional del programa. **Se mantiene entre versiones del mismo programa.**"* | `not_null`, **`unique: true`** — "Código institucional" |
| `prefillFrom` | `exclude: [currentStatusId, previousVersionId, versionLabel]` + `deepClone: ["sections"]` | (ausente) |
| Campos/relaciones propios | `previousVersionId`, `version`, `versionLabel`, `currentStatusId` (workflow) + `polymorphicChildren: sections` (CurricularSection) | `purpose` (enum), `planningUnitId`→OrgUnit, … |

**Resultado del merge:** la tabla `Activity` queda con **ambas** reglas de unicidad — `code @unique` (de uengagement) **Y** `@@unique([previousVersionId, version])` (de curriculum-design) — que se contradicen (ver §Evidencia técnica 2-3).

**Lo esencial que uengagement necesita entender de NUESTRO lado:** para curriculum-design, `code` es **la identidad del linaje** — se comparte a propósito entre todas las versiones de un mismo Course, por eso **NO** lo declaramos `unique`; en su lugar declaramos `versioning` + `uniqueConstraints([previousVersionId, version])`. **El único punto de fricción es el `code.unique` plano de uengagement**; todo lo demás que cada mod aporta (campos propios, RecordTypes, relaciones) es independiente y compatible — conviven sin problema en la misma tabla.

## Evidencia técnica

### 1. `Activity` lo co-definen varios mods (misma tabla `Activity`)

```
mods/curriculum-design/objects/activity.json       → code.unique: (ausente)   · versionable
   metadata.uniqueConstraints: [["previousVersionId","version"]]
   metadata.versioning: { linkageField: previousVersionId, versionField: version,
                          versionStrategy: increment, initialStateField: currentStatusId }

mods/uengagement-up1/objects/Activity.json          → code.unique: TRUE        ← origen del UNIQUE plano
mods/uengagement-up1/objects/RecordTypes/rt__Service__Activity.json   (los SVC-*)
mods/academic-scheduling/objects/RecordTypes/rt__Course__activity.json
```

### 2. El codegen propaga el `unique` de uengagement

`object-manager/src/services/codegen/generatePrismaSchema.js:429` agrega `@unique` a un campo **solo si** `fieldDef.unique === true`. Como uengagement declara `code.unique: true`, el merge a `objects/business/Base/activity.json` queda con `unique: true`, y el schema generado (`prisma/UPU/schema.prisma`) produce:

```prisma
model Activity {
  code               String  @unique              // ← de uengagement
  version            Int     @default(1)
  previousVersionId  String?
  @@unique([previousVersionId, version])           // ← de curriculum-design (versionado)
  ...
}
```

Las dos reglas **coexisten y se contradicen**: `@@unique([previousVersionId, version])` habilita versiones con el mismo `code`, pero `code @unique` las prohíbe.

### 3. Índices reales en la DB de UPU

```
Activity_pkey                          (id)
Activity_code_key                      (code)                       ← bloquea el versionado
Activity_previousVersionId_version_key ("previousVersionId", version)
```

### 4. La lógica de versionado es correcta — mantiene `code` a propósito

`object-manager/src/graphql/resolvers/helpers/version-from-source.js`: al versionar calcula
`version = max(version del linaje) + 1`, `previousVersionId = source.id`,
`currentStatusId = source.workflow.initialStatusId`. **No toca `code`** — el contrato del
versionado es: misma identidad de código, distinta versión. El choque es exclusivamente con
`Activity_code_key`.

### 5. Estado de datos hoy → cero impacto al cambiar la regla

Los `activity` actuales de UPU (Courses `111026C`/`TIR101` + Services `SVC-*`) son **todos
`version = 1`, `previousVersionId = null`** (raíces). Es decir, hoy "unique por raíz" ≡ "unique
plano". Cambiar la regla **no afecta ningún dato existente**.

---

## Verificación 2026-06-24 (estado vigente)

Re-verificado contra código y DB de UPU; **todo sigue igual que el 2026-06-15**:

| Check | Resultado hoy |
|---|---|
| `uengagement-up1/Activity.json` → `code.unique` | **`true`** (sigue siendo el origen) |
| Base generado (`business/Base/activity.json`) → `code.unique` | **`true`** (codegen lo propaga) |
| DB UPU: `Activity_code_key` (UNIQUE sobre code) | **presente** |
| DB UPU: `Activity_previousVersionId_version_key` | **presente** (los dos índices coexisten) |
| `version-from-source.js` toca `code` | **no** (la lógica de versionado es correcta) |

**Precedente del fix (NUEVO desde el doc original):** existe `object-manager/src/graphql/resolvers/mods/curriculum-design/helpers/lineageUniqueness.js` — implementa **exactamente** la solución propuesta (unicidad por raíz de linaje vía validación de dominio), pero **para `Curriculum`** (regla "una raíz por (institutionId, code)", UPONE-1270/TICKET-065). Para Activity **es replicar ese patrón** (scope `code`, detección de raíz por `asNewVersion`+`previousVersionId`). Ya no es un diseño hipotético: es un patrón validado en runtime.

**`uniqueScopedBy` NO sirve (confirmado en código):** el comentario de `lineageUniqueness.js` lo dice explícito — `uniqueScopedBy` no soporta la cláusula "solo cuando es raíz" (condición parcial `previousVersionId IS NULL`). Por eso el enforcement por raíz es validación de dominio o índice parcial, no `uniqueScopedBy`.

## Casos

| # | Caso | Comportamiento | Bajo "unicidad por raíz" |
|---|---|---|---|
| A | Versionar un Course **Publicado** | ❌ falla con "Ya existe un registro con ese valor" (viola `Activity_code_key`) | ✓ funciona (la versión es no-raíz → exenta) |
| B | Versionar un Course en **Borrador** | ❌ `SOURCE_NOT_VERSIONABLE` (el gate de workflow corta ANTES del insert; `allowsVersioning=false`) — no llega al error de unicidad | igual (gate de estado, independiente de la unicidad) |
| C | Crear **dos Courses raíz** con el mismo `code` | rechazado (flat unique) | rechazado (dos raíces con mismo code) ✓ unicidad preservada |
| D | Crear **dos Services** con el mismo `code` | rechazado (flat unique) | rechazado (Services son raíz) ✓ uengagement mantiene su unicidad |
| E | **Clonar** un Course (nuevo linaje) | el clon debería llevar un `code` nuevo (nueva raíz); si reusa el code, choca | rechazado si reusa code de otra raíz ✓ (verificar que el flujo de clone pida/genere code nuevo) |
| F | Versionar un **Service** (hipotético futuro) | hoy chocaría con el flat unique | ✓ cubierto (versión no-raíz exenta) |

> **Nota caso B (descubierto al reproducir 2026-06-24):** el error de unicidad solo se manifiesta cuando la Activity está en estado **Publicado** (`allowsVersioning=true`); en Borrador el versionado se rechaza antes por el workflow. En el seed UPU todas las Courses están en Borrador, por eso un intento directo da `SOURCE_NOT_VERSIONABLE` y no el friendly-error de unicidad.

## El conflicto de contrato

| Mod | Necesita | Por qué |
|-----|----------|---------|
| **uengagement-up1** | `code` único | sus Services no se versionan; cada Service con un code único |
| **curriculum-design** | `code` NO único por fila | versionar un Course comparte `code` entre versiones del mismo linaje |

El UNIQUE plano refleja el contrato de uengagement y rompe el de curriculum-design. **No es un
bug de un mod**: son dos requerimientos opuestos sobre el mismo campo de un objeto compartido.

---

## Qué necesitamos de eng (petición concreta)

1. **Acuerdo para cambiar `Activity.code` de UNIQUE-plano → UNIQUE-por-raíz** (`code` único entre
   raíces de linaje: `previousVersionId IS NULL`).
2. **Quitar `code.unique: true`** de `mods/uengagement-up1/objects/Activity.json` (es el archivo
   que uengagement posee; por eso lo pedimos, no lo tocamos desde curriculum-design).
3. **Acordar la implementación del enforcement por raíz** (opciones abajo).
4. **Confirmar** que los Services nunca se versionan (si lo hicieran a futuro, el diseño por-raíz
   igual los cubre).

---

## Cómo uengagement mantiene `code` único SIN limitar nuestro versionado (alternativas)

**La clave:** el requisito de uengagement ("dos Services no comparten code") y el nuestro ("las versiones de un Course comparten code") **solo chocan por un UNIQUE plano sobre una columna compartida**. Cualquier enfoque que enforce la unicidad **a nivel de RAÍZ de linaje** (no a nivel de fila) satisface a ambos: los Services son todos raíz → siguen únicos; las versiones (no-raíz) quedan exentas.

> **Insight:** "unicidad por raíz" **ES** la forma de que uengagement conserve su garantía. No hay que elegir entre "code único" y "versionado": el code sigue siendo único **entre raíces**, que es lo único que uengagement crea.

| # | Alternativa | Cómo uengagement conserva la unicidad | Pro | Contra |
|---|---|---|---|---|
| **1 (recom.)** | **Validación de dominio por raíz** — replicar `lineageUniqueness.js` para Activity: al crear una raíz (no `asNewVersion` + `previousVersionId` null), rechazar si ya existe otra raíz con el mismo `code` | Dos Services (raíces) con mismo code → rechazado | **Patrón YA implementado y en producción** (Curriculum); falla-seguro; mensaje claro; sin SQL manual | Enforcement en código, no en DB (TOCTOU de baja concurrencia, aceptable) |
| **2** | **Índice parcial en DB** — `CREATE UNIQUE INDEX ... ON "Activity"(code) WHERE "previousVersionId" IS NULL` | El índice solo aplica a raíces → Services siguen únicos | Enforcement **nativo en DB** (backstop fuerte) | Prisma no lo declara → SQL manual en migración. Combinable con #1 |
| **3** | **Compuesto `@@unique([code, version])`** (nativo Prisma) | Dos raíces (ambas v1) con mismo code → colisionan en (code,1) → rechazado | Nativo, sin SQL; declarativo | **Hueco:** un linaje distinto podría "ocupar" un nº de versión no usado del mismo code (ej. otra raíz como v3). Semántica "único por nº de versión", no "por linaje" |
| **4** | **`uniqueScopedBy`** | — | — | ❌ **NO viable**: confirmado en código (`lineageUniqueness.js`) que `uniqueScopedBy` no soporta la condición parcial "solo cuando es raíz". Descartada |
| **5** | **Enforcement por recordType, lado uengagement** — quitar el flat unique; uengagement valida en SU resolver que no haya dos `Service` (recordType=Service) con el mismo code | uengagement enforce su propia unicidad, acotada a sus Services | Cada mod posee la unicidad de SUS records; cero acople | Requiere que uengagement implemente la validación; **abre la pregunta**: ¿el code debe ser único entre TODOS los activities, o solo entre Services? (ver abajo) |

**Recomendación:** **#1 (replicar `lineageUniqueness.js`)** como enforcement principal, opcionalmente **#2** como backstop en DB. Es el patrón ya validado para Curriculum; para Activity solo cambia el scope (`code`, o `(institutionId, code)` si aplica multi-institución como en Curriculum) y el objeto consultado.

**Pregunta a definir con uengagement (afecta #1/#5):** ¿la unicidad de `code` debe ser **global** (un Course y un Service no pueden compartir code) o **por tipo** (solo entre Services)? Si es global → unicidad por raíz sobre toda la tabla (#1/#2). Si basta entre Services → enforcement scoped por recordType del lado uengagement (#5), aún menos invasivo para nosotros.

### Pasos comunes a #1/#2 (cambio de schema)
- **Quitar `code.unique: true`** de `mods/uengagement-up1/objects/Activity.json` (uengagement posee el archivo → su acuerdo es requerido).
- **Regenerar codegen** (para que `prisma/{tenant}/schema.prisma` deje de tener `code @unique`).
- **Migración de DB: dropear `Activity_code_key`** (y, en #2, crear el índice parcial). **Dropear un índice NO es pérdida de datos** — pero es cambio de schema → path canónico (codegen + apply, o reset controlado).
- **Mantener `@@unique([previousVersionId, version])`** (ya existe) para la integridad de la cadena de versiones.

---

## Impacto y reversibilidad

- **Impacto en uengagement**: nulo en datos actuales (todos raíz). A futuro: dos Services no podrían
  compartir code (igual que hoy). Solo cambia que las *versiones no-raíz* de Courses dejan de chocar.
- **Reversibilidad**: re-agregar el `@unique` plano revierte el cambio (pero re-rompe el versionado
  de Courses).
- **Owner de la decisión**: uengagement (posee `Activity.json` con `code.unique`) + core
  (codegen/migración). curriculum-design es el consumidor bloqueado.

---

## Qué NO es

No es un bug de los tickets de clonado de academicProgram (UPONE-1271 / TICKET-062/066/067), ya
cerrados y verificados; ninguno toca `activity` ni el codegen. El versionado va por un path distinto
(create inmediato vía `useCreateRowAction`), no por el fix de payload de `RecordDetail.handleSubmit`
que se hizo en esos tickets.
