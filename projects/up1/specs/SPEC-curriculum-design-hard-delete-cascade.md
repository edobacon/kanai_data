---
id: SPEC-curriculum-design-hard-delete-cascade
project: up1
ticket: TICKET-104
status: draft
---

# P5 — Hard delete en cascada sin huerfanos

# P5 — Hard delete en cascada sin huerfanos

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico esta en Requirements, Artifacts y Tasks.*

**Que se quiere**: corregir el borrado generico de UP1 para que, al eliminar objetos de curriculum-design, el sistema calcule el subarbol real de hijos, advierta el impacto, bloquee referencias externas con `Restrict`, borre en cascada solo lo poseido/exclusivo y deje `core_DataLog` por cada nodo eliminado. El foco es `object-manager` porque `RecordList`, API y MCP pasan por entrypoints genericos; curriculum-design aporta metadata declarativa del dominio.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Motor compartido en `object-manager`, no resolver local del mod | Evita divergencia entre `deleteBulkInstances`, `deleteInstance`, UI y MCP. |
| 2 | `Cascade`/`Restrict` explicito por relacion | Evita un default global que podria borrar datos cross-mod fuera del scope. |
| 3 | Preview y commit usan el mismo plan de grafo | El usuario debe confirmar exactamente lo que el backend ejecuta, o abortar completo. |
| 4 | Auditoria en `core_DataLog` por cada nodo eliminado | P3/TICKET-102 retiro ChangeLog como destino nuevo; auditar solo el padre pierde trazabilidad. |
| 5 | Tests destructivos contra datos de seed | El criterio real es DB sin dato + DataLog presente; se puede recuperar via sync/seed. |

**Riesgos principales y como los mitigamos**:

- **Blast radius de core** -> aislar el motor en helpers testeables, mantener `deleteInstance` y `deleteBulkInstances` compartiendo plan, y gate T3.
- **Cascade accidental cross-mod** -> no cambiar defaults globales; declarar semantica por relacion y bloquear referencias externas.
- **Metadata incompleta** -> discovery inicial y tasks explicitas para completar `polymorphicChildren`/hijos derivados en curriculum-design.
- **Diferencia preview vs commit** -> el commit consume el mismo plan calculado o lo recalcula con la misma funcion dentro de transaccion.
- **Auditoria perdida en cascada** -> cada nodo eliminado pasa por helper/decorator DataLog o equivalente con snapshot pre-delete.

**Que NO se hace en este ticket**:

- No se implementa soft delete.
- No se migra ni revive ChangeLog.
- No se cambian defaults globales de onDelete para otros mods.
- No se hace una solucion privada de curriculum-design que salte los entrypoints genericos.

**Tamano estimado**: 5 sessions ejecutables, ~10-14h efectivas. La mas riesgosa es S2/S3 por motor core + delete transaccional.

**Como vas a saber que funciona**:

- Borrar un padre con hijos muestra preview dinamico y luego elimina padre+hijos sin huerfanos.
- Borrar un nodo referenciado desde fuera bloquea todo con mensaje accionable.
- Cada nodo eliminado desaparece de DB y tiene fila `core_DataLog`.
- Bulk delete no duplica conteos ni borra parcialmente.
- UI y MCP muestran el mismo impacto.

---

## Purpose

Extender el delete generico de `object-manager` para resolver cascada segura sobre hijos polimorficos y RecordTypes de curriculum-design, usando metadata declarativa del mod, preview dinamico para UI/MCP y auditoria `core_DataLog` por nodo. Actor: usuario que administra la malla y sistema que garantiza integridad. Capas: backend, database, config, frontend y MCP.

## Requirements

### REQ-01: Construir preview de impacto desde el grafo declarativo

> **Que cambia**: antes de borrar, el backend entrega el arbol de registros que se borrarian y los bloqueos que impedirian la accion.
> **Por que**: el modal y MCP no pueden depender de texto estatico ni calcular impacto por su cuenta.

