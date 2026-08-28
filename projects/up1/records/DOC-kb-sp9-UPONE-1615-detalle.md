---
id: DOC-kb-sp9-UPONE-1615-detalle
project: up1
type: doc
---

# UPONE-1615 - Curriculum Design & Curriculum Mapping | Implementar logica de Roles internos

> Tarea · Prioridad **Critica** · Epic UPONE-1267 Curriculum Design · **Sin asignar en Jira** · Story Points en Jira: sin asignar
> Sprint: Migracion uAssessment SP9 · Cruza dos mods: curriculum-design y curriculum-mapping
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1615
>
> **Nota para postear en Jira:** el ticket ya tiene descripcion del PO, asi que este detalle va como
> **comentario**, no pisando la descripcion.

## Fuente canonica (PO)

> Criterios de aceptacion:
>
> - Para la lista de roles estandar ya definidos en Curriculum Design & Curriculum Mapping se debe
>   migrar la logica actual a la nueva logica de "Roles internos" -> Definir en tiempo de sprint o
>   refinamiento el mapeo entre los internos y los generales.
> - Validar (y completar e nlos casos necesarios) que los roles permiten hacer las acciones
>   declaradas. Por ejemplo, la creacion del plan de estudio requiere permisos sobre instituciones por
>   lo que el rol debe incluir dichas capabilities

Sin comentarios ni adjuntos. El request no se reescribe.

## Vocabulario

Tres cosas distintas que el enunciado mezcla. Se usan asi en todo el documento:

| Termino | Que es | Ejemplo |
|---|---|---|
| **Rol** | Rol institucional. Es lo que se le asigna a una persona y lo que el cliente ve | `Learning Assurance - Diseñador Curricular` |
| **Set de permisos** | El conjunto de permisos que un modulo concede. Es lo que la plataforma llama "rol interno", y se renombra aqui para no confundirlo con el rol | `Curriculum Design - Diseñador Curricular` |
| **Vinculo** | La fila que dice "en este modulo, este rol usa este set" | rol anterior + app cd + set de cd |

## Historia de usuario

Como **administrador de la plataforma**, quiero que los permisos curriculares se declaren como sets por
modulo y que los roles curriculares apunten al set del modulo correspondiente, para que Curriculum Design y
Curriculum Mapping puedan conceder alcances distintos al mismo rol sin pisarse, para que los nombres de los
roles no se confundan con los del core ni con los de otros productos, y para que un Diseñador Curricular pueda
completar de punta a punta las acciones que su rol declara.

## Objetivo

Que los permisos curriculares dejen de colgar directo del rol y pasen a declararse como sets por modulo;
que los cuatro roles de la familia queden renombrados con su prefijo y vinculados al set de cada modulo donde
operan; que lo que quedo en desuso se retire; y que las capabilities de cada rol alcancen efectivamente para
las acciones que promete, empezando por el caso que el PO nombra: crear un plan de estudio requiere poder
elegir su institucion dueña.

## El modelo decidido

**Los roles son de la familia; los sets son de cada modulo.** Curriculum Design y Curriculum Mapping son
hermanos y comparten a proposito el mismo juego de cuatro roles. Habra un tercer hermano.

**Cuatro roles**, renombrados con el prefijo de la familia. El nombre del rol va en espanol porque es lo que
ve el cliente:

- `Learning Assurance - Consultor Curricular`
- `Learning Assurance - Diseñador Curricular`
- `Learning Assurance - Revisor Curricular`
- `Learning Assurance - Autoridad Curricular`

**Ocho sets**, uno por rol y por modulo. El nombre del modulo va en ingles, igual que el nombre del mod:

- `Curriculum Design - <Rol>` (4)
- `Curriculum Mapping - <Rol>` (4)

Con el tercer hermano seran 12, sin decisiones nuevas a nivel de rol.

**Estructura de base mas extension.** El set de Consultor esta contenido integro en los otros tres, en los dos
modulos, asi que se declara como base y los otros tres heredan de ella:

| Modulo | Base (Consultor) | Revisor | Diseñador | Autoridad |
|---|---|---|---|---|
| Curriculum Design | 14 | base + 5 | base + 27 | base + 28 |
| Curriculum Mapping | 4 | base + 2 | base + 8 | base + 8 |

Total a declarar: **2 bases mas 6 extensiones**.

**La composicion es por modulo, no espejo.** Cada set se dimensiona a lo que ese rol hace en ese modulo; la
asimetria de la tabla ya existe en el dato. Un usuario puede tener el set de Curriculum Design y no el de
Curriculum Mapping, porque el vinculo es por app.

