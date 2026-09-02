---
id: SPEC-rumas-bulk-especie-card
project: pehuen
ticket: PEH-016
status: done
---

# Bulk-edit guias de ruma (legacy) — quitar "Estado de ruma" + especies de las guias en el card

# Bulk-edit guias de ruma (legacy) — quitar "Estado de ruma" + especies de las guias en el card

## Executive summary — lo que estas aprobando

**Que se quiere**: dos ajustes sobre la edicion masiva de guias de una ruma (PEH-012, legacy). (1) Quitar el campo editable "Estado de ruma" del modal: escribe `Guia.estadoRuma` (string) que ningun read-path consume — es un no-op que confunde. (2) En el card "valores actuales", mantener la especie de la ruma y agregar las especies reales de las guias VIGENTES (`codigo - descripcion`), porque hoy el card solo muestra `Ruma.especie` y oculta que las guias pueden tener otra especie (la que el bulk edita).

**Decisiones criticas que necesitan tu OK** (ya confirmadas por el dev):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `especiesGuias` = array de objetos `{codigo, descripcion}` en el response de `fillRumaData`; el card formatea `"codigo - descripcion"` | Campo aditivo: no altera `row.especie` (Ruma) ni `row.producto` (RULE-RUMA-004) |
| 2 | El card agrega especies solo de guias **VIGENTES** | Coherente con lo que el bulk edita + RULE-GUIA-002 |

**Riesgos principales y como los mitigamos**:

- **`fillRumaData` es el endpoint caliente del listado de rumas** → el `.populate('especie')` extra se acota a las guias ya cargadas en el loop existente (no query adicional); se valida que el listado siga respondiendo igual.
- **Romper consumidores de `row.especie`/`row.producto`** → `especiesGuias` es campo NUEVO; no se toca `especie` (drawer/tabla `List.vue:651`) ni `producto` (RULE-RUMA-004).
- **Tocar legacy sin preflight** → S1 arranca con RULE-MIGRATION-005 (NODE_ENV=development, conexion localhost, creds locales).

**Que NO se hace en este ticket**:

- No se borra el campo `Guia.estadoRuma` del modelo (lo escribe el alta de guia legacy); solo se deja de escribir por bulk.
- No se revierten los valores que el bulk ya escribio en `Guia.estadoRuma`.
- No se toca el mirror nuxt (lo aborda PEH-017).

**Tamano estimado**: 3 sessions (~3-4h). La mas riesgosa es S1 (backend sobre endpoint caliente + preflight legacy).

**Como vas a saber que funciona**:
- Abro el modal bulk como admin → NO aparece "Estado de ruma".
- El card muestra "Especie:" (ruma) y "Especie (guias): codigo - descripcion, ..." con las especies reales de las guias VIGENTES.
- Los otros 6 campos del bulk siguen funcionando; el listado de rumas responde igual.

## Purpose

Mejora sobre la feature de edicion masiva de guias (PEH-012, par legacy `pehuen-client` + `pehuen-server`). Elimina un campo de escritura inerte (`Guia.estadoRuma` via bulk) y hace visible en el card la divergencia entre la especie del documento Ruma y la(s) especie(s) reales de sus guias VIGENTES.

## Requirements

### REQ-IMPROVE-01: Quitar "Estado de ruma" del modal bulk

> **Que cambia**: el modal de edicion masiva deja de ofrecer el campo "Estado de ruma" y el backend deja de aceptarlo en el payload del bulk.
> **Por que**: el bulk escribia `Guia.estadoRuma` (string denormalizado) que ningun read-path consume (el listado y el export leen `Ruma.estadoRuma`); el campo es un no-op que confunde.

El frontend MUST eliminar el `<ui-text-select label="Estado de ruma">` del modal bulk y su estado asociado (`bulkForm.estadoRuma`, `estadoRumaBulkOpts`). El backend MUST eliminar `estadoRuma` del `BulkEditGuiasDto` (interface, `fromPlainObject`, validacion, guard "Nada que editar", constante `ESTADO_RUMA_VALUES`). El campo `Guia.estadoRuma` del modelo NO se borra. Valores ya escritos NO se revierten.

**Actor**: admin
**Layers**: frontend, backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: modal sin campo estado
- **GIVEN** un admin con el modal de editar ruma abierto
- **WHEN** abre "Editar Guias Asociadas"
- **THEN** el formulario NO muestra el select "Estado de ruma"
- **AND** muestra los 7 campos restantes (intervencion, zona, procedencia, especie, producto, fechaCorta, anioPlantacion)

