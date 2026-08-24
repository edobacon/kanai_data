# UPONE-1450 (SP7) — Cambios en core (`object-manager` + `layout`) para revisión del team core

> **Para**: team core / reviewers de `object-manager` y `layout`.
> **Rama** (en los 3 repos): `feat/UPONE-1450-plan-version-deep-clone` (creada desde `develop` al día;
> aún **sin mergear a `develop`**). El merge de core a `develop` lo revisa y aprueba el team core.
> **Jira**: [UPONE-1450](https://u-planner.atlassian.net/browse/UPONE-1450) (épica
> [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267)). **8 SP.**
> **Fecha**: 2026-07-24.
> **Alcance de este doc**: solo el **código core fuera del mod** (`object-manager/src`, `layout/src`).
> La config del mod (`mods/curriculum-design/objects/Curriculum.json`) y su copia sincronizada
> (`object-manager/objects/business/Base/curriculum.json`) quedan fuera: son datos declarativos, no lógica.

---

## 0. Por qué hubo cambios en core

El objetivo funcional de 1450 (versionar un plan de estudio **arrastrando toda su malla**: `planEntry`,
`requirementCategory`, `requirement`, secciones y el RecordType del plan) es trabajo de mod, pero el
motor de deep-clone de `object-manager` **ya existía** y es config-driven: versionar declarando
`prefillFrom.deepClone` es cableado del mod, no core. Al ejercitarlo end-to-end aparecieron **límites
del motor** que no se resuelven desde el mod:

1. El motor remapeaba cross-refs entre hijos **polimórficos** (`polymorphicChildrenDerived`), pero **no**
   entre hijos **directos** (FK normal). La malla del plan tiene `planEntry.categoryId -> requirementCategory`
   (ambos hijos directos): sin remap, la v2 apuntaría a las categorías de la v1.
2. La atomicidad (`$transaction` Serializable) solo cubría el path `asNewVersion`. El **clone profundo que
   no es versión** (la row action "Duplicar") no era atómico: un fallo a mitad dejaría un grafo parcial.
3. El gate de la row action "Duplicar" para arrastrar el grafo vivía solo client-side; el motor no exponía
   una forma **opt-in** de disparar el deep-clone desde el modal de creación (`prefilledModal`).
4. El gate de capability del clone (`prefillFrom.requiredCapability`) también se aplicaba al versionado,
   acoplando la capability de clone con la de versión.

Cada uno es una **capacidad o corrección de plataforma**, generalizable a cualquier objeto con grafo
hijo, no un caso especial de Curriculum. El precedente directo es `polymorphicChildrenDerived`, que en su
momento subió al motor un remap por-módulo hecho a mano (CurricularLink); este es su equivalente para
relaciones directas. Por eso el fix correcto es en core, generalizable, y no un parche por-mod.

---

## 1. Resumen para revisión

| # | Cambio | Repo | Archivo(s) hand-written | Commit | Riesgo | Backward-compatible |
|---|--------|------|-------------------------|--------|--------|---------------------|
| 1 | `directChildrenDerived`: remap de cross-refs entre hijos DIRECTOS clonados | object-manager | `helpers/deep-clone-direct.js` (+2 fns), `instance.resolver.js` (fase DERIVED directa) | `8702fcf6` | **Medio** (núcleo de la revisión) | Sí (sin bloque = no-op) |
| 2 | Atomicidad del clone profundo no-versión | object-manager | `instance.resolver.js` (`clonesChildrenFromSource`) | `5da808c4` | Bajo | Sí (path normal sin cambio) |
| 3 | Gate de capability del clone independiente del versionado | object-manager | `instance.resolver.js` (`!asNewVersion`) | `85be5990` | Bajo | Sí (solo-clonables sin cambio) |
| 4 | Deep clone opt-in en row actions `prefilledModal` | layout | `RecordList.vue`, `types/recordlist.ts` | `6873ef9` | Bajo | Sí (opt-in `action.deepClone`) |
| 5 | Carry de `prefillFrom` al payload wrapped-input | layout | `RecordDetail.vue` | `6873ef9` | Bajo | Sí (ausente = no-op) |
| 6 | Allowlist de directivas de control en `initialData` | layout | `recordDetailInitialData.ts` | `6873ef9` | Bajo | Sí (aditivo) |

> Commits de higiene adicionales (no cambian lógica): `6095f00` (layout, quita un id interno de los
> comentarios). Los `docs/*` y `tests/*` que acompañan cada commit no se listan como cambio de lógica.

---

## 2. `object-manager` — motor de deep-clone

### 2.1. `directChildrenDerived` — remap de cross-refs entre hijos directos (commit `8702fcf6`)

