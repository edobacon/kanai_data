---
id: TICKET-151-SPEC
project: up1
ticket: TICKET-151
status: approved
---

# Tributación en solo lectura cuando el plan está publicado (Active, Deprecated, Archived)

## Resumen ejecutivo

Se agrega un guard de estado de plan a la tributación de curriculum-mapping: `assertPlanEditable({ prisma, planId })` en `logic/helpers/alignmentRules.js` (junto a `assertActiveAdoption`), enganchado dentro de la transacción de las cinco vías de escritura (create, update con origen y destino, delete, upsert en conjunto y vía masiva), antes de la regla de adopción vigente. La política es fail-closed con lista de EDITABLES (`Draft`, `InReview`, `Approved`): `Active`, `Deprecated`, `Archived` o un estado desconocido rechazan con `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR`; planId vacío o plan inexistente con `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR`. El mensaje del backend está en `es` como todos los del mod (el backend no conoce el idioma de la persona).

La vista `competencyAlignmentView` (retorno `JSON!`, sin cambio de firma) agrega el flag de editabilidad del plan; la grilla pasa a solo lectura con aviso cuando el plan no es editable, y traduce los errores de guardado por código en `es`, `en` y `pt` (texto genérico para plan publicado, porque los params no viajan en `extensions`), con fallback al texto del backend para los demás códigos. En el MCP: la escritura de tributación ya está bloqueada (`governedObjects`); se deja asentado en el pack que toda tool futura de escritura pase por los resolvers `*Validated`, se documenta el flag en la tool de lectura `cm_alignment_view` y se extiende el test de paridad de canal.

NO se hace: bulk-edit genérico del core ni GraphQL directo, versionado ni réplica (UPONE-1771), limpieza de huérfanas (UPONE-1772), ni el hallazgo preexistente de labels en `curriculumMesh.logic.ts`.

Se sabe que funciona cuando: cada mutación de tributación sobre un plan `Active` devuelve `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` y la fila queda intacta, las mismas pasan en `Draft`, y la grilla del plan `Active` se ve deshabilitada con el aviso aunque el layout sea de edición. Tamaño: 2 sesiones (backend+tests hecha; FE+i18n+MCP), sobre la rama de UPONE-1770 (develop mergeado, 652ac75).
## Requirements

### REQ-01 `confirmed`
> Fuente: Pedido de cambio 2026-09-24 punto 1 (opcion A): mensaje backend solo en `es` + error hermano PLAN_UNRESOLVED; contexto verificado sobre MESSAGES de mods/curriculum-mapping/logic/helpers/errors.js y la S1 ya implementada

Existe un helper `assertPlanEditable({ prisma, planId })` en `mods/curriculum-mapping/logic/helpers/alignmentRules.js` que lee `Curriculum.status` por el prisma del tenant y rechaza salvo que el estado este en la lista de EDITABLES (`Draft`, `InReview`, `Approved`), declarada fail-closed. Emite dos codigos de error distintos, ambos registrados en el MESSAGES de `logic/helpers/errors.js` con el mensaje redactado UNICAMENTE en `es` (coherente con el resto del mod: ningun resolver conoce el idioma de la persona; la traduccion a `en`/`pt` la cubre el front en REQ-04): `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` cuando el plan existe pero su estado esta bloqueado (`Active`, `Deprecated`, `Archived` o cualquier estado nuevo del enum), con params `status` y `statusLabel`; y `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR` cuando el planId viene vacio o el plan no existe en la base. Ambos mensajes estan en lenguaje de negocio e indican la salida: versionar el plan o devolverlo a Borrador.

### REQ-02 `confirmed`
> Fuente: mods/curriculum-mapping/logic/helpers/alignmentRules.js (assertActiveAdoption dentro de la transacción, R-1); resolvers de tributación de curriculum-mapping en la rama feat/UPONE-1770-tributacion-peso-del-eje-1

Las cinco vías de escritura de tributación rechazan cuando el plan del alcance no es editable, con la verificación DENTRO de la transacción y ANTES de escribir (igual que R-1): `createCompetencyAlignment` (plan derivado del source), `updateCompetencyAlignment` (plan de ORIGEN de la fila actual y plan de DESTINO del source efectivo si el movimiento cambia de plan), `deleteCompetencyAlignment` (plan de la fila), `upsertCompetencyAlignmentSet` (una vez por llamada sobre el planId del alcance) y `bulkApplyCompetencyAlignment` (una vez por llamada sobre el plan del alcance resuelto). Retirar una tributación cuenta como modificar.

### REQ-03 `confirmed`
> Fuente: mods/curriculum-mapping/logic/alignmentView.resolver.js (+ par logic/alignmentView.schema.graphql, query `competencyAlignmentView(planId: ID!, matrixId: ID!): JSON!`); pedido de cambio del 2026-09-24, correcciones 1 y 2

El resolver `mods/curriculum-mapping/logic/alignmentView.resolver.js` agrega al objeto que devuelve `competencyAlignmentView` un flag de editabilidad del plan, junto a los campos existentes (planId, matrixId, planEntries, competencies, developmentLevels, alignments). El flag se resuelve en el backend a partir de la misma lista de estados editables del helper `assertPlanEditable`, sin duplicar la constante de estados en el FE. La query devuelve `JSON!`, asi que no se modifica la firma ni el tipo de retorno en `logic/alignmentView.schema.graphql`.

