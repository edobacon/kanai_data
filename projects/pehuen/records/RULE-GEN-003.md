---
id: RULE-GEN-003
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - auditoria
  - seguridad
  - compliance
---

# `audit()` debe invocarse en cada escritura (CREATE/UPDATE/DELETE/STATUS_CHANGE)

## What

Todo handler que realice una operación de escritura sobre datos críticos (CREATE, UPDATE, DELETE, STATUS_CHANGE) debe invocar la función `audit()` (auto-importada vía Nitro) con los parámetros: `{ userId, action, entity, entityId, ip, changes }`. La función crea un registro en el modelo `AuditLog`. No existe excepción documentada.

## Why

El legacy no tiene auditoría de escrituras. Esto hace imposible responder preguntas operativas como "¿quién anuló esta guía?" o "¿quién eliminó este ajuste?". El modelo `AuditLog` es una mejora crítica (compliance, trazabilidad regulatoria) y requiere cobertura completa para tener valor.

## Where

- **Files**: todo handler en `server/api/` que realice CREATE/UPDATE/DELETE/STATUS_CHANGE sobre: `guias`, `rumas`, `ajustes`, `users`, `canchas`, `productos`, `mii`
- **Layers**: backend (handlers)

## When

Después de cada escritura exitosa, antes de retornar la respuesta. Si la escritura falla, no auditar.

## Verification

- `grep -rn "audit(" server/api/` → debe aparecer en cada handler de escritura.
- Test: crear guía → existe documento en `AuditLog` con `action: 'CREATE'`, `entity: 'Guia'`, `entityId: <id>`.
- Test: anular guía → existe documento en `AuditLog` con `action: 'STATUS_CHANGE'`.
- `grep -rn "defineEventHandler" server/api/ | grep -v "\.get\."` → listar handlers de escritura y verificar que todos tienen `audit()`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/docs/07-migration-notes/improvements.md` sección 2.1 MEJORA-CRITICA. `config.yaml` critical_rules: "audit() debe invocarse en cada escritura (CREATE/UPDATE/DELETE/STATUS_CHANGE)". `pehuen_nuxt/CLAUDE.md`: `audit` listado entre utils auto-importados.
- **Related**: DEC-004, RULE-GEN-002
