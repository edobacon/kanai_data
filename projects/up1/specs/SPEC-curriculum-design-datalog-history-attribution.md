---
id: SPEC-curriculum-design-datalog-history-attribution
project: up1
ticket: TICKET-102
status: in_progress
---

# P3 — Historial de cambios en el DataLog de core (atribución polimórfica + retiro de ChangeLog)

# P3 — Historial de cambios en el DataLog de core (atribución polimórfica + retiro de ChangeLog)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico esta en Requirements, Artifacts y Tasks.*

**Que se quiere**: hoy la malla curricular tiene **dos** sistemas de auditoría conviviendo — `ChangeLog` (a medida del mod, con resolver de 951 líneas + flow de n8n + ~807 líneas de tests, y que en realidad solo audita `Activity` + 2 hijos) y `DataLog` (genérico de core, ya encendido por default). El negocio quiere un solo lugar para ver "quién cambió qué y cuándo, con el valor antes/después, y **qué hijo (sección/RecordType) mutó**". Este ticket consolida todo en el `DataLog` de core: le enseña a `withDataLog.js` (core) a atribuir la mutación de un hijo polimórfico al **padre** (+ RecordType), retira por completo el `ChangeLog`, y monta el visor "Historial" **reutilizando** el visor de DataLog que ya existe en up1-manager. Además apunta 3 tools de up1-mcp a `DataLog`.

**Decisiones criticas que necesitan tu OK** (cerradas en intake/design — confirmá o corregí):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Atribución vía columnas nuevas en `DataLog`** (`parentObject`/`parentId`/`childRecordType`), no en `metadata` | El visor filtra "historial del padre X" (directo + hijos) por columna e indexable; `metadata` (JSON) no es filtrable por el RecordList genérico. Es comportamiento genérico de core, no un tag de mod. Cambio de schema core (RULE-dev-004). |
| 2 | **Mecanismo Opción A**: reverse-index de `polymorphicChildren` (hijo→{padre, vía}) + leer `ownerType`/`ownerId` del **snapshot del hijo** que `withDataLog` ya audita | Robusto ante borrado en cascada (el dato de atribución viaja en el snapshot del hijo → atribuye al padre aunque el padre ya se borró; coordina con P5). Genérico, sin hardcode, sin query extra. |
| 3 | **Los 4 objetos = AcademicProgram, Curriculum, Activity, Offering** (el "Syllabus" del AC = `Offering[recordType=Syllabus]`, alineado con P4/103) | Define dónde se declara `enableDataLog` y qué pestañas monta el visor. |
| 4 | **Retiro TOTAL de `ChangeLog`** (objeto + `auditCapture.resolver.js` + eventos + flow n8n + seed + ~807 L tests + layouts) | `ChangeLog` queda huérfano tras consolidar. Es limpieza destructiva → consent al migrate/borrar. |
| 5 | **Histórico ya capturado en `ChangeLog` = pérdida aceptada** (no se migra); `source`/`versionSourceId` tampoco se portan | Sin consumidor verificado; `DataLog` genérico no los modela. Pérdida consciente (DET-4), no en silencio. |
| 6 | **Comentario/justificación de transición (BR-WKF-001) = diferido** a historia futura (cambio de estado por UI) | Hoy el cambio de estado no ocurre por una UI que pida justificación; capturarla no aplica todavía. |

**Riesgos principales y como los mitigamos**:

- **La atribución inversa es infra nueva en core** (el índice hijo→padre no existe; `readPolymorphicChildren` es padre→hijos) → S1 la construye genérica y aislada, con unit de atribución `CurricularSection→Activity` verde antes de tocar nada más; gated por review del team up1 (RULE-dev-004).
- **Regresión en objetos sin hijos polimórficos** (el decorator es transversal a TODA la plataforma) → REQ-05 exige que un objeto sin `polymorphicChildren` conserve el comportamiento genérico; unit de no-regresión + `dataLog.integration.test.js` verde antes de cerrar S1.
- **Perder la captura de transiciones que P4 (103) difirió** → REQ-01 verifica que el cambio de `status`/enum se registre en `DataLog` como cualquier campo (disparado por `onTransition`); test explícito en S2.
- **Testing de atribución de Curriculum/Offering no ejecutable sin P2** (declara `polymorphicChildren` de esos 2, fuera de alcance) → el mecanismo genérico los cubre automáticamente cuando existan; S5 deja una verificación **diferida** (no bloquea el cierre; se marca como backlog `could` con nota).
- **Retiro destructivo del ChangeLog** → S3 confirma cero consumidores (grep) antes de borrar; migrate con consent; rollback documentado (restore JSON + migración inversa).
- **up1-mcp no verificable en este workspace** → el retarget de las 3 tools se valida contra el shape nuevo de `DataLog`; si el entorno MCP no está, se marca `assumed` con verificación en execute.

**Que NO se hace en este ticket** (limites del scope):

- **Declarar `polymorphicChildren` de Curriculum/Offering** — eso es P2 (UPONE-1379), fuera de nuestro alcance. P3 solo aporta el mecanismo genérico que los cubre cuando existan.
- **Capturar el comentario/justificación de transición** (BR-WKF-001) — diferido (decisión 6).
- **Migrar el histórico viejo de `ChangeLog`** — pérdida aceptada (decisión 5).
- **Portar `source`/`versionSourceId`** — pérdida aceptada.
- **Tocar uengagement** — read-only en SP6.

**Tamano estimado**: 6 sessions, ~13 SP (est.), ~11-15h efectivas. La más riesgosa es **S1 (atribución en core, camino crítico)**; la más sensible por verificación es **S4 (visor, smoke UI real en UPU)**.

**Como vas a saber que funciona**:

- En UPU, edito una `CurricularSection` (ej. el peso de una evaluación) de un `Activity` y su entrada aparece en la pestaña "Historial" del **Activity padre**, mostrando el RecordType del hijo (`EvaluationComponent`), el valor antes y después, quién y cuándo.
- Edito un campo directo del `Activity` (ej. su nombre) y aparece como cambio directo (sin `parentObject`).
- Transiciono el `status` de un `Curriculum` y el cambio de estado queda en el historial (old→new).
- Un objeto sin hijos polimórficos (ej. `Person`) sigue registrando en `DataLog` igual que antes (sin regresión).
- La vista global de historial muestra las entradas equivalente a la actual; sin permiso `datalog:view` no se ve.
- El `ChangeLog` ya no existe (objeto, resolver, flow, seed, tests) y ninguna mutación lo escribe.
- La suite (unit + integration) queda verde; las 3 tools de up1-mcp devuelven la atribución.

---

## Purpose

