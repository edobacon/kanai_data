---
id: DOC-kb-sp9-UPONE-1615-inventario-de-roles
project: up1
type: doc
---

# UPONE-1615 - Inventario de roles para el mapeo

> Insumo para decidir el mapeo entre roles institucionales y roles internos que pide el criterio 1 del
> ticket. **Datos leidos de la base del tenant UPU, no del codigo**: es el estado efectivo, no el
> declarado. Complementado con lo que cada mod declara en sus fuentes.
> Fecha de la lectura: 2026-08-17. Contrato del ticket: `UPONE-1615-detalle.md`.
>
> **El mapeo ya se decidio para los cuatro roles curriculares** (2026-08-17): cada uno pasa a llamarse
> `Learning Assurance - <Rol>` y apunta al set homonimo de cada modulo, con la composicion dimensionada por
> modulo. Este inventario es el dato que lo sostuvo y sigue siendo la linea base contra la que se compara la
> migracion. Lo que queda abierto es el mapeo de los roles del core. Decisiones con sus motivos:
> `sp9/UPONE-1615-registro-de-decisiones.md`.

## Resumen de lo que hay

| Nivel | Cantidad | Estado |
|---|---|---|
| Roles institucionales (`core_Role`) | 21 | En uso |
| Roles internos (`core_ModRole`) | 2 | **Ambos son fixtures de prueba** |
| Mapeos institucional a interno | 16 filas | **Ninguna tiene rol interno asignado** |
| Filas de rol de app para curriculum-design y curriculum-mapping | 0 | No existen |

Dos consecuencias que conviene tener claras antes de mapear:

1. **El mecanismo no esta en uso en ninguna app**, no solo en las curriculares. Las 16 filas de mapeo
   existentes tienen el rol interno en null.
2. **Para las dos apps curriculares no hay ni filas.** El mapeo no consiste solo en completar el rol
   interno: hay que **crear las filas** de rol de app. Hoy esas apps son visibles para todos porque el
   resolver trata una app sin asignaciones como publica.

---

## 1. Roles del core

### 1.1 Defaults de la plataforma

Reciben automaticamente las capabilities nuevas cuando se generan.

| Rol | Archetype | Caps |
|---|---|---|
| Admin | `sysadmin` | 776 |
| Consultor | (sin archetype) | 769 |
| Colaborador | (sin archetype) | 0 |

### 1.2 Compartidos entre varias apps

| Rol | Caps | Lo declara |
|---|---|---|
| Coordinador | 46 | academic-scheduling, upOne-Engagement, up1-manager, hello-world |
| Estudiante | 7 | upOne-Engagement |

### 1.3 De otros dominios (engagement y retencion)

| Rol | Caps |
|---|---|
| admin-general-eng | 101 |
| admin-centro-eng | 77 |
| responsable-eng | 42 |
| admin-ret | 24 |
| estudiante-eng | 16 |
| gestor-ret | 8 |

Los seis los declara `upOne-Engagement` en su configuracion de app.

### 1.4 De origen no declarado en ninguna configuracion de app

Existen en la base pero ningun `app.json` los declara. Su descripcion permite distinguir dos casos:

| Rol | Caps | Descripcion en base | Lectura |
|---|---|---|---|
| Gestor | 8 | "Institution and service manager" | Autorado, probablemente de seed |
| Facilitador | 8 | "Event facilitator/instructor" | Autorado |
| Viewer | 7 | "Read-only access with field-level visibility." | Autorado, parece fixture de permisos |
| Limited Editor | 2 | "Can only edit firstName and lastName, nothing else" | Autorado, fixture de permisos de campo |
| Docente | 0 | **"Auto-created role from layout configuration"** | Creado por el sync desde layouts de engagement (8 layouts lo declaran) |
| GestorCurricular | 0 | **"Auto-created role from layout configuration"** | **Huerfano. Ver seccion 5** |

---

## 2. Roles de los mods curriculares

### 2.1 Los cuatro roles institucionales, declarados por los dos mods

