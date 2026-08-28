---
id: SPEC-core-improve-sp3-quality
project: up1
ticket: TICKET-056
status: done
---

# Calidad de código SP3 — quick wins, type-safety en layout y guard de atomicidad RT

# Calidad de código SP3 — quick wins, type-safety en layout y guard de atomicidad RT

## Executive summary — lo que estas aprobando

**Que se quiere**: promover los hallazgos accionables de la auditoría SP3 (TICKET-055) cuyo fix toca SOLO código introducido por el sprint. Son tres clases de mejora sin riesgo de arrastre: limpieza de ruido/dead-code, endurecimiento de tipos en los composables de row action de layout, y un guard de robustez que evita el único escenario peligroso del path RecordType (versionar un RT, hoy no-atómico). El objetivo es reducir deuda de mantenibilidad y cerrar un agujero de integridad acotado, sin redibujar arquitectura.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | A3 se resuelve **añadiendo `'none'`** a la unión `EnhancedRowAction.redirectTo`, NO eliminando la interfaz duplicada | Eliminar la interfaz tocaría consumidores pre-existentes (fuera del alcance "sprint-introducido"); añadir es aditivo y seguro |
| 2 | A1 se resuelve **solo con un guard** en `prepareVersionData` (rechazar `asNewVersion` sobre RT), NO unificando el path RT con `$transaction` | La unificación toca código de marzo 2026 y todo create de RT (blast radius alto, core-gated). El guard cierra el riesgo activo (versionado de RT) sin esa cirugía. La unificación queda en backlog como candidato RULE-core |

**Riesgos principales y como los mitigamos**:

- **Un cambio de tipos rompe runtime silenciosamente** → REQ-PRESERVE-01/02: baseline de ambas suites antes de tocar, comparación obligatoria en cada gate (DET-7). Type-safety solo estrecha tipos, no cambia lógica.
- **El guard de A1 bloquea el versionado legítimo de `Activity`** → `Activity` es objeto base (`isRecordType: None`), no RT; el guard solo dispara sobre RT. S2.T2 verifica que el path versionable activo queda intacto.

**Que NO se hace en este ticket**:

- Unificación del path RT con `$transaction` (A1/T1) → backlog B1, candidato RULE-core.
- Dedup transversal (M1/M4/B8/B1/M8 de TICKET-055) → alcanza código pre-sprint, queda `por-triagear`.
- Escalabilidad backend (A2/T2/M5/M6) y bugs de seed del mod (M10/M11/A6/M12/B5) → quedan en TICKET-055.

**Tamaño estimado**: 2 sessions, ~2-3h efectivas. La más sensible es S2 (guard A1 — único cambio de comportamiento, gate ⚑ fuerte).

**Como vas a saber que funciona**:
- Corro la suite de layout y de object-manager y quedan idénticas al baseline.
- El typecheck de layout pasa sin `any`/`Function` en los composables tocados.
- Un test nuevo demuestra que `prepareVersionData` rechaza `asNewVersion` sobre un objeto RT; versionar `Activity` (base) sigue funcionando.

---

## Purpose

Reducir deuda técnica sprint-introducida en object-manager y layout (core, épica UPONE-1206) sin cambiar comportamiento observable, salvo un guard de robustez acotado. Para devs del equipo up1 que mantienen estos composables/helpers y para la integridad del path de versionado/clonado.

## Requirements

### REQ-IMPROVE-01: Eliminar ruido, dead code y formato inconsistente

> **Que cambia**: desaparecen 3 `console.log` de debug en producción, un `catch {}` silencioso pasa a loguear, se elimina una variable sin uso y se normaliza la indentación de un helper.
> **Por que**: el ruido en consola y el código muerto degradan mantenibilidad y ocultan fallas reales (el `catch {}` silenciaba errores de config RT).

El sistema MUST eliminar los 3 `console.log` de `RecordListElement.vue:35,67,79` (quitar o envolver en `import.meta.env.DEV`), MUST loguear con `console.warn` el `catch {}` de `useRowActionHandler.ts:307`, MUST eliminar la variable `prefix` sombreada/sin uso de `validate-polymorphic-children-derived.js:135`, y MUST normalizar `version-from-source.js` a espacios (prettier).

**Actor**: developer (mantenibilidad) / system (sin logs en prod)
**Layers**: frontend (layout), backend (object-manager)

#### Acceptance
**El usuario puede verificar que funciona**: `grep "console.log" RecordListElement.vue` no devuelve líneas sin guard; `prettier --check version-from-source.js` pasa; la suite de cada repo queda verde.

### REQ-IMPROVE-02: Robustez de utilidades de layout

