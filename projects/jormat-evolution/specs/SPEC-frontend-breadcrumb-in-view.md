---
id: SPEC-frontend-breadcrumb-in-view
project: jormat-evolution
ticket: JOR-037
status: done
---

# Fix: breadcrumb dentro de la vista (esquina sup. izq.) + "Inicio" como primer item

# Fix: breadcrumb dentro de la vista (esquina sup. izq.) + "Inicio" como primer item

## Executive summary — lo que estas aprobando

**Que se quiere**: el breadcrumb hoy vive en el `TopBar` (chrome global) y arranca en la sección actual (ej. `Inventario › Nuevo item`). Se mueve **dentro de la vista**, a la esquina superior izquierda del área de contenido, y se le antepone siempre **`Inicio`** (enlace a `/`), quedando `Inicio › Inventario › Nuevo item`. Sin tocar la taxonomía (DEC-003) ni el resto del TopBar.

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Render centralizado en `AppShell.<main>` (encima de `{children}`), no per-page | Un solo punto de render → uniforme en todas las vistas, mínimo blast radius. Ninguna página renderiza `<Breadcrumb>` hoy, así que no hay doble render |
| 2 | Reestructurar segmentos a `{ label, href? }` y prefijar `Inicio` (link a `/`) salvo en `/` | "Inicio como primer item" + clickeable; evita `Inicio › Inicio` en la home |
| 3 | Quitar el `<Breadcrumb/>` del `TopBar` (y su wrapper `hidden sm:block`) | Es el pedido literal; el breadcrumb deja de ser chrome global |
| 4 | Actualizar `Breadcrumb.test.tsx` + `.stories.tsx` + `TopBar.test.tsx` | DET-7 / RULE-frontend-002: los tests codifican el comportamiento actual (sin `Inicio` prefijo, breadcrumb en TopBar) y deben reflejar el nuevo |

**Riesgos principales y como los mitigamos**:

- **Regresión `Inicio › Inicio` en `/`** → en la home el segmento actual ya ES `Inicio`; no se prefija otro. Test explícito (TC-4).
- **El test actual `/inventario/nuevo → "Inventario › Nuevo item"` rompe** → es la regresión esperada (ahora `Inicio › Inventario › Nuevo item`); se reescribe en la misma task (DET-7).
- **Pérdida de la prop `action` per-page** → al centralizar, las páginas builder no inyectan `action`. Hoy NINGUNA lo usa (rutas builder están en `NAV_ENTRIES`); se preserva la prop en el componente para uso futuro y se anota como follow-up.

**Que NO se hace**:

- No se cambia `nav-data.ts` ni la taxonomía DEC-003.
- No se altera el resto del TopBar (búsqueda, notificaciones, theme, switcher, cuenta).
- No se introduce un `PageLayout`/`PageHeader` per-page (H2 descartada).

**Tamano estimado**: 1 session (~1h efectiva), tier T2.

**Como vas a saber que funciona**:

- En cualquier vista interna el breadcrumb aparece arriba a la izquierda del contenido (no en el header) y empieza en `Inicio`, que enlaza a la home.
- En `/` muestra solo `Inicio` (sin separador, sin duplicar).
- El TopBar ya no muestra breadcrumb; el resto del header intacto.

---

## Purpose

Reubicar el componente `Breadcrumb` (`front/jormat-front/src/components/shell/TopBar/Breadcrumb/Breadcrumb.tsx`) desde el `TopBar` (`TopBar.tsx:38-40`) al wrapper `<main>` del `AppShell` (`AppShell.tsx:63`), y reestructurar su render para anteponer siempre `Inicio` como primer item enlazado a `/`. Cambio acotado al módulo shell, capa frontend.

## Requirements

### REQ-FIX-01: el breadcrumb se renderiza dentro de la vista, no en el TopBar

> **Que cambia**: el breadcrumb deja de estar en el header global y pasa a la esquina superior izquierda del área de contenido de cada vista.
> **Por que**: pedido del dev — el breadcrumb pertenece a la vista, no al chrome.

