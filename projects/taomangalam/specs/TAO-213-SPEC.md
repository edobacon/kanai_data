---
id: TAO-213-SPEC
project: taomangalam
ticket: TAO-213
status: approved
---

# TAO-213 · Registrar la latencia medida desde Railway, la tabla comparativa del origen por los siete criterios y el método WebP en la DEC-240

## Resumen ejecutivo

Qué se hace: se registra en la DEC-240 la medición remota ya ejecutada el 2026-10-09 (región iad, 6 derivados, p50 de primer byte y total, peor caso de 212 ms, referencia desde el equipo del dev marcada como no Railway, límites y método reproducible sin URLs presignadas). También se agrega la tabla de las alternativas bucket solo, bucket con CDN delante y volumen servido por un servicio, con una fila por cada uno de los siete criterios de HU-02-01 y el motivo de cada descarte. Además, la DEC declara cwebp 1.6.0 con q=82 y method=6 como parte del método, se documenta el uso en scripts/assets/README.md y se alinean los docs 47 (sección 5) y 42 (sección 4.4).
Qué NO se hace: no se vuelve a medir ni se crean recursos en Railway; no se mide en sjc, ams ni sin; no hay prototipo nuevo de descarga ni verificación SHA-256 en Dart; no se toca la descarga productiva (HU-02-09) ni la LRU (HU-02-15); no se cambia el origen elegido y no se modifica app/lib.
Cómo se sabe que funciona: la DEC contiene la región iad, la fecha 2026-10-09 y los p50 por tamaño; ninguna celda de la tabla tiene un valor inventado; dos corridas de `python3 scripts/assets/measure_webp_budget.py --json` dan la misma salida y esta coincide con la tabla de la DEC; `python3 -m unittest discover -s tests -p "test_assets_*.py"` pasa; el linter de docs no queda en rojo con los documentos tocados.
Tamaño: una sesión T2 de 2 a 3 horas, casi todo documentación. Riesgo bajo, porque la medición ya existe.
ADVERTENCIA: el request pide revisar measure_webp_budget.py y conservar solo los cambios necesarios, pero en origin/main no se ven cambios pendientes en ese script. Si no hace falta ningún cambio para que sea reproducible, se deja intacto y no se agrega alcance.
ADVERTENCIA: la salida cruda (scratchpad/lat/muestra.json) quedó en la sesión de origen y no está en el repo; los valores salen de la adenda 1 y no se inventan otros.
Datos a confirmar antes de ejecutar: (1) las rutas exactas de los docs 47 y 42 dentro de docs/; no aparecen en el contexto y se confirman en el árbol de docs de taomangalam. (2) El comando local del job de lint de docs en .github/workflows/ci-pr.yml, y si DEC-240, 47 o 42 figuran en .docs-baseline.txt. (3) La versión de cwebp instalada en la máquina de ejecución (`cwebp -version`): la DEC usa 1.6.0 y otra versión podría cambiar las cifras.

## Requirements

### REQ-01 `confirmed`
> Fuente: adenda 1 del pedido + pedido de cambio (quitar referencia a scratchpad/lat/muestra.json)

La sección de evidencia de la DEC-240 deja de declarar pendiente la latencia remota y registra, como evidencia ya obtenida el 2026-10-09 (copiada de la adenda 1 del pedido, sin volver a medir ni crear recursos en Railway), la medición: bucket temporal en staging, región iad (US East, Virginia) junto al servicio server (us-east4), 6 derivados WebP reales de 14 KB a 500 KB con la clave derivados/<sha256>/<nombre>.webp, URLs presignadas de 15 minutos y 10 descargas por archivo con fetch de Node 24 desde server (railway ssh, solo lectura). Incluye los p50 de primer byte y total por tamaño (14 KB 28/34 ms; 37 KB 27/30; 113 KB 27/29; 206 KB 32/34; 432 KB 32/39; 500 KB 34/42), el peor caso individual de 212 ms y la referencia desde el equipo del dev (primer byte p50 de 480 a 516 ms; total de 660 a 1240 ms), marcada explícitamente como no medida de Railway. Declara los límites (solo iad, muestra de 6 de 405 derivados, sin medición desde la red de un teléfono; sin sjc, ams ni sin). Documenta el método repetible paso a paso sin URLs ni credenciales: crear bucket temporal en staging, subir derivados con clave por hash, generar URLs presignadas, descargar 10 veces cada archivo desde el servicio server por railway ssh y borrar el bucket. Concluye que sin CDN en M1a la latencia es aceptable para una descarga en segundo plano y no contradice el origen elegido. Ningún documento ni task cita la ruta scratchpad/lat/muestra.json como fuente ni entrada.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md:78

