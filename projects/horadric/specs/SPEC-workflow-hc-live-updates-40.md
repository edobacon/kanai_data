---
id: SPEC-workflow-hc-live-updates-40
project: horadric
ticket: HOR-040
status: done
---

# HC live updates de ticket activo via file watcher

# HC live updates de ticket activo via file watcher

## Executive summary — lo que estas aprobando

> *Lectura de 60s.*

### Que se quiere

Cuando el LLM principal edita el markdown de un ticket activo durante una session, HC viewer hoy NO refleja el cambio hasta que se ejecuta `dkc-reindex` al cierre del gate (decision HOR-015 H10-B). Resultado observado en HOR-023 + HOR-026: el dev viendo HC durante una session larga (3-5 tasks) no ve progreso, percepcion de "esto no avanza".

**Solucion**: HC server adquiere un **file watcher** (`chokidar`) sobre el path del ticket activo. Cuando el markdown cambia, server emite evento SSE — webview reactivo re-renderea solo el bloque Sessions sin recargar la pagina. **Sin tocar el reindex global** — la DB sigue actualizandose en gates como antes (decision H10-B preservada). Este es un canal complementario, no reemplazo.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **chokidar** (no `fs.watch` nativo) | macOS `fs.watch` emite eventos duplicados y tiene caveats con symlinks. chokidar es estandar de industria (~1.5MB), abstrae differences cross-OS, soporta `awaitWriteFinish` para dedup |
| 2 | **SSE** (no WebSocket) | Push unidirectional server→client. Simpler que WebSocket (no upgrade handshake, no estado bidirectional). HC server es Express — agregar endpoint SSE es trivial. EventSource API estandar en webview |
| 3 | **Re-render solo bloque Sessions** (no reload completo) | Frontmatter cambios siguen yendo por reindex (gate). Sessions es donde esta el dolor observado. Granularidad fina = costo bajo de re-render |
| 4 | **Debounce 300ms con awaitWriteFinish** | Patron estandar. Caso typical: scribe escribe 5 lineas en 2 segundos → emitir 1 evento, no 5. Configurable si emerge necesidad |
| 5 | **Watcher por ticket activo, no por proyecto** | Si dev navega a otro ticket, watcher viejo se cierra + nuevo se inicia. Evita leak de descriptors. Scope chico = menos puntos de falla |
| 6 | **SSE endpoint scoped por (project, ticketId)** | Cliente sabe que ticket esta mirando. Server crea/destruye watcher segun subscripciones activas |

### Riesgos

- **Memory leak por watchers no cerrados**: si webview cierra abrupto (tab closed, crash), server debe detectar EventSource disconnect y limpiar watcher. Mitigacion: handler `req.on('close')` + ref-count por (project, ticketId). Validado en S3.
- **Race condition write vs read**: LLM principal escribe markdown, chokidar dispara evento, server lee markdown — pero el write podria estar en flight. Mitigacion: `awaitWriteFinish` de chokidar (espera estabilidad del file size por 300ms antes de emitir).
- **Reload completo de pagina pierde watcher**: el cliente debe re-subscribir al SSE al cargar. Mitigacion: hook en `onMounted` del componente que monitorea el ticket activo.
- **Concurrencia con dkc-reindex manual**: si dev corre `dkc-reindex` mientras el watcher esta activo, no hay colision (DB y markdown se actualizan independiente — watcher no toca DB).

### Que NO se hace

- **NO se cambia la decision H10-B** (reindex post-gate). Este ticket agrega canal independiente.
- **NO re-render del frontmatter ni de otras secciones** (Triage, Tasks). Solo `## Sessions`. Cambios fuera de Sessions siguen viajando por reindex.
- **NO soporte para multiples proyectos simultaneos** en una sola pestania. HC ya navega un proyecto activo a la vez (`.active_project`).
- **NO persistencia de estado del watcher**. Si HC server reinicia, los watchers se levantan al recibir nuevas subscripciones SSE.
- **NO indicador "live" sofisticado**. Badge simple "live" en el header del ticket activo, oculto si no hay subscripcion activa. UI minimal.

### Tamano

