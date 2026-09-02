---
id: SPEC-JOR-138-doc-evergreen-migracion
project: jormat-evolution
ticket: JOR-138
status: done
---

# Documentar el comportamiento migrado de Ventas/Compras/Pagos (doc evergreen de las 2 olas)

# Documentar el comportamiento migrado de Ventas/Compras/Pagos (doc evergreen de las 2 olas)

## Executive summary — lo que estas aprobando

**Que se quiere**: cerrar la deuda de documentacion (DET-37 dim1) que cada ticket de las dos olas del 2026-08-08 fue marcando N/A ("front sobre stub, sin doc de usuario aun"). Se consolida en la doc evergreen de jormat el comportamiento y los contratos de las tres vistas (Ventas, Compras, Pagos) tras la ola previa de front-sobre-stub y la ola de paridad legacy. La doc se verifica contra el codigo final (`file:line`), no contra el plan: el codigo manda.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | La doc vive en `evolution-mono/docs/front/`, NO en `jormat_docs/` | `docs/CONVENTIONS.md` fija que el comportamiento/contratos evergreen viven en `docs/` (versionado con el codigo, unico arbol git). `jormat_docs/` es el KB de investigacion/arquitectura y no es repo git. Desvia del `execute_scope` original del ticket, fundada |

**Riesgos principales y como los mitigamos**:

- **Documentar el plan y no el codigo** (la doc queda mintiendo apenas el codigo diverge) → cada afirmacion verificada contra el codigo final con referencia `file:line`; correcciones de premisa honestas cuando el plan no coincidia (ver Decisions).
- **office-payments cambia tras JOR-140** (la doc lo describe como stub y quedaria stale) → follow-up registrado en `decisions_log` (`post-140-refresh`).

**Que NO se hace en este ticket**: no se toca codigo; no se documenta backend real (las vistas corren sobre stub MSW); office-payments se documenta como stub (su alineacion vive en JOR-140).

**Tamano estimado**: 1 session ejecutable, ~2h. La pieza mas delicada es la verificacion `file:line` contra el codigo final de las tres vistas.

**Como vas a saber que funciona**: los 3 docs nuevos existen en `docs/front/` y describen el comportamiento tal cual esta en el codigo; `views.md` y `README.md` referencian los nuevos docs; sin em dash en el texto.

---

## Purpose

Consolidar la doc evergreen del comportamiento migrado de Ventas/Compras/Pagos tras las dos olas del 2026-08-08, verificada 1:1 contra el codigo final. Salda la deuda DET-37 dim1 que cada ticket implementable de las olas dejo como N/A.

## Requirements

### REQ-01: consolidar la doc evergreen de las 2 olas en `docs/front`, verificada contra el codigo

> **Que cambia**: existe doc evergreen del comportamiento y los contratos de Ventas, Compras y Pagos en `evolution-mono/docs/front/`; antes cada ticket de las olas dejaba la dimension de docs como N/A.
> **Por que**: cerrar la deuda DET-37 dim1 de forma consolidada, con una fuente unica versionada junto al codigo.

El sistema (doc) MUST describir el comportamiento y los contratos de las tres vistas tal como quedaron en el codigo final de las dos olas (front-sobre-stub + paridad legacy), con cada afirmacion trazable a `file:line`. MUST cubrir: builder (ventas/compras) con calculos/formulas, descuentos %, redondeo fiel, IVA por moneda, minPrice/costo, stock por bodega, reglas por item, semaforo, observacion, formas de pago, tipo<->moneda, tipoDTE, fecha, borrador; cobranza (aplicar/efectuar, bloqueo 120d, pagos de sucursal, export CSV, deuda); el mapa `DEUDA_TECNICA_CONFIRMAR` (refs JOR-086/090/092); y el resumen de decisiones. MUST NOT presentar el plan como hecho cuando el codigo diverge (correcciones de premisa registradas).

**Actor**: system (doc evergreen)
**Layers**: (docs)

<details><summary>Scenarios de validacion</summary>

