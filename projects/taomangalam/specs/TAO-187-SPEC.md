---
id: TAO-187-SPEC
project: taomangalam
ticket: TAO-187
status: approved
---

# HU-01-19 · Aviso descartable de actualización recomendada (modal posponible tras la splash y punto de entrada reutilizable)

## Resumen ejecutivo

Se agrega el modal descartable de actualización recomendada. Aparece al abrir la app con conexión cuando obtenerVersionApp responde actualizacion_recomendada. Muestra versionRecomendada, el mensaje y las notas cuando existan. Ofrece Actualizar (abre urlTienda) y Más tarde (pospone solo durante la sesión). Espera a que se cierren V-51 y el modal introductorio, y cede ante actualizacion_obligatoria (HU-01-18). Además expone un punto de entrada para que HU-10-12 presente el mismo modal. NO incluye el modal obligatorio ni el 426 (HU-01-18), el botón Buscar actualizaciones ni su resultado al_dia (HU-10-12), la lectura pública del servidor (HU-03a-09) ni el registro de releases (EP-17). Sin cambios de modelo de datos. Criterios observables: el modal aparece con build 18, recomendada 20 y mínima 15. No aparece sin conexión, con un 500 ni con estado obligatorio. Más tarde no lo repite en la sesión y sí lo repite en la siguiente apertura. Con urlTienda nula, Actualizar queda deshabilitado con el motivo y se registra el error. Hay widget tests, una entrada en Widgetbook y capturas en teléfono 360x800 al 200 % y en tablet horizontal. Tamaño: 3 puntos, 2 sesiones (T2 + T2).
ADVERTENCIAS: (1) El contrato VersionApp (server/contract/generated/api.d.ts:2424-2427) ya trae titulo y mensaje opcionales, mientras que el request dice que no los trae. El plan usa siempre claves i18n (DEC-166), lo que coincide con el comentario del contrato ('si falta, la app usa su clave i18n'). Confirmar si se ignoran los textos del servidor aunque lleguen. (2) La historia está bloqueada por HU-01-18, que debe estar integrada en epic/EP-01. Se reutilizan su cliente de obtenerVersionApp, su apertura de tienda y su registro de urlTienda nula, sin duplicarlos. (3) Los textos i18n son provisionales de fixture hasta que se aprueben. QA-01-19-04 (aprobación de Diseño) puede pausar el cierre. (4) QA-01-19-01 contra staging y en iPhone es QA humana y no se automatiza aquí.
Datos a confirmar antes de ejecutar: (a) La ruta del paquete Flutter de la app dentro de taomangalam: el plan asume app/, verificarlo en origin/main. (b) El nombre y la ruta del diálogo de HU-01-05, del servicio de versión y apertura de tienda de HU-01-18, del coordinador de la splash/V-51/modal introductorio y del servicio de movimiento reducido (HU-01-07, adaptador PreferenceStoreReducedMotionStore): verificar en epic/EP-01 tras integrar TAO-184/TAO-186. (c) La ubicación del ARB base de HU-01-06 y del catálogo de Widgetbook. (d) La API de telemetría/logging que usa HU-01-18 para los eventos y el error de configuración.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2275; taomangalam/server/contract/generated/dart/lib/src/model/version_app.dart:17

Con estado actualizacion_recomendada, la app presenta un modal descartable con título por clave i18n, la versión disponible (versionRecomendada), el mensaje genérico por clave i18n, las notas solo cuando existan, y las acciones Actualizar (abre urlTienda de la plataforma) y Más tarde (cierra el aviso).

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2263

El aviso se pospone por sesión: Más tarde, Atrás, Escape y el toque exterior lo cierran con el mismo efecto, no reaparece en la misma sesión y vuelve a comprobarse en la siguiente apertura normal con conexión.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2279; taomangalam/server/contract/generated/api.d.ts:2421

Al abrir la app con conexión, el aviso se dispara tras la splash solo si obtenerVersionApp responde actualizacion_recomendada. Sin conexión, con error o sin respuesta no aparece. Con actualizacion_obligatoria rige HU-01-18 y este aviso no aparece. La comparación usa el número de compilación (DEC-086).

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2263

