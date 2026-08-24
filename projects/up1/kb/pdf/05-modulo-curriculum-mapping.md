---
id: SPEC-reassess-005
project: up1
type: spec
module: reassess
tags: []
---

# 05 — Modulo 2: Curriculum Mapping

Fuente: Informe N 1660575, pags. 18-20
Seccion: 9. Oportunidad de diseno (Modulo 2)

---

## Descripcion

Modulo para mapear, gestionar y monitorear el desarrollo de competencias a nivel de plan de estudios y asignatura, integrando visualizaciones analiticas que muestran la tributacion de competencias a lo largo de un programa.

## Posicionamiento

- **Etapa 2** de la adopcion progresiva.
- Precio mayor que Curriculum Management.
- Modelo: contrato SaaS con renovacion anual.
- Para instituciones sin Curriculum Management: puede usarse si la integracion via ERP institucional (ej: Banner) provee los datos base.
- Se sugiere cobro inicial de implementacion que contemple capacitacion del super admin + validacion de carga de datos + personalizacion.

## Funcionalidades principales

1. **Tributacion de competencias**: Relacion entre perfil de egreso y asignaturas.
2. **Visualizaciones analiticas**: Muestran como cada curso contribuye a las competencias a lo largo del programa.
3. Debe apoyar la toma de decisiones curriculares:
   - Actualizacion de perfiles de egreso.
   - Ajustes en la tributacion de competencias.
   - Ideacion de diferentes estrategias de evaluacion.

## Creacion de valor (IA)

### Simuladores de comparacion de planes
- Facilitan la **comparacion entre distintos planes de estudio** y la **equivalencia entre cursos** de la institucion cliente.
- Analiza coherencia a nivel taxonomico segun resultados de aprendizaje declarados y estrategias de evaluacion.
- Analiza equivalencia o diferencias entre planes segun perfiles de egreso y malla curricular.
- Apoya toma de decisiones a nivel macro: **equivalencia y convalidacion de planes y cursos**.

**Maquetas incluidas en el informe:**
- Figura 5: (a) Competency Mapping Matrix Tool — carga de planes/programas, (b) Heatmap de tributacion (competencias x modulos, niveles High/Medium/Low).
- Figura 6: Constructive Alignment Tool — Sugerencia de estrategias de evaluacion segun tributacion de competencias (Learning Objective + Bloom's Taxonomy Level + Subject Area → Assessment Strategies).

## Posibles extensiones

- **Comparacion entre instituciones**: Incluir comparacion entre programas y asignaturas de distintas instituciones para procesos de convalidacion o benchmarking.
- Cobro adicional al modulo.
- Se sugiere **redes de colaboracion entre instituciones** de educacion superior para facilitar esta funcionalidad.

## Asesoria experta necesaria

Para instituciones en transicion o descentralizadas, se sugiere ofrecer consultoria con asesoria experta para que cada cliente pueda:
- Dar cuenta de su modelo educativo y sus procesos de medicion y evaluacion de competencias.
- Consensuar los objetivos de uso de la herramienta.
- Verificar la consolidacion de su modelo.
- Socializar la herramienta con profesores involucrados en aseguramiento de calidad.

## Correspondencia con uP1

| Propuesta del informe | Implementacion en uP1 |
|-----------------------|----------------------|
| Tributacion de competencias | Mapeo curso→competencia→nivel con intensidad (CAP-MAP-015 a CAP-MAP-017) |
| Visualizaciones analiticas | Heatmap curso x competencia (CAP-MAP-018) |
| Comparador de planes (IA) | Asistente: comparador de planes (CAP-MAP-022) |
| Equivalencia de cursos (IA) | Asistente: buscador de equivalencias (CAP-MAP-023) |
| Estrategias de evaluacion (IA) | Asistente: recomendador de evaluacion (CAP-MAP-024) |
| Comparacion entre instituciones | Extension posible, no implementada aun |
