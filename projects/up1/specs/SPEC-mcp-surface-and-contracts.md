---
id: SPEC-mcp-surface-and-contracts
project: up1
ticket: TICKET-080
status: done
---

# up1-mcp — Surface de tools, contratos y extensibilidad

# up1-mcp — Surface de tools, contratos y extensibilidad

> **Spec de referencia** (no de build). Documenta el catálogo de tools por mod, la capa de contratos por objeto, la extensibilidad (`ModPack`), la resolución semántica de inputs no-escalares y la guía derivada de contratos. Fuente migrada desde el plan externo (§5, §7, §12.R, S10/S11), retirado por TICKET-080. Arquitectura, auth y límites en [SPEC-mcp-architecture](SPEC-mcp-architecture.md). Validar con `--no-strict` (spec de referencia).

## Purpose

Definir QUÉ expone el MCP al LLM (las tools de dominio por mod), CÓMO valida antes de mutar (la capa de contratos que replica las reglas frontend-only de up1) y CÓMO se extiende a nuevos objetos/mods sin tocar el núcleo (contrato `ModPack`).

## 5. Catálogo de tools (MVP + extensiones)

Convención de nombres por mod para que el LLM active la tool correcta desde lenguaje natural. Prefijo de mod **`cd_*` / `eng_*` / `view_*`** (desambiguación, §12.E); tools genéricas/meta sin prefijo.

### 5.1 Meta / descubrimiento (infra compartida, mod-agnóstica)
| Tool | Qué hace |
|---|---|
| `get_context` / `set_active_role` | usuario, tenant, rol activo, roles disponibles, capabilities / fijar rol |
| `list_object_types` / `describe_object` | objetos del mod (scoped + por permiso) / campos, tipos, required, FKs |
| `get_create_guide` | receta paso a paso derivada del contrato (requeridos, enums, orden, tools) |
| `get_field_options(object, field, query?)` | opciones reales de un select (enum o FK), con búsqueda por nombre/código (S28/S29) |
| `about` / `get_documentation(topic)` | self-doc (overview, mods, conventions, uengagement, curriculum-design) |
| `query_records` | consulta efímera filtrada (fallback cuando una tool de dominio no soporta el filtro, S22) |

### 5.2 curriculum-design (`cd_*`)
| Tool | Qué hace | Contratos |
|---|---|---|
| `cd_search_programs` | buscar Activity:Course por nombre (CONTAINS, fold de acentos), similares o atributos | scope `recordType=Course` (S14) |
| `cd_get_program` | detalle + todos los hijos (secciones por tipo + `rt__*`), estado/unidad resueltos | — |
| `cd_create_program` / `cd_update_program` | crear/editar programa | V2 (workflow default), V4 (nunca currentStatusId), `executionUnitId` (S12) |
| `cd_version_program` / `cd_transition_program` | nueva versión (deep-clone) / cambiar estado | V5 (allowsVersioning solo Publicado), V3 (requiresComment) |
| `cd_create_section`/`update`/`reorder`/`delete`/`list`/`get` | hijos (evaluaciones, RA, modalidades, contenidos, sesiones, bibliografía) | V1 (suma de pesos ≤ techo, parciales OK), V8 (enums), `position`=max+1, R1 (reorder no atómico), R4 (sin cascade) |
| `cd_search_bibliography` / `cd_get_program_bibliography` | catálogo institucional / bibliografía de un programa | — |
| `cd_get_curriculum`/`create`/`update`/`version`/`clone`/`search_curricula`/`get_version_chain` | currículos/planes (Curriculum tipado, RT poblado + herencia al versionar, S34) | ruta por alias `rt__<RT>__curriculum`; `status` es **readonly** en `cd_update_curriculum` (UPONE-1393, ver §5.2.a) |
| `cd_list_curriculum_transitions` / `cd_transition_curriculum` | listar transiciones válidas de estado / ejecutar el cambio de estado de un currículo (UPONE-1393) | rutea por `updateCurriculumWithRecordType` (mutation tipada, NO el update genérico); ver §5.2.a |
| `cd_get_graduation_profile` / `cd_set_graduation_profile` | perfil de egreso del currículo (UPONE-1379) | singleton por currículo, upsert; ver §5.2.b |
| `cd_create_syllabus` / `cd_list_syllabi` | sílabos (Syllabus, FK `termId`→Term, S29) | resolución de Term |
| `cd_clone_academic_program` / `cd_create_curriculum` | carreras (AcademicProgram) | `ownerRef` resuelto |
| `cd_manage_requirement` / `cd_get_prereqs` | requisitos/prerrequisitos (árbol Group/RecordState/MetricThreshold, vías O/Y) | `action`: view/create/update/delete; `via` es un **parámetro** de create (no una action) — ver §5.2.c |
| `get_change_history` / `query_changes` / `analytics_changes` | historial (ChangeLog), consultas filtradas, calculadas (agregación client-side, tope 1000 + aviso truncated) | entityType PascalCase |

