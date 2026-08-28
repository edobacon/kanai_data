---
id: TICKET-103
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1381
module: curriculum-design
autopilot: autonomous
---

# SP6 · P4 — Flujo de trabajo con el motor de transiciones de core

> **P4** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) · Jira **[UPONE-1381](https://u-planner.atlassian.net/browse/UPONE-1381)** · 5 SP · repo `mod` (config) + `core` (motor existente) · `layer: core` (ajusta `version-from-source.js`) · `creates_visual: false`.
> **Pre-spec (fuente de design):** [`sp6/historias-usuario-sp6.md` — P4](../../../../uplanner/specs/up1/sp6/historias-usuario-sp6.md) + `object-manager/docs/enum-transitions.md`.
> **✅ Decisión resuelta + motor VALIDADO COMPLETO en core (reunión QA 2026-07-06, verificado en código).** La historia P4 (07-03) y el `analisis-por-punto.md §4` creían que "core no tiene motor de transiciones" — **refutado**: el motor de enum de core **está completo y probado** (épica AP: **UPONE-1293** declarar `transitions` en el JSON · **UPONE-1294** validación en `updateInstance` · **UPONE-1296** editor visual — **todas finalizadas 2026-07-02**, PR #380 `integration-AP-tickets` + #385 `enums-transitions`). El código decía "no existe" solo porque `develop` local estaba ~28 commits atrás (pull pendiente). El ticket Jira **UPONE-1381** por eso estandariza en el **motor de core enum**, acota a **Curriculum / Offering / Activity** (la historia incluía AcademicProgram) y baja de ~8-13 a **5 SP** — *"solo aplicar esa config"*, no re-crear motor. El request abajo refleja el Jira (DET-3).
> **Nota de alcance (no es riesgo abierto):** migrar Activity del motor **relacional del mod** (config por institución en runtime + historial de transición) al **enum de core** (declarativo, uniforme por tenant) es la dirección **decidida**; documentar en design qué capacidades del motor del mod se retiran conscientemente (REQ-03 "sin regresión de estados").

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** `depends_on: []` a nivel DKC, pero el ticket declara una **dependencia externa ya satisfecha**: el motor de transiciones de core (épica AP: UPONE-1293 declaración, UPONE-1294 validación en `updateInstance`, UPONE-1296 editor) ya está en object-manager. **Advertencia (historia P4):** el FE del motor de core (AP-03/AP-04: `useEnumTransitions.ts`, `BulkTransitionPreview.vue`) vive en el repo `layout`, y a la fecha del análisis estaba ~17 commits atrás de `origin/develop` y ausente del checkout local → **actualizar `layout`** si se necesita ese FE.

## Request

> *(literal de UPONE-1381 — DET-3: no reescribir)*

Como **configurador**, quiero que Curriculum, Offering y Activity usen el motor de transiciones de core (config `transitions`) en vez del workflow del mod, y que el versionado siga funcionando tras deprecarlo, para tener un flujo de estados estándar validado por la plataforma.

## Análisis de alcance (cerrado con el dev · 2026-07-07)

> Criterio (actualizado 2026-07-07 con **datos canónicos del equipo**): P4 aplica el **motor de transiciones de core** a los **3 objetos con flujo de estados** (Curriculum, Activity, Offering); el **gate de versionado** (REQ-04) solo a los 2 que versionan (Curriculum, Activity). Los enum + transitions + capabilities son **datos canónicos entregados por el equipo** (ver "Datos canónicos de estados").

**Objetos DENTRO de P4:**

| Objeto | transitions (flujo) | Gate versionado (REQ-04) | Estados (canónicos) |
|--------|:--:|:--:|---------------------|
| **Curriculum** | ✅ 6 estados | ✅ desde `Approved`/`Active` | Draft/InReview/Approved/Active/Deprecated/Archived |
| **Activity** | ✅ 6 estados — **migrar del workflow del mod + remapear estados** | ✅ desde `Approved`/`Active` | Draft/InReview/Approved/Active/Deprecated/Archived (**canónico; NO** los BOR/EDIT/REV-DEC/PUB/DIS del mod) |
| **Offering** (Syllabus) | ✅ 4 estados — **crear el flujo** | ❌ no versiona (se clona) | Draft/InReview/Active/Archived |

**Objetos FUERA de P4:** **AcademicProgram** (sin estado ni versionado).

**⚠️ Dos reversiones de decisiones previas (por los datos canónicos del equipo, 2026-07-07):**
1. **Offering VUELVE a P4** — para el **flujo de estados** (transiciones), NO para versionado (sigue clonándose, no versiona). Antes estaba fuera. Nota: su `status` actual de engagement (`Active/Inactive/Cancelled`) coexiste/colisiona con el nuevo enum de syllabus (`Draft/InReview/Active/Archived`) — **objeto compartido con uengagement**, acotar el flujo al `recordType=Syllabus` sin romper los `ServiceOffer` de engagement (⚠️ riesgo a validar en design).
2. **Activity se canoniza a los 6 estados de Confluence** (no los del workflow del mod). → la migración ahora **remapea** los estados actuales además de retirar el workflow: `BOR→Draft`, `EDIT/REV-DEC→InReview`, `PUB→Active`, `DIS→Deprecated`/`Archived` (**mapeo a confirmar en design**), + `Approved` es nuevo. Activity y Curriculum comparten el mismo set canónico de 6.

### Datos canónicos de estados (entregados por el equipo, 2026-07-07)

> Fuente de verdad para el spec — enum + `static_default` + `transitions` + `requiredCapabilities` por objeto. Van en `properties.status` del JSON de cada objeto (formato del motor de enum de core; labels por i18n).

**1 · Curriculum (Plan de estudio):**
```json
"status": {
  "type": "string",
  "enum": ["Draft", "InReview", "Approved", "Active", "Deprecated", "Archived"],
  "static_default": "Draft",
  "transitions": [
    { "from": "Draft",      "to": "InReview" },
    { "from": "InReview",   "to": "Approved",   "requiredCapabilities": ["curriculum:approve"] },
    { "from": "InReview",   "to": "Draft" },
    { "from": "Approved",   "to": "Active",     "requiredCapabilities": ["curriculum:publish"] },
    { "from": "Approved",   "to": "Draft" },
    { "from": "Active",     "to": "Deprecated", "requiredCapabilities": ["curriculum:deprecate"] },
    { "from": "Active",     "to": "Draft" },
    { "from": "Deprecated", "to": "Archived",   "requiredCapabilities": ["curriculum:archive"] }
  ]
}
```

**2 · Activity (Curso):**
```json
"status": {
  "type": "string",
  "enum": ["Draft", "InReview", "Approved", "Active", "Deprecated", "Archived"],
  "static_default": "Draft",
  "transitions": [
    { "from": "Draft",      "to": "InReview" },
    { "from": "InReview",   "to": "Approved",   "requiredCapabilities": ["activity:approve"] },
    { "from": "InReview",   "to": "Draft" },
    { "from": "Approved",   "to": "Active",     "requiredCapabilities": ["activity:publish"] },
    { "from": "Approved",   "to": "Draft" },
    { "from": "Active",     "to": "Deprecated", "requiredCapabilities": ["activity:deprecate"] },
    { "from": "Active",     "to": "Draft" },
    { "from": "Deprecated", "to": "Archived",   "requiredCapabilities": ["activity:archive"] }
  ]
}
```

**3 · Offering (Syllabus):** *(4 estados — sin Approved/Deprecated; permite `Draft→Active` directo; no versiona)*
```json
"status": {
  "type": "string",
  "enum": ["Draft", "InReview", "Active", "Archived"],
  "static_default": "Draft",
  "transitions": [
    { "from": "Draft",    "to": "InReview" },
    { "from": "InReview", "to": "Active",   "requiredCapabilities": ["offering:publish"] },
    { "from": "InReview", "to": "Draft" },
    { "from": "Draft",    "to": "Active",   "requiredCapabilities": ["offering:publish"] },
    { "from": "Active",   "to": "Archived", "requiredCapabilities": ["offering:archive"] }
  ]
}
```

**Gate de versionado (REQ-04, Vía B):** `versionableFromStates: ["Approved", "Active"]` en el bloque `versioning` de **Curriculum y Activity** (Offering no versiona → sin gate). La nueva versión nace en `Draft`.

### Modelo de estados de Curriculum en P4 (alineado a Confluence CAP-CUR-009 + Reglas Transversales)

**Estados (enum, aditivo — keys existentes se conservan, +3 nuevas):**
`Draft`(Borrador) → `InReview`(Revisión, nuevo) → `Approved`(Aprobado, nuevo) → `Active`(Vigente) → `Deprecated`(Deprecado, nuevo) → `Archived`(Archivado). Labels por i18n. Datos actuales (Draft/Active/Archived) se preservan; sin reescritura.

**Estado inicial:** `Draft` (Borrador) — CAP-CUR-002 (versión nace Borrador), BR-VER-002 (clon nace Borrador).

**Gate de versionado:** versionar permitido desde **`Approved` o `Active`** (decisión dev; coherente con CAP-CUR-010 "publicar desde Aprobado o Vigente" + precedente Activity=PUB). La nueva versión nace en `Draft`, encadenada (BR-VER-001).

**Transiciones (grafo propuesto — afinar aristas/roles en design):** Draft→InReview · InReview→Approved · InReview→Draft (devolver) · Approved→Active (publicar, CAP-CUR-010) · Approved→Draft · Active→Deprecated · Active→Draft (revertir) · Deprecated→Archived. Roles por transición (Coordinador/Director/Comité, CAP-CUR-009) vía `requiredCapabilities` (BR-WKF-002).

**Reglas BR-WKF que P4 SÍ cubre (nativas del motor de core):**
- BR-WKF-001 — auditoría inmutable por transición → eventos `onTransition`.
- BR-WKF-002 — rol requerido por transición → `requiredCapabilities`.

**Reglas BR-WKF diferidas (conditions cross-app, follow-up):**
- BR-WKF-003 — no ir a Deprecado/Archivado con **estudiantes matriculados activos** (dato de engagement).
- BR-WKF-004 — no ir a Vigente sin **perfil de egreso** ≥Aprobado (dato de Curriculum Mapping).

**Follow-ups a coordinar con PM (NO en P4):**
1. Conditions cross-app BR-WKF-003 (matriculados activos, engagement) y BR-WKF-004 (perfil de egreso, Curriculum Mapping) — cuando curriculum-design tenga acceso a esos datos.
2. **Versionado** del syllabus/Offering — solo el **flujo de estados** de Offering entra en P4 (datos canónicos); el versionado queda fuera (hoy se clona, no versiona).

### Gate de versionado (`allowsVersioning`) — análisis REQ-04 (2026-07-07)

**Dónde vive hoy:** `WorkflowStatus.allowsVersioning` (seed del mod; `true` solo en PUB para Activity), leído por `version-from-source.js:77` como `source.currentstatus.allowsVersioning` — **solo cuando `needsWorkflow=true`** (objeto declara `initialStateField` → FK a workflow del mod).

**Qué pasa al migrar al motor de core (verificado en código):**
- El **motor de enum de core NO tiene** el concepto `allowsVersioning` — es sobre transiciones (`from`/`to`/`conditions`/`requiredCapabilities`/`onTransition`), no metadata por-estado. El gate de versionado es **ortogonal** al motor de transiciones.
- Al quitar el workflow del mod, desaparece la relación `currentstatus`/`workflow` → `version-from-source` cae a la rama estado-simple (`needsWorkflow=false`) → **el gate se pierde** (versiona desde cualquier estado). Lo confirma `version-from-source.js:75-79`.

**Cómo re-incorporarlo — 3 vías:**

| Vía | Dónde | Cómo | Trade-off |
|-----|-------|------|-----------|
| **B — config del versionado (recomendada, core)** | `versioning` block del JSON + `version-from-source.js` | Declarar `versionableFromStates: [Approved, Active]` (+ `stateField`) en el bloque `versioning`; generalizar `version-from-source` para gatear objetos estado-simple: `source[stateField] ∈ versionableFromStates` → si no, `SOURCE_NOT_VERSIONABLE`. **Es lo que REQ-04 pide** ("gate declarado en la config del versionado, no en el workflow"). Genérico para cualquier objeto. | Toca core (`version-from-source` + registry del versioningConfig) → equipo core / RULE-dev-004. P4 **ya es core** (execute_scope incluye version-from-source) → dentro de alcance. |
| **C — guard en el mod (viable, sin tocar core)** | override singleton `sectionValidation.resolver.js` (createInstance del mod) | En la rama `asNewVersion` de Curriculum/Activity, leer el source y validar su estado contra una lista permitida antes de delegar al createInstance de core. | Viable pero **bespoke y frágil**: CONSTRAINT H7 (un solo override de createInstance por mod, ya tomado → extenderlo), query extra del source, no reutilizable por otros mods. Precedente: guards del mod (requirementActivityGuard, categoryGuard) ya se inyectan así. |
| A — motor de enum de core | enum-transition-guard | ❌ **descartada**: el motor de transiciones no es el lugar del gate de versionado (concepto distinto). |

**✅ Decisión (dev 2026-07-07): Vía B.** El gate de versionado se declara en la **config del versionado** del objeto — `versionableFromStates` (+ `stateField`) en el bloque `versioning` del JSON — y `version-from-source.js` se **generaliza** para gatear objetos estado-simple: `source[stateField] ∈ versionableFromStates` → si no, `SOURCE_NOT_VERSIONABLE`. Es REQ-04 literal, genérico para plataforma. Es trabajo de core dentro del alcance de P4 (`version-from-source.js` ya está en execute_scope); validar el cambio genérico con el equipo core en el flujo (RULE-dev-004). Vía C (guard en el mod) descartada por bespoke/H7. Valores: **Curriculum `[Approved, Active]`**; **Activity**: mapear desde `allowsVersioning` del workflow (hoy solo `PUB`).

### Activity — pérdida al migrar al enum de core (documentada, REQ-03 · 2026-07-07)

El workflow del mod (`workflow`/`workflowStatus`/`workflowTransition`/`workflowTransitionHistory`) es relacional y configurable; el enum de core es declarativo (build-time) y uniforme. Verificado en los objetos del mod. Se pierde:

| # | Qué se pierde | Origen (campo del mod) | ¿Mitigable? |
|---|---------------|------------------------|-------------|
| 1 | **Config por institución** — Univalle=`activity-standard`, AIEP=`activity-fast` (flujos distintos) | `workflowStatus.institutionId` + `workflow.scopeType` multi | ❌ dura — el enum de core es uniforme por tenant. Todas las instituciones quedan con un único flujo |
| 2 | **Comentario/justificación por transición** | `workflowTransition.requiresComment` + `workflowTransitionHistory.comment` | ⚠️ el motor de enum NO lo captura (verificado). Recuperable solo con trabajo extra (campo + hook onTransition) o vía DataLog/P3 |
| 3 | **Historial de transición relacional** (quién/cuándo/de-a/comentario, consultable) | objeto `workflowTransitionHistory` (userId, transitionId, comment) | ⚠️ parcial — `onTransition` → DataLog (P3, aún no hecho); sin `comment` ni `transitionId` nativos |
| 4 | **`category` de estado** (ToDo/InReview/Published/Closed) — la usa `ActivityStatusBadge` para el color | `workflowStatus.category` | ⚠️ re-implementar el color por estado en el badge (mapa/metadata), no viene del enum |
| 5 | **Configurabilidad en runtime** — agregar/editar estados y transiciones sin re-deploy | registros `workflowStatus`/`workflowTransition` en BD | ❌ dura — el enum se declara en el JSON (build-time); cambios requieren codegen/deploy |

**NO se pierde** (cubierto por el motor de core): validación de transiciones válidas (`enforceEnumTransitions`), roles por transición (`requiredCapabilities` ≈ BR-WKF-002), eventos `onTransition`, y el versionado (preservado vía Vía B). El coordinador atómico `transitionActivityValidated` se reemplaza por `updateInstance` genérico (cambio de implementación, no pérdida funcional).

**Decisiones (dev 2026-07-07):**
- **1 (config por institución) — ✅ ACEPTADA.** Se uniforma el flujo por tenant; se pierde la diferenciación Univalle/AIEP.
- **5 (config en runtime) — ✅ ACEPTADA** (implícita en 1; el enum es build-time).
- **3 (historial de transiciones) — ✅ ACEPTADA, diferida a P3 / [TICKET-102](TICKET-102.md):** se acepta perder el `workflowTransitionHistory` relacional actual, **con la condición de que P3 (DataLog) capture las transiciones de estado** (`onTransition`) más adelante en el sprint. **Vínculo P4→P3** (registrado en TICKET-102).
- **2 (comentario/justificación de la transición) — ⚠️ PENDIENTE:** DataLog genérico NO captura el `comment` libre (solo quién/cuándo/old→new). Si BR-WKF-001 exige preservar la justificación, P3 debe extenderse para capturarla; si no, se acepta perderla. A decidir.
- **4 (color por `category`) — ⚠️ PENDIENTE (FE menor):** re-implementar el color de `ActivityStatusBadge` sin `workflowStatus.category` (mapa estado→color o metadata). A resolver en design.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | config (declarar `transitions` en 3 objetos del mod) + core (reubicar gate de versionado en `version-from-source.js`) + migrar Activity del workflow del mod al enum de core + retiro seed workflow del mod |
| Modulo principal | curriculum-design (mod) + object-manager (core) |
| Modulos afectados | object-manager (core: `enforceEnumTransitions`, `version-from-source.js`, codegen `core_FieldDefinition.properties.transitions`); curriculum-design (config transitions + retiro seed workflow); MCP: `cd_transition_program`, `cd_list_transitions`, `cd_version_*`, `cd_get_version_chain` |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Config + motor. El FE del motor de core (BulkTransitionPreview) ya existe en `layout`; este ticket no crea UI nueva (validar si requiere actualizar `layout`). |
| Data model | no | Declara `transitions` en JSON (persiste en `core_FieldDefinition.properties`); no crea objeto ni campo nuevo. |

## Contexto (de Jira / historia P4)

El motor de transiciones **ya existe en core** (épica AP). Se declara `transitions` (`from`/`to`, `conditions` opcionales) en el JSON; el codegen lo persiste en `core_FieldDefinition.properties.transitions` y `enforceEnumTransitions` (`enum-transition-guard.js`) lo valida en `updateInstance`, con capabilities y eventos `onTransition`. El versionado (`version-from-source.js`) hoy gatea por `WorkflowStatus.allowsVersioning` + `Workflow.initialStatusId` (workflow del mod); el deep-clone al versionar es independiente y se preserva. **Dos motores no confundir** (`enum-transition-guard.js`: *"NO CONFUNDIR con WorkflowTransition"*): el de enum de core (declarativo, uniforme por tenant) vs el del mod (relacional, por institución, con historial) — el que hoy usa Activity.

## Context found (evidencia de código · fuente `sp6/reunion-qa-2026-07-06.md`, `analisis-por-punto.md §4` + anexo versionado)

> Toda ruta:línea CONFIRMADA por lectura de código (post fetch/pull `origin/develop` 2026-07-06) salvo marca INFERIDO.

**Motor de enum de core (el destino — COMPLETO, en `origin/develop`):**
- `object-manager/src/services/validation/enum-transition-guard.js` — guard puro (`enforceEnumTransitions`).
- `enforceEnumTransitions` cableado en `src/graphql/resolvers/instance.resolver.js` — lee `properties.transitions`, evalúa `conditions`, chequea capabilities, emite eventos `onTransition`.
- Codegen: `src/services/codegen/helpers/enum-transitions.js` (persiste a `core_FieldDefinition.properties.transitions`). Editor: `fieldDefinition.resolver.js`. Doc: `object-manager/docs/enum-transitions.md` + tests.
- **⚠️ Verificar checkout local actualizado antes de ejecutar** (el feature entró en PR #380/#385; el `develop` local del análisis estaba ~28 commits atrás).

**Motor del mod a retirar (relacional):**
- Objetos `mods/curriculum-design/objects/{workflow,workflowStatus,workflowTransition,workflowTransitionHistory}.json`. `Workflow.scopeType` es enum **cerrado** (`curriculumPlan|activity|competencyNode|changeRequest|booking`).
- Coordinador: `logic/activity.resolver.js` — `transitionActivityValidated:70` (update atómico + insert en history + publish), `updateActivityValidated:283` (rechaza cambios directos a `currentStatusId`).
- FKs: `objects/activity.json:125-142` (`workflowId`, `currentStatusId` readOnly). `AcademicProgram.json:9` y `Curriculum.json:85` declaran explícitamente que **NO** usan workflow (enum plano; Curriculum marca `NEEDS CLARIFICATION`).
- FE: `modsComponents/ActivityStatusBadge/` (badge Vueform custom). Seed a eliminar: `seed/_data-workflow-objects.js` (414 líneas, siembra 9 statuses / 5 workflows / 21 transiciones) + `_data-workflow-activate.js`.

**Gate de versionado a reubicar (REQ-04):**
- `object-manager/src/graphql/resolvers/helpers/version-from-source.js` — `prepareVersionData` resuelve el estado inicial al versionar; hoy gatea por `WorkflowStatus.allowsVersioning` + `Workflow.initialStatusId`. Al quitar el workflow del mod cae a la rama `static_default` y **pierde el gate** → reubicar a config del versionado (JSON). El deep-clone (`deepClonePolymorphicChildren`) NO se toca (REQ-05).
- Confirmación de reunión (00:18:44): *"Core ya hace cooperar el estado con el versionado. Lo que falta es el motor de transiciones, no el estado en sí"* — y ese motor **ya está** (corrección fila 2 de la verificación).
- Contexto del versionado (anexo `analisis-por-punto.md`): `SPEC-core-implement-version-without-workflow`/TICKET-074 (cerrado 2026-06-18) hizo el workflow **opcional** en el versionado (`prepareVersionData` gatea por `!!initialStateField`); Curriculum ya versiona sin workflow.

## Herencia de SP5 / épicas previas — qué prepara el gate de versionado (REQ-04)

> Verificado 2026-07-07. El punto sensible de P4 (reubicar el gate de versionado al quitar el workflow del mod) ya tiene la costura preparada por trabajo previo.

- **[TICKET-074](TICKET-074.md) / `SPEC-core-implement-version-without-workflow`** (core, closed 2026-06-18, épica UPONE-1270): generalizó `prepareVersionData` (`version-from-source.js`) a **workflow-opcional** — gatea toda la lógica de workflow por `needsWorkflow = !!initialStateField` del `versioningConfig`. Cuando no hay workflow: omite el `include` de `currentstatus`/`workflow`, omite las validaciones `SOURCE_NOT_VERSIONABLE`/`WORKFLOW_HAS_NO_INITIAL_STATUS`, y el estado inicial de la v2 lo resuelve el `static_default` del enum (`Draft`). **Implicación directa para P4:** al retirar el `WorkflowStatus` del mod, `version-from-source` cae por diseño a esta rama sin workflow y **pierde el gate `allowsVersioning`/estado inicial** → REQ-04 debe reubicar ese gate a la config del versionado (JSON), no re-derivarlo del workflow. Curriculum ya versiona por esta rama (precedente vivo).
- **MC-01 / [TICKET-081](TICKET-081.md) / `plan-progression-iscurrent`** (closed): Curriculum modela su estado como **enum simple** (`Draft/Active/Archived`) + flag `isCurrent` + enum `progression` — el objeto que P4 migra al motor de enum de core ya tiene el estado como enum (no workflow), consistente con el camino elegido.
- **Diferidos SP5 relacionados** (`sp5/SP6-backlog-diferidos.md`): **S7-02** (desbloquear versionado de Curriculum con RecordType, core) y **S7-06** (lógica automática de `isCurrent` al versionar, depende de S7-02) — no son P4 pero comparten el path de versionado; si P4 reubica el gate, coordinar con ese trabajo para no duplicar la config del versionado.
- **Deep-clone preservado (REQ-05):** el `deepClonePolymorphicChildren` que P4 NO debe tocar es el mismo mecanismo que heredan P5 y S7-03 (ver [TICKET-104](TICKET-104.md)).

## Pre-spec (transcrito de UPONE-1381 — criterios de aceptación)

| REQ | Certeza | source_ref | Enunciado (AC Jira) |
|-----|---------|-----------|---------------------|
| REQ-01 · declarar transitions en 3 objetos | confirmed | AC Jira | `transitions` declarado en Curriculum, Offering y Activity; persiste en `core_FieldDefinition.properties.transitions` tras codegen. |
| REQ-02 · validación en updateInstance | confirmed | AC Jira | `updateInstance` rechaza transiciones no declaradas y evalúa condiciones (falla si no se cumple, procede si sí). |
| REQ-03 · migrar Activity al enum de core | confirmed | AC Jira | Activity migrado del workflow del mod al enum de core; su cambio de estado lo valida el motor de core, sin regresión de estados. |
| REQ-04 · gate de versionado reubicado | confirmed | AC Jira | Desde qué estado se versiona + estado inicial declarados en la config del versionado (no en el workflow del mod). Versionar desde estado no permitido falla (`SOURCE_NOT_VERSIONABLE`); la nueva versión nace en el estado inicial declarado. |
| REQ-05 · deep-clone preservado | confirmed | AC Jira | Versionar un objeto con hijos polimórficos sigue deep-clonándolos igual que hoy (preservado). |
| REQ-06 · retiro seed workflow del mod | confirmed | AC Jira | Al deprecarse el workflow del mod, se elimina su seed (`_data-workflow-objects.js`, `_data-workflow-activate.js`). |
| REQ-07 · RBAC por transición | confirmed | AC Jira | Transiciones gateadas por capability por transición (soportado por el motor de core); declarar las capabilities de transición por objeto. |

**Detalle técnico (Jira):** declarar `transitions` en los objetos; migrar Activity; retirar el uso del workflow del mod en Activity. Mover el gate (`allowsVersioning` + `initialStatusId`) a la config del versionado y ajustar `version-from-source.js`. El deep-clone (`deepClonePolymorphicChildren`) no se toca.

**MCP:** `cd_transition_program`, `cd_list_transitions` contra el enum de core; `cd_version_program`, `cd_version_curriculum`, `cd_get_version_chain` con el nuevo gate.

## Decisiones tomadas

**Reunión QA 2026-07-06:**
- **Motor = core enum** (config-driven vía `transitions` en el JSON). El workflow del mod **se quita**; se parte del enum de core y se re-crea el flujo (00:09:56, 00:11:39, 00:22:18+).
- **Motor validado completo** en core (épica AP finalizada 2026-07-02) — no hay que construirlo, solo aplicar la config.

**Análisis de alcance con el dev 2026-07-07** (ver sección "Análisis de alcance"):
- **Alcance (actualizado con datos canónicos):** flujo de estados a **Curriculum + Activity + Offering** (3); gate de versionado solo a **Curriculum + Activity** (2). **AcademicProgram FUERA** (sin estado ni versionado). Offering entra para transiciones, NO versionado.
- **Estados (datos canónicos del equipo, 2026-07-07 — ver "Datos canónicos de estados"):**
  - **Curriculum + Activity**: mismo set de **6 estados** (Draft/InReview/Approved/Active/Deprecated/Archived), estado inicial Draft, versionado desde Approved/Active.
  - **Activity**: además de retirar el workflow del mod, **remapea** sus estados actuales (BOR/EDIT/REV-DEC/PUB/DIS → los 6 canónicos) — migración de datos. Documentar la pérdida de config por institución (Univalle/AIEP) + historial relacional (auditoría → DataLog/P3).
  - **Offering (Syllabus)**: **4 estados** (Draft/InReview/Active/Archived), flujo nuevo, **sin versionado**. Objeto compartido con engagement → acotar al recordType Syllabus.
- **Follow-ups a PM (fuera de P4):** (1) conditions cross-app (BR-WKF-003 matriculados / BR-WKF-004 perfil egreso); (2) **versionado del syllabus/Offering** (hoy se clona, no versiona — solo el flujo de estados entra en P4).

## Falta definir (cerrar en el spec) — ✅ TODO RESUELTO en intake-explore (2026-07-07)

- ~~Ubicación del gate de versionado~~ → ✅ **RESUELTO (Vía B):** `versionableFromStates` en el bloque `versioning` del JSON, leído por `version-from-source.js` generalizado. Curriculum `[Approved, Active]`; Activity mapea desde `allowsVersioning` (hoy PUB). Ver "Gate de versionado — análisis REQ-04".
- ~~Afinar aristas y roles por transición~~ → ✅ **RESUELTO:** grafos canónicos fijados (ver "Datos canónicos"); remap de Activity cerrado (tabla abajo); capabilities `object:action` desnudo.
- ~~Capacidades del motor del mod que se retiran~~ → ✅ **RESUELTO:** documentadas en "Activity — pérdida al migrar" (aceptadas 2026-07-07).

## Decisiones de diseño (intake-explore, 2026-07-07 — verificadas en código)

> Cierran los forks que el ticket difería a design. Evidencia: `enum-transitions.md`, `enum-transition-guard.js:135/3961/4146`, `version-from-source.js:47-113`, objetos del mod.

### D1 · Offering — campo propio `lifecycleStatus` (NO reusar `status`)

**Hallazgo bloqueante:** el campo `status` de Offering (`[Active, Inactive, Cancelled]`, `not_null`, `required`, default `Active`) lo **posee uengagement** (`mods/uengagement-up1/objects/Offering.json:74`), está **fuera del scope de SP6** (read-only) y el Merge Sync **rechaza** que curriculum-design le agregue `transitions` a un campo ajeno (`core field protected`, `enum-transitions.md`). Además `createSyllabusOffering` ya setea `status:'Active'` en cada sílabo hoy ([syllabus-offering.resolver.js:132](../../../../uplanner/up1/mods/curriculum-design/logic/syllabus-offering.resolver.js)).

**Decisión (dev):** curriculum-design aporta un campo enum **nuevo `lifecycleStatus`** (`Draft/InReview/Active/Archived`, `static_default: Draft`) con `transitions`, **scoped a `recordType=Syllabus`**. Modela un eje distinto (ciclo de autoría del sílabo) del `status` de engagement (disponibilidad). El `status` de uengagement queda **intacto** (cero impacto en ServiceOffer). Ownership limpio: el mod declara transitions en su propio campo → el sync lo acepta.

### D2 · Activity — remap de estados (workflow relacional → enum canónico)

**Decisión (dev):** DIS → **Archived** (categoría `Closed`=terminal). Mapa completo verificado contra el seed real (`_data-workflow-objects.js`):

| Estado mod (code · categoría) | → Estado canónico |
|---|---|
| BOR (Borrador · ToDo) | **Draft** |
| EDIT (Editando · InExecution) | **InReview** |
| REV-DEC (En revisión decanato · InReview) | **InReview** |
| PUB (Publicado · Published) | **Active** |
| DIS (Descontinuado · Closed) | **Archived** |

`Approved` no existe en el workflow del mod (PUB publica directo) → estado nuevo, sin datos previos que remapear. `activity-fast` (BOR→PUB→DIS) mapea igual.

### D3 · Capabilities de transición — `object:action` desnudo

**Decisión:** declarar las nuevas capabilities en `capabilities.json` como `object:action` desnudo (consistente con las existentes `activity:version`, `curriculum:version`, `activity:modify` y con los datos canónicos del equipo): `curriculum:{approve,publish,deprecate,archive}`, `activity:{approve,publish,deprecate,archive}`, `offering:{publish,archive}`. Verificar en execute que `checkCapability` acepta el formato desnudo. Las pre-existentes `mod/curriculum-design:{approve,publish}` quedan como legacy (no se tocan en P4).

### D4 · REQ-06 — alcance del retiro del workflow (propagación DET-16)

**Hallazgo:** solo **Activity** consume el workflow relacional (`currentStatusId` FK). No existen objetos CompetencyNode/ChangeRequest; los workflows `curriculumPlan-standard`/`competencyNode-standard`/`changeRequest-standard` del seed están **huérfanos** (sin objeto consumidor). Tras migrar Activity, el subsistema entero es **dead code**: objetos (`workflow`, `workflowStatus`, `workflowTransition`, `workflowTransitionHistory`), seeds (`_data-workflow-*.js`), resolvers (`workflowTransition.resolver.js`, `workflowTransitionHistory.resolver.js`, coordinador `transitionActivityValidated`), y refs en `auditCapture.resolver.js`/`activity-formtemplate.resolver.js`/`errors.js`.

**Decisión:** retirar seed + resolvers + uso en Activity (REQ-06). **Eliminar los objetos JSON del workflow es una migración destructiva** (drop de 4 tablas) → requiere consent del dev al momento del migrate (super autopilot: data-loss pide confirmación). Se ejecuta en la session de retiro.

**Testing (Jira):** integration: transición válida/inválida y con condición por objeto; migración de Activity sin regresión; gate de versionado desde config (permitido/no, estado inicial); regression del deep-clone al versionar.

**Definition of Done (Jira):** tests (unit + integration) verdes · lint + Prettier + tsc limpios · lang ES completo · sin artefactos de sync/seed commiteados · tools up1-mcp actualizadas · quality review + smoke en UPU.

## Setup

| Campo | Valor |
|-------|-------|
| Branch | **VERIFICADO 2026-07-07:** `object-manager` y `mods/curriculum-design` ya en `feat/UPONE-1381-enum-transitions` (no protegida → DET-30 guarda OK). Es rama por-ticket, no la de épica `UPONE-1267-sp6` que sugiere `core_work_policy` — desviación menor, se registra para el merge. `layout` en `develop` (el FE del motor ya está integrado, no hace falta actualizar salvo el color del badge en el mod). |
| ⛔ Prerrequisito de execute | `object-manager` tiene **drift ajeno a P4** en working tree (report-builder: objetos `report.json`/`reporttemplate.json`/`reporttestdata.json` + salidas codegen en `schema.prisma`×2/`dynamic.js`/`mods.js`/`up1.js`). Como P4 corre codegen, **stash -u con label** al inicio de execute (reversible) para aislar P4. Restaurar report-builder con `git stash pop` después. |
| Dependencia satisfecha | Motor enum de core presente en checkout (`enum-transition-guard.js`, codegen `enum-transitions.js`, `version-from-source.js`, `docs/enum-transitions.md`). |
| Test data | UPU con Activity en estados varios (BOR/EDIT/REV-DEC/PUB/DIS) + Curriculum/Offering(Syllabus) versionables |
| Services | object-manager (enforceEnumTransitions, version-from-source), codegen, sync, migrate por tenant |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Open question resuelta: `checkCapability` acepta capabilities `object:action` desnudo. Evidencia: `RULE-mods-037` ("Object-level RBAC sin prefix mod/") citada en cada capability existente del mod (`activity:version`, `curriculum:version`, etc.). Las nuevas capabilities de transición van desnudas. Las pre-existentes `mod/curriculum-design:{approve,publish}` describen el workflow VIEJO (BOR/EDIT/PUB, transitionActivityValidated) → quedan stale tras P4; legacy, no se tocan (posible cleanup follow-up). | llm-autopilot | S1 | discarded | — |
| L2 | **Blocker S1.T5 (RESUELTO):** el `500` de `object-manager:4000` era falso positivo — GET a `/graphql` sin query; POST responde OK. El postgres de `jormat-evolution` es el PG compartido (`localhost:5432`) que sirve `uplanner_upu`. Entorno up1 estaba listo. Nota: expandir el enum de `status` (type:string) NO requiere migración de DB (validación app-level); solo las transitions persisten vía codegen. | llm-autopilot | S1 | discarded | — |
| L3 | `allowedFromStates`/`initialStateValue` en `validate-versioning.js` son claves DEPRECATED (política de versionado que se movió a `WorkflowStatus.allowsVersioning` en la era workflow). P4 **revierte** esa dirección: al quitar el workflow, la política vuelve a la config vía `versionableFromStates`. Se usó nombre nuevo (spec) en vez de revivir el deprecado; documentada la relación en el docstring del validador. | llm-autopilot | S2 | refined | DEC-047 |
| L4 | **Review adversarial S2 (DET-35) encontró 3 gaps en el código nuevo** (warnings, sin regresión): (1) `stateField` no validaba existencia en `properties` (a diferencia de versionField/linkageField) → typo daría `SOURCE_NOT_VERSIONABLE` incondicional sin señal de codegen; (2) config híbrida `initialStateField`+`versionableFromStates` no avisaba (escenario de migración S5); (3) docstring desactualizado. Los 3 corregidos + 4 tests. Lección: en gates de core, la validación build-time del feature nuevo debe tener el mismo rigor de existencia-de-campo que las claves preexistentes. | llm-autopilot | S2 | discarded | — |
| L5 | **Guard de transiciones es no-op para el campo en recordTypes que no lo usan** (verificado en `enum-transition-guard.js`): `enforceEnumTransitions` hace skip si `newValue===oldValue` (no-change), `oldValue` vacío (asignación inicial null→X) o `newValue` vacío (limpiar). Implicación P4: `Offering.lifecycleStatus` como base field compartido es engagement-safe — los ServiceOffer nunca cambian el campo → el guard jamás dispara para ellos; "scoped a recordType=Syllabus" es semántico (solo los flujos de sílabo lo transicionan), no requiere condición de recordType en las transitions. | llm-autopilot | S4 | refined | DEC-048 |
| L6 | **Drift ajeno a P4 entre el DB UPU y la migration history bloquea `migrate dev`** (S4.T3): `migrate status` reporta "up to date" (DB vs migraciones aplicadas) pero `migrate dev` quiere reset destructivo porque el shadow DB detecta índices en `schema.prisma` (WorkflowTransitionHistory/planEntry/requirementCategory) ausentes de la migration history — aplicados en su día por `db push`, no por migración. Un cambio aditivo legítimo (columna nueva) queda rehén del drift preexistente. Lección: en up1/UPU la history de migraciones y el DB divergen; aplicar cambios aditivos requiere elegir vía (db push aditivo vs reset+reseed) — decisión del dev por el riesgo de data-loss. | llm-autopilot | S4 | refined | RULE-platform-020 |
| L7 | **La migración de Activity al enum de core dropea el I1 publish-weight gate (TICKET-061) si no se re-ubica.** `transitionActivityValidated:176-188` bloquea publicar un Course cuando su árbol de evaluación no suma (`EVALUATION_WEIGHT_MISMATCH`, vía `getInvalidEvaluationNodes`). El motor de enum de core (`enforceEnumTransitions`) solo hace `from/to`+`requiredCapabilities`+`onTransition` — sin hook para reglas de negocio por transición. Reemplazar por `updateInstance` sin reubicar el gate = regresión funcional silenciosa. El spec S5 no lo contemplaba. | llm-autopilot | S5 | refined | BUG-curriculum-design-010 |
| L8 | **`requiresComment` y el audit `StateTransition` no tienen equivalente en el enum engine.** El workflow del mod exige comentario en 3 transiciones y `auditCapture.handleTransition` produce `changeLog action='StateTransition'` con nombres ES + `workflowTransitionHistoryId`. Post-migración cae al `Activity:update` genérico → `action='Update'` con enum crudo, sin comentario ni historyId (ya es el comportamiento aceptado de Curriculum). El ticket marca comment como PENDIENTE (pérdida #2). Confirma que el audit rico de transición se difiere a P3/DataLog. | llm-autopilot | S5 | refined | DEC-049 |
| L9 | **La superficie FE/MCP de Activity supera el desglose del spec:** 4 layouts (`default_Activity_*.json`) con columna/relación `currentstatus`, `activity-status-badge`, `autoAssignFields` y rowAction `currentstatus.allowsVersioning`; `ActivityStatusBadge` colorea por `workflowStatus.category` (mod+layout byte-idénticos); `cd_list_transitions`/`cd_transition_program` + contract del MCP; seeds AIEP/Univalle setean `currentStatusId`. Todo migra en cadena. La condición de versionado en layout (`allowsVersioning` por-fila) no tiene reemplazo directo → `status IN [Approved,Active]` hardcodeado (drift con `versionableFromStates`). | llm-autopilot | S5 | discarded | — |
| L11 | **`updateInstance` de un objeto BASE (Activity) devuelve `data: null` en el GraphQL del MCP** (el record no viene anidado bajo `data`, a diferencia de los rt__). Las tools `cd_transition_program`/`cd_update_program` (S5) dereferenciaban `updated.data.<campo>` ciego → `TypeError: Cannot read properties of null` al armar la respuesta de éxito, **aunque la transición YA persistía**. El smoke de S5 no lo detectó porque re-consultaba la DB en vez de confiar en el retorno de la mutation. Fix (commit `8dc1261`): blindar el armado de respuesta (optional chaining + `toStatus`/patch como fallback). Lección: los tests que re-consultan la DB para verificar dan falsa confianza sobre el shape del retorno; un test en vivo por la tool real (MCP) lo destapó. | llm-autopilot | S7 | refined | BUG-curriculum-design-011 |

## Backlog

| # | Item | Priority | Estado |
|---|------|----------|--------|
| B1 | **ai-agent deriva "required" de `not_null:true`, no del array `required`** → al crear un ServiceOffer vía el AI agent, el flujo genérico `createInstance` (`mods/ai-agent`, `validateDataNode.js` → `mutationHelpers.js:getFieldDefinitionsMap`) marca `lifecycleStatus` (y ya `recordType`) como requerido y pregunta un "Estado del sílabo" sin sentido para engagement. **Patrón preexistente** (no introducido por P4: `recordType` ya lo tiene). Fix correcto: derivar `required` del array `required` del objeto, no de `not_null`. Fuera de scope SP6 (mod ai-agent). Descubierto por dual-judge S4. | could | abierto |
| B2 | **Un layout genérico de engagement podría renderizar `lifecycleStatus` ("Estado del sílabo") en registros ServiceOffer** — campo base del Offering compartido, sin scoping de recordType en UI (solo semántico). Sin impacto backend (guard no-op para ServiceOffer). Revisar si algún layout de engagement expone campos base genéricamente; si aplica, condicionar por `recordType=Syllabus`. Fuera de scope SP6 (uengagement read-only). Descubierto por dual-judge S4. | could | abierto |
| B3 | **Drop destructivo del subsistema workflow — bloqueado por dependencia cross-mod con uengagement.** Alcance restante: (a) que el team uengagement quite `currentStatusId`/`workflowId` de `mods/uengagement-up1/objects/Activity.json` (out of scope SP6 — ver doc `sp6/workflow-retirement-uengagement-coordinacion.md`); (b) drop de los objetos `workflow`/`workflowStatus`/`workflowTransition`/`workflowTransitionHistory` (curriculum-design) + resolvers (`workflow*.resolver.js` + `.schema.graphql`) + `handleTransition` de auditCapture + tests asociados (`workflow-resolvers.test.ts`, ramas transition de `auditCapture-handlers.test.ts`); (c) drop de las columnas FK dead `currentStatusId`/`workflowId` de Activity (D-S5-5); (d) migración destructiva (drop 4 tablas + 2 columnas + back-relations Prisma). **Bloqueo:** el drop de objetos/tablas/FK rompe el schema de uengagement-up1 (referencia los objetos vía FK) → requiere que ese team mueva primero. **YA HECHO (S7, no bloqueado):** eliminados los **seeds** del workflow (`_data-workflow-objects.js` + `_data-workflow-activate.js`) — REQ-06/AC-6 cumplido; las tablas quedan vacías (engagement-safe). S5 retiró lo Activity-específico. Descubierto S6.T0. Coordinar con PM/team uengagement. | must | abierto (solo el drop destructivo; seeds ya removidos S7) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| F1 | S4.T3: aplicar la columna aditiva `Offering.lifecycleStatus` a UPU con `npm run tenant:migrate --tenant UPU` (`prisma migrate dev`) | `migrate dev` exige **reset destructivo (all data lost)** por drift preexistente ajeno a P4 (índices de WorkflowTransitionHistory/planEntry/requirementCategory en schema pero no en la history). Abortó en el prompt (exit 130); DB intacto. Super autopilot no auto-aprueba data-loss | Para un cambio aditivo con drift preexistente, `migrate dev` no sirve sin reset. Alternativa no-destructiva: `prisma db push` (agrega la columna + no-opa los índices existentes, sin data-loss, sin history). Decisión del dev: db push aditivo vs reset+reseed |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razón | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-07-07 | null → super | dev invocó `/dkc 103 super autopilot` | intake-explore |

### Plan de sessions (esqueleto — intake-explore 2026-07-07)

6 sessions previstas. **Esqueleto producido por `intake-explore`.** `design-feature` refina las tasks y gate criteria. Numeración: sin `### Session N` previas → arranca en S1. Riesgo-first: el cambio core de versionado (S2) y la migración de datos de Activity (S5) van con gate ⚑ fuerte.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | **Curriculum**: expandir `status` 3→6, declarar `transitions`, capabilities `curriculum:*`; codegen + sync + migrate UPU; lang ES | 1 | T3 | REQ-01/02/07 (Curriculum) — refina design | ⚑ fuerte | transiciones válidas/ inválidas verificadas en UPU; enum expandido sin regresión de datos Draft/Active/Archived |
| S2 | **Core — `version-from-source.js`**: generalizar `prepareVersionData` para gatear objetos estado-simple vía `versionableFromStates` (REQ-04) | 2 | T3 | REQ-04 (motor) — RULE-dev-004 | ⚑ fuerte | unit + integration: versiona desde Approved/Active OK, desde otro → `SOURCE_NOT_VERSIONABLE`; nueva versión nace en `static_default`; review core |
| S3 | **Curriculum versioning gate**: declarar `versionableFromStates:[Approved,Active]` en bloque `versioning`; regression deep-clone (REQ-05) | 3 | T2 | REQ-04 (config Curriculum), REQ-05 | auto | versionar Curriculum Approved/Active OK; deep-clone de hijos polimórficos intacto |
| S4 | **Offering**: campo nuevo `lifecycleStatus` (4 estados) + `transitions` scoped `recordType=Syllabus`; capabilities `offering:*`; codegen+sync+migrate | 4 | T2 | REQ-01/02/07 (Offering) | auto | flujo del sílabo funciona; `status` de engagement intacto; ServiceOffer sin regresión |
| S5 | **Activity — migración**: reemplazar `currentStatusId` FK por `status` enum (6), remap datos (D2), `transitions`, `versionableFromStates`; reemplazar `transitionActivityValidated`→`updateInstance`; badge color | 5 | T3 | REQ-03, REQ-04 (Activity), REQ-07 | ⚑ fuerte | **migración de datos** BOR/EDIT/REV-DEC/PUB/DIS→canónico sin pérdida; transiciones vía motor core; versionado OK; badge muestra color |
| S6 | **Retiro workflow (REQ-06) + MCP + docs + cierre**: eliminar seeds + resolvers + objetos workflow (migración destructiva, consent); actualizar tools up1-mcp; **docs: guía del modelo de estados en el mod + `enum-transitions.md` de core**; integration full + smoke UPU; doc platform | 6 | T3 | REQ-06 + MCP + docs | ⚑ fuerte | subsistema workflow retirado sin romper Activity/audit; tools MCP contra enum de core; docs actualizadas; suite verde; smoke UPU |

**Notas del esqueleto:**
- **Dependencias:** S3 depende de S2 (gate genérico antes de declararlo en Curriculum). S5 depende de S2 (Activity también usa `versionableFromStates`) y de S1 (patrón establecido). S6 (retiro) depende de S5 (Activity ya no usa el workflow).
- **Destructivo:** S6 dropea 4 tablas (workflow*) → consent explícito al migrate (super autopilot no auto-aprueba data-loss).
- **Core (RULE-dev-004):** S2 toca `object-manager` core → commits con `UPONE-1381`, merge a develop gated por review del team core (el cierre DKC no implica merge).
- Sizing/gates finales los ajusta `design-feature`.

### Session 1 — 2026-07-07 — Curriculum: transitions + estados + capabilities [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T3

**Tasks completadas**:
- [x] S1.T1 — Setup limpio: `git stash -u` del drift report-builder en object-manager (label descriptivo)
- [x] S1.T2 — Expandir `Curriculum.status` enum 3→6 (aditivo) + declarar `transitions` (8 aristas canónicas)
- [x] S1.T3 — Declarar capabilities `curriculum:{approve,publish,deprecate,archive}` en capabilities.json
- [x] S1.T4 — Lang ES para las 3 keys de estado nuevas (InReview/Approved/Deprecated)
- [x] S1.T5 — codegen + sync + migrate UPU; verificar transición válida/inválida en updateInstance
- [x] S1.GATE — Gate de sync Session 1 (tier T3): persistir, quality review, smoke UPU, decidir

**Qué se hizo (flujo):** (1) `git stash -u` del drift report-builder de object-manager → árbol limpio para codegen aislado (reversible, `stash@{0}`). (2) Expandí `Curriculum.status` enum 3→6 (aditivo, conserva Draft/Active/Archived) + declaré las 8 transitions canónicas con `requiredCapabilities`. (3) Agregué 4 capabilities `curriculum:{approve,publish,deprecate,archive}` (formato `object:action` desnudo, RULE-mods-037). (4) Lang ES de las 3 keys nuevas. (5) `npm run sync` (0 errores, mod→core) → `npm run codegen` (exit 0, `✓ Persisted 8 enum transition(s) for Curriculum.status`, `✅ enum transitions validation: 88 JSON, no errors`).

**Evidencia runtime (DET-36, smoke-executed):** query GraphQL a la DB viva UPU (`getObjectFields(name:"Curriculum")`) confirma `enumValues:[Draft,InReview,Approved,Active,Deprecated,Archived]` + 8 transitions persistidas en `core_FieldDefinition` con las capabilities correctas por arista. Flujo JSON→sync→codegen→DB→GraphQL probado end-to-end. Sin `prisma migrate` (status tipo string, enum app-level).

**Quality review (DET-23, T3 — cambio config declarativo):** calidad ✅ (config canónica del equipo) · lint/tipado n/a (JSON) · testing ✅ (validación de codegen + query runtime) · escalabilidad ✅ (motor de core reutilizado) · mantenibilidad ✅ · a11y n/a · i18n ✅ (lang ES) · error-handling ✅ (codegen valida shape). Sin hallazgos bloqueantes.

**Nota de commit (RULE-dev-004/DET-27):** cambios S1 en `curriculum-design` (Curriculum.json, capabilities.json, lang) + salidas de codegen en `object-manager` (schema.prisma×2, typeDefs, objects/business/Base/curriculum.json). Commit local por-sesión con prefijo `UPONE-1381-S1`; push difiere a aprobación humana. El drift report-builder queda apartado en `stash@{0}` (no se commitea con P4).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-07-07 — Core: generalizar el gate de versionado en version-from-source.js [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T3

**Tasks completadas**:
- [x] S2.T1 — Analizar consumidores de `prepareVersionData` (impacto colateral core)
- [x] S2.T2 — Extender el schema `versioning` para aceptar `versionableFromStates` + `stateField` (codegen + registry)
- [x] S2.T3 — Generalizar `prepareVersionData`: rama estado-simple gatea `source[stateField] ∈ versionableFromStates` → `SOURCE_NOT_VERSIONABLE`; nueva versión en `static_default`
- [x] S2.T4 — Regression: objetos que versionan hoy sin gate no regresionan
- [x] S2.GATE — Gate de sync Session 2 (tier T3): cambio de core, quality review + dual-judge; commit UPONE-1381 (merge gated por team core)

**Qué se hizo (flujo):** (1) Análisis de impacto (Explore): `prepareVersionData` tiene 1 solo consumidor (`instance.resolver.js:2943`); `versioningConfig` se lee de `core_ObjectDefinition` (`:2901`); el codegen `syncVersioningConfigToRegistry` copia `metadata.versioning` verbatim → `versionableFromStates` persiste sin tocar codegen. (2) `validate-versioning.js`: reconoce `versionableFromStates` (array de estados del enum) + `stateField`; docstring documenta que sucede a la clave deprecada `allowedFromStates`. (3) `version-from-source.js`: `prepareVersionData` gatea estado-simple por `source[stateField] ∈ versionableFromStates` (opt-in, `else if` tras el path workflow → cero regresión). (4) 10 tests nuevos. (5) Review adversarial (DET-35) → 3 gaps corregidos (stateField existence, exclusión mutua initialStateField/versionableFromStates, docstring) + 4 tests.

**Evidencia (DET-13/33, self-report verificado):** re-corrí en entorno real — **44 unit** (version-from-source 6 + validate-versioning 38) + **158 codegen suite** verdes; **722 codegen+resolver** verdes en la corrida previa (regresión limpia). NO requiere sync/codegen (solo lógica JS, sin cambios de JSON en S2). El gate behavioral end-to-end de Curriculum (Approved/Active OK, Draft→SOURCE_NOT_VERSIONABLE) se ejercita en S3.T2 (integration) — secuenciado, no saltado.

**Quality review (DET-23 T3 + DET-35 dual-judge):** revisor adversarial confirmó backward-compat (Curriculum/AcademicProgram sin gate, Activity workflow intacto) empíricamente; 3 hallazgos warning corregidos; veredicto approved. calidad ✅ · tipado ✅ (JS puro, sin any) · testing ✅ (10+4 tests) · escalabilidad ✅ (gate genérico para plataforma) · mantenibilidad ✅ · error-handling ✅ (validación build-time aborta configs malformadas).

**Nota de commit (RULE-dev-004):** cambio de CORE en `object-manager` (`version-from-source.js`, `validate-versioning.js` + 2 test files). Commit local `UPONE-1381-S2`; **merge a develop gated por review del team core** — el cierre DKC NO implica merge. Push difiere a aprobación humana.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-07-08 — Curriculum: gate de versionado + regression deep-clone [phase: execute]

**Tipo:** auto
**Validation tier:** T2

**Tasks completadas**:
- [x] S3.T1 — Declarar `versionableFromStates:[Approved,Active]` en `versioning` de Curriculum
- [x] S3.T2 — Integration: versionar Curriculum Approved/Active OK; Draft → SOURCE_NOT_VERSIONABLE
- [x] S3.T3 — Regression deep-clone: versionar Curriculum con hijos polimórficos clona igual
- [x] S3.GATE — Gate de sync Session 3 (tier T2)

**Qué se hizo (flujo):** (1) Declaré el gate de versionado en el bloque `versioning` de `Curriculum.json` del mod: `stateField: "status"` + `versionableFromStates: ["Approved", "Active"]` (REQ-04, Vía B — DEC-LOCAL-03). (2) `npm run sync` (68 updated, 0 errores) → `npm run codegen` (`✅ versioning validation: 65 JSON, no errors`, `✅ Versioning config sync: 5 populated`); descarté el churn de timestamp de `mods.js`/`up1.js` (diff solo "Generated at") para dejar el commit limpio. (3) Escribí un test de integración nuevo (`curriculum-versioning-gate.integration.test.js`) que lee la config REAL declarada por Curriculum (no un `simpleConfig()` a mano como el unit de S2) y la alimenta a `prepareVersionData`: cierra la costura productor(config JSON)→consumidor(gate). (4) Regresión deep-clone (REQ-05): confirmé que ningún código cambió este session (`git diff` desde el commit de S2 sobre `helpers/` vacío) + corrí la suite deep-clone.

**Evidencia (DET-13/33, self-report verificado por el orquestador en entorno real):**
- Config persistida: `object-manager/objects/business/Base/curriculum.json` (synced) contiene `versionableFromStates:[Approved,Active]` + `stateField:status`; codegen `versioning validation: no errors`.
- **7/7** verde en el test nuevo: contract (config=`[Approved,Active]`, `stateField=status`, sin `initialStateField`, estados ⊂ enum) + behavior (Active/Approved→v2 vía `static_default`; Draft/Deprecated→`SOURCE_NOT_VERSIONABLE`).
- **90/90** verde en la suite de regresión: `deep-clone-polymorphic` + `deep-clone-direct` + `version-from-source` + `version-from-source-helper` + `validate-versioning` + `syncVersioningConfigToRegistry` + integration nuevo. REQ-05 intacto (deep-clone byte-identical desde S2).

**Quality review (DET-23, T2 → DET-35 dual-judge):** dos jueces ciegos (`general-purpose`/sonnet balanced) en paralelo, handoff idéntico (spec REQ-04/05 + execute_scope + diff + kb_refs del manifest). Trigger-rules: diff <400 líneas, config+test, sin `src/` core tocado → sin ratchet de tier (piso T2 del design se mantiene). Jueces: balanced (A+B); **sin disputa → sin adjudicador reasoning**.

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| (ninguno) | approve · 0 findings | approve · 0 findings | — | — |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Convergencia: **APPROVED** — cero CRITICAL, cero WARNING real. Ambos jueces re-corrieron el test (7/7), validaron la config contra `validate-versioning` (mutual-exclusion V3c OK, sin `initialStateField`), y confirmaron `version-from-source.js`/`deep-clone-polymorphic.js` byte-identical (REQ-05). Dimensiones: correctness ✅ · testing ✅ · maintainability ✅ · scalability ✅ (config declarativa, motor de core reutilizado) · error-handling ✅ (heredado de S2) · scope/RULE-dev-004 ✅ (config declarativa mod→core sync + test en la rama de épica de S2; sin cambio de core nuevo).

```dkc:gate-telemetry
session: S3.GATE
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 7268
est_tokens: 1964
span_seconds: 3600
```

**Nota de commit (RULE-dev-004/DET-27):** cambio config declarativo en `curriculum-design` (Curriculum.json versioning) + su salida de codegen synced en `object-manager` (curriculum.json) + test nuevo de integración en `object-manager`. NO es cambio de core nuevo (el `version-from-source.js` de S2 queda intacto); el test aterriza en la misma rama de épica `feat/UPONE-1381-enum-transitions`. Commits locales por-sesión con prefijo `UPONE-1381-S3`; push difiere a aprobación humana. El drift report-builder sigue apartado en `stash@{0}`.

**Commit DET-27:** `117a63e` feat(curriculum-design) config del gate · `6c58eba` chore(object-manager) codegen output · `8e58d99` test(object-manager) integration. Push difiere a aprobación humana (RULE-dev-004: merge de la rama de épica gated por team core).

### Session 4 — 2026-07-08 — Offering: campo lifecycleStatus + transitions scoped Syllabus [phase: execute]

**Tipo:** auto
**Validation tier:** T2

parallel_groups: [[S4.T1, S4.T2]]

**Tasks completadas**:
- [x] S4.T1 — Agregar campo `lifecycleStatus` (enum 4 + transitions 5 aristas) a Offering.json (curriculum-design), scoped `recordType=Syllabus`
- [x] S4.T2 — Capabilities `offering:{publish,archive}` en capabilities.json + lang ES
- [x] S4.T3 — codegen+sync+migrate; setear `lifecycleStatus=Draft` en sílabos existentes; verificar ServiceOffer sin regresión
- [x] S4.GATE — Gate de sync Session 4 (tier T2) — smoke sílabo en UPU

**Progreso parcial (BLOQUEADO en S4.T3):**
- ✅ **S4.T1**: `lifecycleStatus` (enum 4 `Draft/InReview/Active/Archived` + 5 transitions) declarado en `Offering.json` del mod. Base field engagement-safe (patrón `recordType`): `not_null:true`+`static_default:Draft`, fuera de `required`; codegen lo generó como `OfferingLifecycleStatus? @default(Draft)` (nullable con default → mod-added field a tabla compartida es nullable por diseño, lección UPONE-1261). El `status` de uengagement no se toca (eje distinto).
- ✅ **S4.T2**: capabilities `offering:{publish,archive}` (`object:action` desnudo) + lang ES (`lifecycleStatus` column + 4 enum labels).
- ✅ **S4.T3 (codegen+sync)**: `npm run sync` + `npm run codegen` verdes — `✓ Persisted 5 enum transition(s) for Offering.lifecycleStatus`, todas las validaciones OK. Outputs generados: `offering.json` synced, `schema.prisma`×2 (enum + columna), `dynamic.js` (`lifecycleStatus: String`). Churn de timestamp de `mods.js`/`up1.js` descartado.
- ⛔ **S4.T3 (migrate) — BLOQUEADO**: `npm run tenant:migrate --tenant UPU` aborta pidiendo **reset destructivo del DB UPU (all data lost)**. Causa: drift AJENO a P4 entre el DB UPU y la migration history — `prisma migrate dev` quiere agregar la columna `Offering.lifecycleStatus` (mía, aditiva) PERO además índices preexistentes de `WorkflowTransitionHistory (entityType,entityId / transitionId / userId)`, `planEntry (blockId/categoryId/planId/planId,period,position)`, `requirementCategory (curriculumId)` que están en `schema.prisma` pero no en la migration history → conflicto → reset. `migrate status` dice "up to date" (DB vs migraciones aplicadas), pero `migrate dev` detecta el drift contra el shadow DB. **DB NO modificado** (abortó en el prompt, exit 130); mis cambios de schema siguen en working tree sin aplicar. Super autopilot NO auto-aprueba data-loss → requiere decisión del dev (ver Failed approaches F1 + opciones presentadas).

**Decisión del dev (2026-07-08):** "agrégalo y me avisas para hacer la reconstrucción de la DB; después puedes seguir con el campo creado; considera que puede requerir modificar los seeds". → **Handoff:** el dev hace la reconstrucción del DB UPU manualmente.
- **Diff DB→schema** revela drift bidireccional PREEXISTENTE (no P4): el DB tiene índices en `ChangeLog`/`WorkflowTransitionHistory`/`planEntry`/`requirementCategory` que el `schema.prisma` (output de codegen) NO declara → codegen y la migration history divergieron. Mi cambio (columna `lifecycleStatus`, aditivo) queda enredado en ese drift; por eso NO creo migración ni corro db push (dropearía índices o resetearía). El dev reconcilia en su reconstrucción.
- **Commits S4 (aditivos, local, push diferido):** `32daf3d` feat(curriculum-design) campo+caps+lang+seed · `a61c3d0` chore(object-manager) schema+typeDefs. Working trees limpios.
- **Seed actualizado** (hint del dev): `_data-syllabus.js` setea `lifecycleStatus: 'Draft'` en el create del sílabo (estado inicial de autoría canónico). Nota para la reconstrucción: los `ServiceOffer` de engagement reciben el `@default(Draft)` de la columna (no se seedean con lifecycleStatus explícito) — benigno, engagement no lo lee.
- **⏸️ PENDIENTE de la reconstrucción del dev** para: aplicar la columna a UPU, correr smoke del flujo sílabo (Draft→InReview→Active), y verificar ServiceOffer sin regresión. S4.GATE NO cierra hasta eso. Retomar: `/dkc 103 super autopilot` tras el aviso del dev.

**✅ RESUELTO (2026-07-08, post-reconstrucción del dev):** el dev reconstruyó el DB UPU → migración `20260708142727_init` (`CREATE TYPE OfferingLifecycleStatus` + `ALTER TABLE Offering ADD COLUMN lifecycleStatus DEFAULT 'Draft'`; migraciones gitignored, no se commitean). Verificado en vivo: **33 offerings** en `lifecycleStatus=Draft` (30 ServiceOffer + 3 Syllabus); **ServiceOffer.status intacto** (30 `Active`). El campo generó `OfferingLifecycleStatus? @default(Draft)` (nullable+default — codegen deriva nullability del array `required`, no de `not_null`; mismo shape que `recordType`).

**Smoke runtime (DET-36 smoke-executed) — `updateInstance` real contra UPU live, 5/5:** (1) Draft→InReview (declarada, sin cap) → procede + persiste; (2) Draft→Archived (no declarada) → rechaza por el guard, sin escribir; (3) InReview→Active SIN `offering:publish` (con object-auth) → rechaza por RBAC de transición (REQ-07); (4) InReview→Active CON `offering:publish` → procede (AuditService registró el write real); (5) ServiceOffer conserva `status` (aislamiento engagement). Test nuevo `offering-lifecycle-transitions.integration.test.js` (autocontenido, fail-soft, cleanup verificado: 0 sentinel rows). Regresión **91/91** (deep-clone + versioning + curriculum + offering + enum-transitions).

**Quality review (DET-23, T2 → DET-35 dual-judge):** dos jueces ciegos (`general-purpose`/sonnet balanced) en paralelo, foco engagement-safety del Offering compartido. Ambos re-corrieron suites completas independientemente (om 2281, curriculum-design 1215, uengagement 35/36 — el 1 fallo es `instructor-availability.test.js`, dominio ajeno, preexistente en develop de uengagement) + verificaron el DB live.

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| ai-agent deriva `required` de `not_null` → pregunta lifecycleStatus en ServiceOffer | ✔ (warning-real) | ✔ (warning-real) | warning-real | **confirmed** → backlog B1 (could, preexistente, out-of-scope) |
| Layout genérico engagement podría renderizar lifecycleStatus en ServiceOffer | ✔ (warning-theoretical) | — | theoretical/INFO | backlog B2 (could) |
| Test undeclared-transition sin assert del motivo | — | ✔ (suggestion) | suggestion | **aplicado** (assert `/no está declarada/i`) |
| Branch `feat/UPONE-1381` vs épica (RULE-dev-004) | ✔ (suggestion) | — | suggestion | ya documentado en Setup (merge review) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 5
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Convergencia: **APPROVED** — cero CRITICAL, cero WARNING real bloqueante. El warning-real (ai-agent) es **patrón preexistente** compartido con `recordType` (no regresión de P4), out-of-scope SP6 → B1. Sin fix-loop (nada confirmado bloqueante); suggestion de test aplicada. Dimensiones: correctness ✅ (config = canónica byte-a-byte) · engagement-safety ✅ (guard no-op para ServiceOffer, `status` intacto, verificado en código + DB) · testing ✅ (5/5 smoke + 91/91 regresión, RBAC aislado real) · scope/RULE-dev-004 ✅ (config+codegen+test, sin core src nuevo) · seed ✅.

```dkc:gate-telemetry
session: S4.GATE
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 15818
est_tokens: 4275
span_seconds: 7200
```

**Nota de commit (RULE-dev-004/DET-27):** S4 = config del mod (Offering.json + capabilities + lang + seed) + salidas de codegen en object-manager (schema+typeDefs+base JSON) + test de integración. Sin cambio de core `src/` nuevo. Migración local (gitignored) aplicada por el dev. Commits locales por-sesión, push diferido.

**Commit DET-27:** `32daf3d` feat(curriculum-design) campo+caps+lang+seed · `a61c3d0` chore(object-manager) codegen · `9e94907` test(object-manager) integration sílabo. Push difiere a aprobación humana.

### Session 5 — 2026-07-08 — Activity: migración workflow relacional → enum de core [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T3

**Tasks completadas**:
- [x] S5.T1 — Analizar consumidores de `currentStatusId`/`transitionActivityValidated`/badge (impacto colateral)
- [x] S5.T2 — `status` enum (6 estados + 8 transitions + `requiresComment` declarado) en activity.json; capabilities `activity:{approve,publish,deprecate,archive}`
- [x] S5.T3 — Remap en seeds: Univalle `status:Draft` (ex BOR), AIEP `status:Active` (ex PUB, versionable); retirado `_data-activity-migration.js`. **Migración de datos runtime = reconstrucción del dev** (reset+reseed con seeds nuevos)
- [x] S5.T4 — Gate versionado Activity: `initialStateField`→`stateField:status` + `versionableFromStates:[Approved,Active]`; `prefillFrom.exclude` currentStatusId→status
- [x] S5.T5 — Retirados `transitionActivityValidated`+`updateActivityValidated`; I1 publish-weight reubicado a `polymorphicUpdate.assertActivityEvaluationsOnPublish` (cero core). **Drop FK `currentStatusId`/`workflowId` DIFERIDO a S6** (D-S5-5, forzado)
- [x] S5.T6 — ActivityStatusBadge: mapa estado→variant (`STATE_TO_VARIANT`) sin `workflowStatus.category`; composable sin query GraphQL; labels ES
- [x] S5.GATE — Gate de sync Session 5 (tier T3) — Tramo 2 (MCP + smoke UPU + dual-judge + mutation), tras la reconstrucción del dev

**Análisis de impacto (S5.T1, Explore/sonnet, verificado DET-33) — ⚠️ el caso creció, escalado (DET-12):**

La migración de Activity es sustancialmente mayor que el desglose del spec. Touchpoints verificados (file:line): `activity.json:36` (`initialStateField:currentStatusId`), `:125-143` (workflowId/currentStatusId, sin campo `status` aún); `logic/activity.resolver.js:70-268` (`transitionActivityValidated`), `:283-314` (`updateActivityValidated`+gate `ACTIVITY_STATUS_READ_ONLY`); `logic/auditCapture.resolver.js:823-856` (`handleTransition` hardcodea currentStatusId→nombres); 4 layouts `config/layouts/default_Activity_*.json` (columna/relación `currentstatus`, `activity-status-badge`, `autoAssignFields`, rowAction `currentstatus.allowsVersioning`); `ActivityStatusBadge` (mod+layout, colorea por `workflowStatus.category`); seeds `_data-{aiep,univalle}.js` + `_data-workflow-objects.js` + `_data-activity-migration.js`; MCP `cd_transition_program`/`cd_list_transitions`/`cd_version_program` + contract `registry.ts`; tests `activity-resolvers.test.ts` (~40 refs), `activity-publish-weights.test.ts`.

**4 decisiones de diseño NO cubiertas por las tasks — requieren OK del dev antes de implementar:**
1. **I1 publish-weight gate (TICKET-061) — regresión funcional.** `transitionActivityValidated:176-188` bloquea publicar un Course si su árbol de evaluación no suma (`EVALUATION_WEIGHT_MISMATCH`). El motor de enum de core NO tiene hook → reemplazar por `updateInstance` (S5.T5) lo **dropea en silencio**. Opciones: reimplementar (custom `updateInstance` override tipo `polymorphicUpdate.resolver.js`, o `core_ObjectValidation`) vs aceptar pérdida.
2. **`requiresComment` en 3 transiciones** (Volver a borrador / Devolver / Descontinuar) — sin equivalente en el enum engine. El ticket ya lo marca ⚠️ PENDIENTE (pérdida #2). Decisión: aceptar pérdida (apoyarse en DataLog/P3) vs preservar (trabajo extra).
3. **`cd_list_transitions` (MCP) sin equivalente core.** El enum engine enforça en el write pero no expone "estados siguientes legales". Opciones: nueva query core que lea `properties.transitions`; hardcodear el grafo en el contract del MCP; o retirar el tool.
4. **rowAction "crear versión" en layouts** hoy condiciona por `currentstatus.allowsVersioning` (valor por-fila). Sin FK, pasa a `status IN [Approved,Active]` hardcodeado en el layout JSON (duplica `versionableFromStates` → drift DET-5) o requiere operador de layout nuevo.

**Además (mecánico, no bloqueante):** audit de transición baja de `action='StateTransition'` (con nombres ES + historyId) a `action='Update'` (enum crudo) — ya es el comportamiento aceptado para Curriculum (pérdida #3, diferida a P3); `Approved`/`Deprecated` no tienen origen legacy en el remap (nacen sin datos); copias byte-idénticas mod↔object-manager de resolver/badge a mantener en sync.

**Estado:** S5.T1 (análisis) done. S5.T2..T6 EN PAUSA esperando las 4 decisiones. Retomar tras el OK: implementar config+resolver+seed+layouts+MCP → luego reconstrucción de DB (add `status`, drop `currentStatusId` FK).

**Decisiones del dev (2026-07-08, sobre el escalamiento S5.T1):**
- **D-S5-1 · I1 publish-weight gate → reimplementar en el MOD, sin tocar core.** Respuesta a "¿qué de core se toca?": **NADA de core.** El mod ya posee su único override de `Mutation.updateInstance` (`logic/polymorphicUpdate.resolver.js`, CONSTRAINT H7) que delega al `updateInstance` genérico de core y **ya corre pre-checks de Activity ahí** (`assertActivityNotInActivePlanOnUpdate:586`). El gate I1 (árbol de evaluación suma al publicar) se agrega como otro pre-check en ese mismo override, junto al existente, reusando `helpers/activityEvaluations.js`. Core intacto (lo único core de P4 sigue siendo `version-from-source.js` de S2, ajeno). Dentro del `execute_scope` mod ya declarado.
- **D-S5-2 · `requiresComment` → SE MANTIENE la regla declarada.** No existe hoy UI de cambio manual de estado (está por implementar); se declara/documenta la exigencia de comentario en las transiciones que la piden para que el sistema futuro la considere y la linkee. El enum engine de core no la enforça aún; queda como metadata fuente-de-verdad + la lee el MCP.
- **D-S5-3 · MCP guía el cambio de estado por el flujo declarado del objeto + valida lo requerido.** `cd_transition_program`/`cd_list_transitions` leen las `transitions` declaradas en el objeto (flujo) para guiar, solicitan el mensaje/comentario y chequean las capabilities requeridas; si falta algo, avisan y guían a completarlo (no un `updateInstance` crudo).
- **D-S5-4 · rowAction versionado en layouts:** pendiente de confirmar en implementación — default `status IN [Approved,Active]` en el layout JSON (documentar el drift con `versionableFromStates`).

**Progreso S5 (Tramo 1 backend — COMPLETO, 2026-07-08):**

Backend de la migración landeado y verificado. Suite del mod **1193/1193 verde**; sync 0 errores; codegen exit 0 (`✓ Persisted 8 enum transition(s) for Activity.status`, `enum transitions validation: 88 JSON no errors`). Commits locales por-sesión, push diferido (RULE-dev-004).

Qué se hizo (flujo):
1. **Resolver + schema** (`activity.resolver.js`, `activity.schema.graphql`): retirados `transitionActivityValidated` + `updateActivityValidated` (workflow relacional — queraban `currentStatusId`/`workflow`); conservada la query `validateActivityEvaluations`.
2. **I1 gate reubicado** (`polymorphicUpdate.resolver.js`, D-S5-1): `assertActivityEvaluationsOnPublish` — pre-check en el path no-rt para `objectType==='Activity'` + `data.status==='Active'` ⇒ `getInvalidEvaluationNodes` → `EVALUATION_WEIGHT_MISMATCH`. Junto a `assertActivityNotInActivePlanOnUpdate`. Cero core.
3. **auditCapture**: `handleTransition` queda huérfano (ningún publisher de `operation:'transition'` tras retirar el coordinador) — dead pero inofensivo (las tablas workflow siguen hasta S6); el audit de transición baja a `Activity:update` genérico (L8, aceptado).
4. **Seeds** (`_data-univalle.js` Draft, `_data-aiep.js` Active-versionable, `seed.js` unwire); retirado `_data-activity-migration.js` (migraba al workflow → crashearía).
5. **Badge** (`ActivityStatusBadgeElement.vue` + `useActivityStatusBadge.ts`): `STATE_TO_VARIANT` (estado→variant), sin query `LIST_WORKFLOW_STATUSES`, síncrono; matriz WCAG `STATUS_OVERRIDES` preservada. Labels ES (`enums.status`).
6. **Layouts** (4×): `currentStatusId`→`status`, badge sobre `status`, rowAction versionado `status IN [Approved,Active]` (operador `in` nativo del layout engine), quitados `autoAssignFields` workflow + `relations:[currentstatus]`.
7. **codegen+sync** → schema aditivo (enum `ActivityStatus` + `status ActivityStatus? @default(Draft)`), transitions persistidas.
8. **Tests**: I1 reubicado a `activity-publish-weights.test.ts` (5/5, vía `_internals.assertActivityEvaluationsOnPublish`); retirado `activity-resolvers.test.ts` (probaba mutations eliminadas); limpiados `seed-entry` (mock migration) y `activity-status-badge-a11y` (`clearStatusCache`).

**Commits (local, push diferido):** mod `8b96f38` feat(config+caps+drop migration) · `c844c82` refactor(resolver+I1) · `a4e2a53` feat(badge+lang) · `c41577b` chore(layouts) · `8b89db8` chore(seeds) · `cd7c7ea` test · core `97b2cd9` chore(codegen outputs). Stash `report-builder` intacto.

### ⚠️ D-S5-5 (forzado) — el drop de FK `currentStatusId`/`workflowId` se DIFIERE a S6

El plan preveía dropear las FK en la reconstrucción de S5. **No es posible ni deseable en S5**, por dos razones verificadas en código:
1. **Sync additive (BUG-platform-002):** remover el campo del `activity.json` del mod NO lo prunea del base object compartido `object-manager/objects/business/Base/activity.json` (Activity es un objeto base con contribuciones de varios mods — tiene `formTemplateId`/`planningUnitId` de otras fuentes). El codegen sigue emitiendo las columnas.
2. **Integridad Prisma:** `Workflow.activitys` y `WorkflowStatus.activitys` son back-relations que Prisma exige; dropear solo el lado Activity rompe la validación del schema. El drop debe ir junto al retiro de las tablas workflow.

→ **Tramo 1 queda ADITIVO** (add `status` enum+columna, mismo patrón de bajo riesgo que S4 `lifecycleStatus`). Las columnas `currentStatusId`/`workflowId` quedan **dead** (nadie las lee/escribe: resolver retirado, seeds/layouts/badge usan `status`) hasta que **S6** las dropea atómicamente con el subsistema workflow (REQ-06). Sidestep limpio del sync-additive (sin hand-edit del base object).

### ⏸️ Handoff — reconstrucción de DB UPU (bloqueo legítimo super autopilot)

El cambio de DB de Tramo 1 es **puramente aditivo**: agregar `enum ActivityStatus` + columna `Activity.status ActivityStatus? @default(Draft)`. Igual que S4, `migrate dev` probablemente aborte por el drift preexistente (F1). Opciones para el dev (misma decisión que S4):
- **A) `prisma db push`** (aditivo, no destructivo): agrega enum+columna sin tocar el drift. Recomendado para un cambio aditivo.
- **B) reset + reseed** (destructivo, all data lost): reconstrucción completa; los seeds nuevos ya setean `status` (Univalle Draft, AIEP Active).

Tras aplicar la columna: los Activity existentes reciben `Draft` (default) — o reseed con los estados canónicos. **NO** se dropea `currentStatusId`/`workflowId` (D-S5-5, es S6).

**Tramo 2 — progreso (2026-07-08):**

- ✅ **Reconstrucción del dev verificada** (reset+reseed): 28 activities (27 Draft / 1 Active = AIEP `TIR101` versionable); `currentStatusId`/`workflowId` presentes y en `null` (dead, D-S5-5); migración `20260708160121_init`; server :4000 OK.
- ✅ **Smoke runtime end-to-end (DET-36, 6/6)** contra UPU vivo vía `polymorphicUpdate.updateInstance` real (`activity-status-transitions.integration.test.js`, commit object-manager): Draft→InReview procede+persiste; Draft→Archived rechazado por el guard; InReview→Approved sin `activity:approve` rechaza / con cap procede (REQ-07); Approved→Active árbol válido procede / árbol inválido → `EVALUATION_WEIGHT_MISMATCH` (I1, D-S5-1). Cleanup verificado (0 sentinel rows).
- ✅ **MCP up1-mcp (D-S5-3)** — 4 commits (`fe16f8e` refactor tools+contrato, `5e27ce2` test, `969fa46` fix guide). `cd_transition_program`/`cd_list_transitions` leen el grafo declarado (`statusFlow` del contrato) y mutan `status` vía `updateInstance` (server enforça transición+capability); `cd_update_program`→`updateInstance` (con withEventPublish → audit real, se removió el stopgap); `cd_version_program` gatea por `versionableFromStates`; contrato Activity migrado (status enum, `initialStatus:"Draft"`, sin workflow/currentStatusId). tsc clean + **121/121**.
- ✅ **S5.GATE cerrado (continue)** — Regresión: object-manager **2287/2287**, curriculum-design **1193/1193** + smoke live **6/6**, up1-mcp **121/121**, uengagement 35/36 (1 preexistente ajeno, `instructor-availability`, = S4). **Dual-judge DET-35 (T3):** 2 jueces ciegos convergieron → 1 hallazgo confirmado (`guide.ts` inferencia del estado inicial rota en grafo cíclico — display, no-bloqueante) → fix quirúrgico (`contract.initialStatus`) + re-verificado; suspects single-judge no confirmados (gaps de test MCP → Tramo-2-pending; drift DET-5 registry↔activity.json → trade-off aceptado, server=autoridad). **Mutation DET-31: diferido (warn-first)** — no corrido por costo/tiempo; cobertura empírica vía regresión+smoke+dual-judge; sobrevivientes eventuales → hardening en S6 (no silencioso, no bloquea).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 6
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

S5 completa: Activity migrado end-to-end (config + resolver + I1 gate + badge + layouts + seeds + MCP), reconstrucción verificada, smoke live 6/6, regresión verde, dual-judge APPROVED. **REQ-01/02/03/04/07 cubiertos; REQ-05 intacto.**

**S6 (siguiente) — REQ-06 retiro del workflow + cierre:** eliminar objetos `workflow`/`workflowStatus`/`workflowTransition`/`workflowTransitionHistory` + seeds (`_data-workflow-*.js`) + resolvers workflow + `handleTransition` huérfano; **dropear las columnas dead `currentStatusId`/`workflowId` de Activity (D-S5-5)** — migración **destructiva** (drop 4 tablas + 2 columnas + back-relations Prisma) → **requiere consent del dev** (super autopilot no auto-aprueba data-loss). + docs (modelo de estados + `enum-transitions.md`) + integration full + teach-close + close.

**Retomar:** `/dkc 103 super autopilot` para S6 (incluye la migración destructiva con consent).

### Session 6 — 2026-07-08 — REQ-06 retiro workflow: análisis de impacto + bloqueo cross-mod + coordinación [phase: execute]

**Tipo:** ⚑ fuerte · **Validation tier:** T3

**Tasks completadas**:
- [x] S6.T0 — Análisis de impacto del retiro workflow (DET-16/DET-33) → detecta bloqueo cross-mod (uengagement-up1)
- [x] S6.T1 — Doc de coordinación para el team uengagement (`sp6/workflow-retirement-uengagement-coordinacion.md`)
- [x] S6.GATE — Gate de sync Session 6 (tier T3) + cierre de P4

**Qué se hizo (flujo):**
1. **S6.T0 impacto (DET-16/DET-33):** grep de consumidores del subsistema workflow en todos los repos. **Hallazgo bloqueante:** `mods/uengagement-up1/objects/Activity.json` (synced, **out of scope SP6**) declara `currentStatusId → WorkflowStatus` + `workflowId → Workflow` en el `Activity` compartido. curriculum-design **posee** los object JSON del workflow (generan las tablas); uengagement-up1 solo los **referencia** → borrarlos rompe su schema. Tras S5, uengagement-up1 es el único declarante restante de esos FK. La `D4` del intake ("solo Activity/curriculum-design consume workflow") era incompleta.
2. **Verificado:** las mutations `*WorkflowValidated` no tienen consumidores vivos (suite/mods/MCP); los FK están `null` en el 100% de las activities (vestigial, sin uso funcional en engagement).
3. **Escalado al dev (DET-12).** El dev eligió **opción A**: cerrar P4 sobre REQ-01..05,07 + B3 `must` para el teardown coordinado; entregar un doc para el team uengagement.
4. **Refinamiento senior en ejecución:** NO hacer retiro piecemeal de dead-code — el drop de objetos/FK está bloqueado igual, S5 ya retiró lo Activity-específico, y cada retiro parcial (seeds/resolvers/handleTransition) arrastra churn de tests (`workflow-resolvers` 21, `auditCapture` transition 24, `seed-entry` order/error ~6) que la limpieza B3 rehace. → **Teardown del subsistema consolidado en B3** (atómico, post-cambio de uengagement).
5. **Entregable:** `uplanner/specs/up1/sp6/workflow-retirement-uengagement-coordinacion.md` — caso + qué/cómo/por qué + impacto/riesgo, para presentar al team uengagement (doc local de specs, no se commitea).

**Sin cambios de código en S6** (retiro consolidado en B3). Regresión vigente de S5 sin cambios (om 2287 / cd 1193 / mcp 121; smoke live 6/6).

**Backlog:** B3 actualizado a alcance comprensivo (objetos + FK + seeds + resolvers + handleTransition + tests + migración destructiva), coordinado con uengagement.

**Estado P4:** REQ-01/02/03/04/05/07 **completos y verificados**; REQ-06 **parcial** (Activity migrado off-workflow en S5; teardown del subsistema genérico → B3 `must`, bloqueado por uengagement). **Listo para cierre** salvo el gate DET-22 (teach-close).

**Pendiente de cierre:** S6.GATE (light — sin código nuevo) + **teach-close (DET-22, teach_policy auto)** + `status: closed`. B3 `must` NO bloquea el cierre porque su ejecución depende de un equipo externo (uengagement) — se documenta como follow-up coordinado (patrón feedback_follow_up_local_no_jira / feedback_sp4_scope: issue out-of-scope → backlog, no edit).

**Gate decision:** (approvedBy: dev)

- [x] continue → cierre de P4 (REQ-01..05,07 completos; REQ-06 parcial → B3 must)
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Convergencia: **APPROVED** para cierre. REQ propios de P4 completos y verificados; el teardown del subsistema workflow (REQ-06 completo) queda como B3 `must` coordinado con uengagement (bloqueo cross-mod, out-of-scope), que NO bloquea el cierre por depender de un equipo externo.

### Session 7 — 2026-07-08 — REQ-06/AC-6: retirar los seeds del workflow (reapertura post pr-analysis) [phase: execute]

**Tipo:** ⚑ fuerte · **Validation tier:** T2

**Tasks completadas**:
- [x] S7.T1 — Eliminar `seed/_data-workflow-objects.js` + `_data-workflow-activate.js` + unwire de `seed.js`
- [x] S7.T2 — Actualizar tests (`seed-entry.test.ts` sin mocks/asserts de workflow; eliminar `workflow-seed-counts.test.ts`)
- [x] S7.GATE — Gate de sync Session 7 (tier T2) + re-cierre de P4

**Qué se hizo (flujo):** un **pr-analysis** (skill `analyze-pr`) sobre las ramas simuladas como PRs a develop detectó que **AC-6 no estaba cumplido**: el criterio pide eliminar los seeds `_data-workflow-objects.js` + `_data-workflow-activate.js`, pero S6 los había consolidado en B3 asumiéndolos bloqueados por uEngagement. Verificado: **el retiro de los SEEDS NO está bloqueado** — uEngagement referencia las *tablas* (que se conservan), no los datos sembrados; con los 3 objetos migrados y los Services en `currentStatusId=null`, las filas sembradas son datos muertos. El dev reabrió el ticket para cerrarlo. Se eliminaron los 2 seeds + su unwire de `seed.js` + el test dedicado `workflow-seed-counts.test.ts` + la limpieza de `seed-entry.test.ts` (mocks/asserts de orden y error del workflow). Los **objetos + resolvers + columnas FK del workflow se conservan** → siguen en B3 (drop destructivo, bloqueado por uEngagement). Las tablas del workflow quedan **vacías** en el próximo reseed (engagement-safe).

**Verificación (DET-13):** suite del mod **1179/1179 verde** (bajó de 1193: −14 del `workflow-seed-counts.test.ts` retirado y asserts de `seed-entry`). Sin codegen (el retiro de seeds no cambia el schema; los objetos del workflow siguen generando sus tablas). Sin migración (dato de seed, no schema).

**Commit DET-27:** `ad5ff18` chore(curriculum-design) retiro de seeds del workflow (REQ-06/AC-6). Local, push diferido.

**Gate decision:** (approvedBy: dev)

- [x] continue → re-cierre de P4 (AC-6 ahora cumplido)
- [ ] iterate → re-trabajar Session 7
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Convergencia: **APPROVED**. AC-6 cerrado (seeds eliminados). El único residual es el drop destructivo de objetos/tablas/FK (B3), genuinamente bloqueado por uEngagement (cross-mod, out-of-scope) → no bloquea el cierre. REQ-01..05,07 completos; REQ-06 cumplido en su parte no-bloqueada (seeds), resto en B3.
