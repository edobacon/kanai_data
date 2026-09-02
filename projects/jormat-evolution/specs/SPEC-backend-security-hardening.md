---
id: SPEC-backend-security-hardening
project: jormat-evolution
ticket: JOR-012
status: done
---

# Hardening de seguridad backend — complementos aditivos + reporte de riesgos heredados (A7)

# Hardening de seguridad backend — complementos aditivos + reporte de riesgos heredados (A7)

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. El detalle tecnico vive en Requirements, Tasks y Technical reference.*

**Que se quiere**: cerrar la Capa A agregando las defensas de seguridad que faltan en el backend, SIN reescribir el codigo entregado. Tres frentes: (1) registrar `helmet`, rate limiting (`@nestjs/throttler` con Redis) y CORS por env en el bootstrap; (2) validar las variables de entorno al arrancar para que produccion rechace secretos debiles; (3) producir el reporte de riesgos heredados dirigido al dueno de la estructura (O-1..O-18 que no nos toca corregir). Las dependencias ya estan instaladas — falta cablearlas. El seed admin personal que agregamos en el working tree (O-15) se endurece aqui porque es nuestro.

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Agregar `zod` como dep de runtime del backend para validar env (no estaba instalado) | Nueva dependencia + rebuild del contenedor backend; alternativa era Joi o validacion a mano |
| 2 | Throttler usa Redis storage SOLO si `REDIS_URL` esta presente; si no, cae a storage en memoria | Permite que tests y dev sin Redis levantado no rompan; produccion usa Redis compartido entre instancias |
| 3 | El seed `02_local_admin.ts` se gatea con flag explicito opt-in `ENABLE_DEV_ADMIN_SEED` (ademas del guard de prod ya presente) | Evita que un seed con datos personales corra por accidente; A7.7 pide "quitar o proteger definitivamente" |
| 4 | Los riesgos heredados (O-1,O-2,O-3,O-4 fallback,O-5,O-6,O-7,O-16,O-18) van a un REPORTE, no se parchean | RULE-global-003: el codigo entregado no se modifica; corregirlos es decision del dueno |

**Riesgos principales y como los mitigamos**:

- **Agregar `zod` y romper el build del contenedor** (node_modules horneado en la imagen) → S2 valida con rebuild real del contenedor backend (`./run.sh build` o equivalente), no solo build en host. Memoria: jormat-front hornea node_modules.
- **helmet/throttler bloqueando endpoints legitimos** (health, Swagger en dev) → smoke supertest en S1 verifica que `/api/health` y Swagger siguen respondiendo; CSP de helmet se configura permisivo para Swagger en no-prod.
- **CORS rompiendo el front en dev** → `CORS_ORIGIN` configurable por env, documentado en `.env.example`; el default deja de ser `*` pero dev usa el origen del front.
- **Validacion de env bloqueando dev/test** → el schema solo RECHAZA secretos debiles cuando `NODE_ENV=production`; en dev/test valida formato pero no bloquea el arranque por secretos de demo.

**Que NO se hace en este ticket** (limites del scope):

- Reescribir o parchear los endpoints entregados (workspaces PATCH O-2, users projection O-5, delete atomico O-6, etc.) — van al reporte. RULE-global-003.
- Activar la RLS real (O-1) — exige modificar `database.module`, middleware y rol de conexion; es decision del dueno (opciones A/B/C en el reporte). DEC-001.
- Reemplazar la validacion JWT artesanal (O-16) ni cambiar el patron idToken-as-bearer (O-18) — reporte.
- Aplicar `@RequireCapability` a endpoints nuevos (A7.4): este ticket no crea endpoints, solo complementos en el bootstrap.

**Tamano estimado**: 3 sessions, ~4-6h efectivas. La mas riesgosa es S2 (dep nueva + rebuild de contenedor + logica de validacion de env que debe distinguir prod de dev/test).

**Como vas a saber que funciona**:

