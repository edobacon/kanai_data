---
id: SPEC-curriculum-design-refactor-internal-roles-to-sets
project: up1
ticket: TICKET-133
status: approved
---

# Migracion de roles internos curriculares a sets por modulo + cableado parcial de vinculos (6 roles)

# Migracion de roles internos curriculares a sets por modulo + cableado parcial de vinculos (6 roles)

## Executive summary — lo que estas aprobando

> Seccion para revision rapida. El detalle vive en Requirements, en "Reconciliacion sp10" y en Tasks.

**Que se quiere**: los permisos de los 4 roles curriculares (Consultor / Diseñador / Revisor / Autoridad Curricular) hoy cuelgan directo del rol via `core_RoleCapability`. Este ticket los migra a **application profiles por modulo** (`core_ModRole`, en `profiles/`), renombra los 4 roles a `Learning Assurance <Rol>` (sin guion), retira lo que quedo en desuso, completa la capability de institucion (caso PO) y **cablea el vinculo rol -> perfil de forma declarativa**. El valor: migrar sin que ningun rol pierda un permiso efectivo.

**Encuadre (Aduana `mal-encuadrado`)**: el mecanismo ya existe integro en core (UPONE-1353/1354). Es migracion mod-only.

**Mecanismo objetivo (sp10, verificado en codigo; ver "Reconciliacion sp10")**:
1. **Vinculo declarativo, sin runbook**: `profileRoleMapping` en `config/app.json` + `syncAppProfileMapping`, preservando ownership humano.
2. **Gate XOR**: el mod deja de declarar directo al `core_Role` las caps que migran al perfil.
3. **Visibilidad por profile-gating** (`navByRole`, `app.resolver.js:132-141`): visible solo a quien tiene un perfil mapeado; nunca publica.
4. **Convencion de nombres** (`roleNaming.js`, UPONE-1699): el detector de colisiones fue eliminado (aviso a core obsoleto).
5. Herencia/dedupe intactas; el **gap de institucion** es el caso a cerrar end-to-end.

**Deltas de comportamiento intencionales**: `institution:view` en la base de cd (REQ-ADD-01), nombres de rol (REQ-PRESERVE-02) y visibilidad por profile-gating (REQ-VIS-01).

**En alcance (mapeo de roles core, regla parcial O1 del PO)**: los **4 roles curriculares + Admin y Consultor**; Admin/Consultor se mapean a su **perfil compuesto** (Diseñador ∪ Autoridad) por modulo (REQ-SET-02), lo que ademas les da la visibilidad de las apps bajo profile-gating (DEC-LOCAL-14).

**Fuera de alcance**: el mapeo de los **8 roles restantes** del catalogo core; sacar Admin/Consultor de `DEFAULT_ROLES` (cambio de core); acotar `offering` del Diseñador (O2, engagement).

**Como se sabe que funciona**: matriz automatizada verde (cada perfil concede lo que su rol declara, incl. `institution:view`) + smoke runtime con **rol curricular activo** (Diseñador crea plan end-to-end; Consultor read-only no crea/edita); baseline efectivo antes/despues identico salvo institucion; 4 roles renombrados con 120 asignaciones; huerfano y fixtures no reaparecen; Admin/Consultor conservan las apps en el nav via su compuesto.
## Purpose

Migrar la declaracion de permisos de los 4 roles curriculares del acoplamiento directo rol -> capability (`core_RoleCapability`) hacia **application profiles por modulo** (`core_ModRole` en `profiles/` de curriculum-design y curriculum-mapping), adoptando el cableado **declarativo** del vinculo (`profileRoleMapping` en `config/app.json`, materializado por `syncAppProfileMapping`) y respetando el **gate XOR**. Preserva los permisos efectivos por rol (equivalencia post-traslado por herencia/dedupe), agrega `institution:view` en la base de cd (caso PO), renombra los roles reutilizando las entidades, retira lo que quedo en desuso, y **privatiza la visibilidad** de las dos apps por profile-gating (`navByRole`). Deltas observables: `institution:view`, nombres de rol, y privatizacion. El mapeo de los roles del core esta resuelto parcial (regla O1 del PO): **en alcance Admin/Consultor -> perfil compuesto** (Diseñador ∪ Autoridad), lo que ademas les preserva la visibilidad; **diferido** solo el mapeo de los 8 roles restantes del catalogo.
## Requirements

### REQ-PRESERVE-01 `inferred`
> Fuente: object-manager/src/services/auth/modRoleCapabilities.js:19-56; baseline de caps efectivas capturado en S1; la excepcion acotada a cd depende de la verificacion de aislamiento por app (precondicion dura de S2).

Los permisos efectivos por rol en runtime son identicos al baseline previo, SALVO institution:view en los 4 roles de curriculum-design (REQ-ADD-01), tras la migracion a application profiles: lo que hoy concede el core_Role directo lo concede el perfil mapeado (equivalencia post-traslado por herencia y dedupe).

### REQ-PRESERVE-02 `confirmed`
> Fuente: DEC-LOCAL-15 (resuelta: quitar el guion); roleNaming.js: isConventionalRoleName (PascalCase espanol, espacios simples); mods/curriculum-design/seed/_data-rbac.js:36-57 ROLE_DEFINITIONS (upsert by name)

El renombre de los 4 roles a 'Learning Assurance <Rol>' (sin guion, conforme a roleNaming.js: PascalCase espanol, espacios simples) conserva las 120 asignaciones y deja 4 roles (no 8) al correr sobre una base con los nombres viejos.

### REQ-PRESERVE-03 `confirmed`
> Fuente: object-manager/src/services/auth/modRoleCapabilities.js:74-108

Un application profile declarado en profiles/ pero sin profileRoleMapping no tiene ningun efecto runtime: no altera el conjunto efectivo de ningun rol (estado intermedio antes del cableado declarativo).

### REQ-CONVIV-01 `inferred`
> Fuente: object-manager/src/services/auth/modRoleCapabilities.js:19-56; config/app.json (profileRoleMapping) + syncAppProfileMapping; validacion empirica en execute (HR1)

Tras el cableado declarativo (profileRoleMapping) y el retiro de las caps directas migradas (gate XOR), el conjunto efectivo por rol es identico al baseline SALVO institution:view en cd: la migracion traslada las capabilities del core_Role al perfil y la herencia+dedupe garantiza equivalencia, sin acumulacion ni perdida.

### REQ-PRESERVE-04 `confirmed`
> Fuente: spec seccion 'Reconciliacion sp10'; mods/curriculum-mapping/tests/unit/rbacRoles.test.js

La suite de RBAC existente pasa verde tras la migracion a application profiles; los tests que se modifiquen (paridad cd/cm, nombres de rol) se tocan solo con intencion documentada en el spec.

### REQ-ADD-01 `confirmed`
> Fuente: object-manager/src/graphql/resolvers/instance.resolver.js:1708 (listInstances gateado por view); kb/sp8/UPONE-1538-rbac-institution-view-gap.md

Los roles de curriculum-design pueden leer institucion (institution:view declarada en el perfil base de cd, no en el mapa del rol por el gate XOR), lo que desbloquea el caso PO end-to-end: crear un plan de estudio con el selector de institucion poblado.

