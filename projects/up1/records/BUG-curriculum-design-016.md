---
id: BUG-curriculum-design-016
project: up1
type: bug
module: curriculum-design
tags:
  - rbac
  - institution
  - roles-curriculares
  - capabilities
  - owner
  - sp8
---

# Los roles curriculares no tienen `institution:view` — no pueden listar instituciones para crear/editar Planes ni Minors

## Symptom

Operando con un rol curricular activo (p.ej. `Diseñador Curricular` seleccionado en el switcher), al crear o editar un `Curriculum`:
- el selector de **Dueño = Institución** llega **vacío** ("La lista está vacía"), y
- un `Curriculum` que ya pertenece a una Institución (ej. `uPlanner University`, que **existe**) renderiza el dueño como **`(removed)`**,

dejando el campo `institutionId` (obligatorio) sin opciones → **no se puede guardar**. Bloquea crear un **Minor** (siempre `owner=Institution`, DECISION-017) y crear/editar un **Plan** con dueño Institución.

## Expected behavior

Un `Diseñador Curricular` puede crear/editar Planes y Minors (es su función, UPONE-1393). Para eso debe poder **leer** las instituciones y elegir el dueño. El rol `Consultor Curricular` (lectura) también debería resolver el nombre de la institución dueña en las vistas.

## Root cause

- **File**: `mods/curriculum-design/seed/_data-rbac.js` — array `READ_CAPS` (heredado por los 4 roles curriculares).
- **Cause**: `READ_CAPS` enumera solo los `*:view` de objetos **del mod** (`academicprogram:view`, `curriculum:view`, `offering:view`, …) y **omite `institution:view`**, que es una capability **de core** (no está en el `capabilities.json` del mod). UPONE-1393 cableó solo las 42 caps del mod → una cap de core requerida por un feature nunca entró al mapeo. Es el **mismo patrón** que `core_datalog:view` (que sí se detectó y agregó por coordinación, BL-8 de TICKET-102). El enforcement (`authChecker.js`, `listInstances` con `withObjectAuth('view')`, sin bypass de Admin cuando hay `selectedRole`) rechaza la lectura de `Institution` antes de cualquier filtro → lista vacía / `(removed)`.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | Cualquier usuario operando con rol curricular activo (`Diseñador`/`Consultor`/`Revisor`/`Autoridad Curricular`) |
| Data affected | FK `Curriculum.institutionId` / `ownerId` (ownerType=Institution) — lectura de `Institution` |
| Modules affected | curriculum-design (consume core `Institution`) |
| Frequency | Siempre que el rol activo es curricular y el flujo requiere elegir/mostrar la institución dueña |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev (tenant UPU) |
| Browser/Client | suite |
| Data conditions | Usuario con rol `Diseñador Curricular`; instituciones existentes en el tenant |

### Steps
1. Loguear y seleccionar el rol activo `Diseñador Curricular`.
2. Planes de Estudio → Currículos → Crear registro → TIPO DE DUEÑO = Institución.
3. Abrir el selector DUEÑO → **"La lista está vacía"**. (Editar un Plan/Minor ya dueño de Institución muestra `(removed)` y bloquea el guardado.)

## Workaround

Ejecutar los flujos con el rol **Admin** (tiene `institution:view`) — verificado: al cambiar el rol activo a Admin la lista de instituciones se puebla. Es el workaround vigente mientras no se corrija (los flujos del sprint se cumplen con Admin).

## Solution

Propuesta (respaldada por Confluence "RBAC & Permisos" + objeto `Affiliation` + caso cliente Santo Tomás — ver `kb/sp8/UPONE-1538-rbac-institution-view-gap.md`):

1. **Capability**: agregar `'institution:view'` a `READ_CAPS` en `_data-rbac.js` (cubre los 4 roles con lectura) + actualizar `tests/unit/rbacRoles.test.js` (exige el set exacto) + re-correr el seed RBAC. Mod-only, sin core.
2. **Alcance (mínimo privilegio)**: NO se contiene negando la cap. La visibilidad "solo su institución" se logra por **contexto**: asignar el rol curricular en el nodo `/system/<tenant>/institution/<X>` (no en la raíz `/system/<tenant>` como hace el ancla de smoke). Es el modelo documentado (jerarquía de contextos + Affiliation).
3. **Defensa extra (opcional)**: filtrar el picker de dueño a `type ∈ {University, Universidad, Institute}` para no ofrecer `support_center`.

**Pendiente antes de ejecutar**: verificar la matriz autoritativa `pm-workflow/.../roles-capabilities-curriculum-design_v4.md` (fuera de los repos accesibles) para confirmar si `institution:view` estaba especificada y se omitió. Diferido — no se corrige ahora.

## Related

- **Rules**: —
- **Decisions**: pendiente (capability sí + scoping por contexto)
- **Specs**: —
- **Tickets**: TICKET-119 (UPONE-1538) lo destapó en el smoke S1.T2 (learn L3)
- **KB**: `kb/sp8/UPONE-1538-rbac-institution-view-gap.md`
- **Precedente**: `core_datalog:view` (TICKET-102 / UPONE-1393, BL-8) — misma clase de cap de core omitida y luego agregada
