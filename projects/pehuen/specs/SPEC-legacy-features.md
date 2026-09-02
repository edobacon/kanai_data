---
id: SPEC-legacy-features
project: pehuen
ticket: PEH-001
status: draft
---

# Legacy Features — inventario funcional del sistema legacy organizado por rol

# Legacy Features — inventario funcional del sistema legacy organizado por rol

## Purpose

Inventariar **toda funcionalidad** que `pehuen-client` + `pehuen-server` ofrecen a sus usuarios, organizada por rol. Es la **fuente de verdad de capabilities a migrar**: ningun feature legacy puede perderse silenciosamente. Cada `LEG-*` se traduce a una `business-capability` (CAP-*) o se documenta su retiro/fusion en una `migration-decision` (DEC-*).

> Este spec es **un inventario**, no un plan. El plan de migracion vive en `SPEC-migration-tdd`. Las jornadas operacionales viven en `SPEC-role-journeys`. Aqui se cataloga **lo que el legacy hace por cada rol** para que la migracion sepa que preservar.

## Requirements

### REQ-01: Inventario completo del legacy por rol

El sistema MUST tener una entrada `LEG-*` por **cada feature** del legacy accesible desde la perspectiva de cada rol.

**Actor**: researcher
**Layers**: governance

#### Scenario: cobertura por rol
- **GIVEN** los 5 roles del legacy y su `pehuen-client/src/layouts/NavLayout.vue`
- **WHEN** se inventaria
- **THEN** para cada vista accesible por cada rol existe `LEG-*` que la cubre

#### Acceptance
**Verificable**: cruzar items `LEG-*` de cada rol contra el menu legacy (`NavLayout.vue`) y las rutas en `pehuen-client/src/router/index.ts`. Cobertura debe ser 100%.

### REQ-02: Cada feature legacy tiene decision de migracion

El sistema MUST clasificar cada `LEG-*` con una `migration_decision`: `paridad-exacta | mejora-deliberada | simplificada | retirada | fusionada-con-otra`.

**Actor**: lead + reviewer
**Layers**: governance

#### Scenario: features critical no tienen decision pendiente al cierre
- **GIVEN** todas las `LEG-*`
- **WHEN** se llega al corte
- **THEN** ninguna `LEG-*` con `risk_if_lost: critical` tiene `migration_decision: pending`

#### Acceptance
**Verificable**: query sobre el spec — items con risk critical y decision == pending → 0.

### REQ-03: Cada feature legacy mapea a CAP nuxt o tiene DEC de retiro

El sistema MUST tener para cada `LEG-*`: o un `nuxt_capability` (CAP-*) que la implementa, o un `decision_ref` (DEC-*) que justifica retirarla.

**Actor**: architect
**Layers**: governance

#### Acceptance
Sin `LEG-*` en estado huerfano (sin CAP ni DEC).

## Notas de catalogacion

- Roles fuente: `ADMINISTRADOR`, `SUPERVISOR`, `RECEPTOR`, `CONSULTOR`, `ASESOR` (5 — ver RULE-AUTH-001 al RULE-AUTH-009 y `pehuen-server/docs/04-roles/`).
- Features descubiertas via:
  - `pehuen-client/src/layouts/NavLayout.vue` (menu por rol)
  - `pehuen-client/src/router/index.ts` (rutas con `meta`)
  - `pehuen-client/src/views/**/*.vue` (vistas)
  - `pehuen-server/src/controllers/**/*.ts` (endpoints + middleware roles)
  - `pehuen-server/docs/04-roles/*.md` (matriz documentada)

> **Convencion ID**: `LEG-{seq}` correlativo. Una misma feature tecnica accesible por N roles genera N entradas distintas (porque scope/UI/restricciones difieren — ver meta-spec `business-capability`).

---

## Legacy Features — Rol: ADMINISTRADOR

