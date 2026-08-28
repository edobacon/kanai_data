---
id: TICKET-133
project: up1
type: ticket
status: open
work_type: refactor
external: UPONE-1615
module: curriculum-design
autopilot: manual
---

# Curriculum Design &amp; Curriculum Mapping · Implementar lógica de Roles internos

## Request

Migrar la lógica de permisos de roles curriculares desde el cuelgue directo en el rol hacia sets por módulo, para que Curriculum Design y Curriculum Mapping definan alcances distintos sin conflicto, con nombres de rol estandarizados. Alcance completo: declarar 8 sets (2 base + 6 extensiones, 4 por módulo) con composición por módulo (no espejo); renombrar 4 roles a formato "Learning Assurance - <Rol>" reutilizando las entidades existentes (conservando las 120 asignaciones); completar la capability de lectura de institución en la base de Curriculum Design; retirar el rol huérfano GestorCurricular y 2 sets fixture; auditar capabilities por rol contra las acciones declaradas; verificación runtime de permisos efectivos rol por rol; cobertura que ejercite el camino real (vinculación, herencia, deduplicación, renombre sobre base con nombres viejos); avisar al core sobre el punto ciego de protección de nombres (no bloqueante); y crear los vínculos rol-set (diferido dentro del ticket a la espera de la definición del mapeo de roles core). No construye el mecanismo de sets (existe en core desde UPONE-1353/1354). Bloqueantes UPONE-1353/1354 Finalizados. Coordinar con UPONE-1619 (mismo seed/_data-rbac.js), UPONE-1616 y UPONE-1530.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | refactor |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

