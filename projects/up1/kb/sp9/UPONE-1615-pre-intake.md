# UPONE-1615 - Pre-intake (guia de implementacion)

> Material del implementador. **No va a Jira.** Alimenta el intake de DKC: entrega el enfoque decidido, las
> hipotesis a validar y los riesgos tecnicos, para que el intake genere y valide hipotesis en vez de investigar
> desde cero. Contrato del ticket (linea de ejecucion, lo que se pega en Jira): `UPONE-1615-detalle.md`.
>
> **Revision 2026-08-17.** La version anterior presentaba cuatro enfoques abiertos (con convivencia temporal
> como recomendacion de partida). **El PO cerro el modelo**, asi que el enfoque ya no se elige: los roles se
> renombran en su lugar y no hay convivencia. Los motivos de cada decision estan en
> `sp9/UPONE-1615-registro-de-decisiones.md`.
>
> **Revision 2026-08-18.** Se cerro la particion de la decision abierta (mapeo de roles core): diferida dentro
> del mismo ticket, sin tocar core. Ver "Decision abierta" mas abajo (integrada tal cual quedo resuelta, sin
> revolver con el resto del contexto).

## Veredicto y superficie

**Veredicto: es una migracion con el modelo ya decidido.** El mecanismo esta construido y probado en el core
(entro con UPONE-1353 y UPONE-1354, ambas Finalizadas), y **ningun modulo lo usa todavia**: los 16 vinculos
existentes no tienen set asignado. Seriamos los primeros, asi que el camino no esta ejercitado y no conviene
asumirlo.

**Superficie estimada:** 8 archivos de declaracion de set (2 bases mas 6 extensiones, repartidos en dos mods),
2 seeds de RBAC (renombre de rol, reestructura del mapa de capabilities, retiro de fixtures), 2 tests de RBAC,
5 documentos que citan los nombres de rol, y los vinculos como dato. Sin codigo de core.

**El peso real esta en la verificacion de permisos efectivos rol por rol**, que no es superficie de archivo
sino trabajo de smoke, mas el paso de renombre, que es donde esta el riesgo de forkear.

## Contexto (para dimensionar)

**El enunciado dice "implementar" pero el mecanismo ya existe.** Esta es la observacion que mas cambia
el dimensionamiento del ticket, y esta verificada en codigo:

- La infraestructura esta construida y probada: el modelo de set por App con herencia, su tabla de
  capabilities, el campo del vinculo, el sync que lee las declaraciones desde el mod, el enriquecimiento de
  permisos en runtime, y la UI de administracion para asignar el set. Entro con UPONE-1353 y UPONE-1354 (ambas
  Finalizadas), y la administracion de tabs y homescreen con UPONE-1513 (Finalizada).
- **Ningun modulo de la plataforma lo usa todavia.** Los 16 vinculos existentes no tienen set asignado.
  Seriamos los primeros, asi que no hay que asumir que el camino esta ejercitado.
- **Hoy los permisos cuelgan del rol.** Los cuatro roles curriculares reales viven como roles institucionales
  sembrados en codigo por cada mod (`mods/curriculum-design/seed/_data-rbac.js:36-57`), con su mapa rol a
  capabilities en el mismo archivo (`:89-168`). Curriculum-mapping **copia literalmente** esas definiciones
  (`mods/curriculum-mapping/seed/_data-rbac.js:47-68`) y tiene un test de paridad que falla si los dos
  archivos divergen. **Esa duplicacion es intencional** (los hermanos comparten el juego de roles), y el test
  guarda el invariante.
- **Lo unico que existe del lado nuevo son fixtures.** En curriculum-design hay dos declaraciones de set y
  ambas se autodescriben como *fixture* de la prueba de RBAC-01
  (`mods/curriculum-design/roles/GestorCurricular.json`, `LectorCurricular.json`). Curriculum-mapping no tiene
  ni el directorio. La cadena del fixture de RBAC-02 esta cortada en dos puntos (no hay vinculo, y
  `Coordinador` tampoco tiene `academicprogram:view` por otra via).
