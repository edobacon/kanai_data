---
id: SPEC-rumas-bulk-edit-guias-nuxt
project: pehuen
ticket: PEH-013
status: in_progress
---

# Edicion masiva de guias asociadas a una ruma — mirror pehuen-nuxt (con AuditLog)

# Edicion masiva de guias asociadas a una ruma — mirror pehuen-nuxt (con AuditLog)

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Que un ADMINISTRADOR pueda corregir en lote, en `pehuen-nuxt`, los campos de todas las guias **vigentes** de una ruma, sin editarlas una por una — replicando la feature del legacy (PEH-012) con el stack nuxt (Nitro `server/api`, zod, Mongoose 9, @nuxt/ui). Se hace desde un boton admin nuevo dentro del modal "Editar Ruma" existente; ese boton abre un segundo modal con el contexto de la ruma y un formulario de **7 campos**. Al confirmar, el backend sobreescribe las guias VIGENTES, **registra la operacion en AuditLog**, avisa, cierra ambos modals y recarga la tabla.

### 2. Decisiones criticas

| Decision | Racional |
|----------|----------|
| **7 campos, no 8** (DEC-LOCAL-N01) | El 8º del legacy ("estado de ruma") era la copia denormalizada `Guia.estadoRuma:string`; nuxt eliminó esa copia (lee `Ruma.estadoRuma` en vivo). No hay campo destino en la guia → fuera del bulk. El estado de ruma se edita por `RumaEditModal` |
| **AuditLog obligatorio** (RULE-GEN-003) | Delta critico vs legacy (que no auditaba, DEC-LOCAL-01). 1 entry agregada por operacion (Q4) |
| **Validacion con zod** (invierte DEC-LOCAL-03) | El legacy usaba DTO estatico manual; nuxt usa zod (`shared/schemas` + `server/schemas`). Replica las validaciones del **commit** legacy, no de la spec legacy (ver auditoria) |
| **Replica los 4 drifts del commit legacy** | La spec legacy quedó desactualizada; el codigo comiteado es la verdad (RULE-MIGRATION-004): largo derivado (D2), especie+producto juntos obligatorio (D3), fecha real (D4), count filtra VIGENTE server-side (D1) |
| **1 evento socket agregado** (DEC-LOCAL-N02) | `guias-bulk-update` a `guias-ALL` con `{ruma, modified, appliedFields}` — evita N emisiones `guide-update-single` |
| **Rechazo 413 si N≥100** (DEC-LOCAL-N03) | Paridad con umbral real del commit legacy. `updateMany` sincrono inviable para rumas masivas (hasta 84k guias). Async/job fuera de scope MVP |
| **Card por prop, sin recalculo** (paridad RULE-RUMA-005) | La fila de la tabla ya trae los agregados; se pasan al modal sin fetch extra |

### 3. Riesgos principales y como los mitigamos

| Riesgo | Mitigacion |
|--------|------------|
| `updateMany` sobre ruma con decenas de miles de guias bloquea el server | Conteo previo (`guias-count`) + rechazo 413 si N≥100. Index `{ruma:1}` (S1.T1) para que el filtro use IXSCAN |
| Sin index, query lenta sobre ~443k guias | S1.T1 crea `{ruma:1}` y verifica IXSCAN (`explain()`) antes de construir los endpoints |
| Pruebas destructivas tocan datos no deseados | Tests corren contra `localhost:27017/pehuen`; el bulk es `updateMany` — los tests usan dataset propio (seed) y limpian. S2 verifica conexion local antes de cualquier write de prueba |
| Especie cambiada deja producto inconsistente | zod fuerza especie+producto juntos (D3); handler valida `Producto.especie === especie` + deriva `largo` |
| AuditLog no se escribe (silencioso por fire-and-forget) | Test e2e (S4) afirma que la entry existe tras el bulk; RULE-GEN-003 es `must` |

### 4. Que NO se hace
- No se edita el doc `Ruma` (el estado de ruma se sigue editando por `RumaEditModal`).
- No entra `guiaArauco` al bulk (riesgo de unicidad — RULE-GUIA-006, igual que legacy).
- No hay async/job para N grande (se rechaza con 413, umbral 100).
- No se toca el legacy (`pehuen-server`/`pehuen-client`) — es la referencia, no el target.
- El 8º campo del legacy (estado de ruma denormalizado) NO se replica (DEC-LOCAL-N01).

### 5. Tamano estimado
**5 sessions** (~10-13h). La mas riesgosa: **S2** (backend core — endpoint bulk + audit + 413 + validaciones). S1 (foundation) y S2 son backend; S3 frontend; S4 testing E2E (⚑); S5 docs + close.

