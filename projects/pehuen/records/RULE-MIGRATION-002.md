---
id: RULE-MIGRATION-002
project: pehuen
type: rule
module: migration
level: must
tags:
  - migration
  - tdd
  - testing
  - paridad
  - red-green
  - contract
---

# TDD obligatorio: cero implementación sin test rojo previo

## What

Toda migración de capacidad / lógica / mejora del sistema legacy al nuxt sigue **estrictamente el ciclo TDD**:

```
source legacy   →   write TC red   →   verify legacy   →   implement nuxt   →   verify nuxt green
   (file:line)        (status:           (status:                                  (status:
                       written-red)       verified-against-legacy                   green-in-nuxt)
                                          o failing-against-legacy)
```

**No se acepta**:

- Código de implementación (en `pehuen_nuxt/app/` o `pehuen_nuxt/server/`) sin que exista previamente un TC `written-red` con `source_ref` al legacy.
- Cerrar una task de un artefacto migración (`CAP-*`, `LOGIC-*`, `IMP-*`, `BUG-*`) sin TC asociado en estado `green-in-nuxt`.
- Modificar un test pre-existente para que pase, en lugar de cambiar la implementación. Si un test falla después de un cambio, la implementación es la que se corrige (o se crea un nuevo TC con `superseded` del anterior).

## Why

La migración avanza con dos riesgos crónicos sin TDD obligatorio:

1. **Drift silencioso**: nuxt diverge del legacy sin nadie darse cuenta — las regresiones aparecen en producción cuando un usuario senior dice "esto antes funcionaba así". Sin un test que codifique el comportamiento esperado, no hay fuente de verdad ejecutable.
2. **Cobertura aspiracional**: equipos suelen escribir tests *después* de la implementación para "subir cobertura", lo que produce tests que validan la implementación actual (no el contrato esperado). TDD invierte el orden — el test es contrato; la implementación es ejecución del contrato.

Esto vale especialmente para:

- **CAP-***: el client legacy tiene el contrato de capacidades por rol (RULE-AUTH-011). Cada CAP necesita TC que valide visibilidad por rol + endpoint correspondiente.
- **LOGIC-***: las lógicas pesadas tienen variantes por cancha/espacio/usuario/rol; un TC por variante es la única forma de garantizar paridad numérica.
- **IMP-***: las mejoras intencionales necesitan TC `@improvement` que falle contra legacy y pase contra nuxt — sin esto, no hay garantía de que la mejora se mantenga después de un refactor.
- **BUG-***: bugs corregidos del legacy necesitan TC `@bug-fix` que documente el bug original y verifique el fix.

## Where

- **TC artifacts**: `tests/{unit,e2e}/migration-paridad/**/*.{test,spec}.ts` — gobernados por meta-spec [migration-test](../../meta-specs/migration-test.md).
- **Catalogo TC**: `SPEC-migration-tdd` (TC-1..TC-210 reservados por dominio + slots por sprint).
- **Vinculacion** desde artefactos:
  - `SPEC-role-capabilities-matrix` — cada `CAP-*` lista sus `tests: [TC-...]`.
  - `SPEC-business-logic-parity` — cada `LOGIC-*` lista sus `tests: [TC-...]`.
  - `SPEC-migration-improvements` — cada `IMP-*` lista sus `tests: [TC-...]`.
- **Audit**: `pehuen_nuxt/scripts/audit-migration-parity.mjs` (futuro modo `tdd-coverage`) detecta artefactos sin TC.

## When

- **Antes de iniciar una task de implementación migración**: confirmar que existe TC red asociado. Si no existe → crear TC primero (subtask).
- **Antes de marcar task como completed**: TC asociado debe estar en `green-in-nuxt` (o `verified-against-legacy` + `green-in-nuxt` si es `@paridad`).
- **En code review de PR**: reviewer rechaza si la PR contiene código de implementación sin TC red previo en el mismo o en una PR previa enlazada.
- **En refactor**: tests existentes son contrato. Si un refactor rompe un TC `green-in-nuxt`, se trata como regresión hasta demostrar que el TC era incorrecto (con DEC explícita).

## How to apply

### 1. Identificar el artefacto

Determinar qué tipo de artefacto modela el cambio:

| Cambio | Artefacto | Spec |
|--------|-----------|------|
| Capability por rol (vista, acción, edición de campo) | `CAP-*` | SPEC-role-capabilities-matrix |
| Lógica de cálculo / transformación / agregación | `LOGIC-*` | SPEC-business-logic-parity |
| Mejora intencional (security, observability, etc.) | `IMP-*` | SPEC-migration-improvements |
| Bug del legacy a corregir | `BUG-*` | bugs/{module}/ |
| Decisión arquitectónica con cambio funcional | `DEC-*` | decisions/ + tags `delta-intencional` |

### 2. Citar la fuente

Cada TC nuevo requiere:

- `source_doc`: doc legacy si existe (ej. `pehuen-server/docs/03-flows/...`).
- `source_code`: file:line del legacy (frontend o backend).
- Para CAPs: típicamente `pehuen-client/src/views/...:N` con la condicional por rol.
- Para LOGICs: típicamente `pehuen-client/src/views/...:N` o `pehuen-server/src/services/...:N` con el computed/método.
- Para IMPs: el DEC accepted que la justifica (`@delta-decision`).

### 3. Determinar tag y `pass_against`