- **El caso del PO esta confirmado y ya tiene diagnostico.** El rol Diseñador Curricular **no tiene ninguna
  capability de institucion**. La cadena real: el plan de estudio y el programa academico declaran la
  institucion como FK requerida (`mods/curriculum-design/objects/Curriculum.json:103, 160`;
  `objects/AcademicProgram.json:61-69, 89`), el formulario de creacion la pide como select
  (`config/layouts/default_AcademicProgram_create.json:49-53`), poblar ese select lista instancias de
  institucion, y ese listado exige la capability de lectura del objeto
  (`object-manager/src/graphql/resolvers/instance.resolver.js:1539`). La capability existe (se auto-genera por
  objeto en `object-manager/src/services/auth/generateCapabilities.js:117-119`) y se entrega por defecto a los
  roles base de la plataforma, pero no a los curriculares.
- **Detalle que importa para el alcance:** operando con un rol activo seleccionado, los permisos **no se
  acumulan** con los de otros roles del usuario, asi que la capability tiene que llegar por el rol con el que
  se opera. Y limitar que instituciones ve cada usuario **no** se logra negando la lectura (eso rompe el
  flujo), sino acotando el rol al nodo de institucion en el provisioning.
- **El "seguro" por orden de corrida que el equipo menciono existe.** Esta en el seed de curriculum-mapping
  (`seed/_data-rbac.js:11-17`): escritura idempotente porque el orden entre seeds de mods no esta garantizado,
  justamente porque los dos mods siembran los mismos roles por nombre global. Con sets, que son unicos por App,
  la parte de permisos deja de colisionar; el seguro sobre el rol compartido se conserva porque el rol sigue
  siendo compartido a proposito.

**Herencia de UPONE-1393 (Finalizada, SP6), el ticket que creo estos cuatro roles.** Su alcance declarado era
sustituir el estado en que "un unico rol, Consultor, tenia acceso total" e introducir separacion de funciones.
Entrego eso y funciona.

**Nada de esto fue un descuido.** Con la evidencia y las herramientas de julio, cada decision de 1393 era la
correcta, y el dato que lo ordena es la cronologia:

| Ticket | Que entrego | Resolucion |
|---|---|---|
| **UPONE-1393** | Los cuatro roles curriculares, por el camino directo | **2026-07-20** |
| UPONE-1354 (RBAC-02) | Layouts resueltos por set | 2026-07-29 |
| **UPONE-1353 (RBAC-01)** | **El mecanismo de sets en si** | **2026-08-14** |

El mecanismo que este ticket adopta se cerro **25 dias despues** que 1393. No lo ignoro: **no existia
terminado**. Uso el patron vigente y probado (`mods/uengagement-up1/seed/_data-rbac.js`, citado en su propia
descripcion), que era la eleccion correcta.

Dos cosas quedaron abiertas y siguen abiertas, porque **cambio el contexto, no la calidad de esas
decisiones**:

1. **El acceso en bloque de `Consultor`, que no correspondia retirar entonces.** UPONE-1393 declaraba
   explicitamente **"cero toque a core"**, y ese acceso no viene del mod: lo produce un mecanismo de la
   plataforma que asigna cada capability nueva a los roles por defecto. Retirarlo habria sido tocar core y
   afectar a todos los mods. Hoy tiene **166 capabilities curriculares, las mismas que `Admin`**, incluidas
   crear, modificar, eliminar, publicar, aprobar, revertir, deprecar, archivar, versionar y clonar. Es mas
   amplio que `Autoridad Curricular` (54). Y **crece solo**: `assignNewCapabilitiesToDefaultRoles`
   (`generateCapabilities.js:330-357`) asigna toda capability nueva a `Admin`, `Consultor` y `Colaborador` con
   `defaultValue: 'allow'`, y UPONE-1633 esta agregando objetos de matriz en este mismo sprint. **Es parte de
   la unica decision abierta**, porque `Consultor` es un rol del core.
