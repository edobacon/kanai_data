---
id: DOC-kb-archive-cambios-versionamiento-v2-a-v3
project: up1
type: doc
---

# Reporte de cambios — `diseño-versionamiento_v2` → `_v3`

| Campo | Valor |
|---|---|
| **Autor** | Eduardo Bacon |
| **Fecha** | 2026-05-26 |
| **Prisma** | **Implementacion primero**. v2 acepto el codigo/Confluence/KB como fuente de verdad inmutable y limito el diseño para acomodarse. v3 invierte: el diseño expresa el vision original de v1, y propone cambios en la fuente de verdad para sostenerlo. |
| **Reemplaza a** | `diseño-versionamiento_v2.md` + `historias-sprint-4_v2.md` |
| **Fuente del prisma** | `diseño-versionamiento_v1.md` (intencion original PM) + brechas detectadas en `cambios-versionamiento_v1-a-v2.md` |

---

## Filosofia del cambio v2 → v3

v2 aplico el principio "doc/codigo es SOT, ajusta el diseño". Esto produjo concesiones:

- `versionStrategy: "user-provided"` en vez de `"increment"` (porque `version` es String libre).
- `allowedFromStates: ["PUB"]` en vez de `["Approved", "Published"]` (porque Activity workflow no tiene APR).
- Sintaxis `deepClone` polimorfica compleja (porque CurricularSection usa FK polimorfica abierta).
- Campo nuevo `versionSourceId` en `changeLog` (porque `sourceRefId` esta tomado por L40).

Cada concesion **funciona** pero deja **deuda conceptual** o **deuda declarativa**:

- El dev de un mod nuevo escribe sintaxis polimorfica para todas las relaciones del agregado — verbosa, repetitiva.
- El audit chain tiene dos campos similares (`sourceRefId` y `versionSourceId`) que pueden confundir.
- El usuario que versiona un programa institucional debe escribir el codigo de version manualmente — sin asistencia de incremento.
- "Approved" como concepto del modelo de negocio no existe en el workflow — hay una transicion "Aprobar y publicar" que mete los dos pasos en uno, perdiendo granularidad de auditoria.

v3 propone **8 cambios en la fuente de verdad** (`IMP-1..IMP-8`) que eliminan estas concesiones y entregan el vision original de v1 con implementacion mas limpia. Cada cambio tiene su costo declarado.

El doc no obliga a tomar los 8 — categoriza por costo/riesgo y permite al PM/arquitecto elegir subset. La propuesta default v3 (recomendada) toma 6.

---

## IMP-1 — Migrar `version` a Int + introducir `versionLabel: String`

### Que cambia en SOT

- **Schema**: `Activity.version: Int` (antes `String`). Nuevo campo `Activity.versionLabel: String?` (display libre, ej. `"v2022-actual"`, `"Semestre 2026-1"`).
- **Confluence**: actualizar CAP-CUR-018. La cadena de version queda asi:
  - `version` (numerico, system-managed): garantiza orden y unicidad de la cadena.
  - `versionLabel` (texto libre, user-managed): preserva la codificacion institucional.
- **Seed**: `_data-univalle.js`, `_data-aiep.js` cambian `PROGRAMA_VERSION = 1` + `PROGRAMA_VERSION_LABEL = "v2022-actual"`.
- **Legacy examples**: actualizar `specs/curriculum-design/legacy-examples.md` con la nueva estructura.

### Que habilita

- `versionStrategy: "increment"` funciona naturalmente para Activity. v3 vuelve al diseño original de v1.
- Cadena ordenable: `getVersionChain` puede ordenar por `version` (Int) y no necesita derivar orden del `createdAt`.
- Constraint "solo una version vigente por curso" (BR-VER-001) es expresable como query indexada.

### Costo

- **Migracion de datos**: schema change en Activity. Los 2 records seedeados pasan a `version: 1` con `versionLabel: "v2022-actual"`. Trivial — 2 records en UPU pre-produccion.
- **UI**: el form de Activity gana un campo `versionLabel`. El campo `version` queda readOnly (lo gobierna el sistema).
- **Confluence change**: una pagina actualizada. Coordinar con Esteban antes.
- **Esfuerzo**: 1 HU separada (HU-0a en v3 stories).