> Dos familias. **H1-H12: hechos de mecanismo verificables en codigo** (confirmadas read-only en esta pasada
> contra el codigo real en `/Users/edobacon/Workspace/uplanner/up1`). **HR1-HR3: hipotesis de runtime** que
> NO se pueden cerrar read-only: se marcan `inferred` con plan de validacion empirica en execute (smoke UPU).

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El mecanismo de sets (modelo, tabla de caps, vinculo por app, sync desde el mod, enriquecimiento runtime) ya existe integro en core; el ticket solo lo consume, no construye | ✓ confirmed | schema: `object-manager/objects/core/core_ModRoleCapability.json` (solo `modRoleId`+`capabilityId`). backend: `object-manager/src/services/auth/modRoleCapabilities.js:58-118` (enrich runtime). sync: `object-manager/scripts/sync/dbSync.js:1245` `syncModRolesForApp`. vinculo: `up1_suite_app_role.modRoleId`. Es re-scope: enunciado dice "implementar" pero es migracion mod-only |
| H2 | Un set solo concede, nunca niega; y "lo que el rol declara gana" (la inyeccion salta el permiso si el rol ya lo tiene, con cualquier valor) → un set no pisa un `prohibit` | ✓ confirmed | schema: `core_ModRoleCapability.json` NO tiene campo `defaultValue`/allow-prohibit-inherit (a diferencia de `core_RoleCapability`). backend: `modRoleCapabilities.js:21-22` `if (existing.has(capabilityName)) return`. Migracion segura en esa direccion; mover un permiso al set NO lo quita del rol |
| H3 | La inyeccion deduplica por nombre → declarar los transversales (`core_datalog:view`, `core_user.name:view`) en las dos bases no tiene costo | ✓ confirmed | backend (1 capa, logica pura de runtime justifica): `modRoleCapabilities.js:19-22` construye `Set` de nombres existentes y omite duplicados. `addCapabilityToAssignment` no reinserta |
| H4 | La herencia base+extension resuelve la union con guarda de ciclos y soporta cadenas multinivel | ✓ confirmed (codigo) / HR1 valida la union en runtime | backend: `modRoleCapabilities.js:32-56` `resolveModRoleCapabilityNames` recursivo por `extendsId`; guarda de ciclo `stack.includes(modRole.id)` (`:34-42`). schema: `core_ModRole` tiene `extendsId` |
| H5 | El vinculo es por app con aislamiento entre apps (un set de otra app no filtra al usuario) | ✓ confirmed | backend: `modRoleCapabilities.js:74-83` `findMany` filtra `app.isActive` + `modRoleId != null`; `:100-108` guarda defensiva `modRole.appId !== mapping.appId` descarta cross-app. db: unicidad `up1_suite_app_role` por app+rol |
| H6 | Los 4 roles se siembran por nombre (upsert by name) y cm es copia literal con test de paridad; renombrar solo el literal forkea (crea nuevos, deja 4 viejos con 120 asignaciones) | ✓ confirmed (codigo) / HR3 valida el forking en runtime | backend(seed): `mods/curriculum-design/seed/_data-rbac.js:36-57` `ROLE_DEFINITIONS`; `mods/curriculum-mapping/seed/_data-rbac.js:47-68` copia literal; docblock cm `:10-20` "ensureRoles upsertea por name" + "tests/unit/rbacRoles.test.js compara y falla si divergen" |
| H7 | Los 4 roles curriculares tienen CERO capability de institucion, y crear plan de estudio la requiere (el select de institucion lista instancias, gateado por `:view`) | ✓ confirmed | backend(seed): `grep -in institution mods/curriculum-design/seed/_data-rbac.js` → 0 refs. backend(resolver): `object-manager/src/graphql/resolvers/instance.resolver.js:1539` `listInstances = withObjectAuth('view', ...)`. schema(objeto): `Curriculum.json` / `AcademicProgram.json` declaran institucion FK requerida. Es el criterio 2 del PO |
| H8 | Toda capability nueva se asigna auto a `Admin`/`Consultor`/`Colaborador` con `allow` → `Consultor` engorda solo (166 caps, = Admin). Es mecanismo de core; NO se toca en este ticket | ✓ confirmed | backend: `object-manager/src/services/auth/generateCapabilities.js:332` `DEFAULT_ROLES = ['Admin','Consultor','Colaborador']`; `:346-350` upsert `defaultValue: 'allow'`. Justifica O1: la correccion de `Consultor` se difiere (tocar core) |
| H9 | Una app sin roles asignados es publica; crear el primer vinculo cierra su visibilidad | ✓ confirmed | backend: `suite/logic/app.resolver.js:120-123` `if (!assignedRoles || length===0) return true` (publica). Justifica diferir los vinculos y coordinar con UPONE-1616 |
| H10 | Con rol activo seleccionado los permisos NO se acumulan con otros roles del usuario: la cap debe llegar por el rol con el que se opera | ✓ confirmed | backend: `object-manager/src/services/auth/authChecker.js:116-118` `if (selectedRole) roleAssignments = filter(ra.role.name === selectedRole)`. Es el gotcha que hizo que el hueco de institucion pasara al smoke |
| H11 | El rol huerfano `GestorCurricular` + los 2 fixtures (`GestorCurricular`, `LectorCurricular`) estan en desuso; su origen es del mod (auto-create desde layout, causa ya corregida en `e47f793`) | ✓ confirmed (origen/fixtures) / HR handled por retiro+sync 2x en execute | data: `mods/curriculum-design/roles/LectorCurricular.json` y `GestorCurricular.json` se autodescriben "fixture RBAC-01 / UPONE-1353". backend: `dbSync.js:846-855` auto-create "Auto-created role from layout configuration". cm NO tiene directorio `roles/` |
| H12 | La proteccion de nombres del core (`validateModRoleNameCollisions`) solo lee `config.app.roles` → ciega a roles creados por seed o por layout. Aviso a core, no bloqueante | ✓ confirmed | backend(sync): `dbSync.js:1031-1040` arma `institutionalNames` solo desde `config.app?.roles`. `curriculum-design/config/app.json` no declara array `roles`; los 4 roles entran por seed. La convencion de nombres D3 lo esquiva |
| HR1 | La composicion de cada set replica el conjunto efectivo actual del rol (nadie pierde caps) — riesgo principal | inferred: volcado de caps efectivas por rol antes/despues + comparacion. Se valida en execute (S1 baseline, S5 runtime). No cerrable read-only | El codigo (H1-H5) garantiza el mecanismo; la equivalencia del *dato* solo se prueba corriendo el sync y comparando |
| HR2 | Agregar el permiso de institucion a la base de cd desbloquea la creacion de plan como Diseñador Curricular end-to-end | inferred: smoke UPU entrando como Diseñador, abrir creacion de plan, comprobar select poblado + guardado. Se valida en execute (S5). El gap (H7) esta confirmado; el desbloqueo es runtime | Cadena de H7 confirmada en codigo; el flujo real depende de runtime + provisioning por nodo |
| HR3 | El renombre sobre una base con los nombres viejos deja 4 roles (no 8) con asignaciones conservadas | inferred: correr el seed con paso de renombre sobre base que ya tenga los nombres viejos y contar roles+asignaciones. Se valida en execute (S4) | H6 confirma el forking sin paso explicito; que el paso de renombre lo evite se prueba corriendo el seed |

### Context found

