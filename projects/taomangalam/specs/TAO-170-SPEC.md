---
id: TAO-170-SPEC
project: taomangalam
ticket: TAO-170
status: approved
---

# HU-01-01 · Tema claro forzado generado desde tokens.v1.json

## Resumen ejecutivo

Se genera el tema claro de la app desde docs/product/design-system/tokens.v1.json (un tool emite el Dart de tokens, versionado y con check de vigencia en CI) y se aplica como única apariencia: AppTheme.light sobre un contrato ThemeExtension, MaterialApp con ThemeMode.light fijo, ThemeController de una sola opción, normalización de cualquier preferencia dark/system previa a light y barras del sistema en contraste claro. NO se hace: AppTheme.dark, selector de tema, contraste aumentado/Ajustes (HU-01-17), splash (HU-01-12) ni resolución de imágenes por tema (HU-01-02). Se sabe que funciona porque con el OS en modo oscuro la app arranca con background #FAF7F0 y textPrimary #141A37, barras del sistema con iconos oscuros, sin selector; la prueba de contraste AA pasa y CI falla si tokens.v1.json cambia sin regenerar, si aparece un color literal/ThemeMode.dark/system fuera del generado o si un par baja de su mínimo. Tamaño: 5 puntos, 3 sesiones. Nota: la preferencia de tema local (`preferencia_local`) aún no existe en app/lib; la normalización se implementa sobre un accesor local mínimo y se marca inferred.

## Requirements

### REQ-01 `confirmed`
> Fuente: docs/product/design-system/tokens.v1.json

Un generador convierte docs/product/design-system/tokens.v1.json en Dart versionado (color primitivo y semántico light —sin semantic.dark—, tipografía, espacio, radio, trazo, tamaño, breakpoints, layout, opacidad, sombra y movimiento) para que ningún valor se copie a mano.

### REQ-02 `confirmed`
> Fuente: docs/product/decisiones/DEC-230-criterios-tecnicos-de-la-base-m0.md

La prueba automática de contraste WCAG sobre los pares semánticos de uso funcional impide regresiones, y tokens.v1.json se ajusta hasta cumplir AA: focus a 3:1, textSecondary y warning a 4.5:1, actionSecondary y border a 3:1, cada uno sobre background y sobre canvas.

### REQ-03 `confirmed`
> Fuente: app/lib/design_system/theme.dart:12

AppTheme.light es la única implementación activa del tema, construida a partir de los tokens generados, y expone los tokens semánticos por un contrato AppThemeData/ThemeExtension preparado para otra paleta sin cambiar a los consumidores.

### REQ-04 `confirmed`
> Fuente: app/lib/app.dart:63

MaterialApp fija ThemeMode.light y un ThemeController con una única opción pública, de modo que el modo oscuro del sistema operativo no cambia la apariencia de la app.

### REQ-05 `inferred`
> Fuente: docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md

Cualquier preferencia de tema dark o system guardada previamente se normaliza a light al iniciar y queda persistida así.

### REQ-06 `confirmed`
> Fuente: docs/product/tecnologia/22_tema_claro_v1_y_preparacion_oscuro.md:21

La barra de estado y la barra de navegación del sistema usan estilo explícito de tema claro, sin heredar el modo del sistema operativo.

### REQ-07 `confirmed`
> Fuente: docs/product/tecnologia/22_tema_claro_v1_y_preparacion_oscuro.md:75

La capacidad de build darkThemeSupported = false impide activar el tema oscuro por configuración remota y no aparece selector de tema.

### REQ-08 `confirmed`
> Fuente: scripts/check_contrato.py

El check de vigencia en CI falla y nombra el archivo desactualizado cuando tokens.v1.json se modifica sin regenerar el Dart de tokens.

### REQ-09 `confirmed`
> Fuente: app/lib/app.dart:63

El análisis estático del código de app/lib no encuentra literales de color (Color(0x...), Colors.*), ThemeMode.dark ni ThemeMode.system fuera del código de tokens generado.

### REQ-10 `confirmed` `enforcement`
> Fuente: app/lib/app.dart:63

El tema consume solo tokens generados y versionados (no se edita el Dart a mano), reemplazando taoLightTheme sin romper a sus consumidores actuales.
## Tasks

#### S1.T1 — Escribir el generador app/tool/generate_design_tokens.dart que lee docs/product/design-system/tokens.v1.json y emite app/lib/design_system/tokens/tokens.g.dart con todos los grupos (primitivo, semantic.light, tipografía, espacio, radio, trazo, tamaño, breakpoint, layout, opacidad, sombra y movimiento), dejándolo versionado.
Contrato: rollback: Borrar el tool y el Dart generado; el tema vuelve al theme.dart actual con taoLightTheme.. Status: done

#### S1.T1.1 — Definir el contrato del generador (estructura tipada del JSON, helpers de lectura y errores que nombran la clave faltante).
Contrato: rollback: Borrar los helpers; no afecta el runtime.. Status: done

