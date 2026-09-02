---
id: SPEC-migration-tdd
project: pehuen
ticket: PEH-015
status: done
---

# Migracion TDD legacy → nuxt + actualizacion content/docs + validacion contra legacy

# Migracion TDD legacy → nuxt + actualizacion content/docs + validacion contra legacy

## Purpose

Implementar la suite de tests de paridad que codifican el comportamiento del sistema legacy (`pehuen-server` + `pehuen-client`) como **especificacion ejecutable**, hacerlos pasar en `pehuen_nuxt`, validar paridad numerica con datasets reales, actualizar la documentacion publica en `content/docs/` reflejando el estado nuxt, y certificar contra el legacy (codigo y docs) que la migracion preserva paridad funcional.

Output final: `pehuen_nuxt` corre 100% suite verde, paridad numerica validada, content/docs actualizado y aprobado, legacy archivado.

## Requirements

### REQ-01: Auditoria y alineacion de los 87 tests existentes

El sistema MUST procesar los 87 tests existentes (68 unit + 19 e2e) categorizandolos en KEEP / IMPROVE / REFACTOR / REWRITE / DELETE antes de escribir nuevos tests.

**Actor**: developer + reviewer
**Layers**: tests

#### Scenario: tests existentes alineados a convenciones migracion
- **GIVEN** 87 tests existentes sin tags ni `@source-doc` headers
- **WHEN** se ejecuta el plan en `tests-audit-plan.md`
- **THEN** cada test tiene header `@source-code`, tag (`@paridad/@improvement/@bug-fix/@bug-preserved/@delta-decision`), y usa fixtures compartidas

#### Scenario: tests con drift se marcan REWRITE
- **GIVEN** un test que asume comportamiento legacy desaparecido (ej. path `/guia-status?id=`)
- **WHEN** se evalua contra `legacy-clone` y `nuxt-staging`
- **THEN** se marca REWRITE y se crea su reemplazo

#### Acceptance
**Verificable**: archivo `tests/AUDIT_DECISIONS.csv` con 87 filas y columna `decision` llena (sin `?`).

### REQ-02: Implementar ~243 migration-tests derivados de la comparativa

El sistema MUST tener un test por cada item documentado en `improvements.md`, `by-dimension/`, `by-flow/`, `by-model/` (~120 items que generan ~243 tests segun matriz consolidada en `gaps-from-comparison.md`).

**Actor**: developer
**Layers**: tests (capas 1-5)

#### Scenario: cada item de migracion tiene test
- **GIVEN** la documentacion de migracion lista N items (DELTA, BUG-CORREGIDO, MEJORA-CRITICA, paridad de campos/endpoints/sockets/roles/UI/IDs/vistas-unificadas)
- **WHEN** se completa la implementacion de tests
- **THEN** `grep "@source-comparison" tests/` retorna referencias a TODOS los items
- **AND** items sin test asociado se reportan como GAP

#### Scenario: tests `@paridad` pasan en ambos backends
- **GIVEN** un test taggeado `@paridad`
- **WHEN** se ejecuta con `PEHUEN_API_BASE=http://localhost:5001/api` (legacy) y con `http://localhost:3000/api` (nuxt)
- **THEN** ambos retornan PASS

#### Scenario: tests `@improvement`/`@bug-fix` pasan solo en nuxt
- **GIVEN** un test taggeado `@improvement` o `@bug-fix`
- **WHEN** se ejecuta contra legacy
- **THEN** FAILS (comportamiento mejorado/corregido no existe en legacy)
- **AND** PASS contra nuxt

#### Acceptance
**Verificable**: `pnpm playwright test --grep "@paridad" --project=legacy` y `--project=nuxt` ambos PASS; `pnpm playwright test --grep "@improvement|@bug-fix" --project=nuxt` PASS.

### REQ-03: Resolver 12 DELTA-CUESTIONABLE con stakeholders