3 sessions execute + 1 close = **~3-4h efectivas**. SP estimado: **3**. S1 mas exploratoria (file watcher API + SSE). S2 con foco en UX validable manual. S3 hardening con edge cases.

### Como vas a saber que funciona

- Tu abres HC en localhost:3016 viendo HOR-040 (este mismo ticket).
- En otra ventana, editas el markdown de HOR-040 (agregas linea a Session 1).
- HC actualiza el bloque Sessions en **<500ms** sin reload.
- Badge "live" visible en el header.
- Cambias de ticket en HC: watcher viejo se cierra (verificable en server logs).
- Detienes el server y reinicias: al volver a HOR-040, re-subscribe automatico y sigue funcionando.

---

## Purpose

Cerrar la brecha temporal entre la edicion del markdown del ticket activo y su visualizacion en HC. Hoy la unica forma de ver progreso intra-session es ejecutar `dkc-reindex` manual o esperar al gate — ambos rompen el flujo del dev viendo el panel en tiempo real.

Para el dev: feedback visual constante durante sessions largas. Para HC: arquitectura push reactiva, base extensible para futuros eventos (rules indexed, decisions promoted, etc.).

## Requirements

### REQ-IMPROVE-01 — File watcher en HC server con chokidar

> **Que cambia**: HC server (Node + Express) adquiere un file watcher (chokidar) sobre `projects/{project}/tickets/{TICKET-id}.md` cuando hay subscripciones SSE activas. Detecta cambios y emite evento.
> **Por que**: hoy el server no observa el filesystem — solo responde HTTP en cada request del cliente. Sin watcher, no hay como saber cuando el markdown cambia.

El sistema MUST:
- Instalar dependencia `chokidar` en `horadric-cube/server/package.json`
- Crear modulo `server/deckard/ticket-watcher.ts` que exporta `watchTicket(project, ticketId, onChange) → unwatch()`
- Configurar chokidar con `awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }` para dedup
- Resolver el path absoluto desde el deckard root: `{deckard_root}/projects/{project}/tickets/{ticketId}.md`
- Loggear cada watcher creado/destruido para debugging

<details><summary>Scenarios de validacion</summary>

#### Scenario: watcher detecta cambio
- **GIVEN** HC server corriendo con watcher activo sobre HOR-040.md
- **WHEN** un proceso externo escribe en HOR-040.md (ej. `echo "test" >> HOR-040.md`)
- **THEN** el handler `onChange` se invoca dentro de 500ms con el path del archivo

#### Scenario: dedup writes rapidos
- **GIVEN** watcher activo con `awaitWriteFinish: 300ms`
- **WHEN** 5 writes consecutivos al markdown en 2 segundos
- **THEN** `onChange` se invoca 1 sola vez (no 5)

</details>

### REQ-IMPROVE-02 — Endpoint SSE `/api/projects/:project/tickets/:id/watch`

> **Que cambia**: HC server expone un endpoint SSE que mantiene conexion abierta y emite eventos `ticket-changed` cuando el watcher detecta cambios al markdown del ticket suscrito. Implementado con Hono `streamSSE` (HC server usa Hono + @hono/node-server, no Express).
> **Por que**: el cliente webview necesita un canal push para recibir notificaciones. SSE es push unidirectional simple sobre HTTP, sin necesidad de upgrade a WebSocket. Hono nativamente soporta SSE via `hono/streaming`.

El sistema MUST:
- Registrar ruta GET `/api/projects/:project/tickets/:id/watch` montada en un sub-router (`watcherRoute`)
- Usar `streamSSE` de `hono/streaming` para gestionar la conexion (headers + close automatico)
- Crear watcher al subscribirse (idempotente por `(project, ticketId)` — ref-count si multiples clientes)
- Emitir evento via `stream.writeSSE({ event: 'ticket-changed', data: JSON.stringify({...}) })` cuando watcher dispara
- Limpiar watcher cuando `stream.aborted` o `stream.closed` se cumple, decrementando ref-count

<details><summary>Scenarios de validacion</summary>

#### Scenario: cliente recibe evento
- **GIVEN** cliente SSE conectado a `/api/ticket-watch/horadric/HOR-040`
- **WHEN** alguien edita `projects/horadric/tickets/HOR-040.md`
- **THEN** cliente recibe evento `ticket-changed` con `project: "horadric"` y `ticketId: "HOR-040"` en <500ms