2. **Un riesgo cross-mod que UPONE-1393 documento como supuesto a revisar, y documentarlo era lo correcto**
   porque resolverlo exigia acordar con engagement sobre un objeto compartido (de hecho si coordino la parte
   que le correspondia, las transiciones de estado de `Offering`). Sigue vigente: `Diseñador Curricular` tiene
   `offering:create/modify`, y `offering` es el objeto compartido entre curriculum-design (silabos) y
   engagement (ofertas de servicio). Los nombres de capability no tienen dimension de app, asi que el permiso
   aplica igual en las ofertas de servicio. **Es el mismo patron de fondo que UPONE-1616:** un objeto Base
   compartido y una configuracion sin dimension por mod.

**Estado de partida verificado en el tenant.** Cero sets reales (dos fixtures), cero en curriculum-mapping,
**cero filas de vinculo** para las dos apps. Como consecuencia, las dos apps son **visibles para cualquier
rol**, porque el resolver trata una app sin roles asignados como publica. Las 120 asignaciones de personas (30
por rol) son por id, y **ningun layout** esta gateado a los roles curriculares.

## Estado actual del codigo

**Hoy los permisos cuelgan del rol.**

- `mods/curriculum-design/seed/_data-rbac.js:36-57`: los cuatro roles reales como definiciones en codigo:
  Consultor Curricular (`:38`), Diseñador Curricular (`:43`), Revisor Curricular (`:48`), Autoridad Curricular
  (`:53`).
- `:70-87`: el conjunto de capabilities de lectura compartido. `:89-168`: el mapa de rol a capabilities.
  `:175-180`: escritura con omision de duplicados.
- `mods/curriculum-mapping/seed/_data-rbac.js:47-68`: **copia literal** de las mismas definiciones. `:11-17`:
  escritura idempotente a proposito porque el orden entre seeds de mods no esta garantizado. Su test de paridad
  falla si los dos archivos divergen. **La duplicacion es intencional:** los hermanos comparten el juego de
  roles.
- Modelo: `object-manager/objects/core/core_Role.json`, `core_RoleCapability.json` (esta si tiene el campo con
  `allow`/`prohibit`/`inherit`).
- Resolucion en runtime: `object-manager/src/services/auth/authChecker.js:55`, con el filtro por rol activo en
  `:115-121`.

**El mecanismo de sets, construido y sin adoptar.**

- Modelo: `object-manager/objects/core/core_ModRole.json` (unico por App y nombre, con herencia),
  `core_ModRoleCapability.json` (**sin** campo de valor: un set solo concede).
- Vinculo: `object-manager/objects/up1/suite/up1_suite_app_role.json:34-43`.
- Sync desde el mod: `object-manager/scripts/sync/dbSync.js:1245` en adelante, leyendo `roles/*.json`. Dos
  pasadas: crea todos y despues resuelve la herencia (`:1266-1294`, `:1296-1319`). Guard de ciclos
  (`:939-961`), proteccion de nombres (`:1030-1040`, **con punto ciego**, ver Gotchas), y borrado seguro si
  algun archivo fallo al parsear (`:1376-1420`).
- Enriquecimiento en runtime: `object-manager/src/services/auth/modRoleCapabilities.js:58-118`, con guard de
  ciclo propio en `:31-40` y deduplicacion por nombre en `:16-30`.
- Auto-creacion de rol desde configuracion de layout: `dbSync.js:846-852`. **Es el camino que origino el rol
  huerfano.**
- UI de administracion: `mods/up1-manager` (layouts de hub de roles, asignacion de set y vinculo por app).
- **Lo unico que existe en curriculum-design son dos fixtures**: `roles/GestorCurricular.json` y
  `roles/LectorCurricular.json`, ambos autodescritos como fixture de la prueba del mecanismo. El fixture de
  RBAC-02 esta cortado en dos puntos (no hay vinculo, y `Coordinador` tampoco tiene `academicprogram:view` por
  otra via).
- **curriculum-mapping no tiene directorio `roles/`.**

**El hueco de capability del caso del PO, cadena completa verificada:**

