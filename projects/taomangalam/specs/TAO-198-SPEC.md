---
id: TAO-198-SPEC
project: taomangalam
ticket: TAO-198
status: approved
---

# TAO-198 · HU-02-04 (diferencial): resultados.v1.json validado contra su JSON Schema, patrón común de catálogo, copia a app/assets/catalogos/ verificada en CI y cargador Dart de solo lectura

## Resumen ejecutivo

Qué se hace: el diferencial que deja la Adenda 1. Son cuatro piezas. (1) Validar resultados.v1.json contra resultados.v1.schema.json (draft 2020-12), tanto en tests/ como en los jobs docs de ci-pr.yml y nightly.yml, instalando jsonschema en esos jobs y dejando una sola versión de Python. (2) Extraer de scripts/build_result_catalog.py el patrón común de catálogo (escritura determinista, --check, registro de correcciones editoriales, fidelidad, validación de esquema) sin cambiar ni un byte del JSON generado. (3) Agregar un script de scripts/ que copia el catálogo a app/assets/catalogos/, declararlo en app/pubspec.yaml y sumar un gate de CI que falla nombrando el archivo desactualizado. (4) Escribir el cargador Dart inmutable (locale es) que expone id como content_key y catalogVersion como content_version, y que lanza un error tipado ante un schemaVersion no soportado.
Qué NO se hace: no se toca el generador ni el --check existente, salvo la extracción. Tampoco las pruebas de fidelidad ya entregadas ni los ids y la versión del JSON. Quedan fuera los catálogos de casas, signos y personalidades y los de M1b (HU-02-05/06/10/11), Drift y EP-06, y el derivado para server/ (HU-02-16). El modelo de datos no cambia: el catálogo es un archivo empaquetado, no una tabla.
Cómo se sabe que funciona: python3 -m unittest discover -s tests pasa con la prueba de esquema. Si se edita a mano el text de la Casa 3, fallan --check y la fidelidad. Si la copia en app/ difiere, el gate falla e imprime la ruta. En flutter test, la Casa 1 da content_key house-01 y content_version 1.0.0, hay 12 casas y 8 anillos, y schemaVersion 99 lanza el error tipado.
Tamaño: 3 sesiones (T1, T2, T2), unas 5 a 7 h. El cargador Dart (S3) depende de HU-00-02.
ADVERTENCIAS: (a) Los casos QA citan python3.14, pero el CI documental fija 3.12 (DEC-230). Se propone mantener 3.12 como versión de CI y ajustar el texto del QA en el README de catálogos; si se prefiere 3.14, hay que cambiar ambos workflows. Requiere la decisión del aprobador. (b) En el extracto de ci-pr.yml (job docs, líneas 1199 a 1210) no aparece el unittest discover que la adenda da por entregado: confirmar en qué job corre antes de colgar ahí la validación de esquema. (c) Solo se normaliza para el linter docs/content/catalogos/README.md, por la sonda; el resto de los README del baseline no se toca.
Datos a confirmar antes de ejecutar: 1) Versión de Python del CI (3.12 o 3.14), en DEC-230 y en el aprobador. 2) Job de ci-pr.yml que corre python3 -m unittest discover -s tests, en .github/workflows/ci-pr.yml. 3) Versión fija de jsonschema que admite draft 2020-12 (>=4.18), si existe requirements.txt o un archivo de requisitos del job docs. 4) Estado de HU-00-02: que existan app/pubspec.yaml y la estructura app/lib y app/test, y la versión de Flutter/Dart y el job de CI de la app donde va flutter test. 5) Nombres finales de los archivos nuevos (scripts/catalog_common.py, scripts/sync_app_catalogs.py, app/lib/catalogos/result_catalog.dart): son propuestas, no existen hoy. 6) Valor actual de schemaVersion en resultados.v1.json, que el cargador debe soportar, y la forma exacta de la plantilla closure de la Casa 12, en docs/content/catalogos/resultados.v1.json.

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 1 punto 1; Adenda 2 decisión 1; pedido de cambio (a) y (g)

