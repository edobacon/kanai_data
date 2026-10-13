---
id: DOC-kb-sp12-UPONE-1771-pendientes-y-evidencia
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
  - decisiones
  - patrones
  - evidencia
---

# UPONE-1771 · Qué queda abierto, cómo preguntarlo y evidencia de respaldo

> Documento de estudio y consulta sobre UPONE-1771 (Tributación: indicadores y versionado del plan). Verificado el 2026-10-13 contra `origin/develop` (curriculum-design `6e2988f`, curriculum-mapping `a456b14`, object-manager `ba5a9bf5`, layout `30da981c`, mcp `b6185e9`), contra los documentos del sprint 10 al 12 del KB, contra Confluence y contra Jira. Hermanos: [[UPONE-1771-detalle]], [[UPONE-1771-pre-intake]], [[UPONE-1771-registro-de-decisiones]], [[UPONE-1771-estado-por-usos]].

**Cómo leerlo.** Las secciones 1 y 2 alcanzan para saber qué falta y qué preguntar. Las secciones 3 a 6 son material de respaldo para consultar cuando haga falta.

**Leyenda de procedencia:** [código] verificado hoy en `origin/develop` · [KB] dicho en un documento del KB, no re-verificado hoy · [en vivo] probado el 2026-10-06 en el tenant de desarrollo con usuario Admin · [inferencia] deducción sin respaldo directo · [no confirmado] se intentó y no se pudo comprobar. Rutas relativas al repo del mod (cm = curriculum-mapping, cd = curriculum-design, om = object-manager, ly = layout).

## 1. Resumen

**En una frase:** de todo lo que figuraba como pendiente, solo una decisión de producto sigue abierta (D8), con una confirmación breve asociada. El resto son avisos al PO, verificaciones del dev o diseño que se resuelve dentro del intake.

| Qué | Cuántos | Dónde |
|---|---|---|
| Decisiones ya tomadas | 12 (D1 a D5, D7 a D10, D12, D13, D19 y D20) | Sección 3 |
| **Preguntas abiertas al PO** | **2** (D8 y la convivencia de dos indicadores) | **Sección 2.1** |
| Avisos al PO (no son preguntas) | 3 | Sección 2.2 |
| Verificaciones del dev antes del intake | 5 | Sección 2.3 |
| Diseño que se resuelve dentro del intake | 6 | Sección 2.4 |

**Qué dicen Confluence y Jira.** [no hay respaldo] Las páginas de Confluence que tocan el tema (espacio uP1: "Curriculum Mapping" y "Matriz de capacidades") son documentación AS-IS generada desde el repo y no contienen decisiones sobre 1771. UPONE-1771 en Jira no tiene comentarios ni adjuntos. Las fuentes útiles son los documentos del PO del sprint 10 en el KB y la documentación de los mods.

## 2. Qué queda abierto

### 2.1 Preguntas al PO

#### Pregunta 1 · Nivel representativo sin marcar (D8)

**Contexto en una frase.** Un indicador nuevo debe decir cuántas competencias tienen quien evalúe en su "nivel representativo", pero hoy ese nivel no está marcado en ninguna competencia.

**Qué sabemos.**
- [KB] El detalle del PO del sprint 10 (`sp10/UPONE-1756-detalle-po.md:118`) dice que, cuando la matriz define el logro por nivel representativo, exactamente uno de los niveles declarados lleva la marca. El mismo documento (`:302`) dice que el indicador "pasa a ser" el especializado. El documento de migración deja el marcado para "cuando ese eje se consuma, no al migrar".
- [código] Esa marca existe en el modelo pero ninguna pantalla ni resolver la escribe, y la regla "exactamente uno" nunca se implementó. [en vivo] En el tenant de desarrollo, 36 de 36 niveles de competencias están sin valor.
- [código] Hoy la grilla y el simulador usan el **último nivel** como si fuera el representativo: el aviso "Falta evaluador en {nivel}" (cm `modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridTable.ts:373-398`, texto en `lang/es/competencyAlignmentGrid.i18n.json:41`) y el simulador de consolidación (`modsComponents/ConsolidationBlock/trace.ts:110,137`).

**Opciones para el comportamiento mientras nadie marque niveles.**

