---
id: SPEC-object-manager-track-0-prerequisitos-clonacion
project: up1
type: doc
module: object-manager
status: draft
tags:
  - sp4
  - core
  - codegen
  - cloning
  - versioning
  - epic-UPONE-1206
---

> Estado 2026-07: la clonacion y el versionamiento ya estan implementados en produccion. Este track era la propuesta previa; el as-built se documenta en [features/versioning-cloning.md](../features/versioning-cloning.md).

# SPEC — Track 0 Core: prerequisitos de plataforma para clonacion/versionamiento

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: habilitar 3 piezas fundacionales del codegen de `object-manager` que la capacidad de clonacion+versionamiento de SP4 necesita en runtime. Hoy, declarar `metadata.versioning: {...}` en el JSON de un objeto **no hace nada** (el registry-sync solo persiste keys nombradas, los bloques custom se ignoran en silencio). Este ticket cierra esa brecha + agrega lectura/deepClone de hijos polimorficos (para que clonar un Activity arrastre sus CurricularSection) + codifica el contrato del FK reflexivo (`previousVersionId`). Sin esto, las HU-1..HU-7 del sprint no pueden ejecutarse.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | API del mapa `oldId→newId` (REQ-S1-DECISION) | Define si el hook HU-8b del mod CD es chico (~50-100 lineas) o grande (>200). Trade-off entre simplicidad de la API generica del core vs delegacion al mod. |
| 2 | Scope del smoke manual post-migracion (REQ-S3-DECISION) | Migracion aditiva sobre 16+ tenants. Smoke parcial puede dejar tenant fallado sin detectar; smoke completo agrega ~15 min al gate. Decision sobre cobertura vs tiempo. |
| 3 | Patron per-capacidad vs blob generico para config-storage (D25) | Decision arquitectural del diseño — confirmada en intake, ya documentada. Si la queres revisar, ver Hypothesis map y Decision drivers del [teach-intake](../../tickets/TICKET-033.teach/teach-intake.md). |

**Riesgos principales y como los mitigamos**:

- **Regresion del codegen en 5+ tenants reales** → criterio C5 obligatorio: `git diff prisma/*/schema.prisma` post-codegen muestra cambios solo en objetos con `metadata.versioning`. Gate ⚑ fuerte en S5 (regresion HU-0j) y S8 (regresion HU-0d).
- **Migracion silenciosa fallida en 1 tenant** → REQ-S3-DECISION en gate strict de S3 hace pausa para smoke manual antes de implementar la funcion que asume la columna existe.
- **Spike S1 con API insuficiente para hook chico** → REQ-S1-DECISION en gate strict pone la decision en manos del dev (no reviewer LLM); si el hook crece >200 lineas, se ajusta alcance en el gate antes de S6/S7.
- **Toca submodule academic-scheduling (registry-sync)** → out of scope (AC tiene 4 deletes legitimos que el equipo debe mergear; documentado en sp4-execution-order.md).

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Derived generico de remap polimorfico** → diferido a SP5 (HU-0d entrega solo lectura/deepClone + mapa expuesto).
- **Hook del mod HU-8b** (consume el mapa para remapear CurricularLinks) → otro ticket de SP4 (TICKET-043).
- **Resolvers HU-1/2/3/4** (consumen `versioningConfig` en runtime) → otros tickets del sprint.
- **Bug B1 `targetField`** (codegen ignora `targetField` en ~39 FKs multi-tenant) → housekeeping, no necesario para versionamiento (`previousVersionId` apunta a `Activity.id`).
- **Partial unique declarativo (IMP-10)** → desacoplado a housekeeping de `isDefault`.

**Tamano estimado**: 9 sessions ejecutables (S1-S9), aproximadamente 8-12h efectivas. La mas larga es S7 (resolver `deepClone` walks polimorficos + tests con 5 CurricularSections jerarquizadas).

**Como vas a saber que funciona** (criterios observables):

- Un objeto con `metadata.versioning` declarado → su fila en `core_ObjectDefinition` tiene `versioningConfig` poblado tras `npm run codegen`.
- Un objeto sin el bloque → `versioningConfig: null`. Otros objetos no afectados.
- Clonar un Activity (smoke en UPU) arrastra sus 5 CurricularSections con `parentId` preservado, con un nuevo `ownerId`.
- `git diff prisma/UPU/schema.prisma` post-codegen muestra cambios SOLO en objetos que declaran los nuevos bloques.

---

## Purpose

Entrega los **3 cambios habilitantes del codegen** de `object-manager` requeridos por SP4: (a) HU-0j — persistir config declarativa (`metadata.versioning` + `metadata.prefillFrom`) al registry para que el resolver la lea en runtime, (b) HU-0d — codegen + resolver que soportan lectura/deepClone de hijos polimorficos (`polymorphicChildren`), (c) HU-0e — unit test que codifica el contrato del FK reflexivo. Prerequisito directo de HU-1/2/3/4 del sprint (resolvers + bloques que consumen estos cambios) y de HU-8b (hook del mod CD que remapea CurricularLinks).

## Requirements

### REQ-01: Test self-ref reflexivo (HU-0e)

> **Que cambia**: el repositorio gana un unit test que declara `previousVersionId: { references: "Activity", targetField: "id" }` y verifica que el codegen genera el `@relation` reflexivo correcto. Tambien una nota documentando el patron para futuros adoptantes.
> **Por que**: el patron ya funciona (precedente: `CurricularSection.parentId`), pero no hay test que codifique el contrato. Sin test, un cambio futuro al codegen podria romperlo silenciosamente.

El sistema MUST tener un unit test que valide la generacion correcta del `@relation` reflexivo para FKs self-ref declarados via `references: "<MismoObject>"` + `targetField: "id"`. El test SHOULD ser idempotente — correrlo multiples veces no debe romper self-refs ya declarados (precedente `CurricularSection.parentId` sigue funcionando).

