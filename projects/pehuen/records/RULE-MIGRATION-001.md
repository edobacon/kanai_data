---
id: RULE-MIGRATION-001
project: pehuen
type: rule
module: migration
level: must
tags:
  - migration
  - parity
  - regression
  - improvements
  - contract
---

# El nuxt es funcionalmente una versión mejorada del legacy: cero regresión funcional

## What

Por cada capability/lógica/flujo presente en el sistema legacy (`pehuen-client` + `pehuen-server`), el nuxt (`pehuen_nuxt`) debe cumplir uno de tres estados:

1. **Equivalente o mejor**: implementación que cubre la misma funcionalidad con igual o mayor completitud. Sin acción adicional.
2. **Mejora intencional**: nuxt cambia el shape, formato, mecanismo o restricción respecto del legacy. **Debe estar registrada en `SPEC-migration-improvements`** con justificación. Cualquier divergencia no registrada es regresión.
3. **Gap (regresión)**: nuxt cubre con menor completitud que el legacy (lógica faltante, parcial, o con menos variantes). **Es un bug. Se corrige antes del corte.**

No se aprueba el corte si existe una capability del legacy en estado de gap.

## Why

El nuxt avanza en paralelo al legacy con su propio backend interno. La estrategia de migración no es "portar el código tal cual" sino "alcanzar paridad funcional + mejoras donde el nuxt ya las introdujo correctamente". Sin un principio explícito que distinga **mejora** de **regresión**, las divergencias se vuelven invisibles: el equipo asume que el nuxt está al día cuando en realidad le faltan variantes de cálculo, validaciones, o flujos por rol que solo aparecen en producción.

Tres dimensiones de paridad:

- **Capabilities por rol** (ver vistas, ejecutar acciones, modificar campos): fuente en `pehuen-client` (RULE-AUTH-011). Tracked en `SPEC-role-capabilities-matrix`.
- **Lógicas de cálculo** (computeds pesados, transforms, agregaciones con variantes por cancha/espacio/usuario/rol): fuente en `pehuen-client` (donde vivían) y `pehuen-server` (validaciones server-side). Tracked en `SPEC-business-logic-parity`.
- **Mejoras intencionales** (paginación shape, audit log, httpOnly cookies, zod, etc.): tracked en `SPEC-migration-improvements`. Cada DEC con tag `delta-intencional` o `mejora` apunta acá.

## Where

- **Sources de paridad**:
  - `pehuen-client/src/**` (frontend legacy: capabilities + computeds + transforms)
  - `pehuen-server/src/**` (backend legacy: validaciones + cálculos server-side)
- **Targets de paridad**:
  - `pehuen_nuxt/app/**` (frontend nuxt: pages, components, composables, stores)
  - `pehuen_nuxt/server/**` (backend nuxt: api routes, services, validators)
- **Trazabilidad**:
  - `SPEC-role-capabilities-matrix` — capability x rol con evidencia legacy + nuxt.
  - `SPEC-business-logic-parity` — lógicas con file:line legacy + ubicación esperada nuxt + status.
  - `SPEC-migration-improvements` — divergencias intencionales con razón + criterio de aceptación.
- **Audit script**: `pehuen_nuxt/scripts/audit-migration-parity.ts` — detecta drift y reporta gap/improvement/regression.

## When

- **Antes de iniciar una task de migración**: consultar el SPEC correspondiente para confirmar si la lógica está catalogada como port, improvement o pending.
- **Antes de aceptar una PR**: el reviewer corre `pnpm audit:all` y revisa que no haya regresiones nuevas.
- **Antes del corte (DoD)**: 0 entries en estado `gap`/`missing`/`partial` no justificado en los specs de paridad.
- **Al detectar divergencia no documentada**: crear DEC con tag `delta-intencional` (si la divergencia es intencional) o BUG (si es regresión accidental).

## How to apply

1. **Catalogar antes de migrar**: cualquier capability/lógica del legacy entra primero al SPEC correspondiente como `pending` con evidencia (file:line legacy).
2. **Decidir el destino**: por cada entrada, decidir: equivalente / mejora / no-aplica. Si es mejora, mover a `SPEC-migration-improvements` con justificación. Si es no-aplica (feature retirada), DEC explícita.
3. **Implementar y trackear**: al portar a nuxt, actualizar el status de la entrada y referenciar la ubicación nuxt (file:line).
4. **Validar con audit script**: `pnpm audit:all` debe reportar 0 regresiones antes del merge.
5. **Detectar drift**: si el client legacy cambia (poco probable pero posible si hay hotfix) o el nuxt diverge sin spec, el script alerta.

## Estados de paridad por entrada

| Estado | Significado | Acción |
|--------|-------------|--------|
| `ported-equivalent` | Implementado en nuxt con mismo comportamiento | Validar tests |
| `ported-improved` | Implementado mejor en nuxt; registrado en SPEC-migration-improvements | Validar tests + criterio de mejora |
| `pending` | Aún no implementado en nuxt | Schedule en sprint |
| `partial` | Implementado pero faltan variantes (canchas/roles/espacios) | Bug, completar |
| `missing` | No existe en nuxt y debería | Bug crítico, implementar |
| `retired` | Decidido no migrar (con DEC) | Validar que no rompe flujos |
| `drift` | Implementado distinto sin spec | Bug o falta DEC: revisar |

## Exceptions

- **Bugs evidentes del legacy**: si el comportamiento legacy era un bug (ej. `isRut` semántica invertida), el nuxt corrige sin necesidad de SPEC-migration-improvements. Se registra como BUG en deckard con el fix.
- **Features puramente cosméticas**: cambios visuales sin impacto funcional no requieren entrada en SPEC. Sí requieren validación de UX por el reviewer.
- **Refactors internos**: si una lógica vive en otro archivo en nuxt (ej. de view a composable) pero produce el mismo resultado, no es divergencia. Se registra ubicación nueva en el SPEC para trazabilidad.

## Related

- **RULE-MIGRATION-004**: legacy es fuente única de verdad — define **dónde se mide la regresión**. Esta rule (regresión) opera sobre la fuente que aquella define.
- **RULE-AUTH-011**: caso particular para capabilities por rol.
- **DEC-002, DEC-004, DEC-013, DEC-006, DEC-010**: ejemplos de mejoras intencionales (tag `delta-intencional`).
- **SPEC-migration-tdd**: estrategia de testing que valida la paridad.
- **SPEC-role-capabilities-matrix**, **SPEC-business-logic-parity**, **SPEC-migration-improvements**: registros operativos de la paridad.