### 6. Como vas a saber que funciona
- Admin ve el boton "Editar Guías Asociadas"; un no-admin no lo ve ni puede llamar el endpoint (403).
- El modal muestra "N guias activas" con el numero real y los valores actuales de la ruma.
- Tras confirmar: las guias vigentes quedan con los campos elegidos; las vacias preservan su valor; **se crea 1 entry en AuditLog**; se cierran ambos modals y la tabla se recarga.

## Purpose
Proveer al rol ADMINISTRADOR una operacion de edicion en lote de 7 campos sobre las guias vigentes asociadas a una ruma en `pehuen-nuxt`, accesible desde el modal "Editar Ruma", con preview de contexto, advertencia de irreversibilidad, auditoria obligatoria (RULE-GEN-003) y paridad con el comportamiento comiteado del legacy (PEH-012). Reduce el costo de corregir datos masivos (hoy guia por guia) preservando las reglas de negocio del dominio.

## Requirements

### REQ-01: Boton admin "Editar Guías Asociadas" en el modal Editar Ruma

> **Que cambia**: dentro del modal de editar ruma aparece un boton extra que solo ve un ADMINISTRADOR; no edita la ruma, abre el modal de edicion masiva.
> **Por que**: es el punto de entrada de la feature y debe quedar fuera del alcance de roles no-admin, visual y funcionalmente.

El sistema MUST mostrar un boton "Editar Guías Asociadas" dentro de `RumaEditModal.vue`, visible solo si `user.role === 'ADMINISTRADOR'` (patron `ADMIN_ONLY_ROLES`). Al hacer click MUST abrir el modal `RumaBulkEditModal` sin modificar la ruma.

<details><summary>Scenarios de validacion</summary>

#### Scenario: admin ve el boton
- **GIVEN** un usuario ADMINISTRADOR en la vista rumas
- **WHEN** abre el modal Editar Ruma de una ruma
- **THEN** ve el boton "Editar Guías Asociadas"

#### Scenario: no-admin no ve el boton
- **GIVEN** un usuario SUPERVISOR/RECEPTOR/CONSULTOR/ASESOR
- **WHEN** abre el modal Editar Ruma
- **THEN** NO ve el boton

#### Scenario: el boton no edita la ruma
- **GIVEN** un admin con el modal Editar Ruma abierto
- **WHEN** hace click en "Editar Guías Asociadas"
- **THEN** se abre el modal secundario y el doc Ruma no sufre cambios

</details>

### REQ-02: Modal con card de contexto (por prop) y conteo de guias activas

> **Que cambia**: el modal de bulk muestra los valores actuales de la ruma y cuantas guias activas se afectaran, sin disparar consultas extra para el card.
> **Por que**: el admin necesita ver contra que esta editando; recalcular seria innecesario porque la tabla ya trae esos agregados (RULE-RUMA-005).

El sistema MUST mostrar en `RumaBulkEditModal` (a) un card con los valores actuales de la ruma alimentado **por prop** desde la fila de la tabla (sin refetch ni recalculo); y (b) el conteo de guias vigentes obtenido de `GET /api/rumas/:id/guias-count`, mostrado como "esto modificara N guias activas de la ruma".

<details><summary>Scenarios de validacion</summary>

#### Scenario: card muestra agregados de la ruma
- **GIVEN** una ruma con guias asociadas
- **WHEN** el admin abre el modal de bulk
- **THEN** el card muestra estado, especie, mes corta, anio plantacion (promedios), producto/zona/procedencia (listas) — sin nueva consulta

#### Scenario: conteo real de vigentes
- **WHEN** se abre el modal
- **THEN** se consulta `guias-count` y el warning muestra el N real de VIGENTES

#### Scenario: intervencion no aparece en el card
- **THEN** el card NO incluye intervencion (no esta en los agregados); el campo si esta en el form

</details>

### REQ-03: Formulario de 7 campos con semantica vacio=preservar

> **Que cambia**: el form permite editar fecha corta, intervencion, zona, procedencia, especie, producto y anio plantacion; lo que se deja vacio no se toca.
> **Por que**: una edicion masiva debe poder cambiar solo lo necesario sin pisar el resto (RULE-GUIA-011).

El sistema MUST presentar un formulario con los 7 campos usando componentes existentes (`USelectMenu` para intervencion/zona/procedencia/especie/producto; `UInput` para fechaCorta DD-MM-YYYY y anioPlantacion numerico), poblando los selectores desde `useMantenedoresApi`. Todo campo vacio MUST preservar el valor actual de cada guia. El sistema MUST rechazar con 400 si el payload no trae ningun campo ("nada que editar").

<details><summary>Scenarios de validacion</summary>

