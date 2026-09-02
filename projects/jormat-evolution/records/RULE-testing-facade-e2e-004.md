---
id: RULE-testing-facade-e2e-004
project: jormat-evolution
type: rule
module: testing
level: must
tags:
  - testing
  - e2e
  - uuid
  - fachada
  - identidad
  - validation-pipe
  - guards
  - mocked-unit
  - backend
---

# La fachada uuid/serial y la validacion de contrato se prueban en e2e, no en unit

## What

En `backend/jormat-api`, la correctitud de la **identidad publica** (proyeccion `uuid AS id`, resolucion `WHERE uuid`, `RETURNING` que no emite el serial) y de la **validacion de contrato** (guards de formato, `@IsUUID`, filtros) se prueba en **e2e contra la BD real**, NO en unit.

- **Los unit specs mockean los repositorios** (`controller.spec` mockea el service, `service.spec` mockea el repo). Un cambio de identidad — un `SELECT_COLS` que emite el serial, un `RETURNING` sin alias — **pasa los unit igual** porque el valor mockeado nunca atraviesa Postgres. Los unit verdes NO son evidencia de la fachada. Verificado en JOR-149: 714 unit verdes con el serial filtrandose o no.
- **La evidencia real vive en `test/e2e/`**, que instancia repos/services reales contra la BD (no levanta la app), salvo las suites de validacion de pipe (ver abajo). El guardarrail `test/e2e/inventory-uuid-regression.e2e-spec.ts` es la red: barre lectura y escritura de las 5 tablas del dominio y falla si un serial vuelve a cruzar la API.
- **Asertos que muerden**: para afirmar "el id emitido es uuid" usar una regex uuid **anclada** + descartar el serial serializado (una `NUMERIC_ID_RE` / `/^\d+$/`). `expect.any(String)` NO distingue un uuid de un serial serializado — es un aserto decorativo, prohibido para identidad.
- **Caminos de escritura**: `create`/`update`/`addImage` se testean explicitamente (el `id` devuelto es uuid y NO coincide con el serial persistido), no solo las lecturas. Es donde una lista de `returning` sin migrar empieza a emitir el serial recien nacido.
- **Validacion por `ValidationPipe` (400)**: como el 400 lo emite el pipe y en Nest **los guards corren ANTES que los pipes**, una suite e2e con supertest DEBE `overrideGuard` los guards del controller (`AuthGuard`, `CapabilitiesHydrationGuard`, `CapabilitiesGuard`); sin eso un POST sin auth responde 401/403 y el 400 nunca se alcanza. Patron: `Test.createTestingModule` + `app.useGlobalPipes(new ValidationPipe({whitelist,transform}))` + supertest + los 3 guards a `() => true`.

## Why

Un backend con fachada (uuid publico + serial interno) tiene su correctitud en la capa de acceso a datos, que los unit mockeados no ejercitan. Confiar en unit verdes consagra bugs de runtime: es el patron `feedback_mocked_tests_consecrate_runtime_bugs`. La validacion de contrato por pipe tiene una trampa de orden (guards-antes-de-pipe) que hace que un e2e mal montado devuelva 400 por la razon equivocada (o nunca lo alcance). Anclar la forma uuid y cubrir la escritura cierra las dos fugas silenciosas mas comunes.

## Where

- **Fachada/identidad**: `test/e2e/inventory-uuid-regression.e2e-spec.ts` (guardarrail), `test/e2e/identity-serial-uuid.e2e-spec.ts` (esquema + trucks R1), y las suites por tabla (`customers`, `trucks`, `catalogos-repuestos`, `items-images`) que inspeccionan la fila por `where({ uuid })`.
- **Validacion de pipe (400)**: `test/e2e/sales-purchases-line-items.e2e-spec.ts` (monta la app + supertest + override de guards). Precedente historico de app montada: `test/e2e/e2e-login.e2e-spec.ts`.
- **Gotcha de alias en `returning`**: `.returning(SELECT_COLS)` con `'uuid as id'` honra el alias (Knex 3.x), pero `.returning('*')` NO — el mapeo debe leer `row.uuid` explicito (caso `addImage` -> `mapAttachmentRow`). Ver [[RULE-api-001]].

## When

- Al tocar cualquier repo con fachada uuid (`customers`, `catalogos_repuestos`, `items`, `trucks`, imagenes de item): el cambio se cubre en e2e, no solo en unit.
- Al agregar un endpoint que valide un identificador o un cuerpo por `ValidationPipe` y quererlo probar por HTTP: montar la app y overridear los guards.
- Al agregar un aserto sobre un id publico: forma uuid anclada + descarte del serial, nunca `expect.any(String)`.

## Verification

- El guardarrail `inventory-uuid-regression` falla si se invierte una proyeccion/`returning` para emitir el serial (bite-check reproducible: JOR-149 lo verifico revirtiendo los 3 `SELECT_COLS`).
- Una suite de validacion de pipe que NO overridee los guards devuelve 401/403 en vez de 400 — sintoma de que el pipe no se alcanzo.
