---
id: DOC-kb-sp11-Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - ticket
  - auto-gobierno
  - governedObjects
  - tools-de-dominio
  - camino-1
  - blockGeneric
---

# Ticket cm: auto-gobierno en el MCP sin modificar el core del MCP (Camino 1)

Ticket UNICO de sp11 para el dev de curriculum-mapping (cm). Objetivo: que cm funcione 1:1 entre la plataforma y el MCP de up1 (seguro y usable) SIN tocar el motor del MCP ni el core (object-manager). Es el Camino 1 del documento de decision hermano. Todo verificado contra codigo real (file:line).

## 0. Aclaracion clave: el bloqueo NO se hace a mano; lo cubre la rama

Hubo un intento de bloqueo A MANO en cm: el commit `7972381` metia `logic/genericWriteGuard.resolver.js`, un resolver del mod que overrideaba `createInstance/updateInstance/deleteInstance` para rechazar. Se REVIRTIO (`068ec91`) porque el slot de override tiene un solo dueño (lo ocupa curriculum-design) y lo mataba en silencio. Ese archivo ya no existe en el working tree.

Este ticket NO reconstruye ese guard. El bloqueo lo hace la propuesta que ya vive en la rama `origin/UPONE-1758` del repo MCP: el pack solo DECLARA `governedObjects`/`blockGenericMutation` (config en `src/mods/types.js`), y el enforcement vive en el cliente GraphQL del MCP (`assertGenericWriteAllowed()` llamado desde `up1.write()`, `src/graphql-client.js:77`). Cero codigo de resolver en el mod para bloquear. El `7972381` se usa SOLO como referencia del mapa objeto->mutation para armar la declaracion, no para revivir el resolver.

### 0.1 Lo que va en `ai/` NO es "hablarle al LLM": es config que el motor ENFORZA

La carpeta `ai/` de un mod tiene DOS tipos de contenido:
- **Tipo hint (advisory, el LLM lo considera o no):** descripciones de tools, `fieldDocs` y guias de los contratos (lo que sirve `get_create_guide`).
- **Tipo enforced (config que consume el MOTOR, el LLM no tiene voto):** `governedObjects`/`blockGenericMutation`, el ruteo de cada tool, `genericWriteAllowed`. `generic-write-block.js` arma un indice y `assertGenericWriteAllowed()` lo aplica en `graphql-client.js:77` en el momento de la escritura.

Cuando el agente intenta `up1_update_object('CompetencyNode', ...)`, el cliente GraphQL lanza `BlockedGenericWriteError` ANTES de tocar el backend, sin importar lo que el LLM quiera. La declaracion en `ai/` es tan dura como el guard a mano revertido, sin el problema del slot unico. Matiz de alcance: es determinista DENTRO del MCP; otra via (bulk-edit de la Suite, GraphQL directo) no pasa por aca (eso lo cerraria el Camino 2, core).

## 1. Contexto

- Regla `RULE-server-side-logic-mcp-ready`: ninguna via de escritura (UI, API, MCP) debe saltear una regla de negocio.
- cm tiene sus invariantes en 22 mutations `*Validated` separadas del CRUD generico. No puede autoprotegerse por override del generico (slot de un solo dueño, lo ocupa cd; ver seccion 0).
- Estado hoy: `tools: []` (`ai/index.js:38`), ningun `governedObjects`; los 10 objetos (`mods/curriculum-mapping/objects/*.json`) abiertos al generico; solo RBAC frena.

## 2. Como el cambio de blockGeneric condiciona este ticket

- **F1 (declarar governedObjects) es la contraparte-mod del lockstep de blockGeneric.** Sin ella la rama bloquea CERO y el test `mcp/test/curriculum-mapping-pack.test.mjs` (exige los 10) sigue en rojo. F1 mergea coordinada con `origin/UPONE-1758` + la migracion de as.
- **cm NO tiene el problema de academic-scheduling.** Sus tools llaman mutations `*Validated` de nombre propio, que no matchean el guard de `createInstance(`/`updateInstance(`/`deleteInstance(` y viajan por `up1.request()` sin bloqueo. Ninguna tool de cm migra a `up1.write()`. Verificado.
- **Declarar governedObjects deja a cm read-only por MCP hasta que existan las tools.** No es regresion (hoy cm no tiene escritura por MCP salvo el generico inseguro).
- **Gate de completitud todo-o-nada:** apenas se declara un objeto, `scripts/validate-governed-objects.js` (sync) exige decidir los 10. Corre en el build de Docker en push a develop/staging/master, NO como gate de PR.

