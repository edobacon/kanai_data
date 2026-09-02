---
id: SPEC-audit-consistency-remediation
project: jormat-evolution
ticket: JOR-103
status: done
---

# Remediación de auditoría de consistencia (plan/legacy) — JOR-103

# Remediación de auditoría de consistencia (plan/legacy) — JOR-103

## Executive summary — lo que estas aprobando

> Diagnóstico ya cerrado por la auditoría adversarial (5 agentes, 2026-07-23). Este spec
> materializa la **remediación**: 1 fix de código real (P0, fuga de datos) + corrección de
> premisas falsas y huecos en los DEC records de ventas/compras/pagos (P1/P2).

**Que se quiere**: cerrar la fuga de costo/margen que JOR-084 introdujo en el detalle de item
(un cajero/vendedor sin `items.parts:cost-view` recibe `precioCompra`/`precioMayor` que la UI le
esconde), y corregir los DEC records donde la auditoría encontró premisas técnicas falsas,
tipos omitidos y justificaciones sin respaldo — para que las decisiones que van a negocio se
tomen con información correcta.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Gatear `precioCompra`/`precioMayor` bajo `items.parts:cost-view` (igual que `costoCompra`) | JOR-077 los clasificó cost-sensibles; JOR-084 los expuso sin gate. Corrección de correctitud, no cambio de negocio |
| 2 | Fix RF-4 backend-autoritativo (no sobreescribir `net_price` sin cost-view) | El frontend no es frontera de seguridad; el fix debe vivir en el service |

**Riesgos principales y como los mitigamos**:

- **Romper el round-trip de edición de JOR-084 para usuarios CON cost-view** → regression e2e que
  asevera que con cost-view el detalle sigue exponiendo los 3 campos y editar los preserva.
- **Que el fix de RF-4 rompa la edición sin cost-view** (net_price a 0) → el service omite el campo
  del UPDATE cuando no hay cost-view (no lo pisa con 0), verificado por integración.

**Que NO se hace en este ticket** (limites explicitos — van a backlog `must`, pendientes de negocio):

- Decidir si `documento_nn` entra al enum `tipo_dte` (DEC-009) — se reformula la pregunta, decide negocio.
- Regla de redondeo CLP (DEC-010), inversión de obligatoriedad de observación (DEC-012), métrica de
  bloqueo 120d (DEC-013), drop de medios de pago (DEC-011), reuse-vs-drop del catálogo muerto (DEC-011),
  edición de borrador core-vs-diferida (DEC-014). Este spec **corrige los records y formula las
  preguntas**; la decisión de negocio queda como backlog `must` que bloquea el cierre.

**Tamano estimado**: 4 sessions. La más riesgosa es S1 (P0, toca código mergeado + su e2e).

**Como vas a saber que funciona**:

- Un usuario sin `items.parts:cost-view` hace `GET /inventario/items/:id` y NO recibe `precioCompra`
  ni `precioMayor` (ni `costoCompra`); con la capability, recibe los tres.
- Editar un item sin cost-view NO pone `net_price` en 0.
- Los DEC records 009..014 quedan sin premisas falsas, con las preguntas de negocio bien formuladas.

---

## Purpose

Corregir (a) una fuga de datos field-level en el detalle de item introducida por JOR-084 y (b) los
defectos de exactitud en los DEC records de la sesión de modelo de datos, detectados por la auditoría
adversarial de JOR-103. El fix de código es targeted; la remediación de records es documental.

## Requirements

### REQ-FIX-01 — Gating de `precioCompra`/`precioMayor` (RF-1, P0)

> **Que cambia**: el backend deja de devolver `precioCompra` (nm_price) y `precioMayor` (mayor_price)
> a usuarios sin `items.parts:cost-view`, tal como ya hace con `costoCompra`.
> **Por que**: JOR-077 clasificó compra/mayor como costo/margen sensible; JOR-084 los expuso sin gate.

El sistema MUST omitir `precioCompra` y `precioMayor` del `ItemDetailDto` devuelto por `findOne`
cuando `canViewCost` es `false`, junto a `costoCompra`.

<details><summary>Scenarios de validacion</summary>

- GIVEN un usuario con `items.parts:view` pero SIN `items.parts:cost-view` WHEN hace `GET /inventario/items/:id` THEN la respuesta NO contiene `precioCompra`, `precioMayor` ni `costoCompra`.
- GIVEN un usuario CON `items.parts:cost-view` WHEN hace `GET /inventario/items/:id` THEN la respuesta contiene los tres campos con sus valores reales.
</details>

### REQ-FIX-02 — No sobreescribir costo al editar sin cost-view (RF-4, P0)

