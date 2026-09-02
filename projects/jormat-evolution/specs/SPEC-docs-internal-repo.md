---
id: SPEC-docs-internal-repo
project: jormat-evolution
ticket: JOR-048
status: done
---

# Documentación interna del repo (estructura, patrones, guías dev/test, permisos)

# Documentación interna del repo (estructura, patrones, guías dev/test, permisos)

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy un dev nuevo que abre `jormat-evolution-mono` no tiene un mapa del código dentro del propio repo: el `README.md` está desactualizado (lista 5 módulos backend cuando hay 13), hay 3 `.md` sueltos (`coverage.md`, `database.md`) sin índice, y `docs/back`/`docs/front` están vacíos. La doc de investigación profunda vive en `jormat_docs/` (sibling), pero eso es el "por qué" arquitectónico, no el "cómo trabajo en este código". Este ticket crea un árbol `docs/` dentro del repo de código que describe la estructura real, los patrones de cada capa, cómo desarrollar, cómo testear (y el alcance real de los tests), y el modelo de permisos — todo co-locado con el código y enlazado desde un README por paquete.

**Decisiones criticas que necesitan tu OK** (resueltas en super autopilot con racional documentado):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Doc interna **separada** de `jormat_docs/`: describe el "qué/dónde/cómo del código", enlaza al KB externo para el "por qué" — no duplica | Evita doble fuente de verdad; el KB externo ya cubre arquitectura profunda |
| 2 | Consolidar los `.md` sueltos (`coverage.md`, `database.md`) **moviéndolos** a `docs/` con un índice, dejando el `README.md` raíz como puerta de entrada | Hoy están huérfanos; un índice los hace descubribles. Mover en commit `docs:` (git preserva historial) |
| 3 | Todo comando/path/módulo citado se **verifica contra el repo real** antes de cerrar (DET-13) | La doc desactualizada es peor que no tener doc; el `README` actual es el ejemplo a no repetir |

**Riesgos principales y como los mitigamos**:

- **Duplicar `jormat_docs/`** → la doc interna referencia el KB externo por sección y solo describe el estado del código; regla explícita en `docs/README.md`.
- **Doc que nace stale** (como el `README` actual) → gate de cierre cruza cada comando contra `run.sh`/`package.json` y cada path contra el filesystem (TC-1/TC-2/TC-3).
- **Drift con el `config.yaml` del DKC** (declara greenfield) → no se toca en este ticket; queda registrado en backlog B1 para un ticket `meta` dedicado.

**Que NO se hace en este ticket**:

- NO se actualiza el `config.yaml` del proyecto DKC (backlog B1).
- NO se modifica código, tests ni `jormat_docs/`.
- NO se crea infraestructura de docs-as-site (mkdocs/docusaurus) — markdown plano navegable por GitHub.

**Tamano estimado**: 4 sessions doc-only (tier T0), ~4-6h efectivas. La más sensible es S4 (consolida los `.md` sueltos + cierra coherencia de navegación).

**Como vas a saber que funciona**:

- Abro `docs/README.md` y desde ahí navego (links que resuelven) a estructura, backend, frontend, dev, testing, permisos.
- Abro `backend/jormat-api/README.md` y `front/jormat-front/README.md` y cada uno me orienta + apunta a `docs/`.
- Cada comando que la doc me dice ejecutar existe de verdad en `run.sh` o en el `package.json` del paquete.

---

## Purpose

Producir documentación interna, dev-facing, dentro de `jormat-evolution-mono`: un árbol `docs/` (índice + arquitectura/estructura + guías backend, frontend, desarrollo, testing, permisos) y un `README.md` por paquete que mapea a `docs/`. Describe el estado REAL del código (no el aspiracional), complementa —sin duplicar— el KB externo `jormat_docs/`, y sirve a 3 objetivos: informar lo construido, acelerar desarrollo nuevo, y explicar la estructura.

## Requirements

### REQ-01: Estructura del repo documentada

> **Que cambia**: un dev abre `docs/` y entiende el monorepo lógico (backend/front/shared/infra), el ciclo de un request (front → proxy → API → DB) y dónde vive cada cosa, sin leer el código.
> **Por que**: hoy el único mapa (`README.md` raíz) está desactualizado y no hay índice navegable.

El sistema MUST documentar la estructura real del monorepo en `docs/README.md` (índice) y `docs/architecture/` (overview de estructura, request lifecycle, estado de multi-tenancy/RLS, frontera con `jormat_docs/`).

**Actor**: dev
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: abre `docs/README.md`, ve el índice de toda la doc y navega a `docs/architecture/` que describe las 4 áreas (backend, front, shared, infra) tal como existen.

### REQ-02: Patrones y convenciones por capa

