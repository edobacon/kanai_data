---
id: DOC-alcance-sp10-planning
project: up1
type: doc
module: curriculum-mapping
---

# Alcance SP10 uP1

**Reunion:** 2026-08-31 · **Modulos:** curriculum-design, curriculum-mapping, core (layout, mcp, object-manager) · **Cliente carga:** Ibero (tenant TEST) · **Estado:** decidido, para revision

> **Regla del sprint:** el desarrollo se limita a **configuracion, carga de datos y diagnostico**. No se implementan extensiones nuevas salvo que una validacion funcional demuestre que las capacidades existentes no alcanzan (ahi se levanta para conversarlo). Objetivo de tributacion acotado a dejar **al menos un flujo operativo** que alimente la visualizacion.

> **Nota de apareo:** el PO ya creo los tickets del sprint en Jira el mismo dia (UPONE-1747, 1748, 1753, 1754, 1755, 1756, 1757, 1758). Seis estan como placeholders sin descripcion. Este documento aparea cada bloque con su ticket y aporta el estado real del codigo para refinarlos. El unico entregable hablado **sin ticket** es la extension de layouts al tenant TEST (bloque C8). Roles ya tiene ticket previo (UPONE-1615).

## 01 · Contexto y criterio transversal

**Acuerdo · Nuevo criterio de aceptacion: logica de negocio en servicios, no en el cliente.**

- **Que cambia:** con el MCP oficial ya en produccion (UPONE-1744, Finalizada), todo desarrollo nuevo debe considerar la conexion con MCP a nivel de servicios. La logica que hoy vive solo en el front no la puede ejecutar el MCP: obliga a replicarla y a mantenerla en dos lados.
- **Por que importa:** el MCP nunca importa codigo del front (capas separadas). Una regla que solo existe como funcion TS en un componente Vue es invisible para un agente MCP. El molde correcto ya existe en el repo: `curriculum-design/logic/helpers/weightedSum.js` (helper puro server-side, test de paridad front/back, expuesto como ficha MCP `cd_validate_activity_evaluations`, etiquetado `mcp-readiness`).

## 02 · Mapa de entregables a tickets

| Bloque | Entregable | Ticket Jira | Naturaleza | Esfuerzo aprox. |
|---|---|---|---|---|
| C1 | Pestana Home / dashboard (Curriculum Design) | UPONE-1747 (dep. 1754) | Fix de config + contenido | 13 SP (PO) |
| C2 | Carga datos + config cliente Ibero en tenant TEST | UPONE-1748 | Config / carga / diagnostico | 13 SP (PO) |
| C3 | Ajuste menus + terminologia matriz (mantenedores a botones) | UPONE-1753 | Feature UI acotada | Bajo-Medio |
| C4 | Pestana Medicion + otros ajustes de la matriz | UPONE-1755 | Feature (varias capas) | Alto |
| C5 | Niveles de desarrollo por competencia (I/R/M) | UPONE-1755 (parte) | Feature (campo + UI) | Medio |
| C6 | Tributacion (contribution) | UPONE-1756 | Feature grande, subdividir | Alto, spike |
| C7 | Diagnostico de reconciliacion MCP por modulo | UPONE-1757 (CD) / 1758 (CM) | Diagnostico, no implementacion | Medio |
| C8 | Extender layouts / apps al tenant TEST | **sin ticket** | Fix de config (JSON) | Bajo |
| C9 | Roles internos / normalizacion del rol admin | UPONE-1615 (Refinement) | Ver hallazgo | 5 SP |

## 03 · Bloques por entregable

Cada bloque es analisis, no un ticket: propuesta derivada de la reunion, estado real del codigo, senales para el apareo con Jira y preguntas dirigidas. El recorte final lo decide el PO.

### C1 · Pestana Home / dashboard de metricas de diseno curricular — [UPONE-1747] [FIX de config]

