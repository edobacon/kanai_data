---
id: SPEC-frontend-debt-jor059
project: jormat-evolution
ticket: JOR-061
status: done
---

# Cierre de deuda JOR-059: contrato Zod estadoSII, a11y del Alert y branch coverage ≥90

# Cierre de deuda JOR-059: contrato Zod estadoSII, a11y del Alert y branch coverage ≥90

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes.*

**Que se quiere**: cerrar los 3 items `should` que quedaron abiertos al cerrar JOR-059. El principal es restaurar el gate de coverage: hoy `vitest --coverage` **falla** (branches 86.78% < 90) y cualquier ticket futuro hereda ese rojo. Ademas, alinear el contrato Zod del front con el backend (`estadoSII` ya aceptado por la API pero ausente del schema) y hacer que el `Alert` anuncie correctamente a lectores de pantalla segun severidad.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | B1 contrato-solo: `estadoSII` entra al schema Zod pero NO se expone control en el builder (DEC-LOCAL-01, ya elegida por el dev) | `estadoSII` es veredicto del SII, no input del usuario — un select lo modelaria mal y sumaria branches contra B4 |
| 2 | `aria-live` explicito por variante en `Alert`: `assertive` (error) / `polite` (resto) | Hoy `role="alert"` implica assertive para TODO — info/success interrumpen al lector de pantalla; el cambio es intencional, no zero-behavior a nivel a11y |
| 3 | Ramas inalcanzables en B4 se resuelven con `/* v8 ignore */` justificado (comentario con razon), NO con refactor de producto | Mantiene zero-behavior-change; un refactor para "hacer testeable" es scope creep de este ticket |

**Riesgos principales y como los mitigamos**:

- **Algun ofensor no llega a 90 solo con tests** (H2 ~partial) → S2.T1 mide branches por archivo ANTES de escribir tests; si aparece rama inalcanzable, ignore justificado (decision 3); si requiere refactor, se detiene y escala al dev.
- **Regenerar `api.gen.ts` requiere la API corriendo** (openapi-typescript contra `/docs-json`) → task separada con fallback documentado: si docker no esta disponible en la maquina, se difiere a backlog `should` sin bloquear el cierre (el contrato Zod es la fuente front→back segun DEC-002; `api.gen.ts` es espejo informativo).
- **Cambiar `ui/alert` afecta consumidores** → analisis hecho: solo 2 (`TransactionBuilder`, `SimulacionSiiBanner`), ninguno pasa `aria-live`; el atributo computado va ANTES del spread `{...props}` para preservar override.

**Que NO se hace en este ticket**:

- B2 (badge "simulada" por-DTE en detalle del DTE) — pertenece a JOR-060 (construye esa vista).
- Control de `estadoSII` en el builder — descartado por decision 1.
- Refactors de componentes para subir coverage — solo tests (+ ignores justificados).

**Tamano estimado**: 2 sessions (~4-5h efectivas). La mas riesgosa es S2 (coverage): el esfuerzo real depende de cuantos branches falten por archivo, dato que S2.T1 mide primero.

**Como vas a saber que funciona**:

- Ejecutas `npx vitest run --coverage` en `front/jormat-front` y termina exit 0 con branches ≥90%.
- Emites una factura con `estadoSII` en el payload y el schema la acepta; con un valor fuera del enum, la rechaza.
- Inspeccionas un `Alert variant="error"` en DOM y ves `aria-live="assertive"`; en `variant="info"`, `aria-live="polite"`.

---

## Purpose

Cerrar la deuda tecnica de JOR-059 en el workspace `frontend`: restaurar el gate de branch coverage (RULE-testing-coverage-threshold-002), alinear `facturaIssueInputSchema` con el DTO backend que ya acepta `estadoSII` (DEC-002: Zod front→back), y completar el contrato a11y del `Alert` (WCAG 2.1 — anuncios por severidad). Zero behavior change en runtime salvo el delta a11y intencional.

## Requirements

### REQ-IMPROVE-01: Branch coverage global del frontend ≥90

> **Que cambia**: `npx vitest run --coverage` vuelve a pasar — hoy falla con branches 86.78% < 90 aunque todas las suites esten verdes.
> **Por que**: el gate roto enmascara regresiones de cobertura en todo ticket futuro; la deuda es preexistente y concentrada en 5 archivos identificados.

