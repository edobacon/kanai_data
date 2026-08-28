---
id: RULE-dev-restitute-rbac-on-nondelegating-resolver
project: up1
type: rule
module: dev
tags:
  - rbac
  - security
  - resolver
  - transaction
  - auth
  - mods
  - object-manager
---

# Un resolver mod-owned que NO delega en el createInstance/updateInstance generico DEBE restituir el RBAC explicito antes de la transaccion

## What

En OM, el `createInstance`/`updateInstance` generico aporta un wrapper de autorizacion (`withObjectAuth('<action>')`) que verifica la capability del usuario antes de mutar. Un resolver **mod-owned** que, por atomicidad, escribe **directo** contra `tx.<model>.create/update/delete` (sin delegar en el generico) **pierde** ese wrapper y queda **sin check de capability** -> bypass de RBAC (cualquier usuario del tenant puede mutar).

Regla: cuando un resolver custom no delega en el generico, DEBE restituir el RBAC a mano llamando `checkObjectPermissions(context, objectType, action)` (cargado por dual-path desde `authChecker.js`) ANTES de abrir la transaccion.

**Generalizacion (TICKET-127): el generico aporta TRES decorators, no solo auth.** La cadena es `withEventPublish -> withObjectAuth -> withDataLog -> resolver`. Un resolver no-delegante los saltea a los tres y DEBE restituir cada uno que aplique:
1. **Auth** (`withObjectAuth`): `checkObjectPermissions` ANTES de la transaccion (lo de arriba).
2. **Eventos** (`withEventPublish`): emitir el evento de dominio POST-commit, por fila (evita la fuga pre-commit).
3. **Auditoria** (`withDataLog`): llamar `recordMutationDataLog` del core POST-commit, por fila, con el shape que su firma exige (create pasa `args.data`; delete toma `recordId` de `args.id`, no de `previous.id`). Omitirlo deja las mutaciones del resolver fuera del historial `core_DataLog` (mientras el path unitario si audita) — inconsistencia silenciosa, porque el core traga el error internamente si el shape es incompleto.

Los tres son best-effort para eventos/audit (no rompen la mutacion) pero el de auth es bloqueante (throwea antes de mutar).

**Patron recurrente (lo caro de descubrirlos de a uno):** en `planEntry-batch` los tres decorators se perdieron JUNTOS (un solo cambio a `tx.create` directo) pero se descubrieron y restituyeron DE A UNO, ticket por ticket: **RBAC** en TICKET-120 (S5, cazado por re-juez), **eventos** en TICKET-126, **DataLog** en TICKET-127 (cazado por spec-judge). Tres incidentes del mismo error de raiz, tres ciclos. **Directiva preventiva: al escribir un resolver no-delegante, enumera la cadena COMPLETA del generico y restituilos TODOS de una** (auth + eventos + DataLog + cualquiera que se agregue), no los descubras de a uno. Si el generico gana un decorator nuevo, estos resolvers son los primeros a auditar.

**Segundo caso, mismo error de raiz (up1-manager, UPONE-1503):** `manageAppRoles` escribe directo contra la tabla junction `up1_suite_app_role` (nunca delego en el CRUD generico, porque el cambio de roles no es una mutacion de instancia estandar) y no tenia `requireCapability` en absoluto: cualquier token de tenant valido podia reasignar los roles de una app, y el audit log apuntaba a un modelo (`prisma.dataLog`) inexistente en el cliente tenant-scoped, asi que tampoco quedaba rastro. El fix restituyo los dos: `requireCapability(APP_ROLE_CAP.CREATE, requireCapability(APP_ROLE_CAP.DELETE, ...))` antes de la transaccion (`mods/up1-manager/logic/appRoles.resolver.js:86-87`) y una entrada semantica manual en `core_DataLog` post-commit (`:145-163`). No es el mismo resolver ni el mismo mod que `planEntry-batch`, pero es la misma clase de bug: un resolver custom que nunca paso por el generico, y por lo tanto nunca tuvo el wrapper de auth ni el de auditoria hasta que alguien lo restituyo a mano.

Trade-off que fija la decision de delegar vs escribir directo:
- **Delegar** en el generico: da auth + eventos + auditoria gratis, pero puede filtrar eventos pre-commit (rompe atomicidad).
- **Create/update/delete directo** en la `$transaction`: da atomicidad real, pero exige restituir la auth (bloqueante) y, POST-commit, los eventos y la auditoria DataLog a mano.

## Why

Al reescribir `createPlanEntriesBatch` de delegacion a `tx.planEntry.create` directo (para cerrar una fuga de eventos pre-commit que rompia la atomicidad del lote), se perdio silenciosamente el `withObjectAuth('create')` que daba la delegacion. Resultado: cualquier usuario autenticado del tenant podia crear `planEntry` en cualquier plan. Un re-juez lo clasifico CRITICAL. El bug es facil de introducir porque el cambio "por atomicidad" parece ortogonal a la seguridad, pero no lo es: la auth viajaba acoplada a la delegacion.

## Where

- **Files**: `object-manager/.../logic/<resolver>.resolver.js` (resolvers mod-owned que usan `$transaction` + escritura directa); `authChecker.js` (`checkObjectPermissions`, dual-path load); precedentes: `polymorphicUpdate.resolver.js`, `sectionValidation.resolver.js:26-28` (documenta el trade-off inverso).
- **Layers**: backend / api / security.

## When

Siempre que un resolver custom mod-owned NO delegue en el `createInstance`/`updateInstance` generico y escriba directo contra el cliente Prisma dentro de una transaccion. Si delega, la auth ya viene incluida (no duplicar).

## Verification

- Test de integracion con el `checkObjectPermissions` REAL (no mock): SIN la capability -> denegado ANTES de abrir la `$transaction` (0 mutaciones); CON la capability -> muta; sin usuario -> `UNAUTHENTICATED`.
- **Cadena completa de una**: por cada resolver no-delegante, verificar que restituye los TRES decorators (auth + eventos + DataLog), no solo uno. Contrastar contra el generico (`instance.resolver.js` create/delete) que envuelve la cadena. Un resolver con RBAC pero sin eventos ni DataLog (o viceversa) es el hallazgo.
- Grep del resolver: toda escritura directa `tx.<model>.(create|update|delete)` debe estar precedida por un `checkObjectPermissions`/guard de auth en el mismo handler.
- **Auditoria (TICKET-127)**: por cada resolver no-delegante, verificar que restituye `recordMutationDataLog` post-commit. Test no-mockeado (core real + prisma fake) que asevere `recordId` + `historyKey` poblados; un test que solo mockea el core no distingue un shape roto (omitir `args`), porque el core lo traga best-effort.

## Source

- **Discovered in**: TICKET-120 (UPONE-1539), Session 5 (introducido por el fix de atomicidad, cazado en el re-juez del gate). Generalizacion a los 3 decorators en TICKET-127 (mitad de audit del backlog B5).
- **Evidence**: L6 del ticket. Fix verificado 1:1 contra el dual-path de `polymorphicUpdate.resolver.js`; cobertura en `planEntry-batch-rbac.test.js` (3 tests, auth real, B7 resuelto). Auditoria: `planEntryDataLog.js` + `planEntryDataLog.{test,realcore.test}.js` (TICKET-127).
- **Related**: RULE-dev-004 (trabajo core); backlog B5 (eventos + audit post-commit del create/delete directo — RESUELTO: eventos en planEntryEvent.js, audit en TICKET-127).
