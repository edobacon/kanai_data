---
id: TAO-189-SPEC
project: taomangalam
ticket: TAO-189
status: approved
---

# Preparación de consentimiento sin UI para V-51: política regional, persistencia y bloqueo de emisión

## Resumen ejecutivo

La preparacion entrega la capa de consentimiento de analitica SIN UI: proveedor de politica regional (opt_in/opt_out/disabled), persistencia append-only del consentimiento y decision de emision por el estado canonico "puede emitir analitica", todo en el backend Express/TypeScript bajo `server/`, conforme al contrato OpenAPI `server/contract/openapi.yaml` (DEC-155) y a DEC-130.

Valores verificados (rama epic/EP-01a):
- Ubicacion del codigo: backend `server/` (Express/TypeScript). NO hay modulo Gradle de consentimiento.
- Contrato canonico: `server/contract/openapi.yaml` (OpenAPI 3.1 v2.4.1): esquemas `PoliticaAnalitica`, `ConsentimientoRequest`, `ConsentimientoAnalitica`, `EstadoConsentimiento`; endpoints `GET /privacidad/politica-analitica`, `POST|GET /privacidad/consentimientos` y descarte en `POST /metricas/eventos`. Cliente Dart generado en `server/contract/generated/dart/`.
- Pruebas: Vitest (`pnpm -C server exec vitest run src/privacidad`; config `server/vitest.config.ts`).
- CI: runner `scripts/ci/ep01-consent-provider.mjs` dentro del job `integration` de `.github/workflows/ci-pr.yml`, con guarda de rama `epic/EP-01*`. NO hay lane de fastlane.
- Rama de trabajo: `epic/EP-01a`.

Regla de dominio clave (DEC-130): region ausente/desconocida/invalida/vencida resuelve `opt_in` (seguro, exige aceptacion), nunca `disabled`. Un sujeto sin registro de consentimiento devuelve `vigente: null` sin lanzar excepcion.
## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 3 (2026-10-06) puntos 1 y 6; DEC-130 l.30-32; EP-15 l.387-389; server/package.json:5-6; server/src/routes/

El backend Express/TypeScript bajo `server/` expone un proveedor real de politica regional de analitica que resuelve los tres modos opt_in, opt_out y disabled a partir de la region/tenant del sujeto, detras del contrato canonico (EP-15 / DEC-130 / `server/contract/openapi.yaml`), sin dependencias de UI y sin modulo Gradle. Ante region ausente, desconocida, invalida o con politica vencida resuelve a `opt_in` (comportamiento seguro que exige aceptacion previa), nunca a `disabled`.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-15_metricas_observabilidad_y_auditoria.md:102

El consentimiento de analitica se registra y se actualiza de forma persistente: la decision del sujeto se guarda, se sobrescribe en actualizaciones sucesivas y se vuelve a leer con el mismo valor; un sujeto sin registro previo devuelve el default definido sin fallar.

### REQ-03 `confirmed`
> Fuente: EP-15 l.400; DEC-130; Adenda 3 (2026-10-06) punto 6; server/contract/openapi.yaml l.5546-5552

La emision de analitica se decide por el estado canonico "puede emitir analitica" (EP-15 l.400): con politica `disabled` nunca se emite; con `opt_in` se emite solo si existe consentimiento otorgado vigente; con `opt_out` se emite salvo rechazo o retiro registrado; una negativa previa nunca se convierte en aceptacion al cambiar la region del sujeto; y un cambio a una politica mas estricta detiene la emision hasta que se registre un nuevo consentimiento. El descarte se aplica en `POST /metricas/eventos`.

### REQ-04 `confirmed`
> Fuente: Pedido de cambio 2026-10-06 (concretar `<carpeta>` = `src/privacidad`); Adenda 3 punto 4 (Vitest, `pnpm -C server exec vitest run <carpeta>`, `vitest.integration.ci.ts`) y punto 3 (runner `scripts/ci/ep01-consent-provider.mjs` en job `integration` de `.github/workflows/ci-pr.yml:638`, activacion `epic/EP-01*` l.768-802)

