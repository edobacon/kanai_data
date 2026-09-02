---
id: RULE-global-002
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - security
  - multi-tenant
  - rbac
  - authz
  - secrets
  - validation
  - baseline
---

# Todo endpoint o servicio que toque datos cumple la linea base de seguridad (aislacion de tenant + AuthZ + sin secretos expuestos + inputs validados), verificada en cada sesion

## What

Como SaaS multi-tenant, jormat-evolution exige una linea base de seguridad **no negociable** en todo codigo que acceda a datos o exponga superficie HTTP. Se verifica en el Gate de calidad de cada sesion (dimension de seguridad S1–S4):

- **S1 — Aislacion de tenant**: toda query a datos de negocio filtra por `workspace_id` (o por la frontera definida en `DEC-001`, segun la estrategia de aislacion elegida). Ningun acceso a datos sin scope de tenant. El olvido de este filtro es la fuga cross-tenant #1 del producto (`observations` O-1: la RLS esta dormante, asi que el filtrado en codigo es la unica frontera hasta que se resuelva A7.2).
- **S2 — AuthZ por capability**: todo endpoint mutante o sensible lleva `@RequireCapability('module.feature:action')`; se prueba con test de **403** sin la capability. Los endpoints por `:id` validan **pertenencia** (no basta con estar autenticado — `observations` O-2). La UI que oculta la accion (`<Can>`) **no** es la frontera: la frontera la impone el backend.
- **S3 — Sin secretos ni superficie expuesta**: nada de credenciales/tokens hardcodeados; los defaults de variables de entorno **no** pueden ser secretos validos en produccion (validacion de env al boot rechaza valores debiles/vacios — `observations` O-4); las respuestas no exponen columnas internas (`b2c_oid`, `identity_provider`, `pass` — `observations` O-5); sin stack traces al cliente (contrato de error `{code, message}`).
- **S4 — Inputs validados en el limite**: DTO + `class-validator` (BE) / zod (FE); todo id o header externo (`X-Admin-Workspace`, ids de ruta) se valida formato + existencia antes de usarse (`observations` O-3).

## Why

La aislacion de tenant, la autorizacion y la no-exposicion de secretos son la propiedad de seguridad central de un SaaS multi-tenant; una falla en cualquiera compromete datos de clientes. El proyecto arranca con cuatro riesgos ALTOS documentados (O-1 a O-4) y la RLS **rota en runtime** (tres causas en cadena), de modo que hoy la unica barrera real es el filtrado manual por `workspace_id`. Si esa disciplina no se enforza en cada sesion, cada modulo de dominio nuevo (items, facturas, pagos) agrega superficie de fuga sin red. Verificarlo por sesion — y no en un audit final — evita que el costo escale con el numero de modulos.

## Where

- **Files**: controllers/services/repos en `backend/jormat-api/src/**` (acceso a datos + endpoints); guards (`auth.guard.ts`, RBAC), `tenant.middleware.ts`, `database.module.ts`; config de env (`@nestjs/config`). En FE: `<Can>`/`useCan`, cliente API y schemas zod.
- **Layers**: backend (frontera real) + database (RLS/rol) + config; frontend (defensa cosmetica + validacion de forms).
- **Plan fuente**: `jormat_docs/ongoing/requirements-and-stack.md §1.3` (seguridad) + `§1.4.3` (dimension S1–S4 del Gate); `implementation-tasks.md WP-A7` (hardening); `jormat_docs/backend/tenant-isolation.md` + `observations/README.md` (O-1..O-5, O-15).

## When

Siempre que se cree o modifique un endpoint, servicio, repo, guard o acceso a datos, en cualquier sesion DKC. Se verifica en el `S{N}.GATE` (dimension de seguridad) junto a la calidad de codigo ([[code-quality-standards]] / `RULE-global-001`). **Gate duro del proyecto**: no se arranca el primer modulo de dominio (B1) sin resolver la aislacion de tenant (`DEC-001` / WP-A7.2).

## Verification

Por cada endpoint/servicio nuevo o modificado, en el Gate:

- **S1**: grep/review — toda query de negocio scopeada por `workspace_id`; test de integracion cross-tenant (workspace A no ve datos de B).
- **S2**: el endpoint tiene `@RequireCapability`; test de **403** sin capability; endpoints `:id` con test de pertenencia.
- **S3**: grep de secretos/`console.*`; boot falla con env debil en `production`; la respuesta no contiene columnas internas; errores normalizados a `{code,message}`.
- **S4**: DTO/zod presente; ids/headers externos validados (formato + existencia) con su test.

Barreras automaticas que ayudan: `ValidationPipe` global, Exception Filter, validacion de env al boot, throttler + helmet + CORS restringido (WP-A7.8). El gate humano cubre lo estructural (¿esta scopeado?, ¿hay authz?).

## Source

- **Discovered in**: auditoria de seguridad del plan (2026-06-13), a pedido del dev, antes de entrar a tickets.
- **Evidence**: `observations/README.md` O-1 (RLS dormante por 3 causas), O-2 (`PATCH /workspaces/:id` sin authz), O-3 (`X-Admin-Workspace` sin validar), O-4 (`ADMIN_TOKEN` default debil), O-5 (`GET /users` expone columnas internas), O-15 (seeds demo). El DoD del plan cubria calidad de codigo pero no seguridad; estos riesgos estaban documentados pero sin accionar ni enganchar a un WP.
- **Related**: [[code-quality-standards]] (RULE-global-001); `DEC-001` (aislacion de tenant/RLS); plan `requirements-and-stack.md §1.3/§1.4.3`, `implementation-tasks.md WP-A7`, `backend/tenant-isolation.md`. DKC DET-5 (multi-capa), DET-13 (cierre por evidencia), DET-23 (quality gate).
