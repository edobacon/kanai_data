# Review PR #18 (`curriculum-design`) · UPONE-1393

> Review post-merge del PR #18. Fuente: trazado estatico del codigo sobre la rama destino
> ya integrada (mod `curriculum-design` y core `object-manager`). El PR ya esta mergeado, asi
> que los hallazgos son follow-ups / deuda a corregir en un cambio siguiente, no bloqueos de
> merge, pero se clasifican con su severidad igual.

## Contexto del PR

- **Titulo**: "UPONE-1393, se agrega _rbac, ajustes de Reverso de estado (Active a Draft)".
- **Estado**: MERGED (rama `UPONE-1393` integrada a `develop`). Autor y merger: Francisco Navarro.
  Sin reviewers formales. Ya existe un comentario de review previo (Eduardo Bacon) que marco el
  bloqueante de RBAC y la falta de smoke.
- **CI**: los build statuses del commit fuente vinieron vacios (el repo no expone CI, o el token
  no tiene scope de pipeline). No se pudo confirmar verde por CI. La verificacion es por trazado
  estatico del codigo.
- **Calibracion**: review a fondo. Es logica real de permisos (RBAC) y de datos (guard de
  reverso + objetos nuevos), con criterios de aceptacion de enforcement. Se trazo el mecanismo de
  permisos de punta a punta en el backend antes de afirmar comportamiento.

## Que propone el PR

1. `seed/_data-rbac.js`: 4 roles curriculares + mapa rol a capabilities.
2. 3 capabilities nuevas `*:revert` + gateo de la transicion `Active a Draft` en
   Curriculum/Activity/Offering.
3. Quita `canCreate/canEdit` fijos de los listados (para que gobierne RBAC).
4. `requiredCapability` en tabs + tab "Historial" nuevo.
5. Guard de integridad del reverso (`documentDependents.js`) + 2 objetos de dominio nuevos
   (`PlanEnrollment`, `ProgramEnrollment`).
6. Offering `status` pasa a `lifecycleStatus` en layouts.

## Como funciona el chequeo de permisos (contexto para leer los hallazgos)

Dos hechos del motor de permisos del core que hacen falta para entender los casos de abajo:

1. **Toda edicion pasa primero por un gate de "editar el objeto"**. Guardar un cambio, incluido
   cambiar el campo de estado, entra por `withObjectAuth('modify')`
   (`object-manager/src/graphql/resolvers/instance.resolver.js:3911`). Recien despues de pasar
   ese gate corre el chequeo de la transicion de estado (`enforceEnumTransitions`, mismo archivo).
2. **El chequeo busca la capability por su nombre exacto**. `checkObjectPermissions`
   (`object-manager/.../authChecker.js:232`) arma el string `<objeto>:<accion>` en minuscula y lo
   busca literal, sin comodines y sin bypass de admin para usuarios normales. Deja pasar el gate
   de `modify` con una de tres: la capability de objeto `<obj>:modify`, la de tipo de registro
   `<base>:<rt>:modify`, o una capability por campo `<obj>.<campo>:modify` (fallback field-level,
   `authChecker.js:290-315`).

---

## Hallazgos

### Caso 1 (critico / bloquea) - Revisor y Autoridad quedan bloqueados en el gate de `modify`

**Nivel, por que**: impacto = feature central del ticket rota (gobernanza del ciclo de vida) +
incumple 2 criterios de aceptacion ("separacion de funciones", "Autoridad si puede revertir");
alcance = 4 roles / 3 objetos; certeza = confirmada por trazado. Config valida + feature rota da
critico.

**Mecanismo trazado**:

- El gate de `modify` (ver contexto arriba) corre antes del chequeo de la transicion. Si un rol no
  pasa el gate, nunca se llega a evaluar si tiene el permiso de la transicion (`:approve`,
  `:revert`, etc.).
