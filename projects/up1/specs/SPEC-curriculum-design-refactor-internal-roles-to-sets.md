---
id: SPEC-curriculum-design-refactor-internal-roles-to-sets
project: up1
ticket: TICKET-133
status: draft
---

# Migracion de roles internos curriculares a sets por modulo + cableado parcial de vinculos (6 roles)

# Migracion de roles internos curriculares a sets por modulo + cableado parcial de vinculos (6 roles)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle vive en Requirements, Refactor map y Tasks. Si con esto te basta para decidir, ese es el objetivo.*

**Que se quiere**: hoy los permisos de los 4 roles curriculares (Consultor / Diseñador / Revisor / Autoridad) cuelgan directo del rol via `core_RoleCapability` en el seed de cada mod. Este ticket declara esos permisos como **sets por modulo** (el mecanismo `core_ModRole` que ya existe en core desde UPONE-1353/1354), renombra los 4 roles al prefijo `Learning Assurance - <Rol>`, retira lo que quedo en desuso (un rol huerfano + 2 fixtures), y completa la unica capability que falta para el caso del PO (leer institucion al crear un plan de estudio). El valor no esta en construir nada — el mecanismo esta hecho — sino en **migrar sin que ningun rol pierda un solo permiso efectivo**.

**Aclaracion de encuadre (Aduana `mal-encuadrado`)**: el titulo Jira dice "Implementar logica de Roles internos", pero el mecanismo ya esta integro en core. Es una **migracion mod-only**; lo unico que va hacia core es un **aviso** (no un cambio). Evidencia: `kb/sp9/UPONE-1615-aduana.md`.

**La sutileza que gobierna todo el diseño (ACTUALIZADA 2026-08-26)**: los sets **no inyectan nada en runtime hasta que existe un vinculo** rol→set (`up1_suite_app_role.modRoleId`). Con la resolucion parcial de O1 (regla del PO: `Admin`/`Consultor` -> perfil "Diseñador + Autoridad"), **este sprint SI se crean los vinculos de 6 roles** (Admin, Consultor + los 4 curriculares). Consecuencias que gobiernan el diseño:

1. **La creacion de vinculos privatiza la visibilidad (H9)**: al declarar `roles:[los 6]` en el `app.json` de cada mod, el sync crea las filas y las apps dejan de ser publicas. **Esto SI es un cambio de comportamiento observable** (los 15 roles restantes pierden la vista publica), por eso el ticket ya **NO es zero-behavior-change**: los deltas intencionales pasan a ser TRES — institucion (REQ-ADD-01), nombres de rol (REQ-PRESERVE-02) y **privatizacion de visibilidad** (REQ-VIS-01).
2. **Frontera codigo vs ops (Learn L2)**: declarar los sets y el array `roles` del app.json es **codigo del mod**. Pero **asignar el set a cada rol (`modRoleId`) NO tiene path de seed/sync**: es una operacion **manual del administrador via la UI de up1-manager**. El ticket entrega un **RUNBOOK** para esa asignacion (REQ-LINK-01); no la ejecuta como PR. `syncAppRoles` crea la fila con `modRoleId` null.
3. **Convivencia mapa + set**: el mapa rol→capability **NO se retira** (sigue siendo fuente runtime). Cuando el admin asigna el `modRoleId`, el set **tambien** inyecta; el efectivo es `union(mapa, set)` deduplicada. Como el set replica el mapa (curriculares) o es subconjunto de los directos (Admin/Consultor), el efectivo **no cambia** (REQ-CONVIV-01). El retiro del mapa (cut-over) sigue diferido.
4. **Admin/Consultor y el core**: su set concede ~70-90 caps, pero su techo real sigue siendo "todo" porque el core les **refill** los ~166 directos via `DEFAULT_ROLES` (Learn L1). El cableado del mod queda correcto y future-proof; el estado "solo por set" es un cambio de core, fuera de alcance.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Los sets se declaran **inertes** (sin vinculos) y el mapa rol→cap **NO se retira**: sigue siendo la fuente runtime hasta que se creen los vinculos (diferido) | Si se retirara el mapa ahora sin vinculos, los 4 roles perderian TODOS sus permisos en runtime — regresion catastrofica. Es el nucleo del zero-behavior-change |
| 2 | La capability `institution:view` se agrega al **mapa del rol** (`READ_CAPS` de cd), no solo al set | Es la unica via para que el criterio 2 del PO sea verificable runtime EN ESTE TICKET (el set no inyecta sin vinculo). Es la unica adicion intencional al comportamiento |
| 3 | La composicion de cada set se **deriva** del mapa vivo, no se transcribe a mano, y se valida con un test de equivalencia `base ∪ extension == mapa del rol` | Son ~100 permisos con casing y caps de campo (`<obj>.<campo>:modify`, `<obj>:<rt>.<campo>:modify`); transcribir mal = regresion silenciosa cuando se creen los vinculos |
| 4 | El renombre usa un **paso idempotente por nombre viejo** en LOS DOS seeds, antes de `ensureRoles` | Los seeds crean roles por nombre; cambiar solo el literal forka (crea 4 nuevos, deja 4 viejos con 120 asignaciones). El orden entre seeds no esta garantizado |
| 5 | Se agregan **2 sets compuestos** (Diseñador + Autoridad) para Admin/Consultor, modelados **`extends` Autoridad + delta Diseñador** | El vinculo admite un solo set por modulo (unicidad `(appId,roleId)`) y la herencia es de un solo padre (`extendsId`). La union de dos sets hermanos exige un set compuesto. La cadena `Autoridad extends Diseñador` se descarta: romperia la separacion de funciones |
| 6 | La **privatizacion** se declara via `roles:[los 6]` en el `app.json` de cada mod (codigo); la **asignacion del set** (`modRoleId`) es un **RUNBOOK** de ops manual en up1-manager | No hay path de seed/sync para asignar el set (Learn L2). El array `roles` debe incluir SIEMPRE los 6, o `syncAppRoles` borra filas stale y pierde la asignacion manual del admin |
| 7 | El mapa rol→cap **NO se retira** aun con vinculos creados (convivencia); Admin/Consultor **conservan sus directos** | Retirar directos es el cut-over (diferido). Para Admin/Consultor ademas es inutil: el core los refill via `DEFAULT_ROLES` (Learn L1); anularlo es cambio de core |

**Riesgos principales y como los mitigamos**:

- **El renombre forka y deja 4 roles viejos con 120 asignaciones** → paso de renombre idempotente por nombre viejo en ambos seeds + verificacion HR3 sobre una base que YA tiene los nombres viejos (no solo base limpia): 4 roles, no 8.
- **La transcripcion de ~100 caps a los sets pierde/agrega un permiso** → derivar del mapa vivo + test de equivalencia estructural `base∪ext == mapa` (count-agnostic) + baseline runtime antes/despues (HR1).
- **Coordinacion de archivo con UPONE-1619 (TICKET-134)**: ambos tocan `mods/curriculum-design/seed/_data-rbac.js` → secuenciar o rebasar; ejecutarlos en paralelo sobre ese archivo se pisan.
- **Declarar un set con efecto runtime inesperado** → verificar que sin vinculo (`app_role.modRoleId = null`) la inyeccion no ocurre (`modRoleCapabilities.js:74-83`).
- **Con vinculos creados, un set que conceda DE MAS es fuga inmediata** (ya no es inocuo como cuando era inerte) → el test de equivalencia estructural (S3.T3) ahora guarda un camino runtime **vivo**, no diferido; debe verificar 0 sobrantes ademas de 0 faltantes.
- **La privatizacion deja fuera a un rol que hoy entra de verdad** → verificar (S6) que ninguno de los 15 roles no-mapeados tiene alcance curricular legitimo (respaldado por `kb/sp9/UPONE-1615-inventario-de-roles.md`) y **coordinar con UPONE-1616 ANTES** de declarar el array `roles`.
- **`syncAppRoles` borra filas stale** → el array `roles` del app.json debe incluir los 6 roles; si un admin asigno `modRoleId` a un rol ausente del array, el sync borra su fila.

**Que NO se hace en este ticket** (limites explicitos, ACTUALIZADO 2026-08-26):