**Los transversales van en las dos bases.** Ver el historial de cambios y ver el nombre de usuario se declaran
en la base de los dos modulos. Declararlos dos veces no tiene costo porque la inyeccion deduplica por nombre, y
a cambio cada modulo queda autosuficiente.

**El permiso de institucion vive en la base de Curriculum Design**, con lo que los cuatro roles lo reciben. Es
el criterio 2 del PO, y viaja dentro del set en vez de ser un cableado suelto.

Motivos, evidencia y alternativas descartadas de cada decision: ver pre-intake, seccion "Motivos y evidencia
del modelo decidido", y `sp9/UPONE-1615-registro-de-decisiones.md`.

## Alcance

**Dentro:**

1. Declarar los sets por modulo: 2 bases mas 6 extensiones, con la composicion por modulo de la tabla.
2. Declarar el permiso de institucion en la base de Curriculum Design (criterio 2 del PO), y los
   transversales en las dos bases.
3. Renombrar los cuatro roles al formato `Learning Assurance - <Rol>`, **con un paso de renombre explicito en
   el seed** que reutilice el rol existente en vez de crear uno nuevo.
4. Crear los vinculos de los cuatro roles de la familia hacia el set de cada modulo donde operan.
5. Retirar lo que quedo en desuso: el rol huerfano `GestorCurricular` y los dos sets de fixture
   (`GestorCurricular`, `LectorCurricular`).
6. Auditar rol por rol que las capabilities alcancen para las acciones que el rol promete, y completar las que
   falten.
7. Cobertura que ejercite el camino real (vinculo, herencia, deduplicacion, renombre sin forkear), no solo los
   fixtures del mecanismo.
8. Avisar al equipo de core el punto ciego de la proteccion de nombres (no bloqueante, es un hallazgo de
   plataforma).

**Fuera:**

- Construir o modificar el mecanismo de sets: ya existe en la plataforma.
- El **mapeo de los roles que posee el core** (`Admin`, `Consultor`, `Coordinador` y el resto) hacia los sets
  curriculares: es la decision abierta. La parte de la familia no esta bloqueada por esto.
- El tercer hermano de la familia: entra despues, sin decisiones nuevas a nivel de rol.
- La capacidad de **orden de vistas por rol**, que el equipo declaro como capacidad del core aun no necesaria.
- El provisioning por nodo de institucion en ambientes productivos: es operacion, no codigo de estos mods.
- Filtrar el selector de institucion por tipo academico: mejora aparte.
- Acotar el permiso de ofertas del Diseñador: requiere acuerdo con engagement (ver Dependencias).

## Criterios de aceptacion (checkeables)

- [ ] Los cuatro roles curriculares se llaman `Learning Assurance - <Rol>`, con el nombre del rol en espanol.
- [ ] El renombre **reutiliza** los roles existentes: siguen siendo 4 roles, con sus 120 asignaciones de
      personas intactas, y no quedan roles con el nombre anterior.
- [ ] Curriculum Design declara su base (`Curriculum Design - Consultor Curricular`) y tres sets que heredan
      de ella, con la composicion de la tabla del modelo.
- [ ] Curriculum Mapping declara los suyos para su propia App, sin depender de que su seed corra antes o
      despues del de curriculum-design.
- [ ] Ningun nombre de set coincide con un nombre de rol.
- [ ] Los cuatro roles tienen su vinculo hacia el set de cada modulo donde operan, y el vinculo queda visible
      en la administracion de la plataforma.
- [ ] Un usuario con uno de esos roles obtiene en runtime las capabilities del set, incluidas las heredadas de
      la base.
- [ ] Un usuario con el set de Curriculum Design y sin el de Curriculum Mapping conserva sus permisos de
      Design y no obtiene los de Mapping.
- [ ] Los transversales (historial, nombre de usuario) llegan por cualquiera de los dos modulos por separado.
- [ ] Un Diseñador Curricular puede completar la creacion de un plan de estudio de punta a punta, incluyendo
      la seleccion de su institucion dueña.
- [ ] Cada uno de los cuatro roles fue auditado contra las acciones que declara, y las capabilities faltantes
      quedaron agregadas o justificadas como intencionalmente ausentes.
- [ ] El rol huerfano `GestorCurricular` y los dos sets de fixture ya no existen en el tenant, y el sync no los
      regenera.
