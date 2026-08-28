---
id: TICKET-038
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1210
module: object-manager
autopilot: autonomous
---

# HU-4 | Config versioning en JSON del object (codegen valida + persiste al registry)

## Request

> Contenido literal del ticket Jira [UPONE-1210](https://u-planner.atlassian.net/browse/UPONE-1210) (Historia, parent epic UPONE-1206).

### Descripción

Declarar el bloque `versioning` **bajo** `metadata` para activar versionamiento sin código. El codegen lo valida y lo persiste al registro.

### Criterios de aceptación

* Requeridos: `linkageField`, `versionField`, `versionStrategy`. Opcionales: `auditSourceField`, `initialStateField`.
* **La política NO va aquí** (vive en `WorkflowStatus.allowsVersioning` + FK del `Workflow`); si declara `allowedFromStates`/`initialStateValue` → warning.
* `linkageField` debe ser FK reflexivo; `increment`→Int.
* El bloque queda persistido en el registro.

### Dependencias

HU-0e (TICKET-033), HU-0j (TICKET-033).

### Cambio vs actual

* persistir al registro; política movida fuera del bloque.

## Contexto operativo del plan SP3

### P2.4 — HU-4 · Config versioning (valida + persiste) (Fase 2) · [dominio-CD/versionamiento] · `P1`

- **Meta**: implement · ~2 SP · certeza confirmado · rollback git revert · riesgo bajo
- **Contexto**: activar versionamiento de un objeto declarando el bloque `versioning`, sin codigo. La politica (allowsVersioning, FK de entrada) **NO** va aqui: vive en `WorkflowStatus`/`Workflow`.
- **Que se realiza**: el codegen valida (requeridos `linkageField`, `versionField`, `versionStrategy`; opcionales `auditSourceField`, `initialStateField`) y persiste; `linkageField` debe ser FK reflexivo; `increment`→Int (**unica strategy en SP3**; `user-provided`/`semver` fuera de alcance, diferidos a SP4); warning si declara `allowedFromStates`/`initialStateValue`.
- **Depende de**: HU-0e (TICKET-033), HU-0j (TICKET-033).
- **Investigar**: nada.
- **Prueba**: `unit` increment+Int valido, increment+String rechazado, `versionStrategy` ≠ `increment` (`user-provided`/`semver`) rechazada por estar fuera de SP3, linkageField sin reflexive ref rechazado, warning campos obsoletos, persistido en registry.

## Material internalizado — HU detallada

### HU-4 · Config versioning en JSON del object

**Sprint:** SP3 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar el bloque `versioning` en el JSON del object
**Para** activar versionamiento sin codigo.

**Criterios de aceptacion:**

- [ ] Bloque `versioning` declarado **bajo `metadata`** del object. Codegen **valida estructura Y persiste** al registry (`versioningConfig`, via HU-0j). Requeridos: `linkageField`, `versionField`, `versionStrategy`. Opcionales: `auditSourceField` (default `versionSourceId`), `initialStateField` (default `currentStatusId`).
- [ ] **NO contiene `allowedFromStates` ni `initialStateValue`** — la politica vive en `WorkflowStatus.allowsVersioning` + el FK de entrada del `Workflow`. Si se declaran → warning de codegen.
- [ ] `linkageField` debe ser campo del mismo object con `references: <SameObject>` (FK reflexivo via IMP-5).
- [ ] `versionField`: con `increment` → Int. (`user-provided` → String/Int **diferido a SP4**.)
- [ ] `versionStrategy`: **solo `increment` en SP3** (`user-provided` y `semver` **fuera de alcance** — epica 1206; diferidos a SP4).
- [ ] Documentado en `object-manager/docs/versioning-capability.md` con nota: "la politica vive en `WorkflowStatus` + FK de entrada del `Workflow`".
- [ ] Tests: increment+Int valido, increment+String rechazado, `versionStrategy` distinto de `increment` (`user-provided`/`semver`) rechazado por estar fuera de SP3, linkageField sin reflexive ref rechazado, warning si declara campos obsoletos, **bloque persistido en `versioningConfig` tras sync**.

**Dependencias:** HU-0e, HU-0j.

## Material internalizado — Decisiones de diseno

### D9 (acotado a epica) — `versionStrategy` en SP3

**Decision fijada**: **Solo `increment` (IMP-1)**. `user-provided` y `semver` **fuera de alcance** (epica 1206) → diferidos a SP4.

**Justificacion**: la epica 1206 fija explicitamente `increment` como unica strategy. `user-provided` requiere UI de input (modal) + ordering por linaje (no por valor); `semver` requiere parsing. Ambos son trabajo SP4.

## Material internalizado — Shape canonico

### Bloque `versioning` (bajo `metadata`)

```json
{
  "metadata": {
    "versioning": {
      "linkageField": "previousVersionId",
      "versionField": "version",
      "versionStrategy": "increment",
      "auditSourceField": "versionSourceId",
      "initialStateField": "currentStatusId"
    }
  }
}
```

**Campos**:
- `linkageField` (requerido): FK reflexivo al mismo objeto (validado: declaracion con `references: <SameObject>`)
- `versionField` (requerido): nombre del campo `version` (debe ser Int para `increment`)
- `versionStrategy` (requerido): **solo `increment` en SP3**
- `auditSourceField` (opcional, default `versionSourceId`): campo del audit que registra el origen
- `initialStateField` (opcional, default `currentStatusId`): campo de estado que se setea al valor inicial del workflow

**NO permitido en SP3**:
- `allowedFromStates` → warning (la politica vive en `WorkflowStatus.allowsVersioning`)
- `initialStateValue` → warning (vive en `Workflow.initialStatusId` FK)
- `versionStrategy: "user-provided"` o `"semver"` → error (fuera de alcance, SP4)

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | architecture (codegen validation) |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (codegen) |
| Layer | core |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | (persistencia en `versioningConfig`, columna creada por HU-0j) |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | n/a |
| Version aprobada | — |
| Path | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La validacion en codegen sigue el patron de validacion de `uniqueConstraints`/`indexes` | ✓ confirmada | Patron canonico mas reciente: `helpers/validate-prefill-from.js` (UPONE-1208) exporta `validateX(block,json,label)→string[]` + `validateAllX(jsonFiles)`; wrapper `validatePrefillFromInAllObjects` en `generatePrismaSchema.js:99-114` agrega errores y `throw` para abortar codegen |
| H2 | `linkageField` puede validarse cross-referenciando que el campo existe en el mismo objeto y declara `references: <SameObject>` | ✓ confirmada | `activity.json`: `previousVersionId` hoy es `type:string` SIN `isForeignKey`/`references` → la validacion exige que sea FK reflexivo (`isForeignKey:true` + `references: <title del object>`). El codegen ya parsea `prop.isForeignKey && prop.references` (`:139`) |
| H3 | Warning (no error) para `allowedFromStates`/`initialStateValue` permite migracion suave de configs viejas | ✓ confirmada | `console.warn` se usa en todo el codegen para issues blandos sin abortar (ej. `:341`, `:569`); el error real (`throw`) se reserva para malformacion estructural |

### Context found

- **Rules del modulo**: RULE-dev-004 (core).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-033 (HU-0j config-storage + HU-0e self-ref reflexivo).
- **Docs relevantes del repo**:
  - `object-manager/src/services/codegen/generatePrismaSchema.js` (validacion)
  - `object-manager/objects/business/Base/*.json` (precedentes)
- **Warnings**:
  - **Depende de HU-0e, HU-0j cerrados** — sin esos no puede arrancar.
  - **Branch core**: `UPONE-1206`.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con `versioningConfig` columna disponible (post-TICKET-033) |
| Services | object-manager (4000) |

## Preplanificacion de sessions (intake)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-4 — validacion estructural del bloque `versioning` en codegen (requeridos/opcionales/tipos) | execute | T2 | codegen validation + unit tests | auto | malformados rechazados; validos aceptados |
| S2 | HU-4 — validacion cross-ref de `linkageField` (debe ser FK reflexivo) + persistencia via `syncVersioningConfigToRegistry` | execute | T2 | codegen + persistencia | ⚑ fuerte | persistido en versioningConfig.versioning |
| S3 | HU-4 — warning para `allowedFromStates`/`initialStateValue`; error para `versionStrategy` fuera de `increment` | execute | T1 | codegen + tests | auto | warnings/errores claros |
| S4 | Cierre — commits + teach-close | execute | T1 | review + commit DET-27 | auto | tests verdes |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-01 | false → super | dev trigger `autopilot super` al arrancar el ticket (HOR-079, por-ticket) | proximo gate |

### Plan de sessions

Spec: `SPEC-object-manager-hu4-versioning-declarative`. Numeracion S1-S4 (sin sessions previas en el ticket).

| Session | Objetivo | Tipo | Tier | Tasks | Gate criteria |
|---------|----------|------|------|-------|---------------|
| S1 | Validacion estructural del bloque `versioning` (REQ-01/03/04) | auto | T2 | S1.T1-T3 + GATE | tests S1 verdes; malformados/strategy fuera de alcance rechazados |
| S2 | Cross-ref `linkageField` reflexivo (REQ-02) + persistencia confirmada (REQ-06) + regresion codegen | ⚑ fuerte | T2 | S2.T1-T3 + GATE | git diff prisma vacio; persistido en versioningConfig.versioning |
| S3 | Warning campos de politica (REQ-05) + cierre cobertura error strategy (REQ-04) | auto | T1 | S3.T1-T2 + GATE | warnings sin abortar; tests verdes |
| S4 | Doc `versioning-capability.md` (REQ-08) + cierre (commits DET-27, teach-close) | auto | T1 | S4.T1-T2 + GATE | suite verde; teach-close validado |

### Session 1 — 2026-06-01 — Validacion estructural del bloque `versioning` [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Validacion estructural del bloque `versioning` en codegen (requeridos/opcionales/tipos, versionField integer, strategy solo increment).

**Tasks completadas**:
- [x] S1.T1 — Crear `validate-versioning.js` (`validateVersioning` + `validateAllVersioning`): requeridos/opcionales/tipos (REQ-01), versionField integer con increment (REQ-03), strategy solo increment con mensaje fuera-de-alcance (REQ-04)
- [x] S1.T2 — Cablear `validateVersioningInAllObjects` en codegen tras `validatePrefillFromInAllObjects`; inerte si no hay `metadata.versioning`
- [x] S1.T3 — Unit tests S1 (REQ-01/03/04, validos + invalidos con assertion de mensaje)
- [x] S1.GATE — Gate de sync Session 1 (tier T2): quality review standard, persistir, decidir continue

**Validacion del tier**:
- T2 — vitest run `tests/unit/services/codegen/validate-versioning.test.js`: 16/16 pass (sin baseline de coverage delta — archivo nuevo aislado).

**Discoveries / Learns nuevos**:
- (sin nuevos en S1 — el alcance se confirmo en intake; ver L1-L4)

**Quality review (DET-23)**:

**Reviewer**: reviewer aislado (sub-agente sonnet, contexto limpio — DET-23/REQ-10 T2 autopilot)
**Tier de revision**: standard
**Resultado global**: pass (approve)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Funciones acotadas; constantes nombradas (SP4_ALLOWED_STRATEGIES, DEFERRED_STRATEGIES, INCREMENT_VERSION_TYPE); early return |
| 2 | Lint | pass | Sin imports no usados; estilo consistente (ES modules, for-of) |
| 3 | Tipado | pass | JS puro (como prefill-from); JSDoc @param {unknown}; defensivo ante json nulo |
| 4 | Testing | pass | 16/16 verde; cubre REQ-01/03/04 validos+invalidos + agregacion |
| 5 | Escalabilidad | pass | Strategies como arrays — agregar SP4 es un push |
| 6 | Mantenibilidad | pass | Consistencia total con validate-prefill-from.js; refs a doc+ticket |
| 7 | Claridad | pass | Mensajes citan fileLabel+campo+valor; distinguen fuera-de-alcance vs desconocido |
| 8 | A11y | n/a | Backend |
| 9 | Storybook | n/a | Backend |
| 10 | Error-handling | pass | validateAll retorna lista; wrapper hace throw con conteo+ref a doc |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Findings (low, atendidos en S1.T3): (a) aserción laxa en test de agregacion → fijada a `toHaveLength(3)`; (b) faltaba caso versionField-vacio+increment → agregado (16vo test).

**Commit DET-27**: `75faa81` feat(object-manager): valida bloque metadata.versioning en codegen · `cecdb83` test(object-manager): unit tests validacion metadata.versioning

### Session 2 — 2026-06-01 — Cross-ref reflexivo + persistencia confirmada [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Validar `linkageField` como FK reflexivo (REQ-02), confirmar persistencia en `versioningConfig.versioning` via fixture inyectado (REQ-06), y regresion codegen multi-tenant (REQ-PRESERVE-07).

**Tasks completadas**:
- [x] S2.T1 — Agregar cross-ref de `linkageField` a `validate-versioning.js`: campo existe + `isForeignKey` + `references === json.title` (REQ-02)
- [x] S2.T2 — Unit test de persistencia (REQ-06) con metadataLoader inyectado + tests REQ-02
- [x] S2.T3 — Regresion codegen: `git diff prisma/*/schema.prisma` vacio + smoke (REQ-PRESERVE-07)
- [x] S2.GATE — Gate de sync Session 2 (tier T2, ⚑ fuerte): reviewer aislado, regresion vacia, decidir continue

**Validacion del tier**:
- T2 — vitest run `validate-versioning.test.js` + `syncVersioningConfigToRegistry.test.js`: 29/29 pass.
- Regresion (REQ-PRESERVE-07): `npm run codegen` EXIT=0 → `versioning validation: 58 files, no errors`; `syncVersioningConfigToRegistry: 0 populated, 73 null` (DB OK = smoke); `git diff prisma/` vacio.

**Quality review (DET-23)**:

**Reviewer**: reviewer aislado (sub-agente sonnet, contexto limpio — ⚑ fuerte / T2 mandatorio)
**Tier de revision**: standard
**Resultado global**: pass (approve)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | V6 early-return chain (existe → isForeignKey → references); un error por caso |
| 2 | Lint | pass | selfName extraido a variable; estilo consistente con V5 |
| 3 | Tipado | pass | Guards defensivos (typeof string, !== true); branch !selfName inalcanzable pero inofensivo |
| 4 | Testing | pass | 4 casos REQ-02 cubren las 3 ramas + happy; TC-12b assertion exacta del payload |
| 5 | Escalabilidad | pass | O(1) por campo, sin estructuras nuevas |
| 6 | Mantenibilidad | pass | Comentario V6 explica el por que (encadenamiento de versiones) |
| 7 | Claridad | warn | Fixture de un test usa auditSourceField inexistente en properties (valido, nota de legibilidad) |
| 8 | A11y | n/a | Backend |
| 9 | Storybook | n/a | Backend |
| 10 | Error-handling | pass | Errores string con archivo+campo+esperado/recibido; consistente |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

REQ-06 persistencia: confirmada sin tocar `syncVersioningConfigToRegistry` (solo test nuevo). Finding low (warn dim 7): cosmetico, no bloquea.

**Commit DET-27**: `f5d2e6b` feat(object-manager): cross-ref reflexivo de linkageField · `af9d007` test(object-manager): cross-ref reflexivo + persistencia versioning

### Session 3 — 2026-06-01 — Warnings de politica + cierre error strategy [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: Emitir warning (no error) para `allowedFromStates`/`initialStateValue` (REQ-05) y cerrar cobertura de mensajes de error de strategy (REQ-04).

**Tasks completadas**:
- [x] S3.T1 — Agregar colector de warnings (`collectVersioningWarnings`/`collectAllVersioningWarnings`) a `validate-versioning.js` + emision via `console.warn` en el wrapper del codegen (REQ-05)
- [x] S3.T2 — Unit tests S3: warnings REQ-05 + cierre cobertura mensajes REQ-04
- [x] S3.GATE — Gate de sync Session 3 (tier T1): quality review light, decidir continue

**Validacion del tier**:
- T1 — vitest run `validate-versioning.test.js`: 26/26 pass (6 nuevos REQ-05). Cobertura de mensajes REQ-04 ya cubierta en S1 (TC-08/09/10).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline light — proporcionalidad: gate T1 auto, cambio acotado aditivo, ver REQ-10 escape por costo)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Colector puro (separado de validateVersioning para no mezclar side-effects); DEPRECATED_POLICY_FIELDS como mapa campo→hint |
| 7 | Claridad | pass | Warning cita el campo + donde vive la politica; console.warn con prefijo ⚠️ en el wrapper |
| 10 | Error-handling | pass | Warnings NO abortan (separados del path de errores); guard de tipo en el colector |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

