---
id: TAO-181-SPEC
project: taomangalam
ticket: TAO-181
status: approved
---

# Ajustes de accesibilidad con previsualización, aplicación global y persistencia local (HU-01-17)

## Resumen ejecutivo

Implementa la pantalla Ajustes con previsualización (apariencia clara fija, Reducir movimiento, Contraste aumentado y Lectura ampliada) y su aplicación en toda la app: movimiento combinado con el SO (sin desplazamientos, solo fundidos ≤120 ms o inmediatos), tokens de mayor contraste, fichas del método con lectura ampliada, splash que respeta lo guardado y panel de tablet en vivo sin reiniciar; persistencia por dispositivo en `preferencia_local` con claves versionadas. NO incluye: selector de tema o idioma, respaldo, seguridad, tutorial, versión, la escala del rastro del tablero (EP-07) ni la sección Recordatorios (HU-08-05). Se observa con goldens de plantillas en contraste aumentado, tests de persistencia/descarte de previsualización, navegación y splash sin desplazamiento, y la comparación humana de Ajustes contra la maqueta consolidada y doc 43 §9 (QA-01-17-05). Estimación ~5 puntos; cabe en 4 sesiones (techo de entrada).
Datos a confirmar antes de ejecutar:
- Ubicación exacta de la pantalla Ajustes, del pie del menú (spec de HU-01-08) y del servicio de reducción de movimiento (HU-01-07) en la rama `epic/EP-01`; confirmar rutas y API en esa rama antes de codear.
- Entrega del juego de tokens de contraste aumentado en `tokens.v1.json` por Diseño (DEC-232): bloquea REQ-04; confirmar con Diseño si ya está en la rama.
- API del tema de HU-01-01 y del resolvedor de imágenes por familia (HU-01-10) para no re-inventar la superficie de fondo.
- Runner y directorio de tests: confirmar si es `fvm flutter test` y si se ejecuta desde `taomangalam/app` o la raíz del repo (afecta los comandos `verify`).
- Ruta o comando de la utilidad de contraste de HU-01-15 para QA-01-17-03.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2011

Ajustes es la pantalla destino del pie del menú, a pantalla completa, con apariencia clara fija (sin selector de tema) y los tres controles: Reducir movimiento, Contraste aumentado y Legibilidad (lectura ampliada).

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1552

La previsualización vive dentro de Ajustes: ningún cambio sale de la previsualización hasta tocar Aplicar; salir sin aplicar descarta todo.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:943

Reducir movimiento escribe la preferencia local que lee el servicio de HU-01-07, se combina con la del sistema operativo y, al aplicarse, rige en toda la app: navegación, menú y tablero sin desplazamientos, solo fundidos de hasta 120 ms o cambios inmediatos.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1004

Contraste aumentado activa un juego de tokens semánticos de mayor contraste expuesto por el tema de HU-01-01, sin transparencias tenues; al aplicarse, todas las plantillas usan esos tokens y ninguna acción queda oculta ni recortada.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:179

Lectura ampliada: al aplicarla, las fichas del método usan un tamaño de texto mayor y un espaciado de lectura más amplio; el resto de las superficies sigue el tamaño de texto del dispositivo.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2035

Las preferencias se persisten en preferencia_local por dispositivo con claves versionadas; iniciar sesión o sincronizar no las sobrescribe; una clave desconocida vuelve al valor por defecto.

### REQ-07 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:263

La splash siguiente usa lo guardado y respeta Reducir movimiento.

### REQ-08 `inferred`
> Fuente: taomangalam/app/test/navigation/app_shell_golden_test.dart:5

Con panel persistente en tablet, aplicar un ajuste actualiza el panel y el contenido sin reiniciar la app.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/app/test/goldens/tao_overlays_golden_test.dart:34

Ajustes y la aplicación de preferencias reutilizan el tema de HU-01-01, el servicio de reducción de movimiento de HU-01-07 y el resolvedor de imágenes por familia; no se crean equivalentes nuevos.

### REQ-10 `confirmed` `enforcement`
> Fuente: taomangalam/app/assets/manifest.json:44

El fondo de la familia Cuenta (v-27-cuenta.png) ocupa la pantalla completa detrás del contenido: cover con punto focal, opacidad visual de 12 a 18 %, al menos 65 % de zona tranquila y texto largo sobre superficie opaca (doc 43 §9, DEC-235).

### REQ-11 `confirmed` `enforcement`
> Fuente: taomangalam/app/test/navigation/app_shell_golden_test.dart:5

