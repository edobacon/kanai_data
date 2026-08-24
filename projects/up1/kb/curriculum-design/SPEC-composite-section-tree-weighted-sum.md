---
id: SPEC-curriculum-design-composite-section-tree-weighted-sum
project: up1
module: curriculum-design
status: done
ticket: TICKET-009
external_refs:
  - UPONE-1035
meta_specs: []
created: '2026-05-04'
updated: '2026-05-04'
tags: [layout, composite-section-tree, evaluation, validation, ui-feedback]
depends_on:
  - SPEC-curriculum-design-academic-activity-list
capabilities:
  - CAP-CUR-019
---

# Validacion sumativa de ponderaciones en `CompositeSectionTree`

## Purpose

Agregar al componente generico `CompositeSectionTree` una validacion visual opcional ("ponderacion sumativa"): cuando esta activa, cada nodo padre con hijos debe cumplir `metric(padre) === sum(metric(hijos))` (con tolerancia para floats). Si no cumple, el badge metric del padre se renderiza con borde rojo + icono warning + tooltip explicativo. Caso de uso real: tab "Componentes de evaluacion" del detail de Programa de asignatura, donde "Nota Final" debe sumar 100% entre sus sub-componentes.

La validacion es **solo feedback visual** sobre el estado actual del arbol — NO bloquea save, NO dispara errores en backend. Activable via prop, default `false` para no afectar consumidores actuales (LearningOutcome, Session, Content, Bibliography).

## Requirements

### REQ-01: Activacion opt-in

El sistema MUST permitir activar la validacion sumativa via prop booleana `validateWeightedSum` en `CompositeSectionTreeElement`. Cuando la prop es `false` (default) o ausente, el componente se comporta exactamente como antes (zero regression).

**Actor**: layout config author (JSON)
**Layers**: frontend (component)

#### Scenario: prop ausente
- **GIVEN** un layout que usa `composite-section-tree` sin `validateWeightedSum`
- **WHEN** el usuario abre la vista
- **THEN** el tree se renderiza identico al estado pre-feature (sin bordes rojos, sin iconos de warning, sin tooltips de validacion)

#### Scenario: prop `false` explicito
- **GIVEN** layout con `"validateWeightedSum": false`
- **WHEN** el componente se monta
- **THEN** el componente NO ejecuta el calculo de validacion (no costo CPU innecesario)

#### Scenario: prop `true`
- **GIVEN** layout con `"validateWeightedSum": true`
- **WHEN** el componente se monta
- **THEN** el componente calcula `invalidNodes` y aplica el visual de error a los padres invalidos

#### Acceptance
**El usuario puede verificar que funciona**: en el layout `default_AcademicActivity_view.json`, alternar `validateWeightedSum` entre `true`/`false` en el bloque EvaluationComponent y observar la diferencia (con `true`: borde rojo si hay desbalance; con `false`: nunca borde).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Default off | Layout sin la prop | Renderizar tree con datos invalidos a proposito (suma != padre) | No hay clase `--invalid` ni icono warning | DOM identico al estado pre-feature |
| 2 | On + datos validos | `validateWeightedSum: true` + nodos consistentes (suma === padre) | Renderizar | Cero nodos marcados como invalidos | Sin badges rojos |
| 3 | On + datos invalidos | `validateWeightedSum: true` + un padre con suma de hijos != metric | Renderizar | Solo el badge del padre tiene clase `--invalid` | Hijos sin marcar; nieto-de-otro-padre sin marcar |

### REQ-02: Validacion recursiva por padre

El sistema MUST validar cada padre con hijos contra la suma de sus **hijos directos** (no recursiva — los nietos validan contra su propio padre, no contra el abuelo). La validacion ignora hojas (nodos sin hijos).

**Actor**: system
**Layers**: frontend (logic puro — util)

#### Scenario: jerarquia de 3 niveles
- **GIVEN** arbol: `A (metric=100) → B (metric=60) [→ B1 (40), B2 (20)], C (metric=40)`
- **WHEN** el sistema calcula `invalidNodes`
- **THEN** A se valida contra `B + C = 100` → valido. B se valida contra `B1 + B2 = 60` → valido. C es hoja → no se valida.
- **AND** `invalidNodes = Set()`