### REQ-SET-01 `confirmed`
> Fuente: spec seccion 'Reconciliacion sp10'; object-manager/src/services/auth/modRoleCapabilities.js:32-56 (resolveModRoleCapabilityNames, cycle guard)

Cada modulo declara un application profile base + extensiones (por rol) cuya union replica el mapa de capabilities del rol; la herencia por extendsId resuelve la union sin duplicar y la composicion es por modulo (no espejo entre cd y cm).

### REQ-SET-02 `confirmed`
> Fuente: app.resolver.js:132-141 (navByRole / profile-gating); dbSync.js:1481 (syncAppProfileMapping); generateCapabilities.js:331-357 (DEFAULT_ROLES refill, Learn L1); DEC-LOCAL-14

EN ALCANCE (regla parcial de O1 del PO). Declarar los perfiles compuestos (union Diseñador ∪ Autoridad) para Admin/Consultor en cd y cm (extends Autoridad + delta Diseñador, derivado del mapa vivo) y mapearlos via profileRoleMapping. Bajo profile-gating ese mapping da a Admin/Consultor la VISIBILIDAD de las apps curriculares (el refill del core repone capabilities, no visibilidad de app) y el cableado future-proof (cuando el core saque a Admin/Consultor de DEFAULT_ROLES caen al compuesto). Diferido solo el mapeo de los 8 roles restantes del catalogo.

### REQ-VIS-01 `confirmed`
> Fuente: app.resolver.js:132-141 (navByRole); UPONE-1700; UPONE-1616

Privatizar las dos apps por profile-gating (navByRole): visibles solo a quien tiene un perfil mapeado. Conservan visibilidad los 4 roles curriculares y Admin/Consultor (via su perfil compuesto); el resto no las ve; borrar los mappings las oculta. Coordinar con UPONE-1616.

### REQ-LINK-01 `confirmed`
> Fuente: dbSync.js:1424-1428 (gate XOR array roles vs profileRoleMapping), dbSync.js:1481 (syncAppProfileMapping), app.resolver.js:132-141 (navByRole)

El vinculo rol->perfil se declara en config/app.json (profileRoleMapping) y lo materializa el sync (syncAppProfileMapping, dbSync.js:1481), que crea las filas up1_suite_app_role que dan la visibilidad. Incluye los 4 curriculares -> su perfil por modulo y Admin/Consultor -> compuesto. Respeta el gate XOR (dbSync.js:1424-1428): el app.json declara profileRoleMapping y NO el array `roles` institucional (mutuamente excluyentes). Preserva las asignaciones con ownership humano. Sin runbook manual.

### REQ-RETIRE-01 `confirmed`
> Fuente: mods/curriculum-design/profiles/ (fixtures GestorCurricular/LectorCurricular); object-manager/scripts/sync/dbSync.js (syncModRolesForApp); UPONE-1699 (auto-create de roles desde layout eliminado)

Se retiran el core_Role huerfano GestorCurricular y los 2 fixtures (GestorCurricular/LectorCurricular) que hoy ocupan curriculum-design/profiles/, sin regeneracion: dos corridas de sync consecutivas no los recrean.

### REQ-DOC-01 `confirmed`
> Fuente: object-manager/scripts/sync/roleNaming.js; mods/curriculum-design/profiles/, mods/curriculum-mapping/profiles/; object-manager/scripts/sync/dbSync.js (syncAppProfileMapping)

Documentar el escenario final consolidado tras la migracion: mapa rol -> application profile -> capabilities por modulo (cd/cm) con perfil base + extensiones; los 4 roles renombrados a 'Learning Assurance <Rol>' (sin guion, conforme a roleNaming.js) con las 120 asignaciones conservadas; el huerfano GestorCurricular y los 2 fixtures retirados; el cableado DECLARATIVO via profileRoleMapping en config/app.json materializado por el sync (sin runbook manual); la privatizacion por profile-gating (navByRole); el gap de institucion resuelto en la base de cd; y la absorcion de las capabilities de UPONE-1619 y UPONE-1633.

### REQ-TEST-01 `confirmed`
> Fuente: DEC-LOCAL-06; UPONE-1353/1354 (mecanismo de sets en core); up1: object-manager/src/services/auth/modRoleCapabilities.js:32-56

Testing como requisito final: cobertura del camino real del lado del mod (mapping declarativo, renombre sobre base con nombres viejos, gate XOR, equivalencia estructural perfil<->mapa) + la matriz automatizada (REQ-MATRIX-01) + el smoke runtime (REQ-SMOKE-01) + regresion de la suite RBAC verde. La herencia por extendsId y el dedupe son camino de core (UPONE-1353/1354, DEC-LOCAL-06): se verifican por la matriz y la equivalencia estructural, no por unit del resolver desde el mod.

### REQ-NOTIFY-01 `confirmed`
> Fuente: object-manager/scripts/sync/roleNaming.js (isConventionalRoleName / isAppProfileCandidate); UPONE-1699 (eliminacion de validateModRoleNameCollisions); request inmutable (punto ciego de proteccion de nombres, no bloqueante)

Los nombres de application profiles y roles cumplen la convencion (roleNaming.js: isConventionalRoleName / isAppProfileCandidate), sin referencias residuales al detector eliminado. Ademas se AVISA a core (no bloqueante) que, tras eliminar validateModRoleNameCollisions (UPONE-1699), la deteccion de COLISIONES de nombres quedo sin cobertura (roleNaming reporta formato, no colisiones): el punto ciego del request sigue vigente y se traslada a core reformulado, no se da por cerrado por la eliminacion del detector.

### REQ-PROFILE-01 `confirmed`
> Fuente: mods/curriculum-design/profiles/ (ex roles/); mods/curriculum-mapping/profiles/ (carpeta nueva); mods/curriculum-design/seed/_data-rbac.js

Autoria real de los application profiles en profiles/ de cada modulo (perfil base + extensiones por rol), migrando hacia los perfiles las capabilities que hoy cuelgan directo de los 4 core_Role, y reemplazando los 2 fixtures (GestorCurricular/LectorCurricular) que hoy ocupan curriculum-design/profiles/. curriculum-mapping debe declarar su propia carpeta profiles/.

### REQ-CAPS-01 `confirmed`
> Fuente: dbSync.js:1424-1428 (XOR sobre array roles, no sobre capabilities), dbSync.js:1481 (syncAppProfileMapping), seeds _data-rbac.js de curriculum-design y curriculum-mapping, UPONE-1619 / UPONE-1633

Absorber en los application profiles las capabilities nuevas de UPONE-1619 (instructionalcomponenttype:*) y UPONE-1633 (competencynode:adopt/exempt) ademas del mapa curricular, decidiendo base vs extension por rol. El cut-over retira del seed las caps directas del core_Role una vez que viven en el perfil (el dedupe por nombre hace inocua la coexistencia transitoria; el estado final limpio no las duplica). El retiro NO lo fuerza el gate XOR (que es sobre el array roles): lo motiva mover la fuente de verdad al perfil; solo requiere orden (declarar el mapping antes de retirar).

### REQ-MATRIX-01 `confirmed`
> Fuente: object-manager/src/graphql/resolvers/instance.resolver.js:1708 (gate listInstances); object-manager/src/services/auth/modRoleCapabilities.js:32-56 (resolveModRoleCapabilityNames)

