---
id: RULE-mods-073
project: up1
type: rule
module: mods
level: should
tags:
  - correctness
  - single-source-of-truth
  - sql
  - prisma
  - vigencia
  - curriculum-mapping
---

# "Vigente" (o cualquier predicado que valga en memoria Y en la base) es UNA definición, y se escribe con lo que la BASE puede expresar

## What

Un predicado de dominio que tiene que decidir tanto en memoria como en una query MUST tener una sola definición, compartida por el predicado en memoria y por el fragmento de `where`, y esa definición se escribe con lo que la base puede expresar sin normalizar en un solo lado. Concretamente para "vigente" en `matrixAdoption`:

- La definición vive en `isInForceOn` (predicado) + `inForceWhere` (el objeto literal de `where`, que no rompe la pureza del helper). La consulta SQL de disponibles queda fijada por test contra esa misma definición.
- El límite temporal es INCLUSIVO (una fila que termina hoy todavía rige, si no un alta del mismo día compartiría la fecha de corte) y el `effectiveTo` vacío cuenta como abierto.
- El lado tolerante no es el generoso, es el que DIVERGE: `isInForceOn` dejó de trimear porque `inForceWhere` y el SQL crudo no pueden trimear sin tirar el índice. Si un lado normaliza y el otro no, el mismo valor sale vigente en memoria y cerrado en la query.
- "Cerrada" es literalmente "no vigente": `assertAdoptionOpen`/`isAlreadyClosed` niegan `isInForceOn`, no preguntan `isBlank(effectiveTo)` (una fila con cierre FUTURO sigue rigiendo hoy). La fecha de referencia es obligatoria: un default la haría caer sin ruido.

## Why

En UPONE-1689 (AD-17, AD-20) la definición de "vigente" estaba escrita a mano en cuatro lugares y en tres como `effectiveTo IS NULL`, que NO es lo mismo: una fila cerrada con fecha futura sigue rigiendo. De esa única causa salían dos agujeros: (a) el alta leía la fila como terminada, creía el plan libre y creaba una segunda vigencia solapada (o chocaba la unique `[competencyNodeId, curriculumId, effectiveFrom]` y tumbaba el lote entero con un P2002 que el front muestra como "ocurrió un error inesperado"); (b) cerrar/eximir no miraban el `effectiveTo` que ya leían, así que por API se podía reescribir el término a una vigencia cerrada, que es evidencia de acreditación.

La reintroducción por tolerancia de un solo lado (AD-20): con un `effectiveTo` de puros espacios (escribible por el CRUD generic y el MCP, porque el campo no declara `trim`), la fila salía vigente en memoria y cerrada en las consultas, justo el bug que AD-17 existe para cerrar. Y no se veía porque el test de equivalencia recorría seis valores y ninguno era el que divergía: pasaba en verde SOBRE la grieta que decía cubrir (misma disciplina que [[rule-mods-072]]: el test tiene que ejercitar el valor que rompe, ahora incluye `'   '`).

## Where

- `mods/curriculum-mapping/logic/helpers/validateMatrixAdoption.js` (`isInForceOn`, `inForceWhere`)
- `mods/curriculum-mapping/logic/matrixAdoption.resolver.js` (consulta de disponibles y guards de alta/cierre/exención)
- `mods/curriculum-mapping/logic/helpers/reconcileAdoptions.js` (`isCurrent` del reconciliador, migrado a la definición única)
- `mods/curriculum-mapping/CLAUDE.md` AD-17, AD-20
- Aplica a cualquier predicado de un mod que se evalúe tanto en JS como en una query (vigencia, activo, borrado lógico, ventana de fechas).

## When

Al definir o tocar un predicado que decide en memoria y en la base. En code review: si el mismo concepto aparece escrito dos veces (una en JS, otra en el `where`) con formas que pueden divergir (trim vs no-trim, `IS NULL` vs comparación de fecha, inclusivo vs exclusivo), es un hallazgo; pedí la definición única + el test que recorra el valor que las hace divergir.
