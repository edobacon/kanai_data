---
id: SPEC-frontend-shell-chrome
project: jormat-evolution
ticket: JOR-005
status: in_progress
---

# Shell / chrome transversal

# Shell / chrome transversal

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive abajo (Requirements, Tasks). Si te basta esto para decidir, ese es el objetivo.*

**Que se quiere**: reemplazar el shell heredado del scaffold de "cuenta/plataforma" por el shell de **negocio** del ERP — Sidebar acordeon con los modulos reales (taxonomia DEC-003), TopBar transversal (busqueda ⌘K, switcher de empresa, tema, menu de cuenta) y Home lanzador de modulos. Hoy el sidebar enlaza a 4 paginas que no existen (404) y no consume el sistema de diseno; el shell es la Capa A que todas las vistas de negocio de la Fase B necesitan para tener rutas, layout y navegacion.

**Decisiones criticas que necesitan tu OK** (ya confirmadas — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Taxonomia del sidebar = DEC-003 (Inventario / Pagos clientes en Finanzas / Ventas=Docs·Factura·NC) | Define las rutas que consumen todos los modulos B; cambiarla tarde = renombrar rutas/breadcrumbs/guardas |
| 2 | Rutas sin maqueta v1 → items **deshabilitados** + `not-found.tsx` (no placeholders "proximamente") — DA-1 | Sidebar mas honesto; evita rutas vacias que aparentan funcionalidad |
| 3 | Configuracion de cuenta (Usuarios, Roles) solo en el **menu de cuenta del header** — DA-2 | Separa administracion de modulos de negocio; sigue `navigation-and-menus.md §1` |
| 4 | EmpresaSwitcher escribe `localStorage['admin_active_workspace']`; NO se reescribe el interceptor | RULE-global-003 — la auth entregada no se toca |

**Riesgos principales y como los mitigamos**:

- **Romper el flujo de auth al mover AuthGuard al layout** → el AuthGuard se monta en el layout del route group `(app)` envolviendo el shell, replicando el patron por-pagina actual; smoke UI (login → shell) en S4.
- **Colision del token `muted` (gris legacy vs fill shadcn)** → los componentes nuevos consumen exclusivamente tokens HSL JOR-003 (`bg-card`, `text-muted-foreground`); no se usan los colores legacy.
- **EmpresaSwitcher sin lista multi-workspace** (auth.store no la expone) → arranca con el workspace del `user` + override manual; lista completa diferida a cuando exista el endpoint (no bloquea el shell).

**Que NO se hace en este ticket**:

- Vistas de negocio (Fase B) — solo el shell + rutas con maqueta v1.
- Gateo RBAC del nav (`<Can>`/`useCan`) — lo cabletea JOR-008; aqui solo se dejan los puntos de extension.
- Logica MSAL/auth (RULE-global-003) — intacta.
- Busqueda ⌘K con backend real — placeholder visual en v1.

**Tamano estimado**: 5 sessions (~9-13h efectivas). La mas riesgosa es S3 (TopBar — integra EmpresaSwitcher sobre el interceptor y logout MSAL); la mas larga, S2 (Sidebar acordeon con todos los estados).

**Como vas a saber que funciona**:

- Abro la app autenticado y veo el Sidebar con los modulos DEC-003; el grupo de la ruta actual aparece expandido y el item activo resaltado.
- Colapso el sidebar (`w-64→w-16`) y se mantiene colapsado al recargar; en pantalla chica abre como panel off-canvas.
- Cambio de empresa en el switcher y el siguiente request lleva el header `X-Admin-Workspace` con el nuevo valor.
- Navego a una URL inexistente y veo un 404 con el estilo nuevo (no la pantalla en blanco de Next).
- Las suites de vitest y las stories de Storybook corren verdes, sin violaciones de a11y.

---

## Purpose

Construir el shell transversal de jormat-front (Sidebar, TopBar, AppShell layout, Home lanzador) sobre los tokens HSL de JOR-003, cableando la taxonomia de navegacion de DEC-003 en el App Router de Next 14. Reemplaza el scaffold actual (Sidebar oscuro hardcoded + Dashboard mock) y cierra los 404 del nav heredado. Es prerequisito de las vistas de negocio (Fase B) y del gateo RBAC (JOR-008).

## Requirements

### REQ-01: Sidebar de negocio (acordeon)

> **Que cambia**: el menu lateral pasa de los 4 links rotos del scaffold a los modulos reales del ERP (Inicio, Ventas, Compras, Inventario, Reportes, Finanzas) con submenus expandibles; el grupo de la ruta actual se abre solo y el item activo se resalta.
> **Por que**: el sidebar actual enlaza a paginas inexistentes y no refleja el negocio; sin el shell de negocio no hay donde montar las vistas de Fase B.

El sistema MUST renderizar un Sidebar acordeon con la taxonomia de DEC-003, resaltar el item activo segun la ruta, soportar colapso `w-64 → w-16` (persistente) y abrir off-canvas en `<lg`. Los items/grupos sin vista v1 MUST renderizarse deshabilitados (no clickeables), no como rutas placeholder (DA-1).

**Actor**: user (autenticado)
**Layers**: frontend, state (ui.store)

<details><summary>Scenarios de validacion</summary>

#### Scenario: navegacion activa
- **GIVEN** el usuario esta en `/inventario`
- **WHEN** se renderiza el Sidebar
- **THEN** el grupo "Inventario" aparece expandido y el subitem "Items" resaltado (token `--primary`)

#### Scenario: item sin maqueta deshabilitado
- **GIVEN** el modulo "Reportes" no tiene vista v1
- **WHEN** se renderiza el Sidebar
- **THEN** "Reportes" aparece en estado deshabilitado (gris, no clickeable) y no navega

#### Scenario: colapso persistente
- **GIVEN** el sidebar esta expandido
- **WHEN** el usuario lo colapsa y recarga la pagina
- **THEN** el sidebar sigue colapsado (`w-16`, solo iconos + tooltip)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la app, ve los modulos del ERP, colapsa el menu y al recargar sigue colapsado; los modulos sin pantalla estan grises.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-01 | Render taxonomia | nav-data DEC-003 | render Sidebar | grupos+items presentes | 6 modulos, submenus correctos |
| TC-02 | Activo por ruta | ruta `/inventario` | render | grupo abierto + item activo | `aria-current` en "Items" |
| TC-03 | Item disabled | modulo sin v1 | click | no navega | `aria-disabled=true`, sin navegacion |

### REQ-02: TopBar transversal

> **Que cambia**: aparece una barra superior completa — busqueda ⌘K (placeholder), notificaciones con badge, ayuda, toggle de tema y breadcrumb de la ruta — reemplazando el TopBar minimo actual (bg-white hardcoded).
> **Por que**: el chrome superior es transversal a todas las vistas; hoy esta incompleto y no responde al tema.

El sistema MUST renderizar un TopBar con: trigger de busqueda ⌘K (placeholder, sin backend), boton de notificaciones con badge visual, ayuda, `ThemeToggle` (reusa el existente) y un breadcrumb `Modulo › Subseccion › Accion` derivado de la ruta. MUST consumir tokens HSL (claro/oscuro).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: breadcrumb por ruta
- **GIVEN** el usuario esta en `/inventario/nuevo`
- **WHEN** se renderiza el TopBar
- **THEN** el breadcrumb muestra `Inventario › Nuevo item`

#### Scenario: tema
- **GIVEN** el TopBar renderizado en tema claro
- **WHEN** el usuario activa el ThemeToggle
- **THEN** el shell completo cambia a oscuro consumiendo tokens `.dark` (sin colores hardcoded)

#### Scenario: busqueda placeholder
- **GIVEN** el TopBar
- **WHEN** el usuario presiona ⌘K
- **THEN** se abre el trigger de busqueda (placeholder, sin resultados de backend en v1)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ve la barra superior con busqueda, campana, ayuda y tema; el breadcrumb refleja donde esta; cambiar el tema afecta todo el shell.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-04 | Breadcrumb | ruta `/inventario/nuevo` | render TopBar | breadcrumb correcto | "Inventario › Nuevo item" |
| TC-05 | Tema | tema claro | toggle | clase `.dark` en html | tokens dark aplicados |

### REQ-03: EmpresaSwitcher (multi-tenant)

> **Que cambia**: en el area de cuenta del TopBar aparece un selector de empresa; al cambiarla, las llamadas a la API pasan a operar sobre ese workspace.
> **Por que**: el producto es multi-tenant; el override de workspace ya esta soportado por el interceptor via header, faltaba la UI.

El sistema MUST exponer un EmpresaSwitcher que, al seleccionar una empresa, escriba `localStorage['admin_active_workspace']` con su id. NO MUST modificar el interceptor de `api.ts` (RULE-global-003) — el interceptor ya lee esa key y la envia como `X-Admin-Workspace`. El switcher arranca con el workspace del `user` (auth.store).

**Actor**: user (con override de workspace)
**Layers**: frontend, state (ui.store)

<details><summary>Scenarios de validacion</summary>

#### Scenario: cambio de empresa propaga al header
- **GIVEN** el usuario en workspace A
- **WHEN** selecciona workspace B en el switcher
- **THEN** `localStorage['admin_active_workspace'] === B` y el proximo request lleva `X-Admin-Workspace: B`

#### Scenario: estado inicial
- **GIVEN** el usuario recien autenticado sin override previo
- **WHEN** se renderiza el switcher
- **THEN** muestra el workspace del `user` (auth.store) como activo

#### Scenario: interceptor intacto
- **GIVEN** el cambio de empresa
- **WHEN** se inspecciona `api.ts`
- **THEN** no hay cambios en el interceptor (solo se escribe la key de localStorage)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cambia la empresa en el header y, en las DevTools (Network), el siguiente request a `/api/proxy/*` lleva `X-Admin-Workspace` con el nuevo id.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-06 | Escribe la key | switcher montado | selecciona workspace B | localStorage actualizado | `admin_active_workspace === 'B'` |
| TC-07 | Estado inicial | user con workspace_id | render | activo = workspace del user | muestra workspace del user |

### REQ-04: Menu de cuenta (Configuracion en el header)

> **Que cambia**: el avatar del TopBar abre un menu con perfil, empresa, Usuarios, Roles y Permisos, y cierre de sesion; la administracion de cuenta vive aqui, no como modulo del sidebar.
> **Por que**: DA-2 — separar administracion de modulos de negocio, segun `navigation-and-menus.md §1`.

El sistema MUST exponer un AccountMenu (dropdown desde el avatar) con: Perfil, Empresa, Usuarios, Roles y Permisos, y Cerrar sesion. El cierre de sesion MUST invocar `logoutRedirect` via el auth.store existente (RULE-global-003). Usuarios/Roles NO MUST aparecer como grupo del sidebar (DA-2).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: logout
- **GIVEN** el menu de cuenta abierto
- **WHEN** el usuario hace clic en "Cerrar sesion"
- **THEN** se invoca `useAuthStore.logout()` → `logoutRedirect()` de MSAL

#### Scenario: config en header, no en sidebar
- **GIVEN** el shell renderizado
- **WHEN** se inspecciona el Sidebar
- **THEN** no existe grupo "Configuracion"; Usuarios/Roles solo estan en el AccountMenu

</details>

#### Acceptance
**El usuario puede verificar que funciona**: hace clic en su avatar, ve el menu con accesos a perfil/empresa/usuarios/roles y "Cerrar sesion"; el sidebar no tiene seccion de configuracion.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-08 | Logout MSAL | menu abierto | click Cerrar sesion | logout() llamado | spy en auth.store.logout |
| TC-09 | Config solo en header | shell | render | sin grupo Configuracion en sidebar | nav-data sin "Configuracion" |

### REQ-05: Home lanzador de modulos

> **Que cambia**: la pantalla de inicio pasa del Dashboard mock (stats hardcoded) al lanzador de modulos de la maqueta 01 — tiles pastel por modulo + actividad reciente.
> **Por que**: la maqueta 01 define el inicio como lanzador; el Dashboard mock no aporta y debe retirarse.

El sistema MUST renderizar un Home con tiles por modulo (maqueta 01) que naveguen a la ruta del modulo, reemplazando el Dashboard mock. Los tiles de modulos sin vista v1 MUST seguir la misma regla de deshabilitado que el Sidebar (DA-1).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: tile navega
- **GIVEN** el Home renderizado
- **WHEN** el usuario hace clic en el tile "Inventario"
- **THEN** navega a `/inventario`

#### Scenario: reemplaza el mock
- **GIVEN** la ruta de inicio
- **WHEN** se renderiza
- **THEN** se muestra el lanzador de tiles, no el Dashboard mock con stats hardcoded

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al entrar ve los tiles de modulos; hacer clic en uno con vista lo lleva a su pantalla; el dashboard mock ya no aparece.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-10 | Tile navega | Home | click tile Inventario | ruta cambia | navega a `/inventario` |
| TC-11 | Mock retirado | ruta inicio | render | sin stats hardcoded | tiles presentes, mock ausente |

### REQ-06: Cierre de los 404 del nav actual

> **Que cambia**: los 4 links rotos del scaffold (`/users /workspaces /settings /admin`) desaparecen del nav, y cualquier URL inexistente muestra un 404 con el estilo nuevo en vez de la pantalla cruda de Next.
> **Por que**: los links rotos son deuda del scaffold; un `not-found` con estilo cierra el hueco.

El sistema MUST eliminar los 4 links legacy del nav (reemplazados por la taxonomia DEC-003) y MUST proveer `not-found.tsx` con el estilo nuevo para URLs fuera del nav. Solo se crean rutas para vistas con maqueta v1 (DA-1).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: URL inexistente
- **GIVEN** el usuario navega a `/ruta-inexistente`
- **WHEN** Next no encuentra la ruta
- **THEN** renderiza `not-found.tsx` con estilo nuevo (no pantalla en blanco)

#### Scenario: links legacy eliminados
- **GIVEN** el shell nuevo
- **WHEN** se inspecciona el Sidebar
- **THEN** no existen links a `/users /workspaces /settings /admin`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: escribe una URL cualquiera inexistente y ve un 404 con la marca/estilo nuevo; los antiguos links rotos ya no estan en el menu.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-12 | not-found | URL inexistente | navegar | render not-found | componente con estilo nuevo |
| TC-13 | Sin links legacy | shell | render Sidebar | sin /users /workspaces /settings /admin | nav-data sin esos paths |

### REQ-07: Tests + Storybook stories

> **Que cambia**: el shell queda cubierto por tests de vitest y por stories de Storybook (con a11y), donde hoy no hay ninguno.
> **Por que**: WP-A2 exige tests + stories; el shell es transversal y su regresion afecta toda la app.

El sistema MUST incluir tests vitest+Testing-Library (Sidebar renderiza items/grupos y respeta disabled; tile del Home navega; EmpresaSwitcher cambia store/header) y stories de Storybook de `Sidebar`/`TopBar`/`Home` (variantes collapsed/expanded, claro/oscuro, activo) corridas con a11y.

**Actor**: developer / CI
**Layers**: frontend (test)

<details><summary>Scenarios de validacion</summary>

#### Scenario: suites verdes
- **GIVEN** los tests del shell escritos
- **WHEN** se corre `vitest run`
- **THEN** todas las suites pasan

#### Scenario: a11y sin violaciones
- **GIVEN** las stories de Sidebar/TopBar/Home
- **WHEN** corre el addon a11y
- **THEN** cero violaciones criticas

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre los tests y las stories y todo pasa; el panel a11y de Storybook no marca violaciones.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-14 | Vitest verde | tests escritos | vitest run | suites pass | 0 fails |
| TC-15 | a11y | stories | addon-a11y | sin violaciones | 0 criticas |

## Artifacts

Sin meta-specs en el proyecto. La feature es solo-frontend (componentes + rutas), sin endpoints ni modelos nuevos. Inventario de componentes en `tickets/JOR-005.draft/intent.md`.

## Tasks

> Numeracion: el ticket no tiene `### Session N` previas → el plan arranca en **S1**.

### Session 1 — Fundaciones (tipos, nav-data, shadcn, ui.store, route group) [tipo: auto] [tier: T2]

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Tipos `NavItem`/`NavGroup` + `nav-data.ts` con taxonomia DEC-003 (modulos, submenus, paths, flag `hasView`) | REQ-01 | developer | — | `src/shell/nav/types.ts`, `src/shell/nav/nav-data.ts` | tsc + import desde test | git revert | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Instalar primitivas shadcn: Button, DropdownMenu, Avatar, Tooltip, Separator, Sheet, Badge (consumen tokens JOR-003) | REQ-02 | developer | — | `src/components/ui/*.tsx` | tsc + build | git revert | DET-1, DET-8, RULE-global-001 | done | 1 |
| S1.T3 | Extender `ui.store`: `sidebarCollapsed` persistente (localStorage) + `activeWorkspace` (get/set) | REQ-01, REQ-03 | developer | — | `src/stores/ui.store.ts` | vitest store | git revert | DET-5, DET-8, DET-10, DET-11 | done | 1 |
| S1.T4 | Route group `(app)` con `layout.tsx` que monta `AuthGuard` + slot del AppShell (sin reescribir auth) | REQ-06 | developer | S1.T1, S1.T2, S1.T3 | `src/app/(app)/layout.tsx` | build + smoke render | git revert | DET-5, DET-8, RULE-global-003 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr tsc+build+vitest store, quality review, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Sidebar de negocio [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Componentes `NavItem` + `NavGroup` (estado activo, disabled, tooltip en colapsado, punto de extension `useCan`) | REQ-01 | developer | S1.GATE | `src/shell/Sidebar/NavItem.tsx`, `src/shell/Sidebar/NavGroup.tsx` | vitest + tsc | git revert | DET-1, DET-2, DET-8, DET-16 | done | 2 |
| S2.T2 | `Sidebar` acordeon: grupo activo por ruta, colapso `w-64→w-16` (ui.store), off-canvas `<lg` (Sheet), items disabled sin vista (DA-1), tokens HSL | REQ-01 | developer | S2.T1 | `src/shell/Sidebar/Sidebar.tsx` | vitest (TC-01/02/03) | git revert | DET-5, DET-8, DET-10, RULE-global-001 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, vitest --coverage Sidebar, quality review, decidir | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — TopBar transversal (chrome + EmpresaSwitcher + AccountMenu + Breadcrumb) [tipo: auto] [tier: T3]

parallel_groups: [[S3.T1, S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `TopBar` chrome: busqueda ⌘K (placeholder), notificaciones (badge), ayuda, ThemeToggle (reusa), `Breadcrumb` por ruta | REQ-02 | developer | S1.GATE | `src/shell/TopBar/TopBar.tsx`, `src/shell/TopBar/Breadcrumb.tsx` | vitest (TC-04/05) | git revert | DET-1, DET-8, DET-16, RULE-global-001 | done | 3 |
| S3.T2 | `EmpresaSwitcher`: escribe `localStorage['admin_active_workspace']` (ui.store), arranca con workspace del user; NO toca `api.ts` | REQ-03 | developer | S1.GATE | `src/shell/TopBar/EmpresaSwitcher.tsx` | vitest (TC-06/07) | git revert | DET-5, DET-8, DET-10, RULE-global-003 | done | 3 |
| S3.T3 | `AccountMenu`: dropdown perfil/empresa/Usuarios/Roles + logout via `auth.store` (`logoutRedirect`); config en header (DA-2) | REQ-04 | developer | S1.GATE | `src/shell/TopBar/AccountMenu.tsx` | vitest (TC-08/09) | git revert | DET-5, DET-8, RULE-global-003 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir, vitest --coverage + smoke UI (login→shell, switch empresa, logout), quality review, decidir | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + smoke UI | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Home lanzador + cierre de 404 [tipo: auto] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | `Home` lanzador (maqueta 01): tiles por modulo (`ModuleTile`), navegan a la ruta, disabled sin vista (DA-1); reemplaza Dashboard mock | REQ-05 | developer | S2.GATE | `src/app/(app)/page.tsx`, `src/shell/Home/ModuleTile.tsx` | vitest (TC-10/11) | git revert | DET-5, DET-8, DET-16 | done | 4 |
| S4.T2 | `not-found.tsx` con estilo nuevo + eliminar links legacy + componer `AppShell` final (Sidebar+TopBar+main); retirar `dashboard/page.tsx` mock | REQ-06 | developer | S2.GATE, S3.GATE | `src/app/not-found.tsx`, `src/shell/AppShell.tsx` | vitest (TC-12/13) + smoke 404 | git revert | DET-5, DET-8, DET-10, DET-16 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir, build + smoke (Home, 404, nav completa), quality review, decidir | — | reviewer | S4.T1, S4.T2 | ticket | gate persistido + smoke UI | (no aplica) | DET-20, DET-23 | done | 4 |

### Session 5 — Tests + Storybook stories + a11y [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S5.T1, S5.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Tests vitest+TL del shell: Sidebar (items/grupos/disabled/activo), Home tile navega, EmpresaSwitcher cambia store/header, AccountMenu logout | REQ-07 | developer | S4.GATE | `src/shell/**/*.test.tsx` | vitest run (TC-01..13) | git revert | DET-4, DET-7, DET-13 | done | 5 |
| S5.T2 | Storybook stories de Sidebar/TopBar/Home (collapsed/expanded, claro/oscuro, activo) + a11y addon | REQ-07 | developer | S4.GATE | `src/shell/**/*.stories.tsx` | storybook test + a11y (TC-14/15) | git revert | DET-4, DET-7, DET-13 | done | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3, ⚑ fuerte)** — persistir, suite completa + a11y, quality review reforzado (DET-23), mutation async sobre el diff (DET-31, warn), decidir cierre | — | reviewer | S5.T1, S5.T2 | ticket | gate persistido + suites verdes + a11y + mutation | (no aplica) | DET-20, DET-23, DET-31 | done | 5 |

### Task contract (referencia ampliada de tasks no triviales)

```
Task S1.T3: extender ui.store
- source_ref: REQ-01, REQ-03
- agent: developer
- files: src/stores/ui.store.ts (+ test)
- precondition: ui.store actual solo expone sidebarCollapsed + toggleSidebar
- expected_output: sidebarCollapsed persiste en localStorage; activeWorkspace (get/set) disponible para EmpresaSwitcher
- validation: vitest del store (persistencia + set/get workspace)
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S3.T2: EmpresaSwitcher
- source_ref: REQ-03
- agent: developer
- files: src/shell/TopBar/EmpresaSwitcher.tsx (+ test)
- precondition: ui.store con activeWorkspace (S1.T3); interceptor de api.ts lee localStorage['admin_active_workspace'] (intacto)
- expected_output: seleccionar empresa escribe la key; proximo request lleva X-Admin-Workspace; sin cambios a api.ts
- validation: vitest TC-06/07 (localStorage + estado inicial)
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, RULE-global-003]
```

## Constraints

- **RULE-global-003**: la auth entregada (AuthGuard, MsalProviderWrapper, api.ts) NO se toca — el EmpresaSwitcher se apoya en el header `X-Admin-Workspace` existente y el logout usa el `auth.store`.
- **RULE-global-001**: DoD C1–C6 (responsabilidad unica por componente, sin `any`, sin codigo muerto ni `console.*`).
- **DEC-003**: taxonomia del sidebar (Inventario / Pagos clientes en Finanzas / Ventas=Docs·Factura·NC) — el router la refleja exactamente.
- **DET-30**: ejecutar en rama de ticket (`JOR-005-shell-chrome`), no en protegida.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-frontend-theme-system (JOR-003) | internal | Tokens HSL claro/oscuro que el shell consume | Bajo — ya en `globals.css` |
| shadcn/ui primitives | internal | Componentes base (configurado, sin instalar) | Bajo — `components.json` listo |
| JOR-008 (RBAC frontend) | internal | Cabletea `<Can>`/`useCan` sobre el nav | No bloquea — shell deja puntos de extension |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Mover AuthGuard al layout rompe el flujo de login | medium | alto | Replicar patron por-pagina envolviendo el shell; smoke UI login→shell en S3/S4 |
| Colision token `muted` (legacy vs shadcn) | medium | medio | Componentes nuevos consumen solo tokens HSL JOR-003; no usar colores legacy |
| EmpresaSwitcher sin lista multi-workspace | medium | bajo | Arranca con workspace del user + override manual; lista diferida (no bloquea) |
| Tocar `api.ts` por error (viola RULE-global-003) | low | alto | El switcher solo escribe localStorage; review verifica `api.ts` sin diff |

## Open questions

- [ ] Lista multi-workspace para el EmpresaSwitcher — `auth.store` no la expone hoy; se resuelve empiricamente en S3 (arranca con el workspace del user). No bloquea.

## Decisions

### DEC-LOCAL-01: Rutas sin maqueta = items deshabilitados (no placeholders)
- **Contexto**: el prototipo usaba `placeholder()` para rutas sin vista; el ticket debe cerrar 404.
- **Drivers**: sidebar honesto; evitar rutas vacias que aparenten funcionalidad.
- **Opcion elegida**: items/grupos sin vista v1 se renderizan deshabilitados; solo se crean rutas con maqueta; `not-found.tsx` para el resto (DA-1).
- **Alternativas**: rutas placeholder "proximamente" (descartado — aparenta funcionalidad inexistente).
- **Consecuencias**: sidebar con items grises; menos rutas que mantener; cierre real de 404.
- **Session**: design (2026-06-14).

### DEC-LOCAL-02: Configuracion de cuenta solo en el header
- **Contexto**: el prototipo mostraba "Configuracion" en sidebar Y en el menu de cuenta.
- **Drivers**: separar administracion de modulos de negocio (`navigation-and-menus.md §1`).
- **Opcion elegida**: Usuarios/Roles solo en el AccountMenu del TopBar (DA-2).
- **Alternativas**: duplicar en sidebar (descartado — mezcla administracion con negocio).
- **Consecuencias**: sidebar sin grupo "Configuracion"; acceso unico desde el header.
- **Session**: design (2026-06-14).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..07 pasan
- [ ] **Tests**: TC-01..15 escritos y pasando (vitest + stories)
- [ ] **NFRs**: n/a (feature solo-UI sin targets de performance)
- [ ] **Rules**: RULE-global-003 (auth intacta), RULE-global-001 (DoD), DEC-003 (taxonomia) respetados
- [ ] **Integration**: login→shell funciona; no rompe auth ni proxy
- [ ] **Docs**: `navigation-and-menus.md` y DEC-003 ya reflejan la taxonomia; actualizar si emerge delta

## Archiving

Cuando el shell sea reemplazado o la spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-frontend-shell-chrome "razon"`.
