---
id: SPEC-anonymize-real-db-test
project: pehuen
ticket: PEH-027
status: done
---

# Prueba con DB real para anonymizeUser + patron reutilizable de test-db

# Prueba con DB real para anonymizeUser + patron reutilizable de test-db

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive en Requirements / Changes / Tasks.*

**Que se quiere**: `anonymizeUser` (borrado PII, Ley 21.719) hoy esta cubierta solo con `vi.mock`: los tests verifican que se **llama** a `updateOne`/`updateMany` con ciertos argumentos, pero nada confirma que la mutacion realmente **persiste** el documento esperado. El proyecto no tiene ninguna capa de test con Mongo real. Este ticket agrega una prueba hermetica contra una Mongo efimera en memoria (`mongodb-memory-server`) que llama a la funcion real, lee el documento de la DB y asserta el resultado; y deja el helper de setup/teardown reutilizable para otras funciones de codigo de datos que hoy solo se prueban mockeadas.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Opcion A (`mongodb-memory-server`) sobre Opcion B (integracion vs Mongo staging) | La infra de integracion actual es HTTP contra staging (`:4402`/`:4400`) con MSW, no accede a Mongo directo, y `anonymizeUser` es service-layer sobre modelos Mongoose. B no permite assertar el documento persistido sin levantar staging + seed; A corre en el CI que agrego PEH-025, sin infra externa. Es una **devDependency**, no toca runtime. |
| 2 | El test real usa la implementacion **real** de `userIdFilter` (via `vi.stubGlobal` con el impl importado de `server/utils/auth.ts`), no un fake | `anonymizeUser` referencia `userIdFilter` como auto-import de Nitro (global). Si se stubea con un fake `(id)=>({_id:id})` como el test mockeado, el filtro `{_id:{$in:[ObjectId,string]}}` no se ejercita y la prueba dejaria de ser fiel. |

**Riesgos principales y como los mitigamos**:

- **`mongodb-memory-server` descarga un binario de Mongo la primera vez (lento/red en CI)** → cachear el binario en CI; documentar el costo; el download ocurre una vez por runner.
- **La prueba real destapa un bug de runtime en `anonymizeUser`** → es el objetivo del ticket; clasificar introducido vs preexistente y **reportar**, no silenciar el test (Warning del ticket).
- **`$unset: { ip }` sobre un campo `required` del schema AuditLog** → `updateMany` no corre validators por default; se verifica leyendo el doc que `ip` quedo ausente (TC-2).

**Que NO se hace en este ticket**:

- Migrar los otros tests mockeados a DB real (solo se deja el helper listo; migracion masiva queda fuera de scope).
- Borrar el test mockeado existente (`user-anonymize.test.ts`): complementa, no reemplaza.
- Levantar staging o tocar `vitest.integration.config.ts` (esa capa es HTTP-paridad, ortogonal).

**Tamano estimado**: 1 session (S1), aprox. 2h. La parte mas riesgosa es el bootstrap de `mongodb-memory-server` con Mongoose 9 y que el auto-import global quede bien inyectado.

**Como vas a saber que funciona**:

- `pnpm test:run` corre el nuevo archivo y sus casos pasan (o reportan un bug real clasificado).
- El caso asserta sobre el documento **leido de la DB** (`User.findById`, `AuditLog.find`), no sobre spies.
- La suite existente (699 unit) sigue verde.

---

## Purpose

Agregar una prueba con Mongo real-en-memoria que confirme que `anonymizeUser` **persiste** la anonimizacion (PII borrada del User, `active:false`, `tokenVersion` incrementado, refs preservadas, AuditLog con `userEmail:'anonimo'` y sin `ip`), y dejar un helper `withTestDb` reutilizable para futuras pruebas de codigo de datos. Cierra el punto debil #4 de la auditoria 2026-07-19 (tests mockeados consagran bugs de runtime en codigo de datos).

## Requirements

> **Que cambia (REQ-IMPROVE-01)**: aparece un test que corre `anonymizeUser` contra Mongo efimera y asserta el documento resultante leido de la DB.
> **Por que**: el mock solo prueba que se llamo al metodo, no que la mutacion produce el estado esperado.

