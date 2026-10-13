---
id: DOC-kb-sp12-UPONE-1771-plan-de-implementacion
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp12
  - UPONE-1771
  - UPONE-1452
  - tributacion
  - versionado
  - indicadores
  - plan
  - variantes
---

# UPONE-1771 · Plan de implementación consolidado y variantes según la respuesta del PO

> Plan de trabajo completo para UPONE-1771, partido en dos tickets de Kanai (A indicadores, B versionado), con referencias a código y documentos, y con las variantes que introduce cada respuesta posible del PO y cada verificación técnica pendiente. Verificado el 2026-10-13 contra `origin/develop` (curriculum-design `6e2988f`, curriculum-mapping `a456b14`, object-manager `ba5a9bf5`, layout `30da981c`, mcp `b6185e9`). Hermanos: [[UPONE-1771-pendientes-y-evidencia]], [[UPONE-1771-detalle]], [[UPONE-1771-pre-intake]], [[UPONE-1771-registro-de-decisiones]], [[UPONE-1771-estado-por-usos]].

**Cómo leerlo.** La sección 1 resume el plan. La sección 2 fija el escenario base sobre el que está escrito. Las secciones 4 y 5 detallan cada fase. La sección 8 es la que responde "qué cambia si el PO decide X". Las rutas son relativas al repo del mod (cm = curriculum-mapping, cd = curriculum-design, om = object-manager, ly = layout).

**Leyenda de procedencia:** [código] verificado en `origin/develop` · [KB] dicho en un documento del KB · [en vivo] probado en el tenant de desarrollo el 2026-10-06 · [inferencia] deducción sin respaldo directo · [no confirmado] se intentó y no se pudo comprobar.

## 1. Resumen del plan

**En una frase:** dos tickets casi independientes. A calcula y muestra indicadores (cm, front, resolver y ficha MCP de lectura). B decide qué pasa con el mapa de tributación al versionar un plan (cm, cd y MCP) y es el de mayor riesgo.

| Ticket | Fases | Esfuerzo orientativo (SP) | Riesgo | Depende de |
|---|---|---|---|---|
| **Fase 0** · Preparación y verificaciones | V-1 a V-5, relectura de `origin/develop` | Menos de 1 | Bajo | Nada |
| **A** · Indicadores | A1 contrato, A2 fuera de diseño, A3 indicador especializado, A4 lectura del plan, A5 ficha MCP, A6 cierre | 5 a 7 | Medio | Respuesta del PO sobre D8 solo para el texto final de A3 |
| **B** · Versionado | B0 pruebas de viabilidad, B1 réplica en cm, B2 mutation y `sourceEntryId` en cd, B3 modal, B4 informe, B5 MCP, B6 pruebas, B7 cierre | 8 a 12 | Alto | B0 antes de B1; aceptación del PO sobre F antes de abrir |

Los rangos son orientativos, en Story Points, y salen de la estimación del detalle (A 5 SP, B 8 SP o más) más el desglose por fase. [inferencia] El desglose por fase no se midió contra trabajo pasado.

**Camino crítico.** B0 → B1 → B2 → B3 → B6. A corre en paralelo y no bloquea a B.

## 2. Escenario base

El plan está escrito sobre este escenario. La sección 8 dice qué cambia si alguna premisa no se cumple.

| Premisa | Valor base | Origen |
|---|---|---|
| Nivel representativo sin marca (D8) | Opción A: cuenta cualquier evaluador | D8 [KB], pendiente de confirmación del PO |
| Indicadores del componente | Cinco, con el normal y el especializado juntos | D10 [KB] |
| Versionado (D3) | Opción F: la versión nace sin tributación; llevar el mapa es opt-in con `competencyalignment:create` y `competencynode:adopt` | D3 [KB] |
| Mecanismo de réplica (N-1) | Dos pasos: versionar y luego llamar a la mutation de réplica de cm | Recomendación en [[UPONE-1771-pendientes-y-evidencia]] |
| Total de competencias en indicadores | Solo hojas medibles (maqueta) | D10 [KB] |
| Editor de la marca de nivel representativo | Fuera de 1771 | D8 [KB] |
| Modal de versionado | Viable con layout propio y `customEndpoint` | [código] precedente en up1-manager; [no confirmado] radios o selects |

## 3. Reglas del terreno

Restricciones que valen para todas las fases. Cada una trae su fuente.

