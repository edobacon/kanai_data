---
id: SPEC-JOR-154-frontend-mutation-coverage
project: jormat-evolution
ticket: JOR-154
status: in_progress
---

# Cerrar deuda de coverage/mutation frontend: useIdleTimer, sidebar nav, guardar-borrador

# Cerrar deuda de coverage/mutation frontend: useIdleTimer, sidebar nav, guardar-borrador

## Purpose

Subir el mutation/coverage score de tres areas de deuda tecnica del frontend (jormat-front), test-only, sin cambio de codigo de produccion: `useIdleTimer` (front-behaviors BL-01), `getEntryPath`/`isEntryEnabled` de nav-data (sidebar BL-01) y la regresion "Guardar borrador NO navega" en `TransactionBuilder` (flow-rules B3/B4).

## Requirements

### REQ-1: `useIdleTimer` — matar mutantes de ACTIVITY_EVENTS y del clamp de idleMs

> **Que cambia**: se agregan tests que fuerzan cada evento de `ACTIVITY_EVENTS` (scroll, click, touchstart) por separado y el clamp `Math.max(0, idleMs - warnMs)`.
> **Por que**: el mutation report previo dejaba sobrevivir mutantes `ArrayDeclaration` sobre `ACTIVITY_EVENTS` y el mutante de comparacion del clamp; la cifra "60%" del ticket original es stale — el score real pre-session era ~70.8%.

El sistema MUST tener tests que disparen cada evento de `ACTIVITY_EVENTS` de forma individual (no solo agregada) y verifiquen el reset del timer, y un test que verifique el clamp `Math.max(0, idleMs - warnMs)` en sus dos ramas (resultado negativo clampeado a 0, resultado positivo sin alterar).

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cada evento de actividad resetea el timer
- **GIVEN** el hook montado con `ACTIVITY_EVENTS` activo
- **WHEN** se dispara `scroll`, luego (por separado) `click`, luego `touchstart`
- **THEN** cada evento individual resetea el timer de inactividad