1. `mods/curriculum-design/objects/Curriculum.json:103, 160`: la institucion es FK **requerida**.
2. `objects/AcademicProgram.json:61-69, 89`: idem.
3. `config/layouts/default_AcademicProgram_create.json:49-53`: el formulario la pide como select obligatorio.
4. Poblar el select lista instancias de institucion, y ese listado esta gateado por la capability de lectura
   del objeto: `object-manager/src/graphql/resolvers/instance.resolver.js:1539`.
5. Las capabilities de institucion **se auto-generan** por objeto y accion (`generateCapabilities.js:117-119`)
   y se asignan por defecto a los roles base de la plataforma (`:331-358`), **no** a los curriculares.
6. `Diseñador Curricular` **no tiene ninguna capability de institucion** en su bloque (`_data-rbac.js:92-123`)
   ni en el conjunto de lectura compartido (`:70-87`).

**Diagnostico previo ya existente:** el hueco se destapo en el smoke de UPONE-1538 y quedo diferido de SP8 con
decision respaldada: agregar la capability al conjunto de lectura, acotar el alcance por nodo de institucion en
el provisioning, y opcionalmente filtrar el selector por tipo academico. Detalle en
`sp8/UPONE-1538-rbac-institution-view-gap.md`. **Decidido:** la capability va en la base de Curriculum Design,
con lo que llega a los cuatro roles; el acotamiento por nodo queda como provisioning; el filtro del selector
queda fuera.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente con contexto limpio, modo analisis. Es el ticket donde la frontera mas
importaba, porque el equipo no tenia claro que parte vive en el mod y que parte en el core.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Mecanismo de sets (modelo, tabla de capabilities, vinculo por App, sync de declaraciones) | `mod-only` | **Ya existe completo en el core**; el mod solo lo consume, no hay nada que construir | `object-manager/objects/core/core_ModRole.json`; `core_ModRoleCapability.json`; `objects/up1/suite/up1_suite_app_role.json:34-43`; `scripts/sync/dbSync.js:1245` |
| Declaraciones de set de curriculum-design | `mod-only` | Archivos de declaracion propios del mod, con formato ya documentado; hoy solo existen los fixtures | `mods/curriculum-design/roles/GestorCurricular.json`; `seed/_data-rbac.js:36-57` |
| Declaraciones de set de curriculum-mapping | `mod-only` | El set es unico por App y curriculum-mapping tiene su propia App, asi que sus sets son trabajo aislado del mod | `mods/curriculum-mapping/config/app.json`; `core_ModRole.json` (unicidad por App y nombre) |
| Vinculo rol a set | `mod-only` | Se registra en un objeto del core mediante una UI de administracion que ya existe; no hay pantalla ni objeto nuevo que crear | `mods/up1-manager/config/layouts/role-list.json:189-200`; `app-role-mappings-list.json` |
| Renombre de los cuatro roles al prefijo de familia | `mod-only` | Los roles los siembra el mod, y el renombre se hace en el seed del mod. **No toca el core**: los roles del core no cambian de nombre | `mods/curriculum-design/seed/_data-rbac.js:36-57`; `mods/curriculum-mapping/seed/_data-rbac.js:47-68` |
| Retiro del rol huerfano y de los sets de fixture | `mod-only` | Las tres entidades las origino el mod (dos declaraciones de fixture y un rol auto-creado desde un layout del mod). Es dato del mod, no del core | `mods/curriculum-design/roles/*.json`; `dbSync.js:846-852` (auto-creacion desde layout) |
| Capability de lectura de institucion faltante en Diseñador Curricular | `mod-only` | La capability ya se auto-genera para el objeto base; falta referenciarla, y un set puede declarar permisos de objetos de plataforma | `generateCapabilities.js:117-119`; el fixture existente ya declara un permiso de objeto de plataforma |
| "Seguro" por orden de corrida en la vinculacion de roles | `mod-only` | Existe porque los dos mods comparten un rol por nombre global. Con sets, la parte de permisos deja de colisionar; el seguro sobre el rol compartido se conserva porque el rol sigue compartido a proposito | `mods/curriculum-mapping/seed/_data-rbac.js:11-19` |
| Punto ciego de la proteccion de nombres del core | `hay-core-worthy`, **como aviso** | Cualquier mod puede materializar un set que colisione con un rol creado por seed o por layout, sin deteccion. Es de plataforma, no de estos mods. **No bloquea:** la convencion de nombres de D3 lo esquiva | `dbSync.js:1030-1040` |

