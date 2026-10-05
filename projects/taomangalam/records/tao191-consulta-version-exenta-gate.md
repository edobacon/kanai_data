---
id: tao191-consulta-version-exenta-gate
project: taomangalam
type: decision
module: EP-03a
tags:
  - TAO-191
  - EP-03a
  - version
  - middleware
  - "426"
---

El middleware de versión mínima rechaza con 426 `version_minima` las peticiones de /v1 que traen `X-App-Version` y `X-Plataforma` de una compilación no soportada. **Excepción**: `GET`/`HEAD /v1/version` (obtenerVersionApp) queda exenta del rechazo incluso con esas cabeceras, para que la app pueda recuperar mensaje, notas y `urlTienda` después de recibir un 426.

Fuentes:
- TAO-184 (HU-01-18) lo exige en su alcance: «Ante el 426, la app pide `obtenerVersionApp` (exenta del gate) para obtener mensaje, notas y `urlTienda`».
- EP-01 `docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:2140` la declara expresamente exenta para recuperar los detalles tras el 426.

La consulta sin cabecera también responde 200 (QA-03a-09-02) y el resto de /v1 conserva el rechazo. La decisión resuelve la ambigüedad del criterio «cualquier petición a /v1» frente al flujo de recuperación de DEC-086.

Implementación: `server/src/middleware/app-version.ts`; evidencia: `server/src/app-release.integration.test.ts` (200 para /v1/version con build 18 y cabeceras) y las pruebas del middleware.