| | Qué muestra el indicador especializado | A favor | En contra |
|---|---|---|---|
| **A** (recomendada, es la de la maqueta) | Cuenta una competencia como "con evaluador" si tiene cualquier evaluador. Con un solo nivel declarado la marca no interviene | Coherente con que el nivel sea una marca explícita; no decide por la institución cuál nivel resume a la competencia | Hasta que alguien marque niveles, el indicador especializado muestra lo mismo que el normal |
| **B** | Usa el último nivel como respaldo | Coincide con lo que hoy hacen la grilla y el simulador | Asume que el último nivel es el representativo, que es justo lo que el modelo quiere que sea una marca |

**Redacción sugerida para el PO** (sin nombres técnicos):

> Para el indicador "con evaluador en el nivel representativo" necesitamos saber qué hacer mientras ninguna competencia tenga su nivel representativo marcado, que hoy es el caso de todas. Hay dos caminos:
> A) Mientras no haya marca, el indicador cuenta una competencia como "con evaluador" si tiene cualquier evaluador. Es lo que dibuja tu maqueta.
> B) Mientras no haya marca, se toma el último nivel como si fuera el representativo. Es lo que hoy hace el aviso "Falta evaluador en {nivel}" de la grilla.
> Nuestra recomendación es A. ¿La confirmas?
> Tres preguntas relacionadas: ¿quién marca el nivel representativo y en qué ticket? ¿Se valida que sea exactamente uno por competencia, como dice tu detalle? ¿Alineamos después la grilla y el simulador para que usen la marca en vez del último nivel?

**Consecuencia de no responder.** El ticket A (indicadores) puede abrirse igual con la opción A como degradado definido; solo el texto final del indicador especializado queda sujeto a la respuesta.

#### Pregunta 2 · Convivencia de dos indicadores de evaluador

**Contexto en una frase.** El texto de Jira y la maqueta se contradicen sobre si "con evaluador en el nivel representativo" reemplaza a "competencias con evaluador" o se muestra junto a él.

**Qué sabemos.** [KB] D10 ya dice que la maqueta manda sobre Jira, y la maqueta muestra ambos indicadores en el componente de tributación (`sp10/maqueta-diseno-curricular.html:1348`). El detalle del PO (`UPONE-1756-detalle-po.md:302`) usa el verbo "pasa a ser".

**Redacción sugerida:**

> En el componente de tributación, cuando la matriz define el logro por nivel representativo, ¿se muestran los dos indicadores (el normal y el especializado) o el especializado reemplaza al normal? Entendemos que la maqueta muestra ambos y planeamos seguirla.

**Respuesta esperada y su efecto.** Si ambos, el componente lleva cinco indicadores (los de D10). Si reemplaza, lleva cuatro y el indicador normal solo se ve con la base "Aggregation".

### 2.2 Avisos al PO (no son preguntas)

| Aviso | Qué decir | Respaldo |
|---|---|---|
| Versionado | La opción F invierte el default de su maqueta de versionado: la versión nueva nace sin tributación y replicar el mapa es opcional. Motivo: nadie debe escribir tributación sin permiso propio. La maqueta tampoco dibuja el modal ni el informe de filas sin destino | D3 decidida por el dev [KB] |
| Criterios de aceptación de Jira | Dos frases quedaron superadas: "sin ese permiso, se replica por defecto" y "los cuatro indicadores en ambas vistas" (la lectura lleva tres y el componente cinco, D10) | [KB]; Jira sin cambios al 2026-10-13 |
| Texto del aviso del modal | D20 ya está decidida (texto informativo en el modal de versionado que avisa que la versión nueva nace sin tributación aunque la anterior sí la tenía; no bloquea). Falta que el PO revise la redacción | [KB] |

### 2.3 Verificaciones del dev antes del intake

