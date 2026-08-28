---
id: TICKET-060
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1035
module: curriculum-design
autopilot: manual
---

# M2: enforzar server-side la suma ponderada de evaluaciones

> ⚠️ **OBSOLETO — superseded by [TICKET-061](ticket-061.md)**. Este trabajo (M2) se consolidó junto a los 3 gaps de unicidad en un solo ticket sobre UPONE-1260 (historia de este sprint), por compartir el mismo punto de enganche de validación de dominio. No ejecutar este ticket; el análisis quedó absorbido en TICKET-061. Nunca pasó de intake.

## Request

> Ticket externo: [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035) — Historia originadora del componente CompositeSectionTree (SP1, Finalizada). Épica: UPONE-1038 (Curriculum Design | Programa de asignatura).

Follow-up de compatibilidad MCP (`specs/mcp/13-mod-compatibility-guide.md`, **caso M2**). La regla "los pesos de los hijos de un EvaluationComponent deben sumar el peso del padre" se valida **solo en el frontend** (`CompositeSectionTree`, advisory — pinta rojo). El backend no la verifica → un cliente no-web (MCP, API) puede crear/publicar un programa con **pesos inválidos** y nada lo frena.

Objetivo: enforzar la regla **server-side** sin romper el armado incremental del árbol.

### Decisiones acordadas con el dev (pre-intake)

- **D-A** (single source): extraer el algoritmo puro a `mods/curriculum-design/logic/helpers/weightedSum.js` (ESM); el componente `validateWeightedSum.ts` lo wrappea. **Fallback** si el build del frontend no puede importar desde `logic/`: duplicar + test de paridad que falle si divergen.
- **D-B** (gatillo): validar al transicionar a un estado de **categoría `Published`** (leer `transition.toStatus.category`, NO hardcodear id). Estados previos (ToDo/InReview) NO exigen árbol válido (se está armando).
- **D-C** (MCP): incluir query read-only `validateActivityEvaluations(activityId)` que devuelve los nodos inválidos (esperado vs suma), para que un cliente chequee antes de publicar.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (endurecer al backend una regla existente del frontend) |
| Tipo de cambio | single (mod curriculum-design: `logic/` resolver + helper, `modsComponents/` wrapper, nueva query GraphQL) |
| Módulo principal | curriculum-design |
| Módulos afectados | curriculum-design (backend resolver + frontend component). object-manager: solo `sync`/codegen para el typedef de la query nueva. |

## Triage

Complejidad estimada: **media** (M en la guía). El algoritmo es puro y portable; el riesgo está en *dónde* enganchar (no en el algoritmo) y en tocar una mutation crítica.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El algoritmo `computeInvalidNodes` es portable tal cual al backend (puro, sin Vue) | ✓ confirmada | `modsComponents/CompositeSectionTree/validateWeightedSum.ts` — función pura, solo usa `node.metric`/`children`/`id`; sin deps de Vue/Apollo |
| H2 | La regla es invariante de árbol completo → debe validarse al **publicar**, no por-write | ✓ confirmada | El árbol se arma incrementalmente (padre 100% antes que hijos); validar por-write bloquearía estados intermedios legítimos. Análisis multi-capa (resolver + frontend flow) |
| H3 | El hook correcto es `transitionActivityValidated` (check 9, gateado por categoría Published) | ✓ confirmada | `logic/activity.resolver.js:67-243`: cadena de 8 validaciones de gobernanza antes del `$transaction`; tiene `activityId`, puede cargar las CurricularSection del programa. No consulta hijos hoy |
| H4 | No hay resolver de dominio para secciones — van por CRUD genérico | ✓ confirmada | `logic/polymorphicUpdate.resolver.js` solo corrige el shape del audit; sin validación de negocio. La validación NO va acá (sería por-write) |
| H5 | D-A: el build del frontend puede importar el helper desde `logic/` (cross-layer) | ? inferida | A verificar en execute. Si falla → fallback: duplicar + test de paridad |

### Context found

