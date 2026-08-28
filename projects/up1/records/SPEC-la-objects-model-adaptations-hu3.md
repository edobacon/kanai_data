---
id: SPEC-la-objects-model-adaptations-hu3
project: up1
type: doc
module: learning-assurance
status: active
tags:
  - workflow
  - adaptations
  - codebase
  - confluence-v1.10
  - hu3
  - sprint-sp3
---

# Modificaciones al modelo de Confluence v1.10 — implementacion HU3 (UPONE-1099)

> **Proposito de este documento**: presentar al PM todos los puntos donde la implementacion en codigo de HU3 difiere de la especificacion canonica de Confluence v1.10, los motivos en cada caso, las alternativas evaluadas, y las opciones disponibles si se quiere reconsiderar.
>
> **Audiencia**: Product Manager (Esteban Cortes Sandoval) + Tech Lead.
>
> **Estado**: implementacion en curso. Modificaciones aplicadas pero reversibles.

---

## Resumen ejecutivo

Al implementar HU3 (los 4 objetos del modelo Workflow segun Confluence "Modelo de objetos de negocio Learning Assurance" v1.10), encontramos **2 puntos** donde la especificacion canonica se modifica al traducirla al codigo. Son **adaptaciones tecnicas obligadas** por restricciones del codegen UP1 — sin estos cambios, el codigo no compila.

### Las 2 modificaciones de un vistazo

| # | Punto del modelo Confluence v1.10 | Implementacion en codigo UP1 |
|---|------------------------------------|------------------------------|
| **A.1** | Campo `workflow.status` enum (Draft/Active/Archived) | Campo renombrado a **`workflow.lifecycle`** (enum identico, solo cambia el nombre) |
| **A.2** | `workflow.createdBy` y `workflowTransitionHistory.userId` como `UUID` (FK a CoreUser) | Tipo cambiado a **`integer`** (FK al modelo `core_User`, cuyo `id` es `Int` por convencion del codebase) |

### Recomendacion del dev

Aceptar las 2 modificaciones como permanentes en esta version. Son obligadas por la implementacion actual de UP1. Si el PM quiere reconsiderar alguna, este doc tiene los datos para tomar la decision (incluido el costo estimado de revertirla — generalmente requiere tickets dedicados al equipo platform).

Lo unico que requiere accion: actualizar Confluence v1.11 para reflejar las modificaciones, o anotar las divergencias en una seccion de "Aclaraciones sobre el codebase UP1" en el documento canonico.

---

# Adaptaciones tecnicas obligadas

Estas 2 modificaciones fueron necesarias por restricciones del codegen UP1. Sin estos cambios, el codigo no compila.

## A.1 Campo `workflow.status` → `workflow.lifecycle`

### Lo que dice Confluence v1.10

Cita verbatim de la pagina canonica (page 2038366242, seccion "Objetos de plataforma — Workflow > workflow > Campos"):

> `status` | enum | Si | Ciclo de vida del workflow. Draft / Active (en uso, congelado) / Archived. Inmutable post-uso: mientras Draft se puede editar libremente; al primer documento que lo referencia, pasa a Active y se congela. Para evolucionar: clonar y crear uno nuevo.

El campo se llama explicitamente `status`.

### Lo que se implemento en codigo UP1

En `mods/curriculum-design/objects/workflow.json` el campo se llama **`lifecycle`** en lugar de `status`. El enum y sus valores son **identicos** a la especificacion canonica:

```json
"lifecycle": {
  "type": "string",
  "title": "Lifecycle",
  "not_null": true,
  "enum": ["Draft", "Active", "Archived"],
  "static_default": "Draft",
  "description": "Ciclo de vida del workflow. Draft = editable libremente. Active = en uso, congelado. Archived = retirado."
}
```

En Prisma queda como:

```prisma
model workflow {
  ...
  lifecycle  workflowLifecycle  @default(Draft)
  ...
}

enum workflowLifecycle {
  Draft
  Active
  Archived
}
```

### Razon tecnica del cambio