#### Scenario: payload con estadoRuma ignorado
- **GIVEN** el backend modificado
- **WHEN** se envia un PATCH bulk con `estadoRuma` en el body
- **THEN** el campo se ignora (no entra al `$set`); el resto de campos se aplica normal

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el modal bulk como admin y no ve el campo "Estado de ruma"; el resto del formulario funciona igual.

### REQ-IMPROVE-02: Especies de las guias VIGENTES en el card

> **Que cambia**: el card "valores actuales" del modal bulk mantiene la fila "Especie:" (de la ruma) y agrega una fila "Especie (guias):" con las especies unicas de las guias VIGENTES en formato `codigo - descripcion`.
> **Por que**: hoy el card solo muestra `Ruma.especie`; oculta que las guias pueden tener otra especie — justo lo que el bulk edita.

El backend MUST exponer en el row de `fillRumaData` un campo nuevo `especiesGuias`: array de objetos `{codigo, descripcion}` de las especies unicas de las guias **VIGENTES** de la ruma (sin duplicados). El frontend MUST mostrar en el card la fila existente "Especie:" (de `Ruma.especie`) y una fila nueva "Especie (guias):" que renderiza `especiesGuias` como `"codigo - descripcion"` separadas por coma. NO se altera `row.especie` ni `row.producto`.

**Actor**: admin
**Layers**: backend, frontend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: card muestra ambas especies
- **GIVEN** una ruma cuyas guias VIGENTES tienen especie distinta a `Ruma.especie`
- **WHEN** el admin abre el modal bulk
- **THEN** el card muestra "Especie:" con la especie de la ruma
- **AND** muestra "Especie (guias): codigo - descripcion, ..." con las especies reales de las guias VIGENTES

#### Scenario: especies unicas sin duplicados
- **GIVEN** una ruma con 10 guias VIGENTES de 2 especies
- **WHEN** se calcula `especiesGuias`
- **THEN** el array tiene 2 entradas unicas `{codigo, descripcion}`

#### Scenario: solo VIGENTES
- **GIVEN** una ruma con guias VIGENTES de especie A y guias NULA de especie B
- **WHEN** se calcula `especiesGuias`
- **THEN** solo aparece la especie A (las NULA se excluyen)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el modal bulk sobre una ruma con guias de especie distinta a la ruma y ve ambas filas (especie de ruma + especies de guias en `codigo - descripcion`).

### REQ-PRESERVE-01: Resto del bulk y contrato del row intactos (regression)

> **Que cambia**: nada — garantia de no regresion.
> **Por que**: DET-7. Mejorar algo y romper otro no es mejora.

El sistema MUST mantener el comportamiento de los 6 campos restantes del bulk (intervencion, zona, procedencia, especie, producto, fechaCorta, anioPlantacion) y la cascada especie→producto. El campo `row.producto` MUST seguir siendo array de strings (`RULE-RUMA-004`). El campo `row.especie` y `row.estadoRuma` (de la Ruma) MUST seguir poblandose igual para el listado/tabla/drawer.

**Actor**: system
**Layers**: backend, frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: bulk de los campos restantes
- **GIVEN** el bulk modificado
- **WHEN** un admin edita en lote zona/procedencia/anioPlantacion/especie+producto
- **THEN** las guias VIGENTES se actualizan como antes (paridad PEH-012)

#### Scenario: listado de rumas sin regresion
- **GIVEN** `fillRumaData` con el nuevo `especiesGuias`
- **WHEN** se carga el listado de rumas
- **THEN** `producto` sigue siendo `string[]`, `especie`/`estadoRuma` siguen viniendo del doc Ruma, y el listado responde igual

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el listado de rumas y el resto del bulk se comportan igual que antes del cambio.

## Changes

### Modified: `BulkEditGuiasDto` (`pehuen-server/src/dtos/bulk-edit-guias.dto.ts`)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `BulkEditGuiasFields.estadoRuma` | `estadoRuma?: string` presente | removido | El bulk deja de escribir `Guia.estadoRuma` (REQ-IMPROVE-01) |
| `fromPlainObject` | setea `estadoRuma` si viene | sin `estadoRuma` | idem |
| validacion | valida `ESTADO_RUMA_VALUES`; `estadoRuma` en guard "Nada que editar" | removido + `ESTADO_RUMA_VALUES` eliminado | idem |