### Auth & sesion

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-001 | Login con RUT chileno + password | Form en `/` | si | migrated | CAP-001 | paridad-exacta | critical |
| LEG-002 | GET /auth/me valida sesion + carga mantenedores en localStorage | beforeEach guard router | si | in-progress | CAP-004 | paridad-exacta (verificar mantenedores embebidos) | high |
| LEG-003 | Cambio cancha activa (incluye `'ALL'`) via dropdown navbar | Click en NavLayout | si | migrated | CAP-002 | paridad-exacta | high |
| LEG-004 | Cambio password propio | Vista /password | si | migrated | CAP-003 | paridad-exacta | medium |
| LEG-005 | Logout (limpia localStorage.token) | Boton en NavLayout | si | in-progress | CAP-006 | mejora-deliberada (logout endpoint server-side) | medium |

### Gestion de usuarios

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-010 | Listar todos los usuarios (full, no filtrado) | Vista /app/users | si | migrated | CAP-080 | paridad-exacta | high |
| LEG-011 | Crear usuario con rol asignado (incluye ADMINISTRADOR) | Form en /app/users | si | migrated | CAP-081 | paridad-exacta | critical |
| LEG-012 | Editar usuario (rol, cancha, status) | Modal en /app/users | si | migrated | CAP-082 | paridad-exacta | critical |
| LEG-013 | Activar / desactivar usuario (toggle) | Boton en /app/users | si | migrated | CAP-083 | paridad-exacta | high |
| LEG-014 | Cambiar password de cualquier usuario | Form en /app/users | si | migrated | CAP-084 | paridad-exacta | high |

### Gestion de canchas

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-020 | Listar canchas (publico) | Vista /app/canchas o GET /canchas | si | migrated | CAP-090 | paridad-exacta (verificar publico) | high |
| LEG-021 | Crear / editar / eliminar / toggle status cancha | Form en /app/canchas | si | migrated | CAP-091 | paridad-exacta | critical |

### Gestion de productos

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-030 | Listar productos por estado (HABILITADO/DESHABILITADO) | Vista /app/productos | si | migrated | CAP-100 | paridad-exacta | medium |
| LEG-031 | Crear / editar / cambiar status / eliminar producto | Vista /app/productos-create | si | migrated | CAP-101 | paridad-exacta | high |
| LEG-032 | Buscar productos por regex | Input search | medio | migrated | CAP-102 | paridad-exacta | medium |

### Operacion guias (acceso completo)

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-040 | Listar guias (sin scope cancha — `cancha = 'ALL'`) | Vista /app/guides | si | migrated | CAP-030 | paridad-exacta | critical |
| LEG-041 | Crear guia variante movimiento 1 (compra) | Vista /app/guides-create + select mov 1 | si | migrated | CAP-040 | paridad-exacta + DEC-009 (bug ingresoRomana) | critical |
| LEG-042 | Crear guia variante movimiento 2 o 3 (despacho) | idem + select mov 2/3 | si | migrated | CAP-042 | paridad-exacta | critical |
| LEG-043 | Crear guia variante movimiento 4 (recepcion) | idem + select mov 4 | si | migrated | CAP-041 | paridad-exacta | critical |
| LEG-044 | Crear guia variante movimiento 5 | idem + select mov 5 | medium | migrated | CAP-043 | paridad-exacta | medium |
| LEG-045 | Validacion condicional por movimiento (campos obligatorios distintos) | Form dinamico | si | migrated | n/a (parte de CAP-040..043) | paridad-exacta | critical |
| LEG-046 | OTRA CANCHA + origenCustom/destinoCustom | Select origen/destino === id hardcoded | si | migrated | CAP-044 | paridad-exacta | high |
| LEG-047 | Editar guia (preserva ingresoPlanta/Romana/salida) | Modal en /app/guides | si | migrated | CAP-050 | paridad-exacta + DEC-009 | critical |
| LEG-048 | Anular guia (cambiar VIGENTE → NULA) | Boton en /app/guides | si | migrated | CAP-051 | paridad-exacta | critical |
| LEG-049 | Restaurar guia (NULA → VIGENTE, valida no duplicado) | Boton en /app/guides | si | migrated | CAP-052 | paridad-exacta | high |
| LEG-050 | Eliminar guia (hard delete) | Boton en /app/guides | medio | migrated | CAP-053 | paridad-exacta (decidir soft-delete?) | high |
| LEG-051 | Autocomplete OTRA CANCHA por regex | GET /guia-customs | medio | migrated | CAP-031 | paridad-exacta | medium |