Los controles de Ajustes anuncian su estado y el texto escala al 200 % sin cortes ni acciones ocultas en teléfono y tablet.
## Tasks

#### S1.T1 — Definir el modelo inmutable de preferencias (reduceMotion, increasedContrast, extendedReading) con claves versionadas en preferencia_local, valor por defecto ante clave desconocida y persistencia por dispositivo que no se sobrescribe al iniciar sesión o sincronizar (DEC-102).
Contrato: rollback: Eliminar lib/core/preferences/preference_store.dart y las claves nuevas de preferencia_local; no hay datos productivos que migrar.. Status: done

#### S1.T2 — Implementar el controlador que expone las preferencias activas y combina la preferencia local de reducir movimiento con la del SO mediante el servicio de HU-01-07; reutilizar el tema de HU-01-01 y el resolvedor de imágenes, sin crear equivalentes.
Contrato: rollback: Eliminar lib/core/preferences/preference_controller.dart y revertir su inyección en la app.. Status: done

#### S1.T3 — Modelar el estado de previsualización (draft) de Ajustes: mantiene los cambios sin aplicarlos y los descarta al salir; Aplicar persiste y publica el estado activo (DEC-102).
Contrato: rollback: Eliminar el draft y dejar la pantalla sin previsualización.. Status: done

#### S1.T4 — Tests unitarios: combinación de la preferencia local con la del SO, persistencia y relectura por dispositivo, default ante clave desconocida y descarte de la previsualización al salir sin aplicar.
Contrato: rollback: Eliminar test/core/preferences/ y sus fixtures.. Status: done

#### S2.T1 — Construir la pantalla Ajustes reachable desde el pie del menú (HU-01-08), a pantalla completa, con apariencia clara fija sin selector (DEC-102) y los tres controles enlazados al estado de previsualización.
Contrato: rollback: Retirar la pantalla y su ruta del pie del menú; el shell vuelve a su estado anterior.. Status: pending

#### S2.T2 — Fondo de la familia Cuenta (v-27-cuenta.png) a pantalla completa con el resolvedor de imágenes de HU-01-10: cover con punto focal, opacidad 12-18 %, ≥65 % de zona tranquila y texto largo sobre superficie opaca (doc 43 §9, DEC-235).
Contrato: rollback: Quitar el fondo de familia de Ajustes; la pantalla vuelve a superficie plana.. Status: pending

#### S2.T3 — Controles accesibles de Ajustes: estado anunciado (on/off) al lector de pantalla y escala de texto al 200 % sin cortes en teléfono y tablet.
Contrato: rollback: Revertir los semánticos y el ajuste de layout de los controles.. Status: pending

#### S2.T4 — Widget tests de Ajustes (previsualización sin aplicar, descarte al salir, controles anunciados) y goldens del preview en teléfono y tablet para la comparación con la maqueta consolidada (QA-01-17-05).
Contrato: rollback: Eliminar test/settings/ y los goldens generados.. Status: pending

#### S3.T1 — Aplicar Reducir movimiento en toda la app combinado con el SO: navegación, menú, tablero, overlays y fondos sin desplazamientos, solo fundidos de hasta 120 ms o cambios inmediatos (consume el servicio de HU-01-07).
Contrato: rollback: Desactivar la preferencia y recuperar las transiciones previas.. Status: pending

#### S3.T2 — La splash siguiente usa lo guardado y respeta Reducir movimiento (sin desplazamientos; fundido de hasta 120 ms o inmediato).
Contrato: rollback: Revertir la splash a su animación previa.. Status: pending

#### S3.T3 — Lectura ampliada: las fichas del método usan un tamaño de texto mayor y un espaciado de lectura más amplio; el resto de las superficies sigue el tamaño de texto del dispositivo (DEC-233 punto 2).
Contrato: rollback: Revertir el estilo de las fichas del método al tamaño base.. Status: pending

#### S3.T4 — Widget y golden tests: navegación y splash sin desplazamiento con Reducir movimiento aplicado (QA-01-17-01, QA-01-17-02) y ficha del método con Lectura ampliada (QA-01-17-04).
Contrato: rollback: Eliminar los tests y goldens nuevos.. Status: pending

#### S4.T1 — Integrar el juego de tokens semánticos de contraste aumentado (entregable de Diseño en tokens.v1.json, DEC-232) expuesto por el tema de HU-01-01 sin transparencias tenues, y aplicarlo en todas las plantillas y vistas.
Contrato: rollback: Revertir tokens.v1.json junto con sus archivos generados para evitar una paleta parcialmente aplicada y desactivar la preferencia.. Status: pending

