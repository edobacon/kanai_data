---
id: TV2-008-SPEC
project: tao-v2
ticket: TV2-008
status: approved
---

# B1-03: protección HTTP con helmet y CSP estricta sin CORS, rate limit por IP y por cuenta según x-rate-limit del contrato, redacción de logs y certificación HTTP de 401/403/429, revocación y refresh concurrente

## Resumen ejecutivo

Se agrega al servidor (servicio server de Railway, rootDirectory server) helmet con CSP estricta (DEC-162) sin CORS (D-01). También un limitador nuevo por IP y por cuenta que aplica los valores x-rate-limit del contrato en las 8 operaciones activas y responde 429 con la forma de error del contrato, la redacción de secretos en logs y reportes y una suite de integración HTTP real que certifica 401, 403 y 429, la revocación, la rotación de sesión y el refresh concurrente según la política que ya fija el contrato.
NO se hace: inventar otra política de refresh, cambiar los valores de límite que fija el contrato, reemplazar el bloqueo por correo del login ni los topes por desafío existentes, habilitar CORS, ni nada de lo diferido a v1 (21-extensiones-v1). No hay cambios al modelo de datos: el servidor corre con 1 réplica (tao-v2/.railway/railway.ts:22), así que el contador del limitador vive en memoria del proceso.
Se sabe que funciona cuando la suite de integración, sin omisiones ni dobles que siempre devuelven éxito, muestra: cabeceras CSP en las respuestas y ninguna cabecera Access-Control-Allow-Origin, 429 al superar el límite declarado de cada operación activa, 401 con un token vencido o reutilizado, 403 con un rol sin permiso, un refresh revocado que no vuelve a servir y logs capturados sin contraseñas, tokens, OTP ni códigos completos.
Tamaño: 3 sesiones T2, 9 tareas.
ADVERTENCIA (fuera de alcance): las 4 operaciones con x-rate-limit que no están activas no se cablean. Si un adaptador posterior las activa, debe heredar el limitador.
ADVERTENCIA: si en el futuro el servicio sube a más de 1 réplica, el limitador en memoria deja de ser global y tendrá que pasar a un store compartido. Eso sería otro ticket.
Datos a confirmar antes de ejecutar: (1) el framework HTTP del servidor (Express u otro), si helmet ya figura en server/package.json y el archivo donde se arma la app; confirmarlo en server/. (2) La ruta del contrato OpenAPI y el valor x-rate-limit de cada una de las 8 operaciones activas (ventana, máximo y clave IP o cuenta); confirmarlo en el contrato del repo, la ficha del ticket en el KB mvp y la referencia histórica docs/archivo-v1/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:663. (3) Las directivas exactas de CSP de DEC-162; confirmarlas en docs/product/decisiones. (4) La política de refresh concurrente que declara el contrato (ventana de gracia o rechazo del segundo uso); confirmarla en el contrato. (5) El logger del servidor y el runner, la carpeta y el comando de los tests de integración (p. ej. un script del paquete server); confirmarlos en server/package.json, porque los comandos verify de abajo están dados en términos de pnpm run check hasta conocer el script por archivo. (6) El cuerpo y las cabeceras del 429 que declara x-errores para esas operaciones.

## Requirements

### REQ-01 `inferred`
> Fuente: request: Alcance (DEC-162, D-01); tao-v2/.railway/railway.ts:11

Qué: toda respuesta HTTP del servidor sale con las cabeceras de helmet y una Content-Security-Policy estricta según DEC-162, y el servidor no habilita CORS. Por qué: la web la sirve el mismo origen (D-01), así que permitir otros orígenes solo agrega superficie de ataque.

### REQ-02 `inferred`
> Fuente: request: Alcance (DEC-163, 8 operaciones activas); docs/archivo-v1/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:663; tao-v2/.railway/railway.ts:22