## 3. Paridad 1:1 con la UI: revision del frontend (client-side)

Se reviso el frontend de cm (23 reglas en editores, grillas, composables, stores) para descartar reglas de negocio que vivan SOLO en el cliente y que el MCP (via `*Validated`) dejaria pasar. Resultado: 10 estan tambien en server (la UI se adelanta), 8 son UX puro, 2 no aplican, 3 son client-only de bajo impacto (conveniencias/secuenciacion, no integridad) y **1 es un gap de integridad real**.

Los 3 client-only de bajo impacto (no requieren accion de integridad):
- Herencia de `minThreshold` en escalas (`usePerformanceScaleEditor.ts:113-131`): valor por defecto; el server ya prohibe solape. El MCP manda min/max validos.
- Reparto "100% en partes iguales" de pesos, arbol y rubrica (`CompetencyTreeEditor/weights.ts:128-137`, `CompetencyRubricEditor/rubric.ts:177-186`): comodidad; el validador server dice explicito que "el backend nunca reparte, solo valida". Opcional replicar como helper en la tool.
- `pendingScopeChange` (`MatrixAdoptionEditor/rowActions.ts:249-277`): secuenciacion de formulario; el MCP opera sobre estado persistido y esta mejor posicionado que la UI. No es gap.

El gap de integridad real (B.4), que se cubre en la Fase 5:
- La UI bloquea la pestaña "Competencias" si la matriz no tiene escala de desempeño elegida (`CompetencyMatrixShell/tabs.ts:211-228`; `config/layouts/default_CompetencyNode_edit.json:150-154`). Verificado: NO hay chequeo de `performanceScaleId` en `competencyTree-upsert.resolver.js`. Sin el, el MCP puede crear arbol y rubricas sobre una matriz sin escala, generando `RubricDescriptor.levelId` huerfanos, algo que la UI nunca permite. Es el mismo punto donde vive el hueco de `RubricDescriptor.levelId` (que el levelId pertenezca a la escala de la matriz): se arreglan juntos.

## 4. Fase 1 — Declarar governedObjects de los 10 (bloqueo defensivo)

Config en `mods/curriculum-mapping/ai/index.js`. Dos vias:
- `contracts[].blockGenericMutation` para los que tienen contrato de lectura: CompetencyNode (Matrix), PerformanceScale, DevelopmentLevel.
- `governedObjects` (mapa `objectType -> { create?, update?, delete? }`) para los 7 satelites: RubricDimension, RubricDescriptor, CompetencyNodeDevelopmentLevel, CompetencyNodeOwnerUnit, CompetencyNodeScopeUnit, MatrixAdoption, CompetencyAlignment.

Bloquear create/update/delete en los 10. Reglas del mensaje (test `curriculum-mapping-pack.test.mjs:97-144`): DEBE contener "UP1", NO nombrar el objectType tecnico, NO contener `/Instance|mutation|GraphQL|recordType/i`, lenguaje de negocio. El mapa base ya esta en `7972381` (`git show 7972381:logic/genericWriteGuard.resolver.js`, constante `GOVERNED`); corregir que CompetencyAlignment ya no va en `NOT_GOVERNED_YET`.

## 5. Fase 2 — Tools de dominio COMPUESTAS (nucleo, registerExtra)

Se necesitan si o si y sobreviven a un futuro fix de core.