#### Scenario: clamp del warn time no permite negativos
- **GIVEN** `idleMs < warnMs`
- **WHEN** se calcula el tiempo de warning
- **THEN** el resultado es `0`, no un valor negativo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: correr `dkc-mutate` scoped sobre `useIdleTimer` y ver los 2 mutantes objetivo (ArrayDeclaration de ACTIVITY_EVENTS, clamp) muertos. Los survivors residuales (ConditionalExpression en null-guards de `clearTimers`, deps de `useEffect`/`useCallback`, `{passive:true}` que jsdom no observa) quedan documentados como equivalentes (won't-fix).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Evento individual resetea | hook activo | dispara `scroll` | reset del timer | timer reiniciado, mutante ArrayDeclaration muerto |
| 2 | Clamp no negativo | `idleMs < warnMs` | calcula warn time | resultado `0` | mutante de comparacion muerto |

### REQ-2: sidebar/nav — cubrir `getEntryPath`/`isEntryEnabled` y literales `cap`/`hasView`

> **Que cambia**: tests unitarios que ejercitan la rama `!i.hidden` y los literales de capability (`cap`, `hasView`) de `getEntryPath`/`isEntryEnabled`.
> **Por que**: el mutation report de S1 (score 88.1) dejaba 8 mutantes sobrevivientes en esas funciones; ademas viven en `Home.tsx`, no en `Sidebar.tsx` como decia el ticket original (`Sidebar.tsx` consume `NAV_ENTRIES` directo).

El sistema MUST tener tests que cubran la rama `!i.hidden` de `getEntryPath`/`isEntryEnabled` (en `Home.tsx`) y los literales `cap`/`hasView` de `nav-data.ts`, matando los 8 mutantes sobrevivientes de S1.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: entrada oculta no aparece en el path
- **GIVEN** una entrada de nav con `hidden: true`
- **WHEN** se computa `getEntryPath`/`isEntryEnabled`
- **THEN** la entrada se excluye segun la rama `!i.hidden`

#### Scenario: literales de capability determinan habilitacion
- **GIVEN** una entrada con `cap`/`hasView` definidos
- **WHEN** el usuario no tiene la capability
- **THEN** `isEntryEnabled` retorna `false` para ese literal exacto

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los 8 mutantes de S1 quedan muertos en un re-run scoped de `dkc-mutate` sobre `nav-data.ts`/`Home.tsx` (diferido a backlog por costo — ver Backlog del ticket).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Rama `!i.hidden` | entrada hidden | getEntryPath | excluida | mutante de rama muerto |
| 2 | Literal `cap`/`hasView` | sin capability | isEntryEnabled | `false` | mutante literal muerto |

### REQ-3: regresion "Guardar borrador NO navega" — sustituto ejecutable del TC3 moot

> **Que cambia**: se agrega una assertion `mockPush.not.toHaveBeenCalled()` en el path dirty→Cancelar→"Salir sin guardar" del guard test de `TransactionBuilder`, en vez del TC3 literal (que no es ejecutable hoy).
> **Por que**: `SHOW_SAVE_DRAFT=false` oculta el boton "Guardar borrador" en todo punto (JOR-118/JOR-136), asi que el TC3 original ("click en Guardar borrador no navega") no tiene un boton que clickear. La regresion real —que salir sin guardar no navega salvo confirmacion— se cubre por el path que si es ejecutable.

El sistema MUST verificar, en el guard test de `TransactionBuilder`, que el path dirty→Cancelar→"Salir sin guardar" no dispara `router.push` hasta que el usuario confirma. Ver DEC-LOCAL-01 (tc3-moot) mas abajo.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cancelar sin confirmar no navega
- **GIVEN** `TransactionBuilder` dirty
- **WHEN** se pulsa Cancelar y se cierra el dialogo sin confirmar salida
- **THEN** `mockPush` no fue llamado

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el test del guard falla si se remueve el `preventDefault`/gate de navegacion (mutation-sensitive).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | No navega sin confirmar | dirty | Cancelar sin confirmar | sin push | `mockPush.not.toHaveBeenCalled()` |

### REQ-4: verificacion de mutation jsdom-only (scope acotado)

> **Que cambia**: se corre `dkc-mutate` excluyendo el proyecto storybook/browser (timeoutea) sobre `useIdleTimer`, confirmando empiricamente que los 2 mutantes objetivo de REQ-1 murieron.
> **Por que**: DET-31/flow-rules B4 exige backing empirico del testing, no solo tests que pasan.

El sistema MUST correr `dkc-mutate` jsdom-only scoped sobre `useIdleTimer` y registrar el resultado (mutantes muertos vs sobrevivientes). El run scoped sobre `nav-data.ts`/`Home.tsx` (107 mutantes, mayoria estatica) queda diferido a backlog por tiempo de ejecucion — ver Backlog del ticket, recomendacion `ignoreStatic`.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: mutantes objetivo de useIdleTimer muertos
- **GIVEN** el diff de tests de REQ-1 aplicado
- **WHEN** se corre `dkc-mutate` scoped jsdom-only sobre `useIdleTimer`
- **THEN** los 2 mutantes objetivo (ArrayDeclaration, clamp) aparecen como `Killed`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: output de Stryker scoped muestra `Killed` para ambos mutantes objetivo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Mutantes objetivo muertos | tests de REQ-1 | stryker scoped | ambos Killed | evidencia en session log |

## Tasks

### Session 1 — Tests de mutation/coverage frontend (useIdleTimer, sidebar, guardar-borrador) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Tests de `useIdleTimer`: eventos individuales de `ACTIVITY_EVENTS` (scroll/click/touchstart) + clamp `Math.max(0, idleMs-warnMs)` | REQ-1 | developer | — | front/jormat-front/src/hooks/useIdleTimer/useIdleTimer.test.ts (o path equivalente) | vitest | git revert | DET-1, DET-2, DET-7, DET-8 | done | 1 |
| S1.T2 | Tests de nav: rama `!i.hidden` + literales `cap`/`hasView` de `getEntryPath`/`isEntryEnabled` (Home.tsx) | REQ-2 | developer | — | front/jormat-front/src/**/Home.test.tsx (o path equivalente) | vitest | git revert | DET-1, DET-2, DET-7, DET-8 | done | 1 |
| S1.T3 | Test de guard en `TransactionBuilder`: path dirty→Cancelar→"Salir sin guardar" sin confirmar no navega (sustituto ejecutable del TC3 moot) | REQ-3 | developer | — | front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.test.tsx (o path equivalente) | vitest | git revert | DET-1, DET-2, DET-7, DET-8 | done | 1 |
| S1.T4 | `dkc-mutate` jsdom-only scoped sobre `useIdleTimer`: confirmar mutantes objetivo de REQ-1 muertos | REQ-4 | reviewer | S1.T1 | (sin archivos nuevos — verificacion) | dkc-mutate scoped | (no aplica) | DET-31, DET-33 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2): persistir + quality review single-judge (DET-23) + self-report-verification (DET-33) + necessity/planning-completeness | — | reviewer | S1.T4 | tickets/JOR-154.md | gate persistido + vitest 2066 pass + typecheck clean | (no aplica) | DET-20, DET-23, DET-31, DET-33 | done | 1 |