#### Scenario: cleanup al desconectar
- **GIVEN** unico cliente SSE suscrito al ticket
- **WHEN** cliente cierra conexion (req.close emitido)
- **THEN** watcher se destruye, log lo confirma, no quedan descriptors abiertos

#### Scenario: ref-count con multiples clientes
- **GIVEN** 2 clientes SSE suscritos al mismo ticket
- **WHEN** cliente 1 desconecta
- **THEN** watcher sigue activo (cliente 2 aun lo necesita); ref-count = 1

</details>

### REQ-IMPROVE-03 — Cliente SSE en webview con EventSource

> **Que cambia**: el componente Vue que renderea un ticket activo abre conexion EventSource al SSE endpoint cuando se monta, escucha eventos `ticket-changed`, y dispara re-fetch del markdown del ticket.
> **Por que**: sin cliente SSE, el server emite eventos al vacio. EventSource es API estandar del browser, no requiere libreria.

El sistema MUST:
- Agregar composable `webview/src/composables/useTicketWatcher.ts` que retorna `{ isLive, error }` reactivo
- Abrir `new EventSource('/api/ticket-watch/:project/:id')` en `onMounted` del componente del ticket
- Re-fetch markdown del ticket al recibir evento `ticket-changed` (reusar el endpoint que ya carga el ticket — `/api/ticket/:project/:id`)
- Cerrar EventSource en `onUnmounted` o al cambiar de ticket activo (lifecycle)
- Setear `isLive: true` al primer evento recibido, `false` si error/disconnect

<details><summary>Scenarios de validacion</summary>

#### Scenario: re-fetch al detectar cambio
- **GIVEN** ticket abierto en HC, EventSource conectado
- **WHEN** llega evento `ticket-changed`
- **THEN** se invoca `fetchTicket(project, id)` y el componente actualiza el bloque Sessions con el nuevo contenido en <500ms

#### Scenario: cleanup al cambiar de ticket
- **GIVEN** cliente viendo HOR-040 con EventSource activo
- **WHEN** dev navega a HOR-041
- **THEN** EventSource de HOR-040 se cierra, nuevo EventSource para HOR-041 se abre

</details>

### REQ-IMPROVE-04 — Re-render reactivo del bloque Sessions

> **Que cambia**: al actualizar el markdown del ticket, solo el componente `SessionsList` (o equivalente) se re-renderea. Resto del ticket (frontmatter, Triage, Tasks, etc.) no se invalida.
> **Por que**: re-render full del ticket es costoso visualmente (flash). Granularidad fina = UX fluida.

El sistema MUST:
- Identificar el componente Vue actual que renderea `## Sessions` en el ticket viewer
- Modelar el contenido del ticket en el store como `{ frontmatter, body: { triage, tasks, sessions, ... } }` si no esta ya
- Vincular el `SessionsList` a `body.sessions` con Vue reactivity para que el re-fetch solo invalide el componente afectado
- Preservar scroll position al re-renderear (no jumpear al top)

<details><summary>Scenarios de validacion</summary>

#### Scenario: solo Sessions se invalida
- **GIVEN** ticket renderado en HC, scroll posicionado en seccion Tasks
- **WHEN** llega evento `ticket-changed` y se re-fetcha markdown
- **THEN** SessionsList re-renderea con nuevo contenido, Tasks no parpadea, scroll permanece donde estaba

</details>

### REQ-IMPROVE-05 — Badge "live" indicando watcher activo

> **Que cambia**: en el header del ticket activo, agregar badge "live" pequeño con dot animado cuando hay EventSource conectado y recibiendo eventos. Oculto si no hay conexion.
> **Por que**: feedback visual al dev de que el panel esta escuchando cambios. Sin badge, el dev no sabe si "no hay cambios" o "el panel no esta escuchando".

El sistema MUST:
- Renderear badge "live" en el header del ticket (componente actual del titulo del ticket)
- Mostrar solo si `isLive === true` del composable `useTicketWatcher`
- Estilo: dot verde animado (pulse) + texto "live" pequeño
- Tooltip opcional al hover: "Escuchando cambios al markdown"