El sistema MUST exponer un calculo de preview que, para uno o mas registros base, recorra hijos declarados, self-ref, RecordTypes y derivados relevantes, y devuelva conteos, ids, tipos visibles y razones de `Restrict`.

**Actor**: user/system  
**Layers**: backend, api, frontend, mcp

<details><summary>Scenarios de validacion</summary>

#### Scenario: preview con hijos poseidos
- **GIVEN** un `Activity` con `CurricularSection` y `requirement` poseidos
- **WHEN** el usuario solicita borrar el `Activity`
- **THEN** el preview lista el padre y sus hijos por tipo/subtipo

#### Scenario: preview con referencia externa
- **GIVEN** un hijo del subarbol referenciado por un objeto externo
- **WHEN** se calcula el preview
- **THEN** el resultado marca `Restrict` y explica que referencia resolver

#### Scenario: bulk sin doble conteo
- **GIVEN** dos nodos seleccionados donde uno contiene al otro
- **WHEN** se calcula preview bulk
- **THEN** el subarbol se deduplica

</details>

#### Acceptance
El usuario ve cantidad y tipo de elementos afectados antes de confirmar; si hay bloqueo, ve que debe resolver primero.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | preview cascade | padre con hijos | preview | lista arbol | conteos por objeto/subtipo |
| 2 | preview restrict | referencia externa | preview | bloquea | reason accionable |
| 3 | preview bulk | seleccion solapada | preview | dedupe | sin doble conteo |

### REQ-02: Ejecutar delete transaccional usando el mismo plan

> **Que cambia**: `deleteBulkInstances` y `deleteInstance` borran el subarbol poseido o abortan completo.
> **Por que**: no debe existir diferencia entre lo que se previsualiza y lo que se borra.

El sistema MUST ejecutar el delete real con el mismo motor de plan usado por preview. Si cualquier nodo tiene `Restrict`, no se borra nada. Si el plan es cascada valida, borra en orden seguro todas las capas base/RT/ext y relaciones self-ref.

**Actor**: system  
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: cascade completo
- **GIVEN** un `Curriculum` con plan entries, requirement categories, sections y requirements poseidos
- **WHEN** se confirma el delete
- **THEN** no queda ningun nodo del subarbol en DB

#### Scenario: abort atomico
- **GIVEN** un subarbol con una referencia externa
- **WHEN** se confirma el delete
- **THEN** el backend aborta sin borrar ningun nodo

</details>

#### Acceptance
El delete confirmado elimina exactamente el subarbol del preview o no elimina nada si hay bloqueo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | cascade DB | subarbol poseido | confirm delete | query DB | 0 filas del subarbol |
| 2 | restrict DB | referencia externa | confirm delete | query DB | filas intactas |

### REQ-03: Completar metadata declarativa en curriculum-design

> **Que cambia**: el mod declara todos los hijos que el core necesita para borrar seguro.
> **Por que**: el core no debe hardcodear dominio de malla, pero necesita metadata completa.

El sistema MUST completar metadata de hijos para los cuatro objetos base: `AcademicProgram`, `Curriculum`, `Activity`, `Offering`, incluyendo requirements, sections, Curriculum como hijo de AcademicProgram, relaciones derivadas y self-ref donde aplique.

**Actor**: system  
**Layers**: config, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: AcademicProgram incluye Curriculum
- **GIVEN** un programa con planes/minors
- **WHEN** se calcula el grafo
- **THEN** `Curriculum` aparece como hijo alcanzable

#### Scenario: requirements incluidos
- **GIVEN** un Activity/Curriculum/Offering con requirements
- **WHEN** se calcula el grafo
- **THEN** los requirements quedan en preview/delete

</details>