- `curl -I` a cualquier endpoint devuelve headers de helmet (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, etc.).
- Golpear un endpoint mas de N veces seguidas devuelve `429 Too Many Requests`.
- Una request con `Origin` no autorizado NO recibe `Access-Control-Allow-Origin: *`.
- Arrancar con `NODE_ENV=production` y `ADMIN_TOKEN=jormat-internal-admin` (debil) hace fallar el boot con mensaje claro.
- Existe `jormat_docs/backend/security-report-inherited.md` con cada observacion heredada, su impacto, archivo:linea y remediacion recomendada.

---

## Purpose

Agregar la capa de hardening aditiva al bootstrap NestJS (helmet, throttler con Redis, CORS por env, validacion de env al boot) sin tocar la logica entregada, y documentar formalmente los riesgos heredados para el dueno de la estructura. Cierra la Capa A del epic jormat-v1: el backend queda con las defensas de borde minimas para habilitar las Fases B/C.

## Requirements

### REQ-01: Security headers via helmet

> **Que cambia**: toda respuesta del API pasa a incluir los headers de seguridad de helmet (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.). Antes no habia ninguno.
> **Por que**: el backend entregado no setea headers de seguridad; helmet ya estaba instalado pero sin registrar.

El sistema MUST registrar `helmet()` como middleware global en el bootstrap, de forma aditiva (sin modificar handlers entregados). La configuracion de CSP MUST permitir que Swagger UI cargue en entornos no-prod.

**Actor**: system
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: headers presentes en respuesta
- **GIVEN** la API levantada
- **WHEN** un cliente hace GET a `/api/health`
- **THEN** la respuesta incluye `X-Content-Type-Options: nosniff` y `X-Frame-Options`

#### Scenario: Swagger sigue cargando en dev
- **GIVEN** `NODE_ENV !== production`
- **WHEN** se abre `/docs`
- **THEN** Swagger UI carga sin bloqueo por CSP

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `curl -I` a cualquier endpoint y ve los headers de helmet.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | helmet headers | API up | GET /api/health | headers presentes | `x-content-type-options: nosniff` |
| 2 | swagger no roto | dev | GET /docs | 200 | HTML de Swagger |

### REQ-02: Rate limiting global con Redis storage

> **Que cambia**: el API empieza a limitar la tasa de requests por cliente; al exceder el limite devuelve `429`. Antes no habia rate limiting (O-13: Redis provisionado sin uso).
> **Por que**: requirements-and-stack §1.3 exige rate limiting; mitiga abuso/fuerza bruta sobre auth.

El sistema MUST registrar `ThrottlerModule` con un `ThrottlerGuard` global (APP_GUARD), con TTL y limite configurables por env (constantes con defaults sensatos, sin magic numbers). El storage MUST ser Redis (`@nest-lab/throttler-storage-redis` via `REDIS_URL`) cuando `REDIS_URL` este definida; si no, MUST caer a storage en memoria (default) para no romper dev/test sin Redis.

**Actor**: system
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: 429 al exceder el limite
- **GIVEN** TTL y limite configurados (ej. 100/min)
- **WHEN** un cliente excede el limite en la ventana
- **THEN** la respuesta es `429 Too Many Requests`

#### Scenario: storage en memoria sin Redis
- **GIVEN** `REDIS_URL` no definida (entorno de test)
- **WHEN** la app arranca
- **THEN** el throttler usa storage en memoria y no intenta conectar a Redis

#### Scenario: storage Redis en prod
- **GIVEN** `REDIS_URL=redis://redis:6379`
- **WHEN** la app arranca
- **THEN** el throttler usa `ThrottlerStorageRedis`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: golpear un endpoint en loop y obtener `429` al pasar el limite.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | rate limit | limite=N | N+1 requests | ultimo bloqueado | `429` |
| 2 | memoria sin redis | sin REDIS_URL | boot | sin conexion redis | app arranca OK |

### REQ-03: CORS restringido por env (sin `*`)

> **Que cambia**: el origen permitido por CORS deja de ser `*` por defecto y pasa a configurarse explicitamente por env (`CORS_ORIGIN`). Antes `main.ts:12` usaba `process.env.CORS_ORIGIN || '*'`.
> **Por que**: RULE-global-002 S4 — CORS restringido a origen por env, nunca `*` en produccion.