- **Propuesta:** una vista "Home" que sea un dashboard de metricas de diseno curricular y quede como la pantalla de aterrizaje del modulo Curriculum Design. Usar capacidades existentes del report; extender solo si tras validar no alcanzan.
- **Ya existe:** el motor esta completo end to end: layout tipo Dashboard (`up1-layout/src/layouts/Dashboard/Dashboard.vue`), widgets de reporte embebibles con KPI (`report-builder ReportFormManager showAsKpi`), y el aterrizaje configurable por app `homescreen` + item Home en el nav (PLAT-15, UPONE-1630, Finalizada).
- **Falta:** `curriculum-design/config/app.json` hoy no declara `homescreen` ni tab de dashboards. Falta: crear las plantillas de reporte de las metricas, armar el layout Dashboard del modulo, y apuntar `homescreen`. No se detecta componente nuevo de UI ni motor nuevo.
- **Fix vs feature:** fix de configuracion + contenido. Riesgo unico: si alguna metrica pedida necesita una agregacion que report-builder no soporta hoy, ahi habria extension (a validar contra las metricas concretas del ticket).
- **Senales de match:** dashboard, home, homescreen, indicadores, metricas, diseno curricular. Objetos/rutas: `curriculum-design/config/app.json`, layout Dashboard, report-builder templates. Dependencia con **UPONE-1754** (mover a core el componente Indicadores).
- **Falta definir:** ver pregunta al core team sobre la dependencia con Indicadores (C-core-3).

### C2 · Carga de datos y configuracion del cliente Ibero en tenant TEST — [UPONE-1748] [config + diagnostico]

- **Propuesta:** cargar en el tenant TEST una carrera real de Ibero (jerarquia + config legacy del programa de asignatura) y producir dos inventarios de brechas: capacidades de configuracion no replicables y estructuras de datos no mapeables. No se implementa lo que falte en este sprint. Sirve tambien de onboarding.
- **Ya existe:** las **cuentas de servicio** ya existen y funcionan como se describio: `object-manager core_ServiceAccount` con `allowedOps` (objeto:accion, wildcard), `expiresAt` y activo/inactivo, con enforcement en `authChecker.js` y tests. Las **pestanas que unifican multiples estructuras** tambien existen en core: `polymorphicChildren` (object-manager, UPONE-1219) + `tabs.elements` de RecordDetail, ya usadas por el objeto `Activity` (programa de asignatura) con 7 subtipos.
- **Falta:** nada de mecanismo: es trabajo de configuracion y carga. El valor esta en los dos inventarios de brechas que produce, insumo del backlog del proximo sprint.
- **Fix vs feature:** configuracion / diagnostico. Sin desarrollo de motor.
- **Senales de match:** Ibero, tenant TEST, carga de datos, cuenta de servicio, programa de asignatura, layout, brechas. Objetos: `core_ServiceAccount`, `Activity`, `polymorphicChildren`.
- **Bloqueo posible:** depende de que los objetos existan en el tenant TEST (ver pregunta a Klaus, C-infra-1) y de que las apps sean visibles alli (bloque C8).

### C3 · Ajuste de menus y terminologia de la matriz (mantenedores a botones) — [UPONE-1753] [FEATURE UI]

- **Propuesta:** unificar los mantenedores de Curriculum Mapping bajo "Matrices de Competencia", con los sub-mantenedores (escalas de desempeno, niveles de desarrollo) como **botones** dentro del mismo mantenedor en vez de pestanas separadas. Normalizar terminologia y que no salga el nombre crudo del objeto. Respetar el patron ya existente en UP1 (programa de asignatura), no la maqueta.
- **Ya existe:** hoy `LevelScheme` (esquema de niveles) y `CoverageScheme` (esquema de cobertura, I/R/M) son dos objetos con juegos de layouts completamente separados. El shell de pestanas con guardado independiente y visibilidad por capability ya existe (`CompetencyMatrixShell`). Para "no mostrar el id crudo" hay trabajo relacionado en curso: epica Identifier column (UPONE-1749/1750/1751).
- **Falta:** no existe un mantenedor unificado que agrupe ambos como botones internos; es UI nueva. El registro de menu vive fuera del repo del mod, no se pudo verificar el estado actual del menu desde el codigo.
- **Fix vs feature:** feature de UI acotada. El shell reusable existe; la unificacion con sub-navegacion por botones y el renombrado sistematico son construccion.
- **Falta definir:** **contradiccion de nomenclatura** a resolver antes de estimar (ver C-biz-1): el titulo del ticket pide renombrar "Esquemas de cobertura" a "Esquema de niveles", pero el codigo documenta la decision inversa ya tomada.
- **Senales de match:** mantenedor, menus, terminologia, esquema de niveles, esquema de cobertura, botones, matrices de competencia. Objetos: `LevelScheme`, `CoverageScheme`, `CompetencyMatrixShell`.