#### Acceptance
La matriz de objetos de UPONE-1382 queda cubierta por metadata, no por reglas hardcodeadas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | program curricula | AcademicProgram seed | preview | includes Curriculum | hijo declarado |
| 2 | requirements | owner con requirements | preview | includes requirement | hijo declarado |

### REQ-04: Registrar DataLog por cada nodo eliminado

> **Que cambia**: la cascada deja evidencia de cada registro borrado.
> **Por que**: auditar solo el padre no permite probar que hijos concretos desaparecieron ni investigar incidentes.

El sistema MUST registrar en `core_DataLog` una entrada DELETE por cada nodo eliminado, usando snapshot pre-delete para conservar informacion de owner/RecordType. El delete no puede bypassar DataLog con Prisma directo sin helper equivalente.

**Actor**: system/auditor  
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: hijo eliminado auditado
- **GIVEN** un hijo polimorfico existente
- **WHEN** se borra por cascada
- **THEN** no existe en DB y existe DataLog DELETE para ese hijo

#### Scenario: padre eliminado auditado
- **GIVEN** un padre existente
- **WHEN** se borra
- **THEN** no existe en DB y existe DataLog DELETE para el padre

</details>

#### Acceptance
Cada caso de prueba destructivo puede demostrar ausencia en DB y registro DataLog.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | child audit | hijo seed | delete cascade | query datalog | DELETE del hijo |
| 2 | parent audit | padre seed | delete | query datalog | DELETE del padre |

### REQ-05: Integrar preview en UI y MCP

> **Que cambia**: `CriticalWarningModal` y tools MCP muestran impacto real del delete.
> **Por que**: el usuario y los automatismos deben confirmar con el mismo conocimiento.

El sistema MUST conectar `RecordList -> deleteBulkInstances` con preview dinamico en `CriticalWarningModal`, y exponer el mismo preview para `cd_delete_section`/`delete_object` en up1-mcp.

Ademas, curriculum-design MUST exponer la accion de eliminar en las superficies donde el usuario opera los objetos en scope. Esto incluye los listados de los 4 padres (`AcademicProgram`, `Curriculum`, `Activity`, `Offering`) y los listados embebidos de hijos polimorficos/poseidos que aparecen dentro de sus vistas/ediciones. Cada accion debe ser un `rowAction`/delete real, gateado por la capability `objectname:delete`, para que el usuario entre al flujo de preview/cascade de UPONE-1382 y no quede una capacidad backend sin superficie UI.

**Actor**: user/automation  
**Layers**: frontend, mcp, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: modal con impacto
- **GIVEN** un padre con 3 hijos
- **WHEN** el usuario abre confirmacion
- **THEN** el modal muestra padre + 3 hijos por tipo

#### Scenario: accion delete visible para hijo polimorfico
- **GIVEN** un Activity/Offering con una seccion polimorfica visible en un RecordList embebido
- **WHEN** el usuario tiene `curricularsection:delete`
- **THEN** la fila muestra accion delete y la accion abre el preview dinamico antes de borrar

#### Scenario: MCP dry-run
- **GIVEN** una tool de delete
- **WHEN** se pide preview
- **THEN** devuelve la misma estructura que UI

</details>

#### Acceptance
UI y MCP comunican el mismo impacto y los mismos bloqueos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | modal | padre con hijos | open delete | render | conteo dinamico |
| 2 | rowAction padre | permiso delete | render list | action visible | abre preview |
| 3 | rowAction hijo RT | permiso delete | render embedded list | action visible | abre preview |
| 4 | mcp preview | id valido | dry-run | response | mismo shape |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Safety | Delete atomico | borrado parcial | 0 casos permitidos |
| Security | Permiso delete existente | RBAC | action oculta/bloqueada sin permiso |
| Performance | Preview bulk razonable | latencia local seed | sin regresion perceptible en RecordList |

## Artifacts

