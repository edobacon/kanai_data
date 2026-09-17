---
id: DOC-kb-sp10-deuda-rbac-mods-solo-perfil-no-crear-core-role
project: up1
type: doc
tags:
  - rbac
  - perfiles
  - application-profiles
  - core_role
  - core_modrole
  - deuda-tecnica
  - plan-implementacion
  - UPONE-1615
  - UPONE-1756
  - UPONE-1848
---

# Deuda RBAC: los mods no deben crear core_Role (solo perfil + mapeo a roles institucionales existentes)

## TL;DR

Objetivo acordado (Eduardo + Juan Diego): que un **rebuild limpio (reset + seed + sync)** NO cree los 4 `core_Role` curriculares. Esos roles deben existir **solo como `core_ModRole` (perfil/rol mod)**, y las identidades asignables a nivel core se limitan a los roles que ya existen (Admin, Consultor, Estudiante, etc). Un mod NO crea `core_Role`. Hoy cd (y cm, que reusa) los crea en el seed como stopgap; hay que sacar esa creación. **El cambio es 100% en los repos de mod (cd + cm); core (object-manager/up1) NO se toca.**

## La dirección (Juan Diego Galdames, 2026-09-10)

> "La idea de los perfiles de aplicación y su mapeo es que no haya que crear core role en los mods y que se usen los que existen a nivel de plataforma (up1) o cliente (tenant)... que cada mod cree sus propios core_role termina así como está ahora."
> "Aún falta definir qué roles institucionales tendrá up1, y eso no lo definimos nosotros, así que por mientras está 'bien', pero la idea es que en los mods solo se defina el perfil."
> "Te lo apruebo ahora para no bloquearte, pero los mods no deben hacer roles en sus semillas, solo mapear a los que ya existen (consultor, admin, estudiante, etc)."

Eduardo confirma el modelo objetivo: **usuario → rol core → rol mod (perfil) → capabilities.** Los roles core (Admin, Consultor) son suficientes como identidades asignables; los roles del mod (Diseñador, Autoridad, Revisor, Consultor Curricular) existen como perfiles, no como `core_Role`.

## El modelo RBAC (= la cadena que ya tiene el schema)

```
usuario -> core_RoleAssignment -> core_Role -> up1_suite_app_role -> core_ModRole -> capabilities
           (asignación)            (identidad)   (mapeo perfil)        (rol mod)       (permisos)
```

- `core_RoleAssignment.roleId -> core_Role` NOT NULL: lo único asignable a un usuario es un `core_Role`. Un `core_ModRole` NO se asigna directo.
- `up1_suite_app_role`: `roleId` (core_Role) + `modRoleId` (core_ModRole). El perfil se cuelga de un rol core.
- El rol core debe EXISTIR, pero no lo tiene que CREAR el mod. El mapeo a roles existentes ya lo soporta el schema (la línea compuesta Admin/Consultor lo prueba).

## Evidencia empírica (reset de la DB de UPU, 2026-09-10)

Inspección read-only tras reset+seed+sync:

- **Los 4 `core_Role` curriculares EXISTEN y están activos**: Learning Assurance Autoridad/Consultor/Diseñador/Revisor Curricular. O sea, el seed los sigue creando (la deuda es real).
- **Están HUÉRFANOS**: en `up1_suite_app_role` no aparecen del lado core. Solo materializó el compuesto, que es el mapa correcto:
  - `Admin -> Curriculum Design Disenador Autoridad`, `Consultor -> Curriculum Design Disenador Autoridad` (idem Curriculum Mapping).
- **No se ven en el selector del UI** porque ese selector (arriba a la derecha, "ROL") es el switcher de rol activo = `user.roleAssignments` (roles ASIGNADOS al usuario). Los curriculares no se asignan a nadie (se quitó el smoke `linkCurricularRolesToCoreAdmins` en cd/cm), así que no salen. Los `-eng`/`-ret` sí salen porque uengagement/retention siguen auto-asignando los suyos. "No se ven" ≠ "no existen": existen como `core_Role`.
- **Por qué los mapeos granulares no materializaron**: `syncAppProfileMapping` (dbSync.js:1517) resuelve el rol por nombre; si no existe lo marca `profile_mapping_role_absent` y saltea. El sync corre ANTES de que el seed cree/renombre esos `core_Role`, así que al mapear no existían -> se saltearon; con el run-once gate no se reintenta. Artefacto de orden, pero produce el estado deseado (curriculares sin mapeo).

## Hallazgo que habilita la solución

Los perfiles (`core_ModRole`) **los crea el SYNC** desde `mods/<mod>/profiles/*.json` (`syncModRoles`, dbSync.js:1763), independiente del seed. Los 4 "roles mod" ya existen como `core_ModRole`. El `core_Role` del seed es puro excedente. Sacarlo NO afecta los perfiles.

## Alcance: 100% en mods, core NO se toca (verificado)

Inventario de TODO el repo de quién hace `core_Role.create/createMany/upsert`:

| Dónde | Qué crea | ¿Se toca? |
|---|---|---|
| `mods/curriculum-design/seed/_data-rbac.js:138` | los 4 curriculares (`createMany`) | **Sí, se remueve** |
| `mods/curriculum-mapping/seed/_data-rbac.js:147` | los 4 curriculares (`upsert`) | **Sí, se remueve** |
| `mods/uengagement-up1/seed/_data-rbac.js:44` | los `-eng` | No (otro mod) |
| `object-manager/scripts/tenant-create.js:492` | rol **Admin** (institucional) | No |
| `object-manager/scripts/sync/dbSync.js:970` | rol sentinel del sync | No |
| `object-manager/prisma/seed/up1/minimal/core-rbac.js` | roles base institucionales | No |