### REQ-04 `confirmed`
> Fuente: Pedido de cambio 2026-09-24 + mods/curriculum-mapping/logic/helpers/personalisedError.js (extensions: { code } unicamente)

`CompetencyAlignmentGrid` pasa a solo lectura cuando el plan no es editable, aunque el layout venga en modo edicion (`enableEdit`) y el usuario tenga permisos, y muestra un aviso que indica la salida (versionar el plan o devolverlo a Borrador). Ademas, la grilla traduce los errores de guardado POR CODIGO (`extensions.code` del GraphQLError) en vez de mostrar `err.message` del backend: para `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` usa un texto generico de plan publicado sin nombrar el estado (porque `logic/helpers/personalisedError.js` construye el GraphQLError con `extensions: { code }` solamente, y los params `status`/`statusLabel` NO viajan al front), y para `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR` usa su propia key; si el code no tiene key de traduccion, cae al `err.message` del backend (comportamiento actual para el resto de errores, que no se modifica). El texto `es` del backend, que si nombra el estado via params, sigue siendo el que ven los consumidores que no traducen (MCP). TODOS los textos nuevos (aviso de solo lectura y mensajes por codigo) se agregan en los TRES idiomas del mod: `lang/es`, `lang/en` y `lang/pt`, con `es` como fuente de verdad (D-11) y paridad de keys, siguiendo el precedente de `lang/<l>/competencyMatrixShell.i18n.json` de traducir codigos del backend por code.

### REQ-05 `confirmed`
> Fuente: Pedido de cambio 2026-09-24 (merge de develop, commit 652ac75); mods/curriculum-mapping/ai/tools.js (`cm_alignment_view`, `cm_list_alignments`); mods/curriculum-mapping/ai/index.js (`governedObjects`, comentario del pack); mcp/src/contracts/generic-write-block.js; tests/unit/competencyAlignmentParity.test.js; tests/unit/aiPack.test.js

El pack MCP de curriculum-mapping deja asentado en el comentario de `ai/index.js` que toda tool futura de escritura de tributacion debe pasar por los resolvers `*Validated` (y asi hereda el guard), sin agregar tools ni tocar el bloqueo generico de escritura (`governedObjects`). Ademas, la descripcion de la tool de LECTURA `cm_alignment_view` en `ai/tools.js` (incorporada por el merge de develop del 2026-09-24, commit 652ac75, que llama a `competencyAlignmentView`) documenta el flag de editabilidad del plan dentro de la forma del resultado e indica al asistente que, cuando el plan no es editable, explique en lenguaje de negocio que el plan esta publicado y cual es la salida: versionar el plan o devolverlo a Borrador, sin nombres tecnicos en el texto dirigido a la persona (regla del pack). `cm_list_alignments` no cambia. `tests/unit/competencyAlignmentParity.test.js` se extiende con el caso de plan bloqueado: mismo rechazo sin importar el canal.

### REQ-06 `inferred` `enforcement`
> Fuente: mods/curriculum-design/logic/helpers/planEntryPlanStatusGuard.js (lee curriculum.status por el prisma del tenant); mods/curriculum-mapping/logic/helpers/alignmentRules.js (assertActiveAdoption recibe el prisma de la transacción)

El guard consume el prisma del tenant que ya recibe el resolver y no abre conexiones ni transacciones propias; el costo añadido por mutación es de una sola lectura de `Curriculum` por plan involucrado (dos como máximo en el update que cambia de plan), independiente del tamaño del set o del alcance masivo.

### REQ-07 `confirmed` `enforcement`
> Fuente: KB: RULE-mods-001 (nunca modificar synced en core), RULE-mods-002 (par .schema.graphql), RULE-mods-003 (sync obligatorio), RULE-mods-004 (const con Query/Mutation), RULE-mods-006 (extend type)

Tras los cambios en el mod se ejecuta `npm run sync` y no se modifica ningún archivo synced en core; el resolver nuevo/modificado conserva su par `.schema.graphql` y el const exportado contiene `Query`/`Mutation`.

### REQ-08 `confirmed`
> Fuente: Adenda 1 - 2026-09-24 - dev (opcion A tras review kn-dredd 2026-09-24), puntos 1 a 4 del request de TICKET-151

Correcciones post-review kn-dredd (Adenda 1), sin cambiar la regla de negocio: (a) `docs/reference/competencyalignment-object.md` registra la regla de plan editable como R-PL en la tabla de reglas (§3), la incorpora en las tablas de escrituras gobernadas (§4, incluidas las de guardado en conjunto y via masiva) indicando que corre PRIMERO, y agrega a la tabla de errores (§7) los codes `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` y `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR` con su causa; (b) `updateCompetencyAlignment` valida el plan de ORIGEN solo si `current.planId` no esta vacio, de modo que una fila con `planId` nulo y source valido vuelve a poder editarse y se repara con el planId derivado (el plan de DESTINO lo sigue validando `assertGovernedWrite`); (c) `CompetencyAlignmentGridElement.vue` en `onSaveAlignmentSet`, ante un rechazo con code `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` (leido con el lector de code existente de `competencyAlignmentSaveError.logic.ts`, sin duplicarlo), recarga la vista para que la grilla pase a solo lectura y muestre el aviso, conservando el mensaje de error; (d) en `createCompetencyAlignment` y `updateCompetencyAlignment` R-PL se evalua ANTES de la validacion de peso (R-6), dentro de la misma transaccion y sin duplicar lecturas, de modo que con plan publicado el motivo informado sea siempre PLAN_LOCKED.
## Tasks

