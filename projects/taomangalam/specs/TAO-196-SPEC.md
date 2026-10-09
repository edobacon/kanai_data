---
id: TAO-196-SPEC
project: taomangalam
ticket: TAO-196
status: draft
---

# TAO-196 · Inventario de assets: manifiesto v2 con JSON Schema, estados, autoría, destino y modo, validado en CI

## Resumen ejecutivo

Se define el JSON Schema v2 del manifiesto de assets y se migra app/assets/manifest.json (hoy 64 entradas) a schemaVersion 2. La migración incorpora los 59 PNG de arcanos, zodiaco e identidad, la clasificación inicial de estado según content/imagenes/09, 10, 11, 12 y 03, el modo inicial de DEC-173 y la lista de no productivos. Se agrega un validador en scripts/ con pruebas en tests/ que corre en CI y reporta todos los errores de una vez, con id o ruta y motivo. NO incluye derivados WebP (HU-02-03), producción de arte faltante (HU-02-07, HU-02-08, HU-02-12 a HU-02-14), iconos de tienda (EP-17) ni licencia. Se sabe que funciona cuando el manifiesto migrado da 0 errores y 0 PNG sin registrar, y cuando los manifiestos de prueba inválidos (estado `listo`, PNG huérfano, medidas distintas, `aprobado` sin aprobación o sin derivados, `dark` no nulo) hacen fallar CI nombrando el id o la ruta. Tamaño: 2 sesiones (5 puntos). ADVERTENCIA: el request exige que el resolvedor lea solo el esquema nuevo; si el proveedor de TAO-190 ya lee manifest.json v1, hay que adaptarlo en este mismo cambio para no romper EP-01. Pendiente externo: ninguna pieza puede quedar `aprobado` sin la aprobación registrada de Diseño y de Contenido. Si la licencia sigue sin definirse, la clasificación inicial no tendrá entradas `aprobado`.

Datos a confirmar antes de ejecutar:
1) Runner de pruebas y de scripts del repo (node --test, vitest u otro) y nombre del script del package.json raíz que corre CI. Se confirma en package.json y en .github/workflows/ de taomangalam@origin/main. Los comandos de verify suponen node --test con .mjs.
2) Si TAO-190 ya dejó un validador o un lector del manifiesto (commit 7fd2655: 'ep01-assets-provider ejecutable encadena validador, --check'). Se confirma en scripts/ y en el código del proveedor. Si existe, se extiende en vez de crear uno nuevo.
3) Librería para validar JSON Schema (ajv u otra ya presente) y forma de leer medidas de PNG sin dependencia nueva. Se confirma en las dependencias del package.json.
4) Formato del registro de aprobaciones (quién y cuándo) y del enlace al registro de creación según doc 46 §10. Se confirma en ese documento.
5) Valor inicial de modo por familia según DEC-173. Se confirma en el registro de decisiones.

## Requirements

### REQ-01 `confirmed`
> Fuente: pedido de cambio punto 3; criterios de aceptación y requisitos transversales de accesibilidad de HU-02-02

Existe un JSON Schema del manifiesto con schemaVersion 2 que exige por asset: id estable, familia, ruta del maestro, estado (aprobado, provisional, por-corregir, por-optimizar, faltante), fuente o autoría con enlace al registro de creación, destino (vistas o componentes), ancho y alto del maestro, tema (light en V1), plataforma, modo (empaquetado o descargable), alt, aprobaciones de Diseño y Contenido y derivados registrados. El esquema define un campo booleano `decorativo`: un asset decorativo (por ejemplo los fondos) admite alt vacío solo si `decorativo` es true; el alt es obligatorio y no vacío para los assets informativos (decorativo false u omitido), y el validador falla nombrando el id cuando un asset informativo tiene alt vacío. El esquema declara solo ancho y alto del maestro: las medidas por composición de teléfono y tablet no son un campo de este manifiesto y pertenecen a HU-02-03.

### REQ-02 `confirmed`
> Fuente: Adenda 1 del request (respuesta a TAO-196-Q1, opción B); pedido de cambio punto 1