### C4 · Pestana Medicion y otros ajustes de la matriz — [UPONE-1755] [FEATURE]

- **Propuesta:** una pestana "Medicion" que consolida escalas de desempeno + niveles de desarrollo + el modelo de medicion (competencia / competencia-criterio / competencia-resultado de aprendizaje), con guia visual (modal) y opciones preestablecidas (estandar = promedio, escalonado = nivel representativo con promedio, mejor evidencia), mas una opcion de personalizacion total.
- **Ya existe:** los ejes de datos existen: `defaultEvaluationMode` (OwnRubric / DerivedFromOutcomes), `defaultRubricModel` (Holistic / Criterion) y `aggregationMode` (Min / Max / WeightedAvg / Mode / Last). Hoy viven en la pestana "General" del shell. El motor de agregacion "se guarda, no se calcula en runtime" (fase F4 del mod).
- **Falta:** la pestana Medicion no existe. Los 3 presets de negocio (estandar / escalonado / mejor evidencia) no mapean 1 a 1 a los 5 `aggregationMode` tecnicos: son una capa de producto por construir. Tampoco existen el modal-guia ni el formulario de personalizacion libre.
- **Fix vs feature:** feature de varias capas. Reusa el mecanismo de pestanas, pero agrega concepto de producto nuevo. Candidato a subdividir dentro del ticket.
- **Senales de match:** medicion, modelo de medicion, escala de desempeno, estandar, escalonado, mejor evidencia, personalizacion. Objetos: `aggregationMode`, `defaultEvaluationMode`, `CompetencyMatrixShell`.

### C5 · Niveles de desarrollo por competencia (introduce / reinforce / master) — [UPONE-1755 · parte] [FEATURE]

- **Propuesta:** en la pestana de competencias, declarar que niveles de desarrollo aplica cada competencia (solo introduce, o introduce + master, etc.), tomandolos de la asociacion del esquema de nivel de desarrollo.
- **Ya existe:** el catalogo I/R/M existe como semilla (`curriculum-mapping/seed/_data-coveragescheme.js`, "Introduce / Reinforce / Master"). Hoy el nivel de cobertura solo se usa en la tributacion (`CompetencyAlignment.coverageLevelId`), no a nivel de la competencia.
- **Falta:** no hay campo en la matriz ni en la competencia que asocie que niveles aplican, ni UI en `CompetencyTreeEditor` para declararlos. Es campo + UI nuevos.
- **Fix vs feature:** feature acotada. El catalogo es reusable; la asociacion por competencia no existe.
- **Senales de match:** nivel de desarrollo, introduce, reinforce, master, cobertura, competencia. Objetos: `CoverageScheme`, `CompetencyAlignment.coverageLevelId`, `CompetencyTreeEditor`. Posiblemente el mismo ticket que C4 ("y otros ajustes").

### C6 · Tributacion (relacion asignatura a competencia) — [UPONE-1756] [FEATURE grande]

