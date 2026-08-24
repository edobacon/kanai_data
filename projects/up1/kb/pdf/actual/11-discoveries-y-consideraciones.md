---
id: SPEC-reassess-021
project: up1
type: spec
module: reassess
tags: [assessment, discoveries, puntos-ciegos, milestone, api-v1-v2, duplicacion-bd, dependencias-externas, competencias, migracion]
relates: []
clients: []
modules: [improve-api, class-api, core-api]
risk: very-high
---
# 11 — Discoveries y Consideraciones: Lo Que el Informe No Vio

El informe ReAssess (Dictuc/Dilab, enero 2026) hizo un diagnostico acertado de los dolores de los clientes. Pero su alcance era conceptual — no incluia revision del codigo, la base de datos ni la arquitectura interna. Al cruzar sus hallazgos con el estado real del sistema, emergen puntos ciegos que tienen impacto directo en la planificacion de la migracion a uP1.

Este documento describe cada discovery, explica por que importa, y plantea las consideraciones que deben tenerse en cuenta.

---

## Discovery 1: El sistema de Hitos (Milestone) es una funcionalidad madura que el informe no menciona

### Que encontramos

uAssessment tiene un sistema completo de medicion de logro de competencias basado en hitos programaticos. Un hito es un punto de control en la carrera (por ejemplo: "al terminar el segundo ano") donde el estudiante debe demostrar un conjunto de competencias de forma integrada, a traves de situaciones evaluativas que agregan evidencia de multiples cursos.

El sistema incluye:
- Definicion de hitos con situaciones evaluativas, componentes y competencias asociadas
- Intentos del estudiante con resultado final (aprobado/no aprobado)
- Puntajes por componente, por situacion evaluativa y por competencia
- Tres niveles de reportes (individual, grupal, global) con graficos D3 y exportacion a Excel
- Reportes por cohorte, por campus, por programa, con indicadores globales
- Comparacion de progresion de un estudiante a traves de multiples hitos

Es, en muchos sentidos, la funcionalidad mas sofisticada del sistema actual. Los reportes de milestone son los mas ricos en visualizacion (graficos radar, barras apiladas, matrices de color) y los mas utiles para procesos de acreditacion.

### Por que el informe no lo vio

El informe se baso en entrevistas con clientes y con el equipo de producto. Es posible que los clientes entrevistados no usen activamente los hitos (no todas las universidades los implementan), o que el equipo de producto no lo haya priorizado en las conversaciones.

### Por que importa para la migracion

El informe propone tres modulos (Curriculum Management, Curriculum Mapping, uAssessment) y una extension futura de "rutas de aprendizaje". Pero no menciona el concepto de hitos como funcionalidad existente ni como parte de la propuesta.

**Riesgo**: Si la migracion a uP1 se planifica solo desde el informe ReAssess, los hitos podrian quedar fuera del alcance. Las universidades que ya usan esta funcionalidad perderian una capacidad critica para acreditacion.

### Consideraciones

1. **Incluir Milestone como funcionalidad de Learning Assessment en uP1**. No es una extension futura — ya existe y hay clientes que la usan.
2. **Unificar las dos cadenas de medicion**. Hoy Graduation Profile y Milestone coexisten sin integrarse. uP1 tiene la oportunidad de disenar una sola cadena que cubra ambos modelos (medicion continua por curso + medicion en checkpoints programaticos).
3. **Los niveles de logro de Milestone estan hardcodeados** (0-30% No lograda, 31-59% Escasamente lograda, etc.), a diferencia de Graduation Profile que es configurable por universidad. En uP1 ambos deben ser configurables.
4. **Los reportes de Milestone son los mas valiosos para acreditacion**. Si se pierden en la migracion, se pierde una ventaja competitiva real.

---

## Discovery 2: La API tiene dos versiones activas en produccion sin plan de retiro

### Que encontramos

El backend de uAssessment tiene mas de 300 endpoints distribuidos en dos versiones:

- **V1** (ruta `/`): La version original. Funciona, pero **no tiene middleware de verificacion de permisos estandarizado**. Cualquier usuario autenticado puede, en teoria, acceder a datos que no le corresponden.
- **V2** (ruta `/v2/`): La version nueva. Tiene middleware de permisos (`checkPermission`, `checkRolesMiddleware`), documentacion Swagger, y paginacion estandarizada.

Ambas versiones estan activas simultaneamente. El frontend viejo (AngularJS) consume V1. El frontend nuevo (Vue) consume V2. No hay documentacion ni plan para retirar V1.

### Por que el informe no lo vio

Es un problema puramente tecnico, invisible desde la perspectiva del usuario. Las entrevistas con clientes no pueden detectar duplicacion de API.

### Por que importa para la migracion

1. **Riesgo de seguridad activo**: Los endpoints V1 no verifican permisos. Esto no es teoria — es el estado actual de produccion. Un usuario tecnico que conozca las rutas V1 puede acceder a datos de otros roles.

2. **Complejidad de migracion**: Al mapear los endpoints actuales a resolvers GraphQL de uP1, hay que decidir cual version es la "fuente de verdad" para cada operacion. En muchos casos la logica difiere entre V1 y V2 para el mismo dominio.