### Operacion rumas

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-060 | Listar rumas con datos enriquecidos (volumenes calculados al vuelo) | Vista /app/rumas | si | migrated | CAP-060 | paridad-exacta | critical |
| LEG-061 | Crear ruma (numero unico por cancha activa) | Vista /app/rumas-create | si | migrated | CAP-061 | paridad-exacta | critical |
| LEG-062 | Editar ruma (numero inmutable; cambia especie/estado/cancha) | Modal | si | migrated | CAP-062 | paridad-exacta | high |
| LEG-063 | Toggle estado ruma (binario) | Boton | si | migrated | CAP-063 | paridad-exacta (decidir explicitar a/b) | high |
| LEG-064 | Subir imagen de ruma con extraccion GPS via exif-parser | Modal upload | si | migrated | CAP-065 | mejora-deliberada (sharp + S3) DEC-005 | high |
| LEG-065 | Reset GPS de ruma (no borra archivo) | Boton | medio | migrated | CAP-066 | mejora-deliberada (borrar archivo huerfano) | medium |
| LEG-066 | Ver guias asociadas a ruma + sumatorio ajustes | Modal | si | migrated | CAP-064 | paridad-exacta | high |
| LEG-067 | Ver mapa de rumas activas (filtro hardcoded estadoRuma id) | Vista /app/rumas con mapa | si | migrated | CAP-067 | paridad-exacta (con cache de IDs) | high |
| LEG-068 | Verificar rumas duplicadas (rumas-duped) | GET /rumas-duped | low | migrated | CAP-068 | paridad-exacta | low |

### Ajustes (ADMIN-only)

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-070 | Listar ajustes paginados con filtros | Vista /app/ajustes | si | migrated | CAP-120 | paridad-exacta + DEC-001 (roles ampliados?) | high |
| LEG-071 | Crear ajuste individual ADD/REDUCE | Form | si | migrated | CAP-130 | paridad-exacta + DEC-001 | high |
| LEG-072 | Carga batch desde Excel (POST /ajustes-load) | Vista /app/ajustes/load | si | migrated | CAP-121 | paridad-exacta + DEC-001 + DEC-013 (async vs sync) | critical |
| LEG-073 | Validar batch sin guardar (POST /guia-ajustes-validate-batch) | Vista | si | migrated | CAP-122 | paridad-exacta (naming confuso) DEC-013 | high |
| LEG-074 | Listar batches con count y fecha | Vista | medio | migrated | CAP-123 | paridad-exacta | medium |
| LEG-075 | Eliminar batch completo (deleteMany) | Boton | si | migrated | CAP-124 | paridad-exacta (decidir soft-delete?) | high |

### MII (Modulo Informacion Industrial)

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-080 | Cargar archivo MII de un periodo (write/update) | Vista /app/importer | si | migrated | CAP-110 | paridad-exacta | critical |
| LEG-081 | Verificar estado de MII cargados (GET /file/miis-check) | Vista | si | migrated | CAP-112 | paridad-exacta | high |
| LEG-082 | Listar ultimos 3 MIIs | GET /file/miis | medio | migrated | CAP-113 | paridad-exacta | medium |
| LEG-083 | Descargar MII como CSV (GET /file/mii/:periodo) | Boton | medio | migrated | CAP-114 | paridad-exacta | medium |
| LEG-084 | Disparar enriquecimiento de guias con datos MII (POST /guia-extra-data) | Boton + socket progreso | si | migrated | CAP-111 | paridad-exacta (mantener socket `saving`) | critical |

