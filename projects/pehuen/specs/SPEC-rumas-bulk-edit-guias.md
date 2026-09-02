---
id: SPEC-rumas-bulk-edit-guias
project: pehuen
ticket: PEH-012
status: done
---

# Edicion masiva de guias asociadas a una ruma (admin-only, legacy)

# Edicion masiva de guias asociadas a una ruma (admin-only, legacy)

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Que un ADMINISTRADOR pueda corregir en lote 8 campos de todas las guias **vigentes** de una ruma, sin editarlas una por una. Se hace desde un boton admin nuevo dentro del modal "Editar Ruma" que ya existe; ese boton abre un segundo modal con el contexto de la ruma y un formulario. Al confirmar, el backend sobreescribe las guias y el front avisa, cierra ambos modals y recarga la tabla.

### 2. Decisiones criticas

| Decision | Racional |
|----------|----------|
| Solo se editan **guias**, no la ruma (D-1) | El estado de ruma se escribe en el denormalizado `Guia.estadoRuma`; el doc `Ruma` no se toca. Evita ambiguedad de doble fuente |
| **Vacio = preservar** (D-3) | Coherente con `RULE-GUIA-011`; el admin solo cambia lo que llena |
| **Solo guias VIGENTES** (D-4) | Son documentos legales; no se reescriben anuladas (`RULE-GUIA-002`) |
| Cascada **especie→producto** consistente (D-2) | Paridad con el alta de guia: producto se filtra por especie y trae `codigoSAP` |
| **Sin audit** (DEC-LOCAL-01) | El legacy no tiene auditoria de escrituras; la irreversibilidad es UX-only. El nuxt mirror (ticket B) SI obliga AuditLog (RULE-GEN-003) |
| Rechazar N grande con **413** (DEC-LOCAL-02) | Una ruma llega a 84.639 guias; `updateMany` sincrono es inviable. Umbral conservador; async/job queda fuera de scope |
| **Card por prop, sin recalculo** (D-5) | La fila de la tabla ya trae los agregados (`fillRumaData`); se pasan al modal sin fetch extra |

### 3. Riesgos principales y como los mitigamos

| Riesgo | Mitigacion |
|--------|------------|
| `updateMany` sobre 84k guias bloquea el server | Conteo previo (`guias-count?estado=VIGENTE`) + rechazo 413 si N ≥ umbral. Index `{ruma:1}` (S3.T1) para que el filtro no haga COLLSCAN |
| Sin index, query lenta sobre 443.586 docs | S3.T1 crea `{ruma:1}` y verifica IXSCAN antes de construir los endpoints |
| Cambios/pruebas tocan PROD por error | **S2 (sesion-guardrail) ⚑** valida conexion local + guardrail runtime ANTES de cualquier write/test; bloquea backend (S3) hasta confirmar |
| Bulk sin audit, irreversible en prod | Warning explicito "N guias activas, no se puede revertir" + confirmacion en 2 pasos |
| `.env` `NODE_ENV=production` → conecta a PROD (incluso `npm run dev`) | S1.T2 cambia `NODE_ENV=development` ANTES de cualquier prueba (bloqueante). Verificar log de uri localhost. Usar `npm run dev`, nunca `npm start` (fuerza prod) |
| Especie cambiada deja producto inconsistente | Cascada fuerza par (especie, producto) valido; backend valida `Producto.especie === especie` |

### 4. Que NO se hace
- No se edita el doc `Ruma` (solo guias).
- No entra `guiaArauco` al bulk (riesgo de unicidad — fuera de scope).
- No hay AuditLog (legacy). No hay async/job para N grande (se rechaza con 413).
- No se toca `pehuen-nuxt` (mirror posterior, ticket B).
- Intervencion no se muestra en el card (no esta agregada en `fillRumaData`); si se edita en el form.

### 5. Tamano estimado
**6 sessions** (~11-14h). S2 es una sesion-guardrail corta que asegura conexion solo-local. La mas riesgosa: **S3** (backend — index + 2 endpoints + estrategia de volumen). S1 (pre-flight) ya esta parcialmente hecha (v2 deprecado removido + docs commiteadas el 2026-06-01).

### 6. Como vas a saber que funciona
- Admin ve el boton "EDITAR GUIAS ASOCIADAS"; un no-admin no lo ve ni puede llamar el endpoint (403).
- El modal muestra "N guias activas" con el numero real y los valores actuales de la ruma.
- Tras confirmar: las guias vigentes quedan con los campos elegidos; las vacias preservan su valor; se cierran ambos modals y la tabla se recarga con los nuevos agregados.

## Purpose
Proveer al rol ADMINISTRADOR una operacion de edicion en lote de 8 campos sobre las guias vigentes asociadas a una ruma del sistema legacy `pehuen-client`/`pehuen-server`, accesible desde el modal "Editar Ruma", con preview de contexto, advertencia de irreversibilidad y paridad total con los patrones de UI/validacion/manejo de modals existentes. Reduce el costo de corregir datos masivos (hoy guia por guia) preservando las reglas de negocio del dominio.

## Requirements

### REQ-01: Boton admin "Editar guias asociadas" en el modal Editar Ruma