#### Scenario: campo lleno sobreescribe
- **GIVEN** el admin completa "Zona = X" y deja el resto vacio
- **WHEN** confirma
- **THEN** solo `zona` se sobreescribe en las guias vigentes; los demas quedan como estaban

#### Scenario: form vacio no hace nada
- **GIVEN** el admin no completa ningun campo
- **WHEN** intenta confirmar
- **THEN** el sistema rechaza con "nada que editar" (400) — no ejecuta un updateMany vacio

#### Scenario: selectores poblados desde mantenedores
- **THEN** intervencion/zona/procedencia/especie cargan sus opciones desde `useMantenedoresApi`

</details>

### REQ-04: Cascada especie→producto consistente + derivacion de largo

> **Que cambia**: al elegir especie, el selector de producto se repuebla con los productos de esa especie; especie y producto se cambian juntos; al cambiar producto se deriva su `largo`.
> **Por que**: producto pertenece a una especie; permitir un par inconsistente corromperia el dato (D3 del commit legacy). El `largo` se denormaliza en la guia desde el producto (D2).

El sistema MUST filtrar el selector de producto por la especie elegida (`productos.filter(p => p.especie._id === especie)`). Especie y producto MUST cambiarse juntos: el payload con uno sin el otro MUST rechazarse con 400 (D3). El backend MUST validar `Producto.especie === especie` cuando ambos vienen, y MUST derivar `largo` desde `Producto.largo`, persistiendolo en el `$set` (D2). Al deseleccionar especie MUST limpiar producto.

<details><summary>Scenarios de validacion</summary>

#### Scenario: producto se filtra por especie
- **GIVEN** el admin elige "Eucaliptus Nitens"
- **WHEN** abre el selector de producto
- **THEN** solo ve productos de esa especie

#### Scenario: especie sin producto rechazada
- **GIVEN** un payload con `especie` pero sin `producto` (o viceversa)
- **WHEN** llega al backend
- **THEN** responde 400 ("Especie y producto deben cambiarse juntos")

#### Scenario: par inconsistente rechazado
- **GIVEN** un payload con `especie=A` y `producto` que pertenece a `B`
- **WHEN** llega al backend
- **THEN** responde 400 (par inconsistente)

#### Scenario: largo derivado del producto
- **GIVEN** un payload que cambia producto
- **WHEN** se ejecuta el updateMany
- **THEN** `largo` de las guias toma el valor de `Producto.largo` (incluido en appliedFields)

</details>

### REQ-05: Endpoint de conteo de guias vigentes

> **Que cambia**: el modal puede mostrar el numero exacto de guias activas que va a tocar, consultandolo al abrir.
> **Por que**: el conteo no viene en la fila y debe filtrarse por VIGENTE.

El sistema MUST exponer `GET /api/rumas/:id/guias-count` con guard de autenticacion (`requireRole` cualquier rol logueado), devolviendo `{ payload: { count: number } }` con la cantidad de guias VIGENTES de la ruma (filtro VIGENTE server-side — D1, no por query param). Alimenta el warning de REQ-02.

<details><summary>Scenarios de validacion</summary>

#### Scenario: cuenta solo vigentes
- **GIVEN** una ruma con 5 guias vigentes y 2 anuladas
- **WHEN** se llama el endpoint
- **THEN** devuelve `{ payload: { count: 5 } }`

#### Scenario: ruma sin guias
- **THEN** devuelve `{ payload: { count: 0 } }` sin error

#### Scenario: id invalido
- **THEN** devuelve 400

</details>

### REQ-06: Endpoint de edicion masiva admin-guarded sobre guias vigentes

> **Que cambia**: un endpoint nuevo recibe el payload de hasta 7 campos y sobreescribe las guias vigentes de la ruma; solo accesible para ADMINISTRADOR.
> **Por que**: es el corazon de la feature y toca documentos legales — el guard y el filtro VIGENTE son no-negociables.

El sistema MUST exponer `PATCH /api/rumas/:id/bulk-edit-guias` con `requireRole(event, ADMIN_ONLY_ROLES)`, que valide el payload con `bulkEditGuiasSchema` (al menos 1 campo; especie+producto juntos; ObjectIds validos; fechaCorta DD-MM-YYYY real; anioPlantacion en rango [año-40, año]), valide `Producto.especie === especie`, derive `largo`, y ejecute `Guia.updateMany({ ruma, estado: 'VIGENTE' }, { $set })`. MUST rechazar 401 sin token, 403 si rol != ADMINISTRADOR, 400 payload invalido, 413 si el conteo de vigentes ≥ 100. MUST devolver `{ payload: { modified, appliedFields } }`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: admin edita guias vigentes
- **GIVEN** admin + ruma con 3 guias vigentes
- **WHEN** PATCH con `{ zona: X, anioPlantacion: 2015 }`
- **THEN** las 3 guias quedan con zona X y anio 2015; responde `{ payload: { modified: 3, appliedFields: ['zona','anioPlantacion'] } }`