### 5.2.a Máquina de estados de Curriculum (UPONE-1393)

Curriculum adopta el motor de enum de core: 6 estados (`Draft`/`InReview`/`Approved`/`Active`/`Deprecated`/`Archived`). `cd_update_curriculum` deja de aceptar `status` (pasa a **readonly**; el cambio de estado sale de ese update genérico). `cd_list_curriculum_transitions` lista las transiciones válidas desde el estado actual; `cd_transition_curriculum` las ejecuta, con preview sin `confirm` y ejecución con `confirm:true`.

El routing es clave: `cd_transition_curriculum` llama `updateCurriculumWithRecordType` (mutation tipada del RT), NO el update genérico — porque el guard server-side `assertNoActiveDependentsOnRevert` (bloquea revertir Activo→Borrador si hay matrículas activas) solo corre dentro de esa mutation tipada. Hay además un pre-chequeo semántico client-side del reverso con matrículas activas para avisar antes del preview; el server sigue siendo la autoridad final. Mismo patrón que la máquina de estados de Program (ver Rules discovered).

Verificado en `src/mods/curriculum-design/curriculum-write.ts` (`cd_list_curriculum_transitions`, `cd_transition_curriculum`, comentario de `updateCurriculumWithRecordType`) y `src/contracts/registry.ts`.

### 5.2.b Perfil de egreso (UPONE-1379)

`GraduationProfile` es un bloque narrativo único por currículo (competencias/desempeños del graduado). En el modelo es una `CurricularSection` con `owner=Curriculum` y `recordType=GraduationProfile` — UPONE-1379 volvió polimórfico el owner de secciones (antes solo `Activity`; ahora `Activity`|`Offering`|`Curriculum`). El MCP lo expone como concepto de negocio ("perfil de egreso") vía tools dedicadas `cd_get_graduation_profile`/`cd_set_graduation_profile`, no como `cd_create_section` genérico — evita que el usuario tope con el alias/recordType interno.

`cd_set_graduation_profile` hace **upsert** (crea si no existe, edita si existe): el server enforza 1 perfil por currículo (`assertSingleGraduationProfile`); el MCP oculta ese detalle de singleton al usuario.

De paso, UPONE-1379 agrega el tipo de sección `Content` a las descripciones de `cd_create_section`/`cd_list_sections` (nuevo valor de enum de tipo de sección, junto a los ya existentes).

Verificado en `src/mods/curriculum-design/graduation-profile.ts` y `src/mods/curriculum-design/sections-write.ts`/`sections.ts`.

### 5.2.c Requisitos/prerrequisitos — update/delete, vías, cascade (UPONE-1378)

`cd_manage_requirement` tiene `action: view | create | update | delete` (enum de 4 valores). Las acciones nuevas de esta ventana son `update` (editar por id, con guard de ciclos también al cambiar `target`) y `delete` (eliminar por id, con cascade bottom-up de grupos que quedan vacíos). El parámetro `via` (NO una action) modifica el comportamiento de `create`: `via:"new"` agrega el requisito como vía nueva (rama O/OR); `via:<id de un Group>` le suma una condición Y a una vía existente.

Se agrega validación de ciclos (`wouldFormRequirementCycle`, guard client-side vía BFS acotado, adelantado al enforcement server-side) y `action:view` ahora enriquece cada nodo del árbol con los campos del alias tipado (antes solo el objeto base, sin `target`/`mustBe`/`timing`/combinador).

**Bugfix de causa raíz** (cazado por smoke E2E, no por unit tests mockeados): crear/recorrer requisitos debe ir por el alias del RecordType (`rt__<RT>__requirement`), no por el objeto base `requirement` — el base no proyecta `targetType`/`mustBe`/`timing`, lo que rompía la mutation Prisma y dejaba ciego al guard de ciclos. Mismo patrón que el ya existente en `cd_create_section` (ver §5.2 tabla, R4).

Verificado en `src/mods/curriculum-design/requirement-write.ts` (enum `action`, parámetro `via`) y `src/mods/curriculum-design/requirement-tree-ops.ts` (`resolveViaTargetGroup`, `computeDeleteCascade`, rollback parcial seguro si falla el create del leaf tras crear grupos vía).