(Dimensiones 2-6,8,9 n/a o sin cambio — gate T1 light por proporcionalidad.)

**Commit DET-27**: `c6949aa` feat(object-manager): warning para campos de politica obsoletos · `7e71f84` test(object-manager): warnings de campos de politica obsoletos

### Session 4 — 2026-06-01 — Doc + cierre [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: Documentar la capacidad en `versioning-capability.md` (REQ-08), review final, commit doc y cierre (teach-close DET-22, status closed).

**Tasks completadas**:
- [x] S4.T1 — Documentar capacidad en `object-manager/docs/versioning-capability.md` (shape, validaciones, nota politica, ejemplo) (REQ-08)
- [x] S4.T2 — Review final + commit doc DET-27 + suite completa del modulo verde
- [x] S4.GATE — Gate de cierre Session 4 (tier T1): teach-close (DET-22), acceptance checkpoints, status closed

**Validacion del tier**:
- T1 — suite codegen completa `tests/unit/services/codegen/`: 72/72 pass (5 archivos).

**Quality review (DET-23)** / Validacion de cierre reforzada (sec 1d):

**Reviewer**: reviewer aislado (sub-agente sonnet, contexto limpio — REQ-03 BLOQUEANTE en super)
**Resultado global**: pass (approve)
- DET-13 (cambios vs spec): los 8 REQs implementados, cada cambio traza a un REQ; 7 commits HU-4.
- DET-16 (propagacion): validador cableado en el pipeline; doc actualizado.
- DET-23 (calidad consolidada): 72/72 suite verde.
- Scope: 5 archivos, TODOS dentro de `object-manager/` (execute_scope OK).
- Rama: `UPONE-1206`, sin commits a develop/master/main.
- Findings: 0.

