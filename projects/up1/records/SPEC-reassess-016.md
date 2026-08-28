---
id: SPEC-reassess-016
project: up1
type: doc
module: reassess
tags:
  - assessment
  - reassess
  - dictuc
  - diagnostico
  - dolores
  - carga-datos
  - reporteria
  - confiabilidad
  - permisos
  - validacion
---

# 06 — Lo Que Dijo Dictuc vs Lo Que Encontramos en el Codigo

En enero de 2026, la consultoria Dictuc/Dilab entrevisto a cuatro universidades (Uniandes, UST-CFT, Anahuac, UPC) y al equipo de uPlanner para diagnosticar los principales dolores de uAssessment. Identificaron 5 problemas criticos. Aqui contrastamos cada uno con lo que encontramos al analizar el codigo, la base de datos y el conocimiento acumulado en Senku.

---

## Dolor 1: "La carga de datos es manual, lenta y costosa"

### Lo que dijeron las universidades

La documentacion curricular esta dispersa en PDFs, Excel y Word. Cargar esta informacion al sistema es un proceso manual que consume semanas de trabajo y requiere personal dedicado. Las instituciones evitan hacerlo por el costo en recursos humanos.

### Lo que encontramos en el codigo

**Confirmado al 100%.** La carga de datos es el area mas subdesarrollada del sistema:

- La carga masiva se hace enviando archivos CSV directamente a un endpoint del servidor, de forma sincrona (el usuario espera hasta que termine). Con archivos grandes, la operacion puede fallar por tiempo de espera.
- No hay paso previo de preview ("voy a cargar estos 500 registros, esto es lo que voy a crear, confirma") — se carga o no se carga.
- No hay validacion previa del archivo antes de procesarlo.
- No hay forma de cargar un PDF de un plan de estudio y que el sistema extraiga la informacion automaticamente.
- No hay integraciones con Banner, Anthology ni ningun sistema academico externo. Cero. Toda la informacion entra manualmente o por CSV.

**Conclusion**: El dolor es real, esta en el codigo, y es el area donde uP1 tiene la mayor oportunidad de diferenciacion. El endpoint `/upload` con preview, importacion asincrona e ingesta de documentos via IA resuelve exactamente esto.

---

## Dolor 2: "Los reportes no responden a nuestras necesidades"

### Lo que dijeron las universidades

Los indicadores no muestran lo que necesitan. Las instituciones terminan exportando datos a Power BI o creando reportes manuales en Excel. No hay metricas claras de logro de competencias. No hay indicadores de avance en carga, revision o aprobacion de syllabus.

### Lo que encontramos en el codigo

**Confirmado al 100%, pero con un matiz**: Reportes hay muchos (45+ endpoints, 40+ plantillas). El problema no es la ausencia de reportes sino su calidad, consistencia y mantenibilidad.

**Dos sistemas de medicion que no se hablan**: La cadena "Graduation" y la cadena "Milestone" miden logro de competencias de formas diferentes y muestran datos parciales. Un director de carrera puede obtener respuestas contradictorias segun que reporte consulte.

**La consulta mas critica es fragil**: La funcion que calcula notas vinculadas a competencias cruza 12 tablas en una sola operacion. Su rendimiento depende del volumen de datos y puede degradarse con universidades grandes.

**Las plantillas estan en el codigo**: Cada universidad tiene sus propios reportes definidos como codigo fuente, no como configuracion. Cambiar un campo en el reporte de UPC requiere que un desarrollador modifique codigo y despliegue una nueva version. Esto explica por que las instituciones perciben que sus pedidos tardan en resolverse.

**Power BI como parche**: El sistema usa Power BI embebido como alternativa cuando los reportes nativos no alcanzan. Pero Power BI tiene su propia autenticacion, carga independientemente del sistema, y la experiencia es fragmentada.

---

## Dolor 3: "La herramienta no se adapta a nuestra institucion"

### Lo que dijeron las universidades

No pueden personalizar el lenguaje (como llaman a una "asignatura"), los roles no se adaptan a su jerarquia, y el sistema no refleja sus procesos internos.

### Lo que encontramos en el codigo

**Parcialmente confirmado.** Los mecanismos de personalizacion existen pero no son accesibles al usuario final:

**Lenguaje**: El sistema tiene traducciones por cliente y por idioma. Funciona. Pero cambiar una etiqueta requiere modificar un archivo JSON en el repositorio de codigo, hacer commit y desplegar. Ninguna persona en la universidad puede hacer esto — siempre necesita un desarrollador de uPlanner.

**Roles y permisos**: El sistema tiene 70+ reglas de permisos que controlan quien ve que. Funciona para los casos basicos (docente ve sus syllabus, coordinador ve su carrera). Pero:
- La mitad del sistema (la interfaz vieja) no protege las rutas — el permiso es solo visual.
- Las reglas de permiso son inconsistentes entre la interfaz vieja y la nueva.
- Algunos reportes criticos no verifican permisos en el servidor.