Consolidar la auditoría de la malla curricular en el `DataLog` genérico de core: extender el decorator `withDataLog.js` (core) para atribuir la mutación de un hijo polimórfico al objeto padre + RecordType (vía reverse-index de `metadata.polymorphicChildren` + `ownerType`/`ownerId` del snapshot del hijo, persistido en 3 columnas nuevas de `DataLog`), activar `enableDataLog` explícito en los 4 objetos, retirar el subsistema `ChangeLog` del mod que queda duplicado/huérfano, y montar el visor "Historial" reutilizando el de up1-manager. Actor: **usuario/auditor** (consulta) + **plataforma** (captura). Toca `object-manager` (core: `withDataLog.js` + schema `DataLog`), `mods/curriculum-design` (retiro ChangeLog + config del visor), `layout`/suite (visor) y `up1-mcp` (3 tools).

## Condicional — dependencia de UPONE-1379 (P2)

> Descubierto al analizar **PR [#14](https://bitbucket.org/uplanner/curriculum-design/pull-requests/14) (UPONE-1379, OPEN)** el 2026-07-08. P2 estaba marcado "fuera de alcance" pero su PR **fija el formato de la declaración polimórfica** que el reverse-index de P3 (REQ-04) consume, y **habilita** la atribución de Curriculum/Offering/CurricularLink. **Decisión del dev (2026-07-08): P3 avanza desde `develop` asumiendo 1379 incorporado (Caso A baseline).** S1.T0 confirma el estado como guard.

**Qué trae 1379 (verificado en el diff del PR):**
- `CurricularSection.json`: `ownerType.enum` pasa de `[Activity, Offering]` a `[Activity, Offering, Curriculum]`.
- `Curriculum.json`: `metadata.polymorphicChildren = [{ object: CurricularSection, via: "ownerType/ownerId", ownerTypeValue: "Curriculum", recursiveBy: "parentId" }]`.
- `Offering.json`: `metadata.polymorphicChildren` (sections) **+ `polymorphicChildrenDerived = [{ object: CurricularLink, via: "sourceSectionId,targetSectionId", remapTo: "sections" }]`**.
- RT `GraduationProfile` (hijo de Curriculum) + layouts `default_Curriculum_view/edit`, `default_Offering_syllabus_view/edit` con tabs nuevos + lang + seed + `graduationProfileUniqueness`.
- **NO toca** `object-manager` (core de P3: `withDataLog.js`, `datalog.json`), ni `auditCapture.resolver.js`, ni `events/`, ni `flows/audit-capture.json`. → cero conflicto con el core de P3 ni con los targets de retiro (REQ-02).

**Baseline: Caso A — CONFIRMADO y SOBRE-SATISFECHO (verificado 2026-07-09).** develop (`curriculum-design` @ `2b17c2d`, `object-manager` @ `1530802`) incorpora **1379/P2 (PR #14 `ec157c1` + PR #15 `b750f63`)** y **P4/1381 (mod PR #16, object-manager PR #395)**. Verificado en el árbol: `CurricularSection.ownerType = [Activity, Offering, Curriculum]`, `Curriculum.metadata.polymorphicChildren`, `Offering.metadata.polymorphicChildrenDerived` (CurricularLink), RT `GraduationProfile`, y Activity+Curriculum con `status`+`transitions` (enum engine de P4). **S1.T0 re-confirma** al abrir la rama de trabajo (base = develop). **Caso B ya no aplica** (contingencia solo si un reset revierte develop).

| | **Caso A — baseline (1379 en develop)** | **Caso B — contingencia (1379 aún fuera → escalar)** |
|---|---|---|
| Acción de arranque | Traer 1379 a la rama de épica (rebase/merge develop) para que codegen + reverse-index vean las declaraciones | **Escalar al dev**: decidir esperar el merge o autorizar Caso B explícitamente |
| Reverse-index (S1.T4) | Consume las 3 formas reales (owner directo, recursivo, derivado) para Activity + Curriculum + Offering + CurricularLink | (si se autoriza) genérico, solo con declaraciones presentes; sin forkear el formato de 1379 |
| Atribución testable | Curriculum (GraduationProfile), Offering, CurricularLink derivado, sección anidada — **todo ejecutable** | solo Activity; el resto sin verificar |
| S5.T5 | **Test de integración real** (parte del DoD) | backlog diferido `could` |
| Layouts (S4.T3) | "Historial" se agrega SOBRE los tabs de 1379 (Curriculum/Offering syllabus) — rebase | sin overlap |
| lang ChangeLog | 1379 renombró `lang/es_CL@ChangeLog.json`; el retiro (S3) lo elimina | sin cambio que limpiar |

## Requirements

### REQ-01: Activar `enableDataLog` en los 4 objetos + capturar cambios de estado

> **Que cambia**: los 4 objetos de la malla declaran `metadata.enableDataLog: true` explícito; toda mutación (incluido el cambio de `status`/enum) queda en `DataLog` con quién/cuándo/diff.
> **Por que**: hoy `DataLog` está ON por default (implícito); declararlo explícito lo hace intención de diseño, y el cambio de estado (que P4/103 dejó de historiar al retirar `workflowTransitionHistory`) debe quedar registrado.

El sistema MUST registrar en `DataLog` (con `userId`, `createdAt`, `objectName`, `recordId`, `changes {campo:{old,new}}`) toda operación create/update/delete sobre **AcademicProgram, Curriculum, Activity y Offering**, incluyendo el cambio de `status`/enum como un campo más. Los 4 objetos declaran `metadata.enableDataLog: true` explícito.

**Actor**: system · **Layers**: config, backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: captura de update
- **GIVEN** un `Curriculum` con `enableDataLog: true`
- **WHEN** `updateInstance` cambia su nombre
- **THEN** se escribe una fila `DataLog` con `action=UPDATE`, `changes.name={old,new}`, `userId` y `createdAt`

#### Scenario: captura de transición de estado (vínculo P4)
- **GIVEN** un `Activity` en `Draft`
- **WHEN** transiciona a `InReview` (motor de enum de core, `onTransition`)
- **THEN** `DataLog` registra `changes.status={old:'Draft', new:'InReview'}`

#### Scenario: error — objeto sin permiso de escritura no genera fila fantasma
- **GIVEN** una mutación que falla por auth
- **WHEN** el resolver rechaza
- **THEN** NO se escribe fila en `DataLog` (solo mutaciones exitosas)

</details>

#### Acceptance
El auditor ve, en el historial de cada uno de los 4 objetos, los cambios con quién/cuándo/antes/después, incluidos los cambios de estado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | update Curriculum | Curriculum enableDataLog | update name | fila DataLog | changes.name={old,new}, userId, createdAt |
| 2 | transición Activity | Activity Draft | →InReview | fila DataLog | changes.status={Draft,InReview} |
| 3 | los 4 objetos | los 4 con flag | create/update c/u | 4 filas | una por objeto con action correcto |

### REQ-04: Atribución del hijo polimórfico al padre (columnas nuevas en DataLog)

> **Que cambia**: cuando muta un hijo polimórfico (ej. `CurricularSection`), su entrada de historial se atribuye al **padre** (`Activity`) e indica el RecordType del hijo, en columnas consultables de `DataLog`.
> **Por que**: `DataLog` es per-objeto — hoy el cambio del hijo queda en el hijo y el usuario que abre la ficha del padre no lo ve. `ChangeLog` lo resolvía con hardcode; esto lo hace genérico.

El sistema MUST, al registrar en `DataLog` la mutación de un objeto que es hijo polimórfico declarado, poblar `parentObject`, `parentId` y `childRecordType` (= RecordType del hijo). La detección es **genérica** (reverse-index construido desde `metadata.polymorphicChildren` de todos los objetos), **sin hardcodear** el mapeo hijo→padre. Se agregan 3 columnas nullable a `DataLog` (ver Artifacts).

**Tres caminos de resolución del padre** (el reverse-index debe cubrir los 3 — shape de la declaración fijado por UPONE-1379/P2, ver Condicional 1379):

1. **Owner directo** — el hijo trae `ownerType`/`ownerId` en su snapshot (`via: "ownerType/ownerId"`, con `ownerTypeValue`). `parentObject = ownerType`, `parentId = ownerId`. Ej. `CurricularSection` → `Activity`/`Curriculum`/`Offering`.
2. **Recursivo** — hijo anidado bajo otro hijo (`recursiveBy: "parentId"`). Resolver la cadena `parentId` hacia arriba hasta el owner raíz; atribuir al owner raíz, no al padre inmediato.
3. **Derivado** — hijo SIN `ownerType`/`ownerId` (`polymorphicChildrenDerived`, `via: "sourceSectionId,targetSectionId"`, `remapTo`). Ej. `CurricularLink` (uno de los 3 que auditaba ChangeLog): resolver vía la sección referenciada → su owner. **NO tratarlo como cambio directo** (ver edge corregido).

**Actor**: system · **Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: atribución CurricularSection→Activity
- **GIVEN** una `CurricularSection` (RecordType `EvaluationComponent`) con `ownerType='Activity'`, `ownerId='act_9'`
- **WHEN** `updateInstance` cambia su `weight`
- **THEN** la fila `DataLog` tiene `objectName='CurricularSection'`, `recordId='sec_1'`, `parentObject='Activity'`, `parentId='act_9'`, `childRecordType='EvaluationComponent'`, `changes.weight={old,new}`

#### Scenario: robustez ante borrado en cascada
- **GIVEN** un `Activity` con una `CurricularSection` hija que se borra en cascada
- **WHEN** el DELETE del hijo pasa por `withDataLog` (snapshot previo con `ownerType`/`ownerId`)
- **THEN** la fila `DataLog` atribuye al padre aunque el padre ya se haya borrado (el dato viaja en el snapshot)

#### Scenario: derivado — CurricularLink sin ownerType/ownerId
- **GIVEN** un `CurricularLink` (declarado en `polymorphicChildrenDerived` de su owner, `via: sourceSectionId,targetSectionId`)
- **WHEN** muta
- **THEN** se resuelve vía la sección referenciada → su owner; `parentObject`/`parentId`/`childRecordType` poblados (NO null)

#### Scenario: edge — objeto realmente no polimórfico
- **GIVEN** un objeto que el reverse-index no reconoce en NINGUNO de los 3 caminos (ni owner directo, ni recursivo, ni derivado)
- **THEN** `parentObject`/`parentId`/`childRecordType` quedan null (cambio tratado como directo)

</details>

#### Acceptance
El auditor abre la ficha del `Activity` y ve, en su historial, el cambio hecho en una de sus secciones, con el RecordType de la sección indicado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | owner directo | CurricularSection ownerType=Activity | update weight | fila DataLog | parentObject/parentId/childRecordType poblados |
| 2 | cascada | hijo borrado en cascada | DELETE vía withDataLog | fila DataLog | atribuido al padre desde snapshot |
| 3 | derivado | CurricularLink (polymorphicChildrenDerived) | update | fila DataLog | atribuido vía sección→owner (no null) |
| 4 | recursivo | CurricularSection anidada (parentId) | update | fila DataLog | atribuido al owner raíz |
| 5 | no-hijo | objeto no polimórfico en ningún camino | update | fila DataLog | columnas de atribución null |

### REQ-02: Retirar el subsistema `ChangeLog`

> **Que cambia**: `ChangeLog` deja de existir para la malla — objeto, resolver, eventos, flow de n8n, seed y layouts.
> **Por que**: consolidado en `DataLog`, mantener dos sistemas de auditoría es deuda (Q2: "no nos sirve tener funcionalidades duplicadas").

El sistema MUST eliminar el objeto `ChangeLog` (`mods/curriculum-design/objects/changeLog.json`), su resolver `auditCapture.resolver.js`, los eventos `{Activity,CurricularSection,CurricularLink}-*.json` que lo disparan, el flow n8n `flows/audit-capture.json`, su **seed** (deja de sembrarse) y sus layouts (`default_ChangeLog_list.json` + tab "Historial" hardcodeado en `default_Activity_view.json`), junto con los ~807 L de tests de integración de ChangeLog. Ninguna mutación debe escribir en `ChangeLog` tras el retiro.

**Actor**: system · **Layers**: config, backend, orchestration, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: no-escritura de ChangeLog
- **GIVEN** el retiro aplicado
- **WHEN** muta un `Activity` o una `CurricularSection`
- **THEN** NO se crea fila en `ChangeLog` (el objeto ya no existe); la entrada va a `DataLog`

#### Scenario: retiro sin romper la malla
- **GIVEN** cero consumidores de `ChangeLog`/`recordAuditEvent` (verificado por grep)
- **WHEN** se eliminan objeto+resolver+eventos+flow+seed
- **THEN** build + suite del mod verdes; seed de UPU corre sin el ChangeLog

</details>

#### Acceptance
El configurador corre seed en UPU y `ChangeLog` no se siembra; ninguna operación lo escribe.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | no-escritura | retiro aplicado | mutar Activity | — | 0 filas ChangeLog, 1 fila DataLog |
| 2 | seed limpio | seed UPU | run seed | — | sin objeto/seed ChangeLog, sin error |

### REQ-03: Destino del histórico `ChangeLog` = pérdida aceptada

> **Que cambia**: el historial ya capturado en `ChangeLog` no se migra a `DataLog`; se acepta la pérdida.
> **Por que**: sin consumidor verificado del histórico viejo y `DataLog` genérico no modela `source`/`sourceRef*`/`versionSourceId`; la migración parcial no aporta valor proporcional al costo.

El sistema MUST tratar el histórico existente de `ChangeLog` como **pérdida aceptada** (no se migra). Los campos `source` y `versionSourceId` tampoco se portan a `DataLog`. La pérdida se documenta explícitamente (DET-4: no en silencio).

**Actor**: producto · **Layers**: database

#### Acceptance
El equipo acepta explícitamente que el historial pre-retiro no queda disponible en el nuevo visor.

### REQ-05: Cambio directo del padre + sin regresión

> **Que cambia**: el cambio en el propio padre se registra como cambio directo (sin atribución); un objeto sin hijos polimórficos declarados conserva el comportamiento genérico.
> **Por que**: `withDataLog` es transversal a TODA la plataforma — la extensión no debe alterar la auditoría de objetos ajenos a la malla.

El sistema MUST registrar el cambio en el propio padre como entrada directa (`parentObject`/`parentId`/`childRecordType` null) y MUST preservar el comportamiento genérico de `DataLog` para objetos sin `polymorphicChildren` (sin regresión).

**Actor**: system · **Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: cambio directo
- **GIVEN** un `Activity`
- **WHEN** se edita su nombre
- **THEN** fila `DataLog` con columnas de atribución null

#### Scenario: no-regresión objeto ajeno
- **GIVEN** un `Person` (sin hijos polimórficos)
- **WHEN** se edita
- **THEN** fila `DataLog` idéntica al comportamiento actual (sin columnas nuevas pobladas)

</details>

#### Acceptance
La auditoría de objetos fuera de la malla (ej. `Person`) sigue registrando exactamente igual que antes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | directo | Activity | update name | fila DataLog | atribución null |
| 2 | no-regresión | Person | update | fila DataLog | comportamiento genérico intacto (dataLog.integration.test.js verde) |

### REQ-06: Pestaña "Historial" por objeto (visor reusado)

> **Que cambia**: cada uno de los 4 objetos tiene una pestaña "Historial" con Fecha, Usuario, Campo, Antes, Después y —para cambios de hijos— el RecordType/sección de origen.
> **Por que**: el usuario audita desde la ficha del objeto; el visor recolecta el historial del objeto **+ el de sus hijos** (atribuido vía REQ-04).

El sistema MUST mostrar una pestaña "Historial" en los 4 objetos, **reutilizando/parametrizando** el visor de `DataLog` de up1-manager (RecordList sobre `DataLog`), extendido para filtrar por `recordId` del objeto **O** por `parentObject`+`parentId` (para traer los cambios de sus hijos). Columnas: Fecha, Usuario, Campo, Antes, Después, RecordType/sección origen. NO se reutiliza el visor del `ChangeLog` (que se retira).

**Actor**: user · **Layers**: frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: historial del padre incluye hijos
- **GIVEN** un `Activity` con cambios directos y cambios en sus secciones
- **WHEN** se abre la pestaña "Historial"
- **THEN** aparecen ambos: los directos y los de los hijos (con RecordType), ordenados por fecha

#### Scenario: filtro por recordId
- **GIVEN** la pestaña de un objeto puntual
- **THEN** el RecordList filtra `recordId = {parentId}` OR (`parentObject`={obj} AND `parentId`={id})

</details>

#### Acceptance
El auditor abre "Historial" en un `Activity` y ve, en una sola tabla, sus cambios y los de sus secciones con el RecordType.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | recolección | Activity + secciones con cambios | abrir Historial | tabla | directos + hijos con RecordType |
| 2 | columnas | historial con atribución | render | tabla | Fecha/Usuario/Campo/Antes/Después/Origen |

### REQ-07: Vista global de historial

> **Que cambia**: existe una vista global de historial equivalente a la actual del ChangeLog.
> **Por que**: auditar la malla completa desde un solo lugar, no objeto por objeto.

El sistema MUST proveer una vista global de historial sobre `DataLog` (RecordList sin filtro de `recordId`), con las mismas columnas del visor por objeto, equivalente a la vista global actual de `ChangeLog`.

**Actor**: user · **Layers**: frontend, config

#### Acceptance
El auditor abre la vista global y ve el historial de todos los objetos de la malla con la atribución.

### REQ-08: RBAC por capability de lectura

> **Que cambia**: ver el historial (pestaña por objeto y vista global) se gatea por capability de lectura; sin permiso no se muestra.
> **Por que**: el historial puede exponer quién hizo qué — es dato sensible.

El sistema MUST gatear el visor (pestaña + vista global) por la capability `datalog:view`. Sin la capability, la pestaña/vista no se muestra.

**Actor**: user · **Layers**: frontend, backend

#### Acceptance
Un usuario sin `datalog:view` no ve la pestaña "Historial" ni la vista global.

### REQ-09: Retarget de las tools de up1-mcp a `DataLog`

> **Que cambia**: `get_change_history`, `query_changes` y `analytics_changes` leen de `DataLog` (con la atribución), no de `ChangeLog`.
> **Por que**: el `ChangeLog` se retira; las tools deben seguir funcionando contra el nuevo origen.

El sistema MUST apuntar `get_change_history`, `query_changes` y `analytics_changes` (up1-mcp) a `DataLog`; `get_change_history` MUST devolver la atribución (hijo + RecordType + valor antes/después).

**Actor**: LLM/integración · **Layers**: mcp-adapter

#### Acceptance
`get_change_history` de un `Activity` devuelve tanto sus cambios directos como los de sus hijos con RecordType.

## Artifacts

### Models — cambios de campo en `DataLog` (object-manager, core)

| Objeto | Campo | Cambio | Tipo | Nullable | Descripción |
|--------|-------|--------|------|----------|-------------|
| DataLog | `parentObject` | **nuevo** | string | sí | `objectName` del padre polimórfico atribuido (= `ownerType` del snapshot). Null en cambio directo. |
| DataLog | `parentId` | **nuevo** | string | sí | `recordId` del padre atribuido (= `ownerId` del snapshot). Null en cambio directo. |
| DataLog | `childRecordType` | **nuevo** | string | sí | RecordType del hijo que mutó (ej. `EvaluationComponent`). Null en cambio directo. |

**Enum `action`**: sin cambio (`CREATE/UPDATE/DELETE/BULK_*/IMPORT`). **`changes`/`metadata`/`userId`/`createdAt`**: sin cambio. Las 3 columnas son **aditivas y nullable** → filas existentes quedan null (backward-compatible). Schema change de core vía `codegen` + `sync` + `migrate` canónico (sin `ALTER TABLE`/`db push` de atajo). `creates_data: true`.

**Índice recomendado**: `(parentObject, parentId)` para el filtro del visor (REQ-06). Evaluar en S1.

### enableDataLog — flag por objeto (mods/curriculum-design + Base)

| Objeto | Ubicación | Cambio |
|--------|-----------|--------|
| AcademicProgram | `objects/AcademicProgram.json` (o `ext__`/Base según ownership) | `metadata.enableDataLog: true` explícito |
| Curriculum | `objects/Curriculum.json` | `metadata.enableDataLog: true` explícito |
| Activity | `objects/activity.json` | `metadata.enableDataLog: true` explícito |
| Offering | `objects/Offering.json` | `metadata.enableDataLog: true` explícito (cubre `recordType=Syllabus`) |

### withDataLog — reverse-index de polimórficos (core)

Nuevo helper (o extensión de `readPolymorphicChildren`) que construye, en la carga del registry/codegen, el índice inverso `childObjectName → {parentObject, via}` a partir de `metadata.polymorphicChildren` de todos los objetos. `withDataLog.js` lo consulta al escribir la entrada: si el objeto mutado es un hijo polimórfico conocido, lee `ownerType`/`ownerId` del snapshot y setea las 3 columnas de atribución.

### GraphQL / resolver (METASPEC-graphql-resolver)

| Resolver | Cambio |
|----------|--------|
| `withDataLog.js` (core) | **extender**: poblar `parentObject`/`parentId`/`childRecordType` vía reverse-index + snapshot |
| `auditCapture.resolver.js` (mod, 951 L) | **eliminar** |
| `recordAuditEvent` (mod) | **eliminar** (única mutation que escribía ChangeLog) |
| `workflowTransitionHistory*` (+ subsistema `workflow*`) | **NO retirado** por P4/103 (verificado 2026-07-09): teardown diferido a backlog **B3 `must`** de TICKET-103, bloqueado por `uengagement-up1` (FK cross-mod). **Fuera del alcance de P3** — no se toca. P3 captura las transiciones vía `onTransition`→DataLog (REQ-01) |
| MCP `get_change_history`, `query_changes`, `analytics_changes` | **retarget** a `DataLog` + devolver atribución |

### Layout / visor (METASPEC-layout-config)

| Artefacto | Cambio |
|-----------|--------|
| Visor DataLog de up1-manager (RecordList sobre DataLog, tab "Historial" en `objectdefinition-view`) | **reusar/parametrizar**: extender filtro `objectName` → `recordId` / `parentObject`+`parentId` |
| Pestaña "Historial" en los 4 objetos | **config nueva** que apunta al visor DataLog parametrizado (NO al de ChangeLog) |
| `default_ChangeLog_list.json` + tab en `default_Activity_view.json:360-389` | **eliminar** (parte del retiro REQ-02) |

#### Checklist de calidad por artefacto
- [x] **Config declarativa, no hardcoded**: columnas/labels del visor viven en layout JSON + lang ES (no hardcode). Las columnas de atribución tienen su key i18n.
- [x] **Consumidor concreto en este sprint**: las 3 columnas nuevas las consume el visor (REQ-06/07) y `get_change_history` (REQ-09) — mismo spec.
- [x] **Sin heurísticas por nombre**: la atribución NO detecta por nombre de campo — usa el reverse-index de `polymorphicChildren` (spec explícita) + `ownerType`/`ownerId`.

## Tasks

### Session 1 — Core: atribución hijo→padre en `withDataLog.js` (crux) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T0 | **Gate de arranque — confirmar UPONE-1379 (P2) en develop (baseline Caso A)**: grep `polymorphicChildren` en Curriculum/Offering.json + `ownerType` con `Curriculum` en CurricularSection.json. Esperado: presente → traer a la rama de épica (rebase/merge develop). Si **NO** está → **escalar al dev** (no arrancar Caso B por defecto). Ver "Condicional 1379". | — | researcher | — | mods/curriculum-design/objects/{Curriculum,Offering,CurricularSection}.json | 1379 confirmado en el árbol o escalado | (no aplica) | DET-5, DET-11, DET-16 | pending | 1 |
| S1.T1 | Setup limpio: `git stash -u` del drift ajeno en object-manager (label descriptivo); confirmar rama de épica `UPONE-1267-sp6` (no develop) | — | developer | S1.T0 | object-manager working tree | `git status` limpio salvo P3; rama correcta | `git stash pop` | DET-8, DET-16, RULE-dev-004 | pending | 1 |
| S1.T2 | Analizar consumidores de `withDataLog.js` y del shape de `DataLog` (impacto colateral core: quién lee `DataLog`, quién asume su schema) | REQ-04, REQ-05 | researcher | S1.T1 | withDataLog.js + consumidores de DataLog | reporte de consumidores | (no aplica) | DET-5, DET-11, DET-16 | pending | 1 |
| S1.T3 | Agregar 3 columnas nullable a `DataLog` (`parentObject`/`parentId`/`childRecordType`) + índice `(parentObject,parentId)`; codegen | REQ-04 | developer | S1.T2 | object-manager/objects/business/Base/datalog.json | codegen persiste campos + typedef | git revert + migración inversa | DET-1, DET-2, DET-8 | pending | 1 |
| S1.T4 | Construir reverse-index desde `metadata.polymorphicChildren` + `polymorphicChildrenDerived` (shape 1379: `object`/`via`/`ownerTypeValue`/`recursiveBy`/`remapTo`). Cubrir los 3 caminos: owner directo, recursivo (`parentId`), derivado (`sourceSectionId,targetSectionId`) | REQ-04 | developer | S1.T2 | object-manager/.../deep-clone-polymorphic.js (o helper nuevo) | unit del reverse-index (3 caminos) | git revert | DET-1, DET-5 | pending | 1 |
| S1.T5 | Extender `withDataLog.js`: poblar las 3 columnas resolviendo el padre por el camino que aplique (owner directo desde `ownerType`/`ownerId` del snapshot; recursivo; derivado). Incluye DELETE | REQ-04, REQ-05 | developer | S1.T3, S1.T4 | withDataLog.js | unit atribución CurricularSection→Activity + CurricularLink derivado + sección anidada (create/update/delete) | git revert | DET-5, DET-8, DET-10, RULE-dev-004 | pending | 1 |
| S1.T6 | No-regresión: objeto sin `polymorphicChildren` conserva comportamiento genérico | REQ-05 | reviewer | S1.T5 | tests/unit/events/withDataLog.test.js, tests/integration/dataLog.integration.test.js | suite core verde + unit no-regresión | (no aplica) | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T3) — cambio de core, quality review + dual-judge; commit `UPONE-1380` (merge gated por team core) | — | reviewer | S1.T1..T6 | ticket | gate persistido + tests reales | (no aplica) | DET-20, DET-23, DET-35, RULE-dev-004 | pending | 1 |

### Session 2 — Core/mod: `enableDataLog` en los 4 objetos + captura de transiciones [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Declarar `metadata.enableDataLog: true` explícito en AcademicProgram + Curriculum | REQ-01 | developer | S1.GATE | objects/AcademicProgram.json, Curriculum.json | codegen persiste flag | git revert | DET-1, DET-2 | pending | 2 |
| S2.T2 | Declarar `metadata.enableDataLog: true` explícito en Activity + Offering | REQ-01 | developer | S1.GATE | objects/activity.json, Offering.json | codegen persiste flag | git revert | DET-1, DET-2 | pending | 2 |
| S2.T3 | codegen+sync+migrate UPU; verificar captura de create/update/delete en los 4 objetos | REQ-01 | developer | S2.T1, S2.T2 | (pipeline) | integration: 4 objetos capturan | reset migración (consent) | DET-5, DET-13 | pending | 2 |
| S2.T4 | Verificar captura de cambios de estado (transiciones `onTransition` del motor de core, vínculo P4) en Activity/Curriculum | REQ-01 | developer | S2.T3 | tests | integration: changes.status={old,new} | (no aplica) | DET-5, DET-7 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) | — | reviewer | S2.T1..T4 | ticket | gate persistido + integration verde | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Mod: retiro de `ChangeLog` [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T2, S3.T3, S3.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Confirmar cero consumidores de `ChangeLog`/`recordAuditEvent` tras S2 (grep en mod + core + mcp) | REQ-02 | researcher | S2.GATE | mods/curriculum-design, up1-mcp | reporte cero refs (salvo lo que se borra) | (no aplica) | DET-5, DET-16 | pending | 3 |
| S3.T2 | Eliminar resolver `auditCapture.resolver.js` (951 L) + `recordAuditEvent` | REQ-02 | developer | S3.T1 | logic/auditCapture.resolver.js | build mod verde | git revert | DET-8, DET-16 | pending | 3 |
| S3.T3 | Eliminar eventos `{Activity,CurricularSection,CurricularLink}-*.json` + flow n8n `flows/audit-capture.json` | REQ-02 | developer | S3.T1 | events/, flows/audit-capture.json | sync sin eventos ChangeLog | git revert | DET-8, DET-16 | pending | 3 |
| S3.T4 | Eliminar layouts `default_ChangeLog_list.json` + tab "Historial" hardcodeado en `default_Activity_view.json` | REQ-02 | developer | S3.T1 | config/layouts/ | sync OK, layout Activity sin tab viejo | git revert | DET-8 | pending | 3 |
| S3.T5 | Eliminar objeto `changeLog.json` + su seed (deja de sembrarse) — migración destructiva (drop tabla), **consent** | REQ-02, REQ-03 | developer | S3.T2, S3.T3, S3.T4 | objects/changeLog.json, seed/ | seed UPU sin ChangeLog; migrate con consent | restore JSON + migración inversa | DET-8, DET-16, RULE-dev-004 | pending | 3 |
| S3.T6 | Limpiar ~807 L de tests de integración de ChangeLog + coverage | REQ-02 | developer | S3.T5 | tests/integration ChangeLog | suite del mod verde sin refs muertas | git revert | DET-7 | pending | 3 |
| S3.T7 | Integration: no-escritura de ChangeLog (muta Activity/CurricularSection → 0 filas ChangeLog, 1 fila DataLog) | REQ-02 | reviewer | S3.T5 | tests | integration verde | (no aplica) | DET-7, DET-13 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T3) — retiro destructivo, quality review; commit `UPONE-1380` | — | reviewer | S3.T1..T7 | ticket | gate + tests reales + sin artefactos sync/seed | (no aplica) | DET-20, DET-23, DET-33 | pending | 3 |

