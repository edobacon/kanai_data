---
id: TAO-199-SPEC
project: taomangalam
ticket: TAO-199
status: approved
---

# HU-02-05 Catálogo versionado de las doce casas (Estándar y Avanzado) con arcanos y palabra mágica trazados a la fuente

## Resumen ejecutivo

Se agrega un generador determinista en scripts/ que lee docs/content/casas/01_casa_1.md a 12_casa_12.md y produce un catálogo versionado de 12 casas (house-01 a house-12). El catálogo trae su JSON Schema, un registro de correcciones editoriales, pruebas de fidelidad y el modo --check, con el mismo patrón que scripts/build_result_catalog.py y resultados.v1.json de HU-02-04. Por casa incluye la ficha de llegada, el Rhibu, la energización por vía con días y repeticiones numéricos anclados, las notas 1 y 2, la Nota 4 (solo en las casas 2 a 11), los arcanos con número, nombre canónico y palabra mágica, y la profundidad Estándar o Avanzada de cada nodo. Además se copia a app/assets/catalogos/, CI verifica esa copia y se suma un cargador Dart de solo lectura.
NO incluye: ficha de reparación, Ashura, coherencia vibracional, RKL, anillos, galería de los 22 arcanos ni acciones de cierre de Casa 12 (HU-02-10, HU-02-11, HU-06-12). Tampoco incluye la ficha de retroceso, que ya está en resultados.v1.json, ni la lógica de visibilidad, que es de EP-07.
Cómo se sabe que funciona: el schema valida 12 casas; la Casa 1 trae el arcano 1 «El Mago» con la palabra mágica «iniciativa, originalidad, genialidad» y la referencia tm-src-tablero#p0127; en la Casa 2, la vía del consultante declara 3 días con tm-src-tablero#p0189; si se edita el JSON a mano, fallan --check y la fidelidad; el cargador Dart entrega 12 casas inmutables. Tamaño: 3 puntos, 2 sesiones.
ADVERTENCIA: el catálogo es un archivo de contenido empaquetado, no una tabla de base de datos. Por eso dataModelChanges queda vacío. Si el aprobador lo considera seed_catalog, debe aprobarlo de forma explícita.
Datos a confirmar antes de ejecutar: (1) la ruta y el nombre del cargador Dart de HU-02-04 (TAO-198) y de su test, para replicar el patrón; confírmalos en app/lib y app/test de origin/main. (2) La ruta del JSON Schema y del registro editorial de resultados.v1.json, para seguir la misma convención de nombres; confírmala en docs/content/catalogos/. (3) El nombre final propuesto es scripts/build_house_catalog.py y docs/content/catalogos/casas.v1.json; ajústalo si HU-02-04 usa otra convención. (4) El paso de CI que verifica la copia en app/assets/catalogos/ para resultados.v1.json; búscalo en .github/workflows/ci-pr.yml.

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 1 (2) y pedido de cambio: S1.T2.1 y S1.T1.1

Un generador determinista (scripts/build_house_catalog.py) produce docs/content/catalogos/casas.v1.json desde docs/content/casas/. El archivo valida contra su JSON Schema y contiene exactamente 12 casas con id house-01 a house-12 como content_key, en ese orden. Cada casa trae número, nombre, zona, ficha de llegada, título y desarrollo del Rhibu, notas 1 y 2, y catalogVersion como content_version. Junto al schema se crea el registro de correcciones editoriales de casas, que nace vacío y usa el mismo formato que el de resultados.v1.json (REQ-10). Dos corridas del generador producen bytes idénticos. house-01 tiene número 1 y el nombre exacto leído de docs/content/casas/01_casa_1.md.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:509

Cada nodo textual tiene un text igual a su sourceText o declara un editorialResolutionId que existe en el registro de correcciones editoriales. Además, cada sourceRefs apunta a un ancla que existe en docs/content/fuentes/03_tablero_tao_mangalam.md. Las pruebas de fidelidad nombran el nodo que falla.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:118

La energización de cada casa se separa por vía (consultante y consultor). Cada vía declara sus días como campo numérico y, donde la fuente lo dice, las repeticiones (108) como número. Cada dato numérico lleva el sourceRefs del párrafo que lo declara.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:118

Las reglas de continuidad (Nota 4, DEC-028) se incluyen en las casas 2 a 11 y se omiten en las casas 1 y 12.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:123

Cada casa lista sus arcanos asociados (uno o dos según la fuente). Cada arcano trae su número, su nombre tomado de la lista canónica docs/content/imagenes/01_arcanos.md y su palabra mágica con el sourceRefs del párrafo de la casa que la declara (DEC-231). El Loco usa el id 0 y 22 es solo un alias. Si un número no está en la lista canónica, el generador falla nombrando la casa.

### REQ-06 `confirmed`
> Fuente: Adenda 1 (2) y pedido de cambio: S1.T2.6

Cada nodo declara su profundidad (standard o advanced) según la tabla de V-05 (DEC-027). El dato base es standard, incluidos los días de energización y el número y nombre de los arcanos. El desarrollo narrativo del Rhibu es advanced; el desarrollo de la casa y el mensaje de Thot son advanced y solo existen donde la fuente los trae: cuando faltan, el campo se omite (nunca null, REQ-07) y la prueba de profundidad lo acepta; cuando existen, exige depth == advanced. Un nodo sin depth es rechazado por el schema. Todo viaja en el catálogo (DEC-223).

### REQ-07 `confirmed`
> Fuente: Alcance del ticket y pedido de cambio: S1.T2.6

Los campos que no están en la fuente se omiten del JSON, nunca como null ni como texto inferido. Un recorrido completo del catálogo no encuentra ningún null y el schema rechaza text: null.