**Actor**: system (codegen)
**Layers**: backend (codegen), db (schema generado)

<details><summary>Scenarios de validacion</summary>

#### Scenario: self-ref reflexivo nuevo
- **GIVEN** JSON de Activity declara `previousVersionId: { references: "Activity", targetField: "id" }` sin `isForeignKey`
- **WHEN** el codegen procesa el JSON
- **THEN** el `prisma/{tenant}/schema.prisma` resultante contiene `previousVersion Activity? @relation("Activity_previousVersion", ...)` apuntando a `id`
- **AND** contiene la coleccion inversa `nextVersions Activity[] @relation("Activity_previousVersion")`

#### Scenario: precedente sigue funcionando
- **GIVEN** JSON de CurricularSection con `parentId: { references: "CurricularSection" }` ya declarado
- **WHEN** el codegen regenera el schema
- **THEN** el resultado de CurricularSection no cambia (idempotente)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `npm run test --workspace=@uplanner/object-management-backend -- self-ref-reflexivo` y obtiene `1 test passing`.

---

### REQ-02: Columna `versioningConfig` en `core_ObjectDefinition` (HU-0j fase 1)

> **Que cambia**: la tabla `core_ObjectDefinition` (registry) gana una columna `versioningConfig Json?` aditiva en BASEMODEL y se propaga a los 16+ tenants existentes (UPU + UCASMT + UCENG + UCPLN + TEST + DEMO01-10). La columna acepta NULL y default a NULL.
> **Por que**: hoy el registry no tiene donde persistir config arbitraria — la brecha pivotal G3 confirmada en intake. Sin esta columna, los siguientes REQs (sync function + resolver consumption) no tienen donde escribir/leer.

El sistema MUST contener la columna `versioningConfig Json?` en `core_ObjectDefinition` de **todos** los tenants existentes (BASEMODEL + 16 tenants reales) tras aplicar la migracion. La migracion MUST ser aditiva (no destruye data) y reversible (drop column restaura el estado previo sin perdida).

**Actor**: system (migracion Prisma)
**Layers**: db (schema), backend (Prisma client regenerado)

<details><summary>Scenarios de validacion</summary>

#### Scenario: migracion clean en tenant nuevo
- **GIVEN** un tenant fresh con `core_ObjectDefinition` sin la columna
- **WHEN** se aplica la migracion (`prisma migrate dev` o `db push`)
- **THEN** la columna `versioningConfig` aparece tipada como `Json?` con default NULL
- **AND** las filas existentes mantienen su data, con `versioningConfig: null`

#### Scenario: rollback
- **GIVEN** la migracion fue aplicada
- **WHEN** se ejecuta el rollback (drop column)
- **THEN** las demas columnas de `core_ObjectDefinition` no se ven afectadas

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta `psql -d uplanner_upu -c "\d core_ObjectDefinition"` y ve la columna `versioningConfig` listada como `jsonb`.

---

### REQ-03: Funcion `syncVersioningConfigToRegistry` en Fase 3 del codegen (HU-0j fase 2)

> **Que cambia**: una nueva funcion en `generatePrismaSchema.js` que lee `metadata.versioning` + `metadata.prefillFrom` del JSON de cada objeto y los upserta en la columna `versioningConfig` del registry. Patron **per-capacidad** analogo a `syncBaseFieldsToRegistry` (no blob generico — decision D25).
> **Por que**: sin la sync function, la columna queda siempre NULL aunque el JSON declare el bloque. La funcion es el puente declaracion-JSON → registry persistido.

El sistema MUST invocar `syncVersioningConfigToRegistry(objectsForRegistry, prisma)` en Fase 3 del codegen, junto a `addNewObjectsToRegistry` y `syncBaseFieldsToRegistry`. La funcion MUST:
- Leer `obj.metadata?.versioning` y `obj.metadata?.prefillFrom` del JSON del objeto.
- Construir el shape `{ versioning: <obj>, prefillFrom: <obj | null> }` SOLO si `versioning` esta presente; sino `null`.
- Upsertar via `prisma.core_ObjectDefinition.update({ where: { name }, data: { versioningConfig } })`.
- Ser idempotente (correr 2 veces produce el mismo resultado).
- Correr por cada tenant en el loop del codegen.

El sistema MUST NO modificar el sync existente de `properties`/`metadata` con keys nombradas. La funcion es aditiva (no remueve funcionalidad).

**Actor**: system (codegen)
**Layers**: backend (codegen)

<details><summary>Scenarios de validacion</summary>

#### Scenario: objeto con metadata.versioning declarado
- **GIVEN** un JSON de objeto con `metadata.versioning: { linkageField: "previousVersionId", ... }`
- **WHEN** se ejecuta `npm run codegen`
- **THEN** la fila en `core_ObjectDefinition` para ese objeto tiene `versioningConfig: { versioning: {...}, prefillFrom: null }`

#### Scenario: objeto con versioning + prefillFrom
- **GIVEN** un JSON de objeto con ambos bloques
- **WHEN** codegen
- **THEN** `versioningConfig: { versioning: {...}, prefillFrom: {...} }`

#### Scenario: objeto sin bloques
- **GIVEN** un JSON de objeto sin `metadata.versioning` ni `metadata.prefillFrom`
- **WHEN** codegen
- **THEN** `versioningConfig: null`

#### Scenario: idempotencia
- **GIVEN** la funcion corrio una vez
- **WHEN** se corre de nuevo sin cambios en el JSON
- **THEN** la fila resultante es identica

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega un objeto dummy con `metadata.versioning` al JSON de un tenant test, corre `npm run codegen`, y verifica via `psql` que `versioningConfig` esta poblado con el shape esperado.