El validador contrasta el manifiesto con el disco: el maestro debe existir y sus medidas reales coincidir con ancho y alto declarados; todo PNG bajo app/assets/ debe estar en el manifiesto o en la lista explícita de no productivos; una entrada `faltante` se acepta sin archivo pero exige destino y medidas objetivo. Por la Adenda 1, el validador acepta como ruta de maestro un archivo bajo docs/content/imagenes/ para las familias arcanos, zodiaco e identidad (no se copian a app/assets/); el chequeo de PNG sin entrada aplica solo bajo app/assets/ y no recorre docs/content/imagenes/.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:121

El validador aplica las reglas de estado y tema: una entrada `aprobado` exige la aprobación registrada de Diseño y de Contenido; una entrada `aprobado` sin derivados registrados falla indicando que debe ser `por-optimizar` (DEC-230); una variante de tema `dark` no nula falla en V1 (DEC-196).

### REQ-04 `confirmed`
> Fuente: Adenda 1 del request; pedido de cambio puntos 1 y 6; pendiente externo en Planificación de HU-02-02

app/assets/manifest.json se migra a schemaVersion 2: las 64 entradas actuales conservan id y alt, se incorporan los 59 PNG de arcanos, zodiaco e identidad con la ruta del maestro apuntando a su ubicación actual en docs/content/imagenes/ (no se copian a app/assets/; el empaquetado y el tamaño pertenecen a HU-02-03), la permanencia figura como `provisional`, los fondos de 940/941x1672 no figuran como `aprobado`, el modo toma el valor inicial de DEC-173 y la clasificación sigue content/imagenes/09, 10, 11, 12 y 03. El pendiente externo de licencia y autoría del arte generado bloquea el estado `aprobado`: la clasificación inicial no deja ninguna entrada en `aprobado`. El estado `por-optimizar` queda permitido solo si la entrada ya tiene la aprobación registrada de Diseño y de Contenido, y la clasificación real no lo usa mientras no exista la definición de licencia y autoría.

### REQ-05 `inferred`
> Fuente: pedido de cambio puntos 5 y 7

El workflow de CI invoca el validador del manifiesto y propaga su código de salida distinto de cero ante cualquier error (esto se demuestra con el archivo de workflow y los tests del validador). Antes de la migración a schemaVersion 2 el paso de CI corre solo las pruebas del validador con fixtures; el paso que valida app/assets/manifest.json real se activa en la sesión de la migración y no antes, para que CI no quede en rojo con el manifiesto en v1. El gate de la Sesión 1 se redacta como: el workflow invoca las pruebas del validador; que el job quede en verde en GitHub es verificación manual (advisory) y no integra el criterio de gate. El gate no afirma que el validador "corre en CI".

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:116

El resolvedor o proveedor de assets que hoy consume manifest.json lee solo el esquema v2.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:115

El validador reutiliza la estructura existente de scripts/ y tests/ y, si TAO-190 dejó un validador o lector del manifiesto, lo extiende en vez de duplicarlo. No agrega dependencias si ya hay una librería de JSON Schema o lectura de PNG en el repo.

### REQ-08 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

El validador queda documentado en docs/development/commands.md con uso, parámetros y un ejemplo de salida con error. El chequeo de que el nombre del script aparece documentado se resuelve con un grep local en el verify de la tarea que lo documenta; no se agrega ningún chequeo nuevo al workflow de CI.

### REQ-09 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

docs/content/SCHEMA.md, actualizado con el esquema v2 del manifiesto en la misma sesión que la migración del manifiesto, queda conforme con los tres linters de docs (markdownlint-cli2, cspell y vale) y .docs-baseline.txt no gana líneas respecto de origin/main.

### REQ-10 `confirmed`
> Fuente: pedido de cambio punto 2; Pruebas y evidencia de HU-02-02

El propio validador emite el resumen de assets por estado para adjuntar al PR cuando se invoca con el flag `--summary`: una línea por cada uno de los cinco estados (aprobado, provisional, por-corregir, por-optimizar, faltante) con su cantidad de entradas, incluidos los estados con cantidad 0, y el total. Con un estado inválido (por ejemplo `listo`) el validador falla también con `--summary`. Sin `--summary` la salida del validador no cambia. El resumen no se genera con un script aparte. El flag se documenta en docs/development/commands.md junto al resto de los parámetros del validador.
## Tasks