El sistema MUST renderizar el `Breadcrumb` dentro del contenedor de contenido (`AppShell.<main>`), por encima de `{children}`, alineado a la izquierda y con separación inferior respecto al contenido.

El sistema MUST eliminar el `Breadcrumb` (y su wrapper `hidden sm:block`) del `TopBar`, preservando el resto del header sin cambios.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: breadcrumb en la vista
- **GIVEN** una ruta interna (ej. `/inventario/nuevo`)
- **WHEN** se renderiza la app
- **THEN** el breadcrumb aparece arriba del contenido de la vista, no en el `TopBar`

#### Scenario: TopBar sin breadcrumb
- **GIVEN** cualquier ruta
- **WHEN** se renderiza el `TopBar`
- **THEN** no contiene `<Breadcrumb>`; búsqueda/notificaciones/theme/switcher/cuenta intactos

</details>

#### Acceptance
**El usuario puede verificar que funciona**: entra a una vista y ve el breadcrumb arriba a la izquierda del contenido; el header ya no lo muestra.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Breadcrumb en main | ruta interna | render AppShell | breadcrumb está en `<main>` | smoke visual + render |
| 2 | TopBar limpio | cualquier ruta | render TopBar | sin breadcrumb | `TopBar.test.tsx` afirma ausencia |

### REQ-FIX-02: "Inicio" es siempre el primer item (enlace a `/`)

> **Que cambia**: el breadcrumb arranca en `Inicio` en toda ruta interna (ej. `Inicio › Inventario › Nuevo item`), y `Inicio` es clickeable hacia la home.
> **Por que**: pedido del dev — "el inicio como primer item".

El sistema MUST anteponer un segmento `Inicio` (enlace a `/`, vía `next/link`) como primer item del breadcrumb en toda ruta distinta de `/`.

El sistema MUST, en la ruta `/`, mostrar únicamente `Inicio` como segmento actual (sin enlace, sin separador, sin duplicar).

El sistema MUST mantener el último segmento como "actual" (`font-medium text-foreground`, sin enlace) y conservar la prop `action` (3er nivel) a nivel componente.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: prefijo Inicio en ruta interna
- **GIVEN** la ruta `/inventario/nuevo`
- **WHEN** se renderiza el breadcrumb
- **THEN** los segmentos son `Inicio › Inventario › Nuevo item`; `Inicio` enlaza a `/`; `Nuevo item` es el actual

#### Scenario: home sin duplicar
- **GIVEN** la ruta `/`
- **WHEN** se renderiza el breadcrumb
- **THEN** un solo segmento `Inicio` (actual), sin separador ni enlace

#### Scenario: action preservada
- **GIVEN** `/ventas/documentos` con `action="Crear factura"`
- **WHEN** se renderiza el breadcrumb
- **THEN** segmentos `Inicio › Ventas › Documentos › Crear factura`; `Crear factura` es el actual

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en una vista interna el breadcrumb empieza en `Inicio`, que al hacer click lleva a la home; en la home solo se ve `Inicio`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Prefijo Inicio | `/inventario/nuevo` | render | `Inicio › Inventario › Nuevo item`, Inicio=link `/` | `getByRole('link', {name:'Inicio'})` + 2 `›` |
| 2 | Home única | `/` | render | solo `Inicio`, sin `›`, sin link | `queryByText('›')` ausente |
| 3 | Action | `/ventas/documentos` + action | render | 4 segmentos, action actual | 3 `›`, `Crear factura` font-medium |

### REQ-REGRESSION-01: el resto del shell y la derivación de labels se preservan

> **Que cambia**: nada fuera del breadcrumb y su ubicación — TopBar (sin el breadcrumb), Sidebar, taxonomía y derivación de labels siguen igual.
> **Por que**: el fix es acotado; no debe alterar nada más (DET-7).

El sistema MUST mantener: (a) la derivación `parent/current` desde `NAV_ENTRIES` (DEC-003 intacto), (b) el resto del `TopBar` y el `AppShell` (sidebar, sheet mobile, layout), (c) el retorno `null` del breadcrumb en rutas no mapeadas.

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: la navegación y el header se ven y funcionan como antes salvo por la nueva ubicación del breadcrumb.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Suite verde | repo | `vitest run --project '!storybook'` | sin nuevas fallas | suite jsdom verde |
| 2 | Build/types | repo | `tsc --noEmit` | sin errores | exit 0 |

