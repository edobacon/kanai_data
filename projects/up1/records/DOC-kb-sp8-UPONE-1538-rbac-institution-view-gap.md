---
id: DOC-kb-sp8-UPONE-1538-rbac-institution-view-gap
project: up1
type: doc
---

# RBAC: los roles curriculares no pueden leer instituciones (gap `institution:view`)

> **Origen**: destapado durante el smoke de TICKET-119 / UPONE-1538 (SP8), al no poder listar instituciones como `Diseñador Curricular`.
> **Estado**: diferido — no se corrige en SP8. Workaround vigente: ejecutar los flujos con rol **Admin**. Registrado como `BUG-curriculum-design-016`.

## El problema en una frase

Con un rol curricular activo, `Institution` no se puede listar (FK de dueño vacío, dueño existente como `(removed)`), lo que impide crear/editar Planes con dueño Institución y crear Minors (siempre owner=Institution).

## Por qué pasa (capa por capa)

- **UI**: los layouts de `Curriculum` piden `institutionId` (**required**) y `ownerType` ofrece Institution; el picker usa `listInstances(Institution)`.
- **RBAC**: `listInstances` exige `institution:view` object-level (`authChecker`, sin bypass de Admin cuando el suite manda `selectedRole`). Los roles curriculares **no tienen** esa cap.
- **Origen**: `seed/_data-rbac.js` → `READ_CAPS` solo incluye `*:view` de objetos **del mod**; `institution:view` es **core** (fuera de los 42 caps del `capabilities.json`), y UPONE-1393 cableó solo los del mod. Mismo patrón que `core_datalog:view` (detectado y agregado por coordinación, BL-8 de TICKET-102) — aquí se pasó por alto.

## Modelo real de permisos (verificado en código + Confluence)

- **Confluence "RBAC & Permisos"** (uP1, pág. 1984790532): *"Los permisos de todos sus roles se acumulan"* + jerarquía de contextos (*"un rol en `/system/tenant/institution-456` cubre solo ese subárbol"*).
- **Código** (`authChecker.js:115-121, 281-283`): acumula por defecto; **si el suite manda `selectedRole`, filtra a ese único rol** (sin bypass de Admin). El comentario `:110` confirma que el suite opera "based on selected role".
- **Consecuencia**: operando **como** rol curricular (selectedRole), NO acumula caps de un rol base → la capability debe vivir en el rol curricular mismo.

## ¿Leer todas o solo la suya? — el contexto es el lever, no la capability

Evidencia de que la plataforma es **institución-scoped**:
- **Objeto `Affiliation`** (Confluence "Objetos"): *"multi-institución… conecta una persona con una institución específica y le asigna perfiles."*
- **Caso cliente Santo Tomás** (espacio Clientes): permisos *"a nivel de institución, campus y carrera"*.
- **Jerarquía de contextos** (RBAC doc): un rol acotado a un nodo de institución ve solo su subárbol.

→ "Que no lean todo" NO se logra negando `institution:view` (rompe el feature), sino **asignando el rol en el nodo de institución** en vez de la raíz del tenant. Hoy el seed de smoke ancla en `/system/UPU` (raíz) → vería las 18 instituciones del tenant (incluidas 15 `support_center` del dominio bienestar). En producción, el provisioning debe acotar por institución.

## Decisión (respaldada, a ejecutar fuera de SP8)

1. **Capability**: agregar `institution:view` a `READ_CAPS` (los 4 roles con lectura) + actualizar el test que exige el set exacto.
2. **Alcance**: acotar por **contexto** en el provisioning (nodo institución, no raíz de tenant).
3. **Opcional**: filtrar el picker de dueño a `type` académico (`University|Universidad|Institute`), no `support_center`.

## Pendiente para el veredicto 100%

Verificar la matriz autoritativa `pm-workflow/.../roles-capabilities-curriculum-design_v4.md` (la "matriz §4.1" que cita el seed y UPONE-1393, fuera de los repos accesibles): confirma si `institution:view` estaba especificada y se omitió, o si nunca se contempló.

## Inventario de datos relevante (tenant UPU)

`Institution` por `type`: `support_center` ×15 (bienestar/engagement), `University`/`Universidad`/`Institute` ×3 (académicas). Un diseñador curricular solo necesita las académicas.
