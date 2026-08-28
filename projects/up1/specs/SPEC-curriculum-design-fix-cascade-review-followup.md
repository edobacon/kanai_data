---
id: SPEC-curriculum-design-fix-cascade-review-followup
project: up1
ticket: TICKET-109
status: in_progress
---

# Fix de hallazgos de review Dredd sobre el motor de borrado en cascada (UPONE-1382)

# Fix de hallazgos de review Dredd sobre el motor de borrado en cascada (UPONE-1382)

## Executive summary — lo que estas aprobando

**Que se quiere**: cerrar los 4 hallazgos de la revision Dredd sobre el motor de borrado en cascada antes
de mergear. Dos son bloqueantes: la auditoria en cascada no registra quien borro (queda `userId: null`), y el
modal de confirmacion muestra claves tecnicas crudas (`CurricularSection:Session: 3`) en vez de nombres. Dos
son limpiezas: un filtro Prisma con cleverness muerta + comentario incorrecto, e ids internos de DKC en
comentarios del repo. Al final, la auditoria atribuye correctamente, el modal muestra nombres legibles, y el
codigo queda sin las dos deudas cosmeticas.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | F2: mapear labels en **backend** reusando `getObjLabels`, label del **RecordType** (fallback objectType), **relabel in-place** de `byRecordType` | Cambia el contrato documentado del formato de `byRecordType`; resuelto por el dev 2026-07-15 (ver ticket Decision matrix) |
| 2 | F1: **exportar `actorUserId`** de `withDataLog.js` y reusarlo (vs replicar la coercion a Int) | Evita duplicar la logica de coercion string→Int del actor; un solo punto de verdad |

**Riesgos principales y como los mitigamos**:

- **Relabel in-place cambia el contrato de `byRecordType`** → actualizar la doc del formato y verificar los 2 consumers reales (RecordList, MCP `porTipo`) en la misma session; TC de smoke del modal con evidencia runtime.
- **`getObjLabels` podria no resolver el RecordType** (`rt` como `Session`) → fallback explicito al label del objectType; se valida en S2 antes de dar por hecho el label del rt.
- **Cambiar codigo core sin romper la integracion 7/7** → S1 corre la suite de integracion contra UPU como gate; la regresion de F1 asierta el `userId` sin alterar el resto.

**Que NO se hace en este ticket**:

- Las fugas de ids internos en archivos que este follow-up no toca (`instance.resolver.js:3788`, `deep-clone-polymorphic.js:78`, `version-from-source.js:40`) → Backlog B1 (priority could).
- Merge a develop → gated por revision del team up1 (RULE-dev-004), fuera del cierre DKC.

**Tamano estimado**: 2 sessions. S1 (F1+F3+F4, ~2h, la mas riesgosa por la regresion de auditoria en cascada) y
S2 (F2, ~1.5h, incluye smoke del modal).

**Como vas a saber que funciona**:
- Borro en cascada un registro con hijos y en el visor de historial cada entrada hija muestra el usuario que borro (no vacio).
- Abro el modal de borrado y el desglose dice "Sesion: 3", no "CurricularSection:Session: 3".
- La suite de integracion del motor sigue 7/7 verde.

---

## Purpose

Corregir 4 defectos localizados en el motor de borrado en cascada (`deleteImpactPlan.js`) y su consumo
(auditoria via `withDataLog.js`, exposicion GraphQL en `instance.resolver.js`, render del desglose en
`RecordList.vue` + `CriticalWarningModal.vue`, y reflejo en el MCP `instances.ts`). Trabajo layer:core sobre la
rama `feat/UPONE-1382-hard-delete-cascade`.

## Requirements

### REQ-FIX-01: La auditoria de borrado en cascada registra el actor

> **Que cambia**: al borrar en cascada, cada entrada `core_DataLog` de los nodos hijos guarda el `userId` del
> usuario que ejecuto el borrado, igual que ya hace el borrado directo.
> **Por que**: hoy queda `userId: null` (anonimo), rompiendo el contrato de `datalog.md` y dejando la auditoria
> del borrado en cascada sin atribucion.