**Veredicto global: `mal-encuadrado`.** El enunciado "Implementar logica de Roles internos" sugiere construir
un mecanismo, y ese mecanismo **ya esta construido integro en el core** (entro con UPONE-1353 y UPONE-1354,
ambas Finalizadas). Ningun artefacto requiere tocar el core: lo unico que va hacia core es **un aviso**, no un
cambio.

El encuadre correcto: es un ticket de **migracion mod-only**, que consiste en declarar los sets en los dos
mods, renombrar y vincular los roles, limpiar lo que quedo en desuso y completar la capability faltante. Esto
no reduce el valor del ticket, pero si cambia su forma: **el riesgo no esta en construir, esta en migrar sin
que nadie pierda permisos**.

## Motivos y evidencia del modelo decidido

Amplia la seccion "El modelo decidido" del detalle: el porque detras de cada pieza del modelo, con su
evidencia. Historial completo con alternativas descartadas: `sp9/UPONE-1615-registro-de-decisiones.md`.

- **Por que base mas extension:** el set de Consultor esta contenido integro en los otros tres, en los dos
  modulos (verificado contra el mapa actual de capabilities por rol). Declararlo como base evita repetir esas
  capabilities en cada extension y hace explicita la relacion de contencion que ya existe en el dato.
- **Por que los transversales van en las dos bases y no en un lugar unico:** la deduplicacion por nombre en la
  inyeccion de runtime (`modRoleCapabilities.js:16-30`) hace que declarar el mismo permiso en las dos bases no
  tenga costo de runtime ni de mantenimiento real, y a cambio cada modulo queda autosuficiente: no depende de
  que el otro modulo este instalado o vinculado para tener sus permisos base.
- **Por que la composicion es por modulo y no espejo:** la tabla de capabilities por rol y modulo (cd
  14/base+5/base+27/base+28, cm 4/base+2/base+8/base+8) ya muestra asimetria real entre lo que un rol hace en
  Curriculum Design versus en Curriculum Mapping. Forzar espejo violaria el principio de que el vinculo es por
  app: un usuario puede tener el set de un modulo y no el del otro.
- **Por que el permiso de institucion va en la base de Curriculum Design y no en un set aparte:** es el
  criterio 2 del PO (todos los roles deben poder crear el plan de estudio), y viaja dentro del set en vez de
  ser un cableado suelto porque asi se garantiza que los cuatro roles lo reciben sin declaracion repetida por
  rol.
- **Por que el mapeo de roles de la familia hacia los sets no es una decision abierta:** cada rol de la
  familia mapea al set homonimo del modulo donde opera (Diseñador -> `Curriculum Design - Diseñador Curricular`
  y `Curriculum Mapping - Diseñador Curricular`), sin ambiguedad, porque el modelo fue diseñado con esa
  correspondencia 1:1. Lo que queda abierto es el mapeo de los roles del **core** (`Admin`, `Consultor`, etc.),
  no el de la familia.

## Decision abierta (roles del core): historial de resolucion

> Estado final, integrado tal cual en el detalle del ticket. Se preserva aqui la traza de como se llego a esa
> resolucion, sin volver a mezclarla con el resto del contexto.

**Al cierre de la revision 2026-08-17**, la decision abierta era una sola: el mapeo entre los roles que posee
el core y los sets del mod. No bloqueaba la parte de la familia, porque los cuatro roles curriculares ya
tenian su mapeo definido (cada uno al set homonimo de cada modulo donde opera).

**Revision 2026-08-18: se acoto el ticket para no tocar core.** El mapeo de los roles del core quedo
**diferido dentro del mismo ticket** (se define en SP9), sin cambiar nada del core. La particion quedo asi:

- **Arranca ya (mod-only):** declarar los 8 sets, renombrar la familia, retirar el huerfano y los dos
  fixtures, completar la capability de institucion, y la cobertura del camino real.