### Backend APIs / mutations
| Artifact | Tipo | Descripcion |
|----------|------|-------------|
| `deleteImpactPreview` o helper equivalente | backend helper/API | Calcula grafo cascade/restrict reusable por UI/MCP/delete real |
| `deleteBulkInstances` | mutation existente | Consumir plan compartido, abortar atomico, borrar subarbol |
| `deleteInstance` | mutation existente | Delegar al mismo motor para compatibilidad |

### Metadata de objetos
| Object | Metadata requerida | Motivo |
|--------|-------------------|--------|
| `AcademicProgram` | hijo `Curriculum` | programas poseen planes/minors |
| `Curriculum` | planEntry, requirementCategory, sections, requirements | borrar plan/minor completo |
| `Activity` | sections, requirements | contenido del programa de asignatura |
| `Offering` | sections, requirements | contenido del syllabus/oferta |

### UI/MCP
| Artifact | Consumidor | Descripcion |
|----------|-----------|-------------|
| `CriticalWarningModal.vue` | layout | Render de conteos dinamicos y bloqueos |
| `RecordList.vue` | layout | Orquestar preview antes de `deleteBulkInstances` |
| Layouts de curriculum-design | mod | Exponer `rowAction` delete en listas de padres e hijos polimorficos/poseidos |
| `cd_delete_section`, `delete_object` | up1-mcp | Preview/commit de cascada |

### RowActions delete a agregar/verificar en curriculum-design
| Superficie | Objeto que borra | Capability | Notas |
|------------|------------------|------------|-------|
| `default_AcademicProgram_list` | `AcademicProgram` | `academicprogram:delete` | Padre; debe previsualizar `Curriculum` descendientes. |
| `default_Curriculum_list` | `Curriculum` | `curriculum:delete` | Padre; cubre Plan/Minor y subarbol de malla. |
| `default_Activity_list` | `Activity` | `activity:delete` | Padre; cubre secciones y requirements. |
| `default_Offering_syllabus_list` | `Offering` | `offering:delete` | Padre; cubre secciones y requirements de syllabus. |
| `default_Curriculum_view/edit` `requirementCategoriesList` | `requirementCategory` | `requirementcategory:delete` | Hijo poseido por Curriculum; debe borrar/restringir requirements segun plan. |
| `default_Curriculum_view/edit` `graduationProfileList` | `CurricularSection` RT `GraduationProfile` | `curricularsection:delete` | Hijo polimorfico de Curriculum. |
| `default_Activity_view/edit` listas de `CurricularSection` | RT `Modality`, `LearningOutcome`, `Content`, `Session`, `EvaluationComponent`, `Bibliography`, `CustomSection` | `curricularsection:delete` | Hijos polimorficos de Activity; cada fila debe abrir preview. |
| `default_Offering_syllabus_view/edit` listas de `CurricularSection` | RT `Modality`, `LearningOutcome`, `Content`, `Session`, `EvaluationComponent`, `Bibliography`, `CustomSection` | `curricularsection:delete` | Hijos polimorficos de Offering; cada fila debe abrir preview. |
| Superficies de `requirement` si S1/S4 las descubre o las agrega | `requirement` RT `Group`, `MetricThreshold`, `RecordState` | `requirement:delete` | No hay RecordList de `requirement` visible en el inventario actual; si se surfacea, queda dentro de esta condicion. |
| Superficies de `CurricularLink` si S1/S4 las descubre o las agrega | `CurricularLink` | `curricularlink:delete` | Hijo/relacion derivada; el inventario actual tiene view, no list. Si se expone en malla/lista, debe tener delete. |

## Tasks