### Reportes y stats

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-090 | Generar reporte Excel guias (~50 columnas) | Modal en /app/reports | si | migrated | CAP-070 | paridad-exacta + DEC-010 (cleanup auto) | high |
| LEG-091 | Generar reporte Excel rumas | idem | si | migrated | CAP-071 | paridad-exacta | high |
| LEG-092 | Listar ultimos 3 reportes del usuario | GET /reports | medio | migrated | CAP-073 | paridad-exacta | medium |
| LEG-093 | Descargar archivo de reporte | GET /report/file?name=X | si | migrated | CAP-074 | paridad-exacta (verificar shape ?name vs path) DEC-013 | high |
| LEG-094 | Dashboard con 5 graficos (Stats.vue) | Vista /app/stats | si | migrated | CAP-005 | paridad-exacta | high |

---

## Legacy Features — Rol: SUPERVISOR

### Auth & sesion

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-100 | Login | idem ADMIN | si | migrated | CAP-001 | paridad-exacta | critical |
| LEG-101 | Cambio cancha (puede `'ALL'`) | idem | si | migrated | CAP-002 | paridad-exacta | high |
| LEG-102 | Cambio password propio | idem | si | migrated | CAP-003 | paridad-exacta | medium |

### Gestion de RECEPTOREs

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-110 | Listar usuarios FILTRADOS a solo RECEPTOR | Vista /app/users | si | migrated | CAP-080-S | paridad-exacta (RULE-AUTH-004) | critical |
| LEG-111 | Crear RECEPTOR (NO puede crear ADMIN) | Form en /app/users | si | migrated | CAP-081-S | paridad-exacta + RULE-AUTH-003 | critical |
| LEG-112 | Editar RECEPTOR (rol, cancha) | Modal | si | migrated | CAP-082-S | paridad-exacta | high |
| LEG-113 | Activar/desactivar RECEPTOR | Toggle | si | migrated | CAP-083-S | paridad-exacta | high |

### Operacion (lectura + status guia)

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-120 | Ver listado de guias (todas, sin scope) | Vista /app/guides | si | migrated | CAP-030-S | paridad-exacta | high |
| LEG-121 | Anular / restaurar guia (PATCH /guia-status sin requireRole) | Boton | si | migrated | CAP-051 | DEC-014 pendiente (preservar hueco o restringir) | high |
| LEG-122 | Ver listado de rumas | Vista /app/rumas | si | migrated | CAP-060-S | paridad-exacta | medium |

### Reportes y stats

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-130 | Generar reporte | idem ADMIN | si | migrated | CAP-070 | paridad-exacta | high |
| LEG-131 | Dashboard | idem | si | migrated | CAP-005 | paridad-exacta | medium |

---

## Legacy Features — Rol: RECEPTOR

### Auth & sesion

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-200 | Login (verifica que cancha != `'ALL'`) | Form | si | migrated | CAP-001 | paridad-exacta + RULE-AUTH-002 | critical |
| LEG-201 | Cambio cancha (entre canchas reales, NO `'ALL'`) | NavLayout | si | migrated | CAP-002 | paridad-exacta + RULE-AUTH-002 | critical |
| LEG-202 | Cambio password propio | Vista /password | si | migrated | CAP-003 | paridad-exacta | medium |

### Operacion guias (su cancha)

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-210 | Listar guias filtradas por cancha (origen O destino === user.cancha) | Vista /app/guides | si | migrated | CAP-030-R | paridad-exacta (scope cancha) | critical |
| LEG-211 | Crear guia movimiento 1 (compra de proveedor) | Vista crear + mov 1 | si | migrated | CAP-040-R | paridad-exacta + DEC-009 + RULE-GUIA-003 | critical |
| LEG-212 | Crear guia movimiento 4 (recepcion) | idem mov 4 | si | migrated | CAP-041-R | paridad-exacta | critical |
| LEG-213 | Crear guia movimiento 2/3 (despacho) | idem | si | migrated | CAP-042-R | paridad-exacta | critical |
| LEG-214 | Editar guia (preserva ingresoPlanta/Romana/salida) | Modal | si | migrated | CAP-050-R | paridad-exacta + DEC-009 | critical |
| LEG-215 | Anular guia | Boton | si | migrated | CAP-051-R | paridad-exacta | high |
| LEG-216 | Eliminar guia | Boton | medio | migrated | CAP-053-R | paridad-exacta | high |
| LEG-217 | OTRA CANCHA + custom | Select origen/destino | si | migrated | CAP-044 | paridad-exacta + RULE-GUIA-004 | high |

