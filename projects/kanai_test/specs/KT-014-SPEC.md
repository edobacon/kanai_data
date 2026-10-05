---
id: KT-014-SPEC
project: kanai_test
ticket: KT-014
status: approved
---

# Despedida configurable: farewell.mjs con tests y documentación

## Resumen ejecutivo

Se agrega al sandbox una función `farewell(name, { punctuation } = {})` en un archivo nuevo `farewell.mjs`, análoga a `greet.mjs`: devuelve `Adiós, <nombre><puntuación>` con `.` por defecto, hace trim del nombre y lanza `Error` con mensaje claro si el nombre queda vacío. Se cubre con `farewell.test.mjs` usando el runner nativo `node --test` (el repo no tiene package.json ni dependencias) y se documenta el uso en el README con un ejemplo. NO se toca `greet.mjs` ni se agregan dependencias, build ni package.json. Se sabe que funciona cuando `node --test farewell.test.mjs` pasa con los cuatro casos pedidos (default, puntuación configurable, trim, nombre vacío) y el README muestra el ejemplo. Tamaño: una sesión corta (T1), tres tareas sobre un repo de tres archivos. Advertencia (fuera de alcance, no es requirement): `greet.mjs` usa fallback a 'mundo' en vez de lanzar error ante nombre vacío; la inconsistencia de criterio entre ambas funciones queda como observación, no se corrige.

Datos a confirmar antes de ejecutar:
- Acentuación literal de la salida: el request pide `Adiós, ` con tilde; confirmar al aprobar el spec que es el texto exacto esperado (no hay precedente en `greet.mjs`, que usa 'Hola, ').
- Texto del mensaje de error ante nombre vacío: el request pide "mensaje claro" sin fijar el literal; se propone `farewell: name is required`. Confirmar al aprobar el spec.

## Requirements

### REQ-01 `confirmed`
> Fuente: Request KT-014, punto 1 (Código) + pedido de enmienda: reemplazar el literal con signos de menor/mayor por una redacción con ejemplo concreto

`farewell.mjs` exporta `farewell(name, { punctuation } = {})` que devuelve la cadena 'Adiós, ' seguida del nombre ya recortado (trim) y la puntuación, cuyo valor por defecto es '.'; por ejemplo, `farewell('Ana')` devuelve 'Adiós, Ana.' y `farewell('Ana', { punctuation: '!' })` devuelve 'Adiós, Ana!'.

### REQ-02 `confirmed`
> Fuente: Pedido del ticket KT-014, punto 1 (nombre vacío lanza Error)

Si `name` es vacío, solo espacios, `undefined` o `null`, `farewell` lanza un `Error` con un mensaje que identifica la función y el parámetro faltante, en vez de devolver un saludo degradado.

### REQ-03 `confirmed`
> Fuente: Request KT-014, punto 3 (Documentación) + pedido de enmienda: la redacción del README no debe repetir el literal con signos de menor/mayor

El README documenta `farewell`: qué devuelve (la cadena 'Adiós, ' seguida del nombre recortado y la puntuación), el parámetro `punctuation` con su valor por defecto '.', el comportamiento ante nombre vacío, y un ejemplo de uso con import y salida esperada concreta (por ejemplo `farewell('Ana')` → 'Adiós, Ana.').

### REQ-04 `confirmed` `enforcement`
> Fuente: /Users/edobacon/Workspace/kanai/kanai_test_repo/greet.mjs y árbol del repo (solo README.md + greet.mjs, sin package.json)

`farewell.mjs` y su test siguen el patrón del sandbox: ESM con export nombrado, sin dependencias ni package.json, test con el runner nativo `node --test`; `greet.mjs` queda sin modificar.
## Tasks

#### S1.T1 — Crear `farewell.mjs` en la raíz de kanai_test_repo con `export const farewell = (name, { punctuation = '.' } = {}) => ...`: hace trim de name (tolerando undefined/null), lanza `new Error('farewell: name is required')` si el resultado del trim es vacío, y devuelve `Adiós, ${trimmed}${punctuation}`. Mantener el estilo de greet.mjs: ESM, export nombrado con arrow function, sin dependencias y sin crear package.json. No tocar greet.mjs.
Contrato: rollback: Borrar el archivo nuevo farewell.mjs (`git clean -f farewell.mjs`); el repo vuelve a README.md + greet.mjs sin otros cambios.. Status: done

#### S1.T2 — Crear `farewell.test.mjs` con el runner nativo `node --test` (import de `node:test` y `node:assert/strict`), con los cuatro casos pedidos: (1) farewell('Ana') === 'Adiós, Ana.'; (2) farewell('Ana', { punctuation: '!' }) === 'Adiós, Ana!'; (3) farewell('  Ana  ') === 'Adiós, Ana.' (trim); (4) assert.throws(() => farewell('   ')) y assert.throws(() => farewell()) con el mensaje de error. Usar assertions con valores literales, no solo chequeo de tipo.
Contrato: rollback: Borrar farewell.test.mjs (`git clean -f farewell.test.mjs`); no quedan artefactos de test en el repo.. Status: done

#### S1.T3 — Documentar `farewell` en README.md: sección con la firma `farewell(name, { punctuation } = {})`, el default `.` de punctuation, el trim del nombre, el Error ante nombre vacío, y un bloque de ejemplo con `import { farewell } from './farewell.mjs'` mostrando la salida literal 'Adiós, Ana.' y 'Adiós, Ana!'. No reescribir ni reordenar el contenido existente del README.
Contrato: rollback: `git checkout -- README.md` restaura el README a su contenido previo (título del sandbox y su línea de descripción).. Status: done
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: `farewell.mjs` exporta `farewell(name, { punctuation } = {})` que devuelve la cadena 'Adiós, ' seguida del nombre ya recortado (trim) y la p
- REQ-03 (edit) `confirmed`: El README documenta `farewell`: qué devuelve (la cadena 'Adiós, ' seguida del nombre recortado y la puntuación), el parámetro `punctuation`

## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: En la raíz de kanai_test_repo, `node --test farewell.test.mjs` pasa con los cuatro casos (default, puntuación configurable, trim, nombre vacío) y el README muestra la sección de farewell con su ejemplo y salida esperada.
