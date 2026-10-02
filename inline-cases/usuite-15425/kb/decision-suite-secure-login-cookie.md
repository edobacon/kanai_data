# Decisión F9: la suite existente en la línea secure y el login con cookie

Decidido por el dev el 2026-10-02, al tomar la línea base de secure (F9.1). Opción A.

## Qué pasa

Las dos líneas autentican distinto:

| Línea | Dónde viaja el token (JWT) | Dónde lo lee el middleware |
|---|---|---|
| Normal (`develop`) | El login lo devuelve en la respuesta y el frontend lo manda en cada pedido en el encabezado `x-access-token` o `Authorization` | `server/config/express.js` de develop: `req.headers['x-access-token'] \|\| req.headers['authorization']` |
| Secure (USUITE-12513) | El login lo guarda en la cookie `httpOnly` `auth_token_<FRONT_BASE_URL>` (por ejemplo `user-api/authentication/auth.js:839`, `wsdlLogin`); el navegador la envía sola y ningún script de la página la puede leer | `server/config/express.js:100` de secure: solo `req.cookies['auth_token_' + FRONT_BASE_URL]`; el encabezado se ignora |

La suite existente (`server/test/index.test.js`, `user-api/test/rolesAndPermission.test.js` y
`user-api/test/userdetail.test.js`, de 2021) está escrita para la línea normal:

1. `POST /api/user-api` con el usuario de prueba: pasa y devuelve el token inicial.
2. `POST /api/user-api/validate` con el token en `x-access-token`: en secure responde **401 "authenticate token
   Failed"**, porque el middleware no encuentra la cookie.
3. Los 13 tests siguientes usan el token que debía salir del paso 2 y fallan todos con 401.

No es un defecto de la línea secure (funciona así a propósito) ni de este ticket: el test no conoce la
autenticación por cookie. Hoy la suite existente **no cubre la línea secure**. En la línea normal el mismo
problema no existe.

## Línea base de secure (F9.1, 2026-10-02)

Ramas `USUITE-15425-logs-auth-seguros-secure` en sandbox-api `7fd983d` y user-api `148c4af`, con la inyección de
gulp, `FAKE_PASSWORD` comentado y base `suite_dev` por el túnel 5500: **15 tests, 1 passing, 14 failing**
(`exit=14`), todos por el 401. El fallo de ISO-636 en `userdetail.test.js:14` queda tapado por el 401.

Ojo: una corrida sin la inyección de gulp da 0 passing y 15 failing (404 en el login). Esa corrida no es línea
base.

## Decisión: opción A

Se acepta esta línea base y la suite de secure se compara contra ella en F9.4 (criterio F9.c4).

Resultado esperado después del cherry-pick: 58 tests, 43 passing (1 de la suite y 42 del helper) y 15 failing,
todos por el mismo 401. El caso nuevo de `userdetail.test.js` (sin `iv`, de F8.0) también falla por esa causa.
Un fallo con **otra** causa es `introducido` y se corrige antes de cerrar F9.

La línea secure queda verificada, para lo que cambia este ticket, por:

- los tests del helper y del filtro de Sentry (46), que no dependen del login;
- el chequeo estático y la sintaxis Node 10 contra `origin/feature/secure-develop`;
- el smoke en tres escenarios (`smoke-f9-secure.md`);
- la QA de la línea secure en F10.4, que recorre el login real con cookie y el logout.

La suite existente solo prueba endpoints de usuarios y roles que este ticket no toca.

## Opción descartada: B (adaptar la suite a la cookie en este caso)

Habría sido:

- en `server/test/index.test.js` (sandbox-api), tomar la cookie `auth_token_...` del encabezado `Set-Cookie` de la
  respuesta del login y guardarla para toda la suite;
- en `rolesAndPermission.test.js` y `userdetail.test.js` (user-api), enviar esa cookie (encabezado `Cookie`) en
  cada pedido en vez de `x-access-token` (unos 15 pedidos en tres archivos y dos repos);
- dudas sin verificar: si el login que usa la suite en el ambiente de pruebas (según `LOGIN_INTEGRATION`) emite
  la cookie, y si sus marcas `secure` y `domain` obligan a enviarla a mano;
- esfuerzo estimado de 1 a 2 horas, con riesgo de más; commits solo en las ramas `-secure`, ajenos al ticket,
  con modificación de tests existentes y enmienda del plan.

Se descarta para no sumar al PR de secure un cambio ajeno al ticket y de esfuerzo incierto.

## Pendiente

**Ticket aparte**: adaptar la suite existente al login con cookie de la línea secure, para que cubra esa línea.
Incluye resolver las dos dudas de arriba. Responsable de proponerlo: dev del ticket, junto con el aviso al lead
(`borrador-aviso-lead-secretos.md`).
