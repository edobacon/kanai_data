---
id: RULE-platform-028
project: up1
type: rule
module: platform
tags:
  - report-builder
  - rbac
  - visibility
  - fail-closed
  - backfill
  - migration
---

# La visibilidad de Report/ReportTemplate es fail-closed: introducir un default de este tipo exige backfill de los datos existentes

## What

`Report` y `ReportTemplate` tienen tres estados de visibilidad, en orden de precedencia: `isPublic: true` (todos en el tenant), owner-match (`createdById` del registro), y `visibleToRoles` (coincidencia de rol). Si ninguno aplica, el registro **no se ve**: `visibleToRoles: []` sin `isPublic` y sin ser el creador significa privado, no "visible a todos".

Al introducir un contrato fail-closed de este tipo sobre un campo que antes tenia otro significado implicito, el cambio de default **no es solo codigo**: exige un backfill que fije explicitamente el estado anterior en los datos ya existentes, o el deploy oculta reportes que antes eran visibles.

## Why

Antes de este cambio, `visibleToRoles` vacio se interpretaba como "sin restriccion adicional" y el registro quedaba visible a todos (fail-open). El comentario del propio fix lo deja explicito: "the last line is the part that changed: an empty `visibleToRoles` used to mean still visible to everyone [...] A row with no owner and no roles is now visible to nobody but a public flag, which fails closed" (`reportVisibility.js:37-40`). Sin backfill, cualquier tenant con templates existentes que tuvieran `visibleToRoles: []` y `isPublic` sin setear (default `null`/`false` antes de la migracion) quedaba con esos reportes ocultos tras el deploy, para todos salvo el creador original.

Por eso `seed/backfill-implicit-public-visibility.js` es parte obligatoria del mismo cambio: migra los datos existentes a `isPublic: true` explicito para preservar el comportamiento anterior, en vez de dejar que el nuevo default los oculte.

## Where

- `report-builder/logic/reportVisibility.js:43-56` (`canViewTemplateForRoleNames`, orden de precedencia y comentario del cambio de semantica en `:30-41`), `:58-72` (`buildTemplateVisibilityWhere`, construccion del `WHERE` de Prisma con la misma logica)
- `report-builder/objects/Report.json:92-106` (campos `isPublic` boolean y `visibleToRoles` string[], con nota en la descripcion de que "supersede" el gate legacy `<code>:view` de UPONE-1225, mantenido activo por compatibilidad hasta migrar sus grants)
- `report-builder/seed/backfill-implicit-public-visibility.js` (migracion de datos existentes)

## When

Al introducir cualquier campo de visibilidad/permiso nuevo cuyo valor "vacio" hoy se interpreta de forma implicita (por ausencia de chequeo) y pasa a interpretarse explicitamente (fail-closed). Verificar siempre si hay datos existentes que dependian del comportamiento implicito anterior, y acompañar el cambio de contrato con su backfill en el mismo ticket.