#### S1.T1 — Implementar `assertPlanEditable({ prisma, planId })` en `mods/curriculum-mapping/logic/helpers/alignmentRules.js`, junto a `assertActiveAdoption`, replicando el patrón de `mods/curriculum-design/logic/helpers/planEntryPlanStatusGuard.js`: lee `curriculum.status` por el prisma recibido, lista de estados EDITABLES (`Draft`, `InReview`, `Approved`) como constante única exportada, fail-closed ante estado no listado, plan ausente o planId vacío, dos errores propios: `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` (estado no editable; params status y statusLabel; mensaje de negocio en `es`, como todos los MESSAGES del mod, que nombra el estado y las dos salidas: versionar / devolver a Borrador) y `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR` (planId vacio o plan inexistente), y el mismo trato defensivo ante mock sin modelo que el precedente.
Contrato: rollback: Revertir el bloque agregado en `alignmentRules.js` (el archivo queda como en la rama base de UPONE-1770); ningún consumidor lo importa todavía, así que el revert es aislado.. Status: done

#### S1.T2 — Enganchar el guard en las cinco vías de escritura de tributación, dentro de la transacción y antes de cualquier escritura, al lado de la validación de adopción vigente (R-1).
Contrato: rollback: Revertir los resolvers tocados a su estado en la rama de UPONE-1770; el helper puede quedar sin consumidores sin romper nada.. Status: done

#### S1.T2.1 — `createCompetencyAlignment`: derivar el planId del source y llamar al guard dentro de la transacción, antes del create.
Contrato: rollback: Quitar la llamada al guard en ese resolver.. Status: done

#### S1.T2.2 — `updateCompetencyAlignment`: validar el plan de ORIGEN (leído de la fila actual) y, si el source efectivo cambia de plan, también el plan de DESTINO; una sola lectura cuando origen y destino coinciden.
Contrato: rollback: Quitar ambas llamadas al guard en ese resolver.. Status: done

#### S1.T2.3 — `deleteCompetencyAlignment`: validar el plan de la fila antes del delete (retirar es modificar).
Contrato: rollback: Quitar la llamada al guard en ese resolver.. Status: done

#### S1.T2.4 — `upsertCompetencyAlignmentSet`: validar UNA vez por llamada sobre el planId del alcance, antes de abrir el recorrido del set, para que el costo no escale con el tamaño del set.
Contrato: rollback: Quitar la llamada al guard en ese resolver.. Status: done

#### S1.T2.5 — `bulkApplyCompetencyAlignment`: resolver el plan del alcance y validar UNA vez por llamada, antes de aplicar la vía masiva.
Contrato: rollback: Quitar la llamada al guard en ese resolver.. Status: done

#### S1.T3 — Tests del guard y de las cinco vías + regresión del mod: helper por cada estado del enum (editables y bloqueados), plan inexistente y planId vacío; rechazo por vía con `Active`, `Deprecated` y `Archived`; paso libre con `Draft`, `InReview` y `Approved`; movimiento entre planes en ambos sentidos; fila intacta tras el rechazo (incluida la integridad transaccional del guardado en conjunto); conteo de lecturas de `Curriculum` acotado (1 por llamada en set y masiva, máx. 2 en update con cambio de plan); y corrida completa de la suite existente de tributación de UPONE-1770 sin modificar sus asserts.
Contrato: rollback: Eliminar los archivos/casos de test agregados; la suite vuelve al estado de la rama base.. Status: done

#### S2.T1 — En `mods/curriculum-mapping/logic/alignmentView.resolver.js`, agregar al objeto que devuelve `competencyAlignmentView` el flag de editabilidad del plan, resuelto con la misma lista de estados EDITABLES del helper `assertPlanEditable` (sin duplicar la constante), junto a los campos existentes (planId, matrixId, planEntries, competencies, developmentLevels, alignments). La query devuelve `JSON!`, asi que NO se toca la firma ni el tipo de retorno en `logic/alignmentView.schema.graphql`; a lo sumo se actualiza la descripcion textual de la query para mencionar el flag.
Contrato: rollback: Revertir `logic/alignmentView.resolver.js` al estado previo (quitar el campo agregado al objeto de retorno); si se actualizo la descripcion textual en `logic/alignmentView.schema.graphql`, revertirla tambien. No hay cambio de firma ni de tipo que deshacer, por lo que no se rompen consumidores.. Status: done