- **El lado de core que habilita transicionar sin editar el resto ya esta resuelto por el equipo
  de core**: el fallback por campo para `modify` aterrizo en core como parte de este mismo
  esfuerzo (`instance.resolver.js:4127`: "the withObjectAuth gate now also admits users who only
  hold a field-level modify cap"). Es decir, el gate de `modify` ya acepta una capability por
  campo. Falta la mitad del lado del mod.
- **El choque (lado mod, pendiente)**: el `seed/_data-rbac.js` le da a Revisor/Autoridad solo
  capabilities de objeto de transicion (`activity:approve`, `activity:revert`, etc.) y ninguna
  `:modify` ni por campo `<obj>.status:modify`. Un grep de `activity.` / `.status:` /
  `.lifecycleStatus:` en `_data-rbac.js` y `capabilities.json` da vacio: no hay una sola
  capability por campo en el mod.

| Rol | Tiene | Pasa el gate de `modify` | Resultado |
|---|---|---|---|
| Disenador | `activity:modify` | Si (capability de objeto) | Entra; lo frena bien el chequeo de transicion (OK) |
| Revisor | `activity:approve` (sin `:modify`, sin campo) | No | Rechazado antes de mirar `:approve` |
| Autoridad | `activity:revert`/`:publish` (sin `:modify`, sin campo) | No | Rechazado antes de mirar `:revert` |

**Efecto**: un Revisor al aprobar o una Autoridad al revertir reciben "Authorization Error: You do
not have permission to modify Activity objects". Hoy solo el Admin (que tiene todo) transiciona.

**Plan de mitigacion**:

1. **Fix (lado mod)**: en `seed/_data-rbac.js`, agregar al mapa de Revisor y de Autoridad las
   capabilities por campo de estado que necesita cada uno: `activity.status:modify`,
   `curriculum.status:modify`, `offering.lifecycleStatus:modify` (se auto-generan en core por
   objeto/campo). Con eso pasan el gate de `modify` y pueden transicionar sin poder editar el
   resto del contenido, que es justo la separacion de funciones que pide el ticket.
2. **Re-seed**: correr el seed de RBAC en cada tenant afectado para que las capabilities queden
   asignadas a los roles.
3. **Verificacion (smoke por rol)**: en UPU, loguear con cada rol seleccionado en el selector (no
   como Admin) y ejecutar aprobar / publicar / revertir segun corresponda. Confirmar que ya no
   aparece el error de autorizacion y que la transicion prohibida para el rol sigue bloqueada.
4. **Test de regresion**: agregar un test que asserte que un rol de solo-transicion pasa el gate
   de `modify` (que tenga `:modify` o la capability por campo del estado), no solo que el mapa de
   roles este bien armado. Ver la nota de "falso verde" mas abajo.
5. **Prevencion**: dejar escrito, donde el equipo documenta las convenciones del mod, que "un rol
   que solo transiciona de estado necesita la capability por campo del campo de estado, no basta
   la capability de objeto de la transicion".

### Caso 2 (alto) - El PR agrega tab "Historial" a elementos hijos, contra el diseno de origen

**Nivel, por que**: impacto = feature de UI que contradice el diseno de origen del historial y
ademas queda no funcional; alcance = 7 layouts; certeza = confirmada contra `origin/develop`
(@ `30cc27d`).

**Diseno de origen (fuente de verdad)**: el historial vive en el objeto **padre** (Activity,
Curriculum/plan de estudios, Offering, AcademicProgram). El tab del padre muestra sus cambios
directos y los de sus hijos polimorficos, porque cada cambio de un hijo se **atribuye al padre**
(`historyKey = "<Padre>:<parentId>"`). El unico otro lugar con historial es la vista a nivel de
mod (`core_DataLog` list), que muestra los cambios de todos los padres y sus hijos. Los hijos
polimorficos por si mismos no llevan historial propio.

**Que hace el PR**: agrega el tab `history` (label "Historial", `elements: ["historyList"]`) a 7
layouts que son hijos polimorficos: los 6 `default_rt__*__curricularsection_view.json` (Content,
Bibliography, CustomSection, EvaluationComponent, LearningOutcome, Session) y
`default_CurricularLink_view.json`. Verificado contra `origin/develop`: los 7 tienen la referencia
a `historyList` una sola vez y **cero definiciones** del elemento en su `schema`; los padres si lo
definen (por ejemplo `default_Activity_view.json:361`, con `objectName: "core_DataLog"` y filtro
`historyKey EQUALS "Activity:{{parentId}}"`).

Dos problemas a la vez:

1. **Contradice el diseno**: segun el trabajo de origen del historial, el hijo no debe tener
   historial propio; su historia se ve desde el padre. Agregar el tab en el hijo va contra esa
   fuente de verdad.
2. **Ademas queda roto**: aunque se quisiera completar, el elemento no esta definido en esos
   layouts, y el mecanismo no soporta un historial a nivel de hijo (el `historyKey` agrupa por el
   padre, el hijo no tiene bucket propio; copiar el bloque del padre no sirve porque filtra por el
   id del padre).

**Plan de mitigacion**:

1. **Fix (recomendado): retirar** el tab `history` de los 7 layouts hijos. El historial ya se ve
   desde el objeto padre y desde la vista de `core_DataLog` del mod, que es lo que define el diseno
   de origen.
2. Si producto quisiera un historial acotado al propio registro hijo (no es lo que pide el diseno
   de origen), eso es un cambio de diseno aparte: habria que definir un `historyList` con un filtro
   por el propio registro del hijo (su `objectName`/`recordId`) y validar que el DataLog lo
   soporte. No es copy-paste del bloque del padre.
3. **Verificacion (smoke)**: abrir una seccion y un link y confirmar que ya no aparece el tab
   "Historial" (o, si se decide dejarlo por decision de producto, que liste el historial correcto).

> Nota de verificacion: este caso se confirmo leyendo `origin/develop` directamente. Un grep sobre
> el clone local dio falso negativo porque el clone estaba en otra rama (`feat/UPONE-1382`), no en
> `develop`.

### Caso 3 (medio) - El guard de dependientes no filtra por estado de la matricula

**Nivel, por que**: impacto = over-blocking (bloquea un reverso legitimo); alcance = 3 objetos;
certeza = confirmada para PlanEnrollment, consulta para OfferingEnrollment.

En `logic/helpers/documentDependents.js:864-889` las 3 queries buscan existencia sin filtrar por
estado de la matricula:

- Curriculum: `planEnrollment.findFirst({ where: { curriculumId: id } })`, pero
  `PlanEnrollment.status` es un enum `["Active","Closed"]` (`objects/PlanEnrollment.json:1077`,
  definido en este mismo PR) y se ignora.
- Offering/Activity: `findFirst` por `offeringId` / `offering.activityId` sin filtro de estado
  sobre `OfferingEnrollment`.

La regla de negocio dice "dependientes activos (matriculados)"; la funcion se llama
`findActiveDependent`, pero cuenta tambien matriculas `Closed` o dadas de baja, asi que bloquea
revertir un documento cuyos alumnos ya no estan activos.

**Plan de mitigacion**:

1. **Fix**: agregar el filtro de estado a las 3 queries de `findActiveDependent`. Para
   PlanEnrollment, `status: 'Active'`. Para OfferingEnrollment, confirmar primero el nombre y el
   enum del campo de estado y aplicar el filtro equivalente (queda como consulta porque no se
   verifico su schema).
2. **Verificacion**: dos casos de prueba. (a) un documento con matricula `Closed` debe poder
   revertirse; (b) un documento con matricula `Active` debe seguir bloqueado. Ambos deben pasar
   por el path real del usuario, no solo por unit mockeado.

### Caso 4 (medio) - Objetos de matricula fuera del alcance declarado + comentarios contradictorios

**Nivel, por que**: impacto = deuda / confusion + expansion de alcance no declarada; alcance = 2
objetos de dominio persistidos; certeza = alta.

- El PR agrega `objects/PlanEnrollment.json` y `objects/ProgramEnrollment.json` (objetos de
  dominio nuevos, generan tablas via codegen) sin capabilities, sin layouts, sin tipo de registro,
  sin seed y sin rol asignado. No figuran en el alcance declarado del ticket. `ProgramEnrollment`
  solo es padre (FK) de `PlanEnrollment`; ningun guard lo usa.
- **Comentarios contradictorios**: los headers de `documentDependents.js:834-845` y de
  `polymorphicUpdate.resolver.js:966-968` dicen "Curriculum queda como follow-up (sin modelo de
  matricula de plan). Cuando exista, anadir aqui la entrada Curriculum". Pero el codigo si anade el
  modelo (`PlanEnrollment`), si incluye la entrada `Curriculum` en la config de dependientes
  (`:881-889`), la cablea en `curriculum-update.resolver.js:92-95` y la testea
  (`tests/unit/documentDependents.test.js:1825`). El comentario quedo desactualizado respecto del
  codigo que lo acompana.
