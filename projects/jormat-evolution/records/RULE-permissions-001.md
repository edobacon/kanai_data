---
id: RULE-permissions-001
project: jormat-evolution
type: rule
module: permissions
level: should
tags:
  - rbac
  - seed
  - capabilities
  - DET-16
---

# Una capability transversal se otorga donde el rol se define, no acoplada al seed de otro dominio

## What

Cuando un rol debe recibir una capability que es transversal (no pertenece a un dominio especifico), el
grant se declara en el seed de roles (`seeds/10_demo_roles_users.ts` o equivalente), no como side-effect
acoplado al seed de otro dominio que casualmente ya toca ese rol. Acoplar el grant a un seed de dominio
ajeno hace que el permiso dependa de un cambio no relacionado y deja el origen del grant dificil de
rastrear.

## Why

`catalogos:view` es una capability transversal (no pertenece al dominio de camiones), pero estaba
otorgada como parte de `seeds/14_entities_trucks_capabilities.ts` (seed de `entities.trucks:edit`). El
acoplamiento dejaba el grant fragil: los roles `vendedor` y `cajero`, que no reciben ese seed de trucks,
quedaban con 403 en catalogos sin que la causa fuera obvia. Separar el grant al seed de roles (donde el
rol se define) hace el origen explicito y evita que un dominio no relacionado sea la unica fuente de un
permiso transversal (DET-16: propagacion con contrato estable = donde corresponde, no acoplada a otro
side-effect).

## Where

- **Files**: `backend/jormat-api/seeds/10_demo_roles_users.ts` (grant correcto); evitar
  `backend/jormat-api/seeds/14_entities_trucks_capabilities.ts` como unica fuente de capabilities
  transversales
- **Tables**: `role_capabilities`
- **Layers**: backend (seeds/RBAC)

## When

Siempre que se defina o corrija un grant de capability para un rol demo/seed: preguntar si la capability
es del dominio del seed que se esta tocando o transversal. Si es transversal, el grant va al seed de
roles, decoupled del seed de dominio, respetando el orden seguro entre seeds (en este caso 04 < 10).

## Verification

- e2e con conteos exactos de capabilities por rol (`roles-config.e2e-spec.ts`) — cualquier grant nuevo o
  movido debe reflejarse en el conteo esperado del rol afectado.
- Review manual: grep de la capability en todos los archivos `seeds/*.ts` — debe aparecer una unica vez,
  en el seed del dominio al que pertenece (o en el seed de roles si es transversal).

## Source

- **Discovered in**: JOR-152, Session 1 (detectado por el orquestador al verificar la premisa del ticket)
- **Evidence**: `catalogos:view` SI se sembraba, pero acoplada a `entities.trucks:edit` en `seeds/14`;
  solo `vendedor` y `cajero` quedaban con 403. Fix: grant movido a `seeds/10_demo_roles_users.ts`
  (commit `dec6658`), verificado con conteos exactos en `roles-config.e2e-spec.ts` (commit `7be6be7`)
- **Related**: DET-16 (propagacion con contrato estable)