- **Asignar el `modRoleId` como codigo**: la asignacion del set a cada rol es ops manual en up1-manager (Learn L2). El ticket entrega el **runbook** (REQ-LINK-01), no un PR que asigne modRoleId.
- **El mapeo de los 8 roles restantes** del catalogo institucional (4 nuevos + resto de core): O1 solo se resolvio para Admin/Consultor. El resto -> siguiente sprint con las 10 filas.
- **Retirar el mapa rol→cap** (cut-over a inyeccion por set) y **retirar los directos de Admin/Consultor**: diferido. Para defaults es ademas inutil (refill de core).
- **Sacar a Admin/Consultor de `DEFAULT_ROLES`** (para que su techo sea el set): cambio de core, cross-cutting. Ticket aparte / coordinar UPONE-1633 (Learn L1).
- **Acotar el permiso `offering:create/modify` del Diseñador** (O2): requiere acuerdo con engagement. Open question, no task.
- **Tocar core**: solo un aviso por el punto ciego de la proteccion de nombres (H12).

**Tamano estimado**: **6 sessions** ejecutables. **SP: sube de 8** (la capa de vinculos/compuestos/privatizacion no estaba dimensionada; re-estimar). Las mas riesgosas son S4 (renombre — riesgo de fork), S5 (retiro destructivo) y **S6 (privatizacion observable + vinculos runtime vivos + coordinacion UPONE-1616)**.

**Como vas a saber que funciona**:
- Vuelco de capabilities efectivas por rol **antes y despues** es identico salvo `institution:view` en los 4 roles de cd (convivencia: el set no cambia el efectivo).
- Entrando como Diseñador Curricular en UPU, el select de institucion se puebla y se guarda un plan de estudio de punta a punta.
- Tras el renombre siguen siendo **4 roles** con sus 120 asignaciones, ninguno con nombre viejo.
- El rol huerfano y los 2 fixtures no existen, y una segunda corrida del sync no los regenera.
- Tras declarar el array `roles`, las apps curriculares se ven **solo** por los 6 roles; los 15 restantes ya no las ven (y ninguno los necesitaba — verificado contra el inventario).
- Aplicando el runbook en up1-manager, Admin/Consultor y los 4 curriculares quedan con su set asignado (`modRoleId`), y su permiso efectivo **sigue siendo el mismo** (convivencia + refill de core para Admin/Consultor).

---

## Purpose

Migrar la declaracion de permisos de los 4 roles curriculares del acoplamiento directo rol→capability (seed `core_RoleCapability`) hacia el modelo de **sets por modulo** (`core_ModRole` + `core_ModRoleCapability`, mecanismo de core ya existente), en los mods `curriculum-design` y `curriculum-mapping`. La migracion preserva los permisos efectivos por rol en runtime (convivencia: el mapa rol→cap no se retira; los sets, con o sin vinculo, no cambian el efectivo por dedup), agrega la capability faltante para el caso del PO (`institution:view`), renombra los roles al prefijo de familia reutilizando las entidades, retira lo que quedo en desuso, y **cablea parcialmente la capa de vinculos** con la resolucion parcial de O1: declara 2 sets compuestos (Diseñador + Autoridad) para Admin/Consultor, **privatiza la visibilidad** de las dos apps a 6 roles (via `app.json`), y entrega el runbook de asignacion de `modRoleId` (ops manual up1-manager). El comportamiento observable cambia en **tres** deltas intencionales y confirmados: `institution:view` (criterio 2), el nombre visible de los 4 roles, y **la privatizacion de la visibilidad** de las dos apps.

## Requirements

### REQ-PRESERVE-01: Los permisos efectivos por rol en runtime no cambian

> **Que cambia**: nada visible para un usuario que ya opera con un rol curricular — sigue teniendo exactamente los mismos permisos despues de la migracion. Lo unico que cambia es DONDE estan declarados (se agregan archivos de set, sin retirar el mapa del rol).
> **Por que**: es la regla cardinal del refactor. Un rol que pierde un permiso al migrar es una regresion; la red es la comparacion antes/despues del conjunto efectivo, no la convivencia.

El sistema MUST preservar, para cada uno de los 4 roles, el conjunto de capabilities efectivas en runtime identico al estado previo, con la unica excepcion de `institution:view` (REQ-ADD-01). El mapa `MOD_CAPABILITIES_BY_ROLE` (`core_RoleCapability`) MUST permanecer como fuente de verdad runtime y NO retirarse en este ticket (cut-over diferido). Esto vale en los dos estados por los que pasa el ticket: **sin vinculo** (S2-S5, el set no inyecta, `modRoleCapabilities.js:74-83` filtra `modRoleId != null`) y **con vinculo** (S6, el set inyecta pero su union con el mapa deduplica al mismo conjunto — REQ-CONVIV-01).

**Actor**: system / usuario con rol curricular activo
**Layers**: backend, database, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad antes/despues por rol
- **GIVEN** el vuelco de capabilities efectivas por rol capturado en S1 (baseline, antes de tocar nada)
- **WHEN** se completa la migracion (sets declarados, renombre, retiro, institucion agregada)
- **THEN** el vuelco posterior por rol es identico al baseline, salvo `institution:view` presente en los 4 roles de cd

#### Scenario: un set sin vinculo no inyecta
- **GIVEN** los sets declarados y materializados por el sync, sin ninguna fila `up1_suite_app_role` con `modRoleId`
- **WHEN** un usuario opera con un rol curricular activo
- **THEN** sus capabilities provienen solo del mapa del rol; el set no agrega ni una

</details>

#### Acceptance
**El usuario puede verificar que funciona**: entra con cada rol en UPU y ejecuta sus acciones; las que podia antes las puede despues, las que no podia siguen negadas.

### REQ-PRESERVE-02: El renombre conserva las 120 asignaciones (4 roles, no 8)

> **Que cambia**: los 4 roles pasan a llamarse `Learning Assurance - <Rol>` pero son las MISMAS entidades — las 120 personas asignadas siguen asignadas.
> **Por que**: los seeds crean roles por nombre; sin un paso de renombre explicito se crean 4 roles nuevos y quedan los 4 viejos con sus asignaciones (fork). El orden entre seeds de mods no esta garantizado.

El sistema MUST renombrar los 4 roles reutilizando las entidades `core_Role` existentes, mediante un paso idempotente por **nombre viejo** presente en LOS DOS seeds (`curriculum-design` y `curriculum-mapping`) que corra ANTES de `ensureRoles`. Tras el renombre MUST haber exactamente 4 roles curriculares, con sus 120 `core_RoleAssignment` intactas y ninguno con el nombre anterior.

**Actor**: admin (seed)
**Layers**: backend (seed), database

<details><summary>Scenarios de validacion</summary>

#### Scenario: renombre sobre base con nombres viejos (HR3, el critico)
- **GIVEN** un tenant cuyo `core_Role` ya tiene los 4 nombres VIEJOS con 30 asignaciones cada uno
- **WHEN** corre el seed con el paso de renombre
- **THEN** quedan 4 roles con los nombres NUEVOS, 120 asignaciones conservadas, 0 roles con nombre viejo

#### Scenario: idempotencia y orden entre mods
- **GIVEN** los dos seeds con el paso de renombre, corriendo en cualquier orden, y una segunda corrida
- **WHEN** terminan
- **THEN** el resultado es el mismo (4 roles, nombres nuevos) sin forkear ni duplicar

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en la administracion de roles de UPU aparecen 4 roles `Learning Assurance - ...` con sus asignados; no hay roles con los nombres viejos.

### REQ-PRESERVE-03: Los sets declarados no tienen efecto runtime mientras no existan vinculos (estado S2-S5)

> **Que cambia**: aparecen `core_ModRole`/`core_ModRoleCapability` materializados por el sync, pero no alteran lo que ve ningun usuario mientras no haya vinculo.
> **Por que**: el switch de la inyeccion es el vinculo; declarar el set sin vinculo es dato inerte. Esto permite declarar y verificar los sets (S2-S5) antes de crear los vinculos (S6).

El sistema MUST materializar los sets via sync sin que ello cambie los permisos efectivos de ningun usuario, mientras no exista ninguna fila `up1_suite_app_role` con `modRoleId` apuntando a esos sets. Esta invariante aplica al estado de S2-S5 (los vinculos se crean en S6).

**Actor**: system
**Layers**: backend, database

#### Acceptance
**El usuario puede verificar que funciona**: tras declarar los sets y correr el sync (S2-S5, sin `modRoleId` asignado), el vuelco de permisos efectivos por rol es identico al de antes de declararlos.

### REQ-CONVIV-01: Con los vinculos creados (S6), el efectivo sigue sin cambiar (convivencia mapa + set)

