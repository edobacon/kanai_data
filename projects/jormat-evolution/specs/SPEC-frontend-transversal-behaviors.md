---
id: SPEC-frontend-transversal-behaviors
project: jormat-evolution
ticket: JOR-008
status: done
---

# Comportamientos transversales (WP-A4): toasts + estados + breadcrumb + modal de sesión + Can/useCan/route-guard + páginas 403/404

# Comportamientos transversales (WP-A4): toasts + estados + breadcrumb + modal de sesión + Can/useCan/route-guard + páginas 403/404

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: Implementar los comportamientos globales (WP-A4) que toda la FASE B reúsa. Seis piezas: (A4.1) **toasts** con `sonner` — `<Toaster>` global + helpers `toast.success/error`; (A4.2) **estados reutilizables** `LoadingSkeleton` (card/list/table), `EmptyState`, `ErrorState`; (A4.3) **breadcrumb** — extender el existente (2 niveles) a un 3er nivel "Acción"; (A4.4) **modal de sesión** por inactividad con countdown (maqueta 07), que renueva con `acquireTokenSilent` y cierra con `logoutRedirect` (MSAL ya entregado — RULE-global-003); (A4.5) primitiva **`<Can>`** + hook **`useCan`** + **route guard en dos niveles** (oculta el ítem/grupo/tile del nav + bloquea acceso directo por URL → renderiza 403); (A4.6) **páginas de error** transversales — **403 "Acceso denegado"** (nueva) y **404** (ya existe, se alinea visualmente). Todo con story + test + a11y, reusando átomos/organismos de JOR-006/007.