> **Que cambia**: el dev encuentra "cómo se escribe un módulo NestJS aquí", "cómo se estructura un componente React aquí", el patrón repository, la capa API tipada, forms RHF+Zod, estado UI vs servidor — con los archivos reales como ejemplo.
> **Por que**: los patrones viven hoy implícitos en el código y en decisions del KB DKC; un dev nuevo los reinventa o los rompe.

El sistema MUST documentar los patrones backend (`docs/back/`) y frontend (`docs/front/`): estructura de módulo, repository + aislamiento por `workspace_id`, errores uniformes, capa API tipada, forms, estado, citando archivos reales y las decisions DEC-001..007.

**Actor**: dev
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: lee `docs/back/` y `docs/front/`, y cada patrón referencia un archivo real del repo que lo ejemplifica.

### REQ-03: Guía de desarrollo

> **Que cambia**: el dev tiene un solo lugar (`docs/development.md`) con cómo levantar el entorno, los comandos de `run.sh`, y cómo agregar un módulo backend / una vista o componente front nuevos siguiendo los patrones.
> **Por que**: hoy el flujo está disperso entre `README` (parcial), `database.md` y `coverage.md`, sin guía de "cómo extiendo".

El sistema MUST documentar en `docs/development.md` el setup local (Docker + `run.sh`), las variables de entorno (nombres, sin secretos), y recetas de extensión (nuevo módulo backend, nueva vista/componente front).

**Actor**: dev
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: sigue `docs/development.md` para levantar el stack y los comandos citados existen en `run.sh`/`package.json`.

### REQ-04: Guía de testing y su alcance real

> **Que cambia**: el dev entiende qué se testea y cómo: Jest (backend, ~40 specs + e2e + Stryker), Vitest dual-project (front jsdom + Storybook), MSW, mutation testing, y cómo correr coverage — con el alcance real (qué está cubierto y qué no).
> **Por que**: el `config.yaml` declara "sin tests"; la realidad es ~130+ archivos de test. La doc debe reflejar el estado verdadero.

El sistema MUST documentar en `docs/testing.md` los frameworks por capa, comandos de ejecución (incluido coverage, consolidando `coverage.md`), convenciones de test (co-locación, MSW, stories) y el alcance/gaps reales.

**Actor**: dev
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: lee `docs/testing.md`, corre un comando de test citado y funciona; el alcance descrito coincide con los archivos `*.spec.ts`/`*.test.tsx` presentes.

### REQ-05: Modelo de permisos end-to-end

> **Que cambia**: el dev entiende la doble capa de autorización: rol plano legacy (`owner|member|internal-admin`) + RBAC granular por capabilities (`module.feature:action`), la cadena de guards backend (`AuthGuard`→`CapabilitiesHydrationGuard`→`CapabilitiesGuard`) y el gating UI front (`<Can>`/`<RouteGuard>`/`useCan`), con el `can()` espejado.
> **Por que**: permisos es transversal y fácil de romper; está repartido entre backend, front, migrations y seeds.

El sistema MUST documentar en `docs/permissions.md` el modelo RBAC completo (tablas, guards backend, gating front, `can()` con comodines, estado RLS dormante), citando archivos reales y DEC-001/DEC-006.

**Actor**: dev
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: lee `docs/permissions.md` y puede trazar una capability desde la tabla DB hasta el guard backend y el componente `<Can>` en el front.

### REQ-06: Navegabilidad y frontera con la doc externa

> **Que cambia**: cada paquete tiene un `README.md` que orienta y apunta a `docs/`; el índice declara explícitamente que esta doc NO duplica `jormat_docs/` y enlaza al KB externo para el "por qué".
> **Por que**: sin índice ni punteros, la doc se vuelve otro conjunto de archivos huérfanos.

El sistema MUST entregar READMEs por paquete (`backend/jormat-api/README.md`, `front/jormat-front/README.md`, `shared/README.md`) que mapeen a `docs/`, refrescar el `README.md` raíz como puerta de entrada, y declarar la frontera con `jormat_docs/`. Los links relativos MUST resolver.

**Actor**: dev
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: desde el `README.md` raíz y los READMEs por paquete llega a `docs/` sin links rotos; el índice explica la separación con `jormat_docs/`.

## Tasks