El sistema MUST persistir el `userId` del actor (`context.user`) en cada entrada DataLog escrita por
`writeDeleteDataLog` durante un borrado en cascada. La coercion del id a Int MUST reusar la misma logica que la
ruta generica (`actorUserId` de `withDataLog.js`).

**Actor**: system (atribuido al user autenticado)
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: borrado en cascada con actor conocido
- **GIVEN** un registro con hijos declarados y `context.user.id = 1`
- **WHEN** se ejecuta el borrado en cascada (motor)
- **THEN** cada entrada `core_DataLog` DELETE de los nodos (padre + hijos) tiene `userId = 1`

#### Scenario: user.id string
- **GIVEN** `context.user.id = "1"` (string)
- **WHEN** se ejecuta el borrado en cascada
- **THEN** el `userId` persistido es `1` (Int), no la cadena ni null

#### Scenario: sin actor
- **GIVEN** `context.user` ausente (proceso interno)
- **WHEN** se ejecuta el borrado en cascada
- **THEN** el `userId` es `null` (comportamiento tolerado; no rompe)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: borra en cascada un registro con hijos y en el visor de historial
del OM editor cada entrada hija muestra el usuario que borro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Atribucion en cascada | subarbol + user.id=1 | delete cascada | userId de nodo hijo | `1` |
| 2 | Coercion string | user.id="1" | delete cascada | tipo de userId | Int `1` |

### REQ-FIX-02: El modal muestra nombres legibles en el desglose de cascada

> **Que cambia**: el desglose "se borraran N elementos" del modal de confirmacion muestra el nombre legible del
> tipo (ej. "Sesion: 3") en vez de la clave tecnica (`CurricularSection:Session: 3`).
> **Por que**: la misma pantalla ya usa nombres semanticos para las restricciones (Restrict); el desglose de
> cascada quedo con la clave cruda interna, inconsistente y confuso para el usuario.

El sistema MUST exponer el desglose por tipo con labels legibles resueltos en **backend** via `getObjLabels`.
El label MUST ser el del RecordType (`rt`) cuando `getObjLabels` lo resuelva; si no lo resuelve, MUST caer al
label del objectType. Para la clave base (`__base__`) MUST usar solo el label del objectType. El mapeo MUST ser
**in-place** sobre `byRecordType` (las claves pasan a ser labels).

**Actor**: user
**Layers**: backend, api, frontend (consumo), config (doc del contrato)

<details><summary>Scenarios de validacion</summary>

#### Scenario: desglose con RecordType
- **GIVEN** un subarbol con `CurricularSection` de RecordType `Session` (3 nodos)
- **WHEN** se pide el preview de impacto (cascade)
- **THEN** `byRecordType` tiene la clave con el label del RecordType (ej. `"Sesion": 3`), no `"CurricularSection:Session": 3`

#### Scenario: RecordType sin label resoluble
- **GIVEN** un `rt` que `getObjLabels` no resuelve en `core_ObjectDefinition`
- **WHEN** se arma el desglose
- **THEN** la clave usa el label del objectType como fallback (nunca la clave cruda ni `__base__`)

#### Scenario: nodos base
- **GIVEN** nodos sin RecordType (`__base__`)
- **WHEN** se arma el desglose
- **THEN** la clave es el label del objectType, sin sufijo ni centinela

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el modal de borrado sobre un objeto con hijos y el desglose
muestra nombres legibles, sin `:` tecnicos ni `__base__`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Label de RecordType | CurricularSection:Session x3 | preview | clave del desglose | label legible del rt |
| 2 | Fallback objectType | rt sin label | preview | clave del desglose | label del objectType |
| 3 | MCP coherente | subarbol cascade | tool MCP delete preview | `porTipo` | labels legibles |

