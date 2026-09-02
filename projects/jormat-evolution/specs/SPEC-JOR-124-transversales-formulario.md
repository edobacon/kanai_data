---
id: SPEC-JOR-124-transversales-formulario
project: jormat-evolution
ticket: JOR-124
status: done
---

# Transversales de formulario (Ventas + Compras + Pagos)

# Transversales de formulario (Ventas + Compras + Pagos)

## Executive summary — lo que estas aprobando

**Que se corrige**: tres residuos transversales de los formularios de documento y pago, sin logica de negocio de calculo:

1. **Fecha del documento/pago (X-FECHA-01)**: hoy la fecha no tiene un default consistente entre vistas. Se unifica: la fecha es **editable** con **valor por defecto = hoy** en Ventas, Compras y Pagos, resuelto por un unico helper `todayIso()` (fecha local, no UTC). El campo sigue editable; solo se inicializa.
2. **nroDoc opcional (P-02)**: el formulario de pago marcaba `nroDoc` con asterisco (`required`) mientras el schema ya lo declara `.optional()`. Se elimina el asterisco para que la UI sea coherente con el contrato. La `observacion` sigue obligatoria (D3/DEC-012).
3. **Forma de pago token↔id (P-03)**: se audita el contrato del medio de pago. El contrato es **token de punta a punta** (el adapter `customers.ts` y el stub MSW aceptan el token; DEC-002). El id numerico que espera el backend legacy NO vive en este repo; el mapeo token→id queda como **DEUDA_TECNICA_CONFIRMAR**, sin inventar mapeo.

**Lo que NO cambia**: el caracter editable de la fecha (solo se inicializa el default); la obligatoriedad de `observacion` en pagos; el contrato token del medio de pago (no se introduce un id numerico ficticio).

**Riesgos principales y mitigacion**: (a) un default de fecha en UTC daria un dia corrido cerca de medianoche → `todayIso()` usa fecha local via date-fns. (b) quitar el `required` de `nroDoc` en la UI sin alinear el schema daria una UI inconsistente → se verifico que el schema ya es `.optional()` (coherencia, no cambio de contrato). (c) inventar un mapeo token→id sin fuente romperia silenciosamente la persistencia → se difiere explicitamente como deuda tecnica a confirmar contra el backend legacy.

## Purpose

- **Problema**: residuos de formulario transversales a Ventas/Compras/Pagos: fecha sin default consistente, `nroDoc` marcado como obligatorio contra un schema opcional, y ambiguedad en el contrato del medio de pago (token vs id numerico).
- **A quien afecta**: usuarios que emiten documentos de venta/compra y registran pagos; ven un formulario con defaults inconsistentes y un campo marcado obligatorio que no lo es.
- **Sintoma reportado**: la fecha del documento no aparece precargada con hoy; `nroDoc` muestra asterisco pese a ser opcional; duda sobre si el medio de pago viaja como token o como id numerico.

## Requirements

### REQ-R1: la fecha del documento/pago es editable con valor por defecto = hoy
> Que cambia: la fecha se inicializa con la fecha de hoy (local) en Ventas, Compras y Pagos, manteniendose editable.
> Por que: decision de negocio X-FECHA-01 (2026-08-08): permitir ajuste manual conservando un default util y consistente entre vistas.

MUST: los formularios de Ventas, Compras y Pagos MUST inicializar el campo de fecha con la fecha de HOY resuelta por el helper `todayIso()` (`src/lib/date.ts`, date-fns, fecha **local** no UTC). El campo MUST permanecer editable (el default solo aplica al valor inicial).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN un formulario de venta nuevo WHEN se abre THEN el campo fecha muestra la fecha de hoy (local) y el usuario puede cambiarla.
- Scenario: GIVEN un formulario de pago nuevo cerca de medianoche WHEN se abre THEN la fecha por defecto es el dia local, no el dia UTC.
- Scenario: GIVEN el usuario edita la fecha por defecto WHEN guarda THEN se persiste la fecha editada, no el default.
</details>

### REQ-R2: nroDoc es opcional en el formulario de pago
> Que cambia: se elimina el asterisco (`required`) del campo `nroDoc` en el formulario de pago.
> Por que: coherencia con el schema, que ya declara `nroDoc` como `.optional()` (P-02).

MUST: el campo `nroDoc` del formulario de pago (`EfectuarPagoForm`) MUST NOT mostrar el indicador de obligatorio (asterisco). La `observacion` MUST seguir siendo obligatoria (D3/DEC-012). No se modifica el contrato del schema (ya es `.optional()`).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN el formulario de pago WHEN se renderiza THEN `nroDoc` no muestra asterisco y el submit procede sin completarlo.
- Scenario: GIVEN el formulario de pago sin `observacion` WHEN se intenta enviar THEN la validacion lo rechaza (observacion sigue obligatoria).
</details>

