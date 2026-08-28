---
id: SPEC-layout-fix-recorddetail-dirty-false-positive
project: up1
ticket: TICKET-128
status: in_progress
---

# Fix: la carga inicial de RecordDetail no debe marcar cambios ni invalidar campos autopoblados

# Fix: la carga inicial de RecordDetail no debe marcar cambios ni invalidar campos autopoblados

## Executive summary — lo que estas aprobando

> Revision rapida. El detalle vive en Requirements, Fix scope y Tasks.

**Que se quiere**: en `RecordDetail` (core `layout`), un formulario recien montado que autopuebla campos con `autoPopulate.triggerOnMount` deja de (a) marcarse como "con cambios" y disparar el modal "cambios sin guardar" sin edicion del usuario, y (b) mostrar en rojo un campo obligatorio autopoblado. Ademas, cancelar/volver en modo `view` cierra directo. El caso legitimo (si el usuario edita, el modal aparece) se preserva. Todo con validacion runtime (DET-36), sin tocar los mods.

**Decisiones criticas (necesitan tu OK)**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Opcion B** (limpiar dirty + validacion tras `update()` on-mount en el core `executePopulation`), NO portar la rama `Feat/UPONE-912` completa ni su snapshot como fix principal | B ataca la causa del caso reportado (autoPopulate on-mount) en un solo punto de core que cubre los 43 campos del blast radius sin tocar mods; el merge de 912 arrastra 498 commits + scope ajeno, y su snapshot resuelve otro disparador (tags), no el `update()` de autoPopulate ni el rojo |
| 2 | El fix usa **`element.clean()` + `element.resetValidators()`**, ambos llamados **dos veces** (ahora + `nextTick`) | Runtime confirmo (H7) que `clean()` solo baja `dirty` pero NO quita el rojo; el rojo requiere `resetValidators()`. El doble llamado es por el watcher `flush:'pre'` (H6, precedente UPONE-1458) |
| 3 | Cerrar tambien el **hueco secundario** (Opcion C): guard de modo `view` en `ModalStackManager.handleCancelAttempt`, espejo del que ya tiene `handleCloseAttempt` | 912 no lo cubre; es independiente y de bajo riesgo |
| 4 | El **snapshot de 912 (Opcion A)** NO entra en este ticket: queda como follow-up para el falso dirty por normalizacion de tags (`string[]`→`{value,label}[]`), disparador distinto y out-of-scope de UPONE-1540 | Evita traer complejidad (polling/timers) para un caso que no es el reportado |

**Riesgos y mitigacion**:

- **Que resetear en el montaje oculte un error legitimo** → el submit revalida el required igual (verificado: `resetValidators()` no desactiva la validacion futura, solo limpia el estado prematuro). TC de submit-con-required-vacio lo cubre.
- **Que el doble `clean()`/`resetValidators()` borre el valor autopoblado** → `clean()`/`resetValidators()` no tocan `value` (solo `dirty`/validacion); TC verifica que el valor autopoblado persiste tras el reset.
- **Regresion en otro formulario/mod** → el fix es un solo punto de core; validador de blast radius (smoke sobre muestra cross-mod) en el gate.
- **Que el caso legitimo deje de avisar** → TC/smoke: editar un campo real SI marca dirty y dispara el modal.

**Que NO se hace** (limites de scope):

- Opcion A (snapshot de 912): follow-up.
- Opcion D (cambiar el contrato dual-populate para que el mod no emita `''`): la causa mas profunda del rojo nace en el mod (`useOwnerIdOptions` devuelve `''` a proposito); tocar ese contrato es mayor blast radius y coordinacion core/mod. Se documenta, no se hace aca.
- Cambios en los mods: el fix es 100% core; los mods no se tocan.

**Tamano estimado**: 2 sessions (~0.5-1 dia), tier T2. La delicada es la Session 2 (verificar en runtime que el reset no rompe populate/valor/submit ni el caso legitimo, en muestra cross-mod).

**Como vas a saber que funciona**:

