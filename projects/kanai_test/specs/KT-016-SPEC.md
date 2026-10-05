---
id: KT-016-SPEC
project: kanai_test
ticket: KT-016
status: approved
---

# countWords: utilidad de conteo de palabras con tests y documentacion

## Resumen ejecutivo

Se agrega al sandbox words.mjs con countWords(text), su archivo de tests words.test.mjs para node --test y un apartado nuevo en el README con un ejemplo de uso. NO se toca greet.mjs ni sus tests, no se cambia la config de npm test ni se reescribe el README existente: solo se le suma una seccion. Se sabe que funciona cuando: countWords('hola  mundo\n\tde\nprueba') devuelve 4, countWords('   ') devuelve 0, countWords(42) lanza TypeError con 'text' en el mensaje, y npm test corre verde con los seis casos pedidos. Tamano estimado: chico, dos sesiones cortas (codigo + tests, luego documentacion). Advertencia fuera de alcance: no se agrega build, lint ni tipos; si el repo exigiera un indice de exports, queda como hallazgo a confirmar, no como requirement.

Datos a confirmar antes de ejecutar:
- Ruta raiz exacta del sandbox donde viven greet.mjs y el package.json con el script test: confirmar al aprobar el spec (el pedido la nombra como 'el sandbox', sin ruta literal).
- Si el script test del package.json es 'node --test' a secas o apunta a un glob especifico: confirmar leyendo package.json antes de escribir words.test.mjs.

## Requirements

### REQ-01 `confirmed`
> Fuente: Request KT-016, seccion Pedido, punto 1 (Codigo)

words.mjs exporta countWords(text) que devuelve la cantidad de palabras separadas por uno o mas espacios, tabulaciones o saltos de linea, ignorando los espacios del principio y del final, y devuelve 0 para texto vacio o solo con espacios.

### REQ-02 `confirmed`
> Fuente: Request KT-016, seccion Pedido, punto 1 (Codigo), ultimo bullet

countWords lanza un TypeError cuyo mensaje menciona 'text' cuando el argumento recibido no es un string.

### REQ-03 `confirmed`
> Fuente: Request KT-016, seccion Pedido, punto 2 (Tests)

words.test.mjs corre con node --test (via npm test del repo) y tiene un test por caso: texto simple, varios espacios entre palabras, saltos de linea y tabulaciones, texto vacio, solo espacios y un valor que no es string.

### REQ-04 `confirmed`
> Fuente: Request KT-016, seccion Pedido, punto 3 (Documentacion)

El README documenta countWords con un ejemplo de uso, agregando contenido nuevo sin reescribir ni reordenar lo existente.

### REQ-05 `inferred` `enforcement`
> Fuente: greet.mjs y greet.test.mjs del sandbox (no leidos aun; verificar estilo real antes de escribir)

El cambio no toca greet.mjs ni sus tests, y words.mjs sigue el estilo del modulo existente del sandbox: ESM con export nombrado, misma extension .mjs y mismas convenciones de import en los tests (node:test y node:assert).
## Tasks

#### S1.T1 — Crear words.mjs en la raiz del sandbox (junto a greet.mjs) exportando countWords(text): validar primero que typeof text === 'string' y, si no, lanzar TypeError con un mensaje que incluya la palabra text; luego hacer trim y, si queda vacio, devolver 0; si no, partir por la expresion de espacios en blanco /\s+/ y devolver la cantidad de fragmentos. Usar ESM con export nombrado, igual que greet.mjs.
Contrato: rollback: rm words.mjs (archivo nuevo, no toca nada existente).. Status: done

#### S1.T2 — Crear words.test.mjs con node --test (import test desde node:test y assert desde node:assert, mismo estilo que el test de greet) con un test por caso: 'hola mundo' devuelve 2; 'hola   mundo' con varios espacios devuelve 2; 'uno\ndos\tres' con salto de linea y tabulacion devuelve 3; '' devuelve 0; '   ' solo espacios devuelve 0; y countWords(42) lanza TypeError cuyo message contiene 'text' (assert.throws con el chequeo del mensaje, no solo del tipo).
Contrato: rollback: rm words.test.mjs (archivo nuevo).. Status: done

#### S2.T1 — Agregar al README una seccion para countWords que describa que cuenta palabras separadas por espacios, tabulaciones o saltos de linea, que ignora los espacios de los extremos, que devuelve 0 para texto vacio o solo espacios y que lanza TypeError si text no es string; incluir un bloque de ejemplo con import { countWords } from './words.mjs' y al menos una llamada con su resultado (countWords('hola mundo') devuelve 2). Solo agregar: no reescribir, reordenar ni reformatear el contenido existente.
Contrato: rollback: git checkout -- README.md (o borrar la seccion agregada; no hay otros archivos tocados).. Status: pending

#### S2.T2 — Regresion acotada de la utilidad: correr el archivo de tests de words y confirmar que los seis casos siguen pasando despues del cambio de documentacion, y que greet.mjs y greet.test.mjs no aparecen modificados en el working tree.
Contrato: rollback: Nada que revertir: la task solo ejecuta tests y lecturas de estado; si detecta un fallo, se revierte la task que lo introdujo.. Status: pending
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2

**Gate (auto)**: words.mjs existe y exporta countWords; node --test words.test.mjs pasa los seis casos (texto simple, espacios multiples, saltos y tabs, vacio, solo espacios, no-string con TypeError).

### Session 2 · T0 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2

**Gate (auto)**: El README tiene una seccion nueva de countWords con un ejemplo concreto, el contenido previo intacto (git diff solo con lineas agregadas) y la suite de words sigue verde.