## Decisions

### DEC-LOCAL-01: TC3 literal es moot — sustituido por assertion ejecutable
- **Contexto**: el TC3 original del ticket ("click en Guardar borrador no navega") asume que el boton "Guardar borrador" es clickeable, pero `SHOW_SAVE_DRAFT=false` (JOR-118/JOR-136) lo oculta en todo punto.
- **Drivers**: preservar la intencion de la regresion (salir sin guardar no navega sin confirmacion) sin inventar un flujo que no es ejecutable hoy.
- **Opcion elegida**: sustituir por la assertion `mockPush.not.toHaveBeenCalled()` en el path dirty→Cancelar→"Salir sin guardar" del guard test existente.
- **Alternativas**: (a) test con `it.skip` documentando el TC3 literal → no ejecuta, no protege nada; (b) reactivar `SHOW_SAVE_DRAFT` para poder clickear el boton → cambia produccion, fuera de alcance test-only.
- **Consecuencias**: el TC3 literal se re-abre si el flag `SHOW_SAVE_DRAFT` se reactiva. Sin cambio de produccion.
- **Session**: 1.

### DEC-LOCAL-02: survivors residuales de `useIdleTimer` — won't-fix documentado
- **Contexto**: tras REQ-1, quedan survivors en `ConditionalExpression` de los null-guards de `clearTimers`, en dependencias de `useEffect`/`useCallback`, y en `{passive:true}` (no observable por jsdom).
- **Drivers**: evaluar si perseguirlos sube el score real o si son equivalentes.
- **Opcion elegida**: won't-fix documentado — se consideran mutantes equivalentes (comportamiento indistinguible en runtime jsdom).
- **Alternativas**: forzar un test que ejercite el unmount dentro de `act()` para intentar atribuir cobertura al cleanup → item de backlog (could), no bloqueante.
- **Consecuencias**: score post-session queda por debajo del 100% teorico pero sin gap real de comportamiento.
- **Session**: 1.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-1..4 pasan.
- [x] **Tests** (DET-37 dim4): 2066 unit pass (jsdom, storybook excluido) + typecheck clean.
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): N/A — cambio test-only sin superficie observable nueva.
- [ ] **KB DKC** (DET-37 dim2): N/A — sin rule/bug nuevo; decisions DEC-LOCAL-01/02 arriba.
- [ ] **Docs externas DKC** (DET-37 dim3): N/A — no toca DKC ni convenciones.
- [x] **Planning-completeness**: registrada como `mixed` en `decisions_log` del ticket.
