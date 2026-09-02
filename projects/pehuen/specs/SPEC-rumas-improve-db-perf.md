---
id: SPEC-rumas-improve-db-perf
project: pehuen
ticket: PEH-031
status: approved
---

# Performance de DB: indices, filtro por cancha y optimizacion de memoria en fillRumaData

# Performance de DB: indices, filtro por cancha y optimizacion de memoria en fillRumaData

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy filtrar rumas por cancha en produccion (caso real: CN Molina) puede dejar el sistema sin respuesta. La causa confirmada tiene dos capas: la base `pehuen` no tiene ningun indice util (solo `_id`), asi que cada listado hace un recorrido completo de las colecciones `guias` (290752 docs) y `guiaextradatas` (314834 docs); y el helper que rellena los datos de cada ruma (`fillRumaData`) hidrata documentos completos con Mongoose y cruza guias contra ajustes con un join en memoria O(n^2) en vez de un `Map`. Este ticket agrega los indices que faltan (legacy y auditoria en Nuxt), corrige un bug de filtro detectado de paso, y construye una version optimizada de `fillRumaData` en ambos codebases que coexiste con la actual hasta demostrar, con datos, que produce exactamente el mismo resultado y es mas rapida.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Dos helpers optimizados por codebase (Map en JS y aggregation en Mongo), coexistiendo con el actual hasta el corte en S5 | Evita reemplazar en caliente sin evidencia de paridad; el corte se decide con datos, no a priori (D2 del ticket) |
| 2 | Los 4 indices ya creados en la DB de dev (L2) se mantienen; solo se dropean temporalmente en el harness de S3/S4 para medir el "antes" limpio | Si se dejaran permanentes, el baseline medido no reflejaria el estado real de produccion (sin indices) |
| 3 | El bug de `queryRumas` legacy (filtro por `estado` que nunca aplica) se corrige dentro de este ticket, con test de regresion | Es barato de corregir y esta directamente en el path que se esta optimizando; dejarlo fuera obligaria a otro ticket para tocar el mismo archivo |
| 4 | Estrategia de indices en produccion: `autoIndex:false` + creacion off-peak documentada, en vez de dejar que Mongoose los cree en el arranque de la app | Crear indices grandes (`guias`, `guiaextradatas`) en el arranque bloquea el proceso y puede tumbar el deploy; la creacion controlada evita el riesgo |

**Riesgos principales y como los mitigamos**:

- **La comparativa de paridad no cubre un caso borde real (ej. ruma sin guias, con ajustes REDUCE que dejan `productQty` negativo) y el helper optimizado diverge en produccion** → el set de fixtures del harness (S3.T5/S4.T4) se construye a partir de la auditoria DET-40 (checklist campo por campo), no solo del caso CN Molina.
- **Medir en el legacy local bajo qemu (Learn L1) y concluir una mejora que no existe en produccion** → toda medicion de rendimiento se hace en Node nativo o midiendo solo la capa DB con `explain`, nunca el tiempo end-to-end local como proxy de produccion.
- **Crear indices en produccion bloquea el proceso o genera contencion durante horario de carga** → estrategia `autoIndex:false` + script de creacion off-peak documentado (REQ-IMPROVE-06), nunca `ensureIndex` automatico en el arranque de la app en prod.

**Que NO se hace en este ticket**:

- No se elimina `fillRumaData` original (legacy) ni el `.filter()` residual de Nuxt hasta que el helper ganador tenga paridad y rendimiento validados en S5, y el dev de el visto bueno explicito (D del ticket, seccion Enfoque de implementacion, punto 4).
- No se implementa denormalizacion de totales de ruma ni aggregation reemplazando toda la arquitectura de lectura (mejora D del listado de "Mejoras propuestas" del ticket) — es la opcion de mayor costo/riesgo y el ticket la deja fuera de alcance explicito.
- No se resuelve el escalamiento de `queryRumasAll` (reportes sin paginar, `pehuen_nuxt/server/services/ruma.service.ts:78-92`) mas alla de registrar el hallazgo — el request original no pidio tocar reportes, y ampliarlo aqui es scope creep. Se documenta como Open question / candidato a ticket derivado.

**Tamano estimado**: 5 sessions (S1-S5), continuas con las sessions previas del ticket (S0 fue el analisis de intake). S3 y S4 (T3, ⚑ fuerte) son las mas riesgosas y largas: implementan dos candidatos por codebase mas el harness de paridad y rendimiento con auditoria DET-40 completa.

**Como vas a saber que funciona**:

- Corres `explain()` sobre `guias.find({ruma:$in})` y `guiaextradatas.find({guia:$in})` en dev y ves `IXSCAN` en vez de `COLLSCAN`, con `docsExamined` cercano a los documentos devueltos (no al total de la coleccion).
- Cargas el listado de rumas filtrado por CN Molina y la respuesta llega en el orden de los cientos de milisegundos medidos en Node nativo (no en los ~18s observados hoy bajo qemu), sin cambiar ningun valor calculado (`volCalculado`, `volMR`, `volM3`, `mesCorta`, `anioPlantacion`, `producto`, `especiesGuias`) respecto a la version actual.
- El filtro por estado en el listado de rumas legacy (`GET /api/rumas?estado=...`) efectivamente filtra (hoy no lo hace).

---

## Purpose

Eliminar el cuello de botella de performance en el listado de rumas de `pehuen-server` (legacy, en produccion hoy) creando los indices de MongoDB que faltan en las colecciones calientes (`guias`, `guiaextradatas`, `ajustes`, `rumas`, y catalogos relacionados), y sustituyendo el join en memoria O(n^2) y la hidratacion completa de `fillRumaData` por una version optimizada (Map o aggregation), preservando exactamente el calculo actual. En paralelo, auditar y completar el equivalente en `pehuen_nuxt` (destino de la migracion), que ya tiene indices e hidratacion `lean()` pero conserva un residual O(n^2) en el mismo helper.

## Requirements

### REQ-IMPROVE-01: indices en MongoDB para pehuen-server (legacy)

> **Que cambia**: las queries calientes del listado de rumas (y del resto de queries de la auditoria: `find`, `findOne` con filtro, `countDocuments`, `updateMany`, `deleteMany`, `aggregate`) dejan de recorrer la coleccion completa y usan un indice.
> **Por que**: hoy `guias` (290752 docs) y `guiaextradatas` (314834 docs) no tienen ningun indice util, asi que cada carga de rumas hace COLLSCAN completo — confirmado con `explain` (H1).

El sistema MUST declarar, en los modelos Mongoose de `pehuen-server`, el set de indices validado contra `explain` para las colecciones y campos identificados en la auditoria de queries del ticket (Context found → "Candidatos de indice (legacy)"): `guias {ruma:1, estado:1}`, `guias {guiaArauco:1, estado:1}`, `guias {guideDateOnMs:1}`, `guias {ruma:1, estado:1, guideDateOnMs:1}`, `guiaextradatas {guia:1}`, `guiaextradatas {periodo:1}`, `ajustes {ruma:1}`, `rumas {estadoRuma:1}`, `rumas {cancha:1, createdAt:-1}`, `mii {periodo:1}`, `cancha {codigo:1}`, `producto {codigo:1, estado:1}`.

**Actor**: system
**Layers**: database, backend (schema)

<details><summary>Scenarios de validacion</summary>

#### Scenario: indice seek en la query caliente de fillRumaData
- **GIVEN** los indices `guias{ruma:1}` y `guiaextradatas{guia:1}` declarados y creados en dev
- **WHEN** se ejecuta `db.guias.find({ruma:{$in:[...]}}).explain('executionStats')` con los ids de CN Molina
- **THEN** el plan de ejecucion usa `IXSCAN` (no `COLLSCAN`) y `totalDocsExamined` es cercano a `nReturned` (H4: de 290752 a 9ms/3726 tras crear el indice)

#### Scenario: filtro por estado de ruma usa indice compuesto
- **GIVEN** el indice `rumas{cancha:1, estadoRuma:1}` creado
- **WHEN** se lista rumas filtrando por `cancha` y `estadoRuma`
- **THEN** el plan de ejecucion usa `IXSCAN` sobre ese indice compuesto, no un scan de la coleccion `rumas`