**Commit DET-27**: `4c65355` docs(object-manager): capacidad de versionamiento declarativo

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 5
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Test cases

> Trazados a REQs (DET-7). Se completan Actual/Evidence/Status inline en ejecucion (DET-25). Affects UI = no (codegen build-time) en todos.

| # | source_ref | Caso | Esperado | Actual | Evidence | Status | Session | Cambios gatillados |
|---|-----------|------|----------|--------|----------|--------|---------|--------------------|
| TC-01 | REQ-01 | Bloque `versioning` completo y valido | codegen pasa OK | `[]` sin errores | vitest "bloque completo valido" | pass | S1 | — |
| TC-02 | REQ-01 | Falta requerido (`versionStrategy`) | codegen aborta con error citando el campo + archivo | error "versionStrategy is required ... activity.json" | vitest "falta un requerido" | pass | S1 | — |
| TC-03 | REQ-01 | `versioning` no es objeto (string) | codegen aborta indicando que debe ser objeto | error "must be an object, got string" | vitest "bloque no es objeto" | pass | S1 | — |
| TC-04 | REQ-01 | Objeto sin `versioning` | no-op (sin warnings ni errores) | `[]` para undefined/null | vitest "bloque ausente → no-op" | pass | S1 | — |
| TC-05 | REQ-03 | `versionField` integer + increment | pasa OK | `[]` sin errores | vitest "integer + increment" | pass | S1 | — |
| TC-06 | REQ-03 | `versionField` string + increment | aborta: debe ser type:"integer" | error con type:"integer"/type:"string" | vitest "string + increment rechazado" | pass | S1 | — |
| TC-07 | REQ-04 | `versionStrategy: "increment"` | aceptado | `[]` sin errores | vitest "increment aceptado" | pass | S1 | — |
| TC-08 | REQ-04 | `versionStrategy: "user-provided"` | aborta: "fuera de alcance SP3 (diferido a SP4)" | error "fuera de alcance de SP3 ... user-provided" | vitest "user-provided rechazado" | pass | S1 | — |
| TC-09 | REQ-04 | `versionStrategy: "semver"` | aborta: "fuera de alcance SP3" | error "fuera de alcance de SP3 ... semver" | vitest "semver rechazado" | pass | S1 | — |
| TC-10 | REQ-04 | `versionStrategy: "foo"` (desconocido) | aborta: strategy desconocida (solo increment en SP3) | error "desconocida", sin "fuera de alcance" | vitest "valor desconocido" | pass | S1 | — |
| TC-11 | REQ-02 | `linkageField` reflexivo valido (`isForeignKey` + `references === title`) | pasa OK | `[]` sin errores | vitest "reflexivo valido" | pass | S2 | — |
| TC-12 | REQ-02 | `linkageField` no es FK | aborta: debe ser FK reflexivo | error "FK reflexivo ... isForeignKey: true" | vitest "no es FK" | pass | S2 | — |
| TC-13 | REQ-02 | `linkageField` referencia a otro objeto | aborta: `references` debe ser el propio objeto | error "references debe ser Activity ... Workflow" | vitest "referencia a otro objeto" | pass | S2 | — |
| TC-14 | REQ-02 | `linkageField` inexistente en `properties` | aborta: el campo no existe | error "noSuchLink no existe en properties" | vitest "inexistente" | pass | S2 | — |
| TC-15 | REQ-06 | Fixture con `versioning` valido (metadataLoader inyectado) | `versioningConfig.versioning` poblado tras sync | write `{versioning, prefillFrom:null}` | vitest TC-12b (sync test) | pass | S2 | — |
| TC-16 | REQ-PRESERVE-07 | Regenerar tenants (npm run codegen) | `git diff prisma/*/schema.prisma` vacio + smoke DB OK | codegen EXIT=0; "versioning validation: 58 files, no errors"; sync 73 null; prisma diff 0 | /tmp/codegen-038.log | pass | S2 | — |
| TC-17 | REQ-05 | `allowedFromStates` declarado | warning (no aborta) citando `WorkflowStatus.allowsVersioning` | warning emitido; `validateVersioning` `[]` | vitest "allowedFromStates → warning" | pass | S3 | — |
| TC-18 | REQ-05 | `initialStateValue` declarado | warning (no aborta) citando FK de entrada del `Workflow` | warning emitido; `validateVersioning` `[]` | vitest "initialStateValue → warning" | pass | S3 | — |
| TC-19 | REQ-05 | Ambos campos obsoletos + bloque por lo demas valido | pasa con 2 warnings; estructura no afectada | 2 warnings, 0 errores | vitest "ambos campos obsoletos" | pass | S3 | — |