- **Construir sobre `origin/develop`**, no sobre el `develop` local, que está atrasado: versionar un Curriculum falla en local por `internalId` (UPONE-2003). [KB] detalle §4; [código] `om/src/graphql/resolvers/helpers/db-managed-fields.js:21`.
- **Un solo override de creación por mod.** Prohibido sobrescribir `createInstance` en cm: colisiona con el de cd, que gana según el orden de carga. cd ya es dueño de `createInstance` (`logic/sectionValidation.resolver.js:318-341`); UPONE-1758 retiró un guard de cm por esto (cm `CLAUDE.md:49-52,246`; test `tests/integration/graphql-schemas.test.ts:57-62`). Toda mutation nueva usa nombre propio y sufijo `Validated` (`graphql-schemas.test.ts:35-43`).
- **Un solo resolver por regla**, sin ramas por canal, para que pantalla y MCP den el mismo resultado. [código] `cm tests/unit/competencyAlignmentParity.test.js:1-12`.
- **Escribir tributación solo por los resolvers gobernados de cm** (`create/update/delete/upsertSet/bulkApply ...Validated`), nunca por Prisma directo: salta R-PL, R-1 a R-6, historial y eventos. [código] `cm ai/index.js:285-301`.
- **Permisos con la función pura** `evaluateObjectPermission` (no lanza ni audita). [código] `om/src/services/auth/authChecker.js:286-376`; cargador en cd `logic/helpers/authCheckerLoader.js:31-65`.
- **Peso en texto decimal:** copiar tal cual, sin reparsear. [código] `cm objects/CompetencyAlignment.json:78-83`, `logic/helpers/validateCompetencyAlignment.js:70-87`.
- **No reintroducir `DevelopmentScheme`:** el nombre vigente es `DevelopmentLevel` (UPONE-1753). [KB] registro de decisiones.
- **Citar las reglas con su objeto:** R-1 a R-5 colisionan entre escala de desempeño, tributación y UPONE-1753.
- **Sync y contratos MCP:** `ai/` se edita solo en el mod y se sincroniza con `npm run sync --workspace=mcp`; `src/mods/` del repo mcp es generado. No commitear artefactos de sync ni seeds. [código] `mods/.ai/COMMANDMENTS.md:39`; `mcp/README.md:54,63`.
- **Tenant:** toda lectura o escritura usa el `prisma` del contexto y es no-op si el tenant no tiene cm. [código] `cd logic/helpers/curriculumAlignmentWeights.js:130`; test `tests/unit/activityCompetencies.test.js:263`.
- **Tests existentes:** no aflojar aserciones; cambiarlas solo con aprobación y donde afirman comportamiento viejo. [KB] feedback del equipo.
- **Commits y ramas:** referencia `UPONE-1771` al inicio del asunto; el pre-push bloquea push a develop y exige PR. [código] `cm docs/pre-push-hook.md`.

## 4. Fase 0 · Preparación

**Objetivo.** Despejar los riesgos que, si fallan, invalidan fases posteriores.

| # | Tarea | Resultado esperado | Referencia |
|---|---|---|---|
| 0.1 | **V-1 / H-R.** Probar con un Diseñador y un Revisor (no Admin) que cd ve las capabilities de cm | Lista de roles que ven la opción de llevar el mapa | `om/src/services/auth/modRoleCapabilities.js:105-150`; mapeo de roles en base (`up1_suite_app_role.modRoleId`) [no confirmado] |
| 0.2 | **V-2.** Confirmar la FK real de `planEntry.sourceEntryId` en la base (ON DELETE) | SetNull o Restrict, documentado | `om/prisma/BASEMODEL/schema.prisma:1594-1597` |
| 0.3 | **V-3.** Buscar consumidores de `sourceEntryId` en el repo mcp | Cero o lista | cm tiene cero referencias [código]; mcp no revisado |
| 0.4 | **V-4.** Confirmar que la versión nueva nace en Draft | Estado verificado en una versión real | R-PL admite Draft, InReview y Approved (`cm logic/helpers/alignmentRules.js:253,297-313`) |
| 0.5 | **V-5.** Retirar el worktree `mods/.nits-v2-wt` y sus dos carpetas generadas; repetir el sync del MCP | Árbol limpio | Registro de decisiones |
| 0.6 | Relectura de `origin/develop`: `CompetencyAlignment.json`, resolver de lectura, batch de cm, helpers de cd, flujo de om | Líneas recitadas | D14 |
| 0.7 | Abrir los tickets A y B en Kanai con el intake y las sondas del proyecto | Dos tickets con REQs anclados al pedido | Registro D2 |

**Validación.** Un informe corto con el resultado de 0.1 a 0.4. Si 0.1 falla, se aplica la variante T-1 de la sección 8.

## 5. Ticket A · Indicadores

**Objetivo.** Que el mapa diga cuánto cubre, con el denominador declarado según la vista, por pantalla y por MCP.

### A1 · Contrato de los indicadores (dónde se calculan)

- **Decisión de intake.** Dos formas:
  - **Resolver como única fuente.** El cálculo vive en el resolver de lectura y el front lo consume. Un solo cálculo, paridad natural con el MCP. Contra: la grilla hoy calcula en el cliente sobre datos que el usuario puede estar editando sin guardar [inferencia], y pasar a servidor cambiaría ese comportamiento.
  - **Helper espejo.** El algoritmo vive en `logic/helpers` y en `modsComponents`, con un test que falla si divergen (patrón `weightedSum.parity`). Mantiene el recálculo en vivo. Contra: dos copias.
