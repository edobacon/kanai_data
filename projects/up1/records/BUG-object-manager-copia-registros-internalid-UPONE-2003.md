---
id: BUG-object-manager-copia-registros-internalid-UPONE-2003
project: up1
type: bug
module: object-manager/copy-engine
tags:
  - UPONE-2003
  - TICKET-158
  - clone
  - internalId
---

Los puntos de copia (raíz, raíz de RecordType, hijos directos y polimórficos, filas derivadas y proyecciones rt/ext) copiaban la columna autoincrement internalId del origen y violaban su unicidad. La constante DB_MANAGED_FIELDS (['internalId']) se aplica siempre en los helpers deepClone*, y el resolver solo pasa el exclude del mod. La lista no se deriva del esquema: debe crecer si aparece otra columna asignada por la base o si un objeto se aparta de la convención de nombre.

Fuente: 46a6d026 src/graphql/resolvers/helpers/db-managed-fields.js:1-21.