## Commits

| Hash | Fecha | Header | Tasks | REQ |
|------|-------|--------|-------|-----|
| `75faa81` | 2026-06-01 | UPONE-1210-S1 feat(object-manager): valida bloque metadata.versioning en codegen | S1.T1, S1.T2 | REQ-01, REQ-03, REQ-04 |
| `cecdb83` | 2026-06-01 | UPONE-1210-S1 test(object-manager): unit tests validacion metadata.versioning | S1.T3 | REQ-01, REQ-03, REQ-04 |
| `f5d2e6b` | 2026-06-01 | UPONE-1210-S2 feat(object-manager): cross-ref reflexivo de linkageField en versioning | S2.T1 | REQ-02 |
| `af9d007` | 2026-06-01 | UPONE-1210-S2 test(object-manager): cross-ref reflexivo + persistencia versioning | S2.T2 | REQ-02, REQ-06 |
| `c6949aa` | 2026-06-01 | UPONE-1210-S3 feat(object-manager): warning para campos de politica obsoletos en versioning | S3.T1 | REQ-05 |
| `7e71f84` | 2026-06-01 | UPONE-1210-S3 test(object-manager): warnings de campos de politica obsoletos | S3.T2 | REQ-05 |
| `4c65355` | 2026-06-01 | UPONE-1210-S4 docs(object-manager): capacidad de versionamiento declarativo | S4.T1 | REQ-08 |