El codegen de UP1 (`up1/object-manager/src/services/codegen/generatePrismaSchema.js`, linea 926) genera nombres de enum de Prisma de forma **hardcoded** segun el patron:

```javascript
const enumName = `${objectType}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
```

Para el campo `workflow.status`, el codigo generaria:
- `objectType = "workflow"`
- `fieldName = "status"`
- → `enumName = "workflowStatus"`

Pero **`workflowStatus` ya es el nombre del modelo principal** (los 4 objetos del modelo workflow son: `workflow`, `workflowStatus`, `workflowTransition`, `workflowTransitionHistory`). Al intentar generar el enum, Prisma reporta:

```
Error: The model "workflowStatus" cannot be defined because a enum with that name already exists.
```

Sin renombrar el campo, el codigo NO compila. La colision es inherente a la convencion de naming del codegen + a la propia spec canonica que define un objeto llamado `workflowStatus`.

### Evidencia

| Origen | Referencia |
|--------|------------|
| Codigo del codegen | `up1/object-manager/src/services/codegen/generatePrismaSchema.js:926` |
| Mensaje de error Prisma | `Error code: P1012 — The model "workflowStatus" cannot be defined because a enum with that name already exists` (validacion BASEMODEL schema, linea 1010 generada) |
| Modelo en conflicto | `model workflowStatus { ... }` definido por el archivo `workflowStatus.json` del mod (un objeto separado, con sus propios campos `code`, `name`, `category`, etc.) |

### Implicancia API y UI

| Capa | Impacto |
|------|---------|
| Prisma schema | Campo se llama `lifecycle`. Enum `workflowLifecycle` con 3 valores |
| GraphQL API auto-generada | Cliente consulta `workflow.lifecycle` (no `workflow.status`). Mutation `updateWorkflow(input: { lifecycle: ... })` |
| Front-end consumidor (HU4 y futuros) | Layout JSON del workflow declara `lifecycle`. Translations (i18n) usan key `workflow.lifecycle` |
| Seed UPU (HU3) | Los 5 workflows del seed inicial se cargan con `lifecycle: "Draft"` (ver tambien Modificacion B.1) |
| Documentacion del mod | El README del seed explica el nombre `lifecycle` con referencia a esta adaptacion |

### Alternativas evaluadas

| Opcion | Resultado | Razon de descarte |
|--------|-----------|-------------------|
| Mantener `workflow.status` segun Confluence v1.10 | Imposible | Colision en Prisma. El codigo no compila |
| Renombrar el **modelo** `workflowStatus` (ej. a `workflowStatusCatalog`) | Tecnicamente posible | Desvia mas del modelo canonico (cambia el nombre del objeto principal). Mayor impacto en API + futuros consumers + Confluence |
| Modificar el codegen UP1 para soportar custom enum names | Tecnicamente posible | Requiere ticket dedicado en el equipo platform UP1 (cambio cross-project, no estimado). Bloqueante de HU3 en SP3 |
| **Renombrar el campo: `status` → `lifecycle`** ✓ | Adoptada | Cambio menor (un nombre), preserva semantica completa, mantiene los 4 modelos canonicos intactos, sin dependencias externas |

### Decision recomendada

Aceptar `workflow.lifecycle` como el nombre definitivo en codigo. Actualizar Confluence v1.11 para reflejar el nombre del codebase, o anotar en el documento canonico la divergencia con razon tecnica.

**Alternativa si el PM prefiere preservar `status`**: incluir en backlog SP4+ un ticket de "Add custom enum name support in codegen UP1" en el equipo platform. Una vez disponible, revertir el rename en un sprint posterior. Costo estimado: ~3-5 SP en platform (no en HU3).

---

## A.2 Tipo de FKs a `core_User`: UUID → integer

### Lo que dice Confluence v1.10

Cita verbatim de la pagina canonica:

**Para `workflow.createdBy`** (objeto `workflow > Campos`):
> `createdBy` | UUID | Si | FK → CoreUser

**Para `workflowTransitionHistory.userId`** (objeto `workflowTransitionHistory > Campos`):
> `userId` | UUID | Si | FK → CoreUser. Quien ejecuto la transicion

Ambos campos se especifican como **UUID**.

### Lo que se implemento en codigo UP1

En los JSON definitions, los campos se declaran como `"type": "integer"`:

```json
"createdBy": {
  "type": "integer",
  "title": "Created By",
  "not_null": true,
  "description": "Usuario que creo el workflow. FK al modelo core_User de UP1.",
  "isForeignKey": true,
  "references": "core_User",
  "targetField": "id"
}
```

En Prisma queda como:

```prisma
model workflow {
  ...
  createdBy   Int
  createdby   core_User @relation(name: "workflow_core_User_createdBy", fields: [createdBy], references: [id])
  ...
}
```

### Razon tecnica del cambio

El modelo `core_User` de UP1 — referenciado por la FK — tiene su `id` declarado como:

```prisma
model core_User {
  id  Int  @id  @default(autoincrement())
  ...
}
```

Esto es **convencion del codebase UP1**: todos los modelos con prefijo `core_` usan `Int @id @default(autoincrement())`. Los modelos "business" (los del dominio LA, como `activity`, `curricularSection`, etc.) usan `String @id @default(cuid())`. El codegen lo distingue explicitamente:

```javascript
// up1/object-manager/src/services/codegen/generatePrismaSchema.js:197
const fkType = baseModelName.startsWith('core_') ? 'Int' : 'String';
```

Por consistencia de tipos, una FK hacia `core_User.id` (Int) **debe** ser tipo `Int`. Si la declaramos como `String` (UUID), Prisma reporta:

```
Error parsing attribute "@relation": The type of the field `createdBy` in the model `workflow` is not matching the type of the referenced field `id` in model `core_User`.
```

### Evidencia

| Origen | Referencia |
|--------|------------|
| Codigo del codegen | `up1/object-manager/src/services/codegen/generatePrismaSchema.js:197` (logica de tipo de FK) |
| Modelo `core_User` | Generado en `up1/object-manager/prisma/BASEMODEL/schema.prisma` con `id Int @id @default(autoincrement())` |
| Otros objetos que referencian `core_User` (precedentes) | `up1/object-manager/objects/business/Base/attendance.json`, `issue.json`, `journal.json`, `offeringEnrollment.json` — todos usan `"type": "integer"` para FKs a `core_User` |
| Mensaje de error Prisma | `Error code: P1012 — The type of the field createdBy in the model workflow is not matching the type of the referenced field id in model core_User` |

### Implicancia API y UI

| Capa | Impacto |
|------|---------|
| Prisma schema | Campo `Int` (no `String UUID`). FK enforzada en BD |
| GraphQL API | El cliente envia/recibe `Int` para `createdBy` y `userId`. Schema GraphQL declara `Int!` para estos campos |
| Front-end | El selector de usuario expone IDs Int (consistente con otros lugares que usan `core_User`) |
| Seed UPU (HU3) | Los 5 workflows seed se crean con `createdBy: <int>` (id del admin `admin@uplanner.dev`, valor Int generado por autoincrement) |
| Migracion / Importacion legacy | Si en algun momento se importan workflows o transitions desde un sistema externo con UUIDs, el mapeo a Int requiere lookup contra `core_User` por email u otro campo unico |

### Alternativas evaluadas

| Opcion | Resultado | Razon de descarte |
|--------|-----------|-------------------|
| Declarar `createdBy: UUID` literal segun Confluence v1.10 | Imposible | Mismatch de tipos. Codigo no compila |
| Migrar el modelo `core_User.id` de Int a UUID | Tecnicamente posible | Impacto altisimo: todos los modelos `core_*` deberian migrar a String simultaneamente. Datos historicos (institutions, sessions, etc.) tendrian que re-mapearse. Fuera de scope SP3 |
| Crear un nuevo modelo `User` con UUID y FK ahi | Duplicaria modelos | Inconsistente con el resto del codebase que usa `core_User`. Confunde a nuevos devs |
| **Declarar el campo como `integer` (matchea core_User.id)** ✓ | Adoptada | Cambio limitado al tipo del campo, preserva semantica (FK a usuario que creo/ejecuto), consistente con todos los otros objetos del codebase que referencian `core_User` |

### Decision recomendada

Aceptar `Int` como tipo definitivo para `createdBy` y `userId`. Actualizar Confluence v1.11 con nota: "Tipo del campo segun convencion UP1 codebase: `Int` (id autoincrement de `core_User`). Conceptualmente equivalente a UUID porque ambos identifican univocamente al usuario."

**Alternativa si el PM prefiere preservar UUID**: incluir en backlog SP4+ un ticket de "Migracion `core_*` de Int a UUID" en el equipo platform. Es trabajo grande (~13-20 SP estimado por la cantidad de tablas e impacto en data historica) y NO bloquea HU3 hoy.

---

## Resumen comparativo

### Tabla resumen de las 2 modificaciones

| # | Punto modificado | Confluence v1.10 | Codigo UP1 | Razon | Reversible | Impacto API |
|---|------------------|------------------|------------|-------|------------|-------------|
| **A.1** | Nombre del campo | `workflow.status` | `workflow.lifecycle` | Colision con modelo `workflowStatus` por hardcoded enum naming del codegen | Si — requiere cambio en codegen UP1 (~3-5 SP) | Cliente consulta `workflow.lifecycle` (no `status`) |
| **A.2** | Tipo de FKs a usuario | `createdBy`, `userId`: `UUID` | `Int` | `core_User.id` es Int por convencion del codebase. FK debe matchear tipo | Si — requiere migracion de `core_*` a UUID (~13-20 SP) | Cliente envia/recibe `Int` (no UUID/String) |

### Impacto cross-HU del sprint SP3

| HU | Impacto de las 2 modificaciones |
|----|--------------------------------|
| **HU3 (UPONE-1099 — este caso)** | Implementa A.1 + A.2 en los JSON definitions de los 4 objetos |
| **HU4 (UPONE-1100 — rename activity + conectar workflow)** | Layout del activity referencia `workflow.lifecycle` (A.1). Migracion de instancias usa `createdBy: Int` (A.2) |
| **HU2 (UPONE-1098 — changeLog)** | No afectada por A.1 ni A.2 (changeLog ya tenia `userId: Int` desde su spec original) |

---

## Preguntas para el PM

Antes de cerrar HU3, necesitamos confirmacion en 3 puntos:

### 1. ¿Se aceptan las 2 adaptaciones tecnicas como permanentes en esta version?

- **Si** (recomendado): documentamos en Confluence v1.11 que el codebase UP1 usa `workflow.lifecycle` y `createdBy/userId: Int`. La pagina canonica refleja la realidad.
- **No**: queda en backlog SP4+ trabajo en el equipo platform — custom enum names (A.1, ~3-5 SP), migracion `core_*` a UUID (A.2, ~13-20 SP). Mientras tanto el codigo de HU3 mantiene las adaptaciones.

### 2. ¿Confluence v1.11 deberia reflejar las modificaciones?

Si la respuesta a (1) es Si, ¿quien actualiza Confluence? Propuesta: el PM con apoyo del equipo dev para precisar nombres y tipos. Esto cierra el loop entre spec canonica y codebase.

### 3. ¿Hay consumers afectados que conozcas?

- Reportes / dashboards que ya hagan queries esperando `workflow.status` → habria que ajustar a `lifecycle` (afecta A.1).
- Integraciones con otros sistemas que pasen UUIDs como `userId` → habria que normalizar a Int o agregar layer de traduccion (afecta A.2).
- Otros mods en planeacion que consuman `workflow` → hacerles saber los 2 cambios antes que arranquen.

Si conoces algun consumer en estado avanzado de planeamiento, conviene listarlo aqui antes de cerrar HU3.

---

## Anexos

### Anexo A — Referencias completas

- **Pagina canonica Confluence**: [Modelo de objetos de negocio Learning Assurance v1.10](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242)
- **Tickets Jira del sprint SP3**:
  - [UPONE-1099 — HU3 Modelo de objetos workflow + seed UPU](https://u-planner.atlassian.net/browse/UPONE-1099) (este caso)
  - [UPONE-1100 — HU4 Rename activity + conectar a workflow](https://u-planner.atlassian.net/browse/UPONE-1100)
  - [UPONE-1098 — HU2 changeLog](https://u-planner.atlassian.net/browse/UPONE-1098)
- **Archivos del codigo afectados** (HU3):
  - `up1/mods/curriculum-design/objects/workflow.json` — implementa `lifecycle` (A.1) + `createdBy: integer` (A.2)
  - `up1/mods/curriculum-design/objects/workflowTransitionHistory.json` — implementa `userId: integer` (A.2)
- **Archivos de referencia del codegen UP1**:
  - `up1/object-manager/src/services/codegen/generatePrismaSchema.js:197` (logica de tipo FK por prefijo del modelo — relevante para A.2)
  - `up1/object-manager/src/services/codegen/generatePrismaSchema.js:926` (logica hardcoded de naming de enums — relevante para A.1)
- **Otros objetos del codebase como precedentes** (referencian `core_User` con `type: integer`, soporte de A.2):
  - `up1/object-manager/objects/business/Base/attendance.json`
  - `up1/object-manager/objects/business/Base/issue.json`
  - `up1/object-manager/objects/business/Base/journal.json`
  - `up1/object-manager/objects/business/Base/offeringEnrollment.json`

### Anexo B — Esquema Prisma final generado para los 4 objetos

Resumen de la salida de `npm run codegen` post-implementacion HU3:

```prisma
// Enums
enum workflowScopeType {
  curriculumPlan
  activity
  competencyNode
  changeRequest
  booking
}