La DEC-240 incluye una tabla comparativa con las alternativas bucket solo (elegida), bucket con CDN delante y volumen servido por un servicio, y una fila por cada uno de los siete criterios de HU-02-01: costo de almacenamiento, egress, latencia, URLs inmutables, invalidación, disponibilidad y operación desde Railway. Cada alternativa descartada lleva su motivo explícito. Una celda sin medición o sin fuente dice 'sin medición' o 'no evaluado' en vez de un valor fabricado, y la celda de latencia del bucket solo cita la medición de REQ-01.

### REQ-03 `confirmed`
> Fuente: taomangalam/scripts/assets/measure_webp_budget.py:4

El método de estimación de la DEC-240 declara como parte explícita y reproducible la herramienta cwebp 1.6.0 con q=82 y method=6, y nombra el comando `python3 scripts/assets/measure_webp_budget.py`. Al volver a correr el script se obtienen las mismas cifras de la tabla de la DEC. Del script solo se conservan los cambios necesarios para esa reproducibilidad.

### REQ-04 `inferred`
> Fuente: taomangalam/docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md:192

El doc 47 (sección 5) y el doc 42 (sección 4.4) quedan coherentes con la DEC-240 actualizada: no declaran pendiente la latencia remota, no contradicen el origen bucket solo sin CDN en M1a y referencian la DEC-240 en lugar de duplicar cifras distintas.

### REQ-05 `confirmed`
> Fuente: taomangalam/tests/test_assets_origin.py:39

Las pruebas existentes de assets siguen pasando sin modificarse: scripts/assets/serve_derivative.py y tests/test_assets_origin.py no se tocan, y su consumidor scripts/ci/ep01-assets-provider.mjs sigue igual.

### REQ-06 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

scripts/assets/README.md documenta measure_webp_budget.py (uso, parámetros --sample y --json, ejemplo, requisito de cwebp 1.6.0 con q=82 y method=6) y documenta el método repetible de medición remota de latencia: crear bucket temporal en staging, subir derivados con clave por hash derivados/<sha256>/<nombre>.webp, generar URLs presignadas, descargar 10 veces cada archivo desde el servicio server por railway ssh y borrar el bucket al terminar, sin URLs ni credenciales, remitiendo a la DEC-240 para los resultados. No se agrega ninguna entrada a README raíz, CONTRIBUTING, commands.md ni release-runbook, porque la medición remota es evidencia puntual.

### REQ-07 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Cada documento modificado por el ticket (DEC-240, docs 47 y 42, scripts/assets/README.md) cumple con el linter de docs del proyecto. Si alguno figura en .docs-baseline.txt, se verifica localmente que el job de docs no quede en rojo antes de abrir el PR.

### REQ-08 `confirmed` `enforcement`
> Fuente: pedido de cambio: quitar referencia a scratchpad/lat/muestra.json

La evidencia de latencia se registra solo con los valores de la adenda 1: ninguna task ni documento usa scratchpad/lat/muestra.json como entrada o referencia, y el ticket no crea recursos en Railway ni vuelve a medir.
## Tasks

#### S1.T1 — Registrar en la sección de evidencia de docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md la medición remota del 2026-10-09 con los datos literales de la adenda 1. Método: bucket temporal en staging, región iad junto a server (us-east4), 6 derivados de 14 a 500 KB con la clave derivados/<sha256>/<nombre>.webp, URLs presignadas de 15 minutos, 10 descargas por archivo con fetch de Node 24 desde server vía railway ssh de solo lectura, bucket eliminado al terminar. Incluir la tabla de p50 de primer byte y total por tamaño, el peor caso de 212 ms y la referencia desde el equipo del dev rotulada como no Railway. Agregar los límites (solo iad, 6 de 405 derivados, sin medición desde un teléfono), los pasos repetibles sin URLs ni credenciales y la conclusión de que no contradice el origen. Quitar la marca de evidencia pendiente. No volver a medir ni crear recursos en Railway.
Contrato: rollback: git checkout origin/main -- docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md. Status: pending

#### S1.T2 — Agregar en la DEC-240 la tabla comparativa de bucket solo (elegido), bucket con CDN delante y volumen servido por un servicio, con una fila por criterio: costo de almacenamiento, egress, latencia, URLs inmutables, invalidación, disponibilidad y operación desde Railway. La celda de latencia del bucket solo cita la medición de iad; donde no haya medición o fuente, escribir 'sin medición' o 'no evaluado'. Debajo de la tabla, escribir el motivo de descarte de cada alternativa no elegida. Reusar como base la tabla parcial existente de modalidades dentro de Railway en lugar de duplicarla.
Contrato: rollback: git checkout origin/main -- docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md. Status: pending

