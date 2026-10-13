---
id: TV2-009-SPEC
project: tao-v2
ticket: TV2-009
status: approved
---

# B1-04: inicio de sesión web para Administrador y Productor, estado de cuenta verificado en cada petición, seed de perfiles de sistema, chequeo de CI de capacidades y CLI local de cuentas

## Resumen ejecutivo

Se agrega POST /auth/web/login. Acepta solo cuentas completas y activas cuyo perfil esté en una lista configurable (por defecto Administrador y Productor) y emite una sesión con superficie=web y el claim superficie. Una cuenta Estándar o suspendida recibe la misma respuesta que unas credenciales inválidas. El estado de la cuenta se lee de la base en cada petición, sin consultas nuevas porque se suma al select del middleware de capacidad, y también en el refresh, que devuelve cuenta_suspendida. Se agrega revocarSesionesDeCuenta. Los perfiles Estándar, Productor y Administrador pasan a un seed idempotente con ids ULID fijos y esSistema=true, y registro-dispositivo.ts deja de buscar el perfil por nombre. El chequeo de CI de capacidades cubre ahora las columnas Administrador y Productor. Una CLI crea ADM-1 y PRD-A, y solo corre en entorno local o de prueba.
NO incluye: la pantalla W03 para asignar el perfil Productor, el cierre remoto de sesiones (solo deja revocarSesionesDeCuenta como punto de extensión), el tratamiento de X-Plataforma: web en el middleware de versión ni nada de 21-extensiones-v1.
Cómo se sabe que funciona: las suites supertest verdes cubren Estándar rechazada, Administrador y Productor aceptados, cuenta suspendida rechazada, refresh web, token web rechazado en una ruta de dispositivo y un token emitido antes de la suspensión que se rechaza con reloj controlado. Además, el seed corrido dos veces deja 3 filas, la CLI se niega a correr con un APP_ENV que no sea local ni de prueba, y ci-checks falla si se quita del seed una capacidad de Administrador o Productor.
Tamaño: 3 sesiones T2 y 8 tareas de primer nivel.
Advertencias fuera de alcance: el middleware de versión ignora X-Plataforma: web y no se cambia aquí (riesgo declarado en el request). Si algún consumidor compara nombres de perfil en otro punto además de registro-dispositivo.ts:225, se reporta y no se corrige.

Datos a confirmar antes de ejecutar:
1. Ruta exacta de registro-dispositivo.ts. El request cita la línea 225, pero no la carpeta (se supone server/src/auth/). Confirmar en el repo.
2. El runner de tests del server (vitest o jest) y la ubicación de las suites supertest (existe server/test/scope/casos.ts). Los comandos de verify suponen 'pnpm --dir server exec vitest run'.
3. Si la tabla de sesión ya guarda la superficie (o un campo equivalente) o si solo va en el claim del JWT. Si hace falta una columna, el cambio pasa a alter_additive y se declara antes de aprobar.
4. Si ya existen filas de perfil (al menos Estándar, por TV2-005 o TV2-006) con ids no deterministas. Si existen, el seed con ULID fijos implica un data_rewrite que la persona tiene que aprobar.
5. El nombre de la variable de entorno para la lista de perfiles permitidos en la web. Debe seguir la convención de .env.example:41.
6. El nombre y la forma de invocar la lista de seeds nombrados (donde viven catalogo-capacidades, configuracion-catalogo y politica-analitica).
7. Los valores de APP_ENV que cuentan como local o de prueba (.railway/railway.ts:29 declara APP_ENV).

## Requirements

### REQ-01 `confirmed`
> Fuente: server/contract/openapi.yaml (request); server/src/auth/ (request; consumido por server/test/scope/casos.ts:333)

