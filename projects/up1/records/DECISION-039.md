---
id: DECISION-039
project: up1
type: decision
module: mods
tags:
  - rbac
  - roles
  - permisos
  - migracion
  - curriculum-design
---

# Migración de esquema de roles/permisos con red de seguridad: declarar nuevo antes de retirar viejo

## Contexto

Cambiar el esquema de roles o de sets de permisos de un tenant en vivo (renombrar, reagrupar,
reasignar capacidades entre sets) es sensible: un paso mal ordenado deja usuarios sin acceso o con
acceso de más entre una corrida de sync y la siguiente. El caso de sp9 (UPONE-1615, mapeo de roles
core y Learning Assurance) obligó a fijar un orden de migración que no dependiera de que todo saliera
bien en un solo paso.

## Decision

Toda migración de esquema de roles/permisos sigue cinco pasos, con **convivencia temporal** del
mecanismo viejo y el nuevo antes de retirar nada:

1. **Declarar el nuevo** (rol/set) sin tocar el viejo.
2. **Decidir la visibilidad** del nuevo (qué apps/roles lo ven), aún sin migrar asignaciones.
3. **Vincular** las asignaciones al nuevo esquema.
4. **Verificar** en runtime (estado real en la BD del tenant, no solo el JSON declarativo) que el
   nuevo esquema entrega exactamente el acceso esperado.
5. **Retirar el viejo** recién cuando el nuevo quedó verificado.

El viejo y el nuevo conviven entre los pasos 1 y 5. El retiro (paso 5) es un retiro en core sujeto a
[[RULE-platform-031]] (el merge del sync no lo quita solo) y a la auditoría de [[DET-40]].

## Alternativas descartadas

- **Swap directo** (renombrar/reasignar en un paso): descartada. No hay punto de verificación entre
  "quité el viejo" y "el nuevo funciona"; si el nuevo falla, el tenant queda sin el acceso viejo.
- **Migrar sin leer runtime** (confiar en el JSON declarativo): descartada. En sp9 un rol
  institucional fantasma se había auto-creado por sync sin aparecer en la config declarativa; solo la
  lectura del estado real de la BD lo detectó (enlaza [[DET-5]], multi-capa incluye runtime).

## Origen

sp9 up1, `UPONE-1615-decisiones-de-roles-po.md` y `UPONE-1615-inventario-de-roles.md`.