## Tasks

### Session 1 — Reubicar breadcrumb a la vista + prefijo Inicio + tests/story + regression [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Reestructurar `Breadcrumb.tsx`: segmentos `{ label, href? }`; prefijar `Inicio` (href `/`, `next/link`) en toda ruta ≠ `/`; en `/` mostrar solo `Inicio` (actual); último segmento = actual (`font-medium`); preservar prop `action` | REQ-FIX-02 | developer | — | `front/jormat-front/src/components/shell/TopBar/Breadcrumb/Breadcrumb.tsx` | tsc + render unit | git revert | DET-16, RULE-frontend-001 | done | 1 |
| S1.T2 | Quitar `<Breadcrumb/>` (+ wrapper `hidden sm:block`) de `TopBar.tsx` y renderizarlo en `AppShell.<main>` encima de `{children}` (con separación inferior). Limpiar import en TopBar, agregar en AppShell | REQ-FIX-01 | developer | S1.T1 | `front/jormat-front/src/components/shell/TopBar/TopBar.tsx`, `front/jormat-front/src/components/shell/AppShell/AppShell.tsx` | tsc + smoke visual | git revert | DET-16, RULE-frontend-001 | done | 1 |
| S1.T3 | Actualizar tests/story: `Breadcrumb.test.tsx` (prefijo `Inicio` + link, home única, action) y `Breadcrumb.stories.tsx`; `TopBar.test.tsx` (afirmar ausencia del breadcrumb). Considerar `AppShell` si tiene test | REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01 | developer | S1.T2 | `front/jormat-front/src/components/shell/TopBar/Breadcrumb/Breadcrumb.test.tsx`, `front/jormat-front/src/components/shell/TopBar/Breadcrumb/Breadcrumb.stories.tsx`, `front/jormat-front/src/components/shell/TopBar/TopBar.test.tsx` | `vitest run --project '!storybook'` (shell) | git revert | DET-7, RULE-frontend-002 | done | 1 |
| S1.T4 | Regression: suite unit jsdom completa del front + typecheck + smoke visual (screenshot breadcrumb en vista + home) | REQ-REGRESSION-01 | reviewer | S1.T3 | — | `vitest run --project '!storybook'` + `tsc --noEmit` + smoke | (no aplica) | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr validación T2, quality review (DET-23), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | done | 1 |

### Task contract

```
Task S1.T1: Reestructurar Breadcrumb (prefijo Inicio + segmentos con href)
- source_ref: REQ-FIX-02
- agent: developer
- files: Breadcrumb.tsx
- precondition: buildCrumb devuelve {parent?, current} (verificado)
- expected_output: segmentos {label, href?}; Inicio prefijado (link /) salvo en /; ultimo = actual; prop action preservada; sin Inicio › Inicio en /
- validation: tsc sin errores + render unit
- rollback: git revert
- rules: [DET-16, RULE-frontend-001]

Task S1.T2: Mover render TopBar -> AppShell.main
- source_ref: REQ-FIX-01
- agent: developer
- files: TopBar.tsx, AppShell.tsx
- precondition: S1.T1 done
- expected_output: TopBar sin <Breadcrumb> ni wrapper; AppShell renderiza <Breadcrumb/> encima de {children} con separacion; imports limpios
- validation: tsc + smoke visual
- rollback: git revert
- rules: [DET-16, RULE-frontend-001]

Task S1.T3: Actualizar tests + story
- source_ref: REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01
- agent: developer
- files: Breadcrumb.test.tsx, Breadcrumb.stories.tsx, TopBar.test.tsx
- precondition: S1.T2 done
- expected_output: tests afirman prefijo Inicio (link), home unica, action; TopBar afirma ausencia del breadcrumb; story actualizada
- validation: vitest run --project '!storybook' verde (shell)
- rollback: git revert
- rules: [DET-7, RULE-frontend-002]

Task S1.T4: Regression + smoke
- source_ref: REQ-REGRESSION-01
- agent: reviewer
- precondition: S1.T3 done
- expected_output: suite unit del front sin nuevas fallas + tsc verde + smoke (breadcrumb en vista y en home)
- validation: vitest run --project '!storybook' + tsc --noEmit + screenshot
- rollback: (no aplica)
- rules: [DET-7, DET-13]
```