- **Diferido dentro del ticket:** crear los vinculos y la consiguiente privatizacion de las apps. Es parte
  de 1615, pero se ejecuta **cuando este definido el mapeo de roles core**, no antes.

Decisiones tomadas en esa misma revision (ya integradas en el detalle del ticket, seccion "Decision abierta"):

- **`Consultor`: no se toca core.** La correccion de su alcance de caps (166 capabilities, mismas que
  `Admin`) NO se hace en 1615, porque el acceso lo produce un mecanismo de core
  (`assignNewCapabilitiesToDefaultRoles`, `object-manager/src/services/auth/generateCapabilities.js:332`) y
  corregirlo seria tocar core. La correccion de caps queda diferida. Lo unico que se resuelve por el lado mod
  es la **visibilidad**: no darle vinculo lo saca de la navegacion curricular sin alterar sus caps de core.
- **Coordinador: fuera.** No recibe set en las apps curriculares. Si luego se necesita, se agrega en la fase
  de mapeo de roles core que queda diferida.
- **La visibilidad de los dos modulos.** Al crear la primera fila de vinculo dejan de ser publicos y se ven
  solo por los roles de la lista. La matriz de que roles quedan (familia LA mas Admin como base) se firma
  **antes** de crear vinculos; ese paso es el que espera el mapeo.

Detalle rol por rol (mas alla de Consultor y Coordinador) sigue en el registro de decisiones
(`sp9/UPONE-1615-registro-de-decisiones.md`, item O1).

## Enfoque decidido

**Los permisos pasan a sets por modulo, los roles se renombran en su lugar, y no hay convivencia.** Detalle del
modelo en el detalle del ticket; motivos en el registro de decisiones. En corto:

- 4 roles renombrados a `Learning Assurance - <Rol>`, en espanol.
- 8 sets `<Modulo en ingles> - <Rol>`, declarados como 2 bases mas 6 extensiones.
- Composicion por modulo (cd 14/19/41/42, cm 4/6/12/12), no espejo.
- Transversales en las dos bases; el permiso de institucion en la base de Curriculum Design.
- Retiro del rol huerfano y de los dos fixtures.

**Por que no hay convivencia:** el renombre reutiliza los mismos cuatro roles, asi que no hay dos sistemas en
pie al mismo tiempo. La red no es la convivencia, es la **comparacion antes y despues** del conjunto de
capabilities efectivas por rol.

**Secuencia sugerida:**

1. **Volcado del estado actual**: conjunto de capabilities efectivas por rol, antes de tocar nada. Es la linea
   base contra la que se compara todo lo demas. Sin esto no hay como probar que nadie perdio permisos.
2. **Auditoria de los cuatro roles**: por cada accion declarada, verificar que la capability exista y este
   asignada; anotar los huecos.
3. **El criterio 2 primero**: el permiso de institucion y la verificacion del flujo del PO. **No depende de la
   decision abierta**, asi que puede avanzar aunque el mapeo de los roles del core siga sin definirse.
4. **Declarar las dos bases** con la composicion del Consultor mas los transversales, y verificar que se
   materializan por sync.
5. **Declarar las seis extensiones** y verificar que la herencia resuelve la union sin duplicar.
6. **Renombrar los roles**, con el paso explicito, y verificarlo **sobre una base que ya tenga los nombres
   viejos**, no solo sobre base limpia.
7. **Crear los vinculos de los cuatro roles de la familia** y verificar permisos efectivos rol por rol contra
   la linea base del paso 1. Avisar a UPONE-1616 antes de este paso: aqui se cierra la visibilidad de las apps.
8. **Retirar** el rol huerfano y los dos fixtures, y correr el sync de nuevo para confirmar que no se
   regeneran.
9. **Los vinculos de los roles del core**, cuando la decision abierta este cerrada.

## Gotchas verificados

- **El renombre forkea si se hace ingenuo.** Los seeds crean los roles **por nombre**: cambiar el literal
  produce cuatro roles nuevos y deja los cuatro viejos con sus **120 asignaciones de personas** (30 por rol).
  Hace falta un paso de renombre que reutilice el rol existente, **y tiene que vivir en el seed**, no como SQL
  manual, para valer en los tenants que se agreguen despues.