El sistema MUST configurar CORS leyendo el/los origen(es) permitidos desde `CORS_ORIGIN` (lista separada por comas). El sistema MUST NOT usar `*` como fallback. En produccion, si `CORS_ORIGIN` no esta definida, MUST fallar (lo cubre REQ-04 via validacion de env) o no habilitar ningun origen cross-site.

**Actor**: system
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: origen autorizado
- **GIVEN** `CORS_ORIGIN=https://app.jormat.dev`
- **WHEN** request con `Origin: https://app.jormat.dev`
- **THEN** la respuesta incluye `Access-Control-Allow-Origin: https://app.jormat.dev`

#### Scenario: origen no autorizado
- **GIVEN** `CORS_ORIGIN=https://app.jormat.dev`
- **WHEN** request con `Origin: https://evil.example`
- **THEN** la respuesta NO incluye `Access-Control-Allow-Origin: *` ni el origen no autorizado

</details>

#### Acceptance
**El usuario puede verificar que funciona**: request con `Origin` arbitrario no recibe `Access-Control-Allow-Origin: *`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | origen ok | CORS_ORIGIN seteado | Origin autorizado | header con origen | `Access-Control-Allow-Origin: <origen>` |
| 2 | origen malo | CORS_ORIGIN seteado | Origin no autorizado | sin `*` | no `Access-Control-Allow-Origin: *` |

### REQ-04: Validacion de env al boot

> **Que cambia**: al arrancar, el backend valida sus variables de entorno contra un schema; en `NODE_ENV=production` rechaza secretos vacios/debiles (`ADMIN_TOKEN`, `DB_PASSWORD`, etc.) y aborta el boot con mensaje claro. Antes `ConfigModule.forRoot` no validaba nada.
> **Por que**: RULE-global-002 S3 — secretos fuertes obligatorios en produccion; mitiga el lado nuestro de O-4 (fallback `jormat-internal-admin`).

El sistema MUST validar las variables de entorno al boot con un schema (`zod`) cableado via `ConfigModule.forRoot({ validate })`. En `NODE_ENV=production` el schema MUST rechazar: `ADMIN_TOKEN` ausente/vacio/igual al default debil `jormat-internal-admin`, `DB_PASSWORD` ausente/vacio, y `CORS_ORIGIN` ausente o `*`. En dev/test el schema MUST validar formato pero MUST NOT bloquear el arranque por secretos de demo.

**Actor**: system
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: boot falla con secreto debil en prod
- **GIVEN** `NODE_ENV=production` y `ADMIN_TOKEN=jormat-internal-admin`
- **WHEN** la app arranca
- **THEN** el boot falla con error que nombra la variable invalida

#### Scenario: boot pasa con secreto fuerte en prod
- **GIVEN** `NODE_ENV=production` y secretos fuertes
- **WHEN** la app arranca
- **THEN** el boot procede normalmente

#### Scenario: dev no bloquea
- **GIVEN** `NODE_ENV=development` y secretos de demo
- **WHEN** la app arranca
- **THEN** el boot procede (warning opcional, sin abortar)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: arrancar con `NODE_ENV=production` + secreto debil → el proceso aborta con mensaje claro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | prod + debil | NODE_ENV=production, ADMIN_TOKEN debil | validate(env) | throw | error nombra ADMIN_TOKEN |
| 2 | prod + fuerte | NODE_ENV=production, secretos fuertes | validate(env) | ok | env parseado |
| 3 | dev + demo | NODE_ENV=development | validate(env) | ok | no throw |

### REQ-05: Seed admin personal protegido (O-15)

> **Que cambia**: el seed `02_local_admin.ts` (nuestro, con datos personales por env) solo corre si se opta explicitamente via `ENABLE_DEV_ADMIN_SEED=true`, ademas del guard de produccion ya presente.
> **Por que**: A7.7 pide quitar o proteger definitivamente el seed personal antes de commitear; O-15 es nuestro.

El sistema MUST gatear la ejecucion del seed `02_local_admin.ts` tras un flag explicito opt-in (`ENABLE_DEV_ADMIN_SEED`), manteniendo el guard `NODE_ENV !== production` existente. El repo MUST NOT contener un `.env` con el OID/email personal real committeado; `.env.example` documenta el flag y las vars sin valores reales.

