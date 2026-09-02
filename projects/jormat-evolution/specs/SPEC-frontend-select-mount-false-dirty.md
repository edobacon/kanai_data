---
id: SPEC-frontend-select-mount-false-dirty
project: jormat-evolution
ticket: JOR-063
status: done
---

# Fix del falso dirty al montar Selects de Radix (guard JOR-056 avisa sin ediciones)

# Fix del falso dirty al montar Selects de Radix (guard JOR-056 avisa sin ediciones)

## Executive summary — lo que estas aprobando

**Que se quiere**: que al abrir un formulario (item, ventas, compras, pago) y salir sin tocar nada, NO aparezca el diálogo "Perderás los cambios". Hoy aparece siempre porque el `Select` de Radix ensucia el form al montar.

**Causa raíz (confirmada)**: `@radix-ui/react-select` (`SelectBubbleInput`, `dist/index.mjs:1094-1110`) dispara un `change` sintético en el montaje (`prevValue undefined !== selectValue`) → `onValueChange(value)` → `field.onChange` del Controller de RHF. Como el valor emitido (`''`) no es deep-equal al default (`undefined`), RHF marca el campo dirty → `formState.isDirty=true` → el guard se dispara. En item, el `MultiSelect` además agrega `''` al array (corrupción).

**Solución (B + C, elegida por el dev)**:
1. **B** — `MultiSelect.handleSelect` ignora selección vacía/duplicada.
2. **C** — `SelectField`: wrapper de `Select` que descarta el `onValueChange` cuyo valor iguala el valor efectivo actual (el emit de montaje). Los Selects RHF migran a `SelectField`.

**Decisión crítica**: `SelectField` es un wrapper delgado de `Select` (mismo API + children), NO un componente que posee el `Controller`. Minimiza el diff de migración (rename `Select`→`SelectField` en los call sites RHF) y el riesgo de cambio de comportamiento. Descartada A (alinear defaults `''` por-form): frágil y no cubre el MultiSelect.

**Riesgos y mitigación**:
- `MultiSelect` es atom compartido → impacto: único consumidor `ItemCreateForm` (verificado).
- Los tests actuales **mockean** Radix Select → la regression DEBE usar el Select real con polyfill de `ResizeObserver`, o no reproduce el bug (verde falso).
- Migrar 6 call sites podría cambiar comportamiento de selección real → TC de regression que valida que una selección real sí marca dirty y sí se guarda.

**Como vas a saber que funciona**:
- Test de integración con `NavigationGuardProvider` real + `Select` real: montar el form → click salir → NO diálogo (hoy: sí diálogo).
- Tras una selección real → click salir → SÍ diálogo.
- `MultiSelect` montado con `value=[]` → `onChange` NO llamado con `['']`.

**Tamaño estimado**: 1 session (~2-3h). Fix acotado.

---

## Purpose

Eliminar el falso positivo del guard de cambios sin guardar (JOR-056) causado por el emit de montaje de Radix Select, en `front/jormat-front`. Zero behavior change salvo el delta buscado (form limpio no dispara guard). Robustecer la clase entera vía `SelectField` + guard del `MultiSelect`.

## Requirements

### REQ-FIX-01: MultiSelect no agrega selección vacía al montar

> **Que cambia**: `MultiSelect.handleSelect` ignora `''` y duplicados.
> **Por que**: el `Select` interno emite `''` al montar → hoy agrega `''` al array (dirty + corrupción de categorias/aplicaciones/proveedores).

El componente `MultiSelect` MUST ignorar una selección vacía (`''`/falsy) o ya presente en `value`: `if (!selected || value.includes(selected)) return;`. NO debe invocar `onChange` en esos casos.

**Actor**: system (componente UI)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: montaje no agrega ''
GIVEN un `MultiSelect` con `value=[]` y opciones
WHEN el componente monta (Select real de Radix dispara su emit)
THEN `onChange` NO es llamado con `['']`

#### Scenario: selección real sí agrega
GIVEN `value=[]`
WHEN el usuario selecciona 'frenos'
THEN `onChange(['frenos'])`
</details>

