---
id: SPEC-reassess-017
project: up1
type: spec
module: reassess
tags: [assessment, bugs, deuda-tecnica, tributacion, eval, clonacion, seguridad, transacciones, migracion]
modules: [improve-api, syllabus, competency-matrix, citation]
---
# 07 — Problemas Conocidos y Deuda Acumulada

Este documento cataloga lo que **sabemos que esta mal** y aun no se ha corregido. No son hipotesis — son problemas detectados, documentados y verificados. Estan organizados por impacto en el negocio, no por complejidad tecnica.

---

## Bugs activos sin corregir

### BUG-012 — La tributacion puede perder datos silenciosamente

**Severidad: Alta | Estado: Detectado, sin corregir**

Cuando un docente modifica los vinculos entre resultados de aprendizaje y niveles de competencia en su syllabus, el sistema ejecuta una operacion en dos pasos: primero desactiva todos los vinculos existentes, luego intenta crear los nuevos. Si algo falla en el segundo paso (un error de red, un timeout, un dato invalido), los vinculos quedan desactivados sin reemplazo.

**Por que importa**: Esta es probablemente la causa del incidente de perdida de datos que reporto la Universidad de los Andes. Un docente que tributa su seccion puede terminar sin vinculos, sin recibir ningun error, y sin enterarse hasta que alguien mire un reporte y note que los datos desaparecieron.

**Causa raiz**: La operacion no usa una transaccion de base de datos. En sistemas de datos criticos, una transaccion garantiza que o se completan todos los pasos o no se ejecuta ninguno. Aqui, cada paso se ejecuta independientemente.

**Que debe hacer uP1**: El Object Manager de uP1 usa Prisma con transacciones por defecto en mutaciones. Este tipo de bug no deberia ser posible.

---

### BUG-011 — Un docente fantasma duplica filas en reportes

**Severidad: Media | Estado: Detectado, sin corregir**

Existe un registro en la tabla de docentes llamado "UPLANNER NO DEFINIDO" — un placeholder que se creo en algun momento para secciones sin docente asignado. Este registro no deberia existir como un docente real, pero el sistema lo trata como tal.

**Por que importa**: Cuando se generan reportes de evaluacion, las secciones vinculadas a este docente fantasma aparecen duplicadas. Un coordinador que mira un reporte de logro de competencias ve datos inflados porque el sistema cuenta dos veces las secciones afectadas.

**Que debe hacer uP1**: Las validaciones automaticas del Object Manager (campos requeridos, FK referencial, unicidad) previenen la creacion de datos invalidos.

---

### BUG-010 — Una consulta solo funciona para una universidad

**Severidad: Media | Estado: Detectado, sin corregir**

La funcion que lista estudiantes para el reporte de cumplimiento de perfil tiene el ID de institucion codificado como "2". Funciona correctamente para la universidad con ID 2 (que probablemente es la que se uso para desarrollar la funcionalidad), pero cualquier otra universidad no recibe datos.

**Por que importa**: Es un ejemplo de una practica de desarrollo que crea problemas sistematicos: se desarrolla para un cliente, se deja el hardcode, y nadie lo detecta hasta que otro cliente necesita la misma funcionalidad.

**Que debe hacer uP1**: El aislamiento multi-tenant via header `X-Tenant-ID` elimina este tipo de hardcode. Cada consulta opera en el contexto del tenant activo.

---

## Decisiones arquitectonicas pendientes

### Dos sistemas de medicion que nadie ha decidido como integrar

El sistema tiene dos formas de medir logro de competencias:

- **"Graduation"**: Calcula logro agrupando calificaciones por competencia. Necesita saber a que plan de estudio pertenece el estudiante. Util para responder "como va este estudiante en su perfil de egreso".

- **"Milestone"**: Calcula logro midiendo hitos especificos a lo largo de la carrera. No necesita referencia al plan — trabaja directamente con resultados de aprendizaje. Util para responder "los estudiantes de 4to semestre alcanzaron el nivel esperado en Comunicacion?".

