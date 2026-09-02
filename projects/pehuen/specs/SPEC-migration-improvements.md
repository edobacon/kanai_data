---
id: SPEC-migration-improvements
project: pehuen
ticket: PEH-001
status: in_progress
---

# Mejoras Intencionales de la Migración — registro de divergencias deliberadas

# Mejoras Intencionales de la Migración — registro de divergencias deliberadas

## Purpose

Registro **único y autoritativo** de los puntos donde el nuxt diverge intencionalmente del legacy. Distingue **mejora** de **regresión silenciosa**:

- Si una divergencia está aquí → es válida, parte de la migración.
- Si una divergencia NO está aquí y NO está en `SPEC-business-logic-parity` como `ported-equivalent` → es regresión (bug).

Aplicación de [RULE-MIGRATION-001](../rules/migration/RULE-MIGRATION-001-no-functional-regression.md): cualquier `delta-intencional` requiere entrada en este SPEC.

## Categorías de mejora

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| **security** | Cierre de huecos de seguridad / cumplimiento | DEC-002 (httpOnly cookies), DEC-014 (PATCH guia-status restringido) |
| **observability** | Auditoría / logging / trazabilidad | DEC-004 (audit log), RULE-GEN-002 (no console.log → winston) |
| **api-shape** | Cambios de contrato de API | DEC-013 (paginación) |
| **type-safety** | Tipos compartidos / validación strict | DEC-003 (zod shared), RULE-GEN-004 (TS strict) |
| **architecture** | Cambios estructurales del sistema | DEC-006 (mongoose 9), DEC-007 (pinia state) |
| **ux** | Mejoras de experiencia de usuario | DEC-010 (reportes cleanup), DEC-011 (vistas unificadas asesor), DEC-012 (redirect 301 legacy), DEC-015 (default route por rol) |
| **defensive** | Mejoras defensivas (fail-loud, exhaustivity, validación) | DEC-015 (throw on unknown role), RULE-GEN-004 (TS strict) |
| **paridad-contract** | Restricciones de compatibilidad con legacy que NO son mejora pero deben preservarse | IMP-013 (bcrypt salt 10) |
| **bug-fix-legacy** | Correcciones a bugs del legacy | DEC-009 (bug fixes legacy) |

## Catálogo

