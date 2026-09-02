---
id: SPEC-frontend-component-org-refactor
project: jormat-evolution
ticket: JOR-024
status: done
---

# Migrar el frontend a la convencion de organizacion de componentes (RULE-frontend-001)

# Migrar el frontend a la convencion de organizacion de componentes (RULE-frontend-001)

## Executive summary — lo que estas aprobando

**Que se quiere**: el codigo del shell y las primitivas (creado en JOR-005) precede a RULE-frontend-001 (registrada en JOR-023), asi que no la cumple. Este refactor cierra la brecha: agrega story+test a las 7 primitivas que no las tienen (+ test a ThemeToggle), mueve los 6 composites del shell a carpeta-por-componente con su test+story, y extrae un composite `Home` co-locado para eliminar el par de archivos huerfanos. Cero cambio de comportamiento: el render es identico.

**Decisiones criticas que necesitan tu OK** (ya resueltas en intake):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Sub-componentes (NavItem/NavGroup, Breadcrumb/EmpresaSwitcher/AccountMenu) se **anidan bajo su padre** (`TopBar/Breadcrumb/...`), no se promueven a hermanos | Preserva el agrupamiento semantico; RULE-frontend-001 lo permite ("sub-carpeta si crecen") |
| 2 | Cada componente movido va a `Comp/` con un `index.ts` barrel y la **carpeta se llama igual que el componente** | Asi los imports existentes (`./Breadcrumb`, `@/shell/AppShell`) resuelven a la carpeta sin cambios — minimiza el riesgo del refactor |
| 3 | `Home` se extrae como composite (`shell/Home/`) y `app/(app)/page.tsx` pasa a orquestarlo | RULE-frontend-001 L42 lo prescribe; elimina los huerfanos `Home.test/stories` del shell |

**Riesgos principales y como los mitigamos**:

- **Mover composites rompe imports** → cada carpeta lleva `index.ts` con el nombre del componente, asi los imports externos resuelven igual; el unico import interno a tocar es `NavGroup → NavItem` (`./NavItem` → `../NavItem`). Verificacion: `vitest run` + build tras cada movimiento.
- **A11y en primitivas radix (dropdown-menu, sheet, tooltip)** que montan en portal → las stories abren el overlay en su `play()` para que el addon-a11y escanee el contenido montado.
- **Regresion silenciosa** → baseline capturado (59/59 verde) ANTES de tocar nada; cada gate re-corre la suite y exige paridad.

**Que NO se hace en este ticket**:

- No se toca `src/auth/*` ni `src/services/api.ts` (RULE-global-003 — codigo base entregado).
- No se agregan features ni se cambia el render de ningun componente.
- No se agregan dependencias npm (solo archivos nuevos `.test.tsx`/`.stories.tsx`/`index.ts`).

**Tamano estimado**: 5 sessions, ~6-9h efectivas. La mas riesgosa es S5 (extraccion de Home + reapuntado de la page + validacion final en Docker).

**Como vas a saber que funciona**:

- `vitest run` sigue verde con los 59 tests originales + los nuevos (todos pass).
- `npm run build` y `./run.sh build` (Docker) compilan sin error.
- Las stories nuevas no reportan violaciones de a11y.
- No quedan `*.test.tsx`/`*.stories.tsx` huerfanos (separados de su componente).

---

## Purpose

Reorganizar los archivos de componentes del frontend (`front/jormat-front/src/`) para que cumplan RULE-frontend-001: primitivas `ui/` planas con story+test hermanos; composites en carpeta-por-componente con `{Comp.tsx, .test.tsx, .stories.tsx, index.ts}`; sin test/story huerfanos. El comportamiento externo NO cambia — es un refactor de estructura + cobertura.

## Requirements

### REQ-01: Cada primitiva de `components/ui/` tiene story + test hermanos

> **Que cambia**: las 7 primitivas sin cobertura (avatar, badge, button, dropdown-menu, separator, sheet, tooltip) y ThemeToggle obtienen su `*.test.tsx`; las 7 ademas obtienen su `*.stories.tsx` (ThemeToggle ya tiene story).
> **Por que**: RULE-frontend-001 exige story Y test por primitiva (la story como base de test visual/a11y, el test para variantes CVA + a11y assertions). Hoy falta.

