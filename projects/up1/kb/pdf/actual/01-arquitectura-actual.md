---
id: SPEC-reassess-011
project: up1
type: spec
module: reassess
tags: [assessment, arquitectura, stack, express, sequelize, mariadb, angularjs, vue, migracion, up1]
modules: [improve-api, improve-front, suite-front]
---
# 01 — Como Esta Construido el Sistema Hoy

---

## El panorama general

uAssessment es una aplicacion web que permite a universidades gestionar su documentacion curricular (planes de estudio, programas de curso, syllabus), definir competencias y medir si los estudiantes las estan logrando. Lleva anos en produccion y atiende a instituciones en Colombia, Chile, Mexico y Peru.

El sistema actual no fue disenado desde cero como un producto unificado, sino que crecio organicamente sobre una plataforma compartida (la "sandbox" de uPlanner) que tambien alberga otros productos como Class, Core y Admin Panel. Esto tiene implicancias importantes: uAssessment comparte base de datos, infraestructura de autenticacion y parte del frontend con otros modulos que no tienen relacion funcional con gestion curricular.

## Las tres capas del sistema

### 1. Lo que ve el usuario (Frontend)

El usuario final interactua con **dos interfaces distintas que coexisten en la misma pantalla**:

- **La interfaz nueva** (Vue/Nuxt 2): Representa el 36% de las vistas. Incluye las listas de planes de estudio, syllabus y algunos detalle. Es mas rapida, tiene mejor diseno y usa componentes modernos.

- **La interfaz vieja** (AngularJS): Representa el 64% de las vistas. Se carga dentro de la nueva mediante "iframes" — ventanas incrustadas que muestran la version anterior. El usuario percibe esto como inconsistencias visuales, tiempos de carga diferentes, y en ocasiones comportamiento inesperado al navegar entre secciones.

**Por que coexisten**: La migracion de Angular a Vue se inicio pero no se completo. Las areas mas criticas del producto (competencias, seguimiento de logro, configuracion) siguen 100% en la interfaz vieja.

### 2. La logica del sistema (Backend API)

Detras de las interfaces hay un servidor Express.js con mas de 300 endpoints (puntos de acceso a datos y operaciones). Este servidor se encarga de:

- Recibir las acciones del usuario (crear un syllabus, aprobar un plan, generar un reporte)
- Aplicar reglas de negocio (quien puede hacer que, en que estado, con que datos)
- Consultar y guardar datos en la base de datos
- Generar archivos de descarga (PDF, Excel, ZIP)

**El problema mas importante del backend** es que tiene **dos versiones de API activas simultaneamente** (V1 y V2). La version vieja no tiene control de permisos estandarizado — cualquier usuario autenticado puede, en teoria, acceder a datos que no le corresponden. La version nueva corrige esto, pero ambas sirven datos en produccion al mismo tiempo, y no hay plan documentado para retirar la version vieja.

### 3. Los datos (Base de datos MariaDB)

Toda la informacion vive en 162 tablas de MariaDB. Planes de estudio, cursos, secciones, competencias, evaluaciones, matrices, historiales, catalogos — todo esta aqui. La tabla mas grande tiene casi 800,000 filas (las evaluaciones de cada seccion de syllabus).

**La complejidad principal** es que las tablas de cursos y las tablas de secciones/syllabus son **practicamente identicas**. Cuando un programa de curso define sus contenidos, evaluaciones y referencias, esas mismas estructuras se replican para el syllabus. Esto genera 21+ tablas duplicadas con la misma estructura, y cualquier cambio en el esquema debe hacerse en dos lugares.

## Las tres piezas de codigo

| Repositorio | Que contiene | Donde vive |
|-------------|-------------|------------|
| sandbox-api/improve-api | Toda la logica de negocio, endpoints, consultas a BD | Backend |
| sandbox-front/improve-front | La interfaz vieja en AngularJS (35+ rutas, 27 controllers) | Frontend legacy |
| suite-front/pages/assessment | La interfaz nueva en Vue (33 paginas, 12 nativas + 21 iframes) | Frontend moderno |

Estas tres piezas viven en repositorios diferentes y se despliegan de forma independiente, pero comparten la misma base de datos y el mismo sistema de autenticacion.

## Problemas estructurales que importan

### La dualidad viejo/nuevo genera confusion

No es solo un tema estetico. Cuando un usuario navega de "Lista de syllabus" (Vue, moderno) a "Editar matriz de competencias" (Angular, iframe), cambia el look, cambia la velocidad, y cambia el nivel de proteccion de permisos. Para el usuario es la misma herramienta, pero internamente son dos sistemas distintos.

### La personalizacion esta en el codigo, no en la configuracion

Cada universidad que usa uAssessment tiene necesidades diferentes: distintos nombres para las mismas cosas ("asignatura" vs "materia" vs "curso"), distintos flujos de aprobacion, distintos reportes. Hoy, muchas de estas diferencias se resuelven con codigo especifico por cliente (40+ plantillas de reportes, por ejemplo). Esto significa que cada cambio de reporte para un cliente requiere que un desarrollador modifique codigo y despliegue una nueva version del sistema.

### Una tabla controla tres dominios

La tabla `imp_program_structure` define como se comportan los campos y la jerarquia para tres areas funcionales distintas: planes de estudio, syllabus y programas de curso. Es el "control central" del wizard de estructura. Si se modifica para mejorar el comportamiento de syllabus, puede afectar involuntariamente a planes de estudio.

### No hay integraciones con sistemas externos

uAssessment no se conecta con Banner (el sistema academico de Ellucian que usan varias universidades), ni con Brightspace (el LMS de D2L), ni con ningun otro sistema. Esto obliga a los clientes a cargar datos manualmente — exactamente el dolor #1 del informe ReAssess.

## Que cambia con uP1

uP1 resuelve estos problemas desde su diseno:

| Problema actual | Como lo resuelve uP1 |
|-----------------|---------------------|
| Dos interfaces coexistentes | Una sola app (Nuxt 4) con componentes unificados del Layout Engine |
| Dos versiones de API sin deprecar | Una sola API GraphQL centralizada (Object Manager) |
| Personalizacion en codigo | Configuracion por datos: layouts JSON, i18n por tenant, theming CSS |
| Una tabla que controla tres dominios | Objetos JSON independientes por dominio, cada uno con su propio esquema |
| Sin integraciones | Integraciones bidireccionales especificadas (Banner, Anthology, LMS) |
| Base de datos compartida con otros productos | PostgreSQL con aislamiento completo por tenant |