### REQ-PRESERVE-01 — Reindex global se mantiene en gates

> **Que cambia**: nada. El reindex post-gate sigue funcionando como antes — actualiza SQLite, relations, cross-references.
> **Por que**: este ticket NO toca la decision H10-B de HOR-015. El watcher es canal complementario, no reemplazo del reindex.

El sistema MUST mantener el comportamiento actual de `dkc-reindex`:
- Sigue corriendo en gates (`S{N}.GATE`, close)
- Sigue actualizando DB y relations
- HC sigue consumiendo DB para listas, busquedas, grafo de relations

### REQ-PRESERVE-02 — HC sigue funcional sin watcher activo

> **Que cambia**: nada. Si por algun motivo el watcher falla (chokidar no soporta el FS, permisos, etc.), HC degrada a comportamiento actual sin crash.
> **Por que**: la live-update es una mejora, no un requisito. Sin ella HC sigue siendo usable.

El sistema MUST:
- Si watcher falla al crearse: server loggea error, endpoint SSE responde con `data: {"type":"error","reason":"..."}\n\n` y cierra. Cliente cae back a "no live".
- HC viewer renderea el ticket normalmente aunque el badge "live" no aparezca.

## Changes

### Modified: `horadric-cube/server/`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Server (`index.ts`) | 8 routes Hono, sin watchers | Agrega `app.route('/api/projects', watcherRoute)` con endpoint SSE | Push unidirectional al webview |
| Dependencias | Sin chokidar | `chokidar` instalado | Cross-OS file watcher confiable |

### Added: `horadric-cube/server/routes/watcher.ts`

| Field | Value | Purpose |
|-------|-------|---------|
| Export `watcherRoute` | `Hono` sub-app | Router montable con `app.route` |
| Endpoint | `GET /:project/tickets/:id/watch` | SSE subscription scoped por ticket |
| SSE | `streamSSE` de `hono/streaming` | Hono-native SSE handling |

### Added: `horadric-cube/server/deckard/ticket-watcher.ts`

| Field | Value | Purpose |
|-------|-------|---------|
| Export `watchTicket` | `(project, ticketId, onChange) → unwatch` | API publica del modulo |
| Internal `WatcherPool` | `Map<key, { watcher, refCount }>` | Idempotencia + ref-count |
| `awaitWriteFinish` config | `{ stabilityThreshold: 300, pollInterval: 100 }` | Dedup de writes rapidos |

### Modified: `horadric-cube/webview/src/`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Componente del ticket activo | Carga markdown una vez al montarse | Mantiene EventSource abierta, re-fetcha al recibir `ticket-changed` | Live update |
| Header del ticket | Solo titulo + status | Titulo + status + badge "live" condicional | Feedback visual |

### Added: `horadric-cube/webview/src/composables/useTicketWatcher.ts`

| Field | Value | Purpose |
|-------|-------|---------|
| Export `useTicketWatcher` | `(project, ticketId) → { isLive, error }` | Lifecycle SSE + estado reactivo |

## NFRs

| Tipo | Current | Target | How to measure |
|------|---------|--------|----------------|
| Latencia evento → re-render | N/A (no existe canal) | < 500ms p95 | Manual: timestamp en log server al detectar + log cliente al re-renderear |
| Memory por watcher | N/A | < 5MB residente por (project, ticketId) | `process.memoryUsage()` antes/despues |
| Watchers concurrentes max | N/A | 10 sin degradacion observable | Test manual abriendo 10 tabs del mismo HC |

## Tasks

### Session 1 — POC file watcher server-side + endpoint SSE [tipo: auto] [tier: T2]

