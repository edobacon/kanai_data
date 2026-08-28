---
id: DECISION-029
project: up1
type: decision
module: flow
tags:
  - flow
  - n8n
  - multi-tenant
  - licencia
  - seguridad
---

# El tenant de un flow se resuelve por el Project de n8n que lo posee, y el fork corre sin enforcement de licencia

## Contexto

Hasta esta ventana, la resolucion de tenant en un flow dependia de un setting declarativo por workflow (`up1TenantId`) y de variables de entorno globales del proceso: fragil, porque un flow mal configurado o clonado sin ajustar el setting podia terminar operando bajo el tenant equivocado. Para introducir una resolucion estructural (el tenant se lee del Project de n8n dueño del workflow en tiempo de ejecucion), hubo que activar la feature enterprise "Team Projects" del fork de n8n, que esta gateada por licencia.

## Decision

Cada flow ahora vive dentro de un Project de n8n por tenant. `flowSync.js` resuelve o crea ese Project (matcheando `up1:tenant=<TENANT>` en su descripcion, o su nombre si es team project), acota los upserts de flow a ese Project, y migra los flows preexistentes hacia el. En runtime, `resolveTenantForProject` (`flow/packages/cli/src/workflow-execute-additional-data.ts:439-452`) resuelve el tenant leyendo el Project dueño del workflow, con `up1TenantId` como fallback. El contexto de ejecucion de nodos gana `getProjectId()`/`getTenantId()` (`flow/packages/core/src/execution-engine/node-execution-context/node-execution-context.ts:79-86`), y los nodos `Up1EventTrigger`/`Up1FormObject` priorizan esa resolucion sobre el setting declarativo o variables de entorno.

Para habilitar "Team Projects" sin licencia comercial, se forzaron tres puntos del nucleo de licenciamiento del fork:
- `flow/packages/cli/src/license.ts:386-393` (`getValue`): cualquier feature `quota:*` retorna `UNLIMITED_LICENSE_QUOTA` incondicionalmente.
- `flow/packages/cli/src/services/project.service.ee.ts:225-231`: la creacion de team projects usa `UNLIMITED_LICENSE_QUOTA` en vez de `licenseState.getMaxTeamProjects()`.
- `flow/packages/cli/src/controller.registry.ts:211-216` (`createLicenseMiddleware`): el bloqueo HTTP 403 cuando `isLicensed(feature)` es falso quedo comentado; el middleware ahora deja pasar cualquier request sin chequear la licencia.

## Alternativas descartadas

- **Mantener la resolucion solo por el setting declarativo `up1TenantId` mas variables de entorno globales del proceso**: es el mecanismo previo, que sigue existiendo como fallback. Se descarta como mecanismo principal porque depende de que cada flow tenga el setting bien configurado a mano, sin ninguna garantia estructural de aislamiento.

## Impacto y reversibilidad

Impacto de seguridad amplio y deliberado: `createLicenseMiddleware` no bloquea NINGUNA feature booleana gateada por el, no solo Team Projects. Cualquier feature enterprise de n8n que dependa de ese middleware queda sin enforcement de licencia de facto. Este es el costo de seguridad/licenciamiento que motiva `[[RULE-platform-029]]`: nadie debe reactivar el middleware asumiendo que protege algo hoy, ni asumir que una feature enterprise esta bloqueada solo porque existe el chequeo en el codigo.

Revertir estos tres puntos restauraria el enforcement de licencia de n8n, pero rompe Team Projects y con ello la resolucion de tenant estructural: los flows volverian a depender solo del setting declarativo. La reversion no es trivial porque los flows ya migrados a Projects tendrian que revalidarse contra el fallback. No se enumero exhaustivamente que otros endpoints usan `createLicenseMiddleware` mas alla de Team Projects; queda pendiente si se quiere el listado completo de superficie afectada.