| Tag | Comportamiento esperado | Cuándo aplicar |
|-----|------------------------|----------------|
| `@paridad` | PASS contra legacy y contra nuxt | CAP/LOGIC ported-equivalent |
| `@improvement` | FAIL contra legacy, PASS contra nuxt | IMP-* aceptado |
| `@bug-fix` | FAIL contra legacy, PASS contra nuxt | BUG legacy corregido en nuxt |
| `@bug-preserved` | PASS contra legacy y nuxt (bug a propósito) | bug que se decide preservar (rare) |
| `@delta-decision` | depende de DEC | DEC-* delta-intencional o delta-cuestionable |

### 4. Escribir el TC en estado `written-red`

- Crear archivo en `tests/{unit,e2e}/migration-paridad/{module}/...`.
- Header del archivo:
  ```ts
  /**
   * @source-doc {path}
   * @source-code {path:N}
   * @improvements-ref {item} (opcional)
   */
  ```
- Test name incluye el tag: `test('@paridad CAP-GUIDES-002 ...', ...)`.
- Estado: `pending` → al commit del archivo: `written-red`.

### 5. Verificar contra legacy (paridad/bug-preserved)

- Ejecutar contra `legacy-clone`: `PEHUEN_API_BASE=http://localhost:5001/api pnpm test:run -- {pattern}`.
- Para `@paridad` y `@bug-preserved`: TC debe PASAR.
- Para `@improvement` y `@bug-fix`: TC debe FALLAR (codifica comportamiento nuevo que aún no está en legacy).
- Estado: `verified-against-legacy` (o `failing-against-legacy` si el legacy aún no está disponible — agregar nota).

### 6. Implementar en nuxt

- Implementación mínima para que el TC pase.
- No agregar features fuera del TC.
- Si descubres que falta algo durante la implementación → crear TC adicional, no expandir el actual.

### 7. Verificar verde en nuxt

- Ejecutar contra nuxt: `pnpm test:run -- {pattern}`.
- TC debe pasar (`@paridad`, `@improvement`, `@bug-fix`).
- Estado: `green-in-nuxt`.

### 8. Actualizar artefactos vinculados

- En el spec del artefacto (CAP/LOGIC/IMP), actualizar columna `tests:` y `Status`.
- Si el TC descubre algo inesperado del legacy → agregar `learn` al ticket (DKC).

## Estados de TC (de meta-spec migration-test)

| Estado | Significado |
|--------|-------------|
| `pending` | Identificado pero no escrito |
| `written-red` | TC escrito, falla (rojo) — esperado en TDD inicial |
| `verified-against-legacy` | TC pasa contra legacy (paridad confirmada) — solo `@paridad` y `@bug-preserved` |
| `failing-against-legacy` | TC falla contra legacy — esperado para `@improvement`/`@bug-fix` |
| `green-in-nuxt` | TC pasa contra nuxt — implementación completa |
| `blocked` | Bloqueado por dependencia externa o decisión pendiente |

## Cobertura mínima por artefacto

- **CAP-***: 1 TC visibility (frontend, valida `v-if`/`:disabled` por rol) + 1 TC endpoint (backend, valida `requireRole` retorna 200/403 según rol). Total mínimo **2 TC por CAP**.
- **LOGIC-***: 1 TC por variante distintiva (combinación de `cancha`, `rol`, `espacio` que cambia el output). Mínimo **1 TC**, típicamente 3-5 por logica crítica.
- **IMP-***: 1 TC `@improvement` que falla contra legacy y pasa contra nuxt. Mínimo **1 TC por IMP**.
- **BUG-***: 1 TC `@bug-fix` con reproducción del bug y verificación del fix. Mínimo **1 TC por BUG**.

## Exceptions

- **TC-pyramid**: para `@paridad` puramente UI (ej. estilo de un componente), permitido tests visuales/snapshot en lugar de tests funcionales contra legacy. Justificar en `comparison_note`.
- **Refactors internos** (cambio de archivo sin cambio de comportamiento): no requiere TC nuevo, pero tests existentes deben seguir pasando. Si pasan → refactor válido.
- **Documentación**: cambios solo en `docs/` no requieren TC.
- **Configuración** (env vars, deployment): cubrir con tests de integration o e2e si la configuración cambia comportamiento; sin tests si es puramente operativa.

## Anti-patrones (no hacer)

❌ Implementar primero, escribir tests "para subir cobertura" después.
❌ Modificar el TC para que pase con la implementación actual cuando la implementación tiene bug.
❌ TC que valida `expect(result).toBeDefined()` o `toBeTruthy()` — assertions vacías.
❌ TC sin `source_ref` (no hay fuente de verdad para validar paridad).
❌ Mezclar varios TC en un solo `it`/`test` block (un TC = un comportamiento).
❌ Saltarse el paso "verify against legacy" en `@paridad` ("ya sé que funciona en legacy"). El paso confirma que el dataset y setup son correctos, no solo el comportamiento.

## Related

- **RULE-MIGRATION-004**: legacy es fuente única de verdad — define qué se cita en `source_ref` (siempre legacy, nunca nuxt). Esta rule (TDD) ejecuta el ciclo; aquella define dónde se lee.
- **SPEC-migration-tdd** — implementación operacional (33 tasks, 5 sprints, slots TC-1..TC-210).
- **meta-spec migration-test** — definición del artefacto TC con sus campos y estados.
- **RULE-MIGRATION-001** — paridad funcional (este RULE garantiza el *cómo* mediante TDD).
- **RULE-AUTH-011** — capacidades = client legacy (la fuente para CAPs).
- **SPEC-role-capabilities-matrix** / **SPEC-business-logic-parity** / **SPEC-migration-improvements** — registros de CAP/LOGIC/IMP que enlazan a sus TC.