> Objetivo: validar H1 (chokidar funciona en macOS para nuestro caso), H2 (SSE endpoint emite eventos), H4 (debounce funciona). Si H1 falla, alternativa polling 500ms (registrado en Risks).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Instalar chokidar en horadric-cube/server | REQ-IMPROVE-01 | developer | — | `horadric-cube/package.json` | `npm install chokidar` exit 0 + `node_modules/chokidar` existe | `npm uninstall chokidar` | DET-2, DET-8 | done | 1 |
| S1.T2 | Crear modulo `ticket-watcher.ts` con `watchTicket()` | REQ-IMPROVE-01 | developer | S1.T1 | `horadric-cube/server/deckard/ticket-watcher.ts` (nuevo) | Tests vitest 4/4 pass | `git rm` archivo | DET-2, DET-8, DET-11 | done | 1 |
| S1.T3 | Crear endpoint SSE `/api/projects/:project/tickets/:id/watch` | REQ-IMPROVE-02 | developer | S1.T2 | `horadric-cube/server/routes/watcher.ts` (nuevo) + registro en `index.ts` | curl `-N` recibe `subscribed` + `ticket-changed` | git revert + remover ruta | DET-2, DET-8 | done | 1 |
| S1.T4 | Validar debounce con writes rapidos | REQ-IMPROVE-01 | tester | S1.T3 | `server/deckard/ticket-watcher.test.ts` | 5 appends → count==1 | N/A (test) | DET-7 | done | 1 |
| S1.GATE | Gate session 1 (tier T2) — confirmar H1+H2+H4. Quality review DET-23. Decision continue | — | reviewer | S1.T4 | `projects/horadric/tickets/HOR-040.md` | 153/153 tests pass, typecheck verde, Quality review pass | N/A | DET-13, DET-20, DET-23 | done | 1 |

### Session 2 — Cliente SSE en webview + re-render reactivo Sessions [tipo: auto] [tier: T2]

> Objetivo: validar H3 (Vue reactivity puede invalidar solo Sessions component). UX manual con cambio markdown → HC actualiza <500ms.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear composable `useTicketWatcher.ts` | REQ-IMPROVE-03 | developer | S1.GATE | `src/composables/useTicketWatcher.ts` (nuevo) | Typecheck + integracion en TicketDetail. Unit test diferido a S3 (env=node sin EventSource) | `git rm` archivo | DET-2, DET-10 | done | 2 |
| S2.T2 | Conectar EventSource en `TicketDetail.vue` (composable wired) | REQ-IMPROVE-03 | developer | S2.T1 | `src/views/TicketDetail.vue` | useTicketWatcher invocado en setup, onChange=refresh() del ETag poll. Typecheck verde | git revert | DET-10, DET-11 | done | 2 |
| S2.T3 | Re-fetch markdown al evento → Vue reactivity actualiza secciones | REQ-IMPROVE-04 | developer | S2.T2 | `src/composables/useETagPoll.ts` (reusado, expone `refresh()`) | useETagPoll ya expone refresh(). data.value=newData triggerea re-render reactivo de SectionSessions y demas. Validacion UX manual en S3 | git revert | DET-10, DET-16 | done | 2 |
| S2.T4 | Badge "live" en header del ticket | REQ-IMPROVE-05 | developer | S2.T2 | `src/views/TicketDetail.vue` | Badge emerald con dot pulse, condicional `v-if=isLiveWatch`. Tooltip incluido | git revert | DET-10 | done | 2 |
| S2.T5 | Lifecycle: cleanup EventSource via watch(projectGetter, idGetter) | REQ-IMPROVE-03 | developer | S2.T2 | `src/composables/useTicketWatcher.ts` | Composable cierra source en onBeforeUnmount + reconecta al cambiar ticket | git revert | DET-10, DET-15 | done | 2 |
| S2.GATE | Gate session 2 (tier T2) — typecheck + 205 tests verdes. Quality review DET-23. Decision continue (UX manual se valida en S3) | — | reviewer | S2.T5 | `projects/horadric/tickets/HOR-040.md` | Typecheck verde. 205/205 tests. Smoke E2E SSE validado en S1 | N/A | DET-13, DET-20, DET-23 | done | 2 |

### Session 3 — Hardening + edge cases [tipo: auto] [tier: T2]