#### S4.T1.1 — Cablear los tokens semánticos de contraste aumentado en tokens.v1.json y en el tema (app_theme) sin transparencias tenues.
Contrato: rollback: Revertir el generado de tokens y el tema.. Status: pending

#### S4.T1.2 — Aplicar el juego de contraste aumentado en todas las plantillas, paneles y modales y auditar que ninguna acción quede oculta ni recortada.
Contrato: rollback: Revertir la aplicación del juego en las vistas.. Status: pending

#### S4.T2 — Actualización en vivo: con panel persistente en tablet, aplicar un ajuste actualiza el panel y el contenido sin reiniciar la app.
Contrato: rollback: Revertir la propagación de cambios de preferencias al shell.. Status: pending

#### S4.T2.1 — Exponer las preferencias activas como estado observable (notificador/listenable) que los consumidores puedan escuchar, para que aplicar un ajuste emita el cambio sin reiniciar la app.
Contrato: rollback: Revertir el notificador de preferencias y sus puntos de emisión.. Status: pending

#### S4.T2.2 — Sincronizar la splash/arranque y el estado observable de preferencias para que la splash siguiente lea lo guardado (reduceMotion) sin reiniciar.
Contrato: rollback: Revertir la lectura de preferencias en el arranque y dejar la splash con su estado previo.. Status: pending

#### S4.T2.3 — Conectar el shell y el panel persistente de tablet al estado observable de preferencias para reconstruir el panel y el contenido al aplicar un ajuste, sin reiniciar.
Contrato: rollback: Revertir la suscripción del shell y del panel al estado de preferencias.. Status: pending

#### S4.T2.4 — Widget test: con panel persistente en tablet, aplicar un ajuste actualiza el panel y el contenido sin reiniciar la app.
Contrato: rollback: Eliminar el test de actualización en vivo del panel.. Status: pending

#### S4.T3 — Goldens de plantillas con contraste aumentado (regresión de la vista), utilidad de contraste de HU-01-15 sobre las plantillas y verificación de actualización en vivo del panel en tablet.
Contrato: rollback: Eliminar los goldens y tests nuevos.. Status: pending

#### S4.T3.1 — Generar los goldens de las plantillas con contraste aumentado aplicado para fijar la regresión visual de la vista.
Contrato: rollback: Eliminar los goldens de contraste generados.. Status: pending

#### S4.T3.2 — Correr la utilidad de contraste de HU-01-15 sobre todas las plantillas y adjuntar la evidencia de que ninguna acción queda oculta ni recortada (QA-01-17-03).
Contrato: rollback: Quitar la verificación de contraste y su evidencia.. Status: pending

#### S4.T3.3 — Verificación en vivo: con panel persistente en tablet, aplicar un ajuste actualiza el panel y el contenido sin reiniciar la app.
Contrato: rollback: Eliminar la verificación de actualización en vivo del panel.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: Ajustes es la pantalla destino del pie del menú, a pantalla completa, con apariencia clara fija (sin selector de tema) y los tres controles: Reducir movimiento, Contraste aumentado y Legibilidad (lectura ampliada).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: El fondo de la familia Cuenta (v-27-cuenta.png) ocupa la pantalla completa detrás del contenido: cover con punto focal, opacidad visual de 12 a 18 %, al menos 65 % de zona tranquila y texto largo sobre superficie opaca (doc 43 §9, DEC-235).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: Los tests unitarios de preferencias pasan: preferencia_local guarda, lee y descarta con claves versionadas, combina con el SO y cae al default ante clave desconocida.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: Ajustes se ve y se revisa en teléfono y tablet: pantalla completa con fondo de Cuenta, tres controles con estado anunciado y previsualización que no toca el resto de la app.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4

**Gate (auto)**: Al aplicar se ve en toda la app: navegación, menú, tablero y overlays sin desplazamiento, splash que respeta lo guardado y fichas del método con lectura ampliada; los goldens/widget tests pasan.

### Session 4 · T3 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T1.1
- [ ] S4.T1.2
- [ ] S4.T2
- [ ] S4.T2.1
- [ ] S4.T2.2
- [ ] S4.T2.3
- [ ] S4.T2.4
- [ ] S4.T3
- [ ] S4.T3.1
- [ ] S4.T3.2
- [ ] S4.T3.3

**Gate (auto)**: Con Contraste aumentado aplicado todas las plantillas usan el juego de mayor contraste sin acciones ocultas, y en tablet el panel y el contenido se actualizan sin reiniciar; los goldens de contraste y la utilidad de HU-01-15 pasan.

### Session 5 · T0 · open