| ID | Mejora | Categoría | Reemplaza | Razón | Criterio de aceptación | Status |
|----|--------|-----------|-----------|-------|------------------------|--------|
| IMP-001 | Cookies httpOnly en autenticación | security | localStorage del JWT en legacy | XSS protection; cumplimiento auditoría | Login retorna `Set-Cookie httpOnly secure`; localStorage limpio | accepted (DEC-002) |
| IMP-002 | Audit log en cada escritura | observability | sin auditoría en legacy | Trazabilidad regulatoria, "¿quién hizo qué cuándo" | Modelo AuditLog con cobertura 100% endpoints de write (RULE-GEN-003) | accepted (DEC-004) |
| IMP-003 | Schemas Zod compartidos client/server | type-safety | validaciones duplicadas en legacy | Single source of truth de validación; menos drift | `shared/schemas/*.ts` consumido por ambos lados | accepted (DEC-003) |
| IMP-004 | Mongoose 9 (driver moderno) | architecture | mongoose 5 en legacy | Soporte LTS, fix de deprecations, mejor TS support | `mongoose@^9` y migrations sin issues | accepted (DEC-006) |
| IMP-005 | Pinia para state management | architecture | composition refs reactivos en legacy | Devtools, hot-reload de stores, type inference | Stores migrados a `defineStore` con `use{Name}Store` | accepted (DEC-007) |
| IMP-006 | Logs estructurados con Winston | observability | `console.log` disperso en legacy | Niveles, JSON, transports configurables (CloudWatch/Datadog) | Cero `console.log` en `server/src` (RULE-GEN-002) | accepted (rule established) |
| IMP-007 | Paginación shape `{ items, total, page, pages, qty }` | api-shape | `{ payload: { items, total } }` en legacy | Más expresivo; alineado con patrones modernos; nuxt ya lo usa | Endpoints paginados retornan el nuevo shape; consumidores actualizados | accepted (DEC-013) |
| IMP-008 | TypeScript `strict` + `noUncheckedIndexedAccess` | type-safety | TS no-strict en legacy | Cero `undefined` no detectados; menor superficie de bugs | tsconfig con flags activas; CI bloquea si hay errores | accepted (RULE-GEN-004) |
| IMP-009 | Reportes consolidados (cleanup) | ux | múltiples vistas duplicadas en legacy | Reduce confusión operativa; un solo punto de entrada | Vista única de reportes con filtros que cubre casos legacy | accepted (DEC-010) |
| IMP-010 | Vistas unificadas para ASESOR | ux | vistas separadas + override de menú en legacy | Menos branching; UX coherente con resto del sistema | ASESOR usa mismas vistas con scope automático en lugar de menú dedicado | accepted (DEC-011) |
| IMP-011 | Redirect 301 de paths legacy a nuxt | ux | rutas hash-mode (`/#/...`) en legacy | URLs canónicas; SEO; bookmarks legacy siguen funcionando | Lista de rutas redirigidas con tests | accepted (DEC-012) |
| IMP-012 | Bug fixes del legacy aplicados al nuxt | bug-fix-legacy | comportamientos buggy preservados en legacy | `isRut` invertido, `ingresoRomana` sobrescrito, etc. | Cada bug fix con test de regresión que falla en legacy y pasa en nuxt | accepted (DEC-009) |
| IMP-013 | bcrypt saltRounds=10 (compat hashes legacy) | paridad-contract | (no aplica — es restricción de compat) | Compatibilidad de auth con usuarios pre-migración | Usuarios legacy se autentican sin reset de password (RULE-AUTH-008) | accepted (rule established) |
| IMP-014 | Restricción de PATCH /guia-status a A/R/AS | security | hueco abierto en server legacy (cualquier autenticado) | Cierre de hueco alineado con contrato del client legacy (RULE-AUTH-011) | requireRole con 3 roles + UI alineada | accepted (DEC-014) |
| IMP-015 | Default route post-login explícito por rol + throw on unknown | ux + defensive | fallback silencioso `guides.list` para SUPERVISOR/CONSULTOR; default `asesor.ruma.list` deprecado | UX: SUPERVISOR a `/stats` (rol panorama). Defensividad: roles nuevos sin handler explícito fallan loud | `getDefaultRouteForRole(role)` exhaustiva + test E2E por rol + test de rol unknown que falla | accepted (DEC-015) |

## Migration Tests (TDD obligatorio — RULE-MIGRATION-002)

> Cada `IMP-*` requiere **mínimo 1 TC** con tag `@improvement` y `pass_against: nuxt-only`. El TC debe **fallar contra legacy** (codifica el comportamiento nuevo que legacy no tiene) y **pasar contra nuxt**. Sin este TC, la mejora puede revertirse silenciosamente en un refactor.

### Slots de TC reservados

`SPEC-migration-tdd` task #28 ya planifica **tests MEJORA-CRITICA (httpOnly cookies, NOPASSWD removido, AuditLog poblado, Zod compartido)** — 25 tests PASS solo en nuxt. Esos TC se enlazan acá uno-a-uno con IMP-*.

### Seed de TC por IMP

