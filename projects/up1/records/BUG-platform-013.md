---
id: BUG-platform-013
project: up1
type: bug
module: platform
tags:
  - platform
  - cors
  - object-manager
  - x-app-id
  - upone-1057
---

# CORS preflight de object-manager NO whitelistea `X-App-ID` — bloquea requests del suite tras UPONE-1057

## Symptom

El navegador bloquea las requests del suite hacia el object-manager con error de CORS preflight (OPTIONS). En la UI se renderiza el mensaje "No se pudo conectar con el servidor". El log del object-manager NO muestra error porque la request muere en el preflight, antes del handler.

Aplica desde que el suite empezo a enviar el header `X-App-ID` en todas las requests Apollo (UPONE-1057). Sin el fix local en `object-manager/src/index.js:45`, el dev no puede levantar el stack de desarrollo.

## Expected behavior

El object-manager DEBE incluir `X-App-ID` en el array `allowedHeaders` de la configuracion CORS, junto al resto de headers custom ya whitelisteados (`X-Tenant-ID`, `X-Context-Path`, `X-Selected-Role`, `X-Internal-Service-Key`).

## Root cause

`up1/object-manager/src/index.js:45` declara los headers permitidos por CORS y omite `X-App-ID`. El header lo introduce el suite en `up1/suite/plugins/apollo.client.ts:124` como parte de UPONE-1057. El object-manager no se actualizo con el nuevo header → preflight rechaza la request → navegador no envia la query → suite reporta error generico.

- **File**: `up1/object-manager/src/index.js:45`
- **Cause**: array `allowedHeaders` desactualizado vs los headers que envia el suite

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | todos los devs del stack up1 (bloqueante de desarrollo local) |
| Data affected | ninguna (request nunca llega al backend) |
| Modules affected | object-manager (CORS), suite (consumer Apollo) |
| Frequency | siempre, en cualquier query/mutation desde suite con browser estricto en CORS |

En produccion el impacto depende de si el reverse-proxy/CDN agrega los headers permitidos antes de llegar al object-manager. En local con `origin: true` y browser default, el preflight falla 100% de las veces.

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev (local) |
| Browser/Client | Chrome / Firefox (cualquier moderno con CORS estricto) |
| Data conditions | suite en branch con UPONE-1057 ya integrado (env actual) |

### Steps
1. Levantar object-manager sin el fix local (`./up1-start.sh --om` con `index.js:45` original)
2. Levantar suite (`./up1-start.sh --suite`)
3. Navegar a cualquier listado/detalle en `localhost:3000`
4. **Observado**: UI muestra "No se pudo conectar con el servidor". DevTools network: preflight OPTIONS bloqueado, header no permitido `x-app-id`.

## Workaround

Editar localmente `up1/object-manager/src/index.js:45` y agregar `'X-App-ID'` al array `allowedHeaders`. NO commitear (decision B4 de TICKET-012: el archivo pertenece al core workspace, no al mod).

```js
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID', 'X-Context-Path', 'X-Selected-Role', 'X-Internal-Service-Key', 'X-App-ID'],
```

Comunicacion humana ya activa con el encargado de platform (decision N4: NO comentar Jira UPONE-1057, DKC funciona como tracker interno).

## Solution

Pendiente. Fix de 1 linea en `up1/object-manager/src/index.js:45`. Owner: equipo platform (no es del mod curriculum-design). Una vez aplicado upstream, los devs del mod pueden eliminar el override local.

## Related

- **Rules**: —
- **Decisions**: TICKET-012 decisions B4, N4
- **Specs**: —
- **Tickets**: TICKET-012 (Session 1, learn L1 promovido a este bug). UPONE-1057 (origen del header en suite)
