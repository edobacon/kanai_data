---
id: SPEC-frontend-collapsed-sidebar-flyout
project: jormat-evolution
ticket: JOR-029
status: done
---

# Fix: sidebar colapsado expone los grupos vía flyout navegable

# Fix: sidebar colapsado expone los grupos vía flyout navegable

## Executive summary — lo que estas aprobando

**Que se quiere**: cuando el sidebar se colapsa (modo `w-16`, solo iconos), los grupos de navegación (Ventas, Compras, Inventario, Finanzas) dejan de ser alcanzables — el icono es un `<span>` muerto y sus sub-ítems desaparecen. Este fix convierte ese icono en un disparador real que abre un flyout a la derecha con los sub-ítems navegables, reutilizando el primitivo `dropdown-menu` (Radix, ya instalado). Restaura el 100% de la navegación en modo colapsado sin tocar la taxonomía ni el comportamiento expandido.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Reusar `dropdown-menu` (Radix DropdownMenu) en vez de un primitivo popover nuevo | Cero deps nuevas, a11y (foco/teclado/ARIA) gratis, cambio contenido en 1 archivo |
| 2 | Disparador por **click** (no hover) | Robusto en touch + teclado; el hover es frágil en mobile y compite con el `title` del icono |
| 3 | Mantener `title` para el hint del estado cerrado, sin anidar Radix Tooltip dentro del trigger | Evita conflicto de dos primitivas Radix por el mismo control; el `DropdownMenuLabel` ya muestra el nombre al abrir |
| 4 | Actualizar el test/story que codifican el comportamiento roto | El test #3 actual afirma "sin botón ni submenú colapsado" — es exactamente lo que el fix corrige (DET-7) |

**Riesgos principales y como los mitigamos**:

- **El test #3 actual rompe al cambiar el render colapsado** → es la regresión esperada; se reescribe para afirmar el comportamiento correcto (trigger interactivo) en la misma task.
- **jsdom no togglea Radix (portales/pointer)** → el unit test afirma el contrato estable (trigger es `button` con nombre accesible + gateo preservado), NO el toggle; la apertura del flyout + navegación se valida en la story play (browser) y en smoke manual.
- **Doble gateo de capability** → el flyout reusa `visibleItems` (ya filtrado por `can()`); no se reintroduce `<Can>`, evitando lógica duplicada.

**Que NO se hace en este ticket**:

- No se cambia `nav-data.ts` ni la taxonomía DEC-003.
- No se toca el comportamiento expandido (acordeón) ni el render de hojas colapsadas (ya funcionan).
- No se migra a otro patrón de colapso (rail-expand / overlay) — descartado en triage.

**Tamano estimado**: 1 session (~1-1.5h efectivas), tier T2. La parte más delicada es ajustar test/story sin falsos verdes.

**Como vas a saber que funciona**:

- Colapso el sidebar, hago click en el icono de Ventas → aparece un panel a la derecha con sus sub-ítems; click en uno navega a la ruta.
- Un ítem sin capability no aparece en el flyout; un ítem `hasView: false` aparece deshabilitado.
- El sidebar expandido y las hojas colapsadas siguen idénticos.

---

## Purpose

Corregir el render del branch `collapsed` de `NavGroup` (`front/jormat-front/src/components/shell/Sidebar/NavGroup/NavGroup.tsx:52-70`), que hoy emite un `<span>` no interactivo y omite `visibleItems`, dejando 4/6 entradas top-level inalcanzables al colapsar. La corrección expone los sub-ítems mediante un flyout (DropdownMenu) anclado al icono, preservando gateo por capability, estado `hasView`, y el resaltado de ruta activa.

## Requirements

### REQ-FIX-01: el grupo colapsado abre un flyout navegable

> **Que cambia**: al colapsar el sidebar, el icono de un grupo deja de ser inerte — al activarlo (click o teclado) abre un panel a la derecha con los sub-ítems del grupo, y cada ítem navegable lleva a su ruta.
> **Por que**: hoy el icono colapsado es un `<span>` sin handler y el submenú no se renderiza, dejando Ventas/Compras/Inventario/Finanzas inaccesibles sin re-expandir.

El sistema MUST renderizar, en modo colapsado, el icono del grupo como un control interactivo (trigger de `DropdownMenu`) que al activarse despliega los sub-ítems visibles del grupo como ítems navegables (`next/link`).

