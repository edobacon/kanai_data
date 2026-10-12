---
id: TAO-201-SPEC
project: taomangalam
ticket: TAO-201
status: draft
---

# HU-02-08 Fondos claros M1a: tres composiciones por familia registradas, validadas por medida mínima y resueltas por layout, con los maestros 940/941 x 1672 retirados del uso final

## Resumen ejecutivo

Se toman las 12 composiciones claras que ya existen en app/assets/fondos-vistas/composiciones/ para las cuatro familias de M1a (identidad-entrada, v-01-inicio, consultas-personas, recorrido). Ya están en app/assets/manifest.json con state provisional, theme light y medidas reales, por ejemplo manifest.json:13748. Sobre esa base se agrega al validador la medida mínima por composición (1536x2732, 2048x2732, 2732x2048). Los maestros 940/941 x 1672 se reclasifican como referencia y salen de las declaraciones Dart de uso final. Las familias se declaran con su variante propia por layout, se mide el contraste AA al 200 % y se agregan goldens de teléfono y tablet en ambas orientaciones. NO incluye: producir arte nuevo, familias M1b (HU-02-13), variantes oscuras (DEC-196), viñetas (HU-02-14), la familia de V-51 ni marcar nada como aprobado. La aprobación de Diseño (estado aprobado, QA-02-08-01 y QA-02-08-04) queda como verificación humana diferida según la Adenda 1, y la prueba en dispositivo se hace en emulador. Cómo se sabe que funciona: validate_manifest falla ante una composición bajo la mínima o un fondo 940 aprobado. Los goldens de tablet horizontal muestran la composición landscape y no el vertical recortado. El test de contraste pasa AA con textScaler 2.0, y una familia sin asset cae a la superficie canvas. Tamaño: 2 sesiones T2 (aprox. 5 h), dentro del techo de 4. ADVERTENCIA: el criterio 'estado aprobado' no puede cerrarse sin Diseño, así que el ticket queda con verificación humana pendiente. ADVERTENCIA: el manifiesto ya registra composiciones de otras familias (administracion, soporte, v-09, v-27, v-34) que están fuera de alcance y no se tocan. ADVERTENCIA: la zona tranquila de al menos 65 % y que el paisaje no quede bajo el contenido se verifican con la superposición de la plantilla en los goldens y con la hoja de contacto. La aprobación final es humana.
Datos a confirmar antes de ejecutar: (1) Las declaraciones reales de producción de las familias inicio, consultas-personas y recorrido: el contexto solo muestra identidad-entrada y cuenta en app/lib/core/images/fixtures/image_manifest_fixture.dart y el viewFamily 'recorrido' en el manifiesto. Confirmar si existen fuera del fixture (grep de viewFamily en app/lib). (2) El campo del manifiesto que marca 'referencia de maqueta': el schema tiene el enum 'mockup-reference' en scripts/assets/manifest.schema.json:131. Confirmar el nombre de la clave que lo usa. (3) El token de color de texto de la plantilla HU-01-10 contra el que se mide el AA y el overlayToken 'surfaceOverlay'. (4) Si docs/product/vistas/V-01_inicio.md se modifica de verdad o solo el registro de docs/content/imagenes. (5) El comando de actualización de goldens del repo, en app/test/goldens o test_ci_pr_goldens.py.

## Requirements

### REQ-01 `confirmed`
> Fuente: request

Cada una de las cuatro familias de M1a (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) tiene en app/assets/manifest.json tres maestros claros (phone-portrait, tablet-portrait, tablet-landscape) de app/assets/fondos-vistas/composiciones/, con archivos '<id-de-familia>-<variante>.png'. Cada uno tiene theme light, autoría, medidas reales iguales o mayores a la mínima de su composición (1536x2732, 2048x2732, 2732x2048) y estado vigente provisional, nunca aprobado sin la aprobación de Diseño (regla approved-without-approval de DEC-230). La autoría se conserva tal como figura en el manifiesto; si una entrada no la trae se copia de las entradas hermanas de la misma familia. El validador del manifiesto (validate_manifest.py) exige esas mínimas por composición mediante una única task de reglas. Las entradas del manifiesto se identifican siempre por su id o por su path, nunca por número de línea. La generación de derivados (export_assets.py) queda diferida porque los fondos son provisionales.

### REQ-02 `confirmed`
> Fuente: request

Los maestros de 940/941 x 1672 (app/assets/fondos-vistas/familia-identidad-entrada.png, app/assets/fondos-vistas/v-01-inicio.png, app/assets/fondos-vistas/familia-consultas-personas.png, app/assets/fondos-vistas/familia-recorrido.png) quedan retirados del uso final: en app/assets/manifest.json se reclasifican por path como referencia de maqueta (mockup-reference del schema del manifiesto), ninguna declaración de familia de uso final los apunta y el validador rechaza que figuren como aprobado para uso final (regla approved-without-approval de DEC-230). Un test de background-not-final (caso a, con un 941x1672 aprobado) lo comprueba.

### REQ-03 `inferred`
> Fuente: taomangalam/app/lib/core/images/image_family_resolver.dart:160; taomangalam/app/lib/core/images/fixtures/image_manifest_fixture.dart:82

Cada familia declara su variante clara propia por layout (lightPhonePortrait, lightTabletPortrait, lightTabletLandscape) apuntando a su composición, manteniendo el id de familia estable para el resolvedor. En tablet horizontal (shortestSide >= TaoBreakpoint.mediumMin y landscape) se resuelve la composición tablet-landscape y no una versión estirada o recortada del vertical.

### REQ-04 `confirmed`
> Fuente: request

Sin el fondo (asset ausente o retirado del paquete), la vista de la familia muestra la superficie de respaldo fallbackSurfaceToken 'canvas' sin fallar (HU-01-02, QA-02-08-03). El test de respaldo canvas es la task S3.T3 y su ejecución se exige en el gate de la sesión 3, cuyo reviewOutcome es: 'flutter test test/core/images en verde con el test de respaldo canvas (S3.T3) y docs/design/fondos-vistas-contraste.md con la verificación humana diferida'. El gate de la sesión 2 no exige el test de respaldo canvas.