| TC slot | Tag | IMP | Descripción del test | Criterio de fallo en legacy | Status |
|---------|-----|-----|---------------------|---------------------------|--------|
| TC-IMP-001 | @improvement | IMP-001 (httpOnly cookies) | Login retorna `Set-Cookie httpOnly secure`; ningún token en `localStorage` después del login | legacy guarda JWT en localStorage | pending |
| TC-IMP-002 | @improvement | IMP-002 (audit log) | Cada POST/PATCH/DELETE produce un registro `AuditLog` con `userId`, `action`, `entity`, `entityId`, `timestamp` | legacy no tiene tabla AuditLog | pending |
| TC-IMP-003 | @improvement | IMP-003 (zod shared) | Schema validado simultáneamente en client + server desde `shared/schemas/`; modificar el schema rompe validación en ambos | legacy duplica validación client/server | pending |
| TC-IMP-004 | @improvement | IMP-004 (mongoose 9) | Modelos usan API de mongoose 9 sin warnings de deprecación | legacy usa mongoose 5 con deprecations | pending |
| TC-IMP-005 | @improvement | IMP-005 (pinia) | Stores definidos con `defineStore` y devtools detecta hot-reload | legacy usa composition refs | pending |
| TC-IMP-006 | @improvement | IMP-006 (winston) | Cero `console.log` en `server/`; logs JSON estructurados con niveles | legacy usa console.log/console.trace | pending |
| TC-IMP-007 | @improvement | IMP-007 (paginación shape) | `GET /api/guias` retorna `{ items, total, page, pages, qty }` | legacy retorna `{ payload: { items, total } }` | pending |
| TC-IMP-008 | @improvement | IMP-008 (TS strict) | tsconfig con `strict` + `noUncheckedIndexedAccess`; build falla si se introduce `any` implícito | legacy no-strict | pending |
| TC-IMP-009 | @improvement | IMP-009 (reportes consolidados) | Un solo entry-point de reportes con filtros que cubre todos los casos legacy | legacy tiene N vistas duplicadas | pending |
| TC-IMP-010 | @improvement | IMP-010 (vistas unificadas asesor) | ASESOR usa mismas vistas que otros roles con scope automático | legacy tiene menú dedicado para ASESOR | pending |
| TC-IMP-011 | @improvement | IMP-011 (redirect 301) | URLs hash legacy redirigen 301 a URL canónica nuxt | legacy usa `/#/...` sin redirect | pending |
| TC-IMP-012 | @bug-fix | IMP-012 (bug fixes legacy) | Cada bug fix tiene su propio TC `@bug-fix` que falla en legacy y pasa en nuxt | varios | pending |
| TC-IMP-013 | @paridad | IMP-013 (bcrypt salt 10) | Hash legacy se autentica correctamente con `bcrypt.compare` en nuxt | both | pending |
| TC-IMP-014 | @improvement | IMP-014 (PATCH guia-status A/R/AS) | CONSULTOR/SUPERVISOR reciben 403; A/R/AS reciben 200 | legacy: cualquier autenticado pasa | pending |
| TC-IMP-015a | @improvement | IMP-015 (default route SUPERVISOR a stats) | login con SUPERVISOR redirige a `/stats` | legacy: redirige a `guides.list` (fallback) | pending |
| TC-IMP-015b | @improvement | IMP-015 (default route ASESOR unificado) | login con ASESOR redirige a `/rumas` (no `/asesor/rumas`) | legacy: redirige a `asesor.ruma.list` | pending |
| TC-IMP-015c | @improvement | IMP-015 (throw on unknown role) | role no contemplado en switch produce error claro, no redirect silencioso | legacy: cae a fallback silencioso | pending |

> Esta lista crece cuando se agregan IMPs nuevos.

## Tasks

> Orden TDD: source DEC → escribir TC red → verify legacy fail → implementar mejora → verify nuxt green.