#### Scenario: candidato de prioridad media/baja fuera del set inicial
- **GIVEN** un candidato de prioridad media (ej. `ajustes{batch:1}`) sin uso confirmado por `explain` en este ticket
- **WHEN** se cierra S1
- **THEN** el candidato queda registrado en Open questions o Backlog, no se crea sin evidencia de uso (evita indices no usados que solo agregan costo de escritura)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `db.guias.find({ruma:{$in:[...]}}).explain('executionStats')` en la db de dev y ve `IXSCAN`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Indice seek en guias por ruma | indice `{ruma:1,estado:1}` creado | `explain` sobre `guias.find({ruma:$in})` de CN Molina | plan de ejecucion | `IXSCAN`, `docsExamined` ~ 3726 (no 290752) |
| 2 | Indice seek en guiaextradatas por guia | indice `{guia:1}` creado | `explain` sobre `guiaextradatas.find({guia:$in})` | plan de ejecucion | `IXSCAN`, `docsExamined` ~ 4177 (no 314834) |

### REQ-IMPROVE-02: auditoria y completitud de indices en pehuen_nuxt

> **Que cambia**: se confirma con evidencia (no solo lectura de codigo) que los indices declarados en los modelos de Nuxt cubren los mismos paths calientes que el legacy, y se agregan los que falten.
> **Por que**: H5 confirmo que Nuxt ya declara indices razonables (`guia{ruma:1}`, `guia{guiaArauco:1}`, `ruma{cancha:1,estadoRuma:1}`), pero la auditoria fue de codigo, no validada con `explain` contra el set definitivo de REQ-IMPROVE-01.

El sistema MUST comparar el set definitivo de indices validado en REQ-IMPROVE-01 contra los indices ya declarados en `pehuen_nuxt/server/models/*.model.ts` y agregar los que falten (ej. `guias{estado:1}` compuesto si REQ-IMPROVE-01 lo confirma necesario, `mii{periodo:1}`, `producto{codigo:1,estado:1}`, `cancha{codigo:1}` si no existen ya en sus modelos).

**Actor**: system
**Layers**: database, backend (schema)

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad de indices entre legacy y Nuxt
- **GIVEN** el set definitivo de REQ-IMPROVE-01
- **WHEN** se compara contra `guia.model.ts:116-120`, `ruma.model.ts:53-54`, `ajuste.model.ts:68-70`, `guia-volumen.model.ts:23-24`
- **THEN** cada indice del set legacy tiene un equivalente en Nuxt (mismo campo, misma coleccion — `guiaextradatas` en legacy es `guia-volumen.model.ts` en Nuxt) o se agrega si falta

#### Scenario: indice sin equivalente en catalogos
- **GIVEN** que `producto`, `cancha` y `mii` no tienen modelo dedicado auditado en el legacy
- **WHEN** se revisan sus modelos Nuxt
- **THEN** se confirma o agrega `producto{codigo:1,estado:1}`, `cancha{codigo:1}`, `mii{periodo:1}` si aplican al mismo patron de acceso

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la tabla comparativa de indices legacy vs Nuxt (Technical reference) no tiene filas "falta en Nuxt" sin resolver.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Comparativa de indices | set definitivo REQ-IMPROVE-01 | diff contra modelos Nuxt | tabla comparativa | 0 filas pendientes al cierre de S2 |

### REQ-IMPROVE-03: helper optimizado para fillRumaData en pehuen-server (legacy)

> **Que cambia**: se agregan dos funciones nuevas, `fillRumaDataMap` y `fillRumaDataAggregate`, que hacen el mismo trabajo que `fillRumaData` pero sin el join O(n^2) ni la hidratacion completa de Mongoose. `fillRumaData` original sigue existiendo y sigue siendo lo que corre en produccion hasta S5.
> **Por que**: H3 confirmo que el grueso del tiempo no esta en la DB sino en el procesamiento app-side: `hydrate+populate` (592ms) vs `lean+populate` (267ms), y el join `.filter()` de `guiaExtraData` dentro del loop de guias (~15.5M comparaciones para CN Molina) tarda 233ms contra 2ms de un `Map`.

El sistema MUST implementar `fillRumaDataMap` en `pehuen-server/src/services/ruma.service.ts` usando `.lean()` en las tres queries (`Guia.find`, `GuiaExtraData.find`, `Ajuste.find`), indexando `guiaExtraData` y `ajusteGuias` en un `Map` antes del loop de rumas (reemplazando los `.filter()` de las lineas 64, 114 y 146 del original), y moviendo el parseo de fecha (`moment(el.fechaCorta, ...)`) fuera del loop caliente donde sea posible.

El sistema MUST implementar `fillRumaDataAggregate` como candidato alternativo, resolviendo el mismo calculo con un `aggregate()` de Mongo (lookup + group) sobre `guias`, `guiaextradatas` y `ajustes`, sin traer los documentos completos a la aplicacion.

Ambas implementaciones MUST producir exactamente los mismos campos calculados que `fillRumaData` (ver REQ-PRESERVE-01) y ser seleccionables por un mecanismo temporal (flag de entorno o parametro de query) sin afectar el endpoint productivo mientras no se haya validado la paridad.

**Actor**: system
**Layers**: backend (service)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Map reemplaza el join O(n^2)
- **GIVEN** `fillRumaDataMap` implementado con un `Map<string, IGuiaExtraData[]>` indexado por `guia.guiaArauco`
- **WHEN** se llama con las 11 rumas de CN Molina (3726 guias, 4177 registros de guiaExtraData)
- **THEN** el tiempo de procesamiento app-side (excluyendo I/O de DB) es del orden de los 2ms medidos en el benchmark de Node nativo, no los 233ms del `.filter()` original

#### Scenario: seleccion temporal sin afectar produccion
- **GIVEN** el flag/param de seleccion no activado
- **WHEN** llega una request a `GET /api/rumas`
- **THEN** el endpoint sigue usando `fillRumaData` original (comportamiento sin cambios hasta S5)

#### Scenario: caso borde ruma sin guias
- **GIVEN** una ruma sin guias asociadas y sin ajustes
- **WHEN** se llama a `fillRumaDataMap`/`fillRumaDataAggregate`
- **THEN** los totales devueltos son iguales a los de `fillRumaData` original para ese caso (mesCorta vacio, anioPlantacion 0 o NaN segun el original, volumenes 0, sin division por cero no manejada distinto al original)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corriendo el harness de S3 (REQ-PRESERVE-01) sobre CN Molina, `fillRumaDataMap` y `fillRumaDataAggregate` devuelven el mismo resultado que `fillRumaData`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Paridad Map vs baseline | mismo input (CN Molina) | correr ambos helpers | deep-equal de campos calculados | 0 diferencias |
| 2 | Paridad aggregation vs baseline | mismo input (CN Molina) | correr ambos helpers | deep-equal de campos calculados | 0 diferencias |
| 3 | Rendimiento Map vs baseline | mismo input, Node nativo | medir latencia+memoria | comparar | Map mas rapido que baseline (delta documentado, no un umbral fijo previo a medir) |

### REQ-IMPROVE-04: helper optimizado para fillRumaData en pehuen_nuxt

> **Que cambia**: el `.filter()` residual dentro del loop de `fillRumaData` de Nuxt (`server/services/ruma.service.ts:166-167` para guias/ajustes por ruma, y `:210` para `guiaVolData` por guia) se reemplaza por lookup en `Map`, con una variante adicional por aggregation como segundo candidato.
> **Por que**: H5 confirmo que Nuxt ya usa `.lean()` y saco el parseo de fecha del loop, pero el join sigue siendo O(n^2) porque esta acotado a la pagina actual (10-20 rumas tipico), su impacto es menor que en el legacy pero sigue siendo el mismo patron a corregir antes de que crezca (paginas con canchas de muchas guias, como CN Molina).

El sistema MUST implementar `fillRumaDataMap` en `pehuen_nuxt/server/services/ruma.service.ts`, indexando `allGuias`/`allAjustes` por `rumaId` y `guiaVolData` por `guiaArauco` en `Map` antes de los loops de las lineas 164-274, eliminando los `.filter()` de las lineas 166, 167 y 210.

El sistema MUST implementar `fillRumaDataAggregate` como candidato alternativo via `aggregate()` sobre `Guia`, `Ajuste` y `GuiaVolumen`, evaluado en diseño si aporta ventaja real dado que el dataset ya esta acotado a la pagina (paginacion real ya resuelta en Nuxt, a diferencia del legacy).

**Actor**: system
**Layers**: backend (service)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Map reemplaza el filter por ruma
- **GIVEN** `fillRumaDataMap` con `Map<string, guia[]>` indexado por `rumaId` y `Map<string, ajuste[]>` idem
- **WHEN** se procesa una pagina de rumas (incluyendo una cancha con muchas guias, ej. equivalente a CN Molina en Nuxt)
- **THEN** el resultado es identico al de `fillRumaData` actual y el costo del join deja de ser O(paginaRumas x totalGuiasPagina)

