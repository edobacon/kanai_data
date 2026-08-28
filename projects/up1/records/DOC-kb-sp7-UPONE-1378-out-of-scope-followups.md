---
id: DOC-kb-sp7-UPONE-1378-out-of-scope-followups
project: up1
type: doc
---

# UPONE-1378 · Requisitos de asignatura — items fuera de alcance (follow-up)

> Documento de seguimiento local (no Jira). Registra, con contexto, lo que el ticket
> **UPONE-1378 / TICKET-101** deja **explicitamente fuera de alcance**, para retomarlo despues
> sin perder el rastro. Origen: gate de pre-aprobacion del spec (DET-38, dual-judge, 2026-07-27),
> que superficio estas propagaciones (DET-16). Ninguno bloquea el request de UPONE-1378
> (editar prerrequisitos/correquisitos como arbol Y/O + alerta de planes afectados + definir
> condiciones de la malla sin depender de seeds).

## Contexto del ticket

UPONE-1378 entrega el editor de requisitos como seccion del Programa de asignatura + el contrato
con la malla. Como habilitador backend (BL-1), extiende `RT_PATTERN` de
`mods/curriculum-design/logic/polymorphicUpdate.resolver.js` para que el UPDATE de
`rt__*__requirement` rutee por `rtUpdateHandler` (hoy solo `curricularsection` ruteaba). Ese
movimiento de rama es la fuente del item §1.

> **Nota de validacion (2026-07-27).** Una version previa de este documento listaba **correquisitos**
> y **MetricThreshold** como fuera de alcance. La validacion contra los transcripts, la maqueta
> (`mockup-sp6.html` `mVPrereq`) y CAP-CUR-004 (Must) mostro que **ambos estan pedidos y la maqueta
> ya evalua el correquisito** ("mismo periodo permitido"). Por decision del dev **entraron al alcance**
> (REQ-14 corregido: la hoja respeta `timing` y se evalua `MetricThreshold(Credits)`). Por eso ya no
> figuran aca. Ver REQ-14 + DEC-LOCAL-04 (correccion 2026-07-27) del spec.

---

## 1. Gap de atribucion de DataLog en updates RT-projected de `requirement`

**Referencias KB:** BUG-curriculum-design-007, BUG-curriculum-design-009 (ambos `status: detected`,
`ticket: TICKET-102`, `spec: SPEC-curriculum-design-datalog-history-attribution`).

**Que pasa.** El path RT-projected (`rt__<RT>__<base>`, incl. `rtUpdateHandler`) arrastra dos gaps
de auditoria ya documentados para `curricularsection`:

- **BUG-009:** `isDataLogEnabled` resolvia el archivo del objeto por nombre canonico base y no por
  el alias RT (`business/RecordTypes/`). El fix descrito (`resolveBaseObjectType` normaliza alias a
  base + `recordMutationDataLog` reutilizable) figura como **Solucion: Pendiente**.
- **BUG-007:** `createInstance`/updates de objetos RT-projected NO exponen `ownerType`/`ownerId` al
  top-level del `result` GraphQL (quedan solo en la tabla de extension), asi que la atribucion
  polimorfica del DataLog queda con `metadata.ownerType/ownerId` en null.

**Impacto en UPONE-1378.** Al mover `requirement` a `rtUpdateHandler` (S1.T2), sus updates entran al
mismo path. `rtUpdateHandler` **ya llama `recordMutationDataLog` de forma explicita** (parche de
UPONE-1380, paso 9 del handler), asi que la entrada de DataLog se registra; pero la **atribucion**
(`ownerType`/`ownerId`) y la resolucion del alias siguen sujetas a BUG-007/009. En la practica, el
historial de una edicion de requisito podria quedar sin owner atribuido hasta que TICKET-102 cierre.

