# SP6 — Historias de usuario (mod `curriculum-design`)

> Backlog SP6 para crear en Jira (proyecto UPONE · épica **Curriculum Design UPONE-1267** — confirmar). Un ticket por punto del listado. Fuente: `sp6-alcance-v2.html` · 2026-07-06.
>
> **Objetivo del sprint:** aplicar sobre los objetos de la malla (Programa académico, Plan, Activity, Syllabus) las capacidades transversales del listado: editor de requisitos, secciones por config, historial en el history de core con atribución al hijo, flujo de estados con el motor de transiciones de core, y eliminación en cascada sin huérfanos.

---

## Tickets SP6 (uno por punto)

---

### P1 · Requisitos de asignatura — editor visual
**Épica:** Curriculum Design (UPONE-1267) · **SP:** 8 · **Repo:** mod (FE) · **Agrupa:** editor de árbol Y/O · alerta de impacto

**Historia**
> Como **configurador curricular**, quiero editar los prerrequisitos y correquisitos de una asignatura como un árbol de condiciones (Y/O) y ver qué planes se ven afectados al cambiarlos, para definir las condiciones de la malla sin depender de seeds.

**Contexto.** El objeto `requirement` ya se modela y persiste (hoy cargado por seed); no hay UI para crearlo/editarlo. Un requisito es un árbol combinable con Y (cumplir todas) y O (al menos una) — p. ej. "Aprobar Cálculo I Y (Álgebra Lineal O ≥30 cr. de Ciencias Básicas)". El alcance es la edición y persistencia del árbol; el motor que evalúa el avance del estudiante queda fuera.

**Criterios de aceptación**
- [ ] Pestaña "Requisitos" en la ficha de Activity; muestra el árbol existente o vacío con sus grupos Y/O.
- [ ] Modal de alta en 2 pasos (paso 1: tipo — curso / métrica / etc.; paso 2: detalle); la condición se añade al grupo seleccionado.
- [ ] Árbol Y/O anidable, editable; persiste en `requirement` y se reconstruye idéntico al reabrir.
- [ ] Validación: no permite guardar una condición incompleta (mensaje claro).
- [ ] **Alerta de planes afectados** al guardar un requisito de una asignatura usada en varios planes; sin aviso si no hay planes asociados; el aviso no modifica datos.
- [ ] **Permisos (RBAC):** crear/editar requisitos se gatea por la capability de edición del objeto; la pestaña y sus acciones no aparecen sin permiso.
- [ ] Sin motor de evaluación del avance del estudiante (fuera de alcance, documentado).

**Detalle técnico.** Componente FE nuevo (mod-native): pestaña + modal 2 pasos + árbol Y/O + persistencia sobre `requirement`. La alerta lee (solo lectura) los planes que referencian la asignatura (`planEntry.activityId`).

**Diseño/UX.** Referencia: `sp6/mockup-sp6.html` — pantalla de requisitos (pestaña, modal de alta en 2 pasos, árbol Y/O, alerta de impacto). Validar el layout final con diseño antes de FE.

**Testing.** `.spec.ts`: composición Y/O, validación del modal, builder/reconstrucción del árbol, cálculo de planes afectados. Integration de guardado/reconstrucción. Stories del editor y del modal.

**Documentación.** Guía del editor de requisitos (pestaña, modal de 2 pasos, árbol Y/O, alerta de impacto) en `mods/curriculum-design/docs`; dejar explícito que el motor de evaluación del avance queda fuera de alcance.

**MCP.** Verificar/ajustar `cd_manage_requirement` y `cd_get_prereqs` para reflejar el árbol editable.

**Dependencias.** Ninguna.

**Definition of Done.** Tests (unit + integration) en verde con assertions concretas · lint + Prettier + tsc limpios (incl. tests y stories) · lang ES completo · sin artefactos de sync/seed commiteados · tools de up1-mcp actualizadas y verificadas · quality review + smoke en UPU donde aplique.

---

### P2 · Secciones de datos (Plan, Syllabus) — por configuración
**Épica:** Curriculum Design (UPONE-1267) · **SP:** 3 · **Repo:** mod (config) · **Agrupa:** declarar secciones de Curriculum + Offering

**Historia**
> Como **desarrollador del mod**, quiero declarar por configuración las secciones (hijos polimórficos) de Curriculum (Plan) y Offering (Syllabus) replicando las de Activity, para que tengan la misma estructura de secciones sin construir un motor.

