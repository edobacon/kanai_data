---
id: TV2-003-SPEC
project: tao-v2
ticket: TV2-003
status: approved
---

# TV2-003 B0-01: conciliar la base heredada, recuperar la regresión de server/ y publicar la matriz de evidencia v1

## Resumen ejecutivo

Se concilia la base heredada de tao-v2: se recuperan las suites de server/ con Node 24 para que pasen `pnpm run check` y Vitest, se clasifican sin corregir las fallas de entorno preexistentes (119 de unittest y 8 de node tests) y se publica docs/product/v3/matriz-evidencia-v1.md. La matriz muestra la evidencia por ticket v1 cerrado y separa "ticket cerrado" de "pruebas que corren". También lista los 46 usos de describe.skipIf, marcando cuáles dependen de PostgreSQL; ese es el contrato C-matriz-evidencia que consume TV2-004. Fuera de alcance: corregir las fallas de entorno, el gate que falla con suites omitidas (es B0-02/TV2-004), la app Flutter (app/) y lo diferido en 21-extensiones-v1. Para verificar: `pnpm run check`, Vitest en server/ y `DOCS_DIFF_BASE=main pnpm docs:check` en verde con Node 24, y la matriz con SHA, comandos, totales y pendientes, sin secretos. ADVERTENCIA: el request pide cubrir los x-errores del contrato para "sus operaciones", pero este ticket no expone ni modifica operaciones. Si al conciliar aparece una operación cuyo x-error no tiene caso, se anota como pendiente en la matriz y no se agrega alcance. ADVERTENCIA: una suite de integración omitida por falta de PostgreSQL queda como pendiente en la matriz, nunca como aprobada.
Datos a confirmar antes de ejecutar: (1) el comando exacto de Vitest en server/ (`pnpm -C server exec vitest run` o un script de package.json); confírmalo en server/package.json. (2) El SHA auditado de la base heredada; está en la ficha B0-01 del KB (carpeta mvp). (3) De dónde salen las 119 fallas de unittest y las 8 de node tests (qué runner y qué directorio); revísalo en la ficha B0-01 y en 00-alcance-y-decisiones. (4) La fuente canónica de los tickets v1 cerrados: docs/archivo-v1/backlog o la ficha 05-epicas-y-orden-de-ejecucion. (5) La variable de entorno o condición con la que los describe.skipIf detectan PostgreSQL. (6) Si existe una lista de skips aceptados explícitamente (riesgo declarado en el request).

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 2, puntos 2, 3 y 4; Adenda 1, puntos 2, 3 y 4

Existe docs/product/v3/matriz-evidencia-v1.md, con una fila por cada uno de los 65 tickets v1 cerrados listados en docs/product/v3/00_base_entregada.md (fuente canónica; docs/archivo-v1/backlog/ solo contrasta cada ticket con su épica). Cada fila indica la entrega existente, la prueba que pasa y lo que queda pendiente. La matriz separa en columnas distintas "ticket cerrado" y "pruebas que corren", y registra el SHA auditado, los comandos ejecutados, los totales de salida (incluidas las cifras observadas de unittest y node tests frente a las esperadas) y los pendientes explícitos, entre ellos la inestabilidad de limpieza de bases efimeras y el 405 intermitente de verificacion-correo. Los x-errores del contrato sin caso se anotan como pendiente (este ticket no expone operaciones propias). El ticket cierra "con pendientes" explícitos, nunca como verde total. La matriz no contiene contraseñas, tokens, OTP ni códigos completos: el grep de secretos usa patrones con valor (otp[=:] *[0-9]{4,}, password[=:] *\S+, token[=:] *\S{8,}) y no la palabra suelta.

### REQ-02 `confirmed`
> Fuente: Adenda 2, puntos 1, 2 y 3; Adenda 1, punto 1

Las suites de server/ se miden con Node 24 (.nvmrc) y el criterio de verde se evalúa contra el baseline medido en la sesión, no contra un verde absoluto. Se exige: (a) `pnpm -C server exec vitest run` ejecuta al menos las 648 pruebas del baseline sin fallas de código nuevas; (b) `pnpm run check` no tiene regresiones frente a ese baseline. La inestabilidad medida en el baseline queda clasificada en la matriz como falla de entorno preexistente, sin corregirla en este ticket: la carrera de limpieza de bases efimeras ("permission denied to terminate process" en `app-release.integration` y `configuracion.integration`) y el 405 intermitente de `verificacion-correo` (pasa 3 de 3 de forma aislada). Cada una se registra como pendiente explícito. El cambio de test ya aplicado (`eliminarBaseEfimera`) se conserva como mitigación y no se amplía. Las fallas de unittest y de node tests viven en runners separados y no entran en el criterio: `python3 -m unittest discover -s tests` (raíz) y `node --test scripts/dev/*.test.mjs` (paridad de .env.example, que importa zod desde server/). La discrepancia entre las fallas esperadas (119 y 8) y las observadas (5 y 0) es ACEPTADA por la persona: se documenta tal cual en la matriz con las cifras observadas, sin buscar explicarla en este ticket. Ninguna falla se silencia con dobles que siempre devuelven éxito.

### REQ-03 `confirmed`
> Fuente: Adenda 2, punto 4; criterios de aceptación del request

La matriz incluye la lista completa de suites con describe.skipIf (46 usos en el baseline), con archivo:línea, condición de omisión y una marca de si depende de PostgreSQL. También indica qué skips están aceptados explícitamente. Una suite de integración omitida (describe.skipIf) se marca como pendiente en la matriz y el ticket se cierra "con pendientes" explícitos, nunca como verde total; una corrida que no se pudo hacer queda pendiente, no aprobada. Es el entregable C-matriz-evidencia que TV2-004 usa como insumo del gate. La estabilización definitiva de la limpieza de bases efimeras queda fuera de este ticket y se trata en un ticket aparte antes de que B0-02 la herede; la matriz lo registra como pendiente.
## Tasks