#### S2.T2 — Poner `CompetencyAlignmentGrid` (`CompetencyAlignmentGridElement.vue`) en solo lectura cuando el flag del backend dice que el plan no es editable: combinar con `enableEdit` y permisos de modo que el bloqueo por estado gane siempre; deshabilitar la edicion de celdas, el guardado en conjunto y la via masiva; y mostrar el aviso con la salida (versionar el plan o devolverlo a Borrador) usando el atom `Alert` del layout-library (RULE-mods-014), sin literales de texto (RULE-mods-015) y sin replicar la lista de estados en el FE. Reemplazar el uso directo de `err.message` (~linea 1394) por un resolvedor de mensaje por `extensions.code`: key propia para `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` (texto generico: el plan esta publicado y las dos salidas, sin nombrar el estado porque los params no viajan en extensions) y para `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR`, con fallback a `err.message` si el code no tiene key (sin cambiar el comportamiento del resto de errores). Todas las keys nuevas (aviso y mensajes por codigo) en los TRES idiomas `lang/es`, `lang/en` y `lang/pt`, `es` fuente de verdad y paridad exacta de keys, siguiendo el precedente de `lang/<l>/competencyMatrixShell.i18n.json`. Agregar una story del caso bloqueado.
Contrato: rollback: Revertir el `.vue`/`.ts` del grid, las keys de `lang/es`, `lang/en` y `lang/pt` y la story con `git checkout --`/borrado; la grilla vuelve a depender solo de `enableEdit` + permisos y a mostrar `err.message`.. Status: done

#### S2.T3 — En el pack MCP de curriculum-mapping: (a) dejar asentado en el comentario de `ai/index.js` que toda tool futura de escritura de tributacion debe pasar por los resolvers `*Validated` (y asi hereda el guard de plan publicado), sin agregar tools ni tocar el bloqueo generico de escritura (`governedObjects`); (b) actualizar la descripcion de la tool de lectura `cm_alignment_view` en `ai/tools.js` (la que llama a `competencyAlignmentView`, a la que S2.T1 le agrega el flag de editabilidad) para documentar ese flag en la forma del resultado e indicar al asistente que, con el plan no editable, explique en lenguaje de negocio que el plan esta publicado y cual es la salida (versionar el plan o devolverlo a Borrador), sin nombres tecnicos en el texto dirigido a la persona. No tocar `cm_list_alignments`. Si `tests/unit/aiPack.test.js` fija el texto de la descripcion, ajustarlo solo en lo que el cambio agrega. Extender `tests/unit/competencyAlignmentParity.test.js` con el caso de plan bloqueado (mismo rechazo sin importar el canal).
Contrato: rollback: Revertir el comentario de `ai/index.js` y la descripcion de `cm_alignment_view` en `ai/tools.js` a su texto previo (el que trajo el merge de develop 652ac75), revertir el ajuste del texto esperado en `tests/unit/aiPack.test.js` y quitar el caso de plan bloqueado agregado en `tests/unit/competencyAlignmentParity.test.js`. Son cambios de comentario, descripcion y tests: no hay migracion ni estado que deshacer.. Status: done

#### S2.T4 — Tests de la capa de presentacion y de paridad de canal. (a) `competencyAlignmentView`: un caso por cada estado del enum de `Curriculum.status` (flag true en Draft, InReview y Approved; false en Active, Deprecated y Archived) y campos previos del objeto devuelto (planId, matrixId, planEntries, competencies, developmentLevels, alignments) presentes e intactos. (b) `CompetencyAlignmentGrid`: las ocho combinaciones `enableEdit` (true/false) x permisos (con/sin) x plan editable (true/false): solo lectura siempre que el plan no sea editable; el aviso de plan publicado aparece SOLO cuando el motivo del bloqueo es el estado del plan (ausente si el bloqueo es solo por layout o por permisos). (c) Traduccion de errores por codigo: PLAN_LOCKED y PLAN_UNRESOLVED muestran el texto esperado en `es`, `en` y `pt`; un `extensions.code` sin key cae a `err.message` del backend. (d) i18n: keys nuevas presentes en los tres idiomas, `tests/integration/lang-parity.test.ts` en verde, y sin literales de texto ni lista de estados editables duplicada en el FE. (e) `tests/unit/competencyAlignmentParity.test.js`: caso de plan bloqueado (mismo code `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` por ambos canales) y caso Draft que pasa por ambos (REQ-05). (f) `npm run sync` y suite completa del mod, verificando que no quedan ediciones manuales en archivos synced del core (REQ-07).
Contrato: rollback: Revertir los tests nuevos/modificados de (a) a (e), dejando competencyAlignmentParity.test.js en su version previa, y deshacer lo regenerado por `npm run sync`; no se toca codigo de produccion.. Status: done

#### S3.T1 — Actualizar `docs/reference/competencyalignment-object.md` segun REQ-08 (a): agregar R-PL a la tabla de reglas (§3); incorporarla en las tablas de escrituras gobernadas (§4, mas las de guardado en conjunto y via masiva) indicando que corre primero, antes de R-1 y R-6; y agregar a la tabla de errores (§7) `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` y `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR` con su causa.
Contrato: rollback: Revertir `docs/reference/competencyalignment-object.md` al contenido previo (`git checkout -- docs/reference/competencyalignment-object.md`).. Status: done