**Qué se hizo.** `helpers/deep-clone-direct.js` gana dos funciones nuevas, espejo de las del path
polimórfico:

- `readDirectChildrenDerived(objectType, tenant)`: lee el bloque declarativo `metadata.directChildrenDerived`
  del JSON del objeto (mismo shape `{object, via, remapTo}` que `polymorphicChildrenDerived`).
- `applyDirectChildrenDerivedRemap({prisma, derived, cloneMap, remapTypeByAlias})`: recorre las filas de
  los hijos directos **ya clonados** (presentes en el `cloneMap`) y **actualiza** su FK interna (`via`)
  del id viejo al nuevo, filtrando por `type` destino.

En `instance.resolver.js`, tras la fase de clonado primario, se agrega la **fase DERIVED para hijos
directos** (import de las 2 funciones + un bloque que las invoca con el `cloneMap` `merged`).

**Diferencia de mecanismo clave con el path polimórfico** (por qué no se reusó `applyDerivedRemap` tal
cual): los hijos directos "derivados" (ej. `planEntry`) **ya se clonaron como primarios** por
`deepCloneDirectChildren` (que re-apuntó su FK-owner `planId` al nuevo padre). Por eso esta fase **no
re-crea filas** (eso las duplicaría): hace `model.update` de la cross-ref interna. El path polimórfico, en
cambio, **crea** filas porque sus derived (ej. CurricularLink) no se clonan como primarios. Es un espejo
estructural, no una llamada a la misma función.

**Por qué es necesario.** `planEntry.categoryId` apunta a `requirementCategory`; ambos son `directChildren`
del Curriculum. Sin esta fase, tras clonar la malla los `planEntry` de la v2 seguirían apuntando a las
`requirementCategory` de la v1: malla incoherente entre versiones.

**Por qué en core y no en el mod.** `deep-clone-direct.js` es el clonador de hijos directos de **toda la
plataforma**. Un remap escrito a mano en el mod obligaría a reimplementar la lógica en cada objeto con
grafo similar; generalizarlo al motor lo deja disponible para todos. Es el mismo movimiento que ya se hizo
con `polymorphicChildrenDerived` (que subió al motor un remap por-módulo de CurricularLink).

**¿Está contenido?** Sí. **Aditivo y opt-in**: un objeto que no declara `directChildrenDerived` no entra a
la fase (return temprano, no-op). Defensivo: una FK nullable se deja como está; una cross-ref fuera del
`cloneMap` (o de otro `type`) se loguea y se salta, sin abortar. El bloque se lee directo del JSON del
objeto, sin depender del DMMF de Prisma en runtime.

### 2.2. Atomicidad del clone profundo que no es versión (commit `5da808c4`)

**Qué se hizo.** El `$transaction` Serializable que envolvía `finalizeCreate` solo para `asNewVersion`
ahora también cubre el clone profundo desde source aunque **no** sea versión:

```js
const clonesChildrenFromSource = prefillFrom?.deepClone?.length > 0 && prefillFrom.source != null;
if (asNewVersion || clonesChildrenFromSource) {
  return await prisma.$transaction((tx) => finalizeCreate(tx), { isolationLevel: 'Serializable' });
}
return await finalizeCreate(prisma);
```

**Por qué es necesario.** La row action "Duplicar" crea una raíz de linaje nueva arrastrando la malla, pero
por un path distinto a `asNewVersion`. Sin la transacción, un fallo a mitad del deep-clone dejaría un plan
con malla incompleta.

**¿Está contenido?** Sí. El path normal (create sin `prefillFrom.deepClone` + `source`) preserva el
comportamiento previo **sin** transacción (los ~64 callers de create no cambian). Solo el versionado y el
clone profundo de Curriculum entran por la rama transaccional.

### 2.3. Gate de capability del clone independiente del versionado (commit `85be5990`)

**Qué se hizo.** El check `prefillFrom.requiredCapability` ahora se gatea con `!asNewVersion`:

```js
// !asNewVersion (UPONE-1450): este gate es del CLONE (source sin versionar). Un objeto
// clonable Y versionable declara su clone-cap aca y su version-cap en versioning.requiredCapability.
if (prefillFrom?.requiredCapability && !asNewVersion) {
  await checkCapability(context, [prefillFrom.requiredCapability]);
}
```

**Por qué es necesario.** Curriculum es clonable **y** versionable, y ambos paths pasan `prefillFrom.source`.
Poner la clone-cap en `prefillFrom.requiredCapability` sin este gate haría que el versionado también
exigiera `curriculum:clone`, rompiendo a usuarios que solo tienen `curriculum:version`. El fix aísla el
gate del clone del path de versionado (que valida su propia `versioning.requiredCapability` más abajo).

