---
id: SPEC-reassess-001
project: up1
type: spec
module: reassess
tags: []
---

# 01 — Contexto y Marco del Estudio

Fuente: Informe N 1660575, pags. 1-9
Secciones: 1. Normas Generales, 2. Resumen Ejecutivo, 3. Introduccion, 4. Objetivo, 5. Alcances, 6. Metodologia

---

## Datos del proyecto

| Campo | Valor |
|-------|-------|
| Informe | N 1660575, 27/01/2026 |
| Mandante | Taneq SpA (uPlanner), RUT 76.044.076-0 |
| Ejecutor | Dictuc S.A. (filial UC), RUT 96.691.330-4 |
| Contraparte tecnica | Isabel Hilliger Carrasco, Directora Dilab |
| Contrato Dictuc | 3893 |
| Periodo | Noviembre 2025 - Enero 2026 |
| Nota metodologica | Se uso Copilot (sintesis) y Canvas AI (maquetas funcionales) |

## Objetivo

Identificar una oportunidad de rediseno conceptual de uAssessment a nivel conceptual, mediante diagnostico colaborativo con el equipo de uPlanner y sus clientes, ofreciendo direcciones de solucion que faciliten la adopcion por diferentes instituciones de educacion superior.

## Limitaciones explicitas

La consultoria **NO incluye**:
- Desarrollo tecnico ni implementacion
- Validacion en terreno de funcionalidades propuestas
- Capacitacion de usuarios finales

## Alcances

1. **Diagnostico** del estado actual de uAssessment via entrevistas con clientes, orientado a brechas de adopcion, uso y escalabilidad.
2. **Analisis tematico** con foco en gestion curricular, medicion de competencias, reporteria y experiencia de usuario.
3. **Caracterizacion de modelos institucionales** mediante arquetipos (centralizacion, libertad de catedra, consenso en medicion).
4. **Formulacion de oportunidad de rediseno** incluyendo modularizacion, funcionalidades y uso estrategico de IA generativa.
5. **Propuesta de gobernanza operativa** mediante rol de Super Admin institucional.

## Metodologia

- **Enfoque**: Etnografia aplicada para rediseno de herramientas digitales (Wasson, 2000).
- **Recoleccion**: Entrevistas semiestructuradas con clientes + equipo interno uPlanner.
- **Analisis**: Tematico sistematico (Nowell et al., 2017) — revision de registros, codificacion de dolores, consolidacion de temas clave.
- **Arquetipos**: Inspirados en Cooper (1999) — patrones de uso que representan perfiles institucionales.

### Muestra de clientes entrevistados

| Institucion | Ubicacion | Fundacion | Tipo | Interes en uAssessment | Cobertura |
|-------------|-----------|-----------|------|----------------------|-----------|
| Uniandes | Bogota, Colombia | 1948 | Privada | Gestion curricular | A nivel de facultad |
| UST-CFT | Multiregional, Chile | 1988 | Privada | Evaluacion de competencias | En mas de una institucion |
| Anahuac | Multiregional, Mexico | 1964 | Privada | Evaluacion de competencias | En mas de una institucion |
| UPC | Lima, Peru | 1994 | Privada | Gestion curricular | A nivel institucional |

- Entrevistas via Microsoft Teams, grabadas, con consultor uPlanner presente.
- Informacion alcanzo saturacion.

## Resumen ejecutivo — Hallazgos principales

1. Diferencias significativas entre clientes en centralizacion, libertad de catedra, estandarizacion y consenso sobre evaluacion de competencias.
2. Todos enfrentan dificultades por fragmentacion de documentacion curricular → carga masiva compleja.
3. Falta de personalizacion en roles, capa de lenguaje, y limitaciones en reporteria y manejo de incidencias.

**Oportunidad de diseno**: Modularizar la herramienta en tres etapas, incorporando analiticas avanzadas para crear valor en cada una.

## Contexto academico (Introduccion)

- La analitica curricular es subcampo de learning analytics orientado a nivel de asignatura y plan de estudio.
- Crecimiento sostenido desde 2010, pero adopcion sigue siendo compleja (Hernandez-Campos et al., 2025).
- Las instituciones miden aprendizajes via autorreportes o calificaciones finales — pero las mediciones directas del desempeno, mediadas por el cuerpo docente, ofrecen evidencia mas objetiva.
- La mejora continua no depende solo de datos/herramientas, sino de factores contextuales: participacion docente y capacidades institucionales.
- IA generativa abre nuevo marco para automatizar procesos complejos y enriquecer la analitica curricular.

## Implicancias para uP1

- El rediseno propuesto en este informe ES lo que hoy se implementa como **Learning Assurance** en uP1.
- Los tres modulos propuestos (Curriculum Management, Curriculum Mapping, uAssessment) corresponden directamente a las tres apps progresivas documentadas en Confluence.
- Las recomendaciones de Super Admin, gobernanza y personalizacion institucional estan incorporadas en el diseno de uP1.
