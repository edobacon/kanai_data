---
id: SPEC-business-capability
project: pehuen
type: doc
module: migration
tags:
  - funcionalidad
  - capability
  - user-story
---

# Business Capability — meta-spec

## Artifact Definition

```yaml
name: business-capability
plural: Business Capabilities
description: "Funcionalidad de negocio que un actor puede ejecutar — descrita desde la perspectiva del usuario y el dominio forestal, NO desde endpoints ni tecnologia. La migracion debe preservar (o mejorar deliberadamente) cada capability."
location: specs/SPEC-legacy-features.md (consolidado) + tests/e2e/migration-paridad/capabilities/
```

## Por que existe este artefacto

El plan original orientaba la paridad a **endpoints, modelos, side-effects** (paridad tecnica). Eso es necesario pero **insuficiente**. Una migracion puede tener:

- 100% endpoints respondiendo
- 100% schemas validando
- 100% sockets emitiendo

...y aun asi **fallar** porque la **capability del usuario** se rompe (UI no encuentra el boton, secuencia de acciones cambia, latencia rompe la UX, paso intermedio desaparecio, mensajes diferentes confunden al operador).

`business-capability` codifica funcionalidad **end-to-end vista por el actor**, agnostica a la implementacion. Es el contrato de **lo que el sistema hace por el usuario**.

## Regla fundamental: capabilities supeditadas al rol

**No existen capabilities sin rol.** Cada `business-capability` se ata a UN actor especifico (campo `actor` obligatorio). Una misma capability tecnica que ejecuta `RECEPTOR` y `ADMINISTRADOR` se modela como **DOS capabilities distintas** si:

- El scope cambia (RECEPTOR ve solo su cancha; ADMINISTRADOR ve todas).
- Las restricciones cambian (RECEPTOR no puede `cancha = 'ALL'`).
- La UI difiere (botones visibles/ocultos por rol).
- Los errores difieren (RECEPTOR ve "Acceso Denegado" si intenta accion fuera de scope; ADMINISTRADOR no recibe ese error).

**Implicancia para la migracion**: la paridad se valida **por rol**, no en agregado. Un test que pasa para ADMINISTRADOR pero falla para RECEPTOR (porque la UI no oculto el boton) es **gap de migracion** aunque el endpoint funcione.

### Vista de matriz capability x rol

Toda capability se proyecta en la **matriz de roles del proyecto**:

| CAP | ADMINISTRADOR | SUPERVISOR | RECEPTOR | CONSULTOR | ASESOR |
|-----|----------------|------------|----------|-----------|--------|
| Crear guia | ✓ (sin scope) | ✗ | ✓ (scope cancha) | ✗ | ✗ |
| Editar guia | ✓ | ✗ | ✓ (scope) | ✗ | ✗ |
| Anular guia | ✓ | ✓ | ✓ | ✓ | ✗ |
| Subir foto ruma | ✓ | ✗ | ✓ | ✗ | ✓ |
| ... | ... | ... | ... | ... | ... |

Si una celda dice ✓ pero el sistema migrado **no lo permite** o lo permite con friction (boton oculto cuando deberia estar visible, mensaje de error inesperado, secuencia distinta), es **gap de migracion del rol**.

Ver tambien: `role-journey.md` — captura la jornada completa de cada rol como una secuencia de capabilities.

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | CAP-{seq} (correlativo) |
| title | text | si | Frase desde la perspectiva del actor: "El RECEPTOR puede registrar la entrada de madera" |
| actor | enum: ADMINISTRADOR, SUPERVISOR, RECEPTOR, CONSULTOR, ASESOR, public | si | Quien la ejecuta |
| domain_module | enum: auth, guias, rumas, ajustes, productos, canchas, mii, reports, stats | si | Dominio del negocio |
| user_story | text | si | "Como {actor}, quiero {accion}, para {beneficio}" |
| preconditions | text[] | si | Estado del sistema antes de ejecutar (sesion, permisos, datos previos) |
| trigger | text | si | Que dispara la capability (click, llegada de archivo, scheduled, etc) |
| steps | table: orden, actor, accion, sistema, resultado | si | Secuencia paso a paso end-to-end |
| business_rules | reference: RULE[] | si | Reglas de negocio que aplican |
| variants | text[] | no | Variantes de la capability (ej. crear-guia tiene 5 variantes por movimiento) |
| edge_cases | text[] | no | Casos limite que el sistema debe manejar |
| not_a_capability | text[] | no | Cosas que el actor NO puede hacer en este flujo (delimitar scope) |
| user_visible_outcomes | text[] | si | Que ve el actor al completar (mensaje, redireccion, dato persistido visible) |
| user_visible_errors | text[] | si | Errores legibles que el actor puede ver (mensajes literales) |
| success_criteria | text | si | Como sabe el actor que funciono (no tecnico) |
| legacy_implementation | reference: legacy-feature | si | Donde existe en legacy (vista + endpoint + flujo) |
| nuxt_implementation | reference | si | Donde existe en nuxt (page + composable + endpoint + flujo) |
| migration_decision | enum: paridad-exacta, mejora-deliberada, simplificada, retirada | si | Que se decidio para esta capability en la migracion |
| migration_decision_ref | reference: DEC | no | DEC asociada si la capability tiene decision documentada |
| migration_tests | reference: TC[] | si | TCs que validan la capability end-to-end |
| status | enum: pending, mapped, tests-written, parity-validated, content-docs-updated, complete | si | Etapa actual |