### REQ-FIX-03: Simplificar el filtro `active` y corregir su comentario

> **Que cambia**: `active: true !== false` se reemplaza por `active: true` con un comentario correcto.
> **Por que**: `true !== false` evalua a `true` (cleverness muerta) y el comentario "incluir nulls" es falso
> (`active` es not_null; `active=false` es soft-delete).

El sistema MUST filtrar las `core_FieldDefinition` de tipo reference por `active: true` con un comentario que
refleje el comportamiento real (solo definiciones vigentes; `active=false` es soft-delete). El cambio MUST ser
zero-behavior-change respecto al valor efectivo actual.

**Actor**: system
**Layers**: backend

#### Acceptance
**El usuario puede verificar que funciona**: la suite del motor (unit + integracion) da los mismos resultados
que el baseline; la deteccion de FKs no cambia.

### REQ-FIX-04: Quitar ids internos de DKC/KB de los comentarios del repo

> **Que cambia**: los comentarios que citan `RULE-core-023` y `TICKET-104` pasan a texto llano o al id externo
> `UPONE-1382`, segun DET-19.
> **Por que**: otros devs leen el repo sin acceso a DKC; los ids internos no significan nada fuera del KB.

El sistema MUST reemplazar, en los archivos tocados por este ticket, `RULE-core-023` por texto llano y
`TICKET-104` por `UPONE-1382` en comentarios de codigo/tests. No MUST alterar la logica.

**Actor**: system
**Layers**: backend (comentarios/tests)

#### Acceptance
**El usuario puede verificar que funciona**: `grep "RULE-core-023\|TICKET-104"` en los archivos del scope
retorna 0 matches.

## Tasks

### Session 1 — F1 (auditoria) + F3 (active) + F4 (ids internos) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Exportar `actorUserId` de `withDataLog.js` (dejar de ser privada) | REQ-FIX-01 | developer | — | object-manager/src/events/decorators/withDataLog.js | vitest area withDataLog | git revert | DET-32, RULE-core-028 | done | 1 |
| S1.T2 | `writeDeleteDataLog` acepta `userId` y lo escribe; el caller lo computa desde `context.user` via `actorUserId` y lo pasa | REQ-FIX-01 | developer | S1.T1 | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | vitest unit deleteImpactPlan | git revert | DET-5, DET-8 | done | 1 |
| S1.T3 | Regresion: asertar `userId` del actor en entradas DataLog de nodos hijos en cascada | REQ-FIX-01 | developer | S1.T2 | object-manager/tests/integration/hard-delete-cascade.integration.test.js | vitest integration (UPU) | git revert | DET-7, DET-13 | done | 1 |
| S1.T4 | Simplificar `active: true !== false` → `active: true` + comentario correcto | REQ-FIX-03 | developer | — | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | vitest area motor | git revert | DET-5 | done | 1 |
| S1.T5 | Reemplazar ids internos (`RULE-core-023`→texto llano; `TICKET-104`→`UPONE-1382`) en los archivos tocados | REQ-FIX-04 | developer | — | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js, object-manager/tests/unit/resolvers/deleteImpactPlan.test.js, object-manager/tests/integration/hard-delete-cascade.integration.test.js | grep 0 matches | git revert | DET-19 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir en `## Sessions`, correr unit + integracion (7/7 UPU), quality review, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + integracion 7/7 + TC-1/TC-3/TC-4 pass | (no aplica) | DET-20, DET-23, DET-27, DET-33 | done | 1 |