**REQ-IMPROVE-01**: El proyecto MUST tener una prueba que ejecute `anonymizeUser(userId)` contra una Mongo real-en-memoria y asserte, leyendo el documento de la DB (no un spy):
- `nombre === 'Usuario eliminado'`, `email === 'deleted-<id>@anonimo.local'`, `password === 'DELETED'`, `active === false`, `tokenVersion === <previo>+1`.
- Campos no-PII de referencia preservados (`_id`, `rut`, `createdBy`, `role`).

<details><summary>Scenarios de validacion</summary>

- GIVEN un User sembrado con PII real WHEN se llama `anonymizeUser(user._id)` THEN el doc releido tiene la PII borrada, `active:false` y `tokenVersion` +1.
- GIVEN el mismo User WHEN se anonimiza THEN `_id`, `rut` y `createdBy` no cambian.
</details>

> **Que cambia (REQ-IMPROVE-02)**: el AuditLog del usuario queda anonimizado y sin IP tras la operacion, verificado sobre la DB.
> **Por que**: `$unset` de un campo `required` es un caso que el mock no valida.

**REQ-IMPROVE-02**: El test MUST assertar que, tras `anonymizeUser`, todos los `AuditLog` con ese `userId` tienen `userEmail === 'anonimo'` y `ip` ausente, mientras `userId` se preserva (integridad referencial).

<details><summary>Scenarios de validacion</summary>

- GIVEN N AuditLog sembrados para el user (con `ip` presente) WHEN se anonimiza THEN los N docs releidos tienen `userEmail:'anonimo'`, sin `ip`, con `userId` intacto.
</details>

> **Que cambia (REQ-IMPROVE-03)**: existe un helper reutilizable de test-db.
> **Por que**: permite escribir futuras pruebas de codigo de datos sin re-armar el boilerplate de Mongo efimera.

**REQ-IMPROVE-03**: El proyecto SHOULD exponer un helper `withTestDb` (o equivalente) en `tests/helpers/` que arranque `mongodb-memory-server`, conecte Mongoose, y limpie colecciones/desconecte en teardown, usable por cualquier test de codigo de datos.

**REQ-PRESERVE-01**: La suite unit existente (699 tests) MUST seguir verde. El test mockeado `user-anonymize.test.ts` MUST permanecer (complementa la prueba real, no la reemplaza).

**REQ-PRESERVE-02**: `mongodb-memory-server` MUST agregarse como `devDependency`. El runtime de produccion MUST permanecer sin cambios (cero deps nuevas en prod, cero cambios en `server/`).

## Changes

### Added: devDependency

| Field | Value | Purpose |
|-------|-------|---------|
| `mongodb-memory-server` | `devDependencies` | Mongo efimera en memoria para tests hermeticos de codigo de datos |

### Added: helper de test-db

| Artefacto | Ubicacion | Contenido |
|-----------|-----------|-----------|
| `withTestDb` | `tests/helpers/test-db.ts` | `beforeAll` arranca `MongoMemoryServer` + `mongoose.connect`; `afterEach` limpia colecciones; `afterAll` desconecta + `stop()`. Exporta funcion/setup reutilizable. |

### Added: test real

| Artefacto | Ubicacion | Contenido |
|-----------|-----------|-----------|
| suite real-DB | `tests/integration/server/services/user-anonymize.realdb.test.ts` (o `tests/unit/.../*.realdb.test.ts` segun donde corra sin contaminar MSW) | Usa `withTestDb` + `vi.stubGlobal('userIdFilter', <impl real>)`; siembra User + AuditLogs; corre `anonymizeUser`; asserta sobre docs releidos. |

> **Nota de ubicacion**: la config integration actual (`vitest.integration.config.ts`) es HTTP-paridad con jsdom + MSW y NO sirve para este test (necesita entorno node + Mongo, sin MSW). Decidir en S1.T1: (a) archivo bajo `tests/unit` con `environment: 'node'` por-archivo (`// @vitest-environment node`) para que corra en `pnpm test:run`, o (b) una config/proyecto vitest dedicado `test:realdb`. Preferencia (a) si el override por-archivo funciona con el pool actual; registrar la decision.