### REQ-08 `confirmed`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:1199

`build_house_catalog.py --check` falla, nombrando el archivo, cuando una casa de docs/content/casas/ cambió sin regenerar o cuando el JSON se editó a mano. Corre en el job docs de CI junto a los demás gates de build documental.

### REQ-09 `confirmed`
> Fuente: Enmienda: corrección del alcance del test Dart del cargador

El catálogo se copia a app/assets/catalogos/ con scripts/sync_app_catalogs.py ya existente, que copia por patrón todo *.json de docs/content/catalogos salvo esquemas y correcciones y su --check informa DESACTUALIZADO, FALTANTE y HUÉRFANO. El caso de copia alterada se prueba en tests/test_sync_app_catalogs.py (directorios temporales), no en Dart. El cargador Dart de solo lectura (DEC-230) lee el asset empaquetado sin red (DEC-094) y entrega 12 casas inmutables con su content_key y content_version; su test, que se crea en app/test/catalogos/, comprueba la carga de las 12 casas inmutables y la energización de house-02; la copia alterada se prueba en tests/test_sync_app_catalogs.py.

### REQ-10 `confirmed` `enforcement`
> Fuente: Adenda 1, base y decisión (7 del pedido); HU-02-04

Reusar lo ya integrado en epic/EP-02: scripts/catalog_common.py, scripts/sync_app_catalogs.py y el cargador Dart de resultados en app/lib/catalogos; no se reescriben. Las rutas del schema, del registro editorial y del cargador siguen la convención de resultados.v1.json. No se reescribe scripts/build_result_catalog.py.

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Variante de lint de docs: todo documento del baseline que el ticket modifique, en particular docs/content/casas/01_casa_1.md, 12_casa_12.md y docs/content/imagenes/01_arcanos.md si se editan, queda compliant con markdownlint, cspell y vale, y se normaliza el patrón que el linter rechaza. Se verifica con node_modules/.bin/markdownlint-cli2, node_modules/.bin/cspell --no-progress y vale --minAlertLevel=suggestion aplicados a los .md modificados de docs/content respecto de main (git diff --name-only main -- docs/content, filtrado a .md y con xargs -r para tolerar la lista vacía), y con DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed. Las fuentes que solo se leen (transcripción del tablero, SCHEMA.md) no se modifican: git diff --quiet main sobre esos dos archivos no reporta cambios.

### REQ-12 `confirmed`
> Fuente: Adenda 1 (1) y pedido de cambio: S1.T2.1

catalogVersion es una constante del generador build_house_catalog.py, igual que en resultados.v1.json, y el catálogo la trae presente e igual a esa constante. Subirla al cambiar un texto es regla de proceso (DEC-178) verificada en la revisión; no existe ninguna lógica que incremente catalogVersion sola. El --check ya falla si el JSON no se regeneró.

### REQ-13 `confirmed`
> Fuente: Adenda 1, decisión (4); REQ-08

Regresión de CI: .github/workflows/ci-pr.yml y .github/workflows/nightly.yml siguen ejecutando build_result_catalog.py --check y además build_house_catalog.py --check y python3 scripts/sync_app_catalogs.py --check.

### REQ-14 `confirmed` `enforcement`
> Fuente: Adenda 1, decisiones (6) y (7)

Las pruebas Python del ticket se agrupan con nombres específicos (grupo check_mode) para poder filtrarlas sin el patrón genérico check. Python 3.12 es la versión única de CI; localmente se puede usar otro intérprete con yaml y jsonschema instalados. Las pruebas Dart se corren con el SDK de fvm (3.47.2): dart analyze y flutter test sobre app/test/catalogos.
## Tasks

#### S1.T1 — Construir el generador, el schema y el contenido del catálogo de casas siguiendo el patrón de scripts/build_result_catalog.py (HU-02-04). La tarea padre no se ejecuta directamente.
Contrato: rollback: git revert de los commits de la sesión; el catálogo y el generador nuevos desaparecen y resultados.v1.json no se toca.. Status: done

#### S1.T1.1 — Crea scripts/build_house_catalog.py (esqueleto con la constante catalogVersion) y, junto al schema JSON de casas, el registro de correcciones editoriales de casas. El registro nace vacio y usa el mismo formato que el de resultados.v1.json (REQ-10); las rutas siguen la convencion de resultados.v1.json. Reutiliza scripts/catalog_common.py sin reescribirlo y no toca scripts/build_result_catalog.py.
Contrato: rollback: Borrar scripts/build_house_catalog.py, el schema y casas.v1.json.. Status: done

#### S1.T1.2 — Extraer de docs/content/casas/ por casa: número, nombre y zona, ficha de llegada, título y desarrollo del Rhibu, desarrollo de la casa y mensaje de Thot (estos dos últimos solo donde la fuente los trae; si faltan, omitir el campo, nunca null ni texto inferido), energización por vía, notas 1 y 2, arcanos asociados y Nota 4 en casas 2 a 11. Reutilizar scripts/catalog_common.py y definir catalogVersion como constante del generador, igual que en build_result_catalog.py.
Contrato: rollback: Revertir los cambios del generador y del registro editorial.. Status: done

#### S1.T1.3 — Estructurar la energización por vía (consultante y consultor). days y repetitions (108) van como enteros, cada uno con el sourceRefs del párrafo que lo declara; ejemplo: Casa 2, vía del consultante, days 3, tm-src-tablero#p0189. Si la fuente no declara repeticiones, se omiten.
Contrato: rollback: Revertir el bloque de energización del generador.. Status: done