> **Que cambia**: dentro del modal de editar ruma aparece un boton extra que solo ve un ADMINISTRADOR; no edita la ruma, abre el modal de edicion masiva.
> **Por que**: es el punto de entrada de la feature, y debe quedar fuera del alcance de roles no-admin tanto visual como funcionalmente.

El sistema MUST mostrar un boton "EDITAR GUIAS ASOCIADAS" dentro del modal Editar Ruma de `views/rumas/List.vue`, visible solo si `user.role === 'ADMINISTRADOR'` (patron `userState` de `guides/Create.vue`). Al hacer click MUST abrir el modal secundario de edicion masiva sin modificar la ruma.

<details><summary>Scenarios de validacion</summary>

#### Scenario: admin ve el boton
- **GIVEN** un usuario ADMINISTRADOR en la vista rumas
- **WHEN** abre el modal Editar Ruma de una ruma
- **THEN** ve el boton "EDITAR GUIAS ASOCIADAS"

#### Scenario: no-admin no ve el boton
- **GIVEN** un usuario SUPERVISOR/RECEPTOR/CONSULTOR/ASESOR
- **WHEN** abre el modal Editar Ruma
- **THEN** NO ve el boton

#### Scenario: el boton no edita la ruma
- **GIVEN** un admin con el modal Editar Ruma abierto
- **WHEN** hace click en "EDITAR GUIAS ASOCIADAS"
- **THEN** se abre el modal secundario y el doc Ruma no sufre cambios

</details>

### REQ-02: Modal secundario con card de contexto (por prop) y conteo de guias activas

> **Que cambia**: el modal de bulk muestra los valores actuales de la ruma (promedios/listas calculados sobre sus guias) y cuantas guias activas se afectaran, sin disparar consultas extra para el card.
> **Por que**: el admin necesita ver contra que esta editando; recalcular seria innecesario porque la tabla ya trae esos agregados.

El sistema MUST mostrar en el modal secundario (a) un card con los valores actuales de la ruma para los campos editables, alimentado **por prop** desde la fila de `List.vue` (`fillRumaData`), sin refetch ni recalculo; y (b) el conteo de guias vigentes obtenido de `GET /api/ruma/:id/guias-count?estado=VIGENTE`, mostrado como "esto modificara N guias activas de la ruma".

<details><summary>Scenarios de validacion</summary>

#### Scenario: card muestra agregados de la ruma
- **GIVEN** una ruma con guias asociadas
- **WHEN** el admin abre el modal de bulk
- **THEN** el card muestra estado, especie, mes corta (promedio), anio plantacion (promedio), producto/zona/procedencia (listas) — sin nueva consulta

#### Scenario: conteo real de vigentes
- **WHEN** se abre el modal
- **THEN** se consulta `guias-count?estado=VIGENTE` y el warning muestra el N real

#### Scenario: intervencion no aparece en el card
- **THEN** el card NO incluye intervencion (no esta en `fillRumaData`); el campo si esta en el form

</details>

### REQ-03: Formulario de 8 campos con semantica vacio=preservar

> **Que cambia**: el form permite editar estado de ruma, fecha corta, intervencion, zona, procedencia, especie, producto y anio plantacion; lo que se deja vacio no se toca.
> **Por que**: una edicion masiva debe poder cambiar solo lo necesario sin pisar el resto.

El sistema MUST presentar un formulario con los 8 campos usando los componentes UI existentes (`UITextSelect` para estado/intervencion/zona/procedencia/especie/producto; `UITextInput` para fechaCorta DD-MM-YYYY y anioPlantacion numerico), poblando los selectores desde `mantenedores.store`. Todo campo vacio MUST preservar el valor actual de cada guia (no sobreescribir).

<details><summary>Scenarios de validacion</summary>

#### Scenario: campo lleno sobreescribe
- **GIVEN** el admin completa "Zona = X" y deja el resto vacio
- **WHEN** confirma
- **THEN** solo `zona` se sobreescribe en las guias vigentes; los demas campos quedan como estaban

#### Scenario: form vacio no hace nada
- **GIVEN** el admin no completa ningun campo
- **WHEN** intenta confirmar
- **THEN** el sistema rechaza con "nada que editar" (400) — no ejecuta un updateMany vacio

#### Scenario: selectores poblados desde mantenedores
- **THEN** intervencion/zona/procedencia/especie cargan sus opciones desde `mantenedores.store`

</details>

### REQ-04: Cascada especie→producto consistente (paridad alta de guia)

> **Que cambia**: al elegir especie, el selector de producto se repuebla con los productos de esa especie y arrastra su codigo SAP; cambiar especie limpia el producto.
> **Por que**: producto pertenece a una especie; permitir un par inconsistente corromperia el dato.

El sistema MUST filtrar el selector de producto por la especie elegida (computed equivalente a `productosState.filter(el => el.especie._id === especie)`, replicando `guides/Create.vue:725`), arrastrando `codigoSAP`. Al deseleccionar especie MUST limpiar producto. El backend MUST validar `Producto.especie === especie` cuando ambos vienen en el payload.

<details><summary>Scenarios de validacion</summary>

