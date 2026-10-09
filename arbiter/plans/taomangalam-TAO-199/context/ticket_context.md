# Contexto del ticket TAO-199 (GH-72): lo pedido y lo decidido

Alcance del juicio: ticket completo (rama feat/GH-72-hu-02-05-content-catalogo contra epic/EP-02).

## Pedido
Catalogo versionado de las doce casas, generado desde docs/content/casas/ con el patron de HU-02-04 (resultados.v1.json): ficha de llegada, Rhibu, energizacion por via (consultante y consultor) con dias estructurados, notas 1 y 2, arcanos asociados (numero, nombre de la lista canonica docs/content/imagenes/01_arcanos.md y palabra magica con sourceRefs del parrafo de la casa, DEC-231), reglas de continuidad (Nota 4 en casas 2 a 11, DEC-028); cada nodo marcado con profundidad standard o advanced (DEC-027: dato base standard; desarrollo narrativo del Rhibu y de la casa, y mensaje de Thot, advanced). Todo viaja en la app (DEC-223).

Incluye: generador determinista en scripts/, JSON Schema, registro de correcciones editoriales, pruebas de fidelidad y modo --check, igual que resultados.v1.json. id house-01..house-12 como content_key; numero, nombre, zona; titulo y desarrollo del Rhibu. Dias y repeticiones (108 donde la fuente lo dice) como campos numericos con sourceRefs del parrafo que los declara (3 dias en las doce casas). catalogVersion como content_version, copia a app/assets/catalogos/ verificada en CI y cargador Dart de solo lectura (DEC-230). Campos ausentes en la fuente se omiten, nunca null ni texto inferido.

No incluye: ficha de reparacion, Ashura, coherencia vibracional, escala RKL, acciones finales de Casa 12 (HU-02-10); anillos; catalogo de 22 arcanos; ficha de retroceso y plantilla de Casa 12 del resultado (ya en resultados.v1.json); logica de visibilidad de nodos (EP-07).

Criterios de aceptacion:
1. Catalogo valida contra su JSON Schema, 12 casas con ids house-01..house-12.
2. Cada nodo textual: text == sourceText o editorialResolutionId valido; cada sourceRefs existe en docs/content/fuentes/03_tablero_tao_mangalam.md.
3. Energizacion por via con dias como numero y ancla del parrafo.
4. Casas 1 y 12 sin Nota 4; casas 2 a 11 con ella.
5. Casa 1: arcano 1 El Mago, palabra magica "iniciativa, originalidad, genialidad", sourceRefs tm-src-tablero#p0127; Casa 2: arcanos 2 y 12; Casa 12: arcano 0 El Loco.
6. Arcano fuera de la lista canonica: el generador falla nombrando la casa.
7. Cada nodo declara su profundidad; desarrollo narrativo y mensaje de Thot son advanced.
8. Casa modificada sin regenerar: --check falla nombrando el archivo en CI.
9. Cargador Dart entrega 12 casas inmutables con content_key y content_version.
Casos: QA-02-05-01 (repo limpio: --check y pruebas sin errores, 12 casas), QA-02-05-02 (paso de energizacion editado a mano en el JSON: fallan --check y la prueba de fidelidad), QA-02-05-03 (Casa 2 cargada en la app: via del consultante 3 dias con tm-src-tablero#p0189).
Requisito transversal: un cambio de texto sube catalogVersion (DEC-178).

## Decisiones del dev (adenda 1, 2026-10-09)
- Base epic/EP-02 trae scripts/catalog_common.py, scripts/sync_app_catalogs.py (copia por patron con --check DESACTUALIZADO/FALTANTE/HUERFANO) y el cargador Dart de resultados en app/lib/catalogos; se reutilizan, no se reescriben. No se reescribe scripts/build_result_catalog.py.
- catalogVersion es constante del generador como en resultados.v1.json; subirla al cambiar un texto es regla de proceso verificada en la revision; no hay mecanismo automatico.
- Se extraen tambien numero, nombre y zona, desarrollo de la casa y mensaje de Thot (estos dos solo donde la fuente los trae: el test de profundidad acepta su ausencia y exige advanced donde existan). Asercion literal de numero y nombre de house-01.
- El caso de copia alterada vive en tests/test_sync_app_catalogs.py; el test Dart solo comprueba la carga del asset empaquetado (y el resto de casos de cargador).
- CI: ci-pr.yml y nightly.yml ejecutan build_result_catalog.py --check, build_house_catalog.py --check y sync_app_catalogs.py --check.
- Lint de docs con markdownlint-cli2, cspell, vale y DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed. Los filtros de prueba usan nombres especificos (check_mode). CI usa Python 3.12.
- Pruebas Dart con fvm 3.47.2.
- Preguntas abiertas de contenido (sin decidir, no son defectos del codigo): titulo del Rhibu ausente en casas 1 y 12; erratas de la fuente en Casa 2 ("xxx" en Dharani Deva, "Arcano 2 y 6" en mensaje de Thot) que resultados.v1.json corrige en su registro editorial pero el de casas nace vacio.