#### S1.T1.4 — Resolver los arcanos de cada casa contra la lista canónica docs/content/imagenes/01_arcanos.md: número, nombre y palabra mágica con el sourceRefs del párrafo de la casa (DEC-231). El Loco usa el id 0 y 22 se normaliza a 0 como alias. Si el número no está en la lista, el generador sale con un código distinto de 0 y un mensaje que nombra la casa. Valores esperados: Casa 1, arcano 1 «El Mago», «iniciativa, originalidad, genialidad», tm-src-tablero#p0127; Casa 2, arcanos 2 y 12; Casa 12, arcano 0 «El Loco».
Contrato: rollback: Revertir el bloque de arcanos del generador.. Status: done

#### S1.T1.5 — Asignar depth a cada nodo según la tabla de V-05 (DEC-027): el dato base es standard; el desarrollo narrativo del Rhibu y de la casa, y el mensaje de Thot, son advanced. Implementar --check, que regenera en memoria, compara con casas.v1.json y falla nombrando el archivo de casa o el catálogo divergente.
Contrato: rollback: Revertir la asignación de depth y el modo --check.. Status: done

#### S1.T2 — Escribir tests/test_house_catalog.py con las pruebas del catálogo de casas y correr la regresión de build_result_catalog.py --check. La tarea padre no se ejecuta directamente; cada subtask agrega un grupo de pruebas al mismo archivo.
Contrato: rollback: Borrar tests/test_house_catalog.py y sus fixtures.. Status: done

#### S1.T2.1 — En tests/test_house_catalog.py, pruebas cuyo nombre contiene structure: el catalogo valida contra su JSON Schema; los ids son exactamente house-01..house-12 en orden; content_key == id; catalogVersion presente y igual a la constante definida en build_house_catalog.py; no existe logica que incremente catalogVersion sola; dos corridas del generador producen bytes identicos; asercion literal de que house-01 tiene numero 1 y el nombre exacto leido de docs/content/casas/01_casa_1.md; numero, nombre y zona por casa. No implementa el generador (eso es S1.T1.1 a S1.T1.5).
Contrato: rollback: Borrar el grupo de pruebas de estructura de tests/test_house_catalog.py.. Status: done

#### S1.T2.2 — Agregar el grupo de fidelidad: todo nodo tiene text == sourceText o un editorialResolutionId que existe en el registro; cada sourceRefs existe como ancla en docs/content/fuentes/03_tablero_tao_mangalam.md. Casos de error sobre una copia en memoria: texto de energización editado a mano, sourceRefs tm-src-tablero#p9999 y editorialResolutionId inexistente; cada fallo nombra la casa y el nodo.
Contrato: rollback: Borrar el grupo de pruebas de fidelidad.. Status: done

#### S1.T2.3 — Agregar el grupo de energización: en house-02, la vía del consultante tiene days == 3 (int) y sourceRefs contiene tm-src-tablero#p0189; las 12 casas tienen days == 3 numérico y sourceRefs no vacío en cada vía; repetitions == 108 solo donde la fuente lo declara y la clave está ausente en las demás; el schema rechaza days como string "3".
Contrato: rollback: Borrar el grupo de pruebas de energización.. Status: done

#### S1.T2.4 — Agregar el grupo de Nota 4: house-02 a house-11 traen el nodo de Nota 4 con sourceRefs válido; house-01 y house-12 no tienen la clave (ausente, no null).
Contrato: rollback: Borrar el grupo de pruebas de Nota 4.. Status: done

#### S1.T2.5 — Agregar el grupo de arcanos con valores literales: house-01 trae el arcano 1 «El Mago», palabra mágica «iniciativa, originalidad, genialidad» y sourceRefs tm-src-tablero#p0127; house-02 trae exactamente los arcanos 2 y 12; house-12 trae el arcano 0 «El Loco» y ningún arcano usa el 22. Con un fixture de casa que declara el arcano 23 en un directorio temporal, el generador termina con código distinto de 0 y el mensaje nombra esa casa.
Contrato: rollback: Borrar el grupo de pruebas de arcanos y su fixture.. Status: done

#### S1.T2.6 — Pruebas cuyo nombre contiene depth: todo nodo declara depth en {standard, advanced}; el dato base es standard; los dias de energizacion y el numero y nombre de los arcanos son standard; el desarrollo narrativo del Rhibu, y donde existan el desarrollo de la casa y el mensaje de Thot, son advanced (su ausencia es valida: campo omitido, nunca null); un nodo sin depth es rechazado por el schema; recorrido completo sin ningun null; el schema rechaza text: null.
Contrato: rollback: Borrar el grupo de pruebas de profundidad.. Status: done

#### S1.T2.7 — Pruebas del modo --check en tests/test_house_catalog.py, todas con nombre que contiene check_mode: (a) JSON editado a mano (por ejemplo el texto de un paso de energización de casas.v1.json) hace fallar --check y la prueba de fidelidad; (b) casa modificada sin regenerar (docs/content/casas/03_casa_3.md, en copia temporal) hace fallar --check nombrando el archivo docs/content/casas/03_casa_3.md; (c) repositorio limpio: --check pasa sin errores y el catálogo tiene 12 casas.
Contrato: rollback: Borrar el grupo de pruebas de --check.. Status: done

#### S1.T2.8 — Correr la suite completa del catalogo de casas y la regresion del generador de resultados, y confirmar que HU-02-04 sigue intacto: build_result_catalog.py --check termina en 0 y build_result_catalog.py no se modifico.
Contrato: rollback: Sin cambios de código; si la regresión falla, revertir lo que la rompió en las subtasks anteriores.. Status: done