**Cómo apareció el problema y por qué esta forma.** El gate de `curriculum:clone` se puso primero en el
resolver del mod (el path de la row action "Duplicar"). Al revisar el cambio se detectó que el
`createInstance` genérico (mutation pública de GraphQL) llega al **mismo motor** con `prefillFrom.source`
sin pasar por ese resolver: un rol con `curriculum:create` pero sin `curriculum:clone` podía clonar vía
API directa, saltándose el gate client-side. Por eso el gate se movió **al motor** (`instance.resolver.js`),
que es el único punto por el que pasan todos los paths de clone, condicionado a `!asNewVersion` para no
gatear el versionado. Alinea Curriculum con el patrón ya vigente de
`AcademicProgram`/`CurricularSection`/`BibliographyReference`.

---

## 3. `layout` — RecordList / RecordDetail (capacidad de plataforma)

Estos cambios exponen el deep-clone del backend desde la row action "Duplicar" (`cloneStrategy:
'prefilledModal'`), como **opt-in por acción**. Son código core de `layout` (tocar con cuidado).

### 3.1. Deep clone opt-in en `RecordList.vue` + tipo (commit `6873ef9`)

**Qué se hizo.** Al construir el `initialData` del `prefilledModal`, si la acción declara `deepClone: true`
se inyecta `prefillFrom: { source: <rowId> }`:

```ts
const cloneSourceId = getRowId(record);
if (action.deepClone === true && cloneSourceId !== undefined && cloneSourceId !== null) {
  initialData.prefillFrom = { source: cloneSourceId };
}
```

Se agrega el campo `deepClone?: boolean` a la interfaz `RowAction` (`types/recordlist.ts`).

**Cómo apareció el problema y por qué opt-in explícito.** La primera versión inyectaba `prefillFrom.source`
para **toda** row action `prefilledModal`. Al revisar el cambio se detectó que eso reactivaría el
`prefillFrom.deepClone` declarado pero hoy inactivo de otros objetos (ej. `CurricularSection` en el
syllabus): esos objetos empezarían a arrastrar su grafo hijo sin corresponder, fuera del alcance de este
ticket. Por eso el disparo se dejó **opt-in explícito por acción** (`action.deepClone: true`): hoy solo
Curriculum lo activa. El objeto además debe declarar `prefillFrom.deepClone` en su registry; si no, el
motor clona superficial (no-op).

### 3.2. Carry de `prefillFrom` al payload wrapped-input en `RecordDetail.vue` (commit `6873ef9`)

**Qué se hizo.** `prefillFrom` no es un campo del form, así que el deep-clone del `prefilledModal` lo
inyecta vía `initialData` y no llega a `variableMapping`. En `handleSubmit`, para customEndpoints de
input envuelto (ej. `createCurriculumWithRecordType(data: JSON!)`), se traslada a `mutationVariables.prefillFrom`:

```ts
const clonePrefillFrom = props.initialData?.prefillFrom;
if (clonePrefillFrom !== undefined && clonePrefillFrom !== null) {
  mutationVariables.prefillFrom = clonePrefillFrom;
}
```

**Por qué es necesario.** Sin este carry, la directiva de clone se pierde entre el modal y la mutation, y
el motor no dispara el deep-clone. Solo aplica a wrapped-input customEndpoints (el único consumidor de
deep-clone hoy). Ausencia de `initialData.prefillFrom` = no-op.

### 3.3. Allowlist de directivas de control en `recordDetailInitialData.ts` (commit `6873ef9`)

**Qué se hizo.** El filtro `isInjectableInitialDataKey` (que descarta del payload las keys que no son
campos reales del schema, para no romper Prisma con columnas desconocidas) ahora acepta también las
directivas de control de clone. Se agrega:

```ts
export const INITIAL_DATA_CLONE_CONTROL_ALLOWLIST = ['prefillFrom'];
export const DEFAULT_INJECTABLE_NON_FIELD_KEYS = new Set([
  ...INITIAL_DATA_OWNER_ALLOWLIST,
  ...INITIAL_DATA_CLONE_CONTROL_ALLOWLIST,
]);
```

El default del parámetro `nonFieldAllowlist` pasa de solo owner keys a owner keys unión directivas de
control. `prefillFrom` es consumido por el resolver, **no** se persiste como columna.

**¿Está contenido?** Sí. Es una extensión aditiva del allowlist existente (mismo patrón que las owner keys
`ownerType`/`ownerId`/`recordType` de UPONE-1271). No afecta el filtrado del resto de keys virtuales.

---

## 4. Backward-compatibility (consolidado)

- **`directChildrenDerived`**: objeto sin el bloque = no-op. El path polimórfico (`applyDerivedRemap`) no
  se tocó; los objetos que ya versionaban con remap poly no cambian.