### REQ-05 `confirmed`
> Fuente: Adenda 6 (Q11); criterio de aceptación de contraste AA al 200 %

El texto de la plantilla de pantalla de HU-01-10 sobre cada una de las 12 composiciones, con overlay surfaceOverlay y escala de texto del 200 %, cumple contraste AA con umbral 4.5:1 (texto normal). La medición se hace sobre la zona de contenido de la plantilla: franja central del 80 % del ancho y desde el 20 % al 80 % del alto del lienzo. Método de peor caso: el menor contraste entre el color de texto y los píxeles de esa zona con el overlay aplicado, con muestreo en grilla y sin promedio. La región (zona central), el método y el umbral son constantes con nombre del test de contraste (flutter test, no script) y se documentan en docs/design/fondos-vistas-contraste.md.

### REQ-06 `confirmed`
> Fuente: request

Hay goldens de la plantilla con el fondo de cada familia en teléfono vertical (390x844 dp), tablet vertical y tablet horizontal (HU-01-16) y una hoja de contacto de las 12 composiciones con la plantilla superpuesta. El surface lógico del golden de tablet vertical es 768x1024 dp con devicePixelRatio 2.0 (el maestro 2048x2732 son píxeles, no dp) y el de tablet horizontal es 1024x768 dp. La evidencia en emulador y la revisión de Diseño (zona tranquila de al menos 65 %, paisaje fuera del contenido principal y de las barras del sistema, QA-02-08-01 y QA-02-08-04) quedan como verificación humana diferida.

### REQ-07 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Los docs que se toquen (registro de assets en docs/content/imagenes y docs/product/vistas/V-01_inicio.md si cambia su referencia de fondo) quedan compliant con el linter de docs: antes del cierre pnpm run check no reporta un doc fuera de .docs-baseline.txt, para que el job de docs y quality-gate no queden en rojo.

### REQ-08 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/core/images/image_manifest.dart:18; taomangalam/scripts/assets/validate_manifest.py:45

Reusar la infraestructura existente: ImageFamilyDeclaration e ImageAssetVariant para declarar familias, el resolvedor por ImageLayout, validate_manifest.py con los estados DEC-230 (agregando reglas, no un validador nuevo), manifest.schema.json y el pipeline de derivados de HU-02-03 (export_assets.py). No crear un resolvedor ni un formato de manifiesto paralelo.

### REQ-09 `confirmed`
> Fuente: Adenda 2 (Q1) y Adenda 3 (Q4)

El ajuste de opacidad de surfaceOverlay se aplica ANTES de medir el contraste (en la misma task que el test de contraste o en una previa). El ejecutor lee la opacidad base actual con que el código existente aplica el overlay y permite ajustar hasta +/-0.15 sobre ella, sin superar 0.95 ni bajar de 0.50. El rango queda como constantes con nombre en el código (delta máximo 0.15, mínimo 0.50, máximo 0.95) y documentado, sin salir de los tokens del design system. El documento de resultados reporta qué composición se ajustó y a qué valor.

### REQ-10 `confirmed`
> Fuente: Adenda 2 (Q1) y Adenda 3 (correcciones)

El test de contraste falla solo si una composición no alcanza 4.5:1 y además no se aplicó el ajuste de opacidad dentro del rango o no se registró el incumplimiento en el reporte (composición, contraste obtenido, opacidad máxima). Si ni la opacidad máxima permitida alcanza, se reporta y la ejecución continúa sin detener la sesión.

### REQ-11 `confirmed`
> Fuente: Adenda 2 Q2 y Adenda 4 Q9

El ejecutor ubica en el repo las declaraciones de familias de fondos de producción (ImageFamilyDeclaration). Si familia-identidad-entrada, familia-consultas-personas o familia-recorrido no están declaradas (v-01-inicio ya existe en app/assets/manifest.json), las crea junto a las existentes con el mismo formato y mantiene estable el id de familia. Los ids sin prefijo ('inicio', 'identidad-entrada', 'consultas-personas', 'recorrido') no son ids válidos.

### REQ-13 `confirmed`
> Fuente: request

El contenido de los fondos es provisional y reemplazable sin cambio de código: reemplazar un PNG de app/assets/fondos-vistas/composiciones/ (patrón '<id-de-familia>-<variante>.png', p. ej. v-01-inicio-phone-portrait.png) y su entrada en manifest.json basta para actualizar la familia, sin editar declaraciones ni el resolvedor. Lo comprueba un test de reemplazabilidad (task isTest) que trabaja en un directorio temporal con copia del manifiesto y de las composiciones, nunca sobre app/assets, e invoca el validador Python con Process.run. El id de familia de Inicio es 'v-01-inicio' en toda la spec.

### REQ-14 `confirmed`
> Fuente: Adenda 7 (Q13) y pedido de enmienda sobre S2.T1

ImageAssetVariant se extiende con un campo opcional overlayOpacity (double?, null significa la opacidad base actual del overlay) y el renderer de producción (BackgroundLayer o quien aplique surfaceOverlay) lee ese campo para aplicar la opacidad de la variante resuelta. El test de contraste mide con este mismo camino de código y no con una copia de la lógica. Los consumidores del resolvedor y los fixtures existentes siguen compilando y comportándose igual cuando overlayOpacity es null.
## Tasks

#### S1.T1 — Única task que agrega a scripts/assets/validate_manifest.py las reglas de medida mínima por composición (phone-portrait 1536x2732, tablet-portrait 2048x2732, tablet-landscape 2732x2048), familia incompleta y approved-without-approval (DEC-230). Agrega reglas al validador existente, no crea uno nuevo.
Contrato: rollback: git revert del commit sobre scripts/assets/validate_manifest.py. Status: pending