#### S2.T1 — Copiar el catálogo a app/assets/catalogos/casas.v1.json con python3 scripts/sync_app_catalogs.py (ya existente, no se reescribe). app/assets/catalogos/ ya está declarado como directorio en app/pubspec.yaml por HU-02-04, por lo tanto no hace falta declarar casas.v1.json en el pubspec.
Contrato: rollback: Revertir la copia de app/assets/catalogos/casas.v1.json.. Status: done

#### S2.T2 — Crear el cargador Dart de solo lectura del catálogo de casas, replicando el cargador de resultados de HU-02-04 (DEC-230). Lee el asset sin red y expone una lista no modificable de 12 casas con content_key, content_version, energización por vía (days, repetitions, sourceRefs), arcanos y depth por nodo.
Contrato: rollback: Borrar el archivo del cargador Dart y su export.. Status: done

#### S2.T3 — En .github/workflows/ci-pr.yml y .github/workflows/nightly.yml agregar build_house_catalog.py --check donde falte; conservar los que ya están (build_result_catalog.py --check y python3 scripts/sync_app_catalogs.py --check).
Contrato: rollback: Revertir los cambios en .github/workflows/ci-pr.yml y .github/workflows/nightly.yml con git checkout de esos dos archivos.. Status: done

#### S2.T4 — Dejar compliant con el lint de docs todo documento del baseline que el ticket modifique, normalizando el patron que el linter rechaza; solo se normalizan los documentos efectivamente editados y no se modifican las fuentes de solo lectura docs/content/fuentes/03_tablero_tao_mangalam.md ni docs/content/SCHEMA.md. Si no se edita ningun .md de docs/content, alcanza con check:changed.
Contrato: rollback: Revertir la normalización de formato de los docs tocados.. Status: done

#### S2.T5 — Crear el test Dart del cargador de casas (solo lectura, DEC-230) en app/test/catalogos/: entrega 12 casas inmutables con su content_key (house-01 a house-12) y su content_version; en house-02 la via del consultante trae days 3 y sourceRefs tm-src-tablero#p0189; modificar un elemento de la lista o de un nodo lanza UnsupportedError. La copia alterada se prueba en tests/test_sync_app_catalogs.py.
Contrato: rollback: Revertir los cambios del test Dart de casas en app/test/catalogos.. Status: done

#### S2.T6 — En tests/test_sync_app_catalogs.py (directorios temporales, mecanismo existente de scripts/sync_app_catalogs.py) agregar los casos de copia alterada, faltante y huerfana de casas.v1.json: el --check informa DESACTUALIZADO, FALTANTE y HUERFANO nombrando el archivo y termina distinto de 0. Los nombres de las pruebas nuevas contienen casas para que el filtro -k casas las seleccione.
Contrato: rollback: Revertir los casos agregados en tests/test_sync_app_catalogs.py con git checkout del archivo.. Status: done

#### S2.T7 — Piso de regresion de la variante de docs: la verificacion de docs sobre los cambios contra main pasa y las fuentes de solo lectura docs/content/fuentes/03_tablero_tao_mangalam.md y docs/content/SCHEMA.md quedan sin cambios.
Contrato: rollback: Sin cambios de codigo: si falla, revertir los cambios a las fuentes de solo lectura o corregir los docs tocados.. Status: done
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-06 (edit) `confirmed`: Cada nodo declara su profundidad (standard o advanced) según la tabla de V-05 (DEC-027). El dato base es Estándar. El desarrollo narrativo d
- REQ-09 (edit) `confirmed`: El catálogo se copia a app/assets/catalogos/ con scripts/sync_app_catalogs.py ya existente, que copia por patrón todo *.json de docs/content
- REQ-10 (edit) `confirmed`: Reusar lo ya integrado en epic/EP-02: scripts/catalog_common.py, scripts/sync_app_catalogs.py y el cargador Dart de resultados en app/lib/ca
- REQ-11 (edit) `confirmed`: Variante de lint de docs: todo documento del baseline que el ticket modifique, en particular docs/content/casas/01_casa_1.md, 12_casa_12.md 
- REQ-12 (add) `confirmed`: catalogVersion es una constante del generador build_house_catalog.py, igual que en resultados.v1.json. Subirla al cambiar un texto es regla 
- REQ-13 (add) `confirmed`: Regresión de CI: .github/workflows/ci-pr.yml y .github/workflows/nightly.yml siguen ejecutando build_result_catalog.py --check y además buil
- REQ-14 (add) `confirmed`: Las pruebas Python del ticket se agrupan con nombres específicos (grupo check_mode) para poder filtrarlas sin el patrón genérico check. Pyth

**Tasks agregadas:**

- S2: Agregar en tests/test_sync_app_catalogs.py (directorios temporales, mecanismo existente de scripts/sync_app_catalogs.py) los casos de copia alterada, faltante y huérfana de casas.v1.json: el --check debe informar DESACTUALIZADO, FALTANTE y HUÉRFANO nombrando el archivo. No duplicar el caso en Dart; el test Dart de app/test/catalogos solo carga el asset empaquetado y verifica 12 casas con content_key y content_version. (valida: REQ-09, REQ-10, test; rollback: Revertir los casos agregados en tests/test_sync_app_catalogs.py con git checkout del archivo.)
- S2: Agregar la prueba de profundidad de casas: exige depth == advanced en desarrollo del Rhibu, desarrollo de la casa y mensaje de Thot cuando existen, acepta su ausencia (campo omitido, nunca null) y añade una aserción literal del número y nombre de house-01. Incluir una prueba de que catalogVersion del JSON coincide con la constante de build_house_catalog.py y agrupar las pruebas del modo --check bajo el nombre check_mode. (valida: REQ-06, REQ-07, REQ-12, REQ-14, test; rollback: Revertir con git checkout el archivo de pruebas de casas agregado.)
- S2: Verificar la regresión de CI con Grep sobre .github/workflows/ci-pr.yml y .github/workflows/nightly.yml: ambos deben ejecutar build_result_catalog.py --check, build_house_catalog.py --check y python3 scripts/sync_app_catalogs.py --check. Si falta alguno, agregarlo al job docs de cada workflow sin quitar los existentes. (valida: REQ-13, REQ-08, test; rollback: Revertir los cambios en .github/workflows/ci-pr.yml y nightly.yml con git checkout.)