> **Que cambia**: en S6 se asignan los `modRoleId` (via runbook), asi que los sets pasan a inyectar. El permiso efectivo de cada rol NO cambia igual, porque el mapa del rol sigue vivo y la inyeccion deduplica.
> **Por que**: el mapa no se retira (cut-over diferido). El efectivo es `union(mapa, set)`; para los 4 curriculares el set replica el mapa, y para Admin/Consultor el set es subconjunto de sus directos. La union deduplicada es igual al conjunto previo.

El sistema MUST garantizar que, tras asignar `modRoleId` a las 6 filas, el conjunto de capabilities efectivas de cada uno de los 6 roles sea identico al estado previo al vinculo (salvo `institution:view` ya contemplado). En particular: para los 4 curriculares `union(mapa_rol, set) == mapa_rol` (el set replica el mapa, REQ-SET-01); para Admin/Consultor el set (`Diseñador + Autoridad`) es subconjunto de sus `core_RoleCapability` directos, que ademas el core repone via `DEFAULT_ROLES` (Learn L1). Un set que conceda una capability **fuera** del conjunto previo del rol es una fuga y MUST ser detectado por el test de equivalencia (0 sobrantes, REQ-SET-01).

**Actor**: usuario con rol activo (los 6 mapeados)
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: vinculo curricular no cambia el efectivo (dedup)
- **GIVEN** `Learning Assurance - Diseñador` con su mapa vivo y su set `Curriculum Design - Diseñador` asignado via `modRoleId`
- **WHEN** el runtime resuelve sus capabilities (`enrichUserWithModRoleCapabilities`)
- **THEN** el conjunto efectivo es identico al que tenia por el mapa; la inyeccion del set no agrega ni una (dedup por nombre)

#### Scenario: Admin/Consultor no cambian (set subconjunto + refill de core)
- **GIVEN** Admin con el set compuesto asignado y sus ~166 directos (repuestos por `DEFAULT_ROLES`)
- **WHEN** resuelve capabilities
- **THEN** su efectivo sigue siendo el total; el set compuesto (~70-90) no agrega nada nuevo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras aplicar el runbook en UPU, el vuelco de permisos efectivos por rol es identico al baseline S1 (salvo institucion), con los `modRoleId` ya asignados.

### REQ-PRESERVE-04: La suite de RBAC existente pasa; solo se toca con intencion documentada

> **Que cambia**: los tests `rbacRoles.test.js` de los dos mods siguen verdes; se ajustan unicamente donde la composicion por modulo o el cap de institucion lo obligan, con el nuevo invariante documentado.
> **Por que**: un test que falla al refactorizar significa que el refactor rompio algo — no que el test este mal. El test de paridad guarda un invariante que la migracion cambia a proposito (composicion por modulo divergira).

El sistema MUST mantener verde `mods/curriculum-design/tests/unit/rbacRoles.test.js` y `mods/curriculum-mapping/tests/unit/rbacRoles.test.js`. Cualquier cambio a esos tests MUST ser intencional (institucion agregada, paridad reformulada por composicion-por-modulo) y documentar el nuevo invariante; NO se relaja un assert para "que pase".

**Actor**: system (CI)
**Layers**: backend (tests)

### REQ-ADD-01: Los roles de cd pueden leer institucion (criterio 2 del PO)

> **Que cambia**: un Diseñador Curricular puede elegir la institucion dueña al crear un plan de estudio; hoy el select sale vacio y el guardado se bloquea.
> **Por que**: crear plan/programa exige la institucion como FK requerida (`Curriculum.json:103`, `AcademicProgram.json`), el select la pide, poblarlo lista instancias y ese listado esta gateado por `institution:view` (`instance.resolver.js:1539`), cap que los roles curriculares no tienen.

El sistema MUST otorgar `institution:view` a los 4 roles curriculares de `curriculum-design`, agregandola al conjunto de lectura compartido (`READ_CAPS`) del mapa del rol para que sea efectiva runtime SIN depender de un vinculo, y declarandola tambien en el set base de cd (fuente de verdad futura). Es la **unica** adicion intencional de comportamiento de este ticket.

**Actor**: usuario con rol curricular activo (empezando por Diseñador)
**Layers**: backend (seed), config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: caso del PO end-to-end (HR2)
- **GIVEN** un usuario operando como `Learning Assurance - Diseñador Curricular` en UPU
- **WHEN** abre la creacion de un plan de estudio
- **THEN** el select de institucion se puebla y el plan se guarda de punta a punta

#### Scenario: nombre exacto de la capability
- **GIVEN** el objeto base `Institution` (`object-manager/objects/business/Base/institution.json`) cuya cap `institution:view` se auto-genera (`generateCapabilities.js:117-119`)
- **WHEN** el seed referencia la cap
- **THEN** el nombre resuelto contra `core_Capability` es el auto-generado; si no existiera, el reporte del seed lo marca como faltante (no crea fila fantasma)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: entra como Diseñador en UPU, crea un plan de estudio eligiendo su institucion, y se guarda.

### REQ-SET-01: Cada modulo declara base + extensiones cuya union replica el mapa del rol

> **Que cambia**: aparecen 8 archivos de set (2 bases + 6 extensiones): la base es el set de Consultor, las 3 extensiones heredan de ella con el delta de cada rol. La union resuelta de cada set debe igualar el conjunto de caps que hoy tiene ese rol en ese modulo.
> **Por que**: es la fuente de verdad futura. Si un set no replica 1:1 el mapa del rol, al crear los vinculos (fase diferida) ese rol perderia o ganaria permisos.

El sistema MUST declarar, por cada mod, una base (`<Modulo en ingles> - Consultor Curricular`) y tres extensiones (`Revisor`/`Diseñador`/`Autoridad`) con `extends` hacia la base, de modo que para cada rol la union resuelta `base ∪ extension` sea **exactamente igual** al conjunto de capabilities que ese rol declara hoy en el mapa de ese modulo (mas `institution:view` en la base de cd). La composicion es **por modulo, no espejo** (D8). Los transversales (`core_datalog:view`, y `core_user.name:view` en cm) se declaran en las dos bases (D5, la inyeccion deduplica por nombre).

**Actor**: system (sync)
**Layers**: backend (declaracion de mod), database

<details><summary>Scenarios de validacion</summary>

#### Scenario: equivalencia estructural (DET-40)
- **GIVEN** el mapa `MOD_CAPABILITIES_BY_ROLE` vivo de cada mod
- **WHEN** se resuelve la union `base ∪ extension` de cada set (aplicando el candidato canonico de `capabilityCandidates`)
- **THEN** el conjunto resuelto por rol es igual al del mapa (mas `institution:view` en cd), sin faltantes ni sobrantes

#### Scenario: herencia sin duplicar
- **GIVEN** un set de extension con `extends` hacia la base
- **WHEN** el runtime resuelve sus capabilities (`resolveModRoleCapabilityNames`, `modRoleCapabilities.js:32-56`)
- **THEN** obtiene la union base+extension una sola vez (dedup por nombre), con guarda de ciclos

#### Scenario: nombres de set no colisionan con nombres de rol
- **GIVEN** sets `Curriculum Design - <Rol>` y roles `Learning Assurance - <Rol>`
- **WHEN** el sync materializa
- **THEN** ningun nombre de set coincide con un nombre de rol (D3, esquiva el punto ciego de la proteccion de nombres)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el test de equivalencia estructural pasa (union del set == mapa del rol) y el sync materializa los 8 sets sin colisiones.

### REQ-SET-02: Dos sets compuestos (Diseñador + Autoridad) para Admin/Consultor

> **Que cambia**: se agregan 2 sets mas (uno por modulo): el perfil combinado que reciben Admin y Consultor segun la regla del PO. Total de sets: **10** (8 + 2 compuestos).
> **Por que**: el vinculo admite un solo set por modulo (unicidad `(appId, roleId)` en `up1_suite_app_role.json`) y la herencia es de un padre (`extendsId` escalar). La union de Diseñador + Autoridad (dos sets hermanos) no cabe en un vinculo ni en la herencia directa: exige un set compuesto.

El sistema MUST declarar, por cada mod, un set compuesto cuyas capabilities resueltas sean la **union exacta de Diseñador ∪ Autoridad** de ese modulo. Se modela con `extends` hacia el set de **Autoridad** + declarando el **delta de Diseñador** (las caps de crear/editar/versionar/clonar que Autoridad no tiene), derivado del mapa vivo. NO se modela como `Autoridad extends Diseñador` (romperia la separacion de funciones del set Autoridad standalone, que hoy no crea — Anexo A). El nombre del compuesto NO debe colisionar con nombres de rol (D3).