- **Recomendación.** Resolver como fuente para la lectura del plan y el MCP, y helper espejo con test de paridad para la grilla. [inferencia] Elegir al abrir el intake.
- **Archivos.** cm `modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridCoverageSummary.ts` (hoy `computeCoverageSummary`, l.48-94), `CompetencyAlignmentGridElement.vue:139-144` (entrega competencias, tributaciones y planEntries crudos), `logic/alignmentView.resolver.js` y su esquema, nuevo `logic/helpers/coverageIndicators.js` y su test de paridad.
- **Patrón.** [código] `cd tests/unit/weightedSum.parity.test.ts:1-14`, `docs/patterns/weighted-sum.md:23,28`; `cd docs/patterns/resolver-override.md`.
- **El payload debe incluir** `achievementBasis`, `isRepresentative` por competencia y nivel, y el denominador declarado por indicador (hoy la vista no los devuelve). [código] `cm ai/tools.js:416-476`.
- **Validación.** Test de paridad resolver y helper; denominador visible en la respuesta.

### A2 · Fuera de diseño

- **Alcance (D9).** Dos casos: fila en un nivel que la competencia no declara (solo si declara al menos uno), y fila colgada de un nodo que consolida. Se muestran marcadas, no se borran, no entran al cálculo. La tarjeta aparece solo si hay filas afectadas y cuenta tributaciones. El detalle de la fila ofrece moverla a un nivel declarado.
- **Alcanzabilidad.** [código] Se puede agregar hijas a una hoja ya tributada: `competencyTree-upsert.resolver.js` solo usa `assertNodesNotAligned` al borrar (`:57,920-922`), y el lote no revalida filas sin cambios (`competencyAlignment-batch.resolver.js:283-285,325-327`). Desmarcar un nivel declarado deja las filas vivas (M-28, `cm CLAUDE.md:184`).
- **No cambiar** el descarte de la vista para competencias de otras matrices (`alignmentView.resolver.js:277`); D9 dice que es correcto.
- **El atajo "mover a un nivel declarado"** debe pasar por el camino gobernado de modificación, que valida R-4 (`alignmentRules.js:184-201`) y R-PL.
- **Tests que se invierten con aprobación:** `tests/component/competency-alignment-grid.coverage-summary.component.spec.ts:50-61` (exige tres tarjetas y que no exista "Fuera del diseno"), `tests/unit/competencyAlignmentGridLang.test.js:223-225` (`summary.outOfDesign` indefinido).
- **i18n** es, en y pt con paridad por clave y valor (`cm tests/integration/lang-parity.test.ts`); **accesibilidad** de la tarjeta y de las marcas de fila; **tokens** de diseño.

### A3 · Indicador especializado y total de competencias

- **Regla (D8, escenario base).** Con `achievementBasis = RepresentativeLevel`, el indicador "con evaluador en el nivel representativo" cuenta una competencia si hay evaluador (Evalúa o Ambas) en el nivel marcado. Sin marca, cuenta cualquier evaluador. Con un solo nivel declarado, la marca no interviene. [KB] registro D8.
- **Total (D10).** El total pasa a contar solo hojas medibles; hoy `competencies.length` incluye nodos que consolidan (`CoverageSummary.ts:83,91`). Usar `isValidTarget`.
- **Convivencia.** Con base `RepresentativeLevel` el componente muestra los dos indicadores (normal y especializado). Con `Aggregation` solo el normal.
- **Archivos.** El helper de A1, `CompetencyAlignmentGridCoverageSummary.ts`, `lang/{es,en,pt}/competencyAlignmentGrid.i18n.json` (texto "Falta evaluador en {{nivel}}" en `es:41`).
- **Validación.** Casos del detalle: competencia con evaluador solo en un nivel no representativo no cuenta; matriz sin nivel marcado tiene comportamiento definido; "1 de 3" por celda declarada.

### A4 · Lectura del plan

- **Alcance (D10).** Tres indicadores sobre todas las matrices adoptadas: desarrollo tributado, asignaturas que tributan y matrices adoptadas. Sin acciones de corrección.
- **Cuidado.** La consulta de la vista trae las tributaciones de todo el plan y luego descarta las que no son de la matriz pedida (`alignmentView.resolver.js:259-277`). Para el denominador "todas las matrices adoptadas" hay que agregar por matriz antes de descartar o consultar aparte. [inferencia]
- **[no confirmado]** El punto de montaje exacto de la "lectura del plan" (la maqueta v17 lo dibuja; no se identificó el layout). Resolver en el intake.
- **La lectura no exige adopción** (`alignmentView.resolver.js:192,203-206`): no cambiar esa regla.

### A5 · Ficha MCP de lectura de indicadores

- **Qué.** Que un agente lea los mismos indicadores con su denominador declarado y las filas fuera de diseño marcadas, sin recalcular.
- **Cómo.** Extender `cm_alignment_view` o agregar una ficha de lectura nueva; la ficha es un dato (`operation`, `field`, `requiresCapability: competencyalignment:view`, `resultPath`). [código] `cm ai/tools.js:416-476,474`; `mcp/src/tools/register-declarative-tools.js:5-16`.
- **Textos y tests a actualizar con aprobación:** guía de `cm_alignment_view` (`ai/tools.js:444-450`) y `tests/unit/aiPack.test.js:1156-1191`.
- **Sync.** `npm run sync --workspace=mcp`; tests `mcp/test/validate-fichas.test.mjs` y `sync-mods.test.mjs`.
- **Restricción.** Ningún campo del resultado empieza con guion bajo: la capa MCP lo elimina (`register-declarative-tools.js:26-37`).

