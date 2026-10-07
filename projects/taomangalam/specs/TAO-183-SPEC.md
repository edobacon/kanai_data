---
id: TAO-183-SPEC
project: taomangalam
ticket: TAO-183
status: approved
---

# TAO-183 · Splash de identidad con destino y sin esperas artificiales (HU-01-12)

## Resumen ejecutivo

Se implementa la splash de TAO-183 en tres etapas verticales revisables sobre epic/EP-01: splash nativa con logo de tinta sobre papel ivory100 (claro y oscuro), primera superficie Flutter con la secuencia de tokens enso→disco→nombre (animación propia con CustomPainter sobre el raster, sin Rive/Lottie, DEC-050), corte inmediato al estado final y navegación, resolución de destino a Inicio (V-01) o al marcador estable de V-51, respeto de movimiento reducido vía PreferenceStoreReducedMotionStore, fondo de la familia Identidad/entrada y accesibilidad. NO se hace: pantalla real de V-51 ni registro de aceptación (HU-01-13), encuadre de icono/iconos de lanzamiento (HU-02-07/EP-17), apertura desde notificación (EP-08), contraste aumentado (HU-01-17). Funciona si: en iOS/Android claro y oscuro se ve la identidad sin esperas, el arranque normal anima una sola vez y corta al destino cuando está listo, la carga larga deja logo/nombre quietos con indicador discreto, movimiento reducido no traza, y sin red se llega a V-51; golden teléfono/tablet y aprobación de Diseño [fidelity]. Tamaño: 3 sesiones T2 (~5 puntos), dentro del techo de 4 sesiones.

Datos a confirmar antes de ejecutar: nombre estable de la ruta marcador de V-51 (acordar con TAO-185/HU-01-13); rutas de go_router que deja HU-01-09 (nombre de la ruta de Inicio/V-01); interfaz y ubicación del estado legal local (registro_legal_pendiente / EP-03a); nombres de archivo de la splash nativa (iOS LaunchScreen.storyboard y Android launch_background.xml) y si ya existen; existencia del logo raster de tinta en app/assets/identidad/ y de la imagen familia-identidad-entrada.png.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:131

La splash nativa usa el papel ivory100 y el logo sol-luna de tinta como firma, y se ve igual con el sistema operativo en claro y en oscuro.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/design_system/tokens/tokens.g.dart:387

La primera superficie Flutter reproduce una sola vez la secuencia de tokens: trazo del enso 0–650 ms, disco rojo con opacidad y escala 0.92→1 en 450–750 ms, nombre con opacidad y 6 px en 520–850 ms, con tope splashMax 1000 ms, usando animación propia de Flutter (CustomPainter sobre el logo raster) sin Rive ni Lottie.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:180

La secuencia corta de inmediato al estado final y navega en cuanto el destino está listo, sin bucle ni repetición (DEC-050).

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:131

Con una carga superior a un segundo, el logo y el nombre quedan quietos y aparece un indicador discreto separado, sin reiniciar el enso.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:180

Con movimiento reducido (del sistema o preferencia local leída por PreferenceStoreReducedMotionStore sobre su única clave versionada) la identidad aparece en estado final directo o con un fundido de hasta 120 ms, sin trazo.

### REQ-06 `confirmed`
> Fuente: TAO-183 adenda 4 (2026-10-07) + pedido de enmienda; app/lib/navigation/legal_consent_gate.dart, app/lib/app.dart, app/lib/navigation/app_routes.dart

La splash navega SIEMPRE a Inicio por NOMBRE con `AppRouteNames.home` (path `/home`, `app/lib/navigation/app_routes.dart`) en cuanto el destino esta listo; NO se crea ni se declara ninguna ruta marcador de V-51 y no se agregan rutas nuevas a `app_routes.dart`. La presentacion de V-51 (primer uso sin aceptacion registrada, o version legal pendiente) la resuelve el `LegalConsentGate` existente (`app/lib/navigation/legal_consent_gate.dart`, montado sobre el shell en `app/lib/app.dart`), que consulta el estado legal via `consentimientoLegalControllerProvider` y superpone `LegalConsentView` sobre el shell mientras hay documentos por aceptar. La splash no consulta ni duplica el estado legal (DEC-076, adenda 4, GH-63/TAO-185).

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:125

