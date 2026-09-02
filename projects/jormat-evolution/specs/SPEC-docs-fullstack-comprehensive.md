---
id: SPEC-docs-fullstack-comprehensive
project: jormat-evolution
ticket: JOR-051
status: done
---

# Documentación interna exhaustiva fullstack (LLM-friendly)

# Documentación interna exhaustiva fullstack (LLM-friendly)

## Executive summary — lo que estas aprobando

**Que se quiere**: la doc de JOR-048 es un buen esqueleto pero escueta. Este ticket la lleva a documentación fullstack completa, en rol de "developer documentador": **enriquece en sitio** los 11 archivos existentes (frontmatter LLM-friendly + tags + resumen ejecutivo + ejemplos + diagramas) y **agrega ~13 archivos nuevos** que cubren los huecos: auth end-to-end, modelo de datos, catálogo de API, navegación, flujos de las 12 vistas, recetas operativas (super admin / usuarios / permisos / crear ruta / crear endpoint) y deployment (Docker/ACR/CI/ArgoCD). Todo con diagramas Mermaid donde aclaran.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Enriquecer en sitio** el `docs/` de JOR-048 + agregar nuevos (no reescribir) | Tu elección; preserva el trabajo previo y mantiene URLs/links estables |
| 2 | **Convención LLM-friendly uniforme**: cada `.md` abre con frontmatter (`title/type/audience/tags/source_files/related/status/updated`) + `## Resumen ejecutivo` | Hace la doc consumible por LLMs y escaneable por humanos; es un requisito explícito tuyo |
| 3 | **Diagramas en Mermaid** embebido (no imágenes) | Renderiza en GitHub/IDEs, versionable en texto, sin assets binarios |
| 4 | **Estructura por scope**: `architecture/`, `api/`, `back/`, `front/`, `guides/` (recetas), + transversales raíz | Divide "lo que se tiene" por scope como pediste; las recetas operativas viven juntas en `guides/` |
| 5 | **teach_policy: skip** (sin teach-intake/close) | Ticket 100% documentación: el deliverable ES el material educativo. Si prefieres teach, dilo y lo activo |
| 6 | Estado real con honestidad (DET-4): stubs (items/reportes/ventas/compras/pagos backend en memoria; varias acciones UI = `toast.info`) se marcan como tales | Doc que miente es peor que no tener doc |

**Riesgos principales y como los mitigamos**:
- **Doc que nace stale / inventada** → gate S5 cruza cada comando vs `run.sh`/`package.json`, cada path vs filesystem, cada endpoint vs controllers, cada link, y valida sintaxis Mermaid (TC-1..5).
- **Duplicar `jormat_docs/`** → la doc interna describe el código y enlaza al KB externo para el "por qué".
- **Volumen (24 archivos)** → partición en 5 sessions por scope; cada session deja la doc consistente.

**Que NO se hace**:
- NO se toca código, tests, seeds ni `jormat_docs/`.
- NO docs-as-site (mkdocs/docusaurus) — markdown plano navegable.
- NO se documenta funcionalidad inexistente: los stubs se etiquetan, no se describen como completos.

**Tamano estimado**: 5 sessions doc-only (T0), ~8-12h efectivas. La más densa es S3 (flujos de 12 vistas) y la más sensible S5 (deploy + verificación global + cierre).

**Como vas a saber que funciona**:
- Abro cualquier `.md` y tiene frontmatter + resumen ejecutivo + ejemplos; los diagramas renderizan.
- `docs/guides/create-super-admin.md` me deja crear el internal-admin siguiendo los pasos reales.
- `docs/api/README.md` lista cada endpoint con su capability; coincide con los controllers.
- `docs/front/views.md` describe cada vista (qué datos, qué caps, qué hace) y `docs/front/navigation.md` me dice cómo agregar una al menú.
- `docs/deployment.md` describe el camino real build→ACR→deploy→ArgoCD.

---

## Purpose

