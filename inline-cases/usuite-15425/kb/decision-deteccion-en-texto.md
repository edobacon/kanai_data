# Decisión F2: dónde se aplica la detección dentro de textos

Decidido por el dev el 2026-10-02, antes de escribir `helpers/logTextDetection.js`.

## Decisión (opción A)

La detección dentro de textos (claves de `block`, correos y, si se enciende, RUT) se aplica **solo a los textos cuyo campo no tiene estrategia** por su nombre: campos como `mensaje`, `data`, `cmd`, `url`, atributos SAML sin catálogo (`.../claims/name`) y textos sueltos pasados a `sanitizeForLog`.

Un campo que ya tiene estrategia (`email`, `id` o `text`, incluso `text` con nivel `none`) se oculta solo según esa estrategia, sin buscar dentro del texto. Un campo de `block` se reemplaza completo, como siempre. Un campo con exclusión global se muestra tal cual (estrategia interna `VISIBLE`).

## Motivo

Es más simple, no procesa dos veces el mismo valor y deja el comportamiento de cada campo catalogado igual al de F1.

## Riesgo aceptado

Un campo catalogado en `text` con nivel `none` (por ejemplo, un nombre) que traiga un correo o una clave dentro del texto queda visible. Se considera poco probable: los campos de `text` son nombres. Si aparece un caso real, se cubre moviendo ese campo de estrategia por configuración o revisando esta decisión.

## Alternativa descartada

**B. Aplicar la detección a todo texto que no esté bloqueado** (primero claves y correos dentro del texto, después el nivel del campo): cubre el riesgo de arriba a cambio de procesar más cada log.

## Etiquetas XML según su nombre (opción B, 2026-10-02)

Dentro de un texto XML, **cada etiqueta se oculta según la estrategia de su nombre**, igual que un campo de un objeto: `<CLAVE>` queda `[OCULTO]`, `<NRRUTUSER>` como identificador (`18456***`), `<NMUSERDOM>` como correo o texto (`ana.pru***`) y `<NMNOMBRS>` según el nivel de `text`. Las etiquetas sin catálogo quedan como están y los correos dentro de su contenido se ocultan igual.

**Motivo:** el XML crudo es la rama `PARSE_TYPE == 'XML'` del login WSDL de uvmcl; solo con claves y correos, el RUT y el usuario quedaban visibles en esa rama y protegidos en la versión con objeto. **Descartada:** A, buscar solo claves y correos dentro del XML, como pedía el plan original.

**Límite:** esta revisión por nombre de etiqueta corre junto con la de claves, así que con `textDetection.block: false` el XML queda sin revisar por nombre (los correos se siguen ocultando si `textDetection.email` está encendido). Cubierto en T30.