### Session 1 — Índice + arquitectura/estructura [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `docs/README.md`: índice de toda la doc + declaración de frontera con `jormat_docs/` (no duplica; enlaza por el "por qué") | REQ-01, REQ-06 | developer | — | docs/README.md | manual: links resuelven | git revert | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Crear `docs/architecture/structure.md`: monorepo lógico (backend/front/shared/infra), árbol real de carpetas, sin workspace tool | REQ-01 | developer | S1.T1 | docs/architecture/structure.md | manual: paths existen | git revert | DET-2, DET-4 | done | 1 |
| S1.T3 | Crear `docs/architecture/request-lifecycle.md`: front → `/api/proxy` → API (`/api`, guards, validation, filter) → Knex/PG; estado RLS dormante (frontera real = `WHERE workspace_id`) | REQ-01 | developer | S1.T1 | docs/architecture/request-lifecycle.md | manual: cruzar vs main.ts/repository.ts | git revert | DET-4, DET-5, DET-16 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T0) — persistir en `## Sessions`, validar links/paths, decidir continue | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Guía backend + testing backend [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `docs/back/README.md`: bootstrap (`main.ts`), `app.module.ts`, catálogo de los 14 módulos con su propósito, prefijo `/api`, Swagger, ValidationPipe, AllExceptionsFilter, ThrottlerGuard, security | REQ-02 | developer | S1.GATE | docs/back/README.md | manual: módulos existen | git revert | DET-2, DET-4, DET-11 | done | 2 |
| S2.T2 | Crear `docs/back/patterns.md`: estructura de módulo NestJS (module/controller/service/dto), patrón `Repository<T>` + aislamiento `workspace_id`, errores `{code,message}`, validación class-validator + zod, citar DEC-004/DEC-007 | REQ-02 | developer | S2.T1 | docs/back/patterns.md | manual: cruzar vs common/repository.ts | git revert | DET-2, DET-11, DET-16 | done | 2 |
| S2.T3 | Crear `docs/back/database.md` (consolidar/refactor del `database.md` raíz): migrations, seeds, knexfile, comandos `run.sh migrate/seed/db:reset`; `docs/back/testing.md`: Jest specs co-locadas, e2e (`jest.e2e.config.ts`, cuenta CIAM), Stryker | REQ-02, REQ-04 | developer | S2.T1 | docs/back/database.md, docs/back/testing.md | manual: comandos en package.json/run.sh | git revert | DET-2, DET-13 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T0) | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Guía frontend + testing frontend [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Crear `docs/front/README.md`: estructura Next App Router (grupo `(app)/`, route handlers `proxy`/`config`), MSAL, output standalone, mapa de carpetas (app/components/hooks/lib/services/stores/types) | REQ-02 | developer | S2.GATE | docs/front/README.md | manual: paths existen | git revert | DET-2, DET-4 | done | 3 |
| S3.T2 | Crear `docs/front/patterns.md`: organización de componente (RULE-frontend-001, barrel index), capa API tipada (`lib/api` + `services/api/<dominio>`, RULE-api-client-001), estado UI (Zustand) vs servidor (React Query), forms RHF+Zod, taxonomía sidebar/router (DEC-003) | REQ-02 | developer | S3.T1 | docs/front/patterns.md | manual: cruzar vs lib/api, RULEs | git revert | DET-2, DET-11, DET-16 | done | 3 |
| S3.T3 | Crear `docs/front/testing.md`: Vitest dual-project (jsdom + storybook), MSW, co-locación + stories (RULE-frontend-002), Stryker, comandos; DEC-005 framework testing | REQ-04 | developer | S3.T1 | docs/front/testing.md | manual: comandos en package.json | git revert | DET-2, DET-13 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T0) | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Transversales (dev/testing/permisos) + READMEs + cierre [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Crear `docs/development.md`: setup local (Docker + `run.sh`), env vars (nombres), recetas de extensión (nuevo módulo backend / nueva vista/componente front) | REQ-03 | developer | S3.GATE | docs/development.md | manual: comandos en run.sh | git revert | DET-2, DET-11 | done | 4 |
| S4.T2 | Crear `docs/testing.md` (índice transversal, consolida `coverage.md`): frameworks por capa, comandos de coverage, alcance real + gaps; remover `coverage.md` raíz dejando puntero | REQ-04 | developer | S3.GATE | docs/testing.md, coverage.md | manual: comandos reales | git revert | DET-2, DET-13, DET-16 | done | 4 |
| S4.T3 | Crear `docs/permissions.md`: RBAC dual-layer end-to-end (tablas, cadena de guards backend, gating UI front, `can()` comodines, RLS dormante), citar DEC-001/DEC-006 | REQ-05 | developer | S3.GATE | docs/permissions.md | manual: cruzar vs guards/can.ts | git revert | DET-2, DET-5, DET-11 | done | 4 |
| S4.T4 | READMEs por paquete (`backend/jormat-api/README.md`, `front/jormat-front/README.md`, `shared/README.md`) que mapean a `docs/`; refrescar `README.md` raíz como puerta de entrada + frontera con `jormat_docs/` | REQ-06 | developer | S4.T1, S4.T2, S4.T3 | backend/jormat-api/README.md, front/jormat-front/README.md, shared/README.md, README.md | manual: links resuelven | git revert | DET-2, DET-16 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T0) — TC-1/TC-2/TC-3 (comandos/paths/links), decisión de cierre | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4 | ticket | gate persistido + TCs ejecutados | (no aplica) | DET-13, DET-20, DET-23 | done | 4 |