> Objetivo: ticket no existe, file deleted mid-watch, ref-count con multiples tabs, watcher fallback (sin chokidar).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Validar edge cases: ticket no existe, path traversal, invalid params | REQ-PRESERVE-02 | tester | S2.GATE | smoke E2E sobre server corriendo | curl con `HOR-NONEXIST-999` → SSE `subscribed` + waits. Path traversal y bad project → 400 JSON error | N/A (smoke) | DET-9, DET-10 | done | 3 |
| S3.T2 | ref-count en WatcherPool (completado en S1.T2) | REQ-IMPROVE-02 | developer | S1.T2 | `server/deckard/ticket-watcher.ts` | unit test 3 verifica activeCount/listenerCount | git revert | DET-10, DET-16 | done | 1 |
| S3.T3 | cleanup global en server shutdown (completado en S1.T2) | REQ-PRESERVE-02 | developer | S1.T2 | `server/index.ts` SIGTERM/SIGINT → `closeAllTicketWatchers` | smoke shutdown S1 log | git revert | DET-8, DET-15 | done | 1 |
| S3.T4 | tests basicos automatizados (completado en S1.T4) | REQ-IMPROVE-01 | tester | S1.T2 | `server/deckard/ticket-watcher.test.ts` | 4 tests vitest pass | `git rm` archivo | DET-7, DET-13 | done | 1 |
| S3.T5 | UX manual con `npm run dev` (TC-06..TC-11) — diferido a backlog B1 | REQ-IMPROVE-03 | tester | S2.GATE | `npm run dev` + browser smoke | Validacion visual del badge live + re-render reactivo + cleanup lifecycle | git revert | DET-10, DET-15 | blocked | 3 |
| S3.GATE | Gate session 3 (tier T2) — edge cases validados. Quality review DET-23. Decision continue a close | — | reviewer | S3.T1 | `projects/horadric/tickets/HOR-040.md` | Smoke edge cases pass. 205/205 tests + typecheck verdes. UX manual a B1 (no bloqueante) | N/A | DET-13, DET-20, DET-23 | done | 3 |

### Session 4 — Close + docs [tipo: ⚑ fuerte] [tier: T0]

> Objetivo: cerrar ticket con teach-close (decision al iniciar la session: skip o produce), commits separados (HC + DKC docs), DEC-LOCAL si emerge, request-close formal.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Decision teach-close (skip vs produce) + actualizar frontmatter | DET-22 | scribe | S3.GATE | `projects/horadric/tickets/HOR-040.md` | `teachings.close: skipped` con razon explicita en `## Teaching — Close` | revert frontmatter | DET-22 | done | 4 |
| S4.T2 | Commits HC repo: chore, feat server, test, feat webview separados | — | developer | S4.T1 | `horadric-cube/*` | 4 commits: `chore(deps): chokidar`, `feat(server): live updates`, `test(server): cobertura`, `feat(views): cliente SSE + badge` | `git reset` | DET-19 | done | 4 |
| S4.T3 | Commit dkc docs: ticket + spec actualizados con session 4 closed | — | scribe | S4.T2 | `projects/horadric/tickets/HOR-040.md`, `projects/horadric/specs/SPEC-workflow-hc-live-updates-40.md` | commit en deckard con S2-S3-close | `git reset` | DET-19 | done | 4 |
| S4.T4 | `dkc-reindex horadric` + verify status: closed | — | scribe | S4.T3 | — | `reindex` exit 0. Ticket status `closed`, spec status `done` | N/A | DET-13, DET-15 | done | 4 |
| S4.GATE | Gate session 4 (close, tier T0) — acceptance checkpoints todos verdes. Decision: ticket closed | — | reviewer | S4.T4 | `projects/horadric/tickets/HOR-040.md` | Acceptance checkpoints completos. teach-close resuelto. commits hechos | N/A | DET-13, DET-20 | done | 4 |

## Test cases