- Ningún seed de core crea los curriculares (grep de "Learning Assurance/Curricular" en `object-manager/src`, `scripts`, seeds: vacío). Los únicos creadores son cd (L138) y cm (L147).
- Core SIGUE creando los institucionales legítimos (Admin/Consultor/base) vía `tenant-create.js` / `core-rbac.js`. Esos son los "roles que ya existen" a los que el mod debe mapear; quedan intactos.
- **Runtime**: ningún resolver chequea estos roles por nombre. Las menciones en código de mod son solo comentarios/docstrings (`matrixAdoption.resolver.js`, `rowActions.ts`, stories) que explican a qué rol pertenece una capability; los gates chequean CAPABILITIES, no nombres de rol. Sacar los `core_Role` no rompe comportamiento.

Conclusión: eliminar la creación es sacar dos líneas de seed (cd L138, cm L147) + limpieza; `object-manager`/up1 quedan sin tocar.

## Plan de implementación (para el rebuild limpio)

Comportamiento (produce el outcome):
1. `mods/curriculum-design/seed/_data-rbac.js`: eliminar el archivo (todo su contenido era crear/renombrar `core_Role` + cablear caps ya vacías): `ROLE_DEFINITIONS`, `ROLE_RENAME_MAP`, `MOD_CAPABILITIES_BY_ROLE`, `renameLegacyRoles`, `ensureRoles`, `buildRoleCapabilityRows`, `linkCapabilities`, `loadCapabilityIndex`, `logRbacReport`, `ensureCurriculumModRbac`, `_internals`. Quitar import y llamada en `seed/seed.js` (~L39 import, ~L45 call).
2. `mods/curriculum-mapping/seed/_data-rbac.js`: lo mismo (copia literal; `ensureMappingModRbac`, `ensureRoles` usa `upsert`). Quitar import (~L20) y llamada (~L52) en `seed/seed.js`.
3. `config/app.json` de cd y cm: quitar las 4 líneas granulares del `profileRoleMapping` (perfil -> "Learning Assurance X Curricular"); dejar SOLO el compuesto (Admin/Consultor -> Disenador Autoridad).

Tests (para que CI no rompa):
4. `rbacRoles.test.js` (cd y cm): ELIMINAR los bloques de lógica del seed (`ROLE_DEFINITIONS`, `ensureRoles`, `renameLegacyRoles`, mock prisma; en cm también `paridad de ROLE_DEFINITIONS con curriculum-design`). CONSERVAR y repuntar los bloques de capabilities y separación de funciones (Viewer/Editor/Approver/Publisher; en cm además tributación SoD, tablas puente, cross-check capabilities.json) para resolver el PERFIL por nombre en vez de vía el mapeo rol->perfil.
5. `profileBaselineEquivalence.test.js` (cd): repuntar el bloque (b) a validar el efectivo del PERFIL contra el baseline (mapa baselineName -> profileName), en vez de vía el rol institucional. (b′) compuesto y (c) huérfano sin cambios.

## Decisiones tomadas

- Los 4 perfiles quedan **dormidos**: existen como `core_ModRole`, sin `core_Role` espejo y sin mapeo a un rol core dedicado. Lo curricular llega vía Admin/Consultor (compuesto). Si a futuro up1 define un rol institucional "Diseñador", se mapea ahí. Cumple "los roles mod existen, solo como mod role".
- Se pierde la asignación granular por persona (una persona "solo Diseñador"). Aceptado ("Admin/Consultor bastan").
- Gate: repuntado al perfil (no se elimina cobertura).
- `navByRole` en app.json queda válido (sus keys son perfiles, que siguen existiendo); poda opcional aparte.
- Se hace en branch/ticket propio (follow-up), NO sobre los PRs de baseline ya mergeados (#60/#141/#29).

## Migración (tenants existentes)

Para el rebuild limpio NO hace falta (el reset arranca vacío). Pero en tenants ya poblados (producción), si algún usuario tiene asignado un `core_Role` curricular, eliminarlo orfanaría la asignación: requiere un cleanup por tenant (como el DELETE de 108 filas del follow-up 1615). Confirmar por tenant antes de aplicar allá.

## Validación

1. Reset+seed+sync local -> consulta read-only a `core_Role`: los 4 curriculares NO aparecen; los `core_ModRole` sí (prueba del outcome).
2. `npm test` en cd y cm verde (tras el retrabajo de tests).
3. Lint/typecheck de los archivos tocados.

## Referencias

- Código: `mods/curriculum-design/seed/_data-rbac.js` (L138) + `seed/seed.js`; `mods/curriculum-mapping/seed/_data-rbac.js` (L147) + `seed/seed.js`; `config/app.json` (cd/cm, `profileRoleMapping`); `object-manager/scripts/sync/dbSync.js` (`syncModRoles` ~1763, `syncAppProfileMapping` ~1481); `object-manager/prisma/seed/up1/minimal/core-rbac.js`; `object-manager/scripts/tenant-create.js` (~492); `object-manager/prisma/UPU/schema.prisma`; `object-manager/src/graphql/resolvers/user.resolver.js` (`assignableRoles` ~223); `mods/up1-manager/logic/appRoles.resolver.js` (`getAvailableRoles`).
- Tests: `mods/curriculum-design/tests/unit/rbacRoles.test.js`, `profileBaselineEquivalence.test.js` (idem cm).
- Tickets: UPONE-1615 (migración a application profiles), UPONE-1756 (cd/cm), UPONE-1848 (baseline). PRs: cd #60, up1 #141, cm #29.
