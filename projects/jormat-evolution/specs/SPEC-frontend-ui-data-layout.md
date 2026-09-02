---
id: SPEC-frontend-ui-data-layout
project: jormat-evolution
ticket: JOR-007
status: in_progress
---

# Librería UI: datos + layout (DataTable/Pagination + FilterBar + KPICard/StatGrid + PageLayout/TwoColumn)

# Librería UI: datos + layout (DataTable/Pagination + FilterBar + KPICard/StatGrid + PageLayout/TwoColumn)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: Construir la segunda mitad de la librería UI compartida de `front/jormat-front`: los **organismos** reutilizables que componen todas las vistas de negocio de la FASE B. Concretamente: un `DataTable` genérico (TanStack Table v8 — sorting, paginación, primera columna sticky, toggle de columnas, acciones de fila, estados vacío/carga/error), `Pagination`, `FilterBar` (filtros inline en `≥lg` / drawer off-canvas con `Sheet` en `<lg`), `KPICard`/`StatGrid` (métrica con tendencia + variantes semánticas, grilla responsive) y los arquetipos de página `PageLayout`/`TwoColumn`. Todo con story + test + chequeo a11y, reusando los átomos de JOR-006. Desbloquea JOR-008, JOR-011 y toda la FASE B.

**Decisiones criticas** (resueltas en modo super con racional — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `DataTable` genérico `<TData, TValue>` con `ColumnDef[]` como prop — sin lógica de negocio hardcodeada | DET-31/C1: el organismo se reusa en N vistas; acoplarlo a un dominio lo haría inútil. Specs explícitas (no heurísticas por nombre de campo) |
| 2 | Primera columna sticky `table-scoped` (`z-10` local), no z-index global | El repo no tiene tokens de zIndex; sidebar es `z-30`, overlays `z-50`. Mantenerla local evita colisión |
| 3 | `FilterBar` controlado (estado de filtros lo dueña el consumidor) + drawer = `Sheet` de JOR-006 | El fetching/React Query se hace por-vista en FASE B; el organismo solo expone estado+callbacks |
| 4 | `KPICard` con variantes CVA `success/warning/info/brand/neutral` (paridad con Badge) y tendencia opcional | Sin token `accent-brand`; "brand" usa `accent`. Tendencia como prop tipada, no inferida |
| 5 | Crear carpeta `src/components/layout/` (no existe) para `PageLayout`/`TwoColumn` | Organismos de layout no son "ui atoms"; separarlos respeta la taxonomía post-JOR-024/025 |

**Riesgos principales y como los mitigamos**:

- **DataTable acoplado a un dominio** (anti-patrón T-010 C2) → API genérica con `columns: ColumnDef<TData,TValue>[]` + `data: TData[]`; los estados (loading/empty/error) y acciones se pasan por props/render, no se infieren por nombre de campo. Test verifica que funciona con dos shapes de datos distintos.
- **Sticky col colisiona con sidebar/overlays** → `z-10` table-scoped + `bg-card`/`bg-muted` en la celda sticky; story con scroll horizontal verifica que la columna no se "transparenta" sobre el resto.
- **Interacción Radix (drawer FilterBar, menú de acciones, toggle columnas) flaky en jsdom** → RULE-frontend-002: la interacción de portales va en `play()` de la story (browser mode); jsdom cubre la lógica pura (sorting reordena, "Limpiar" resetea, toggle filtra columnas visibles).
- **Deps Radix nuevas invisibles en Docker del dev** → no se agregan deps nuevas (TanStack ya instalado en JOR-002; Sheet/Dialog en JOR-006). Si emergiera alguna, documentar `./run.sh build`.

**Que NO se hace** (límites explícitos):

- Vistas de negocio de FASE B (Usuarios, etc.), lógica de fetching/React Query → por-vista en FASE B.
- Reconstruir átomos de JOR-006 (Button/Badge/Sheet/Dialog/Select) → ya entregados, RULE-global-003.
- Virtualización de filas, edición inline de celdas, column resizing, drag-reorder → fuera de alcance literal (se evalúan cuando un consumidor real los pida).
- Backend.

**Tamano estimado**: 4 sessions (~6–8h efectivas). La más riesgosa es **S1** (DataTable — generics TanStack + sticky + toggle + estados, tier T2).

**Como vas a saber que funciona**:

- Abro Storybook y veo el DataTable con datos de ejemplo: ordeno por una columna y reordena; navego páginas; oculto/muestro una columna; la primera columna queda fija al hacer scroll horizontal. En claro y oscuro, sin violaciones a11y.
- El FilterBar muestra chips inline en pantalla ancha y abre un drawer en angosta; "Limpiar" resetea.
- KPICard pinta sus 5 variantes de color con tendencia ↑/↓; StatGrid pasa de 5 a 2 a 1 columna al achicar.
- `npm run test` (vitest jsdom + storybook browser) 100% verde; `stryker` corre warn-first sobre el diff.

---

## Purpose

Proveer los **organismos** de datos y layout de la librería UI compartida (`src/components/ui/` y la nueva `src/components/layout/`) de `front/jormat-front`, construidos con TanStack Table v8 + shadcn/ui + CVA sobre los tokens de JOR-003, reusando los átomos de JOR-006 (`Button`, `Badge`, `Select`, `Input`, `Sheet`, `Dialog`, `DropdownMenu`). Siguen la convención carpeta-por-componente (RULE-frontend-001) y las convenciones de test/story del stack vitest-dual + storybook-nextjs-vite (RULE-frontend-002). Son genéricos y agnósticos al dominio: el fetching y la lógica de negocio viven en las vistas de FASE B que los componen.

## Requirements

### REQ-01: DataTable

> **Que cambia**: el dev arma una tabla pasando `columns` + `data` y obtiene sorting, paginación, primera columna fija al scrollear, un menú para ocultar columnas, acciones por fila y estados vacío/carga/error — sin reimplementar nada.
> **Por que**: cada vista de FASE B necesita un listado; hoy no existe ninguno (TanStack está instalado pero sin uso).

El sistema MUST proveer un componente genérico `DataTable<TData, TValue>` en `src/components/ui/data-table/` construido sobre `@tanstack/react-table` (`useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getPaginationRowModel`), que reciba `columns: ColumnDef<TData, TValue>[]` y `data: TData[]` como props, y que SOPORTE: (a) sorting por columna vía header clickable; (b) paginación con el componente `Pagination` (REQ-02); (c) primera columna **sticky** (`sticky left-0` + `bg-card`/header `bg-muted` + `z-10` table-scoped) con scroll horizontal (`overflow-x-auto`); (d) toggle de columnas visibles vía `DropdownMenu` ("Columnas"); (e) acciones de fila opcionales vía prop de render; (f) estados `loading`/`empty`/`error` inline (props booleanas/render), sin heurísticas por nombre de campo (DET-31/C1).

**Actor**: dev consumidor (vistas FASE B)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | sorting reordena | DataTable con `data` desordenada y columna `name` sortable | el usuario hace click en el header `name` | la tabla reordena por `name` asc, segundo click desc | primera fila cambia según orden; `aria-sort` refleja dirección |
| 2 | paginación navega | DataTable con `pageSize=10` y 25 filas | el usuario hace click en "Siguiente" | muestra filas 11–20 | el rango "Mostrando 11–20 de 25" se actualiza |
| 3 | toggle oculta columna | DataTable con 5 columnas y menú "Columnas" abierto | el usuario desmarca `email` | la columna `email` desaparece de header y celdas | `getAllColumns().find(c=>c.id==='email').getIsVisible()===false` |
| 4 | estado vacío | DataTable con `data=[]` y `isLoading=false` | se renderiza | muestra el slot/empty "Sin resultados" | no renderiza filas de datos |
| 5 | estado carga | DataTable con `isLoading=true` | se renderiza | muestra el slot de carga | no renderiza el empty ni filas |
| 6 | genérico (dos shapes) | DataTable con `TData = User` y luego `TData = Product` | se renderiza cada uno con sus `columns` | ambos renderizan sin error de tipos | el componente no asume campos concretos |

</details>

**Acceptance**: el dev abre la story "con datos", ordena/pagina/oculta-columna y ve la primera columna fija al scrollear horizontalmente; las stories vacío/carga/error muestran su estado.

### REQ-02: Pagination

> **Que cambia**: aparece un control de paginación reusable (anterior/siguiente + números + rango "Mostrando X–Y de N") que el DataTable usa, y que también sirve suelto.
> **Por que**: separar la navegación de páginas de la tabla permite testearla aislada y reusarla en otros listados.

El sistema MUST proveer un componente `Pagination` en `src/components/ui/pagination/` que reciba `page`, `pageCount`, `total`, `pageSize` y un callback `onPageChange`, renderice botones anterior/siguiente (deshabilitados en los extremos) + números de página + un texto de rango, usando `Button` (átomo JOR-006) y tokens.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | extremos deshabilitados | `Pagination page=1 pageCount=3` | se renderiza | "Anterior" está `disabled` | botón anterior no dispara `onPageChange` |
| 2 | cambia página | `Pagination page=1` con `onPageChange` espía | click en "Siguiente" | `onPageChange(2)` se llama una vez | `toHaveBeenCalledWith(2)` |
| 3 | rango correcto | `page=2 pageSize=10 total=25` | se renderiza | muestra "Mostrando 11–20 de 25" | texto exacto |

</details>

### REQ-03: FilterBar

> **Que cambia**: el dev coloca una barra de filtros que se ve inline (búsqueda + selects + chips activos + "Limpiar") en pantallas anchas, y se colapsa en un drawer lateral en pantallas chicas.
> **Por que**: los listados de FASE B filtran; se centraliza el patrón responsive y el reseteo en un solo organismo controlado.

El sistema MUST proveer `FilterBar` en `src/components/ui/filter-bar/` que renderice los controles de filtro (`children`) **inline en `≥lg`** y dentro de un `Sheet` (drawer off-canvas, JOR-006) **en `<lg`**, de forma **controlada** (el estado de cada control lo dueña el consumidor en los `children` — patrón children-as-controlled, ver DEC-LOCAL-03), muestre chips de filtros activos vía prop `activeFilters: FilterChip[]` (usando `Badge`, removibles con `onRemoveFilter(id)`) y un botón "Limpiar" que invoque `onClear`.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | "Limpiar" resetea | FilterBar con chips activos y `onClear` espía | click en "Limpiar" | `onClear()` se llama una vez | `toHaveBeenCalledOnce` (test jsdom) |
| 2 | drawer abre <lg | story con viewport angosto y trigger de filtros | `play()` hace click en "Filtros" | el `Sheet` se abre con los filtros dentro | `role="dialog"` visible (story browser) |
| 3 | inline ≥lg | story con viewport ancho | se renderiza | los filtros se muestran inline (sin trigger de drawer) | filtros visibles sin abrir Sheet |

</details>

### REQ-04: KPICard + StatGrid

> **Que cambia**: el dev muestra una métrica (valor + etiqueta + ícono + tendencia ↑/↓) con un color semántico, y las agrupa en una grilla que pasa de 5 a 2 a 1 columna según el ancho.
> **Por que**: los dashboards de FASE B repiten tarjetas de métrica; se estandariza el look (tokens) y la responsividad.

El sistema MUST proveer `KPICard` en `src/components/ui/kpi-card/` (props: `label`, `value`, `icon?`, `trend?: { direction: 'up'|'down'|'flat'; label: string }`, `variant?: 'success'|'warning'|'info'|'brand'|'neutral'`) con clases CVA sobre tokens (`--success/-bg/-fg`, `--warning*`, `--info*`, `--accent*`, `--muted*`), y `StatGrid` en `src/components/ui/stat-grid/` con `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | variante de color | `KPICard variant="warning"` | se renderiza | usa clases `--warning-bg`/`--warning-fg` en el ícono | `toHaveClass` del contenedor de ícono |
| 2 | tendencia | `KPICard trend={{direction:'up',label:'12%'}}` | se renderiza | muestra ↑ y el label de tendencia | texto "12%" presente con color success |
| 3 | grid responsive | `StatGrid` con 5 KPICards | se renderiza | contenedor tiene `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` | `toHaveClass` (jsdom) + resize story |

</details>

### REQ-05: PageLayout + TwoColumn

> **Que cambia**: el dev envuelve el contenido de una página en un contenedor consistente (`p-6`, ancho fluido), y opta por un layout de dos columnas que apila en pantallas chicas.
> **Por que**: las vistas de FASE B necesitan un marco de página uniforme; se evita que cada vista invente su padding/anchos.

El sistema MUST proveer `PageLayout` (props: `title?`, `actions?`, `children`) y `TwoColumn` (props: `main`, `aside`, apila en `<lg`) en `src/components/layout/`, con padding `p-6` y ancho fluido, usando tokens. La carpeta `src/components/layout/` se crea en este ticket.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | PageLayout con título y acciones | `PageLayout title="Usuarios" actions={<Button/>}` | se renderiza | muestra el título y el slot de acciones; children debajo | título y botón presentes |
| 2 | TwoColumn apila <lg | `TwoColumn main aside` | se renderiza | contenedor responsive (`lg:grid-cols-[1fr_320px]`, stack por defecto) | `toHaveClass` + resize story |

</details>

## Artifacts

> No hay `meta-specs/` en el proyecto → los artefactos se derivan del draft aprobado (`JOR-007.draft/intent.md`) y de la convención RULE-frontend-001. Todos tienen consumidor concreto: cada componente nuevo aparece en una task de S1–S3 y será consumido por las vistas de FASE B / JOR-008 / JOR-011.

### Componentes nuevos (carpeta-por-componente, RULE-frontend-001)

| Componente | Carpeta | Archivos | source_ref | Reusa |
|-----------|---------|----------|------------|-------|
| DataTable | `src/components/ui/data-table/` | `data-table.tsx`, `index.ts`, `data-table.stories.tsx`, `data-table.test.tsx` | REQ-01 | DropdownMenu, Button, Badge |
| Pagination | `src/components/ui/pagination/` | `pagination.tsx`, `index.ts`, `.stories.tsx`, `.test.tsx` | REQ-02 | Button |
| FilterBar | `src/components/ui/filter-bar/` | `filter-bar.tsx`, `index.ts`, `.stories.tsx`, `.test.tsx` | REQ-03 | Sheet, Input, Select, Badge, Button |
| KPICard | `src/components/ui/kpi-card/` | `kpi-card.tsx`, `index.ts`, `.stories.tsx`, `.test.tsx` | REQ-04 | Card |
| StatGrid | `src/components/ui/stat-grid/` | `stat-grid.tsx`, `index.ts`, `.stories.tsx`, `.test.tsx` | REQ-04 | — |
| PageLayout | `src/components/layout/page-layout/` | `page-layout.tsx`, `index.ts`, `.stories.tsx`, `.test.tsx` | REQ-05 | — |
| TwoColumn | `src/components/layout/two-column/` | `two-column.tsx`, `index.ts`, `.stories.tsx`, `.test.tsx` | REQ-05 | — |

Checklist de calidad por artefacto:
- **Config declarativa**: los copys visibles ("Columnas", "Limpiar", "Sin resultados", "Mostrando X–Y de N", "Filtros") quedan como props con default en castellano, no hardcodeados de forma que impidan i18n futuro. El proyecto no tiene infra i18n aún → deuda explícita documentada (default en castellano vía prop). No bloquea.
- **Consumidor concreto**: todos los componentes se consumen en FASE B (DataTable→Usuarios JOR-011; PageLayout/TwoColumn→todas las vistas; KPICard→dashboards). Status: `planned` para el consumidor, `active` para el organismo.
- **Sin heurísticas**: DataTable recibe `columns`/estados como specs explícitas; KPICard recibe `variant`/`trend` tipados, NO infiere por nombre de campo.

## Tasks

### Session 1 — DataTable + Pagination [tipo: ⚑ fuerte] [tier: T2]

> ⚑ fuerte: es el organismo más complejo (generics TanStack + sticky + toggle + estados); valida empíricamente que la API genérica funciona con shapes distintos antes de seguir.

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `Pagination` (carpeta): props page/pageCount/total/pageSize/onPageChange, botones prev/next (disabled en extremos) + números + texto de rango, sobre `Button`; index.ts; story (rango, extremos) + test jsdom (extremos disabled, onPageChange, texto rango) | REQ-02 | developer | — | front/jormat-front/src/components/ui/pagination/ | vitest jsdom pagination.test + lint | git rm -r pagination/ | DET-1, DET-2, RULE-frontend-001, RULE-frontend-002 | done | 1 |
| S1.T2 | Crear `DataTable<TData,TValue>` (carpeta) sobre `@tanstack/react-table`: columns/data props, getCore/Sorted/PaginationRowModel, header sortable (aria-sort), 1ª col sticky (`sticky left-0 z-10 bg-card`/header `bg-muted`) + `overflow-x-auto`, toggle columnas vía DropdownMenu, acciones de fila por render prop, estados loading/empty/error inline; integra `Pagination`; index.ts | REQ-01 | developer | S1.T1 | front/jormat-front/src/components/ui/data-table/ | vitest jsdom data-table.test + lint | git rm -r data-table/ | DET-1, DET-2, RULE-frontend-001, RULE-global-001 | done | 1 |
| S1.T3 | Stories + tests de DataTable: story con datos (play: sorting reordena, paginación navega, toggle oculta columna), stories vacío/carga/error; test jsdom (sorting cambia orden, toggle visibilidad columna, render con dos shapes `User`/`Product`, empty/loading) | REQ-01 | developer | S1.T2 | front/jormat-front/src/components/ui/data-table/data-table.stories.tsx, data-table.test.tsx | vitest jsdom + lint | git checkout data-table/ | DET-7, RULE-frontend-002 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, correr vitest jsdom del área + lint + tsc, quality review standard (10 dims), lanzar `dkc-mutate` async (warn-first), decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3 | projects/jormat-evolution/tickets/JOR-007.md | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-31 | done | 1 |

### Session 2 — FilterBar + KPICard/StatGrid [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `FilterBar` (carpeta): controlado (value/onChange/onClear), inline ≥lg (Input+Select+chips Badge+"Limpiar") / drawer `Sheet` <lg con trigger "Filtros"; index.ts; story (inline ancho + play abre drawer angosto) + test jsdom ("Limpiar" llama onClear, chips render) | REQ-03 | developer | S1.GATE | front/jormat-front/src/components/ui/filter-bar/ | vitest jsdom filter-bar.test + lint | git rm -r filter-bar/ | DET-1, DET-2, RULE-frontend-001, RULE-frontend-002 | done | 2 |
| S2.T2 | Crear `KPICard` (CVA variants success/warning/info/brand/neutral, label/value/icon/trend) + `StatGrid` (grid 1→2→5) (2 carpetas); index.ts c/u; stories (todas las variantes + grid) + tests jsdom (clases por variante, tendencia ↑/↓, clases grid) | REQ-04 | developer | S1.GATE | front/jormat-front/src/components/ui/kpi-card/, front/jormat-front/src/components/ui/stat-grid/ | vitest jsdom kpi-card.test + stat-grid.test + lint | git rm -r kpi-card/ stat-grid/ | DET-1, DET-2, RULE-frontend-001, RULE-global-001 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — persistir, vitest jsdom + lint + tsc, a11y del drawer (story play), quality review standard, `dkc-mutate` async diff-scoped, decidir continue/iterate | — | reviewer | S2.T1, S2.T2 | projects/jormat-evolution/tickets/JOR-007.md | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-31 | done | 2 |

### Session 3 — PageLayout + TwoColumn [tipo: auto] [tier: T1]

parallel_groups: [[S3.T1, S3.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Crear carpeta `src/components/layout/` + `PageLayout` (title/actions/children, `p-6` fluido); index.ts; story (con/sin título y acciones) + test jsdom (título y acciones render, children debajo) | REQ-05 | developer | S2.GATE | front/jormat-front/src/components/layout/page-layout/ | vitest jsdom page-layout.test + lint | git rm -r layout/page-layout/ | DET-1, DET-2, RULE-frontend-001 | done | 3 |
| S3.T2 | Crear `TwoColumn` (main/aside, stack <lg, `lg:grid-cols-[1fr_320px]`); index.ts; story (resize) + test jsdom (clases responsive, slots render) | REQ-05 | developer | S2.GATE | front/jormat-front/src/components/layout/two-column/ | vitest jsdom two-column.test + lint | git rm -r layout/two-column/ | DET-1, DET-2, RULE-frontend-001 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T1) — persistir, vitest jsdom del área + lint + tsc, quality review light, decidir continue/iterate | — | reviewer | S3.T1, S3.T2 | projects/jormat-evolution/tickets/JOR-007.md | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Cierre WP: suite completa + mutation + a11y + review [tipo: auto] [tier: T3]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Correr suite completa (`npm run test`: jsdom + storybook browser, cache limpia) + verificar a11y de los organismos nuevos (addon-a11y); resolver hallazgos del `dkc-mutate` de S1–S2 (sobrevivientes critical → hardening; light → backlog must) | — | reviewer | S3.GATE | front/jormat-front/ | `npm run test` 100% verde + reporte a11y + mutation report | (no aplica) | DET-7, DET-13, DET-23, DET-31 | done | 4 |
| **S4.GATE** | Gate de cierre WP (tier: T3) — persistir, quality review exhaustive (10 dims), verificar 4 commits DET-27, acceptance checkpoints, decidir continue→close | — | reviewer | S4.T1 | projects/jormat-evolution/tickets/JOR-007.md | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | done | 4 |

## Technical reference

- **TanStack Table v8** (`@tanstack/react-table@^8.21.3`, ya instalado): usar `useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(), state, onSortingChange, ... })`. Toggle de columnas vía `table.getAllLeafColumns()` + `column.toggleVisibility()`. Sin uso previo en el repo.
- **Tokens (JOR-003, `src/app/globals.css`)**: `--success/-bg/-fg`, `--warning*`, `--info*`, `--accent`/`--accent-foreground` (brand), `--muted*`, `--card`, `--border`. Consumidos via `hsl(var(--token))` o clases Tailwind mapeadas.
- **`cn()`**: `src/lib/utils.ts`. **CVA**: `class-variance-authority@^0.7.1` (patrón de Button/Badge).
- **Átomos reusables (JOR-006)**: `src/components/ui/{button,badge,input,select,sheet,dialog,dropdown-menu,card}/` — export named via `index.ts`.
- **Testing**: `vitest.config.ts` con 2 projects (jsdom default + `storybook` browser/playwright). jsdom-only: `vitest run --project '!storybook'` (ref. memoria — storybook browser flaky, limpiar cache). Interacción Radix (portales) → `play()` de story.
- **Mutation**: `stryker.conf.json` warn-first (`break: null`), diff: `stryker run --since=develop` (o vía `dkc-mutate` async, monorepo-targeting diff-driven).

## Constraints

- RULE-frontend-001 (component-file-organization, should): carpeta-por-componente con `Component.tsx` + `index.ts` (`export * from './component'`) + `.stories.tsx` + `.test.tsx`. Nombre de archivo = nombre de carpeta (kebab-case).
- RULE-frontend-002 (test-story-authoring-conventions, should): interacción de portales Radix en `play()`; jsdom para lógica pura; `Meta`/`StoryObj` de `@storybook/nextjs-vite`; a11y addon en `test: 'todo'` global (verificar limpio sólo en componentes nuevos).
- RULE-global-001 (DoD C1–C6): genérico/sin `any`/`cn()`+CVA/sin código muerto/sin `console.*`.
- RULE-global-003 (no tocar lo entregado): no reconstruir átomos de JOR-006; reusarlos.
- DET-18 (draft aprobado): `draft_approved: true, draft_version: 1`.
- DET-30 (rama de ticket): trabajar en `epic/jormat-v1` (no protegida), no en main/develop.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| JOR-006 (átomos) | internal | Sheet/Dialog/Badge/Button/Select/Input/DropdownMenu/Card | Cerrado y entregado — sin riesgo |
| `@tanstack/react-table` | external | v8.21.3, ya instalado (JOR-002) | Sin riesgo; no se agrega dep nueva |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| DataTable acoplado a un dominio (no genérico) | medium | alto (organismo inútil para FASE B) | API `columns`/`data` + estados por prop; test con dos shapes (`User`/`Product`) |
| Sticky col colisiona z-index sidebar/overlay | low | medio (visual roto) | `z-10` table-scoped + `bg-card`/`bg-muted`; story con scroll horizontal |
| Interacción Radix flaky en jsdom | medium | bajo (test falso-rojo) | portales en `play()` browser; jsdom sólo lógica pura |
| Mutation survivors en lógica de sorting/paginación | medium | bajo (warn-first) | S4 resuelve: critical→hardening, light→backlog must |

## Open questions

Ninguna abierta. Decisiones de token/z-index/variantes/genérico resueltas contra el codebase real (intake-explore + draft) y documentadas en Decisions.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: DataTable genérico con specs explícitas, no heurísticas
- **Contexto**: el organismo se reusa en N vistas de FASE B con shapes de datos distintos.
- **Drivers**: anti-patrón histórico T-010 C2 (componente "agnóstico" acoplado a nombres de campo); DET-31/C1.
- **Opcion elegida**: `DataTable<TData,TValue>` con `columns: ColumnDef[]` + `data` + estados (loading/empty/error) y acciones por prop/render.
- **Alternativas**: tabla con detección por nombre de campo (`if name.includes('count')`) — descartada (acopla, frágil).
- **Consecuencias**: API un poco más verbosa para el consumidor, a cambio de reúso real y testabilidad.
- **Session**: design-feature.

### DEC-LOCAL-02: variante "brand" de KPICard usa token `accent`
- **Contexto**: no existe token `accent-brand` nombrado.
- **Drivers**: el verde de marca ya vive en `--accent`/`--accent-foreground`.
- **Opcion elegida**: variante `brand` → `accent`; resto `success/warning/info/neutral`.
- **Alternativas**: crear token `accent-brand` nuevo — descartado (fuera de alcance, JOR-003 es la fuente de tokens).
- **Consecuencias**: paridad con Badge; sin tocar el design system entregado.
- **Session**: design-feature.

### DEC-LOCAL-03: FilterBar children-as-controlled (no `value`/`onChange` único)
- **Contexto**: el spec inicial proponía una API `value`/`onChange` única para FilterBar; al implementar, los filtros son heterogéneos (search, selects, ranges).
- **Drivers**: un único `value`/`onChange` obligaría a un shape de estado rígido; los consumidores de FASE B tienen filtros distintos por vista.
- **Opción elegida**: los controles van como `children` (cada uno controlado por el consumidor); `FilterBar` aporta el layout responsive (inline/drawer), los chips de activos (`activeFilters`/`onRemoveFilter`) y "Limpiar" (`onClear`).
- **Alternativas**: `value`/`onChange` genérico — descartado (acopla el shape de estado, menos flexible).
- **Consecuencias**: API más flexible y desacoplada; el estado de filtros vive en la vista. Registrada en S2 (review aislado detectó la divergencia doc↔código).
- **Session**: S2.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..05 pasan (sorting asc+desc/paginación/toggle/sticky, FilterBar limpiar/drawer/chips, KPICard variantes/tendencia, StatGrid/TwoColumn responsive, PageLayout título/acciones) — verificado por reviewer aislado exhaustivo (S4.GATE).
- [x] **Tests**: 190/190 jsdom (35 archivos) + 97/97 Storybook browser, 100% verde.
- [x] **Rules**: RULE-frontend-001/002, RULE-global-001/003 respetadas (genérico sin `any`, carpeta-por-componente, átomos JOR-006 reusados no reconstruidos).
- [x] **Integration**: suite completa sin regresión; átomos JOR-006 intactos.
- [x] **a11y**: aria-sort condicional + scope=col, drawer Sheet role=dialog + SheetDescription, aria-label en chips/botones, landmark aside, iconos aria-hidden; addon-a11y sin violaciones nuevas.
- [x] **Mutation**: `dkc-mutate` WP completo warn-first → 68.3% (151/221 killed); survivors triagados — hardening de gaps de lógica reales (+6 tests), className StringLiteral won't-fix documentado, sin críticos (veredicto reviewer exhaustivo).
- [x] **Commits**: DET-27 cumplido — 11 commits granulares feat/test/fix por session en `epic/jormat-v1` (más granular que el mínimo de 4; tabla `## Commits` del ticket).
