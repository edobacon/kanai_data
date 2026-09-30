---
id: TICKET-158-SPEC
project: up1
ticket: TICKET-158
status: draft
---

# Excluir internalId de la copia de registros (Clonar / Duplicar / Nueva versión)

## Resumen ejecutivo

Se corrige que las 4 acciones de copia del core (raíz normal, raíz de RecordType, hijos directos y polimórficos) arrastren el internalId del origen y fallen con P2002 por el índice único. La corrección es una constante compartida DB_MANAGED_FIELDS=['internalId'] aplicada en prefill-from-source.js, instance.resolver.js (prefillSkip + exclude de deep-clone) y propagada a hijos/nietos. NO se tocan los mods (Scenario.json, Curriculum.json, activity.json quedan sin parche temporal), ni version-from-source.js, ni las demás claves únicas ni los permisos de copia. Se verifica con tests unitarios de los 3 helpers + camino RecordType y un smoke en tenant local: Clonar escenario, Duplicar plan, Nueva versión de plan y de actividad, comprobando internalId nuevo en raíz, hijos y nietos e internalId intacto en el origen. ADVERTENCIA: el smoke depende de un tenant con la columna aplicada (local uplanner_upu la tiene en Scenario y ScenarioSection); si el tenant de prueba no la tiene, el smoke de curriculum-design queda como pendiente declarado, no como fallo.

## Requirements

### REQ-01 `confirmed`
> Fuente: object-manager/src/graphql/resolvers/helpers/prefill-from-source.js:20

La copia de un registro raíz vía prefillFrom.source no incluye internalId en el data insertado: PREFILL_DEFAULT_EXCLUDE incorpora DB_MANAGED_FIELDS junto a ['id','createdAt','updatedAt','createdBy'], y los exclude que ya declaran los mods se siguen respetando.

### REQ-02 `confirmed`
> Fuente: object-manager/src/graphql/resolvers/instance.resolver.js:4453

La copia de la raíz de un RecordType no hereda internalId y respeta prefillFrom.exclude: prefillSkip incorpora DB_MANAGED_FIELDS y los campos declarados en prefillFrom.exclude, que hoy se ignoran.

### REQ-03 `confirmed`
> Fuente: object-manager/src/graphql/resolvers/instance.resolver.js:5072

Los hijos y nietos copiados por deepClone (relación directa y polimórfica) no llevan internalId: las llamadas a deepCloneDirectChildren y deepClonePolymorphicChildren reciben exclude: [...DB_MANAGED_FIELDS, ...(prefillFrom.exclude || [])], lo que cubre la recursión a nietos.

### REQ-04 `confirmed` `variant`
> Fuente: sonda:card-vias-de-escritura-40e00528f8

La exclusión de internalId aplica por igual en todas las vías genéricas de escritura que pasan por createInstance (UI, API GraphQL genérica, MCP), porque el fix vive en el core y no en la validación de cada mod.

### REQ-05 `confirmed` `variant`
> Fuente: sonda:card-unicidad-7df3900e0b

El fix solo agrega internalId a la exclusion de la copia: ninguna otra columna cambia de trato. Las demas columnas del origen se copian o excluyen exactamente como antes (segun la lista fija y el exclude del mod), y las otras claves unicas (Curriculum previousVersionId+version, ScenarioSection scenarioId+sectionId, Section activityId+termId+code) no se tocan: su valor lo siguen definiendo la logica existente de version y de copia.

### REQ-06 `confirmed` `variant`
> Fuente: sonda:card-consumidores-cruzados-7cfce9a461

Un escenario clonado y sus secciones reciben internalId nuevos y distintos del origen, y el mapa de internalId que consume el algoritmo de programación funciona sobre el clon sin tocar código de mods.

### REQ-07 `confirmed` `enforcement`
> Fuente: object-manager/src/services/codegen/generatePrismaSchema.js:502

DB_MANAGED_FIELDS es una única constante compartida por los 4 puntos de copia (nombre fijo del tipo autoincrement, no derivación desde el esquema), sin duplicar la lista en cada helper; los tests que carguen Prisma siguen el patrón --pool=forks de los scripts de CI.

### REQ-08 `confirmed`
> Fuente: object-manager/scripts/detect-schema-drift.js:37