**Decisiones criticas** (resueltas en modo super con racional — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `useCan` lee un vector `capabilities: string[]` aditivo en `auth.store`; mock en este ticket (`['*']` dev), real (`GET /api/capabilities/me`) en JOR-011 | Desacopla la primitiva del backend RBAC (fuera de alcance). Campo aditivo → no rompe consumidores del store |
| 2 | Matching de capability soporta wildcard: `*` (todo), `module.*` y `module.feature:*` (prefijo). `<Can>`/`useCan` comparten un `can(vector, cap)` puro y testeable | El vector real traerá comodines por rol; centralizar el matcher evita lógica duplicada (es el blanco de mutation) |
| 3 | El route guard renderiza la **403 inline** (no redirect) preservando la URL; `<Forbidden>` es un componente compartido que la página `app/(app)/forbidden` y el guard reusan | Redirigir perdería la URL pedida y el back del browser; inline es el patrón de las maquetas |
| 4 | Breadcrumb: el 3er nivel "Acción" entra por **prop opcional** (`action?: string`), no por inferencia de ruta — los 2 niveles existentes siguen derivando de `NAV_ENTRIES` | nav-data no modela acciones (builder pages); inferir por segmento de URL sería heurística frágil (anti-patrón T-010) |
| 5 | `useIdleTimer` separa la lógica (timer + umbral + countdown, configurable) del componente visual `SessionTimeoutModal` | C1 una responsabilidad por unidad; el hook es testeable con timers fake sin montar el modal |
| 6 | Timeout y umbral de aviso configurables vía constantes (`SESSION_IDLE_MS`, `SESSION_WARN_MS`), no magic numbers | RULE-global-001 (sin magic numbers); la maqueta 07 fija 30s de countdown como default |

**Riesgos principales y como los mitigamos**:

- **`<Can>` deja pasar/oculta de más por matcher mal calibrado** (riesgo de seguridad de UX) → `can()` puro con tests exhaustivos de wildcard + mutation warn-first sobre el matcher (DET-31). La nota de seguridad aplica: la UI **oculta**, el backend **impone** (`@RequireCapability`).
- **Timer de inactividad fuga listeners o no limpia en unmount** → `useIdleTimer` registra/des-registra listeners y `clearInterval` en cleanup; test con `vi.useFakeTimers()` verifica avance del countdown y que dispara logout en 0.
- **Modal de sesión re-escribe el flujo MSAL** (viola RULE-global-003) → solo invoca `acquireTokenSilent`/`logoutRedirect` ya existentes (`api.ts`/`auth.store`); no toca `msalConfig` ni el provider.
- **Interacción Radix (Dialog) flaky en jsdom** → RULE-frontend-002: la interacción del portal va en `play()` de la story (browser); jsdom usa `defaultOpen`/render directo y mockea timers + MSAL.
- **Solapamiento con código existente** (Breadcrumb y not-found ya existen) → A4.3 es extensión aditiva; A4.6/404 es alineación visual, no reescritura. Documentado en intent.md del draft.

**Que NO se hace** (límites explícitos):

- Lógica RBAC del backend, decoradores `@RequireCapability`, endpoint `/api/capabilities/me` → JOR-010/JOR-011.
- Conexión real del vector de capabilities (queda mock) → JOR-011.
- Lógica MSAL nueva (refresh/login flows) → base entregada, solo se invoca (RULE-global-003).
- Átomos/organismos UI (Button, Dialog, Sheet, PageLayout) → ya existen (JOR-006/007), solo se reúsan.

## Purpose

Dotar a `front/jormat-front` de los comportamientos transversales que todas las vistas de negocio (FASE B) consumen: feedback (toasts), estados de datos (carga/vacío/error), navegación contextual (breadcrumb), seguridad de sesión (modal de inactividad) y control de acceso en UI (`<Can>`/route guard + páginas 403/404). Actor: cualquier usuario autenticado del producto. Valor: consistencia UX y una capa de gating de UI reutilizable que desbloquea JOR-011 y la FASE B.

## Requirements

### REQ-01 · Toasts (sonner)

> **Que cambia**: se monta un `<Toaster>` global y se exponen helpers `toast.success()` / `toast.error()`.
> **Por que**: las vistas necesitan feedback uniforme de éxito/error sin cablear sonner en cada una.

El sistema MUST montar un único `<Toaster>` en el layout de la app y MUST exponer helpers tipados (`toast.success`, `toast.error`) que apliquen los tokens de estado del design system. El `<Toaster>` SHOULD respetar el tema activo (claro/oscuro).

- **Actor**: cualquier vista. **Layers**: frontend.
- **Acceptance**: invocar `toast.success('x')` muestra un toast verde; `toast.error('y')` uno destructivo; hay un solo Toaster en el árbol.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| App montada | se llama `toast.success('Guardado')` | aparece un toast con estilo success y el texto |
| App montada | se llama `toast.error('Falló')` | aparece un toast con estilo destructive |
| Layout | se inspecciona el árbol | existe exactamente un `<Toaster>` |
</details>

### REQ-02 · Estados reutilizables (carga / vacío / error)

> **Que cambia**: tres componentes nuevos — `LoadingSkeleton` (variantes card/list/table), `EmptyState`, `ErrorState`.
> **Por que**: cada listado/detalle de la FASE B necesita los mismos 3 estados; sin componentes compartidos se duplicarían.

El sistema MUST proveer `LoadingSkeleton` con variantes `card | list | table`, `EmptyState` (icono + título + mensaje + CTA opcional) y `ErrorState` (icono + mensaje + acción `retry`). `ErrorState` MUST invocar el callback `onRetry` al accionar el botón. `EmptyState` MUST renderizar el CTA solo si se pasa.

- **Actor**: vistas con fetching. **Layers**: frontend.
- **Acceptance**: las 3 variantes de skeleton renderizan estructura distinta; `EmptyState` sin `action` no muestra botón; `ErrorState` dispara `onRetry`.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| `LoadingSkeleton variant="table"` | render | muestra filas skeleton (estructura tabla) |
| `EmptyState` sin prop `action` | render | NO hay botón CTA |
| `EmptyState` con `action={{label,onClick}}` | click CTA | invoca `onClick` |
| `ErrorState onRetry=fn` | click "Reintentar" | invoca `fn` una vez |
</details>

### REQ-03 · Breadcrumb (3er nivel "Acción")

> **Que cambia**: el `Breadcrumb` existente (Módulo › Subsección, derivado de NAV_ENTRIES) gana un 3er nivel opcional "Acción".
> **Por que**: las páginas de alta/builder (ej. "Crear factura") necesitan mostrar `Ventas › Documentos › Crear factura`.

El `Breadcrumb` MUST aceptar una prop opcional `action?: string`; cuando se provee, MUST renderizar un 3er segmento con el separador. Sin `action`, MUST comportarse exactamente como hoy (2 niveles desde NAV_ENTRIES). El último segmento MUST marcarse como actual (`font-medium`).

- **Actor**: páginas builder. **Layers**: frontend.
- **Acceptance**: con `action="Crear factura"` en `/sales/documents` muestra 3 segmentos; sin `action`, 2.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| ruta `/sales/documents`, sin `action` | render | "Ventas › Documentos" (Documentos actual) |
| ruta `/sales/documents`, `action="Crear factura"` | render | "Ventas › Documentos › Crear factura" (acción actual) |
| ruta `/` | render | "Inicio" (un solo nivel) — sin regresión |
</details>

### REQ-04 · Modal de sesión por inactividad (maqueta 07)

> **Que cambia**: nuevo `SessionTimeoutModal` + hook `useIdleTimer`; al detectar inactividad muestra aviso con countdown.
> **Por que**: patrón de seguridad — avisar antes de expirar la sesión y permitir renovarla o cerrarla.

El sistema MUST detectar inactividad del usuario (sin eventos de teclado/mouse/scroll) durante `SESSION_IDLE_MS` y, `SESSION_WARN_MS` antes de expirar, MUST mostrar el modal con un countdown regresivo. "Mantener sesión" MUST invocar `acquireTokenSilent` (renovar) y cerrar el modal reiniciando el timer; "Cerrar sesión" MUST invocar `logoutRedirect`. Al llegar el countdown a 0 sin acción, el sistema MUST disparar el logout. El modal MUST atrapar foco y cerrar con `Esc` (= mantener). MUST reusar el `Dialog` de JOR-006 y NO reescribir el flujo MSAL (RULE-global-003).

- **Actor**: usuario autenticado. **Layers**: frontend (consume MSAL entregado).
- **Acceptance**: tras inactividad aparece el modal con countdown; "Mantener" llama `acquireTokenSilent` y reinicia; "Cerrar"/countdown-0 llaman `logoutRedirect`.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| usuario inactivo (fake timers) | pasa `SESSION_IDLE_MS - SESSION_WARN_MS` | el modal aparece con countdown en `SESSION_WARN_MS` |
| modal visible | click "Mantener sesión" | invoca `acquireTokenSilent` (mock), cierra modal, reinicia timer |
| modal visible | click "Cerrar sesión" | invoca `logoutRedirect` (mock) |
| modal visible | countdown llega a 0 sin acción | invoca `logoutRedirect` |
| usuario activo (mousemove) | antes del umbral | timer se reinicia, modal NO aparece |
</details>

### REQ-05 · `<Can>` + `useCan` + route guard en dos niveles

> **Que cambia**: `auth.store` gana `capabilities: string[]`; nuevos `useCan(cap)`, `<Can cap>` y `<RouteGuard cap>`; `NavItem`/`NavGroup`/tiles se gatean.
> **Por que**: control de acceso en UI — ocultar lo que el usuario no puede ver y bloquear el acceso directo por URL.

El sistema MUST exponer `useCan(cap: string): boolean` que evalúe `cap` contra el vector `capabilities` del `auth.store` usando un matcher `can()` puro que soporte wildcard (`*`, `module.*`, `module.feature:*`). `<Can cap>` MUST renderizar sus children solo si `useCan(cap)` es `true` (con `fallback` opcional). El route guard MUST operar en dos niveles: (1) `<Can>` envuelve `NavItem`/`NavGroup`/tile y los oculta sin la capability (grupo visible si ≥1 hijo accesible — agregación); (2) `<RouteGuard cap>` envuelve el contenido de una ruta y, si falta la capability, MUST renderizar `<Forbidden>` (403) en lugar del contenido. El vector queda **mock** en este ticket (conexión real en JOR-011).

- **Actor**: usuario autenticado. **Layers**: frontend (store, components, router).
- **Acceptance**: con vector `['sales.documents:view']`, `<Can cap="sales.documents:view">` muestra; `<Can cap="items.parts:edit">` oculta; vector `['*']` muestra todo; `<RouteGuard cap="x:y">` sin la cap renderiza 403.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| vector `['sales.documents:view']` | `useCan('sales.documents:view')` | `true` |
| vector `['sales.documents:view']` | `useCan('items.parts:edit')` | `false` |
| vector `['*']` | `useCan(cualquier)` | `true` (wildcard total) |
| vector `['sales.*']` | `useCan('sales.documents:view')` | `true` (wildcard de módulo) |
| vector `['items.parts:view']` | `<Can cap="items.parts:edit">A</Can>` | no renderiza A (renderiza `fallback` si hay) |
| NavGroup con hijos `[sales.documents:view]` y vector `[]` | render | el grupo se oculta (agregación: 0 hijos accesibles) |
| `<RouteGuard cap="x:y">` y vector sin `x:y` | acceso directo | renderiza `<Forbidden>` (403), NO el contenido |
</details>

### REQ-06 · Páginas de error transversales (403 / 404)

> **Que cambia**: nuevo `<Forbidden>` (403 "Acceso denegado") + página `app/(app)/forbidden`; se alinea visualmente el `not-found.tsx` (404) ya existente.
> **Por que**: respuestas de error con el design system, no defaults de Next; la 403 la usa el route guard.

El sistema MUST proveer `<Forbidden>` (icono + "Acceso denegado" + mensaje + CTA "Volver al inicio") usable inline por el route guard y por la ruta `app/(app)/forbidden`. La 404 (`app/not-found.tsx`) ya existe estilizada; MUST alinearse visualmente con la 403 (mismo patrón de layout/CTA). Ambas MUST renderizar correctamente en tema claro y oscuro. **Nota de seguridad**: son UX, no la frontera — el backend revalida (`@RequireCapability`).

- **Actor**: usuario sin permiso / ruta inexistente. **Layers**: frontend.
- **Acceptance**: `<Forbidden>` renderiza título/mensaje/CTA; 404 renderiza; ambas en claro y oscuro.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| `<Forbidden>` | render | muestra "Acceso denegado" + CTA "Volver al inicio" (href `/`) |
| `not-found.tsx` | render | muestra 404 estilizada con CTA al inicio |
| 403 y 404 | render con clase `.dark` | tokens oscuros aplicados (sin colores hardcoded) |
</details>

## Non-functional requirements

- **Security (UX-layer)**: `<Can>`/route guard son gating de UI, NO frontera de seguridad. El backend impone (`@RequireCapability`). Documentado en cada componente. (de RULE-global-002 baseline + permissions-by-view §3).
- **Accesibilidad**: modal con foco atrapado + `Esc`; 403/404 con jerarquía de headings; toasts con `aria-live` (lo provee sonner). Chequeo a11y por story (addon-a11y).

## Artifacts

Sin meta-specs ni artefactos DB/API (frontend puro, sin modelo de datos — `creates_data: false`). Los artefactos son componentes/hooks React, detallados en Tasks. Inventario de reúso vs nuevo en `tickets/JOR-008.draft/intent.md` (7 reusados · 10 nuevos).

Cambio en artefacto existente:
- `auth.store` (`src/stores/auth.store.ts`): se agrega `capabilities: string[]` (default `[]`; mock `['*']` en dev hasta JOR-011) + setter. Aditivo — consumidores actuales (`user`, `isAuthenticated`, `logout`) intactos.

## Tasks

### Session 1 — Toasts + estados (carga/vacío/error) [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S1.T1 | `Toaster` (sonner) + helpers `toast` + montaje en layout | developer | — | `components/ui/toaster/{toaster.tsx,index.ts,toaster.stories.tsx,toaster.test.tsx}`, `app/(app)/layout.tsx` | DET-1, DET-2, RULE-frontend-001, RULE-global-001 | vitest jsdom | pending | 1 |
| S1.T2 | `LoadingSkeleton` (card/list/table) | developer | — | `components/ui/loading-skeleton/{*.tsx,index.ts,*.stories.tsx,*.test.tsx}` | DET-1, DET-2, RULE-frontend-001/002 | vitest jsdom | pending | 1 |
| S1.T3 | `EmptyState` + `ErrorState` (con `onRetry`) | developer | — | `components/ui/empty-state/{*}`, `components/ui/error-state/{*}` | DET-1, DET-2, RULE-frontend-001/002 | vitest jsdom | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) — quality review light + commits | reviewer | S1.T1-3 | ticket, spec | DET-7, DET-13, DET-20, DET-23, DET-27 | gate persistido + vitest --coverage | pending | 1 |

