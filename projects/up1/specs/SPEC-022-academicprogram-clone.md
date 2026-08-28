---
id: SPEC-022-academicprogram-clone
project: up1
ticket: TICKET-062
status: done
---

# academicProgram · Clonar (UPONE-1271)

# academicProgram · Clonar (UPONE-1271)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: que un usuario pueda **duplicar una carrera** (`academicProgram`) desde la lista, con un clic en "Duplicar". Se abre un modal de creacion prellenado con los datos del original salvo el codigo (que sale vacio); al guardar con un codigo nuevo, nace una carrera nueva en estado `Draft`. Es un atajo de negocio frecuente (crear una variante de una carrera existente) y aqui sale casi gratis: se reusa un primitivo de clonado ya probado (`prefilledModal`, TICKET-052) — **config declarativa pura, sin backend ni core**.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Reusar `cloneStrategy: "prefilledModal"` en vez de un resolver de clonado | Cero codigo nuevo; el primitivo ya maneja "no crear hasta guardar" y "campo unico vacio". Misma decision que ya usa `activity` (duplicar modalidad) |
| 2 | El enforcement de unicidad lo da la DB (`@@unique[institutionId, code]`), no la app | `academicProgram` es la **unica** entidad de su familia con backstop real en DB (TICKET-061); el code vacio del modal es UX, pero el rechazo de duplicados es real |
| 3 | Sin `deepClone` | La carrera es plana (sin hijos ni versionado) — no hay malla ni secciones que arrastrar |

**Riesgos principales y como los mitigamos**:

- **El `@@unique` podria estar declarado pero NO aplicado en la DB del tenant** (gotcha TICKET-054: enforcement config-driven falla silencioso) → **primera tarea de la session = inspeccionar la constraint en la DB de UPU**; TC-3 (code duplicado rechazado) la valida empiricamente antes de confiar en ella.
- **El cambio "no aparece" tras `sync`** porque el object-manager no recarga typedefs del mod en caliente → restart obligatorio del OM como parte del flujo (RULE-mods-003 + RULE-dev-006).

**Que NO se hace en este ticket**:

- Clonado profundo (arrastrar hijos): la carrera no tiene hijos — no aplica.
- Tocar el clonado de `curriculum`/Plan (UPONE-1270): es otra entidad, versionada, con reglas distintas (resolver de linaje). Fuera de scope.
- Mutation testing (DET-31): el diff es config pura (JSON) sin logica ejecutable → no aporta señal (ver Triage del ticket).

**Tamano estimado**: 1 session (~1 SP), config declarativa. La parte mas riesgosa es la verificacion del `@@unique` en DB (no la config en si).

**Como vas a saber que funciona**:

- Abro la lista de carreras, hago "Duplicar" → se abre un modal con todo prellenado **menos el codigo**.
- Completo un codigo nuevo y guardo → aparece una carrera nueva en `Draft` con los mismos datos.
- Intento guardar con un codigo que ya existe en la institucion → me lo rechaza.
- Cancelo el modal → no queda nada creado.

---

## Purpose

Agregar una row-action de clonado (`prefilledModal`) al `academicProgram` en el mod `curriculum-design`, gateada por la capability `academicprogram:clone`. Reusa el primitivo de layout existente (TICKET-052) y el backstop de DB `@@unique([institutionId, code])` (TICKET-061). Para el equipo de curriculum: cierra la paridad de acciones del academicProgram con la familia `activity` (que ya tiene duplicar), sin introducir codigo ni cambios de schema.

## Requirements

### REQ-01: Clonar una carrera via modal prellenado

> **Que cambia**: en la lista de carreras aparece una accion "Duplicar" que abre un modal de creacion con todos los campos del original salvo el `code` (vacio); al guardar con un code nuevo, se crea una carrera nueva en `Draft`.
> **Por que**: hoy no hay forma de partir de una carrera existente; crear una variante obliga a re-tipear todo a mano.

El sistema MUST exponer una row-action de clonado sobre el `academicProgram` que abra un modal de creacion prellenado con los campos escalares del registro origen **excepto** `code` (vacio), y que cree el clon en estado `Draft` solo al guardar.

**Actor**: user (con capability `academicprogram:clone`)
**Layers**: config (json-object + layout), database (enforcement)

<details><summary>Scenarios de validacion</summary>