resultados.v1.json se valida contra resultados.v1.schema.json (draft 2020-12) en las pruebas de tests/ y en los jobs docs de ci-pr.yml y nightly.yml. El paso pip del job documental instala jsonschema==4.23.0 (>=4.18 para draft 2020-12) junto a PyYAML, fijado por la política de pinning, sin cambiar la versión de Python de esos workflows. Python 3.12 es la única versión para CI y para los casos QA (DEC-230); QA-02-04-01 usa python3.12 y no queda pendiente de confirmar. Qué: cerrar el hueco de esquema que hoy no cubre tests/test_result_catalog.py. Por qué: el contrato de consumo de EP-06/EP-07 es el esquema, no solo la fidelidad textual. Hecho verificado: el esquema ya declara catalogVersion en required y additionalProperties:false en la raíz y en content, fields, animal, arrival, regression, closure, house y ring. Por lo tanto el ticket NO modifica resultados.v1.schema.json ni regenera resultados.v1.json, que quedan idénticos byte a byte (git diff vacío).

### REQ-02 `inferred`
> Fuente: Adenda 1 punto 2 (extraer el patrón común solo hasta donde lo necesiten HU-02-05, 06, 10 y 11)

El patrón común de catálogo (escritura determinista, modo --check, carga del registro de correcciones editoriales, verificación de fidelidad text vs sourceText con editorialResolutionId, omisión de campos no declarados y validación de esquema) queda extraído en el módulo compartido scripts/catalog_common.py, que build_result_catalog.py usa. Se extrae solo lo que los catálogos de HU-02-05/06/10/11 necesitan, sin construirlos. Qué: un punto de reuso. Por qué: que los siguientes catálogos no copien el generador.

### REQ-03 `inferred`
> Fuente: Adenda 1 punto 3 (script de copia a app/assets/catalogos/, pubspec y verificación en CI nombrando el archivo)

Un script de scripts/ (scripts/sync_app_catalogs.py) copia solo los JSON de catálogo generados de docs/content/catalogos/ a app/assets/catalogos/. Tiene un modo --check que falla nombrando cada archivo desactualizado o faltante, y una segunda ejecución sin cambios no modifica nada (idempotente). El destino se declara en app/pubspec.yaml y el --check corre en el job docs de CI (DEC-230). El script y su gate de CI son Python y no dependen de HU-00-02. Qué: copia trazable a la app. Por qué: el binario debe llevar exactamente el catálogo validado (DEC-094).

### REQ-04 `inferred`
> Fuente: Adenda 1 punto 4; pedido de cambio (h)

Un cargador Dart de solo lectura lee el catálogo empaquetado sin red y lo convierte en modelos inmutables con locale es. Cada casa y cada anillo expone content_key = id y content_version = catalogVersion. Entrega 12 casas y 8 anillos, y la Casa 12 solo trae la plantilla closure, sin objeto regression. Depende de HU-00-02 (a diferencia del pipeline Python y del script de copia). Qué: la puerta de entrada del contenido a la app. Por qué: los consumidores (EP-06, EP-07) guardan la clave y la versión vistas (DEC-178).

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:119

Ante un schemaVersion distinto del soportado, el cargador lanza un error tipado (una excepción propia del cargador) y no devuelve datos parciales. Qué: un fallo explícito. Por qué: no mostrar contenido incompatible con el binario.

### REQ-06 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Todo documento que toque el ticket, como mínimo docs/content/catalogos/README.md con el patrón de catálogo, el script de copia y la versión de Python, se normaliza para que el linter de docs lo acepte, y se verifica localmente con el job docs antes del PR. Los demás README del baseline (.docs-baseline.txt) no se tocan.

### REQ-07 `confirmed` `enforcement`
> Fuente: taomangalam/.github/workflows/nightly.yml:145

Se reusa lo ya entregado: el generador y el --check de scripts/build_result_catalog.py, las pruebas de fidelidad de tests/test_result_catalog.py, los ids house-NN y ring-NN y el catalogVersion 1.0.0 no se reimplementan ni se reescriben, y docs/content/fuentes/ queda intacto. Los gates nuevos se agregan en los mismos jobs docs (ci-pr.yml y nightly.yml), con el mismo estilo de paso python3 scripts/... y las acciones fijadas por SHA.