Existe una suite de pruebas de contrato de politica y consentimiento del backend, escrita con Vitest (`server/package.json:12-13` `"test":"vitest run"`, config `server/vitest.config.ts`), ubicada en `server/src/privacidad` y ejecutable en un checkout limpio sin V-51 mediante `pnpm -C server exec vitest run src/privacidad`. El job CI se prepara como runner `scripts/ci/ep01-consent-provider.mjs` invocado dentro del job `integration` de `.github/workflows/ci-pr.yml` (l.638), siguiendo el patron de `scripts/ci/ep01-legal-provider.mjs` y `scripts/ci/ep01-release-provider.mjs`, activado por rama `epic/EP-01*` (`startsWith(github.head_ref,'epic/EP-01')`, l.768-802) y usando la config efimera `vitest.integration.ci.ts`. El runner conserva las referencias caso→test como evidencia. No hay modulo Gradle `:consent` ni lane de fastlane involucrados.

### REQ-05 `confirmed` `enforcement`
> Fuente: Adenda 3 (2026-10-06) punto 2; DEC-155; server/contract/openapi.yaml l.1630, l.1661, l.1735, l.5546-5552, l.6756-6837; server/contract/generated/dart/; server/contract/generated/api.d.ts

La implementacion se conforma campo a campo al contrato canonico `server/contract/openapi.yaml` (OpenAPI 3.1 v2.4.1, DEC-155): esquemas `PoliticaAnalitica`, `ConsentimientoRequest`, `ConsentimientoAnalitica` y `EstadoConsentimiento` (aprox. l.6756-6837) y endpoints `GET /privacidad/politica-analitica` (l.1630), `POST /privacidad/consentimientos` (l.1661), `GET /privacidad/consentimientos` (l.1735) y el descarte en `POST /metricas/eventos` (l.5546-5552). El adaptador consumible por la app es el cliente Dart generado en `server/contract/generated/dart/`; los tipos TS son `server/contract/generated/api.d.ts`. Prohibido introducir un contrato paralelo, renombrar campos o agregar endpoints fuera del OpenAPI.

### REQ-06 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1805

Los antecedentes de identidad/sesion y capacidades se obtienen de sus proveedores existentes antes de usarse y no se simulan ni se asumen como entregados.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1702

La capa entregada es headless y agnostica de UI: no implementa V-51 ni depende de vistas, preservando la frontera con la fase posterior de integracion.

### REQ-08 `confirmed`
> Fuente: Pedido de cambio punto 5; Adenda 3 (2026-10-06) punto 5; server/prisma/schema.prisma:27-412

La persistencia se crea con una migracion Prisma nueva en `server/prisma/` que agrega las tablas `politica_analitica_region` (region/tenant, modo opt_in|opt_out|disabled, version de politica, vigencia; con seed de UE/EEE en `opt_in`) y `consentimiento_analitica` (historial append-only con estado otorgado|rechazado|retirado, sujeto, region, version de politica, fuente y fecha). Hoy ninguna de las dos existe en `server/prisma/schema.prisma` (l.27-412). La lectura vigente de un sujeto es la ultima fila por fecha; no se actualiza ni borra historial.
## Tasks

#### S1.T1 — Crear la migracion Prisma en `server/prisma/migrations/` que agrega los modelos `politica_analitica_region` (region/tenant, modo opt_in|opt_out|disabled, version_politica, vigencia_desde/vigencia_hasta) y `consentimiento_analitica` (sujeto, estado otorgado|rechazado|retirado, region, version_politica, fuente, fecha; append-only, sin UPDATE/DELETE) en `server/prisma/schema.prisma`, mas el seed de las regiones UE/EEE en `opt_in`. Hoy ninguna de las dos tablas existe (schema.prisma:27-412). Incluir el repositorio de lectura (ultima fila por fecha como vigente, default por politica cuando no hay filas).
Contrato: rollback: Borrar la carpeta de la migracion nueva bajo `server/prisma/migrations/`, revertir el bloque agregado en `server/prisma/schema.prisma` y el seed; la base queda sin las dos tablas, igual que antes.. Status: pending

#### S1.T2 — Implementar el proveedor de politica regional en `server/src/` (Express/TypeScript, NO Gradle) que resuelve opt_in|opt_out|disabled desde la region/tenant del sujeto leyendo `politica_analitica_region`, expuesto por `GET /privacidad/politica-analitica` conforme al esquema `PoliticaAnalitica` de `server/contract/openapi.yaml` (l.1630, l.6756-6837). Fallback obligatorio: region ausente, desconocida, invalida o con vigencia expirada resuelve `opt_in`, nunca `disabled` (DEC-130:30-32, EP-15:387-389).
Contrato: rollback: Revertir los archivos del proveedor y su registro de ruta en `server/src/routes/`; el endpoint deja de existir y nada mas en el backend lo referencia.. Status: pending