El sistema MUST tener, por cada `components/ui/<x>.tsx` (no-story/no-test), un `<x>.stories.tsx` Y un `<x>.test.tsx` hermano. Las primitivas se mantienen PLANAS (sin carpeta).

**Actor**: system (estructura de archivos)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cobertura completa de primitivas
- **GIVEN** `components/ui/button.tsx` existe
- **WHEN** se lista el dir `components/ui/`
- **THEN** existen `button.stories.tsx` y `button.test.tsx` hermanos
- **AND** lo mismo para avatar, badge, dropdown-menu, separator, sheet, tooltip; y ThemeToggle tiene `ThemeToggle.test.tsx`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `vitest run` corre los nuevos tests/stories y todos pasan; `ls components/ui/` muestra los pares.

### REQ-02: Cada composite del shell vive en carpeta-por-componente con test+story

> **Que cambia**: Breadcrumb, EmpresaSwitcher, AccountMenu (sub de TopBar), NavItem, NavGroup (sub de Sidebar) y AppShell pasan de archivo suelto a `<Comp>/{Comp.tsx, .test.tsx, .stories.tsx, index.ts}`. Sub-componentes anidados bajo su padre.
> **Por que**: RULE-frontend-001 exige carpeta-por-composite con co-locacion de test+story+barrel.

El sistema MUST ubicar cada composite del shell en su carpeta con los 4 archivos. Los sub-componentes MUST anidarse bajo la carpeta del padre (`TopBar/Breadcrumb/`, `Sidebar/NavItem/`). El barrel `index.ts` de cada carpeta MUST re-exportar el componente, de modo que los imports existentes resuelvan sin cambio.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: composite en carpeta con barrel
- **GIVEN** `shell/TopBar/Breadcrumb.tsx` suelto
- **WHEN** se aplica el refactor
- **THEN** existe `shell/TopBar/Breadcrumb/{Breadcrumb.tsx, Breadcrumb.test.tsx, Breadcrumb.stories.tsx, index.ts}`
- **AND** `import { Breadcrumb } from './Breadcrumb'` en TopBar.tsx sigue resolviendo (al `index.ts` de la carpeta)

#### Scenario: import interno entre sub-componentes
- **GIVEN** `NavGroup` importaba `NavItem` via `./NavItem`
- **WHEN** ambos se mueven a sub-carpetas hermanas
- **THEN** `NavGroup/NavGroup.tsx` importa `NavItem` via `../NavItem` (resuelve al barrel)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los tests de Sidebar y TopBar siguen verdes; `vitest run` y `npm run build` pasan; los imports resuelven.

### REQ-03: Home co-locado, sin huerfanos

> **Que cambia**: se extrae el composite `Home` (`shell/Home/Home.tsx`) desde la logica de `app/(app)/page.tsx`; los huerfanos `shell/Home.test.tsx` y `shell/Home.stories.tsx` se mueven a `shell/Home/` y se reapuntan al composite; `page.tsx` pasa a renderizar `<Home/>`.
> **Por que**: RULE-frontend-001 L42 prohibe test/story huerfanos y prescribe extraer el composite + co-locar.

El sistema MUST extraer un composite `Home` co-locado con su test y story; `app/(app)/page.tsx` MUST solo orquestar el composite. Tras el cambio NO MUST quedar ningun `*.test.tsx`/`*.stories.tsx` separado de su componente.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: Home extraido y co-locado
- **GIVEN** `shell/Home.test.tsx` importa `HomePage` desde `@/app/(app)/page`
- **WHEN** se extrae el composite
- **THEN** existe `shell/Home/{Home.tsx, Home.test.tsx, Home.stories.tsx, index.ts}` y el test/story importan el composite `Home`
- **AND** `app/(app)/page.tsx` renderiza `<Home/>` con el mismo DOM resultante

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la Home se renderiza identica; los tests TC-10..13 siguen verdes; no quedan huerfanos en `shell/`.

### REQ-PRESERVE-01: La API publica (exports/imports) no cambia