| Tool | Mutation *Validated | Escribe |
|---|---|---|
| cm_save_competency_matrix | createCompetencyMatrix / updateCompetencyMatrix | matriz + ownerUnits + scopeUnits + historial. INCLUYE el campo `status` (ciclo Draft/InReview/Approved/Active/Deprecated/Archived): publicar y retirar (Deprecated/Archived, RM7) es setear `status` en esta misma mutation, con el gate `assertPublishable` adentro. No hay mutation de transicion aparte. |
| cm_upsert_competency_tree | upsertCompetencyTree | arbol + rubrica + niveles (5 tablas, reemplazo total) |
| cm_delete_competency_nodes | deleteCompetencyNodes | nodos Competency/SubCompetency + descendientes |
| cm_upsert_performance_scale | upsertPerformanceScale | escala + niveles |
| cm_set_performance_scale_active | setPerformanceScaleActive | toggle + cascada |
| cm_delete_performance_scale | deletePerformanceScale | escala + niveles (guard R9) |
| cm_upsert_development_level | upsertDevelopmentLevel | catalogo + niveles |
| cm_set_development_level_active | setDevelopmentLevelActive | toggle + cascada |
| cm_delete_development_level | deleteDevelopmentLevel | catalogo + niveles (guard RC6) |
| cm_set_matrix_adoption_scope | setMatrixAdoptionScope | satelite matriz + scopeUnits |
| cm_add_matrix_adoptions | addMatrixAdoptions | alta masiva por ids |
| cm_add_matrix_adoptions_by_filter | addMatrixAdoptionsByFilter | alta masiva por criterio |
| cm_apply_matrix_adoption_reconciliation | applyMatrixAdoptionReconciliation | altas + updates + cierres + borrados |
| cm_close_matrix_adoptions / cm_remove_matrix_adoptions | close/removeMatrixAdoptions | lote |

Patron: `registerExtra` (`mcp/src/mods/types.js:37`; ejemplo as en `rule-value-upsert.js`).

## 6. Fase 3 — Tools de dominio SIMPLES (1 fila, ficha declarativa)

Podrian volverse redundantes si el core gobierna el generico (Camino 2).

| Tool | Mutation | Objeto |
|---|---|---|
| cm_close_matrix_adoption | closeMatrixAdoption | MatrixAdoption |
| cm_remove_matrix_adoption | removeMatrixAdoption | MatrixAdoption |
| cm_set_matrix_adoption_exemption | setMatrixAdoptionExemption | MatrixAdoption |
| cm_create_competency_alignment | createCompetencyAlignment | CompetencyAlignment |
| cm_update_competency_alignment | updateCompetencyAlignment | CompetencyAlignment |
| cm_delete_competency_alignment | deleteCompetencyAlignment | CompetencyAlignment (guard R-1) |

Patron: ficha declarativa (`mods/curriculum-design/ai/tools.js:15-92`, `writePattern:"preview-confirm"`). Objetos SIN tool propia (se escriben dentro de las compuestas): RubricDimension, RubricDescriptor, CompetencyNodeDevelopmentLevel, CompetencyNodeOwnerUnit, CompetencyNodeScopeUnit, Competency/SubCompetency.

## 7. Fase 4 — Deuda documental
CLAUDE.md de cm sin UPONE-1756 (CompetencyAlignment) ni 1769; `.ai/PATTERNS.md:39` stale.

## 8. Fase 5 — Cerrar el gap de integridad client-only (paridad UI, en el resolver propio de cm)

Es la unica pieza server-side, pero va en `logic/` de cm (que el mod posee), NO en el core del MCP ni en object-manager. Como va en la `*Validated`, cierra el gap para UI + MCP (+ cross-client para esa regla) a la vez.
- **B.4:** en `competencyTree-upsert.resolver.js`, agregar la precondicion de que la matriz tenga `performanceScaleId` seteado antes de aceptar nodos con rubrica (o cualquier nodo). Analogo a como ya se valida "la matriz existe" (RT7).
- **RubricDescriptor.levelId:** en el mismo resolver (`persistRubric`), validar que cada `levelId` pertenezca a la escala de desempeño de ESA matriz, no solo que exista la FK.

## 8.1 Evaluacion: esfuerzo de llevar TODA la logica client-side al MCP

Pregunta separada de las tools: cuanto costaria que el MCP replique TODA la logica del frontend de cm (no solo el gap de integridad). Respuesta por categoria sobre las 23 reglas relevadas:

| Categoria | Reglas | Que habria que hacer | Esfuerzo |
|---|---|---|---|
| Ya en el MCP (server-tambien) | 10 | Nada. El MCP las hereda al llamar la `*Validated` (R-3/R-4, RA-3/4/8/13, RT9-12, RM11, RBAC). | 0 |
| Sin sentido para el MCP (UX puro no portable) | ~5 | Nada. Mecanica de grilla (server re-deriva position), secuenciacion async de lecturas, escenarios didacticos, descarte de formulario. No representan escritura ni regla. | 0 |
| Gap de integridad (B.4 + levelId) | 1 | Validacion en el resolver propio de cm (Fase 5). Obligatorio para 1:1. | 1 - 2 SP |
| Conveniencias/derivaciones portables | 2 | Replicar como helpers dentro de las tools: herencia de minThreshold (B.1) y reparto "100% en partes iguales" (B.2). No son integridad. | 1 - 1.5 SP |
| Computaciones de display exponibles como tool | ~3 | Opcional: resumen de cobertura (3 KPIs), preset de perfiles de consolidacion, mapeo del selector de modelo (ya server, RM11). Serian tools de lectura/derivacion. | 1 - 1.5 SP |

Totales:
- **1:1 de integridad (lo estrictamente necesario):** solo B.4, ~1 a 2 SP, YA incluido en la Fase 5.
- **Paridad de comportamiento total (replicar TODA la logica client-side):** ~3 a 5 SP, de los cuales 1-2 son B.4 (obligatorio, ya contado) y 2-3 son ergonomia opcional.
- **Incremental sobre este ticket (que ya tiene B.4):** ~2 a 3 SP adicionales, todos OPCIONALES.

Aclaraciones: (1) presupone que las tools existen (F2/F3); (2) la mitad de la logica client-side ya esta (10) o no aplica (~5); (3) lo obligatorio para 1:1 es una sola cosa (B.4), el resto es ergonomia.

## 8.2 Paridad de GUARDADO (workflow de persistencia) — verificado

Se reviso el workflow de guardado de cada editor (no las reglas): que dispara "Guardar", guardado parcial/por etapas, draft, autosave, orquestacion multi-mutation. Veredicto: **la granularidad "una tool por mutation" alcanza; ~0 SP extra; con dos precisiones de diseño.**

- **Casi ningun "Guardar" orquesta varias mutations.** Cada gesto = 1 mutation. MatrixAdoption y AlignmentGrid persisten al instante por fila/celda (`submits:false`, por diseño explicito del mod). PerformanceScale/DevelopmentLevel: 1 submit declarativo (`customEndpoint`). Arbol: 1 mutation de reemplazo total; el borrado es su propia mutation inmediata. El shell de la matriz reparte 4 pestañas sobre 3 mutations, cada pestaña con su Guardar; nunca las encadena.
- **Guardado parcial/por etapas: REPRODUCIBLE-DIRECTO.** El caso mas fino es el shell: `general` y `medicion` comparten la mutation de header pero cada pestaña manda solo su subconjunto de campos, y la mutation acepta payload parcial (`data: JSON!`, "omitir un campo = no tocarlo", M-7). El agente reproduce el guardado por etapas eligiendo que campos manda; sin tool nueva.
- **El ciclo de estado de la matriz (Draft/InReview/Approved/Active/Deprecated/Archived) ES server-side** (`objects/RecordTypes/rt__Matrix__competencynode.json:136-148`), pero NO tiene mutation propia: el `status` viaja dentro del payload de `updateCompetencyMatrixValidated`, y el gate `assertPublishable` corre adentro. Precision de diseño: `cm_save_competency_matrix` DEBE poder setear `status`; publicar y retirar (RM7 Deprecated->Archived) es esta misma tool con `status` en el payload, NO una tool de transicion aparte.
- **Un solo flujo con 2 mutations en un gesto:** `MatrixAdoptionEditor.addSelected()` (`MatrixAdoptionEditorElement.vue:2318-2384`) puede disparar `addMatrixAdoptionsByFilterValidated` y luego `addMatrixAdoptionsValidated`, secuencial, SIN dependencia de datos y SIN rollback (ni la propia UI revierte si la segunda falla). Se reproduce llamando las dos tools en secuencia, igual que la UI; no requiere tool compuesta. Se documenta como el unico caso.
- **Dependencias de ORDEN (de datos, no transaccionales) que el agente debe respetar:** (1) crear la matriz para tener `matrixId` antes de adopcion/arbol; (2) elegir `performanceScaleId` antes del arbol (reconfirma B.4). Documentar en las guias de las tools. El bloqueo `pendingScope` de adopcion es estado de form UI-only (el MCP opera sobre estado persistido), no aplica.
- **UI-only, el MCP no lo necesita:** dirty tracking, la "foto" para descartar, el modal de ejemplo de calculo ("no guardado"). No hay draft store separado ni autosave; lo "en progreso" es el dirty flag del form, que se pierde si no se guarda.