#### Scenario: producto se filtra por especie
- **GIVEN** el admin elige "Eucaliptus Nitens"
- **WHEN** abre el selector de producto
- **THEN** solo ve productos de esa especie

#### Scenario: par inconsistente rechazado
- **GIVEN** un payload con `especie=A` y `producto` que pertenece a `B`
- **WHEN** llega al backend
- **THEN** responde 400 (par inconsistente)

#### Scenario: deseleccionar especie limpia producto
- **WHEN** el admin deselecciona especie
- **THEN** el producto seleccionado se limpia

</details>

### REQ-05: Endpoint de conteo de guias vigentes

> **Que cambia**: el modal puede mostrar el numero exacto de guias activas que va a tocar, consultandolo al abrir.
> **Por que**: el conteo no viene en la fila de la tabla y debe filtrarse por VIGENTE; sin endpoint, el warning seria generico.

El sistema MUST exponer `GET /api/ruma/:id/guias-count?estado=VIGENTE` con `jwtMiddleware('ACCESS')`, devolviendo `{ count: number }` con la cantidad de guias VIGENTES de la ruma. Alimenta el warning de REQ-02.

<details><summary>Scenarios de validacion</summary>

#### Scenario: cuenta solo vigentes
- **GIVEN** una ruma con 5 guias vigentes y 2 anuladas
- **WHEN** se llama el endpoint
- **THEN** devuelve `{ count: 5 }`

#### Scenario: ruma sin guias
- **THEN** devuelve `{ count: 0 }` sin error

</details>

### REQ-06: Endpoint de edicion masiva admin-guarded sobre guias vigentes

> **Que cambia**: un endpoint nuevo recibe el payload de hasta 8 campos y sobreescribe las guias vigentes de la ruma; solo accesible para ADMINISTRADOR.
> **Por que**: es el corazon de la feature y toca documentos legales — el guard y el filtro VIGENTE son no-negociables.

El sistema MUST exponer `PATCH /api/ruma/:id/bulk-edit-guias` con `jwtMiddleware('ACCESS', [USER_ROLE.ADMINISTRADOR])`, que valide el payload (al menos 1 campo; estado ∈ {ACTIVA,TERMINADA}; ObjectIds existentes; par especie-producto consistente; fechaCorta DD-MM-YYYY), y ejecute `updateMany({ ruma: :id, estado: 'VIGENTE' }, { $set: <solo campos presentes> })`. MUST rechazar con 401 sin token, 403 si rol != ADMINISTRADOR, 400 si payload invalido, y 413 si el conteo de vigentes ≥ umbral (DEC-LOCAL-02). MUST devolver `{ modified, appliedFields }`. Sin AuditLog (DEC-LOCAL-01).

<details><summary>Scenarios de validacion</summary>

#### Scenario: admin edita guias vigentes
- **GIVEN** admin + ruma con 3 guias vigentes
- **WHEN** PATCH con `{ zona: X, anioPlantacion: 2015 }`
- **THEN** las 3 guias quedan con zona X y anio 2015; responde `{ modified: 3, appliedFields: ['zona','anioPlantacion'] }`

#### Scenario: no-admin rechazado
- **GIVEN** token de SUPERVISOR
- **WHEN** PATCH directo al endpoint
- **THEN** 403

#### Scenario: sin token
- **WHEN** PATCH sin Authorization
- **THEN** 401

#### Scenario: guia anulada no se toca
- **GIVEN** ruma con 1 vigente + 1 anulada
- **WHEN** PATCH con `{ zona: X }`
- **THEN** solo la vigente cambia; `modified: 1`

#### Scenario: N grande rechazado
- **GIVEN** ruma con ≥ umbral guias vigentes
- **WHEN** PATCH
- **THEN** 413 + mensaje sugiriendo contactar al equipo

#### Scenario: guiaArauco no rompe unicidad
- **THEN** `guiaArauco` no es editable → `RULE-GUIA-006` no se ve afectada

</details>

### REQ-07: Flujo de confirmacion, notificacion y refresco

> **Que cambia**: editar es irreversible, asi que hay confirmacion explicita; al terminar se avisa, se cierran ambos modals y la tabla se actualiza.
> **Por que**: paridad con el manejo de modals del legacy y feedback claro de una operacion destructiva.

El sistema MUST pedir confirmacion ("N guias seran modificadas sin revertir") antes del PATCH. Tras exito MUST mostrar `showToast('SUCCESS', ...)`, cerrar **ambos** modals (`modalStateBulkEdit` y `modalState`) y recargar la tabla de rumas. En error MUST mostrar el toast de error sin cerrar el form.

<details><summary>Scenarios de validacion</summary>

#### Scenario: confirmacion previa
- **WHEN** el admin presiona "Guardar cambios"
- **THEN** ve la confirmacion con el N antes de ejecutar

#### Scenario: exito cierra todo y recarga
- **WHEN** el PATCH responde 200
- **THEN** toast de exito + ambos modals cerrados + tabla recargada con nuevos agregados

#### Scenario: error mantiene el form
- **WHEN** el PATCH falla
- **THEN** toast de error y el modal de bulk sigue abierto con los datos

</details>