**Por que queda fuera.** La auditoria/DataLog no es parte del request de UPONE-1378. El guard MC-09
recableado (S1.T3) **no depende** de esto: resuelve el `ownerId` por `findUnique` sobre el id, no por
el top-level del result.

**Follow-up.** Al retomar TICKET-102 (attribution de DataLog), incluir `requirement` en la matriz de
verificacion: editar un requisito via UI y confirmar que la entrada de DataLog trae
`metadata.ownerType/ownerId` correctos. No testear solo con `objectType` base (los mocks ocultaban el
bug — ver BUG-007 "mock-gap").

---

## 2. Herencia MADS del silabo (Hereda / Agrega / Reemplaza)

**Referencia:** Open questions del spec.

**Que pasa.** El mockup SP6 insinua herencia MADS de los requisitos hacia el silabo. No esta en las
AC de Jira ni en las decisiones de alcance del dev. Default declarado: **out** (si entra, es un REQ
nuevo).

**Follow-up.** Confirmar in/out con producto. Si entra, disenar como los requisitos definidos en la
asignatura se propagan/override en el silabo (nuevo REQ + probablemente nuevo ticket).

---

## 3. Duplicacion intencional del guard de ciclos (mod backend + up1-mcp)

**Referencia:** DEC-LOCAL-03 del spec; `up1-mcp` `wouldFormRequirementCycle`.

**Que pasa.** REQ-13 porta el algoritmo BFS de deteccion de ciclos cruzados de `up1-mcp` al backend
del mod (`requirementCycleGuard.js`), porque la Suite no consume `up1-mcp`. Quedan **dos
implementaciones** del mismo algoritmo.

**Por que queda fuera.** Unificarlas en un paquete compartido acoplaria dos frentes de arquitectura
distintos (adaptador LLM vs backend de la Suite) sin necesidad inmediata.

**Follow-up.** Si una de las dos cambia (p. ej. el limite `MAX_GRAPH_NODES` o la semantica de que
cuenta como arista), reflejar el cambio en la otra. Considerar un test de contrato compartido que
alimente los mismos casos a ambas implementaciones.

---

## 4. Limitacion: el RecordList no muestra columnas COMPUTADAS ("Via" / "Condicion")

**Referencia:** DEC-LOCAL-05 del spec; `layout/src/composables/useColumnConfiguration.ts:176`
(filtra `initialColumns` contra `effectiveFields` = campos persistidos reales); decision de
arquitectura del dev 2026-07-28 (usar RecordList nativo).

**Que pasa.** La lista de requisitos usa el **RecordList nativo** de up1 (decision del dev: componentes
nativos, no una tabla custom). El RecordList **solo renderiza columnas mapeadas a campos reales
persistidos** del objeto (`requirement`): `recordType` (Clase), `label` (Requisito), `effect`
(Efecto), `isHardRule` (Exigencia). Las columnas **"Via"** y **"Condicion"** de la maqueta son
**derivadas/computadas** en cliente ("Via" = posicion en el arbol via `parentId` + `Group.combinator=OR`,
`deriveVias`; "Condicion" = campo especifico por familia RecordState/Group/MetricThreshold) y **no
existen como campo persistido**, por lo que el RecordList las **descarta** (no hay mecanismo de columna
computada; `useColumnConfiguration.ts:176`). Las columnas de familia solo se surface-arian filtrando
la lista a UN recordType, lo que romperia la vista unificada de las 3 familias.

**Por que queda como limitacion (no se resuelve aca).** Mostrar "Via"/"Condicion" en la lista exigiria
o bien (a) un componente de tabla custom (rechazado por el dev: aleja de los componentes nativos y del
sistema de diseno), o bien (b) persistir esos valores derivados como campos reales del objeto
(desnormalizacion + cambio de modelo + codegen/sync), o (c) un field resolver GraphQL (prohibido para
mods, RULE-curriculum-design-017). Ninguna se justifica para una columna informativa.

