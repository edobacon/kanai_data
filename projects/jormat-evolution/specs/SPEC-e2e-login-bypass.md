---
id: SPEC-e2e-login-bypass
project: jormat-evolution
ticket: JOR-105
status: done
---

# Bypass de login dev/test-only para E2E y Playwright

# Bypass de login dev/test-only para E2E y Playwright

## Executive summary — lo que estas aprobando

**Que se quiere**: habilitar tests E2E HTTP autenticados y Playwright (browser) que hoy no pueden autenticarse, porque el AuthGuard exige un JWT RS256 real de Azure CIAM y no hay forma de obtenerlo sin login interactivo. Se agrega un camino de auth de test: el guard acepta, SOLO en no-prod, un token HS256 firmado con un secreto compartido, para un email de un dominio de test reservado.

**Decision de base entregada (RULE-global-003)**: este ticket SI modifica `auth.guard.ts` y `env.validation.ts` (base de auth, sensible). A diferencia de JOR-036 (que evito tocar el guard), aca el dev autorizo explicitamente el cambio porque es el nucleo del enfoque elegido. El cambio es aditivo (branch nuevo por `alg`), el path RS256/JWKS de produccion queda intacto.

**Decisiones criticas (ya fijadas con el dev)**:

| # | Decision | Por que |
|---|----------|---------|
| 1 | Enfoque A: token de test HS256 en un branch de `verifyToken`, gated | Aisla el bypass; el path RS256 no se toca; fail-closed en prod |
| 2 | Triple candado: `NODE_ENV !== production` + `ENABLE_E2E_LOGIN=true` + `E2E_AUTH_SECRET` presente | Ningun candado solo alcanza; en prod el path HS256 ni se evalua |
| 3 | Identidad restringida a dominio de test reservado (`e2e.jormat.test`) | Limita blast radius aunque el flag se prenda por error |
| 4 | Boot falla si `ENABLE_E2E_LOGIN=true` con `NODE_ENV=production` | Fail-closed explicito y ruidoso (coherente con JOR-012/A7.2) |

**Riesgo principal y mitigacion**: que el bypass quede activo en produccion. Mitigacion: (a) `e2eEnabled` se computa con `NODE_ENV !== production` en el guard, asi un token HS256 en prod se rechaza como 'Algoritmo no soportado'; (b) `env.validation` hace fallar el boot si el flag esta on en prod; (c) el secreto de test es HS256, algoritmo que el path de prod ni evalua. Test de regresion obligatorio para el fail-closed.

**Como vas a saber que funciona**:
- Con `ENABLE_E2E_LOGIN=true` + secreto (dev): un token HS256 firmado para `owner@e2e.jormat.test` autentica via el AuthGuard real; un e2e HTTP hace requests autenticados.
- En prod (o sin flag): el mismo token HS256 se rechaza (401). Boot falla si el flag esta on en prod.
- Playwright: entra a la app logueado sin tocar B2C, via el entry dev-login.

**Que NO se hace**: migrar los e2e actuales a HTTP (tickets propios); tocar el flujo real de MSAL/CIAM de prod; refresh tokens.

**Tamano estimado**: 3 sessions. S1 (backend seam) tier T3 (seguridad); S2 (endpoint + helper + e2e HTTP) T2; S3 (frontend dev-login + PW) T2.

---

## Purpose

Proveer un seam de autenticacion de test, imposible de habilitar en produccion, para que E2E HTTP y Playwright puedan autenticar como un usuario/rol sin login interactivo de Azure CIAM.

## Requirements

### REQ-1 — Token de test HS256 aceptado solo en no-prod (certainty: confirmed)
> Que cambia: `verifyToken` (auth.guard.ts) ramifica por `header.alg`. HS256 se verifica con `E2E_AUTH_SECRET` (HMAC) solo si `e2eEnabled`; RS256 sigue el path JWKS actual sin cambios.
> Por que: es el mecanismo del bypass, aislado del path de prod.

