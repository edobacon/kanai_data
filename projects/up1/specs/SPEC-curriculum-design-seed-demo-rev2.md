---
id: SPEC-curriculum-design-seed-demo-rev2
project: up1
ticket: TICKET-113
status: done
---

# SP6 - Sustitucion del seed de demo por el paquete rev.2 (PM #097)

# SP6 - Sustitucion del seed de demo por el paquete rev.2 (PM #097)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive en Requirements y Tasks.*

**Que se quiere**: la data de demo de `curriculum-design` pasa a ser **la que entrega el paquete rev.2** (basada en casos reales de clientes, universo UPU-MAIN), y se **retira** la que el mod tiene hoy (fixtures de prueba de los universos ficticios UV y AIEP). No es "agregar al lado": es sustituir. Como la **suite de tests y la documentacion del mod estan construidas sobre esos fixtures**, el ticket los resuelve en el mismo cambio: los llm-e2e (que no corren en CI y no se ejecutan desde mayo) se **retiran**, los tests cuyo sujeto es el seed se actualizan, y los que solo lo usaban como fixture se **desacoplan** para que no vuelvan a romperse.

**Decisiones criticas que necesitan tu OK** (ya conversadas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Sobrescribir, no convivir**: sustituir los arrays `PROGRAMS`/`CURRICULA` y retirar `_data-univalle.js`, `_data-aiep.js`, `_data-malla.js`, `_data-syllabus.js` | La data de prueba deja de competir con la real. Los conteos de validacion se vuelven deterministas **acotados a nuestra data** (`code LIKE 'UPU-%'` / `'C-%'`). **CORRECCION verificada en BD (S1.T9)**: NO son totales exactos de tabla — el tenant tiene data de otros mods (CALDEMO, SVC, academic-scheduling), asi que filtrar por prefijo es obligatorio. |
| 2 | **Absorber la migracion de tests y docs en este ticket** (no diferirla) | 17 escenarios llm-e2e y 6 tests de integracion referencian los fixtures UV/AIEP; `seed-counts.test.ts` incluso assertea `'Universidad del Valle'` y `country: 'CO'`. Diferirlo dejaria la suite en rojo entre tickets. |
| 3 | **P6 historial = excluir el loader** (`_data-changelog.js` no entra) | `core_DataLog` es log de auditoria: se puebla con las acciones reales. Evita ademas BUG-006 (accesor) y BUG-008 (visor), ambos abiertos y ajenos. |
| 4 | **Fix P5** = quitar el lookup de workflow y setear `Activity.status='Active'`, **con una excepcion designada que queda en `Draft`** | Sin el fix el seed crashea (columnas eliminadas por SS-423). La excepcion preserva el smoke documentado de transicion `Draft -> InReview` que hoy aporta el fixture Univalle. |
| 5 | **Preservar Term**: el dueno canonico es `academic-scheduling/seed/populate-terms.js` | `_data-syllabus.js` (que se retira) era el unico del mod que creaba "Primer/Segundo Semestre", y los 120 offerings los resuelven **por nombre**. Sin esto quedan sin periodo, en silencio. |
| 6 | **Re-apuntar lo que el paquete no reemplaza** a la data UPU: perfil de egreso, arbol de requisitos, caso `Minor` y Plan en estado `Draft` | Los cuatro quedarian huerfanos o arbitrarios al borrar UV. El perfil ademas hardcodea **tres** valores UV (`institutionCode` se resuelve ANTES del Plan, mas el narrative que nombra "Universidad del Valle"). |

**Riesgos principales y como los mitigamos**:

- **La suite queda en rojo** si se retiran fixtures sin resolver sus dependientes -> REQ-10 los resuelve **dentro** del ticket (retirar / actualizar / desacoplar) y S4.T6 exige la salida real de vitest en VERDE. Ojo con `fixtures-vs-seed.test.ts`: hace `readFileSync` del oraculo en el top-level, asi que borrar el e2e sin retirarlo revienta la carga de la suite.
- **Se pierde la verificacion runtime del seed** al retirar el e2e: los tests de integracion mockean prisma y delegaban explicitamente el "cargo realmente en DB" al e2e -> la capa 3 (S5.T1) se refuerza para confirmar **conteos renderizando** por el path real, no solo "se ve la pantalla".
- **Los offerings quedan sin Term** al retirar `_data-syllabus.js` (dependencia por nombre, no por FK) -> REQ-05/REQ-08: el retiro (S2.T3) ocurre DESPUES de garantizar los Term; se valida `Term=2` y `offerings sin periodo=0`.
- **Skip silencioso**: un loader que no resuelve una clave se salta la fila sin fallar -> conteos como totales exactos; cualquier numero por debajo es falla.
- **Perder cobertura de demo** (perfil, requisitos, `Minor`, Plan `Draft`, Activity en `Draft`) -> REQ-09 re-apunta perfil y requisitos; los tres fixtures restantes se **retiran** por no venir en el paquete (los dos primeros en S3, la Activity en `Draft` en S5) y su rama de loader queda vigilada por colecciones inyectables (`entries` en `loadCurricula`, `activities` en `loadMallas`). Retirar data de demo NO debe retirar la vigilancia de la funcionalidad.
- **Doc oficial contradictorio**: `docs/reference/seed-counts.md` documenta los conteos actuales y una query SQL que quedarian falsos -> REQ-11 lo actualiza (no solo el README).

**Que NO se hace en este ticket** (limites explicitos):

- **No se siembra historial dummy**: `_data-changelog.js` queda fuera (decision #3).
- No se crean `requirement` ni graduation profiles nuevos: los loaders existentes se **re-apuntan**, no se amplian. El alta real va por UI/MCP (UPONE-1378/1379).
- No se integran servicios `ServiceOffer`: dominio engagement (uengagement).
- **No se revive ni se reescribe el runner llm-e2e**: se retira. Si en el futuro se quiere volver a tener e2e, es trabajo nuevo.
- **No se redisenan los tests que se conservan**: los de clase A se actualizan a los datos nuevos y los de clase B se desacoplan con fixtures inline. Lo que cada test verifica no cambia.
- No se toca la infraestructura del seed: `_data-rbac.js`, `_data-indexes.js` y los cleanups de layouts quedan intactos (no son data de prueba y el RBAC corre en todos los tenants).
- No se toca core (`object-manager`/`suite`/`layout`). Solo `mods/curriculum-design/`.
- No se regenera el schema ni se corren migraciones: el schema ya soporta todo lo que el seed escribe (confirmado en capa 1).

**Tamano estimado**: 5 sessions (S1-S5), aproximadamente 10-13h efectivas. La mas riesgosa es **S1** (swap atomico del nucleo). Retirar el e2e en vez de migrarlo elimino una session entera y la parte mas fragil del plan.

> **Nota de estimacion (DET-26)**: el ticket publica **3 SP**, estimados cuando el alcance era "integrar el paquete al lado de lo existente". Al pasar a **sustituir**, el design descubrio que la suite de tests (23 archivos) y dos docs oficiales dependen de los fixtures que se retiran. El alcance real esta en el orden de **8-13 SP**. El dev decidio absorberlo en este ticket (2026-07-30) en vez de partirlo, para no dejar la suite en rojo. El `executed` se registra en el gate final con su metodo.

**Como vas a saber que funciona**:

- Reseteo el tenant UPU, corro el sync (fase 8), y la BD queda **solo** con el universo UPU: AcademicProgram 20, Curriculum 20 (espejo del paquete: todos Plan Active), Activity 301, planEntry 549, curricularSection 374, ActivityLine 12, offering 120. Cero rastros de UV/AIEP.
- Abro un programa de asignatura del mesh (ej. `C-CALCULOI-001`) y la columna "Unidad Organizativa" NO esta vacia, el estado es `Active`, y tiene secciones de syllabus.
- Los 120 offerings tienen periodo asignado.
- El perfil de egreso y el arbol de requisitos aparecen colgados de la data UPU, y el plan en borrador sigue existiendo para probar el flujo electivo.
- **La suite corre en verde** (`npm test`), ya sin `tests/llm-e2e/`, y si toco un dato del seed los tests de clase B siguen pasando.
- `docs/reference/seed-counts.md` y el resto de la doc describen los conteos reales nuevos y ya no mencionan el e2e.
- Corro el seed 2 veces y los conteos no cambian; con un tenant != UPU el seed hace skip pero los roles del mod siguen existiendo.

---

## Purpose

Sustituir la data de demo de `curriculum-design` por el paquete PM #097 rev.2 (universo UPU-MAIN, casos reales de clientes), retirando los fixtures de prueba UV/AIEP, aplicando el fix P5 (workflow), excluyendo el loader de historial, re-apuntando a la data UPU los artefactos de demo que el paquete no reemplaza, y **migrando la suite de tests y la documentacion que dependian de los fixtures retirados**. Actor: el equipo (data de demo reproducible y realista); destino: tenant UPU (`uplanner_upu`).

## Requirements

### REQ-01: Sustituir la data del nucleo por la del paquete

> **Que cambia**: los arrays de datos dejan de tener las 5 carreras y los planes ficticios de UV/AIEP y pasan a tener las 20 carreras y 20 planes UPU del paquete; entran los loaders nuevos de malla amplia y secciones de syllabus.
> **Por que**: la data de prueba se reemplaza por data basada en casos reales de clientes, y deja de competir con ella en la misma BD.

El sistema MUST sustituir el contenido del array `PROGRAMS` de `_data-academicprogram.js` por las 20 entradas de `programs.array.js` y el de `CURRICULA` de `_data-curriculum.js` por las 20 entradas de `curricula.array.js` (preservando el caso `Minor` y el Plan `Draft` segun REQ-09), y MUST integrar los loaders nuevos `_data-mesh.js` (`loadMallas`) y `_data-syllabus-sections.js` (`loadSyllabusSections`), registrados en `seed()` en el orden `loadAcademicPrograms -> loadCurricula -> loadMallas -> loadSyllabusSections -> loadCourseOfferings`, de forma idempotente y con guard de tenant UPU.

**Actor**: system (seed via sync fase 8)
**Layers**: backend, database, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: reseed produce solo el universo UPU
- **GIVEN** tenant UPU reseteado, con seed core (institution UPU-MAIN) aplicado
- **WHEN** se corre el sync fase 8
- **THEN** DB tiene AcademicProgram=20, Curriculum=20 (todos Plan Active — espejo del paquete), rt__Plan=20, Activity=301, requirementCategory=80, planEntry=549, curricularSection=374
- **AND** no existe ninguna fila con codigos `UV-*` ni `AIEP-*`

#### Scenario: idempotencia
- **GIVEN** el seed ya corrio una vez
- **WHEN** se corre por segunda vez
- **THEN** los conteos no cambian (find-or-create por clave natural)

#### Scenario: guard de tenant
- **GIVEN** un tenant != UPU
- **WHEN** se corre el seed
- **THEN** los loaders de data hacen skip; `ensureCurriculumModRbac` si corre (4 roles presentes)

#### Scenario: institution ausente
- **GIVEN** un tenant UPU sin la institution `UPU-MAIN` del seed core
- **WHEN** corren los loaders del paquete
- **THEN** retornan `skipped` con reason explicita (no crashean)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: resetea UPU, corre el sync, y en la UI ve las 20 carreras UPU y sus planes; abre una malla y ve los planEntry por periodo. No aparece nada de Univalle ni AIEP.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | totales exactos | UPU reseteado | sync fase 8 | conteos en DB | AP=20, Curr=20, rt__Plan=20, Activity=301, reqCat=80, planEntry=549, section=374 |
| 2 | sin residuos de prueba | seed corrido | buscar codigos UV-*/AIEP-* | filas | 0 |
| 3 | idempotencia | seed corrido 1x | correr 2x | re-contar | mismos numeros |
| 4 | guard tenant | tenant DEMO | correr seed | filas de data nuevas / roles del mod | 0 / 4 |

### REQ-02: Poblar `Activity.executionUnitId` con Faculty real

> **Que cambia**: cada Activity del mesh queda anclada a la Faculty `UPU-FAC-ING` en la columna "Unidad Organizativa", que quedaria vacia.
> **Por que**: el lookup original apuntaba a `AcademicExecution` (inexistente); rev.2 lo resolvio a un Faculty real.

El sistema MUST poblar `executionUnitId` con la Faculty `UPU-FAC-ING` (find-or-create, recordType Faculty) en **todas las Activities que este seed crea**.

> **Alcance verificado en BD (S1.T9)**: son **300 de las 301** del mesh. `RED109` la siembra otro mod antes en el orden inter-mod, y el guard de idempotencia `if (!act) create` la salta, asi que conserva el estado que le dio ese mod (sin `executionUnitId`, sin `versionLabel`). Es la misma clase de dependencia inter-mod que REQ-08 (los Term). Se declara como excepcion en vez de clobbear data ajena: otros mods son read-only en este ticket.

**Actor**: system
**Layers**: backend, database

#### Acceptance
**El usuario puede verificar que funciona**: abre un programa de asignatura del mesh y la columna "Unidad Organizativa" NO esta vacia.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | executionUnit poblado | mesh cargado | query DB acotado a `versionLabel='v2026-actual'` | Activity creada por el seed sin executionUnitId | 0 (de 300) |
| 2 | colision inter-mod declarada | mesh cargado | canario `versionLabel<>'v2026-actual'` | codes colisionados | 1 (`RED109`, declarado) |

### REQ-03: Integrar offerings y ActivityLine regeneradas contra el mesh

> **Que cambia**: se cargan 12 lineas de formacion y 120 offerings, cada linea anclada a una Faculty (UPU-FAC-CIE / UPU-FAC-ING).
> **Por que**: rev.2 regenero offerings/ActivityLine contra el mesh real (antes apuntaban a 12 asignaturas curadas fuera de la malla; solo 2 de 18 lineas cargaban).

El sistema MUST integrar `_data-offerings.js` (`loadCourseOfferings`) despues de las secciones, creando las 2 Faculties (find-or-create) y resolviendo `ActivityLine.orgUnitId` (NOT NULL) siempre, con `console.warn` cuando algo no resuelve.

**Actor**: system
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: lineas ancladas a orgUnit
- **GIVEN** el mesh y las Faculties cargados
- **WHEN** corre loadCourseOfferings
- **THEN** ActivityLine=12 (todas con orgUnitId not null), offering=120, OrgUnit Faculty CIE/ING=2

#### Scenario: orgUnit faltante
- **GIVEN** una linea cuyo orgUnit no resuelve
- **WHEN** corre el loader
- **THEN** emite console.warn (no salto silencioso) y no deja orgUnitId null

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre las lineas de formacion y ve las 12 con su unidad organizativa (CIE/ING).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | conteos offerings | mesh cargado | correr loader | filas | ActivityLine=12, offering=120, Faculty=2 |
| 2 | orgUnit not null | offerings cargadas | query DB | ActivityLine con orgUnitId null | 0 |

### REQ-04: Reconciliacion del paquete contra el schema de develop

> **Que cambia**: antes de correr el seed se confirma que el schema actual soporta cada campo y relacion que los loaders escriben.
> **Por que**: el paquete se genero contra un checkout que pudo divergir; un campo renombrado haria fallar el seed en runtime.

El sistema MUST validar (capa 1 del plan de validacion) que existen los objetos y campos destino y que NO existen los eliminados (workflow/changeLog), ANTES de ejecutar cualquier loader.

**Actor**: system / reviewer
**Layers**: database, config

#### Acceptance
**El usuario puede verificar que funciona**: el grep sobre `schema.prisma` del tenant confirma que `executionUnitId` y el enum `status` con `Active` existen, y que `workflowId`/`currentStatusId`/`ChangeLog` no.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | campos presentes | schema UPU | grep | executionUnitId, ActivityStatus con Active y Draft | presentes |
| 2 | objetos retirados ausentes | schema UPU | grep | workflowId, currentStatusId, model Workflow/WorkflowStatus/ChangeLog | 0 lineas |

### REQ-05: Fix P5 - quitar workflow de `_data-mesh.js`, con `status` explicito

> **Que cambia**: el loader del mesh deja de buscar el workflow `activity-standard`/`PUB` y de setear `workflowId`/`currentStatusId`; setea `Activity.status` **explicito**, y las 301 quedan `Active`.
> **Por que**: SS-423 elimino esas columnas y el subsistema workflow (TICKET-114); sin el fix el seed crashea. El `status` explicito es obligatorio porque el default del schema es `Draft`: omitirlo dejaria toda la demo en borrador.

> **Revision en S5 (decision del dev)**: la version aprobada de este REQ designaba **una** Activity en `Draft` para preservar el smoke de transicion. Se verifico que el paquete PM #097 rev.2 **no trae el campo `status` en ninguna de sus 301 entries** (todas son asignaturas vigentes de clientes), asi que esa designacion era un **fixture inventado**, de la misma clase que el `Minor` y el Plan `Draft` ya retirados por REQ-09. Se retira: el array queda espejo exacto del paquete. La rama de loader que la designacion ejercitaba queda vigilada por test inyectado (ver abajo); el smoke **manual** de transicion pierde su data, y eso se registra como perdida aceptada.

El sistema MUST eliminar del loader `_data-mesh.js` el lookup de `workflow`/`workflowStatus` y el set de `workflowId`/`currentStatusId`, reemplazandolos por un `status` explicito en el `create` de Activity (remap PUB->Active; el seed usa `prisma.activity.create` raw, asi que no dispara `enforceEnumTransitions`; sin `status` explicito cae al default `Draft`). El sistema MUST derivar ese valor de la entrada (`a.status || 'Active'`) y NO MUST designar ninguna Activity en un estado distinto de `Active`: la data sembrada es espejo del paquete. El sistema MUST mantener `activities` inyectable en `loadMallas` para que la rama `status != 'Active'` siga bajo test sin fixtures en el seed.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed no crashea
- **GIVEN** schema de develop (sin workflow/currentStatus)
- **WHEN** corre loadMallas
- **THEN** completa sin error de columna o modelo inexistente

#### Scenario: estados correctos
- **GIVEN** el fix aplicado y la data del paquete (sin campo `status`)
- **WHEN** se crean las Activities
- **THEN** las 301 quedan `Active`; ninguna con status null y ninguna en `Draft`

#### Scenario: la rama de estado no-Active sigue vigilada
- **GIVEN** una entrada inyectada en `loadMallas` con `status: 'Draft'`
- **WHEN** corre el loader
- **THEN** la persiste tal cual, sin forzarla a `Active` (verificado por mutacion: hardcodear `status: 'Active'` hace fallar el test)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el seed corre sin crash y los programas de asignatura aparecen todos `Active`, con su unidad organizativa poblada.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | sin status null | fix aplicado | query DB | Activity con status null | 0 |
| 2 | reparto de estados | fix aplicado | count por status del canario | Active / Draft | 301 / 0 |
| 3 | rama no-Active vigilada | entrada inyectada con `status: 'Draft'` | corre loadMallas | status persistido | `Draft` |

### REQ-06: Excluir el loader de historial (`_data-changelog.js` fuera del seed)

> **Que cambia**: el loader de historial NO se copia al mod y `loadChangeLog` NO se registra. `core_DataLog` no recibe filas del seed.
> **Por que**: `core_DataLog` es un log de auditoria que debe poblarse con las acciones reales de la plataforma. Sembrar historial dummy chocaria ademas con BUG-006 (accesor `prisma.dataLog` obsoleto vs `prisma.core_DataLog`) y BUG-008 (el visor referencia el nombre viejo `DataLog` -> RBAC default-deny).

El sistema MUST NO integrar `_data-changelog.js` ni registrar `loadChangeLog`. La verificacion MUST confirmar que `core_DataLog` no recibe filas provenientes del seed.

**Actor**: system
**Layers**: backend, config

#### Acceptance
**El usuario puede verificar que funciona**: tras el reseed, `seed.js` no importa ni llama `loadChangeLog`, y `core_DataLog` no tiene filas atribuibles al seed.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | loader excluido | seed integrado | grep en seed/ | refs a `loadChangeLog` / `_data-changelog` | 0 |
| 2 | core_DataLog sin seed | reseed limpio | count core_DataLog atribuible al seed | filas | 0 |

### REQ-07: Retirar los loaders de data de prueba y su codigo huerfano

> **Que cambia**: se eliminan `_data-univalle.js`, `_data-aiep.js`, `_data-malla.js`, `_data-syllabus.js` y tambien `_cleanup.js`, con sus imports y llamadas.
> **Por que**: son los fixtures ficticios que el paquete rev.2 reemplaza. `_cleanup.js` (`cleanupProgramSections`) queda sin ningun consumidor: **verificado que sus dos unicos callers son `_data-univalle.js:196` y `_data-aiep.js:185`**, y ningun loader nuevo del paquete lo importa.

El sistema MUST retirar esos cinco archivos y su registro en `seed()`, PREVIO inventario de consumidores. El sistema MUST NO tocar la infraestructura del seed (`_data-rbac.js`, `_data-indexes.js`, los cleanups de layouts), que no es data de prueba y corre en todos los tenants.

**Actor**: system
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: inventario en dos direcciones
- **GIVEN** los loaders a retirar
- **WHEN** se audita el impacto
- **THEN** se reportan (a) quien consume los loaders que se van y (b) que dependencias quedan huerfanas POR el borrado (el caso `_cleanup.js`)

#### Scenario: infraestructura intacta
- **GIVEN** el retiro aplicado
- **WHEN** corre el seed en un tenant != UPU
- **THEN** `ensureCurriculumModRbac` sigue corriendo (4 roles) y el seed hace skip de la data

#### Scenario: sin residuos
- **GIVEN** el retiro aplicado
- **WHEN** se resetea y reseedea UPU
- **THEN** no hay filas con codigos `UV-*`/`AIEP-*` ni instituciones UV/AIEP creadas por el mod

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `seed.js` no importa esos loaders, los archivos no existen, y tras el reseed la BD no tiene rastros de UV/AIEP. Los roles del mod siguen existiendo en todos los tenants.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | loaders retirados | retiro aplicado | grep loadUnivalle/loadAiep/loadMalla/loadSyllabusOfferings/cleanupProgramSections | refs en el mod | 0 |
| 2 | RBAC preservado | tenant no-UPU | correr seed | roles curriculares | 4 presentes |

### REQ-08: Preservar los Term que los offerings resuelven por nombre

> **Que cambia**: los 120 offerings siguen encontrando "Primer Semestre" y "Segundo Semestre" aunque se retire `_data-syllabus.js`, que era el unico del mod que los creaba.
> **Por que**: `_data-offerings.js` resuelve el periodo **por nombre**; sin esos Term los 120 offerings quedan sin periodo y el skip es silencioso.

El sistema MUST garantizar que los Term "Primer Semestre" y "Segundo Semestre" (2026) existan antes de `loadCourseOfferings`. El dueno canonico es `academic-scheduling/seed/populate-terms.js` (crea esos mismos nombres y el mod no esta en `ignoredMods`); si el orden de ejecucion entre mods no lo garantiza, el sistema MUST trasladar el bloque `TERMS` (find-or-create defensivo) al loader de offerings.

**Actor**: system
**Layers**: backend, database, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: Term disponible por academic-scheduling
- **GIVEN** el seed de academic-scheduling corre antes que el de curriculum-design
- **WHEN** corre loadCourseOfferings
- **THEN** los 120 offerings resuelven su termName; Term=2 en DB

#### Scenario: orden no garantizado
- **GIVEN** que el orden inter-mod no asegura academic-scheduling primero
- **WHEN** se aplica la mitigacion
- **THEN** el loader de offerings crea los Term de forma defensiva y los offerings resuelven igual

#### Scenario: deteccion de la falla
- **GIVEN** un reseed
- **WHEN** se cuentan los offerings sin periodo
- **THEN** son 0 (si fueran >0 la validacion falla: es el skip silencioso)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre las secciones de una asignatura y cada una muestra su periodo (2026-1 / 2026-2), no vacio.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Term presentes | reseed | count Term por nombre | Primer/Segundo Semestre | 2 |
| 2 | offerings con periodo | reseed | offerings con termId null | filas | 0 |

### REQ-09: Re-apuntar a la data UPU lo que el paquete no reemplaza

> **Que cambia**: el perfil de egreso y el arbol de requisitos dejan de colgar de la data ficticia UV y pasan a colgar de la data UPU real, anclados por code. Los dos fixtures que sobrevivian dentro del array de Curriculum (`recordType: 'Minor'` y el Plan en `status: 'Draft'`) se **retiran**: el array queda como espejo exacto del paquete.
> **Por que**: el paquete excluye el perfil y el arbol por diseno, y al borrar UV quedaban huerfanos. Los dos fixtures del array, en cambio, no vienen del paquete, y el criterio del dev es que la data del mod sea la que entrega el PM.

> **REVISION DE ALCANCE (decision del dev, 2026-07-30, durante S3).** La version original de este REQ preservaba el `Minor` y el Plan `Draft` re-apuntados. Se cambio a **retirarlos**: el paquete trae 20 entradas, todas `Plan`/`Active`, y la data del mod debe ser la del PM. Lo que NO cambio: el perfil de egreso y el arbol de requisitos SI se re-apuntan (el paquete los excluye por diseno, no son fixtures redundantes).

El sistema MUST:

**(a) `_data-graduation-profile.js`** — el objeto `PROFILE` tiene **tres** valores atados a UV que hay que cambiar juntos (verificado en el codigo, no basta con el Plan):
   1. `institutionCode: 'UV'` -> `'UPU-MAIN'`. **El loader resuelve la institution ANTES del Plan**, asi que si solo se corrige el Plan retorna `skipped: institution UV no encontrada`.
   2. `curriculumCode: 'UV-ICIV-PLAN-2026'` -> `'UPU-ICIV-PLAN-2026'`.
   3. El texto de `narrative.narrativeIntro` menciona literalmente "egresado de la **Universidad del Valle**": adecuarlo.

**(b) `_data-requirement.js`** — reemplazar los lookups genericos por anclajes **por code**, mas deterministas que el `orderBy: {id:'asc'}` anterior (no dependen del orden de insercion) y por lo tanto mas alineados con RULE-curriculum-design-022:
   - arbol EST200: owner = la Activity `C-ESTADISTIC-107` ("Estadistica", coherente con el label), en vez de `Activity.findFirst({recordType:'Course'}, orderBy id)`.
   - bloque electivo: **UN** Plan fijado por code (`UPU-ICIV-PLAN-2026`), en vez de sembrarse en CADA Plan — con los 20 del paquete eso daba 20 bloques.
   - actualizar el comentario stale de la linea 103.

**(c) RETIRAR del array `CURRICULA`** las dos entradas que no vienen del paquete: la de `recordType: 'Minor'` y la del Plan en `status: 'Draft'`.

**(d) Preservar la VIGILANCIA de las ramas que esa data ya no ejercita.** Retirar data de demo NO debe retirar la cobertura de la funcionalidad: `loadCurricula` MUST aceptar un parametro `entries = CURRICULA` inyectable, y los tests MUST cubrir con entradas propias el `recordType: 'Minor'` (owner=Institution, sin satelite `rt__Plan`), el `status: 'Draft'`, el caso program-owned (owner=AcademicProgram con satelite) y el skip por institution ausente.

> **PERDIDAS ACEPTADAS Y DECLARADAS** (documentadas inline en `_data-curriculum.js` y en `seed/README.md`):
> 1. Ya no hay data de demo de `recordType: 'Minor'`. La ruta polimorfica `owner=Institution` de RULE-013 SI queda cubierta: los 20 planes del paquete tambien cuelgan de Institution.
> 2. **Ningun Curriculum queda en `status: 'Draft'`**. Como la malla solo es editable en Draft (gate MC-05), la demo de **editar** una malla (MC-06 / UPONE-1349) deja de ser posible con este seed.
> 3. El perfil de egreso y el bloque electivo ahora comparten el **mismo** Plan owner (`UPU-ICIV-PLAN-2026`); antes vivian en Planes distintos (el perfil en 2026, el electivo en el Draft 2027). No es un bug, es consecuencia de fijar el electivo a un Plan concreto sin Draft disponible.
> Reintroducir cualquiera de las tres es trabajo nuevo.

> **Patron transversal (barrido en S3.T1)**: grep de `UV`/`AIEP`/"Universidad del Valle" sobre todo `seed/`. Resultado final: **0 residuos no declarados** (los hits restantes son comentarios que documentan el retiro). El barrido encontro 4 residuos stale extra que no estaban en el plan: `seed.js:110` y `:120`, el docstring de `_data-requirement.js:17` que referenciaba el archivo borrado `_data-univalle.js`, y un comentario del paquete en `_data-offerings.js:146-148`.

**Actor**: system
**Layers**: backend, database, tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: perfil de egreso re-apuntado
- **GIVEN** el Plan `UPU-ICIV-PLAN-2026` sembrado por el paquete
- **WHEN** corre loadGraduationProfile
- **THEN** crea el perfil colgado de ese Plan (no `skipped` por institution ni por curriculo ausente)
- **AND** el narrative no menciona "Universidad del Valle"

#### Scenario: arbol de requisitos deterministico por code
- **GIVEN** las 301 Activities del mesh
- **WHEN** corre loadRequirement dos veces
- **THEN** el arbol EST200 queda colgado de `C-ESTADISTIC-107` ambas veces
- **AND** existe exactamente 1 Plan con bloque electivo, y es `UPU-ICIV-PLAN-2026`

#### Scenario: array como espejo del paquete
- **GIVEN** el array CURRICULA sustituido y los fixtures retirados
- **WHEN** corre loadCurricula
- **THEN** existen 20 Curriculum, todos `recordType: 'Plan'` y `status: 'Active'`, todos con owner Institution
- **AND** 0 con recordType `Minor` y 0 con status `Draft`

#### Scenario: la vigilancia sobrevive al retiro de la data
- **GIVEN** que ninguna entrada del array es `Minor` ni `Draft`
- **WHEN** se rompe la resolucion de owner del `Minor` o el manejo del `status`
- **THEN** los tests del describe "capacidades vigiladas sin data" fallan (la cobertura no depende de que la data de demo la ejercite)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el Plan de Ingenieria Civil UPU y ve su perfil de egreso; abre `C-ESTADISTIC-107` y ve el arbol de requisitos; el listado de planes muestra 20, todos activos. Y si rompe la rama del `Minor` en el loader, la suite se lo dice aunque no haya ningun Minor sembrado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | perfil no huerfano | reseed | count graduation profile | filas | 1 (no 0) |
| 2 | perfil en el Plan correcto | reseed | owner del perfil | code del Curriculum | UPU-ICIV-PLAN-2026 |
| 3 | arbol anclado por code | reseed | owner del arbol EST200 | code de la Activity | C-ESTADISTIC-107 |
| 4 | electivo en 1 solo Plan | reseed | Plans con bloque electivo | filas / code | 1 / UPU-ICIV-PLAN-2026 |
| 5 | espejo del paquete | reseed | Curriculum UPU-* / Minor / Draft | filas | 20 / 0 / 0 |
| 6 | vigilancia sin data | suite | romper la rama del Minor | tests fallidos | >=1 |
| 7 | sin residuos UV | reseed | grep UV/AIEP en seed/ | hits no declarados | 0 |

### REQ-10: Retirar los llm-e2e y desacoplar la suite del seed

> **Que cambia**: `tests/llm-e2e/` se elimina completo. De los tests de integracion que dependian de los fixtures, los que tienen al seed como **sujeto** se actualizan, los que solo lo usaban como **fixture ambiental** se desacoplan con datos inline, y los que pierden su sujeto se retiran.
> **Por que**: los llm-e2e no corren en CI (el unico script es `vitest run`, que no toma `.md`), su ultima corrida registrada es del **2026-05-07** y no se tocan desde el 20 de mayo, mientras la suite vitest sigue viva. Las features que cubrian tienen cobertura en los 59 archivos vitest del mod. Y desacoplar es mejor que re-apuntar: saca a esos tests del radio de **cualquier** cambio futuro del seed, en vez de mudarles el acoplamiento.

**(a) Retirar** (`tests/llm-e2e/` completo + 1 test que pierde su sujeto):

| Archivo | Por que se retira |
|---|---|
| `tests/llm-e2e/` (arbol completo: 22 escenarios, `fixtures/` con 3 archivos — `seed-uv.json`, `seed-aiep.json` y `expected-tabs.json` —, `README.md`, `runner-instructions.md`, `result.md`; 28 archivos en total) | No corre en CI, sin ejecutar desde 2026-05-07 |

> **Evidencia correcta de que no corre en CI** (el dual-judge de S4 refuto la primera version del argumento). El "delta cero" del conteo de tests **NO prueba** nada por si solo: era una **tautologia**, porque el `include` de `vitest.config.ts` (`tests/**/*.test.{js,ts}`, `*.spec.{js,ts}`) nunca matcheo `.md`/`.json`, asi que el conteo estaba *estructuralmente garantizado* a quedar plano existiera o no el directorio. La evidencia que si sostiene la conclusion es: **ninguno de los 4 `bitbucket-pipelines.yml` del monorepo referencia `llm-e2e`**, ningun script de npm lo ejecuta (el unico del mod es `vitest run`), y `result.md` fecha la ultima corrida el 2026-05-07.

> **CORRECCION de la justificacion (hallazgo del dual-judge de S4).** Decir que "las features cubiertas tienen cobertura en vitest" era **optimista**. Verificado feature por feature: reorder/posicion SI (`build-payloads.test.ts`, `recalcPeriodPosition.logic.spec.ts`), navegacion por teclado SI (`useTreeKeyboardNav.test.ts`, 30 tests). Pero **cuatro NO tienen equivalente automatizado**: el gesto de **drag real** (mouse/DOM), el **cambio de tabs end-to-end** sobre un componente montado, el **stress de datasets grandes**, y el escenario **`coexistence-no-core-data`** (aislamiento por query de la data del seed core), que no tiene equivalente en ningun test del mod. Ademas, tres tests declaran EXPLICITAMENTE que reservan su verificacion al nivel e2e: `aria-attrs.test.ts:13` y `activity-status-badge-a11y.test.ts:14` excluyen el SFC raiz (contexto de Vueform) y `dialog-behavior.test.ts:81` difiere el foco real del Tab.

> **Framing correcto**: NO es "no se pierde cobertura". Es **"la cobertura de logica queda en vitest; la de runtime/rendering se pierde"** — y ya estaba de facto ausente de CI desde el 2026-05-07. S4 deja de simular que existia; S5.T1 (smoke de capa 3) recupera parte por verificacion manual, no automatizada. Matiz que lo vuelve aceptable y no una regresion de este ticket: el runner llevaba sin correr desde el 2026-05-07, asi que esa cobertura ya estaba **de facto ausente de CI** antes de S4. Lo que S4 hace es dejar de simular que existe. Reintroducirla es trabajo nuevo.
| `tests/integration/fixtures-vs-seed.test.ts` | Su UNICO sujeto es mantener sincronizados los fixtures del e2e con el seed. Ademas hace `readFileSync` de `../llm-e2e/fixtures/*.json` en el top-level (lineas 23-24): con el directorio borrado **explota al cargar el modulo** |

> **Leccion del design, aplicable a S4.T1**: la clasificacion MUST hacerse **leyendo los imports de cada test**, nunca por su nombre. Este spec cometio ese error con `cleanup-seeds.test.ts` (fila tachada arriba) y lo detecto un juez independiente, no el barrido.
| ~~`tests/integration/cleanup-seeds.test.ts`~~ | **NO se retira (correccion del design)**: se clasifico por su NOMBRE sin leerlo. Verificado que importa `_data-layouts-pascalcase-cleanup.js` y `-v2.js` (0 menciones de `_cleanup.js`), o sea cubre la **infraestructura que REQ-07 declara INTACTA**. Retirarlo habria dropeado esa cobertura en silencio (`npm test` verde con una suite menos no da senal). Veredicto: **conservar sin cambios** |

**(b) Actualizar — clase A: el seed ES su sujeto** (no se pueden desacoplar, eso es lo que prueban):

| Archivo | Que ajustar |
|---|---|
| `tests/integration/seed-counts.test.ts` | Conteos y institution esperados (hoy assertea `'Universidad del Valle'` y `country: 'CO'`). Es mock-based: verifica que el seed **intenta** cargar N, no que cargue |
| `tests/integration/seed-entry.test.ts` | Loaders registrados y orden de `seed()` |

**(c) Desacoplar — clase B: solo usaban data con forma de seed como fixture ambiental**. El sistema MUST darles fixtures **inline** (no re-apuntarlos a codigos UPU), de modo que dejen de depender del seed:

`tests/integration/curriculum-lineage.test.ts`, `composable-buildTree.test.ts`, `build-payloads.test.ts`, `composite-section-form.test.ts`, `use-composite-section-tree.test.ts` (los tres ultimos usan `ownerId: 'uv-1'`, un id de mock). Ademas `rich-text-renderer.test.ts:13` cita el nombre de un escenario que desaparece: actualizar el comentario.

Y `modsComponents/CompositeSectionTree/validateWeightedSum.spec.ts` (lineas 166/181) tiene tests nombrados `'seed Univalle: ...'` con data inline: SHOULD renombrarse (ya esta desacoplado, solo miente el nombre).

> **Consecuencia importante que REQ-05/S5 deben absorber**: el docstring de `seed-counts.test.ts` dice que valida que el seed *"INTENTA cargar las cantidades correctas — el 'cargo realmente en DB' lo cubre el e2e"*. Los 9 tests de integracion **mockean prisma**. Al retirar el e2e, la unica verificacion de que el seed carga **de verdad** pasa a ser la capa 3 (S5.T1), que por eso MUST cubrir explicitamente los conteos renderizando por el path real del usuario. Sin eso quedariamos con tests mockeados que consagran bugs de runtime.

**Actor**: dev / CI
**Layers**: tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: suite en verde sin el e2e
- **GIVEN** `tests/llm-e2e/` eliminado y los 3 retiros aplicados
- **WHEN** se corre `npm test` (vitest) del mod
- **THEN** pasa completa; ninguna suite falla por modulo o fixture inexistente

#### Scenario: clase B ya no depende del seed
- **GIVEN** los 5 tests de clase B desacoplados
- **WHEN** se cambia cualquier dato del seed
- **THEN** esos tests siguen pasando sin tocarlos (fixtures inline)

#### Scenario: clase A refleja el seed nuevo
- **GIVEN** `seed-counts.test.ts` actualizado
- **WHEN** se corre
- **THEN** sus conteos coinciden con la tabla de Artifacts y la institution esperada es UPU-MAIN

#### Scenario: sin modulos rotos por el borrado
- **GIVEN** `tests/llm-e2e/` eliminado
- **WHEN** vitest carga la suite
- **THEN** ningun test hace `readFileSync`/import de rutas bajo `llm-e2e/` (el caso de `fixtures-vs-seed.test.ts`, ya retirado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `npm test` del mod y pasa en verde; `tests/llm-e2e/` ya no existe; y si toca un dato del seed, los tests de clase B siguen pasando.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | suite verde | retiros + updates + desacoples | `npm test` | suites fallidas | 0 |
| 2 | e2e eliminado | retiro aplicado | `ls tests/llm-e2e` | directorio | no existe |
| 3 | clase B independiente | desacople hecho | cambiar un dato del seed y correr | tests de clase B fallidos | 0 |
| 4 | clase A alineada | seed-counts actualizado | correr | assertions vs tabla de conteos | coinciden |

### REQ-11: Actualizar la documentacion oficial que describe el seed

> **Que cambia**: `docs/reference/seed-counts.md` y `seed/README.md` describen los conteos, loaders y query de verificacion reales post-sustitucion.
> **Por que**: `seed-counts.md` es un contrato de verificacion post-deploy (audience dev-mod / on-call / qa) que hoy documenta Activity=3, AcademicProgram=5, Curriculum=2, ActivityLine=1 y una query SQL. Todos esos numeros quedan falsos con la sustitucion.

El sistema MUST actualizar `docs/reference/seed-counts.md` y `seed/README.md` (inventario de loaders, orden de carga, conteos, query de verificacion, guard, retiro de fixtures, exclusion del historial, dependencia de Term con `academic-scheduling`).

El sistema MUST ADEMAS barrer el resto de la documentacion del mod que describe la data retirada con codigos o numeros concretos. Verificado por grep en design (**minimo, no lista cerrada**):

| Doc | Que queda falso |
|---|---|
| `docs/guides/seed-data.md` | describe los datasets "UV + AIEP" |
| `docs/architecture/academic-program.md` | "5 programas: 3 UV + 2 AIEP" |
| `docs/architecture/curriculum-plan-minor.md:77` | **doblemente falso tras S3**: dice que `loadCurricula` siembra "2 registros: 1 Plan (`UV-ICIV-PLAN-2026`, owner=AcademicProgram) + 1 Minor (`UV-MINOR-MAT-2026`, owner=Institution)". Hoy siembra 20, todos Plan y todos owner=Institution, y el recordType `Minor` ya no se siembra. No alcanza con cambiar los codes: hay que rehacer la descripcion y aclarar que el loader **sigue soportando** `Minor` (vigilado por test) aunque no haya data de demo |
| `docs/architecture/syllabus-offering.md` | referencia `_data-syllabus.js`, que se retira (**hallado por el inventario de S1.T2, no estaba en esta tabla**) |
| `docs/guides/testing.md` | **caso mas grave**: no solo referencia los fixtures (`seed-uv.json`/`seed-aiep.json`), sino que documenta llm-e2e como un **nivel de la estrategia de testing** (fila de tabla en :30, arbol en :59, y una seccion entera *"Cuando usar llm-e2e vs integration"* en :671-685 con regla prescriptiva, mas anti-patterns en :716). Al retirar el nivel, el doc MUST dejar de prescribirlo |
| `docs/guides/creating-vueform-element.md:653` | **le indica al dev crear escenarios e2e** para elementos nuevos (`tests/llm-e2e/scenarios/my-element-scenario.md`). Apunta a infraestructura que deja de existir |
| `docs/guides/composite-section-tree.md:166,246` | cita escenarios concretos como la validacion runtime de esa feature (`edit-evaluation-tree-weight`, `create-evaluation-component`, `reorder-evaluation-components`, `keyboard-nav-tree`) |
| `README.md:155,220` | describe los 22 escenarios y el runner en la estructura del mod |
| `docs/guides/INDEX.md` | referencias a los fixtures + tags `llm-e2e` |
| `docs/guides/color-picker.md:127`, `icon-picker.md:123`, `rich-text-renderer.md:86`, `.ai/TROUBLESHOOTING.md:123` | mencionan la metodologia "LLM-e2e" como practica de verificacion vigente |
| `tests/integration/aria-attrs.test.ts:13`, `activity-status-badge-a11y.test.ts:14`, `dialog-behavior.test.ts:81`, `lang-enums.test.ts:14` | comentarios que citan "LLM-e2e" como practica de verificacion (no son imports: la suite no se rompe, pero el comentario miente) |
| `modsComponents/CompositeSectionTree/useCompositeSectionTree.ts`, `useTreeKeyboardNav.ts` | **codigo fuente** con comentarios que referencian llm-e2e |
| `docs/guides/pascalcase-migration-guide.md` | cita `seed/_data-univalle.js` en un ejemplo de codigo bajo "Antes —". Es una **guia historica de migracion**: la referencia describe un estado pasado, asi que MAY conservarse declarandola como excepcion (documenta historia, no estado actual) en vez de reescribirse. Decidir en S5.T4. |
| `.ai/CONTEXT.md`, `.ai/TASKS.md` | contexto AI-optimizado del mod (categoria `.ai/` explicita en el CLAUDE.md de up1) |
| `README.md`, `CLAUDE.md` del mod | descripcion del seed y sus datasets |

> **Consecuencia declarada del retiro del e2e (REQ-10)**: la estrategia de testing del mod **pierde un nivel**. `docs/guides/testing.md` documenta que los flujos de drag-drop, modal anidado y keyboard chain multi-step requieren llm-e2e precisamente porque integration no alcanza. Al retirarlo, esos flujos quedan con cobertura **solo a nivel componente** (vitest). El sistema MUST declararlo explicitamente en `testing.md` en vez de borrar la seccion en silencio: el equipo tiene que saber que ese nivel ya no existe y que reintroducirlo es trabajo nuevo. No se mitiga en este ticket (esta fuera de su alcance); se documenta.

`objects/BibliographyReference.json:90` menciona "seed UV" dentro de un campo `description`. Es documentacion embebida en una definicion de objeto: **editarla obliga a re-correr codegen**. El sistema MAY corregirla (si se aprovecha otra corrida de codegen) o MUST declararla como excepcion aceptada en el registro de REQ-12, con la razon (costo de codegen > valor del texto).

**Actor**: dev
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: abre `docs/reference/seed-counts.md` y los numeros coinciden con lo que devuelve la query contra la BD real.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | doc coincide con BD | seed corrido | comparar doc vs query real | discrepancias | 0 |
| 2 | sin refs obsoletas | docs actualizados | grep UV/AIEP/loadMalla en docs del mod | hits no declarados | 0 |

### REQ-12: Inventario exhaustivo por enumeracion como criterio de cierre

> **Que cambia**: el criterio de "no quedan rastros de los fixtures retirados" no es ni una lista escrita a mano ni "este grep devuelve 0". Es **enumerar los directorios afectados y dar veredicto por cada archivo**.
> **Por que**: durante el design, tres rondas de revision independiente encontraron residuos que el mecanismo de deteccion vigente no veia. La progresion es la leccion: (1) listas cerradas dejaban archivos afuera; (2) el barrido por grep era case-sensitive; (3) incluso con `-i`, el patron `UV-` no matchea `seed-uv.json` (tiene "uv." no "uv-"), asi que 3 escenarios que referencian el oraculo seguian invisibles. **Ningun regex es confiable como criterio aca**; la enumeracion si, porque es exhaustiva por construccion.

El sistema MUST producir un inventario donde **cada archivo** de los siguientes conjuntos tenga un veredicto explicito (`migrar` / `no aplica` / `excepcion declarada con razon`):

**La enumeracion se define por RAIZ DE ARBOL y cubre el REPO COMPLETO del mod**, no una lista de directorios elegidos. Esta distincion importa: versiones previas de este REQ enumeraban subdirectorios nombrados y omitian primero `tests/stubs|unit|component` (31 archivos) y despues `scripts/`, `roles/`, `types/`, `logic/`, `css/`, `modsComposables/`, `.storybook/`, `.husky/`. Todos resultaron limpios, pero el criterio era incompleto por construccion **tres veces seguidas**. Enumerar el repo completo saca la decision del criterio de quien redacta.

| Conjunto | Archivos | Veredicto esperado |
|---|---:|---|
| **`tests/**`** (post-retiro del e2e) | ~68 | 33 integracion (2 actualizar, 5 desacoplar, 2 retirar, resto `no aplica`) + `unit/` 24, `stubs/` 4, `component/` 3 -> **verificado 0 refs en design** |
| **`docs/**`** | **51** | **13** actualizar (conteo real del inventario S1.T2; la estimacion previa de ~7 subestimaba), resto `no aplica` |
| **`.ai/**`** (4 archivos), `README.md`, `CLAUDE.md` del mod | 6 | **5** actualizar (solo `.ai/PATTERNS.md` limpio; `CLAUDE.md` del mod SI tiene hits) |
| **`objects/**`, `modsComponents/**`, `config/**`, `lang/**`, `capabilities.json`, `package.json`** | todos | 2 (1 objects json + 1 spec cosmetico) |
| **Resto del arbol del mod**: `scripts/`, `roles/`, `types/`, `logic/`, `css/`, `modsComposables/`, `.storybook/`, `.husky/`, config de raiz (`.gitignore`, `eslint.config.js`, `tsconfig.json`, `vueform.config.ts`) | todos | **verificado 0 refs en design** -> `no aplica`, pero queda constancia |

El veredicto de `no aplica` para un arbol entero es valido **si esta documentado**; lo que no es valido es que el arbol no aparezca.

**El grep es una AYUDA, no el criterio.** Patron de arranque (case-insensitive y con los tokens concretos del fixture, **declarado NO exhaustivo**):

```bash
grep -rilE "univalle|universidad del valle|aiep|seed-uv|UV-ICIV|UV-MINOR|UV-MMAT|UV-DCIE|SYL-CALC|TIR101|detail-uv|llm-e2e" \
  mods/curriculum-design | grep -v node_modules | grep -v '^mods/curriculum-design/coverage'
```

> **El token `llm-e2e` es obligatorio** (agregado tras el hallazgo de un juez): al retirar el directorio, **18 archivos fuera de el** quedan con referencias muertas (9 docs, 7 tests y **2 de codigo fuente**: `modsComponents/CompositeSectionTree/useCompositeSectionTree.ts` y `useTreeKeyboardNav.ts`). Sin el token el patron los perdia por completo. Es la **cuarta** vez que el mecanismo de deteccion tuvo un hueco: exactamente por eso el criterio es la enumeracion del repo y no el grep.

Con este patron el design conto **53 archivos** por data retirada, mas **18** por el token `llm-e2e`; con el patron anterior (case-sensitive, sin los tokens del oraculo) contaba 42, y con solo agregar `-i` contaba 51. Los tres numeros son distintos: es la evidencia de por que el grep no puede ser el criterio.

**Busqueda por artefacto retirado (verificacion positiva, complementaria)**: por CADA artefacto que se retira, buscar su token especifico y migrar a sus consumidores. Artefactos: `_data-univalle.js`, `_data-aiep.js`, `_data-malla.js`, `_data-syllabus.js`, `_cleanup.js` / `cleanupProgramSections`, `seed-uv.json`, `seed-aiep.json`, y los codigos `UV-*`, `AIEP-*`, `SYL-CALC*`, `TIR101`. Esto ataja el caso "el archivo no nombra el fixture pero depende de el".

**Falsos positivos ya identificados en design** (MUST declararse, no ignorarse):

| Hit | Por que |
|---|---|
| `tests/integration/build-payloads.test.ts`, `composite-section-form.test.ts`, `use-composite-section-tree.test.ts` | `ownerId: 'uv-1'` es id de mock, sin relacion con Universidad del Valle |
| `tests/integration/rich-text-renderer.test.ts:13` | comentario que cita el nombre del escenario `detail-uv-customsection-tab`; queda stale si S5 lo renombra (residuo blando) |
| `coverage/**` | artefacto generado y gitignored, no es residuo del mod versionado |

**Actor**: reviewer
**Layers**: tests, docs, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: inventario completo
- **GIVEN** los conjuntos enumerados arriba
- **WHEN** se cierra el inventario de S1.T2
- **THEN** cada archivo de cada conjunto tiene veredicto; ninguno sin clasificar

#### Scenario: el grep no alcanza pero la enumeracion si
- **GIVEN** un archivo que depende del fixture sin nombrarlo con los tokens del patron
- **WHEN** se clasifica su conjunto por enumeracion
- **THEN** el archivo igual recibe veredicto (la enumeracion no depende del patron)

#### Scenario: excepciones auditadas
- **GIVEN** hits que se conservan a proposito
- **WHEN** se cierra el ticket
- **THEN** cada uno esta en la tabla de excepciones del ticket con su razon

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la tabla de inventario del ticket y para cualquier archivo de `tests/`, `docs/` o `.ai/` del mod encuentra su veredicto. No hay archivos sin clasificar.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | cobertura del inventario | inventario cerrado | contar archivos clasificados vs total del repo del mod | sin veredicto | 0 |
| 2 | excepciones con razon | hay excepciones | leer la tabla del ticket | cada una con razon | si |
| 3 | consumidores por artefacto | artefactos retirados | grep por token de cada uno | consumidores sin migrar | 0 |

## Artifacts

### Destino de cada archivo (estado final)

| Archivo | Accion | REQ |
|---|---|---|
| `seed/_data-academicprogram.js` | **editar**: sustituir array `PROGRAMS` (5 UV/AIEP -> 20 UPU) | REQ-01 |
| `seed/_data-curriculum.js` | **editar**: sustituir array `CURRICULA` (20 Plan Active UPU + Plan Draft + Minor, re-apuntados) | REQ-01, REQ-09 |
| `seed/_data-mesh.js` | **copiar del paquete + editar** (fix P5 + la Activity designada en Draft) | REQ-01, REQ-02, REQ-05 |
| `seed/_data-syllabus-sections.js` | **copiar del paquete** | REQ-01 |
| `seed/_data-offerings.js` | **copiar del paquete** (+ bloque TERMS si REQ-08 lo exige) | REQ-03, REQ-08 |
| `seed/_data-graduation-profile.js` | **editar**: los 3 valores UV (`institutionCode`, `curriculumCode`, narrative) | REQ-09 |
| `seed/_data-requirement.js` | **editar**: asignatura concreta + bloque electivo en el Plan Draft; comentario linea 103 | REQ-09 |
| `seed/seed.js` | **editar**: nuevo orden; quitar los 4 retirados; no registrar `loadChangeLog` | REQ-01, REQ-06, REQ-07 |
| `seed/_data-univalle.js` | **eliminar** | REQ-07 |
| `seed/_data-aiep.js` | **eliminar** | REQ-07 |
| `seed/_data-malla.js` | **eliminar** | REQ-07 |
| `seed/_data-syllabus.js` | **eliminar** (tras resolver REQ-08) | REQ-07, REQ-08 |
| `seed/_cleanup.js` | **eliminar** (queda sin consumidores) | REQ-07 |
| `seed/_data-changelog.js` | **no copiar** | REQ-06 |
| `seed/_data-rbac.js`, `seed/_data-indexes.js`, `seed/_data-layouts-pascalcase-cleanup*.js` | **intactos** (infraestructura) | REQ-07 |
| `tests/llm-e2e/` (arbol completo: 22 escenarios + oraculo + docs del runner) | **eliminar** | REQ-10 |
| `tests/integration/fixtures-vs-seed.test.ts`, `cleanup-seeds.test.ts` | **retirar** (pierden su sujeto) | REQ-10 |
| `tests/integration/seed-counts.test.ts`, `seed-entry.test.ts` | **actualizar** (clase A: el seed es su sujeto) | REQ-10 |
| `tests/integration/` clase B (5 archivos) + `validateWeightedSum.spec.ts` | **desacoplar** con fixtures inline / renombrar | REQ-10 |
| `docs/reference/seed-counts.md`, `seed/README.md` + `docs/guides/*`, `docs/architecture/*`, `.ai/*`, `README.md`, `CLAUDE.md` del mod | **actualizar** segun el inventario | REQ-11 |

### Conteos esperados en BD (totales exactos post-sustitucion)

> **CORRECCION (verificada en BD, S1.T9)**: estos son los conteos de **nuestra data**, NO totales de tabla. El tenant UPU contiene data de otros mods (CALDEMO, SVC, academic-scheduling). Validar SIEMPRE acotado por prefijo de code. La tabla de secciones es `CurricularSection`, no `Section`.

| Objeto (acotado a nuestra data) | Total | Fuente |
|---|---:|---|
| AcademicProgram | 20 | paquete (UV/AIEP retirados) |
| Curriculum | 20 | espejo exacto del paquete: 20 Plan Active, owner=Institution |
| rt__Plan__curriculum | 20 | satelite de cada Plan |
| Activity | 301 | mesh; **300 Active + 1 Draft designada** (REQ-05) |
| requirementCategory | 80 | mesh (solo los 20 planes del paquete) |
| planEntry | 549 | mesh (el Plan Draft queda con 0, esperado) |
| curricularSection | 374 | syllabus-sections (7 RT) |
| OrgUnit Faculty CIE/ING | 2 | offerings |
| ActivityLine | 12 | offerings |
| Offering | 120 | offerings |
| Term | 2 | academic-scheduling (REQ-08) |
| graduation profile | 1 | re-apuntado (REQ-09) |
| Plans con bloque electivo | 1 (el Draft) | re-apuntado (REQ-09b) |
| core_DataLog (del seed) | 0 | excluido (REQ-06) |
| filas con codigo `UV-*` / `AIEP-*` | 0 | retirados (REQ-07) |

curricularSection por RecordType (374): Session 176, Content 55, EvaluationComponent 44, LearningOutcome 44, Bibliography 33, CustomSection 11, Modality 11.

## Tasks

> DET-20: no hay `### Session N` previas en el ticket, el plan empieza en **S1**.

### Session 1 — Sustitucion del nucleo (swap atomico) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Capa 1 (modelo): confirmar que el schema de UPU soporta lo que el seed escribe y NO tiene workflow/changeLog | REQ-04 | reviewer | — | object-manager/prisma/UPU/schema.prisma | grep capa 1: executionUnitId + ActivityStatus con Active y Draft presentes; workflowId/currentStatusId/ChangeLog ausentes | (no aplica) | DET-4, DET-5, DET-33 | done | 1 |
| S1.T2 | **Inventario autoritativo por ENUMERACION** (cierra las listas de REQ-10/11): listar y dar veredicto a **cada** archivo del **repo completo del mod** (arboles de REQ-12; un arbol entero puede resolverse como `no aplica` documentado), no cazar los afectados con grep ni enumerar subdirectorios elegidos a mano. Usar el grep de REQ-12 solo como ayuda, mas la busqueda por artefacto retirado (token por token). Cubre las dos direcciones: quien consume los loaders a retirar y que queda huerfano POR el borrado (`_cleanup.js`, oraculo de e2e, docs, `.ai/`) | REQ-07, REQ-10, REQ-11, REQ-12 | researcher | — | mods/curriculum-design/ (repo completo) | tabla archivo -> veredicto sobre el **repo completo del mod** (0 archivos sin veredicto; un arbol entero puede resolverse como `no aplica` documentado); falsos positivos declarados, no ignorados; consumidores por artefacto retirado verificados | (no aplica) | DET-10, DET-11, DET-16 | done | 1 |
| S1.T3 | Sustituir el array `PROGRAMS` por las 20 entradas UPU | REQ-01 | developer | S1.T1 | mods/curriculum-design/seed/_data-academicprogram.js | 20 entradas, todas institutionCode UPU-MAIN; 0 UV/AIEP | git revert | DET-1, DET-2, DET-8 | done | 1 |
| S1.T4 | Sustituir el array `CURRICULA` por los 20 Plan Active del paquete. **Revisado en S3 (decision del dev 2026-07-30)**: el `Minor` y el Plan `Draft` que se preservaron en S1 se RETIRARON — el array queda como espejo exacto del paquete | REQ-01, REQ-09 | developer | S1.T1 | mods/curriculum-design/seed/_data-curriculum.js | 20 entradas, todas Plan/Active/UPU-MAIN; 0 Minor y 0 Draft | git revert | DET-1, DET-2, DET-8 | done | 1 |
| S1.T5 | Copiar del paquete `_data-mesh.js` y `_data-syllabus-sections.js` (NO copiar `_data-changelog.js`) | REQ-01, REQ-06 | developer | S1.T1 | mods/curriculum-design/seed/_data-mesh.js, .../_data-syllabus-sections.js | archivos presentes; `_data-changelog.js` ausente | git revert (borrar archivos) | DET-1, DET-2, DET-8 | done | 1 |
| S1.T6 | Fix P5 en `_data-mesh.js`: quitar lookup workflow/workflowStatus y set de workflowId/currentStatusId; `status:'Active'` + dejar 1 Activity designada en `Draft` (documentar cual y por que) | REQ-05 | developer | S1.T5 | mods/curriculum-design/seed/_data-mesh.js | grep 0 refs a workflow/currentStatus; `status:'Active'` presente; la designada en Draft comentada | git revert | DET-5, DET-8, DET-33 | done | 1 |
| S1.T7 | Validar el bloque executionUnit del mesh (Faculty UPU-FAC-ING find-or-create + set executionUnitId); ajustar si rev.2 no lo trae completo | REQ-02 | developer | S1.T5 | mods/curriculum-design/seed/_data-mesh.js | lectura confirma find-or-create + set executionUnitId | git revert | DET-5, DET-8 | done | 1 |
| S1.T8 | Retirar `_data-univalle.js`, `_data-aiep.js`, `_data-malla.js` y `_cleanup.js` (imports + llamadas + archivos) y reordenar `seed()`; NO registrar `loadChangeLog`; infra intacta. `_data-syllabus.js` se retira en S2 tras resolver Term | REQ-06, REQ-07 | developer | S1.T2, S1.T3, S1.T4, S1.T5 | mods/curriculum-design/seed/seed.js, (4 archivos eliminados) | seed.js sin esos imports ni `loadChangeLog`; grep 0 refs a `cleanupProgramSections`; `_data-rbac.js`/`_data-indexes.js`/cleanups de layouts sin cambios | git revert (restaurar imports + archivos) | DET-8, DET-16 | done | 1 |
| S1.T9 | Correr sync fase 8 contra UPU reseteado y validar capa 2 del nucleo: totales exactos + desglose + integridad de FK + sin residuos + idempotencia + guard | REQ-01, REQ-02, REQ-04, REQ-05, REQ-07 | reviewer | S1.T6, S1.T7, S1.T8 | (DB uplanner_upu) | **conteos ACOTADOS a nuestra data** (`code LIKE 'UPU-%'` / `code LIKE 'C-%' OR code IN ('RED109','111026C')` / tabla `CurricularSection`, NO `Section`): AP=20, Curr=20, rt__Plan=20, Activity=301, reqCat=80, planEntry=549, CurricularSection=374; **INVARIANTE CANARIO: toda Activity del mesh con `versionLabel='v2026-actual'`** — si alguna difiere, su code colisiono con un registro preexistente de otro mod y el guard `if (!act) create` la salto (ni status ni executionUnit son nuestros). **EXCEPCION DECLARADA Y VERIFICADA: `RED109`** colisiona (otro mod la siembra antes en el orden inter-mod), asi que el canario da 1, no 0. `planEntry` tambien se acota (`JOIN Curriculum WHERE code LIKE 'UPU-%'`): el total crudo es 609 porque CALDEMO aporta 60. **REQ-02 se mide sobre lo que ESTE seed creo** (`versionLabel='v2026-actual'`): 300/300 con executionUnitId; desglose Curriculum: Minor=0, Draft=0 (retirados en S3 por decision del dev), todos UPU-MAIN; Activity 300 Active + 1 Draft, status null=0; executionUnitId null=0; codigos UV-*/AIEP-*=0; huerfanos planEntry/reqCat=0; correr 2x = mismos numeros; tenant no-UPU: 4 roles y 0 filas de data | reset tenant + re-seed | DET-7, DET-13, DET-33 | done | 1 |
| S1.T10 | **Retirar `tests/integration/fixtures-vs-seed.test.ts` EN ESTA SESSION** (no en S4): importa `_data-univalle.js` y `_data-aiep.js` (lineas 19-20) que S1.T8 borra, ademas de leer el oraculo del e2e. Sin esto la suite queda en rojo desde S1 hasta S4 y revienta al cargar el modulo | REQ-10 | developer | S1.T8 | mods/curriculum-design/tests/integration/fixtures-vs-seed.test.ts | archivo retirado; vitest carga la suite sin error de modulo | git revert | DET-8, DET-16 | done | 1 |
| S1.T11 | **Actualizar `seed-counts.test.ts` EN ESTA SESSION** (clase A): importa `loadUnivalle`/`loadAiep` (lineas 24-25) que S1.T8 borra. Re-apuntar a los loaders vigentes y a los conteos/institution nuevos (hoy assertea `'Universidad del Valle'` y `country: 'CO'`). Es mock-based sobre los arrays, asi que ya es verificable en S1 | REQ-10 | developer | S1.T3, S1.T4, S1.T8 | mods/curriculum-design/tests/integration/seed-counts.test.ts | test en VERDE con los loaders y conteos nuevos; 0 refs a UV/AIEP | git revert | DET-5, DET-7, DET-8 | done | 1 |
| S1.T12 | Correr `npm test` del mod y confirmar que la suite **carga y pasa** tras el swap (deteccion temprana: la suite no debe quedar en rojo al cerrar S1); explicar el delta de suites vs baseline | REQ-10 | reviewer | S1.T10, S1.T11 | mods/curriculum-design/tests/ | suites fallidas=0; delta explicado (solo `fixtures-vs-seed` de menos) | (no aplica) | DET-7, DET-13, DET-33 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir en `## Sessions`, quality review (DET-23), evidencia de conteos reales (DET-36), decidir continue/iterate | — | reviewer | S1.T1..S1.T9, S1.T10, S1.T11, S1.T12 | ticket | gate persistido + conteos reales adjuntos | (no aplica) | DET-20, DET-23, DET-36 | done | 1 |

### Session 2 — Offerings, ActivityLine y preservacion de Term [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Determinar si el orden de seeds inter-mod garantiza que `academic-scheduling/seed/populate-terms.js` corra antes que el seed de curriculum-design | REQ-08 | researcher | S1.GATE | object-manager (orquestador del sync fase 8), mods/academic-scheduling/seed/populate-terms.js | veredicto con evidencia: orden garantizado si/no | (no aplica) | DET-4, DET-5, DET-33 | done | 2 |
| S2.T2 | Copiar `_data-offerings.js` y registrarlo despues de las secciones; si S2.T1 dio "no garantizado", trasladar el bloque `TERMS` (find-or-create defensivo) a este loader | REQ-03, REQ-08 | developer | S2.T1 | mods/curriculum-design/seed/_data-offerings.js, .../seed.js | archivo presente y registrado en orden; si aplica, TERMS presente | git revert | DET-5, DET-8, DET-16 | done | 2 |
| S2.T3 | Retirar `_data-syllabus.js` (import + llamada + archivo) una vez garantizado el Term | REQ-07, REQ-08 | developer | S2.T2 | mods/curriculum-design/seed/seed.js, .../_data-syllabus.js | grep 0 refs a `loadSyllabusOfferings`/`_data-syllabus` | git revert (restaurar import + archivo) | DET-8, DET-16 | done | 2 |
| S2.T4 | Correr sync y validar capa 2 de offerings + Term, **acotado a nuestros codes** | REQ-03, REQ-08 | reviewer | S2.T2, S2.T3 | (DB uplanner_upu) | filtros: lineas `code LIKE 'AL-C-%' OR code IN ('AL-RED109','AL-111026C')`, offerings `code LIKE 'OFF-C-%' OR LIKE 'OFF-RED109%' OR LIKE 'OFF-111026C%'` (**el prefijo `C-` NO alcanza: el mesh tiene 2 codes sin el**). ActivityLine=12 (orgUnitId null=0), offering=120, offerings sin periodo=0, Faculty CIE/ING=2, Term=2, huerfanos=0. Totales crudos esperados: ActivityLine 27 (+15 `AL-SVC` de otro mod), Offering 150 (+30 `ServiceOffer` de uengagement, que legitimamente NO tienen periodo) | reset + re-seed | DET-7, DET-13, DET-33 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir + quality review + evidencia (Term=2 y offerings sin periodo=0) | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + conteos reales | (no aplica) | DET-20, DET-23, DET-36 | done | 2 |

### Session 3 — Re-apuntado de los artefactos huerfanos [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Re-apuntar `_data-graduation-profile.js`: los TRES valores UV del objeto `PROFILE` (`institutionCode`->`UPU-MAIN`, `curriculumCode`->`UPU-ICIV-PLAN-2026`, narrative sin "Universidad del Valle") + su docstring | REQ-09 | developer | S2.GATE | mods/curriculum-design/seed/_data-graduation-profile.js | reseed crea el perfil (**no** `skipped: institution UV no encontrada`); grep 0 refs a UV | git revert | DET-5, DET-8, DET-16 | done | 3 |
| S3.T2 | Fijar `_data-requirement.js`: asignatura concreta del mesh para el arbol EST200 y bloque electivo en el **Plan Draft** (no en los 20); actualizar el comentario stale de la linea 103 | REQ-09 | developer | S2.GATE | mods/curriculum-design/seed/_data-requirement.js | reseed 2x cuelga el arbol de la misma asignatura; Plans con bloque electivo=1 y su status=Draft | git revert | DET-5, DET-8, DET-16 | done | 3 |
| S3.T3 | Correr sync y validar capa 2 del re-apuntado + barrido final de residuos UV/AIEP en `seed/` | REQ-07, REQ-09 | reviewer | S3.T1, S3.T2 | (DB uplanner_upu), mods/curriculum-design/seed/ | perfil=1 con owner UPU-ICIV-PLAN-2026, arbol EST200 anclado a `C-ESTADISTIC-107` por code, electivo=1 anclado a `UPU-ICIV-PLAN-2026` por code, Curriculum=20 con Minor=0 y Draft=0 (retirados), grep UV/AIEP en seed/=0 | reset + re-seed | DET-7, DET-13, DET-33 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir + quality review + evidencia de los conteos | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + conteos reales | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Retiro de los llm-e2e y desacople de la suite [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Clasificar **los 33 tests de integracion** (la lista sale del inventario de S1.T2): sujeto del test (el seed ES el sujeto vs solo lo usa como fixture) y veredicto por archivo (actualizar / desacoplar / retirar con razon / no aplica) | REQ-10, REQ-12 | researcher | S3.GATE, S1.T2 | mods/curriculum-design/tests/integration/ | tabla con los 33 archivos clasificados por sujeto; 0 sin veredicto | (no aplica) | DET-4, DET-7, DET-11 | done | 4 |
| S4.T2 | Eliminar `tests/llm-e2e/` completo (22 escenarios + `fixtures/` + README + runner-instructions + result.md) | REQ-10 | developer | S4.T1 | mods/curriculum-design/tests/llm-e2e/ | el directorio no existe; ningun test importa o lee rutas bajo `llm-e2e/` | git revert | DET-8, DET-16 | done | 4 |
| S4.T3 | ~~Retirar `fixtures-vs-seed.test.ts`~~ **movido a S1.T10** (lo rompe S1.T8). Esta task queda como verificacion: confirmar que ya no existe y que ningun test lee rutas bajo `llm-e2e/` (su unico sujeto son los fixtures del e2e y los lee con `readFileSync` en el top-level). **NO retirar `cleanup-seeds.test.ts`**: verificado que cubre los loaders de cleanup de layouts, infraestructura preservada por REQ-07 | REQ-10 | developer | S4.T2 | mods/curriculum-design/tests/integration/fixtures-vs-seed.test.ts | retirado; vitest carga sin errores; `cleanup-seeds.test.ts` sigue presente y en verde | git revert | DET-8, DET-16 | done | 4 |
| S4.T4 | Clase A restante: actualizar `seed-entry.test.ts` (loaders y orden de `seed()`) y **re-verificar** `seed-counts.test.ts` (ya actualizado en S1.T11) por si S2/S3 cambiaron conteos que assertea | REQ-10 | developer | S4.T1 | mods/curriculum-design/tests/integration/seed-entry.test.ts, seed-counts.test.ts | ambos en verde; conteos coinciden con la tabla de Artifacts y con la BD real | git revert | DET-5, DET-7, DET-8 | done | 4 |
| S4.T5 | Clase B (solo usaban el seed como fixture ambiental): **desacoplar con fixtures inline** — `curriculum-lineage.test.ts`, `composable-buildTree.test.ts`, `build-payloads.test.ts`, `composite-section-form.test.ts`, `use-composite-section-tree.test.ts`; actualizar el comentario de `rich-text-renderer.test.ts:13`; renombrar los tests cosmeticos de `validateWeightedSum.spec.ts` (166/181) | REQ-10 | developer | S4.T1 | mods/curriculum-design/tests/integration/ (6 archivos), modsComponents/CompositeSectionTree/validateWeightedSum.spec.ts | los 5 de clase B no referencian data del seed (fixtures inline); en verde | git revert | DET-5, DET-7, DET-8 | done | 4 |
| S4.T6 | Correr la suite completa (`npm test`) y confirmar VERDE con salida real; **comparar el CONTEO de suites/tests antes vs despues y explicar el delta archivo por archivo** (una suite de menos no genera fallo: es el modo en que una perdida de cobertura pasa desapercibida); verificar que cambiar un dato del seed no rompe los tests de clase B | REQ-10 | reviewer | S4.T3, S4.T4, S4.T5 | mods/curriculum-design/tests/ | suites fallidas=0 (output adjunto); **delta de suites/tests explicado** (solo `fixtures-vs-seed` de menos); independencia de clase B probada | (no aplica) | DET-7, DET-13, DET-33 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir + quality review + salida real de vitest adjunta (no "deberia pasar") | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4, S4.T5, S4.T6 | ticket | gate persistido + output de vitest | (no aplica) | DET-13, DET-20, DET-23 | done | 4 |

### Session 5 — Smoke reforzado (capa 3) + docs + KB [tipo: ⚑ fuerte] [tier: T3]

> **La capa 3 de esta session es ahora la UNICA verificacion runtime del seed.** Los tests de integracion mockean prisma (el docstring de `seed-counts.test.ts` delegaba explicitamente el "cargo realmente en DB" al e2e, que se retiro). Por eso S5.T1 no alcanza con "abrir y ver": debe confirmar **conteos renderizando** por el path real.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Capa 3 (smoke) **reforzada**, por el path real del usuario: login UPU; RecordList de carreras (**contar 20**) y planes (**contar 22, con 1 en Draft**); abrir una malla y contar planEntry por periodo + requirementCategory; abrir `C-CALCULOI-001` (Unidad Organizativa no vacia, status Active, secciones de syllabus con sus conteos); 12 lineas con orgUnit; secciones con periodo asignado; perfil de egreso visible; arbol de requisitos en su asignatura; plan en borrador con su bloque electivo | REQ-01, REQ-02, REQ-03, REQ-05, REQ-08, REQ-09, REQ-10 | reviewer | S4.GATE | (UI UPU / MCP up1) | evidencia runtime real (screenshot/DOM/console con marca de corrida) **con los conteos visibles**, por el alias RT del mod, no la API base. Cubre lo que el e2e retirado tenia asignado | (no aplica) | DET-13, DET-33, DET-36 | done | 5 |
| S5.T2 | Cerrar el **inventario de REQ-12** sobre el repo del mod (tabla de veredictos + excepciones con razon) y confirmar exclusion del historial | REQ-06, REQ-07, REQ-12 | reviewer | S4.GATE, S5.T3, S5.T4 | mods/curriculum-design/, (DB uplanner_upu), ticket | grep 0 refs a loadChangeLog/_data-changelog; core_DataLog del seed=0; UV-*/AIEP-* en DB=0; **tabla de inventario con 0 archivos sin veredicto** | (no aplica) | DET-13, DET-33 | done | 5 |
| S5.T3 | Actualizar `docs/reference/seed-counts.md`: conteos nuevos, query de verificacion, inventario de loaders, guard, retiro de fixtures y del e2e, exclusion del historial, dependencia de Term | REQ-11 | developer | S5.T1 | mods/curriculum-design/docs/reference/seed-counts.md | los numeros del doc coinciden con la query real contra la BD | git revert | DET-16 | done | 5 |
| S5.T4 | Barrer la doc segun el inventario. **Data retirada**: `seed/README.md`, `docs/guides/seed-data.md`, `docs/architecture/academic-program.md`, `docs/architecture/curriculum-plan-minor.md`, `docs/guides/INDEX.md`, `.ai/CONTEXT.md`, `.ai/TASKS.md`, `CLAUDE.md`. **Nivel e2e retirado** (dejan de prescribir infraestructura inexistente): `docs/guides/testing.md` (fila de tabla, arbol, seccion "Cuando usar llm-e2e vs integration", anti-patterns), `docs/guides/creating-vueform-element.md:653`, `docs/guides/composite-section-tree.md:166,246`, `README.md:155,220`. Declarar en `testing.md` que el nivel ya no existe y que los flujos drag/modal/keyboard quedan con cobertura solo a nivel componente. Ademas los que mencionan la metodologia sin prescribirla (`color-picker.md`, `icon-picker.md`, `rich-text-renderer.md`, `.ai/TROUBLESHOOTING.md`), los 4 tests con comentarios que la citan (`aria-attrs`, `activity-status-badge-a11y`, `dialog-behavior`, `lang-enums`) y los 2 archivos de **codigo fuente** (`useCompositeSectionTree.ts`, `useTreeKeyboardNav.ts`). Decidir sobre `pascalcase-migration-guide.md` (guia historica) y `objects/BibliographyReference.json:90` (costo de codegen) | REQ-10, REQ-11, REQ-12 | developer | S5.T1, S1.T2 | mods/curriculum-design/docs/, .ai/, README.md, CLAUDE.md, objects/ | ningun doc describe la data retirada ni prescribe el e2e eliminado; la perdida de nivel declarada en testing.md; decisiones documentadas | git revert | DET-16 | done | 5 |
| S5.T5 | KB DKC: registrar decisiones (sobrescribir, absorber tests+docs, retirar el e2e, desacoplar clase B, excluir historial, re-apuntar huerfanos) y las rules que emergen (los seeds no pueblan logs de auditoria; dependencia de Term por nombre inter-mod; **un test cuyo sujeto no es el seed no debe depender del seed**; validar seeds por total exacto contra BD real; **enumerar el arbol en vez de listar archivos al auditar residuos**) | REQ-07, REQ-09, REQ-10 | reviewer | S5.T1 | deckard/projects/up1/decisions/, deckard/projects/up1/rules/curriculum-design/ | records creados + reindex | git rm de los records creados | DET-11, DET-16 | done | 5 |
| S5.T6 | **Publicar el PR** (agregada en ejecucion, 2026-07-30): push de `feat/UPONE-1456-seed-demo-rev2` + PR contra `develop`; correr el typecheck **aparte** de la suite y clasificar introducido vs preexistente en **checkout limpio** (worktree del merge-base y de la base), fixeando solo los introducidos | REQ-10, REQ-11 | developer | S5.T3, S5.T4, S5.T5 | mods/curriculum-design/seed/_data-curriculum.js, .../_data-mesh.js | PR abierto; `errores(HEAD) == errores(merge-base)` ⇒ 0 introducidos (77/77); suite en verde tras el fix | git revert del commit de tipos | DET-13, DET-33 | done | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** — persistir + acceptance checkpoints + evidencia smoke con conteos + suite verde + inventario cerrado; registrar story points ejecutados; decidir cierre (siempre pregunta al dev) | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4, S5.T5 | ticket | gate persistido + evidencia + output de vitest + story_points.executed | (no aplica) | DET-13, DET-20, DET-26, DET-36 | done | 5 |

### Task contract (detalle de las tasks con mayor riesgo)

```
Task S1.T8: Retirar los fixtures de prueba y su codigo huerfano
- source_ref: REQ-06, REQ-07
- agent: developer
- files: seed/seed.js; eliminar seed/_data-univalle.js, seed/_data-aiep.js, seed/_data-malla.js, seed/_cleanup.js
- precondition: S1.T2 reporto consumidores en ambas direcciones; arrays sustituidos (S1.T3/T4); loaders nuevos copiados (S1.T5)
- expected_output: seed() con el orden nuevo (rbac -> cleanups -> academicPrograms -> curricula -> mallas -> syllabusSections -> [offerings en S2] -> graduationProfile -> requirement -> indexes); sin imports de los retirados; sin loadChangeLog
- validation: grep 0 refs a loadUnivalle/loadAiep/loadMalla/cleanupProgramSections; infra sin cambios; sync corre sin crash
- rollback: git revert (restaura imports y los 4 archivos)
- rules: [DET-8, DET-10, DET-16]
```

```
Task S2.T1+S2.T2+S2.T3: Preservar Term antes de retirar el silabo
- source_ref: REQ-03, REQ-07, REQ-08
- agent: researcher + developer
- files: seed/_data-offerings.js, seed/seed.js; eliminar seed/_data-syllabus.js
- precondition: S1.GATE; el mesh sembrado (las offerings resuelven activity por code)
- expected_output: offerings registradas y con periodo resuelto; _data-syllabus.js retirado sin dejar los Term huerfanos
- validation: Term=2; offerings con termId null=0; ActivityLine=12; offering=120
- rollback: git revert (restaura _data-syllabus.js y su import)
- rules: [DET-5, DET-8, DET-16, DET-33]
```

```
Task S3.T2: Fijar el arbol de requisitos y el bloque electivo
- source_ref: REQ-09
- agent: developer
- files: seed/_data-requirement.js
- precondition: S2.GATE; las 301 Activities y los 21 Plans sembrados (incluido el Draft)
- expected_output: arbol EST200 colgado de una asignatura concreta; bloque electivo en el Plan Draft unicamente; comentario de linea 103 actualizado
- validation: reseed 2x da el mismo owner; Plans con bloque electivo=1 y su status=Draft
- rollback: git revert
- rules: [DET-5, DET-8, DET-16]
```

```
Task S4.T4: Actualizar seed-counts.test.ts (clase A)
- source_ref: REQ-10
- agent: developer
- files: tests/integration/seed-counts.test.ts
- precondition: S3.GATE (el seed ya produce el universo UPU definitivo); S4.T1 clasifico su sujeto
- expected_output: assertions alineadas a los totales nuevos y a la institution UPU-MAIN; sin 'Universidad del Valle' ni country 'CO'
- validation: vitest verde; los numeros del test coinciden con la tabla de conteos del spec y con la BD real
- rollback: git revert
- rules: [DET-5, DET-7, DET-8]
```

## Constraints

- RULE-dev-004: los cambios del mod van en rama mod-only (nunca develop/main); la guarda se verifica por repo destino. Rama: `feat/UPONE-1456-seed-demo-rev2`.
- DET-33: verificar el self-report contra la BD real y contra la salida real de la suite, no confiar en "el seed corrio" ni en "los tests deberian pasar".
- DET-36 y aprendizaje UPONE-1380: la validacion runtime va por el path real del usuario (alias RT del mod), no por la API base.
- Aprendizaje "unit tests mockeados consagran bugs de runtime": para seeds con proyecciones RT, enums y casing de FK, exigir validacion contra BD real (capas 2 y 3), no mock.
- BUG-curriculum-design-006 (abierto): `prisma.dataLog` es el delegate obsoleto (silent no-op); el correcto es `prisma.core_DataLog`. Motiva excluir el loader de historial (REQ-06).
- BUG-curriculum-design-008 (abierto): el visor Historial referencia el nombre viejo `DataLog` -> RBAC default-deny transversal. Refuerza REQ-06 y excluye el visor como metodo de verificacion.
- `_data-rbac.js` corre en TODOS los tenants y antes del guard de UPU: el retiro de fixtures no puede alterarlo (REQ-07).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| object-manager (sync fase 8) | internal | corre el seed y define el orden entre mods | si el orden no garantiza academic-scheduling primero, los offerings quedan sin Term (REQ-08) |
| mod academic-scheduling | internal | dueno canonico de los Term "Primer/Segundo Semestre" | no esta en ignoredMods, pero el orden debe verificarse (S2.T1) |
| institution `UPU-MAIN` | internal (seed core) | todos los loaders del paquete resuelven contra ella | si falta, los loaders hacen skip con reason (no crashean) |
| tenant UPU (uplanner_upu) | internal | destino de la data | el reset destructivo requiere consentimiento del dev |
| suite de tests del mod | internal | tests construidos sobre los fixtures retirados; `fixtures-vs-seed.test.ts` lee el oraculo en el top-level | sin resolverlos (REQ-10) la suite queda en rojo o no carga |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| La suite queda en rojo tras retirar fixtures | **high (si no se migra)** | CI rojo, cobertura ciega | REQ-10 migra los 23 archivos dentro del ticket; S4/S5 exigen salida real de la suite en verde |
| Offerings sin Term al retirar `_data-syllabus.js` | medium | 120 offerings sin periodo, en silencio | REQ-08 primero garantiza el Term; el retiro (S2.T3) depende de S2.T2; se valida Term=2 y sin periodo=0 |
| Perder cobertura de demo (perfil, requisitos, Minor, Draft, Activity en Draft) | medium | demo incompleta sin que nadie lo note | REQ-09 re-apunta 4 y REQ-05 preserva el 5to; el gate de S3 valida cada uno por conteo |
| Docs que PRESCRIBEN el e2e quedan apuntando a infraestructura inexistente | medium | el equipo escribe escenarios para un runner que ya no existe | S5.T4 actualiza los 4 docs que lo prescriben (`testing.md`, `creating-vueform-element.md`, `composite-section-tree.md`, `README.md`) y declara la perdida del nivel |
| Perder cobertura al retirar el e2e | low | features sin verificacion | verificado: las features cubiertas por los escenarios tienen cobertura en los 59 archivos vitest (keyboard 2, drag 1, reorder 3, weight 16, tree 20, modality 13, outcomes 6, bibliografia 7, evaluation 17). La verificacion runtime del seed la absorbe la capa 3 reforzada (S5.T1) |
| Doc oficial contradictorio (`seed-counts.md` y ~8 docs mas) | medium | on-call/qa validan contra numeros falsos | REQ-11 barre `docs/` + `.ai/` + README/CLAUDE.md; S5.T3 compara doc vs query real |
| **Cerrar con residuos porque el mecanismo de deteccion tiene un hueco** | **high (ocurrio 3 veces en el design: listas cerradas -> grep case-sensitive -> patron que no matchea `seed-uv.json`)** | el ticket cierra "completo" con tests y docs apuntando a fixtures inexistentes | REQ-12 cambia el criterio de "un grep devuelve 0" a **enumerar los directorios y dar veredicto por archivo** (exhaustivo por construccion, 22 escenarios / 33 tests / 51 docs), con el grep solo como ayuda y una busqueda positiva por artefacto retirado |
| Retirar un loader que otro consume | low | seed o test roto | S1.T2 inventario en dos direcciones ANTES de borrar; rollback restaura |
| Seed sube datos parciales y termina verde | medium | demo incompleta invisible | conteos como totales exactos + integridad de FK; cualquier numero por debajo es falla |
| El alcance real (5-8 SP) desborda el sprint | medium | el ticket no cierra en SP6 | decision explicita del dev de absorberlo, mas el retiro del e2e que bajo el alcance; **5** sessions con gates independientes permiten standby entre sessions sin dejar la suite en rojo (S1-S3 seed, S4 tests, S5 cierre) |

## Open questions

- [ ] Ninguna bloqueante. Decisiones cerradas: sobrescribir; absorber la migracion de tests y docs; excluir el loader de historial; preservar Term; re-apuntar perfil / requisitos / `Minor` / Plan `Draft`; preservar una Activity en `Draft`.
- [ ] A definir en ejecucion (no bloqueante): (a) que asignatura concreta del mesh recibe el arbol EST200 (candidata `C-ESTADISTIC-107`); (b) cual de las 301 Activities queda designada en `Draft` (REQ-05); (c) si los escenarios `detail-uv-*`/`detail-aiep-*` se renombran o solo se re-apuntan.

## Decisions

### DEC-LOCAL-01: Sobrescribir la data de demo en vez de convivir
- **Contexto**: el mod tiene fixtures de prueba (universos UV y AIEP) y el paquete trae data basada en casos reales de clientes (UPU-MAIN). Podian convivir por clave natural.
- **Drivers**: el request pide "reemplazar el seed actual"; la data real debe ser la del mod; dos universos superpuestos ensucian la demo y obligan a validar con baseline sumado; `_data-malla.js` conviviendo habria duplicado los `requirementCategory` (itera todos los Plans).
- **Opcion elegida**: sustituir los arrays de datos y retirar los loaders de fixtures, preservando la infraestructura del seed.
- **Alternativas**: convivir (recomendacion del autor del paquete) descartada por el dev; fusionar los arrays descartada por el mismo motivo.
- **Consecuencias**: un solo universo coherente; conteos como totales exactos. Aparecen REQ-07..11 y el alcance sube de 3 a 8-13 SP.
- **Session**: design (2026-07-30)

### DEC-LOCAL-02: Absorber la migracion de tests y docs en este ticket
- **Contexto**: el design descubrio que 17 escenarios llm-e2e, 6 tests de integracion y 2 docs oficiales dependen de los fixtures que se retiran.
- **Drivers**: `seed-counts.test.ts` assertea conteos exactos y la institution 'Universidad del Valle'; diferir la migracion dejaria la suite en rojo entre tickets, con cobertura ciega.
- **Opcion elegida**: absorber la migracion en TICKET-113 (REQ-10 y REQ-11), como sessions propias (en su momento S4/S5/S6; tras DEC-LOCAL-05 quedaron en **S4 tests + S5 cierre**).
- **Alternativas**: partir en dos tickets (descartada: CI en rojo entre ambos); retirar los tests dependientes (descartada: perdia cobertura real de features); volver a convivir (descartada: contradice DEC-LOCAL-01).
- **Consecuencias**: el ticket crecio a 6 sessions y ~15-20h en el momento de esta decision; **DEC-LOCAL-05 (posterior) lo bajo a 5 sessions y ~10-13h** al retirar el e2e en vez de migrarlo. A cambio, nada queda en rojo ni contradictorio al cerrar.
- **Session**: design (2026-07-30)

### DEC-LOCAL-03: Excluir el loader de historial (no sembrar core_DataLog)
- **Contexto**: `_data-changelog.js` escribe historial dummy en `ChangeLog`, modelo retirado.
- **Drivers**: `core_DataLog` es log de auditoria y debe reflejar acciones reales; migrar arrastraba BUG-006 y BUG-008, ambos abiertos y ajenos.
- **Opcion elegida**: excluir el loader.
- **Alternativas**: migrar con remap curado->mesh + drop TIR101, descartada por el dev.
- **Consecuencias**: costo cero; la demo no trae historial pre-cargado (se llena con el uso).
- **Session**: design (2026-07-29)

### DEC-LOCAL-04: Preservar la cobertura de demo re-apuntando, no recreando
- **Contexto**: el paquete no trae perfil de egreso, arbol de requisitos, recordType `Minor`, Plan en `Draft` ni Activity en `Draft`.
- **Drivers**: no perder rutas de codigo y casos de prueba que la demo ejercita (owner Institution del Minor, arbol Y/O, flujo electivo sobre un plan en borrador, transicion de estado de Activity) sin construir data nueva.
- **Opcion elegida**: re-apuntar los loaders existentes a la data UPU (cambios de una linea) y designar una Activity que queda en `Draft`.
- **Alternativas**: retirar esos loaders (perdia cobertura); dejar `_data-requirement.js` generico (quedaba arbitrario y replicaba bloques electivos en los 20 planes).
- **Consecuencias**: cobertura preservada sobre data real; el arbol de requisitos pasa a ser deterministico y el bloque electivo queda en el plan en borrador, como era la intencion original del fixture.
- **Session**: design (2026-07-30)

### DEC-LOCAL-05: Retirar los llm-e2e y desacoplar la suite, en vez de migrarla
- **Contexto**: 22 escenarios llm-e2e y 9 tests de integracion dependian de los fixtures retirados. El plan original los migraba (una session entera).
- **Drivers**: evidencia de que el e2e esta muerto (no corre en CI — el script es `vitest run` y no toma `.md`; ultima corrida 2026-05-07; sin tocar desde el 20 de mayo) y sus features tienen cobertura en los 59 archivos vitest del mod. Ademas, el principio del dev: un test cuyo sujeto no es el seed no deberia depender del seed.
- **Opcion elegida**: retirar `tests/llm-e2e/` completo; retirar los 2 tests que pierden su sujeto; actualizar los 2 de clase A (el seed ES su sujeto); **desacoplar** los 5 de clase B con fixtures inline.
- **Alternativas**: migrar los 17 escenarios + el oraculo + los screenshots (descartada: ~3-4h en activos muertos, y era la fuente de la mitad de los hallazgos de revision); re-apuntar la clase B a codigos UPU (descartada: muda el acoplamiento, no lo elimina).
- **Consecuencias**: desaparece una session entera (~3-4h) y la parte mas fragil del plan; la clase B queda fuera del radio de cambios futuros del seed. **Contrapartida asumida**: los tests de integracion mockean prisma y delegaban el "cargo realmente en DB" al e2e, asi que la capa 3 (S5.T1) pasa a ser la unica verificacion runtime y se refuerza para exigir conteos renderizando.
- **Session**: design (2026-07-30)

## Technical reference

- Paquete rev.2 + instrucciones + plan: `uplanner/specs/up1/sp7/UPONE-1456-seed-rev2/` (`INSTRUCCIONES-INTEGRACION.md`, `PLAN-VALIDACION.md`).
  - **Salvedad verificada**: `programs.array.js` y `curricula.array.js` NO son loaders ni archivos a copiar. Su primera linea indica que son fragmentos para el array de los loaders existentes. Aqui se usan para **sustituir** el contenido de esos arrays.
  - **Salvedad de conteos**: los numeros de `PLAN-VALIDACION.md` son lo que aporta el paquete. Con la sustitucion coinciden con los totales de BD.
  - **Salvedad del Plan Draft**: `_data-mesh.js` crea malla solo para los 20 `planCode` que nombra; el Plan Draft re-apuntado queda deliberadamente sin malla.
- Data model del draft: `TICKET-113.draft/data-model.prisma`.
- Schema real verificado (capa 1, tenant UPU): `Activity.status ActivityStatus? @default(Draft)` con `Draft` y `Active` en el enum; `executionUnitId String?`; sin `workflowId`/`currentStatusId`/`model Workflow`/`WorkflowStatus`/`ChangeLog`. `model core_DataLog` existe pero NO se siembra.
- Accesor Prisma de DataLog (referencia, NO se usa aqui): el correcto es `prisma.core_DataLog` (uso correcto en `levelScheme-upsert.resolver.js:381`); `prisma.dataLog` en `appRoles.resolver.js` es el obsoleto (BUG-006).
- Term: `academic-scheduling/seed/populate-terms.js` crea "Primer Semestre" y "Segundo Semestre"; el mod no esta en `ignoredMods`.
- `_cleanup.js`: sus dos unicos consumidores son `_data-univalle.js:196` y `_data-aiep.js:185` (verificado por grep); ningun loader del paquete lo importa.
- **Referencias a `tests/llm-e2e/` desde fuera del directorio** (verificado, todas cubiertas por REQ-10/11): `fixtures-vs-seed.test.ts` (import + readFileSync top-level -> se retira), `README.md:155,220`, `docs/guides/testing.md` (multiples, incluida una seccion prescriptiva), `docs/guides/creating-vueform-element.md:653`, `docs/guides/composite-section-tree.md:166,246`, `docs/guides/INDEX.md:24`. **No hay ningun script de npm ni config de vitest que apunte al directorio** (el include de `vitest.config.ts` no toma `.md`), asi que borrarlo no rompe el build.
- Suite dependiente de fixtures (verificado por grep): 6 tests de integracion y 15 escenarios llm-e2e, listados en REQ-10.
- **Puntos ciegos del barrido de REQ-12, ya verificados en design (no hace falta redescubrirlos)**:
  - `package.json` del mod: 0 hits. `vitest.config.ts`: 0 hits.
  - No existen directorios `__snapshots__` en el mod (no hay snapshots que arrastren los fixtures).
  - `config/`, `capabilities.json` y `lang/` del mod: limpios.
  - **Ningun otro mod ni core referencia estos fixtures** (`UV-ICIV`, `UV-MINOR`, `AIEP-IINF`, `AIEP-TRED`, `SYL-CALC`): el radio de impacto esta **contenido a `curriculum-design`**. Esto es lo que hace viable el alcance mod-only.
  - Subdirectorios de `tests/` **verificados limpios en design** (veredicto `no aplica`, pero entran al inventario): `tests/unit/` (24 archivos), `tests/stubs/` (4), `tests/component/` (3) -> 0 referencias a los fixtures.
  - **14 de 22 escenarios e2e escriben screenshots a `deckard/projects/up1/tickets/ticket-011.screenshots/`** (ticket cerrado): dependencia fuera del mod, invisible a cualquier grep de tokens de fixture sobre el mod. Cubierta por REQ-10 / S5.T3b.
  - Conteos de la enumeracion verificados contra el mod: **22** escenarios e2e, **33** tests de integracion, **51** docs.
  - Directorios del mod FUERA de `execute_scope` y verificados en **0 hits**: `css/`, `logic/`, `roles/`, `scripts/`, `types/`, `modsComposables/`, `.storybook/`, `.husky/`. No requieren inventario (ni trabajo) pero queda constancia de que se revisaron.
  - Total de archivos con referencias en el mod: **51 con `grep -i`** (42 sin el flag). La diferencia de 9 incluye 2 escenarios e2e genuinos, los 2 docs del runner, `pascalcase-migration-guide.md` y 4 falsos positivos de mocks (`ownerId: 'uv-1'`). El conteo inicial del design (33 fuera de `seed/`) estaba **sub-contado por usar grep case-sensitive**: es exactamente el defecto que REQ-12 ahora previene.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..11 pasan.
- [x] **Tests** (DET-37 dim4): validacion 3 capas con totales exactos en VERDE **y** la suite del mod (`npm test`) en VERDE con salida real adjunta, ya sin `tests/llm-e2e/`; los tests de clase B verificados independientes del seed.
- [x] **Rules**: RULE-dev-004 respetada (rama mod-only); DET-33/DET-36 aplicadas (validacion runtime y salida real de la suite).
- [x] **Integration**: infraestructura del seed intacta (4 roles curriculares en tenant no-UPU); `core_DataLog` sin filas del seed; 0 residuos UV/AIEP en BD, seed, tests y docs.
- [x] **Docs oficiales** (DET-37 dim1): `seed-counts.md`, `seed/README.md` **y** el resto de `docs/`, `.ai/`, `README.md`, `CLAUDE.md` del mod actualizados (S5.T3, S5.T4).
- [x] **Inventario de residuos** (REQ-12): la tabla de veredictos cubre el **repo completo del mod** con **0 archivos sin veredicto** (un arbol entero puede ir como `no aplica` documentado); las excepciones aceptadas estan con su razon; los consumidores por artefacto retirado en 0 (S5.T2). **El criterio NO es "un grep devuelve 0"** — eso fallo tres veces en el design.
- [x] **KB DKC** (DET-37 dim2): 4 decisiones y las rules emergentes capturadas (S5.T5).
- [x] **Docs externas DKC** (DET-37 dim3): N/A (no toca DKC ni convenciones).
- [x] **Story points** (DET-26): `executed` registrado con metodo en S5.GATE (supera los 3 SP publicados; el dev aprobo absorber el alcance).
- [x] **Planning-completeness**: entry registrada con la cobertura vigente (docs = el arbol `docs/**` + `.ai/**` + README/CLAUDE segun inventario; tests = retiro de `tests/llm-e2e/` + 1 retiro + 2 clase A + 5 clase B desacoplados + limpieza de comentarios).

### Evidencia de cierre (2026-07-30)

| Checkpoint | Resultado | Evidencia |
|---|---|---|
| Funcional | pass | REQ-01..12 con al menos un scenario implementado y validado. REQ-05 y REQ-09 fueron **enmendados en ejecucion** por instruccion del dev (retiro de los fixtures que el paquete no trae) y reescritos en este spec, no solo anotados. |
| Tests | pass | `npm test` del mod re-corrido al cierre: **80 archivos / 1435 tests VERDE** (salida real, 5.17s). Clase B verificada independiente del seed (fixtures inline). |
| Capa 2 (BD real) | pass | Conteos acotados verificados por session contra `uplanner_upu`: AP=20, Curriculum=20, rt__Plan=20, Activity=301, reqCat=80, planEntry=549, CurricularSection=374 (7 RT), ActivityLine=12, Offering=120 con periodo, Term=2, `core_DataLog`=0. Canario `versionLabel='v2026-actual'` con 1 excepcion declarada (`RED109`, colision inter-mod). |
| Capa 3 (runtime) | pass | S5.T1 — smoke por el path real (localhost:3000, tenant UPU, rol Consultor) con **reconciliacion de conteos contra BD** en cada checkpoint + screenshot. Es la unica verificacion runtime tras el retiro del e2e. |
| Typecheck | pass | Medido en checkout limpio: 77 errores en merge-base y en `origin/develop`, 77 en HEAD post-fix ⇒ **0 introducidos** (commit `c18cfd4`). |
| Rules | pass | RULE-dev-004 respetada: todo el trabajo en `feat/UPONE-1456-seed-demo-rev2`, mod-only, 0 commits en develop y 0 archivos de core tocados (verificado por `git log --grep` en los 4 workspaces core). |
| Docs | pass | 24 archivos de doc migrados (S5.T3 + S5.T4) segun el inventario por enumeracion; perdida del nivel e2e declarada en `docs/guides/testing.md`. |
| Scope | pass con enmienda | 77 archivos, todos dentro del mod. 4 caen fuera de la letra del `execute_scope` original (`modsComponents/` x3, `objects/` x1): son punteros muertos y renames cosmeticos que el barrido de REQ-12 exige. `execute_scope` ampliado en el ticket con esta justificacion. |
| KB DKC | pass | RULE-mods-056/057/058 + DEC-056/057; RULE-mods-052 extendida. |
| Regression | pass | Sin regresiones: la unica suite de menos (`fixtures-vs-seed`) se retiro con su sujeto, delta explicado archivo por archivo en S4.T6. |