| # | Verificación | Estado |
|---|---|---|
| V-1 | **H-R, riesgo principal.** Un usuario que no sea Admin (por ejemplo un Diseñador y un Revisor) ve en cd las capabilities de cm. Si no, la opción de llevar el mapa nunca aparece | [código] El mecanismo no tiene barrera por mod (`om/src/services/auth/modRoleCapabilities.js:105-150`, `authChecker.js:286-376`). [no confirmado] El mapeo real de roles a perfiles: en el repo solo está el de Admin y Consultor hacia Diseñador Autoridad (cm `config/app.json:29-31`, cd `config/app.json:47-49`); el resto vive en la base (`up1_suite_app_role.modRoleId`) |
| V-2 | La FK de `planEntry.sourceEntryId` en la base es ON DELETE SET NULL | [código] Prisma sin acción explícita (`om/prisma/BASEMODEL/schema.prisma:1594-1597`, default SetNull). [no confirmado] En la base real: `\d "planEntry"` en un tenant |
| V-3 | El repo mcp no consume `sourceEntryId` | [código] cm tiene cero referencias. [no confirmado] mcp no se revisó |
| V-4 | Una versión nueva nace en Draft y R-PL deja escribir tributaciones | [inferencia]. R-PL admite Draft, InReview y Approved (cm `logic/helpers/alignmentRules.js:253,297-313`); la versión nueva nace en Draft |
| V-5 | Retirar el worktree `mods/.nits-v2-wt` y sus dos carpetas generadas, y repetir el sync del MCP | Pendiente |

### 2.4 Diseño que se resuelve dentro del intake

**N-1 · Cómo invoca cd la réplica de cm (mecanismo de D4).**
- Decisión vigente: la lógica de réplica vive en cm y cd la invoca desde la mutation del modal.
- [código] No hay precedente de escritura cd a cm. Solo hay lectura cd a cm (Prisma directo con `evaluateObjectPermission`). Ningún mod invoca el resolver gobernado de otro (barrido de `logic/` de seis mods; no exhaustivo). Las mutations de todos los mods se mezclan en una sola tabla (`om/src/graphql/resolverIndex.js:40-53`) y cm es dueño de las `*Validated`. [no confirmado] Que cd pueda ejecutar el resolver de cm en el mismo proceso.

| | A. Dos pasos desde el modal | B. cd importa y llama a cm | C. Hook post-versión en core |
|---|---|---|---|
| Cómo funciona | La mutation de cd versiona y devuelve el id; luego el cliente llama a la mutation de réplica de cm, la misma "replicar desde la versión anterior" ya decidida como recuperación | cd carga el resolver de cm con import dual-path, como `logic/helpers/authCheckerLoader.js:31-34` hace con un archivo de core | Core corre un gancho después de crear |
| Una sola fuente de la regla | Sí | Sí | Sí |
| Acoplamiento entre mods | Ninguno | Alto | Ninguno |
| Precedente en up1 | Parcial | Ninguno entre mods | Ninguno (core solo tiene `beforeCreate` y `beforeUpdate`, `om/src/services/objectHooks.js:46-49`) |
| Atomicidad con el versionado | No | No | Sí, si corre dentro de la transacción |
| Requiere Core Extension | No | No | Sí |
| Reversibilidad | Alta | Media | Baja |

Recomendación: A, salvo que plataforma confirme un mecanismo cross-mod. La descartada es escribir por Prisma directo desde cd (salta R-PL, R-1 a R-6, historial y eventos). Decide el dev.

**N-2 · Dónde se muestra el informe de filas sin destino.**
- [código] `revealField` de `customEndpoint` muestra un valor de un solo uso (`ly/src/layouts/RecordDetail/RecordDetail.vue:5480-5494`): no sirve para un informe estructurado. El aviso tras crear versión solo lee el número de versión (`ly/src/composables/useCreateRowAction.ts:126-138`).
- [código] Patrón existente: las mutations de cm devuelven `warnings: [{code, params, message}]` (`cm logic/helpers/personalisedError.js:74-81`) y bulkApply devuelve `skipped` por motivo.
- Restricción del MCP: la capa elimina claves que empiezan con `_` (`mcp/src/tools/register-declarative-tools.js:26-37`), de modo que el informe debe viajar en un campo normal.
- [no confirmado] Si el modal puede renderizar una lista estructurada. Propuesta: devolver el informe como `skipped` y mostrar el resumen en el modal.

**D6 · Reintento e idempotencia.** [código] Reintentar crear la versión no repara: crea una v3 (`om/.../helpers/version-from-source.js:103-120`). La réplica debe ser una operación aparte e idempotente; el molde es bulkApply (sección 5).

**D11 · Canal MCP del versionado.** Ficha de versionado en cd con retorno tipado sobre la misma mutation de la pantalla, e informe en campo normal.