Elevar la documentación interna de `jormat-evolution-mono` de esqueleto a referencia fullstack exhaustiva y LLM-friendly: enriquecer lo existente y cubrir auth e2e, data model, API, navegación, flujos de vistas, recetas operativas y deployment, con diagramas. Audiencia: developers (humanos y LLM) que construyen y operan el proyecto.

## Requirements

### REQ-01: Convención LLM-friendly aplicada a toda la doc

> **Que cambia**: cada archivo de `docs/` (existente y nuevo) abre con frontmatter (title, type, audience, tags, source_files, related, status, updated) y un `## Resumen ejecutivo` de 2-4 líneas; las secciones densas llevan ejemplos.
> **Por que**: hoy los `.md` no tienen frontmatter ni resúmenes — un LLM (o un dev apurado) no puede orientarse rápido ni filtrar por tags.

El sistema MUST aplicar a TODOS los `.md` de `docs/` un frontmatter canónico + resumen ejecutivo + (donde aplique) ejemplos. La convención MUST documentarse en `docs/CONVENTIONS.md`.

**Actor**: dev / LLM · **Layers**: docs
#### Acceptance
Abro cualquier doc y tiene frontmatter con tags + resumen ejecutivo; `docs/CONVENTIONS.md` define el schema.

### REQ-02: Arquitectura completa con diagramas

> **Que cambia**: además de estructura y request-lifecycle (enriquecidos con diagramas), hay `auth-flow.md` (auth e2e front+back con diagrama de secuencia) y `data-model.md` (ERD de tablas tenant + RBAC).
> **Por que**: el auth y el modelo de datos están hoy dispersos en fragmentos; faltan diagramas que los hagan entendibles de un vistazo.

El sistema MUST documentar la arquitectura en `docs/architecture/`: `structure.md` + `request-lifecycle.md` (enriquecidos), `auth-flow.md` (NUEVO) y `data-model.md` (NUEVO), con diagramas Mermaid.

**Actor**: dev · **Layers**: docs
#### Acceptance
`docs/architecture/auth-flow.md` traza el login MSAL → proxy → JWKS → auto-provision → admin override → session timeout con un diagrama; `data-model.md` tiene el ERD.

### REQ-03: Catálogo de API

> **Que cambia**: `docs/api/README.md` lista cada endpoint (método, path `/api/...`, guards, capability requerida, DTO, respuesta, errores) agrupado por dominio.
> **Por que**: hoy no hay un índice de la superficie HTTP; un dev no sabe qué capability protege qué endpoint sin leer cada controller.

El sistema MUST documentar en `docs/api/README.md` el catálogo completo de endpoints (~35) con su contrato y autorización, verificado contra los controllers.

**Actor**: dev · **Layers**: docs
#### Acceptance
Cada endpoint de los controllers aparece con su capability; no hay endpoints inventados (TC-3).

### REQ-04: Guía backend enriquecida + receta de extensión

> **Que cambia**: `back/{README,patterns,database,testing}` ganan frontmatter/ejemplos; una guía `guides/add-backend-endpoint.md` da la receta paso a paso (módulo → repository+workspace_id → controller con trío de guards → @RequireCapability → sembrar capability → registrar en app.module).
> **Por que**: la doc actual describe patrones pero no la receta accionable de "agregar un endpoint protegido".

El sistema MUST enriquecer `docs/back/*` y agregar `docs/guides/add-backend-endpoint.md` con la receta completa (incluye proteger por capability), con ejemplos de código reales.

**Actor**: dev · **Layers**: docs
#### Acceptance
Siguiendo la guía, un dev crea un endpoint protegido por capability; los ejemplos compilan conceptualmente contra los patrones reales.

### REQ-05: Frontend — navegación, flujos de vistas y receta de ruta

> **Que cambia**: `front/*` enriquecidos; `navigation.md` (NUEVO — `nav-data.ts`, Sidebar/NavGroup/NavItem, filtrado por capability); `views.md` (NUEVO — las 12 vistas: propósito, componentes, hooks/datos, capabilities, interacciones, patrón UI + diagrama de rutas); guía `guides/add-frontend-route.md`.
> **Por que**: faltan los flujos de las vistas (qué datos cubren, cómo se usan) y cómo se arma el menú/ruta — lo pediste explícitamente.