**Contexto.** Activity ya tiene secciones configuradas: bloques de contenido que son hijos polimórficos (`CurricularSection` vía `ownerType/ownerId`, tipados por RecordType). Core soporta declararlos en el bloque `metadata.polymorphicChildren` del JSON del objeto (leído por `readPolymorphicChildren`, hoy usado por el deep-clone al versionar). El alcance es replicar esa config a Curriculum y Offering. **Las secciones las define el desarrollador por configuración**; en SP6 el usuario final **no** puede crear ni modificar secciones desde la UI (eso queda fuera de alcance).

**Criterios de aceptación**
- [ ] Curriculum presenta sus secciones, declaradas con el mismo mecanismo que Activity (`metadata.polymorphicChildren` + layout).
- [ ] Offering presenta sus secciones, alineadas con el syllabus.
- [ ] Secciones propias del currículo (ej. graduation profile) aparecen solo donde se declaran.
- [ ] Una entidad sin secciones declaradas no muestra secciones (sin regresión).
- [ ] Las secciones se definen por configuración (dev); el usuario final no las crea ni modifica desde la UI en SP6.
- [ ] **Permisos (RBAC):** capabilities de ver/editar las secciones declaradas en `capabilities.json` del mod, para que la visibilidad/edición respete el rol.

**Detalle técnico.** Declarar `metadata.polymorphicChildren` (+ layout) para Curriculum y Offering, replicando el patrón de Activity. Mecanismo existente (`readPolymorphicChildren`), no se crea uno nuevo.

**Diseño/UX.** Referencia: `sp6/mockup-sp6.html` — presentación de secciones en Plan y Syllabus (para alinear qué secciones y su disposición).

**Testing.** Unit de resolución de secciones por objeto; integration de presentación en ambas entidades.

**Documentación.** Doc de layouts/secciones del mod con las secciones declaradas por entidad (Curriculum, Offering) y la nota de que definir/modificar secciones desde la UI queda fuera de alcance.

**MCP.** Extender/verificar `cd_create_section`, `cd_list_sections`, `cd_get_section`, `cd_update_section`, `cd_reorder_sections` para operar sobre Curriculum y Offering.

**⚠️ Falta definir (acceptance a cerrar en el ticket).** Qué secciones específicas van a cada entidad (Curriculum tiene propias; Offering espeja a Activity). El mecanismo está definido; la lista se completa antes de cerrar.

**Dependencias.** Ninguna.

**Definition of Done.** Tests (unit + integration) en verde con assertions concretas · lint + Prettier + tsc limpios (incl. tests y stories) · lang ES completo · sin artefactos de sync/seed commiteados · tools de up1-mcp actualizadas y verificadas · quality review + smoke en UPU donde aplique.

---

### P3 · Historial de cambios — history de core (DataLog)
**Épica:** Curriculum Design (UPONE-1267) · **SP:** 8 · **Repo:** core + mod (FE) · **Agrupa:** activar DataLog + eliminar ChangeLog · atribución al hijo/RecordType (core) · pestaña por objeto y vista global

**Historia**
> Como **usuario**, quiero ver el historial de cambios de los objetos de la malla —quién cambió qué y cuándo, con el valor antes y después, y qué hijo (sección/RecordType) mutó— en el history de core, dentro de cada objeto y en una vista global, para auditar la malla desde un solo sistema.

**Contexto.** Hoy conviven dos sistemas: `ChangeLog` (del mod, a medida) y `DataLog` (de core, genérico, captura antes/después con el flag `metadata.enableDataLog`). `DataLog` es per-objeto: si se edita una `CurricularSection` (ej. `rt__Modality__curricularsection`) de un Activity, el registro queda en la instancia del hijo, no en el historial del padre. `ChangeLog` sí lo resolvía (`auditCapture.resolver.js` redirige al padre y guarda el hijo en `sourceRef*`, el RecordType en `sourceRefType`). Core ya declara los hijos polimórficos en `metadata.polymorphicChildren` (leído por `readPolymorphicChildren`, usado por el deep-clone).