**Re-scope (Aduana, veredicto `mal-encuadrado`):** el titulo dice "Implementar logica de Roles internos" pero el
mecanismo ya existe integro en core (entro con UPONE-1353 y UPONE-1354, ambas Finalizadas). Es un ticket de
**migracion mod-only**; lo unico que va hacia core es un **aviso** (H12), no un cambio.

**KB / analisis previo (detective-mode, verificado 1:1 contra codigo en esta pasada). Lista completa (prefijo `kb/`):**
- `kb/sp9/UPONE-1615-detalle.md` — contrato del ticket (linea de ejecucion Jira).
- `kb/sp9/UPONE-1615-pre-intake.md` — enfoque decidido, secuencia sugerida, gotchas, hipotesis H1-H9 de runtime.
- `kb/sp9/UPONE-1615-registro-de-decisiones.md` — 9 decisiones cerradas (D1-D9) + 1 abierta (O1) + O2 coordinacion.
- `kb/sp9/UPONE-1615-decisiones-de-roles-po.md` — material de decision para el PO (lenguaje de negocio): roles core vs mod, conflicto y resolucion.
- `kb/sp9/UPONE-1615-inventario-de-roles.md` — 21 roles del tenant UPU, desglose por dominio, causa raiz de `GestorCurricular`.
- `kb/sp9/UPONE-1615-aduana.md` — evidencia extendida de la frontera core/mod.
- `kb/sp9/UPONE-1615-explicativo.html` — explicativo del ticket (artefacto).
- `kb/sp9/UPONE-1615-roles-core-y-la.html` — roles core y Learning Assurance (artefacto de apoyo a la decision).
- `kb/sp8/UPONE-1538-rbac-institution-view-gap.md` — diagnostico previo del hueco de institucion.

**Spec de design (refactor):** `specs/curriculum-design/SPEC-curriculum-design-refactor-internal-roles-to-sets.md`.

**Codigo real verificado (todas las refs archivo:linea de la tabla Triage confirmadas en `uplanner/up1`):**
- `object-manager/src/services/auth/modRoleCapabilities.js` — enrich runtime, dedup, cycle guard, app-scope.
- `object-manager/objects/core/core_ModRoleCapability.json` — sin campo de valor (solo concede).
- `object-manager/scripts/sync/dbSync.js` — auto-create desde layout (`:846-855`), guard con punto ciego (`:1031-1040`), `syncModRolesForApp` (`:1245`).
- `object-manager/src/services/auth/{authChecker.js,generateCapabilities.js}` — rol activo no acumula; auto-asignacion a defaults.
- `object-manager/src/graphql/resolvers/instance.resolver.js:1539` — `listInstances` gateado por `:view`.
- `suite/logic/app.resolver.js:120-123` — app sin roles es publica.
- `mods/curriculum-design/seed/_data-rbac.js`, `mods/curriculum-mapping/seed/_data-rbac.js`, `mods/curriculum-design/roles/*.json`.

**Decisiones abiertas / gaps activos (ver Active questions en teach-intake):**
- **O1 (RESUELTO PARCIAL — 2026-08-26):** el mapeo de los roles del core hacia los sets curriculares. El PO
  entrego una regla parcial (catalogo institucional, **2 de 10 filas**): `Admin` y `Consultor` -> perfil
  **"Diseñador + Autoridad Curricular"**. Decisiones derivadas:
  - **Se cablean 6 roles este sprint:** Admin, Consultor + los 4 curriculares (uno-a-uno, ya decidido). La
    creacion de estas filas **privatiza la visibilidad** (H9) al conjunto correcto: los 15 roles restantes no
    tienen alcance curricular legitimo (verificado contra `kb/sp9/UPONE-1615-inventario-de-roles.md`), asi que
    perder la vista publica es la limpieza buscada, no regresion.
  - **Alcance de sets: 8 -> 10.** Se agregan 2 sets compuestos (CD y CM) para el perfil "Diseñador +
    Autoridad", porque el vinculo admite **un solo set por modulo** (unicidad `(appId, roleId)` en
    `suite/objects/up1_suite_app_role.json`) y la herencia es de **un solo padre** (`extendsId` escalar en
    `object-manager/src/services/auth/modRoleCapabilities.js:47`). No se pueden atar dos sets hermanos a un
    rol. Modelado: el compuesto **extiende Autoridad** + declara el **delta de Diseñador** (crear/editar/
    versionar/clonar). Se descarta la cadena `Autoridad extends Diseñador` porque romperia la separacion de
    funciones (Autoridad ganaria crear/editar, que hoy no tiene — Anexo A del doc de decisiones-PO).
  - **Admin/Consultor: cableado del mod correcto, techo real por core.** El set compuesto concede ~70-90 caps
    (union Diseñador+Autoridad), pero su efectivo sigue siendo "todo" porque el core les **refill** los ~166
    directos via `DEFAULT_ROLES` (ver Learn del blocker de core). No se retiran sus directos: seria inutil
    (el core los repone) y ademas es tocar core. El cableado `core_Role -> up1_suite_app_role -> core_ModRole
    (set) -> caps` queda **correcto y completo**; cuando el core ajuste sus defaults, Admin/Consultor caen
    automaticamente a lo que el set concede, sin retrabajo del mod.
  - **Mapeo de los 8 roles restantes** (4 nuevos del catalogo + resto de core) -> **siguiente sprint**, con
    las 10 filas del catalogo completo.
