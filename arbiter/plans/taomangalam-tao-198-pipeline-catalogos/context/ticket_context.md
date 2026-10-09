# Contexto del ticket TAO-198 (proyecto taomangalam, GH-71)

Alcance: ticket entero (`whole_ticket`). Solo lo pedido y lo decidido; lo hecho sale del diff.

## Pedido
[HU-02-04][Historia] Pipeline de catalogos versionados desde `docs/content/` con esquema, verificacion en CI y carga de solo lectura en la app, empezando por los resultados.

Resultado: el contenido del metodo llega a la app como catalogos JSON generados desde `docs/content/`, validados contra su esquema, verificados en CI y cargados en la app como datos de solo lectura, empezando por `resultados.v1.json`.

Incluye: patron comun de catalogo (generador determinista, JSON Schema, registro de correcciones editoriales, pruebas de fidelidad y modo `--check`, tomando como base `scripts/build_result_catalog.py`); identidad y version por nodo y catalogo (el `id` de cada nodo es su `content_key`, el `catalogVersion` es su `content_version`); validacion de `resultados.v1.json` contra `resultados.v1.schema.json`; script de `scripts/` que copia el catalogo generado a `app/assets/catalogos/` con verificacion en CI de que la copia esta al dia, y cargador Dart de solo lectura con modelos inmutables y locale `es`.
No incluye: catalogos de casas, signos, personalidades y los de M1b (HU-02-05, 06, 10, 11); persistencia Drift y reglas del recorrido (EP-06); derivado para `server/` (HU-02-16).

Criterios de aceptacion:
- `resultados.v1.json` valida contra `resultados.v1.schema.json` (draft 2020-12) sin errores.
- Una transcripcion modificada sin regenerar hace fallar `build_result_catalog.py --check` en CI.
- Un nodo cuyo `text` difiere de `sourceText` sin `editorialResolutionId` declarado hace fallar las pruebas nombrando el nodo.
- Un campo que la fuente no declara se omite y nunca aparece como `null` ni con texto inferido.
- Cada casa y anillo tiene `id` estable y unico que el cargador expone como `content_key`; `catalogVersion` se expone como `content_version` de cada nodo.
- Con la copia en `app/assets/catalogos/` desactualizada, CI falla nombrando el archivo.
- El cargador Dart entrega 12 casas y 8 anillos inmutables, la Casa 12 solo con plantilla `closure` y sin objeto `regression`.
- Un `schemaVersion` distinto del soportado lanza un error tipado y no devuelve datos parciales.
Casos: QA-02-04-01 (suite Python y --check sin errores, con validacion de esquema), QA-02-04-02 (texto de Casa 3 editado a mano hace fallar --check y fidelidad), QA-02-04-03 (schemaVersion 99 lanza el error tipado), QA-02-04-04 (Casa 1: content_key house-01, content_version 1.0.0).

## Adenda 1 (decidida por el dev, 2026-10-09)
Ya entregado en `main`, FUERA de este ticket: generador `build_result_catalog.py` con `--check`; ejecucion en CI de `--check`, `check_citas.py` y unittest; pruebas de fidelidad de `tests/test_result_catalog.py`; `id` estable (house-01, ring-01) y `catalogVersion` 1.0.0.
DENTRO: (1) validar el JSON contra su esquema en pruebas y CI, instalando la dependencia en el job documental; (2) extraer el patron comun solo hasta donde lo necesiten los catalogos siguientes, sin construirlos; (3) script de copia a `app/assets/catalogos/` declarado en `app/pubspec.yaml` con verificacion en CI que nombra el archivo; (4) cargador Dart de solo lectura (modelos inmutables, locale `es`, content_key/content_version, 12 casas y 8 anillos, Casa 12 solo closure sin regression, error tipado ante schemaVersion no soportado sin datos parciales); (5) QA-02-04-03, QA-02-04-04 y el tramo de esquema de QA-02-04-01.

## Adenda 2 (decidida por el dev, 2026-10-09)
(1) Python 3.12 es la version unica de CI y de los casos QA (DEC-230); jsonschema se instala en el job documental sin cambiar la version de ci-pr.yml ni nightly.yml. (2) `tests/test_result_catalog.py` NO se modifica (ni imports ni aserciones); solo la prueba nueva de esquema usa el modulo comun. Las pruebas Dart del cargador quedan locales hasta HU-00-02 sin agregar `flutter test` a CI (nota posterior de ejecucion: los workflows ya corrian `flutter test` antes del ticket, por lo que esas pruebas correran en CI al subirse).

## Marcado
Sin `accepted_deviation` registradas.
