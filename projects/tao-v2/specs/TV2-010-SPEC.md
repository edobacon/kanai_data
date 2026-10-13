---
id: TV2-010-SPEC
project: tao-v2
ticket: TV2-010
status: approved
---

# TV2-010 (B2-01): lectura legal con texto local y hash coherente, y registro de versiones sin URL de staging

## Resumen ejecutivo

Mejora el registro y la lectura legal que ya existen en server/src/legal. GET /v1/legal/documentos/{tipo}/{version} pasa a devolver el texto local de la versión pedida (el snapshot o, si no hay, el Markdown empaquetado en server/legal o docs/legal) junto con su versión y su hash. El texto solo se sirve si su SHA-256 coincide con hashContenido, y las versiones históricas se pueden recuperar. `pnpm -C server run legal:registrar` deja de exigir STAGING_BASE_URL: sin --base-url la versión se registra con urlPublicada nula. Con --base-url conserva el comportamiento actual, el que usa .github/workflows/deploy-staging.yml:196. No se tocan GET /legal/documentos (sigue sin texto), la página estática /legal/{tipo}/{version}, la aceptación, los pendientes, el esquema Prisma ni la app Flutter. Se verifica con vitest en server/src/test/legal/lectura.test.ts y registro-version.test.ts, usando un fixture de versión nueva con hash distinto, y con el runner scripts/ci/ep01-legal-provider.mjs actualizado.
ADVERTENCIAS (fuera del request, no son REQs): (1) la app Flutter hoy espera texto nulo y urlPublicada en el detalle (app/test/legal/puerto_revision_legal_test.dart:245). Recibir texto es aditivo y el contrato ya lo admite (openapi.yaml, DocumentoLegal.texto: 'Solo en el detalle por version'), pero que la app lo use corresponde a otro ticket. (2) Las operaciones legales de lectura no declaran x-errores en el contrato. Sus errores son 404 recurso_no_encontrado y 400 SolicitudInvalida, y el plan cubre el 404. (3) Para cambiar los títulos de tests listados en casosRequeridos de scripts/ci/ep01-legal-provider.mjs hace falta la aprobación del dev al aprobar este spec.
Datos a confirmar antes de ejecutar: (a) cuando la versión existe pero su texto local falta o no coincide con el hash, ¿el detalle responde 404 recurso_no_encontrado (la misma regla de obtenerPagina, server/src/legal/lectura.ts:205-209; es lo que propone el plan) o 200 con texto nulo? Se confirma con el PO al aprobar el spec. (b) Si el deploy de staging debe seguir pasando --base-url (el plan lo mantiene, compatible) o dejar urlPublicada nula también en staging. Se confirma en la ficha B2-01 del KB (carpeta mvp).

## Requirements

### REQ-01 `confirmed`
> Fuente: tao-v2/server/src/legal/lectura.ts:191

Callout. QUÉ: GET /v1/legal/documentos/{tipo}/{version} (obtenerDocumentoLegal) devuelve la versión registrada con su version, su hashContenido y su texto local. El texto sale de textoSnapshot o, si no hay, del Markdown `<tipo>-v<version>.md` del directorio legal empaquetado, y se entrega solo si calcularHashContenido(texto) === hashContenido. Cualquier versión registrada se puede recuperar, también una histórica que ya no está vigente. POR QUÉ: el criterio de aceptación pide 'versión, hash y texto coherentes y recupera versiones históricas; sin URL remota'. Hoy el detalle devuelve texto: null y obliga a abrir urlPublicada (lectura.ts:73-86 y 191-197). Escenarios: dadas la 1.0 y la 1.1 de términos registradas con hashes distintos, al pedir la 1.0 llega su propio texto y su hash. Si la versión no existe, o si su texto local falta o no coincide con el hash, responde 404 recurso_no_encontrado. GET /legal/documentos sigue sin texto.

### REQ-02 `confirmed`
> Fuente: tao-v2/server/src/legal/registro-version.ts:370

Callout. QUÉ: el registro de versiones (`pnpm -C server run legal:registrar`, ejecutarRegistroLegal) funciona sin URL remota. Si no recibe --base-url ni STAGING_BASE_URL, registra cada versión de docs/legal con su SHA-256 y urlPublicada nula, y solo exige MIGRATION_DATABASE_URL. Si recibe --base-url, conserva el comportamiento actual (urlPublicada `${base}/legal/<tipo>/<version>`). La idempotencia y la inmutabilidad no cambian. POR QUÉ: el alcance pide 'scripts adaptados para no requerir staging'. Hoy el script sale con código 1 si falta STAGING_BASE_URL (registro-version.ts:370-374) y RegistroVersionLegal.urlPublicada es obligatoria (registro-version.ts:57-60). Escenarios: con solo MIGRATION_DATABASE_URL, inserta las versiones con urlPublicada nula. Si se ejecuta de nuevo, no duplica nada. Republicar una versión con otro texto se rechaza con VersionLegalInmutableError. Sin MIGRATION_DATABASE_URL, sale con código 1 sin conectarse.

