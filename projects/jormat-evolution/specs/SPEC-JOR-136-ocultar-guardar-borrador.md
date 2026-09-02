---
id: SPEC-JOR-136-ocultar-guardar-borrador
project: jormat-evolution
ticket: JOR-136
status: done
---

# Ocultar "guardar borrador" del modal de salida (Ventas + Compras)

# Ocultar "guardar borrador" del modal de salida (Ventas + Compras)

## Executive summary — lo que estas aprobando

**Que se corrige**: el flag `SHOW_SAVE_DRAFT=false` ocultaba solo el boton "Guardar borrador" de la toolbar; el modal de salida (cambios sin guardar) seguia ofreciendo guardar borrador porque ambos builders (`TransactionBuilder.tsx` en ventas, `PurchaseInvoiceBuilder.tsx` en compras) pasaban `onSaveDraft: handleSaveDraft` al guard de navegacion sin condicionar por el flag. El `NavigationGuardProvider` renderiza el boton del `UnsavedChangesDialog` mientras haya un draft handler registrado, asi que el modal lo mostraba aunque la toolbar no.

**Fix**: gatear `onSaveDraft` con el flag en ambos builders (`onSaveDraft: SHOW_SAVE_DRAFT ? handleSaveDraft : undefined`), para que un solo flag gobierne toolbar + modal. Mientras el borrador no este presupuestado el modal de salida no ofrece guardar borrador.

**Lo que NO cambia**: `NavigationGuardProvider` y `UnsavedChangesDialog` ya soportan `onSaveDraft` opcional; el bug es de wiring del consumidor. No se toca el guard ni el dialog.

## Requirements

### REQ-01: el modal de cambios sin guardar no ofrece "Guardar borrador" cuando `SHOW_SAVE_DRAFT` es false
> Que cambia: el modal de salida deja de mostrar la opcion "Guardar borrador" cuando el flag esta apagado; solo queda quedarse ("Cancelar" en ventas / "Salir" en compras) y "Salir sin guardar".
> Por que: el flag `SHOW_SAVE_DRAFT` debe gobernar TODOS los puntos que ofrecen guardar borrador (toolbar + modal), no solo la toolbar; hoy el modal quedaba desalineado y ofrecia una accion que el resto de la UI ya oculta.

MUST: cuando `SHOW_SAVE_DRAFT` es false, el `UnsavedChangesDialog` disparado al intentar salir con el formulario sucio NO debe renderizar el boton "Guardar borrador". Solo debe ofrecer la opcion de quedarse y "Salir sin guardar". Esto MUST aplicar por igual a ventas (`TransactionBuilder.tsx`) y compras (`PurchaseInvoiceBuilder.tsx`).

<details>
<summary>Scenario</summary>

- GIVEN el formulario del builder esta sucio (cambios sin guardar) y `SHOW_SAVE_DRAFT` es false
- WHEN el usuario intenta salir (navegar fuera)
- THEN el dialogo de cambios sin guardar NO muestra "Guardar borrador"; solo la opcion de quedarse y "Salir sin guardar".
</details>

## Tasks

### Session 1 — Ocultar guardar-borrador del modal de salida [tier: T2]

**Task S1.T1 — Gatear `onSaveDraft` con el flag (ventas + compras)**
- source_ref: REQ-01
- agent: developer
- files: `front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx`, `front/jormat-front/src/components/compras/builder/PurchaseInvoiceBuilder.tsx`
- validation: `onSaveDraft: SHOW_SAVE_DRAFT ? handleSaveDraft : undefined` en ambos builders; con el flag apagado el guard no recibe draft handler → el modal no ofrece guardar borrador; tsc `--noEmit` exit 0
- rollback: git revert

**Task S1.T2 — Tests (guard ventas actualizado + guard compras nuevo) + story existente**
- source_ref: REQ-01
- agent: reviewer/tester
- depends_on: S1.T1
- files: guard test de ventas (actualizar), guard test de compras (crear), `navigation-guard` + `unsaved-changes-dialog` (regression)
- validation: vitest verde con los labels REALES del modal ("Cancelar" para quedarse en ventas, "Salir" en compras — no "Seguir editando"); story existente del dialog verificada; suite 34/34 passed (5 files)
- rollback: N/A (tests)

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), decisions del gate registradas. Dual-judge (DET-35) calibrado como no-aplicable para un cambio trivial de 2 lineas; el gate es la verificacion independiente del orquestador.

## Constraints

- Alcance acotado a los dos builders (`ventas/builder/TransactionBuilder`, `compras/builder/PurchaseInvoiceBuilder`). No se toca `NavigationGuardProvider` ni `UnsavedChangesDialog` (ya soportan `onSaveDraft` opcional).
- Un solo flag (`SHOW_SAVE_DRAFT`) gobierna toolbar + modal.

## Acceptance checkpoints

- [ ] AC-1 (REQ-01): con `SHOW_SAVE_DRAFT` false y formulario sucio, el modal de salida NO ofrece "Guardar borrador" en ventas (test).
- [ ] AC-2 (REQ-01): idem en compras (test).
