# Contexto del ticket TAO-213 (proyecto taomangalam, GH-69)

Alcance: ticket entero (`whole_ticket`). Solo se incluye lo pedido y lo decidido; lo hecho sale del diff.

## Pedido
[HU-02-01][Seguimiento] Completar la evidencia pendiente de DEC-240: medicion remota de latencia desde Railway y comparacion por criterio del origen.

Resultado: la DEC-240 (`docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md`) queda sin evidencia pendiente: con la latencia medida desde una instancia de Railway hasta el bucket, la comparacion del origen por cada criterio de HU-02-01 y la herramienta y calidad WebP declaradas como parte del metodo reproducible. Reemplaza a TAO-195 y TAO-196 (descartados por estar cubiertos por TAO-190). No repite la DEC, la tabla de mediciones ni el prototipo que ya existen.

Incluye:
- Registrar la latencia remota desde Railway hasta el bucket (metodo, region, fecha) en la DEC-240; si no hubiera entorno, dejar el bloqueo documentado.
- Tabla que compara bucket solo, bucket con CDN delante y volumen servido por un servicio por los siete criterios (costo de almacenamiento, egress, latencia, URLs inmutables, invalidacion, disponibilidad y operacion desde Railway), con el motivo de cada descarte; sin fabricar valores donde no haya medicion.
- Declarar en la DEC la herramienta y calidad WebP (cwebp 1.6.0, q=82, method=6) y dejar reproducible `scripts/assets/measure_webp_budget.py` (conservar solo los cambios necesarios).
- Mantener coherentes los docs 47 (seccion 5) y 42 (seccion 4.4) con el resultado.

No incluye: nuevo prototipo de descarga y verificacion SHA-256 (ya existe `serve_derivative.py` y `tests/test_assets_origin.py`); implementacion productiva de descarga y cache (HU-02-09); tope de cache LRU (HU-02-15); cambiar el origen elegido salvo que la medicion lo contradiga.

Criterios de aceptacion: la DEC contiene la latencia medida con metodo, region y fecha (o declara por que no se pudo); hay tabla comparativa con motivo de descarte por alternativa; el metodo declara herramienta y calidad WebP y `measure_webp_budget.py` da cifras iguales al volver a correrlo; las pruebas existentes `test_assets_*.py` siguen pasando; docs 47 y 42 coherentes.

## Adenda 1 (decidida por el dev, 2026-10-09)
La medicion remota YA se ejecuto antes de planificar; el ticket no debe volver a medir ni crear recursos en Railway, solo registrar la evidencia. Metodo: bucket temporal en staging, region iad (junto al servicio `server`, us-east4), 6 derivados WebP reales de 14 a 500 KB con clave `derivados/<sha256>/<nombre>.webp`, URLs presignadas de 15 minutos, 10 descargas por archivo con fetch de Node 24 desde `server` por `railway ssh` de solo lectura; bucket eliminado al terminar, sin credenciales guardadas.
Desde Railway (p50 primer byte / total): 14 KB 28/34 ms; 37 KB 27/30; 113 KB 27/29; 206 KB 32/34; 432 KB 32/39; 500 KB 34/42; peor caso 212 ms. Desde el equipo del dev (NO es medida de Railway; referencia de cliente lejano): primer byte p50 480 a 516 ms; total p50 660 a 1240 ms.
Limites a declarar sin fabricar valores: solo region iad (no sjc, ams, sin); muestra de 6 de 405 derivados; sin medicion desde la red de un telefono. Conclusion que respalda la DEC: sin CDN en M1a la latencia es aceptable para descarga en segundo plano; no contradice el origen elegido. No citar `scratchpad/lat/muestra.json` ni incluir URLs presignadas.

## Decisiones del dev vigentes
- Sondas: (1) el metodo y los cambios de `measure_webp_budget.py` se documentan en la DEC-240 y en `scripts/assets/README.md`; no se agrega entrada a README raiz, CONTRIBUTING, commands.md ni release-runbook. (2) Todo doc tocado debe quedar compliant con el linter de docs (docs 42 y 47 estan en `.docs-baseline.txt`). (3) Privilegios de rol: no aplica, no se tocan tablas.
- `tests/test_assets_origin.py`, `serve_derivative.py` y `ep01-assets-provider.mjs` no se modifican (decision del spec).

## Marcado
Sin `accepted_deviation` registradas.