### REQ-08 `confirmed` `enforcement`
> Fuente: adenda 2, decisión (2) y pedido de cambio puntos 2 y 6

tests/test_result_catalog.py no se modifica (ni imports ni aserciones). Solo la prueba nueva de esquema usa el módulo común de catálogo extraído en scripts/. Cuando una tarea diga reescribir, se refiere a regenerar archivos de catálogo, no a datos de la base: el ticket no toca tablas ni migraciones, sin cambios al modelo de datos.

### REQ-09 `confirmed` `enforcement`
> Fuente: adenda 2, ajustes menores y pedido de cambio punto 4

Las pruebas Dart del cargador (conteos, plantilla de Casa 12, schemaVersion no soportado, content_key/content_version de la Casa 1) corren solo en local hasta que HU-00-02 habilite el entorno Flutter. No se agrega flutter test a ci-pr.yml ni a nightly.yml en este ticket.
## Tasks

#### S1.T1 — Agregar en tests/ una prueba de validación de docs/content/catalogos/resultados.v1.json contra docs/content/catalogos/resultados.v1.schema.json con jsonschema.Draft202012Validator, que reporte todos los errores con su ruta JSON y el id del nodo cuando aplique. No modificar las pruebas existentes de tests/test_result_catalog.py.
Contrato: rollback: Borrar el archivo de prueba nuevo; las pruebas existentes quedan intactas.. Status: done

#### S1.T2 — Cambiar solo los workflows ci-pr.yml y nightly.yml (jobs docs): agregar jsonschema==4.23.0 (>=4.18 para draft 2020-12) al paso pip junto a PyYAML, por la política de pinning, y dejar Python 3.12 (DEC-230) sin cambiar la versión. No tocar documentos ni QA en esta task, eso es S1.T3.
Contrato: rollback: Revertir ci-pr.yml y nightly.yml al commit previo (git checkout de ambos archivos).. Status: done

#### S1.T3 — Corregir python3.14 por python3.12 en QA-02-04-01 dentro de docs/backlog/EP-02_contenido_empaquetado_y_assets.md y en scripts/assets/README.md si lo cita. No tocar los workflows (S1.T2). Python 3.12 ya está decidido (DEC-230); no hay datos pendientes de confirmar sobre la versión.
Contrato: rollback: Revertir docs/backlog/EP-02_contenido_empaquetado_y_assets.md y scripts/assets/README.md (si fue modificado) al commit previo.. Status: done

#### S1.T4 — Tests y regresión de la sesión: casos de REQ-01 (catálogo válido, catalogVersion faltante, propiedad adicional nombrando house-03, sin skip por dependencia ausente) sobre copias temporales del JSON, más la regresión de tests/test_result_catalog.py.
Contrato: rollback: Revertir los casos agregados en el archivo de prueba de esquema.. Status: done

#### S2.T1 — Extraer el patrón común de catálogo desde scripts/build_result_catalog.py a un módulo compartido de scripts/ (nombre propuesto scripts/catalog_common.py): serialización JSON determinista, modo --check (compara y sale distinto de 0 nombrando el archivo), carga del registro de correcciones editoriales, verificación de fidelidad text vs sourceText con editorialResolutionId que nombra el nodo, omisión de campos no declarados y validación de esquema draft 2020-12. Extraer solo lo que reusarán HU-02-05/06/10/11; no crear sus generadores.
Contrato: rollback: Revertir el commit: build_result_catalog.py vuelve a su forma autocontenida y se borra el módulo común.. Status: done

#### S2.T1.1 — Crear el módulo común con las funciones puras (dump determinista, check de archivo, carga de correcciones, fidelidad, validación de esquema) copiando la lógica actual sin cambiar su comportamiento.
Contrato: rollback: Borrar el módulo nuevo.. Status: done

#### S2.T1.2 — Refactorizar scripts/build_result_catalog.py para que use el módulo común, manteniendo la CLI (--check) y la salida idéntica byte a byte.
Contrato: rollback: git checkout main -- scripts/build_result_catalog.py. Status: done