Auditoria de la matriz de permisos como asercion automatizada: para cada application profile, por cada accion que el rol declara, la capability requerida (resuelta contra el gate real del resolver, p.ej. crear plan de estudio requiere institution:view por listInstances) debe estar en el conjunto efectivo del perfil (resolveModRoleCapabilityNames). El test falla si falta una, incluida institution:view. No depende de Admin/Consultor.

### REQ-SMOKE-01 `confirmed`
> Fuente: object-manager/src/services/auth/authChecker.js:118-119 (selectedRole no acumula); object-manager/src/services/auth/generateCapabilities.js:336 (DEFAULT_ROLES refill)

Smoke runtime en UPU con rol curricular ACTIVO (selector de rol activo; authChecker con selectedRole no acumula otros roles del usuario): cada rol ejecuta sus acciones declaradas; el Disenador crea un plan de estudio end-to-end con el selector de institucion poblado; el rol read-only (Consultor curricular) no puede crear ni editar. Admin y Consultor de core quedan EXCLUIDOS del smoke de scoping porque el core les hace refill de toda capability (DEFAULT_ROLES), lo que daria falso verde.
## Refactor map

### Files (mod, en alcance)
- `mods/curriculum-design/profiles/*.json` y `mods/curriculum-mapping/profiles/*.json`: perfil base + 3 extensiones por rol + **1 perfil compuesto (Diseñador ∪ Autoridad) para Admin/Consultor** por modulo; reemplazan los 2 fixtures de cd.
- `mods/curriculum-design/seed/_data-rbac.js` y `mods/curriculum-mapping/seed/_data-rbac.js`: (a) quitar del mapa directo las caps que migran (gate XOR); (b) paso de renombre idempotente por nombre viejo; (c) `institution:view` en la base de cd; (d) absorber caps de UPONE-1619/1633 en base vs extension.
- `config/app.json` de ambos mods: `profileRoleMapping` (4 curriculares -> su perfil; Admin/Consultor -> compuesto) y `navByRole` (profile-gating). No declarar el array `roles` institucional (lo prohibe el XOR).
- Tests: `rbacRoles.test.js` (cd+cm, paridad reconciliada), test de la matriz de permisos (REQ-MATRIX-01), test de equivalencia perfil<->mapa (REQ-SET-01), test del gate XOR y de ownership humano (REQ-LINK-01), test de nav (REQ-VIS-01).
- Docs que referencian los nombres de rol.

### Mecanismo de core consumido (no se modifica)
`syncAppProfileMapping` / `validateProfileRoleMappings` (dbSync.js), `resolveModRoleCapabilityNames` (modRoleCapabilities.js), `app.resolver.js` (navByRole), `roleNaming.js`.

### Fuera de alcance de codigo
- Asignacion manual de `modRoleId` en up1-manager: ya no aplica (el vinculo es declarativo).
- Mapeo de los **8 roles restantes** del catalogo core (O1 solo resuelto para Admin/Consultor). Los perfiles compuestos Admin/Consultor SI estan en alcance (REQ-SET-02, DEC-LOCAL-14).
- Sacar Admin/Consultor de `DEFAULT_ROLES` (cambio de core).
## Tasks

#### S1.T1 — Capturar el run verde de la suite RBAC (rbacRoles.test.js de cd y cm) como baseline de regresion ANTES de tocar nada, para el before/after de la regresion final de S6. Files: docs/rbac/regresion-baseline.md. Validation: ambas suites verdes con su conteo. Rollback: borrar el doc.
Contrato: rollback: borrar el doc. Status: pending

#### S1.T2 — Volcado de capabilities efectivas por rol/perfil como baseline previo a tocar nada, corriendo el sync actual y exportando el conjunto resuelto (core_RoleCapability directos + resolveModRoleCapabilityNames) a un artefacto versionado. Files: scripts/rbac/dump-effective-caps.js (nuevo), docs/rbac/baseline-caps-<fecha>.json (nuevo, artefacto de evidencia). Validation: el dump lista los 4 roles curriculares + Admin/Consultor con su conteo de caps y es reproducible (dos corridas consecutivas dan el mismo set).
Contrato: rollback: Borrar scripts/rbac/dump-effective-caps.js y el artefacto docs/rbac/baseline-caps-<fecha>.json; no hay mutacion de datos ni de seed, el sync se corre read-only sobre el estado vigente.. Status: pending

#### S1.T3 — Construir la matriz accion->capability por rol para curriculum-design y curriculum-mapping, resolviendo la capability requerida contra el gate real del resolver: p.ej. crear plan de estudio -> institution:view por listInstances (instance.resolver.js:1708). Files: docs/rbac/matriz-accion-capability.md (nuevo). Validation: cada fila de la matriz cita archivo:linea del gate que la exige; no hay accion declarada sin capability resuelta. Rollback: borrar el doc.
Contrato: rollback: Borrar docs/rbac/matriz-accion-capability.md; tarea puramente documental, sin cambios de codigo ni de datos.. Status: pending

#### S1.T4 — Cruzar la matriz contra el baseline y marcar los huecos por rol (capability exigida por el gate y ausente del efectivo), incluido institution:view en los 4 roles de cd. Files: docs/rbac/matriz-accion-capability.md (seccion Huecos), docs/rbac/baseline-caps-<fecha>.json (referencia). Validation: la lista de huecos incluye explicitamente institution:view para los 4 roles curriculares y cada hueco queda trazado a la fila de matriz que lo exige.
Contrato: rollback: Revertir la seccion Huecos de docs/rbac/matriz-accion-capability.md; sin impacto en runtime.. Status: pending

#### S1.T5 — Poblar en el cuerpo del ticket el Coverage map (REQ -> test cases) y dejar preparada la tabla de Regresion (suite/comando/before/after/delta) para ambas suites rbacRoles.test.js (cd y cm), con el before capturado. Files: cuerpo del ticket (## Testing). Validation: cada REQ tiene su(s) test case(s) mapeado(s) y la tabla de regresion tiene las filas suite/comando con el before. Rollback: n/a (documental).
Contrato: rollback: n/a (documental). Status: pending

#### S2.T1 — Secuenciar o rebasar con UPONE-1619 (mismo mods/curriculum-design/seed/_data-rbac.js) antes de tocar el seed; acordar orden de merge con el responsable de ese ticket y dejar registro del acuerdo
Contrato: rollback: n/a coordinacion. Status: pending

#### S2.T2 — Verificar empiricamente el aislamiento por app del enriquecimiento runtime (modRoleCapabilities.js:74-108) ANTES de comprometer la excepcion de institucion: confirmar si institution:view declarada en el perfil base de cd queda acotada a cd o se filtra al mismo rol operando en cm. Files: test/volcado de efectivo por app. Validation: el efectivo del rol en cm NO incluye institution:view; si el runtime no aisla por app, se reformulan REQ-PRESERVE-01 y REQ-SET-01 y su test case. Rollback: n/a (verificacion).
Contrato: rollback: n/a (verificacion). Status: pending