- **Atomicidad**: create normal (sin `deepClone` + `source`) sigue sin transacción. Solo versionado y
  clone profundo entran a `$transaction`.
- **Gate de capability**: objetos solo-clonables sin cambio; el versionado ya no queda gateado por la
  clone-cap.
- **Layout**: `deepClone` es opt-in por acción; sin el flag, "Duplicar" es superficial como hasta hoy. El
  carry de `prefillFrom` y el allowlist son no-op cuando la directiva está ausente.

---

## 5. Verificación (evidencia real)

| Nivel | Qué | Resultado |
|-------|-----|-----------|
| Unit (motor) | `direct-children-derived-remap.test.js` (12 nuevos) + regresión de clone (23) + `instance.resolver` (97) | pass |
| Integration (Postgres real `uplanner_upu`) | `clone-plan-mesh-derived.test.js` (versión): `categoryId` remapeado a cats v2, 0 refs a v1, source intacto | 2 pass (134ms exec real) |
| Integration | `clone-plan-deep-root.test.js` (clone raíz nueva) + `clone-version-createinstance-full.test.js` + invariantes de capability | pass |
| Regresión | object-manager 11 e2e + 106 unit; layout 25 | verde |
| Smoke UI real (path del usuario, tenant UPU) | Versionar plan Active por row action "Nueva versión": v2 con 6 planEntries + 4 categorías, remap a cats v2, RT base `Sequential`/240; malla v2 renderiza | OK |
| Smoke UI real | "Duplicar" plan: raíz nueva (`previousVersionId` null) + malla completa remapeada + RT + source intacto; round-trip de borrado en cascada sin residuo | OK |
| Smoke UI real | Matriz RBAC (post sync+codegen): clone/version permitidos con la capability; rol sin `curriculum:clone` no clona vía UI | OK |

Los dos problemas descritos en §2.3 y §3.1 (over-reach del deep-clone genérico y bypass del gate de
`curriculum:clone`) se detectaron **durante la revisión del código, antes de proponer el merge**, se
corrigieron con las formas explicadas arriba, y se re-verificaron: OK.

---

## 6. Qué revisar / cómo probar

1. **`deep-clone-direct.js`**: que `applyDirectChildrenDerivedRemap` haga `update` (no `create`) y que el
   filtro por `type` destino no remapee una FK que apunte a un clon de otro `type` en un `cloneMap` mixto.
2. **`instance.resolver.js` (fase DERIVED directa)**: que solo corra cuando hay bloque
   `directChildrenDerived`; que use el `cloneMap` `merged` (poly + directos).
3. **Atomicidad**: que `clonesChildrenFromSource` no meta a `$transaction` los creates normales; verificar
   el conteo de callers sin `deepClone`.
4. **Gate `!asNewVersion`**: que un usuario con `curriculum:version` pero sin `curriculum:clone` pueda
   versionar y no clonar; y que el `createInstance` genérico con `prefillFrom.source` quede gateado.
5. **Layout**: que sin `action.deepClone: true` el "Duplicar" siga superficial (no reactive el `deepClone`
   dormido de otros objetos); que el carry de `prefillFrom` solo aplique a wrapped-input customEndpoints.
6. **Regresión de versionado existente** (Activity, AcademicProgram) y de clone superficial (prefilledModal
   de otros objetos): no deben cambiar.

---

## 7. Estado

- **Commits (rama `feat/UPONE-1450-plan-version-deep-clone`):**
  - object-manager: `8702fcf6`, `1e14bbd7`, `5da808c4`, `85be5990` (+ higiene).
  - layout: `6873ef9`, `6095f00`.
  - (mods/curriculum-design: config `Curriculum.json` + docs, fuera de este doc.)
- **Push / PR: pendiente** (a la espera de OK del dev).
- **Merge a `develop`: pendiente de revisión del team core** (core = tocar con cuidado).

### Preguntas de producto abiertas (no bloquean la lógica de este cambio)

- Re-versionar una versión que **no** es la última de un linaje: hoy no crea una versión nueva (probado por
  UI). Confirmar si es by-design o una limitación a resolver.
- Trazabilidad de clon a nivel fila (`planEntry.sourceEntryId`): hoy queda `null` (sin consumidor real).
  Activarla sería una feature nueva (requiere un mecanismo del motor para sellar un campo hijo con el id
  viejo + un consumidor, ej. diff de mallas entre versiones).
- ¿Clonar/versionar deberían exigir `curriculum:create` como baseline, o ser capabilities independientes?
  Hoy ambos pasan por `createInstance` y exigen `curriculum:create` además de su capability distintiva.
