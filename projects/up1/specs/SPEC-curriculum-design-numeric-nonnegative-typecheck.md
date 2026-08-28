---
id: SPEC-curriculum-design-numeric-nonnegative-typecheck
project: up1
ticket: TICKET-105
status: archived
---

# No-negativos en campos numericos del mod + saneamiento del typechecking — ARCHIVED

# No-negativos en campos numericos del mod + saneamiento del typechecking — ARCHIVED

> Esta spec fue archivada. No refleja el estado actual del codigo.
> Motivo: descartada por negocio — el trabajo es real pero no corresponde a la historia original de UPONE-1378.

## Purpose (historico)

Buscaba (S1) declarar `"minimum": 0` en 9 campos numericos de negocio del mod curriculum-design (activity.credits, planEntry.period/credits, RT de curricularsection/curriculum) reusando el validador del core, y (S2) sanear los errores de tipado (`vue-tsc`) preexistentes del mod + gatearlos en CI. Actor: configurador curricular + equipo de desarrollo.

## Outcome

Archivada el 2026-07-30 por decision del dev. Aunque el trabajo es tecnicamente valido, **no mantiene relacion con la historia original de UPONE-1378** (el editor visual de prerrequisitos): TICKET-105 heredo ese external por arrastre SP6→SP7 como "mejora detectada", pero no es un AC del Jira. Se decide no ejecutarlo bajo ese ticket.

Ademas, al ejecutar S1 se descubrio empiricamente que el acceptance "drift:check 0" (REQ-02) estaba **bloqueado por drift preexistente de core** ajeno al mod (ver BL-4 / learn L1 del ticket): el baseline committeado de `develop` da 110 err/280 findings SIN este cambio; el sync incluso lo redujo a 224. El cambio del mod (9 `minimum:0`, validacion declarativa) es correcto pero se revirtio (nunca commiteado) y quedo en stash (`stash@{0}` del mod).

## Knowledge preserved

Conocimiento extraido antes de archivar. No hubo rules/bugs/decisions promovidos (la spec no llego a completar execute). El conocimiento valioso vive en el ticket **TICKET-105** (archivado pero preservado):

### Rules

(ninguna promovida)

### Bugs

(ninguno)

### Decisions

Registradas en `decisions_log` del ticket (scope-discovery, spec-judge dual, spec-approval, etc.). DEC-LOCAL-01 (S1+S2 en un spec) queda historica.

### Patterns / Templates / Recipes

- **Learn L1 (TICKET-105)**: para tickets mod-only, el acceptance "drift:check 0" depende de que core este fresh-synced ANTES de correr sync sobre un core stale; correrlo sobre core desactualizado surfacea backlog de migracion de tenants (coordinacion core, RULE-dev-004), no del mod.
- **BL-4 (TICKET-105)**: drift preexistente de core vs BD de tenants (110 err/280 findings en baseline develop) — coordinacion core / flujo update-repos, con consent del dev.
- **BL-3 (TICKET-105)**: paridad de pre-validacion client-side en Elric (up1-mcp) para estos campos (el backend ya rechaza negativos; Elric no lee fieldDefinitions).

## Original tickets

- TICKET-105 (UPONE-1378): No-negativos + typechecking del mod — status al archivarse: **closed (archivado, no ejecutado)**.

## Why archived (detalle)

El dev (2026-07-30) determino que TICKET-105, registrado bajo UPONE-1378 por conveniencia de arrastre SP6→SP7, no pertenece a la historia del editor de prerrequisitos. El intake (Triage re-verificado, teach-intake), el spec (aprobado por dual-judge DET-38) y el diagnostico de S1 (drift preexistente) son validos y quedan preservados, pero el trabajo no se ejecuta bajo este Jira. Los 9 `minimum:0` se revirtieron sin commitear (stash del mod). Si el trabajo de no-negativos se retoma, debe ir bajo su propio ticket/Jira con alcance propio, y coordinarse con el estado de sync de core (BL-4).

## Do not use this spec for

- Reejecutar el trabajo de no-negativos: si se retoma, crear ticket/Jira propio; el `minimum:0` esta en `stash@{0}` del mod curriculum-design.
- Estimar el typechecking (S2): su analisis era del 2026-07-22 y ya estaba envejecido; requiere re-baseline `vue-tsc` fresco.
- Diagnosticar drift de core: ir a BL-4 / L1 del ticket TICKET-105 (es coordinacion core, no del mod).

## See also

- Ticket archivado: [TICKET-105](../../tickets/TICKET-105.md)
- Revert del codigo: `stash@{0}` en `mods/curriculum-design` ("TICKET-105 revert: minimum:0") y en `object-manager` ("TICKET-105 revert: sync regeneration").