## Backlog

> Vacio.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | La persistencia `metadata.versioning`→`versioningConfig` YA existe (`syncVersioningConfigToRegistry`, `generatePrismaSchema.js:2492`, entregada por HU-0j). HU-4 NO la implementa: solo la VALIDA + agrega la capa de validacion estructural. Reduce el alcance real del ticket | intake-explore | S2 | discarded | — (case-fact; en spec Executive summary + REQ-06 + teach-intake) |
| L2 | El JSON declara el tipo entero como `"type":"integer"` (no `"Int"`). La validacion de `increment → Int` debe checar `properties[versionField].type === "integer"`. "Int" es el tipo Prisma resultante, no el del JSON | intake-explore | S1 | discarded | — (case-fact; en spec REQ-03 + versioning-capability.md + const INCREMENT_VERSION_TYPE) |
| L3 | El patron canonico de validacion de bloque metadata es `helpers/validate-<capacidad>.js` con `validateX(block,json,label)→string[]` + `validateAllX(jsonFiles)`, mas un wrapper `validate<Cap>InAllObjects` que hace `throw` para abortar. HU-4 crea `helpers/validate-versioning.js` analogo | intake-explore | S1 | discarded | — (ya cubierto por RULE-core-019; shape discoverable en 3 helpers polymorphic/prefill/versioning) |
| L4 | `linkageField` reflexivo: el campo debe tener `isForeignKey:true` + `references` igual al `title` del propio object. Hoy `activity.json/previousVersionId` es string plano → activarlo como FK reflexivo es parte de HU-0e, y HU-4 lo valida | intake-explore | S2 | discarded | — (case-fact; en spec REQ-02 + OQ-1 activacion + versioning-capability.md) |

