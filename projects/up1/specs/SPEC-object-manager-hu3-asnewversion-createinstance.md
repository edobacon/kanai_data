---
id: SPEC-object-manager-hu3-asnewversion-createinstance
project: up1
ticket: TICKET-039
status: done
---

# HU-3 — `asNewVersion` en `createInstance` (Ladrillo 2: versionamiento sobre prefill)

# HU-3 — `asNewVersion` en `createInstance` (Ladrillo 2: versionamiento sobre prefill)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: que crear un objeto pueda ser, declarativamente, crear su **siguiente version**. Hoy `createInstance` ya clona campos de un objeto fuente (`prefillFrom`, HU-1) pero no sabe de versiones. HU-3 agrega un flag `asNewVersion` que, sobre esa clonacion, incrementa el numero de version, enlaza la nueva version a su predecesora, le asigna el estado inicial leyendo el FK del workflow, y deja una auditoria que recuerda de que version salio — todo sin un resolver custom por objeto. Es el ladrillo que habilita el versionamiento real de Activity (HU-8) y la UI de versiones (HU-7/HU-10).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `asNewVersion` viaja **dentro de `data: JSON!`** (se extrae al inicio, igual que `prefillFrom`), no como param tipado en el SDL | Consistencia con HU-1; evita churn de SDL y de los 64 callers. Trade-off: menos descubrible en el schema (mitigado por docs HU-12) |
| 2 | El `$transaction({ isolationLevel: 'Serializable' })` se acota **solo a los writes** (create + clone + audit); lecturas/validacion quedan afuera | Evita threadear `tx` a los ~5 helpers internos de `createInstance` (que usan el `prisma` global). Patron probado en `createWorkflowValidated` |
| 3 | El estado inicial de la version se lee de `workflow.initialStatusId` (FK unico, Opcion C / D22) y setearlo es **creacion, no transicion** | No viola `RULE-cd-004` (transiciones). Cardinalidad 1 del FK → no existe el error `WORKFLOW_HAS_MULTIPLE_*` |
| 4 | `versionStrategy` soporta **solo `increment`** en SP3 | `user-provided` se difiere a SP4 (fuera del alcance aprobado del epico). Acota el riesgo |

**Riesgos principales y como los mitigamos**:

- **`createInstance` hoy no es transaccional** → introducir el `$transaction` mal podria romper los 64 callers existentes o el deepClone de hijos. Mitigacion: el flag `asNewVersion` es opt-in; el path no-version no cambia de comportamiento (test de regresion de callers en S4).
- **`P2034` (serialization failure) bajo concurrencia** → Prisma no reintenta solo. Mitigacion: en UPU (2 instancias) la concurrencia es baja; se deja como pregunta abierta a validar empiricamente, retry diferido salvo evidencia (OQ-1).
- **Audit contaminado / linaje incorrecto** → si `versionSourceId` o `linkageField` se pueblan mal, la cadena de versiones queda rota. Mitigacion: tests de aceptacion verifican `version=N+1`, `linkageField=source.id`, audit `Create + versionSourceId` (S4).

**Que NO se hace en este ticket**:

- `versionStrategy: user-provided` → SP4 (solo `increment` ahora).
- Retry automatico de `P2034` → diferido hasta evidencia empirica de contencion.
- La UI de versionado (row action, seccion Versiones) → HU-7/HU-10/HU-11.
- El hook de remap de CurricularLinks → HU-8b (TICKET-043).

**Tamano estimado**: 5 sessions (S1-S5), ~7-9h efectivas. La mas riesgosa es **S3** (introducir el `$transaction` Serializable en un resolver que hoy no es transaccional).

**Como vas a saber que funciona**:

- Crear una version desde un Activity en estado PUB (`allowsVersioning=true`) devuelve un objeto con `version` incrementado, `linkageField` apuntando al source y `currentStatusId = workflow.initialStatusId`.
- Intentar versionar desde un estado sin `allowsVersioning`, o un objeto sin bloque `versioning`, o sin `prefillFrom`, devuelve el error nombrado correcto.
- Un fallo a mitad del write deja la DB sin la version a medias (rollback atomico).