El sistema MUST alcanzar branch coverage global ≥90% en el proyecto jsdom de `front/jormat-front`, agregando tests de branches en los ofensores identificados sin cambiar comportamiento de produccion. Ramas inalcanzables MAY excluirse con `/* v8 ignore */` acompañado de comentario justificando por que la rama no es alcanzable.

**Actor**: system (gate de CI local)
**Layers**: frontend (tests)

<details><summary>Scenarios de validacion</summary>

#### Scenario: gate verde
- **GIVEN** el arbol con los tests nuevos de S1 y S2
- **WHEN** se ejecuta `npx vitest run --coverage` (proyecto jsdom)
- **THEN** exit code 0 y branches ≥90% global

#### Scenario: ignore justificado
- **GIVEN** una rama inalcanzable detectada en S2.T1
- **WHEN** se excluye con `/* v8 ignore */`
- **THEN** el comentario adyacente explica por que es inalcanzable (sin comentario, el reviewer rechaza)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: correr `npx vitest run --coverage` en `front/jormat-front` → exit 0, resumen muestra branches ≥90.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-cov | arbol post-S2 | `vitest run --coverage` | gate evalua thresholds | exit 0, branches ≥90% |

### REQ-IMPROVE-02: Contrato Zod alineado con `estadoSII`

> **Que cambia**: el payload de "Facturar" puede incluir `estadoSII` (opcional) y el schema del front lo valida contra el mismo enum que el backend; hoy el campo ni siquiera esta declarado.
> **Por que**: el backend (JOR-059) ya acepta y valida `estadoSII` — el schema front desalineado rompe DEC-002 (Zod es la fuente del contrato front→back).

`facturaIssueInputSchema` MUST declarar `estadoSII: estadoSIISchema.optional()` (reusa el enum existente `ESTADO_SII` de `lib/schemas/ventas.ts:27` — la constante `ESTADO_SII_VALUES` citada en el request no existe). El schema MUST aceptar los 3 valores del enum y rechazar valores fuera de el. NO se expone control en el builder (DEC-LOCAL-01). `facturaDraftInputSchema` NO lo declara — el draft nunca envia veredicto SII.

**Actor**: developer (consumidor del contrato)
**Layers**: frontend (lib/schemas), api (contrato)

<details><summary>Scenarios de validacion</summary>

#### Scenario: valor valido
- **GIVEN** un payload de emision completo
- **WHEN** incluye `estadoSII: 'rechazado'`
- **THEN** `facturaIssueInputSchema.safeParse` retorna success

#### Scenario: valor invalido
- **GIVEN** un payload de emision completo
- **WHEN** incluye `estadoSII: 'foo'`
- **THEN** safeParse retorna error sobre el campo `estadoSII`

#### Scenario: campo ausente (retro-compat)
- **GIVEN** un payload de emision sin `estadoSII`
- **WHEN** se parsea
- **THEN** success — el campo es opcional y ningun consumidor existente lo envia

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los tests TC-zod pasan; `TransactionBuilder` sigue emitiendo sin cambios.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-zod-ok | payload valido + estadoSII enum | safeParse | success | true |
| 2 | TC-zod-bad | payload valido + estadoSII 'foo' | safeParse | error en estadoSII | issues[0].path=['estadoSII'] |
| 3 | TC-zod-abs | payload sin estadoSII | safeParse | success | true |

### REQ-IMPROVE-03: `Alert` anuncia con `aria-live` segun variante

> **Que cambia**: los lectores de pantalla reciben los `Alert` de error de forma inmediata (assertive) y los info/success/warning sin interrumpir (polite); hoy todo es assertive implicito via `role="alert"`.
> **Por que**: WCAG 2.1 — interrumpir al usuario por un mensaje informativo es un defecto de a11y; el veredicto por severidad es el contrato correcto.

`Alert` MUST renderizar `aria-live="assertive"` cuando `variant="error"` y `aria-live="polite"` para `info|success|warning` (y default), mas `aria-atomic="true"` en todos los casos. Los atributos computados MUST declararse ANTES del spread `{...props}` para que un consumidor pueda override. El resto del contrato del componente (variantes, icon, dismissible) MUST permanecer sin cambios.

**Actor**: user (usuarios de tecnologia asistiva)
**Layers**: frontend (ui primitive)

<details><summary>Scenarios de validacion</summary>