**Task ops:**

- edit S1.T1.2 { desc="Extraer de docs/content/casas/ por casa: número, nombre y zona, ficha de llegada, título y desarrollo del Rhibu, desarrollo de la casa y mensaje de Thot (estos dos últimos solo donde la fuente los trae; si faltan, omitir el campo, nunca null ni texto inferido), energización por vía, notas 1 y 2, arcanos asociados y Nota 4 en casas 2 a 11. Reutilizar scripts/catalog_common.py y definir catalogVersion como constante del generador, igual que en build_result_catalog.py." }
- edit S2.T4 { desc="Verificar el lint de docs sobre los documentos tocados (docs/content/casas/01_casa_1.md, 12_casa_12.md y docs/content/imagenes/01_arcanos.md si se editan): markdownlint-cli2, cspell y vale, más el chequeo diferencial de docs contra main. Normalizar el patrón que el linter rechaza. No modificar la transcripción del tablero ni SCHEMA.md.", verify=["node_modules/.bin/markdownlint-cli2 docs/content/casas/01_casa_1.md docs/content/casas/12_casa_12.md docs/content/imagenes/01_arcanos.md","node_modules/.bin/cspell --no-progress docs/content/casas/01_casa_1.md docs/content/casas/12_casa_12.md docs/content/imagenes/01_arcanos.md","DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed"] }
- move S1.T6 → S3
- move S1.T7 → S3
- move S1.T8 → S3
- move S1.T9 → S3
- move S1.T10 → S3
- move S1.T11 → S3
- move S1.T12 → S3
- move S1.T13 → S3
- move S1.T14 → S3
- move S1.T15 → S3

### Enmienda 2

**Task ops:**

- edit S1.T2.7 { desc="Escribir las pruebas Python del modo --check de build_house_catalog.py (JSON editado a mano falla y nombra el archivo; casa modificada sin regenerar falla y nombra el archivo; repositorio limpio pasa). Nombrar las pruebas del modo check con el grupo específico check_mode desde esta sesión (por ejemplo clase o prefijo test_check_mode_*), sin usar el filtro genérico check. Python 3.12 en CI; localmente cualquier intérprete con yaml y jsonschema.", verify=["python3 -m pytest tests/test_build_house_catalog.py -k check_mode"] }
- edit S1.T2.6 { desc="Escribir la prueba de profundidad del catálogo de casas (DEC-027): el dato base es standard; el desarrollo de la casa y el mensaje de Thot solo existen donde la fuente los trae. La prueba acepta su ausencia (campo omitido, nunca null) y exige depth == advanced únicamente en los nodos de desarrollo de la casa y de mensaje de Thot que existan; el desarrollo narrativo del Rhibu también es advanced. Esta es la única task que cubre la prueba de profundidad.", validates=["REQ-06","REQ-07"], isTest=true }
- delete S2.T7
- edit S2.T5 { desc="Escribir el test Dart del cargador de casas (solo lectura, DEC-230) que comprueba únicamente la carga del asset empaquetado en app/assets/catalogos/: entrega 12 casas inmutables con su content_key (house-01 a house-12) y su content_version. No incluye el caso de copia alterada: ese caso vive en tests/test_sync_app_catalogs.py con directorios temporales. Correr con el SDK de fvm 3.47.2.", validates=["REQ-09"], isTest=true, verify=["cd app && fvm dart analyze lib/catalogos test/catalogos","cd app && fvm flutter test test/catalogos"] }
- edit S2.T4 { desc="Dejar compliant con el lint de docs todo documento del baseline que el ticket modifique (docs/content/casas/01_casa_1.md, 12_casa_12.md y docs/content/imagenes/01_arcanos.md si se editan), normalizando el patrón que el linter rechaza. No modificar las fuentes que solo se leen (transcripción del tablero, SCHEMA.md). Verificar con markdownlint-cli2, cspell y vale sobre los documentos tocados.", validates=["REQ-11"], verify=["node_modules/.bin/markdownlint-cli2 docs/content/casas/01_casa_1.md docs/content/casas/12_casa_12.md docs/content/imagenes/01_arcanos.md","node_modules/.bin/cspell --no-progress docs/content/casas/01_casa_1.md docs/content/casas/12_casa_12.md docs/content/imagenes/01_arcanos.md","vale --minAlertLevel=suggestion docs/content/casas/01_casa_1.md docs/content/casas/12_casa_12.md docs/content/imagenes/01_arcanos.md"] }
- edit S2.T1 { desc="Correr python3 scripts/sync_app_catalogs.py y luego python3 scripts/sync_app_catalogs.py --check para copiar casas.v1.json a app/assets/catalogos/ y verificar la copia. Usa el mecanismo ya existente: no agregar ningún mecanismo nuevo de copia ni de verificación.", validates=["REQ-09","REQ-10"], verify=["python3 scripts/sync_app_catalogs.py --check"] }
- edit S2.T3 { desc="Agregar en una sola task, en .github/workflows/ci-pr.yml y .github/workflows/nightly.yml, la ejecución de python3 scripts/build_house_catalog.py --check, conservando build_result_catalog.py --check y python3 scripts/sync_app_catalogs.py --check. Verificar el YAML con Grep sobre ambos workflows.", rollback="Revertir los cambios en .github/workflows/ci-pr.yml y .github/workflows/nightly.yml con git checkout de esos dos archivos.", validates=["REQ-08","REQ-13"], isTest=false, verify=["grep -c \"build_house_catalog.py --check\" .github/workflows/ci-pr.yml .github/workflows/nightly.yml","grep -c \"build_result_catalog.py --check\" .github/workflows/ci-pr.yml .github/workflows/nightly.yml","grep -c \"sync_app_catalogs.py --check\" .github/workflows/ci-pr.yml .github/workflows/nightly.yml"] }
- delete S2.T8