#### Scenario: GuiaVolumen por guia via Map
- **GIVEN** `Map<string, guiaVolumen[]>` indexado por `guiaArauco`
- **WHEN** se busca `selectLast` para una guia
- **THEN** se obtiene el mismo ultimo registro que el `.filter()` original (paridad con RULE PEH-005 documentada en el codigo)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el harness de paridad de S4 (REQ-PRESERVE-01) corre sobre una pagina real de Nuxt y no reporta diferencias.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Paridad Map vs baseline Nuxt | pagina con >100 guias | correr ambos helpers | deep-equal | 0 diferencias |
| 2 | Paridad GuiaVolumen selectLast | guia con multiples registros GuiaVolumen | Map vs filter | mismo registro seleccionado | igual |

### REQ-IMPROVE-05: correccion del bug de filtro por estado en queryRumas (legacy)

> **Que cambia**: filtrar el listado de rumas por `estado` en `pehuen-server` (`GET /api/rumas?estado=...`) efectivamente filtra los resultados; hoy el parametro se recibe pero nunca se aplica.
> **Por que**: L4/D4 confirmaron que `ruma.service.ts:37` valida `isValidObjectId(filter.estadoRuma)` (siempre `undefined` porque el filtro llega como `filter.estado`), asi que la condicion nunca es verdadera y el filtro por estado nunca se agrega al `select`.

El sistema MUST corregir `queryRumas` (`pehuen-server/src/services/ruma.service.ts:37`) para que valide `isValidObjectId(filter.estado)` en vez de `filter.estadoRuma`, de forma que `select.estadoRuma = filter.estado` se aplique cuando corresponde.

El sistema MUST verificar el equivalente en `pehuen_nuxt` (`RUMA_FILTER_RULES`, `server/services/ruma.service.ts:25-31`) contra el mismo bug: la regla `{ key: 'status', field: 'estadoRuma', match: 'objectId' }` ya mapea correctamente `status` (query param) a `estadoRuma` (campo del modelo) — la revision confirmada de codigo indica que Nuxt NO tiene este bug; el task de esta REQ es la verificacion con test, no un fix.

**Actor**: system
**Layers**: backend (service)

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro por estado aplica en legacy
- **GIVEN** rumas con distintos `estadoRuma`
- **WHEN** se llama `GET /api/rumas?estado=<id-estado>`
- **THEN** solo se devuelven rumas con ese `estadoRuma` (comportamiento nuevo; antes devolvia todas)

#### Scenario: regresion de queryRumas
- **GIVEN** el fix aplicado
- **WHEN** se corre la suite de tests existente de `ruma.service`
- **THEN** los demas filtros (`ruma`, `especie`, `cancha`) siguen funcionando sin cambios

#### Scenario: Nuxt confirmado sin el bug
- **GIVEN** `RUMA_FILTER_RULES` de Nuxt
- **WHEN** se agrega un test que filtra por `status`
- **THEN** el resultado confirma que el filtro aplica correctamente (hallazgo NO-bug, se documenta como confirmacion, no como fix)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `GET /api/rumas?estado=<id>` en legacy devuelve solo rumas de ese estado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Filtro estado legacy | 2 rumas, estados distintos | `queryRumas({estado: idA})` | resultado | solo rumas con `estadoRuma === idA` |
| 2 | Filtro estado Nuxt (confirmacion) | 2 rumas, estados distintos | `queryRumas({status: idA}, user)` | resultado | solo rumas con `estadoRuma === idA` (ya funciona) |

### REQ-IMPROVE-06: estrategia de creacion de indices en produccion

> **Que cambia**: los indices grandes (`guias`, `guiaextradatas`) no se crean automaticamente cuando la app arranca en produccion; se crean de forma controlada, fuera de horario pico, con `autoIndex:false` en la conexion de produccion de ambos codebases.
> **Por que**: L3 confirmo que produccion es una base distinta (`mongodb+srv://`, DigitalOcean managed, replicaSet) donde los indices de dev no se propagan, y crear indices sobre 290k+ documentos en el arranque del proceso puede bloquear el deploy o generar contencion.

El sistema MUST declarar `autoIndex:false` en la configuracion de conexion de Mongoose de produccion, tanto en `pehuen-server` (config de conexion legacy) como en `pehuen_nuxt/server/plugins/db.ts` (hoy sin `autoIndex` explicito, que hereda el default `true`).

El sistema MUST documentar un procedimiento de creacion de indices off-peak (script o migracion manual con `createIndex({background: true})` o build online, segun version de Mongo del proveedor) para aplicar el set definitivo de REQ-IMPROVE-01/02 sobre la base de produccion.

**Actor**: system
**Layers**: config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: autoIndex deshabilitado en prod
- **GIVEN** la configuracion de conexion de produccion de Nuxt
- **WHEN** se revisa `mongoose.connect(config.mongodbUri, options)` en `db.ts`
- **THEN** `options.autoIndex === false` cuando `NODE_ENV === 'production'` (o equivalente por config de entorno)

#### Scenario: script de creacion documentado
- **GIVEN** el set definitivo de indices
- **WHEN** se ejecuta el procedimiento documentado contra la base de produccion en horario off-peak
- **THEN** los indices quedan creados sin haber bloqueado el arranque de la app ni generado timeout visible a usuarios

</details>

#### Acceptance
**El usuario puede verificar que funciona**: revisando la config de conexion de prod, `autoIndex` esta explicitamente en `false`; existe un procedimiento documentado (Technical reference) para crear los indices fuera de horario pico.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | autoIndex false en prod Nuxt | `NODE_ENV=production` | `mongoose.connect` | `options.autoIndex` | `false` |
| 2 | Procedimiento documentado | seccion Technical reference | revision manual | pasos + comando | presentes y ejecutables |

### REQ-PRESERVE-01: paridad exacta del calculo de fillRumaData

> **Que cambia**: nada, desde la perspectiva de quien consume el listado de rumas — cualquier helper nuevo produce los mismos valores que produce hoy `fillRumaData`.
> **Por que**: DET-40 exige que un camino de reemplazo replique 1:1 lo que hacia el camino viejo; sin esto, la optimizacion podria introducir una regresion silenciosa en calculos financieros/operativos (volumenes de madera).

