---
id: SPEC-JOR-127-crear-factura-desde-origen
project: jormat-evolution
ticket: JOR-127
status: done
---

# Crear factura desde origen (V-08)

# Crear factura desde origen (V-08)

## Executive summary — lo que estas aprobando

**Que se quiere**: permitir crear una factura a partir de un documento/registro de origen (cotizacion, nota de venta, presupuesto, guia de despacho, item o factura), de modo que el builder (`TransactionBuilder`) arranque prellenado con las lineas/cliente/condiciones del origen en vez de en blanco. Hoy la factura solo se crea desde cero; el usuario reingresa manualmente lo que ya existe en otro documento.

**Realidad del alcance (medida, no asumida)**: de los 6 origenes del caso V-08, solo **3 son VIABLES** hoy en el front nuevo (factura, guia de despacho, item) porque su modulo esta migrado y expone el dato para el prefill. Los otros **3 (cotizacion, nota de venta, presupuesto) son `DEUDA_TECNICA_CONFIRMAR`**: sus modulos NO estan migrados en el front nuevo, no hay stub/contrato del que leer, y **no se inventaron stubs**. El selector de origen muestra el estado honesto y el builder arranca en blanco para esos 3 en vez de fingir un prefill.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | 3/6 origenes viables; cotizacion/nota/presupuesto quedan como DEUDA sin stub inventado | Fidelidad al estado real de la migracion: mejor un origen honestamente ausente que un prefill falso (memoria: el codigo/estado manda, no el deseo del alcance) |
| 2 | Prefill via `initialValues` del builder ya existente (reuse, DET-32) | No se crea mecanismo nuevo de hidratacion; se reusa el contrato que el `TransactionBuilder` ya soporta |
| 3 | Entrypoint de UI "Crear desde..." en listado/detalle queda como follow-up | El ticket entrega el motor (lib + componente + ruta); enlazar el boton desde las vistas es incremental y aislable |

**Riesgos principales y como los mitigamos**:

- **Prefill parcial da senales falsas de completitud** → el selector marca explicitamente que origenes son viables y cuales DEUDA; los 3 no migrados arrancan el builder en blanco, no con datos parciales.
- **Romper la factura en blanco al agregar el prefill** → REQ-REGRESSION-01: sin `?origen`/`?id`, el builder arranca vacio igual que hoy (verificado por vitest builder + lib).
- **Sembrar bodega/origen por nombre (fragil)** → DEUDA anotada: la siembra de bodega/origen espera a que el detalle del documento exponga el codigo estable (consistente con DEC-7 de JOR-119: identificar por codigo, no por nombre).

**Que NO se hace en este ticket**:

- Stubs/prefill de cotizacion, nota de venta y presupuesto (modulos no migrados — DEUDA_TECNICA_CONFIRMAR).
- Entrypoint de UI "Crear desde..." en listado/detalle de ventas (follow-up: solo enlazar a la ruta `?origen=&id=`).
- Siembra de bodega/origen en las lineas (espera al codigo estable en el detalle del documento).

**Tamano estimado**: 1 session ejecutable (T3), ya ejecutada y cerrada. La pieza mas delicada fue el resolver por tipo de origen (`origen-factura.ts`) y su matriz viable/DEUDA.

**Como vas a saber que funciona**:

- Abro la ruta del builder con `?origen=factura&id=X` (o `guia`/`item`) y el builder aparece prellenado con las lineas del origen.
- Abro la ruta con un origen DEUDA (cotizacion/nota/presupuesto) y el builder arranca en blanco con estado honesto, sin datos inventados.
- Abro el builder sin `?origen` y arranca en blanco igual que hoy (regresion).

## Purpose

Migracion V-08: dar al front nuevo la capacidad de crear una factura desde un origen, prellenando el `TransactionBuilder` via su contrato `initialValues`. El motor de prefill (`lib/ventas/origen-factura.ts`) resuelve por tipo de origen y solo hidrata los origenes cuyo modulo esta migrado; los no migrados se declaran DEUDA sin fabricar datos. Si un dev senior lee solo esto: el alcance real es 3/6 origenes, el resto es deuda honesta, y la factura en blanco no se toca.