El sistema MUST preservar en el flyout el gateo por capability (sólo `visibleItems`, ya filtrado por `can()`), el estado `hasView` (ítem sin vista → deshabilitado), y el resaltado de la ruta activa.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: navegar desde el flyout
- **GIVEN** el sidebar colapsado y un grupo con ≥1 sub-ítem accesible
- **WHEN** el usuario activa el icono del grupo y selecciona un sub-ítem con `hasView: true`
- **THEN** se navega a `item.path`

#### Scenario: trigger accesible por teclado
- **GIVEN** el sidebar colapsado
- **WHEN** el usuario enfoca el icono del grupo con Tab y presiona Enter/Espacio
- **THEN** el flyout se abre (el trigger es un `button`, no un `<span>`)

#### Scenario: ítem sin vista
- **GIVEN** un grupo con un sub-ítem `hasView: false`
- **WHEN** se abre el flyout
- **THEN** ese ítem aparece deshabilitado (no navegable)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: colapsa el sidebar, hace click en el icono de Ventas y llega a "Documentos" desde el panel que se despliega.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Trigger interactivo | sidebar colapsado | render NavGroup collapsed | el icono es un `button` con nombre accesible = label del grupo | `getByRole('button', { name: label })` presente |
| 2 | Flyout navega | colapsado, flyout abierto | click en sub-ítem `hasView` | navega a `item.path` | story play (browser): ítems visibles como links |

### REQ-REGRESSION-01: el comportamiento existente se preserva

> **Que cambia**: nada visible — el modo expandido (acordeón), las hojas colapsadas y el gateo por capability siguen igual.
> **Por que**: el fix toca sólo el branch colapsado de grupos; el resto no debe alterarse (DET-7).

El sistema MUST mantener: (a) el acordeón expandido (toggle por click, auto-abre en ruta activa), (b) la navegación de hojas colapsadas (Inicio, Reportes), (c) la agregación de gateo (grupo sin hijos accesibles → no se renderiza, en ambos modos).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: expandido intacto
- **GIVEN** el sidebar expandido con ruta activa en un hijo del grupo
- **WHEN** se renderiza
- **THEN** el grupo arranca abierto (`aria-expanded=true`) y muestra sus ítems

#### Scenario: agregación de gateo (colapsado)
- **GIVEN** un grupo sin ninguna capability de hijo
- **WHEN** se renderiza colapsado
- **THEN** el grupo no se renderiza (sin trigger)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en modo expandido todo se ve y navega como antes; un rol sin permisos de un módulo no ve ese grupo ni colapsado ni expandido.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Expandido | ruta activa = hijo | render collapsed=false | grupo abierto + ítems | tests existentes verdes |
| 2 | Gateo colapsado | sin capability de hijo | render collapsed=true | no renderiza | `container` vacío |

## Tasks

### Session 1 — Flyout en grupo colapsado + tests/story + regression [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Reemplazar el branch `collapsed` de `NavGroup` por un `DropdownMenu` (trigger = icono `button`, contenido = `visibleItems` como `DropdownMenuItem`/`Link`, label + separador, `side="right"`). Preservar gateo (`visibleItems`), `hasView` (disabled) y resaltado activo | REQ-FIX-01 | developer | — | `front/jormat-front/src/components/shell/Sidebar/NavGroup/NavGroup.tsx` | build (tsc) + render unit | git revert | DET-5, RULE-frontend-001 | done | 1 |
| S1.T2 | Actualizar `NavGroup.test.tsx` (reescribir el caso colapsado: de "sin botón ni submenú" a "trigger interactivo con nombre accesible + gateo preservado") y `NavGroup.stories.tsx` (story Collapsed: abrir flyout y afirmar sub-ítems en play) | REQ-FIX-01, REQ-REGRESSION-01 | developer | S1.T1 | `front/jormat-front/src/components/shell/Sidebar/NavGroup/NavGroup.test.tsx`, `front/jormat-front/src/components/shell/Sidebar/NavGroup/NavGroup.stories.tsx` | `vitest run --project '!storybook'` (NavGroup) | git revert | DET-7, RULE-frontend-002 | done | 1 |
| S1.T3 | Regression: suite unit jsdom completa del front + typecheck/build | REQ-REGRESSION-01 | reviewer | S1.T2 | — | `vitest run --project '!storybook'` + `./run.sh build` o `tsc --noEmit` | (no aplica) | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr validación T2, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | done | 1 |

### Task contract