### A6 · Cierre del ticket A

- Documentación del mod (indicadores), i18n en tres idiomas, accesibilidad, no regresión (vista en plan publicado en solo lectura, grilla), evidencia de ejecución en dos vistas y por MCP, sin artefactos de sync commiteados.

## 6. Ticket B · Versionado

**Objetivo.** Que versionar un plan no deje la tributación en estado ambiguo: la versión nace sin mapa y, quien tiene permisos, puede llevarlo; todo con el mismo resultado por pantalla y por MCP, con informe de filas sin destino.

### B0 · Pruebas de viabilidad (antes de B1)

| Prueba | Pregunta que cierra | Referencia |
|---|---|---|
| Modal con elección | ¿El layout propio admite radios o selects, `initialDataMapping` y gating por capability dentro del modal? | up1-manager `config/layouts/core_user_admin_list.json:70-112`, `core_user_activate_confirm.json:13-49`; `ly/src/layouts/RecordList/RecordList.vue:3467` |
| Encadenado | ¿Puede el cliente llamar a la mutation de réplica de cm tras la de cd, o hay que hacerlo en servidor? | N-1 en [[UPONE-1771-pendientes-y-evidencia]] |
| Hook reutilizable | ¿`inheritRecordTypeExtensionOnVersion` se puede invocar desde una mutation propia? Hoy lo llama el override (`sectionValidation.resolver.js:299,338`) y `_internals` se exporta en `:343` | [no confirmado] si el hook está exportado |
| Informe | ¿El modal puede mostrar un resumen estructurado de `skipped`? | `ly RecordDetail.vue:5480-5494` descarta `revealField` |

### B1 · Réplica en cm (operación "replicar desde la versión anterior")

- **Qué.** Mutation nueva de cm, con sufijo `Validated`, que recibe el plan nuevo, resuelve el plan anterior por `previousVersionId` y copia las tributaciones remapeando al planEntry equivalente, conservando `developmentLevelId`, tipo de contribución y peso.
- **Reglas de diseño.**
  - **Molde: bulkApply.** "Siempre alta": lo ya existente se saltea como `duplicate`; reporta `{planEntryId, reason}` con `duplicate | outside-plan | outside-matrix | rule`; troceo interno de 500; aborta todo si el plan no es editable, no hay adopción vigente o supera el tope. [código] `cm logic/competencyAlignment-bulkApply.resolver.js:1-34`; `MAX_ALIGNMENT_BATCH_ROWS = 500` en `competencyAlignment-batch.resolver.js:81`.
  - **No usar** `upsertCompetencyAlignmentSetValidated` como molde: es reemplazo y puede pisar ajustes manuales.
  - **Adopción (D12, D19).** Antes de replicar, adoptar en la versión nueva las mismas matrices solo si falta la adopción y solo adopciones vigentes. Nace `Explicit`, que el reconciliador no gestiona. Reglas RA-5 y RA-9, `matrixAdoption.resolver.js:201-262`, `cm objects/MatrixAdoption.json:30-37`.
  - **Permisos (D3, D5).** Exigir `competencyalignment:create` y `competencynode:adopt` en servidor. Sin `adopt`, una réplica que adopte permitiría adoptar por la puerta de atrás a quien solo tiene `create`. Perfiles: Diseñador y Diseñador Autoridad los reúnen; la Autoridad sola no. [código] `cm profiles/*.json`, `capabilities.json:84,99`.
  - **Equivalencia del planEntry (D7).** Primero `sourceEntryId`; respaldo por asignatura (plan más asignatura). [código] No hay unicidad `(plan, asignatura)`, el respaldo puede ser ambiguo y debe informarse.
  - **Idempotencia (D6).** Reejecutar sobre la misma versión no duplica ni versiona: los pares existentes se saltean. El reintento de altas sin `id` ya existentes se rechaza con `DUPLICATE_PAIR` (`alignmentRules.js:326`). P2002 no se captura hoy en el lote; documentar o capturar como hace `matrixAdoption.resolver.js:258`.
  - **Auditoría.** Historial de una entrada por operación (`logic/helpers/competencyAlignmentHistory.js`) y evento post-commit, atribuidos a quien opera.
  - **Informe.** Devolver cantidad replicada y `skipped` por motivo, en campos sin guion bajo inicial.
- **Archivos.** Nuevo resolver y esquema en `cm logic/`, reutilizando `logic/helpers/alignmentRules.js` (R-PL `:297-313`, R-1 `:219-241`, R-2 `:326`, R-3 `:159-171`, R-4 `:184-201`).
- **Pruebas.** Unitarias por regla; paridad con el mismo resolver en contextos de pantalla y MCP (`competencyAlignmentParity.test.js`); idempotencia; plan no editable; sin adopción; más de 500 filas; permisos con y sin `adopt`.