### Modified: `fillRumaData` (`pehuen-server/src/services/ruma.service.ts`)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| query de guias (L60) | `.populate('producto').populate('zona').populate('procedencia')` | + `.populate('especie')` | obtener `codigo`/`descripcion` de la especie de cada guia |
| agregacion en loop | no agrega especie | acumula `Set`/`Map` de especies VIGENTES unicas `{codigo, descripcion}` | REQ-IMPROVE-02 + DEC-LOCAL-02 |
| row resultante | sin `especiesGuias` | `rumaObj.especiesGuias = [{codigo, descripcion}, ...]` | campo nuevo aditivo (DEC-LOCAL-01) |

### Modified: modal bulk (`pehuen-client/src/views/rumas/List.vue`)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| form bulk | tiene `<ui-text-select "Estado de ruma">` + `bulkForm.estadoRuma` + `estadoRumaBulkOpts` | removidos | REQ-IMPROVE-01 |
| card | fila "Especie:" (ruma) | + fila "Especie (guias): codigo - descripcion" desde `currentRumaRow.especiesGuias` | REQ-IMPROVE-02 |

## Tasks

### Session 1 — Preflight legacy + backend (DTO sin estadoRuma + especiesGuias en fillRumaData) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Preflight legacy (RULE-MIGRATION-005): branch `PEH-016-rumas-bulk-especie-guias` desde main en ambos repos; `.env` NODE_ENV=development + conexion localhost confirmada; dataset con ruma de guias VIGENTES de especie != Ruma.especie | REQ-IMPROVE-02 | developer | — | pehuen-server/.env (verif), git | server `npm run dev` loguea localhost:27017; branch creada | git: borrar branch | DET-11, RULE-MIGRATION-005 | pending | 1 |
| S1.T2 | Quitar `estadoRuma` del `BulkEditGuiasDto` (interface, `fromPlainObject`, validacion, guard, `ESTADO_RUMA_VALUES`) | REQ-IMPROVE-01 | developer | S1.T1 | pehuen-server/src/dtos/bulk-edit-guias.dto.ts | `tsc --noEmit` 0 err | git revert | DET-8, DET-10, RULE-GEN-007 | pending | 1 |
| S1.T3 | `fillRumaData`: `.populate('especie')` en la query de guias + acumular `especiesGuias` unico `{codigo, descripcion}` solo de guias VIGENTES + exponer en `rumaObj` (no tocar `especie`/`producto`) | REQ-IMPROVE-02 | developer | S1.T1 | pehuen-server/src/services/ruma.service.ts | `tsc --noEmit` 0 err; e2e: GET listado devuelve especiesGuias correcto vs DB | git revert | DET-5, DET-8, DET-16, RULE-RUMA-004, RULE-RUMA-005, RULE-GUIA-002 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados, tsc 0 err, e2e read del listado, quality review | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | pending | 1 |

### Session 2 — Frontend: quitar campo estado + card con especies de guias [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Quitar del form bulk el select "Estado de ruma" + `bulkForm.estadoRuma` + `estadoRumaBulkOpts` + su retorno del setup | REQ-IMPROVE-01 | developer | S1.GATE | pehuen-client/src/views/rumas/List.vue | client compila; smoke: sin campo estado | git revert | DET-10, RULE-GEN-007 | pending | 2 |
| S2.T2 | Card: agregar fila "Especie (guias): codigo - descripcion" desde `currentRumaRow.especiesGuias` (mantener fila "Especie:" de la ruma) | REQ-IMPROVE-02 | developer | S1.GATE | pehuen-client/src/views/rumas/List.vue | client compila; smoke: card muestra ambas especies | git revert | DET-16, RULE-RUMA-004 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — client compila, smoke modal, quality review | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | pending | 2 |

### Session 3 — E2E manual + docs + close [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | E2E manual (curl/mongosh, DB local): payload con estadoRuma ignorado; especiesGuias coherente (unico, solo VIGENTES); 6 campos restantes OK; producto sigue string[] | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01 | reviewer | S2.GATE | (pruebas) | TC-2..TC-5 pass; evidencia inline | (no aplica) | DET-7, DET-13, DET-25 | pending | 3 |
| S3.T2 | Actualizar docs: pehuen-server/docs (endpoint bulk-edit-guias sin estadoRuma + fillRumaData/ruma con especiesGuias); pehuen-client/docs/02-views (modal bulk) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S3.T1 | pehuen-server/docs, pehuen-client/docs | docs reflejan el cambio | git revert | DET-16, RULE-GEN-007 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — e2e pass, docs actualizadas, quality review exhaustive, listo para close | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | pending | 3 |