#### Scenario: padre con suma incorrecta
- **GIVEN** arbol: `A (metric=100) → B (metric=70), C (metric=20)` (suma hijos = 90)
- **WHEN** el sistema calcula
- **THEN** A es invalido (`90 !== 100`). B y C son hojas → no se validan.
- **AND** `invalidNodes = Set([A.id])`

#### Scenario: nieto invalido no propaga al abuelo si el padre es consistente
- **GIVEN** arbol: `A (10) → B (10) [→ B1 (3), B2 (3)]` (B suma hijos = 6, no 10. A suma hijos = 10, valido).
- **WHEN** el sistema calcula
- **THEN** B es invalido. A NO es invalido (porque A se valida contra `B = 10`, no contra los nietos).
- **AND** `invalidNodes = Set([B.id])`

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Arbol valido 3 niveles | A=100 (B=60 [B1=40, B2=20], C=40) | computeInvalidNodes | Set vacio | `Set()` |
| 2 | Padre invalido | A=100 (B=70, C=20) | computeInvalidNodes | A en el set | `Set([A.id])` |
| 3 | Nieto invalido no contamina abuelo | A=10 (B=10 [B1=3, B2=3]) | computeInvalidNodes | Solo B en el set | `Set([B.id])` |
| 4 | Multiple invalidos | A (root invalido) y B (nested invalido) | computeInvalidNodes | Ambos en el set | `Set([A.id, B.id])` |
| 5 | Hoja sin hijos | A (metric=42) sin children | computeInvalidNodes | Set vacio | `Set()` |

### REQ-03: Tolerancia para floats

El sistema MUST aceptar tolerancia configurable via prop `weightedSumTolerance: number` (default `1e-6`). Un padre se considera valido si `Math.abs(padre.metric - sum(hijos)) <= tolerancia`.

**Actor**: layout config author
**Layers**: frontend (logic)

#### Scenario: drift de coma flotante
- **GIVEN** padre `metric=0.3`, hijos `[0.1, 0.1, 0.1]`. (En JS `0.1 + 0.1 + 0.1 === 0.30000000000000004`).
- **WHEN** se calcula con tolerancia default `1e-6`
- **THEN** el padre es valido (diff `~4e-17` < tolerancia)

#### Scenario: tolerancia custom estricta
- **GIVEN** layout con `weightedSumTolerance: 0`
- **WHEN** se calcula con `0.1 + 0.1 + 0.1 vs 0.3`
- **THEN** el padre es **invalido** (la diff es > 0)

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Drift acepta default | A=0.3 (0.1, 0.1, 0.1) | computeInvalidNodes(tree, 1e-6) | Vacio | `Set()` |
| 2 | Tolerancia custom 0.01 | A=100 (49.995, 50) | computeInvalidNodes(tree, 0.01) | Vacio (diff = 0.005) | `Set()` |
| 3 | Tolerancia custom 0 | A=0.3 (0.1, 0.1, 0.1) | computeInvalidNodes(tree, 0) | A invalido | `Set([A.id])` |

### REQ-04: Hijos sin metric numerico cuentan como 0

El sistema MUST tratar hijos cuyo `metric` es `null`, `undefined`, string vacio, o cualquier valor no convertible a numero finito como **`0`** en la suma. Esto puede provocar que el padre sea invalido (cuando el hijo "deberia" tener un valor real) — comportamiento intencional.

**Actor**: system
**Layers**: frontend (logic)

#### Scenario: un hijo con metric null
- **GIVEN** padre `metric=100`, hijos `[40, null, 60]`
- **WHEN** se calcula
- **THEN** suma efectiva = `40 + 0 + 60 = 100` → valido

#### Scenario: un hijo con metric null y otros que ya suman el total
- **GIVEN** padre `metric=100`, hijos `[100, null]`
- **WHEN** se calcula
- **THEN** suma = `100 + 0 = 100` → valido (el `null` "no aporta")

#### Scenario: un hijo con metric string ""
- **GIVEN** padre `metric=100`, hijos `[100, ""]`
- **WHEN** se calcula
- **THEN** suma = `100`, padre valido

#### Scenario: padre con metric null
- **GIVEN** padre `metric=null`, hijos `[40, 60]`
- **WHEN** se calcula
- **THEN** padre tratado como `0`. Suma hijos = `100`. `0 !== 100` → padre **invalido**

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Hijo null | A=100 (40, null, 60) | computeInvalidNodes | Vacio | `Set()` |
| 2 | Hijo string vacio | A=100 (100, "") | computeInvalidNodes | Vacio | `Set()` |
| 3 | Padre null con hijos | A=null (40, 60) | computeInvalidNodes | A invalido | `Set([A.id])` |
| 4 | Hijo NaN/string no-numerico | A=100 ("abc", 100) | computeInvalidNodes | Vacio (`abc` → 0) | `Set()` |

