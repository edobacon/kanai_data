---
id: SPEC-reassess-002
project: up1
type: spec
module: reassess
tags: []
---

# 02 — Diagnostico: Dolores y Problemas Criticos

Fuente: Informe N 1660575, pags. 9-12
Seccion: 7. Resultados

---

## Resumen

El diagnostico revela multiples dificultades en la adopcion de uAssessment, organizadas en 4 categorias principales + flujo de usuario actual.

---

## 1. Carga y gestion de informacion curricular

**Problema central**: La documentacion curricular esta fragmentada y no estandarizada.

- Planes de estudio, syllabus en formatos diversos (PDF, Excel, Word) → dificulta digitalizacion y adopcion.
- Carga masiva es dificil por la heterogeneidad de documentos entre instituciones y la rigidez de la BD de uAssessment.
- Altos costos en tiempo y RRHH para estandarizar informacion, poblar tablas y completar datos manualmente.
- **Integraciones limitadas** con sistemas externos (ERP/LMS):
  - UST-CFT: necesita integracion con Banner para calificaciones finales.
  - Uniandes: necesita integracion mas profunda con Brightspace para trazabilidad pedagogica y evaluativa.

### Accion tomada en uP1
- El modulo de Curriculum Management resuelve esto con carga masiva via IA (PDF→datos estructurados).
- Object Manager expone API GraphQL con endpoint `/upload` para Excel/CSV.
- Integraciones bidireccionales con Banner y Anthology estan especificadas.

---

## 2. Limitaciones en la reporteria analitica

**Problema central**: La reporteria no responde a las necesidades analiticas reales.

- Pese a poder importar datos a Power BI, las instituciones recurren a reportes manuales o herramientas externas.
- Uso predominante de indicadores desagregados (caso Uniandes: evaluacion de competencias por niveles de desempeno + visualizaciones complementarias de calificaciones).
- **Ausencia de indicadores claros sobre**:
  - Avance en carga, revision y aprobacion de syllabus (caso UPC).
  - Seguimiento de cambios curriculares (bibliografia, unidades, ajustes pedagogicos).
- En competencias, la reporteria solo muestra asignaturas vinculadas — sin metricas de logro o desempeno.
- Consecuencia: instituciones recurren a reportes manuales → se reduce el valor percibido.

### Accion tomada en uP1
- Learning Assessment incluye reporteria en 3 niveles (individual, grupal, global) con calculo automatico de logro de competencias.
- Report Builder con tablas pivot Flexmonster y exportacion a Excel/PDF/CSV.

---

## 3. Falta de personalizacion por roles, lenguaje y modelo institucional

**Problema central**: La herramienta no se adapta a la diversidad de modelos de gestion curricular.

**Casos representativos:**
- **UPC**: Usa uAssessment para mapeo curricular pero no para evaluacion ni reporteria. Requiere diseno de curso detallado y trazabilidad fina.
- **Anahuac**: Opera con planes magisteriales, supervision jerarquica y uso de LMS para acceso estudiantil. Demanda flujos e integraciones especificas.
- **Uniandes**: Delega gestion en docentes especialistas que interactuan con comites academicos y usan datos periodicamente.

**Consecuencia**: La falta de ajuste en roles, jerarquias y terminologia institucional dificulta la apropiacion y uso consistente.

### Accion tomada en uP1
- Sistema RBAC con permisos a nivel de objeto y campo.
- i18n con jerarquia de resolucion (objeto+layout > objeto > layout > institucion > pais > idioma).
- Theming CSS por tenant.
- Libertad evaluativa configurable (Restringido/Guiado/Libre).

---

## 4. Desconfianza y problemas de confiabilidad

**Problema central**: Se reporta desconfianza generalizada asociada a usabilidad, permisos y perdida de datos.

**Incidentes criticos:**
- Fallas recurrentes en gestion de bibliografia (UPC): enlaces incorrectos y riesgo operativo.
- Interrupciones en flujos entre disenadores, revisores y aprobadores, con baja visibilidad de procesos.
- Resolucion de incidencias via tickets: lenta, poco clara, genera incertidumbre sobre origen de errores.
- **Perdida de trabajo ya realizado** (caso Uniandes) → percepcion de falta de fiabilidad.
- Desperdicio de tiempo, frustracion y debilitamiento de la confianza institucional.

### Accion tomada en uP1
- Arquitectura nueva desde cero (monorepo, GraphQL, PostgreSQL).
- Workflows con auditoria inmutable (BR-WKF-001).
- Sistema de eventos asincronicos con BullMQ + Redis.

---

## 5. Flujo de usuario y experiencia operativa

**Problema central**: El viaje del usuario es lineal con multiples intermediarios, demoras y baja visibilidad.

### Viaje actual (6 pasos)

| Paso | Actores | Accion | Emocion usuario |
|------|---------|--------|----------------|
| 1. Identificacion | Contraparte cliente | Detecta incidencia o necesidad | Frustracion |
| 2. Comunicacion | Cliente + consultor uPlanner | Envia requerimiento/reporte | Inseguridad sobre tiempo |
| 3. Analisis | Consultor uPlanner | Recibe y analiza | Confianza en que sera atendido |
| 4. Escalamiento | Consultor + lider producto | Comunica al lider para evaluacion | Expectativa de resolucion |
| 5. Desarrollo | Lider + equipo desarrollo | Asigna e implementa | Esperanza de resolucion pronta |
| 6. Cierre | Lider + consultor + contraparte | Entrega solucion al consultor → cliente | Frustracion si hubo demoras |

**Oportunidades de mejora:**
- Reduccion de pasos en la cadena de resolucion.
- Mayor trazabilidad del estado de procesos e incidencias.
- Comunicacion mas transparente y oportuna con instituciones.

### Accion tomada en uP1
- Rol Super Admin que puede configurar y gestionar incidencias sin intermediarios.
- Solicitudes gestionadas dentro del mismo modulo con trazabilidad clara.
