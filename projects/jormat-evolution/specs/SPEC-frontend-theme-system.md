---
id: SPEC-frontend-theme-system
project: jormat-evolution
ticket: JOR-003
status: done
---

# Sistema de tema claro/oscuro — tokens + ThemeToggle

# Sistema de tema claro/oscuro — tokens + ThemeToggle

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive abajo (Requirements, Artifacts, Tasks).*

**Que se quiere**: poner la base visual de la plataforma nueva — el set canonico de tokens de color claro/oscuro (convencion shadcn HSL), su binding a Tailwind, la tipografia Inter, y un mecanismo de tema (hook + provider + toggle sol/luna) con persistencia. Es un ticket fundacional: no dibuja pantallas de negocio, entrega el lenguaje visual que consumen el login (JOR-004), el shell (JOR-005) y los atomos de UI (JOR-006). Se hace **agregando** sobre lo existente, sin tocar ni un pixel del shell/login/dashboard ya entregados (RULE-global-003).

**Decisiones criticas que necesitan tu OK** (resueltas en autopilot super — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Adoptar la escala **green de Tailwind** (`primary = #16A34A`/green-600) en vez del `#4dc247` legacy | Define el color de marca de toda la plataforma; coincide con los mockups |
| 2 | Enfoque **aditivo**: convive con la paleta legacy, no la reemplaza | Evita romper los 4 consumidores entregados (shell/login/dashboard); respeta RULE-003 |
| 3 | Tipografia **Inter** vía `next/font/google` (variable `--font-sans`) | Identidad tipografica; idiomatico Next 14, sin CDN |
| 4 | ThemeToggle se construye y prueba pero **no se coloca** en el header real | Colocarlo es tocar el TopBar (shell) → JOR-005. Aqui queda header-ready + probado en Storybook |

**Riesgos principales y como los mitigamos**:

- **Colision de token `muted`** (legacy `#5a5f70` gris vs shadcn fill `#F3F4F6`) → se conserva el legacy + se agrega `muted-foreground` flat; la reconciliacion la hereda JOR-005 (que de todas formas retematiza el shell). Capturado como learn — no bloquea este ticket.
- **Flash de tema (FOUC)** al cargar → script inline bloqueante en `<head>` que setea `.dark` antes del primer paint, leyendo `localStorage`/`prefers-color-scheme`.
- **Contraste insuficiente del boton primario** (green-600 + texto blanco ≈ 3:1) → QA WCAG AA explicito (REQ-07); si falla para texto chico, el spec documenta el ajuste (green-700) como decision del QA.

**Que NO se hace en este ticket** (limites explicitos):

- Tocar `Sidebar`/`TopBar`/`Shell`/dashboard/`AuthGuard` (shell = JOR-005, login = JOR-004, RULE-003).
- Colocar el ThemeToggle en el header de la app corriendo (JOR-005).
- Atomos shadcn de negocio (Button/Input/Select… = JOR-006), breakpoints/layout (JOR-007).
- Reconciliar la colision `muted` (JOR-005).

**Tamano estimado**: 2 sessions ejecutables (~3-4h efectivas). La mas delicada es la S2 (mecanismo de tema + tests + QA de contraste).

**Como vas a saber que funciona**:

- Abro Storybook y veo la galeria de tokens + el ThemeToggle alternando claro/oscuro, con el chequeo a11y en verde.
- Corro `npm test` y pasan: stories del ThemeToggle como tests + tests del hook `useTheme` (persiste, lee `prefers-color-scheme`, aplica `.dark`).
- Corro `npm run build` sin errores; el shell/login/dashboard entregados se ven exactamente igual que antes (regression visual).

---

## Purpose

Define e implementa el sistema de tema de `front/jormat-front`: tokens semanticos CSS en HSL (`:root` claro + `.dark` oscuro) segun `jormat_docs/ongoing/design-tokens.md`, su binding declarativo en `tailwind.config.js` (colores/radios vía `hsl(var(--*))` + `darkMode: ['class']`), tipografia Inter, y el trio `useTheme`/`ThemeProvider`/`ThemeToggle` con persistencia. Todo aditivo sobre el scaffold de JOR-002, sin alterar componentes entregados (RULE-global-003).

## Requirements

### REQ-01: Tokens semanticos claro/oscuro (aditivo)

> **Que cambia**: `globals.css` gana el set completo de tokens shadcn en HSL — `:root` (claro) y `.dark` (oscuro) — para todos los roles de color + estados (success/warning/info) + radio. La paleta `brand`/`--color-*` legacy se conserva intacta.
> **Por que**: hoy no hay tokens de tema ni modo oscuro; el design-system necesita un set canonico que todas las pantallas consuman por rol, no por hex.

El sistema MUST definir en `src/app/globals.css`, dentro de `@layer base`, los tokens semanticos de `design-tokens.md §1` en `:root` (claro) y sus equivalentes en `.dark` (oscuro), incluyendo los tokens de estado extendidos (`--success`/`--warning`/`--info` con `-fg`/`-bg`) y `--radius`, **sin remover** los tokens `--color-*` ni las clases de componente legacy existentes.

**Actor**: system
**Layers**: frontend (css)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tokens claro presentes
- **GIVEN** `globals.css` cargado en modo claro (sin `.dark` en `<html>`)
- **WHEN** se inspecciona el valor computado de `--primary`
- **THEN** resuelve a `142 76% 36%` (green-600) y `hsl(var(--primary))` pinta verde marca

#### Scenario: tokens oscuro al activar `.dark`
- **GIVEN** `<html class="dark">`
- **WHEN** se inspecciona `--background` y `--foreground`
- **THEN** `--background` resuelve al valor oscuro y `--foreground` al claro (invertido respecto a `:root`)

#### Scenario: legacy intacto (edge — regression)
- **GIVEN** el `globals.css` modificado
- **WHEN** se busca `--color-primary` y `.btn-primary`
- **THEN** siguen existiendo con sus valores originales (no removidos)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la galeria de tokens en Storybook/preview y ve todos los roles de color en claro; al togglear, ve la version oscura.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | primary claro | modo claro | leer `--primary` | valor green-600 | `142 76% 36%` |
| 2 | background oscuro | `.dark` | leer `--background` | valor oscuro | `222 47% 11%` |
| 3 | legacy preservado | css modificado | grep `--color-primary` | sigue presente | match |

### REQ-02: Binding Tailwind + darkMode + tipografia

> **Que cambia**: `tailwind.config.js` expone los tokens como clases (`bg-primary`, `text-muted-foreground`, `rounded-lg`…) vía `hsl(var(--*))`, habilita `darkMode: ['class']`, registra `tailwindcss-animate`, y cablea Inter como `font-sans`.
> **Por que**: sin el binding, los tokens CSS existen pero no son usables como utilidades Tailwind; sin `darkMode: ['class']` la estrategia por clase no aplica.

El sistema MUST extender `tailwind.config.js` (aditivo) con `darkMode: ['class']`, los colores semanticos shadcn (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`-via-`muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`, `success`/`warning`/`info`) vía `hsl(var(--*))`, `borderRadius` `lg/md/sm` vía `var(--radius)`, el plugin `tailwindcss-animate`, y `fontFamily.sans` apuntando a `var(--font-sans)` — **conservando** las keys legacy `brand`/`surface` y la `muted` legacy (ver Decisions: colision `muted`).

**Actor**: system
**Layers**: frontend (config)

<details><summary>Scenarios de validacion</summary>

#### Scenario: utilidad de token disponible
- **GIVEN** la config extendida
- **WHEN** un componente usa `class="bg-primary text-primary-foreground"`
- **THEN** Tailwind genera las reglas y el elemento se pinta verde con texto blanco

#### Scenario: darkMode por clase
- **GIVEN** `darkMode: ['class']`
- **WHEN** `<html class="dark">` y un elemento usa `bg-background`
- **THEN** el fondo resuelve al valor oscuro

#### Scenario: build no rompe (edge — regression)
- **GIVEN** la config extendida con keys legacy conservadas
- **WHEN** `npm run build`
- **THEN** compila sin errores y el shell entregado mantiene sus clases (`bg-brand-400`, `text-muted`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npm run build` pasa; en Storybook un swatch `bg-primary` se ve verde marca y cambia en dark.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | clase de token | config extendida | render `bg-primary` | regla generada | verde green-600 |
| 2 | dark por clase | `.dark` | `bg-background` | fondo oscuro | valor `.dark` |
| 3 | build OK | keys legacy | `npm run build` | sin errores | exit 0 |

### REQ-03: Hook `useTheme` con persistencia

> **Que cambia**: nuevo hook `useTheme` que expone `theme`/`setTheme`/`resolvedTheme`, persiste la eleccion en `localStorage` y resuelve `system` contra `prefers-color-scheme`.
> **Por que**: el switch necesita una fuente de verdad de la preferencia que sobreviva recargas y respete la preferencia del SO en el primer load.

El sistema MUST proveer un hook `useTheme()` en `src/hooks/useTheme.ts` que: (a) lea/escriba la preferencia (`light`/`dark`/`system`) en `localStorage` bajo una key estable; (b) cuando la preferencia es `system`, resuelva el tema efectivo desde `window.matchMedia('(prefers-color-scheme: dark)')`; (c) aplique/quite la clase `.dark` en `document.documentElement` al cambiar; (d) exponga `theme`, `resolvedTheme` y `setTheme` tipados (sin `any`).

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: persiste eleccion
- **GIVEN** `useTheme()` montado
- **WHEN** se llama `setTheme('dark')`
- **THEN** `localStorage` guarda `dark`, `<html>` recibe `.dark`, y `resolvedTheme === 'dark'`

#### Scenario: respeta prefers-color-scheme en system
- **GIVEN** `localStorage` vacio y `matchMedia(prefers dark)` = true
- **WHEN** monta `useTheme()`
- **THEN** `resolvedTheme === 'dark'` sin que el usuario haya elegido

#### Scenario: cambia a claro
- **GIVEN** tema `dark` activo
- **WHEN** `setTheme('light')`
- **THEN** `.dark` se remueve de `<html>` y `localStorage` guarda `light`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cambia el tema, recarga la pagina, y el tema elegido persiste.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | persiste | hook montado | `setTheme('dark')` | localStorage + clase | `dark` + `.dark` en html |
| 2 | system→dark | ls vacio, mq dark | montar | resolvedTheme | `dark` |
| 3 | a claro | dark activo | `setTheme('light')` | clase removida | sin `.dark` |

### REQ-04: ThemeProvider + anti-FOUC

> **Que cambia**: un `ThemeProvider` montado en `src/app/providers.tsx` que inicializa el tema, y un script inline en `layout.tsx` que aplica `.dark` antes del primer paint.
> **Por que**: sin el script bloqueante, el usuario ve un parpadeo claro→oscuro al recargar en modo oscuro.

El sistema MUST montar un `ThemeProvider` en `providers.tsx` (sin romper los providers existentes) que inicialice/sincronice el tema vía `useTheme`, y MUST incluir en `layout.tsx` un script inline (en `<head>`, antes de hidratacion) que lea `localStorage`/`prefers-color-scheme` y aplique `.dark` a `<html>` para evitar FOUC. El cambio a `layout.tsx`/`providers.tsx` es aditivo y no altera la cadena MSAL/Providers entregada.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin flash en recarga oscura
- **GIVEN** preferencia `dark` en `localStorage`
- **WHEN** se recarga la app
- **THEN** el primer paint ya es oscuro (no hay frame claro intermedio)

#### Scenario: providers existentes intactos (edge — regression)
- **GIVEN** `providers.tsx` con `ThemeProvider` agregado
- **WHEN** la app monta
- **THEN** MSAL + React Query (Providers existentes) siguen funcionando

</details>

#### Acceptance
**El usuario puede verificar que funciona**: con tema oscuro guardado, recarga y no ve parpadeo claro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | anti-FOUC | ls=dark | reload | primer paint oscuro | sin frame claro |
| 2 | providers OK | provider agregado | montar | cadena intacta | app funciona |

### REQ-05: Componente ThemeToggle (sol/luna)

> **Que cambia**: nuevo componente `ThemeToggle` (icono sol/luna, `lucide-react`) que alterna el tema vía `useTheme`. Header-ready, accesible.
> **Por que**: es el control visible del tema; se construye aqui aunque su colocacion en el TopBar sea JOR-005.

El sistema MUST proveer `src/components/ui/ThemeToggle.tsx`: boton con icono sol (modo claro) / luna (modo oscuro) que llama `setTheme` al click, con `aria-label` descriptivo, foco visible (`ring`), y construido con el helper `cn()`. No se monta en el shell (RULE-003) — queda disponible para JOR-005.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: alterna al click
- **GIVEN** `ThemeToggle` en modo claro
- **WHEN** el usuario hace click
- **THEN** el tema pasa a oscuro y el icono cambia a luna

#### Scenario: accesible
- **GIVEN** `ThemeToggle` renderizado
- **WHEN** se inspecciona a11y
- **THEN** tiene `aria-label`, es focuseable por teclado y muestra ring de foco

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en Storybook hace click en el toggle y la UI alterna claro/oscuro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | toggle click | modo claro | click | tema oscuro | icono luna + `.dark` |
| 2 | a11y | render | axe check | sin violaciones | aria-label + foco |

### REQ-06: Stories + tests automatizados

> **Que cambia**: stories del `ThemeToggle` (claro/oscuro/system) que corren como tests (addon-vitest, browser mode) + a11y, y tests unitarios del hook `useTheme`.
> **Por que**: la prueba de que el sistema de tema funciona vive en Storybook + Vitest, no en la app corriendo (que es shell, fuera de scope).

El sistema MUST incluir `ThemeToggle.stories.tsx` con stories por estado (claro/oscuro/system) ejecutadas como tests (`@storybook/addon-vitest`) con chequeo a11y (`@storybook/addon-a11y`), y `useTheme.test.ts` (Vitest) que cubra persistencia, lectura de `prefers-color-scheme` y aplicacion de `.dark`.

**Actor**: system
**Layers**: frontend (test)

<details><summary>Scenarios de validacion</summary>

#### Scenario: stories como tests pasan
- **GIVEN** las stories del ThemeToggle
- **WHEN** `npm test` corre
- **THEN** las stories se ejecutan como tests y pasan, con a11y en verde

#### Scenario: tests del hook pasan
- **GIVEN** `useTheme.test.ts`
- **WHEN** `npm test`
- **THEN** los 3 scenarios del hook (REQ-03) pasan con asserts concretos

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `npm test` y ve las suites del ThemeToggle y `useTheme` en verde.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | stories-as-tests | stories ThemeToggle | `npm test` | pasan + a11y | verde |
| 2 | hook tests | useTheme.test.ts | `npm test` | 3 asserts | verde |

### REQ-07: QA de contraste WCAG AA

> **Que cambia**: validacion explicita de contraste (AA) de los pares de tokens criticos (texto/fondo, badges, foco) en claro y oscuro, documentada.
> **Por que**: tokens elegidos por estetica pueden fallar accesibilidad; el ticket no congela valores sin verificarlos.

El sistema MUST verificar contraste WCAG AA de los pares criticos (`foreground`/`background`, `muted-foreground`/`background`, `primary-foreground`/`primary`, estados `*-fg`/`*-bg`, `ring` sobre superficies) en ambos modos, y documentar el resultado; cualquier par bajo umbral SHOULD ajustarse (ej. usar green-700 para texto chico sobre verde) registrando la decision.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: pares de texto cumplen AA
- **GIVEN** los tokens en claro y oscuro
- **WHEN** se mide contraste `foreground`/`background` y `muted-foreground`/`background`
- **THEN** ambos ≥ 4.5:1 (texto normal)

#### Scenario: boton primario evaluado
- **GIVEN** `primary` + `primary-foreground`
- **WHEN** se mide el contraste
- **THEN** se documenta el ratio; si < 4.5 para texto chico, se registra el ajuste (green-700)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: lee la tabla de QA de contraste en el ticket con los ratios por par y modo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | texto/fondo AA | tokens claro+oscuro | medir contraste | ≥4.5 | pass AA |
| 2 | boton primario | primary/-fg | medir | ratio documentado | decision registrada |

### REQ-PRESERVE-01: No romper lo entregado (regression)

> **Que cambia**: nada para el usuario — garantia de que el shell, login, dashboard y AuthGuard entregados se ven y funcionan exactamente igual.
> **Por que**: RULE-global-003 prohibe reescribir lo entregado; el enfoque aditivo debe ser verificablemente no-destructivo.

El sistema MUST NOT alterar el render ni el comportamiento de `Sidebar.tsx`, `TopBar.tsx`, `Shell.tsx`, `dashboard/page.tsx` ni `AuthGuard.tsx`. Las clases legacy que consumen (`brand-*`, `surface`, `text-muted`, `.btn-*`) MUST seguir resolviendo a sus valores originales tras los cambios de tokens/config.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: shell sin cambios visuales
- **GIVEN** el shell entregado
- **WHEN** se aplica todo el cambio de JOR-003 y se corre `npm run build`
- **THEN** Sidebar/TopBar/dashboard se ven igual (clases legacy intactas)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: compara el shell antes/despues — identico.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | regression shell | cambios aplicados | build + revision | sin diff visual | identico |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Accessibility | Contraste de tokens de texto en ambos modos | ratio WCAG | ≥ 4.5:1 texto normal / ≥ 3:1 UI |
| UX | Sin flash de tema en carga | frames claros antes de dark cuando pref=dark | 0 |
| Security | Sin datos sensibles; solo preferencia de UI en localStorage | — | n/a |

## Artifacts

Sin meta-specs en el proyecto. Artefactos ad-hoc que crea esta feature:

### Archivos nuevos
| Archivo | Proposito |
|---------|-----------|
| `src/hooks/useTheme.ts` | Hook de tema (persistencia + prefers-color-scheme + aplica `.dark`) |
| `src/components/ui/ThemeToggle.tsx` | Componente toggle sol/luna |
| `src/components/ui/ThemeToggle.stories.tsx` | Stories como tests + a11y |
| `src/hooks/useTheme.test.ts` | Tests unitarios del hook |
| `src/app/theme-provider.tsx` | `ThemeProvider` (contexto/montaje del tema) |

### Archivos modificados (aditivo)
| Archivo | Cambio |
|---------|--------|
| `src/app/globals.css` | Agregar tokens shadcn `:root`/`.dark` + estados + `--radius` (conserva legacy) |
| `tailwind.config.js` | `darkMode: ['class']` + colores/radios vía vars + `tailwindcss-animate` + `fontFamily.sans` (conserva legacy) |
| `src/app/layout.tsx` | Inter (`next/font/google`) + script anti-FOUC + variable `--font-sans` en `<html>` |
| `src/app/providers.tsx` | Montar `ThemeProvider` (conserva MSAL/RQ) |

## Tasks

### Session 1 — Tokens + binding Tailwind + tipografia [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar tokens shadcn HSL `:root` (claro) + `.dark` (oscuro) + estados + `--radius` en `globals.css`, conservando `--color-*` y clases legacy | REQ-01 | developer | — | src/app/globals.css | build OK + inspeccion var en preview | git revert | DET-2, DET-8, DET-16, RULE-global-001, RULE-global-003 | done | 1 |
| S1.T2 | Extender `tailwind.config.js`: `darkMode: ['class']`, colores/radios vía `hsl(var(--*))`, `tailwindcss-animate`, `fontFamily.sans` → `var(--font-sans)`; conservar `brand`/`surface`/`muted` legacy + agregar `muted-foreground` flat | REQ-02 | developer | S1.T1 | tailwind.config.js | `npm run build` exit 0 | git revert | DET-8, DET-16, RULE-global-003 | done | 1 |
| S1.T3 | Cablear Inter vía `next/font/google` (variable `--font-sans`) en `layout.tsx`; sin romper la cadena de providers | REQ-02 | developer | S1.T2 | src/app/layout.tsx | build OK + fuente Inter resuelta | git revert | DET-8, RULE-global-003 | done | 1 |
| S1.T4 | QA de contraste WCAG AA de pares criticos en claro/oscuro; documentar ratios y ajustar si algun par falla | REQ-07 | reviewer | S1.T1 | (doc en ticket) | tabla de ratios ≥ umbral | (no aplica) | DET-4, DET-13, RULE-global-001 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, correr build + quality review (DET-23), commits (DET-27), decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-27 | done | 1 |

### Session 2 — Mecanismo de tema + ThemeToggle + tests [tipo: auto] [tier: T2]

parallel_groups: [[S2.T3, S2.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar hook `useTheme` (localStorage + `prefers-color-scheme` + aplica `.dark`), tipado sin `any` | REQ-03 | developer | S1.GATE | src/hooks/useTheme.ts | vitest (escrito en S2.T4) | git revert | DET-1, DET-2, DET-8, RULE-global-001 | done | 2 |
| S2.T2 | `ThemeProvider` en `theme-provider.tsx` + montaje en `providers.tsx` + script anti-FOUC en `layout.tsx` | REQ-04 | developer | S2.T1 | src/app/theme-provider.tsx, src/app/providers.tsx, src/app/layout.tsx | build OK + sin FOUC manual | git revert | DET-8, DET-16, RULE-global-003 | done | 2 |
| S2.T3 | Componente `ThemeToggle` (sol/luna, `lucide-react`, `cn()`, aria-label, foco) — NO montar en shell | REQ-05 | developer | S2.T1 | src/components/ui/ThemeToggle.tsx | render en story | git revert | DET-2, DET-8, RULE-global-001, RULE-global-003 | done | 2 |
| S2.T4 | Stories del ThemeToggle (claro/oscuro/system) como tests + a11y; tests unit del hook `useTheme` | REQ-06 | developer | S2.T1 | src/components/ui/ThemeToggle.stories.tsx, src/hooks/useTheme.test.ts | `npm test` verde + a11y | git revert | DET-7, DET-13, RULE-global-001 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — persistir, `npm test` + `npm run build` + quality review (DET-23) + mutation (DET-31), commits (DET-27), decidir continue/close | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + tests verdes | (no aplica) | DET-20, DET-23, DET-27, DET-31 | done | 2 |

### Task contract (detalle de las criticas)

```
Task S1.T1: tokens shadcn :root/.dark
- source_ref: REQ-01
- agent: developer
- files: src/app/globals.css
- precondition: globals.css scaffold presente (JOR-002)
- expected_output: bloque @layer base con tokens shadcn claro+oscuro+estados+radius; legacy intacto
- validation: npm run build OK; inspeccionar valor computado de --primary/--background en preview
- rollback: git revert del archivo
- rules: [DET-2, DET-8, DET-16, RULE-global-001, RULE-global-003]

Task S2.T1: hook useTheme
- source_ref: REQ-03
- agent: developer
- files: src/hooks/useTheme.ts
- precondition: S1.GATE cerrado (tokens + darkMode disponibles)
- expected_output: hook tipado con theme/resolvedTheme/setTheme; persiste y aplica .dark
- validation: vitest useTheme.test.ts (S2.T4) verde
- rollback: git revert
- rules: [DET-1, DET-2, DET-8, RULE-global-001]
```

## Constraints

- RULE-global-003: No modificar la base entregada — el shell (`Sidebar`/`TopBar`/`Shell`), `dashboard`, `AuthGuard` y la cadena MSAL no se tocan; todo es aditivo.
- RULE-global-001: Estandares de calidad/DoD (C1–C6) — funciones chicas, sin `any`, sin código muerto, sin `console.*`.
- DEC-005: Framework de testing — usar el stack de testing decidido (Vitest + Storybook addon-vitest + a11y), ya provisto por JOR-002.
- DET-30: trabajar en rama de ticket (`epic/jormat-v1`, no protegida).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| JOR-002 (A0 tooling) | internal | Storybook 10 + addon-vitest/a11y, Vitest, `tailwindcss-animate`, `cn()`, `components.json` shadcn | Cerrado — bajo |
| `next/font/google` (Inter) | external | Descarga la fuente en build | Build local con red; si offline, fallback system-ui |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Colision token `muted` rompe el shell si se cambia la key | medium | medium | Conservar `muted` legacy + agregar `muted-foreground` flat; reconciliacion → JOR-005 (learn capturado) |
| FOUC de tema en recarga oscura | medium | low | Script inline bloqueante en `<head>` antes de hidratacion |
| Boton primario green-600 + blanco bajo AA para texto chico | medium | medium | QA de contraste (REQ-07); documentar ajuste green-700 si falla |
| Inter no descarga (build offline) | low | low | Fallback `system-ui` en `fontFamily.sans` |

## Open questions

(Ninguna — las 4 decisiones abiertas del intake se resolvieron en el draft, ver Decisions.)

## Decisions

### DEC-LOCAL-01: Escala de marca = green de Tailwind
- **Contexto**: design-tokens.md §0 dejo abierto adoptar green Tailwind (`#16A34A`/green-600) vs mantener el `#4dc247` legacy.
- **Drivers**: coincidencia exacta con mockups; tints/shades consistentes; recomendacion del doc + ticket.
- **Opcion elegida**: adoptar green Tailwind como `--primary`.
- **Alternativas**: mantener `#4dc247` (descartada: no coincide con mockups, escala custom).
- **Consecuencias**: el `brand` legacy queda divergente del nuevo `primary`; convive hasta que JOR-005 migre el shell.
- **Session**: design (super).

### DEC-LOCAL-02: Enfoque aditivo (no reemplazar legacy)
- **Contexto**: introducir el sistema shadcn conviviendo con la paleta scaffold consumida por 4 componentes entregados.
- **Drivers**: RULE-global-003; épica "solo se agrega"; blast radius (Sidebar/TopBar/dashboard/AuthGuard).
- **Opcion elegida**: agregar tokens + binding sin remover legacy.
- **Alternativas**: reemplazo destructivo (descartado: rompe 4 consumidores ahora, viola RULE-003, mete trabajo de shell en ticket de tokens).
- **Consecuencias**: dos sistemas conviven temporalmente; JOR-004/005 migran consumidores.
- **Session**: design (super).

### DEC-LOCAL-03: Tipografia Inter vía next/font/google
- **Contexto**: design-tokens.md §7 propone Inter (fallback system-ui).
- **Drivers**: identidad; idiomatico Next 14; sin CDN externo.
- **Opcion elegida**: `next/font/google` Inter con variable `--font-sans`.
- **Alternativas**: Geist (no instalada, sin razon para divergir); system-ui puro (pierde identidad).
- **Consecuencias**: dependencia de red en build (mitigada por fallback).
- **Session**: design (super).

### DEC-LOCAL-04: Colision `muted` → conservar legacy + flat `muted-foreground`, reconciliar en JOR-005
- **Contexto**: legacy `muted:'#5a5f70'` (usado 5× en Sidebar como `text-muted`) vs shadcn `muted` fill (#F3F4F6).
- **Drivers**: cambiar la key rompe el Sidebar (RULE-003); shadcn necesita `muted`+`muted-foreground`.
- **Opcion elegida**: conservar `muted` legacy, agregar `muted-foreground` flat; dejar `bg-muted` (fill shadcn) para reconciliar en JOR-005 (que retematiza el shell). Orden del plan (A2 antes que A3) lo resuelve antes de que los atomos necesiten `bg-muted`.
- **Alternativas**: cambiar la key ahora (descartada: rompe Sidebar); migrar Sidebar aqui (descartada: shell = JOR-005).
- **Consecuencias**: `bg-muted` no es shadcn-correcto hasta JOR-005. Capturado como learn (propagacion DET-16).
- **Session**: design (super).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..07 pasan; tema alterna claro/oscuro en Storybook
- [ ] **Tests**: stories del ThemeToggle como tests + `useTheme.test.ts` verdes (asserts concretos)
- [ ] **NFRs**: contraste WCAG AA documentado en ambos modos; sin FOUC
- [ ] **Rules**: RULE-global-001/003 respetadas (aditivo, sin `any`, sin código muerto)
- [ ] **Integration**: `npm run build` OK; shell/login/dashboard entregados sin cambios (REQ-PRESERVE-01)
- [ ] **Docs**: tokens reflejan design-tokens.md; decisiones registradas

## Technical reference

- Tokens canonicos: `jormat_docs/ongoing/design-tokens.md` (§1 color, §3 radios, §7 tipografia, §11 binding).
- Patron shadcn de binding (ya en `components.json`): `cssVariables: true`, `baseColor: neutral`, css `src/app/globals.css`, config `tailwind.config.js`.
- Helper `cn()`: `src/lib/utils.ts` (clsx + tailwind-merge).
- Stack de test (JOR-002): Storybook 10 `@storybook/nextjs-vite` + `addon-vitest` (browser mode, Playwright) + `addon-a11y`; Vitest 4 + coverage-v8.
- Valores `.dark` derivados: ver `tickets/JOR-003.draft/preview.html` (`:root` + `.dark`).