- Crear un Plan de estudio y no editar: sin modal al cancelar, `ownerId` sin rojo.
- Editar un campo: el modal SI aparece.
- En modo ver: cancelar/volver cierra directo.
- Un caso de OTRO mod (up1-manager `fielddefinition-create`) y uno MEDIA (dirty-only): montan sin falso positivo.
- El valor autopoblado sigue presente; el submit con required vacio sigue bloqueando.

---

## Purpose

Corregir en el core `layout` (`RecordDetail` + `ModalStackManager`) un falso positivo de "cambios sin guardar" y una invalidacion prematura de campos obligatorios, ambos disparados por `autoPopulate.triggerOnMount` al montar el formulario. El fix limpia el estado `dirty` y de validacion del campo autopoblado en el mismo punto de core donde ocurre el `update()`, llevando el comportamiento a "la hidratacion no es edicion del usuario". Afecta genericamente a todo formulario con autoPopulate on-mount (43 campos, 3 mods) sin modificar los mods.

## Requirements

### REQ-FIX-01: la carga inicial con autoPopulate on-mount no marca el formulario como "con cambios"

> **Que cambia**: montar un formulario que autopuebla campos deja de marcar `dirty`; cancelar/volver sin editar no dispara el modal "cambios sin guardar".
> **Por que**: hoy `update()` en la hidratacion ensucia el form; `isDirty()` lo reporta como cambio del usuario.

El sistema MUST evitar que el `update()` de `executePopulation` en el path `triggerOnMount` deje el elemento (y por ende el form) marcado como `dirty`, de modo que un formulario recien montado sin edicion del usuario reporte `isDirty() === false`.

**Actor**: system (motor de detalle) · **Layers**: frontend

<details><summary>Scenarios</summary>

#### Scenario: create con autoPopulate on-mount, sin editar
- **GIVEN** un `RecordDetail` en create con un campo `autoPopulate.triggerOnMount`
- **WHEN** monta y el usuario no edita nada, luego cancela o vuelve
- **THEN** no aparece el modal "cambios sin guardar"; cierra directo

</details>

#### Acceptance
Abrir la creacion de un Plan de estudio y volver sin editar: no pregunta por cambios.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Falso dirty on-mount | create + autoPopulate on-mount | montar sin editar | `isDirty()` | false (ROJO hoy → verde) |

### REQ-FIX-02: un campo obligatorio autopoblado no queda invalido/rojo por la carga inicial

> **Que cambia**: un required autopoblado on-mount deja de mostrarse en rojo ("es obligatorio") antes de que el usuario interactue.
> **Por que**: `update()` dispara la validacion del campo; un required que resuelve `''`/vacio en ese instante queda `invalid`.

El sistema MUST limpiar el estado de validacion (`invalid`/`validated`/mensaje) del campo autopoblado tras el `update()` on-mount, de modo que no se muestre error de required por la carga inicial. La validacion en submit MUST seguir funcionando (un required vacio al guardar sigue bloqueando).

**Actor**: system · **Layers**: frontend

<details><summary>Scenarios</summary>

#### Scenario: required autopoblado on-mount
- **GIVEN** un `RecordDetail` con un campo required + `autoPopulate.triggerOnMount` que resuelve vacio o con valor valido
- **WHEN** monta sin edicion
- **THEN** el campo NO se muestra en rojo por la carga

#### Scenario: submit sigue validando
- **GIVEN** el mismo formulario, required aun vacio
- **WHEN** el usuario intenta guardar
- **THEN** la validacion de required se dispara y bloquea (el reset on-mount no la desactiva)

</details>

#### Acceptance
Abrir la creacion con dato autocompletado: el campo obligatorio no queda en rojo; guardar sin llenarlo sigue bloqueando.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-2 | Required no-rojo on-mount | create + required autopoblado | montar sin editar | estado del campo | `invalid=false`, sin mensaje (ROJO hoy → verde) |
| TC-2b | Submit valida igual | required vacio | guardar | validacion | required bloquea el submit |
| TC-2c | Valor autopoblado persiste | autoPopulate con valor valido | montar | `el.value` | conserva el valor tras clean+resetValidators |

### REQ-FIX-03: cancelar/volver en modo view cierra directo (hueco secundario)

> **Que cambia**: en modo `view`, cancelar/volver cierra sin preguntar por cambios.
> **Por que**: `handleCancelAttempt` no tiene el guard de `view` que si tiene `handleCloseAttempt`.