El sistema MUST tener `migration-decision` aprobada para cada DELTA-CUESTIONABLE listado en `improvements.md` antes del corte.

**Actor**: lead + stakeholders
**Layers**: governance

#### Scenario: cada DELTA tiene decision documentada
- **GIVEN** improvements.md lista 12 items DELTA-CUESTIONABLE
- **WHEN** se ejecutan reuniones de revision
- **THEN** existe `decisions/DEC-{n}-{slug}.md` para cada uno con `chosen` (paridad-legacy / mejora-nuxt / hibrido) y `stakeholder_approval` con fecha

#### Acceptance
**Verificable**: `ls projects/pehuen/decisions/ | wc -l >= 12`; cada decision tiene tests que la codifican.

### REQ-04: Validar paridad numerica con datasets reales

El sistema MUST ejecutar `numeric-paridad.md` con un dataset clonado de produccion legacy y verificar que stats y reportes producen mismos numeros.

**Actor**: reviewer
**Layers**: backend, database

#### Scenario: 5 algoritmos stats coinciden con tolerancia 0.01 m3
- **GIVEN** dataset legacy clonado a nuxt-staging
- **WHEN** se ejecutan los 5 endpoints stats con mismos params en ambos sistemas
- **THEN** diferencia maxima por celda < 0.01 m3 (tolerancia documentada)

#### Scenario: reportes Excel difieren < 1% celdas
- **GIVEN** mismos filtros aplicados a `POST /report/guide` en ambos
- **WHEN** se descargan ambos archivos y se hace diff cell-by-cell
- **THEN** diferencias detectadas son <= 1% del total Y todas tienen explicacion documentada (ej. redondeo)

#### Acceptance
**Verificable**: archivo `paridad-report-{date}.md` con tabla de diffs.

### REQ-05: Validar contra codigo y documentacion legacy

El sistema MUST cruzar cada migration-test con su `@source-doc` y `@source-code` confirmando que ambos archivos existen y que el test refleja lo que dice el codigo legacy (no inventado).

**Actor**: reviewer (+ herramienta de validacion)
**Layers**: tests, governance

#### Scenario: source_doc existe
- **GIVEN** un test con `@source-doc pehuen-server/docs/03-flows/guias/create.md`
- **WHEN** se ejecuta `verify-source-refs` en CI
- **THEN** el archivo existe + el doc menciona el comportamiento testeado (heuristica de matching texto)

#### Scenario: source_code refleja comportamiento real
- **GIVEN** un test `@paridad` con source_code `controllers/guia.controller.ts:48-50`
- **WHEN** se ejecuta el test contra `legacy-clone` con un MongoDB con dataset real
- **THEN** PASS (confirma que el test codifica comportamiento real, no inventado)

#### Acceptance
**Verificable**: CI job `audit-migration-traceability` PASS sin warnings.

### REQ-06: Actualizar documentacion en content/docs al finalizar

El sistema MUST actualizar `pehuen_nuxt/content/docs/` reflejando el estado **post-migracion** (sin referencias a legacy salvo historicas) cuando todos los tests pasen.

**Actor**: developer + content-writer
**Layers**: docs

#### Scenario: docs publicos reflejan funcionalidad nuxt
- **GIVEN** suite 100% verde + DEC aprobadas
- **WHEN** se ejecuta task de actualizacion de content/docs
- **THEN** existe doc actualizado en `content/docs/{flow}.md` para cada parity-flow
- **AND** los docs describen el comportamiento desde la perspectiva del usuario nuxt (no migracion)
- **AND** referencias historicas a legacy estan en seccion dedicada o changelog

#### Scenario: links internos funcionan
- **GIVEN** docs actualizados
- **WHEN** se ejecuta link checker
- **THEN** 0 links rotos

#### Acceptance
**Verificable**: `grep -ri "legacy\|pehuen-server\|pehuen-client" content/docs/` retorna solo referencias historicas marcadas.