#### Scenario: error assertive
- **GIVEN** `<Alert variant="error">`
- **WHEN** se monta
- **THEN** el elemento raiz tiene `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"`

#### Scenario: resto polite
- **GIVEN** `<Alert variant="info|success|warning">` (y sin variant — default info)
- **WHEN** se monta
- **THEN** `aria-live="polite"` y `aria-atomic="true"`

#### Scenario: override del consumidor
- **GIVEN** `<Alert variant="info" aria-live="assertive">`
- **WHEN** se monta
- **THEN** gana el valor del consumidor (`assertive`) — el spread va despues

</details>

#### Acceptance
**El usuario puede verificar que funciona**: inspeccionar el DOM de un Alert de error → `aria-live="assertive"`; de info → `polite`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-a11y-err | Alert error | render | atributos aria | aria-live=assertive, aria-atomic=true |
| 2 | TC-a11y-rest | Alert info/success/warning/default | render | atributos aria | aria-live=polite, aria-atomic=true |
| 3 | TC-a11y-ovr | Alert info + aria-live prop | render | override respetado | aria-live=assertive |

### REQ-PRESERVE-01: Zero behavior change en runtime

> **Que cambia**: nada visible — este REQ protege lo existente mientras B4 agrega tests y B1/B3 tocan contrato/a11y.
> **Por que**: mejorar cobertura rompiendo comportamiento no es mejora (DET-7 — regression obligatoria).

Las suites existentes (~1489 tests verdes al cierre de JOR-059) MUST seguir verdes sin modificar assertions existentes. Los componentes tocados por B4 MUST conservar su comportamiento de produccion (solo se agregan tests). Los 2 consumidores de `Alert` y el consumidor de `facturaIssueInputSchema` (`TransactionBuilder.tsx:169`) MUST seguir funcionando sin ajustes.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: regression global
- **GIVEN** el arbol con todos los cambios de S1+S2
- **WHEN** `npx vitest run` (suite completa)
- **THEN** 0 fails; los tests preexistentes no se modificaron (salvo adiciones)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npx vitest run` verde; `git diff` de archivos de produccion se limita a `alert.tsx`, `lib/schemas/ventas.ts` y (si aplica) `types/api.gen.ts` regenerado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-reg | arbol final | `vitest run` | suite completa | 0 fails, sin assertions modificadas |

## Non-functional requirements

No aplican — mejora de cobertura, contrato y a11y sin impacto en performance/scale.

## Changes

### Modified: `front/jormat-front/src/lib/schemas/ventas.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `facturaIssueInputSchema` | sin `estadoSII` | `estadoSII: estadoSIISchema.optional()` | alinear con `FacturaInputDto` backend (DEC-002) |

### Modified: `front/jormat-front/src/components/ui/alert/alert.tsx`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| atributos aria del div raiz | `role="alert"` solo (assertive implicito global) | + `aria-live` computado por variante + `aria-atomic="true"`, antes del spread | anuncios por severidad (WCAG 2.1) preservando override |

### Modified: `front/jormat-front/src/types/api.gen.ts` (regenerado, best-effort)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `FacturaInputDto` | stale — sin `estadoSII` | regenerado via `npm run generate:api-types` (API arriba) | espejo informativo del contrato; si docker no disponible → backlog `should` |

### Added: tests

| File | Purpose |
|------|---------|
| `lib/schemas/ventas.test.ts` (ampliar o crear) | TC-zod (REQ-IMPROVE-02) |
| `components/ui/alert/alert.test.tsx` (ampliar) | TC-a11y (REQ-IMPROVE-03) |
| tests de branches en `LineItemsTable`, `TransactionBuilder.*`, `items/list/ItemsTable`, `ui/switch`, `ui/avatar` (ampliar existentes) | TC-cov (REQ-IMPROVE-01) |

## Tasks