### REQ-FIX-02: SelectField descarta el emit espurio de montaje

> **Que cambia**: nuevo `SelectField` wrapper que filtra el `onValueChange` cuyo `next` iguala el valor efectivo actual (`value ?? ''`).
> **Por que**: es el emit de montaje de Radix; propagarlo a `field.onChange` ensucia el form.

`SelectField` MUST envolver `Select` exponiendo el mismo API (props de `Select` + children) e invocar `onValueChange(next)` SOLO cuando `next !== (value ?? '')`. En el resto (incluido el emit de montaje) NO propaga.

**Actor**: system (componente UI)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: emit de montaje ignorado
GIVEN un `SelectField value={undefined}` dentro de un Controller de RHF
WHEN monta (Radix emite `''`)
THEN `onValueChange` del padre NO se invoca → el campo RHF queda `undefined` → no dirty

#### Scenario: selección real propaga
GIVEN `value=''`
WHEN el usuario elige 'CLP'
THEN `onValueChange('CLP')` se invoca
</details>

### REQ-FIX-03: Los forms afectados no disparan el guard al montar

> **Que cambia**: los Selects RHF de item/ventas/compras/pago migran a `SelectField`; item ya cubierto por REQ-FIX-01 (MultiSelect).
> **Por que**: cerrar el bug end-to-end en los 4 forms reportados.

Tras el fix, montar cualquiera de los forms (ItemCreateForm, TransactionBuilder, PurchaseInvoiceBuilder, EfectuarPagoForm) y salir sin editar MUST navegar sin abrir el diálogo del guard.

**Actor**: usuario
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: form limpio no bloquea (integración, Select real)
GIVEN el form montado dentro del `NavigationGuardProvider` real, con `Select` real (ResizeObserver polyfilled), sin editar
WHEN se dispara la salida (Cancelar / requestLeave)
THEN navega sin diálogo
</details>

### REQ-REGRESSION-01: El guard sigue actuando tras edición real

> **Que cambia**: nada — se preserva.
> **Por que**: el fix no debe desactivar la protección legítima.

Tras editar de verdad un campo, salir MUST abrir el diálogo. Una selección real en un `SelectField`/`MultiSelect` MUST marcar el form dirty y persistir el valor.

**Actor**: usuario
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: edición real bloquea
GIVEN el form montado
WHEN el usuario cambia un campo y luego intenta salir
THEN aparece el diálogo "Perderás los cambios"
</details>

## Tasks