### REQ-08: Guardrail de conexion solo-local durante el ticket

> **Que cambia**: antes de cualquier cambio o prueba, el sistema garantiza que el server local conecta a `localhost`, nunca a la DB de produccion — y aborta si detecta lo contrario.
> **Por que**: el bulk hace `updateMany` destructivo e irreversible; una conexion accidental a prod (el `.env` trae `NODE_ENV=production`) corromperia datos reales.

El sistema MUST, en entorno de desarrollo (`NODE_ENV !== 'production'`), conectar exclusivamente a `mongodb://localhost:27017/pehuen` y MUST abortar el arranque con error claro si la uri resuelta apunta a un host no-local. El arranque MUST loguear de forma prominente el host de DB conectado. Toda prueba del ticket (S3-S5) se ejecuta contra la DB local, verificado en el gate de S2.

<details><summary>Scenarios de validacion</summary>

#### Scenario: dev conecta a localhost
- **GIVEN** `NODE_ENV=development` (post S2.T2)
- **WHEN** se levanta el server con `npm run dev`
- **THEN** `initializeDb` conecta a `mongodb://localhost:27017/pehuen` y lo loguea

#### Scenario: aborta ante host remoto en dev
- **GIVEN** `NODE_ENV !== 'production'` y una uri resuelta a host `ondigitalocean`
- **WHEN** arranca el server
- **THEN** aborta con error explicito (no conecta a prod)

#### Scenario: pruebas solo afectan local
- **GIVEN** S2.GATE confirmado
- **WHEN** corren las pruebas de S3-S5 (incluido `updateMany`)
- **THEN** todas operan sobre la DB local, nunca prod

</details>

## Non-functional requirements

| Tipo | Target | Como se determina |
|------|--------|-------------------|
| Performance (query) | Filtro `{ruma, estado}` usa IXSCAN, no COLLSCAN | Crear index `{ruma:1}` (S3.T1) y verificar `explain()` |
| Performance (write) | `updateMany` sincrono solo si N < umbral (sugerido 100) | Conteo previo + rechazo 413 si N ≥ umbral |
| Security | Doble control admin (UI `v-if` + endpoint `jwtMiddleware([ADMINISTRADOR])`) | `RULE-AUTH-003` + patron `ruma.controller.checkDupedRumas` |

## Artifacts

### Endpoints

| Method | Path | Auth | Request | Response | Errores |
|--------|------|------|---------|----------|---------|
| GET | `/api/ruma/:id/guias-count?estado=VIGENTE` | `jwtMiddleware('ACCESS')` | — | `{ count: number }` | 400 id invalido |
| PATCH | `/api/ruma/:id/bulk-edit-guias` | `jwtMiddleware('ACCESS', [USER_ROLE.ADMINISTRADOR])` | `BulkEditGuiasPayload` (8 campos opcionales) | `{ modified, appliedFields }` | 400 payload invalido / 401 sin token / 403 rol / 413 N grande |

Payload (`BulkEditGuiasPayload`, ver `tickets/PEH-012.draft/data-model.ts`): `estadoRuma?: 'ACTIVA'|'TERMINADA'`, `fechaCorta?: string`, `intervencion?`, `zona?`, `procedencia?`, `especie?`, `producto?` (ObjectId), `anioPlantacion?: number`. Vacio/ausente = preservar. **Validacion: DTO con middleware estatico manual** (`BulkEditGuiasDto.validatePartialDtoMiddleware`, patron `dtos/ruma.dto.ts:36` — guard "Nada que actualizar" + `isValidObjectId` + `errors.join` → `HttpException(400)`). NO class-validator decorators, NO zod (ver DEC-LOCAL-03). Detalle del patron en `tickets/PEH-012.md > Scope refinement > Patron de endpoints y services`.

### Models (existentes — solo escritura, sin schema nuevo)

| Entidad | Cambio | Impacto |
|---------|--------|---------|
| `Guia` (`guia.model.ts`) | `updateMany({ruma, estado:'VIGENTE'}, {$set: campos})` sobre `estadoRuma/fechaCorta/intervencion/zona/procedencia/especie/producto/anioPlantacion` | Requiere index `{ruma:1}` (no existe hoy) |
| `Ruma` (`ruma.model.ts`) | Solo lectura (`:id`) | No se modifica (D-1) |
| Mantenedores (Especie/Producto/Zona/Procedencia/Intervencion/EstadoRuma) | Solo lectura | Poblan selectores + validan ObjectIds |

### Frontend (componentes y manejo de modals)

| Elemento | Tipo | Uso | Paridad |
|----------|------|-----|---------|
| `UIModal` (5to embebido en `List.vue`) | reuse | Modal secundario `modalStateBulkEdit` (`v-model:modalState`) | Patron de `List.vue` (4 modals existentes) |
| `UITextSelect` | reuse | Estado, Intervencion, Zona, Procedencia, Especie, Producto | `guides/Create.vue` |
| `UITextInput` | reuse | Fecha corta (DD-MM-YYYY), Anio plantacion (number) | `guides/Create.vue` |
| `mantenedores.store` | reuse | Items de los 5 selectores + EstadoRuma | Harlem store |
| `userState` (`user.store.ts`) | reuse | `user.role === 'ADMINISTRADOR'` (boton + disables) | `guides/Create.vue` |
| `showToast` | reuse | Notificacion exito/error | `List.vue:646` |
| Card de contexto | nuevo (composicion) | Valores actuales por prop desde la fila | sin componente base nuevo |
| Computed cascada producto | nuevo (composicion) | `productos.filter(p => p.especie._id === especie)` | `Create.vue:725` |