#### S1.T2 — Registrar en app/assets/manifest.json las 12 composiciones de app/assets/fondos-vistas/composiciones/ con los ids familia-identidad-entrada, v-01-inicio, familia-consultas-personas y familia-recorrido (archivos '<id>-<variante>.png'), theme light, medidas reales y estado provisional. Autoría conservada tal como figura o copiada de las entradas hermanas de la misma familia, sin inventarla. Entradas identificadas por path, no por número de línea.
Contrato: rollback: git checkout de app/assets/manifest.json y docs/content/imagenes/assets-index.json al commit previo. Status: pending

#### S1.T3 — Actualizar el registro de fondos en docs/content/imagenes (y docs/product/vistas/V-01_inicio.md solo si su referencia de fondo cambia a la composición) indicando las composiciones vigentes y los maestros 940 como referencia. Correr pnpm run check y corregir todo doc que salga de .docs-baseline.txt.
Contrato: rollback: git revert de los .md tocados. Status: pending

#### S1.T4 — SOLO tests de las reglas de S1.T1 (no las reimplementa) en tests/test_assets_manifest.py: medida mínima, 2047x2732 falla, familia incompleta, approved-without-approval y background-not-final (caso a, 941x1672 aprobado).
Contrato: rollback: git revert del archivo de tests. Status: pending

#### S1.T5 — Reclasificar por path como mockup-reference (schema del manifiesto) los cuatro maestros 940/941 x 1672: app/assets/fondos-vistas/familia-identidad-entrada.png, v-01-inicio.png, familia-consultas-personas.png y familia-recorrido.png.
Contrato: rollback: Revertir el manifiesto (git checkout de app/assets/manifest.json) para restaurar las entradas previas.. Status: pending

#### S2.T1 — Declarar o reapuntar en código las cuatro familias (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) con ImageFamilyDeclaration, cada una con lightPhonePortrait, lightTabletPortrait y lightTabletLandscape apuntando a su composición, manteniendo estable el id de familia. ANTES de modificar, buscar con Grep todos los consumidores de ImageAssetVariant (resolvedor por ImageLayout, BackgroundLayer, fixtures y tests de app/test/core/images), leerlos y reportar el impacto. Extender ImageAssetVariant con el campo opcional overlayOpacity (double?, null = opacidad base actual) manteniendo compatibles a los consumidores y fixtures. Hacer que el renderer de producción (BackgroundLayer o quien aplique surfaceOverlay) lea overlayOpacity de la variante resuelta, de modo que el test de contraste de S2.T6 mida con el mismo camino de código. El rango efectivo de overlayOpacity es la intersección de base +/-0.15 y [0.50, 0.95] (constantes con nombre: delta máximo 0.15, mínimo 0.50, máximo 0.95) y se documenta en docs/design/fondos-vistas-contraste.md.
Contrato: rollback: git revert del commit sobre las declaraciones de familia en app/lib/core/images. Status: pending

#### S2.T3 — Goldens de la plantilla con el fondo de cada familia: teléfono 390x844, tablet vertical 768x1024 dp con devicePixelRatio 2.0 y tablet horizontal 1024x768 dp, más hoja de contacto de las 12 composiciones.
Contrato: rollback: git revert de los goldens nuevos y su test; los goldens previos no se tocan. Status: pending

#### S2.T4 — Validar REQ-02 y REQ-03: ausencia de paths 940/941 x 1672 en las declaraciones de familias y resolución por layout (tablet horizontal resuelve tablet-landscape, no el vertical).
Contrato: rollback: git revert de los cambios en los tests. Status: pending

#### S2.T6 — En el test de contraste (flutter test), el caso happy de REQ-09 (ajuste de opacidad dentro del rango que logra 4.5:1) usa composiciones sintéticas generadas en memoria o en directorio temporal, no las 12 provisionales, y mide la opacidad con el mismo camino de código de producción que lee overlayOpacity (BackgroundLayer o quien aplique surfaceOverlay). Las 12 composiciones reales se miden con la misma ruta; el test falla solo si no se alcanza 4.5:1 y además no se aplicó el ajuste dentro del rango efectivo (intersección de base +/-0.15 y [0.50, 0.95]) o no se registró el incumplimiento en docs/design/fondos-vistas-contraste.md.
Contrato: rollback: Revertir los dos tests, las constantes del rango, los valores de overlayOpacity y docs/design/fondos-vistas-contraste.md.. Status: pending

#### S2.T7 — Escribir el test de reemplazabilidad (REQ-13) en app/test/core/images/: copia el manifiesto y las composiciones a un directorio temporal, reemplaza un PNG y su entrada, e invoca scripts/assets/validate_manifest.py con Process.run comprobando el código de salida. Nunca escribe sobre app/assets.
Contrato: rollback: Borrar el archivo de test de reemplazabilidad.. Status: pending

#### S3.T3 — Probar el caso de fondo ausente o retirado (QA-02-08-03) con un manifiesto y un asset de fixture creados en un directorio temporal, sin tocar app/assets ni app/assets/manifest.json: la vista debe mostrar la superficie de respaldo fallbackSurfaceToken 'canvas' sin fallar.
Contrato: rollback: eliminar el test. Status: pending