#### S1.T1 — Crear el schema y el validador del manifiesto v2 en scripts/, reutilizando el validador o lector de TAO-190 si existe (confirmar en scripts/). Debe informar todos los errores de una vez, en formato `<id|ruta>: <motivo>`, y salir con código distinto de 0 si hay errores.
Contrato: rollback: Revertir el JSON Schema del manifiesto v2 junto con el manifiesto y el validador como una unidad: restaurar el app/assets/manifest.json previo (schemaVersion 1) y conservar los maestros. Comprobación: CI valida el manifiesto restaurado y no quedan referencias al schema nuevo.. Status: pending

#### S1.T1.1 — Escribir el JSON Schema v2 (schemaVersion 2; estados aprobado, provisional, por-corregir, por-optimizar y faltante; modo empaquetado o descargable; tema light; fuente o autoría con enlace; destino; ancho y alto; plataforma; alt; aprobaciones de Diseño y Contenido; derivados) junto al validador.
Contrato: rollback: Borrar el archivo del schema.. Status: pending

#### S1.T1.2 — Implementar la validación de schema e ids únicos con acumulación de errores (sin cortar en el primero).
Contrato: rollback: Revertir el script.. Status: pending

#### S1.T1.3 — Implementar los chequeos contra el disco: el maestro existe, medidas reales de PNG contra las declaradas, PNG bajo app/assets/ sin entrada ni lista de no productivos y entrada faltante sin archivo con destino y medidas objetivo.
Contrato: rollback: Revertir el script.. Status: pending

#### S1.T1.4 — Implementar las reglas de negocio: aprobado exige aprobación de Diseño y de Contenido; aprobado sin derivados pide `por-optimizar` (DEC-230); tema dark no nulo falla en V1 (DEC-196).
Contrato: rollback: Revertir el script.. Status: pending

#### S1.T2 — Agregar el paso de CI que corre solo las pruebas del validador con fixtures (sin validar todavía app/assets/manifest.json real) y propagar su código de salida distinto de cero. Además, documentar el validador en docs/development/commands.md con uso, parámetros y un ejemplo de salida con error. El chequeo de que el nombre del script aparece documentado se resuelve con un grep local en el verify, sin agregar un chequeo nuevo al workflow.
Contrato: rollback: Revertir el paso del workflow y la sección de commands.md.. Status: pending

#### S1.T3 — Escribir las pruebas del validador en tests/ con fixtures válidos e inválidos bajo tests/fixtures/asset-manifest/: estado listo, id duplicado, maestro inexistente, medidas distintas, PNG huérfano, no productivo ignorado, faltante con y sin destino, aprobado sin aprobación de Contenido, aprobado sin derivados, por-optimizar aceptado, dark no nulo, schemaVersion 1 y reporte de varios errores juntos.
Contrato: rollback: Borrar los tests y fixtures nuevos.. Status: pending

#### S1.T4 — Agregar a las pruebas del validador (tests/asset-manifest-validator.test.mjs) los casos del flag --summary: manifiesto de prueba con varios estados, estado con cantidad 0, --summary con estado inválido `listo` falla, y salida sin --summary inalterada. Agregar además los casos del campo `decorativo`: decorativo true con alt vacío pasa; decorativo false u omitido con alt vacío falla nombrando el id.
Contrato: rollback: Revertir los casos agregados en tests/asset-manifest-validator.test.mjs.. Status: pending

#### S2.T1 — Migrar app/assets/manifest.json a schemaVersion 2: conservar id y alt de las 64 entradas (12 Ashura, 12 llegadas, 12 permanencia, 10 fondos, 6 minerales, 3 materiales, 3 perfiles, 6 ilustraciones funcionales); incorporar los 59 PNG de arcanos, zodiaco e identidad; clasificar según content/imagenes/09, 10, 11, 12 y 03 (permanencia como provisional y fondos de 940/941x1672 sin aprobado); modo según DEC-173 y lista de no productivos.
Contrato: rollback: Restaurar app/assets/manifest.json desde origin/main; los maestros no se tocan.. Status: pending

#### S2.T1.1 — Convertir las 64 entradas existentes al esquema v2 conservando id y alt, y completar medidas, destino, plataforma, modo y autoría.
Contrato: rollback: Restaurar el manifiesto previo.. Status: pending