El sistema MUST cerrar directo (sin modal de confirmacion) al cancelar/volver un `RecordDetail` en modo `view`, replicando el guard de modo `view` de `handleCloseAttempt` en `handleCancelAttempt`.

**Actor**: system · **Layers**: frontend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-4 | View cancela directo | RecordDetail en view | cancelar/volver | cierre | directo, sin modal (ROJO hoy → verde) |

### REQ-REGRESSION-01: el caso legitimo y el resto de formularios no regresionan

> **Que cambia**: nada visible; editar SI marca dirty; los demas formularios con autoPopulate no se rompen.
> **Por que**: el fix debe ser quirurgico al path de hidratacion.

El sistema MUST seguir marcando `dirty` y disparando el modal cuando el usuario edita realmente un campo, MUST preservar el populate (items y valor) de todos los formularios con autoPopulate, y MUST NO alterar el comportamiento fuera del path `triggerOnMount`.

**Actor**: system · **Layers**: frontend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-3 | Edicion real marca dirty | form montado | editar un campo | `isDirty()` + cancelar | true; el modal aparece |
| TC-5 | Regresion cross-mod ALTA | up1-manager `fielddefinition-create` (`fieldType` required) | montar sin editar | estado | sin dirty ni rojo (fix de core, mod intacto) |
| TC-6 | Regresion MEDIA dirty-only | up1-manager `app-create` (`defaultObjects`/`roles`, opcional) | montar sin editar | `isDirty()` | false; items poblados |
| TC-7 | Regresion view/guard | curriculum `default_Curriculum_view` | abrir y volver | cierre | directo; datos visibles |

## Fix scope

### Antes (comportamiento actual)
`executePopulation` (path `triggerOnMount`) hace `targetField.update(valueData)` (`RecordDetail.vue:993`) o `update(formattedResult)` (`:1006`) al montar. `update()` marca el elemento `dirty` y dispara su validacion. Un required que resuelve vacio queda `invalid` (rojo). `isDirty()` (`:6231`) delega en `vueform.dirty` → reporta el falso positivo. `ModalStackManager.handleCancelAttempt` no distingue modo `view`.

### Despues (comportamiento esperado)
Tras el `update()` on-mount (ambas ramas: dual-populate `:993` y valor directo `:1006`), el engine llama `targetField.clean()` + `targetField.resetValidators()`, repetidos en `nextTick` (watcher `flush:'pre'`). El elemento queda con el valor poblado pero sin `dirty` ni validacion prematura. `handleCancelAttempt` gana el guard de modo `view`. `isDirty()` se mantiene (ya no recibe falso dirty del path de hidratacion); el snapshot de 912 NO se porta.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `layout/src/layouts/RecordDetail/RecordDetail.vue` | En `executePopulation`, tras cada `update()` del path on-mount: `clean()` + `resetValidators()` x2 (ahora + `nextTick`), acotado a `triggerOnMount` | Path generico de autoPopulate on-mount: cubre los 43 campos del blast radius sin tocar mods |
| `layout/src/components/organisms/modal/ModalStackManager/ModalStackManager.vue` | Guard de modo `view` en `handleCancelAttempt` (espejo de `handleCloseAttempt`) | Cierra el hueco secundario H4 |
| `layout/src/layouts/RecordDetail/__tests__/` | Tests unit del path (dirty/validacion post-populate; edicion real; valor persiste) | Cobertura del path hoy inexistente |
| `layout/src/components/organisms/modal/ModalStackManager/` | Test unit del guard de view en cancel | Cobertura del guard |

## Tasks

### Session 1 — Red de seguridad + RED del bug (tests-first) [tipo: fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Malla: TC-3 (edicion real marca dirty) VERDE sobre codigo actual; documentar baseline de populate (items+valor) en un form con autoPopulate | REQ-REGRESSION-01 | developer | — | layout/src/layouts/RecordDetail/__tests__/ | TC-3 verde contra codigo actual | git checkout | DET-7, DET-33 | done | 1 |
| S1.T2 | RED: TC-1 (falso dirty on-mount) + TC-2 (required rojo on-mount) ROJO reproducible sobre codigo actual; TC-4 (view cancel) ROJO | REQ-FIX-01, REQ-FIX-02, REQ-FIX-03 | developer | S1.T1 | layout/src/layouts/RecordDetail/__tests__/, .../ModalStackManager/ | TC-1/2/4 rojo reproducible | git checkout | DET-7, DET-13 | done | 1 |
| **S1.GATE** | Gate T2: persistir en `## Sessions`, confirmar malla verde + RED reproducible, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate + decision | (n/a) | DET-20, DET-23 | done | 1 |

