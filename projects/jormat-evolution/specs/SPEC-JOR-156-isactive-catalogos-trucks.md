---
id: SPEC-JOR-156-isactive-catalogos-trucks
project: jormat-evolution
ticket: JOR-156
status: approved
---

# Cerrar dos fugas de is_active en catalogos_repuestos y trucks

# Cerrar dos fugas de is_active en catalogos_repuestos y trucks

## Purpose

Robustez sobre tablas entregadas: cerrar dos fugas preexistentes de `is_active` detectadas como hallazgos de [[JOR-149]] (backlog B4 y B5). `KnexCatalogosRepuestosRepository.update()` no filtra `is_active = 1` (a diferencia de `remove()`), y `trucks.joinedScope()` hace INNER JOIN a `customers` sin `customers.is_active = 1`. Ambos son fixes de correctitud, no features. **B6** (validacion de formato uuid en plataforma/auth) sale de alcance — cubierto por [[JOR-150]].

## Requirements

### REQ-1: `catalogos-repuestos.update()` no edita un catalogo dado de baja

> **Que cambia**: `KnexCatalogosRepuestosRepository.update()` agrega `.where('is_active', 1)`, igual que `remove()`.
> **Por que**: hoy un PATCH sobre un catalogo dado de baja actualiza la fila aunque `findById` ya no lo devuelva — el contrato de lectura de [[RULE-database-001]] no se sostiene en escritura.

El sistema MUST filtrar `is_active = 1` en `update()` de `KnexCatalogosRepuestosRepository` (`src/items/catalogos-repuestos.repository.ts`). Un PATCH sobre un catalogo con `is_active = 0` MUST resultar en 0 filas afectadas, resolviendo a `null`/404.

**Actor**: system · **Layers**: backend, database
**source_ref**: confirmed — `src/items/catalogos-repuestos.repository.ts:94-113` (`update()` usa solo `.where('uuid', id)`); `remove()` (`:116-118`) ya filtra `is_active`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: catalogo dado de baja
- **GIVEN** un catalogo con `is_active = 0`, **WHEN** se hace `PATCH` sobre el, **THEN** la operacion resuelve a `null`/404 y la fila no cambia.

#### Scenario: catalogo activo intacto
- **GIVEN** un catalogo con `is_active = 1`, **WHEN** se hace `PATCH`, **THEN** la actualizacion se aplica normalmente (sin regresion).

</details>

#### Acceptance
Un catalogo dado de baja ya no se puede editar por PATCH.

### REQ-2: `trucks.joinedScope()` no hidrata camiones de clientes dados de baja

> **Que cambia**: `trucks.joinedScope()` agrega `customers.is_active = 1` al join contra `customers`.
> **Por que**: hoy un cliente dado de baja sigue hidratando el camion en `findById`, `list.data` y `list.count` — misma clase de fuga que REQ-1, en la relacion inbound de trucks.

El sistema MUST filtrar `customers.is_active = 1` en el JOIN de `joinedScope()` (`src/trucks/trucks.repository.ts`). Esta es la unica fuente del join a `customers`, reusada por `findById`, `list.data` y `list.count`; el filtro en un solo punto cubre las tres superficies sin duplicacion.

**Decision de negocio (dev)**: cerrar la fuga (no mantener la ficha del camion con datos de un cliente inactivo). Consistente con [[RULE-database-001]]. Cambio observable: `list.total` de trucks decrementa cuando el cliente que hidrata ese camion se desactiva — es el comportamiento deseado, no un efecto secundario a mitigar.

**Actor**: system · **Layers**: backend, database
**source_ref**: confirmed — `src/trucks/trucks.repository.ts:260` (`joinedScope()`); `activeScope` (`:253`) solo filtra `trucks.is_active = 1`, sin tocar `customers`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: cliente dado de baja
- **GIVEN** un camion cuyo cliente tiene `is_active = 0`, **WHEN** se pide `findById` de ese camion, **THEN** resuelve `null`.

#### Scenario: ausente del listado
- **GIVEN** el mismo camion, **WHEN** se pide `list.data`, **THEN** el camion no aparece y `list.count` es 1 menos que antes de desactivar al cliente.

#### Scenario: cliente activo intacto
- **GIVEN** un camion con cliente `is_active = 1`, **WHEN** se pide `findById`/`list`, **THEN** el camion se hidrata normalmente (sin regresion).

</details>

#### Acceptance
Un camion cuyo cliente fue dado de baja deja de aparecer en detalle y listado.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Testing | Suite unit + e2e verde tras el fix | tests pass | unit 719/719, e2e 227/227 (incl. TC1, TC2) |
| Regresion | Suites existentes de catalogos/trucks siguen verdes | delta | 0 casos rotos |

## Changes

### Modified

