---
id: DOC-sp9-roles-sets-y-extensiones-mecanismo
project: up1
type: doc
module: core
status: reference
source_ref: object-manager/src/services/auth/modRoleCapabilities.js;
  up1_suite_app_role.json; core_ModRole
tags:
  - rbac
  - roles
  - sets
  - modrole
  - extensiones
  - herencia
  - sp9
---

# Roles, sets y extensiones: como funcionan (mecanismo core)

> **Que es esto**: referencia del modelo de roles y "sets" (internal mod roles / `core_ModRole`) de up1:
> como se resuelven las capabilities, como funciona la extension/herencia, cuantas veces se puede
> extender y si se pueden encadenar. Verificado 1:1 contra el codigo del core.

## Piezas del modelo

- **Rol institucional** (`core_Role`): el rol con el que opera el usuario (Admin, Consultor, y los
  4 curriculares renombrados a `Learning Assurance - <Rol>`).
- **Set / internal mod role** (`core_ModRole`): un conjunto de capabilities por App, gestionado por el
  mod (sembrado desde `roles/*.json`). Es lo que llamamos "set".
- **Vinculo** (`up1_suite_app_role`): ata un rol institucional a un set, por App, via `modRoleId`.
- **Capabilities del set** (`core_ModRoleCapability`): filas `{modRoleId, capabilityId}`. **Solo
  conceden**; no existe allow/prohibit/inherit (a diferencia de `core_RoleCapability`). Un set nunca
  niega ni pisa un permiso.

## Vinculo: cuantos sets por rol

- **Un solo set por rol y por App.** Unicidad `(appId, roleId)` en `suite/objects/up1_suite_app_role.json`.
  No se pueden atar dos sets hermanos al mismo rol en la misma App.
- El vinculo es **por App** y con **aislamiento entre Apps**: un set de otra App no filtra
  (`modRoleCapabilities.js:104-110`, guarda `modRole.appId !== mapping.appId`).
- La asignacion del `modRoleId` es **operacion manual del administrador** en up1-manager; no hay path de
  seed/sync que la haga (ver Learn L2 de UPONE-1615).

## Extension / herencia: cuantas veces y si se encadena

Resolucion en `object-manager/src/services/auth/modRoleCapabilities.js` → `resolveModRoleCapabilityNames`.

- **Un solo padre por set.** `core_ModRole.extendsId` es **escalar**: cada set extiende a lo sumo UN set
  (`modRoleCapabilities.js:47`). No hay herencia multiple (no se puede extender dos sets a la vez).
- **Las extensiones SI se encadenan (multinivel).** La resolucion es **recursiva** por `extendsId`
  (`:52-55`): `A extends B extends C ...`. El efectivo de un set es la **union** de sus capabilities
  propias mas las de toda su cadena de ancestros.
- **Sin limite de profundidad en el codigo.** No hay tope de niveles; la recursion recorre la cadena
  completa. El unico corte es la guarda de ciclo.
- **Guarda de ciclo** (`:35-41`): si un id ya esta en el `stack`, loguea `rbac.modrole_cycle` y **corta
  la herencia desde ahi** (devuelve `[]` para ese tramo), evitando recursion infinita. Un ciclo no
  rompe: degrada (se pierden las caps aguas arriba del ciclo) y avisa por log.
- **Deduplicacion por nombre** (`:112` y `:21-22`): el efectivo se arma con `new Set(...)` sobre los
  nombres, y la inyeccion salta una cap que el rol ya tiene. Declarar la misma cap en varios niveles no
  duplica ni tiene costo.
- **Solo suma, nunca resta.** Como el set solo concede (no hay prohibit), extender = agregar. Un set no
  puede quitar una capability que un ancestro concede.

### Consecuencia de diseno (caso UPONE-1615)

Como el vinculo admite **un set por rol/App** y la herencia es de **un solo padre**, para dar a un rol el
perfil combinado "Diseñador + Autoridad" NO se pueden atar los dos sets hermanos. Se modela un **set
compuesto**: `Compuesto extends Autoridad` + declara el **delta de Diseñador** (crear/editar/versionar/
clonar). Se descarta `Autoridad extends Diseñador` porque romperia la separacion de funciones (Autoridad
ganaria crear/editar, que no debe tener). De ahi que el alcance suba de 8 a 10 sets (2 compuestos, uno
por modulo: cd y cm).

Cadena resultante (ejemplo cd): `Compuesto → Autoridad → base "Consultor Curricular"` (profundidad 3),
perfectamente soportada por la resolucion recursiva.

## Reglas practicas

1. Un rol ve, en una App, **las caps de un solo set** (el vinculado por `modRoleId`).
2. Ese set puede **heredar en cadena** de otros sets; el efectivo es la union deduplicada de la cadena.
3. Para combinar dos perfiles hermanos en un rol: **crear un set compuesto** (extiende uno, declara el
   delta del otro), no atar dos sets.
4. Evitar ciclos: la herencia debe ser un arbol (o cadena); un ciclo se corta con warning y pierde caps.
5. El set solo concede; para "quitar" un permiso no se usa un set (habria que no concederlo en la cadena).