MUST: si `alg === 'HS256'` y `!e2eEnabled` -> rechazar ('Algoritmo no soportado'). MUST: si `alg === 'HS256'` y `e2eEnabled` -> verificar HMAC-SHA256 con `crypto.timingSafeEqual`, validar `exp`. MUST: el path RS256 no cambia su comportamiento.
source_ref: backend/jormat-api/src/auth/auth.guard.ts (verifyToken, constructor)

### REQ-2 — Fail-closed en produccion (certainty: confirmed)
> Que cambia: `e2eEnabled = NODE_ENV !== 'production' && ENABLE_E2E_LOGIN === 'true' && !!E2E_AUTH_SECRET`. Ademas el boot falla si el flag esta on en prod.
> Por que: mitiga el riesgo principal (bypass en prod).

MUST: en prod, un token HS256 se rechaza. MUST: `env.validation` agrega issue si `ENABLE_E2E_LOGIN==='true'` y `NODE_ENV==='production'`. Test de regresion obligatorio.
source_ref: backend/jormat-api/src/auth/auth.guard.ts, backend/jormat-api/src/config/env.validation.ts

### REQ-3 — Identidad restringida a dominio de test reservado (certainty: confirmed)
> Que cambia: el token de test solo autentica si el email resuelto termina en `@e2e.jormat.test`.
> Por que: limita el blast radius.

MUST: si el email no pertenece al dominio reservado -> rechazar. Constante en security.constants.ts.
source_ref: backend/jormat-api/src/common/security/security.constants.ts, auth.guard.ts (resolveEmailClaim)

### REQ-4 — Secreto fuerte exigido cuando el flag esta on (certainty: confirmed)
> Que cambia: `env.validation` exige `E2E_AUTH_SECRET` fuerte (>= 16) cuando `ENABLE_E2E_LOGIN==='true'`, incluso en no-prod.
> Por que: evita un bypass con secreto trivial/vacio.
source_ref: backend/jormat-api/src/config/env.validation.ts

### REQ-5 — Auditoria de uso (certainty: confirmed)
> Que cambia: cada uso del bypass loguea (warn) email + NODE_ENV.
> Por que: trazabilidad de un camino sensible.
source_ref: backend/jormat-api/src/auth/auth.guard.ts

### REQ-6 — Endpoint dev-login + helper de firma (certainty: confirmed)
> Que cambia: endpoint backend dev-only (gated) que emite un token HS256 para un email del dominio reservado, y un helper de test que firma el token para las specs e2e.
> Por que: el frontend/PW necesita obtener el token sin conocer el secreto; los e2e HTTP lo firman localmente.
source_ref: backend/jormat-api/src/auth/ (nuevo endpoint), backend/jormat-api/test/e2e/ (helper)

### REQ-7 — Frontend dev-login entry (no-prod) (certainty: inferred)
> Que cambia: un entry dev-only en el front que obtiene el token via el endpoint y arma la sesion para que la app opere logueada sin MSAL interactivo; el proxy reenvia el token.
> Por que: habilita Playwright en browser.
source_ref: front/jormat-front/src/auth/, front/jormat-front/src/app/api/proxy/[...path]/route.ts