## Tasks

```
Task S1.T1: Infra de test-db (dep + helper)
- source_ref: REQ-IMPROVE-03, REQ-PRESERVE-02
- agent: developer
- files: package.json (devDependencies), tests/helpers/test-db.ts
- validation: helper arranca MongoMemoryServer, conecta Mongoose 9, limpia y desconecta; un smoke minimo (insert+find) pasa
- rollback: git revert; quitar la devDependency del package.json + lockfile
- rules: [DET-1, DET-2, DET-8, DET-11, DET-32]

Task S1.T2: Test real de anonymizeUser
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-02
- agent: developer
- depends_on: S1.T1
- files: tests/.../user-anonymize.realdb.test.ts
- validation: TC-1 y TC-2 assertan sobre documentos leidos de la DB (User.findById / AuditLog.find), no sobre spies; userIdFilter real inyectado por stubGlobal
- rollback: git revert (solo archivo de test)
- rules: [DET-5, DET-7, DET-8, DET-10, DET-33, DET-36]

Task S1.T3: Correr suite, clasificar bugs, verificar regression
- source_ref: REQ-PRESERVE-01, REQ-IMPROVE-01
- agent: reviewer
- depends_on: S1.T2
- validation: pnpm test:run verde (699 + nuevos); si el test real destapa un bug de runtime en anonymizeUser -> clasificar introducido/preexistente y reportar (no silenciar); el test mockeado sigue presente
- rollback: N/A (verificacion)
- rules: [DET-4, DET-5, DET-7, DET-13, DET-14, DET-33]
```

**Particion en sessions (DET-20)**: 1 session (S1), tier **T2** (multi-archivo: dep + helper + test; sin UI runtime). Gate ⚑ fuerte porque valida empiricamente la hipotesis "el mock no muerde" (puede destapar un bug real).

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When |
|--------|--------------------|--------|----------------|------|
| Cobertura real (no-mock) de `anonymizeUser` | 0 (solo mock) | 1 suite real-DB verde | `pnpm test:run` | S1.GATE |
| Bugs de runtime destapados | desconocido | clasificados y reportados | inspeccion de resultados | S1.GATE |
| Capa de test-db reutilizable | inexistente | helper `withTestDb` disponible | code review | S1.GATE |

## Constraints

- Mongoose 9 (`^9.2.4`), Vitest 4 (`^4.0.18`), pnpm. Codigo en ingles, contenido en espanol.
- Cero `console.*` en runtime (no aplica a tests).
- No tocar `server/` (salvo que S1.T3 destape un bug y el dev apruebe el fix como sub-task).

## Dependencies

- Ninguna bloqueante. `depends_on: PEH-025` (soft): el valor pleno se realiza cuando el CI corre el test.

## Risks

- **Descarga del binario de Mongo en CI**: primera corrida lenta; cachear. Mitigado por naturaleza one-time por runner.
- **Auto-import global mal inyectado**: si `userIdFilter` no se stubea, el test tira ReferenceError; se detecta de inmediato en la primera corrida.

## Open questions

- Ubicacion exacta del test (unit con `@vitest-environment node` vs config dedicada): se resuelve en S1.T1 y se registra decision.

## Acceptance

- [x] REQ-IMPROVE-01: test real asserta persistencia del User desde la DB (TC-1 verde)
- [x] REQ-IMPROVE-02: test real asserta AuditLog anonimizado (sin `ip`, `userEmail:'anonimo'`, `userId` intacto) (TC-2 verde)
- [x] REQ-IMPROVE-03: helper `setupTestDb` reutilizable (`tests/helpers/test-db.ts`)
- [x] REQ-PRESERVE-01: suite existente verde (701/701) + test mockeado intacto
- [x] REQ-PRESERVE-02: `mongodb-memory-server` como devDependency, `server/` sin cambios