## Requirements

### REQ-01: crear factura desde un origen (prefill del builder por tipo)

> **Que cambia**: el builder de factura puede arrancar prellenado desde un documento/registro de origen (via ruta `?origen={tipo}&id={id}`), en vez de solo en blanco.
> **Por que**: caso V-08 de la migracion — el usuario no debe reingresar manualmente datos que ya existen en el origen.

El sistema MUST resolver el prefill por tipo de origen mediante `lib/ventas/origen-factura.ts` y sembrar el `TransactionBuilder` via su contrato `initialValues`, montando el flujo en el componente `CrearFacturaFromOrigen` accesible por la ruta `?origen={tipo}&id={id}`.

Para los origenes cuyo modulo esta migrado (VIABLES), el sistema MUST prellenar las lineas/datos disponibles del origen. Para los origenes cuyo modulo NO esta migrado (DEUDA), el sistema MUST arrancar el builder en blanco mostrando estado honesto y NO MUST fabricar stubs/datos ficticios.

**Matriz de los 6 origenes de V-08**:

| Origen | Estado | Comportamiento |
|--------|--------|----------------|
| factura | VIABLE | prefill del builder desde el detalle de la factura de origen |
| guia de despacho | VIABLE | prefill del builder desde la guia |
| item | VIABLE | prefill de la linea desde el item |
| cotizacion | DEUDA_TECNICA_CONFIRMAR | modulo no migrado; builder en blanco + estado honesto; sin stub inventado |
| nota de venta | DEUDA_TECNICA_CONFIRMAR | modulo no migrado; builder en blanco + estado honesto; sin stub inventado |
| presupuesto | DEUDA_TECNICA_CONFIRMAR | modulo no migrado; builder en blanco + estado honesto; sin stub inventado |

**Actor**: user (usuario que emite documentos de venta)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: origen viable (factura)
- **GIVEN** una factura de origen con lineas
- **WHEN** el usuario abre el builder con `?origen=factura&id=X`
- **THEN** el builder arranca prellenado con las lineas del origen via `initialValues`

#### Scenario: origen viable (guia de despacho / item)
- **GIVEN** una guia de despacho (o un item) migrada
- **WHEN** el usuario abre el builder con `?origen=guia&id=X` (o `?origen=item&id=X`)
- **THEN** el builder arranca prellenado con los datos disponibles del origen

#### Scenario: origen DEUDA (cotizacion / nota de venta / presupuesto)
- **GIVEN** un origen cuyo modulo NO esta migrado
- **WHEN** el usuario abre el builder con `?origen=cotizacion&id=X`
- **THEN** el selector muestra estado honesto y el builder arranca en blanco, sin datos inventados

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la ruta del builder con `?origen=factura&id=X` y ve la factura prellenada; con `?origen=cotizacion&id=X` ve el builder en blanco con estado honesto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | prefill origen viable | factura de origen con lineas | abrir `?origen=factura&id=X` | builder prellenado | lineas del origen en `initialValues` |
| 2 | origen DEUDA | cotizacion (no migrada) | abrir `?origen=cotizacion&id=X` | builder en blanco + estado honesto | sin lineas fabricadas |

### REQ-REGRESSION-01: la factura en blanco sigue funcionando

> **Que cambia**: nada — se preserva el arranque en blanco del builder cuando no hay origen.
> **Por que**: el prefill es aditivo; no debe alterar el flujo actual de crear factura desde cero.

El sistema MUST arrancar el `TransactionBuilder` vacio (comportamiento actual) cuando la ruta NO trae `?origen`/`?id`.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin origen
- **GIVEN** el builder de factura sin query de origen
- **WHEN** el usuario abre la ruta del builder
- **THEN** arranca en blanco igual que hoy, sin regresiones

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el builder sin `?origen` y crea una factura desde cero como siempre.

## Tasks