enum workflowLifecycle {     // <-- Modificacion A.1 (antes seria "workflowStatus")
  Draft
  Active
  Archived
}

enum workflowStatusCategory {
  ToDo
  InExecution
  InReview
  Published
  Closed
}

enum workflowStatusStatus {  // catalogo soft-delete del objeto workflowStatus
  Active
  Archived
}

// Modelos
model workflow {
  id            String              @id @default(cuid())
  institutionId String
  institution   Institution         @relation(...)
  name          String
  description   String?
  scopeType     workflowScopeType
  isDefault     Boolean             @default(false)
  lifecycle     workflowLifecycle   @default(Draft)   // <-- Modificacion A.1 (antes seria "status")
  createdBy     Int                                   // <-- Modificacion A.2 (antes seria "String/UUID")
  createdby     core_User           @relation(name: "workflow_core_User_createdBy", fields: [createdBy], references: [id])
  transitions   workflowTransition[]
  ...
}

model workflowStatus {
  id            String                    @id @default(cuid())
  institutionId String
  ...
  category      workflowStatusCategory
  status        workflowStatusStatus      @default(Active)
}

model workflowTransition {
  id              String              @id @default(cuid())
  workflowId      String
  fromStatusId    String
  toStatusId      String
  name            String
  requiresComment Boolean             @default(false)
  ...
}

model workflowTransitionHistory {
  id            String   @id @default(cuid())
  entityType    String                       // polimorfico abierto, sin FK enforzada (segun Confluence v1.10 literal)
  entityId      String
  transitionId  String
  userId        Int                           // <-- Modificacion A.2 (antes seria "String/UUID")
  user          core_User @relation(...)
  comment       String?
  ...
}
```

---

## Historial del documento

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-05-13 | Creacion inicial. Documenta las 2 adaptaciones tecnicas obligadas al modelo de Confluence v1.10 aplicadas durante implementacion HU3 (A.1 rename status→lifecycle, A.2 tipo FKs core_User integer). Pendiente revision del PM. | Eduardo Bacon |