### Session 4 — FE: visor "Historial" sobre `DataLog` [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Analizar el visor DataLog de up1-manager (tab Historial en `objectdefinition-view`) para parametrizarlo | REQ-06 | researcher | S1.GATE | up1-manager visor DataLog | reporte de puntos de extensión | (no aplica) | DET-11, DET-32 | pending | 4 |
| S4.T2 | Extender el RecordList de DataLog: filtro por `recordId` OR (`parentObject`+`parentId`) | REQ-06 | developer | S4.T1, S1.GATE | layout/mod config del visor | render recolecta objeto + hijos | git revert | DET-5, DET-16 | pending | 4 |
| S4.T3 | Config pestaña "Historial" en los 4 objetos (columnas Fecha/Usuario/Campo/Antes/Después/Origen) + lang ES de las keys. **Caso A: los layouts de Curriculum/Offering(Syllabus) ya traen tabs de 1379 → agregar "Historial" SOBRE ellos (rebase, no reemplazar)** | REQ-06 | developer | S4.T2 | config/layouts/{default_Curriculum_view,default_Offering_syllabus_view,default_Activity_view,default_AcademicProgram_view}.json, lang/ | sync + $t resuelve; pestaña por objeto sin pisar tabs de 1379 | git revert | DET-2, DET-16, RULE-dev-004 | pending | 4 |
| S4.T4 | Vista global de historial (RecordList sin filtro recordId) | REQ-07 | developer | S4.T2 | config/layouts/ | vista global equivalente a la actual | git revert | DET-16 | pending | 4 |
| S4.T5 | Gatear pestaña + vista global por capability `datalog:view` | REQ-08 | developer | S4.T3, S4.T4 | config/layouts/, capabilities | sin permiso no se muestra | git revert | DET-5, DET-11 | pending | 4 |
| S4.T6 | Smoke real en UPU (DET-36): editar sección de un Activity → aparece en Historial del padre con RecordType; vista global; RBAC | REQ-06, REQ-07, REQ-08 | reviewer | S4.T3, S4.T4, S4.T5 | (runtime UPU) | evidencia runtime real (screenshot/DOM) | (no aplica) | DET-13, DET-36 | pending | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T3) — UI, quality review + smoke UPU real | — | reviewer | S4.T1..T6 | ticket | gate + evidencia runtime | (no aplica) | DET-20, DET-23, DET-36 | pending | 4 |