Impacto en el ticket: **~0 SP adicionales.** Restricciones de DISEÑO (no costo nuevo): (a) `cm_save_competency_matrix` soporta payload PARCIAL y lleva `status` (ambos gratis, la mutation ya lo hace); (b) documentar las dos dependencias de orden y el flujo doble de `addSelected`.

## 9. Dependencias fuera del ticket (backend/decision de PO)
- RM7: NO existe borrado de matriz; el retiro es una transicion de `status` a Deprecated/Archived (campo dentro de `updateCompetencyMatrixValidated`, alcanzable por `cm_save_competency_matrix`), no un delete. El delete de la matriz se bloquea con mensaje "en desarrollo".
- RP5 (completitud de descriptores): diferida por producto; el MCP iguala a la plataforma (ninguna la aplica), no rompe 1:1.

## 10. Testing
- F1: pack declara los 10 + pasa `curriculum-mapping-pack.test.mjs` y el gate del sync; test de que create/update/delete genericos sobre cada objeto se bloquean SIN llamar al backend (incluye alias `rt__`/`ext__` y casing).
- F2/F3: por tool, forma + integracion con cliente GraphQL falso que confirme la mutation `*Validated` correcta con inputs mapeados y preview/confirm. Incluir un caso de guardado PARCIAL (payload con subconjunto de campos) y uno de transicion de `status` para la tool de matriz.
- F5: test server de que `upsertCompetencyTree` rechaza nodos/rubrica cuando la matriz no tiene `performanceScaleId`, y que un `levelId` fuera de la escala de la matriz se rechaza.

## 11. Esfuerzo (un solo ticket, con desglose por fase)
| Fase | SP |
|---|---|
| F1 Declaracion governedObjects (10) | 1 - 2 |
| F2 Tools compuestas | 6 - 10 |
| F3 Tools simples | 1 - 2 |
| F4 Deuda documental | 0.5 |
| F5 Gap de integridad client-only (B.4 + levelId) | 1 - 2 |
| **Total** | **~9.5 a 16.5 SP** |

Paridad de guardado (8.2): ~0 SP extra (restriccion de diseño, no costo). Follow-up OPCIONAL de paridad de comportamiento total con la UI (8.1): +2 a 3 SP, fuera del camino critico.

## 12. Viabilidad mod-only y secuencia
- **Es viable dejar cm 1:1 con trabajo mod-only** (config `governedObjects` + tools de dominio en `ai/` + la validacion B.4/levelId en el resolver propio de cm en `logic/`), apoyandose en el blockGeneric de la rama (motor del MCP, ya construido) y con la migracion de as como parte del mismo lockstep. No requiere tocar el motor del MCP ni object-manager.
- El 1:1 sale por construccion: las tools llaman a las mismas `*Validated` que usa la UI; salvo B.4 (Fase 5), no hay reglas client-only de integridad que el MCP no herede, y el guardado parcial/por etapas + el ciclo de estado se reproducen con las mismas tools (8.2).
- Lo que mod-only NO cierra es el cross-client (bulk-edit de la Suite, GraphQL directo). No es asimetria plataforma-vs-MCP (la Suite escribe cm por `customEndpoint`, no por el generico), y es el eje del Camino 2 (core), opcional para esta paridad.
- Secuencia: F1 mergea con el lockstep de `origin/UPONE-1758`; F5 conviene antes o junto con las tools de arbol (F2); F2 arranca por las compuestas nucleo (respetando las 2 dependencias de orden y el flujo doble de 8.2); F3 y parte de F2 quedan sujetas a la decision Camino 1 vs 2.

Ver los documentos hermanos de sp11: Decision camino cm, Propuesta a core (interceptores componibles), Reporte del fix de blockGeneric, Solicitud a academic-scheduling.