**Actor**: system (sync)
**Layers**: backend (declaracion de mod), database

<details><summary>Scenarios de validacion</summary>

#### Scenario: la union resuelta del compuesto == Diseñador ∪ Autoridad
- **GIVEN** el compuesto con `extends` a Autoridad + delta de Diseñador
- **WHEN** el runtime resuelve sus capabilities (`resolveModRoleCapabilityNames`)
- **THEN** el conjunto es exactamente `set_Diseñador ∪ set_Autoridad` de ese modulo, sin faltantes ni sobrantes

#### Scenario: los sets standalone no se alteran
- **GIVEN** los sets Diseñador y Autoridad existentes
- **WHEN** se declara el compuesto
- **THEN** Diseñador y Autoridad conservan su composicion (el compuesto los referencia, no los modifica)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el test de equivalencia confirma que el compuesto resuelve la union de los dos perfiles; los sets standalone quedan intactos.

### REQ-VIS-01: Privatizar la visibilidad de las dos apps a los 6 roles (via app.json)

> **Que cambia**: las apps `curriculum-design` y `curriculum-mapping`, hoy visibles para cualquier rol (no declaran roles), pasan a verse SOLO por los 6 roles mapeados (Admin, Consultor + 4 curriculares). Es un cambio observable.
> **Por que**: al declarar el array `roles` en el `app.json`, `syncAppRoles` crea las filas `up1_suite_app_role` y la app deja de ser publica (H9, `app.resolver.js:120-123`). Es el criterio 1 del ticket para la parte visible.

El sistema MUST declarar el array `roles` con los **6 roles** (Admin, Consultor, y los 4 `Learning Assurance - <Rol>`) en `curriculum-design/config/app.json` y `curriculum-mapping/config/app.json`, de modo que el sync cree las 6 filas (con `modRoleId` null) y privatice la visibilidad. El array MUST incluir SIEMPRE los 6, porque `syncAppRoles` borra las filas stale (roleId `notIn` el array) — omitir un rol al que un admin ya le asigno `modRoleId` borraria esa asignacion (Learn L2). La privatizacion MUST coordinarse con **UPONE-1616 ANTES** de mergear, y MUST verificarse que ninguno de los 15 roles no incluidos tiene alcance curricular legitimo (respaldo: `kb/sp9/UPONE-1615-inventario-de-roles.md`).

**Actor**: usuario / administrador
**Layers**: config (app.json), backend (sync), database

<details><summary>Scenarios de validacion</summary>

#### Scenario: la app se privatiza a los 6
- **GIVEN** el array `roles` con los 6 declarado en el app.json y el sync corrido
- **WHEN** un usuario con un rol distinto de los 6 abre el menu
- **THEN** las apps curriculares NO le aparecen; con uno de los 6, si

#### Scenario: ningun rol legitimo pierde la vista
- **GIVEN** los 15 roles no incluidos
- **WHEN** se revisa su alcance curricular contra el inventario
- **THEN** ninguno tiene caps curriculares propias que justifiquen verlas (todos son 'ninguno' por diseño)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en UPU, las dos apps se ven con los 6 roles y no con el resto; el menu de un rol de engagement o antiguo ya no las muestra.

### REQ-LINK-01: Runbook de asignacion de modRoleId (ops manual up1-manager)

> **Que cambia**: se entrega un procedimiento documentado para que un administrador asigne, via la UI de up1-manager, el set (`modRoleId`) a cada una de las 6 filas. NO es un cambio de codigo del mod.
> **Por que**: asignar `modRoleId` no tiene path de seed/sync (`syncAppRoles` deja null) — es una operacion manual en up1-manager (Learn L2). El ticket no puede ejecutarlo como PR, pero SI debe dejar el procedimiento y verificarlo en UPU.

El sistema (equipo) MUST producir un runbook que documente, paso a paso en up1-manager, la asignacion: `Admin` -> compuesto, `Consultor` -> compuesto, y cada `Learning Assurance - <Rol>` -> su set homonimo por modulo (uno-a-uno), en las dos apps. El runbook MUST incluir: el gotcha de stale-deletion (el array `roles` del app.json debe conservar los 6), la advertencia de que crear el vinculo privatiza (coordinar UPONE-1616), y que Admin/Consultor conservan su acceso total por el refill de core (Learn L1). La verificacion en UPU (S6) aplica el runbook y comprueba el efectivo (REQ-CONVIV-01).

**Actor**: administrador (tenant, up1-manager)
**Layers**: ops / runbook (documentacion), verificacion runtime

#### Acceptance
**El usuario puede verificar que funciona**: siguiendo el runbook en up1-manager, las 6 filas quedan con su `modRoleId`, y el vuelco de permisos efectivos coincide con el baseline (REQ-CONVIV-01).

### REQ-RETIRE-01: Se retiran el rol huerfano y los 2 fixtures, sin regeneracion

> **Que cambia**: desaparecen el rol `GestorCurricular` (huerfano, auto-creado desde un layout ya corregido) y los 2 sets de fixture (`roles/GestorCurricular.json`, `roles/LectorCurricular.json`). Una segunda corrida del sync no los vuelve a crear.
> **Por que**: son residuos de las pruebas de RBAC-01; la causa que regeneraba el huerfano ya se corrigio (`e47f793`). Mantenerlos ensucia la lista de roles del tenant.

El sistema MUST retirar los 2 archivos de fixture de `mods/curriculum-design/roles/` (el sync elimina sus `core_ModRole` por stale-deletion, `syncModRolesForApp`) y eliminar el `core_Role` huerfano `GestorCurricular` de forma **guardada** (solo si tiene 0 `core_RoleAssignment` y 0 layouts que lo referencien). Una segunda corrida del sync MUST no regenerar ninguno.

**Actor**: admin (seed / sync)
**Layers**: backend (seed), database, config (mod files)

<details><summary>Scenarios de validacion</summary>

#### Scenario: durabilidad del retiro (HR9)
- **GIVEN** el huerfano y los 2 fixtures retirados
- **WHEN** se corre el sync una segunda vez
- **THEN** ninguno reaparece (el layout que regeneraba el huerfano ya declara `roles: ["Coordinador"]`)

#### Scenario: guarda del borrado destructivo
- **GIVEN** el `core_Role` `GestorCurricular`
- **WHEN** el paso de retiro corre
- **THEN** solo elimina si el rol tiene 0 asignaciones y 0 layouts; si tuviera alguna, se salta y reporta (no borra a ciegas)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en UPU no existen `GestorCurricular` (rol) ni los 2 sets de fixture, y tras un segundo sync siguen sin existir.

## Refactor map

> El "refactor" reruta la fuente de declaracion de permisos hacia sets, pero NO retira el mapa del rol (el cut-over sigue diferido). Los sets declarados son inertes MIENTRAS no exista vinculo (S2-S5); en S6 se crean los vinculos de 6 roles y los sets pasan a inyectar, pero por convivencia el efectivo no cambia (REQ-CONVIV-01). Lo que SI cambia el comportamiento observable son **tres** deltas intencionales: institucion (REQ-ADD-01), nombres de rol (REQ-PRESERVE-02) y la **privatizacion de la visibilidad** de las dos apps (REQ-VIS-01).

### Files