- **O2 (coordinacion, no bloqueo):** el permiso `offering:create/modify` del Diseñador sobre un objeto
  compartido con engagement. Se acota aqui o se registra de nuevo; requiere acuerdo con ese equipo.
- **Coordinacion SP9:** UPONE-1619 (mismo `seed/_data-rbac.js`), UPONE-1616 (evidencia de menu tras vinculos),
  UPONE-1530 (frontera del MCP), UPONE-1633 (objetos nuevos engordan `Consultor`).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | BLOCKER DE CORE A REPORTAR (por que Admin y Consultor siguen con todos los permisos aunque se les cablee un set acotado). El core re-otorga automaticamente TODA capability nueva a los roles default como permiso DIRECTO: `assignNewCapabilitiesToDefaultRoles` en `object-manager/src/services/auth/generateCapabilities.js:331-357` define `DEFAULT_ROLES = ['Admin','Consultor','Colaborador']` y hace upsert de `core_RoleCapability` con `defaultValue:'allow'` por cada capability generada. Replica la misma logica de `dbSync.js`. Consecuencia: (1) mapear Admin/Consultor a un set compuesto (Diseñador+Autoridad, ~70-90 caps) NO reduce su efectivo — su techo real siguen siendo los ~166 directos que el core repone; (2) retirar esos directos es INUTIL desde el mod: la siguiente generacion de capabilities los vuelve a crear, todos; (3) el estado deseado 'roles default sin directos, permisos solo via core_Role -> up1_suite_app_role -> core_ModRole (set) -> caps' NO es alcanzable en alcance mod. Para lograrlo hay que sacar a Admin/Consultor de `DEFAULT_ROLES` en core, que es cross-cutting (todos los mods y tenants). El cableado del mod queda correcto y future-proof: el dia que core ajuste los defaults, Admin/Consultor caen automatico a lo que el set concede, sin retrabajo. ACCION: reportar como ticket de plataforma / coordinar con UPONE-1633 (objetos nuevos engordan Consultor por este mismo mecanismo). Es la causa raiz de que el rol 'Consultor' tenga los mismos 166 caps que Admin. | dev | — | raw | — |
