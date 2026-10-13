---
id: TV2-007-SPEC
project: tao-v2
ticket: TV2-007
status: approved
---

# B1-02: recuperación de contraseña por correo con código de un solo uso, TTL, límites y revocación de sesiones

## Resumen ejecutivo

Se agregan dos operaciones del contrato: la solicitud de recuperación y su confirmación. Reusan PropositoDesafio.recuperar_contrasena y el adaptador de correo que ya existe, y suman una plantilla de correo nueva (la cuarta). La confirmación cambia la contraseña con un código de un solo uso que caduca y tiene límites, y revoca las sesiones de la cuenta.
Queda fuera: la UI web y la app, cualquier cambio a las 3 plantillas actuales, MFA y todo lo diferido a v1 (21-extensiones-v1).
Cómo se sabe que funciona: una prueba de integración lee el correo desde Mailpit sin pasos manuales. Una cuenta existente y una inexistente reciben la misma respuesta HTTP y solo la existente recibe correo. Un código usado, vencido o que pasó el límite de intentos devuelve el x-error que declara el contrato. Las sesiones previas dejan de refrescar. Ninguna suite de integración queda omitida.
Tamaño: 2 sesiones T2, unos 5 a 7 h.
Advertencia: si el modelo de desafíos de TV2-005 no guarda los intentos ni la fecha de uso, hace falta una columna nueva (alter_additive). Eso exige replantear dataModelChanges antes de ejecutar. Hoy se declara [] porque se asume que la migración única del MVP ya la cubre.
Datos a confirmar antes de ejecutar:
- Rutas, nombres de operación y códigos x-errores de la solicitud y la confirmación de recuperación en el contrato OpenAPI de server/. Confirmar en el contrato del repo; no figuran en el contexto.
- TTL del código, máximo de intentos por código y límite de solicitudes por cuenta e IP. Confirmar en el contrato o en la ficha B1-02 del KB (carpeta mvp).
- Ubicación en server/ del módulo de desafíos que usa PropositoDesafio, del adaptador de correo (EMAIL_ADAPTER) y de las 3 plantillas actuales. Confirmar con grep en server/.
- Si el modelo de desafíos (TV2-005) ya guarda intentos y la fecha de uso del código. Confirmar en el schema de Prisma de server/.
- Runner de pruebas de server/ y filtro por nombre (los verify asumen vitest con -t). Confirmar en server/package.json.
- Endpoint de la API de Mailpit que expone el stack de backend:up (R02/R03). Confirmar en .devcontainer/start-services.sh y .env.example.

## Requirements

### REQ-01 `inferred`
> Fuente: tao-v2/docs/product/diseno-web/fuentes/10-tickets-h1-backend-cuenta.json:4

Callout. Qué: la operación de solicitud de recuperación recibe un correo y responde lo mismo exista o no la cuenta. Solo si la cuenta existe crea un desafío con PropositoDesafio.recuperar_contrasena y envía el código con una plantilla de correo nueva por el adaptador de correo configurado. Por qué: el request pide un flujo con plantilla nueva y una respuesta que no revele si existe la cuenta.

### REQ-02 `inferred`
> Fuente: tao-v2/.railway/railway.ts:34

Callout. Qué: la operación de confirmación recibe el correo, el código y la contraseña nueva. Si el código es válido, no vencido y no usado, cambia la contraseña, marca el código como usado y revoca todas las sesiones y refresh tokens de la cuenta. Por qué: el request pide un código de un solo uso, que caduque, y la revocación de sesiones según contrato.

### REQ-03 `inferred`
> Fuente: tao-v2/docs/product/diseno-web/fuentes/10-tickets-h1-backend-cuenta.json:4

Callout. Qué: la recuperación aplica los límites del contrato: un máximo de intentos fallidos por código, que lo invalida al agotarse, y un límite de solicitudes por cuenta en una ventana. Al pasarse, responde el x-error del contrato sin revelar si existe la cuenta. Por qué: el request exige que el código tenga límites y cubrir los x-errores de estas operaciones.

### REQ-04 `confirmed` `enforcement`
> Fuente: tao-v2/.railway/railway.ts:31

Callout. Qué: el flujo reusa el enum PropositoDesafio.recuperar_contrasena, el modelo de desafíos ya migrado y el adaptador de correo seleccionado por EMAIL_ADAPTER y EMAIL_FROM. No crea un mecanismo de códigos ni un cliente de correo paralelo. Ni los logs ni las respuestas incluyen códigos, tokens ni contraseñas completos. Por qué: el código y el contrato de despliegue ya los proveen, y el request prohíbe registrar secretos.