### Session 2 — RBAC UI: Can + useCan + route guard + 403 [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S2.T1 | `can()` matcher puro (wildcard) + `useCan` + `capabilities` en `auth.store` | developer | — | `lib/can.ts`, `hooks/useCan.ts`, `stores/auth.store.ts`, `lib/can.test.ts`, `hooks/useCan.test.ts` | DET-1, DET-2, DET-5, DET-8, RULE-global-001/003 | vitest jsdom | pending | 2 |
| S2.T2 | `<Can cap fallback>` (render condicional) | developer | S2.T1 | `components/auth/Can/{Can.tsx,index.ts,Can.stories.tsx,Can.test.tsx}` | DET-1, DET-2, RULE-frontend-001/002 | vitest jsdom | pending | 2 |
| S2.T3 | `<Forbidden>` (403) + ruta `app/(app)/forbidden` | developer | — | `components/auth/Forbidden/{*}`, `app/(app)/forbidden/page.tsx` | DET-1, DET-2, RULE-frontend-001 | vitest jsdom | pending | 2 |
| S2.T4 | `<RouteGuard cap>` → 403 inline + gateo de `NavItem`/`NavGroup` con `<Can>` (agregación) | developer | S2.T1, S2.T2, S2.T3 | `components/auth/RouteGuard/{*}`, `components/shell/Sidebar/NavItem/NavItem.tsx`, `NavGroup/NavGroup.tsx` | DET-5, DET-8, DET-16, RULE-frontend-001/002 | vitest jsdom | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2) — quality review standard + commits | reviewer | S2.T1-4 | ticket, spec | DET-7, DET-13, DET-20, DET-23, DET-27 | gate persistido + vitest --coverage | pending | 2 |