---

### REQ-04: Regresion codegen HU-0j (S5 ⚑ fuerte)

> **Que cambia**: criterio operativo — regenerar los 16+ tenants reales post-HU-0j y verificar que el `git diff` de los `prisma/*/schema.prisma` no muestra cambios funcionales en objetos sin `metadata.versioning`. Solo los objetos que declaran el bloque deben verse afectados.
> **Por que**: HU-0j toca registry-sync, que es transversal a todos los tenants. Regresion accidental rompe consumers downstream sin que el codigo nuevo lo detecte.

El sistema MUST permitir regenerar los `prisma/*/schema.prisma` de BASEMODEL + UPU + UCASMT + UCENG + UCPLN + TEST + DEMO01-10 sin que el `git diff` muestre cambios en objetos que no declaran `metadata.versioning`. Cambios funcionales unicamente en objetos que declaran el bloque.

**Actor**: dev (verificacion en gate)
**Layers**: db (schemas), backend (codegen)

<details><summary>Scenarios de validacion</summary>

#### Scenario: regresion limpia
- **GIVEN** la implementacion de REQ-02 y REQ-03 esta lista
- **WHEN** se corre `npm run codegen` sobre los 16+ tenants
- **AND** se ejecuta `git diff prisma/*/schema.prisma`
- **THEN** el diff muestra cambios SOLO en objetos que declaran `metadata.versioning` (en este momento, ninguno — los consumers vienen en HU-1+)
- **AND** un smoke `select 1 from core_ObjectDefinition limit 1` corre OK en UPU

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta el codegen + `git diff`, observa diff vacio para objetos sin la key. Reviewer aislado del gate ⚑ fuerte confirma criterio.

---

### REQ-05: Shape declarativo `polymorphicChildren` + validacion (HU-0d fase 1)

> **Que cambia**: codegen acepta un nuevo bloque opcional `polymorphicChildren` bajo `metadata` del objeto. El bloque declara hijos polimorficos como `[{ name, object, via, ownerTypeValue, recursiveBy? }]`. Codegen valida la estructura y registra el alias accesible al resolver de `deepClone`.
> **Por que**: hoy no hay forma declarativa de decirle al resolver "estos son los hijos polimorficos de este objeto". HU-0d necesita esto para que `deepClone: ["sections"]` funcione.

El sistema MUST aceptar y validar bloques `polymorphicChildren` bajo `metadata` del objeto con shape `[{ name: string, object: string, via: "<ownerTypeField>/<ownerIdField>", ownerTypeValue: string, recursiveBy?: string }]`. Campos requeridos: `name`, `object`, `via`, `ownerTypeValue`. Campo opcional: `recursiveBy` (para walk topologico por self-ref).

Bloque invalido (falta requerido o shape malformado) MUST producir error de codegen claro indicando el archivo + bloque + campo faltante.

**Actor**: system (codegen)
**Layers**: backend (codegen)

<details><summary>Scenarios de validacion</summary>

#### Scenario: bloque valido
- **GIVEN** JSON de Activity con `metadata.polymorphicChildren: [{ name: "sections", object: "CurricularSection", via: "ownerType/ownerId", ownerTypeValue: "Activity", recursiveBy: "parentId" }]`
- **WHEN** se ejecuta codegen
- **THEN** completa OK; el alias `sections` queda registrado y accesible para el resolver de `deepClone`

#### Scenario: bloque malformado
- **GIVEN** JSON con `polymorphicChildren: [{ name: "sections" }]` (faltan requeridos)
- **WHEN** codegen
- **THEN** falla con error: `polymorphicChildren entry in activity.json missing required fields: object, via, ownerTypeValue`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega el bloque a un objeto test, corre codegen, verifica que pasa. Luego agrega un bloque malformado, verifica que falla con error claro.

---

### REQ-06: Resolver `deepClone` walks polimorficos + mapa `oldId→newId` (HU-0d fase 2)

> **Que cambia**: el resolver de `prefillFrom.deepClone` cuando encuentra un alias de `polymorphicChildren` hace `findMany` por `ownerType/ownerId`, walkea por `recursiveBy` en orden topologico, remapea ids, crea hijos con `ownerId: newRecord.id`, y expone un mapa `oldId→newId` que el hook del mod (HU-8b, otro ticket) consume.
> **Por que**: sin esto, clonar un Activity no arrastra sus CurricularSections — clonacion incompleta. El mapa expuesto permite al mod remapear sus CurricularLinks internos.

El sistema MUST extender el resolver de `prefillFrom.deepClone` para procesar aliases de `polymorphicChildren`. Para cada alias:
- Ejecutar `findMany({ where: { [ownerTypeField]: ownerTypeValue, [ownerIdField]: source.id } })`.
- Si `recursiveBy` esta declarado, walkear el arbol en orden topologico (root primero) usando ese campo como self-ref.
- Remapear ids: para cada hijo, generar nuevo id, mapear `oldId → newId`, y crear con `ownerId: newRecord.id`.
- Si el hijo tiene self-ref via `recursiveBy`, actualizar la self-ref al nuevo id mapeado de su padre logico.
- Exponer el mapa completo `oldId → newId` al caller del resolver.