#### S1.T3 — Implementar el registro y actualizacion de consentimiento (`POST /privacidad/consentimientos` l.1661, `GET /privacidad/consentimientos` l.1735, esquemas `ConsentimientoRequest`/`ConsentimientoAnalitica`/`EstadoConsentimiento`) y el estado canonico "puede emitir analitica" (EP-15:400) aplicado como descarte en `POST /metricas/eventos` (openapi.yaml l.5546-5552): `disabled` nunca emite; `opt_in` emite solo con consentimiento otorgado; `opt_out` emite salvo rechazo/retiro; una negativa previa no se convierte en aceptacion al cambiar de region; una politica mas estricta detiene la emision hasta un nuevo consentimiento. Usar la capacidad existente `metrica.consentir` (`server/src/capacidades/catalogo.ts:415-416`).
Contrato: rollback: Revertir los handlers de `/privacidad/consentimientos` y el hook de descarte en `/metricas/eventos`; la emision vuelve al comportamiento previo y los registros ya persistidos quedan intactos.. Status: pending

#### S1.T4 — Resolver identidad/sesion y capacidades del sujeto contra sus proveedores reales del backend antes de leer o escribir consentimiento: obtener el sujeto desde el middleware de sesion existente y la capacidad `metrica.consentir` desde `server/src/capacidades/catalogo.ts:415-416`, sin stubs, sin sujeto hardcodeado y sin asumir capacidades concedidas. Una peticion sin sesion valida o sin la capacidad responde el error declarado en el contrato, no un 500 ni un sujeto anonimo inventado.
Contrato: rollback: Revertir el cableado a los proveedores en los handlers de privacidad; las rutas vuelven a su resolucion anterior de sujeto sin afectar la persistencia.. Status: pending

#### S1.T5 — Escribir la suite de pruebas de contrato de politica y consentimiento ejecutable sin V-51 (tres modos, persistencia/actualizacion, bloqueo de emision), conservando la referencia caso→test por cada caso cubierto.
Contrato: rollback: Revertir el commit de la suite de contrato; los tests unitarios de la sesion 1 permanecen.. Status: pending

#### S2.T2 — Preparar el job CI del proveedor de consentimiento como runner Node `scripts/ci/ep01-consent-provider.mjs`, siguiendo el patron de `scripts/ci/ep01-legal-provider.mjs` y `scripts/ci/ep01-release-provider.mjs`, e invocarlo dentro del job `integration` de `.github/workflows/ci-pr.yml` (l.638) usando la config efimera `vitest.integration.ci.ts`. La activacion por rama es `startsWith(github.head_ref,'epic/EP-01')` (l.768-802), que cubre la rama real de trabajo `epic/EP-01a`. El runner ejecuta la suite de contrato de politica y consentimiento y conserva las referencias caso→test como evidencia. No hay lane de fastlane ni modulo Gradle involucrados.
Contrato: rollback: Quitar el runner `scripts/ci/ep01-consent-provider.mjs` y su invocacion en el job `integration` de `.github/workflows/ci-pr.yml`, dejando el workflow como estaba en `epic/EP-01a`; la suite de contrato sigue corriendo en local con `pnpm -C server exec vitest run src/privacidad`.. Status: pending

#### S2.T3 — Escribir/ajustar la regresion de la suite de contrato: verifica que el job corre verde sin V-51, que falla si el adaptador importa artefactos de UI de V-51, y que la conformidad de forma con EP-15/DEC-130 se sostiene.
Contrato: rollback: Revertir el commit de la regresion; la suite de contrato base permanece como evidencia.. Status: pending

