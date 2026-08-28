---
id: SPEC-reassess-018
project: up1
type: doc
module: reassess
tags:
  - assessment
  - patrones
  - preservar
  - filterconfig
  - structure-handler
  - competencias
  - workflow
  - migracion
  - up1
---

# 08 — Lo Que Funciona Bien y Debe Preservarse

No todo en uAssessment es deuda tecnica. El sistema lleva anos en produccion sirviendo a universidades reales, y hay decisiones de diseno, patrones y componentes que funcionan bien. Migrar a uP1 no significa reescribir todo desde cero — significa preservar lo que funciona y corregir lo que no.

Este documento identifica lo que vale la pena llevar a uP1, ya sea como implementacion directa, como referencia de diseno, o como regla de negocio que no se debe perder.

---

## Decisiones de diseno que funcionan

### 1. Workflows configurables por cliente

**Que es**: Cada universidad puede tener su propio flujo de aprobacion. UPC puede tener 3 pasos, Uniandes 6. Los estados y transiciones se definen en la base de datos, no en el codigo.

**Por que funciona**: Cuando una universidad dice "nuestro proceso de aprobacion de syllabus es diferente", no hay que cambiar codigo. Se configura en la base de datos y el sistema se adapta. Esto ha permitido atender a universidades con procesos muy diferentes sin fragmentar el producto.

**Para uP1**: Preservar este concepto. uP1 lo mejora con auditoria inmutable y proteccion por estudiantes activos, pero la idea base de "workflow configurable por datos" es correcta.

### 2. Jerarquia de competencias bien normalizada

**Que es**: El modelo de datos que organiza las competencias sigue una jerarquia limpia: matrices → competencias → niveles → umbrales → criterios. Cada nivel tiene relaciones claras y no hay ambiguedad.

**Por que funciona**: Permite consultas como "que competencias debe lograr un egresado de Ingenieria Civil, a que nivel, y con que criterio de evaluacion" sin hacer malabares con los datos. Es la base para todos los reportes de logro.

**Para uP1**: Este modelo se mapea directamente a los objetos del Object Manager. La migracion de datos de competencias deberia ser relativamente directa.

### 3. Dos niveles de vinculacion RA↔competencia

**Que es**: Las competencias se vinculan en dos niveles:
- A nivel de **curso** (la promesa del programa: "Calculo I trabaja Pensamiento Analitico")
- A nivel de **seccion** (la practica del docente: "En mi seccion de Calculo I, evaluo Pensamiento Analitico con estos criterios")

**Por que funciona**: Permite flexibilidad. El coordinador define la tributacion general y el docente ajusta para su seccion. Una universidad centralizada puede forzar que seccion = curso; una descentralizada puede permitir que cada docente ajuste.

**Para uP1**: Este modelo de dos niveles con herencia configurable esta en el ADN de Learning Assurance. La clave es que uP1 lo mejora con propagacion automatica (lo que hoy es manual y fragil).

### 4. Conteo de estados por tipo

**Que es**: Las listas de syllabus, programas de curso y planes muestran badges con conteos: "15 en revision, 8 aprobados, 3 rechazados". Esto se calcula desde el backend usando las tablas de workflow.

**Por que funciona**: Da al coordinador una vision instantanea del estado de su carrera sin tener que abrir cada item. Es simple pero muy util para gestion.

**Para uP1**: Implementable como campo calculado en el layout de tipo RecordList.

---

## Componentes de interfaz que valen la pena

### 5. El arbol de estructura curricular (OAppStructureHandler)

**Que es**: Un componente Vue sofisticado que permite visualizar y editar la estructura de un plan de estudio, programa de curso o syllabus como un arbol jerarquico. Cada nodo del arbol puede tener diferentes tipos de campos (texto, numero, lista, evaluacion) configurados por la universidad.

**Por que funciona**: Es el componente mas complejo del sistema y resuelve un problema dificil: permitir que cada universidad defina su propia estructura curricular sin cambiar codigo. Un plan de estudio en UPC puede tener campos diferentes a uno en Uniandes, y el mismo componente los maneja.

Incluye: drag-and-drop para reordenar, comentarios por nodo, multiples instancias, formularios dinamicos, y gestion de estado (expandir/colapsar, editar/ver).

**Para uP1**: El concepto de "arbol con campos dinamicos" se mapea a RecordDetail con sections tipo `step` (wizard) en el Layout Engine. Los campos dinamicos se mapean a la definicion de objeto JSON con campos custom.

### 6. El framework de filtros en cascada (FilterConfig)

**Que es**: Un patron para filtros dependientes en reportes. Seleccionar una facultad automaticamente filtra las carreras disponibles. Seleccionar una carrera filtra los cursos. Cada filtro puede cargar sus opciones al iniciar la pagina o esperar a que el filtro padre tenga valor.