### REQ-03 `confirmed` `enforcement`
> Fuente: tao-v2/server/src/legal/lectura.ts:150

Reusar las piezas existentes y no duplicarlas. El hash se calcula solo con calcularHashContenido (registro-version.ts:63) y el directorio por defecto se resuelve solo con DIRECTORIO_LEGAL_POR_DEFECTO (registro-version.ts:285). El texto del detalle se resuelve con la misma lógica de textoDe y la misma verificación de hash de obtenerPagina (lectura.ts:150-160 y 205-209), extraída a una función común en lectura.ts. aDocumentoLegal (lectura.ts:74) sigue devolviendo texto nulo para la lista de vigentes. Los errores usan AppError con el código 'recurso_no_encontrado' existente.
## Tasks

#### S1.T1 — En server/src/legal/lectura.ts, extraer de obtenerPagina una función común que resuelva el texto verificado de una fila: textoDe(fila) (lectura.ts:150-160) más la comparación calcularHashContenido(texto) !== fila.hashContenido (lectura.ts:207), que lanza noEncontrado(). obtenerPagina pasa a usarla. obtener(tipo, version) (lectura.ts:191-197) devuelve { ...aDocumentoLegal(fila), texto } usando esa función. aDocumentoLegal y vigentes no cambian (siguen con texto: null). Actualizar el docstring del módulo (lectura.ts:12-21), el comentario de ServicioLegal.obtener (lectura.ts:37) y el comentario del router en server/src/routes/legal.ts:13-17, que hoy dice 'hash y URL publicada, sin texto'.
Contrato: rollback: git checkout -- server/src/legal/lectura.ts server/src/routes/legal.ts. Status: pending

#### S1.T2 — En server/src/legal/registro-version.ts, volver opcional la URL base. RegistroVersionLegal.urlPublicada pasa a ser string | null. construirRegistroVersion recibe baseUrl?: string y deja urlPublicada en null cuando no viene; construirUrlPublicada no cambia. registrarDirectorio acepta baseUrl: string | undefined. En ejecutarRegistroLegal se quita la salida con código 1 por 'Falta --base-url o la variable STAGING_BASE_URL.' (registro-version.ts:370-374): la base sale de --base-url o de STAGING_BASE_URL si existe, y si no, queda indefinida. La exigencia de MIGRATION_DATABASE_URL se mantiene. El INSERT ($5 = urlPublicada) ya admite NULL porque la columna es nullable (server/prisma/schema.prisma:475). Actualizar imprimirAyuda (registro-version.ts:309) con esta descripción: la opcion --base-url recibe una URL publica opcional; sin ella urlPublicada queda nula (por defecto toma STAGING_BASE_URL si existe). Actualizar también el docstring del módulo (registro-version.ts:9-20). No tocar .github/workflows/deploy-staging.yml, que sigue pasando --base-url.
Contrato: rollback: git checkout -- server/src/legal/registro-version.ts. Status: pending

#### S1.T3 — Alinear la documentación del registro con el cambio: docs/development/commands.md (fila de la línea 571 y sección 'Registro de versiones legales', líneas 611-630: --base-url opcional; sin él urlPublicada queda nula), docs/development/configuration.md:101-102 (STAGING_BASE_URL deja de ser obligatoria para legal:registrar), server/.env.example:100-103 (comentario de STAGING_BASE_URL como opcional) y la descripción de STAGING_BASE_URL en scripts/dev/env-parity.mjs:74.
Contrato: rollback: git checkout -- docs/development/commands.md docs/development/configuration.md server/.env.example scripts/dev/env-parity.mjs. Status: pending

#### S1.T4 — Tests y regresión. Primero se fijan los casos de regresión del comportamiento actual y después se ajustan los que cambian. Todos usan PostgreSQL real; ningún caso puede quedar omitido ni usar un doble que siempre responda éxito.
Contrato: rollback: git checkout -- server/src/test/legal/lectura.test.ts server/src/test/legal/registro-version.test.ts scripts/ci/ep01-legal-provider.mjs. Status: pending