### REQ-05: Visual de error

El sistema MUST renderizar el siguiente visual sobre el badge metric (`.cst-node__metric`) de cada padre invalido:

1. Clase modifier `cst-node__metric--invalid` que aplica borde solido rojo (token `--bs-danger` o equivalente). Suficiente para satisfacer el requirement literal del usuario ("borde rojo").
2. Icono `bi-exclamation-triangle-fill` (Bootstrap Icons) inline al lado del valor, color `var(--bs-danger)`.
3. Atributo `title` (tooltip nativo) con texto: `"Esperado: {expected}{suffix}, suma actual: {actual}{suffix}"`. `expected` = `metric` del padre. `actual` = suma efectiva de hijos. `suffix` = `metricSuffix` del componente (ej. `%`).

El visual MUST aplicarse **solo** al nodo padre invalido — los hijos no se marcan, ni se aplica recursividad ascendente.

**Actor**: end user (visual feedback)
**Layers**: frontend (component + CSS)

#### Scenario: badge invalido
- **GIVEN** padre invalido con `metric=100`, suma hijos `90`, suffix `%`
- **WHEN** el usuario ve el tree
- **THEN** el badge muestra `100%` con borde rojo + icono ⚠
- **AND** al hover el tooltip dice `"Esperado: 100%, suma actual: 90%"`

#### Scenario: badge valido (otro consumidor)
- **GIVEN** componente con `validateWeightedSum: false` y un padre con suma incorrecta
- **WHEN** el usuario ve el tree
- **THEN** sin borde rojo, sin icono, sin tooltip — comportamiento legacy preservado

#### Acceptance
**El usuario puede verificar que funciona**: abrir el detail del programa "Ecuaciones Diferenciales" en UPU, ir al tab "Evaluacion" → si el seed ya cumple `100%` ver el badge sin warning. Modificar `weight` de un sub-componente desde el form de edit del componente (no del tree) para inducir desbalance temporal y observar el borde rojo + tooltip.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Render visual invalido | Padre invalido | Render con `validateWeightedSum=true` | Badge tiene clase `--invalid` + icon present + title attribute | Borde rojo + ⚠ + tooltip texto correcto |
| 2 | Suffix se respeta en tooltip | metric=100, suma=90, suffix="%" | Render | Tooltip texto | `"Esperado: 100%, suma actual: 90%"` |
| 3 | Suffix vacio | metric=10, suma=8, suffix="" | Render | Tooltip texto | `"Esperado: 10, suma actual: 8"` |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Calculo de `invalidNodes` no debe degradar render percibido | Tiempo de calculo sobre tree de 100 nodos | < 5ms (util O(N) en un solo pass) |
| Accessibility | Error visible no solo por color | Contraste + alternativa no-color | Cumple WCAG 2.1 AA: borde + icono + tooltip (color es complementario, no unico signal) |

## Artifacts

### Component props (extension)

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `validateWeightedSum` | `boolean` | `false` | no | Activa la validacion sumativa de ponderaciones |
| `weightedSumTolerance` | `number` | `1e-6` | no | Epsilon de comparacion para evitar falsos positivos por floats |

Props existentes (referencia, no se modifican): `metricField`, `metricSuffix`, `recordType`, `relationName`, `codeField`, `secondaryField`, `enableEdit`, `enableViewModal`, etc.

### Util signature

```ts
// mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.ts
import type { CompositeNode } from './CompositeSectionTree.types'

export interface InvalidDetail {
  expected: number   // metric del padre coercionado a numero (null → 0)
  actual: number     // sum(hijos) coercionado a numero
}

export function computeInvalidNodes(
  tree: CompositeNode[],
  tolerance: number = 1e-6
): Map<string, InvalidDetail>
```

Decision: retornar `Map<id, {expected, actual}>` en lugar de solo `Set<id>` — el componente necesita los valores para el tooltip. La sobrecarga es minima.

### CSS additions