## Teaching — Intake

**Status**: done
**Archivo**: `tickets/TICKET-038.teach/teach-intake.html` (v2 HTML, HOR-081)
**Bloques**: tldr, callout, concept-card, flow (mermaid), code, invariant, tag, timeline, study-qa
**Validacion**: `dkc-validate Teach` → valid (0 errores, 0 warnings)

## Teaching — Close

**Status**: done
**Archivo**: `tickets/TICKET-038.teach/teach-close.html` (v2 HTML, HOR-081)
**Bloques**: tldr, case, timeline, comparison-table, callout, study-qa
**Validacion**: `dkc-validate Teach` → valid (0 errores)

## Acceptance checkpoints

| Checkpoint | Status | Detalle |
|------------|--------|---------|
| Funcional | pass | 8/8 REQs cumplidos (REQ-01..06 + PRESERVE-07 + 08); reviewer aislado de cierre approve |
| Coverage | pass | REQ-01/03/04→S1, REQ-02/06/PRESERVE-07→S2, REQ-05→S3, REQ-08→S4; todos con TC o evidencia |
| Tests | pass | 19 TCs (TC-01..19) pass; suite codegen 72/72 |
| Regression | pass | `npm run codegen` EXIT=0, `git diff prisma/` vacio, sync 73 null (DB OK) |
| NFRs | n/a | — |
| Rules | pass | Patron validate-`<cap>`.js respetado (consistente con RULE-core-019); RULE-dev-004 (rama UPONE-1206) |
| Docs | pass | `versioning-capability.md` (REQ-08) |
| Affects UI | n/a | Codegen build-time — todos los TC Affects UI=no |