#### S1.T3 — Declarar en la sección de método de la DEC-240 (cerca de las líneas 78 a 81) la herramienta cwebp 1.6.0 con q=82 y method=6 como parte explícita del método reproducible, junto con el comando `python3 scripts/assets/measure_webp_budget.py [--sample 2] [--json]`. Revisar scripts/assets/measure_webp_budget.py y conservar solo los cambios necesarios para que la salida sea determinista. Hoy ya documenta q=82 y method=6 en su docstring (línea 4) y usa una muestra determinista; si no hace falta ningún cambio, dejarlo intacto.
Contrato: rollback: git checkout origin/main -- docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md scripts/assets/measure_webp_budget.py. Status: pending

#### S1.T4 — Actualizar scripts/assets/README.md (hoy menciona cwebp y q=82/method=6 en la línea 8) con una sección para measure_webp_budget.py: uso, parámetros --sample y --json, ejemplo de invocación, requisito de cwebp 1.6.0 y un enlace a la DEC-240 como fuente del método de latencia remota. No tocar README raíz, CONTRIBUTING, docs/development/commands.md ni release-runbook.
Contrato: rollback: git checkout origin/main -- scripts/assets/README.md. Status: pending

#### S1.T5 — Alinear la sección 5 del doc 47 y la sección 4.4 del doc 42 con la DEC-240 actualizada: quitar cualquier mención de latencia remota pendiente, mantener el origen bucket solo sin CDN en M1a y referenciar la DEC-240 en lugar de repetir cifras. Si algún doc cita cifras, que coincidan con las de la DEC. Confirmar antes las rutas exactas de ambos docs.
Contrato: rollback: git checkout origin/main -- <ruta del doc 47> <ruta del doc 42>. Status: pending

#### S1.T6 — Regresión y verificación: (1) correr `python3 -m unittest discover -s tests -p "test_assets_*.py"` y confirmar OK sin cambios en serve_derivative.py, test_assets_origin.py ni ep01-assets-provider.mjs. (2) Correr `python3 scripts/assets/measure_webp_budget.py --json` dos veces y comparar con diff; las cifras deben coincidir con la tabla de la DEC-240. (3) Correr el linter de docs del job de docs de ci-pr.yml sobre DEC-240, los docs 47 y 42 y scripts/assets/README.md, y revisar .docs-baseline.txt y cspell-project-words.txt. (4) Confirmar que el diff no incluye README raíz, CONTRIBUTING, commands.md ni release-runbook, y que no hay URLs presignadas.
Contrato: rollback: No modifica código; si falla, revertir la task que introdujo la falla con git checkout origin/main -- <archivo>.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: La sección de evidencia de la DEC-240 deja de declarar pendiente la latencia remota y registra, como evidencia ya obtenida el 2026-10-09 (co
- REQ-06 (edit) `confirmed`: scripts/assets/README.md documenta measure_webp_budget.py (uso, parámetros --sample y --json, ejemplo, requisito de cwebp 1.6.0 con q=82 y m
- REQ-08 (add) `confirmed`: La evidencia de latencia se registra solo con los valores de la adenda 1: ninguna task ni documento usa scratchpad/lat/muestra.json como ent

**Tasks agregadas:**

- S1: Registrar en la DEC-240 la medición remota del 2026-10-09 copiando los valores de la adenda 1 (tabla de p50 primer byte/total por tamaño, peor caso 212 ms, referencia del equipo del dev marcada como no medida de Railway, límites y conclusión) y documentar el método repetible (crear bucket temporal en staging, subir derivados con clave derivados/<sha256>/<nombre>.webp, presignar a 15 minutos, descargar 10 veces cada archivo desde el servicio server por railway ssh con fetch de Node 24, borrar el bucket) tanto en la DEC como en scripts/assets/README.md. No citar scratchpad/lat/muestra.json en ningún archivo, no crear recursos en Railway ni volver a medir, y no incluir URLs ni credenciales. (valida: REQ-01, REQ-06, REQ-08; rollback: Revertir con git checkout los cambios a docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md y scripts/assets/README.md.)

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T6

**Gate (auto)**: La DEC-240 en la rama muestra la latencia de iad con método, fecha y límites, la tabla de siete criterios con motivos de descarte y el método cwebp 1.6.0 con q=82 y method=6. La reejecución del script de presupuesto reproduce las cifras, los tests de assets pasan y el linter de docs queda en verde sobre los archivos tocados.
