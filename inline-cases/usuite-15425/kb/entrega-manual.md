# Entrega manual de USUITE-15425 (fuera de la guía)

Decisión del dev del 2026-10-05: la F10 de la guía se cierra con los 4 PR abiertos. La QA, la revisión de `LOGGING.md` y los merges los sigue el dev por su cuenta y confirma en los logs del ambiente que los cambios se aplicaron. Este documento es la lista de control; se completa a mano.

## PR abiertos el 2026-10-05 (sin revisores)

| Línea | user-api | sandbox-api |
|---|---|---|
| normal → `develop` | https://bitbucket.org/uplanner/user-api/pull-requests/604 | https://bitbucket.org/uplanner/sandbox-api/pull-requests/327 |
| secure → `feature/secure-develop` | https://bitbucket.org/uplanner/user-api/pull-requests/605 | https://bitbucket.org/uplanner/sandbox-api/pull-requests/328 |

## Pendiente

1. Asignar revisores y pedir que otra persona revise `helpers/LOGGING.md` (el pedido no va en la descripción de los PR).
2. Merge de los 4 PR a `develop` y `feature/secure-develop`.
3. Despliegue en `uvmcl-retention-qa` (quien despliega informa fecha, ambiente y rama por repo; user-api se copia desde el EFS del ambiente al arrancar).
4. QA con el usuario de prueba de uvmcl (la clave no se escribe en ningún lado).
5. PR de `develop` a `master` y de `feature/secure-develop` a `feature/secure-master`, en los dos repos. Antes, revisar lo que suma cada base respecto de su master con `git --no-pager log --oneline origin/master..origin/develop` (sin pager: con pager el comando se corta). Ver "Antes del PR a master".
6. Después de los merges: publicar la página de Confluence (borrador en `confluence-logging-borrador.md`), con OK del texto final.

## Antes del PR a master (estado del 2026-10-05)

`develop` ya tiene commits de otros tickets que no están en `master` con el mismo SHA:

| Repo | Commits | Contenido |
|---|---|---|
| user-api | `6778950` (hotfix/USUITE-15389, PR #602), `4ccef64` y `51ee28c` (USUITE-15102, PR #600) | `develop` y `master` tienen el mismo contenido (`git diff` vacío): esos tickets llegaron a master con otros SHA. El PR los arrastra sin cambiar código |
| sandbox-api | `bfacbb0` (USUITE-12513, PR #322) | `master` tiene `/api/version` (PR #324 a #326, directo a master) que `develop` no tiene |

En sandbox-api, revisar el diff del PR `develop` → `master`: no debe quitar `/api/version` de `server/app.js` ni de `server/config/express.js`. La simulación del merge (`git merge-tree`) de la rama del ticket sobre `origin/master` no da conflictos y conserva `/api/version`.

## Casos de QA (línea normal, uvmcl)

Evidencia sugerida: `kubectl logs` filtrado por `clave|password|Login user response|OCULTO`.

| # | Caso | Esperado |
|---|---|---|
| Q1 | Login correcto | Entra normal; sesión completa (nombre, correo, rol, permisos). Caso crítico |
| Q2 | Log de Q1 | `[info]: Login user response` con fecha, `CLAVE: [OCULTO]`, correos e identificadores `light`, nombres y códigos completos |
| Q3 | Clave incorrecta | Mismo mensaje al usuario; log con resultado y sin la clave |
| Q4 | Login de estudiantes, correcto y fallido (si aplica) | Igual que antes; log sanitizado |
| Q5 | Ambiente sin `LOG_MASKING` | Funciona con defaults, sin errores ni avisos |
| Q6 | Con `LOG_MASKING` de prueba y reinicio | Cada estrategia con su nivel |
| Q7 | Con `loggerLevel: 'info'` | Logs de auth visibles; `silly` y `debug` no |
| Q8 | Error del WebService (simulado) | Mensaje de siempre; navegador sin error crudo; Sentry sanitizado si hay acceso |
| Q9 | Relevamiento de campos en QA | Ningún campo de `block` con valor visible |
| Q10 | Regresión | Navegar el módulo de retención y cerrar sesión sin errores nuevos |

## Línea secure

Q1 a Q3, Q5, Q8 y Q10, más el logout: las cookies se borran y no hay errores nuevos. El arranque local en las ramas -secure se verificó el 2026-10-05 (servidor arriba con todas las APIs montadas, sin errores nuevos); el login no se probó en local por falta de túnel a la base.

## Cambios visibles en Sentry (para avisar a quien mire los tableros)

- Un evento por falla (antes dos: `captureMessage` + `captureException`).
- Los rechazos de login (clave incorrecta, usuario fuera del sistema) pasan a `warn` y ya no llegan a Sentry; quedan en los logs.
- Ya no se usa `setTransactionName`: el texto `LOG_PLATAFORMA...` / `LOG_STUDENTS...` viaja en `extra.message`.

## Rollback

En cada repo y línea, PR con `git revert -m 1 <SHA del merge>` a `develop` o `feature/secure-develop` y, si ya llegó, a `master` o `feature/secure-master`; luego volver a desplegar la rama anterior. El cambio solo toca logs y no modifica datos.