### Enmienda 3

**Task ops:**

- edit S1.T2.1 { desc="Implementar el generador scripts/build_house_catalog.py y sus pruebas de esquema, conteos y metadatos en tests/test_house_catalog.py. Agrega: (a) la prueba comprueba que catalogVersion del JSON es igual a la constante del generador y que no existe lógica que la incremente sola (REQ-12); (b) una aserción literal de que house-01 tiene número 1 y su nombre exacto tal como lo trae la fuente docs/content/casas/01_casa_1.md.", validates=["REQ-01","REQ-12"] }
- edit S1.T2.6 { desc="Pruebas de profundidad en tests/test_house_catalog.py: cada nodo declara depth; el desarrollo narrativo del Rhibu, el desarrollo de la casa y el mensaje de Thot son advanced (los dos últimos se aceptan ausentes, nunca null). Agrega el caso de error: un nodo sin depth es rechazado por el JSON Schema.", validates=["REQ-06"] }
- edit S1.T2.7 { desc="Pruebas del modo --check agrupadas con nombres específicos (grupo check_mode) en tests/test_house_catalog.py. Todas las pruebas Python del ticket viven en ese único archivo; no existe tests/test_build_house_catalog.py. Python 3.12 en CI; localmente cualquier intérprete con yaml y jsonschema instalados.", validates=["REQ-08","REQ-14"], verify=["python3 -m pytest tests/test_house_catalog.py -k check_mode"] }
- edit S2.T1 { desc="Copiar el catálogo a app/assets/catalogos/casas.v1.json con python3 scripts/sync_app_catalogs.py (ya existente, no se reescribe). app/assets/catalogos/ ya está declarado como directorio en app/pubspec.yaml por HU-02-04, por lo tanto no hace falta declarar casas.v1.json en el pubspec.", rollback="Revertir la copia de app/assets/catalogos/casas.v1.json." }
- edit S2.T2 { verify=["cd app && fvm dart analyze lib/catalogos"] }
- edit S2.T3 { desc="En .github/workflows/ci-pr.yml y .github/workflows/nightly.yml agregar build_house_catalog.py --check donde falte; conservar los que ya están (build_result_catalog.py --check y python3 scripts/sync_app_catalogs.py --check).", verify=["grep -Fq \"build_result_catalog.py --check\" .github/workflows/ci-pr.yml && grep -Fq \"build_result_catalog.py --check\" .github/workflows/nightly.yml","grep -Fq \"build_house_catalog.py --check\" .github/workflows/ci-pr.yml && grep -Fq \"build_house_catalog.py --check\" .github/workflows/nightly.yml","grep -Fq \"python3 scripts/sync_app_catalogs.py --check\" .github/workflows/ci-pr.yml && grep -Fq \"python3 scripts/sync_app_catalogs.py --check\" .github/workflows/nightly.yml"] }
- edit S2.T4 { desc="Lint de docs: solo se normalizan los documentos efectivamente editados por el ticket (p.ej. docs/content/casas/01_casa_1.md, 12_casa_12.md, docs/content/imagenes/01_arcanos.md si se tocan); las fuentes de solo lectura no se modifican. Los linters (markdownlint-cli2, cspell, vale) se ejecutan sobre los archivos que el ticket modifica; si no modifica ninguno, alcanza con check:changed.", verify=["DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed","git diff --name-only main -- 'docs/content/*.md' | xargs -r node_modules/.bin/markdownlint-cli2","git diff --name-only main -- 'docs/content/*.md' | xargs -r node_modules/.bin/cspell --no-progress"] }
- edit S2.T5 { desc="Ampliar el test Dart del cargador de casas (app/test/catalogos). Además de la carga de 12 casas con content_key y content_version, comprueba la energización de house-02 (vía del consultante con days 3 y sourceRefs tm-src-tablero#p0189) y que la lista es inmutable (modificarla lanza UnsupportedError). El caso de copia alterada queda fuera: vive en tests/test_sync_app_catalogs.py.", rollback="Revertir los cambios del test Dart de casas en app/test/catalogos.", validates=["REQ-09","REQ-14"], verify=["cd app && fvm flutter test test/catalogos"] }

### Enmienda 4
**REQs:**

- REQ-09 (edit) `confirmed`: El catálogo se copia a app/assets/catalogos/ con scripts/sync_app_catalogs.py ya existente, que copia por patrón todo *.json de docs/content

**Task ops:**