---

## Purpose

Extender el resolver `createInstance` (object-manager) con una capa de versionamiento declarativa: `asNewVersion` reutiliza el prefill de HU-1, lee la config de versionamiento del registry (HU-2/HU-4), valida la politica de versionado en `WorkflowStatus.allowsVersioning` + `Workflow.initialStatusId`, y persiste la nueva version atomicamente con auditoria de linaje. Es transversal: cualquier objeto que declare el bloque `versioning` lo hereda sin codigo propio.

## Requirements

### REQ-01: Flag `asNewVersion` que requiere `prefillFrom`

> **Que cambia**: al crear un objeto puedes pasar `asNewVersion: true`; si lo haces sin `prefillFrom`, la operacion se rechaza con un error claro en vez de crear un duplicado suelto.
> **Por que**: una version nace copiando a su predecesora — sin prefill no hay de donde heredar; el flag sin prefill es un error de uso.

El sistema MUST aceptar `asNewVersion: Boolean` (default `false`) en `createInstance`, extraido de `data` al inicio (igual que `prefillFrom`). Cuando `asNewVersion === true` y no viene `prefillFrom`, el sistema MUST lanzar `AS_NEW_VERSION_REQUIRES_PREFILL` antes de cualquier escritura.

**Actor**: system (dev de mod, via API GraphQL)
**Layers**: api, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: flag sin prefillFrom
- **GIVEN** un objeto versionable
- **WHEN** se llama `createInstance` con `asNewVersion: true` y sin `prefillFrom`
- **THEN** lanza `AS_NEW_VERSION_REQUIRES_PREFILL` y no crea nada

#### Scenario: path no-version intacto
- **GIVEN** un caller existente sin `asNewVersion`
- **WHEN** se llama `createInstance` normal
- **THEN** el comportamiento es identico al actual (sin regresion)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: llamar la mutation con `asNewVersion:true` sin `prefillFrom` y observar el error nombrado, no un registro creado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | requires prefill | objeto versionable | asNewVersion sin prefillFrom | error | `AS_NEW_VERSION_REQUIRES_PREFILL` |
| 2 | no-regression callers | caller normal | createInstance sin flag | crea normal | igual a baseline |

### REQ-02: Rechazo de objetos no versionables

> **Que cambia**: si pides versionar un objeto que no declara configuracion de versionado, te lo dice explicitamente.
> **Por que**: versionar sin bloque `versioning` no tiene `linkageField`/`versionField` que tocar — es un error de configuracion del objeto.

El sistema MUST leer la config de versionado del **registry** (`core_ObjectDefinition.versioningConfig.versioning`), no del JSON crudo. Si `asNewVersion === true` y el objeto no declara bloque `versioning`, el sistema MUST lanzar `OBJECT_NOT_VERSIONABLE`.

**Actor**: system
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: objeto sin versioning
- **GIVEN** un objeto cuyo `versioningConfig.versioning` es null
- **WHEN** se llama con `asNewVersion: true` + `prefillFrom`
- **THEN** lanza `OBJECT_NOT_VERSIONABLE`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar versionar un objeto sin bloque `versioning` y obtener `OBJECT_NOT_VERSIONABLE`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | not versionable | versioningConfig.versioning=null | asNewVersion+prefill | error | `OBJECT_NOT_VERSIONABLE` |

### REQ-03: Validacion de politica de versionado (estado + workflow)

> **Que cambia**: solo se puede versionar desde estados habilitados (ej: PUBlicado), y el objeto debe tener definido en que estado nace su nueva version.
> **Por que**: versionar es una operacion de negocio gobernada por el workflow; sin esas dos condiciones la version naceria en un estado invalido.