**Manejo de modals (paridad — detalle en `tickets/PEH-012.md > Scope refinement > Patron de manejo de modals`)**: nuevo `ref(false)` `modalStateBulkEdit`; trigger = boton dentro del modal `modalState` con `v-if` admin que setea `modalStateBulkEdit.value = true`; abrir reusa `items.value[i]` para el card (sin refetch); exito → `showToast` + cerrar ambos (`modalStateBulkEdit=false`, `modalState=false`) + recargar tabla.

## Tasks

### Session 1 — Pre-flight legacy (cierre de saneo de repos) [tipo: ⚑ fuerte] [tier: T0]

> Parcialmente hecho el 2026-06-01: v2 deprecado removido de `pehuen-server` + docs commiteadas en ambos repos (ver learns L11-L13). Restan los items operativos antes de ramificar.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Decidir ramas no-mergeadas: `ruma-product-by-qty` (client) y `docs` (server) — rescatar/archivar/descartar; borrar las merged | — | developer | — | `pehuen-client` `pehuen-server` (git) | manual: `git branch` limpio segun decision | (no aplica — git) | DET-10 | pending | 1 |
| S1.T2 | 🚨 Cambiar `pehuen-server/.env` `NODE_ENV=production` → `NODE_ENV=development` (control real de conexion en `app.ts:135 initializeDb`; en dev usa `localhost:27017` hardcodeado e ignora `MONGO_HOST`). Defensa-en-profundidad opcional: neutralizar `MONGO_HOST`/creds prod. **NO basta con cambiar MONGO_HOST** — el codigo lo ignora en dev | — | developer | — | `pehuen-server/.env` | manual: levantar e `app.ts` loguea `mongodb://localhost:27017/pehuen`, NO la uri `mongodb+srv://...ondigitalocean` | restaurar `.env` previo | DET-5, DET-8 | pending | 1 |
| S1.T3 | Bump `pehuen-client/.nvmrc` v15→v16 + `nvm use` + `npm install` (+ `npm rebuild` si sharp/bcrypt) | — | developer | — | `pehuen-client/.nvmrc` | manual: `npm install` sin warnings criticos + app levanta | `git checkout .nvmrc` | DET-8 | pending | 1 |
| S1.T4 | Crear branch `PEH-012-bulk-edit-guias` desde `main` en cada repo | — | developer | S1.T1 | ambos repos (git) | manual: rama creada en ambos | borrar rama | DET-10 | pending | 1 |
| S1.T5 | Smoke test local: server con `npm run dev` (NO `npm start` — `start` fuerza `NODE_ENV=production` → PROD) conecta a `localhost:27017`; client con su dev serve | — | developer | S1.T2, S1.T3, S1.T4 | ambos repos | manual: log de `app.ts` muestra uri localhost; client levanta y consume API local | (no aplica) | DET-13 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T0)** — persistir resultados, dev confirma repos clean + branch nueva + `.env` localhost + smoke ok | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + dev confirma | (no aplica) | DET-20, DET-23, DET-30 | pending | 1 |

### Session 2 — Validacion de conexion a DB (guardrail) [tipo: ⚑ fuerte] [tier: T1]

> Gate de seguridad: garantiza que TODA conexion durante el resto del ticket (cambios + pruebas, incluido el `updateMany` destructivo) apunta a `localhost`, nunca a PROD. Bloquea S3 hasta confirmar.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Verificar conexion local: levantar server con `npm run dev` y confirmar que `app.ts initializeDb` loguea uri `mongodb://localhost:27017/pehuen`. Assert NEGATIVO: ninguna uri `mongodb+srv://...ondigitalocean` en el log | REQ-08 | developer | S1.GATE | `pehuen-server` (runtime) | manual: log uri localhost, cero referencias a host remoto | (no aplica) | DET-5, DET-13 | pending | 2 |
| S2.T2 | Guardrail runtime en `app.ts:initializeDb`: log prominente del host conectado en cada arranque + assert defensivo (si `NODE_ENV !== 'production'` y la uri resuelta apunta a host no-local → abortar con error claro). Aditivo, revertible | REQ-08 | developer | S2.T1 | `pehuen-server/src/app.ts` | manual: con NODE_ENV=development conecta localhost; simular host remoto → aborta con mensaje | git revert | DET-5, DET-8 | pending | 2 |
| S2.T3 | Verificar dataset local de prueba: ≥1 ruma con N≥3 guias VIGENTES en `localhost:27017/pehuen` (seed o dataset existente) para S4/S5 | REQ-08 | developer | S2.T1 | `pehuen-server` (DB local) | manual: query confirma ruma con ≥3 guias vigentes | (no aplica) | DET-13 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1)** — ⚑ dev confirma: server conecta SOLO a localhost, guardrail activo, dataset listo. Ninguna prueba posterior puede tocar prod | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + dev confirma conexion local | (no aplica) | DET-13, DET-20, DET-23, DET-30 | pending | 2 |

