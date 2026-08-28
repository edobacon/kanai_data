---
id: RULE-mods-052
project: up1
type: rule
module: mods
tags:
  - testing
  - typecheck
  - vue-tsc
  - integracion
  - quality-gate
  - modsComponents
---

# Tests verdes (vitest) NO garantizan integracion ni tipos: correr `vue-tsc` + verificar el contrato backend en gates de tasks UI del mod

## What

En una task UI de un mod (`.vue` + composables + logica), una suite `vitest` en verde NO es evidencia suficiente de correctitud. El vitest del mod corre en `environment: 'node'` con transform de **esbuild**, que **descarta los tipos sin chequearlos** y usa **stubs** para atoms/molecules (`tests/stubs/`) y para Apollo. Por lo tanto los tests pueden pasar mientras:
- hay errores de tipo reales en los `.vue`/`.ts` (esbuild no typechequea),
- la integracion real con el backend esta rota (objectType/campos incorrectos en `createInstance`), porque los specs solo prueban builders/logica pura, no la mutation real.

**Verificacion obligatoria adicional** en el gate de cada task UI (ademas de `vitest run`):
1. `vue-tsc --noEmit -p tsconfig.json` → 0 errores en los archivos tocados del mod (los preexistentes ajenos se ignoran).
2. Contrastar las mutations/queries contra el **schema real** (`objects/*.json`, `object-manager` typeDefs) y el seed — campos requeridos, `objectType` correcto (ver RULE-platform-018), enums.

## Why

En MC-06 (TICKET-086): S4 cerro con 999 tests verdes pero el "crear bloque" estaba roto (objectType + `effect` ausente) — lo atrapo el dual-judge contra el schema. S5 cerro con 1038 tests verdes pero `vue-tsc` revelo 5 errores de tipo en `EditEntryModal.vue` que el dev no habia corrido. En ambos casos los tests verdes daban falsa confianza. La verificacion independiente (DET-33) con tsc + schema es lo que cierra el gap.

## Where

Gates de tasks UI de cualquier full-page modsComponent (`mods/<mod>/modsComponents/`). Aplica al cerrar la task (Gate D) y al gate de session (DET-23/DET-33).

## When

Toda task que toque `.vue` o cablee mutations/queries del platform en un mod. No aplica a tasks doc-only.

## Verification

- El gate de la task corrio `vue-tsc` (no solo `vitest`) y reporta 0 errores en los archivos del mod.
- Las mutations nuevas se contrastaron contra el schema/seed (objectType + campos requeridos).
- La logica pura tiene `.spec.ts`; el wiring real se valido contra el contrato, no solo asumido.

## Source

- **Discovered in**: TICKET-086 (S4/S5) — UPONE-1349. Refuerza RULE-mods-051 (tests de interaccion) y DET-33 (verificacion del self-report). Relacionado con RULE-platform-018.
- **Extendida por**: [RULE-mods-058](RULE-mods-058.md) (TICKET-113) — como clasificar el resultado del
  typecheck en **checkout limpio** (el working dir de un mod tiene symlinks que suman errores ajenos) y
  la causa raiz mas comun en seeds: coleccion inyectable sin typedef.