El verificador de drift de esquemas reconoce el tipo autoincrement y deja de reportar hallazgos falsos sobre internalId: jsonTypeToPrisma (object-manager/scripts/detect-schema-drift.js:37) mapea autoincrement a Int en vez de caer al default String, compareGeneratedGraphQL (:326) no exige en GraphQL los campos autoincrement reusando isAutoincrementFieldType de src/services/typeMappers.js:518 (estan ocultos de GraphQL a proposito), y la tabla de tipos de docs/guides/schema-drift-detection.md:228 incluye autoincrement. CA5: npm run drift:check no reporta ningun hallazgo sobre internalId en los objetos que lo declaran. El error preexistente up1_document_template.allowedRoles (GraphQL JSON vs [String!]) queda fuera de alcance y drift:check puede seguir terminando en exit 1 por el. Sin test unitario del script (hoy ejecuta main() al importarse; decision del dev): la validacion es la corrida del propio comando.
## Tasks

#### S1.T1 — Crear la constante compartida DB_MANAGED_FIELDS = ['internalId'] en un módulo de helpers de object-manager (junto a prefill-from-source.js) y exportarla, documentando que el nombre es fijo para el tipo autoincrement del codegen (generatePrismaSchema.js:502). Sin derivación desde el esquema.
Contrato: rollback: Borrar el archivo de la constante; ningún otro archivo la importa todavía.. Status: pending

#### S1.T2 — Aplicar DB_MANAGED_FIELDS en los 4 puntos de copia del core, sin tocar mods.
Contrato: rollback: git revert del commit: cada punto vuelve a su lista fija previa.. Status: pending

#### S1.T2.1 — prefill-from-source.js:20: sumar DB_MANAGED_FIELDS a PREFILL_DEFAULT_EXCLUDE, verificando en :175 que el merge con el exclude del mod sigue siendo aditivo y no lo reemplaza.
Contrato: rollback: Restaurar PREFILL_DEFAULT_EXCLUDE a ['id','createdAt','updatedAt','createdBy'].. Status: pending

#### S1.T2.2 — instance.resolver.js:4453-4466: sumar DB_MANAGED_FIELDS a prefillSkip y además incorporar prefillFrom.exclude, que hoy se ignora en el camino RecordType.
Contrato: rollback: Restaurar el prefillSkip fijo original.. Status: pending

#### S1.T2.3 — instance.resolver.js:5072 y :5083: pasar exclude: [...DB_MANAGED_FIELDS, ...(prefillFrom.exclude || [])] a deepClonePolymorphicChildren y deepCloneDirectChildren, confirmando en los helpers que el exclude se propaga a la recursión de nietos.
Contrato: rollback: Quitar el exclude agregado de ambas llamadas.. Status: pending

#### S1.T2.4 — Revisar los consumidores del camino de copia en el core (delete data.internalId de instance.resolver.js:4277, applyPrefillFromSource en :4385 y version-from-source.js) y confirmar por lectura que ninguno queda con doble exclusión contradictoria ni pierde columnas de negocio; reportar hallazgos sin cambiar version-from-source.js (no copia columnas).
Contrato: rollback: No aplica: tarea de verificación por lectura, sin cambios de código.. Status: pending

#### S1.T4 — Tests unitarios de los 4 puntos de copia: (a) prefill-from-source: un origen con internalId:42 produce un data sin la clave internalId y el exclude declarado por el mod se sigue respetando; (b) deep-clone-direct: el hijo y el nieto insertados no llevan internalId y el exclude del mod se aplica en la recursion; (c) deep-clone-polymorphic: idem hijo y nieto sin internalId con exclude del mod aplicado; (d) camino RecordType (instance.resolver): el data heredado no lleva internalId y respeta prefillFrom.exclude. Ademas, valida REQ-05 con una asercion concreta de conjunto: el data resultante es exactamente el del origen menos (lista fija + exclude del mod + internalId); se compara el set completo de claves y el valor de cada clave sobreviviente, de modo que el test falla si desaparece o cambia cualquier otra clave (incluidas las que participan de otras claves unicas, como sectionId o code). Si el test carga Prisma, correrlo con --pool=forks segun el patron de los scripts de CI. No se incluye un caso de regresion de otra clave unica por colision (ScenarioSection scenarioId+sectionId): en una copia el padre es nuevo, nunca colisiona, seria un test artificial.
Contrato: rollback: Borrar los archivos de test agregados; no se modifican tests existentes, asi que el repo queda igual que antes de la task.. Status: pending