Definidos **en codigo**, en el seed de RBAC de cada mod, no como archivos de rol. `curriculum-mapping`
los tiene como **copia literal** de `curriculum-design`, y hay un test de paridad que falla si los dos
archivos divergen.

| Rol | Archetype | Caps | Descripcion declarada |
|---|---|---|---|
| Consultor Curricular | `user` | 20 | Solo lectura y auditoria de programas academicos, planes, cursos y silabos |
| Diseñador Curricular | `user` | 55 | Crea y edita contenido curricular; versiona y clona; envia a revision |
| Revisor Curricular | `manager` | 27 | Aprueba contenido curricular enviado a revision |
| Autoridad Curricular | `manager` | 56 | Publica, revierte, deprecia/archiva y elimina; gobierna el ciclo de vida |

Fuentes: `mods/curriculum-design/seed/_data-rbac.js:36-57` y
`mods/curriculum-mapping/seed/_data-rbac.js:47-68`.

### 2.2 Que puede hacer cada rol, por dominio

Desglose de sus capabilities efectivas. Es la tabla que sirve para decidir el mapeo.

| Rol | cd (mod) | cd (objetos) | cm (mod) | cm (objetos) | core | Total |
|---|---|---|---|---|---|---|
| Consultor Curricular | 1 | 13 | 1 | 3 | 2 | 20 |
| Revisor Curricular | 2 | 17 | 1 | 5 | 2 | 27 |
| Diseñador Curricular | 2 | 39 | 2 | 10 | 2 | 55 |
| Autoridad Curricular | 3 | 39 | 1 | 11 | 2 | 56 |

Catalogos declarados: 45 capabilities en `curriculum-design/capabilities.json`, 16 en
`curriculum-mapping/capabilities.json`.

**Las dos capabilities de core que tienen los cuatro** son `core_datalog:view` y `core_user.name:view`.

**Confirmado el gap del criterio 2 del ticket:** los cuatro roles curriculares tienen **cero**
capabilities de `institution`. Es lo que rompe la creacion de planes de estudio, porque el selector de
institucion necesita listar instancias de ese objeto.

### 2.3 Roles internos declarados

| Mod | Archivos de rol | Contenido |
|---|---|---|
| curriculum-design | `roles/GestorCurricular.json`, `roles/LectorCurricular.json` | **Ambos se autodescriben como fixture** de la prueba del mecanismo (RBAC-01) |
| curriculum-mapping | **No existe el directorio `roles/`** | Nada declarado |

Detalle de los dos fixtures:

- **LectorCurricular** (base): `core_User: [view]` y `AcademicProgram.nominalDuration: [view]`. Su propia
  descripcion dice que sirve para validar herencia y capabilities mixtas.
- **GestorCurricular**: extiende LectorCurricular y agrega `AcademicProgram: [view]`. Su descripcion dice
  que al mapear Coordinador a este rol debe aparecer "Programas academicos" en su navegacion.

### 2.4 Roles internos materializados en la base

| App | Rol interno | Hereda | Caps |
|---|---|---|---|
| curriculum-design | GestorCurricular | si, de LectorCurricular | 1 |
| curriculum-design | LectorCurricular | no | 2 |

Ninguno de los cuatro roles curriculares reales existe como rol interno. **Eso es exactamente el trabajo
del ticket.**

---

## 3. Mapeos existentes

Filas de `up1_suite_app_role`, que es donde vive el vinculo institucional a interno.

| App | Roles institucionales con fila | Con rol interno asignado |
|---|---|---|
| upOne-Engagement | 9 (Admin, admin-centro-eng, admin-general-eng, admin-ret, Coordinador, Estudiante, estudiante-eng, gestor-ret, responsable-eng) | **0** |
| up1-manager | 4 (Admin, Colaborador, Consultor, Coordinador) | **0** |
| academic-scheduling | 3 (Admin, Consultor, Coordinador) | **0** |
| curriculum-design | **0 filas** | n/a |
| curriculum-mapping | **0 filas** | n/a |

---

