---
id: TAO-175-SPEC
project: taomangalam
ticket: TAO-175
status: approved
---

# Moléculas del sistema de diseño: tarjeta, fila navegable, formulario compuesto, chips y etiquetas de estado

## Resumen ejecutivo

Se construyen cinco moléculas del design system sobre los átomos y tokens ya existentes (`tokens.g.dart`, botones/campo de texto de HU-01-03) y se registran en Widgetbook con sus estados (default, pressed, focus, disabled, error, vacío, texto largo), más la fila con ilustración de acción que reusa `TaoEditorialIllustration` y el resolvedor de HU-01-02 con fixtures. NO incluye: tarjeta de consulta con datos reales (EP-05), overlays/feedback (HU-01-05), filtros persistentes de vistas funcionales, ni assets nuevos. Se sabe que funciona por: widget tests de semántica agrupada en fila, foco al primer error y área táctil >=44, goldens por molécula y estado en teléfono y tablet a 100 % y 200 %, y aprobación de Diseño en Widgetbook contra `navegacion-y-acciones/maqueta-direccion-consolidada.png` (DEC-235). Tamaño: 5 puntos, 3 sesiones T2; sin trabajo de backend ni red.

ADVERTENCIA (fuera de alcance, no se implementa): el request no pide un barril de exportación ni un refactor de los átomos de HU-01-03; si las moléculas revelan un átomo faltante (por ejemplo un icono de estado), se reporta y no se agrega alcance.

Datos a confirmar antes de ejecutar:
- Nombres exactos de los átomos de HU-01-03 (clase del botón y del campo de texto, y su ruta en `app/lib/design_system/`): no figuran en los extractos entregados; confirmar leyendo `app/lib/design_system/` en `origin/epic/EP-01` antes de componer.
- Ruta y convención de los casos de Widgetbook ya existentes (directorio `widgetbook/` o `app/widgetbook/`, y si usa `@UseCase` con generador): confirmar en el repo; el request solo exige que las moléculas queden registradas.
- Tokens concretos de duración/curva de movimiento y del servicio de reducción de movimiento (HU-01-07) para el pressed de 120 ms: confirmar nombres en `app/lib/design_system/tokens/tokens.g.dart` y en el servicio de HU-01-07.
- Tokens semánticos de error, borde y radio 14 en `tokens.g.dart`: el extracto solo muestra primitivos (`error600`, `ivory100`); confirmar los nombres semánticos antes de hardcodear valores.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:435

Tarjeta base componible: superficie `surface`, radio 14, borde de 1 px, padding de 16 a 20, con acción o affordance explícito; al tocarse responde con cambio de superficie y escala 0.985 en 120 ms, y la tarjeta completa nunca se expone como un botón sin etiqueta.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/core/images/editorial_illustration.dart:25

Fila navegable: alto mínimo 56, icono opcional, texto, metadato y chevrón, con el lector de pantalla anunciando título y metadato como un solo elemento accionable; admite ilustración de acción que ocupa como máximo un tercio del ancho de la fila, sin marco, borde, sombra ni fondo gris, integrada al papel y con `contain`.

### REQ-03 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:458

Formulario compuesto con validación al salir del campo o al confirmar: al salir de un campo inválido aparece el error debajo con icono y mensaje que indica cómo corregir, sin mover el foco; al confirmar con dos campos inválidos el foco va al primer error y el envío no se ejecuta.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:545

Chips de filtro (alto visual de 36 a 40, área táctil >= 44 de alto, selección señalada con check y cambio de forma además del color, retiro individual) y etiquetas de estado que combinan texto breve más icono y nunca son solo un punto de color.

### REQ-05 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/design_system/tokens/tokens.g.dart:1

Las cinco moléculas se construyen únicamente con los átomos y tokens existentes del design system (`tokens.g.dart` generado, átomos de HU-01-03, resolvedor de imágenes de HU-01-02, tokens de movimiento y servicio de reducción de HU-01-07): sin colores, radios, duraciones ni rutas de asset hardcodeados, y sin editar a mano el archivo generado de tokens.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:117

Cada molécula queda registrada en Widgetbook con los estados default, pressed, focus, disabled, error, vacío y texto largo, visibles en teléfono y tablet, y el catálogo se publica desde el PR para la revisión de Diseño.