### REQ-07: Trazabilidad completa desde tests hasta docs legacy

El sistema MUST permitir, dado un test, navegar a:
1. Su `@source-doc` (doc legacy o nuxt) — fuente de la especificacion.
2. Su `@source-code` (path:linea legacy) — codigo que la origina.
3. Su `@improvements-ref` (item de improvements.md) — gap detectado en migracion.
4. Su `@source-comparison` (nota de migracion en by-flow/by-model/by-dimension).
5. La decision asociada (si DELTA).
6. El doc actualizado en content/docs (post-migracion).

**Actor**: cualquier developer
**Layers**: tests, docs

#### Scenario: dado un test fallido, encontrar el codigo legacy
- **GIVEN** un test failing con `@source-code pehuen-server/src/controllers/guia.controller.ts:48-50`
- **WHEN** el dev abre el test
- **THEN** el header lo lleva al codigo legacy en una linea de IDE
- **AND** puede ejecutar el test contra `legacy-clone` para verificar baseline

#### Acceptance
**Verificable**: cada test tiene los 4-6 campos de trazabilidad poblados (auditable con script).

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Coverage | Cobertura code de tests | line coverage `server/`, `shared/` | > 70% |
| Coverage | Cobertura migration-items | items con test | 100% |
| Performance | Suite completa CI | tiempo de ejecucion | < 10 min unit, < 30 min e2e |
| Performance | Stats nuxt vs legacy | latencia comparativa | nuxt <= legacy |
| Reliability | Flakiness rate | % tests no determinist | < 1% |
| Compliance | DELTAs aprobados | items DELTA-CUESTIONABLE con DEC | 100% antes del corte |

## Artifacts

### Parity Flows (10)

> Generados desde meta-spec `parity-flow.md`. Lista canonica de flujos del sistema.

| Flow | Roles | Layers | Variants | Migration tests | Status |
|------|-------|--------|----------|-----------------|--------|
| login | public | frontend, backend | 1 | TC-1 a TC-12 | pending |
| change-cancha | autenticado | frontend, backend | 1 | TC-13 a TC-18 | pending |
| change-password | owner / admin | frontend, backend | 1 | TC-19 a TC-22 | pending |
| user-crud | ADMIN, SUPERVISOR | frontend, backend | 3 (create, update, status) | TC-23 a TC-32 | pending |
| guia-crud | ADMIN, RECEPTOR | frontend, backend, sockets | 5 (por movimiento) | TC-33 a TC-65 | pending |
| guia-status | autenticado | backend, sockets | 1 | TC-66 a TC-70 | pending |
| ruma-crud | ADMIN, RECEPTOR | frontend, backend, sockets | 1 | TC-71 a TC-85 | pending |
| ruma-upload-image | ADMIN, RECEPTOR, ASESOR | frontend, backend, storage | 1 | TC-86 a TC-95 | pending |
| ruma-map | ADMIN, RECEPTOR, ASESOR | frontend, backend | 1 | TC-96 a TC-100 | pending |
| batch-ajustes | ADMIN | frontend, backend | 2 (load, validate) | TC-101 a TC-115 | pending |
| mii-upload | ADMIN | backend, sockets, storage | 1 | TC-116 a TC-122 | pending |
| reports | ADMIN, RECEPTOR, SUPERVISOR, CONSULTOR | backend, storage | 2 (guia, ruma) | TC-123 a TC-135 | pending |
| stats | ALL | backend | 5 (algoritmos) | TC-136 a TC-150 | pending |
| sockets-realtime | autenticado | sockets | 12 (eventos) | TC-151 a TC-165 | pending |
| ui-unified-views | ASESOR | frontend | 8 (subseccion 11) | TC-166 a TC-180 | pending |
| roles-permissions | 5 roles | frontend, backend | 30 (5 roles x 6 areas) | TC-181 a TC-210 | pending |

