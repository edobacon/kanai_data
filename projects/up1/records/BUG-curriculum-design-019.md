---
id: BUG-curriculum-design-019
project: up1
type: bug
module: curriculum-design
---

**Origen:** learn raw de UPONE-1615 (TICKET-133). Blocker de plataforma, fuera de alcance mod.

## Sintoma

Mapear Admin/Consultor a un perfil compuesto acotado (Diseñador ∪ Autoridad, ~70-90 caps) **NO reduce**
su efectivo: su techo real siguen siendo los ~166 caps directos que el core repone. Por eso Consultor
tiene los mismos ~166 caps que Admin.

## Causa raiz (en core)

`assignNewCapabilitiesToDefaultRoles` en `object-manager/src/services/auth/generateCapabilities.js:331-357`
define `DEFAULT_ROLES = ['Admin','Consultor','Colaborador']` y hace upsert de `core_RoleCapability` con
`defaultValue:'allow'` por cada capability generada (misma logica replicada en `dbSync.js`). Cada
generacion de capabilities repone TODOS los directos.

## Consecuencias

1. Mapear Admin/Consultor a un perfil compuesto no recorta su efectivo.
2. Retirar esos directos desde el mod es inutil: la siguiente generacion los recrea.
3. El estado deseado (roles default sin directos; permisos solo via core_Role -> up1_suite_app_role ->
   core_ModRole -> caps) NO es alcanzable en alcance mod.

## Que se hizo en el mod (future-proof)

El cableado del mod queda correcto: Admin/Consultor se mapean al perfil compuesto (visibilidad de app por
profile-gating). El dia que core saque a Admin/Consultor de `DEFAULT_ROLES`, caen automatico a lo que el
compuesto concede, sin retrabajo. Es tambien el fundamento de excluir a Admin/Consultor del smoke de
scoping (darian falso verde).

## Accion (core, cross-cutting)

Sacar a Admin/Consultor de `DEFAULT_ROLES` en core (afecta todos los mods y tenants) para que su efectivo
lo determine el perfil. Reportar como ticket de plataforma / coordinar con UPONE-1633 (objetos nuevos
engordan Consultor por este mismo mecanismo). Relacionado: `RULE-curriculum-design-052`, notas de core en
`kb/sp10`.
