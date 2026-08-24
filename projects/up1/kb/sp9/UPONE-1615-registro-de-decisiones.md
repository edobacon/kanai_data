# UPONE-1615 - Registro de decisiones

> Historial de lo decidido, con su motivo y la evidencia que lo sostiene. **Sirve para no re-litigar:** cada
> entrada dice que se decidio, por que, que alternativas se descartaron y con que dato.
> Cerrado el 2026-08-17. Contrato del ticket: `UPONE-1615-detalle.md`. Documento con el que se decidio:
> `UPONE-1615-decisiones-de-roles-po.md`.

## Estado

| | |
|---|---|
| **Decisiones cerradas** | 9 |
| **Decisiones abiertas** | 1, mas un item chico de coordinacion |
| **Estimacion resultante** | 8 SP (escala Fibonacci) |

---

## D1. Se adopta el mecanismo de sets de permisos por modulo

**Decidido:** los permisos de los roles curriculares dejan de colgar directo del rol y pasan a declararse como
sets por modulo, con el rol apuntando al set.

**Por que:**
- Cada modulo pasa a gobernar su propio alcance sin tocar un rol que el otro comparte.
- Habilita que el mismo rol tenga alcance distinto en cada modulo, que hoy es imposible porque los permisos
  son una sola bolsa.
- Prepara la entrada del tercer hermano de la familia sin decisiones a nivel de rol.

**Evidencia:** el mecanismo existe y esta probado (entro con UPONE-1353 y UPONE-1354), y **ningun modulo de la
plataforma lo usa todavia**: los 16 vinculos existentes no tienen set asignado. Seriamos los primeros.

**Alternativa descartada:** seguir como estamos. Se descarto porque el costo de no migrar **crece**: toda
capability nueva se asigna automaticamente a los roles por defecto
(`generateCapabilities.js:330-357`), engordando un rol ya sobre-permisado, y cada hermano nuevo suma otra copia
de la lista de roles.

---

## D2. Los roles se renombran a `Learning Assurance - <Rol>`, con el rol en espanol

**Decidido:** los cuatro roles curriculares pasan a llamarse `Learning Assurance - Consultor Curricular`,
`Learning Assurance - Diseñador Curricular`, `Learning Assurance - Revisor Curricular` y
`Learning Assurance - Autoridad Curricular`.

**Por que:**
- Los roles viven en **una lista plana unica por institucion**, donde hoy conviven sin marca de dueno con los
  de core (`Admin`, `Consultor`, `Colaborador`) y con los de otros productos (los de engagement y retencion).
  El prefijo de familia es lo que separa.
- **curriculum-design y curriculum-mapping son hermanos y comparten el mismo juego de roles a proposito.** El
  prefijo nombra a la familia, no al modulo, precisamente porque el juego es compartido. Y hay un tercer
  hermano por venir.
- El rol es lo que ve el cliente, asi que el nombre del rol se mantiene en espanol.

**Evidencia del tope que resuelve:** la lista actual del tenant mezcla los tres origenes sin distincion, y ya
produjo una colision real (ver D7).

**Costo medido:** 2 seeds, 2 tests y 5 documentos referencian los nombres. **Ningun layout** esta gateado a
esos roles (verificado: cero filas), y las **120 asignaciones de personas** (30 por rol) son por id, asi que
sobreviven al renombre.

**Trampa que obliga a un paso explicito:** los seeds crean los roles **por nombre**. Cambiar solo el nombre en
el seed **no renombra: crea cuatro roles nuevos y deja los viejos con sus asignaciones**. Hace falta un paso
de renombre, y **debe vivir en el seed y no como SQL manual**, para que valga en los tenants que se agreguen
despues.

---

## D3. Los sets se llaman `<Modulo en ingles> - <Rol en espanol>`

**Decidido:** `Curriculum Design - Diseñador Curricular`, `Curriculum Mapping - Diseñador Curricular`, y asi
para los cuatro roles en cada modulo. El nombre del modulo en ingles, igual que el nombre del propio mod.

**Por que:**
- **Los sets son unicos por app y nombre**, asi que los hermanos pueden usar el mismo nombre de rol sin chocar.
  No les hace falta prefijo de familia para ser unicos.
- Lo que si necesitan es **no llamarse igual que los roles**. Si ambos usaran `Learning Assurance - X`,
  recrearíamos la colision de D7, y **la proteccion de la plataforma no la detectaria** porque compara los
  nombres de set solo contra los roles declarados en el `app.json`, y estos se declaran en el seed.