- **Interaccion con el Caso 1**: hoy el reverso de Curriculum/Offering por Autoridad ni llega al
  guard (lo frena antes el gate de `modify`); solo un Admin lo dispararia.

**Plan de mitigacion**:

1. **Decidir el destino de los objetos nuevos**: si `PlanEnrollment` / `ProgramEnrollment` son la
   base de una feature de matricula futura, dejar registrado (ticket o nota) que entran a
   proposito y completar lo que les falta (capabilities, layouts, seed) cuando esa feature se
   trabaje. Si entraron de mas, retirarlos para no dejar tablas sin uso.
2. **Actualizar los comentarios**: corregir los headers de `documentDependents.js` y
   `polymorphicUpdate.resolver.js` para que reflejen que el modelo de matricula de plan ya existe
   y que la entrada Curriculum ya esta cableada; hoy confunden a quien lea el codigo.
3. **Verificacion**: revisar que el codegen / migracion de esos objetos no rompa nada y que las
   tablas generadas queden consistentes.

### Caso 5 (bajo / nitpick) - Comentario desactualizado en `READ_CAPS`

En `seed/_data-rbac.js:1274` el comentario dice que otorga `changelog:view` del objeto `ChangeLog`,
pero el array otorga `core_datalog:view` y los layouts usan `objectName: "core_DataLog"`
(verificado en `datalog_entry_view.json` y en los `*_view.json`). El codigo es correcto; el
comentario nombra un objeto y una capability que no existen, lo que induce a error al depurar
permisos.