La splash usa solo recursos locales, funciona sin conexión y el alta de la cuenta de dispositivo (EP-03a) no la retrasa.

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:927

«Tao Mangalam» es una clave de texto no traducible; el logo y el nombre se anuncian como «Tao Mangalam» y el indicador de carga tiene etiqueta; el logo queda centrado y sin deformar en teléfono y tablet.

### REQ-09 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:927

La primera superficie Flutter muestra familia-identidad-entrada.png a pantalla completa detrás del contenido (cover con punto focal, opacidad visual 12–18 %, al menos 65 % de zona tranquila) con el texto largo sobre superficie opaca, sin salto de color del papel respecto de la splash nativa (DEC-235, doc 43 §9).

### REQ-10 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/design_system/tokens/tokens.g.dart:387

La splash reutiliza los tokens de movimiento de tokens.g.dart, el servicio de reducción de movimiento de HU-01-07 vía PreferenceStoreReducedMotionStore y el resolvedor de imágenes existente, sin dependencias nuevas y con la identidad declarada en un solo lugar (DEC-050).

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Si la historia modifica docs/PLAN.md o docs/product/vistas/V-01_inicio.md (ambos en el baseline de lint de docs, .docs-baseline.txt), esos documentos quedan compliant con el linter de docs para no romper el job de docs ni quality-gate.

### REQ-12 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:125

El tiempo desde el arranque hasta el destino queda registrado como métrica de desarrollo.
## Tasks

#### S1.T1 — Configurar la splash nativa de iOS y Android: fondo ivory100 y logo sol-luna de tinta desde app/assets/identidad/, válida con el sistema en claro y en oscuro.
Contrato: rollback: Revertir la configuración de la splash nativa al launch screen por defecto.. Status: done

#### S1.T2 — Crear la primera superficie Flutter de la splash como ruta de arranque, con la identidad en estado final (logo centrado y nombre «Tao Mangalam» como clave no traducible) y sin animación todavía.
Contrato: rollback: Eliminar la ruta/superficie de splash y volver a la pantalla de arranque previa.. Status: done

#### S1.T3 — Resolver el destino de la splash a Inicio y delegar V-51 al gate existente. NO crear ninguna ruta marcador ni agregar entradas a `app/lib/navigation/app_routes.dart`. En cuanto el destino esta listo (o al vencer `splashMax` 1000 ms), la splash navega por NOMBRE a `AppRouteNames.home` (path `/home`) usando el router de go_router que deja HU-01-09/TAO-179. Quitar de la splash toda consulta al estado legal (`ColaLegalPendiente` / `colaLegalPendienteProvider`): la presentacion de V-51 (primer uso sin aceptacion registrada o version legal pendiente) queda a cargo del `LegalConsentGate` ya integrado por GH-63/TAO-185 en `app/lib/navigation/legal_consent_gate.dart`, montado sobre el shell en `app/lib/app.dart`, que lee `consentimientoLegalControllerProvider` y superpone `LegalConsentView` mientras hay documentos por aceptar y usa la copia legal empaquetada sin red. Verificar que el gate siga envolviendo el shell despues del cambio y que no haya doble resolucion del estado legal.
Contrato: rollback: Revertir el resolvedor de destino de la splash a la navegacion directa a `AppRouteNames.home` sin cambios adicionales y dejar intacto `app/lib/app.dart` con el `LegalConsentGate` tal como lo integro GH-63; no se agregan ni se quitan rutas en `app_routes.dart`, por lo que el revert no afecta al router.. Status: done

#### S1.T4 — Escribir los tests de la etapa: unitaria de resolución del destino (Inicio, V-51 sin aceptación, V-51 por versión pendiente), arranque sin red y emisión de la métrica; cubrir los criterios de aceptación de destino.
Contrato: rollback: Revertir los archivos de test agregados.. Status: done