- [ ] Existe cobertura que ejercita el camino real, no solo los fixtures del mecanismo.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp9/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] **Permisos efectivos verificados en el tenant UPU con evidencia runtime**, entrando con cada rol y
      ejecutando sus acciones: no basta con que la capability este en base ni con que el test unit pase.
- [ ] El caso del PO verificado end to end: crear un plan de estudio como Diseñador Curricular, con el select
      de institucion poblado.
- [ ] **Sin regresion: ningun rol pierde capabilities** respecto del estado previo, comparado antes y despues
      con el mismo criterio.
- [ ] **El renombre verificado sobre una base que ya tenia los nombres viejos**, no solo sobre base limpia:
      4 roles, no 8, y asignaciones conservadas.
- [ ] Sync corrido; sets materializados en base sin colisiones de nombre.
- [ ] Limpieza verificada: el rol huerfano y los sets de fixture retirados, y una segunda corrida del sync no
      los vuelve a crear.
- [ ] Cobertura del camino real agregada y verde.
- [ ] Doc actualizada: el cambio es observable en RBAC y afecta a los dos mods, incluidos los nombres de rol
      que 5 documentos referencian.
- [ ] Aviso al equipo de core enviado por el punto ciego de la proteccion de nombres.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Cada set declarado se materializa en base tras el sync, con sus capabilities.
- [ ] Un set que hereda de la base resuelve la union de los dos, y la base no queda duplicada.
- [ ] Un permiso declarado en las dos bases se inyecta **una sola vez**.
- [ ] Un rol con vinculo -> el usuario obtiene las capabilities del set en runtime.
- [ ] Un rol sin vinculo -> conserva exactamente las capabilities que tenia (sin regresion).
- [ ] Con el set de Curriculum Design y sin el de Mapping -> tiene los de Design y no los de Mapping.
- [ ] **Renombre sobre base con los nombres viejos** -> 4 roles, asignaciones conservadas, ninguno con el
      nombre anterior.
- [ ] Diseñador Curricular -> puede listar instituciones y crear un plan de estudio.
- [ ] Consultor Curricular -> **no** puede crear ni modificar (el rol de solo lectura sigue acotado).
- [ ] Los seeds de los dos mods corridos en cualquier orden -> el resultado de roles, sets y capabilities es el
      mismo.
- [ ] Paridad entre los dos mods: el test existente sigue verde, o se actualiza a proposito si la composicion
      por modulo lo obliga.
- [ ] Auditoria por rol: para cada uno de los cuatro, cada accion que declara tiene su capability.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): **es el nucleo del ticket**. Sets declarados, roles renombrados y vinculados,
      capabilities completas y verificadas como permisos efectivos por rol activo.
- [ ] Historial / auditoria (DataLog): el permiso de ver el historial entra como transversal en las dos bases.
      Auditar las asignaciones de rol en si es alcance aparte.
- [ ] Capa de lenguaje (i18n): aplica a los nombres y descripciones de roles y sets si se muestran en la
      administracion, en es/en/pt con paridad. Ojo: el nombre del rol va en espanol y el del modulo en el set
      va en ingles, a proposito.
- [ ] Accesibilidad (WCAG): N/A. No se construye UI nueva; la administracion de roles ya existe.
- [ ] Storybook: N/A.
- [ ] Design tokens (`var(--up1-*)`): N/A.
- [ ] Documentacion: aplica. Cambio observable de RBAC que cruza dos mods, afecta al provisioning y cambia
      nombres de rol que la doc referencia.
- [ ] Convenciones de mod: aplica. Naming de capabilities (objeto sin prefijo de mod, capability de mod con su
      prefijo), declaraciones en el mod, seed idempotente, sync sin editar archivos sincronizados, tenant
      isolation.

## Dependencias

**Depende de:** UPONE-1353 y UPONE-1354 (ambas Finalizadas), que construyeron el mecanismo de sets y la
resolucion de layouts por set. Sin ellas este ticket no seria posible; con ellas, es una migracion.

**Se relaciona con:** UPONE-1393 (Finalizada), que definio los roles del mod y su cableado de capabilities, y
es el punto de partida de la migracion. El hueco de la capability de institucion se origina ahi.

**Habilita:** que los flujos curriculares se puedan operar con rol curricular en vez de con rol administrador,
que es el workaround vigente hoy. Y que el tercer hermano de la familia entre sin decisiones nuevas de rol.

**Coordinar con UPONE-1619 (hermano SP9, mismo mod).** Es la coordinacion mas concreta del sprint y va en los
dos sentidos:

- **Mismo archivo.** 1619 declara las capabilities de sus dos objetos nuevos en
  `mods/curriculum-design/seed/_data-rbac.js`, que es exactamente el archivo que este ticket reestructura.
  Ejecutarlos en paralelo sobre ese archivo es pisarse.
- **Mismo cableado.** El DoD de 1619 dice "capabilities cableadas a los roles curriculares existentes": si el
  cableado pasa a vivir en los sets, 1619 tiene que saberlo antes de escribirlo, **y los nombres de rol
  cambian**.
- **Agrava el problema del `Consultor`.** Toda capability nueva se asigna automaticamente a `Admin`,
  `Consultor` y `Colaborador`. 1619 introduce dos objetos nuevos en curriculum-design y 1633 los suyos en
  curriculum-mapping: los dos engordan el acceso en bloque de `Consultor` dentro de este mismo sprint.

**Coordinar con UPONE-1616.** Crear las filas de vinculo cierra la visibilidad de las apps curriculares, y
1616 cierra con captura del menu de esas mismas apps en UPU. Avisar antes de crear los vinculos, porque define
con que usuario se puede tomar esa evidencia.

**Coordinar con engagement** por el permiso de ofertas del Diseñador, si se decide acotarlo aqui.

**Coordinar con UPONE-1530**, porque el MCP usa los permisos del usuario real como frontera: lo que el MCP
puede hacer cambia con este ticket, y los nombres de rol tambien.

## Estimacion

**8 SP**.

El peso no esta en declarar los sets, esta en **verificar**: cuatro roles por dos modulos con evidencia
runtime, mas el renombre con su paso de migracion en el seed, mas el retiro de tres entidades y la
comprobacion de que el sync no las regenera.

**Palancas de cambio:**

- Sube a 13 si el mapeo de los roles del core destapa que hay personas operando con `Consultor` en los
  modulos curriculares y hay que sostener convivencia, o si la auditoria destapa huecos en varios roles.

Detalle de por que no 5 y por que no 13: ver pre-intake, seccion "Motivos de la estimacion".

## Decision abierta

> Una sola, y no bloquea la parte de la familia: los cuatro roles curriculares ya tienen su mapeo definido
> (cada uno al set homonimo de cada modulo donde opera). Lo que falta es el otro lado.

- [ ] **El mapeo entre los roles que posee el core y los sets del mod.** Sigue abierto, **diferido dentro de
      SP9 y sin tocar core**. Definir si `Admin`, `Consultor`, `Coordinador`, `Colaborador`, `Estudiante` y el
      resto toman set en los modulos curriculares, y cual. Detalle rol por rol en el registro de decisiones (O1).
      Decisiones ya tomadas:
      - **`Consultor`: no se toca core.** La correccion de su alcance de caps (166 capabilities, mismas que
        `Admin`) NO se hace en 1615, porque el acceso lo produce un mecanismo de core
        (`assignNewCapabilitiesToDefaultRoles`, `object-manager/src/services/auth/generateCapabilities.js:332`)
        y corregirlo seria tocar core. La correccion de caps queda diferida. Lo unico que se resuelve por el
        lado mod es la **visibilidad**: no darle vinculo lo saca de la navegacion curricular sin alterar sus
        caps de core.
      - **Coordinador: fuera.** No recibe set en las apps curriculares. Si luego se necesita, se agrega en la
        fase de mapeo de roles core que queda diferida.
      - **La visibilidad de los dos modulos.** Al crear la primera fila de vinculo dejan de ser publicos y se
        ven solo por los roles de la lista. La matriz de que roles quedan (familia LA mas Admin como base) se
        firma **antes** de crear vinculos; ese paso es el que espera el mapeo.
      Particion resultante:
      - **Arranca ya (mod-only):** declarar los 8 sets, renombrar la familia, retirar el huerfano y los dos
        fixtures, completar la capability de institucion, y la cobertura del camino real.
      - **Diferido dentro del ticket:** crear los vinculos y la consiguiente privatizacion de las apps. Es
        parte de 1615, pero se ejecuta **cuando este definido el mapeo de roles core**, no antes.

**Item de coordinacion, no de diseno:** el permiso de ofertas del `Diseñador Curricular` sobre el objeto
compartido con engagement. Se acota en este ticket o se registra de nuevo; requiere acuerdo con ese equipo.