**Mitigacion en producto.** La **fidelidad completa del arbol Y/O + vias** (que es donde "Via"/"Condicion"
importan) vive en el modal **"Ver regla unificada"** (`ReglaUnificadaView`, arbol read-only), accesible
desde la toolbar. La lista da la vista tabular rapida (4 columnas base); el detalle estructural, el arbol.

**Follow-up (si el negocio lo pide).** Evaluar persistir un `viaIndex` (y/o una etiqueta de condicion)
como campo real de `requirement` para poder mostrarlos como columnas del RecordList sin tabla custom.
Implica cambio de modelo de datos (codegen + sync) + mantener el derivado en sync con el arbol.

**Sub-limitacion: sin row-action "Ver detalle" por fila (modal).** La maqueta tiene un menu por
fila (Ver/Editar/Eliminar) donde "Ver" abre un modal de detalle read-only (Clase/Via/Requisito/
Condicion/Exigencia). Con el RecordList NATIVO y mod-only esto NO es posible: (a) su accion "Ver"
nativa no resuelve el layout de detalle por `recordType` en una lista polimorfica —
`resolveDefaultLayout` (object-manager) documenta el parametro `recordType` en el schema
(`typeDefs/up1.js:117`) pero NO lo usa (`layout.resolver.js:442`), gap real; (b) no hay forma
declarativa de que una fila del RecordList dispare un modal de un componente custom del mod
(`RecordListElement.vue` no reenvia `row-click`; `rowAction type:modal` solo hace create; el JSON
no serializa handlers). Decision del dev (2026-07-28): quedarse con lo nativo y documentar. **El
detalle completo (Condicion, Via, estructura Y/O) queda accesible en el modal "Ver regla unificada"**
del launcher (arbol read-only). Follow-up (si el negocio pide el "Ver" por fila, requiere core):
A) implementar `recordType` en `resolveDefaultLayout` + layouts RT de view amigables (targetId como
FK, mustBe/timing como enums con label); B) mecanismo en `layout/` para disparar un modal custom
desde la fila (bus de eventos entre elementos hermanos del layout).

**Sub-caveat (grupos estructurales en la lista).** El modelo de vias persiste contenedores `Group`
(raiz `OR` "Cualquiera de las vias" + `Group AND` por via) ademas de las hojas. El RecordList nativo
listaria esos contenedores como filas (andamiaje, no condiciones del usuario). Se filtran con
`recordType NOT_EQUALS Group` en el layout, mostrando solo las hojas (RecordState/MetricThreshold).
**Cuando se habilite la familia Electivo (pool K-de-N, que es un `Group` de cara al usuario), ese
filtro la ocultaria** → al habilitar Electivo hay que distinguir el `Group` pool (condicion del
usuario, hijo de una via) de los `Group` estructurales (raiz OR + vias), p. ej. por un marcador o
por posicion en el arbol; hoy Electivo NO esta ofrecido (FAMILY_ORDER = Course+Metric), asi que el
filtro es correcto. Ver decision 2026-07-28 (arquitectura nativa).

> **Actualizacion 2026-07-29 (S11-S13, DEC-051).** El detour RecordList fue **revertido**: la seccion
> Requisitos es ahora UN mantenedor de arbol Y/O unico (custom, mod-only), no un RecordList. Por eso
> las limitantes de este §4 (columnas computadas del RecordList) **dejan de bloquear** este ticket y
> quedan como mejoras generales de plataforma. El caveat del `Group` pool electivo vs los `Group`
> estructurales SI aplica al mantenedor y se resolvio: el menu de acciones solo aparece en hojas
> reales (`recordType != 'Group'`), asi que los pools/vias no ofrecen acciones de hoja.

---

## 5. A11y: el kebab de acciones por nodo agrega un tab-stop dentro del treeitem

