# Integrar Elric al MCP online

> Estado: **propuesta / analisis**. Documento vivo. Fecha: 2026-08-20.
> Autor: Eduardo Bacon.
> **Punto de vista:** el foco es **como integrar Elric al MCP online**: que de lo que Elric hace y
> propone conviene incorporar al online, y como. Dejar **cd** funcional y habilitar **cm** es el
> **valor anadido** que resulta de esa integracion, no el objetivo en si. Engagement queda fuera del
> alcance (foco en cd + cm).

## 0. TL;DR

> **Como leer este documento (equipo online):** este texto lo escribe alguien que conoce Elric por
> dentro, para ustedes que conocen el online por dentro. Por eso cada seccion abre con un bloque
> **"Contexto (equipo online)"** que traduce a lenguaje llano los conceptos de Elric que aparecen ahi
> (que es un "contrato por objeto", una "ficha", un "harness E2E", una "saga", etc.), asi ningun termino
> queda sin definir. Si un concepto de Elric te genera duda, el bloque de contexto de esa seccion deberia
> resolverla; si no, esta marcado como pendiente de aclarar.

Hay **dos MCP** que resuelven el mismo dolor ("un agente externo opera up1 con la identidad y los
permisos reales del usuario"):

- **Elric** (`uplanner/mcp`, paquete `up1-mcp`): PoC local, stdio, Clerk email+OTP (auth **a deprecar**
  en favor de la del online), TypeScript, tools de dominio **escritas a mano**. Superficie rica y probada
  en `cd` (36 tools) y `uengagement`.
- **El online** (`uplanner/mcp` rama `develop`, paquete `@uplanner/mcp`): la linea productiva. HTTP +
  OAuth (identidad y RBAC reales, cero instalacion en el cliente), multi-tenant real, deployable a la
  nube (EKS), JavaScript, arquitectura **declarativa** (las tools de mod son "fichas" de datos que un
  motor generico convierte en tools, y viven en `mods/<mod>/ai/` del monorepo up1, no en el repo del
  MCP).

**La pregunta es como integrar Elric al online, no como "migrar cd".** Integrar Elric = incorporar al
online lo que Elric ya resolvio y propone (mecanismos, calidad de resolucion, harness de pruebas, DX y
el dominio de cd). El **valor anadido** concreto de esa integracion es que cd queda funcional en el
online y que cm se puede habilitar con el mismo mecanismo.

**No es un merge de codigo.** El online ya integro de Elric todo lo generico (preview semantico,
`get_create_guide`, `get_field_options`, delete con impacto, historial, capability-gate). Lo que queda
por integrar es el **dominio** de cd: reexpresar sus tools como un mod pack declarativo. `cm` nunca
estuvo en ningun MCP, se agrega por primera vez con el mismo mecanismo.

**El costo real no esta en las lecturas** (el online las cubre con tools genericas), **esta en las
escrituras con logica** (68% de la superficie de Elric): version chains, transiciones de estado,
operaciones de arbol, upserts, sagas con rollback y validaciones cruzadas no entran en una ficha
simple, necesitan el escape hatch `registerExtra` o un resolver dedicado.

**La mejor practica que hay que llevar primero al online es la testeabilidad**: Elric ya tiene un
harness E2E que ejecuta escrituras reales contra up1 y verifica el efecto en la plataforma (25/25
verde); el online solo tiene unit tests con clientes GraphQL falsos. Ese harness debe ser el estandar
del online **antes** de migrar dominio, para que cada ficha migrada se verifique contra la plataforma
real y no contra un mock que esconde los bugs de RecordType/extension.

### Principio rector de decision

Cuando el online y Elric resuelven el **mismo caso** de forma distinta, **gana el online y Elric
aporta**. El online es la base productiva (HTTP+OAuth, declarativo, multi-tenant, deployable); Elric es
el PoC del que se extraen piezas. Entonces:

- La arquitectura, el transporte, el modelo de tools y las decisiones de diseno vigentes del online **se
  respetan como baseline**. No se revierten para parecerse a Elric.
- Elric **contribuye hacia el online** (mecanismos, calidad de resolucion, harness de pruebas, moldes de
  operacion, DX), nunca al reves. Una pieza de Elric entra solo si **enriquece** el modelo del online
  sin romper su forma.
- Ante empate o duda, se elige la opcion que preserva el diseno del online.

Este principio toma las decisiones concretas del plan (secciones 2.4, 4.4, 5 y 6): donde antes habia una
decision abierta ("online o Elric"), queda resuelta a favor del online con el aporte de Elric encima.

---

## 1. Que pide el MCP online para incorporar un dominio

> **Contexto (equipo online):** esta seccion describe TU propio contrato (el mod pack declarativo), no
> algo de Elric. Esta aca para fijar el vocabulario que el resto del documento usa cuando dice "esto de
> Elric entra como una ficha" o "como `registerExtra`". El unico concepto que viene de Elric y conviene
> aclarar ya es **contrato por objeto** (1.2, campo `contracts`): en Elric es un registro
> (`contracts/registry.ts`) donde cada objeto declara UNA sola vez sus reglas de forma (que campos son
> enum y con que etiquetas, cuales son FK y como se resuelven por nombre, cuales son obligatorios,
> readonly o unicos). No es codigo por tool: es una tabla de metadata que varias tools genericas leen.
> Cuando este doc dice "declarar el contrato antes de exponer", se refiere a esto.

El contrato para agregar cd o cm al online es el **mod pack declarativo**. Un dev de dominio aporta
datos, no handlers.

### 1.1. Donde vive el dominio

El conocimiento del dominio **no vive en el repo del MCP**: vive en `mods/<mod>/ai/` del monorepo up1
(al lado de `objects/`, `logic/`, `capabilities.json`) y el online lo sincroniza con `npm run sync`.
`src/mods/<mod>/` del repo del MCP es 100% artefacto generado (esta en `.gitignore`), igual que
`suite/modsComponents/`. Consecuencia: **migrar cd al online = escribir `mods/curriculum-design/ai/`
en up1**, no tocar el repo del MCP.

Contrato fijo de la carpeta `ai/`: solo `index.js` (debe exportar el `ModPack`). El resto es libre.
Regla dura de aislamiento: nada en `ai/` importa fuera de esa carpeta; lo que el pack necesita de la
plataforma (cliente GraphQL, ctx, helpers) le llega por el `ctx` que recibe `registerExtra(server,
ctx)`.

### 1.2. Forma de un `ModPack`

`{ id, label, routingHints[], tools[], contracts?[], notExposed?[], about(): string, domainDoc?, registerExtra?(server, ctx) }`

- `routingHints` / `about` / `domainDoc`: como el LLM descubre cuando usar el mod y como se lo explica
  al usuario en lenguaje de negocio (sin nombres de tool ni ids crudos).
- `notExposed`: documenta explicitamente que funcionalidad del mod NO se expuso (aparece en `about`).
- `tools`: array de **fichas**.
- `contracts`: registro de contrato por objeto (la capa 2, patron de Elric).

### 1.3. Forma de una ficha (una tool declarativa)

Datos puros, sin funciones:

```js
{
  name: "cd_create_program",
  title: "...",
  description: "...",
  operation: "mutation",
  field: "createActivityValidated",        // nombre del resolver; el sync arma el texto GraphQL
  pick: { instructor: ["id", "names"] },   // requerido si el retorno topa con un objeto BASE compartido
  input: { code: { type: "string", required: true }, ... }, // -> Zod que ve el LLM
  defaults: { objectType: "Activity" },
  writePattern: "preview-confirm",         // agrega confirm:boolean; sin confirm -> preview sin mutar
  resultPath: "createActivityValidated",
  requiresCapability: "activity:create",   // gating RBAC por tool
}
```

Puntos clave del motor:

- **Tipos soportados** (`type-schema.js`): `string`, `id`, `number`, `boolean`, `any`, `array`
  (con `items`), `object` (con `fields`), `enum` (con `values`); modificadores `required`, `nullable`,
  `description`. Un `type` mal escrito rompe `npm run sync` (validacion estatica), no runtime.
- **`field` vs `graphql`**: en el pack fuente declaras `field` (el nombre del resolver) y `sync-mods.js`
  arma el texto GraphQL completo leyendo el `.schema.graphql` real del mod (AST, no introspeccion en
  vivo, porque Apollo la tiene apagada en prod). Auto-expande tipos propios del mod; al topar con un
  objeto BASE compartido de up1 exige que la ficha declare `pick.<campo>`.
- **preview -> commit**: `writePattern: "preview-confirm"` lo da el motor. Oculta `objectType` /
  `recordType` / `id` en el preview automaticamente.
- **`requiresCapability`**: oculta y rechaza la tool si el rol activo no tiene la capability; se
  re-evalua al arrancar sesion, cambiar de institucion y cambiar de rol; fail-closed.

### 1.4. El escape hatch: `registerExtra`

Para lo que no es "una llamada GraphQL con inputs" (upsert que busca-y-crea-o-edita, calculos con
varias llamadas, sagas con rollback), el pack declara `registerExtra(server, ctx)` y registra esa tool
a mano, reusando el mismo `ctx` (cliente GraphQL, `previewResult`, `graphqlError`, `zodShapeFromFields`)
para no perder el estandar de seguridad. Ya probado con `academic-scheduling/ai/rule-value-upsert.js`.
Es la excepcion, no la regla, pero para cd/cm va a ser **frecuente** (ver seccion 3).

### 1.5. Lecturas: casi no necesitan tool de mod

Filosofia del online: leer cualquier objeto se hace con las tools genericas (`up1_query_records`,
`up1_get_object`) apuntando al tipo, siempre que el objeto este en la lista de tipos habilitados. Una
tool de mod de lectura solo se justifica cuando hay joins/calculo que las genericas no pueden
(`cd_get_mesh`, `cd_get_prereqs`).

### 1.6. Auth / tenant (canonica del online; la de Elric se deprecia)

> **Contexto (equipo online):** Elric hoy autentica con **Clerk email + OTP** y guarda la sesion cifrada
> en disco (`~/.up1-mcp/session.enc`), un modelo pensado para stdio local. Eso NO se conserva ni se
> ofrece como alternativa: la auth del online (OAuth) es la unica y la de Elric **queda deprecada**. El
> principio rector aplica en su forma mas fuerte aca: no es "el online no porta la auth de Elric", es
> "todo, incluido Elric si sigue existiendo como herramienta local, pasa a la auth del online".

La auth del online es la **base unica**: OAuth Clerk estilo Atlassian (Bearer, no cookie), Streamable
HTTP, tenant derivado de `publicMetadata.tenantId` (no env fija), multi-institucion con switch. El
sistema de auth de Elric (OTP + sesion cifrada + stdio) **se depreca**: no se porta, no se mantiene como
segundo camino, y el propio Elric deberia repuntar a la auth del online. Consecuencia practica: **no
existe una via de auth de respaldo**; todo depende de la de online (ver B2, que por eso es la unica
puerta de entrada, no una entre dos).

---

## 2. Que de Elric se integra para dejar cd funcional

> **Contexto (equipo online):** "migrar" aca NO es copiar archivos `.ts` de Elric. Elric es TypeScript
> con una funcion escrita a mano por cada tool; tu modelo es declarativo. Migrar = **reexpresar** cada
> capacidad de Elric en tu forma: una **ficha** (datos) si es simple, o un **`registerExtra`** (codigo a
> mano dentro del pack) si no entra en una ficha. Dos etiquetas que se repiten en toda la seccion:
> **passthrough** = la tool es literalmente "una query/mutation con inputs", sin logica en el medio (migra
> a ficha casi mecanicamente, o directamente se borra porque tus tools genericas ya la cubren);
> **custom-logic** = la tool hace mas de una llamada, o decide algo, o valida algo antes de mutar (no
> entra en una ficha). El 68% de Elric es custom-logic, por eso el trabajo real esta en las escrituras.
>
> Mini-glosario de los terminos de dominio que veras en la tabla 2.3, para que no frenen la lectura:
> - **version chain / versionar**: cd guarda versiones de un programa o curriculo encadenadas; crear una
>   version nueva no es un create suelto, copia y enlaza con la anterior.
> - **transicion de estado / `statusFlow`**: un objeto tiene un campo `status` (Draft, Activo, etc.) y
>   solo ciertos saltos entre estados son validos; moverlo valida el salto y a veces exige un comentario.
> - **RecordType (`rt__...`) / extension (`ext__...`)**: un objeto base puede tener "subtipos" que guardan
>   campos propios en una tabla satelite. Importa porque leer/escribir bien esos campos es donde los mocks
>   esconden bugs.
> - **owner polimorfico / FK polimorfica**: un campo que apunta a "algo" cuyo tipo se decide en otro campo
>   (ej. `sourceType` + `sourceId`). Resolver por nombre exige primero saber el tipo.
> - **saga con rollback**: dos o mas escrituras encadenadas donde, si una falla, hay que deshacer las
>   anteriores a mano (up1 no da transacciones multi-mutation al MCP).

Superficie de Elric: 84 tools. **~27 passthrough (32%)**, **~57 custom-logic (68%)**. cd son 36 tools.

### 2.1. Ya portado al online (NO rehacer)

El ROADMAP del online (seccion 5) documenta una revision sistematica de paridad con Elric, ya cerrada:
preview semantico, `get_create_guide`, `get_field_options`, `delete-with-impact`, historial de cambios
(`get_change_history`/`query_changes`/`analytics_changes`), capability-gate. Descartado a proposito
(no pendiente): `about`/`get_documentation` por topics y las tools `view_*` de vistas guardadas.

### 2.2. Lecturas de cd (bajo costo)

La mayoria **no se migra, se elimina**: se habilita el tipo en el allowlist y las tools genericas del
online las cubren. Ejemplos que dejan de necesitar tool propia: `cd_search_programs`, `cd_get_program`,
`cd_search_curricula`, `cd_get_curriculum`, `cd_list_sections`, `cd_get_section`, `cd_list_syllabi`,
`cd_get_program_bibliography`, `cd_search_bibliography`, `cd_get_version_chain`, `cd_list_transitions`,
`cd_get_graduation_profile`.

Excepciones que **si** necesitan ficha o `registerExtra` (joins/calculo): `cd_get_mesh`,
`cd_get_prereqs` (orquestan varias queries + calculo de arbol de prerrequisitos en `mesh-logic.ts`).

### 2.3. Escrituras de cd (el costo real)

Casi todas son **custom-logic**. No entran en una ficha simple:

| Grupo | Tools | Por que es custom-logic |
|---|---|---|
| Programas | `cd_create_program`, `cd_update_program`, `cd_version_program`, `cd_transition_program` | autoAssignWorkflow al crear, transicion por enum-engine con `statusFlow`, comentario condicional |
| Secciones | `cd_create_section`, `cd_update_section`, `cd_reorder_sections`, `cd_delete_section` | suma de pesos <= 100, reordenamiento de hermanos |
| Curriculos | `cd_create_curriculum`, `cd_update_curriculum`, `cd_version_curriculum`, `cd_clone_curriculum` | owner polimorfico, campos condicionados por `recordType` Plan/Minor, herencia de extension al versionar, unicidad de `code` al clonar |
| Malla | `cd_add_plan_entry`, `cd_update_plan_entry`, `cd_move_plan_entry`, `cd_remove_plan_entry`, `cd_manage_formation_line`, `cd_manage_requirement` | recalculo de `position` sin huecos, **saga con rollback manual** (`add_plan_entry`), arbol anidado + owner polimorfico + cascada (`manage_requirement`) |
| Perfil de egreso | `cd_set_graduation_profile` | **upsert real** (decide create vs update), singleton, extension de RecordType |
| Carreras | `cd_clone_academic_program` | clonado con verificacion de unicidad |

Escrituras casi directas (candidatas a ficha simple): `cd_create_syllabus`.

### 2.4. Mecanismos transversales que hay que reponer (los bloqueantes)

Estos son la razon por la que una escritura de cd no es "solo una mutation". El online tiene ALGUNOS;
Elric tiene mas. Lo que falta hay que decidir donde vive (motor generico del online, `registerExtra`,
o resolver del core):

1. **`contracts/registry` con resolucion semantica (`resolve-inputs`)**: traducir texto de negocio
   ("ecuaciones diferenciales", con o sin acentos, sinonimos es/en) a id/enum, incluida la **FK
   polimorfica** (resuelve primero el discriminador). Es el mayor valor UX de Elric. El online tiene
   `get_field_options(query)` pero **deliberadamente no auto-resuelve dentro de create/update**.
   **Decision (principio rector)**: gana el online. Se mantiene su flujo de **dos pasos** (el LLM llama
   `get_field_options` y despues `create`); NO se porta `resolve-inputs` para auto-resolver dentro de
   create/update. Elric **aporta** subiendo la calidad de resolucion de `get_field_options`: FK
   polimorfica, sinonimos es/en, fold de acentos y desambiguacion con `candidates` (nunca adivina). Asi
   el paso 1 queda tan inteligente como Elric sin romper el modelo del online (ver 4.4).
2. **`autoassign`**: al crear ciertos objetos, resolver en runtime el workflow default del tenant y su
   estado inicial (nunca hardcodeado). Llamada GraphQL condicional extra antes del create.
3. **Motor de estados (`statusFlow`)**: transiciones y gating de versionado por enum. `registerExtra`
   o el motor de transiciones del core (`enforceEnumTransitions`).
4. **Validaciones cruzadas client-side** (`validations.ts`): suma de pesos, rango de creditos min<=max.
   up1 NO las enforza en el resolver hoy; hoy viven en Elric. Hay que reponerlas o moverlas al core.
5. **Sagas con rollback manual** (`cd_add_plan_entry`): crea bloque, crea entrada, si falla borra el
   bloque huerfano. Una ficha no lo expresa. `registerExtra` obligatorio.
6. **`blockGenericMutation` / `validatedMutations`**: el contract registry de Elric **redirige** el CRUD
   generico hacia la tool de dominio cuando el objeto exige validacion. **El online no tiene esto**, y
   expone `up1_create_object`/`update_object`/`delete_object` genericos. Sin replicarlo, el MCP se
   vuelve una puerta lateral que evade las reglas de negocio (el antipatron que el CLAUDE.md de cm
   prohibe explicitamente). **Decision (principio rector)**: gana el online en arquitectura, pero como
   NO tiene solucion propia a este caso, Elric **aporta** el mecanismo (`blockGenericMutation` en el
   contract registry). Es un aporte que enriquece, no un cambio de forma. **Bloqueante de seguridad**
   (ver seccion 3).

### 2.5. Que NO se migra

- **Auth/transporte de Elric: se depreca, no se migra.** La auth del online (OAuth) es la canonica; el
  OTP + sesion cifrada + stdio de Elric queda deprecado y ni siquiera se conserva como camino
  alternativo (ver 1.6 y B2). Elric mismo deberia pasar a la auth del online.
- `about`/`get_documentation` por topics y `view_*` (descartados en el roadmap del online).
- Las lecturas simples de cd (las cubren las genericas).

---

## 3. Habilitar Curriculum Mapping (cm)

cm nunca estuvo en un MCP. Se agrega por primera vez con el mismo mecanismo (mod pack en
`mods/curriculum-mapping/ai/`).

> **Contexto (equipo online):** cm (curriculum-mapping) es un mod NUEVO de gestion de competencias. No
> necesitas conocer su dominio para exponerlo; lo unico que importa es una regla de diseno que sus
> autores ya fijaron y que impacta directo tu trabajo: **toda escritura de cm pasa por una mutation
> `*Validated` hecha a mano, nunca por el CRUD generico**. El porque: sus reglas (unicidad parcial, FK
> polimorfica, pesos que deben sumar 100, maquina de estados) no las puede garantizar Prisma ni el CRUD
> auto-generado, viven dentro del resolver `*Validated`. Consecuencia para ti: exponer cm como fichas
> que apuntan a esos `*Validated` es correcto; exponerlo dejando vivos tus `up1_create_object` /
> `up1_update_object` genericos es un agujero de datos (ver B3, seccion 7). Dos terminos que aparecen:
> **`*Validated`** = una mutation custom del mod que corre la validacion de negocio antes de escribir;
> **partial-unique** = "unico solo bajo una condicion" (ej. un solo registro con `isDefault = true`),
> algo que la base no puede exigir sola.

> Este documento analiza la migracion cd + cm a nivel tecnico. La priorizacion y el ticketing de cm
> son otra tarea, fuera de este alcance.

### 3.1. Estado del backend de cm (lo que existe se puede exponer, lo diferido no)

- **`levelScheme`**: implementado. Escala de logro con niveles, mutations `*Validated`
  (`upsertLevelSchemeValidated`, setActive, delete con guard "en uso"), seed, tests.
- **`alignmentScale` / CoverageScheme**: default I/R/M, terreno estable.
- **`competencyNode` (Matriz)**: datos generales + ciclo de estados por `status` (en el RecordType
  `rt__Matrix__competencynode`) + RBAC de transiciones. Tiene partes de escritura todavia en
  construccion: exponer primero la matriz en **lectura** y sumar escritura cuando ese backend cierre.
- El resto del dominio (`rubricDimension`, `competencyAlignment`, `studentGrade`, `achievement`) esta
  en fase de diseno: **no exponer contra la propuesta, solo contra el codigo que existe**.

### 3.2. Por que cm encaja bien en el modelo declarativo (con matices)

A favor:
- cm ya fue **disenado pensando en MCP**: sus escrituras son mutations `*Validated` con
  `.schema.graphql` (justo lo que el sync del online necesita para armar el GraphQL desde `field`), y
  `requiresComment` de las transiciones "hoy solo lo lee el MCP" (CLAUDE.md de cm).
- Las lecturas (catalogo de esquemas, matriz) las cubren las tools genericas habilitando los tipos.

Matices / friccion:
- **Todas las escrituras de cm son gobernadas** (`upsertLevelSchemeValidated`,
  `updateCompetencyMatrixValidated`, etc.): partial-unique (`WHERE isDefault=true`), FK polimorfica
  (`sourceType+sourceId`), sumas ponderadas (`weight` que suma 1.0/100), maquina de estados. Son
  fichas con `field` al resolver `*Validated`, pero el **upsert** de LevelScheme es `registerExtra`
  (decide create vs update), igual que `as_set_rule_value` de academic-scheduling.
- **Bloqueante de seguridad**: hay que impedir el CRUD generico del online sobre los objetos de cm que
  exigen validacion (ver 2.4 punto 6). El CLAUDE.md de cm es explicito: "El CRUD generic y el MCP
  bypassan el front... llamar la generic salta toda la validacion runtime y deja data inconsistente".
  Sin `blockGenericMutation`, exponer cm para escritura via generico es un riesgo real.
- **`requiresComment`**: hoy es metadata que solo lee el MCP; el core no lo enforza en
  `enforceEnumTransitions`. Por el principio rector, el online no tiene solucion propia y Elric no lo
  enforza tampoco: el pack lo valida en `registerExtra` como aporte, y se evalua escalarlo a core
  (beneficio 4).
- **DataLog / auditoria**: verificar que la escritura por MCP quede auditada igual que la de la UI (el
  path `*Validated` de cm consolida el DataLog a mano, `recordSchemeChanges`).

### 3.3. Subconjunto recomendado para el primer corte

Los dos esquemas (`levelScheme`, `alignmentScale`) + matriz en **lectura**: es el terreno estable y de
menor riesgo. La matriz en **escritura** (preview + permisos + resolucion sobre un modelo con ciclo de
estados) se suma cuando su backend cierre, no antes.

---

## 4. Buenas practicas nuestras aplicables al MCP online

> **Contexto (equipo online):** esta seccion es lo que Elric hace bien y ustedes pueden adoptar tal
> cual. El concepto central es el **harness E2E**: en Elric es un set de pruebas que levanta el
> servidor MCP de verdad, se autentica como un usuario real (Clerk en **"test mode"**, que permite
> loguear sin humano usando un OTP fijo `424242`) y ejecuta operaciones contra una up1 local,
> verificando el efecto EN LA PLATAFORMA (vuelve a leer el dato por el mismo camino que usaria el
> usuario, no por un atajo interno). Es lo contrario de los unit tests actuales del online, que
> reemplazan GraphQL por un doble: un verde ahi prueba que el codigo llama bien, no que la operacion
> funciona contra up1. **"Las 4 fronteras del contrato"** es el checklist de lo que un MCP debe
> garantizar siempre y que el harness verifica: (1) permisos (no ejecuta lo que el usuario no puede),
> (2) preview antes de confirmar, (3) resolucion por nombre, (4) no fugar datos internos en la salida.

### 4.1. Testeabilidad (la principal, y la que mas falta)

Elric ya tiene lo que el online declara como deuda:

- **Harness E2E real** (`test/e2e/harness.ts`, clase `Elric` sobre el servidor MCP real): hoy autentica
  con Clerk **test mode + OTP fijo `424242`** (el path OTP de Elric, que se depreca), ejecuta operaciones
  reales contra up1 local y verifica el **efecto en la plataforma** (read-back por el path real del
  usuario, no por atajo API base). Lo reutilizable es el **mecanismo de verificacion**, no el login: al
  portarlo (E1) la auth pasa a OAuth headless del online, no OTP.
- **Las 4 fronteras del contrato como helpers**: permisos (sin sesion/rol -> rechazo), preview->commit
  (sin `confirm` no muta), resolucion semantica (nombre/enum -> id), higiene de salida (`publicFields`).
- **Politica de limpieza obligatoria**: teardown o marca por prefijo (`E2E-MCP`); un caso de escritura
  no se acepta sin ella.
- **Instruir vs exigir** (`PLAN-mcp-testing-automatizado.md` seccion 6): la guia ensena como escribir
  un E2E; el checklist **exige** E2E verde para toda tool/mod con escritura o resolucion semantica
  antes de commitear.

El online hoy solo tiene smoke + unit con clientes GraphQL falsos ("simulacion end-to-end con clientes
de mentira"). Un verde ahi no prueba correctitud contra RecordType/extension, que es justo donde viven
los bugs de cd/cm. **Portar este harness al transporte HTTP+OAuth del online es la etapa 1** (ver
seccion 5): asi cada ficha migrada se verifica contra la plataforma real.

### 4.2. Otras practicas aplicables

- **Escrituras gobernadas `*Validated`, nunca CRUD generico** (regla dura de cm): el online debe
  replicar `blockGenericMutation` para no volverse una puerta lateral. Es practica **y** bloqueante.
- **Contract-first**: declarar el contrato del objeto (enums+labels, FK+resolveBy, requeridos,
  readonly, unique) antes de exponer, para que la resolucion semantica y `get_create_guide` funcionen.
- **Aduana en la frontera core/mod**: varias validaciones cruzadas y el enforcement de `requiresComment`
  podrian ser core-worthy (moverlas al object-manager en vez de reimplementarlas por pack). Correr
  Aduana antes de decidir donde vive cada mecanismo de la seccion 2.4.
- **DoR/DoD del equipo** (`sp9/estandar-DoR-DoD.md`) y verificacion real con rol sin permisos: parte
  del gate de cierre de cada etapa.
- **Clasificar hallazgos** introducido vs preexistente vs NO-bug: el E2E de Elric ya destapo dos NO-bug
  (fold de acentos solo en la query; `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN`). Registrarlos como
  confirmacion, no "corregirlos".

### 4.3. Que aporta Elric a la DX del online

Mas alla del dominio, Elric aporta **experiencia de desarrollo** que el online puede adoptar tal cual:

- **Recetas de extension escalonadas** (`docs/EXTENDING.md`): "camino mas barato primero" (receta 1:
  solo declarar el tipo + su contrato ya habilita la consulta sin escribir codigo de operacion; recetas
  2/3 para escritura). Es el molde mental que reduce la barrera de sumar un dominio.
- **Onboarding real** (`docs/ONBOARDING.md`): mapa de carpetas, modelo mental, orden de lectura y a que
  receta ir por cada cambio. El online tiene README + ROADMAP, pero no un onboarding de "por donde
  empiezo a extender".
- **Catalogos como fuente de verdad** (`docs/TOOLS.md` desde `manifest.json`, `docs/CAPABILITIES.md`):
  la superficie documentada y verificable. En el online el equivalente lo arma `domainDoc` + `about`,
  pero conviene un catalogo estable por mod para el dev, no solo para el LLM.
- **Contract-first como reductor de boilerplate**: declaras el contrato del objeto una sola vez (enums,
  FK+resolveBy, requeridos, readonly, unique) y de ahi se alimentan `create`/`update`,
  `get_create_guide`, `get_field_options` y la resolucion. Menos codigo por tool, misma garantia.
- **Catalogo de moldes de operacion completa**: tomar como molde una operacion existente de cd (por
  ejemplo perfil de egreso), que ya trae auth, permisos, input schema y preview, acelera cada tool
  nueva. Elric **es** ese catalogo de moldes probados; migrar cd deja esos moldes disponibles como
  fichas de referencia.
- **Elric como banco de pruebas local barato (con fecha de vencimiento)**: hoy su stdio sin OAuth ni
  nube permite prototipar una idea de dominio en minutos antes de portarla a ficha. Es un activo de DX
  mientras dure, pero con un limite claro: su auth **se depreca** (1.6), asi que un prototipo validado en
  Elric **igual hay que re-validarlo bajo la auth OAuth del online** (por eso E1, el harness sobre el
  online, es lo que da la garantia real). No tratar "anduvo en Elric" como equivalente a "anduvo en el
  online": el transporte y la auth son distintos.
- **El harness E2E y el gate instruir/exigir** (ver 4.1): el aporte de DX mas grande, porque cambia
  como se valida cada aporte futuro, no solo cd/cm.

### 4.4. Mantiene el online la forma semantica que Elric consiguio?

La "forma semantica" de Elric tiene **dos mitades**, y el online las trata distinto:

- **Salida (higiene semantica): SI, y reforzada.** Elric ocultaba ids crudos, tipos internos y jerga,
  y hablaba en lenguaje de negocio. El online mantiene todo eso y lo hace **transversal** en vez de por
  tool: `SERVER_INSTRUCTIONS` a nivel de servidor completo aplica la regla a toda tool automaticamente;
  el preview oculta `objectType`/`recordType`/`id`; los errores no se relayen crudos salvo que el core
  los marque como error de negocio; `domainDoc` da el "que es / que puedo hacer" en lenguaje de negocio.
  En este eje el online es igual o mejor que Elric.

- **Entrada (resolucion semantica): PARCIAL, es el matiz importante.** Elric resolvia texto de negocio
  a id/enum **end-to-end dentro del mismo llamado de escritura** (`resolveContractInputs`): FK
  polimorfica, sinonimos es/en, fold de acentos, y desambiguacion con `candidates` (nunca adivina). El
  online **conserva la capacidad** via `get_field_options(query)` (traduce texto libre al id/token
  exacto), pero **deliberadamente NO auto-resuelve dentro de `create`/`update`** (por la ambiguedad de
  saber si un valor ya es un id). Consecuencia UX: "crea el programa de ecuaciones diferenciales en la
  carrera X" pasa de ser el one-shot de Elric a un **flujo de dos pasos** que el LLM orquesta
  (`get_field_options` y despues `create`); las `description` de las tools se referencian entre si para
  inducir ese encadenamiento. Funciona, pero la fluidez depende de que el modelo del otro lado encadene
  bien, no del servidor.

**Cierre y decision (principio rector)**: el online mantiene la forma semantica de **salida**, y esa
forma se respeta como esta. En **entrada** el online eligio el flujo de dos pasos y esa decision
**gana**: no se porta `resolve-inputs` para volver al one-shot de Elric, porque eso seria imponer la
forma de Elric sobre la del online. Lo que se hace es que **Elric aporte** su calidad de resolucion
(FK polimorfica, sinonimos es/en, fold de acentos, `candidates`) dentro del `get_field_options` del
online, de modo que el paso 1 sea tan bueno como el de Elric sin cambiar el modelo de dos pasos. La
forma semantica de Elric se conserva como **calidad de resolucion**, no como automaticidad end-to-end.

---

## 5. Plan de integracion en etapas

> **Contexto (equipo online):** el orden no es arbitrario. Primero lo que desbloquea (E0), despues la red
> de seguridad (E1, el harness E2E), y recien ahi el dominio: lecturas de cd (E2, casi gratis), escrituras
> de cd (E3 simples, E4 el grueso), cm (E5), y al final el endurecimiento de produccion (E6). Cada etapa
> deja el sistema funcional y demoable por si sola. Recordatorio de vocabulario (seccion 1): "ficha" =
> datos declarativos que el motor convierte en tool; "`registerExtra`" = codigo a mano dentro del pack,
> para lo que no entra en una ficha.

Cada etapa es atomica y demoable, ordenada por dependencia y por riesgo (los desbloqueantes primero).

### E0 - Precondiciones y frontera (desbloqueante)

- **Resolucion semantica: decidido** (principio rector). Se mantiene el flujo de dos pasos del online;
  Elric aporta su calidad de resolucion dentro de `get_field_options` (FK polimorfica, sinonimos,
  acentos, `candidates`). El trabajo de E0 no es decidir, es especificar ese aporte a `get_field_options`.
- Confirmar la **dependencia de auth** del roadmap del online (seccion 2): `object-manager` rama
  `feature/mcp-oauth-auth` mergeada a develop/staging. Sin eso el online desplegado no autentica.
- Correr **Aduana** sobre los mecanismos de 2.4 (validaciones cruzadas, `requiresComment`,
  `blockGenericMutation`): que es core-worthy y que vive en el pack.
- Validacion: aporte a `get_field_options` especificado + dependencias confirmadas; sin esto no se
  empieza a migrar dominio.

### E1 - Portar el harness E2E al online (testeabilidad primero)

- **Cambia el transporte** del harness (hoy `StdioClientTransport`) al **HTTP** del online.
- **Cambia la auth del harness, y es el riesgo real de esta etapa.** El harness de Elric hoy loguea por
  su path OTP (`authenticate` + `submit_otp` con `424242`), que **queda deprecado** (1.6). Contra el
  online hay que autenticar por **OAuth**, y hacerlo **headless** (sin navegador ni humano en el loop)
  no es lo mismo que un OTP fijo: hay que resolver como minta un token de Clerk en test mode para el
  flujo OAuth. Este es el spike desbloqueante de E1, equivalente a la Fase 0 del plan de testing de
  Elric, pero contra el transporte nuevo.
- Reponer los helpers de las 4 fronteras y la politica de limpieza (se portan casi tal cual; no dependen
  de la auth).
- Dejar el gate "E2E obligatorio para escritura" en el `CONTRIBUTING`/`EXTENDING` del online.
- Validacion: `npm run test:e2e` verde en el online con un caso trivial (una lectura generica),
  autenticado por OAuth headless; el gate queda escrito antes de migrar dominio.

### E2 - CD lecturas (bajo riesgo)

- Habilitar los tipos de cd en el allowlist del online (las genericas cubren la mayoria de lecturas).
- Fichas o `registerExtra` solo para `cd_get_mesh` y `cd_get_prereqs`.
- Validacion: consultar programas, curriculos y malla por el asistente contra el tenant real; E2E de
  lectura verde.

### E3 - CD escrituras simples (pack `mods/curriculum-design/ai/`)

- Crear el mod pack (`index.js` con `routingHints`/`about`/`domainDoc`/`contracts`).
- Fichas con `field` para las escrituras casi directas (`cd_create_syllabus`) referenciando los
  resolvers existentes (`.schema.graphql` ya esta en `logic/`).
- preview->commit lo da el motor.
- Validacion: create con preview->commit->read-back->teardown verde por el path real.

### E4 - CD escrituras custom-logic (el grueso)

- `registerExtra` (o resolvers del core segun E0/Aduana) para: transiciones/versionado (`statusFlow`),
  operaciones de arbol (`manage_requirement`, plan entries con recalculo de `position`), saga
  `add_plan_entry`, upsert `set_graduation_profile`, clonados con unicidad.
- Reponer las validaciones cruzadas (2.4 punto 4) y `autoassign`.
- Validacion: E2E de escritura de alto riesgo (el set que en Elric cubre 25/25), incluyendo objetos con
  proyeccion RT/ext donde el mock no prueba correctitud.

### E5 - CM (curriculum-mapping)

- Crear `mods/curriculum-mapping/ai/`. Primer corte: `levelScheme` + `alignmentScale` + matriz en
  **lectura** (el terreno estable, ver 3.3).
- Escrituras `*Validated` como fichas; upsert de LevelScheme como `registerExtra`.
- Aplicar `blockGenericMutation` sobre los objetos de cm (bloqueante de seguridad, B3).
- La matriz en **escritura** se suma cuando su backend cierre; verificar el enforcement por rol contra
  el modelo de roles vigente en ese momento.
- Validacion: E2E verde (lectura de cada objeto habilitado, escritura preview->commit->read-back con
  usuario real, y rechazo con rol sin capability), sin regresion en cd.

### E6 - Endurecimiento para produccion (roadmap del online)

- Filtrado de tools genericas por capability por `objectType` (roadmap seccion 3, hoy pendiente).
- Rate limiting; auditoria de que write-tools quedan expuestas a que rol.
- `npm test` + `npm run test:e2e` como gate de CI.
- Deploy EKS (roadmap seccion 6): arranca `replicas:1`, dev + staging.

> Nota de secuencia: E1 va antes que E2-E5 a proposito. Migrar dominio sin el harness real repite el
> problema que el propio roadmap del online declara (unit con mocks no prueba RT/ext). E5 puede
> solaparse con E3/E4 si hay dos devs, pero comparte el motor y las decisiones de E0.

---

## 6. Cambios beneficiosos detectados (mejoras que conviene hacer al migrar)

> **Contexto (equipo online):** estos NO son requisitos para que cd funcione; son mejoras que salen casi
> gratis si se hacen DURANTE la migracion en vez de despues. Cada una toca una pieza que ya es tuya
> (`get_field_options`, el harness, el contract registry) y la deja mejor para TODOS los mods, no solo
> cd/cm. Distinguirlos de los bloqueantes (seccion 7) importa para priorizar: un bloqueante frena; un
> beneficio se puede diferir sin romper nada.

No son obligatorios para "dejar cd funcional", pero la migracion es el momento barato de hacerlos:

1. **Elevar `get_field_options` con la calidad de resolucion de Elric** (FK polimorfica, sinonimos
   es/en, fold de acentos, `candidates`): mantiene el flujo de dos pasos del online (principio rector)
   pero hace el paso 1 tan bueno como el de Elric. Beneficia a **todo** el CRUD generico del online, no
   solo a cd/cm, porque `get_field_options` es una tool generica.
2. **El harness E2E como estandar oficial del online**: cierra la deuda de integracion E2E que el
   online declara en su propio roadmap, y da un molde comun para todo mod futuro (no solo cd/cm).
3. **`blockGenericMutation` en el online**: portar el `validatedMutations`/`blockGenericMutation` del
   contract registry de Elric cierra el agujero de que el MCP evada las reglas `*Validated` (critico
   para cm, util para cd). Es seguridad, no comodidad.
4. **Enforce de `requiresComment` en `enforceEnumTransitions` del core**: hoy es metadata que solo lee
   el MCP; moverlo al core (via Aduana/core-extension) lo hace valer tambien por la UI y por cualquier
   cliente, no solo por el MCP.
5. **Verificar auditoria (DataLog) del path MCP**: asegurar que la escritura via `*Validated` por MCP
   queda registrada igual que la de la UI.
6. **Consolidar `cd_get_mesh`/`cd_get_prereqs` como lecturas de mod bien acotadas**: son el caso claro
   de "lectura que las genericas no pueden"; documentarlas como el patron de referencia para futuras
   lecturas con calculo.

---

## 7. Bloqueantes (detalle)

> **Contexto (equipo online):** "bloqueante" no significa "dificil", significa que **algo no puede
> avanzar o queda mal hecho hasta resolverlo**. Hay tres sabores distintos y conviene no mezclarlos:
> una **dependencia** (algo externo que tiene que estar listo antes), un riesgo de **seguridad** (si se
> ignora, corrompe datos en silencio) y un tema de **esfuerzo** (no frena el proyecto, pero define
> cuanto cuesta una etapa). Abajo cada uno con el mismo formato: que es, por que bloquea, que pasa si se
> ignora, y como se resuelve.

| # | Bloqueante | Etapa | Tipo |
|---|---|---|---|
| B2 | `object-manager` `feature/mcp-oauth-auth` mergeado (el online no autentica sin eso) | E0 | Dependencia de plataforma |
| B3 | `blockGenericMutation` para objetos gobernados (cm y cd) | E4/E5 | Seguridad |
| B4 | Sagas/tree-ops/upserts que no entran en ficha (necesitan `registerExtra` o resolver) | E4 | Esfuerzo |
| B5 | Matriz de cm en escritura: backend todavia en construccion (exponer lectura primero) | E5 | Dependencia de backend |

### B2 - OAuth productizado en el object-manager (dependencia de plataforma)

- **Que es:** el online autentica al usuario con un token OAuth de Clerk y reenvia ESE token al
  object-manager. Para que el object-manager lo acepte (un OAuth access token tiene otra forma que el
  session token de la Suite) hace falta el cambio en `src/services/auth/userExtractor.js` que hoy vive
  en la rama local `feature/mcp-oauth-auth`, todavia sin pushear ni mergear.
- **Por que bloquea:** sin ese merge en develop/staging, el online desplegado se autentica contra Clerk
  pero el object-manager **rechaza el token al primer request de datos**. No degrada parcialmente: toda
  tool que toque datos falla. Es dependencia porque el arreglo no vive en el repo del MCP sino en el
  core, y su dueno es plataforma (Klaus, segun el roadmap del online).
- **Peso extra por la deprecacion de la auth de Elric:** como la auth de Elric (OTP/stdio) se depreca y
  NO queda como camino de respaldo (1.6), la OAuth del online es la **unica** puerta de entrada. B2 deja
  de ser "una de dos vias" y pasa a ser un single point of failure de auth: si no esta, no hay ninguna
  forma de operar el MCP contra datos reales. Eso sube su prioridad, no la baja.
- **Que pasa si se ignora:** podes construir y migrar todo el dominio, y en local (si corres un
  object-manager con esa rama) hasta funciona; pero el deploy dev/staging no autentica y no hay demo
  posible con usuario real. El trabajo queda "listo" pero no verificable donde importa.
- **Como se resuelve:** pushear y abrir PR de `feature/mcp-oauth-auth`, mergear a develop/staging. Por
  eso esta en E0: hay que confirmarlo ANTES de comprometer fechas de la migracion.

### B3 - `blockGenericMutation`: cerrar la puerta lateral del CRUD generico (seguridad)

- **Que es:** el online expone `up1_create_object` / `up1_update_object` / `up1_delete_object`, tools
  genericas que ejecutan el CRUD auto-generado de cualquier objeto. Elric tiene en su contract registry
  un flag (`validatedMutations` / `blockGenericMutation`) que, para un objeto que exige validacion,
  **bloquea ese CRUD generico** y obliga a usar la tool de dominio (`*Validated`).
- **Por que bloquea (y es seguridad, no comodidad):** las reglas de negocio de cd y sobre todo de cm
  (unicidad parcial, pesos que suman 100, FK polimorfica, maquina de estados) viven DENTRO de las
  mutations `*Validated`, no en constraints de la base. El CRUD generico salta esas mutations y escribe
  directo a la tabla. Entonces, si expones un objeto gobernado y dejas vivo el `create_object` generico,
  el LLM (o el usuario) puede crear o editar ese objeto **saltando toda la validacion**: dos "default"
  activos a la vez, pesos que no suman 100, un registro que nace fuera de la maquina de estados. El
  CLAUDE.md de cm lo prohibe con todas las letras.
- **Que pasa si se ignora:** corrupcion de datos **silenciosa**. La escritura "funciona", devuelve ok, y
  la inconsistencia recien se descubre despues, en un reporte o en la UI, cuando ya es cara de rastrear.
  Es el peor tipo de bug: sin sintoma inmediato.
- **Como se resuelve:** Elric aporta el mecanismo (principio rector: el online no tiene solucion propia).
  El contrato de un objeto gobernado declara "sin CRUD generico" y las tools genericas del online lo
  rechazan, redirigiendo a la tool de dominio. Aplica en E4 (cd) y E5 (cm). Barato de portar, caro de
  omitir.

### B4 - Escrituras custom-logic que no entran en una ficha (esfuerzo)

- **Que es:** el 68% de las escrituras de cd hacen cosas que una ficha (una sola operacion GraphQL) no
  puede expresar. Los tres patrones concretos:
  - **saga con rollback** (`cd_add_plan_entry`): son DOS escrituras encadenadas (crear el bloque, luego
    la entrada) y si la segunda falla hay que DESHACER la primera a mano, porque up1 no expone
    transacciones multi-mutation al MCP. Una ficha hace una sola llamada: no tiene como "deshacer si la
    siguiente falla", y dejaria un bloque huerfano.
  - **tree-ops** (`cd_manage_requirement`, mover/reordenar plan entries): recalcular la `position` de los
    hermanos sin huecos ni choques implica varias lecturas y varios updates dependientes entre si.
  - **upsert** (`cd_set_graduation_profile`, `upsertLevelScheme`): primero hay que buscar si ya existe y
    segun eso crear o editar. Son dos caminos; una ficha es uno solo.
- **Por que bloquea:** si intentas forzar esto en una ficha, o no se puede, o queda a medias (el caso
  del bloque huerfano). Es bloqueante de **esfuerzo**, no de viabilidad: no frena el proyecto, pero
  define cuanto cuesta E4 y cuantos `registerExtra` hay que escribir. Subestimarlo es lo que hace que
  "migrar cd" parezca 2 dias y sean 2 semanas.
- **Que pasa si se ignora:** o el alcance de E4 se infla a mitad de camino, o (peor) se expone una
  escritura a medias que deja datos inconsistentes al primer fallo.
- **Como se resuelve:** en E3/E4, clasificar cada tool en ficha vs `registerExtra` (la tabla 2.3 ya lo
  adelanta) y presupuestar los `registerExtra`. El patron ya esta probado en el online
  (`academic-scheduling/ai/rule-value-upsert.js`), asi que no es territorio nuevo, es volumen.

### B5 - Matriz de cm en escritura: backend en construccion (dependencia de backend)

- **Que es:** la matriz de competencias (`competencyNode`) tiene los datos generales ya implementados,
  pero partes de su escritura (adopcion, competencias hijas) todavia se estan construyendo en el backend
  del mod.
- **Por que bloquea (parcialmente):** exponer por MCP una escritura cuyo resolver todavia cambia obliga a
  rehacer la ficha/`registerExtra` cuando el backend cierre. Es una dependencia **acotada**: solo frena
  la matriz EN ESCRITURA, no el resto de cm (los esquemas y la matriz en lectura estan estables).
- **Que pasa si se ignora:** trabajo tirado y, peor, doc y tests que afirman una forma de la operacion
  que despues cambia (ya paso en cm que un `origin/develop` viejo genero doc equivocada).
- **Como se resuelve:** exponer primero cm en lectura + los esquemas estables (`levelScheme`,
  `alignmentScale`), y sumar la matriz en escritura cuando su backend cierre. Verificar siempre contra el
  codigo real del mod, no contra la propuesta de dominio.

> **B1 (resolucion semantica) NO esta en la lista a proposito.** Dejo de ser bloqueante cuando el
> principio rector lo resolvio a favor del online (mantener el flujo de dos pasos, y que Elric aporte su
> calidad de resolucion dentro de `get_field_options`). Es trabajo especificado en E0 y un beneficio en
> seccion 6, no una decision pendiente que frene algo.

---

## 8. Referencias

- Repo online: `uplanner/mcp` rama `develop` (paquete `@uplanner/mcp`). `README.md`, `docs/ROADMAP.md`,
  `docs/mods-por-tenant.md`, `src/tools/register-declarative-tools.js`, `src/mods/types.js`,
  `scripts/sync-mods.js`.
- Repo Elric: `uplanner/mcp` local en `main` (paquete `up1-mcp`). `docs/TOOLS.md`, `docs/CAPABILITIES.md`,
  `docs/EXTENDING.md`, `src/contracts/registry.ts`, `src/contracts/resolve-inputs.ts`, `src/mods/curriculum-design/`.
- Testing: `sp9/PLAN-mcp-testing-automatizado.md`, `sp9/FOLLOWUP-mcp-testing-automatizado.md`.
- cm: `mods/curriculum-mapping/README.md`, `mods/curriculum-mapping/CLAUDE.md`.
- Estandar de cierre: `sp9/estandar-DoR-DoD.md`.