### Session 3 — Modal de sesión + breadcrumb 3er nivel + 404 [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S3.T1 | `useIdleTimer` (timer + umbral + countdown, configurable) + constantes | developer | — | `hooks/useIdleTimer.ts`, `hooks/useIdleTimer.test.ts`, `lib/session-constants.ts` | DET-1, DET-2, RULE-global-001 | vitest jsdom (fake timers) | pending | 3 |
| S3.T2 | `SessionTimeoutModal` (maqueta 07) reusando `Dialog` + MSAL renovar/cerrar | developer | S3.T1 | `components/session/SessionTimeoutModal/{*}` | DET-1, DET-2, RULE-frontend-001/002, RULE-global-003 | vitest jsdom + story play | pending | 3 |
| S3.T3 | `Breadcrumb` 3er nivel `action?` (extensión aditiva) | developer | — | `components/shell/TopBar/Breadcrumb/Breadcrumb.tsx`, `Breadcrumb.test.tsx`, `Breadcrumb.stories.tsx` | DET-5, DET-16, RULE-frontend-001/002 | vitest jsdom | pending | 3 |
| S3.T4 | Alinear visualmente `not-found.tsx` (404) con la 403 | developer | — | `app/not-found.tsx` | DET-5, DET-16, RULE-global-001 | vitest jsdom (si test) / manual | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T2) — quality review standard + commits | reviewer | S3.T1-4 | ticket, spec | DET-7, DET-13, DET-20, DET-23, DET-27 | gate persistido + vitest --coverage | pending | 3 |

