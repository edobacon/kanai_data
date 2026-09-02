---
id: SPEC-branches-view-multirepo-108
project: horadric
ticket: HOR-108
status: done
---

# Vista de ramas de repositorios del proyecto (multi-repo)

# Vista de ramas de repositorios del proyecto (multi-repo)

## Executive summary — lo que estas aprobando

> *Spec en estado `draft` — producto de un explore. No pasa a execute hasta que el dev decida activarlo a `implement`. Documenta qué se construiría y cómo.*

**Que se quiere**: una vista nueva en HC (`/p/:project/branches`, accesible desde el menú principal) que muestre las ramas git de un proyecto agrupadas por repositorio, soportando las tres topologías del ecosistema (1 git, monorepo, multi-repo). Por cada rama: cuál es la actual, si está en local y/o remoto (tracking + ahead/behind), y en qué ramas vive su último commit (contención). Más comparación de dos ramas elegibles dentro de un mismo repo. El análisis reveló que ~70% de la capa de datos ya existe en HC — esto es una **extensión**, no greenfield.

**Decisiones críticas que necesitan tu OK** (cerradas en draft + análisis):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | deckard **declara los repos** (roots del config); HC **lee el estado git vivo**. deckard-core no cambia | Respeta "el viewer refleja deckard, no inventa convenciones". El descubrimiento (`enumerateProjectRepos`) ya consume los roots |
| 2 | "Rama de origen" se reemplaza por **contención de commits** (`git branch -a --contains`) | git no registra la rama padre de forma confiable; la contención sí es git-nativa y sólida |
| 3 | Se **omiten ramas remote-only**; solo locales + su tracking remoto | Decisión del dev; acota el scope del `for-each-ref` |
| 4 | Extensión **aditiva** de `BranchInfo`/`AggregatedBranch` | El dropdown de commits (`CommitsTable`) ya los consume — no romper (DET-16) |

**Riesgos principales y como los mitigamos**:

- **Romper el dropdown de ramas del feature de commits** → extensión estrictamente aditiva + test de regresión sobre `CommitsTable` (S3.T4).
- **Latencia en multi-repo (up1 = 14 repos × varios comandos git)** → ejecución por repo en paralelo + `useETagPoll` para refresco; árbol arranca con root+actual expandidos (no carga todo el detalle de golpe).
- **Contención mal interpretada como "rama de origen"** → la UI rotula explícitamente "en: …" (dónde vive el trabajo), no "origen".

**Que NO se hace en este ticket**:

- **Ramas remote-only** (existen en `origin`, no localmente) — omitidas por decisión del dev.
- **Diff de archivos en la comparación** — backlog B2 (la comparación v1 da ahead/behind + lista de commits, sin diff por archivo).
- **Onboarding de jormat** a deckard (sin config.yaml) — backlog B1; la vista no lo cubre hasta entonces.
- **Persistir el estado expandido del árbol** entre sesiones — v1 arranca siempre root+actual.

**Tamaño estimado**: 3 sessions (~5-7h efectivas). La más riesgosa es S1 (capa de datos: tracking + ahead/behind/gone tiene casos borde) y S3 (UX del árbol en multi-repo).

**Como vas a saber que funciona**:

- Abro `/p/up1/branches` y veo los repos como grupos colapsables (root + workspaces + mods anidados), con root y el repo actual expandidos.
- Cada rama muestra badge local/remoto/tracking correcto y el chip "en: …" de contención.
- Elijo un repo, dos ramas, y veo "↑N ↓M" + la lista de commits que difieren.
- El selector de ramas del feature de commits sigue funcionando igual.

---

## Purpose

Extender la capa git de HC (`server/git/`) y añadir una vista (`src/views/BranchesView.vue`) que exponga el estado de ramas por repositorio para cualquier topología, leyendo git en runtime. deckard aporta el dato de qué repos existen (roots del `config.yaml`); HC resuelve y visualiza el estado vivo. Read-only, sin escritura en filesystem ni en git.

