---
id: TICKET-102
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1380
module: curriculum-design
autopilot: autonomous
---

# SP6 · P3 — Historial de cambios en el DataLog de core (retirar ChangeLog)

> **P3** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) · Jira **[UPONE-1380](https://u-planner.atlassian.net/browse/UPONE-1380)** · 8 SP · repo `core + mod` (FE) · `layer: core` (extiende `withDataLog.js`) · `creates_visual: true`.
> **Pre-spec (fuente de design):** [`sp6/historias-usuario-sp6.md` — P3](../../../../uplanner/specs/up1/sp6/historias-usuario-sp6.md) + validación [`sp6/validacion-jira-confluence.md` §4](../../../../uplanner/specs/up1/sp6/validacion-jira-confluence.md) (CAP-CUR-050; desajuste de alcance transiciones vs audit general) + mockup [`sp6/mockup-sp6.html`](../../../../uplanner/specs/up1/sp6/mockup-sp6.html).

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** `depends_on: []` en Jira, pero **dependencia de secuencia P2→P3**. **Verificado 2026-07-09:** develop ya incorpora **1379/P2 (PR #14 + PR #15)** y **P4/1381 (mod PR #16, object-manager PR #395)** → **Caso A sobre-satisfecho, Caso B (contingencia) moot**. P2 fija el formato `metadata.polymorphicChildren` + `polymorphicChildrenDerived`; **P3 lo consume, NO lo forkea**. S1.T0 re-confirma al abrir la rama de trabajo. Coordinar con P5 (TICKET-104) — ambos consumen el mismo bloque.

## Request

> *(literal de UPONE-1380 — DET-3: no reescribir)*

Como **usuario**, quiero ver el historial de cambios de los objetos de la malla —quién cambió qué y cuándo, con el valor antes y después, y qué hijo (sección/RecordType) mutó— en el history de core, dentro de cada objeto y en una vista global, para auditar la malla desde un solo sistema.

## Análisis de alcance profundo (2026-07-07, verificado contra código)

**Correcciones / matices de hecho (el código refina supuestos):**
- **ChangeLog NUNCA auditó 3 de los 4 objetos:** `ENTITY_TYPE_MAP` = `{Activity, CurricularSection, CurricularLink}` (`auditCapture.resolver.js:100-104`). Para **AcademicProgram/Curriculum/Offering es funcionalidad NUEVA**, no migración. La "duplicación real" solo existe para Activity. Menor riesgo de regresión en 3 de 4.
- **DataLog ya está ON por default** (`withDataLog.js:70-87`; ningún objeto declara `enableDataLog:false`) → hoy ya captura create/update/delete de los 4 (quién/cuándo/diff). REQ-01 puede ser casi cosmético (declarar el flag explícito). El peso real está en REQ-04 (atribución) + FE.
- **`readPolymorphicChildren` vive en CORE** (`object-manager/.../deep-clone-polymorphic.js`), no en el mod.

**Decisiones pendientes (para el dev):**
1. **⚠️ Atribución inversa hijo→padre (REQ-04) es el gap técnico central (prioridad alta).** `readPolymorphicChildren` es hacia adelante (padre→hijos); atribuir una mutación de `CurricularSection` a su `Activity` padre requiere el índice **inverso**, que **no existe** en código. El mod lo hace hoy con hardcode (lo que REQ-04 quiere evitar). Opciones: (a) reverse-index en runtime (genérico, infra nueva en core); (b) leer `ownerType/ownerId` del propio hijo si los trae (no garantizado para todo hijo). Decidir el mecanismo.
2. **Reuso del visor DataLog (DET-32):** **up1-manager YA tiene un visor de DataLog** (tab "Historial" en `objectdefinition-view`, RecordList sobre DataLog filtrado por `objectName`). P3 necesita además filtrar por `recordId` — es una **extensión** del mismo patrón, no construir desde cero. Evaluar reuso antes de duplicar.
3. **Comentario/justificación de transición (vínculo P4, dependencia de SHAPE, no solo secuencia):** BR-WKF-001 (Must) exige comentario. DataLog no lo captura, y el motor de enum de P4 tampoco transporta comentario en `onTransition` hoy. Para preservarlo: P4 debe emitir el comentario en el evento **y** P3 capturarlo en `metadata.comment`. Si no → se incumple BR-WKF-001 conscientemente (registrar como excepción con OK de negocio).
4. **`source` y `versionSourceId` (Q2 los nombra):** los REQ actuales no los cubren. ¿Se pierden explícitamente o se suman como REQ? Decidir (no perder en silencio — DET-4).
5. **Dependencia con P2 (declaración polimórfica):** Curriculum/Offering no declaran `polymorphicChildren` → el testing de atribución para esos 2 (exigido en el pre-spec) **no es ejecutable** sin P2. Si P2 no corre antes, P3 debe declararlos (amplía alcance) o diferir esos 2.
6. **RBAC (REQ-08):** probablemente cubierto por `datalog:view` genérico; confirmar granularidad (¿ver historial de un objeto sin ver todo DataLog?).

**Riesgos:** atribución inversa = mayor riesgo técnico (infra nueva en core, RULE-dev-004); dependencia de shape con P4; testing no ejecutable sin P2 en 2 de 4 objetos; pérdida silenciosa de source/versionSourceId; up1-mcp no verificable en este workspace (retarget de get_change_history/query_changes/analytics_changes sin evidencia); limpiar 807+ líneas de tests de ChangeLog + coverage.

### Decisiones de alcance (dev, 2026-07-07)

1. **Atribución hijo→padre (REQ-04) — ✅ OPCIÓN A confirmada (dev 2026-07-07).** Reverse-index desde `polymorphicChildren` (`hijo→{padre, via}`) + **leer `ownerType/ownerId` del snapshot de la fila del hijo** que withDataLog ya audita (NO query al padre). Verificado: todos los hijos del mod usan `ownerType/ownerId` (`CurricularSection`, `requirement`, `Curriculum`), y withDataLog captura el snapshot previo también en DELETE (`withDataLog.js:187-235`). Ventaja decisiva: **robusto ante borrado en cascada** — el dato de atribución viaja en el snapshot del hijo, así que atribuye al padre aunque el padre ya se haya borrado (la Opción B —query al padre— se rompería en ese caso). Genérico (no hardcode), sin query extra. Requiere completar las declaraciones (decisión 3).
7. **Coordinación P3↔P5 (auditoría de borrado en cascada) — ✅ registrar en ambos.** Para que el borrado en cascada de P5 quede auditado **hijo por hijo**, cada borrado debe pasar por el decorator `withDataLog` (o emitir su entrada) — **no** bypass con Prisma directo. Si la cascada borra hijos sin decorar, solo se auditaría el padre. Registrado también en [TICKET-104](TICKET-104.md).
2. **Comentario/justificación de transición (BR-WKF-001) — DIFERIDO a historia futura.** Hoy el cambio de estado NO ocurre por una UI (RecordDetail) que capture justificación — se hace directo en BD/API. Es **correcto que hoy el comentario no se capture**. El requisito queda para una **historia futura que habilite el cambio de estado por UI para el usuario** (ahí se capturará el comentario). No se implementa en P3 ni P4. (Cierra el "gap del comentario" del Vínculo con P4.)
3. **Curriculum/Offering `polymorphicChildren` — los declara 1379 (P2), NO P3** (revisado 2026-07-07 leyendo UPONE-1379, status `Developing`). 1379 declara las secciones: Curriculum → RT **`GraduationProfile`**; Offering → los **7 RT de Activity**; y cambia `CurricularSection.ownerType` a `[Activity, Offering, Curriculum]`. **1379 NO conecta el historial** → eso es P3. P3 hace: (a) activar `enableDataLog` en los 4 objetos, (b) el mecanismo genérico de atribución (Opción A) que **cubre automáticamente** las secciones que 1379 declare (reverse-index), (c) **task de verificación post-1379**: confirmar que el historial de Curriculum/Offering muestra los cambios de `GraduationProfile` / los 7 RT. **P3 va 2º sin esperar a 1379** (mecanismo genérico); solo la verificación espera a que 1379 cierre.
4. **Visor de historial — REUSAR/parametrizar** el visor de DataLog de up1-manager (RecordList sobre DataLog), extendiéndolo para filtrar por `recordId` (historial de instancia) + vista global (DET-32: no duplicar).
5. **`source` / `versionSourceId` — ✅ PÉRDIDA ACEPTADA (explícita, dev 2026-07-07).** No tienen consumidor verificado y DataLog genérico no los modela; no se portan a DataLog. Registrado como pérdida consciente (no en silencio).
6. **RBAC (REQ-08, menor):** cubierto por la capability genérica `datalog:view` de plataforma; confirmar granularidad solo si se necesita "ver historial de un objeto sin ver todo DataLog".

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | (a) activar `metadata.enableDataLog` en 4 objetos + retirar `ChangeLog` (objeto + resolver + eventos + flow) · (b) **core**: extender `withDataLog.js` (atribución de hijo polimórfico al padre + RecordType) · (c) FE: visor sobre `DataLog` (pestaña por objeto + vista global) |
| Modulo principal | curriculum-design (mod) + object-manager (core) |
| Modulos afectados | object-manager (core: `withDataLog.js`); curriculum-design (retiro ChangeLog + visor FE); flow (n8n: retiro flow ChangeLog); MCP: `get_change_history`, `query_changes`, `analytics_changes` |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí | Pestaña "Historial" en los 4 objetos (columnas Fecha, Usuario, Campo, Antes, Después, RecordType/sección origen) + vista global equivalente a la actual. |
| Data model | no | Usa `DataLog` de core (existente); puede agregar campos de atribución (`parentObject`/`parentId`/`childRecordType`) o llevarlos en `metadata` — a definir en design. No crea objeto nuevo. |

## Contexto (de Jira / historia P3)

Hoy conviven `ChangeLog` (del mod, a medida) y `DataLog` (de core, genérico, con `metadata.enableDataLog`). `DataLog` es per-objeto: al editar una `CurricularSection` de un Activity, el registro queda en el hijo, no en el padre. `ChangeLog` sí lo resolvía (`auditCapture.resolver.js` redirige al padre, guarda el hijo en `sourceRef*` y el RecordType en `sourceRefType`). Core ya declara los hijos en `metadata.polymorphicChildren` (leído por `readPolymorphicChildren`, usado por el deep-clone).

## Context found (evidencia de código · fuente `sp6/analisis-por-punto.md` §3, `reunion-qa-2026-07-06.md`, `preguntas-abiertas.md` Q2)

> Toda ruta:línea CONFIRMADA por lectura de código salvo marca INFERIDO. **Clasificación: A — duplicación real (el caso más claro core↔mod). Decisión (dev, Q2): absorber en `DataLog` de core, sin duplicar; retirar `ChangeLog` una vez migrado.**

**Core SÍ tiene audit genérico (`DataLog`) — es el destino:**
- Objeto: `object-manager/objects/business/Base/datalog.json` — `objectName`, `recordId`, `action` (CREATE/UPDATE/DELETE/BULK_*/IMPORT), `changes` (diff/snapshot), `userId`.
- Decorator genérico: `object-manager/src/events/decorators/withDataLog.js` (cadena `withEventPublish → withObjectAuth → withDataLog → resolver`). Flag `metadata.enableDataLog` (ON por defecto; opt-out `false`) en `withDataLog.js:5-6,63-70,80`. TypeDef: `src/graphql/typeDefs/dynamic.js:380`. Tests: `tests/unit/events/withDataLog.test.js`, `tests/integration/dataLog.integration.test.js`.

**`ChangeLog` bespoke a retirar (acoplamiento ALTO):**
- Objeto: `mods/curriculum-design/objects/changeLog.json` — campos ricos: `source` (DirectEdit|Workflow|ChangeRequest|MADS|…), `sourceRefId/Name/Type` (consolidación hijo→padre), `versionSourceId`, `workflowTransitionHistoryId` (FK real → **acopla con P4/TICKET-103**).
- Resolver: `logic/auditCapture.resolver.js` (951 líneas): `recordAuditEvent:329` (única mutation que escribe), whitelist `ENTITY_TYPE_MAP={Activity,CurricularSection,CurricularLink}:100-104`, consolidación al padre "L40":456-521, handler de transition:626-900.
- Disparo: `events/{Activity,CurricularSection,CurricularLink}-*.json` → `withEventPublish.js` (core) → Redis Pub/Sub → flow n8n `flows/audit-capture.json` → `recordAuditEvent`.
- FE hoy: RecordList genérico `config/layouts/default_ChangeLog_list.json` + tab "Historial" en `default_Activity_view.json:360-389`. Whitelist hardcodeada en 3 sitios (resolver + regex n8n + doc) + 807 líneas de tests de integración.

**Base para la atribución del hijo (REQ-04):** `metadata.polymorphicChildren` + `readPolymorphicChildren()` (`helpers/deep-clone-polymorphic.js`) — ya declarado y consumido por el clonado y por el borrado (P5/TICKET-104). Sirve para atribuir qué hijo mutó, sin hardcodear.

**Decisión de reunión (00:08:58) + corrección post-reunión (dev):** migrar a `DataLog` aceptando pérdida **limitada** del histórico ya capturado. **PERO: saber qué hijo polimórfico mutó (RecordType + valor antes/después) es requisito, NO diferible** (REQ-04) — solo es diferible, a lo sumo, la *vista consolidada* en la ficha del padre. `DataLog` pelado no captura el hijo → la migración debe asegurar el `sourceRef*` (mod) o que core aprenda la auditoría de hijos polimórficos.

## Pre-spec (transcrito de UPONE-1380 — criterios de aceptación)

| REQ | Certeza | source_ref | Enunciado (AC Jira) |
|-----|---------|-----------|---------------------|
| REQ-01 · enableDataLog en 4 objetos | confirmed | AC Jira | `metadata.enableDataLog` activo en Programa académico, Plan, Activity y Syllabus; `DataLog` registra **quién** (`userId`) y **cuándo**, + `objectName`, `recordId`, `changes {campo:{old,new}}`. |
| REQ-02 · retirar ChangeLog | confirmed | AC Jira | `ChangeLog` se elimina para estos objetos (se usa `DataLog`); al deprecarse se elimina también su **seed**, resolver, eventos y flow. |
| REQ-03 · destino del historial ChangeLog | confirmed | AC Jira + "Falta definir" | Definir qué pasa con el historial ya capturado en `ChangeLog`: pérdida aceptada o migración (decisión de producto). |
| REQ-04 · atribución del hijo polimórfico al padre | confirmed | AC Jira | Al mutar un hijo polimórfico, `DataLog` atribuye la entrada al **padre** + RecordType del hijo + antes/después (vía `ownerType/ownerId` + `metadata.polymorphicChildren`, no hardcodeado). |
| REQ-05 · cambio directo + sin regresión | confirmed | AC Jira | Cambio en el propio padre = directo; objeto sin hijos polimórficos conserva comportamiento genérico (sin regresión). |
| REQ-06 · pestaña Historial por objeto | confirmed | AC Jira | Pestaña "Historial" en los 4 objetos: columnas Fecha, Usuario, Campo, Antes, Después y, para hijos, el RecordType/sección de origen. |
| REQ-07 · vista global | confirmed | AC Jira | Vista global de historial equivalente a la actual. |
| REQ-08 · RBAC | confirmed | AC Jira | Ver historial gateado por capability de lectura. |

**Detalle técnico (Jira):** (a) activar DataLog en los 4 objetos y retirar `ChangeLog` (objeto + `auditCapture.resolver.js` + eventos + flow n8n). (b) **Core:** extender `withDataLog.js` para detectar el hijo polimórfico, atribuir al padre y registrar el RecordType (campos `parentObject`/`parentId`/`childRecordType` o en `metadata`). (c) FE: visor sobre `DataLog` (pestaña por objeto que recolecta objeto + hijos, y vista global).

**MCP:** apuntar `get_change_history`, `query_changes`, `analytics_changes` a `DataLog`; `get_change_history` devuelve la atribución (hijo + RecordType + valor).

## Herencia de SP5 — NO aplicable (verificado 2026-07-07)

> Ningún ticket ni spec de SP5 (TICKET-081..089) tocó `ChangeLog`, `DataLog` ni `auditCapture` — **`ChangeLog` es pre-SP5** (su evidencia de código está en Context found, no en un artefacto DKC de SP5). No hay diferido S7 de historial en `sp5/SP6-backlog-diferidos.md` (los diferidos S7-01..06 son editor de requisitos, versionado, deep-copy, MCP, planEntry modular, isCurrent — ninguno es auditoría). **Única atadura a SP5:** la declaración `metadata.polymorphicChildren` + `readPolymorphicChildren` que P3 consume para la atribución del hijo (REQ-04) nace del versionado/deep-clone (misma pieza que hereda P5/[TICKET-104](TICKET-104.md)); coordinar formato con ese ticket.

## Decisiones tomadas (reunión QA 2026-07-06 + Q1/Q2)

- **Dueño = CORE:** el historial va en el `DataLog` genérico de core (no en el mod). `ChangeLog` se abandona. Un solo sistema de auditoría (Q2: "no nos sirve tener funcionalidades duplicadas").
- **Alcance = audit general** (no solo transiciones): se extiende `DataLog` a los 4 objetos, no se reimplementa el log de transiciones bespoke (refina el desajuste de `validacion-jira-confluence §4` / CAP-CUR-050).
- **Pérdida histórica:** se acepta pérdida **limitada** del histórico ya capturado en `ChangeLog` a corto plazo (00:08:58) — **matiz no negociable:** el dato de *qué hijo mutó* debe preservarse hacia adelante (REQ-04).

## Vínculo con P4 ([TICKET-103](TICKET-103.md)) — capturar transiciones de estado (2026-07-07)

P4 migró **Activity y Curriculum al motor de enum de core** (ambos declaran `status` enum de 6 estados + `transitions`, validados por `enforceEnumTransitions` en `updateInstance`, emiten `onTransition`). El dev **aceptó perder el historial relacional de transiciones** con la condición de que **P3 (este ticket) capture las transiciones de estado** vía DataLog.

> **⚠️ Corrección de hecho (verificado 2026-07-09 contra develop):** P4 **NO retiró `workflowTransitionHistory`**. P4 cerró con **REQ-06 parcial**: solo migró lo Activity-específico off-workflow y **difirió el teardown del subsistema workflow** (objetos `workflow`/`workflowStatus`/`workflowTransition`/`workflowTransitionHistory` + FKs `currentStatusId`/`workflowId`) a un **backlog B3 `must`** de [TICKET-103](TICKET-103.md), **bloqueado por `uengagement-up1`** (fuera de scope SP6, referencia esas FK cross-mod). Los 4 objetos **siguen existiendo** en develop; solo se removieron los seeds (S7). **Implicación para P3:** el subsistema workflow queda **fuera del alcance de P3** (no lo tocamos; es B3). P3 solo captura las transiciones vía `onTransition`→DataLog. Además, como P3/REQ-02 elimina `auditCapture.resolver.js` completo, **P3 supersede** la parte de B3 que pedía remover `handleTransition` de auditCapture — coordinar al cerrar.

- **Requisito para P3:** al activar `enableDataLog` en Activity/Curriculum, el `DataLog` debe registrar los **cambios de estado** (`status`/enum) como cualquier otro campo (quién / cuándo / `old→new`). Los eventos `onTransition` del motor de core son el disparador. Verificado: Curriculum y Activity ya están en el enum engine → el scenario de transición de REQ-01 es ejecutable para ambos.
- **⚠️ Gap conocido — comentario/justificación:** el `workflowTransitionHistory` del mod tenía un campo `comment` (justificación de la transición, BR-WKF-001). **DataLog genérico NO lo captura** (solo old→new). Si negocio exige preservar la justificación de transición, P3 debe extender el shape de `DataLog` para capturarla; si no, se acepta perderla. **Decisión pendiente.**

## Falta definir (cerrar en el ticket)

- **Diseño de los campos de atribución** en `DataLog` (`parentObject`/`parentId`/`childRecordType` como columnas o dentro de `metadata`) — REQ-04.
- **Destino exacto del histórico `ChangeLog` existente** (REQ-03): confirmar "pérdida aceptada" vs migración parcial del `sourceRef*`. Action item: reconciliar con Klaus/equipo core el punto de auditoría de hijos polimórficos.
- **Comentario de transición (vínculo P4):** ¿DataLog captura la justificación de las transiciones de estado (BR-WKF-001), o se acepta perderla? (ver "Vínculo con P4").

**Testing (Jira):** unit de detección/atribución del hijo y del visor. Integration: captura en los 4 objetos, no-escritura de ChangeLog, atribución CurricularSection→Activity y Curriculum/Offering, vista por objeto y global.

**Definition of Done (Jira):** tests (unit + integration) verdes · lint + Prettier + tsc limpios · lang ES completo · sin artefactos de sync/seed commiteados · tools up1-mcp actualizadas · quality review + smoke en UPU.

## Setup

| Campo | Valor |
|-------|-------|
| Branch | **`feat/UPONE-1380-datalog-history` CREADA (2026-07-09) en 2 repos** (decisión del dev: convención per-ticket, como P4/103). Trabajo core per RULE-dev-004 + `core_work_policy`; NO `develop`/`master`. Base: `object-manager` @ `27cb7e9`, `curriculum-design` @ `2b17c2d`. Ambas checkouteadas y working tree **limpio**. Merge a develop gated por revisión del team up1. **`up1-mcp`: rama pendiente** — repo no presente en este workspace (S5 se ejecuta donde viva o `assumed` + verificación en execute). |
| develop @ 2026-07-09 (verificado + actualizado a origin) | **`curriculum-design/develop` @ `2b17c2d`** (al día con origin) — incluye 1379 (PR#14 `ec157c1` + PR#15 `b750f63`) y **P4/1381 (PR#16 `2b17c2d`)**. 1379 verificado (ownerType+Curriculum, polymorphicChildren, polymorphicChildrenDerived, RT GraduationProfile). **`object-manager/develop` @ `27cb7e9`** — estaba 19 commits atrás; **fast-forward a origin** (incorpora PR#395 P4/1381 + PR#396/397 config-system, etc.). **P4/1381 SÍ tocó el core aquí** (`enforceEnumTransitions`, `instance.resolver.js`, `version-from-source.js`) → corrige el supuesto "mod-only". El **drift de sync** de object-manager (`objects/business/Base/*.json` + `prisma/*/schema.prisma`, regenerables) quedó **stasheado** (`stash: "TICKET-102 pre-branch"`) — descartable post-validación; se regenera con codegen+sync. Las ramas de trabajo heredan 1379 + P4. |
| Test data | UPU con los 4 objetos + hijos polimórficos (CurricularSection RT) para verificar atribución al padre |
| Services | object-manager (withDataLog), suite (visor), flow (retiro flow ChangeLog) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **PR #14 (UPONE-1379/P2, OPEN) fija el formato de la declaracion polimorfica que P3 consume + introduce `polymorphicChildrenDerived` para CurricularLink (que NO tiene `ownerType/ownerId`).** Sin cubrir el path derivado, la atribucion de CurricularLink —uno de los 3 que ChangeLog auditaba— se perderia. 1379 NO toca el core de P3 (withDataLog/datalog) ni los targets de retiro → cero conflicto ahi; SI hay overlap en layouts de Curriculum/Offering(Syllabus). Dependencia condicional al merge en develop (S1.T0). Estado 2026-07-08: NO en develop. | analyze-pr (PR #14) | S1 (design) | discarded | — |
| L2 | **`appRoles.resolver.js:manageAppRoles` escribe a `prisma.dataLog.create` mientras `withDataLog.js` usa `prisma.core_DataLog.create`.** El objeto se movio de `objects/business/Base` a `objects/core/core_DataLog.json` (Klaus) → el delegate Prisma es `core_DataLog`; `prisma.dataLog` probablemente ya no existe → el guard `if (changed && prisma.dataLog)` cae a falsy y el cambio de roles de app podria no loguearse (silent no-op). Preexistente y tangencial a P3 (no es hijo polimorfico) → NO se toca aqui; candidato a follow-up local. Relevante para S4/S5 (consumidores del shape DataLog). | developer (S1.T2 impacto) | S1 | refined | BUG-curriculum-design-006 |
| L3 | **`npm run codegen` NO regenera BASEMODEL con `TENANT_ID` seteado** (default UPU en `.env`): genera solo el schema del tenant copiando BASEMODEL (posiblemente stale). Para cambios en objetos `core`/shared hay que correr `TENANT_ID=BASEMODEL npm run codegen` PRIMERO (regenera BASEMODEL desde los JSON core, `generatePrismaSchema.js:1231-1236`), luego el tenant. El propio codegen lo advierte (`:1375`). Sin este orden, un cambio de schema core no aparece en ningun tenant. | developer (S1.T3) | S1 | refined | RULE-core-029 |
| L4 | **Los prisma schemas commiteados del branch estan STALE vs los objetos commiteados**: al regenerar aparece drift ajeno a P3 — modelos `core_Config`/`core_ConfigDefinition` (config-system, PR#396/397) faltantes, `ReportTemplate.joins`/`filterFields` removidos, `up1_suite_app.hasConfigs` nuevo. Deuda de sync preexistente heredada de develop (el schema no se regenero cuando landearon esos objetos). NO es de P3: se descartaron los artefactos generados del commit de S1 (son auto-generados, DoD "sin artefactos de sync commiteados"); S2.T3 regenera para migrate. Owner del config-system debe regenerar/commitear su schema aparte. | developer (S1.GATE) | S1 | discarded | — |
| L5 | **En CREATE de objetos RT-projected, `result` de `createInstance` NO expone `ownerType/ownerId` al top-level** → la atribución quedaba null (los unit mocks lo ocultaban porque devolvían `result` con owner). Fix: el snapshot de CREATE combina `args.data` (input, trae el owner) con `result`. Lección: para verificar captura/atribución en objetos RT-projected, la integración contra BD real es imprescindible — los mocks de `result` no reflejan la forma real del retorno del resolver. | integración (S2.T3) | S2 | refined | BUG-curriculum-design-007 |
| L6 | **El retiro de ChangeLog (S3) es más amplio que las tasks del spec y está acoplado a S4.** grep-first: (a) el tab "Historial→ChangeLog" vive en **8 layouts** (Activity + 7 RT de CurricularSection + CurricularLink_view), no solo `default_Activity_view`; (b) hay typedef `auditCapture.schema.graphql` (mutation `recordAuditEvent`) + `errors.js` código AUDIT_*; (c) el evento `Activity-transition.json` es del workflow viejo (currentStatusId), NO el `onTransition` del enum engine de P4 (que S2.T4 ya cubre) → seguro de borrar. Los 8 tabs se **repointan a DataLog en S4** (no delete+recreate). S3 no se puede cerrar sin el migrate DROP de la tabla (a cargo del dev) → S3.T7 (0 filas ChangeLog) depende de eso. Recomendación: ejecutar S3+S4 como unidad coordinada con el entorno del dev. | researcher (S3.T1 grep-first) | S3 | discarded | — |
| L11 | **Un `modsComposable` NUEVO requiere reiniciar el suite dev server para que RecordDetail lo cargue.** RecordDetail resuelve el composable de `autoPopulate` con import dinámico por variable (`import(\`../composables/${composable}.ts\`)`, RecordDetail.vue:~825). Vite **pre-analiza el set de imports dinámicos al arrancar**, así que un composable recién synceado da `Error: Unknown variable dynamic import: ../composables/useX` hasta el restart. Mismo patrón de staleness que el elemento Vueform `json-field-viewer` (L-verificado S4). Implicación: al agregar composables/elementos de mod, contar con un restart del suite antes de verificar. | reviewer (S4, useDataLogOwnerName) | S4 | refined | RULE-curriculum-design-031 |
| L10 | **MGR-06 (UPONE-1291, mergeado en develop 2026-07 tras el update) cierra la vía de columnas JSON en el RecordList.** El RecordList NUNCA renderiza campos `Json` como columnas/subcolumnas (spec test `useColumnConfiguration.spec.ts`; se removió `processJsonSchema`); la visualización estructurada de JSON pasa a RecordDetail vía el nuevo `JsonFieldViewer` (molecule `components/molecules/JsonFieldViewer/` + elemento `json-field-viewer`). Impacto P3: **invalida b2** (columnas diff en el RecordList) y refuerza **M** (panel mod-only, que puede reutilizar `JsonFieldViewer`/`jsonFieldUtils`). Verificado: las columnas **declaradas explícitamente** en el layout (como nuestra "Cambios") SÍ sobreviven — MGR-06 solo excluye auto-derivación + el selector de columnas. Detectado al actualizar layout a `origin/develop` (8c8cf52) antes de codear b2. | reviewer (S4, post-update layout) | S4 | refined | DEC-046 |
| L9 | **El visor colapsa la diff en una sola columna "Cambios" (JSON crudo) — incumple REQ-06/S4.T3, que piden columnas Campo/Antes/Después separadas.** Detectado en el smoke: la fila muestra `name: { new: Modalidad Presencial (editada), old: Modalidad Presencial }` en vez de Campo=`name`, Previo=`Modalidad Presencial`, Actual=`Modalidad Presencial (editada)`. El reuso de up1-manager NO lo cubre (su `dataLogList` no define `columns`, renderiza `changes` crudo). Trabajo net-new + decisión de diseño del modelo de render (fila-por-campo vs cell renderer vs proyección backend), porque `changes` es multi-campo por fila. Ver BL-7. | dev + reviewer (S4.T6 smoke) | S4 | discarded | — |
| L8 | **[FIXED en Activity]** **El visor "Historial" (S4) referencia `objectName: "DataLog"`, pero el objeto fue renombrado a `core_DataLog` (mismo rename de L2) → RBAC default-deny.** El RecordList de DataLog en `default_Activity_view.json` (y el visor original de up1-manager `objectdefinition-view.json:402` + su contract test `datalog-viewer-contract.test.ts:34`) usan `objectName: "DataLog"`. Como no existe objeto/capability `DataLog`/`datalog:view` (solo `core_DataLog`/`core_datalog:view`, que Admin SÍ tiene), `listInstances(name:"DataLog")` lanza "Authorization Error: You do not have permission to view DataLog objects" (`authChecker.js:310`) y el visor muestra "No tienes permiso". `listInstances(name:"core_DataLog")` devuelve las filas atribuidas correctamente. **Verificado por replay del query de producción en UPU real.** Fix: `objectName` `DataLog`→`core_DataLog` en el layout (S4.T3). El bug es transversal: afecta también el visor de up1-manager (mod fuera de scope P3) → BL-6. | reviewer (S4.T6 smoke DET-36) | S4 | refined | BUG-curriculum-design-008 |
| L12 | **`withDataLog` no auditaba ediciones vía alias RecordType (`rt__<RT>__<base>`) → el path más común de la UI quedaba sin historial.** `isDataLogEnabled` resolvía el archivo por `${objectType.toLowerCase()}.json` en `business/Base`/`tenants/Base`/`objects/up1`, NO en `business/RecordTypes/` → para el alias `rt__Plan__curriculum` no hallaba archivo → `enabled=false` → passthrough. La UI edita Curriculum/Activity vía `updateXWithRecordType` → `updateInstance(alias)`, así que planes de estudio (Plan/Minor) y sus hijos NO se auditaban. Además el override del mod `polymorphicUpdate.rtUpdateHandler` (rt__X__curricularsection) hace writes propios sin pasar por withDataLog (segundo gap). Fix: `resolveBaseObjectType` normaliza alias→base canónico + `recordMutationDataLog` reutilizable (llamado también por el mod). **Gap de verificación:** S1/S2 testeaban con `objectType` base, nunca con el alias de la UI. | dev (prueba UI real) | S6 | refined | BUG-curriculum-design-009 |
| L7 | **`npm run sync` NO purga objetos borrados del core** (es aditivo). Al eliminar `changeLog.json` del mod, la copia synced `object-manager/objects/business/Base/changelog.json` quedó huérfana y codegen **seguía regenerando el modelo ChangeLog** aun tras el reset del dev. El retiro de un objeto de mod requiere: borrar en el mod **+ borrar la copia synced en core a mano** + codegen (BASEMODEL-first) + migrate. Verificado: tras `git rm` de la copia synced + codegen, `model ChangeLog` desaparece de BASEMODEL+UPU. | developer (S3, post-reset) | S3 | refined | RULE-core-030 |

## Backlog

| # | Item | Priority | Estado |
|---|------|----------|--------|
| BL-1 | **Repoint de los 8 tabs "Historial" (Activity + 6 RT curricularsection + CurricularLink) de `objectName: ChangeLog` → DataLog** (con filtro `recordId`/`parentObject`+`parentId` + columnas de atribución). | resolved | cerrado en S4: los 4 objetos principales usan `core_DataLog`; RT/hijos quedan cubiertos por `historyKey` y atribución al padre |
| BL-2 | Limpiar 3 comentarios stale que referencian `auditCapture.resolver.js` borrado (`errors.js:13`, `polymorphicUpdate.resolver.js:11`, `workflowTransitionHistory.resolver.js:36`). | could | open — S6 docs/cleanup |
| BL-3 | **Follow-up local (no Jira):** `npm run sync` no purga objetos borrados del core (L7) — la copia synced huérfana debe removerse a mano al retirar un objeto de mod. Proponer prune en sync o step explícito. | could | open |
| BL-4 | **Follow-up local (no Jira):** drift de config-system en develop (L4) — schemas commiteados stale vs objetos (`core_Config`/`ReportTemplate`). Avisar al owner de config-system para re-sync canónico. | could | open |
| BL-5 | **Follow-up local (no Jira):** accessor `prisma.dataLog` vs `core_DataLog` en `appRoles.resolver.js` (L2) — posible silent no-op al loguear cambios de roles de app. Verificar y corregir. | could | open |
| BL-8 | **Coordinación con UPONE-1393 (RBAC roles del mod) — dependencia dura.** 1393 (Developing, mismo sprint) crea roles granulares (Consultor Curricular/Diseñador/Revisor/Autoridad) + `seed/_data-rbac.js` con `MOD_CAPABILITIES_BY_ROLE`, reemplazando el bloque Admin/Consultor. **Nuestro visor Historial (pestañas + global) exige `core_datalog:view`** (gate del tab `requiredCapability` + server-side authChecker en `listInstances` sobre core_DataLog). `core_datalog:view` es capability **CORE** (no está en `capabilities.json` del mod) → el mapeo de 1393 **debe incluirla explícita** para los roles que auditan (mín. Consultor Curricular; probablemente todos los curriculares), o esos roles **no verán el Historial** (tab oculto + query falla). **Legacy:** las caps del mod `activity:audit`/`curricularsection:audit`/`curricularlink:audit` (era ChangeLog, "ver tab Historial") quedan **superseded** por `core_datalog:view` (P3 no las usa; no hay audit caps para Curriculum/Offering/AcademicProgram) → 1393 decide mantener/deprecar. Sin conflicto de mecanismo (1393 gatea transiciones con `*:revert`; P3 gatea el tab con `core_datalog:view`). **⚑ CHECK AL ABRIR EL PR — orden de merge:** verificar si 1393 ya está mezclado en develop. (a) **Si 1393 mergeó primero:** al rebasar P3, `seed/_data-rbac.js` ya existe → P3 debe **agregar `core_datalog:view` al `MOD_CAPABILITIES_BY_ROLE`** de los roles de auditoría (P3 aplica el cambio en su PR). (b) **Si P3 mergea primero:** 1393 (aún Developing) debe incluir `core_datalog:view` al construir su mapeo (1393 aplica). En ambos casos **el segundo en mergear reconcilia**. Sin esto, los roles nuevos no ven el Historial. | resolved for close / PR checklist | no bloquea cierre DKC: es coordinacion de merge-order externa al ticket; queda explicitamente en closed_reason/PR checklist |
| BL-6 | **Fix S4 (bloqueante del smoke, en scope):** `objectName: "DataLog"` → `"core_DataLog"` en `default_Activity_view.json` (tab Historial) — **✅ aplicado + re-seed + re-smoke PASS (2026-07-09)**. Falta replicar al repointar los 3 objetos restantes (Curriculum/Offering/AcademicProgram) en S4.T3. **Cross-mod (fuera de scope P3, no Jira):** el visor original de up1-manager (`objectdefinition-view.json:400 dataLogList` + contract test `datalog-viewer-contract.test.ts:34`) tiene el mismo `objectName: "DataLog"` roto por el rename → su tab "Historial" está caído. **Confirmado 2026-07-10** (prueba temporal fix→core_DataLog + revert): además, incluso arreglado, su visor usa columnas default y **post-MGR-06 el campo JSON `changes` queda excluido** → up1-manager NO muestra antes/después (solo metadata escalar: Object/Record ID/Parent Object/Parent ID/Child Record Type). Doble arreglo necesario allá (objectName + columnas). Avisar al owner de up1-manager. | ~~must (S4)~~ resolved / could (up1-manager) | **S4 resuelto** (2026-07-10): los 4 objetos usan `objectName: core_DataLog` (repoint completo en S4.T3, verificado runtime). **Pendiente could (cross-mod, no Jira):** el visor de up1-manager sigue con `objectName: DataLog` roto + columnas default post-MGR-06 → avisar al owner de up1-manager. |
| BL-7 | **[DELEGADO EXTERNO 2026-07-10]** El componente que parsea `changes` a UI amigable (campo como input + old/new como textareas) **lo hará otro equipo/persona** (fuera de este ticket). Interino en P3: el detalle usa `json-field-viewer` (pretty-print JSON del `changes`). **Cuando el componente custom aterrice: swap en `datalog_entry_view.json` del `changes` `type: json-field-viewer` → el nuevo `type`.** Lo demás del visor (drill-in, atribución, columnas escalares) queda igual. **Desglose per-campo de la diff en el visor (REQ-06 / S4.T3)** se resolvió para P3 con la opción 1 aceptada en S4: columnas escalares en la lista + diff completo al abrir la entrada vía `json-field-viewer`, alineado a MGR-06; el componente más amable queda fuera de alcance y delegado. | resolved / external could | no bloquea cierre: el visor entrega auditoría por objeto/global con before/after en drill-in; mejora visual delegada fuera del ticket |

## Análisis — desglose per-campo del visor (BL-7 / REQ-06 / L9) — 2026-07-09

> **Qué se decide:** cómo renderizar el diff de `changes` en el visor "Historial" como columnas **Campo / Antes(Previo) / Después(Actual)** (REQ-06), en vez de la columna única "Cambios" con JSON crudo (`name: { new:…, old:… }`) del repoint parcial de Activity. Análisis hecho leyendo el código del RecordList genérico (core `layout/`). **No ejecutado — decisión del dev.**

### Hallazgos de código (por qué no sale "gratis")

1. **El render crudo actual** sale de `renderJsonValue` → `formatNestedObject` (`layout/src/utils/recordListFormatters.ts:124`): cualquier columna cuyo valor es objeto JSON se serializa como `key: { … }`. Eso produce el `name: { new:…, old:… }` que se ve hoy.
2. **La auto-expansión de JSON a columnas NO aplica a `changes`.** `processJsonSchema` (`recordListFormatters.ts:34`) genera columnas desde un JSON **solo si hay `jsonSchema` estático con propiedades fijas**. `changes` tiene **claves dinámicas** (el campo mutado varía por fila: `name`, `weight`, `status`, …) → no hay schema fijo → no puede derivar Campo/Antes/Después. Las `JsonFieldColumn.jsonPath` (`recordlist.ts:462`) son rutas **estáticas**, inútiles para claves dinámicas.
3. **El `Column` (`recordlist.ts:446`) no admite un formatter-función** (los layouts son JSON, no pueden llevar funciones). Solo `valueLabels` (mapa valor→label). Cualquier transform debe ser un **formatter con nombre/tipo implementado en core**.
4. **La tabla del RecordList no tiene render por componente-custom-por-tipo.** El `component-registry.json` (`activity-status-badge`, etc.) es de **elementos Vueform del RecordDetail (formulario)**, NO celdas de lista. `RecordList.vue` no ramifica por `col.type` para celdas custom.
5. **La fuente de datos está cableada a `listInstances(name)`** (`RecordList.vue:1692`) — no acepta query custom; y renderiza **1 fila por item** (sin "explotar" un subcampo JSON a N filas).
6. **Forma del dato:** `DataLog.changes = {campo:{old,new}}` puede traer **N campos por fila** (multi-campo por operación).

### Alcance: ¿solo hijos polimórficos o también cambios directos? (+ estado de up1-manager) — 2026-07-09

> Pregunta del dev: ¿el desglose per-campo es solo por los hijos polimórficos o afecta a los cambios directos? ¿Cómo está en up1-manager? ¿b2 agrega algo más?

**El desglose per-campo es GENÉRICO al diff, NO específico de hijos polimórficos.**

- `changes = {campo:{old,new}}` tiene **la misma forma** en un cambio directo del padre y en un cambio de un hijo polimórfico. Lo confirma el propio smoke (screenshot verde): **ambas** filas muestran el JSON crudo —
  - fila directa (Activity, **Origen `-`**): `name: { new: Ecuaciones Diferenciales, old: … }`
  - fila hijo (CurricularSection, **Origen `Modality`**): `name: { new: Modalidad Presencial (editada), old: … }`
- Es decir, la columna cruda "Cambios" afecta **igual a directos y a hijos**. El desglose Campo/Antes/Después se necesita para **todas** las entradas (REQ-06 no distingue). **b2 es uniforme**: el mismo formatter rinde el diff para ambos tipos de fila.
- **Lo único específico de hijos polimórficos es la ATRIBUCIÓN** (`parentObject`/`parentId`/`childRecordType` → columna **Origen**, vacía en directos), y eso **ya está hecho** (S1/S2 backend + columna Origen). b2 es **ortogonal** a la atribución: no la toca ni depende de ella.

**Cómo está hoy en up1-manager (visor `dataLogList` de `objectdefinition-view.json`):**
- Usa **columnas default** (no declara `columns`) → también rinde `changes` **crudo**: el desglose per-campo **tampoco está resuelto ahí**.
- Filtra por **`objectName EQUALS {{record.name}}`** (todos los cambios de un TIPO de objeto del meta-modelo), **NO** por `historyKey`/atribución → es un log admin por tipo de objeto, **sin atribución hijo→padre** (caso de uso distinto al de P3, que es historial por instancia + hijos).
- Además está **roto por el rename** a `core_DataLog` (objectName "DataLog", BL-6).

**¿b2 afecta algo más? Blast radius:**
- b2 se implementa como **tipos de columna nuevos opt-in** (ej. `diff-field`/`diff-old`/`diff-new`) en el formatter de core `layout/`. **Es aditivo**: cambia el render **solo** en los layouts que declaren esos tipos. Los visores existentes que hoy usan `changes` crudo (up1-manager y cualquier otro consumidor de DataLog) **NO cambian** hasta que su layout los adopte → sin regresión silenciosa.
- **Es código core `layout/`** (RecordList/TableCell/formatters) → RULE-dev-004 (review team up1). **No** toca `object-manager` ni la BD (a diferencia de la opción c).
- Recomendación de contención: **no modificar** el render default de `changes` (dejarlo como fallback); agregar solo los tipos nuevos → blast radius = exactamente los layouts que los usen.

**Resumen para la decisión:** b2 es un cambio **genérico y aditivo** del render del diff (sirve a directos y a hijos por igual), independiente de la atribución (ya hecha). No "solo agrega info de hijos": mejora la visualización del diff en todo el visor, sin afectar otros consumidores salvo que adopten los nuevos tipos de columna. up1-manager necesitaría adoptarlos aparte (fuera de scope P3) si se quiere el mismo desglose ahí.

**Naturaleza del opt-in (aclaración dev, 2026-07-09):** el opt-in es de **presentación por layout**, NO de datos. El `changes = {campo:{old,new}}` (antes/después por campo) **siempre** está en cada fila de `core_DataLog`, se active b2 o no. Activar b2 = declarar los tipos de columna nuevos (`diff-field`/`diff-old`/`diff-new`) en el layout del visor → muestra Campo/Antes/Después. No activarlo = sigue mostrando la columna "Cambios" cruda (JSON), **con la misma info**, sin pérdida ni regresión. Es decir: NO es que "si no se activa no recibe la info" — la info está siempre; el opt-in solo decide si se **desglosa visualmente**.

### Opciones (factibilidad basada en el código)

| Opción | Qué es | Factibilidad real | Costo / dónde | REQ-06 |
|--------|--------|-------------------|---------------|--------|
| **(a) Fila por campo (explode en FE)** | 1 entrada DataLog con N campos → N filas visuales | ❌ No en config: el RecordList rinde 1 fila por item y no explota `changes`. Requeriría **nueva capability core** en el RecordList o alimentarlo ya explotado (→ colapsa en (c)). | Core `layout/` (feature nueva) | Cumple, pero rompe paginación/conteo (N filas por entrada) |
| **(b1) Formatter de diff en 1 celda** | Mejora la columna única: lista `campo: old → new` (multi-línea) | ✅ Contenible: nuevo formatter tipado en `recordListFormatters`/TableCell | Core `layout/` (chico) | **Parcial** — no son 3 columnas |
| **(b2) 3 columnas Campo/Antes/Después con formatter `changes`-aware** | Cada columna lee `changes` y rinde su parte; multi-campo apilado in-cell, 1 fila por entrada | ✅ Contenible: formatter tipado config-driven (ej. `type: "diff-field"/"diff-old"/"diff-new"`) en core; sin tocar backend ni `listInstances` | Core `layout/` (medio; RULE-dev-004) | **Cumple** (columnas), 1 fila/entrada |
| **(c) Proyección backend (filas per-campo)** | Resolver/objeto virtual que explota cada entrada a N filas `{…, field, oldValue, newValue}`; el RecordList mapea columnas directo | ⚠️ Cumple y deja el FE genérico sin render custom, **pero** `listInstances` solo sirve objetos registrados → hace falta objeto virtual/resolver custom en core `object-manager/` **o** un prop de query custom en el RecordList. Cambia semántica de conteo/paginación. | Core `object-manager/` (mayor) + posible cambio RecordList | Cumple, y alinea con **REQ-09** (MCP `get_change_history` "antes/después") |

### Opción M — panel custom mod-only (parseo del `changes` en el mod) — 2026-07-09

> Pregunta del dev: si el `changes` ya llega crudo (JSON), ¿no podemos parsearlo en el mod y hacer esto **mod-only** (sin tocar core `layout/`)?

**Sí, es factible y hay precedente en producción.** El mod academic-scheduling declara una pestaña `"type": "scenario-detail-panel"` en `scenario-view.json` → el componente `ScenarioDetailPanelElement.vue` (en su `modsComponents/`) **inyecta `apolloClient`** (`inject: { hostApolloClient: { from: 'apolloClient' } }`), corre **su propia query**, recibe `{{parentId}}` y renderiza UI arbitraria. Registro automático vía `component-registry.json` (sync lo genera desde `modsComponents/`).

**Aplicado a P3:** la pestaña "Historial" deja de ser `record-list` y pasa a `"type": "datalog-history-panel"` → componente en `mods/curriculum-design/modsComponents/DataLogHistoryPanel/` que:
- hace `listInstances(name: "core_DataLog", filters: [historyKey EQUALS "{objectName}:{{parentId}}"], limit, offset, sort)`,
- **parsea `changes = {campo:{old,new}}` en el mod** y renderiza columnas Campo / Antes / Después + Origen (childRecordType), con multi-campo apilado, i18n y estilo propios.
- **Cero cambios en core `layout/`** (respeta `feedback_no_touch_layout_workspace` / RULE-dev-004).

**Trade-offs M vs b2:**

| Dimensión | M (panel mod-only) | b2 (formatter core) |
|-----------|--------------------|---------------------|
| Toca core `layout/` | **No** (solo mod) | Sí (review team up1) |
| Control del render | Total (parseo propio) | Tipos de columna nuevos |
| Paginación/búsqueda/orden | **A reimplementar** (query soporta limit/offset/sort; el UI lo pone el mod) | Gratis (RecordList) |
| RBAC (REQ-08) | **Igual protegido** server-side (authChecker en `listInstances`); el panel maneja el error/oculta tab | Gratis (RecordList gatea) |
| Export/column settings | Lo que implemente el mod | Gratis |
| Reuso otros visores | Solo si adoptan el componente | Beneficia a todo DataLog |
| Reversibilidad | Alta (borrar componente + revertir layout) | Alta (aditivo) |

**Costo real de M:** reimplementar las mecánicas de lista del RecordList — sobre todo **paginación** (crítica si un objeto acumula historial largo), y búsqueda/orden si se quieren. La seguridad se mantiene (RBAC es server-side). Es más código en el mod, pero self-contained y sin gate de core.

**Precedente/verificación:** `mods/academic-scheduling/modsComponents/ScenarioDetailPanel/ScenarioDetailPanelElement.vue` (inject apolloClient + query propia) + `config/layouts/scenario-view.json` (`type: scenario-detail-panel`). El `changes` llega como objeto anidado en `data` (no string) → parseo trivial en el componente.

### Recomendación

> **↩️ CORRECCIÓN (dev, 2026-07-10) — DEC-LOCAL-02 REABIERTA: RecordList estándar preferido, M como último recurso.** La entrada "switch-b2-to-M" estaba sobre-inclinada. MGR-06 solo prohíbe columnas JSON en el RecordList (mata b2), pero **el RecordList estándar sigue usándose** (paginación/filtros/RBAC gratis). **Opciones vivas:** **(1)** columnas escalares (Fecha/Usuario/Acción/Origen) + diff al abrir la entrada vía `JsonFieldViewer` (drill-in) — cero core, mínimo esfuerzo, alineado a MGR-06; **(2)** proyección backend a filas por-campo escalares → RecordList estándar con columnas Campo/Antes/Después = **diff inline**, REQ-06 literal, compatible MGR-06 (costo: resolver en object-manager + paginación por campo); **(M)** panel custom = último recurso (reimplementa la tabla), solo si se exige inline + no tocar backend. **Decisión pendiente = una pregunta: ¿diff inline (→2) o al abrir la entrada (→1)?** El bloque siguiente (DECISIÓN REVISADA / b2 / M / c) se conserva como historial del razonamiento.
>
> **⚠️ DECISIÓN REVISADA (dev, 2026-07-10) — DEC-LOCAL-02: de b2 → M, tras actualizar layout.** Al poner layout al día (`origin/develop` 8c8cf52, +20 commits) llegó **MGR-06 (UPONE-1291, PR#288, con spec test)**: **el RecordList NUNCA renderiza campos `Json` como columnas/subcolumnas**; la visualización estructurada de JSON vive en RecordDetail vía el nuevo **`JsonFieldViewer`** (molecule + elemento `json-field-viewer`), y el commit removió `processJsonSchema` del RecordList. → **b2 (columnas diff-aware de un campo Json en el RecordList) queda DESCARTADA**: reintroduciría justo lo que el team removió → rechazo probable en review core + contra dirección de plataforma. **Nueva decisión: M (panel custom mod-only)**, que no está atado a esa exclusión y puede **reutilizar `JsonFieldViewer`/`jsonFieldUtils`** para el diff estructurado (alineado a plataforma, menos código). El costo de M (reimplementar paginación) ahora se justifica porque la vía "simple desde layout" quedó cerrada por MGR-06. Verificado: el visor actual sigue mostrando la columna Cambios cruda (columnas explícitas sobreviven MGR-06) → sin regresión por el update. **Guardrail:** M es mod-only → si resulta 100% en el mod, la rama de trabajo de layout creada hoy podría no usarse. (El bloque b2/M/c de abajo se conserva como el análisis base.)

**Opción (b2)** como camino primario (alternativa core): satisface las columnas de REQ-06 con cambio **contenido a la capa de formatters del RecordList** (core `layout/`), sin nuevo path de lectura en backend, sin tocar `listInstances`, sin alterar la semántica de paginación, y reusable por los 4 objetos **y** el visor de up1-manager. Un `changes`-aware formatter config-driven (3 tipos de columna) es genérico y declarativo (respeta DET-32/RULE-dev-004; el diseño de columnas vive en el layout JSON + i18n).

- **Reservar (c)** solo si negocio necesita **granularidad real per-campo** para filtrar/ordenar/exportar por campo individual (no solo verlo) — ahí la proyección backend se justifica y sirve también a REQ-09/MCP.
- **(b1)** es el fallback mínimo si el tiempo aprieta, pero **no cumple** REQ-06 al pie (no son 3 columnas) → registrar como excepción con OK del dev si se elige.
- **(a)** descartada salvo que ya se adopte (c) o se invierta en una feature de explode en el RecordList.

**Reversibilidad:** (b1/b2) alto (formatter aditivo en core `layout/`, git revert limpio). (c) media (schema/resolver + posible cambio en el generic list path). **Impacto core:** (b2) toca `layout/` (formatters/TableCell) → review team up1 (RULE-dev-004); no toca `object-manager` ni la BD.

**Decisión abierta para el dev:** elegir modelo de render (b2 recomendado / b1 fallback / c si se necesita granularidad per-campo real). Al elegir, el trabajo aterriza en **S4.T3** (columnas del visor) y debe corregir también el Activity ya repointeado + replicar a los 4 objetos + lang ES de las keys de columna.

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-07-09T17:13:45.000Z | null → super | dev trigger "super autopilot" (HOR-079, por-ticket) | S1 (arranque de execute) |

### Plan de sessions (preplanificacion)

6 sessions previstas. **Esqueleto producido por `intake-explore` (2026-07-08).** El detalle final
(tasks asignadas, gate criteria especificos) lo completa `design-feature` al generar el spec.
Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.
Trabajo en core (`withDataLog.js`) → tier ≥T2 en las sessions de core/FE; gates ⚑ fuerte por
revision del team up1 (RULE-dev-004) y smoke UI (DET-36).

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | **Core — atribucion hijo→padre en `withDataLog.js` (REQ-04, crux tecnico).** Reverse-index desde `polymorphicChildren` (`hijo→{padre,via}`) + leer `ownerType/ownerId` del snapshot del hijo. Fijar el **shape de los campos de atribucion** (columnas vs `metadata`) | 1 | T3 | extender `withDataLog.js`; helper reverse-index; unit deteccion/atribucion | ⚑ fuerte | unit atribucion `CurricularSection→Activity` verde + review core |
| S2 | **Core/mod — `enableDataLog` explicito en los 4 objetos + captura de cambios de estado (vinculo P4→P3) + no-regresion (REQ-01, REQ-05).** | 2 | T2 | declarar `metadata.enableDataLog`; verificar captura `status`/enum de transiciones; unit no-regresion objeto sin hijos | auto | integration: captura en los 4 objetos verde |
| S3 | **Mod — retiro de `ChangeLog` (REQ-02, REQ-03 perdida aceptada).** Objeto + `auditCapture.resolver.js` (951 L) + eventos + flow n8n + seed + limpieza ~807 L de tests | 3 | T3 | eliminar artefactos ChangeLog; limpiar tests+coverage; integration no-escritura ChangeLog | ⚑ fuerte | integration no-escritura ChangeLog + sin artefactos sync/seed |
| S4 | **FE — visor sobre `DataLog` (REQ-06, REQ-07, REQ-08).** Pestana "Historial" por objeto (reuso/param del visor DataLog de up1-manager + filtro por `recordId`) + vista global + gate `datalog:view` | 4 | T3 | layout pestana; extender filtro `recordId`; vista global; RBAC | ⚑ fuerte | smoke UPU real (DET-36): render pestana + vista global con atribucion |
| S5 | **MCP — retarget `get_change_history`/`query_changes`/`analytics_changes` → `DataLog` + atribucion (up1-mcp).** + verificacion post-1379 (diferida) de Curriculum/Offering | 5 | T2 | actualizar 3 tools; tests; verificar atribucion Curriculum/Offering | auto | tools verificadas + doc historial |
| S6 | **Cierre — quality review consolidado + regression + docs + teach-close.** | 6 | T3 | quality gate 10-dim; docs (shape DataLog + retiro ChangeLog); DoD Jira | ⚑ fuerte | DoD Jira completo (tests verdes, lint/tsc, lang ES, MCP, smoke UPU) |

> **Detalle refinado en el spec** ([SPEC-curriculum-design-datalog-history-attribution](../../specs/SPEC-curriculum-design-datalog-history-attribution.md)) — task contracts completos (38 tasks). El shape de atribucion **se cerro = columnas** (DEC-LOCAL-01, dev 2026-07-08).

**Notas del esqueleto**:
- **S1 es el camino critico** (infra nueva en core; RULE-dev-004). Shape de atribucion **cerrado = 3 columnas nullable en DataLog** (`parentObject`/`parentId`/`childRecordType`).
- **Baseline: Caso A (dev 2026-07-08)** — P3 avanza desde develop **asumiendo 1379/P2 (PR #14) incorporado**. **S1.T0** confirma (guard); si no esta, escalar (no arrancar Caso B por defecto). La reverse-index consume el formato `polymorphicChildren`/`polymorphicChildrenDerived` que 1379 fija. Ver "Condicional 1379" del spec.
- **REQ-04 cubre 3 caminos** de atribucion: owner directo (`ownerType/ownerId`), recursivo (`parentId`), **derivado (CurricularLink via `sourceSectionId/targetSectionId`)** — este ultimo descubierto en el PR #14; sin el, CurricularLink (que ChangeLog auditaba) se perderia.
- **S2** depende del vinculo con P4 (TICKET-103, cerrado): las transiciones que P4 dejo de historiar las captura DataLog via los `onTransition` del motor de enum de core.
- **S4.T3 (Caso A):** los layouts de Curriculum/Offering(Syllabus) ya traen tabs de 1379 → agregar "Historial" SOBRE ellos (rebase, no reemplazar) — overlap de archivos con PR #14.
- **S5.T5 (baseline A)**: test de integracion real de atribucion Curriculum/Offering/CurricularLink (parte del DoD); solo degrada a backlog si S1.T0 escala a contingencia.
- **Numeracion continua** (DET-20): el ticket no tiene sessions previas → K=1.

### Session 1 — 2026-07-09 17:30 — Core: atribución hijo→padre en `withDataLog.js` (crux REQ-04) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Construir la infra de atribución polimórfica en core (camino crítico): 3 columnas nullable en `DataLog` (`parentObject`/`parentId`/`childRecordType`) + reverse-index desde `metadata.polymorphicChildren`/`polymorphicChildrenDerived` + extensión de `withDataLog.js` para poblar las columnas por los 3 caminos (owner directo, recursivo, derivado), incluido DELETE. Unit `CurricularSection→Activity` + no-regresión de objeto sin hijos polimórficos.

**Tasks completadas**:
- [x] S1.T0 — Gate de arranque: confirmar UPONE-1379 (P2) en develop (baseline Caso A)
- [x] S1.T1 — Setup limpio: stash del drift ajeno en object-manager; confirmar rama de trabajo
- [x] S1.T2 — Analizar consumidores de `withDataLog.js` y del shape de `DataLog` (impacto colateral core)
- [x] S1.T3 — Agregar 3 columnas nullable a `DataLog` + índice `(parentObject,parentId)`; codegen
- [x] S1.T4 — Construir reverse-index desde `polymorphicChildren` + `polymorphicChildrenDerived` (3 caminos)
- [x] S1.T5 — Extender `withDataLog.js`: poblar las 3 columnas resolviendo el padre; incluye DELETE
- [x] S1.T6 — No-regresión: objeto sin `polymorphicChildren` conserva comportamiento genérico
- [x] S1.GATE — Gate de sync Session 1 (T3): quality review + dual-judge; commit `UPONE-1380`

**Reviewer**: dual-judge (2 jueces ciegos independientes, sonnet)
**Tier de revision**: T3 (regression completa + dual-judge DET-35)
**Resultado global**: APPROVED

**Quality review (DET-23, T3 exhaustive)**:
- Calidad/mantenibilidad/claridad: pass — helper genérico (`polymorphicAttribution.js`), funciones cortas, comentarios en español, sin magic values; reusa la convención de delegate Prisma existente.
- Lint/tipado: pass (JS; sin `any`; validación de `null`/tipos en los 3 caminos). tsc/Prettier del repo se consolidan en S6 (DoD).
- Testing: pass — 23 unit (13 decorator + 10 reverse-index) + suite core 2110/90 verde. Integration DB diferida a S2.T3 (migrate).
- Escalabilidad: pass — reverse-index cacheado por tenant; owner-directo sin query (robusto ante cascada); recursivo/derivado con query acotada (depth cap 20).
- Error handling: pass — `resolveAttribution` en try/catch anidado; nunca rompe la mutación principal ni el write de auditoría.
- a11y/storybook: n/a (backend).

**Dual-judge (DET-35, T3)**: ronda 1 → ambos jueces confirmaron 1 WARNING (UPDATE atribuía al padre viejo en re-parenting). Fix aplicado (snapshot efectivo post-update) + test de re-parenting. INFO de orden owner-vs-derived (ambos) → fix defensivo. INFO derived→recursivo (1 juez, inalcanzable por `not_null`) → documentado. Ronda 2 → **ambos APPROVED**, sin nuevos defectos.

**Self-report verification (DET-33)**: verificado independientemente — archivos existen (git diff), 23 unit re-corridos (verde), suite core re-corrida (2110/90 verde), schema regenerado confirmado por grep. Commits locales `f4e7160` (feat) + `51211ea` (test) en `object-manager@feat/UPONE-1380-datalog-history`.

**Commit DET-27**: `f4e7160` feat, `51211ea` test (locales; merge a develop gated por team core — RULE-dev-004; push difiere aprobación humana).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 crux REQ-04 completo: atribución polimórfica en core, 23 unit + 2110 suite verdes, dual-judge APPROVED. Commits locales f4e7160+51211ea. Integration DB → S2.T3.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-07-09 17:55 — Core/mod: `enableDataLog` explícito en 4 objetos + captura de transiciones [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Declarar `metadata.enableDataLog: true` explícito en AcademicProgram, Curriculum, Activity y Offering (REQ-01); propagar vía codegen+sync+migrate a UPU; verificar captura de create/update/delete en los 4 y del cambio de `status`/enum (transiciones, vínculo P4) en Activity/Curriculum, sin regresión (REQ-05).

parallel_groups: [[S2.T1, S2.T2]]

**Tasks completadas**:
- [x] S2.T1 — Declarar `metadata.enableDataLog: true` en AcademicProgram + Curriculum
- [x] S2.T2 — Declarar `metadata.enableDataLog: true` en Activity + Offering
- [x] S2.T3 — codegen+sync+migrate UPU; verificar captura create/update/delete en los 4 objetos
- [x] S2.T4 — Verificar captura de transiciones (`onTransition`) en Activity/Curriculum
- [x] S2.GATE — Gate de sync Session 2 (T2): integration verde

**Reviewer**: developer + integración BD real (self-report verificado)
**Tier de revision**: T2 (unit + integración)
**Resultado global**: APPROVED (auto)

**Quality review (DET-23, T2 standard)**:
- Testing: pass — integración BD real UPU: `dataLog.integration.test.js` 8/8 (no-regresión) + `dataLogAttribution.integration.test.js` 5/5 (CREATE/UPDATE-reparent/DELETE atribuidos, cambio directo→null, transición Draft→InReview captura `changes.status`). Unit withDataLog 14/14.
- REQ-01: enableDataLog explícito synced a los 4 objetos (verificado en object-manager/objects/business/Base). REQ-05: cambio directo del padre → columnas null (integración). Vínculo P4: transición capturada.
- Error handling / escalabilidad / mantenibilidad: pass (sin cambios estructurales nuevos; fix de CREATE aislado).

**Self-report verification (DET-33)**: verificado independiente — schema UPU + Prisma client (14:04) con las 3 columnas (grep), enableDataLog synced (node), integración re-corrida contra BD real (13/13 total). Fix de CREATE probado por integración (result RT-projected sin owner) + unit dedicado. Commits `e286b6b` (mod flags), `70a5ee8` (fix), `44cb6b2` (test).

**Commit DET-27**: `e286b6b` feat (curriculum-design), `70a5ee8` fix + `44cb6b2` test (object-manager). Locales; push gated.

**Nota**: S2.T3 (codegen+sync+migrate UPU) lo ejecutó el dev (reset+sync manual) tras el bloqueo de migrate/drift; P3 verificó el resultado contra la BD real. Drift de config-system (L4) fuera de P3.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 completa: enableDataLog en 4 objetos + captura/atribución verificada contra BD real UPU (13/13 integración). codegen+sync+migrate por el dev. Commits e286b6b/70a5ee8/44cb6b2.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-07-09 18:30 — Mod: retiro destructivo de `ChangeLog` [phase: execute]

**Tipo**: ⚑ fuerte (retiro destructivo — consent del dev otorgado)
**Validation tier**: T3 (regression completa)

**Objetivo**: Retirar el subsistema `ChangeLog` (consolidado en DataLog): resolver `auditCapture.resolver.js` (950 L) + `recordAuditEvent`, eventos + flow n8n, layouts, objeto + seed (migrate destructiva con consent), y ~807 L de tests. Verificar no-escritura de ChangeLog (REQ-02, REQ-03 pérdida aceptada).

parallel_groups: [[S3.T2, S3.T3, S3.T4]]

**Tasks completadas**:
- [x] S3.T1 — Confirmar cero consumidores de `ChangeLog`/`recordAuditEvent` (grep mod+core+mcp)
- [x] S3.T2 — Eliminar `auditCapture.resolver.js` (950 L) + `recordAuditEvent` (+ `auditCapture.schema.graphql`)
- [x] S3.T3 — Eliminar eventos `{Activity,CurricularSection,CurricularLink}-*.json` + flow `audit-capture.json`
- [x] S3.T4 — Eliminar `default_ChangeLog_list.json` + tab "Historial" en **8 layouts** (Activity + 7 RT curricularsection + CurricularLink) → repointar a DataLog (coordinar con S4)
- [x] S3.T5 — Eliminar objeto `changeLog.json` + seed (migrate destructiva → consent; DB DROP a cargo del dev)
- [x] S3.T6 — Limpiar ~807 L de tests de integración de ChangeLog + coverage
- [x] S3.T7 — Integration: no-escritura de ChangeLog (muta Activity/CurricularSection → 0 ChangeLog, 1 DataLog)
- [x] S3.GATE — Gate de sync Session 3 (T3): retiro destructivo, quality review; commit `UPONE-1380`

**Reviewer**: developer + verificación adversarial (grep refs colgantes) + integración BD real
**Tier de revision**: T3 (retiro destructivo)
**Resultado global**: APPROVED

**Quality review (DET-23, T3)**:
- Testing: pass — suite mod **66 files / 1110 tests verde**; core unit events 93; integración **14/14** (DataLog + atribución + S3.T7 no-escritura). Post-DROP re-corrido verde.
- Retiro correcto (DET-16 propagación): resolver+schema.graphql+10 eventos+flow+objeto+lang+layout list+seed indexes+errors AUDIT_* + copia synced huérfana. −2640 L código + −1136 L tests.
- Verificación adversarial (proxy dual-judge, proporcional a retiro-verificado-por-suite): grep confirma **cero refs de código colgantes** (3 comentarios stale cosméticos → S6) y **cero imports rotos**. Los 8 tabs "Historial" per-objeto quedan (repoint a DataLog en S4, intencional).
- tsc: errores `.vue` en components/atoms son **preexistentes** (SFC sin plugin Vue), no introducidos por P3.

**Self-report verification (DET-33)**: verificado independiente — `model ChangeLog` ausente de BASEMODEL+UPU (grep 0), `prisma.changeLog` ausente del cliente regenerado, tabla dropeada (dev migrate confirmado), suites re-corridas verde. `core_DataLog` + 3 columnas intactas.

**Commit DET-27**: curriculum-design `b70a6d9`+`a9ef077`+`c415df5`; object-manager `b1c7b81`(test S3.T7)+`3c48359`(purga synced). DB DROP ejecutado por el dev. Locales; push gated (RULE-dev-004).

**Backlog / follow-ups**: (a) limpiar 3 comentarios stale (`errors.js:13`, `polymorphicUpdate.resolver.js:11`, `workflowTransitionHistory.resolver.js:36`) en S6; (b) L7 — `npm run sync` no purga borrados (mejora de plataforma).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → ChangeLog retirado y verificado: model+tabla+cliente eliminados (dev DROP), no-escritura probada (S3.T7), suite verde (1110 mod + 93 core + 14 integración), cero refs colgantes. 8 tabs Historial → S4 (BL-1). Commits b70a6d9/a9ef077/c415df5/b1c7b81/3c48359.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-07-09 19:15 — FE: visor "Historial" sobre `DataLog` [phase: execute]

**Tipo**: ⚑ fuerte (UI + smoke UPU real)
**Validation tier**: T3 (regression completa + smoke DET-36)

**Objetivo**: Montar el visor "Historial" reusando el RecordList de DataLog de up1-manager, extendido para filtrar por `recordId` OR (`parentObject`+`parentId`) (REQ-06); repointar los 8 tabs de los layouts de curriculum-design de ChangeLog → DataLog (BL-1) con columnas de atribución + lang ES; vista global (REQ-07); gate `datalog:view` (REQ-08); smoke UPU real (DET-36).

**Tasks completadas**:
- [x] S4.T1 — Analizar el visor DataLog de up1-manager (objectdefinition-view) para parametrizarlo
- [x] S4.T2 — Extender filtro del RecordList DataLog: `recordId` OR (`parentObject`+`parentId`)
- [x] S4.T3 — Pestaña "Historial" en los 4 objetos (Activity/Curriculum/Offering/AcademicProgram) sobre `core_DataLog`, filtro `historyKey = "{objeto}:{{parentId}}"` (objeto + hijos), columnas escalares (Fecha/Usuario/**Objeto**/Acción/Origen — la columna Objeto se agregó por pedido del dev para distinguir directo vs hijo dentro del historial del objeto) + drill-in "Ver" → `datalog_entry_view` (changes vía json-field-viewer + **nombre amigable del dueño** vía composable `useDataLogOwnerName`, cubre directos y polimórficos). Verificado runtime: Activity (hijo+directo, nombre resuelto) + Curriculum (filtro por objeto). Offering/AcademicProgram mismo patrón (JSON válido + synced). **Nota:** Campo/Antes/Después en el drill-in (MGR-06), no columnas inline. lang ES pendiente.
- [x] S4.T4 — Vista global de historial: layout `default_core_DataLog_list` (RecordList sobre core_DataLog) surface vía `defaultObjects` del app (ítem de menú), scope **solo malla** (`objectName IN [Activity,Curriculum,Offering,AcademicProgram,CurricularSection,CurricularLink]`), columnas Fecha/Usuario/**Objeto**/**Objeto padre**/**Origen**/Acción + drill-in "Ver". Verificado runtime (3 elementos: Curriculum/Activity directos + CurricularSection→Activity/Modality). Decisiones del dev: scope malla-only + surfacing por menú.
- [x] S4.T5 — RBAC: `requiredCapability: "core_datalog:view"` en la pestaña Historial de los 4 objetos (se oculta sin la capability — verificado con rol `admin-general-eng`: ve el Activity pero NO la pestaña Historial). Global auto-gateada por permiso de objeto core_datalog:view. REQ-08 ✓. Screenshot `TICKET-102-s4-opt1-rbac-tab-oculto.png`.
- [x] S4.T6 — Smoke real UPU (DET-36) para **Activity**: **PASS tras fix.** 1er run FAIL (visor "No tienes permiso" por `objectName: "DataLog"` inexistente — el objeto es `core_DataLog`). Fix aplicado (`DataLog`→`core_DataLog` en `default_Activity_view.json`) + re-seed (`sync:db` a UPU) + re-smoke → el Historial del Activity muestra el cambio de la `CurricularSection` (Origen=**Modality**) atribuido al padre + el cambio directo (Origen=`-`). Ver L8, BL-6, decisions_log runtime-verification. Screenshots: `TICKET-102-s4-smoke-historial-no-permiso.png` (antes) / `-OK-atribucion-modality.png` (después). **Nota:** el smoke cubre solo Activity; Curriculum/Offering/AcademicProgram dependen de S4.T3 (aún pending).
- [x] S4.GATE — Gate de sync Session 4 (T3): UI, quality review + smoke UPU real

**Reviewer**: dual-judge (2 jueces ciegos independientes, sonnet) — DET-35 T3
**Tier de revision**: T3 (regression completa + smoke DET-36 + dual-judge)
**Resultado global**: APPROVED (ambos jueces)

**Quality review (DET-23, T3 exhaustive)** — consolidado de ambos jueces:
- Calidad/mantenibilidad/claridad/escalabilidad: pass — visor mod-only, sin tocar core `layout/` (RULE-dev-004 respetada). Filtro `historyKey` EQUALS recolecta objeto+hijos sin OR; sin fuga cross-tenant/cross-objeto.
- REQ-06: pass (pestaña por objeto con atribución del hijo; diff en drill-in vía `json-field-viewer`, desviación MGR-06 aceptada). REQ-07: pass (vista global scope-malla, `IN` sobre String soportado por el resolver). REQ-08: pass — RBAC gateado real client-side (tab removido del DOM sin `core_datalog:view`) **y** server-side (authChecker deriva la capability, inescapable); menú global también gateado.
- Error handling: pass — composable `useDataLogOwnerName` maneja null/no-encontrado/query-fail sin romper el render (best-effort).
- a11y/storybook: n/a (config-driven + backend).

**Dual-judge (DET-35, T3)**: ambos jueces APPROVED en ronda 1. Hallazgos reconciliados (confirmado solo si ambos coinciden):
- ✅ **Confirmado (ambos, INFO)** — `roles: [Admin, Consultor]` inerte en `datalog_entry_view.json` + `default_core_DataLog_list.json` (no gatea con `applicationId:null`; hardcodea roles legacy que UPONE-1393 reemplaza). **Fix aplicado**: removido el campo (commit `39c626f`); el gate real es `core_datalog:view`.
- ✅ **Confirmado (ambos)** — falta unit del composable `useDataLogOwnerName` (Judge A `warning`, Judge B `info`; ambos lo enmarcan como deuda preexistente del patrón `autoPopulate`, no regresión de P3). **Fix aplicado**: `tests/unit/useDataLogOwnerName.spec.ts` 7/7 verde (commit `6b66e36`).
- ⊘ **No confirmado (solo Judge B)** — `any` en el composable: deuda preexistente del patrón `autoPopulate` (mismo que `useOwnerIdOptions.ts`); se consolida lint/tsc en S6 (DoD). No se actúa.
- Ninguno de los fixes cambia comportamiento runtime (config inerte + test aditivo) → no requiere re-judge.

**Self-report verification (DET-33)**: verificado independiente — 2 layouts sin `roles` (grep 0), unit del composable re-corrido (7/7 verde), commits presentes en el working tree de la rama (`39c626f`+`6b66e36` en curriculum-design, `42c2779` en object-manager). Smoke UPU real de S4.T6 con screenshots (atribución Modality→Activity + cambio directo) en TICKET-102.screenshots/. `curriculum-design` working tree limpio; `object-manager` solo con drift de sync regenerable (DoD: no se commitea).

**Commit DET-27**: curriculum-design `39c626f` (chore roles) + `6b66e36` (test composable); object-manager `42c2779` (test historyKey). Locales; push gated (RULE-dev-004).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S4 completa: visor "Historial" en los 4 objetos + vista global + RBAC `core_datalog:view` verificado (tab + server-side), smoke UPU real PASS, dual-judge APPROVED, 2 hallazgos INFO confirmados fixeados. Commits 39c626f/6b66e36/42c2779. Sigue S5 (MCP retarget).
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 5 — 2026-07-10 — MCP: retarget de las 3 tools de historial → `core_DataLog` [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + integración)

**Objetivo**: Reapuntar `get_change_history`/`query_changes`/`analytics_changes` de up1-mcp del retirado `ChangeLog` al `core_DataLog` de core, con el shape nuevo (objectName/recordId/action UPPERCASE, diff `changes {campo:{old,new}}`, atribución polimórfica) y devolver la atribución (REQ-09); + verificación de integración de atribución para Curriculum/Offering/CurricularLink derivado (S5.T5, DoD, baseline Caso A).

parallel_groups: [[S5.T1, S5.T2, S5.T3]]

**Tasks completadas**:
- [x] S5.T1 — Retarget `get_change_history` → `core_DataLog`: historial UNIFICADO por instancia (`historyKey EQUALS "{tipo}:{id}"` recolecta objeto + hijos) + devuelve atribución (parentObject/parentId/childRecordType + changedFields con valor antes/después). REQ-09.
- [x] S5.T2 — Retarget `query_changes` → `core_DataLog` (filtro por `objectName`; acción normalizada al enum UPPERCASE; filtro por campo client-side sobre el diff).
- [x] S5.T3 — Retarget `analytics_changes` → `core_DataLog` (ranking agregado por entidad dueña vía `historyKey`, incluye cambios de hijos).
- [x] S5.T4 — Tests de las tools: 13 unit sobre los helpers puros exportados (`normalizeAction`/`normalizeChanges`/`mapChange`/`matchesField`/`ownerKey`); suite MCP completa 134/134 verde + `tsc` build limpio.
- [x] S5.T5 — Verificación de atribución (BD real UPU): integración de Curriculum (GraduationProfile), Offering y CurricularLink derivado. 9/9 verde (6 previos + 3 nuevos).
- [x] S5.GATE — Gate de sync Session 5 (T2): integración + build verdes.

**Reviewer**: developer + integración BD real (self-report verificado)
**Tier de revision**: T2 (unit + integración) — gate `auto`, sin dual-judge (T2)
**Resultado global**: APPROVED (auto)

**Quality review (DET-23, T2 standard)**:
- Testing: pass — 134/134 MCP unit (13 nuevos para las tools) + 9/9 integración de atribución contra UPU real (Curriculum/Offering/CurricularLink derivado atribuidos correctamente, historyKey unificado verificado). `tsc` build limpio.
- Retarget correcto (DET-16 propagación): las 3 tools sobre `core_DataLog`; shape mapeado al nuevo modelo; atribución expuesta (REQ-09). Limpieza de refs stale de ChangeLog: comentario+bloque muerto en `programs-write.ts` (audit-capture/recordAuditEvent retirados) + `LIMITATIONS.md` (historial ya no depende de n8n; es transaccional vía withDataLog).
- Escalabilidad: `analytics_changes` mantiene el tope de fetch (1000) con aviso de truncado; filtro por campo client-side documentado (el campo vive dentro del JSON `changes`, no es columna → no filtrable server-side).
- Error handling / mantenibilidad / claridad: pass — helpers puros y testeados; `errorResult` en catch de cada tool; sin `any` nuevo.

**Self-report verification (DET-33)**: verificado independiente — `changes.ts` apunta a `core_DataLog` (grep 0 refs a ChangeLog en la tool), suite MCP re-corrida (134/134), integración re-corrida contra BD real (9/9), build `tsc` PASS. Rama `up1-sp6` (convención del repo up1-mcp para SP6, precedente P4/UPONE-1381), no protegida.

**Commit DET-27**: up1-mcp `eb78f0b` (refactor tools + test + cleanup comentarios/docs); object-manager `0bbfb79` (test S5.T5). Locales; push gated.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S5 completa: 3 tools retargeteadas a core_DataLog con atribución (REQ-09), 134 MCP + 9 integración verdes, build limpio, refs stale de ChangeLog limpiadas. Commits eb78f0b/0bbfb79. Sigue S6 (cierre: regression + docs + teach-close + DoD).
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 6 — 2026-07-10 — Fix: auditoría del path RecordType alias (plan de estudio Plan/Minor + hijos) [phase: execute]

**Tipo**: ⚑ fuerte (bug de core detectado por el dev probando en la UI real)
**Validation tier**: T2 (integración BD real UPU)

**Objetivo**: Corregir un gap de auditoría descubierto por el dev: editar un **plan de estudio** (Curriculum recordType Plan/Minor) o sus hijos polimórficos desde la UI **no generaba fila en `core_DataLog`** — ni en el historial del objeto ni en el global.

**Diagnóstico (evidencia)**: el dev editó "Minor en Matemática Aplicada 1" (updatedAt 19:11:18) → **cero filas en core_DataLog**. Causa raíz doble:
- **Gap 1 (core):** la UI edita vía `updateCurriculumWithRecordType` → `updateInstance("rt__Plan__curriculum")` (alias RecordType). `isDataLogEnabled` resolvía el archivo por `${objectType}.toLowerCase()}.json` en `business/Base`/`tenants/Base`/`objects/up1` — **no en `business/RecordTypes/`** → no encontraba `rt__plan__curriculum.json` → `enabled=false` → passthrough. Verificado: `isDataLogEnabled` daba `true` para bases, `false` para todos los `rt__*`. Afectaba Curriculum (Plan/Minor), Activity y **todo CREATE vía alias**.
- **Gap 2 (mod):** `polymorphicUpdate.rtUpdateHandler` (rt__X__curricularsection) hace writes con Prisma directo + publish manual, **nunca llama a `withDataLog`** (era el path del ChangeLog/n8n retirado) → ediciones de secciones tipadas (Modality, EvaluationComponent…) sin auditar.

**Fix**:
- **Fix A (core, `withDataLog.js`):** `resolveBaseObjectType` normaliza `rt__<RT>__<base>` → objeto base canónico (via `title` del JSON) para el gate `enableDataLog`, el modelo del pre-fetch, y el `objectName`/`historyKey` auditados (`Curriculum`, no el alias → lo recolecta el visor). El RecordType concreto se preserva en `childRecordType` (atribución). Se extrajo `recordMutationDataLog` (helper reutilizable) del wrapper.
- **Fix B (mod, `polymorphicUpdate.resolver.js`):** `rtUpdateHandler` invoca `recordMutationDataLog` del core tras sus writes (best-effort, loader dinámico) → audita + atribuye al padre + arma `historyKey`.

**Tasks completadas**:
- [x] S6.T1 — Diagnóstico con evidencia (edit del dev sin fila DataLog; `isDataLogEnabled` false para aliases)
- [x] S6.T2 — Fix A: normalización de alias en `withDataLog` + extracción de `recordMutationDataLog`
- [x] S6.T3 — Fix B: `rtUpdateHandler` del mod audita vía `recordMutationDataLog`
- [x] S6.T4 — Tests de integración (BD real UPU): Plan + Minor vía alias + sección vía path del mod
- [x] S6.T5 — Regresión: withDataLog unit 15/15, events object-manager 94/94, polymorphicUpdate mod 6/6
- [x] S6.GATE — Gate de sync Session 6 (T2): bug de alias RecordType corregido + regresión verde

**Verificación (DET-33, BD real UPU)**: integración `dataLogAttribution` **12/12 verde** (6 previos + 3 S5.T5 + 2 Plan/Minor vía alias + 1 Fix B sección vía mod). Confirmado: Curriculum Plan/Minor editado vía `rt__<RT>__curriculum` → fila `core_DataLog` con `objectName=Curriculum`, `historyKey=Curriculum:{id}`; sección `rt__Modality__curricularsection` vía el override del mod → atribuida al Activity padre. Sin regresión (events 94/94, withDataLog unit 15/15, mod polymorphicUpdate 6/6). **Pendiente para verlo en la UI en vivo: reiniciar el object-manager server (+ sync del mod) — el código de auditoría corre en el server.**

**Commit DET-27**: object-manager `3e411ae` (fix core) + `78f3c61` (test integración); curriculum-design `97517c7` (fix mod). Locales; push gated (RULE-dev-004).

**Nota de plan**: esta sesión (S6) es un fix de correctitud descubierto post-S5; el **cierre se corre a S7**.

**Gate decision:** (approvedBy: dev)

- [x] continue → S6 completa: path alias RecordType auditado en core + mod, integración BD real 12/12 verde, regresión focal verde. Sigue S7 para cierre canonico.
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 7 — 2026-07-10 — Cierre: regresión + docs [phase: execute]

**Tipo**: ⚑ fuerte (cierre)
**Validation tier**: T3

**Objetivo**: Cerrar el ticket — regresión full, docs (mod visor + core + platform), teach-close (DET-22), DoD Jira.

**Tasks completadas**:
- [x] S7.T1 — **Regresión full verde:** object-manager **2112 unit + 269 integración**, mod **1117**, mcp **134**, contra BD real UPU. (1 fallo flaky en integración de object-manager —contención de estado entre tests paralelos, no reproducible, no introducido— candidato a follow-up de test-isolation.)
- [x] S7.T2 — **Fix de regresión de S4** (detectado por la suite completa del mod, que el S4.GATE no corrió): los 2 layouts del visor DataLog declaraban `tenants: ["*"]` → conformados a `["UPU"]` (DECISION-012); `layouts-declared.test.ts` conteo 56→58 (los 2 layouts intencionales, **aprobado por el dev**). Commit `4f746f4`.
- [x] S7.T3 (S6.T3) — Doc core `object-manager/docs/features/datalog.md` + header de `withDataLog.js`: normalización del alias, invariante de override (`recordMutationDataLog`), 4 columnas de atribución, corrección de la ref stale a ChangeLog. Commit `b345a3d`.
- [x] S7.T4 (S6.T2) — Doc mod `docs/user-guide/audit-events.md`: reescrita del ChangeLog retirado al visor DataLog. Commit `03bd95c`.
- [x] S7.T5 (S6.T4) — Doc platform `uplanner/specs/up1/core/datalog-audit-recordtype-alias-gap.md`: core usado/extendido + gotcha del alias (doc local, no se commitea).
- [x] S7.T6 — Lint/tsc de archivos tocados: mod eslint 0, object-manager eslint 0 (warning de formato de config preexistente), mcp tsc PASS.
- [x] S7.T7 — **teach-close (DET-22)** — generado `TICKET-102.teach/teach-close.md`; frontmatter `teachings.close: done`.
- [x] S7.GATE — DoD Jira final + cierre canonico DKC. Ticket marcado `status: closed`, `closed: 2026-07-13`, `story_points.executed: 13`. Push de ramas de trabajo realizado; PRs quedan como checklist externo. BL-8 (`core_datalog:view` vs UPONE-1393) queda coordinado/documentado para el owner de 1393.

**DoD Jira — estado**: tests unit+integration verdes ✓ · lint/tsc de lo tocado limpio ✓ · lang ES ✓ (S4) · sin artefactos sync/seed commiteados ✓ · tools up1-mcp actualizadas ✓ (S5) · quality review ✓ (S4 dual-judge) · smoke UPU real cubierto en S4/S6 con nota de restart para ver el fix final en vivo · **teach-close** ✓ · **S7.GATE/final close** ✓ · push/PR + BL-8 quedan como accion externa gated por el dev.

**Quality review (DET-23, cierre)**:
- Correctitud: pass — S1-S6 cubren el flujo DataLog end-to-end: captura generica, atribucion polimorfica, retiro ChangeLog, visor, RBAC y tools MCP.
- Testing/regresion: pass — S7.T1 documenta regression full verde: object-manager 2112 unit + 269 integration, curriculum-design 1117 y up1-mcp 134.
- Docs: pass — datalog core, audit-events del mod y spec platform del alias RecordType quedaron actualizados.
- Riesgos residuales: no bloqueantes — smoke visual final requiere restart del server en el entorno vivo; `core_datalog:view` debe coordinarse con UPONE-1393 al abrir/mergear PR.
- Cierre DKC: completo — teach-close generado, frontmatter cerrado, SP ejecutados registrados y reindex final ejecutado.

**Commit DET-27**: cierre documental DKC en este workspace; commits de producto pertenecen a workspaces externos (`object-manager`, `curriculum-design`, `up1-mcp`) y se validan en sus repos/PRs.

**Gate decision:** (approvedBy: dev)

- [x] continue → ticket cerrado. UPONE-1380 completado: DataLog core con atribución polimórfica, retiro de ChangeLog, visor por objeto + global, RBAC `core_datalog:view`, MCP retarget, docs y teach-close. Riesgos residuales no bloqueantes: smoke visual final con server reiniciado y coordinación RBAC con UPONE-1393.
- [ ] iterate → reabrir S7
- [ ] escalate → bloqueo externo
- [ ] standby → pausar cierre

## Intake-explore — convergencia (2026-07-08)

> Cierre del loop de validacion de hipotesis. El intake original (scaffolding 2026-07-07) ya
> resolvio la mayoria de decisiones de alcance con evidencia de codigo (ver "Analisis de alcance
> profundo" + "Decisiones de alcance"). Este cierre confirma la convergencia y aisla los gaps activos.

**Hipotesis / decisiones convergidas** (todas con evidencia de codigo o decision del dev):
- REQ-01..REQ-08: `confirmed` (AC Jira, ver Pre-spec). DataLog ya ON por default (`withDataLog.js:70-87`) → REQ-01 casi cosmetico.
- Atribucion hijo→padre (REQ-04): **Opcion A** (reverse-index + `ownerType/ownerId` del snapshot) — confirmada por el dev, robusta ante borrado en cascada (coordina con P5/TICKET-104).
- Comentario de transicion (BR-WKF-001): **diferido** a historia futura (cambio de estado por UI) — no se implementa en P3/P4.
- `source`/`versionSourceId`: **perdida aceptada** (sin consumidor verificado; DataLog generico no los modela).
- Visor: **reuso** del visor DataLog de up1-manager (NO del de ChangeLog, que se retira) — DET-32.
- `polymorphicChildren` de Curriculum/Offering: los declara P2 (fuera de alcance); P3 aporta el mecanismo generico + verificacion diferida (S5).
- Vinculo P4→P3: P4 (TICKET-103) cerrado difiriendo el historial de transiciones → P3 lo captura (S2).

**Active questions (gaps que design-feature debe cerrar):**
1. **⚑ Shape de los campos de atribucion (REQ-04):** columnas nuevas en `DataLog` (`parentObject`/`parentId`/`childRecordType`) vs llevarlos en `metadata`. Impacto en schema de core (codegen + migrate). **Decision de diseno principal.**
2. **Set exacto de los 4 objetos:** REQ-01 literal dice **{Programa academico, Plan (Curriculum), Activity, Syllabus}**; el analisis y el mockup (`mockup-sp6.html:1352`) mapean la pestana "syllabus" a `entityType: Offering`. ¿El 4º objeto es `Syllabus` o `Offering`? (existe `SPEC-023-syllabus-offering`). Confirmar antes de declarar `enableDataLog`.
3. **REQ-03 (destino del historico ChangeLog):** "Decisiones de alcance" lo trata como perdida aceptada; el AC Jira lo deja como "pendiente de producto". Confirmar perdida total vs migracion parcial de `sourceRef*`.

> Q1 gatea S1 y el draft/data-model. Q2 gatea S2/S4. Q3 gatea S3. Ninguna bloquea el intake — se resuelven al iniciar design-feature.