```css
.cst-node__metric--invalid {
  border: 1px solid var(--bs-danger, #dc3545);
  /* mantener padding/radius del .cst-node__metric base */
}

.cst-node__metric-warning {
  flex: 0 0 auto;
  margin-left: 4px;
  color: var(--bs-danger, #dc3545);
  font-size: 14px;
}
```

### Layout config (activacion en EvaluationComponent)

Cambio en `mods/curriculum-design/config/layouts/default_AcademicActivity_view.json`, dentro del bloque `composite-section-tree` de "Componentes de evaluación":

```json
{
  "type": "composite-section-tree",
  "...": "...",
  "metricField": "weight",
  "metricSuffix": "%",
  "validateWeightedSum": true
}
```

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session |
|---|------|-------|------------|-------|------------|--------|---------|
| 1 | Crear util `computeInvalidNodes` + test unitario vitest cubriendo REQ-01..04 (15+ casos) | developer | — | `mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.ts` (nuevo), `validateWeightedSum.spec.ts` (nuevo) | `npm run test --workspace=@uplanner/layout-engine -- validateWeightedSum` | pending | — |
| 2 | Extender `useCompositeSectionTree` para exponer `invalidNodes: ComputedRef<Map<string, InvalidDetail>>`. Solo se calcula cuando se llama (no cambiar firma de inputs — agregar opcion `validateWeightedSum?: Ref<boolean>` y `weightedSumTolerance?: Ref<number>`). | developer | #1 | `useCompositeSectionTree.ts` | type-check + smoke storybook | pending | — |
| 3 | Agregar props `validateWeightedSum` y `weightedSumTolerance` a `CompositeSectionTreeElement`. Pasar a composable. Pasar `invalidNodes` (o `invalidDetail` por nodo) a `CompositeSectionNode` via prop. | developer | #2 | `CompositeSectionTreeElement.vue` | type-check | pending | — |
| 4 | En `CompositeSectionNode`: cuando `invalidDetail` esta presente para el nodo, render con clase `--invalid` + icono `bi-exclamation-triangle-fill` + atributo `title` con tooltip. CSS modifier nuevo. | developer | #3 | `CompositeSectionTreeElement.vue` (sub-component + style block) | manual: caso valido + invalido en storybook o suite | pending | — |
| 5 | Activar `"validateWeightedSum": true` en el bloque EvaluationComponent del layout default `default_AcademicActivity_view.json`. Run `npm run sync` desde root del up1. | developer | #4 | `mods/curriculum-design/config/layouts/default_AcademicActivity_view.json` | sync EXIT=0 | pending | — |
| 6 | Validacion manual end-to-end con seed UV (1 EvalComp con 7 hijos sumando 100) + reproducir caso invalido. Capturar screenshots `ticket-009-fase4-evalcomp-valid.png` + `ticket-009-fase4-evalcomp-invalid.png` en el subdir del ticket. | reviewer | #5 | — | manual + screenshots | pending | — |

### Task contract

```
Task #1: Crear util computeInvalidNodes
- source_ref: REQ-01, REQ-02, REQ-03, REQ-04
- agent: developer
- files: mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.ts, validateWeightedSum.spec.ts
- precondition: leer CompositeSectionTree.types.ts (CompositeNode signature)
- expected_output: util pura O(N) que retorna Map<id, {expected, actual}>. Test verde con 15+ casos (todos los scenarios de REQ-01..04).
- validation: vitest (todos los casos pasan)
- rollback: rm de los 2 archivos nuevos. Cero impacto en componente existente.
- rules: [1, 2, 8, 11]
```

```
Task #2: Composable expone invalidNodes
- source_ref: REQ-01
- agent: developer
- files: useCompositeSectionTree.ts
- precondition: T1 mergeada
- expected_output: composable con `invalidNodes` computed; default off no costo. Tipos correctos.
- validation: type-check del workspace layout-engine
- rollback: revertir el archivo (es change aditivo no-breaking).
- rules: [5, 8, 10, 16]
```

```
Task #3: Props nuevas en element
- source_ref: REQ-01, REQ-03
- agent: developer
- files: CompositeSectionTreeElement.vue (defineElement props)
- precondition: T2 mergeada
- expected_output: 2 props nuevas declaradas con defaults. Pasadas al composable. Pasadas al sub-componente CompositeSectionNode.
- validation: type-check + storybook smoke (renderiza igual que antes con default)
- rollback: revertir archivo. Default false preserva comportamiento.
- rules: [5, 8, 10]
```