### Migration Decisions (12 pendientes)

> Cada DELTA-CUESTIONABLE de improvements.md genera una decision.

| DEC | Item improvements.md | Chosen | Approved | Migration tests |
|-----|----------------------|--------|----------|-----------------|
| DEC-1 | §3.10 AJUSTE_ROLES con RECEPTOR | pending | — | TC-101 |
| DEC-2 | §1.7 URLs firmadas vs publicas | pending | — | TC-89 |
| DEC-3 | §1.8 tokenVersion para invalidar sesiones | pending | — | TC-9 |
| DEC-4 | side-effects.md naming socket rooms | pending | — | TC-151 |
| DEC-5 | endpoints.md pagination response shape | pending | — | TC-50 |
| DEC-6 | by-flow/batch-ajustes.md async vs sync | pending | — | TC-103 |
| DEC-7 | by-model/guia.md movimiento Number vs ObjectId | pending | — | TC-33 |
| DEC-8 | by-model/mii.md GuiaVolumen.guia tipo | pending | — | TC-117 |
| DEC-9 | by-model/user.md User.cancha tipo | pending | — | TC-13 |
| DEC-10 | improvements.md§8.1 Storage S3 vs filesystem | pending | — | TC-87 |
| DEC-11 | by-flow/login.md mantenedores embebidos | pending | — | TC-2 |
| DEC-12 | by-dimension/auth.md TTLs tokens | pending | — | TC-7 |

## Tasks

> 8 sprints + tareas trasversales. Cada task atomica, deja sistema funcional al completar.

> **DET-20 retrofit nota (post-2026-05-09)** — esta spec se creo 2026-04-26 con tabla flat. Las tareas pendientes (status `pending`) deben re-particionarse en `### Session N — {objetivo} [tipo: ...] [tier: ...]` con `S{N}.GATE` como ultima entrada antes de avanzar. La particion la hara el architect en el proximo `design-{tipo}` (PEH-002 al reanudar, PEH-003+ al iniciar). Tasks ya `done`/`partial` no se re-organizan: se preservan en el formato actual como referencia historica (DET-3).