### Session 1 — Fix B (MultiSelect) + C (SelectField) + migración + regression [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Guard en `MultiSelect.handleSelect` (`if (!selected || value.includes(selected)) return;`) + tests con Select real (ResizeObserver polyfill): reproduce append de '' pre-fix, verde post-fix; TC-7 selección real | REQ-FIX-01, REQ-REGRESSION-01 | developer | — | front/jormat-front/src/components/ui/multi-select/MultiSelect.tsx, front/jormat-front/src/components/ui/multi-select/MultiSelect.test.tsx | TC-4, TC-7 verdes + suite multi-select verde | git revert del commit | DET-7, DET-8, RULE-frontend-002 | done | S1 |
| S1.T2 | Crear `SelectField` (carpeta-por-componente: SelectField.tsx + index.ts + test + story) que descarta el emit cuyo `next === (value ?? '')` | REQ-FIX-02 | developer | — | front/jormat-front/src/components/ui/select-field/{SelectField.tsx,index.ts,SelectField.test.tsx,SelectField.stories.tsx} | TC-5 verde + story renderiza | git rm del folder | DET-2, DET-8, RULE-frontend-001, RULE-frontend-002 | done | S1 |
| S1.T3 | Migrar Selects RHF `Select`→`SelectField` en los 6 call sites (analisis de impacto hecho: ItemCreateForm.tipo, TransactionBuilder origen/tipoDTE, PurchaseInvoiceBuilder tipo/origen, EfectuarPagoForm formaPago, PaymentCard, CurrencyDetailCard) | REQ-FIX-03 | developer | S1.T2 | front/jormat-front/src/components/items/create/ItemCreateForm/ItemCreateForm.tsx, front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx, front/jormat-front/src/components/ventas/builder/PaymentCard/PaymentCard.tsx, front/jormat-front/src/components/compras/builder/PurchaseInvoiceBuilder.tsx, front/jormat-front/src/components/compras/builder/CurrencyDetailCard.tsx, front/jormat-front/src/components/payments/detail/EfectuarPagoForm/EfectuarPagoForm.tsx | typecheck verde + suites de cada form verdes | git revert del commit | DET-16, DET-8, RULE-frontend-001 | done | S1 |
| S1.T4 | Test de integración de regression del guard con Select REAL (sin mock) + ResizeObserver polyfill: form limpio → sin diálogo (TC-1/2/3); edición real → diálogo (TC-6). Reproduce el bug pre-fix | REQ-FIX-03, REQ-REGRESSION-01 | developer | S1.T1, S1.T3 | front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.guard.test.tsx (nuevo caso con Select real), front/jormat-front/src/components/items/create/ItemCreateForm/ItemCreateForm.guard.test.tsx (nuevo) | TC-1, TC-2, TC-3, TC-6 verdes | git revert del commit | DET-5, DET-7, RULE-frontend-002 | done | S1 |
| S1.T5 | Docs (`jormat_docs/ongoing/component-patterns.md` o forms): documentar `SelectField` y el porqué (emit de montaje de Radix). Runtime verification (DET-36): smoke en navegador si infra disponible; si no, `smoke-not-reproducible`+reason | REQ-FIX-03 | developer | S1.T3 | jormat_docs/ongoing/component-patterns.md | doc refleja SelectField; entry runtime-verification en decisions_log | git revert del commit docs | RULE-global-005, DET-16, DET-36 | done | S1 |
| S1.GATE | Gate S1: `vitest run` 0 fails + coverage ≥90 (RULE-testing-coverage-threshold-002), quality review (DET-23 tier exhaustive por atom compartido), TCs registrados (DET-25), runtime-verification (DET-36), commits granulares (DET-27), persistir session → cierre | REQ-REGRESSION-01 | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | — | checklist acceptance con evidencia; regression 0 fails | — | DET-13, DET-20, DET-23, DET-25, DET-27, DET-36 | done | S1 |

## Constraints

- Zero behavior change salvo el delta buscado (form limpio no dispara guard). La protección legítima (edición real → diálogo) se preserva y se testea (REQ-REGRESSION-01).
- La regression del dirty DEBE ejercitar el `Select` real de Radix (no el mock) con polyfill de `ResizeObserver` — de lo contrario no reproduce el bug (DET-7 + learn L2 del ticket).
- `SelectField` no cambia el API público de `Select` (children Trigger/Content/Item intactos); es rename en el call site.
- Coverage global no debe caer de 90 (RULE-testing-coverage-threshold-002).

## Acceptance checkpoints

Checklist ejecutado en S1.GATE con evidencia (DET-13):

- [x] AC-1 — `npx vitest run` en `front/jormat-front`: 0 fails (regression completa).
- [x] AC-2 — `npx vitest run --coverage`: branches globales ≥90 (RULE-testing-coverage-threshold-002).
- [x] AC-3 — TC-4: `MultiSelect` con Select real (ResizeObserver polyfill) montado con `value=[]` → `onChange` NO llamado con `['']`.
- [x] AC-4 — TC-5: `SelectField` con `value=undefined` → el emit de montaje de Radix NO invoca `onValueChange`.
- [x] AC-5 — TC-1/2/3: forms (item/ventas/compras) con guard real + Select real, sin editar → salida navega sin diálogo. Reproduce el bug pre-fix (test falla antes del fix, pasa después).
- [x] AC-6 — TC-6: edición real → salida abre el diálogo "Perderás los cambios" (protección preservada).
- [x] AC-7 — TC-7: selección real en MultiSelect → `onChange(['frenos'])`.
- [x] AC-8 — Runtime verification (DET-36): smoke en navegador (dirty al abrir+salir) o `smoke-not-reproducible`+reason si la infra (docker/MSAL) no corre.