**D14 · Deriva de `origin/develop`.** Releer antes de implementar; las líneas del KB estaban desplazadas tras UPONE-2048 y UPONE-1902.

**D16 · Escritura genérica sobre plan publicado.** Fuera de alcance. [código] `cm tests/unit/competencyAlignmentParity.test.js:383` documenta el hueco.

**D17 y D18.** Citar siempre las reglas con su objeto (las R-1 a R-5 colisionan entre escala de desempeño, tributación y UPONE-1753). El texto final de la guía MCP `cm_alignment_view` (cm `ai/tools.js:444-450`) se define al abrir la ficha de recuperación.

## 3. Ya decidido

**En una frase:** lo que sigue está cerrado y no hay que volver a preguntarlo, salvo D8 que ya tiene su pregunta en 2.1.

| # | Decisión | Fecha |
|---|---|---|
| D1 | Solo mod, sin Core Extension. La elección se hace en un modal propio de cd (acción de crear con modal pre-llenado hacia un layout propio, cuyo `customEndpoint` llama a una mutation de cd) | 2026-10-07 |
| D2 | Un ticket de Jira, dos de Kanai: A indicadores y B versionado | 2026-10-07 |
| D3 | **Opción F.** La versión nueva nace sin tributación. Quien tiene `competencyalignment:create` y `competencynode:adopt` puede optar por llevar el mapa; sin esos permisos no ve la opción. Nadie escribe tributación sin permiso propio. Se mantiene "replicar desde la versión anterior" | 2026-10-07 |
| D4 | La lógica de réplica vive en cm. cd la invoca desde su servidor y la recuperación la usan la pantalla y una ficha MCP (el mecanismo está en 2.4, N-1) | 2026-10-07 |
| D5 | El permiso que gobierna la elección es `competencyalignment:create`, más `competencynode:adopt` en servidor | 2026-10-06 |
| D7 | Poblar `planEntry.sourceEntryId` al versionar, con respaldo por asignatura (plan más asignatura) | 2026-10-07 |
| D9 | "Fuera de diseño" son dos casos: fila en un nivel que la competencia no declara (solo si declara al menos uno) y fila colgada de un nodo que consolida. Se muestran marcadas, no se borran y no entran al cálculo | 2026-10-08 |
| D10 | La maqueta manda: la lectura del plan lleva tres indicadores (todas las matrices adoptadas) y el componente de tributación cinco (solo la matriz elegida) | 2026-10-08 |
| D12 | La réplica adopta las mismas matrices en la versión nueva; solo adopciones vigentes | 2026-10-06 |
| D13 | La réplica por MCP escribe tributación, atribuida y auditada a nombre de quien versiona | 2026-10-06 |
| D19 | En la recuperación se adopta solo si falta la adopción. La adopción nace `Explicit` | 2026-10-07 |
| D20 | Aviso por texto informativo en el modal de versionado, sin bloqueo y sin regla nueva al publicar | 2026-10-09 |
| D8 | Opción A de la maqueta, **pendiente de confirmación del PO** (2.1) | 2026-10-08 |

**Consistencia de D3 con los perfiles.** [código] La opción la ven el Diseñador (`competencyalignment: [create, modify]`, `competencynode: [create, modify, adopt]`) y el Diseñador Autoridad, no la Autoridad sola (solo tiene `delete` sobre tributación). Exigir ambas capabilities es necesario: sin `adopt`, una réplica que adopte matrices permitiría adoptar por la puerta de atrás a quien solo tiene `create`.

## 4. Contexto: qué existe hoy

**En una frase:** versionar clona la malla y deja atrás el mapa de tributación; adopción, historial y permisos viven en cm y no se copian.

**Linaje.** UPONE-1756 (CRUD por competencia), 1769 (cableado del modelo) y 1770 (pesos, malla, vía masiva) están cerradas. 1771 es el cuarto ticket; 1772 y 1773 siguen en backlog. Sobre versionado ya existen UPONE-1450 (versionamiento de plan), UPONE-1270 (clonar y versionar Curriculum) y UPONE-2003 (la copia ya no copia `internalId`), todos cerrados. 1771 solo agrega encima la decisión sobre la tributación.