```
Task #4: Render visual error
- source_ref: REQ-05
- agent: developer
- files: CompositeSectionTreeElement.vue (sub-component CompositeSectionNode + style block)
- precondition: T3 mergeada
- expected_output: padre con invalidDetail aplica clase --invalid, icono visible, tooltip nativo correcto. Hijos sin marcar.
- validation: manual con storybook o suite (caso valido + invalido)
- rollback: revertir archivo.
- rules: [5, 7, 11]
```

```
Task #5: Activar prop en layout default
- source_ref: REQ-01 (acceptance)
- agent: developer
- files: mods/curriculum-design/config/layouts/default_AcademicActivity_view.json
- precondition: T4 mergeada y sync funcional
- expected_output: bloque EvaluationComponent del layout tiene `"validateWeightedSum": true`. Sync EXIT=0. Layout en BD actualizado.
- validation: `npm run sync` exit code 0; query a `up1_layen_layout` confirma campo persistido.
- rollback: quitar la prop del JSON + sync.
- rules: [3 (mods sync rule), 8, 16]
```

```
Task #6: Validacion manual + evidencia
- source_ref: REQ-01 a REQ-05 (acceptance)
- agent: reviewer
- files: tickets/ticket-009.screenshots/ticket-009-fase4-evalcomp-valid.png, ticket-009-fase4-evalcomp-invalid.png
- precondition: T5 mergeada, suite corriendo en UPU
- expected_output: 2 screenshots: caso valido (7 hijos sumando 100, sin badge rojo en padre) + caso invalido (suma != 100, padre con borde rojo + tooltip).
- validation: review visual del usuario
- rollback: N/A (solo evidencia)
- rules: [7, 13]
```

## Constraints

- **RULE-mods-001/002**: NUNCA modificar archivos synced en `up1/layout/src/modsComponents/`. Toda edicion va en `mods/curriculum-design/modsComponents/CompositeSectionTree/`.
- **RULE-mods-003**: `npm run sync` despues de cualquier cambio en mods.
- **RULE-mods-014**: Si se crean/modifican componentes Vue, usar atoms del layout-library (Icon ya esta en uso).
- **DECISION-mod-unico-curriculum-design**: el componente vive solo en este mod.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `CompositeSectionTree` (existente) | internal | Componente del mod creado en Session 4 | Bajo — la extension es opt-in |
| `bi-exclamation-triangle-fill` | external (Bootstrap Icons) | Icono ya disponible en el atom Icon | Cero — ya hay precedente de uso |
| Token `--bs-danger` | external (Bootstrap 5) | Color base de Bootstrap | Cero — ya esta cargado |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Otros consumidores se rompen al pasar la prop por error | low | medium | Default `false` + name explicito (`validateWeightedSum`). Code review verifica que solo EvaluationComponent la activa. |
| Falsos positivos por floats en seeds reales | medium | low | Tolerancia default `1e-6` cubre drift estandar. Seeds usan enteros. |
| Tooltip nativo es feo en Mac/Linux | low | low | Usar `title` en MVP. Si UX no es suficiente, escalar a tooltip atom (deuda futura, no bloquea SP2). |
| El usuario edita weights uno por uno y entre cambios el tree queda invalido temporalmente | high | low | **Esto es deseado** — el feedback visual le indica que aun no completo el ajuste. No es un bug. |

## Open questions

(ninguna abierta — todas las decisiones se tomaron en Session 8)

## Decisions

### DEC-LOCAL-01: Activacion via prop boolean explicita (no inferida)

- **Contexto**: el feature debe ser opt-in. ¿Prop explicita o inferida desde tener `metricField` numerico?
- **Drivers**: zero regression para 5+ consumidores actuales del componente que no necesitan validacion (LO, Bib, Session, Content, etc.). Claridad para reviewers de layouts JSON.
- **Opcion elegida**: prop boolean explicita `validateWeightedSum`.
- **Alternativas**: inferir desde `metricField` — descartada porque cambia comportamiento de consumidores existentes (LearningOutcome no debe validar suma de RA padre vs hijos).
- **Consecuencias**: una prop mas en la API. Cero risk de regresion.
- **Session**: Session 8 (TICKET-009)

### DEC-LOCAL-02: Validacion solo de hijos directos (no recursiva ascendente)