### Session 3 — Backend: index + endpoints count y bulk-edit [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Crear index `{ruma:1}` en collection `guias` (migration/script one-shot) + verificar IXSCAN | REQ-06 | developer | S2.GATE | `pehuen-server` (script/migration) | manual: `db.guias.getIndexes()` lista `{ruma:1}` + `explain()` IXSCAN | `db.guias.dropIndex({ruma:1})` | DET-5, DET-8, DET-11 | pending | 3 |
| S3.T2 | `GET /api/ruma/:id/guias-count?estado=VIGENTE` → `{count}` | REQ-05 | developer | S3.T1 | `src/controllers/ruma.controller.ts`, `src/services/ruma.service.ts` | vitest: cuenta vigentes, excluye anuladas, 0 sin guias | git revert | DET-1, DET-2, DET-8 | pending | 3 |
| S3.T3 | `PATCH /api/ruma/:id/bulk-edit-guias` con guard admin + `BulkEditGuiasDto.validatePartialDtoMiddleware` (estatico manual estilo `ruma.dto.ts`: guard nada-que-editar, `isValidObjectId`, estado enum, fechaCorta regex) + `updateMany({ruma,estado:VIGENTE})` en service + rechazo 413 | REQ-06, REQ-04 | developer | S3.T1 | `src/controllers/ruma.controller.ts`, `src/services/guia.service.ts`, `src/dtos/bulk-edit-guias.dto.ts` (nuevo) | vitest: 5 campos sobreescritos en N mock; 403 rol; 401 sin token; 400 payload invalido; 413 N≥umbral; vacio=preserva | git revert | DET-1, DET-2, DET-5, DET-8 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — unit + coverage, quality review, persistir | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket, spec | vitest --coverage verde + review 10 dims | (no aplica) | DET-20, DET-23, DET-25 | pending | 3 |

### Session 4 — Frontend: modal 5to + form + cascada + card por prop [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Boton admin "EDITAR GUIAS ASOCIADAS" en el modal Editar Ruma (`v-if user.role===ADMINISTRADOR`) que abre `modalStateBulkEdit` | REQ-01 | developer | S3.GATE | `src/views/rumas/List.vue` | manual: admin lo ve, no-admin no | git revert | DET-5, RULE-AUTH-003 | pending | 4 |
| S4.T2 | 5to `<ui-modal v-model:modalState="modalStateBulkEdit">` + card de contexto por prop (desde `items.value[i]`, sin refetch) + warning con `guias-count` | REQ-02 | developer | S4.T1 | `src/views/rumas/List.vue` | manual: card muestra agregados; warning con N real | git revert | DET-5, RULE-RUMA-005 | pending | 4 |
| S4.T3 | Form 8 campos (`UITextSelect`/`UITextInput` desde mantenedores), vacio=preservar, cascada especie→producto (computed `Create.vue:725`) | REQ-03, REQ-04 | developer | S4.T2 | `src/views/rumas/List.vue` | manual: selectores poblados; producto filtra por especie; vacio no pisa | git revert | DET-5, RULE-GUIA-011 | pending | 4 |
| S4.T4 | Flujo confirmacion → PATCH → `showToast` exito → cerrar ambos modals → recargar tabla | REQ-07 | developer | S4.T3 | `src/views/rumas/List.vue` | manual: confirma, ejecuta, cierra ambos, tabla recarga | git revert | DET-5, RULE-GUIA-010 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — quality review UI + a11y + persistir | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4 | ticket | review 10 dims + smoke manual | (no aplica) | DET-20, DET-23, DET-25 | pending | 4 |

### Session 5 — E2E + paridad UX + permission denied [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | E2E (contra DB local, S2.GATE garantiza): admin edita ruma con 3 guias OK; no-admin 403 directo; vacio preserva; ruma sin guias (0); guia anulada excluida; cambio guiaArauco N/A (no editable) | REQ-06, REQ-03, REQ-05 | reviewer | S4.GATE | tests e2e ambos repos | suite e2e 100% pass | (no aplica) | DET-7, DET-13, RULE-GUIA-002, RULE-GUIA-006 | pending | 5 |
| S5.T2 | Revision de paridad UX: modal nuevo usa los mismos componentes, store y patron de modals que el resto | REQ-01..REQ-07 | reviewer | S4.GATE | `src/views/rumas/List.vue` | revisor confirma paridad vs `guides/Create.vue` + patron modals | (no aplica) | DET-4, DET-14 | pending | 5 |
| S5.T3 | Registrar test cases TC-1..TC-12 inline con Actual/Evidence/Status (DET-25), marcar TC-11 obsoleta | — | reviewer | S5.T1 | ticket | tabla TC del ticket completa | (no aplica) | DET-7, DET-25 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** — regression completa + paridad confirmada + TCs persistidos | — | reviewer | S5.T1, S5.T2, S5.T3 | ticket, spec | e2e 100% + revisor approve | (no aplica) | DET-20, DET-23, DET-25 | pending | 5 |