El sistema MUST validar, para cada candidato optimizado (`fillRumaDataMap`, `fillRumaDataAggregate`, legacy y Nuxt), un deep-equal contra el resultado de la implementacion actual para los mismos campos: `volCalculado`, `volMR`, `volM3`, `mesCorta`, `anioPlantacion`, `producto`/`productQty`, `especiesGuias`, `zona`, `procedencia`, sobre un set de fixtures representativo (CN Molina + canchas variadas + casos borde: ruma sin guias, ajustes ADD y REDUCE, especies/productos multiples, guias no VIGENTE excluidas de `especiesGuias`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: deep-equal sobre CN Molina
- **GIVEN** las 11 rumas de CN Molina con sus 3726 guias
- **WHEN** se corren `fillRumaData`, `fillRumaDataMap` y `fillRumaDataAggregate` sobre el mismo snapshot
- **THEN** los tres resultados son deep-equal en los campos listados

#### Scenario: diferencia detectada es bloqueante
- **GIVEN** cualquier diferencia entre baseline y un candidato
- **WHEN** el harness reporta el mismatch
- **THEN** el corte a ese candidato (S5) no procede hasta corregir la divergencia

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el reporte del harness de paridad (S3/S4) no muestra diferencias antes de aprobar el corte en S5.

### REQ-PRESERVE-02: no romper la suite existente ni consumers

> **Que cambia**: nada en el contrato del endpoint; la suite de tests existente y los consumers siguen pasando igual que antes de la mejora.
> **Por que**: mejorar performance y romper otro comportamiento no es mejora (DET-7). La traza de esta regresion debe ser verificable por task, no implicita.

El sistema MUST mantener en verde la suite de tests existente de `ruma.service` (legacy y Nuxt) y de los consumers del endpoint de listado de rumas (controller, composables `useApi`/`ruma` en frontend) tras cada cambio.

<details><summary>Scenarios de regression</summary>

#### Scenario: suite existente en verde tras cada cambio
- **GIVEN** la suite de tests actual de ambos codebases en verde antes de la mejora
- **WHEN** se aplican indices, se agregan helpers nuevos, se corrige el bug de filtro y se conmuta el endpoint (S1-S5)
- **THEN** la suite completa de ambos codebases sigue en verde (`pnpm test:run` en Nuxt; suite de `pehuen-server`)

#### Scenario: consumers del listado no afectados
- **GIVEN** los consumers del endpoint de rumas (controller legacy, `queryRumas` Nuxt, composables de frontend)
- **WHEN** se conmuta al helper ganador (S5)
- **THEN** el shape de la respuesta del listado es identico y ningun consumer requiere cambios

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la corrida de regresion de S5.T5 (`pnpm lint && npx nuxt typecheck && pnpm test:run` en Nuxt + suite de `pehuen-server`) queda en verde y se registra en la seccion Regression del ticket.

### REQ-PRESERVE-03: respetar RULE-RUMA-004 y RULE-RUMA-005

> **Que cambia**: nada en el contrato de datos de `Ruma`; los helpers nuevos siguen las mismas reglas del modulo que el actual.
> **Por que**: RULE-RUMA-004 (producto como `[String]`) y RULE-RUMA-005 (volumenes al vuelo, no persistidos) son constraints del modulo rumas; un helper optimizado que las viole introduce un bug de contrato aunque la paridad numerica pase.

El sistema MUST preservar el contrato de `Ruma.producto` como `[String]` de codigos (RULE-RUMA-004) y el calculo al vuelo de `volCalculado`/`volMR`/`volM3` sin persistirlos en la coleccion `rumas` (RULE-RUMA-005) en cualquier helper nuevo.

<details><summary>Scenarios de regression</summary>

#### Scenario: producto sigue siendo array de strings
- **GIVEN** `fillRumaDataMap`/`fillRumaDataAggregate` en cualquier codebase
- **WHEN** producen el campo `producto` del objeto devuelto
- **THEN** es un `[String]` de codigos (RULE-RUMA-004), igual que el helper actual

#### Scenario: volumenes no se persisten
- **GIVEN** cualquier helper nuevo
- **WHEN** calcula `volCalculado`/`volMR`/`volM3`
- **THEN** los devuelve calculados al vuelo y NO escribe esos campos en la coleccion `rumas` (RULE-RUMA-005)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la revision de S3.T3/T4 y S4.T2/T3 confirma que ningun helper nuevo escribe volumenes en `rumas` ni cambia el tipo de `producto`; el harness de paridad (REQ-PRESERVE-01) lo respalda numericamente.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Listado de rumas filtrado por cancha con muchas guias (CN Molina) | latencia medida en Node nativo o solo capa DB | del orden de ~1.5s medido en benchmark nativo (vs 17.9s bajo qemu) hoy; con indices + helper optimizado, reducir la capa DB de ~700ms a decenas de ms (H4) y el app-side de 592ms/233ms(join) a el orden de single-digit ms (Map) |
| Performance | `explain` sobre queries calientes (`guias{ruma:$in}`, `guiaextradatas{guia:$in}`) | `docsExamined` / `nReturned` | ratio cercano a 1 (index seek), no ratio ~78:1 (COLLSCAN actual: 290752/3726) |
| Memory | Hidratacion de documentos en fillRumaData | uso de memoria del proceso durante el listado | reducir usando `.lean()` en vez de hidratacion completa Mongoose + populate x4 (benchmark: hydrate+populate 592ms vs lean+populate 267ms, proxy de menor trabajo de CPU/memoria) |
| Scale (DET-41) | Colecciones `guias`/`guiaextradatas` crecen con el uso (no con el codigo) | cardinalidad de produccion estimada | ver veredicto `scalability-sizing` en Decisions — indices + paginacion + acceso acotado a la pagina evitan que el costo crezca linealmente con el total de la coleccion |

## Artifacts

### Indices (legacy — pehuen-server, declarados en modelos Mongoose)

| Coleccion | Indice | Prioridad | Justificacion (query que lo usa) |
|-----------|--------|-----------|-----------------------------------|
| guias | `{ruma:1, estado:1}` | alta | `fillRumaData`: `Guia.find({ruma:$in})`; filtro por estado VIGENTE en rumaCleaner/stats |
| guias | `{guiaArauco:1, estado:1}` | alta | busquedas por numero de guia + estado |
| guias | `{guideDateOnMs:1}` | alta | `rumaCleaner`, listados ordenados por fecha |
| guias | `{ruma:1, estado:1, guideDateOnMs:1}` | alta | stats + rumaCleaner combinados |
| guiaextradatas | `{guia:1}` | alta | `fillRumaData`: `GuiaExtraData.find({guia:$in})` |
| guiaextradatas | `{periodo:1}` | alta | borrado/consulta por periodo |
| ajustes | `{ruma:1}` | alta | `fillRumaData`: `Ajuste.find({ruma:$in})` |
| rumas | `{estadoRuma:1}` | alta | filtro por estado (REQ-IMPROVE-05) |
| rumas | `{cancha:1, createdAt:-1}` | alta | `queryRumas`: filtro + sort por defecto |
| mii | `{periodo:1}` | media | consulta de MII por periodo |
| cancha | `{codigo:1}` | media | lookup de cancha por codigo |
| producto | `{codigo:1, estado:1}` | media | lookup de producto por codigo activo |

Candidatos de prioridad media/baja no incluidos en el set inicial (`guias{destino,nombreProveedor,estado}`, `guias{origen,destino,estado}`, `ajustes{batch:1}`, `ajustes{ruma:1,fechaGuiaOnMs:1}`, `rumas{numero:1}`, `rumas{estadoRuma:1,cancha:1}`, `rumas{geo:1}`, `producto{estado:1}`, `report{createdBy:1}`, `estadoruma{descripcion:1}`, `estadoruma{codigo:1}`, `cancha{activo:1}`): quedan registrados en Open questions, se crean solo si S1.T1 los confirma con `explain` contra queries reales.

### Indices (Nuxt — ya declarados, confirmar/completar en S2)

| Modelo | Indice ya declarado | Archivo |
|--------|---------------------|---------|
| guia | `{createdOn:1, estado:1, guideDateOnMs:-1}`, `{guiaArauco:1}`, `{ruma:1}` | `pehuen_nuxt/server/models/guia.model.ts:116-120` |
| ruma | `{cancha:1, estadoRuma:1}`, `{numero:1}` | `pehuen_nuxt/server/models/ruma.model.ts:53-54` |
| ajuste | `{ruma:1}`, `{batch:1}`, `{createdAt:-1}` | `pehuen_nuxt/server/models/ajuste.model.ts:68-70` |
| guia-volumen (coleccion `guiaextradatas`) | `{guia:1}`, `{periodo:1}` | `pehuen_nuxt/server/models/guia-volumen.model.ts:23-24` |

Faltantes a confirmar en S2 contra el set legacy: `mii{periodo:1}`, `cancha{codigo:1}`, `producto{codigo:1,estado:1}` (sin modelo dedicado auditado en este ticket — verificar si existen en Nuxt).

### Helpers nuevos (legacy y Nuxt)

| Codebase | Funcion | Archivo | Estrategia |
|----------|---------|---------|------------|
| pehuen-server | `fillRumaDataMap` | `src/services/ruma.service.ts` | `.lean()` + `Map` por `guiaArauco`/`ruma` en vez de `.filter()` |
| pehuen-server | `fillRumaDataAggregate` | `src/services/ruma.service.ts` | `aggregate()` con `$lookup`/`$group` |
| pehuen_nuxt | `fillRumaDataMap` | `server/services/ruma.service.ts` | reemplaza `.filter()` de lineas 166-167 y 210 por `Map` |
| pehuen_nuxt | `fillRumaDataAggregate` | `server/services/ruma.service.ts` | `aggregate()`, evaluar ventaja real dado que ya esta paginado |

### Harness de comparativa

| Tipo | Ubicacion | Que valida |
|------|-----------|-------------|
| Paridad (deep-equal) | test de integracion en cada repo (`tests/` de cada codebase) | REQ-PRESERVE-01 sobre fixtures de CN Molina + casos borde |
| Rendimiento/memoria | script one-off (no se mergea a CI, o se deja como script manual documentado) | latencia y memoria de baseline vs Map vs aggregation, en Node nativo o capa DB con `explain` |

## Tasks

### Session 1 — Indices legacy + fix bug filtro estado [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Validar con `explain('executionStats')` cada candidato de indice de alta prioridad contra queries reales (CN Molina + set de rumas variado) antes de declararlo; descartar/postergar candidatos sin uso confirmado. Incluir explicitamente los candidatos que respaldan el resto de filtros del listado de rumas (request punto 2: `numero`, `batch`, `geo`, `estadoRuma+cancha`, etc.) y emitir veredicto por cada uno (declarar en S1.T2 / postergar a Open questions con razon), de modo que ningun filtro del listado quede sin decision | REQ-IMPROVE-01 | researcher | — | (solo lectura de DB, sin archivos) | `explain` muestra `IXSCAN` tras crear el indice de prueba en dev; tabla de veredictos que cubre todos los filtros del listado | (no aplica — solo lectura/`dropIndex` de prueba) | DET-2, DET-11, DET-41 | pending | 1 |
| S1.T2 | Declarar en los modelos Mongoose de `pehuen-server` los indices del set validado en S1.T1 (`guiaSchema.index`, `guiaExtraDataSchema.index`, `ajusteSchema.index`, `rumaSchema.index`, `miiSchema.index`, `canchaSchema.index`, `productoSchema.index`) | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S1.T1 | `pehuen-server/src/models/guia.model.ts`, `guiaExtraData.model.ts`, `ajuste.model.ts`, `ruma.model.ts`, `mii.model.ts`, `cancha.model.ts`, `producto.model.ts` | `explain` en dev confirma `IXSCAN`; suite de tests de modelos en verde | `git revert` | DET-2, DET-5, DET-8 | pending | 1 |
| S1.T3 | Corregir el bug de filtro por estado en `queryRumas`: `isValidObjectId(filter.estadoRuma)` → `isValidObjectId(filter.estado)` en la linea 37, con test de regresion que cubra el filtro nuevo y los filtros existentes (`ruma`, `especie`, `cancha`) | REQ-IMPROVE-05, REQ-PRESERVE-02 | developer | — | `pehuen-server/src/services/ruma.service.ts`, `pehuen-server/tests/services/ruma.service.spec.ts` (o ubicacion equivalente de tests existentes) | test unitario nuevo en verde + suite existente de `ruma.service` en verde | `git revert` | DET-2, DET-7, DET-8, DET-40 | pending | 1 |
| S1.T4 | Documentar y configurar `autoIndex:false` en la conexion de produccion de `pehuen-server`, mas el procedimiento off-peak de creacion de indices sobre la base de produccion | REQ-IMPROVE-06 | developer | S1.T2 | config de conexion Mongoose de `pehuen-server` (`src/config` o equivalente), spec (seccion Technical reference) | revision manual de la config + procedimiento documentado ejecutable | `git revert` | DET-2, DET-8, DET-41 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr validacion del tier, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Indices Nuxt (auditoria + completitud) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Comparar el set definitivo de S1.GATE contra los indices declarados en `pehuen_nuxt/server/models/*.model.ts` y listar exactamente que falta (tabla del spec, Artifacts → "Indices Nuxt") | REQ-IMPROVE-02 | researcher | S1.GATE | `pehuen_nuxt/server/models/guia.model.ts`, `ruma.model.ts`, `ajuste.model.ts`, `guia-volumen.model.ts`, y modelos de `producto`/`cancha`/`mii` si existen | tabla comparativa completa, sin filas ambiguas | (no aplica) | DET-2, DET-5, DET-11 | pending | 2 |
| S2.T2 | Agregar en los modelos Nuxt los indices faltantes detectados en S2.T1 | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S2.T1 | modelos Nuxt correspondientes | `explain` en dev (base Nuxt) confirma `IXSCAN`; tests de modelos en verde | `git revert` | DET-2, DET-8 | pending | 2 |
| S2.T3 | Verificar (con test, no solo lectura) que `RUMA_FILTER_RULES` (`server/services/ruma.service.ts:25-31`) no tiene el bug de REQ-IMPROVE-05; agregar test de regresion que confirme el filtro por `status` | REQ-IMPROVE-05, REQ-PRESERVE-02 | developer | — | `pehuen_nuxt/server/services/ruma.service.ts`, test correspondiente en `tests/unit/` | test nuevo en verde | `git revert` | DET-2, DET-4, DET-7 | pending | 2 |
| S2.T4 | Configurar `autoIndex:false` en `pehuen_nuxt/server/plugins/db.ts` para el entorno de produccion, documentar el mismo procedimiento off-peak de S1.T4 adaptado a la conexion Nuxt | REQ-IMPROVE-06 | developer | S2.T2 | `pehuen_nuxt/server/plugins/db.ts`, spec (Technical reference) | revision manual de config + test de arranque en modo test/dev sin regresion | `git revert` | DET-2, DET-8, DET-41 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir resultados, correr validacion del tier, decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Helper optimizado legacy: dos candidatos + harness de paridad y rendimiento [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Medir baseline "antes" limpio: dropear temporalmente (solo en dev, D3) los 4 indices creados durante el analisis (`guias{ruma:1}`, `guiaextradatas{guia:1}`, `ajustes{ruma:1}`, `rumas{cancha:1,createdAt:-1}`), correr `explain`/benchmark de `fillRumaData` original, y volver a crearlos al finalizar la medicion | REQ-PRESERVE-01 | tester | S1.GATE | (sin archivos de codigo — script de medicion en `scratchpad` o carpeta de scripts del repo) | reporte de baseline con tiempos y `docsExamined` sin indices | recrear los 4 indices (comando documentado) | DET-2, DET-8 | pending | 3 |
| S3.T2 | Enumerar (DET-40) todo lo que hace `fillRumaData` hoy: cada campo calculado, la rama `movimiento` 1/4 vs 2/3, `ADD`/`REDUCE` de ajustes, `selectLast` de `guiaExtraData`, dedup de especies VIGENTE, `productQty` filtrado por `volCalculado>0` — dejar la lista como checklist de paridad en el spec (Technical reference) | REQ-PRESERVE-01 | researcher | — | spec (Technical reference), sin cambios de codigo | checklist completo revisado contra `ruma.service.ts:47-208` linea por linea | (no aplica) | DET-2, DET-4, DET-40 | pending | 3 |
| S3.T3 | Implementar `fillRumaDataMap`: `.lean()` en `Guia.find`/`GuiaExtraData.find`/`Ajuste.find`, `Map<guiaArauco, IGuiaExtraData[]>` y `Map<rumaId, guias/ajustes[]>` en vez de los `.filter()` de las lineas 64, 114, 146; parseo de fecha fuera del loop donde sea posible; sin tocar `fillRumaData` original ni el endpoint productivo | REQ-IMPROVE-03, REQ-PRESERVE-03 | developer | S3.T2 | `pehuen-server/src/services/ruma.service.ts` | test unitario de la funcion nueva (sin activarla en el endpoint) | eliminar la funcion nueva (no afecta produccion, `fillRumaData` sigue activo) | DET-2, DET-5, DET-8, RULE-RUMA-004, RULE-RUMA-005 | pending | 3 |
| S3.T4 | Implementar `fillRumaDataAggregate`: `aggregate()` con `$lookup`+`$group` sobre `guias`, `guiaextradatas`, `ajustes` resolviendo el mismo calculo, sin tocar `fillRumaData` original | REQ-IMPROVE-03, REQ-PRESERVE-03 | developer | S3.T2 | `pehuen-server/src/services/ruma.service.ts` | test unitario de la funcion nueva | eliminar la funcion nueva | DET-2, DET-5, DET-8, RULE-RUMA-004, RULE-RUMA-005 | pending | 3 |
| S3.T5 | Harness de paridad: deep-equal de `volCalculado`, `volMR`, `volM3`, `mesCorta`, `anioPlantacion`, `producto`/`productQty`, `especiesGuias`, `zona`, `procedencia` entre `fillRumaData`, `fillRumaDataMap` y `fillRumaDataAggregate`, sobre CN Molina + canchas variadas + casos borde del checklist de S3.T2 | REQ-PRESERVE-01 | tester | S3.T3, S3.T4 | test de integracion nuevo en `pehuen-server` (`src/services/__tests__/ruma.service.parity.spec.ts` o ubicacion equivalente) | test en verde, 0 diferencias reportadas | eliminar el test (no afecta produccion) | DET-2, DET-7, DET-40 | pending | 3 |
| S3.T6 | Harness de rendimiento/memoria: medir latencia y memoria de los 3 helpers sobre el mismo input (CN Molina + cancha con muchas rumas), en Node nativo o midiendo solo capa DB con `explain` (Learn L1 — nunca end-to-end bajo qemu como proxy de prod) | REQ-IMPROVE-03 | tester | S3.T3, S3.T4, S3.T1 | script de benchmark (scratchpad o carpeta de scripts), spec (NFRs / Technical reference con resultados) | reporte con tiempos before/after documentado en el spec | (no aplica — script de medicion) | DET-2, DET-13 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir resultados, correr validacion del tier (regresion + mutation si aplica), decidir continue/iterate/escalate/standby | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5, S3.T6 | ticket | gate persistido + decision documentada + paridad verde | (no aplica) | DET-20, DET-23, DET-35 | pending | 3 |

### Session 4 — Helper optimizado Nuxt: dos candidatos + harness de paridad y rendimiento [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Enumerar (DET-40) el comportamiento actual de `fillRumaData` de Nuxt linea por linea (`server/services/ruma.service.ts:119-277`), incluyendo el manejo de `avgMsToMesCortaSantiago`, `collectEspeciesGuias`, y el `selectLast` de `GuiaVolumen` (PEH-005/PEH-017) — checklist de paridad en el spec. Ademas, verificar la divergencia detectada (L5 del ticket: Nuxt devuelve `producto` sin el filtro `volCalculado>0` y no expone `productQty`): si se confirma, crear un record `BUG-` en `bugs/rumas/` documentando la divergencia (NO corregir aqui — fuera de alcance); si es intencional y aceptada, registrarlo como Open question resuelta | REQ-PRESERVE-01 | researcher | — | spec (Technical reference), `projects/pehuen/bugs/rumas/` (si se confirma) | checklist completo revisado contra el archivo + veredicto explicito sobre la divergencia producto/productQty (BUG creado u Open question cerrada) | (no aplica) | DET-2, DET-4, DET-40 | pending | 4 |
| S4.T2 | Implementar `fillRumaDataMap` en Nuxt: `Map<rumaId, guias[]>`/`Map<rumaId, ajustes[]>` reemplazando los `.filter()` de las lineas 166-167, y `Map<guiaArauco, guiaVolumen[]>` reemplazando el `.filter()` de la linea 210; sin tocar `fillRumaData` original ni el export usado por `queryRumas` | REQ-IMPROVE-04, REQ-PRESERVE-03 | developer | S4.T1 | `pehuen_nuxt/server/services/ruma.service.ts` | test unitario de la funcion nueva (sin activarla en `queryRumas`) | eliminar la funcion nueva | DET-2, DET-5, DET-8, RULE-RUMA-004, RULE-RUMA-005 | pending | 4 |
| S4.T3 | Implementar `fillRumaDataAggregate` en Nuxt como segundo candidato; documentar en el spec si aporta ventaja real dado que Nuxt ya pagina antes de enriquecer (dataset acotado) — si no aporta, dejar la funcion como candidato descartable con razon registrada, no eliminarla sin decision en S5 | REQ-IMPROVE-04, REQ-PRESERVE-03 | developer | S4.T1 | `pehuen_nuxt/server/services/ruma.service.ts` | test unitario de la funcion nueva | eliminar la funcion nueva | DET-2, DET-5, DET-8 | pending | 4 |
| S4.T4 | Harness de paridad Nuxt: deep-equal de los mismos campos que S3.T5, sobre una pagina real con volumen equivalente a CN Molina + casos borde | REQ-PRESERVE-01 | tester | S4.T2, S4.T3 | `pehuen_nuxt/tests/unit/server/services/ruma.service.parity.test.ts` (o ubicacion equivalente) | test en verde, 0 diferencias | eliminar el test | DET-2, DET-7, DET-40 | pending | 4 |
| S4.T5 | Harness de rendimiento/memoria Nuxt: medir latencia y memoria de baseline vs Map vs aggregation sobre la pagina de prueba | REQ-IMPROVE-04 | tester | S4.T2, S4.T3 | script de benchmark, spec (NFRs / Technical reference) | reporte before/after documentado | (no aplica) | DET-2, DET-13 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir resultados, correr validacion del tier, decidir continue/iterate/escalate/standby | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4, S4.T5 | ticket | gate persistido + decision documentada + paridad verde | (no aplica) | DET-20, DET-23, DET-35 | pending | 4 |

### Session 5 — Corte: elegir ganador por evidencia y deprecar helpers viejos [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Consolidar la evidencia de paridad + rendimiento de S3.GATE y S4.GATE y decidir el helper ganador por codebase (Map o aggregation), registrando la decision como DEC-LOCAL en el spec (D2 del ticket: data-driven, no elegido a priori) | REQ-IMPROVE-03, REQ-IMPROVE-04 | reviewer | S3.GATE, S4.GATE | spec (Decisions) | decision documentada con datos de ambos harness citados | (no aplica) | DET-2, DET-13, DET-14 | pending | 5 |
| S5.T2 | Conmutar el endpoint de `pehuen-server` (`listRumas`/`getRumaById` en `ruma.controller.ts`) al helper ganador de S5.T1, removiendo el mecanismo temporal de seleccion (flag/param) | REQ-IMPROVE-03 | developer | S5.T1 | `pehuen-server/src/controllers/ruma.controller.ts`, `pehuen-server/src/services/ruma.service.ts` | suite completa de `ruma` en verde + smoke manual de `GET /api/rumas?cancha=CN_MOLINA` | `git revert` | DET-2, DET-8, DET-13 | pending | 5 |
| S5.T3 | Conmutar `queryRumas` de `pehuen_nuxt` al helper ganador de S5.T1 | REQ-IMPROVE-04 | developer | S5.T1 | `pehuen_nuxt/server/services/ruma.service.ts` | suite `tests/unit` de `ruma.service` en verde | `git revert` | DET-2, DET-8, DET-13 | pending | 5 |
| S5.T4 | Marcar como deprecado (comentario + JSDoc `@deprecated`, sin eliminar) el helper original y el candidato perdedor en ambos codebases, a la espera del visto bueno explicito del dev para eliminarlos (D del ticket, punto 4: no eliminar antes) | REQ-PRESERVE-01 | developer | S5.T2, S5.T3 | `pehuen-server/src/services/ruma.service.ts`, `pehuen_nuxt/server/services/ruma.service.ts` | revision manual + comentario `@deprecated` presente | `git revert` | DET-2, DET-8 | pending | 5 |
| S5.T5 | Actualizar documentacion oficial afectada (CLAUDE.md/docs de ambos repos si documentan la arquitectura de `fillRumaData` o la estrategia de indices) y correr la suite completa de regresion de ambos codebases (DET-37 dim1 + dim4) | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-IMPROVE-03, REQ-IMPROVE-04, REQ-PRESERVE-02 | developer | S5.T2, S5.T3 | `pehuen_nuxt/docs/` (si aplica), `pehuen-server` README/docs (si existen), suites de test de ambos repos | `pnpm lint && npx nuxt typecheck && pnpm test:run` en Nuxt en verde; suite de `pehuen-server` en verde | `git revert` | DET-2, DET-37 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — persistir resultados, correr validacion del tier, decidir continue/iterate/escalate/standby, verificar acceptance checkpoints completos | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4, S5.T5 | ticket | gate persistido + decision documentada + acceptance checkpoints verificados | (no aplica) | DET-20, DET-23 | pending | 5 |

## Auditoria de reemplazo (DET-40)

El criterio de paridad para `fillRumaDataMap`/`fillRumaDataAggregate` (legacy y Nuxt) es replicar 1:1 lo que hace `fillRumaData` hoy. Enumeracion de lo que el camino viejo hace (base para el checklist de S3.T2/S4.T1):

1. **Por cada guia de la ruma**: acumula `producto.codigo` en un set; toma `largo` de la ultima guia procesada (sobrescribe, no acumula); suma `mesCorta` (timestamp parseado con `moment(fechaCorta, 'DD-MM-YYYY')`) y `anioPlantacion` para promediar despues; suma o resta `volumenRecepcion`/`volumenDespacho` a `volCalculado` segun `movimiento` (1 o 4 = suma/recepcion, 2 o 3 = resta/despacho); acumula `zona.descripcion` y `procedencia.descripcion` en sets; acumula lo mismo en `productQty[producto.codigo]` (un acumulador paralelo por producto).
2. **Especies VIGENTE (PEH-016/PEH-017)**: solo si `guia.estado === 'VIGENTE'`, agrega `{codigo, descripcion}` de la especie a un `Map` deduplicado por codigo — esto alimenta `especiesGuias`, no afecta `especie` del doc Ruma ni `producto`.
3. **GuiaExtraData (`selectLast`)**: por cada guia, filtra `guiaExtraData` por `guia.guiaArauco === guiaExtraData.guia` y toma **solo el ultimo** elemento (`items.pop()`, no todos los matches) — si `tipoDato` es `ENTRADA`/`COMPRAS`, suma `volMR`/`volM3`; si es `SALIDA`, resta. Aplica tanto a los totales generales como a `productQty` del producto de esa guia.
4. **Ajustes**: por cada ajuste de la ruma, agrega su producto a `productQty` si no existe; suma `fechaCorta`/`anioPlantacion` a los mismos acumuladores que las guias (mismo denominador `dataQtyMesCorta`/`dataQtyAnioPlantacion` = cantidad de guias + cantidad de ajustes que tienen ese campo); si `largo` de totals aun no esta seteado y el ajuste tiene `largo`, lo usa; si `tipoAjuste === 'ADD'` suma `valorAjuste`/`valorAjuste`/`valorAjusteM3` a `volCalculado`/`volMR`/`volM3` (y a `productQty` del producto del ajuste); si `'REDUCE'`, resta.
5. **Promedios finales**: `mesCorta = totals.mesCorta / dataQtyMesCorta` formateado `MM-YYYY` solo si el resultado es `> 0`, si no, cadena vacia; `anioPlantacion = Math.floor(totals.anioPlantacion / dataQtyAnioPlantacion)` (puede ser `NaN` si el denominador es 0 — el legacy no lo maneja distinto, la paridad debe reproducir el mismo `NaN`, no "corregirlo").
6. **`productQty` final**: de todo el acumulador por producto, solo sobreviven al resultado los productos con `volCalculado > 0` (filtro final); si ninguno sobrevive, `producto` en la respuesta es `[]` (no la lista completa de productos vistos).
7. **`producto` (campo del objeto devuelto)**: si `hasProducts` (algun producto sobrevivio al filtro de `volCalculado>0`), es la lista de esas claves (codigos); si no, `[]`. **Distinto** del array `productos` (todos los codigos vistos, sin filtrar) que se descarta para el campo final — solo se usa como fuente de `productQty`.
8. **Redondeo**: `volCalculado`, `volMR`, `volM3` se redondean a 2 decimales (`toFixed(2)` convertido de nuevo a `Number`) — la paridad debe redondear en el mismo punto del calculo, no antes ni despues.

Cualquier candidato que no reproduzca alguno de estos 8 puntos (incluyendo el manejo de `NaN`/cadena vacia en los casos sin datos) es un hallazgo bloqueante para el corte de S5, registrado en la tabla de Test cases del ticket, no silenciado como "mejora" del comportamiento.

En Nuxt, la version actual (`server/services/ruma.service.ts:119-277`) ya replica los mismos 8 puntos usando `Map`/objetos en vez de `Set` para producto (`Array.from(productos)` sin el filtro `productQty[...].volCalculado>0` — **diferencia detectada**: Nuxt actual devuelve `producto: Array.from(productos)` sin aplicar el filtro por `volCalculado>0` del punto 7 del legacy, y no expone `productQty` en el resultado. Esto se registra como Open question: verificar si es una divergencia intencional de la migracion ya aceptada (fuera de alcance de este ticket, que solo optimiza memoria/DB) o un gap de paridad pendiente de otro ticket — **no se corrige aqui** sin decision explicita del dev, porque tocar el contrato de `producto`/`productQty` de Nuxt excede el alcance solicitado (indices + memoria, no paridad funcional Nuxt vs legacy).

## Gate de necesidad/reuso (DET-32)

| Artifact/REQ nuevo | Veredicto | Razon |
|---------------------|-----------|-------|
| Indices legacy (REQ-IMPROVE-01) | build | No existen hoy (H1 confirmado con `getIndexes()`); no hay alternativa mas barata que declararlos |
| Indices Nuxt (REQ-IMPROVE-02) | reuse/reduce | La mayoria ya existe (H5); solo se completa lo que falte tras la comparativa — no se construye desde cero |
| `fillRumaDataMap` legacy (REQ-IMPROVE-03) | build | No existe candidato optimizado hoy; el benchmark confirma la necesidad (H3) |
| `fillRumaDataAggregate` legacy (REQ-IMPROVE-03) | build | Candidato alternativo pedido explicitamente por D2 del ticket (comparar dos enfoques antes de decidir) |
| `fillRumaDataMap` Nuxt (REQ-IMPROVE-04) | build | El residual O(n^2) esta confirmado (H5); no hay Map existente que reusar |
| `fillRumaDataAggregate` Nuxt (REQ-IMPROVE-04) | build | Segundo candidato por D2; su necesidad final se evalua en S4.T3 dado que el dataset ya esta paginado (podria terminar en `drop` si no aporta, decision de S5) |
| Fix bug filtro estado legacy (REQ-IMPROVE-05) | build | Bug confirmado (L4), no hay alternativa de config |
| Estrategia `autoIndex:false` + script off-peak (REQ-IMPROVE-06) | reduce | Se resuelve con configuracion de conexion + procedimiento documentado, no con un artefacto de codigo nuevo |
| Harness de paridad/rendimiento (S3/S4) | build | No existe hoy ningun test de paridad para `fillRumaData`; es prerequisito de DET-40/DET-7 |

Registro observable: `planning-completeness`/`necessity-assessment` a completar por el owner del design al cerrar este step (fuera del contenido estatico del spec).

## Completitud de planificacion (DET-37)

| Dimension | Estado | Detalle |
|-----------|--------|---------|
| 1. Docs oficiales del proyecto | task (S5.T5) | El cambio es observable (comportamiento de performance + fix de filtro); se revisa/actualiza documentacion de arquitectura de `fillRumaData` si existe en `pehuen_nuxt/docs/` o READMEs de `pehuen-server` |
| 2. KB interno DKC | mixed | Este ticket no crea una `RULE` nueva de negocio (el comportamiento de `fillRumaData` ya esta cubierto por RULE-RUMA-005); si S3.T2/S4.T1 detectan una divergencia de paridad Nuxt vs legacy no corregida (ver Auditoria de reemplazo), se registra como `BUG-` o entrada en Open questions al cierre, no como task de esta spec |
| 3. Docs externas DKC | N/A | El ticket no modifica DKC ni sus convenciones |
| 4. Tests | task (S1.T3, S2.T3, S3.T5, S3.T6, S4.T4, S4.T5, S5.T5) | Tests de regresion del fix (S1/S2) + harness de paridad y rendimiento (S3/S4) + regresion completa antes del corte (S5) |

## Dimensionamiento contra volumen real (DET-41)

| Pieza | Cardinalidad de produccion estimada | Forma elegida | Veredicto |
|-------|--------------------------------------|----------------|-----------|
| `Guia.find({ruma:$in})` en `fillRumaData` | crece con el uso: hoy 290752 docs en `guias`, seguira creciendo con cada guia registrada | index seek (`{ruma:1,estado:1}`) acota el costo a los documentos de las rumas de la pagina, no al total de la coleccion | bounded |
| `GuiaExtraData.find({guia:$in})` | 314834 docs hoy, mismo patron de crecimiento | index seek (`{guia:1}`) + `Map` para el join en memoria en vez de `.filter()` O(n^2) | bounded |
| `queryRumasAll` (reportes, Nuxt, sin paginar) | crece con el total de rumas activas (miles) | **fuera de alcance de este ticket** (ver Executive summary → "Que NO se hace") | needs-redesign (registrado, no resuelto aqui — candidato a ticket derivado) |
| Listado paginado de rumas (`queryRumas`, ambos codebases) | acotado por `qty`/`per_page` (tipico 10-20 por pagina) | paginacion ya existente (`skip/limit`); `fillRumaData` solo procesa la pagina, no el total | bounded |

## Constraints

- RULE-RUMA-004: `Ruma.producto` es `[String]` de codigos — cualquier helper nuevo (legacy y Nuxt) MUST devolver `producto` como array de strings, nunca ObjectId.
- RULE-RUMA-005: los volumenes (`volCalculado`, `volMR`, `volM3`) se calculan al vuelo, nunca se persisten en la coleccion `rumas` — los helpers optimizados no cambian esto, solo el mecanismo de calculo.
- RULE-RUMA-001/002/003: no aplican directamente a este ticket (inmutabilidad de `numero`, unicidad activa, `geo.lon`) pero se preservan por no tocar esos paths.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| MongoDB (dev, contenedor host) | internal | Base sobre la que se validan indices con `explain` antes de declararlos en modelos | Si la db de dev diverge en volumen/shape de la de produccion, la validacion de `explain` puede no representar el comportamiento real |
| MongoDB managed (DigitalOcean, `mongodb+srv://`) | external | Base de produccion donde se ejecuta la estrategia de creacion off-peak (REQ-IMPROVE-06) | Sin acceso directo a un entorno de staging equivalente, la creacion en produccion requiere ventana de mantenimiento coordinada con el dev |
| Suite de tests existente (`ruma.service`, ambos repos) | internal | Debe seguir en verde tras cada cambio (REQ-PRESERVE-02) | Si la suite tiene gaps de cobertura sobre `fillRumaData`, una regresion podria no detectarse antes del corte de S5 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El helper optimizado difiere del original en un caso borde no cubierto por el harness | medium | alto (calculo de volumen de madera incorrecto en produccion) | Harness de paridad construido desde el checklist DET-40 (8 puntos enumerados), no solo desde el caso CN Molina; bloqueante para el corte de S5 |
| Crear indices en produccion durante horario de carga genera contencion o timeout | medium | alto (afecta usuarios activos) | `autoIndex:false` + creacion off-peak documentada (REQ-IMPROVE-06), nunca automatica en el arranque |
| Medir rendimiento en el legacy local bajo qemu y concluir una mejora que no representa produccion | alto (ya ocurrio en el analisis, Learn L1) | medio (decisiones de diseño basadas en datos distorsionados) | Toda medicion de S3.T6/S4.T5 en Node nativo o capa DB con `explain`, documentado explicitamente en el reporte |
| El candidato aggregation no aporta ventaja real en Nuxt (dataset ya paginado) y se invierte esfuerzo sin beneficio | medio | bajo | S4.T3 documenta explicitamente la evaluacion; si no aporta, se registra como candidato descartado con razon, decision final en S5.T1 con datos |
| Scope creep hacia la paginacion de `queryRumasAll` o la divergencia de `producto`/`productQty` en Nuxt (detectada en la Auditoria de reemplazo) | medio | medio | Ambos quedan explicitamente fuera de alcance (Executive summary + Open questions), no se tocan sin decision separada del dev |

## Open questions

- [ ] Divergencia detectada en Auditoria de reemplazo: Nuxt actual devuelve `producto` sin el filtro `volCalculado>0` del legacy y no expone `productQty` en el resultado — ¿es aceptado como comportamiento correcto de la migracion, o es un gap pendiente para otro ticket? No se corrige en este ticket sin decision del dev.
- [ ] Los candidatos de indice de prioridad media/baja (`ajustes{batch:1}`, `rumas{numero:1}`, etc.) — ¿se validan con `explain` en S1.T1 igual que los de alta prioridad, o quedan fuera del alcance de este ticket por default y se registran en Backlog?
- [ ] `queryRumasAll` (reportes Nuxt, sin paginar, `server/services/ruma.service.ts:78-92`) — confirmado como candidato a ticket derivado (DET-41 needs-redesign), pendiente de que el dev decida si se abre ahora o se prioriza despues.
- [ ] Version exacta de MongoDB en el proveedor managed de produccion (DigitalOcean) — necesaria para confirmar si el build de indices soporta `background`/online sin bloquear el replicaSet primario (afecta el procedimiento exacto de REQ-IMPROVE-06).

## Decisions

Sin decisiones locales cerradas al momento de escribir este spec (D1-D4 del ticket ya estan resueltas y documentadas en `tickets/PEH-031.md`). El corte Map vs aggregation (D2, data-driven) se registra como `DEC-LOCAL-01` en S5.T1 tras evidencia de S3.GATE/S4.GATE.

### DEC-LOCAL-01: helper ganador del corte S5 — `fillRumaDataMap` en ambos codebases

**Decision**: `fillRumaDataMap` es el helper ganador tanto en `pehuen-server` (legacy) como en `pehuen_nuxt`. Se conmuta el endpoint productivo a este helper en S5.T2/S5.T3. `fillRumaDataAggregate` (ambos repos) NO se elimina: queda `@deprecated` a la espera del visto bueno explicito del dev (D del ticket, punto 4).

**Evidencia citada (S3.GATE, legacy — benchmark Node nativo, CN Molina)**:
- `fillRumaDataMap`: 205ms / 32MB.
- `fillRumaDataAggregate`: 393ms / 13MB.
- Paridad (REQ-PRESERVE-01): OK para ambos candidatos.
- `fillRumaDataMap` es ~2x mas rapido que `fillRumaDataAggregate`, y no depende de la aproximacion `$sort:{_id:1}` que `fillRumaDataAggregate` usa para replicar `selectLast` (orden de insercion no garantizado por Mongo — ver JSDoc de `fillRumaDataAggregate` en `pehuen-server/src/services/ruma.service.ts`).

**Evidencia citada (S4.GATE, Nuxt)**:
- Paridad (REQ-PRESERVE-01): OK para ambos candidatos.
- Ganancia de rendimiento marginal en ambos frente al baseline, porque `queryRumas` ya acota el dataset a la pagina actual (10-20 rumas tipico) antes de enriquecer — a diferencia del legacy, que procesa el listado completo sin paginar.
- `fillRumaDataMap` se prefiere igual: elimina el `.filter()` O(n^2) residual sin la complejidad adicional de un pipeline `aggregate()` que no aporta ventaja medible dado el tamaño de pagina acotado.

**Por que no `fillRumaDataAggregate`**: en legacy pierde en rendimiento y memoria pese a paridad OK; en Nuxt la ganancia es marginal y no compensa la complejidad extra del pipeline `$lookup`/`$group` frente al `Map`, que ademas es el mismo patron ya usado y validado en el otro codebase (consistencia entre repos).

**Estado de los perdedores**: `fillRumaDataAggregate` (legacy y Nuxt) permanece en el codigo, marcado `@deprecated`, sin activarse en ningun endpoint productivo. `fillRumaData` original (baseline, ambos repos) tambien queda `@deprecated` tras el corte, sin eliminarse.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Latencia `GET /api/rumas?cancha=CN_MOLINA` (Node nativo) | ~1.5s (benchmark nativo, ticket) | reduccion medible con indices + helper optimizado, documentada en S3.T6 | benchmark en Node nativo, no end-to-end bajo qemu |
| `docsExamined` en `explain` de `guias{ruma:$in}` | 290752 (COLLSCAN) | cercano a `nReturned` (~3726) | `db.guias.find({ruma:$in}).explain('executionStats')` |
| Filtro por estado en `GET /api/rumas?estado=...` (legacy) | no aplica (bug) | aplica correctamente | test de regresion S1.T3 |

## Technical reference

**Endpoint y cadena de llamada (legacy)**: `GET /api/rumas` → `RumaController.listRumas` (`ruma.controller.ts:135`) → `rumaService.queryRumas` + `rumaService.fillRumaData` (`ruma.service.ts:14,47`).

**Endpoint y cadena de llamada (Nuxt)**: `GET /api/rumas` → handler correspondiente → `queryRumas` (`ruma.service.ts:42`) → `fillRumaData` (`ruma.service.ts:119`).

**Mediciones de referencia (db dev, legacy bajo qemu)**: `rumas?cancha=CN_MOLINA` 17.9s; `rumas` sin filtro pagina 1: 0.55s. Benchmark Node nativo: hydrate+populate 592ms, lean+populate 267ms, join O(n^2) 233ms vs Map 2ms. Capa DB cruda: Guia 461ms, Extra 223ms, Ajuste 3ms (pre-indices).

**Tras crear indices (dev)**: `guias{ruma:$in}` 283ms/290752 docsExamined → 9ms/3726; `guiaextradatas{guia}` 157ms/314834 → 27ms/4177.

**Procedimiento de creacion off-peak (a completar en S1.T4/S2.T4 con la version confirmada de MongoDB del proveedor)**: crear indices con `createIndex({background: true})` (Mongo < 4.2) o build online (Mongo >= 4.2, default), en horario de baja carga, monitoreando `currentOp` para contencion; `autoIndex:false` en la conexion de produccion evita que Mongoose intente crearlos en cada arranque del proceso.

## Rules discovered

Ninguna rule nueva prevista. Si S3.T2/S4.T1 detectan un comportamiento no documentado de `fillRumaData` que amerite una RULE (ej. el manejo de `NaN` en `anioPlantacion` sin datos), se crea en `rules/rumas/` y se referencia aqui durante la ejecucion.

## Bugs found

- BUG (a crear en ejecucion si se confirma): divergencia `producto`/`productQty` entre legacy y Nuxt fillRumaData, detectada en Auditoria de reemplazo — pendiente de decision del dev (ver Open questions).

## Acceptance checkpoints

- [ ] **Funcional**: todos los scenarios de REQ-IMPROVE-01 a 06 y REQ-PRESERVE-01 a 03 pasan
- [ ] **Tests** (DET-37 dim4): harness de paridad (S3.T5, S4.T4) y de regresion (S1.T3, S2.T3) en VERDE, no solo escritos
- [ ] **NFRs**: latencia y `docsExamined` dentro del target documentado en S3.T6/S4.T5
- [ ] **Rules**: RULE-RUMA-004 y RULE-RUMA-005 respetadas en los helpers nuevos
- [ ] **Integration**: suite completa de `ruma.service` (legacy y Nuxt) y consumers del listado en verde tras el corte de S5
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): actualizadas en S5.T5 si el cambio de arquitectura de `fillRumaData` esta documentado en algun README/docs
- [ ] **KB DKC** (DET-37 dim2): divergencia Nuxt/legacy de `producto`/`productQty` registrada (BUG o Open question resuelta), no silenciada
- [ ] **Docs externas DKC** (DET-37 dim3): N/A — este ticket no toca DKC
- [ ] **Planning-completeness**: entry `planning-completeness` registrada (mixed, ver tabla DET-37 arriba)

## Archiving

Ver seccion estandar del template — usar `/dkc-archive-spec SPEC-rumas-improve-db-perf "razon"` cuando esta spec deje de ser fuente de verdad. No borrar manualmente.
