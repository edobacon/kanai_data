---
id: SPEC-reassess-012
project: up1
type: doc
module: reassess
tags:
  - assessment
  - backend
  - improve-api
  - endpoints
  - v1-v2
  - reportes
  - competencias
  - syllabus
  - migracion
---

# 02 — El Corazon del Sistema: Backend y Logica de Negocio

---

## Que hace el backend

El backend de uAssessment (`improve-api`) es el cerebro del sistema. Recibe cada accion que el usuario realiza — crear un plan de estudio, aprobar un syllabus, generar un reporte de logro de competencias — y decide si la accion es valida, la ejecuta, y devuelve el resultado.

Esta organizado en mas de 45 modulos, cada uno encargado de un area especifica. Los mas importantes son:

## Las areas funcionales

### Gestion curricular — el nucleo

Esta es la razon de ser del producto. Aqui vive la logica para:

- **Planes de estudio (pensums)**: Crear y versionar la malla curricular de un programa. Definir que cursos se dictan, en que orden, con que creditos. Permitir que un director de carrera estructure especialidades, bloques electivos y prerrequisitos. Tiene 14 endpoints que cubren desde la creacion hasta la descarga del plan completo.

- **Programas de curso**: Definir que cubre cada curso: descripcion, resultados de aprendizaje, contenidos, evaluaciones, bibliografia. Un coordinador puede crear, editar, versionar y clonar programas. Tiene 9 endpoints e incluye carga masiva desde archivos CSV.

- **Syllabus por seccion**: Cuando un docente toma un curso en un periodo academico, puede personalizar el programa para su seccion. El syllabus hereda la estructura del programa pero permite ajustes: agregar o quitar contenidos, modificar evaluaciones, actualizar bibliografia. Tiene 13 endpoints incluyendo clonacion individual y masiva.

**Que funciona bien**: La logica de herencia programa→syllabus existe y funciona. La clonacion masiva de syllabus (para copiar un periodo completo) tiene tracking asincrono. El versionamiento de planes de estudio es solido.

**Que esta mal**: La carga masiva de datos se hace enviando archivos CSV directamente al servidor de forma sincrona. Con volumenes altos, la operacion puede fallar por tiempo de espera. No hay paso previo de preview o validacion. No hay forma de cargar documentos PDF o Word y extraer datos automaticamente.

### Competencias y tributacion — el valor diferencial

Esta area es la que diferencia a uAssessment de un simple gestor documental. Permite:

- **Matrices de competencias**: Definir que competencias debe desarrollar un egresado, organizarlas jerarquicamente, establecer niveles de logro (introductorio, intermedio, avanzado) y umbrales de aprobacion. Tiene 11 endpoints e incluye transiciones de estado (draft → aprobada → vigente).

- **Tributacion**: Mapear que cursos contribuyen a que competencias. Por ejemplo: "Calculo I tributa a Pensamiento Analitico en nivel introductorio". Esta relacion es lo que permite despues medir si un estudiante esta logrando el perfil de egreso.

- **Seguimiento de logro**: Medir cuanto ha avanzado un estudiante en cada competencia, comparando su desempeno en las evaluaciones con los umbrales definidos.

**Que funciona bien**: El modelo de datos de competencias esta bien disenado. La jerarquia matrices → competencias → niveles → umbrales es limpia y normalizada. La logica de tributacion a nivel de curso es funcional.

**Que esta mal**: Existe un bug critico (BUG-012) donde la operacion que vincula resultados de aprendizaje con niveles de competencia puede dejar datos incompletos si falla a mitad de camino. El sistema desactiva los vinculos existentes antes de crear los nuevos, pero si la creacion falla, los vinculos quedan desactivados sin reemplazo. Este es probablemente el mecanismo detras de la perdida de datos que reporto la Universidad de los Andes.

Ademas, la tributacion opera **solo a nivel de curso, no de seccion**. Los vinculos del programa de curso no se propagan automaticamente al syllabus. Si un coordinador tributa despues de que los docentes ya crearon sus secciones, las secciones no se enteran. No hay reconciliacion automatica.

### Reportes — donde mas duele

Los reportes son la forma en que las universidades obtienen valor del sistema: ver si el curriculo esta alineado, si los estudiantes estan logrando las competencias, donde hay brechas. uAssessment tiene **mas de 45 endpoints dedicados a reportes**, lo que lo convierte en el area mas voluminosa del backend.

**Que funciona bien**: Los reportes V2 tienen un patron consistente con paginacion, filtros y doble validacion de permisos (frontend + backend). El framework de filtros en cascada (FilterConfig) es solido y reutilizable. Hay 4 reportes custom en Vue con especificaciones completas.

**Que esta mal**: 
- **40+ plantillas de reportes estan en el codigo**, organizadas por cliente. Cada universidad tiene sus propios reportes hardcodeados. Cambiar el reporte de UST-CFT requiere modificar codigo y desplegar.
- **La consulta mas critica cruza 12 tablas en una sola query**: La funcion `_getEvaluationMarks`, que obtiene las notas de evaluacion vinculadas a competencias, hace JOIN de 12 tablas simultaneamente. Su rendimiento es impredecible segun el volumen de datos del cliente.
- **Dos sistemas de medicion coexisten sin integrarse**: "Graduation" mide logro agrupando por competencia (necesita saber a que plan pertenece el estudiante). "Milestone" mide logro agrupando por resultado de aprendizaje directamente (sin referencia al plan). Cada uno muestra una vista parcial de la realidad, y no hay una pantalla que los unifique.

### Organizacion academica y catalogos — la base

14 modulos "de soporte" que gestionan los datos de referencia: instituciones, facultades, carreras, periodos academicos, modalidades, metodos de evaluacion, estrategias de ensenanza, tipos de alineacion, etc. Son la infraestructura sobre la que todo lo demas se construye.

**Que funciona bien**: Son modulos simples, bien encapsulados, con bajo riesgo. La mayoria son CRUD basico.

**Que esta mal**: Nada critico. Pero la migracion implica convertir estos catalogos en "objetos base" del Object Manager de uP1, lo cual requiere definir el esquema JSON de cada uno.

## El problema de las dos versiones

El backend tiene endpoints duplicados para las mismas operaciones:
- La version vieja (V1) fue la original — funciona pero **no verifica permisos de forma estandarizada**.
- La version nueva (V2) corrige esto con middleware de seguridad, documentacion Swagger y paginacion.

**Ambas versiones estan activas en produccion**. El frontend viejo (Angular) consume V1. El frontend nuevo (Vue) consume V2. Pero nada impide que un usuario tecnico acceda directamente a un endpoint V1 sin tener los permisos correspondientes.

No hay plan documentado para retirar V1. Cada nuevo desarrollo se hace en V2, pero la deuda de V1 sigue acumulandose.

## Resumen para la migracion

| Area | Complejidad de migracion | Por que |
|------|-------------------------|---------|
| Gestion curricular (pensum, curso, syllabus) | Alta | Es el nucleo. Multiples endpoints con logica cruzada |
| Competencias y tributacion | Muy alta | Bug critico activo, dos niveles de vinculacion, propagacion manual |
| Reportes | Muy alta | 45+ endpoints, 40+ plantillas por cliente, query de 12 tablas |
| Organizacion academica y catalogos | Baja | CRUD simple, mapeo directo a objetos de uP1 |
| Workflows | Media | Logica buena pero configurable por cliente (dificil de testear genericamente) |