El sistema MUST documentar los flujos de las 12 vistas, la navegación (`nav-data.ts`) y la receta de crear una ruta protegida por capability.

**Actor**: dev · **Layers**: docs
#### Acceptance
`docs/front/views.md` cubre las 12 vistas con datos+capabilities; `add-frontend-route.md` incluye el paso de `nav-data.ts` y `<RouteGuard>`.

### REQ-06: Permisos end-to-end + recetas operativas

> **Que cambia**: `permissions.md` enriquecido (diagrama de la cadena de guards) + `guides/`: `create-super-admin.md`, `manage-users.md`, `manage-permissions.md` (crear capability/rol, asignar, usar en front y back).
> **Por que**: pediste "cómo crear super admin / usuarios / permisos / cómo se usan" — son recetas operativas que hoy no existen.

El sistema MUST documentar el RBAC end-to-end y las recetas operativas de super admin, usuarios y permisos, verificadas contra seeds y endpoints reales.

**Actor**: dev / admin · **Layers**: docs
#### Acceptance
`create-super-admin.md` describe el camino real (seeds 02/03/09/10 + `ENABLE_DEV_ADMIN_SEED` o internal-admin en prod); `manage-permissions.md` cubre crear y usar capabilities en ambas capas.

### REQ-07: Deployment

> **Que cambia**: `docs/deployment.md` (NUEVO) cubre Docker (prod/dev), `run.sh build --push`, ACR (`syscode.azurecr.io`), GitHub Actions (CI + deploy), ArgoCD/K8s, migraciones manuales y variables de entorno, con un diagrama del flujo build→push→deploy.
> **Por que**: pediste instrucciones de despliegue; hoy no hay ninguna.

El sistema MUST documentar el proceso de deployment real en `docs/deployment.md` con su diagrama de flujo.

**Actor**: dev / ops · **Layers**: docs
#### Acceptance
`deployment.md` describe el camino completo (build local/CI → ACR → trigger-deploy → ArgoCD → K8s) y dónde corren las migraciones.

### REQ-08: Diagramas Mermaid donde aclaran

> **Que cambia**: diagramas embebidos: secuencia de auth, request lifecycle, ERD (tenant+RBAC), cadena de guards, flujo de deploy, árbol de navegación.
> **Por que**: pediste diagramas/gráficas md para explicar.

El sistema MUST incluir diagramas Mermaid con sintaxis válida en los puntos donde un diagrama aclara más que el texto.

**Actor**: dev · **Layers**: docs
#### Acceptance
Los 6 diagramas clave existen y parsean como Mermaid válido (TC-5).

## Artifacts — árbol de documentación objetivo

Leyenda: **[E]** enriquecer en sitio (JOR-048) · **[N]** nuevo.