### Session 4 — Cierre WP: suite completa + mutation + a11y + review [tipo: auto] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S4.T1 | Suite completa `vitest run` (jsdom + storybook) verde + a11y de stories nuevas | reviewer | S1-S3 | (todo el WP) | DET-7, DET-13 | vitest run completo | pending | 4 |
| S4.T2 | Mutation testing (dkc-mutate, warn-first) sobre `can()`/`useCan`/`useIdleTimer` | reviewer | S4.T1 | `lib/can.ts`, `hooks/useCan.ts`, `hooks/useIdleTimer.ts` | DET-23, DET-31 | dkc-mutate (async, worktree) | pending | 4 |
| S4.T3 | Quality review exhaustiva (10 dimensiones) + lint/tipos sin squiggles | reviewer | S4.T1 | (todo el WP) | DET-13, DET-14, DET-23 | eslint+prettier+tsc | pending | 4 |
| **S4.GATE** | Gate de cierre WP (tier T3) — survivors → hardening/backlog, commits finales | reviewer | S4.T1-3 | ticket, spec | DET-13, DET-20, DET-23, DET-27, DET-31 | gate persistido | pending | 4 |

## Technical reference

- **MSAL entregado**: `getMsalInstance()` en `src/auth/MsalProviderWrapper`; `acquireTokenSilent` ya usado en `src/services/api.ts:17`; `logoutRedirect` en `src/stores/auth.store.ts:57`. El modal invoca estos, no los reescribe.
- **Tokens de estado**: `--success/--success-bg/--success-fg`, `--warning/--warning-bg`, `--destructive`, `--muted` en `src/app/globals.css` (JOR-003). Modal usa `success-bg` para el ícono; ErrorState `warning-bg`/`destructive`.
- **Breadcrumb actual**: `src/components/shell/TopBar/Breadcrumb/Breadcrumb.tsx` deriva de `NAV_ENTRIES` (`components/shell/nav/nav-data.ts`); función `buildCrumb` retorna `{parent?, current}`.
- **Dialog**: `components/ui/dialog/` (Radix) — foco atrapado, overlay, `Esc`. Sheet también disponible.
- **sonner**: ya en `package.json` (`^2.0.7`). No se agregan deps nuevas → sin riesgo de Docker rebuild (ver memoria jormat_front_docker).
- **Stack test**: vitest dual-project (jsdom + storybook). RULE-frontend-002: portales Radix con `defaultOpen` en jsdom, interacción en story `play()`. Stories con `next/navigation` necesitan `nextjs.appDirectory: true`.