POST /auth/web/login (iniciarSesionWeb) autentica por email y contraseña sin deviceCode. Solo acepta cuentas completas y activas con algún perfil de la lista configurable de perfiles web (por defecto Administrador y Productor). Emite una sesión con superficie=web y el claim superficie en el access token. A una cuenta Estándar, suspendida o con credenciales inválidas le devuelve la misma respuesta (status, código y cuerpo). La operación queda declarada en server/contract/openapi.yaml con sus x-errores y x-capacidad, como cambio compatible para openapi-diff. QUÉ: login web sin dispositivo. POR QUÉ: la web de administración y productor no se une a un dispositivo (D-09).

### REQ-02 `confirmed`
> Fuente: server/src/middleware/capacidad.ts (request); server/contract/openapi.yaml cuenta_suspendida (request)

El estado de la cuenta se verifica contra la base en cada petición (DEC-161). El middleware de capacidad suma 'estado' al select que ya hace, sin consultas nuevas, y rechaza una cuenta suspendida aunque su access token siga vigente (no espera los 15 minutos de DEC-232). El refresh comprueba el estado y responde cuenta_suspendida como declara el contrato. Se agrega revocarSesionesDeCuenta, que revoca todas las sesiones de la cuenta en ambas superficies. QUÉ: suspensión efectiva de inmediato. POR QUÉ: H-03. Hoy el refresh no aplica cuenta_suspendida y solo existe revocar por familia, por sesión y por dispositivo.

### REQ-03 `inferred`
> Fuente: server/src/middleware/capacidad.ts (request); docs/product/diseno-web/fuentes/10-tickets-h1-backend-cuenta.json:4

Un token con superficie=web no autoriza las operaciones que exigen dispositivo, y la web no tiene unión a dispositivo. QUÉ: separación de superficies. POR QUÉ: D-09.

### REQ-04 `confirmed`
> Fuente: server/src/capacidades/ (request); registro-dispositivo.ts:225 (request; carpeta a confirmar)

Un seed idempotente crea los perfiles Estándar, Productor y Administrador como filas de perfil con esSistema=true e ids ULID deterministas (D-06), que se publican en la documentación. El seed queda registrado en la lista de seeds nombrados junto a catalogo-capacidades, configuracion-catalogo y politica-analitica. La lógica de negocio resuelve el perfil por id o capacidad, nunca por nombre: registro-dispositivo.ts:225 deja de buscar el perfil por nombre.

### REQ-05 `confirmed`
> Fuente: server/src/capacidades/ci-checks.ts (request); docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md (request)

server/src/capacidades/ci-checks.ts, que hoy solo valida la columna E, valida también las columnas Administrador y Productor de docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md contra las capacidades asignadas a esos perfiles en el seed. Falla si falta alguna.

### REQ-06 `confirmed`
> Fuente: server/scripts/ (request); .railway/railway.ts:29 (APP_ENV)

Una CLI en server/scripts/ crea una cuenta completa con correo verificado, credencial_password y cuenta_perfil para el perfil indicado con --perfil administrador o --perfil productor. Sirve para crear el primer administrador y cuentas Productor locales sin dispositivo. Solo corre en entorno local o de prueba y no imprime la contraseña completa.

### REQ-07 `inferred` `enforcement`
> Fuente: server/src/auth/ (request); server/contract/openapi.yaml x-capacidad (request)

Restricciones de reuso y seguridad. La sesión web reutiliza el mecanismo existente de sesiones, familias de refresh y revocación de server/src/auth/, sin un segundo almacén ni un emisor de tokens paralelo. Las autorizaciones nuevas usan x-capacidad del contrato. Ningún log, reporte ni salida de la CLI o de los tests escribe contraseñas, tokens, OTP ni códigos completos.
## Tasks

#### S1.T1 — Implementar iniciarSesionWeb y declarar POST /auth/web/login en el contrato.
Contrato: rollback: Revertir los commits de la sesión en server/contract/openapi.yaml, server/src/auth/ y la variable de configuración de perfiles web en .env.example.. Status: pending