#### Scenario: clon exitoso
- **GIVEN** una carrera existente y un usuario con `academicprogram:clone`
- **WHEN** ejecuta "Duplicar", completa un `code` nuevo y guarda
- **THEN** se crea una carrera nueva con `id` nuevo, mismos campos escalares, estado `Draft`
- **AND** el registro origen queda intacto

#### Scenario: code duplicado rechazado
- **GIVEN** el modal de clon prellenado
- **WHEN** el usuario guarda con un `code` que ya existe en la misma institucion
- **THEN** la DB rechaza por `@@unique([institutionId, code])` (error de dominio, no registro a medias)

#### Scenario: cancelar no deja nada
- **GIVEN** el modal de clon abierto
- **WHEN** el usuario cancela
- **THEN** la DB no cambia (nada se creo — `prefilledModal` no crea hasta guardar)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en la lista de carreras, "Duplicar" abre un modal con todo prellenado menos el codigo; al guardar con codigo nuevo aparece una carrera nueva en Draft; un codigo repetido se rechaza; cancelar no deja nada.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Modal prellenado sin code | carrera existente | RowAction "Duplicar" | modal de create con todo salvo `code` (vacio) | code vacio, resto prellenado |
| TC-2 | Guardar crea clon Draft | modal prellenado | completar code unico + guardar | clon nuevo `id`, escalares iguales, `Draft` | registro nuevo en Draft |
| TC-3 | Code duplicado rechazado | code existente en la institucion | guardar | `@@unique` rechaza | error de dominio, sin registro |
| TC-4 | Cancelar no deja registro | modal abierto | cancelar | DB sin cambios | conteo igual |

### REQ-02: Gating por capability

> **Que cambia**: la accion "Duplicar" solo esta disponible para quien tenga la capability `academicprogram:clone`.
> **Por que**: clonar crea registros de gobernanza academica; debe respetar el RBAC del mod (igual que el clone/version de `activity`, SPEC-019).

El sistema MUST gatear la row-action de clonado con `requiredCapability: "academicprogram:clone"`, declarada en el catalogo de capabilities del mod.

**Actor**: system (RBAC)
**Layers**: config (capabilities.json + layout rowAction)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin capability no ve la accion
- **GIVEN** un usuario sin `academicprogram:clone`
- **WHEN** abre la lista de carreras
- **THEN** la accion "Duplicar" no esta disponible / es rechazada

</details>

#### Acceptance
**El usuario puede verificar que funciona**: un usuario sin la capability no ve "Duplicar"; uno con ella si.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-5 | Capability gatea la accion | usuario sin `academicprogram:clone` | intentar clonar | accion no disponible/rechazada | sin acceso |

### REQ-PRESERVE-01: La vista y el detalle existentes no se rompen

> **Que cambia**: nada — la lista y el detalle del `academicProgram` (entregados en UPONE-1260) siguen funcionando igual.
> **Por que**: el cambio agrega una row-action; no debe alterar columnas, filtros ni el detalle existentes.

El sistema MUST preservar el comportamiento actual del recordList y el detalle del `academicProgram` (regression de UPONE-1260).

**Actor**: user
**Layers**: config (layout)

#### Acceptance
**El usuario puede verificar que funciona**: la lista de carreras y el detalle se ven y operan igual que antes del cambio.

## Artifacts

### JSON Object (METASPEC-json-object)

| objectName | archivo | cambio | Notas |
|------------|---------|--------|-------|
| AcademicProgram | `mods/curriculum-design/objects/AcademicProgram.json` | agregar bloque `prefillFrom` (excluye `code`) | model-v2: contenedor plano, sin hijos. PascalCase obligatorio (RULE-platform-006) |

### Layout Config (METASPEC-layout-config)

| layoutName | objectName | layoutType | cambio |
|------------|------------|-----------|--------|
| default_AcademicProgram_list | AcademicProgram | RecordList | agregar `rowActions` con la accion "Duplicar" |

**Row Action:**
| label | type | cloneStrategy | uniqueFields | requiredCapability |
|-------|------|---------------|--------------|--------------------|
| Duplicar | create | prefilledModal | `["code"]` | academicprogram:clone |

### Capability (RBAC)

| capability | archivo | Notas |
|------------|---------|-------|
| academicprogram:clone | `mods/curriculum-design/capabilities.json` | formato `objeto:accion`; patron SPEC-019 (clone/version de activity) |

## Tasks