#### S2.T1.3 — Migrar SOLO la prueba nueva tests/test_result_catalog_schema.py (creada en S1.T1 con jsonschema directo) para que use el módulo scripts/catalog_common.py. tests/test_result_catalog.py no se toca (ni imports ni aserciones). No se modifica resultados.v1.schema.json ni se regenera resultados.v1.json: el esquema ya declara additionalProperties:false y catalogVersion en required, y el catálogo debe quedar idéntico byte a byte (git diff vacío).
Contrato: rollback: Revertir tests/test_result_catalog_schema.py a la versión de S1.T1 (jsonschema directo). tests/test_result_catalog.py no requiere rollback porque no se toca.. Status: done

#### S2.T2 — Documentar el patrón común en docs/content/catalogos/README.md (cómo un catálogo nuevo se apoya en el módulo: generador, esquema, correcciones, fidelidad, --check), manteniendo el archivo compliant con el linter de docs.
Contrato: rollback: git checkout del README a su estado de S1.. Status: done

#### S2.T3 — Tests y regresión: prueba unitaria del módulo común sobre un catálogo mínimo de prueba (un nodo válido, un nodo con text distinto sin editorialResolutionId que falla nombrándolo, un campo opcional ausente que no se serializa como null) y el caso QA-02-04-02 (text de la Casa 3 editado sobre una copia temporal hace fallar --check y la fidelidad).
Contrato: rollback: Borrar el archivo de prueba del módulo común.. Status: done

#### S3.T1 — Script de scripts/ (nombre propuesto scripts/sync_app_catalogs.py) que copia los catálogos generados de docs/content/catalogos/ a app/assets/catalogos/ reusando el check de archivo del módulo común. Con --check sale distinto de 0 imprimiendo cada ruta desactualizada o faltante. Generar la copia inicial, declarar assets/catalogos/ en flutter.assets de app/pubspec.yaml y agregar python3 scripts/sync_app_catalogs.py --check al paso 'Gates de build documental (--check)' de ci-pr.yml y nightly.yml.
Contrato: rollback: Borrar el script y app/assets/catalogos/, revertir app/pubspec.yaml y los pasos agregados en los dos workflows.. Status: pending

#### S3.T2 — Cargador Dart de solo lectura (ruta propuesta app/lib/catalogos/) que lee el asset con rootBundle, verifica el schemaVersion soportado antes de construir nada y lanza una excepción tipada propia sin devolver datos parciales. Mapea a modelos inmutables (campos final, listas no modificables, constructores const cuando aplique) con locale es, y expone content_key = id y content_version = catalogVersion por nodo, con la Casa 12 solo con plantilla closure y regression ausente.
Contrato: rollback: Borrar el directorio del cargador; ningún consumidor existe todavía.. Status: pending

#### S3.T2.1 — Modelos inmutables (catálogo, casa, anillo, plantilla) con content_key y content_version, y la excepción tipada de versión no soportada.
Contrato: rollback: Borrar los archivos de modelos.. Status: pending

#### S3.T2.2 — Función de carga: parseo del JSON, validación de schemaVersion antes de mapear y construcción atómica (o todo o excepción).
Contrato: rollback: Borrar el archivo del cargador.. Status: pending

#### S3.T3 — Documentar en docs/content/catalogos/README.md el script de copia, su --check en CI y el cargador, manteniendo el README compliant con el linter de docs.
Contrato: rollback: git checkout del README a su estado de S2.. Status: pending

#### S3.T4 — Describir las pruebas Dart del cargador, que corren solo en local hasta que HU-00-02 habilite el entorno Flutter (sin agregar flutter test a ci-pr.yml ni nightly.yml): conteos (12 casas, 8 anillos), Casa 12 solo con plantilla closure y sin objeto regression, schemaVersion 99 lanza el error tipado sin datos parciales (QA-02-04-03), y la Casa 1 expone content_key house-01 y content_version 1.0.0 (QA-02-04-04). Las pruebas del script de copia están en la task de tests/test_sync_app_catalogs.py, no aquí.
Contrato: rollback: Borrar los archivos de prueba nuevos.. Status: pending

