---
id: TAO-167-SPEC
project: taomangalam
ticket: TAO-167
status: approved
---

# HU-00-19 · Dev Container opcional y panel interno de desarrollo compilado solo en development

## Resumen ejecutivo

Se entregan dos capacidades independientes: (1) un Dev Container opcional para servidor y contrato (Node de `.nvmrc`, pnpm de `packageManager`, `server/` con su lockfile, `pnpm generate` sin diff y pruebas del backend contra el PostgreSQL de `compose.yaml`, sin tokens/IDs Apple/rutas absolutas y con los límites iOS documentados en `docs/development/setup.md`); y (2) un panel interno de diagnóstico compilado solo en el sabor `development` que muestra sabor, endpoint, versión, conectividad y salud de `GET /health/ready` con el `requestId` de la última falla, espacios reservados para sync/outbox/reloj/contenido, adaptadores para simular sin conexión y errores de red, y redacción de tokens/OTP/rutas privadas, sin existir en `staging` ni `production`. Se confirma abriendo el repo en VS Code Dev Containers (generate sin diff + pruebas verdes) y abriendo el panel en `development` (backend caído -> 'no disponible' sin bloquear; 'sin conexión' -> la petición no llega al servidor). NO se hace: datos de sync/outbox/versión de contenido (EP-06/EP-09/EP-02), selección de usuarios seed/escenarios (EP-03a), config de Android Studio/IntelliJ, ni ninguna herramienta de desarrollo en producción. Advertencia de alcance: `pnpm generate` incluye el codegen del cliente Dart (build_runner), por lo que el contenedor necesita además el toolchain de Dart/FVM; conviene confirmar si las pruebas del backend corren dentro del contenedor o contra el postgres del host. Tamaño estimado: 3 sesiones (≈5 puntos); no excede el techo de entrada.

## Requirements

### REQ-01 `confirmed`
> Fuente: docs/product/tecnologia/18_experiencia_de_desarrollo_y_qa_humana.md:311

Un Dev Container opcional deja el repo listo para trabajar en servidor y contrato: fija Node de `.nvmrc` (24.21.0) y pnpm de `packageManager` (10.33.0), instala `server/` con su lockfile, ejecuta `pnpm generate` sin diff y las pruebas del backend contra el PostgreSQL de `compose.yaml`.

### REQ-02 `confirmed`
> Fuente: docs/product/tecnologia/18_experiencia_de_desarrollo_y_qa_humana.md:90

El Dev Container no contiene tokens, IDs de equipos Apple ni rutas absolutas, y `docs/development/setup.md` documenta lo que no reemplaza: Simulator, Xcode, firma y depuración iOS requieren el host macOS.

### REQ-03 `confirmed`
> Fuente: app/lib/core/config/app_config_provider.dart:1

La app en sabor `development` incluye un panel interno que muestra sabor, endpoint, versión de la app, conectividad, el resultado de `GET /health/ready` y el `requestId` de la última petición fallida, con espacios reservados para sync, outbox, reloj y versión del contenido (sin datos aún).

### REQ-04 `inferred`
> Fuente: app/lib/core/config/app_config.dart:1

El panel ofrece adaptadores de desarrollo para simular sin conexión y errores de red; con la simulación activa, la petición al backend devuelve el error simulado sin llamar al servidor.

### REQ-05 `confirmed`
> Fuente: server/src/redaccion.ts:1

Todo lo que muestra el panel redacta tokens, OTP y rutas privadas (marcador en lugar del valor crudo), incluyendo objetos y claves anidadas.

### REQ-06 `confirmed`
> Fuente: app/lib/core/config/app_flavor.dart:1

El panel y sus adaptadores se excluyen físicamente por sabor: en builds de `staging` y `production` el código no está presente y no hay forma de abrirlo (DEC-192).

### REQ-07 `confirmed` `enforcement`
> Fuente: server/contract/generated/dart/lib/src/api/plataforma_api.dart:197

El panel reutiliza la configuración tipada existente (`AppConfig`/`appConfigProvider`) y el cliente Dart generado del contrato (`PlataformaApi.saludListo`/`saludVivo`) en vez de introducir endpoints, literales o clientes HTTP paralelos.

### REQ-08 `confirmed` `enforcement`
> Fuente: app/lib/design_system/atoms/tao_badge.dart:1

