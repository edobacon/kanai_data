---
id: RULE-mods-070
project: up1
type: rule
module: mods
tags:
  - curriculum-mapping
  - rbac
  - field-level
  - capabilities
  - datalog
---

# Cuando una columna la resuelve una query lateral del front sobre otro objeto, otorgar la capability de CAMPO, no la del objeto completo

## What

Si una columna de un layout (tipicamente un tab de Historial sobre `core_DataLog`) resuelve su valor
con una query lateral del front hacia OTRO objeto (por ejemplo, `core_User` para mostrar un nombre a
partir de un `userId` numerico sin relacion Prisma), la capability de lectura que se otorga MUST ser
la de CAMPO especifico (`core_user.name:view`), nunca la de objeto completo (`core_user:view`).

## Why

`core_DataLog.userId` es un `Int` sin relacion a `core_User`, asi que el nombre del autor lo resuelve
el front: el composable de layout arma un mapa `id -> name` con un `listInstances(core_User)` aparte.
Otorgar la capability de OBJETO completo pasaria el gate, pero `listInstances` expondria a quien
consulte esa columna el email, telefono, programa, cohorte y `clerkUserId` de TODOS los usuarios del
tenant, aunque el front solo lea `name`. La capability de CAMPO alcanza para pasar el gate de objeto
(el `authChecker` deja entrar a quien tenga cualquier field-cap de la accion) y limita lo que
`listInstances` devuelve a `name` solamente.

Sin ninguna de las dos capabilities, la columna "Usuario" del tab Historial queda vacia SIN error
visible: el catch del composable deja el cache en `error` y cada celda renderiza `''`, dando la
impresion de que el DataLog no registro al autor cuando en realidad si lo hace (la fila trae el
`userId`, solo que el front no pudo resolver el nombre).

Evidencia verificada en `curriculum-mapping/seed/_data-rbac.js:74-92`: `READ_CAPS` incluye
`'core_user.name:view'` con un comentario extenso que documenta exactamente este razonamiento.

Ticket: UPONE-1454.

## Where

- `curriculum-mapping/seed/_data-rbac.js` (implementacion de referencia, `READ_CAPS`).
- Cualquier layout del mod con un tab de Historial (`objectName: core_DataLog`) que muestre una
  columna resuelta por query lateral sobre otro objeto.

## When

Al declarar las capabilities de lectura de un rol que necesita ver un tab de Historial u otra vista
cuya columna dependa de una resolucion lateral hacia un objeto distinto al que se esta listando.
Verificar primero si el campo mostrado tiene una capability de CAMPO declarada en el objeto destino
antes de otorgar la capability de objeto completo.