### Riesgo

Bajo. Pre-produccion, 2 records reales. Si Confluence retro-rechaza la dualidad version/versionLabel, hay que revertir — pero el cambio es self-contained.

### Recomendacion default v3: **adoptar**.

---

## IMP-2 — Agregar estado `APR` al workflow `activity-standard`

### Que cambia en SOT

- **Seed** (`_data-workflow-objects.js`): agregar transiciones:
  - `REV-DEC → APR` ("Aprobar", `requiresComment: false`)
  - `APR → PUB` ("Publicar", `requiresComment: false`)
  - Remover transicion combinada `REV-DEC → PUB` ("Aprobar y publicar") O mantenerla como atajo.
- **Confluence**: ya menciona `Approved` y `Published` como estados separados (BR-WKF-001 verbatim, DECISION-005 original). La implementacion actual es la que se desvio — la SOT de negocio ya tenia APR.

### Que habilita

- `allowedFromStates: ["APR", "PUB"]` como propuso v1.
- Granularidad de auditoria: registro distinto "fue aprobado" vs "fue publicado". Util cuando el aprobador y el publicador son personas distintas.
- Coherencia con el modelo del PM (Confluence usa `Approved` separado).

### Costo

- **Trivial en codigo**: agregar 2 entries al seed + actualizar tests del seed.
- **Datos**: ninguna Activity productiva esta hoy en estado que tuviera que mapearse — pre-produccion.
- **Reseed**: `npm run seed --tenant=UPU` aplica los 2 nuevos statuses + transiciones.
- **Esfuerzo**: <0.5 HU (combinable con HU-0 de SOT changes).

### Riesgo

Muy bajo. Aditivo, no breaking. Decision menor que puede tomar JuanDi+Esteban en una llamada de 15min.

### Recomendacion default v3: **adoptar**.

---

## IMP-3 — Renombrar `sourceRefId` → `parentChildRefId` en `changeLog`

### Que cambia en SOT

- **Schema** (`changeLog.json`): renombrar 3 campos:
  - `sourceRefId` → `parentChildRefId`
  - `sourceRefName` → `parentChildRefName`
  - `sourceRefType` → `parentChildRefType`
  - Descripciones actualizadas con la semantica explicita del patron L40 ("id del hijo polimorfico consolidado al padre").
- **Resolver** (`auditCapture.resolver.js`): rename de `resolvedSourceRef*` → `resolvedParentChildRef*`.
- **Flow n8n** (`flows/audit-capture.json`): pass-through con nombres nuevos.
- **Tests** y assertions del SP3.

### Que habilita

- `sourceRefId` (nombre original) queda libre para el rol que v1 le pedia: id del objeto origen al versionar.
- `source` enum puede incluir `"Clone"` como v1 proponia, distinguiendo audit rows de version sin colision con L40.
- Naming semantico — "parentChildRef" describe exactamente el patron L40.

### Costo

- **Mediano**. Toca: 1 JSON, 1 resolver, 1 flow n8n, 4-5 tests, migracion del schema en BD (rename de columnas en Prisma).
- **Sin perdida de datos**: rename, no drop.
- **Esfuerzo**: 1 HU dedicada (HU-0c). Riesgo de regresion del audit chain SP3 — testear extensivo.

### Riesgo

Medio. El audit chain SP3 acaba de cerrar (TICKET-020). Un rename mal hecho puede romper la captura de cambios polimorficos (Modalidad/Sesion en Activity). Mitigacion: tests de regresion completos del audit chain antes del merge.

### Recomendacion default v3: **adoptar (cuidadosa)** — vale por la claridad semantica que gana el changeLog. Si el equipo prefiere no tocar audit chain, fallback es mantener `versionSourceId` separado (modelo v2).

---