#### S2.T3 — Declarar los 2 perfiles compuestos (union Diseñador ∪ Autoridad) en cd y cm para Admin/Consultor (extends la extension Autoridad + delta Diseñador, derivado del mapa vivo). DEPENDE de que la extension Autoridad ya este declarada (autoria de perfiles de S2, se ejecuta antes que esta task). Files: mods/curriculum-design/profiles/*.json, mods/curriculum-mapping/profiles/*.json. Validation: la union resuelta del compuesto == Diseñador ∪ Autoridad del modulo, sin faltantes ni sobrantes; los perfiles standalone no se alteran. Rollback: borrar los archivos del compuesto.
Contrato: rollback: borrar los archivos del compuesto. Status: pending

#### S2.T4 — Crear profiles/ en curriculum-design con el perfil base + extensiones por rol (Revisor/Diseñador/Autoridad) via extendsId, migrando las caps que hoy cuelgan del core_Role. Files: mods/curriculum-design/profiles/*.json. Validation: el sync materializa los perfiles y la union base+extension de cada rol coincide con el baseline de caps efectivas de S1, sin duplicar. Rollback: borrar los archivos de profiles/ (los core_Role directos siguen intactos hasta el retiro por gate XOR de S4).
Contrato: rollback: Borrar los archivos nuevos de mods/curriculum-design/profiles/ y correr el sync: sin perfiles declarados el efectivo vuelve a depender solo de los core_Role directos, que en esta session siguen intactos (el gate XOR se aplica recien en S4.T2).. Status: pending

#### S2.T5 — Crear profiles/ en curriculum-mapping con base + extensiones propias del modulo: la composicion se deriva del mapa real de cm, no se copia en espejo desde cd. Files: mods/curriculum-mapping/profiles/*.json (nuevos, carpeta nueva), mods/curriculum-mapping/seed/_data-rbac.js (referencia). Validation: el sync materializa los perfiles de cm y el efectivo por rol coincide con el baseline de cm; una asercion verifica que las composiciones de cd y cm difieren (no son espejo).
Contrato: rollback: Borrar la carpeta mods/curriculum-mapping/profiles/ y correr el sync; los core_Role directos de cm siguen vigentes en esta session.. Status: pending

#### S2.T6 — Declarar institution:view y los transversales (core_datalog:view, core_user.name:view) en el perfil base de cd, y los transversales en la base de cm (dedupe por nombre). Files: perfiles base de cd y cm. Validation: institution:view aparece en el efectivo de los 4 roles de cd y cierra el hueco de institucion marcado en el baseline de S1; los transversales no se duplican. Rollback: quitar las caps agregadas.
Contrato: rollback: Quitar las lineas de capabilities agregadas en los dos archivos base y correr el sync; el estado previo no tenia institution:view, por lo que se vuelve al hueco conocido sin efecto colateral.. Status: pending

#### S2.T7 — Absorber en los application profiles las capabilities nuevas de UPONE-1619 (instructionalcomponenttype:view/create/modify/delete) y UPONE-1633 (competencynode:adopt/exempt), decidiendo por cada una base vs extension segun que rol la necesita. Files: mods/curriculum-design/profiles/*.json, mods/curriculum-mapping/profiles/*.json. Validation: cada capability de 1619/1633 aparece exactamente una vez en el arbol de perfiles del modulo que la usa y el rol que la ejercia antes la conserva en su efectivo.
Contrato: rollback: Revertir las capabilities agregadas de 1619/1633 en profiles/; siguen cableadas directo al core_Role (el retiro del directo ocurre en S4.T2), por lo que ningun rol pierde acceso.. Status: pending

#### S2.T8 — Ajustar los nombres de los application PROFILES a la convencion (roleNaming.js: isConventionalRoleName / isAppProfileCandidate) y verificar con un test unitario que cada nombre de perfil declarado pasa la convencion, sin residuos de referencias al detector eliminado validateModRoleNameCollisions. Los nombres de ROL se renombran en S3 (no aca). Files: mods/curriculum-design/profiles/*.json, mods/curriculum-mapping/profiles/*.json, test unitario de nombres. Validation: el sync no reporta no-conformidad; el test evalua cada nombre de perfil contra isConventionalRoleName/isAppProfileCandidate. Rollback: revertir los renombres de perfil.
Contrato: rollback: Revertir los renombres de perfiles a los nombres previos; como estos perfiles se crean en esta misma session y aun no tienen mapping, no hay vinculos que queden colgados.. Status: pending

#### S2.T9 — Coordinar con UPONE-1633 el orden de merge/rebase sobre mods/curriculum-mapping/seed/_data-rbac.js (competencynode:adopt/exempt): el retiro por gate XOR de esas caps directas y la absorcion en el perfil deben acordarse para que 1633 no reponga las directas y rompa el XOR. Validation: acuerdo de orden registrado. Rollback: n/a (coordinacion).
Contrato: rollback: n/a (coordinacion). Status: pending

#### S2.T10 — Test de equivalencia estructural (antes del cut-over de S4): la union resuelta base ∪ extension de cada perfil (y del compuesto) == mapa de caps del core_Role en el baseline de S1, sin faltantes ni sobrantes; y cada capability de UPONE-1619/1633 aparece exactamente una vez en el arbol de perfiles del modulo que la usa. Detecta una cap no migrada ANTES del cut-over. Files: mods/curriculum-*/tests/unit/rbacProfiles.test.js. Validation: el test pasa; ninguna cap del baseline falta en el perfil resuelto; caps de 1619/1633 sin duplicar. Rollback: borrar el test.
Contrato: rollback: borrar el test. Status: pending

#### S3.T1 — Agregar al seed un paso de renombre idempotente que reutiliza las entidades core_Role existentes (update por nombre viejo -> 'Learning Assurance <Rol>', sin guion) en vez de que ensureRoles upsertee por name y forkee 4 roles nuevos. Files: mods/curriculum-design/seed/_data-rbac.js, mods/curriculum-mapping/seed/_data-rbac.js. Validation: correr el seed dos veces deja los mismos 4 roles con los nombres nuevos, sin duplicados. Rollback: quitar el paso de renombre y ejecutar el update inverso sobre los mismos ids.
Contrato: rollback: Quitar el paso de renombre del seed y ejecutar el update inverso (nombres nuevos -> nombres viejos) sobre los mismos ids: como se reutilizan entidades, revertir el literal restaura el estado sin tocar asignaciones.. Status: pending

#### S3.T2 — Barrido GLOBAL del monorepo de todas las referencias a los 4 nombres viejos de rol, alineandolas a 'Learning Assurance <Rol>' (sin guion): seeds, tests, docs, arrays roles:/config de CUALQUIER mod y filtros por rol activo. Incluye barrer referencias residuales al detector validateModRoleNameCollisions (eliminado, UPONE-1699). El aviso a core NO se barre: se reformula y se conserva (REQ-NOTIFY-01). Depende del paso de renombre de esta sesion. Validation: grep de los 4 literales viejos y de validateModRoleNameCollisions da 0 fuera del paso de renombre; paridad cd/cm verde. Rollback: revertir el commit del barrido.
Contrato: rollback: Revertir el commit del barrido (cambios solo de literales en seeds, tests y docs, sin efecto sobre datos ya migrados).. Status: pending