#### S2.T4 — Test de regresion que prueba que identidad/sesion y capacidades NO se simulan: un doble de prueba del proveedor de sesion que devuelve vacio hace fallar la peticion con el error contractual, y un sujeto sin la capacidad `metrica.consentir` no puede registrar consentimiento. El test falla si alguien reintroduce un sujeto fijo o un bypass de capacidad en el camino de privacidad.
Contrato: rollback: Eliminar el archivo de test agregado; ninguna otra suite lo importa.. Status: pending
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: El backend Express/TypeScript bajo `server/` expone un proveedor real de politica regional de analitica que resuelve los tres modos opt_in, 
- REQ-03 (edit) `confirmed`: La emision de analitica se decide por el estado canonico "puede emitir analitica" (EP-15 l.400): con politica `disabled` nunca se emite; con
- REQ-04 (edit) `confirmed`: Existe una suite de pruebas de contrato de politica y consentimiento del backend, escrita con Vitest (`server/package.json:12-13` `"test":"v
- REQ-05 (edit) `confirmed`: La implementacion se conforma campo a campo al contrato canonico `server/contract/openapi.yaml` (OpenAPI 3.1 v2.4.1, DEC-155): esquemas `Pol
- REQ-08 (add) `confirmed`: La persistencia se crea con una migracion Prisma nueva en `server/prisma/` que agrega las tablas `politica_analitica_region` (region/tenant,

**Tasks agregadas:**

- S1: Crear la migracion Prisma en `server/prisma/migrations/` que agrega los modelos `politica_analitica_region` (region/tenant, modo opt_in|opt_out|disabled, version_politica, vigencia_desde/vigencia_hasta) y `consentimiento_analitica` (sujeto, estado otorgado|rechazado|retirado, region, version_politica, fuente, fecha; append-only, sin UPDATE/DELETE) en `server/prisma/schema.prisma`, mas el seed de las regiones UE/EEE en `opt_in`. Hoy ninguna de las dos tablas existe (schema.prisma:27-412). Incluir el repositorio de lectura (ultima fila por fecha como vigente, default por politica cuando no hay filas). (valida: REQ-02, REQ-08; rollback: Borrar la carpeta de la migracion nueva bajo `server/prisma/migrations/`, revertir el bloque agregado en `server/prisma/schema.prisma` y el seed; la base queda sin las dos tablas, igual que antes.)
- S1: Implementar el proveedor de politica regional en `server/src/` (Express/TypeScript, NO Gradle) que resuelve opt_in|opt_out|disabled desde la region/tenant del sujeto leyendo `politica_analitica_region`, expuesto por `GET /privacidad/politica-analitica` conforme al esquema `PoliticaAnalitica` de `server/contract/openapi.yaml` (l.1630, l.6756-6837). Fallback obligatorio: region ausente, desconocida, invalida o con vigencia expirada resuelve `opt_in`, nunca `disabled` (DEC-130:30-32, EP-15:387-389). (valida: REQ-01, REQ-05, REQ-07; rollback: Revertir los archivos del proveedor y su registro de ruta en `server/src/routes/`; el endpoint deja de existir y nada mas en el backend lo referencia.)
- S1: Implementar el registro y actualizacion de consentimiento (`POST /privacidad/consentimientos` l.1661, `GET /privacidad/consentimientos` l.1735, esquemas `ConsentimientoRequest`/`ConsentimientoAnalitica`/`EstadoConsentimiento`) y el estado canonico "puede emitir analitica" (EP-15:400) aplicado como descarte en `POST /metricas/eventos` (openapi.yaml l.5546-5552): `disabled` nunca emite; `opt_in` emite solo con consentimiento otorgado; `opt_out` emite salvo rechazo/retiro; una negativa previa no se convierte en aceptacion al cambiar de region; una politica mas estricta detiene la emision hasta un nuevo consentimiento. Usar la capacidad existente `metrica.consentir` (`server/src/capacidades/catalogo.ts:415-416`). (valida: REQ-02, REQ-03, REQ-05; rollback: Revertir los handlers de `/privacidad/consentimientos` y el hook de descarte en `/metricas/eventos`; la emision vuelve al comportamiento previo y los registros ya persistidos quedan intactos.)
- S1: Resolver identidad/sesion y capacidades del sujeto contra sus proveedores reales del backend antes de leer o escribir consentimiento: obtener el sujeto desde el middleware de sesion existente y la capacidad `metrica.consentir` desde `server/src/capacidades/catalogo.ts:415-416`, sin stubs, sin sujeto hardcodeado y sin asumir capacidades concedidas. Una peticion sin sesion valida o sin la capacidad responde el error declarado en el contrato, no un 500 ni un sujeto anonimo inventado. (valida: REQ-06; rollback: Revertir el cableado a los proveedores en los handlers de privacidad; las rutas vuelven a su resolucion anterior de sujeto sin afectar la persistencia.)
- S2: Test de regresion que prueba que identidad/sesion y capacidades NO se simulan: un doble de prueba del proveedor de sesion que devuelve vacio hace fallar la peticion con el error contractual, y un sujeto sin la capacidad `metrica.consentir` no puede registrar consentimiento. El test falla si alguien reintroduce un sujeto fijo o un bypass de capacidad en el camino de privacidad. (valida: REQ-06, REQ-07, test; rollback: Eliminar el archivo de test agregado; ninguna otra suite lo importa.)
- S2: Crear el runner `scripts/ci/ep01-consent-provider.mjs` siguiendo el patron de `scripts/ci/ep01-legal-provider.mjs` y `scripts/ci/ep01-release-provider.mjs`: ejecuta la suite de contrato con `pnpm -C server exec vitest run src/privacidad` (en CI con la config efimera `vitest.integration.ci.ts`), emite el mapa caso→test como evidencia y falla si algun caso de aceptacion queda sin test. Cablearlo en el job `integration` de `.github/workflows/ci-pr.yml` (l.638) con la guarda de rama `startsWith(github.head_ref,'epic/EP-01')` (l.768-802). Sin fastlane: la l.12 de `app/fastlane/Fastfile` es `opt_out_usage`, no una lane; sin modulo Gradle `:consent`. (valida: REQ-04, test; rollback: Borrar `scripts/ci/ep01-consent-provider.mjs` y revertir el step agregado en el job `integration` de `.github/workflows/ci-pr.yml`; el pipeline vuelve a su estado previo.)

### Enmienda 2

**Task ops:**

- edit S2.T1 { verify=["pnpm -C server exec vitest run src/privacidad"] }
- edit S2.T2 { desc="Preparar el job CI del proveedor de consentimiento como runner Node `scripts/ci/ep01-consent-provider.mjs`, siguiendo el patron de `scripts/ci/ep01-legal-provider.mjs` y `scripts/ci/ep01-release-provider.mjs`, e invocarlo dentro del job `integration` de `.github/workflows/ci-pr.yml` (l.638) usando la config efimera `vitest.integration.ci.ts`. La activacion por rama es `startsWith(github.head_ref,'epic/EP-01')` (l.768-802), que cubre la rama real de trabajo `epic/EP-01a`. El runner ejecuta la suite de contrato de politica y consentimiento y conserva las referencias caso→test como evidencia. No hay lane de fastlane ni modulo Gradle involucrados.", rollback="Quitar el runner `scripts/ci/ep01-consent-provider.mjs` y su invocacion en el job `integration` de `.github/workflows/ci-pr.yml`, dejando el workflow como estaba en `epic/EP-01a`; la suite de contrato sigue corriendo en local con `pnpm -C server exec vitest run src/privacidad`.", verify=["node scripts/ci/ep01-consent-provider.mjs"] }
- edit S2.T3 { verify=["pnpm -C server exec vitest run src/privacidad"] }

### Enmienda 3

**Task ops:**

- delete S2.T5

### Enmienda 4

**Task ops:**

- move S2.T1 → S1

### Enmienda 5
**REQs:**

- REQ-04 (edit) `confirmed`: Existe una suite de pruebas de contrato de politica y consentimiento del backend, escrita con Vitest (`server/package.json:12-13` `"test":"v
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5

**Gate (auto)**: Corriendo `pnpm -C server exec vitest run src/privacidad` se observa: la politica resuelve opt_in/opt_out/disabled con fallback opt_in ante region ausente, desconocida, invalida o vencida; el consentimiento se persiste y se relee; y la emision se decide por el estado "puede emitir analitica" (disabled nunca; opt_in+otorgado si; opt_out salvo rechazo/retiro; una negativa previa no se convierte en aceptacion al cambiar la region).

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: Corriendo el job CI ep01-consent-provider en un checkout limpio sin V-51 se ve la suite de contrato en verde y las referencias caso→test publicadas como evidencia.
## Decisions

### DEC-LOCAL-01: plan-dedup → auto-pruned
Recorte por exceso aplicado en autónomo: S2.T5