## IMP-4 — Codegen soporta `polymorphicChildren` en JSON del object (alternativa a polimorfismo abierto explicito)

### Que cambia en SOT

- **Codegen del platform** ([object-manager/src/services/codegen/](object-manager/src/services/codegen/)): cuando un object declara `polymorphicChildren`:

  ```json
  "polymorphicChildren": [
    {
      "name": "sections",
      "object": "CurricularSection",
      "via": "ownerType/ownerId",
      "ownerTypeValue": "Activity"
    }
  ]
  ```

  el codegen genera:
  - Un resolver virtual `Activity.sections` que hace `findMany({ where: { ownerType: "Activity", ownerId: parent.id } })`.
  - Una entrada en el "relation map" interno del platform que `prefillFrom.deepClone` consulta.

- **Activity.json**: declara `polymorphicChildren` (no mas sintaxis polimorfica verbosa en `prefillFrom`).
- **CurricularSection** mantiene su FK polimorfica abierta — el cambio es solo en como Activity LEE su lado de la relacion.

### Que habilita

- `prefillFrom.deepClone: ["sections"]` funciona como v1 proponia. La complejidad polimorfica vive **una sola vez** en el codegen, no en cada JSON.
- `CurricularLink` se maneja con un bloque adicional `polymorphicChildrenDerived` para FKs internas (similar pero simpler que la v2 polymorphic-derived).
- Futuros adoptantes (Syllabus, CurriculumPlan) se benefician sin escribir sintaxis polimorfica.
- Mantiene la flexibilidad del polimorfismo abierto (CurricularSection puede pertenecer a Activity, Syllabus, etc.).

### Costo

- **Alto en platform** (object-manager): nuevo feature de codegen. Requiere diseño detallado (¿como se autoresuelven los tipos GraphQL? ¿como interactua con permissions?).
- **Esfuerzo**: 2-3 HUs dedicadas al feature de codegen (HU-0d, HU-0e). Spike de 1-2 dias antes.
- **Cero costo en mods**: el JSON queda mas declarativo, no menos.

### Riesgo

Alto en cuanto a scope. Es trabajo de plataforma que excede el ambito del versionamiento. Si SP4 no alcanza, fallback es la sintaxis polimorfica explicita en `prefillFrom` (modelo v2) — mantiene el versionamiento entregable.

### Recomendacion default v3: **adoptar parcial** — entregar el codegen para `polymorphicChildren` (lectura), dejar `polymorphicChildrenDerived` (con remap de FKs) para SP5. En SP4: Activity.json declara `polymorphicChildren: [...sections...]` + `prefillFrom.deepClone` para sections es simple (`["sections"]`); CurricularLink se maneja con un hook custom temporal del mod (NO el `prefillFrom` declarativo). HU8 documenta el hook como temporal.

---

## IMP-5 — Codegen auto-declara self-references reflexivas

### Que cambia en SOT

- **Codegen del platform**: cuando un field termina en `previousVersionId` / `nextVersionId` / `parentId` (patrones convencionales), el codegen auto-agrega `@relation` reflexivo en Prisma sin requerir `isForeignKey + references` explicitos en el JSON.
- Alternativa mas conservadora: codegen detecta cuando `references: "<MismoObjectName>"` esta declarado y genera la relation reflexiva.

### Que habilita

- HU8 no necesita el cambio en `activity.json` para agregar `isForeignKey`. El field `previousVersionId String?` se promueve a FK reflexiva automaticamente.
- Mods futuros con linaje (`previousVersionId`, `parentId` en arboles, etc.) no requieren boilerplate.
- HU4 (validacion `linkageField FK reflexivo`) se simplifica — codegen ya lo garantiza.

### Costo

- **Bajo a medio en platform**. Una funcion en codegen + tests.
- **Esfuerzo**: <1 HU (combinable con HU-0).

### Riesgo

Bajo. Aditivo, no rompe nada.

### Recomendacion default v3: **adoptar**.

---

## IMP-6 — `workflowId` / `currentStatusId` SET NOT NULL en Activity