```
Task S1.T1: Implementar flyout en grupo colapsado
- source_ref: REQ-FIX-01
- agent: developer
- files: NavGroup.tsx
- precondition: causa raíz confirmada (NavGroup.tsx:52-70)
- expected_output: en collapsed, el icono es trigger de DropdownMenu; el flyout lista visibleItems navegables, respeta hasView y ruta activa
- validation: tsc sin errores + render unit; flyout abre en story play
- rollback: git revert
- rules: [DET-5, RULE-frontend-001]

Task S1.T2: Actualizar test + story
- source_ref: REQ-FIX-01, REQ-REGRESSION-01
- agent: developer
- files: NavGroup.test.tsx, NavGroup.stories.tsx
- precondition: S1.T1 done
- expected_output: test colapsado afirma trigger interactivo (button con nombre) + gateo colapsado; story Collapsed abre flyout
- validation: vitest run --project '!storybook' verde para NavGroup
- rollback: git revert
- rules: [DET-7, RULE-frontend-002]

Task S1.T3: Verificar regression
- source_ref: REQ-REGRESSION-01
- agent: reviewer
- precondition: S1.T2 done
- expected_output: suite unit del front sin nuevas fallas + build/typecheck verde
- validation: vitest run --project '!storybook' + build
- rollback: (no aplica)
- rules: [DET-7, DET-13]
```

## Constraints

- RULE-frontend-001: organización de archivos de componente — el cambio queda dentro de `Sidebar/NavGroup/`, sin nuevos archivos de componente.
- RULE-frontend-002: convenciones de test/story — todo cambio de comportamiento de `NavGroup` actualiza su `.test.tsx` y `.stories.tsx`.
- DEC-003 (nav-data): la taxonomía de navegación es fuente de verdad y NO se modifica.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Test #3 actual codifica el comportamiento roto y rompe | high (esperado) | bajo | Reescribir en S1.T2 al comportamiento correcto (DET-7) |
| jsdom no abre el DropdownMenu (portales/pointer) | medium | medio | Unit test afirma contrato estable (trigger button + gateo), no el toggle; apertura validada en story play + smoke manual |
| Conflicto Radix Tooltip vs DropdownMenu en el mismo trigger | low | medio | No anidar Tooltip; usar `title` nativo para el hint cerrado + `DropdownMenuLabel` al abrir |

## Open questions

{Ninguna — causa raíz confirmada, solución acordada con el dev (Opción A).}

## Decisions

### DEC-LOCAL-01: spec de fix dedicada (no anexar a SPEC-frontend-shell-chrome)
- **Contexto**: el Sidebar/NavGroup nace de JOR-005 (SPEC-frontend-shell-chrome, in_progress, feature grande)
- **Drivers**: el fix es autocontenido; mezclarlo con la spec de feature en curso ensucia su trazabilidad
- **Opcion elegida**: spec de fix nueva, dedicada
- **Alternativas**: anexar REQ-FIX a shell-chrome — descartado por acoplar un fix puntual a una feature spec viva
- **Consecuencias**: dos specs del mismo módulo, ambas linkeadas al módulo shell; trazabilidad limpia por ticket
- **Session**: design-fix

### DEC-LOCAL-02: flyout por click reusando dropdown-menu (Radix)
- **Contexto**: cómo exponer los sub-ítems del grupo colapsado
- **Drivers**: cero deps nuevas, a11y nativa, mínimo blast radius, robustez touch/teclado
- **Opcion elegida**: `DropdownMenu` (click) reusando el primitivo existente
- **Alternativas**: hover-flyout (frágil touch/teclado), nuevo primitivo Popover (dep+código innecesarios), rail-expand/overlay (cambio de UX mayor)
- **Consecuencias**: gana simplicidad y consistencia; el flyout flota sobre el contenido (cuidar `side="right"` + z-index, ya cubierto por el primitivo `z-50`)
- **Session**: design-fix

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-FIX-01 pasan (flyout abre y navega via story play; trigger button por teclado). `hasView disabled` cubierto en código, test explícito en backlog B1 (could)
- [x] **Tests**: `NavGroup.test.tsx` actualizado y verde (8/8); story Collapsed abre flyout (play 2/2)
- [x] **Rules**: RULE-frontend-001/002 respetadas
- [x] **Integration**: suite unit del front sin nuevas fallas (676/676); expandido + hojas colapsadas intactos
- [x] **Docs**: n/a (sin cambio de contrato)