#### S3.T2 — Backend: en `logic/competencyAlignment.resolver.js` aplicar REQ-08 (b) y (d). (d) Mover la evaluacion de R-PL antes de `validateContributionPercentageRow` en `createCompetencyAlignment` y `updateCompetencyAlignment`, sin sacarla de la transaccion ni duplicar lecturas de `Curriculum`. (b) En `updateCompetencyAlignment`, validar el plan de ORIGEN solo si `current.planId` no esta vacio; el plan de DESTINO lo sigue validando `assertGovernedWrite`. Tests: update de fila con `planId` nulo y plan destino `Draft` se aplica y persiste el planId derivado; misma fila con plan destino `Active` rechaza PLAN_LOCKED y queda intacta; create/update con plan `Active` y peso invalido rechazan con PLAN_LOCKED (no con el error de peso). Los tests existentes siguen verdes sin tocar asserts, salvo el que fije el orden viejo si existe.
Contrato: rollback: Revertir `logic/competencyAlignment.resolver.js` y eliminar los tests agregados en esta task (`git checkout -- <resolver>` y borrar/revertir los archivos de test tocados).. Status: done

#### S3.T3 — Front: en `CompetencyAlignmentGridElement.vue` (`onSaveAlignmentSet`), ante un rechazo con code `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` leido con el lector de code ya existente en `competencyAlignmentSaveError.logic.ts` (reusarlo, no duplicar la logica), recargar la vista para que la grilla pase a solo lectura y muestre el aviso, conservando el mensaje de error visible. Test de componente: guardado rechazado con PLAN_LOCKED -> se recarga la vista, la grilla queda en solo lectura y aparece el aviso; rechazo con otro code -> no recarga.
Contrato: rollback: Revertir `CompetencyAlignmentGridElement.vue` y eliminar el test de componente agregado.. Status: done

#### S3.T4 — Regresion y sync de la Adenda 1: correr la suite completa del mod (incluida `tests/unit/competencyAlignmentParity.test.js`), typecheck con `vue-tsc` en 0 errores, y `npm run sync` verificando que no queden ediciones manuales en archivos synced del core. Reportar suites con estado y totales; clasificar cualquier fallo como introducido o preexistente.
Contrato: rollback: No aplica (solo verificacion).. Status: done
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-03 (edit) `confirmed`: El resolver `mods/curriculum-mapping/logic/alignmentView.resolver.js` agrega al objeto que devuelve `competencyAlignmentView` un flag de edi

**Task ops:**

- edit S2.T1 { desc="En `mods/curriculum-mapping/logic/alignmentView.resolver.js`, agregar al objeto que devuelve `competencyAlignmentView` el flag de editabilidad del plan, resuelto con la misma lista de estados EDITABLES del helper `assertPlanEditable` (sin duplicar la constante), junto a los campos existentes (planId, matrixId, planEntries, competencies, developmentLevels, alignments). La query devuelve `JSON!`, asi que NO se toca la firma ni el tipo de retorno en `logic/alignmentView.schema.graphql`; a lo sumo se actualiza la descripcion textual de la query para mencionar el flag.", rollback="Revertir `logic/alignmentView.resolver.js` al estado previo (quitar el campo agregado al objeto de retorno); si se actualizo la descripcion textual en `logic/alignmentView.schema.graphql`, revertirla tambien. No hay cambio de firma ni de tipo que deshacer, por lo que no se rompen consumidores.", validates=["REQ-03"] }
- edit S2.T4 { desc="Tests de la grilla: cubrir las ocho combinaciones de `enableEdit` x permisos del usuario x editabilidad del plan (2x2x2), verificando que `CompetencyAlignmentGrid` queda en solo lectura en toda combinacion con plan no editable (aunque el layout venga en modo edicion y el usuario tenga permisos) y que muestra el aviso con la salida (versionar el plan o devolverlo a Borrador), con i18n es/en.", rollback="Eliminar los casos de test agregados/modificados de la grilla y dejar el archivo de tests en su estado previo.", validates=["REQ-04"], isTest=true }

### Enmienda 2

**Task ops:**

- edit S2.T4 { desc="Tests de la capa de presentacion y de paridad de canal. (a) `competencyAlignmentView`: un caso por cada estado del enum de `Curriculum.status`, verificando que el flag de editabilidad del plan sea true en `Draft`, `InReview` y `Approved` y false en `Active`, `Deprecated` y `Archived`, y que los campos previos del objeto devuelto (planId, matrixId, planEntries, competencies, developmentLevels, alignments) sigan presentes e intactos. (b) `CompetencyAlignmentGrid`: las ocho combinaciones de layout de edicion (`enableEdit` true/false) x permisos del usuario (con/sin) x plan editable (true/false), verificando que la grilla quede en solo lectura siempre que el plan no sea editable, y que el aviso de plan publicado (con la salida: versionar el plan o devolverlo a Borrador) aparezca SOLO cuando el motivo del bloqueo es el estado del plan; ausencia del aviso cuando el bloqueo viene solo del layout o solo de los permisos. (c) i18n: existencia de las keys es/en del aviso, y verificacion de que en el FE no hay literales de texto hardcodeados ni la lista de estados editables duplicada (la politica vive solo en el backend). (d) `tests/unit/competencyAlignmentParity.test.js`: extension con el caso de plan bloqueado (mismo codigo de error `COMPETENCYALIGNMENT_PLAN_LOCKED` por ambos canales) y el caso `Draft` que pasa por ambos canales (cubre REQ-05). (e) Correr `npm run sync` y la suite completa del mod, verificando que no quedaron ediciones manuales en archivos synced del core (cubre REQ-07).", rollback="Revertir los tests nuevos/modificados de `competencyAlignmentView`, los de `CompetencyAlignmentGrid` (las ocho combinaciones y los casos de aviso), los assertions de keys i18n y de ausencia de literales/lista de estados en el FE, y la extension de `tests/unit/competencyAlignmentParity.test.js` (caso de plan bloqueado y caso Draft), dejando ese archivo en su version previa. Deshacer los archivos regenerados por `npm run sync` si quedaron cambios. No se toca codigo de produccion.", validates=["REQ-03","REQ-04","REQ-05","REQ-07"], isTest=true }