#### S1.T1.2 — Emitir las hojas de color primitivo y semantic.light (excluyendo semantic.dark) con sus constantes tipadas.
Contrato: rollback: Borrar el bloque de color del Dart generado.. Status: done

#### S1.T1.3 — Emitir tipografía, espacio, radio, trazo, tamaño, breakpoint, layout, opacidad, sombra y movimiento.
Contrato: rollback: Borrar esos bloques del Dart generado.. Status: done

#### S1.T2 — Implementar el arnés de contraste WCAG en Dart puro y ajustar tokens.v1.json hasta cumplir AA en focus, textSecondary, warning, actionSecondary y border sobre background y sobre canvas.
Contrato: rollback: Restaurar los valores previos de tokens.v1.json; la tabla de contraste vuelve a fallar.. Status: done

#### S1.T3 — Tests del generador (valores, tipos, grupos y vigencia byte a byte) y de la tabla de contraste (pares semánticos y los casos de aceptación).
Contrato: rollback: Borrar los tests; no afecta el runtime.. Status: pending

#### S2.T1 — Definir AppThemeData/ThemeExtension y AppTheme.light mapeando los tokens generados (color, tipografía y extensiones semánticas), reemplazando taoLightTheme.
Contrato: rollback: Restaurar app/lib/design_system/theme.dart con taoLightTheme fromSeed.. Status: pending

#### S2.T1.1 — Definir AppThemeData y el ThemeExtension semántico con los nombres de tokens.v1.json (canvas, surface, actionPrimary).
Contrato: rollback: Borrar el contrato AppThemeData/ThemeExtension.. Status: pending

#### S2.T1.2 — Mapear el color generado a ColorScheme y ThemeData de AppTheme.light.
Contrato: rollback: Revertir el mapeo a taoLightTheme.. Status: pending

#### S2.T1.3 — Mapear tipografía y extensiones (espacio, radio, trazo, movimiento) en AppTheme.light.
Contrato: rollback: Borrar las extensiones no visuales del tema.. Status: pending

#### S2.T2 — Cablear MaterialApp con ThemeMode.light y ThemeController de una sola opción; normalizar cualquier preferencia dark/system guardada a light y persistirla; exponer darkThemeSupported=false que bloquea la activación remota de oscuro.
Contrato: rollback: Revertir app/lib/app.dart al tema sin ThemeMode y quitar el ThemeController.. Status: pending

#### S2.T2.1 — Implementar ThemeController como provider con única opción pública light.
Contrato: rollback: Borrar el ThemeController.. Status: pending

#### S2.T2.2 — Normalizar y persistir a light cualquier preferencia dark/system previa mediante un accesor local mínimo.
Contrato: rollback: Quitar la normalización y su accesor de preferencia.. Status: pending

#### S2.T2.3 — Exponer darkThemeSupported=false y usarlo para ignorar una configuración remota que intente activar oscuro.
Contrato: rollback: Quitar la capacidad darkThemeSupported.. Status: pending

#### S2.T3 — Fijar el estilo explícito de barra de estado y barra de navegación en contraste claro (SystemChrome o AnnotatedRegion), sin heredar el modo del OS.
Contrato: rollback: Quitar la llamada de SystemChrome y dejar el default del framework.. Status: pending

#### S2.T4 — Tests de widget y golden con platformBrightness oscuro en teléfono y tablet que verifican ThemeMode.light, el estilo de barras, la normalización de preferencia y la ausencia de selector.
Contrato: rollback: Borrar los tests y los golden.. Status: pending

#### S3.T1 — Implementar el check de vigencia en CI: regenerar en memoria y comparar con el Dart versionado, fallando con el nombre del archivo desactualizado cuando tokens.v1.json cambia sin regenerar.
Contrato: rollback: Quitar el check; el job de tests vuelve a su alcance previo.. Status: pending

#### S3.T2 — Implementar la guarda de literales que rechaza Color(0x...), Colors.*, ThemeMode.dark y ThemeMode.system en app/lib fuera del Dart generado.
Contrato: rollback: Quitar la guarda de literales.. Status: pending

#### S3.T3 — Tests de las guardas (pasa/falla) y actualización de la prueba de Widgetbook para afirmar un único tema claro sin selector oscuro.
Contrato: rollback: Borrar los tests de guardas y restaurar la prueba de Widgetbook previa.. Status: pending
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T2
- [ ] S1.T3

**Gate (auto)**: Existe app/lib/design_system/tokens/tokens.g.dart generado, compila, reproduce tokens.v1.json y la tabla de contraste pasa con los valores AA; tokens.v1.json queda ajustado.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T1.3
- [ ] S2.T2
- [ ] S2.T2.1
- [ ] S2.T2.2
- [ ] S2.T2.3
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: La app corriendo con el OS en oscuro se ve clara, con barras del sistema de contraste claro, sin selector y con el ThemeController admitiendo solo light.

### Session 3 · T1 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: CI falla nombrando el Dart generado desactualizado y rechaza literales o ThemeMode.dark/system fuera del generado; Widgetbook afirma un único tema claro sin selector.