### REQ-07 `inferred`
> Fuente: taomangalam/app/test/core/images/editorial_illustration_test.dart:1

Goldens por molécula y estado en teléfono y tablet, con escala de texto 100 % y 200 %, que fallan ante desbordes o texto oculto en 360x800.
## Tasks

#### S1.T1 — Leer los átomos de HU-01-03 y los tokens disponibles en `app/lib/design_system/` (clase de botón, campo de texto, tokens semánticos de superficie, borde, radio y los tokens de movimiento de HU-01-07) y dejar en el PR una nota corta con los nombres exactos que las moléculas van a reusar. Sin esto, las moléculas hardcodean valores.
Contrato: rollback: Descartar la nota; no toca código de producción.. Status: done

#### S1.T2 — Implementar la tarjeta base en `app/lib/design_system/molecules/` tomando superficie `surface`, radio 14, borde 1 px y padding 16-20 de los tokens, con acción o affordance explícito, y respuesta al toque de cambio de superficie más escala 0.985 en 120 ms, degradada a cambio inmediato cuando el servicio de reducción de movimiento de HU-01-07 lo indica. La tarjeta accionable exige etiqueta semántica: sin ella, assert.
Contrato: rollback: Borrar el archivo de la tarjeta y su export; ninguna otra molécula depende aún de ella.. Status: done

#### S1.T3 — Implementar la fila navegable en `app/lib/design_system/molecules/` con alto mínimo 56, icono opcional, texto, metadato y chevrón, agrupando título y metadato en un único nodo semántico accionable (`MergeSemantics`/`Semantics` con label compuesto), y con slot de ilustración de acción que reusa `TaoEditorialIllustration` (`app/lib/core/images/editorial_illustration.dart:25`) recibiendo una `ResolvedImage` ya resuelta y acotando su ancho a un tercio de la fila.
Contrato: rollback: Borrar el archivo de la fila y su export; la tarjeta queda funcional.. Status: done

#### S1.T4 — Registrar en Widgetbook los casos de tarjeta y fila con los estados default, pressed, focus, disabled, error, vacío y texto largo, y las variantes de teléfono y tablet; la fila con ilustración usa `fixtureImageManifest` de `app/lib/core/images/fixtures/image_manifest_fixture.dart:87` como origen de la imagen resuelta.
Contrato: rollback: Quitar los casos agregados del catálogo; los casos de los átomos de HU-01-03 siguen intactos.. Status: done

#### S1.T5 — Tests de tarjeta y fila: toque con cambio de superficie y escala 0.985 en 120 ms y degradación por movimiento reducido; tarjeta accionable sin etiqueta falla; alto de fila >= 56 y semántica única con título y metadato; título de 120 caracteres a 200 % en 360x800 con chevrón visible y sin recorte (QA-01-04-03); ilustración <= un tercio del ancho y sin borde, sombra ni fondo gris.
Contrato: rollback: Eliminar los archivos de test agregados; el código de producción queda igual.. Status: done

#### S2.T1 — Implementar la lógica de validación y foco del formulario compuesto como unidad testeable sin UI (estado de campos, orden de declaración, primer campo inválido, limpieza de error al corregir) en `app/lib/design_system/molecules/`, de modo que el widget solo la consuma.
Contrato: rollback: Borrar el archivo de lógica y su export; nada más lo consume todavía.. Status: done

#### S2.T2 — Implementar el widget de formulario compuesto sobre el campo de texto de HU-01-03: valida al salir del campo o al confirmar, muestra el error debajo con icono y mensaje de corrección sin mover el foco, y al confirmar con errores lleva el foco al primer campo inválido y no invoca el callback de envío.
Contrato: rollback: Borrar el widget del formulario y su caso de catálogo; la lógica queda sin consumidor y puede removerse después.. Status: done

#### S2.T3 — Implementar el chip de filtro (alto visual 36-40, área táctil >= 44 de alto, selección con check y cambio de forma además del color, affordance de retiro que reporta solo su id) y la etiqueta de estado (texto breve más icono; sin texto, assert) en `app/lib/design_system/molecules/`.
Contrato: rollback: Borrar los archivos de chip y etiqueta y sus casos de catálogo; formulario, tarjeta y fila no los consumen.. Status: done

