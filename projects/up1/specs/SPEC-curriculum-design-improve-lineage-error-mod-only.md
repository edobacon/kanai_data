---
id: SPEC-curriculum-design-improve-lineage-error-mod-only
project: up1
ticket: TICKET-073
status: done
---

# Corregir el mensaje de unicidad por linaje sin tocar core (mod-only)

# Corregir el mensaje de unicidad por linaje sin tocar core (mod-only)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive abajo (Requirements, Changes, Tasks).*

**Que se quiere**: hoy, al crear un segundo plan de estudio (Curriculum) con un codigo ya usado en su institucion, el usuario recibe un mensaje engañoso — "Este registro fue modificado por otra persona" (un error de concurrencia que no aplica). Hay que mostrarle un mensaje correcto. El dev pidio que el arreglo viva **solo en el mod** `curriculum-design`, sin tocar el core `layout`. La solucion: reescribir el texto que el mod emite para que coincida con un patron de error que el core **ya** sabe traducir (el de unicidad), que ya tiene traduccion al español.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Mod-only: alinear el mensaje del mod al pattern `uniqueness` de core (DEC-LOCAL-01) | Respeta "cero core" a costa de que el texto final sea generico ("Ya existe un registro con ese valor.") y no especifico de curriculum |
| 2 | Conservar `CURRICULUM_LINEAGE_DUPLICATE` en el string | Los tests existentes asertan `toThrow(/CURRICULUM_LINEAGE_DUPLICATE/)` — quitarlo rompe regresion |

**Riesgos principales y como los mitigamos**:

- **Acople frágil al regex de core** (si core renombra/quita el pattern `uniqueness`, el mapping se rompe silencioso) → comentario explicativo en el helper + test de regresión que ancla la forma del mensaje (TC-2).
- **El toast no aparezca o salga el equivocado en runtime** (la verificación a nivel-datos no prueba el camino del usuario) → S2 es smoke real en la suite (⚑ fuerte, T3) con screenshot del toast.

**Que NO se hace en este ticket**:

- Cambios en core (`layout`/`object-manager`) — restricción del dev (DEC-LOCAL-01).
- Enfoque A (extensions GraphQL, el mod dueño del texto exacto) — parqueado en Backlog B1 del ticket.
- El gemelo `modalityDefault` (hoy cae en genérico, NO engañoso) — no es el bug reportado; Backlog B2.

**Tamano estimado**: 2 sessions, ~1-1.5h efectivas. La más riesgosa es S2 (verificación E2E en la UI real).

**Como vas a saber que funciona**:

- Creo un Curriculum raíz con un código ya usado y veo el toast "Ya existe un registro con ese valor." (no "modificado por otra persona").
- `vitest run` del mod queda verde, con el test nuevo que verifica el match del pattern.

---

## Purpose

Desacoplar el mensaje user-facing del guard de unicidad por linaje (`assertUniqueLineageRoot`) del falso match con el pattern de concurrencia de `useFriendlyErrors`, sin modificar core. Se logra reescribiendo el string que el helper del mod lanza para que dispare el pattern `uniqueness` (que precede a `concurrency` en `ERROR_PATTERNS` y tiene traducción ES), conservando el code para regresión.

## Requirements

### REQ-IMPROVE-01: mensaje correcto al violar unicidad por linaje

> **Que cambia**: al crear un Curriculum raíz con un `code` ya usado en la institución, el usuario ve "Ya existe un registro con ese valor." en vez de "Este registro fue modificado por otra persona".
> **Por que**: el mensaje actual es de concurrencia y desorienta — sugiere "refresca y reintenta" ante un problema que es de input (código repetido).

El sistema (mod) MUST emitir, ante una raíz de linaje duplicada, un mensaje de error cuyo texto matchee el pattern `uniqueness` de `useFriendlyErrors` (`/Unique constraint.*failed.*\`(\w+)\`/i`) y NO el de `concurrency`.