- edit S1.T2.6 { desc="Pruebas de profundidad y de campos omitidos en tests/test_house_catalog.py. Profundidad (REQ-06): cada nodo declara depth; el desarrollo del Rhibu, el desarrollo de la casa y el mensaje de Thot son advanced donde existan; la ausencia de desarrollo de la casa o de Thot se acepta (campo omitido, nunca null). Campos omitidos (REQ-07), casos adicionales: (a) recorrido completo del catálogo generado sin ningún valor null en ningún nivel; (b) el schema rechaza un nodo con text: null. Nombres de prueba con la palabra depth (REQ-06) o la palabra structure para los casos de REQ-07 según la convención de filtros -k.", validates=["REQ-06","REQ-07"], verify=["python3 -m pytest tests/test_house_catalog.py -k depth","python3 -m pytest tests/test_house_catalog.py -k structure"] }
- edit S1.T2.1 { desc="Pruebas de estructura, conteos y metadatos en tests/test_house_catalog.py: validación contra el JSON Schema, 12 casas con ids house-01 a house-12, número, nombre y zona por casa, catalogVersion como content_version. Esta task NO implementa el generador (eso es S1.T1.1 a S1.T1.5), solo escribe las pruebas. Convención explícita para todo tests/test_house_catalog.py: los nombres de las pruebas contienen la palabra de su filtro -k (structure, fidelity, energization, note4, arcana, depth, check_mode).", verify=["python3 -m pytest tests/test_house_catalog.py -k structure"] }
- edit S1.T2.7 { desc="Pruebas del modo --check en tests/test_house_catalog.py, todas con nombre que contiene check_mode: (a) JSON editado a mano (por ejemplo el texto de un paso de energización de casas.v1.json) hace fallar --check y la prueba de fidelidad; (b) casa modificada sin regenerar (docs/content/casas/03_casa_3.md, en copia temporal) hace fallar --check nombrando el archivo docs/content/casas/03_casa_3.md; (c) repositorio limpio: --check pasa sin errores y el catálogo tiene 12 casas.", verify=["python3 -m pytest tests/test_house_catalog.py -k check_mode"] }
- edit S2.T4 { verify=["DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed","git diff --name-only main -- docs/content | xargs -r vale --minAlertLevel=suggestion","git diff --quiet main -- docs/content/fuentes/03_tablero_tao_mangalam.md docs/content/SCHEMA.md"] }
- edit S2.T5 { desc="Crear (no ampliar) el test Dart del cargador de casas en app/test/catalogos/ (el cargador de resultados y su test viven en ese directorio, que es el que corre el verify). El test comprueba la carga del asset empaquetado: 12 casas inmutables con content_key y content_version, y la energización de house-02 con la vía del consultante en 3 días y referencia tm-src-tablero#p0189. La copia alterada no se prueba en Dart sino en tests/test_sync_app_catalogs.py.", verify=["dart analyze app/test/catalogos","flutter test app/test/catalogos"] }

### Enmienda 5

**Task ops:**

- edit S2.T5 { verify=["cd app && fvm dart analyze lib/catalogos test/catalogos","cd app && fvm flutter test test/catalogos"] }
- edit S2.T4 { verify=["node_modules/.bin/markdownlint-cli2 $(git diff --name-only main -- docs/content | grep \"\\.md$\") && node_modules/.bin/cspell --no-progress $(git diff --name-only main -- docs/content | grep \"\\.md$\")","git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs vale --minAlertLevel=suggestion","DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed && git diff --quiet main -- docs/content/fuentes/03_tablero_tao_mangalam.md docs/content/SCHEMA.md"] }

### Enmienda 6
**REQs:**

- REQ-01 (edit) `confirmed`: Un generador determinista (scripts/build_house_catalog.py) produce docs/content/catalogos/casas.v1.json desde docs/content/casas/. El archiv
- REQ-12 (edit) `confirmed`: catalogVersion es una constante del generador build_house_catalog.py, igual que en resultados.v1.json, y el catálogo la trae presente e igua
- REQ-06 (edit) `confirmed`: Cada nodo declara su profundidad (standard o advanced) según la tabla de V-05 (DEC-027). El dato base es standard, incluidos los días de ene
- REQ-07 (edit) `confirmed`: Los campos que no están en la fuente se omiten del JSON, nunca como null ni como texto inferido. Un recorrido completo del catálogo no encue

**Task ops:**

- edit S1.T2.1 { desc="En tests/test_house_catalog.py, pruebas cuyo nombre contiene structure: el catalogo valida contra su JSON Schema; los ids son exactamente house-01..house-12 en orden; content_key == id; catalogVersion presente y igual a la constante definida en build_house_catalog.py; no existe logica que incremente catalogVersion sola; dos corridas del generador producen bytes identicos; asercion literal de que house-01 tiene numero 1 y el nombre exacto leido de docs/content/casas/01_casa_1.md; numero, nombre y zona por casa. No implementa el generador (eso es S1.T1.1 a S1.T1.5).", validates=["REQ-01","REQ-07","REQ-12"], verify=["python3 -m pytest tests/test_house_catalog.py -k structure"] }
- edit S1.T2.6 { desc="Pruebas cuyo nombre contiene depth: todo nodo declara depth en {standard, advanced}; el dato base es standard; los dias de energizacion y el numero y nombre de los arcanos son standard; el desarrollo narrativo del Rhibu, y donde existan el desarrollo de la casa y el mensaje de Thot, son advanced (su ausencia es valida: campo omitido, nunca null); un nodo sin depth es rechazado por el schema; recorrido completo sin ningun null; el schema rechaza text: null.", validates=["REQ-06","REQ-07"], verify=["python3 -m pytest tests/test_house_catalog.py -k depth"] }
- edit S1.T1.1 { desc="Crea scripts/build_house_catalog.py (esqueleto con la constante catalogVersion) y, junto al schema JSON de casas, el registro de correcciones editoriales de casas. El registro nace vacio y usa el mismo formato que el de resultados.v1.json (REQ-10); las rutas siguen la convencion de resultados.v1.json. Reutiliza scripts/catalog_common.py sin reescribirlo y no toca scripts/build_result_catalog.py.", validates=["REQ-01","REQ-10"] }
- edit S2.T4 { verify=["git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/markdownlint-cli2 || true","git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/cspell --no-progress || true","git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r vale --minAlertLevel=suggestion || true"] }