3. **Deuda oculta**: Cada vez que un desarrollador agrega funcionalidad nueva, debe decidir si hacerlo en V1, V2 o ambas. En la practica, se hace en V2 y V1 queda congelada — pero no se retira, acumulando codigo muerto.

### Consideraciones

1. **No migrar V1 a uP1**. La migracion debe basarse exclusivamente en V2 como referencia de logica de negocio. V1 es deuda, no funcionalidad.
2. **Antes de la migracion, auditar que consumidores activos tiene V1** que no tienen equivalente V2. Si existen, migrarlos a V2 primero.
3. **El problema de seguridad de V1 deberia corregirse independientemente de la migracion** — es un riesgo activo en produccion.

---

## Discovery 3: La duplicacion de esquema curso/seccion afecta 21+ tablas

### Que encontramos

La base de datos tiene un patron de duplicacion sistematico: las tablas de curso (`imp_course_*`) se replican casi identicamente para secciones (`imp_section_*`). Esto incluye:

- Evaluaciones: `imp_course_evaluationcomponents` (99k filas) ↔ `imp_section_evaluationcomponents` (799k filas)
- Referencias: `imp_course_references` (60k) ↔ `imp_section_references` (396k)
- Unidades: `imp_course_units` ↔ `imp_section_units`
- Contenidos: `imp_courseunit_contents` ↔ `imp_sectionunit_contents`
- Resultados de aprendizaje: `imp_course_outcomes` ↔ `imp_section_outcomes`
- Estrategias: `imp_course_learningstrategies` ↔ `imp_section_learningstrategies`

Son 21+ tablas que tienen la misma estructura y el mismo proposito pero para dos entidades distintas. La tabla de seccion es tipicamente **8 veces mas grande** que la de curso.

### Por que el informe no lo vio

Es un problema de esquema de base de datos, invisible en entrevistas con usuarios. El informe si detecta el sintoma: la carga de datos es costosa y la herramienta es rigida. Pero no identifica la causa estructural.

### Por que importa para la migracion

1. **Migracion de datos duplicada**: Al migrar a uP1, cada par de tablas (curso + seccion) debe consolidarse en un solo modelo con herencia. Esto no es un `INSERT INTO ... SELECT` — requiere transformacion logica.

2. **La tabla mas grande del sistema (799k filas) es una de estas duplicadas**: `imp_section_evaluationcomponents` participa en las consultas mas costosas del sistema. La migracion de esta tabla requiere estrategia especifica (importacion asincrona en lotes).

3. **Inconsistencias entre pares**: A lo largo de los anos, se han agregado campos a tablas de curso que no existen en tablas de seccion (o viceversa). La migracion debe reconciliar estas diferencias.

### Consideraciones

1. **En uP1, un solo objeto con herencia configurable reemplaza ambos conjuntos de tablas**. El programa de curso define la estructura base, el syllabus hereda automaticamente, y la configuracion de libertad evaluativa (BR-LIB-001) controla que puede modificar el docente.
2. **La migracion de datos debe incluir un paso de reconciliacion** que identifique y resuelva inconsistencias entre tablas de curso y seccion antes de consolidar.
3. **La volumetria (799k filas) requiere importacion asincrona**. El threshold de 500 filas del `importInstances` de uP1 esta pensado para esto.

---

## Discovery 4: Los datos de estructura academica y notas vienen de otros modulos

### Que encontramos

uAssessment no es un sistema autocontenido. Depende de datos que administran otros modulos de la plataforma uPlanner:

- **Estructura academica** (instituciones, facultades, carreras, periodos): Viene del modulo **Core** (`core-api`). uAssessment lee estas tablas pero no las crea ni las modifica. Si Core no tiene una facultad configurada, uAssessment no puede crear un plan de estudio para ella.

- **Notas de estudiantes** (`asm_student_marks`): Viene del modulo **Class** (`class-api`). Es la fuente primaria de datos para toda la cadena de medicion Graduation Profile. Sin estas notas, los reportes de logro de competencias no tienen datos.

- **Docentes por seccion** (`cls_sections_teachers`): Tambien de Class. Es lo que permite que un docente vea "sus" secciones. El bug del docente fantasma "UPLANNER NO DEFINIDO" (BUG-011) vive en esta tabla de otro modulo.

- **Estudiantes por seccion** (`cls_students_sections`): De Class. Necesario para saber que estudiantes estan en cada seccion y calcular su logro.

### Por que el informe no lo vio

El informe trata a uAssessment como un producto independiente. No analiza las dependencias tecnicas con otros modulos de la plataforma.

### Por que importa para la migracion

1. **uP1 debe ser autocontenido**. No puede depender de Core y Class como fuentes de datos. El Object Manager de uP1 centraliza todos los datos y cada workspace accede via GraphQL. Esto significa que los datos que hoy vienen de Core y Class deben tener una nueva fuente en uP1.