- **Contexto**: `metric(padre) === sum(hijos)`. ¿Que pasa si un nieto desbalancea? ¿Se marca el abuelo?
- **Drivers**: claridad del feedback. Si el abuelo se marcara cuando el padre intermedio tambien esta mal, la UI confunde al usuario sobre donde corregir.
- **Opcion elegida**: cada padre se valida contra sus hijos directos solamente. El abuelo solo se valida contra el padre intermedio (su hijo directo). Si el padre intermedio tiene metric=10 y sus propios hijos (nietos) suman 8, solo el padre intermedio se marca; el abuelo (que ve metric=10 del padre) sigue valido si el resto cuadra.
- **Alternativas**: validacion recursiva ascendente (descartada — propaga ruido visual).
- **Consecuencias**: el usuario siempre tiene un solo nivel donde mirar para arreglar.
- **Session**: Session 8

### DEC-LOCAL-03: Hijos sin metric numerico cuentan como 0

- **Contexto**: si un hijo tiene `metric=null` (no se le asigno peso aun), ¿como afecta la suma?
- **Drivers**: simplicidad + senalizacion clara. Si un hijo "deberia" tener weight pero no tiene, el padre quedara invalido — eso es correcto, fuerza al usuario a completar.
- **Opcion elegida**: `null`/no-numerico → `0` en la suma.
- **Alternativas**:
  - "Marcar al padre como invalid con tooltip diferente (hijos incompletos)" — descartada por complicar el modelo (2 estados de error en lugar de 1).
  - "Ignorar hijos sin metric en la suma" — descartada porque el padre podria parecer valido por accidente cuando le faltan hijos sin peso.
- **Consecuencias**: el comportamiento es predecible y estricto. La UI fuerza a completar pesos.
- **Session**: Session 8

### DEC-LOCAL-04: Visual con 3 capas (borde + icono + tooltip)

- **Contexto**: el usuario pidio "borde rojo". ¿Suficiente?
- **Drivers**: WCAG 2.1 AA — el color por si solo no es signal suficiente. Tooltip da informacion accionable (cuanto falta o sobra).
- **Opcion elegida**: borde rojo + icono `bi-exclamation-triangle-fill` + tooltip CSS-puro theme-aware (ver DEC-LOCAL-07).
- **Alternativas**:
  - Solo borde — descartada (a11y).
  - Borde + tooltip sin icono — descartada (mas dificil de detectar al escanear visualmente).
- **Consecuencias**: cumple a11y y da informacion concreta.
- **Session**: Session 8

### DEC-LOCAL-05: Default `weightedSumTolerance: 0.01` (no `1e-6`)

- **Contexto**: la prop tiene default. ¿1e-6 (matematicamente estricto) o 0.01 (operativamente permisivo)?
- **Drivers**: weights legacy v2.2 frecuentemente tienen 2 decimales (ej. `33.33 + 33.33 + 33.34 = 100`). Con `1e-6` el drift de display vs storage daria falsos positivos. Con `0.01` se cubren los casos comunes sin perder precision util (errores reales >1 punto porcentual siguen siendo detectados).
- **Opcion elegida**: default `0.01`. Configurable a `0` (estricto) o cualquier otro valor por consumidor.
- **Alternativas**:
  - `1e-6` (descartada, demasiado estricta para % con 2 decimales).
  - `0.001` (descartada, no cubre el caso `33.34 vs 33.33`).
- **Consecuencias**: layouts JSON quedan limpios sin override (eliminado `weightedSumTolerance: 0.01` de los 2 layouts default tras este cambio). Tests actualizados — todos verde con el nuevo default.
- **Session**: Session 8

### DEC-LOCAL-06: Tooltip placement `left` (no `top`)

- **Contexto**: tooltip top default sufre clipping con el borde derecho del viewport cuando el tree esta cerca del edge.
- **Drivers**: el badge metric vive al final del row (alineado a la derecha en `actions`). En viewports angostos (laptop), `top` saca al tooltip parcialmente del viewport. `left` usa el espacio horizontal disponible (siempre hay row width hacia la izquierda).
- **Opcion elegida**: tooltip a la izquierda del badge, flecha apuntando a la derecha (`border-left-color: var(--up1-text-primary)`).
- **Alternativas**:
  - `top` (descartada, clipping en viewports angostos).
  - `bottom` (descartada, mismo problema en filas inferiores cerca del fold).
  - Auto-flip via JS (descartada, complejidad innecesaria con CSS-puro).