#### Scenario: doc verificada contra el codigo
- **GIVEN** las tres vistas migradas en su codigo final
- **WHEN** se escribe la doc evergreen
- **THEN** cada comportamiento documentado tiene una referencia `file:line` al codigo real
- **AND** las premisas del plan que el codigo no confirma se corrigen en la doc (observacion por linea opcional; DEC-012 aplica al form de aplicar-pago; sin vista de reporte de pagos separada; export CSV no en compras list; minPrice solo ventas / siembra de costo solo compras; office-payments stub; soft-delete AR es DELETE duro)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre `docs/front/transaction-builder.md`, `docs/front/payments.md` y `docs/front/legacy-parity-vcp.md` y encuentra el comportamiento migrado descrito y trazado al codigo; `views.md` y `README.md` referencian los nuevos docs.

## Tasks

### Session 1 — Doc evergreen de las 2 olas en docs/front [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Documentar builder (ventas/compras: calculos/formulas, descuentos %, redondeo fiel, IVA por moneda, minPrice/costo, stock por bodega, reglas por item, semaforo, observacion, formas de pago, tipo<->moneda, tipoDTE, fecha, borrador) y pagos (cobranza, aplicar/efectuar, bloqueo 120d, pagos de sucursal, export CSV, deuda) | REQ-01 | developer | — | `docs/front/transaction-builder.md`, `docs/front/payments.md` | doc verificada contra el codigo (file:line); sin em dash | (no aplica — solo docs) | DET-11, DET-16, DET-37 | done | 1 |
| S1.T2 | Documentar paridad legacy + mapa DEUDA_TECNICA_CONFIRMAR (refs JOR-086/090/092) + resumen de decisiones; referenciar los nuevos docs desde views.md y README | REQ-01 | developer | S1.T1 | `docs/front/legacy-parity-vcp.md`, `docs/front/views.md`, `README.md` | correcciones de premisa aplicadas; cross-refs presentes; sin em dash | (no aplica — solo docs) | DET-4, DET-16, DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, verificacion independiente del scope del commit (DET-33), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision documentada; commit a204193 scoped a `docs/front/*` (5 archivos) | (no aplica — cierre de session) | DET-20, DET-23, DET-33 | done | 1 |

## Constraints

- La doc evergreen vive en `evolution-mono/docs/front/` por `docs/CONVENTIONS.md`; `jormat_docs/` no es repo git y queda para investigacion/arquitectura.
- No se toca codigo. Sin em dash en el texto (convencion de la organizacion).

## Decisions

### DEC-LOCAL-01: ubicacion de la doc en docs/front (no jormat_docs)
- **Contexto**: el `execute_scope` original del ticket apuntaba a `jormat_docs/`.
- **Drivers**: `docs/CONVENTIONS.md` fija que el comportamiento/contratos evergreen van en `docs/` (versionado con el codigo, unico arbol git); `jormat_docs/` no es repo git.
- **Opcion elegida**: escribir en `evolution-mono/docs/front/`.
- **Alternativas**: `jormat_docs/` (descartada: no versionada, KB de investigacion); DOC en `projects/jormat-evolution/kb/` (descartada: la doc pertenece al arbol del codigo).
- **Consecuencias**: desviacion del `execute_scope` original, fundada y auditada; la doc queda junto al codigo que describe.
- **Session**: 1

### DEC-LOCAL-02: correcciones de premisa por verificacion contra el codigo
- **Contexto**: el plan del ticket asumia comportamientos que el codigo final no confirma.
- **Opcion elegida**: documentar el codigo real y corregir las premisas.
- **Correcciones**: observacion por linea del builder es OPCIONAL (DEC-012 aplica al form de aplicar-pago, no al builder); no hay vista de reporte de pagos separada (P-06 deferido); export CSV en ventas + cobranza, NO en compras list; minPrice solo ventas / siembra de costo solo compras; office-payments es stub; soft-delete AR es DELETE duro (deuda).
- **Session**: 1

## Acceptance checkpoints

- [x] **Funcional**: los 3 docs nuevos describen el comportamiento migrado de las tres vistas, trazado a `file:line`.
- [x] **Docs oficiales del proyecto** (DET-37 dim1): creadas en `docs/front/` (transaction-builder, payments, legacy-parity-vcp) + views.md/README actualizados. Cierra la deuda dim1 de las olas.
- [x] **KB DKC** (DET-37 dim2): decisiones registradas en `decisions_log` del ticket.
- [x] **Integration**: commit a204193 scoped a `docs/front/*` (5 archivos), sin arrastrar codigo (verificacion independiente DET-33).
- [x] **Planning-completeness**: entry `necessity-assessment` (build, cierra deuda DET-37 dim1) registrada.
