---
id: SPEC-frontend-login-screen
project: jormat-evolution
ticket: JOR-004
status: done
---

# Login & landing — componente `<LoginScreen>` (rediseño pre-auth)

# Login & landing — componente `<LoginScreen>` (rediseño pre-auth)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive abajo (Requirements, Artifacts, Tasks).*

**Que se quiere**: rediseñar la pantalla que ve un visitante anonimo antes de loguearse. Hoy es un `<div>` con un `<button>` incrustado en el `AuthGuard`. Se extrae a un componente propio `<LoginScreen>` con el lenguaje visual de la plataforma (marca green-600, claro/oscuro, responsive) y tres estados (idle con CTA, loading "Inicializando…", error de auth). El componente **reusa** la llamada de login MSAL ya entregada — no reimplementa nada del flujo de autenticacion (RULE-global-003).

**Decisiones criticas** (resueltas en autopilot super — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `<LoginScreen>` **consume `useMsal()` internamente** (lee `inProgress`, llama `loginRedirect`) — no recibe la logica por props | Coincide con el Request ("reusa `useMsal().loginRedirect`") y con el plan de tests (mock de `useMsal`); deja el `AuthGuard` mas limpio |
| 2 | **Marca tipografica** ("J" en recuadro `bg-primary` + wordmark "Jormat Evolution") en vez de logo grafico | No existe asset de logo en `public/`; replicar el `Sidebar` viola RULE-003 |
| 3 | El estado **error** captura el reject de `loginRedirect` con estado local de UI; reemplaza el `console.error` entregado por un mensaje amistoso + reintentar | C6 (sin `console.*`); los errores de **config** ya los maneja `MsalProviderWrapper` aguas arriba (antes de montar el guard) |

**Riesgos principales y como los mitigamos**:

- **Tocar `AuthGuard.tsx` (codigo entregado) podria rozar RULE-003** → solo se reemplaza la *presentacion* de la rama `!isAuthenticated` (`<div>` → `<LoginScreen />`); el orden de evaluacion del guard, el `loginRedirect(loginRequest)` y el `initialize()` post-login quedan identicos. `execute_scope` incluye `src/auth/` explicitamente. Reviewer aislado verifica blast radius.
- **Flake de Storybook+Vitest en cold cache** (deps no pre-bundleadas en stories nuevas, learn L3 de JOR-003) → `LoginScreen` reusa deps ya declaradas en `optimizeDeps.include` (`clsx`, `tailwind-merge`, `lucide-react`); si introduce una nueva, agregarla.
- **Contraste del CTA primario** (green-600 + blanco ≈ 3.33:1 en claro, learn DEC-LOCAL-05 de JOR-003) → el CTA usa label ≥14px semibold (umbral UI 3:1 cumple); se documenta.

**Que NO se hace en este ticket** (limites explicitos):

- Tocar la **logica** MSAL/AuthGuard entregada (`MsalProviderWrapper`, `msalConfig.ts`, el flujo `loginRedirect`/`initialize`) — RULE-003.
- El branding de la pantalla **hosteada por Azure CIAM** (es config del portal de Azure, no codigo).
- Shell/nav, montar el `ThemeToggle` en el header (JOR-005); el flujo 403→login (JOR-008).

**Tamano estimado**: 1 session ejecutable (~1.5-2h efectivas). La task mas delicada es S1.T1 (el componente con sus 3 estados + accesibilidad).

**Como vas a saber que funciona**:

- Abro Storybook y veo `LoginScreen` en claro y oscuro, con los estados idle / loading / error, a11y en verde.
- Corro `npm test` y pasan: el click en el CTA llama `loginRedirect` (mock de `useMsal`), `inProgress != None` muestra loading, el error muestra el mensaje.
- Corro `npm run build` sin errores; la app autenticada (children del guard) y el flujo de login real siguen funcionando igual.

---

## Purpose

Extraer la presentacion de la pantalla pre-auth de `front/jormat-front` a un componente `<LoginScreen>` (`src/components/auth/LoginScreen.tsx`) acorde al design system de JOR-003: marca green-600, claro/oscuro via tokens, responsive, y estados idle/loading/error. El componente consume `useMsal()` para reusar `instance.loginRedirect(loginRequest)` (sin alterar el flujo entregado) y se monta desde la rama `!isAuthenticated` del `AuthGuard` reemplazando el markup inline actual (cambio aditivo, RULE-global-003).

## Requirements

### REQ-01: `<LoginScreen>` de presentacion (marca + CTA + claro/oscuro + responsive)

> **Que cambia**: el visitante anonimo ya no ve un boton suelto sobre fondo gris, sino una pantalla centrada con la marca verde, copy de bienvenida y un CTA claro, que se ve bien en claro/oscuro y en movil.
> **Por que**: la entrada a la plataforma debe reflejar el design system (JOR-003); hoy el login es un placeholder del scaffold.

El sistema MUST proveer `src/components/auth/LoginScreen.tsx`: un componente de presentacion (sin logica de negocio propia, C1) que renderiza la marca tipografica ("J" en recuadro `bg-primary` + wordmark "Jormat Evolution"), un copy de bienvenida y un CTA "Iniciar sesion", usando exclusivamente tokens de JOR-003 (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, etc.) compuestos con `cn()`, con layout centrado responsive (1 columna en movil, card centrada). MUST verse correcto en claro y oscuro (clase `.dark` gestionada por el `ThemeProvider`, el componente no maneja tema).

**Actor**: user (visitante no autenticado)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: render en claro
- **GIVEN** `LoginScreen` montado sin `.dark` en `<html>`
- **WHEN** se renderiza
- **THEN** muestra la marca, el copy y el CTA con tokens claros (fondo `background`, CTA `bg-primary` verde)

#### Scenario: render en oscuro
- **GIVEN** `<html class="dark">`
- **WHEN** se renderiza `LoginScreen`
- **THEN** usa los valores `.dark` de los tokens (fondo oscuro, CTA verde `.dark`), legible

#### Scenario: responsive (edge)
- **GIVEN** viewport movil (~375px)
- **WHEN** se renderiza
- **THEN** la card se mantiene centrada y el CTA ocupa el ancho disponible sin overflow

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la story `LoginScreen/Default` en Storybook y ve la pantalla con marca verde; togglea a oscuro y sigue legible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | render claro | sin `.dark` | render | marca+CTA tokens claros | CTA `bg-primary` verde |
| 2 | render oscuro | `.dark` | render | tokens `.dark` | legible, CTA verde |
| 3 | responsive | viewport movil | render | card centrada | sin overflow |

### REQ-02: Estados loading y error

> **Que cambia**: mientras MSAL inicializa, la pantalla muestra "Inicializando…" en vez del CTA; si el login falla, muestra un mensaje amistoso con opcion de reintentar.
> **Por que**: el `inProgress` de MSAL y el reject de `loginRedirect` hoy no tienen feedback visual (el error solo iba a `console.error`).

El sistema MUST mostrar un estado **loading** ("Inicializando…", con indicador) cuando `inProgress !== InteractionStatus.None`, y un estado **error** (mensaje amistoso + CTA de reintentar, sin exponer stack ni detalle tecnico) cuando la invocacion a `loginRedirect` es rechazada. El estado idle (CTA "Iniciar sesion") es el por defecto cuando MSAL esta en reposo y no hay error.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: loading durante inProgress
- **GIVEN** `useMsal()` devuelve `inProgress = 'login'` (o cualquier valor != `None`)
- **WHEN** se renderiza `LoginScreen`
- **THEN** muestra "Inicializando…" y NO muestra el CTA clickeable

#### Scenario: error al fallar el login
- **GIVEN** `instance.loginRedirect` rechaza
- **WHEN** el usuario hace click en el CTA y la promesa falla
- **THEN** se muestra un mensaje amistoso de error + boton "Reintentar", sin stack

#### Scenario: idle por defecto
- **GIVEN** `inProgress = None` y sin error
- **WHEN** se renderiza
- **THEN** muestra el CTA "Iniciar sesion" habilitado

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en Storybook, la story `Loading` muestra "Inicializando…" y la story `Error` muestra el mensaje con reintentar.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | loading | `inProgress != None` | render | "Inicializando…" | sin CTA |
| 2 | error | loginRedirect rechaza | click CTA | mensaje + reintentar | sin stack |
| 3 | idle | `inProgress=None`, sin error | render | CTA visible | habilitado |

### REQ-03: Reusa `useMsal().loginRedirect(loginRequest)` (no reimplementa)

> **Que cambia**: el CTA dispara exactamente el mismo login que hoy (`instance.loginRedirect(loginRequest)`); cambia solo donde vive la llamada, no que hace.
> **Por que**: RULE-003 — el flujo de autenticacion entregado no se reescribe; el componente lo reusa.

El sistema MUST disparar el login mediante `useMsal().instance.loginRedirect(loginRequest)` (importando `loginRequest` de `src/auth/msalConfig.ts`) al click del CTA, sin re-implementar, envolver ni alterar la configuracion del flujo. MUST leer `inProgress` del mismo hook para el estado loading (REQ-02).

**Actor**: system
**Layers**: frontend (auth)

<details><summary>Scenarios de validacion</summary>

#### Scenario: click dispara loginRedirect
- **GIVEN** `LoginScreen` en estado idle con `useMsal` mockeado
- **WHEN** el usuario hace click en "Iniciar sesion"
- **THEN** se llama `instance.loginRedirect` con `loginRequest` exactamente una vez

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en el test, el spy de `loginRedirect` se llama al click; en la app real, el click redirige al portal de Azure.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | click→login | useMsal mock | click CTA | `loginRedirect(loginRequest)` | llamado 1x |

### REQ-04: Cableado aditivo en `AuthGuard`

> **Que cambia**: la rama `!isAuthenticated` del `AuthGuard` pasa de tener el markup inline a `return <LoginScreen />`. El resto del guard no cambia.
> **Por que**: extraer la presentacion sin tocar la logica del portero entregado.

El sistema MUST reemplazar el bloque JSX inline de la rama `!isAuthenticated` (`AuthGuard.tsx` L28-44) por `return <LoginScreen />`, conservando intactos: el orden de evaluacion del guard, el `useEffect` de `initialize()`, las ramas de loading (`inProgress`/`isLoading`) y el render de `children`. El `loginRedirect` y `loginRequest` que hoy viven inline en el guard se trasladan al `LoginScreen` (que los consume via `useMsal`), no se duplican.

**Actor**: system
**Layers**: frontend (auth)

<details><summary>Scenarios de validacion</summary>

#### Scenario: guard renderiza LoginScreen
- **GIVEN** usuario no autenticado y MSAL en reposo
- **WHEN** el `AuthGuard` evalua `!isAuthenticated`
- **THEN** renderiza `<LoginScreen />` (no el `<div>` inline)

#### Scenario: ramas no tocadas (edge — regression)
- **GIVEN** el `AuthGuard` modificado
- **WHEN** se inspecciona el flujo
- **THEN** el `useEffect` de `initialize`, las ramas de loading y `children` quedan identicos

</details>

#### Acceptance
**El usuario puede verificar que funciona**: levanta la app sin sesion y ve el nuevo `LoginScreen`; al loguearse, entra a la app igual que antes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | guard→LoginScreen | no auth | evalua guard | render LoginScreen | sin `<div>` inline |
| 2 | regression guard | guard modificado | revisar diff | ramas intactas | solo presentacion cambia |

### REQ-05: Stories + tests automatizados

> **Que cambia**: `LoginScreen` gana stories (idle/loading/error, claro/oscuro) que corren como tests + a11y, y tests unitarios (click→loginRedirect mock, inProgress→loading, error→mensaje).
> **Por que**: la prueba de que la pantalla funciona vive en Storybook + Vitest (la app pre-auth no se monta en CI).

El sistema MUST incluir `src/components/auth/LoginScreen.stories.tsx` con stories por estado (Default/Loading/Error) y tema (claro/oscuro via decorator) ejecutadas como tests (`@storybook/addon-vitest`) con chequeo a11y (`@storybook/addon-a11y`), y al menos una story con `play()` o un `LoginScreen.test.tsx` (Vitest + Testing Library) que verifique: (a) click en el CTA llama `loginRedirect` (mock de `useMsal`); (b) `inProgress != None` muestra loading; (c) estado error muestra el mensaje. Los mocks de `useMsal` no deben requerir red ni MSAL real.

**Actor**: system
**Layers**: frontend (test)

<details><summary>Scenarios de validacion</summary>

#### Scenario: stories como tests pasan
- **GIVEN** las stories de `LoginScreen`
- **WHEN** `npm test` corre (cold cache)
- **THEN** las stories se ejecutan como tests y pasan, a11y en verde, sin reload de Vite

#### Scenario: test de interaccion
- **GIVEN** `LoginScreen` con `useMsal` mockeado
- **WHEN** `npm test`
- **THEN** los asserts (click→loginRedirect, loading, error) pasan con valores concretos

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `npm test` y ve las suites de `LoginScreen` en verde.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | stories-as-tests | stories LoginScreen | `npm test` | pasan + a11y | verde, sin reload |
| 2 | interaccion | useMsal mock | `npm test` | click/loading/error | asserts verdes |

### REQ-PRESERVE-01: No romper la logica de auth entregada (regression)

> **Que cambia**: nada para el flujo de autenticacion — garantia de que `MsalProviderWrapper`, `msalConfig`, el `loginRedirect`/`initialize` y las ramas no-login del guard siguen funcionando igual.
> **Por que**: RULE-global-003 prohibe reescribir la base entregada; el cambio debe ser verificablemente solo-presentacion.

El sistema MUST NOT alterar `MsalProviderWrapper.tsx`, `msalConfig.ts` ni la logica del `AuthGuard` fuera de la rama de presentacion `!isAuthenticated`. El comportamiento de login (redirect a CIAM), el auto-provision y el `initialize()` post-login MUST quedar identicos.

**Actor**: system
**Layers**: frontend (auth)

<details><summary>Scenarios de validacion</summary>

#### Scenario: cadena MSAL intacta
- **GIVEN** todo el cambio de JOR-004 aplicado
- **WHEN** `npm run build` + reviewer aislado revisa el diff
- **THEN** solo `LoginScreen.tsx` (nuevo) + la rama de presentacion de `AuthGuard.tsx` cambian; `MsalProviderWrapper`/`msalConfig` sin diff

</details>

#### Acceptance
**El usuario puede verificar que funciona**: compara `git diff` — solo el componente nuevo y la rama de presentacion del guard aparecen.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | regression auth | cambios aplicados | build + diff | cadena MSAL sin tocar | solo presentacion |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Accessibility | CTA y mensajes accesibles (aria, foco, contraste) en ambos modos | a11y (axe) + ratio WCAG | 0 violaciones; CTA ≥ 3:1 (UI) |
| Security | No exponer detalle tecnico/stack en el estado error | — | mensaje amistoso, sin stack |
| UX | El estado loading evita que el usuario re-dispare el login mientras MSAL inicializa | CTA deshabilitado/oculto en loading | sin doble-submit |

## Artifacts

Sin meta-specs en el proyecto. Artefactos ad-hoc que crea/toca esta feature:

### Archivos nuevos
| Archivo | Proposito |
|---------|-----------|
| `src/components/auth/LoginScreen.tsx` | Componente de presentacion de la pantalla pre-auth (marca, CTA, estados idle/loading/error, claro/oscuro, responsive; consume `useMsal`) |
| `src/components/auth/LoginScreen.stories.tsx` | Stories por estado/tema como tests + a11y |
| `src/components/auth/LoginScreen.test.tsx` | Tests de interaccion (click→loginRedirect mock, loading, error) |

### Archivos modificados (aditivo)
| Archivo | Cambio |
|---------|--------|
| `src/auth/AuthGuard.tsx` | Reemplazar el markup inline de la rama `!isAuthenticated` por `<LoginScreen />` (presentacion); el resto del guard intacto |

## Tasks

### Session 1 — LoginScreen + cableado + stories/tests [tipo: auto] [tier: T2]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `LoginScreen.tsx`: presentacion (marca "J"+wordmark green-600, copy, CTA), estados idle/loading (`inProgress`)/error (reject de `loginRedirect`), claro/oscuro via tokens, responsive; consume `useMsal()`+`loginRequest`; `cn()`, tipado sin `any` | REQ-01, REQ-02, REQ-03 | developer | — | src/components/auth/LoginScreen.tsx | render en story + build OK | git revert | DET-1, DET-2, DET-8, RULE-global-001, RULE-global-003 | done | 1 |
| S1.T2 | Cablear `AuthGuard.tsx`: reemplazar el JSX inline de la rama `!isAuthenticated` (L28-44) por `return <LoginScreen />`; conservar useEffect/ramas loading/children; quitar el `loginRedirect`+`console.error` inline (migrados a LoginScreen) | REQ-04, REQ-PRESERVE-01 | developer | S1.T1 | src/auth/AuthGuard.tsx | build OK + diff solo presentacion | git revert | DET-5, DET-8, DET-10, DET-16, RULE-global-003 | done | 1 |
| S1.T3 | Stories `LoginScreen.stories.tsx` (Default/Loading/Error, claro/oscuro via decorator) como tests + a11y; `LoginScreen.test.tsx`: click→`loginRedirect` (mock useMsal), `inProgress`→loading, error→mensaje | REQ-05 | developer | S1.T1 | src/components/auth/LoginScreen.stories.tsx, src/components/auth/LoginScreen.test.tsx | `npm test` verde + a11y | git revert | DET-7, DET-13, RULE-global-001 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, `npm test` + `npm run build` + quality review aislado (DET-23: RULE-003 aditivo + blast radius) + mutation (DET-31, WARN-FIRST), commits (DET-27), decidir continue/close | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + tests verdes + reviewer | (no aplica) | DET-20, DET-23, DET-27, DET-31 | done | 1 |

### Task contract (detalle de las criticas)

```
Task S1.T1: LoginScreen (presentacion + estados + consume useMsal)
- source_ref: REQ-01, REQ-02, REQ-03
- agent: developer
- files: src/components/auth/LoginScreen.tsx
- precondition: tokens JOR-003 disponibles (cerrado); cn() + lucide-react presentes
- expected_output: componente 'use client' tipado (sin any) que renderiza marca/CTA/estados, usa tokens por rol, consume useMsal().instance.loginRedirect(loginRequest) y lee inProgress; error en estado local (sin console.*)
- validation: render en story (S1.T3) + npm run build OK
- rollback: git rm del archivo nuevo
- rules: [DET-1, DET-2, DET-8, RULE-global-001, RULE-global-003]

Task S1.T2: cablear AuthGuard (aditivo)
- source_ref: REQ-04, REQ-PRESERVE-01
- agent: developer
- depends_on: S1.T1
- files: src/auth/AuthGuard.tsx
- precondition: LoginScreen existe (S1.T1)
- expected_output: rama !isAuthenticated retorna <LoginScreen />; useEffect/initialize, ramas loading y children intactos; import de loginRequest/console.error inline removidos del guard
- validation: npm run build OK; git diff muestra solo la rama de presentacion cambiada
- rollback: git revert del archivo
- rules: [DET-5, DET-8, DET-10, DET-16, RULE-global-003]

Task S1.T3: stories + tests
- source_ref: REQ-05
- agent: developer
- depends_on: S1.T1
- files: src/components/auth/LoginScreen.stories.tsx, src/components/auth/LoginScreen.test.tsx
- precondition: LoginScreen existe (S1.T1)
- expected_output: stories Default/Loading/Error en claro/oscuro como tests + a11y; test de interaccion con mock de useMsal (click->loginRedirect, loading, error)
- validation: npm test verde (cold cache, sin reload Vite); a11y sin violaciones
- rollback: git rm de los archivos de test
- rules: [DET-7, DET-13, RULE-global-001]
```

## Constraints

- RULE-global-003: No modificar la base entregada — `MsalProviderWrapper`, `msalConfig.ts` y la logica del `AuthGuard` (fuera de la rama de presentacion) no se tocan; el cableado es aditivo/de presentacion.
- RULE-global-001: Estandares de calidad/DoD (C1–C6) — componente de presentacion puro, sin `any`, sin codigo muerto, sin `console.*`.
- RULE-global-004: Stack de dev — sin `console.*` colado (el `console.error` del guard se reemplaza por estado de error).
- DET-30: trabajar en rama de ticket (no protegida).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-frontend-theme-system (JOR-003) | internal | Tokens claro/oscuro, `primary`=green-600, `cn()`, patron de componente | Cerrado — bajo |
| JOR-002 (A0 tooling) | internal | Storybook + addon-vitest/a11y, Vitest (browser mode), `optimizeDeps.include` | Cerrado — bajo |
| `@azure/msal-react` / `@azure/msal-browser` | external | `useMsal`, `InteractionStatus`, `loginRequest` (entregados) | Presente — bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Editar `AuthGuard.tsx` roza RULE-003 (codigo entregado) | medium | medium | Solo reemplazar presentacion de 1 rama; logica intacta; reviewer aislado verifica blast radius (solo LoginScreen + rama del guard) |
| Flake Storybook+Vitest cold cache (deps nuevas no pre-bundleadas) | low | low | Reusar deps ya en `optimizeDeps.include`; si LoginScreen suma una nueva, agregarla (learn L3 JOR-003) |
| Contraste CTA primario (green-600 + blanco ~3.33:1 en claro) | low | low | CTA con label ≥14px semibold (umbral UI 3:1 cumple); documentado (DEC-LOCAL-05 JOR-003) |
| Mock de `useMsal` no representa el shape real | low | medium | Tipar el mock contra la firma de `useMsal` (instance.loginRedirect, inProgress) |

## Open questions

(Ninguna — las hipotesis del intake (H1/H2/H3) se confirmaron con evidencia multi-capa; el gap de logo se resolvio con marca tipografica.)

## Decisions

### DEC-LOCAL-01: `<LoginScreen>` consume `useMsal()` internamente (no por props)
- **Contexto**: dos formas de conectar el CTA con el login — el componente consume el hook, o el guard lee MSAL y pasa callbacks/estado por props.
- **Drivers**: el Request dice "reusa `useMsal().loginRedirect`"; el plan de tests dice "mock de `useMsal`" (solo tiene sentido si el componente importa el hook); deja el guard mas limpio.
- **Opcion elegida**: `LoginScreen` importa `useMsal` + `loginRequest`, lee `inProgress`, llama `loginRedirect` al click.
- **Alternativas**: todo por props (descartada: contradice Request y plan de tests; mas plumbing en el guard, roza "no tocar la logica").
- **Consecuencias**: el test del componente mockea `useMsal` (manejable, tipado).
- **Session**: design (super).

### DEC-LOCAL-02: Marca tipografica (sin logo grafico)
- **Contexto**: no hay asset de logo en `public/`; la marca actual es texto + letra "J".
- **Drivers**: no inventar assets; no replicar el `Sidebar` entregado (RULE-003); coherencia con tokens.
- **Opcion elegida**: "J" en recuadro `bg-primary` + wordmark "Jormat Evolution".
- **Alternativas**: copiar el bloque de marca del `Sidebar` (descartada: toca/duplica codigo entregado); logo grafico (descartada: no existe asset).
- **Consecuencias**: si luego hay logo oficial, se reemplaza el recuadro (cambio acotado).
- **Session**: design (super).

### DEC-LOCAL-03: Estado error local que reemplaza el `console.error` entregado
- **Contexto**: hoy el `loginRedirect` del guard captura el reject con `console.error`; C6 prohibe `console.*`.
- **Drivers**: dar feedback al usuario; cumplir C6; los errores de **config** ya los maneja `MsalProviderWrapper` aguas arriba (no llegan al LoginScreen).
- **Opcion elegida**: `useState` local de error en `LoginScreen`; el catch del `loginRedirect` setea el mensaje amistoso + reintentar.
- **Alternativas**: mantener `console.error` (descartada: viola C6); propagar el error a un store global (descartada: sobre-ingenieria para una pantalla pre-auth).
- **Consecuencias**: el `console.error` inline del guard desaparece al migrar la presentacion.
- **Session**: design (super).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan; LoginScreen muestra idle/loading/error en claro y oscuro
- [ ] **Tests**: stories como tests + `LoginScreen.test.tsx` verdes (asserts concretos: click→loginRedirect, loading, error)
- [ ] **NFRs**: a11y sin violaciones; error sin stack; CTA no re-disparable en loading
- [ ] **Rules**: RULE-global-001/003/004 respetadas (presentacion pura, sin `any`, sin `console.*`, logica MSAL intacta)
- [ ] **Integration**: `npm run build` OK; cadena MSAL/AuthGuard (fuera de la rama de presentacion) sin cambios (REQ-PRESERVE-01)
- [ ] **Docs**: decisiones registradas; (opcional) nota en `jormat_docs/frontend/auth.md` sobre el LoginScreen

## Technical reference

- `AuthGuard` actual: `src/auth/AuthGuard.tsx` — rama `!isAuthenticated` en L28-44; `useMsal`/`inProgress`/`InteractionStatus` (L10-12); `useEffect` de `initialize` (L14-18).
- `loginRequest`: `src/auth/msalConfig.ts:33` (`{ scopes: ['openid','profile','email'] }`).
- Tokens (JOR-003): `src/app/globals.css` `:root`/`.dark`; `primary` = green-600 (`142 76% 36%`).
- Patron de componente + `cn()`: `src/components/ui/ThemeToggle.tsx`, `src/lib/utils.ts`.
- Stack de test (JOR-002/JOR-003): Storybook `@storybook/nextjs-vite` + `addon-vitest` (browser, Playwright/Chromium) + `addon-a11y`; Vitest; `optimizeDeps.include: ['clsx','tailwind-merge','lucide-react']` (learn L3).
- Preview del diseño aprobado: `tickets/JOR-004.draft/preview.html` (claro/oscuro + 3 estados).