### Operacion rumas (su cancha)

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-220 | Listar rumas de su cancha | Vista | si | migrated | CAP-060-R | paridad-exacta | critical |
| LEG-221 | Crear ruma (numero unico por cancha) | Vista | si | migrated | CAP-061-R | paridad-exacta + RULE-RUMA-002 | critical |
| LEG-222 | Editar ruma (numero inmutable) | Modal | si | migrated | CAP-062-R | paridad-exacta + RULE-RUMA-001 | high |
| LEG-223 | Toggle estado ruma | Boton | si | migrated | CAP-063-R | paridad-exacta | high |
| LEG-224 | Subir imagen + GPS automatico | Modal | si | migrated | CAP-065-R | mejora-deliberada DEC-005 | high |
| LEG-225 | Reset GPS | Boton | medio | migrated | CAP-066-R | paridad-exacta | medium |
| LEG-226 | Ver guias asociadas a ruma + sumatorio | Modal | si | migrated | CAP-064-R | paridad-exacta | high |
| LEG-227 | Ver mapa de rumas (su cancha) | Vista mapa | si | migrated | CAP-067-R | paridad-exacta + RULE-RUMA-003 | high |

### Ajustes (DELTA-CUESTIONABLE)

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-230 | Crear ajuste individual | Vista (NO accesible en legacy) | n/a | new-in-nuxt? | CAP-130-R | DEC-001 pendiente | high |
| LEG-231 | Carga batch ajustes | Vista (NO accesible en legacy) | n/a | new-in-nuxt? | CAP-121-R | DEC-001 pendiente | high |

### Reportes

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-240 | Generar reporte de su cancha | Vista | si | migrated | CAP-070-R | paridad-exacta | high |
| LEG-241 | Dashboard con 5 graficos | Vista /app/stats | si | migrated | CAP-005-R | paridad-exacta | medium |

---

## Legacy Features — Rol: CONSULTOR

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-300 | Login | Form | si | migrated | CAP-001 | paridad-exacta | critical |
| LEG-301 | Cambio cancha (puede `'ALL'`) | NavLayout | si | migrated | CAP-002 | paridad-exacta | high |
| LEG-302 | Cambio password propio | Vista | si | migrated | CAP-003 | paridad-exacta | medium |
| LEG-303 | Listar guias (todas, sin scope) | Vista | si | migrated | CAP-030-C | paridad-exacta | high |
| LEG-304 | Ver detalle de guia | Click | si | migrated | CAP-031-C | paridad-exacta | medium |
| LEG-305 | Anular / restaurar guia (hueco legacy) | Boton | medio | migrated | CAP-051-C | DEC-014 pendiente | medium |
| LEG-306 | Listar rumas | Vista | si | migrated | CAP-060-C | paridad-exacta | medium |
| LEG-307 | Ver guias asociadas a ruma | Modal | medio | migrated | CAP-064-C | paridad-exacta | medium |
| LEG-308 | Generar reporte | Vista | si | migrated | CAP-070-C | paridad-exacta | high |
| LEG-309 | Dashboard | Vista | si | migrated | CAP-005-C | paridad-exacta | medium |

---