**Actor**: system (resolver)
**Layers**: backend (resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: clonar Activity con 5 CurricularSections jerarquicas
- **GIVEN** un Activity con id `A1` y 5 CurricularSections con `parentId` formando un arbol (`S1 root → S2,S3; S2 → S4; S3 → S5`)
- **WHEN** se invoca `prefillFrom.deepClone({ source: A1, exclude: [], deepClone: ["sections"] })`
- **THEN** se crea un nuevo Activity `A2` con 5 nuevas CurricularSections (`S1', S2', S3', S4', S5'`) con jerarquia preservada (`S1' root → S2',S3'; S2' → S4'; S3' → S5'`)
- **AND** todas tienen `ownerType: "Activity"`, `ownerId: A2`
- **AND** el resolver expone mapa `{ S1: S1', S2: S2', S3: S3', S4: S4', S5: S5' }`

#### Scenario: orden topologico respetado
- **GIVEN** mismo escenario
- **WHEN** clonacion
- **THEN** S1' se crea ANTES que S2'/S3' (no se puede asignar parentId a un nodo que no existe aun)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta smoke E2E clonando un Activity dummy en UPU; observa via GraphQL/psql que las CurricularSections nuevas existen con jerarquia preservada y mapa expuesto.

---

### REQ-07: Regresion codegen HU-0d + smoke E2E (S8 ⚑ fuerte)

> **Que cambia**: criterio operativo — regenerar los 16+ tenants post-HU-0d, verificar `git diff` sin cambios en objetos sin `polymorphicChildren`, y correr smoke E2E de clonacion de Activity dummy en UPU.
> **Por que**: HU-0d toca codegen + resolver — doble superficie de regresion potencial.

El sistema MUST permitir regenerar los `prisma/*/schema.prisma` sin cambios en objetos que no declaran `polymorphicChildren`. El smoke E2E MUST mostrar clonacion exitosa de un Activity dummy con 5 CurricularSections jerarquizadas en UPU, con mapa `oldId→newId` accesible.

**Actor**: dev (verificacion en gate)
**Layers**: db, backend (codegen + resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: regresion + smoke
- **GIVEN** REQ-05 y REQ-06 implementados
- **WHEN** se corre `npm run codegen` + `git diff` + smoke E2E
- **THEN** diff vacio para objetos sin la key; smoke clonacion E2E completa OK

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre el codegen, observa diff esperado, ejecuta smoke E2E en UPU. Reviewer aislado del gate confirma criterio.

---

### REQ-S1-DECISION: Decision humana sobre API del mapa `oldId→newId` (gate ⚑ fuerte strict de S1)

> **Que cambia**: en el cierre del spike G-P3.3 (S1), el motor DKC presenta al dev 3 opciones de API para el mapa `oldId→newId` que el deepClone generico expone al hook HU-8b del mod CD. El dev elige (no auto-aprueba). La decision condiciona el diseño de S6 y S7 (HU-0d).
> **Por que**: el reviewer LLM puede validar coherencia del documento del spike pero no puede tomar una decision arquitectural sobre "esta API alcanza para hook chico". Esa decision la toma el dev.

El sistema MUST pausar al cierre de S1 (gate ⚑ fuerte con override `[autopilot: 'strict']`) y presentar al dev una consulta estructurada (`AskUserQuestion`) con las opciones de API del mapa.

**Contexto pre-armado para el dev** (presentado en la consulta):

- **Objetivo del mapa**: el `deepClone` generico de HU-0d clona las CurricularSections de un Activity. Los CurricularLinks internos del Activity apuntan a IDs viejos de seccion. Un hook del mod CD (HU-8b, ticket TICKET-043) remapea esos links a los IDs nuevos, consumiendo el mapa que esta API expone.
- **Restriccion**: el hook HU-8b debe ser ~50-100 lineas. Si crece >200 lineas, ajustar alcance.

**Opciones**:

| Opcion | Shape de API | Pros | Cons | Impacto en hook HU-8b |
|--------|--------------|------|------|----------------------|
| **A) Map simple** | `Map<oldId: string, newId: string>` | Simplicidad maxima; trivial de pasar entre core y mod; testeable | El hook tiene que saber que ids estan en el mapa (CurricularSection vs otros); puede haber colision de ids entre tipos si no se prefija | ~50-70 lineas: el hook itera links, busca cada `sectionAId/sectionBId` en el mapa, actualiza |
| **B) Map con metadata por tipo** | `Map<oldId, { newId, type: "CurricularSection" | ... }>` | Type-safe; hook no necesita asumir; multi-tipo en el futuro | API mas verbose; el core asume conocimiento del tipo (acoplamiento) | ~70-100 lineas: el hook filtra por type antes de usar, mas seguro |
| **C) Callbacks de remap inyectables** | `{ getRemappedId: (oldId, type) => newId | null, remappedTypes: string[] }` | Maxima flexibilidad; el hook decide como usar; el core no asume nada | Mas abstraccion sin beneficio inmediato; complejidad innecesaria para SP4 | ~100-150 lineas: el hook implementa la interfaz, mas codigo |

**Recomendacion del reviewer aislado**: opcion **A** (Map simple). Razones: (1) SP4 solo tiene 1 caso de uso (CurricularSection), no necesitamos multi-tipo aun; (2) el riesgo de colision de ids es bajo (los UUIDs/cuids son globales); (3) el hook chico es mejor para mantener el alcance acotado.

**Decision esperada del dev**: elegir A | B | C. Si elige A, S6/S7 implementan map simple. Si B, agregar metadata por tipo. Si C, refactorizar resolver para soportar callbacks.

El sistema MUST registrar la decision en `decisions_log` del ticket con `step: spike-api-decision` y `choice: option-A | option-B | option-C` + reason.

#### Acceptance
**El usuario puede verificar que funciona**: en el gate ⚑ fuerte de S1, el motor presenta `AskUserQuestion` con las 3 opciones (con tablas de pros/cons pre-renderizadas). La decision queda en `decisions_log`.

---

### REQ-S3-DECISION: Smoke manual multi-tenant post-migracion (gate ⚑ fuerte strict de S3)