#### S3.T5 — Antes de implementar el script de copia, crear tests/test_sync_app_catalogs.py (unittest, Python 3.12) contra scripts/sync_app_catalogs.py, trabajando sobre directorios temporales. Casos: (1) con un byte cambiado en app/assets/catalogos/resultados.v1.json, --check sale distinto de 0 y nombra resultados.v1.json; (2) con el archivo borrado, --check falla nombrando el archivo faltante; (3) un segundo run del script de copia no modifica nada (idempotente); (4) solo se copian los JSON de catálogo, no el esquema, las correcciones editoriales ni los README. La prueba debe fallar mientras el script no exista.
Contrato: rollback: Borrar tests/test_sync_app_catalogs.py; no toca ningún otro archivo.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: resultados.v1.json se valida contra resultados.v1.schema.json (draft 2020-12) en las pruebas de tests/ y en los jobs docs de ci-pr.yml y nig
- REQ-08 (add) `confirmed`: tests/test_result_catalog.py no se modifica (ni imports ni aserciones). Solo la prueba nueva de esquema usa el módulo común de catálogo extr
- REQ-09 (add) `confirmed`: Las pruebas Dart del cargador (conteos, plantilla de Casa 12, schemaVersion no soportado, content_key/content_version de la Casa 1) corren s

**Task ops:**

- edit S1.T2 { desc="Instalar jsonschema en el job docs de ci-pr.yml y de nightly.yml, manteniendo Python 3.12 como única versión (DEC-230) sin cambiar la versión que ya fijan esos workflows. Dejar QA-02-04-01 y el README del patrón con python3.12 en lugar de python3.14. Sin diferir la decisión a ningún aprobador.", validates=["REQ-01"], verify=["grep -n 'jsonschema' .github/workflows/ci-pr.yml .github/workflows/nightly.yml","grep -n 'python-version' .github/workflows/ci-pr.yml .github/workflows/nightly.yml"] }
- edit S1.T3 { desc="Fijar Python 3.12 como versión única en la narrativa y en los casos QA: corregir python3.14 a python3.12 en QA-02-04-01 y en cualquier comando documentado, sin diferir a ningún aprobador.", validates=["REQ-01"] }
- edit S1.T4 { validates=["REQ-02"] }
- edit S2.T1.3 { desc="Acotar al alcance nuevo: tests/test_result_catalog.py NO se modifica (ni imports ni aserciones). Solo la prueba nueva de esquema importa y usa el módulo común de scripts/. Si resultados.v1.schema.json no declara additionalProperties:false para las casas, agregarlo antes de escribir esa prueba y regenerar el catálogo si hace falta.", validates=["REQ-02","REQ-08"] }
- edit S3.T4 { desc="Escribir las pruebas Dart del cargador (12 casas y 8 anillos, Casa 12 solo closure sin regression, schemaVersion 99 con error tipado sin datos parciales, Casa 1 con content_key house-01 y content_version 1.0.0). Corren solo en local hasta HU-00-02; no se agrega flutter test a ci-pr.yml ni a nightly.yml.", validates=["REQ-04","REQ-05","REQ-09"] }

### Enmienda 2
**REQs:**