## Constraints

- DET-4 (hechos vs inferencias): la doc describe el estado REAL verificado, no el aspiracional. El `config.yaml` stale es el contraejemplo.
- DET-13 (cierre con evidencia): cada comando/path/link citado se verifica contra el repo antes de cerrar.
- DET-16 (propagación): consolidar los `.md` sueltos en `docs/` y dejar punteros; registrar drift del `config.yaml` (B1).
- RULE-frontend-001 (organización de archivos de componente) — patrón a documentar fielmente.
- RULE-frontend-002 (convenciones test/story) — patrón a documentar.
- RULE-api-client-001 (services aceptan/propagan signal) — patrón de la capa API a documentar.
- RULE-global-001..004 (calidad, seguridad, no modificar base, consola limpia dev) — convenciones globales a reflejar.
- DEC-001 (tenant isolation/RLS), DEC-002 (contrato tipado front-back), DEC-003 (taxonomía sidebar/router), DEC-004 (validación backend), DEC-005 (framework testing), DEC-006 (modelo permisos), DEC-007 (storage local Nest) — fuente de verdad de los patrones documentados.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Doc duplica `jormat_docs/` | medium | doble fuente de verdad | Frontera explícita en `docs/README.md`; doc interna solo describe estado del código y enlaza al KB para el "por qué" |
| Doc nace stale (como el README actual) | medium | doc inútil | Gate S4: cruzar cada comando vs `run.sh`/`package.json` y cada path vs filesystem (TC-1/TC-2/TC-3) |
| Mover `coverage.md`/`database.md` rompe links externos | low | links rotos | Dejar puntero/stub en la ubicación vieja apuntando a `docs/` |

## Open questions

(ninguna — resueltas en intake/design; super autopilot resuelve las menores con racional documentado)

## Decisions

### DEC-LOCAL-01: Consolidar los `.md` sueltos en `docs/` con punteros
- **Contexto**: `coverage.md` y `database.md` viven sueltos en la raíz sin índice.
- **Drivers**: descubribilidad, una sola fuente de verdad, no romper referencias existentes.
- **Opcion elegida**: mover su contenido a `docs/` (testing.md / back/database.md) y dejar un puntero corto en la ubicación raíz; `README.md` raíz queda como puerta de entrada al índice.
- **Alternativas**: (a) dejarlos sueltos y solo enlazarlos — descartada: la raíz queda ruidosa y el índice incompleto; (b) borrarlos sin puntero — descartada: rompe links existentes.
- **Consecuencias**: raíz más limpia, índice completo; costo: un commit `docs:` que mueve archivos (git preserva historial).
- **Session**: 4

### DEC-LOCAL-02: Markdown plano navegable, sin docs-as-site
- **Contexto**: opción de montar mkdocs/docusaurus.
- **Drivers**: simplicidad, cero dependencias nuevas, navegable en GitHub.
- **Opcion elegida**: markdown plano con links relativos + READMEs por paquete.
- **Alternativas**: docs-as-site — descartada: agrega tooling/build sin necesidad clara hoy (YAGNI).
- **Consecuencias**: cero costo de mantenimiento de tooling; sin búsqueda/render avanzado (aceptable).
- **Session**: 1

## Technical reference

- Backend: `backend/jormat-api/src/{main.ts, app.module.ts, common/repository.ts, common/auth/can.ts, auth/*, permissions/*}`, `knexfile.ts`, `migrations/`, `seeds/`, `jest.config.ts`, `jest.e2e.config.ts`.
- Frontend: `front/jormat-front/src/{app, components, hooks, lib/api, services/api, stores, types}`, `vitest.config.ts`, `.storybook/`, `next.config`, `tailwind.config.js`.
- Raíz: `run.sh`, `docker-compose.yml(+.dev)`, `infra/db/init.sql`, `.env.example`, `README.md`, `coverage.md`, `database.md`.
- KB externo: `jormat_docs/` (~50 archivos) — referenciar, no duplicar.

## Acceptance checkpoints

- [ ] **Funcional**: `docs/README.md` indexa toda la doc; navegación resuelve
- [ ] **Estructura**: cada path/módulo citado existe en el repo (TC-2)
- [ ] **Comandos**: cada comando citado existe en `run.sh`/`package.json` (TC-1)
- [ ] **Links**: links relativos docs↔READMEs resuelven (TC-3)
- [ ] **Frontera**: doc no duplica `jormat_docs/`; declara la separación
- [ ] **Permisos**: RBAC dual-layer trazable end-to-end en `docs/permissions.md`

## Archiving

Archivar con `/dkc-archive-spec` si la doc interna se reemplaza por docs-as-site o se mueve fuera del repo.