### B2 · Mutation de versionado en cd y `sourceEntryId`

- **Qué.** Mutation nueva de cd (D1) que versiona con el motor genérico, captura el mapa viejo a nuevo, puebla `sourceEntryId` (D7) y devuelve el resultado, siguiendo el molde de `createCurriculumWithRecordType`, que expone una mutation nueva que "no colisiona" (`cd logic/curriculum-create.resolver.js:19`).
- **Pasos.**
  1. Delegar en la creación genérica con `asNewVersion` y `prefillFrom` (`om instance.resolver.js:4338-4346,4388-4412,5212-5222`). El gate `curriculum:version` y el estado de origen (Aprobado o Activo) los aplica el core (`cd objects/Curriculum.json:53-60`; `version-from-source.js:89-101`).
  2. Filtrar el mapa por `type === 'planEntry'` (`om/.../deep-clone-direct.js:159,392-395`). El core lo devuelve como `cloneMap` y como `data._cloneMap`; usar el campo sin guion bajo (`instance.resolver.js:5187,5198,5201`).
  3. Poblar `sourceEntryId` de las entradas nuevas, post-commit. [código] El hook actual corre fuera de la transacción y falla en silencio (`sectionValidation.resolver.js:305-312`): si esto falla, la versión queda sin trazabilidad y debe informarse.
  4. Invocar por cuenta propia la herencia de la extensión del plan, porque la mutation no pasa por el override (D1; `sectionValidation.resolver.js:299-312`).
  5. Si se pidió llevar el mapa, aplicar el mecanismo de N-1 (ver sección 8, T-2).
- **Cuidados.** No agregar claves propias en los datos de `createInstance` sin borrarlas antes de delegar; el override no las borra (`sectionValidation.resolver.js:321-337`). Reintentar crear la versión genera una v3 y no repara una v2 incompleta (`version-from-source.js:103-120`).
- **Pruebas.** Versionar con y sin elección; versión sin tributaciones; plan sin matrices; `sourceEntryId` poblado; fallo parcial; no regresión del versionado actual y del clon.

### B3 · Modal de versionado

- **Qué.** Reemplazar la acción `create-new-version` (`cd config/layouts/default_Curriculum_list.json:19-30`, hoy `type: "create"` sin parámetros) por una acción `modal` con `targetLayoutId`, `targetObjectName` e `initialDataMapping`, hacia un layout propio de cd cuyo `customEndpoint` llama a la mutation de B2. Mantener `requiredCapability: curriculum:version`.
- **Contenido del modal.** La opción de llevar el mapa visible solo con `competencyalignment:create` y `competencynode:adopt`, y el texto informativo de D20: la versión nueva nace sin tributación aunque la anterior sí la tenía; no bloquea.
- **Precedentes.** [código] up1-manager (acción `modal` con `customEndpoint`), cd `default_Curriculum_create.json:14-18` (`customEndpoint` hacia `createCurriculumWithRecordType`, con `inputVariable`), `default_Activity_view.json:585-625` (acciones `modal`).
- **Límite conocido.** [código] La acción `create` actual solo envía origen y bandera de versión y no admite parámetros (`ly/src/composables/useCreateRowAction.ts:76-85`); `prefilledModal` no inyecta `asNewVersion` (`RecordList.vue:3706-3709`), por lo que la bandera debe fijarla la mutation.
- **i18n** es, en y pt; **accesibilidad** del diálogo.

### B4 · Informe de filas sin destino en pantalla

- **Problema.** `revealField` muestra un valor de un solo uso; el aviso posterior solo lee el número de versión (`ly RecordDetail.vue:5480-5494`; `useCreateRowAction.ts:126-138`).
- **Patrón.** `warnings: [{code, params, message}]` (`cm logic/helpers/personalisedError.js:74-81`) y `skipped` por motivo (bulkApply).
- **Propuesta.** Mostrar el resumen (replicadas y sin destino) en el modal tras responder, o en el mensaje posterior; el detalle por fila en el componente de tributación de la versión nueva. [no confirmado] Si el modal renderiza una lista estructurada; resolver en B0.

### B5 · Contratos MCP

- **Ficha de versionado de planes en cd.** `preview-confirm`, `requiresCapability: curriculum:version`, retorno tipado, sobre la misma mutation de B2 (D11). Hoy `cd ai/index.js:33-37` solo lista como no expuesto "curriculos, mallas, planes... pendiente".
- **Ficha de replicar en cm.** `preview-confirm`, exige `competencyalignment:create` y `competencynode:adopt`, sobre la mutation de B1. Todas las escrituras `cm_*` usan `writePattern: "preview-confirm"` (`cm ai/tools.js:702-704`).
- **Mover `CompetencyAlignment` de `governedObjects` a contrato** (`cm ai/index.js:285-301`, "cuando haya ficha, este objeto pasa a contrato") y actualizar los textos que dicen que la tributación solo se cambia en UP1: `ai/index.js:245,313,359`, `ai/tools.js:444-450`, `CLAUDE.md:4-9,246-247`.
- **Tests que afirman lo viejo** (cambiar solo con aprobación): `tests/unit/aiPack.test.js:1156-1191` (cinco mutations nombradas y texto de la guía), `:1280-1299` (`WITHOUT_WRITE_TOOL`), `:743-762` ("ninguna escritura toca la tributación"), `:1323-1326`, `:1349`.
- **Permiso y auth.** El MCP usa el mismo usuario y rol que la pantalla (`mcp/src/auth/sessionTokenAuth.js:1-22,37-41`); `requiresCapability` solo oculta la tool, el permiso real lo exige el resolver (`mcp/src/tools/register-declarative-tools.js:228`).
- **Sync.** `npm run sync --workspace=mcp` y tests de fichas; D13: la réplica por MCP escribe tributación atribuida y auditada a nombre de quien versiona.