- REQ-01 (edit) `confirmed`: resultados.v1.json se valida contra resultados.v1.schema.json (draft 2020-12) en las pruebas de tests/ y en los jobs docs de ci-pr.yml y nig
- REQ-02 (edit) `inferred`: El patrón común de catálogo (escritura determinista, modo --check, carga del registro de correcciones editoriales, verificación de fidelidad
- REQ-03 (edit) `inferred`: Un script de scripts/ (scripts/sync_app_catalogs.py) copia solo los JSON de catálogo generados de docs/content/catalogos/ a app/assets/catal
- REQ-04 (edit) `inferred`: Un cargador Dart de solo lectura lee el catálogo empaquetado sin red y lo convierte en modelos inmutables con locale es. Cada casa y cada an

**Tasks agregadas:**

- S3: Antes de implementar el script de copia, crear tests/test_sync_app_catalogs.py (unittest, Python 3.12) contra scripts/sync_app_catalogs.py, trabajando sobre directorios temporales. Casos: (1) con un byte cambiado en app/assets/catalogos/resultados.v1.json, --check sale distinto de 0 y nombra resultados.v1.json; (2) con el archivo borrado, --check falla nombrando el archivo faltante; (3) un segundo run del script de copia no modifica nada (idempotente); (4) solo se copian los JSON de catálogo, no el esquema, las correcciones editoriales ni los README. La prueba debe fallar mientras el script no exista. (valida: REQ-03, test; rollback: Borrar tests/test_sync_app_catalogs.py; no toca ningún otro archivo.)

**Task ops:**

- edit S1.T4 { validates=["REQ-01","REQ-08"] }
- edit S1.T2 { desc="Cambiar solo los workflows ci-pr.yml y nightly.yml (jobs docs): agregar jsonschema==4.23.0 (>=4.18 para draft 2020-12) al paso pip junto a PyYAML, por la política de pinning, y dejar Python 3.12 (DEC-230) sin cambiar la versión. No tocar documentos ni QA en esta task, eso es S1.T3.", rollback="Revertir ci-pr.yml y nightly.yml al commit previo (git checkout de ambos archivos).", validates=["REQ-01"] }
- edit S1.T3 { desc="Corregir python3.14 por python3.12 en QA-02-04-01 dentro de docs/backlog/EP-02_contenido_empaquetado_y_assets.md y en scripts/assets/README.md si lo cita. No tocar los workflows (S1.T2). Python 3.12 ya está decidido (DEC-230); no hay datos pendientes de confirmar sobre la versión.", rollback="Revertir docs/backlog/EP-02_contenido_empaquetado_y_assets.md y scripts/assets/README.md (si fue modificado) al commit previo.", validates=["REQ-01"] }
- edit S2.T1.3 { desc="Migrar SOLO la prueba nueva tests/test_result_catalog_schema.py (creada en S1.T1 con jsonschema directo) para que use el módulo scripts/catalog_common.py. tests/test_result_catalog.py no se toca (ni imports ni aserciones). No se modifica resultados.v1.schema.json ni se regenera resultados.v1.json: el esquema ya declara additionalProperties:false y catalogVersion en required, y el catálogo debe quedar idéntico byte a byte (git diff vacío).", rollback="Revertir tests/test_result_catalog_schema.py a la versión de S1.T1 (jsonschema directo). tests/test_result_catalog.py no requiere rollback porque no se toca.", validates=["REQ-02","REQ-08"], verify=["python3.12 -m unittest discover -s tests -p 'test_result_catalog_schema.py'","git diff --exit-code docs/content/catalogos/"] }
- edit S3.T4 { desc="Describir las pruebas Dart del cargador, que corren solo en local hasta que HU-00-02 habilite el entorno Flutter (sin agregar flutter test a ci-pr.yml ni nightly.yml): conteos (12 casas, 8 anillos), Casa 12 solo con plantilla closure y sin objeto regression, schemaVersion 99 lanza el error tipado sin datos parciales (QA-02-04-03), y la Casa 1 expone content_key house-01 y content_version 1.0.0 (QA-02-04-04). Las pruebas del script de copia están en la task de tests/test_sync_app_catalogs.py, no aquí.", validates=["REQ-04","REQ-05","REQ-09"], isTest=true }
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: python3 -m unittest discover -s tests muestra la prueba de esquema pasando. Un JSON alterado en una copia temporal la hace fallar con la ruta del error. ci-pr.yml y nightly.yml instalan jsonschema con la versión de Python decidida, y el README de catálogos pasa el linter.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: build_result_catalog.py --check pasa usando el módulo común y el JSON regenerado no cambia ni un byte. Si se edita a mano el text de la Casa 3, fallan --check y la fidelidad nombrando house-03. El módulo común tiene su propia prueba sobre un catálogo mínimo.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T2.1
- [ ] S3.T2.2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5

**Gate (auto)**: app/assets/catalogos/resultados.v1.json es igual a la fuente y el gate de CI falla nombrando el archivo cuando difieren. En flutter test se ve que la Casa 1 da house-01 / 1.0.0, que hay 12 casas y 8 anillos con la Casa 12 solo closure, y que schemaVersion 99 lanza el error tipado.