El menu de acciones por nodo (`ActionMenu`, S12) se renderiza como un boton kebab **dentro** de cada
`role=treeitem` hoja. Eso agrega un tab-stop extra al patron WAI-ARIA Tree (idealmente "un tab-stop,
navegacion por flechas"). **No es una clase nueva de violacion**: el componente YA tenia botones
tabbables dentro del treeitem (el boton de expandir/colapsar), asi que S12 es consistente con el
patron preexistente. Follow-up de hardening: integrar el kebab al roving tabindex del arbol (tabindex
sincronizado con el treeitem enfocado) o activarlo por tecla dedicada. Origen: quality review S12 (LOW).

---

## 6. Invariante del pool electivo (K-de-N) al editar/eliminar sus hojas una a una

Cada curso del pool electivo se renderiza como fila-hoja independiente en el arbol; "Editar" lo abre
como Curso simple y "Eliminar" quita un solo curso del pool. No hay invariante que mantenga el pool
con `N >= K` y `N >= 2`: un usuario puede eliminar cursos hasta dejar `N < K` (el evaluador seguiria
exigiendo K sobre menos hojas) o `N < 2`, y el auto-label "K de N" queda desalineado con el conteo
real. El alta nace consistente (valida `K in [1,N]` y `N >= 2`); el hueco es solo por ediciones
posteriores hoja-a-hoja. El guard de S2 solo bloquea el borrado si el curso esta en plan Active, no
protege este invariante. Follow-up: gestionar el electivo como **unidad editable** (editar/eliminar el
pool re-derivando label + validando/ajustando `minToSatisfy`). Origen: quality review S12 (LOW).

---

## 7. El validador de formatos del backend no soporta `exclusiveMinimum`

`validateBaseFieldFormats` (`object-manager/src/graphql/resolvers/jsonFieldValidator.resolver.js`)
mapea al sub-schema AJV solo `format`, `pattern`, `enum`, `minLength`, `maxLength`, `minimum`,
`maximum` (lineas ~321-327). No propaga `exclusiveMinimum`/`exclusiveMaximum`. Consecuencia: la nota
minima (`rt__RecordState__requirement.thresholdMinGrade`) necesita "> 0" (0 es vacuo, pero la escala
admite decimales y es configurable, asi que no aplica `minimum: 1`); hoy el rechazo de 0 vive solo en
la guarda de UI (`RequirementFieldSpec.exclusiveMin` + `submitAdd`). Por el path API/MCP directo, un
`thresholdMinGrade: 0` pasaria (el object def solo declara `minimum: 0`, que bloquea negativos).
Follow-up: extender `validateBaseFieldFormats` para mapear `exclusiveMinimum`/`exclusiveMaximum` al
sub-schema AJV, y luego declarar `exclusiveMinimum: 0` en el object def de `thresholdMinGrade`. Es un
cambio en core (object-manager) → coordinar (RULE-dev-004). Origen: S14, feedback del dev sobre 0 en
campos numericos.

**Decisión del dev (2026-07-29, S17)**: NO tocar core en esta línea. La paridad de requisitos con
Elric (S17) se maneja SOLO entre `up1-mcp` y el mod. En consecuencia, nota > 0 se **pre-valida en
Elric** (`cd_manage_requirement`), igual que la guarda de UI. Este cambio de core (mapear
`exclusiveMinimum` en `validateBaseFieldFormats`) queda **pendiente y NO se implementa ahora**: es el
único camino para cerrar el hueco por la API/MCP directa a nivel servidor (para TODOS los clientes),
pero al ser core se difiere hasta coordinarlo. Mientras tanto la defensa vive en UI + Elric (dos
capas cliente); el backend sigue bloqueando solo negativos (`minimum: 0`).

---

## 8. Alta/borrado de vías no atómico → grupos vacíos huérfanos (prevención pendiente)

**Síntoma (S17)**: en TIR101 (UPU) apareció una vía `Group(AND)` "Todos de la vía" SIN hojas dentro
del `Group(OR)` contenedor. Una vía/pool vacío no solo es ruido visual: `evaluateGroup`
(`evaluateRequirementTree.logic.ts`, líneas ~246-248) trata un grupo sin hijos normativos como
`satisfied: true` (vacuo, por diseño para advisory); entonces una vía AND vacía dentro del OR cuenta
como rama satisfecha y **el OR (cualquier vía) queda siempre satisfecho → anula el requisito** en la
evaluación de la malla (REQ-14).

**Causa**: el flujo de alta/borrado no es atómico. `resolveTargetGroup(NEW_VIA)` crea el `Group(AND)`
de la vía ANTES de crear la hoja; si la hoja falla (error backend/red/validación), la vía queda
huérfana. Simétrico en borrado: si el cascade (`computeDeleteCascade`) falla parcialmente, puede dejar
un grupo vacío. Ya documentado como LOW #3 en el quality review S14.

**Mitigado en S17 (mod-only, hecho)**: `pruneEmptyGroups` descarta del RENDER los grupos sin hojas
(no se muestran, no se numeran, no se cuentan). El huérfano existente en TIR101 se limpió a mano en la
BD (grupo sin hijos → borrado directo seguro).

**Hecho (S19, rollback seguro parcial — mod-only + Elric, NO core)**: el alta por vía ahora hace
rollback seguro ante fallo de la hoja, en AMBAS superficies:
- UI (`RequirementEditorElement.vue submitAdd`): rastrea los `Group` creados por la orquestación y, si
  la hoja falla, borra SOLO los que quedaron sin hijos (el `Group(AND)` de vía nueva vacío).
- Elric (`up1-mcp requirement-write.ts`, create con `via`): mismo criterio (rollback de grupos sin
  hijos). Importa especialmente porque Elric NO tiene el fallback de render `pruneEmptyGroups`.
El rollback es DELIBERADAMENTE parcial y seguro: **nunca** borra un grupo que envolvió una hoja
existente por reparent (ya no está vacío) ni el `Group(OR)` con raíces reparentadas (tiene hijos) —
evita la cascada peligrosa. Codificado en RULE-curriculum-design-034.

**Pendiente (atomicidad completa, mod-only, NO core)**: el rollback parcial cubre el caso común
(vía nueva vacía). Falta la atomicidad total de los edges con reparent: (a) envolver-hoja-suelta que
falla deja un grupo con la hoja reparentada movida (no huérfano, pero la estructura cambió sin la 2ª
condición pretendida); (b) crear-OR-con-reparent que falla deja el OR envolviendo las raíces (válido,
pero no lo pedido). Cerrarlo requeriría un-reparent transaccional o una operación de árbol atómica del
lado servidor. Origen: S17 (vía vacía TIR101) + S19 (review dredd, rollback seguro).

---

## Items que se evaluaron y ENTRARON al alcance (referencia, no follow-up)

- **Correquisitos** (`timing=Concurrent`): pedidos en el Request literal + CAP-CUR-004 (Must) y
  evaluados por la maqueta (`mVPrereq`: "mismo periodo permitido"). → REQ-14 los evalua.
- **`MetricThreshold(Credits)`**: familia con respaldo (decision #4); su evaluacion en la malla se
  incluyo por decision del dev (agregado de `MeshEntry.credits` por scope plan/category). → REQ-14 lo
  evalua. Las otras metricas (GPA, PeriodIndex) siguen sin modelar (enums cerrados a Credits).

---

## Estado

- Creado: 2026-07-27, durante el gate DET-38 de TICKET-101 (super autopilot).
- Revisado 2026-07-27: correquisitos y MetricThreshold movidos a alcance tras validacion contra
  transcripts + maqueta + CAP-CUR-004.
- Ninguno de los items §1-§3 bloquea el cierre de UPONE-1378.
- Al cerrar UPONE-1378, revisar si alguno merece ticket propio o queda en backlog local.