Qué: un limitador nuevo por IP y por cuenta aplica en las 8 operaciones activas (autenticarCuentaDispositivo, iniciarSesion, solicitarRecuperacion, verificarCodigoRecuperacion, reenviarCodigoCorreo, solicitarEliminacionCuenta, validarYUsarUnidad, consultarEstadoEliminacion) el valor x-rate-limit que declara el contrato, y al superarlo responde 429 con el cuerpo de x-errores del contrato. Por qué: hoy solo existen el bloqueo por correo en el login y los topes por desafío, y no hay límite por IP ni por cuenta (DEC-163). La ventana se mide con reloj inyectable y el contador es acotado: entradas con TTL igual a la ventana, sin crecer por filas.

### REQ-03 `inferred`
> Fuente: request: Criterios de aceptación (reportes sin secretos) y Verificación (nunca contraseñas, tokens, OTP ni códigos completos)

Qué: los logs del servidor y los reportes de verificación redactan contraseñas, el token de acceso enviado en el encabezado Authorization, el token de refresh, OTP y códigos completos. Por qué: el criterio de aceptación exige reportes sin secretos y el request prohíbe escribirlos en documentos o reportes.

### REQ-04 `inferred`
> Fuente: request: Criterios de aceptación; Datos y fixtures (tokens vencidos y reutilizados, refresh concurrente, rol sin permiso, reloj controlado)

Qué: una suite de integración HTTP real certifica la autenticación: 401 con token vencido o reutilizado, 403 con un rol sin permiso, revocación efectiva, rotación del refresh en cada uso y refresh concurrente resuelto con la política que ya declara el contrato, sin inventar otra. Por qué: es el criterio de aceptación literal del ticket.

### REQ-05 `inferred`
> Fuente: request: Criterios de aceptación (x-errores del contrato y suite de integración sin omitidos)

Qué: cada x-errores que declara el contrato para las operaciones de este ticket tiene un caso de integración que lo provoca y verifica estado y cuerpo, y la suite no cuenta como verde si algún caso de integración queda omitido. Por qué: lo exige el request para tickets de backend.

### REQ-06 `inferred` `enforcement`
> Fuente: request: Alcance ('hoy solo hay bloqueo por correo en login y topes por desafío'); Riesgos

Qué: el limitador nuevo se suma al bloqueo por correo del login y a los topes por desafío de B1-02 sin reemplazarlos ni duplicar su lógica, y los valores de límite se leen del contrato o de una constante única derivada de él, no de números sueltos. Por qué: reutilizar lo ya integrado y no inventar valores (riesgo del request).

### REQ-07 `confirmed` `enforcement`
> Fuente: request: Criterios de aceptación y Recursos y cuentas (dataset R09)

Qué: las pruebas usan reloj controlado, cuentas ficticias del seed (R09) y HTTP real; ninguna aceptación se apoya en un doble que siempre devuelve éxito, y una corrida que no se pudo hacer queda pendiente, no aprobada. Por qué: es la regla de verificación del request.
## Tasks

#### S1.T1 — Montar helmet en la app HTTP del servidor (paquete server/, servicio server de tao-v2/.railway/railway.ts:11) con la CSP de DEC-162 como constante única, y confirmar que no hay middleware CORS registrado (si existe, retirarlo: D-01 mismo origen). Antes, confirmar si helmet ya es dependencia en server/package.json para no duplicarla.
Contrato: rollback: Revertir el commit de la sesión: quitar el registro de helmet y la constante de CSP y, si se agregó, la dependencia de server/package.json y su lockfile.. Status: pending

#### S1.T2 — Configurar la redacción en el logger del servidor: rutas de campos password, contraseña, token, accessToken, refreshToken, código, otp y la cabecera authorization reemplazadas por un marcador fijo. Aplicar la misma lista al generador de reportes de verificación si escribe cuerpos o cabeceras.
Contrato: rollback: Revertir el commit: quitar la configuración de redacción del logger y del reporte.. Status: pending

#### S1.T3 — Escribir los tests de integración HTTP real de cabeceras (CSP, nosniff, ausencia de Access-Control-Allow-Origin con Origin ajeno y en preflight) y de redacción (log capturado de iniciarSesion y verificarCodigoRecuperacion sin los valores generados por el seed), con credenciales del seed y sin dobles de éxito.
Contrato: rollback: Borrar los archivos de test agregados en esta task.. Status: pending

