---
id: BUG-object-manager-softdelete-nested-reads-UPONE-1739
project: up1
type: bug
module: object-manager
---

Un $extends de Prisma solo dispara para el modelo top-level de una operacion. Un modelo soft-deletable leido via include/select devolvia filas borradas, sin forma de limpiarlas desde la UI. Fix: los hooks de lectura recorren el arbol include/select e inyectan where:{<flag>:true} en cada relacion cuyo modelo destino tiene soft delete, a cualquier profundidad, cruzando modelos intermedios sin flag propio (copy-on-write). El mapa relacion-a-modelo sale de core_FieldDefinition (no hay DMMF en clientes tenant-scoped). Un nombre de relacion ambiguo se deja SIN filtrar (default seguro). runWithIncludeInactive sigue bypaseando todo. Verificado en UPU: lectura anidada de 2 filas soft-deleted ahora devuelve 0.

**sourceRef:** 1bbcf64f + src/services/tenantManager.js; docs/features/soft-delete.md.