| # | Task | Agent | Depends on | Files | Validation | Status |
|---|------|-------|------------|-------|------------|--------|
| 1 | **Sprint 0**: setup ambientes paralelos legacy-clone + nuxt-staging + DB seeds reproducibles | developer | — | `scripts/setup-legacy-clone.sh`, `scripts/seed-test-data.sh` | manual: `docker ps` muestra 3 servicios | done (S1) |
| 2 | **Sprint 0**: auditoria 87 tests existentes — generar AUDIT_DECISIONS.csv | reviewer | #1 | `tests/AUDIT_LIST.txt`, `tests/AUDIT_DECISIONS.csv` | csv con 87 filas decision != "?" | in_progress (S2 partial → S3) |
| 3 | **Sprint 0**: aplicar decisiones del audit (KEEP/IMPROVE/REFACTOR/REWRITE/DELETE) en 5 buckets | developer | #2 | `tests/{unit,e2e}/**/*.test.ts` | `pnpm test:run` PASS, todos con header @source | pending (S3) |
| 4 | **Sprint 0**: tests IDs hardcoded + static checks (NOPASSWD, schemas Zod compartidos) | developer | #3 | `tests/unit/migration-paridad/static/*.test.ts` | `pnpm test:run` PASS | pending |
| 5 | **Sprint 0**: migration round-trip data integrity tests | developer | #1 | `tests/integration/migration-roundtrip.test.ts` | dataset legacy → nuxt counts identicos | pending |
| 6 | **Sprint 1**: tests Capa 1 validators (rut, fecha, parsers) | developer | #4 | `tests/unit/migration-paridad/utils/` | 50 tests PASS | pending |
| 7 | **Sprint 1**: tests Capa 2 schemas + models + paridad campos | developer | #4 | `tests/unit/migration-paridad/{schemas,models}/` | 80 tests PASS | pending |
| 8 | **Sprint 1**: tests bugs corregidos schemas (rango movimiento, RumaDto:31, Producto.role, ingresoRomana) | developer | #7 | `tests/unit/migration-paridad/bugs/*.test.ts` | tests fallan en legacy, pasan en nuxt | pending |
| 9 | **Sprint 1**: tests timezone DST Chile + locale | developer | #6 | `tests/unit/migration-paridad/timezone/*.test.ts` | edge cases DST PASS | pending |
| 10 | **Sprint 2**: tests paridad auth (login, refresh, logout, change-cancha, change-password) | developer | #7 | `tests/e2e/migration-paridad/api-auth/*.spec.ts` | 12 tests PASS contra legacy y nuxt | pending |
| 11 | **Sprint 2**: tests paridad users CRUD | developer | #10 | `tests/e2e/migration-paridad/api-users/*.spec.ts` | 10 tests PASS | pending |
| 12 | **Sprint 2**: tests paridad guias CRUD (5 variantes movimiento) | developer | #7 | `tests/e2e/migration-paridad/api-guias/*.spec.ts` | 33 tests PASS | pending |
| 13 | **Sprint 2**: tests paridad validaciones controller-level (comuna, whitespace, defaults numericos, rutCleaner) | developer | #12 | `tests/e2e/migration-paridad/validations/*.spec.ts` | 15 tests PASS | pending |
| 14 | **Sprint 3**: tests paridad rumas + upload imagen GPS + map | developer | #12 | `tests/e2e/migration-paridad/api-rumas/*.spec.ts` | 30 tests PASS | pending |
| 15 | **Sprint 3**: tests paridad ajustes (individual + batch) | developer | #12 | `tests/e2e/migration-paridad/api-ajustes/*.spec.ts` | 15 tests PASS | pending |
| 16 | **Sprint 3**: tests paridad MII + reports + mantenedores + canchas + productos | developer | #12 | `tests/e2e/migration-paridad/api-{mii,reports,catalogs}/*.spec.ts` | 40 tests PASS | pending |
| 17 | **Sprint 3**: tests paridad sockets — 12 eventos + race conditions | developer | #14, #15 | `tests/e2e/migration-paridad/sockets.spec.ts` | 15 tests PASS | pending |
| 18 | **Sprint 3**: tests concurrency / race (duplicados simultaneos) | developer | #12, #14 | `tests/e2e/migration-paridad/concurrency.spec.ts` | 6 tests PASS | pending |
| 19 | **Sprint 4**: tests E2E UI guias condicional por movimiento | developer | #12 | `tests/e2e/migration-paridad/ui-guia-condicional.spec.ts` | 5 tests PASS | pending |
| 20 | **Sprint 4**: tests E2E UI vistas unificadas + redirects 301 + feature subset por rol | developer | #14 | `tests/e2e/migration-paridad/ui-unified-views.spec.ts` | 57 tests PASS | pending |
| 21 | **Sprint 4**: tests E2E permisos por rol (matriz 5 x 6) + no-leak backend | developer | #20 | `tests/e2e/migration-paridad/role-permissions.spec.ts` | 30 tests PASS | pending |
| 22 | **Sprint 4**: tests E2E mensajes de error literales en UI | developer | #19 | `tests/e2e/migration-paridad/ui-error-messages.spec.ts` | 15 tests PASS | pending |
| 23 | **Sprint 4**: tests boundary / fuzz | developer | #19 | `tests/e2e/migration-paridad/boundary.spec.ts` | 8 tests PASS | pending |
| 24 | **Sprint 5**: paridad numerica stats — 5 algoritmos con dataset golden | reviewer | #16 | `scripts/paridad-stats.ts`, `paridad-report-stats.md` | tolerancia 0.01 m3 | pending |
| 25 | **Sprint 5**: paridad reportes Excel cell-by-cell | reviewer | #16 | `scripts/paridad-reportes.ts`, `paridad-report-reportes.md` | < 1% celdas con DELTA | pending |
| 26 | **Sprint 5**: storage migration script + tests round-trip | developer | #14 | `scripts/migrate-rumaimages-to-s3.ts` | 100% imagenes accesibles | pending |
| 27 | **Sprint 6**: 12 reuniones DELTA-CUESTIONABLE — generar 12 migration-decisions | lead + reviewer | #20, #21 | `projects/pehuen/decisions/DEC-{1..12}-*.md` | 12 archivos con stakeholder_approval | pending |
| 28 | **Sprint 6**: tests MEJORA-CRITICA (httpOnly cookies, NOPASSWD removido, AuditLog poblado, Zod compartido) | developer | #27 | `tests/{unit,e2e}/migration-paridad/improvements/*.test.ts` | 25 tests PASS solo en nuxt | pending |
| 29 | **Sprint 6**: tests security focused (mass assignment, NoSQL inj, JWT alg=none, path traversal, mime spoof, DoS upload, XSS, CSRF) | developer | #28 | `tests/e2e/migration-paridad/security/*.spec.ts` | 10 tests PASS | pending |
| 30 | **Sprint 7**: ejecutar suite completa CI con coverage report | reviewer | #1-#29 | `coverage-report.html`, `paridad-report-final.md` | 100% verde, coverage > 70% | pending |
| 31 | **Sprint 7**: actualizar content/docs reflejando nuxt post-migracion | developer | #30 | `content/docs/**/*.md` | links validos, sin refs legacy salvo historicas | pending |
| 32 | **Sprint 7**: pre-prod canary 1 semana | reviewer | #31 | monitoring dashboard | 0 tickets P1/P2 | pending |
| 33 | **Sprint 7**: corte + ejecutar runbook-cutover.md | developer + DevOps | #32 | runbook | sistema en prod, tests verdes | pending |

