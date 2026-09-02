---
id: SPEC-JOR-141-registro-deuda-tecnica
project: jormat-evolution
ticket: JOR-141
status: done
---

# Registro consolidado de deuda tecnica de la ola (docs/front/deuda-tecnica.md)

# Registro consolidado de deuda tecnica de la ola (docs/front/deuda-tecnica.md)

## Executive summary — lo que estas aprobando

**Que se quiere**: un registro unico y auditable en la doc de toda la deuda tecnica que dejo la ola de trabajo. Hoy la deuda vive dispersa entre comentarios in-code, tickets y DECs; no hay una fuente unica que un tercero pueda auditar. Este ticket consolida en `docs/front/deuda-tecnica.md` que deuda hay, que esta comentado en el codigo y donde (`file:line`), que falta para cerrar cada item, y de donde se origina (ticket / DEC de sign-off).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El registro distingue categoria A (backend stub existe + comentado in-code) de categoria B (endpoint inexistente → comentado solo en front + doc) | Es la diferencia honesta entre "hay backend donde comentar la deuda" y "no lo hay". Sin la distincion, un tercero asumiria que toda la deuda tiene backend detras |
| 2 | El registro vive en `docs/front/deuda-tecnica.md` y NO duplica `legacy-parity-vcp.md`, enlaza | Fuente unica versionada junto al codigo; evita drift entre dos docs que hablan de lo mismo |

**Riesgos principales y como los mitigamos**:

- **Inventar backend donde no existe** (cat B) → cada item cat B se marca explicitamente como "no comentada — endpoint inexistente", con el `file:line` del front donde queda registrada.
- **Duplicar contenido de `legacy-parity-vcp.md`** (dos fuentes que divergen) → el registro enlaza, no copia.

**Que NO se hace en este ticket**: no se toca codigo; no se implementa ningun endpoint faltante; no se resuelve ninguna deuda (solo se registra).

**Tamano estimado**: 1 session ejecutable, ~2h. La pieza mas delicada es el barrido front+back para catalogar cada item con `file:line` y clasificarlo correctamente (cat A vs cat B).

**Como vas a saber que funciona**: abres `docs/front/deuda-tecnica.md` y encuentras los 23 items (8 cat A, 6 cat B, + diferidos), cada uno con que falta / origen / ubicacion in-code (`file:line`) / que falta para cerrar / ticket de sign-off; `README.md` y `legacy-parity-vcp.md` enlazan al registro.

---

## Purpose

Consolidar en un registro unico y auditable la deuda tecnica que dejo la ola de trabajo, cerrando el gap de trazabilidad (hoy la deuda esta dispersa entre comentarios in-code, tickets y DECs). Cada item queda trazado a `file:line`, con origen y sign-off, distinguiendo deuda con backend stub (cat A) de deuda por endpoint inexistente (cat B).

## Requirements

### REQ-01: registro unico de deuda con origen, ubicacion in-code, que falta y sign-off, distinguiendo cat A/B

> **Que cambia**: existe un registro unico y auditable de la deuda tecnica de la ola en `docs/front/deuda-tecnica.md`; antes la deuda vivia dispersa entre comentarios in-code, tickets y DECs, sin fuente unica.
> **Por que**: cerrar el gap de trazabilidad de la deuda; que un tercero pueda auditar que deuda hay, donde esta comentada, que falta y de donde viene.

El sistema (doc) MUST registrar cada item de deuda tecnica de la ola con: que falta; origen (ticket o DEC); donde esta comentada en el codigo (front y/o backend, con `file:line`, o "no comentada — endpoint inexistente"); que falta para cerrar; y el ticket de sign-off backend (JOR-086/090/092/099). MUST distinguir categoria A (backend stub existe + comentado in-code) de categoria B (endpoint inexistente → comentado solo en front + doc). MUST organizarse en tablas por modulo. MUST enlazarse desde `README.md` y `legacy-parity-vcp.md`. MUST NOT duplicar `legacy-parity-vcp.md` ni presentar como comentado in-code lo que no lo esta (cat B).

**Actor**: system (registro de deuda tecnica)
**Layers**: (docs)

<details><summary>Scenarios de validacion</summary>