```
docs/
├── README.md                          [E] índice maestro: frontmatter, mapa de toda la doc, frontera jormat_docs, diagrama del árbol
├── CONVENTIONS.md                     [N] convención LLM-friendly: schema de frontmatter + tags + resumen ejecutivo (REQ-01)
├── architecture/
│   ├── structure.md                   [E] + frontmatter + diagrama de componentes del monorepo
│   ├── request-lifecycle.md           [E] + diagrama de secuencia (browser→proxy→guards→service→DB)
│   ├── auth-flow.md                   [N] auth e2e front+back + diagrama de secuencia (REQ-02)
│   └── data-model.md                  [N] ERD tablas tenant + RBAC (mermaid erDiagram) (REQ-02)
├── api/
│   └── README.md                      [N] catálogo de ~35 endpoints (método/path/guards/capability/DTO/respuesta/errores) (REQ-03)
├── back/
│   ├── README.md                      [E] + frontmatter + resumen
│   ├── patterns.md                    [E] + ejemplos de código reales
│   ├── database.md                    [E] + frontmatter
│   └── testing.md                     [E] + frontmatter
├── front/
│   ├── README.md                      [E] + frontmatter + resumen
│   ├── patterns.md                    [E] + ejemplos
│   ├── testing.md                     [E] + frontmatter
│   ├── navigation.md                  [N] nav-data.ts, Sidebar/NavGroup/NavItem, filtrado por capability (REQ-05)
│   └── views.md                       [N] flujos de las 12 vistas + diagrama de rutas/patrones (REQ-05)
├── guides/
│   ├── add-backend-endpoint.md        [N] receta módulo/endpoint + proteger por capability (REQ-04)
│   ├── add-frontend-route.md          [N] receta page+composite+nav-data+RouteGuard+hooks/services (REQ-05)
│   ├── create-super-admin.md          [N] internal-admin via seeds + ENABLE_DEV_ADMIN_SEED / prod (REQ-06)
│   ├── manage-users.md                [N] crear/editar/desactivar/asignar roles (front + endpoints) (REQ-06)
│   └── manage-permissions.md          [N] crear capability/rol, asignar, USAR en front (<Can>/useCan) y back (@RequireCapability) (REQ-06)
├── development.md                     [E] + frontmatter + link a guías
├── testing.md                         [E] + frontmatter
├── permissions.md                     [E] + diagrama de la cadena de guards (REQ-06)
└── deployment.md                      [N] Docker/ACR/GitHub Actions/ArgoCD/K8s + flujo (REQ-07)
```

READMEs por paquete (`backend/jormat-api`, `front/jormat-front`, `shared`) + `README.md` raíz: actualizar enlaces para incluir las secciones nuevas (api, guides, deployment, architecture/auth-flow+data-model, front/navigation+views).

### Diagramas Mermaid (REQ-08)
| Diagrama | Archivo | Tipo |
|----------|---------|------|
| Secuencia de auth e2e | architecture/auth-flow.md | sequenceDiagram |
| Ciclo de request | architecture/request-lifecycle.md | sequenceDiagram / flowchart |
| ERD tenant + RBAC | architecture/data-model.md | erDiagram |
| Cadena de guards | permissions.md | flowchart |
| Flujo de deploy | deployment.md | flowchart |
| Árbol de navegación | front/navigation.md | flowchart / tree |

## Tasks