2. **Las notas son criticas y no viven en uAssessment**. En uP1, las calificaciones ingresan desde tres posibles fuentes: la app Attendance & Grades (parte de uP1), integraciones con SIS (Banner, Anthology), o integraciones con LMS (Brightspace, Canvas). Este es un cambio fundamental: la fuente de notas cambia.

3. **El bug del docente fantasma (BUG-011) esta en una tabla de otro modulo**. No se puede corregir desde improve-api. En uP1, con validaciones automaticas del Object Manager, este tipo de dato corrupto no deberia poder crearse.

4. **La migracion de datos necesita considerar que datos vienen de fuera**. No basta con migrar las 162 tablas `imp_*` — tambien hay que garantizar que los datos de Core y Class (o sus equivalentes en uP1) esten disponibles.

### Consideraciones

1. **Definir explicitamente que datos son "de assessment" y cuales son "de la plataforma"**. En uP1, la estructura academica la administra cada tenant, y las notas entran por Attendance & Grades o integraciones. Esto debe estar documentado como contrato.
2. **La migracion debe incluir un plan de datos para las tablas de Core/Class** que uAssessment consume. No migrar solo lo que vive en `imp_*`.
3. **Validar que los contratos de datos se cumplan antes de activar reportes**. Si los reportes de logro de competencias dependen de notas, y las notas aun no estan fluyendo en uP1, los reportes mostraran vacios.

---

## Discovery 5: El dominio de competencias — el mas valioso — tiene la peor interfaz y el bug mas grave

### Que encontramos

Las matrices de competencias, la tributacion de cursos, el seguimiento de logro y las evidencias son **el diferenciador de producto** de uAssessment. Es lo que lo separa de un simple gestor de documentos curriculares. Sin embargo:

- **100% en AngularJS**: No hay ni una sola pagina Vue para competencias. Es el unico dominio principal que no fue priorizado en la migracion de frontend. La interfaz es la mas vieja, la mas lenta y la que menos se puede personalizar.

- **Bug critico activo (BUG-012)**: La funcion que actualiza vinculos de tributacion puede dejar datos inconsistentes. Desactiva vinculos existentes sin garantizar la creacion de los nuevos. Es probablemente la causa del incidente de perdida de datos de Uniandes.

- **Tributacion no se propaga automaticamente**: Cuando un coordinador tributa un curso a una competencia, los syllabus existentes no se enteran. No hay reconciliacion. Esto genera reportes incompletos que los usuarios no saben interpretar.

- **Dos cadenas de medicion sin integrar**: Graduation Profile y Milestone coexisten mostrando datos diferentes al mismo usuario.

### Por que el informe no lo vio como problema tecnico

El informe detecta los sintomas ("los reportes no responden", "falta de personalizacion", "desconfianza") pero no identifica que el dominio de competencias es el epicentro tecnico de todos esos sintomas. Propone correctamente el Modulo 2 (Curriculum Mapping) como oportunidad, pero no sabe que la implementacion actual de ese dominio es la mas fragil del sistema.

### Por que importa para la migracion

Este descubrimiento invierte las prioridades intuitivas. Uno podria pensar que el Modulo 1 (Curriculum Management — gestion de planes y syllabus) deberia migrarse primero porque es el "entry point" de venta. Pero desde la perspectiva tecnica:

- Los planes de estudio y syllabus ya tienen interfaz Vue parcial y logica V2 funcional. Su migracion es de menor riesgo.
- Las competencias no tienen nada en Vue, tienen un bug critico activo, y son el nucleo del valor de producto.

### Consideraciones

1. **Competencias debe ser la primera prioridad tecnica de uP1**, aunque comercialmente el Modulo 1 sea el entry point de venta. El valor diferencial esta aqui.
2. **Corregir BUG-012 independientemente de la migracion**. Es un riesgo activo en produccion que puede causar mas incidentes como el de Uniandes.
3. **La migracion de competencias es la de mayor riesgo y mayor impacto**. Incluye: modelo de datos (jerarquia de matrices), logica de tributacion (con propagacion automatica), calculo de logro (unificando Graduation + Milestone), y reportes (preservando los sofisticados reportes de hitos).
4. **Usar la migracion como oportunidad para resolver la deuda acumulada**: propagacion automatica de tributacion, transacciones en operaciones criticas, cadena de medicion unificada, niveles de logro configurables (no hardcodeados).

---

## Resumen de discoveries y su impacto

| # | Discovery | Impacto si no se considera |
|---|-----------|--------------------------|
| 1 | Sistema de Hitos no contemplado en el informe | Universidades que usan hitos pierden funcionalidad critica para acreditacion |
| 2 | API con dos versiones sin plan de retiro | Se migra codigo muerto o se deja deuda de seguridad activa |
| 3 | Duplicacion de 21+ tablas curso/seccion | Migracion de datos se duplica en esfuerzo, inconsistencias no se reconcilian |
| 4 | Datos de estructura y notas vienen de otros modulos | Reportes sin datos en uP1 hasta que se establezcan las nuevas fuentes |
| 5 | Competencias es el dominio mas valioso con la peor infraestructura | Se prioriza mal la migracion y se perpetua la deuda mas costosa |