> **Que cambia**: al cerrar la migracion Prisma de S3 (que agrega `versioningConfig Json?` a 16+ tenants), el motor pausa y le presenta al dev 3 opciones para el smoke manual. El dev elige scope. La decision condiciona el avance a S4.
> **Por que**: el reviewer LLM solo ve exit code de `prisma db push`. Una migracion fallida silenciosa en 1 tenant (lock, race, conexion intermitente) puede pasar el reviewer y romper S4. El dev hace smoke en al menos algunos tenants reales antes de implementar la funcion que asume la columna existe.

El sistema MUST pausar al cierre de S3 (gate ⚑ fuerte con override `[autopilot: 'strict']`) y presentar al dev una consulta estructurada con las opciones de smoke scope.

**Contexto pre-armado para el dev** (presentado en la consulta):

- **Objetivo del smoke**: confirmar visualmente que la columna `versioningConfig` esta presente y aceptando datos en los tenants criticos antes de implementar `syncVersioningConfigToRegistry` (S4) que asume la columna existe.
- **Comando**: `psql -d uplanner_<tenant> -c "\d core_ObjectDefinition"` debe mostrar `versioningConfig | jsonb`. Adicionalmente, `INSERT/UPDATE` de prueba con `versioningConfig: '{}'` debe funcionar.

**Opciones**:

| Opcion | Scope | Tiempo | Cobertura | Riesgo |
|--------|-------|--------|-----------|--------|
| **A) Smoke minimo (BASEMODEL + UPU + 1 UC)** | 3 tenants | ~2 min | 18% (3/16) | Tenants UC similares — si BASEMODEL+UCASMT OK, UC del mismo grupo probable OK. DEMO tenants no validados |
| **B) Smoke balanceado (BASEMODEL + UPU + 3 UC + 2 DEMO)** | 7 tenants | ~5 min | 44% (7/16) | Cubre los 3 grupos: prod-like (UC), test (DEMO), base. Mejor balance |
| **C) Smoke exhaustivo (todos los 16 tenants)** | 16 tenants | ~15 min | 100% | Garantia total. Util si la migracion es critica o si hubo warnings en el output |

**Recomendacion del reviewer aislado**: opcion **B** (smoke balanceado). Razones: (1) cubre los 3 grupos representativos sin invertir 15 min; (2) detectamos race conditions especificas de UC vs DEMO si las hay; (3) si hay anomalia en el balanced, escalamos a C antes de avanzar.

**Decision esperada del dev**: elegir A | B | C. Si A, smoke rapido y avanzar. Si B, smoke estandar. Si C, smoke total (gate extra largo pero garantizado).

El sistema MUST registrar la decision en `decisions_log` del ticket con `step: migration-smoke-decision` y `choice: option-A | option-B | option-C` + reason. **Adicional**: si el dev reporta anomalia durante el smoke (independiente de la opcion elegida), el motor MUST bloquear avance a S4 hasta resolverla.

#### Acceptance
**El usuario puede verificar que funciona**: en el gate ⚑ fuerte de S3, el motor presenta `AskUserQuestion` con las 3 opciones (con tablas pre-renderizadas). El dev ejecuta el smoke en el scope elegido, reporta OK/anomalia. Decision queda en `decisions_log`.

---

### REQ-08: Branch policy + commits prefijados (RULE-dev-004)

> **Que cambia**: todo el trabajo de este ticket vive en branch `UPONE-1206` de `object-manager`. Los commits van prefijados con el id Jira del ticket (`UPONE-1219`).
> **Por que**: SP4 epica core comparte branch entre tickets del mismo modulo. Sin prefijo, no se puede separar trabajo de tickets al hacer code review o cherry-pick.

El sistema MUST hacer todos los commits del ticket en branch `UPONE-1206` del repo `object-manager`. Los mensajes de commit MUST llevar prefijo `UPONE-1219-S{N}` (donde N es el numero de la session) seguido de tipo y scope conventional (`feat`/`test`/`refactor`/`docs`/`chore`/`fix`).

**Actor**: system (motor DKC al ejecutar DET-27)
**Layers**: meta (git workflow)

#### Acceptance
**El usuario puede verificar que funciona**: `git log --oneline UPONE-1206` despues del execute muestra commits con prefijo `UPONE-1219-S{N}`.

---

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Codegen sobre 16+ tenants | tiempo total | < 60s (linea base actual) |
| Compatibility | Migracion no rompe data existente | rows preservadas | 100% |
| Reversibility | Drop column `versioningConfig` | restaura estado previo | clean |
| Coverage | Tests del codegen tocados | line coverage del area | no degradar > 2% |

## Artifacts

(N/A — sin meta-specs especificos. Las secciones tecnicas estan cubiertas en Requirements arriba.)

## Dependencies

- **Branch UPONE-1206** debe existir en `object-manager` ✅ (creada 2026-05-28).
- **Submodule `mods/academic-scheduling`** debe estar clonado ✅ (resuelto pre-sprint).
- **DB UPU recreada** post-reset canonico 2026-05-28 ✅.

## Risks

| # | Riesgo | Impacto | Probabilidad | Mitigacion |
|---|--------|---------|--------------|------------|
| R1 | Regresion silenciosa del codegen en algun tenant | Alto (rompe consumers) | Bajo | C5 (gate ⚑ fuerte S5) + C7 (gate ⚑ fuerte S8) con `git diff` |
| R2 | Migracion fallida en 1 tenant sin detectar | Alto (S4 explota) | Bajo-Medio | REQ-S3-DECISION en gate strict de S3 |
| R3 | API del mapa insuficiente para hook chico | Medio (hook crece >200 lineas) | Bajo (D15 documentada) | REQ-S1-DECISION en gate strict de S1 |
| R4 | Drift en AC mod genera dirty post-codegen | Bajo (cosmetico) | Alto (esperado) | Documentado en sp4-execution-order.md; ignorar/descartar al cierre |

## Open questions