- **Propuesta:** capability habilitada por tener Curriculum Mapping, pero la accion se ejecuta desde Curriculum Design (plan de estudio). Vistas por asignatura y por competencia; tipo de contribucion (desarrolla / evalua), nivel de desarrollo, y calculo automatico de porcentajes (reparto ponderado). Tributacion masiva: una competencia a muchas asignaturas de distintos periodos, o muchas competencias a una asignatura. Alcance del sprint: al menos un flujo operativo.
- **Ya existe:** solo el **esquema de datos**: `CompetencyAlignment` con `sourceType`, `competencyNodeId`, `coverageLevelId` y `contributionType` (Develops / Evaluates / Both). El gate de capability por tab (`requiredCapability`) y la capability cross-mod (`mod/curriculum-mapping:view|edit`) existen como mecanismo, hoy sin consumidor.
- **Falta:** casi todo: no hay resolver ni mutation de escritura, no hay capabilities `competencyalignment:*`, no hay UI (ni por asignatura ni por competencia ni masiva) y, critico, **el objeto no tiene campo de peso/porcentaje** (`weight`). El reparto automatico de porcentajes no tiene donde persistirse hoy.
- **Reuso:** la malla (`curriculum-design CurriculumMesh`) sirve como **patron**, no como componente: esta acoplada a `planEntry`, periodos y prerrequisitos, mientras que la tributacion es una matriz curso x competencia (heatmap). `MatrixAdoption` (alta masiva con filtro) es buen patron para lo masivo.
- **Fix vs feature:** feature grande, necesita spike y subdivision. Incluso el "minimo viable" (visualizar + cargar datos) exige construir el resolver de escritura y agregar el campo de peso, porque el objeto no tiene punto de escritura hoy.
- **Senales de match:** tributacion, contribucion, desarrolla, evalua, masiva, porcentaje, plan de estudio. Objetos: `CompetencyAlignment`, `CurriculumMesh`, `MatrixAdoption`. El titulo del ticket quedo incompleto ("Curriculum Mapping | Tributacion | ").

### C7 · Diagnostico de reconciliacion MCP por modulo — [UPONE-1757 · 1758] [DIAGNOSTICO]

- **Propuesta:** dos tickets espejo (Curriculum Design y Curriculum Mapping): evaluar la conformidad de cada mod con el MCP e inventariar la logica de negocio que quedo en el cliente y deberia migrar a los servicios. No es implementacion; salvo lo que resulte de implementacion simple.
- **Ya existe:** el MCP MVP oficial esta listo (UPONE-1744, Finalizada). Ambos mods ya estan conectados: **Curriculum Design** con 4 fichas reales (validate evaluations, create formtemplate, add/remove plan entries); **Curriculum Mapping** en **solo lectura** (`tools: []`, ninguna mutation gobernada expuesta como ficha).
- **Inventario (evidencia) de logica en el front que deberia estar en servicios:**
  - CM: reparto parejo de pesos `CompetencyTreeEditor/weights.ts distributeEvenly` y `CompetencyRubricEditor/rubric.ts`.
  - CM: herencia del umbral min entre niveles `LevelSchemeEditor/useLevelSchemeEditor.ts syncMinThresholds` (marcada "es de dominio").
  - CD: default de `minToSatisfy` de bloque electivo `CurriculumMesh.logic.ts deriveMinToSatisfy`.
  - CD: resumen agregado del plan `curriculumMesh.logic.ts groupByPeriod / computeSummary`.
  - Molde a replicar: `weightedSum.js` (helper puro + paridad + ficha MCP).
- **Fix vs feature:** diagnostico (el sprint no implementa). El inventario es exactamente el "desglose" que Eduardo tiene para registrar.
- **Falta definir:** ver C-biz-3: el hallazgo de que Curriculum Mapping esta read-only en MCP es alcance mas amplio que "reconciliar logica cliente"; conviene decidir si exponer sus mutations entra en el diagnostico o queda para despues.
- **Senales de match:** MCP, reconciliacion, diagnostico, servicios, ficha, ModPack. Objetos/rutas: `ai/index.js`, `ai/tools.js`, los helpers listados.

### C8 · Extender layouts / apps al tenant TEST — [SIN TICKET] [FIX de config]

- **Propuesta:** primer paso para el equipo que carga datos: hacer visibles las apps (curriculum-design, assessment) en el tenant TEST, que hoy solo estan configuradas para el tenant UPU. Klaus confirmo que es "decision de programacion" (mandar config).
- **Ya existe:** los layouts son JSON con un campo `tenants[]` (ej. `["TEST","UPU"]`), documentado en `up1-layout/docs/reference/default-layouts.md` y ejecutado por el sync de object-manager. El mecanismo esta completo.
- **Falta:** agregar el tenant al array del layout / app.json correspondiente y correr el sync. Sin cambio de codigo.
- **Fix vs feature:** fix de configuracion. Verificar mayusculas/minusculas del identificador de tenant ("TEST" vs "test") contra los ejemplos reales.
- **Senales de match:** layout, tenant, TEST, UPU, visibilidad de apps, sync. Objetos: `tenants[]`, `config/app.json`, sync de object-manager. Podria modelarse como subtarea de UPONE-1748.

