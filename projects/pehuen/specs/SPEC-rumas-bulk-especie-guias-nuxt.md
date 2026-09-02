---
id: SPEC-rumas-bulk-especie-guias-nuxt
project: pehuen
ticket: PEH-017
status: done
---

# Bulk-edit guias de ruma (nuxt) — especies de las guias en el card + paridad estado + guard front del par

# Bulk-edit guias de ruma (nuxt) — especies de las guias en el card + paridad estado + guard front del par

## Executive summary — lo que estas aprobando

**Que se quiere**: replicar en `pehuen-nuxt` lo acordado en PEH-016 (legacy) sobre la edicion masiva de guias de una ruma. Tres cambios: (1) **paridad "Estado de ruma"** — en nuxt ya NO existe el campo editable ni en el modal ni en el schema (confirmado en intake): solo se deja test + nota de paridad. (2) **Especies de las guias en el card** — el card "valores actuales" muestra hoy solo `Ruma.especie`; se agrega "Especie (guias)" con las especies unicas de las guias VIGENTES en formato `codigo - descripcion`, para evidenciar la divergencia ruma ↔ guias. (3) **Guard front del par especie↔producto** — el backend nuxt YA rechaza el par incompleto (refine D3 + validacion de consistencia, con tests); falta solo el guard en el front con mensaje claro antes del confirm.

**Decisiones criticas** (heredadas de PEH-016 via DET-16, resueltas en intake — autopilot super):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `especiesGuias` = array de objetos `{codigo, descripcion}` en el row de `fillRumaData`; el card formatea `"codigo - descripcion"` | Paridad con PEH-016 DEC-LOCAL-01; campo aditivo que no altera `row.especie` ni `row.producto` (RULE-RUMA-004) |
| 2 | Solo guias **VIGENTES** entran al agregado | Paridad con PEH-016 DEC-LOCAL-02 + coherente con lo que el bulk edita (updateMany filtra `estado: 'VIGENTE'`) |
| 3 | La agregacion se extrae a **helper puro exportado** (`collectEspeciesGuias`) y se unit-testea sin DB | `fillRumaData` toca Mongo directo; el patron del repo ya existe (`avgMsToMesCortaSantiago` + `ruma-tz.test.ts`) |
| 4 | Spec nuevo (no se extiende `SPEC-rumas-bulk-edit-guias-nuxt`) | Mismo patron que PEH-016 (spec aparte `depends_on` el de la feature base); el delta es acotado y trazable |

**Riesgos principales y como los mitigamos**:

- **`fillRumaData` alimenta el listado paginado (caliente)** → el `.populate('especie')` se agrega a la re-query de guias ya existente (no query nueva); la agregacion es O(guias de la pagina). Se valida con la suite + e2e del listado.
- **Romper el contrato del row** (`producto: string[]`, `especie`/`estadoRuma` del doc Ruma) → `especiesGuias` es campo NUEVO en `shared/types/ruma.ts`; tests de regresion existentes + TC-4.
- **Guard front demasiado agresivo** (bloquear submits validos) → el guard solo dispara con par incompleto (XOR); los 5 campos restantes no se ven afectados (TC de regresion).

**Que NO se hace**:

- No se toca el schema `guia-bulk.schema.ts` ni el handler del bulk (el backend del par ya esta cubierto; cambio #3 es front-only).
- No se modifica el legacy (PEH-016 ya cerro ese lado).
- No se agrega `especiesGuias` a la tabla/listado de rumas ni al drawer — solo al card del modal bulk (mismo alcance que PEH-016).

**Tamano estimado**: 3 sessions (~3-4h). La mas riesgosa es S1 (backend sobre servicio caliente del listado).

**Como vas a saber que funciona**:
- Abres el modal bulk de una ruma cuyas guias tienen especie distinta → el card muestra "Especie (ruma)" y "Especie (guias): codigo - descripcion" lado a lado, "Estado" en linea completa.
- Eliges especie sin producto y presionas Guardar → el front bloquea con mensaje claro (no llega al backend).
- La suite unit + e2e queda verde; el listado responde igual.

## Purpose

Mirror nuxt de PEH-016: visibilizar en el card del modal bulk la(s) especie(s) reales de las guias VIGENTES de la ruma (hoy oculta tras `Ruma.especie`), confirmar la paridad del no-campo `estadoRuma`, y cerrar el gap front del par especie↔producto. Para admins que editan guias en lote; mantiene RULE-MIGRATION-004 (legacy como fuente de verdad de comportamiento).

## Estado actual (baseline)

- `fillRumaData` (`server/services/ruma.service.ts:98-253`): re-query de guias popula `producto`/`zona`/`procedencia` (NO `especie`); el row expone `especie` del doc Ruma y `producto: string[]`. Sin `especiesGuias`.
- Card del modal (`RumaBulkEditModal.vue:150-174`): grid 2 columnas — "Estado:" + "Especie:" lado a lado, "Productos:" full-width. Sin especies de guias.
- `onSubmit` (`RumaBulkEditModal.vue:118-138`): two-step confirm sin validacion del par; el par incompleto llega al backend y vuelve 400 con toast generico.
- Backend del par: `guia-bulk.schema.ts:51-55` (refine D3) + `guia.service.ts:247-260` (consistencia especie↔producto) + tests (`guia-bulk.schema.test.ts:24-40`, e2e `rumas-bulk-edit.spec.ts:136-151`) — **ya cubierto**.
- Suite unit/e2e verde (baseline a re-confirmar en S1.T1).

## Requirements

### REQ-IMPROVE-01: Paridad #1 — bulk sin `estadoRuma` (verificacion, no-op)

> **Que cambia**: nada en runtime — queda un test que documenta que el bulk nuxt ignora `estadoRuma` y una nota de paridad.
> **Por que**: PEH-016 elimino el campo en legacy; nuxt nacio sin el (DEC-LOCAL-N01). Sin test, la paridad es solo un comentario.

El test suite MUST documentar que `bulkEditGuiasSchema` ignora (strip) un payload con `estadoRuma` y que el resultado parseado no contiene esa clave.

**Actor**: system
**Layers**: schema, tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: payload con estadoRuma ignorado
- **GIVEN** un payload bulk valido con `estadoRuma: 'X'` extra
- **WHEN** `bulkEditGuiasSchema.parse(payload)`
- **THEN** el parse es exitoso y el resultado NO contiene la clave `estadoRuma`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el unit test de paridad pasa; la nota de paridad queda en docs/ticket.

### REQ-IMPROVE-02: Especies de las guias VIGENTES en el card

> **Que cambia**: el card "valores actuales" pasa a mostrar "Estado" en linea completa y, lado a lado, "Especie (ruma)" (la actual) y "Especie (guias)" con las especies unicas de las guias VIGENTES en `codigo - descripcion`.
> **Por que**: hoy el card solo muestra `Ruma.especie` y oculta que las guias pueden tener otra especie — justo lo que el bulk edita.

El backend MUST exponer en el row de `fillRumaData` un campo nuevo `especiesGuias: { codigo, descripcion }[]` con las especies unicas de las guias **VIGENTES** de la ruma (sin duplicados), via helper puro exportado `collectEspeciesGuias`. El tipo `Ruma` (`shared/types/ruma.ts`) MUST extenderse con el campo opcional. El frontend MUST renderizar en el card la fila "Especie (ruma):" (valor actual) y "Especie (guias):" (`codigo - descripcion` separadas por coma, `—` si vacio) lado a lado, con "Estado:" en linea completa. NO se altera `row.especie` ni `row.producto`.

**Actor**: admin
**Layers**: backend, frontend, api, types

<details><summary>Scenarios de validacion</summary>

#### Scenario: card muestra ambas especies
- **GIVEN** una ruma cuyas guias VIGENTES tienen especie distinta a `Ruma.especie`
- **WHEN** el admin abre el modal bulk
- **THEN** el card muestra "Especie (ruma):" con la especie del doc y "Especie (guias): codigo - descripcion, ..." con las especies reales, lado a lado
- **AND** "Estado:" ocupa la linea completa

#### Scenario: especies unicas sin duplicados
- **GIVEN** 10 guias VIGENTES de 2 especies
- **WHEN** se calcula `collectEspeciesGuias`
- **THEN** el array tiene 2 entradas unicas `{codigo, descripcion}`

#### Scenario: solo VIGENTES
- **GIVEN** guias VIGENTES de especie A y guias NULA de especie B
- **WHEN** se calcula `collectEspeciesGuias`
- **THEN** solo aparece la especie A

#### Scenario: sin especies populadas
- **GIVEN** guias VIGENTES sin `especie` (null/no populada)
- **WHEN** se calcula `collectEspeciesGuias`
- **THEN** retorna `[]` y el card muestra `—`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el modal bulk sobre una ruma con divergencia de especies y ve ambas filas con el layout descrito.

### REQ-IMPROVE-03: Guard front del par especie↔producto on-submit

> **Que cambia**: al presionar "Guardar cambios" con especie elegida y producto vacio (o viceversa), el modal bloquea ANTES del paso de confirmacion con un mensaje claro, en vez de enviar y recibir un 400 generico.
> **Por que**: paridad con PEH-016 (commit legacy `ddd7bce`); el backend ya rechaza el par incompleto pero el usuario no entiende el porque.

`onSubmit` del modal MUST validar, antes de entrar al paso de confirmacion, que especie y producto vienen juntos o ninguno (`!!form.especie === !!form.producto`). Si el par esta incompleto MUST mostrar mensaje claro ("Si cambias la especie, debes elegir un producto" / inverso) y NO avanzar al confirm ni enviar el request. El backend NO se modifica.

**Actor**: admin
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: especie sin producto bloqueada en front
- **GIVEN** el modal bulk con especie seleccionada y producto vacio
- **WHEN** el admin presiona "Guardar cambios"
- **THEN** aparece el mensaje claro y NO se entra al paso de confirmacion ni se envia request

#### Scenario: par completo pasa
- **GIVEN** especie y producto seleccionados
- **WHEN** el admin presiona "Guardar cambios" y confirma
- **THEN** el flujo two-step funciona como hoy

#### Scenario: otros campos no afectados
- **GIVEN** solo `zona` seleccionada (sin especie ni producto)
- **WHEN** el admin guarda y confirma
- **THEN** el submit procede normal (el guard no dispara)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: elige especie sin producto, presiona Guardar y ve el mensaje sin que el modal avance ni llame al backend.

### REQ-PRESERVE-01: Contrato del row + resto del bulk intactos (regression)

> **Que cambia**: nada — garantia de no regresion (DET-7).
> **Por que**: mejorar el card y romper el listado o el bulk no es mejora.

El sistema MUST mantener: `row.producto` como `string[]` (RULE-RUMA-004); `row.especie`/`row.estadoRuma` poblados del doc Ruma; el comportamiento de los 7 campos del bulk y su cascada especie→producto; el refine D3 del schema y la validacion de consistencia del service; el listado de rumas respondiendo igual (+`especiesGuias` aditivo).

**Actor**: system
**Layers**: backend, frontend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: suite existente verde
- **GIVEN** el cambio implementado
- **WHEN** corre `pnpm test:unit` y los e2e de rumas-bulk-edit
- **THEN** todos los tests preexistentes pasan sin modificaciones de expectativa

#### Scenario: listado sin regresion
- **GIVEN** `fillRumaData` con `especiesGuias`
- **WHEN** se carga el listado de rumas
- **THEN** `producto` sigue `string[]`, `especie`/`estadoRuma` del doc Ruma, paginacion igual

</details>

#### Acceptance
**El usuario puede verificar que funciona**: listado y bulk se comportan igual que antes; suites verdes.

## Changes

### Modified: `fillRumaData` + helper nuevo (`pehuen_nuxt/server/services/ruma.service.ts`)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| re-query de guias (L123-127) | `.populate('producto').populate('zona').populate('procedencia')` | + `.populate('especie')` | obtener `codigo`/`descripcion` de la especie de cada guia (REQ-IMPROVE-02) |
| agregacion en loop | no agrega especie | helper puro `collectEspeciesGuias(guias)` — unicas, solo `estado === 'VIGENTE'` | REQ-IMPROVE-02 + DEC paridad PEH-016 |
| row resultante (L238-249) | sin `especiesGuias` | `especiesGuias: [{codigo, descripcion}, ...]` | campo nuevo aditivo |

### Modified: tipo `Ruma` (`pehuen_nuxt/shared/types/ruma.ts`)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| interface `Ruma` | sin `especiesGuias` | `especiesGuias?: { codigo: number | string; descripcion: string }[]` | propagacion del contrato del row (DET-16 L4 de PEH-016); el modal lo lee por prop |

### Modified: modal bulk (`pehuen_nuxt/app/components/rumas/RumaBulkEditModal.vue`)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| card grid | "Estado:" + "Especie:" lado a lado; "Productos:" full | "Estado:" full-width; "Especie (ruma):" + "Especie (guias):" lado a lado | REQ-IMPROVE-02 (layout paridad PEH-016 final) |
| computed | `cardEspecie` | + `cardEspeciesGuias` (join `"codigo - descripcion"`, `—` si vacio) | REQ-IMPROVE-02 |
| `onSubmit` | sin validacion del par | guard pre-confirm `!!form.especie !== !!form.producto` → mensaje claro + return | REQ-IMPROVE-03 |

### Added: tests

| Test | Cubre | Tipo |
|------|-------|------|
| `tests/unit/server/services/ruma-especies-guias.test.ts` (nuevo) | `collectEspeciesGuias`: unicas, solo VIGENTES, vacio, sin populate | unit |
| `tests/unit/schemas/guia-bulk.schema.test.ts` (+1 caso) | REQ-IMPROVE-01: parse con `estadoRuma` → strip | unit |
| `tests/e2e/rumas-bulk-edit.spec.ts` (+casos) | listado GET devuelve `especiesGuias` correcto (unicas, solo VIGENTES) | e2e API |

## Constraints

- RULE-RUMA-004: `producto` del row es `string[]` — `especiesGuias` es campo nuevo, no lo altera.
- RULE-RUMA-005: `fillRumaData` calcula al vuelo — el agregado sigue ese patron (sin denormalizar a DB).
- RULE-MIGRATION-001/002/004: sin regresion funcional; TDD obligatorio; legacy (PEH-016) define el comportamiento.
- RULE-GEN-001: el schema compartido vive en `shared/schemas/` — no se duplica (aqui ni se toca).
- DEC PEH-016 DEC-LOCAL-01/02: shape `{codigo, descripcion}[]` + solo VIGENTES (heredadas).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `.populate('especie')` degrada el listado paginado | low | medium | populate sobre la re-query existente (no query nueva), acotado a la pagina; e2e del listado valida respuesta |
| Guard front bloquea submits validos | low | medium | guard XOR estricto solo sobre el par; scenario de regresion "otros campos no afectados" |
| Romper consumidores del row (`especie`/`producto`) | low | high | campo aditivo + tipo opcional; suite existente sin cambios de expectativa (REQ-PRESERVE-01) |

## Open questions

(ninguna — H1-H5 convergidas en intake-explore; decisiones heredadas de PEH-016)

## Decisions

### DEC-LOCAL-01: Helper puro exportado para la agregacion (testeable sin DB)
- **Contexto**: `fillRumaData` toca Mongo directo (`Guia.collection`); unit-testearlo completo requeriria mocks pesados o memory-server
- **Drivers**: RULE-MIGRATION-002 (TDD), patron existente en el repo (`avgMsToMesCortaSantiago` + `ruma-tz.test.ts`), una responsabilidad por funcion
- **Opcion elegida**: extraer `collectEspeciesGuias(guias)` puro y exportado; `fillRumaData` lo invoca en el loop
- **Alternativas**: (a) logica inline en el loop + test e2e only — descartada: la unidad queda sin cobertura rapida; (b) mock de Mongoose — descartada: fragil y lento
- **Consecuencias**: una export nueva en el service; el unit corre en ms
- **Session**: design (autopilot super, 2026-06-12)

### DEC-LOCAL-02: Spec nuevo en vez de extender SPEC-rumas-bulk-edit-guias-nuxt
- **Contexto**: el ticket pedia decidir en design si extender el spec base del bulk (PEH-012) o crear uno nuevo
- **Drivers**: paridad de estructura con PEH-016 (creo spec aparte `SPEC-rumas-bulk-especie-card`), trazabilidad del delta, spec base ya `done`
- **Opcion elegida**: spec nuevo `depends_on` el base + el de PEH-016
- **Alternativas**: extender el spec base — descartada: reabre un spec cerrado y mezcla deltas de tickets distintos
- **Consecuencias**: grafo de specs refleja el mirror legacy↔nuxt
- **Session**: design (autopilot super, 2026-06-12)

## Tasks

### Session 1 — Backend: helper + especiesGuias en fillRumaData + tipo + tests (TDD) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Preflight: branch `PEH-017-rumas-bulk-especie-guias-nuxt` desde main en pehuen_nuxt + baseline suite unit verde (registrar totales) | REQ-PRESERVE-01 | developer | — | git, (lectura) | `pnpm test:unit` verde; branch creada | git: borrar branch | DET-11, DET-30 | done | 1 |
| S1.T2 | TDD: unit nuevo `ruma-especies-guias.test.ts` para `collectEspeciesGuias` (unicas, solo VIGENTES, vacio, sin populate) — rojo primero | REQ-IMPROVE-02 | developer | S1.T1 | pehuen_nuxt/tests/unit/server/services/ruma-especies-guias.test.ts | test escrito, falla por export ausente | git revert | DET-7, RULE-MIGRATION-002 | done | 1 |
| S1.T3 | TDD paridad #1: caso nuevo en `guia-bulk.schema.test.ts` — parse de payload con `estadoRuma` extra → strip (clave ausente) | REQ-IMPROVE-01 | developer | S1.T1 | pehuen_nuxt/tests/unit/schemas/guia-bulk.schema.test.ts | caso verde (el schema ya stripea — documenta paridad) | git revert | DET-7, RULE-MIGRATION-002 | done | 1 |
| S1.T4 | Implementar: `collectEspeciesGuias` exportado + `.populate('especie')` en re-query + `especiesGuias` en el row + extender interface `Ruma` | REQ-IMPROVE-02 | developer | S1.T2 | pehuen_nuxt/server/services/ruma.service.ts, pehuen_nuxt/shared/types/ruma.ts | unit S1.T2 verde; `pnpm typecheck` 0 err; suite unit completa verde | git revert | DET-8, DET-16, RULE-RUMA-004, RULE-RUMA-005 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir, typecheck+unit verdes, quality review | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23, DET-27 | done | 1 |

### Session 2 — Frontend: card (labels+layout) + guard del par [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Card: "Estado:" full-width; "Especie (ruma):" + "Especie (guias):" lado a lado; computed `cardEspeciesGuias` (`codigo - descripcion` join, `—` si vacio) | REQ-IMPROVE-02 | developer | S1.GATE | pehuen_nuxt/app/components/rumas/RumaBulkEditModal.vue | `pnpm typecheck` + lint 0 err; smoke visual | git revert | DET-16, RULE-RUMA-004 | done | 2 |
| S2.T2 | Guard `onSubmit` pre-confirm: par incompleto (XOR) → mensaje claro + no avanzar; sin tocar backend | REQ-IMPROVE-03 | developer | S2.T1 | pehuen_nuxt/app/components/rumas/RumaBulkEditModal.vue | smoke: especie sin producto bloqueada con mensaje; par completo fluye | git revert | DET-8, RULE-MIGRATION-004 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — typecheck/lint/build verdes, smoke, quality review | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23, DET-27 | done | 2 |

### Session 3 — E2E + docs + close [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | E2E: casos nuevos en `rumas-bulk-edit.spec.ts` — GET listado devuelve `especiesGuias` (unicas, solo VIGENTES, seed con guia NULA de otra especie) | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S2.GATE | pehuen_nuxt/tests/e2e/rumas-bulk-edit.spec.ts | e2e suite verde (incl. casos preexistentes) | git revert | DET-7, DET-25, RULE-MIGRATION-002 | done | 3 |
| S3.T2 | Smoke UI manual/Playwright del card + guard (evidencia screenshot al subdir del ticket) | REQ-IMPROVE-02, REQ-IMPROVE-03 | reviewer | S3.T1 | (pruebas) | TC-3/TC-5 con evidencia inline | (no aplica) | DET-13, DET-25 | done | 3 |
| S3.T3 | Docs nuxt: 02-views (rumas bulk card), 07-migration-notes (by-flow bulk-edit-guias + paridad #1), 01-data-model (ruma row `especiesGuias`) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S3.T1 | pehuen_nuxt/docs/02-views/, pehuen_nuxt/docs/07-migration-notes/, pehuen_nuxt/docs/01-data-model/ | docs reflejan el cambio | git revert | DET-16 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — suites verdes, docs, quality review exhaustive, listo para close | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23, DET-27 | done | 3 |

### Task contract (resumen)

```
Cobertura de rules del ticket:
- RULE-MIGRATION-002 (TDD) → S1.T2, S1.T3 (tests primero), S3.T1
- RULE-RUMA-004 (producto string[]) → S1.T4, S2.T1 (no alterar producto ni row)
- RULE-RUMA-005 (volumes on-fly) → S1.T4 (agregado al vuelo, sin denormalizar)
- RULE-MIGRATION-001/004 (paridad, legacy source of truth) → todo el ticket (mirror PEH-016)
- RULE-GEN-001 (zod shared) → no se toca el schema; el caso S1.T3 testea el compartido
- DET-7 (regression) → REQ-PRESERVE-01 + S1.T1 baseline; DET-13 (evidencia) → gates; DET-16 (propagacion) → tipo Ruma + docs
```

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-IMPROVE-01/02/03 verificados — TC-1 strip test; card + guard con screenshots (smoke Playwright S3.T2); TC-7 e2e
- [x] **Tests**: unit 643 pass (4 fail preexistentes fuera de scope); e2e 21/21 (--workers=1); suite preexistente sin cambios de expectativa
- [x] **Rules**: RULE-RUMA-004 (producto `string[]` assert en TC-7), RULE-RUMA-005 (calculo al vuelo), RULE-MIGRATION-002 (TDD: test rojo 78a0986 antes de feat 6297376)
- [x] **Integration**: listado sin regresion (TC-7); 2do consumidor de fillRumaData (reporte CSV) verificado sin cambios (DET-16)
- [x] **Docs**: 02-views + 07-migration-notes (seccion PEH-017) + 01-data-model actualizadas (working tree, docs/ gitignored)
