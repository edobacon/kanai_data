---
id: DOC-kb-sp9-ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp
project: up1
type: doc
module: mcp
tags:
  - sp9
  - mcp
  - cd
  - cm
  - backend-vs-client
  - endurecimiento
  - blockGenericMutation
  - elric
  - paridad
  - watermark
---

# Analisis backend vs client-side (cd, cm) y endurecimiento del MCP

> Estado: analisis cerrado. Fecha: 2026-08-28. Proyecto: up1.
> Artefacto visual (matriz completa, tablas con file:linea, plan y tickets):
> https://claude.ai/code/artifact/6be7c907-4f8f-4624-9945-77b6363faf2b
> El detalle completo (incluida la matriz de 89 reglas de cm) esta ahora transcripto en texto en el **Anexo A** de este documento, para no depender solo del enlace. El HTML del artefacto se conserva como copia de archivo aparte (el store del KB solo admite markdown via tools).
>
> **Watermark del analisis (hasta que commit es valido):**
> - curriculum-design (cd): `origin/develop @ 8a151e7` (PR #54, UPONE-1700).
> - curriculum-mapping (cm): `origin/develop @ 584499e` (PR #21, UPONE-1689).
> - Para retomar: `git fetch` y revisar solo los commits posteriores a esos hashes.
> - Checkouts locales al momento (no modificados; se leyo en worktrees de solo lectura):
>   cd `develop@df18746`, cm `UPONE-1530-mcp-sync@303caf5`, mcp `feat/UPONE-1530-mcp-sync@30a032a`.

---

## 1. Los dos MCP

Hay dos codebases que resuelven el mismo dolor (un agente opera up1 con la identidad y permisos reales del usuario):

- **Elric** (`~/Workspace/uplanner/mcp`, paquete `up1-mcp`): PoC local, stdio, Clerk OTP, TypeScript, tools de dominio escritas a mano. Superficie rica en cd (36 tools) y uengagement.
- **Online** (`~/Workspace/uplanner/up1/mcp`, corre en HTTP :4100, rama `feat/UPONE-1530-mcp-sync`): linea productiva. HTTP + OAuth, multi-tenant, JavaScript, arquitectura declarativa (las tools de mod son "fichas" de datos que un motor generico convierte en tools; viven en `mods/<mod>/ai/` del monorepo up1).

## 2. Modelo: imperativo (Elric) vs declarativo (online)

- **Elric**: cada tool es una funcion `server.registerTool(...)` con su handler que hace todo (auth, resolver por nombre, preview, request GraphQL, formato). No hay motor: el patron se repite tool por tool.
- **Online**: la tool es una **ficha** (objeto de datos) y un unico motor generico (`mcp/src/tools/register-declarative-tools.js`) la convierte en tool real. Preview, confirm, request y poda de campos internos se escriben una sola vez.
- **Escape hatch `registerExtra`**: para el 68% custom-logic (sagas, upserts, tree-ops) que no entra en una ficha, el online escribe codigo a mano PERO aislado en `mods/<mod>/ai/`, sin importar nada del core por ruta relativa; todo llega por `ctx`. Ejemplo: `academic-scheduling/ai/rule-value-upsert.js` (`as_set_rule_value`). El motor invoca `pack.registerExtra?.(server, ctx)` para cada mod (mods/index.js), asi que agregar custom-logic NO obliga a tocar el central del MCP.

## 3. Donde vive la validacion, y los dos niveles de bypass

Una validacion solo es un invariante real si vive donde TODO write pasa por ella: el resolver de la plataforma. Si vive client-side (frontend o tool del MCP), cualquier otro camino la saltea.

- Regla en el **override de `createInstance`/`updateInstance`** del mod: el generico pasa por el gate. Infalsificable, incluso via CRUD generico y MCP.
- Regla en un **resolver `*Validated` separado**: el generico la puentea (escribe directo a la tabla) salvo que se bloquee.
- Regla **client-side**: la saltea cualquier cliente no-frontend.

**Dos niveles de bypass:**
1. **Intra-MCP**: que el propio MCP se auto-bypasee con `up1_create_object`/`update_object`. Lo cierra `blockGenericMutation` (Elric lo tiene via `refuseIfValidated`; el online NO -> es B3). Necesario pero no suficiente.
2. **Cross-client**: que la UI generica, la API directa u otra integracion salteen la regla. Solo lo cierra la regla en el resolver. `blockGenericMutation` no lo cubre.

Replicar una regla client-side en una tool del MCP NO alcanza si el generico sigue abierto sobre ese objeto: hace falta ademas `blockGenericMutation`. Y aun cerrado, protege el MCP, no el dato: eso solo lo hace el resolver.

## 4. Matriz consolidada backend vs client-side (develop)

Conteo: server-side 52 (cd 11 + cm 41), ambos 51 (cd 9 + cm 42), solo-client 18 (cd 12 + cm 6), sin enforcement + brechas parciales 3+2 (cd).

**Hallazgo central:** en develop los invariantes de OBJETO estan server-side en ambos mods (cd via overrides de createInstance/updateInstance; cm via resolvers `*Validated`). El riesgo de bypass por cliente no-frontend se concentra en: toda la MALLA de cd (sin backend) y las RUBRICAS de cm.

### 4.1 curriculum-design (cd)

Integridad de objeto (server-side / ambos):
- Modalidad: una sola isDefault por dueno -> sectionValidation:114; polymorphicUpdate:337 (server-side)
- Arbol de evaluacion: hijos <= peso del padre -> sectionValidation:124; polymorphicUpdate:359 (ambos)
- Publicar Activity: pesos suman exacto -> polymorphicUpdate:411 (server-side)
- Linea de formacion: minCredits<=maxCredits -> sectionValidation:135; polymorphicUpdate:705 (server-side)
- Curriculo: unicidad de linaje -> curriculum-create:184 (server-side)
- Perfil de egreso: singleton -> sectionValidation:173 (server-side)
- Requisitos: curso bloqueado por plan Active (create/update/delete) -> sectionValidation:149; polymorphicUpdate:456/707; requirementCategoryDelete:74 (ambos)
- Prerrequisitos: no ciclos -> sectionValidation:163; polymorphicUpdate:462/711 (server-side)
- Linea de formacion: no borrar con entradas -> requirementCategoryDelete:65 (server-side)
- Reverso: no revert Active->Draft con dependientes -> curriculum-update (documentDependents) (server-side)
- Alta/baja en lote: no vacio + FK + whitelist + atomicidad -> planEntry-batch:90-135 (server-side)
- Alta/baja en lote: RBAC -> planEntry-batch:141 (ambos)
- Programa academico: code unico -> AcademicProgram.json @@unique DB (server-side)
- Estado (Activity/Curriculum/Offering): transiciones declaradas -> objects/*.json + core enum (ambos)
- Silabo: name/code requeridos -> syllabus-offering:81 (ambos)
- Silabo: Activity=Course, code unico (activityLine,term), OrgUnit ejecutora -> syllabus-offering:98-123 (server-side)
- Plantilla feedback: solo Service, no sobrescribir, nombre -> activity-formtemplate:67-93 (ambos)
- RBAC objeto-nivel -> withObjectAuth core; polymorphicUpdate:687 (ambos)
- Arbol de secciones: name obligatorio -> not_null core (ambos)
- Arbol de secciones: borrado con impacto -> deleteImpactPreview core (ambos)
- Comentario de transicion (requiresComment): declarado, NO enforzado (ninguna capa)

Malla curricular (solo-client: sin reglas de negocio en backend; los resolvers de planEntry solo validan forma, atomicidad y RBAC):
- Editar malla solo si plan Draft -> curriculumMesh.logic.ts:362 (ningun resolver mira el status)
- Unicidad (planId, activityId) -> no (uniqueBy planId+period+position); activityPicker.logic.ts:17
- Impacto de borrado allow/cascade/block -> deletionImpact.logic.ts:238 (deletePlanEntriesBatch borra sin evaluar)
- Pre-check de prerrequisitos -> prereqCheck.logic.ts:41; evaluateRequirementTree:414
- Banner de violaciones -> meshPrereqScan.logic.ts:49
- Derivacion de nivel modular -> deriveLevel.logic.ts:100
- Recalculo period/position -> recalcPeriodPosition.logic.ts:76
- Alta guiada -> guidedAdd.logic.ts:50
- Forma de entrada (electiva/bloque, creditos) -> editEntryModal.logic.ts:71
- Bloque electivo (sentinel/minToSatisfy) -> blockSelect.logic.ts:29
- Sanitizacion de HTML -> RichTextRenderer/sanitizeHtml.ts (persiste crudo -> XSS por API)
- Valores de enum de RecordType -> no (requirement-object.md:50, backlog B-2)

Brechas de enforcement parcial:
- R0: cambiar progression con malla no vacia se esquiva por rt path -> curriculum-update:112 (RT_PATTERN:207 no cubre curriculum). Bypasseable.
- R1: createSyllabusOffering valida sesion pero NO llama RBAC de objeto -> syllabus-offering.resolver.js.

### 4.2 curriculum-mapping (cm) - 89 reglas, conteo server-side 41 / ambos 42 / solo-client 6

cm fue construido para MCP: cada escritura pasa por resolvers `*Validated`; el rediseno M-12 (2026-08-25) llevo garantias al modelo ("ninguna via de escritura, CRUD generico, MCP o API viejo, puede introducir una excepcion").

Las 6 solo-client (riesgo de bypass):
1. Rubrica: nombre de dimension obligatorio + peso numerico -> no (competencyTree-upsert:498-509 escribe sin validar); front rubric.ts:254; CompetencyTreeEditorElement.vue:1036.
2. Rubrica: pesos de criterios suman 100 -> no; front rubric.ts:138-160.
3. Bloqueo de administrar planes con alcance sin guardar -> no (solo aviso backend); front rowActions.ts:249; ...vue:62.
4. Edicion inline apagada en lista de matrices (unica barrera vs bulk-edit del core saltee RM1) -> default_CompetencyNode_list.json:61.
5. cm.displayDecimals (presentacion) -> useDisplayDecimals.ts:1-30.
6. Reparto de pesos en partes iguales (UX deliberada) -> weights.ts:61; rubric.ts:151.

Extra: hasMissingFields exige peso por fila cuando la rama pondera -> parcial (backend valida rango y suma, no exige peso por fila) -> useCompetencyTreeEditor.ts:330.

Gap declarado-pero-no-enforzado: gate de publicacion de matriz (RT5 / rubrica completa) mencionado en docs/README, ningun codigo lo aplica (la transicion va por enforceEnumTransitions del core, que no invoca validacion del mod). Equivalente al requiresComment.

Read-only / backend en construccion: alignment/reconcile (proponen, no escriben), versionado de LevelScheme declarado sin mutation, borrado gobernado de matriz inexistente, rubricDimension pendiente.

**La tabla completa de las 89 reglas de cm con file:linea esta transcripta en el Anexo A de este documento.** El mismo detalle en formato visual vive en el artefacto, seccion 09.

## 5. Plan de endurecimiento (A / B / C) y tickets

- **A - Server-side en el mod**: es invariante y puede vivir en el resolver (override create/update o validate*). Cierra para todos los clientes, sin duplicar.
- **B - Endurecer contrato MCP**: `blockGenericMutation` + tool custom. Solo cuando la regla YA esta server-side pero el generico/bulk la puentea, o stopgap de plataforma.
- **C - Queda client-side**: no es invariante (UX, presentacion, derivacion, advisory). No se enforza ni se duplica.

**Conclusion:** casi todos los invariantes client-side son server-side-able en el mismo mod (camino A). La duplicacion se evita moviendo el invariante al resolver. El unico caso limpio de B es cm CompetencyNode/RM1. Nada "debe persistir solo client-side" como invariante.

### Tickets - camino A (server-side en el mod)
- A-CD-1 (bajo, prioridad alta): Guard no editar planEntry si el plan no esta en Draft (create/update/delete), patron assertActivityNotInActivePlan.
- A-CD-2 (bajo): Unicidad (planId, activityId) en planEntry (@@unique o guard batch). Confirmar semantica de duplicado.
- A-CD-3 (medio): Guard de borrado que bloquea si deja requisitos insatisfacibles (deletePlanEntriesBatch).
- A-CD-4 (bajo): Validar forma de planEntry en create/update (electiva exige bloque, credito no negativo).
- A-CD-5 (medio): Mutation dedicada movePlanEntry con renumerado atomico de period/position.
- A-CD-6 (medio, SEGURIDAD): Sanitizar HTML de CustomSection en el write (whitelist, bloqueo javascript:/data:).
- A-CD-7 (bajo): R0, extender el guard de progression al path rt (rt__Plan__curriculum).
- A-CD-8 (bajo): R1, RBAC de objeto en createSyllabusOffering (withObjectAuth).
- A-CM-1 (bajo): Rubrica nombre de dimension + peso numerico (extender validateCompetencyTree).
- A-CM-2 (bajo): Rubrica pesos de criterios suman 100 (misma funcion).
- A-CM-3 (bajo): Exigir peso por fila cuando la rama pondera.
- A-CM-4 (medio): Gate de publicacion de matriz (RT5 + rubrica completa) en override de updateInstance, patron cd.
- A-CORE-1 (medio): Enforzar requiresComment en enforceEnumTransitions (Core Extension, cd+cm).
- A-CORE-2 (alto): Enforzar valores de enum de campos RecordType (backlog B-2, plataforma).

### Tickets - camino B
- B-CM-1 (medio): `blockGenericMutation` (u override de updateInstance) sobre CompetencyNode para que RM1 (unicidad de codigo), ya server-side, no la puentee el bulk-edit generico del core. No es duplicar: es cerrar el generico para que la regla existente siempre corra.

## 6. Tool custom vs generico: cuando es necesario y como endurecer

Dos ejes: donde vive el invariante, y si la operacion entra en una ficha. Un tool custom se justifica por logica o por proteger un invariante que el generico no cubre, nunca por gusto.

Niveles de endurecimiento:
- **N0 - Nada**: CRUD generico tal cual. Cuando el invariante vive en el override de createInstance/updateInstance (el generico ya pasa por el gate).
- **N1 - Bloquear generico**: `blockGenericMutation` sobre el objeto, redirige a la tool de dominio. Cuando el invariante esta en un `*Validated` SEPARADO que el generico puentea.
- **N2 - Custom + bloqueo**: tool `registerExtra` con la logica + `blockGenericMutation`. Cuando la operacion es custom-logic (saga/upsert/tree-op) o hay que replicar una regla client-side que el backend no tiene (stopgap).
- **N3 - Escalar al resolver**: mover el invariante al resolver del mod/core. Fix definitivo; vuelve innecesario N1/N2 (el generico pasa a N0).

Arbol de decision:
- Invariante en el override del generico + operacion simple -> No custom, N0. (objetos de cd hoy)
- Invariante en `*Validated` separado + operacion simple -> ficha al `*Validated`, N1. (escrituras de cm)
- Operacion custom-logic -> Si custom (registerExtra), N2 si el objeto es gobernado. (as_set_rule_value; malla de cd)
- Invariante solo client-side y el backend no puede tenerlo -> Si custom (replica), N2 + deuda. (enum RecordType hasta B-2)
- No es invariante (UX/derivacion/presentacion) -> No custom (opcional informativo), ningun endurecimiento.

Aplicado:
- **cd objetos: N0 hoy.** Invariantes en los overrides. El generico es seguro; no hace falta tool custom ni bloqueo.
- **cd malla: N3 (meta) o N2 (interino).** Hoy sin backend. Lo correcto es mover las reglas al resolver (tickets A-CD-1..6). Si el MCP expone escritura de malla antes, N2: tool custom que replica + blockGenericMutation.
- **cm escrituras: N1.** Invariantes en los `*Validated`. Falta cerrar el generico/bulk (B-CM-1). No hay que duplicar reglas.

Criterio corto: primero pregunta donde esta el invariante. En el override del generico -> N0. En un `*Validated` separado -> N1. Operacion con logica o replica del cliente -> N2. Siempre que puedas, escala la regla al resolver (N3): eso hace innecesario el resto. Un tool custom que solo repite una regla que podria vivir en el backend es deuda, no diseno.

## 7. Pendientes

- Pull real de develop cuando se liberen los ambientes (object-manager :4000, suite :3000, mcp :4100 en uso): cd fast-forward (2 commits); cm decidir si pasa a develop.
- Regla dura del entorno: NO tocar los checkouts vivos con checkout/pull mientras haya procesos usando los ambientes; usar worktrees de solo lectura.
- Priorizar y ticketar (Jira/Kanai) los A de bajo esfuerzo; A-CD-6 (sanitizacion HTML) es seguridad.

---

## Anexo A - Matriz completa de curriculum-mapping (89 reglas)

Transcripcion en texto de la seccion 09 del artefacto visual, para que el detalle no dependa solo del enlace. Convencion de la columna Clase: **server-side** = corre para cualquier cliente (infalsificable); **ambos** = el front valida por UX y el backend ademas enforza; **solo-client** = solo el frontend la aplica (un cliente MCP o una llamada GraphQL directa la saltea). Citas en formato `archivo:linea`; `no` en Backend = sin enforcement server-side.

### LevelScheme

| Funcionalidad | Regla | Backend | Client-side | Clase |
|---|---|---|---|---|
| LevelScheme | code de Scheme unico por owner (case-insensitive) | levelSchemeUniqueness.js:96,123; upsert:218 | default_LevelScheme_create.json:46 | ambos |
| LevelScheme | code de Level unico dentro del esquema | levelSchemeUniqueness.js:143; upsert:219 | RecordCollectionGrid.ts:125 | ambos |
| LevelScheme | Al menos un nivel isAchieved=true | validateLevelScheme.js:160 | no | server-side |
| LevelScheme | Umbrales sin solape y cubren la escala | validateLevelScheme.js:73-128 | useLevelSchemeEditor.ts:112 (mas estricta) | ambos |
| LevelScheme | Numerica exige scoreBasis y scaleMin < scaleMax | validateLevelScheme.js:189-201 | no | server-side |
| LevelScheme | Cualitativa sin umbrales | validateLevelScheme.js:222; upsert:193 | columns.ts:19 | ambos |
| LevelScheme | No eliminar esquema en uso | schemeUsage.js:50; upsert:360 | no | server-side |
| LevelScheme | position contigua 1..N | validateLevelScheme.js:135; upsert:187 | collectionOps.ts:19 | ambos |
| LevelScheme | weight >= 0 | validateLevelScheme.js:165 | no | server-side |
| LevelScheme | weight presente y numerico | validateLevelScheme.js:180 | create.json:47 | ambos |
| LevelScheme | Owner default = institucion del tenant | upsert:202-209 | no | server-side |
| LevelScheme | Nace isActive=true | upsert:212 | no | server-side |
| LevelScheme | isActive cascadea a los niveles | upsert:238; compositeCatalog.js:177 | no | server-side |
| LevelScheme | Clon: origen debe ser Scheme vigente | upsert:439 | no | server-side |
| LevelScheme | Borrado FK-safe y atomico | upsert:516-568 | no | server-side |
| Catalogos | Renombre en dos fases (temp) para swap de codes | compositeCatalog.js:95 | no | server-side |
| Catalogos | Dirty-checking: solo reescribe lo marcado | compositeCatalog.js:83 | collectionOps.ts:12 | ambos |
| LevelScheme | RBAC create/modify/delete server-side | upsert:170,393,496 | default_LevelScheme_list.json:28 | ambos |

### CoverageScheme

| Funcionalidad | Regla | Backend | Client-side | Clase |
|---|---|---|---|---|
| CoverageScheme | code unico por owner | coverageScheme-upsert:107 | default_CoverageScheme_list.json:32 | ambos |
| CoverageScheme | Codes de nivel sin repetir | validateCoverageScheme.js:69 | create.json:40 | ambos |
| CoverageScheme | Minimo 2 niveles | validateCoverageScheme.js:53 | no | server-side |
| CoverageScheme | name y code por nivel obligatorios | validateCoverageScheme.js:61 | create.json:39 | ambos |
| CoverageScheme | Renumerado 1..N | coverageScheme-upsert:89 | collectionOps.ts:19 | ambos |
| CoverageScheme | No eliminar escala en uso | schemeUsage.js:65; upsert:282 | no | server-side |

### Matriz de competencias

| Funcionalidad | Regla | Backend | Client-side | Clase |
|---|---|---|---|---|
| Matriz | code unico entre matrices | competencyMatrix-create:166; update:204 | no | server-side |
| Matriz | La escala es un Scheme activo | validateCompetencyMatrix.js:114; create:173 | create.json:165 | ambos |
| Matriz | name y code no vacios | create:163; update:189 | create.json:111 | ambos |
| Matriz | Nace en Draft, descarta el status del cliente | create:92,132,156 | create.json (oculto) | ambos |
| Matriz | Transicion de estado exige capability | update:257 (enforceEnumTransitions core) | create.json | ambos |
| Matriz | Promedio ponderado sobre escala cualitativa se rechaza | validateCompetencyMatrix.js:84; create:174 | no | server-side |
| Matriz | defaultRubricModel null si el modo es derivado | validateCompetencyMatrix.js:96; create:183 | create.json:198 | ambos |
| Matriz | Al menos una unidad duena | ownerUnits.js:70; create:161 | no | server-side |
| Matriz | Vigencia exigida solo a la unidad que se agrega | bridgeUnits.js:107; create:162 | no | server-side |
| Matriz | Tabla puente: undefined = no tocar, [] = vaciar | bridgeUnits.js:40,174 | no | server-side |
| Matriz | Reconciliacion puente todo-o-nada | bridgeUnits.js:189-218 | no | server-side |
| Matriz | Completar NOT NULL del satelite en update parcial | validateCompetencyMatrix.js:50; update:234 | no | server-side |
| Matriz | Alta atomica (matriz + gobierno + alcance + historial) | competencyMatrix-create:201-229 | no | server-side |
| Matriz | RBAC del update contra el alias (permiso partido) | competencyMatrix-update:185 | solo UI | ambos |
| Matriz (lista) | Edicion inline apagada (unica barrera vs bulk del core) | no | default_CompetencyNode_list.json:61 | solo-client |

### Arbol de competencias

| Funcionalidad | Regla | Backend | Client-side | Clase |
|---|---|---|---|---|
| Arbol | Nombre y codigo presentes por nodo | validateCompetencyTree.js:334 | useCompetencyTreeEditor.ts:330 | ambos |
| Arbol | code unico en todo el arbol (case-insensitive) | validateCompetencyTree.js:276 | useCompetencyTreeEditor.ts:358 | ambos |
| Arbol | rollupWeight en [0, 100] | validateCompetencyTree.js:376 | no | server-side |
| Arbol | Pesos de hermanas suman 100 (aviso) | validateCompetencyTree.js:388 | weights.ts:39 | ambos |
| Arbol | Si el modo no pondera, pesos ni se usan ni se validan | validateCompetencyTree.js:115 | weights.ts:34 | ambos |
| Arbol | La matriz existe y es matriz | competencyTree-upsert:225 | no | server-side |
| Arbol | Nombre repetido avisa, nunca bloquea | validateCompetencyTree.js:359 | useCompetencyTreeEditor.ts:373 | ambos |
| Arbol | Codigo de criterio de rubrica presente y sin repetir | validateCompetencyTree.js:294 | rubric.ts:244 | ambos |
| Arbol | El recordType lo decide la profundidad, no el cliente | competencyTree-upsert:89,555 | tree.ts:124 | ambos |
| Arbol | Nodo con hijas pierde rubrica e isHolistic (se limpia) | competencyTree-upsert:102,560 | useCompetencyTreeEditor.ts:152 | ambos |
| Arbol | Reemplazo total + cierre sobre descendientes al borrar | competencyTree-upsert:407-433 | tree.ts:149 | ambos |
| Arbol | Renumerado de position por grupo de hermanas | competencyTree-upsert:352 | useCompetencyTreeEditor.ts:196 | ambos |
| Arbol | Renombre en dos fases para las dos uniques | competencyTree-upsert:757 | no | server-side |
| Arbol | Whitelist RT_FIELDS (clave desconocida se descarta) | competencyTree-upsert:142,454 | useCompetencyTreeEditor.ts:181 | ambos |
| Arbol | Borrado de subarbol: capability modify, solo esa matriz | competencyTree-upsert:1029-1048 | CompetencyTreeEditorElement.vue | ambos |

### Rubrica

| Funcionalidad | Regla | Backend | Client-side | Clase |
|---|---|---|---|---|
| Rubrica | dimensions ausente = no tocar; [] = borrar (FK-safe) | competencyTree-upsert:481-524 | rubric.ts:175 | ambos |
| Rubrica | Descriptor vacio no se persiste | competencyTree-upsert:513 | rubric.ts:205 | ambos |
| Rubrica | Nombre de dimension obligatorio y peso numerico | no (upsert:498-509 escribe sin validar) | rubric.ts:254; CompetencyTreeEditorElement.vue:1036 | solo-client |
| Rubrica | Pesos de los criterios suman 100 | no | rubric.ts:138-160 | solo-client |

### Adopcion de matriz

| Funcionalidad | Regla | Backend | Client-side | Clase |
|---|---|---|---|---|
| Adopcion (alcance) | scopeUnits requerido sii adoptionScope=OrgUnit | validateMatrixAdoption.js:125; :1359 | no | server-side |
| Adopcion (alcance) | Con alcance que no las usa, la relacion se vacia | validateMatrixAdoption.js:149; :1364 | no | server-side |
| Adopcion (alcance) | adoptionPolicy null con alcance explicito | validateMatrixAdoption.js:171; :1367 | create.json:147 | ambos |
| Adopcion (alcance) | Combinacion inusual tipo/alcance avisa y guarda | validateMatrixAdoption.js:493 | MatrixAdoptionEditorElement.vue | ambos |
| Adopcion (alcance) | Deja de ser obligatoria con exenciones vivas, avisa | validateMatrixAdoption.js:501; :1403 | solo UI | ambos |
| Adopcion (alcance) | Regla cambio y no se aplico, avisa | validateMatrixAdoption.js:449; :1392 | rowActions.ts:249 | ambos |
| Adopcion | Eximir exige justificacion | validateMatrixAdoption.js:187; :1242 | MatrixAdoptionEditorElement.vue:1499 | ambos |
| Adopcion | Solo se exime de un mandato | validateMatrixAdoption.js:203; :1245 | rowActions.ts:152 | ambos |
| Adopcion | Reincorporar limpia la justificacion | validateMatrixAdoption.js:217; :1247 | MatrixAdoptionEditorElement.vue:1541 | ambos |
| Adopcion | Una sola adopcion vigente por matriz+plan | matrixAdoption:314-326,661 | no | server-side |
| Adopcion | El destino es un recordType = Matrix | matrixAdoption:162-171 | no | server-side |
| Adopcion | Alta manual nace Explicit; ScopeRule solo el reconciliador | validateMatrixAdoption.js:84; :333 | no | server-side |
| Adopcion | Quitar solo si nunca estuvo vigente; si lo estuvo, cerrar | validateMatrixAdoption.js:287; :956 | rowActions.ts:56 | ambos |
| Adopcion | effectiveTo ISO y posterior a effectiveFrom | validateMatrixAdoption.js:236; :959 | no | server-side |
| Adopcion | Adopcion cerrada no se reescribe | validateMatrixAdoption.js:355; :953 | rowActions.ts:77 | ambos |
| Adopcion | isInForceOn no trimea (paridad memoria/base) | validateMatrixAdoption.js:342 | rowActions.ts:78 | ambos |
| Adopcion | Solo planes publicados (Active) son elegibles | matrixAdoption:414,621 | no | server-side |
| Adopcion | Troceo BATCH_SIZE=500, lote atomico | matrixAdoption:148,315,1044 | no | server-side |
| Adopcion | Fecha de inicio calculada una vez por lote | matrixAdoption:308,640 | no | server-side |
| Adopcion | De a una falla; en lote saltea y devuelve skipped | matrixAdoption:1140-1148 | UI de resultados | ambos |
| Adopcion | Contadores e historial salen de lo que la base escribio | matrixAdoption:1168,809 | no | server-side |
| Adopcion | Busqueda de lista cerrada (no interpolacion SQL) | matrixAdoption:375,384,609 | no | server-side |
| Adopcion | limit acotado [1,200], offset entero >= 0 | matrixAdoption:447-451 | no | server-side |
| Adopcion | Capabilities partidas: modify/adopt/exempt/view | matrixAdoption:291,442,606... | rowActions.ts:143 | ambos |

### Reconciliador, infraestructura, historial, UI

| Funcionalidad | Regla | Backend | Client-side | Clase |
|---|---|---|---|---|
| Reconciliador | 5 grupos; exemptOut y explicitOut no se tocan | reconcileAdoptions.js:100-143 | MatrixAdoptionEditorElement.vue | ambos |
| Reconciliador | Con politica electiva la regla no genera filas | reconcileAdoptions.js:76,113 | no | server-side |
| Reconciliador | Conservar es el default (grandfathering -> Explicit) | reconcileAdoptions.js:64,161; :776 | default UI | ambos |
| Reconciliador | Solo participan adopciones vigentes | reconcileAdoptions.js:112 | no | server-side |
| Reconciliador | El delta se recalcula en el servidor al aplicar | matrixAdoption:786-794 | no | server-side |
| Reconciliador | retirementMode (close/remove) se decide antes de confirmar | reconcileAdoptions.js:198; :1758 | lo muestra | ambos |
| Infra | Evento post-commit solo lo emite quien abrio la transaccion | resolverUtils.js:147 | no | server-side |
| Infra | Accessor de puente ausente = falla de instalacion | bridgeUnits.js:145; :218 | no | server-side |
| Historial | Una entrada por operacion, nunca lanza | competencyMatrixHistory.js; recordHistory.js:73 | no | server-side |
| Display | cm.displayDecimals solo afecta lecturas | no | useDisplayDecimals.ts:1-30 | solo-client |
| UI generica | Senales de celda required/unique que no bloquean | (reglas server-side ya listadas) | RecordCollectionGrid.ts:113 | ambos |
| UI adopcion | No administrar planes hasta guardar el alcance | no (solo aviso backend) | rowActions.ts:249; ...vue:62 | solo-client |
| UI arbol | Reparto de pesos en partes iguales | no (fuera del backend a proposito) | weights.ts:61; rubric.ts:151 | solo-client |
| UI arbol | hasMissingFields exige peso cuando la rama pondera | no (parcial) | useCompetencyTreeEditor.ts:330 | solo-client |
| Formularios | matrixType, adoptionScope, levelSchemeId, kind obligatorios | no (solo NOT NULL de columna) | create.json:128,137,165 | ambos |

**Lectura del anexo:** el objeto esta protegido server-side en ambos mods. El riesgo de bypass por un cliente no-frontend (MCP, API directa) se concentra en la malla curricular de cd (12 reglas sin backend) y en las rubricas de cm (2 reglas), mas las dos brechas parciales de cd (R0, R1) y el gate de publicacion de matriz de cm que ningun codigo aplica. Ahi es donde el MCP debe replicar la regla o escalarla al resolver (ver seccion 5).