**Glosario.** *Tributación*: fila que dice que una asignatura aporta a una competencia en un nivel de desarrollo, con tipo de contribución y un peso en texto decimal. *Adopción de matriz*: declaración de que un plan usa una matriz; la regla R-1 de CompetencyAlignment exige adopción vigente para escribir tributaciones. *planEntry*: una asignatura dentro de la malla de un plan; versionar crea planEntry nuevos con ids nuevos. *Nivel representativo*: nivel marcado por competencia como el que determina su logro cuando la matriz usa `achievementBasis = RepresentativeLevel`.

| Hecho | Ruta [código] |
|---|---|
| El hook `inheritRecordTypeExtensionOnVersion` corre después de crear, fuera de la transacción del core; si falla solo hace `console.error` y la versión nueva queda sin extensión | cd `logic/sectionValidation.resolver.js:299-312` (hook), `:338` (invocación), `:318-341` (override); transacción en `om/src/graphql/resolvers/instance.resolver.js:5212-5222` |
| El hook recibe `result` pero no usa `cloneMap`; el core lo devuelve como `cloneMap` y como `data._cloneMap`, con forma `{ "<oldId>": { newId, type } }` | `instance.resolver.js:5187,5198,5201`; `om/.../helpers/deep-clone-polymorphic.js:413` |
| Para el mapa viejo a nuevo de planEntry basta filtrar `type === 'planEntry'` | `om/.../helpers/deep-clone-direct.js:159,392-395` |
| El core borra `asNewVersion` y `prefillFrom` de los datos; por eso el override los captura antes de delegar | `instance.resolver.js:4338-4346`; cd `sectionValidation.resolver.js:321-325` |
| Gate de versionado: `curriculum:version` y origen Aprobado o Activo; versionar no exige `curriculum:clone` | cd `objects/Curriculum.json:53-60`; `instance.resolver.js:4376,4396-4412`; `version-from-source.js:89-101` |
| `MatrixAdoption` y `CompetencyAlignment` no se clonan: no están entre los hijos y sus ids hacia el plan no son FK | cd `objects/Curriculum.json:28-39,50-51`; cm `objects/MatrixAdoption.json:23`, `CompetencyAlignment.json:40-46` |
| `internalId` se excluye de las copias (UPONE-2003) | `om/.../helpers/db-managed-fields.js:21` |
| La acción "Crear nueva versión" es una acción `create` directa, sin modal ni parámetros extra | cd `config/layouts/default_Curriculum_list.json:19-30`; `ly/src/composables/useCreateRowAction.ts:76-85,103-116` |
| La lectura de la vista de tributación no exige adopción y devuelve `planEditable` | cm `logic/alignmentView.resolver.js:192,203-206,299` |
| La vista descarta filas de competencias que no están en el árbol de la matriz (`continue`), sin distinguir otra matriz adoptada de una huérfana | `alignmentView.resolver.js:259-277` |
| La escritura de tributaciones por MCP está cerrada a propósito: `CompetencyAlignment` está en `governedObjects` | cm `ai/index.js:285-301` |

**`planEntry.sourceEntryId` (D7).**
- Definición: string opcional con FK a sí mismo, "trazabilidad de clon" (cd `objects/planEntry.json:79-87`). El clon lo excluye a propósito (`Curriculum.json:49`, commit `b467313` de UPONE-1450-S5); el motivo no está documentado y se infiere que era no heredar la trazabilidad del origen.
- Lo escribe solo la lista blanca de `createPlanEntriesBatch` (cd `logic/planEntry-batch.resolver.js:57`). Lo lee nadie en lógica.
- Borrado: el planner de impacto no lo ve como restricción (`om/.../helpers/deleteImpactPlan.js:712-770`), y un plan con sucesor no se puede borrar por la cadena de versiones (`:657-676`). La única FK con `onDelete: Restrict` es `planEntry.categoryId` (`planEntry.json:45`).
- DataLog: Curriculum lo tiene activo, planEntry no; los lotes lo registran a mano (`cd logic/planEntryDataLog.js:1-30`). Poblar el campo aparecería, como mucho, como una columna más del snapshot de creación.
- Conclusión: riesgo bajo en borrado, sujeto a V-2 y V-3. Sin este campo, el mapa viejo a nuevo existe solo en la respuesta de crear; con él, la réplica posterior puede resolver el equivalente. [código] No hay unicidad `(plan, asignatura)`, de modo que el respaldo por asignatura puede ser ambiguo.