#### S3.T3 — Verificar el renombre sobre una base que ya tiene los nombres viejos: restaurar una copia del store con los 4 roles antiguos y sus 120 asignaciones, correr el seed y contar. Files: scripts/rbac/verify-rename.js (nuevo), mods/curriculum-design/seed/_data-rbac.js (bajo prueba). Validation: tras el seed quedan 4 roles curriculares (no 8), ninguno con nombre viejo, y el conteo de asignaciones sigue en 120; el script falla con exit code distinto de cero si cualquiera de las tres condiciones no se cumple.
Contrato: rollback: Descartar la base de prueba restaurada y borrar scripts/rbac/verify-rename.js; la verificacion corre sobre copia, nunca sobre el store vivo.. Status: pending

#### S4.T1 — Declarar profileRoleMapping en config/app.json de ambos mods (4 curriculares -> su perfil; Admin/Consultor -> compuesto) y navByRole para el profile-gating. navByRole ES una clave declarable en config/app.json del mod (ej. mods/hello-world-mod/config/app.json; se persiste como columna up1_suite_app.navByRole, dbSync.js:717; el resolver la lee en app.resolver.js:127-141). Asegurar que el app.json NO declare el array roles institucional (gate XOR, dbSync.js:1424-1428, mutuamente excluyente con profileRoleMapping). El sync (syncAppProfileMapping, dbSync.js:1481) crea las filas up1_suite_app_role. Files: config/app.json de cd y cm. Validation: sync 2x idempotente; una fila de mapping por rol al perfil correcto; app.json sin array roles; gate XOR pasa. Rollback: git checkout de ambos app.json y re-sync.
Contrato: rollback: git checkout de mods/curriculum-design/config/app.json y mods/curriculum-mapping/config/app.json, luego re-sync.. Status: pending

#### S4.T2 — Cut-over: retirar del seed _data-rbac.js de ambos mods las caps directas del core_Role que ya viven en los perfiles (incl. 1619/1633), para que la fuente de verdad sea el perfil. Orden: DESPUES de declarar el profileRoleMapping (S4.T1); la coexistencia transitoria es inocua por el dedupe por nombre. Files: seeds _data-rbac.js de cd y cm. Validation: el efectivo por rol tras el retiro == baseline de caps efectivas de S1 (salvo institution:view en cd), llegando por el perfil; grep de las caps de 1619/1633 en los seeds da 0. Rollback: restaurar las declaraciones directas y correr el seed (revertir en orden inverso: primero este cut-over, luego el mapping si hiciera falta).
Contrato: rollback: Restaurar las declaraciones directas de capabilities en los seeds _data-rbac.js de cd y cm y correr el seed; revertir en orden inverso (primero el cut-over, luego el mapping si hiciera falta).. Status: pending

#### S4.T3 — Privatizar la visibilidad de ambas apps por profile-gating: declarar navByRole en config/app.json (clave del mod; columna up1_suite_app.navByRole; el resolver deriva isNavScoped en app.resolver.js:127-141). Verificar los dos sentidos: un rol con perfil mapeado ve la app; un rol sin perfil no la ve; borrar los mappings la oculta (no la vuelve publica). Files: config/app.json de ambos mods + test de nav. Validation: nav visible para un rol curricular y para Admin/Consultor; oculto para un rol sin perfil; sin-mappings oculto. Rollback: revertir navByRole en los app.json y re-sync. (La coordinacion con UPONE-1616 la cubre su task propia en S4.)
Contrato: rollback: git checkout -- los config/app.json de ambos mods y el test de visibilidad, luego re-correr el sync: se vuelve al modelo de visibilidad previo. Riesgo del revert: si los mappings quedan borrados y el gate viejo ya no aplica, las apps podrian quedar ocultas para todos; verificar el nav tras revertir y, si hace falta, restaurar tambien los mappings de S4.T1 en el mismo revert.. Status: pending

#### S4.T4 — Verificar que el cableado declarativo preserva el ownership humano y no altera el efectivo: (a) las filas con ownership humano sobreviven a dos syncs; (b) el efectivo por rol con los mappings == baseline de caps efectivas de S1 salvo institution:view en cd, por dedupe/herencia; (c) un perfil declarado sin profileRoleMapping no altera el efectivo (estado intermedio). Files: test de equivalencia (suite RBAC del mod) + volcado de comparacion contra el baseline. Validation: diff vacio post-cut-over vs baseline (salvo institucion) para los 4 roles; 120 asignaciones; sync 2x sin cambios. Rollback: borrar el test; si el diff no da vacio, restaurar las caps directas del seed.
Contrato: rollback: Borrar el test de equivalencia y el volcado de comparacion; si el diff no da vacio, restaurar las caps directas en los seeds _data-rbac.js.. Status: pending

#### S4.T5 — Reconciliar el test de paridad cd/cm (rbacRoles.test.js) con el modelo de perfiles: tras el retiro de las caps directas (S4.T2) la comparacion ROLE_DEFINITIONS cd vs cm ya no aplica al mapa amputado; mover la paridad al arbol de profiles/ o actualizar el assert con intencion documentada (REQ-SET-01 exige composicion por modulo, no espejo). Atomico con S4.T1/T2 (mismo PR). Files: mods/curriculum-design/tests/unit/rbacRoles.test.js, mods/curriculum-mapping/tests/unit/rbacRoles.test.js. Validation: el test de paridad refleja el modelo de perfiles (no el mapa directo) y queda verde. Rollback: revertir el test al estado previo.
Contrato: rollback: revertir el test al estado previo. Status: pending

#### S4.T6 — Mapear Admin y Consultor via profileRoleMapping al perfil compuesto de cada modulo y verificar la visibilidad por profile-gating: la app aparece para Admin/Consultor y para los 4 roles curriculares, y NO para un rol sin perfil. Files: config/app.json de ambos mods; test de nav (app.resolver navByRole). Validation: nav visible para Admin y para un rol curricular; oculto para un rol sin perfil mapeado. Rollback: quitar el mapping de Admin/Consultor.
Contrato: rollback: quitar el mapping de Admin/Consultor. Status: pending

#### S4.T7 — Coordinar/avisar a UPONE-1616 ANTES de privatizar la visibilidad: crear los profileRoleMapping cambia la evidencia de menu que 1616 observa. Validation: aviso a 1616 registrado antes de mergear la privatizacion. Rollback: n/a (coordinacion).
Contrato: rollback: n/a (coordinacion). Status: pending

#### S5.T1 — Avisar a UPONE-1530 (frontera del MCP): cambian los nombres de rol y los permisos que el MCP expone/valida; dejar constancia del aviso
Contrato: rollback: n/a aviso. Status: pending

#### S5.T2 — Retirar el core_Role huerfano GestorCurricular con guarda de borrado destructivo: capturar previamente sus asignaciones y capabilities, abortar el retiro si tiene asignaciones vivas, y recien entonces eliminarlo. Files: scripts/rbac/retire-orphan-role.js (nuevo), docs/rbac/retiro-gestorcurricular-captura.json (evidencia previa). Validation: la captura previa demuestra cero asignaciones vivas; tras el retiro el rol no existe y ningun usuario pierde acceso (diff de efectivo por usuario = vacio).
Contrato: rollback: Recrear el core_Role desde docs/rbac/retiro-gestorcurricular-captura.json (nombre + capabilities + asignaciones capturadas); la captura previa es la condicion que hace reversible el borrado.. Status: pending