#### Scenario: no-admin rechazado
- **GIVEN** token de SUPERVISOR
- **WHEN** PATCH directo al endpoint
- **THEN** 403

#### Scenario: sin token
- **WHEN** PATCH sin auth
- **THEN** 401

#### Scenario: guia anulada no se toca
- **GIVEN** ruma con 1 vigente + 1 anulada
- **WHEN** PATCH con `{ zona: X }`
- **THEN** solo la vigente cambia; `modified: 1`

#### Scenario: N grande rechazado
- **GIVEN** ruma con ≥ 100 guias vigentes
- **WHEN** PATCH
- **THEN** 413 + mensaje sugiriendo contactar al equipo

</details>

### REQ-07: AuditLog del bulk (delta RULE-GEN-003)

> **Que cambia**: cada operacion de bulk-edit deja una entrada de auditoria con quien, sobre que ruma, cuantas guias y que campos.
> **Por que**: RULE-GEN-003 (audit-on-write) es `must` en nuxt; el bulk es irreversible y debe ser trazable. Es la diferencia central con el legacy.

El sistema MUST registrar, tras un `updateMany` exitoso, **1 entrada agregada** en AuditLog via `audit(event, 'UPDATE', 'guia', undefined, { ruma, count, appliedFields, threshold })`. La entry MUST capturar el actor (de `event.context.user`), la ruma, el N de guias modificadas y los campos aplicados.

<details><summary>Scenarios de validacion</summary>

#### Scenario: bulk exitoso escribe audit
- **GIVEN** admin ejecuta un bulk que modifica 3 guias
- **WHEN** el updateMany responde
- **THEN** existe 1 entry en `audit_logs` con action UPDATE, entity 'guia', userId del admin, details.count=3, details.ruma, details.appliedFields

#### Scenario: bulk rechazado no audita
- **GIVEN** un PATCH que falla con 400/403/413
- **THEN** NO se escribe entry de audit (solo se audita el write efectivo)

</details>

### REQ-08: Flujo de confirmacion, notificacion, socket y refresco

> **Que cambia**: editar es irreversible, asi que hay confirmacion explicita; al terminar se avisa, se emite un evento socket agregado, se cierran ambos modals y la tabla se actualiza.
> **Por que**: paridad con el manejo de modals del nuxt y feedback claro de una operacion destructiva.

El sistema MUST pedir confirmacion ("N guias seran modificadas sin revertir") antes del PATCH. Tras exito MUST mostrar toast de exito, emitir **1 evento** `guias-bulk-update` a la room `guias-ALL` con `{ ruma, modified, appliedFields }` (DEC-LOCAL-N02), cerrar **ambos** modals y recargar la tabla de rumas. En error MUST mostrar toast de error sin cerrar el form.

<details><summary>Scenarios de validacion</summary>

#### Scenario: confirmacion previa
- **WHEN** el admin presiona "Guardar cambios"
- **THEN** ve la confirmacion con el N antes de ejecutar

#### Scenario: exito cierra todo, emite socket y recarga
- **WHEN** el PATCH responde 200
- **THEN** toast de exito + evento `guias-bulk-update` emitido + ambos modals cerrados + tabla recargada

#### Scenario: error mantiene el form
- **WHEN** el PATCH falla
- **THEN** toast de error y el modal de bulk sigue abierto con los datos

</details>

## Non-functional requirements

| Tipo | Target | Como se determina |
|------|--------|-------------------|
| Performance (query) | Filtro `{ruma, estado}` usa IXSCAN, no COLLSCAN | Crear index `{ruma:1}` (S1.T1) y verificar `explain()` |
| Performance (write) | `updateMany` sincrono solo si N < 100 | Conteo previo + rechazo 413 si N ≥ 100 |
| Security | Doble control admin (UI `v-if` + endpoint `requireRole([ADMINISTRADOR])`) | RULE-AUTH-003 |
| Auditability | 1 entry AuditLog por bulk exitoso | RULE-GEN-003 (must) |

## Artifacts

### Endpoints

| Method | Path | Auth | Request | Response | Errores |
|--------|------|------|---------|----------|---------|
| GET | `/api/rumas/:id/guias-count` | `requireRole` (logueado) | — | `{ payload: { count: number } }` | 400 id invalido |
| PATCH | `/api/rumas/:id/bulk-edit-guias` | `requireRole(ADMIN_ONLY_ROLES)` | `BulkEditGuiasPayload` (7 campos opcionales) | `{ payload: { modified, appliedFields } }` | 400 payload / 401 sin token / 403 rol / 413 N≥100 |