## Constraints

- RULE-global-003: no modificar la base MSAL entregada (solo invocar).
- RULE-global-001: sin magic numbers (constantes de sesión), sin `any` (capability tipada `string`), sin `console.*`, sin código muerto.
- RULE-frontend-001/002: carpeta-por-componente + story + test co-locados; patrones jsdom/story del stack.
- No agregar dependencias npm nuevas (todo ya instalado).

## Dependencies

- **Requiere**: JOR-007 (Dialog/Sheet, PageLayout para 403/404), JOR-006 (Button/Badge).
- **Habilita**: JOR-011 (RBAC frontend real — conecta el vector), FASE B (toda vista reúsa toasts/estados/Can).

## Risks and mitigations

Ver Executive summary. Riesgo principal: matcher `can()` mal calibrado → mutation warn-first + tests de wildcard. Timer leak → cleanup verificado con fake timers.

## Backlog

| id | priority | item | razón |
|----|----------|------|-------|
| BL-01 | should → re-rutear: parcial. JOR-154 agrego tests para `useIdleTimer` (eventos de `ACTIVITY_EVENTS` + clamp) y confirmo por dkc-mutate solo 2 mutantes objetivo Killed (S1.T4), sin re-correr el mutation score completo del archivo para verificar el ≥80%; los estados `empty-state`/`loading-skeleton` no fueron tocados por ese ticket | Elevar mutation score de `useIdleTimer` (60%) y estados (`empty-state`/`loading-skeleton`) a ≥80% | Warn-first (config `mutation.mode: warn`): no bloquea cierre. Survivors residuales son wiring de timers (ArrayDeclaration de listeners, effect-deps), `className` StringLiteral en .tsx y aritmética de constantes — bajo valor / equivalentes. El matcher crítico de seguridad `can()`/`useCan` está al **100%**. Hardening adicional cuando se calibre el gate a bloqueante (T3). |