### REQ-R3: contrato del medio de pago = token de punta a punta; mapeo token→id diferido
> Que cambia: se confirma que el medio de pago viaja como token en todo el flujo del repo; el mapeo al id numerico del backend legacy queda como deuda tecnica.
> Por que: el id numerico del backend legacy no vive en este repo; inventar el mapeo romperia la persistencia en silencio (P-03).

MUST: el flujo del medio de pago (adapter `customers.ts` + stub MSW) MUST operar con el TOKEN de punta a punta (DEC-002). El mapeo token→id numerico MUST NOT inventarse en este repo; queda registrado como **DEUDA_TECNICA_CONFIRMAR** contra el backend legacy.

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN un pago con un medio seleccionado WHEN se envia a traves del adapter y el stub MSW THEN el medio viaja como token (no como id numerico).
- Scenario: GIVEN el backend legacy espera un id numerico WHEN se resuelva el contrato real THEN el mapeo token→id se define en ese momento (deuda a confirmar), no antes.
</details>

## Tasks

### Session 1 — Transversales de formulario [tipo: fix] [tier: T2]

**Task S1.T1 — Fecha editable con default = hoy (Ventas + Compras + Pagos)**
- source_ref: REQ-R1
- agent: developer
- validation: los tres formularios inicializan la fecha con `todayIso()` (fecha local); el campo sigue editable; test del helper `todayIso()` + inicializacion
- rollback: git revert 98a830f
- rules: [DET-5, DET-40]

**Task S1.T2 — nroDoc opcional en el formulario de pago**
- source_ref: REQ-R2
- agent: developer
- validation: `EfectuarPagoForm` no muestra asterisco en `nroDoc`; submit procede sin completarlo; `observacion` sigue obligatoria
- rollback: git revert 9fbcf50
- rules: [DET-40]

**Task S1.T3 — Auditoria del contrato del medio de pago (deuda P-03)**
- source_ref: REQ-R3
- agent: developer
- validation: adapter `customers.ts` + stub MSW confirmados como token de punta a punta (DEC-002); mapeo token→id registrado como DEUDA_TECNICA_CONFIRMAR (no se inventa)
- rollback: git revert 3fc2c87
- rules: [DET-4, DET-40]

**Task S1.T4 — Tests + verificacion**
- source_ref: REQ-R1, REQ-R2, REQ-R3
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest verde; tsc/eslint exit 0
- rollback: git revert 71e2f9b
- rules: [DET-4, DET-7, DET-13]

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado a los formularios de Ventas/Compras/Pagos y al contrato de pago (`schemas/payments.ts`, `services/api/payments/`). No tocar backend legacy.
- El default de fecha usa fecha LOCAL (date-fns), no UTC.
- No inventar el mapeo token→id del medio de pago; el contrato es token de punta a punta (DEC-002).
- La `observacion` de pago sigue obligatoria (D3/DEC-012).

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Fecha editable con default = hoy en las 3 vistas via `todayIso()` | X-FECHA-01 (decision del dev 2026-08-08): un unico helper (fecha local) unifica el default; el campo sigue editable |
| 2 | `nroDoc` opcional en la UI (quitar asterisco) | P-02: coherencia con el schema `.optional()`; no se cambia el contrato |
| 3 | Medio de pago = token de punta a punta; mapeo token→id = DEUDA_TECNICA_CONFIRMAR | P-03 (DEC-002): el id numerico es del backend legacy que no vive en este repo; inventarlo romperia la persistencia en silencio. Se difiere a confirmar contra el backend |

## Acceptance checkpoints

- [x] AC-1 (REQ-R1): formularios de Ventas/Compras/Pagos inicializan la fecha con hoy (local) y siguen editables (test + vitest verde).
- [x] AC-2 (REQ-R2): `nroDoc` sin asterisco en el form de pago; submit procede sin completarlo; `observacion` sigue obligatoria.
- [x] AC-3 (REQ-R3): medio de pago viaja como token de punta a punta; mapeo token→id registrado como deuda tecnica a confirmar (no inventado).

## Technical reference

- Helper de fecha: `src/lib/date.ts` (`todayIso()`, date-fns, fecha local).
- Formulario de pago: `src/components/payments/detail/EfectuarPagoForm/` (`nroDoc`, `observacion`).
- Contrato de pago: `src/lib/schemas/payments.ts` (`nroDoc` `.optional()`), `src/services/api/payments/`.
- Medio de pago (token): adapter `customers.ts` + stub MSW (DEC-002).
- Commits: 98a830f (fecha), 9fbcf50 (nroDoc), 3fc2c87 (deuda P-03), 71e2f9b (test) en `fix/ola1-paridad-vcp`.
