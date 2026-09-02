---
id: RULE-MIGRATION-004
project: pehuen
type: rule
module: migration
level: must
tags:
  - migration
  - legacy
  - source-of-truth
  - fundacional
  - contract
---

# Legacy es la única fuente de verdad para la migración; nuxt es target en desarrollo, NO referencia

## What

Para **toda** capacidad, lógica, validación, flujo, mensaje literal, comportamiento, schema, regla de negocio o contrato funcional del proyecto:

- **Fuente de verdad**: `pehuen-client` (frontend legacy) y `pehuen-server` (backend legacy). Lo que ahí existe = lo que debe existir.
- **Target en desarrollo**: `pehuen_nuxt` (frontend + backend). Lo que ahí existe **no se asume correcto** hasta que un TC lo valida contra legacy.

Esta rule es la **sombrilla fundacional** que rige toda la migración:

- **No** se infiere comportamiento del nuxt.
- **No** se asume que un test E2E ya escrito en nuxt refleja el legacy correctamente — debe validarse.
- **No** se asume que un service ya implementado en nuxt produce los mismos outputs que el legacy — debe validarse.
- **No** se asume que un componente Vue del nuxt tiene los mismos `v-if` por rol que el legacy — debe validarse.

Cuando hay duda sobre cómo debe comportarse algo, **se mira el legacy**, no el nuxt.

## Why

El nuxt está en desarrollo activo, en paralelo al legacy en producción. Esto produce 4 modos en los que el nuxt diverge del legacy sin que sea evidente:

1. **Implementación incompleta**: una lógica del legacy aún no fue portada — el nuxt la responde con `null` o con datos parciales.
2. **Implementación basada en suposición**: el dev infirió cómo debería funcionar sin leer el legacy en detalle. La inferencia puede ser correcta o incorrecta.
3. **Drift por refactor en nuxt**: una lógica se reescribió en nuxt con mejor arquitectura pero perdiendo una variante del legacy (ej. `cancha === 'ALL'` no manejada).
4. **Tests E2E nuxt ya escritos** que codificaron flujos según lo que el dev creyó del legacy — pueden ser optimistas, pueden tener gaps, pueden contener bugs no detectados.

Si el nuxt se trata como referencia (`"vamos a ver cómo lo hace nuxt"`), la migración hereda silenciosamente los gaps + sesgos de la implementación parcial. La paridad funcional (RULE-MIGRATION-001) se pierde antes de empezar.

**Esta rule existe precisamente porque varias consultas del proyecto se han resuelto mirando el legacy y descubriendo que el nuxt diverge** (ejemplo: DEC-014 — el server legacy estaba abierto, el nuxt asumía `requireRole(A/R/S)`; ninguno reflejaba el contrato real del client legacy). Sin esta rule, esos descubrimientos quedan implícitos.

## Where

- **Lectura primaria** durante migración:
  - `pehuen-client/src/views/**/*.vue` — UI, flujos, condicionales por rol, computeds
  - `pehuen-client/src/store/**/*.ts` — state management, transforms client-side
  - `pehuen-client/src/router/index.ts` — rutas, navegación
  - `pehuen-client/src/components/**/*.vue` — componentes UI compartidos
  - `pehuen-server/src/controllers/**/*.ts` — endpoints, validaciones, business logic
  - `pehuen-server/src/services/**/*.ts` — servicios, cálculos
  - `pehuen-server/src/models/**/*.ts` — schemas Mongoose, hooks
  - `pehuen-server/src/dtos/**/*.ts` — DTOs, validation pipes
- **Target a corregir**: `pehuen_nuxt/**` (todo).
- **Documentación legacy adicional**: `pehuen-client/docs/`, `pehuen-server/docs/` — si existen, son fuente secundaria (después del código).

## When

Esta rule aplica **siempre durante la migración**, sin excepciones de contexto. Casos típicos donde es crítica:

- **Antes de escribir cualquier TC**: leer la fuente legacy correspondiente. NO basarse en la implementación nuxt.
- **Antes de aceptar un test E2E nuxt existente como "verde"**: validarlo contra legacy. Si el legacy se comporta distinto, el test es bug, no contrato.
- **Antes de tomar una decisión arquitectónica**: si hay duda sobre el comportamiento esperado, mirar legacy primero.
- **Al revisar PR**: el reviewer pregunta "¿esto refleja el legacy?". Si la respuesta es "no sé" o "asumí" → bloquea hasta validar.
- **Al detectar inconsistencia en nuxt**: la inconsistencia se trata como bug del nuxt, no como hecho del sistema.

## How to apply

### 1. Para validar comportamiento esperado

```
PASO 1: Identificar la pregunta concreta (ej. "¿RECEPTOR puede crear cancha?")
PASO 2: Buscar en pehuen-client primero (capabilities visibles al usuario):
        - NavLayout.vue (acceso por rol al menú)
        - views/Canchas.vue (botones, acciones)
        - condicionales v-if/:disabled por user.role
PASO 3: Si la pregunta es sobre cálculos/validaciones server-side, buscar en pehuen-server:
        - controllers/cancha.controller.ts
        - dtos/cancha.dto.ts
        - models/cancha.model.ts
PASO 4: Documentar la respuesta con file:line como source_ref.
PASO 5: SOLO ENTONCES escribir TC y comparar contra nuxt.
```

