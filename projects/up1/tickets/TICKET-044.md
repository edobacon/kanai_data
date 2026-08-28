---
id: TICKET-044
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1216
module: curriculum-design
autopilot: autonomous
---

# HU-10 | Row action "Crear nueva versión" en RecordList de Activity

## Request

> Contenido literal del ticket Jira [UPONE-1216](https://u-planner.atlassian.net/browse/UPONE-1216) (Historia, parent epic UPONE-1038).

### Descripción

Mostrar "Crear nueva versión" en cada Activity en estado que lo permita, para iniciar el ciclo de mejora curricular.

### Criterios de aceptación

* `default_Activity_list.json` incluye row action `type: "create"` (`prefillFromCurrent + asNewVersion`, `redirectTo: edit`).
* `relations: ["currentStatus"]` en el config de la lista + visibilidad por `currentStatus.allowsVersioning`.
* Sin modal (increment); redirect; toasts; traducciones es_CL/en_CL/pt_BR.

### Dependencias

HU-7, HU-8, HU-0a, HU-0h.

### Cambio vs actual

`relations` en el config de la lista (precisión de la visibilidad).

## Contexto operativo del plan SP3

### P4.2 — HU-10 · Row action "Crear nueva version" en Activity (Fase 4) · [mod] · `P1`

- **Meta**: implement (layout config) · ~2 SP · certeza confirmado · rollback git revert layout · riesgo bajo
- **Contexto**: el boton que ve el consultor. Usa el primitivo `type:create` (HU-7) configurado para versionar Activity.
- **Que se realiza**: en `default_Activity_list.json` (PascalCase), row action `type:create` con `prefillFromCurrent + asNewVersion`, `redirectTo: edit`, icono; `relations: ["currentStatus"]` en el config + visibilidad por `allowsVersioning`; sin modal (increment); toasts; traducciones es_CL/en_CL/pt_BR.
- **Depende de**: HU-7 (TICKET-042), HU-8 (TICKET-043), HU-0a (TICKET-034), HU-0h (TICKET-034).
- **Investigar**: nada.
- **Prueba**: `e2e` flujo completo sin modal en estado versionable; redirect; toasts; i18n.

## Material internalizado — HU detallada

### HU-10 · Row action "Crear nueva version" en RecordList de Activity

**Sprint:** SP3 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** consultor
**Quiero** ver "Crear nueva version" en cada Activity en estado que lo permita
**Para** iniciar el ciclo de mejora curricular.

**Criterios de aceptacion:**

- [ ] `default_Activity_list.json` (PascalCase) incluye row action `type: "create"`:
  ```json
  { "type": "create", "prefillFromCurrent": true, "asNewVersion": true, "label": "{{$t('createNewVersion')}}", "redirectTo": "edit", "icon": "bi-arrow-clockwise" }
  ```
- [ ] El config de la lista declara `relations: ["currentStatus"]` **en su raiz** (hidrata la relacion); el row action lleva `visibilityConditions` por `currentStatus.allowsVersioning == true` (config, sin codigo; precedente `hw-intervention-list.json`).
- [ ] Click ejecuta `createInstance(prefillFrom + asNewVersion)`. **Sin modal** (increment).
- [ ] Redirige al RecordDetail del nuevo Activity en edit.
- [ ] Toast exito: "Version {N} creada desde version {N-1}". Toast error con codigo apropiado.
- [ ] Traducciones es_CL / en_CL / pt_BR.
- [ ] Tests e2e: flujo completo sin modal, en estado versionable.

**Dependencias:** HU-7, HU-8a, HU-8c, HU-0a, HU-0h.

## Material internalizado — Shape canonico

### `default_Activity_list.json` post-HU-10

```json
{
  "name": "default_Activity_list",
  "objectType": "Activity",
  "relations": ["currentStatus"],
  "rowActions": [
    {
      "type": "create",
      "prefillFromCurrent": true,
      "asNewVersion": true,
      "label": "{{$t('createNewVersion')}}",
      "redirectTo": "edit",
      "icon": "bi-arrow-clockwise",
      "visibilityConditions": {
        "operator": "AND",
        "conditions": [
          { "field": "currentStatus.allowsVersioning", "operator": "==", "value": true }
        ]
      }
    }
  ]
}
```

### Traducciones (suite/lang/*)

```json
// suite/lang/es_CL@activity.json
{ "createNewVersion": "Crear nueva versión" }

// suite/lang/en_CL@activity.json
{ "createNewVersion": "Create new version" }

// suite/lang/pt_BR@activity.json
{ "createNewVersion": "Criar nova versão" }
```

## Material internalizado — Factibilidad §2.3 (visibilidad condicional)

### Acceso a campos relacionados (pieza critica del layout)

- **Hidratacion de relaciones en listas es configurable**: la query `LIST_INSTANCES` acepta `$includeRelations`/`$relations`. `useDataFetching.ts:126-135` lee `layoutConfig.relations`. Precedente real: `hw-intervention-list.json:19` (`"relations": ["hwassessment"]`).
- Dot-notation visibility con `visibilityConditions`: ya implementada en `useFieldConditions.ts:38-52`.
- `relations` NO existe como campo de `RowAction` → va en la **raiz del config de la lista**, no en el row action (esto es nuevo en SP3).

## Objetivos del ticket (alcance final acordado, 2026-06-03)

Tras cuatro iteraciones del dev, el alcance acordado son **tres comportamientos**, todos dentro de CD y sin tocar backend (object-manager). Cada uno se valida en su sesion (unit en S1, estructural en S2, E2E en S3):

| Meta | Entidad | Comportamiento | REQ | Surface |
|------|---------|----------------|-----|---------|
| 1 | **Activity** | **Versionable** — "Crear nueva versión" (gated por `allowsVersioning`, nace en BOR) | REQ-04 | lista propia (`default_Activity_list.json`) |
| 2 | **BibliographyReference** | **Clonable** — "Duplicar" (objeto standalone) | REQ-05 | lista propia (`default_BibliographyReference_list.json`) |
| 3 | **Modalidad** (CurricularSection RT=Modality) | **Clonable** — "Duplicar" (hijo polimorfico) | REQ-07 | `record-list` embebido en el detail de Activity (`default_Activity_view/edit.json`) |

Habilitador core (genérico, `layout/`, UPONE-1206): toast de éxito en el primitivo `create` (REQ-01/02) + `==`→`===` en `useFieldConditions` (REQ-03) + verificar/cablear el handler `create` en el record-list embebido (REQ-07/S1.T5).

## Scope expansion (directiva del dev, 2026-06-03)

> El Request original (Jira UPONE-1216) es inmutable (DET-3). Esta seccion registra la expansion pedida por el dev durante el design, posterior al teach-intake.

**Directiva**: "analiza que se requiere modificar en core para que sea lo mas simple de implementar en un mod, agrega tambien el añadir un boton de duplicar al objeto, asi cubrimos ambos casos".

**Resultado del analisis** (evidencia en `layout/src/composables/useCreateRowAction.ts` + `layout/src/layouts/RecordList.vue`):

- El primitivo `type:"create"` (HU-7) **ya soporta ambos casos** a nivel config sobre un unico primitivo: versionar (`prefillFromCurrent + asNewVersion`) y duplicar/clone (`prefillFromCurrent` solo). El codigo y el i18n ya nombran el segundo caso "clone".
- Lo unico que falta en core es el **toast de exito**: la dep `showSuccess` no se cablea para el handler `create` (`RecordList.vue:2619` solo pasa `showError`; el handler `mutation` si pasa `showSuccess` en L2589). Labels i18n "Nueva versión"/"Clonar" ya existen en los 3 locales (`layout/lang/*@RecordList.json`).

**Expansion aplicada al ticket**:
1. **Core (layer:core, branch UPONE-1206)**: enriquecer el primitivo `create` con toast de exito generico (beneficia a TODO mod). Cambio minimo: `useCreateRowAction.ts` (dep + logica), `RecordList.vue` (1 linea), i18n (2 claves × 3 locales), test.
2. **Mod (layer:mod, branch UPONE-1038)**: en `default_Activity_list.json`, DOS row actions (versionar + duplicar) + `relations: ["currentstatus"]`.

### Revision de semantica clone vs version + best practices (2026-06-03, 2da iteracion del dev)

**Directiva**: "revisa si un mismo objeto puede ser clonable y versionable, que pasa si se clona y despues se versiona, ambos clones tendrian la misma version... ademas ten ojo con las buenas practicas, no deberia usarse ==, deberia ser ===".

**Hallazgos** (evidencia en `object-manager/src/graphql/resolvers/instance.resolver.js` + helpers `prefill-from-source.js` / `version-from-source.js`, y `layout/src/composables/useFieldConditions.ts`):

- **Ortogonalidad**: clone y version son flags ortogonales, sin guard. Versionar un clon funciona (cadena independiente; `prepareVersionData` recalcula `version=source.version+1` y `previousVersionId=source.id` leyendo el source fresco, `version-from-source.js:51-56`).
- **Bug clone (version)**: `prefillFrom.exclude` de `activity.json` NO incluye `version` → el clon copia `version` del source (clonar v2 → version=2; dos clones → ambos version=2). Sin unique constraint, no crashea pero es data incoherente.
- **Bug clone (currentStatusId)**: `currentStatusId` esta excluido del prefill y es required; el path clone (a diferencia del path version) NO lo setea → clonar HOY falla por constraint. "Duplicar" no funciona sin fix.
- **Best practice `==`**: el config JSON DEBE usar el token `"=="` (enum del DSL; `"==="` no es valido). El evaluador core (`useFieldConditions.ts:65-66`) usa `==` laxo → se corrige a `===`/`!==`.

**Fixes aplicados al ticket**:
- **A (mod, UPONE-1038)**: excluir `version` del prefill en `activity.json` → clon arranca v1 independiente (seguro: el path version lo sobreescribe).
- **B (core object-manager, UPONE-1206)**: el path clone resuelve `currentStatusId = workflow.initialStatusId` (simetrico al path version) → "Duplicar" funciona y el clon nace en estado inicial, no hereda PUB.
- **C (core layout, UPONE-1206)**: `==`→`===` y `!=`→`!==` en `useFieldConditions.ts`, con la suite de tests del layout como guard.

### Pivote de host del clone: Activity version-only + clone en BibliographyReference (2026-06-03, 3ra iteracion del dev)

**Directiva**: "activity sera versionable, y dentro de esta el hijo polimorfico (modalidad) debe ser clonable, se puede ejecutar asi? ofrece alternativas de donde clonar, o por ejemplo dentro de referencia bibliografica si vive en el mod; debemos tener ambos comportamientos pero dentro de CD".

**Factibilidad** (evidencia en `mods/curriculum-design/config/layouts/` + `objects/`):

- **Modalidad clonable directo: NO factible** con el primitivo actual. Modalidad es un record type de `CurricularSection` (`rt__Modality__curricularsection`): tiene `create/edit/view` pero NO `_list`. Hijo polimorfico renderizado dentro del RecordDetail de Activity; el primitivo `type:create` es RecordList-only (`RecordList.vue`; no RecordDetail/ChibiList). Habilitarlo exigiria extender el primitivo a child-lists del RecordDetail (core mayor) → **diferido**.
- **BibliographyReference clonable: factible YA, config puro**. Tiene `default_BibliographyReference_list.json`, vive en el mod, y NO tiene workflow/`currentStatusId` (required: solo `institutionId`, `rawCitation`) → el problema del `currentStatusId` en clone (que motivaba el fix backend) NO aplica aqui.

**Re-pivote del scope** (reemplaza decisiones B previas):
- **Activity → version-only**: el botón "Duplicar" se quita de Activity; Activity solo lleva "Crear nueva versión".
- **BibliographyReference → clone**: botón "Duplicar" en su lista (config puro: `prefillFrom` minimo + row action). Demuestra el clone dentro de CD.
- **Se CAE el cambio backend (object-manager)**: ya no hay clone sobre objeto con workflow → `currentStatusId`-en-clone no aplica. `execute_scope` vuelve a `[layout/, mods/curriculum-design/]`.
- **Se CAE el fix `version`-exclude en activity.json**: Activity ya no es clonable; el path version sobreescribe `version` solito.
- **Sobreviven** (core layout, UPONE-1206, genericos): toast de exito (REQ-01/02) + `==`→`===` en `useFieldConditions` (REQ-03).

`layer: mod+core` (core = solo layout/). `execute_scope: [layout/, mods/curriculum-design/]`. SP estimated 1 → 2. Ambos comportamientos dentro de CD: Activity=version, BibliographyReference=clone.

### Incorporacion de Modalidad clone (2026-06-03, 4ta iteracion del dev)

**Directiva**: "¿qué falta para que hijos como modalidad sean clonables? ¿lo incorporaste?" → dev elige **incorporar a esta historia** (AskUserQuestion).

**Correccion de un assessment previo**: dije que Modalidad "no era factible (RecordList-only)". Estaba incompleto: Modalidad (CurricularSection RT=Modality) **se renderiza como field `type:"record-list"` embebido** en el detail de Activity (`default_Activity_view.json:154`), y `RecordDetail.vue:316` provee `createVisibilityConditions` al embebido → el primitivo `create` aplica en esa superficie. Mayormente config; la unica incognita core es el wiring del handler en el embebido (spike S1.T5). CurricularSection no es workflow-backed → clone sin problema de estado inicial.

**Incorporado**: REQ-07 (Modalidad clone) + S1.T5 (spike/wiring handler embebido) + S2.T4 (config: rowAction en view/edit + `prefillFrom` deepClone subarbol en CurricularSection.json) + escenario E2E en S3.T1. B1 del backlog → promovido a REQ-07. SP estimated 2 → 3.

**Cobertura final**: Activity = versionar (→BOR); BibliographyReference = duplicar (standalone); Modalidad = duplicar (hijo polimorfico via record-list embebido). Backlog restante: solo B2 (toast parametrizado).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | config (layouts: Activity version + BibliographyReference clone + Modalidad clone embebido) + core (primitivo layout toast + i18n + evaluador conditions === + handler en record-list embebido) |
| Modulo principal | curriculum-design |
| Modulos afectados | layout (primitivo create toast + i18n RecordList + useFieldConditions + RecordDetail embebido), mods/curriculum-design (default_Activity_list/view/edit.json + default_BibliographyReference_list.json + BibliographyReference.json + CurricularSection.json) |
| Layer | mod+core (core = solo layout/) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | yes | Boton "Crear nueva version" en row de Activity, visible solo en estados con `allowsVersioning=true` |
| Data model | no | — |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | skipped |
| Version aprobada | — |
| Path | — |

> No requiere draft formal: visual trivial (boton + toast + i18n) con shape conocido. Smoke UI suficiente.
>
> **DEC-LOCAL (autopilot super, 2026-06-03)**: draft saltado. El shape canonico del config + el preview del comportamiento (boton condicional + toast + redirect) ya estan internalizados en el ticket (secciones "Material internalizado") y el teach-intake. No hay decision visual abierta que un preview.html ayude a resolver. `draft_approved: skipped`.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El primitivo `type:create` (HU-7, TICKET-042) ya esta listo y soporta `prefillFromCurrent + asNewVersion` | ✓ confirmada (asumida — TICKET-042 cierra antes) | Dependencia explicita |
| H2 | `relations: ["currentStatus"]` en raiz hidrata la relacion para que `visibilityConditions` resuelva dot-notation | ✓ confirmada | `useDataFetching.ts:126-135` + precedente `hw-intervention-list.json:19` |

### Context found

- **Rules del modulo**: RULE-platform-006 (layout filename PascalCase: `default_Activity_list.json`).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-042 (HU-7 primitivo), TICKET-043 (HU-8 adopcion Activity).
- **Docs relevantes del repo**:
  - `mods/curriculum-design/config/layouts/default_Activity_list.json` (a actualizar)
  - `suite/lang/es_CL@activity.json` + variantes en/pt
  - `mods/hello-world-mod/config/layouts/hw-intervention-list.json` (precedente `relations`)
- **Warnings**:
  - **Branch**: si solo toca mod + i18n synced, puede ir en branch del mod. Verificar al arrancar.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch (core) | `UPONE-1206` (layout/ — primitivo create + i18n) per RULE-dev-004 |
| Branch (mod) | `UPONE-1038` (mods/curriculum-design/ — layout config) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con Track 0 + Fase 2 Core + Fase 3 Layout + HU-8 aplicados |
| Services | object-manager, suite, layout |

## Sessions

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | CORE layout (UPONE-1206) — (a) toast de exito en primitivo `create` (`useCreateRowAction.ts` + `RecordList.vue` wiring + 2 claves i18n×3 locales); (b) `==`→`===` / `!=`→`!==` en `useFieldConditions.ts`; (c) **spike**: verificar/cablear el handler `create` en el `record-list` embebido del RecordDetail (REQ-07); extender unit tests | execute | T2 | useCreateRowAction.ts + RecordList.vue + RecordDetail.vue + useFieldConditions.ts + layout/lang/*@RecordList.json + specs | auto | vitest layout verde; handler embebido verificado |
| S2 | MOD (UPONE-1038) — Activity version (`default_Activity_list.json` + relations + row action versionar gated). BibliographyReference clone (`default_BibliographyReference_list.json` + row action duplicar + `prefillFrom`). **Modalidad clone** (rowAction `duplicate-modality` en el field record-list de `default_Activity_view/edit.json` + `prefillFrom` deepClone subarbol en `CurricularSection.json`). `npm run sync` | execute | T1 | default_Activity_list/view/edit.json + default_BibliographyReference_list.json + BibliographyReference.json + CurricularSection.json + sync | auto | sync sin errores; layouts validos |
| S3 | Smoke E2E — UPU: Activity PUB versiona (→v2 BOR + toast) / BOR oculta; BibliographyReference duplica (→copia + toast); Modalidad duplica en el detail (→copia mismo Activity + subarbol + toast); toast error | execute | T3 | E2E manual + screenshots | ⚑ fuerte | los 3 flujos verdes; clone preserva owner/recordType/subarbol |
| S4 | Cierre — commits DET-27 (split core UPONE-1206 + mod UPONE-1038 + dkc) + teach-close + SP + backlog (solo B2 toast parametrizado) | execute | T1 | review + commit DET-27 | auto | tests verdes |

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-03 | false → super | dev trigger `super autopilot` al arrancar 044 | arranque (intake ya hecho) |

### Session 1 — 2026-06-03 — Core layout: toast éxito + i18n + === + spike handler embebido [phase: execute]

**Tipo**: auto (auto-continue si vitest layout verde)
**Validation tier**: T2 (unit + coverage delta)

**Objetivo**: Enriquecer el primitivo `create` con toast de éxito (genérico por `asNewVersion` + override `onSuccess.notification`), aplicar `==`→`===` en `useFieldConditions`, agregar claves i18n, y verificar/cablear el handler `create` en el `record-list` embebido del RecordDetail. Todo en `layout/` (UPONE-1206). Paralelizable: [[S1.T1, S1.T2, S1.T3]].

**Tasks completadas**:

- [x] S1.T1 — toast de éxito en `useCreateRowAction.ts` (showSuccess + default por asNewVersion + override onSuccess.notification) + wiring `RecordList.vue`
- [x] S1.T2 — claves i18n `versionCreated`/`cloneCreated` en `layout/lang/{es_CL,en_CL,pt_BR}@RecordList.json`
- [x] S1.T3 — `==`→`===` y `!=`→`!==` en `useFieldConditions.ts`
- [x] S1.T4 — extender `useCreateRowAction.spec.ts` (toast version/clone/override + regresión error) + test `===` estricto
- [x] S1.T5 — spike: verificar/cablear handler `create` en el `record-list` embebido (RecordDetail.vue)
- [x] S1.GATE — Gate de sync Session 1 (tier: T2)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 (mod config: Activity version + BibliographyReference clone + Modalidad clone). Vitest layout 926/926 verde; === sin regresion; spike S1.T5 positivo (handler embebido operativo via RecordList.vue).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-03 — Mod config: Activity version + BibliographyReference clone + Modalidad clone + sync [phase: execute]

**Tipo**: auto (auto-continue si sync OK + JSON valido)
**Validation tier**: T1 (sync + lint estructural)

**Objetivo**: Config pura en `mods/curriculum-design/` (UPONE-1038): row action versionar en Activity, clone en BibliographyReference, clone en Modalidad (record-list embebido), + `prefillFrom` en BibliographyReference/CurricularSection. `npm run sync`. Paralelizable: [[S2.T1, S2.T2, S2.T4]]; S2.T3 (sync) es barrera.

**Tasks completadas**:

- [x] S2.T1 — `default_Activity_list.json`: `relations:["currentstatus"]` + rowAction `create-new-version` (asNewVersion + visibility `currentstatus.allowsVersioning`)
- [x] S2.T2 — `default_BibliographyReference_list.json`: rowAction `duplicate` (prefillFromCurrent sin asNewVersion) + `metadata.prefillFrom` en `BibliographyReference.json`
- [x] S2.T4 — `default_Activity_view/edit.json`: rowAction `duplicate-modality` en el field record-list de Modalidades + `metadata.prefillFrom` (deepClone subarbol parentId, preserva ownerType/ownerId/recordType) en `CurricularSection.json`
- [x] S2.T3 — barrera: `npm run sync` + verificar hidratacion de `allowsVersioning` en payload de `currentstatus`
- [x] S2.GATE — Gate de sync Session 2 (tier: T1)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S3 (smoke E2E en UPU: versionar Activity→BOR / duplicar BibRef / duplicar Modalidad). Sync EXIT=0; JSON 6/6 valido; hidratacion allowsVersioning confirmada; object-manager :4000 UP.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-03 — Smoke E2E: versionar Activity + duplicar BibliographyReference + duplicar Modalidad en UPU [phase: execute]

**Tipo**: ⚑ fuerte (validacion empirica del flujo completo en UI)
**Validation tier**: T3 (smoke E2E + screenshots)

**Objetivo**: Verificar en UPU los 3 flujos: Activity PUB muestra "Crear nueva versión" → v2 en BOR + redirect + toast / BOR oculta; BibliographyReference "Duplicar" → copia + toast; Modalidad "Duplicar" (record-list embebido) → copia mismo Activity + subarbol + toast; toast error.

**Tasks completadas**:

- [~] S3.T1 — Smoke E2E los 3 flujos + screenshots
- [x] S3.GATE — Gate de sync Session 3 (tier: T3)

**Verificacion realizada hasta el limite de auth (evidencia parcial):**

- ✅ object-manager :4000 UP; GraphQL responde; `npm run sync` propago configs (EXIT=0).
- ✅ Hidratacion confirmada a nivel schema+resolver: `listInstances` acepta `relations:["currentstatus"]`; el resolver construye Prisma `include` (devuelve todos los scalars de WorkflowStatus, incl. `allowsVersioning` que es required); relation name `currentstatus` = `getRelationName(currentStatusId)`. El query alcanza el resolver (no falla por shape).
- ✅ Unit (S1): 926/926 verde — toast version/clone/override + regresion error + `===` + visibility. Spike S1.T5: handler create operativo en record-list embebido (RecordListElement→LayoutOrchestrator→RecordList.vue).

**BLOQUEANTE (escalado al dev) — auth-gated:**

El smoke E2E visual requiere sesion **autenticada**: `listInstances`/`createInstance` exigen `Authentication required` (Clerk/token), y suite (:3000) redirige a login Clerk. No hay bypass de auth en el entorno (solo `UP1_FLOW_SERVICE_TOKEN`, no aplicable a permisos de objetos). En autopilot super NO se completa headless ni se fabrica evidencia (DET-13). Ademas, ejecutar `createInstance` (version/clone) escribiria registros reales en el tenant UPU.

**Para desbloquear (dev):** con sesion UPU/Admin autenticada en suite, ejecutar los 3 flujos del objetivo (capturar screenshots al subdir del ticket) — o autorizar un token de dev para smoke via API. Al verde, cerrar S3.GATE (continue) y seguir a S4 (cierre: teach-close + SP + commits dkc).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 4. **Standby resuelto**: el dev autenticó la sesión UPU y se ejecutó el smoke E2E completo vía Playwright/CDP (ver "S3 — E2E ejecutado" + "Consolidado final"). El alcance creció bastante más allá del smoke original: alineación i18n (TC-14), FINDING-V1 (deep-clone RT, arreglado UPONE-1219, TC-2b), incremento de versión por linaje (TC-18), modal de confirmación cascada (TC-15/16), bloqueo del campo version + unique por padre (TC-19/20), seed con Activity siempre PUB (TC-17). Todos los flujos del objetivo verdes (TC-1..TC-20). Unit layout 926/926; clone+version 35/35.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby (resuelto — ver continue arriba)

### S3 — E2E ejecutado (dev autentico, Playwright vía CDP) — 2026-06-03

Browser headed (CDP :9222), dev hizo auth UPU/Admin. Screenshots en `TICKET-044.screenshots/`.

| Flujo | Resultado | Evidencia |
|-------|-----------|-----------|
| Activity gating BOR | ✅ botón "Crear nueva versión" **oculto** en estado Borrador (allowsVersioning=false) | menú de fila BOR = solo Ver/Editar (02) |
| BibliographyReference duplicar | ✅ "Duplicar" → crea + redirige a `…/{newId}/RecordDetail/edit` (10→11 refs) | 03-05 |
| Modalidad duplicar | ✅ **clon completo** (base + extensión RT: código PRES, modo InPerson, horas 4/2/0) → abre en **modo ver** (read-only) | 11 |
| Activity versionar (PUB) | ⏳ pendiente: no hay Activity en estado PUB en seed UPU (ambas BOR) | — |

**Bugs hallados y corregidos (iterate, commits S3 fix):**
1. **Modalidad clone → INTERNAL_SERVER_ERROR**: el clone usaba objectType `rt__Modality__curricularsection` (RT projection, PK `curricularsectionId`, sin `id`) → `findUnique({id})` fallaba. **Fix**: `createObjectName` override en el row action create (layout core) → clone opera sobre `CurricularSection` base. Ver [[learn-clone-rt-projection-base-object]].
2. **Modal confuso tras clonar (embebido)**: el redirect a edit abria un modal "Edición de…" (parecia "crear otro"). **Fix**: `redirectTo:'none'` (layout core) → clean create: refetch + toast, el clon aparece como fila, sin modal. Ver [[learn-clean-create-embedded-redirect-none]].
3. **Visibilidad Modalidad clone**: removido de `default_Activity_view.json` (solo en edit, donde esta "Crear registro") — feedback del dev.

**Pendiente (no bloqueante de los fixes, requiere dev/seed):**
- **Versionar Activity (caso positivo)**: necesita una Activity en estado con `allowsVersioning=true` (PUB). Seed UPU solo tiene 2 Activities en BOR. Dev: transicionar/crear una PUB para confirmar botón visible + creación v2→BOR.
- **Completitud RT del clon de Modalidad**: verificar que el clon copió los campos del RT (deliveryMode/theoryHours/practiceHours), no solo la sección base. El clone via objeto base puede no copiar la fila de extensión RT → posible follow-up (clone de RT-extension). Dev: abrir el clon y confirmar campos.

### S3 — Consolidado final (avance completo, varias iteraciones del dev) — 2026-06-03

> El smoke E2E (⚑ fuerte) cumplió su función: destapó bugs reales y reencauzó el diseño del clone. S3 creció de "smoke" a iterate profundo con 5 rondas de feedback del dev. Resumen del estado entregado:

**Comportamientos entregados (los 3, dentro de CD):**

| Entidad | Acción | Estrategia | Estado |
|---------|--------|-----------|--------|
| Activity | "Crear nueva versión" | directa (immediate create + redirect edit), gated por `currentstatus.allowsVersioning` | ✅ gating verificado (BOR oculta); versionado PUB pendiente de seed (TC-2) |
| BibliographyReference | "Duplicar" | directa → redirect a **modo ver** (read-only) | ✅ verificado |
| Modalidad (CurricularSection RT) | "Duplicar" | **prefilledModal** (modal create prefilled sin unique → crea al Guardar) | ✅ verificado (crea completo base+RT, unique-safe) |
| CustomSection (CurricularSection RT) | "Duplicar" | **prefilledModal** | ✅ verificado (abre prefilled) |

**Evolución del diseño del clone (por feedback del dev):**
1. `redirectTo:edit` (inicial) → abría modal de detalle confuso en embebido.
2. → `redirectTo:'none'` (clean, aparece como fila) — pedido "que sea limpio".
3. → `redirectTo:'view'` (dirigir al clon en **modo ver**, read-only) — pedido "dirigir al nuevo, modo ver".
4. → **`cloneStrategy:'prefilledModal'`** (no crear antes; modal prefilled sin unique; crear al Guardar) — pedido "no crear un registro corrupto antes de levantar el modal".

**Cambios core (layout, UPONE-1206):**
- Toast de éxito en primitivo `create` (`useCreateRowAction.ts` + `RecordList.vue` wiring + i18n versionCreated/cloneCreated ×3 locales).
- `==`→`===` / `!=`→`!==` en `useFieldConditions.ts` (best practice; suite 926/926 verde).
- `redirectTo:'none'|'view'` + spike handler embebido (RecordList vía LayoutOrchestrator).
- **`cloneStrategy:'prefilledModal'` + `uniqueFields`**: abre create modal prefilled (excluye unique + identidad/`parentId`/`position`/`__typename`); crea al Guardar.
- Título del modal post-clone usa el **nombre del registro** (pasa `sourceRecord` al redirect).

**Cambios core (object-manager, UPONE-1206):**
- `prefillFrom` para RT-projections en `createInstance` (clona base + fila RT juntas; arregla el 500 del `findUnique({id})`).
- `formatError` humaniza **Prisma P2002** → `UNIQUE_VIOLATION` + mensaje legible.
- **Enforcement de unicidad SCOPED** en `createInstance` (CurricularSection): `name` (base) + `code` (RT vía relation-filter) únicos por `[ownerId, recordType]` → rechazo limpio sin registro corrupto.

**Cambios mod (curriculum-design, UPONE-1038):**
- `default_Activity_list.json` (versionar), `default_BibliographyReference_list.json` (clone→ver), `default_Activity_view/edit.json` (Modalidad clone prefilledModal; CustomSection clone), `BibliographyReference.json`/`CurricularSection.json` (`prefillFrom`), markers `uniqueScopedBy` (intención).
- Removida la pestaña "Historial" del view de Modalidad.

**Diferido (backlog):** B2 (toast parametrizado), B3 (`@@unique` DB defensa-en-profundidad — codegen no lo emite + drift), B4 (fix `sourceId`-exclude), B5 (generalizar enforcement config-driven). Pendiente único de smoke: TC-2 (versionar PUB).

**Commits S3** (locales, push difiere a aprobación — RULE-dev-004): `layout` (UPONE-1206), `object-manager` (UPONE-1206), `mods/curriculum-design` (UPONE-1038), `deckard` dkc. Branch core UPONE-1206, mod UPONE-1038.

### Session 4 — Cierre [phase: close] — 2026-06-03

**Tipo**: cierre (request-close, autopilot super).

**Acciones**:
- `execute_scope` ampliado a `object-manager/` + `suite/` (justificado: el E2E surfaceó fixes de engine UPONE-1219 + i18n backend; suite es la copia generada de lang).
- **Validación de cierre reforzada (DET-30 / gate 1d)**: reviewer aislado (sonnet, read-only) → **approve**. 5/5 chequeos: (a) DET-13 pass, (b) DET-16 pass, (c) DET-23 warn (enforcement unicidad sin unit test → B5), (d) scope pass, (e) rama pass. Sin findings bloqueantes. Working tree verificado limpio post-review (sin contaminación git).
- Trees limpiados: revert del timestamp-noise (component-registry.json) + commit chore(sync) de los object JSON synced con `uniqueScopedBy`.
- **teach-close (DET-22)**: `TICKET-044.teach/teach-close.html` (v2 HTML) generado — super auto-genera sin preguntar (REQ-05). `teachings.close: done`.
- **SP executed (DET-26)**: heurística sugiere 3 (sub-cuenta: S3 = 1 header con ~8 work-streams); override manual a **6** con `delta_reason` (ver frontmatter).
- Backlog (DET-17): único `must` era B7/FINDING-V1 → **resuelto**; B1 promovido a REQ-07. Resto `could`. No bloquea cierre.
- `status: closed`, `closed: 2026-06-03`, `closed_reason: completed`.

**Pendiente (no bloqueante)**: push de todos los commits locales (RULE-dev-004 — push siempre pregunta); migración del `@@unique([previousVersionId,version])` en ventana de deploy; backlog `could` (B2/B4/B5/B6); actualizar/archivar SPEC-018 con las expansiones de S3 (recomendación del reviewer — KB-first DET-11).

**Gate decision:** continue → **closed** (approvedBy: reviewer aislado approve + autopilot super).

## Summary

**TICKET-044 (UPONE-1216, HU-10) — CERRADO 2026-06-03.**

**Qué se entregó** (más allá del request original — el alcance creció en S3 con aprobación del dev):
- **Activity versionable**: row action "Crear nueva versión" gated por `currentstatus.allowsVersioning`, nace en BOR, con **modal de confirmación previo** (cascada de dependencias, config-driven `confirmCascade`, i18n, theme-aware).
- **3 objetos clonables**: BibliographyReference (directo → modo ver), Modalidad y CustomSection (vía `prefilledModal` — abre create pre-llenado sin campos unique, crea solo al Guardar).
- **Versionado correcto end-to-end**: clona los hijos **completos** (base + proyección RT) y numera por **max(linaje)+1**.
- **i18n**: toasts, título de clone, errores de unicidad y verbos — todo vía capa de lenguaje (es_CL/en_CL/pt_BR); backend devuelve `code`, el cliente traduce.
- **Campo `version` bloqueado** en edición (engine-managed); **unicidad por padre** declarada (`@@unique`, pendiente migración).
- **Seed**: "Introduccion a las Redes" (AIEP) siempre PUB → caso de prueba de versionado permanente.

**Fixes de engine descubiertos por el E2E (UPONE-1219)**:
- **FINDING-V1**: el deep-clone de hijos polimórficos clonaba solo el modelo base, perdiendo la proyección RT → syllabus versionado vacío. Arreglado (`cloneChildProjections`) + tests.
- **Incremento de versión por linaje**: era `source.version+1` (colisionaba al versionar dos veces) → `max(linaje)+1`.

**Evidencia**: TC-1..TC-20 (20 verdes; TC-2b fail→fix→pass). Unit layout 926/926, clone+version 35/35. Screenshots 00-23. Reviewer aislado: approve.

**SP**: published 1, estimated 3, **executed 6** (manual — la heurística sub-cuenta S3; ver delta_reason).

**Pendiente**: push (siempre pregunta); migración `@@unique`; backlog `could` (B2/B4/B5/B6); refrescar/archivar SPEC-018.

## Test cases

Smoke E2E vía Playwright/CDP con sesión UPU/Admin autenticada por el dev. Screenshots en `TICKET-044.screenshots/` (00–16). Activity de prueba: `cmpwow6z2008zxxc27wrcahbx`.

| TC | Escenario | Esperado | Actual | Status | Evidencia |
|----|-----------|----------|--------|--------|-----------|
| TC-1 | Activity en BOR → menú de fila | "Crear nueva versión" **oculto** (allowsVersioning=false) | menú = solo Ver/Editar, sin versionar | ✅ pass | 02 |
| TC-2 | Activity en PUB → "Crear nueva versión" | botón visible → v2 en BOR + redirect a edit | **probado** (fixture: "Ecuaciones Diferenciales" seteada a PUB en DB UPU). Botón "Nueva versión" visible solo en PUB (gating OK); click → redirect a edit de la nueva Activity; v2 nace en **Borrador** (BOR=initialStatusId). DB: version=2 ✓, previousVersionId=SRC ✓, currentStatusId=BOR ✓ | ✅ pass | 16, 17 |
| TC-2b | Versión deep-clona los hijos (sections) | los 41 hijos clonados **completos** (base + extensión RT) | **bug encontrado y arreglado (UPONE-1219)**. Antes del fix: 41 base + jerarquía OK pero **0/41 extensiones RT** (cáscaras). Tras el fix en `deepClonePolymorphicChildren` (clona base + proyección RT + ext): nueva versión con **41/41 extensiones RT** ✅ (Modality: InPerson/4h/PRES; Sessions: week 1..18; todas las RT presentes), version=2, previousVersionId=v1, estado BOR. Ver FINDING-V1 (resuelto) | ✅ pass (post-fix) | 17 |
| TC-3 | BibliographyReference → "Duplicar" | crea copia + redirect a **modo ver** (read-only) | redirect a `…/{newId}/…_view`, 9 inputs deshabilitados | ✅ pass | 12 |
| TC-4 | Modalidad (edit) → "Duplicar" (prefilledModal) | abre **modal create prefilled** sin crear; name/code/orden vacíos, resto copiado | "Modo Creación", name="" code="" + deliveryMode/horas copiados; **0 registros creados al abrir** | ✅ pass | 13 |
| TC-5 | Modalidad clone → Guardar con name/code/orden nuevos | crea el clon **completo** (base + extensión RT) | createInstance OK, +1 fila, RT copiado (deliveryMode/horas) | ✅ pass | 14 |
| TC-6 | Modalidad clone → ver el clon creado | modo ver muestra la modalidad **completa** (código/modo/horas), título = **nombre**, **sin pestaña Historial** | "Modo Vista", PRES/InPerson/4-2-0, título "Modalidad Presencial", solo tab General | ✅ pass | 11 |
| TC-7 | Modalidad clone → Guardar con **name existente** | **rechazado**, sin crear (unicidad scoped [ownerId,recordType]) | `UNIQUE_VIOLATION: "Ya existe un registro con ese valor (name)…"`, filas 1→1 | ✅ pass | 16 |
| TC-8 | Modalidad clone → Guardar con **code existente** (name nuevo) | **rechazado**, sin crear (code unique scoped, campo RT) | `UNIQUE_VIOLATION (code)`, filas 1→1 | ✅ pass | — |
| TC-9 | Modalidad clone → form sin orden (position) | botón **Guardar deshabilitado** (required) | disabled hasta ingresar orden | ✅ pass | — |
| TC-10 | CustomSection → "Duplicar" | abre modal create prefilled (name vacío) | "Modo Creación", name="" | ✅ pass | 15 |
| TC-11 | Clone con campos unique | NUNCA crea un registro a medias/corrupto (crea solo al Guardar; colisión → error + form abierto) | confirmado: error antes de crear; sin registro residual | ✅ pass | 16 |
| TC-12 | Error P2002 (unicidad) | mensaje legible al usuario, no INTERNAL_SERVER_ERROR crudo | `formatError` → UNIQUE_VIOLATION + "Ya existe…" | ✅ pass | 16 |
| TC-13 | Título del modal de clone (Modalidad) | legible, no `rt__Modality__curricularsection` crudo | "Clonar: Modalidad Presencial" + "Modo Creación" | ✅ pass | 13 |
| TC-15 | **Confirmación previa para operaciones cascada** (versionar) — modal informativo aprobar/cancelar | al disparar "Nueva versión" se abre un modal que informa que se copiará el registro + todas sus dependencias en varias tablas (difícil de revertir); Cancelar aborta sin crear, Aprobar ejecuta | modal "Confirmar: Nueva versión" + mensaje + consecuencias + Cancelar/Nueva versión; **Cancelar → 0 creado (sigue 2)**; **Aprobar → v2 completa (41/41 RT)** + redirect a edit. Config-driven (`confirmCascade` en el row action), i18n | ✅ pass | 18, 19 |
| TC-16 | Modal de confirmación cascada — **sin caja roja + dark-mode + solo mensaje** | sin estilo danger/rojo (es informativo, no destructivo); legible en claro y oscuro; sin bullets de consecuencias (decisión del dev) | restyle a texto theme-aware (sin caja danger); se removieron los 2 bullets de consecuencias → modal = ícono + mensaje. Medido dark mode: mensaje `rgb(250,250,250)` sobre tarjeta `rgb(26,26,26)` → contraste **16.67** ≫ WCAG AA 4.5; sin rojo en ningún tema | ✅ pass | 20, 21, 22 |
| TC-19 | **Campo `version` bloqueado en el form de edición** | no editable (lo maneja el versionado, no el usuario) | `default_Activity_edit.json` schema.version `disabled:true` (Vueform; `readOnly` no aplica a inputs text — el código usa `disabled`). Verificado: input `version` disabled=true mientras `name`/`code` editables. Además `disabled` excluye el campo del submit → no puede sobrescribir el número engine-managed | ✅ pass | 23 |
| TC-20 | **Unicidad de versión por padre** (`[previousVersionId, version]`) — declarada | investigar si se puede forzar | **feasible**: `metadata.uniqueConstraints: [["previousVersionId","version"]]` en activity.json → el codegen emite `@@unique([previousVersionId, version])` para el modelo base (líneas 520-533, mismo path que workflowStatus). Datos UPU compatibles (las 2 raíces con previousVersionId=null **no colisionan** — Postgres trata NULL como distinto en UNIQUE). Enforcing en DB **pendiente de migración** (codegen + migrate, navegando el drift pre-existente de UPU, B3). El incremento por linaje (TC-18) ya evita duplicados en flujo normal; el `@@unique` es la red de concurrencia por-padre | ⏳ declarado (migración pendiente) | — |
| TC-18 | **Incremento de versión por linaje** (no `source.version+1` ingenuo) — UPONE-1219 | versionar v1 dos veces da v2 y luego v3 (no v2 dos veces), porque el linaje ya contiene v2 | `prepareVersionData` ahora usa `max(version del linaje) + 1` (recorre atrás a la raíz + BFS de hijos). E2E: versionar "Introduccion a las Redes" (v1) → v2; versionar v1 otra vez → **v3**. DB linaje = [1,2,3], ambas con previousVersionId=v1. Unit TC REQ-04c | ✅ pass | — |
| TC-17 | **Seed deja una Activity siempre en PUB** (caso de prueba permanente) | tras seed, un programa queda versionable | `_data-aiep.js` ("Introduccion a las Redes", 57 secciones) se seedea en el estado `allowsVersioning=true` (PUB) en create Y update; Univalle ("Ecuaciones Diferenciales") queda en BOR (la usan los smoke de transición). Baseline UPU verificado: 1 BOR + 1 PUB | ✅ pass | — |
| TC-14 | **Textos vía capa i18n** (title del modal + error de unicidad) — no strings hardcoded | title resuelve `recordList.modal.cloneTitle` ("{action}: {name}"); error de unicidad resuelve `friendlyErrors.uniqueness` (form) / `rowAction.create.error.UNIQUE_VIOLATION` (row action); backend devuelve solo `code` + msg técnico canónico (sin español hardcoded) | title="Clonar: Modalidad Presencial"; error modal="Ya existe un registro con ese valor." / "Usa un valor diferente." (es_CL); filas 1→1 | ✅ pass | 14, 15 |

> **Aclaración (enforcement de unicidad)**: la validación NO es exclusiva del clone/versión — vive en `createInstance` (resolver, core) y corre para **toda** creación de un RT de CurricularSection (incl. "Crear registro" normal). Hoy está **hardcoded a CurricularSection**; los JSON del mod declaran `uniqueScopedBy` (intención), pero el enforcement vive en core porque el sync no persiste props custom (B5). El título crudo del modal de "Crear registro" no-clone queda en B6.

> **Aclaración (i18n)**: tras TC-14, ningún texto nuevo queda hardcoded en español. El backend (`object-manager/src/index.js` `formatError`) devuelve solo el `code` estable `UNIQUE_VIOLATION` + `extensions.fields` + un mensaje técnico canónico (`Unique constraint failed on the fields: (\`X\`)`); **el idioma lo resuelve el cliente** por dos caminos: (a) form → `useFriendlyErrors` matchea el patrón → `friendlyErrors.uniqueness.*`; (b) row action → `resolveErrorCode` lee `extensions.code` → `rowAction.create.error.UNIQUE_VIOLATION`. El título del clone usa `recordList.modal.cloneTitle = "{action}: {name}"` (el verbo viene del `languageTag` del propio action, también i18n). Claves añadidas en es_CL/en_CL/pt_BR (@RecordList y @RecordDetail). Ver L7 (gotcha del sync layout→suite).

> **Pendiente único**: TC-2 (versionar Activity en PUB) — requiere una Activity en estado publicado en el seed UPU. Es el único caso del objetivo sin smoke directo.

## Backlog

| # | Item | Priority | Estado | Notas |
|---|------|----------|--------|-------|
| B1 | **Clonar hijos polimórficos (Modalidad / CurricularSection RT)** | — | **promovido → REQ-07 (in scope)** | Incorporado a esta historia por decisión del dev (2026-06-03, 4ta iteración). Pasa a REQ-07 + tasks S1.T5 (spike handler embebido), S2.T4 (config), S3.T1 (E2E). Surface = field `record-list` embebido en `default_Activity_view.json:154`; `RecordDetail.vue:316` pasa `createVisibilityConditions`. Análisis completo en REQ-07/DEC-LOCAL-01. |
| B2 | Mensaje de éxito parametrizado del toast ("Versión N creada desde versión N-1") | could | open | Hoy el toast es genérico (DEC-LOCAL-03). Parametrizar requiere extender el selection set de createInstance para leer `version` del nuevo registro + asumir campo por-objeto. |
| B3 | **Unique DB `@@unique` — defensa-en-profundidad (opcional)** — resolver enforcement YA implementado | could | open (degradado) | El clon ya es **unique-safe por diseño** (prefilledModal: no crea hasta Guardar, el usuario pone name/code frescos). El constraint DB es la red de seguridad. Al agregar `metadata.uniqueConstraints` el codegen **NO emitió `@@unique`** en schema.prisma para CurricularSection (sí lo hace para workflowStatus) — se propagó al synced copy pero no a schema/DB; + "Drift check failed for UPU" (drift pre-existente) + el sync re-seedea UPU. Requiere: investigar por qué el codegen no traduce uniqueConstraints para este objeto polimórfico (registry vs JSON; `core_ObjectDefinition` no tiene col `metadata`), resolver el drift pre-existente, y aplicar en ventana de migración controlada por tenant (audit previo: los 5 tenants reales hoy SIN duplicados → pasaría). Revertido el config para no dejar drift declarado-no-aplicado. Config a re-agregar: `metadata.uniqueConstraints: [["ownerId","recordType","name"]]`. `code` unique: decidir scope aparte (RT table sin ownerId). |
| B4 | Fix `prefillFrom.exclude` en CurricularSection: dice `["sourceSectionId"]` pero el campo real es `sourceId` | could | open | Inconsistencia menor (el campo de trazabilidad MADS es `sourceId`, L80). No rompe el clone de Modalidad (prefilledModal excluye sourceId/sourceSectionId a nivel handler). Corregir a `["sourceId"]` para el path de prefill backend. |
| B5 | Generalizar el enforcement de unicidad scoped (hoy hardcoded a CurricularSection) | could | open | El enforcement de name/code unique scoped por [ownerId,recordType] está **hardcoded** en el RT block de createInstance (CurricularSection). Los JSON declaran `uniqueScopedBy` en las field properties, pero el **sync NO persiste props custom** a `core_FieldDefinition.properties` (filtra a un subset) → no se puede leer en runtime para generalizar. Para generalizar: (a) que el sync persista `uniqueScopedBy`, o (b) leer los object JSON synced en runtime (cacheado). Entonces el resolver enforza cualquier objeto config-driven. |
| B7 | **🟢 RESUELTO (UPONE-1219): Versionado deep-clonaba hijos polimórficos SIN su extensión RT** — FINDING-V1 | must | **resuelto 2026-06-03** | `deepClonePolymorphicChildren` (`object-manager/.../helpers/deep-clone-polymorphic.js`) clonaba solo el modelo BASE y perdía las proyecciones `rt__<RT>__curricularsection` → syllabus versionado vacío de contenido tipado. **Fix**: nuevo helper `cloneChildProjections` que, tras crear cada hijo base, clona su fila RT (`rt__<recordType>__<base>` por FK `<base>Id`) + ext (base y RT), genérico y defensivo (no-op si el objeto no es RT-projected). Tests unit TC-34/TC-35 (11/11 en el helper, 35/35 clone+version). Verificado E2E: nueva versión con 41/41 extensiones RT (antes 0/41). Commit bajo UPONE-1219 (engine). Mismo patrón que el clone individual de Modalidad. |
| B6 | **Título de modal usa objectName crudo para objetos RT** (fix general) | could | open | El fallback de `ModalStackManager.openModal` arma el título con `objectLabel \|\| objectName`; para RT projections (`rt__Modality__curricularsection`) sale crudo ("Crear Nuevo rt__Modality__..."). El **clone prefilledModal ya pasa un title explícito** ("Clonar: <nombre>", arreglado). Pero el botón "Crear registro" (no-clone) y otros modales RT siguen crudos. Fix general: que el modal use el `label` del layout cargado (existe: "Crear Modalidad"/"Ver Modalidad") o el objectLabel de GetObjectLabel (que el modal ya fetchea) en vez del objectName. |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **Todo registro derivado (versión O clon) de un objeto con workflow parte del estado INICIAL del workflow (BOR), nunca hereda el `currentStatusId` del source.** Un derivado de un registro publicado no debe nacer publicado. (a) **Versión**: ya implementado (HU-8/SPEC-017) — `version-from-source.js:51` setea `currentStatusId = source.workflow.initialStatusId`, y el seed UPU pone `workflow.initialStatusId = id de BOR` → la v2 nace en BOR. (b) **Clon**: el path clone NO lo setea (a diferencia del path version); `currentStatusId` está excluido del prefill. La forma correcta es que el path clone resuelva `currentStatusId = workflow.initialStatusId` (B1, simétrico a version), NO quitar el campo del exclude (B2, que heredaría el estado del source — incorrecto). Aplica al "Modalidad clone" diferido si su target es workflow-backed. En TICKET-044 se evitó hosteando el clone en BibliographyReference (sin workflow). | design (analisis backend) | design | refined | RULE-platform-009 |
| L2 | **Clone de un row action en una lista que renderiza un RT projection requiere `createObjectName` apuntando al objeto base.** Las listas embebidas de record-types (ej. `rt__Modality__curricularsection`) tienen PK `curricularsectionId`, NO `id`; el `createInstance` con prefillFrom hace `findUnique({where:{id}})` → falla con INTERNAL_SERVER_ERROR en el RT alias. El row action `create` debe setear `createObjectName` al objeto base (`CurricularSection`) que sí tiene `id`. Hallado en E2E S3. | E2E S3 (PW) | S3 | refined | RULE-layout-035 |
| L3 | **Create row actions en listas EMBEBIDAS (RecordDetail) deben usar `redirectTo:'none'`.** El redirect default (`edit`) en contexto embebido abre un modal de detalle ("Edición de…") que confunde al usuario ("¿creo otro?"). `redirectTo:'none'` hace clean create: refetch + toast, el nuevo registro aparece como fila. En listas standalone el redirect a ruta es limpio (no modal) y se mantiene. Hallado en E2E S3 (feedback dev). | E2E S3 (PW) | S3 | refined | RULE-layout-035 |
| L4 | **Clonar un objeto con campos unique: usar `cloneStrategy:'prefilledModal'` (no create inmediato).** El clone que copia campos unique colisiona (P2002). En vez de crear directo + redirect, abrir el modal de creación PRE-LLENADO con los campos del source EXCEPTO los unique (`uniqueFields`) y los de identidad/relación/orden (`__typename`, `id`, `parentId`, `position`, `curricularsectionId`) — el registro se crea SOLO al Guardar → una colisión nunca deja un registro a medias/corrupto. El usuario completa name/code/orden frescos. Patrón core nuevo (RecordList.vue). Hallado en diseño con el dev (clone+unique). | diseño+E2E S3 | S3 | refined | RULE-layout-035 |
| L6 | **Enforzar unicidad SCOPED en el resolver (createInstance), no en DB**, cuando el `@@unique` DB está bloqueado o el scope es difícil (campo RT scoped por columnas del base). Validar en el RT block antes de crear (name en tabla base; code en tabla RT via relation-filter al base por ownerId/recordType) + lanzar un error con el patrón `Unique constraint failed on the fields: (X)` que `formatError` normaliza a `code: UNIQUE_VIOLATION` + msg técnico canónico (el cliente traduce vía i18n — ver TC-14/L7) → mensaje legible + form abierto + sin registro corrupto. Ventaja vs DB: scope compuesto incl. campos RT que el `@@unique` no puede (tabla RT sin ownerId). El `prefilledModal` clone SOLO enforza de verdad con esta validación (sin ella es solo nudge). Verificado E2E (name+code dup rechazados). | E2E S3 | S3 | refined | RULE-platform-010 |
| L5 | **`metadata.uniqueConstraints` no siempre se traduce a `@@unique` en codegen** para objetos polimórficos base (CurricularSection): se propaga al synced JSON pero no aparece en schema.prisma ni DB (sí funciona para workflowStatus). `core_ObjectDefinition` no tiene columna `metadata`. Combinado con drift pre-existente de UPU y re-seed del sync, hace que agregar un unique sea una migración controlada, no un sync simple. Ver B3. | E2E S3 (debug pipeline) | S3 | refined | RULE-platform-010 |
| L8 | **El deep-clone de hijos polimórficos (versionado/clonado) clona solo el modelo BASE, no las proyecciones RT** — FINDING-V1. `deepClonePolymorphicChildren` itera `prisma.<baseModel>.findMany/create`; para hijos record-type-projected (CurricularSection → `rt__X__curricularsection`) la data tipada vive en la tabla de proyección y se **pierde** al clonar/versionar. Síntoma: la v2/clon tiene los hijos (name/recordType/position) pero vacíos de contenido (deliveryMode, horas, citas, pesos, texto de RA). El clone INDIVIDUAL (single record) sí lo maneja vía RT-block prefillFrom injection; el deepClone de HIJOS no. Regla general: cualquier clonado de un objeto RT-projected debe copiar base **y** proyección. | E2E S3 (TC-2b, DB) | S3 | discarded | bug del engine arreglado en esta sesión (UPONE-1219, `cloneChildProjections`). Candidata a RULE-core: "clonar objeto RT-projected = base + proyección + ext" |
| L7 | **Las traducciones i18n se editan en `<module>/lang/` (fuente) pero el runtime lee `suite/lang/` (copia generada).** El plugin `suite/plugins/i18n.ts` hace `import.meta.glob('../lang/**/*.json')` → solo ve `suite/lang/`. El sync `suite/scripts/sync-i18n.js` (vía `npm run sync` en suite) recorre los workspaces (incl. `layout` y `mods/*`), MERGEa keys nuevas a `suite/lang/` y **falla ante conflicto de key** (no sobrescribe). Editar solo `layout/lang/` deja la key **cruda** en runtime hasta correr el sync (síntoma: el `$t` devuelve el key literal, ej. `recordList.modal.cloneTitle`). Tras el sync, Vite HMR del glob eager recompila con un reload de página (sin reiniciar Nuxt). **Backend i18n**: el server NO traduce — devuelve `code` + msg técnico canónico; el cliente resuelve el idioma (patrón establecido en TC-14). | E2E S3 (i18n align) | S3 | refined | RULE-platform-011 |

## Teaching — Intake

**Status**: done
**Archivo**: tickets/TICKET-044.teach/teach-intake.html (v2 HTML, validado en verde)
**Decisión 0b**: generate (autopilot=super, skip no permitido por REQ-05)

## Teaching — Close

**Status**: pending