- **El renombre es de bajo impacto en lo demas:** las asignaciones son por id, y **ningun layout** esta gateado
  a los roles curriculares (verificado: cero filas). Lo que si hay que barrer son 2 seeds, 2 tests y 5
  documentos que citan los nombres.
- **Un set no puede negar** (`core_ModRoleCapability` no tiene el campo de valor), y **lo que el rol declara
  gana**: la inyeccion salta el permiso si el rol ya lo tiene, con cualquier valor
  (`modRoleCapabilities.js:16-30`). Un set **no puede pisar un `prohibit`** deliberado. La migracion es segura
  en esa direccion, pero implica que **mover un permiso al set no lo quita del rol**: si se quiere que el set
  sea la unica fuente, hay que retirarlo del mapa del rol en el mismo paso.
- **La deduplicacion por nombre es lo que permite declarar los transversales en las dos bases.** No es
  redundancia por descuido, es a proposito.
- **El vinculo es por app, pero los nombres de capability no.** Lo que se decide por modulo es *quien recibe*
  el permiso, no *donde aplica*. Es la raiz del riesgo del permiso de ofertas sobre el objeto compartido con
  engagement.
- **Un rol tiene como maximo un set por app**, asi que "sumar permisos especificos de Mapping" se expresa
  dentro del set de Mapping de ese rol, no apilando sets.
- **La proteccion de nombres del core tiene un punto ciego:** arma su lista de nombres de rol **solo desde los
  `roles` declarados en los `app.json`** (`dbSync.js:1030-1040`), y no mira los creados por seed ni por
  configuracion de layout, que son los dos caminos reales. Reusar un nombre de rol como nombre de set **no
  seria detectado**. La convencion de nombres decidida lo esquiva; el aviso al equipo de core queda igual.
- **No poner nombres de set en el campo `roles` de un layout.** Es exactamente lo que origino el rol huerfano:
  la plataforma no encuentra el rol y **lo crea automaticamente** (`dbSync.js:846-852`), con la descripcion
  "Auto-created role from layout configuration" que quedo como huella. **La causa ya se corrigio** en el layout
  el 2026-08-13 (commit `e47f793`), asi que el borrado es durable; la regla queda para no repetirlo.
- **Una app sin roles asignados es publica** (`suite/logic/app.resolver.js:118-129`). Crear la primera fila de
  vinculo cierra la visibilidad del modulo: cualquier perfil que hoy entra y quede fuera de la lista pierde el
  acceso.
- **Con rol activo seleccionado los permisos no se acumulan** con los de otros roles del usuario
  (`authChecker.js:115-121`). La capability tiene que llegar por el rol con el que se opera. **Este es el gotcha
  que hizo que el hueco de institucion pasara desapercibido hasta un smoke.**
- **El seguro por orden de seeds no se toca.** Existe porque los dos mods comparten un rol por nombre global.
  Con sets, la parte de permisos deja de colisionar, pero el rol sigue compartido a proposito, asi que el seguro
  se conserva. No "arreglarlo" tocando el orquestador de sync.
- **El test de paridad entre los dos mods puede tener que cambiar.** Guarda que las definiciones no divergan, y
  la composicion por modulo divergira a proposito. Actualizarlo con intencion y documentar el nuevo invariante,
  no borrarlo.

## Hipotesis a validar (para el intake)

Las hipotesis sobre el mecanismo (deduplicacion, precedencia, aislamiento por app, herencia multinivel) ya
estan **verificadas en codigo** y quedaron registradas como hechos en el detalle. Lo que queda por validar es
runtime:

- **H1: la composicion de cada set replica el conjunto efectivo actual del rol.** _Validacion: volcado del
  conjunto de capabilities efectivas por rol antes y despues, y comparacion. Es la hipotesis que cubre el
  riesgo principal._
- **H2: agregar el permiso de institucion a la base de Curriculum Design desbloquea el flujo de creacion de
  plan de estudio.** _Validacion: smoke entrando como Diseñador Curricular, abrir la creacion de plan y
  comprobar que el select se puebla y el guardado pasa._