> DET-31 (warn-first): mutation S4 = 70.8% global. **Crítico (RBAC `can`/`useCan`): 100%** — objetivo del gate cumplido. Residuales documentados como `should` (no `must`), close no bloqueado por `mode: warn`.

## Open questions

Ninguna bloqueante. Resueltas en Decisions (modo super).

## Decisions (cerradas durante design — modo super)

| # | Decision | Alternativas descartadas | Racional |
|---|----------|--------------------------|----------|
| 1 | `capabilities` aditivo en `auth.store`, mock `['*']` | store nuevo dedicado | El auth.store ya dueña la identidad; agregar el vector ahí es cohesivo y aditivo |
| 2 | Matcher `can()` puro centralizado con wildcard | lógica inline en `useCan`/`<Can>` | DRY + es el blanco de mutation; testeable sin React |
| 3 | 403 inline (no redirect) vía `<Forbidden>` compartido | redirect a `/forbidden` | preserva URL pedida y el back; patrón de las maquetas |
| 4 | Breadcrumb 3er nivel por prop `action?` | inferir por segmento de URL | nav-data no modela acciones; inferir sería heurística frágil (T-010) |
| 5 | `useIdleTimer` separado del modal | todo en el componente | C1 una responsabilidad; hook testeable con fake timers |
| 6 | Constantes `SESSION_IDLE_MS`/`SESSION_WARN_MS` | magic numbers en el componente | RULE-global-001; configurable |

## Acceptance checkpoints

- [x] AC-01: `toast.success/error` muestran toasts con estilo correcto; un solo `<Toaster>` en el árbol. (REQ-01) — toaster.test 4/4 (data-type success/error, data-sonner-theme, mensajes)
- [x] AC-02: `LoadingSkeleton` 3 variantes; `EmptyState` CTA condicional; `ErrorState` dispara `onRetry`. (REQ-02) — loading-skeleton 9/9, empty-state 4/4, error-state 5/5
- [x] AC-03: Breadcrumb con `action` → 3 niveles; sin `action` → comportamiento actual (sin regresión). (REQ-03) — breadcrumb 7/7 (incl. regresión 2 niveles)
- [x] AC-04: modal de sesión aparece por inactividad, countdown corre; "Mantener" → `acquireTokenSilent`; "Cerrar"/0 → `logoutRedirect`; foco atrapado (Dialog). (REQ-04) — useIdleTimer 10/10, SessionTimeoutModal 6/6, SessionTimeoutDialog 9/9
- [x] AC-05: `can()`/`useCan` con wildcard correctos; `<Can>` muestra/oculta; `<RouteGuard>` sin cap → 403; NavGroup agrega por hijos. (REQ-05) — can 11/11, useCan 4/4, Can 4/4, RouteGuard 3/3, NavGroup/NavItem gateo 7
- [x] AC-06: `<Forbidden>` (403) y 404 renderizan en claro y oscuro con design system. (REQ-06) — Forbidden 3/3, not-found 3/3
- [x] AC-07: suite `vitest run` completa verde; stories nuevas pasan a11y. (S4) — jsdom 271/271 + storybook 119/119 = 390
- [x] AC-08: mutation warn-first ejecutada; survivors triados. (S4, DET-31) — 70.8% global; **crítico `can`/`useCan` 100%**; `useIdleTimer` +4 hardening; residuales → BL-01 `should`
- [x] AC-09: lint + prettier + tsc sin errores (incluyendo test/stories). (S4) — `typecheck`/`eslint .`/`prettier --check` limpios