El sistema MUST cargar el `source` con su `currentStatus` y su `workflow`. MUST validar `currentStatus.allowsVersioning === true` — si no, lanzar `SOURCE_NOT_VERSIONABLE`. MUST leer `workflow.initialStatusId` (FK directo, cardinalidad 1) — si no esta seteado, lanzar `WORKFLOW_HAS_NO_INITIAL_STATUS`. Estas lecturas/validaciones ocurren **fuera** del transaction.

**Actor**: system
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: estado no habilita versionado
- **GIVEN** un source cuyo `currentStatus.allowsVersioning === false`
- **WHEN** se llama con `asNewVersion: true` + `prefillFrom`
- **THEN** lanza `SOURCE_NOT_VERSIONABLE`

#### Scenario: workflow sin estado inicial
- **GIVEN** un source versionable pero `workflow.initialStatusId` null
- **WHEN** se llama con `asNewVersion: true`
- **THEN** lanza `WORKFLOW_HAS_NO_INITIAL_STATUS`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versionar desde un estado con `allowsVersioning=false` devuelve `SOURCE_NOT_VERSIONABLE`; desde un workflow sin `initialStatusId`, `WORKFLOW_HAS_NO_INITIAL_STATUS`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | status no versionable | allowsVersioning=false | asNewVersion+prefill | error | `SOURCE_NOT_VERSIONABLE` |
| 2 | workflow sin initial | initialStatusId=null | asNewVersion+prefill | error | `WORKFLOW_HAS_NO_INITIAL_STATUS` |

### REQ-04: Preparacion de los datos de la version (increment + linkage + estado inicial)

> **Que cambia**: la nueva version arranca con su numero incrementado, enlazada a su origen y en el estado inicial que dicta el workflow.
> **Por que**: es lo que distingue una version de un duplicado — linaje y numeracion coherentes.

El sistema MUST, antes del write: setear `data[versionField] = source[versionField] + 1` (estrategia `increment`, unica en SP3); `data[linkageField] = source.id`; `data[initialStateField] = workflow.initialStatusId`. Los nombres de campo provienen de `versioningConfig.versioning`.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: increment correcto
- **GIVEN** un source con `version = 1`
- **WHEN** se crea su nueva version
- **THEN** la version creada tiene `version = 2`, `linkageField = source.id`, `currentStatusId = workflow.initialStatusId`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versionar un objeto en `version=1` produce uno en `version=2` enlazado al original.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | increment+linkage | source version=1 | crear version | nueva | version=2, linkageField=source.id |
| 2 | estado inicial | workflow.initialStatusId=X | crear version | nueva | currentStatusId=X |

### REQ-05: Persistencia atomica con auditoria de linaje

> **Que cambia**: crear la version + clonar sus hijos + auditar ocurre todo-o-nada; la auditoria recuerda de que version salio.
> **Por que**: sin atomicidad un fallo a mitad dejaria una version corrupta; sin `versionSourceId` se perderia la trazabilidad del linaje.

El sistema MUST ejecutar **solo los writes** (create de la version + clone de hijos + audit) dentro de `prisma.$transaction(async (tx) => {...}, { isolationLevel: 'Serializable' })`. La fila de audit MUST tener `action="Create"`, `versionSourceId = prefillFrom.sourceId`, `sourceRefId = null` (canal `source` real). Si cualquier write falla, MUST hacer rollback de toda la transaccion.

**Actor**: system
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: atomicidad en fallo
- **GIVEN** una creacion de version donde el clone de hijos falla
- **WHEN** se ejecuta la transaccion
- **THEN** se hace rollback completo — no queda la version a medias en la DB

#### Scenario: audit con versionSourceId
- **GIVEN** una creacion de version exitosa
- **WHEN** termina la transaccion
- **THEN** existe una fila `ChangeLog` con `action='Create'` y `versionSourceId = source.id`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: forzar un fallo en el write y confirmar que la DB no quedo con una version parcial; en el caso exitoso, ver la fila de audit con `versionSourceId`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | rollback atomico | write falla | $transaction | rollback | 0 filas nuevas |
| 2 | audit linaje | version creada | commit | audit row | `action=Create`, `versionSourceId=source.id` |