#### S2.T4 — Registrar en Widgetbook los casos de formulario, chip y etiqueta de estado con los estados default, pressed, focus, disabled, error, vacío y texto largo, en teléfono y tablet.
Contrato: rollback: Quitar los casos agregados; los casos de tarjeta y fila de la sesión anterior siguen intactos.. Status: done

#### S2.T5 — Tests de formulario, chip y etiqueta: envío válido invoca el callback una vez; salir de campo inválido muestra mensaje con icono sin mover el foco; dos campos inválidos al confirmar no envían y el foco queda en el primero (QA-01-04-01); chip de 36 con área táctil medida >= 44 (QA-01-04-02); retiro de un chip de tres deja los otros dos; etiqueta sin texto falla; formulario y chip con texto largo a 200 % en 360x800 sin desborde.
Contrato: rollback: Eliminar los archivos de test agregados; el código de producción queda igual.. Status: done

#### S3.T1 — Agregar la guarda de reuso: un test que recorre `app/lib/design_system/molecules/` y falla si encuentra literales `Color(0x...)`, duraciones numéricas fuera de los tokens de movimiento o rutas de asset literales, y que verifica que `app/lib/design_system/tokens/tokens.g.dart` no cambió respecto del baseline.
Contrato: rollback: Eliminar el archivo de la guarda; las moléculas siguen funcionando.. Status: done

#### S3.T2 — Generar y comitear los goldens por molécula y estado representativo en teléfono y tablet, a escala de texto 100 % y 200 %, con el set acotado (cinco moléculas por estados representativos por dos tamaños por dos escalas; sin combinatoria abierta) y verificar que un overflow introducido a propósito hace fallar el golden.
Contrato: rollback: Borrar los goldens y el archivo de test de goldens; los tests de comportamiento de las sesiones previas siguen verdes.. Status: done

#### S3.T3 — Verificar que el catálogo de Widgetbook compila y lista las cinco moléculas con sus siete estados, en teléfono y tablet, y dejar en el PR la referencia de revisión de Diseño (QA-01-04-04): comparar el preview contra `docs/assets/mockups/navegacion-y-acciones/maqueta-direccion-consolidada.png` y doc 43 §8 y §9.
Contrato: rollback: Revertir la nota del PR; el catálogo queda como estaba.. Status: done

#### S3.T4 — Regresión del paquete de moléculas e imágenes: correr los tests de las moléculas junto con los de ilustración editorial y resolvedor para confirmar que el reuso de `TaoEditorialIllustration` y de las fixtures no alteró su comportamiento.
Contrato: rollback: No aplica: no modifica código; si falla, se revierte el cambio que introdujo la regresión.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: Tarjeta base componible: superficie `surface`, radio 14, borde de 1 px, padding de 16 a 20, con acción o affordance explícito; al tocarse responde con cambio de superficie y escala 0.985 en 120 ms, y la tarjeta completa nunca se expone como un botón sin etiqueta.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: Fila navegable: alto mínimo 56, icono opcional, texto, metadato y chevrón, con el lector de pantalla anunciando título y metadato como un solo elemento accionable; admite ilustración de acción que ocupa como máximo un tercio del ancho de la fila, sin marco, borde, sombra ni fon
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: Formulario compuesto con validación al salir del campo o al confirmar: al salir de un campo inválido aparece el error debajo con icono y mensaje que indica cómo corregir, sin mover el foco; al confirmar con dos campos inválidos el foco va al primer error y el envío no se ejecut
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: En Widgetbook se ven la tarjeta base y la fila navegable con sus estados, en teléfono y tablet: la tarjeta responde al toque con cambio de superficie y escala 0.985 en 120 ms, y la fila con ilustración muestra el pictograma sin marco ocupando como máximo un tercio del ancho.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5

**Gate (auto)**: En Widgetbook, el caso de formulario de muestra marca el error debajo del campo al salir sin mover el foco y, al confirmar con dos campos inválidos, lleva el foco al primero sin enviar; los chips muestran check y cambio de forma, se retiran de a uno, y las etiquetas de estado combinan texto e icono.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: Los goldens de las cinco moléculas por estado, en teléfono y tablet a 100 % y 200 %, están comiteados y pasan; la guarda de tokens falla ante un color o duración hardcodeados; el catálogo publicado por el PR queda listo para la revisión de Diseño contra la maqueta (DEC-235).

### Session 4 · T0 · continue