### Session 1 — Implementar accion Clonar (config pura) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S1.T2, S1.T3, S1.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Verificar `@@unique([institutionId, code])` aplicada en la DB de UPU (cierra H4 — gotcha TICKET-054) | REQ-01 | researcher | — | DB UPU (`core_AcademicProgram` / schema prisma) | SQL: inspeccionar indices unique de la tabla | (no aplica — read-only) | DET-5, DET-11 | pending | 1 |
| S1.T2 | Agregar bloque `prefillFrom` (excluye `code`) en `AcademicProgram.json` | REQ-01 | developer | S1.T1 | `mods/curriculum-design/objects/AcademicProgram.json` | sync sin error + objeto recodegenado | git revert | DET-2, DET-8, RULE-platform-006 | pending | 1 |
| S1.T3 | Agregar rowAction "Duplicar" (`prefilledModal`, `uniqueFields:["code"]`, `requiredCapability`) en el layout de lista | REQ-01, REQ-02 | developer | S1.T1 | `mods/curriculum-design/config/layouts/.../default_AcademicProgram_list.json` | layout valido + accion visible post-sync | git revert | DET-8, RULE-platform-006 | pending | 1 |
| S1.T4 | Declarar capability `academicprogram:clone` en el catalogo del mod | REQ-02 | developer | S1.T1 | `mods/curriculum-design/capabilities.json` | capability presente en `core_Capability` post-sync | git revert | DET-2, DET-8 | pending | 1 |
| S1.T5 | `npm run sync` + restart object-manager; tests TC-2..TC-5 + smoke UI TC-1 (modal prellenado) | REQ-01, REQ-02, REQ-PRESERVE-01 | developer | S1.T2, S1.T3, S1.T4 | `mods/curriculum-design/tests/`, OM | TC-1..TC-5 pass + OM arranca + lista intacta | revertir commits de la session | DET-7, DET-13, RULE-mods-003, RULE-dev-006 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T3, ⚑ fuerte) — persistir resultados, validar TCs + arranque OM + `@@unique` verificada, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | pending | 1 |

### Task contracts

```
Task S1.T1: Verificar @@unique en DB
- source_ref: REQ-01 (cierra H4)
- agent: researcher
- files: DB de UPU (read-only)
- precondition: tenant UPU con academicPrograms seedeados
- expected_output: confirmacion de que el indice unique [institutionId, code] existe en la tabla (o evidencia de que NO, escalando)
- validation: SQL sobre information_schema / \d de la tabla
- rollback: (no aplica — read-only)
- rules: [DET-5, DET-11]
```

```
Task S1.T2: prefillFrom en AcademicProgram.json
- source_ref: REQ-01
- agent: developer
- files: mods/curriculum-design/objects/AcademicProgram.json
- precondition: S1.T1 confirmo el enforcement de DB
- expected_output: bloque prefillFrom que excluye `code`; objeto recodegenado sin error
- validation: npm run sync sin error
- rollback: git revert del cambio en el JSON
- rules: [DET-2, DET-8, RULE-platform-006]
```

```
Task S1.T3: rowAction Duplicar en el layout
- source_ref: REQ-01, REQ-02
- agent: developer
- files: mods/curriculum-design/config/layouts/.../default_AcademicProgram_list.json (confirmar path exacto)
- precondition: S1.T1
- expected_output: rowAction {type:create, cloneStrategy:prefilledModal, uniqueFields:["code"], requiredCapability:"academicprogram:clone", label:"Duplicar"}
- validation: layout valido + accion visible en la lista post-sync
- rollback: git revert
- rules: [DET-8, RULE-platform-006]
```

```
Task S1.T4: capability academicprogram:clone
- source_ref: REQ-02
- agent: developer
- files: mods/curriculum-design/capabilities.json
- precondition: S1.T1
- expected_output: capability declarada; presente en core_Capability post-sync
- validation: grep en capabilities.json + verificar en DB tras sync
- rollback: git revert
- rules: [DET-2, DET-8]
```

```
Task S1.T5: sync + restart + tests + smoke
- source_ref: REQ-01, REQ-02, REQ-PRESERVE-01
- agent: developer
- files: mods/curriculum-design/tests/, object-manager (runtime)
- precondition: S1.T2, S1.T3, S1.T4 aplicadas
- expected_output: TC-1..TC-5 pass; OM arranca; lista/detalle de academicProgram intactos
- validation: vitest del mod (TC-2..TC-5) + smoke UI manual (TC-1, TC-5)
- rollback: revertir los commits de la session
- rules: [DET-7, DET-13, RULE-mods-003, RULE-dev-006]
```

