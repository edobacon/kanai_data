# Revisión F8: comportamiento final frente al análisis y al plan original

Fecha: 2026-10-02, al cerrar la documentación (F8). Contrasta lo que hace el código entregado en la línea normal
con lo que decían el análisis (`usuite-15425-niveles-de-solucion.md`,
`usuite-15425-plan-helper-ofuscacion-y-mapa-logger.md`) y el plan original (`plan-original.md`, copia congelada
que no se edita). La guía de uso vigente es `server/api/user-api/helpers/LOGGING.md`: ante cualquier diferencia,
vale la guía y este documento, no el plan original.

## En una frase

El diseño del plan se mantuvo: helper con cuatro estrategias, `authLog` como única función de log, catálogo en
código con `LOG_MASKING` opcional. Cambiaron detalles del catálogo y de las reglas, que se descubrieron al
implementar y al probar, y dos ejemplos de configuración del plan estaban mal.

## Cambios en el comportamiento

| Tema | Plan original o análisis | Comportamiento final | Por qué | Dónde se decidió |
|---|---|---|---|---|
| Regla de niveles | Tabla de ejemplos sin regla general | Proporcional al largo, con tope: `light` oculta un tercio (máximo 3), `medium` deja un tercio (máximo 2), `strong` deja 1 (0 en RUT y documento). Los ejemplos de la tabla del plan dan lo mismo | Una regla fija oculta casi todo en valores cortos | `decision-niveles-y-archivos-helper.md` |
| `tipo_documento` | El patrón `documento` lo tomaba como identificador | Excluido del catálogo `id`: queda visible (`CC`, `CE`) | Es un código, no un dato personal | `decision-niveles-y-archivos-helper.md` |
| Apellidos | El catálogo `text` tenía solo `sn` como apellido | Se suman `surname` (SAML), `familyname` y `lastname` (OIDC y perfiles) | El smoke de F7 mostró el apellido SAML completo con `text` en `light` | Hallazgo de F7, commits `97072e3` y `c87e1a4` |
| Detección en texto | El plan no definía a qué textos se aplica | Solo a textos cuyo campo no tiene estrategia por su nombre; dentro de un XML cada etiqueta se oculta según su nombre | Evitar doble ocultamiento y respetar el nivel de cada campo | `decision-deteccion-en-texto.md` |
| Helper | Un archivo `logSanitizer.js` | Tres archivos: `logMaskingConfig.js`, `logSanitizer.js` y `logTextDetection.js` | Límite de unas 400 líneas por archivo | `decision-niveles-y-archivos-helper.md` |
| Errores al navegador (uvmcl) | Respuestas con `error: err` | Solo mensaje y código; el error va a Sentry ya oculto | El error crudo podía llevar la clave | Decisiones de F4 (1A, 2A, 3A) |

## Ejemplos del plan original que no daban lo que decían

Verificado en `node:10.24.1-alpine3.11` el 2026-10-02 (hallazgo de F8). El código cumple la regla de
combinación; los ejemplos estaban mal. Corregidos en `LOGGING.md` y en el `@example` del JSDoc (commit `9164d41`).

| Ejemplo del plan | Qué decía | Qué hace | Forma correcta |
|---|---|---|---|
| `email: { exclude: ['upn'] }` | Deja visible el UPN | El UPN pasa a revisarse como texto y la detección de correos lo oculta igual (`a.*@x.cl`) | `exclude: ['upn']` global |
| `id: { add: ['ds_name'] }` (uvmcl) | `ds_name` se oculta como RUT | Queda también en `email` (catálogo base) y gana `email`: `18.456.78***` | `email: { exclude: ['ds_name'] }, id: { add: ['ds_name'] }` → `18.456.***-K` |

Regla que lo explica: si un campo queda en dos estrategias parciales, gana la de nivel más alto; con el mismo
nivel, la primera en el orden `email`, `id`, `text`.

## Datos que quedan visibles por defecto (decisión del dev, opción A)

Se documentan en `LOGGING.md` ("Lo que queda visible por defecto") con la configuración para ocultarlos, sin
cambiar el catálogo:

| Dato | Cómo ocultarlo | Limitación |
|---|---|---|
| `sessionIndex` de SAML | `block: { add: ['sessionindex'] }` | Con `text` no se oculta: su nivel por defecto es `none` |
| `PIDM` de uvmcl | `id: { add: ['pidm'] }` | |
| `nombre` en el cuerpo de errores de axios | `email: { add: ['nombre'] }` | |
| Usuario dentro de una URL | `block: { add: ['url'] }` | Oculta la URL completa |
| Documento sin formato de RUT dentro de un texto | No hay opción | `textDetection.id` solo reconoce RUT con formato |

Descartadas: B, ocultarlos por defecto (cambiar catálogo y tests y repetir F7); C, no documentarlos.

## Cambios en la verificación

| Tema | Plan original | Final | Por qué |
|---|---|---|---|
| Línea base de la suite existente | 15 tests, 14 passing, 1 failing "por datos de suite_dev" | 16 propios sin fallos (58 con los 42 del helper) | El fallo no era de datos: ISO-636 (`b25c8d6`, 2025-03-06) exige `id` cifrado e `iv` en `getUsrDetails` y el test mandaba `id: 1`. Test actualizado en F8.0 (`2d1283b`) sin copiar la clave |
| Chequeo de sintaxis (F7.2) | `node --check` de todos los archivos modificados | `node --check` para CommonJS; los 4 archivos con `import` se transpilan con el `babel-core` del proyecto y se compilan en Node 10 | `node --check` no acepta `import`; en producción los transpila `babel-core/register` |
| Smoke (F7.3) | Sin script definido | Script `smoke-f7.js` fuera del repo, contenido en `smoke-f7.md`, con conteo automático de claves ficticias | Repetible en F10 |
| Suite existente local | Correr con la base de pruebas | Además: inyección de gulp (`inject:router inject:helper` con Node 10) y `FAKE_PASSWORD` comentado | Sin inyección las rutas dan 404; con `FAKE_PASSWORD` el login de prueba da 401 (`ambiente-local.md`) |

## Hallazgos de seguridad fuera del ticket (para avisar al lead)

No se tocaron; quedan registrados como preexistentes en F8:

- `user-api/services.js:263`: la clave del cifrado de ids de ISO-636 está escrita en el código
  (`clientName` más un texto fijo). El backend solo descifra: quien cifra el id (presumiblemente el frontend)
  también la tiene; no se verificó en el repo del frontend.
- `sandbox-api/server/config/local.env.sample.backend.js:87`: `CLIENT_SECRET` de Power BI activo, junto con
  `CLIENTID` y `TENANTID` de Azure.
- `sandbox-api/server/config/local.env.sample.backend.js:147`: `CLIENT_SECRET` de Keycloak de desarrollo en un
  ejemplo comentado.

Si están vigentes, corresponde rotarlos y reemplazarlos por marcadores.