### Session 2 — F2 (labels legibles en el modal) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Verificar que `getObjLabels` resuelve un RecordType (`rt`); confirmar fallback a objectType | REQ-FIX-02 | developer | S1.GATE | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | prueba puntual introspeccion | (no aplica — investigacion) | DET-4, DET-5 | done | 2 |
| S2.T2 | Relabel in-place de `byRecordType`: mapear `${objectType}:${rt}` → label del rt (fallback objectType); `__base__` → label objectType | REQ-FIX-02 | developer | S2.T1 | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | vitest unit deleteImpactPlan | git revert | DET-5, DET-16, RULE-core-028 | done | 2 |
| S2.T3 | Actualizar el contrato documentado del formato de `byRecordType` (doc/schema) + verificar coherencia de consumers (RecordList, MCP `porTipo`) | REQ-FIX-02 | developer | S2.T2 | object-manager/docs/features/datalog.md, up1-mcp:src/core/instances.ts | grep + lectura consumers | git revert | DET-16 | done | 2 |
| S2.T4 | Smoke del modal (evidencia runtime real, DET-36): desglose con labels legibles | REQ-FIX-02 | developer | S2.T2 | layout/src/layouts/RecordList.vue (consumo), layout/src/components/organisms/Modal/CriticalWarningModal.vue (consumo) | smoke UI runtime | (no aplica — verificacion) | DET-25, DET-36 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, quality review, decidir continue/close | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + TC-2 pass (smoke runtime) + MCP verificado | (no aplica) | DET-20, DET-23, DET-27, DET-33, DET-36 | done | 2 |

### Task contract

```
Task S1.T2: writeDeleteDataLog persiste el actor
- source_ref: REQ-FIX-01
- agent: developer
- files: object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js
- precondition: S1.T1 (actorUserId exportada)
- expected_output: writeDeleteDataLog recibe userId y lo escribe; el caller lo computa desde context.user
- validation: vitest run deleteImpactPlan + integracion
- rollback: git revert
- rules: [DET-5, DET-8]
```

## Constraints

- RULE-core-028: la metadata de objeto no llega al FE; la semantica se resuelve por capa — driver de D1 (mapear labels en backend).
- RULE-core-031: comparar pertenencia por identidad normalizada — contexto del motor, no alterar en este fix.
- RULE-dev-004: trabajo layer:core en rama de ticket/epica (aqui `feat/UPONE-1382-...`), commits `UPONE-1382`, merge gated por team up1.
- DET-19: ids externos en artefactos del repo (F4).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Relabel in-place rompe un consumer del formato crudo | medium | modal/MCP muestran mal | S2.T3 verifica RecordList + MCP en la misma session; doc actualizada |
| `getObjLabels` no resuelve el rt | medium | label cae a objectType | fallback explicito (S2.T1 lo valida antes) |
| Cambio en cascada rompe integracion | low | regresion del motor | S1.GATE corre integracion 7/7 UPU como gate |

## Open questions

(ninguna — D1/D2/D3 de F2 resueltas por el dev 2026-07-15)

## Decisions

### DEC-LOCAL-01: F2 se resuelve en backend, label del RecordType, relabel in-place
- **Contexto**: el desglose del modal mostraba claves crudas; habia 3 formas de resolverlo.
- **Drivers**: RULE-core-028 (semantica donde vive el dato), cero cambio en layout core, beneficio para el MCP.
- **Opcion elegida**: mapear en backend con `getObjLabels`, label del RecordType (fallback objectType), relabel in-place de `byRecordType`.
- **Alternativas**: frontend (descartada — sin labels a mano, toca core, no comparte con MCP); campo paralelo `byTypeLabeled` (descartada — backward-compat pero exige tocar consumers).
- **Consecuencias**: cambia el contrato documentado del formato de `byRecordType`; se actualiza la doc.
- **Session**: intake (dev 2026-07-15).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-FIX-01..04 pasan
- [ ] **Tests**: TC-1 (userId cascada), TC-2 (smoke modal), TC-3 (regresion active), TC-4 (grep ids) pasando
- [ ] **NFRs**: n/a
- [ ] **Rules**: RULE-core-028 (backend labels), DET-19 (ids externos), RULE-dev-004 (rama/commits core) respetadas
- [ ] **Integration**: suite de integracion del motor 7/7 verde (sin delta)
- [ ] **Docs**: `datalog.md` / contrato de `byRecordType` actualizado
