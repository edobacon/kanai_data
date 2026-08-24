---
id: SPEC-reassess-013
project: up1
type: spec
module: reassess
tags: [assessment, frontend, angularjs, vue, iframe, migracion, permisos, competencias, ux]
modules: [improve-front, suite-front]
---
# 03 — Lo Que Ve el Usuario: Interfaces y Experiencia

---

## La situacion actual

Cuando un usuario de una universidad abre uAssessment, se encuentra con una experiencia desigual. Algunas pantallas se ven modernas, responden rapido y tienen un diseno limpio. Otras se ven mas antiguas, tardan mas en cargar y tienen un estilo visual diferente. No es un error de diseno — es el resultado de una migracion de tecnologia que se inicio pero no se completo.

El sistema tiene **33 paginas** en total. De esas, **12 (36%) son modernas** — construidas con Vue, el framework actual. Las otras **21 (64%) son la interfaz vieja** de AngularJS, embebida dentro de la nueva mediante iframes (ventanas incrustadas). El usuario no sabe que esta cambiando de tecnologia, pero percibe las diferencias: velocidad, interaccion, apariencia.

## Estado por area funcional

### Planes de estudio: avanzado pero incompleto

La lista de planes y el detalle ya estan en Vue. Un director de carrera puede ver sus planes, filtrarlos por estado, y entrar al detalle donde ve el arbol de estructura curricular completo con un componente sofisticado (OAppStructureHandler). Tambien puede editar la tributacion de competencias.

**Pero**: la creacion de planes nuevos, la edicion de la matriz y la edicion del plan mismo siguen en la interfaz vieja. Un usuario que lista planes (moderno) y luego quiere crear uno (viejo) experimenta un cambio visual notorio.

### Syllabus: similar al plan de estudio

La lista de syllabus con metricas y badges de estado esta en Vue. El detalle del syllabus, con su arbol de estructura y workflow de aprobacion, tambien. Un docente puede ver su syllabus en una interfaz moderna.

**Pero**: la creacion de secciones y la edicion avanzada siguen en Angular. La importacion y exportacion de datos tienen paginas Vue dedicadas, lo cual es un acierto.

### Programas de curso: minimamente migrado

Solo el detalle del programa esta en Vue. La lista, la creacion y la edicion de programas siguen en Angular. Un coordinador que gestiona muchos programas pasa la mayor parte del tiempo en la interfaz vieja.

### Competencias y matrices: sin migracion

**Esta es la brecha mas critica.** Las matrices de competencias, la tributacion de cursos a competencias, el seguimiento de logro y las evidencias — todo el dominio que justifica la existencia del producto — vive **100% en la interfaz vieja**. No hay ni una sola pagina Vue para competencias.

Esto significa que el area de mayor valor para el negocio (la que diferencia a uAssessment de un simple gestor documental) es tambien la que tiene la peor experiencia de usuario. La consultoria Dictuc lo detecto como falta de personalizacion y rigidez, pero la raiz del problema es mas profunda: el dominio critico no fue priorizado en la migracion.

### Seguimiento de logro: sin migracion

El tracking de logro de competencias por estudiante — tanto la vista del coordinador como la del docente — esta 100% en Angular. Estas son las pantallas que un equipo de acreditacion necesita para demostrar que los estudiantes estan logrando el perfil de egreso.

### Reportes: divididos en dos mundos

Existen 60 vistas de reportes en suite-front: 29 en Vue nativo y 31 como iframe de la interfaz vieja. Los reportes de assessment especificamente tienen una sola pagina Vue nueva (`visualizations-v2`) y tres iframes legacy (progreso de pensum, seguimiento de syllabus, seguimiento de programa de curso).

Ademas, hay **dos tipos de reportes** que coexisten:
- **Reportes custom** en Vue con graficos D3.js y consultas propias al backend
- **Reportes Power BI** embebidos como iframe

Para el usuario, esto se traduce en experiencias inconsistentes: algunos reportes son interactivos y rapidos, otros abren Power BI en una ventana separada con su propia autenticacion.

### Configuracion inicial: sin migracion

La pantalla donde se configura como funciona el sistema para cada universidad (que campos mostrar, que jerarquia usar, que flujo de aprobacion aplicar) esta en Angular. Esto refuerza el dolor #5 del informe ReAssess: el "Super Admin" no puede configurar nada por si mismo sin abrir un ticket de soporte.

## El sistema de permisos: funcional pero fragil

uAssessment tiene un sistema de permisos que controla que puede ver y hacer cada usuario. En la practica, funciona — un docente solo ve sus syllabus, un coordinador ve los de su carrera, un director ve todos. Pero la implementacion tiene problemas que generan riesgos:

**70+ reglas de permisos distribuidas entre dos frameworks**, con nombres inconsistentes. Algunas paginas Vue nuevas reutilizan las mismas claves de permiso de Angular. Otras crean claves nuevas. No hay un criterio unificado, lo que hace dificil auditar quien tiene acceso a que.

**La interfaz vieja no protege rutas**: Si un usuario conoce la URL de una pagina a la que no deberia acceder, puede entrar directamente. El permiso solo se verifica visualmente (ocultar botones), no a nivel de ruta. La interfaz nueva si protege las rutas.

**Algunos reportes de milestone no verifican permisos en el servidor**: Solo verifican el permiso en el frontend. Un usuario tecnico podria consumir los datos directamente de la API sin tener permiso.

## Lo que funciona bien y vale la pena preservar

### El arbol de estructura curricular (OAppStructureHandler)

Es el componente Vue mas sofisticado del sistema. Maneja la visualizacion de la estructura curricular como un arbol jerarquico con campos dinamicos: cada nodo puede tener diferentes tipos de campos (texto, numeros, listas, evaluaciones) configurados por la universidad. Incluye drag-and-drop, comentarios por nodo, multiples instancias y gestion de estado.

Este componente ya resolvio un problema que en uP1 se llamara "RecordDetail con sections tipo step". Vale la pena estudiarlo como referencia.

### El framework de filtros (FilterConfig)

Los reportes V2 usan un patron inteligente de filtros en cascada: seleccionar una facultad filtra las carreras disponibles, seleccionar una carrera filtra los cursos, etc. Este patron esta encapsulado en un mini-framework reutilizable que otros reportes pueden usar sin reinventar la logica.

### Patron de migracion coexistente

El enfoque de mostrar ambas versiones en el sidebar con badge "Nuevo" y compartir el mismo backend es pragmatico. Permite adopcion gradual sin romper nada. Este mismo enfoque podria usarse en la transicion de uAssessment a uP1.

## Impacto en la migracion

La migracion a uP1 no es una "mejora del frontend". Es una oportunidad de **completar lo que quedo pendiente**: las competencias, el seguimiento de logro y la configuracion son las areas que mas necesitan una interfaz moderna y una experiencia unificada. Son tambien las areas donde uP1 (con LayoutOrchestrator, RecordList, RecordDetail) puede ofrecer el mayor salto de calidad.

Lo que ya esta en Vue (listas de planes y syllabus, detalle de estructura) puede servir como referencia de "como se ve una buena experiencia" pero no necesita migrarse directamente — uP1 lo reemplazara con componentes nativos del Layout Engine.