## Summary

**HU-4 / UPONE-1210 — capa de validacion del bloque `metadata.versioning` en el codegen de object-manager.** Cerrado 2026-06-01 en 4 sessions (autopilot super).

**Que se entrego**:
- `validate-versioning.js` (helper analogo a `validate-prefill-from.js`): valida estructura (REQ-01), `linkageField` FK reflexivo (REQ-02), `versionField` integer con increment (REQ-03), `versionStrategy` solo `increment` en SP3 con error "fuera de alcance" para semver/user-provided (REQ-04), y emite warning (no error) para campos de politica obsoletos (REQ-05).
- Cableado `validateVersioningInAllObjects` en `generatePrismaSchema.js` tras `validatePrefillFromInAllObjects` — inerte sobre objetos sin la key.
- Persistencia (REQ-06) confirmada via test (ya existia por HU-0j; HU-4 no la reimplementa).
- Doc `versioning-capability.md` (REQ-08).
- 7 commits en `UPONE-1206`; 29 unit tests del helper/sync + suite codegen 72/72; regresion codegen vacia (REQ-PRESERVE-07).

**Alcance acotado (clave)**: el AC decia "valida + persiste" pero la persistencia ya estaba entregada (HU-0j + gate de HU-2). HU-4 = solo la capa de validacion. La **activacion en un objeto real** (declarar `versioning` en `Activity`, volver `previousVersionId` FK reflexivo) es trabajo aparte → **OQ-1**.

**Pendiente / siguiente**: OQ-1 (activacion real, requiere cambio de modelo IMP-5/HU-0e aplicado al JSON). Backlog sin items `must`.

**Story Points**: estimated 1 · executed 5 (sessions-heuristic: LLM 3 + humano 2). **Nota de calibracion**: el heuristico probablemente sobre-cuenta — 4 sessions con ceremonia completa de gates pero trabajo liviano (T1/T2, sin T3, una sola superficie de codigo). Candidato a revisar via `dkc-sp-calibration`.

**Decisiones (inline en spec)**: DEC-LOCAL-01 (strategy SP3), -02 (`json.title` para reflexivo), -03 (split warning/error), -04 (alcance validacion + activacion diferida).

**Push pendiente**: 7 commits locales en `object-manager` (UPONE-1206) + records en `deckard` (up1-sp3-w2). El push NO se ejecuto (siempre pregunta, todos los modos). El merge de `UPONE-1206` a develop es gated por revision del team up1 (RULE-dev-004) — el cierre DKC no implica merge.
