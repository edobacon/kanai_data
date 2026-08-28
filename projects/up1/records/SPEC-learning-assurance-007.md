---
id: SPEC-learning-assurance-007
project: up1
type: doc
module: learning-assurance
tags:
  - up1
  - learning-assurance
  - integraciones
  - banner
  - anthology
  - lms
  - brightspace
  - canvas
  - sincronizacion
  - sis
---

---

## Modelo de integración

Learning Assurance soporta integración **bidireccional** con sistemas institucionales. La institución decide quién es el origen de los datos académicos (BR-INT-002).

| Dirección | Cuándo aplica |
| --- | --- |
| **SIS → uPlanner** | La institución gestiona estructura académica en el SIS. uPlanner importa y enriquece con syllabi, competencias, tributación, assessment |
| **uPlanner → SIS** | La institución crea documentos curriculares en uPlanner y los exporta al SIS. El sistema genera un identificador de sincronización que vincula ambos registros |

En ambos casos, competencias, tributación, evaluación por competencias y análisis IA son siempre autoritativos de uPlanner.

---

## Sistemas soportados

### Ellucian Banner

* **API:** Ethos (HEDM, OAuth2, Pub/Sub)
* **Inbound:** Programas, cursos, secciones, periodos, estudiantes, notas
* **Outbound:** Estructura de evaluación, metadatos de curso, planes de estudio, programas enriquecidos 
* **Capacidades:** CAP-ASM-035, CAP-ASM-039

### Anthology Student

* **API:** REST/OData, OAuth2, Integration Framework
* **Inbound:** ProgramVersions, cursos, secciones, matrícula, notas
* **Outbound:** Estructura de evaluación, metadatos de curso, planes de estudio, programas enriquecidos 
* **Capacidades:** CAP-ASM-036, CAP-ASM-039

### LMS (Brightspace, Canvas)

* **Inbound:** Importación de notas/calificaciones
* **Capacidad:** CAP-ASM-037

### Attendance & Grades (uP1)

* Aplicación hermana dentro de uP1 para captura de notas y asistencia
* No es una integración externa: comparte la misma infraestructura de datos
* Las calificaciones alimentan directamente el cálculo de logro de competencias

### Sistemas externos genéricos

* Publicar estructura de evaluación a sistemas externos; metadatos de curso, planes de estudio, programas enriquecidos 
* **Capacidad:** CAP-ASM-038

---

## Patrón de sincronización

Toda entidad importable lleva un identificador del sistema de origen (BR-INT-001):

* Permite sincronización idempotente (re-ejecutable sin duplicar)
* El identificador nunca se modifica después de la importación inicial
* Formato compuesto cuando es necesario (ej: código de programa + código de periodo)

---

## Configuración

* Cada integración se configura por tenant: URL, credenciales, frecuencia de polling, tipo
* La configuración es gestionada por el Super Admin (CAP-ASM-039)
* Las credenciales se almacenan de forma segura en la configuración de la integración