| Action | Before | After | Reason |
|--------|--------|-------|--------|
| add | — | `mods/curriculum-design/roles/*.json` (1 base + 3 extension sets) | Declarar los sets de cd (fuente de verdad futura, inerte sin vinculo) |
| add | — | `mods/curriculum-mapping/roles/*.json` (directorio nuevo: 1 base + 3 extension sets) | cm no tiene directorio `roles/`; declarar sus sets por su App |
| add | — | `mods/curriculum-design/roles/*.json` + `mods/curriculum-mapping/roles/*.json` (1 set compuesto por mod) | REQ-SET-02: perfil Diseñador + Autoridad para Admin/Consultor (extends Autoridad + delta Diseñador) |
| modify | `mods/curriculum-design/config/app.json` (sin array `roles`) | +`roles: [Admin, Consultor, LA-Consultor, LA-Diseñador, LA-Revisor, LA-Autoridad]` | REQ-VIS-01: privatiza la visibilidad; `syncAppRoles` crea las 6 filas (modRoleId null) |
| modify | `mods/curriculum-mapping/config/app.json` (sin array `roles`) | +`roles: [los mismos 6]` | REQ-VIS-01: idem cm. El array debe incluir los 6 (stale-deletion, Learn L2) |
| add (doc/ops) | — | Runbook de asignacion de `modRoleId` en up1-manager | REQ-LINK-01: la asignacion del set NO es codigo del mod (Learn L2); se documenta y se verifica en UPU |
| remove | `mods/curriculum-design/roles/GestorCurricular.json` | — | Fixture RBAC-01 en desuso (REQ-RETIRE-01) |
| remove | `mods/curriculum-design/roles/LectorCurricular.json` | — | Fixture RBAC-01 en desuso (REQ-RETIRE-01) |
| modify | `mods/curriculum-design/seed/_data-rbac.js` | +`institution:view` en `READ_CAPS`; +paso de renombre por nombre viejo; +retiro guardado del huerfano | Criterio 2 + renombre + limpieza. **Mapa `MOD_CAPABILITIES_BY_ROLE` NO se retira** |
| modify | `mods/curriculum-mapping/seed/_data-rbac.js` | +paso de renombre por nombre viejo (idempotente, cualquier orden) | Renombre coordinado; el mod comparte los roles |
| modify | `mods/curriculum-design/tests/unit/rbacRoles.test.js` | +assert `institution:view` en los 4 roles; +test equivalencia set↔mapa; +test renombre idempotente | REQ-PRESERVE-04 / REQ-SET-01 / REQ-PRESERVE-02 |
| modify | `mods/curriculum-mapping/tests/unit/rbacRoles.test.js` | test de paridad reformulado al nuevo invariante (composicion por modulo) + equivalencia set↔mapa | La paridad de roles se conserva; la de composicion diverge a proposito (D8) |
| modify | 5 documentos que citan los nombres de rol | nombres viejos → `Learning Assurance - <Rol>` | Barrido antes/junto al renombre (identificar los 5 en S1) |

### Exports / API affected

| Export | Current | After | Consumers |
|--------|---------|-------|-----------|
| `_internals.MOD_CAPABILITIES_BY_ROLE` (ambos seeds) | mapa rol→caps (lowercase `obj:action`) | igual + `institution:view` en cd; **sigue siendo la fuente runtime** | `rbacRoles.test.js` (ambos mods) |
| `ROLE_DEFINITIONS[].name` (ambos seeds) | nombres viejos | `Learning Assurance - <Rol>` | `rbacRoles.test.js`, paridad, 5 docs |
| `ensureCurriculumModRbac` / `ensureMappingModRbac` | crea roles + cablea caps | + paso de renombre previo, idempotente | `seed.js` (entrypoint), tests |
| Set files `roles/*.json` (formato `{name, description, extends, capabilities:{Target:[actions]}}`) | 2 fixtures en cd | 8 sets reales | `syncModRolesForApp` (`dbSync.js:1245`) |

### Consumer updates required

| Consumer | Current | After |
|----------|---------|-------|
| `curriculum-design/tests/unit/rbacRoles.test.js` | `ROLE_NAMES` con nombres viejos; assert Consultor == READ_CAPS | nombres nuevos; READ_CAPS con institucion; nuevos tests de equivalencia y renombre |
| `curriculum-mapping/tests/unit/rbacRoles.test.js` | compara ambos seeds por igualdad | paridad de roles conservada; composicion por modulo divergente documentada |
| 5 documentos (identificar en S1) | nombres viejos | nombres nuevos |

> **Nota DET-40 (transcripcion)**: el mapa del rol usa strings planos lowercase (`academicprogram:view`, `curriculum.status:modify`, `offering.lifecycleStatus:modify`); el formato de set-file agrupa por target con arrays de accion y admite PascalCase (`{ "AcademicProgram": ["view"], "Curriculum.status": ["modify"] }`). El sync canonicaliza (`capabilityCandidates`, `dbSync.js:880-920`: lowercasea objeto/RT, preserva el nombre de campo) y matchea el primer candidato existente. Las caps de campo/RT (`competencynode:matrix.status:modify` en cm; `offering.lifecycleStatus:modify` en cd) requieren expresar el target exacto. **Mitigacion: derivar los sets del mapa vivo, no transcribir a mano.**

## Tasks

### Session 1 — Baseline runtime + auditoria por rol (sin cambios de codigo) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Volcar el conjunto de capabilities efectivas por rol en UPU (antes de tocar nada) y guardarlo como baseline en `## Regression baseline` del ticket | REQ-PRESERVE-01 | researcher | — | ticket (baseline), UPU DB (read) | vuelco por los 4 roles capturado, guardado en el ticket | (no aplica) | DET-2, DET-13 | pending | 1 |
| S1.T2 | Auditar rol por rol: por cada accion que declara, verificar que la capability exista/este asignada; anotar huecos (esperado: solo institucion en cd) | REQ-ADD-01, REQ-PRESERVE-01 | researcher | S1.T1 | ticket | huecos por rol listados; confirmar que el unico hueco es `institution:view` | (no aplica) | DET-4, DET-5 | pending | 1 |
| S1.T3 | Identificar los 5 documentos que citan los nombres de rol viejos (barrido `grep` en repo) y registrarlos para el renombre de S4 | REQ-PRESERVE-02 | researcher | — | ticket | lista de 5 docs con path:linea | (no aplica) | DET-16 | pending | 1 |
| S1.T4 | Correr las 2 suites `rbacRoles.test.js` (cd + cm) y registrar el conteo verde como baseline de comportamiento | REQ-PRESERVE-04 | developer | — | — | `X/X passing` en ambas, guardado en `## Regression baseline` | (no aplica) | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir baseline + auditoria en `## Sessions`, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + baseline verde + huecos documentados | (no aplica — cierre) | DET-20, DET-23 | pending | 1 |

### Session 2 — Criterio 2 (institucion) + declarar las 2 bases [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Confirmar el nombre exacto de la cap de institucion (`institution:view`, objeto base `Institution`) contra `core_Capability`/`generateCapabilities.js:117-119` | REQ-ADD-01 | researcher | S1.GATE | — | nombre canonico confirmado | (no aplica) | DET-1, DET-4 | pending | 2 |
| S2.T2 | Agregar `institution:view` a `READ_CAPS` del seed de cd (efectiva runtime sin vinculo) | REQ-ADD-01 | developer | S2.T1 | `mods/curriculum-design/seed/_data-rbac.js` | sync corre; los 4 roles de cd reciben la cap en `core_RoleCapability` | git revert | DET-5, DET-8, RULE (institution-view-gap) | pending | 2 |
| S2.T3 | Actualizar `rbacRoles.test.js` de cd para exigir `institution:view` en los 4 roles (assert intencional) | REQ-ADD-01, REQ-PRESERVE-04 | developer | S2.T2 | `mods/curriculum-design/tests/unit/rbacRoles.test.js` | suite verde con el nuevo assert | git revert | DET-7 | pending | 2 |
| S2.T4 | Declarar la base de cd (`Curriculum Design - Consultor Curricular`) derivada del mapa: `READ_CAPS` + `institution:view` + transversales; y la base de cm (`Curriculum Mapping - Consultor Curricular`) con sus READ_CAPS + transversales | REQ-SET-01 | developer | S2.T2 | `mods/curriculum-design/roles/*.json`, `mods/curriculum-mapping/roles/*.json` (dir nuevo) | sync materializa las 2 bases; caps resueltas == Consultor del mapa (+institucion en cd) | git revert (borrar archivos) | DET-1, DET-2, DET-40 | pending | 2 |
| S2.T5 | Verificar que declarar las bases NO cambia permisos efectivos (sin vinculo no inyecta): re-vuelco vs baseline S1 | REQ-PRESERVE-03 | reviewer | S2.T4 | UPU DB (read) | vuelco identico al baseline salvo institucion | (no aplica) | DET-13, DET-33 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, vitest cd verde, decidir continue/iterate | — | reviewer | S2.T1..S2.T5 | ticket | gate persistido + tests verdes | (no aplica — cierre) | DET-20, DET-23 | pending | 2 |