**Pendiente administrativo:** el ticket sigue **sin asignar en Jira**, con prioridad Critica. En el
refinamiento la migracion quedo a nombre del PO y el fix del rol de diseñador a nombre del dev, lo que dejo el
dueno del ticket completo sin definir.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas y patrones (a favor) y antipatrones (evitar) de up1 que aplican a
> este ticket. Todo verificado en la rama vigente.

- **[Advertencia]** Verificar el enunciado contra el estado real antes de ejecutar: el mecanismo que el titulo
  pide implementar ya existe. _Fuente: UPONE-1353 y UPONE-1354 (Finalizadas)._
- **[A favor]** Los sets se declaran como archivos del mod y el sync los materializa; son unicos por App, lo
  que permite que cada mod defina su propia composicion. _Fuente: `dbSync.js:1245`;
  `mods/curriculum-design/roles/`._
- **[A favor]** **Un set solo concede, nunca niega.** Su tabla de capabilities no tiene el campo con
  `allow`/`prohibit`/`inherit` que si tiene la tabla del rol. No hay contradiccion posible entre dos sets.
  _Fuente: `object-manager/objects/core/core_ModRoleCapability.json`._
- **[A favor]** **Lo que el rol declara gana.** La inyeccion salta el permiso si el rol ya lo tiene, con
  cualquier valor, asi que un set **no puede pisar un `prohibit`** deliberado. La migracion es segura en esa
  direccion. _Fuente: `modRoleCapabilities.js:16-30`._
- **[A favor]** **La inyeccion deduplica por nombre**, asi que declarar un transversal en las dos bases no
  tiene costo. _Fuente: idem._
- **[A favor]** La herencia soporta cadenas de varios niveles con guarda de ciclos, asi que la estructura de
  base mas extension se puede partir mas si el conjunto transversal crece. _Fuente:
  `modRoleCapabilities.js:32-40`._
- **[Advertencia]** **El vinculo es por app, pero los nombres de capability no tienen dimension de app.** Lo
  que se decide por modulo es *quien recibe* el permiso, no *donde aplica*. Es la raiz del riesgo del permiso
  de ofertas. _Fuente: `modRoleCapabilities.js:74-110`; `authChecker.js`._
- **[Advertencia]** **Un rol tiene como maximo un set por app**, asi que "sumar permisos especificos de
  Mapping" se expresa dentro del set de Mapping de ese rol, no apilando sets. _Fuente: unicidad de
  `up1_suite_app_role` por app y rol._
- **[Evitar]** **No renombrar cambiando solo el literal del seed.** Los seeds crean los roles por nombre: sin
  un paso de renombre se crean cuatro roles nuevos y quedan los viejos con sus asignaciones. Y el paso va en el
  seed, no como SQL manual. _Fuente: `seed/_data-rbac.js` de los dos mods._
- **[Evitar]** **No poner nombres de set en el campo `roles` de un layout.** Es lo que origino el rol
  huerfano: la plataforma no encuentra el rol y **lo crea automaticamente**. La causa ya se corrigio en el
  layout, pero la regla queda. _Fuente: `dbSync.js:846-852`._
- **[Advertencia]** **La proteccion contra nombres repetidos es ciega a los roles creados por seed y por
  layout**: solo lee los `roles` de los `app.json`. Por eso la convencion de nombres tiene que hacer el
  trabajo. _Fuente: `dbSync.js:1030-1040`._
- **[Advertencia]** Con un rol activo seleccionado los permisos **no se acumulan** con los de otros roles del
  usuario: la capability debe llegar por el rol con el que se opera. _Fuente: `authChecker.js:115-121`._
- **[A favor]** Las capabilities de objeto se auto-generan por objeto y accion; para un objeto base del core
  no hay que crear capability, solo referenciarla. Y un set puede declarar permisos de objetos de plataforma,
  no solo del mod. _Fuente: `generateCapabilities.js:117-119`._
- **[Evitar]** No crear roles nuevos para resolver un hueco de permisos: los cuatro roles ya existen y el
  hueco se llena en el set. _Fuente: `mods/curriculum-design/seed/_data-rbac.js`._
- **[Evitar]** No negar la lectura de institucion para "que no vean todo": rompe la creacion de planes. El
  alcance se controla por el nodo donde se asigna el rol. _Fuente: `instance.resolver.js:1539`._
- **[Advertencia]** **Una app sin roles asignados es publica.** Crear la primera fila de vinculo cierra la
  visibilidad del modulo. _Fuente: `suite/logic/app.resolver.js:118-129`._