**Plan de mitigacion**: corregir el comentario para que nombre `core_datalog:view` y `core_DataLog`.

### Caso 6 (bajo) - Rename de label sin respaldo documental en `Offering.lifecycleStatus.Active`

`lang/es/Offering.i18n.json:40` cambia la etiqueta de `lifecycleStatus.Active` de "Vigente" a
"Activo" (commit `a56a601`, "ajustes a columnas de status"). Se valido contra las tres fuentes y
**no hay documentacion que respalde "Activo"**:

- **Ticket del PR (UPONE-1393)**: su alcance es RBAC + gobernanza del reverso; no pide ningun
  cambio de copy. Ademas, en su propia redaccion llama "vigente" al documento publicado/en uso
  ("revertir docs vigentes", "des-publicar un documento vigente: plan con matriculados, curso
  dictandose"). El ticket usa "vigente", no "activo".
- **Ticket que definio el estado (UPONE-1381)**: define el enum `lifecycleStatus`
  (Draft/InReview/Active/Archived) y su DoD pide "lang ES completo", pero no especifica la etiqueta
  en espanol del estado Active.
- **Confluence (fuente de verdad del producto, catalogo CAP-CUR)**: el workflow del plan
  (CAP-CUR-009) usa el estado "Vigente" (`Borrador -> Revision -> Aprobado -> Vigente -> Deprecado
  -> Archivado`); el workflow del silabo/programa (CAP-CUR-035/019) usa "Publicado" (`Borrador ->
  Revision -> Aprobado -> Publicado`). En ninguno aparece "Activo" para este estado.

El `Offering` aca es el silabo (`recordType=Syllabus`, lo dice la descripcion del campo), asi que
el termino documentado seria "Publicado"; el termino de dominio general (y el del ticket 1393 y el
workflow del plan) es "Vigente". "Activo" no esta respaldado por ninguna fuente.

Motivo probable (no declarado): en el mismo archivo hay dos enums con clave `Active`, el `status`
de engagement (disponibilidad) ya rotulado "Activo", y el `lifecycleStatus` del silabo. El dev
probablemente homogeneizo ambos a "Activo", pero eso borra una distincion de dominio real
(disponibilidad del offering vs. silabo vigente/publicado) y va contra el vocabulario del producto.

(La remocion de la key `object.core_DataLog` en `common.i18n.json` no deja referencias colgantes:
los layouts referencian `core_DataLog` por `objectName`, no por esa key. El mod solo tiene
`lang/es`, sin otros locales en juego.)

**Trazabilidad del label** (de donde viene el nombre, como se presenta en las fuentes canonicas, y
donde se cambio):

- **Origen del nombre**: la etiqueta "Vigente" para `lifecycleStatus.Active` la introdujo Eduardo
  Bacon el 2026-07-08, commit `5446faa` (UPONE-1381-S4: "campo lifecycleStatus de Offering (silabo)
  + capabilities offering:{publish,archive} + lang ES + seed Draft"). Es decir, la eligio el autor
  del mismo ticket que definio la maquina de estados, no un cambio casual.
- **Migraciones intermedias (no cambian el valor)**: Nelson Cornejo movio el lang a
  `lang/es/Offering.json` (commit `078c4c7`, "Fase 3: Migracion de langs a arq. escalable",
  2026-07-08) y luego lo renombro a `lang/es/Offering.i18n.json` (commit `6ca0bc1`, "FIX: Cambios de
  claves... para evitar confusion con objetos", 2026-07-09). En ambos "Vigente" se preservo sin
  tocar; por eso la base del PR #18 (`0d0a810`) ya tenia `"Active": "Vigente"`.
- **Como se presenta en las fuentes canonicas**:
  - Confluence, workflow del plan (CAP-CUR-009): estado "Vigente".
  - Confluence, workflow del silabo/programa (CAP-CUR-035/019): estado "Publicado".
  - Ticket UPONE-1393 (el de este PR): usa "vigente" en su redaccion; no pide cambiar el copy.
  - Ticket UPONE-1381 (definio el enum): no fija la etiqueta en espanol del estado Active.
  - Ninguna fuente usa "Activo" para este estado.
- **Donde se cambio**: commit `a56a601` ("UPONE-1393 ajustes a columnas de status", Francisco
  Navarro, 2026-07-14), que hace `-"Active": "Vigente"` / `+"Active": "Activo"`. Es un commit propio
  del PR #18 (un solo padre, no es merge; verificado con `merge-base --is-ancestor`: no estaba en la
  base). No viene heredado de otro ticket: la base tenia "Vigente" y este PR lo piso a "Activo".

**Plan de mitigacion**:

1. Revertir el label a "Vigente" (alinea con CAP-CUR-009 y con el lenguaje del propio ticket 1393),
   o usar "Publicado" si se quiere el termino exacto del workflow del silabo (CAP-CUR-035).
   Confirmar cual de los dos con el autor de la spec (Esteban Cortes, dueno del catalogo CAP-CUR).
2. No dejar "Activo": no aparece en ninguna fuente para este estado y se confunde con el
   `status.Active` de engagement en el mismo archivo.

### Caso 7 (bajo / nitpick) - Identificadores internos del equipo filtrados a comentarios de codigo

Varios comentarios y descripciones agregados por el PR citan identificadores internos de la base de
conocimiento del equipo (referencias de decision, de regla y de spec, y codigos de proceso interno).
Aparecen en `seed/seed.js:53`, en las 3 descripciones de las capabilities nuevas de
`capabilities.json` (aca es la convencion ya establecida del archivo, no un patron nuevo), y en
comentarios de `documentDependents.js` y `polymorphicUpdate.resolver.js`. Para un dev que no usa esa
base de conocimiento no significan nada. Los identificadores de Jira (`UPONE-xxxx`) si estan bien.
No bloquea; es higiene.

**Plan de mitigacion**: reemplazar en esos comentarios los identificadores internos por el
identificador de Jira correspondiente (`UPONE-xxxx`), que es el que entiende cualquier dev del
equipo. Es un cambio de comentarios, no de logica.

### Nitpicks

- Trailing spaces en `seed/_data-rbac.js` (por ejemplo `'academicprogram:modify', `,
  `'curricularlink:create', `); Prettier los marca (afecta el criterio de aceptacion de lint).
- `export const _internals = { ..., curriculumUpdateMutation}` sin espacio antes de la llave
  (`curriculum-update.resolver.js`).
- `tests/unit/curriculumUpdate.test.js` sin salto de linea final.
- Comentario mal indentado en `polymorphicUpdate.resolver.js:677` (12 espacios vs 6 del codigo).

**Plan de mitigacion**: correr el formateador y el linter con autofix
(`npx prettier --write` + `npx eslint --fix`) sobre los archivos tocados; corregir la indentacion
del comentario a mano.

---

## Revisado y OK

- Transiciones `Active a Draft` gateadas con `*:revert`: `Curriculum.json:105`, `activity.json:141`,
  y agregada en `Offering.json:63` (`offering:revert`). Las reaperturas previas a la publicacion
  (`Approved a Draft`, `InReview a Draft`) siguen sin capability propia, coherente.
- Offering `status` pasa a `lifecycleStatus`: toca el campo propio del mod, no el `status` del
  modulo de engagement, asi que no hay choque entre mods.
- Quitar `canCreate:true` / `canEdit:true` de los listados: correcto, deja que RBAC gobierne los
  botones (el `true` fijo le ganaba a RBAC). No se re-trazo el motor de layout en runtime.
- Seed: en batch (2 findMany + 2 createMany), idempotente (`skipDuplicates`), reporta capabilities
  faltantes en vez de crear filas fantasma, corre en todos los tenants (roles deny por defecto) y
  el enlace de smoke solo en UPU.
- Mapa rol a capabilities: la separacion de funciones esta bien modelada. El problema no es el mapa,
  es que le falta la pata por campo (Caso 1).
- Guard de reverso cableado con tests que ejercitan el codigo real (el test prueba que corre en el
  dispatch, no en aislamiento).

---

## Contraste con el ticket (criterios de aceptacion)

| Criterio | Estado |
|---|---|
| `_data-rbac.js` (roles + mapa rol a capabilities + funcion que asegura el RBAC), invocado desde `seed.js`, prefijo `_` | Cubierto |
| Declarar `curriculum/activity/offering:revert` en `capabilities.json` | Cubierto |
| `Active a Draft` gateado en los 3 objetos | Cubierto |
| Verificar el catalogo de capabilities tras el sync | El seed lo reporta, sin evidencia de corrida adjunta |
| Consultor ve; Disenador crea/edita sin aprobar/publicar; Revisor aprueba sin publicar; Autoridad publica/revierte | El mapa lo modela; el enforcement real falla por el Caso 1, asi que "Autoridad si puede revertir" no se cumple end-to-end |
| Enforcement real (smoke por rol) | Sin evidencia adjunta |
| Tests RBAC por rol + lint/Prettier/tsc + lang ES | Tests presentes (a nivel de config, no de enforcement); Prettier fallaria por los trailing spaces; no se corrio lint/tsc |
| (Deseable) integridad de dependientes | Implementada, con las salvedades de los Casos 3 y 4 |

**Falso verde a vigilar**: el test de roles valida el mapa y la separacion de funciones, pero
ningun test asserta que un rol de transicion pase el gate de `modify` (que tenga `:modify` o la
capability por campo del estado). Ese es el test que habria atrapado el Caso 1. Los unit son
mockeados y no ejercitan el gate real de permisos, asi que dan verde con el bug presente. La
mitigacion es el test de regresion del Caso 1, punto 4.

---

## Veredicto

**Iterar** (post-merge, quedan follow-ups). El PR quedo con detalles. El mas grave sigue vivo en la
rama integrada: la gobernanza del ciclo de vida por rol no funciona porque Revisor y Autoridad no
pasan el gate de `modify`. El lado de core (el fallback por campo) ya lo resolvio el equipo de core;
falta solo cablear las capabilities por campo de estado en el seed del mod. Suma el tab "Historial"
incompleto en 7 layouts, el guard de dependientes sin filtro de estado, y objetos de matricula fuera
del alcance declarado con comentarios desactualizados.

Acciones concretas que faltan (orden sugerido):

1. Otorgar la capability por campo `<obj>.status:modify` a Revisor y Autoridad en `_data-rbac.js`,
   re-seedear y confirmar con smoke por rol en UPU.
2. Retirar el tab `history` de los 7 layouts hijos (el historial vive en el padre y en la vista de
   `core_DataLog` del mod, segun el diseno de origen), salvo decision de producto en contra.
3. Agregar el filtro de estado al guard de dependientes y cubrirlo con los 2 casos de prueba.
4. Resolver el destino de los objetos de matricula nuevos y actualizar los comentarios
   desactualizados.
5. Nitpicks: correr Prettier/eslint, corregir el comentario de `READ_CAPS`, revertir el relabel a
   "Vigente" o "Publicado" (no hay respaldo documental para "Activo", ver Caso 6), limpiar los
   identificadores internos de los comentarios.

---

## Comentario para el PR (neutro, apto para postear)

```markdown
# Review PR #18 - UPONE-1393 (follow-up post-merge)

El PR ya esta mergeado, asi que esto queda como follow-up, no como bloqueo de merge. El modelo
declarativo esta completo: 4 roles con separacion de funciones, mapa rol a capabilities, caps
`*:revert` declaradas, `Active a Draft` gateada en los 3 objetos, seed idempotente y bien testeado
a nivel de configuracion, y el guard de integridad del reverso implementado. Revise tambien el
comportamiento real en el backend, no solo la config. Queda un punto que sigue bloqueando el
objetivo del ticket, dos ajustes de tamano medio y unos nitpicks.

## 1. Revisor y Autoridad no pueden ejecutar sus transiciones (siguen frenados en la puerta de `modify`)

**Por que lo levanto:** al seguir el camino real de un cambio de estado en el backend, los roles
que deberian transicionar quedan bloqueados antes de que se mire su permiso de transicion.

Cambiar de estado (aprobar, publicar, revertir) es guardar el campo de estado, y toda edicion
pasa primero por `withObjectAuth('modify')` (`object-manager/src/graphql/resolvers/instance.resolver.js:3911`),
que exige el permiso de editar el objeto. Recien si pasas esa puerta corre el chequeo de la
transicion (`enforceEnumTransitions`, mismo archivo). La puerta (`checkObjectPermissions`,
`object-manager/.../authChecker.js:232`) deja entrar con: `<obj>:modify`, o una cap por campo
`<obj>.<campo>:modify` (fallback field-level, `authChecker.js:290-315`).

El lado de core que habilita esto ya esta resuelto por el equipo de core: el fallback field-level
para `modify` aterrizo en core como parte de este mismo esfuerzo (`instance.resolver.js:4127`:
"the withObjectAuth gate now also admits users who only hold a field-level modify cap"). Es decir,
la puerta de `modify` ya admite una cap por campo. Esto vive en core, quiza no lo tengas abierto.
Lo que falta es la mitad del lado del mod.

El detalle del lado del mod: el seed le da a Revisor/Autoridad solo caps de objeto de transicion,
y ninguna cap `:modify` ni por campo de estado:

    Disenador   -> activity:modify                            OK entra; lo frena bien no tener :approve
    Revisor     -> activity:approve  (sin :modify)            X  lo frena la puerta de modify
    Autoridad   -> activity:revert/:publish/... (sin :modify) X  lo frena la puerta de modify

**Efecto:** un Revisor al aprobar o una Autoridad al revertir reciben "Authorization Error: You do
not have permission to modify Activity objects" antes de que se mire su permiso de transicion. Hoy
solo el Admin transiciona.

### Como se soluciona
La mitad de core (fallback field-level) ya esta incorporada por el equipo de core; falta solo la
mitad del mod. En `seed/_data-rbac.js`, otorgar a Revisor/Autoridad las caps por campo de estado
(`activity.status:modify`, `curriculum.status:modify`, `offering.lifecycleStatus:modify`,
auto-generadas por core). Con eso pasan la puerta y pueden transicionar sin poder editar el resto
del contenido, que es la separacion de funciones que busca el ticket. Es un arreglo estatico;
conviene cerrarlo con un smoke por rol.

## 2. Se agrego el tab "Historial" a elementos hijos, que no deberian tenerlo

**Por que lo levanto:** el historial de cambios se ve desde el objeto padre (Activity, plan de
estudios, Offering, perfil de egreso) y desde la vista global de cambios; el tab del padre ya
incluye los cambios de sus elementos hijos (secciones, links), porque esos cambios se atribuyen al
padre. Este PR agrega ademas un tab "Historial" en los propios layouts hijos, que por diseno no
llevan historial propio.

    Activity/Curriculum/Offering/AcademicProgram_view -> definen "historyList" con objectName "core_DataLog"  OK (padres)
    rt__Content/Session/Bibliography/LearningOutcome/EvaluationComponent/CustomSection__curricularsection_view X tab agregado, no corresponde
    CurricularLink_view                                                                                        X tab agregado, no corresponde

Ademas el tab queda no funcional: referencia un elemento `historyList` que no esta definido en el
`schema` de esos 7 layouts (los padres si lo definen, con `objectName: "core_DataLog"` y un filtro
por el id del padre). Y no se puede completar copiando el bloque del padre, porque ese filtra por
el id del padre; un elemento hijo no tiene un historial propio en el mecanismo actual.

**Efecto:** en una seccion o un link aparece un tab "Historial" que no muestra nada, y que ademas
no encaja con el modelo donde el historial pertenece al documento padre. Lo recomendable es
retirar el tab de esos 7 layouts (el historial ya se ve desde el padre y desde la vista global).
Si producto realmente quisiera un historial acotado al registro hijo, es un cambio de diseno
aparte.

## 3. El guard de dependientes no filtra por estado de la matricula

**Por que lo levanto:** la funcion se llama `findActiveDependent` y la regla dice "dependientes
activos", pero las queries cuentan cualquier matricula, sin mirar su estado.

En `logic/helpers/documentDependents.js:864-889`, la query de Curriculum es
`planEnrollment.findFirst({ where: { curriculumId: id } })`, y `PlanEnrollment.status` es enum
`["Active","Closed"]` (definido en este mismo PR) pero se ignora. Igual para Offering/Activity
sobre `OfferingEnrollment` (ese no lo verifique a fondo, dejo la consulta).

**Efecto:** bloquea revertir un documento cuyas matriculas ya estan cerradas/dadas de baja.
Faltaria agregar `status: 'Active'` (o el filtro que corresponda) a cada `findActiveDependent`.

## Consultas (de donde salen en tu codigo)

1. **Objetos de matricula nuevos y comentarios contradictorios.** El PR agrega
   `objects/PlanEnrollment.json` y `objects/ProgramEnrollment.json` (objetos de dominio nuevos,
   generan tablas) sin capabilities, layouts ni seed, y fuera del alcance declarado del ticket. A
   la vez, los comentarios de `documentDependents.js` y `polymorphicUpdate.resolver.js` dicen
   "Curriculum queda como follow-up (sin modelo de matricula de plan). Cuando exista, anadir aqui
   la entrada Curriculum", pero el codigo si anade el modelo y si incluye y testea la entrada
   `Curriculum`. La intencion es dejar esos objetos como base de una feature de matricula, o
   entraron de mas? Si quedan, los comentarios habria que actualizarlos porque hoy confunden.
2. **`Offering.lifecycleStatus.Active` paso de "Vigente" a "Activo"** (`lang/es/Offering.i18n.json`).
   El ticket no lo pide, y la documentacion funcional del producto usa "Vigente" para el estado
   publicado del plan y "Publicado" para el del silabo; "Activo" no aparece en la spec para este
   estado. Puede que se haya homogeneizado con el `status.Active` de engagement ("Activo") que esta
   en el mismo archivo, pero eso mezcla dos conceptos distintos (disponibilidad del offering vs.
   silabo publicado). Convendria revertir a "Vigente" (o "Publicado" para el silabo). Intencional?
3. **Smoke por rol:** dejaste el enlace para poder seleccionar los roles y probarlos. Si lo
   corriste, podrias adjuntar el resultado por rol? Y que sea con el rol seleccionado en el
   selector, no como Admin (el Admin tiene todo y taparia el rechazo del punto 1).

## Nitpicks
- Comentario desactualizado en `READ_CAPS` (`seed/_data-rbac.js`): menciona `changelog:view` /
  objeto `ChangeLog`, pero el array otorga `core_datalog:view` y los layouts usan
  `objectName: "core_DataLog"`. El codigo esta bien; el comentario induce a error.
- Trailing spaces en `seed/_data-rbac.js` (por ejemplo `'academicprogram:modify', `,
  `'curricularlink:create', `); Prettier los marca.
- `export const _internals = { ..., curriculumUpdateMutation}` sin espacio;
  `tests/unit/curriculumUpdate.test.js` sin newline final; comentario mal indentado en
  `polymorphicUpdate.resolver.js:677`.

## Lo que revise y esta bien
- Transiciones `Active a Draft` gateadas con `*:revert` en Curriculum, Activity y (nueva) Offering.
  Las reaperturas previas a la publicacion (`Approved a Draft`, `InReview a Draft`) siguen
  abiertas, coherente.
- Offering `status` pasa a `lifecycleStatus`: toca el campo propio del mod, no el `status` de
  engagement, sin choque de datos.
- Sacar `canCreate:true`/`canEdit:true` de los listados: correcto, deja que RBAC gobierne los
  botones (el `true` fijo le ganaba a RBAC).
- Seed: idempotente (`skipDuplicates`), en batch, reporta caps faltantes en vez de crear filas
  fantasma; corre en todos los tenants (roles deny por defecto) y el enlace de smoke solo en UPU.
- Mapa rol a caps: la separacion de funciones esta bien modelada. El problema no es el mapa, es que
  le falta la pata por campo (punto 1).

**Severidad del punto 1: alta, es lo que impide cumplir el objetivo del ticket** (los roles nuevos
no transicionan; incumple "Autoridad si puede revertir" y la separacion de funciones). El lado de
core ya esta resuelto; el arreglo pendiente es solo del lado del mod. **Punto 2: media** (feature
de UI visible pero no funcional en 7 layouts). **Punto 3: media** (over-blocking del reverso).

**Veredicto:** iterar, cablear las caps por campo de estado a Revisor/Autoridad en el seed,
completar/retirar el tab de historial en los 7 layouts, agregar el filtro de estado al guard de
dependientes, y adjuntar el smoke por rol en UPU.
```