## Constraints

- RULE-frontend-001: organización de archivos — el cambio queda dentro de `TopBar/Breadcrumb/`, `TopBar/`, `AppShell/`; sin nuevos archivos de componente.
- RULE-frontend-002: al cambiar comportamiento de `Breadcrumb`/`TopBar`, actualizar sus `.test.tsx` y `.stories.tsx`.
- RULE-global-001 / RULE-global-004: DoD de calidad + stack dev con consola limpia.
- DEC-003 (nav-data): la taxonomía de navegación es fuente de verdad y NO se modifica.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `Inicio › Inicio` en la home | medium | bajo | En `/` el current ya es `Inicio`; no se prefija. TC-4 explícito |
| Tests actuales codifican el comportamiento previo y rompen | high (esperado) | bajo | Reescribir en S1.T3 (DET-7) |
| Pérdida de `action` per-page al centralizar | low | bajo | Hoy no se usa en páginas; se preserva la prop; follow-up documentado |
| Breadcrumb visible en móvil ocupa espacio (antes `hidden sm:block`) | low | bajo | En `<main>` hay espacio; se muestra siempre (mejor contexto). Reevaluable |

## Open questions

{Ninguna — alcance acotado, decisión H1 tomada (super autopilot: decidir+documentar).}

## Decisions

### DEC-LOCAL-01: render centralizado en AppShell.<main> (H1), no per-page (H2)
- **Contexto**: dónde ubicar el breadcrumb "dentro de la vista"
- **Drivers**: pedido uniforme en todas las vistas; mínimo blast radius; mantenibilidad
- **Opcion elegida**: render único en `AppShell.<main>` encima de `{children}`
- **Alternativas**: per-page / `PageLayout` (H2) — descartado: multiplica superficie sin valor; ninguna página renderiza hoy el breadcrumb
- **Consecuencias**: la prop `action` deja de inyectarse desde páginas (capacidad latente preservada en el componente); breadcrumb uniforme en toda la app
- **Session**: design-fix

### DEC-LOCAL-02: segmentos con href + prefijo Inicio enlazado
- **Contexto**: cómo agregar `Inicio` como primer item clickeable
- **Drivers**: pedido del dev ("Inicio como primer item"), evitar duplicado en `/`
- **Opcion elegida**: segmentos `{ label, href? }`; `Inicio` (href `/`, `next/link`) prefijado salvo en `/`
- **Alternativas**: prefijar siempre (rompería en home con `Inicio › Inicio`) — descartado
- **Consecuencias**: render del breadcrumb pasa de `string[]` a objetos; `Inicio` navegable
- **Session**: design-fix

## Acceptance checkpoints

- [x] **Funcional**: REQ-FIX-01 (breadcrumb fuera del TopBar → en `AppShell.<main>` como `main.firstChild`) + REQ-FIX-02 (Inicio prefijo+link, home única sin `Inicio › Inicio`, action preservada) verificados por unit + reviewer aislado (approve)
- [x] **Tests**: `Breadcrumb.test.tsx` (Inicio+link/home/action/intermedio), `TopBar.test.tsx` (ausencia), `AppShell.test.tsx` (breadcrumb dentro de main + firstChild), story actualizada — shell 13/13
- [x] **Rules**: RULE-frontend-001/002 respetadas; DEC-003 (`nav-data`) intacto
- [x] **Integration**: suite jsdom del front 693/693 (105 files) sin nuevas fallas; `tsc --noEmit` 0
- [ ] **Docs**: actualizar `jormat_docs/frontend/shell.md` (describe el breadcrumb en el TopBar) → backlog B1
- [ ] **Smoke UI live**: screenshot autenticado de la nueva ubicación pendiente — requiere login CIAM del dev (jormat behind-auth) → ver Sessions