### Task contracts

```
Task #2: Auditoria 87 tests existentes
- source_ref: REQ-01
- agent: reviewer
- files: tests/AUDIT_LIST.txt (output find), tests/AUDIT_DECISIONS.csv (decisiones)
- precondition: ambientes legacy-clone + nuxt-staging corriendo (#1)
- expected_output: AUDIT_DECISIONS.csv con 87 filas, columna decision != "?"
- validation: cat tests/AUDIT_DECISIONS.csv | awk -F, '{print $4}' | grep -c "?" debe ser 0
- rollback: descartar el csv (no afecta codigo)
- rules: [10, 11, 13]   # KB-first, propagacion, evidencia
```

```
Task #20: Tests E2E UI vistas unificadas
- source_ref: REQ-02 (gaps-from-comparison.md§11)
- agent: developer
- files: tests/e2e/migration-paridad/ui-unified-views.spec.ts (1 archivo, 57 tests)
- precondition: paridad rumas backend OK (#14), redirects 301 implementados en nuxt
- expected_output: 57 tests PASS contra nuxt; 8 redirects funcionando
- validation: pnpm playwright test tests/e2e/migration-paridad/ui-unified-views.spec.ts --reporter=list
- rollback: revertir commit y deshabilitar tests con .skip
- rules: [1, 2, 7, 16]   # certeza, source_ref, evidencia, propagacion
```

```
Task #27: Reuniones DELTA-CUESTIONABLE
- source_ref: REQ-03
- agent: lead + reviewer (con stakeholders en reunion)
- files: projects/pehuen/decisions/DEC-{1..12}-{slug}.md
- precondition: tests E2E muestran comportamiento actual de nuxt (#20, #21)
- expected_output: 12 archivos DEC con campos chosen + stakeholder_approval + tests asociados
- validation: ls projects/pehuen/decisions/ | wc -l; cada doc tiene "approved: YYYY-MM-DD"
- rollback: marcar como "draft" si no se logra acuerdo en la reunion
- rules: [10, 14]   # KB-first, approve/iterate
```