- El nombre del modulo dentro del set hace visible **que modulo concede que**, que es lo que necesita ver quien
  arma el vinculo.

**Alternativa descartada:** un prefijo tecnico corto tipo `cd-disenador`. Se descarto porque el formato con el
nombre del modulo es legible, se autodocumenta y ya venia propuesto.

---

## D4. Estructura de base mas extension, una base por modulo

**Decidido:** cada modulo declara **una base** (el set de Consultor Curricular) y **tres extensiones** que
heredan de ella. Ocho sets en total, declarados como 2 bases mas 6 extensiones.

**Por que:** se verifico que **el set de Consultor esta contenido integro en los otros tres, en los dos
modulos**:

| Modulo | Base | Revisor | Diseñador | Autoridad |
|---|---|---|---|---|
| Curriculum Design | 14 | base + 5 | base + 27 | base + 28 |
| Curriculum Mapping | 4 | base + 2 | base + 8 | base + 8 |

Menos declaraciones, y la intencion queda legible: se ve de un vistazo que agrega cada rol sobre la lectura
comun.

**Evidencia de que la herencia sirve:** los sets pueden heredar de otro set del mismo modulo, y la resolucion
recorre **cadenas de varios niveles** con guarda de ciclos (`modRoleCapabilities.js:32-40`).

**Alternativa descartada:** una cadena unica de cuatro niveles. Se descarto porque **Diseñador y Autoridad son
ramas, no niveles**: uno crea y no elimina, el otro elimina y casi no crea. No son subconjuntos anidados.

---

## D5. Los permisos transversales se declaran en las dos bases

**Decidido:** ver el historial de cambios y ver el nombre de usuario se declaran en la base de **los dos**
modulos.

**Por que:** **la inyeccion deduplica por nombre**, asi que declararlos dos veces no tiene costo: se inyecta
una sola vez. Y a cambio **cada modulo queda autosuficiente**, sin depender de que el otro este vinculado.

**Evidencia** (`modRoleCapabilities.js:16-30`):

```js
const existing = new Set(roleCapabilities.map(roleCapabilityName).filter(Boolean));
if (existing.has(capabilityName)) return;
```

**Correccion registrada:** en una version anterior del analisis se dijo que habia que **elegir** en que set
poner los transversales, porque un rol con solo set de Mapeo los perderia. Eso quedo corregido al verificar la
deduplicacion: no hay que elegir.

---

## D6. El permiso de instituciones vive en la base de Curriculum Design

**Decidido:** el permiso de lectura de institucion, que es el criterio 2 del ticket, se declara en la base de
Curriculum Design, con lo que los cuatro roles lo reciben.

**Por que:**
- Se necesita para **crear planes de estudio**, que ocurre en Curriculum Design. La cadena esta verificada: el
  plan y el programa academico declaran la institucion como FK requerida, el formulario la pide como select,
  poblar el select lista instancias, y ese listado exige la capability de lectura.
- **Un set puede declarar permisos de objetos de plataforma**, no solo del modulo. Verificado: el set de prueba
  que existe hoy ya lo hace con el objeto de usuario.
- Es coherente con la decision ya respaldada en SP8, que proponia agregarlo al conjunto de lectura compartido.

**Consecuencia practica:** el arreglo del criterio 2 **viaja dentro del set** en vez de ser un cableado suelto
al rol. Una cosa menos que hacer aparte.

---

## D7. Se limpia lo que quedo en desuso, con criterio de origen

**Decidido:** se retiran el rol huerfano `GestorCurricular` y los dos sets de prueba
(`GestorCurricular`, `LectorCurricular`). Criterio general: **se limpia lo que origino el mod; si el origen es
del core, se avisa en vez de borrar.**

**Por que el origen es del mod:** lo creo el sync leyendo el campo `roles` de un layout de curriculum-design,
donde se habia puesto el nombre de un set. La plataforma, al no encontrar un rol con ese nombre, **lo creo
automaticamente** (`dbSync.js:846-852`), con la descripcion "Auto-created role from layout configuration" que
quedo como huella en el dato.

**Por que el borrado es durable:** la causa **ya esta removida**. El layout se corrigio el 2026-08-13 (commit
`e47f793`) y hoy declara `roles: ["Coordinador"]`. Se revisaron los dos caminos que podrian regenerarlo y
ninguno aplica: el sync de layouts solo ve "Coordinador", y el sync de roles de app lee el array `roles` del
`app.json`, que curriculum-design no declara.

**Por que es seguro:** el rol tiene **0 asignaciones de personas y 0 layouts** que lo referencien.