### Que cambia en SOT

- **Migracion Prisma**: SET NOT NULL en `Activity.workflowId` y `Activity.currentStatusId` (ya hay default seedeado post-TICKET-019 S15).
- **JSON** (`activity.json`): actualizar `not_null: true` en ambos campos.
- Actualizar las descripciones que mencionan "nullable hasta S14" — el S14 quedo deferido, esto cierra el loop.

### Que habilita

- Resolver de versionamiento (HU3) asume FKs poblados — no necesita manejar el caso null.
- Visibilidad del row action (HU7) no necesita fail-closed defensivo — siempre hay un estado.
- Codigo del mod (resolvers, layouts) ya no defiende contra null en campos que ya esta poblados en seed.

### Costo

- **Trivial**: 1 migracion Prisma + actualizar 2 not_null. Los datos existentes (2 records UPU) ya tienen los FKs poblados post-S15.
- **Esfuerzo**: <0.3 HU (combinable con HU-0).

### Riesgo

Muy bajo. Las instancias UPU ya estan migradas. Verificar antes que no quede ninguna fila con FK null.

### Recomendacion default v3: **adoptar**.

---

## IMP-7 — Unificar `AcademicActivity` → `Activity` en specs del KB

### Que cambia en SOT

- **Specs del mod en deckard** (`projects/up1/specs/curriculum-design/`): search-and-replace `AcademicActivity` → `Activity` en:
  - `overview.md`
  - `programa-de-asignatura.md`
  - `legacy-examples.md`
  - `open-questions.md`
  - `business-rules/BR-VER-*.md`
  - `business-rules/BR-WKF-*.md`
  - `capabilities/CAP-CUR-*.md`
- Mantener mencion historica del rename en una linea ("renombrado de AcademicActivity post-TICKET-019").

### Que habilita

- KB y codebase consistentes. Nadie lee specs y se confunde con un nombre que ya no existe.
- HU8 no necesita la nota "tratar el codebase como fuente de verdad" — ambos coinciden.
- Reduce friccion para devs nuevos.

### Costo

- **Trivial**: tarea de docs. ~30 minutos con grep + sed.
- **Esfuerzo**: <0.2 HU (combinable con HU-12 docs).

### Riesgo

Cero. Doc-only.

### Recomendacion default v3: **adoptar**.

---

## IMP-8 — Agregar `"Clone"` al enum `action` de changeLog (no a `source`)

### Que cambia en SOT

- **changeLog.json** enum `action`: agregar `"Clone"` a la lista actual `[Create, Update, Delete, StateTransition, MADSSync, Import, Restore]`.
- **Resolver** `recordAuditEvent`: aceptar `operation: "clone"` y persistir `action: "Clone"`.
- **Flow n8n** `audit-capture`: incluir routing para el caso clone.

### Que habilita

- Audit chain distingue semanticamente "creacion nueva" de "version derivada":
  - `action="Create"` = scratch.
  - `action="Clone"` = derivado de otro (con `sourceRefId` poblado tras IMP-3 — ID del origen).
- Coherencia con la taxonomia del enum: `action` describe OPERACION, no canal. `Clone` cabe ahi naturalmente; en `source` (canal/origen) chocaria con `DirectEdit`/`Workflow`.

### Costo

- **Bajo**: 1 enum value + 1 case en resolver + 1 nodo en flow n8n + tests.
- Backward compatible: aditivo, no breaking.
- **Esfuerzo**: <0.5 HU (combinable con HU-9).

### Riesgo

Muy bajo. Aditivo.

### Recomendacion default v3: **adoptar**.

---

## Tabla decisional — ¿que se adopta en v3?

