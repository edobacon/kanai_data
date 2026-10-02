# Decisión F1: regla de niveles, rangos y archivos del helper

Decidido por el dev el 2026-10-02, antes de escribir el helper.

## Regla de niveles (opción B: tercio con tope)

El largo es el de la parte que se oculta: el usuario del correo (sin dominio), los dígitos del RUT o del documento, el texto completo en `text`.

| Nivel | Regla | Visibles para un largo `n` |
|---|---|---|
| `none` | No oculta | `n` |
| `light` | Oculta un tercio (redondeado hacia arriba), máximo 3 | `n - min(3, ceil(n/3))` |
| `medium` | Deja visible un tercio (redondeado hacia abajo), máximo 2 | `min(2, floor(n/3))` |
| `strong` | Deja visible 1; ninguno si `n < 3`. En RUT y documento no deja ninguno (solo el verificador del RUT) | `1` o `0` |

**Motivo:** con una regla fija ("ocultar 3") un valor de 4 caracteres queda casi oculto completo y deja de ser un nivel ligero. Con tercios puros no coinciden los ejemplos ya aprobados del plan (`pablo.pe***`, `1234567***`). La regla B escala en valores cortos y coincide con todos los ejemplos de la tabla de niveles del plan original.

Salida verificada el 2026-10-02 en `node:10.24.1-alpine3.11`:

| Largo | Ejemplo | `light` | `medium` | `strong` |
|---|---|---|---|---|
| 2 | `ab` | `a*` | `**` | `**` |
| 4 | `luis` | `lu**` | `l***` | `l***` |
| 6 | `jperez` | `jper**` | `jp****` | `j*****` |
| 7 | `PAULINA` | `PAUL***` | `PA*****` | `P******` |
| 11 | `pablo.perez@uvm.cl` | `pablo.pe***@uvm.cl` | `pa*********@uvm.cl` | `p**********@uvm.cl` |
| 8 dígitos | `18.456.789-K` | `18.456.***-K` | `18.***.***-K` | `**.***.***-K` |
| 8 dígitos | `18456789` | `18456***` | `18******` | `********` |
| 10 dígitos | `1234567890` | `1234567***` | `12********` | `**********` |

**Consecuencia:** el test T10 espera `jperez` como `jper**` (no `jpe***`). Se ajustó en la enmienda del plan de F1.

**Alternativas descartadas:** A (tercios puros: rompe ejemplos aprobados y en valores largos `light` oculta mucho); regla fija (oculta casi todo en valores cortos).

## Rangos numéricos

| Opción | Default | Rango | Fuera de rango |
|---|---|---|---|
| `maxDepth` | 10 | 1 a 50 | Se ajusta al extremo más cercano y se avisa una vez |
| `maxTextLength` | 65536 | 256 a 1.048.576 | Igual |

## Archivos

| Archivo | Contenido |
|---|---|
| `server/api/user-api/helpers/logMaskingConfig.js` | Catálogo base, defaults, lectura y validación de `LOG_MASKING`, compilación de expresiones, avisos |
| `server/api/user-api/helpers/logSanitizer.js` | Reglas de nivel, recorrido recursivo, `sanitizeForLog`, `maskValue`, `createSanitizer` e instancia por defecto |

**Motivo:** un solo archivo quedaría en unas 410 líneas, sobre el límite de unas 400 por archivo de las reglas del dev. La detección en texto de F2 va en un tercer archivo (`logTextDetection.js`). **Consecuencia:** el criterio F1.c4 dice "solo `logSanitizer.js` y `logMaskingConfig.js`" (enmienda del plan de F1).

## Tipo de documento fuera de `id` (opción B, 2026-10-02)

El patrón `documento` del catálogo tomaba `tipo_documento: 'CC'` como identificador y lo dejaba como `C*`. El catálogo base de `id` excluye ahora `tipodocumento` y `tipodedocumento` (nombres normalizados), así que `tipo_documento`, `tipoDocumento` y `tipo_de_documento` quedan visibles en cualquier ambiente. **Motivo:** es un código de tipo (CC, CE, PASAPORTE), no un dato personal. **Descartada:** A, dejarlo oculto y documentar la exclusión por configuración. Cubierto en T5 y T28.

## Estilo del código (opción B, 2026-10-02)

El repo tiene `.eslintrc.js` pero eslint no está instalado y el CI no corre lint. El dev eligió ajustar el estilo a mano en lugar de descargar eslint con `npx`. Se revisaron: sangría con tabs, comillas simples, sin punto y coma, espacios dentro de los corchetes de las listas (`[ 'a' ]`), dos puntos alineados en objetos de varias líneas, comillas consistentes en las claves de un objeto (`quote-props`), líneas en blanco antes de `return` e `if` y después de declaraciones. **Riesgo aceptado:** sin eslint puede quedar alguna regla menor sin detectar; si el equipo corre eslint en el PR, se corrige ahí.