### B6 · Pruebas y evidencia

- **RBAC efectivo** con usuarios de rol distinto de Admin, por pantalla y por MCP, con y sin cada capability.
- **Paridad** pantalla y MCP extendida al versionado y a la réplica.
- **Evidencia en ejecución:** versionar un plan con tributaciones por ambos caminos (con y sin llevar el mapa) y ver los indicadores en las dos vistas. [en vivo] Lo no probado hasta hoy: réplica con tributaciones reales, rol sin permiso de cm, grilla de la UI con versión sin adopción.
- **No regresión:** versionado de plan sin tributaciones, clon de plan, vista de tributación en plan publicado en solo lectura, borrado de planes versionados.

### B7 · Cierre del ticket B

- Documentación de cd y cm, entrada en `docs/patterns/INDEX.md` si hay patrón nuevo, tabla de decisiones del `CLAUDE.md` de cm, i18n, sync, sin artefactos commiteados.

## 7. Orden y dependencias

| Fase | Depende de | Puede correr en paralelo con |
|---|---|---|
| Fase 0 | Nada | Nada |
| A1 | Fase 0.6 | B0 |
| A2, A3, A4 | A1 | Todas las de B |
| A5 | A1 a A4 | B5 |
| B0 | Fase 0 | A1 |
| B1 | B0 | A2 a A4 |
| B2 | B0 y B1 (la parte de réplica) | A5 |
| B3, B4 | B2 | A5 |
| B5 | B1 y B2 | A5 |
| B6 | B1 a B5 | A6 |

## 8. Variantes según lo que decida el PO y lo que verifique el dev

### 8.1 Variantes según la respuesta del PO

**En una frase:** la mayoría de las respuestas solo cambian una fase; dos de ellas (el editor de la marca y rechazar la opción F) agregan trabajo nuevo.

| Respuesta del PO | Fases afectadas | Qué cambia | Esfuerzo orientativo | Riesgo |
|---|---|---|---|---|
| **D8 = A** (base) | A3 | Sin respaldo cuando no hay marca; con la marca vacía el especializado coincide con el normal | Base | Bajo |
| **D8 = B** (último nivel) | A3, A2 | Programar el respaldo "último nivel declarado" y fijar el orden de niveles (la grilla usa el último del catálogo, `CompetencyAlignmentGridTable.ts:373-398`); pruebas de ambos criterios | +0,5 a 1 SP | Bajo |
| **El PO pide incluir el editor de la marca** (nueva fase A7) | A7 nueva, A3, A5 | Escribir `isRepresentative` por pantalla; hoy solo lo escribe el CRUD genérico y la lista blanca de niveles maneja solo `developmentLevelIds` (`cm logic/helpers/nodeDevelopmentLevels.js`). Incluye regla "exactamente uno", pruebas y ficha MCP si corresponde | +3 a 5 SP [inferencia] | Medio: toca la validación de la matriz (`validateCompetencyMatrix.js:162-168`) |
| **El PO pide validar "exactamente uno" sin editor** | A7 reducida | Elegir dónde validar (al guardar la competencia o al publicar la matriz) y qué hacer con datos existentes mal formados | +1 a 2 SP [inferencia] | Medio |
| **El PO pide alinear grilla y simulador con la marca** (nueva fase A8) | A8 nueva | El aviso "Falta evaluador en {nivel}" pasa a leer la marca en vez del último nivel; el simulador sigue siendo didáctico (`trace.ts:158`), decidir si lee datos | +1 a 2 SP [inferencia] | Bajo |
| **El PO no alinea** | A6 | Documentar que conviven dos criterios (marca para el indicador, último nivel para el aviso) | Sin costo | Medio por confusión de usuarios |
| **Convivencia: ambos indicadores** (base) | A3 | Cinco indicadores en el componente | Base | Bajo |
| **Convivencia: el especializado reemplaza al normal** | A3, A6 | Con base `RepresentativeLevel` el componente lleva cuatro; el normal solo se ve con `Aggregation`; ajustar textos y pruebas | -0,5 SP | Bajo |
| **Total de competencias: solo hojas medibles** (base) | A3 | Alinear el cálculo con `isValidTarget` | Base | Bajo |
| **Total de competencias: se mantiene todas** | A3 | Sin cambio de código; corregir el texto de la maqueta | -0,5 SP | Bajo |
| **Opción F aceptada** (base) | B | Plan tal como está | Base | Medio |
| **Opción F rechazada: replicar por defecto, como la maqueta** | B1, B2, B3, B5 | Vuelve la opción E de D3. La réplica debe poder ejecutarse sin que quien versiona tenga `create` ni `adopt` (autorización derivada, permiso permisivo en cm), con auditoría a nombre de quien versiona. N-1 en dos pasos deja de servir (la llamada del cliente fallaría sin permiso) y obliga a una invocación en servidor. El modal solo ofrece "partir limpio" a quien tiene permisos. Un agente MCP que versiona escribiría tributación sin permiso propio (excepción cross-mod, D13 vuelve a ser compleja) | +3 a 5 SP [inferencia] | **Alto**: revisión de seguridad |
| **Texto del aviso del modal (D20)** | B3 | Solo redacción | Sin costo | Bajo |
| **El PO revierte D10 y quiere "con evaluador" y "fuera de diseño" también en la lectura** | A4, A5 | La lectura pasa de tres a cinco indicadores, con acciones donde no hay forma de actuar | +1 SP | Bajo |
| **El PO pide versionar también la matriz** | Nuevo ticket | Fuera de 1771 (el detalle lo excluye) | Fuera de alcance | n/a |
| **El PO no responde a tiempo** | A3 | A sigue con D8 = A como degradado; B no se abre hasta aceptar F | Sin costo | Bajo |