#### S1.T1 — Medir el baseline con Node 24 (.nvmrc): `pnpm run check` y `pnpm -C server exec vitest run`, registrando totales ejecutados/pasados/fallidos y el SHA auditado. Medir por separado, como fallas de entorno preexistentes, los runners `python3 -m unittest discover -s tests` (119 fallas) y `node --test scripts/dev/*.test.mjs` (8 fallas). No corregir ni silenciar ninguna. El exit 0 aplica a Vitest sin fallas de código y a `pnpm run check` sin regresiones respecto de este baseline.
Contrato: rollback: No modifica el repo; se descarta el borrador del scratchpad.. Status: done

#### S1.T2 — Recuperar las suites de server/ corrigiendo solo las regresiones de código detectadas en el baseline (imports, tipos o configuración rotos por la base heredada). No se corrigen fallas de entorno, no se agregan describe.skip ni skipIf nuevos y no se usan dobles que siempre devuelven éxito.
Contrato: rollback: git revert de los commits de la task en la rama acumuladora; el baseline queda registrado para comparar.. Status: done

#### S1.T3 — Inventariar los describe.skipIf de server/ y tests/ (46 usos en el baseline) con archivo:línea y condición de omisión, marcar cuáles dependen de PostgreSQL según su condición y cruzar el resultado con la lista de skips aceptados explícitamente, si existe.
Contrato: rollback: No modifica código; se descarta el inventario.. Status: done

#### S1.T4 — Redactar docs/product/v3/matriz-evidencia-v1.md (contrato C-matriz-evidencia). Debe tener: encabezado con el SHA auditado, Node 24, los comandos ejecutados y sus totales; una tabla por ticket v1 cerrado (entrega existente, prueba que pasa, pendiente, ticket cerrado, pruebas que corren); la clasificación de las 119 y 8 fallas de entorno como preexistentes; la tabla de describe.skipIf con la columna depende de PostgreSQL; y una sección de pendientes. Sin contraseñas, tokens, OTP ni códigos completos. Si mkdocs.yml (tao-v2/mkdocs.yml:17) exige registrar la página en la navegación, agregarla.
Contrato: rollback: git rm docs/product/v3/matriz-evidencia-v1.md y revertir la entrada de mkdocs.yml, si se agregó.. Status: done

#### S1.T5 — Regresión y verificación cruzada: volver a correr Vitest en server/ con Node 24 y comparar los totales con el baseline (no bajan los ejecutados y las fallas de entorno siguen iguales). Comprobar que el conteo de filas de skipIf de la matriz coincide con el grep, que ninguna suite omitida por PostgreSQL cuenta como prueba que corre y que la matriz no contiene patrones de secretos. Registrar lo que no se pudo correr como pendiente.
Contrato: rollback: No agrega código; si la verificación falla, se reabre la task correspondiente y se ajusta la matriz.. Status: done
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Existe docs/product/v3/matriz-evidencia-v1.md, con una fila por cada uno de los 65 tickets v1 cerrados listados en docs/product/v3/00_base_e
- REQ-02 (edit) `confirmed`: Las suites de server/ quedan recuperadas con Node 24 (.nvmrc). El baseline de Vitest se mide con `pnpm -C server exec vitest run` además de 
- REQ-03 (edit) `confirmed`: La matriz incluye la lista completa de suites con describe.skipIf (46 usos en el baseline), con archivo:línea, condición de omisión y una ma

**Task ops:**

- edit S1.T1 { desc="Medir el baseline con Node 24 (.nvmrc): `pnpm run check` y `pnpm -C server exec vitest run`, registrando totales ejecutados/pasados/fallidos y el SHA auditado. Medir por separado, como fallas de entorno preexistentes, los runners `python3 -m unittest discover -s tests` (119 fallas) y `node --test scripts/dev/*.test.mjs` (8 fallas). No corregir ni silenciar ninguna. El exit 0 aplica a Vitest sin fallas de código y a `pnpm run check` sin regresiones respecto de este baseline." }

### Enmienda 2
**REQs:**

- REQ-02 (edit) `confirmed`: Las suites de server/ se miden con Node 24 (.nvmrc) y el criterio de verde se evalúa contra el baseline medido en la sesión, no contra un ve
- REQ-01 (edit) `confirmed`: Existe docs/product/v3/matriz-evidencia-v1.md, con una fila por cada uno de los 65 tickets v1 cerrados listados en docs/product/v3/00_base_e
- REQ-03 (edit) `confirmed`: La matriz incluye la lista completa de suites con describe.skipIf (46 usos en el baseline), con archivo:línea, condición de omisión y una ma
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: Vitest de server/ ejecuta al menos las 648 pruebas del baseline sin fallas de codigo nuevas, y `pnpm run check` sin regresiones respecto del baseline medido en la sesion (adenda 2). La inestabilidad medida (carrera de limpieza de bases efimeras y 405 intermitente de verificacion-correo) y la discrepancia 119/8 contra 5/0 quedan clasificadas como fallas de entorno preexistentes y pendientes explicitos en la matriz, sin exigir verde absoluto. docs/product/v3/matriz-evidencia-v1.md publicada con la evidencia por ticket, la clasificacion de fallas de entorno y la tabla de los 46 describe.skipIf con su dependencia de PostgreSQL, validada por docs:check.