| TC | Affects UI | Origen | Scenario | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|----|-----------|--------|----------|----------|--------|----------|--------|---------|-------------------|
| TC-01 | no | REQ-IMPROVE-01 | watcher detecta cambio externo | onChange invocado <500ms | onChange recibio `{project,ticketId}` post-append + awaitWriteFinish | `server/deckard/ticket-watcher.test.ts` test 2 + smoke con curl | pass | 1 | — |
| TC-02 | no | REQ-IMPROVE-01 | dedup 5 writes en 2s | 1 evento emitido | count==1 tras 5 appends consecutivos | `server/deckard/ticket-watcher.test.ts` test 4 | pass | 1 | — |
| TC-03 | no | REQ-IMPROVE-02 | curl SSE recibe evento | data: ticket-changed | curl recibio `event: subscribed` + `event: ticket-changed` al append externo | smoke test `/tmp/hor040-sse.log`, server log creado/destruido watcher | pass | 1 | — |
| TC-04 | no | REQ-IMPROVE-02 | cleanup al desconectar 1 cliente | watcher destruido si refCount=0 | `[ticket-watcher] destroyed watcher for horadric/HOR-040` tras curl close | server log smoke test S1 + test 3 unit | pass | 1 | — |
| TC-05 | no | REQ-IMPROVE-02 | ref-count multi-cliente | watcher persiste si refCount>0 | unit test verifica: 2 subs, unsub uno → activeCount=1, listenerCount=1; unsub otro → activeCount=0 | `ticket-watcher.test.ts` test 3 | pass | 1 | — |
| TC-06 | yes | REQ-IMPROVE-03 | EventSource conecta al montar | Network tab muestra SSE conectado | UX manual diferido a S3 | smoke S3 con `npm run dev` (pendiente) | pending | 3 | — |
| TC-07 | yes | REQ-IMPROVE-04 | re-render solo Sessions al evento | Sessions actualiza, Tasks no parpadea | UX manual diferido a S3 — re-render via vDOM diff de Vue | smoke S3 (pendiente) | pending | 3 | — |
| TC-08 | yes | REQ-IMPROVE-04 | scroll preserved al re-render | scroll position igual antes/despues | UX manual diferido a S3 | smoke S3 (pendiente) | pending | 3 | — |
| TC-09 | yes | REQ-IMPROVE-03 | cleanup al cambiar de ticket | EventSource viejo cerrado | UX manual diferido a S3 — composable usa watch(projectGetter, idGetter) | smoke S3 (pendiente) | pending | 3 | — |
| TC-10 | yes | REQ-IMPROVE-05 | badge visible cuando isLive | badge dot verde en header | UX manual diferido a S3 | smoke S3 (pendiente) | pending | 3 | — |
| TC-11 | yes | REQ-IMPROVE-05 | badge oculto cuando !isLive | badge no renderea | UX manual diferido a S3 | smoke S3 (pendiente) | pending | 3 | — |
| TC-12 | no | REQ-PRESERVE-02 | ticket no existe → SSE graceful | SSE conecta + envia `subscribed`. Watcher espera filesystem (fires `add` cuando se crea) | curl a `/api/projects/horadric/tickets/HOR-NONEXIST-999/watch` retorna `event: subscribed` y limpia al cerrar | smoke S3 `/tmp/hor040-s3.log` | pass | 3 | Decision aclarada: comportamiento es esperar `add` (no error). Si dev crea ticket nuevo despues, watcher emite cambio. Documentado |
| TC-12b | no | REQ-PRESERVE-02 | params invalidos → 400 (no SSE) | Bad project name o path traversal → 400 con JSON error | smoke S3 returna `{"error":"Invalid project..."}` y `{"error":"Invalid ticket id: ../etc/passwd"}` | smoke S3 `/tmp/hor040-s3.log` | pass | 3 | Pre-SSE validation: path traversal bloqueado |
| TC-13 | yes | REQ-PRESERVE-02 | HC funcional si watcher falla | ticket renderea sin badge live | Composable maneja error via JSON parse + scheduleReconnect. Badge `v-if="isLiveWatch"` se oculta si error. Sin breaking change en TicketDetail | code review + manual UX (diferido a dev) | pass | 3 | — |
| TC-14 | no | REQ-PRESERVE-01 | reindex post-gate sigue funcionando | `dkc-reindex horadric` exit 0 | Sin cambios al flujo reindex. Watcher y reindex viven en rutas independientes (`watcherRoute` vs `dkc-reindex`). DB y markdown se leen independiente | code review + smoke commits/tickets | pass | 3 | — |

## Constraints