> **Que cambia**: nada para los consumidores — los barrels mantienen los mismos exports y paths de import.
> **Por que**: refactor zero-behavior-change; romper un import publico seria un cambio de comportamiento.

El sistema MUST mantener resolubles todos los imports existentes (`@/shell/AppShell`, `./Breadcrumb`, `@/components/ui/ThemeToggle`, etc.) tras el refactor.

**Actor**: system
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: `npm run build` compila sin errores de modulo no encontrado.

### REQ-PRESERVE-02: Los tests existentes pasan sin modificar su logica

> **Que cambia**: los tests existentes solo cambian rutas de import (cuando su componente se mueve), nunca aserciones.
> **Por que**: si un test hay que reescribirlo para que pase, el refactor rompio comportamiento.

El sistema MUST mantener los 59 tests del baseline verdes. Modificaciones permitidas a tests existentes: SOLO rutas de import. Aserciones, describe/it, mocks: sin cambio.

**Actor**: system
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: `vitest run` reporta los 59 originales + nuevos, 0 fail.

## Artifacts

### Refactor map — Files

| Action | Before | After | Reason |
|--------|--------|-------|--------|
| add | — | `ui/button.{stories,test}.tsx` | cobertura RULE-frontend-001 |
| add | — | `ui/badge.{stories,test}.tsx` | cobertura |
| add | — | `ui/avatar.{stories,test}.tsx` | cobertura |
| add | — | `ui/separator.{stories,test}.tsx` | cobertura |
| add | — | `ui/dropdown-menu.{stories,test}.tsx` | cobertura (radix portal) |
| add | — | `ui/sheet.{stories,test}.tsx` | cobertura (radix portal) |
| add | — | `ui/tooltip.{stories,test}.tsx` | cobertura (radix portal) |
| add | — | `ui/ThemeToggle.test.tsx` | falta test (story ya existe) |
| move | `shell/TopBar/Breadcrumb.tsx` | `shell/TopBar/Breadcrumb/Breadcrumb.tsx` + `index.ts` + `.test.tsx` + `.stories.tsx` | carpeta-por-composite |
| move | `shell/TopBar/EmpresaSwitcher.tsx` | `shell/TopBar/EmpresaSwitcher/...` (4 archivos) | idem |
| move | `shell/TopBar/AccountMenu.tsx` | `shell/TopBar/AccountMenu/...` (4 archivos) | idem |
| move | `shell/Sidebar/NavItem.tsx` | `shell/Sidebar/NavItem/...` (4 archivos) | idem |
| move | `shell/Sidebar/NavGroup.tsx` | `shell/Sidebar/NavGroup/...` (4 archivos) | idem; fix import NavItem |
| move | `shell/AppShell.tsx` | `shell/AppShell/AppShell.tsx` + `index.ts` + `.test.tsx` + `.stories.tsx` | carpeta-por-composite |
| extract | logica de `app/(app)/page.tsx` | `shell/Home/Home.tsx` + `index.ts` | composite co-locado |
| move | `shell/Home.test.tsx` | `shell/Home/Home.test.tsx` (reapuntar import) | eliminar huerfano |
| move | `shell/Home.stories.tsx` | `shell/Home/Home.stories.tsx` (reapuntar import) | eliminar huerfano |
| edit | `app/(app)/page.tsx` | renderiza `<Home/>` | orquestar composite |

### Exports affected

| Export | Current location | New location | Consumers |
|--------|-----------------|--------------|-----------|
| `Breadcrumb` | `shell/TopBar/Breadcrumb.tsx` | `shell/TopBar/Breadcrumb/index.ts` | TopBar.tsx, TopBar/index.ts (import path sin cambio) |
| `EmpresaSwitcher` | `shell/TopBar/EmpresaSwitcher.tsx` | `shell/TopBar/EmpresaSwitcher/index.ts` | TopBar.tsx, TopBar/index.ts |
| `AccountMenu` | `shell/TopBar/AccountMenu.tsx` | `shell/TopBar/AccountMenu/index.ts` | TopBar.tsx, TopBar/index.ts |
| `NavItem` | `shell/Sidebar/NavItem.tsx` | `shell/Sidebar/NavItem/index.ts` | Sidebar.tsx, NavGroup (`../NavItem`), Sidebar/index.ts |
| `NavGroup` | `shell/Sidebar/NavGroup.tsx` | `shell/Sidebar/NavGroup/index.ts` | Sidebar.tsx, Sidebar/index.ts |
| `AppShell` | `shell/AppShell.tsx` | `shell/AppShell/index.ts` | `app/(app)/layout.tsx` (`@/shell/AppShell` sin cambio) |
| `Home` (nuevo) | — | `shell/Home/index.ts` | `app/(app)/page.tsx` (nuevo import) |