- **H3: el renombre sobre una base con los nombres viejos deja 4 roles y no 8, con las asignaciones
  conservadas.** _Validacion: correr el seed sobre una base que ya tenga los nombres viejos y contar roles y
  asignaciones._
- **H4: la herencia resuelve la union base mas extension en runtime, no solo en base.** _Validacion: entrar con
  un rol de extension y comprobar que tiene los permisos de la base._
- **H5: un usuario con el set de Curriculum Design y sin el de Mapping conserva los de Design y no obtiene los
  de Mapping.** _Validacion: usuario con un solo vinculo, y comprobacion cruzada._
- **H6: los transversales llegan por cualquiera de los dos modulos por separado.** Es lo que justifica
  declararlos en las dos bases. _Validacion: usuario con solo cd y usuario con solo cm; los dos ven el
  historial._
- **H7: existe un test que exige el conjunto exacto de capabilities y va a fallar al agregar la de
  institucion.** El diagnostico previo lo anticipa. _Validacion: correr la suite de RBAC del mod tras agregar
  el permiso._
- **H8: la UI de administracion existente alcanza para cargar los vinculos sin desarrollo adicional.** Ojo: el
  camino no esta ejercitado en ningun modulo. _Validacion: asignar un set a un rol de punta a punta desde la
  consola._
- **H9: el retiro del rol huerfano y de los fixtures es durable.** _Validacion: borrar, correr sync dos veces y
  comprobar que no reaparecen._

## Decisiones tecnicas que resuelve el dev en ejecucion

- Si al mover un permiso al set se retira del mapa del rol en el mismo paso, o se deja en los dos durante la
  verificacion y se limpia despues. Tiene consecuencia sobre la comparacion antes/despues.
- Como se expresa el paso de renombre en el seed para que sea idempotente y no dependa del orden entre mods.
- Si las declaraciones de set se generan a partir del mapa existente en el seed o se escriben a mano. El mapa
  actual ya tiene la informacion, y derivarlo reduce el riesgo de transcribir mal 100 permisos.
- Que hacer con el test de paridad entre los dos mods: reescribirlo sobre el nuevo invariante o acotarlo a los
  nombres de rol.
- Como se documentan los vinculos para que el provisioning de un cliente nuevo los reproduzca.

## Archivos candidatos (tentativo, no mandato)

- `mods/curriculum-design/roles/*.json`: 1 base mas 3 extensiones. Retirar los dos fixtures existentes.
- `mods/curriculum-mapping/roles/*.json`: directorio nuevo, 1 base mas 3 extensiones.
- `mods/curriculum-design/seed/_data-rbac.js`: renombre de rol, reestructura del mapa, permiso de institucion.
- `mods/curriculum-mapping/seed/_data-rbac.js`: idem, mas su test de paridad.
- `mods/curriculum-design/tests/unit/rbacRoles.test.js` y su equivalente en curriculum-mapping.
- Los 5 documentos que citan los nombres de rol (barrer antes de renombrar).
- Los vinculos como dato, cargados por la consola de administracion.

**No tocar:** nada del core. Lo unico que va hacia core es **un aviso** por el punto ciego de la proteccion de
nombres, no un cambio.

## Motivos de la estimacion

Amplia la seccion "Estimacion" del detalle (8 SP):

**Por que no 5:** el renombre no es cosmetico. Los seeds crean los roles por nombre, asi que sin un paso
explicito de renombre se crean cuatro roles nuevos y quedan los viejos con sus 120 asignaciones. Y ese paso
tiene que vivir en el seed, no como SQL manual, para valer en los tenants que se agreguen despues.

**Por que no 13:** no hay cambio de esquema, ni migracion de datos de negocio, ni UI nueva. El mecanismo esta
construido y la superficie de codigo es acotada (2 seeds, 2 tests, 5 documentos). De referencia en este mismo
sprint, UPONE-1537 fue 5 con un mantenedor completo y UPONE-1619 es 13 con siete sub-tareas.
