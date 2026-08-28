---
id: DECISION-013
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - modelo-objetos
  - mod-merge
  - core-objects
  - etapa-desarrollo
---

# DECISION-013: Modelar core objects (`Organization`, `OrgUnit`, extender `Institution`) en el mod `curriculum-design` para etapa de desarrollo, con promocion posterior a `business/Base/`

## Contexto

El [Modelo de objetos de negocio Learning Assurance v1.8](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242) declara 3 objetos core de plataforma:

- `Organization` — nodo raiz del tenant (cuenta de cliente), agrupa instituciones legalmente independientes.
- `Institution` — entidad educativa con acreditacion propia (universidad, instituto, etc).
- `OrgUnit` — nodo en uno de los 3 arboles organizacionales (Geographic / AcademicGovernance / AcademicExecution).

Todos estan documentados como "En implementacion" en Confluence pero el estado real en `up1/object-manager/objects/business/Base/`:

| Objeto Confluence | Existe en core? | Estado |
|------------------|----------------|--------|
| `Organization` | NO | gap |
| `Institution` | SI, pero desalineado con Confluence v1.8 | tiene `code`/`parentId`/`isActive`/`metadata` legacy; faltan `organizationId`/`legalName`/`type` enum/`country`/`regulatoryCode`/`status` enum |
| `OrgUnit` | NO | gap (DECISION-002 lo postergaba) |

El detail del programa de asignatura (TICKET-009 / UPONE-1035) requiere que `AcademicActivity.executionUnitId` apunte a un `OrgUnit` real (RT=AcademicExecution). Sin OrgUnit modelado no hay como mostrar este dato correctamente.

## Drivers