### C9 · Roles internos / normalizacion del rol admin — [UPONE-1615] [hallazgo]

- **Propuesta:** continuar la logica de roles internos (Curriculum Design y Curriculum Mapping) y normalizar el rol admin para que muestre todo sin restriccion. Estimado en 5 SP porque gran parte de la exploracion se hizo el sprint anterior.
- **Ya existe:** el ticket **ya existe** (UPONE-1615, estado Refinement, 5 SP, asignado a Eduardo Bacon). Modelo de roles generico (`core_Role`, archetype sysadmin/admin/manager/user); el rol Admin recibe todas las capabilities via seed (fila por fila). Existe un rol centinela `__unassignable__`, que es un mecanismo interno distinto, no un "administrador global" de negocio.
- **Hallazgo:** en el codigo **no existe** un rol "administrador global" ni un mecanismo de "normalizacion"/bypass total. Lo que hay es una lista de capabilities materializadas por seed. El nombre usado en la reunion no tiene correlato directo en el codigo.
- **Falta definir:** ver C-biz-2: aclarar que significa "normalizar el rol admin" antes de estimar (mecanismo de bypass real vs materializar bien el seed).
- **Senales de match:** rol interno, admin, administrador global, normalizar, RBAC, capabilities. Objetos: `core_Role`, seed de capabilities, `authChecker.js`.

## 04 · Esfuerzo aproximado (grueso, para decidir alcance)

Estimacion relativa para decidir que entra; no es compromiso. La estimacion fina la hace el equipo sobre el ticket ya creado.

| Bloque | Nivel | Nota |
|---|---|---|
| C1 Dashboard | Medio | 13 SP fijados por el PO; fix de config |
| C2 Carga Ibero | Medio-Alto | 13 SP fijados; config + diagnostico |
| C3 Menus/terminologia | Bajo-Medio | UI acotada, depende de nomenclatura |
| C4 Medicion | Alto | Feature multi-capa, subdividir |
| C5 Niveles por competencia | Medio | Campo + UI; posible parte de C4 |
| C6 Tributacion | Alto | Spike; sprint hace el minimo viable |
| C7 Diagnostico MCP | Medio | Sin implementacion; 2 tickets |
| C8 Layout tenant TEST | Bajo | Config JSON + sync |
| C9 Roles | Medio | 5 SP; aclarar alcance del "admin" |

> **Lectura de capacidad:** el equipo mod (Francisco + Eduardo) queda cargado principalmente con la matriz (C3-C5) y la tributacion (C6); Eduardo suma roles (C9, 5 SP) y el diagnostico MCP (C7). Los que se suman (Giovanni/Alex y Gian/Daniel) toman el dashboard (C1) y la carga Ibero (C2), 13 SP cada una, con C8 como primer paso. En la reunion se dejo abierto el trade-off tributacion vs MCP: si el sprint se llena, la decision es cuanto de C6 se compromete frente a dejar espacio a C7.

## 05 · Preguntas abiertas (indagadas, dirigidas)

Solo lo que no se pudo cerrar con el codigo y Jira. Cada una lleva su evidencia.

**Negocio / PO (Esteban) · C-biz-1 — Nomenclatura: se renombra "Esquemas de cobertura" a "Esquema de niveles de desarrollo", o al reves?**
El titulo de UPONE-1753 pide llamarlo "Esquema de niveles" y la reunion dijo que "antes se llamaba esquema de cobertura". Pero el codigo documenta la decision inversa ya tomada: legacy = "Niveles de Desarrollo", vigente = "cobertura curricular / coverageScheme" (`curriculum-mapping/docs/competency-management-proposal.md`). Afecta el alcance de renombrado de C3 y C5. Recomendacion: fijar la nomenclatura final antes de estimar, porque toca objetos, layouts y textos.

**Negocio / PO (Esteban) · C-biz-2 — Que significa exactamente "normalizar el rol admin"?**
En el codigo no existe un "administrador global" ni un bypass total: el rol Admin recibe todas las capabilities por seed, fila por fila. Opciones: (a) implementar un mecanismo real de bypass en `core_Role`/`authChecker`; (b) solo materializar/consolidar bien el seed de capabilities. Cambia el alcance de UPONE-1615 (hoy 5 SP en Refinement).