Payload (`bulkEditGuiasSchema`, ver `tickets/PEH-013.draft/data-model.ts`): `fechaCorta?`, `intervencion?`, `zona?`, `procedencia?`, `especie?`, `producto?` (ObjectId), `anioPlantacion?: number`. Vacio/ausente = preservar. **Validacion: zod** (`shared/schemas` + `server/schemas`), NO DTO manual (invierte DEC-LOCAL-03). Refines: nada-que-editar, especie+producto juntos (D3), fecha real (D4).

### Models (existentes — solo escritura + 1 index nuevo)

| Entidad | Cambio | Impacto |
|---------|--------|---------|
| `Guia` (`server/models/guia.model.ts`) | `updateMany({ruma,estado:'VIGENTE'}, {$set: 7 campos + largo derivado})` + **nuevo `guiaSchema.index({ruma:1})`** | Index nuevo (no existe hoy, :116-117) |
| `AuditLog` (`server/models/audit-log.model.ts`) | Solo escritura via `audit()` (1 entry/bulk) | Sin cambio de schema — `details` libre |
| `Ruma` | NO se toca (DEC-LOCAL-N01) | El estado de ruma se edita por `RumaEditModal` |

### Frontend (componentes y manejo de modals)

| Elemento | Tipo | Uso | Paridad |
|----------|------|-----|---------|
| `RumaBulkEditModal.vue` | nuevo | Modal de edicion masiva (card + warning + form 7 campos + cascada + confirm) | Composicion sobre primitivos @nuxt/ui |
| `RumaEditModal.vue` | modificado | Boton admin "Editar Guías Asociadas" (`v-if ADMINISTRADOR`) que abre el bulk modal | Patron existente del modal |
| `UModal` / `USelectMenu` / `UInput` / `UFormField` / `UButton` | reuse | Shell + form | @nuxt/ui |
| `useMantenedoresApi` | reuse | Opciones de selectores | Composable existente |
| `useRumasApi` | modificado | `+guiasCount(id)` `+bulkEditGuias(id, payload)` | Composable existente |
| `useToast` | reuse | Notificacion exito/error | @nuxt/ui |

## Tasks

### Session 1 — Backend foundation: index + count + schema zod [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `guiaSchema.index({ruma:1})` en `guia.model.ts` + script one-shot `scripts/PEH-013-create-guias-ruma-index.mjs` (crea index en DB existente) + verificar IXSCAN con `explain()` | REQ-05, REQ-06, NFR | developer | — | `server/models/guia.model.ts`, `scripts/PEH-013-create-guias-ruma-index.mjs` | manual: `db.guias.getIndexes()` lista `{ruma:1}` + explain IXSCAN | quitar `.index({ruma:1})` + `db.guias.dropIndex('ruma_1')` | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T2 | `bulkEditGuiasSchema` zod en `shared/schemas/guia-bulk.schema.ts` (7 campos opcionales + refines: nada-que-editar, especie+producto juntos, fecha real, anio rango) + re-export en `shared/schemas/index.ts` | REQ-03, REQ-04, REQ-06 | developer | — | `shared/schemas/guia-bulk.schema.ts`, `shared/schemas/index.ts` | vitest: parse OK/KO por cada refine | git revert | DET-1, DET-2, DET-8 | pending | 1 |
| S1.T3 | `GET /api/rumas/[id]/guias-count.get.ts` → `{payload:{count}}` (countDocuments `{ruma,estado:'VIGENTE'}`) + metodo en `server/services` | REQ-05 | developer | S1.T1 | `server/api/rumas/[id]/guias-count.get.ts`, `server/services/guia.service.ts` | vitest: cuenta vigentes, excluye NULA, 0 sin guias, 400 id invalido | git revert | DET-1, DET-2, DET-8 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — vitest --coverage del schema + count, quality review, persistir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket, spec | vitest --coverage verde + review 10 dims | (no aplica) | DET-20, DET-23, DET-25 | pending | 1 |