#### S2.T1 — Implementar la secuencia animada de la identidad con animación propia de Flutter (CustomPainter que revela el trazo sobre el logo raster), sin Rive ni Lottie, usando los tokens splashEnso, splashDiscStart/End, splashNameStart/End y splashMax; cortar al estado final y navegar apenas el destino está listo, sin bucle.
Contrato: rollback: Desactivar la animación y mostrar la identidad en estado final estático.. Status: done

#### S2.T1.1 — Dibujar el trazo del enso de 0 a 650 ms (splashEnso) revelando progresivamente el raster con un CustomPainter.
Contrato: rollback: Quitar el trazo y dejar el logo raster completo.. Status: done

#### S2.T1.2 — Animar el disco rojo con opacidad y escala 0.92→1 entre splashDiscStart (450 ms) y splashDiscEnd (750 ms).
Contrato: rollback: Quitar la animación del disco y mostrarlo en estado final.. Status: done

#### S2.T1.3 — Animar el nombre con opacidad y desplazamiento de 6 px entre splashNameStart (520 ms) y splashNameEnd (850 ms).
Contrato: rollback: Quitar la animación del nombre y mostrarlo en estado final.. Status: done

#### S2.T2 — Añadir el estado de carga larga: si el destino no está listo al pasar splashMax, dejar logo y nombre quietos y mostrar un indicador discreto separado, sin reiniciar el enso.
Contrato: rollback: Quitar el indicador y dejar la splash solo en estado final.. Status: done

#### S2.T3 — Atender el movimiento reducido leyendo la preferencia por PreferenceStoreReducedMotionStore: mostrar el estado final directo o un fundido de hasta 120 ms, sin trazo.
Contrato: rollback: Volver al comportamiento con animación completa.. Status: done

#### S2.T4 — Escribir los tests de la etapa con reloj simulado: corte inmediato a los 400 ms, carga >1 s con enso único e indicador, movimiento reducido sin trazo y fundido ≤120 ms, y ausencia de dependencias Rive/Lottie.
Contrato: rollback: Revertir los archivos de test agregados.. Status: done

#### S3.T1 — Mostrar el fondo de la familia Identidad/entrada (familia-identidad-entrada.png) a pantalla completa detrás del contenido usando el resolvedor de imágenes existente: cover con punto focal, opacidad visual 12–18 % y al menos 65 % de zona tranquila; el texto largo va sobre superficie opaca y el papel no salta respecto de la splash nativa.
Contrato: rollback: Quitar el fondo de familia y dejar el papel ivory100 plano.. Status: pending

#### S3.T2 — Aplicar accesibilidad y responsive: anunciar logo y nombre como «Tao Mangalam» (clave no traducible), etiquetar el indicador de carga y mantener el logo centrado y sin deformar en teléfono y tablet.
Contrato: rollback: Revertir las etiquetas de semántica y el ajuste responsive.. Status: pending

#### S3.T3 — Si la historia toca docs/PLAN.md o docs/product/vistas/V-01_inicio.md, dejarlos compliant con el linter de docs del baseline (.docs-baseline.txt) para no romper el job de docs ni quality-gate.
Contrato: rollback: Revertir los cambios de esos documentos.. Status: pending

#### S3.T4 — Escribir los tests de la etapa: golden del estado final en teléfono y tablet, test de semántica (anuncio «Tao Mangalam» y etiqueta del indicador) y verificación de lint de los docs del baseline.
Contrato: rollback: Revertir los archivos de test y los goldens agregados.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: La primera superficie Flutter muestra familia-identidad-entrada.png a pantalla completa detrás del contenido (cover con punto focal, opacidad visual 12–18 %, al menos 65 % de zona tranquila) con el texto largo sobre superficie opaca, sin salto de color del papel respecto de la 
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-06 (edit) `confirmed`: La resolución de destino decide: sin aceptación legal registrada ni pendiente en el dispositivo lleva a V-51; con una versión legal pendient

**Task ops:**