```
Task #31: Actualizar content/docs
- source_ref: REQ-06
- agent: developer (+ content-writer)
- files: content/docs/**/*.md (todos los flows + entities)
- precondition: 100% suite verde (#30); decisions aprobadas
- expected_output: docs publicos describen comportamiento nuxt; cada parity-flow tiene un doc actualizado
- validation:
  1. `markdown-link-check content/docs/**/*.md` → 0 broken links
  2. `grep -ri "legacy\|pehuen-server" content/docs/` → solo refs historicas marcadas
  3. revision manual de 5 docs por content-writer
- rollback: git revert si docs publican info incorrecta (riesgo: usuarios leen guia equivocada)
- rules: [16]   # propagacion
```

## Constraints

- **RULE-shared-zod-schemas**: schemas Zod en `shared/schemas/` deben usarse identicos en cliente y server (no duplicar). Aplica a tests de validation.
- **RULE-audit-on-write**: cada escritura genera entry en AuditLog. Tests de paridad MUST verificar esto en `@improvement` tests.
- **RULE-typescript-strict**: `noUncheckedIndexedAccess: true` debe pasar `nuxt typecheck`.
- **RULE-no-console-log**: usar Winston logger; tests deben verificar ausencia.
- **RULE-mongo-ids-constants**: IDs hardcoded SOLO en `shared/constants/mongodb-ids.ts`.
- **DEC-IDs-preserved**: la migracion preserva IDs legacy en colecciones criticas (`estadorumas`, `canchas`).
- **RULE-spanish-content-english-code**: codigo en ingles, contenido en espanol — aplica a tests, comments, docs.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| pehuen-server (legacy-clone) | external (consult-only) | Backend legacy corriendo con DB clonada — fuente de verdad para tests `@paridad` | Sin esto, tests `@paridad` no pueden validar baseline |
| pehuen-client (legacy-clone) | external (consult-only) | Cliente legacy para validar UI/UX comparativo | Solo para tests de UI E2E con dual-render |
| MongoDB Atlas / local | external | DB para legacy-clone + nuxt-staging + datasets golden | Caida bloquea tests E2E + paridad numerica |
| AWS S3 / R2 | external | Storage de imagenes nuxt | Si difiere de filesystem legacy, paridad de Ruma.img cambia |
| Stakeholders disponibles | internal | Para resolver 12 DELTA-CUESTIONABLE | Sin reunion, no se cierran decisions → bloqueo Sprint 6 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Tests basados en docs incompletas (drift legacy) | medium | high | E2 obligatorio (verificar contra legacy) — REQ-01 scenario |
| Bugs no detectados (test no escrito) | medium | high | Sprint 7 canary 1 semana + auditoria con reviewer senior |
| bcrypt 5 → 6 incompatibilidad | low | critical | Test Sprint 1 con 5 hashes reales antes de migrar (#5) |
| TZ Chile DST edge cases | medium | medium | Sprint 1 task #9 dedicada |
| 12 DELTAs sin decision a tiempo | high | high | Reuniones agendadas pre-Sprint 6 con stakeholders |
| content/docs desactualizado al cierre | medium | medium | Task #31 dedicada + link checker en CI |
| Imagenes legacy huerfanas en S3 | low | high | Script de migracion #26 con verificacion round-trip |
| Drift entre tests y nuxt en futuras releases | high | medium | CI ejecuta `audit-migration-traceability` en cada PR |

## Open questions

- [x] ~~**Tracker oficial**~~ → resuelto por [DEC-017](../decisions/DEC-017-tracker-interno.md): **deckard interno** (`projects/pehuen/tickets/PEH-*.md`). Sin GitHub Issues / Jira / Linear.
- [x] ~~**URL produccion nuxt**~~ → resuelto por [DEC-018](../decisions/DEC-018-url-canary-subdominio.md): canary en **`scpehuen.v2.cl`** durante migración; DNS swap a `scpehuen.cl` al corte. Dominio principal intacto para usuarios.
- [x] ~~**Plan de comunicacion al usuario**~~ → resuelto por [DEC-019](../decisions/DEC-019-plan-corte-auto-refresh.md): **auto-refresh de tokens, sin notificación masiva**. Banner explicativo en `/login` post-corte (~2 semanas).
- [x] ~~**Storage definitivo**~~ → resuelto por [DEC-005](../decisions/DEC-005-storage-cloud.md): **filesystem local** en VPS (sin cloud). Task #26 (storage migration) pierde alcance — solo migración de paths legacy locales, no a cloud.
- [x] ~~**Hashes legacy test set**~~ → resuelto por [DEC-020](../decisions/DEC-020-test-data-rut-valido.md): **cuentas test creadas en setup con RUTs válidos** (módulo 11 chileno); hashes generados in-test con bcrypt salt 10. NO se committean hashes producción.

## Decisions

(Se llenan durante ejecucion. Decisiones criticas se promueven a `decisions/DEC-*.md`)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Test coverage migration-items | 37% | 100% | grep `@source-comparison` + cruce vs items |
| Suite verde nuxt | parcial | 100% | CI green |
| Suite verde legacy-clone (`@paridad`) | 0% | 100% | dual-run CI |
| DELTAs con decision | 0/12 | 12/12 | `ls decisions/ \| wc -l` |
| Mejoras VALIDADAS | 0/30 | 30/30 | `improvements-validation-report.md` |
| Acceptance checklist | 0/120 | 120/120 | `acceptance-checklist.md` items en `[x]`/`[~]` |
| content/docs actualizado | 0% | 100% | link checker + grep refs legacy |
| Tickets P1/P2 canary | n/a | 0 | monitoring durante semana canary |

## Technical reference

- **Plan TDD detallado**: `pehuen_nuxt/docs/07-migration-notes/review-plan/tdd-strategy.md`
- **Tests derivados comparativa**: `pehuen_nuxt/docs/07-migration-notes/review-plan/gaps-from-comparison.md`
- **Auditoria tests existentes**: `pehuen_nuxt/docs/07-migration-notes/review-plan/tests-audit-plan.md`
- **Reporte cobertura actual**: `pehuen_nuxt/docs/07-migration-notes/review-plan/test-coverage-report.md`
- **Runbook corte**: `pehuen_nuxt/docs/07-migration-notes/review-plan/runbook-cutover.md`
- **Improvements declarados**: `pehuen_nuxt/docs/07-migration-notes/improvements.md`
- **Acceptance checklist completo**: `pehuen_nuxt/docs/07-migration-notes/acceptance-checklist.md`

## Acceptance checkpoints

- [ ] **Funcional**: 100% migration-tests verdes en nuxt; tests `@paridad` verdes en legacy-clone
- [ ] **Tests**: cobertura > 70% en `server/` y `shared/`; 100% items migracion con test
- [ ] **NFRs**: stats nuxt <= legacy en latencia; suite CI < 30 min
- [ ] **Rules**: critical_rules respetadas (Zod compartido, audit, sin console.log, IDs en constants)
- [ ] **Integration**: paridad numerica stats + reportes OK
- [ ] **Decisions**: 12 DELTAs con DEC aprobada
- [ ] **Improvements**: 30 mejoras VALIDADAS
- [ ] **Docs**: content/docs actualizado, sin links rotos, sin refs legacy spureas
- [ ] **Validacion legacy**: cada test `@source-comparison` cruzado con codigo/docs legacy reales
- [ ] **Canary**: 1 semana sin tickets P1/P2 en pre-prod
- [ ] **Runbook**: corte ejecutado segun runbook-cutover.md sin desviaciones