### Session 1 — B1 contrato Zod + B3 a11y Alert [tipo: auto] [tier: T2]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `estadoSII: estadoSIISchema.optional()` a `facturaIssueInputSchema` + tests TC-zod (3 escenarios) | REQ-IMPROVE-02 | developer | — | front/jormat-front/src/lib/schemas/ventas.ts, front/jormat-front/src/lib/schemas/ventas.test.ts | TC-zod-ok/bad/abs verdes + suite de schemas verde | git revert del commit | DET-2, DET-8, RULE-global-001 | done | S1 |
| S1.T2 | `aria-live` por variante + `aria-atomic` en `Alert` (antes del spread) + tests TC-a11y (3 escenarios) | REQ-IMPROVE-03 | developer | — | front/jormat-front/src/components/ui/alert/alert.tsx, front/jormat-front/src/components/ui/alert/alert.test.tsx | TC-a11y-err/rest/ovr verdes + suites de consumidores (TransactionBuilder, SimulacionSiiBanner) verdes | git revert del commit | DET-2, DET-8, RULE-frontend-002 | done | S1 |
| S1.T3 | Regenerar `types/api.gen.ts` con API arriba (`npm run generate:api-types`); si docker no disponible: registrar backlog `should` y continuar | REQ-IMPROVE-02 | developer | S1.T1 | front/jormat-front/src/types/api.gen.ts | `FacturaInputDto` incluye `estadoSII?` en el .gen; typecheck del front verde | git checkout del archivo generado | DET-8, DET-16 | done | S1 |
| S1.T4 | Actualizar `jormat_docs/`: contrato ventas (estadoSII en payload de emision) + contrato a11y del Alert | REQ-IMPROVE-02, REQ-IMPROVE-03 | developer | S1.T1, S1.T2 | jormat_docs/api/README.md, jormat_docs/frontend/ (doc del ui kit si existe) | doc refleja el contrato nuevo; frontmatter valido | git revert del commit docs | RULE-global-005, DET-16 | done | S1 |
| S1.GATE | Gate S1: suites verdes (`vitest run`), quality review (DET-23 tier standard), commits granulares (DET-27), persistir session | REQ-PRESERVE-01 | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | — | `npx vitest run` 0 fails; TC-zod + TC-a11y registrados en ticket (DET-25) | — | DET-13, DET-20, DET-23, DET-25, DET-27 | done | S1 |

### Session 2 — B4 branch coverage ≥90 [tipo: auto] [tier: T2]