### Session 2 — Backend core: endpoint bulk-edit + audit + 413 [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `bulkEditGuias` en `server/services/guia.service.ts`: count VIGENTE → 413 si ≥100; validar `Producto.especie===especie`; derivar `largo` de `Producto.largo`; `updateMany({ruma,estado:'VIGENTE'},{$set})`; retornar `{modified, appliedFields}` | REQ-06, REQ-04 | developer | S1.GATE | `server/services/guia.service.ts` | vitest: 5 campos mock, 413 N≥100, especie↔producto, largo derivado, vacio=preserva | git revert | DET-1, DET-2, DET-5, DET-8, RULE-GUIA-002, RULE-GUIA-011 | pending | 2 |
| S2.T2 | `PATCH /api/rumas/[id]/bulk-edit-guias.patch.ts`: `requireRole(ADMIN_ONLY_ROLES)` + parse `bulkEditGuiasSchema` + invocar service + **`audit(event,'UPDATE','guia',undefined,{ruma,count,appliedFields,threshold})`** (RULE-GEN-003) | REQ-06, REQ-07 | developer | S2.T1 | `server/api/rumas/[id]/bulk-edit-guias.patch.ts` | vitest: 401/403/400/413 + 1 audit entry verificada | git revert | DET-5, DET-8, RULE-AUTH-003, RULE-GEN-003 | pending | 2 |
| S2.T3 | Side effect socket: emitir `guias-bulk-update` a `guias-ALL` con `{ruma,modified,appliedFields}` (DEC-LOCAL-N02) + registrar evento en `shared/constants/socket-rooms.ts` | REQ-08 | developer | S2.T2 | `server/api/rumas/[id]/bulk-edit-guias.patch.ts`, `shared/constants/socket-rooms.ts` | vitest/manual: evento emitido con payload correcto | git revert | DET-5, DET-16, RULE-GUIA-010 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — ⚑ unit + coverage + quality review; verificar audit entry; write destructivo cubierto | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket, spec | vitest --coverage verde + audit asserts + review 10 dims | (no aplica) | DET-20, DET-23, DET-25 | pending | 2 |

### Session 3 — Frontend: modal bulk + boton admin + cascada + flujo [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `useRumasApi`: metodos `guiasCount(id)` + `bulkEditGuias(id, payload)` | REQ-05, REQ-06 | developer | S2.GATE | `app/composables/useRumasApi.ts` | manual: llamadas devuelven payload | git revert | DET-5, DET-8 | pending | 3 |
| S3.T2 | `RumaBulkEditModal.vue`: card por prop (sin refetch) + warning con `guiasCount` + form 7 campos (`USelectMenu`/`UInput` desde mantenedores) + vacio=preservar | REQ-02, REQ-03 | developer | S3.T1 | `app/components/rumas/RumaBulkEditModal.vue` | manual: card+warning+form render; selectores poblados | git revert | DET-5, RULE-RUMA-005, RULE-GUIA-011 | pending | 3 |
| S3.T3 | Cascada especie→producto (computed filter + limpiar producto al deseleccionar) + flujo confirm → `bulkEditGuias` → toast → cerrar ambos modals → recargar tabla | REQ-04, REQ-08 | developer | S3.T2 | `app/components/rumas/RumaBulkEditModal.vue`, `app/pages/rumas/index.vue` | manual: cascada filtra; confirm ejecuta; cierra+recarga | git revert | DET-5, RULE-GUIA-010 | pending | 3 |
| S3.T4 | Boton admin "Editar Guías Asociadas" en `RumaEditModal.vue` (`v-if ADMINISTRADOR`) que abre el bulk modal + cableado en `index.vue` | REQ-01 | developer | S3.T2 | `app/components/rumas/RumaEditModal.vue`, `app/pages/rumas/index.vue` | manual: admin lo ve, no-admin no | git revert | DET-5, RULE-AUTH-003 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — quality review UI + a11y + smoke manual + persistir | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | review 10 dims + smoke manual | (no aplica) | DET-20, DET-23, DET-25 | pending | 3 |

### Session 4 — E2E + paridad + permission denied [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | E2E Playwright (DB local): admin edita ruma con N guias OK; no-admin 403 directo; vacio preserva; ruma sin guias (0); guia anulada excluida; N grande 413 | REQ-01..06 | reviewer | S3.GATE | `tests/e2e/rumas-bulk-edit.spec.ts` | suite e2e 100% pass | (no aplica) | DET-7, DET-13, RULE-GUIA-002 | pending | 4 |
| S4.T2 | Test de auditoria: tras bulk exitoso, afirmar 1 entry en `audit_logs` (action UPDATE, entity guia, details.count/ruma/appliedFields) | REQ-07 | reviewer | S3.GATE | `tests/e2e/rumas-bulk-edit.spec.ts` o vitest integration | assert entry existe con shape correcto | (no aplica) | DET-7, RULE-GEN-003 | pending | 4 |
| S4.T3 | Registrar test cases TC-1..TC-N inline con Actual/Evidence/Status (DET-25) + revision de paridad UX vs componentes nuxt | — | reviewer | S4.T1, S4.T2 | ticket | tabla TC del ticket completa | (no aplica) | DET-7, DET-25, DET-14 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — regression completa + audit verificado + TCs persistidos | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket, spec | e2e 100% + audit asserts + revisor approve | (no aplica) | DET-20, DET-23, DET-25 | pending | 4 |