#### S2.T1.2 — En la migración del manifiesto a schemaVersion 2, las entradas de arcanos, zodiaco e identidad (59 PNG) NO se copian a app/assets/: su ruta de maestro apunta a la ubicación actual en docs/content/imagenes/ (Adenda 1). Ajustar el validador para aceptar maestros bajo docs/content/imagenes/ solo en esas familias, y mantener el chequeo de PNG sin entrada aplicando únicamente a app/assets/. La clasificación inicial no deja entradas en `aprobado` (bloqueo por licencia y autoría pendiente).
Contrato: rollback: Quitar las entradas agregadas.. Status: pending

#### S2.T1.3 — Aplicar la clasificación inicial de estado según content/imagenes/09, 10, 11, 12 y 03, y dejar el resumen de assets por estado para adjuntar al PR emitido por el propio validador scripts/validate-asset-manifest.mjs con el flag `--summary` (una línea por estado con su cantidad, más el total). Si el flag no existe en el validador, agregarlo ahí y documentarlo en docs/development/commands.md; no se usa un script aparte.
Contrato: rollback: Revertir los estados al valor previo de la migración.. Status: pending

#### S2.T2 — Activar en el workflow de CI el paso que ejecuta el validador sobre app/assets/manifest.json real (propagando su código de salida), en esta sesión, junto con la migración a schemaVersion 2, y no antes. Reemplaza la ejecución del manifiesto real que S1.T2 deja fuera.
Contrato: rollback: Quitar el paso del manifiesto real del workflow; el paso de pruebas con fixtures permanece.. Status: pending

#### S2.T7 — Adaptar el proveedor o resolvedor de assets de TAO-190 para que lea solo el esquema v2 y falle explícitamente ante schemaVersion 1.
Contrato: rollback: Revertir el cambio del proveedor junto con el manifiesto (unidad de rollback).. Status: pending

#### S2.T8 — Escribir las pruebas de regresión de la migración: 64 pares (id, alt) preservados, permanencia provisional, fondos 940/941 no aprobados, 59 maestros de arcanos, zodiaco e identidad presentes y 0 errores sobre el manifiesto real. Agregar una prueba del proveedor leyendo v2 y una prueba de que `--summary` imprime la cantidad por estado y el total sobre el manifiesto real.
Contrato: rollback: Borrar los tests nuevos.. Status: pending

#### S2.T9 — Actualizar docs/content/SCHEMA.md con el esquema v2 del manifiesto y dejarlo conforme con markdownlint, cspell y vale, sin agregar líneas a .docs-baseline.txt.
Contrato: rollback: Revertir docs/content/SCHEMA.md.. Status: pending