**Criterios de aceptación**
- [ ] `metadata.enableDataLog` activo en Programa académico, Plan, Activity y Syllabus; `DataLog` registra **quién** hizo el cambio (`userId`) y **cuándo** (fecha/hora), además de `objectName`, `recordId` y `changes {campo:{old,new}}`.
- [ ] **`ChangeLog` se elimina para estos objetos** — se usa `DataLog`; no se mantienen dos sistemas de auditoría. Al deprecarse, se **elimina también su seed** (deja de sembrarse) junto con su resolver/eventos/flow.
- [ ] Definido qué pasa con el **historial ya capturado en `ChangeLog`**: pérdida aceptada o migración a `DataLog` (decisión de producto — ver "Falta definir").
- [ ] Cuando muta un **hijo polimórfico**, `DataLog` atribuye la entrada al **padre** e indica el **RecordType** del hijo y el valor antes/después (detección vía `ownerType/ownerId` + `metadata.polymorphicChildren`, no hardcodeada).
- [ ] Un cambio en el propio padre se registra como cambio directo; un objeto sin hijos polimórficos declarados conserva el comportamiento genérico (sin regresión).
- [ ] Pestaña "Historial" dentro de cada uno de los 4 objetos: columnas **Fecha (cuándo), Usuario (quién)**, Campo, Antes, Después y, para cambios de hijos, el RecordType/sección de origen.
- [ ] Vista global de historial equivalente a la actual.
- [ ] **Permisos (RBAC):** ver el historial (pestaña por objeto y vista global) se gatea por capability de lectura; sin permiso no se muestra.

**Detalle técnico.** (a) Activar DataLog en los 4 objetos y retirar `ChangeLog` (objeto + `auditCapture.resolver.js` + eventos + flow n8n). (b) **Core:** extender `withDataLog.js` para detectar el hijo polimórfico y atribuir al padre + registrar el RecordType (campos nuevos parentObject/parentId/childRecordType o en `metadata`). (c) **FE:** visor sobre `DataLog` (no se reutiliza el de ChangeLog): pestaña por objeto que recolecta las entradas del objeto + las de sus hijos, y vista global.

**Diseño/UX.** Referencia: `sp6/mockup-sp6.html` — vistas de historial (pestaña por objeto con columnas Fecha/Usuario/Campo/Antes/Después + origen del hijo, y vista global).

**Testing.** Unit de detección/atribución del hijo y del armado del visor. Integration: captura en los 4 objetos, no-escritura de ChangeLog, atribución para CurricularSection→Activity y para Curriculum/Offering, vista por objeto y global.

**Documentación.** Guía del historial (pestaña por objeto + vista global), el nuevo shape de `DataLog` con la atribución al hijo/RecordType, y el retiro de `ChangeLog` (deja de usarse en la malla).

**MCP.** Apuntar `get_change_history`, `query_changes`, `analytics_changes` a `DataLog`; `get_change_history` devuelve la atribución (hijo + RecordType + valor).

**Dependencias.** Ninguna (contiene su propio corte de ChangeLog y activación de DataLog).

**Definition of Done.** Tests (unit + integration) en verde con assertions concretas · lint + Prettier + tsc limpios (incl. tests y stories) · lang ES completo · sin artefactos de sync/seed commiteados · tools de up1-mcp actualizadas y verificadas · quality review + smoke en UPU donde aplique.

---

### P4 · Flujo de trabajo — estados y transiciones
**Épica:** Curriculum Design (UPONE-1267) · **SP:** 8 (provisional — depende de la decisión de motor) · **Repo:** mod + core + layout (FE) · **Agrupa:** decidir motor · estados/transiciones por objeto · migrar/estandarizar Activity · reubicar gate de versionado

**Historia**
> Como **configurador**, quiero que los objetos de la malla (Programa académico, Plan, Activity, Syllabus) tengan un flujo de estados con **transiciones válidas** (impedir saltos inválidos), para estandarizar su ciclo de vida.

**Contexto — hay DOS motores de estado (no confundir).** El propio código los distingue (`enum-transition-guard.js`: *"NO CONFUNDIR con WorkflowTransition"*; tabla en `object-manager/docs/enum-transitions.md`):
- **Motor de enum de core** (`properties.transitions`, épica AP UPONE-1293/1294/1296): restricción **declarativa** sobre un campo enum, **igual para todos los tenants** (build-time). Completo y probado, pero **0 objetos lo usan en producción**.
- **Motor del mod** (`Workflow`/`WorkflowStatus`/`WorkflowTransition` + `transitionActivityValidated`): grafo **relacional, configurable por institución en runtime, con historial**. Es el que **ya usa Activity** — más rico que el de core.