#### S1.T1.1 — Agregar en server/contract/openapi.yaml la operación POST /auth/web/login (email y password, sin deviceCode) con su respuesta de tokens, x-capacidad y x-errores (credenciales inválidas única y límites de B1-03), como cambio compatible para openapi-diff.
Contrato: rollback: Revertir el bloque de la operación en server/contract/openapi.yaml.. Status: pending

#### S1.T1.2 — Implementar iniciarSesionWeb en server/src/auth/ reutilizando la emisión de sesión y la familia de refresh existentes. Verifica credencial_password, cuenta completa, estado activo y pertenencia a la lista configurable de perfiles web (variable de entorno nueva, documentada en .env.example junto a la línea 41). Emite superficie=web en la sesión y en el claim. Cada rechazo usa la misma respuesta de credenciales inválidas.
Contrato: rollback: Eliminar iniciarSesionWeb, su ruta y la variable de configuración. La auth de dispositivo no cambia.. Status: pending

#### S1.T2 — Seed idempotente de perfiles de sistema. Crea Estándar, Productor y Administrador con esSistema=true, ULID fijos (D-06) y sus capacidades según docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md, usa upsert por id y queda registrado en la lista de seeds nombrados junto a catalogo-capacidades, configuracion-catalogo y politica-analitica. Reemplazar la búsqueda por nombre de registro-dispositivo.ts:225 por el ULID fijo del perfil Estándar. Publicar los 3 ULID en la documentación del catálogo.
Contrato: rollback: Quitar el seed de la lista de seeds nombrados, devolver registro-dispositivo.ts:225 a la búsqueda anterior y revertir la sección de ULID en la documentación.. Status: pending

#### S1.T3 — Tests de la sesión: suites supertest con datos de R09 (USR-A, USR-SUS, ADM-1, PRD-A, con contraseñas generadas en el fixture). Cubren los casos de REQ-01 (aceptados, rechazos indistinguibles, lista configurable), el seed idempotente de REQ-04 (dos corridas, 3 filas, ids fijos) y la regresión de POST /devices con el perfil Estándar por id. Sin dobles que siempre devuelven éxito.
Contrato: rollback: Eliminar server/test/auth/login-web.test.ts y server/test/capacidades/seed-perfiles.test.ts.. Status: pending

#### S2.T1 — Estado de cuenta efectivo en cada petición y separación de superficies.
Contrato: rollback: Revertir los cambios en server/src/middleware/capacidad.ts y server/src/auth/. Las funciones de revocación por familia, por sesión y por dispositivo quedan como estaban.. Status: pending

#### S2.T1.1 — Agregar 'estado' al select existente de server/src/middleware/capacidad.ts y rechazar una cuenta no activa con el error que declara el contrato, sin agregar consultas (DEC-161, no se espera la ventana de 15 minutos de DEC-232).
Contrato: rollback: Quitar el campo del select y la rama de rechazo.. Status: pending

#### S2.T1.2 — En el refresh de server/src/auth/, leer el estado de la cuenta y responder cuenta_suspendida (ya declarado en el contrato) sin emitir tokens.
Contrato: rollback: Revertir la verificación de estado en el handler de refresh.. Status: pending

#### S2.T1.3 — Agregar revocarSesionesDeCuenta en server/src/auth/ junto a las revocaciones por familia, por sesión y por dispositivo. Revoca todas las sesiones de la cuenta en las dos superficies con una sola actualización filtrada por cuenta (acotada, sin recorrer las sesiones una por una).
Contrato: rollback: Eliminar la función. No tiene consumidores fuera de este ticket.. Status: pending

#### S2.T1.4 — Hacer que la autorización de operaciones que exigen dispositivo rechace los tokens con claim superficie=web.
Contrato: rollback: Revertir la condición sobre el claim superficie en el middleware.. Status: pending