- edit S1.T3 { desc="Fijar las rutas de salida de la splash en `app/lib/navigation/app_routes.dart`: agregar el nombre marcador estable `AppRouteNames.aceptacionLegal = 'aceptacionLegal'` y `AppRoutePaths.aceptacionLegal = '/legal'`, y registrar en el router de go_router de HU-01-09 una ruta marcador con ese nombre y path (builder placeholder documentado como reemplazable por HU-01-13/TAO-185 sin tocar la lógica de resolución). Inicio reutiliza el nombre existente `AppRouteNames.home` (path `/home`). El resolvedor de destino navega por NOMBRE (goNamed), nunca por literal de path, y consulta el estado legal por la interfaz `ColaLegalPendiente` de `app/lib/features/legal/data/cola_offline.dart` a través de `colaLegalPendienteProvider`: sin aceptación registrada ni pendiente → `aceptacionLegal`; con versión legal pendiente conocida → `aceptacionLegal`; en otro caso → `home`. Ante una falla al leer el estado legal, el destino seguro es `aceptacionLegal`.", rollback="Revertir `app/lib/navigation/app_routes.dart` y el registro de la ruta marcador en el router al estado previo (sin `aceptacionLegal`), y dejar el resolvedor navegando solo a `AppRouteNames.home`; la splash sigue arrancando y llegando a Inicio.", validates=["REQ-06"], verify=["flutter test app/test/navigation/app_routes_test.dart","flutter test app/test/features/splash/splash_destination_test.dart"] }

### Enmienda 2
**REQs:**

- REQ-06 (edit) `confirmed`: La splash navega SIEMPRE a Inicio por NOMBRE con `AppRouteNames.home` (path `/home`, `app/lib/navigation/app_routes.dart`) en cuanto el dest

**Task ops:**

- edit S1.T3 { desc="Resolver el destino de la splash a Inicio y delegar V-51 al gate existente. NO crear ninguna ruta marcador ni agregar entradas a `app/lib/navigation/app_routes.dart`. En cuanto el destino esta listo (o al vencer `splashMax` 1000 ms), la splash navega por NOMBRE a `AppRouteNames.home` (path `/home`) usando el router de go_router que deja HU-01-09/TAO-179. Quitar de la splash toda consulta al estado legal (`ColaLegalPendiente` / `colaLegalPendienteProvider`): la presentacion de V-51 (primer uso sin aceptacion registrada o version legal pendiente) queda a cargo del `LegalConsentGate` ya integrado por GH-63/TAO-185 en `app/lib/navigation/legal_consent_gate.dart`, montado sobre el shell en `app/lib/app.dart`, que lee `consentimientoLegalControllerProvider` y superpone `LegalConsentView` mientras hay documentos por aceptar y usa la copia legal empaquetada sin red. Verificar que el gate siga envolviendo el shell despues del cambio y que no haya doble resolucion del estado legal.", rollback="Revertir el resolvedor de destino de la splash a la navegacion directa a `AppRouteNames.home` sin cambios adicionales y dejar intacto `app/lib/app.dart` con el `LegalConsentGate` tal como lo integro GH-63; no se agregan ni se quitan rutas en `app_routes.dart`, por lo que el revert no afecta al router.", validates=["REQ-06"], isTest=false, verify=["cd app && flutter analyze lib/navigation lib/features/splash","cd app && flutter test test/features/splash"] }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: En arranque frío, en claro y oscuro, se ve la splash nativa con papel ivory100 y logo de tinta y la primera superficie Flutter con la identidad estática; la app resuelve a Inicio cuando hay aceptación registrada y sin versión pendiente, y al marcador de V-51 en el resto; funciona sin red.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: En arranque normal la secuencia enso→disco→nombre corre una sola vez dentro de splashMax; si el destino está listo a los 400 ms salta al estado final y navega sin esperar 1000 ms; con carga >1 s quedan logo y nombre quietos con indicador discreto sin reiniciar el enso; con movimiento reducido no hay trazo (estado final o fundido ≤120 ms).

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4

**Gate (auto)**: La primera superficie Flutter muestra familia-identidad-entrada.png a pantalla completa (cover con punto focal, opacidad 12–18 %, ≥65 % de zona tranquila) en teléfono y tablet sin salto de color del papel; el logo/nombre se anuncian como «Tao Mangalam» y el indicador tiene etiqueta; quedan goldens de teléfono/tablet; y los docs del baseline siguen lint-compliant.

### Session 4 · T0 · open