### 5.2.d Preview/commit de cascada de borrado (UPONE-1382)

`InstancesApi.deleteImpactPreview` + `summarizeDeleteImpact` (`src/core/instances.ts`) exponen, **sin mutar**, el plan de cascada/restrict del mismo motor que corre el delete real: cuenta por tipo de referencias que se borrarían en cascada, o lista las referencias externas que bloquean el borrado (`status: "cascade" | "restricted"`).

`delete_object` (CRUD genérico) muestra ese impacto en el preview (sin `confirm`) y **rehúsa el commit si `status === "restricted"`** (referencias externas bloquean el borrado; no se fuerza el borrado).

`cd_delete_section` sigue el mismo patrón, pero borra por el objeto **BASE** (`CurricularSection`), no por el typed-record (`rt__*`): el motor de cascada solo engancha en la base, porque el RT no declara hijos propios; base y RT comparten el `id`, así que operar por la base resuelve tanto las capas RT/ext como el árbol de sub-secciones.

Verificado en `src/core/instances.ts` (`deleteImpactPreview`, `summarizeDeleteImpact`), `src/tools/objects.ts` (`delete_object`: preview de impacto + rechazo en `restricted`) y `src/mods/curriculum-design/sections-write.ts` (`cd_delete_section`, comentario "el motor de cascada engancha por el objeto BASE").

### 5.3 uengagement (`eng_*`)
| Tool | Qué hace | Notas |
|---|---|---|
| `eng_search_services`/`get_service`/`create_service` | servicios (Activity:Service, model-v2 S24) | — |
| `eng_list_offerings`/`get_offering`/`create_offering`/`update_offering` | ofertas (Offering → `activityLineId`→ActivityLine) | code(unique), status(enum) |
| `eng_list_events`/`create_event`/`update_event` / `eng_get_activity_line`/`list_activity_lines` | eventos / líneas | — |
| `eng_enroll_student`/`unenroll`/`bulk_enroll`/`list_enrollments` | inscripción (OfferingEnrollment → `studentId`→Student, model-v2) | ⚠️ escritura bloqueada por drift UPU (backlog) |
| `eng_mark_attendance`/`get_attendance` | asistencia (Attendance, status enum Pending/Present/Late/Absent) | ⚠️ drift UPU |
| `eng_search_students`/`get_student` / `eng_search_instructors`/`get_instructor`/`list_instructor_tiers` / `eng_list_activity_types` | lookups | Instructor tiene `instructorCode` |

Flujos de engagement gateados por **capability semántica** `mod/uengagement:*` (no objeto:acción) — S16.

### 5.4 layouts (`view_*`)
| Tool | Qué hace | Notas |
|---|---|---|
| `view_create`/`view_update`/`view_list`/`view_describe`/`view_apply` | crear/consumir vistas (`up1_layen_layout`) | Fase 1 = `RecordList`; default scope **private** (ownerId=usuario; global advertido); `up1_layen_layout` es PUBLIC_OBJECTS (no requiere capability, solo auth) |

## Capa de contratos por objeto (Capa 2)

Config declarativa por objeto que aplica reglas frontend-only ANTES de mutar (P3 — up1 no las enforza server-side):

| ID | Validación | Origen |
|---|---|---|
| V1 | suma de pesos de evaluaciones ≤ techo (parciales permitidos durante edición) | S6 |
| V2 | autoAssign: resolver workflow default → workflowId/initialStatusId (no hardcodear — `isDefault=true` por tenant) | S4 |
| V3 | requiresComment en transiciones que lo exigen | S5 |
| V4 | status readonly: `UpdateActivityValidatedInput` no incluye currentStatusId/workflowId (rechazo a nivel schema) | S5 |
| V5 | allowsVersioning solo en estado Publicado | S5 |
| V6 | uniqueFields al clonar/versionar | S4 |
| V8 | enums config-driven (la API no expone enumValues para Activity) | S4 |
| V9 | validated mutations: objetos con `validatedMutations` rehúsan el CRUD genérico y fuerzan la tool de dominio | S7/S17 (`blockGenericMutation`) |

`getContract` resuelve por **(objectType, recordType)** con fallback 3-pasos (compuesta → objectType → primer match) — permite Activity:Course (cd) y Activity:Service (eng) independientes (S14). Registry con **guard de unicidad** (colisión de objectType entre packs → error claro, S33).

## 7. Extensibilidad — contrato `ModPack` (P5)