## Spec Section Template

```markdown
## Business Capabilities

| CAP | Actor | Module | Title | Decision | Status |
|-----|-------|--------|-------|----------|--------|
| CAP-001 | RECEPTOR | guias | Registrar entrada de madera de proveedor | paridad-exacta | mapped |
| CAP-002 | ASESOR | rumas | Georreferenciar ruma con foto desde terreno | paridad-exacta | mapped |
| CAP-003 | ADMINISTRADOR | ajustes | Cargar correcciones masivas via Excel | mejora-deliberada | mapped |
```

### Detalle expandido por capability

```markdown
#### CAP-{N}: {title}

- **actor**: {actor}
- **module**: {module}
- **user_story**: Como {actor}, quiero {accion}, para {beneficio}.

**Preconditions**:
- {pre 1}
- {pre 2}

**Trigger**: {que la dispara}

**Steps** (end-to-end):
| # | Actor | Accion | Sistema | Resultado |
|---|-------|--------|---------|-----------|
| 1 | usuario | abre /guias/crear | renderiza form vacio | form visible con select movimiento |
| 2 | usuario | selecciona movimiento=1 | revela campos proveedor + comuna | UI condicional |
| 3 | usuario | llena campos + submit | valida + persiste + emite socket | redirect a /guias + flash success |

**Business rules**: RULE-GUIA-001, RULE-GUIA-003 (movimiento=1 implica comuna obligatoria).

**Variants**: 5 (movimientos 1-5).

**Edge cases**:
- proveedor inexistente en catalogo → permite crear con texto custom
- guiaArauco con whitespace → server lo limpia antes de persistir

**Not a capability**:
- ASESOR NO puede ejecutar este flujo.
- En vista edit: el campo movimiento es disabled.

**User visible outcomes**:
- Mensaje "Guía creada exitosamente"
- Redirect a `/guias` con la nueva guia visible al tope
- Otros usuarios viendo el listado reciben actualizacion en realtime

**User visible errors**:
- "Esta guía ya está asociada a este tipo de movimiento" (duplicado)
- "No puede tener el mismo origen y destino"
- "Debe incluir detalle de origen" (OTRA CANCHA sin custom)

**Success criteria**: el RECEPTOR ve la guia recien creada en el listado de su cancha y puede abrir su detalle.

**Legacy**: pehuen-client/src/views/guides/Create.vue + pehuen-server POST /api/guia
**Nuxt**: pehuen_nuxt/app/pages/guias/crear.vue + pehuen_nuxt/server/api/guias/index.post.ts

**Decision**: paridad-exacta
**Tests**: TC-33 a TC-65 (incluye 5 variantes)
```

## Requirements

### REQ-01: cada capability debe ser ejecutable end-to-end por su actor

- **Aplica cuando**: se prueba una capability post-migracion
- **Esperado**: el actor logea, navega a la vista, ejecuta los pasos, ve los outcomes
- **Verificacion**: test E2E con Playwright que recorre los `steps` completos

### REQ-02: cada capability tiene legacy_implementation y nuxt_implementation

- **Aplica cuando**: se mapea la capability
- **Esperado**: ambos campos apuntan a paths existentes
- **Verificacion**: file existence check

### REQ-03: capabilities con `migration_decision: paridad-exacta` deben tener test que pase en ambos backends

- **Aplica cuando**: decision es paridad-exacta
- **Esperado**: TCs asociados con tag `@paridad` PASS contra legacy y nuxt
- **Verificacion**: dual-run de los TCs

### REQ-04: capabilities con `migration_decision: mejora-deliberada` requieren DEC asociada + comunicacion al usuario

- **Aplica cuando**: se decide mejorar (no paridad)
- **Esperado**: existe `decisions/DEC-{n}-*.md` con `chosen` y `consequences.communication`
- **Verificacion**: cross-reference

### REQ-05: capabilities `complete` requieren content/docs actualizado

- **Aplica cuando**: status es complete
- **Esperado**: existe doc en `content/docs/capabilities/{slug}.md` o `content/docs/{module}/{slug}.md`
- **Verificacion**: file existence + link checker

## Defaults

```yaml
defaults:
  migration_decision: paridad-exacta   # default es preservar comportamiento legacy
  status: pending
```

## Relations

```yaml
relations:
  - artifact: legacy-feature
    type: requires
    description: "cada business-capability nace de una legacy-feature"
  - artifact: parity-flow
    type: generates
    description: "una business-capability se implementa via N parity-flows tecnicos"
  - artifact: migration-test
    type: generates
    description: "TCs E2E que validan la capability end-to-end"
  - artifact: migration-decision
    type: suggests
    description: "Si la capability tiene migration_decision != paridad-exacta, registrar DEC"