#### S1.T4.1 — En server/src/test/legal/lectura.test.ts, reemplazar el caso '[happy] obtenerDocumentoLegal devuelve hashContenido y urlPublicada con texto nulo' (línea 165) por '[happy] obtenerDocumentoLegal devuelve version, hashContenido y el texto local coherente con su hash'. Agregar '[happy] recupera una version historica con su propio texto y hash' usando el fixture terminos-v1.1.md con texto distinto en el directorio temporal, y '[error] una version con texto local desalineado responde 404 recurso_no_encontrado'. Mantener sin cambios los casos de vigentes (línea 146) y de inexistente (línea 179).
Contrato: rollback: git checkout -- server/src/test/legal/lectura.test.ts. Status: pending

#### S1.T4.2 — En server/src/test/legal/registro-version.test.ts, agregar '[happy] sin --base-url ni STAGING_BASE_URL registra las versiones con urlPublicada nula', que usa ejecutarRegistroLegal(['--dir', el directorio temporal de la prueba], { MIGRATION_DATABASE_URL: probe.migratorUrl }), donde el directorio temporal es el que crea el propio test, y verifica la fila en documento_legal. Ajustar '[error] el script falla nombrando la variable faltante sin conectarse' (línea 329): ahora solo falta MIGRATION_DATABASE_URL. Mantener sin cambios los casos de url informada (líneas 114 y 221), de idempotencia (línea 261) y de inmutabilidad (línea 298).
Contrato: rollback: git checkout -- server/src/test/legal/registro-version.test.ts. Status: pending

#### S1.T4.3 — En scripts/ci/ep01-legal-provider.mjs, actualizar casosRequeridos (líneas 29-50): reemplazar el título '[happy] obtenerDocumentoLegal devuelve hashContenido y urlPublicada con texto nulo' por el nuevo título exacto y sumar '[happy] recupera una version historica con su propio texto y hash' y '[happy] sin --base-url ni STAGING_BASE_URL registra las versiones con urlPublicada nula'.
Contrato: rollback: git checkout -- scripts/ci/ep01-legal-provider.mjs. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- edit S1.T2 { desc="En server/src/legal/registro-version.ts, volver opcional la URL base. RegistroVersionLegal.urlPublicada pasa a ser string | null. construirRegistroVersion recibe baseUrl?: string y deja urlPublicada en null cuando no viene; construirUrlPublicada no cambia. registrarDirectorio acepta baseUrl: string | undefined. En ejecutarRegistroLegal se quita la salida con código 1 por 'Falta --base-url o la variable STAGING_BASE_URL.' (registro-version.ts:370-374): la base sale de --base-url o de STAGING_BASE_URL si existe, y si no, queda indefinida. La exigencia de MIGRATION_DATABASE_URL se mantiene. El INSERT ($5 = urlPublicada) ya admite NULL porque la columna es nullable (server/prisma/schema.prisma:475). Actualizar imprimirAyuda (registro-version.ts:309) con esta descripción: la opcion --base-url recibe una URL publica opcional; sin ella urlPublicada queda nula (por defecto toma STAGING_BASE_URL si existe). Actualizar también el docstring del módulo (registro-version.ts:9-20). No tocar .github/workflows/deploy-staging.yml, que sigue pasando --base-url." }
- edit S1.T4.2 { desc="En server/src/test/legal/registro-version.test.ts, agregar '[happy] sin --base-url ni STAGING_BASE_URL registra las versiones con urlPublicada nula', que usa ejecutarRegistroLegal(['--dir', el directorio temporal de la prueba], { MIGRATION_DATABASE_URL: probe.migratorUrl }), donde el directorio temporal es el que crea el propio test, y verifica la fila en documento_legal. Ajustar '[error] el script falla nombrando la variable faltante sin conectarse' (línea 329): ahora solo falta MIGRATION_DATABASE_URL. Mantener sin cambios los casos de url informada (líneas 114 y 221), de idempotencia (línea 261) y de inmutabilidad (línea 298)." }

## Sessions

### Session 1 · T1 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T4.1
- [ ] S1.T4.2
- [ ] S1.T4.3

**Gate (auto)**: Las suites server/src/test/legal/lectura.test.ts y registro-version.test.ts pasan contra PostgreSQL local con los casos nuevos (texto y hash coherentes en la 1.0 y la 1.1, 404 por texto desalineado, registro sin URL con urlPublicada nula), y scripts/ci/ep01-legal-provider.mjs reporta todos los casos requeridos en [ok].

