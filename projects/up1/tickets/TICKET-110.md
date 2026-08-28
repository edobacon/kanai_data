---
id: TICKET-110
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1446
module: curriculum-design
autopilot: manual
---

# Habilitar eslint y sanear el baseline de typecheck del mod curriculum-design

## Request

Durante TICKET-108 (pre-push quality guard, UPONE-1445) se descubrio en runtime que el mod curriculum-design **no pasa ni lint ni typecheck** hoy, por lo que el hook pre-push tuvo que dejar esos dos checks en modo advisory (warn-only). Este ticket documenta los casos que fallan y habilita eslint para que ambos checks puedan volver a ser **bloqueantes** en el hook.

Alcance esperado:
1. **Habilitar eslint** (hoy no arranca en todo el repo up1).
2. **Sanear los ~130 errores de typecheck** del mod.
3. Una vez verde el baseline, **promover a bloqueantes** los pasos lint y typecheck de `.husky/pre-push` (quitar el warn-only introducido por DEC-LOCAL-04 en TICKET-108).

Alcance preferido: **solo el mod** (el dev pidio evitar tocar core). El fix de eslint tiene una via mod-only (eslint local al mod) y una via root (resolver `ajv` en up1); ver Opciones.

## ⛔ Bloqueante (registrado 2026-07-21)

**Estado Jira UPONE-1446: `Blocked`.** El objetivo central del ticket (habilitar eslint para promover
lint+typecheck a bloqueantes en el pre-push) **no es alcanzable en el alcance mod-only** que pidio el
dev, y el unico fix viable es root/core con blast radius fuera de este equipo.

- **eslint NO es arreglable mod-only (confirmado en runtime, 2026-07-17).** El crash lo causa el
  `overrides` de `ajv` en `up1/package.json` (root), que envenena toda instancia de `@eslint/eslintrc`.
  Los npm `overrides` son globales por nombre, **no acotables por workspace** → no hay fix a nivel
  config/plugin del mod. `eslint --version` crashea al arrancar el core de eslintrc.
- **El fix root esta descartado por ahora:** quitar los overrides + reinstall limpio re-lockea **305
  paquetes** (bumps semver de aws-sdk/clerk/etc. sobre un lock viejo). Medido behaviorally neutral,
  pero el costo es la verificacion CI de suite/flow/layout y afecta a **otros equipos** → requiere
  coordinacion/consentimiento cross-team, no es una decision del mod.
- **Parte typecheck (Caso 2) es mod-only viable pero sustancial** (shim de sub-paths + evitar que
  vue-tsc cargue los vendored + ~56 errores propios); no cierra el objetivo del ticket por si sola,
  porque el hook no puede promoverse a bloqueante sin eslint.

**Conclusion:** el ticket queda bloqueado en una **decision root/cross-team** (resolver `ajv` en el
root de up1), fuera del alcance mod-only. No hay trabajo del mod que lo desbloquee.

**Follow-up si se retoma:** abrir la decision de root (pin `ajv@6` para eslint 8, o subir eslint 9 en
el root) con el equipo core/plataforma; recien ahi el saneamiento de typecheck + la promocion del
hook (revertir el warn-only de DEC-LOCAL-04 en TICKET-108) tienen sentido.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (mod curriculum-design; con opcion root para eslint) |
| Modulo principal | curriculum-design (layer: mod) |
| Modulos afectados | eslint roto es root-wide (afecta a todos los workspaces); este ticket lo resuelve para curriculum-design (mod-only) salvo que se elija el fix root |

## Caso 1 — eslint no arranca (roto repo-wide)

**Sintoma**: `npm run lint` (y `eslint --version`) crashea al arrancar, en cualquier modo (eslintrc o flat):

```
NOT SUPPORTED: option missingRefs. Pass empty schema with $id ...
Oops! Something went wrong! :(
ESLint: 8.57.1
TypeError: Cannot set properties of undefined (setting 'defaultMeta')
    at ajvOrig (up1/node_modules/eslint/node_modules/@eslint/eslintrc/dist/eslintrc.cjs:1626:27)
```