| # | Cambio | Costo | Riesgo | Recomendacion v3 | Si NO adopta → fallback |
|---|--------|-------|--------|------------------|--------------------------|
| **IMP-1** | `version` Int + `versionLabel` String | Bajo | Bajo | **Adoptar** | v2 fallback: `versionStrategy: user-provided` |
| **IMP-2** | Agregar `APR` al workflow Activity | Trivial | Muy bajo | **Adoptar** | v2 fallback: `allowedFromStates: ["PUB"]` |
| **IMP-3** | Rename `sourceRefId` → `parentChildRefId` | Medio | Medio | **Adoptar** | v2 fallback: campo nuevo `versionSourceId` |
| **IMP-4** | Codegen `polymorphicChildren` | Alto | Alto | **Adoptar parcial** (solo lectura, NO derived) | v2 fallback: sintaxis polimorfica explicita en prefillFrom |
| **IMP-5** | Codegen auto self-refs | Bajo | Bajo | **Adoptar** | v2 fallback: declarar `isForeignKey` en HU8 |
| **IMP-6** | SET NOT NULL workflowId/currentStatusId | Trivial | Muy bajo | **Adoptar** | v2 fallback: defensive null handling |
| **IMP-7** | KB rename `AcademicActivity → Activity` | Trivial | Cero | **Adoptar** | v2 fallback: nota al pie sobre KB lag |
| **IMP-8** | `"Clone"` en enum `action` | Bajo | Muy bajo | **Adoptar** | v2 fallback: no agregar, distinguir por `versionSourceId != null` |

**Default v3 propuesto**: adoptar los 8 (IMP-4 en variante parcial).

**Esfuerzo total SOT changes**: ~3-4 HUs adicionales en SP4 (HU-0a..HU-0g), ejecutables en la primera semana en paralelo con las HUs base de versionamiento.

---

## Que se simplifica en el diseño v3 respecto a v2

Tras adoptar los 8 IMPs:

| Aspecto | v2 (limitado por SOT) | v3 (con SOT modificada) |
|---------|-----------------------|--------------------------|
| `versionStrategy` para Activity | `user-provided` (con modal user-input + manejo de errores) | `increment` (system-managed, sin modal) |
| `allowedFromStates` para Activity | `["PUB"]` (concesion) | `["APR", "PUB"]` (vision PM) |
| Sintaxis `deepClone` para sections | Polimorfica explicita en prefillFrom de Activity | `"deepClone": ["sections"]` (gracias a `polymorphicChildren` declarado a nivel object) |
| Campo en changeLog para origen de version | `versionSourceId` nuevo (2 campos similares) | `sourceRefId` (1 campo, semantica `Clone` action) |
| FK reflexivo `previousVersionId` | HU8 declara `isForeignKey` explicito | Codegen lo infiere — Activity.json sin cambios |
| Manejo de FKs null en source | HU3/HU7 defensivos | Sin defensa — FKs always present (SET NOT NULL) |
| KB referencia `AcademicActivity` | v2 doc lo acepta y nota al pie | KB ya unificado |
| Audit row de version | `action=Create, source=DirectEdit, versionSourceId=X` | `action=Clone, sourceRefId=X` |

---

## Que se mantiene de v2 (cambios validos independiente del prisma)

Algunos cambios del v1 → v2 son correctos por evidencia factual y aplican en v3:

- **C3** — el doc no debe afirmar "`duplicateReport` resolver no implementado": el resolver SI esta implementado y cableado. v3 mantiene la correccion en seccion 3.2.
- **C4 (parcial)** — la realidad polimorfica de CurricularSection sigue siendo el modelo. v3 la maneja via IMP-4 (codegen) en lugar de via sintaxis explicita en cada JSON.
- **Naming `objectType` no `objectName`** — alineado en v3.
- **`previousVersionId` necesita declaracion FK** — en v3 lo resuelve IMP-5 (codegen auto), no HU8 manual.

---

## Pendientes que v3 elimina (vs v2)

| Pendiente v2 | Estado en v3 |
|---|---|
| **P1** — ¿Links se vacian o remapean? | **Resuelto en v2** por BR-VER-002 (remapear). v3 lo deja resuelto. |
| **P2** — ¿Sintaxis polimorfica completa o hook custom? | **Reemplazado por IMP-4** — codegen lo absorbe a nivel platform, sin sintaxis explicita en cada JSON del mod. Decision movida a "¿IMP-4 entrega solo lectura o tambien derived en SP4?" |
| **P3** — ¿Codegen soporta self-refs reflexivas hoy? | **Reemplazado por IMP-5** — si no las soporta, se agrega el feature al codegen. No bloquea. |