- **[Advertencia]** El test de paridad entre los dos mods falla si las definiciones divergen. La duplicacion
  de roles es intencional; si la composicion por modulo obliga a divergir, el test se actualiza a proposito y
  se documenta. _Fuente: `mods/curriculum-mapping/seed/_data-rbac.js:11-19` y su test de paridad._
- **[Gate]** Los permisos se cierran con evidencia runtime, no con la capability en base: entrar con el rol y
  ejecutar la accion. _Fuente: estandar DoD del equipo._
- **Transversal:** tenant isolation en toda query; correr sync; no editar archivos sincronizados a mano ni
  commitear artefactos de sync/seed; en codigo, commits y PR usar solo el id de Jira. _Fuente:
  `up1/CLAUDE.md`._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1353 | RBAC-01: un rol puede tener un set distinto en cada mod | dependencia satisfecha: construyo el mecanismo que este ticket adopta | Finalizada |
| UPONE-1354 | RBAC-02: los layouts de un mod se resuelven por el set del usuario | dependencia satisfecha: completa el mecanismo del lado de layouts | Finalizada |
| UPONE-1393 | Curriculum Design: roles estandar del mod + wiring de capabilities | antecedente: definio los cuatro roles y su cableado, con las herramientas que existian en julio | Finalizada |
| UPONE-1538 | Configuracion de plan de estudio modular | donde se destapo el hueco de permisos sobre institucion durante su smoke | Finalizada |
| UPONE-1619 | Implementacion de InstructionalComponent | hermano SP9 en curriculum-design; **coordinar**: declara capabilities en el mismo `seed/_data-rbac.js` que este ticket reestructura, su DoD las cablea a estos mismos roles, y **los nombres de rol cambian** | Backlog |
| UPONE-1616 | Ajustar orden de los menus | hermano SP9; **coordinar**: crear los vinculos deja de hacer publicas las apps curriculares, y ese ticket cierra con evidencia runtime del menu de esas apps | Backlog |
| UPONE-1530 | Curriculum Mapping MCP sync | hermano SP9; el MCP usa los permisos del usuario real como frontera, asi que lo que puede hacer cambia con este ticket | Backlog |
| UPONE-1633 | Matriz de competencia: adopcion y competencias | hermano SP9 en curriculum-mapping; sus objetos nuevos necesitaran capabilities en estos mismos sets, y engordan el acceso de `Consultor` | Backlog |

## Referencias

- Fuente canonica: UPONE-1615 (criterios de aceptacion del PO).
- Refinamiento 2026-08-13: `transcripts/2026-08-13-refinamiento-sprint-uassessment.md` (migracion de la logica
  de roles, mapeo interno a estandar, el caso de permisos sobre instituciones, y la duda abierta de donde vive
  cada parte).
- **Registro de decisiones** (interno, es el historial de por que el modelo es este):
  `sp9/UPONE-1615-registro-de-decisiones.md`. Nueve decisiones cerradas con su motivo, evidencia y alternativas
  descartadas; la decision abierta con el detalle rol por rol; los hechos de plataforma verificados; y las
  correcciones de analisis que hubo en el camino.
- **Documento de decisiones para el PO** (interno, el material con el que se decidio):
  `sp9/UPONE-1615-decisiones-de-roles-po.md` y su version publicada como artefacto. En lenguaje de negocio:
  que roles hay de core y de los mods, el conflicto y como se resuelve, y las decisiones con su consecuencia.
- **Inventario tecnico de roles** (interno, anexo del anterior):
  `sp9/UPONE-1615-inventario-de-roles.md`. Los 21 roles institucionales del tenant con sus capabilities, los
  sets existentes, los vinculos actuales, el desglose por dominio de los cuatro roles curriculares, y el
  analisis de causa raiz del conflicto de nombre `GestorCurricular` con su rastro en codigo e historial.
- Diagnostico previo del hueco de permisos (interno, no pegar en Jira):
  `sp8/UPONE-1538-rbac-institution-view-gap.md`, con la decision ya respaldada y diferida de SP8.
- **Pre-intake** (interno, contexto y razonamiento completo detras de este detalle):
  `sp9/UPONE-1615-pre-intake.md`.
- Codigo: `mods/curriculum-design/seed/_data-rbac.js`, `mods/curriculum-design/roles/`,
  `mods/curriculum-mapping/seed/_data-rbac.js`, `object-manager/objects/core/core_ModRole.json`,
  `object-manager/src/services/auth/modRoleCapabilities.js`, `object-manager/scripts/sync/dbSync.js`.
