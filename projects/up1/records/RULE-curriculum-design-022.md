---
id: RULE-curriculum-design-022
project: up1
type: rule
module: curriculum-design
tags:
  - seed
  - idempotency
  - prisma
  - findFirst
  - composite
  - mod
---

# El seed de un objeto debe ser idempotente: owner determinista + guard global por label

## What

Un seed de mod (`seed/_data-*.js`) que crea filas debe ser **idempotente ante corridas repetidas** (cada `sync`/`reset-mods` re-ejecuta el seed). Dos requisitos:

1. **Resolución de owner/ancla DETERMINISTA**: si el seed resuelve la entidad dueña con `prisma.X.findFirst({ where: {...} })`, agregar `orderBy: { id: 'asc' }` (u otro orden estable). `findFirst` SIN `orderBy` devuelve una fila **arbitraria** en Postgres — puede variar entre corridas.
2. **Guard de existencia GLOBAL, no acotado al owner resuelto**: el chequeo "¿ya existe?" debe basarse en un identificador estable del dato sembrado (ej. `label`/`name`/`code`), NO en el `ownerId` recién resuelto. Si el guard filtra por `ownerId` y el owner se resolvió de forma no determinista, en la 2ª corrida toma otro owner, el guard no encuentra el dato previo, y **re-siembra** (duplica).

## Why

Caso real (TICKET-083): `_data-requirement.js` resolvía el owner con `Activity.findFirst({ where: { recordType: 'Course' } })` (sin `orderBy`) y el guard era `findFirst({ where: { ownerType, ownerId: activity.id, label, parentId: null } })`. Al re-correr el seed (reset+sync), `findFirst` tomó una Activity distinta → el guard por-owner no halló la raíz previa → replantó el árbol EST200 completo bajo otra activity (2 árboles, 17 filas vs 9 esperadas). El bloque electivo, cuyo owner (Curriculum Plan) se resolvía estable, SÍ fue idempotente — confirmando que la causa era la no-determinación del owner + el guard por-owner.

## Where

- Seeds del mod: `mods/curriculum-design/seed/_data-*.js`.
- Patrón correcto en `seed/_data-requirement.js` (post-fix `0614c55`): guard `findFirst({ where: { ownerType: 'activity', label: 'Requisitos EST200', parentId: null } })` (sin `ownerId`) + `Activity.findFirst({ ..., orderBy: { id: 'asc' } })`.
- Nota: `_data-malla.js` (MC-02) usa guard por `[curriculumId, name]` — idempotente porque su owner (Plan) se resuelve estable; aún así, agregar `orderBy` al `findFirst` del Plan lo blinda.

## When

Al escribir o revisar cualquier seed de mod que: (a) resuelva una entidad ancla con `findFirst`, y/o (b) cree filas que no deben duplicarse en re-corridas. Especialmente seeds de objetos Composite (árboles por `parentId`), donde una raíz duplicada arrastra todo el subárbol.

## Verification

Correr el seed DOS veces (o `reset-mods` dos veces) y contar filas: el segundo run NO debe incrementar el conteo. `SELECT ownerId, count(*) ... GROUP BY ownerId` no debe mostrar el mismo árbol bajo owners distintos.

## Source

TICKET-083 (MC-03 / UPONE-1346), learn L9 — duplicación detectada en verificación DB-gated tras `reset-full` del dev; fix `0614c55`.