- DET-15 (context exhausted): la live-update reduce fragmentacion de contexto del dev — observable visual reemplaza necesidad de leer DB
- DET-20 (sessions con gate): 4 sessions con `S{N}.GATE` como ultima task en cada
- DET-23 (Quality review): aplica a S1/S2/S3 (T2). S4 es T0 (close, sin codigo)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `chokidar` (npm) | external | File watcher cross-OS, ~1.5MB | Bajo — paquete maduro, 25M weekly downloads |
| EventSource API | browser | API estandar de SSE en webview | Bajo — soporte universal en browsers modernos |
| HC server existente | internal | Express router actual de HC | Bajo — agregar ruta no rompe existentes |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| H1 refutada: chokidar no funciona confiable en macOS para nuestro caso | low | medium | Fallback polling cada 500ms en S1.T2 (decision en S1.GATE). Trade-off CPU vs predictibilidad documentado |
| Memory leak por watchers no cerrados | medium | medium | ref-count en WatcherPool + cleanup en `req.on('close')` (S3.T2). Log cada create/destroy |
| Race condition write-en-flight vs read | medium | low | `awaitWriteFinish` de chokidar espera estabilidad. Si el LLM principal escribe en multiples passes, espera 300ms entre el ultimo y emit |
| Scope re-render mas amplio del esperado (toda la pagina re-renderea) | low | high | S2.T3 valida granularidad manual + investiga store del cliente en S2.T1. Si arquitectura no permite granularidad fina, escalar decision |
| Reload completo de pagina pierde watcher | high | low | EventSource se re-subscribe en `onMounted` automaticamente. Sin estado persistente |
| Concurrencia con `dkc-reindex` manual | low | low | Watcher y reindex no se tocan (rutas independientes, DB vs markdown read) |

## Open questions

- **HC abierto en multiples tabs**: ¿2 ventanas mismo ticket → cada uno SSE? **Default**: si, cada tab abre su EventSource. Server hace ref-count para no duplicar watcher. Confirmado en S3.T2.
- **Backpressure**: ¿que pasa si markdown cambia 10 veces en 1 segundo? **Default**: debounce 300ms → 1 evento. Cliente re-fetcha 1 vez. Verificable en S1.T4.
- **Scope del re-render**: ¿solo `## Sessions` o todo el body? **Default**: solo Sessions (decision en spec). Frontmatter sigue por reindex.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: SSE sobre WebSocket

- **Contexto**: necesitamos canal push server→cliente para eventos `ticket-changed`
- **Drivers**: simplicidad (high), bidirectional NO necesaria (low), latencia subsegundo (mid)
- **Opcion elegida**: SSE (Server-Sent Events) sobre HTTP
- **Alternativas**: WebSocket (descartada — upgrade handshake innecesario para push unidirectional); long polling (descartada — costo por reconexion); webhook al cliente (descartada — cliente no expone server)
- **Consecuencias**: simple. EventSource API estandar. Limit: 6 conexiones SSE concurrentes por dominio en browsers (no problema para HC single-tenant local)
- **Session**: design (pre-S1)

### DEC-LOCAL-02: chokidar sobre `fs.watch` nativo

- **Contexto**: file watcher cross-OS
- **Drivers**: confiabilidad macOS (high), cross-OS (mid), tamano binario (low)
- **Opcion elegida**: chokidar (~1.5MB)
- **Alternativas**: `fs.watch` nativo (descartada — caveats macOS conocidos); polling con `setInterval` + `fs.stat` (fallback solo si chokidar falla)
- **Consecuencias**: dependencia npm. Abstracion confiable. Soporte `awaitWriteFinish` built-in
- **Session**: design (pre-S1)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de cada REQ pasan. UX manual <500ms confirmada
- [ ] **Tests**: TC-01..14 ejecutados, Status `pass` (DET-25 — registro inline en session que los ejecuta)
- [ ] **NFRs**: latencia <500ms p95, memory <5MB por watcher, 10 watchers concurrentes sin degradacion
- [ ] **Rules**: DET-15/20/23 respetadas. Gates S{N}.GATE ejecutados con Quality review DET-23 donde aplica
- [ ] **Integration**: HC sigue funcional sin watcher (degrada bien). Reindex post-gate sin afectar
- [ ] **Docs**: spec actualizado con ejecucion. Ticket cerrado con teach-close (skip o done)