### Task contract (resumen)

```
Cobertura de rules del ticket:
- RULE-MIGRATION-005 → S1.T1 (preflight)
- RULE-GEN-007 (language) → S1.T2, S2.T1, S3.T2 (codigo en ingles, contenido en espanol)
- RULE-RUMA-004 (producto array string) → S1.T3, S2.T2 (no alterar producto)
- RULE-RUMA-005 (volumes on-fly) → S1.T3 (agregado al vuelo)
- RULE-GUIA-002 (vigente/nula) → S1.T3 (solo VIGENTES)
- RULE-AUTH-003 (admin-only) → sin cambios; el bulk sigue admin-only (no se toca el guard)
- RULE-MIGRATION-004 (legacy source of truth) → todo el ticket (legacy define el patron para PEH-017)
- DET-7 (regression) → S3.T1; DET-13 (evidencia) → gates; DET-16 (propagacion) → docs + PEH-017
```

## Constraints

- RULE-MIGRATION-005: preflight legacy obligatorio antes de tocar codigo (S1.T1).
- RULE-RUMA-004: `producto` del row es `string[]` — `especiesGuias` es campo nuevo, no lo altera.
- RULE-GUIA-002: el agregado del card es solo de guias VIGENTES.
- RULE-AUTH-003: el bulk sigue admin-only (sin cambios al guard).
- DEC del PEH-012 D-1: el bulk solo escribe guias (no toca el doc Ruma) — se mantiene.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `.populate('especie')` degrada el endpoint del listado | low | medium | Es populate sobre las guias ya cargadas en el loop, no query nueva; validar respuesta del listado en S1 |
| Romper consumidores de `row.especie`/`producto` | low | high | `especiesGuias` campo NUEVO; no se toca `especie`/`producto` |
| Legacy sin framework de tests | confirmed | medium | e2e manual curl/mongosh (PEH-012 L18); validacion estatica `tsc` |

## Open questions

(ninguna — DEC-LOCAL-01/02 resueltas en intake)

## Decisions

### DEC-LOCAL-01: Shape de `especiesGuias` = array de objetos `{codigo, descripcion}`
- **Contexto**: el card necesita mostrar `codigo - descripcion` de las especies de las guias
- **Drivers**: reutilizabilidad, no romper `RULE-RUMA-004` (producto array string), separacion datos/formato
- **Opcion elegida**: backend expone `{codigo, descripcion}[]`; el front formatea `"codigo - descripcion"`
- **Alternativas**: array de strings ya formateado en backend (descartado: mezcla datos y presentacion, menos reutilizable)
- **Consecuencias**: un campo nuevo en el row; el front hace el join
- **Session**: intake (confirmado por dev 2026-06-12)

### DEC-LOCAL-02: El card agrega especies solo de guias VIGENTES
- **Contexto**: una ruma puede tener guias VIGENTES y NULA de distintas especies
- **Drivers**: coherencia con lo que el bulk edita (solo VIGENTES) + RULE-GUIA-002
- **Opcion elegida**: `especiesGuias` cuenta solo guias VIGENTES
- **Alternativas**: todas las guias (descartado: mostraria especies de guias anuladas que el bulk no toca)
- **Consecuencias**: el card refleja exactamente el universo que el bulk modifica
- **Session**: intake (confirmado por dev 2026-06-12)

## Acceptance checkpoints

- [x] **Funcional**: REQ-IMPROVE-01 (sin campo estado, payload ignora estadoRuma) + REQ-IMPROVE-02 (card con "Especie (ruma)" + "Especie (guías)") verificados — validacion visual in-vivo por el dev
- [x] **Tests**: e2e lectura DB real (especiesGuias, Ruma #3) + code-verified (tsc/build 0 err); legacy sin framework (L18)
- [x] **Rules**: RULE-RUMA-004 (producto `string[]` intacto), RULE-GUIA-002 (solo VIGENTES), RULE-MIGRATION-005 (preflight) respetadas
- [x] **Integration**: listado de rumas sin regresion; 6 campos restantes del bulk OK; merge ff a main + push origin OK
- [x] **Docs**: pehuen-server/docs (`ruma.md`) + pehuen-client/docs (`list.md`) actualizadas + cambio #3 (par especie⇄producto) propagado a PEH-017