parallel_groups: [[S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Medir baseline por archivo: `vitest run --coverage` y extraer branches faltantes (linea a linea) de los 5 ofensores | REQ-IMPROVE-01 | researcher | — | — (solo lectura) | tabla de branches faltantes por archivo documentada en ticket | n/a (solo lectura) | DET-1, DET-2, DET-4 | done | S2 |
| S2.T2 | Tests de branches: `shared/builder/LineItemsTable` (56.57%) + `ventas/builder/TransactionBuilder` (66.29%) | REQ-IMPROVE-01 | developer | S2.T1 | front/jormat-front/src/components/shared/builder/LineItemsTable/LineItemsTable.test.tsx, front/jormat-front/src/components/ventas/builder/TransactionBuilder/*.test.tsx | branches de ambos archivos ≥90 o ignore justificado; suites verdes | git revert del commit | DET-7, DET-8, RULE-frontend-002 | done | S2 |
| S2.T3 | Tests de branches: `items/list/ItemsTable` (66.66%) + `ui/switch` + `ui/avatar` (66.66%) | REQ-IMPROVE-01 | developer | S2.T1 | front/jormat-front/src/components/items/list/ItemsTable/*.test.tsx, front/jormat-front/src/components/ui/switch/switch.test.tsx, front/jormat-front/src/components/ui/avatar/avatar.test.tsx | branches de los 3 archivos ≥90 o ignore justificado; suites verdes | git revert del commit | DET-7, DET-8, RULE-frontend-002 | done | S2 |
| S2.T4 | Verificacion global: `vitest run --coverage` exit 0, branches ≥90; si <90, iterar sobre el siguiente ofensor de la tabla S2.T1 | REQ-IMPROVE-01, REQ-PRESERVE-01 | reviewer | S2.T2, S2.T3 | — | TC-cov: exit 0, branches ≥90 global; TC-reg: 0 fails | — | DET-5, DET-13, RULE-testing-coverage-threshold-002 | done | S2 |
| S2.GATE | Gate S2: quality review (DET-23), TC-cov/TC-reg registrados (DET-25), commits (DET-27), persistir session → cierre | REQ-PRESERVE-01 | reviewer | S2.T4 | — | checklist de acceptance ejecutado con evidencia | — | DET-13, DET-20, DET-23, DET-25, DET-27 | done | S2 |

## Constraints

- RULE-testing-coverage-threshold-002: coverage global ≥90 en los 4 ejes (must) — es el driver de B4; el gate de S2.T4 lo verifica con corrida real.
- RULE-frontend-002: todo componente con test + story — los ofensores ya tienen ambos; solo se amplian tests (no se crean stories).
- RULE-global-005: revisar docs y tests antes de cerrar — S1.T4 cubre docs; tests son el nucleo del ticket.
- DEC-002: Zod es la fuente del contrato front→back — B1 restaura esa invariante; `api.gen.ts` es espejo, no fuente.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Docker + API local (puerto 4001 en esta maquina) | internal | solo para S1.T3 (regenerar `api.gen.ts` desde `/docs-json`) | si no disponible: task se difiere a backlog `should`, no bloquea |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Branches inalcanzables impiden llegar a 90 solo con tests (H2) | medium | S2 se alarga o requiere decision | S2.T1 mide primero; ignore `/* v8 ignore */` justificado permitido (DEC del exec summary); si requiere refactor → detener y escalar al dev (DET-12) |
| Cambio de `aria-live` altera tests snapshot/axe existentes de consumidores | low | fixes menores en tests | S1.T2 corre suites de los 2 consumidores como parte de su validation |
| `api.gen.ts` regenerado trae drift adicional no relacionado (otros endpoints cambiados en el backend desde la ultima regen) | medium | diff mas grande de lo esperado | revisar diff del archivo generado; si excede `estadoSII`, reportar al dev antes de commitear (scope discovery) |

## Open questions

Ninguna — las decisiones del intake (B1 contrato-solo) y del design (ignores justificados, api.gen best-effort) quedaron cerradas abajo.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: B1 contrato-solo (sin control en builder)
- **Contexto**: el request pedia evaluar exponer un control de `estadoSII` en el builder o dejarlo solo en el contrato.
- **Drivers**: semantica del dominio (estadoSII es veredicto del SII, no input del usuario); B4 (UI nueva sumaria branches sin cubrir).
- **Opcion elegida**: solo contrato — `estadoSII: estadoSIISchema.optional()` en el schema de emision.
- **Alternativas**: (B) select en el builder para forzar estados del mock — descartada: modela mal el dominio; si se necesita para demo, es ticket aparte.
- **Consecuencias**: gana alineacion sin scope creep; el campo queda latente hasta que un flujo lo envie.
- **Session**: design (pre-S1), decidida por el dev.

### DEC-LOCAL-02: `aria-live` computado antes del spread
- **Contexto**: donde colocar los atributos aria en `alert.tsx` respecto de `{...props}`.
- **Drivers**: permitir override por consumidor sin romper el default por variante.
- **Opcion elegida**: `role`, `aria-live`, `aria-atomic` declarados antes del spread.
- **Alternativas**: despues del spread (fuerza el default, impide override) — descartada.
- **Consecuencias**: REQ-IMPROVE-03 scenario 3 (override) es testeable y garantizado.
- **Session**: design (pre-S1).

### DEC-LOCAL-03: ramas inalcanzables → `/* v8 ignore */` justificado, no refactor
- **Contexto**: H2 (~partial) — puede haber branches que ningun test alcance.
- **Drivers**: zero behavior change (REQ-PRESERVE-01); scope del ticket es tests.
- **Opcion elegida**: ignore con comentario justificando la inalcanzabilidad; reviewer valida cada uno.
- **Alternativas**: refactor menor para hacer testeable — descartada como default (scope creep); disponible via escalamiento si un caso lo amerita.
- **Consecuencias**: gana velocidad y seguridad; riesgo de abuso mitigado por review del gate.
- **Session**: design (pre-S1).

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-IMPROVE-01/02/03 pasan (TC-cov, TC-zod, TC-a11y)
- [x] **Tests**: `npx vitest run` 0 fails; `npx vitest run --coverage` exit 0 con branches ≥90
- [x] **Rules**: RULE-testing-coverage-threshold-002 verificada con corrida real; RULE-frontend-002 sin regresion
- [x] **Integration**: consumidores de `Alert` y `facturaIssueInputSchema` sin ajustes (REQ-PRESERVE-01)
- [x] **Docs**: `jormat_docs/` actualizada (contrato ventas + a11y Alert) o `n/a + razon` registrado
- [x] **Regression**: sin assertions preexistentes modificadas; diff de produccion limitado a los 2 archivos + regen
