---
id: TAO-202-SPEC
project: taomangalam
ticket: TAO-202
status: approved
---

# HU-02-17 Catálogo versionado del ritual de consulta y de los materiales de la sesión (V-04), trazado a la fuente

## Resumen ejecutivo

Qué se hace: se arma un generador determinista del catálogo con el mismo patrón de HU-02-04 (build_result_catalog.py). Incluye JSON Schema, registro de resoluciones editoriales, pruebas de fidelidad y modo --check. El catálogo trae la introducción (p0009), los seis pasos del ritual en el orden de p0010 y los siete materiales de V-04/DEC-071, con catalogVersion como content_version. También se agrega la copia a app/assets/catalogos/ verificada en CI y un cargador Dart de solo lectura.
Qué NO se hace: materiales de práctica y reparación (HU-02-10), ilustraciones (HU-02-14), capítulos del Instructivo (HU-10-04) ni la interfaz de V-04 (HU-07-04). La fuente 02_como_usar_tao_mangalam.md no se edita y no hay tablas ni migraciones.
Cómo se sabe que funciona: --check y pytest pasan con 6 pasos y 7 materiales, y el paso 6 menciona los dados, el péndulo y los tres soplidos. Si se invierten dos pasos o se cambia p0010 sin regenerar, CI falla y nombra el archivo. El test Dart lee el catálogo empaquetado y devuelve listas inmutables con content_key y content_version.
Tamaño: 2 sesiones T1/T2, 2 puntos. ADVERTENCIA: QA-02-17-03 dice que el primer paso es el mantel de uso exclusivo, pero ese es el primer material. Se prueba literal sobre la lista que la vista presenta primero y se pide a Contenido que lo confirme.
Datos a confirmar antes de ejecutar: (1) rutas reales del patrón HU-02-04 (schema, registro de correcciones, pruebas pytest, cargador Dart y paso de CI que verifica la copia en app/); en origin/main solo se ve scripts/build_result_catalog.py en ci-pr.yml:1204. Confirmar en TAO-198. (2) el nombre final del script (aquí se propone scripts/build_ritual_catalog.py) y del JSON (ritual_sesion.v1.json). (3) el texto exacto de p0009/p0010 en docs/content/fuentes/02_como_usar_tao_mangalam.md y la división en seis pasos según V-04. (4) qué decisión respalda cada material si DEC-071 no los nombra todos.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:1236