**Regla que queda, porque el borrado no la previene:** no poner nombres de set en el campo de roles de un
layout. D3 la refuerza haciendo que un nombre de set puesto ahi se vea obviamente fuera de lugar.

---

## D8. La composicion es por modulo, no espejo

**Decidido:** el set de cada modulo se dimensiona a lo que ese rol hace **ahi**. Un rol puede tener solo el set
de Curriculum Design, o sumarle el de Curriculum Mapping con lo especifico de ese dominio.

**Por que:** la asimetria ya existe en el dato, no es una hipotesis:

| Rol | En Curriculum Design | En Curriculum Mapping |
|---|---|---|
| Consultor Curricular | 14 | 4 |
| Revisor Curricular | 19 | 6 |
| Diseñador Curricular | 41 | 12 |
| Autoridad Curricular | 42 | 12 |

**Correccion registrada:** una version anterior del analisis proponia **espejo uno a uno**, el mismo set en los
dos modulos. Era un supuesto del analisis, no del modelo.

**Detalle mecanico:** un rol tiene **como maximo un set por app**, asi que "sumar algo especifico de Mapeo" se
expresa poniendo esos permisos **dentro del set de Mapeo de ese rol**, no apilando sets.

---

## D9. Estimacion: 8 SP

**Decidido:** 8 puntos, escala Fibonacci.

**Por que 8 y no 5:** el peso no esta en declarar, esta en verificar. Son cuatro roles por dos modulos con
evidencia runtime, mas el renombre con su paso de migracion en el seed, mas la limpieza de tres entidades.

**Por que no 13:** no hay cambio de esquema, ni migracion de datos de negocio, ni UI nueva. De referencia en
este mismo sprint, UPONE-1537 fue 5 con un mantenedor completo y UPONE-1619 es 13 con siete sub-tareas.

**Historial de la estimacion:** partio en 8 con todo abierto, bajo a 5 al cerrarse las decisiones, y volvio a 8
al incorporarse el renombre y su migracion. El numero es el mismo pero por razones distintas: al principio lo
inflaban las decisiones, ahora lo sostiene el trabajo.

---

## Lo que queda abierto

### O1. El mapeo entre los roles del core y los sets del mod

**Que falta:** definir si los roles que **el core posee** toman set en los modulos curriculares, y cual. Los
cuatro roles de la familia ya estan resueltos: cada uno toma el set homonimo de cada modulo donde opera.

Los que faltan:

| Rol del core | Permisos curriculares hoy | Que hay que definir |
|---|---|---|
| `Admin` | 166 | Si toma set propio o conserva su acceso total |
| **`Consultor`** | **166, los mismos que Admin** | **La llamada sensible.** Ver abajo |
| `Coordinador` | 4, y son de ofertas de Engagement | Si toma algo de lectura o ninguno |
| `Colaborador` | 0 | Presumiblemente ninguno |
| `Estudiante` | 0 en curricular | Presumiblemente ninguno |
| Los 6 de engagement y retencion | varios | Presumiblemente ninguno: sus sets son de su modulo |
| Los 5 de origen antiguo | varios | Presumiblemente ninguno, y revisarlos aparte |

**Por que `Consultor` es la llamada sensible:** se llama "Consultor" pero puede crear, modificar, eliminar,
publicar, aprobar y revertir contenido curricular. Es mas amplio que `Autoridad Curricular` (54). **Es el
estado que UPONE-1393 venia a reemplazar**, y no se retiro entonces porque ese ticket estaba acotado a "cero
toque a core" y ese acceso lo produce un mecanismo de la plataforma. Acotarlo ahora **le quita permisos que hoy
tiene**.

**Como se cierra, sin discusion:** verificando si hay personas operando con el rol `Consultor` en los modulos
curriculares. Si no hay nadie, es la oportunidad de alinearlo con su nombre. Si hay alguien, conservar su
alcance y tratar la correccion aparte.

**Consecuencia que arrastra, y que hay que decidir en el mismo acto:** hoy los dos modulos curriculares son
**visibles para cualquier rol**, porque no tienen ningun rol asignado y la plataforma trata un modulo sin roles
como abierto. **Al crear la primera fila de vinculo, el modulo pasa a verse solo por los roles de la lista.**
Cualquier perfil que hoy entra y quede fuera pierde el acceso.

### O2. El permiso de ofertas del Diseñador (coordinacion, no bloqueo)

`Diseñador Curricular` tiene crear y modificar sobre "ofertas", y ese objeto lo comparten Curriculum Design
(silabos) y Engagement (ofertas de servicio). **UPONE-1393 lo dejo anotado como supuesto a revisar y
documentarlo era lo correcto**, porque resolverlo exige acordar con Engagement sobre un objeto compartido.