> **Que cambia**: `unwrapRef` usa la API oficial `isRef` de Vue en vez de duck-typing; el regex de `humanizeObjectName` quita el flag `i` redundante.
> **Por que**: el duck-typing (`'value' in value`) puede dar falsos positivos en objetos con campo `value`; el flag `i` sobre prefijos siempre-lowercase es código engañoso.

El sistema MUST reemplazar el duck-typing de `useCreateRowAction.ts:59` por `isRef` de `vue`, y MUST quitar el flag `i` del regex de `humanizeObjectName.ts:33`.

**Actor**: developer
**Layers**: frontend (layout)

#### Acceptance
**El usuario puede verificar que funciona**: tests del área de `useCreateRowAction`/`humanizeObjectName` verdes (incluyendo casos de objetos con campo `value` no-Ref si existen, y prefijos `up1`/`ext`).

### REQ-IMPROVE-03: Type-safety en composables de row action

> **Que cambia**: desaparecen los `any` y `Function` de los composables de row action; el tipo `redirectTo` cubre el valor `'none'` que el runtime ya maneja.
> **Por que**: el compilador hoy no garantiza la aridad de `$t` ni los tipos de `apolloClient/objectType/record/rowId`, y deja pasar `'none'` perdido en `EnhancedRowAction`.

El sistema MUST añadir `'none'` a la unión `EnhancedRowAction.redirectTo` (`useRowActionHandler.ts:37`) — alineándola con `RowAction.redirectTo` (`recordlist.ts:223`) — sin eliminar la interfaz; MUST tipar `$t` como `(key: string, params?: Record<string, unknown>) => string` en `useRowActionHandler.ts:124,256`; y MUST reemplazar los `any` de `useCreateRowAction.ts:38,40,42,68` por `ApolloClient`, `string | Ref<string>` y `Record<string, unknown>` según corresponda.

**Actor**: developer
**Layers**: frontend (layout)

#### Acceptance
**El usuario puede verificar que funciona**: `vue-tsc`/typecheck de layout pasa sin errores; no quedan `any`/`Function` en las firmas tocadas (grep).

### REQ-IMPROVE-04: Dedup de handlers de template

> **Que cambia**: `createDownloadTemplateHandler` y `createImportTemplateHandler` comparten una función privada en vez de copia-pega.
> **Por que**: el copia-pega (`useRowActionHandler.ts:323-349`) duplica lógica que debe evolucionar junta.

El sistema MUST extraer la lógica compartida de ambos handlers a una función privada del módulo, preservando el comportamiento observable de cada handler.

**Actor**: developer
**Layers**: frontend (layout)

#### Acceptance
**El usuario puede verificar que funciona**: tests/render de las row actions download e import siguen comportándose idéntico; la suite layout queda en baseline.

### REQ-IMPROVE-05: Guard de atomicidad — rechazar `asNewVersion` sobre RecordType

> **Que cambia**: `prepareVersionData` lanza un error explícito si se pide `asNewVersion` sobre un objeto RecordType, en vez de dejar correr el path RT (4 writes no-atómicos).
> **Por que**: el path RT de `createInstance` no es atómico (writes fuera del `$transaction` Serializable); versionar un RT correría fuera de la atomicidad prometida por REQ-05 del versionado. Hoy es latente (ningún versionable es RT) pero sin guard nada lo impide.

El sistema MUST rechazar, en `prepareVersionData` (`version-from-source.js`), una solicitud de `asNewVersion` cuando el objeto destino es un RecordType, con un error claro. El guard MUST vivir en el helper puro (upstream del resolver) y NO MUST modificar el path RT de `instance.resolver.js`.

**Actor**: system (integridad de datos)
**Layers**: backend (object-manager)

<details><summary>Scenarios de validacion</summary>

#### Scenario: rechazo sobre RT
- **GIVEN** un descriptor de objeto RecordType (`rt__*`)
- **WHEN** se invoca `prepareVersionData` con `asNewVersion: true`
- **THEN** lanza un error de guard y NO procede a preparar writes

#### Scenario: versionable base sigue funcionando
- **GIVEN** `Activity` (objeto base, `isRecordType: None`, con bloque `versioning`)
- **WHEN** se invoca `prepareVersionData` con `asNewVersion: true`
- **THEN** prepara los datos de versión normalmente (comportamiento previo intacto)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: un unit test nuevo demuestra el rechazo sobre RT; el flujo de versionado de `Activity` (base) sigue verde.

### REQ-PRESERVE-01: Suite de layout sin regresión

> **Que cambia**: nada de comportamiento; este REQ es la red de seguridad.
> **Por que**: DET-7 — mejorar tipos/limpieza no debe romper nada.

El sistema MUST mantener la suite de layout idéntica al baseline (926 tests verdes pre-cambio según TICKET-055).