#### Scenario: registro verificado contra el codigo, cat A vs cat B honesta
- **GIVEN** la deuda tecnica de la ola dispersa entre comentarios in-code, tickets y DECs
- **WHEN** se escribe el registro consolidado `docs/front/deuda-tecnica.md`
- **THEN** cada item tiene su ubicacion trazada a `file:line` (front y/o backend) o marcada como "no comentada — endpoint inexistente"
- **AND** los items cat A (8) referencian el stub backend + el comentario in-code; los items cat B (6) se marcan como comentados solo en front + doc
- **AND** `README.md` y `legacy-parity-vcp.md` enlazan al registro sin duplicarlo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre `docs/front/deuda-tecnica.md` y encuentra los 23 items (8 cat A, 6 cat B, + diferidos), cada uno con que falta / origen / ubicacion in-code (`file:line`) / que falta para cerrar / sign-off backend; `README.md` y `legacy-parity-vcp.md` referencian el registro.

## Tasks

### Session 1 — Registro de deuda tecnica en docs/front [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Barrido del codigo front y backend de la ola + catalogo `file:line` de cada item de deuda (23), clasificando cat A (backend stub + comentado in-code) vs cat B (endpoint inexistente → comentado solo en front + doc), con origen (ticket/DEC) y que falta para cerrar | REQ-01 | developer | — | (barrido, sin escritura) | catalogo completo con `file:line` por item; clasificacion cat A/B correcta | (no aplica — solo lectura) | DET-11, DET-16 | done | 1 |
| S1.T2 | Redaccion de `docs/front/deuda-tecnica.md` (tablas por modulo, por item: que falta / origen / ubicacion in-code file:line / que falta para cerrar / sign-off JOR-086/090/092/099) + enlaces desde `README.md` y `legacy-parity-vcp.md` sin duplicar | REQ-01 | developer | S1.T1 | `docs/front/deuda-tecnica.md`, `docs/front/README.md`, `docs/front/legacy-parity-vcp.md` | 23 items verificados file:line; enlaces resuelven; sin em dash | (no aplica — solo docs) | DET-11, DET-16, DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, verificacion independiente del scope del commit (DET-33), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision documentada; commit 800675d scoped a `docs/front/*` | (no aplica — cierre de session) | DET-20, DET-23, DET-33 | done | 1 |

## Constraints

- El registro vive en `docs/front/deuda-tecnica.md`, versionado junto al codigo. No duplica `legacy-parity-vcp.md`, enlaza.
- No se toca codigo. Cat B no se comenta in-code (no hay backend donde hacerlo); se marca "no comentada — endpoint inexistente". Sin em dash en el texto (convencion de la organizacion).

## Decisions

### DEC-LOCAL-01: distincion categoria A vs categoria B
- **Contexto**: la deuda de la ola tiene dos naturalezas distintas; tratarlas igual haria creer que toda tiene backend detras.
- **Opcion elegida**: categoria A = backend stub existe + deuda comentada in-code (front y/o backend, `file:line`); categoria B = endpoint inexistente → deuda comentada solo en front + doc, marcada como "no comentada — endpoint inexistente".
- **Consecuencias**: el registro es honesto sobre donde vive cada deuda y que backend falta; un tercero no asume backend donde no lo hay.
- **Session**: 1

### DEC-LOCAL-02: registro unico que enlaza, no duplica
- **Contexto**: `legacy-parity-vcp.md` ya describe el estado por dominio; copiar la deuda ahi generaria dos fuentes divergentes.
- **Opcion elegida**: `docs/front/deuda-tecnica.md` como registro maestro; `README.md` y `legacy-parity-vcp.md` enlazan.
- **Consecuencias**: fuente unica auditable; evita drift entre docs.
- **Session**: 1

## Acceptance checkpoints

- [x] **Funcional**: `docs/front/deuda-tecnica.md` registra los 23 items (8 cat A, 6 cat B, + diferidos), cada uno trazado a `file:line` con origen, que falta y sign-off.
- [x] **Docs oficiales del proyecto** (DET-37 dim1): registro creado en `docs/front/` + enlaces desde README.md y legacy-parity-vcp.md.
- [x] **KB DKC** (DET-37 dim2): distincion cat A/B y ubicacion del registro maestro en `decisions_log` del ticket.
- [x] **Integration**: commit 800675d scoped a `docs/front/*`, sin arrastrar codigo (verificacion independiente DET-33).
- [x] **Planning-completeness**: entry `necessity-assessment` (build, cierra gap de trazabilidad de la deuda) registrada.