**Actor**: user (consumidor de la UI de creación de Curriculum)
**Layers**: backend (mod `logic/`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: raíz duplicada vía UI
- **GIVEN** existe un Curriculum raíz con `(institutionId=I, code=C)`
- **WHEN** el usuario crea otra raíz con el mismo `code=C` en la institución `I`
- **THEN** la UI muestra el toast "Ya existe un registro con ese valor." / "Usa un valor diferente." (categoría `uniqueness`), no el de concurrencia

#### Scenario: el mensaje matchea el pattern correcto
- **GIVEN** el mensaje que lanza `assertUniqueLineageRoot`
- **WHEN** se aplican los regex de `ERROR_PATTERNS` en orden
- **THEN** matchea `uniqueness` (L191) antes que `concurrency` (L351)

</details>

### REQ-PRESERVE-01: el guard sigue rechazando con el code de dominio

> **Que cambia**: nada en el comportamiento del guard — sigue rechazando raíces duplicadas y el error sigue conteniendo `CURRICULUM_LINEAGE_DUPLICATE`.
> **Por que**: los tests de TICKET-065 asertan ese code; el mod y los consumers de logs dependen de él.

El sistema (mod) MUST seguir lanzando ante raíz duplicada un error que contenga el literal `CURRICULUM_LINEAGE_DUPLICATE`, preservando la lógica de detección de raíz existente.

**Actor**: system
**Layers**: backend (mod `logic/`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: regresión de los tests existentes
- **GIVEN** la suite `tests/integration/curriculum-lineage.test.ts`
- **WHEN** se corre `vitest run` tras el cambio
- **THEN** los `rejects.toThrow(/CURRICULUM_LINEAGE_DUPLICATE/)` siguen verdes

</details>

## Changes

### Modified: `mods/curriculum-design/logic/helpers/lineageUniqueness.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Texto lanzado por `assertUniqueLineageRoot` | `"CURRICULUM_LINEAGE_DUPLICATE: ya existe un Curriculo raiz … las versiones … Conflicto con: …"` (matchea `concurrency`) | `"CURRICULUM_LINEAGE_DUPLICATE: Unique constraint failed on the field \`code\`. Ya existe un curriculo raiz con el codigo \"{code}\" en la institucion ({institutionId})."` (matchea `uniqueness`) | Disparar el pattern correcto de core sin tocar core |
| Comentario | — | Bloque explicando el acople intencional al regex `uniqueness` de `useFriendlyErrors.ts:191` (no "limpiar" el inglés) | Evitar que un cleanup futuro rompa el mapping en silencio (DEC-LOCAL-01) |

### Modified: `mods/curriculum-design/tests/integration/curriculum-lineage.test.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Cobertura del mensaje | Solo asertan el code (`toThrow(/CURRICULUM_LINEAGE_DUPLICATE/)`) | + test que verifica que el mensaje matchea `/Unique constraint.*failed.*\`(\w+)\`/i` y NO `/version.*conflict/i` | Anclar la forma del mensaje contra el acople frágil (TC-2) |

## Constraints

- **RULE-dev-004** (core_work_policy): trabajo `layer:mod` → flujo autocontenido en `mods/curriculum-design` + `npm run sync`. No usa rama de épica core. Commits con prefijo `UPONE-1270` (DET-19).
- **DEC-LOCAL-01** (este ticket): cero cambios en core. El mod no puede fijar su texto exacto; usa el mapping genérico de core.

## Rules discovered

- **RULE-curriculum-design-005** (promovida desde L4): el mensaje de unicidad de un mod debe TERMINAR con el formato Prisma `Unique constraint failed on the fields: (\`campo\`)` para que `formatError` (UPONE-1216) lo normalice y el front lo mapee a `uniqueness`. Documenta la cadena de 3 saltos (mod → object-manager formatError → layout useFriendlyErrors).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Core renombra/quita el pattern `uniqueness` → mapping roto silencioso | low | medium | Comentario en el helper + TC-2 que ancla la forma del mensaje. Si el test queda en el mod (no corre contra core), documentar el supuesto explícito |
| El toast no aparece o sale otro en runtime (camino del usuario ≠ match de regex) | medium | medium | S2 smoke real en la suite (⚑ fuerte, T3) con evidencia visual |
| `npm run sync` no propaga o deja el destino desincronizado | low | medium | Verificar el destino sincronizado en object-manager tras el sync (S1.T3) |

## Open questions

Ninguna — H6–H9 confirmadas en intake-explore.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: mod-only, alinear al pattern `uniqueness` de core
- **Contexto**: el dev pidió que el arreglo no toque core. El objetivo original (mod dueño del texto exacto) exigía un passthrough genérico en core.
- **Drivers**: restricción dura "cero core"; existe un pattern `uniqueness` en core con traducción ES; el pattern precede a `concurrency` en el array.
- **Opcion elegida**: el mod emite un texto que matchea `uniqueness`; cero archivos de core.
- **Alternativas**: (A) extensions GraphQL + passthrough en core — superior pero toca core, parqueada (Backlog B1); (mod-only con texto exacto) — imposible limpio (core no tiene passthrough genérico).
- **Consecuencias**: gana cero-core y alcance mínimo; pierde control del texto exacto (genérico) y agrega un acople frágil al regex de core (mitigado con comentario + test).
- **Session**: design-improvement (2026-06-17).

### DEC-LOCAL-02 (necessity/reuse — DET-32): reduce
- No se crea ningún artifact nuevo. El cambio se reduce a reescribir un string en un helper existente + extender un test existente. Veredicto: `reduce` (lineageUniqueness.js) + `reuse` (test file existente). El "nuevo" test es regresión obligatoria (DET-7), no un artefacto especulativo.

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01 — el toast correcto aparece en la UI (S2).
- [ ] **Tests**: TC-2 (match de pattern) + TC-3 (regresión del code) verdes.
- [ ] **Rules**: cambio solo en `mods/curriculum-design/logic/` (fuente), `npm run sync` corrido; cero core.
- [ ] **Integration**: regression del mod sin delta negativo.
- [ ] **Docs**: comentario del acople presente en el helper.

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|-------------------|--------|----------------|-----------------|
| Mensaje al violar unicidad de linaje | "Este registro fue modificado por otra persona" (engañoso) | "Ya existe un registro con ese valor." (correcto) | Smoke UI en la suite | S2 |

## Tasks

### Session 1 — Mod: alinear mensaje + sync + test [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Reescribir el string de `assertUniqueLineageRoot` para matchear el pattern `uniqueness` (conservando `CURRICULUM_LINEAGE_DUPLICATE`) + comentario explicando el acople intencional al regex de core | REQ-IMPROVE-01 | developer | — | `mods/curriculum-design/logic/helpers/lineageUniqueness.js` | TC-2 (regex match en unit); `vitest run` del mod verde | git revert | DET-1, DET-2, DET-8, DEC-LOCAL-01 | pending | 1 |
| S1.T2 | Agregar test de regresión: el mensaje matchea `/Unique constraint.*failed.*\`(\w+)\`/i`, NO `/version.*conflict/i`, y conserva el code (TC-2 + TC-3) | REQ-IMPROVE-01, REQ-PRESERVE-01 | developer | S1.T1 | `mods/curriculum-design/tests/integration/curriculum-lineage.test.ts` | `vitest run` verde; TC-2/TC-3 PASS | git revert | DET-7, DET-13 | pending | 1 |
| S1.T3 | `npm run sync` y verificar el destino sincronizado en object-manager refleja el nuevo mensaje | REQ-IMPROVE-01 | developer | S1.T2 | (sync output) `object-manager/src/graphql/resolvers/mods/curriculum-design/helpers/lineageUniqueness.js` | sync sin errores; diff esperado en el destino | re-run `npm run sync` desde la fuente | DET-16 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` del ticket con Template de Gate, correr `vitest run` del mod + quality review (DET-23), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decisión documentada | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Verificación E2E UI [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Smoke E2E en la suite: crear Curriculum raíz con `(institutionId, code)` duplicado → verificar el toast "Ya existe un registro con ese valor." (no el de concurrencia). Capturar screenshot + payload del error | REQ-IMPROVE-01 | reviewer | S1.GATE | (sin cambios de código — verificación) `screenshots TICKET-073.screenshots/` | TC-1 PASS con evidencia (screenshot + payload) | (no aplica) | DET-13 | pending | 2 |
| S2.T2 | Regression del mod completa (`vitest run`) — sin delta negativo respecto a baseline | REQ-PRESERVE-01 | reviewer | S2.T1 | (sin cambios) `mods/curriculum-design/` | `vitest run` verde, sin regresiones | (no aplica) | DET-7, DET-13 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3, ⚑ fuerte)** — persistir evidencia (TC-1 con screenshot), quality review (DET-23), decidir cierre | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + TC-1 con evidencia + decisión | (no aplica) | DET-20, DET-23, DET-25 | pending | 2 |