### Session 1 — Convención LLM-friendly + índice + arquitectura [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `docs/CONVENTIONS.md` (schema frontmatter + tags + resumen ejecutivo) y aplicar frontmatter+resumen al `docs/README.md` (índice maestro + mapa + diagrama del árbol) | REQ-01 | developer | — | docs/CONVENTIONS.md, docs/README.md | manual: frontmatter válido, links resuelven | git revert | DET-1, DET-2 | done | 1 |
| S1.T2 | Enriquecer `architecture/structure.md` + `request-lifecycle.md` (frontmatter, resumen, diagramas Mermaid) | REQ-02, REQ-08 | developer | S1.T1 | docs/architecture/structure.md, docs/architecture/request-lifecycle.md | manual: mermaid válido, paths existen | git revert | DET-2, DET-4 | done | 1 |
| S1.T3 | Crear `architecture/auth-flow.md` (auth e2e front+back + sequenceDiagram) | REQ-02, REQ-08 | developer | S1.T1 | docs/architecture/auth-flow.md | manual: cruzar vs auth.guard/MsalProviderWrapper/auth.store | git revert | DET-4, DET-5 | done | 1 |
| S1.T4 | Crear `architecture/data-model.md` (ERD tenant + RBAC, erDiagram) | REQ-02, REQ-08 | developer | S1.T1 | docs/architecture/data-model.md | manual: cruzar vs migrations | git revert | DET-2, DET-4 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T0) | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — API + backend + receta endpoint [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `docs/api/README.md` (catálogo ~35 endpoints: método/path/guards/capability/DTO/respuesta/errores) | REQ-03 | developer | S1.GATE | docs/api/README.md | manual: grep controllers — sin inventados | git revert | DET-2, DET-4 | done | 2 |
| S2.T2 | Enriquecer `back/{README,patterns,database,testing}.md` (frontmatter + resumen + ejemplos de código reales) | REQ-04, REQ-01 | developer | S2.T1 | docs/back/README.md, docs/back/patterns.md, docs/back/database.md, docs/back/testing.md | manual: ejemplos vs código real | git revert | DET-2, DET-11 | done | 2 |
| S2.T3 | Crear `guides/add-backend-endpoint.md` (receta módulo/endpoint + proteger por capability + sembrar) | REQ-04 | developer | S2.T1 | docs/guides/add-backend-endpoint.md | manual: vs patrón trío real | git revert | DET-2, DET-16 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T0) | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Frontend: navegación + flujos de vistas + receta ruta [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Enriquecer `front/{README,patterns,testing}.md` (frontmatter + resumen + ejemplos) | REQ-05, REQ-01 | developer | S2.GATE | docs/front/README.md, docs/front/patterns.md, docs/front/testing.md | manual: ejemplos vs código | git revert | DET-2, DET-11 | done | 3 |
| S3.T2 | Crear `front/navigation.md` (nav-data.ts, Sidebar/NavGroup/NavItem, filtrado por capability + diagrama) | REQ-05, REQ-08 | developer | S3.T1 | docs/front/navigation.md | manual: cruzar vs nav-data.ts | git revert | DET-2, DET-4 | done | 3 |
| S3.T3 | Crear `front/views.md` (flujos de las 12 vistas: propósito/componentes/hooks-datos/capabilities/interacciones/patrón + diagrama de rutas) | REQ-05 | developer | S3.T1 | docs/front/views.md | manual: cruzar vs pages/composites | git revert | DET-2, DET-4 | done | 3 |
| S3.T4 | Crear `guides/add-frontend-route.md` (page+composite+nav-data+RouteGuard+hook+service) | REQ-05 | developer | S3.T2, S3.T3 | docs/guides/add-frontend-route.md | manual: vs patrón real | git revert | DET-2, DET-16 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T0) | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Guías operativas (super admin / usuarios / permisos) [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Crear `guides/create-super-admin.md` (internal-admin: seeds 02/03/09/10 + ENABLE_DEV_ADMIN_SEED; nota prod) | REQ-06 | developer | S3.GATE | docs/guides/create-super-admin.md | manual: cruzar vs seeds | git revert | DET-2, DET-4 | done | 4 |
| S4.T2 | Crear `guides/manage-users.md` (crear/editar/desactivar/asignar roles vía UI + endpoints) | REQ-06 | developer | S3.GATE | docs/guides/manage-users.md | manual: cruzar vs users-admin controller + UsersView | git revert | DET-2, DET-4 | done | 4 |
| S4.T3 | Crear `guides/manage-permissions.md` (crear capability/rol, asignar, USAR en front <Can>/useCan y back @RequireCapability) | REQ-06 | developer | S3.GATE | docs/guides/manage-permissions.md | manual: cruzar vs roles controller + can.ts | git revert | DET-2, DET-16 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier T0) | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 4 |

### Session 5 — Transversales + deploy + cierre [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Enriquecer `development.md` + `testing.md` (frontmatter, resumen, links a guías) | REQ-01 | developer | S4.GATE | docs/development.md, docs/testing.md | manual: comandos reales | git revert | DET-2 | done | 5 |
| S5.T2 | Enriquecer `permissions.md` (frontmatter + diagrama de la cadena de guards) | REQ-06, REQ-08 | developer | S4.GATE | docs/permissions.md | manual: mermaid válido vs guards | git revert | DET-2, DET-5 | done | 5 |
| S5.T3 | Crear `deployment.md` (Docker prod/dev, run.sh build/push, ACR, GitHub Actions CI/deploy, ArgoCD/K8s, migraciones + flujo Mermaid) | REQ-07, REQ-08 | developer | S4.GATE | docs/deployment.md | manual: cruzar vs run.sh/.github/workflows/compose | git revert | DET-2, DET-4 | done | 5 |
| S5.T4 | Actualizar índice `docs/README.md` + READMEs por paquete + `README.md` raíz con las secciones nuevas | REQ-01 | developer | S5.T1, S5.T2, S5.T3 | docs/README.md, backend/jormat-api/README.md, front/jormat-front/README.md, shared/README.md, README.md | manual: links resuelven | git revert | DET-2, DET-16 | done | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier T0) — TC-1..5 (comandos/paths/endpoints/links/mermaid) + cierre | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | ticket | gate persistido + TCs ejecutados | (no aplica) | DET-13, DET-20, DET-23 | done | 5 |