## Legacy Features — Rol: ASESOR

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk |
|-----|-------|---------|----------|-------------|-----|----------|------|
| LEG-400 | Login (en tablet/mobile) | Form | si | migrated | CAP-001 | paridad-exacta | critical |
| LEG-401 | Cambio password propio | Vista | si | migrated | CAP-003 | paridad-exacta | medium |
| LEG-402 | Default route post-login: /app/asesor-stats | router beforeEach | si | migrated-with-redirect | CAP-005-Z | DEC-011 + DEC-012 (redirect 301 a /stats) | high |
| LEG-403 | Vista dedicada de stats asesor (subset graficos) | /app/asesor-stats | si | retired (reemplazada por /stats con feature subset) | CAP-005-Z | DEC-011-vistas-unificadas-asesor | critical |
| LEG-404 | Vista dedicada de rumas asesor (sin botones CRUD) | /app/asesor-ruma-list | si | retired (reemplazada por /rumas con feature subset) | CAP-060-Z | DEC-011 + DEC-012 | critical |
| LEG-405 | Ver mapa de rumas activas con GPS | Componente mapa | si | migrated | CAP-067-Z | paridad-exacta | critical |
| LEG-406 | Subir imagen + GPS | Modal | si | migrated | CAP-065-Z | paridad-exacta + DEC-005 | critical |
| LEG-407 | Reset GPS | Boton | medio | migrated | CAP-066-Z | paridad-exacta | medium |
| LEG-408 | Ver guias asociadas a ruma | Modal | medio | migrated | CAP-064-Z | paridad-exacta | medium |

---

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status |
|---|------|-------|------------|-------|------------|--------|
| 1 | Validar inventario legacy completo (cruzar contra NavLayout.vue por rol) | researcher | — | spec actualizado | 100% rutas legacy listadas | pending |
| 2 | Para cada `LEG-*`, asignar `nuxt_capability` (CAP-*) o crear DEC de retiro | architect | #1 | spec + decisions/ | 0 LEG huerfanas | pending |
| 3 | Cruzar matriz CAP x rol contra `SPEC-role-journeys.md` | reviewer | #2 | reports/cap-coverage.md | sin gaps por rol | pending |
| 4 | Para cada CAP `risk_if_lost: critical`, generar TC en spec migration-tdd | architect | #2 | SPEC-migration-tdd actualizado | TCs cubren todas las critical | pending |
| 5 | **Auditoría de cobertura E2E vs CAPs/LOGICs** (sin entrevistas — DEC-021): por cada CAP-* en SPEC-role-capabilities-matrix y LOGIC-* crítico en SPEC-business-logic-parity, verificar existencia de TC E2E en `tests/e2e/migration-paridad/`. Para gaps → escribir TC red basado en **lectura directa del legacy** (RULE-MIGRATION-004), no inferido del nuxt. Tests E2E nuxt existentes (`*-flows.spec.ts`) marcar con header `@needs-legacy-audit` hasta validarse | architect + developer | #1, #3 | gap report + tests/, headers en specs existentes | gap report con 0 críticos sin TC + headers `@needs-legacy-audit` aplicados | pending |

## Constraints

- Inventario debe ser exhaustivo. Cualquier feature legacy faltante = bug silencioso post-migracion.
- DELTAs cuestionables (DEC-001, DEC-005, DEC-013, DEC-014) deben resolverse antes de cerrar el inventario.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `pehuen-client/src/views/` | external (consult) | inventario via vistas del cliente legacy | sin esto, gaps |
| `pehuen-server/src/controllers/` | external (consult) | inventario via endpoints del servidor legacy | idem |
| `pehuen-client/docs/02-views/` | external | docs legacy ya producidas | acelera inventario |
| ~~usuarios reales (entrevistas)~~ | — | rechazado por DEC-021: sin capacidad de entrevistas | — |

## Acceptance checkpoints

- [ ] **Cobertura de rutas**: 100% rutas legacy de `pehuen-client/src/router/index.ts` cubiertas por `LEG-*`.
- [ ] **Cobertura de menu por rol**: cada rol tiene LEG-* para cada item de su menu en NavLayout.vue.
- [ ] **Decision por LEG**: 0 con `migration_decision: pending`.
- [ ] **CAPs huerfanas**: 0 LEG sin `nuxt_capability` ni `decision_ref` (retiro).
- [ ] **Risk critical**: todas las features critical PASS en suite migration-tdd.
- [x] ~~**Entrevistas**~~ → rechazado por [DEC-021](../decisions/DEC-021-validacion-flujos-via-legacy-y-canary.md). Validación se hace por: (a) lectura directa del legacy (RULE-MIGRATION-004), (b) cobertura E2E TDD, (c) canary 1 semana (DEC-018).
