---
id: RULE-platform-029
project: up1
type: rule
module: platform
tags:
  - flow
  - n8n
  - license
  - security
  - tenant
---

# En flow, `createLicenseMiddleware` no bloquea nada: el 403 esta comentado y las quotas se fuerzan a ilimitadas

## What

En el fork de n8n que corre como `flow`, el middleware `createLicenseMiddleware` (`controller.registry.ts`) ya no rechaza requests sin licencia: el `return res.status(403)...` que cortaba la cadena esta **comentado**, asi que el `next()` corre siempre, con o sin feature licenciada. En paralelo, `LicenseState.getValue()` fuerza cualquier feature `quota:*` a `UNLIMITED_LICENSE_QUOTA`, y la creacion de team projects hace lo mismo de forma local en vez de leer el limite real de la licencia.

Hay una segunda capa, y es la que importa para cualquier intento de remediacion:
`License.isLicensed()` devuelve `true` para **toda** `BooleanLicenseFeature`, con la
unica excepcion del flag negativo `feat:apiDisabled`. O sea, el chequeo en si mismo
siempre aprueba. Consecuencia practica: **descomentar el 403 no restaura el
enforcement**, porque la condicion `if (!this.license.isLicensed(feature))` nunca
se cumple. Son dos cambios independientes que hay que revertir juntos si algun dia
se quiere volver a un gate real.

No asumir que existe un gate de licencia funcionando en flow, y no reactivar
ninguna de las dos capas sin antes revisar la resolucion de tenant por Project (ver
`[[DECISION-029]]`): el tenant de un flow se resuelve leyendo el Project de n8n que
lo posee, mecanismo que se desbloqueo justamente aprovechando esta ausencia de
enforcement.

## Why

El alcance de esto es mayor al de "Team Projects" (el motivo original del cambio, UPONE-1568): **cualquier** `BooleanLicenseFeature` gateada por `createLicenseMiddleware` pasa sin chequeo, no solo la que habilito el ticket. El propio codigo documenta el porque: el comentario en `license.ts` dice literalmente "Single place to unlock licensing: report every quota limit as unlimited [...] enables all enterprise features (including team Projects) without a license." Es una decision de producto deliberada (correr el fork sin licencia comercial), pero su superficie no esta acotada a un solo feature y no hay un listado exhaustivo de que endpoints quedan sin gate.

## Where

- `flow/packages/cli/src/controller.registry.ts:213-215` (`createLicenseMiddleware`: `if (!this.license.isLicensed(feature)) { //res.status(403)...; //return; }`, ambas lineas de corte comentadas, verificado)
- `flow/packages/cli/src/license.ts:254-259` (`isLicensed()`: `// UP1: All enterprise features unlocked` y `return true` para todo salvo `feat:apiDisabled`, verificado)
- `flow/packages/cli/src/license.ts:384-393` (`getValue`, fuerza `quota:*` a `UNLIMITED_LICENSE_QUOTA`)
- `flow/packages/cli/src/services/project.service.ee.ts:225-231` (`createTeamProjectWithEntityManager`, fuerza `limit = UNLIMITED_LICENSE_QUOTA` en vez de leer `licenseState.getMaxTeamProjects()`)

## When

Antes de tocar cualquier codigo de licenciamiento en flow (`license.ts`, `controller.registry.ts`, `project.service.ee.ts`), o antes de asumir que una feature enterprise de n8n esta protegida en este fork. Revisar en cada sync con n8n upstream si estos tres puntos siguen intervenidos de la misma forma (el fork acumula drift respecto al core de n8n en esta zona).