#### S5.T3 — Eliminar los 2 fixtures que hoy ocupan curriculum-design/profiles/ (GestorCurricular.json y LectorCurricular.json, fixtures RBAC-01 de UPONE-1353), reemplazados por los application profiles reales autorados en S2. Files: mods/curriculum-design/profiles/GestorCurricular.json (borrado), mods/curriculum-design/profiles/LectorCurricular.json (borrado). Validation: la carpeta profiles/ de cd contiene solo los perfiles reales (base + extensiones) y el sync corre sin referencias colgadas a los fixtures.
Contrato: rollback: Restaurar los dos archivos de fixture desde git y correr el sync; son declaraciones en el repo del mod, recuperables sin perdida.. Status: pending

#### S5.T4 — Confirmar la no-regeneracion: correr el sync dos veces consecutivas tras el retiro del huerfano y los fixtures, y verificar que ninguno reaparece (auto-create desde layout eliminado, UPONE-1699). Files: inspeccion de layouts de cd, scripts/rbac/verify-no-regen.js. Validation: tras sync 1 y 2 la consulta por los tres nombres retirados da 0. Rollback: si un nombre reaparece, identificar el layout que lo auto-crea y corregir antes de re-ejecutar el retiro de S5.
Contrato: rollback: si un nombre reaparece, identificar el layout que lo auto-crea y corregir la referencia antes de re-ejecutar el retiro del huerfano y de los fixtures de esta sesion (S5).. Status: pending

#### S5.T5 — Avisar a core (NO bloqueante) que la deteccion de COLISIONES de nombres quedo sin cobertura tras eliminar validateModRoleNameCollisions (UPONE-1699): roleNaming.js reporta formato, no colisiones, asi que el punto ciego del request sigue vigente y se traslada a core reformulado. Validation: aviso registrado (link/ticket/mensaje a core). Rollback: n/a (aviso).
Contrato: rollback: n/a (aviso). Status: pending

#### S6.T1 — Verificar REQ-SET-02 (positivo): los 2 perfiles compuestos (union Diseñador ∪ Autoridad) estan declarados en profiles/ de cd y cm y Admin/Consultor estan mapeados a ellos via profileRoleMapping; la union resuelta del compuesto == Diseñador ∪ Autoridad por modulo, y los perfiles standalone (Diseñador, Autoridad) no se alteran. Files: mods/curriculum-design/tests/unit/rbacProfiles.test.js. Validation: el assert pasa (compuesto == union, standalone intactos, Admin/Consultor mapeados al compuesto). Rollback: borrar el assert.
Contrato: rollback: borrar el assert. Status: pending

#### S6.T2 — Dejar la matriz de permisos como asercion automatizada corriendo verde en CI: por cada application profile, cada accion declarada por el rol debe tener su capability requerida (resuelta contra el gate real del resolver) dentro del efectivo de resolveModRoleCapabilityNames; el test falla si falta alguna, incluida institution:view, y no depende de Admin/Consultor. Files: mods/curriculum-*/tests/unit/permissionMatrix.test.js (nuevo), docs/rbac/matriz-accion-capability.md (fuente de las filas), configuracion de CI del mod. Validation: el test corre en CI y falla de forma demostrable al remover institution:view del perfil base de cd (prueba negativa ejecutada una vez).
Contrato: rollback: Excluir el test del pipeline y borrar mods/curriculum-*/tests/unit/permissionMatrix.test.js; no modifica perfiles ni datos.. Status: pending

#### S6.T3 — Smoke runtime en UPU con rol curricular ACTIVO seleccionado (authChecker con selectedRole no acumula otros roles del usuario): cada rol ejecuta sus acciones declaradas, el Disenador crea un plan de estudio end-to-end con el selector de institucion poblado, y el rol read-only no puede crear ni editar. Admin y Consultor de core quedan excluidos del smoke de scoping por el refill de DEFAULT_ROLES (darian falso verde). Files: docs/rbac/smoke-runtime-upu.md (guion + evidencia con capturas). Validation: evidencia por rol de accion permitida y accion denegada; el caso PO (crear plan con institucion) queda registrado como exitoso end-to-end.
Contrato: rollback: Deshacer en UPU los datos creados durante el smoke (el plan de estudio de prueba) y borrar el documento de evidencia; el smoke no altera configuracion de RBAC.. Status: pending

#### S6.T4 — Regresion obligatoria: correr la suite RBAC completa de ambos modulos y del core afectado, comparando resultados antes/despues de la migracion y documentando cada test modificado con su intencion. Files: mods/curriculum-design/tests/**, mods/curriculum-mapping/tests/**, object-manager tests de auth, docs/rbac/regresion-rbac.md (tabla suite/comando/before/after/delta). Validation: la suite queda verde; todo test tocado (paridad cd/cm, nombres de rol) tiene justificacion escrita; cero fallos nuevos respecto del run previo a la migracion.
Contrato: rollback: Revertir unicamente los tests modificados en esta task a su version previa; si la regresion queda roja, no se avanza: se revierte la session responsable del fallo antes de cerrar.. Status: pending

#### S6.T5 — Documentar el escenario final consolidado (mapa rol -> application profile -> capabilities por modulo con base + extensiones + compuesto; 4 roles renombrados con 120 asignaciones; huerfano y fixtures retirados; cableado declarativo via profileRoleMapping sin runbook; privatizacion por profile-gating; gap de institucion resuelto; absorcion de 1619/1633) y capturar la RULE. Files: docs/rbac/escenario-final-roles-curriculares.md, RULE en el KB. Validation: cada afirmacion traza a un archivo del repo o a la evidencia de verificacion de S6; la RULE queda registrada. Rollback: borrar el doc y retirar la RULE.
Contrato: rollback: Borrar docs/rbac/escenario-final-roles-curriculares.md y retirar la RULE capturada; documental, sin impacto en codigo ni runtime.. Status: pending
## Open questions