Arquitectura **mod packs en un solo server** (Opción A, §12.E). Cada mod es una carpeta autocontenida `src/mods/<mod>/` (manifest + tools + contracts + `domainDoc` opcional) que se auto-registra vía `ModPack`. El único archivo compartido es el manifiesto append-only `src/mods/index.ts` (1 línea por mod). Las tools genéricas (objects/guide/changes/docs) quedan fuera del pack como infra compartida.

**Agregar un objeto nuevo**: agregar una entrada de contrato (`{ objectType, requiredOnCreate, autoAssign, validations, validatedMutations, uniqueFields, fieldDocs[].fk }`) + opcionalmente tools de dominio. El núcleo genérico ya opera cualquier objeto; la lookup allowlist de FKs se deriva sola de los `fieldDocs[].fk` declarados (S11).

**Agregar un mod**: nueva carpeta `src/mods/<mod>/` + 1 línea en el manifiesto. Guía completa en `EXTENDING.md` del repo (reescrita S30).

## 12.R Resolución semántica de inputs no-escalares

**Problema**: las tools de escritura exigen el valor canónico interno (id de FK o token enum en inglés) que el usuario nunca tiene. `get_field_options` listaba ≤100 sin búsqueda por nombre/código ni fold de acentos; `validateEnums` exige match exacto.

**Solución (híbrida, config-driven — `core/resolve.ts`)**:
- (a) tools de escritura aceptan lenguaje de negocio y resuelven internamente, mostrando lo resuelto en el **preview**; ante ambigüedad devuelven candidatos (preview→commit es el punto de desambiguación).
- (b) tool resolutora explícita vía `get_field_options(query)`.
- enums con **sinónimos declarados en el contrato** (`enumLabels`: etiquetas es/en + sinónimos; determinista y auditable).
- `resolveEnum` es **agnóstico de contrato** (recibe values+labels planos — layering: `core/` no depende de `contracts/`).

Patrón de cableado bifurcado: el CRUD genérico resuelve sobre el record completo (config-driven); las tools de dominio resuelven campo a campo. Ambas comparten `core/resolve`.

## Guía derivada de contratos (self-doc accionable — S10/S11)

`describe_object` + `get_create_guide` + `get_field_options` + server `instructions` son **100% derivados del contrato** (single source). Las partes dependientes del tenant (estado inicial, transiciones) se resuelven en vivo (`resolveDefaultWorkflow` + `listInstances(WorkflowTransition)`). Cero drift: cambiar el contrato → la guía lo refleja sin tocar las tools. Umbral 25 para inline de opciones FK; >25 → puntero a `get_field_options`.

## Higiene de salida y contrato conversacional

- **Higiene (S20)**: helper `publicFields` poda mecánicamente `_*` + ecos `{id}`; conserva siempre id+FKs+dominio; `pick()` explícito en tools de dominio. Objetivo: no fugar el shape DB al humano, conservando ids para encadenar llamadas.
- **Confidencialidad (S23)**: directiva en `instructions` — el LLM no transcribe al usuario nombres de tools/objetos/campos internos, recordType, cuids, ni estructura de `layoutConfig`. 3 clases de texto: input schemas (solo LLM, técnicos), strings de OUTPUT (lenguaje de uso), prosa del LLM (gobernada por la directiva).
- **Filtros (S22/S23)**: enseñar la decisión de persistir un filtro (consulta efímera `query_records` ahora vs `view_create` para reúso) sin interrogar en consultas triviales.

Estas convenciones son normativas en `rules/mcp/` (contrato conversacional + higiene de salida).

## Technical reference

- Catálogo vivo auto-generable desde los schemas de las tools (`CAPABILITIES.md`).
- `get_documentation('mods')` reporta por dominio qué tools hay y **qué NO se expone** (ej. uengagement: feedback, availability, edición de ofertas, teaching assignment RW).

## Decisions
Ver `decisions/`: `DEC-*-mcp-multimod-arch` (ModPack + prefijos), `DEC-*-mcp-semantic-resolution`, `DEC-*-mcp-conversational-contract`.

## Rules discovered
Ver `rules/mcp/`: contrato conversacional, higiene de salida, enum-sinónimos, blockGenericMutation.

## Bugs found
Ver `bugs/{módulo}/`: ILIKE acentos, suma de pesos, position null, *Name placeholders, drift OfferingEnrollment, alias RT vs objeto base en requisitos (UPONE-1378 — mismo patrón que `cd_create_section`, causa raíz cazada por smoke E2E, no por unit mockeados).