### Enmienda 3
**REQs:**

- REQ-05 (edit) `confirmed`: El pack MCP de curriculum-mapping deja asentado en el comentario de `ai/index.js` que toda tool futura de escritura de tributacion debe pasa

**Task ops:**

- edit S2.T3 { desc="En el pack MCP de curriculum-mapping: (a) dejar asentado en el comentario de `ai/index.js` que toda tool futura de escritura de tributacion debe pasar por los resolvers `*Validated` (y asi hereda el guard de plan publicado), sin agregar tools ni tocar el bloqueo generico de escritura (`governedObjects`); (b) actualizar la descripcion de la tool de lectura `cm_alignment_view` en `ai/tools.js` (la que llama a `competencyAlignmentView`, a la que S2.T1 le agrega el flag de editabilidad) para documentar ese flag en la forma del resultado e indicar al asistente que, con el plan no editable, explique en lenguaje de negocio que el plan esta publicado y cual es la salida (versionar el plan o devolverlo a Borrador), sin nombres tecnicos en el texto dirigido a la persona. No tocar `cm_list_alignments`. Si `tests/unit/aiPack.test.js` fija el texto de la descripcion, ajustarlo solo en lo que el cambio agrega. Extender `tests/unit/competencyAlignmentParity.test.js` con el caso de plan bloqueado (mismo rechazo sin importar el canal).", rollback="Revertir el comentario de `ai/index.js` y la descripcion de `cm_alignment_view` en `ai/tools.js` a su texto previo (el que trajo el merge de develop 652ac75), revertir el ajuste del texto esperado en `tests/unit/aiPack.test.js` y quitar el caso de plan bloqueado agregado en `tests/unit/competencyAlignmentParity.test.js`. Son cambios de comentario, descripcion y tests: no hay migracion ni estado que deshacer.", validates=["REQ-05"] }

### Enmienda 4
**REQs:**