### 2. Para auditar implementación nuxt existente

```
PASO 1: Por cada archivo en pehuen_nuxt que cubra una capability/lógica:
PASO 2: Identificar la fuente legacy correspondiente (file:line).
PASO 3: Comparar comportamiento item por item:
        - ¿Maneja todas las variantes (cancha ALL, rol RECEPTOR, etc.)?
        - ¿Validaciones idénticas?
        - ¿Mensajes de error literales preservados (o cambio registrado en SPEC-migration-improvements)?
PASO 4: Si hay diferencia no registrada → marcar status `drift` y crear bug/DEC retroactiva.
PASO 5: Si nuxt está incompleto → marcar `partial` o `missing` y agregar al backlog.
```

### 3. Para resolver consultas/dudas

Cuando alguien (dev, agent, stakeholder) pregunta:

> "¿Cómo se comporta X?"

La respuesta correcta **nunca** es:

> "En nuxt está implementado así..."

La respuesta correcta es:

> "Según pehuen-client/src/views/X.vue:NN, el legacy hace... y según pehuen-server/src/controllers/X.controller.ts:NN, el server valida... ¿el nuxt lo refleja? — voy a verificar."

## Documentación de referencia legacy (creación bajo demanda)

Cuando una sesión de migración requiere lectura profunda del legacy y no quiere repetirla, se documenta como **artifact de referencia legacy** en `deckard/projects/pehuen/legacy-references/{module}/{topic}.md`. Convención:

```markdown
---
id: LEG-REF-{module}-{slug}
project: pehuen
type: reference
artifact: legacy-reference
created: YYYY-MM-DD
---

# {Module}: {topic}

## Source files
- `pehuen-client/src/...:NN` — {qué hace}
- `pehuen-server/src/...:NN` — {qué hace}

## Behavior

{descripción precisa con citas exactas del código}

## Variantes detectadas

| Variable | Comportamiento |
|----------|----------------|
| ... | ... |

## Edge cases

{listas extraídas del código: try/catch, branches, validaciones}

## Referenciado por

- DEC-XXX, CAP-XXX, LOGIC-XXX, ...
```

**Cuándo crear LEG-REF**:

- La fuente legacy se va a consultar desde >1 DEC/CAP/LOGIC.
- El comportamiento es no obvio y requiere síntesis.
- Hay variantes múltiples (cancha, rol, espacio) que conviene tabular.

**Cuándo NO crear LEG-REF**:

- Para una consulta puntual de un solo file:line.
- Para reproducir documentación que ya está en el código (no agrega valor).
- Para "documentar todo el legacy" — esta rule no pide eso, pide documentar lo que se consulta.

## Excepciones

- **Mejoras intencionales** registradas en `SPEC-migration-improvements`: el nuxt diverge del legacy a propósito. La fuente entonces es la DEC + IMP, no el legacy.
- **Bugs corregidos del legacy** (DEC-009, etc.): el nuxt corrige lo que el legacy hacía mal. La fuente del comportamiento correcto es la DEC + tests `@bug-fix`, no el legacy.
- **Features retiradas**: capacidades del legacy que se decidió no migrar (DEC con `chosen: legacy-feature-retired`). El nuxt no las implementa por diseño.

En las 3 excepciones, la **DEC explícita** es lo que justifica la divergencia. Sin DEC, la divergencia es regresión.

## Anti-patrones (no hacer)

❌ "Este test E2E ya pasa en nuxt, asumo que el flujo es correcto" — sin haberlo validado contra legacy, no se puede asumir.
❌ "El composable `useRumas()` ya está implementado, lo uso como base para `useRumasMap()`" — sin validar que `useRumas` refleja el legacy, propaga gaps.
❌ "El service `stats.service.ts` retorna estos números, los uso como expected" — son números actuales del nuxt, pueden ser incorrectos.
❌ Documentar el comportamiento del nuxt como si fuera spec — el spec viene del legacy, el nuxt lo cumple o lo viola.
❌ Resolver una consulta operativa "consultando lo que hace nuxt" — siempre legacy primero.
❌ Asumir que `pehuen_nuxt/tests/e2e/asesor-flows.spec.ts` codifica los flujos correctos del rol ASESOR — los devs los escribieron al implementar; pueden tener huecos.

## Related

- **RULE-AUTH-011** (caso particular de capacidades por rol): aplicación de esta rule al dominio de auth/permisos.
- **RULE-MIGRATION-001** (cero regresión funcional): esta rule define **dónde está la fuente** para detectar regresión.
- **RULE-MIGRATION-002** (TDD obligatorio): esta rule define **qué se cita en `source_ref`**: SIEMPRE legacy.
- **RULE-MIGRATION-003** (no duplicar vistas): esta rule explica por qué el legacy tiene duplicación que se debe consolidar — la inconsistencia legacy también se documenta y se decide.
- **SPEC-role-capabilities-matrix**, **SPEC-business-logic-parity**: ambos especifican `Source code` apuntando a legacy.
- **SPEC-migration-improvements**: divergencias intencionales (única excepción a esta rule).
- **DEC-014, DEC-001**: ejemplos de consultas resueltas mirando legacy y descubriendo que nuxt no lo reflejaba.