### 8.2 Variantes según verificaciones y decisiones técnicas

| # | Si ocurre | Qué cambia | Fases |
|---|---|---|---|
| T-1 | **V-1 falla:** un rol que no es Admin no ve las capabilities de cm en cd | La opción de llevar el mapa nunca aparece para ese rol. [código] El mecanismo no tiene barrera por mod; el mapeo real es de configuración en la base (`up1_suite_app_role.modRoleId`). Se resuelve con configuración de plataforma, no con código; si no se puede, B se entrega con la opción visible solo para Admin y Consultor (mapeo del repo, `cm config/app.json:29-31`) | B3, B6 |
| T-2a | **N-1 = dos pasos** (base) | La mutation de cd versiona y devuelve el id; la réplica la dispara el cliente o el usuario desde la versión nueva. [no confirmado] Si el modal puede encadenar dos llamadas; si no, cae en T-2d | B2, B3 |
| T-2b | **N-1 = cd importa y llama a cm** | Una sola llamada. Sin precedente entre mods, acopla cd a cm y falla ruidoso si el tenant no tiene cm. [no confirmado] Que el resolver de cm se pueda ejecutar desde cd | B1, B2 |
| T-2c | **N-1 = hook post-versión en core** | Atómico con la transacción; es Core Extension (hoy core solo tiene `beforeCreate` y `beforeUpdate`, `om/src/services/objectHooks.js:46-49`), requiere coordinación con core y pasa por Aduana | B1, B2, plan de core |
| T-2d | **El modal no puede encadenar ni elegir** | Se recupera la opción C del pre-intake: versionar como hoy y ofrecer "replicar desde la versión anterior" en el componente de tributación de la versión nueva. D1 pierde la elección dentro del modal (queda el texto informativo de D20) y hay que avisar al PO | B3, B4 |
| T-3 | **El modal no admite radios ni selects** | Dos acciones de fila separadas ("Crear nueva versión" y "Crear nueva versión llevando el mapa"), la segunda con `visibilityConditions` por capability (precedente `default_Activity_view.json:585-625`) | B3 |
| T-4 | **V-2 o V-3 fallan** (la FK es Restrict o mcp consume `sourceEntryId`) | No poblar `sourceEntryId`; la réplica solo puede resolver el equivalente en el momento de versionar (con el mapa del resultado) y la recuperación posterior se apoya solo en el respaldo por asignatura, que puede ser ambiguo. D7 pasa a "no" | B1, B2 |
| T-5 | **V-4 falla:** la versión no nace en Draft | R-PL bloquea la réplica. Hay que decidir cómo (estado inicial o excepción gobernada) | B1 |
| T-6 | **Informe estructurado imposible en el modal** | Mostrar solo el conteo en el mensaje posterior y el detalle por fila en la versión nueva | B4 |
| T-7 | **A1 = resolver como única fuente** | La grilla deja de recalcular en vivo con lo no guardado [inferencia]; se simplifica A5. Con helper espejo: dos copias y test de paridad | A1, A3 |
| T-8 | **Releer `origin/develop` muestra deriva** (D14) | Recitar rutas y revisar `CompetencyAlignment.json`, el resolver de lectura, el batch y helpers de cd | Fase 0 |
| T-9 | **Abrir una ficha de escritura de tributación** | Obliga a mover `CompetencyAlignment` de `governedObjects` a contrato y reescribir los textos que dicen que solo se cambia en UP1, con aprobación para los tests que lo fijan | B5 |

### 8.3 Escenarios compuestos