La migracion **ayuda** a razonar sobre su alcance, porque el permiso queda en el set del modulo en vez de
colgado del rol, pero **no lo resuelve**: la capability sigue siendo sobre el objeto, y su efecto es global.
Decidir si se acota en este ticket o se registra de nuevo.

---

## Hechos de plataforma verificados, que no conviene re-litigar

Sostienen las decisiones de arriba. Todos verificados contra codigo en la rama vigente.

| Hecho | Consecuencia | Fuente |
|---|---|---|
| **Un set no puede negar.** `core_ModRoleCapability` solo tiene set y permiso; no tiene el campo `defaultValue` con `allow`/`prohibit`/`inherit` que si tiene la tabla del rol | Un set solo concede. No hay contradiccion posible entre dos sets | `objects/core/core_ModRoleCapability.json` |
| **La inyeccion salta si el rol ya tiene el permiso**, sin importar con que valor | **Lo que el rol declara gana**; el set solo llena huecos. Un set **no puede pisar un `prohibit`**. La migracion es segura en esa direccion | `modRoleCapabilities.js:16-30` |
| **La inyeccion deduplica por nombre** | Declarar el mismo permiso en dos sets no tiene costo (D5) | idem |
| **El vinculo es por app**, y la resolucion solo recorre vinculos con set y app activa, con guarda contra sets de otra app | Un usuario puede tener todo Curriculum Design y nada de Mapeo. No hay fuga entre apps | `modRoleCapabilities.js:74-110` |
| **Los nombres de permiso no tienen dimension de app** | Lo que es por app es la **asignacion del set**, no el alcance del permiso: ver silabos concedido por el set de cd aplica en cualquier parte. Es la raiz de O2 | `authChecker.js` |
| **Un rol tiene como maximo un set por app** | "Sumar especificos" se expresa dentro del set de ese modulo, no apilando sets | unicidad de `up1_suite_app_role` por app y rol |
| **La herencia soporta cadenas de varios niveles**, con guarda de ciclos | La estructura de D4 es viable, y se puede partir en mas capas si el conjunto transversal crece | `modRoleCapabilities.js:32-40` |
| **Los seeds crean los roles por nombre** | Renombrar sin un paso explicito **forka**: crea roles nuevos y deja los viejos con sus asignaciones (D2) | `seed/_data-rbac.js` de los dos mods |
| **La proteccion contra nombres repetidos solo lee los `roles` del `app.json`** | Es ciega a los roles creados por seed y por configuracion de layout, que son los dos caminos reales. Por eso la convencion de nombres tiene que hacer el trabajo (D3) | `dbSync.js:1030-1040` |
| **Una app sin roles asignados es publica** | Crear la primera fila de vinculo cierra la visibilidad del modulo (O1) | `suite/logic/app.resolver.js:118-129` |
| **Toda capability nueva se asigna a `Admin`, `Consultor` y `Colaborador`** con valor `allow` | El exceso de `Consultor` crece solo, y UPONE-1633 esta agregando objetos de matriz en este sprint | `generateCapabilities.js:330-357` |

---

## Correcciones de analisis registradas

Se dejan asentadas porque cambiaron conclusiones intermedias, y sirven para entender por que el modelo final es
el que es.

| Se dijo | Quedo corregido a | Por que |
|---|---|---|
| La duplicacion de roles entre cd y cm es deuda a eliminar | **Es intencional**: son hermanos que comparten el juego de roles, y el test de paridad guarda ese invariante | Aclaracion del modelo de familia |
| El mapeo es espejo uno a uno en los dos modulos | **La composicion es por modulo** (D8) | La asimetria ya esta en el dato |
| Hay que elegir en que set viven los transversales | **Se declaran en los dos** (D5) | La inyeccion deduplica |
| Los sets deberian llevar un prefijo tecnico corto | **Llevan el nombre del modulo en ingles** (D3) | Legibilidad y propuesta previa del equipo |
| El renombre de roles cuesta cerca de 8 SP por si solo | **Cuesta poco**: 4 archivos de codigo, 5 docs y un paso de renombre | Ningun layout los referencia y las asignaciones son por id |
| Lo heredado de UPONE-1393 es deuda | **Fueron decisiones correctas en su momento** | El mecanismo de sets cerro 25 dias despues que ese ticket; la evidencia del permiso faltante no existia; y el resto estaba fuera de su alcance por diseno |