## 5. Evidencia del modelo y de las reglas

**Modelo.**
- `CompetencyAlignment` (cm `objects/CompetencyAlignment.json`): `planId` denormalizado, derivado de `planEntry.planId` al escribir (l.40-46); `sourceId` polimórfico por `sourceType` (l.23-39); `developmentLevelId` opcional (l.62-70); `contributionPercentage` como texto decimal normalizado a [0,100] con dos decimales (`logic/helpers/validateCompetencyAlignment.js:70-87`; se copia tal cual); unicidad `[sourceType, sourceId, competencyNodeId]` (l.18-20); sin `internalId`.
- `MatrixAdoption` (cm `objects/MatrixAdoption.json`): `origin` es `ScopeRule` o `Explicit` (default `Explicit`); `status` es `Adopted` o `Exempt`; vigente significa `effectiveTo` vacío; el historial se escribe a mano (`logic/helpers/matrixAdoptionHistory.js`). La adopción manual siempre nace `Explicit` (`logic/matrixAdoption.resolver.js:210,254`); `ScopeRule` solo lo escribe el reconciliador (`:708`).
- `isRepresentative` (cm `objects/CompetencyNodeDevelopmentLevel.json:33-38`): booleano nullable sin default. **Único lector real: cd** (`logic/helpers/activityCompetencies.js:285,306`). El simulador de cm (`trace.ts:158`) calcula por posición y no lee el dato. **Escritor: ninguno**, salvo el CRUD genérico. Esto corrige lo que decía el registro de decisiones, que daba lectores en cd y cm.
- `achievementBasis` (cm `objects/RecordTypes/rt__Matrix__competencynode.json:92-100`): `Aggregation` (default) o `RepresentativeLevel`.

**Reglas gobernadas** (citadas siempre con su objeto):
- CompetencyAlignment: R-1 adopción vigente (`logic/helpers/alignmentRules.js:219-241`), R-2 par único (`:326`), R-3 destino válido (`:159-171`), R-4 nivel declarado (`:184-201`), R-5 `contributionType` (`:59`), R-6 peso por fila (`validateCompetencyAlignment.js:118-142`), R-PL plan editable (`alignmentRules.js:253,297-313`; Active, Deprecated y Archived congelan, falla cerrado), M-37 no borrar competencia tributada (`:362-377`).
- Punto de entrada de conjunto `upsertCompetencyAlignmentSetEntrypoint` (cm `logic/competencyAlignment-batch.resolver.js:503-551`): tope de 500 filas por llamada (`:81,520-524`), permiso en dos pasos, historial una entrada por conjunto. Es **reemplazo**, no aditivo.
- **Mejor molde de réplica: bulkApply** (`logic/competencyAlignment-bulkApply.resolver.js:1-34`). Siempre alta, transaccional y troceada; lo existente se saltea como `duplicate`; reporta por ítem `{planEntryId, reason}` con motivos `duplicate | outside-plan | outside-matrix | rule`; aborta todo si el plan no es editable, no hay adopción vigente o supera 500; exige `competencyalignment:create`. Complemento: `addMatrixAdoptions` (`matrixAdoption.resolver.js:201-262`) con `createMany` y `skipDuplicates`.
- Idempotencia: el lote clasifica antes de escribir; reenviar altas sin `id` de pares ya existentes se rechaza con `DUPLICATE_PAIR` y no duplica. P2002 no se captura: solo ocurriría en una carrera y tumbaría la transacción con el error crudo (precedente de captura en `matrixAdoption.resolver.js:258`).

**Evidencia en vivo** [en vivo] (tenant de desarrollo UPU, Admin vía MCP, 2026-10-06):

| Prueba | Resultado |
|---|---|
| Versionar por MCP con la creación genérica | Funciona: versión en borrador, 12 de 12 entradas, categoría remapeada, extensión del plan copiada, `sourceEntryId` nulo, sin adopción, sin informe |
| Crear tributación por MCP | Bloqueada por el MCP |
| Vista de contribución de la versión sin adopción | Se muestra completa y `planEditable: true` |
| Plan activo | `planEditable: false` |
| No probado | Réplica con tributaciones reales, rol sin permiso de cm, grilla de la UI con versión sin adopción |

Datos creados por la prueba (tenant de desarrollo, no se borran): plan `SMOKE-2003-CLON` versión 2 en borrador, sin tributaciones.