### Session 3 — Declarar las 6 extensiones + herencia + reformular paridad [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Declarar las 3 extensiones de cd (Revisor/Diseñador/Autoridad) con `extends` a la base + el delta de cada rol, derivado del mapa | REQ-SET-01 | developer | S2.GATE | `mods/curriculum-design/roles/*.json` | sync materializa; herencia resuelve union sin duplicar | git revert | DET-1, DET-40 | pending | 3 |
| S3.T2 | Declarar las 3 extensiones de cm con `extends` a su base + delta (ojo caps de campo `competencynode:matrix.status:modify`, 3 segmentos) | REQ-SET-01 | developer | S2.GATE | `mods/curriculum-mapping/roles/*.json` | sync materializa; caps de campo/RT resueltas al candidato canonico correcto | git revert | DET-1, DET-40 | pending | 3 |
| S3.T3 | Test de equivalencia estructural: por rol/mod, union `base∪extension` resuelta == `MOD_CAPABILITIES_BY_ROLE` (count-agnostic) | REQ-SET-01, REQ-PRESERVE-01 | developer | S3.T1, S3.T2 | ambos `rbacRoles.test.js` | test verde; 0 faltantes/sobrantes por rol | git revert | DET-7, DET-40 | pending | 3 |
| S3.T4 | Reformular el test de paridad cd↔cm: conservar la paridad de nombres de rol; documentar que la composicion por modulo diverge a proposito (D8) | REQ-PRESERVE-04 | developer | S3.T3 | `mods/curriculum-mapping/tests/unit/rbacRoles.test.js` | suite verde con el nuevo invariante documentado | git revert | DET-7 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, ambas suites verdes, decidir continue/iterate | — | reviewer | S3.T1..S3.T4 | ticket | gate persistido + tests verdes | (no aplica — cierre) | DET-20, DET-23 | pending | 3 |

### Session 4 — Renombre de los 4 roles + barrido de docs/tests [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Implementar el paso de renombre por nombre viejo (idempotente, guardado) en el seed de cd, ANTES de `ensureRoles`; actualizar `ROLE_DEFINITIONS` a los nombres nuevos | REQ-PRESERVE-02 | developer | S3.GATE | `mods/curriculum-design/seed/_data-rbac.js` | corrida sobre base con nombres viejos → 4 roles renombrados | git revert | DET-8, DET-40 | pending | 4 |
| S4.T2 | Replicar el paso de renombre en el seed de cm (idempotente en cualquier orden respecto de cd); actualizar `ROLE_DEFINITIONS` | REQ-PRESERVE-02 | developer | S4.T1 | `mods/curriculum-mapping/seed/_data-rbac.js` | corrida en cualquier orden converge a 4 roles nuevos | git revert | DET-8, DET-40 | pending | 4 |
| S4.T3 | Test de renombre idempotente sobre base con nombres viejos (HR3): 4 roles no 8, 120 asignaciones conservadas, 0 nombres viejos | REQ-PRESERVE-02 | developer | S4.T2 | ambos `rbacRoles.test.js` | test verde (integration si el mock no cubre el conteo real de roles) | git revert | DET-7, DET-40 | pending | 4 |
| S4.T4 | Barrer los 5 documentos + assertions de tests que citan nombres viejos → nombres nuevos | REQ-PRESERVE-02 | developer | S4.T3 | 5 docs + ambos `rbacRoles.test.js` | grep de nombres viejos → 0 en repo | git revert | DET-16 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir, verificar HR3 sobre base con nombres viejos, decidir continue/iterate | — | reviewer | S4.T1..S4.T4 | ticket | gate persistido + HR3 verificado + tests verdes | (no aplica — cierre) | DET-20, DET-23, DET-40 | pending | 4 |

### Session 5 — Retiro destructivo + verificacion runtime rol por rol + docs + aviso [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Retirar los 2 fixtures (`roles/GestorCurricular.json`, `roles/LectorCurricular.json`) y agregar el retiro GUARDADO del `core_Role` huerfano (solo si 0 asignaciones y 0 layouts) al seed de cd | REQ-RETIRE-01 | developer | S4.GATE | `mods/curriculum-design/roles/` (rm), `mods/curriculum-design/seed/_data-rbac.js` | sync elimina los 2 `core_ModRole`; huerfano eliminado si desusado | git revert + restaurar fixtures | DET-8, DET-40 | pending | 5 |
| S5.T2 | Correr el sync 2× y confirmar que ni el huerfano ni los fixtures reaparecen (HR9) | REQ-RETIRE-01 | reviewer | S5.T1 | UPU DB (read) | 2ª corrida no regenera nada | (no aplica) | DET-13, DET-33 | pending | 5 |
| S5.T3 | Verificacion runtime de permisos efectivos rol por rol (smoke UPU) vs baseline S1 (HR1): ningun rol pierde caps; entrar con cada rol y ejecutar sus acciones | REQ-PRESERVE-01 | reviewer | S5.T1 | UPU (runtime) | vuelco por rol == baseline (+institucion en cd); evidencia runtime real | (no aplica) | DET-13, DET-33, DET-36 | pending | 5 |
| S5.T4 | Caso del PO end-to-end (HR2): entrar como Diseñador, crear un plan de estudio con el select de institucion poblado y guardar | REQ-ADD-01 | reviewer | S5.T3 | UPU (runtime) | plan guardado; evidencia runtime (screenshot/DOM) | (no aplica) | DET-13, DET-36 | pending | 5 |
| S5.T5 | Actualizar la doc oficial observable (RBAC del mod + los nombres de rol en docs de los dos mods) | REQ-PRESERVE-02 | developer | S5.T1 | `mods/curriculum-design/docs/*`, `mods/curriculum-mapping/docs/*` (los que apliquen) | doc refleja sets + nombres nuevos; sin nombres viejos | git revert | DET-37 | pending | 5 |
| S5.T6 | Enviar el aviso a core por el punto ciego de la proteccion de nombres (H12, `dbSync.js:1031-1040`) — no bloqueante; registrar el canal usado | request (item "avisar al core sobre el punto ciego de proteccion de nombres", H12) | researcher | — | ticket / canal core | aviso enviado y registrado | (no aplica) | DET-16 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** — persistir, regresion completa + smoke UI, HR1/HR2/HR9 verificados con evidencia runtime, decidir cierre | — | reviewer | S5.T1..S5.T6 | ticket | gate persistido + evidencia runtime + tests verdes | (no aplica — cierre) | DET-20, DET-23, DET-36 | pending | 5 |

### Session 6 — Compuesto + privatizacion + vinculos (6 roles) + verificacion final [tipo: ⚑ fuerte] [tier: T3]

> Capa nueva por la resolucion parcial de O1 (2026-08-26). Depende de que los sets base/extension existan (S3) y del renombre (S4). Introduce el UNICO cambio de comportamiento observable (privatizacion). La asignacion de `modRoleId` es ops (runbook + verificacion en UPU), no codigo.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T0 | Confirmar con UPONE-1616 ANTES de tocar el app.json: la privatizacion cierra la visibilidad; alinear evidencia de menu | REQ-VIS-01 | researcher | S5.GATE | ticket / canal UPONE-1616 | coordinacion registrada; OK para privatizar | (no aplica) | DET-16 | pending | 6 |
| S6.T1 | Declarar el set compuesto (extends Autoridad + delta Diseñador) en cd y en cm, derivado del mapa | REQ-SET-02 | developer | S5.GATE | `mods/curriculum-design/roles/*.json`, `mods/curriculum-mapping/roles/*.json` | sync materializa; union resuelta == Diseñador ∪ Autoridad por mod | git revert (borrar archivos) | DET-1, DET-40 | pending | 6 |
| S6.T2 | Test de equivalencia del compuesto: union resuelta == `set_Diseñador ∪ set_Autoridad` (0 faltantes/sobrantes) | REQ-SET-02, REQ-CONVIV-01 | developer | S6.T1 | ambos `rbacRoles.test.js` | test verde | git revert | DET-7, DET-40 | pending | 6 |
| S6.T3 | Declarar `roles:[los 6]` en el `app.json` de cd y cm; verificar que `syncAppRoles` crea las 6 filas (modRoleId null) y privatiza | REQ-VIS-01 | developer | S6.T0 | `mods/curriculum-design/config/app.json`, `mods/curriculum-mapping/config/app.json` | sync crea 6 filas por app; apps ya no publicas | git revert (quitar array `roles`) | DET-8, DET-40 | pending | 6 |
| S6.T4 | Verificar privatizacion contra el inventario: los 15 roles no incluidos no tienen alcance curricular legitimo; smoke UPU con un rol fuera de los 6 (no ve las apps) y uno dentro (si) | REQ-VIS-01 | reviewer | S6.T3 | UPU (runtime), `kb/sp9/UPONE-1615-inventario-de-roles.md` | evidencia runtime: menu privatizado correcto; 0 roles legitimos afuera | (no aplica) | DET-13, DET-33, DET-36 | pending | 6 |
| S6.T5 | Producir el runbook de asignacion de `modRoleId` en up1-manager (Admin/Consultor -> compuesto; 4 curriculares -> su set uno-a-uno; gotcha stale-deletion; nota refill de core) | REQ-LINK-01 | developer | S6.T1 | ticket / doc runbook | runbook completo, paso a paso, con las 12 asignaciones (6 roles × 2 apps) | (no aplica) | DET-37 | pending | 6 |
| S6.T6 | Aplicar el runbook en UPU (smoke) y verificar el efectivo con vinculos: vuelco por los 6 roles == baseline S1 (salvo institucion); Admin/Consultor ven y operan; PO end-to-end sigue OK | REQ-CONVIV-01, REQ-LINK-01 | reviewer | S6.T3, S6.T5 | UPU (runtime) | evidencia runtime: modRoleId asignado en las 6 filas; efectivo == baseline; dedup confirmado | revertir asignaciones en up1-manager (set 'No profile') | DET-13, DET-33, DET-36 | pending | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T3)** — persistir, privatizacion verificada + convivencia (efectivo sin cambio) con evidencia runtime, runbook entregado, coordinacion UPONE-1616 registrada, decidir cierre | — | reviewer | S6.T0..S6.T6 | ticket | gate persistido + evidencia runtime + tests verdes | (no aplica — cierre) | DET-20, DET-23, DET-36 | pending | 6 |