#### S2.T10 — Escribir tests/asset-manifest-migration.test.mjs con: (a) las 59 entradas de arcanos, zodiaco e identidad tienen ruta de maestro bajo docs/content/imagenes/ y el archivo existe; (b) ninguna entrada del manifiesto migrado está en estado `aprobado`; (c) ninguna entrada `por-optimizar` sin aprobación de Diseño y Contenido, y la clasificación real no usa `por-optimizar`; (d) las 64 entradas originales conservan id y alt, la permanencia es `provisional` y los fondos de 940/941x1672 no son `aprobado`. Esta task fusiona la clasificación sin entradas `aprobado` con las pruebas de regresión de la migración.
Contrato: rollback: Eliminar tests/asset-manifest-migration.test.mjs.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-05 (edit) `inferred`: El workflow de CI invoca el validador del manifiesto y propaga su código de salida distinto de cero ante cualquier error (esto se demuestra 

**Task ops:**

- edit S1.T1 { rollback="Revertir el JSON Schema del manifiesto v2 junto con el manifiesto y el validador como una unidad: restaurar el app/assets/manifest.json previo (schemaVersion 1) y conservar los maestros. Comprobación: CI valida el manifiesto restaurado y no quedan referencias al schema nuevo." }
- move S2.T1 → S3
- move S2.T2 → S3
- move S2.T3 → S3
- move S2.T4 → S3
- move S2.T5 → S3
- move S2.T6 → S3
- move S2.T7 → S3
- move S1.T6 → S2
- move S1.T7 → S2
- move S3.T6 → S4
- move S3.T7 → S4

### Enmienda 2
**REQs:**

- REQ-01 (edit) `confirmed`: Existe un JSON Schema del manifiesto con schemaVersion 2 que exige por asset: id estable, familia, ruta del maestro, estado (aprobado, provi
- REQ-05 (edit) `inferred`: El workflow de CI invoca el validador del manifiesto y propaga su código de salida distinto de cero ante cualquier error (esto se demuestra 
- REQ-04 (edit) `confirmed`: app/assets/manifest.json se migra a schemaVersion 2: las 64 entradas actuales conservan id y alt, se incorporan los 59 PNG de arcanos, zodia

**Tasks agregadas:**

- S2: Activar en el workflow de CI el paso que ejecuta el validador sobre app/assets/manifest.json real (propagando su código de salida), en esta sesión, junto con la migración a schemaVersion 2, y no antes. Reemplaza la ejecución del manifiesto real que S1.T2 deja fuera. (valida: REQ-05; rollback: Quitar el paso del manifiesto real del workflow; el paso de pruebas con fixtures permanece.)
- S2: Agregar a las pruebas de regresión de la migración un caso que verifique que la clasificación inicial del manifiesto migrado no deja entradas en estado aprobado mientras no exista la definición de licencia y autoría (pendiente externo del pedido). (valida: REQ-04, test; rollback: Eliminar el caso agregado a las pruebas de regresión.)

**Task ops:**

- edit S1.T2 { desc="Agregar al workflow de CI el paso que ejecuta solo las pruebas del validador con fixtures. En la Sesión 1 NO se ejecuta el validador sobre app/assets/manifest.json real, porque sigue en v1 y dejaría CI en rojo; ese paso se activa en la sesión de la migración." }
- move S3.T1 → S2
- move S3.T3 → S2

### Enmienda 3
**REQs:**

- REQ-08 (edit) `confirmed`: El validador queda documentado en docs/development/commands.md con uso, parámetros y un ejemplo de salida con error. El chequeo de que el no
- REQ-09 (edit) `confirmed`: docs/content/SCHEMA.md, actualizado con el esquema v2 del manifiesto en la misma sesión que la migración del manifiesto, queda conforme con 

**Task ops:**

- edit S3.T2 { verify=["npx markdownlint-cli2 docs/content/SCHEMA.md && npx cspell docs/content/SCHEMA.md && vale docs/content/SCHEMA.md","! git diff origin/main -- .docs-baseline.txt | grep -E '^\\+[^+]'"] }
- move S3.T2 → S2
- edit S1.T2 { desc="Agregar el paso de CI que corre solo las pruebas del validador con fixtures (sin validar todavía app/assets/manifest.json real) y propagar su código de salida distinto de cero. Además, documentar el validador en docs/development/commands.md con uso, parámetros y un ejemplo de salida con error. El chequeo de que el nombre del script aparece documentado se resuelve con un grep local en el verify, sin agregar un chequeo nuevo al workflow.", verify=["grep -n \"$(ls scripts | grep -i manifest | head -1)\" docs/development/commands.md"] }

### Enmienda 4
**REQs:**

- REQ-10 (add) `confirmed`: El propio validador emite el resumen de assets por estado para adjuntar al PR cuando se invoca con el flag `--summary`: una línea por cada u

**Task ops:**

- edit S1.T2 { verify=["grep -n 'validate-asset-manifest' docs/development/commands.md"] }
- edit S2.T2 { validates=["REQ-05"], verify=["grep -rn 'validate-asset-manifest' .github/workflows/","grep -rn 'app/assets/manifest.json' .github/workflows/"] }
- edit S2.T1.3 { desc="Aplicar la clasificación inicial de estado según content/imagenes/09, 10, 11, 12 y 03, y dejar el resumen de assets por estado para adjuntar al PR emitido por el propio validador scripts/validate-asset-manifest.mjs con el flag `--summary` (una línea por estado con su cantidad, más el total). Si el flag no existe en el validador, agregarlo ahí y documentarlo en docs/development/commands.md; no se usa un script aparte.", validates=["REQ-04","REQ-10"], verify=["node scripts/validate-asset-manifest.mjs --summary"] }
- edit S2.T8 { desc="Escribir las pruebas de regresión de la migración: 64 pares (id, alt) preservados, permanencia provisional, fondos 940/941 no aprobados, 59 maestros de arcanos, zodiaco e identidad presentes y 0 errores sobre el manifiesto real. Agregar una prueba del proveedor leyendo v2 y una prueba de que `--summary` imprime la cantidad por estado y el total sobre el manifiesto real.", validates=["REQ-04","REQ-06","REQ-10"] }

### Enmienda 5
**REQs:**

- REQ-01 (edit) `confirmed`: Existe un JSON Schema del manifiesto con schemaVersion 2 que exige por asset: id estable, familia, ruta del maestro, estado (aprobado, provi
- REQ-02 (edit) `confirmed`: El validador contrasta el manifiesto con el disco: el maestro debe existir y sus medidas reales coincidir con ancho y alto declarados; todo 
- REQ-04 (edit) `confirmed`: app/assets/manifest.json se migra a schemaVersion 2: las 64 entradas actuales conservan id y alt, se incorporan los 59 PNG de arcanos, zodia
- REQ-05 (edit) `inferred`: El workflow de CI invoca el validador del manifiesto y propaga su código de salida distinto de cero ante cualquier error (esto se demuestra 
- REQ-10 (edit) `confirmed`: El propio validador emite el resumen de assets por estado para adjuntar al PR cuando se invoca con el flag `--summary`: una línea por cada u

**Tasks agregadas:**

- S1: Agregar a las pruebas del validador (tests/asset-manifest-validator.test.mjs) los casos del flag --summary: manifiesto de prueba con varios estados, estado con cantidad 0, --summary con estado inválido `listo` falla, y salida sin --summary inalterada. Agregar además los casos del campo `decorativo`: decorativo true con alt vacío pasa; decorativo false u omitido con alt vacío falla nombrando el id. (valida: REQ-01, REQ-10, test; rollback: Revertir los casos agregados en tests/asset-manifest-validator.test.mjs.)
- S2: Escribir tests/asset-manifest-migration.test.mjs con: (a) las 59 entradas de arcanos, zodiaco e identidad tienen ruta de maestro bajo docs/content/imagenes/ y el archivo existe; (b) ninguna entrada del manifiesto migrado está en estado `aprobado`; (c) ninguna entrada `por-optimizar` sin aprobación de Diseño y Contenido, y la clasificación real no usa `por-optimizar`; (d) las 64 entradas originales conservan id y alt, la permanencia es `provisional` y los fondos de 940/941x1672 no son `aprobado`. Esta task fusiona la clasificación sin entradas `aprobado` con las pruebas de regresión de la migración. (valida: REQ-02, REQ-04, test; rollback: Eliminar tests/asset-manifest-migration.test.mjs.)

**Task ops:**

- edit S1.T2 { verify=["node --test tests/asset-manifest-validator.test.mjs","grep -rn \"asset-manifest-validator\" .github/workflows/"] }
- edit S2.T1.2 { desc="En la migración del manifiesto a schemaVersion 2, las entradas de arcanos, zodiaco e identidad (59 PNG) NO se copian a app/assets/: su ruta de maestro apunta a la ubicación actual en docs/content/imagenes/ (Adenda 1). Ajustar el validador para aceptar maestros bajo docs/content/imagenes/ solo en esas familias, y mantener el chequeo de PNG sin entrada aplicando únicamente a app/assets/. La clasificación inicial no deja entradas en `aprobado` (bloqueo por licencia y autoría pendiente)." }

### Enmienda 6

**Task ops:**

- delete S2.T3
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T1.1
- [ ] S1.T1.2
- [ ] S1.T1.3
- [ ] S1.T1.4
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4

**Gate (auto)**: El validador corre en CI: con los fixtures válidos sale 0 y con cada fixture inválido (estado listo, PNG huérfano, medidas distintas, aprobado sin aprobación o sin derivados, dark no nulo, faltante sin destino) sale con error nombrando el id o la ruta; el uso queda en docs/development/commands.md.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T1.3
- [ ] S2.T2
- [ ] S2.T7
- [ ] S2.T8
- [ ] S2.T9
- [ ] S2.T10

**Gate (auto)**: El validador sobre el app/assets/manifest.json real termina con 0 errores y 0 PNG sin registrar; el resumen por estado queda listo para adjuntar al PR; docs/content/SCHEMA.md pasa el lint de docs y el proveedor de TAO-190 resuelve desde el manifiesto v2.
## Decisions

### DEC-LOCAL-01: plan-dedup → auto-pruned
Recorte por exceso aplicado en autónomo: S2.T3