- **Consecuencias**: tooltip siempre visible. Limita el largo del mensaje al espacio horizontal disponible — actualmente cabe ("Esperado: X%, suma actual: Y%").
- **Session**: Session 8

### DEC-LOCAL-07: Tooltip CSS-puro (no atom Tooltip)

- **Contexto**: el atom `Tooltip` con `variant: 'dark'` rompe contraste en modo dark de la app (white-on-white). Detectado en validacion manual.
- **Drivers**: bug del atom (BUG-platform-010) — sus tokens `--up1-tooltip-dark-bg/-color` no flipean al cambiar de tema. Reusar el patron del badge `bg-secondary` que ya aplica el flip correcto via `--up1-text-primary` + `--up1-text-inverse`.
- **Opcion elegida**: tooltip CSS-puro via `::before`/`::after` con `data-cst-tooltip` attribute. Triggered por `:hover` y `:focus` (a11y: el span trigger es `tabindex=0` + tiene `aria-label` con el mensaje completo para screen readers, ya que pseudo-elementos no son accesibles).
- **Alternativas**:
  - Atom Tooltip variant `dark` — descartada (BUG-platform-010).
  - Atom Tooltip variant `light` — descartada (sufre el mismo bug invertido en dark).
  - Variant nueva `auto` para el atom — descartada (requiere PR a plataforma, fuera del scope del mod).
  - `title` HTML nativo — descartada (no se mostraba como tooltip en validacion manual; sospecha: ancestor con interferencia de pointer-events o overlay).
- **Consecuencias**: zero dependency en el atom Tooltip. Funciona correcto en light + dark. La logica del workaround queda documentada en BUG-platform-010 para que el equipo de plataforma corrija el atom.
- **Session**: Session 8

## Success metrics

(no aplica para feature visual menor)

## Technical reference

### Estructura del CompositeNode (referencia)

Definida en `CompositeSectionTree.types.ts`:

```ts
export interface CompositeNode {
  id: string
  name: string
  position: number
  parentId: string | null
  code?: string | null
  metric?: number | string | null   // <- esto se compara
  children: CompositeNode[]
  // ...
}
```

`metric` puede ser `number`, `string`, `null` o `undefined`. La util coerce a numero finito o `0`.

### Where hooks into existing code

- `CompositeSectionTreeElement.vue` linea ~625-637: `setup` invoca `useCompositeSectionTree({...})`. Aqui se pasan las nuevas props como `Ref`s.
- `CompositeSectionTreeElement.vue` linea ~159-322: el sub-componente `CompositeSectionNode` recibe el `node`. Aqui se inyecta `invalidDetail` (resolver el lookup del Map en el padre y pasarlo al child por prop).
- `CompositeSectionTreeElement.vue` linea ~284-286: el render del badge metric (`h(Text, { class: 'cst-node__metric' }, ...)`). Aqui se aplica conditionally la clase modifier + se renderiza el icono adyacente + se setea `title`.
- CSS scope global (no scoped) — el modifier `.cst-node__metric--invalid` va en el mismo `<style>` block.

### Layout JSON consumer

[default_AcademicActivity_view.json](../../../up1/mods/curriculum-design/config/layouts/default_AcademicActivity_view.json), bloque "Componentes de evaluación" (`type: "composite-section-tree"`, recordType `EvaluationComponent`).

## Rules discovered

(se llena en ejecucion)

## Bugs found

- [BUG-platform-010](../../bugs/platform/bug-platform-010.md): atom Tooltip rompe contraste en modo dark (white-on-white). Workaround aplicado: tooltip CSS-puro theme-aware. Ver DEC-LOCAL-07.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..05 pasan via test (REQ-01..04) + validacion manual del usuario (REQ-05) confirmada Session 8
- [x] **Tests**: `validateWeightedSum.spec.ts` con **22 casos** verde
- [x] **NFRs**: util O(N) confirmado por inspeccion (1 pass DFS)
- [x] **Rules**: solo se modifica `mods/curriculum-design/`, sync ejecutado tras cada cambio, atoms reusados (Icon)
- [x] **Integration**: layouts `_view` + `_edit` activan la prop solo en EvaluationComponent — otros consumidores (LearningOutcome, Bibliography, Session, Content, CustomSection) intactos por default `false`
- [x] **Docs**: spec + ticket session 8 cubren la feature
- [ ] **Evidence**: screenshots en `ticket-009.screenshots/` (deferred — usuario valido visualmente sin capturar)