**Negocio / PO (Esteban) · C-biz-3 — El diagnostico MCP de Curriculum Mapping, incluye exponer sus mutations como fichas, o solo inventariar la logica cliente?**
Curriculum Mapping esta hoy read-only en el MCP (`tools: []`): sus mutations gobernadas (upsert de esquemas y matriz) existen pero ninguna esta expuesta como ficha. Eso es alcance mas amplio que "reconciliar logica del cliente". Definir si entra en UPONE-1758 o queda para un ticket de implementacion posterior.

**Core team / otros devs (Eduardo, Juandi) · C-core-1 — La vista de tributacion se puede resolver ampliando CurriculumMesh, o hay que construir un componente nuevo con el mismo patron?**
En la reunion se dijo que la vista es "muy similar" al componente de malla que ya existe. El codigo muestra que `CurriculumMesh` esta acoplado a `planEntry`, periodos y prerequisitos (grid por periodo), mientras que la tributacion es una matriz curso x competencia (heatmap). Reutilizable como patron, no como pieza. Si es lo segundo, el "minimo viable" de C6 es mas caro de lo estimado.

**Core team / otros devs (Eduardo) · C-core-2 — El flujo minimo de tributacion entra en el sprint sabiendo que exige tocar el modelo de datos?**
`CompetencyAlignment` no tiene campo de peso/porcentaje y no hay resolver de escritura ni capabilities. Aun el escenario minimo (visualizar + cargar datos) requiere agregar `weight` al objeto, crear el resolver de upsert y las capabilities. Confirmar si eso cabe en SP10 o se acota a solo visualizar con datos sembrados a mano.

**Core team / otros devs (Eduardo) · C-core-3 — UPONE-1754 (mover el componente Indicadores a core) es prerequisito del dashboard (C1)?**
El dashboard de C1 depende de indicadores/plantillas de reporte. Existe un ticket separado para mover el componente Indicadores a core. Definir el orden: si el dashboard necesita ese componente ya en core, 1754 bloquea a 1747.

**Infra / Plataforma (Klaus) · C-infra-1 — Los objetos ya existen en el tenant TEST, o quedaron atras por trabajar solo en UPU? Se sincronizan entre tenants automaticamente?**
Eduardo indico que los cambios se han bloqueado para trabajar solo en UPU por rapidez, dejando otros tenants potencialmente desactualizados. Si los objetos no estan en TEST, primero hay que desplegar la config (C8) para que existan, antes de poder cargar datos con la cuenta de servicio (C2). Bloquea a C2. (Esteban ya iba a preguntarlo en el chat de migracion.)

**Infra / Plataforma (Klaus) · C-infra-2 — Cual es el flujo para desplegar las apps de assessment/evaluacion en el tenant TEST?**
En TEST no aparecen las apps de assessment. Klaus confirmo que hacer visibles las apps en un tenant es "decision de programacion" (mandar la config de layouts). Se resuelve con el mismo mecanismo de C8 (campo `tenants[]`).

## 06 · Fuera de alcance del sprint

- Implementar las estructuras/capacidades que el diagnostico de la carga Ibero (C2) marque como no mapeables: se documentan para el proximo sprint, no se construyen ahora.
- Migracion MCP completa: C7 es diagnostico e inventario, no implementacion (salvo ajustes de implementacion simple que se decidan sobre la marcha).
- Tributacion completa: el sprint apunta a un solo flujo operativo minimo; las dos vistas completas (por asignatura y por competencia), la accion masiva y las validaciones ricas se difieren.
- Cuentas de servicio y despliegue de apps: los maneja Esteban a nivel de configuracion/infra, no son tickets de desarrollo.
- Adopcion de la maqueta como diseno final: prevalece el patron existente de UP1 (programa de asignatura) por sobre la maqueta.

---

Material de consulta generado por kn-identify-scroll. Verificado contra el codigo real de los repos up1 (curriculum-design, curriculum-mapping, layout, object-manager, mcp) y contra Jira (UPONE) el 2026-08-31. No crea tickets: los crea el PO en Jira; el detalle exhaustivo por ticket lo arma kn-detective-mode tomando este documento y el transcript como contexto. Estado: decidido, para revision e iteracion.