## Artifacts

### Endpoints

| Method | Path | Auth | Request body | Response | Errors |
|--------|------|------|-------------|----------|--------|
| GraphQL | `createInstance(objectType, data)` | RBAC `create` | `data` incluye `prefillFrom` + `asNewVersion` | `InstanceResult { id, data, extended, cloneMap }` | `AS_NEW_VERSION_REQUIRES_PREFILL`, `OBJECT_NOT_VERSIONABLE`, `SOURCE_NOT_VERSIONABLE`, `WORKFLOW_HAS_NO_INITIAL_STATUS` |

**Comportamiento (referencia de implementacion)**:

```js
// FASE 1 — validacion + lecturas (FUERA del tx)
const asNewVersion = data?.asNewVersion === true; if ('asNewVersion' in data) delete data.asNewVersion;
if (asNewVersion && !prefillFrom) throw new Error('AS_NEW_VERSION_REQUIRES_PREFILL');
if (asNewVersion) {
  const cfg = (await prisma.core_ObjectDefinition.findUnique({ where: { name: objectType }, select: { versioningConfig: true } }))?.versioningConfig?.versioning;
  if (!cfg) throw new Error('OBJECT_NOT_VERSIONABLE');
  const source = await prisma[model].findUnique({ where: { id: sourceId }, include: { currentStatus: true, workflow: true } });
  if (!source.currentStatus?.allowsVersioning) throw new Error('SOURCE_NOT_VERSIONABLE');
  if (!source.workflow?.initialStatusId) throw new Error('WORKFLOW_HAS_NO_INITIAL_STATUS');
  data[cfg.versionField] = source[cfg.versionField] + 1;       // increment
  data[cfg.linkageField] = source.id;
  data[cfg.initialStateField] = source.workflow.initialStatusId;
}
// FASE 2 — writes (DENTRO del tx Serializable)
return prisma.$transaction(async (tx) => {
  const created = await tx[model].create({ data: prismaData });
  // clone hijos (deepClone) + audit
  if (asNewVersion) await tx.changeLog.create({ data: { action: 'Create', versionSourceId: sourceId, sourceRefId: null, /* ... */ } });
  return created;
}, { isolationLevel: 'Serializable' });
```

## Tasks

### Session 1 — param + rechazos baratos (REQ-01, REQ-02) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Extraer `asNewVersion` de `data` al inicio de `createInstance` (igual que `prefillFrom`); guard `AS_NEW_VERSION_REQUIRES_PREFILL` | REQ-01 | developer | — | `object-manager/src/graphql/resolvers/instance.resolver.js` | unit nuevo (TC REQ-01) | git revert | DET-5, DET-8, RULE-dev-004 | pending | 1 |
| S1.T2 | Leer `versioningConfig.versioning` del registry; guard `OBJECT_NOT_VERSIONABLE` cuando `asNewVersion` y sin bloque | REQ-02 | developer | S1.T1 | `object-manager/src/graphql/resolvers/instance.resolver.js` | unit nuevo (TC REQ-02) | git revert | DET-5, DET-8 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** — persistir resultados, correr unit del area + coverage delta, quality review, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-25 | pending | 1 |

### Session 2 — fase de validacion / lecturas multi-capa (REQ-03, REQ-04) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Cargar `source` con `currentStatus` + `workflow`; validar `allowsVersioning` (`SOURCE_NOT_VERSIONABLE`) y leer `workflow.initialStatusId` (`WORKFLOW_HAS_NO_INITIAL_STATUS`) | REQ-03 | developer | S1.GATE | `object-manager/src/graphql/resolvers/instance.resolver.js` | unit (TC REQ-03) | git revert | DET-5, DET-8, RULE-dev-004 | pending | 2 |
| S2.T2 | Preparar datos de la version FUERA del tx: `versionField+1` (increment), `linkageField=source.id`, `initialStateField=workflow.initialStatusId` | REQ-04 | developer | S2.T1 | `object-manager/src/graphql/resolvers/instance.resolver.js` | unit (TC REQ-04) | git revert | DET-5, DET-8 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier T2)** — persistir, unit+coverage, quality review, decision | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-25 | pending | 2 |