## Constraints

- **DET-40 (auditoria de reemplazo)**: la composicion de cada set debe replicar 1:1 el mapa del rol; el renombre debe replicar la identidad del rol viejo (asignaciones por id). Verificado estructuralmente (S3.T3) y runtime (S5.T3).
- **RULE (institution-view-gap, SP8)**: `kb/sp8/UPONE-1538-rbac-institution-view-gap.md` — la cap de institucion va al conjunto de lectura; el alcance se acota por nodo en el provisioning, no negando la lectura.
- **up1/CLAUDE.md — Sync**: nunca editar archivos sincronizados; correr `npm run sync` tras cambios de mod; no commitear artefactos de sync/seed. Los seeds `_data-rbac.js` (prefijo `_`) los importa `seed.js`, no los corre el sync como seed independiente.
- **up1/CLAUDE.md — RBAC/RT**: caps de campo tienen punto en el nombre; caps de RT-field son 3 segmentos (`<base>:<rt>.<campo>:<accion>`). No referenciar DMMF.
- **DEC (D1-D9, `kb/sp9/UPONE-1615-registro-de-decisiones.md`)**: modelo cerrado por el PO — sets por modulo, renombre en su lugar sin convivencia, base+extension, transversales en las dos bases, institucion en la base de cd, composicion por modulo.
- **Memoria: sync no es quirurgico / migraciones destructivas coordinan con core** — el retiro del `core_Role` huerfano es destructivo; guardado (0 asignaciones) e idempotente; el drop lo aplica el flujo de sync/seed, no ALTER manual.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| UPONE-1353 / UPONE-1354 | internal (satisfecha) | Mecanismo de sets + resolucion de layouts por set (Finalizadas) | Ninguno: ya existe. Sin ellas el ticket no seria posible |
| UPONE-1619 (TICKET-134) | internal (activa, SP9) | Toca el MISMO `mods/curriculum-design/seed/_data-rbac.js` (declara caps de 2 objetos nuevos, las cablea a estos roles). Spec: `specs/curriculum-design/SPEC-curriculum-design-instructional-component.md` | **Alto de secuenciacion**: ejecutarlos en paralelo sobre ese archivo se pisan. Secuenciar o rebasar; ademas engorda `Consultor` (core) |
| UPONE-1616 | internal (SP9) | Cierra con evidencia de menu de las apps curriculares; crear vinculos las privatiza | Coordinar ANTES de crear vinculos (fase diferida, no en tasks) |
| UPONE-1530 | internal (SP9) | El MCP usa permisos del usuario real como frontera; cambian con este ticket | Aviso: nombres de rol y permisos cambian |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Retirar el mapa del rol sin vinculos → regresion total | Baja (mitigado por diseño) | Todos los roles pierden permisos runtime | REQ-PRESERVE-01: el mapa NO se retira; los sets quedan inertes hasta los vinculos (diferidos) |
| Transcribir mal ~100 caps a los sets (casing / caps de campo) | Media | Regresion silenciosa al crear vinculos | Derivar del mapa vivo + test de equivalencia estructural (S3.T3) + baseline runtime (S5.T3) |
| Renombre ingenuo forka (4 nuevos + 4 viejos con 120 asignaciones) | Media | Perdida de asignaciones / roles duplicados | Paso de renombre por nombre viejo idempotente en ambos seeds + verificacion HR3 sobre base con nombres viejos (S4) |
| Colision de archivo con UPONE-1619 en `_data-rbac.js` | Media | Bloqueo/pisada de cambios | Secuenciar o rebasar; coordinar antes de tocar el archivo |
| Borrado destructivo del `core_Role` huerfano sin guarda | Baja | Borrar un rol en uso | Guarda: eliminar solo si 0 asignaciones y 0 layouts; idempotente |
| Los conteos del analisis (cd base=14) difieren del mapa real (`READ_CAPS`=15) | Confirmada | Sets mal dimensionados si se transcribe por conteo | No confiar en conteos: derivar del mapa + test de equivalencia count-agnostic |
| Tests mockeados no cazan el conteo real de roles tras el renombre | Media | Fork no detectado por unit | S4.T3 exige verificacion sobre base con nombres viejos (integration si el mock no cubre el conteo) |

## Open questions

- [x] **O1 (RESUELTO PARCIAL — 2026-08-26) — Mapeo de los roles del core hacia los sets.** El PO entrego una regla parcial (catalogo institucional, 2 de 10 filas): `Admin` y `Consultor` -> perfil "Diseñador + Autoridad". Con eso este spec cablea **6 roles** (Admin, Consultor + 4 curriculares): declara los sets compuestos (REQ-SET-02), privatiza via app.json (REQ-VIS-01) y entrega el runbook de asignacion (REQ-LINK-01). Ver S6. Detalle: `tickets/TICKET-133.md` (decisions_log `o1-partial-resolution`, Learns L1/L2).
- [ ] **O1-REMANENTE (siguiente sprint) — Los 8 roles restantes del catalogo** (4 nuevos + resto de core): mapeo pendiente hasta tener las 10 filas. Al agregarlos, sumar sus roles al array `roles` del app.json + asignar sus `modRoleId`. Algunos pueden necesitar nuevos sets compuestos (Escenario B).
- [ ] **CUT-OVER (diferido) — Retiro del mapa rol→cap y de los directos.** Con vinculos ya creados, el cut-over pasa a inyeccion-solo-por-set. Para los 4 curriculares es viable (no estan en `DEFAULT_ROLES`). Para Admin/Consultor NO es alcanzable en el mod: el core los refill (Learn L1) — requiere sacarlos de `DEFAULT_ROLES` (ticket de core / UPONE-1633).
- [ ] **O2 (BLOCKED, coordinacion) — Acotar `offering:create/modify` del Diseñador.** `offering` es objeto compartido cd (silabos) / engagement (ofertas); los nombres de cap no tienen dimension de app, asi que el permiso aplica global. Requiere acuerdo con engagement. Se acota aqui o se re-registra; no es task de este spec.

## Decisions

### DEC-LOCAL-01: Sets inertes + mapa del rol como fuente runtime activa (dos fases)
- **Contexto**: los sets no inyectan sin vinculo, y los vinculos estan bloqueados (O1). ¿Como migrar sin regresion?
- **Drivers**: zero behavior change; criterio 2 verificable runtime en este ticket; O1 bloqueado.
- **Opcion elegida**: declarar los sets como dato inerte (fuente futura) y **conservar** el mapa `MOD_CAPABILITIES_BY_ROLE` como fuente runtime activa. El cut-over (retirar el mapa, inyeccion por set) se difiere con los vinculos.
- **Alternativas**: (a) retirar el mapa ya → regresion total sin vinculos; descartada. (b) crear los vinculos de la familia ya → privatiza apps y depende de O1/1616; descartada (bloqueada).
- **Consecuencias**: gana seguridad y verificabilidad; pierde "una sola fuente" temporalmente (aceptable — la dedup por nombre garantiza que no hay conflicto cuando ambos coexistan).
- **Session**: design.