#### S1.T5 — Smoke en tenant local de las 4 acciones con hijos: Clonar escenario (academic-scheduling), Duplicar plan, Nueva version de plan y Nueva version de actividad (curriculum-design). Verificar con includeInternalId:true que raiz, hijos y nietos del clon reciben internalId nuevos distintos del origen, que el origen no cambio, que la copia por la via GraphQL generica (sin UI, mismo camino del MCP) se comporta igual, y que el mapa de internalId del algoritmo (academic-scheduling/logic/schedule/internalIds.js) resuelve sobre el escenario clonado. Ademas, valida REQ-05: en Nueva version de plan, la copia se crea sin error y recibe version n+1 y previousVersionId del origen igual que hoy, es decir la logica de version existente sigue definiendo esa clave unica. Registrar el resultado por accion; si el tenant no tiene la columna aplicada para algun objeto, declararlo como pendiente, no como exito.
Contrato: rollback: Borrar los registros creados por el smoke en el tenant local; no hay cambios de codigo que revertir.. Status: pending

#### S1.T7 — Adenda 1 - verificador de drift: en object-manager/scripts/detect-schema-drift.js mapear el tipo 'autoincrement' a Int en jsonTypeToPrisma (:37) y excluir los campos autoincrement de la exigencia de GraphQL en compareGeneratedGraphQL (:326) reusando isAutoincrementFieldType de src/services/typeMappers.js:518 (no duplicar la deteccion); agregar el tipo a la tabla de docs/guides/schema-drift-detection.md:228. Sin test unitario del script (hoy ejecuta main() al importarse; decision del dev). Validacion: correr npm run drift:check antes y despues y registrar que desaparecen los 17 errores 'Prisma type mismatch' y los 17 avisos 'Field missing from GraphQL typeDefs' de internalId, y que el unico hallazgo restante es el preexistente up1_document_template.allowedRoles. Esta tarea va ANTES de la tarea de smoke de la sesion. Si ya existe una tarea del verificador en la sesion por un intento previo, completarla en vez de duplicarla.
Contrato: rollback: git revert del commit; el verificador vuelve a su mapeo previo.. Status: pending
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T2.1
- [ ] S1.T2.2
- [ ] S1.T2.3
- [ ] S1.T2.4
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T7

**Gate (auto)**: En el tenant local, Clonar escenario / Duplicar plan / Nueva versión de plan / Nueva versión de actividad completan y crean la copia (antes fallaban con P2002); el clon y sus hijos muestran internalId nuevos con includeInternalId:true y el origen conserva el suyo. En consola, la suite de los helpers de copia pasa en verde.
## Enmiendas (refine_spec)

### Enmienda 1

**Tasks agregadas:**

- S1: Tests unitarios de los 4 puntos de copia (ubicar como S1.T3, entre S1.T2 y S1.T4): (a) prefill-from-source: un origen con internalId:42 produce un data sin la clave internalId y el exclude declarado por el mod se sigue respetando; (b) deep-clone-direct: el hijo y el nieto insertados no llevan internalId y el exclude del mod se aplica en la recursion; (c) deep-clone-polymorphic: idem hijo y nieto sin internalId con exclude del mod aplicado; (d) camino RecordType (instance.resolver): el data heredado no lleva internalId y respeta prefillFrom.exclude. Si el test carga Prisma, correrlo con --pool=forks segun el patron de los scripts de CI. No se incluye un caso de regresion de otra clave unica (ScenarioSection scenarioId+sectionId): en una copia el padre es nuevo, nunca colisiona, seria un test artificial. (valida: REQ-01, REQ-02, REQ-03, REQ-07, test; rollback: Borrar los archivos de test agregados; no se modifican tests existentes, asi que el repo queda igual que antes de la task.)

### Enmienda 2
**REQs:**

- REQ-05 (edit) `confirmed`: El fix solo agrega internalId a la exclusion de la copia: ninguna otra columna cambia de trato. Las demas columnas del origen se copian o ex

**Task ops:**