## Constraints

- DET-4 (hechos vs inferencias): describir el estado REAL; marcar stubs explícitamente. El gap de `SessionTimeoutModal` (no se halló montaje) se documenta como gap, no como hecho.
- DET-13 (cierre con evidencia): comandos/paths/endpoints/links/diagramas verificados antes de cerrar.
- DET-16 (propagación): el índice y los READMEs por paquete enlazan TODO lo nuevo.
- RULE-frontend-001/002, RULE-api-client-001, RULE-global-001..004 — patrones a reflejar fielmente.
- SPEC-docs-internal-repo (JOR-048): se extiende (depends_on), no se archiva.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Endpoint/capability documentado mal | medium | doc engañosa en seguridad | TC-3: grep de cada endpoint vs controllers + capability vs @RequireCapability |
| Diagrama Mermaid roto | medium | no renderiza | TC-5: validar sintaxis de cada fence mermaid |
| Doc describe stub como funcional | medium | expectativa falsa | DET-4: etiqueta de stub en cada caso (verificado en exploración) |

## Open questions

(resueltas) — Base branch del execute: **encadenar sobre `JOR-048-internal-docs`** (decisión en super autopilot: la doc de JOR-048 se enriquece, conviene partir de ahí para que el diff y el árbol sean coherentes).

## Decisions

### DEC-LOCAL-01: Convención LLM-friendly documentada en docs/CONVENTIONS.md
- **Contexto**: el dev pidió frontmatter + tags + resúmenes ejecutivos.
- **Opcion elegida**: schema único de frontmatter para todos los `.md`, documentado en `docs/CONVENTIONS.md`, aplicado en S1 y propagado.
- **Alternativas**: frontmatter ad-hoc por archivo (descartado: inconsistente, no auditable).
- **Consecuencias**: doc uniforme y filtrable por tags; costo: pasar por todos los archivos.
- **Session**: 1

### DEC-LOCAL-02: Recetas operativas en docs/guides/
- **Contexto**: "cómo crear super admin / usuarios / permisos / rutas / endpoints".
- **Opcion elegida**: carpeta `guides/` con un archivo por receta (how-to accionable), separada de la referencia (`back/`, `front/`, `api/`).
- **Alternativas**: mezclar recetas en los README de cada scope (descartado: las recetas cruzan scopes front+back).
- **Session**: 2

## Technical reference
- Front: `src/components/shell/nav/nav-data.ts`, `src/app/(app)/**`, `src/components/**`, `src/hooks/**`, `src/services/api/**`, `src/stores/**`, `src/auth/**`, `src/components/auth/**`, `src/components/session/**`.
- Back: `src/**/*.controller.ts`, `src/auth/auth.guard.ts`, `src/common/auth/**`, `src/permissions/**`, `migrations/**`, `seeds/**`.
- Infra: `docker-compose.yml(+.dev)`, `run.sh`, `.github/workflows/*`, `infra/db/init.sql`, Dockerfiles.
- KB externo: `jormat_docs/` (referenciar).

## Acceptance checkpoints
- [ ] **LLM-friendly**: todos los `.md` con frontmatter + resumen ejecutivo; `docs/CONVENTIONS.md` define el schema
- [ ] **Cobertura**: auth-flow, data-model, api, navigation, views, deployment + 5 guías existen y cubren lo pedido
- [ ] **Diagramas**: 6 diagramas Mermaid válidos
- [ ] **Exactitud**: endpoints/paths/comandos verificados (TC-1/2/3/4/5)
- [ ] **Navegación**: índice + READMEs enlazan todo; sin links rotos

## Archiving
Archivar con `/dkc-archive-spec` si se migra a docs-as-site o se externaliza.