**Por que funciona**: Es reutilizable. Cada reporte nuevo puede definir su cadena de filtros declarativamente, sin reinventar la logica de cascada. Reduce significativamente el codigo necesario para agregar un reporte.

**Para uP1**: Inspirar el patron de filtros de RecordList en el Layout Engine. La configuracion declarativa de filtros es exactamente lo que los layouts JSON de uP1 necesitan.

### 7. Patron de reporte Vue consistente

**Que es**: Los reportes custom en Vue siguen un patron uniforme: layout de pagina + barra de filtros + tabs de navegacion + tabla sticky con datos. Los 4 reportes documentados siguen exactamente este patron.

**Para uP1**: Se mapea naturalmente a un layout tipo RecordList con tabs y filtros configurables en JSON.

---

## Reglas de negocio que no se deben perder

### 8. "Solo se descargan syllabus/programas publicados"

**Que es**: Cuando un usuario descarga documentos en PDF o Excel, el sistema solo incluye items que estan en estado "publicado" o "vigente". Los borradores y los items en revision no se exportan.

**Por que importa**: Evita que documentos no aprobados circulen como si fueran oficiales. Es un control de calidad importante para las universidades.

### 9. "La descarga requiere filtro por unidad academica"

**Que es**: Para generar una descarga (PDF o ZIP), el usuario debe seleccionar una facultad o carrera especifica. No se puede descargar "todo" de una vez.

**Por que importa**: Protege el rendimiento del sistema y asegura que las descargas sean manejables en tamano.

### 10. "Los estados del panel vienen filtrados por transiciones"

**Que es**: Los estados que ve un usuario en un filtro o panel no son todos los estados posibles, sino solo aquellos que son alcanzables desde el estado actual segun las transiciones configuradas para su rol.

**Por que importa**: Un docente no ve el estado "Aprobado" como opcion si su rol no tiene permiso para aprobar. Esto simplifica la interfaz y previene errores.

### 11. "Doble validacion de permisos en reportes"

**Que es**: Los reportes V2 verifican permisos dos veces: una en el frontend (para decidir si mostrar el boton/pagina) y otra en el backend (para verificar que el usuario realmente tiene acceso a los datos). Si alguien bypasea el frontend, el backend lo bloquea.

**Por que importa**: Es la forma correcta de manejar seguridad. Nunca confiar solo en el frontend.

---

## Patrones de investigacion y soporte

El equipo ha documentado en Senku patrones reutilizables para diagnosticar problemas:

### 12. "Query de diagnostico de 6 eslabones" para secciones sin datos en reportes

Cuando un reporte de logro de competencias no muestra datos para una seccion, hay una query que recorre los 6 eslabones de la cadena (seccion → evaluacion → componente → resultado de aprendizaje → nivel de competencia → competencia) para identificar donde se rompe la cadena.

### 13. "Patron de contraste caso OK vs caso fallido"

Para diagnosticar un bug, se toma una seccion donde funciona y una donde no, se comparan sus datos en cada eslabon, y se identifica la diferencia.

### 14. "Tres mundos que se conectan" para explicar reportes complejos

Los reportes de logro de competencias conectan tres mundos: el mundo academico (cursos, secciones, estudiantes), el mundo curricular (planes, competencias, tributacion) y el mundo de evaluacion (notas, hitos, niveles de logro). Explicar un reporte empieza por hacer explicita esta conexion.

---

## Resumen: que llevar a uP1

| # | Que preservar | Tipo | Como se traduce en uP1 |
|---|---------------|------|----------------------|
| 1 | Workflows configurables | Diseno | Workflows con auditoria inmutable |
| 2 | Jerarquia de competencias | Modelo de datos | Objetos del Object Manager |
| 3 | Dos niveles de vinculacion RA↔competencia | Logica de negocio | Herencia con propagacion automatica |
| 4 | Conteo de estados por tipo | UX | Campo calculado en RecordList |
| 5 | Arbol de estructura (OAppStructureHandler) | Componente | RecordDetail con sections tipo step |
| 6 | FilterConfig | Patron | Filtros declarativos en layouts JSON |
| 7 | Patron de reporte consistente | Patron | RecordList con tabs y filtros |
| 8 | Solo descargar publicados | Regla de negocio | Resolver del mod |
| 9 | Filtro obligatorio en descarga | Regla de negocio | Validacion en resolver |
| 10 | Estados filtrados por transiciones | Regla de negocio | Workflow de uP1 |
| 11 | Doble validacion de permisos | Seguridad | RBAC nativo de uP1 |
| 12-14 | Patrones de diagnostico | Conocimiento | Documentacion en Senku |