Sin open questions pre-execute. Los 2 decision points (S1, S3) se resuelven durante el execute, no pre-spec.

## Acceptance

### Criterios de cierre del spec → close del ticket

- C1: Spike G-P3.3 con documento que define API + dimensiona hook → S1 entrega
- C2: Test self-ref reflexivo verde idempotente → S2 entrega
- C3: Columna `versioningConfig Json?` en todos los tenants → S3 entrega (post-decision REQ-S3-DECISION)
- C4: `syncVersioningConfigToRegistry` invocada en Fase 3, behavior correcto → S4 entrega
- C5: Regresion codegen HU-0j sin cambios funcionales → S5 entrega (gate ⚑ fuerte)
- C6: Shape `polymorphicChildren` validado + resolver `deepClone` con mapa expuesto → S6+S7 entrega (post-decision REQ-S1-DECISION en S1)
- C7: Regresion codegen HU-0d + smoke E2E → S8 entrega (gate ⚑ fuerte)
- C8: Cierre Track 0 Core con commits ordenados + teach-close → S9

## Tasks

> Tasks en shape canonico F8 (11 columnas: # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios). El campo `Cambios` se llena durante execute con cambios gatillados por test cases (DET-25). Tests referencian TC-N que se materializan en el ticket markdown durante cada session.
>
> Plan de sessions consolidado en [ticket-033.md](../../tickets/ticket-033.md#plan-de-sessions-preplanificacion). Cada session se copia al ticket via `dkc-execute-task open-session N` (DET-28 + DET-29).

### Session 1 — Spike G-P3.3 [tier: T1] [tipo: ⚑ fuerte strict — REQ-S1-DECISION]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Investigar viabilidad deepClone generico sobre polymorphicChildren (lectura de codigo actual: resolver de createInstance + patron polimorfico en CurricularSection). Documentar findings en draft del spike. | researcher | fast | `object-manager/src/graphql/resolvers/instance.resolver.js`, `object-manager/objects/business/Base/curricularsection.json`, `object-manager/src/graphql/resolvers/polymorphicUpdate.resolver.js` | TC-01 | Documento `spike-G-P3.3.md` (en `.spike/` del ticket) con seccion "Viabilidad tecnica" + refs a archivos:lineas relevantes | N/A (documento) | pending | 1 | — |
| S1.T2 | Diseñar 3 opciones de API del mapa oldId→newId (A: Map simple, B: Map con metadata tipo, C: Callbacks inyectables). Documentar pros/cons + impacto en hook HU-8b. | architect | reasoning | `.spike/spike-G-P3.3.md` | TC-02 | 3 opciones documentadas en tabla del spike + recomendacion del architect | N/A | pending | 1 | — |
| S1.T3 | Estimar tamano del hook HU-8b por cada opcion (lineas, complejidad, mantenibilidad). | architect | balanced | `.spike/spike-G-P3.3.md` | TC-03 | Estimacion por cada opcion documentada (~50-100 vs ~70-100 vs ~100-150 lineas) con justificacion | N/A | pending | 1 | — |
| S1.T4 | Consolidar documento spike final con API recomendada + dimensionamiento + brief para REQ-S1-DECISION. | scribe | fast | `.spike/spike-G-P3.3.md` | TC-04 | Documento listo para presentar en gate ⚑ fuerte de S1; cumple criterio C1 del Acceptance | N/A | pending | 1 | — |
| S1.GATE | Quality review (DET-23 tier light) + REQ-S1-DECISION strict (consulta estructurada al dev con 3 opciones). Dev elige A/B/C. Registro entry `spike-api-decision` en decisions_log. | reviewer | reasoning | — | — | Decision A/B/C registrada en decisions_log; siguiente session (S2) habilitada | — | pending | 1 | — |

### Session 2 — HU-0e self-ref reflexivo [tier: T1] [tipo: auto]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Implementar unit test que declara `previousVersionId: { references: "Activity", targetField: "id" }` y verifica el `@relation` reflexivo generado en el schema Prisma. | developer | fast | `object-manager/src/services/codegen/__tests__/self-ref-reflexivo.test.js` (nuevo) | TC-05 | Test verde; verifica presencia de `@relation` + `Activity[]` inverso en el output del codegen | git revert del archivo de test | pending | 2 | — |
| S2.T2 | Verificar idempotencia: correr el test 2 veces no rompe self-refs existentes (`CurricularSection.parentId` sigue OK). | developer | fast | mismo archivo de test | TC-06 | Test re-ejecutable sin side-effects; precedente `CurricularSection.parentId` sigue funcionando | git revert | pending | 2 | — |
| S2.T3 | Agregar nota en `.ai/PATTERNS.md` documentando convencion de FK self-ref reflexivo para futuros adoptantes. | scribe | fast | `object-manager/.ai/PATTERNS.md` | — | Seccion "Self-ref reflexivo (precedente CurricularSection.parentId)" presente con ejemplo. Cumple C2. | git revert | pending | 2 | — |
| S2.GATE | Quality review (DET-23 tier light): lint + tipado + test verde. Reviewer aislado en super. | reviewer | balanced | — | — | Gate cierra con continue; siguiente session (S3) habilitada | — | pending | 2 | — |

### Session 3 — HU-0j fase 1 migracion Prisma [tier: T2] [tipo: ⚑ fuerte strict — REQ-S3-DECISION]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Agregar columna `versioningConfig Json?` al schema Prisma de BASEMODEL. Generar migracion via `prisma migrate dev`. | developer | balanced | `object-manager/prisma/BASEMODEL/schema.prisma`, `object-manager/prisma/BASEMODEL/migrations/*` (nuevo) | TC-07 | Migracion generada y aplicada en BASEMODEL; columna verificable via `psql -d uplanner_basemodel -c "\d core_ObjectDefinition"` | `prisma migrate resolve --rolled-back <migration>` + drop column manual | pending | 3 | — |
| S3.T2 | Propagar la columna a los 6 tenants UC (UPU + UCASMT + UCENG + UCPLN + TEST) + DEMO01-10 via `prisma db push` o migrate por tenant. | developer | balanced | `object-manager/prisma/{UPU,UCASMT,UCENG,UCPLN,TEST,DEMO01..DEMO10}/schema.prisma` + migrations | TC-08 | Columna `versioningConfig` presente en `core_ObjectDefinition` de los 16+ tenants. Cumple C3. | drop column por tenant | pending | 3 | — |
| S3.T3 | Documentar rollback de la migracion en `object-manager/docs/migrations.md` (seccion nueva). | scribe | fast | `object-manager/docs/migrations.md` | — | Seccion "Rollback de IMP-11 (versioningConfig)" con comandos exactos por tenant | git revert | pending | 3 | — |
| S3.GATE | Quality review (DET-23 tier standard: lint + Prisma client OK) + REQ-S3-DECISION strict (consulta estructurada al dev con 3 opciones de smoke scope). Dev elige A/B/C y ejecuta smoke. Registro entry `migration-smoke-decision` en decisions_log. | reviewer | reasoning | — | — | Smoke OK en scope elegido; decision registrada; siguiente session (S4) habilitada | — | pending | 3 | — |

### Session 4 — HU-0j fase 2 sync function [tier: T2] [tipo: auto]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Implementar funcion `syncVersioningConfigToRegistry(objectsForRegistry, prisma)` en `generatePrismaSchema.js`. Patron per-capacidad analogo a `syncBaseFieldsToRegistry`. | developer | balanced | `object-manager/src/services/codegen/generatePrismaSchema.js` | TC-09, TC-10 | Funcion exportada; lee `metadata.versioning` + `metadata.prefillFrom`; upserta a `versioningConfig`; idempotente | git revert | pending | 4 | — |
| S4.T2 | Invocar `syncVersioningConfigToRegistry` en Fase 3 del codegen junto a `addNewObjectsToRegistry`. | developer | fast | `object-manager/src/services/codegen/generatePrismaSchema.js` (mismo) | TC-11 | Invocacion presente en Fase 3; codegen completo OK end-to-end. Cumple C4. | git revert | pending | 4 | — |
| S4.T3 | Unit tests: objeto con `metadata.versioning` → poblado; sin bloque → null; con ambos `versioning` + `prefillFrom` → shape correcto; idempotencia (2 ejecuciones). | developer | fast | `object-manager/src/services/codegen/__tests__/sync-versioning-config.test.js` (nuevo) | TC-12, TC-13, TC-14, TC-15 | 4 tests verdes cubriendo los scenarios de REQ-03 | git revert | pending | 4 | — |
| S4.GATE | Quality review (DET-23 tier standard: lint + tipado + tests verdes + coverage delta). Reviewer aislado en super. | reviewer | balanced | — | — | Gate cierra con continue; siguiente session (S5) habilitada | — | pending | 4 | — |

### Session 5 — HU-0j fase 3 regresion codegen [tier: T3] [tipo: ⚑ fuerte]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S5.T1 | Regenerar codegen sobre los 16+ tenants reales: `npm run codegen --workspace=@uplanner/object-management-backend`. | developer | fast | `object-manager/prisma/*/schema.prisma` (output del codegen) | TC-16 | Codegen termina sin errores en todos los tenants | — (idempotente) | pending | 5 | — |
| S5.T2 | Ejecutar `git diff prisma/*/schema.prisma` y validar que los cambios estan solo en objetos que declaran `metadata.versioning` (en este ticket: ninguno aun — diff debe ser vacio). | reviewer | balanced | — | TC-17 | Diff vacio en objetos sin `metadata.versioning`. Cumple C5. | — | pending | 5 | — |
| S5.T3 | Smoke runtime en UPU: ejecutar query simple sobre `core_ObjectDefinition` para confirmar que la BD acepta el nuevo schema. | developer | fast | — | TC-18 | Query `select 1 from core_ObjectDefinition limit 1` retorna OK en UPU | — | pending | 5 | — |
| S5.GATE | Quality review (DET-23 tier exhaustive: las 10 dimensiones con foco en escalabilidad + claridad + error handling) ejecutado por reviewer aislado en super. Validacion de regresion sobre todos los tenants. | reviewer | reasoning | — | — | Gate cierra con continue; HU-0j completa; siguiente session (S6) habilitada | — | pending | 5 | — |

### Session 6 — HU-0d fase 1 shape polymorphicChildren [tier: T2] [tipo: auto]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S6.T1 | Definir shape canonico del bloque `polymorphicChildren` bajo `metadata`. Documentar campos requeridos (`name`, `object`, `via`, `ownerTypeValue`) y opcionales (`recursiveBy`). | architect | balanced | `object-manager/docs/codegen-polymorphic-children.md` (nuevo) | TC-19 | Shape documentado con ejemplo + reglas de validacion | git revert | pending | 6 | — |
| S6.T2 | Implementar validacion del bloque en el codegen (`generatePrismaSchema.js` o helper). Errores claros indicando archivo + bloque + campo faltante. | developer | balanced | `object-manager/src/services/codegen/generatePrismaSchema.js`, `object-manager/src/services/codegen/helpers/validate-polymorphic-children.js` (nuevo) | TC-20 | Codegen rechaza bloques malformados con mensaje claro; acepta bloques validos | git revert | pending | 6 | — |
| S6.T3 | Unit tests: bloque valido (acepta + registra alias) + bloque malformado (rechaza con error preciso). | developer | fast | `object-manager/src/services/codegen/__tests__/polymorphic-children-validation.test.js` (nuevo) | TC-21, TC-22 | 2 tests verdes cubriendo scenarios de REQ-05 | git revert | pending | 6 | — |
| S6.GATE | Quality review (DET-23 tier standard). Reviewer aislado en super. | reviewer | balanced | — | — | Gate cierra con continue; siguiente session (S7) habilitada | — | pending | 6 | — |

### Session 7 — HU-0d fase 2 resolver deepClone walks polimorficos [tier: T2] [tipo: auto]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S7.T1 | Extender resolver de `prefillFrom.deepClone` para procesar aliases de `polymorphicChildren`. Lectura del registry para resolver alias → config. | developer | balanced | `object-manager/src/graphql/resolvers/instance.resolver.js`, `object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js` (nuevo) | TC-23 | Resolver detecta aliases polimorficos en `deepClone:[...]` y delega al helper | git revert | pending | 7 | — |
| S7.T2 | Implementar logica del helper: `findMany` por `ownerType/ownerId` + walk topologico por `recursiveBy` + remap ids + crear hijos con nuevo `ownerId`. Shape del mapa segun decision A/B/C de S1. | developer | reasoning | `object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js` (mismo) | TC-24 | Helper clona Activity con 5 CurricularSections con jerarquia preservada (root → ramas). Mapa expuesto. Cumple C6. | git revert | pending | 7 | — |
| S7.T3 | Exponer mapa `oldId→newId` al caller del resolver (shape definitivo segun decision S1). | developer | balanced | `object-manager/src/graphql/resolvers/instance.resolver.js`, `object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js` | TC-25 | Caller recibe el mapa en el output de createInstance; shape consistente con decision S1 | git revert | pending | 7 | — |
| S7.T4 | Unit tests: clonar Activity dummy con 5 CurricularSections con `parentId` formando arbol → 5 nuevas con jerarquia preservada, mapa disponible y completo. | developer | balanced | `object-manager/src/graphql/resolvers/__tests__/deep-clone-polymorphic.test.js` (nuevo) | TC-26, TC-27 | 2 tests verdes (caso completo + orden topologico explicito) | git revert | pending | 7 | — |
| S7.GATE | Quality review (DET-23 tier standard: foco en escalabilidad del walk topologico + claridad del codigo del helper). Reviewer aislado en super. | reviewer | reasoning | — | — | Gate cierra con continue; siguiente session (S8) habilitada | — | pending | 7 | — |

### Session 8 — HU-0d fase 3 regresion + smoke E2E [tier: T3] [tipo: ⚑ fuerte]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S8.T1 | Regenerar codegen post-HU-0d sobre los 16+ tenants. | developer | fast | `object-manager/prisma/*/schema.prisma` | TC-28 | Codegen termina OK | — | pending | 8 | — |
| S8.T2 | Validar `git diff prisma/*/schema.prisma` — sin cambios funcionales en objetos sin `polymorphicChildren`. | reviewer | balanced | — | TC-29 | Diff esperado vacio. Cumple C7. | — | pending | 8 | — |
| S8.T3 | Smoke E2E en UPU: agregar `polymorphicChildren` a un Activity dummy, clonarlo via GraphQL mutation, validar via psql que las CurricularSections se crearon con `ownerId` nuevo + jerarquia preservada. | developer | balanced | `object-manager/__tests__/e2e/clone-activity-polymorphic.test.js` (nuevo) | TC-30 | Smoke completo OK con verificacion en BD | — | pending | 8 | — |
| S8.GATE | Quality review (DET-23 tier exhaustive: las 10 dimensiones) ejecutado por reviewer aislado en super. | reviewer | reasoning | — | — | Gate cierra con continue; HU-0d completa; siguiente session (S9) habilitada | — | pending | 8 | — |

### Session 9 — Cierre Track 0 Core [tier: T2] [tipo: ⚑ fuerte]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S9.T1 | Validar criterios C1-C8 cumplidos (Acceptance del spec). | reviewer | balanced | — | — | Checklist completo en seccion `## Sessions` del ticket marcando C1-C8 done | — | pending | 9 | — |
| S9.T2 | Review final de commits formato DET-27 (prefijo `UPONE-1219-S{N}` + tipo conventional). | reviewer | fast | — | — | Todos los commits del ticket cumplen formato | — | pending | 9 | — |
| S9.T3 | Refinar learns capturados durante execute. Promover a rules/decisions si corresponde. | scribe | balanced | `object-manager/projects/up1/learns/*` (si aplica) | — | Tabla `## Learns` del ticket sin items en `raw` | git revert | pending | 9 | — |
| S9.T4 | Generar `teach-close.md` (DET-22) con sintesis ejecutiva + evolucion hipotesis + highlights por session + knowledge promoted + lessons learned. | scribe | reasoning | `projects/up1/tickets/TICKET-033.teach/teach-close.md` (nuevo) | — | Archivo creado y validado via `dkc-validate Teach`. Cumple C8. | git revert | pending | 9 | — |
| S9.T5 | Marcar `frontmatter.teachings.close: done` + `status: closed`. | scribe | fast | `projects/up1/tickets/ticket-033.md` | — | Frontmatter actualizado; ticket cerrado | git revert | pending | 9 | — |
| S9.GATE | Validacion de cierre reforzada (DET-30 REQ-03): consolidacion DET-13 + DET-16 + DET-23 + chequeo "ningun archivo fuera de execute_scope" + "rama UPONE-1206 no toco develop". Reviewer aislado bloqueante en super. | reviewer | reasoning | — | — | Approve final; ticket marcable como closed | — | pending | 9 | — |

## Archiving

Cuando este ticket cierre, mover este spec a `projects/up1/specs/_archive/` solo si una version superior lo reemplaza (no se contempla en este ticket). Por ahora vive en `core/`.