1. **Desbloqueo del detail**: el campo `executionUnitId` deja de ser stub si OrgUnit existe.
2. **Alineacion con Confluence**: el modelo Confluence v1.8 es la fuente de verdad. El core actual esta atras.
3. **Etapa de desarrollo**: el equipo puede iterar el modelo dentro del mod sin coordinacion con platform UP1 hasta que el modelo este validado funcionalmente.
4. **Append-only merge del sync**: la mecanica del Phase 2 del sync ([`fileSync.js:709`](../../../../up1/object-manager/scripts/sync/fileSync.js#L709)) permite que el mod agregue campos al schema Base sin romper el core actual.

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| A. Pedir al equipo platform UP1 que cree los 3 objetos en core | Modelo correcto desde el inicio. Sin duplicacion temporal | Requiere coordinacion externa, alarga timing del SP1/SP2, depende de prioridad ajena |
| B. Crear los 3 objetos en el mod via append-only merge (elegida) | Desbloquea TICKET-009. Cero coordinacion externa. Cuando el modelo se valide, los archivos se mueven a `business/Base/` y se eliminan del mod (operacion mecanica) | Coexistencia temporal de campos legacy del core (`recordType`/`isActive` de Institution) con campos nuevos (`type`/`status`) — semanticamente redundantes hasta promocion |
| C. Usar Extensions (`ext__<CLIENT>__institution.json`) | Patron conocido del proyecto | Incorrecto semanticamente: los campos del modelo Confluence son universales, no custom de un cliente. Extensions estan reservadas a personalizaciones por-cliente |

## Decision

**Adoptar Opcion B**. Crear/extender los 3 objetos en `mods/curriculum-design/objects/`:

1. **`mods/curriculum-design/objects/Organization.json`** — schema completo segun Confluence (`name` NOT NULL, `legalName` nullable, `country` NOT NULL ISO, `status` enum [Active/Suspended/Terminated], `metadata` JSON nullable). El sync Phase 2 lo crea en `business/Base/organization.json` (no existia).

2. **`mods/curriculum-design/objects/Institution.json`** — append-only sobre Base. Solo declarar campos nuevos:
   - `organizationId` (FK → Organization, NOT NULL)
   - `legalName` (nullable)
   - `type` (enum: University / College / Institute / TechnicalCenter / ContinuingEducation)
   - `country` (NOT NULL ISO 3166-1 alpha-2)
   - `regulatoryCode` (nullable)
   - `status` (enum: Active / Suspended / Terminated)

   NO repetir campos ya en core (`name`, `code`, `recordType`, `parentId`, `isActive`, `metadata`). El merge los preserva.

3. **`mods/curriculum-design/objects/OrgUnit.json`** — schema completo segun Confluence:
   - `organizationId` (FK NOT NULL)
   - `institutionId` (FK nullable, requerido a nivel negocio si `recordType=AcademicGovernance`)
   - `parentId` (self-FK nullable, Composite)
   - `recordType` (enum: Geographic / AcademicGovernance / AcademicExecution, NOT NULL)
   - `name` (NOT NULL)
   - `code` (nullable)
   - `type` (string nullable, sub-tipo extensible: Faculty/School/Department/Campus/etc)
   - `status` (enum: Active / Suspended / Discontinued)

4. **Seed actualizado**: `_data-univalle.js` y `_data-aiep.js` crean instancias de los 3 objetos para Universidad del Valle (CO) y AIEP (CL), y conectan `AcademicActivity.executionUnitId` al OrgUnit creado (RT=AcademicExecution).

5. **Naming**: PascalCase consistente con el resto de objetos del mod (`AcademicActivity.json`, `CurricularSection.json`).

## Coexistencia con campos legacy del core

- **Institution.recordType** (string libre) coexiste con **Institution.type** (enum). Semanticamente redundantes. Documentado como deuda para promocion a core. El seed setea AMBOS en el upsert para no perder la clave `recordType` que algun layout exista declarando.
- **Institution.isActive** (boolean) coexiste con **Institution.status** (enum 3-state). Idem. Seed setea ambos.

## Promocion a core (proceso futuro)

Cuando el equipo platform UP1 valide el modelo:

1. Mover los campos del JSON del mod al JSON de `business/Base/` correspondiente.
2. Eliminar el JSON del mod (excepto si se necesita override per-mod).
3. Actualizar el seed del mod para no asumir merge — los campos vienen del Base.
4. Considerar deprecar `Institution.recordType` y `Institution.isActive` (legacy) en favor de `type` y `status`.
5. Comunicar a otros mods que dependian del schema legacy.

## Supersede

Esta decision **supersede [DECISION-002](DECISION-org-unit-defer.md)** (org-unit-defer). El campo `executionUnitId` deja de ser nullable-sin-FK y pasa a tener FK real a `OrgUnit` cuando el seed corra.

## Consecuencias positivas

- TICKET-009 puede mostrar `executionUnitId` real en el detail.
- Los listados/details del mod pueden filtrar por OrgUnit cuando se necesite.
- Modelo del mod alineado con Confluence sin coordinacion externa.
- Promocion a core es operacion mecanica de mover archivos.

## Consecuencias negativas

- Coexistencia temporal de campos redundantes en Institution (legacy + Confluence).
- Cuando se promueva, hay que eliminar campos legacy — riesgo de migracion de datos para otros mods que usen `recordType` o `isActive`.
- Otros mods activos (retention-wellbeing, hello-world-mod, object-manager-editor) heredan los campos nuevos en el merge — verificar que no rompa su sync.

## Confirmacion

Sesion 2026-04-29 con eduardo.bacon@uplanner.com. Eligio Opcion B con justificacion: "para etapa de desarrollo lo implementaremos en el modulo para despues puedan ser elevados a core, debemos crear los objetos, modelarlos y ver los seed posible para tener las instituciones de univalle y aiep, segun la definicion de los objetos en la documentacion".

## Referencias

- Modelo Confluence v1.8: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242
- DECISION-002 (superseded): [DECISION-org-unit-defer.md](DECISION-org-unit-defer.md)
- Sync append-only merge: [up1/object-manager/scripts/sync/fileSync.js:709](../../../../up1/object-manager/scripts/sync/fileSync.js#L709) (`applyModToObject`)
- Institution actual core: [up1/object-manager/objects/business/Base/institution.json](../../../../up1/object-manager/objects/business/Base/institution.json)
- Spec del agregado: [specs/curriculum-design/programa-de-asignatura.md](../specs/curriculum-design/programa-de-asignatura.md)