**Hipótesis del pre-intake, estado actual.**

| # | Hipótesis | Estado |
|---|---|---|
| H0 | cd lee en servidor el permiso de cm | Confirmada [código]; precedente de lectura en `cd logic/helpers/activityCompetencies.js:35-41,188-213` con test `tests/unit/activityCompetencies.test.js:224-276`. Sin precedente de escritura |
| H1 | El mapa viejo a nuevo incluye todas las entradas y el hook puede usarlo | Confirmada [código]; el hook hoy no lo usa |
| H2 | Sin choques de unicidad al replicar | Parcial: la primera réplica no choca; el reintento de altas sin `id` se rechaza con `DUPLICATE_PAIR` |
| H3 | La elección viaja sin llegar a Prisma | Parcial. [código] El override de cd no borra claves propias; el core solo borra `asNewVersion` y `prefillFrom`. [KB] En vivo una clave desconocida llegó a Prisma y falló; [no confirmado] hoy en código. Con la mutation propia de D1 la clave no necesita pasar por `createInstance` |
| H4 | Existe un nivel representativo único | Refutada [código] |
| H5 | El front muestra un informe tras crear | No [código] |
| H-R | Rol no Admin con capabilities de cm en cd | Abierto: ver V-1 |
| H-A a H-E | Adopción previa, tope de 500, idempotencia, grilla sin adopción, nivel representativo | H-A y H-C respaldadas por el código; H-B, H-D y H-E por validar |

**Indicadores (parte A), respuestas del código.**
- Existen tres tarjetas en el cliente; la cuarta (fuera de diseño) está excluida a propósito (cm `modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridCoverageSummary.ts:1-4,208`).
- **Total de competencias:** `competencies.length` incluye nodos que consolidan (`:83,91`); la maqueta cuenta solo hojas medibles. Como D10 dice que manda la maqueta, hay que alinear el cálculo.
- **Sí se pueden agregar hijas a una hoja ya tributada:** `logic/competencyTree-upsert.resolver.js` solo usa `assertNodesNotAligned` al borrar (`:57,920-922`). La hoja pasa a consolidar, R-3 de CompetencyAlignment la declara inválida y las filas previas persisten como fuera de diseño; el guardado en lote no revalida filas sin cambios (`batch.resolver.js:283-285,325-327`). Esto hace alcanzable el caso 2 de D9. [no confirmado] En vivo.
- Desmarcar un nivel declarado deja las filas de ese nivel vivas y fuera del cálculo (M-28, cm `CLAUDE.md:184`); borrar una competencia tributada se rechaza (M-37, `:194`).
- Por MCP: la lectura (`cm_alignment_view`, `cm_list_alignments`) devuelve datos crudos, sin indicadores, sin `achievementBasis` ni `isRepresentative` (`cm ai/tools.js:416-476`).
- Tests que fijan comportamiento a cambiar (solo con aprobación y donde afirman lo viejo): `tests/component/competency-alignment-grid.coverage-summary.component.spec.ts:50-61` (exige tres tarjetas), `tests/unit/competencyAlignmentGridLang.test.js:223-225`, `tests/unit/aiPack.test.js:1156-1191,1280-1299,743-762` (guía "versionar en UP1", `WITHOUT_WRITE_TOOL`).

## 6. Patrones que up1 y los mods ya tienen