## 4. Lo que falta para el mapeo

Partiendo del inventario, el trabajo del criterio 1 se descompone asi:

1. **Declarar los cuatro roles curriculares como roles internos** en `curriculum-design/roles/` y crear el
   directorio en `curriculum-mapping/roles/`. Hoy solo existen los dos fixtures, y solo en cd.
2. **Crear las filas de rol de app** para las dos apps curriculares, que hoy no tienen ninguna.
3. **Decidir y cargar el mapeo**: que rol institucional apunta a que rol interno, por app.
4. **Completar la capability de institucion** en los roles que la necesitan (al menos Diseñador
   Curricular), que es independiente del mapeo y se puede avanzar en paralelo.
5. **Elegir nombres de rol interno que no puedan colisionar** con nombres institucionales. Ver la seccion
   siguiente: el guard que deberia protegerte tiene un punto ciego.

---

## 5. El caso GestorCurricular: por que existe en las dos tablas

`GestorCurricular` existe **a la vez** como rol interno de curriculum-design y como rol institucional con
0 capabilities y 0 layouts asociados. No es un dato casual: es la consecuencia de un mecanismo que no
distingue entre los dos tipos de rol, mas un guard que no lo cubre.

### 5.1 La secuencia, con evidencia

**Paso 1. El fixture puso un nombre de rol interno en el campo de roles de un layout.**
El commit `5d958c2` (2026-07-24, "test(curriculum-design): add internal-role-gated layout variant for
RBAC-02") creo el layout `AcademicProgram_list_gestor.json` declarando:

```json
"roles": ["GestorCurricular"]
```

**Paso 2. El sync interpreta ese campo como nombres institucionales, y crea los que no encuentra.**
`syncLayoutRoles` busca un `core_Role` por nombre y, si no existe, lo **auto-crea**:

```js
let role = await prisma.core_Role.findFirst({ where: { name: roleName } });
if (!role) {
  role = await prisma.core_Role.create({
    data: { name: roleName, description: 'Auto-created role from layout configuration', ... }
  });
}
```

Fuente: `object-manager/scripts/sync/dbSync.js:846-852`. No tiene ninguna nocion de rol interno, asi que
no puede distinguir "este nombre es de un rol interno del mod" de "este es un rol institucional".

La huella quedo en el dato: la descripcion del rol en la base es literalmente
**"Auto-created role from layout configuration"**, que es la firma de ese camino.

**Paso 3. El nombre quedo duplicado en la misma corrida de sync.** Las marcas de tiempo lo confirman:

| Tabla | Creado |
|---|---|
| `core_ModRole` GestorCurricular | 2026-08-13 20:35:52.**602** |
| `core_Role` GestorCurricular | 2026-08-13 20:35:52.**618** |

16 milisegundos de diferencia, y el **interno primero**. No son dos eventos independientes: es una sola
corrida que materializo el rol interno y despues auto-creo el institucional con el mismo nombre.

**Paso 4. El campo se corrigio, pero el rol auto-creado no se limpio.**
El commit `e47f793` (2026-08-13, "fix(layouts): grant the gestor program list to an institutional role")
cambio la declaracion del layout:

```diff
-    "roles": ["GestorCurricular"],
+    "roles": ["Coordinador"],
```

Ese es el diseño correcto: el layout se concede a un rol **institucional** (Coordinador) y es el mapeo el
que lo lleva al rol interno. Pero la auto-creacion **no tiene contraparte de limpieza**: el `core_Role`
sobrevivio. Hoy tiene 0 capabilities y **0 layouts asociados**, mientras `Docente`, que comparte la misma
descripcion de auto-creacion, si tiene 8 layouts de engagement que lo declaran y por eso es legitimo.

### 5.2 Por que el guard no lo detecto

Existe un guard para esto, `validateModRoleNameCollisions` (RBAC-02), que debe saltar la materializacion
de un rol interno cuyo nombre colisione con uno institucional. No actuo, y la razon esta en como arma su
lista de nombres institucionales:

```js
const institutionalNames = new Set();
for (const config of allConfigs) {
  const appRoles = Array.isArray(config.app?.roles) ? config.app.roles : [];
  for (const roleName of appRoles) { institutionalNames.add(roleName.trim()); }
}
```

Fuente: `object-manager/scripts/sync/dbSync.js:1030-1040`.

**Su punto ciego:** construye la lista **solo desde el array `roles` de los `app.json`**. No mira los
roles declarados en layouts, y no consulta `core_Role` en la base. Entonces:

- `curriculum-design/config/app.json` **no declara ningun array `roles`** (tiene name, label, icon,
  iconBg, order, tenants, version, defaultObjects y up1ModelVersion).
- Los cuatro roles curriculares reales tampoco estan ahi: los crea el **seed** del mod.
- El nombre `GestorCurricular` entro a `core_Role` por un **layout**, no por una configuracion de app.

Resultado: para el guard, la lista de nombres institucionales de este mod estaba vacia, no habia
colision que reportar, y el rol interno se materializo sin problema.

### 5.3 Por que importa para el mapeo de este ticket

- **El guard no te protege del caso general.** Cualquier rol interno cuyo nombre coincida con un rol
  institucional creado por **seed** o por **configuracion de layout** pasa sin aviso. El guard solo ve
  los declarados en `app.json`. Los cuatro roles curriculares entran justamente por seed, asi que si se
  reusaran sus nombres como nombres de rol interno, el guard tampoco lo detectaria.
- **Poner un nombre de rol interno en el campo de roles de un layout crea un rol institucional
  fantasma.** Es un error facil de cometer y silencioso: no falla el sync, solo aparece un rol de mas.
  El layout se concede a roles institucionales; el rol interno se alcanza por el mapeo.
- **Hay un huerfano que conviene limpiar.** El `core_Role` GestorCurricular no tiene capabilities ni
  layouts: no hace nada, pero ensucia la lista de roles que ve la institucion y puede confundir a quien
  arme el mapeo por nombre.

### 5.4 Renombrar el rol interno evita el conflicto?

**Si conviene renombrarlo, pero no por el motivo que causo este caso.** Vale la distincion, porque
confundirlas lleva a "arreglar" el sintoma y dejar la causa viva.

**Lo que el renombre NO evita.** Este conflicto no nacio de que el rol interno se llamara igual que uno
institucional preexistente. Nacio de que **el nombre del rol interno se escribio en el campo de roles de un
layout**, y ese campo el sync lo lee como nombres institucionales y auto-crea los que falten. Si el rol
interno se hubiera llamado `cd-gestor`, el layout habria declarado `cd-gestor` y el sync habria auto-creado
un rol institucional llamado `cd-gestor`. Mismo huerfano, otro nombre.

Es decir: **la causa es de disciplina de declaracion, no de nomenclatura.** El fix correcto es el que ya se
aplico en el commit `e47f793`: los layouts se conceden a roles **institucionales**, y al rol interno se
llega por el mapeo. Eso ya esta resuelto.

**Lo que el renombre SI evita, y por eso conviene igual.** Dos riesgos distintos, ambos vigentes para el
trabajo de este ticket:

1. **El punto ciego del guard con los roles creados por seed.** Si los cuatro roles internos se declararan
   con los mismos nombres que los cuatro institucionales ("Diseñador Curricular" y compañia), habria dos
   entidades homonimas donde una debe mapear a la otra, y **el guard no lo detectaria**: solo lee los
   `roles` de los `app.json`, y esos cuatro nombres entran por el seed del mod. Este si es un riesgo de
   nomenclatura puro, y aplica exactamente al mapeo que hay que decidir.
2. **Hace visible el mal uso.** Un nombre de rol interno con forma reconocible, puesto por error en el
   campo de roles de un layout, se ve obviamente fuera de lugar en revision. Con nombres indistinguibles de
   los institucionales, el error pasa silencioso hasta que aparece un rol de mas en la base, que es
   justamente lo que ocurrio.

**El obstaculo para elegir la convencion:** los nombres institucionales de este tenant **no tienen ninguna
convencion comun**. Conviven `Diseñador Curricular` (capitalizado, con espacios y acento),
`admin-general-eng` (kebab-case con sufijo de dominio), `Viewer`, `Gestor`, `Docente` (una palabra) y
`Limited Editor` (dos palabras con espacio). No hay ninguna forma reservada de la que uno pueda apoyarse
para garantizar que no habra choque.

Por eso la unica via confiable es un **prefijo propio de rol interno** que ningun rol institucional usaria.
Alineado con la convencion de capabilities de mod que up1 ya usa (`mod/<modname>:<accion>`), una forma
coherente seria prefijar por mod, por ejemplo `cd-consultor`, `cd-disenador`, `cd-revisor`,
`cd-autoridad`, y sus equivalentes `cm-*`.

**Dos restricciones a tener en cuenta al elegir la forma:**

- El nombre del rol interno **se usa tambien como clave** en la declaracion de vistas por rol
  (`navByRole`), asi que aparece como key de un objeto JSON en el `app.json` del mod. Debe ser exactamente
  el mismo string en los dos lugares.
- El rol interno es unico **por app y nombre**, asi que dos mods pueden usar el mismo nombre interno sin
  chocar entre si. El prefijo por mod no es obligatorio para evitar choques entre mods; sirve para
  distinguirlo de lo institucional y para leerlo mas rapido.

**Costo de renombrar los dos fixtures actuales: bajo.** Nada en el mod depende de esos nombres mas que sus
propios archivos, y los tests de core que los mencionan **escriben sus propios fixtures temporales** en vez
de leer los del mod (`object-manager/tests/unit/scripts/sync/plat15Config.test.js`). Si se decide adoptar la
convencion, conviene renombrarlos en la misma pasada para no dejar dos estilos conviviendo.

### 5.5 Recomendaciones

1. **Adoptar una convencion de prefijo para los nombres de rol interno**, distinta de cualquier forma
   institucional (ver 5.4). No reusar "Consultor Curricular" y compañia: el rol interno es un concepto
   distinto del rol que ve la institucion, y el guard no detectaria el choque porque esos cuatro nombres
   entran por seed.
1bis. **No poner nombres de rol interno en el campo de roles de un layout.** Es la causa real de este caso.
   El layout se concede a roles institucionales; al interno se llega por el mapeo. Ya hay precedente
   corregido en el commit `e47f793`.
2. **Revisar antes de mapear si hay mas huerfanos**: buscar en la base los `core_Role` con descripcion de
   auto-creacion, sin capabilities y sin layouts asociados.
3. **Decidir si se retira el huerfano GestorCurricular** como parte de este ticket o como limpieza
   aparte. Es dato, no codigo, y no lo consume nadie.
4. **Considerar reportar el punto ciego del guard al equipo de core**: hoy no cubre roles institucionales
   creados por seed ni por configuracion de layout, que son justamente los dos caminos por los que
   aparecen la mayoria. Es un hallazgo de plataforma, no de este mod.
5. **Al conceder un layout a un rol, usar siempre el nombre institucional.** El fixture ya se corrigio en
   esa direccion y sirve de precedente.

---

## Fuentes

- Base del tenant UPU: `core_Role`, `core_RoleCapability`, `core_Capability`, `core_ModRole`,
  `core_ModRoleCapability`, `up1_suite_app_role`, `up1_layen_layout_role`, `up1_suite_app`.
- Codigo: `mods/curriculum-design/seed/_data-rbac.js`, `mods/curriculum-design/roles/`,
  `mods/curriculum-mapping/seed/_data-rbac.js`, `mods/*/config/app.json`,
  `mods/curriculum-design/config/layouts/AcademicProgram_list_gestor.json`,
  `object-manager/scripts/sync/dbSync.js` (auto-creacion de roles y guard de colision).
- Historial: commits `5d958c2` (2026-07-24) y `e47f793` (2026-08-13) del mod curriculum-design.