| Escenario | Premisas | Esfuerzo orientativo total | Comentario |
|---|---|---|---|
| **Base** | D8 = A, ambos indicadores, F aceptada, N-1 en dos pasos, sin editor | 13 a 19 SP (A 5 a 7, B 8 a 12) | Es el plan de las secciones 4 a 6 |
| **Mínimo** | Solo ticket A, B diferido a la respuesta del PO sobre F | 5 a 7 SP | Entrega los indicadores sin tocar el flujo de versionado |
| **Ampliado** | D8 con editor de la marca y alineación de la grilla, F rechazada | 21 a 31 SP [inferencia] | Suma A7, A8 y la autorización derivada de B; exige revisión de seguridad y conviene dividir en más tickets |

## 9. Riesgos

| Riesgo | Dónde | Mitigación |
|---|---|---|
| Un rol real no ve la opción de llevar el mapa (H-R) | B3 | Fase 0.1 antes de abrir B |
| La versión nueva queda sin trazabilidad o sin extensión si falla un paso posterior a la creación (no atómico) | B2 | Informar el fallo, operación de recuperación idempotente, no reintentar la creación (crea v3) |
| Escalada de permisos entre `competencyalignment:create` y `competencynode:adopt` | B1 | Exigir ambas en servidor, probar con roles de un solo permiso |
| Un segundo override de `createInstance` borra el de cd | B1, B2 | Mutations nuevas con sufijo `Validated`; `graphql-schemas.test.ts:57-62` lo detecta |
| Tests que fijan comportamiento viejo se aflojan para "pasar" | A2, B5 | Cambiar solo con aprobación y donde afirman lo viejo |
| Líneas citadas desplazadas por merges | Todas | Relectura en Fase 0.6 |
| Réplica ambigua por asignatura repetida en un plan | B1 | Informar como `skipped` con motivo; priorizar `sourceEntryId` |
| Informe invisible por clave con guion bajo | B4, B5 | Campos sin `_` inicial |
| Adopción `Explicit` huérfana del reconciliador | B1 | Aceptado en D19; documentar para quien administra adopciones |

## 10. Criterios de cierre

- **Por ticket.** Estándar DoR y DoD del equipo, más: evidencia de ejecución, RBAC efectivo con roles no Admin, paridad pantalla y MCP, contratos MCP sincronizados, documentación del mod, sin artefactos de sync ni seeds commiteados.
- **A.** Indicadores con denominador declarado en las dos vistas y por MCP; tarjeta de fuera de diseño solo con filas afectadas; indicador especializado según base de logro.
- **B.** Versionar con y sin llevar el mapa; versión nueva sin tributación por defecto; réplica idempotente con informe de filas sin destino; versionado del plan sin tributaciones y clon sin regresión; el plan de origen intacto (ni matriz ni tributaciones modificadas).

## 11. Referencias

**Documentos del KB (sprint 12):** [[UPONE-1771-detalle]] (contrato y criterios), [[UPONE-1771-pre-intake]] (hipótesis y enfoques), [[UPONE-1771-registro-de-decisiones]] (D1 a D20), [[UPONE-1771-estado-por-usos]], [[UPONE-1771-pendientes-y-evidencia]] (qué queda abierto y evidencia).
**Documentos del KB (sprint 10):** `sp10/UPONE-1756-detalle-po.md` (reglas de la tributación, indicadores, §9 y §10), `sp10/UPONE-1756-followup-delta.md`, `sp10/maqueta-diseno-curricular.html` (maqueta v17), `sp10/UPONE-1769-rescope-tras-1756.md`.
**Tickets cerrados de contexto:** UPONE-1450 (versionamiento de plan), UPONE-1270 (clonar y versionar), UPONE-1756, UPONE-1769, UPONE-1770, UPONE-1758 (arquitectura MCP de cm), UPONE-2003 (copia sin `internalId`).
**Código principal:** cd `logic/sectionValidation.resolver.js`, `logic/curriculum-create.resolver.js`, `objects/Curriculum.json`, `objects/planEntry.json`, `config/layouts/default_Curriculum_list.json`, `ai/{index,tools}.js`; cm `logic/alignmentView.resolver.js`, `logic/competencyAlignment-batch.resolver.js`, `logic/competencyAlignment-bulkApply.resolver.js`, `logic/matrixAdoption.resolver.js`, `logic/helpers/alignmentRules.js`, `modsComponents/CompetencyAlignmentGrid/*`, `objects/{CompetencyAlignment,MatrixAdoption,CompetencyNodeDevelopmentLevel}.json`, `ai/{index,tools}.js`; om `src/graphql/resolvers/instance.resolver.js`, `helpers/version-from-source.js`, `helpers/deep-clone-direct.js`; ly `src/layouts/RecordList/RecordList.vue`, `src/composables/useCreateRowAction.ts`; mcp `src/tools/register-declarative-tools.js`, `src/auth/sessionTokenAuth.js`.

## 12. Vigencia

Los números de línea caducan con cada merge a `develop`; re-verificar en la Fase 0.6. Los esfuerzos son orientativos, en Story Points. Dependen de otros equipos los roles institucionales (plataforma, base de datos) y el texto de Jira (PO). Sin secretos ni datos sensibles en este documento.
