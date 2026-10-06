---
id: KT-018-SPEC
project: kanai_test
ticket: KT-018
status: approved
---

# countNormalizedWords: contador de palabras sobre texto normalizado en el sandbox kanai_test

## Resumen ejecutivo

Se agrega al sandbox kanai_test un contador de palabras (normalized-count.mjs) que reusa normalizeText de normalize.mjs por import, sus tests con node --test y una seccion nueva en el README. NO se toca normalize.mjs, greet.mjs ni sus tests, no se duplica la logica de normalizacion y no se reescribe lo ya documentado. Se verifica con `node --test kanai_test/normalized-count.test.mjs` (6 casos: texto simple, varios espacios, saltos y tabs, vacio, solo espacios, no string) y con `npm test` del sandbox pasando tambien normalize.test.mjs. Tamano: 2 sesiones cortas (T1 codigo+tests, T0 documentacion), 4 tareas, 1 archivo nuevo de codigo, 1 de tests y una seccion agregada al README. ADVERTENCIA (fuera de alcance, no se implementa): en la rama acumuladora epic/KT-ACUM solo existen greet.mjs y normalize.mjs; words.mjs/countWords no esta presente pese a figurar como spec del modulo, asi que no hay nada que proteger ni integrar de ese lado. ADVERTENCIA: el texto normalizado se parte por un unico espacio, por lo que puntuacion y guiones cuentan dentro de la palabra; no se pide otro criterio y no se agrega.

Datos a confirmar antes de ejecutar: ninguno pendiente. Confirmados contra el repo: el runner es `node --test` declarado en el script `test` de kanai_test/package.json; normalize.mjs ya esta integrado en epic/KT-ACUM y exporta normalizeText con TypeError('text must be a string'); normalize.test.mjs tiene 5 tests verdes.

## Requirements

### REQ-01 `confirmed`
> Fuente: kanai_test/normalize.mjs:7

kanai_test/normalized-count.mjs exporta countNormalizedWords(text) que devuelve la cantidad de palabras del texto ya normalizado (separadas por un solo espacio), y 0 cuando el texto queda vacio.

### REQ-02 `confirmed`
> Fuente: kanai_test/normalize.mjs:4

Cuando text no es un string, countNormalizedWords deja propagar el TypeError de normalizeText sin capturarlo ni devolver un numero.

### REQ-03 `confirmed` `enforcement`
> Fuente: kanai_test/normalize.test.mjs:3

normalized-count.mjs obtiene la normalizacion importando normalizeText desde './normalize.mjs': no copia ni reimplementa el trim/colapso, y no modifica normalize.mjs, greet.mjs ni normalize.test.mjs.

### REQ-04 `confirmed`
> Fuente: kanai_test/normalize.test.mjs:1

kanai_test/normalized-count.test.mjs cubre con node --test un test por caso: texto simple, varios espacios entre palabras, saltos de linea y tabulaciones, texto vacio, solo espacios y un valor que no es string.

### REQ-05 `confirmed`
> Fuente: kanai_test/README.md:4

El README del sandbox documenta countNormalizedWords con su firma, su comportamiento y un ejemplo ejecutable, agregando una seccion nueva sin reescribir las existentes.
## Tasks

#### S1.T1 — Crear kanai_test/normalized-count.mjs con `export const countNormalizedWords = (text) => { ... }`: importa normalizeText desde './normalize.mjs' (no reimplementa trim ni replace), normaliza el texto y devuelve la cantidad de palabras separadas por un solo espacio; si el normalizado es cadena vacia devuelve 0; no envuelve la llamada en try/catch para que el TypeError('text must be a string') de normalize.mjs:5 se propague. Comentario en espanol al estilo de normalize.mjs:1-2. No tocar normalize.mjs, greet.mjs ni sus tests.
Contrato: rollback: Borrar kanai_test/normalized-count.mjs (archivo nuevo, no hay otro archivo modificado): `git checkout -- kanai_test/ && rm -f kanai_test/normalized-count.mjs`.. Status: done

#### S1.T2 — Crear kanai_test/normalized-count.test.mjs con node --test (import test from 'node:test' y assert from 'node:assert/strict', mismo estilo que normalize.test.mjs:1-3), un test por caso: 'hola mundo' -> 2; 'hola   mundo' con varios espacios -> 2; '  hola \n\t mundo  ' con saltos y tabs -> 2; '' -> 0; '   \t\n  ' -> 0; y 42 lanza TypeError cuyo mensaje incluye 'text'. Son 6 tests, uno por caso, sin agrupar.
Contrato: rollback: Borrar kanai_test/normalized-count.test.mjs: `rm -f kanai_test/normalized-count.test.mjs`.. Status: done

#### S2.T1 — Agregar al final de kanai_test/README.md una seccion `## countNormalizedWords` siguiendo el formato de la seccion normalizeText (README.md:4-22): bloque de firma `countNormalizedWords(text: string): number`, la frase 'Definida en `normalized-count.mjs`' con la nota de que normaliza con normalizeText de normalize.mjs, los bullets de comportamiento (cuenta palabras del texto normalizado; texto vacio o solo espacios devuelve 0; lanza TypeError si el argumento no es string) y un ejemplo con import desde './normalized-count.mjs' y resultado concreto. No editar ni reordenar el contenido existente.
Contrato: rollback: Revertir solo el README: `git checkout -- kanai_test/README.md`.. Status: pending

#### S2.T2 — Regresion de cierre del ticket: correr los tests del sandbox tocados por este trabajo y confirmar que el cambio de documentacion no altero codigo (git diff --name-only no debe listar normalize.mjs, greet.mjs ni normalize.test.mjs).
Contrato: rollback: No modifica archivos; si falla, revertir la tarea de README con `git checkout -- kanai_test/README.md`.. Status: pending
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2

**Gate (auto)**: En la rama epic/KT-ACUM, `node --test kanai_test/normalized-count.test.mjs` muestra 6 tests pasando (texto simple, varios espacios, saltos y tabs, vacio, solo espacios, no string) y `npm test` sigue verde con normalize.test.mjs.

### Session 2 · T0 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2

**Gate (auto)**: kanai_test/README.md muestra, debajo de la seccion normalizeText, una seccion nueva `## countNormalizedWords` con firma, comportamiento y ejemplo; `git diff kanai_test/README.md` solo agrega lineas.