### Session 2 — Implementar B + C + validar blast radius [tipo: auto] [tier: T2]

parallel_groups: [[S2.T3, S2.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar B: `clean()` + `resetValidators()` x2 (ahora + `nextTick`) tras `update()` en el path `triggerOnMount` de `executePopulation`; acotado a on-mount (no al path de watchers de edicion) | REQ-FIX-01, REQ-FIX-02 | developer | S1.GATE | layout/src/layouts/RecordDetail/RecordDetail.vue | TC-1/TC-2 verde; TC-3 sigue verde; TC-2b (submit valida) y TC-2c (valor persiste) verde | git checkout | DET-5, DET-40 | done | 2 |
| S2.T2 | Implementar C: guard de modo `view` en `handleCancelAttempt` (espejo de `handleCloseAttempt`) | REQ-FIX-03 | developer | S1.GATE | layout/src/components/organisms/modal/ModalStackManager/ModalStackManager.vue | TC-4 verde | git checkout | DET-40 | done | 2 |
| S2.T3 | Unit completo del path: dirty/validacion post-populate, edicion real, valor persiste, guard view | REQ-REGRESSION-01 | developer | S2.T1, S2.T2 | layout/src/layouts/RecordDetail/__tests__/, .../ModalStackManager/ | suite unit verde | git checkout | DET-7 | done | 2 |
| S2.T4 | **Validador de blast radius (smoke DET-36)**: antes/despues en muestra representativa — curriculum `Curriculum_create` (ownerId, ALTA), up1-manager `fielddefinition-create` (fieldType, ALTA cross-mod), up1-manager `app-create` (MEDIA dirty-only), curriculum `Curriculum_view` (view/guard), y el caso legitimo (editar → modal). Evidencia runtime real; confirmar que populate/valor/submit no se rompen y los mods no se tocan | REQ-FIX-01, REQ-FIX-02, REQ-FIX-03, REQ-REGRESSION-01 | reviewer | S2.T1, S2.T2 | (smoke; sin archivos) | evidencia runtime antes/despues por caso; sin regresion; sin tocar mods | (n/a) | DET-33, DET-36 | in_progress | 2 |
| **S2.GATE** | Gate T2: persistir, quality review (DET-23), acceptance con evidencia runtime, confirmar sin artefactos de sync y commits con id `UPONE-1540` (DET-19/27), decidir continue/iterate | — | reviewer | S2.T1..T4 | ticket | gate + acceptance verificado + id de commit correcto | (n/a) | DET-13, DET-19, DET-20, DET-23, DET-27, DET-33, DET-36 | done | 2 |

## Constraints

- **DET-40 (auditoria de reemplazo)**: al agregar el reset post-`update()`, enumerar 1:1 que hacia el path viejo (populate items + set value + marcaba dirty + validaba) y verificar que el nuevo replica populate+value y SOLO neutraliza dirty+validacion prematura, sin afectar el path de watchers de edicion ni el submit.
- **RULE-dev-004 (core work policy)**: `layer: core`; rama unica `UPONE-1540-recorddetail-dirty-false-positive`; merge a develop gated por revision del team core (cerrar != merge).
- **RULE-dev-test-real-shape-not-mocked / DET-36**: esta zona no tiene red de render; el guard autoritativo es smoke runtime, el unit es complemento.
- **Sin tocar mods**: el fix es en core; los composables de los mods (`useOwnerIdOptions`, `useCampusOptions`, etc.) no se modifican. `useCampusOptions` esta ademas en WIP de UPONE-1524 (stash), por eso el smoke cross-mod usa `fielddefinition-create`, no `transfertime`.
- **Suite compila layout por alias a source**: probar con HMR; NO correr `npm run sync` (propaga mods, ensucia el arbol).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Suite (:3000) + object-manager (:4000) + tenant UPU | internal | Entorno para el smoke runtime | Sin runtime, el unit no captura el estado real de vueform (H7 se descubrio en runtime) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Reset on-mount oculta un error legitimo | low | usuario guarda con required vacio | submit revalida (TC-2b); reset solo limpia estado prematuro |
| clean/resetValidators borran el valor autopoblado | low | dato perdido | no tocan `value`; TC-2c verifica persistencia |
| Regresion en otro form/mod | medium | falso positivo o populate roto en otro lado | fix en un punto de core; validador de blast radius cross-mod (S2.T4) |
| Un solo clean/reset se revierte (flush:'pre') | high (si se implementa mal) | fix no toma efecto | doble llamado (ahora + nextTick), patron UPONE-1458 (H6) |

## Open questions

- (ninguna — H1..H8 confirmadas; A/B/C/D ratificadas en DEC-LOCAL-01)

## Decisions

### DEC-LOCAL-01: B (clean+resetValidators en core) + C (guard view); A follow-up; D descartada
- **Contexto**: los sintomas son 3 mecanismos (dirty on-mount, rojo on-mount, cancel-en-view); 912 evidencia la intencion pero cubre otro disparador y arrastra scope.
- **Drivers**: cobertura del caso reportado, blast radius (un punto de core cubre 43 campos), no tocar mods, API confirmada en runtime (H6/H7), reversibilidad, coordinacion core/mod.
- **Elegida**: B (`clean()`+`resetValidators()` x2 en `executePopulation` on-mount) + C (guard `view` en `handleCancelAttempt`).
- **Alternativas**: A (snapshot de 912) → follow-up para el caso de tags; D (cambiar contrato dual-populate para que el mod no emita `''`) → mayor blast radius + coordinacion, se documenta; merge de la rama 912 → descartado (498 commits + scope ajeno + rutas movidas).
- **Consecuencias**: cierra los 3 sintomas del incidente con cambio minimo y generico; deja el caso de tags como deuda anotada (A).
- **Session**: design (confirmada con runtime H6/H7 + blast radius).

## Technical reference

- `RecordDetail.vue`: `executePopulation` (update on-mount `:993`/`:1006`, disparo `triggerOnMount` `:1016-1020`), `isDirty()` `:6231`. API vueform del element: `clean()`, `resetValidators()`, `reset()` (confirmadas en runtime).
- `ModalStackManager.vue`: `handleCloseAttempt` (guard view) vs `handleCancelAttempt` (sin guard).
- Precedente del enfoque: `mods/curriculum-mapping/modsComponents/RecordCollectionEditor/elementBridge.ts:112-124` (UPONE-1458, doble `clean()`).
- Referencia (NO merge): rama `origin/Feat/UPONE-912` (`b58ce42c`), snapshot isDirty para el caso de tags.
- Origen del `''` (interaccion core/mod): `mods/curriculum-design/modsComposables/useOwnerIdOptions.ts:89-91`.
- Blast radius y evidencia runtime H6/H7: ticket `TICKET-128` (secciones Triage y Radio de regresion).

## Acceptance checkpoints

- [ ] **Funcional**: TC-1/TC-2/TC-4 pasan (sin falso dirty, sin rojo on-mount, view cierra directo).
- [ ] **Regresion**: TC-3 (edicion real marca dirty), TC-2b (submit valida), TC-2c (valor persiste) pasan.
- [ ] **Validador blast radius** (DET-36): smoke antes/despues en curriculum (create+view) + up1-manager (fielddefinition-create ALTA cross-mod, app-create MEDIA); populate/valor/submit intactos; mods sin tocar.
- [ ] **Rules**: DET-40 auditoria de reemplazo cubierta; fix acotado al path on-mount.
- [ ] **Sin artefactos de sync commiteados**; commits/PR con id `UPONE-1540` (DET-19/27); rama core, revision del team.
- [ ] **Planning-completeness / necessity**: entries registradas.

## Archiving

Usar `/dkc-archive-spec` cuando deje de ser fuente de verdad. No borrar manualmente.