### REQ-05 `confirmed` `enforcement`
> Fuente: tao-v2/.devcontainer/start-services.sh:8

Callout. Qué: la aceptación se prueba con integración real contra Postgres y Mailpit del stack backend:up. Ninguna prueba de aceptación usa un doble de correo que siempre devuelve éxito, y la suite no cuenta como verde si queda omitida. Cada x-error que el contrato declara para las dos operaciones tiene su caso. Por qué: son los criterios de aceptación literales del request.
## Tasks

#### S1.T1 — Plantilla de correo nueva de recuperación de contraseña, la cuarta junto a las 3 que ya existen. Va en el mismo directorio y formato que las actuales y se envía por el adaptador de EMAIL_ADAPTER y EMAIL_FROM (railway.ts:31-32). Recibe el código y la caducidad; no cambia las otras plantillas.
Contrato: rollback: Borrar el archivo de la plantilla nueva y su registro en el catálogo de plantillas del adaptador.. Status: done

#### S1.T2 — Operación de solicitud de recuperación, con la ruta y el esquema que declare el contrato. Normaliza el correo y devuelve la misma respuesta exista o no la cuenta. Si existe, invalida el desafío de recuperación pendiente, crea uno nuevo con PropositoDesafio.recuperar_contrasena y el TTL del contrato, guarda solo el hash del código y envía la plantilla nueva. No registra el código en los logs.
Contrato: rollback: Revertir el handler y el registro de la ruta; el contrato vuelve a no tener la operación implementada.. Status: done

#### S1.T3 — Pruebas de integración de la solicitud contra Postgres y Mailpit del stack backend:up. Usan una cuenta existente y una inexistente del seed R09. Leen el mensaje desde la API de Mailpit con polling acotado (10 s como máximo), comparan las respuestas de las dos cuentas y corren la regresión de las 3 plantillas actuales. Sin dobles de correo y sin imprimir el código completo.
Contrato: rollback: Borrar el archivo de pruebas nuevo y los helpers de lectura de Mailpit que agregue.. Status: done

#### S2.T1 — Operación de confirmación con un código de un solo uso que cambia la contraseña y revoca las sesiones de la cuenta. La task padre no se ejecuta directamente.
Contrato: rollback: Revertir las subtasks en orden inverso.. Status: pending

#### S2.T1.1 — Validación del código en la confirmación: busca el desafío vigente de PropositoDesafio.recuperar_contrasena de la cuenta, compara el hash en tiempo constante, rechaza un código vencido (TTL) o ya usado con el x-error del contrato y lo marca como usado en la misma transacción que el cambio de contraseña.
Contrato: rollback: Revertir la función de validación y su uso en el handler de confirmación.. Status: pending

#### S2.T1.2 — Cambio de contraseña y revocación de sesiones: hashea la contraseña nueva con el mismo mecanismo que el alta y revoca todas las sesiones y refresh tokens vigentes de la cuenta (JWT_REFRESH_TTL_DAYS, railway.ts:34) con el servicio de sesiones que ya existe, en la misma transacción.
Contrato: rollback: Revertir la llamada de revocación y el cambio de contraseña en el handler.. Status: pending

#### S2.T2 — Límites de la recuperación según el contrato: un máximo de intentos fallidos por código que lo invalida al agotarse, y un límite de solicitudes por cuenta en una ventana, con conteo acotado a esa ventana. Al pasarse se responde el x-error del contrato con la misma forma para una cuenta existente o inexistente.
Contrato: rollback: Revertir el conteo de intentos y la verificación del límite de solicitudes en ambos handlers.. Status: pending

#### S2.T3 — Pruebas de integración de la confirmación y los límites contra Postgres y Mailpit. Cubren un código válido leído desde Mailpit, el login con la contraseña nueva y con la anterior, un refresh token previo rechazado, un código usado, un código vencido con reloj controlado, intentos agotados, el límite de solicitudes con una cuenta existente y una inexistente, y el reintento que invalida el código anterior. Agregan un caso por cada x-error declarado para las dos operaciones y comprueban que la salida del servidor no contenga el código ni la contraseña.
Contrato: rollback: Borrar el archivo de pruebas nuevo.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: La operación de solicitud responde igual con una cuenta existente y con una inexistente, y Mailpit muestra el correo con la plantilla nueva solo para la cuenta existente. La prueba de integración que lo lee desde Mailpit pasa.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: Con el código leído desde Mailpit, la confirmación cambia la contraseña y un refresh token anterior se rechaza. Un código usado, uno vencido, uno con intentos agotados y una solicitud de más devuelven cada uno su x-error del contrato. La suite de integración informa 0 omitidas.

### Session 3 · T0 · open