El aviso no se superpone a otro modal: si V-51 o el modal introductorio están visibles cuando llega la respuesta recomendada, se presenta recién cuando ambos se cierran.

### REQ-05 `confirmed`
> Fuente: taomangalam/server/contract/generated/api.d.ts:2423; taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2186

Con urlTienda nula, Actualizar queda deshabilitado mostrando el motivo, Más tarde funciona y se registra un error de configuración, igual que en HU-01-18.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2263

Existe un punto de entrada reutilizable que presenta este mismo modal a partir de una VersionApp recomendada, para que Buscar actualizaciones de HU-10-12 lo consuma (disparador 'manual'), sin implementar el botón ni el resultado al_dia.

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2242

Accesibilidad y presentación: el foco va al título al abrir y vuelve al origen al cerrar; el lector anuncia título, versión y mensaje; los objetivos táctiles son mínimos; no hay cortes en un teléfono 360x800 al 200 % ni en tablet horizontal; con movimiento reducido la entrada es un fundido breve o inmediata; el modal no tiene fondo propio y deja ver el de la vista anfitriona tras el scrim, con el texto sobre superficie opaca (DEC-235).

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2242

Observabilidad: se registra la aparición del aviso y la elección (Actualizar o Más tarde/descartar) con plataforma, compilación y disparador (apertura | manual), sin datos personales.

### REQ-09 `inferred` `enforcement`
> Fuente: taomangalam/server/contract/generated/dart/lib/src/model/version_app.dart:24

Se reutilizan los componentes existentes: el diálogo de HU-01-05 como contenedor, el modelo generado VersionApp (no se redefinen tipos), las claves ARB de HU-01-06 con su lint, y el cliente de versión, la apertura de tienda y el registro de urlTienda nula de HU-01-18.

### REQ-10 `confirmed` `enforcement`
> Fuente: KB EP-01: tao181-preferencias-una-sola-clave

El movimiento reducido se lee solo por el servicio de HU-01-07 a través de PreferenceStoreReducedMotionStore (clave versionada única), sin leer movimiento_reducido ni crear un store paralelo.
## Tasks

#### S1.T1 — Agregar las claves ARB de HU-01-06 para el aviso recomendado: título, mensaje genérico, etiqueta de versión con placeholder, Actualizar, Más tarde y motivo de urlTienda nula. Usar textos provisionales de fixture y reutilizar las claves que HU-01-18 ya defina para Actualizar y el motivo. Regenerar las localizaciones.
Contrato: rollback: Revertir el commit de las claves ARB y de las localizaciones generadas. Status: done

#### S1.T2 — Crear el widget RecommendedUpdateDialog sobre el diálogo de HU-01-05. Recibe VersionApp (modelo generado) y muestra el título i18n, versionRecomendada, el mensaje i18n y las notas opcionales con scroll interno. Actualizar llama a la apertura de tienda de HU-01-18 con urlTienda. Más tarde, Atrás, Escape y el toque exterior devuelven el mismo resultado 'pospuesto'. Con urlTienda null, Actualizar queda deshabilitado con el motivo y se usa el registro de error de configuración de HU-01-18. El foco va al título y se devuelve al cerrar, con semántica para título, versión y mensaje. Sin fondo propio: se usa el scrim y la superficie opaca del diálogo.
Contrato: rollback: Eliminar el widget nuevo, que todavía no tiene consumidores. Status: done

#### S1.T3 — Hacer la transición de entrada con los tokens de movimiento de HU-01-07: fundido breve o inmediato cuando el servicio de movimiento reducido, leído vía PreferenceStoreReducedMotionStore, está activo. No leer movimiento_reducido.
Contrato: rollback: Volver a la transición por defecto del diálogo de HU-01-05. Status: done

#### S1.T4 — Agregar una entrada en Widgetbook con los casos con notas, sin notas, urlTienda nula, notas largas al 200 % y movimiento reducido, en teléfono y tablet, con el fondo familia-identidad-entrada como vista anfitriona. Generar las capturas para la revisión de Diseño (QA-01-19-04).
Contrato: rollback: Eliminar la entrada de Widgetbook. Status: done