Estado hoy: **Activity** ya tiene workflow (motor del mod, en producción). **Curriculum** tiene `status` enum plano (`Draft/Active/Archived`, marcado `NEEDS CLARIFICATION` en su JSON). **AcademicProgram** y **Offering** **no tienen ningún campo de estado** → hay que definir sus estados desde cero.

**Decisión de arquitectura (resolver ANTES de estimar/ejecutar).** ¿Se estandariza en el motor de **core enum** (config-driven, uniforme por tenant) o en el **motor del mod** (relacional, por institución)? No es cosmético: migrar Activity del motor del mod al de core sería un **downgrade** (pierde config por institución, runtime y auditoría de transición). El motor elegido cambia el trabajo — *declarar config* (core) vs *generalizar el coordinador relacional del mod a 3 objetos + su capa MCP* (mod) — y por eso el SP es provisional.

**Criterios de aceptación** (comunes; los específicos dependen del motor elegido)
- [ ] Resuelta y documentada la **decisión de motor** (core enum vs mod relacional) para los 4 objetos.
- [ ] Los 4 objetos tienen flujo de estados operativo con **transiciones válidas** (rechazo de saltos no declarados) según el motor elegido.
- [ ] **AcademicProgram y Offering:** definidos sus estados desde cero (hoy sin campo de estado).
- [ ] **Activity:** si se estandariza en core, migración **sin pérdida** de lo que hoy usa (config por institución, historial) — o se documenta explícitamente qué se acepta perder.
- [ ] **Gate de versionado reubicado:** desde qué estado se versiona + estado inicial, fuera del `WorkflowStatus` del mod (`version-from-source.js:77` depende de él hoy). Deep-clone de hijos polimórficos preservado.
- [ ] Si se depreca el motor del mod, se **elimina su seed** (`_data-workflow-objects.js`, `_data-workflow-activate.js`).
- [ ] **Permisos (RBAC):** transiciones gateadas por capability (ambos motores lo soportan; core vía `requiredCapabilities` por transición).

**Detalle técnico.** *Camino core:* declarar `transitions` en el enum del objeto (codegen → `core_FieldDefinition.properties.transitions`; validado por `enforceEnumTransitions`). *Camino mod:* generalizar `transitionActivityValidated` + objetos `Workflow*` a Curriculum/Offering/AcademicProgram (el seed ya trae `curriculumPlan-standard`). En ambos, reubicar el gate de versionado. **Nota MCP:** `cd_transition_program` opera hoy sobre `Activity` (recordType=Course), **no** sobre `AcademicProgram` — alinear el vocabulario.

**Diseño/UX.** Referencia: `sp6/mockup-sp6.html` — estados y transiciones (badge de estado, flujo de transiciones permitidas).

**Testing.** Integration: transición válida/inválida y con condición por objeto; migración de Activity sin regresión; gate de versionado desde config (permitido/no permitido, estado inicial); regression del deep-clone al versionar.

**Documentación.** Config `transitions` por objeto, la ubicación de la config del gate de versionado, y la migración de Activity del workflow del mod al enum de core.

**MCP.** `cd_transition_program`, `cd_list_transitions` operan contra el enum de core; `cd_version_program`, `cd_version_curriculum`, `cd_get_version_chain` con el nuevo gate.

**Dependencias.** Decisión de motor (bloqueante). El motor de enum de core (backend) ya está en object-manager; su **FE (AP-03/AP-04: `useEnumTransitions.ts`, `BulkTransitionPreview.vue`) vive en el repo `layout`, hoy ~17 commits atrás de `origin/develop` y ausente en el checkout local** → actualizar `layout` si se elige el camino core.

**Definition of Done.** Tests (unit + integration) en verde con assertions concretas · lint + Prettier + tsc limpios (incl. tests y stories) · lang ES completo · sin artefactos de sync/seed commiteados · tools de up1-mcp actualizadas y verificadas · quality review + smoke en UPU donde aplique.

---

### P5 · Eliminación — hard delete en cascada sin huérfanos
**Épica:** Curriculum Design (UPONE-1267) · **SP:** 8 · **Repo:** core + mod · **Agrupa:** `onDelete` FK · cascada polimórfica (core) · modal de confirmación

