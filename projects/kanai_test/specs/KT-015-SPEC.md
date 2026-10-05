---
id: KT-015-SPEC
project: kanai_test
ticket: KT-015
status: approved
---

# Utilidad shout(text, { marks }) en el sandbox: implementación, tests y documentación

## Resumen ejecutivo

Se agrega al sandbox una utilidad `shout.mjs` que exporta `shout(text, { marks } = {})`: devuelve el texto con trim en mayúsculas seguido de `marks` signos de exclamación (default 1), lanza `Error` mencionando `text` si el texto es vacío/solo espacios/undefined/null, y `RangeError` si `marks` no es entero >= 1. Se agrega `shout.test.mjs` con `node --test` cubriendo default, marks configurable, trim, texto vacío y marks inválido, y se documenta el uso en el README con un ejemplo, sin reescribir lo existente. NO se toca `greet.mjs` ni sus tests, no se agregan dependencias ni se modifica el build. Se verifica con `node --test shout.test.mjs` en verde y leyendo la sección nueva del README. Tamaño: 1 sesión corta (~1-1.5h), 3 tareas.

Datos a confirmar antes de ejecutar:
- Ruta exacta del sandbox donde viven `greet.mjs` y el README (el request los nombra pero no da la ruta); confirmar con la ubicación de `greet.mjs` en el repo antes de crear `shout.mjs` al lado.
- Si el README del sandbox ya tiene una sección de utilidades a la que agregar `shout` (para no duplicar encabezados); confirmar al abrir el README.

## Requirements

### REQ-01 `confirmed`
> Fuente: request KT-015 punto 1

`shout.mjs` exporta `shout(text, { marks } = {})` que devuelve el texto con trim, en mayúsculas, seguido de `marks` signos de exclamación, con `marks` por defecto 1.

### REQ-02 `confirmed`
> Fuente: request KT-015 punto 1

`shout` valida sus entradas: lanza `Error` con mensaje que menciona `text` cuando el texto es vacío, solo espacios, undefined o null; lanza `RangeError` cuando `marks` no es un entero mayor o igual a 1.

### REQ-03 `confirmed`
> Fuente: request KT-015 punto 3

El README documenta el uso de `shout` con un ejemplo de entrada y salida, agregando contenido sin reescribir ni reordenar lo existente (incluida la documentación de `greet`).

### REQ-04 `confirmed` `enforcement`
> Fuente: request KT-015, sección Fuera de alcance

El cambio no modifica `greet.mjs` ni sus tests, y el sandbox sigue corriendo sus tests existentes sin regresión.
## Tasks

#### S1.T1 — Crear `shout.mjs` en el sandbox (al lado de `greet.mjs`) exportando `shout(text, { marks } = {})`: valida primero que `text` sea string no vacío tras trim (si no, lanza `Error` con mensaje que menciona `text`), luego que `marks` sea entero >= 1 usando Number.isInteger (si no, lanza `RangeError`), y devuelve `text.trim().toUpperCase() + '!'.repeat(marks)` con `marks` default 1. Guard clauses, sin dependencias nuevas.
Contrato: rollback: Eliminar el archivo `shout.mjs`; no hay otros archivos tocados por esta task.. Status: done

#### S1.T2 — Crear `shout.test.mjs` con `node --test` (import de `node:test` y `node:assert/strict`) cubriendo: default devuelve 'HOLA!', marks configurable devuelve 'HOLA!!!', trim de ' hola ', texto vacío/solo espacios/undefined lanza Error con message que menciona 'text', y marks inválido (0 y 1.5) lanza RangeError. Assertions con valores concretos, no solo tipo.
Contrato: rollback: Eliminar el archivo `shout.test.mjs`; no se modifican tests existentes.. Status: done

#### S1.T3 — Agregar al README una sección de `shout` con firma, descripción de `marks` (default 1), los errores que lanza y un ejemplo con shout('hola') -> 'HOLA!' y shout(' hola ', { marks: 3 }) -> 'HOLA!!!'. Solo adición: no reescribir ni reordenar la documentación existente de `greet`.
Contrato: rollback: Revertir el README al estado previo (`git checkout -- <ruta del README>`).. Status: done
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: En el sandbox: `node --test shout.test.mjs` pasa con los cinco casos (default, marks configurable, trim, texto vacío, marks inválido) y el README muestra la sección nueva de `shout` con su ejemplo, sin cambios en la documentación previa.
