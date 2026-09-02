---
id: SPEC-legacy-feature
project: pehuen
type: doc
module: migration
tags:
  - legacy
  - paridad
  - capability
---

# Legacy Feature — meta-spec

## Artifact Definition

```yaml
name: legacy-feature
plural: Legacy Features
description: "Funcionalidad inventariada del sistema legacy que la migracion debe preservar (o documentar explicitamente como retirada). Enlaza codigo legacy + docs legacy + capability nueva."
location: specs/SPEC-legacy-features.md (consolidado por rol)
```

## Por que existe este artefacto

Las `business-capability` codifican lo que el sistema HACE. Pero antes de saber que hace, hay que **inventariar** lo que el legacy ya hacia. `legacy-feature` es ese inventario sistematico — saco una foto del legacy desde la perspectiva de cada rol y la traduzco a capabilities migrables.

Sin este inventario, hay riesgo de:
- **Perder feature** que solo conocia un usuario operativo (ej. un atajo, una variante de validacion).
- **Migrar feature obsoleta** que nadie usa.
- **Cambiar comportamiento** sin saber que era intencional en legacy.

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | LEG-{seq} |
| title | text | si | Que hacia el legacy |
| roles | enum[]: ADMINISTRADOR, SUPERVISOR, RECEPTOR, CONSULTOR, ASESOR | si | Roles que ejecutan la feature en legacy |
| legacy_view | text | si | Vista Vue del legacy (`pehuen-client/src/views/...`) |
| legacy_endpoints | text[] | si | Endpoints Express usados |
| legacy_doc | text | no | Doc en `pehuen-server/docs/` o `pehuen-client/docs/` |
| description | text | si | Que hace, en lenguaje de usuario |
| trigger | text | si | Como se accede en legacy (menu item, click, navegacion directa) |
| critical_for_role | enum[]: ADMINISTRADOR, SUPERVISOR, RECEPTOR, CONSULTOR, ASESOR | no | Roles para los que es CRITICA (sin esta feature, el rol no puede operar) |
| business_value | text | si | Por que importa para el negocio (no para el codigo) |
| nuxt_status | enum: migrated, in-progress, pending, retired, replaced, unknown | si | Estado en nuxt |
| nuxt_capability | reference: business-capability | si | CAP-{n} que la representa en nuxt |
| migration_decision | enum: paridad-exacta, mejora-deliberada, simplificada, retirada, fusionada-con-otra | si | Que se hizo o se hara |
| decision_ref | reference: DEC | no | DEC asociada si la decision merece registro |
| risk_if_lost | enum: low, medium, high, critical | si | Que pasa si la feature se pierde silenciosamente en migracion |
| usage_evidence | text | no | Evidencia de uso real (logs, entrevistas con usuarios, monitoring) |

## Spec Section Template

Las legacy-features se organizan **por rol** (no por dominio tecnico) para reflejar la perspectiva del usuario:

```markdown
## Legacy Features — Rol: {ROL}

| LEG | Title | Trigger | Critical | Nuxt status | CAP | Decision | Risk if lost |
|-----|-------|---------|----------|-------------|-----|----------|--------------|
| LEG-001 | Login con RUT chileno | Form en / | si | migrated | CAP-001 | paridad-exacta | critical |
| LEG-002 | Cambio de cancha activa via dropdown navbar | Click en navbar | si | migrated | CAP-005 | paridad-exacta | high |
| LEG-003 | Registrar entrada de madera mov 1 | Boton "Crear" en /app/guides | si | migrated | CAP-010 | paridad-exacta | critical |
```

## Requirements

### REQ-01: cada feature legacy debe tener decision de migracion

- **Aplica cuando**: se cataloga la feature
- **Esperado**: campo `migration_decision` no es null
- **Verificacion**: cross check campo

### REQ-02: features con `risk_if_lost: critical` MUST tener tests de paridad asociados

- **Aplica cuando**: catalogada como critical
- **Esperado**: la `nuxt_capability` apunta a un CAP que tiene `migration_tests` no vacio
- **Verificacion**: cross-reference

### REQ-03: features `retired` deben tener justificacion en `decision_ref`

- **Aplica cuando**: nuxt_status es `retired`
- **Esperado**: existe DEC explicando el retiro + comunicacion al usuario si aplica
- **Verificacion**: existe DEC

### REQ-04: cada rol debe tener inventario completo de SUS features legacy

- **Aplica cuando**: se ejecuta la auditoria pre-migracion
- **Esperado**: para los 5 roles, `LEG-*` con `roles` que incluya el rol cubre TODAS las vistas accesibles del legacy (cruzar con `pehuen-client/src/layouts/NavLayout.vue`)
- **Verificacion**: para cada vista del rol legacy, existe LEG asociada

## Defaults

```yaml
defaults:
  nuxt_status: pending
  migration_decision: paridad-exacta
  risk_if_lost: medium
```

## Relations

```yaml
relations:
  - artifact: business-capability
    type: generates
    description: "cada legacy-feature genera una business-capability nuxt (salvo retired)"
  - artifact: role-journey
    type: requires
    description: "el inventario por rol debe cubrir todas las features legacy del rol"
  - artifact: migration-decision
    type: suggests
    description: "features con decision != paridad-exacta requieren DEC explicito"