### Session 5 — Documentacion + close [tipo: auto] [tier: T1]

parallel_groups: [[S5.T1, S5.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Docs del repo: `docs/02-views/rumas/bulk-edit-guias.md` + entrada en `docs/03-endpoints/README.md` (los 2 endpoints) | — | developer | S4.GATE | `pehuen_nuxt/docs/02-views/`, `pehuen_nuxt/docs/03-endpoints/README.md` | docs:validate (si aplica) o lectura | git revert | DET-16, RULE-GEN-007 | pending | 5 |
| S5.T2 | `docs/07-migration-notes/by-flow/bulk-edit-guias.md`: paridad legacy↔nuxt (7 campos, audit delta, 4 drifts, DEC-LOCAL-N01..N03) | — | developer | S4.GATE | `pehuen_nuxt/docs/07-migration-notes/by-flow/` | lectura | git revert | DET-16, RULE-MIGRATION-004 | pending | 5 |
| S5.T3 | teach-close + promover DEC-LOCAL-N01/N02/N03 a decisions/ si aplica + cierre del ticket | — | developer | S5.T1, S5.T2 | `tickets/PEH-013.teach/teach-close.html`, `projects/pehuen/decisions/` | teach-close validado + frontmatter listo para close | (no aplica) | DET-22 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T1)** — docs + teach-close done + close | — | reviewer | S5.T1, S5.T2, S5.T3 | ticket | docs + teach-close.html + decisions registradas | (no aplica) | DET-20, DET-22 | pending | 5 |

### Task contract (detalle de las criticas)

```
Task S2.T1: bulkEditGuias service (corazon del bulk)
- source_ref: REQ-06, REQ-04
- agent: developer
- files: server/services/guia.service.ts
- precondition: S1.GATE (index + schema) listo
- expected_output: count VIGENTE → 413 si ≥100; validar Producto.especie===especie; derivar largo; updateMany solo VIGENTE; retornar {modified, appliedFields}; vacio preserva
- validation: vitest (mock de guias/producto) cubriendo REQ-06 + REQ-04
- rollback: git revert de guia.service.ts
- rules: [DET-1, DET-2, DET-5, DET-8, RULE-GUIA-002, RULE-GUIA-011]
```

```
Task S2.T2: endpoint PATCH bulk-edit-guias + audit
- source_ref: REQ-06, REQ-07
- agent: developer
- files: server/api/rumas/[id]/bulk-edit-guias.patch.ts
- precondition: S2.T1 (service) listo
- expected_output: requireRole admin; parse zod; invocar service; audit() 1 entry agregada; 401/403/400/413 en sus casos
- validation: vitest cubriendo guards + audit entry
- rollback: git revert del endpoint
- rules: [DET-5, DET-8, RULE-AUTH-003, RULE-GEN-003]
```

## Technical reference

### Backend (patrones a replicar — codigo nuxt real)
- `server/utils/auth.ts:19-28` — `requireRole(event, roles)` (401/403). Admin: `requireRole(event, ADMIN_ONLY_ROLES)` (`shared/constants/roles`).
- `server/utils/audit.ts:5-11` — `audit(event, action, entity, entityId?, details?)` fire-and-forget; actor de `event.context.user`.
- `server/api/guias/[id]/status.patch.ts:45` — ejemplo real de `audit(...)` en un write de guia.
- `server/api/rumas/[id]/guias.get.ts` — patron de endpoint Nitro file-based sobre ruma (lectura de guias). Modelo para los 2 endpoints nuevos.
- `server/services/guia.service.ts` — service de guias; agregar `bulkEditGuias` + count. `server/models/guia.model.ts:107` (`estado VIGENTE/NULA`), `:116-117` (indices actuales — agregar `{ruma:1}`).
- `shared/schemas/ruma.schema.ts` — estilo zod (`z.object`, `z.preprocess`, `helpers`). Modelo para `guia-bulk.schema.ts`.
- `shared/constants/socket-rooms.ts:23-42` — rooms/eventos (`guias-ALL`). Agregar `guias-bulk-update`.

### Frontend
- `app/components/rumas/RumaEditModal.vue` — `UModal` + `USelectMenu` value-key + `useRumasApi().updateRuma` + `useToast`. Punto de entrada del boton admin.
- `app/pages/rumas/index.vue` — tabla + composable `useRumaList`; cableado del modal + recarga.

## Constraints

- RULE-AUTH-003 (admin-only) — `requireRole(event, ADMIN_ONLY_ROLES)` en el endpoint + `v-if` en UI
- RULE-GUIA-002 (estado-vigente-nula) — el bulk solo toca VIGENTES
- RULE-GUIA-006 (unique-vigente) — `guiaArauco` fuera de scope
- RULE-GUIA-011 (preserve-fields-update) — vacio=preservar
- RULE-GUIA-010 (socket-rooms) — el evento del bulk va a `guias-ALL`
- RULE-RUMA-005 (volumes-on-fly) — card por prop desde agregados
- RULE-GEN-003 (audit-on-write) — **delta del mirror**: 1 entry por bulk
- RULE-GEN-007 (codigo en ingles) — universal
- RULE-MIGRATION-004 (legacy = fuente de verdad) — el codigo comiteado del legacy es la referencia (no la spec legacy desactualizada)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Index `{ruma:1}` en `guias` | internal | Precondicion de perf del bulk y del count | Sin el, COLLSCAN sobre ~443k docs |
| `useMantenedoresApi` poblado | internal | Selectores del form | Si vacio, selectores sin opciones |
| `audit()` auto-import (Nitro) | internal | Escritura de AuditLog | Si no se invoca, RULE-GEN-003 violada |
| DB local `localhost:27017/pehuen` | internal | Pruebas seguras | Tests destructivos deben correr en local con dataset propio |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `updateMany` sobre ruma con decenas de miles de guias | medium | high | Conteo previo + 413 si N≥100 |
| AuditLog no se escribe (fire-and-forget silencioso) | medium | high | Test e2e/integration afirma la entry (S4.T2) |
| Par especie-producto inconsistente | medium | medium | zod fuerza juntos + backend valida `Producto.especie===especie` |
| `largo` derivado incorrecto si `largoVariable===1` | low | medium | DEC-LOCAL: derivar `Producto.largo` (paridad commit); test cubre el caso |
| Tests destructivos sobre datos no deseados | low | high | Dataset propio (seed) en local + cleanup |

## Open questions
(ninguna — Q3/Q5/largoVariable resueltas como DEC-LOCAL-N02/N03 abajo)

## Decisions

### DEC-LOCAL-N01: bulk de 7 campos (sin estado de ruma)
- **Contexto**: el legacy define 8 campos; el 8º es la copia denormalizada `Guia.estadoRuma:string`.
- **Drivers**: nuxt eliminó esa denormalizacion (lee `Ruma.estadoRuma` en vivo); no hay campo destino en la guia.
- **Opcion elegida**: 7 campos. El estado de ruma se edita por `RumaEditModal`.
- **Alternativas**: (A) escribir `Ruma.estadoRuma` — diverge del legacy + se solapa con RumaEditModal; (B) re-denormalizar — dato muerto.
- **Consecuencias**: preserva la intencion del legacy (bulk = solo guias) respetando la normalizacion nuxt.
- **Session**: intake (2026-06-06), confirmada por el dev.

### DEC-LOCAL-N02: 1 evento socket agregado (no N)
- **Contexto**: el bulk modifica N guias; el patron existente emite `guide-update-single` por guia.
- **Opcion elegida**: 1 evento `guias-bulk-update` a `guias-ALL` con `{ruma, modified, appliedFields}`.
- **Alternativas**: N emisiones `guide-update-single` (tormenta de eventos, descartado).
- **Consecuencias**: clientes refetchan al recibir el evento; carga de socket constante sin importar N.
- **Session**: design (2026-06-06).

### DEC-LOCAL-N03: rechazo 413 con umbral 100 (no async)
- **Contexto**: rumas con hasta ~84k guias; `updateMany` sincrono inviable para esos casos.
- **Opcion elegida**: rechazo 413 si N≥100 (paridad con umbral real del commit legacy).
- **Alternativas**: async/job + socket de progreso (amplia scope, fuera de MVP).
- **Consecuencias**: rumas masivas no editables en bulk por ahora; documentado.
- **Session**: design (2026-06-06).

## Success metrics
- Tiempo de correccion masiva: de N ediciones manuales a 1 operacion. Medible por uso.
- Trazabilidad: 100% de los bulk-edits con entry de AuditLog (vs 0% en legacy).

## Rules discovered
(se llenan en execute)

## Bugs found
(se llenan en execute)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-08 pasan
- [ ] **Tests**: vitest (schema, service, endpoint) + e2e Playwright + assert AuditLog
- [ ] **NFRs**: query usa IXSCAN; rechazo 413 sobre umbral 100; 1 audit entry por bulk
- [ ] **Rules**: RULE-AUTH-003 / GUIA-002 / GUIA-011 / RUMA-005 / GEN-003 respetadas
- [ ] **Integration**: no rompe el modal Editar Ruma ni la tabla de rumas existentes
- [ ] **Docs**: docs repo (02-views, 03-endpoints, 07-migration-notes) + teach-close

## Archiving
Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-rumas-bulk-edit-guias-nuxt "razon"`.