### Session 1 — Crear factura desde origen [tipo: auto] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Resolver de prefill por tipo de origen (matriz 3 viables / 3 DEUDA, sin stubs inventados) | REQ-01 | developer | — | front/jormat-front/src/lib/ventas/origen-factura.ts | vitest lib (`origen-factura`) verde | git revert | DET-4, DET-32 | done | 1 |
| S1.T2 | Componente `CrearFacturaFromOrigen` + ruta `?origen={tipo}&id={id}` que siembra `initialValues` del builder | REQ-01 | developer | S1.T1 | front/jormat-front/src/components/ventas/builder/TransactionBuilder/ | vitest builder verde + tsc/eslint 0 | git revert | DET-32, DET-40 | done | 1 |
| S1.T3 | Tests (builder + lib) + verificacion independiente (vitest/tsc/eslint) | REQ-01, REQ-REGRESSION-01 | developer | S1.T2 | front/jormat-front/src/components/ventas/builder/, front/jormat-front/src/lib/ventas/ | vitest builder+lib 160 passed \| 7 skipped, tsc 0, eslint 0 | (no aplica) | DET-7, DET-13, DET-33 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir en `## Sessions`, correr validacion T3, quality review + self-report verificado, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23, DET-33 | done | 1 |

## Constraints

- DET-32: reuse — el prefill reusa `TransactionBuilder.initialValues` y patrones de loader/error existentes; no se crea mecanismo nuevo de hidratacion.
- DET-4: no presentar inferencia como hecho — los 3 origenes no migrados se marcan DEUDA_TECNICA_CONFIRMAR, no se fingen viables.
- DEC-7 (JOR-119): identificar entidades por codigo estable, no por nombre — aplica a la siembra futura de bodega/origen (DEUDA).

## Decisions

### DEC-LOCAL-01: 3/6 origenes viables, resto DEUDA sin stub inventado
- **Contexto**: V-08 pide crear factura desde 6 origenes; se midio cuales tienen modulo migrado en el front nuevo.
- **Drivers**: fidelidad al estado real de la migracion; evitar prefill falso.
- **Opcion elegida**: implementar prefill para factura/guia/item; declarar cotizacion/nota/presupuesto como DEUDA_TECNICA_CONFIRMAR con builder en blanco + estado honesto.
- **Alternativas**: fabricar stubs para los 3 no migrados (descartada: prefill falso, deuda oculta).
- **Consecuencias**: alcance real 3/6; los 3 restantes quedan trazados como deuda a confirmar cuando se migren sus modulos.
- **Session**: 1

### DEC-LOCAL-02: prefill por reuse de initialValues (DET-32)
- **Contexto**: como hidratar el builder desde el origen.
- **Drivers**: no duplicar logica de hidratacion.
- **Opcion elegida**: reusar el contrato `initialValues` del `TransactionBuilder` + patrones de loader/error existentes.
- **Alternativas**: mecanismo nuevo de hidratacion (descartada: YAGNI, ya existe).
- **Consecuencias**: cambio aditivo, sin visual nuevo que draftear.
- **Session**: 1

## Acceptance checkpoints

- [x] **Funcional**: prefill para los 3 origenes viables + estado honesto para los 3 DEUDA + factura en blanco preservada
- [x] **Tests** (DET-37 dim4): vitest builder+lib 160 passed | 7 skipped, corridos y en VERDE
- [x] **Rules**: DET-4/DET-32/DET-40 respetadas
- [x] **Integration**: factura en blanco sin regresion (REQ-REGRESSION-01)
- [x] **Docs oficiales del proyecto** (DET-37 dim1): N/A (front sobre stub; sin doc de plataforma afectada)
- [x] **KB DKC** (DET-37 dim2): decisiones registradas en el ticket (origenes-viables, necessity-assessment, stub-data-gap)
- [x] **Docs externas DKC** (DET-37 dim3): N/A (no toca DKC ni convenciones)
- [x] **Planning-completeness**: registrada en decisions_log del ticket