### Session 3 — fase write: `$transaction` Serializable + audit (REQ-05) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Envolver SOLO los writes (create version + clone hijos + audit) en `$transaction({ isolationLevel: 'Serializable' })` con `tx`; patron `createWorkflowValidated` | REQ-05 | developer | S2.GATE | `object-manager/src/graphql/resolvers/instance.resolver.js` | integration (atomicidad) | git revert | DET-5, DET-8, RULE-dev-004 | pending | 3 |
| S3.T2 | Audit row `action='Create'`, `versionSourceId=source.id`, `sourceRefId=null`, canal `source` real | REQ-05 | developer | S3.T1 | `object-manager/src/graphql/resolvers/instance.resolver.js` | integration (audit linaje) | git revert | DET-5, DET-8 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier T3, ⚑ fuerte)** — regression completa + e2e atomicidad/rollback, quality review exhaustive, decision | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido + e2e verde + rollback verificado | (no aplica) | DET-20, DET-23, DET-25 | pending | 3 |

### Session 4 — tests exhaustivos (matriz de errores + rollback) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Suite unit: increment correcto, los 4 errores nombrados, no-regression de los callers existentes | REQ-01,REQ-02,REQ-03,REQ-04 | developer | S3.GATE | `object-manager/tests/unit/resolvers/version-from-source.test.js` | `pnpm test:unit` verde | git revert | DET-7, DET-8 | pending | 4 |
| S4.T2 | Test integration/e2e: rollback en fallo del write + audit con `versionSourceId` contra DB real (autocontenido, teardown) | REQ-05 | developer | S4.T1 | `object-manager/tests/e2e/version-activity.test.js` | `pnpm test:e2e` verde, DB restaurada | git revert | DET-7, DET-8 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier T2, ⚑ fuerte)** — matriz de errores cubierta, regression verde, quality review, decision | — | reviewer | S4.T1, S4.T2 | ticket | gate persistido + tests verdes | (no aplica) | DET-7, DET-20, DET-23, DET-25 | pending | 4 |

### Session 5 — cierre [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Commits granulares DET-27 (feat/test) en object-manager con prefijo `UPONE-1209-S{N}` | — | developer | S4.GATE | `object-manager/**` | `git log` granular | (no aplica) | DET-27 | pending | 5 |
| S5.T2 | teach-close (DET-22) + acceptance checkpoints + status closed | — | reviewer | S5.T1 | `tickets/TICKET-039.teach/teach-close.html` | dkc-validate Teach | (no aplica) | DET-22, DET-13 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier T1)** — cierre validado (DET-13), teach-close, decision final | — | reviewer | S5.T1, S5.T2 | ticket | cierre basado en evidencia | (no aplica) | DET-13, DET-20, DET-22 | pending | 5 |

### Task contract (resumen)

```
Task S3.T1: $transaction Serializable solo en writes
- source_ref: REQ-05
- agent: developer
- files: object-manager/src/graphql/resolvers/instance.resolver.js
- precondition: S2.GATE done (validacion/lecturas fuera del tx ya implementadas)
- expected_output: create+clone+audit atomicos; path no-version sin transaction (sin regresion)
- validation: integration de atomicidad + e2e rollback
- rollback: git revert
- rules: [DET-5, DET-8, RULE-dev-004]
```

## Constraints