#### S1.T5 — Widget tests de RecommendedUpdateDialog: contenido con y sin notas, Actualizar con la URL exacta, los cuatro modos de descarte con el mismo resultado, urlTienda null (deshabilitado, motivo visible, un registro de error, Más tarde funciona), textos i18n aunque el servidor mande titulo/mensaje, 360x800 al 200 % sin overflow, foco en el título, y movimiento reducido leído desde la clave versionada.
Contrato: rollback: Eliminar el archivo de test nuevo. Status: done

#### S2.T1 — Implementar RecommendedUpdatePolicy como función pura. Recibe el resultado de obtenerVersionApp (respuesta | error | sin conexión), la compilación instalada, el flag de pospuesto en sesión y si hay modales visibles (V-51 o introductorio). Devuelve mostrar | esperar | no_mostrar. Las reglas: obligatoria y al_dia dan no_mostrar; error y sin conexión dan no_mostrar; si hay modales visibles, esperar; la comparación es por número de compilación (DEC-086). Reutilizar el cliente de versión de HU-01-18, sin una segunda llamada.
Contrato: rollback: Eliminar la política, que no tiene consumidores fuera de este ticket. Status: pending

#### S2.T2 — Conectar el disparador de apertura en el flujo de la splash (V-31). Tras la splash, aplicar la política sobre la respuesta que obtuvo HU-01-18. Si toca esperar, presentar el modal al cerrarse V-51 y el modal introductorio. Guardar el pospuesto solo en memoria de sesión (sin persistirlo) para que la siguiente apertura vuelva a comprobar. Exponer presentRecommendedUpdate(VersionApp, disparador: manual) como punto de entrada para HU-10-12.
Contrato: rollback: Quitar la conexión en el flujo de la splash; la app vuelve al comportamiento sin aviso recomendado y HU-01-18 queda intacta. Status: pending

#### S2.T3 — Registrar los eventos de aparición y de elección (actualizar | mas_tarde) con plataforma, compilación y disparador (apertura | manual), usando el mismo mecanismo de registro que HU-01-18 y sin datos personales.
Contrato: rollback: Quitar las llamadas de registro. Status: pending

#### S2.T4 — Tests unitarios de RecommendedUpdatePolicy (recomendada 20 sobre compilación 18 y mínima 15, 500, sin conexión, obligatoria, al_dia, pospuesto, espera por V-51 o introductorio). Integración con un servidor local que responde recomendada: modal tras la splash, Más tarde sin repetición en la sesión, nueva sesión que vuelve a mostrar, primer uso con V-51 en espera, eventos con el disparador correcto, invocación manual. Regresión: el modal obligatorio de HU-01-18 sigue apareciendo solo.
Contrato: rollback: Eliminar los archivos de test nuevos. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: Con estado actualizacion_recomendada, la app presenta un modal descartable con título por clave i18n, la versión disponible (versionRecomendada), el mensaje genérico por clave i18n, las notas solo cuando existan, y las acciones Actualizar (abre urlTienda de la plataforma) y Más
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: El aviso no se superpone a otro modal: si V-51 o el modal introductorio están visibles cuando llega la respuesta recomendada, se presenta recién cuando ambos se cierran.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: Existe un punto de entrada reutilizable que presenta este mismo modal a partir de una VersionApp recomendada, para que Buscar actualizaciones de HU-10-12 lo consuma (disparador 'manual'), sin implementar el botón ni el resultado al_dia.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
4. **Qué:** Verificar en runtime: Accesibilidad y presentación: el foco va al título al abrir y vuelve al origen al cerrar; el lector anuncia título, versión y mensaje; los objetivos táctiles son mínimos; no hay cortes en un teléfono 360x800 al 200 % ni en tablet horizontal; con movimiento reducido la entrada e
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: Widget tests del modal en verde y entrada en Widgetbook con los casos con notas, sin notas, urlTienda nula y movimiento reducido, más capturas de teléfono y tablet

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: La integración contra el servidor local muestra el modal tras la splash con recomendada 20. No aparece con 500, sin red ni con obligatoria. Espera a V-51 y al modal introductorio, y no se repite en la sesión tras Más tarde. Los tests unitarios de la decisión están en verde.

### Session 3 · T0 · open