**Causa raiz**: el eslint 8.57.1 hoisted en `up1/node_modules` usa `@eslint/eslintrc`, que necesita `ajv@6`. `@eslint/eslintrc` **no tiene ajv nested** y resuelve el `ajv@8.20.0` hoisted en el root de up1 → incompatible (la API `missingRefs`/`defaultMeta` de ajv 6 no existe en ajv 8) → crash al `require`.

**Alcance**: es root-wide (verificado: crashea tambien desde `layout`). No es un problema de violaciones de lint, es el binario que no corre. Preexistente (no lo introdujo TICKET-108: el diff del lock de ese ticket solo agrega husky, no toca ajv/eslint).

**Config del mod (relevante)**: `mods/curriculum-design/eslint.config.js` es **flat y autocontenido** (solo importa `eslint-plugin-vue` y `@typescript-eslint/parser` como paquetes; sin import de archivos de layout). Es compatible con un eslint flat-native (eslint 9).

## Caso 2 — typecheck del mod con ~130 errores

**Sintoma**: `npm run typecheck` (`vue-tsc --noEmit`) reporta **~130 errores** (EXIT 2).

**Distribucion** (codigo propio tracked del mod, `modsComponents/` = 56 archivos):

| Archivo | # errores | Tracked |
|---------|-----------|---------|
| `modsComponents/CurriculumMesh/CurriculumMeshElement.vue` | 29 | si |
| `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | 14 | si |
| `modsComponents/RichTextRenderer/RichTextRendererElement.vue` | 3 | si |
| `modsComponents/ActivityStatusBadge/*` (+ stories) | 3 | si |
| `modsComponents/{IconPicker,ColorPicker,CurriculumMesh.stories}` | 3 | si |
| `tests/unit/weightedSum.parity.test.ts` | 2 | si |
| `components/molecules/*` (BaseCard, CalendarEventCard, ...) | ~59 | **NO** (vendored, 0 tracked) |
| `composables/*` (useRecurrenceConfig, useEnumTransitions) | ~4 | **NO** (vendored, 0 tracked) |

**Codigos**: 57× TS2339 (property does not exist), 44× TS2349 (not callable / type never), 19× TS2307 (cannot find module, ej. `../../../types/basecard`), 6× TS2578, 3× TS2322, 1× TS2345.

**Observaciones clave**:
- `components/` y `composables/` **no estan versionados** en el repo del mod (0 archivos tracked) — son copias vendored/sincronizadas de layout. Se cuelan en el typecheck **transitivamente** (los importa `modsComponents/`); el tsconfig del mod solo incluye `modsComponents/`, `tests/`, `types/`.
- El patron uniforme (44 TS2349 "never/not-callable" + 57 TS2339 en muchos `.vue`) sugiere una **causa sistematica de setup de tipos** (shims de globales Vue/`$t`, tipado de las copias vendored, o config de vue-tsc), no 130 bugs independientes. Diagnosticar la causa raiz ANTES de arreglar caso por caso (DET-4: no confundir sintoma con causa).

## Opciones de solucion (a evaluar en design)

### eslint (Caso 1)
- **A. Mod-only (preferido)**: eslint 9 flat-native como devDep local al mod (anidado, no hoisted por conflicto de major con el root); apuntar el script `lint` y el hook `.husky/pre-push` al binario local del mod. Sidestepa el crash de `eslintrc`/ajv. Riesgo: compat de `eslint-plugin-vue@9` (soporta v9) y `@typescript-eslint/parser`; posibles violaciones nuevas.
- **B. Root**: resolver el conflicto de `ajv` en `up1` root (pin `ajv@6` para eslint 8, o subir eslint a 9 en el root). Arregla a todos los workspaces pero es core/root, afecta a otros equipos.

### typecheck (Caso 2)
- Diagnosticar la causa sistematica (shims de tipos faltantes / tipado de vendored `components`+`composables` / config vue-tsc). Si es sistematica, el fix puede ser chico. Evaluar tambien si el tsconfig deberia excluir o tipar las copias vendored.

### Promocion del hook
- Con lint y typecheck en EXIT 0, editar `mods/curriculum-design/.husky/pre-push`: quitar el modo advisory (warn-only) de los pasos lint y typecheck para que aborten el push (revertir DEC-LOCAL-04 de TICKET-108).

## Acceptance (borrador)

- [ ] `npm run lint` en el mod corre sin crashear y reporta (o pasa) limpio.
- [ ] `npm run typecheck` en el mod = EXIT 0 (0 errores), con la causa sistematica documentada.
- [ ] `.husky/pre-push` con lint y typecheck **bloqueantes** (sin warn-only); revalidados los TCs de TICKET-108 (TC-3 error de tipo bloquea, TC-4 error de lint bloquea).
- [ ] Sin tocar core/otros workspaces si se elige la via mod-only (o, si se elige la via root, coordinado y consentido).

## Hallazgos de investigación (2026-07-17, sesión UPONE-1446)

**eslint (Caso 1) — causa raíz + no-mod-only, confirmado:**
- El crash lo causa el `overrides` del root `up1/package.json` (commit `9275d15`, "updated deps", 2026-02-17) que fuerza `eslint > ajv: 8.18.0` y `@eslint/eslintrc > ajv: 8.18.0`. `@eslint/eslintrc` necesita `ajv ^6.14.0` (6.15.0 existe). El override envenena TODA instancia de eslintrc (probado: el eslint 9 de layout crashea igual cargando el eslintrc del root).
- `eslint --version` crashea → es el core cargando eslintrc al arrancar → **no hay fix a nivel config/plugin del mod**. Los npm `overrides` son globales por nombre → no acotables por workspace. **lint NO es arreglable mod-only.**
- Fix de root probado: quitar los 2 overrides + `rm -rf node_modules && npm install` → eslintrc resuelve ajv 6.15.0 → eslint corre en mod y layout. PERO el reinstall limpio **re-lockea 305 paquetes** (bumps semver-compatibles de aws-sdk/clerk/etc., porque el lock de develop es un snapshot viejo). Medición: **behaviorally neutral** (object-manager unit = 17 fallos idéntico con/sin re-lock; mod 1251 verdes). El costo es la verificación CI de suite/flow/layout, no un riesgo comprobado. Descartado por ahora (diff grande).

**typecheck (Caso 2) — dimensionado:**
- 130 errores = ~74 de las copias vendored (`components/`/`composables/`, sincronizadas de layout, no versionadas) + ~56 en `modsComponents/` propios.
- El shim `types/layout-shims.d.ts` NO cubre porque los archivos vendored existen físicamente (file resolution gana sobre `declare module '*/...'`). Experimento: al mover los vendored fuera, baja a 56, pero aparecen `TS2307` en imports sub-path (`../../components/atoms/Badge`, el shim solo cubre `*/components/atoms`) + quedan `@ts-expect-error` sin uso y `not callable`.
- Fix mod-only viable pero sustancial: mejorar el shim (cubrir sub-paths) + evitar que vue-tsc cargue los vendored + arreglar los ~56 propios. No es one-liner.

## Documento completo

Diagnóstico + plan de habilitación (core lint+typecheck, efecto en mods con cd de ejemplo, efectos secundarios, deuda incremental): `uplanner/specs/up1/sp6/habilitar-lint-typecheck-core.md`.

## Origen

- Descubierto durante TICKET-108 / UPONE-1445 (Session 1, S1.T3), backlog items B1 (typecheck) y B2 (eslint).
- DEC-LOCAL-04 del `SPEC-curriculum-design-prepush-quality-guard` dejo lint/typecheck advisory a la espera de este saneamiento.
## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.