**Workflows**: Son configurables por cliente — cada universidad puede tener sus propios estados y transiciones. Esta es una buena decision de diseno, pero la configuracion la hace el equipo tecnico de uPlanner, no la universidad.

**Lo que falta**: No hay un rol de "Super Admin" que permita a la universidad configurar lenguaje, roles, reportes y estilos por si misma. Todo pasa por intermediarios.

---

## Dolor 4: "No confiamos en la herramienta"

### Lo que dijeron las universidades

Se reporta perdida de informacion (Uniandes), fallas en gestion de bibliografia con enlaces rotos (UPC), y una sensacion general de que el sistema no es confiable. Las incidencias tardan en resolverse y no hay transparencia sobre su estado.

### Lo que encontramos en el codigo

**Confirmado al 100%, con evidencia directa de la causa raiz.**

**Perdida de datos en tributacion**: El bug BUG-012 (severidad alta, detectado, sin corregir) muestra que la funcion que actualiza vinculos entre resultados de aprendizaje y competencias puede dejar datos inconsistentes. El mecanismo: primero desactiva todos los vinculos existentes, luego intenta crear los nuevos. Si la creacion falla, los vinculos quedan desactivados sin reemplazo. No hay transaccion de base de datos que proteja esta operacion. **Este bug es probablemente la causa del incidente de perdida de datos reportado por Uniandes.**

**Datos corruptos en docentes**: Existe un registro "fantasma" llamado "UPLANNER NO DEFINIDO" en la tabla de docentes por seccion (BUG-011). Este registro duplica filas en los reportes de evaluacion. Cuando un coordinador ve el reporte de logro de competencias, algunas secciones aparecen duplicadas porque el sistema cuenta al docente fantasma como un docente real.

**Hardcode de institucion**: Una de las consultas principales de seguimiento estudiantil tiene el ID de institucion hardcodeado como "2" (BUG-010). Funciona para la universidad 2, pero cualquier otra universidad no obtiene datos en esa vista. Este tipo de error sugiere que en algun momento se hicieron cambios rapidos para un cliente especifico que nunca se generalizaron.

**Sin auditoria formal**: El sistema registra cambios pero no como un audit log inmutable. No hay garantia de que un registro no haya sido modificado sin dejar traza.

---

## Dolor 5: "Todo pasa por intermediarios y tarda"

### Lo que dijeron las universidades

El proceso para resolver un problema tiene 6 pasos: la universidad detecta el problema → lo comunica al consultor de uPlanner → el consultor lo analiza → lo escala al equipo tecnico → se desarrolla la solucion → se comunica de vuelta. Cada paso introduce demoras y reduce la visibilidad.

### Lo que encontramos en el codigo

**Confirmado al 100%.** No hay infraestructura para autoatencion:

- No existe un modulo de ticketing o gestion de incidencias dentro de la plataforma.
- No hay dashboard de estado del sistema para el cliente.
- No hay sistema de notificaciones automaticas (ni email ni in-app).
- La configuracion de lenguaje, reportes y permisos requiere intervencion tecnica.
- La configuracion del wizard de estructura requiere modificar la tabla `imp_program_structure` directamente.

**El ciclo completo**: Un usuario en la universidad tiene un problema → escribe un correo al consultor → el consultor abre un ticket interno → el ticket llega al equipo de desarrollo → se resuelve (o no) → se comunica de vuelta por correo. El usuario nunca tuvo visibilidad de nada.

---

## Resumen: confirmacion del diagnostico

| Dolor del informe ReAssess | Confirmado en codigo? | Severidad real | Causa raiz principal |
|---------------------------|----------------------|---------------|---------------------|
| Carga de datos manual y costosa | Si, 100% | Alta | CSV sincrono, sin preview, sin integraciones, sin IA |
| Reportes insuficientes | Si, 100% | Alta | Dos cadenas de medicion sin integrar, plantillas en codigo, query de 12 tablas |
| No se adapta a la institucion | Parcial | Media | Mecanismos existen pero no son self-service. Sin rol Super Admin |
| Desconfianza y perdida de datos | Si, 100% | Critica | Bug BUG-012 (vinculos huerfanos), datos corruptos, sin transacciones |
| Intermediarios y demoras | Si, 100% | Media | Sin ticketing, sin notificaciones, sin autoatencion |

**El diagnostico de Dictuc es preciso.** Los 5 dolores se confirman con evidencia tecnica. El dolor #4 (confiabilidad) es el mas grave porque tiene un bug conocido que puede causar perdida silenciosa de datos — exactamente lo que reporto Uniandes.