### Session 6 — Close + teach-close (preparar ticket B nuxt mirror) [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | `teach-close.md` con bloques `dkc:*` + sintesis de lo construido + notas para ticket B (query con index, estrategia N grande, audit shape obligatorio en nuxt, guardrail de conexion) | — | developer | S5.GATE | `tickets/PEH-012.teach/teach-close.md` | bloques dkc validos + `teachings.close: done` | (no aplica) | DET-22 | pending | 6 |
| S6.T2 | Crear `rules/migration/RULE-MIGRATION-005-legacy-preflight.md` formalizando los checks de S1 + S2 (validacion de conexion local) | — | developer | S5.GATE | `projects/pehuen/rules/migration/` | rule indexada | git revert | DET-16 | pending | 6 |
| S6.T3 | Backlog item `must`: "Crear ticket B — mirror en pehuen-nuxt con AuditLog (RULE-GEN-003)"; promover DEC-LOCAL-01/02/03 a decisions si aplica | — | developer | S5.GATE | ticket, `projects/pehuen/decisions/` | backlog con item must | (no aplica) | DET-17 | pending | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T0)** — teach-close done + backlog must + cierre | — | reviewer | S6.T1, S6.T2, S6.T3 | ticket | teach-close.md producido + frontmatter listo para close | (no aplica) | DET-20, DET-22 | pending | 6 |

### Task contract (detalle de las criticas)

```
Task S3.T3: PATCH bulk-edit-guias (endpoint nuevo)
- source_ref: REQ-06, REQ-04
- agent: developer
- files: src/controllers/ruma.controller.ts, src/services/guia.service.ts, src/dtos/bulk-edit-guias.dto.ts (nuevo)
- precondition: S3.T1 (index {ruma:1}) listo
- expected_output: endpoint responde 200 con {modified, appliedFields}; 401/403/400/413 en sus casos; updateMany solo sobre estado VIGENTE; vacio preserva
- validation: vitest (mock de guias) cubriendo los 6 scenarios de REQ-06
- rollback: git revert del controller/service/dto
- rules: [DET-1, DET-2, DET-5, DET-8, RULE-AUTH-003, RULE-GUIA-002, RULE-GUIA-011]
```

```
Task S4.T3: Form + cascada especie->producto
- source_ref: REQ-03, REQ-04
- agent: developer
- files: src/views/rumas/List.vue
- precondition: S4.T2 (modal + card) listo
- expected_output: 8 campos con componentes existentes; producto filtrado por especie (computed); vacio=preservar; deseleccion de especie limpia producto
- validation: manual + smoke — selectores poblados, cascada funciona, vacio no pisa
- rollback: git revert de List.vue
- rules: [DET-5, RULE-GUIA-011]
```

## Constraints

- RULE-AUTH-003 (admin-only-on-admin) — patron del guard; el endpoint usa `jwtMiddleware('ACCESS', [USER_ROLE.ADMINISTRADOR])`
- RULE-GUIA-011 (preserve-fields-update) — semantica vacio=preservar de REQ-03
- RULE-GUIA-002 (estado-vigente-nula) — el bulk solo toca VIGENTES
- RULE-GUIA-006 (unique-vigente) — `guiaArauco` fuera de scope evita romper unicidad
- RULE-RUMA-005 (volumes-on-fly) — los agregados de la ruma se calculan sobre guias (`fillRumaData`); el card los reusa por prop
- RULE-GEN-007 (codigo en ingles) — universal
- RULE-GEN-003 (audit-on-write) — **NO aplica al legacy**; SI obliga AuditLog en el ticket B (nuxt)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Index `{ruma:1}` en `guias` | internal | Precondicion de perf del bulk y del count | Sin el, queries COLLSCAN sobre 443k docs |
| `mantenedores.store` poblado | internal | Selectores del form | Si vacio, selectores sin opciones |
| DB local (`localhost:27017/pehuen`) | internal | Pruebas seguras (no prod) | `.env` `NODE_ENV=production` → conecta a prod hasta S1.T2 (control real = NODE_ENV, no MONGO_HOST) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `updateMany` sobre ruma con 84k guias | medium | high (timeout/lock) | Conteo previo + 413 si N≥umbral |
| Smoke test contra prod por `NODE_ENV=production` en `.env` | high | critical | S1.T2 cambia `NODE_ENV=development` (bloqueante). `initializeDb` (app.ts:135) usa localhost solo si NODE_ENV != production. Nunca `npm start` en local (fuerza prod) |
| Edicion irreversible sin audit | medium | high | Warning + confirmacion en 2 pasos; decision documentada (DEC-LOCAL-01) |
| Par especie-producto inconsistente | medium | medium | Cascada UI + validacion backend `Producto.especie===especie` |
| `npm rebuild` necesario tras bump nvmrc v15→v16 (sharp/bcrypt) | medium | medium | S1.T3 corre `npm install`/`rebuild` y valida que la app levanta |

## Open questions

- [ ] **Umbral de N para sync vs 413**: sugerencia 100. Confirmar con el dev en S2 antes de implementar el rechazo. Si se quiere soportar N grande, hay que disenar async/job (amplia scope — fuera de esta spec).

