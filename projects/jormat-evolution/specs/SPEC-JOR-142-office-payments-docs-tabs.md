---
id: SPEC-JOR-142-office-payments-docs-tabs
project: jormat-evolution
ticket: JOR-142
status: done
---

# Unificar "Documentos a pagar" y "Documentos disponibles" en un Card con pestanas (Crear pago de sucursal)

# Unificar "Documentos a pagar" y "Documentos disponibles" en un Card con pestanas (Crear pago de sucursal)

## Executive summary — lo que estas aprobando

**Que se quiere**: en la vista Crear pago de sucursal (office-payments), los bloques "Documentos a pagar" y "Documentos disponibles" hoy son dos Cards separados en un TwoColumn. Se unifican en UN Card "Documentos" con 2 pestanas, como los items en facturas, para optimizar espacio y mostrar mejor la informacion. Es reordenamiento de layout: la funcionalidad se preserva 1:1.

**Decisiones criticas** (con racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Nuevo `OfficePaymentDocsTabs` espejo del patron `BuilderItemsTabs`, no un atomo `ui/tabs` nuevo | DET-32 reuse: el patron de pestanas de items no es un atomo; se replica el mismo markup accesible (role=tablist/tab/tabpanel), contador por pestana y montaje condicional. Por eso `draft_approved: skipped` |
| 2 | Default en "disponibles", sin auto-salto de pestana al agregar | El alta ocurre en "disponibles"; no cambiar de pestana permite agregar varios documentos seguidos, igual que items |
| 3 | Reuso de `WarehouseDocsTable` y `OfficePaymentCartTable` sin cambiar su contrato | Solo cambia el contenedor (2 Cards -> 1 Card con pestanas); las tablas y su comportamiento no cambian (DET-40) |

**Riesgos principales y como los mitigamos**:

- **Perder funcionalidad al reordenar el layout** → REQ-REGRESSION + DET-40: enumerar y verificar 1:1 (agregar/quitar/editar monto/forma de pago/total en vivo/validacion inline/guard/RBAC/empty); tests del area verdes.
- **El patron de pestanas no queda accesible** → espejo de `BuilderItemsTabs` (role=tablist/tab/tabpanel), story + play `FlujoPestanas`.

**Que NO se hace en este ticket**: no se toca bodega/fecha/observacion/Total/Guardar; no se crea atomo `ui/tabs`; no se toca backend ni el contrato de las tablas.

**Tamano estimado**: 1 session (T2), reordenamiento de layout. La pieza mas delicada es preservar la funcionalidad del carrito y el disponible al mover ambos a pestanas.

**Como vas a saber que funciona**: abro Crear pago de sucursal y veo UN Card "Documentos" con 2 pestanas (disponibles / a pagar), contador por pestana; agrego desde "disponibles" sin que salte de pestana, el total se actualiza en vivo, y el resto de la validacion/guard/empty se comporta igual que antes.

---

## Purpose

Reemplazar el TwoColumn de 2 Cards ("Documentos a pagar" + "Documentos disponibles") de `OfficePaymentCreateView` por UN Card "Documentos" con 2 pestanas, mediante un nuevo `OfficePaymentDocsTabs` que reusa el patron `BuilderItemsTabs` y los componentes de tabla existentes. Reordenamiento de layout con funcionalidad preservada (DET-32 reuse, DET-40 replacement-audit).

## Requirements

### REQ-01: unificar los dos bloques de documentos en UN Card con 2 pestanas, reusando el patron de items

> **Que cambia**: los Cards "Documentos disponibles" y "Documentos a pagar" pasan a ser dos pestanas de un unico Card "Documentos". Se agrega `OfficePaymentDocsTabs` (espejo de `BuilderItemsTabs`) y `OfficePaymentCreateView` deja de usar el TwoColumn de 2 Cards.
> **Por que**: pedido del dev: optimizar espacio y mostrar mejor la informacion, con el mismo patron de pestanas que los items en facturas.

MUST: `OfficePaymentDocsTabs` MUST renderizar 2 pestanas con markup accesible (role=tablist/tab/tabpanel), contador por pestana y montaje condicional, espejando `shared/builder/BuilderItemsTabs`, combinando `WarehouseDocsTable` (pestana "Documentos disponibles") y `OfficePaymentCartTable` (pestana "Documentos a pagar"). `OfficePaymentCreateView` MUST montar UN Card "Documentos" con esas pestanas en lugar del TwoColumn de 2 Cards. La pestana por defecto MUST ser "disponibles" y agregar un documento NO debe cambiar de pestana. La funcionalidad MUST preservarse: agregar del disponible al carrito, contador, total en vivo (Sigma round(pay)), quitar, editar monto/forma de pago, validacion inline, guard de cambios sin guardar, empty state y RBAC. NO se crea un atomo `ui/tabs`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: render del Card unico con pestanas
- **GIVEN** la vista Crear pago de sucursal
- **WHEN** se renderiza el bloque de documentos
- **THEN** hay UN Card "Documentos" con un tablist de 2 tabs (disponibles / a pagar) y contador por pestana, no 2 Cards separados

#### Scenario: agregar sin auto-salto de pestana
- **GIVEN** la pestana "Documentos disponibles" activa (default)
- **WHEN** el usuario agrega un documento al carrito
- **THEN** el documento entra al carrito y la pestana activa sigue siendo "disponibles" (permite agregar varios seguidos); el contador de "a pagar" y el Total se actualizan en vivo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en Crear pago de sucursal ve UN Card "Documentos" con 2 pestanas; agrega desde "disponibles" sin saltar de pestana, con contador y total actualizados en vivo.

### REQ-REGRESSION: el contrato de las tablas de documentos no cambia

> **Que cambia**: nada en el comportamiento de `WarehouseDocsTable` ni `OfficePaymentCartTable`; solo su contenedor.
> **Por que**: el cambio es un reordenamiento de layout (DET-40); las tablas y su logica deben conservarse.

MUST: `WarehouseDocsTable` y `OfficePaymentCartTable` MUST conservar su contrato y comportamiento (agregar/quitar, editar monto/forma de pago, total, validacion inline, guard, empty, RBAC). La suite de `payments/office` MUST permanecer verde. Bodega/fecha/observacion/Total/Guardar de `OfficePaymentCreateView` MUST quedar sin cambios.

<details><summary>Scenarios de validacion</summary>

#### Scenario: tablas y controles del formulario intactos
- **GIVEN** la vista Crear pago de sucursal con el Card unificado
- **WHEN** el usuario opera las tablas y el resto del formulario
- **THEN** el comportamiento de agregar/quitar/editar/validar y de bodega/fecha/observacion/Total/Guardar es identico al previo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la operatoria de documentos y del formulario de pago se comporta como antes; solo cambio el layout a pestanas.

## Tasks

### Session 1 — Unificar documentos en pestanas [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `OfficePaymentDocsTabs` (espejo de `BuilderItemsTabs`): 2 pestanas role=tablist/tab/tabpanel, contador por pestana, montaje condicional; combina `WarehouseDocsTable` + `OfficePaymentCartTable`; default "disponibles" sin auto-salto | REQ-01 | developer | — | `.../payments/office/OfficePaymentDocsTabs/` | vitest de las pestanas: render, contador, default sin auto-salto, agregar/quitar/total en vivo | git revert | DET-32 | done | 1 |
| S1.T2 | Wire de `OfficePaymentCreateView` a UN Card "Documentos" con las pestanas (elimina el TwoColumn de 2 Cards); bodega/fecha/observacion/Total/Guardar sin cambios; empty-state del carrito reescrito | REQ-01, REQ-REGRESSION | developer | S1.T1 | `.../payments/office/OfficePaymentCreateView/` | render de UN Card con pestanas; controles del formulario sin cambios | git revert | DET-32, DET-40 | done | 1 |
| S1.T3 | Tests + stories (play `FlujoPestanas`) + docs (`payments.md`, `views.md`) | REQ-01, REQ-REGRESSION | reviewer | S1.T1, S1.T2 | tests co-locados, `*.stories.tsx`, `docs/front/payments.md`, `docs/front/views.md` | vitest payments/office 48 passed INCLUYENDO storybook; tsc 0; eslint 0 | N/A (tests/docs) | DET-7, DET-13, DET-23 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, correr validacion del tier, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | done | 1 |

## Constraints

- Alcance acotado a `payments/office/` y `docs/front/`. No tocar backend ni el contrato de las tablas.
- DET-32: reusar el patron `shared/builder/BuilderItemsTabs` y los componentes `WarehouseDocsTable`/`OfficePaymentCartTable`; no crear atomo `ui/tabs`.
- DET-40: reordenamiento de layout; la funcionalidad del disponible y del carrito se preserva 1:1.

## Decisions

### DEC-LOCAL-01: nuevo `OfficePaymentDocsTabs` espejo de `BuilderItemsTabs`, no atomo `ui/tabs`
- **Contexto**: se necesitaba un contenedor de pestanas para los dos bloques de documentos, con el mismo patron que los items en facturas.
- **Drivers**: DET-32 reuse; el patron de pestanas de items no existe como atomo `ui/tabs`, vive en `shared/builder/BuilderItemsTabs`.
- **Opcion elegida**: replicar el patron en `OfficePaymentDocsTabs` (mismo markup accesible role=tablist/tab/tabpanel, contador por pestana, montaje condicional).
- **Alternativas**: crear un atomo `ui/tabs` (descartado: fuera de alcance, no hay lenguaje visual nuevo); modal/acordeon (descartado: no es lo pedido).
- **Consecuencias**: cambio de layout; `creates_visual: true` pero `draft_approved: skipped` (sin lenguaje visual nuevo).
- **Session**: 1

### DEC-LOCAL-02: default en "disponibles", sin auto-salto de pestana al agregar
- **Contexto**: el alta de documentos ocurre en la pestana "disponibles".
- **Drivers**: permitir agregar varios documentos seguidos sin friccion, igual que items.
- **Opcion elegida**: pestana inicial "disponibles"; agregar no cambia de pestana.
- **Alternativas**: saltar a "a pagar" al agregar (descartado: obliga a volver por cada documento).
- **Session**: 1

### DEC-LOCAL-03: reuso de `WarehouseDocsTable` y `OfficePaymentCartTable` sin cambiar su contrato
- **Contexto**: ambas tablas ya existen con su comportamiento (agregar/quitar/editar/validar/total).
- **Drivers**: el cambio es de contenedor; DET-40 exige preservar el comportamiento.
- **Opcion elegida**: montarlas dentro de las pestanas sin tocar su contrato; solo se reescribio el empty-state del carrito ("de la tabla de la derecha" -> "de la pestana Documentos disponibles").
- **Consecuencias**: regresion cubierta por la suite payments/office (48 passed).
- **Session**: 1

## Acceptance checkpoints

- [x] **Funcional**: UN Card "Documentos" con 2 pestanas; default "disponibles" sin auto-salto; agregar/quitar/total en vivo/validacion inline/guard/empty preservados.
- [x] **Tests** (DET-37 dim4): vitest payments/office 48 passed INCLUYENDO el proyecto storybook + play `FlujoPestanas`; tsc 0, eslint 0.
- [x] **Integration** (DET-40): contrato de `WarehouseDocsTable`/`OfficePaymentCartTable` sin cambios; controles del formulario intactos.
- [x] **Docs oficiales del proyecto** (DET-37 dim1): `docs/front/payments.md` + `docs/front/views.md` actualizados (2 bloques -> 1 con pestanas).
- [x] **KB DKC** (DET-37 dim2): decisiones registradas en el decisions_log del ticket.

## Technical reference

- Patron de pestanas reusado: `shared/builder/BuilderItemsTabs` (markup accesible role=tablist/tab/tabpanel, contador por pestana, montaje condicional).
- Nuevo componente: `payments/office/OfficePaymentDocsTabs/`.
- Vista contenedora: `payments/office/OfficePaymentCreateView/` (pasa de TwoColumn de 2 Cards a UN Card "Documentos").
- Tablas reusadas: `WarehouseDocsTable` (disponibles) + `OfficePaymentCartTable` (a pagar).
- Total: Sigma round(pay) por documento en el carrito.
- Stub: MSW del area payments/office; story con play `FlujoPestanas`.