## Constraints

- RULE-mods-003: `npm run sync` tras tocar objeto/layout — sin esto el cambio no llega a la DB del tenant.
- RULE-dev-006: tests + verificar arranque del servicio post-sync (no hay hot-reload de typedefs del mod).
- RULE-platform-006: PascalCase obligatorio en objetos/RecordTypes (el objeto es `AcademicProgram`).
- DEC/prior-art TICKET-052: el primitivo `prefilledModal` (copia escalares, deja `uniqueFields` vacios, no crea hasta guardar). `layout/src/types/recordlist.ts:226-240`, `RecordList.vue:2704`.
- TICKET-061 I5: `academicProgram` declara `@@unique([institutionId, code])` + `code.uniqueScopedBy [institutionId]` — backstop de DB real.
- SPEC-019 (RBAC clone/version capability): patron de capability `objeto:clone` ya usado por `activity`.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| UPONE-1260 (vista academicProgram) | internal | Provee el recordList/detalle sobre el que opera la accion | Hecho (ticket-059) — sin riesgo |
| `prefilledModal` (layout core) | internal | Primitivo de clonado reusado | Ya en produccion (TICKET-052) — sin riesgo |
| `@@unique([institutionId, code])` en DB UPU | internal | Enforcement real del code unico | Gotcha TICKET-054: verificar aplicada (S1.T1) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `@@unique` declarada pero no aplicada en la DB del tenant (TICKET-054) | medium | code duplicado no se frena → dos carreras con mismo code | S1.T1 inspecciona la constraint en DB ANTES de confiar; TC-3 la valida empiricamente |
| Cambio no visible tras sync (typedefs del mod no recargan en caliente) | medium | "no funciona" falso | restart del OM obligatorio en S1.T5 (RULE-dev-006) |
| Path exacto del layout difiere del asumido | low | task bloqueada | S1.T3 confirma el path real antes de editar |

## Open questions

- (ninguna — H4 se resuelve empiricamente en S1.T1, no bloquea el design)

## Decisions

### DEC-LOCAL-01: Reusar `prefilledModal` en vez de resolver de clonado
- **Contexto**: como implementar el clonado del academicProgram
- **Drivers**: la entidad es plana (sin hijos) y tiene `@@unique` real en DB; el primitivo ya existe y esta probado
- **Opcion elegida**: config pura con `cloneStrategy: "prefilledModal"` + `uniqueFields:["code"]`
- **Alternativas**: resolver de clonado server-side (descartado: innecesario sin hijos ni reglas de linaje, agrega codigo); copiar todos los campos incl. code (descartado: dejaria dos carreras con mismo code o requeriria post-edicion)
- **Consecuencias**: cero codigo nuevo, enforcement real via DB; limitado a clonado superficial (suficiente — la carrera no tiene hijos)
- **Session**: design (pre-S1)

## Acceptance checkpoints

- [ ] **Funcional**: TC-1..TC-5 pasan (clon Draft, code duplicado rechazado, cancelar limpio, capability gatea, modal prellenado sin code)
- [ ] **Tests**: TC-2..TC-5 automatizados + TC-1/TC-5 smoke UI con evidencia
- [ ] **H4 cerrada**: `@@unique([institutionId, code])` verificada en la DB de UPU (S1.T1)
- [ ] **Rules**: RULE-mods-003 (sync) + RULE-dev-006 (tests + arranque OM) + RULE-platform-006 (PascalCase) respetadas
- [ ] **Integration**: recordList/detalle de academicProgram intactos (REQ-PRESERVE-01)
- [ ] **Docs**: teach-close generado al cierre (DET-22)

## Technical reference

- Primitivo: `layout/src/types/recordlist.ts:226-240` (tipo `cloneStrategy`), `layout/src/layouts/RecordList.vue:2704` (impl). Config real de referencia: `default_Activity_edit.json` (duplicar modalidad, `uniqueFields: ["name","code"]`).
- Objeto: `mods/curriculum-design/objects/AcademicProgram.json` (model-v2, contenedor plano).
- Enforcement: `@@unique([institutionId, code])` (TICKET-061 I5).
- Capability pattern: SPEC-019 (clone/version de activity).