## Requirements

### REQ-01: Enumerar y agrupar ramas por repositorio (3 topologías)

> **Que cambia**: abres la vista de ramas y ves los repos del proyecto como grupos; en up1 aparecen root + cada workspace + los mods, en deckard un solo grupo.
> **Por que**: hoy las ramas solo existen como un dropdown plano del feature de commits, sin vista dedicada ni agrupación por repo.

El sistema MUST enumerar los repos git del proyecto vía `enumerateProjectRepos()` y agrupar las ramas por repo, soportando single-git, monorepo y multi-repo.

**Actor**: user (dev consumidor de HC)
**Layers**: backend (server/git, server/routes), frontend (views)

<details><summary>Scenarios de validacion</summary>

#### Scenario: proyecto multi-repo (up1)
- **GIVEN** up1 con 14 `.git` (root + workspaces + mods)
- **WHEN** se abre `/p/up1/branches`
- **THEN** se listan los 14 repos como grupos, con etiquetas (`root`, `object-manager`, `mods/curriculum-design`, …)

#### Scenario: proyecto single-git (deckard)
- **GIVEN** deckard con 1 `.git`
- **WHEN** se abre la vista
- **THEN** se muestra 1 solo grupo de repo

#### Scenario: repo sin .git
- **GIVEN** un path declarado que no es repo git
- **WHEN** se enumera
- **THEN** se omite sin error (comportamiento actual de `enumerateProjectRepos`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la vista en up1 y en deckard y ve la agrupación correcta por repo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | multi-repo | up1 (14 .git) | GET /branches | grupos por repo | 14 grupos |
| 2 | single-git | deckard | GET /branches | 1 grupo | 1 grupo `root` |

### REQ-02: Estado local/remoto/tracking por rama

> **Que cambia**: cada rama muestra si es solo local, si tiene remoto (tracked) y cuántos commits está adelante/atrás, o si su upstream desapareció (gone).
> **Por que**: hoy `listBranches` solo lista ramas locales sin información de remoto ni tracking.

El sistema MUST resolver, por cada rama local, su estado: `local-only` (sin upstream) | `tracked` (con upstream) + ahead/behind, y marcar `gone` si el upstream fue eliminado en el remoto.

**Actor**: user
**Layers**: backend (server/git/branches.ts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: rama tracked en sync
- **GIVEN** una rama con upstream `origin/X` sin divergencia
- **WHEN** se resuelve su estado
- **THEN** estado `tracked`, ahead 0, behind 0

#### Scenario: rama local-only
- **GIVEN** una rama sin upstream
- **WHEN** se resuelve
- **THEN** estado `local-only`

#### Scenario: upstream gone
- **GIVEN** una rama cuyo upstream fue borrado en remoto (track `[gone]`)
- **WHEN** se resuelve
- **THEN** estado `tracked` + flag `gone: true`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ve los badges `tracked ✓` / `local-only` / `⚠ gone` / `↑N ↓M` correctos en una rama conocida.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | tracked sync | upstream sin divergencia | resolver estado | tracked 0/0 | `{state:'tracked',ahead:0,behind:0}` |
| 2 | local-only | sin upstream | resolver | local-only | `{state:'local-only'}` |
| 3 | gone | track `[gone]` | resolver | gone | `{gone:true}` |

### REQ-03: Contención de commits ("en qué ramas vive el último commit")

> **Que cambia**: por cada rama ves un chip "en: develop, origin/develop" que indica dónde más vive su último commit.
> **Por que**: reemplaza "rama de origen" (que git no registra de forma confiable) por una señal sólida y git-nativa.

El sistema MUST resolver, por cada rama, qué otras ramas (locales y remotas) contienen su último commit, vía `git branch -a --contains <tip>`.

**Actor**: user
**Layers**: backend (server/git)

<details><summary>Scenarios de validacion</summary>

#### Scenario: rama ya mergeada a develop
- **GIVEN** una rama cuyo tip ya está en develop
- **WHEN** se calcula contención
- **THEN** la lista incluye `develop` (y `origin/develop` si aplica)

#### Scenario: rama divergente nueva
- **GIVEN** una rama con commits que no están en ninguna otra
- **WHEN** se calcula contención
- **THEN** la lista contiene solo la propia rama ("solo aquí")

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ve el chip "en: …" reflejando si una rama ya se propagó a develop.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | mergeada | tip en develop | branchContainment | incluye develop | `['develop','origin/develop']` |
| 2 | divergente | tip único | branchContainment | solo la rama | `[self]` |

### REQ-04: Rama actual destacada

El sistema MUST marcar visualmente la rama actual (`isCurrent`) de cada repo.

**Actor**: user · **Layers**: backend (ya existe `isCurrent`), frontend

### REQ-05: Navegación entre repos (árbol colapsable)

> **Que cambia**: navegas entre los repos de un proyecto multi-repo expandiendo/colapsando grupos; arranca con root y el repo actual abiertos.
> **Por que**: con 14 repos (up1) una lista plana es inmanejable; el árbol da navegación y contexto.

El sistema MUST presentar los repos como árbol colapsable; los grupos `root` y el repo actual MUST arrancar expandidos, el resto colapsados.

**Actor**: user · **Layers**: frontend (views, components)

<details><summary>Scenarios de validacion</summary>

#### Scenario: estado inicial en up1
- **GIVEN** up1 con 14 repos, repo actual `object-manager`
- **WHEN** se abre la vista
- **THEN** `root` y `object-manager` expandidos, el resto colapsados

</details>

### REQ-06: Comparar dos ramas dentro de un repo

> **Que cambia**: eliges un repo, dos ramas (A y B), y ves cuántos commits A está adelante/atrás de B y la lista de commits que difieren.
> **Por que**: requisito explícito del dev — poder comparar ramas escogiéndolas.

El sistema MUST permitir comparar dos ramas del mismo repo, devolviendo ahead/behind (`rev-list --left-right --count A...B`) y la lista de commits que difieren (`log B..A`). La comparación MUST ser intra-repo (no cross-repo).

**Actor**: user · **Layers**: backend (server/git, server/routes), frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: comparación con divergencia
- **GIVEN** rama A 3 adelante / 12 atrás de B en el mismo repo
- **WHEN** se compara A vs B
- **THEN** ahead 3, behind 12 + lista de 3 commits (B..A)

#### Scenario: ramas idénticas
- **GIVEN** A y B apuntan al mismo commit
- **WHEN** se compara
- **THEN** ahead 0, behind 0, lista vacía

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | divergencia | A 3↑ 12↓ B | compareBranches | counts + commits | `{ahead:3,behind:12,commits:[3]}` |
| 2 | idénticas | A==B | compareBranches | ceros | `{ahead:0,behind:0,commits:[]}` |

## Artifacts

Sin meta-specs en horadric — artefactos ad-hoc. Read-only sobre git.

### Funciones server (server/git/)
| Función | Archivo | Entrada | Salida | Nota |
|---------|---------|---------|--------|------|
| `listBranches` (extendida) | branches.ts | repoPath | `BranchInfo[]` + estado/tracking | aditivo: + `upstream`, `state`, `ahead`, `behind`, `gone` |
| `branchContainment` (nueva) | branches.ts | repoPath, sha | `string[]` (ramas que contienen el commit) | `git branch -a --contains` |
| `compareBranches` (nueva) | compare.ts | repoPath, a, b | `{ahead, behind, commits[] }` | `rev-list --left-right --count` + `log b..a` |

### Endpoints (server/routes/)
| Method | Path | Auth | Response | Errors |
|--------|------|------|----------|--------|
| GET | /api/projects/:project/branches | local | `{ repos: [{ name, path, branches: BranchInfoExt[] }], reason }` | 200 + reason si no-repo |
| GET | /api/projects/:project/compare?repo=&a=&b= | local | `{ ahead, behind, commits[] }` | 400 si refs inválidas |

### Componentes frontend (src/)
| Componente | Tipo | Reusa |
|------------|------|-------|
| BranchesView.vue | view (ruta `/p/:project/branches`) | HeaderBar, useETagPoll |
| RepoBranchGroup.vue | grupo colapsable | patrón de SpecSessionTree |
| BranchRow.vue | fila de rama | useTimeAgo |
| BranchStateBadge.vue | badge estado | FilterPill |
| BranchComparePanel.vue | comparación | (nuevo) |

## Tasks

> **DET-20 NO aplica a explore** — estas tasks son **prospectivas** (para activación a `implement`). El spec queda en `draft`. Numeración desde S1 (el ticket no tiene `### Session N` de ejecución).

### Session 1 — Capa de datos git (server/git) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Extender `listBranches` con upstream/tracking: estado `local-only`/`tracked` + ahead/behind/gone (for-each-ref) | REQ-02 | developer | — | server/git/branches.ts | vitest server/git/branches.test.ts | git revert | DET-2, DET-16 | pending | 1 |
| S1.T2 | Nueva `branchContainment(repoPath, sha)` con `git branch -a --contains` | REQ-03 | developer | — | server/git/branches.ts | vitest | git revert | DET-1, DET-2 | pending | 1 |
| S1.T3 | Nueva `compareBranches(repoPath, a, b)` con rev-list --left-right --count + log | REQ-06 | developer | — | server/git/compare.ts | vitest | git revert | DET-1, DET-2 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir, validar, decidir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Endpoints + API client [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Extender `GET /:project/branches` → payload en árbol por repo (estado + contención), no solo agregado | REQ-01 | developer | S1.GATE | server/routes/commits.ts | vitest integration | git revert | DET-2, DET-16 | pending | 2 |
| S2.T2 | Nuevo `GET /:project/compare?repo=&a=&b=` | REQ-06 | developer | S1.GATE | server/routes/commits.ts | vitest integration | git revert | DET-2 | pending | 2 |
| S2.T3 | API client tipado para árbol + compare | REQ-01 | developer | S2.T1, S2.T2 | src/api/client.ts | tsc + vitest | git revert | DET-2 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Frontend: vista + árbol + comparación [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `BranchesView.vue` + ruta `/p/:project/branches` + entrada en menú principal | REQ-01 | developer | S2.GATE | src/views/BranchesView.vue, src/router.ts, src/components/shell/HeaderBar.vue | smoke UI manual (up1) | git revert | DET-2, DET-16 | pending | 3 |
| S3.T2 | `RepoBranchGroup` (árbol colapsable, root+actual expandidos) + `BranchRow` + `BranchStateBadge` | REQ-04, REQ-05 | developer | S3.T1 | src/components/branches/ | vitest + smoke | git revert | DET-1, DET-16 | pending | 3 |
| S3.T3 | `BranchComparePanel` (selector repo + 2 ramas + ahead/behind + lista commits) | REQ-06 | developer | S3.T1 | src/components/branches/BranchComparePanel.vue | vitest + smoke | git revert | DET-1 | pending | 3 |
| S3.T4 | Regresión: dropdown de ramas de `CommitsTable` sigue funcionando | REQ-PRESERVE | reviewer | S3.T2 | src/components/commits/CommitsTable.vue | vitest + smoke | (no aplica) | DET-7, DET-16 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T3) | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | pending | 3 |

## Constraints

- **DET-16 (propagación)**: `BranchInfo`/`AggregatedBranch` son consumidos por `CommitsTable.vue` — toda extensión debe ser aditiva. S3.T4 valida la no-regresión.
- **RULE/feedback "el viewer refleja deckard"**: el dato de qué repos existen viene del config (deckard); HC solo lee estado git vivo. No introducir una convención de topología nueva en el viewer.
- **READ-ONLY** (config `critical_rules`): la vista nunca escribe en filesystem ni en git. Todos los comandos git son de lectura.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `enumerateProjectRepos` (server/deckard/monorepo.ts) | internal | Descubrimiento de repos por roots del config | Bajo — ya en producción para el feature de commits |
| git CLI | external | `for-each-ref`, `branch --contains`, `rev-list`, `log` | Bajo — ya se usa en server/git |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Extensión de tipos rompe el dropdown de commits | low | medium | Cambio aditivo + test de regresión S3.T4 (DET-16) |
| Latencia en up1 (14 repos × N comandos git) | medium | medium | Ejecución por repo en paralelo; árbol lazy (root+actual expandidos); useETagPoll |
| Contención malinterpretada como "rama de origen" | medium | low | UI rotula "en: …" (dónde vive), no "origen"; nota explícita |
| jormat sin config.yaml no aparece | low | low | Documentado (backlog B1); fuera de scope v1 |

## Open questions

(ninguna — las 3 del draft fueron resueltas: árbol root+actual, omitir remote-only, acceso desde menú principal)

## Decisions

### DEC-LOCAL-01: Contención de commits en vez de "rama de origen"
- **Contexto**: el dev pidió "desde qué rama se generó"; git no registra la rama padre de forma confiable.
- **Drivers**: reflog solo existe para ramas creadas localmente y no expiradas; merge-base devuelve commit no rama; las ramas traídas del remoto (`[gone]`) no tienen reflog de creación.
- **Opción elegida**: `git branch -a --contains <tip>` → qué ramas contienen el último commit (reframe del dev).
- **Alternativas**: parent branch por reflog (no confiable), merge-base heurístico (ambiguo) — descartadas.
- **Consecuencias**: gana solidez y exactitud; pierde la semántica literal "origen" (responde "dónde vive el trabajo").
- **Session**: intake/design.

### DEC-LOCAL-02: deckard declara repos (config roots), HC lee git
- **Contexto**: ¿quién modela la topología git?
- **Drivers**: directiva del dev + regla "el viewer refleja deckard"; `enumerateProjectRepos` ya consume los roots del config.
- **Opción elegida**: deckard aporta los roots (config), HC descubre `.git` y lee estado vivo. deckard-core sin cambios.
- **Alternativas**: enumeración explícita en config (drift con up1), discovery puro en HC (violaría la regla del viewer) — descartadas.
- **Consecuencias**: cero cambios en deckard-core; la vista es read-only de estado runtime.
- **Session**: intake/design.

### DEC-LOCAL-03: omitir ramas remote-only en v1
- **Contexto**: ¿mostrar ramas que existen solo en `origin`?
- **Drivers**: decisión del dev; acota el alcance del `for-each-ref refs/remotes` a resolver upstreams.
- **Opción elegida**: solo locales + su tracking remoto.
- **Consecuencias**: simplifica v1; ramas remote-only quedan fuera (posible backlog futuro).
- **Session**: design-draft (open question resuelta).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..06 pasan
- [ ] **Tests**: vitest server/git (branches, compare) + smoke UI en up1/deckard
- [ ] **Rules**: extensión aditiva verificada (DET-16); read-only respetado
- [ ] **Integration**: dropdown de ramas de CommitsTable sin regresión (S3.T4)
- [ ] **Docs**: ruta nueva documentada; nota de contención en la UI

## Technical reference

- Descubrimiento: `enumerateProjectRepos(rootPath, config)` — `server/deckard/monorepo.ts` (root + workspaces directos + scan depth-1 de `mods/` + additional_paths; dedup por path absoluto).
- Estado de rama: `git for-each-ref --format='%(refname:short) %(upstream:short) %(upstream:track)' refs/heads` → upstream + `[gone]`/`[ahead N]`/`[behind N]`.
- Contención: `git branch -a --contains <sha>`.
- Comparación: `git rev-list --left-right --count A...B` (ahead/behind) + `git log --oneline B..A` (commits que difieren).
- Antecedente: endpoint `GET /:project/branches` en `server/routes/commits.ts:177` (hoy alimenta el dropdown de `CommitsTable.vue`).