**Actor**: system
**Layers**: frontend (layout)

### REQ-PRESERVE-02: Suite de object-manager sin regresión + path versionable intacto

> **Que cambia**: nada salvo el rechazo de RT.
> **Por que**: DET-7 — el guard no debe afectar versionado/clonado existente.

El sistema MUST mantener la suite de object-manager idéntica al baseline y MUST preservar el versionado de `Activity` (base).

**Actor**: system
**Layers**: backend (object-manager)

## Non-functional requirements

No aplican (mejora de calidad/robustez, sin targets de performance/scale).

## Changes

### Modified: layout — composables y utils de row action

| Aspecto | Antes | Después | Por que |
|---------|-------|---------|---------|
| `RecordListElement.vue:35,67,79` | 3 `console.log` sin guard | eliminados o tras `import.meta.env.DEV` | ruido en producción (A5) |
| `useRowActionHandler.ts:307` | `catch {}` vacío | `catch { console.warn(...) }` | falla de config RT silenciada (B4) |
| `useRowActionHandler.ts:37` | `redirectTo: 'edit' \| 'view'` | `+ 'none'` | TS pierde garantía de `'none'` que el runtime evalúa (A3) |
| `useRowActionHandler.ts:124,256` | `$t: Function` | `$t: (key: string, params?: Record<string, unknown>) => string` | desactiva verificación de aridad/retorno (A4) |
| `useRowActionHandler.ts:323-349` | copia-pega download/import | función privada compartida | duplicación (M2) |
| `useCreateRowAction.ts:38,40,42,68` | `any` | `ApolloClient` / `string \| Ref<string>` / `Record<string, unknown>` | tipos conocidos disponibles (M7) |
| `useCreateRowAction.ts:59` | duck-typing `'value' in value` | `isRef` de `vue` | falsos positivos (B2) |
| `humanizeObjectName.ts:33` | regex con flag `i` | sin flag `i` | prefijos siempre-lowercase (B3) |

### Modified: object-manager — helpers de versionado y codegen

| Aspecto | Antes | Después | Por que |
|---------|-------|---------|---------|
| `version-from-source.js` `prepareVersionData` | sin guard | lanza si `asNewVersion` sobre RT | atomicidad del path RT (A1, REQ-IMPROVE-05) |
| `version-from-source.js` (archivo) | indentación con tabs | espacios (prettier) | inconsistencia de formato (M13) |
| `validate-polymorphic-children-derived.js:135` | var `prefix` sombreada/sin uso | eliminada | dead code (B9) |

## Tasks

### Session 1 — Layout: nits + type-safety [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Capturar baseline de la suite de layout (conteo pass/fail) | REQ-PRESERVE-01 | researcher | — | (lectura) `layout/` | `vitest run` en layout/ → registrar N pass | (no aplica) | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | A5 + B4: quitar/guardar 3 `console.log` en `RecordListElement.vue`; `console.warn` en el `catch {}` de `useRowActionHandler.ts:307` | REQ-IMPROVE-01 | developer | S1.T1 | `layout/src/elements/RecordListElement.vue`, `layout/src/composables/useRowActionHandler.ts` | lint + grep sin `console.log` unguarded | git revert | DET-8, DET-10 | done | 1 |
| S1.T3 | B2 + B3: `isRef` de vue en `useCreateRowAction.ts:59`; quitar flag `i` del regex de `humanizeObjectName.ts:33` | REQ-IMPROVE-02 | developer | S1.T1 | `layout/src/composables/useCreateRowAction.ts`, `layout/src/utils/humanizeObjectName.ts` | vitest del área verde | git revert | DET-7, DET-8 | done | 1 |
| S1.T4 | A3 + A4 + M7: añadir `'none'` a `EnhancedRowAction.redirectTo`; tipar `$t`; quitar `any` de `useCreateRowAction` | REQ-IMPROVE-03 | developer | S1.T1 | `layout/src/composables/useRowActionHandler.ts`, `layout/src/composables/useCreateRowAction.ts`, `layout/src/.../recordlist.ts` (lectura tipo) | `vue-tsc`/typecheck verde + vitest del área | git revert | DET-7, DET-8, DET-16 | done | 1 |
| S1.T5 | M2: extraer función privada compartida de `createDownloadTemplateHandler`/`createImportTemplateHandler` | REQ-IMPROVE-04 | developer | S1.T1 | `layout/src/composables/useRowActionHandler.ts` | vitest del área (handlers download/import) idéntico | git revert | DET-7, DET-8 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados, correr suite layout + typecheck, comparar vs baseline, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | suite layout = baseline (DET-7) + typecheck verde + coverage no baja | (no aplica — cierre de session) | DET-7, DET-13, DET-20, DET-23 | done | 1 |