### Session 5 — MCP: retarget de las 3 tools + verificación diferida [tipo: auto] [tier: T2]

parallel_groups: [[S5.T1, S5.T2, S5.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Retarget `get_change_history` → `DataLog` + devolver atribución (parent + RecordType + valor) | REQ-09 | developer | S1.GATE, S2.GATE | up1-mcp/src/ | tool devuelve atribución | git revert | DET-5, DET-16 | pending | 5 |
| S5.T2 | Retarget `query_changes` → `DataLog` | REQ-09 | developer | S1.GATE, S2.GATE | up1-mcp/src/ | tool contra DataLog | git revert | DET-5, DET-16 | pending | 5 |
| S5.T3 | Retarget `analytics_changes` → `DataLog` | REQ-09 | developer | S1.GATE, S2.GATE | up1-mcp/src/ | tool contra DataLog | git revert | DET-5, DET-16 | pending | 5 |
| S5.T4 | Tests de las 3 tools contra el shape nuevo de DataLog (si el entorno MCP está; sino `assumed` + verificación en execute) | REQ-09 | developer | S5.T1, S5.T2, S5.T3 | up1-mcp tests | tools verdes o assumed documentado | git revert | DET-1, DET-7 | pending | 5 |
| S5.T5 | **Verificación de atribución (baseline Caso A)**: integration de atribución de hijos de Curriculum (GraduationProfile) + Offering + CurricularLink derivado. Parte del DoD (si S1.T0 escaló a contingencia, degrada a backlog `could`) | REQ-04 | reviewer | S1.GATE, S1.T0 | tests | integration atribución Curriculum/Offering/CurricularLink verde | (no aplica) | DET-7, DET-16 | pending | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier: T2) | — | reviewer | S5.T1..T5 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | pending | 5 |

### Session 6 — Cierre: regression + docs + teach-close [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S6.T2, S6.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Integration full + smoke UPU end-to-end (4 objetos: captura + atribución + visor + RBAC) | REQ-01..09 | reviewer | S4.GATE, S5.GATE | tests, runtime UPU | suite verde + smoke real | (no aplica) | DET-7, DET-13, DET-36 | pending | 6 |
| S6.T2 | Doc del historial en el mod: guía del visor (pestaña + global), nuevo shape de `DataLog` (atribución), retiro de ChangeLog | REQ-01..09 | developer | S6.T1 | mods/curriculum-design/docs/ | doc coherente con lo implementado | git revert | DET-16, RULE-dev-004 | pending | 6 |
| S6.T3 | Doc en object-manager/docs: extensión de `withDataLog` (atribución polimórfica genérica) + las 3 columnas de DataLog | REQ-04 | developer | S6.T1 | object-manager/docs/ | doc coherente con S1 | git revert | DET-16, RULE-dev-004 | pending | 6 |
| S6.T4 | Doc platform (uplanner/specs): funcionalidad de core usada/extendida en el ticket (memoria up1) | — | developer | S6.T1 | uplanner/specs/up1 | doc local actualizado | git revert | DET-16 | pending | 6 |
| **S6.GATE** | Gate de sync Session 6 (tier: T3) — cierre técnico, quality review final + DoD Jira | — | reviewer | S6.T1..T4 | ticket | gate + DoD verificado | (no aplica) | DET-20, DET-23, DET-33 | pending | 6 |

## Constraints

- **RULE-dev-004 / core_work_policy**: el cambio de core (`withDataLog.js` + schema `DataLog`, S1) va en la rama de épica `UPONE-1267-sp6`, commits con id externo `UPONE-1380`, merge a develop gated por team up1 — el cierre DKC no implica merge.
- **Sync canónico (memoria up1)**: el schema change de `DataLog` (3 columnas) pasa por codegen + sync + migrate; nunca `ALTER TABLE`/`db push`/edits manuales. Reset destructivo (drop tabla ChangeLog) solo con consent.
- **DET-16 (propagación)**: el retiro de ChangeLog verifica cero consumidores antes de eliminar objeto+tabla+flow+seed+tests.
- **DET-32 (reuso)**: el visor NO se construye desde cero — se reutiliza el de up1-manager. Las 3 columnas se construyen (no hay equivalente) pero el mecanismo de atribución es genérico (reverse-index de `polymorphicChildren`, ya en core para deep-clone).
- **P4/103 (SPEC-curriculum-design-enum-transitions-migration)**: migró **Activity y Curriculum al motor de enum de core** (ambos declaran `status`+`transitions`, emiten `onTransition`) y **difirió el historial relacional de transiciones a P3** — REQ-01 lo cubre vía `onTransition`→DataLog. **Corrección 2026-07-09:** P4 **NO retiró** `workflowTransitionHistory` ni el subsistema `workflow*` (teardown → backlog B3 `must`, bloqueado por `uengagement-up1`); esos objetos siguen en develop y están **fuera del alcance de P3**. `auditCapture.resolver.js` **no fue tocado por P4** → el retiro de ChangeLog (S3) es limpio; y como P3 elimina ese resolver completo, **supersede** la parte de B3 que pedía remover su `handleTransition`.
- **`metadata` de DataLog es JSON libre para mods**: se descartó llevar la atribución ahí (DEC-LOCAL-01) porque es dato genérico de core y el visor la filtra.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `metadata.polymorphicChildren` + `readPolymorphicChildren` (core) | internal | base del reverse-index de atribución | Satisfecha (presente; usada por deep-clone) |
| **P2 (UPONE-1379, PR #14)** declara el shape de `polymorphicChildren`/`polymorphicChildrenDerived` + `ownerType[+Curriculum]` | external | fija el **formato** que consume el reverse-index (S1.T4) + habilita la atribución de Curriculum/Offering/CurricularLink | **Baseline: se asume en develop** (dev 2026-07-08 → P3 avanza desde ahí). S1.T0 confirma; si falta, escalar. Estado al escribir: PR #14 OPEN, merge esperado |
| P4/103 (motor de enum + `onTransition`) | internal | disparador de la captura de transiciones (REQ-01) | **Satisfecha, verificado 2026-07-09** (mod PR#16 + object-manager PR#395 en develop; Activity+Curriculum en enum engine). Subsistema `workflow*`/`workflowTransitionHistory` NO retirado (backlog B3, fuera de alcance P3). |
| Visor DataLog de up1-manager | internal | base a parametrizar para el visor | Reutilizable (verificar en S4.T1) |
| Entorno up1-mcp | external | verificación de las 3 tools | No verificable en este workspace → `assumed` + check en execute |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Extensión de `withDataLog` regresiona la auditoría de objetos ajenos | medium | high | REQ-05 + no-regresión (S1.T6) con `dataLog.integration.test.js` verde antes de cerrar S1 |
| Reverse-index no cubre un hijo (ownerType/ownerId ausente) | medium | medium | edge scenario REQ-04: cae a cambio directo (columnas null), no rompe; documentar hijos soportados |
| Retiro destructivo del ChangeLog rompe algo latente | medium | high | S3.T1 confirma cero consumidores por grep; migrate con consent; rollback (restore JSON + migración inversa) |
| Atribución de Curriculum/Offering no testeable sin P2 | high | low | mecanismo genérico los cubre; verificación diferida como backlog `could` (no bloquea cierre) |
| Cambio de core sin review | low | medium | S1 gated por team up1 (RULE-dev-004) |
| Visor genérico no filtra por columna de atribución | low | medium | S4.T1 verifica el punto de extensión antes de comprometer el filtro `recordId`/`parentObject` |

## Open questions

- [ ] **4º objeto**: se asume `Offering[recordType=Syllabus]` (alineado con P4/103 + confirmado por 1379, que agrega `default_Offering_syllabus_view/edit.json`). `enableDataLog` va al objeto `Offering`; la pestaña "Historial" del sílabo vive en `default_Offering_syllabus_view.json`. Default confirmado por evidencia; queda solo validar el scoping del RecordType en el visor.
- [ ] **RBAC granular (REQ-08)**: `datalog:view` genérico gatea todo el historial. Confirmar si se necesita "ver historial de un objeto sin ver todo DataLog" (granularidad por objeto) — default: capability única.
- [ ] **Índice `(parentObject,parentId)`**: confirmar en S1.T3 si el volumen de DataLog lo amerita (probable sí para el filtro del visor).
- [ ] **Nombre de la rama de trabajo** (decisión diferida a execute, dev 2026-07-08): convención del repo `feat/UPONE-1380-...` (P4/103 usó `feat/UPONE-1381-enum-transitions`) vs rama de épica `UPONE-1267` (RULE-dev-004 al pie). Se crea desde `develop` actualizado (ya con 1379) al arrancar execute. Aplica a `curriculum-design` (mod) y `object-manager` (core).

## Decisions

### DEC-LOCAL-01: Atribución en columnas nuevas de DataLog (no en `metadata`)
- **Contexto**: `DataLog` genérico no atribuye el cambio de un hijo al padre; hay que persistir `parentObject`/`parentId`/`childRecordType`. `DataLog.metadata` es JSON libre pensado para que los mods agreguen contexto sin tocar el schema.
- **Drivers**: (1) el visor filtra "historial del padre" por columna (indexable); el RecordList genérico no filtra por JSON-path. (2) La atribución es comportamiento **genérico de core** (cualquier hijo polimórfico), no un tag mod-specific.
- **Opcion elegida**: 3 columnas nullable en `DataLog` (schema change de core, aditivo, backward-compatible).
- **Alternativas**: llevarlas en `metadata` (descartado: no filtrable/indexable por el visor; `metadata` es para contexto mod-specific no consultado).
- **Consecuencias**: schema change de core (RULE-dev-004, codegen+migrate); flip `creates_data: true`.
- **Session**: design (confirmado por dev 2026-07-08).

### DEC-LOCAL-02: Mecanismo de atribución = Opción A (reverse-index + snapshot)
- **Contexto**: cómo derivar el padre de la mutación de un hijo sin hardcodear.
- **Drivers**: genérico, robusto ante borrado en cascada, sin query extra al padre.
- **Opcion elegida**: reverse-index de `metadata.polymorphicChildren` (hijo→{padre, vía}) + leer `ownerType`/`ownerId` del snapshot del hijo que `withDataLog` ya captura (incluido DELETE).
- **Alternativas**: query al padre (descartado: se rompe si el padre ya se borró en cascada); hardcode del mapeo (descartado: REQ-04 lo prohíbe explícitamente).
- **Session**: intake (confirmado por dev 2026-07-07).

### DEC-LOCAL-03: Histórico de ChangeLog + source/versionSourceId = pérdida aceptada
- **Contexto**: qué pasa con el historial ya capturado y los campos ricos de ChangeLog al consolidar.
- **Drivers**: sin consumidor verificado; `DataLog` genérico no los modela; costo de migración > valor.
- **Opcion elegida**: pérdida aceptada, documentada (DET-4).
- **Alternativas**: migración parcial de `sourceRef*` (descartado: complejidad sin consumidor).
- **Session**: intake (reunión QA 2026-07-06 + dev 2026-07-07).

### DEC-LOCAL-05: El formato de `polymorphicChildren` lo fija 1379 — P3 lo consume, no lo forkea
- **Contexto**: PR #14 (UPONE-1379) declara el shape `{object, via, ownerTypeValue, recursiveBy}` + `polymorphicChildrenDerived` para CurricularLink. P3 (reverse-index) y P5 (cascada) lo comparten.
- **Drivers**: un solo responsable define el formato (critical path SP6); forkearlo generaría conflicto con 1379/P5.
- **Opcion elegida**: P3 **avanza desde develop asumiendo 1379 incorporado (Caso A baseline, dev 2026-07-08)** y consume su shape. S1.T0 confirma; si 1379 no está, se escala al dev (no se arranca Caso B por defecto ni se forkea el formato).
- **Alternativas**: que P3 declare los `polymorphicChildren` faltantes (descartado: forkea el formato que 1379/P5 comparten); arrancar en Caso B por defecto (descartado por el dev: se prefiere partir de develop con 1379).
- **Consecuencias**: P3 asume la secuencia P2→P3; S5.T5 es test real (parte del DoD). Cubre CurricularLink vía el path derivado.
- **Session**: design (hallazgo del análisis de PR #14 + decisión del dev, 2026-07-08).

### DEC-LOCAL-04: Comentario de transición diferido
- **Contexto**: BR-WKF-001 pedía justificación de transición; `DataLog` genérico no la captura.
- **Drivers**: hoy el cambio de estado no ocurre por UI que pida justificación → capturarla no aplica aún.
- **Opcion elegida**: diferir a historia futura (cambio de estado por UI); no se implementa en P3/P4.
- **Session**: intake (dev 2026-07-07).

## Technical reference

- **DataLog**: `object-manager/objects/business/Base/datalog.json` (campos `objectName`, `recordId`, `action` enum, `changes`, `metadata`, `userId`, `createdAt`). TypeDef: `src/graphql/typeDefs/dynamic.js:380`.
- **Decorator**: `withDataLog.js` — cadena `withEventPublish → withObjectAuth → withDataLog → resolver`. Flag `metadata.enableDataLog` (ON por default: `:5-6,63-70,80`, `:70-87`). Snapshot previo capturado también en DELETE (`:187-235`). Tests: `tests/unit/events/withDataLog.test.js`, `tests/integration/dataLog.integration.test.js`.
- **Reverse-index base**: `metadata.polymorphicChildren` + `readPolymorphicChildren()` en `helpers/deep-clone-polymorphic.js` (core).
- **ChangeLog a retirar**: objeto `mods/curriculum-design/objects/changeLog.json`; resolver `logic/auditCapture.resolver.js` (951 L, `recordAuditEvent:329`, `ENTITY_TYPE_MAP={Activity,CurricularSection,CurricularLink}:100-104`, consolidación `:456-521`); eventos `events/{Activity,CurricularSection,CurricularLink}-*.json`; flow `flows/audit-capture.json`; layouts `config/layouts/default_ChangeLog_list.json` + `default_Activity_view.json:360-389`.
- **Visor a reusar**: RecordList sobre `DataLog` en up1-manager (tab "Historial" en `objectdefinition-view`, filtrado por `objectName`).
- **Mockup**: `uplanner/specs/up1/sp6/mockup-sp6.html` (pestaña Historial por objeto + vista global; columnas en `:1283`, mapeo entityType en `:1352`).
- **Vínculo P4**: SPEC-curriculum-design-enum-transitions-migration (TICKET-103) — `onTransition` del motor de enum dispara la captura de transiciones.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..09 pasan en UPU (captura, atribución hijo→padre, cambio directo, visor por objeto + global, RBAC)
- [ ] **Tests**: unit (reverse-index, atribución create/update/delete, no-regresión) + integration (4 objetos capturan, no-escritura ChangeLog, atribución CurricularSection→Activity) verdes con assertions concretas
- [ ] **Rules**: `withDataLog` extendido genérico (sin hardcode); RULE-dev-004 respetada en S1/S3; reuso del visor (DET-32)
- [ ] **Integration**: objetos ajenos a la malla (Person) sin regresión (`dataLog.integration.test.js`); deep-clone no afectado
- [ ] **Docs**: guía del historial en el mod (S6.T2); doc de `withDataLog` en core (S6.T3); doc platform (S6.T4); lang ES completo; sin artefactos sync/seed commiteados; tools up1-mcp actualizadas
- [ ] **DoD Jira**: lint + Prettier + tsc limpios (incl. tests/stories); quality review + smoke UPU