### Enmienda 7
**REQs:**

- REQ-11 (edit) `confirmed`: Variante de lint de docs: todo documento del baseline que el ticket modifique, en particular docs/content/casas/01_casa_1.md, 12_casa_12.md 

**Task ops:**

- edit S2.T4 { verify=["git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/markdownlint-cli2","git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/cspell --no-progress","git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r vale --minAlertLevel=suggestion"] }
- edit S2.T6 { desc="Conservar la descripción vigente de S2.T6 y sumar: los nombres de las pruebas nuevas contienen 'casas' para que el filtro -k casas las seleccione." }
- edit S1.T2.8 { desc="Conservar la descripción vigente de S1.T2.8 y sumar al verify: git diff --quiet main -- scripts/build_result_catalog.py, para comprobar que build_result_catalog.py no se reescribe (REQ-10).", verify=["git diff --quiet main -- scripts/build_result_catalog.py"] }

### Enmienda 8

**Task ops:**

- edit S2.T6 { desc="En tests/test_sync_app_catalogs.py (directorios temporales, mecanismo existente de scripts/sync_app_catalogs.py) agregar los casos de copia alterada, faltante y huerfana de casas.v1.json: el --check informa DESACTUALIZADO, FALTANTE y HUERFANO nombrando el archivo y termina distinto de 0. Los nombres de las pruebas nuevas contienen casas para que el filtro -k casas las seleccione.", validates=["REQ-09","REQ-10"], verify=["python3 -m pytest tests/test_sync_app_catalogs.py -k casas"] }
- edit S1.T2.8 { desc="Correr la suite completa del catalogo de casas y la regresion del generador de resultados, y confirmar que HU-02-04 sigue intacto: build_result_catalog.py --check termina en 0 y build_result_catalog.py no se modifico.", validates=["REQ-10"], verify=["python3 -m pytest tests/test_house_catalog.py","python3 scripts/build_result_catalog.py --check","git diff --quiet main -- scripts/build_result_catalog.py"] }
- edit S2.T4 { desc="Dejar compliant con el lint de docs todo documento del baseline que el ticket modifique, normalizando el patron que el linter rechaza; solo se normalizan los documentos efectivamente editados y no se modifican las fuentes de solo lectura docs/content/fuentes/03_tablero_tao_mangalam.md ni docs/content/SCHEMA.md. Si no se edita ningun .md de docs/content, alcanza con check:changed.", validates=["REQ-11"], verify=["git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/markdownlint-cli2","git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/cspell --no-progress","git diff --name-only main -- docs/content | grep \"\\.md$\" | xargs -r vale --minAlertLevel=suggestion"] }
- edit S2.T5 { desc="Crear el test Dart del cargador de casas (solo lectura, DEC-230) en app/test/catalogos/: entrega 12 casas inmutables con su content_key (house-01 a house-12) y su content_version; en house-02 la via del consultante trae days 3 y sourceRefs tm-src-tablero#p0189; modificar un elemento de la lista o de un nodo lanza UnsupportedError. La copia alterada se prueba en tests/test_sync_app_catalogs.py.", validates=["REQ-09","REQ-14"], verify=["cd app && fvm dart analyze lib/catalogos test/catalogos","cd app && fvm flutter test test/catalogos"] }

### Enmienda 9

**Task ops:**

- edit S2.T4 { verify=["git diff --name-only --diff-filter=d main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/markdownlint-cli2","git diff --name-only --diff-filter=d main -- docs/content | grep \"\\.md$\" | xargs -r node_modules/.bin/cspell --no-progress","git diff --name-only --diff-filter=d main -- docs/content | grep \"\\.md$\" | xargs -r vale --minAlertLevel=suggestion"] }
- edit S1.T2.1 { validates=["REQ-01","REQ-12"] }

### Enmienda 10

**Tasks agregadas:**

- S2: Piso de regresion de la variante de docs: la verificacion de docs sobre los cambios contra main pasa y las fuentes de solo lectura docs/content/fuentes/03_tablero_tao_mangalam.md y docs/content/SCHEMA.md quedan sin cambios. (valida: REQ-11; rollback: Sin cambios de codigo: si falla, revertir los cambios a las fuentes de solo lectura o corregir los docs tocados.)
## Sessions

### Session 1 · T3 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T1.4
- [x] S1.T1.5
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T2.4
- [x] S1.T2.5
- [x] S1.T2.6
- [x] S1.T2.7
- [x] S1.T2.8

**Gate (auto)**: El catálogo docs/content/catalogos/casas.v1.json está generado con 12 casas. python3 scripts/build_house_catalog.py --check y tests/test_house_catalog.py pasan en verde, y se ven las casas 1, 2 y 12 con los valores de los criterios.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5
- [x] S2.T6
- [x] S2.T7

**Gate (auto)**: La copia app/assets/catalogos/casas.v1.json se carga con el cargador Dart y su test pasa (12 casas inmutables con content_key y content_version, y la energización de house-02). En ci-pr.yml y en nightly.yml se corren build_house_catalog.py --check y sync_app_catalogs.py --check, y los docs del baseline que se modificaron pasan markdownlint, cspell y vale.