#### S3.T4 — Registrar en docs/design/fondos-vistas-contraste.md, como verificacion humana diferida, la evidencia en emulador y la revision de Diseño: zona tranquila de al menos 65 %, paisaje fuera del contenido principal y de las barras del sistema, y el punto focal del maestro de telefono (centrado o indicado en su registro de creacion, para que el recorte cover en 16:9 a 19,5:9 no lo pierda). Es el unico lugar donde se registra esta verificacion diferida. La sesion 3 termina con un reviewOutcome observable (aprobado, iterar o bloquea) registrado al cerrar.
Contrato: rollback: Revertir los cambios de docs y del documento de resultados.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: Los maestros de 940/941 x 1672 (familia-identidad-entrada.png, v-01-inicio.png, familia-consultas-personas.png, familia-recorrido.png) quedan retirados del uso final: siguen en el manifiesto como referencia de maqueta, ninguna declaración de familia de uso final los apunta y el
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: El texto de la plantilla de pantalla de HU-01-10 sobre cada una de las 12 composiciones, con overlay surfaceOverlay y escala de texto del 200 %, cumple contraste AA (4.5:1 para texto normal) medido en la zona de contenido principal.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-05 (edit) `confirmed`: El texto de la plantilla de pantalla de HU-01-10 sobre cada una de las 12 composiciones, con overlay surfaceOverlay y escala de texto del 20
- REQ-07 (edit) `confirmed`: Los docs que se toquen (registro de assets en docs/content/imagenes y docs/product/vistas/V-01_inicio.md si cambia su referencia de fondo) q
- REQ-09 (add) `confirmed`: Si una composicion provisional no alcanza 4.5:1 con surfaceOverlay al 200 %, se ajusta la opacidad del overlay dentro de un rango fijo [min,
- REQ-10 (add) `confirmed`: Si ni la opacidad maxima permitida alcanza 4.5:1 en una composicion, se reporta en el documento (composicion, contraste obtenido, opacidad m
- REQ-11 (add) `confirmed`: El ejecutor ubica en el repo las declaraciones de familias de fondos de produccion (ImageFamilyDeclaration). Si inicio, consultas-personas y
- REQ-12 (add) `inferred`: Las medidas minimas por composicion (1536x2732, 2048x2732, 2732x2048) quedan fijadas como reglas del validador del manifiesto (validate_mani
- REQ-13 (add) `confirmed`: El contenido de los fondos es provisional y reemplazable sin cambio de codigo: reemplazar un PNG de app/assets/fondos-vistas/composiciones/ 

**Tasks agregadas:**

- S3: Ubicar en el repo las declaraciones de familias de fondos de produccion (ImageFamilyDeclaration, variantes lightPhonePortrait, lightTabletPortrait, lightTabletLandscape). Si inicio, consultas-personas y recorrido no estan declaradas, crearlas junto a las existentes con el mismo formato y sin cambiar ids existentes. (valida: REQ-11, REQ-03, REQ-13; rollback: Revertir con git los archivos de declaraciones modificados; la superficie de respaldo canvas sigue activa.)
- S3: Fijar el rango [min, max] de opacidad de surfaceOverlay como constantes dentro de los tokens existentes y medir el contraste AA 4.5:1 al 200 % sobre las 12 composiciones. Si una no alcanza, ajustar la opacidad dentro del rango; si ni el maximo alcanza, reportar y continuar. Escribir en el documento de resultados que composicion se ajusto y a que valor, y cuales siguen bajo el umbral. (valida: REQ-05, REQ-09, REQ-10; rollback: Restaurar la opacidad base de surfaceOverlay y eliminar el reporte generado.)
- S4: Agregar a validate_manifest.py las reglas de medidas minimas por composicion (1536x2732, 2048x2732, 2732x2048) sin crear un validador nuevo, y agregar el golden de tablet vertical (2048x2732) de la plantilla con cada familia, con sus tests. (valida: REQ-12, REQ-01, REQ-06, test; rollback: Revertir las reglas agregadas a validate_manifest.py y eliminar los goldens nuevos.)

### Enmienda 2
**REQs:**

- REQ-06 (edit) `confirmed`: Hay goldens de la plantilla con el fondo de cada familia en teléfono vertical, tablet vertical y tablet horizontal (HU-01-16) y una hoja de 
- REQ-09 (edit) `confirmed`: El ajuste de opacidad de surfaceOverlay se aplica ANTES de medir el contraste (en la misma task que el test de contraste o en una previa). E
- REQ-10 (edit) `confirmed`: El test de contraste falla solo si una composición no alcanza 4.5:1 y además no se aplicó el ajuste de opacidad dentro del rango o no se reg
- REQ-07 (edit) `confirmed`: Los docs que se toquen (registro de assets en docs/content/imagenes y docs/product/vistas/V-01_inicio.md si cambia su referencia de fondo) q
- REQ-13 (edit) `confirmed`: El contenido de los fondos es provisional y reemplazable sin cambio de código: reemplazar un PNG de app/assets/fondos-vistas/composiciones/ 

**Tasks agregadas:**

- S2: Definir como constantes con nombre el rango de opacidad de surfaceOverlay (delta máximo 0.15 sobre la opacidad base leída del código existente, mínimo 0.50, máximo 0.95), documentarlo, aplicar el ajuste por composición ANTES de medir y, en la misma task, medir el contraste AA 4.5:1 al 200 % sobre las 12 composiciones. El test falla solo si una composición no alcanza 4.5:1, no se aplicó el ajuste dentro del rango y no se registró el incumplimiento en el reporte (composición, contraste, opacidad máxima). Sin salir de los tokens. (valida: REQ-05, REQ-09, REQ-10; rollback: Revertir las constantes, el ajuste de opacidad y el test de contraste; restaurar la opacidad base del overlay.)
- S3: Test de reemplazabilidad: sustituir un PNG de app/assets/fondos-vistas/composiciones/ (patrón '<id-de-familia>-<variante>.png', p. ej. v-01-inicio-phone-portrait.png) y su entrada en manifest.json, y comprobar que la familia se actualiza sin editar declaraciones ni el resolvedor. (valida: REQ-13, test; rollback: Eliminar el test y restaurar el PNG y la entrada original del manifiesto.)
- S3: Registrar en el documento de resultados la evidencia en emulador (teléfono y tablet en ambas orientaciones) como verificación humana diferida, junto con la revisión de Diseño; nunca como aprobada. Correr pnpm run check para validar que los docs tocados siguen compliant con .docs-baseline.txt. (valida: REQ-06, REQ-07; rollback: Revertir los cambios de docs y del documento de resultados.)

**Task ops:**

- delete S4.T1
- delete S3.T1
- edit S2.T1 { desc="Ubicar en el repo las declaraciones de familias de fondos de producción (ImageFamilyDeclaration); si v-01-inicio, consultas-personas o recorrido no están declaradas, crearlas junto a las existentes con el mismo formato, con id de familia estable ('v-01-inicio' para Inicio) y archivos '<id-de-familia>-<variante>.png' bajo fondos-vistas/composiciones/. Resultado observable: cada una de las 4 familias resuelve sus tres variantes (lightPhonePortrait, lightTabletPortrait, lightTabletLandscape).", validates=["REQ-03","REQ-11"], isTest=false }
- edit S2.T2 { isTest=true }

**REQ ops:**

- remove REQ-12

### Enmienda 3
**REQs:**

- REQ-01 (edit) `confirmed`: Cada una de las cuatro familias de M1a (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) tiene en app/
- REQ-11 (edit) `confirmed`: El ejecutor ubica en el repo las declaraciones de familias de fondos de producción (ImageFamilyDeclaration). Si familia-identidad-entrada, f

**Task ops:**

- edit S2.T5 { desc="Ajustar la opacidad de surfaceOverlay y medir el contraste en una sola task de test. (1) Leer la opacidad base con que el código existente aplica surfaceOverlay y definir constantes con nombre del rango (delta máximo 0.15, mínimo 0.50, máximo 0.95), documentadas, sin salir de los tokens. (2) Ajustar la opacidad por composición (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido; phone-portrait, tablet-portrait y tablet-landscape) ANTES de medir. (3) Medir el contraste del texto de la plantilla con escala del 200 % en la zona de contenido principal: pasa si la razón es >= 4.5, o si el incumplimiento quedó reportado tras agotar el rango (composición, contraste obtenido, opacidad máxima); falla solo si no hay ajuste dentro del rango y tampoco reporte. (4) Crear app/test/core/images/overlay_opacity_range_test.dart, que comprueba que la opacidad aplicada sale de las constantes con nombre y está dentro de [min, max]. (5) Registrar opacidad aplicada, composiciones ajustadas e incumplimientos en docs/design/fondos-vistas-contraste.md (bajo docs/, sujeto al linter, sin agregar entradas a .docs-baseline.txt). Si ni la opacidad máxima alcanza, se reporta y se continúa sin detener la sesión.", validates=["REQ-05","REQ-09","REQ-10"], isTest=true, verify=["cd app && flutter test test/core/images/overlay_opacity_range_test.dart","cd app && flutter test test/core/images"] }
- delete S2.T2
- edit S2.T3 { desc="Goldens de la plantilla de pantalla (HU-01-16) con el fondo de cada familia (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) y hoja de contacto de las 12 composiciones con la plantilla superpuesta. Surface lógico: teléfono vertical según su composición; tablet vertical 768x1024 dp con devicePixelRatio 2.0 (el maestro 2048x2732 son píxeles, no dp); tablet horizontal 1024x768 dp. La revisión de Diseño y la evidencia en emulador se registran como verificación humana diferida en docs/design/fondos-vistas-contraste.md.", validates=["REQ-06"] }
- edit S3.T3 { desc="Test de reemplazabilidad (REQ-13, isTest): reemplazar un PNG de app/assets/fondos-vistas/composiciones/ (patrón '<id-de-familia>-<variante>.png', p. ej. v-01-inicio-phone-portrait.png) y su entrada en manifest.json basta para actualizar la familia, sin editar declaraciones ni el resolvedor. Registrar en docs/design/fondos-vistas-contraste.md la evidencia en emulador y la aprobación de Diseño como verificación humana diferida.", validates=["REQ-13"], isTest=true, verify=["cd app && flutter test test/core/images"] }

### Enmienda 4

**Task ops:**

- edit S1.T2 { desc="Registrar en app/assets/manifest.json las 12 composiciones de app/assets/fondos-vistas/composiciones/ usando los ids reales de familia: familia-identidad-entrada, v-01-inicio, familia-consultas-personas y familia-recorrido. Cada familia tiene tres entradas (phone-portrait, tablet-portrait, tablet-landscape) con archivos '<id-de-familia>-<variante>.png' (p. ej. v-01-inicio-phone-portrait.png, familia-recorrido-tablet-landscape.png), theme light, autoria, medidas reales y estado vigente provisional. No usar ids sin prefijo ('inicio', 'identidad-entrada', 'consultas-personas', 'recorrido')." }
- edit S1.T4 { desc="Agregar al validador del manifiesto (validate_manifest.py) las reglas de medidas minimas por composicion (1536x2732, 2048x2732, 2732x2048) y sus tests, usando los ids reales familia-identidad-entrada, v-01-inicio, familia-consultas-personas y familia-recorrido. Para el estado se aplica la regla approved-without-approval de DEC-230 (una composicion en estado aprobado sin la aprobacion de Diseño es rechazada); no se asserta que ninguna composicion figure como aprobado." }
- edit S2.T1 { desc="Reapuntar las declaraciones de familia existentes (ImageFamilyDeclaration, entre ellas v-01-inicio) a las composiciones de app/assets/fondos-vistas/composiciones/, con variantes lightPhonePortrait, lightTabletPortrait y lightTabletLandscape y el id de familia estable. Listar las declaraciones faltantes igual que REQ-11 (familia-identidad-entrada, familia-consultas-personas, familia-recorrido) y crearlas junto a las existentes con el mismo formato. Usar solo los ids reales; los ids sin prefijo no son validos." }
- edit S2.T3 { desc="Goldens de la plantilla de pantalla con el fondo de cada familia (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido): telefono vertical con surface logico explicito de 390x844 dp, tablet vertical 768x1024 dp con devicePixelRatio 2.0 y tablet horizontal 1024x768 dp. Incluir la hoja de contacto de las 12 composiciones con la plantilla superpuesta." }
- edit S2.T4 { desc="Test de ausencia de paths 940/941: comprobar que ninguna declaracion de familia de uso final (ImageFamilyDeclaration / ImageAssetVariant) apunta a los maestros de 940/941 x 1672 (familia-identidad-entrada.png, v-01-inicio.png, familia-consultas-personas.png, familia-recorrido.png fuera de composiciones/), y que el validador rechaza que figuren como aprobado para uso final. Usar los ids reales familia-identidad-entrada, v-01-inicio, familia-consultas-personas y familia-recorrido." }
- edit S2.T5 { desc="Aplicar el ajuste de opacidad de surfaceOverlay y medir el contraste en la misma task (isTest). Leer la opacidad base actual con que el codigo aplica el overlay; si esa opacidad es un valor unico (no es configurable por familia o variante), extender ImageFamilyDeclaration o ImageAssetVariant con un campo de opacidad para poder ajustarla por composicion. Constantes con nombre: delta maximo 0.15, minimo 0.50, maximo 0.95. Test app/test/core/images/overlay_opacity_range_test.dart valida que la opacidad aplicada sale de esas constantes y esta en [min, max]. El test de contraste (umbral 4.5:1, escala de texto 200 %) pasa si la razon es >= 4.5 o si el incumplimiento esta reportado en docs/design/fondos-vistas-contraste.md tras agotar el rango." }
- edit S3.T3 { desc="Probar el caso de fondo ausente o retirado (QA-02-08-03) con un manifiesto y un asset de fixture creados en un directorio temporal, sin tocar app/assets ni app/assets/manifest.json: la vista debe mostrar la superficie de respaldo fallbackSurfaceToken 'canvas' sin fallar." }
- edit S3.T4 { desc="Registrar en docs/design/fondos-vistas-contraste.md, como verificacion humana diferida, la evidencia en emulador y la revision de Diseño: zona tranquila de al menos 65 %, paisaje fuera del contenido principal y de las barras del sistema, y el punto focal del maestro de telefono (centrado o indicado en su registro de creacion, para que el recorte cover en 16:9 a 19,5:9 no lo pierda). Es el unico lugar donde se registra esta verificacion diferida. La sesion 3 termina con un reviewOutcome observable (aprobado, iterar o bloquea) registrado al cerrar." }

### Enmienda 5
**REQs:**

- REQ-04 (edit) `confirmed`: Sin el fondo (asset ausente o retirado del paquete), la vista de la familia muestra la superficie de respaldo fallbackSurfaceToken 'canvas' 
- REQ-06 (edit) `confirmed`: Hay goldens de la plantilla con el fondo de cada familia en teléfono vertical, tablet vertical y tablet horizontal (HU-01-16) y una hoja de 
- REQ-01 (edit) `confirmed`: Cada una de las cuatro familias de M1a (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) tiene en app/

**Task ops:**

- edit S3.T3 { rollback="eliminar el test", validates=["REQ-04"] }
- edit S2.T4 { desc="Tests de las declaraciones de familia y del retiro de los maestros 940/941 x 1672: (a) el validador rechaza que familia-identidad-entrada.png, v-01-inicio.png, familia-consultas-personas.png y familia-recorrido.png figuren como aprobado para uso final (REQ-02); (b) ninguna declaración de familia de uso final apunta a esos maestros y cada familia declara lightPhonePortrait, lightTabletPortrait y lightTabletLandscape con id estable (REQ-03); (c) test de reemplazabilidad (REQ-13) que trabaja SOLO en un directorio temporal con copia del manifiesto y de las composiciones, reemplaza un PNG '<id-de-familia>-<variante>.png' y su entrada, y comprueba que la familia se actualiza sin editar declaraciones ni resolvedor; nunca escribe en app/assets. Las entradas del manifiesto se identifican por id o path.", validates=["REQ-02","REQ-03","REQ-13"], isTest=true }
- edit S1.T4 { desc="Solo tests de las reglas del validador del manifiesto: (a) medida mínima por composición (1536x2732, 2048x2732, 2732x2048), con caso bajo la mínima que falla y caso exacto que pasa; (b) regla approved-without-approval (DEC-230). No reimplementa la lógica de S1.T1 (solo la ejercita). Las entradas del manifiesto se identifican por id o path, nunca por número de línea. No cubre REQ-07.", validates=["REQ-01"], isTest=true }
- edit S2.T3 { isTest=true }

### Enmienda 6
**REQs:**

- REQ-02 (edit) `confirmed`: Los maestros de 940/941 x 1672 (app/assets/fondos-vistas/familia-identidad-entrada.png, app/assets/fondos-vistas/v-01-inicio.png, app/assets
- REQ-05 (edit) `confirmed`: El texto de la plantilla de pantalla de HU-01-10 sobre cada una de las 12 composiciones, con overlay surfaceOverlay y escala de texto del 20
- REQ-06 (edit) `confirmed`: Hay goldens de la plantilla con el fondo de cada familia en teléfono vertical, tablet vertical y tablet horizontal (HU-01-16) y una hoja de 

**Tasks agregadas:**

- S1: Reclasificar como referencia de maqueta (mockup-reference del schema del manifiesto, manifest.schema.json) los cuatro maestros 940/941 x 1672, identificados por path en app/assets/manifest.json y no por número de línea: app/assets/fondos-vistas/familia-identidad-entrada.png, app/assets/fondos-vistas/v-01-inicio.png, app/assets/fondos-vistas/familia-consultas-personas.png y app/assets/fondos-vistas/familia-recorrido.png. Quedan en el manifiesto solo como referencia y sin estado aprobado para uso final. (valida: REQ-02; rollback: Revertir el manifiesto (git checkout de app/assets/manifest.json) para restaurar las entradas previas.)

**Task ops:**

- edit S1.T2 { desc="Registrar en app/assets/manifest.json las 12 composiciones provisionales de app/assets/fondos-vistas/composiciones/ (patrón '<id-de-familia>-<variante>.png') con theme light, medidas reales y estado vigente provisional, nunca aprobado sin la aprobación de Diseño (regla approved-without-approval de DEC-230). Regla de autoría (Q10): conservar tal cual el valor de autoría que ya figura en la entrada; si una entrada no lo trae, copiar el valor de las entradas hermanas de la misma familia (o el que ya usan las demás entradas de fondos-vistas); el ejecutor no inventa ni cambia autoría. Las entradas se identifican por id o path, nunca por número de línea." }
- edit S1.T4 { desc="Agregar al validador del manifiesto (validate_manifest.py, reglas nuevas sobre los estados DEC-230, sin validador paralelo) y a los tests de app/test/core/images los casos de medidas mínimas por composición y el test de background-not-final (caso a, trasladado desde S2.T4): ningún maestro de 940/941 x 1672 figura como aprobado para uso final.", validates=["REQ-01","REQ-02"], isTest=true, verify=["cd app && flutter test test/core/images"] }
- edit S2.T4 { desc="Tests de resolución de composición por layout (lightPhonePortrait, lightTabletPortrait, lightTabletLandscape) y de reemplazabilidad en directorio temporal. El caso a de background-not-final ya no vive aquí: se trasladó a S1.T4." }
- edit S2.T5 { desc="Ajustar la opacidad de surfaceOverlay (rango +/-0.15 sobre la base leída del código, mínimo 0.50, máximo 0.95, como constantes con nombre) y medir el contraste en la misma task, en un test de contraste (flutter test). La medición se hace sobre la zona central de la plantilla (franja del 80 % del ancho y del 20 % al 80 % del alto del lienzo), con método de peor caso (menor contraste sobre muestreo en grilla, sin promedio) y umbral 4.5:1, con región, método y umbral como constantes con nombre del test. Pasa si la razón es >= 4.5 o si el incumplimiento quedó reportado tras agotar el rango. Documentar región, método y opacidades aplicadas en docs/design/fondos-vistas-contraste.md.", validates=["REQ-05","REQ-09","REQ-10"], isTest=true }

### Enmienda 7
**REQs:**

- REQ-01 (edit) `confirmed`: Cada una de las cuatro familias de M1a (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) tiene en app/
- REQ-02 (edit) `confirmed`: Los maestros de 940/941 x 1672 (app/assets/fondos-vistas/familia-identidad-entrada.png, app/assets/fondos-vistas/v-01-inicio.png, app/assets
- REQ-04 (edit) `confirmed`: Sin el fondo (asset ausente o retirado del paquete), la vista de la familia muestra la superficie de respaldo fallbackSurfaceToken 'canvas' 
- REQ-06 (edit) `confirmed`: Hay goldens de la plantilla con el fondo de cada familia en teléfono vertical (390x844 dp), tablet vertical y tablet horizontal (HU-01-16) y
- REQ-07 (edit) `confirmed`: Los docs que se toquen (registro de assets en docs/content/imagenes y docs/product/vistas/V-01_inicio.md si cambia su referencia de fondo) q
- REQ-13 (edit) `confirmed`: El contenido de los fondos es provisional y reemplazable sin cambio de código: reemplazar un PNG de app/assets/fondos-vistas/composiciones/ 

**Tasks agregadas:**

- S2: Crear app/test/core/images/overlay_opacity_range_test.dart y el test de contraste (flutter test, app/test/core/images/background_contrast_test.dart). Primero ajustar overlayOpacity por composición dentro del rango (constantes con nombre: delta máximo 0.15 sobre la opacidad base actual, mínimo 0.50, máximo 0.95), luego medir el contraste con zona de contenido central de 80 % del ancho y de 20 % a 80 % del alto, peor caso con muestreo en grilla sin promedio, texto = token onSurface del tema claro (tokens.g.dart), umbral 4.5:1 con escala 200 %. El test pasa si la razón es >= 4.5 o si el incumplimiento está reportado tras agotar el rango. Documentar en docs/design/fondos-vistas-contraste.md opacidad aplicada, incumplimientos y evidencia de emulador diferida. (valida: REQ-05, REQ-09, REQ-10, test; rollback: Revertir los dos tests, las constantes del rango, los valores de overlayOpacity y docs/design/fondos-vistas-contraste.md.)
- S2: Escribir el test de reemplazabilidad (REQ-13) en app/test/core/images/: copia el manifiesto y las composiciones a un directorio temporal, reemplaza un PNG y su entrada, e invoca scripts/assets/validate_manifest.py con Process.run comprobando el código de salida. Nunca escribe sobre app/assets. (valida: REQ-13, test; rollback: Borrar el archivo de test de reemplazabilidad.)
- S3: Escribir el test de respaldo canvas (HU-01-02, QA-02-08-03): con el asset de cada familia ausente, la vista muestra fallbackSurfaceToken 'canvas' sin fallar. El gate de la sesión 3 tiene reviewOutcome: 'flutter test test/core/images en verde con el test de respaldo canvas (S3.T3) y docs/design/fondos-vistas-contraste.md con la verificación humana diferida'. (valida: REQ-04, test; rollback: Borrar el test de respaldo canvas.)

**Task ops:**

- edit S1.T1 { desc="Única task que agrega a scripts/assets/validate_manifest.py las reglas de medida mínima por composición (phone-portrait 1536x2732, tablet-portrait 2048x2732, tablet-landscape 2732x2048), familia incompleta y approved-without-approval (DEC-230). Agrega reglas al validador existente, no crea uno nuevo.", validates=["REQ-01","REQ-08"], isTest=false, verify=["python3 scripts/assets/validate_manifest.py"] }
- edit S1.T2 { desc="Registrar en app/assets/manifest.json las 12 composiciones de app/assets/fondos-vistas/composiciones/ con los ids familia-identidad-entrada, v-01-inicio, familia-consultas-personas y familia-recorrido (archivos '<id>-<variante>.png'), theme light, medidas reales y estado provisional. Autoría conservada tal como figura o copiada de las entradas hermanas de la misma familia, sin inventarla. Entradas identificadas por path, no por número de línea.", validates=["REQ-01"], verify=["python3 scripts/assets/validate_manifest.py"] }
- edit S1.T4 { desc="SOLO tests de las reglas de S1.T1 (no las reimplementa) en tests/test_assets_manifest.py: medida mínima, 2047x2732 falla, familia incompleta, approved-without-approval y background-not-final (caso a, 941x1672 aprobado).", validates=["REQ-01","REQ-02"], isTest=true, verify=["python3 -m unittest tests.test_assets_manifest"] }
- edit S1.T5 { desc="Reclasificar por path como mockup-reference (schema del manifiesto) los cuatro maestros 940/941 x 1672: app/assets/fondos-vistas/familia-identidad-entrada.png, v-01-inicio.png, familia-consultas-personas.png y familia-recorrido.png.", validates=["REQ-02"], isTest=false, verify=["python3 scripts/assets/validate_manifest.py"] }
- edit S2.T1 { desc="Declarar o reapuntar las ImageFamilyDeclaration de las cuatro familias (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) a las composiciones de composiciones/ con lightPhonePortrait, lightTabletPortrait y lightTabletLandscape. Antes de extender ImageAssetVariant con el campo opcional overlayOpacity (null = opacidad base actual), analizar sus consumidores (resolvedor y fixtures) y reportar el impacto.", validates=["REQ-03","REQ-08","REQ-11"], isTest=false, verify=["cd app && flutter test test/core/images"] }
- edit S2.T3 { desc="Goldens de la plantilla con el fondo de cada familia: teléfono 390x844, tablet vertical 768x1024 dp con devicePixelRatio 2.0 y tablet horizontal 1024x768 dp, más hoja de contacto de las 12 composiciones.", validates=["REQ-06"], isTest=true, verify=["cd app && flutter test test/core/images"] }
- edit S2.T4 { desc="Validar REQ-02 y REQ-03: ausencia de paths 940/941 x 1672 en las declaraciones de familias y resolución por layout (tablet horizontal resuelve tablet-landscape, no el vertical).", validates=["REQ-02","REQ-03"], isTest=true, verify=["cd app && flutter test test/core/images"] }

### Enmienda 8
**REQs:**

- REQ-14 (add) `confirmed`: ImageAssetVariant se extiende con un campo opcional overlayOpacity (double?, null significa la opacidad base actual del overlay) y el render

**Task ops:**

- edit S2.T1 { desc="Declarar o reapuntar en código las cuatro familias (familia-identidad-entrada, v-01-inicio, familia-consultas-personas, familia-recorrido) con ImageFamilyDeclaration, cada una con lightPhonePortrait, lightTabletPortrait y lightTabletLandscape apuntando a su composición, manteniendo estable el id de familia. ANTES de modificar, buscar con Grep todos los consumidores de ImageAssetVariant (resolvedor por ImageLayout, BackgroundLayer, fixtures y tests de app/test/core/images), leerlos y reportar el impacto. Extender ImageAssetVariant con el campo opcional overlayOpacity (double?, null = opacidad base actual) manteniendo compatibles a los consumidores y fixtures. Hacer que el renderer de producción (BackgroundLayer o quien aplique surfaceOverlay) lea overlayOpacity de la variante resuelta, de modo que el test de contraste de S2.T6 mida con el mismo camino de código. El rango efectivo de overlayOpacity es la intersección de base +/-0.15 y [0.50, 0.95] (constantes con nombre: delta máximo 0.15, mínimo 0.50, máximo 0.95) y se documenta en docs/design/fondos-vistas-contraste.md.", validates=["REQ-03","REQ-08","REQ-09","REQ-11","REQ-14"], verify=["cd app && flutter test test/core/images"] }
- edit S2.T6 { desc="En el test de contraste (flutter test), el caso happy de REQ-09 (ajuste de opacidad dentro del rango que logra 4.5:1) usa composiciones sintéticas generadas en memoria o en directorio temporal, no las 12 provisionales, y mide la opacidad con el mismo camino de código de producción que lee overlayOpacity (BackgroundLayer o quien aplique surfaceOverlay). Las 12 composiciones reales se miden con la misma ruta; el test falla solo si no se alcanza 4.5:1 y además no se aplicó el ajuste dentro del rango efectivo (intersección de base +/-0.15 y [0.50, 0.95]) o no se registró el incumplimiento en docs/design/fondos-vistas-contraste.md.", validates=["REQ-05","REQ-09","REQ-10","REQ-14"], isTest=true, verify=["cd app && flutter test test/core/images"] }
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5

**Gate (auto)**: validate_manifest.py sale 0 sobre el manifiesto real y falla con findings nombrados ante una composición bajo la mínima o un fondo 940 aprobado. Las 12 composiciones están en manifest.json como provisional y los 940/941 como referencia. pnpm run check en verde.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T6
- [ ] S2.T7

**Gate (auto)**: flutter test test/core/images en verde con goldens de las 12 composiciones (390x844, 768x1024 DPR 2.0, 1024x768) y el test de contraste (>= 4.5:1 o incumplimiento reportado); el test de respaldo canvas se exige en el gate de la sesion 3.

### Session 3 · T0 · open

**Tasks:**
- [ ] S3.T3
- [ ] S3.T4

**Gate (auto)**: flutter test test/core/images en verde con el test de respaldo canvas (S3.T3) y docs/design/fondos-vistas-contraste.md con la verificacion humana diferida de Diseno y la evidencia de emulador.