### Consumer updates required

| Consumer file | Current import | New import |
|---------------|---------------|------------|
| `shell/Sidebar/NavGroup/NavGroup.tsx` | `import { NavItem } from './NavItem'` | `import { NavItem } from '../NavItem'` |
| `app/(app)/page.tsx` | (logica inline) | `import { Home } from '@/shell/Home'` |
| `shell/Home/Home.test.tsx` | `import HomePage from '@/app/(app)/page'` | `import { Home } from './Home'` |
| `shell/Home/Home.stories.tsx` | `import HomePage from '@/app/(app)/page'` | `import { Home } from './Home'` |

> Todos los demas imports (`./Breadcrumb`, `@/shell/AppShell`, etc.) resuelven sin cambio gracias al `index.ts` barrel con nombre = componente.

## Tasks

### Session 1 — Primitivas simples: story+test (button, badge, avatar, separator) + ThemeToggle test [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `button.stories.tsx` + `button.test.tsx` (variantes CVA + a11y) | REQ-01 | developer | — | `ui/button.stories.tsx`, `ui/button.test.tsx` | `vitest run ui/button` verde | git revert | DET-7, RULE-frontend-001 | pending | 1 |
| S1.T2 | Crear `badge.stories.tsx` + `badge.test.tsx` | REQ-01 | developer | — | `ui/badge.stories.tsx`, `ui/badge.test.tsx` | `vitest run ui/badge` verde | git revert | DET-7, RULE-frontend-001 | pending | 1 |
| S1.T3 | Crear `avatar.stories.tsx` + `avatar.test.tsx` | REQ-01 | developer | — | `ui/avatar.stories.tsx`, `ui/avatar.test.tsx` | `vitest run ui/avatar` verde | git revert | DET-7, RULE-frontend-001 | pending | 1 |
| S1.T4 | Crear `separator.stories.tsx` + `separator.test.tsx` | REQ-01 | developer | — | `ui/separator.stories.tsx`, `ui/separator.test.tsx` | `vitest run ui/separator` verde | git revert | DET-7, RULE-frontend-001 | pending | 1 |
| S1.T5 | Crear `ThemeToggle.test.tsx` (story ya existe) | REQ-01 | developer | — | `ui/ThemeToggle.test.tsx` | `vitest run ThemeToggle` verde | git revert | DET-7, RULE-frontend-001 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir, `vitest run` completo + coverage delta, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + suite verde (59 + nuevos) | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Primitivas radix-portal: story+test (dropdown-menu, sheet, tooltip) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `dropdown-menu.stories.tsx` (play() abre overlay) + `dropdown-menu.test.tsx` | REQ-01 | developer | S1.GATE | `ui/dropdown-menu.stories.tsx`, `ui/dropdown-menu.test.tsx` | `vitest run dropdown-menu` verde + a11y limpio | git revert | DET-7, RULE-frontend-001 | pending | 2 |
| S2.T2 | Crear `sheet.stories.tsx` (play() abre) + `sheet.test.tsx` | REQ-01 | developer | S1.GATE | `ui/sheet.stories.tsx`, `ui/sheet.test.tsx` | `vitest run sheet` verde + a11y limpio | git revert | DET-7, RULE-frontend-001 | pending | 2 |
| S2.T3 | Crear `tooltip.stories.tsx` (play() hover) + `tooltip.test.tsx` | REQ-01 | developer | S1.GATE | `ui/tooltip.stories.tsx`, `ui/tooltip.test.tsx` | `vitest run tooltip` verde + a11y limpio | git revert | DET-7, RULE-frontend-001 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, `vitest run` completo, confirmar H4 (a11y portal), decidir | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + suite verde + a11y sin violaciones | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Composites de TopBar a sub-carpeta (Breadcrumb, EmpresaSwitcher, AccountMenu) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Mover `Breadcrumb.tsx` → `Breadcrumb/{Breadcrumb.tsx, index.ts}` + crear `.test.tsx` + `.stories.tsx` | REQ-02 | developer | S2.GATE | `shell/TopBar/Breadcrumb/*` | `vitest run TopBar` verde + build | git revert | DET-8, RULE-frontend-001, RULE-global-003 | pending | 3 |
| S3.T2 | Mover `EmpresaSwitcher.tsx` → carpeta (4 archivos) | REQ-02 | developer | S3.T1 | `shell/TopBar/EmpresaSwitcher/*` | `vitest run TopBar` verde + build | git revert | DET-8, RULE-frontend-001 | pending | 3 |
| S3.T3 | Mover `AccountMenu.tsx` → carpeta (4 archivos) | REQ-02 | developer | S3.T2 | `shell/TopBar/AccountMenu/*` | `vitest run TopBar` verde + build | git revert | DET-8, RULE-frontend-001 | pending | 3 |
| S3.T4 | Verificar barrel `TopBar/index.ts` + imports de `TopBar.tsx`/`TopBar.test.tsx` resuelven a las carpetas | REQ-PRESERVE-01 | reviewer | S3.T3 | `shell/TopBar/index.ts`, `shell/TopBar/TopBar.tsx` | `npm run build` + `vitest run TopBar` verde | git revert | DET-5, DET-16, RULE-frontend-001 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, `vitest run` completo, decidir | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + suite verde + imports resuelven | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — Composites de Sidebar (NavItem, NavGroup) + AppShell a carpeta [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Mover `NavItem.tsx` → `NavItem/{NavItem.tsx, index.ts}` + `.test.tsx` + `.stories.tsx` | REQ-02 | developer | S3.GATE | `shell/Sidebar/NavItem/*` | `vitest run Sidebar` verde + build | git revert | DET-8, RULE-frontend-001 | pending | 4 |
| S4.T2 | Mover `NavGroup.tsx` → carpeta (4 archivos); fix import `NavItem` (`./NavItem` → `../NavItem`) | REQ-02 | developer | S4.T1 | `shell/Sidebar/NavGroup/*` | `vitest run Sidebar` verde + build | git revert | DET-8, DET-5, RULE-frontend-001 | pending | 4 |
| S4.T3 | Mover `AppShell.tsx` → `AppShell/{AppShell.tsx, index.ts}` + `.test.tsx` + `.stories.tsx` | REQ-02 | developer | S4.T2 | `shell/AppShell/*` | `vitest run` + build (consumer `layout.tsx`) | git revert | DET-8, RULE-frontend-001 | pending | 4 |
| S4.T4 | Verificar barrel `Sidebar/index.ts` + import `@/shell/AppShell` en `layout.tsx` resuelven | REQ-PRESERVE-01 | reviewer | S4.T3 | `shell/Sidebar/index.ts`, `app/(app)/layout.tsx` | `npm run build` + `vitest run` verde | git revert | DET-5, DET-16 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — persistir, `vitest run` completo, decidir | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4 | ticket | gate persistido + suite verde + imports resuelven | (no aplica) | DET-20, DET-23 | pending | 4 |

### Session 5 — Extraer composite Home + co-locar huerfanos + validacion final [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Extraer composite `Home` (`shell/Home/Home.tsx` + `index.ts`) desde la logica de `page.tsx` | REQ-03 | developer | S4.GATE | `shell/Home/Home.tsx`, `shell/Home/index.ts` | `npm run build` + render identico | git revert | DET-8, RULE-frontend-001 | pending | 5 |
| S5.T2 | Mover `Home.test.tsx` + `Home.stories.tsx` a `shell/Home/`, reapuntar import al composite | REQ-03, REQ-PRESERVE-02 | developer | S5.T1 | `shell/Home/Home.test.tsx`, `shell/Home/Home.stories.tsx` | `vitest run Home` verde (TC-10..13) | git revert | DET-7, RULE-frontend-001 | pending | 5 |
| S5.T3 | Reapuntar `app/(app)/page.tsx` a renderizar `<Home/>` | REQ-03 | developer | S5.T2 | `app/(app)/page.tsx` | `npm run build` + `vitest run` verde | git revert | DET-8, DET-16 | pending | 5 |
| S5.T4 | Validacion final: `npm run build` + `vitest run` (paridad 59 + nuevos) + a11y + `./run.sh build` (Docker) + verificar sin huerfanos | REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S5.T3 | (repo) | build host+Docker verde + suite verde + 0 huerfanos | (no aplica) | DET-7, DET-13, DET-14 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** — persistir, validacion completa, decidir cierre | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | ticket | gate persistido + acceptance checkpoints OK | (no aplica) | DET-20, DET-23 | pending | 5 |

### Task contract (referencia)

```
Patron por task de "mover composite a carpeta":
- crear dir Comp/
- git mv Comp.tsx Comp/Comp.tsx
- crear Comp/index.ts: export { Comp } from './Comp'
- crear Comp/Comp.test.tsx (render + props clave + a11y) y Comp/Comp.stories.tsx
- ajustar imports relativos internos del componente si los hay (depth +1)
- validar: vitest run <area> + npm run build
- rollback: git revert del commit de la task
```

## Constraints

- RULE-frontend-001: convencion objetivo (ui/ plano + composites en carpeta, story+test por componente, sin huerfanos).
- RULE-global-003: NO modificar `src/auth/*` ni `src/services/api.ts` (codigo base entregado). El shell/ui SI es del equipo (JOR-005) → refactor permitido.
- RULE-global-001: DoD/calidad (sin dead code, nombres descriptivos, comentarios en espanol).
- DET-7: regression obligatoria (baseline 59/59 capturado, paridad en cada gate).
- DET-8: rollback documentado por task (git revert atomico).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Import interno roto al mover (depth cambia) | medium | build falla | Solo `NavGroup → NavItem` lo requiere (identificado); el resto usa alias `@/` o barrel; build tras cada move |
| Story radix no escanea a11y (portal cerrado) | medium | a11y gap silencioso | `play()` abre el overlay antes del scan; confirmar en S2.GATE (H4) |
| Test pasa por casualidad (no ejercita el codigo) | low | regresion silenciosa | tests nuevos con aserciones concretas de variantes/roles; baseline preserva los existentes |
| Docker build difiere del host | low | falla en contenedor | no se agregan deps (solo archivos); `./run.sh build` en S5 igual valida |

## Open questions

- [ ] H4: ¿las stories de dropdown-menu/sheet/tooltip necesitan `play()` que abra el overlay para a11y? — se confirma empiricamente en S2.

## Decisions

### DEC-LOCAL-01: Sub-componentes anidados bajo el padre + carpeta = nombre del componente
- **Contexto**: como aplicar carpeta-por-componente a sub-componentes (NavItem/NavGroup, Breadcrumb/EmpresaSwitcher/AccountMenu).
- **Drivers**: preservar agrupamiento semantico; minimizar cambios de import; cumplir RULE-frontend-001.
- **Opcion elegida**: anidar bajo el padre (`TopBar/Breadcrumb/`) con `index.ts` barrel cuyo nombre de carpeta = componente.
- **Alternativas**: promover a hermanos (`shell/Breadcrumb/`) — descartada: pierde agrupamiento y no aporta.
- **Consecuencias**: imports externos resuelven sin cambio; estructura mas anidada pero semantica.
- **Session**: intake (confirmada por dev).

## Acceptance checkpoints

- [ ] **Funcional**: render identico de todos los componentes (zero-behavior-change).
- [ ] **Tests**: 59 baseline + nuevos, todos verdes (`vitest run`).
- [ ] **Rules**: RULE-frontend-001 cumplida (grep: cada ui/*.tsx con sus pares; cada composite en carpeta; 0 huerfanos).
- [ ] **Integration**: `npm run build` + `./run.sh build` (Docker) verdes.
- [ ] **A11y**: stories nuevas sin violaciones.
- [ ] **Scope**: sin cambios fuera de `components/ui/`, `shell/`, `app/(app)/` (RULE-global-003).