El catálogo generado contiene la introducción del ritual (tm-src-como-usar#p0009) y los seis pasos en el orden de p0010. Cada paso tiene content_key estable y único, text, sourceText y sourceRefs. Si el text difiere del fragmento de la fuente, se declara una resolución editorial en el registro de correcciones.

### REQ-02 `confirmed`
> Fuente: Pedido de enmienda punto 6 y Adenda 1 (aclaración QA-02-17-03)

El catálogo lista los materiales de la sesión en el orden de V-04 y DEC-071: mantel de uso exclusivo, tablero, imagen del Dharani Deva, vela, campanilla, los tres dados (12, 8 y 4 caras) y péndulo. Son siete entradas, cada una con content_key único y referencia a la fuente o a la decisión que la declara. Si algún material no queda respaldado por DEC-071 ni por p0009/p0010, el ejecutor no inventa referencia: se detiene en ese material, lo registra como pregunta abierta para Contenido y continúa con el resto. El mantel de uso exclusivo es el primer material (QA-02-17-03 se prueba sobre la lista de materiales, no sobre los pasos).

### REQ-03 `confirmed`
> Fuente: Adenda 1 TAO-202 y respuesta a TAO-202-Q1

El catálogo ritual_sesion se valida contra su JSON Schema (docs/content/catalogos/ritual_sesion.v1.schema.json) y lleva catalogVersion como content_version. catalogVersion es una constante en scripts/build_ritual_catalog.py (valor 1.0.0), como en los catálogos existentes; no se crea mecanismo de hash ni comparación contra origin/main. El modo --check regenera en memoria, compara con docs/content/catalogos/ritual_sesion.v1.json y falla nombrando el archivo cuando la fuente (p0010) cambió sin regenerar. Subir catalogVersion ante un cambio de texto es una regla documentada en docs/development/commands.md, sin test automático de bump.

### REQ-04 `confirmed`
> Fuente: Adenda 1 y pedido de enmienda punto 1: verificación de la copia en app/

El catálogo se copia a app/assets/catalogos/ritual_sesion.v1.json y CI verifica que la copia sea idéntica a la generada: el modo --check de scripts/build_ritual_catalog.py compara TANTO docs/content/catalogos/ritual_sesion.v1.json COMO app/assets/catalogos/ritual_sesion.v1.json con lo regenerado en memoria (como hace build_result_catalog.py; si el patrón usa otro mecanismo en ci-pr.yml, se sigue ese) y falla nombrando el archivo que difiere. Un cargador Dart de solo lectura (DEC-230) lee el catálogo empaquetado sin red (DEC-094) y entrega los pasos y los materiales como colecciones inmutables con su content_key y content_version.

### REQ-05 `confirmed` `enforcement`
> Fuente: Adenda 1 TAO-202 (rutas verificadas en epic/EP-02)

El generador sigue el patrón de HU-02-04 y reutiliza la infraestructura existente: scripts/build_ritual_catalog.py importa scripts/catalog_common.py (sin copiar ni duplicar su lógica) y es una capa delgada específica del ritual; tests/test_ritual_catalog.py reutiliza tests/test_catalog_common.py y sus helpers sin duplicar fixtures; el cargador Dart reutiliza errores_catalogo.dart. Rutas con el nombre único ritual_sesion: docs/content/catalogos/ritual_sesion.v1.json, ritual_sesion.v1.schema.json y correcciones_editoriales_ritual_sesion.v1.json; copia en app/assets/catalogos/ritual_sesion.v1.json registrada en app/pubspec.yaml; cargador en app/lib/catalogos/cargador_catalogo_ritual_sesion.dart y catalogo_ritual_sesion.dart. El --check se agrega en el paso 'Gates de build documental (--check)' de .github/workflows/ci-pr.yml conservando la línea de build_result_catalog.py y las que agreguen TAO-199 y TAO-203.

### REQ-06 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

El generador del catálogo del ritual y su modo --check quedan documentados en docs/development/commands.md, con uso, parámetros y un ejemplo, junto a los demás comandos del repo. Incluye la regla de que un cambio de texto del catálogo exige subir catalogVersion en scripts/build_ritual_catalog.py.

### REQ-07 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

La fuente docs/content/fuentes/02_como_usar_tao_mangalam.md es de solo lectura para el generador y no se edita. Si el trabajo modifica docs/content/SCHEMA.md, debe quedar compliant con el linter de docs para que el job docs y quality-gate no queden en rojo.
## Tasks

#### S1.T1 — Implementar scripts/build_ritual_catalog.py como capa delgada sobre scripts/catalog_common.py (importarla, sin copiar su lógica). El generador escribe DOS archivos con el mismo contenido: la fuente docs/content/catalogos/ritual_sesion.v1.json y la copia empaquetada app/assets/catalogos/ritual_sesion.v1.json. Esta misma tarea registra la copia en la sección de assets de app/pubspec.yaml (entrada app/assets/catalogos/ritual_sesion.v1.json). El modo --check regenera en memoria y compara con AMBOS archivos (docs/content/catalogos/ritual_sesion.v1.json y app/assets/catalogos/ritual_sesion.v1.json); si alguno difiere o falta, falla nombrando el archivo que difiere. catalogVersion es una constante en el generador (valor 1.0.0).
Contrato: rollback: Revertir los cambios de scripts/build_ritual_catalog.py, borrar docs/content/catalogos/ritual_sesion.v1.json y app/assets/catalogos/ritual_sesion.v1.json, y quitar la entrada de ritual_sesion.v1.json de la sección de assets de app/pubspec.yaml. Este rollback cubre la copia y el registro en pubspec.. Status: done

#### S1.T1.1 — Crear el esquema docs/content/catalogos/ritual_sesion.v1.schema.json y la fuente generada docs/content/catalogos/ritual_sesion.v1.json.
Contrato: rollback: Eliminar ritual_sesion.v1.schema.json y ritual_sesion.v1.json de docs/content/catalogos/.. Status: done

#### S1.T1.2 — Crear el registro de correcciones editoriales docs/content/catalogos/correcciones_editoriales_ritual_sesion.v1.json.
Contrato: rollback: Eliminar correcciones_editoriales_ritual_sesion.v1.json.. Status: done

#### S1.T1.3 — Declarar los siete materiales (mantel de uso exclusivo, tablero, imagen del Dharani Deva, vela, campanilla, dados de 12/8/4 caras, péndulo) con content_key y referencia a la fuente o a DEC-071. No incluir kuberani, corrector ni minerales.
Contrato: rollback: Revertir la sección de materiales del generador.. Status: done

#### S1.T1.4 — Agregar python scripts/build_ritual_catalog.py --check al paso 'Gates de build documental (--check)' de .github/workflows/ci-pr.yml, conservando la línea de build_result_catalog.py y las que agreguen TAO-199 y TAO-203; ante conflicto, conservar todas las líneas. El test de regresión verifica que la línea de build_result_catalog.py sigue presente.
Contrato: rollback: Quitar la línea de build_ritual_catalog.py --check de ci-pr.yml sin tocar las demás.. Status: done

#### S1.T2 — Documentar en docs/development/commands.md el generador build_ritual_catalog.py y su --check (uso, parámetros, ejemplo) y la regla de que un cambio de texto del catálogo exige subir catalogVersion. Si se toca docs/content/SCHEMA.md, dejarlo compliant con el linter de docs.
Contrato: rollback: Revertir la sección añadida en docs/development/commands.md.. Status: done

#### S1.T3 — Escribir tests/test_ritual_catalog.py reutilizando tests/test_catalog_common.py y sus helpers, sin duplicar fixtures. Cubre esquema, orden y fidelidad, --check, la línea de build_result_catalog.py en ci-pr.yml, y que commands.md documente la regla de catalogVersion (sin test automático de bump).
Contrato: rollback: Eliminar tests/test_ritual_catalog.py.. Status: done

#### S2.T1 — Escribir en tests/test_ritual_catalog.py (reutilizando helpers de tests/test_catalog_common.py, sin duplicar fixtures) los tests que verifican: (a) que app/assets/catalogos/ritual_sesion.v1.json es byte a byte idéntico al generado y a docs/content/catalogos/ritual_sesion.v1.json, y que la prueba falla nombrando el archivo cuando difieren; (b) que app/pubspec.yaml registra app/assets/catalogos/ritual_sesion.v1.json en la sección de assets. Esta tarea solo agrega los tests; no modifica el generador, la copia ni pubspec.
Contrato: rollback: Revertir el test agregado en tests/test_ritual_catalog.py. El rollback de la copia app/assets/catalogos/ritual_sesion.v1.json y del registro en app/pubspec.yaml pertenece a S1.T1.. Status: pending

#### S2.T2 — Crear el cargador Dart de solo lectura en app/lib/catalogos/cargador_catalogo_ritual_sesion.dart y app/lib/catalogos/catalogo_ritual_sesion.dart, reutilizando errores_catalogo.dart.
Contrato: rollback: Eliminar ambos archivos Dart.. Status: pending

#### S2.T3 — Escribir app/test/catalogos/cargador_catalogo_ritual_sesion_test.dart: entrega pasos y materiales inmutables con content_key y content_version. QA-02-17-03 se prueba sobre la lista de materiales (el mantel de uso exclusivo es el primer material) y se deja constancia para que Contenido lo confirme.
Contrato: rollback: Eliminar app/test/catalogos/cargador_catalogo_ritual_sesion_test.dart.. Status: pending
## Cambios al modelo de datos

- tipo: seed_catalog | objetos: app/assets/catalogos/ritual_sesion.v1.json (catálogo empaquetado, sin base de datos) | destructivo: no | tarea: S1.T1 | rollback: Revertir el commit que agrega el JSON, su copia en app/ y el cargador. Las fuentes editoriales quedan intactas y HU-07-04 todavía no lo consume.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-03 (edit) `confirmed`: El catálogo ritual_sesion se valida contra su JSON Schema (docs/content/catalogos/ritual_sesion.v1.schema.json) y lleva catalogVersion como 
- REQ-05 (edit) `confirmed`: El generador sigue el patrón de HU-02-04 y reutiliza la infraestructura existente: scripts/build_ritual_catalog.py importa scripts/catalog_c
- REQ-06 (edit) `confirmed`: El generador del catálogo del ritual y su modo --check quedan documentados en docs/development/commands.md, con uso, parámetros y un ejemplo

**Task ops:**

- edit S1.T1 { desc="Crear scripts/build_ritual_catalog.py como capa delgada específica del ritual: importa y reutiliza scripts/catalog_common.py (no copiar ni duplicar su lógica). Define catalogVersion como constante 1.0.0 y soporta --check.", rollback="Eliminar scripts/build_ritual_catalog.py; catalog_common.py queda intacto.", validates=["REQ-03","REQ-05"], verify=["python scripts/build_ritual_catalog.py --check"] }
- edit S1.T1.1 { desc="Crear el esquema docs/content/catalogos/ritual_sesion.v1.schema.json y la fuente generada docs/content/catalogos/ritual_sesion.v1.json.", rollback="Eliminar ritual_sesion.v1.schema.json y ritual_sesion.v1.json de docs/content/catalogos/.", verify=["python -m pytest tests/test_ritual_catalog.py -k schema"] }
- edit S1.T1.2 { desc="Crear el registro de correcciones editoriales docs/content/catalogos/correcciones_editoriales_ritual_sesion.v1.json.", rollback="Eliminar correcciones_editoriales_ritual_sesion.v1.json.", verify=["python -m pytest tests/test_ritual_catalog.py -k fidelity"] }
- edit S1.T1.4 { desc="Agregar python scripts/build_ritual_catalog.py --check al paso 'Gates de build documental (--check)' de .github/workflows/ci-pr.yml, conservando la línea de build_result_catalog.py y las que agreguen TAO-199 y TAO-203; ante conflicto, conservar todas las líneas. El test de regresión verifica que la línea de build_result_catalog.py sigue presente.", rollback="Quitar la línea de build_ritual_catalog.py --check de ci-pr.yml sin tocar las demás.", validates=["REQ-05"], verify=["python -m pytest tests/test_ritual_catalog.py -k ci"] }
- edit S1.T2 { desc="Documentar en docs/development/commands.md el generador build_ritual_catalog.py y su --check (uso, parámetros, ejemplo) y la regla de que un cambio de texto del catálogo exige subir catalogVersion. Si se toca docs/content/SCHEMA.md, dejarlo compliant con el linter de docs.", rollback="Revertir la sección añadida en docs/development/commands.md.", validates=["REQ-03","REQ-06"], verify=["python -m pytest tests/test_ritual_catalog.py -k docs"] }
- edit S1.T3 { desc="Escribir tests/test_ritual_catalog.py reutilizando tests/test_catalog_common.py y sus helpers, sin duplicar fixtures. Cubre esquema, orden y fidelidad, --check, la línea de build_result_catalog.py en ci-pr.yml, y que commands.md documente la regla de catalogVersion (sin test automático de bump).", rollback="Eliminar tests/test_ritual_catalog.py.", validates=["REQ-01","REQ-02","REQ-03","REQ-05","REQ-06"], isTest=true, verify=["python -m pytest tests/test_ritual_catalog.py"] }
- edit S2.T1 { desc="Copiar el catálogo a app/assets/catalogos/ritual_sesion.v1.json y registrar la entrada en app/pubspec.yaml; CI verifica que la copia sea idéntica a la generada.", rollback="Eliminar la copia y la entrada de app/pubspec.yaml.", validates=["REQ-04","REQ-05"], verify=["python scripts/build_ritual_catalog.py --check"] }
- edit S2.T2 { desc="Crear el cargador Dart de solo lectura en app/lib/catalogos/cargador_catalogo_ritual_sesion.dart y app/lib/catalogos/catalogo_ritual_sesion.dart, reutilizando errores_catalogo.dart.", rollback="Eliminar ambos archivos Dart.", validates=["REQ-04","REQ-05"], verify=["cd app && dart analyze lib/catalogos/cargador_catalogo_ritual_sesion.dart lib/catalogos/catalogo_ritual_sesion.dart"] }
- edit S2.T3 { desc="Escribir app/test/catalogos/cargador_catalogo_ritual_sesion_test.dart: entrega pasos y materiales inmutables con content_key y content_version. QA-02-17-03 se prueba sobre la lista de materiales (el mantel de uso exclusivo es el primer material) y se deja constancia para que Contenido lo confirme.", rollback="Eliminar app/test/catalogos/cargador_catalogo_ritual_sesion_test.dart.", validates=["REQ-04","REQ-02"], isTest=true, verify=["cd app && flutter test test/catalogos/cargador_catalogo_ritual_sesion_test.dart"] }

### Enmienda 2
**REQs:**

- REQ-04 (edit) `confirmed`: El catálogo se copia a app/assets/catalogos/ritual_sesion.v1.json y CI verifica que la copia sea idéntica a la generada: el modo --check de 
- REQ-02 (edit) `confirmed`: El catálogo lista los materiales de la sesión en el orden de V-04 y DEC-071: mantel de uso exclusivo, tablero, imagen del Dharani Deva, vela

**Task ops:**

- edit S1.T1 { desc="Implementar scripts/build_ritual_catalog.py como capa delgada sobre scripts/catalog_common.py (sin copiar su lógica). Su modo --check regenera en memoria y compara TANTO docs/content/catalogos/ritual_sesion.v1.json COMO la copia app/assets/catalogos/ritual_sesion.v1.json (mismo mecanismo que build_result_catalog.py; si el patrón usa otro mecanismo en ci-pr.yml, seguir ese), y falla nombrando el archivo que difiere. catalogVersion es constante 1.0.0. Si algún material no queda respaldado por DEC-071 ni por p0009/p0010, no inventar referencia: detenerse en ese material, registrarlo como pregunta abierta para Contenido y seguir con el resto.", verify=["python3 scripts/build_ritual_catalog.py --check","python3 -m pytest tests/test_ritual_catalog.py"] }
- edit S1.T1.4 { verify=["python3 scripts/build_result_catalog.py --check","grep -n \"build_result_catalog.py --check\" .github/workflows/ci-pr.yml","grep -n \"build_ritual_catalog.py --check\" .github/workflows/ci-pr.yml"] }
- edit S1.T2 { validates=["REQ-06","REQ-07"], verify=["git diff origin/main -- docs/content/fuentes/02_como_usar_tao_mangalam.md","npx markdownlint-cli2 docs/development/commands.md","npx markdownlint-cli2 docs/content/SCHEMA.md"] }
- edit S2.T1 { desc="En tests/test_ritual_catalog.py (reutilizando tests/test_catalog_common.py y sus helpers) agregar un test que falle si la copia app/assets/catalogos/ritual_sesion.v1.json difiere de la generada, y cuyo mensaje nombre el archivo de app/. Cubrir también que el modo --check de scripts/build_ritual_catalog.py compara TANTO docs/content/catalogos/ritual_sesion.v1.json COMO la copia en app/ y falla nombrando el archivo que difiere. Con esto queda cubierto REQ-04.", validates=["REQ-03","REQ-04"], isTest=true, verify=["python3 -m pytest tests/test_ritual_catalog.py","python3 scripts/build_ritual_catalog.py --check"] }

### Enmienda 3

**Task ops:**

- edit S1.T1 { desc="Implementar scripts/build_ritual_catalog.py como capa delgada sobre scripts/catalog_common.py (importarla, sin copiar su lógica). El generador escribe DOS archivos con el mismo contenido: la fuente docs/content/catalogos/ritual_sesion.v1.json y la copia empaquetada app/assets/catalogos/ritual_sesion.v1.json. Esta misma tarea registra la copia en la sección de assets de app/pubspec.yaml (entrada app/assets/catalogos/ritual_sesion.v1.json). El modo --check regenera en memoria y compara con AMBOS archivos (docs/content/catalogos/ritual_sesion.v1.json y app/assets/catalogos/ritual_sesion.v1.json); si alguno difiere o falta, falla nombrando el archivo que difiere. catalogVersion es una constante en el generador (valor 1.0.0).", rollback="Revertir los cambios de scripts/build_ritual_catalog.py, borrar docs/content/catalogos/ritual_sesion.v1.json y app/assets/catalogos/ritual_sesion.v1.json, y quitar la entrada de ritual_sesion.v1.json de la sección de assets de app/pubspec.yaml. Este rollback cubre la copia y el registro en pubspec.", validates=["REQ-03","REQ-04","REQ-05"] }
- edit S1.T1.1 { verify=["python3 -m pytest tests/test_ritual_catalog.py -q"] }
- edit S1.T1.2 { verify=["python3 scripts/build_ritual_catalog.py --check"] }
- edit S1.T3 { verify=["python3 scripts/build_ritual_catalog.py --check","python3 -m pytest tests/test_ritual_catalog.py -q"] }
- edit S2.T1 { desc="Escribir en tests/test_ritual_catalog.py (reutilizando helpers de tests/test_catalog_common.py, sin duplicar fixtures) los tests que verifican: (a) que app/assets/catalogos/ritual_sesion.v1.json es byte a byte idéntico al generado y a docs/content/catalogos/ritual_sesion.v1.json, y que la prueba falla nombrando el archivo cuando difieren; (b) que app/pubspec.yaml registra app/assets/catalogos/ritual_sesion.v1.json en la sección de assets. Esta tarea solo agrega los tests; no modifica el generador, la copia ni pubspec.", rollback="Revertir el test agregado en tests/test_ritual_catalog.py. El rollback de la copia app/assets/catalogos/ritual_sesion.v1.json y del registro en app/pubspec.yaml pertenece a S1.T1.", validates=["REQ-04","REQ-05"], isTest=true, verify=["python3 -m pytest tests/test_ritual_catalog.py -q"] }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T1.4
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: --check pasa en el repo limpio y la suite tests/test_ritual_catalog.py pasa en verde con 6 pasos y 7 materiales. Al invertir dos pasos, la prueba de fidelidad falla nombrando los content_key. commands.md documenta el comando.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: La copia en app/assets/catalogos/ritual_sesion.v1.json coincide con la generada y CI lo verifica. El test Dart del cargador pasa: 6 pasos, 7 materiales inmutables, primer material mantel de uso exclusivo y content_version igual a catalogVersion.

### Session 3 · T0 · open