#### S2.T2 — Tests de la sesión: suite supertest con reloj controlado. Cubre el token emitido antes de suspender, el refresh web activo y suspendido, revocarSesionesDeCuenta sobre una sesión web y una de dispositivo, el conteo de consultas del middleware sin cambios, el token web en una operación de dispositivo y la regresión del token de dispositivo de USR-A.
Contrato: rollback: Eliminar server/test/auth/estado-efectivo.test.ts.. Status: pending

#### S3.T1 — Extender server/src/capacidades/ci-checks.ts, que hoy solo valida la columna E, para que lea también las columnas Administrador y Productor de docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md y las compare con las capacidades que el seed asigna a esos perfiles. Ante una falta, el mensaje nombra la capacidad y la columna.
Contrato: rollback: Revertir server/src/capacidades/ci-checks.ts a la validación de la columna E sola.. Status: pending

#### S3.T2 — Crear en server/scripts/ la CLI de cuentas (--email, --perfil administrador|productor). Crea en una transacción la cuenta completa con correo verificado, credencial_password y cuenta_perfil con el ULID fijo del perfil. Aborta antes de abrir conexión si APP_ENV no es local ni de prueba y rechaza los perfiles fuera de esos dos. Genera la contraseña de prueba o la recibe por stdin y nunca la imprime completa.
Contrato: rollback: Eliminar el script de server/scripts/ y su entrada en server/package.json.. Status: pending

#### S3.T3 — Tests de la sesión: un test de ci-checks con fixtures de catálogo y seed (pasa con los reales y falla si falta una capacidad en Administrador o en Productor) y un test de la CLI (crea ADM-1 y PRD-A en local y ambos hacen login web con 200; con APP_ENV=staging sale con código distinto de 0 y sin filas; --perfil estandar se rechaza; la salida no contiene la contraseña).
Contrato: rollback: Eliminar server/test/capacidades/ci-checks-perfiles.test.ts y server/test/scripts/cli-cuentas.test.ts.. Status: pending
## Cambios al modelo de datos

- tipo: seed_rbac | objetos: perfil (filas Estándar, Productor, Administrador con esSistema=true e ids ULID fijos), asignación de capacidades a esos perfiles | destructivo: no | tarea: S1.T2 | rollback: Quitar el seed de la lista de seeds nombrados y borrar las 3 filas por sus ULID fijos en entornos sin cuentas que las referencien. En un entorno con cuenta_perfil que las usa no se borran y el seed vuelve a la versión anterior.

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- edit S1.T1.2 { desc="Implementar iniciarSesionWeb en server/src/auth/ reutilizando la emisión de sesión y la familia de refresh existentes. Verifica credencial_password, cuenta completa, estado activo y pertenencia a la lista configurable de perfiles web (variable de entorno nueva, documentada en .env.example junto a la línea 41). Emite superficie=web en la sesión y en el claim. Cada rechazo usa la misma respuesta de credenciales inválidas." }

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T1.1
- [ ] S1.T1.2
- [ ] S1.T2
- [ ] S1.T3

**Gate (auto)**: La suite supertest del login web pasa: ADM-1 y PRD-A reciben 200 con claim superficie=web, y USR-A, USR-SUS y una contraseña errónea reciben la misma respuesta. El seed corrido dos veces deja 3 perfiles con los ULID publicados.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T1.3
- [ ] S2.T1.4
- [ ] S2.T2

**Gate (auto)**: La suite de estado efectivo pasa: un token emitido antes de suspender se rechaza con reloj controlado antes de vencer, el refresh de una cuenta suspendida devuelve cuenta_suspendida, revocarSesionesDeCuenta revoca la sesión web y la de dispositivo, y un token web recibe un rechazo en una operación de dispositivo.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: La CLI crea ADM-1 y PRD-A en local y ambos inician sesión en la web. Con APP_ENV=staging la CLI sale con error sin escribir. ci-checks pasa con el seed real y falla si se quita una capacidad de Administrador o de Productor.

### Session 4 · T0 · open