- [x] **O1 (RESUELTO PARCIAL) — Mapeo de roles core hacia perfiles.** El PO dio la regla de Admin/Consultor -> compuesto "Diseñador + Autoridad" (2 de 10 filas). Este spec cablea los **4 roles curriculares + Admin/Consultor** (REQ-SET-02 / REQ-LINK-01). Diferido solo el mapeo de los **8 roles restantes**.
- [x] **NOMBRES (RESUELTA, DEC-LOCAL-15).** `Learning Assurance <Rol>` SIN guion (conforme a `roleNaming.js`).
- [x] **Visibilidad de Admin/Consultor bajo profile-gating (RESUELTA).** Se cubre mapeandolos a su perfil compuesto (DEC-LOCAL-14).
- [ ] **Scoping cross-app de `institution:view` (verificar en ejecucion, gate de S2).** La verificacion de aislamiento por app (task de aislamiento de S2, precondicion dura) confirma si el enriquecimiento runtime (`modRoleCapabilities.js:74-108`) acota por app o resuelve la union de las apps activas del rol. Fallback si no aisla: declarar la cap en la extension del rol que la usa (no en la base) o aceptar el alcance ampliado y reformular el test case de PRESERVE-01/SET-01.
- [ ] **O1-REMANENTE (siguiente sprint) — Los 8 roles restantes del catalogo.**
- [ ] **CUT-OVER (sp10): ya ocurre para las caps migradas** (gate XOR, DEC-LOCAL-10). Fuera de alcance: sacar Admin/Consultor de `DEFAULT_ROLES` (cambio de core, Learn L1).
- [ ] **Punto ciego de nombres a core (del request, no bloqueante):** se avisa a core que la deteccion de colisiones quedo sin cobertura tras eliminar `validateModRoleNameCollisions` (UPONE-1699); ver REQ-NOTIFY-01.
- [ ] **O2 (coordinacion) — Acotar `offering:create/modify` del Diseñador.** Requiere acuerdo con engagement.
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-PRESERVE-01 (edit) `inferred`: Los permisos efectivos por rol en runtime son identicos al baseline previo, SALVO institution:view en los 4 roles de curriculum-design (REQ-
- REQ-NOTIFY-01 (edit) `confirmed`: Los nombres de application profiles y roles cumplen la convencion (roleNaming.js: isConventionalRoleName / isAppProfileCandidate), sin refer

**Tasks agregadas:**

- S4: Coordinar/avisar a UPONE-1616 ANTES de privatizar la visibilidad: crear los profileRoleMapping cambia la evidencia de menu que 1616 observa. Validation: aviso a 1616 registrado antes de mergear la privatizacion. Rollback: n/a (coordinacion). (valida: REQ-VIS-01; rollback: n/a (coordinacion))

**Task ops:**

- edit S5.T4 { rollback="si un nombre reaparece, identificar el layout que lo auto-crea y corregir la referencia antes de re-ejecutar el retiro del huerfano y de los fixtures de esta sesion (S5)." }

### Enmienda 2
**REQs:**

- REQ-PRESERVE-01 (edit) `inferred`: Los permisos efectivos por rol en runtime son identicos al baseline previo, SALVO institution:view en los 4 roles de curriculum-design (REQ-

**Tasks agregadas:**

- S5: Avisar a core (NO bloqueante) que la deteccion de COLISIONES de nombres quedo sin cobertura tras eliminar validateModRoleNameCollisions (UPONE-1699): roleNaming.js reporta formato, no colisiones, asi que el punto ciego del request sigue vigente y se traslada a core reformulado. Validation: aviso registrado (link/ticket/mensaje a core). Rollback: n/a (aviso). (valida: REQ-NOTIFY-01; rollback: n/a (aviso))

**Task ops:**

- edit S3.T2 { desc="Barrido GLOBAL del monorepo de todas las referencias a los 4 nombres viejos de rol, alineandolas a 'Learning Assurance <Rol>' (sin guion): seeds, tests, docs, arrays roles:/config de CUALQUIER mod y filtros por rol activo. Incluye barrer referencias residuales al detector validateModRoleNameCollisions (eliminado, UPONE-1699). El aviso a core NO se barre: se reformula y se conserva (REQ-NOTIFY-01). Depende del paso de renombre de esta sesion. Validation: grep de los 4 literales viejos y de validateModRoleNameCollisions da 0 fuera del paso de renombre; paridad cd/cm verde. Rollback: revertir el commit del barrido." }
- edit S2.T9 { validates=["REQ-CAPS-01","REQ-LINK-01"] }
- edit S4.T7 { validates=["REQ-VIS-01"] }

### Enmienda 3

**Task ops:**

- edit S2.T1 { validates=["REQ-CAPS-01","REQ-LINK-01","REQ-PRESERVE-02"] }
- edit S5.T1 { validates=["REQ-PRESERVE-02","REQ-VIS-01"] }

### Enmienda 4
**REQs:**

- REQ-LINK-01 (edit) `confirmed`: El vinculo rol->perfil se declara en config/app.json (profileRoleMapping) y lo materializa el sync (syncAppProfileMapping, dbSync.js:1481), 
- REQ-CAPS-01 (edit) `confirmed`: Absorber en los application profiles las capabilities nuevas de UPONE-1619 (instructionalcomponenttype:*) y UPONE-1633 (competencynode:adopt

**Task ops:**

- edit S4.T1 { desc="Declarar profileRoleMapping en config/app.json de ambos mods (4 curriculares -> su perfil; Admin/Consultor -> compuesto) y navByRole para el profile-gating; asegurar que el app.json NO declare el array `roles` institucional (gate XOR, dbSync.js:1424-1428, mutuamente excluyente con profileRoleMapping). El sync (syncAppProfileMapping) crea las filas up1_suite_app_role. Files: mods/curriculum-design/config/app.json, mods/curriculum-mapping/config/app.json. Validation: sync 2x idempotente; una fila de mapping por rol al perfil correcto; app.json sin array roles; el gate XOR pasa. Rollback: git checkout de ambos app.json y re-sync.", rollback="git checkout de mods/curriculum-design/config/app.json y mods/curriculum-mapping/config/app.json, luego re-sync.", validates=["REQ-LINK-01","REQ-VIS-01"] }
- edit S4.T2 { desc="Cut-over: retirar del seed _data-rbac.js de ambos mods las caps directas del core_Role que ya viven en los perfiles (incl. 1619/1633), para que la fuente de verdad sea el perfil. Orden: DESPUES de declarar el profileRoleMapping (S4.T1); la coexistencia transitoria es inocua por el dedupe por nombre. Files: seeds _data-rbac.js de cd y cm. Validation: el efectivo por rol tras el retiro == baseline de caps efectivas de S1 (salvo institution:view en cd), llegando por el perfil; grep de las caps de 1619/1633 en los seeds da 0. Rollback: restaurar las declaraciones directas y correr el seed (revertir en orden inverso: primero este cut-over, luego el mapping si hiciera falta).", rollback="Restaurar las declaraciones directas de capabilities en los seeds _data-rbac.js de cd y cm y correr el seed; revertir en orden inverso (primero el cut-over, luego el mapping si hiciera falta).", validates=["REQ-CAPS-01","REQ-CONVIV-01"] }
- edit S4.T4 { desc="Verificar que el cableado declarativo preserva el ownership humano y no altera el efectivo: (a) las filas con ownership humano sobreviven a dos syncs; (b) el efectivo por rol con los mappings == baseline de caps efectivas de S1 salvo institution:view en cd, por dedupe/herencia; (c) un perfil declarado sin profileRoleMapping no altera el efectivo (estado intermedio). Files: test de equivalencia (suite RBAC del mod) + volcado de comparacion contra el baseline. Validation: diff vacio post-cut-over vs baseline (salvo institucion) para los 4 roles; 120 asignaciones; sync 2x sin cambios. Rollback: borrar el test; si el diff no da vacio, restaurar las caps directas del seed.", rollback="Borrar el test de equivalencia y el volcado de comparacion; si el diff no da vacio, restaurar las caps directas en los seeds _data-rbac.js.", validates=["REQ-LINK-01","REQ-CONVIV-01","REQ-PRESERVE-03","REQ-PRESERVE-01"], isTest=true }

### Enmienda 5

**Task ops:**

- edit S4.T8 { desc="GATE de cierre de S4 (sesion de mayor riesgo: cut-over de caps del core_Role al perfil + privatizacion de visibilidad): profileRoleMapping declarado (4 curriculares -> su perfil; Admin/Consultor -> compuesto) y app.json SIN array roles (gate XOR satisfecho, dbSync.js:1424-1428); caps directas retiradas del seed (cut-over, en orden DESPUES del mapping; la coexistencia transitoria es inocua por dedupe); privatizacion por profile-gating con visibilidad verificada (incl. Admin); paridad cd/cm reconciliada; efectivo por rol == baseline de caps efectivas de S1 salvo institution:view en cd." }

### Enmienda 6

**Tasks agregadas:**

- S1: Poblar en el cuerpo del ticket el Coverage map (REQ -> test cases) y dejar preparada la tabla de Regresion (suite/comando/before/after/delta) para ambas suites rbacRoles.test.js (cd y cm), con el before capturado. Files: cuerpo del ticket (## Testing). Validation: cada REQ tiene su(s) test case(s) mapeado(s) y la tabla de regresion tiene las filas suite/comando con el before. Rollback: n/a (documental). (valida: REQ-TEST-01; rollback: n/a (documental))

**Task ops:**

- edit S2.T3 { desc="Declarar los 2 perfiles compuestos (union Diseñador ∪ Autoridad) en cd y cm para Admin/Consultor (extends la extension Autoridad + delta Diseñador, derivado del mapa vivo). DEPENDE de que la extension Autoridad ya este declarada (autoria de perfiles de S2, se ejecuta antes que esta task). Files: mods/curriculum-design/profiles/*.json, mods/curriculum-mapping/profiles/*.json. Validation: la union resuelta del compuesto == Diseñador ∪ Autoridad del modulo, sin faltantes ni sobrantes; los perfiles standalone no se alteran. Rollback: borrar los archivos del compuesto." }
- edit S4.T1 { desc="Declarar profileRoleMapping en config/app.json de ambos mods (4 curriculares -> su perfil; Admin/Consultor -> compuesto) y navByRole para el profile-gating. navByRole ES una clave declarable en config/app.json del mod (ej. mods/hello-world-mod/config/app.json; se persiste como columna up1_suite_app.navByRole, dbSync.js:717; el resolver la lee en app.resolver.js:127-141). Asegurar que el app.json NO declare el array roles institucional (gate XOR, dbSync.js:1424-1428, mutuamente excluyente con profileRoleMapping). El sync (syncAppProfileMapping, dbSync.js:1481) crea las filas up1_suite_app_role. Files: config/app.json de cd y cm. Validation: sync 2x idempotente; una fila de mapping por rol al perfil correcto; app.json sin array roles; gate XOR pasa. Rollback: git checkout de ambos app.json y re-sync." }
- edit S4.T3 { desc="Privatizar la visibilidad de ambas apps por profile-gating: declarar navByRole en config/app.json (clave del mod; columna up1_suite_app.navByRole; el resolver deriva isNavScoped en app.resolver.js:127-141). Verificar los dos sentidos: un rol con perfil mapeado ve la app; un rol sin perfil no la ve; borrar los mappings la oculta (no la vuelve publica). Files: config/app.json de ambos mods + test de nav. Validation: nav visible para un rol curricular y para Admin/Consultor; oculto para un rol sin perfil; sin-mappings oculto. Rollback: revertir navByRole en los app.json y re-sync. (La coordinacion con UPONE-1616 la cubre su task propia en S4.)" }

### Enmienda 7

**Tasks agregadas:**

- S2: Test de equivalencia estructural (antes del cut-over de S4): la union resuelta base ∪ extension de cada perfil (y del compuesto) == mapa de caps del core_Role en el baseline de S1, sin faltantes ni sobrantes; y cada capability de UPONE-1619/1633 aparece exactamente una vez en el arbol de perfiles del modulo que la usa. Detecta una cap no migrada ANTES del cut-over. Files: mods/curriculum-*/tests/unit/rbacProfiles.test.js. Validation: el test pasa; ninguna cap del baseline falta en el perfil resuelto; caps de 1619/1633 sin duplicar. Rollback: borrar el test. (valida: REQ-PROFILE-01, REQ-SET-01, REQ-CAPS-01, test; rollback: borrar el test)

**Task ops:**

- edit S2.T8 { desc="Ajustar los nombres de los application PROFILES a la convencion (roleNaming.js: isConventionalRoleName / isAppProfileCandidate) y verificar con un test unitario que cada nombre de perfil declarado pasa la convencion, sin residuos de referencias al detector eliminado validateModRoleNameCollisions. Los nombres de ROL se renombran en S3 (no aca). Files: mods/curriculum-design/profiles/*.json, mods/curriculum-mapping/profiles/*.json, test unitario de nombres. Validation: el sync no reporta no-conformidad; el test evalua cada nombre de perfil contra isConventionalRoleName/isAppProfileCandidate. Rollback: revertir los renombres de perfil.", isTest=true }
- edit S2.T10 { validates=["REQ-PROFILE-01","REQ-SET-01","REQ-ADD-01","REQ-CAPS-01","REQ-NOTIFY-01"] }
- edit S4.T8 { validates=["REQ-LINK-01","REQ-VIS-01","REQ-CONVIV-01","REQ-PRESERVE-01","REQ-CAPS-01"] }

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5

**Gate (auto)**: baseline de caps efectivas capturado, run verde de la suite RBAC registrado (before), matriz accion->capability construida y huecos (incl. institution:view) listados.

### Session 2 · T3 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5
- [ ] S2.T6
- [ ] S2.T7
- [ ] S2.T8
- [ ] S2.T9
- [ ] S2.T10

**Gate (auto)**: perfiles (base + extensiones + compuesto) materializados por el sync en cd y cm; institution:view en la base de cd; verificacion de aislamiento por app superada (precondicion dura de declarar institucion); caps de UPONE-1619/1633 absorbidas; nombres conformes a roleNaming.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: 4 roles renombrados a 'Learning Assurance <Rol>' (sin guion), 120 asignaciones conservadas, 0 roles con nombre viejo (barrido global limpio).

### Session 4 · T3 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T2
- [ ] S4.T3
- [ ] S4.T4
- [ ] S4.T5
- [ ] S4.T6
- [ ] S4.T7

**Gate (strong)**: profileRoleMapping declarado (4 curriculares -> su perfil; Admin/Consultor -> compuesto) y app.json SIN array roles (gate XOR satisfecho, dbSync.js:1424-1428); caps directas retiradas del seed (cut-over, en orden DESPUES del mapping; la coexistencia transitoria es inocua por dedupe); privatizacion por profile-gating con visibilidad verificada (incl. Admin); paridad cd/cm reconciliada; efectivo por rol == baseline de caps efectivas de S1 salvo institution:view en cd.

### Session 5 · T3 · open

**Tasks:**
- [ ] S5.T1
- [ ] S5.T2
- [ ] S5.T3
- [ ] S5.T4
- [ ] S5.T5

**Gate (auto)**: huerfano GestorCurricular + 2 fixtures retirados; sync 2x no los regenera.

### Session 6 · T3 · open

**Tasks:**
- [ ] S6.T1
- [ ] S6.T2
- [ ] S6.T3
- [ ] S6.T4
- [ ] S6.T5

**Gate (strong)**: matriz automatizada verde + smoke runtime con rol curricular activo (caso PO end-to-end + Consultor read-only) + regresion RBAC verde (before/after) + doc del escenario final + RULE capturada.
