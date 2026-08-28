---
id: RULE-mods-037
project: up1
type: rule
module: mods
---

# Capabilities object-level y field-level van SIN prefix `mod/`; solo las funcionales transversales lo usan

## What

Los `capabilities.json` de mods declaran capabilities con DOS convenciones de naming segun tipo:

| Tipo | Naming | Ejemplo |
|------|--------|---------|
| **Object-level CRUD** | `<objectName>:view\|create\|modify\|delete` (SIN prefix `mod/`) | `objectdefinition:view`, `n8nworkflow:create`, `activity:modify` |
| **Field-level** | `<objectName>.<fieldName>:view\|modify` (SIN prefix) | `person.salary:view`, `hwassessment.riskScore:view` |
| **Funcional transversal** | `mod/<modname>:<action>` (CON prefix) | `mod/curriculum-design:approve`, `mod/wellbeing:view360`, `ai:chat` |

**La doc oficial** (`custom-capabilities.md`) menciona solo el patron `mod/<modname>:*` para mods, pero **los mods reales del codebase usan la convencion dual descrita arriba**.

Observacion adicional: algunos mods (`ai-agent`, `flow-viewer`, `object-manager-editor`) usan tampoco el prefix `mod/` para sus funcionales (e.g., `ai:chat`, `flow:start`). La regla blanda parece ser: prefix `mod/<modname>:` cuando la capability es ambigua y quiere namespacing explicito, sin prefix cuando el objectName o nombre del modulo ya es unico/canonico.

## Why

El wrapper de RBAC `withObjectAuth(action)` en `up1/object-manager/src/services/auth/withAuth.js` busca la capability como `<objectName>:<action>` literal — si se declara con prefix `mod/`, el wrapper NO la encuentra y todo CRUD falla.

Las funcionales transversales (no mapean a un objectName concreto, son acciones del modulo en si) SI van con prefix porque no las busca un wrapper estandar: las consume codigo custom del mod via `hasCapability(userId, 'mod/<modname>:action')`.

Esta convencion impacta directamente cualquier ticket que renombre o declare capabilities de objetos auditables, autorizables o transversales. Descubierto durante refinamiento de UPONE-1100 (HU4 Rename academicActivity → activity): el ticket planteaba `activity:view`, `activity:audit`, etc. (correcto, sin prefix) en linea con la convencion REAL aunque diverja de la documentada.

## Where

**Documentacion oficial (incompleta):**
- `up1/object-manager/docs/features/custom-capabilities.md` — menciona solo `mod/<modname>:*` para mods
- Confluence: `RBAC & Permisos` (page/1984790532)

**Codigo del wrapper que requiere naming object-level sin prefix:**
- `up1/object-manager/src/services/auth/withAuth.js` — `withObjectAuth(action)` construye la query como `<objectName>:<action>`
- `up1/object-manager/src/services/auth/authChecker.js` — `checkObjectPermissions`, `checkFieldPermissions`

**Ejemplos reales (mods en `up1/mods/`):**
- `mods/curriculum-design/capabilities.json` — SOLO funcionales con prefix (`mod/curriculum-design:view|edit|approve|publish`). NO declara aun object-level para `academicActivity/activity` — estos se generaran al implementar UPONE-1100 (HU4)
- `mods/object-manager-editor/capabilities.json` — SOLO object-level sin prefix (`objectdefinition:view`, `fielddefinition:create`)
- `mods/flow-viewer/capabilities.json` — mixto: `n8nworkflow:view|create` (object-level) + `flow:start` (funcional sin prefix `mod/`)
- `mods/hello-world-mod/capabilities.json` — mixto: `mod/hello-world:view_assessments` (funcional) + `hwassessment.riskScore:view` (field-level)
- `mods/ai-agent/capabilities.json` — solo funcionales sin prefix `mod/` (`ai:chat`, `ai:view_usage`)
- `mods/retention-wellbeing/capabilities.json` — funcionales con prefix segun doc oficial

## When

**Aplica cuando** se declare o renombre cualquier capability en `capabilities.json` de un mod.

**Como decidir el naming:**
1. ¿La capability corresponde a CRUD sobre un objeto de negocio (existe en `objects/business/`)? → SIN prefix: `<objectName>:view|create|modify|delete`
2. ¿La capability protege un campo especifico de un objeto? → SIN prefix: `<objectName>.<fieldName>:view|modify`
3. ¿La capability protege una accion transversal del mod (workflows, aprobaciones, dashboards especiales)? → CON prefix: `mod/<modname>:<action>`
4. ¿La capability es funcional pero el `modname` o el namespace ya es canonico (`ai`, `flow`, `suite`)? → puede ir SIN prefix pero respetando convencion del mod

**Cuando NO seguir la convencion**: nunca. Usar el prefix incorrecto en object-level rompe `withObjectAuth`.

## Verification

**Verificacion del codebase:**
```bash
grep -l '"mod/' up1/mods/*/capabilities.json
# Mostrar mods que usan prefix mod/ — confirmar que es para funcionales no object-level

grep -E '"name": "[a-z]+:view\|create\|modify\|delete"' up1/mods/*/capabilities.json | head
# Mostrar object-level sin prefix
```

**Verificacion del wrapper:**
```bash
grep -n 'withObjectAuth\|checkObjectPermissions' up1/object-manager/src/services/auth/withAuth.js
# Confirmar que construye la query como objectName:action sin prefix
```

**Verificacion runtime:**
- Declarar `mod/foo:view` para un objeto `Foo` en capabilities.json
- Asignar a un rol con asignacion a usuario
- Ejecutar `query foos` desde GraphQL con ese user → fallara permission denied porque withObjectAuth busca `foo:view`, no `mod/foo:view`

## Source

- **Discovered in**: —