### Session 2 — object-manager: guard A1 + M13 + B9 [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Capturar baseline de la suite de object-manager (conteo pass/fail) | REQ-PRESERVE-02 | researcher | S1.GATE | (lectura) `object-manager/` | `vitest run` en object-manager/ → registrar N pass | (no aplica) | DET-1, DET-2, DET-11 | done | 2 |
| S2.T2 | A1: guard en `prepareVersionData` que rechace `asNewVersion` sobre RecordType + unit test de rechazo; verificar que `Activity` (base) sigue versionando | REQ-IMPROVE-05 | developer | S2.T1 | `object-manager/src/graphql/resolvers/helpers/version-from-source.js` + su spec | unit test nuevo verde (rechazo RT) + test de `Activity` base intacto | git revert | DET-7, DET-8, DET-10, DET-16 | done | 2 |
| S2.T3 | M13 + B9: prettier sobre `version-from-source.js`; eliminar var `prefix` sin uso en `validate-polymorphic-children-derived.js:135` | REQ-IMPROVE-01 | developer | S2.T2 | `object-manager/src/graphql/resolvers/helpers/version-from-source.js`, `object-manager/src/services/codegen/helpers/validate-polymorphic-children-derived.js` | `prettier --check` verde + suite object-manager | git revert | DET-8 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2, ⚑ fuerte)** — persistir resultados, correr suite object-manager, verificar path versionable de `Activity` intacto, decisión humana (cambio de comportamiento core) | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | suite object-manager = baseline (DET-7) + `Activity` versionable intacto + revisión humana | (no aplica — cierre de session) | DET-7, DET-13, DET-20, DET-23 | done | 2 |

### Task contract

```
Task S2.T2: Guard de atomicidad RT en prepareVersionData
- source_ref: REQ-IMPROVE-05
- agent: developer
- files: object-manager/src/graphql/resolvers/helpers/version-from-source.js (+ spec)
- precondition: baseline object-manager capturado (S2.T1)
- expected_output: prepareVersionData lanza error claro si asNewVersion sobre RT; Activity (base) intacto
- validation: unit test nuevo de rechazo verde + test de versionado de Activity verde + suite om = baseline
- rollback: git revert
- rules: [DET-7, DET-8, DET-10, DET-16]
```

> Nota: S2.T3 depende de S2.T2 (mismo archivo `version-from-source.js`) — prettier corre al final para cubrir también el guard recién añadido y evitar conflicto de formato.

## Constraints

- **RULE-dev-004 / core_work_policy**: trabajo `layer:core` va en rama única `UPONE-1206` (ambos repos ya en ella); commits prefijo `UPONE-1219` (DET-19); merge a `develop` gated por revisión del team up1 — el cierre DKC NO implica merge.
- **RULE-core-008**: firma del CRUD genérico (`createInstance`/`updateInstance`) — el guard de A1 no la altera (vive en el helper upstream).
- **RULE-core-013 / RULE-core-020**: el path RT del resolver tiene su check de capability/uniqueness upstream del branch RT — el guard de versionado es ortogonal y no colisiona.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Suite vitest layout | internal | Baseline de regresión (REQ-PRESERVE-01) | Si flaky, dificulta confirmar zero-regresión — capturar 2 corridas |
| Suite vitest object-manager | internal | Baseline + verificación de `Activity` versionable (REQ-PRESERVE-02) | Idem |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Estrechar tipos rompe un consumidor que dependía del tipo laxo | low | medium | typecheck completo de layout en S1.GATE; A3 es aditivo (`'none'`), no elimina interfaz |
| El guard de A1 bloquea versionado legítimo | low | high | `Activity` es base, no RT; test explícito de `Activity` intacto en S2.T2; guard solo dispara sobre RT |
| Prettier reformatea más de lo esperado en `version-from-source.js` | low | low | diff acotado al archivo; revisar diff antes de commit; corre después del guard (S2.T3) |

## Open questions

Ninguna — todas resueltas en intake-explore (H1 ✓, H3 ✓; H2 con plan de validación empírica en S1).

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01..05 cumplidos (logs fuera, tipos estrechados, dedup, guard activo)
- [ ] **Tests**: unit test nuevo de A1 (rechazo RT) verde; tests de área de layout verdes
- [ ] **Rules**: RULE-dev-004 respetada (rama UPONE-1206, commits UPONE-1219); guard en helper, no en resolver
- [ ] **Integration**: REQ-PRESERVE-01/02 — ambas suites = baseline; `Activity` versionable intacto
- [ ] **Docs**: n/a (sin cambios de doc; backlog B1 registrado en ticket)
