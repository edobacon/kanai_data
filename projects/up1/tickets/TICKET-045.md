---
id: TICKET-045
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1217
module: curriculum-design
autopilot: autonomous
---

# HU-11 | Sección "Versiones" en RecordDetail de Activity (discovery interno + implementación)

## Request

> Contenido literal del ticket Jira [UPONE-1217](https://u-planner.atlassian.net/browse/UPONE-1217) (Historia, parent epic UPONE-1038). **Priority del plan: P2 (recortable si camino B → diferir a SP4).**

### Descripción

Sección colapsable "Versiones" en el RecordDetail para navegar entre versiones.

### Criterios de aceptación

* **Fase 0 (discovery)**: ¿existe primitivo de RecordDetail con lista navegable + badges? Decidir camino A (config) vs B (primitivo).
* **Fase 1**: sección que consume `getVersionChain`; muestra version/label/estado/fecha/autor; marca la actual; click navega; i18n.

### Dependencias

HU-5.

### Cambio vs actual

Ninguno de fondo (incluye fase de discovery).

## Contexto operativo del plan SP3

### P4.3 — HU-11 · Seccion "Versiones" en RecordDetail (Fase 4) · `P2`

- **Meta**: implement (+discovery) · ~2-3 SP · certeza a validar (fase 0) · rollback git revert · riesgo: camino B sin primitivo → diferir a SP4
- **Contexto**: navegar entre versiones desde el detalle. Tiene una fase 0 de discovery porque puede requerir un primitivo de layout (lista navegable + badges).
- **Que se realiza**: fase 0 — revisar si existe primitivo de RecordDetail con lista navegable (camino A config-only vs B split layout+mod). Fase 1 — seccion "Versiones" que consume `getVersionChain`, muestra version/label/estado/fecha/autor, marca la actual, navega al click; i18n.
- **Depende de**: HU-5 (TICKET-040).
- **Investigar/profundizar**: la **fase 0 discovery**. Si camino B sin primitivo → diferir a SP4.
- **Prueba**: `unit`+`smoke` 1, 2, N versiones; actual marcada; navegacion; i18n.

## Material internalizado — HU detallada

### HU-11 · Seccion "Versiones" en RecordDetail de Activity

**Sprint:** SP3 · **Track:** Mod curriculum-design (+ posible layout/suite) · **Repo:** condicional

**Como** consultor
**Quiero** una seccion colapsable "Versiones" en el RecordDetail
**Para** navegar entre versiones.

**Criterios (fase 0 — discovery):**

- [ ] Revisar primitivos en `layout/config/`. ¿Existe primitivo de RecordDetail con lista navegable + badges?
- [ ] Decision: **Camino A** config-only en el mod · **Camino B** split HU-11a (primitivo layout) + HU-11b (config mod).

**Criterios (fase 1 — implementacion):**

- [ ] Seccion "Versiones" en `default_Activity_view.json`, despues de "Historial".
- [ ] Consume `getVersionChain(objectType: "Activity", instanceId)`.
- [ ] Cada version: `version` (Int), `versionLabel`, estado (badge desde currentStatusId), fecha, autor.
- [ ] Version actual marcada.
- [ ] Click navega al RecordDetail.
- [ ] Traducciones es_CL / en_CL / pt_BR.
- [ ] Tests: 1, 2, N versiones.

**Dependencias:** HU-5.

## Material internalizado — Shape preliminar (sujeto a Fase 0)

### Camino A (config-only en el mod) — si existe primitivo de RecordDetail con lista navegable

```json
{
  "name": "default_Activity_view",
  "objectType": "Activity",
  "sections": [
    { "name": "general", ... },
    { "name": "historial", ... },
    {
      "name": "versions",
      "type": "list",
      "title": "{{$t('versions')}}",
      "collapsible": true,
      "query": {
        "type": "getVersionChain",
        "objectType": "Activity",
        "instanceId": "{{currentId}}"
      },
      "columns": [
        { "field": "version", "label": "{{$t('versionNumber')}}" },
        { "field": "versionLabel", "label": "{{$t('versionLabel')}}" },
        { "field": "currentStatusId", "label": "{{$t('status')}}", "type": "badge" },
        { "field": "createdAt", "label": "{{$t('date')}}", "type": "date" },
        { "field": "createdBy", "label": "{{$t('author')}}" }
      ],
      "rowClick": { "type": "navigate", "to": "view" },
      "highlightCurrent": "{{currentId}}"
    }
  ]
}
```

### Camino B (primitivo nuevo en layout) — si NO existe primitivo

- Requiere agregar componente `VersionsList.vue` en `layout/src/components/...` con props (`versions`, `currentId`).
- Tipo nuevo en union (`recordDetailSection.ts`).
- **Recomendacion del plan**: si camino B sin primitivo → diferir a SP4 (es trabajo de layout core no acotado).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | explore (fase 0) + implement (fase 1) |
| Tipo de cambio | condicional (camino A: solo mod; camino B: mod + layout core, se difiere) |
| Modulo principal | curriculum-design |
| Modulos afectados | mods/curriculum-design (default_Activity_view.json + i18n); posible layout si camino B |
| Layer | mod (camino A); core + mod (camino B, diferido SP4) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | yes | Lista de versiones navegable con badges, fechas, autor |
| Data model | no | (la query `getVersionChain` ya entrega los datos) |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | skipped |
| Version aprobada | — |
| Path | — |

> Fase 0 discovery cumple la funcion de draft conceptual: se decide camino A vs B antes de implementar.

**Decision local de skip (DET-18, 2026-06-04 — autopilot super):** `draft_approved: skipped`. Justificacion: A-lite **no introduce un componente visual nuevo** — reusa el primitivo `record-list` ya existente (el mismo que la tab "Historial"), solo agrega una tab declarativa en `default_Activity_view.json`. No hay artefacto visual novedoso que prototipar/iterar. La Fase 0 (S1) ya hizo de draft conceptual (eleccion A-lite) y el dev confirmo el comportamiento (navegacion a la ficha de la version) en conversacion 2026-06-04. El flag `creates_visual: true` reflejaba el supuesto inicial (lista con badges = visual nuevo); la realidad A-lite es config-only sobre UI existente.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El layout tiene primitivo de seccion-lista en RecordDetail (precedente: `historial` consume changeLog) | ✓ confirmada (S1 Fase 0) | El primitivo `type: "record-list"` es generico y config-driven; la seccion `historial` lo usa (`default_Activity_view.json:345`, `objectName: ChangeLog`, filtro `{{parentId}}`). No es componente ad-hoc |
| H2 | Si camino A es viable, la implementacion es solo config + i18n (low risk, ~2 SP) | ✓ confirmada con matiz (S1) | Camino A-lite ~0.5 SP (solo JSON). PERO badge/highlight/rowClick-fila NO existen declarativamente en `record-list` → quedan fuera de A-lite (diferidos SP4 como A+) |
| H3 | Camino B (primitivo nuevo en layout) seria SP4 porque toca layout core | ✓ confirmada | Layout core requiere mas tiempo + spec separada. Solo aplica al subset A+ (badge+highlight+rowClick), no al MVP A-lite |

### Context found

- **Rules del modulo**: RULE-platform-006 (filename PascalCase).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-040 (HU-5 query), TICKET-029 (UPONE-1098 audit chain → seccion Historial existe como referencia).
- **Docs relevantes del repo**:
  - `mods/curriculum-design/config/layouts/default_Activity_view.json` (a extender)
  - `layout/config/` (primitivos de RecordDetail — Fase 0 inspecciona)
  - `mods/curriculum-design/config/layouts/` (seccion `historial` existente — patron de referencia)
- **Warnings**:
  - **Fase 0 BLOQUEANTE**: el resultado decide si el ticket termina aqui (Camino A) o se difiere SP4 (Camino B).
  - **Priority P2**: si el sprint se ajusta, este es uno de los primeros candidatos a recortar.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | mod si camino A; `UPONE-1206` si camino B (diferido SP4) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con HU-5 (`getVersionChain` query disponible); Activity v1 + v2 creadas (post-TICKET-043) |
| Services | object-manager, suite, layout |

## Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Fase 0 discovery — inspeccionar primitivos de RecordDetail; decidir camino A vs B | execute | T0 | inspeccion + decision documentada | ⚑ fuerte | camino A o B con justificacion | **✓ DONE — Camino A-lite** |
| S2 | **[A-lite+]** `default_Activity_view.json` — tab "Versiones" via `record-list` sobre `Activity` filtrado por `code EQUALS {{record.code}}` (estado texto, nameField=version + openMode route) + rowAction "Crear nueva version" (reuso HU-10) | execute | T1 | JSON + rowAction + sync | auto | tab renderea | pending |
| S3 | **[A-lite+]** i18n es/en/pt (tabs.versions + columnas) + smoke 1/2/N versiones (lista, navegacion, accion gateada, i18n) | execute | T3 | i18n + sync + smoke | ⚑ fuerte | UI verde; navegacion OK; accion gateada | pending |
| S4 | **[CORE — UPONE-1206]** Fix nav detail→detail: `:key` en LayoutOrchestrator de la pagina Suite de detalle, para que cambiar `instance_id` fuerce remount + fetch fresco (full-page route entre versiones). Layer core, revision team up1 (RULE-dev-004) | execute | T3 | fix suite + smoke multi-version | ⚑ fuerte | click version → vista completa de esa version (datos recargan) | in_progress |
| S5 | Cierre — commits + teach-close | execute | T1 | review + commit DET-27 | auto | tests verdes | pending |

> **Escalada a layer:core (2026-06-04, dev eligio "arreglar core ahora").** La nav full-page entre versiones la bloquea un bug de layout core (ver Learn L1: `RecordDetail.vue:4567` guard `!schema.value` + `LayoutOrchestrator.vue:701` watcher vacio). Fix en `suite/` (repo independiente, rama `UPONE-1206`). El ticket pasa de mod puro a mod + core; el merge de UPONE-1206 → develop es gated por revision del team up1; el push siempre pregunta.

> **S1 GATE (2026-06-02): Camino A-lite.** El primitivo `record-list` existe y es config-driven.
> **Design refine (2026-06-04): A-lite+.** Filtro por `code` (no `previousVersionId`); sin autor (Activity no lo tiene); + rowAction "Nueva version" (reuso HU-10, sobrevive el override view-mode). "Editar inline" diferido a SP4 (B-3, layout core). Spec: SPEC-020-hu11-versions-tab. Badge/highlight → B-1 SP4. HU-5 no bloquea.

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-04 | false → super | Dev pidio "ejecuta en super autopilot" tras confirmar scope A-lite | Proximo gate (S2 en adelante) |

### Confirmacion de scope (dev) — 2026-06-04

El dev confirmo en conversacion el comportamiento A-lite como suficiente para el valor de HU-11:

- **Pestaña "Versiones"** en el RecordDetail de Activity (el view usa `tabs`, no secciones colapsables sueltas — verificado en `default_Activity_view.json:17`).
- Click en el **nombre** de una version → **navega al RecordDetail completo de esa version** (`/{tenant}/Activity/{id}/RecordDetail`), mostrando sus datos en sus pestañas. Verificado: `TableCell.handleNameClick` emite `openRecordDetail` → `RecordList.handleOpenRecordDetail` (`layout/src/layouts/RecordList.vue:3943`) navega via route-mode (no in-place panel).
- **Fuera de scope SP3** (Backlog B-1/B-2, diferido SP4): badge de estado, `highlightCurrent`, rowClick-fila, panel maestro-detalle in-place.

**Decision (DET-1/DET-4)**: `work_type` flip `explore → implement` — la Fase 0 (S1) concluyo que A-lite es implementable en SP3; la fase de exploracion esta cerrada, procede la implementacion. Confirmado por el dev.

### Session 1 — 2026-06-02 — Fase 0 discovery: primitivo RecordDetail + decision camino [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana — gate de scope SP3 vs SP4)
**Validation tier**: T0 (discovery de solo-lectura, sin cambios de codigo)

**Objetivo**: Inspeccionar los primitivos de seccion de `RecordDetail` en `layout/` para decidir si la seccion "Versiones" de HU-11 es Camino A (config-only, reutiliza primitivo existente, SP3) o Camino B (primitivo nuevo en layout core, difiere SP4).

**Tasks completadas**:
- [x] S1.T1 — Discovery: tipos de seccion de RecordDetail, implementacion de `historial`, capacidades de columna (badge/date/rowClick/highlight), estado de `default_Activity_view.json`
- [x] S1.GATE — Gate de decision (tier T0): camino elegido + justificacion + propagacion a tickets dependientes

**Hallazgos (evidencia)**:
- **Primitivo existe y es generico**: `type: "record-list"` (procesado en `layout/src/layouts/RecordDetail.vue:4075-4138`) renderiza una sub-lista config-driven. La seccion `historial` lo usa tal cual: `mods/curriculum-design/config/layouts/default_Activity_view.json:345` (`objectName: ChangeLog`, filtro por `{{parentId}}`). No hay componente Vue ad-hoc para historial → **H1 confirmada**.
- **Soportado declarativo hoy**: columnas key/label, `sortable`, `filterable`, columna `date` (`recordListFormatters.ts:96`), filtro por `{{parentId}}`, click-en-nombre (`nameField`) que abre detalle (`TableCell.vue:377`).
- **NO soportado declarativo**: (a) columna `type: "badge"` para estado como chip — solo cards tienen badges; en tabla es texto; (b) `highlightCurrent` (resaltar fila vigente) — no existe prop; (c) `rowClick` navegar fila completa — solo el nombre, y abre modal, no navega in-place. Agregar (a)+(b) implicaria tocar layout core (`RecordList.vue`/`Table.vue`/tipo `Column`, ~2-2.5 SP).
- **`record-list` consume `objectName` + filtros, NO un query custom** (`getVersionChain`). → La lista de versiones se arma con `record-list` sobre `Activity` filtrado por `linkageField`, sin invocar HU-5.

**Decision (GATE S1)**: **Camino A-lite** — config puro en `default_Activity_view.json` (seccion `record-list` sobre `Activity` filtrada por `linkageField`), estado como **texto plano**, click-en-nombre abre detalle. **~0.5 SP** (por debajo de los 2 SP estimados). Sin badge, sin highlight, sin rowClick-fila.
- **Diferido a SP4 (Camino A+)**: columna badge declarativa + `highlightCurrent` + rowClick-fila navegable. Es trabajo de layout core, no bloquea el valor de HU-11 (ver Backlog B-1). Camino B completo (panel maestro-detalle in-place) tambien SP4 si se pidiera.

**Propagacion (DET-16)**:
- HU-11 (este ticket) **queda dentro de SP3** con scope A-lite. S2/S3 del plan ejecutan config + i18n + smoke.
- **TICKET-048** (e2e flujo completo) se mantiene en alcance SP3 (la seccion Versiones existira via A-lite).
- **HU-5 (TICKET-040, `getVersionChain`) deja de ser bloqueante de la UI de HU-11** — sigue valiendo para consumidores de API. HU-11 puede ejecutarse antes que HU-5.

**Gate decision:** (approvedBy: dev)

- [x] continue → Camino A-lite elegido (config en `default_Activity_view.json`, seccion Versiones via `record-list`). S2/S3 ejecutan config + i18n. Aprobado por dev (eleccion explicita). Nota: agendado tras el nucleo del sprint (HU-3 primero).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Design discovery (pre-S2) — 2026-06-04 — refina supuestos de S1

Al disenar el spec (design-feature) emergieron tres correcciones al plan de S1 (multi-capa, DET-5):

1. **Clave de filtro: `code`, NO `previousVersionId`**. S1 dijo "filtrado por linkageField", pero `versioning.linkageField = previousVersionId` (`activity.json:32`) es un FK reflexivo (puntero al anterior) — filtrar `EQUALS {{currentId}}` daria solo el sucesor inmediato, no la cadena. El campo estable entre versiones es **`code`** (`activity.json:55`: "Se mantiene entre versiones del mismo programa"). El motor resuelve `{{record.code}}` en `filters[].value` (`RecordDetail.vue:4099-4109`). → filtro `code EQUALS {{record.code}}` devuelve la cadena completa.
2. **Sin columna "autor"**. Activity NO tiene campo autor/`createdBy` (verificado en prisma `UPU/schema.prisma`: solo `createdAt`/`updatedAt`). La autoria vive en ChangeLog, no en Activity. Columnas reales A-lite: `version`, `versionLabel`, `currentStatusId` (estado, texto via `relationDisplayFields`), `createdAt`. "Autor" se omite (no satisfacible config-only).
3. **i18n: curriculum-design es es_CL-only**. Otros mods (retention-wellbeing, hello-world) traen en_CL/pt_BR; CD no tiene ninguno. Los labels resuelven via `column.{key}` del lang file (`RecordList.vue:2147`), tabs via `tabs.{key}` (`RecordDetail.vue:69`). Se entregan es/en/pt para las claves nuevas de esta tab; el resto del mod queda es-only (deuda pre-existente, no introducida aqui).

**Decision de scope row actions (dev, 2026-06-04 — AskUserQuestion):** **A-lite+ = Ver + Nueva version** (config-only, layer mod, SP3). Verificado: el override de view-mode (`RecordDetail.vue:4138-4150`) fuerza `canCreate/canEdit/canDelete=false` en listas embebidas pero **NO toca `rowActions`** → la accion "Crear nueva version" (reusada de `default_Activity_list.json:20`, `type:create` + `asNewVersion` + gate `activity:version`) sobrevive y se incluye. "Ver" via click-en-nombre + `openMode:route`. **"Editar inline" diferido (B-3)**: requiere aflojar el override (chokepoint global, afecta 17 listas embebidas / 3 mods — curriculum-design, object-manager-editor, hello-world; sin test que lo fije), mitigable con flag opt-in `editableInView` pero igual es layout core → rama UPONE-1206 + revision team (RULE-dev-004). Fuera de A-lite/SP3.

### Session 2 — 2026-06-04 — Config: tab Versiones + rowAction nueva version [phase: execute]

**Tipo**: auto
**Validation tier**: T1 (JSON valido + sync)

**Objetivo**: Agregar la tab "Versiones" (record-list sobre Activity filtrado por `code`) + la rowAction "Crear nueva version" en `default_Activity_view.json`, y sincronizar.

**Tasks completadas:**
- [x] S2.T1 — tab `versions` + elemento `versionsList` (record-list, filtro code, columns, nameField=version, openMode route, relations, relationDisplayFields)
- [x] S2.T2 — `rowActions: [create-new-version]` en `versionsList`
- [x] S2.T3 — `npm run sync`

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Quality review T1-light: JSON valido, patron record-list consistente con historial/modalidades, rowAction reusada de HU-10 sin alterar contrato, associatedLayoutConfigs consolidado, layer mod (solo mods/curriculum-design/). Sync 3/3 OK. → S3.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-04 — i18n es/en/pt + tests + smoke 1/2/N [phase: execute]

**Tipo**: ⚑ fuerte (validacion empirica de UI user-facing)
**Validation tier**: T3 (i18n + sync + smoke UI)

**Objetivo**: Proveer i18n (tabs.versions + columnas) en es/en/pt, sincronizar, y validar por smoke la tab Versiones (lista 1/2/N, navegacion, accion gateada, traducciones).

**Tasks completadas:**
- [x] S3.T1 — `es_CL@activity.json` + tabs.versions, column.versionLabel, column.createdAt
- [x] S3.T2 — crear `en_CL@activity.json` + `pt_BR@activity.json`
- [x] S3.T3 — `npm run sync`
- [x] S3.T4 — smoke 1/2/N versiones (lista, navegacion, accion gateada, i18n)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Config + i18n entregados y verificados por smoke (tab/filtro/i18n/columnas/accion). Navegacion detail→detail resulto bloqueada por bug de layout core (L1) → dev eligio arreglar core ahora → S4 (UPONE-1206). createdAt column gap documentado.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-06-04 — [CORE/UPONE-1206] Fix nav detail→detail (full-page route entre versiones) [phase: execute]

**Tipo**: ⚑ fuerte (layer core, revision team up1; validacion empirica de hipotesis)
**Validation tier**: T3 (fix suite + smoke multi-version)
**Repo/rama**: `suite/` en `UPONE-1206` (RULE-dev-004)

**Objetivo**: Que clickear una version abra la **vista completa** de esa version (route). Fix: `:key` en el `LayoutOrchestrator` de la pagina Suite de detalle, para forzar remount + fetch fresco al cambiar `instance_id` (sortea el guard `!schema.value` de RecordDetail sin tocar la logica de fetch compartida).

**Tasks completadas:**
- [x] S4.T1 — `:key` por instancia en LayoutOrchestrator de la(s) pagina(s) Suite de detalle (`[instance_id]/[view_type]/[layout_id]/index.vue` + variante sin layout_id)
- [x] S4.T2 — smoke multi-version: click v→otra version recarga datos (vista completa)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Quality review T3: full-page route entre versiones VALIDADO en vivo (v3→v1 navega + recarga datos correctos). Fix core en 2 archivos: RecordListElement.handleAction (rutea navigate-to-relation; antes element.fire lo tragaba) + :key en 2 paginas Suite de detalle (remount+refetch). Blast radius: aditivo y opt-in (solo openMode:route dispara nav; :key ya es patron usado en otras paginas). Backlog B-5 (createdAt col) y B-6 (onBeforeRouteLeave) documentados. → S5 cierre.
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Test cases

> **Nota de validacion (S3.T4)**: el smoke UI no pudo correr en este entorno — la app exige login por codigo OTP via email (`suite/pages/login/[tenant_id].vue`, sin storageState/creds reutilizables) y `public.Activity` esta **vacia** (0 registros; no hay versiones que listar). Lo verificable sin UI autenticada se hizo por trazado de codigo + validacion estatica. Los TC UI quedan **blocked** pendientes de smoke con sesion autenticada + datos seed.

| TC | REQ | Descripcion | Actual | Evidence | Status | Session | Cambios gatillados |
|----|-----|-------------|--------|----------|--------|---------|--------------------|
| TC-1 | REQ-01 | Tab Versiones lista N versiones (orden version DESC) | TIR101 mostro 3 versiones (v3/v2/v1) DESC, "filtrado por 1 filtro" | smoke s5-versions-list | **pass** | S4 | — |
| TC-2 | REQ-01 | 1 sola version: 1 fila sin error | 111026C mostro 1 fila (v1) sin error | smoke (s3) | **pass** | S3 | — |
| TC-3 | REQ-01 | 2+ versiones listadas | TIR101 con 3 versiones listadas | smoke s5-versions-list | **pass** | S4 | — |
| TC-4 | REQ-02 | Click en version navega a vista completa de esa version | en v3, click v1 → URL cambia (cmpzox..→cmpwow72700by) Y ficha recarga datos v1 (VERSION=1, v2022-actual, Publicado) | smoke s6-after-general | **pass** (post fix core S4) | S4 | RecordListElement.handleAction + :key |
| TC-5 | REQ-03 | Accion "Nueva version" visible con cap+allowsVersioning | columna Acciones con menu por fila presente (reuso 1:1 HU-10) | smoke + code-trace | partial (menu presente; gating no abierto) | S3 | — |
| TC-6 | REQ-03 | Accion oculta sin estado/cap | visibilityConditions allowsVersioning + requiredCapability en config | code-trace | partial (no probado por estado) | S3 | — |
| TC-7 | REQ-04 | Labels traducidos es/en/pt | render es: "Versiones/Etiqueta de version/Estado"; claves en suite/lang/{es,en,pt}@activity.json | smoke (es) + static (en/pt) | **pass** (es UI; en/pt en lang) | S3 | — |

## Backlog

| # | Item | Priority | Status | Notas |
|---|------|----------|--------|-------|
| B-1 | **SP4 — HU-11 Camino A+**: columna `badge` declarativa + `highlightCurrent` + `rowClick`-fila navegable en `record-list`/`Table.vue`/tipo `Column` (layout core). Mejora cosmetica sobre A-lite, no bloqueante | should | deferred (SP4) | Decision S1: layout core, fuera del scope A-lite. ~2-2.5 SP |
| B-2 | **SP4 — HU-11 Camino B** (opcional): panel maestro-detalle in-place al clickear fila | could | deferred (SP4) | Solo si se pide UX de navegacion in-page; arquitectura nueva |
| B-3 | **SP4/core — Editar inline en la tab de versiones**: aflojar el override read-only de listas embebidas en view-mode (`RecordDetail.vue:4138`) via flag opt-in `editableInView` + test de regresion del override + wiring del edit-nav. Layer core, rama UPONE-1206, revision team up1 | should | deferred (SP4) | Blast radius: chokepoint global, 17 listas embebidas / 3 mods. Dev eligio diferir (AskUserQuestion 2026-06-04). Workaround actual: ver version → editar desde su ficha (1 hop). Asociar a epica de layout/object-manager core |
| B-4 | **Deuda i18n — curriculum-design en_CL/pt_BR**: el mod es es_CL-only; las demas tabs/columnas quedan en espanol bajo locale en/pt. Migracion module-wide de i18n | could | open | Detectado en design HU-11. No bloqueante; esta tab entrega es/en/pt para sus claves nuevas |
| B-5 | **Columna "Fecha" (createdAt) en la tab Versiones**: la data trae `createdAt` pero el render del record-list la descarta (no esta en field-metadata de Activity como columna de lista). Investigar como exponerla, o dejar sin fecha | could | open | Detectado en smoke S3/S4. Gap menor (como "autor"); columnas entregadas: version/versionLabel/estado |
| B-6 | **`onBeforeRouteLeave` + discard-guard en paginas de detalle (core/suite)**: hoy el dirty-check solo cubre el boton Volver (`handleCancel`); navegar por link en modo edit puede perder ediciones sin confirmar. Gap pre-existente, no introducido por el :key del fix S4 | should | open | Detectado en blast-radius S4. Layer core/suite, UPONE-1206. Independiente del fix de nav |
| B-7 | **tenant via `window.location.pathname.split('/')[1]` en RecordListElement**: fragil si la app agrega pathBase. Mismo patron ya usado en RecordList.vue:3957 (no regresion nueva). Considerar helper de tenant centralizado | could | open | Detectado por reviewer aislado de cierre. Riesgo bajo en contexto actual |
| B-8 | **console.logs de debug pre-existentes en RecordListElement.vue** (lineas ~35/67-73/79): logs de setup/props en componente core. PRE-EXISTENTES (git log), no introducidos por este ticket. Limpiar en sesion de housekeeping de layout | could | open | Detectado por reviewer aislado. Deuda pre-existente; no se toca sin aprobacion (clasificado preexistente) |

## Summary

**Resultado**: HU-11 entregada y validada en vivo. Tab "Versiones" en el RecordDetail de Activity que lista la cadena completa de versiones (filtro por `code`), con i18n es/en/pt, rowAction "Crear nueva versión" (reuso HU-10), y **navegación full-page entre versiones** funcionando.

**Qué se hizo (por repo/rama):**
- **mods/curriculum-design @ UPONE-1038** (layer mod): `default_Activity_view.json` (tab + record-list versionsList) + `es/en/pt_BR@activity.json` (i18n).
- **layout @ UPONE-1206** (layer core): `RecordListElement.vue` — fix: rutea `navigate-to-relation` de listas embebidas (antes el evento se tragaba en el puente Vueform).
- **suite @ UPONE-1206** (layer core): 2 páginas de detalle — `:key` en LayoutOrchestrator (remount+refetch al cambiar de registro) + `es/en/pt_BR@activity.json` (synced).

**Escalada de scope**: nació como config-only mod (~A-lite, 2 SP published) y escaló a **mod + 2 fixes de layout core** (executed 4 SP) cuando el requisito de navegación full-page destapó dos bugs del motor (nav embebida no propagaba + reload guard). Decidido con el dev vía AskUserQuestion (blast-radius analizado en cada paso).

**Validación**: smoke en vivo con TIR101 (3 versiones) — estando en v3, clic en v1 → URL cambia + ficha recarga datos de v1. TC-1/2/3/4/7 pass; TC-5/6 partial (menú acción presente, gating no abierto en smoke).

**Reviewer aislado de cierre**: iterate → resuelto. ITERATE-1 (`_source_module` flip en suite/lang en/pt de uengagement-up1) verificado benigno (campo no leído por código; merge aditivo, claves de uengagement intactas). ITERATE-2 (console.logs en RecordListElement) pre-existente → backlog B-8.

**Pendiente (backlog, no bloqueante)**: B-1 badge/highlight, B-3 editar inline (core), B-4 i18n module-wide, B-5 columna Fecha, B-6 onBeforeRouteLeave, B-7 tenant pathBase, B-8 console.logs. Ninguno `must`.

**Cross-mod nota (DET-16)**: curriculum-design y uengagement-up1 comparten el nombre de objeto `activity` → sus i18n se mergean en `suite/lang/@activity.json`. Mis claves de versión coexisten sin colisión con las de uengagement.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **BUG core: navegacion detail→detail no recarga datos.** Al routear entre dos registros del mismo objeto/layout (cambia solo `instance_id`), Vue reusa el componente. `LayoutOrchestrator.vue:701` tiene watcher de instanceId **vacio** (no-op), y `RecordDetail.vue:4565-4571` solo refetchea `if (!schema.value)` — como el schema ya existe al navegar entre versiones, NO re-fetchea → vista stale (URL cambia, datos no). Afecta toda nav detail→detail, no solo versiones. | smoke S4 (dev + LLM) | S4 | refined | BUG-layout (pendiente) + fix S4 |

## Teaching — Intake

**Status**: done
**Archivo**: `tickets/TICKET-045.teach/teach-intake.html` (v2 HTML, validado)
**Bloques**: tldr, concept-card (4 bases), flow (mermaid del click→navegacion), callout (limites de scope), timeline (S1→S5), tag, study-qa (4)

## Teaching — Close

**Status**: done
**Archivo**: `tickets/TICKET-045.teach/teach-close.html` (v2 HTML, validado)
**Bloques**: tldr, case (la historia), timeline (evolución), comparison-table (decisiones), callout (2 bugs core + lecciones), invariant, study-qa

**Status**: pending