**Historia**
> Como **usuario**, quiero que al eliminar un objeto de la malla se borren de forma segura el padre y todos sus hijos, con un modal que me lo advierta, sin dejar registros huérfanos, para gestionar la malla sin residuos ni pérdidas accidentales.

**Contexto.** El hard delete genérico ya existe (`deleteInstance`) y la protección de FK reales es automática (`referenceValidationService`, introspección de Prisma; hoy **bloquea** si hay referencias). El comportamiento de las FK reales se declara con `onDelete` por campo en el JSON (Cascade/Restrict), honrado por el codegen del schema Prisma. Las relaciones **polimórficas** (`ownerType/ownerId`) no son FK → la BD no las protege → quedan huérfanos. Core ya declara esos hijos en `metadata.polymorphicChildren` y el clonado ya los consume, **pero el borrado no** — es cerrar esa inconsistencia (fix), no una feature nueva. En layout ya existe `CriticalWarningModal.vue`.

**Objetos alcanzados (matriz de borrado).** El borrado aplica a los 4 objetos base y arrastra sus hijos por FK real y polimórficos:

| Objeto base (a borrar) | Hijos por FK real | Hijos polimórficos (`ownerType/ownerId`) |
|---|---|---|
| AcademicProgram | — | Curriculum |
| Curriculum (Plan) | planEntry · requirementCategory | CurricularSection · requirement |
| activity (Course) | Offering · planEntry (`activityId`) | CurricularSection · requirement |
| Offering (Syllabus) | — | CurricularSection |

- **RecordTypes con tablas:** `CurricularSection` y `requirement` son objetos **con RecordTypes** (`rt__Modality__curricularsection`, `rt__Group__requirement`, etc.). Cada instancia hija vive en **varias tablas** (base + `rt__…` + `ext__…`); el borrado de cada hijo debe eliminar **todas sus capas** — como ya hace `deleteInstance` para un RT directo (borra `ext__` → `rt__` → base).
- **Árboles self-ref:** `CurricularSection.parentId` y `requirement.parentId` forman árboles; la cascada debe recorrer **de la rama a la hoja, sin importar el nivel** — a cualquier profundidad, todos los descendientes se borran.
- **Auditoría polimórfica:** al borrar una entidad, sus `changeLog` / `workflowTransitionHistory` (polimórficos) también deben limpiarse.

**Criterios de aceptación**
- [ ] Aplica a los **4 objetos base**: AcademicProgram, Curriculum, Activity, Offering.
- [ ] FK reales declaradas con `onDelete: Cascade` (comportamiento por defecto: borrar los hijos junto al padre); comportamiento verificado tras codegen + migración. `Restrict` solo como override puntual si una relación lo requiere.
- [ ] El borrado lee `metadata.polymorphicChildren` y **cascada los hijos polimórficos**; cada hijo que es RecordType se borra en **todas sus capas** (base + `rt__` + `ext__`).
- [ ] **Recursión a profundidad completa**: los árboles self-ref (`CurricularSection.parentId`, `requirement.parentId`) se borran **de la rama a la hoja, en cualquier nivel** — ningún descendiente queda huérfano.
- [ ] **Cascada como comportamiento por defecto**; config por relación para excepciones (Restrict) — una relación Restrict bloquea el borrado.
- [ ] Un objeto sin hijos polimórficos declarados conserva el comportamiento genérico (sin regresión).
- [ ] Al eliminar, un **modal de confirmación** advierte que se borrarán el padre y N hijos (con tipos/RecordTypes); confirmar ejecuta la cascada, cancelar no borra nada.
- [ ] **Permisos (RBAC):** eliminar (cascada) se gatea por la capability `objectname:delete`; al ser una acción destructiva, no está disponible sin permiso (la acción del listado se oculta/deshabilita).
- [ ] Tras borrar cualquiera de los 4 objetos, **no quedan huérfanos en ningún nivel ni capa** (test que recorre árbol + tablas `rt__`/`ext__`).