Ambos sistemas **coexisten sin integrarse**. Cada uno tiene sus propias tablas, sus propias consultas y sus propios reportes. Un usuario puede obtener respuestas diferentes segun que sistema consulte.

**Estado de la decision**: En borrador. Nadie ha decidido formalmente si ambos sistemas deben coexistir, si uno reemplaza al otro, o como se integran en una vista unificada.

**Que hace uP1**: Define una sola cadena de calculo con tres capas (seccion → estudiante → agregacion) y estrategias configurables por institucion.

---

### Reportes de milestone sin proteccion de seguridad en el servidor

Los reportes de milestone solo verifican permisos en el frontend (en la interfaz del usuario). El servidor que entrega los datos no verifica quien los esta pidiendo. Esto significa que alguien con conocimiento tecnico podria acceder a datos de reportes sin tener los permisos correspondientes.

Ademas, uno de los reportes ("global-milestone") ni siquiera tiene configurado el permiso de pagina en el frontend.

**Estado**: En borrador. Identificado pero sin plan de correccion.

---

## Deuda acumulada por area

### Seguridad

| Deuda | Impacto | Donde |
|-------|---------|-------|
| API version vieja (V1) sin verificacion de permisos | Un usuario autenticado puede acceder a datos sin tener el permiso | 300+ endpoints V1 |
| Interfaz Angular sin proteccion de rutas | Un usuario con la URL directa accede sin permiso | 35+ rutas |
| Reportes milestone sin verificacion en servidor | Datos accesibles sin autorizacion | 3 reportes |

### Integridad de datos

| Deuda | Impacto | Donde |
|-------|---------|-------|
| Tributacion sin transaccion (BUG-012) | Perdida silenciosa de vinculos | Backend, improve-api |
| Docente fantasma (BUG-011) | Duplicacion en reportes | Datos, cls_sections_teachers |
| Hardcode de institucion (BUG-010) | Funcionalidad rota para todos excepto 1 cliente | Backend, consulta de estudiantes |
| `id_user_modifier=1` como proceso automatico | No hay usuario de sistema diferenciado del admin | Todas las tablas imp_* |

### Rendimiento

| Deuda | Impacto | Donde |
|-------|---------|-------|
| Consulta de 12 tablas para evaluaciones | Rendimiento impredecible con datos grandes | Backend, _getEvaluationMarks |
| Tabla de 799k filas como interseccion | Queries lentas al cruzar evaluaciones con competencias | BD, imp_section_evaluationcomponents |
| Carga masiva sincrona | Timeouts con archivos grandes | Backend, createCourses/createSections |

### Arquitectura

| Deuda | Impacto | Donde |
|-------|---------|-------|
| Dos versiones de API activas sin plan de retiro | Codigo duplicado, mantenimiento doble | Todo el backend |
| Dos cadenas de medicion sin integrar | Datos contradictiorios para el usuario | Graduation vs Milestone |
| Dos patrones de clonacion masiva | Inconsistencia, mantenimiento doble | Syllabus vs Courses |
| 40+ plantillas de reportes en codigo | Cada cambio requiere deployment | report-templates/ |
| Tabla unica controla tres dominios | Fragilidad, cambios colaterales | imp_program_structure |
| Duplicacion de esquema curso/seccion | Cambios en dos lugares, inconsistencias | 21+ tablas imp_* |

### Frontend

| Deuda | Impacto | Donde |
|-------|---------|-------|
| 64% de vistas en interfaz vieja | UX inconsistente, doble mantenimiento | improve-front |
| Competencias 100% en Angular | Dominio critico con peor UX | improve-front |
| 70+ permission keys inconsistentes | Dificil de auditar, riesgo de acceso indebido | Ambos frontends |
| Prefijos de ruta mezclados | Confusion en permisos y navegacion | Ambos frontends |