- RULE-dev-004: core — patrones del modulo object-manager aplican al resolver.
- RULE-cd-004: transiciones — **NO aplica**: setear estado inicial al crear es creacion, no transicion.
- DEC (D22, Opcion C): FK unico `workflow.initialStatusId` compartido version/scratch (ver TICKET-034).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HU-1 prefillFrom (TICKET-036) | internal | helper de prefill que HU-3 reutiliza | cerrado ✓ |
| HU-2/HU-4 versioningConfig (TICKET-037/038) | internal | bloque `versioning` en el registry | cerrado ✓ |
| HU-9 versionSourceId (TICKET-035) | internal | campo de audit para linaje | cerrado ✓ |
| Track 0 (TICKET-033/034) | internal | `Workflow.initialStatusId`, `WorkflowStatus.allowsVersioning` | cerrado ✓ |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Introducir `$transaction` rompe los 64 callers o el deepClone | low | high | flag opt-in; path no-version intacto; test de regresion de callers (S4.T1) |
| `P2034` serialization failure bajo concurrencia | low | medium | concurrencia baja en UPU; retry diferido (OQ-1); validar empiricamente si hay contencion |
| Linaje/audit mal poblado | low | high | acceptance tests verifican version=N+1, linkageField, audit versionSourceId (S4) |

## Open questions

- [ ] OQ-1: ¿requiere retry de `P2034`? — depende de la concurrencia real en UPU; validar empiricamente, no asumir.

## Decisions

### DEC-LOCAL-01: D22 — FK unico `initialStatusId` (Opcion C, v5.1)
- **Contexto**: el ticket Jira declaraba `workflow.versionInitialStatusId` (2° FK) con error `WORKFLOW_HAS_NO_VERSION_INITIAL_STATUS`.
- **Drivers**: hoy version y scratch arrancan ambos en `BOR`; ningun caso del sprint diverge.
- **Opcion elegida**: 1 FK unico `workflow.initialStatusId` compartido, error `WORKFLOW_HAS_NO_INITIAL_STATUS`.
- **Alternativas**: 2 FK separados (v5) — descartado por complejidad sin caso de uso.
- **Consecuencias**: mas simple; reversible (2° FK aditivo si SP4 lo necesita).
- **Session**: design (heredado de TICKET-034).

### DEC-LOCAL-02: `asNewVersion` viaja dentro de `data: JSON!`
- **Contexto**: ¿param tipado en SDL o campo dentro de `data`?
- **Drivers**: consistencia con `prefillFrom` (HU-1), que ya viaja dentro de `data` y se extrae al inicio; evitar churn del SDL y de los 64 callers.
- **Opcion elegida**: extraer `asNewVersion` de `data` al inicio del resolver (mismo patron que `prefillFrom`).
- **Alternativas**: param tipado `asNewVersion: Boolean` en el SDL — mas descubrible pero rompe el patron establecido y toca el schema.
- **Consecuencias**: consistencia y menor superficie de cambio; menos descubrible (mitigado por docs HU-12).
- **Session**: design.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..REQ-05 pasan (unit guards/helper + e2e atomicidad).
- [x] **Tests**: matriz de 4 errores + increment + rollback verdes (91 unit + 2 e2e). Audit `versionSourceId` → HU-6 (DEC-LOCAL-03).
- [x] **Rules**: RULE-dev-004 respetada; RULE-cd-004 confirmada no-aplicable (creación, no transición).
- [x] **Integration**: 64 callers de `createInstance` sin regresión (suite instance.resolver 91/91 post-refactor).
- [x] **Docs**: `asNewVersion` documentado en teach-close; doc para adoptantes delegada a HU-12 (TICKET-046).

## Technical reference

- `instance.resolver.js:2177-2869` — `createInstance` actual (no transaccional).
- `mods/curriculum-design/workflow.resolver.js:54-107` — patron `$transaction({ isolationLevel: 'Serializable' })`.
- `prefill-from-source.js:130-164` — `applyPrefillFromSource` (HU-1).
- `core_ObjectDefinition.versioningConfig` — registry de config de versionado (HU-2/HU-4).
- `ChangeLog` — campos `versionSourceId`, `sourceRefId` (HU-9). Audit via `auditCapture.resolver.js`.
- `Workflow.initialStatusId` (HU-0h), `WorkflowStatus.allowsVersioning` (Track 0).