**Detalle técnico.** (a) Declarar `onDelete` por campo FK en el JSON. (b) **Core:** extender `deleteInstance`/`deleteBulkInstances` para leer `readPolymorphicChildren` y borrar en cascada **recursiva a profundidad completa** (siguiendo `recursiveBy` y las relaciones polimórficas de cada nivel), con config por relación. Para cada hijo que es RecordType, reusar la lógica de borrado de RT ya existente (elimina `ext__` → `rt__` → base). (c) **FE:** integrar `CriticalWarningModal.vue` en la acción de borrado del RecordList (`useRowMutation` → `deleteInstance`), mostrando el conteo/tipos de hijos.

**Diseño/UX.** Referencia: `sp6/mockup-sp6.html` — modal de confirmación de eliminación (advertencia de padre + N hijos afectados).

**Testing.** Unit del recorrido recursivo (varios niveles) y del modal (confirmar/cancelar, conteo). Integration: cascada completa a profundidad (padre → hijos → nietos), borrado de las capas de RecordType (`rt__`/`ext__`), Restrict por relación, test anti-huérfanos por objeto (verificando árbol + tablas), flujo eliminar→modal→cascada.

**Documentación.** Borrado en cascada (comportamiento por defecto), el `onDelete`/config por relación (Restrict como override) y el comportamiento del modal de confirmación.

**MCP.** `cd_delete_section` y `delete_object` reflejan la cascada en su preview→commit (el preview lista los hijos a borrar).

**Dependencias.** Ninguna.

**Definition of Done.** Tests (unit + integration) en verde con assertions concretas · lint + Prettier + tsc limpios (incl. tests y stories) · lang ES completo · sin artefactos de sync/seed commiteados · tools de up1-mcp actualizadas y verificadas · quality review + smoke en UPU donde aplique.

---

## Resumen de planificación SP6

| Ticket | Punto | SP | Repo |
|---|---|---:|---|
| P1 Requisitos de asignatura | 1 | 8 | mod FE |
| P2 Secciones de datos | 2 | 3 | mod config |
| P3 Historial (DataLog) | 3 | 8 | core + mod FE |
| P4 Flujo de trabajo | 4 | 8* | mod + core + layout |
| P5 Eliminación en cascada | 5 | 8 | core + mod |
| **Total SP6** | | **~35** | |

<sub>* P4 provisional: depende de la decisión de motor (core enum vs mod relacional), que gatea el alcance y la estimación.</sub>

**Comparación:** SP5 comprometió **47 SP** en 9 tickets. SP6 estimado en **~35 SP** (5 tickets consolidados): buena parte es aplicar config y cerrar huecos sobre capacidades que core ya provee (`DataLog`, `metadata.polymorphicChildren`), no construir plataforma. Validar contra la velocity real del equipo; el historial tiende a subestimar ~30%.

**Mayor peso/riesgo:** P3 y P5 (trabajo en core) y **P4** (tiene una decisión de arquitectura sin resolver — cuál de los dos motores de estado estandarizar — que gatea su estimación). Ambos pueden desglosarse en subtareas de Jira bajo el mismo ticket si el equipo prefiere seguimiento fino, manteniendo el ticket como unidad de entrega.

### Secuencia recomendada
1. **Arrancan en paralelo (independientes):** P1 (editor FE), P4 (workflow — config + motor de core ya listo) y P2 (secciones — config, la más pequeña).
2. **Después (core + FE, consumen la declaración polimórfica):** P3 (historial) y P5 (eliminación).

**Camino crítico — declaración `metadata.polymorphicChildren`.** P2, P3 y P5 la comparten. Para evitar conflictos si se tocan en paralelo, **un solo responsable define el formato de la declaración**, idealmente al ejecutar **P2** (que declara las secciones de Curriculum/Offering). P3 y P5 la **consumen**; si necesitan declarar hijos adicionales (ej. `requirement`, relaciones de auditoría), los agregan **en el mismo bloque y formato**. Establecerla temprano desbloquea P3 y P5.

### Falta definir (antes de cerrar cada ticket)
- **P2:** lista de secciones específicas por entidad.
- **P3:** qué pasa con el historial ya capturado en `ChangeLog` — pérdida aceptada o migración a `DataLog`.
- **P4 (bloqueante):** qué motor de estado estandarizar — **core enum** (declarativo, uniforme) vs **mod relacional** (por institución, con historial). Migrar Activity al de core sería un downgrade.
- **P4 (producto):** estados y transiciones de **AcademicProgram y Offering** (hoy sin campo de estado) — decisión de negocio.
- **P4:** ubicación exacta de la config del gate de versionado.