## Decisions

### DEC-LOCAL-01: Sin AuditLog en el legacy
- **Contexto**: el bulk modifica documentos legales (guias Arauco) de forma irreversible.
- **Drivers**: el legacy no tiene mecanismo de audit; el ticket replica comportamiento existente.
- **Opcion elegida**: sin audit; irreversibilidad mitigada por UX (warning + confirmacion).
- **Alternativas**: introducir AuditLog ahora (descartado — fuera de scope, el nuxt lo obliga via RULE-GEN-003 en el ticket B).
- **Consecuencias**: si un admin se equivoca en prod, no hay reconstruccion. Aceptado por el dev.
- **Session**: design (2026-06-01).

### DEC-LOCAL-02: Rechazar N grande con 413 (no async)
- **Contexto**: distribucion con outliers (max 84.639 guias/ruma).
- **Drivers**: `updateMany` sincrono inviable para esos casos; async/job amplia scope.
- **Opcion elegida**: rechazo conservador 413 si N ≥ umbral.
- **Alternativas**: async con job + socket (descartado por scope).
- **Consecuencias**: las rumas masivas no son editables en bulk por ahora; documentado para ticket B.
- **Session**: design (2026-06-01).

### DEC-LOCAL-03: Validacion con DTO estatico manual (estilo RumaDto), no zod ni class-validator decorators
- **Contexto**: un refactor v2 deprecado habia introducido `zod` en `package.json` (revertido el 2026-06-01). Al investigar el patron real se confirmo que el legacy NO usa class-validator decorators.
- **Drivers**: paridad con el codebase actual; evitar heredar deps de un v2 muerto.
- **Opcion elegida**: DTO con middleware estatico manual replicando `dtos/ruma.dto.ts` (`fromPlainObject` + `validatePartialDtoMiddleware`: guard "Nada que actualizar", `isValidObjectId`, `errors.join` → `HttpException(400)`). `validatePartialDtoMiddleware` ya implementa exactamente la semantica partial + vacio=preservar.
- **Alternativas**: (a) class-validator decorators — descartado: aunque esta como dep (0.13.1), `RumaDto` no lo usa; introducirlo crearia dos patrones. (b) zod — descartado: no es el patron legacy, vino del v2 muerto.
- **Consecuencias**: consistencia total con los DTOs existentes; el bulk reusa el patron `validatePartialDtoMiddleware`.
- **Session**: design (2026-06-01).

## Success metrics
- Tiempo de correccion masiva: de N ediciones manuales (guia por guia) a 1 operacion. Medible por uso.

## Technical reference

### Backend (patrones a replicar — paridad, detalle en `tickets/PEH-012.md > Scope refinement > Patron de endpoints y services`)
- `classes/Controller.ts` — base minima `{ path, router = Router() }`. El controller extiende, setea `this.path='/ruma'` en el constructor y llama `intializeRoutes()`.
- `ruma.controller.ts:26-47` — patron de registro de rutas: `this.router.<verb>(\`${this.path}...\`, jwtMiddleware('ACCESS',[roles?]), [dtoMiddleware?], this.handler)`. Handlers arrow async con `try/catch → next(new HttpException(...))`. Guard admin: `jwtMiddleware('ACCESS',[USER_ROLE.ADMINISTRADOR])` (linea 40). `getRumaGuides` (guias de una ruma).
- `server.ts:17-25` — controllers montados como `new RumaController()` en el array que recibe `App`; prefijo `/api`.
- `dtos/ruma.dto.ts:5-48` — patron DTO: `static fromPlainObject` + `static validatePartialDtoMiddleware` (validacion **manual**: guard "Nada que actualizar", `isValidObjectId`, `errors.join` → `HttpException(400)`). Es el molde del `BulkEditGuiasDto`.
- `ruma.service.ts` / `guia.service.ts` — singleton modulo (`const rumaService = new RumaService()`); metodos arrow async; query `Model.find().sort().skip().limit().populate()`. `fillRumaData:47` calcula los agregados de la ruma (fuente del card por prop). El `updateMany`/count del bulk van como metodos de service.
- `guia.model.ts:18,32-58` — campos destino del bulk en `Guia`.

### Frontend
- `guides/Create.vue:147-166,725` — patron de selectores + cascada especie→producto (`codigoSAP`).
- `views/rumas/List.vue:36-45,318,651` — modales embebidos + handler de apertura (patron a replicar para el 5to modal).

## Rules discovered
(se llenan en execute)

## Bugs found
(se llenan en execute)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-07 pasan
- [ ] **Tests**: TC-1..TC-12 escritos y pasando (TC-11 obsoleta)
- [ ] **NFRs**: query usa IXSCAN; rechazo 413 sobre umbral
- [ ] **Rules**: RULE-AUTH-003 / GUIA-002 / GUIA-011 / RUMA-005 respetadas
- [ ] **Integration**: no rompe el modal Editar Ruma ni la tabla de rumas existentes
- [ ] **Docs**: teach-close + RULE-MIGRATION-005 creadas

## Archiving
Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-rumas-bulk-edit-guias "razon"`.