### DEC-LOCAL-02: `institution:view` en el mapa del rol (no solo en el set)
- **Contexto**: criterio 2 del PO debe ser verificable runtime en este ticket; el set no inyecta sin vinculo.
- **Drivers**: DoD exige el flujo del PO end-to-end ahora; O1 bloqueado.
- **Opcion elegida**: agregar `institution:view` a `READ_CAPS` (mapa del rol, efectivo ya) y tambien declararla en la base de cd (fuente futura). Redundante pero seguro (dedup por nombre).
- **Alternativas**: solo en el set → no efectiva sin vinculo → criterio 2 no verificable ahora; descartada.
- **Consecuencias**: era la unica adicion intencional de comportamiento; con el rearmado 2026-08-26 se suma la privatizacion (DEC-LOCAL-05).
- **Session**: design.

### DEC-LOCAL-03: Set compuesto por herencia (extends Autoridad + delta Diseñador)
- **Contexto**: Admin/Consultor reciben "Diseñador + Autoridad", union de dos sets hermanos; el vinculo admite un set por modulo y la herencia es de un padre.
- **Drivers**: regla del PO; unicidad `(appId, roleId)`; `extendsId` escalar; preservar la separacion de funciones de los sets standalone.
- **Opcion elegida**: declarar un set compuesto que `extends` Autoridad y agrega el delta de Diseñador (crear/editar/versionar/clonar).
- **Alternativas**: (a) atar dos sets al rol → imposible (unicidad). (b) cadena `Autoridad extends Diseñador` → Autoridad standalone ganaria crear/editar, rompe separacion de funciones; descartada. (c) union plana sin herencia → duplica todo; descartada por mantenibilidad.
- **Consecuencias**: +2 sets (10 total); el delta duplica ~una docena de caps (comentar en el seed para atarlo a Diseñador).
- **Session**: design.

### DEC-LOCAL-04: La asignacion de modRoleId es ops (runbook), no codigo del mod
- **Contexto**: no hay path de seed/sync para asignar el set a un rol; `syncAppRoles` deja `modRoleId` null; la asignacion es manual en up1-manager (Learn L2).
- **Drivers**: execute_scope del ticket = `mods/curriculum-design|mapping/`; la asignacion escribe datos de tenant, no archivos de mod.
- **Opcion elegida**: el ticket declara los sets y la privatizacion (codigo) y entrega un runbook para la asignacion (ops), verificandolo en UPU.
- **Alternativas**: (a) escribir un seed que asigne modRoleId → no existe ese path y seria tocar core/plataforma; descartada. (b) dejar la asignacion sin documentar → el vinculo nunca se materializa; descartada.
- **Consecuencias**: parte del criterio 1 (la asignacion) se completa fuera del PR, por un admin; el ticket lo deja listo y verificado.
- **Session**: design.

### DEC-LOCAL-05: Se privatiza la visibilidad este sprint (ya no es zero-behavior-change)
- **Contexto**: con O1 parcial, se crean vinculos de 6 roles; crear el primer vinculo privatiza (H9).
- **Drivers**: dar visibilidad y set a Admin/Consultor + curriculares; los 15 restantes no tienen alcance curricular legitimo (inventario).
- **Opcion elegida**: declarar `roles:[los 6]` en el app.json y privatizar, coordinando con UPONE-1616 antes.
- **Alternativas**: (a) mantener las apps publicas (cero filas) → no se puede: crear cualquier vinculo privatiza; y sin filas Admin/Consultor no verian tras el cut-over. (b) diferir todo a otro sprint → contradice la decision del dev de dejar el cableado hecho.
- **Consecuencias**: cambio observable (los 15 pierden la vista publica, intencional); el titular deja de ser zero-behavior-change.
- **Session**: design (rearmado).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-PRESERVE-01..04, REQ-CONVIV-01, REQ-ADD-01, REQ-SET-01, REQ-SET-02, REQ-VIS-01, REQ-LINK-01, REQ-RETIRE-01 pasan.
- [ ] **Compuesto (REQ-SET-02)**: la union resuelta del compuesto == Diseñador ∪ Autoridad por modulo; sets standalone intactos.
- [ ] **Privatizacion (REQ-VIS-01)**: las 2 apps se ven solo por los 6 roles; los 15 restantes no las ven y ninguno las necesitaba (inventario); coordinado con UPONE-1616.
- [ ] **Convivencia (REQ-CONVIV-01)**: tras asignar modRoleId (runbook en UPU), el efectivo por rol == baseline S1 (salvo institucion); dedup confirmado; 0 sobrantes.
- [ ] **Runbook (REQ-LINK-01)**: entregado, con las 12 asignaciones, el gotcha de stale-deletion y la nota de refill de core; aplicado y verificado en UPU.
- [ ] **Tests** (DET-37 dim4): equivalencia set↔mapa, renombre idempotente, paridad reformulada, institucion — todos VERDES; regresion de ambas suites RBAC verde.
- [ ] **Rules**: naming de caps (objeto sin prefijo, mod con prefijo, RT-field 3 segmentos), tenant isolation, seed idempotente, no editar sincronizados.
- [ ] **Integration / regresion**: vuelco de permisos efectivos por rol == baseline S1 (salvo institucion); HR1 verificado runtime.
- [ ] **Runtime (DET-36)**: caso del PO end-to-end con evidencia runtime real (no test file); permisos rol por rol con smoke UPU.
- [ ] **Docs oficiales** (DET-37 dim1): RBAC del mod + nombres de rol en docs de los dos mods actualizados.
- [ ] **KB DKC** (DET-37 dim2): RULE candidata (set-declaration debe replicar el mapa; renombre idempotente por nombre viejo) capturada.
- [ ] **Planning-completeness**: entry registrada (mixed).
- [ ] **Aviso a core** enviado (H12), y artefactos de sync/seed no commiteados.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

#### REQ-DOC-01 `confirmed` (add)
> Fuente: DET-37 dim1 (cambio observable de RBAC/config) + Request del ticket
Documentar el escenario final consolidado de roles, sets y permisos tras la migracion: mapa rol->set->capabilities por modulo (cd/cm); los 4 roles renombrados a "Learning Assurance - <Rol>" con las 120 asignaciones conservadas; el rol huerfano GestorCurricular + 2 fixtures retirados; los 10 sets (2 base + 6 extensiones + 2 compuestos Disenador+Autoridad); el caveat del refill de core sobre Admin/Consultor (learn L1); la institucion agregada a la base de cd; los 6 vinculos rol->set y el runbook de asignacion manual de modRoleId (learn L2).

<details><summary>Casos de test</summary>

- [happy] La doc del escenario final existe y refleja el estado real verificado en runtime (contrastado vs baseline S1).
- [edge] La doc lista los 10 sets y el mapa rol->set por modulo sin omitir los 2 compuestos.

</details>

#### REQ-TEST-01 `confirmed` (add)
> Fuente: Request del ticket (exige cobertura del camino real y verificacion runtime) + DET-7
Testing como requisito final: cobertura que ejercite el camino real (vinculacion, herencia, deduplicacion, renombre sobre base con nombres viejos) + verificacion runtime de permisos efectivos rol por rol (smoke UPU, DET-36) + regresion de la suite RBAC verde.

<details><summary>Casos de test</summary>

- [happy] La suite RBAC corre verde tras los cambios (regresion).
- [boundary] El renombre sobre una base con los nombres viejos deja 4 roles (no 8) con las 120 asignaciones intactas.
- [regression] Los permisos efectivos por rol en runtime no cambian (baseline S1 == post, salvo institucion).

</details>

**Tasks agregadas:**

- S6: Escribir la doc del escenario final (roles/sets/permisos) y consolidar el runbook de S5 (valida: REQ-DOC-01; rollback: git revert de la doc)
- S5: Cobertura del camino real + verificacion runtime rol por rol (smoke UPU) + regresion RBAC verde (valida: REQ-TEST-01, test; rollback: revertir tests agregados)

### Enmienda 2
**REQs:**

#### REQ-NOTIFY-01 `confirmed` (add)
> Fuente: Request TICKET-133 (item aviso a core) + H12; DOC-sp9-aviso-core-validatemodrolenamecollisions
Enviar a team core el aviso del punto ciego de validateModRoleNameCollisions (H12: el guard solo lee config.app.roles, ciego a roles por seed/layout). No bloqueante; el cierre verifica por evidencia que el aviso se envio.

<details><summary>Casos de test</summary>

- [happy] Queda evidencia registrada (link/ticket/mensaje) de que el aviso se envio a core.

</details>