| # | Task | Agent | Depends on | Files | Validation | Status |
|---|------|-------|------------|-------|------------|--------|
| 1 | Por cada DEC con tag `delta-intencional` o `mejora`: confirmar que existe IMP-* aquí (si no, agregar) | architect | — | este SPEC | 100% DECs `delta-intencional` referenciadas | pending |
| 2 | **TDD step 1**: para cada IMP, escribir TC `@improvement` red con `@source-code` apuntando al DEC y al código nuxt esperado | developer | #1 | `tests/{unit,e2e}/migration-paridad/improvements/` | TC files con headers correctos; failing-against-legacy esperado | pending |
| 3 | **TDD step 2**: ejecutar suite contra `legacy-clone`; cada `@improvement` debe FALLAR (codifica comportamiento que legacy no tiene) | developer | #2 | mismos archivos | 100% TCs `@improvement` FAIL contra legacy (resultado esperado) | pending |
| 4 | **TDD step 3**: implementar/verificar mejora en nuxt para cada IMP `pending` | developer | #3 | nuxt code + este SPEC | columna Status: `accepted` con evidencia | pending |
| 5 | **TDD step 4**: ejecutar suite contra nuxt; cada `@improvement` PASS | developer | #4 | mismos archivos | 100% TCs `@improvement` PASS contra nuxt (`green-in-nuxt`) | pending |
| 6 | Documentar IMPs en `pehuen_nuxt/docs/05-roles/capabilities-matrix.md` (sección "Mejoras de seguridad") + cualquier doc adicional | content-writer | #4 | doc nuxt | Doc actualizada y revisada | partially-completed (security cubierto) |
| 7 | Hook CI: `pnpm audit:improvements` + suite `@improvement` falla si una mejora se revirtió | developer | #1, #5 | `pehuen_nuxt/scripts/audit-migration-parity.mjs` + CI workflow | Script + suite detectan divergencia y bloquean PR | pending |

## Constraints

- **Una mejora = una DEC + una entrada IMP-*** aquí. No hay mejora válida sin DEC.
- **Aceptación verificable**: cada IMP debe tener criterio testeable. Sin test, no hay garantía contra reversión.
- **Categoría obligatoria**: mejoras sin categoría no se aceptan (review devuelve la PR).
- **No retroceder**: si una IMP se revierte (cambio de criterio), requiere `superseded_by` en la DEC original + nueva DEC con la nueva decisión.
- **TDD obligatorio** (RULE-MIGRATION-002): cero implementación de mejora sin TC `@improvement` red previo. El TC debe FALLAR contra legacy y PASAR contra nuxt para validar que la mejora existe y se mantiene.

## Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| DECs accepted con tag `delta-intencional` | internal | Fuente de las IMP-* |
| RULE-MIGRATION-001 | internal | Marco que define qué es mejora vs regresión |
| `tests/migration-improvements/` | internal | Tests que validan que cada IMP se mantiene |

## Acceptance checkpoints

- [ ] 100% DECs con tag `delta-intencional` tienen IMP correspondiente.
- [ ] 100% IMPs `accepted` tienen test que valida el criterio de aceptación.
- [ ] Doc operativa generada en nuxt.
- [ ] CI integrado: reversión de IMP sin nueva DEC bloquea PR.

## Proceso para mejoras descubiertas durante implementación

Cuando una mejora aparece en el curso de implementar una task (sin estar prevista en una DEC previa):

1. **El developer la implementa** sin bloquear la PR — la implementación pasa code review por su mérito técnico.
2. **Antes del cierre del sprint** donde se descubrió, el developer crea una **DEC retroactiva** con campo de frontmatter `discovered_during: implementation` y `ticket: PEH-XXX` apuntando al ticket donde apareció.
3. **La DEC retroactiva** registra: contexto, opciones consideradas, decision outcome, y la mejora correspondiente como `IMP-XXX` agregada a este SPEC.
4. **Sin DEC retroactiva al cierre del sprint**, la implementación se revierte. Esto evita que mejoras invisibles se acumulen como deuda no documentada.

**Convención de naming**: DECs retroactivas usan el siguiente correlativo disponible (DEC-017, DEC-018...) y agregan tag `retroactive` en frontmatter.

**Quién valida el cierre**: el reviewer del sprint verifica que toda IMP `accepted` tenga DEC asociada (retroactiva o no).

## Open questions

> _Sin preguntas abiertas en este SPEC. Las preguntas previas se resolvieron:_
> - _IMP-013: categorizada como `paridad-contract` (nuevo tag de categoría)._
> - _Mejoras descubiertas durante implementación: proceso definido (sección "Proceso..." arriba) — DEC retroactiva obligatoria al cierre del sprint._