| Archivo | Cambio | Por que |
|---------|--------|---------|
| `backend/jormat-api/src/items/catalogos-repuestos.repository.ts` | `update()` agrega `.where('is_active', 1)` | REQ-1 |
| `backend/jormat-api/src/trucks/trucks.repository.ts` | `joinedScope()` agrega `customers.is_active = 1` al join | REQ-2 |

### Added

| Artefacto | Proposito |
|-----------|-----------|
| caso e2e en la suite `catalogos-repuestos` | TC1 — catalogo dado de baja no se edita |
| caso e2e en la suite `trucks` (CLIENT_C dedicado) | TC2 — cliente dado de baja no hidrata su camion |

## Tasks

### Session 1 - Cerrar B4 + B5 [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Fix B4: agregar `.where('is_active', 1)` a `update()` | REQ-1 | developer | — | backend/jormat-api/src/items/catalogos-repuestos.repository.ts | unit catalogos-repuestos verde + `tsc` sin error | git revert | RULE-database-001 | done | 1 |
| S1.T2 | Test e2e B4: PATCH sobre catalogo `is_active=0` -> null/404; update normal sin regresion | REQ-1 | developer | S1.T1 | backend/jormat-api/test/e2e/catalogos-repuestos.e2e-spec.ts | `npm run test:e2e` verde, caso nuevo incluido | git revert | DET-7 | done | 1 |
| S1.T3 | Fix B5: agregar `customers.is_active = 1` al join de `joinedScope()` | REQ-2 | developer | — | backend/jormat-api/src/trucks/trucks.repository.ts | unit trucks verde + `tsc` sin error | git revert | RULE-database-001 | done | 1 |
| S1.T4 | Test e2e B5: camion con cliente `is_active=0` (CLIENT_C dedicado, con cleanup propio) -> `findById` null, ausente de `list.data`, `list.count` -1 | REQ-2 | developer | S1.T3 | backend/jormat-api/test/e2e/trucks.e2e-spec.ts | `npm run test:e2e` verde, caso nuevo incluido; suites existentes de trucks (incl. busqueda por razon social) siguen verdes | git revert | DET-7 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** - persistir en `## Sessions`, unit+e2e, quality review single independent judge, self-report verification (DET-33), decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada + judge approved | (no aplica - cierre de session) | DET-20, DET-23, DET-33 | done | 1 |

## Constraints

- [[RULE-database-001]]: `is_active smallint 1/0`; los reads filtran `is_active = 1`. Ambos fixes restauran ese invariante en superficies que lo incumplian.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| [[JOR-149]] | internal | B4 y B5 nacieron como hallazgos de los gates de S1 en JOR-149 | ninguno operativo — son fixes independientes sobre codigo ya mergeado |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El fix de B5 rompe suites existentes de trucks que asumen ver camiones de clientes inactivos | low | regresion en listados/busqueda | CLIENT_C dedicado con cleanup propio en el test nuevo, sin reusar CLIENT_A/CLIENT_B (usados por el test de busqueda por razon social) |

## Open questions

_(ninguna — B5 se resolvio con la decision del dev registrada en Decisions)_

## Decisions

### DEC-LOCAL-01: B5 cierra la fuga (no mantiene ficha historica)
- **Contexto**: `trucks.joinedScope()` hidrata el camion via join a `customers` sin filtrar `is_active`. Dos opciones: cerrar la fuga (excluir clientes de baja) o mantenerla a proposito (ficha historica del camion aunque el cliente ya no exista activo).
- **Drivers**: consistencia con [[RULE-database-001]] (los reads filtran `is_active = 1` en toda otra tabla del dominio); B4 (misma clase de fuga) ya se resuelve cerrando.
- **Opcion elegida**: cerrar la fuga. `customers.is_active = 1` se agrega al join.
- **Alternativas**: mantener la ficha historica (descartada por el dev: rompe la simetria con el resto del dominio y con B4).
- **Consecuencias**: `list.total` de trucks decrementa cuando se desactiva un cliente dueño de camiones — cambio observable de paginacion, documentado en el ticket.
- **Session**: design

## Backlog

_(vacio — B6 no entra a este spec, ver [[JOR-150]])_

## Rules discovered

_(ninguna)_

## Bugs found

_(ninguno — B4 y B5 eran hallazgos ya registrados en el backlog de JOR-149)_

## Acceptance checkpoints

- [x] **Funcional**: `catalogos-repuestos.update()` filtra `is_active=1`; `trucks.joinedScope()` filtra `customers.is_active=1` en las 3 superficies que lo consumen.
- [x] **Tests**: unit 719/719, e2e 227/227 incl. TC1 y TC2.
- [x] **Regresion**: suites existentes de catalogos/trucks siguen verdes.
- [x] **Rules**: [[RULE-database-001]] restaurada en ambas superficies.