| Patrón | Fuente | Aplicabilidad |
|---|---|---|
| Ficha MCP declarativa: dato con `operation`, `field`, `requiresCapability`, `writePattern: "preview-confirm"`, `resultPath`; el permiso real lo exige el resolver | cd `ai/tools.js:1-16,34-69`; `mcp/src/tools/register-declarative-tools.js:5-16,172-175,228`; `mods/.ai/COMMANDMENTS.md:36` | A favor: la ficha de versionado y la de recuperación encajan tal cual |
| Mutation propia `*Validated`, nunca CRUD con forma de genérico | cd `docs/patterns/validated-vs-crud.md`; cm `tests/integration/graphql-schemas.test.ts:35-43` | A favor |
| Un solo resolver por regla; paridad pantalla y MCP por test que llama al mismo resolver con contextos distintos | cm `tests/unit/competencyAlignmentParity.test.js:1-12,178-180,255-257` | A favor: la réplica debe ser una mutation que usen pantalla y MCP |
| Duplicar una regla entre front y servidor con test de paridad | cd `tests/unit/weightedSum.parity.test.ts:1-14`; `docs/patterns/weighted-sum.md:23,28` | A favor si el cálculo de indicadores se duplica |
| Resolver en servidor con una sola fuente | cd `docs/patterns/resolver-override.md` | A favor para indicadores (resolver de lectura) |
| Lectura cd a cm con `evaluateObjectPermission`, Prisma directo, no-op si el tenant no tiene cm | cd `logic/helpers/activityCompetencies.js:31-46,117-135,188-213`; `curriculumAlignmentWeights.js:130` | A favor para leer permisos y datos de cm desde cd |
| Informe tras mutation: `warnings` o `skipped` por motivo | cm `logic/helpers/personalisedError.js:74-81`; bulkApply | A favor (N-2) |
| Modal con layout propio: acción `modal` con `targetLayoutId` y `customEndpoint` hacia una mutation | up1-manager `config/layouts/core_user_admin_list.json:70-112` y `core_user_activate_confirm.json:13-49`; cd `default_Curriculum_create.json:14-18`, `default_Activity_view.json:585-625` | Viable sin core; precedente exacto en otro mod, no en cd ni cm. [no confirmado] Si el modal admite radios o selects y `initialDataMapping` |
| Acción `mutation` sin entrada del usuario | `ly/src/layouts/RecordList/RecordList.vue:3635-3658`; cm `default_DevelopmentLevel_list.json:73-100` | Insuficiente para elegir; sí para la recuperación |
| `prefilledModal` con `deepClone` | `RecordList.vue:3660-3752`; no inyecta `asNewVersion` | Parcial: `asNewVersion` iría en `initialData` o dentro de la mutation |
| Mutation nueva que "no colisiona" | cd `logic/curriculum-create.resolver.js:19` | A favor: molde para la mutation del modal |
| Un solo override de creación por mod; el segundo colisiona | cd `sectionValidation.resolver.js:6,34-40`; cm `CLAUDE.md:49-52,246` (UPONE-1758 retiró un guard por esto) | **Evitar** cualquier override de `createInstance` en cm |
| RBAC en tres capas verificado en CI: capability declarada y no usada rompe el build | `mods/.ai/COMMANDMENTS.md:34` | Si se agrega capability, usarla en resolver y acción |
| Tenant: siempre `context.prisma`; sync y `ai/` solo se editan en el mod; commits con `UPONE-1771` al inicio | `CLAUDE.md` raíz `:109-114,317`; `COMMANDMENTS.md:39`; cm `docs/pre-push-hook.md` | Aplica |

**Qué evitar según el código.**
- Reemplazo de conjunto (`upsertCompetencyAlignmentSetValidated`) como recuperación: puede pisar ajustes manuales.
- `revealField` para el informe.
- Escribir tablas de cm con Prisma directo desde cd.
- Abrir una ficha de escritura sin mover `CompetencyAlignment` de `governedObjects` a contrato y actualizar los textos que lo dicen: cm `ai/index.js:245,297-301,313,359`, `ai/tools.js:444-450` y los tests que los fijan.

## 7. Esfuerzo, alcance y vigencia

- **Esfuerzo (orientativo, en Story Points):** indicadores con ficha MCP, 5 SP; versionado con réplica, adopción, modal, informe e idempotencia, 8 SP o más, sin contar un posible Core Extension. Con el alcance MCP el conjunto supera los 10 SP del PO, motivo de la partición en A y B (D2).
- **Orden sugerido:** (1) enviar al PO las preguntas de 2.1 y los avisos de 2.2; (2) correr V-1 a V-5 antes del intake de B; (3) abrir A de inmediato, con D8 en la opción A como degradado definido; (4) abrir B cuando el PO acepte el aviso sobre F.
- **Fuera de alcance:** abrir en general la escritura de tributaciones por MCP; pesos; retiro con aviso; migración de niveles; versionar la matriz; guard de suma al publicar.
- **Vigencia:** los números de línea caducan con cada merge a `develop`; re-verificar antes del intake. Dependen de otros equipos los roles institucionales (plataforma) y el texto de Jira (PO).
- Sin secretos ni datos sensibles en este documento.