El panel usa los componentes estándar del design system existente y respeta el estándar de accesibilidad/responsive: se ve en teléfono y tablet sin cortes.
## Tasks

#### S1.T1 — Crear `.devcontainer/` (devcontainer.json + Dockerfile o compose) que fije Node de `.nvmrc` (24.21.0) y pnpm de `packageManager` (10.33.0), instale `server/` con su lockfile (`pnpm -C server install --frozen-lockfile`) y permita `pnpm generate` (sin diff) y `pnpm -C server test` contra el PostgreSQL de `compose.yaml`.
Contrato: rollback: Eliminar el directorio `.devcontainer/`; no toca código de la app ni del servidor.. Status: done

#### S1.T2 — Documentar en `docs/development/setup.md` cómo abrir el Dev Container y qué NO reemplaza: Simulator, Xcode, firma y depuración iOS requieren el host macOS.
Contrato: rollback: Revertir la sección agregada a `docs/development/setup.md`.. Status: done

#### S1.T3 — Agregar una guarda/test que verifique que `.devcontainer/` no contiene tokens, IDs de equipos Apple ni rutas absolutas, y que su configuración referencia `.nvmrc` y `packageManager`.
Contrato: rollback: Remover la guarda/test agregada.. Status: done

#### S2.T1 — Capa de datos del panel: provider del cliente Dart generado del contrato (`PlataformaApi`) usando `AppConfig.apiBaseUrl`, y sonda de salud que consulta `GET /health/ready` capturando el estado y el `X-Request-Id` de la última petición fallida.
Contrato: rollback: Remover la capa de datos del panel; la app vuelve a su estado sin consumo HTTP.. Status: pending

#### S2.T2 — Pantalla del panel (solo development) con sabor, endpoint, versión de la app (package_info_plus), conectividad (connectivity_plus), salud + `requestId`, espacios reservados para sync/outbox/reloj/versión del contenido, y redacción de valores sensibles en todo lo mostrado.
Contrato: rollback: Remover la pantalla del panel y su punto de entrada en la app.. Status: pending

#### S2.T3 — Gate de compilación que incluye el panel y sus adaptadores solo en el sabor development y los excluye físicamente de staging/production (código ausente del binario y sin entrada accesible).
Contrato: rollback: Revertir el gate de compilación y la exclusión por sabor.. Status: pending

#### S2.T4 — Pruebas de widget del panel con sabor y salud simulados, verificación de redacción de valores sensibles y verificación de exclusión (staging/production no incluyen el panel).
Contrato: rollback: Remover las pruebas del panel agregadas.. Status: pending

#### S3.T1 — Adaptadores de desarrollo inyectables (cliente HTTP con modos 'sin conexión' y 'error de red') y sus toggles en el panel; con la simulación activa la petición falla sin llegar al servidor.
Contrato: rollback: Remover los adaptadores y sus toggles, restaurando el cliente HTTP real.. Status: pending

#### S3.T2 — Unitarias de los adaptadores: sin conexión no llama al servidor, error de red responde con el fallo configurado, apagar la simulación restaura las peticiones reales; más regresión de la suite de la app.
Contrato: rollback: Remover las pruebas de los adaptadores.. Status: pending
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por HU-00-19 · Dev Container opcional y panel interno de desarrollo compilado solo en development
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: Al abrir el repo en VS Code Dev Containers, `server/` queda instalado, `pnpm generate` no deja diff y `pnpm -C server test` pasa contra el PostgreSQL de `compose.yaml`; `.devcontainer/` no tiene secretos ni rutas absolutas y `docs/development/setup.md` explica que no reemplaza macOS.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: Con `pnpm dev` en sabor `development` se abre el panel y muestra sabor, endpoint, versión, conectividad y salud/`requestId` con valores sensibles redactados y espacios reservados; con el backend caído muestra 'no disponible' sin bloquear la app; un build de `staging`/`production` no incluye el panel ni su entrada.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2

**Gate (auto)**: En el panel, activar 'sin conexión' hace que la siguiente petición falle con el error simulado sin que el servidor reciba la llamada, y activar 'error de red' fuerza el estado de error configurado; apagar la simulación restaura las peticiones reales y las suites de la app siguen verdes.

### Session 4 · T0 · open