**Actor**: system
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed no corre sin opt-in
- **GIVEN** `ENABLE_DEV_ADMIN_SEED` ausente
- **WHEN** se corren los seeds en dev
- **THEN** `02_local_admin.ts` retorna temprano sin insertar

#### Scenario: seed corre con opt-in en dev
- **GIVEN** `NODE_ENV=development`, `ENABLE_DEV_ADMIN_SEED=true`, `DEV_ADMIN_OID`/`DEV_ADMIN_EMAIL` seteados
- **WHEN** se corren los seeds
- **THEN** inserta el admin personal

</details>

#### Acceptance
**El usuario puede verificar que funciona**: correr seeds sin `ENABLE_DEV_ADMIN_SEED` → el admin personal no se inserta.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | sin opt-in | flag ausente | seed run | early return | sin insert |
| 2 | con opt-in | flag=true + env | seed run | insert | admin personal creado |

### REQ-06: Reporte de riesgos heredados al dueno

> **Que cambia**: se produce un documento formal dirigido al dueno de la estructura entregada con cada riesgo heredado, su impacto, archivo:linea y remediacion recomendada.
> **Por que**: A7.6 + RULE-global-003 — los defectos del codigo entregado se reportan, no se parchean; DEC-001 (RLS heredada se reporta).

El sistema (nosotros) MUST producir `jormat_docs/backend/security-report-inherited.md` cubriendo O-1, O-2, O-3, O-4 (fallback en codigo), O-5, O-6, O-7, O-16, O-18, cada uno con: descripcion, impacto, `archivo:linea`, y opcion de remediacion recomendada. Para O-1 MUST incluir las opciones A/B/C de `tenant-isolation.md`. El reporte MUST ser trazable a `observations/README.md`.

**Actor**: system (autor) / dueno de la estructura (lector)
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: existe el reporte con las 9 observaciones, cada una con remediacion recomendada y referencia de codigo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | cobertura | observations O-1..O-18 | leer reporte | 9 obs heredadas presentes | O-1,O-2,O-3,O-4,O-5,O-6,O-7,O-16,O-18 |
| 2 | O-1 opciones | tenant-isolation A/B/C | leer seccion O-1 | 3 opciones | A, B, C descritas |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | Headers de seguridad en toda respuesta | helmet headers presentes | 100% de respuestas |
| Security | Rate limiting activo | requests sobre limite | `429` |
| Security | CORS sin wildcard | `Access-Control-Allow-Origin` | nunca `*` |
| Security | Secretos fuertes en prod | boot con secreto debil | aborta |

## Tasks

### Session 1 — Complementos aditivos al bootstrap (helmet + throttler + CORS) [tipo: auto] [tier: T2]