#### S2.T1 — Construir el limitador por IP y por cuenta como middleware del servidor con reloj inyectable y contador en memoria acotado (entradas con TTL igual a la ventana; válido porque el servicio corre con 1 réplica, tao-v2/.railway/railway.ts:22). Los valores salen del x-rate-limit del contrato a una tabla única por operación, y la respuesta 429 usa el cuerpo de x-errores del contrato.
Contrato: rollback: Revertir el commit: borrar el módulo del limitador y su tabla de límites.. Status: pending

#### S2.T2 — Cablear el limitador en las 8 operaciones activas (autenticarCuentaDispositivo, iniciarSesion, solicitarRecuperacion, verificarCodigoRecuperacion, reenviarCodigoCorreo, solicitarEliminacionCuenta, validarYUsarUnidad, consultarEstadoEliminacion) por delante del bloqueo por correo y de los topes por desafío existentes, sin modificarlos.
Contrato: rollback: Revertir el commit: quitar el middleware de las 8 rutas; el bloqueo por correo y los topes por desafío quedan intactos.. Status: pending

#### S2.T3 — Escribir los tests de integración del limitador: caso parametrizado por las 8 operaciones (máximo aceptado, 429 en el siguiente, liberación al fin de la ventana con reloj controlado), aislamiento entre IPs, límite por cuenta desde IPs distintas y regresión del bloqueo por correo y de los topes por desafío de B1-02.
Contrato: rollback: Borrar los archivos de test agregados en esta task.. Status: pending

#### S3.T1 — Preparar los fixtures de certificación: reloj controlado para vencer el access token más allá de JWT_ACCESS_TTL_MINUTES (variable en tao-v2/.railway/railway.ts:33), cuenta del seed R09 con rol sin permiso, helper de sesión que obtiene access y refresh por HTTP real. Si falta un rol sin permiso en el seed, crearlo solo dentro del fixture de test, no en el seed de producción.
Contrato: rollback: Borrar los helpers y fixtures agregados en esta task.. Status: pending

#### S3.T2 — Escribir los tests de certificación de sesión: 401 con access vencido y con refresh reutilizado, 403 con rol sin permiso, revocación que invalida el access vigente, rotación del refresh y refresh concurrente con Promise.all verificado contra la política literal del contrato, sin implementar otra. Si un test revela que el servidor no cumple el contrato, se corrige la ruta afectada en esta misma task y se reporta.
Contrato: rollback: Borrar los tests agregados y revertir cualquier corrección de ruta hecha en esta task.. Status: pending

#### S3.T3 — Escribir la cobertura de x-errores: un caso por cada código que declara el contrato para las operaciones de este ticket (estado y cuerpo contra el esquema), y una guarda que hace fallar la corrida si la suite de integración tiene tests omitidos (skip o todo). Correr también la regresión de B1-01 y B1-02 con helmet y el limitador activos.
Contrato: rollback: Borrar los tests y la guarda de omitidos agregados en esta task.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-03 (edit) `inferred`: Qué: los logs del servidor y los reportes de verificación redactan contraseñas, el token de acceso enviado en el encabezado Authorization, e
- REQ-05 (edit) `inferred`: Qué: cada x-errores que declara el contrato para las operaciones de este ticket tiene un caso de integración que lo provoca y verifica estad

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3

**Gate (auto)**: curl -I a /health/ready del stack local muestra Content-Security-Policy de DEC-162 y ninguna cabecera Access-Control-Allow-Origin, y el test de redacción pasa con el log capturado sin secretos.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: La suite parametrizada muestra, para cada una de las 8 operaciones activas, 429 al superar el x-rate-limit del contrato y liberación al avanzar el reloj controlado.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: La suite de integración del backend corre con 0 omitidos y muestra en verde 401 (vencido y reutilizado), 403 (rol sin permiso), revocación efectiva, refresh concurrente según el contrato y cada x-errores de las operaciones del ticket; el reporte no contiene secretos.

### Session 4 · T0 · open