- edit S1.T4 { desc="Tests unitarios de los 4 puntos de copia: (a) prefill-from-source: un origen con internalId:42 produce un data sin la clave internalId y el exclude declarado por el mod se sigue respetando; (b) deep-clone-direct: el hijo y el nieto insertados no llevan internalId y el exclude del mod se aplica en la recursion; (c) deep-clone-polymorphic: idem hijo y nieto sin internalId con exclude del mod aplicado; (d) camino RecordType (instance.resolver): el data heredado no lleva internalId y respeta prefillFrom.exclude. Ademas, valida REQ-05 con una asercion concreta de conjunto: el data resultante es exactamente el del origen menos (lista fija + exclude del mod + internalId); se compara el set completo de claves y el valor de cada clave sobreviviente, de modo que el test falla si desaparece o cambia cualquier otra clave (incluidas las que participan de otras claves unicas, como sectionId o code). Si el test carga Prisma, correrlo con --pool=forks segun el patron de los scripts de CI. No se incluye un caso de regresion de otra clave unica por colision (ScenarioSection scenarioId+sectionId): en una copia el padre es nuevo, nunca colisiona, seria un test artificial.", rollback="Borrar los archivos de test agregados; no se modifican tests existentes, asi que el repo queda igual que antes de la task.", validates=["REQ-01","REQ-02","REQ-03","REQ-05","REQ-07"], isTest=true }
- edit S1.T5 { desc="Smoke en tenant local de las 4 acciones con hijos: Clonar escenario (academic-scheduling), Duplicar plan, Nueva version de plan y Nueva version de actividad (curriculum-design). Verificar con includeInternalId:true que raiz, hijos y nietos del clon reciben internalId nuevos distintos del origen, que el origen no cambio, que la copia por la via GraphQL generica (sin UI, mismo camino del MCP) se comporta igual, y que el mapa de internalId del algoritmo (academic-scheduling/logic/schedule/internalIds.js) resuelve sobre el escenario clonado. Ademas, valida REQ-05: en Nueva version de plan, la copia se crea sin error y recibe version n+1 y previousVersionId del origen igual que hoy, es decir la logica de version existente sigue definiendo esa clave unica. Registrar el resultado por accion; si el tenant no tiene la columna aplicada para algun objeto, declararlo como pendiente, no como exito.", rollback="Borrar los registros creados por el smoke en el tenant local; no hay cambios de codigo que revertir.", validates=["REQ-04","REQ-05","REQ-06"], isTest=false }

### Enmienda 3
**REQs:**

- REQ-08 (add) `confirmed`: El verificador de drift de esquemas reconoce el tipo autoincrement y deja de reportar hallazgos falsos sobre internalId: jsonTypeToPrisma (d

**Tasks agregadas:**

- S1: Implementar REQ-08 en object-manager/scripts/detect-schema-drift.js: mapear autoincrement a Int en jsonTypeToPrisma (:37) y excluir de la exigencia GraphQL de compareGeneratedGraphQL (:326) los campos autoincrement reusando isAutoincrementFieldType de src/services/typeMappers.js; agregar el tipo autoincrement a la tabla de tipos de docs/guides/schema-drift-detection.md:228. Sin test unitario del script (el script ejecuta main() al importarse y no se refactoriza; decision del dev). Validacion: correr npm run drift:check antes y despues y registrar en la task que desaparecen los 17 errores Prisma y los 17 avisos GraphQL de internalId y que solo queda el hallazgo preexistente de up1_document_template.allowedRoles. (valida: REQ-08; rollback: git revert del commit; el verificador vuelve a su mapeo previo.)

### Enmienda 4
**REQs:**

- REQ-08 (edit) `confirmed`: El verificador de drift de esquemas reconoce el tipo autoincrement y deja de reportar hallazgos falsos sobre internalId: jsonTypeToPrisma (o

**Tasks agregadas:**

- S1: Adenda 1 - verificador de drift: en object-manager/scripts/detect-schema-drift.js mapear el tipo 'autoincrement' a Int en jsonTypeToPrisma (:37) y excluir los campos autoincrement de la exigencia de GraphQL en compareGeneratedGraphQL (:326) reusando isAutoincrementFieldType de src/services/typeMappers.js:518 (no duplicar la deteccion); agregar el tipo a la tabla de docs/guides/schema-drift-detection.md:228. Sin test unitario del script (hoy ejecuta main() al importarse; decision del dev). Validacion: correr npm run drift:check antes y despues y registrar que desaparecen los 17 errores 'Prisma type mismatch' y los 17 avisos 'Field missing from GraphQL typeDefs' de internalId, y que el unico hallazgo restante es el preexistente up1_document_template.allowedRoles. Esta tarea va ANTES de la tarea de smoke de la sesion. Si ya existe una tarea del verificador en la sesion por un intento previo, completarla en vez de duplicarla. (valida: REQ-08; rollback: git revert del commit; el verificador vuelve a su mapeo previo.)