> Ejecucion secuencial: S1.T1 (helmet) y S1.T3 (CORS) tocan ambas `main.ts` → comparten archivo → no paralelizables (condicion (a) de la heuristica). Sin `parallel_groups`.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Registrar `helmet()` global en el bootstrap (CSP permisiva para Swagger en no-prod) | REQ-01 | developer | — | backend/jormat-api/src/main.ts | smoke supertest TC-01 | git revert | DET-5, DET-8, RULE-global-002, RULE-global-003 | done | 1 |
| S1.T2 | Registrar `ThrottlerModule` (storage Redis si `REDIS_URL`, si no memoria) + `ThrottlerGuard` global (APP_GUARD); constantes TTL/limit por env | REQ-02 | developer | — | backend/jormat-api/src/app.module.ts, backend/jormat-api/src/common/security/throttler.config.ts | smoke supertest TC-02 | git revert | DET-5, DET-8, RULE-global-001, RULE-global-002 | done | 1 |
| S1.T3 | CORS por env sin `*`: leer `CORS_ORIGIN` (lista por comas) en main.ts + documentar en `.env.example` | REQ-03 | developer | — | backend/jormat-api/src/main.ts, backend/jormat-api/.env.example | smoke supertest TC-03 | git revert | DET-5, DET-8, RULE-global-002 | done | 1 |
| S1.T4 | Smoke tests supertest: helmet headers, 429 al exceder rate, CORS sin `*` con origen no autorizado | REQ-01, REQ-02, REQ-03 | developer | S1.T1, S1.T2, S1.T3 | backend/jormat-api/src/common/security/security.smoke.spec.ts | jest run | git revert | DET-7, DET-13, RULE-global-001 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions` del ticket, correr jest + coverage delta, quality review 10-dims (standard), mutation async warn-first, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-31 | done | 1 |

### Session 2 — Validacion de env al boot + hardening seed O-15 [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar `zod` como dep del backend + crear schema de validacion de env (`src/config/env.validation.ts`): rechaza secretos debiles/vacios en `NODE_ENV=production`, valida formato en dev/test | REQ-04 | developer | S1.GATE | backend/jormat-api/package.json, backend/jormat-api/src/config/env.validation.ts | jest unit TC-04 | git revert + npm uninstall zod | DET-1, DET-2, DET-8, RULE-global-002 | done | 2 |
| S2.T2 | Cablear `ConfigModule.forRoot({ validate })` en app.module con el schema; constantes de mensajes/longitudes (sin magic strings) | REQ-04 | developer | S2.T1 | backend/jormat-api/src/app.module.ts | jest unit TC-04 | git revert | DET-5, DET-8, RULE-global-001, RULE-global-002 | done | 2 |
| S2.T3 | Jest unit del schema: boot falla con secreto debil en prod, pasa con fuerte, dev no bloquea | REQ-04 | developer | S2.T2 | backend/jormat-api/src/config/env.validation.spec.ts | jest run | git revert | DET-7, DET-13 | done | 2 |
| S2.T4 | Reforzar `02_local_admin.ts` con flag opt-in `ENABLE_DEV_ADMIN_SEED` (ademas del guard prod); documentar en `.env.example`; verificar que no hay `.env` con datos personales committeado | REQ-05 | developer | — | backend/jormat-api/seeds/02_local_admin.ts, backend/jormat-api/.env.example | jest unit TC-05 + grep git | git revert | DET-5, DET-8, RULE-global-002 | done | 2 |
| S2.T5 | Hardening de tests (DET-31, survivors S1.GATE): fijar assertions de `resolveCorsOrigins` (empty-string, limite trim, rama prod) y assertion de helmet CSP off en no-prod para matar mutantes sobrevivientes | REQ-03, REQ-01 | developer | S1.GATE | backend/jormat-api/src/common/security/security.smoke.spec.ts | jest run + mutation re-run | git revert | DET-7, DET-31 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — persistir, correr jest + coverage, quality review (standard), **verificar rebuild del contenedor backend tras agregar zod** (RULE-global-004), mutation async warn-first sobre el schema de env + re-check survivors S1, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5 | ticket | gate persistido + decision + build en contenedor real | (no aplica) | DET-20, DET-23, DET-31 | done | 2 |

### Session 3 — Reporte de riesgos heredados al dueno [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Producir `security-report-inherited.md`: O-1 (con opciones A/B/C), O-2, O-3, O-4 fallback, O-5, O-6, O-7, O-16, O-18 — cada uno descripcion/impacto/archivo:linea/remediacion. Trazable a observations/README.md | REQ-06 | developer | — | jormat_docs/backend/security-report-inherited.md | manual: 9 obs presentes + links | git revert (del doc) | DET-1, DET-2, DET-16, RULE-global-003 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T0) — persistir, validar cobertura del reporte (9 obs + remediaciones + refs), decidir continue (→ close) | — | reviewer | S3.T1 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

### Task contract (detalle de las tasks no triviales)

```
Task S1.T2: ThrottlerModule + guard global
- source_ref: REQ-02
- agent: developer
- files: src/app.module.ts, src/common/security/throttler.config.ts
- precondition: deps @nestjs/throttler + @nest-lab/throttler-storage-redis + ioredis instaladas (confirmado en intake)
- expected_output: ThrottlerModule.forRootAsync con storage condicional a REDIS_URL; APP_GUARD = ThrottlerGuard; TTL/limit desde env con constantes default
- validation: supertest — N+1 requests devuelven 429; boot sin REDIS_URL no intenta conectar
- rollback: git revert
- rules: [DET-5, DET-8, RULE-global-001, RULE-global-002]
```

```
Task S2.T1: zod + env schema
- source_ref: REQ-04
- agent: developer
- files: package.json, src/config/env.validation.ts
- precondition: S1.GATE cerrado
- expected_output: funcion validate(config) que parsea con zod; en production rechaza ADMIN_TOKEN debil/vacio, DB_PASSWORD vacio, CORS_ORIGIN ausente/`*`; en dev/test no aborta
- validation: jest unit (3 casos: prod+debil throw, prod+fuerte ok, dev ok)
- rollback: git revert + npm uninstall zod
- rules: [DET-1, DET-2, DET-8, RULE-global-002]
```

```
Task S2.T4: hardening seed O-15
- source_ref: REQ-05
- agent: developer
- files: seeds/02_local_admin.ts, .env.example
- precondition: —
- expected_output: el seed retorna temprano salvo ENABLE_DEV_ADMIN_SEED=true (ademas del guard NODE_ENV!==production ya presente); .env.example documenta el flag; sin .env personal committeado
- validation: jest unit del guard del seed + grep git para confirmar que no hay datos personales en tracked files
- rollback: git revert
- rules: [DET-5, DET-8, RULE-global-002]
```

## Constraints

- RULE-global-001: DoD de calidad (clean code + tipado estricto + testing) verificado en cada session — aplica a todo codigo de complementos.
- RULE-global-002: linea base de seguridad — este spec la implementa directamente (S3 secretos fuertes, S4 CORS por env + inputs validados).
- RULE-global-003: el codigo entregado NO se modifica — los complementos son aditivos (bootstrap/app.module); los defectos heredados van al reporte (REQ-06), no se parchean. El seed `02_local_admin.ts` es NUESTRO (no entregado) → si se endurece.
- RULE-global-004: la validacion no termina en build verde — el stack dev debe levantar y la consola quedar sin errores; especialmente critico tras agregar `zod` (rebuild de contenedor).
- DEC-001: la RLS heredada (O-1) se reporta, no se modifica; en lo nuevo, filtrado disciplinado por workspace_id.
- DEC-006: modelo de permisos por capabilities — no afectado por este ticket (no crea endpoints).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Redis | internal | storage del throttler en prod (`REDIS_URL`) | si no esta levantado, throttler cae a memoria (degradado, no roto) |
| zod | external | validacion de env al boot (dep nueva) | rebuild del contenedor backend; si falla, S2 se bloquea hasta resolver |
| @nest-lab/throttler-storage-redis + ioredis | external | ya instaladas — storage Redis del throttler | ninguno (presentes) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Agregar zod rompe el build del contenedor (node_modules horneado) | medium | S2 bloqueada | rebuild real del contenedor en S2.GATE (RULE-global-004), no solo host |
| helmet CSP bloquea Swagger en dev | medium | dev pierde /docs | CSP permisiva en no-prod; smoke test verifica /docs 200 |
| CORS por env rompe el front en dev | low | front no conecta | CORS_ORIGIN documentado en .env.example con el origen del front dev |
| Validacion de env bloquea dev/test por secretos de demo | medium | dev no arranca | el schema solo aborta en NODE_ENV=production |
| Throttler con storage en memoria en multi-instancia prod | low | rate limit inconsistente | en prod REDIS_URL siempre presente → storage compartido |

## Open questions

- Ninguna abierta. Las decisiones de dep (zod) y de gating del seed se cierran en Decisions.

## Decisions

### DEC-LOCAL-01: Agregar `zod` para validacion de env
- **Contexto**: A7.2 pide validar env al boot; `zod` no estaba instalado, `@nestjs/config` si.
- **Drivers**: el scope del ticket nombra zod explicitamente; schema declarativo legible; dep pequena y sin deps transitivas pesadas.
- **Opcion elegida**: agregar `zod` como dep de runtime del backend y cablearlo via `ConfigModule.forRoot({ validate })`.
- **Alternativas**: (a) Joi — tampoco instalado, API menos type-safe; (b) validacion a mano sin lib — mas codigo, sin inferencia de tipos.
- **Consecuencias**: gana validacion type-safe y legible; cuesta una dep nueva + rebuild del contenedor backend.
- **Session**: S2.

### DEC-LOCAL-02: Throttler storage condicional a `REDIS_URL`
- **Contexto**: el throttler necesita storage; Redis esta provisionado pero tests/dev pueden no tenerlo levantado.
- **Drivers**: no romper tests/dev sin Redis; usar storage compartido en prod.
- **Opcion elegida**: `ThrottlerStorageRedis` si `REDIS_URL` definida; si no, storage en memoria (default del modulo).
- **Alternativas**: Redis siempre (rompe tests sin Redis); memoria siempre (inconsistente en multi-instancia prod).
- **Consecuencias**: dev/test simples; prod robusto. El comportamiento depende de env — documentar en .env.example.
- **Session**: S1.

### DEC-LOCAL-03: Gatear el seed personal con flag opt-in
- **Contexto**: A7.7 pide proteger definitivamente el seed `02_local_admin.ts`; ya tiene guard de prod + env-gated.
- **Drivers**: defensa en profundidad; evitar ejecucion accidental con datos personales.
- **Opcion elegida**: flag explicito `ENABLE_DEV_ADMIN_SEED` ademas del guard existente; no borrar el seed (util en dev).
- **Alternativas**: borrar el seed (pierde utilidad en dev); dejar como esta (no cumple "proteger definitivamente").
- **Consecuencias**: el seed solo corre con intencion explicita; .env.example documenta el flag.
- **Session**: S2.

## Technical reference

- **Bootstrap actual**: `backend/jormat-api/src/main.ts:9-34` — `NestFactory.create(AppModule)`, `setGlobalPrefix('api')`, `enableCors({ origin: process.env.CORS_ORIGIN || '*' })` (linea 12 — el `*` se elimina), `ValidationPipe({ whitelist, transform })`, `AllExceptionsFilter`, Swagger gated por `NODE_ENV !== production` (17-32), `listen(PORT || 4000)`.
- **app.module**: `backend/jormat-api/src/app.module.ts:12` — `ConfigModule.forRoot({ isGlobal: true })` (se le agrega `validate`). Sin ThrottlerModule, sin APP_GUARD.
- **Deps instaladas** (confirmadas en intake): `helmet@^8.2.0`, `@nestjs/throttler@^6.5.0`, `@nest-lab/throttler-storage-redis@^1.2.0`, `ioredis@^5.4.0`, `@nestjs/config@^4.0.0`. Falta: `zod`.
- **Redis (compose)**: `docker-compose.yml:21-29` + `docker-compose.dev.yml` — `redis:7-alpine`; `REDIS_URL: redis://redis:6379` inyectada al servicio api.
- **Seed O-15**: `backend/jormat-api/seeds/02_local_admin.ts:7-8` UUIDs fijos; `:12` guard `NODE_ENV==='production'`; `:14-20` lee `DEV_ADMIN_OID/EMAIL/NAME` de env + early-return si faltan. Se agrega gate `ENABLE_DEV_ADMIN_SEED`.
- **Test runner**: Jest 30 + ts-jest + supertest; `jest.config.ts` (rootDir `src`, testRegex `.*\.spec\.ts$`). Patron: `Test.createTestingModule(...).overrideGuard(AuthGuard).useValue(fakeAuthGuard)` + supertest (ver `src/users/users-admin.controller.spec.ts`).
- **Reporte insumo**: `jormat_docs/observations/README.md` (tabla O-1..O-18) + `jormat_docs/backend/tenant-isolation.md` (opciones A/B/C para O-1).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-06 pasan
- [ ] **Tests**: smoke supertest (S1) + jest unit env (S2) + jest unit seed (S2) escritos y pasando
- [ ] **NFRs**: helmet headers presentes, 429 al exceder rate, CORS sin `*`, boot aborta con secreto debil en prod
- [ ] **Rules**: RULE-global-001/002/003/004 respetadas (aditivo, no se toca lo entregado, stack dev levanta)
- [ ] **Integration**: build + tests verdes en el contenedor backend real (no solo host) tras agregar zod
- [ ] **Docs**: `security-report-inherited.md` con 9 observaciones heredadas + remediaciones + refs

## Archiving

Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-backend-security-hardening "razon"`.