### REQ-8 — Tests (certainty: confirmed)
> Que cambia: unit del guard (HS256 ok, fail-closed prod, dominio invalido, firma invalida, exp), e2e HTTP autenticado de ejemplo, smoke PW con login.
source_ref: backend/jormat-api/src/auth/*.spec.ts, backend/jormat-api/test/e2e/, front (PW)

## Tasks

### Session 1 — Backend: seam de auth HS256 gated [tipo: ⚑ fuerte] [tier: T3]

Sensible (auth, mayor blast radius). Tier T3: quality gate exhaustivo + fail-closed en prod verificado por test. RULE-global-003: tocar `auth.guard.ts`/`env.validation.ts` es excepcion autorizada por el dev para este ticket (es el nucleo del enfoque A).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Constante `E2E_TEST_EMAIL_DOMAIN` (dominio de test reservado) | REQ-3 | developer | — | backend/jormat-api/src/common/security/security.constants.ts | typecheck | git revert del hunk | DET-1, DET-8 | done | 1 |
| S1.T2 | `env.validation`: fail-closed si flag on en prod + secreto fuerte si flag on (no-prod) | REQ-2, REQ-4 | developer | — | backend/jormat-api/src/config/env.validation.ts | unit (env.validation.spec) | git revert | DET-8, RULE-global-002 | done | 1 |
| S1.T3 | `auth.guard`: `e2eEnabled` (triple candado) + branch HS256 `verifyE2EToken` (dominio + timingSafeEqual + log) | REQ-1, REQ-3, REQ-5 | developer | S1.T1 | backend/jormat-api/src/auth/auth.guard.ts | unit | git revert | DET-5, DET-8, RULE-global-003 (excepcion autorizada) | done | 1 |
| S1.T4 | Unit tests: guard (HS256 ok / fail-closed prod / flag off / dominio / firma / exp) + env.validation (5 casos) | REQ-8 | developer | S1.T2, S1.T3 | backend/jormat-api/src/auth/auth.guard.e2e-bypass.spec.ts, backend/jormat-api/src/config/env.validation.spec.ts | jest verde (71/71) | borrar spec | DET-7, DET-13 | done | 1 |
| S1.GATE | Quality gate T3 dual-judge (3 hallazgos corregidos: allowlist NODE_ENV, no-impersonar-por-oid, exp obligatorio) + self-report verify | — | reviewer | S1.T4 | — | gate verde (76/76) | — | DET-13, DET-20, DET-23, DET-33, DET-35 | done | 1 |

### Session 2 — Backend: endpoint dev-login + helper e2e [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | Endpoint dev-login gated que emite token HS256 para un email del dominio reservado (+ util compartido + DTO) | REQ-6 | developer | S1.GATE | backend/jormat-api/src/auth/auth.controller.ts, e2e-login.util.ts, dto/e2e-login.dto.ts | unit | git revert | DET-5, DET-8 | done | 2 |
| S2.T2 | Helper de firma (signE2EToken) + e2e HTTP autenticado a traves del AuthGuard real | REQ-6, REQ-8 | developer | S2.T1 | backend/jormat-api/test/e2e/e2e-login.e2e-spec.ts | jest e2e verde (3/3) | borrar helper/spec | DET-7, DET-13, DET-36 | done | 2 |
| S2.GATE | Quality gate T2 + runtime verify e2e HTTP real (POST login -> token -> GET /me 200; 401 sin token; 400 dominio) | — | reviewer | S2.T2 | — | gate verde | — | DET-13, DET-23, DET-33, DET-36 | done | 2 |

### Session 3 — Frontend: dev-login entry + PW smoke [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S3.T1 | Seam dev-login front: `auth/e2eSession` + interceptor `services/api` + `auth.store.initialize` + `AuthGuard` (token e2e -> autentica sin MSAL; inerte en prod) | REQ-7 | developer | S2.GATE | front/jormat-front/src/auth/e2eSession.ts, services/api.ts, stores/auth.store.ts, components/auth/AuthGuard/AuthGuard.tsx | vitest 115/115 | git revert | DET-5, DET-8 | done | 3 |
| S3.T2 | Smoke Playwright + config + README (listo-para-CI, fuera de src/) | REQ-8 | developer | S3.T1 | front/jormat-front/e2e/ | vitest cubre el seam; PW no ejecutado (falta @playwright/test + env) | borrar e2e/ | DET-7, DET-36 | done | 3 |
| S3.GATE | Quality gate T2 + runtime verify. runtime-verification: **smoke-executed** para el seam (vitest jsdom del AuthGuard/interceptor + e2e HTTP real de S2); **smoke-not-reproducible** para el browser PW (razon: @playwright/test no instalado + env del stack no seteado) | — | reviewer | S3.T2 | — | gate verde (115/115 front + 3/3 e2e HTTP) | — | DET-13, DET-23, DET-25, DET-36 | done | 3 |

### Task contract (resumen)

Cada task lleva `source_ref`, rollback (git revert del hunk salvo tests que se borran) y rules listadas. S1 quedo implementada y verificada (71/71 unit, build sin errores, lint solo warnings de estilo). Detalle canonico se replica en execute via `dkc-execute-task`.