v3 introduce pendientes nuevos en su lugar (mas concretos):

| Pendiente v3 | Quien decide |
|---|---|
| **P3.1** | ¿Coordinamos con Esteban la actualizacion de CAP-CUR-018 para `version` numerico + `versionLabel`? (IMP-1) | Esteban (PM) |
| **P3.2** | ¿IMP-2 (APR state) se agrega "puro" (rompiendo la transicion "Aprobar y publicar") o como atajo coexistente? | JuanDi + Esteban |
| **P3.3** | ¿IMP-3 (rename audit fields) cabe en SP4 dado el riesgo de regresion del audit chain? | Klaus + JuanDi |
| **P3.4** | ¿IMP-4 entrega solo lectura en SP4 (`polymorphicChildren`) o tambien derived con remap (`polymorphicChildrenDerived`)? | JuanDi (spike) |

---

## Composicion del sprint v3

Con los 8 IMPs adoptados:

| Track | HUs en v3 |
|-------|-----------|
| **Track 0 — SOT changes** (nuevo) | HU-0a (version Int + versionLabel), HU-0b (APR state), HU-0c (rename audit fields), HU-0d (codegen polymorphicChildren), HU-0e (codegen self-refs), HU-0f (SET NOT NULL), HU-0g (KB rename + Clone en action enum) |
| **Track 1 — Core object-manager** | HU-1..HU-6 simplificadas (sin manejo user-provided, sin defensive null, sin sintaxis polimorfica explicita) |
| **Track 2 — Core layout** | HU-7 simplificada (sin modal de version, sin fail-closed null) |
| **Track 3 — Aplicacion curriculum-design** | HU-8 simplificada (config 12 lineas como prometia v1), HU-9 simplificada (un solo campo en enum `action`), HU-10, HU-11 |
| **Track 4 — Docs** | HU-12 |
| **Track 5 — Proceso** | HU-13 |

**Total estimado v3**: 13 HUs base + 7 sub-HUs de track 0 = **~20 HUs**. Mas grande que v2 pero **mas declarativo** y con **mejor inversion a futuro** (los IMPs benefician todo el platform, no solo versionamiento).

Si el sprint no acomoda 20 HUs:

- Mover HU-0d (polymorphicChildren) a SP5 → v3 cae a la sintaxis polimorfica explicita de v2 SOLO para Activity, codegen entrega en SP5. El resto de los IMPs queda.
- Esto baja a ~17 HUs sin perder mucho del vision.

---

## Apendice — alineamiento del v3 con vision original v1

| Vision v1 (original) | v2 (limitada por SOT) | v3 (SOT modificada) |
|----------------------|------------------------|----------------------|
| `versionStrategy: "increment"` para Activity | `user-provided` | `increment` ✓ |
| `allowedFromStates: ["Approved", "Published"]` | `["PUB"]` | `["APR", "PUB"]` ✓ |
| `"deepClone": ["sections"]` simple | Sintaxis polimorfica explicita | `["sections"]` simple ✓ |
| `source=Clone` en audit | `versionSourceId` extra | `action=Clone, sourceRefId=X` ✓ (semanticamente correcto) |
| ~12 lineas en JSON del object para activar | ~30 lineas con polimorficos | ~12-15 lineas ✓ |
| Sin codigo nuevo del mod | Sin codigo nuevo del mod ✓ | Sin codigo nuevo del mod ✓ (excepto P3.4) |

v3 entrega la promesa de v1, **con el costo de modificar la SOT en los lugares donde la SOT no encajaba**. Esto es una inversion — el primer adoptante (Activity) paga el costo de la limpieza de SOT, pero los adoptantes futuros (Syllabus, CurriculumPlan, etc.) reciben la capacidad declarativa **completa**.