| L2 | FRONTERA CODIGO-vs-OPS DEL VINCULO ROL->SET (impacta el rearmado del spec). Crear el vinculo con set (`up1_suite_app_role.modRoleId` != null) NO tiene path de seed ni de sync: `syncAppRoles` (dbSync.js:1433-1494) crea la fila SOLO con appId+roleId (modRoleId queda null); el sync nunca asigna un set. La asignacion del set (modRoleId) es una operacion MANUAL del administrador via la UI de up1-manager (layouts `app-role-mapping-edit.json`/`app-role-mapping-create.json`/`role-profile-assign.json`/`role-create.json` con `modRoleId: {{selectedId}}`; README up1-manager:159 'Assigning it to an institutional role means setting up1_suite_app_role.modRoleId'). Consecuencia para TICKET-133: el trabajo se parte en dos. (1) EN ALCANCE MOD (codigo, execute_scope): declarar los sets (roles/*.json, incl. los 2 compuestos) + privatizar la visibilidad declarando el array `roles:[los 6]` en `curriculum-design/config/app.json` y `curriculum-mapping/config/app.json` (syncAppRoles crea las 6 filas con modRoleId null -> app deja de ser publica). (2) FUERA DE ALCANCE MOD (ops de tenant, NO es un PR): asignar el modRoleId de cada fila (Admin->compuesto, LA-Diseñador->cd-Diseñador, etc.) via UI de up1-manager. El ticket entrega un RUNBOOK para esa asignacion, no la ejecuta como codigo. GOTCHA: syncAppRoles borra filas stale (roleId notIn el array `roles`) -> si el array no incluye un rol al que un admin ya le asigno modRoleId, el sync BORRA esa fila y pierde la asignacion manual. El array `roles` del app.json debe incluir SIEMPRE los 6 roles. appRoles.resolver.test confirma que el resolver preserva modRoleId de filas existentes. | dev | — | raw | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

7 sessions previstas (S6/S7 = split de la capa de vinculos por DET-20; alcance post-O1 parcial). **Esqueleto producido por `intake-explore`, refinado por design-refactor.** El detalle final (tasks asignadas, gate
criteria especificos) lo completa `design-refactor` al generar el spec. Cada session puede subdividirse o
colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Linea base + auditoria: volcado de caps efectivas por rol (antes de tocar nada) y auditoria rol por rol vs acciones declaradas; anotar huecos | 1 | T2 | placeholder — design-refactor lo refina | auto | Baseline de HR1 capturada; huecos por rol listados |
| S2 | Criterio 2 (PO): declarar el permiso de institucion en la base de cd + los transversales en las dos bases; declarar las 2 bases (Consultor) y verificar que se materializan por sync | 2 | T2 | placeholder | auto | Bases materializadas; institucion presente en base cd |
| S3 | Declarar las 6 extensiones (Revisor/Diseñador/Autoridad × 2 mods) con composicion por modulo (cd 19/41/42, cm 6/12/12); verificar que la herencia resuelve la union sin duplicar; actualizar el test de paridad a proposito | 3 | T2 | placeholder | auto | Herencia resuelve union (H4); test de paridad verde o actualizado con intencion |
| S4 | Renombre de los 4 roles a `Learning Assurance - <Rol>` con paso explicito idempotente en el seed; verificar **sobre base con nombres viejos** (4 roles no 8, asignaciones conservadas); barrer 2 seeds + 2 tests + 5 docs | 4 | T3 | placeholder | ⚑ fuerte | HR3: 4 roles, 120 asignaciones intactas, ninguno con nombre viejo |
| S5 | Retiro del huerfano + 2 fixtures (retiro guardado del core_Role con captura previa) y sync 2× confirma no-regeneracion; aviso a core del punto ciego H12 | 5 | T3 | placeholder | ⚑ fuerte | Huerfano/fixtures no reaparecen; aviso a core enviado |
| S6 | Cablear vinculos parciales (codigo+tests, sin tenant vivo): declarar 2 sets compuestos (Admin/Consultor) + privatizar la visibilidad via app.json + test de equivalencia y no-colision | 6 | T3 | placeholder | ⚑ fuerte | Sets compuestos declarados; tests verdes; privatizacion declarada (filas modRoleId null) |
| S7 | Ops + verificacion + doc: producir y aplicar el runbook (modRoleId en up1-manager), verificacion runtime con vinculos (efectivo == baseline S1), doc del escenario final, captura de RULE | 7 | T3 | placeholder | ⚑ fuerte | HR1/HR2 verificados con evidencia runtime; runbook aplicado (12 filas); doc y RULE capturadas |

**Notas del esqueleto:**
- **Numeracion continua** (DET-20): el ticket no tiene Sessions previas registradas; el plan arranca en S1.
- **S3 depende de S2** (las extensiones heredan de las bases). **S4 depende de S3** (renombre sobre el estado
  ya migrado, o se decide orden inverso en design). **S5 depende de todo** (verificacion final).
- **Vinculos (actualizado 2026-08-26, O1 resuelto parcial):** este sprint SI se crean los vinculos de **6
  roles** (Admin, Consultor + 4 curriculares) y se privatiza la visibilidad (H9) — **avisar a UPONE-1616
  antes**. Admin/Consultor apuntan al set **compuesto Diseñador + Autoridad** (10 sets en total, no 8). Los
  directos NO se retiran (convivencia; para defaults es ademas inutil por el refill de core). El mapeo de los
  **8 roles restantes** del catalogo queda para el siguiente sprint.
- **Blocker de core a reportar:** Admin y Consultor conservan acceso total por `DEFAULT_ROLES`
  (`generateCapabilities.js:331-357` re-otorga toda capability nueva como directa). El estado "defaults sin
  directos / solo por set" NO es alcanzable desde el mod: exige sacarlos de `DEFAULT_ROLES` en core (afecta
  todos los mods/tenants). Coordinar con **UPONE-1633**. Ver Learn.
- **Riesgo runtime:** el camino de sets no esta ejercitado por ningun modulo (0 vinculos con set en el tenant);
  seriamos los primeros. HR1-HR3 no son cerrables read-only.
- **Coordinacion bloqueante de archivo:** UPONE-1619 toca el mismo `mods/curriculum-design/seed/_data-rbac.js`.
  Secuenciar o rebasar; ejecutarlos en paralelo sobre ese archivo se pisan.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|

## Summary
