---
id: KT-017-SPEC
project: kanai_test
ticket: KT-017
status: approved
---

# normalizeText: normalizador de texto en el sandbox kanai_test

## Resumen ejecutivo

Se agrega al sandbox kanai_test una utilidad nueva `normalize.mjs` que exporta `normalizeText(text)`: recorta extremos, colapsa cualquier secuencia de espacios/tabs/saltos de linea en un solo espacio, devuelve cadena vacia para texto vacio o solo-espacios, y lanza TypeError mencionando text cuando el argumento no es string. Se agrega `normalize.test.mjs` con node --test (un test por caso pedido) y se documenta la funcion en el README con un ejemplo, agregando una seccion nueva sin reescribir lo existente. NO se modifica greet.mjs, words.mjs ni sus tests; no se cambian el package.json, el script npm test ni las secciones previas del README. Se sabe que funciona cuando `node --test kanai_test/normalize.test.mjs` pasa con los 6 casos y el README muestra la seccion de normalizeText junto a las de greet/farewell/shout/countWords. Tamano: chico, 2 sesiones (codigo+tests, documentacion).

## Requirements

### REQ-01 `confirmed`
> Fuente: kanai_test/words.mjs:3

`kanai_test/normalize.mjs` exporta `normalizeText(text)` que devuelve el texto con los extremos recortados y toda secuencia de espacios, tabulaciones o saltos de linea colapsada a un solo espacio; un texto vacio o compuesto solo por espacios en blanco devuelve cadena vacia.

### REQ-02 `confirmed`
> Fuente: kanai_test/words.mjs:2

`normalizeText` lanza `TypeError` con un mensaje que menciona text cuando el argumento no es un string.

### REQ-03 `confirmed`
> Fuente: kanai_test/README.md:14

El README documenta `normalizeText` en una seccion nueva con un ejemplo de uso, conservando intactas las secciones ya existentes (greet, farewell, shout, countWords).

### REQ-04 `confirmed` `enforcement`
> Fuente: kanai_test/words.test.mjs:3

El cambio sigue los patrones del sandbox existente: modulo ESM `.mjs` con export nombrado, validacion de tipo con guard clause al inicio y TypeError, y tests con `node --test` + `node:assert/strict` al estilo de words.test.mjs, sin tocar greet.mjs, words.mjs ni sus tests ni el script `npm test`.
## Tasks

#### S1.T1 — Crear `kanai_test/normalize.mjs` que exporte `normalizeText(text)`: guard clause inicial que lanza `TypeError` mencionando text si `typeof text !== 'string'` (mismo patron que kanai_test/words.mjs:2), luego `text.trim().replace(/\s+/g, ' ')`, lo que ya cubre el caso de cadena vacia y solo-espacios.
Contrato: rollback: Borrar kanai_test/normalize.mjs (archivo nuevo, no hay consumidores previos).. Status: done

#### S1.T2 — Crear `kanai_test/normalize.test.mjs` con `node --test` y `node:assert/strict`, importando desde './normalize.mjs' al estilo de kanai_test/words.test.mjs:3, con un test por caso: texto simple, varios espacios entre palabras, saltos de linea y tabulaciones, texto vacio, solo espacios, y valor que no es string (assert.throws con TypeError y mensaje que contiene 'text', como kanai_test/words.test.mjs:25).
Contrato: rollback: Borrar kanai_test/normalize.test.mjs (archivo nuevo); no altera la suite existente.. Status: done

#### S2.T1 — Agregar al final de `kanai_test/README.md` una seccion nueva para `normalizeText` siguiendo el formato de las secciones existentes (ver countWords en kanai_test/README.md:14), con la firma, la descripcion de los tres comportamientos (trim, colapso de blancos, TypeError si no es string) y un ejemplo concreto: entrada `'  hola   \n mundo  '` -> salida `'hola mundo'`. No reescribir ni reordenar el contenido previo.
Contrato: rollback: `git checkout -- kanai_test/README.md` para volver a la version anterior del archivo.. Status: done

#### S2.T2 — Regresion de cierre de la documentacion: re-correr los tests de normalize y los de words para confirmar que la edicion del README no rompio nada y que greet.mjs, words.mjs y sus tests siguen sin modificarse.
Contrato: rollback: No aplica: la task no modifica archivos; si detecta un fallo, se revierte la task que lo introdujo.. Status: done
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2

**Gate (auto)**: `node --test kanai_test/normalize.test.mjs` pasa con los 6 casos (simple, espacios multiples, saltos y tabs, vacio, solo espacios, no-string) y normalize.mjs exporta normalizeText.

### Session 2 · T0 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2

**Gate (auto)**: El README del sandbox muestra la seccion de normalizeText con su ejemplo y las secciones previas intactas; la suite de normalize sigue pasando.