### Session 1 — Discovery ejecutable y contrato de plan [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Confirmar metadata actual y fixtures seed para padres/hijos/subtipos | REQ-01, REQ-03 | researcher | — | object-manager/src/graphql/resolvers/instance.resolver.js; mods/curriculum-design/objects/*.json | informe en ticket + paths verificados | (no aplica) | DET-5, DET-11 | done | 1 |
| S1.T2 | Definir shape del plan de preview reusable por UI/MCP/delete | REQ-01, REQ-02, REQ-05 | developer | S1.T1 | object-manager/src/services/referenceValidationService.js; object-manager/src/graphql/resolvers/instance.resolver.js | unit contract del shape | git revert | DET-1, DET-2, DET-8 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision continue/iterate | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Motor core de preview y Restrict [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar traversal de grafo polimorfico/self-ref/derivado para preview | REQ-01, REQ-03 | developer | S1.GATE | object-manager/src/services/referenceValidationService.js; object-manager/src/graphql/resolvers/helpers/* | unit traversal + fixtures | git revert | DET-5, DET-8, DET-11 | done | 2 |
| S2.T2 | Detectar referencias externas y cadenas de version como Restrict accionable | REQ-01, REQ-02 | developer | S2.T1 | object-manager/src/services/referenceValidationService.js | unit restrict externo/version | git revert | DET-5, DET-8, RULE-dev-004 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** | — | reviewer | S2.T1, S2.T2 | ticket | unit + integration core + review riesgo | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Delete real transaccional + DataLog [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Conectar `deleteBulkInstances` y `deleteInstance` al motor compartido | REQ-02 | developer | S2.GATE | object-manager/src/graphql/resolvers/instance.resolver.js | integration delete bulk/single | git revert | DET-5, DET-8, RULE-dev-004 | done | 3 |
| S3.T1.a | **Gap 4 (anotado desde S2 audit)**: extender deteccion de external-reference para incluir `core_FieldDefinition` con `fieldType='reference'` y `properties.referenceObject === node.objectType`. Sin esto, FKs cross-mod con nombre no-convencional (ej. `linkedActivityId`) se saltan la deteccion y quedan orphan. Reusar `findReferencingObjects` del `referenceValidationService` ya implementado (S2 cubre solo convencion `<objectLower>Id`). | REQ-02 | developer | S2.GATE | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js (`findIncomingReferences`); reusar `referenceValidationService.findReferencingObjects` | unit: mock `core_FieldDefinition` con FK custom + assert restriction detectada | git revert | DET-5, DET-8 | done | 3 |
| S3.T1.b | **Gap 5 (anotado desde S2 audit)**: ampliar `walkPolymorphicDerived.findMany` con `select: { id: true, recordType: true }` para que `node.recordType` no quede null si un derivado futuro es RT-projected. Hoy CurricularLink no es RT-projected, pero la defensa es preventiva. | REQ-02 | developer | S2.GATE | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js (`walkPolymorphicDerived`) | unit: derivado con recordType no-null → projectionStack incluye rt | git revert | DET-5, DET-8 | done | 3 |
| S3.T2 | Garantizar DataLog DELETE por cada nodo con snapshot pre-delete | REQ-04 | developer | S3.T1, S3.T1.a, S3.T1.b | object-manager/src/events/decorators/withDataLog.js; object-manager/src/graphql/resolvers/instance.resolver.js | integration DB + DataLog por nodo | git revert | DET-5, DET-8, DET-11 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** | — | reviewer | S3.T1, S3.T1.a, S3.T1.b, S3.T2 | ticket | DB absent + DataLog present por familia + custom-FK + RT-derived | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Metadata curriculum-design [tipo: auto] [tier: T2]

parallel_groups: [[S4.T1, S4.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Completar metadata de hijos para AcademicProgram/Curriculum | REQ-03 | developer | S3.GATE | mods/curriculum-design/objects/AcademicProgram.json; mods/curriculum-design/objects/Curriculum.json | unit graph (delete-cascade-metadata.test.ts 11/11) + integration mod 715/715; codegen/sync dry-run diferido (drift object-manager) | git revert | DET-1, DET-2, DET-8 | done | 4 |
| S4.T2 | Completar metadata de hijos para Activity/Offering/requirements | REQ-03 | developer | S3.GATE | mods/curriculum-design/objects/activity.json; mods/curriculum-design/objects/Offering.json; mods/curriculum-design/objects/requirement.json | unit graph (delete-cascade-metadata.test.ts 11/11) + integration mod 715/715; codegen/sync dry-run diferido (drift object-manager) | git revert | DET-1, DET-2, DET-8 | done | 4 |
| S4.T3 | Agregar/verificar `rowAction` delete en vistas de padres e hijos polimorficos/poseidos del mod | REQ-05, REQ-08 | developer | S4.T1, S4.T2 | mods/curriculum-design/config/layouts/default_AcademicProgram_list.json; default_Curriculum_list.json; default_Activity_list.json; default_Offering_syllabus_list.json; default_Curriculum_view/edit.json; default_Activity_view/edit.json; default_Offering_syllabus_view/edit.json | layout JSON valido (4 listas + 6 view/edit) + smoke live del list padre (accion + CriticalWarningModal); embebidas validadas+sync, verificacion con filas pobladas en S5.T3 | git revert | DET-1, DET-2, DET-8, RULE-core-012 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | metadata cubre matriz UPONE-1382 + rowActions delete cubren padres/hijos (excluye DataLog/version chains) | (no aplica) | DET-20, DET-23 | done | 4 |

### Session 5 — UI/MCP y validacion destructiva [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T0 | **Cablear `executeDeletePlan` en `deleteBulkInstances`/`deleteInstance`** (reprogramado desde S3.T1; se difiere a post-S4 para que el motor corra con metadata completa y no de falso-verde anti-huerfanos). Coordinar con `withDataLog` para evitar double-logging del root. | REQ-02, REQ-06 | developer | S4.GATE | object-manager/src/graphql/resolvers/instance.resolver.js; object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js; object-manager/src/events/decorators/withDataLog.js | unit motor+orquestador 37/37 + suite unit completa 2166 pass sin regresion (REQ-06 gate por metadata); integration delete bulk/single en S5.T3 | git revert | DET-5, DET-8, RULE-dev-004 | done | 5 |
| S5.T1 | Integrar preview dinamico en RecordList/CriticalWarningModal + **agregar delete a los componentes bespoke de secciones**: `composite-section-tree` (evaluación, Activity/Offering) y `curriculum-mesh` (malla `planEntriesMesh`, Curriculum). El delete de esos componentes debe rutear por el motor cascade (S5.T0), no por el path viejo (evita huerfanos). Historial (`core_DataLog`) NO recibe delete. | REQ-05 | developer | S5.T0 | layout/src/layouts/RecordList.vue; layout/src/components/organisms/Modal/CriticalWarningModal.vue; mods/curriculum-design/modsComponents/CompositeSectionTree/*; mods/curriculum-design/modsComponents/CurriculumMesh/* (o equivalente) | unit/component + smoke manual (delete visible + cascade correcto en tree/mesh) | git revert | DET-5, DET-8 | done | 5 |
| S5.T2 | Integrar preview/commit en up1-mcp delete tools | REQ-05 | developer | S5.T0 | up1-mcp:src/** | mcp dry-run/commit test | git revert | DET-5, DET-8 | done | 5 |
| S5.T3 | Ejecutar matriz destructiva DB + DataLog por padre/hijo/subtipo/restrict/bulk | REQ-01, REQ-02, REQ-04, REQ-05 | reviewer | S5.T0, S5.T1, S5.T2 | tests/integration/**; ticket | evidencia DB absent + DataLog present | sync/seed restore | DET-4, DET-7, DET-13 | done | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** | — | reviewer | S5.T0, S5.T1, S5.T2, S5.T3 | ticket | DoD completo + no huerfanos + motor cableado sin regresion generica | (no aplica) | DET-20, DET-23 | done | 5 |

### Task contract

Task S1.T1: Confirmar metadata actual y fixtures seed
- source_ref: REQ-01, REQ-03
- agent: researcher
- precondition: rama de trabajo actualizada con develop esperado
- expected_output: tabla de objetos/hijos/fixtures disponibles en ticket
- validation: paths reales + datos seed identificados
- rollback: no aplica
- rules: [DET-5, DET-11]

Task S2.T1: Traversal de grafo para preview
- source_ref: REQ-01, REQ-03
- agent: developer
- precondition: shape del plan definido
- expected_output: helper reusable que devuelve arbol cascade/restrict
- validation: unit traversal polimorfico, self-ref y derivado
- rollback: git revert
- rules: [DET-5, DET-8, DET-11]

Task S3.T1.a: Custom-FK detection via core_FieldDefinition
- source_ref: REQ-02 (gap detectado en audit post-S2)
- agent: developer
- precondition: S2.GATE cerrado, helper de deteccion en deleteImpactPlan.js
- expected_output: `findIncomingReferences` extendido que consulta `core_FieldDefinition` con `fieldType='reference'` y `properties.referenceObject === node.objectType`; restriction con reason `external-reference` para matches
- validation: unit con mock de `core_FieldDefinition` con FK custom (ej. `linkedActivityId`) → restriction detectada con `referencingField` correcto
- rollback: git revert
- rules: [DET-5, DET-8]

Task S3.T1.b: walkPolymorphicDerived lee recordType
- source_ref: REQ-02 (gap detectado en audit post-S2)
- agent: developer
- precondition: S2.GATE cerrado
- expected_output: `walkPolymorphicDerived.findMany` con `select: { id: true, recordType: true }` para que `node.recordType` quede no-null cuando el derivado sea RT-projected
- validation: unit con derivado que tiene `recordType` no-null → `node.recordType` propagado + `projectionStack` incluye capa rt
- rollback: git revert
- rules: [DET-5, DET-8]

Task S3.T2: DataLog por nodo eliminado
- source_ref: REQ-04
- agent: developer
- precondition: delete real usa motor compartido
- expected_output: entrada DELETE por cada nodo del subarbol
- validation: integration query DB + DataLog
- rollback: git revert
- rules: [DET-5, DET-8, DET-11]

Task S5.T3: Matriz destructiva final
- source_ref: REQ-01, REQ-02, REQ-04, REQ-05
- agent: reviewer
- precondition: UI/MCP integrados
- expected_output: evidencia de ausencia en DB y DataLog presente por familia
- validation: tests destructivos + sync/seed restore si aplica
- rollback: sync/seed restore de datos de prueba
- rules: [DET-4, DET-7, DET-13]

## Constraints

- `RULE-dev-004`: cambios core requieren revision del team up1.
- `DET-21`: teach-intake completado antes de design.
- `DET-20`: plan particionado en sessions con gate.
- `DET-32`: reusar patrones existentes: `referenceValidationService`, `deep-clone-polymorphic`, `CriticalWarningModal`.

## Dependencies

- TICKET-102/P3 para contrato de `core_DataLog`.
- UPONE-1379/P2 para metadata de hijos polimorficos ya ampliada.
- Seeds de UPU recuperables para pruebas destructivas.

## Risks

- Metadata incompleta genera falso verde: mitigacion S1/S4.
- Delete parcial por excepcion intermedia: mitigacion transaccion + gate T3.
- Preview divergente del commit: mitigacion motor compartido.

## Open questions

- Nombre final del endpoint/helper de preview.
- Shape exacto de respuesta para UI/MCP.
- Si `requirementCategoryDelete` puede retirarse en la misma rama o queda hasta que Restrict accionable este probado.

## Acceptance

- `dkc-validate SpecTask` verde.
- Tests destructivos cubren padre, hijo polimorfico simple, hijo subtipado/RecordType, restrict externo, version chain y bulk.
- Evidencia por caso: existe antes, delete, no existe en DB, DataLog DELETE presente.