- REQ-01 (edit) `confirmed`: Existe un helper `assertPlanEditable({ prisma, planId })` en `mods/curriculum-mapping/logic/helpers/alignmentRules.js` que lee `Curriculum.s
- REQ-04 (edit) `confirmed`: `CompetencyAlignmentGrid` pasa a solo lectura cuando el plan no es editable, aunque el layout venga en modo edicion (`enableEdit`) y el usua

**Task ops:**

- edit S2.T2 { desc="En `CompetencyAlignmentGrid` (`CompetencyAlignmentGridElement.vue`): forzar solo lectura cuando el flag de editabilidad del plan es false (aunque `enableEdit` y los permisos lo habiliten) y renderizar el aviso con la salida (versionar el plan o devolverlo a Borrador). Reemplazar el uso directo de `err.message` (~linea 1394) por un resolvedor de mensaje por `extensions.code`: key propia para `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` interpolando el `statusLabel` traducido segun `params.status`, key propia para `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR`, y fallback a `err.message` si el code no tiene key (no cambiar el comportamiento del resto de errores). Agregar todas las keys nuevas (aviso, mensajes por codigo, labels de estado) en los TRES idiomas: `lang/es`, `lang/en` y `lang/pt`, con `es` como fuente de verdad y paridad exacta de keys.", rollback="Revertir `CompetencyAlignmentGridElement.vue` y los tres archivos de lang (`es`, `en`, `pt`) a su version previa con `git checkout --`; la grilla vuelve a usar `enableEdit`+permisos y a mostrar `err.message` del backend.", validates=["REQ-04"], isTest=false }
- edit S2.T4 { desc="Tests de la grilla: (a) solo lectura + aviso cuando el plan no es editable pese a `enableEdit` y permisos; (b) traduccion de errores por codigo — `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` (interpolando el `statusLabel` traducido segun `status`) y `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR`, verificando el texto esperado en `es`, `en` y `pt`; (c) fallback: un `extensions.code` sin key en lang muestra `err.message` del backend; (d) correr `tests/integration/lang-parity.test.ts` y verificar que queda en verde con las keys nuevas presentes en los tres idiomas.", rollback="Eliminar los casos de test agregados y dejar el archivo de test en su estado previo con `git checkout --`.", validates=["REQ-04"], isTest=true }

### Enmienda 5
**REQs:**

- REQ-04 (edit) `confirmed`: `CompetencyAlignmentGrid` pasa a solo lectura cuando el plan no es editable, aunque el layout venga en modo edicion (`enableEdit`) y el usua

**Task ops:**

- edit S2.T2 { desc="Poner `CompetencyAlignmentGrid` (`CompetencyAlignmentGridElement.vue`) en solo lectura cuando el flag del backend dice que el plan no es editable: combinar con `enableEdit` y permisos de modo que el bloqueo por estado gane siempre; deshabilitar la edicion de celdas, el guardado en conjunto y la via masiva; y mostrar el aviso con la salida (versionar el plan o devolverlo a Borrador) usando el atom `Alert` del layout-library (RULE-mods-014), sin literales de texto (RULE-mods-015) y sin replicar la lista de estados en el FE. Reemplazar el uso directo de `err.message` (~linea 1394) por un resolvedor de mensaje por `extensions.code`: key propia para `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` (texto generico: el plan esta publicado y las dos salidas, sin nombrar el estado porque los params no viajan en extensions) y para `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR`, con fallback a `err.message` si el code no tiene key (sin cambiar el comportamiento del resto de errores). Todas las keys nuevas (aviso y mensajes por codigo) en los TRES idiomas `lang/es`, `lang/en` y `lang/pt`, `es` fuente de verdad y paridad exacta de keys, siguiendo el precedente de `lang/<l>/competencyMatrixShell.i18n.json`. Agregar una story del caso bloqueado.", rollback="Revertir el `.vue`/`.ts` del grid, las keys de `lang/es`, `lang/en` y `lang/pt` y la story con `git checkout --`/borrado; la grilla vuelve a depender solo de `enableEdit` + permisos y a mostrar `err.message`." }
- edit S2.T4 { desc="Tests de la capa de presentacion y de paridad de canal. (a) `competencyAlignmentView`: un caso por cada estado del enum de `Curriculum.status` (flag true en Draft, InReview y Approved; false en Active, Deprecated y Archived) y campos previos del objeto devuelto (planId, matrixId, planEntries, competencies, developmentLevels, alignments) presentes e intactos. (b) `CompetencyAlignmentGrid`: las ocho combinaciones `enableEdit` (true/false) x permisos (con/sin) x plan editable (true/false): solo lectura siempre que el plan no sea editable; el aviso de plan publicado aparece SOLO cuando el motivo del bloqueo es el estado del plan (ausente si el bloqueo es solo por layout o por permisos). (c) Traduccion de errores por codigo: PLAN_LOCKED y PLAN_UNRESOLVED muestran el texto esperado en `es`, `en` y `pt`; un `extensions.code` sin key cae a `err.message` del backend. (d) i18n: keys nuevas presentes en los tres idiomas, `tests/integration/lang-parity.test.ts` en verde, y sin literales de texto ni lista de estados editables duplicada en el FE. (e) `tests/unit/competencyAlignmentParity.test.js`: caso de plan bloqueado (mismo code `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` por ambos canales) y caso Draft que pasa por ambos (REQ-05). (f) `npm run sync` y suite completa del mod, verificando que no quedan ediciones manuales en archivos synced del core (REQ-07).", rollback="Revertir los tests nuevos/modificados de (a) a (e), dejando competencyAlignmentParity.test.js en su version previa, y deshacer lo regenerado por `npm run sync`; no se toca codigo de produccion.", isTest=true }

### Enmienda 6

**Task ops:**

- edit S1.T1 { desc="Implementar `assertPlanEditable({ prisma, planId })` en `mods/curriculum-mapping/logic/helpers/alignmentRules.js`, junto a `assertActiveAdoption`, replicando el patrón de `mods/curriculum-design/logic/helpers/planEntryPlanStatusGuard.js`: lee `curriculum.status` por el prisma recibido, lista de estados EDITABLES (`Draft`, `InReview`, `Approved`) como constante única exportada, fail-closed ante estado no listado, plan ausente o planId vacío, dos errores propios: `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` (estado no editable; params status y statusLabel; mensaje de negocio en `es`, como todos los MESSAGES del mod, que nombra el estado y las dos salidas: versionar / devolver a Borrador) y `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR` (planId vacio o plan inexistente), y el mismo trato defensivo ante mock sin modelo que el precedente." }
- edit S2.T4 { validates=["REQ-03","REQ-04","REQ-05","REQ-07"] }

### Enmienda 7
**REQs:**

- REQ-08 (add) `confirmed`: Correcciones post-review kn-dredd (Adenda 1), sin cambiar la regla de negocio: (a) `docs/reference/competencyalignment-object.md` registra l

**Tasks agregadas:**

- S3: Actualizar `docs/reference/competencyalignment-object.md` segun REQ-08 (a): agregar R-PL a la tabla de reglas (§3); incorporarla en las tablas de escrituras gobernadas (§4, mas las de guardado en conjunto y via masiva) indicando que corre primero, antes de R-1 y R-6; y agregar a la tabla de errores (§7) `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` y `COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR` con su causa. (valida: REQ-08; rollback: Revertir `docs/reference/competencyalignment-object.md` al contenido previo (`git checkout -- docs/reference/competencyalignment-object.md`).)
- S3: Backend: en `logic/competencyAlignment.resolver.js` aplicar REQ-08 (b) y (d). (d) Mover la evaluacion de R-PL antes de `validateContributionPercentageRow` en `createCompetencyAlignment` y `updateCompetencyAlignment`, sin sacarla de la transaccion ni duplicar lecturas de `Curriculum`. (b) En `updateCompetencyAlignment`, validar el plan de ORIGEN solo si `current.planId` no esta vacio; el plan de DESTINO lo sigue validando `assertGovernedWrite`. Tests: update de fila con `planId` nulo y plan destino `Draft` se aplica y persiste el planId derivado; misma fila con plan destino `Active` rechaza PLAN_LOCKED y queda intacta; create/update con plan `Active` y peso invalido rechazan con PLAN_LOCKED (no con el error de peso). Los tests existentes siguen verdes sin tocar asserts, salvo el que fije el orden viejo si existe. (valida: REQ-08; rollback: Revertir `logic/competencyAlignment.resolver.js` y eliminar los tests agregados en esta task (`git checkout -- <resolver>` y borrar/revertir los archivos de test tocados).)
- S3: Front: en `CompetencyAlignmentGridElement.vue` (`onSaveAlignmentSet`), ante un rechazo con code `COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR` leido con el lector de code ya existente en `competencyAlignmentSaveError.logic.ts` (reusarlo, no duplicar la logica), recargar la vista para que la grilla pase a solo lectura y muestre el aviso, conservando el mensaje de error visible. Test de componente: guardado rechazado con PLAN_LOCKED -> se recarga la vista, la grilla queda en solo lectura y aparece el aviso; rechazo con otro code -> no recarga. (valida: REQ-08; rollback: Revertir `CompetencyAlignmentGridElement.vue` y eliminar el test de componente agregado.)
- S3: Regresion y sync de la Adenda 1: correr la suite completa del mod (incluida `tests/unit/competencyAlignmentParity.test.js`), typecheck con `vue-tsc` en 0 errores, y `npm run sync` verificando que no queden ediciones manuales en archivos synced del core. Reportar suites con estado y totales; clasificar cualquier fallo como introducido o preexistente. (valida: REQ-08, test; rollback: No aplica (solo verificacion).)
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T2.4
- [x] S1.T2.5
- [x] S1.T3

**Gate (auto)**: En la rama de UPONE-1770: la suite del mod muestra en verde los casos de rechazo por las cinco vías con plan Active/Deprecated/Archived y de paso libre en Draft/InReview/Approved; ejecutando a mano una mutación de tributación contra un plan Activo se obtiene `COMPETENCYALIGNMENT_PLAN_LOCKED` con el mensaje de negocio y la fila queda sin cambios en la DB.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: En la app (o en Storybook con la story nueva): la matriz de tributación de un plan Activo se ve entera en solo lectura con el aviso de versionar o volver a Borrador, aun con layout de edición y permisos; el mismo grid en un plan Borrador sigue editable y sin aviso; el aviso se ve traducido en es y en; y `competencyAlignmentParity.test.js` muestra el mismo rechazo para plan bloqueado por ambos canales.

### Session 3 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: Correcciones post-review kn-dredd (Adenda 1): la doc de referencia registra R-PL y sus 2 codes; update con planId nulo vuelve a editar y reparar; la grilla recarga y queda en solo lectura tras PLAN_LOCKED; R-PL se evalua antes que R-6 en create/update. Cada correccion con test; suite del mod verde, typecheck 0, sync sin drift.
## Decisions

- **D1 (estados, decisión 1B del dev, 2026-09-24):** editables `Draft`, `InReview`, `Approved`; bloqueados `Active`, `Deprecated`, `Archived`. Lista de editables, fail-closed.
- **D2 (ubicación, decisión 3A del dev):** curriculum-mapping, sobre la rama `feat/UPONE-1770-tributacion-peso-del-eje-1`; merge después de 1770, independiente de TICKET-150.
- **D3 (sincronización de la rama, opción A del dev, 2026-09-24):** se mergeó `origin/develop` en la rama (commit 652ac75, sin conflictos, suite del mod 2825/2825 en verde) en vez de rebase, para conservar los hashes de 1770 referenciados por Kanai y el juez.
- **D4 (enmienda del dev posterior al request, 2026-09-24):** el merge de develop trajo la tool de lectura MCP `cm_alignment_view`, que consume `competencyAlignmentView`. Por pedido explícito del dev, REQ-05 (b) y S2.T3 (b) agregan la actualización de su descripción para documentar el flag de editabilidad. No deriva del request original (que es anterior al merge); es una ampliación acotada y aprobada por el dev.
- **D5 (estructura S1.T2):** S1.T2 es la tarea padre de sus cinco subtareas S1.T2.1 a S1.T2.5 (una por vía de escritura); se ejecutan las hojas y el padre cierra cuando cierran todas. No es duplicación de alcance.
- **D6 (referencias verificadas):** tras el merge, el dev verificó en la rama la existencia de `logic/alignmentView.resolver.js` (retorno `JSON!`), `ai/tools.js` con `cm_alignment_view`, `governedObjects.CompetencyAlignment` en `ai/index.js` y `mods/curriculum-design/logic/helpers/planEntryPlanStatusGuard.js` en develop de curriculum-design.

