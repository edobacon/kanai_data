---
id: SPEC-JOR-139-seed-office-payments-caps
project: jormat-evolution
ticket: JOR-139
status: done
---

# Sembrar las capabilities de office-payments (deuda de JOR-132)

# Sembrar las capabilities de office-payments (deuda de JOR-132)

## Executive summary — lo que estas aprobando

**Que se corrige**: la vista "Pagos sucursal" (office-payments, entregada en JOR-132) esta gateada por `payments.offices:view` y `payments.offices:create`, pero esas capabilities nunca se dieron de alta en el catalogo RBAC del backend (`backend/jormat-api/seeds/07_payments_capabilities.ts`). Post-JOR-033 no existe el comodin `'*'`: el internal-admin recibe grants EXPLICITOS via `09_internal_admin_grant_all.ts`, que itera el catalogo y concede cada capability existente. Sin la cap en el catalogo, el admin no recibe el grant y no ve la vista por defecto.

**Fix**: sembrar las 2 capabilities en el catalogo (07). El grant-all (09) las concede al internal-admin en el re-seed sin cambios, porque itera el catalogo. Se cubre con tests de seed (07+09) y se actualiza la documentacion (`navigation.md`, `views.md`). Se corrige el comentario stale de 07 que afirmaba el comodin `'*'`.

**Lo que NO cambia**: `09_internal_admin_grant_all.ts` no requiere cambios (ya itera el catalogo). El front no cambia: hidrata las capabilities del backend real (`GET /capabilities/me`), sin mock.

## Requirements

### REQ-01: sembrar `payments.offices:view` y `:create` en el catalogo → admin por defecto via grant-all
> Que cambia: el catalogo RBAC (07) incluye las 2 capabilities que gatean "Pagos sucursal"; el internal-admin las recibe automaticamente en el re-seed via el grant-all (09).
> Por que: post-JOR-033 el admin obtiene sus permisos por grants explicitos (no por comodin `'*'`); una capability que no esta en el catalogo no se concede a nadie, dejando la vista de JOR-132 invisible para el admin por defecto.

MUST: el catalogo sembrado por `07_payments_capabilities.ts` DEBE incluir `payments.offices:view` y `payments.offices:create`. Tras el re-seed, `09_internal_admin_grant_all.ts` (que itera el catalogo) DEBE conceder ambas capabilities al internal-admin. El comentario de 07 que afirmaba el comodin `'*'` DEBE corregirse para reflejar el grant explicito via 09.

<details>
<summary>Scenario</summary>

- GIVEN un entorno recien sembrado con `./run.sh seed` y el internal-admin
- WHEN se ejecuta el seed del catalogo (07) y el grant-all (09)
- THEN el catalogo contiene `payments.offices:view` y `:create`, y el internal-admin tiene ambas concedidas → ve "Pagos sucursal" por defecto (el front las hidrata de `GET /capabilities/me`).
</details>

## Tasks

### Session 1 — Seed office-payments caps [tier: T2]

**Task S1.T1 — Sembrar las 2 caps en el catalogo (07)**
- source_ref: REQ-01
- agent: developer
- files: `backend/jormat-api/seeds/07_payments_capabilities.ts`
- validation: `payments.offices:view` y `payments.offices:create` presentes en el catalogo (`:52,60`); comentario stale del comodin `'*'` corregido; el grant-all (09) no requiere cambios (itera el catalogo)
- rollback: git revert

**Task S1.T2 — Tests de seed (07 + admin grant via 09)**
- source_ref: REQ-01
- agent: reviewer/tester
- depends_on: S1.T1
- files: seed 07 spec (caps en el catalogo), cobertura del admin grant via 09
- validation: jest seeds 11 passed (6 nuevos); seed 07 spec 6/6; el internal-admin recibe ambas caps tras el re-seed
- rollback: N/A (tests)

**Task S1.T3 — Docs (navigation + views)**
- source_ref: REQ-01
- agent: developer
- files: `docs/front/navigation.md`, `docs/front/views.md`
- validation: navigation.md documenta las 2 caps; views.md documenta "Pagos sucursal"; jest nav-data 7 passed. No existe `permissions-model.md` en el repo (N/A)
- rollback: git revert

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33: caps confirmadas en `07:52,60`, jest seed 07 spec re-corrido 6/6, admin grant verificado por spec 07+09). Dual-judge (DET-35) calibrado no-aplicable para este cambio de seed T2; el gate es la verificacion independiente.

## Constraints

- Alcance acotado al seed del catalogo (07) + tests + docs. `09_internal_admin_grant_all.ts` NO cambia (ya itera el catalogo).
- Cambio aditivo: se agregan 2 capabilities; no se retira ni reenruta logica existente.
- No se toca el front (hidrata del backend real `/capabilities/me`, sin mock).

## Acceptance checkpoints

- [x] AC-1 (REQ-01): el catalogo 07 incluye `payments.offices:view` y `payments.offices:create` (jest seed 07 spec 6/6).
- [x] AC-2 (REQ-01): el internal-admin recibe ambas caps tras el re-seed via grant-all 09 (jest seeds 11 passed).
- [x] AC-3 (REQ-01): docs navigation.md + views.md actualizadas (jest nav-data 7 passed).
