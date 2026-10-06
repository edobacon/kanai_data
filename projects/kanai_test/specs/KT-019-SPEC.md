---
id: KT-019-SPEC
project: kanai_test
ticket: KT-019
status: approved
---

# textReport: reporte de texto en el sandbox kanai_test

## Resumen ejecutivo

Se agrega `kanai_test/text-report.mjs` con `textReport(text)`, que importa `normalizeText` de `normalize.mjs` y `countNormalizedWords` de `normalized-count.mjs` y devuelve `{ normalized, words, characters }`; se cubre con `kanai_test/text-report.test.mjs` (siete casos con `node --test`) y se documenta en `kanai_test/README.md` con un ejemplo. NO se modifican `normalize.mjs`, `normalized-count.mjs`, `greet.mjs` ni sus tests, ni se reescribe el README existente (solo se agrega una seccion). Se sabe que funciona cuando `node --test kanai_test/text-report.test.mjs` pasa los 7 tests y el ejemplo del README coincide con la salida real de `textReport`. Trabajo sobre la rama acumuladora epic/KT-ACUM, que ya debe tener integrados normalize.mjs y normalized-count.mjs. Tamano: 2 sesiones cortas (T1), 1 archivo de codigo + 1 de tests + 1 seccion de README.

Datos a confirmar antes de ejecutar:
- Formato exacto del encabezado de seccion del README (nivel de heading y orden) a confirmar leyendo `kanai_test/README.md:19-41` antes de escribir, para seguir el patron de las secciones `normalizeText` y `countNormalizedWords`.
- Nombre del script de test del repo (`npm test`) y su alcance, a confirmar en el `package.json` del sandbox antes de correr la regresion.

## Requirements

### REQ-01 `confirmed`
> Fuente: kanai_test/normalized-count.mjs:5

`textReport(text)` exportado desde `kanai_test/text-report.mjs` devuelve un objeto con `normalized` (texto normalizado), `words` (cantidad de palabras) y `characters` (longitud de `normalized`).

### REQ-02 `confirmed`
> Fuente: kanai_test/normalize.test.mjs:3

Un texto vacio o compuesto solo por espacios en blanco devuelve `{ normalized: '', words: 0, characters: 0 }`; si `text` no es string, `textReport` deja pasar el `TypeError` que lanza `normalizeText` sin capturarlo ni reemplazarlo.

### REQ-03 `confirmed`
> Fuente: kanai_test/README.md:30

`kanai_test/README.md` documenta `textReport` en una seccion nueva con un ejemplo de uso y su salida, siguiendo el patron de las secciones existentes, sin modificar ni reordenar el contenido ya publicado.

### REQ-04 `confirmed` `enforcement`
> Fuente: kanai_test/normalized-count.mjs:3

`text-report.mjs` obtiene la normalizacion y el conteo importando `normalizeText` de `./normalize.mjs` y `countNormalizedWords` de `./normalized-count.mjs`; no reimplementa ni copia esa logica y no modifica `normalize.mjs`, `normalized-count.mjs`, `greet.mjs` ni sus tests.
## Tasks

#### S1.T1 — Crear `kanai_test/text-report.mjs` que exporte `textReport(text)`: importa `normalizeText` desde `./normalize.mjs` y `countNormalizedWords` desde `./normalized-count.mjs` (sin copiar su logica), normaliza una sola vez y devuelve `{ normalized, words: countNormalizedWords(text), characters: normalized.length }`. Texto vacio o solo espacios cae naturalmente en `{ normalized: '', words: 0, characters: 0 }`; no capturar el `TypeError` de `normalizeText` cuando `text` no es string. No tocar `normalize.mjs`, `normalized-count.mjs`, `greet.mjs` ni sus tests.
Contrato: rollback: `git rm kanai_test/text-report.mjs` (archivo nuevo, ningun otro archivo cambia; ningun consumidor previo lo importa).. Status: done

#### S1.T2 — Crear `kanai_test/text-report.test.mjs` con `node --test` (estilo de `kanai_test/normalized-count.test.mjs:3`) y exactamente 7 tests, uno por caso: (1) texto simple `'hola mundo'`, (2) varios espacios `'hola    mundo'`, (3) saltos de linea y tabulaciones `'hola\n\tmundo'`, (4) texto vacio `''`, (5) solo espacios `'   '`, (6) un numero `42` como valor que no es string (espera `TypeError`), (7) `null` y `undefined` juntos en un mismo test (ambos esperan `TypeError`). Assertions con valores concretos sobre los tres campos. No agrupar otros casos ni agregar tests extra.
Contrato: rollback: `git rm kanai_test/text-report.test.mjs` (archivo nuevo; no altera las suites existentes).. Status: done

#### S2.T1 — Agregar al final de `kanai_test/README.md` una seccion `textReport` siguiendo el patron de las secciones `normalizeText` (README.md:19) y `countNormalizedWords` (README.md:39): import desde `text-report.mjs`, ejemplo `textReport('hola mundo')` con su salida `{ normalized: 'hola mundo', words: 2, characters: 10 }`, y una linea indicando que un texto vacio o solo con espacios devuelve `{ normalized: '', words: 0, characters: 0 }` y que un valor que no es string lanza `TypeError`. No reescribir ni reordenar el contenido existente.
Contrato: rollback: `git checkout -- kanai_test/README.md` (revierte solo las lineas agregadas; ningun archivo de codigo cambia).. Status: pending

#### S2.T2 — Verificar que el ejemplo documentado coincide con la salida real y que la suite del sandbox sigue en verde: correr los tests del reporte y los de los dos modulos reusados para confirmar que no se tocaron.
Contrato: rollback: No aplica: la task no modifica archivos (solo ejecuta tests); si falla, revertir la task de README con `git checkout -- kanai_test/README.md`.. Status: pending
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2

**Gate (auto)**: En la rama epic/KT-ACUM, `node --test kanai_test/text-report.test.mjs` pasa los 7 tests y `textReport('hola\n\tmundo')` devuelve `{ normalized: 'hola mundo', words: 2, characters: 10 }`.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2

**Gate (auto)**: `kanai_test/README.md` muestra, debajo de las secciones existentes, la seccion `textReport` con ejemplo de uso y salida; `git diff kanai_test/README.md` solo agrega lineas.
