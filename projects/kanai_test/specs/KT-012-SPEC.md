---
id: KT-012-SPEC
project: kanai_test
ticket: KT-012
status: approved
---

# Saludo configurable en greet.mjs: función greet(name, options) con tests y documentación

## Resumen ejecutivo

Se extrae la construcción del saludo de greet.mjs a una función exportada greet(name, options) con trim del nombre, error claro para nombre vacío, options.saludo (default 'Hola') y options.exclamacion (booleano, default true); se agrega greet.test.mjs con el runner node:test cubriendo los cuatro casos pedidos y se documenta el contrato en README.md. NO se hace: no se agregan flags nuevos de línea de comandos, no se cambia el formato de salida por defecto, no se agregan dependencias ni runner de tests externo, no se toca otro archivo del repositorio. Se sabe que funciona cuando `node --test` termina en verde y `node greet.mjs Ana` imprime exactamente el mismo texto que hoy. Tamaño estimado: una sesión corta (T1), tres archivos tocados, un solo repositorio sin dependencias externas. Advertencia fuera de alcance: no se valida el tipo de name ni de options más allá de lo pedido; si se quisiera exponer las opciones por CLI, eso es otro ticket.

Datos a confirmar antes de ejecutar:
- Texto exacto del saludo actual en greet.mjs (literal y puntuación) y cómo toma el nombre de process.argv: confirmar leyendo greet.mjs en kanai_test_repo antes de refactorizar, para que la regresión de CLI compare contra el string real.
- Si greet.mjs ya tiene algún export o si es solo un script de ejecución directa: confirmar en el mismo archivo, define si hace falta el guard de ejecución directa al agregar el export.
- Versión de Node disponible en el repositorio: node:test con `node --test` requiere Node 18+; confirmar con `node -v` o el .nvmrc de kanai_test_repo.

## Requirements

### REQ-01 `inferred`
> Fuente: kanai_test_repo/greet.mjs

greet.mjs exporta una función greet(name, options) que recorta el nombre con trim y lanza un error con mensaje claro (qué pasó y qué se esperaba) cuando el nombre queda vacío.

### REQ-02 `confirmed`
> Fuente: Request KT-012, punto 1

greet acepta options.saludo para reemplazar el texto del saludo (por defecto 'Hola') y options.exclamacion (booleano) para terminar o no el saludo en '!'.

### REQ-03 `inferred`
> Fuente: kanai_test_repo/greet.mjs

La línea de comandos de greet.mjs sigue imprimiendo exactamente el mismo saludo que hoy cuando no se pasan opciones nuevas.

### REQ-04 `confirmed` `enforcement`
> Fuente: Request KT-012, punto 2 y criterio de aceptación

greet.test.mjs usa el runner nativo node:test (sin dependencias externas) y corre con `node --test` desde la raíz del repositorio.

### REQ-05 `confirmed`
> Fuente: Request KT-012, punto 3

README.md documenta el uso de greet(name, options) y el contrato de las opciones: nombre recortado y obligatorio, saludo (default 'Hola'), exclamacion (booleano) y el error de nombre vacío.
## Tasks

#### S1.T1 — Extraer la construcción del saludo de greet.mjs a una función exportada greet(name, options): aplicar trim(name) y lanzar un Error con mensaje que diga qué pasó y qué se esperaba cuando el nombre recortado queda vacío; aplicar options.saludo con default 'Hola' y options.exclamacion (booleano) con el default que reproduce el texto actual; mantener la rama de línea de comandos leyendo el nombre de process.argv y llamando a greet con las opciones por defecto, detrás de un guard para que importar el módulo no imprima nada. Antes de editar, capturar la salida actual de `node greet.mjs Ana` para usarla como referencia de regresión.
Contrato: rollback: git checkout -- greet.mjs en kanai_test_repo (el archivo vuelve al script con el texto fijo).. Status: done

#### S1.T2 — Agregar greet.test.mjs con el runner nativo node:test y node:assert (sin dependencias externas), cubriendo: nombre con espacios sobrantes (se recorta), nombre vacío y solo-espacios (assert.throws con el mensaje del error), saludo personalizado via options.saludo, exclamación desactivada via options.exclamacion:false, defaults sin options, y la regresión de la línea de comandos comparando la salida de `node greet.mjs Ana` contra el texto previo capturado.
Contrato: rollback: rm greet.test.mjs en kanai_test_repo (no quedan otros archivos tocados por esta tarea).. Status: done

#### S1.T3 — Documentar en README.md la sección de uso de greet(name, options): ejemplo de import y llamada, contrato de cada opción (saludo con default 'Hola', exclamacion booleano y su default), el recorte del nombre, el error de nombre vacío con su mensaje, y la nota de que la línea de comandos sin opciones nuevas se comporta igual que antes.
Contrato: rollback: git checkout -- README.md en kanai_test_repo.. Status: done
## Sessions

### Session 1 · T1 · iterate

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: En kanai_test_repo: `node --test` termina en verde con los cuatro casos pedidos, `node greet.mjs Ana` imprime el mismo saludo que antes del cambio, y README.md tiene la sección de greet con el contrato de options.