> **Que cambia**: editar un item sin `items.parts:cost-view` ya no pisa `net_price` con 0.
> **Por que**: el mapper del front defaultea `costoCompra` gateado a 0 y el PATCH completo lo persistía.

El sistema MUST preservar `net_price` (costo) en un UPDATE cuando el usuario no tiene
`items.parts:cost-view`: el service NO debe escribir el costo si no puede verlo (fix backend-autoritativo).

<details><summary>Scenarios de validacion</summary>

- GIVEN un item con `net_price=15000` y un usuario sin cost-view WHEN edita cualquier otro campo y hace PATCH THEN `net_price` permanece 15000 (no cae a 0).
- GIVEN un usuario CON cost-view WHEN edita y envía `compraNeto` THEN `net_price` se actualiza al valor enviado.
</details>

### REQ-REGRESSION-01 — Round-trip de JOR-084 intacto para cost-view

> **Que cambia**: nada para usuarios con cost-view.
> **Por que**: DET-7 — el fix no debe degradar el contrato de edición que JOR-084 estableció.

El sistema MUST mantener el round-trip crear→editar sin pérdida de datos para usuarios con
`items.parts:cost-view` (comportamiento de JOR-084 / SPEC-items-form-integrity).

## Fix scope

### Antes (comportamiento actual)
`applyCostGating` (items.service.ts:95-100) borra solo `costoCompra`. `precioCompra`/`precioMayor` se
devuelven a cualquier usuario con `items.parts:view`. Al editar sin cost-view, `compraNeto` cae a 0 y
el PATCH escribe `net_price=0`.

### Despues (comportamiento esperado)
`applyCostGating` omite los tres campos sin cost-view. El `update` no persiste `net_price` cuando el
usuario no tiene cost-view. El comentario del DTO deja de afirmar "No sensibles". El e2e asevera la omisión.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `backend/jormat-api/src/items/items.service.ts` | `applyCostGating` borra `precioCompra`+`precioMayor`; `update` no pisa `net_price` sin cost-view | Consumidores de `findOne`/`update` (controller GET/PATCH item) |
| `backend/jormat-api/src/items/dto/item.dto.ts:158-159` | Corregir comentario "No sensibles" | Doc only |
| `backend/jormat-api/test/e2e/items-read.e2e-spec.ts` | Agregar aserción de omisión sin cost-view a nivel service | Test coverage |
| `backend/jormat-api/src/items/items.service.spec.ts` | Unit del gating extendido (3 campos) | Test coverage |
| `front/.../ItemCreateForm/itemDetailToFormValues.ts:21-24` | Actualizar comentario de DEUDA (resuelto backend-side) | Doc only |

## Tasks

Ver plan de sessions en el ticket `JOR-103.md` (`### Plan de sessions`). Resumen:

- **S1** (T3): REQ-FIX-01 + REQ-FIX-02 + REQ-REGRESSION-01 — fix de código + tests + regression.
- **S2** (T1): remediación DEC-012 + DEC-013 (premisas falsas). source_ref: hallazgos E, F.
- **S3** (T2): remediación DEC-009 + DEC-010 (accepted con huecos). source_ref: hallazgos B, C.
- **S4** (T2): remediación DEC-011 + DEC-014 (proposed). source_ref: hallazgos D, G.

## Technical reference

- Endpoint afectado: `GET /inventario/items/:id`, `PATCH /inventario/items/:id`.
- Capability resolver: `items.controller.ts:106,123,141` — `canViewCost = can(caps, 'items.parts:cost-view')`.
- Evidencia completa de cada hallazgo: `JOR-103.md` §Hallazgos.

## Acceptance checkpoints

- [x] AC-1 (REQ-FIX-01): usuario sin `items.parts:cost-view` recibe detalle SIN `precioCompra`, `precioMayor`, `costoCompra` (e2e a nivel service). Evidencia: test verde + inspección del payload.
- [x] AC-2 (REQ-FIX-01): usuario CON cost-view recibe los tres campos con valor real. Evidencia: e2e verde.
- [x] AC-3 (REQ-FIX-02): editar sin cost-view NO deja `net_price=0` (se preserva el valor previo). Evidencia: integración update.
- [x] AC-4 (REQ-REGRESSION-01): round-trip crear→editar con cost-view sin pérdida (suite JOR-084). Evidencia: e2e existente verde.
- [x] AC-5 (P1/P2): DEC-009..014 sin premisas falsas, con preguntas de negocio bien formuladas; validados con `dkc-validate Decision`.

## Backlog (pendiente de negocio — DET-17, bloquea cierre)

Ver seccion Backlog en `JOR-103.md`. Todos `priority: must`, `status: pending-business`.