- **Caso de la guía**: M2 (`specs/mcp/13-mod-compatibility-guide.md`) — tipo Seguridad, esfuerzo M. Anti-patrón explícito: "reglas de negocio solo en el frontend". Patrón pedido: regla de integridad en mutation de dominio que valida + emite evento (como `transitionActivityValidated`).
- **Algoritmo**: `validateWeightedSum.ts` — `computeInvalidNodes(tree, tolerance)`; campo de peso = `weight` en `rt__EvaluationComponent` (frontend lo mapea a `metric`); jerarquía por `CurricularSection.parentId`.
- **Rules del módulo**:
  - `RULE-curriculum-design-003/004` (**must**): las escrituras de workflow van por mutations `*Validated` — `transitionActivityValidated` es la correcta; este cambio la extiende.
  - `RULE-mods-003` (**must**): `npm run sync` tras agregar la query/typedef.
  - `RULE-dev-006` (**must**): tests + verificar arranque del servicio; regenerar codegen si se mergea.
- **Warnings**:
  1. ⚠️ **Tolerancia inconsistente**: el composable usa `1e-6` pero el SFC pasa `0.01` efectivo. El backend **debe usar 0.01** (o rechazaría 33.33+33.33+33.34=100 que la UI acepta). Unificar como constante compartida.
  2. ⚠️ Toca `transitionActivityValidated` (mutation crítica) → **tests de transición obligatorios** (DET-7): valid publica, inválido bloquea, estados previos no exigen árbol.
  3. ⚠️ Convención de peso (0–1 vs 0–100): el algoritmo es agnóstico (compara padre vs suma hijos), pero confirmar consistencia en datos.
- **Specs relacionados**: `SPEC-curriculum-design-composite-section-tree-weighted-sum` (TICKET-009, done — el componente frontend). Crear spec nuevo para el enforcement backend; referenciar el del componente.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama de épica `UPONE-1038-*` (épica de UPONE-1035, layer Programa de asignatura). Commits referencian `UPONE-1035` (DET-19). Confirmar nombre/base en execute |
| Base branch | `develop` (UPONE-1038 SP1 ya mergeada) |
| DB state | Sin cambio de schema. Solo nueva query GraphQL → `npm run sync` (codegen typedef) + restart object-manager |
| Services | object-manager (GraphQL :4000), suite |
| Test data | Activity con árbol de EvaluationComponent (válido e inválido) — el seed Univalle ya tiene un EvaluationComponent compuesto (NF + Q1..Q6 + EP) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| — | — | — | — | — | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Plan de sessions (preplanificacion)

> Esqueleto pendiente — lo produce `intake-explore`.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| — | (pendiente intake-explore) | — | — | — | — | — |

## Teaching — Intake

**Status**: ver frontmatter `teachings.intake` (`pending`).

## Teaching — Close

**Status**: ver frontmatter `teachings.close` (`pending`).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| (REQs se definen en design-improvement) | — | — | **NOT COVERED** |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Baseline: backend NO valida hoy | REQ-IMPROVE | manual | no | Estado actual | Transicionar a Published un Activity con pesos inválidos | Hoy: se permite (sin error) | — | — | pending | — | — |
| TC-2 | Bloqueo al publicar con pesos inválidos | REQ-IMPROVE | auto | no | Activity con árbol de evaluación inválido | `transitionActivityValidated` a estado Published | throw con error de dominio listando nodos inválidos | — | — | pending | — | — |
| TC-3 | Publicar con árbol válido sigue funcionando | REQ-PRESERVE | auto | no | Activity con pesos que suman bien | Transicionar a Published | Transición OK, sin error | — | — | pending | — | — |
| TC-4 | Estados intermedios no se bloquean | REQ-PRESERVE | auto | no | Árbol incompleto (en armado) | Crear/editar secciones; transicionar a InReview | No se exige árbol válido fuera de Published | — | — | pending | — | — |
| TC-5 | Query `validateActivityEvaluations` | REQ-IMPROVE | auto | no | Activity con árbol inválido | Llamar la query | Devuelve los nodos inválidos (esperado vs suma) | — | — | pending | — | — |
| TC-6 | Paridad frontend/backend (D-A) | REQ-PRESERVE | auto | no | Mismo árbol | computeInvalidNodes en front y back | Mismo resultado (misma tolerancia 0.01) | — | — | pending | — | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Resolver tests (transition) | (a definir en intake) | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| — | — | — | — | — | — | — |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|

## Summary

(Se llena al cerrar el ticket.)

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-10 | 2026-06-10 |
